"""Fond sup3 — LA CARTE ASTRALE.  python3 gen_sup3.py sortie.svg"""
import math, random, sys

W, H = 1920, 1080
rnd = random.Random(7)
out = []
A = out.append


def f(x):
    return ("%.2f" % x).rstrip("0").rstrip(".")


def star4(cx, cy, L, w=None, rot=0, fill="url(#gStar)", op=1.0, ratio=0.55):
    """Étoile à 4 branches : branche verticale L, horizontale L*ratio."""
    if w is None:
        w = L * 0.09
    Lh = L * ratio
    d = (f"M{f(cx)},{f(cy-L)} Q{f(cx+w)},{f(cy-w)} {f(cx+Lh)},{f(cy)} "
         f"Q{f(cx+w)},{f(cy+w)} {f(cx)},{f(cy+L)} Q{f(cx-w)},{f(cy+w)} {f(cx-Lh)},{f(cy)} "
         f"Q{f(cx-w)},{f(cy-w)} {f(cx)},{f(cy-L)}Z")
    t = f' transform="rotate({rot} {f(cx)} {f(cy)})"' if rot else ""
    return f'<path d="{d}" fill="{fill}" opacity="{f(op)}"{t}/>'


A(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
A("""<defs>
  <linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0e0a14"/>
    <stop offset=".45" stop-color="#09080d"/>
    <stop offset="1" stop-color="#0b080c"/>
  </linearGradient>
  <radialGradient id="gHalo" cx=".5" cy=".05" r=".7">
    <stop offset="0" stop-color="#2a0f22" stop-opacity=".55"/>
    <stop offset="1" stop-color="#2a0f22" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gStar">
    <stop offset="0" stop-color="#F2EDE5"/>
    <stop offset=".35" stop-color="#E6C48A"/>
    <stop offset="1" stop-color="#C69A55"/>
  </radialGradient>
  <radialGradient id="gGlowGold">
    <stop offset="0" stop-color="#E6C48A" stop-opacity=".55"/>
    <stop offset=".4" stop-color="#C69A55" stop-opacity=".18"/>
    <stop offset="1" stop-color="#C69A55" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gGlowRed">
    <stop offset="0" stop-color="#A6192E" stop-opacity=".5"/>
    <stop offset="1" stop-color="#60152D" stop-opacity="0"/>
  </radialGradient>

  <!-- Nébuleuse : corps pourpre -->
  <filter id="fNebBody" x="0" y="0" width="1920" height="1080" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.0019 0.0032" numOctaves="5" seed="11"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.38  0 0 0 0 0.07  0 0 0 0 0.16  2.6 0 0 0 -1.05"/>
  </filter>
  <!-- Nébuleuse : filaments crimson -->
  <filter id="fNebFil" x="0" y="0" width="1920" height="1080" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.0042 0.0065" numOctaves="6" seed="23"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.68  0 0 0 0 0.11  0 0 0 0 0.18  0 3.4 0 0 -1.62"/>
  </filter>
  <!-- Voies sombres de poussière -->
  <filter id="fDust" x="0" y="0" width="1920" height="1080" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.0032 0.006" numOctaves="5" seed="5"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.02  0 0 0 0 0.016  0 0 0 0 0.03  0 0 3.2 0 -1.45"/>
  </filter>
  <!-- Mer de nuages basse -->
  <filter id="fClouds" x="0" y="0" width="1920" height="1080" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.0026 0.0105" numOctaves="5" seed="3"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.09  0 0 0 0 0.06  0 0 0 0 0.09  2.4 0 0 0 -0.95"/>
  </filter>
  <filter id="fGrain" x="0" y="0" width="1920" height="1080" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="9" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 0" result="g0"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="9"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope="0" intercept=".07"/></feComponentTransfer>
  </filter>
  <filter id="fGlow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="2.2" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="fGlowBig" x="-100%" y="-100%" width="300%" height="300%">
    <feGaussianBlur stdDeviation="6" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="fSoft"><feGaussianBlur stdDeviation="1.2"/></filter>
  <filter id="fBlur40" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>

  <!-- Masque de la bande diagonale (bas-gauche vers haut-droite) -->
  <linearGradient id="gBand" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".35" stop-color="#fff" stop-opacity=".75"/>
    <stop offset=".5" stop-color="#fff" stop-opacity="1"/>
    <stop offset=".65" stop-color="#fff" stop-opacity=".75"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="gColCalm" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#000" stop-opacity="0"/>
    <stop offset=".25" stop-color="#000" stop-opacity="0"/>
    <stop offset=".42" stop-color="#000" stop-opacity=".62"/>
    <stop offset=".58" stop-color="#000" stop-opacity=".62"/>
    <stop offset=".75" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0"/>
  </linearGradient>
  <mask id="mBand" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
    <rect x="-600" y="340" width="3120" height="420" fill="url(#gBand)" transform="rotate(-24 960 540)"/>
    <rect x="0" y="0" width="1920" height="1080" fill="url(#gColCalm)"/>
  </mask>
  <linearGradient id="gLow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".72" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".88" stop-color="#fff" stop-opacity=".8"/>
    <stop offset="1" stop-color="#fff" stop-opacity="1"/>
  </linearGradient>
  <mask id="mLow" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
    <rect width="1920" height="1080" fill="url(#gLow)"/>
  </mask>
  <radialGradient id="gVig" cx=".5" cy=".5" r=".75">
    <stop offset=".55" stop-color="#050507" stop-opacity="0"/>
    <stop offset="1" stop-color="#050507" stop-opacity=".85"/>
  </radialGradient>
  <linearGradient id="gColDark" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#08080C" stop-opacity="0"/>
    <stop offset=".24" stop-color="#08080C" stop-opacity="0"/>
    <stop offset=".38" stop-color="#08080C" stop-opacity=".45"/>
    <stop offset=".62" stop-color="#08080C" stop-opacity=".45"/>
    <stop offset=".76" stop-color="#08080C" stop-opacity="0"/>
    <stop offset="1" stop-color="#08080C" stop-opacity="0"/>
  </linearGradient>
</defs>""")

# 1. Fond
A('<rect width="1920" height="1080" fill="url(#gBase)"/>')
A('<rect width="1920" height="1080" fill="url(#gHalo)"/>')

# 2. Nébuleuse en diagonale
A('<g mask="url(#mBand)">')
A('  <rect width="1920" height="1080" filter="url(#fNebBody)"/>')
A('  <rect width="1920" height="1080" filter="url(#fNebFil)" opacity=".85"/>')
A('  <rect width="1920" height="1080" filter="url(#fDust)"/>')
A('</g>')
# coeurs lumineux de la nébuleuse, aux deux extrémités
A('<ellipse cx="1610" cy="250" rx="330" ry="160" fill="#7a1426" opacity=".35" filter="url(#fBlur40)" transform="rotate(-24 1610 250)"/>')
A('<ellipse cx="300" cy="860" rx="330" ry="150" fill="#5a1229" opacity=".35" filter="url(#fBlur40)" transform="rotate(-24 300 860)"/>')

# 3. Champ d'étoiles (plus dense sur les bords et dans la bande)
def band_d(x, y):
    # distance à l'axe de la bande
    a = math.radians(-24)
    nx, ny = -math.sin(a), math.cos(a)
    return abs((x - 960) * nx + (y - 540) * ny)

stars = []
while len(stars) < 1500:
    x, y = rnd.uniform(0, W), rnd.uniform(0, H)
    edge = min(1.0, abs(x - 960) / 560)
    p = 0.25 + 0.75 * edge ** 1.5
    if band_d(x, y) < 220:
        p *= 1.6
    if rnd.random() < p:
        stars.append((x, y))
A('<g>')
for x, y in stars:
    r = rnd.choice([0.45, 0.5, 0.6, 0.7, 0.8, 0.9, 1.1, 1.3])
    op = rnd.uniform(0.25, 0.85)
    c = rnd.choice(["#F2EDE5", "#F2EDE5", "#E9DCCB", "#e6c9b8", "#d9a3a3"])
    A(f'<circle cx="{f(x)}" cy="{f(y)}" r="{r}" fill="{c}" opacity="{f(op)}"/>')
A('</g>')
# quelques étoiles brillantes avec halo
A('<g filter="url(#fGlow)">')
for _ in range(40):
    x, y = rnd.uniform(0, W), rnd.uniform(130, H - 130)
    if abs(x - 960) < 420:
        continue
    A(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(rnd.uniform(1.1, 1.7))}" fill="#F2EDE5" opacity="{f(rnd.uniform(.6, .95))}"/>')
A('</g>')

# 4. Astrolabes latéraux (symétriques)
GOLD = "#C69A55"
def astrolabe(cx, cy, R, side):
    s = []
    s.append(f'<g fill="none" stroke="{GOLD}" stroke-linecap="round">')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" stroke-width="1.2" opacity=".42"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{R-26}" stroke-width=".8" opacity=".3"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{R-120}" stroke-width=".8" opacity=".22" stroke-dasharray="2 7"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{R*0.42}" stroke-width=".8" opacity=".2"/>')
    # graduations entre R-26 et R
    for k in range(0, 360, 2):
        a = math.radians(k)
        long = (k % 10 == 0)
        r0 = R - (18 if long else 8)
        s.append(f'<line x1="{f(cx+r0*math.cos(a))}" y1="{f(cy+r0*math.sin(a))}" '
                 f'x2="{f(cx+R*math.cos(a))}" y2="{f(cy+R*math.sin(a))}" '
                 f'stroke-width="{".9" if long else ".6"}" opacity="{".45" if long else ".28"}"/>')
    # méridiens : ellipses partageant l'axe vertical
    for rx in (R * 0.25, R * 0.55, R * 0.8):
        s.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{f(rx)}" ry="{R-26}" stroke-width=".7" opacity=".16"/>')
    # parallèles
    for t in (-0.55, 0.0, 0.55):
        yy = cy + t * (R - 26)
        hw = math.sqrt((R - 26) ** 2 - (yy - cy) ** 2)
        s.append(f'<ellipse cx="{cx}" cy="{f(yy)}" rx="{f(hw)}" ry="{f(hw*0.16)}" stroke-width=".7" opacity=".16"/>')
    # écliptique inclinée
    s.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{R-26}" ry="{f((R-26)*0.3)}" stroke-width="1" opacity=".3" '
             f'transform="rotate({-24 if side < 0 else 24} {cx} {cy})"/>')
    s.append('</g>')
    # losanges aux quatre points cardinaux
    for k in (0, 90, 180, 270):
        a = math.radians(k)
        x, y = cx + (R + 12) * math.cos(a), cy + (R + 12) * math.sin(a)
        s.append(f'<path d="M{f(x)},{f(y-6)} L{f(x+3.5)},{f(y)} L{f(x)},{f(y+6)} L{f(x-3.5)},{f(y)}Z" fill="{GOLD}" opacity=".6" transform="rotate({k} {f(x)} {f(y)})"/>')
    return "\n".join(s)

