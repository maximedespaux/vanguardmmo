"""Fond « sup1 » — LA SALLE DU CONSEIL.

    python3 gen.py sortie.svg

Un cercle magique doré gravé dans un sol poli, vu en perspective dans le tiers
bas ; deux piliers gothiques en silhouette sur les bords ; un mur du fond percé
d'une grande baie ouverte sur un ciel crimson et des îles flottantes ; fumée
crimson basse ; étincelles d'or qui montent.

Le cercle est calculé dans le plan du sol puis projeté (vraie perspective :
le bord proche est plus large que le bord lointain), d'où un générateur plutôt
qu'un SVG écrit à la main.
"""
import math
import random
import sys

W, H, CX = 1920, 1080, 960
# Caméra : horizon, focale, hauteur (K = F * h). Cercle de rayon 1 centré en Z0.
YH = 430.0
Y_FAR, Y_NEAR = 742.0, 1150.0
Z0 = ((Y_FAR - YH) + (Y_NEAR - YH)) / ((Y_NEAR - YH) - (Y_FAR - YH))
K = (Y_FAR - YH) * (Z0 + 1)
F = 880.0 * math.sqrt(Z0 * Z0 - 1)  # demi-largeur visible du cercle ≈ 880 px

NOIR = "#08080C"
ANTH = "#15151D"
CRIMSON = "#A6192E"
POURPRE = "#60152D"
OR = "#C69A55"
OR_CLAIR = "#E6C48A"
IVOIRE = "#F2EDE5"

rnd = random.Random(1907)
out = []


def P(X, Z):
    return CX + F * X / Z, YH + K / Z


def polar(r, t):
    return r * math.cos(t), Z0 + r * math.sin(t)


def path_pts(pts, close=False):
    s = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
    return s + (" Z" if close else "")


def ring(r, n=360, t0=0.0, t1=2 * math.pi):
    pts = [P(*polar(r, t0 + (t1 - t0) * i / n)) for i in range(n + 1)]
    return path_pts(pts)


def seg(r0, t0, r1, t1, n=6):
    pts = []
    for i in range(n + 1):
        a = i / n
        pts.append(P(*polar(r0 + (r1 - r0) * a, t0 + (t1 - t0) * a)))
    return path_pts(pts)


def local(t, r, u, v, dt, dr):
    """Point d'un glyphe : u le long de l'anneau, v vers l'extérieur."""
    return P(*polar(r + v * dr, t + u * dt))


def star4_world(t, r, size, ratio=0.22):
    """Étoile à 4 branches posée au sol, orientée vers l'extérieur."""
    pts = []
    for k in range(8):
        a = k * math.pi / 4
        rr = size if k % 2 == 0 else size * ratio
        # repère local : radial (v) et tangentiel (u)
        du, dv = rr * math.sin(a), rr * math.cos(a)
        X0, Zc = polar(r, t)
        ux, uz = -math.sin(t), math.cos(t)
        vx, vz = math.cos(t), math.sin(t)
        pts.append(P(X0 + du * ux + dv * vx, Zc + du * uz + dv * vz))
    return path_pts(pts, True)


def glyph(t, r_in, r_out, dt):
    """Rune anguleuse aléatoire : une hampe et deux ou trois traits."""
    dr = r_out - r_in
    strokes = [[(0, 0.08), (0, 0.92)]]
    feats = rnd.sample(["bu", "bd", "chev", "bar", "diam", "hook", "fork", "dot"], rnd.randint(2, 3))
    for f in feats:
        if f == "bu":
            strokes.append([(0, 0.55), (0.42, 0.85)])
        elif f == "bd":
            strokes.append([(0, 0.5), (-0.42, 0.22)])
        elif f == "chev":
            strokes.append([(-0.4, 0.62), (0, 0.38), (0.4, 0.62)])
        elif f == "bar":
            strokes.append([(-0.35, 0.3), (0.35, 0.3)])
        elif f == "diam":
            strokes.append([(0, 0.92), (0.22, 0.78), (0, 0.64), (-0.22, 0.78), (0, 0.92)])
        elif f == "hook":
            strokes.append([(0, 0.92), (0.38, 0.92), (0.38, 0.7)])
        elif f == "fork":
            strokes.append([(0, 0.7), (-0.35, 0.95)])
            strokes.append([(0, 0.7), (0.35, 0.95)])
        elif f == "dot":
            strokes.append([(0.36, 0.18), (0.36, 0.26)])
    d = []
    for st in strokes:
        d.append(path_pts([local(t, r_in, u, v, dt, dr) for u, v in st]))
    return " ".join(d)


