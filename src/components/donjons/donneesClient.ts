import DONNEES from "@/data/donjons-client.json";

/**
 * CE QUE LE CLIENT DU JEU SAIT DES DONJONS, ET QUE LES CAPTURES NE DISAIENT PAS.
 *
 * La page des donjons a longtemps été un résumé de captures d'écran : type,
 * niveaux, PV conseillés, butin. La fouille des 84 archives de mondes du client
 * a livré ce qui manquait — le monde derrière chaque donjon, la taille réelle de
 * la carte, la coordonnée exacte de l'entrée, et surtout **le peuplement** :
 * quels monstres sont posés, à quel niveau, avec quels PV et quelles mécaniques
 * scriptées (rage à 20 % des PV, invocations de renforts).
 *
 * `donjons-client.json` est la réduction de `instances.json` (361 Ko) croisé avec
 * `monstres.json` (1,5 Mo) : 20 Ko, ce qui s'importe statiquement sans passer par
 * une route API. Le fichier est indexé par l'`id` de `dungeons.json`, pas par le
 * nom : les deux sources n'écrivent pas les noms pareil (« Chateau de Draken »
 * sans accent circonflexe côté client, « Forêt d’Euphrasia » avec l'apostrophe
 * typographique), et apparier par nom à l'exécution aurait cassé au premier
 * caractère près.
 *
 * DEUX MISES EN GARDE qui valent pour tout ce fichier :
 *
 * 1. Les monstres listés sont ceux **posés dans le fichier de carte**. Plusieurs
 *    boss finaux sont créés par le serveur au fil de la progression et n'y
 *    figurent pas — le Temple aérien n'a ainsi aucun monstre placé, et ça ne veut
 *    pas dire qu'il est vide.
 * 2. Le butin ORDINAIRE des monstres n'est pas dans le client : le serveur le
 *    calcule. Une absence de butin relevé ne dit jamais « ça ne tombe pas ».
 */
export type MonstrePose = {
  nom: string; niv: number; pv: number; rang: string; elem: string | null; points: number;
  atk?: number[];
  /** `[seuil en % de PV, facteur de dégâts]` — la rage scriptée du monstre. */
  rage?: number[];
  invoque?: { pv: number; n: number; nom: string }[];
  boss?: boolean;
  /** L'élément qui lui fait le plus mal, d'après sa table de résistances. */
  faible?: string;
  resiste?: string;
  aggro?: number;
  vole?: boolean;
};

export type DonjonClient = {
  monde: number;
  /** Le nom de la carte dans `World.inc`, souvent différent du nom affiché. */
  interne: string;
  dossier: string;
  blocs: number[];
  unites?: number[];
  interieur: boolean;
  vol: boolean;
  entree: number[];
  arrivee?: number[];
  /** Le monde d'où part le téléporteur : Madrigal, sauf la Faille du débutant. */
  depuis: string;
  /** Le prestige que le tooltip du client affiche — pas forcément celui du site. */
  prestigeClient: number | null;
  pvClient: number;
  zones?: string[];
  monstres: MonstrePose[];
  /** Sietch Kalgas seulement : ce que le serveur fait apparaître en plus. */
  horsCarte?: { nom: string; niv: number; pv: number; rang: string; role: string }[];
  etapes?: string[];
  noteButin?: string;
};

export type EtageTour = {
  etage: number; monde: number; carte: string; nom: string; unites: number[];
  boss: string; niv: number; pv: number; elem: string | null; points: number;
  faible?: string; sortie?: number[];
};

const TABLE = DONNEES as { donjons: Record<string, DonjonClient>; tourOubliee: EtageTour[] };

export const donjonClient = (id: number): DonjonClient | undefined => TABLE.donjons[String(id)];
export const TOUR_OUBLIEE = TABLE.tourOubliee;

