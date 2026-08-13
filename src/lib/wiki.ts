import fs from "node:fs";
import path from "node:path";
import { classeFr, clefRecherche, FAMILLES, type ObjetFiche } from "@/components/objets/vocabulaire";
import { compacter, TYPES, type Entree, type Provenance, type Reponse, type TypeEntree } from "@/components/wiki/vocabulaire";

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  L'INDEX UNIQUE — une porte pour tout ce que le site sait nommer.         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Demande de Maxime : « mettre les mots clés de la base d'objet pour avoir un wiki
 * pour retrouver les monstres, les objets, drops etc… ».
 *
 * LE DÉFAUT MESURÉ : le site connaissait déjà chaque nom, mais DIX recherches
 * séparées les cherchaient, chacune sur son île. Un joueur qui tape « Âme de
 * démon » ne peut pas savoir si la réponse est sur /objets, /monstres ou /crafts —
 * il faut donc essayer les trois. La matière d'un wiki sans la porte d'un wiki.
 *
 * ┌──────────────── POURQUOI UN INDEX ET PAS SIX FETCH ────────────────┐
 * │ Les relevés lus ici totalisent ~6 Mo. Un import statique les        │
 * │ poserait dans le paquet JS de la page ; un fetch depuis le          │
 * │ navigateur ferait la même bêtise en différé. On les lit donc avec   │
 * │ `fs`, UNE fois, au premier appel, et on ne garde EN MÉMOIRE que     │
 * │ l'index réduit — le JSON parsé part au ramasse-miettes. C'est le    │
 * │ modèle exact de `src/lib/ouFarmer.ts`, `src/app/api/ou-trouver/`    │
 * │ et `src/components/monstres/catalogue.ts`.                          │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * CE FICHIER TOUCHE AU DISQUE : il ne doit JAMAIS être importé par un composant
 * client. Les types et les libellés partagés vivent dans
 * `src/components/wiki/vocabulaire.ts`.
 *
 * LES TAUX NE PASSENT PAS. `ou-trouver.json` porte des pourcentages de butin et des
 * chances de coffre : aucun ne traverse ce fichier. Ce qui sert, c'est QUI lâche et
 * QUOI — pas à quelle fréquence. Les prix de PNJ ne passent pas non plus.
 */

/* ─────────────────────────── les relevés, tels qu'ils sont ─────────────────────── */

type SourceBrute = Record<string, unknown> & { type: string };
type ObjetProvenance = { nom: string; sources: SourceBrute[] };

/* Les champs déclarés sont CEUX QU'ON LIT, pas tout le relevé : `monstres.json` en
   porte trente par ligne (PV, cadence, résistances…) et ils appartiennent à
   /monstres. La clé de recherche `k` du relevé n'est pas reprise non plus — la nôtre
   déplie « œ », la sienne non. */
type MonstreBrut = {
  id: string; nom: string; niv: number | null; rang: string | null;
  elem: string | null; zone: string | null; groupe?: string | null;
  lieux?: { z: string; n: number }[]; vies: number | null; maison: boolean;
};

type RecetteBrute = {
  id: number; g: string; st: string; pnj: string[];
  e: { n: string; q: number }[];
  s: { n: string; ic?: string | null; q: number }[];
};

type PnjBrut = {
  cle: string; nom: string; img: string | null; metier: string | null;
  ville: string | null; monnaies: string[];
  vend: { n: string }[]; troc: { n: string }[];
  craft: { s: string | null; l: string }[];
};

type CompetenceBrute = {
  id: string; nom: string; classe: string; palier: string; famille: string;
  type: string; arme?: string; stat?: string; zone?: string;
  nivPerso: number | null;
  debloque?: { id: string; nom: string; niveau: number }[];
};

/* ─────────────────────────────── l'index en mémoire ────────────────────────────── */

/**
 * QUATRE CLÉS PAR ENTRÉE, et deux niveaux de correspondance.
 *
 * `kn`/`knc` portent le NOM (avec puis sans séparateurs, la leçon de /monstres) ;
 * `kb`/`kbc` portent les MOTS-CLÉS. Les deux couples sont séparés exprès : un mot-clé
 * ne doit jamais devancer un nom. « dragon » tapé dans le champ doit sortir le monstre
 * qui s'appelle Dragon avant les quarante pièces dont un bonus mentionne un dragon.
 */
