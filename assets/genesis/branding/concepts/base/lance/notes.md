# G GENESIS : géométrie de base « héraldique à la lance »

**Idée.** Un croissant construit au compas, avec un cercle extérieur et une contre-forme excentrée vers la droite. Le flanc gauche est cassé en chevron « < » par deux ogives : l'une sur le contour extérieur, qui finit en épine, l'autre sur la contre-forme. Le haut s'effile en corne de croissant, obtenue avec deux tangentes et sans aucun coude. La barre est une lame à pointe droite, et elle bute sur la lance par une fourche qui sertit le cristal. La lance passe **devant** le G en haut, **derrière** en bas. Cet entrelacs laisse le bol intact, ce qui fait que la lettre ne paraît jamais coupée en deux. L'étoile du haut et la pointe du bas suivent la même construction (4 branches concaves), la pointe en plus petit.

**Itérations.**
- **v1.** Croissant rond et épine molle. Le G se lit déjà à 16 px, mais il ressemble à une lettre de police avec une épée posée dessus, et la lance flotte en trois morceaux.
- **v2.** Ogive à gauche, corne tangente, lance devant le G. Gain : la lance devient continue. Défaut : elle coupe le G en deux moitiés (jeux trop larges) et le poids est trop à gauche.
- **v3.** Poids rééquilibrés, entrelacs devant/derrière, jeux réduits à 6 px. Défaut : le terminal est redevenu une coupe de police.
- **v4.** Contre-forme en ogive, ce qui donne le vrai chevron, et le G devient anguleux. Le terminal corne + croc fait trop « Trajan ».
- **v5.** La pointe du bas devient une étoile effilée, en miroir hiérarchisé de l'étoile du haut.
- **v6.** Comparatifs côte à côte (voir les comparatif-*.png). Je retiens la corne de croissant (plus « lame » que l'empattement), la pointe de barre sur le dos et la barre abaissée à 500. Les pointes de la lance sont rentrées à 88 % du rayon. Je passe aussi l'aperçu métal en faces ciselées, parce que le biseau flou faisait plastique.
- **v7.** Le G glisse de 14 px à droite de la lance, comme sur la planche. Le centroïde passe de x = 464 à 480 et l'emblème se recentre dans le disque.
- **v8 (retenue).** Graisse remontée (contre-forme 252, fût 26 px) pour l'avatar à 40 px. L'épine se termine maintenant en pointe nette au lieu d'un fil, et les raccords fût/étoiles sont propres.

**Forces.**
- Le G se lit du premier coup à 32 px et se devine encore à 16 px, sur noir comme sur le gris Discord.
- La signature croix (lance verticale, épine et pointe de barre à l'horizontale) se reconnaît sans dominer la lettre.
- Le disque est tenu : rayon max 448 px, centroïde à (482, 516).
- Six pièces nommées et séparées, prêtes pour l'animation.

**Faiblesses, honnêtement.**
- Le G reste assez « typographique » : sa personnalité tient à l'épine, au chevron et à la corne, pas à une idée de forme radicale.
- Sous 24 px, le fût dans la contre-forme n'est plus qu'un trait gris, et la pointe du bas devient un point. Il faudra une variante F épaissie.
- La masse penche encore à gauche (centroïde 30 px à gauche de l'axe).
- L'épine (y = 512) et le dos de la barre (y = 500) ne sont pas alignés : c'est voulu, mais on peut le discuter.
- Dans l'aperçu, l'arête du fût suit approximativement la ligne médiane : c'est un effet du rendu d'essai, pas de la géométrie.
