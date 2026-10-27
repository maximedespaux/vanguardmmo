"""Fond sup4 — LES PORTES.  python3 gen_sup4.py sortie.svg"""
import math, random, sys

W, H = 1920, 1080
rnd = random.Random(4)
out = []
A = out.append
GOLD, GOLD2, IVORY = "#C69A55", "#E6C48A", "#F2EDE5"
VX, VY = 960, 600          # point de fuite
CAM = 0.9                  # hauteur de l'oeil (unités monde)
U, PW, HS, T = 1.0, 0.30, 1.5, 0.24   # demi-ouverture, pilier, naissance de l'arc, épaisseur d'archivolte


def f(x):
    return ("%.2f" % x).rstrip("0").rstrip(".")


def P(x, y, S):
    return (VX + x * S, VY + (CAM - y) * S)


def poly(pts, close=True):
    d = "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts)
    return d + ("Z" if close else "")


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


def intrados(u=U, hs=HS):
    """Contour de l'ouverture (monde, y vers le haut) : pied gauche -> sommet -> pied droit."""
    R = 2 * u
    apex_a = math.degrees(math.acos((u - 0) / R))   # angle du sommet vu du centre (+u, hs)
    left = arc_pts(u, hs, R, 180, 180 - (180 - 120), 30)     # de (-u,hs) au sommet (angle 120)
    right = [(-x, y) for x, y in reversed(left)]
    return [(-u, 0)] + left + right[1:] + [(u, 0)]


def arch_world(u=U, pw=PW, hs=HS, t=T):
    """Silhouette d'une arche (liste de polygones, monde)."""
    R = 2 * u
    polys = []
    # archivolte : bande entre intrados et extrados (moitié gauche puis miroir)
    ap_in = math.degrees(math.atan2(math.sqrt(R * R - u * u), -u))   # = 120
    ap_out = math.degrees(math.atan2(math.sqrt((R + t) ** 2 - u * u), -u))
    inner = arc_pts(u, hs, R, 180, ap_in, 30)
    outer = arc_pts(u, hs, R + t, 180, ap_out, 30)
    band_l = outer + list(reversed(inner))
    polys.append(band_l)
    polys.append([(-x, y) for x, y in band_l])
    for s in (-1, 1):
        x0, x1 = s * u, s * (u + pw)
        lo, hi = min(x0, x1), max(x0, x1)
        polys.append([(lo, 0), (hi, 0), (hi, hs + 0.05), (lo, hs + 0.05)])                    # fût
        polys.append([(lo - .06, 0), (hi + .06, 0), (hi + .06, .14), (lo - .06, .14)])       # base
        polys.append([(lo - .05, hs - .1), (hi + .05, hs - .1), (hi + .05, hs + .02), (lo - .05, hs + .02)])  # chapiteau
        # contrefort au-dessus du pilier, puis pinacle
        top = hs + 1.05 * u
        polys.append([(lo, hs), (hi, hs), (hi, top), (lo, top)])
        mid = (lo + hi) / 2
        polys.append([(lo - .03, top), (hi + .03, top), (hi + .03, top + .08), (lo - .03, top + .08)])
        polys.append([(lo + .02, top + .08), (hi - .02, top + .08), (mid, top + .62)])
    return polys


def proj_polys(polys, S):
    return [[P(x, y, S) for x, y in p] for p in polys]


