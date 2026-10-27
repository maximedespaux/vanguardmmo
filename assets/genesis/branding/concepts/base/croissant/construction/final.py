"""Fichiers maîtres : géométrie v10, commentaire de construction en tête."""
import sys, os, subprocess, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.argv = ["final"]
spec = importlib.util.spec_from_file_location("v10", os.path.join(HERE, "v10.py"))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
import cbuild2
from cbuild2 import flat_svg, metal_svg, render, ROOT, B

comps, g = m.make(m.PRM)

COMMENT = """GENESIS : monogramme G, géométrie de base « croissant calligraphique » (maître de forme).
Repère : viewBox 0 0 1024 1024, y vers le bas ; angles en degrés mathématiques (0° = 3 h, 90° = 12 h).
Coordonnées arrondies au demi-pixel. Aplat ivoire #F2EDE5, fond transparent, aucun transform.
Ordre de superposition : g-corps, g-eperon, g-barre, g-cristal (chaque composant est autonome).

1. g-corps (un seul contour fermé : extérieur, pointe, lame, bec, contrepoinçon)
   Cercle extérieur C1 : centre O1 (516, 500), rayon 324 ; haut du G y 176, bas y 824.
   Pointe de 9 h : point W (176, 510), à 340 de O1 (16 px hors du cercle, 10 px sous son centre,
   pour que le plein tombe vers 8-9 h). Deux tangentes W vers C1, points de contact
   TU (204.5, 410.5) à 164° et TL (210.5, 607.5) à 199.4° ; demi-angle acos(324/340) = 17.7° ;
   ouverture de la pointe 144.6°.
   Contrepoinçon : ellipse E2, centre O2 (570, 500), demi-axes 220 x 262, inclinée de -8°
   (le haut penche à gauche : axe d'ombre oblique de la capitale lapidaire). E2 est décalée de 54 px
   à droite de O1, d'où la modulation : plein 158 vers 8 h 50 (174 jusqu'à la pointe W),
   délié haut 56 mini (x 624), délié bas 47 mini (x 668, juste avant la dague). Contraste environ 3:1.
   Lame supérieure : l'extérieur quitte C1 en A0 (627, 195.5) à 70°, part sur sa tangente
   (contrôle CTL (732, 234), à 112 px sur la tangente) et finit en pointe TIP (826, 208),
   à 43° et 426 du centre O1 : la courbe passe au-dessus de la tangente, la lame REMONTE vers 1 h 30.
   Bec : E2 s'arrête en I0 (664, 269) ; le contour descend en tangence à E2 (contrôle BQ (703, 293.5),
   à 46 px sur la tangente) jusqu'à la pointe du bec BARB (720, 360), puis une coupe concave
   (contrôle CUT (754, 284)) remonte à TIP.
   Pied : C1 s'arrête en B_OUT (778, 690.5), à -36°, et E2 en B_IN (704, 715) ; la corde B_OUT-B_IN
   est entièrement recouverte par la dague (le corps passe SOUS l'éperon).

2. g-barre (deux pièces : lame gauche, quillon droit)
   Dos horizontal y 480 (20 px au-dessus du centre de C1), fil bas y 552 : hauteur 72.
   Lame gauche effilée vers l'intérieur : pointe LT (528, 480) posée sur le dos, fil bas très
   légèrement bombé (Q 660 544) jusqu'au pied de la dague (694, 552).
   Quillon droit : pointe RT (868, 480), fil droit vers (794, 552).
   Les deux pièces sont coupées par le jour du cristal.

3. g-eperon (dague)
   Axe vertical x 744. Largeur 100 sous la barre (694 à 794, y 552), fils bombés
   (contrôles (702, 784) et (786, 784)), pointe DT (744, 876). Le haut est entaillé par le jour du cristal.

4. g-cristal
   Losange centré CC (744, 515), au croisement barre / éperon : demi-largeur 42, demi-hauteur 80.
   Jour régulier de 10 px mesuré perpendiculairement aux facettes : barre et éperon sont découpés
   par le losange homothétique de demi-axes 53.3 x 101.5 (sommets (744, 413.5), (797.3, 515),
   (744, 616.5), (690.7, 515)).

Encombrement : x 176 à 868, y 176 à 876. Point le plus éloigné du centre du disque : 436 px,
soit 85 % du rayon de l'avatar rond ; rien dans les coins.
Animation : chaque pièce est un groupe nommé ; les pivots naturels sont O1 (corps), CC (cristal,
barre, éperon) et l'axe x 744 (dague)."""

METAL = "Construction détaillée : voir l'en-tête de g-geometrie.svg (géométrie v10)."

os.makedirs(ROOT, exist_ok=True)
open(os.path.join(ROOT, "g-geometrie.svg"), "w").write(flat_svg(comps, COMMENT, head=True))
open(os.path.join(ROOT, "g-apercu-metal.svg"), "w").write(metal_svg(comps, METAL, head=True))
render(os.path.join(ROOT, "g-geometrie.svg"), os.path.join(ROOT, "geometrie.png"))
render(os.path.join(ROOT, "g-apercu-metal.svg"), os.path.join(ROOT, "apercu-metal.png"))
for p, c in (("geometrie.png", "controle-geometrie.png"), ("apercu-metal.png", "controle-metal.png")):
    subprocess.run(["python3", B + "/tools/preview.py", os.path.join(ROOT, p), os.path.join(ROOT, c)], stdout=subprocess.DEVNULL)
print("ok")