/**
 * LES PLANS DE DONJON : quinze plans, sept vues aériennes, six donjons sans rien.
 *
 * Le compte n'est pas « vingt-deux sur vingt-trois » comme il l'a longtemps annoncé :
 * quatre vues aériennes ont été retirées après avoir été REGARDÉES, et cinq étages de
 * la Tour Oubliée se sont ajoutés. Il se recompte en lisant la table, pas la phrase.
 *
 * Les 26 plans du client (`dungeon_*.dds`) sont désormais convertis et versés,
 * ainsi que 71 vues aériennes — une par monde. On les branche par le dossier de
 * carte du client (`DuCastula`, `DuOphidian`) parce que c'est la seule clé
 * stable : les noms de fichiers viennent du client, pas du site.
 *
 * `genre` distingue les deux, et ce n'est pas cosmétique : un PLAN est le fond de
 * carte du jeu, lisible comme une carte ; une VUE AÉRIENNE est une photo du
 * terrain vue de dessus, jolie mais sans repère. La fiche ne les annonce donc pas
 * de la même façon.
 *
 * SIX DONJONS N'ONT RIEN À MONTRER, et c'est un choix : Faille du débutant et
 * Château de Draken côté vue n'ont pas de fichier ; les quatre autres en avaient un,
 * mais il ne montrait rien d'exploitable (voir le détail dans la table). La table
 * les omet plutôt que d'afficher un carré vide, et le composant ne rend rien quand
 * la clé manque. Une absence ne raconte rien de faux ; une image cassée, si.
 *
 * Table VÉRIFIÉE fichier par fichier à la génération : chaque `src` existe dans
 * public/. Regénérable depuis src/data/donjons-images.json.
 *
 * Les deux réglages optionnels servent le même plan, celui du Château de Draken,
 * et aucun n'est décoratif :
 *
 * - `filtre` : ce plan est un rendu de terrain non éclairé, un carré rouge uni où
 *   les couloirs existent mais sont invisibles à l'œil nu. Sans contraste, on
 *   affiche une image vide. À ne pas appliquer aux plans déjà lisibles, ça les
 *   brûle.
 * - `cadre` : `[x, y, largeur, hauteur]` en fraction de l'image. Les cartes du
 *   client font la taille du monde, pas celle du donjon — au Château de Draken,
 *   les salles occupent un quart de l'image et le reste est du vide. Recadrer se
 *   fait ici plutôt qu'en retouchant le fichier, parce que le fichier vient du
 *   client et sera reversé tel quel à la prochaine fouille.
 */