A(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
A('<defs>')
A(f"""
  <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#07070b"/>
    <stop offset=".42" stop-color="#0d080d"/>
    <stop offset=".56" stop-color="#1c0a12"/>
    <stop offset=".62" stop-color="#140810"/>
    <stop offset="1" stop-color="#08070a"/>
  </linearGradient>
  <radialGradient id="gPortalLight" cx="{VX}" cy="{VY-20}" r="760" gradientUnits="userSpaceOnUse" gradientTransform="translate({VX} {VY-20}) scale(1 .62) translate({-VX} {-(VY-20)})">
    <stop offset="0" stop-color="#A6192E" stop-opacity=".95"/>
    <stop offset=".12" stop-color="#7d1428" stop-opacity=".7"/>
    <stop offset=".35" stop-color="#4a0f20" stop-opacity=".4"/>
    <stop offset=".7" stop-color="#26091a" stop-opacity=".15"/>
    <stop offset="1" stop-color="#26091a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gCore" cx="{VX}" cy="{VY-40}" r="120" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#e2475a" stop-opacity=".9"/>
    <stop offset=".45" stop-color="#A6192E" stop-opacity=".6"/>
    <stop offset="1" stop-color="#A6192E" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="gPortalIn" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5a1022"/>
    <stop offset=".6" stop-color="#9c1a2e"/>
    <stop offset="1" stop-color="#d23a4c"/>
  </linearGradient>
  <radialGradient id="gStar">
    <stop offset="0" stop-color="#F2EDE5"/>
    <stop offset=".3" stop-color="#E6C48A"/>
    <stop offset="1" stop-color="#C69A55"/>
  </radialGradient>
  <radialGradient id="gGlowRed">
    <stop offset="0" stop-color="#c42639" stop-opacity=".6"/>
    <stop offset=".4" stop-color="#7d1428" stop-opacity=".22"/>
    <stop offset="1" stop-color="#60152D" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="gCrysL" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#7a1426"/><stop offset="1" stop-color="#3a0a18"/>
  </linearGradient>
  <linearGradient id="gCrysR" x1="1" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e05264"/><stop offset=".5" stop-color="#A6192E"/><stop offset="1" stop-color="#60152D"/>
  </linearGradient>
  <filter id="fGlow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="2" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="fRim" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur stdDeviation="1.6"/>
  </filter>
  <filter id="fBlur50" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="50"/></filter>
  <filter id="fBlur18" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="fBlur6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="fGrain" x="0" y="0" width="1920" height="1080" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope="0" intercept=".16"/></feComponentTransfer>
  </filter>
  <linearGradient id="gLow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".5" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".68" stop-color="#fff" stop-opacity=".9"/>
    <stop offset="1" stop-color="#fff" stop-opacity="1"/>
  </linearGradient>
  <mask id="mLow" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
    <rect width="1920" height="1080" fill="url(#gLow)"/>
  </mask>
  <linearGradient id="gHigh" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".8"/>
    <stop offset=".45" stop-color="#fff" stop-opacity=".25"/>
    <stop offset=".6" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <mask id="mHigh" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
    <rect width="1920" height="1080" fill="url(#gHigh)"/>
  </mask>
  <radialGradient id="gVig" cx=".5" cy=".55" r=".78">
    <stop offset=".5" stop-color="#050507" stop-opacity="0"/>
    <stop offset="1" stop-color="#050507" stop-opacity=".9"/>
  </radialGradient>
""")
A(turb("fFog", "0.0024 0.011", 6, 13, "0 0 0 0 0.36  0 0 0 0 0.07  0 0 0 0 0.12  2.6 0 0 0 -1.05"))
A(turb("fFogDark", "0.003 0.013", 5, 21, "0 0 0 0 0.03  0 0 0 0 0.02  0 0 0 0 0.03  2.6 0 0 0 -1.0"))
A(turb("fHaze", "0.0016 0.0034", 5, 8, "0 0 0 0 0.24  0 0 0 0 0.05  0 0 0 0 0.10  2.2 0 0 0 -0.95"))
A(turb("fSwirl", "0.012 0.02", 4, 61, "0 0 0 0 0.95  0 0 0 0 0.42  0 0 0 0 0.42  4 0 0 0 -2.2"))
A('</defs>')

# 1. Ciel et lumière du portail
A('<rect width="1920" height="1080" fill="url(#gSky)"/>')
A('<g mask="url(#mHigh)"><rect width="1920" height="1080" filter="url(#fHaze)"/></g>')
for _ in range(260):
    x, y = rnd.uniform(0, W), rnd.uniform(0, 380)
    A(f'<circle cx="{f(x)}" cy="{f(y)}" r="{rnd.choice([.4,.5,.6,.8])}" fill="{IVORY}" opacity="{f(rnd.uniform(.15,.55))}"/>')
A('<rect width="1920" height="1080" fill="url(#gPortalLight)"/>')

# 2. Façade lointaine avec le portail
SP = 78
fac = "#1d0a12"
def fw(x, y):
    return P(x, y, SP)
facade = []
facade.append([fw(-3.4, 0), fw(3.4, 0), fw(3.4, 3.6), fw(-3.4, 3.6)])
for s in (-1, 1):
    a, b = s * 2.0, s * 3.4
    lo, hi = min(a, b), max(a, b)
    m = (lo + hi) / 2
    facade.append([fw(lo, 3.5), fw(hi, 3.5), fw(hi, 5.4), fw(lo, 5.4)])
    facade.append([fw(lo + .1, 5.4), fw(hi - .1, 5.4), fw(m, 7.6)])
    facade.append([fw(lo + .15, 5.2), fw(lo + .3, 5.2), fw(lo + .225, 6.2)])
    facade.append([fw(hi - .3, 5.2), fw(hi - .15, 5.2), fw(hi - .225, 6.2)])
facade.append([fw(-1.2, 3.5), fw(1.2, 3.5), fw(0, 5.6)])          # pignon central
A(f'<g fill="{fac}">' + "".join(f'<path d="{poly(p)}"/>' for p in facade) + '</g>')
# ouverture du portail
PU, PHS = 1.0, 1.55
door = [P(x * PU, y, SP) for x, y in intrados(PU, PHS)]
A(f'<path d="{poly(door)}" fill="url(#gPortalIn)"/>')
A(f'<g clip-path="url(#cDoor)"><rect width="1920" height="1080" filter="url(#fSwirl)" opacity=".55"/></g>')
A(f'<defs><clipPath id="cDoor"><path d="{poly(door)}"/></clipPath></defs>')
A(f'<path d="{poly(door, False)}" fill="none" stroke="#f0798a" stroke-width="1.6" opacity=".8" filter="url(#fRim)"/>')
A(f'<path d="{poly([P(x*(PU+.18), y, SP) for x, y in intrados(PU+.18, PHS)], False)}" fill="none" stroke="{GOLD}" stroke-width="1" opacity=".55"/>')
ax, ay = P(0, PHS + math.sqrt(3) * PU + .55, SP)
A(f'<g filter="url(#fGlow)">{star4(ax, ay, 11, op=.85)}</g>')
A('<ellipse cx="960" cy="560" rx="150" ry="110" fill="url(#gCore)"/>')

# 3. Sol : dalles en perspective, reflet du portail
fy = P(0, 0, SP)[1]
A(f'<rect x="0" y="{f(fy)}" width="1920" height="{f(H-fy)}" fill="#09070a" opacity=".86"/>')
A(f'<ellipse cx="960" cy="{f(fy+6)}" rx="260" ry="26" fill="#A6192E" opacity=".55" filter="url(#fBlur18)"/>')
A(f'<path d="M{f(VX-70)},{f(fy)} L{f(VX+70)},{f(fy)} L{f(VX+260)},1080 L{f(VX-260)},1080Z" fill="#7d1428" opacity=".22" filter="url(#fBlur18)"/>')
A('<g stroke="#3a0d18" stroke-width="1" opacity=".55">')
for k in range(-14, 15):
    x2 = VX + k * 210
    A(f'<line x1="{f(VX + k * 210 * (fy - VY) / (H + 400 - VY))}" y1="{f(fy)}" x2="{f(x2)}" y2="{H+400}"/>')
A('</g>')

# 4. Enfilade d'arches (du plus lointain au plus proche)
S0, Q = 800, 0.655
fills = ["#040305", "#070509", "#0b070b", "#11080e", "#180a11", "#200b14", "#290d17"]
for k in range(6, -1, -1):
    S = S0 * Q ** k
    polys = proj_polys(arch_world(), S)
    A(f'<g fill="{fills[k]}">' + "".join(f'<path d="{poly(p)}"/>' for p in polys) + '</g>')
    # arête de lumière sur l'intrados (le portail éclaire l'intérieur)
    edge = [P(x, y, S) for x, y in intrados()]
    rim_op = [.28, .4, .5, .55, .55, .5, .45][k]
    A(f'<path d="{poly(edge, False)}" fill="none" stroke="#c42639" stroke-width="{f(max(1, 2.2 - k*0.2))}" opacity="{rim_op}" filter="url(#fRim)"/>')
    if k <= 3:
        # filet d'or sur l'archivolte
        mould = [P(x * (U + T * .5), y, S) if False else None for x, y in []]
        R = 2 * U + T * 0.5
        apx = math.degrees(math.atan2(math.sqrt(R * R - U * U), -U))
        half = arc_pts(U, HS, R, 180, apx, 30)
        line = [P(x, y, S) for x, y in half] + [P(-x, y, S) for x, y in reversed(half)]
        A(f'<path d="{poly(line, False)}" fill="none" stroke="{GOLD}" stroke-width="{[1.4,1.2,1,0.9][k]}" opacity="{[.28,.34,.36,.36][k]}"/>')
        for s in (-1, 1):
            xm = s * (U + PW / 2)
            p0, p1 = P(xm, 0.2, S), P(xm, HS - 0.15, S)
            A(f'<line x1="{f(p0[0])}" y1="{f(p0[1])}" x2="{f(p1[0])}" y2="{f(p1[1])}" stroke="{GOLD}" stroke-width=".9" opacity=".18"/>')
    # clé de voûte : petite étoile
    kx, ky = P(0, HS + math.sqrt((2 * U + T) ** 2 - U * U) + 0.12, S)
    if -20 < ky < H:
        A(f'<g filter="url(#fGlow)">{star4(kx, ky, max(4, 0.16 * S), op=.75)}</g>')
    # finials des pinacles
    for s in (-1, 1):
        fx, fy2 = P(s * (U + PW / 2), HS + 1.05 + 0.62, S)
        if 0 < fy2 < H:
            A(f'<path d="M{f(fx)},{f(fy2-0.05*S)} L{f(fx+0.025*S)},{f(fy2)} L{f(fx)},{f(fy2+0.05*S)} L{f(fx-0.025*S)},{f(fy2)}Z" fill="{GOLD}" opacity=".55"/>')
    # brume entre les plans
    A(f'<g mask="url(#mLow)" opacity="{[.0,.35,.35,.4,.45,.45,.5][k]}"><rect width="1920" height="1080" filter="url(#fFog)" transform="translate({k*37} {-k*6})"/></g>')

# 5. Cristaux flottants
def crystal(cx, cy, h, tilt=0, op=1):
    w = h * 0.3
    top, bot = (cx, cy - h * .55), (cx, cy + h * .45)
    lm, rm, mm = (cx - w, cy - h * .1), (cx + w, cy - h * .06), (cx + w * .15, cy - h * .02)
    s = [f'<g transform="rotate({tilt} {f(cx)} {f(cy)})" opacity="{op}">']
    s.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(h*1.4)}" fill="url(#gGlowRed)"/>')
    s.append(f'<path d="{poly([top, lm, mm])}" fill="#8a1a2c"/>')
    s.append(f'<path d="{poly([top, mm, rm])}" fill="url(#gCrysR)"/>')
    s.append(f'<path d="{poly([lm, bot, mm])}" fill="url(#gCrysL)"/>')
    s.append(f'<path d="{poly([mm, bot, rm])}" fill="#6e1426"/>')
    s.append(f'<path d="{poly([top, mm, bot], False)}" fill="none" stroke="#f0a0aa" stroke-width=".8" opacity=".55"/>')
    s.append(f'<path d="{poly([top, rm], False)}" fill="none" stroke="{GOLD2}" stroke-width=".7" opacity=".5"/>')
    s.append('</g>')
    return "\n".join(s)

A('<g filter="url(#fGlow)">')
A(crystal(232, 470, 74, -8))
A(crystal(1712, 400, 58, 10))
A(crystal(118, 300, 30, 14, .8))
A(crystal(1820, 650, 34, -12, .8))
A(crystal(745, 370, 20, 6, .7))
A(crystal(1192, 430, 16, -6, .65))
A('</g>')

# 6. Brume basse devant, bancs sombres, vignette, grain
A('<g mask="url(#mLow)"><rect width="1920" height="1080" filter="url(#fFog)" opacity=".8"/></g>')
A('<g mask="url(#mLow)"><rect width="1920" height="1080" filter="url(#fFogDark)"/></g>')
A('<rect width="1920" height="1080" fill="url(#gVig)"/>')
A('<rect width="1920" height="1080" filter="url(#fGrain)" style="mix-blend-mode:overlay"/>')
A('</svg>')

open(sys.argv[1], "w").write("\n".join(out))
print(sys.argv[1], sum(len(x) for x in out) // 1024, "Ko")
