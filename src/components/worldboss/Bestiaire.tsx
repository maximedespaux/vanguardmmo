"use client";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Bulle, Invisible } from "@/components/Bulle";
import { VoletSections, type SectionVolet } from "@/components/VoletSections";
import { PRESTIGE_COSTS } from "@/data/prestige";
import { NomObjet } from "@/components/objets/NomObjet";
import RELEVE from "@/data/worldboss-releve.json";
import { Faiblesses, SchemaVies } from "@/components/monstres/Graphiques";
import {
  bornesInversees, clefRecherche, coupMax, court, ELEMENT_FR, ELEMENTS, entier,
  iconeElement, parSeconde, tonRang,
} from "@/components/monstres/vocabulaire";

/**
 * QUI EST LA BÊTE — la moitié manquante de la page World Boss.
 *
 * La page ne portait qu'un calendrier : le staff annonce un passage, les membres
 * cliquent « présent ». On ne savait donc pas à QUOI on disait oui. Ce bloc-ci le
 * dit, et il le LIT dans les fichiers du jeu plutôt que de l'écrire à la main.
 *
 * ┌──────────── CE BLOC NE RECOPIE PAS UNE FICHE ────────────┐
 * │ /monstres est propriétaire du monstre : mécaniques,       │
 * │ résistances, butin, famille, tout est là-bas et chaque    │
 * │ nom d'ici y mène. Ce qui reste ici est ce qui sert à      │
 * │ DÉCIDER DE VENIR : combien de PV à sortir, combien de     │
 * │ dégâts par seconde en face, et ce que le passage rapporte.│
 * │ Trois tableaux, cinq encadrés de raisonnement et le       │
 * │ détail des gabarits ont été retirés pour cette raison —   │
 * │ pas parce qu'ils étaient faux, parce qu'ils étaient       │
 * │ ailleurs, deux fois.                                     │
 * └──────────────────────────────────────────────────────────┘
 *
 * ── LE CRITÈRE, ET POURQUOI IL EST DIFFICILE ──────────────────────────────────
 * Il n'existe AUCUN rang « world boss » dans Airborn : les monstres du client se
 * rangent en sept rangs et pas un ne porte ce mot. Deux marques, elles, sont
 * écrites noir sur blanc :
 *
 *   · un segment de l'identifiant client vaut exactement « WB ». Attention au faux
 *     ami : MI_COLOHOWBOW contient les lettres au milieu d'un mot, donc on découpe
 *     sur les tirets bas au lieu de chercher la sous-chaîne.
 *   · le nom affiché finit par « (Big Boss) ». Un monstre l'écrit SANS l'espace :
 *     il est relevé à part (`variantes`) plutôt que perdu en silence.
 *
 * On montre LES DEUX, chacun avec sa marque à l'écran, parce que rien dans les
 * fichiers ne permet de trancher entre eux — et qu'une liste inventée serait bien
 * pire qu'une liste courte et honnête.
 *
 * Tout ce qui est chiffré se recalcule sur `src/data/worldboss-releve.json` (15 Ko,
 * extrait de public/wiki/monstres.json qui en pèse 612 — on n'embarque pas 612 Ko
 * dans le navigateur pour douze lignes). Rien n'est saisi à la main : un compteur
 * écrit au clavier devient faux à la prochaine fouille sans que personne ne le voie.
 */

export type Bete = {
  id: string; nom: string; niv: number; rang: string;
  pv: number; vies: number; pvEff: number;
  atkMin: number; atkMax: number; delai: number;
  elem: string; elemNiv: number; res: Record<string, number>;
  def: number; resMag: number; prec: number; esq: number;
  zone: string | null; groupe: string | null; maison: boolean;
  agro: string | null; apparitions: number; zones: string[];
};
type Famille = {
  clef: string; titre: string; critere: string; note: string; monstres: Bete[];
  /** Les monstres que le filtre exact laisse tomber alors qu'ils portent la même
   *  marque écrite autrement. Montrés à part, jamais comptés avec les autres. */
  variantes?: Bete[];
};
type Recompense = { nom: string; icone: string; source: string; quoi: string };
type Paquet = {
  genere: string; catalogue: number; rangs: string[]; ranges: number; localises: number;
  familles: Famille[]; confusions: Famille[]; recompenses: Recompense[];
};

