# G Genesis : géométrie « anneau facetté » (version retenue : v8)

**Idée.** Le G est un anneau épais (R 368, r 254, épaisseur constante 114) centré sur le disque de l'avatar. Seules des coupes droites le découpent : le terminal est une lame formée de deux tangentes (pente 15° côté contre-forme, 50° côté extérieur, pointe à 35°). La barre est une lame hexagonale aux pointes à 60°, posée sur l'anneau et sortant à droite. L'éperon est un flanc vertical qui équerre le coin bas de la contre-forme. Une étoile à 4 branches au zénith porte le cristal, une étoile plus petite au nadir tient l'axe vertical.

**Itérations.**
- v1 : épine gauche à 120°, terminal à facette 30°, cristal au centre. C'était lisible, mais on voyait une tête d'oiseau : le cristal faisait un œil et les deux pointes un bec. L'épine donnait une forme de citron.
- v2 : anneau pur, terminal coupé à l'horizontale, cristal déplacé en cimier. L'œil a disparu. Mais le G restait générique, la barre faisait un trapèze lourd et les piques nord et sud une boussole.
- v3 : coupe du terminal tangente à la contre-forme. Le terminal devient une vraie lame, sans cassure. Premières étoiles, mais leurs bras affleuraient l'anneau en « moustaches ».
- v4 : contre-forme à 12 pans essayée puis rejetée (polygone grossier, effet écrou). Le premier aperçu métal a montré que la barre à facettes basses ressemblait à un entonnoir.
- v5 : barre hexagonale en lame : le G se lit franchement. En revanche, la pointe nord n'était qu'à 24 px du bord du disque.
- v6 : éperon séparé en composant, étoiles décollées de l'anneau, cristal serti dans l'étoile nord. Toutes les pointes tiennent désormais dans un rayon de 448.
- v7 : correction du rendu seulement. L'éperon se fond dans l'anneau (plus de couture) et les faces ombrées tirent vers l'anthracite.
- v8 : facette tangente ajoutée sur le dos du terminal, qui passe d'une pointe à 49° à une pointe à 35° et fait plus forgé. J'ai testé deux options pour le sud : sans étoile sud, le haut fait queue de pomme ; avec une simple pique, elle se lit comme une cédille. J'ai donc gardé les deux étoiles.

**Forces.** Le G se lit au premier coup d'œil, encore à 16 px. Comme l'anneau est concentrique au disque, il est parfaitement centré dans l'avatar. Toutes les coupes sont cotées et reproductibles (tangentes, 15°, 30°, 50°). Les 6 composants sont nommés et séparés, ce qui permet de les animer.

**Faiblesses restantes.**
- La silhouette est sobre, proche d'un G géométrique de linéale : le caractère premium repose sur les finitions.
- En métal, la barre posée sur l'anneau fait « planche rapportée ». La passer derrière l'anneau demanderait de recouper la fin de l'anneau sur le dos de la barre.
- En aplat à 128 px, les bras latéraux de l'étoile nord font des oreilles.
- Le cristal est invisible en aplat ivoire.
- En métal à 32 px, la face ombrée amincit l'anneau : la finition F (Minimal) doit rester en aplat.
