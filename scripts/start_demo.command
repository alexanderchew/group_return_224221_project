#!/bin/zsh
set -eu
project_root="${0:A:h:h}"
cd "$project_root"
exec "$project_root/.venv/bin/python" "$project_root/scripts/start_demo.py" "$@"
