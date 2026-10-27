#!/bin/sh
# Contrôle de débordement horizontal d'une maquette à une largeur donnée.
#   sh outils/verif-mobile.sh obsidienne [390]
# Charge outils/verif-mobile.html (iframe de la largeur demandée) et imprime
# le rapport que la page écrit dans <pre id="out">.
set -e
ICI="$(cd "$(dirname "$0")" && pwd)"
PISTE="$1"; W="${2:-390}"
SRC="file://$ICI/../$PISTE/maquette.html"
PROFIL="$(mktemp -d "${TMPDIR:-/tmp}/genesis-verif.XXXXXX")"
trap 'rm -rf "$PROFIL"' EXIT
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$PROFIL" --no-first-run --no-default-browser-check \
  --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
  --window-size=600,1700 --virtual-time-budget=6000 \
  --dump-dom "file://$ICI/verif-mobile.html?w=$W&src=$SRC" 2>/dev/null \
  | python3 -c "import sys,re,html; t=sys.stdin.read(); m=re.findall(r'<pre id=\"out\">(.*?)</pre>',t,re.S); print(html.unescape(m[-1]) if m else 'pas de sortie')"
