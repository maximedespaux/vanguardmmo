#!/usr/bin/env python3
"""Répartition noir / rouge / or des rendus des pistes GENESIS.

    python3 outils/mesure-couleurs.py            # les trois pistes, bureau-long.png
    python3 outils/mesure-couleurs.py --cartes   # + carte de classement par piste

Chaque pixel est classé dans l'ordre suivant (HSL, composantes 0-1) :

  rouge/pourpre  teinte 330°-360° ou 0°-15°, saturation HSL >= 0,30
                 et chroma (max-min) >= SEUIL_ROUGE (0,06 = 15/255 par défaut).
                 Le chroma évite de compter comme « rouge » un noir à peine
                 teinté : #08080C a une saturation HSL de 0,20 mais un chroma
                 de 0,016. 0,06 correspond à un voile pourpre d'environ 20 %
                 posé sur le noir de la charte.
  or             teinte 28°-50°, saturation HSL 0,20-0,72, luminosité 0,18-0,82.
                 Le plafond de saturation écarte l'orange Éternel #FF8C1A et
                 le jaune Cape #FFD24A (saturation 1,0) : ce sont des données
                 du jeu, pas l'or de la marque.
  noir/anthracite luminosité HSL <= 0,22 et chroma <= 0,10 (ce qui reste de
                 sombre et peu coloré).
  autre          tout le reste : ivoire du texte, gris des filets, images et
                 icônes du jeu, couleurs des paliers et raretés.

Limites connues : les icônes du jeu contiennent des bruns et des rouges qui
tombent dans « or » ou « rouge » ; le bord anticrénelé d'un texte Cape ou
Éternel peut passer en « or ». Ces deux biais sont faibles (< 1 point) et
touchent les trois pistes de la même façon.

Une variante STRICTE (chroma rouge >= 0,12, soit un rouge que l'oeil voit
franchement) est donnée à côté : l'écart entre les deux dit quelle part du
« rouge » n'est qu'un noir réchauffé.
"""
import sys, os
from PIL import Image
import numpy as np

ICI = os.path.dirname(os.path.abspath(__file__))
FRONT = os.path.dirname(ICI)
PISTES = ['obsidienne', 'sanctuaire', 'heraldique']


def classer(img, seuil_rouge=0.06):
    a = np.asarray(img.convert('RGB'), dtype=np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(axis=2); mn = a.min(axis=2); c = mx - mn
    L = (mx + mn) / 2
    den = 1 - np.abs(2 * L - 1)
    S = np.where(den > 1e-6, c / np.maximum(den, 1e-6), 0)
    # teinte en degrés
    h = np.zeros_like(mx)
    cz = np.maximum(c, 1e-6)
    m_r = (mx == r) & (c > 0)
    m_g = (mx == g) & (c > 0) & ~m_r
    m_b = (c > 0) & ~m_r & ~m_g
    h[m_r] = (60 * ((g - b) / cz) % 360)[m_r]
    h[m_g] = (60 * ((b - r) / cz) + 120)[m_g]
    h[m_b] = (60 * ((r - g) / cz) + 240)[m_b]

    rouge = ((h >= 330) | (h <= 15)) & (S >= 0.30) & (c >= seuil_rouge)
    orr = (h >= 28) & (h <= 50) & (S >= 0.20) & (S <= 0.72) & (L >= 0.18) & (L <= 0.82) & ~rouge
    noir = (L <= 0.22) & (c <= 0.10) & ~rouge & ~orr
    autre = ~(rouge | orr | noir)
    return noir, rouge, orr, autre


def pourcents(img, seuil_rouge=0.06):
    noir, rouge, orr, autre = classer(img, seuil_rouge)
    n = noir.size
    tot = [100 * x.sum() / n for x in (noir, rouge, orr, autre)]
    hors = noir.sum() + rouge.sum() + orr.sum()
    rel = [100 * x.sum() / hors for x in (noir, rouge, orr)]
    return tot, rel


def carte(img, chemin, seuil_rouge=0.06):
    noir, rouge, orr, autre = classer(img, seuil_rouge)
    out = np.zeros(noir.shape + (3,), dtype=np.uint8)
    out[noir] = (20, 20, 26)
    out[rouge] = (220, 30, 60)
    out[orr] = (240, 200, 60)
    out[autre] = (120, 120, 130)
    im = Image.fromarray(out)
    im.thumbnail((720, 2000))
    im.save(chemin)


def main():
    fichiers = ['bureau-long.png', 'bureau.png', 'mobile.png']
    cartes = '--cartes' in sys.argv
    print('Cible : 70 / 20 / 10 (noir-anthracite / rouge-pourpre / or), hors « autre ».\n')
    for f in fichiers:
        print(f'== {f}')
        print(f'{"piste":<12} {"ENSEMBLE  noir  rouge  or   autre":<36} {"HORS AUTRE  noir  rouge  or":<30} {"STRICT hors autre noir rouge or"}')
        for p in PISTES:
            im = Image.open(os.path.join(FRONT, p, f))
            (tn, tr, to, ta), (rn, rr, ro) = pourcents(im)
            _, (sn, sr, so) = pourcents(im, 0.12)
            print(f'{p:<12} {tn:13.1f} {tr:6.1f} {to:4.2f} {ta:6.1f}      {rn:12.1f} {rr:6.1f} {ro:4.2f}      {sn:14.1f} {sr:5.1f} {so:4.2f}')
            if cartes and f == 'bureau-long.png':
                os.makedirs(os.path.join(ICI, 'cartes'), exist_ok=True)
                carte(im, os.path.join(ICI, 'cartes', f'{p}-bureau-long.png'))
        print()


if __name__ == '__main__':
    main()