# ---------------------------------------------------------------- defs
out.append(f"""<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
  <linearGradient id="gAir" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0B0A10"/>
    <stop offset="0.42" stop-color="#110D14"/>
    <stop offset="0.55" stop-color="#160E15"/>
    <stop offset="0.56" stop-color="#0E0B10"/>
    <stop offset="1" stop-color="#060609"/>
  </linearGradient>
  <radialGradient id="gSky" cx="0.5" cy="0.78" r="0.75">
    <stop offset="0" stop-color="#6A1A2B"/>
    <stop offset="0.35" stop-color="#3E1222"/>
    <stop offset="0.7" stop-color="#1C0C16"/>
    <stop offset="1" stop-color="#0D0A10"/>
  </radialGradient>
  <radialGradient id="gHalo" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="{CRIMSON}" stop-opacity="0.55"/>
    <stop offset="0.5" stop-color="{POURPRE}" stop-opacity="0.22"/>
    <stop offset="1" stop-color="{POURPRE}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gCrys" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#C42A3A" stop-opacity="0.7"/>
    <stop offset="0.4" stop-color="{CRIMSON}" stop-opacity="0.25"/>
    <stop offset="1" stop-color="{POURPRE}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gVig" cx="0.5" cy="0.52" r="0.72">
    <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.65"/>
  </radialGradient>
  <linearGradient id="gShaft" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#040406"/>
    <stop offset="0.45" stop-color="#0B0B10"/>
    <stop offset="0.78" stop-color="#15131A"/>
    <stop offset="0.93" stop-color="#2A121B"/>
    <stop offset="1" stop-color="#0A090D"/>
  </linearGradient>
  <linearGradient id="gShaftB" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#030305"/>
    <stop offset="0.6" stop-color="#09090D"/>
    <stop offset="1" stop-color="#121117"/>
  </linearGradient>
  <linearGradient id="gShaftV" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity="0.55"/>
    <stop offset="0.5" stop-color="#000" stop-opacity="0"/>
    <stop offset="0.85" stop-color="#3A0E18" stop-opacity="0.25"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.2"/>
  </linearGradient>
  <linearGradient id="gBanner" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#2A0812"/>
    <stop offset="0.18" stop-color="#5A1020"/>
    <stop offset="0.34" stop-color="#3A0A16"/>
    <stop offset="0.55" stop-color="#6E1424"/>
    <stop offset="0.72" stop-color="#420C18"/>
    <stop offset="0.9" stop-color="#7E1828"/>
    <stop offset="1" stop-color="#2E0912"/>
  </linearGradient>
  <linearGradient id="gBannerV" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity="0.8"/>
    <stop offset="0.35" stop-color="#000" stop-opacity="0.15"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.45"/>
  </linearGradient>
  <linearGradient id="gCenterFade" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff"/>
    <stop offset="0.17" stop-color="#fff"/>
    <stop offset="0.31" stop-color="#555"/>
    <stop offset="0.42" stop-color="#262626"/>
    <stop offset="0.58" stop-color="#262626"/>
    <stop offset="0.69" stop-color="#555"/>
    <stop offset="0.83" stop-color="#fff"/>
    <stop offset="1" stop-color="#fff"/>
  </linearGradient>
  <mask id="mCenter" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <rect width="{W}" height="{H}" fill="url(#gCenterFade)"/>
  </mask>
  <linearGradient id="gSmokeBand" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000"/>
    <stop offset="0.6" stop-color="#000"/>
    <stop offset="0.78" stop-color="#777"/>
    <stop offset="0.9" stop-color="#fff"/>
    <stop offset="1" stop-color="#aaa"/>
  </linearGradient>
  <mask id="mSmoke" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <rect width="{W}" height="{H}" fill="url(#gSmokeBand)"/>
  </mask>
  <filter id="fSmoke" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <feTurbulence type="fractalNoise" baseFrequency="0.0021 0.0085" numOctaves="5" seed="11" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.56  0 0 0 0 0.07  0 0 0 0 0.15  2.6 0 0 0 -1.05"/>
  </filter>
  <filter id="fClouds" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <feTurbulence type="fractalNoise" baseFrequency="0.0032 0.011" numOctaves="5" seed="4" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.16  0 0 0 0 0.20  2.2 0 0 0 -0.95"/>
  </filter>
  <filter id="fStone" filterUnits="objectBoundingBox" x="0" y="0" width="1" height="1">
    <feTurbulence type="fractalNoise" baseFrequency="0.035 0.006" numOctaves="3" seed="21" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.10  0 0 0 0 0.09  0 0 0 0 0.12  0 0 0 0.9 -0.32" result="t"/>
    <feComposite in="t" in2="SourceAlpha" operator="in" result="tt"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="tt"/></feMerge>
  </filter>
  <filter id="fHalo" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="b1"/>
    <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b2"/>
    <feComponentTransfer in="b2" result="b2s"><feFuncA type="linear" slope="0.8"/></feComponentTransfer>
    <feMerge><feMergeNode in="b2s"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="fSpark" x="-300%" y="-300%" width="700%" height="700%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="fBlur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="fBlur18" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="fBlur40" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><feGaussianBlur stdDeviation="40"/></filter>
  <filter id="fRefl" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><feGaussianBlur stdDeviation="3 14"/></filter>
  <filter id="fGrain" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0 0.88  3.2 0 0 0 -1.75"/>
  </filter>
  <filter id="fGrainD" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="9" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3 0 0 0 1.8"/>
  </filter>
</defs>
""")

