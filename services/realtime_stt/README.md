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

The first start downloads multilingual `tiny` and `base` faster-whisper models
into `services/realtime_stt/models/`. Override them with
`REALTIMESTT_REALTIME_MODEL` and `REALTIMESTT_FINAL_MODEL`.

The assistant automatically falls back to the browser SpeechRecognition API
when the local service is stopped or unavailable. Microphone capture requires a
secure browser context: `localhost` works for local demos; LAN devices require
HTTPS. For local-network development, generate the ignored Vite certificates
described in the root README and start Vite with an empty
`VITE_API_BASE_URL` so API and WebSocket traffic use its same-origin proxy.