A(astrolabe(130, 560, 400, -1))
A(astrolabe(1790, 560, 400, 1))

# Grand arc céleste en haut, reliant les deux astrolabes
A(f'<g fill="none" stroke="{GOLD}" stroke-linecap="round">')
A(f'<path d="M -40 520 A 1500 1500 0 0 1 1960 520" stroke-width="1" opacity=".3"/>')
A(f'<path d="M -40 560 A 1540 1540 0 0 1 1960 560" stroke-width=".7" opacity=".18" stroke-dasharray="1 9"/>')
A('</g>')

# 5. Constellations : le chemin de progression, symétrique, qui monte vers l'étoile-couronne
left = [(150, 930), (250, 850), (205, 745), (330, 660), (300, 545), (410, 470),
        (370, 360), (520, 300), (600, 215), (760, 190), (880, 160)]
right = [(W - x, y) for x, y in left]
crown = (960, 150)

def seg(p, q, dash=False, op=.6, w=1.1):
    da = ' stroke-dasharray="3 6"' if dash else ""
    return (f'<line x1="{f(p[0])}" y1="{f(p[1])}" x2="{f(q[0])}" y2="{f(q[1])}" '
            f'stroke="#E6C48A" stroke-width="{w}" opacity="{op}" stroke-linecap="round"{da}/>')