type Interne = Entree & { kn: string; knc: string; kb: string; kbc: string };

let TOUT: Interne[] | null = null;
/**
 * `butins` et `situes` SONT LÀ POUR UNE MISE EN GARDE, pas pour la décoration.
 *
 * `ou-trouver.json` porte un `avertissement` que le relevé s'est donné la peine
 * d'écrire : « le butin ordinaire des monstres n'est pas dans le client (calculé par le
 * serveur) ; l'absence d'une source ne signifie pas que l'objet ne tombe pas ». Il avait
 * disparu du site avec les TAUX qu'il servait à excuser — et sur cette page-ci il en
 * faut de nouveau un, pour une raison que les autres pages n'avaient pas : le bloc
 * « Ce qu'il lâche » annonce un TOTAL. « Aibatt — Morceau de cœur de Shade, Aile
 * d'Aibatt, Fragment de Cœur (4) » se lit comme la table complète du monstre, alors que
 * 819 monstres sur 1 124 n'ont aucun bloc du tout. Un joueur qui en conclut qu'un
 * monstre ne lâche pas ce qu'il cherche arrête de farmer pour rien : la mise en garde
 * change son geste, donc elle reste — et elle reste CHIFFRÉE sur les données.
 */
let META: {
  genere: string; total: number; parType: Record<string, number>; maison: number;
  provenances: number;
  /** Monstres qui portent un bloc « Ce qu'il lâche ». */
  butins: number;
  /** Objets qui portent un bloc « Où le trouver ». */
  situes: number;
} | null = null;

const lire = <T,>(...bouts: string[]): T =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), ...bouts), "utf8")) as T;

/**
 * LE « C½UR » DES RELEVÉS — un défaut d'encodage du client, réparé à la lecture.
 *
 * 407 occurrences dans les cinq relevés portent « ½ » là où le jeu écrit « œ » :
 * « Fragment de C½ur », « Boîte C½ur d'ange », « ½uf », « B½uf », « N½un½uf ». La
 * substitution est sans ambiguïté — aucun de ces textes ne parle de demi — et sans elle
 * le wiki affiche un nom cassé, ce qui est pire que pas de nom.
 */
const reparer = (s: string) => s.replace(/½/g, "œ");

/**
 * LA CLÉ DE RECHERCHE, avec la ligature dépliée.
 *
 * `clefRecherche` normalise en NFD, qui ne casse PAS « œ » (il faudrait NFKD) : la
 * ligature tombait donc dans le filtre de ponctuation et « Cœur de shade » devenait
 * « c ur de shade ». Un joueur qui tape « coeur » ne trouvait rien. On déplie donc les
 * deux ligatures du français avant de normaliser.
 */
const clef = (s: string) => clefRecherche(reparer(s).replace(/œ/g, "oe").replace(/æ/g, "ae"));

/**
 * UN NOM, OU RIEN. Des sources de `ou-trouver.json` et des champs de `pnj.json`
 * portent encore un code du client que le relevé n'a pas su résoudre — les trois formes
 * rencontrées sont `IDS_CHARACTER_INC_001185` (une table de textes),
 * `II_SYS_SYS_SCR_BXCAPEG` (une clé d'objet) et `WI_INSTANCE_OMINOUS` (un libellé de
 * bonus que le relevé n'a pas traduit, porté par la Clef Vampirique). Un code interne
 * n'est pas un renseignement : il disparaît, et la ligne prend une formulation
 * générique plutôt qu'un faux nom.
 *
 * LE SECOND MOTIF EST GÉNÉRAL EXPRÈS, et c'est une leçon payée ici : une liste de
 * préfixes (`IDS_`, `II_`) laisse passer le préfixe suivant. `WI_INSTANCE_OMINOUS`
 * s'affichait en pastille sur la Clef Vampirique parce qu'aucun préfixe connu ne le
 * couvrait. Toute chaîne qui n'est QUE des majuscules, des chiffres et des soulignés
 * est un code du client : le français n'écrit pas comme ça. Vérifié sur les six
 * relevés — un seul champ affiché correspond, celui-là.
 */
