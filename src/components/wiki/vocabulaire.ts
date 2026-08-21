import type { IconName } from "@/components/Icon";

/**
 * LE VOCABULAIRE DE LA RECHERCHE UNIQUE — la seule chose que le champ, la route
 * et l'index partagent.
 *
 * Aucun accès disque ici : ce fichier est importé par un composant client comme
 * par la route API. La lecture des relevés vit dans `src/lib/wiki.ts`, qui lit
 * avec `fs` et ne doit JAMAIS remonter dans un composant client — même modèle que
 * `components/objets/vocabulaire.ts` face à `components/objets/catalogue.ts`.
 */

/** Les cinq natures de choses que le site connaît par leur nom. */
export type TypeEntree = "objet" | "monstre" | "recette" | "pnj" | "competence";

/**
 * D'OÙ ÇA VIENT, OU CE QUE ÇA DONNE — et JAMAIS À QUELLE CHANCE.
 *
 * Demande de Maxime : « un wiki pour retrouver les monstres, les objets, drops ».
 * Le « drop » qui sert, c'est QUEL MONSTRE lâche QUEL OBJET ; le TAUX, non — il ne
 * change aucun geste et il quitte l'écran (il reste dans le relevé). Ce bloc porte
 * donc des noms, jamais un pourcentage.
 *
 * `total` existe pour la même raison que le compteur de la page : trois lignes sans
 * le total se lisent comme « il n'y en a que trois ».
 */
export type Provenance = { titre: string; lignes: string[]; total: number };

export type Entree = {
  t: TypeEntree;
  /** L'identifiant du client du jeu, tel que l'adresse de fiche l'emploie. */
  id: string;
  nom: string;
  /** Une image DU JEU, ou `null` quand il n'en existe aucune — on ne montre alors
   *  rien plutôt qu'une image cassée ou empruntée à autre chose. */
  img: string | null;
  /** Le grade du client, pour le cadre 32×32 : seuls les objets en portent. */
  grade?: "unique" | "ultimate";
  /** L'adresse de la fiche. Un résultat qui ne mène nulle part n'est pas un résultat. */
  href: string;
  /** Contenu propre à Airborn : il passe devant le jeu de base au classement. */
  maison: boolean;
  /** La ligne sous le nom : ce que c'est, en trois mots. */
  sous: string;
  /**
   * L'ÉLÉMENT, EN IMAGE — et pas en pastille de texte.
   *
   * 1 124 monstres et 223 objets de l'index portent un élément, et il était écrit :
   * « vent », « feu », « eau » en toutes lettres dans la liste des mots-clés. Le client
   * dessine ses cinq éléments, ces dessins servent déjà sur /monstres, sur le World
   * Boss et sur les fiches d'armure — le mot ne disait rien que le losange ne dise
   * mieux, et il occupait une pastille entière sur une ligne qui n'en montre que trois.
   *
   * Le mot reste CHERCHABLE : `entree()` l'indexe en clé, donc taper « feu » sort
   * toujours ce qui frappe au feu. C'est l'ÉCRAN qu'il quitte, pas l'index.
   */
  el?: { image: string; label: string };
  /** LES MOTS-CLÉS — ceux qu'on cherche ET ceux qu'on montre. C'est le point de la
   *  demande : « mettre les mots clés de la base d'objet ». */
  mots: string[];
  prov?: Provenance;
};

export type Reponse = {
  resultats: Entree[];
  /** Combien il y en a EN TOUT, et combien on en montre. Un plafond qui ne
   *  s'annonce pas se lit comme un inventaire complet. */
  total: number;
  montres: number;
  /** Le compte par nature, pour les critères courants : chaque pastille porte le
   *  sien, donc on sait ce qu'il y a derrière sans cliquer. */
  parType: Record<string, number>;
  /** Combien de réponses viennent d'Airborn, pour la pastille du même nom. */
  maison: number;
};

/** L'ordre est celui de l'intérêt : ce qu'on porte, ce qu'on affronte, ce qu'on
 *  fabrique, chez qui, et ce qu'on lance. Il sert aussi à départager deux
 *  réponses de même pertinence. */
export const TYPES: { clef: TypeEntree; label: string; unite: string; icon: IconName; couleur: string }[] = [
  { clef: "objet", label: "Objets", unite: "Objet", icon: "package", couleur: "var(--orange)" },
  { clef: "monstre", label: "Monstres", unite: "Monstre", icon: "skull", couleur: "var(--red)" },
  { clef: "recette", label: "Recettes", unite: "Recette", icon: "hammer", couleur: "var(--gold)" },
  { clef: "pnj", label: "PNJ", unite: "PNJ", icon: "users", couleur: "var(--blue)" },
  { clef: "competence", label: "Compétences", unite: "Compétence", icon: "sparkles", couleur: "var(--purple)" },
];

export const TYPES_VALIDES = TYPES.map((x) => x.clef) as string[];

export const infoType = (t: TypeEntree) => TYPES.find((x) => x.clef === t) ?? TYPES[0];

/**
 * LA CLÉ COMPACTE — la leçon déjà payée sur /monstres.
 *
 * `clefRecherche` (components/objets/vocabulaire.ts) enlève les accents et réduit
 * la ponctuation à des espaces : « [Âme de la mort] Obnis » devient « ame de la
 * mort obnis ». Reste le cas du joueur qui tape sans l'apostrophe : « baaltru »
 * pour Bàäl'tru. D'où la SECONDE clé, sans séparateurs. Sans elle, la moitié du
 * haut niveau était introuvable.
 */
export const compacter = (k: string) => k.replace(/ /g, "");