A('<g filter="url(#fGlow)">')
for path in (left, right):
    for i in range(len(path) - 1):
        A(seg(path[i], path[i + 1], dash=(i >= 6), op=(.6 if i < 6 else .45)))
    A(seg(path[-1], crown, dash=True, op=.45))
# branches latérales de la constellation (embranchements)
for path, sgn in ((left, 1), (right, -1)):
    b1 = (path[3][0] + sgn * 120, path[3][1] + 40)
    b2 = (path[5][0] - sgn * 150, path[5][1] - 20)
    A(seg(path[3], b1, op=.35, w=.9))
    A(seg(path[5], b2, op=.35, w=.9))
    A(f'<circle cx="{f(b1[0])}" cy="{f(b1[1])}" r="1.6" fill="#F2EDE5" opacity=".8"/>')
    A(f'<circle cx="{f(b2[0])}" cy="{f(b2[1])}" r="1.6" fill="#F2EDE5" opacity=".8"/>')
A('</g>')

# noeuds : étoiles à 4 branches, jalons cerclés
A('<g>')
for path in (left, right):
    for i, (x, y) in enumerate(path):
        L = 7 + (i % 3) * 3 + (6 if i in (3, 6, 9) else 0)
        A(f'<circle cx="{x}" cy="{y}" r="{L*2.2}" fill="url(#gGlowGold)"/>')
        A(star4(x, y, L, op=.95))
        if i in (3, 6, 9):
            A(f'<circle cx="{x}" cy="{y}" r="{L+6}" fill="none" stroke="{GOLD}" stroke-width=".8" opacity=".55"/>')
