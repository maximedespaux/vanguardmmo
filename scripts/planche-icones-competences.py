#!/usr/bin/env python3
"""
Assemble les icônes de compétence du client en UNE planche PNG.

Appelé par `scripts/extraire-icones-competences.mjs`, qui a déjà déposé les
`.dds` du client dans un dossier de travail et écrit le manifeste. Ce fichier
ne décide de RIEN : l'ordre des cases, la grille et le nom de sortie viennent
du manifeste. Il ne sait que lire du DDS — ce que Pillow fait et sharp non.

    python3 scripts/planche-icones-competences.py <manifeste.json>

Manifeste attendu :
    { "dossier": …, "sortie": …, "taille": 32, "colonnes": 14,
      "cases": ["skill_vagonecleanh.dds", …] }

Une planche plutôt que 194 fichiers : le catalogue peut afficher les 197
compétences d'un coup, et 194 requêtes de 5 Ko coûtent plus cher que 194 cases
de 32 px dans une image de 40 Ko.

LE MAGENTA N'EST PAS UN CADRE. Ces icônes viennent d'un moteur DirectDraw où le
fuchsia pur (255, 0, 255) est la couleur de TRANSPARENCE : elle dessine les
coins arrondis de la case, et le client ne l'affiche jamais. Recopiée telle
quelle, chaque icône arrivait sur le site avec une bordure rose vif — un quart
de la planche. On la rend donc transparente. Seul le fuchsia EXACT part : la
planche porte treize pixels de rose presque-fuchsia qui, eux, sont du dessin
(des effets magiques), et un seuil large les aurait troués.
"""
import json
import sys
from pathlib import Path

from PIL import Image

#: La couleur de transparence du client. Comparaison exacte, jamais un seuil.
FUCHSIA = (255, 0, 255)


def sans_fuchsia(im: Image.Image) -> Image.Image:
    """Rend transparent le fuchsia de transparence, et lui seul."""
    im = im.convert("RGBA")
    px = im.load()
    l, h = im.size
    n = 0
    for y in range(h):
        for x in range(l):
            r, v, b, a = px[x, y]
            if (r, v, b) == FUCHSIA and a:
                px[x, y] = (0, 0, 0, 0)
                n += 1
    im.info["fuchsia"] = n
    return im


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2

    m = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    dossier = Path(m["dossier"])
    taille = int(m["taille"])
    colonnes = int(m["colonnes"])
    cases = m["cases"]
    lignes = (len(cases) + colonnes - 1) // colonnes

    planche = Image.new("RGBA", (colonnes * taille, lignes * taille), (0, 0, 0, 0))
    ecarts = []
    perces = 0

    for i, nom in enumerate(cases):
        im = sans_fuchsia(Image.open(dossier / nom))
        perces += im.info.get("fuchsia", 0)
        if im.size != (taille, taille):
            # Une icône hors gabarit est remise au gabarit plutôt qu'écartée :
            # la case existe déjà dans le manifeste, la laisser vide décalerait
            # la lecture de personne mais afficherait un trou sans le dire.
            ecarts.append(f"{nom} {im.size[0]}x{im.size[1]}")
            im = im.resize((taille, taille), Image.LANCZOS)
        planche.paste(im, ((i % colonnes) * taille, (i // colonnes) * taille))

    sortie = Path(m["sortie"])
    sortie.parent.mkdir(parents=True, exist_ok=True)
    planche.save(sortie, optimize=True)

    print(f"planche {planche.size[0]}x{planche.size[1]} px · {len(cases)} cases · "
          f"{sortie.stat().st_size // 1024} Ko · {sortie}")
    print(f"fuchsia de transparence retiré : {perces} pixels "
          f"({round(100 * perces / (planche.size[0] * planche.size[1]))} % de la planche)")
    if ecarts:
        print("hors gabarit, redimensionnées : " + ", ".join(ecarts))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
