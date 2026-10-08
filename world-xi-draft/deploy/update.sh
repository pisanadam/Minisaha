#!/usr/bin/env bash
set -euo pipefail
DOMAIN="${1:-draft.pisankus.dedyn.io}"
if [ "$#" -gt 0 ]; then shift; fi
command -v git >/dev/null || { echo 'git gerekli: sudo apt install -y git'; exit 1; }
command -v python3 >/dev/null || { echo 'python3 gerekli'; exit 1; }
TASK_DIR="$(mktemp -d /tmp/world-xi-draft.XXXXXX)"
trap 'rm -rf -- "$TASK_DIR"' EXIT
if [ "$(id -u)" -eq 0 ]; then SUDO=(); else SUDO=(sudo); "${SUDO[@]}" -v; fi
git clone --depth 1 --branch main https://github.com/pisanadam/Minisaha.git "$TASK_DIR/repo"
cd "$TASK_DIR/repo/world-xi-draft"
"${SUDO[@]}" python3 deploy/install.py "$DOMAIN" --check
"${SUDO[@]}" python3 deploy/install.py "$DOMAIN" "$@"
printf '\nWorld XI Draft kuruldu/güncellendi: %s\n' "$DOMAIN"