A('</g>')
# étoile-couronne
cx, cy = crown
A(f'<circle cx="{cx}" cy="{cy}" r="70" fill="url(#gGlowGold)"/>')
A(f'<circle cx="{cx}" cy="{cy}" r="90" fill="url(#gGlowRed)"/>')
A(f'<g filter="url(#fGlow)">{star4(cx, cy, 30, ratio=.62)}{star4(cx, cy, 12, rot=45, ratio=1, op=.8)}</g>')
A(f'<circle cx="{cx}" cy="{cy}" r="22" fill="none" stroke="{GOLD}" stroke-width=".9" opacity=".6"/>')
A(f'<circle cx="{cx}" cy="{cy}" r="27" fill="none" stroke="{GOLD}" stroke-width=".6" opacity=".35" stroke-dasharray="1 4"/>')

# 6. Mer de nuages basse et îles flottantes en silhouette (profondeur)
A('<g mask="url(#mLow)"><rect width="1920" height="1080" filter="url(#fClouds)"/></g>')

def island(cx, top, w, h, fill, spires):
    pts = [f"M{f(cx-w/2)},{f(top)}"]
    pts.append(f"Q{f(cx-w*0.25)},{f(top-6)} {f(cx)},{f(top-2)} Q{f(cx+w*0.3)},{f(top+3)} {f(cx+w/2)},{f(top)}")
    pts.append(f"L{f(cx+w*0.36)},{f(top+h*0.35)} L{f(cx+w*0.2)},{f(top+h*0.55)} L{f(cx+w*0.08)},{f(top+h)} "
               f"L{f(cx-w*0.04)},{f(top+h*0.7)} L{f(cx-w*0.18)},{f(top+h*0.5)} L{f(cx-w*0.38)},{f(top+h*0.25)}Z")
    s = [f'<path d="{" ".join(pts)}" fill="{fill}"/>']
    for (dx, sh, sw) in spires:
        x = cx + dx * w
        s.append(f'<path d="M{f(x-sw)},{f(top+1)} L{f(x-sw)},{f(top-sh*0.6)} L{f(x)},{f(top-sh)} L{f(x+sw)},{f(top-sh*0.6)} L{f(x+sw)},{f(top+1)}Z" fill="{fill}"/>')
    return "\n".join(s)

A(island(250, 905, 230, 120, "#100c12", [(-0.12, 46, 6), (0.02, 70, 7), (0.14, 38, 5)]))
A(island(1670, 905, 230, 120, "#100c12", [(-0.14, 38, 5), (-0.02, 70, 7), (0.12, 46, 6)]))
A(island(110, 820, 110, 60, "#0d0a10", [(0.05, 30, 4)]))
A(island(1810, 820, 110, 60, "#0d0a10", [(-0.05, 30, 4)]))
# arête de lumière crimson sous les îles
A('<ellipse cx="250" cy="1000" rx="260" ry="40" fill="#60152D" opacity=".35" filter="url(#fBlur40)"/>')
A('<ellipse cx="1670" cy="1000" rx="260" ry="40" fill="#60152D" opacity=".35" filter="url(#fBlur40)"/>')

# 7. Calme de la colonne, vignette, grain
A('<rect width="1920" height="1080" fill="url(#gColDark)"/>')
A('<rect width="1920" height="1080" fill="url(#gVig)"/>')
A('<rect width="1920" height="1080" filter="url(#fGrain)" style="mix-blend-mode:overlay"/>')
A('</svg>')

open(sys.argv[1], "w").write("\n".join(out))
print(sys.argv[1], sum(len(x) for x in out) // 1024, "Ko")
