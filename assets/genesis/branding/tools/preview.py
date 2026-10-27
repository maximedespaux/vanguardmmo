"""Planche de contrôle d'un emblème : ce qu'on ne voit pas en grand.

    python3 tools/preview.py emblème.png controle.png

Entrée : un PNG carré à fond transparent (idéalement 1024 px).
Sortie : une planche avec
  - l'emblème en 512 px sur noir #08080C ;
  - les réductions 128 / 64 / 48 / 32 / 24 / 16 px sur trois fonds (noir de la
    charte, gris de Discord #313338, ivoire #F2EDE5) — c'est là qu'on voit si
    le G se lit encore ou s'il devient une tache ;
  - l'avatar rond de Discord (masque circulaire) en 128 et 40 px ;
  - la silhouette pleine (alpha seul), qui dit si la FORME tient sans le métal.

Les réductions sont faites en LANCZOS depuis l'original : c'est ce que fait un
navigateur ou Discord, pas un agrandissement d'une miniature.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

NOIR = (8, 8, 12, 255)
DISCORD = (49, 51, 56, 255)
IVOIRE = (242, 237, 229, 255)
TAILLES = [128, 64, 48, 32, 24, 16]


def sur_fond(img, taille, fond):
    tuile = Image.new("RGBA", (taille, taille), fond)
    petit = img.resize((taille, taille), Image.LANCZOS)
    tuile.alpha_composite(petit)
    return tuile


def avatar(img, taille, fond):
    """Disque Discord : fond plein, emblème centré, coins coupés en rond."""
    sur = 4
    grand = taille * sur
    disque = Image.new("RGBA", (grand, grand), NOIR)
    em = img.resize((grand, grand), Image.LANCZOS)
    disque.alpha_composite(em)
    masque = Image.new("L", (grand, grand), 0)
    ImageDraw.Draw(masque).ellipse((0, 0, grand - 1, grand - 1), fill=255)
    disque.putalpha(masque)
    disque = disque.resize((taille, taille), Image.LANCZOS)
    tuile = Image.new("RGBA", (taille + 16, taille + 16), fond)
    tuile.alpha_composite(disque, (8, 8))
    return tuile


def main(src, dst):
    img = Image.open(src).convert("RGBA")
    if img.width != img.height:
        cote = max(img.size)
        carre = Image.new("RGBA", (cote, cote), (0, 0, 0, 0))
        carre.alpha_composite(img, ((cote - img.width) // 2, (cote - img.height) // 2))
        img = carre

    L, H = 1400, 980
    planche = Image.new("RGBA", (L, H), (20, 20, 26, 255))
    d = ImageDraw.Draw(planche)
    try:
        police = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 15)
    except OSError:
        police = ImageFont.load_default()

    # Grand format sur noir
    planche.alpha_composite(sur_fond(img, 512, NOIR), (24, 40))
    d.text((24, 14), "512 px sur noir #08080C", fill=(200, 196, 190), font=police)

    # Silhouette pleine (alpha seul)
    alpha = img.split()[3].point(lambda a: 255 if a > 96 else 0)
    sil = Image.new("RGBA", img.size, (242, 237, 229, 0))
    sil.putalpha(alpha)
    plein = Image.new("RGBA", img.size, (242, 237, 229, 255))
    plein.putalpha(alpha)
    planche.alpha_composite(sur_fond(plein, 256, NOIR), (24, 600))
    d.text((24, 576), "Silhouette pleine (la forme sans le métal)", fill=(200, 196, 190), font=police)

    # Réductions sur trois fonds
    x0, y = 572, 40
    for nom, fond in (("noir", NOIR), ("Discord", DISCORD), ("ivoire", IVOIRE)):
        d.text((x0, y - 24), f"Réductions sur {nom}", fill=(200, 196, 190), font=police)
        x = x0
        for t in TAILLES:
            planche.alpha_composite(sur_fond(img, t, fond), (x, y))
            d.text((x, y + t + 4), f"{t}", fill=(150, 146, 140), font=police)
            x += t + 18
        y += 128 + 56

    # Avatars Discord
    d.text((x0, y - 24), "Avatar rond Discord (128 et 40 px)", fill=(200, 196, 190), font=police)
    planche.alpha_composite(avatar(img, 128, DISCORD), (x0, y))
    planche.alpha_composite(avatar(img, 40, DISCORD), (x0 + 160, y + 44))
    planche.alpha_composite(avatar(img, 32, DISCORD), (x0 + 230, y + 48))

    planche.convert("RGB").save(dst)
    print(dst)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage : preview.py emblème.png controle.png")
    main(sys.argv[1], sys.argv[2])
