"""Fond sup4 — LES PORTES.  python3 gen_sup4.py sortie.svg"""
import math, random, sys

W, H = 1920, 1080
rnd = random.Random(4)
out = []
A = out.append
DEFS = []
GOLD, GOLD2, IVORY = "#C69A55", "#E6C48A", "#F2EDE5"
VX, VY = 960, 600
CAM = 0.9
U, PW, HS, T = 1.0, 0.30, 1.5, 0.26
S_ARCH = [820, 508, 315, 195, 121]
S_DOOR = 88


def f(x):
    return ("%.2f" % x).rstrip("0").rstrip(".")


def P(x, y, S):
    return (VX + x * S, VY + (CAM - y) * S)


def poly(pts, close=True):
    d = "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts)
    return d + ("Z" if close else "")


def mix(c1, c2, t):
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join("%02x" % round(a[i] + (b[i] - a[i]) * t) for i in range(3))


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


def arc_pts(cx, cy, r, a0, a1, n=36):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def half_arc(u, hs, extra=0.0, n=30):
    """Moitié gauche d'un arc brisé équilatéral, de la naissance au sommet."""
    R = 2 * u + extra
    ap = math.degrees(math.atan2(math.sqrt(R * R - u * u), -u))
    return arc_pts(u, hs, R, 180, ap, n)


def intrados(u=U, hs=HS, extra=0.0):
    left = half_arc(u, hs, extra)
    right = [(-x, y) for x, y in reversed(left)]
    return [(-u - extra, 0)] + left + right[1:] + [(u + extra, 0)]


def pillar_world(side, u=U, pw=PW, hs=HS):
    """Profil d'un pilier (base, fût, chapiteau, contrefort, pinacle) en un seul polygone."""
    xi, xo = -u, -(u + pw)     # gauche ; miroir pour la droite
    top = hs + 1.1
    m = (xi + xo) / 2
    pts = [(xo - .08, 0), (xo - .08, .09), (xo - .03, .13), (xo, .17),
           (xo, hs - .2), (xo - .05, hs - .07), (xo - .07, hs - .04), (xo - .07, hs + .04), (xo, hs + .04),
           (xo, top), (xo - .03, top + .02), (xo - .03, top + .1),
           (xo + .03, top + .1), (m, top + .75), (xi - .03, top + .1),
           (xi + .03, top + .1), (xi + .03, top + .02), (xi, top),
           (xi, hs + .04), (xi + .07, hs + .04), (xi + .07, hs - .04), (xi + .05, hs - .07), (xi, hs - .2),
           (xi, .17), (xi + .03, .13), (xi + .08, .09), (xi + .08, 0)]
    if side > 0:
        pts = [(-x, y) for x, y in pts]
    return pts


def band_world(side, u=U, hs=HS, t=T):
    inner = half_arc(u, hs, 0)
    outer = half_arc(u, hs, t)
    pts = outer + list(reversed(inner))
    if side > 0:
        pts = [(-x, y) for x, y in pts]
    return pts


