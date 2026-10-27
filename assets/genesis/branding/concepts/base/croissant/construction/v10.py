"""v10 — la barre redevient horizontale : fil bas à peine bombé (le sabre de v9 la
transformait en aile), on garde la hauteur 72 et la dague élargie de v9."""
import sys, math
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from cgeo import *
import cbuild2
from cbuild2 import build

VER = sys.argv[1] if len(sys.argv) > 1 else "v10"
PRM = dict(BARBK=46, BARQ=(644, -8), DAGQ=(8, 796), DX=16, DY=-12, R1=324, W=(160, 522), TIP=(810, 220), BARB=(704, 372), CUT=(738, 296),
           CHW=42, CHT=80, GAP=10, YT=492, YB=564, LT=512, RT=852, DT=888, XSL=678, XSR=778,
           TH_A=70, CTLK=112, XI=648, ELL=((554, 512), 220, 262, -8))
if len(sys.argv) > 2:
    PRM.update(eval(sys.argv[2]))

def make(p):
    DX, DY = p["DX"], p["DY"]
    S = lambda x, y: (x + DX, y + DY)
    O1 = S(500, 512); R1 = p["R1"]
    (ex, ey), RX, RY, ROT = p["ELL"]; O2 = S(ex, ey)
    W = S(*p["W"])
    d = math.dist(W, O1)
    beta = math.degrees(math.acos(R1 / d))
    aw = angle_of(O1, W)
    TU, TL = circ(O1, R1, aw - beta), circ(O1, R1, aw + beta)
    if TU[1] > TL[1]: TU, TL = TL, TU
    TH_A = p["TH_A"]
    A0 = circ(O1, R1, TH_A)
    tA = (math.sin(math.radians(TH_A)), math.cos(math.radians(TH_A)))
    TIP = S(*p["TIP"])
    CTL = add(A0, tA, p["CTLK"])
    tI, I0 = ell_x(O2, RX, RY, ROT, p["XI"] + DX, lower=False)
    tg = ell_tan(O2, RX, RY, ROT, tI)
    if tg[1] < 0: tg = (-tg[0], -tg[1])          # vers le bas, comme le contour qui descend vers le bec
    BQ = add(I0, tg, p["BARBK"])
    BARB, CUT = S(*p["BARB"]), S(*p["CUT"])

    XSL, XSR = p["XSL"] + DX, p["XSR"] + DX
    XC = (XSL + XSR) / 2
    YT, YB = p["YT"] + DY, p["YB"] + DY
    CC = (XC, (p["YT"] + p["YB"]) / 2 + DY - 1); CHW, CHT = p["CHW"], p["CHT"]
    cristal = poly(diamond(CC, CHW, CHT, CHT))
    hw_g = CHW + p["GAP"] / math.sin(math.atan2(CHT, CHW))
    cut = diamond(CC, hw_g, CHT * hw_g / CHW, CHT * hw_g / CHW)
    def edge_x(side, y):
        top, bot = cut[0], cut[2]
        mid = cut[3] if side < 0 else cut[1]
        seg = (top, mid) if y <= mid[1] else (mid, bot)
        t = (y - seg[0][1]) / (seg[1][1] - seg[0][1])
        return lerp(seg[0], seg[1], t)
    LT, RT = (p["LT"] + DX, YT), (p["RT"] + DX, YT)
    BQL = (p["BARQ"][0] + DX, YB + p["BARQ"][1])
    bl = f"M {P(LT)} L {P(edge_x(-1, YT))} L {P(cut[3])} L {P(edge_x(-1, YB))} L {P((XSL, YB))} Q {P(BQL)} {P(LT)} Z"
    br = poly([edge_x(1, YT), RT, (XSR, YB), edge_x(1, YB), cut[1]])

    DT = (XC, p["DT"] + DY)
    SL0, SR0 = (XSL, YB), (XSR, YB)
    QL, QR = (XSL + p["DAGQ"][0], p["DAGQ"][1] + DY), (XSR - p["DAGQ"][0], p["DAGQ"][1] + DY)
    ep = (f"M {P(cut[2])} L {P(edge_x(1, YB))} L {P(SR0)} Q {P(QR)} {P(DT)} Q {P(QL)} {P(SL0)} "
          f"L {P(edge_x(-1, YB))} Z")
    def quad(a, c, b, t):
        return ((1-t)**2*a[0] + 2*(1-t)*t*c[0] + t*t*b[0], (1-t)**2*a[1] + 2*(1-t)*t*c[1] + t*t*b[1])
    q = next(quad(SR0, QR, DT, i / 4000) for i in range(4001) if math.dist(quad(SR0, QR, DT, i / 4000), O1) > R1)
    B_OUT = circ(O1, R1, angle_of(O1, q) - 2.5)
    _, B_IN = ell_x(O2, RX, RY, ROT, XSL + 10, lower=True)
    outer_cmds = (f"Q {P(CTL)} {P(A0)} A {R1} {R1} 0 0 0 {P(TU)} L {P(W)} L {P(TL)} "
                  f"A {R1} {R1} 0 0 0 {P(B_OUT)}")
    corps = (f"M {P(TIP)} {outer_cmds} L {P(B_IN)} "
             f"A {RX} {RY} {ROT} 1 1 {P(I0)} Q {P(BQ)} {P(BARB)} Q {P(CUT)} {P(TIP)} Z")

    # --- faces (aperçu métal)
    def outer_hit(c, deg):
        v = (math.cos(math.radians(deg)), -math.sin(math.radians(deg)))
        hits = seg_circle(c, add(c, v, 900), O1, R1)
        best = max((math.dist(c, h) for h in hits), default=0)
        for a, b in ((TU, W), (W, TL)):
            x = line_line(c, v, a, (b[0] - a[0], b[1] - a[1]))
            if min(a[0], b[0]) - .5 <= x[0] <= max(a[0], b[0]) + .5 and min(a[1], b[1]) - .5 <= x[1] <= max(a[1], b[1]) + .5:
                if (x[0] - c[0]) * v[0] + (x[1] - c[1]) * v[1] > 0:
                    best = max(best, math.dist(c, x))
        return add(c, v, best)
    def inner_hit(c, deg):
        v = (math.cos(math.radians(deg)), -math.sin(math.radians(deg)))
        lo, hi = 0, 600
        for _ in range(50):
            m = (lo + hi) / 2
            if ell_inside(O2, RX, RY, ROT, add(c, v, m)) < 1: lo = m
            else: hi = m
        return add(c, v, lo)
    a0 = angle_of(O2, I0) + 2
    a1 = 360 + angle_of(O2, B_IN) - 4
    aw2 = angle_of(O2, W) % 360
    N = 96
    degs = [a0 + (a1 - a0) * i / N for i in range(N + 1)]
    iw = min(range(len(degs)), key=lambda i: abs(degs[i] - aw2))
    ridge = [lerp(inner_hit(O2, g), outer_hit(O2, g), 0.52) for g in degs]
    wr = ridge[iw]
    ridge_d = "M " + P(TIP) + " " + " ".join("L " + P(x) for x in ridge)
    face_top = (f"M {P(TIP)} Q {P(CTL)} {P(A0)} A {R1} {R1} 0 0 0 {P(TU)} L {P(W)} L {P(wr)} "
                + " ".join("L " + P(x) for x in reversed(ridge[:iw])) + " Z")
    face_bot = (f"M {P(W)} L {P(TL)} A {R1} {R1} 0 0 0 {P(B_OUT)} "
                + " ".join("L " + P(x) for x in reversed(ridge[iw:])) + " Z")
    bar_top = poly([LT, edge_x(-1, YT), cut[3]])
    bar_r_top = poly([edge_x(1, YT), RT, cut[1]])
    ep_left = f"M {P(cut[2])} L {P(edge_x(-1, YB))} L {P(SL0)} Q {P(QL)} {P(DT)} Z"
    def facets(c, hw, ht):
        T, Rr, Bt, Lf = diamond(c, hw, ht, ht)
        tT, tR, tB, tL = diamond(c, hw * .4, ht * .4, ht * .4)
        return [(poly([T, tT, tL, Lf]), "#C93447"), (poly([T, Rr, tR, tT]), "#A6192E"),
                (poly([Rr, Bt, tB, tR]), "#4A1023"), (poly([Bt, Lf, tL, tB]), "#7A1830"),
                (poly([tT, tR, tB, tL]), "#B32236"), (poly([tT, tL, c]), "#EE8790")]
    comps = [
        dict(id="g-corps", paths=[corps], kind="or",
             faces=[(face_top, "url(#or-ext)"), (face_bot, "url(#or-ext2)")],
             aretes=[ridge_d, f"M {P(W)} L {P(wr)}"]),
        dict(id="g-eperon", paths=[ep], kind="or", faces=[(ep_left, "url(#or-clair)")],
             aretes=[f"M {P(cut[2])} L {P(DT)}"]),
        dict(id="g-barre", paths=[bl, br], kind="or",
             faces=[(bar_top, "url(#or-clair)"), (bar_r_top, "url(#or-clair)")],
             aretes=[f"M {P(LT)} L {P(cut[3])}", f"M {P(RT)} L {P(cut[1])}"]),
        dict(id="g-cristal", paths=[cristal], kind="cristal", faces=facets(CC, CHW, CHT), aretes=[]),
    ]
    geo = dict(O1=O1, R1=R1, O2=O2, RX=RX, RY=RY, ROT=ROT, W=W, TU=TU, TL=TL, beta=beta, A0=A0, CTL=CTL,
               TIP=TIP, I0=I0, BQ=BQ, BARB=BARB, CUT=CUT, XSL=XSL, XSR=XSR, YT=YT, YB=YB, LT=LT, RT=RT, CC=CC,
               CHW=CHW, CHT=CHT, cut=cut, DT=DT, QL=QL, QR=QR, B_OUT=B_OUT, B_IN=B_IN, GAP=p["GAP"])
    return comps, geo

cbuild2.DEFS = cbuild2.DEFS.replace('<linearGradient id="or-int"', '''<linearGradient id="or-ext2" gradientUnits="userSpaceOnUse" x1="210" y1="170" x2="800" y2="880">
    <stop offset="0" stop-color="#D9B77C"/>
    <stop offset="0.3" stop-color="#C69A55"/>
    <stop offset="0.6" stop-color="#A47A3E"/>
    <stop offset="0.9" stop-color="#6B4E26"/>
    <stop offset="1" stop-color="#4A3619"/>
  </linearGradient>
  <linearGradient id="or-int"''')

if __name__ == "__main__":
    comps, geo = make(PRM)
    build(VER, comps, VER)
