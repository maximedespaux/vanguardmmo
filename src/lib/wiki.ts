import fs from "node:fs";
import path from "node:path";
import { classeFr, elementParNom, elementPorte, FAMILLES, type ObjetFiche } from "@/components/objets/vocabulaire";
/* LA PROVENANCE EST LUE AILLEURS, ET C'EST UNE DÉDUPLICATION.
   `ou-trouver.json` était lu et traduit ici ET dans /api/ou-trouver, chacun avec sa
   version de la même fonction — et /objets, qui promet dans son sous-titre de chercher
   « par ce qui le lâche », n'en avait aucune. Le relevé est désormais lu UNE fois par
   `components/objets/provenance.ts`, qui rend les DEUX sens de la table : d'où vient un
   objet, et ce qu'un monstre lâche. `clef`, `reparer` et `lisible` viennent de là aussi :
   trois copies d'une même normalisation finissent par divertir. */
import { clefNom as clef, indexProvenance, lisible, reparer } from "@/components/objets/provenance";
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

/** Les libellés de famille, tels que les pastilles de /objets les écrivent. */
const LABEL_FAMILLE = new Map<string, string>(FAMILLES.map((f) => [f.clef, f.label]));

/* Les cinq éléments dessinés par le client ne sont plus une table LOCALE : ils
   vivaient ici sous leurs libellés français (« Foudre »), dans `objets/vocabulaire.ts`
   sous les codes du client (`ELECTRICITY`) et sous les clés du catalogue (« foudre »),
   et la table des monstres les nomme encore autrement (« electricite »). Quatre
   recopies du même fait, dont une portait le commentaire « ATTENTION AU NOM » parce
   qu'une confusion entre le libellé et le nom de fichier avait déjà affiché une image
   absente. `elementParNom` les accepte tous les quatre. */

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
        monstre lâche. C'est la même table, et personne ne la lisait à l'envers.

        ELLE N'EST PLUS LUE ICI. `components/objets/provenance.ts` la lit une seule fois
        pour tout le site, et rend les deux sens tout faits : ce fichier en était la
        troisième copie, et /objets — qui promet de chercher « par ce qui le lâche » —
        n'en avait aucune. */
  const { parObjet: provObjet, butinParMonstre: butinMonstre, noms: provenances } = indexProvenance();

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
      const dou = provObjet.get(clef(o.n)) ?? [];
      /* L'ÉLÉMENT DEVIENT UN DESSIN. 223 objets en portent un, et le champ `el` du
         catalogue est un CODE du client (`FIRE`, `ELECTRICITY`) : la ligne du wiki ne
         l'affichait donc pas du tout, faute de savoir le traduire. Le losange du jeu
         le dit sans un mot — et le mot-clé reste indexé plus bas. */
      const el = elementPorte(o.el) ?? undefined;
      tout.push(entree({
        t: "objet", id: String(o.i), nom: reparer(o.n),
        img: o.ic ? `/jeu/icones/${o.ic}` : null,
        el,
        grade: o.g === "Unique" ? "unique" : o.g === "Ultime" ? "ultimate" : undefined,
        href: `/objets/${o.i}`,
        maison: o.af === 1,
        // `niv.` seulement au-dessus de 1 : « niv. 1 » ne dit rien d'autre que
        // « aucune exigence », et il l'écrivait sur 7 000 lignes.
        sous: [o.t ?? famille ?? "Objet", (o.nr ?? 0) > 1 ? `niv. ${o.nr}` : null].filter(Boolean).join(" · "),
        mots,
        prov: provenance("Où le trouver", dou),
      // `dou` n'est PAS répété ici : `entree` indexe déjà les lignes de provenance.
      /* L'élément part en CLÉ et pas en pastille : « feu » doit rester tapable alors
         que l'écran, lui, montre le losange.
         LES DEUX NOMS DE LA FOUDRE, comme sur les monstres — et c'est un trou mesuré.
         `elementPorte` traduit le code du client `ELECTRICITY` par « Électricité », si
         bien que taper « foudre » ne trouvait que les 7 objets dont le NOM porte le mot
         et manquait les 17 autres (Baguette Horizon, Bâton Sege, Carte Fulgur…). Or
         `src/components/mecaniques/SectionsObjets.tsx` l'écrit noir sur blanc : « celui
         qu'on cherche en jeu est foudre ». `elementParNom` rend l'autre nom du même
         élément, donc les deux mots sortent les mêmes 24 pièces. */
      }, [famille ?? "", el?.label ?? "", elementParNom(el?.label)?.label ?? ""]));
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
      /* L'ÉLÉMENT QUITTE LA PASTILLE POUR LE DESSIN. 953 des 1 124 monstres portent un
         élément, et il s'écrivait « terre », « vent », « feu » — un mot sur les trois
         pastilles que la ligne montre, pour un fait que le client dessine. La table des
         monstres l'appelle « electricite » là où le catalogue d'objets dit « foudre » :
         `elementParNom` accepte les deux (voir objets/vocabulaire.ts). */
      const el = m.elem === "aucun" ? null : elementParNom(m.elem);
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
        el: el ?? undefined,
        href: `/monstres/${encodeURIComponent(m.id)}`,
        maison: m.maison,
        sous: [m.niv ? `niv. ${m.niv}` : null, m.rang].filter(Boolean).join(" · ") || "Monstre",
        mots,
        prov: provenance("Ce qu'il lâche", butinMonstre.get(clef(m.nom)) ?? []),
      // Le nom de l'élément reste en clé : « feu » doit sortir les monstres de feu même
      // si l'écran n'en montre plus que le losange. Les DEUX noms du relevé sont posés,
      // pour que « electricite » et « foudre » trouvent la même chose.
      }, [m.rang ?? "", m.elem ?? "", el?.label ?? ""]));
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
      // Les cinq recettes Baruna — orphelines, donc des échanges que le serveur ne
      // propose pas. Même règle que les objets ci-dessus, et /crafts les filtre déjà.
      if (HORS_SUJET.test(nom)) continue;
      const mots: string[] = [r.g];
      /* UNE RECETTE ÉTEINTE RESTE À L'ÉCRAN, et c'est la seule exception qu'on se
         donne : elle protège d'une erreur coûteuse. On rassemble les matériaux d'un
         échange que le serveur a coupé, et rien en jeu ne le dit avant d'avoir tout. */
      if (r.st !== "on") mots.push(r.st === "off" ? "recette éteinte" : "recette orpheline");
      tout.push(entree({
        t: "recette", id: String(r.id), nom,
        img: sortie.ic ? `/jeu/icones/${sortie.ic}` : null,
        href: `/crafts?q=${encodeURIComponent(nom)}`,
        // Les recettes maison d'Airborn sont regroupées par le relevé : masques,
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
        img: elementParNom(c.famille)?.image ?? null,
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
 *
 * ┌──────── ET LA QUATRIÈME FAMILLE : BARUNA. Règle de la maison, sans exception —
 * │ rien qui porte ce nom ne se compte ni ne s'affiche. L'index en servait 25 :
 * │ 20 objets (« Carte Feu de Baruna (SR) », « Bénédiction Baruna », « Absolution
 * │ Baruna »…) et 5 recettes, toutes ORPHELINES, c'est-à-dire des échanges que le
 * │ serveur ne propose pas.
 * │
 * │ Le retrait se fait ICI et pas au rendu, pour la raison que
 * │ `src/components/crafts/Atelier.tsx` a déjà payée : `META` est calculé sur l'index
 * │ bâti, donc un filtre à l'affichage aurait laissé l'en-tête annoncer plus de noms
 * │ que le champ n'en trouve. Et /crafts filtre déjà ces cinq recettes de son côté :
 * │ sans ce gabarit, le wiki rouvrait la porte que l'atelier venait de fermer.
 * └────────────────────────────────────────────────────────────────────────────────────
 */
const HORS_SUJET = /baruna/i;

function nomDObjet(o: ObjetFiche): boolean {
  if (!lisible(o.n)) return false;
  if (o.cle?.startsWith("II_WEA_MOB")) return false;
  if (o.n.startsWith("(Deck")) return false;
  if (HORS_SUJET.test(o.n)) return false;
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

/**
 * ┌──────── LES MOTS DANS N'IMPORTE QUEL ORDRE — le défaut le plus grave d'une porte
 * │ d'entrée, et il était mesurable en trois essais.
 * │
 * │ Tout ce qui précède cherche une SUITE de caractères. « epee luzaka » trouvait donc
 * │ une ligne ; « luzaka epee » ZÉRO, « demon ame » ZÉRO, « cristal foudre » ZÉRO —
 * │ alors que « Épée de Luzaka oubliée » et « Ame de démon » sont bien dans l'index.
 * │ Un joueur n'a aucun moyen de deviner que l'ordre compte : il tape deux mots dont il
 * │ se souvient, il obtient « Rien sous ce mot », et il conclut que le wiki ne connaît
 * │ pas l'objet. C'est le pire aveu possible pour la page qui prétend tout trouver.
 * │
 * │ La règle ajoutée : TOUS les mots tapés doivent être là, l'ordre est libre. Elle ne
 * │ sert qu'en DERNIER RECOURS — une suite exacte reste toujours mieux classée, sinon
 * │ « ame de demon » verrait ses deux vraies réponses noyées sous les 26 lignes qui
 * │ portent « ame » et « de » quelque part.
 * │
 * │ Le barème place le nom éparpillé (16) au-dessus du mot-clé contigu (14) : deux mots
 * │ retrouvés dans le nom valent mieux qu'un bonus qui contient la phrase. Et le
 * │ mélange nom + mot-clé tombe à 4, sous tout le reste : c'est la réponse de dernier
 * │ ressort, celle qu'on montre parce que la liste serait vide autrement.
 * └────────────────────────────────────────────────────────────────────────────────────
 *
 * ┌──────── LA CLÉ COMPACTE N'EST PAS OFFERTE À TOUS LES JETONS, et c'est un défaut
 * │ constaté sur le premier essai : « ame de demon » est passé de 2 réponses à 30.
 * │
 * │ La clé compacte colle les mots (« Ame de monstre de Dekanes » → « amedemonstre… ») :
 * │ le jeton « demon » y apparaît donc à cheval sur « ame » et « monstre », dans un nom
 * │ qui ne parle pas de démon. Sur une suite entière la faute est rare et déjà notée un
 * │ cran plus bas ; sur un jeton court elle est SYSTÉMATIQUE.
 * │
 * │ Seuil mesuré à 6 lettres : il garde le cas pour lequel la clé compacte existe —
 * │ « baaltru » (7) pour Bàäl'tru, dont l'apostrophe a été réduite à un espace — et
 * │ ferme la porte à « demon » (5), « ame » (3), « epee » (4).
 * └────────────────────────────────────────────────────────────────────────────────────
 */
const COMPACT_MIN = 6;

function noteJetons(e: Interne, jetons: string[]): number {
  const dansNom = (t: string) => e.kn.includes(t) || (t.length >= COMPACT_MIN && e.knc.includes(t));
  if (jetons.every(dansNom)) return 16;
  return jetons.every((t) =>
    dansNom(t) || e.kb.includes(t) || (t.length >= COMPACT_MIN && e.kbc.includes(t))) ? 4 : -1;
}

function note(e: Interne, q: string, qc: string, jetons: string[]): number {
  if (!q) return 0;
  const b = noteSur(e.knc, qc);
  // La version compacte est notée un cran plus bas : une correspondance « avec les
  // espaces au bon endroit » est plus sûre.
  const nom = Math.max(noteSur(e.kn, q), b > 0 ? b - 5 : b);
  if (nom > 0) return nom;
  const mc = noteMot(e.kbc, qc);
  const cle = Math.max(noteMot(e.kb, q), mc > 0 ? mc - 2 : mc);
  if (cle > 0) return cle;
  return jetons.length > 1 ? noteJetons(e, jetons) : -1;
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
function motsEnAvant(mots: string[], q: string, jetons: string[] = []): string[] {
  if (!q || mots.length < 2) return mots;
  /* Les JETONS comptent autant que la suite entière, et pour la même raison qu'ils
     comptent dans la note : « luzaka epee » ne correspond à aucun mot-clé en entier,
     donc sans eux la ligne remonterait ses trois premières pastilles au hasard et ne
     dirait toujours pas pourquoi elle est là. */
  const touche = (m: string) => { const k = clef(m); return k.includes(q) || jetons.some((j) => k.includes(j)); };
  const dedans = mots.filter(touche);
  if (!dedans.length || dedans.length === mots.length) return mots;
  return [...dedans, ...mots.filter((m) => !dedans.includes(m))];
}

/** TROIS LIGNES DE PROVENANCE, et celle qui a répondu d'abord. Un monstre lâche
 *  jusqu'à quinze objets : montrer les trois premiers de la liste quand on a cherché le
 *  quinzième donne une ligne qui ne parle pas de ce qu'on cherche. */
const MONTRE_PROV = 3;

function provEnAvant(p: Provenance | undefined, q: string, jetons: string[]): Provenance | undefined {
  if (!p) return undefined;
  const lignes = motsEnAvant(p.lignes, q, jetons).slice(0, MONTRE_PROV);
  return { titre: p.titre, lignes, total: p.total };
}

export function chercher(c: Critere, limite = 40): Reponse {
  const { TOUT: tout } = charger();
  const q = clef(c.q ?? "");
  const qc = compacter(q);
  /* Les jetons sont découpés UNE FOIS, pas 14 219 : `clef` a déjà réduit la ponctuation
     à des espaces, donc un découpage sur l'espace suffit. Les mots d'une seule lettre
     sortent — « d », « l », « a » sont dans presque tout et ne filtrent rien. */
  const jetons = q.split(" ").filter((m) => m.length > 1);

  const parType: Record<string, number> = {};
  let maison = 0;
  const gardes: { e: Interne; s: number }[] = [];

  for (const e of tout) {
    const s = note(e, q, qc, jetons);
    if (s < 0) continue;
    // Les comptes des pastilles IGNORENT le filtre qu'elles portent — sinon
    // « Monstres » afficherait 0 dès qu'on a choisi « Objets », et « Ajouts
    // Airborn » ne dirait plus combien il y en a.
    if (!c.maison || e.maison) parType[e.t] = (parType[e.t] ?? 0) + 1;
    if (e.maison && (!c.type || e.t === c.type)) maison++;
    if (c.type && e.t !== c.type) continue;
    if (c.maison && !e.maison) continue;
    gardes.push({ e, s });
  }

  gardes.sort((a, b) => {
    if (b.s !== a.s) return b.s - a.s;
    // À pertinence égale, CE QUI N'EXISTE QUE SUR AIRBORN passe devant : c'est la
    // règle de tri de tout le site, et c'est aussi ce qu'on ne trouve nulle part
    // ailleurs. Sans mot-clé, c'est donc l'écran d'accueil de la recherche.
    if (a.e.maison !== b.e.maison) return a.e.maison ? -1 : 1;
    const ra = RANG_TYPE.get(a.e.t) ?? 9, rb = RANG_TYPE.get(b.e.t) ?? 9;
    if (ra !== rb) return ra - rb;
    /* On classe sur la CLÉ et pas sur le nom affiché : les noms d'Airborn commencent
       souvent par un crochet (« [Familier] Rune… », « [Âme de la mort] Obnis ») et le
       crochet passe avant les lettres — l'ordre alphabétique remontait donc trente
       lignes de familiers en tête de l'écran d'accueil. La clé n'a pas de crochets. */
    return a.e.kn.localeCompare(b.e.kn, "fr");
  });

  /**
   * ┌──────── L'ÉCRAN D'ARRIVÉE MONTRE LES CINQ NATURES, PAS QUARANTE OBJETS.
   * │
   * │ Ce qu'il montrait, relevé sur le HTML servi : « 1e Fragment de pierre Précieuse
   * │ Koori · Objet · Divers / boîte », puis « 2e Fragment de pierre précieuse Koori ·
   * │ Objet · Divers / boîte », puis trente-huit lignes du même tonneau. Le tri sans
   * │ mot-clé met les ajouts Airborn devant, puis les objets (première nature du rang),
   * │ puis l'ordre alphabétique : les quarante lignes de la porte du site étaient donc
   * │ QUARANTE MATÉRIAUX DE CRAFT rangés par ordre alphabétique, et « Objet · Divers /
   * │ boîte » y était écrit trente fois. Six cents mots pour ne rien apprendre, et
   * │ surtout : rien ne laissait deviner que ce champ trouve aussi les monstres, les
   * │ recettes, les marchands et les compétences.
   * │
   * │ On distribue donc la tranche À TOUR DE RÔLE entre les cinq natures. Le budget de
   * │ mots ne bouge pas d'une ligne — huit objets, huit monstres, huit recettes, huit
   * │ PNJ, huit compétences — et il achète cinq fois plus : des portraits de marchands,
   * │ des monstres avec leurs vies et leur élément, des recettes avec leur artisan.
   * │ La porte MONTRE ce qu'elle sait ouvrir.
   * │
   * │ SEULEMENT SUR LA PORTE. Dès qu'un mot est tapé ou une nature choisie, l'ordre est
   * │ celui de la PERTINENCE et il ne se mélange pas : équilibrer les natures d'une
   * │ recherche sur « luzaka » ferait descendre la bonne réponse pour faire de la place
   * │ à un PNJ qui n'a rien à voir.
   * └────────────────────────────────────────────────────────────────────────────────────
   */
  const tranche = !q && !c.type ? aTourDeRole(gardes, limite) : gardes.slice(0, limite);

  const resultats = tranche.map(({ e }) => {
    // Les clés de recherche ne descendent pas au navigateur : elles ne servent qu'ici,
    // et elles doubleraient le poids de la réponse.
    const { kn: _a, knc: _b, kb: _c, kbc: _d, ...visible } = e;
    void _a; void _b; void _c; void _d;
    return { ...visible, mots: motsEnAvant(visible.mots, q, jetons), prov: provEnAvant(visible.prov, q, jetons) } as Entree;
  });

  return { resultats, total: gardes.length, montres: resultats.length, parType, maison };
}

/**
 * Une tranche répartie entre les natures, chacune gardant SON ordre.
 *
 * Un tour de rôle et pas un quota fixe de huit : si une nature s'épuise (les compétences
 * n'existent pas sous le filtre « Ajouts Airborn »), les autres se partagent la place au
 * lieu de laisser des lignes vides. L'ordre de sortie suit le rang des natures, pour que
 * la liste reste rangée et pas alternée ligne à ligne.
 */
function aTourDeRole<T extends { e: Interne }>(gardes: T[], limite: number): T[] {
  const files = new Map<string, T[]>();
  for (const g of gardes) {
    const f = files.get(g.e.t);
    if (f) f.push(g); else files.set(g.e.t, [g]);
  }
  const pris: T[] = [];
  const ordre = TYPES.map((t) => t.clef as string).filter((t) => files.has(t));
  for (let tour = 0; pris.length < limite; tour++) {
    let ajoute = false;
    for (const t of ordre) {
      const f = files.get(t)!;
      if (tour >= f.length || pris.length >= limite) continue;
      pris.push(f[tour]);
      ajoute = true;
    }
    if (!ajoute) break; // toutes les files sont vides : rien de plus à distribuer
  }
  return pris.sort((a, b) =>
    (RANG_TYPE.get(a.e.t) ?? 9) - (RANG_TYPE.get(b.e.t) ?? 9) || a.e.kn.localeCompare(b.e.kn, "fr"));
}
