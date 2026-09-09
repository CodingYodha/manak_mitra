import { API_BASE_URL } from '../config';

const TARGET_SAMPLE_RATE = 16000;

function websocketUrl() {
  const url = new URL(API_BASE_URL, window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/ws/stt`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

class StatefulResampler {
  constructor(inputRate, outputRate = TARGET_SAMPLE_RATE) {
    this.ratio = inputRate / outputRate;
    this.pending = new Float32Array(0);
    this.position = 0;
  }

  process(chunk) {
    const samples = new Float32Array(this.pending.length + chunk.length);
    samples.set(this.pending);
    samples.set(chunk, this.pending.length);
    const output = [];

    while (this.position < samples.length - 1) {
      const left = Math.floor(this.position);
      const fraction = this.position - left;
      output.push(samples[left] + (samples[left + 1] - samples[left]) * fraction);
      this.position += this.ratio;
    }

    const consumed = Math.floor(this.position);
    this.pending = samples.slice(Math.min(consumed, samples.length));
    this.position -= consumed;

    const pcm = new Int16Array(output.length);
    output.forEach((sample, index) => {
      const clamped = Math.max(-1, Math.min(1, sample));
      pcm[index] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    });
    return pcm;
  }
}

function packetFor(pcm, sequence) {
  const metadata = new TextEncoder().encode(JSON.stringify({
    sampleRate: TARGET_SAMPLE_RATE,
    channels: 1,
    format: 'pcm_s16le',
    frames: pcm.length,
    audioSequence: sequence
  }));
  const packet = new ArrayBuffer(4 + metadata.length + pcm.byteLength);
  const view = new DataView(packet);
  view.setUint32(0, metadata.length, true);
  new Uint8Array(packet, 4, metadata.length).set(metadata);
  new Uint8Array(packet, 4 + metadata.length).set(new Uint8Array(pcm.buffer));
  return packet;
}

export async function startRealtimeStt({
  language = 'auto',
  onPartial,
  onFinal,
  onStatus,
  onError
} = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone capture needs HTTPS or localhost and a supported browser.');
  }

  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    mediaStream.getTracks().forEach((track) => track.stop());
    throw new Error('Web Audio is unavailable in this browser.');
  }

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(mediaStream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silentOutput = audioContext.createGain();
  silentOutput.gain.value = 0;
  const resampler = new StatefulResampler(audioContext.sampleRate);
  const socket = new WebSocket(websocketUrl());
  socket.binaryType = 'arraybuffer';

  let audioSequence = 0;
  let started = false;
  let recording = false;
  let settled = false;
  let finalDelivered = false;
  let stopRequestedAt = 0;
  let startupTimer;

  const cleanupAudio = async () => {
    recording = false;
    try { processor.disconnect(); } catch {}
    try { source.disconnect(); } catch {}
    try { silentOutput.disconnect(); } catch {}
    mediaStream.getTracks().forEach((track) => track.stop());
    if (audioContext.state !== 'closed') await audioContext.close().catch(() => {});
  };

  const closeEverything = async () => {
    window.clearTimeout(startupTimer);
    await cleanupAudio();
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
  };

  const controller = {
    async stop() {
      if (!started || settled) return;
      stopRequestedAt = performance.now();
      await cleanupAudio();
      onStatus?.({ state: 'finalizing', label: 'Finalising multilingual transcript…' });
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'finalize' }));
    },
    async cancel() {
      settled = true;
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'cancel' }));
      await closeEverything();
    }
  };

  processor.onaudioprocess = (event) => {
    if (!recording || socket.readyState !== WebSocket.OPEN) return;
    const pcm = resampler.process(event.inputBuffer.getChannelData(0));
    if (!pcm.length) return;
    socket.send(packetFor(pcm, audioSequence));
    audioSequence += 1;
  };

  const ready = new Promise((resolve, reject) => {
    startupTimer = window.setTimeout(async () => {
      if (started) return;
      settled = true;
      await closeEverything();
      reject(new Error('Local speech engine did not become ready in time.'));
    }, 7000);

    socket.onerror = async () => {
      if (!started) {
        settled = true;
        await closeEverything();
        reject(new Error('Local RealtimeSTT service is not running.'));
      } else {
        onError?.(new Error('The local speech connection was interrupted.'));
      }
    };

    socket.onmessage = async (event) => {
      if (typeof event.data !== 'string') return;
      let payload;
      try { payload = JSON.parse(event.data); } catch { return; }

      if (payload.type === 'ready' && !started) {
        socket.send(JSON.stringify({
          type: 'start',
          turnId: `manak-${Date.now()}`,
          language
        }));
        return;
      }

      if (payload.type === 'started' && !started) {
        started = true;
        recording = true;
        window.clearTimeout(startupTimer);
        source.connect(processor);
        processor.connect(silentOutput);
        silentOutput.connect(audioContext.destination);
        await audioContext.resume();
        onStatus?.({ state: 'listening', label: 'Listening locally · Hindi + English' });
        resolve(controller);
        return;
      }

      if (payload.type === 'realtime') {
        const text = payload.mergedText || payload.text || payload.accurateText || '';
        if (text) onPartial?.({ text, language: payload.language || language });
        return;
      }

      if (payload.type === 'final' && !finalDelivered) {
        finalDelivered = true;
        const text = String(payload.text || '').trim();
        const latencyMs = stopRequestedAt ? Math.round(performance.now() - stopRequestedAt) : null;
        if (text) onFinal?.({ text, language: payload.detectedLanguage || language, latencyMs });
        else onError?.(new Error('No speech was detected. Please try again.'));
        return;
      }

      if (payload.type === 'completion') {
        settled = true;
        await closeEverything();
        return;
      }

      if (payload.type === 'error') {
        const error = new Error(payload.message || 'RealtimeSTT could not transcribe this audio.');
        if (!started) {
          settled = true;
          await closeEverything();
          reject(error);
        } else {
          onError?.(error);
        }
      }
    };

    socket.onclose = async () => {
      await cleanupAudio();
      if (!started && !settled) reject(new Error('Local RealtimeSTT service closed before it was ready.'));
    };
  });

  onStatus?.({ state: 'connecting', label: 'Connecting to local multilingual speech…' });
  return ready;
}