# ---------------------------------------------------------------- plan 4 : air et ciel
out.append(f'<rect width="{W}" height="{H}" fill="url(#gAir)"/>')

# Mur du fond : x 520-1400, base au sol y 593
WALL_L, WALL_R, WALL_B = 524, 1396, 593
# Grande baie centrale (ciel)
bx0, bx1, by0, bya = 772, 1148, 560, 128
mid = (bx0 + bx1) / 2
span = bx1 - bx0
arch = (f"M{bx0} {by0} L{bx0} 330 Q{bx0} {bya + 60} {mid} {bya} Q{bx1} {bya + 60} {bx1} 330 L{bx1} {by0} Z")
out.append(f'<clipPath id="cBaie"><path d="{arch}"/></clipPath>')
out.append(f'<g clip-path="url(#cBaie)">')
out.append(f'<rect x="{bx0}" y="{bya}" width="{span}" height="{by0 - bya}" fill="url(#gSky)"/>')
out.append(f'<rect width="{W}" height="{H}" filter="url(#fClouds)" opacity="0.55"/>')
# îles flottantes lointaines (silhouettes)
def island(x, y, w, h, fill, op):
    # dessus plat irrégulier, dessous en pointe rocheuse
    pts = [(x - w / 2, y)]
    n = 7
    for i in range(1, n):
        pts.append((x - w / 2 + w * i / n, y - rnd.uniform(0, h * 0.12)))
    pts.append((x + w / 2, y))
    pts += [(x + w * 0.36, y + h * 0.35), (x + w * 0.18, y + h * 0.55), (x + w * 0.05, y + h),
            (x - w * 0.08, y + h * 0.62), (x - w * 0.26, y + h * 0.42), (x - w * 0.42, y + h * 0.18)]
    return f'<path d="{path_pts(pts, True)}" fill="{fill}" opacity="{op}"/>'
out.append(island(870, 402, 120, 70, "#1A0C14", 0.9))
out.append(island(1066, 360, 70, 44, "#200E17", 0.8))
out.append(island(960, 470, 200, 92, "#120910", 0.95))
# flèches de tours sur l'île centrale
for x, h in ((928, 40), (944, 62), (960, 84), (976, 58), (994, 36)):
    out.append(f'<path d="M{x - 6} 466 L{x - 6} {466 - h + 18} L{x} {466 - h} L{x + 6} {466 - h + 18} L{x + 6} 466 Z" fill="#120910"/>')
