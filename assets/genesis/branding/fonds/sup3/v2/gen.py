"""Fond sup3 — LA CARTE ASTRALE.  python3 gen_sup3.py sortie.svg"""
import math, random, sys

W, H = 1920, 1080
rnd = random.Random(7)
out = []
A = out.append
GOLD, GOLD2, IVORY = "#C69A55", "#E6C48A", "#F2EDE5"


def f(x):
    return ("%.2f" % x).rstrip("0").rstrip(".")


def star4(cx, cy, L, w=None, rot=0, fill="url(#gStar)", op=1.0, ratio=0.55):
    if w is None:
        w = L * 0.085
    Lh = L * ratio
    d = (f"M{f(cx)},{f(cy-L)} Q{f(cx+w)},{f(cy-w)} {f(cx+Lh)},{f(cy)} "
         f"Q{f(cx+w)},{f(cy+w)} {f(cx)},{f(cy+L)} Q{f(cx-w)},{f(cy+w)} {f(cx-Lh)},{f(cy)} "
         f"Q{f(cx-w)},{f(cy-w)} {f(cx)},{f(cy-L)}Z")
    t = f' transform="rotate({rot} {f(cx)} {f(cy)})"' if rot else ""
    return f'<path d="{d}" fill="{fill}" opacity="{f(op)}"{t}/>'


def turb(fid, freq, octv, seed, matrix, extra=""):
    return (f'<filter id="{fid}" x="0" y="0" width="1920" height="1080" filterUnits="userSpaceOnUse" '
            f'color-interpolation-filters="sRGB">'
            f'<feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="{octv}" seed="{seed}"/>'
            f'<feColorMatrix type="matrix" values="{matrix}"/>{extra}</filter>')