const R = RELEVE as unknown as Paquet;
const FAMILLES = R.familles;
const CONFUSIONS = R.confusions;

/** Les bêtes des deux relevés, à plat, chacune avec la marque qui l'a fait entrer :
 *  c'est UN tableau au lieu de trois, et la marque devient une colonne. Le nombre
 *  n'est pas écrit ici — il se compte, et il se comptait faux (cf. `compteMarque`). */
const MARQUE: Record<string, string> = { wb: "WB", bigboss: "(Big Boss)" };
const TOUTES: { m: Bete; marque: string; variante: boolean }[] = FAMILLES.flatMap((f) => [
  ...f.monstres.map((m) => ({ m, marque: MARQUE[f.clef] ?? f.clef, variante: false })),
  ...(f.variantes ?? []).map((m) => ({ m, marque: MARQUE[f.clef] ?? f.clef, variante: true })),
]);

/**
 * COMBIEN DE LIGNES PORTENT CETTE MARQUE — compté sur `TOUTES`, c'est-à-dire sur les
 * lignes que le tableau dessine.
 *
 * ┌──── LE DÉFAUT, ET IL SE VOYAIT À L'ADDITION ────┐
 * │ Les deux compteurs lisaient `f.monstres.length`  │
 * │ et ignoraient donc les `variantes` — les bêtes   │
 * │ que le filtre au caractère près laisse tomber et │
 * │ que le tableau montre quand même, à part. On     │
 * │ lisait « 6 » et « 6 » au-dessus d'un tableau de  │
 * │ SEPT lignes « (Big Boss) », sous une pastille de │
 * │ rail qui annonçait 13. Trois nombres pour deux   │
 * │ vérités. Compter sur `TOUTES` les rend           │
 * │ inséparables : leur somme EST le nombre de       │
 * │ lignes, par construction.                        │
 * └────────────────────────────────────────────────┘
 */
const compteMarque = (clef: string) => TOUTES.filter((t) => t.marque === MARQUE[clef]).length;

/** Les bêtes que le filtre exact laisse tomber, toutes familles confondues : le
 *  chiffre qui autorise la phrase « dont N l'écrit sans l'espace ». */
const VARIANTES = TOUTES.filter((t) => t.variante).length;

/* `coupMax`, `bornesInversees` et `parSeconde` viennent de
 * `components/monstres/vocabulaire.ts` et non d'ici : /monstres, la recherche et
 * cette page montrent les MÊMES monstres, et elles ont annoncé deux chiffres
 * différents pour la Divinité du Chaos (36 k contre 360 k) tant que chacune faisait
 * son propre calcul. */

/* ── Le rapprochement événement ↔ monstre ─────────────────────────────────────
   Le staff saisit le nom du boss À LA MAIN dans /gestion-worldboss : il n'y a pas
   de liste fermée, donc pas d'identifiant à joindre. On rapproche sur le nom
   normalisé (accents et apostrophes ôtés — « Bàäl'tru » se tape « baaltru »), et on
   accepte l'inclusion dans un sens ou dans l'autre : « Elun » doit retrouver
   « Elun, Premier Regard d'Ipuli ». Quand rien ne correspond, on le DIT au lieu de
   deviner : un mauvais rapprochement afficherait les points de vie d'un autre
   monstre, ce qui est pire que pas de chiffre du tout. */
const CANDIDATS = [...FAMILLES, ...CONFUSIONS]
  .flatMap((f) => [...f.monstres, ...(f.variantes ?? [])])
  .map((m) => ({ m, k: clefRecherche(m.nom) }));

export function monstreDeLEvenement(nom: string | null | undefined): Bete | null {
  const q = clefRecherche(nom ?? "");
  if (q.length < 3) return null;
  const exact = CANDIDATS.find((c) => c.k === q);
  if (exact) return exact.m;
  const inclus = CANDIDATS.filter((c) => c.k.includes(q) || q.includes(c.k));
  // Une seule réponse possible, sinon on s'abstient : « boss » attraperait tout.
  return inclus.length === 1 ? inclus[0].m : null;
}