const CODE_CLIENT = /^(IDS_|II_[A-Z]|[A-Z][A-Z0-9]*_[A-Z0-9_]+$)/;

const lisible = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const s = reparer(v).trim();
  return s && !CODE_CLIENT.test(s) ? s : null;
};

/** Les libellés de famille, tels que les pastilles de /objets les écrivent. */
const LABEL_FAMILLE = new Map<string, string>(FAMILLES.map((f) => [f.clef, f.label]));

/**
 * Les cinq éléments dessinés par le client, pour les compétences élémentaires.
 * ATTENTION AU NOM : le fichier de la foudre s'appelle `element-electricite.webp` —
 * confondre le libellé et le nom de fichier affichait une image absente.
 */
const IMAGE_ELEMENT: Record<string, string> = {
  Feu: "/jeu/mecaniques/element-feu.webp",
  Eau: "/jeu/mecaniques/element-eau.webp",
  Vent: "/jeu/mecaniques/element-vent.webp",
  Terre: "/jeu/mecaniques/element-terre.webp",
  Foudre: "/jeu/mecaniques/element-electricite.webp",
};

/* ─────────────────────────── la provenance, sans les taux ──────────────────────── */

/**
 * Une source du client, en français et sans chiffre de chance.
 *
 * Le `rang` sert à trier : le BUTIN d'abord, parce que c'est la question posée
 * (« qui lâche ça ? »), puis le craft, puis les coffres. Un objet présent dans
 * quinze coffres afficherait sinon quinze lignes presque identiques avant la seule
 * qui répond.
 */
function libelleSource(s: SourceBrute): { rang: number; texte: string } | null {
  switch (s.type) {
    case "butin": {
      const m = lisible(s.monstre);
      if (!m) return null; // « lâché par un monstre » ne dit rien : la ligne part.
      const zone = lisible((s.zones as string[] | undefined)?.[0]);
      return { rang: 0, texte: `Lâché par ${m}${zone ? ` — ${zone}` : ""}` };
    }
    case "craft": {
      const pnj = lisible(s.pnj);
      return { rang: 1, texte: pnj ? `Fabriqué chez ${pnj}` : "Fabriqué par échange" };
    }
    case "craft-maison": {
      const ing = lisible(s.ingredient);
      return ing ? { rang: 1, texte: `Fabriqué avec ${ing}` } : null;
    }
    case "cle": {
      const c = lisible(s.cle);
      return c ? { rang: 2, texte: `Coffre ouvert avec « ${c} »` } : null;
    }
    case "coffre": {
      const c = lisible(s.coffre);
      return c ? { rang: 3, texte: `Dans « ${c} »` } : null;
    }
    case "tour":
      return { rang: 4, texte: `Protection de l'Oasis, palier ${s.palier ?? "?"}` };
    case "farm": {
      const sert = lisible(s.sert);
      return sert ? { rang: 5, texte: `Sert à fabriquer ${sert}` } : null;
    }
    default:
      return null;
  }
}

/**
 * LA LISTE ENTIÈRE EST GARDÉE, l'écran n'en montre que trois.
 *
 * On pourrait couper ici : 8 459 sources d'objets et 1 950 lignes d'étal, c'est trois
 * strings courtes par entrée — rien. Et les garder toutes sert deux fois : la recherche
 * les traverse (« qui lâche le Morceau de cœur de Shade ? » trouve les 266 monstres),
 * et la ligne montrée peut faire remonter CELLE qui a répondu au lieu des trois
 * premières venues. Le compte annoncé est le vrai : 266, pas 3.
 */
function provenance(titre: string, lignes: string[]): Provenance | undefined {
  if (!lignes.length) return undefined;
  return { titre, lignes, total: lignes.length };
}

/* ─────────────────────────────── la construction ───────────────────────────────── */

