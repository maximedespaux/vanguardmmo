"""Builder v6+ : géométrie aplat ivoire + aperçu métal à faces découpées (arête médiane).

comps : liste de dict {id, paths:[d], kind:'or'|'cristal', faces:[(d, fill)], aretes:[d]}
Le ou les `paths` sont recopiés à l'identique dans les deux fichiers ; `faces` et `aretes`
sont des surcharges de rendu propres à l'aperçu métal (dérivées des mêmes points)."""
import os, subprocess

B = "/Users/maximedespaux/Documents/GitHub/vanguardmmo/.claude/worktrees/genesis-logo-identity-9b8b28/assets/genesis/branding"
ROOT = B + "/concepts/base/croissant"


def flat_svg(comps, comment, head=False):
    body = []
    for c in comps:
        body.append(f'  <g id="{c["id"]}">\n' + "\n".join(f'    <path d="{d}"/>' for d in c["paths"]) + "\n  </g>")
    top = f'<!--\n{comment}\n-->\n' if head else ''
    mid = '' if head else f'<!--\n{comment}\n-->\n'
    return (top + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">\n'
            + mid +
            '<g id="genesis-g" fill="#F2EDE5">\n' + "\n".join(body) + "\n</g>\n</svg>\n")


DEFS = '''<defs>
  <!-- lumière en haut à gauche : faces extérieures claires en haut/gauche, faces intérieures claires en bas/droite -->
  <linearGradient id="or-ext" gradientUnits="userSpaceOnUse" x1="210" y1="170" x2="800" y2="880">
    <stop offset="0" stop-color="#F6E7C8"/>
    <stop offset="0.22" stop-color="#E6C48A"/>
    <stop offset="0.55" stop-color="#C69A55"/>
    <stop offset="0.85" stop-color="#7C5B2D"/>
    <stop offset="1" stop-color="#4A3619"/>
  </linearGradient>
  <linearGradient id="or-int" gradientUnits="userSpaceOnUse" x1="800" y1="880" x2="210" y2="170">
    <stop offset="0" stop-color="#E6C48A"/>
    <stop offset="0.3" stop-color="#C69A55"/>
    <stop offset="0.65" stop-color="#8A6634"/>
    <stop offset="1" stop-color="#3B2B14"/>
  </linearGradient>
  <linearGradient id="or-clair" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#F6E7C8"/>
    <stop offset="0.5" stop-color="#E6C48A"/>
    <stop offset="1" stop-color="#C69A55"/>
  </linearGradient>
  <linearGradient id="or-sombre" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#B0874A"/>
    <stop offset="0.6" stop-color="#7C5B2D"/>
    <stop offset="1" stop-color="#4A3619"/>
  </linearGradient>
  <radialGradient id="fond" cx="512" cy="500" r="560" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#15151D"/>
    <stop offset="0.7" stop-color="#0C0C12"/>
    <stop offset="1" stop-color="#08080C"/>
  </radialGradient>
  <filter id="lueur" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="18"/>
  </filter>
  <filter id="ombre" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
    <feOffset dx="5" dy="9" result="o"/>
    <feFlood flood-color="#08080C" flood-opacity="0.85"/>
    <feComposite in2="o" operator="in"/>
  </filter>
</defs>'''


def metal_svg(comps, comment, head=False):
    out = []
    # ombre portée de l'ensemble (mêmes chemins)
    sh = "\n".join(f'    <path d="{d}"/>' for c in comps for d in c["paths"])
    out.append(f'  <g id="ombre-portee" filter="url(#ombre)">\n{sh}\n  </g>')
    for c in comps:
        if c["kind"] == "cristal":
            halo = "\n".join(f'    <path d="{d}" fill="#A6192E" opacity="0.6" filter="url(#lueur)"/>' for d in c["paths"])
            out.append(f'  <g id="halo-cristal">\n{halo}\n  </g>')
    for c in comps:
        base_fill = "#60152D" if c["kind"] == "cristal" else "url(#or-int)"
        lines = [f'    <path d="{d}" fill="{base_fill}"/>' for d in c["paths"]]
        lines += [f'    <path d="{d}" fill="{f}"/>' for d, f in c.get("faces", [])]
        lines += [f'    <path d="{d}" fill="none" stroke="#F2EDE5" stroke-opacity="0.6" stroke-width="1.6" stroke-linejoin="round"/>'
                  for d in c.get("aretes", [])]
        edge = "#E6C48A" if c["kind"] == "cristal" else "#F2DDB0"
        lines += [f'    <path d="{d}" fill="none" stroke="{edge}" stroke-opacity="0.7" stroke-width="2" stroke-linejoin="miter" stroke-miterlimit="12"/>'
                  for d in c["paths"]]
        out.append(f'  <g id="{c["id"]}">\n' + "\n".join(lines) + "\n  </g>")
    SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">\n'
    com = ('<!--\nAperçu métal : les chemins des composants sont copiés à l\'identique de g-geometrie.svg ;\n'
           'les faces et arêtes sont des surcharges de rendu dérivées des mêmes points.\n' + comment + '\n-->\n')
    pre = com + SVG if head else SVG + com
    return (pre + DEFS + '\n<rect width="1024" height="1024" fill="url(#fond)"/>\n'
            '<g id="genesis-g">\n' + "\n".join(out) + "\n</g>\n</svg>\n")


def render(src, png, tries=4):
    for i in range(tries):
        if os.path.exists(png): os.remove(png)
        try:
            subprocess.run(["sh", B + "/tools/render.sh", src, png, "1024", "1024"], stdout=subprocess.DEVNULL, timeout=35)
        except subprocess.TimeoutExpired:
            subprocess.run(["pkill", "-f", src], stdout=subprocess.DEVNULL)
        if os.path.exists(png) and os.path.getsize(png) > 1000:
            return
    raise SystemExit("rendu impossible : " + src)


def build(ver, comps, comment, root=ROOT, head=False):
    d = os.path.join(root, ver) if ver else root
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "g-geometrie.svg"), "w").write(flat_svg(comps, comment, head))
    open(os.path.join(d, "g-apercu-metal.svg"), "w").write(metal_svg(comps, comment, head))
    for s, p in (("g-geometrie.svg", "geometrie.png"), ("g-apercu-metal.svg", "apercu-metal.png")):
        render(os.path.join(d, s), os.path.join(d, p))
    for p, c in (("geometrie.png", "controle-geometrie.png"), ("apercu-metal.png", "controle-metal.png")):
        subprocess.run(["python3", B + "/tools/preview.py", os.path.join(d, p), os.path.join(d, c)], stdout=subprocess.DEVNULL)
    print("ok", d)