out.append('</g>')

# mur du fond
out.append(f'<path d="M{WALL_L} 0 L{WALL_R} 0 L{WALL_R} {WALL_B} L{WALL_L} {WALL_B} Z '
           f'{arch}" fill="#100E14" fill-rule="evenodd" filter="url(#fStone)"/>')
# remplage de la baie : meneaux et rosace
out.append(f'<g stroke="#0C0A0F" fill="none" stroke-linecap="round">'
           f'<path d="M{mid - span / 6:.0f} {by0} L{mid - span / 6:.0f} 300 M{mid + span / 6:.0f} {by0} L{mid + span / 6:.0f} 300" stroke-width="9"/>'
           f'<circle cx="{mid}" cy="236" r="62" stroke-width="8"/>'
           f'<path d="M{bx0} 330 Q{mid - span / 6:.0f} 300 {mid - span / 6:.0f} 300 Q{mid} 268 {mid + span / 6:.0f} 300 Q{bx1} 300 {bx1} 330" stroke-width="7"/>'
           f'</g>')
out.append(f'<path d="{arch}" fill="none" stroke="{OR}" stroke-width="1" opacity="0.18"/>')
# petites baies latérales du mur du fond
for x0 in (600, 1240):
    x1 = x0 + 80
    m = (x0 + x1) / 2
    a = f"M{x0} 548 L{x0} 360 Q{x0} 300 {m} 280 Q{x1} 300 {x1} 360 L{x1} 548 Z"
    out.append(f'<path d="{a}" fill="#2A0E1A" opacity="0.85"/>')
    out.append(f'<path d="M{m} 548 L{m} 330" stroke="#0E0B10" stroke-width="5"/>')
# brume du fond (perspective aérienne)
out.append(f'<rect x="0" y="80" width="{W}" height="560" fill="{POURPRE}" opacity="0.10" filter="url(#fBlur40)"/>')
out.append(f'<ellipse cx="{CX}" cy="540" rx="520" ry="180" fill="url(#gHalo)" opacity="0.55"/>')

# ---------------------------------------------------------------- plan 3 : murs latéraux en fuite
def side_wall(sign):
    # base sur la droite de fuite du sol à X = ±1.45
    def xb(y):
        return CX + sign * (-(K and 1)) * 0  # placeholder (non utilisé)
    pass


# murs latéraux : trapèzes fuyant vers le point de fuite (960, YH)
def vp_line_x(y, xr, yr):
    """x sur la droite passant par le point de fuite et (xr, yr)."""
    return CX + (xr - CX) * (y - YH) / (yr - YH)


for sign in (-1, 1):
    xr = CX + sign * (CX - WALL_L)
    xa = vp_line_x(860, xr, WALL_B)  # base proche
    pts = [(xr, 0), (xr, WALL_B), (xa, 860), (CX + sign * 1100, 860), (CX + sign * 1100, 0)]
    out.append(f'<path d="{path_pts(pts, True)}" fill="#0B0A0F" filter="url(#fStone)"/>')
    # fenêtres hautes en fuite : fentes lumineuses
    for (xn, xf) in ((300, 352), (408, 444)):
        if sign > 0:
            xn, xf = W - xf, W - xn
        # appui et sommet sur des droites de fuite
        yb_n = YH + (520 - YH) * (xn - CX) / (xr - CX)
        yb_f = YH + (520 - YH) * (xf - CX) / (xr - CX)
        yt_n = YH + (150 - YH) * (xn - CX) / (xr - CX)
        yt_f = YH + (150 - YH) * (xf - CX) / (xr - CX)
        xm = (xn + xf) / 2
        ytm = min(yt_n, yt_f) - 34
        d = f"M{xn:.0f} {yb_n:.0f} L{xn:.0f} {yt_n:.0f} Q{xn:.0f} {ytm + 10:.0f} {xm:.0f} {ytm:.0f} Q{xf:.0f} {ytm + 10:.0f} {xf:.0f} {yt_f:.0f} L{xf:.0f} {yb_f:.0f} Z"
        out.append(f'<path d="{d}" fill="#3A1020" opacity="0.9"/>')
        out.append(f'<path d="{d}" fill="none" stroke="{CRIMSON}" stroke-width="1.2" opacity="0.35"/>')
        out.append(f'<path d="M{xm:.0f} {(yb_n + yb_f) / 2:.0f} L{xm:.0f} {ytm + 30:.0f}" stroke="#0B0A0F" stroke-width="4"/>')
        # rayon de lumière oblique vers le sol
        out.append(f'<path d="M{xn:.0f} {yt_n:.0f} L{xf:.0f} {yt_f:.0f} L{xm + sign * -260:.0f} 900 L{xm + sign * -420:.0f} 900 Z" '
                   f'fill="{CRIMSON}" opacity="0.05" filter="url(#fBlur18)"/>')