function charger() {
  if (TOUT && META) return { TOUT, META };
  const tout: Interne[] = [];
  const parType: Record<string, number> = {};
  let maison = 0;
  let genere = "";

  /* 1. LA PROVENANCE D'ABORD : les objets et les monstres s'en servent tous les deux.
        Le même relevé se lit dans les DEUX SENS — d'où vient un objet, et ce qu'un
        monstre lâche. C'est la même table, et personne ne la lisait à l'envers. */
  const provObjet = new Map<string, { rang: number; texte: string }[]>();
  const butinMonstre = new Map<string, string[]>();
  let provenances = 0;
  try {
    const ot = lire<{ objets: ObjetProvenance[] }>("public", "wiki", "ou-trouver.json");
    for (const o of ot.objets) {
      const vues = new Set<string>();
      const lignes: { rang: number; texte: string }[] = [];
      for (const s of o.sources) {
        const l = libelleSource(s);
        if (!l || vues.has(l.texte)) continue;
        vues.add(l.texte);
        lignes.push(l);
        if (s.type === "butin" && lisible(s.monstre)) {
          const k = clef(s.monstre as string);
          const liste = butinMonstre.get(k) ?? [];
          const nom = reparer(o.nom);
          if (!liste.includes(nom)) liste.push(nom);
          butinMonstre.set(k, liste);
        }
      }
      if (!lignes.length) continue;
      lignes.sort((a, b) => a.rang - b.rang);
      const k = clef(o.nom);
      const deja = provObjet.get(k);
      // Deux objets portent parfois le même nom (versions garçon/fille) : on fusionne
      // leurs sources plutôt que d'en laisser une masquer l'autre.
      if (deja) for (const l of lignes) { if (!deja.some((x) => x.texte === l.texte)) deja.push(l); }
      else { provObjet.set(k, lignes); provenances++; }
    }
  } catch { /* pas de relevé de provenance : les entrées existent sans ce bloc */ }

  /* 2. LES OBJETS — 12 134 lignes, et les mots-clés que la demande vise : famille,
        type, classe requise, grade, et LES LIBELLÉS DES BONUS. `objets-fiches.json`
        les porte déjà en français (le relevé a réaligné les codes DST_* du client sur
        les libellés de `src/data/statistiques-objets.json`), donc on ne relit pas
        `objets-stats.json` pour les retraduire : ce serait 1,1 Mo pour obtenir la
        même chose deux fois. */
  try {
    const cat = lire<{ genere?: string; objets: ObjetFiche[] }>("public", "wiki", "objets-fiches.json");
    for (const o of cat.objets) {
      if (!nomDObjet(o)) continue;
      const famille = LABEL_FAMILLE.get(o.f);
      /* CE QU'ON MONTRE : la classe, le grade, le sexe imposé, les bonus. La famille
         n'y est PAS — elle redit ce que la ligne du dessous porte déjà (« Épée à une
         main »), et une pastille qui répète le mot d'à côté n'apprend rien. Elle reste
         CHERCHABLE, en clé. */
      const mots: string[] = [];
      const cl = classeFr(o.cl);
      if (cl) mots.push(cl);
      if (o.g) mots.push(o.g);
      // 574 noms sont portés par plusieurs objets, et pour les pièces de mode c'est le
      // sexe imposé qui les distingue : sans lui, deux lignes identiques.
      if (o.sx) mots.push(o.sx === "male" ? "Homme" : "Femme");
      for (const [libelle] of o.b ?? []) {
        const l = lisible(libelle);
        if (l && !mots.includes(l)) mots.push(l);
      }
      const dou = (provObjet.get(clef(o.n)) ?? []).map((x) => x.texte);
      tout.push(entree({
        t: "objet", id: String(o.i), nom: reparer(o.n),
        img: o.ic ? `/jeu/icones/${o.ic}` : null,
        grade: o.g === "Unique" ? "unique" : o.g === "Ultime" ? "ultimate" : undefined,
        href: `/objets/${o.i}`,
        maison: o.af === 1,
        // `niv.` seulement au-dessus de 1 : « niv. 1 » ne dit rien d'autre que
        // « aucune exigence », et il l'écrivait sur 7 000 lignes.
        sous: [o.t ?? famille ?? "Objet", (o.nr ?? 0) > 1 ? `niv. ${o.nr}` : null].filter(Boolean).join(" · "),
        mots,
        prov: provenance("Où le trouver", dou),
      // `dou` n'est PAS répété ici : `entree` indexe déjà les lignes de provenance.
      }, [famille ?? ""]));
    }
    genere = cat.genere ?? "";
  } catch { /* sans catalogue d'objets la recherche reste utile sur le reste */ }

  /* 3. LES MONSTRES — et la lecture à l'envers de la table de butin : ce qu'ILS
        lâchent. C'est la moitié de la demande « retrouver les monstres, les objets,
        drops » que personne ne pouvait poser jusqu'ici. */
  try {
    const d = lire<{ monstres: MonstreBrut[] }>("public", "wiki", "monstres.json");
    for (const m of d.monstres) {
      const mots: string[] = [];
      // Les VIES d'abord : c'est le seul chiffre de cette ligne qu'on ne devine pas en
      // jeu. La barre de vie d'un boss annonce ses PV et pas les trente fois qu'il faut
      // les sortir.
      if ((m.vies ?? 0) > 1) mots.push(`${m.vies} vies`);
      if (m.elem && m.elem !== "aucun") mots.push(m.elem);
      if (m.zone) mots.push(m.zone);
      if (m.groupe) mots.push(reparer(m.groupe));
      for (const l of m.lieux ?? []) if (!mots.includes(l.z)) mots.push(l.z);
      tout.push(entree({
        t: "monstre", id: m.id, nom: reparer(m.nom),
        // IL N'EXISTE AUCUN MOYEN DE MONTRER À QUOI RESSEMBLE UN MONSTRE : les
        // textures du client sont nommées par empreinte et les modèles `mvr_*.o3d`
        // n'ont pas de table de correspondance — 1 sur 1 124. On ne montre donc
        // rien plutôt que l'image d'un autre.
        img: null,
        href: `/monstres/${encodeURIComponent(m.id)}`,
        maison: m.maison,
        sous: [m.niv ? `niv. ${m.niv}` : null, m.rang].filter(Boolean).join(" · ") || "Monstre",
        mots,
        prov: provenance("Ce qu'il lâche", butinMonstre.get(clef(m.nom)) ?? []),
      }, [m.rang ?? ""]));
    }
  } catch { /* idem */ }

  /* 4. LES RECETTES — cherchables PAR LEURS INGRÉDIENTS, ce que la fiche de l'objet
        ne permet pas : « qu'est-ce que je fais avec ces Cœurs de shade ? ». */
  try {
    const d = lire<{ recettes: RecetteBrute[] }>("public", "wiki", "crafts.json");
    for (const r of d.recettes) {
      const sortie = r.s[0];
      // 11 recettes sur 834 ne donnent AUCUN nom de sortie dans le client (des boîtes
      // aléatoires, des teintures orphelines). Une entrée de wiki sans nom ne se
      // cherche pas et ne s'affiche pas : un renseignement incomplet disparaît.
      if (!sortie?.n) continue;
      const nom = reparer(sortie.n);
      const mots: string[] = [r.g];
      /* UNE RECETTE ÉTEINTE RESTE À L'ÉCRAN, et c'est la seule exception qu'on se
         donne : elle protège d'une erreur coûteuse. On rassemble les matériaux d'un
         échange que le serveur a coupé, et rien en jeu ne le dit avant d'avoir tout. */
      if (r.st !== "on") mots.push(r.st === "off" ? "recette éteinte" : "recette orpheline");
      tout.push(entree({
        t: "recette", id: String(r.id), nom,
        img: sortie.ic ? `/jeu/icones/${sortie.ic}` : null,
        href: `/crafts?q=${encodeURIComponent(nom)}`,
        // Les recettes maison d'AirFlyff sont regroupées par le relevé : masques,
        // mantras, buffs, couturier, matériaux.
        maison: MAISON_CRAFT.has(r.g),
        sous: lisible(r.pnj[0]) ? `chez ${lisible(r.pnj[0])}` : "Échange",
        mots,
        prov: provenance("Ce qu'il faut", r.e
          .map((e) => (lisible(e.n) ? `${lisible(e.n)}${e.q > 1 ? ` ×${e.q.toLocaleString("fr-FR")}` : ""}` : null))
          .filter((x): x is string => Boolean(x))),
      // Les entrants sont déjà indexés par leurs lignes de provenance ; ce qui manque,
      // ce sont les sorties SECONDAIRES d'un échange qui en rend plusieurs.
      }, r.s.slice(1).map((x) => x.n ?? "")));
    }
  } catch { /* idem */ }

  /* 5. LES PNJ — et ce qu'ils proposent DANS LES MOTS-CLÉS : « qui vend une
        potion ? » se posait forcément, et il fallait deviner d'aller sur /pnj. */
  try {
    const d = lire<PnjBrut[]>("public", "wiki", "pnj.json");
    for (const p of d) {
      const nom = lisible(p.nom);
      if (!nom) continue;
      // Le métier et la ville sont DANS la ligne du dessous : les remettre en pastille
      // les écrirait deux fois. Restent les monnaies, qui ne sont nulle part ailleurs.
      const mots = p.monnaies.map((m) => reparer(m));
      const propose = [
        ...p.craft.map((c) => c.s ?? c.l),
        ...p.vend.map((o) => o.n),
        ...p.troc.map((o) => o.n),
      ].map(lisible).filter((x): x is string => Boolean(x));
      tout.push(entree({
        t: "pnj", id: p.cle, nom,
        img: p.img ? `/jeu/pnj/${p.img}` : null,
        href: `/pnj?pnj=${encodeURIComponent(p.cle)}`,
        maison: false,
        sous: [lisible(p.metier), lisible(p.ville)].filter(Boolean).join(" · ") || "PNJ",
        mots,
      // L'étal ENTIER est indexé — 1 950 lignes pour les 293 PNJ, dont 299 pour la
      // seule marchande de mode. « Qui vend ça ? » ne se pose pas que sur les vingt
      // premières, et les lignes de provenance portent déjà ces noms à l'index.
        prov: provenance("Ce qu'il propose", propose),
      }));
    }
  } catch { /* idem */ }

  /* 6. LES COMPÉTENCES — par classe, par arme, par élément. */
  try {
    const d = lire<{ competences: CompetenceBrute[] }>("public", "wiki", "competences.json");
    for (const c of d.competences) {
      // La classe est dans la ligne du dessous ; elle reste cherchable en clé.
      const mots = [c.type, c.famille, c.arme, c.stat, c.zone]
        .filter((x): x is string => Boolean(x))
        .filter((x, i, a) => a.indexOf(x) === i);
      tout.push(entree({
        t: "competence", id: c.id, nom: reparer(c.nom),
        // Le client ne donne pas d'icône par compétence. Quand la famille EST un
        // élément, il en dessine un : c'est la seule image honnête ici.
        img: IMAGE_ELEMENT[c.famille] ?? null,
        href: `/classes?comp=${encodeURIComponent(c.id)}`,
        maison: false,
        sous: [c.classe, c.nivPerso ? `niv. ${c.nivPerso}` : null].filter(Boolean).join(" · "),
        mots,
        prov: provenance("Ce qu'elle débloque", (c.debloque ?? []).map((x) => `${reparer(x.nom)} (niv. ${x.niveau})`)),
      }, [c.classe, c.palier]));
    }
  } catch { /* idem */ }

  let butins = 0, situes = 0;
  for (const e of tout) {
    parType[e.t] = (parType[e.t] ?? 0) + 1;
    if (e.maison) maison++;
    // Comptés sur l'index bâti, pas sur le relevé : c'est ce que l'écran montre
    // vraiment qui doit être annoncé.
    if (e.prov) { if (e.t === "monstre") butins++; else if (e.t === "objet") situes++; }
  }

  TOUT = tout;
  META = { genere, total: tout.length, parType, maison, provenances, butins, situes };
  return { TOUT, META };
}

