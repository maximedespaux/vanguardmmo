"""Petit noyau de géométrie plane pour le G maître GENESIS (Python pur, sans dépendance).

Repère : viewBox SVG 1024 x 1024, y vers le BAS.
Angles : degrés MATHÉMATIQUES (0° = 3 h, 90° = 12 h, sens anti-horaire à l'écran),
         point = (cx + r cos a, cy - r sin a).
Primitives : Line, Arc, Quad (Bézier quadratique). Chacune est paramétrée sur t ∈ [0, 1],
sait se découper (sub), s'inverser (rev), se décaler (offset) et s'écrire en SVG.
Les intersections sont numériques (échantillonnage + Newton) : précision ~1e-9 px.
"""
import math


# ---------------------------------------------------------------- vecteurs
def add(a, b): return (a[0] + b[0], a[1] + b[1])
def sub(a, b): return (a[0] - b[0], a[1] - b[1])
def mul(a, k): return (a[0] * k, a[1] * k)
def dot(a, b): return a[0] * b[0] + a[1] * b[1]
def cross(a, b): return a[0] * b[1] - a[1] * b[0]
def norm(a): return math.hypot(a[0], a[1])
def unit(a):
    n = norm(a)
    return (a[0] / n, a[1] / n)
def dist(a, b): return norm(sub(a, b))
def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
def pol(c, r, deg):
    t = math.radians(deg)
    return (c[0] + r * math.cos(t), c[1] - r * math.sin(t))
def ang(c, p):
    """Angle mathématique (degrés, dans ]-180, 180]) du point p vu de c."""
    return math.degrees(math.atan2(-(p[1] - c[1]), p[0] - c[0]))
def rnorm(v):
    """Normale à DROITE du sens de parcours, à l'écran (y vers le bas)."""
    return (-v[1], v[0])
def mirror_x(p, x0=512.0): return (2 * x0 - p[0], p[1])


def line_line(p, u, q, v):
    """Intersection des droites p + s u et q + t v."""
    d = cross(u, v)
    if abs(d) < 1e-12:
        raise ValueError("droites parallèles")
    s = cross(sub(q, p), v) / d
    return add(p, mul(u, s))


def h2(x):
    """Arrondi au demi-pixel, écrit sans zéro inutile."""
    v = round(x * 2) / 2
    if v == int(v):
        return str(int(v))
    return f"{v:.1f}"


def P2(p): return f"{h2(p[0])} {h2(p[1])}"


# ---------------------------------------------------------------- primitives
class Line:
    def __init__(self, p0, p1): self.p0, self.p1 = p0, p1
    def pt(self, t): return lerp(self.p0, self.p1, t)
    def d(self, t): return sub(self.p1, self.p0)
    def sub(self, t0, t1): return Line(self.pt(t0), self.pt(t1))
    def rev(self): return Line(self.p1, self.p0)
    def offset(self, dd):
        n = mul(unit(rnorm(self.d(0))), dd)
        return Line(add(self.p0, n), add(self.p1, n))
    def svg(self): return f"L {P2(self.p1)}"
    @property
    def end(self): return self.p1
    @property
    def start(self): return self.p0


class Arc:
    """Arc de cercle de centre c, rayon r, de l'angle a0 à a1 (degrés math, a1 peut être < a0)."""
    def __init__(self, c, r, a0, a1): self.c, self.r, self.a0, self.a1 = c, r, a0, a1
    def pt(self, t): return pol(self.c, self.r, self.a0 + (self.a1 - self.a0) * t)
    def d(self, t):
        a = math.radians(self.a0 + (self.a1 - self.a0) * t)
        k = math.radians(self.a1 - self.a0) * self.r
        return (-math.sin(a) * k, -math.cos(a) * k)
    def sub(self, t0, t1):
        return Arc(self.c, self.r, self.a0 + (self.a1 - self.a0) * t0, self.a0 + (self.a1 - self.a0) * t1)
    def rev(self): return Arc(self.c, self.r, self.a1, self.a0)
    def offset(self, dd):
        # sens anti-horaire (a croissant) : la droite du parcours est l'extérieur
        return Arc(self.c, self.r + dd if self.a1 > self.a0 else self.r - dd, self.a0, self.a1)
    def svg(self):
        large = 1 if abs(self.a1 - self.a0) > 180 else 0
        sweep = 1 if self.a1 < self.a0 else 0   # angle décroissant = horaire à l'écran
        return f"A {h2(self.r)} {h2(self.r)} 0 {large} {sweep} {P2(self.pt(1))}"
    @property
    def end(self): return self.pt(1)
    @property
    def start(self): return self.pt(0)
    def t_of_angle(self, a):
        """Paramètre t d'un angle (ramené dans l'intervalle de l'arc si possible)."""
        lo, hi = sorted((self.a0, self.a1))
        for k in (-720, -360, 0, 360, 720):
            if lo - 1e-9 <= a + k <= hi + 1e-9:
                a = a + k
                break
        return (a - self.a0) / (self.a1 - self.a0)


