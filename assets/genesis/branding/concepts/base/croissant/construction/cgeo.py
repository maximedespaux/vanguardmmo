"""Géométrie du G croissant : cercles, ellipses tournées, intersections (repère écran, y vers le bas)."""
import math

def r(v): return round(v * 2) / 2
def fmt(v):
    v = r(v)
    return str(int(v)) if v == int(v) else f"{v:.1f}"
def P(p): return f"{fmt(p[0])} {fmt(p[1])}"

def circ(c, R, deg):
    """Angle mathématique : 0 = 3 h, 90 = 12 h."""
    a = math.radians(deg)
    return (c[0] + R * math.cos(a), c[1] - R * math.sin(a))

def angle_of(c, p):
    return math.degrees(math.atan2(-(p[1] - c[1]), p[0] - c[0]))

def ell(c, rx, ry, rot, t):
    ph = math.radians(rot)
    x, y = rx * math.cos(t), ry * math.sin(t)
    return (c[0] + x * math.cos(ph) - y * math.sin(ph), c[1] + x * math.sin(ph) + y * math.cos(ph))

def ell_inside(c, rx, ry, rot, p):
    ph = math.radians(rot)
    dx, dy = p[0] - c[0], p[1] - c[1]
    x = dx * math.cos(ph) + dy * math.sin(ph)
    y = -dx * math.sin(ph) + dy * math.cos(ph)
    return (x / rx) ** 2 + (y / ry) ** 2

def _roots(f, a, b, N=4000):
    out = []; prev = f(a); pa = a
    for i in range(1, N + 1):
        t = a + (b - a) * i / N
        v = f(t)
        if (v > 0) != (prev > 0):
            lo, hi = pa, t
            for _ in range(60):
                m = (lo + hi) / 2
                if (f(m) > 0) == (f(lo) > 0): lo = m
                else: hi = m
            out.append((lo + hi) / 2)
        prev, pa = v, t
    return out

def ell_x(c, rx, ry, rot, X, lower=True):
    ts = _roots(lambda t: ell(c, rx, ry, rot, t)[0] - X, 0, 2 * math.pi)
    pts = sorted([(ell(c, rx, ry, rot, t), t) for t in ts], key=lambda s: s[0][1])
    p, t = pts[-1] if lower else pts[0]
    return t, p

def ell_y(c, rx, ry, rot, Y, right=True):
    ts = _roots(lambda t: ell(c, rx, ry, rot, t)[1] - Y, 0, 2 * math.pi)
    pts = sorted([(ell(c, rx, ry, rot, t), t) for t in ts], key=lambda s: s[0][0])
    p, t = pts[-1] if right else pts[0]
    return t, p

def ell_tan(c, rx, ry, rot, t):
    ph = math.radians(rot)
    dx, dy = -rx * math.sin(t), ry * math.cos(t)
    vx, vy = dx * math.cos(ph) - dy * math.sin(ph), dx * math.sin(ph) + dy * math.cos(ph)
    n = math.hypot(vx, vy); return (vx / n, vy / n)

def circ_x(c, R, X, lower=True):
    dy = math.sqrt(R * R - (X - c[0]) ** 2)
    return (X, c[1] + dy) if lower else (X, c[1] - dy)

def circ_y(c, R, Y, right=True):
    dx = math.sqrt(R * R - (Y - c[1]) ** 2)
    return (c[0] + dx, Y) if right else (c[0] - dx, Y)

def circ_circ(c1, r1, c2, r2):
    d = math.dist(c1, c2)
    a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    h = math.sqrt(max(r1 * r1 - a * a, 0))
    m = (c1[0] + (c2[0] - c1[0]) * a / d, c1[1] + (c2[1] - c1[1]) * a / d)
    o = (-(c2[1] - c1[1]) / d * h, (c2[0] - c1[0]) / d * h)
    return [(m[0] + o[0], m[1] + o[1]), (m[0] - o[0], m[1] - o[1])]

