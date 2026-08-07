#!/usr/bin/env python3
"""
Découpe les planches d'inventaire du jeu en icônes de slots, et normalise
TOUTES les icônes à la même taille.

Le problème qu'il règle : les neuf icônes d'équipement viennent du jeu (PNG
42×44), les treize autres — bijoux, fashion, familier, fée, ramasseur — sont
des dessins au trait de remplacement. À l'écran, deux styles cohabitent et
les tailles ne tombent pas juste : on voit les détourages.

Usage :

    # 1. inspecter une planche (dimensions, cases détectées)
    python3 scripts/decouper-icones.py inspecter public/airbuilder/icons/sources/invtop.png

    # 2. découper une grille (cases régulières)
    python3 scripts/decouper-icones.py decouper <planche> <colonnes> <lignes> <prefixe>

    # 3. normaliser des icônes déjà en place (même canevas, marge égale)
    python3 scripts/decouper-icones.py normaliser public/airbuilder/icons/emb_001.png ...

Chaque icône sortante est : rognée au contenu réel (on jette les bords vides),
redimensionnée pour tenir dans le canevas avec une marge constante, puis
centrée sur un canevas TRANSPARENT carré. Deux icônes de tailles d'origine
différentes finissent donc optiquement identiques dans leur case.
"""
import sys
import os
from PIL import Image, ImageChops

# 96 px = 2× la taille d'affichage (48 px dans un slot de 56) : net sur les
# écrans à haute densité, et assez petit pour ne pas peser.
CANEVAS = 96
# Marge intérieure : l'icône ne touche jamais le bord de sa case, sinon elle
# semble déborder du carré du slot.
MARGE = 6


def _fond_depuis_bords(im: Image.Image, tolerance: int = 16) -> Image.Image:
    """Rend transparent le fond uni, en partant des BORDS seulement.

    Comparer la couleur du coin à toute l'image effacerait aussi les pixels
    intérieurs de teinte voisine — une icône sombre sur fond sombre disparaît
    entièrement. On propage donc depuis les bords, comme un pot de peinture :
    ce qui est enfermé dans le dessin est conservé.
    """
    l, h = im.size
    px = im.load()
    ref = px[0, 0]
    vus = [[False] * h for _ in range(l)]
    pile = [(x, y) for x in range(l) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, l - 1)]
    proche = lambda c: abs(c[0] - ref[0]) <= tolerance and abs(c[1] - ref[1]) <= tolerance and abs(c[2] - ref[2]) <= tolerance
    while pile:
        x, y = pile.pop()
        if x < 0 or y < 0 or x >= l or y >= h or vus[x][y]:
            continue
        vus[x][y] = True
        c = px[x, y]
        if c[3] == 0:
            pile += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
            continue
        if not proche(c):
            continue
        px[x, y] = (c[0], c[1], c[2], 0)
        pile += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return im


def rogner(im: Image.Image) -> Image.Image:
    """Enlève les bords vides — transparents, ou d'une couleur unie comme en
    laissent les captures de planches d'inventaire."""
    im = im.convert("RGBA")
    # Deja detouree (elle a des pixels transparents) : on se contente de rogner.
    a_de_l_alpha = im.getextrema()[3][0] < 255
    if not a_de_l_alpha:
        im = _fond_depuis_bords(im.copy())
    boite = im.getbbox()
    return im.crop(boite) if boite else im


def _redimensionner(im: Image.Image, taille) -> Image.Image:
    """Redimensionne en alpha PRÉMULTIPLIÉ.

    Sans ça, le filtre mélange la couleur des pixels visibles avec celle des
    pixels transparents — noirs — et une icône claire ressort grise et fanée.
    C'est exactement ce qui arrivait aux silhouettes de slots : (205,208,218)
    devenait (85,86,91), soit invisible sur fond sombre.
    """
    r, v, b, a = im.split()
    prem = Image.merge("RGBA", (ImageChops.multiply(r, a), ImageChops.multiply(v, a), ImageChops.multiply(b, a), a))
    prem = prem.resize(taille, Image.LANCZOS)
    pixels = [
        (min(255, r * 255 // a), min(255, v * 255 // a), min(255, b * 255 // a), a) if a else (0, 0, 0, 0)
        for (r, v, b, a) in prem.getdata()
    ]
    sortie = Image.new("RGBA", taille)
    sortie.putdata(pixels)
    return sortie


def normaliser(im: Image.Image, canevas: int = CANEVAS, marge: int = MARGE) -> Image.Image:
    """Une icône, centrée sur un canevas carré, à taille optique constante."""
    im = rogner(im)
    dispo = canevas - 2 * marge
    ratio = min(dispo / im.width, dispo / im.height)
    taille = (max(1, round(im.width * ratio)), max(1, round(im.height * ratio)))
    im = _redimensionner(im, taille)
    sortie = Image.new("RGBA", (canevas, canevas), (0, 0, 0, 0))
    # Collage SANS masque : avec l'image comme masque, Pillow melange chaque
    # pixel semi-transparent avec le canevas — qui est noir transparent — et
    # l'icone ressort grise. Le canevas est vide, une copie brute suffit.
    sortie.paste(im, ((canevas - im.width) // 2, (canevas - im.height) // 2))
    return sortie


def inspecter(chemin: str) -> None:
    im = Image.open(chemin).convert("RGBA")
    print(f"{os.path.basename(chemin)} : {im.width}×{im.height}")
    for cols in range(1, 9):
        for lignes in range(1, 13):
            if im.width % cols == 0 and im.height % lignes == 0:
                c, l = im.width // cols, im.height // lignes
                if 24 <= c <= 160 and 24 <= l <= 160 and abs(c - l) <= 8:
                    print(f"  grille possible : {cols}×{lignes} → cases de {c}×{l}")


def decouper(chemin: str, cols: int, lignes: int, prefixe: str) -> None:
    im = Image.open(chemin).convert("RGBA")
    lc, ll = im.width // cols, im.height // lignes
    dossier = os.path.dirname(prefixe) or "."
    os.makedirs(dossier, exist_ok=True)
    n = 0
    for y in range(lignes):
        for x in range(cols):
            case = im.crop((x * lc, y * ll, (x + 1) * lc, (y + 1) * ll))
            if not rogner(case).getbbox():
                continue  # case vide : on ne fabrique pas d'icône fantôme
            n += 1
            sortie = f"{prefixe}{n:02d}.png"
            normaliser(case).save(sortie)
            print("écrit :", sortie)
    print(f"{n} icône(s) depuis {os.path.basename(chemin)} ({cols}×{lignes}, cases {lc}×{ll})")


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        return
    cmd = sys.argv[1]
    if cmd == "inspecter":
        for f in sys.argv[2:]:
            inspecter(f)
    elif cmd == "decouper":
        chemin, cols, lignes, prefixe = sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
        decouper(chemin, cols, lignes, prefixe)
    elif cmd == "normaliser":
        for f in sys.argv[2:]:
            normaliser(Image.open(f)).save(f)
            print("normalisé :", f)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
