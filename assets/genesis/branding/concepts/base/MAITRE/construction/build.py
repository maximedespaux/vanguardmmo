"""Construit la géométrie maîtresse du G GENESIS à partir de ses cotes.

    python3 build.py <dossier de sortie> [clé=valeur ...]

Chaque composant est une boucle de primitives (geo.Line / Arc / Quad) ; les jours
d'entrelacs sont CUITS (calculés comme courbes décalées de GAP px), aucun masque.
"""
import math, os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geo import *  # noqa

C = (512.0, 512.0)

PRM = dict(
    Ox=548.0, R=330.0,           # cercle extérieur O (centre (Ox, 512))
    dI=34.0, r=236.0,            # contre-forme I (centre (Ox + dI, 512))
    phi_o=132.0, Rbo=500.0,      # ogive extérieure : tangente à O à ±phi_o, rayon Rbo
    phi_i=128.0, Rbi=400.0,      # ogive intérieure : tangente à I à ±phi_i, rayon Rbi
    Wx=138.0, hb=40.0, alpha=11.0,   # épine : pointe (Wx, 512), base y 512 ± hb, arrivée ±alpha°
    th_h=70.0, kh=0.0,          # corne : départ de O à th_h, contrôle à kh px sur la tangente
    Hr=395.0, Ha=46.0,           # pointe de corne : à Hr de O, angle Ha
    th_T=-1.0, kT=58.0,          # bord intérieur : départ de I à th_T, contrôle à kT px
    dT=8.0, kTr=0.45,            # th_T < 0 : départ automatique = tangente menée de H à I, moins dT°,
                                 #            contrôle à kTr x |T H| sur la tangente
    xj=756.0, yhide=540.0,       # mâchoire : bord intérieur x = xj ; dessus caché y = yhide
    bar_top=476.0, bar_bot=548.0, bar_tip=926.0,
    ca=38.0, cb=68.0,            # cristal : demi-largeur, demi-hauteur (centre C)
    gap=10.0,                    # jour unique de la marque
    we=8.5, wm=20.0, wq=9.0,     # lance : demi-largeur aux bouts haut / au cristal / bas
    lc_top=0.42, lc_bot=0.42,    # lance : hauteur relative du contrôle (bombé)
    l_top=150.0, l_bot=892.0,
    s_cy=140.0, s_top=64.0, s_bot=224.0, s_arm=66.0, s_k=13.0,   # étoile nord
    p_cy=892.0, p_top=858.0, p_bot=958.0, p_arm=46.0, p_k=12.0,  # pointe sud
    ov=6.0,                      # recouvrement caché col / coeur de lance
    barb=0.0, bdx=-55.0, bdy=108.0, bcut=14.0,   # croc sous la corne : B = H + (bdx, bdy),
                                 # coupe concave B -> H creusée de bcut px vers la matière
    top=1.0,                     # croisement haut : 0 lance devant (corps fendu), 1 soudé, 2 G devant
)


def arc_between(c, r, p, q, ccw=None):
    """Arc de c, r allant de p à q ; par défaut le plus court."""
    a0, a1 = ang(c, p), ang(c, q)
    d = a1 - a0
    while d > 180: d -= 360
    while d <= -180: d += 360
    if ccw is True and d < 0: d += 360
    if ccw is False and d > 0: d -= 360
    return Arc(c, r, a0, a0 + d)


def tangent_ccw(theta):
    """Direction de parcours anti-horaire (angle croissant) sur un cercle, à l'écran."""
    t = math.radians(theta)
    return (-math.sin(t), -math.cos(t))