# ---------------------------------------------------------------- sol poli
floor = f"M0 {H} L0 860 L{vp_line_x(860, WALL_L, WALL_B):.0f} 860 L{WALL_L} {WALL_B} L{WALL_R} {WALL_B} L{vp_line_x(860, WALL_R, WALL_B):.0f} 860 L{W} 860 L{W} {H} Z"
out.append(f'<linearGradient id="gFloor" x1="0" y1="{WALL_B}" x2="0" y2="{H}" gradientUnits="userSpaceOnUse">'
           f'<stop offset="0" stop-color="#1A1018"/><stop offset="0.25" stop-color="#0E0B10"/><stop offset="1" stop-color="#060608"/></linearGradient>')
out.append(f'<path d="{floor}" fill="url(#gFloor)"/>')
# reflets verticaux sur le sol poli (baie, fenêtres)
out.append(f'<g filter="url(#fRefl)" opacity="0.5">'
           f'<rect x="{bx0 + 30}" y="{WALL_B + 4}" width="{span - 60}" height="220" fill="#3A1020" opacity="0.55"/>'
           f'<rect x="618" y="{WALL_B + 4}" width="44" height="120" fill="#3A1020" opacity="0.5"/>'
           f'<rect x="1258" y="{WALL_B + 4}" width="44" height="120" fill="#3A1020" opacity="0.5"/>'
           f'</g>')
# joints du sol : fuyantes et transversales
jo = []
for X in [-3.2, -2.6, -2.0, -1.45, 1.45, 2.0, 2.6, 3.2]:
    a, b = P(X, 2.05), P(X, 7.2)
    jo.append(f"M{a[0]:.1f} {a[1]:.1f} L{b[0]:.1f} {b[1]:.1f}")
for Z in [2.2, 2.55, 2.95, 3.45, 4.1, 4.9, 5.9, 7.1]:
    a, b = P(-4, Z), P(4, Z)
    jo.append(f"M{a[0]:.1f} {a[1]:.1f} L{b[0]:.1f} {b[1]:.1f}")
out.append(f'<path d="{" ".join(jo)}" stroke="#1E1A22" stroke-width="1" fill="none" opacity="0.55" mask="url(#mCenter)"/>')

# lueur crimson qui sourd de l'anneau des runes
glow = []
for i in range(0, 361, 3):
    pass
band_out = [P(*polar(1.02, 2 * math.pi * i / 240)) for i in range(241)]
band_in = [P(*polar(0.84, 2 * math.pi * i / 240)) for i in range(241)]
band = path_pts(band_out, True) + " " + path_pts(band_in[::-1], True)
out.append(f'<path d="{band}" fill="{CRIMSON}" fill-rule="evenodd" opacity="0.32" filter="url(#fBlur18)" mask="url(#mCenter)"/>')

# ---------------------------------------------------------------- cercle magique
def fade_r(r):
    """Les anneaux s'estompent vers le centre."""
    a = max(0.0, min(1.0, (r - 0.2) / 0.78))
    return 0.07 + 0.93 * a ** 1.6


circ = []
def add(d, w, op, col=OR):
    circ.append(f'<path d="{d}" stroke="{col}" stroke-width="{w}" fill="none" opacity="{op:.3f}"/>')