/* ── Briques d'affichage ──────────────────────────────────────────────────── */

/** Longueur = grandeur, jamais la couleur : la teinte est celle que la colonne
 *  emploie déjà pour son chiffre. Plancher à 1,5 % pour qu'une valeur mille fois
 *  plus faible garde une barre au lieu de ressembler à une donnée manquante. */
function Barre({ part, teinte }: { part: number; teinte: string }) {
  return (
    <span aria-hidden="true" style={{ display: "block", height: 3, marginTop: 4, borderRadius: 2, background: "color-mix(in srgb, var(--border) 70%, transparent)" }}>
      <span style={{ display: "block", height: "100%", borderRadius: 2, background: teinte, width: `${Math.max(1.5, Math.min(100, part * 100))}%` }} />
    </span>
  );
}

/**
 * QUEL ÉLÉMENT EMPORTER — la seule question de préparation à laquelle le tableau
 * répond ligne par ligne sans jamais la résumer.
 *
 * ┌──────── POURQUOI CE BLOC EXISTE, ET CE QU'IL A REMPLACÉ ────────┐
 * │ Le tableau montre les faiblesses de chaque bête en icônes, et    │
 * │ une phrase disait « 6 sont faibles à leur PROPRE élément ». Ce   │
 * │ qui manquait était le geste : COMBIEN prennent plus de quoi.     │
 * │ Trois icônes et trois nombres le disent, et ils tiennent sur une │
 * │ ligne là où la lecture des treize lignes du tableau demandait de │
 * │ compter à la main. La phrase n'est pas perdue : son fait — un    │
 * │ élément qui a l'avantage sur lui-même, ce que la roue élémentaire│
 * │ ne produit jamais — est passé en bulle sur son propre chiffre.   │
 * └───────────────────────────────────────────────────────────────┘
 *
 * TOUT EST LU DANS LES CINQ COLONNES DE RÉSISTANCE, jamais déduit de la roue : ces
 * bêtes-là sont précisément celles qui sortent du moule. Rien n'est écrit à la main,
 * pas même le nombre d'éléments cités — le jour où la fouille en rend un quatrième,
 * il apparaît.
 */
function OuFrapper({ betes }: { betes: Bete[] }) {
  const par = new Map<string, number>();
  for (const b of betes) {
    for (const e of ELEMENTS) if ((b.res?.[e] ?? 0) < 0) par.set(e, (par.get(e) ?? 0) + 1);
  }
  const rangs = [...par].sort((a, b) => b[1] - a[1]);
  /** Faibles à leur PROPRE élément : le cas que la roue élémentaire ne produit pas. */
  const propre = betes.filter((b) => (b.res?.[b.elem] ?? 0) < 0).length;
  if (rangs.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 11, alignItems: "center", flexWrap: "wrap", fontSize: 12.5 }}>
      <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--text-muted)" }}>
        faibles à
      </span>
      {rangs.map(([e, n]) => (
        <span key={e} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 9px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconeElement(e)!} alt={ELEMENT_FR[e]} title={ELEMENT_FR[e]} width={17} height={17} style={{ objectFit: "contain" }} />
          <b style={{ fontVariantNumeric: "tabular-nums" }}>{n}</b>
        </span>
      ))}
      {propre > 0 && (
        <Invisible enJeu={`Un élément n'a jamais l'avantage sur lui-même : la roue élémentaire ne produit pas ça. C'est lu dans les cinq colonnes du client, bête par bête — ${propre} de ces ${betes.length} sont dans ce cas.`}>
          <span style={{ color: "var(--text-muted)" }}>dont {propre} à leur propre élément</span>
        </Invisible>
      )}
    </div>
  );
}

/**
 * LE MONSTRE EN BREF, à coller à côté d'un événement.
 *
 * Ce qu'il faut pour décider de venir, et rien de plus. Les points de vie affichés
 * sont les PV EFFECTIFS (PV × vies), le seul chiffre sur lequel on prépare un run.
 * Le reste est sur sa fiche, dont le lien est ici.
 */
