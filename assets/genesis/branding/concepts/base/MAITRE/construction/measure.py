"""Mesures sur un rendu 1024 transparent : centroïde de la silhouette, encombrement,
rayon maximal depuis le centre du disque (512, 512), et (option --couleurs) répartition
noir-anthracite / rouge-pourpre / or d'un rendu métal opaque.

    python3 measure.py rendu.png [--couleurs]
"""
import sys, math, colorsys
from PIL import Image


def silhouette(path):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    a = im.getchannel("A")
    data = a.load()
    sx = sy = n = 0
    x0, y0, x1, y1 = w, h, 0, 0
    rmax = 0
    for y in range(h):
        for x in range(w):
            v = data[x, y]
            if v > 128:
                sx += x + 0.5; sy += y + 0.5; n += 1
                x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
                rr = math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2)
                rmax = max(rmax, rr)
    return dict(centroide=(round(sx / n, 1), round(sy / n, 1)), boite=(x0, y0, x1 + 1, y1 + 1),
                rayon_max=round(rmax, 1), couverture=round(n / (w * h), 4))


def couleurs(path, disque=True):
    """Classe chaque pixel (dans le disque inscrit) par famille de la charte."""
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()
    fam = dict(noir=0, rouge=0, or_=0, ivoire=0)
    tot = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if disque and math.hypot(x - w / 2, y - h / 2) > w / 2:
                continue
            r, g, b = px[x, y]
            hh, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            hd = hh * 360
            tot += 1
            if l < 0.13 or s < 0.12 and l < 0.75:
                fam["noir"] += 1
            elif l > 0.86 and s < 0.5:
                fam["ivoire"] += 1
            elif hd < 20 or hd > 320:
                fam["rouge"] += 1
            elif 20 <= hd <= 60:
                # bronze sombre = or éteint : on le compte à part du clair
                fam["or_"] += 1 if l > 0.30 else 0
                fam["noir"] += 0 if l > 0.30 else 1
            else:
                fam["noir"] += 1
    return {k: round(100 * v / tot, 1) for k, v in fam.items()}


if __name__ == "__main__":
    p = sys.argv[1]
    if "--couleurs" in sys.argv:
        print(couleurs(p))
    else:
        print(silhouette(p))
