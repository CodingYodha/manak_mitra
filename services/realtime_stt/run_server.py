"""Launch RealtimeSTT's production app with a deterministic asyncio transport.

RealtimeSTT 1.1.2 constructs its ordered WebSocket delivery manager before
Uvicorn starts. Explicitly keeping Uvicorn on asyncio avoids an event-loop
handoff on macOS that can leave the initial `hello` event queued indefinitely.
"""

import logging

import uvicorn
from RealtimeSTT.transcription_engines.faster_whisper_engine import FasterWhisperEngine
from RealtimeSTT_server.production_server import create_app, parse_args, settings_from_args


# RealtimeSTT 1.1.2 exposes `auto` in its remote protocol but forwards that
# literal to faster-whisper, whose auto-detection sentinel is None.
_faster_whisper_transcribe = FasterWhisperEngine.transcribe


def _transcribe_with_auto_detection(self, audio, language=None, *args, **kwargs):
    if str(language or "").lower() == "auto":
        language = None
    return _faster_whisper_transcribe(self, audio, language, *args, **kwargs)


FasterWhisperEngine.transcribe = _transcribe_with_auto_detection


def main() -> None:
    args = parse_args()
    if not hasattr(args, "_base_args"):
        return
    settings = settings_from_args(args)
    logging.basicConfig(
        level=getattr(settings, "log_level", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    uvicorn.run(
        create_app(settings),
        host=settings.host,
        port=settings.port,
        log_level=getattr(settings, "log_level", "INFO").lower(),
        loop="asyncio",
        ssl_certfile=settings.ssl_certfile,
        ssl_keyfile=settings.ssl_keyfile,
    )


if __name__ == "__main__":
    main()
