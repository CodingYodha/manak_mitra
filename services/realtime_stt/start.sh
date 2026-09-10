#!/usr/bin/env bash
set -euo pipefail

service_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
venv_dir="$service_dir/.venv"

if [[ ! -x "$venv_dir/bin/stt-server-production" ]]; then
  echo "RealtimeSTT is not installed. Run: $service_dir/setup.sh" >&2
  exit 1
fi

exec "$venv_dir/bin/python" "$service_dir/run_server.py" \
  --host 127.0.0.1 \
  --port "${REALTIMESTT_PORT:-8010}" \
  --engine faster_whisper \
  --model "${REALTIMESTT_FINAL_MODEL:-large-v3-turbo}" \
  --realtime-engine faster_whisper \
  --use-main-model-for-realtime \
  --device cpu \
  --compute-type int8 \
  --language auto \
  --supported-languages auto,en,hi \
  --beam-size 5 \
  --beam-size-realtime 1 \
  --initial-prompt "Bureau of Indian Standards, BIS, Indian Standard, ISI mark, CM/L licence, Quality Control Order, QCO, Compulsory Registration Scheme, CRS, HUID, hallmarking, Manak Online, BIS CARE, testing laboratory, certification scheme. भारतीय मानक, प्रमाणन, अनिवार्य, एलईडी बल्ब." \
  --initial-prompt-realtime "BIS, ISI, CM/L, QCO, CRS, HUID, hallmarking, Indian Standards, भारतीय मानक, प्रमाणन, एलईडी बल्ब." \
  --realtime-processing-pause 0.2 \
  --min-length-of-recording 0.35 \
  --post-speech-silence-duration 0.45 \
  --normalize-audio \
  --download-root "$service_dir/models"