export function BeteEnBref({ m }: { m: Bete }) {
  const seReleve = m.vies > 1;
  const tuile: React.CSSProperties = {
    background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8,
    padding: "5px 9px", fontSize: 11.5, fontVariantNumeric: "tabular-nums",
    display: "inline-flex", alignItems: "center", gap: 5,
  };
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "grid", gap: 9 }}>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: tonRang(m.rang) }}>{m.rang} · niveau {m.niv}</span>
        <span style={tuile}>
          <Icon name="heart" size={11} style={{ color: "var(--gn-accent)" }} />
          <b>{court(m.pvEff)}</b> PV à sortir
        </span>
        <span style={tuile}>
          <Icon name="sword" size={11} style={{ color: "var(--red)" }} />
          <b>{court(coupMax(m))}</b> par coup
        </span>
        <span style={tuile}>
          <Icon name="gauge" size={11} style={{ color: "var(--gold)" }} />
          <b>{court(parSeconde(m))}</b>/s
        </span>
        <span style={tuile}><Faiblesses res={m.res} /></span>
      </div>

      {/* Le schéma remplace les trois lignes qui expliquaient les vies. */}
      {seReleve && <SchemaVies pv={m.pv} vies={m.vies} pvEff={m.pvEff} taille="petite" />}

      {/* LE NOM DU MONSTRE RAPPROCHÉ EST DANS L'INFOBULLE DU LIEN, et c'est un garde-fou.
          Le staff tape le nom à la main, et `monstreDeLEvenement` accepte l'inclusion
          dans un sens ou dans l'autre — « Elun » retrouve « Elun, Premier Regard
          d'Ipuli ». Si le rapprochement se trompe un jour, le survol du lien le montre
          avant qu'on ait préparé un run sur les chiffres d'un autre monstre. Une
          infobulle et non une ligne de plus : le rapprochement est juste dans le cas
          normal, et l'écrire à l'écran répéterait le nom déjà affiché au-dessus. */}
      <Link href={`/monstres/${m.id}`} title={`${m.nom} — sa fiche complète`}
        style={{ fontSize: 11.5, color: "var(--gn-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
        <Icon name="arrow-right" size={12} /> Sa fiche complète
      </Link>
    </div>
  );
}

/** Quand le nom saisi ne retrouve aucun monstre du relevé. On le dit, on ne devine
 *  pas : afficher les points de vie d'un homonyme serait plus nuisible que rien. */
export function BeteInconnue({ nom }: { nom: string }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 11.5, color: "var(--text-muted)" }}>
      <Icon name="help" size={12} style={{ marginRight: 5, color: "var(--gold)" }} />
      Aucun monstre du client ne porte ce nom : les chiffres du combat restent inconnus pour ce passage.
    </div>
  );
}

/* ── Le tableau des douze ─────────────────────────────────────────────────── */

const th: React.CSSProperties = {
  textAlign: "right", padding: "7px 9px", fontSize: 10.5, textTransform: "uppercase",
  letterSpacing: ".5px", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  textAlign: "right", padding: "7px 9px", fontSize: 12, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
};