add(ring(1.06, 360, 0, 2 * math.pi), 0.8, fade_r(1.0) * 0.55)
add(ring(1.0), 2.0, fade_r(1.0), OR_CLAIR)
add(ring(0.982), 0.9, fade_r(0.98))
add(ring(0.885), 1.6, fade_r(0.9), OR_CLAIR)
add(ring(0.868), 0.8, fade_r(0.87))
# graduation
ticks = []
for i in range(180):
    t = 2 * math.pi * i / 180
    l = 0.05 if i % 5 == 0 else 0.022
    ticks.append(seg(0.868, t, 0.868 - l, t, 1))
add(" ".join(ticks), 0.8, fade_r(0.85))
# anneau de runes
NR = 44
dt = 2 * math.pi / NR
for i in range(NR):
    t = (i + 0.5) * dt
    if i % 11 == 5:
        continue
    add(glyph(t, 0.9, 0.965, dt * 0.55), 1.1, fade_r(0.93))
# séparateurs entre runes : petits losanges
for i in range(NR):
    t = i * dt
    add(star4_world(t, 0.9325, 0.012, 0.6), 0.8, fade_r(0.93))
# étoiles cardinales et intercardinales sur l'anneau extérieur
for k in range(8):
    t = k * math.pi / 4 + math.pi / 2
    big = k % 2 == 0
    circ.append(f'<path d="{star4_world(t, 1.0, 0.075 if big else 0.042, 0.2)}" fill="{OR_CLAIR if big else OR}" opacity="{fade_r(1.0) * (0.95 if big else 0.7):.3f}"/>')
    add(star4_world(t, 1.0, 0.11 if big else 0.06, 0.12), 0.8, fade_r(1.0) * 0.6)
# octogramme
sq = []
for rot in (0, math.pi / 4):
    pts = [P(*polar(0.84, rot + math.pi / 2 + k * math.pi / 2)) for k in range(5)]
    # segments subdivisés pour suivre la perspective (droites restent droites)
    sq.append(path_pts(pts))
add(" ".join(sq), 1.2, fade_r(0.78))
add(ring(0.594), 1.3, fade_r(0.6))
add(ring(0.575), 0.7, fade_r(0.58))
# rayons
sp = []
for k in range(16):
    t = k * math.pi / 8
    sp.append(seg(0.6, t, 0.84 if k % 2 == 0 else 0.7, t, 1))
add(" ".join(sp), 0.7, fade_r(0.7))
# anneau de runes intérieur
NR2 = 28
dt2 = 2 * math.pi / NR2
for i in range(NR2):
    add(glyph((i + 0.5) * dt2, 0.48, 0.555, dt2 * 0.5), 0.9, fade_r(0.52))
add(ring(0.47), 1.0, fade_r(0.47))
add(ring(0.3), 0.9, fade_r(0.3))
add(star4_world(math.pi / 2, 0.0, 0.26, 0.16), 1.0, fade_r(0.26))
# petits cercles aux sommets de l'octogramme
for k in range(8):
    t = k * math.pi / 4 + math.pi / 2
    add(ring_small := path_pts([P(*(lambda X, Z: (X + 0.022 * math.cos(a), Z + 0.022 * math.sin(a)))(*polar(0.84, t))) for a in [2 * math.pi * j / 24 for j in range(25)]]), 0.9, fade_r(0.84))

out.append(f'<g filter="url(#fHalo)" mask="url(#mCenter)" stroke-linecap="round" stroke-linejoin="round">')
out += circ
out.append('</g>')

# ---------------------------------------------------------------- fumée crimson basse
out.append(f'<g mask="url(#mSmoke)">'
           f'<rect width="{W}" height="{H}" filter="url(#fSmoke)" opacity="0.85"/>'
           f'</g>')