/**
 * Les quatre clés se calculent une fois pour toutes : les recalculer à chaque frappe
 * sur 14 000 lignes se sentirait dans le champ de saisie.
 *
 * `cles` porte les mots CHERCHABLES MAIS NON AFFICHÉS — la famille d'un objet, la
 * classe d'une compétence (toutes deux déjà écrites dans la ligne du dessous), les
 * 24 articles d'un étal, les sources au-delà des trois montrées. Sans cette
 * séparation, il fallait choisir entre une liste de pastilles illisible et une
 * recherche à moitié aveugle : les mots-clés étaient les mêmes pour l'œil et pour
 * l'index, et l'un des deux devait perdre.
 */
function entree(e: Entree, cles: string[] = []): Interne {
  const kn = clef(e.nom);
  const kb = clef([e.sous, ...e.mots, ...(e.prov?.lignes ?? []), ...cles].join(" "));
  return { ...e, kn, knc: compacter(kn), kb, kbc: compacter(kb) };
}

/** Les groupes de recettes que le relevé désigne comme faits maison. */
const MAISON_CRAFT = new Set(["masques", "mantras", "buffs", "couturier", "materiaux"]);

/**
 * CE QUI N'EST PAS UN NOM N'ENTRE PAS DANS LE WIKI. Trois familles du catalogue, 352
 * lignes en tout, sortent de l'index — comptées, jamais devinées :
 *
 *  · `II_WEA_MOB_*` (292) — LES ARMES DES MONSTRES. « Arme de Wagsaac » existe douze
 *    fois, « Arme de Aibatt » douze fois : ce sont les objets que le serveur met dans
 *    la main d'un monstre pour calculer ses dégâts. Aucun joueur ne peut en obtenir un,
 *    et ils remplissaient les cinq premières lignes d'une recherche sur un nom de
 *    monstre avec douze copies identiques.
 *  · `(Deck …) Bonus :` (46) — un GABARIT de texte, pas un nom d'objet.
 *  · les 14 noms restés en `IDS_PROPITEM_TXT_*` — le client n'en donne aucun.
 *
 * Le compte de l'index est le même après l'élargissement de `CODE_CLIENT` aux codes
 * tout en majuscules : aucun NOM d'objet n'est écrit ainsi, seul un libellé de bonus
 * l'était.
 *
 * Ils restent dans `objets-fiches.json` et sur /objets, qui est le catalogue : un
 * catalogue montre tout ce qu'il y a. Un wiki, lui, répond à une question.
 */
