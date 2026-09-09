#!/usr/bin/env bash
set -euo pipefail

service_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python_bin="${PYTHON_312:-/opt/homebrew/bin/python3.12}"

if [[ ! -x "$python_bin" ]]; then
  echo "Python 3.12 is required. On macOS: brew install python@3.12 portaudio" >&2
  exit 1
fi

"$python_bin" -m venv "$service_dir/.venv"
"$service_dir/.venv/bin/python" -m pip install --upgrade pip setuptools wheel
"$service_dir/.venv/bin/python" -m pip install -r "$service_dir/requirements.txt"
echo "RealtimeSTT is ready. Start it with: $service_dir/start.sh"