# ---------------------------------------------------------------- plan 1 : piliers, bannières, cristaux
def pillar():
    g = []
    # bannière (derrière le pilier, côté nef)
    bx, bw, btop, bbot = 236, 84, -10, 540
    ban = f"M{bx} {btop} L{bx + bw} {btop} L{bx + bw} {bbot} L{bx + bw / 2} {bbot - 46} L{bx} {bbot} Z"
    g.append(f'<path d="{ban}" fill="url(#gBanner)"/>')
    g.append(f'<path d="{ban}" fill="url(#gBannerV)"/>')
    inner = f"M{bx + 8} {btop + 70} L{bx + bw - 8} {btop + 70} L{bx + bw - 8} {bbot - 14} L{bx + bw / 2} {bbot - 54} L{bx + 8} {bbot - 14} Z"
    g.append(f'<path d="{inner}" fill="none" stroke="{OR}" stroke-width="1" opacity="0.55"/>')
    g.append(f'<path d="M{bx - 6} {btop + 62} L{bx + bw + 6} {btop + 62}" stroke="#2A2630" stroke-width="5"/>')
    sx, sy, s = bx + bw / 2, 300, 30
    st = f"M{sx} {sy - s} L{sx + s * .2} {sy - s * .2} L{sx + s} {sy} L{sx + s * .2} {sy + s * .2} L{sx} {sy + s * 1.5} L{sx - s * .2} {sy + s * .2} L{sx - s} {sy} L{sx - s * .2} {sy - s * .2} Z"
    g.append(f'<path d="{st}" fill="{OR}" opacity="0.8"/>')
    g.append(f'<circle cx="{sx}" cy="{sy}" r="{s * 0.62}" fill="none" stroke="{OR}" stroke-width="1" opacity="0.6"/>')

    # pilier fasciculé
    g.append(f'<rect x="20" y="0" width="210" height="1080" fill="#050507"/>')
    shafts = [(18, 64, "gShaftB"), (176, 222, "gShaft"), (52, 108, "gShaftB"), (130, 190, "gShaft"), (78, 158, "gShaft")]
    for x0, x1, gid in shafts:
        g.append(f'<rect x="{x0}" y="150" width="{x1 - x0}" height="700" fill="url(#{gid})" filter="url(#fStone)"/>')
        g.append(f'<rect x="{x0}" y="150" width="{x1 - x0}" height="700" fill="url(#gShaftV)"/>')
    # filets de lumière sur l'arête intérieure
    g.append(f'<path d="M221 160 L221 840" stroke="{CRIMSON}" stroke-width="1.6" opacity="0.55"/>')
    g.append(f'<path d="M157 160 L157 840" stroke="{OR}" stroke-width="1" opacity="0.32"/>')
    # bague à mi-hauteur
    g.append(f'<rect x="12" y="512" width="218" height="16" fill="#0A0A0E"/>')
    g.append(f'<path d="M12 512.5 L230 512.5" stroke="{OR}" stroke-width="1" opacity="0.45"/>')
    # chapiteau
    g.append(f'<path d="M30 150 L222 150 L244 104 L8 104 Z" fill="#0A090D"/>')
    for i in range(7):
        x = 22 + i * 32
        g.append(f'<path d="M{x} 148 Q{x + 6} 122 {x + 16} 110 Q{x + 12} 128 {x + 22} 148 Z" fill="#131119"/>')
    g.append(f'<rect x="-4" y="88" width="256" height="18" fill="#08080B"/>')
    g.append(f'<path d="M-4 106.5 L252 106.5" stroke="{OR}" stroke-width="1.2" opacity="0.6"/>')
    g.append(f'<path d="M-4 88.5 L252 88.5" stroke="{OR}" stroke-width="0.8" opacity="0.3"/>')
    # nervures de voûte qui s'élancent vers le centre
    for (x0, c1x, c1y, ex, ey, w) in ((236, 330, 30, 470, -40, 22), (220, 250, 10, 300, -60, 16)):
        g.append(f'<path d="M{x0 - 20} 92 Q{c1x} {c1y} {ex} {ey}" stroke="#0A090D" stroke-width="{w}" fill="none"/>')
        g.append(f'<path d="M{x0} 96 Q{c1x + 14} {c1y + 10} {ex + 10} {ey + 6}" stroke="{OR}" stroke-width="0.9" fill="none" opacity="0.35"/>')
    # base
    g.append(f'<path d="M4 850 L238 850 L250 878 L-8 878 Z" fill="#0B0A0E"/>')
    g.append(f'<rect x="-14" y="878" width="276" height="210" fill="#08070A"/>')
    g.append(f'<path d="M-14 878.5 L262 878.5" stroke="{OR}" stroke-width="1.2" opacity="0.55"/>')
    g.append(f'<path d="M262 880 L262 1080" stroke="{CRIMSON}" stroke-width="1.2" opacity="0.4"/>')
    g.append(f'<path d="M4 850.5 L238 850.5" stroke="{OR}" stroke-width="0.8" opacity="0.35"/>')

    # cristaux rouges au pied du pilier
    g.append(f'<ellipse cx="300" cy="880" rx="150" ry="120" fill="url(#gCrys)"/>')
    crystals = [(286, 900, 22, 150, -8), (318, 902, 16, 104, 10), (262, 904, 14, 82, -22), (340, 906, 11, 62, 24), (300, 908, 12, 56, 4)]
    for (x, y, w, h, tilt) in crystals:
        a = math.radians(tilt)
        ca, sa = math.cos(a), math.sin(a)
        def T(px, py):
            return x + px * ca - py * sa, y + px * sa + py * ca
        tip = T(0, -h); l1 = T(-w, -h * 0.72); r1 = T(w, -h * 0.72); l0 = T(-w * 0.8, 0); r0 = T(w * 0.8, 0); c0 = T(w * 0.1, 0); cm = T(w * 0.15, -h * 0.72)
        g.append(f'<path d="{path_pts([tip, l1, l0, c0, cm], True)}" fill="#5A0F1E"/>')
        g.append(f'<path d="{path_pts([tip, cm, c0, r0, r1], True)}" fill="#A11C30"/>')
        g.append(f'<path d="{path_pts([tip, l1, cm], True)}" fill="#7E1526"/>')
        g.append(f'<path d="{path_pts([tip, cm, r1], True)}" fill="#D2495A"/>')
        g.append(f'<path d="M{tip[0]:.1f} {tip[1]:.1f} L{cm[0]:.1f} {cm[1]:.1f} L{c0[0]:.1f} {c0[1]:.1f}" stroke="#F0A7A7" stroke-width="0.8" fill="none" opacity="0.6"/>')
    # reflet des cristaux dans le sol
    g.append(f'<rect x="250" y="912" width="110" height="140" fill="{CRIMSON}" opacity="0.28" filter="url(#fRefl)"/>')
    return g