function nomDObjet(o: ObjetFiche): boolean {
  if (!lisible(o.n)) return false;
  if (o.cle?.startsWith("II_WEA_MOB")) return false;
  if (o.n.startsWith("(Deck")) return false;
  return true;
}

/* ──────────────────────────────── la recherche ─────────────────────────────────── */

export type Critere = { q?: string; type?: TypeEntree | ""; maison?: boolean };

/**
 * LE CLASSEMENT COMPTE PLUS QUE LE FILTRAGE. « dragon » sort trente lignes et celle
 * qu'on cherche doit être dans les cinq premières. On note donc la QUALITÉ de la
 * correspondance — nom exact, début du nom, début d'un mot, n'importe où — avant de
 * trier sur autre chose. Même barème que `noteSur` de components/monstres/catalogue.ts.
 */
function noteSur(k: string, q: string): number {
  const p = k.indexOf(q);
  if (p < 0) return -1;
  if (k === q) return 100;
  if (p === 0) return 70;
  if (k[p - 1] === " ") return 50;
  return 20;
}

/** Un mot-clé vaut moins qu'un nom, TOUJOURS : les notes de nom partent de 20, celles
 *  de mot-clé plafonnent à 14. Sinon « Précision » (un bonus porté par 285 pièces)
 *  enterrerait l'objet qui s'appelle Précision. */
