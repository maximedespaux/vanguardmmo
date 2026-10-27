"""Une itération : construit, rend, fait la planche de contrôle et mesure.

    python3 iter.py <dossier> [clé=valeur ...]
"""
import sys, os, subprocess, json, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build, measure
from geo import flatten, dist

TOOLS = os.path.normpath(os.path.join(HERE, "../../../../tools"))


def render(svg, png, size=1024):
    subprocess.run(["sh", os.path.join(TOOLS, "render.sh"), svg, png, str(size), str(size)],
                   check=True, stdout=subprocess.DEVNULL)


def controle(png, out):
    subprocess.run(["python3", os.path.join(TOOLS, "preview.py"), png, out], check=True, stdout=subprocess.DEVNULL)


def epaisseurs(comps, K):
    """Épaisseurs du corps (distance mini entre bords) en quelques stations nommées."""
    main = comps["corps"][0]
    pts = flatten(main, 200)
    O, I, R, r = K["O"], K["I"], K["R"], K["r"]
    outer = [p for p in pts if abs(dist(p, O) - R) < 0.5 or p[0] < K["apex_i"][0] - 2]
    inner = [p for p in pts if abs(dist(p, I) - r) < 0.5]
    def at(theta):
        """épaisseur radiale depuis O dans la direction theta (degrés math)."""
        t = math.radians(theta)
        po = (O[0] + R * math.cos(t), O[1] - R * math.sin(t))
        return round(min(dist(po, q) for q in inner), 1)
    res = {f"{a}deg": at(a) for a in (120, 75, 300, 270, 240, 330)}
    # 9 h : de l'apex extérieur des ogives à l'apex intérieur
    res["9h_apex"] = round(K["apex_i"][0] - K["apex_o"][0], 1)
    res["9h_pointe"] = round(K["apex_i"][0] - K["W"][0], 1)
    return res


if __name__ == "__main__":
    dst = sys.argv[1]
    over = {}
    for a in sys.argv[2:]:
        k, v = a.split("=")
        over[k] = float(v)
    comps, K = build.build(over)
    os.makedirs(dst, exist_ok=True)
    svg = os.path.join(dst, "g.svg")
    open(svg, "w").write(build.flat_svg(comps))
    render(svg, os.path.join(dst, "g.png"))
    controle(os.path.join(dst, "g.png"), os.path.join(dst, "ctl.png"))
    m = measure.silhouette(os.path.join(dst, "g.png"))
    m.update(epaisseurs(comps, K))
    m["H"] = [round(v, 1) for v in K["H"]]
    m["|H-C|"] = round(dist(K["H"], (512, 512)), 1)
    json.dump(dict(prm=over, mesures=m), open(os.path.join(dst, "mesures.json"), "w"), indent=1)
    print(m)