function Tableau({ lignes }: { lignes: { m: Bete; marque: string; variante: boolean }[] }) {
  const maxVie = Math.max(1, ...lignes.map((l) => l.m.pvEff));
  const maxSec = Math.max(1, ...lignes.map((l) => parSeconde(l.m)));
  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 660 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ ...th, textAlign: "left" }}>Monstre</th>
            <th style={{ ...th, textAlign: "left" }}>Marque</th>
            <th style={th}>Niv.</th>
            <th style={th}>PV à sortir</th>
            <th style={th}>Vies</th>
            <th style={th}>Par coup</th>
            <th style={th}>Par seconde</th>
            <th style={{ ...th, textAlign: "left" }}>Élément</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map(({ m, marque, variante }, i) => {
            const ps = parSeconde(m);
            const ic = iconeElement(m.elem);
            return (
              <tr key={m.id} style={{ borderTop: i ? "1px solid color-mix(in srgb, var(--border) 45%, transparent)" : "none" }}>
                <td style={{ ...td, textAlign: "left", whiteSpace: "normal", minWidth: 190 }}>
                  <Link href={`/monstres/${m.id}`} style={{ color: "var(--text)", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {ic && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ic} alt="" title={ELEMENT_FR[m.elem] ?? ""} width={14} height={14} style={{ objectFit: "contain", flexShrink: 0 }} />
                    )}
                    {m.nom}
                  </Link>
                  {m.groupe && <span style={{ display: "block", fontSize: 10.5, color: "var(--purple)" }}>{m.groupe}</span>}
                </td>
                <td style={{ ...td, textAlign: "left", fontSize: 11, color: "var(--text-muted)" }}>
                  {variante ? (
                    <Bulle quoi="Le client écrit le même suffixe SANS l'espace pour celui-là. Le filtre pris au caractère près le laissait tomber en silence, et son gabarit n'a rien de commun avec les autres : c'est une étiquette collée sur un nom, pas un modèle de monstre.">
                      <span>{marque} sans espace</span>
                    </Bulle>
                  ) : marque}
                </td>
                <td style={{ ...td, color: "var(--text-muted)" }}>{m.niv}</td>
                <td style={{ ...td, fontWeight: 700, color: "var(--gn-accent)", minWidth: 92 }}>
                  {court(m.pvEff)}
                  <Barre part={m.pvEff / maxVie} teinte="var(--gn-accent)" />
                </td>
                <td style={{ ...td, color: m.vies > 1 ? "var(--red)" : "var(--text-muted)", fontWeight: m.vies > 1 ? 700 : 400 }}>{m.vies}</td>
                <td style={td}>
                  {court(coupMax(m))}
                  {bornesInversees(m) && (
                    <Bulle quoi="Le client écrit ici une borne haute plus basse que sa borne basse. La colonne retient la plus haute des deux : retenir l'autre annoncerait un coup dix fois trop faible et rangerait le plus violent du tableau en dernier.">
                      <span style={{ color: "var(--gold)" }}>*</span>
                    </Bulle>
                  )}
                </td>
                <td style={{ ...td, fontWeight: 700, color: "var(--red)", minWidth: 92 }}>
                  {court(ps)}
                  <Barre part={ps / maxSec} teinte="var(--red)" />
                </td>
                <td style={{ ...td, textAlign: "left" }}><Faiblesses res={m.res} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Le bloc ─────────────────────────────────────────────────────────────── */

export function BestiaireWorldBoss() {
  const wb = FAMILLES.find((f) => f.clef === "wb")!;
  const bb = FAMILLES.find((f) => f.clef === "bigboss")!;
  const guilde = CONFUSIONS.find((f) => f.clef === "guilde")!;

  // Tout ce qui suit est CALCULÉ. Un « les 6 boss de… » écrit à la main mentirait
  // à la première fouille du client où il y en aurait sept.
  const betes = TOUTES.map((t) => t.m);
  const plusGros = [...betes].sort((a, b) => b.pvEff - a.pvEff)[0];
  const plusViolent = [...betes].sort((a, b) => parSeconde(b) - parSeconde(a))[0];
  const sansCarte = betes.filter((m) => m.apparitions === 0);
  /* Les faiblesses — dont celles qui portent sur le PROPRE élément de la bête, ce que
     la roue élémentaire ne produit jamais — se comptent dans `OuFrapper`, à côté des
     icônes qu'elles font apparaître : le chiffre et son dessin ne peuvent plus
     diverger. */
  /* `poses` a disparu d'ici : la zone d'un boss de siège est maintenant écrite SUR sa
     pastille, avec l'épingle du jeu. Une liste calculée pour fabriquer une phrase
     « seul X est posé… » n'avait plus de raison d'exister. */

  // Le badge de prestige : les paliers et le total se lisent dans PRESTIGE_COSTS,
  // la même source que la page Prestige. Deux pages, un seul chiffre.
  const CLEF_BADGE = "Badge World Boss prestigieux";
  const paliers = Object.entries(PRESTIGE_COSTS)
    .filter(([, c]) => c[CLEF_BADGE])
    .map(([p, c]) => ({ palier: Number(p), n: c[CLEF_BADGE] }))
    .sort((a, b) => a.palier - b.palier);
  const totalBadges = paliers.reduce((s, p) => s + p.n, 0);

  const sections: SectionVolet[] = [

    {
      clef: "betes", titre: "Les bêtes du relevé", sous: "qui c'est, et ce qu'il faut lui sortir", icon: "skull",
      compte: TOUTES.length,
      contenu: (
        <div style={{ display: "grid", gap: 13 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(132px,1fr))", gap: 8 }}>
            <Chiffre valeur={String(compteMarque("wb"))} quoi={<Bulle quoi={wb.critere}><span>marqués « WB »</span></Bulle>} ton="var(--gn-accent)" />
            {/* Le compte inclut les variantes, et la bulle dit combien : sans ça, deux
                compteurs à 6 coiffaient un tableau de treize lignes. */}
            <Chiffre valeur={String(compteMarque("bigboss"))} ton="var(--purple)"
              quoi={
                <Bulle quoi={`${bb.critere}${VARIANTES > 0 ? ` ${VARIANTES} d'entre eux l'écrit sans l'espace : il est compté ici, et marqué comme tel dans le tableau.` : ""}`}>
                  <span>nommés « (Big Boss) »</span>
                </Bulle>
              } />
            <Chiffre valeur={court(plusGros.pvEff)} quoi="le plus gros, PV à sortir" ton="var(--red)" />
            <Chiffre valeur={`${court(parSeconde(plusViolent))}/s`} quoi="le plus violent, par seconde" ton="var(--red)" />
          </div>

          <Tableau lignes={TOUTES} />

          {/* Le résumé des faiblesses a pris la place de la phrase « N sont faibles à
              leur PROPRE élément » : même fait, et en plus le geste — quel élément
              emporter, et contre combien d'entre elles. */}
          <OuFrapper betes={betes} />

          {/* TRENTE MOTS DEVENUS HUIT. La phrase reste utile — elle empêche de partir
              chercher un point d'apparition qui n'existe pas — mais elle n'a pas besoin
              d'occuper deux lignes sous un tableau : c'est un fait qu'on lit une fois.
              Une `Bulle` et non un `Invisible` : la section en porte déjà un, et si tout
              est marqué « hors jeu » plus rien ne l'est. */}
          {sansCarte.length === betes.length && (
            <div style={{ fontSize: 12 }}>
              <Bulle quoi="Les fichiers de carte du client ne posent aucune de ces bêtes : c'est le serveur qui les fait sortir. Chercher leur point d'apparition en jeu ne donne rien — l'annonce du staff, en haut de cette page, est la seule indication d'endroit et d'heure qui existe.">
                <span>Aucune n’a de point d’apparition dans le client</span>
              </Bulle>
            </div>
          )}
        </div>
      ),
    },

    {
      clef: "rapporte", titre: "Ce que ça rapporte", sous: `les ${R.recompenses.length} objets du passage`, icon: "coins",
      compte: R.recompenses.length,
      contenu: (
        <div style={{ display: "grid", gap: 13 }}>
          {/* LES TROIS NOMS MÈNENT QUELQUE PART. C'étaient des étiquettes mortes : on
              lisait « Coffre du Regard Scellé » sans pouvoir savoir ce qu'il y a
              dedans. `NomObjet` ouvre sa fiche du catalogue et sa provenance, et il
              ne charge la provenance qu'à l'ouverture de la bulle — trois requêtes au
              survol, aucune au chargement. */}
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {/* Une pastille en RANGÉE et non une tuile verticale : `NomObjet` pose
                l'icône à côté du nom, et un nom de quatre mots dans 116 px de large se
                cassait sur trois lignes sous une image centrée.
                (Le commentaire est ICI et pas dans le corps de la flèche : entre les
                parenthèses d'un `return` implicite on est en contexte d'EXPRESSION, où
                un commentaire entre accolades devient un objet vide et met la page en
                500. Piège de la maison, payé une fois de plus.) */}
            {R.recompenses.map((o) => (
              <span key={o.nom} style={{ display: "inline-flex", alignItems: "center", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "7px 12px", fontSize: 12, lineHeight: 1.3 }}>
                <NomObjet nom={o.nom} icone={o.icone} taille={26} />
              </span>
            ))}
          </div>

          {/* LE BADGE EXIGÉ PAR LE PRESTIGE, EN PALIERS DESSINÉS.
              La phrase disait « Le prestige en réclame 4. 1 au palier 7, 1 au palier 8
              et 2 au palier 9. C'est la raison concrète de cliquer présent plus haut —
              les coûts sont sur la page Prestige » : trente mots pour trois couples de
              nombres et un lien. Une rangée de plaquettes les montre, et la motivation
              (« la raison de cliquer présent ») était de la prose — le titre de la
              section la dit déjà.
              Les paliers et les quantités se lisent dans PRESTIGE_COSTS, la même source
              que la page Prestige : deux pages, un seul chiffre. */}
          {paliers.length > 0 && (
            <div style={{ border: "1px solid color-mix(in srgb, var(--gold) 38%, transparent)", background: "color-mix(in srgb, var(--gold) 7%, transparent)", borderRadius: 10, padding: "11px 13px", display: "flex", gap: 11, flexWrap: "wrap", alignItems: "center" }}>
              <span className="font-heading" style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>
                {totalBadges}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>badges exigés par le prestige</span>
              <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                {paliers.map((p) => (
                  <span key={p.palier} title={`${p.n} au palier ${p.palier}`}
                    style={{ display: "inline-flex", alignItems: "baseline", gap: 4, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 7, padding: "3px 9px", fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ color: "var(--text-muted)" }}>palier</span>
                    <b>{p.palier}</b>
                    <b style={{ color: "var(--gold)" }}>×{p.n}</b>
                  </span>
                ))}
              </span>
              <Link href="/prestige" style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--gn-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="arrow-right" size={12} /> Les coûts
              </Link>
            </div>
          )}
        </div>
      ),
    },

    {
      clef: "confusion", titre: "Ne pas confondre", sous: "les boss de siège de guilde", icon: "help",
      compte: guilde.monstres.length,
      contenu: (
        <div style={{ display: "grid", gap: 11 }}>
          {/* DIX-SEPT MOTS DEVENUS NEUF. « appartiennent au siège de guilde, pas à un
              passage de world boss » disait deux fois la même chose : le titre de la
              section est déjà « Ne pas confondre », et son sous-titre « les boss de
              siège de guilde ». Ce qui reste est le seul mot qui manque à ces deux-là. */}
          <p style={{ fontSize: 12.5, margin: 0, lineHeight: 1.6 }}>
            <Bulle quoi={guilde.critere}><span>{guilde.monstres.length} monstres</span></Bulle>{" "}
            du <b>siège de guilde</b> — aucun passage annoncé ne les concerne.
          </p>
          {/* LA ZONE EST SUR LA PASTILLE, plus dans une phrase à part. « Seul X (zone)
              est posé dans une carte du client » : douze mots pour situer UN monstre,
              alors que l'épingle sur sa pastille le dit, et que son absence sur les
              trois autres dit l'autre moitié — le client ne les pose nulle part. La
              DESTINATION, jamais un couple de coordonnées : un nombre ne se situe pas
              quand on est dans le jeu. */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {guilde.monstres.map((m) => (
              <Link key={m.id} href={`/monstres/${m.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 20, padding: "5px 12px", fontSize: 12.5, color: "var(--text)", textDecoration: "none" }}>
                {m.nom}
                <b style={{ color: "var(--gn-accent)", fontVariantNumeric: "tabular-nums" }}>{court(m.pvEff)}</b>
                {m.zones.length > 0 && (
                  <span title={`Posé dans : ${m.zones.join(", ")}`} style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--text-muted)", fontSize: 11 }}>
                    <Icon name="map-pin" size={11} />{m.zones.join(", ")}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ marginTop: 26 }}>
      <div className="font-heading" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 12 }}>
        Le monstre, pas seulement l&apos;horaire
      </div>
      <VoletSections sections={sections} />
    </div>
  );
}

function Chiffre({ valeur, quoi, ton = "var(--text)" }: { valeur: string; quoi: React.ReactNode; ton?: string }) {
  return (
    <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 11px" }}>
      <div className="font-heading" style={{ fontSize: 17, fontWeight: 700, color: ton, fontVariantNumeric: "tabular-nums" }}>{valeur}</div>
      <div style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.3 }}>{quoi}</div>
    </div>
  );
}
