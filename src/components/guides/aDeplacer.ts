/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  CE QUI A QUITTÉ /astuces ET ATTEND SA PAGE PROPRIÉTAIRE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Règle de la maison : un sujet, une page. /astuces n'est propriétaire que de « par où
 * commencer » ; tout le reste s'y réduit à une phrase et un lien. Deux blocs de ce
 * guide n'étaient PAS des redites — ils n'existent nulle part ailleurs dans le site —
 * et les supprimer aurait perdu du vrai. Ils sont donc gardés ICI, sans être rendus,
 * en attendant que leur page les accueille. Ce fichier n'est importé par personne :
 * c'est voulu, et c'est la seule chose qui reste à faire pour les remettre à l'écran.
 *
 * Ce qui a été retiré sans être gardé, parce que la page propriétaire le porte DÉJÀ :
 *  · perçage (cartes d'attaque et de défense), élément d'une pièce, fashion, gemmes de
 *    costume, runes, éveil → /builder/mecaniques a une section pour chacun ;
 *  · provenance des runes, parchemins d'éveil, étuis et coffrets de cartes →
 *    public/wiki/ou-trouver.json les porte, et /objets les affiche ;
 *  · les totaux de ressources du P1 au P10 → /prestige les calcule.
 *
 * Ce qui a été retiré et NE DOIT PAS revenir (demande de Maxime) : les taux
 * d'expérience et de penyas du serveur, les taux de chute, et l'avertissement sur le
 * butin ordinaire absent du client, qui n'existait que pour expliquer l'absence d'un
 * chiffre dont on se fiche.
 */

/**
 * ── DESTINATION : /monstres ────────────────────────────────────────────────────
 *
 * CE QUE LA PHRASE D'UN BOSS VEUT DIRE.
 *
 * Un boss d'Airborn ne parle pas pour le décor : chacune de ses phrases est une règle
 * de combat. Elle passe UNE fois dans le chat, souvent pendant qu'on tape. C'est de la
 * connaissance de boss, donc de la page des monstres — et elle n'est écrite nulle part
 * ailleurs : `grep` sur tout le site ne trouvait ces huit phrases que dans /astuces.
 *
 * `orbe` est l'asset du client (public/jeu/interface/<orbe>.webp, 20x20) : c'est
 * exactement l'orbe de couleur que le joueur voit à l'écran. `icone` est un nom de
 * src/lib/vg-icon-paths.ts pour les phrases qui n'ont pas d'orbe.
 *
 * Sept autres phrases existent dans le client ; seules celles-ci changent ce qu'on
 * fait dans la seconde. Deux imposent l'arme et se résument à une ligne : « vos lames
 * ne servent à rien ici » (magie obligatoire) et « vos arcanes sont vaines » (l'inverse).
 */
export const PHRASES_DE_BOSS: { orbe?: string; icone?: string; phrase: string; quoi: string }[] = [
  { orbe: "eelementtypeyellow01", phrase: "Éclat jaune", quoi: "Au corps à corps, et seulement au corps à corps." },
  { orbe: "eelementtypegreen01", phrase: "Éclat vert", quoi: "À distance. Les mêlées lâchent et attendent." },
  { orbe: "eelementtypepurple01", phrase: "Éclat violet", quoi: "Magie. Les physiques ne servent plus à rien." },
  { icone: "rotate-ccw", phrase: "« Chaque blessure que vous m'infligez sera la vôtre ! »", quoi: "Il renvoie les dégâts. Une variante ne les renvoie qu'au bout de trois secondes — c'est le pire piège, on croit que ça passe." },
  { icone: "alert", phrase: "« Rage : ne frappez pas avec le mauvais type de dégâts… »", quoi: "Mauvais type de dégâts et il double sa régénération : mieux vaut arrêter que taper faux." },
  { icone: "hand-point", phrase: "« Cessez d'attaquer ou vous serez punis. »", quoi: "On lâche tout, vraiment. Ce n'est pas du bluff." },
  { icone: "swords", phrase: "« Deux corps, un seul écho… »", quoi: "Deux boss, une seule mort : ils doivent tomber ensemble ou ils reviennent. On équilibre les points de vie avant d'achever." },
  { icone: "skull", phrase: "« Assez joué… »", quoi: "Phase enragée. C'est le moment des potions, pas celui de la gourmandise." },
];

/**
 * ── DESTINATION : /crafts ──────────────────────────────────────────────────────
 *
 * TROIS RECETTES QUI NE SONT DANS AUCUN RELEVÉ.
 *
 * Vérifié avant de les retirer de l'écran : public/wiki/crafts.json ne contient ni
 * « Liane », ni « Terreau », ni le badge du Jardin. Les COMPOSANTS existent bien dans
 * le catalogue d'objets (la Liane y porte même sa description : « obtenue sur les trash
 * mob de l'instance Ruine prestigieuse »), mais l'assemblage n'est écrit que là.
 *
 * Le badge du Jardin Prestigieux est le craft le plus rentable du début de partie :
 * c'est celui que le prestige réclame en plus grand nombre, et prestigeNeed() donne ce
 * nombre — ne le recopiez pas à la main.
 */
export const RECETTES_DE_BADGE: { resultat: string; composants: string[]; note?: string }[] = [
  {
    resultat: "Badge Jardin Prestigieux",
    composants: ["40 × Liane Ruine Prestigieuse", "1 × Terreau Ruine Prestigieuse"],
    note: "Les lianes tombent sur les trash mobs de la Ruine Prestigieuse, le terreau sur son boss.",
  },
  {
    resultat: "Morceau d'oeuf doré Britannia",
    composants: [
      "10 × morceau d'œuf doré de chacune des six sources : Britannia, Sentier Rhisis, Dédale Rhisis, Kalgas, Protection, Protection Supérieure",
      "20 × Œuf",
      "1 000 × Périn",
    ],
  },
  {
    resultat: "Morceau d'oeuf doré Britannia (version Tank)",
    composants: [
      "15 × morceau d'œuf doré des six mêmes sources",
      "15 × Catalyseur d'énergie de Bubble",
      "30 × Œuf",
      "1 500 × Périn",
    ],
    note: "Plus cher que la version classique, et il demande en plus les catalyseurs : à ne lancer que si le tank est le personnage principal.",
  },
];