export const PLANS: Record<string, { src: string; genre?: "plan" | "aerien"; filtre?: string; cadre?: [number, number, number, number] }> = {
  DuCastula: {
    src: "/jeu/plans/ducastula_bigpicture.webp",
    filtre: "grayscale(0.6) contrast(2.5) brightness(1.1)",
    cadre: [0.05, 0.37, 0.5, 0.5],
  },
  DuOphidian: { src: "/jeu/plans/duophidian_bigmap.webp", genre: "plan" },
  DuRustia_1: { src: "/jeu/cartes-monde/dungeon_rustia_1.webp", genre: "plan" },
  DuUpresia: { src: "/jeu/cartes-monde/dungeon_upresia.webp", genre: "plan" },
  DuHerneos_1: { src: "/jeu/cartes-monde/dungeon_herneos_1.webp", genre: "plan" },
  /* QUATRE VUES AÉRIENNES ONT ÉTÉ RETIRÉES D'ICI, et c'est la réponse au « certaines
     map bug » de Maxime. Elles ont été regardées une par une, rendues à l'écran :

     · DuFrozen (Ruines givrées) — du noir traversé d'une bande de neige, ET un
       gribouillis de développeur laissé dans la texture du jeu : les caractères
       « xD » en haut à gauche. Même lisible par ailleurs, celle-là ne se montre pas.
     · DuFidge (Ruines prestigieuses) — un carré VERT UNI avec deux traits.
     · Skymap (Temple aérien) — des bandes horizontales qui se lisent comme une
       texture corrompue.
     · DuRhisisruins01 (Dédale de Rhisis) — du noir, deux bandes olive, et un
       fragment de construction minuscule dans un coin.

     LA RÈGLE POSÉE : quand aucune image n'est exploitable, on ne montre RIEN. Un
     carré noir ou vert sous le titre « la vue aérienne » se lit comme un site cassé,
     alors que l'absence, elle, ne raconte rien de faux. `PlanDonjon` ne rend
     déjà rien quand la clé manque — deux donjons étaient omis pour cette raison, ils
     sont six désormais.

     Les fichiers restent sur le disque : ils viennent du client et seront reversés
     tels quels à la prochaine fouille. Ce qu'on retire, c'est leur affichage.

     Et il n'y avait PAS de remplaçante : les 12 cartes parchemin encore libres ont
     été ouvertes et leurs cartouches lus — « Île Corail », « Herneos », « Désiréa »,
     « Mine de Dekanes », un « Temple… », une « Mine… ». Aucune ne désigne un de ces
     quatre donjons. (Au passage : le cartouche de dungeon_contaminatedtrails1 est en
     CORÉEN, ces cartes ne sont pas toutes localisées.) */
  DuSanpres: { src: "/jeu/cartes-monde/dungeon_sanpres.webp", genre: "plan" },
  DuOminous: { src: "/jeu/cartes-monde/dungeon_ominous.webp", genre: "plan" },
  DuCatacombes: { src: "/jeu/aerien/ducatacombes.webp", genre: "aerien" },
  DuDreadfulCave: { src: "/jeu/cartes-monde/dungeon_dreadfulcave.webp", genre: "plan" },
  DuBehamah: { src: "/jeu/cartes-monde/dungeon_behamah.webp", genre: "plan" },
  DuForteress: { src: "/jeu/aerien/duforteress.webp", genre: "aerien" },
  DuContaminatedTrails: { src: "/jeu/cartes-monde/dungeon_contaminatedtrails.webp", genre: "plan" },
  /* Les sept vues aériennes qui RESTENT ont été jugées sur ce qu'elles montrent, pas
     gardées par défaut. Elles ne sont pas des cartes — d'où le titre « La vue
     aérienne · le terrain vu de dessus, sans repère » — mais on y reconnaît le lieu :
     Jardin des Rois est un plan de bâtiment très lisible, Sanctuaire de Shogun et
     Jardin de Jade montrent leurs zones, Paradis Arcanique et Mausolée des divinités
     leur relief ; Catacombes et Bastion de l'Archange sont sombres, mais le tracé des
     salles s'y suit. */
  DuKalgas: { src: "/jeu/cartes-monde/dungeon_kalgas.webp", genre: "plan" },
  DuRuneyg: { src: "/jeu/aerien/duruneyg.webp", genre: "aerien" },
  DuElysianIsland: { src: "/jeu/aerien/duelysianisland.webp", genre: "aerien" },
  DuS525: { src: "/jeu/aerien/dus525.webp", genre: "aerien" },
  WdJapanese: { src: "/jeu/aerien/wdjapanese.webp", genre: "aerien" },
  DuKingdomGarden: { src: "/jeu/aerien/dukingdomgarden.webp", genre: "aerien" },
  /* LES CINQ ÉTAGES DE LA TOUR OUBLIÉE. Ils manquaient : la table est indexée sur
     le `dossier` des donjons du téléporteur, et un étage de la tour n'a pas de
     dossier — il a une `carte` (`WdHeaven01`). La clé est donc ici sa carte, ce qui
     reste dans le contrat de la table (« le dossier de carte du client »).

     Ce sont les meilleures images de tout le lot, et il ne faut surtout PAS leur
     appliquer le `filtre` du Château de Draken : ce sont des cartes sur parchemin
     finies, avec la rose des vents, le tracé des salles et — vérifié en ouvrant les
     fichiers — leur propre titre imprimé dessus en français, « Tour Oubliée B1 » à
     « B5 », qui correspond exactement au `nom` des données. Rien à recadrer, rien à
     contraster. */
  WdHeaven01: { src: "/jeu/cartes-monde/dungeon_wdheaven01.webp", genre: "plan" },
  WdHeaven02: { src: "/jeu/cartes-monde/dungeon_wdheaven02.webp", genre: "plan" },
  WdHeaven03: { src: "/jeu/cartes-monde/dungeon_wdheaven03.webp", genre: "plan" },
  WdHeaven04: { src: "/jeu/cartes-monde/dungeon_wdheaven04.webp", genre: "plan" },
  WdHeaven05: { src: "/jeu/cartes-monde/dungeon_wdheaven05.webp", genre: "plan" },
};