class Quad:
    def __init__(self, p0, c, p1): self.p0, self.c, self.p1 = p0, c, p1
    def pt(self, t):
        u = 1 - t
        return (u * u * self.p0[0] + 2 * u * t * self.c[0] + t * t * self.p1[0],
                u * u * self.p0[1] + 2 * u * t * self.c[1] + t * t * self.p1[1])
    def d(self, t):
        return (2 * (1 - t) * (self.c[0] - self.p0[0]) + 2 * t * (self.p1[0] - self.c[0]),
                2 * (1 - t) * (self.c[1] - self.p0[1]) + 2 * t * (self.p1[1] - self.c[1]))
    def sub(self, t0, t1):
        a, b = self.pt(t0), self.pt(t1)
        # point de contrôle du morceau : intersection des tangentes aux bouts
        da, db = self.d(t0), self.d(t1)
        try:
            c = line_line(a, da, b, db)
        except ValueError:
            c = lerp(a, b, 0.5)
        return Quad(a, c, b)
    def rev(self): return Quad(self.p1, self.c, self.p0)
    def offset(self, dd):
        """Décalage de Tiller-Hanson : bouts décalés sur leur normale, contrôle à
        l'intersection des tangentes décalées (erreur < 0.3 px pour nos courbes, vérifiée)."""
        n0 = mul(unit(rnorm(self.d(0))), dd)
        n1 = mul(unit(rnorm(self.d(1))), dd)
        a, b = add(self.p0, n0), add(self.p1, n1)
        try:
            c = line_line(a, self.d(0), b, self.d(1))
        except ValueError:
            c = add(self.c, n0)
        return Quad(a, c, b)
    def svg(self): return f"Q {P2(self.c)} {P2(self.p1)}"
    @property
    def end(self): return self.p1
    @property
    def start(self): return self.p0


# ---------------------------------------------------------------- intersections
def _samples(seg, n):
    return [seg.pt(i / n) for i in range(n + 1)]


def _seg_seg(p1, p2, q1, q2):
    r, s = sub(p2, p1), sub(q2, q1)
    d = cross(r, s)
    if abs(d) < 1e-14:
        return None
    t = cross(sub(q1, p1), s) / d
    u = cross(sub(q1, p1), r) / d
    if -1e-9 <= t <= 1 + 1e-9 and -1e-9 <= u <= 1 + 1e-9:
        return t, u
    return None


def intersect(A, B, n=600):
    """Toutes les intersections de deux primitives : liste de (tA, tB, point)."""
    sa, sb = _samples(A, n), _samples(B, n)
    out = []
    for i in range(n):
        p1, p2 = sa[i], sa[i + 1]
        x0, x1 = min(p1[0], p2[0]), max(p1[0], p2[0])
        y0, y1 = min(p1[1], p2[1]), max(p1[1], p2[1])
        for j in range(n):
            q1, q2 = sb[j], sb[j + 1]
            if max(q1[0], q2[0]) < x0 or min(q1[0], q2[0]) > x1 or max(q1[1], q2[1]) < y0 or min(q1[1], q2[1]) > y1:
                continue
            r = _seg_seg(p1, p2, q1, q2)
            if r:
                t, s = (i + r[0]) / n, (j + r[1]) / n
                # Newton sur F(t, s) = A(t) - B(s)
                for _ in range(30):
                    F = sub(A.pt(t), B.pt(s))
                    da, db = A.d(t), B.d(s)
                    # système [da, -db] [dt, ds] = -F
                    a11, a12, a21, a22 = da[0], -db[0], da[1], -db[1]
                    det = a11 * a22 - a12 * a21
                    if abs(det) < 1e-14:
                        break
                    dt = (-F[0] * a22 + F[1] * a12) / det
                    ds = (-a11 * F[1] + a21 * F[0]) / det
                    t, s = t + dt, s + ds
                    if abs(dt) + abs(ds) < 1e-13:
                        break
                if -1e-6 <= t <= 1 + 1e-6 and -1e-6 <= s <= 1 + 1e-6:
                    if not any(abs(t - o[0]) < 1e-6 for o in out):
                        out.append((t, s, A.pt(t)))
    return out


def one(A, B, pick=None):
    r = intersect(A, B)
    if not r:
        raise ValueError("aucune intersection")
    if pick:
        r.sort(key=pick)
    return r[0]


def circle(c, r, a0=0, a1=360):
    return Arc(c, r, a0, a1)


# ---------------------------------------------------------------- chemins
def path_d(segs, close=True):
    """Écrit une boucle de primitives : chaque primitive commence où finit la précédente."""
    out = [f"M {P2(segs[0].start)}"]
    for s in segs:
        out.append(s.svg())
    if close:
        out.append("Z")
    return " ".join(out)


def check_loop(segs, tol=0.05, name=""):
    for i, s in enumerate(segs):
        nxt = segs[(i + 1) % len(segs)]
        e = dist(s.end, nxt.start)
        if e > tol:
            raise ValueError(f"{name} : discontinuité {e:.3f} px entre les segments {i} et {i + 1}")


def flatten(segs, n=64):
    pts = []
    for s in segs:
        k = n if not isinstance(s, Line) else 1
        for i in range(k):
            pts.append(s.pt(i / k))
    return pts


def poly_area_centroid(pts):
    a = cx = cy = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        c = x0 * y1 - x1 * y0
        a += c
        cx += (x0 + x1) * c
        cy += (y0 + y1) * c
    a *= 0.5
    return a, (cx / (6 * a), cy / (6 * a))