def build(p):
    P = dict(PRM); P.update(p)
    g = P["gap"]
    O = (P["Ox"], 512.0); R = P["R"]
    I = (P["Ox"] + P["dI"], 512.0); r = P["r"]
    K = {}  # points remarquables, pour la doc

    # ---------------- ogives extérieures
    phi_o, Rbo = P["phi_o"], P["Rbo"]
    u = (math.cos(math.radians(phi_o)), -math.sin(math.radians(phi_o)))
    Cbu = sub(O, mul(u, Rbo - R)); Cbl = (Cbu[0], 1024 - Cbu[1])
    apex_o = (Cbu[0] - math.sqrt(Rbo ** 2 - (Cbu[1] - 512) ** 2), 512.0)
    a_su = 180 - math.degrees(math.asin((Cbu[1] - (512 - P["hb"])) / Rbo))
    Su = pol(Cbu, Rbo, a_su); Sl = (Su[0], 1024 - Su[1])
    W = (P["Wx"], 512.0)
    al = math.radians(P["alpha"])
    Ku = line_line(Su, tangent_ccw(a_su), W, (math.cos(al), -math.sin(al)))
    Kl = (Ku[0], 1024 - Ku[1])

    # ---------------- ogives intérieures
    phi_i, Rbi = P["phi_i"], P["Rbi"]
    ui = (math.cos(math.radians(phi_i)), -math.sin(math.radians(phi_i)))
    CIu = sub(I, mul(ui, Rbi - r)); CIl = (CIu[0], 1024 - CIu[1])
    apex_i = (CIu[0] - math.sqrt(Rbi ** 2 - (CIu[1] - 512) ** 2), 512.0)
    a_ia = 180 - math.degrees(math.asin((CIu[1] - 512) / Rbi))   # angle de l'apex sur CIu

    # ---------------- corne
    H = pol(O, P["Hr"], P["Ha"])
    if P["kh"] <= 0:
        # dos de lame droit : tangente menée de la pointe H au cercle O
        P["th_h"] = ang(O, H) + math.degrees(math.acos(R / dist(O, H)))
    th_h = P["th_h"]
    Ah = pol(O, R, th_h)
    th = math.radians(th_h)
    if P["kh"] <= 0:
        back = Line(H, Ah)
    else:
        Kh = add(Ah, mul((math.sin(th), math.cos(th)), P["kh"]))
        back = Quad(H, Kh, Ah)
    if P["th_T"] < 0:
        dHI = dist(H, I)
        th_star = ang(I, H) + math.degrees(math.acos(r / dHI))   # contact de la tangente H -> I
        P["th_T"] = th_star - P["dT"]
        T = pol(I, r, P["th_T"])
        P["kT"] = P["kTr"] * dist(T, H)
        K["th_star"] = th_star
    T = pol(I, r, P["th_T"])
    tT = math.radians(P["th_T"])
    KT = add(T, mul((math.sin(tT), math.cos(tT)), P["kT"]))
    if P["barb"]:
        B = (H[0] + P["bdx"], H[1] + P["bdy"])
        v = sub(H, B)
        CUT = sub(lerp(B, H, 0.5), mul(unit(rnorm(v)), P["bcut"]))
        under = [Quad(T, KT, B), Quad(B, CUT, H)]
        K.update(B=B, CUT=CUT)
    else:
        under = [Quad(T, KT, H)]

    # ---------------- mâchoire
    yh = P["yhide"]
    th_jo = -math.degrees(math.asin((yh - 512) / R))
    Jout = pol(O, R, th_jo)
    Jin = (P["xj"], yh)
    Jlow = (P["xj"], 512 + math.sqrt(r ** 2 - (P["xj"] - I[0]) ** 2))
    th_jl = ang(I, Jlow)

    # ---------------- cristal et son jour (losange homothétique)
    ca, cb = P["ca"], P["cb"]
    hyp = math.hypot(ca, cb)
    ca2, cb2 = ca + g * hyp / cb, cb + g * hyp / ca
    crist = [(512, 512 - cb), (512 + ca, 512), (512, 512 + cb), (512 - ca, 512)]
    jour = [(512, 512 - cb2), (512 + ca2, 512), (512, 512 + cb2), (512 - ca2, 512)]

    # ---------------- lance (fuseau) : bords gauches, les droits sont en miroir
    we, wm, wq = P["we"], P["wm"], P["wq"]
    LT = (512 - we, P["l_top"]); LM = (512 - wm, 512.0); LB = (512 - wq, P["l_bot"])
    KLt = (512 - wm, 512 - (512 - P["l_top"]) * P["lc_top"])
    KLb = (512 - wm, 512 + (P["l_bot"] - 512) * P["lc_bot"])
    eLt = Quad(LT, KLt, LM)     # bord gauche, haut (descend)
    eLb = Quad(LM, KLb, LB)     # bord gauche, bas (descend)
    def mq(q): return Quad(mirror_x(q.p0), mirror_x(q.c), mirror_x(q.p1))
    eRt, eRb = mq(eLt), mq(eLb)

    # ---------------- étoile nord
    sc, st, sb, sa, sk = P["s_cy"], P["s_top"], P["s_bot"], P["s_arm"], P["s_k"]
    star = [Quad((512, st), (512 + sk, sc - sk), (512 + sa, sc)),
            Quad((512 + sa, sc), (512 + sk, sc + sk), (512, sb)),
            Quad((512, sb), (512 - sk, sc + sk), (512 - sa, sc)),
            Quad((512 - sa, sc), (512 - sk, sc - sk), (512, st))]
    # ---------------- pointe sud
    pc, pt_, pb, pa, pk = P["p_cy"], P["p_top"], P["p_bot"], P["p_arm"], P["p_k"]
    point = [Quad((512, pt_), (512 + pk, pc - pk), (512 + pa, pc)),
             Quad((512 + pa, pc), (512 + pk, pc + pk), (512, pb)),
             Quad((512, pb), (512 - pk, pc + pk), (512 - pa, pc)),
             Quad((512 - pa, pc), (512 - pk, pc - pk), (512, pt_))]

    def mseg(s):
        if isinstance(s, Quad): return Quad(mirror_x(s.p0), mirror_x(s.c), mirror_x(s.p1))
        if isinstance(s, Line): return Line(mirror_x(s.p0), mirror_x(s.p1))
        raise TypeError
    # tour du corps, de l'ogive haute extérieure jusqu'à l'ogive haute intérieure
    mid = [Arc(Cbu, Rbo, phi_o, a_su),
           Quad(Su, Ku, W), Quad(W, Kl, Sl),
           Arc(Cbl, Rbo, 360 - a_su, 360 - phi_o),
           Arc(O, R, 360 - phi_o, 360 + th_jo),
           Line(Jout, Jin), Line(Jin, Jlow),
           Arc(I, r, 360 + th_jl, 360 - phi_i),
           Arc(CIl, Rbi, 360 - phi_i, 360 - a_ia),
           Arc(CIu, Rbi, a_ia, phi_i)]
    top = int(P["top"])
    if top == 0:
        # ------------ fente du corps sous la lance (devant) : (étoile ∪ col) ⊕ gap
        Sb = star[2]                       # branche basse-gauche, du bas vers le bras gauche
        Sp = Sb.offset(-g)                 # vers l'extérieur de l'étoile
        if dist(Sp.pt(0.5), (512, sc)) < dist(Sb.pt(0.5), (512, sc)):
            Sp = Sb.offset(g)
        Lp = eLt.offset(g)                 # bord gauche décalé vers la gauche
        if Lp.pt(0.5)[0] > eLt.pt(0.5)[0]:
            Lp = eLt.offset(-g)
        tS, tL, X = one(Sp, Lp)
        circO = Arc(O, R, 60, 120); circI = Arc(I, r, 70, 130)
        sO, _, Yo = one(Sp, circO)
        lI, _, Yi = one(Lp, circI)
        slotL = [Sp.sub(sO, tS), Lp.sub(tL, lI)]
        SpR, LpR = mseg(Sp), mseg(Lp)
        sOR, _, YoR = one(SpR, circO)
        lIR, _, YiR = one(LpR, circI)
        slotR = [SpR.sub(sOR, tS), LpR.sub(tL, lIR)]
        a_oL, a_iL = ang(O, Yo), ang(I, Yi)
        main = [Arc(O, R, a_oL, phi_o)] + mid + [Arc(I, r, phi_i, a_iL)]
        main += [s.rev() for s in reversed(slotL)]
        check_loop(main, name="corps")
        a_oR, a_iR = ang(O, YoR), ang(I, YiR)
        horn = list(slotR) + [Arc(I, r, a_iR, P["th_T"])] + under + [back, Arc(O, R, th_h, a_oR)]
        check_loop(horn, name="corne")
        corps = [main, horn]
    else:
        # corps d'un seul tenant : la lance ne le fend pas
        whole = [back, Arc(O, R, th_h, phi_o)] + mid + [Arc(I, r, phi_i, P["th_T"])] + under
        check_loop(whole, name="corps entier")
        corps = [whole]

    # ---------------- lance : col
    if top == 2:
        # derrière le G : coupé sur O ⊕ gap, au-dessus de l'arche
        cO = Arc(O, R + g, 60, 120)
        l1, _, Zl = one(eLt, cO); l1R, _, ZlR = one(eRt, cO)
        colL, colR = eLt.sub(0, l1), eRt.sub(0, l1R)
        col = [colL, arc_between(O, R + g, Zl, ZlR, ccw=False), colR.rev(), Line(colR.p0, colL.p0)]
        rc = r - g          # le coeur reprend sous l'arche, à I - gap
    else:
        # devant le G : coupé net sur I (le coeur le recouvre de ov)
        l1, _, Zl = one(eLt, Arc(I, r, 70, 130))
        l1R, _, ZlR = one(eRt, Arc(I, r, 70, 130))
        colL = eLt.sub(0, l1)
        colR = eRt.sub(0, l1R)
        col = [colL, arc_between(I, r, Zl, ZlR, ccw=False), colR.rev(), Line(colR.p0, colL.p0)]
        rc = r + P["ov"]
    check_loop(col, name="col")

    # ---------------- lance : coeur (dans la contre-forme), deux tronçons
    l2, _, Za = one(eLt, Arc(I, rc, 70, 130))
    l2R, _, ZaR = one(eRt, Arc(I, rc, 70, 130))
    fUL = Line(jour[3], jour[0]); fLL = Line(jour[3], jour[2])
    l3, _, Va = one(eLt, fUL)
    up = eLt.sub(l2, l3)
    upR = eRt.sub(l2R, l3)
    coeur_h = [up, Line(Va, jour[0]), Line(jour[0], mirror_x(Va)), upR.rev(),
               arc_between(I, rc, upR.p0, up.p0, ccw=True)]
    check_loop(coeur_h, name="coeur haut")
    l4, _, Wa = one(eLb, fLL)
    l5, _, Zb = one(eLb, Arc(I, r - g, 230, 310))
    l5R, _, ZbR = one(eRb, Arc(I, r - g, 230, 310))
    lo = eLb.sub(l4, l5)
    loR = eRb.sub(l4, l5R)
    coeur_b = [lo, arc_between(I, r - g, lo.p1, loR.p1, ccw=True), loR.rev(),
               Line(loR.p0, jour[2]), Line(jour[2], lo.p0)]
    check_loop(coeur_b, name="coeur bas")

    # ---------------- lance : queue (derrière le corps, coupée à O ⊕ gap)
    l6, _, Zq = one(eLb, Arc(O, R + g, 230, 310))
    l6R, _, ZqR = one(eRb, Arc(O, R + g, 230, 310))
    q = eLb.sub(l6, 1)
    qR = eRb.sub(l6R, 1)
    queue = [q, Line(q.p1, qR.p1), qR.rev(), arc_between(O, R + g, qR.p0, q.p0, ccw=False)]
    check_loop(queue, name="queue")

    # ---------------- barre
    bt, bb = P["bar_top"], P["bar_bot"]
    def x_on(fac, y):
        (x0, y0), (x1, y1) = fac
        return x0 + (x1 - x0) * (y - y0) / (y1 - y0)
    xbt = x_on((jour[0], jour[1]), bt); xbb = x_on((jour[1], jour[2]), bb)
    xf = O[0] + math.sqrt(R ** 2 - (bb - 512) ** 2)
    bar = [Line((xbt, bt), (P["bar_tip"], bt)), Line((P["bar_tip"], bt), (xf, bb)),
           Line((xf, bb), (xbb, bb)), Line((xbb, bb), jour[1]), Line(jour[1], (xbt, bt))]

    cristal = [Line(crist[i], crist[(i + 1) % 4]) for i in range(4)]

    comps = dict(corps=corps, col=[col], coeur=[coeur_h, coeur_b], queue=[queue],
                 pointe=[point], etoile=[star], barre=[bar], cristal=[cristal])
    K.update(O=O, R=R, I=I, r=r, Cbu=Cbu, Cbl=Cbl, apex_o=apex_o, Su=Su, Sl=Sl, Ku=Ku, Kl=Kl, W=W,
             CIu=CIu, CIl=CIl, apex_i=apex_i, Ah=Ah, H=H, T=T, KT=KT, Jout=Jout, Jin=Jin,
             Jlow=Jlow, crist=crist, jour=jour, ca2=ca2, cb2=cb2, bar=(xbt, xbb, xf),
             th_jo=th_jo, th_jl=th_jl, a_su=a_su, a_ia=a_ia, P=P)
    return comps, K


ORDER = ["corps", "queue", "pointe", "coeur", "col", "etoile", "barre", "cristal"]


def flat_svg(comps, comment="", fill="#F2EDE5", extra=""):
    out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">']
    if comment:
        out.append("<!--\n" + comment + "\n-->")
    for k in ORDER:
        d = " ".join(path_d(loop) for loop in comps[k])
        out.append(f'  <g id="g-{k}" fill="{fill}">\n    <path id="p-{k}" d="{d}"/>\n  </g>')
    out.append(extra)
    out.append("</svg>")
    return "\n".join(out)


if __name__ == "__main__":
    dst = sys.argv[1]
    over = {}
    for a in sys.argv[2:]:
        k, v = a.split("=")
        over[k] = float(v)
    comps, K = build(over)
    os.makedirs(dst, exist_ok=True)
    open(os.path.join(dst, "g.svg"), "w").write(flat_svg(comps))
    print(json.dumps({k: (v if not isinstance(v, tuple) else [round(x, 2) if isinstance(x, float) else x for x in v]) for k, v in K.items() if k != "P"}, default=str)[:3000])
