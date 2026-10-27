"""Fond « sup1 » — LA SALLE DU CONSEIL.

    python3 gen.py sortie.svg

Un cercle magique doré gravé dans un sol d'obsidienne polie, vu en légère
perspective dans le tiers bas : c'est la source de lumière de la salle.
Deux piliers gothiques en silhouette sur les bords, une seconde paire dans la
brume, un arc brisé qui encadre le fond ; une grande baie à remplage au fond,
à peine éclairée ; fumée crimson basse ; étincelles d'or qui montent.

Le cercle est calculé dans le plan du sol puis projeté (vraie perspective : le
bord proche est plus large que le bord lointain), d'où un générateur.
"""
import math
import random
import sys

W, H, CX = 1920, 1080, 960
YH = 430.0                      # horizon
Y_FAR, Y_NEAR = 756.0, 1036.0   # bords lointain et proche du cercle (axe)
HALF = 760.0                    # demi-largeur apparente du cercle
Z0 = ((Y_FAR - YH) + (Y_NEAR - YH)) / ((Y_NEAR - YH) - (Y_FAR - YH))
K = (Y_FAR - YH) * (Z0 + 1)
F = HALF * math.sqrt(Z0 * Z0 - 1)

CRIMSON, POURPRE = "#A6192E", "#60152D"
OR, OR_CLAIR, IVOIRE = "#C69A55", "#E6C48A", "#F2EDE5"

rnd = random.Random(1907)
out = []
A = out.append


def P(X, Z):
    return CX + F * X / Z, YH + K / Z


def polar(r, t):
    return r * math.cos(t), Z0 + r * math.sin(t)


def pp(pts, close=False):
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + (" Z" if close else "")


def ring(r, n=320):
    return pp([P(*polar(r, 2 * math.pi * i / n)) for i in range(n + 1)])


def seg(r0, t0, r1, t1, n=1):
    return pp([P(*polar(r0 + (r1 - r0) * i / n, t0 + (t1 - t0) * i / n)) for i in range(n + 1)])


def star_floor(t, r, size, ratio=0.22, spin=0.0):
    X0, Zc = polar(r, t)
    ux, uz = -math.sin(t), math.cos(t)
    vx, vz = math.cos(t), math.sin(t)
    pts = []
    for k in range(8):
        a = k * math.pi / 4 + spin
        rr = size if k % 2 == 0 else size * ratio
        du, dv = rr * math.sin(a), rr * math.cos(a)
        pts.append(P(X0 + du * ux + dv * vx, Zc + du * uz + dv * vz))
    return pp(pts, True)


def glyph(t, r_in, r_out, dt):
    dr = r_out - r_in
    strokes = [[(0, 0.06), (0, 0.94)]]
    for f in rnd.sample(["bu", "bd", "chev", "bar", "diam", "hook", "fork", "tri"], rnd.randint(2, 3)):
        strokes += {
            "bu": [[(0, 0.55), (0.42, 0.86)]],
            "bd": [[(0, 0.5), (-0.42, 0.2)]],
            "chev": [[(-0.4, 0.64), (0, 0.38), (0.4, 0.64)]],
            "bar": [[(-0.36, 0.3), (0.36, 0.3)]],
            "diam": [[(0, 0.94), (0.22, 0.78), (0, 0.62), (-0.22, 0.78), (0, 0.94)]],
            "hook": [[(0, 0.94), (0.38, 0.94), (0.38, 0.7)]],
            "fork": [[(0, 0.7), (-0.36, 0.95)], [(0, 0.7), (0.36, 0.95)]],
            "tri": [[(-0.3, 0.12), (0.3, 0.12), (0, 0.42), (-0.3, 0.12)]],
        }[f]
    return " ".join(pp([P(*polar(r_in + v * dr, t + u * dt)) for u, v in st]) for st in strokes)


def vp_x(y, xr, yr):
    """x, à la hauteur y, de la fuyante qui passe par (xr, yr)."""
    return CX + (xr - CX) * (y - YH) / (yr - YH)