left = pillar()
out.append('<g>')
out += left
out.append('</g>')
out.append(f'<g transform="translate({W} 0) scale(-1 1)">')
out += left
out.append('</g>')

# ---------------------------------------------------------------- étincelles
sp_out = []
for i in range(46):
    side = rnd.random()
    if side < 0.44:
        x = rnd.uniform(60, 470)
    elif side < 0.88:
        x = rnd.uniform(1450, 1860)
    else:
        x = rnd.uniform(500, 1420)
    y = rnd.uniform(220, 900)
    center = 500 < x < 1420
    r = rnd.uniform(0.6, 1.4) if center else rnd.uniform(0.7, 2.1)
    op = rnd.uniform(0.25, 0.5) if center else rnd.uniform(0.45, 1.0)
    col = OR_CLAIR if rnd.random() < 0.6 else OR
    if rnd.random() < 0.45 and not center:
        L = rnd.uniform(18, 60)
        dx = rnd.uniform(-8, 8)
        sp_out.append(f'<path d="M{x:.1f} {y:.1f} L{x + dx:.1f} {y + L:.1f}" stroke="{col}" stroke-width="{r * 0.7:.2f}" opacity="{op * 0.35:.2f}" stroke-linecap="round"/>')
    sp_out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" fill="{col}" opacity="{op:.2f}"/>')
out.append('<g filter="url(#fSpark)">')
out += sp_out
out.append('</g>')

# ---------------------------------------------------------------- vignette et grain
out.append(f'<rect width="{W}" height="{H}" fill="url(#gVig)"/>')
out.append(f'<rect width="{W}" height="{H}" filter="url(#fGrain)" opacity="0.05"/>')
out.append(f'<rect width="{W}" height="{H}" filter="url(#fGrainD)" opacity="0.12"/>')
out.append('</svg>')

with open(sys.argv[1], "w") as fh:
    fh.write("\n".join(out))
print(sys.argv[1])