def circle_3pts(a, b, c):
    ax, ay = a; bx, by = b; cx, cy = c
    d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    ux = ((ax*ax+ay*ay)*(by-cy) + (bx*bx+by*by)*(cy-ay) + (cx*cx+cy*cy)*(ay-by)) / d
    uy = ((ax*ax+ay*ay)*(cx-bx) + (bx*bx+by*by)*(ax-cx) + (cx*cx+cy*cy)*(bx-ax)) / d
    return (ux, uy), math.dist((ux, uy), a)

def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
def add(a, v, k=1.0): return (a[0] + v[0] * k, a[1] + v[1] * k)
def unit(v):
    n = math.hypot(*v); return (v[0] / n, v[1] / n)
def line_line(p1, d1, p2, d2):
    det = d1[0] * (-d2[1]) - d1[1] * (-d2[0])
    rx, ry = p2[0] - p1[0], p2[1] - p1[1]
    t = (rx * (-d2[1]) - ry * (-d2[0])) / det
    return (p1[0] + d1[0] * t, p1[1] + d1[1] * t)

def diamond(c, hw, hh_top, hh_bot=None):
    hh_bot = hh_top if hh_bot is None else hh_bot
    return [(c[0], c[1] - hh_top), (c[0] + hw, c[1]), (c[0], c[1] + hh_bot), (c[0] - hw, c[1])]

def poly(pts):
    return "M " + " L ".join(P(p) for p in pts) + " Z"

def diamond_facets(c, hw, hh_top, hh_bot=None, k=0.42):
    """Facettes d'un losange : 4 triangles extérieurs + un losange intérieur (table)."""
    T, Rr, Bt, Lf = diamond(c, hw, hh_top, hh_bot)
    hb = hh_top if hh_bot is None else hh_bot
    t = diamond((c[0], c[1] - 0.0), hw * k, hh_top * k, hb * k)
    tT, tR, tB, tL = t
    cols = ["#E0505F", "#A6192E", "#60152D", "#7E1A33"]   # haut-gauche clair, haut-droit, bas-droit sombre, bas-gauche
    f = [
        (poly([T, tT, tL, Lf]), "#C93447"),
        (poly([T, Rr, tR, tT]), "#A6192E"),
        (poly([Rr, Bt, tB, tR]), "#4A1023"),
        (poly([Bt, Lf, tL, tB]), "#7A1830"),
        (poly([tT, tR, tB, tL]), "#B32236"),
        (poly([tT, tL, (c[0], c[1])]), "#F08A92"),
    ]
    return f

def seg_circle(a, b, c, R):
    """Intersections du segment ab avec le cercle (c, R) (points)."""
    v = (b[0] - a[0], b[1] - a[1])
    fx, fy = a[0] - c[0], a[1] - c[1]
    A_ = v[0] ** 2 + v[1] ** 2; B_ = 2 * (fx * v[0] + fy * v[1]); C_ = fx * fx + fy * fy - R * R
    D = B_ * B_ - 4 * A_ * C_
    if D < 0: return []
    out = []
    for s in ((-B_ - math.sqrt(D)) / (2 * A_), (-B_ + math.sqrt(D)) / (2 * A_)):
        if 0 <= s <= 1: out.append((a[0] + v[0] * s, a[1] + v[1] * s))
    return out

def seg_ellipse(a, b, c, rx, ry, rot):
    """Intersections du segment ab avec l'ellipse : renvoie [(t_ellipse, point)]."""
    f = lambda s: ell_inside(c, rx, ry, rot, lerp(a, b, s)) - 1
    out = []
    for s in _roots(f, 0, 1, 2000):
        p = lerp(a, b, s)
        ph = math.radians(rot); dx, dy = p[0] - c[0], p[1] - c[1]
        x = dx * math.cos(ph) + dy * math.sin(ph); y = -dx * math.sin(ph) + dy * math.cos(ph)
        out.append((math.atan2(y / ry, x / rx), p))
    return out
