"""Compare plusieurs variantes côte à côte (rendus lancés en parallèle).

    python3 compare.py <dossier> "nom1: k=v k=v" "nom2: k=v" ...

Planche : chaque variante en 480 px sur noir, puis 64 / 48 / 32 / 24 / 16 px sur noir et
sur gris Discord, et le centroïde mesuré.
"""
import sys, os, subprocess, json
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))

dst = sys.argv[1]
specs = []
for s in sys.argv[2:]:
    name, args = s.split(":", 1)
    specs.append((name.strip(), args.split()))
procs = [subprocess.Popen(["python3", os.path.join(HERE, "iter.py"), os.path.join(dst, n)] + a,
                          stdout=subprocess.PIPE, text=True) for n, a in specs]
outs = [p.communicate()[0] for p in procs]

NOIR, DISC = (8, 8, 12, 255), (49, 51, 56, 255)
cw = 500
W = Image.new("RGBA", (cw * len(specs), 760), (20, 20, 26, 255))
d = ImageDraw.Draw(W)
try:
    f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 15)
except OSError:
    f = ImageFont.load_default()
for i, (n, a) in enumerate(specs):
    x = i * cw
    im = Image.open(os.path.join(dst, n, "g.png")).convert("RGBA")
    big = Image.new("RGBA", (480, 480), NOIR)
    big.alpha_composite(im.resize((480, 480), Image.LANCZOS))
    W.alpha_composite(big, (x + 10, 30))
    m = json.load(open(os.path.join(dst, n, "mesures.json")))["mesures"]
    d.text((x + 10, 8), f"{n}   centroïde {m['centroide']}  r max {m['rayon_max']}", fill=(220, 215, 205), font=f)
    for row, bg in enumerate((NOIR, DISC)):
        xx = x + 10
        for t in (64, 48, 32, 24, 16):
            tile = Image.new("RGBA", (t, t), bg)
            tile.alpha_composite(im.resize((t, t), Image.LANCZOS))
            W.alpha_composite(tile, (xx, 530 + row * 80))
            xx += t + 14
    # 32 px agrandi x4 (pixels visibles)
    t32 = Image.new("RGBA", (32, 32), NOIR)
    t32.alpha_composite(im.resize((32, 32), Image.LANCZOS))
    W.alpha_composite(t32.resize((128, 128), Image.NEAREST), (x + 330, 530))
    d.text((x + 330, 662), "32 px x4", fill=(150, 146, 140), font=f)
W.convert("RGB").save(os.path.join(dst, "compare.png"))
print("\n".join(outs))
print(os.path.join(dst, "compare.png"))