function noteMot(k: string, q: string): number {
  const p = k.indexOf(q);
  if (p < 0) return -1;
  return p === 0 || k[p - 1] === " " ? 14 : 7;
}

function note(e: Interne, q: string, qc: string): number {
  if (!q) return 0;
  const b = noteSur(e.knc, qc);
  // La version compacte est notée un cran plus bas : une correspondance « avec les
  // espaces au bon endroit » est plus sûre.
  const nom = Math.max(noteSur(e.kn, q), b > 0 ? b - 5 : b);
  if (nom > 0) return nom;
  const mc = noteMot(e.kbc, qc);
  return Math.max(noteMot(e.kb, q), mc > 0 ? mc - 2 : mc);
}

const RANG_TYPE = new Map(TYPES.map((t, i) => [t.clef as string, i]));

/** L'index est bâti au premier appel : ~6 Mo de relevés lus, puis oubliés. */
export function faitsWiki() {
  const { META: m } = charger();
  return m;
}

/**
 * LE MOT QUI A RÉPONDU PASSE DEVANT.
 *
 * Chercher « dégâts critiques » sortait « [Familier] Rune de dextérité » sans que rien
 * n'explique pourquoi : la correspondance venait du sixième bonus de la pièce, et les
 * pastilles montraient les deux premiers. Une ligne qui ne dit pas pourquoi elle est là
 * se lit comme une erreur de la recherche. On remonte donc en tête les mots-clés qui
 * contiennent ce qu'on a tapé — sur les quarante lignes montrées seulement, pas sur les
 * quatorze mille examinées.
 */
