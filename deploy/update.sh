#!/usr/bin/env bash
set -euo pipefail
DOMAIN="${1:-minisaha.pisankus.dedyn.io}"
command -v git >/dev/null || { echo 'git gerekli: sudo apt install -y git'; exit 1; }
command -v python3 >/dev/null || { echo 'python3 gerekli'; exit 1; }
TASK_DIR="$(mktemp -d /tmp/minisaha-update.XXXXXX)"
trap 'rm -rf -- "$TASK_DIR"' EXIT
if [ "$(id -u)" -eq 0 ]; then SUDO=(); else SUDO=(sudo); "${SUDO[@]}" -v; fi
git clone --depth 1 https://github.com/pisanadam/Minisaha.git "$TASK_DIR/Minisaha"
cd "$TASK_DIR/Minisaha"
if ! command -v node >/dev/null || ! node -e 'process.exit(Number(process.versions.node.split(".")[0])>=18?0:1)'; then
  "${SUDO[@]}" apt-get update
  "${SUDO[@]}" apt-get install -y nodejs
fi
node -e 'if(Number(process.versions.node.split(".")[0])<18){console.error("Node.js 18+ gerekli");process.exit(1)}'
"${SUDO[@]}" python3 deploy/install.py "$DOMAIN" --check
"${SUDO[@]}" python3 deploy/install-online.py "$DOMAIN" --check
node tests/online.cjs
node tests/lobbies.cjs
node tests/online-socket.cjs
node tests/online-client.cjs
node tests/keeper-hands.cjs
node tests/substitutions.cjs
node tests/commentary-allegiance.cjs
node tests/simulation-ratings.cjs
node tests/formations.cjs
node tests/substitution-ui.cjs
node tests/keeper-movement.cjs
node tests/keeper-angles.cjs
node tests/league.cjs
node tests/league-promotion.cjs
node tests/league-slots.cjs
node tests/manager-career.cjs
node tests/manager-negotiation.cjs
"${SUDO[@]}" apt-get update
"${SUDO[@]}" python3 deploy/install-voice.py
"${SUDO[@]}" python3 deploy/install-online.py "$DOMAIN"
"${SUDO[@]}" python3 deploy/install.py "$DOMAIN"
python3 - "$DOMAIN" <<'PY'
import json,sys,urllib.request
# Existing HTTPS redirects are validated by the backend check in the installer.
assert json.load(urllib.request.urlopen('http://127.0.0.1:8787/online/health',timeout=5))['version']==3
print('Mini Saha güncellendi: https://'+sys.argv[1]+' — sayfayı yenile.')
PY
