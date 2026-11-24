#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v npm >/dev/null || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)'; then
  echo 'Install Node.js 24 or later from nodejs.org, then reopen Terminal and try again.'
  exit 1
fi
if [ ! -x client/node_modules/.bin/vite ]; then npm ci --prefix client; fi
if [ ! -d server/node_modules/express ]; then npm ci --prefix server; fi
node scripts/setup.mjs
node scripts/start.mjs