/**
 * LE SECOND NOM IMPRIMÉ — cinq donjons portent DEUX cartes dans le client.
 *
 * Les dix-sept cartes parchemin encore libres ont été ouvertes une par une et
 * lues agrandies. Cinq d'entre elles ne sont ni un étage 2 ni un lieu de plus :
 * c'est LE MÊME DESSIN, au trait près, avec un AUTRE NOM dans le cartouche. Le
 * constat a été fait en posant les deux fichiers côte à côte — même tracé, même
 * rose des vents, mêmes salles, mêmes libellés « Entrée » et « Salle du Boss » —,
 * et il ne s'appuie sur rien d'autre que ce qui est imprimé dessus.
 *
 *   dungeon_rustia_1            « Désiréa »                    (le nom du téléporteur)
 *   dungeon_rustia_2            « Désiréa (Maitre) »
 *   dungeon_upresia             « Forêt d'Euphrasia »          (le nom du téléporteur)
 *   dungeon_upresia_1           « Forêt Enchantée d'Euphrasia »
 *   dungeon_herneos_1           « Abysses d'Herneos »          (celle déjà branchée)
 *   dungeon_herneos             « Herneos »
 *   dungeon_ominous             « Fosse aux Esprits »          (le nom du téléporteur)
 *   dungeon_ominous01           « Fosse aux Esprits Perdus »
 *   dungeon_contaminatedtrails  « Chemin Contaminé de Rhisis » (le nom du téléporteur)
 *   dungeon_contaminatedtrails1  cartouche CORÉEN, sous-titré « Contaminated Rhisis of Trails »
 *
 * CE QU'ON N'ÉCRIT PAS, ET C'EST LA RÈGLE : aucun fichier de ce dépôt ne dit à
 * quoi sert le second nom. « (Maitre) » ressemble à un mode plus dur, « Perdus »
 * et « Abysses » à des variantes de fin de jeu — ressembler n'est pas savoir. Le
 * nom imprimé est la seule preuve, donc c'est la seule chose affichée : deux
 * cartouches pour un tracé. Le lecteur qui croise l'un des deux noms en jeu sait
 * au moins qu'il connaît déjà le plan.
 *
 * `dungeon_sanpres_1` est écarté exprès : son cartouche dit « USS Darkon » et son
 * DESSIN DIFFÈRE de celui d'USS Celestia. Ce n'est donc pas un second nom, c'est
 * une autre carte — et aucune donnée ne la rattache à quoi que ce soit.
 */
export const SECOND_NOM: Record<string, { cartouche: string; src: string }[]> = {
  DuRustia_1: [
    { cartouche: "Désiréa", src: "/jeu/cartes-monde/dungeon_rustia_1.webp" },
    { cartouche: "Désiréa (Maitre)", src: "/jeu/cartes-monde/dungeon_rustia_2.webp" },
  ],
  DuUpresia: [
    { cartouche: "Forêt d'Euphrasia", src: "/jeu/cartes-monde/dungeon_upresia.webp" },
    { cartouche: "Forêt Enchantée d'Euphrasia", src: "/jeu/cartes-monde/dungeon_upresia_1.webp" },
  ],
  DuHerneos_1: [
    { cartouche: "Abysses d'Herneos", src: "/jeu/cartes-monde/dungeon_herneos_1.webp" },
    { cartouche: "Herneos", src: "/jeu/cartes-monde/dungeon_herneos.webp" },
  ],
  DuOminous: [
    { cartouche: "Fosse aux Esprits", src: "/jeu/cartes-monde/dungeon_ominous.webp" },
    { cartouche: "Fosse aux Esprits Perdus", src: "/jeu/cartes-monde/dungeon_ominous01.webp" },
  ],
  DuContaminatedTrails: [
    { cartouche: "Chemin Contaminé de Rhisis", src: "/jeu/cartes-monde/dungeon_contaminatedtrails.webp" },
    { cartouche: "Contaminated Rhisis of Trails", src: "/jeu/cartes-monde/dungeon_contaminatedtrails1.webp" },
  ],
};

/** Les grands nombres de PV se lisent mieux abrégés : 570 350 000 → 570,4 M. */
export function pvCourt(pv: number): string {
  if (pv >= 1_000_000_000) return `${(pv / 1_000_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Md`;
  if (pv >= 1_000_000) return `${(pv / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  return pv.toLocaleString("fr-FR");
}

/* `coord()` a été retirée, et pas seulement parce qu'elle n'était plus appelée :
   c'est elle qui produisait les « 3 275, 4 242 » affichés sur les fiches de donjon
   et les étages de la tour. Un joueur ne peut rien faire d'un couple de nombres —
   le jeu n'affiche pas sa position et n'offre nulle part où la saisir. Les
   coordonnées restent dans donjons-client.json pour le jour où l'on saura poser
   une croix juste sur une carte de région ; ce qui a disparu, c'est la tentation de
   les remettre à l'écran telles quelles. */

/** La couleur d'un rang, pour qu'on repère un « super » sans lire l'étiquette. */
export const TON_RANG: Record<string, string> = {
  faible: "var(--text-muted)", normal: "var(--text)", capitaine: "var(--blue)",
  super: "var(--purple)", boss: "var(--red)",
};
