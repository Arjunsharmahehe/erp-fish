#!/bin/sh
set -eu
if [ "${ERP_FISH_MODE:-production}" = "local" ]; then
  exec xvfb-run -a --server-args="-screen 0 1280x900x24 -nolisten tcp" bun run src/index.ts
fi
exec bun run src/index.ts