# ================================================================== defs
A(f"""<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
  <style>filter{{color-interpolation-filters:sRGB}}</style>
  <linearGradient id="gAir" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#060609"/>
    <stop offset="0.38" stop-color="#0A090E"/>
    <stop offset="0.55" stop-color="#0E0B11"/>
    <stop offset="1" stop-color="#050507"/>
  </linearGradient>
  <radialGradient id="gDepth" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#3C1220" stop-opacity="0.75"/>
    <stop offset="0.45" stop-color="#2A0D19" stop-opacity="0.45"/>
    <stop offset="1" stop-color="#14080E" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gWin" cx="0.5" cy="0.92" r="0.9">
    <stop offset="0" stop-color="#5E1A2A"/>
    <stop offset="0.35" stop-color="#3E1220"/>
    <stop offset="0.75" stop-color="#1E0B14"/>
    <stop offset="1" stop-color="#120A10"/>
  </radialGradient>
  <linearGradient id="gSlit" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2A0C16"/>
    <stop offset="0.5" stop-color="#6A1828"/>
    <stop offset="1" stop-color="#3A0E1A"/>
  </linearGradient>
  <linearGradient id="gRay" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{CRIMSON}" stop-opacity="0.22"/>
    <stop offset="0.6" stop-color="{CRIMSON}" stop-opacity="0.07"/>
    <stop offset="1" stop-color="{CRIMSON}" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="gCrys" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#C02A3A" stop-opacity="0.55"/>
    <stop offset="0.35" stop-color="{CRIMSON}" stop-opacity="0.2"/>
    <stop offset="1" stop-color="{POURPRE}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gVig" cx="0.5" cy="0.5" r="0.75">
    <stop offset="0.5" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.6"/>
  </radialGradient>
  <linearGradient id="gCyl" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#030304"/>
    <stop offset="0.5" stop-color="#08080B"/>
    <stop offset="0.8" stop-color="#121016"/>
    <stop offset="0.93" stop-color="#1C1218"/>
    <stop offset="1" stop-color="#060608"/>
  </linearGradient>
  <linearGradient id="gCylFar" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#0C0A0F"/>
    <stop offset="0.6" stop-color="#141117"/>
    <stop offset="0.9" stop-color="#22141B"/>
    <stop offset="1" stop-color="#100D12"/>
  </linearGradient>
  <linearGradient id="gRim" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{CRIMSON}" stop-opacity="0"/>
    <stop offset="0.45" stop-color="{CRIMSON}" stop-opacity="0.12"/>
    <stop offset="0.85" stop-color="{CRIMSON}" stop-opacity="0.75"/>
    <stop offset="1" stop-color="{CRIMSON}" stop-opacity="0.5"/>
  </linearGradient>
  <linearGradient id="gRimGold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{OR}" stop-opacity="0"/>
    <stop offset="0.3" stop-color="{OR}" stop-opacity="0.15"/>
    <stop offset="0.75" stop-color="{OR_CLAIR}" stop-opacity="0.7"/>
    <stop offset="1" stop-color="{OR}" stop-opacity="0.2"/>
  </linearGradient>
  <linearGradient id="gUplight" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity="0.7"/>
    <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
    <stop offset="0.86" stop-color="#4A0F1C" stop-opacity="0.3"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.1"/>
  </linearGradient>
  <linearGradient id="gBanner" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#1E060D"/>
    <stop offset="0.16" stop-color="#4A0D1A"/>
    <stop offset="0.3" stop-color="#2C0811"/>
    <stop offset="0.5" stop-color="#5C1120"/>
    <stop offset="0.66" stop-color="#360A15"/>
    <stop offset="0.86" stop-color="#6E1525"/>
    <stop offset="1" stop-color="#2A0811"/>
  </linearGradient>
  <linearGradient id="gBannerV" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity="0.85"/>
    <stop offset="0.4" stop-color="#000" stop-opacity="0.25"/>
    <stop offset="0.8" stop-color="#000" stop-opacity="0.05"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.35"/>
  </linearGradient>
  <linearGradient id="gFloor" x1="0" y1="560" x2="0" y2="{H}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#140D13"/>
    <stop offset="0.3" stop-color="#0A080C"/>
    <stop offset="1" stop-color="#050507"/>
  </linearGradient>
  <linearGradient id="gCenterFade" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff"/>
    <stop offset="0.2" stop-color="#fff"/>
    <stop offset="0.32" stop-color="#666"/>
    <stop offset="0.42" stop-color="#2a2a2a"/>
    <stop offset="0.58" stop-color="#2a2a2a"/>
    <stop offset="0.68" stop-color="#666"/>
    <stop offset="0.8" stop-color="#fff"/>
    <stop offset="1" stop-color="#fff"/>
  </linearGradient>
  <mask id="mCenter" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <rect width="{W}" height="{H}" fill="url(#gCenterFade)"/>
  </mask>
  <linearGradient id="gSmokeV" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000"/>
    <stop offset="0.68" stop-color="#000"/>
    <stop offset="0.82" stop-color="#888"/>
    <stop offset="0.93" stop-color="#fff"/>
    <stop offset="1" stop-color="#ccc"/>
  </linearGradient>
  <linearGradient id="gSmokeH" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff"/>
    <stop offset="0.24" stop-color="#fff"/>
    <stop offset="0.4" stop-color="#3a3a3a"/>
    <stop offset="0.6" stop-color="#3a3a3a"/>
    <stop offset="0.76" stop-color="#fff"/>
    <stop offset="1" stop-color="#fff"/>
  </linearGradient>
  <mask id="mSmokeH" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <rect width="{W}" height="{H}" fill="url(#gSmokeH)"/>
  </mask>
  <mask id="mSmoke" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <rect width="{W}" height="{H}" fill="url(#gSmokeV)" mask="url(#mSmokeH)"/>
  </mask>
  <filter id="fSmoke" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <feTurbulence type="fractalNoise" baseFrequency="0.0024 0.011" numOctaves="5" seed="11" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.50  0 0 0 0 0.06  0 0 0 0 0.13  3.0 0 0 0 -1.25"/>
  </filter>
  <filter id="fSmokeDark" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <feTurbulence type="fractalNoise" baseFrequency="0.0032 0.014" numOctaves="4" seed="37" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.02  0 0 0 0 0.02  0 0 0 0 0.03  3.2 0 0 0 -1.35"/>
  </filter>
  <filter id="fHaze" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <feTurbulence type="fractalNoise" baseFrequency="0.0018 0.006" numOctaves="4" seed="3" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.36  0 0 0 0 0.08  0 0 0 0 0.16  2.0 0 0 0 -0.85"/>
  </filter>
  <filter id="fClouds" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <feTurbulence type="fractalNoise" baseFrequency="0.004 0.013" numOctaves="5" seed="8" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.16  0 0 0 0 0.20  2.4 0 0 0 -1.05"/>
  </filter>
  <filter id="fMottle" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="4" seed="21" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.11  0 0 0 0 0.10  0 0 0 0 0.13  1.4 0 0 0 -0.55" result="t"/>
    <feComposite in="t" in2="SourceAlpha" operator="in" result="tt"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="tt"/></feMerge>
  </filter>
  <filter id="fHalo" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b1"/>
    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b2"/>
    <feMerge><feMergeNode in="b2"/><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="fHaloS" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b1"/>
    <feMerge><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="fSpark" x="-400%" y="-400%" width="900%" height="900%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="b"/>
    <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b2"/>
    <feMerge><feMergeNode in="b2"/><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="fB1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter>
  <filter id="fB3" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="fB12" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="12"/></filter>
  <filter id="fB30" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><feGaussianBlur stdDeviation="30"/></filter>
  <filter id="fRefl" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><feGaussianBlur stdDeviation="4 18"/></filter>
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

# ================================================================== plan 4 : profondeur
A(f'<rect width="{W}" height="{H}" fill="url(#gAir)"/>')
A(f'<ellipse cx="{CX}" cy="470" rx="760" ry="330" fill="url(#gDepth)"/>')

# grande baie du fond, à remplage, à peine éclairée
bx0, bx1, by0, bya = 786, 1134, 590, 150
bm, bw = (bx0 + bx1) / 2, bx1 - bx0
spring = 340
baie = f"M{bx0} {by0} L{bx0} {spring} C{bx0} {spring - 110} {bm - 90} {bya + 20} {bm} {bya} C{bm + 90} {bya + 20} {bx1} {spring - 110} {bx1} {spring} L{bx1} {by0} Z"
A(f'<clipPath id="cBaie"><path d="{baie}"/></clipPath>')
A('<g clip-path="url(#cBaie)">')
A(f'<rect x="{bx0}" y="{bya}" width="{bw}" height="{by0 - bya}" fill="url(#gWin)"/>')
A(f'<rect width="{W}" height="{H}" filter="url(#fClouds)" opacity="0.5"/>')


def island(x, y, w, h, fill, op, seed):
    r = random.Random(seed)
    top = [(x - w / 2, y)]
    for i in range(1, 9):
        top.append((x - w / 2 + w * i / 9, y - r.uniform(0, h * 0.1)))
    top.append((x + w / 2, y + h * 0.04))
    bot = []
    n = 11
    for i in range(1, n):
        a = i / n
        xx = x + w / 2 - w * a
        depth = h * (1 - abs(2 * a - 1) ** 1.6) * r.uniform(0.75, 1.05)
        bot.append((xx + r.uniform(-w * 0.02, w * 0.02), y + depth))
    return f'<path d="{pp(top + bot, True)}" fill="{fill}" opacity="{op}"/>'


A(island(882, 418, 96, 54, "#2A0F1B", 0.8, 1))
A(island(1062, 372, 64, 38, "#2E111D", 0.7, 2))
A(island(980, 486, 170, 84, "#1C0A13", 0.95, 3))
for x, h in ((944, 34), (958, 56), (972, 78), (986, 50), (1002, 30)):
    A(f'<path d="M{x - 5} 484 L{x - 5} {484 - h + 16} L{x} {484 - h} L{x + 5} {484 - h + 16} L{x + 5} 484 Z" fill="#1C0A13"/>')
A('</g>')
# remplage : deux lancettes et une rosace à huit lobes
tr = []
mx0, mx1 = bm - bw / 6, bm + bw / 6
tr.append(f'<path d="M{bm} {by0} L{bm} 352" stroke-width="11"/>')
tr.append(f'<path d="M{bx0 + 4} {spring + 30} C{bx0 + 10} 300 {bm - 40} 300 {bm} 352 C{bm + 40} 300 {bx1 - 10} 300 {bx1 - 4} {spring + 30}" stroke-width="8"/>')
tr.append(f'<circle cx="{bm}" cy="262" r="58" stroke-width="8"/>')
tr.append(f'<circle cx="{bm}" cy="262" r="16" stroke-width="6"/>')
for k in range(8):
    a = k * math.pi / 4
    x1, y1 = bm + 18 * math.cos(a), 262 + 18 * math.sin(a)
    x2, y2 = bm + 54 * math.cos(a), 262 + 54 * math.sin(a)
    tr.append(f'<path d="M{x1:.1f} {y1:.1f} L{x2:.1f} {y2:.1f}" stroke-width="4"/>')
for mxx in (bm - bw / 4, bm + bw / 4):
    tr.append(f'<path d="M{mxx} {by0} L{mxx} 400" stroke-width="5"/>')
A(f'<g stroke="#0A080C" fill="none" filter="url(#fB1)">' + "".join(tr) + '</g>')
# mur du fond (noir, très légèrement marbré) et ébrasement de la baie
WL, WR, WB = 540, 1380, 596
A(f'<path d="M{WL} 0 L{WR} 0 L{WR} {WB} L{WL} {WB} Z {baie}" fill="#0B0A0E" fill-rule="evenodd" filter="url(#fMottle)"/>')
A(f'<path d="{baie}" fill="none" stroke="#2A1219" stroke-width="10" opacity="0.8" filter="url(#fB3)"/>')
A(f'<path d="{baie}" fill="none" stroke="{OR}" stroke-width="1" opacity="0.22"/>')
# niches latérales du mur du fond, éteintes
for x0 in (620, 1220):
    x1 = x0 + 80
    m = (x0 + x1) / 2
    d = f"M{x0} 560 L{x0} 380 C{x0} 330 {m - 20} 304 {m} 296 C{m + 20} 304 {x1} 330 {x1} 380 L{x1} 560 Z"
    A(f'<path d="{d}" fill="#140C12"/>')
    A(f'<path d="{d}" fill="none" stroke="{OR}" stroke-width="0.8" opacity="0.14"/>')
# brume de profondeur (bruit, pas d'aplat)
A(f'<rect x="0" y="0" width="{W}" height="700" filter="url(#fHaze)" opacity="0.55"/>')

# ================================================================== plan 3 : murs latéraux en fuite
for sgn in (-1, 1):
    xr = CX + sgn * (CX - WL)
    xa = vp_x(900, xr, WB)
    pts = [(xr, -10), (xr, WB), (xa, 900), (CX + sgn * 1000, 900), (CX + sgn * 1000, -10)]
    A(f'<path d="{pp(pts, True)}" fill="#09080C" filter="url(#fMottle)"/>')
    # hautes fenêtres en fuite : fentes de lumière + rayons obliques
    for (xn, xf, glow) in ((318, 372, 1.0), (436, 470, 0.7)):
        if sgn > 0:
            xn, xf = W - xf, W - xn
        ybn, ybf = (YH + (510 - YH) * (x - CX) / (xr - CX) for x in (xn, xf))
        ytn, ytf = (YH + (120 - YH) * (x - CX) / (xr - CX) for x in (xn, xf))
        xm = (xn + xf) / 2
        ytm = min(ytn, ytf) - 40
        d = (f"M{xn:.0f} {ybn:.0f} L{xn:.0f} {ytn:.0f} Q{xn:.0f} {ytm + 12:.0f} {xm:.0f} {ytm:.0f} "
             f"Q{xf:.0f} {ytm + 12:.0f} {xf:.0f} {ytf:.0f} L{xf:.0f} {ybf:.0f} Z")
        A(f'<path d="{d}" fill="url(#gSlit)" opacity="{0.85 * glow:.2f}"/>')
        A(f'<path d="{d}" fill="none" stroke="{CRIMSON}" stroke-width="2" opacity="{0.4 * glow:.2f}" filter="url(#fB3)"/>')
        A(f'<path d="M{xm:.0f} {(ybn + ybf) / 2:.0f} L{xm:.0f} {ytm + 26:.0f}" stroke="#09080C" stroke-width="4"/>')
        # rayon qui traverse la nef en diagonale
        x_land = xm - sgn * 330
        A(f'<path d="M{xn:.0f} {ytn + 40:.0f} L{xf:.0f} {ytf + 40:.0f} L{x_land + 60:.0f} 940 L{x_land - 70:.0f} 940 Z" '
          f'fill="url(#gRay)" opacity="{0.55 * glow:.2f}" filter="url(#fB12)"/>')

# ================================================================== sol d'obsidienne
floor = (f"M0 {H} L0 900 L{vp_x(900, WL, WB):.0f} 900 L{WL} {WB} L{WR} {WB} "
         f"L{vp_x(900, WR, WB):.0f} 900 L{W} 900 L{W} {H} Z")
A(f'<path d="{floor}" fill="url(#gFloor)"/>')
# reflets : la baie, les fentes
A(f'<g filter="url(#fRefl)">'
  f'<rect x="{bx0 + 40}" y="{WB + 6}" width="{bw - 80}" height="230" fill="#4A1424" opacity="0.32"/>'
  f'<rect x="{bm - 30}" y="{WB + 6}" width="60" height="320" fill="#5A1A2A" opacity="0.18"/>'
  f'</g>')
# joints du sol, gravés
jo = []
for X in (-2.4, -1.7, 1.7, 2.4):
    a, b = P(X, Z0 - 0.9), P(X, 9)
    jo.append(f"M{a[0]:.1f} {a[1]:.1f} L{b[0]:.1f} {b[1]:.1f}")
for Z in (Z0 - 0.75, Z0 - 0.3, Z0 + 0.25, Z0 + 0.9, Z0 + 1.7, Z0 + 2.8):
    a, b = P(-4, Z), P(4, Z)
    jo.append(f"M{a[0]:.1f} {a[1]:.1f} L{b[0]:.1f} {b[1]:.1f}")
A(f'<path d="{" ".join(jo)}" stroke="#1C1820" stroke-width="1" fill="none" opacity="0.6" mask="url(#mCenter)"/>')

# ================================================================== cercle magique
# lueur au sol sous l'anneau des runes : la salle est éclairée par le cercle
band = pp([P(*polar(1.03, 2 * math.pi * i / 200)) for i in range(201)], True) + " " + \
       pp([P(*polar(0.83, -2 * math.pi * i / 200)) for i in range(201)], True)
A(f'<g mask="url(#mCenter)">'
  f'<path d="{band}" fill="{CRIMSON}" fill-rule="evenodd" opacity="0.42" filter="url(#fB12)"/>'
  f'<path d="{band}" fill="#3A0E1A" fill-rule="evenodd" opacity="0.6" filter="url(#fB30)"/>'
  f'</g>')


def fade_r(r):
    a = max(0.0, min(1.0, (r - 0.18) / 0.8))
    return 0.05 + 0.95 * a ** 1.8


circ = []


def add(d, w, op, col=OR):
    circ.append(f'<path d="{d}" stroke="{col}" stroke-width="{w}" fill="none" opacity="{op:.3f}"/>')


add(ring(1.075), 0.8, 0.45)
add(ring(1.0), 2.2, 1.0, OR_CLAIR)
add(ring(0.984), 0.9, 0.85)
add(ring(0.886), 1.7, fade_r(0.89), OR_CLAIR)
add(ring(0.869), 0.8, fade_r(0.87))
add(" ".join(seg(0.869, 2 * math.pi * i / 192, 0.869 - (0.05 if i % 6 == 0 else 0.02), 2 * math.pi * i / 192) for i in range(192)),
    0.8, fade_r(0.85))
NR = 40
dt = 2 * math.pi / NR
for i in range(NR):
    if i % 10 == 5:
        continue
    add(glyph((i + 0.5) * dt, 0.902, 0.968, dt * 0.55), 1.15, fade_r(0.94))
for i in range(NR):
    circ.append(f'<path d="{star_floor(i * dt, 0.935, 0.011, 0.55)}" fill="{OR}" opacity="{fade_r(0.94) * 0.8:.3f}"/>')
# arcs extérieurs ponctués (entre étoiles cardinales)
for k in range(4):
    t0 = k * math.pi / 2 + math.pi / 2 + 0.16
    t1 = t0 + math.pi / 2 - 0.32
    circ.append(f'<path d="{pp([P(*polar(1.04, t0 + (t1 - t0) * i / 60)) for i in range(61)])}" stroke="{OR}" stroke-width="1" fill="none" opacity="0.6"/>')
    for j in range(1, 6):
        t = t0 + (t1 - t0) * j / 6
        circ.append(f'<path d="{star_floor(t, 1.04, 0.012, 0.6)}" fill="{OR_CLAIR}" opacity="0.7"/>')
for k in range(8):
    t = k * math.pi / 4 + math.pi / 2
    big = k % 2 == 0
    circ.append(f'<path d="{star_floor(t, 1.0 if not big else 1.03, 0.085 if big else 0.045, 0.18)}" fill="{OR_CLAIR if big else OR}" opacity="{0.95 if big else 0.75}"/>')
    add(star_floor(t, 1.0 if not big else 1.03, 0.13 if big else 0.065, 0.1, math.pi / 4), 0.8, 0.55)
sq = []
for rot in (0, math.pi / 4):
    sq.append(pp([P(*polar(0.845, rot + math.pi / 2 + k * math.pi / 2)) for k in range(5)]))
add(" ".join(sq), 1.3, fade_r(0.8))
add(ring(0.597), 1.4, fade_r(0.62))
add(ring(0.578), 0.7, fade_r(0.6))
add(" ".join(seg(0.6, k * math.pi / 8, 0.845 if k % 2 == 0 else 0.69, k * math.pi / 8) for k in range(16)), 0.7, fade_r(0.72))
NR2 = 26
dt2 = 2 * math.pi / NR2
for i in range(NR2):
    add(glyph((i + 0.5) * dt2, 0.48, 0.553, dt2 * 0.5), 0.9, fade_r(0.52))
add(ring(0.47), 1.0, fade_r(0.47))
add(ring(0.3), 0.9, fade_r(0.3))
add(star_floor(math.pi / 2, 0.0, 0.25, 0.16), 1.0, fade_r(0.25))
for k in range(8):
    t = k * math.pi / 4 + math.pi / 2
    Xc, Zc = polar(0.845, t)
    add(pp([P(Xc + 0.024 * math.cos(2 * math.pi * j / 24), Zc + 0.024 * math.sin(2 * math.pi * j / 24)) for j in range(25)]), 0.9, fade_r(0.82))

A(f'<g filter="url(#fHalo)" mask="url(#mCenter)" stroke-linecap="round" stroke-linejoin="round">')
out.extend(circ)
A('</g>')

# ================================================================== fumée basse
A(f'<g mask="url(#mSmoke)">'
  f'<rect width="{W}" height="{H}" filter="url(#fSmokeDark)" opacity="0.8"/>'
  f'<rect width="{W}" height="{H}" filter="url(#fSmoke)" opacity="0.75"/>'
  f'</g>')

# ================================================================== plan 2 : piliers dans la brume
def far_pillar():
    g = []
    x0, x1, base = 360, 420, 752
    g.append(f'<rect x="{x0}" y="-10" width="{x1 - x0}" height="{base + 10}" fill="url(#gCylFar)"/>')
    g.append(f'<rect x="{x0 - 10}" y="{base - 24}" width="{x1 - x0 + 20}" height="26" fill="#100D12"/>')
    g.append(f'<rect x="{x0 - 8}" y="218" width="{x1 - x0 + 16}" height="22" fill="#100D12"/>')
    g.append(f'<path d="M{x0 - 8} 240.5 L{x1 + 8} 240.5" stroke="{OR}" stroke-width="0.8" opacity="0.25"/>')
    g.append(f'<path d="M{x1 - 1} 0 L{x1 - 1} {base - 24}" stroke="{CRIMSON}" stroke-width="1" opacity="0.3"/>')
    return g


fp = far_pillar()
A('<g opacity="0.92">' + "".join(fp) + '</g>')
A(f'<g transform="translate({W} 0) scale(-1 1)" opacity="0.92">' + "".join(fp) + '</g>')
# arc brisé qui relie les piliers lointains au-dessus de la nef
ax0, ax1, ay = 420, 1500, 228
arc_in = f"M{ax0} {ay} C{ax0 + 40} 110 {CX - 260} 46 {CX} 22 C{CX + 260} 46 {ax1 - 40} 110 {ax1} {ay}"
arc_out = f"M{ax0 - 70} {ay} C{ax0 - 30} 60 {CX - 300} -20 {CX} -50 C{CX + 300} -20 {ax1 + 30} 60 {ax1 + 70} {ay}"
A(f'<path d="{arc_out} L{ax1} {ay} C{ax1 - 40} 110 {CX + 260} 46 {CX} 22 C{CX - 260} 46 {ax0 + 40} 110 {ax0} {ay} Z" fill="#0A090D"/>')
A(f'<path d="{arc_in}" fill="none" stroke="{OR}" stroke-width="1" opacity="0.28"/>')
A(f'<path d="{arc_in}" fill="none" stroke="{CRIMSON}" stroke-width="3" opacity="0.18" filter="url(#fB3)"/>')

# ================================================================== plan 1 : piliers proches
def pillar():
    g = []
    # bannière suspendue côté nef
    bx, bwid, btop, bbot = 250, 78, -10, 560
    ban = f"M{bx} {btop} L{bx + bwid} {btop} L{bx + bwid} {bbot} L{bx + bwid / 2} {bbot - 44} L{bx} {bbot} Z"
    g.append(f'<path d="{ban}" fill="url(#gBanner)"/>')
    g.append(f'<path d="{ban}" fill="url(#gBannerV)"/>')
    inner = f"M{bx + 7} 70 L{bx + bwid - 7} 70 L{bx + bwid - 7} {bbot - 13} L{bx + bwid / 2} {bbot - 52} L{bx + 7} {bbot - 13} Z"
    g.append(f'<path d="{inner}" fill="none" stroke="{OR}" stroke-width="0.9" opacity="0.5"/>')
    g.append(f'<rect x="{bx - 8}" y="56" width="{bwid + 16}" height="6" fill="#141118"/>')
    g.append(f'<path d="M{bx - 8} 56.5 L{bx + bwid + 8} 56.5" stroke="{OR}" stroke-width="0.8" opacity="0.45"/>')
    sx, sy, s = bx + bwid / 2, 330, 26
    st = (f"M{sx} {sy - s * 1.25} L{sx + s * .16} {sy - s * .16} L{sx + s} {sy} L{sx + s * .16} {sy + s * .16} "
          f"L{sx} {sy + s * 1.6} L{sx - s * .16} {sy + s * .16} L{sx - s} {sy} L{sx - s * .16} {sy - s * .16} Z")
    g.append(f'<path d="{st}" fill="{OR}" opacity="0.85" filter="url(#fHaloS)"/>')
    g.append(f'<circle cx="{sx}" cy="{sy}" r="{s * 0.6}" fill="none" stroke="{OR}" stroke-width="0.9" opacity="0.55"/>')
    g.append(f'<path d="M{sx} 90 L{sx} {sy - s * 1.6} M{sx} {sy + s * 2} L{sx} {bbot - 70}" stroke="{OR}" stroke-width="0.8" opacity="0.35"/>')
    g.append(f'<path d="M{sx - 5} {bbot - 80} L{sx} {bbot - 90} L{sx + 5} {bbot - 80} L{sx} {bbot - 70} Z" fill="{OR}" opacity="0.6"/>')

    # pilier fasciculé
    g.append(f'<rect x="-20" y="0" width="256" height="{H}" fill="#040406"/>')
    shafts = [(-10, 40), (182, 230), (30, 92), (130, 196), (70, 160)]
    for x0, x1 in shafts:
        g.append(f'<rect x="{x0}" y="150" width="{x1 - x0}" height="720" fill="url(#gCyl)" filter="url(#fMottle)"/>')
        g.append(f'<rect x="{x0}" y="150" width="{x1 - x0}" height="720" fill="url(#gUplight)"/>')
        g.append(f'<rect x="{x1 - 5}" y="150" width="4" height="720" fill="url(#gRim)" filter="url(#fB1)"/>')
    g.append(f'<rect x="157.5" y="150" width="1.2" height="720" fill="url(#gRimGold)"/>')
    g.append(f'<rect x="227.6" y="150" width="1.2" height="720" fill="url(#gRimGold)" opacity="0.8"/>')
    # bague
    g.append(f'<rect x="-14" y="520" width="252" height="15" fill="#07070A"/>')
    g.append(f'<path d="M-14 520.5 L238 520.5" stroke="{OR}" stroke-width="1" opacity="0.5"/>')
    g.append(f'<path d="M-14 534.5 L238 534.5" stroke="{OR}" stroke-width="0.6" opacity="0.25"/>')
    # chapiteau à crochets
    g.append(f'<path d="M-6 150 L232 150 L256 104 L-26 104 Z" fill="#08080B"/>')
    for i in range(8):
        x = -6 + i * 31
        g.append(f'<path d="M{x} 149 Q{x + 4} 126 {x + 15} 110 Q{x + 13} 130 {x + 24} 149 Z" fill="#100E14"/>')
        g.append(f'<path d="M{x + 15} 110 Q{x + 13} 130 {x + 24} 149" fill="none" stroke="{OR}" stroke-width="0.6" opacity="0.25"/>')
    g.append(f'<rect x="-30" y="86" width="292" height="19" fill="#060608"/>')
    g.append(f'<path d="M-30 105.5 L262 105.5" stroke="{OR_CLAIR}" stroke-width="1.2" opacity="0.6"/>')
    g.append(f'<path d="M-30 86.5 L262 86.5" stroke="{OR}" stroke-width="0.8" opacity="0.3"/>')
    # nervures de voûte
    for (sx0, c1x, c1y, ex, ey, wd, op) in ((250, 340, 20, 520, -60, 26, 0.4), (226, 252, 0, 300, -80, 18, 0.25)):
        g.append(f'<path d="M{sx0 - 24} 90 Q{c1x} {c1y} {ex} {ey}" stroke="#060608" stroke-width="{wd}" fill="none"/>')
        g.append(f'<path d="M{sx0 - 10} 98 Q{c1x + 14} {c1y + 12} {ex + 12} {ey + 8}" stroke="{OR}" stroke-width="0.9" fill="none" opacity="{op}"/>')
    # base à ressauts
    g.append(f'<path d="M-14 868 L236 868 L250 892 L-28 892 Z" fill="#09080C"/>')
    g.append(f'<rect x="-34" y="892" width="300" height="200" fill="#060608"/>')
    g.append(f'<rect x="-34" y="892" width="300" height="200" fill="url(#gUplight)" opacity="0.6"/>')
    g.append(f'<path d="M-34 892.5 L266 892.5" stroke="{OR_CLAIR}" stroke-width="1.2" opacity="0.55"/>')
    g.append(f'<path d="M-14 868.5 L236 868.5" stroke="{OR}" stroke-width="0.8" opacity="0.35"/>')
    g.append(f'<path d="M265.5 894 L265.5 1080" stroke="{CRIMSON}" stroke-width="1.6" opacity="0.5" filter="url(#fB1)"/>')

    # cristaux rouges au pied du pilier, à demi pris dans la fumée
    g.append(f'<ellipse cx="318" cy="900" rx="170" ry="120" fill="url(#gCrys)"/>')
    crystals = [(306, 930, 17, 128, -6), (334, 934, 12, 88, 12), (284, 934, 11, 70, -20), (354, 938, 8, 50, 26), (318, 940, 9, 46, 3)]
    for (x, y, w, h, tilt) in crystals:
        a = math.radians(tilt)
        ca, sa = math.cos(a), math.sin(a)

        def T(px, py):
            return x + px * ca - py * sa, y + px * sa + py * ca
        tip, l1, r1 = T(0, -h), T(-w, -h * 0.74), T(w, -h * 0.74)
        l0, r0, c0, cm = T(-w * 0.85, 0), T(w * 0.85, 0), T(w * 0.15, 0), T(w * 0.2, -h * 0.74)
        g.append(f'<path d="{pp([tip, l1, l0, r0, r1], True)}" fill="{CRIMSON}" opacity="0.5" filter="url(#fB12)"/>')
        g.append(f'<path d="{pp([tip, l1, l0, c0, cm], True)}" fill="#4A0C19"/>')
        g.append(f'<path d="{pp([tip, cm, c0, r0, r1], True)}" fill="#8E1729"/>')
        g.append(f'<path d="{pp([tip, l1, cm], True)}" fill="#6A1222"/>')
        g.append(f'<path d="{pp([tip, cm, r1], True)}" fill="#C23347"/>')
        g.append(f'<path d="M{tip[0]:.1f} {tip[1]:.1f} L{cm[0]:.1f} {cm[1]:.1f} L{c0[0]:.1f} {c0[1]:.1f}" stroke="#F1B2B2" stroke-width="0.7" fill="none" opacity="0.55"/>')
        g.append(f'<path d="M{tip[0]:.1f} {tip[1]:.1f} L{r1[0]:.1f} {r1[1]:.1f}" stroke="#F1B2B2" stroke-width="0.6" fill="none" opacity="0.35"/>')
    g.append(f'<rect x="276" y="944" width="90" height="130" fill="{CRIMSON}" opacity="0.3" filter="url(#fRefl)"/>')
    return g


pl = pillar()
A('<g>' + "".join(pl) + '</g>')
A(f'<g transform="translate({W} 0) scale(-1 1)">' + "".join(pl) + '</g>')

# fumée devant les cristaux (premier plan)
A(f'<g mask="url(#mSmoke)" opacity="0.6"><rect width="{W}" height="{H}" filter="url(#fSmoke)" transform="translate(0 30)"/></g>')

# ================================================================== étincelles
sp = []
for i in range(54):
    u = rnd.random()
    if u < 0.45:
        x = rnd.uniform(240, 520)
    elif u < 0.9:
        x = W - rnd.uniform(240, 520)
    else:
        x = rnd.uniform(560, 1360)
    y = rnd.uniform(240, 930) if not (560 < x < 1360) else rnd.uniform(620, 930)
    center = 560 < x < 1360
    r = rnd.uniform(0.5, 1.1) if center else rnd.uniform(0.6, 2.0) * (0.6 + 0.4 * (y / 930))
    op = rnd.uniform(0.2, 0.4) if center else rnd.uniform(0.45, 1.0)
    col = OR_CLAIR if rnd.random() < 0.65 else OR
    if rnd.random() < 0.3 and not center:
        L = rnd.uniform(14, 40)
        dx = rnd.uniform(-10, 10)
        sp.append(f'<path d="M{x:.1f} {y:.1f} Q{x + dx * 0.2:.1f} {y + L * 0.5:.1f} {x + dx:.1f} {y + L:.1f}" stroke="{col}" stroke-width="{r * 0.6:.2f}" fill="none" opacity="{op * 0.25:.2f}" stroke-linecap="round"/>')
    sp.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" fill="{col}" opacity="{op:.2f}"/>')
A('<g filter="url(#fSpark)">' + "".join(sp) + '</g>')

# ================================================================== vignette, grain
A(f'<rect width="{W}" height="{H}" fill="url(#gVig)"/>')
A(f'<rect width="{W}" height="{H}" filter="url(#fGrain)" opacity="0.045"/>')
A(f'<rect width="{W}" height="{H}" filter="url(#fGrainD)" opacity="0.1"/>')
A('</svg>')

with open(sys.argv[1], "w") as fh:
    fh.write("\n".join(out))
print(sys.argv[1])