function motsEnAvant(mots: string[], q: string): string[] {
  if (!q || mots.length < 2) return mots;
  const dedans = mots.filter((m) => clef(m).includes(q));
  if (!dedans.length || dedans.length === mots.length) return mots;
  return [...dedans, ...mots.filter((m) => !dedans.includes(m))];
}

/** TROIS LIGNES DE PROVENANCE, et celle qui a répondu d'abord. Un monstre lâche
 *  jusqu'à quinze objets : montrer les trois premiers de la liste quand on a cherché le
 *  quinzième donne une ligne qui ne parle pas de ce qu'on cherche. */
const MONTRE_PROV = 3;

function provEnAvant(p: Provenance | undefined, q: string): Provenance | undefined {
  if (!p) return undefined;
  const lignes = motsEnAvant(p.lignes, q).slice(0, MONTRE_PROV);
  return { titre: p.titre, lignes, total: p.total };
}

export function chercher(c: Critere, limite = 40): Reponse {
  const { TOUT: tout } = charger();
  const q = clef(c.q ?? "");
  const qc = compacter(q);

  const parType: Record<string, number> = {};
  let maison = 0;
  const gardes: { e: Interne; s: number }[] = [];

  for (const e of tout) {
    const s = note(e, q, qc);
    if (s < 0) continue;
    // Les comptes des pastilles IGNORENT le filtre qu'elles portent — sinon
    // « Monstres » afficherait 0 dès qu'on a choisi « Objets », et « Ajouts
    // AirFlyff » ne dirait plus combien il y en a.
    if (!c.maison || e.maison) parType[e.t] = (parType[e.t] ?? 0) + 1;
    if (e.maison && (!c.type || e.t === c.type)) maison++;
    if (c.type && e.t !== c.type) continue;
    if (c.maison && !e.maison) continue;
    gardes.push({ e, s });
  }

  gardes.sort((a, b) => {
    if (b.s !== a.s) return b.s - a.s;
    // À pertinence égale, CE QUI N'EXISTE QUE SUR AIRFLYFF passe devant : c'est la
    // règle de tri de tout le site, et c'est aussi ce qu'on ne trouve nulle part
    // ailleurs. Sans mot-clé, c'est donc l'écran d'accueil de la recherche.
    if (a.e.maison !== b.e.maison) return a.e.maison ? -1 : 1;
    const ra = RANG_TYPE.get(a.e.t) ?? 9, rb = RANG_TYPE.get(b.e.t) ?? 9;
    if (ra !== rb) return ra - rb;
    /* On classe sur la CLÉ et pas sur le nom affiché : les noms d'AirFlyff commencent
       souvent par un crochet (« [Familier] Rune… », « [Âme de la mort] Obnis ») et le
       crochet passe avant les lettres — l'ordre alphabétique remontait donc trente
       lignes de familiers en tête de l'écran d'accueil. La clé n'a pas de crochets. */
    return a.e.kn.localeCompare(b.e.kn, "fr");
  });

  const resultats = gardes.slice(0, limite).map(({ e }) => {
    // Les clés de recherche ne descendent pas au navigateur : elles ne servent qu'ici,
    // et elles doubleraient le poids de la réponse.
    const { kn: _a, knc: _b, kb: _c, kbc: _d, ...visible } = e;
    void _a; void _b; void _c; void _d;
    return { ...visible, mots: motsEnAvant(visible.mots, q), prov: provEnAvant(visible.prov, q) } as Entree;
  });

  return { resultats, total: gardes.length, montres: resultats.length, parType, maison };
}