A(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
DEFS.append(f"""
  <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#070709"/>
    <stop offset=".4" stop-color="#0b080c"/>
    <stop offset=".55" stop-color="#170910"/>
    <stop offset=".64" stop-color="#10080c"/>
    <stop offset="1" stop-color="#070609"/>
  </linearGradient>
  <radialGradient id="gLight" cx="{VX}" cy="{VY+20}" r="820" gradientUnits="userSpaceOnUse" gradientTransform="translate({VX} {VY+20}) scale(1 .6) translate({-VX} {-(VY+20)})">
    <stop offset="0" stop-color="#8a1628" stop-opacity=".85"/>
    <stop offset=".1" stop-color="#6a1224" stop-opacity=".6"/>
    <stop offset=".3" stop-color="#3e0d1c" stop-opacity=".35"/>
    <stop offset=".65" stop-color="#220915" stop-opacity=".14"/>
    <stop offset="1" stop-color="#220915" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="gDoor" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2a0812"/>
    <stop offset=".45" stop-color="#5e1020"/>
    <stop offset=".85" stop-color="#9a1a2d"/>
    <stop offset="1" stop-color="#c22a3c"/>
  </linearGradient>
  <radialGradient id="gStar">
    <stop offset="0" stop-color="#F2EDE5"/>
    <stop offset=".3" stop-color="#E6C48A"/>
    <stop offset="1" stop-color="#C69A55"/>
  </radialGradient>
  <radialGradient id="gGlowRed">
    <stop offset="0" stop-color="#c42639" stop-opacity=".55"/>
    <stop offset=".4" stop-color="#7d1428" stop-opacity=".2"/>
    <stop offset="1" stop-color="#60152D" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gGlowGold">
    <stop offset="0" stop-color="#E6C48A" stop-opacity=".45"/>
    <stop offset=".35" stop-color="#C69A55" stop-opacity=".12"/>
    <stop offset="1" stop-color="#C69A55" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="gCrysA" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#e2566a"/><stop offset=".45" stop-color="#A6192E"/><stop offset="1" stop-color="#4a0e1f"/>
  </linearGradient>
  <linearGradient id="gCrysB" x1="1" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7d1428"/><stop offset="1" stop-color="#2a0812"/>
  </linearGradient>
  <linearGradient id="gRay" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#c42639" stop-opacity=".0"/>
    <stop offset=".5" stop-color="#c42639" stop-opacity=".9"/>
    <stop offset="1" stop-color="#c42639" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="gBanner" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2a0812"/>
    <stop offset=".35" stop-color="#5a1022"/>
    <stop offset="1" stop-color="#3a0b18"/>
  </linearGradient>
  <filter id="fGlow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="2" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="fRim" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.4"/></filter>
  <filter id="fBlur3" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="fBlur10" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="fBlur24" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="24"/></filter>
  <filter id="fBlur60" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="60"/></filter>
  <filter id="fGrain" x="0" y="0" width="1920" height="1080" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope="0" intercept=".16"/></feComponentTransfer>
  </filter>
  <linearGradient id="gLow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".6" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".75" stop-color="#fff" stop-opacity=".8"/>
    <stop offset="1" stop-color="#fff" stop-opacity="1"/>
  </linearGradient>
  <mask id="mLow" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
    <rect width="1920" height="1080" fill="url(#gLow)"/>
  </mask>
  <linearGradient id="gHigh" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".9"/>
    <stop offset=".5" stop-color="#fff" stop-opacity=".2"/>
    <stop offset=".62" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <mask id="mHigh" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
    <rect width="1920" height="1080" fill="url(#gHigh)"/>
  </mask>
  <radialGradient id="gVig" cx=".5" cy=".55" r=".78">
    <stop offset=".5" stop-color="#050507" stop-opacity="0"/>
    <stop offset="1" stop-color="#050507" stop-opacity=".88"/>
  </radialGradient>
""")
DEFS.append(turb("fHaze", "0.0016 0.0034", 5, 8, "0 0 0 0 0.20  0 0 0 0 0.045  0 0 0 0 0.09  2.4 0 0 0 -1.05"))
DEFS.append(turb("fMist", "0.0021 0.012", 6, 13, "0 0 0 0 0.36  0 0 0 0 0.075  0 0 0 0 0.12  2.6 0 0 0 -1.15"))
DEFS.append(turb("fMistDark", "0.0028 0.014", 5, 21, "0 0 0 0 0.025  0 0 0 0 0.018  0 0 0 0 0.026  2.8 0 0 0 -1.1"))
DEFS.append(turb("fVeil", "0.02 0.006", 4, 61, "0 0 0 0 0.95  0 0 0 0 0.36  0 0 0 0 0.38  3.4 0 0 0 -1.75"))

body = []
B = body.append

# 1. Ciel, brume haute, étoiles rares, lumière du portail
B('<rect width="1920" height="1080" fill="url(#gSky)"/>')
B('<g mask="url(#mHigh)"><rect width="1920" height="1080" filter="url(#fHaze)"/></g>')
for _ in range(220):
    x, y = rnd.uniform(0, W), rnd.uniform(0, 420)
    B(f'<circle cx="{f(x)}" cy="{f(y)}" r="{rnd.choice([.4,.5,.6,.8])}" fill="{IVORY}" opacity="{f(rnd.uniform(.12,.5))}"/>')
B('<rect width="1920" height="1080" fill="url(#gLight)"/>')

# 2. Rayons depuis le portail (les arches les occulteront)
DX, DY = VX, VY + 30
B('<g filter="url(#fBlur10)" style="mix-blend-mode:screen">')
for ang, spread, op in ((-62, 5, .10), (-38, 4, .12), (-18, 3, .1), (18, 3, .1), (38, 4, .12), (62, 5, .10),
                        (-80, 6, .07), (80, 6, .07)):
    a0, a1 = math.radians(-90 + ang - spread), math.radians(-90 + ang + spread)
    L = 1300
    pts = [(DX, DY), (DX + L * math.cos(a0), DY + L * math.sin(a0)), (DX + L * math.cos(a1), DY + L * math.sin(a1))]
    B(f'<path d="{poly(pts)}" fill="#a3203a" opacity="{op}"/>')
B('</g>')

# 3. Façade lointaine et portail
SP = S_DOOR
fac = "#1b0910"
facade = [[P(-3.6, 0, SP), P(3.6, 0, SP), P(3.6, 3.7, SP), P(-3.6, 3.7, SP)]]
for s in (-1, 1):
    lo, hi = sorted((s * 2.0, s * 3.6))
    m = (lo + hi) / 2
    facade.append([P(lo, 3.6, SP), P(hi, 3.6, SP), P(hi, 5.6, SP), P(lo, 5.6, SP)])
    facade.append([P(lo + .12, 5.6, SP), P(hi - .12, 5.6, SP), P(m, 8.2, SP)])
facade.append([P(-1.5, 3.6, SP), P(1.5, 3.6, SP), P(0, 5.9, SP)])
B(f'<g fill="{fac}">' + "".join(f'<path d="{poly(p)}"/>' for p in facade) + '</g>')
# halo de la porte
B(f'<ellipse cx="{VX}" cy="{f(VY-10)}" rx="190" ry="210" fill="#8a1628" opacity=".45" filter="url(#fBlur60)"/>')
PU, PHS = 1.15, 1.45
door = [P(x, y, SP) for x, y in intrados(PU, PHS)]
DEFS.append(f'<clipPath id="cDoor"><path d="{poly(door)}"/></clipPath>')
B(f'<path d="{poly(door)}" fill="url(#gDoor)"/>')
B('<g clip-path="url(#cDoor)">')
B('<rect width="1920" height="1080" filter="url(#fVeil)" opacity=".45"/>')
fy_d = P(0, 0, SP)[1]
B(f'<ellipse cx="{VX}" cy="{f(fy_d)}" rx="70" ry="90" fill="#e0485a" opacity=".55" filter="url(#fBlur24)"/>')
# battants entrouverts : deux vantaux sombres vus en fuite
for s in (-1, 1):
    x0 = VX + s * PU * SP
    x1 = VX + s * PU * SP * 0.52
    ytop0, ytop1 = P(0, PHS + 0.35, SP)[1], P(0, PHS + 0.55, SP)[1]
    pts = [(x0, fy_d), (x1, fy_d - 5), (x1, ytop1), (x0, ytop0)]
    B(f'<path d="{poly(pts)}" fill="#14070c"/>')
    B(f'<path d="{poly([(x1, fy_d - 5), (x1, ytop1)], False)}" stroke="#ff8c9a" stroke-width="1.2" opacity=".7" filter="url(#fRim)"/>')
    # filets d'or sur le vantail
    for t in (.3, .7):
        xa = x0 + (x1 - x0) * t
        B(f'<line x1="{f(xa)}" y1="{f(fy_d - 10)}" x2="{f(xa)}" y2="{f(ytop0 + (ytop1-ytop0)*t + 8)}" stroke="{GOLD}" stroke-width=".7" opacity=".35"/>')
B('</g>')
B(f'<path d="{poly(door, False)}" fill="none" stroke="#e0485a" stroke-width="1.4" opacity=".75" filter="url(#fRim)"/>')
B(f'<path d="{poly([P(x, y, SP) for x, y in intrados(PU, PHS, .2)], False)}" fill="none" stroke="{GOLD}" stroke-width="1" opacity=".5"/>')
B(f'<path d="{poly([P(x, y, SP) for x, y in intrados(PU, PHS, .32)], False)}" fill="none" stroke="{GOLD}" stroke-width=".6" opacity=".3"/>')
ax, ay = P(0, PHS + math.sqrt((2 * PU + .32) ** 2 - PU * PU) + .4, SP)
B(f'<circle cx="{f(ax)}" cy="{f(ay)}" r="26" fill="url(#gGlowGold)"/>')
B(f'<g filter="url(#fGlow)">{star4(ax, ay, 13, op=.9)}</g>')

# 4. Sol : dalles, reflet du portail
fy0 = fy_d
B(f'<rect x="0" y="{f(fy0)}" width="1920" height="{f(H-fy0)}" fill="#070609" opacity=".8"/>')
B(f'<path d="{poly([(VX-PU*SP, fy0), (VX+PU*SP, fy0), (VX+330, H), (VX-330, H)])}" fill="#7d1428" opacity=".2" filter="url(#fBlur24)"/>')
B(f'<path d="{poly([(VX-30, fy0), (VX+30, fy0), (VX+110, H), (VX-110, H)])}" fill="#c42639" opacity=".18" filter="url(#fBlur10)"/>')
B(f'<ellipse cx="{VX}" cy="{f(fy0+4)}" rx="200" ry="14" fill="#c42639" opacity=".55" filter="url(#fBlur10)"/>')
B('<g stroke="#2e0a15" stroke-width="1" opacity=".7">')
for k in range(-16, 17):
    xb = VX + k * 230
    xt = VX + k * 230 * (fy0 - VY) / (H + 600 - VY)
    B(f'<line x1="{f(xt)}" y1="{f(fy0)}" x2="{f(xb)}" y2="{H+600}"/>')
B('</g>')

# 5. Enfilade d'arches, du fond vers l'avant
NEAR, FAR = "#050406", "#2a0c16"
for k in range(len(S_ARCH) - 1, -1, -1):
    S = S_ARCH[k]
    t = k / (len(S_ARCH) - 1)
    base = mix(NEAR, FAR, t ** 1.2)
    lit = mix(base, "#5a1022", .55 - .25 * t)
    floor_y = P(0, 0, S)[1]
    # brume au pied de l'arche (sépare les plans)
    B(f'<ellipse cx="{VX}" cy="{f(floor_y)}" rx="{f(S*2.6)}" ry="{f(S*.22)}" fill="#4a0f20" opacity="{f(.35 + .1*t)}" filter="url(#fBlur24)"/>')
    for side in (-1, 1):
        pts = [P(x, y, S) for x, y in pillar_world(side)]
        xi, xo = P(side * U, 0, S)[0], P(side * (U + PW), 0, S)[0]
        gid = f"gP{k}{'R' if side > 0 else 'L'}"
        DEFS.append(f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{f(xo)}" y1="0" x2="{f(xi)}" y2="0">'
                    f'<stop offset="0" stop-color="{base}"/><stop offset=".72" stop-color="{base}"/>'
                    f'<stop offset="1" stop-color="{lit}"/></linearGradient>')
        B(f'<path d="{poly(pts)}" fill="url(#{gid})"/>')
        band = [P(x, y, S) for x, y in band_world(side)]
        B(f'<path d="{poly(band)}" fill="{base}"/>')
        # cannelures du fût
        for c in (.33, .66):
            xc = side * (U + PW * c)
            p0, p1 = P(xc, .2, S), P(xc, HS - .22, S)
            B(f'<line x1="{f(p0[0])}" y1="{f(p0[1])}" x2="{f(p1[0])}" y2="{f(p1[1])}" stroke="#000" stroke-width="{f(max(.6, S*.004))}" opacity=".35"/>')
    # arête de lumière (intrados + face interne des piliers)
    edge = [P(x, y, S) for x, y in intrados()]
    B(f'<path d="{poly(edge, False)}" fill="none" stroke="#c42639" stroke-width="{f(max(1.1, 2.6 - k*.35))}" opacity="{[.45,.55,.6,.6,.55][k]}" filter="url(#fRim)"/>')
    # filets d'or : archivolte et chapiteaux
    if k <= 3:
        mould = [P(x, y, S) for x, y in half_arc(U, HS, T * .55)]
        line = mould + [(2 * VX - x, y) for x, y in reversed(mould)]
        B(f'<path d="{poly(line, False)}" fill="none" stroke="{GOLD}" stroke-width="{[1.4,1.2,1,.9][k]}" opacity="{[.3,.36,.38,.36][k]}"/>')
        for side in (-1, 1):
            a, b = P(side * (U - .07), HS + .04, S), P(side * (U + PW + .07), HS + .04, S)
            B(f'<line x1="{f(a[0])}" y1="{f(a[1])}" x2="{f(b[0])}" y2="{f(b[1])}" stroke="{GOLD}" stroke-width="{[1.3,1.1,.9,.8][k]}" opacity=".42"/>')
    # clé de voûte
    kx, ky = P(0, HS + math.sqrt((2 * U + T) ** 2 - U * U) + .14, S)
    if 20 < ky < H:
        B(f'<circle cx="{f(kx)}" cy="{f(ky)}" r="{f(.5*S)}" fill="url(#gGlowGold)" opacity=".6"/>')
        B(f'<g filter="url(#fGlow)">{star4(kx, ky, max(5, .17 * S), op=.85)}</g>')
    # finials des pinacles
    for side in (-1, 1):
        fx, fy2 = P(side * (U + PW / 2), HS + 1.1 + .78, S)
        if 0 < fy2 < H:
            r = max(2.5, .035 * S)
            B(f'<path d="M{f(fx)},{f(fy2-2*r)} L{f(fx+r*.7)},{f(fy2)} L{f(fx)},{f(fy2+2*r)} L{f(fx-r*.7)},{f(fy2)}Z" fill="{GOLD}" opacity=".6"/>')

# 6. Bannières sur les piliers de la deuxième arche (famille de la salle du trône)
S = S_ARCH[1]
for side in (-1, 1):
    xc = P(side * (U + PW / 2), 0, S)[0]
    bw = PW * S * .74
    y0, y1 = P(0, HS - .25, S)[1], P(0, .55, S)[1]
    x0, x1 = xc - bw / 2, xc + bw / 2
    pts = [(x0, y0), (x1, y0), (x1, y1), (xc, y1 + bw * .45), (x0, y1)]
    B(f'<path d="{poly(pts)}" fill="url(#gBanner)"/>')
    # ombre portée de la lumière (côté interne éclairé)
    gid = f"gBan{'R' if side > 0 else 'L'}"
    xa, xb = (x0, x1) if side < 0 else (x1, x0)
    DEFS.append(f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{f(xa)}" y1="0" x2="{f(xb)}" y2="0">'
                f'<stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".7" stop-color="#000" stop-opacity=".1"/>'
                f'<stop offset="1" stop-color="#c42639" stop-opacity=".18"/></linearGradient>')
    B(f'<path d="{poly(pts)}" fill="url(#{gid})"/>')
    ins = 7
    pin = [(x0 + ins, y0 + 10), (x1 - ins, y0 + 10), (x1 - ins, y1 - 4), (xc, y1 + bw * .45 - 12), (x0 + ins, y1 - 4)]
    B(f'<path d="{poly(pin)}" fill="none" stroke="{GOLD}" stroke-width="1" opacity=".5"/>')
    B(f'<line x1="{f(x0-6)}" y1="{f(y0)}" x2="{f(x1+6)}" y2="{f(y0)}" stroke="{GOLD}" stroke-width="2" opacity=".55"/>')
    sy = y0 + (y1 - y0) * .38
    B(f'<circle cx="{f(xc)}" cy="{f(sy)}" r="{f(bw*.5)}" fill="url(#gGlowGold)" opacity=".5"/>')
    B(f'<g filter="url(#fGlow)">{star4(xc, sy, bw * .36, ratio=.55, op=.85)}{star4(xc, sy, bw * .16, rot=45, ratio=1, op=.6)}</g>')
    B(f'<circle cx="{f(xc)}" cy="{f(sy)}" r="{f(bw*.24)}" fill="none" stroke="{GOLD}" stroke-width=".8" opacity=".45"/>')

# 7. Cristaux flottants
def crystal(cx, cy, h, tilt=0, op=1.0):
    w = h * .28
    top, bot = (cx, cy - h * .58), (cx, cy + h * .42)
    lm, rm, mm = (cx - w, cy - h * .12), (cx + w, cy - h * .08), (cx + w * .18, cy - h * .03)
    s = [f'<g transform="rotate({tilt} {f(cx)} {f(cy)})" opacity="{op}">']
    s.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(h*1.5)}" fill="url(#gGlowRed)"/>')
    s.append(f'<path d="{poly([top, lm, mm])}" fill="url(#gCrysA)"/>')
    s.append(f'<path d="{poly([top, mm, rm])}" fill="#7d1428"/>')
    s.append(f'<path d="{poly([lm, bot, mm])}" fill="url(#gCrysB)"/>')
    s.append(f'<path d="{poly([mm, bot, rm])}" fill="#3a0b18"/>')
    s.append(f'<path d="{poly([top, mm, bot], False)}" fill="none" stroke="#f3a3ad" stroke-width=".8" opacity=".6"/>')
    s.append(f'<path d="{poly([lm, top, rm], False)}" fill="none" stroke="{GOLD2}" stroke-width=".7" opacity=".45"/>')
    s.append(f'<path d="M{f(top[0])},{f(top[1]-h*.2)} L{f(top[0])},{f(top[1]+h*.1)}" stroke="{IVORY}" stroke-width=".8" opacity=".5"/>')
    s.append('</g>')
    return "\n".join(s)

B('<g filter="url(#fGlow)">')
B(crystal(222, 330, 66, -9))
B(crystal(1700, 270, 50, 11))
B(crystal(205, 760, 30, 16, .75))
B(crystal(1726, 700, 38, -12, .8))
B(crystal(505, 470, 18, 6, .65))
B(crystal(1420, 520, 14, -6, .6))
B('</g>')

# 8. Brume basse au premier plan, vignette, grain
B('<g mask="url(#mLow)"><rect width="1920" height="1080" filter="url(#fMist)" opacity=".75"/></g>')
B('<g mask="url(#mLow)"><rect width="1920" height="1080" filter="url(#fMistDark)"/></g>')
B('<rect width="1920" height="1080" fill="url(#gVig)"/>')
B('<rect width="1920" height="1080" filter="url(#fGrain)" style="mix-blend-mode:overlay"/>')

A('<defs>' + "\n".join(DEFS) + '</defs>')
out.extend(body)
A('</svg>')
open(sys.argv[1], "w").write("\n".join(out))
print(sys.argv[1], sum(len(x) for x in out) // 1024, "Ko")
