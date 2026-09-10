# Local multilingual speech service

This optional sidecar runs RealtimeSTT independently from Manak Mitra's Python
3.9 RAG backend. The browser sends mono PCM through `/ws/stt`; the main API
proxies it to this loopback-only service, so the speech server is never exposed
directly to the LAN.

## Setup (macOS)

```bash
brew install python@3.12 portaudio
./services/realtime_stt/setup.sh
./services/realtime_stt/start.sh
```

The first start downloads the multilingual `large-v3-turbo` faster-whisper
model into `services/realtime_stt/models/`. It is shared by preview and final
decoding to avoid duplicate model memory, uses beam search for the final pass,
and receives a BIS-domain vocabulary prompt. Override it with
`REALTIMESTT_FINAL_MODEL`; `large-v3` trades considerably more latency for the
largest local Whisper checkpoint. The UI also lets users lock English or Hindi,
which is more accurate than auto-detection for short utterances.

The assistant automatically falls back to the browser SpeechRecognition API
when the local service is stopped or unavailable. Microphone capture requires a
secure browser context: `localhost` works for local demos; LAN devices require
HTTPS. For local-network development, generate the ignored Vite certificates
described in the root README and start Vite with an empty
`VITE_API_BASE_URL` so API and WebSocket traffic use its same-origin proxy.
