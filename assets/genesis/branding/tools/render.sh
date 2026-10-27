#!/bin/sh
# Rend un SVG (ou une page HTML) en PNG avec Chrome sans interface.
# Le fond reste TRANSPARENT tant que le fichier n'en dessine pas un : c'est ce
# qui permet de sortir les assets individuels sans détourage.
#
#   tools/render.sh entree.svg sortie.png 1024 1024
#   tools/render.sh http://localhost:3040/dashboard page.png 1440 2400
#
# Une adresse http(s) est capturée telle quelle (serveur de dev) : on laisse
# alors 8 s de temps virtuel aux données pour arriver (RENDER_BUDGET pour
# changer). La capture fait la taille de la fenêtre, depuis le haut de page.
#
# Chemins relatifs ou absolus. Chrome écrit quelques lignes « task_policy_set »
# sur stderr à chaque appel : elles sont sans conséquence, on les tait.
set -e
IN="$1"; OUT="$2"; W="${3:-1024}"; H="${4:-$W}"
case "$IN" in
  http://*|https://*) CIBLE="$IN"; BUDGET="${RENDER_BUDGET:-8000}" ;;
  *) [ -f "$IN" ] || { echo "introuvable : $IN" >&2; exit 1; }
     CIBLE="file://$(cd "$(dirname "$IN")" && pwd)/$(basename "$IN")"; BUDGET="${RENDER_BUDGET:-2000}" ;;
esac
case "$OUT" in /*) ABS_OUT="$OUT" ;; *) ABS_OUT="$(pwd)/$OUT" ;; esac
mkdir -p "$(dirname "$ABS_OUT")"
# Un profil jetable par rendu : plusieurs rendus lancés en même temps se
# disputeraient sinon le profil par défaut, et l'un d'eux sortirait sans image.
PROFIL="$(mktemp -d "${TMPDIR:-/tmp}/genesis-chrome.XXXXXX")"
trap 'rm -rf "$PROFIL"' EXIT
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$PROFIL" --no-first-run --no-default-browser-check \
  --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --default-background-color=00000000 --window-size="$W,$H" \
  --virtual-time-budget="$BUDGET" \
  --screenshot="$ABS_OUT" "$CIBLE" >/dev/null 2>&1
[ -f "$ABS_OUT" ] && echo "$ABS_OUT"