A(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
A('<defs>')
A("""
  <linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0c0a10"/>
    <stop offset=".5" stop-color="#08080C"/>
    <stop offset="1" stop-color="#09080b"/>
  </linearGradient>
  <radialGradient id="gStar">
    <stop offset="0" stop-color="#F2EDE5"/>
    <stop offset=".3" stop-color="#E6C48A"/>
    <stop offset="1" stop-color="#C69A55"/>
  </radialGradient>
  <radialGradient id="gGlowGold">
    <stop offset="0" stop-color="#E6C48A" stop-opacity=".5"/>
    <stop offset=".35" stop-color="#C69A55" stop-opacity=".14"/>
    <stop offset="1" stop-color="#C69A55" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gGlowRed">
    <stop offset="0" stop-color="#A6192E" stop-opacity=".55"/>
    <stop offset=".5" stop-color="#60152D" stop-opacity=".2"/>
    <stop offset="1" stop-color="#60152D" stop-opacity="0"/>
  </radialGradient>
  <filter id="fGlow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="2" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="fHalo" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="3.5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="fBlur50" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="50"/></filter>
  <filter id="fBlur8" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
""")
# Nébuleuse — corps pourpre, filaments crimson (crêtes du bruit), poussière sombre
A(turb("fNebBody", "0.0017 0.0029", 5, 11, "0 0 0 0 0.30  0 0 0 0 0.05  0 0 0 0 0.12  2.8 0 0 0 -1.12"))
A(turb("fNebMid", "0.0026 0.0042", 5, 17, "0 0 0 0 0.50  0 0 0 0 0.07  0 0 0 0 0.14  0 3.2 0 0 -1.5"))
A(turb("fVeins", "0.0038 0.0062", 6, 31, "0 0 0 0 0.78  0 0 0 0 0.16  0 0 0 0 0.22  5 0 0 0 -2",
       '<feComponentTransfer><feFuncA type="table" tableValues="0 0 0 .05 .55 .05 0 0 0"/></feComponentTransfer>'))
A(turb("fHot", "0.0035 0.0055", 4, 41, "0 0 0 0 0.92  0 0 0 0 0.55  0 0 0 0 0.48  0 0 4 0 -2.5"))
A(turb("fDust", "0.003 0.0052", 6, 5, "0 0 0 0 0.016  0 0 0 0 0.012  0 0 0 0 0.02  0 0 3.6 0 -1.55"))
A(turb("fClouds", "0.0022 0.0115", 6, 3, "0 0 0 0 0.075  0 0 0 0 0.045  0 0 0 0 0.065  2.6 0 0 0 -1.0"))
A(turb("fCloudLit", "0.0022 0.0115", 6, 3, "0 0 0 0 0.42  0 0 0 0 0.08  0 0 0 0 0.14  4 0 0 0 -2.3"))
A("""
  <filter id="fGrain" x="0" y="0" width="1920" height="1080" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope="0" intercept=".16"/></feComponentTransfer>
  </filter>
  <linearGradient id="gBand" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".3" stop-color="#fff" stop-opacity=".6"/>
    <stop offset=".5" stop-color="#fff" stop-opacity="1"/>
    <stop offset=".7" stop-color="#fff" stop-opacity=".6"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="gCalm" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#000" stop-opacity="0"/>
    <stop offset=".2" stop-color="#000" stop-opacity="0"/>
    <stop offset=".38" stop-color="#000" stop-opacity=".72"/>
    <stop offset=".62" stop-color="#000" stop-opacity=".72"/>
    <stop offset=".8" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0"/>
  </linearGradient>
  <mask id="mBand" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
    <rect x="-700" y="300" width="3320" height="480" fill="url(#gBand)" transform="rotate(-27 960 540)"/>
    <rect width="1920" height="1080" fill="url(#gCalm)"/>
  </mask>
  <linearGradient id="gSides" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff"/>
    <stop offset=".2" stop-color="#fff" stop-opacity=".9"/>
    <stop offset=".34" stop-color="#fff" stop-opacity=".25"/>
    <stop offset=".5" stop-color="#fff" stop-opacity=".12"/>
    <stop offset=".66" stop-color="#fff" stop-opacity=".25"/>
    <stop offset=".8" stop-color="#fff" stop-opacity=".9"/>
    <stop offset="1" stop-color="#fff"/>
  </linearGradient>
  <mask id="mSides" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
    <rect width="1920" height="1080" fill="url(#gSides)"/>
  </mask>
  <linearGradient id="gLow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".7" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".86" stop-color="#fff" stop-opacity=".85"/>
    <stop offset="1" stop-color="#fff" stop-opacity="1"/>
  </linearGradient>
  <mask id="mLow" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
    <rect width="1920" height="1080" fill="url(#gLow)"/>
  </mask>
  <radialGradient id="gVig" cx=".5" cy=".46" r=".78">
    <stop offset=".5" stop-color="#050507" stop-opacity="0"/>
    <stop offset="1" stop-color="#050507" stop-opacity=".9"/>
  </radialGradient>
  <linearGradient id="gColDark" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#08080C" stop-opacity="0"/>
    <stop offset=".22" stop-color="#08080C" stop-opacity="0"/>
    <stop offset=".36" stop-color="#08080C" stop-opacity=".5"/>
    <stop offset=".64" stop-color="#08080C" stop-opacity=".5"/>
    <stop offset=".78" stop-color="#08080C" stop-opacity="0"/>
    <stop offset="1" stop-color="#08080C" stop-opacity="0"/>
  </linearGradient>
""")
A('</defs>')

# 1. Fond
A('<rect width="1920" height="1080" fill="url(#gBase)"/>')

# 2. Nébuleuse en diagonale (bas-gauche -> haut-droite)
A('<g mask="url(#mBand)">')
A('  <rect width="1920" height="1080" filter="url(#fNebBody)"/>')
A('  <rect width="1920" height="1080" filter="url(#fNebMid)"/>')
A('  <rect width="1920" height="1080" filter="url(#fVeins)"/>')
A('  <rect width="1920" height="1080" filter="url(#fHot)" opacity=".7"/>')
A('  <rect width="1920" height="1080" filter="url(#fDust)"/>')
A('</g>')
A('<g opacity=".5">')
A('<ellipse cx="1660" cy="230" rx="360" ry="150" fill="#7d1426" opacity=".5" filter="url(#fBlur50)" transform="rotate(-27 1660 230)"/>')
A('<ellipse cx="260" cy="880" rx="360" ry="140" fill="#60152D" opacity=".55" filter="url(#fBlur50)" transform="rotate(-27 260 880)"/>')
A('</g>')

# 3. Carte : projection polaire (pôle au-dessus du cadre) — méridiens et parallèles gravés
P = (960, -760)
A(f'<g mask="url(#mSides)" fill="none" stroke="{GOLD}" stroke-linecap="round">')
for r in range(900, 2200, 130):
    A(f'<circle cx="{P[0]}" cy="{P[1]}" r="{r}" stroke-width=".7" opacity=".11"/>')
for k in range(-66, 67, 6):
    a = math.radians(90 + k)
    x2, y2 = P[0] + 2400 * math.cos(a), P[1] + 2400 * math.sin(a)
    x1, y1 = P[0] + 900 * math.cos(a), P[1] + 900 * math.sin(a)
    A(f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" stroke-width=".6" opacity="{".1" if k % 18 else ".16"}"/>')
A('</g>')

# 4. Champ d'étoiles
def band_d(x, y):
    a = math.radians(-27)
    nx, ny = -math.sin(a), math.cos(a)
    return abs((x - 960) * nx + (y - 540) * ny)

stars = []
while len(stars) < 1900:
    x, y = rnd.uniform(0, W), rnd.uniform(0, H)
    edge = min(1.0, abs(x - 960) / 600)
    p = 0.18 + 0.82 * edge ** 1.6
    if band_d(x, y) < 200:
        p *= 1.7
    if rnd.random() < p:
        stars.append((x, y))
A('<g>')
for x, y in stars:
    r = rnd.choice([0.4, 0.45, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 1.05, 1.25])
    op = rnd.uniform(0.25, 0.9)
    c = rnd.choice([IVORY, IVORY, IVORY, "#eadccb", "#e8c7b9", "#d99a9f"])
    A(f'<circle cx="{f(x)}" cy="{f(y)}" r="{r}" fill="{c}" opacity="{f(op)}"/>')
A('</g>')
# étoiles brillantes : petit éclat à 4 branches ivoire, sur les bords
A('<g filter="url(#fGlow)">')
n = 0
while n < 34:
    x, y = rnd.uniform(30, W - 30), rnd.uniform(140, H - 140)
    if abs(x - 960) < 470:
        continue
    n += 1
    L = rnd.uniform(3.5, 7.5)
    A(star4(x, y, L, fill=IVORY, op=rnd.uniform(.55, .9), ratio=.7, w=L * .07))
    A(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(L*.22)}" fill="{IVORY}"/>')
A('</g>')

# 5. Astrolabes : grands anneaux gradués, centrés hors cadre, symétriques
def astrolabe(cx, cy, R, mirror):
    s = [f'<g fill="none" stroke="{GOLD}" stroke-linecap="round" filter="url(#fGlow)">']
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" stroke-width="1.3" opacity=".5"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{R-30}" stroke-width=".8" opacity=".36"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{R+9}" stroke-width=".6" opacity=".25"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{R-150}" stroke-width=".8" opacity=".22" stroke-dasharray="1.5 6"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{R-180}" stroke-width=".7" opacity=".18"/>')
    for k in range(0, 360, 2):
        a = math.radians(k)
        lg = (k % 10 == 0)
        r0 = R - (20 if lg else 9)
        s.append(f'<line x1="{f(cx+r0*math.cos(a))}" y1="{f(cy+r0*math.sin(a))}" '
                 f'x2="{f(cx+(R-1)*math.cos(a))}" y2="{f(cy+(R-1)*math.sin(a))}" '
                 f'stroke-width="{".9" if lg else ".55"}" opacity="{".5" if lg else ".3"}"/>')
    # rete : cercles excentrés (comme l'araignée d'un astrolabe)
    sg = -1 if mirror else 1
    s.append(f'<circle cx="{f(cx+sg*R*0.18)}" cy="{f(cy-R*0.08)}" r="{f(R*0.74)}" stroke-width=".9" opacity=".26"/>')
    s.append(f'<circle cx="{f(cx+sg*R*0.1)}" cy="{f(cy+R*0.2)}" r="{f(R*0.6)}" stroke-width=".7" opacity=".18"/>')
    s.append('</g>')
    # losanges aux points remarquables de l'anneau
    for k in range(-60, 61, 30):
        a = math.radians(k if not mirror else 180 - k)
        x, y = cx + (R - 15) * math.cos(a), cy + (R - 15) * math.sin(a)
        deg = math.degrees(a) + 90
        s.append(f'<path d="M{f(x)},{f(y-7)} L{f(x+3.2)},{f(y)} L{f(x)},{f(y+7)} L{f(x-3.2)},{f(y)}Z" '
                 f'fill="{GOLD2}" opacity=".7" transform="rotate({f(deg)} {f(x)} {f(y)})"/>')
    return "\n".join(s)

A(astrolabe(-170, 560, 620, False))
A(astrolabe(W + 170, 560, 620, True))

# 6. Arc céleste du haut (écliptique graduée) portant l'étoile-couronne
C0, R0 = (960, 1650), 1500   # sommet à y=150
A(f'<g fill="none" stroke="{GOLD}" stroke-linecap="round" filter="url(#fGlow)">')
A(f'<circle cx="{C0[0]}" cy="{C0[1]}" r="{R0}" stroke-width="1.1" opacity=".34"/>')
A(f'<circle cx="{C0[0]}" cy="{C0[1]}" r="{R0+14}" stroke-width=".6" opacity=".2" stroke-dasharray="1 7"/>')
for k in range(-40, 41):
    if abs(k) < 3:
        continue
    a = math.radians(-90 + k * 0.9)
    lg = k % 5 == 0
    r1 = R0 + (12 if lg else 6)
    A(f'<line x1="{f(C0[0]+R0*math.cos(a))}" y1="{f(C0[1]+R0*math.sin(a))}" '
      f'x2="{f(C0[0]+r1*math.cos(a))}" y2="{f(C0[1]+r1*math.sin(a))}" stroke-width=".7" opacity="{".42" if lg else ".24"}"/>')
A('</g>')

# 7. Constellations : le chemin de progression, de part et d'autre, qui monte vers la couronne
left = [(160, 915), (262, 842), (228, 742), (342, 668), (318, 560), (420, 492),
        (388, 392), (505, 330), (590, 252), (735, 208), (850, 172)]
right = [(W - x, y) for x, y in left]
crown = (960, 150)
MILE = (3, 6, 9)


def seg(p, q, dash=False, op=.6, w=1.1):
    da = ' stroke-dasharray="2 6"' if dash else ""
    return (f'<line x1="{f(p[0])}" y1="{f(p[1])}" x2="{f(q[0])}" y2="{f(q[1])}" '
            f'stroke="{GOLD2}" stroke-width="{w}" opacity="{op}" stroke-linecap="round"{da}/>')

A('<g filter="url(#fHalo)">')
for path, sg in ((left, 1), (right, -1)):
    for i in range(len(path) - 1):
        A(seg(path[i], path[i + 1], dash=(i >= 6), op=(.7 if i < 6 else .5), w=(1.2 if i < 6 else 1)))
    A(seg(path[-1], crown, dash=True, op=.45, w=1))
    # embranchements : chemins possibles non pris
    for i, (dx, dy) in ((1, (-95, 30)), (3, (130, 52)), (5, (-150, -10)), (7, (-120, 40))):
        b = (path[i][0] + sg * dx, path[i][1] + dy)
        A(seg(path[i], b, op=.3, w=.8, dash=True))
        A(f'<circle cx="{f(b[0])}" cy="{f(b[1])}" r="1.5" fill="{IVORY}" opacity=".75"/>')
A('</g>')

A('<g>')
for path in (left, right):
    for i, (x, y) in enumerate(path):
        big = i in MILE
        L = (14 + i * 0.6) if big else (6 + (i % 3) * 2.2)
        A(f'<circle cx="{x}" cy="{y}" r="{f(L*2.6)}" fill="url(#gGlowGold)"/>')
        if big:
            A(f'<circle cx="{x}" cy="{y}" r="{f(L*3)}" fill="url(#gGlowRed)"/>')
        A(f'<g filter="url(#fGlow)">{star4(x, y, L, op=.95)}</g>')
        if big:
            A(f'<circle cx="{x}" cy="{y}" r="{f(L*0.9)}" fill="none" stroke="{GOLD}" stroke-width=".9" opacity=".6"/>')
            A(f'<circle cx="{x}" cy="{y}" r="{f(L*0.9+5)}" fill="none" stroke="{GOLD}" stroke-width=".6" opacity=".35" stroke-dasharray="1 3.5"/>')
            A(star4(x, y, L * 0.45, rot=45, ratio=1, op=.6))
A('</g>')
cx, cy = crown
A(f'<circle cx="{cx}" cy="{cy}" r="120" fill="url(#gGlowRed)"/>')
A(f'<circle cx="{cx}" cy="{cy}" r="75" fill="url(#gGlowGold)"/>')
A(f'<g filter="url(#fGlow)">{star4(cx, cy, 34, ratio=.6)}{star4(cx, cy, 13, rot=45, ratio=1, op=.75)}</g>')
A(f'<circle cx="{cx}" cy="{cy}" r="24" fill="none" stroke="{GOLD}" stroke-width=".9" opacity=".6"/>')
A(f'<circle cx="{cx}" cy="{cy}" r="30" fill="none" stroke="{GOLD}" stroke-width=".6" opacity=".35" stroke-dasharray="1 4"/>')

# 8. Profondeur : mer de nuages, îles lointaines, bancs proches
A('<g mask="url(#mLow)">')
A('<rect width="1920" height="1080" filter="url(#fClouds)"/>')
A('<rect width="1920" height="1080" filter="url(#fCloudLit)" opacity=".8"/>')
A('</g>')


def island(cx, top, w, h, fill, spires, seed):
    r = random.Random(seed)
    pts = []
    n = 14
    for i in range(n + 1):
        t = i / n
        x = cx - w / 2 + w * t
        depth = h * (1 - abs(2 * t - 1) ** 1.6) * r.uniform(.75, 1.05)
        pts.append((x, top + 4 + depth))
    d = f"M{f(cx-w/2)},{f(top+2)} Q{f(cx)},{f(top-5)} {f(cx+w/2)},{f(top+2)} "
    d += " ".join(f"L{f(x)},{f(y)}" for x, y in reversed(pts)) + "Z"
    s = [f'<path d="{d}" fill="{fill}"/>']
    for (dx, sh, sw) in spires:
        x = cx + dx * w
        s.append(f'<path d="M{f(x-sw)},{f(top+1)} L{f(x-sw)},{f(top-sh*0.62)} L{f(x)},{f(top-sh)} '
                 f'L{f(x+sw)},{f(top-sh*0.62)} L{f(x+sw)},{f(top+1)}Z" fill="{fill}"/>')
    return "\n".join(s)

# îles lointaines (plan 2), fondues dans la brume
A('<g opacity=".9">')
A(island(300, 868, 150, 70, "#130d14", [(-.1, 30, 4), (.04, 46, 5), (.16, 24, 3.5)], 1))
A(island(1620, 868, 150, 70, "#130d14", [(-.16, 24, 3.5), (-.04, 46, 5), (.1, 30, 4)], 2))
A(island(150, 820, 70, 34, "#110c13", [(.05, 18, 3)], 3))
A(island(1770, 820, 70, 34, "#110c13", [(-.05, 18, 3)], 4))
A('</g>')
# brume qui passe devant
A('<g mask="url(#mLow)" opacity=".7"><rect width="1920" height="1080" filter="url(#fClouds)" transform="translate(0 30)"/></g>')
# bancs sombres proches (plan 1)
A('<ellipse cx="80" cy="1080" rx="520" ry="120" fill="#060508" filter="url(#fBlur50)"/>')
A('<ellipse cx="1840" cy="1080" rx="520" ry="120" fill="#060508" filter="url(#fBlur50)"/>')

# 9. Calme de la colonne, vignette, grain
A('<rect width="1920" height="1080" fill="url(#gColDark)"/>')
A('<rect width="1920" height="1080" fill="url(#gVig)"/>')
A('<rect width="1920" height="1080" filter="url(#fGrain)" style="mix-blend-mode:overlay"/>')
A('</svg>')

open(sys.argv[1], "w").write("\n".join(out))
print(sys.argv[1], sum(len(x) for x in out) // 1024, "Ko")
