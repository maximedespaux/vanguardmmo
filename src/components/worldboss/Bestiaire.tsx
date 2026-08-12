"use client";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { VoletSections, type SectionVolet } from "@/components/VoletSections";
import { PRESTIGE_COSTS } from "@/data/prestige";
import RELEVE from "@/data/worldboss-releve.json";
import {
  A_L_ELEMENT, AVERTISSEMENT_BUTIN, bornesInversees, cadence, clefRecherche, coupMax,
  court, ELEMENT_FR, ELEMENTS, enListe, entier, faiblesses, iconeElement, tonRang,
} from "@/components/monstres/vocabulaire";

/**
 * QUI EST LE MONSTRE — la moitié manquante de la page World Boss.
 *
 * La page ne portait qu'un calendrier : le staff annonce un passage, les membres
 * cliquent « présent ». On ne savait donc pas à QUOI on disait oui — ni les points
 * de vie, ni les dégâts, ni l'élément, ni ce que ça rapporte. Ce bloc-ci le dit,
 * et il le LIT dans les fichiers du jeu plutôt que de l'écrire à la main.
 *
 * ── LE CRITÈRE, ET POURQUOI IL EST DIFFICILE ──────────────────────────────────
 * Il n'existe AUCUN rang « world boss » dans AirFlyff : les monstres du client se
 * rangent en sept rangs (faible, normal, capitaine, demi-boss, boss, super,
 * materiau — deux monstres n'en portant aucun) et pas un ne porte ce mot. Répondre
 * par un filtre de rang était donc impossible. Deux marques, elles, sont écrites
 * noir sur blanc :
 *
 *   · un segment de l'identifiant client vaut exactement « WB » — l'abréviation de
 *     World Boss. Six monstres sur 1 124, et un seul et même gabarit de stats.
 *     C'est le même genre de preuve que MI_CHAMBER_/MI_CHAMBRE_ pour les Chambres
 *     Secrètes. Attention au faux ami : MI_COLOHOWBOW contient les lettres « WB »
 *     au milieu d'un mot, donc on découpe sur les tirets bas au lieu de chercher
 *     la sous-chaîne — sinon on ramasse deux Géants Hobo qui n'ont rien à voir.
 *   · le nom affiché finit par « (Big Boss) ». Six autres monstres, encore. Le même
 *     piège existe à l'envers : un monstre écrit ce suffixe SANS l'espace, et un
 *     endsWith("(Big Boss)") le laissait tomber en silence pendant que l'écran
 *     affirmait « ce sont les seuls du catalogue à le porter ». Ces variantes sont
 *     relevées à part (`variantes`) et montrées sous le tableau, sans être comptées
 *     avec les autres : le suffixe est une étiquette, pas un gabarit.
 *
 * On montre LES DEUX, chacun avec son critère écrit à l'écran, parce que rien dans
 * les fichiers ne permet de trancher entre eux — et qu'une liste inventée serait
 * bien pire qu'une liste courte et honnête.
 *
 * ── CE QU'ON NE PEUT PAS DIRE ─────────────────────────────────────────────────
 * Aucune des douze bêtes n'a de point d'apparition dans les fichiers de carte
 * (571 monstres sur 1 124 en ont). Le client ne les place nulle part : le serveur
 * les fait sortir. La seule information d'endroit qui existe est donc celle que le
 * staff écrit dans l'événement, en haut de la page.
 *
 * Les chiffres se recalculent tous sur `src/data/worldboss-releve.json` (14 Ko,
 * extrait de public/wiki/monstres.json qui en pèse 612 — on n'embarque pas 612 Ko
 * dans le navigateur pour douze lignes). Le critère d'extraction est écrit DANS le
 * fichier. Rien n'est saisi à la main, phrases comprises : un compteur écrit au
 * clavier devient faux à la prochaine fouille du client sans que personne ne le voie.
 *
 * La fiche complète de chaque monstre vit déjà sur /monstres/<id> : on pointe, on
 * ne recopie pas. Les faiblesses, la cadence et l'avertissement sur le butin
 * viennent de `components/monstres/vocabulaire.ts`, pour que les deux pages ne
 * puissent pas raconter le même monstre avec deux chiffres différents.
 */

export type Bete = {
  id: string; nom: string; niv: number; rang: string;
  pv: number; vies: number; pvEff: number;
  atkMin: number; atkMax: number; delai: number;
  elem: string; elemNiv: number; res: Record<string, number>;
  def: number; resMag: number; prec: number; esq: number;
  exp: number; penya: number; madrigal: number;
  zone: string | null; groupe: string | null; maison: boolean;
  agro: string | null; apparitions: number; zones: string[]; butin: number;
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
/** Les douze bêtes des deux relevés, à plat — pour les comptes d'ensemble. */
const TOUTES: Bete[] = FAMILLES.flatMap((f) => f.monstres);

/* `coupMax` et `bornesInversees` viennent de `components/monstres/vocabulaire.ts`
 * et non d'ici : /monstres, la recherche et cette page montrent les MÊMES monstres,
 * et elles ont annoncé deux chiffres différents pour la Divinité du Chaos (36 k
 * contre 360 k) tant que chacune faisait son propre calcul. Le raisonnement, les
 * cinq monstres concernés et la raison de retenir la borne haute sont documentés
 * là-bas, à l'endroit unique où ils s'appliquent. */

/** Dégâts par seconde sur une cible : le seul moyen de comparer un boss qui frappe
 *  fort lentement et un boss qui frappe deux fois moins fort quatre fois plus vite. */
const parSeconde = (m: Bete) => (m.delai > 0 ? (coupMax(m) * 1000) / m.delai : 0);

/** « a, b et c » — parce que « a, b, c » se lit comme une liste de code. */
const etListe = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`;

/**
 * CE QUI EST COMMUN À UN GROUPE, ET CE QUI LE SÉPARE — calculé, jamais énuméré à la
 * main. Écrire « même niveau, mêmes PV, même défense » dans une phrase, c'est
 * promettre une égalité que personne ne revérifie à la fouille suivante.
 */
const CHAMPS_COMPARES: [string, (m: Bete) => number | string, string][] = [
  ["le niveau", (m) => m.niv, ""],
  ["les points de vie par barre", (m) => m.pv, ""],
  ["la défense", (m) => m.def, ""],
  ["la résistance magique", (m) => m.resMag, ""],
  ["le délai entre deux coups", (m) => m.delai, " ms"],
  ["les cinq colonnes de résistance", (m) => JSON.stringify(m.res), ""],
  ["le nombre de vies", (m) => m.vies, ""],
  ["les dégâts par coup", (m) => coupMax(m), ""],
];
const identique = (l: Bete[], f: (m: Bete) => number | string) => new Set(l.map(f)).size === 1;
/** Les noms des champs égaux dans tout le groupe. */
const nomsIdentiques = (l: Bete[]) => CHAMPS_COMPARES.filter(([, f]) => identique(l, f)).map(([nom]) => nom);
/** Les champs égaux pour tout le groupe, avec leur valeur — sûre puisqu'unique. */
const partages = (l: Bete[]) =>
  CHAMPS_COMPARES.filter(([, f]) => identique(l, f)).map(([nom, f, unite]) => {
    const v = f(l[0]);
    return typeof v === "number" ? `${nom} (${entier(v)}${unite})` : nom;
  });
const separent = (l: Bete[]) => CHAMPS_COMPARES.filter(([, f]) => !identique(l, f)).map(([nom]) => nom);

/* ── Le rapprochement événement ↔ monstre ─────────────────────────────────────
   Le staff saisit le nom du boss À LA MAIN dans /gestion-worldboss : il n'y a pas
   de liste fermée, donc pas d'identifiant à joindre. On rapproche sur le nom
   normalisé (accents et apostrophes ôtés — « Bàäl'tru » se tape « baaltru »), et on
   accepte l'inclusion dans un sens ou dans l'autre : « Elun » doit retrouver
   « Elun, Premier Regard d'Ipuli ». Quand rien ne correspond, on le DIT au lieu de
   deviner : un mauvais rapprochement afficherait les points de vie d'un autre
   monstre, ce qui est pire que pas de chiffre du tout.

   Les VARIANTES sont candidates elles aussi. Elles ne sont pas comptées dans une
   famille, mais elles sont montrées sur cette page : sans elles, un staff qui
   annonce « Abomination mécanique (BigBoss) » lisait « aucun monstre ne porte ce
   nom » au-dessus d'un tableau qui l'affichait. */
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

function Chiffre({ valeur, quoi, ton = "var(--text)" }: { valeur: string; quoi: string; ton?: string }) {
  return (
    <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 11px" }}>
      <div className="font-heading" style={{ fontSize: 17, fontWeight: 700, color: ton, fontVariantNumeric: "tabular-nums" }}>{valeur}</div>
      <div style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.3 }}>{quoi}</div>
    </div>
  );
}

/** Longueur = grandeur, jamais la couleur : la teinte est celle que la colonne
 *  emploie déjà pour son chiffre. Plancher à 1,5 % pour qu'une valeur mille fois
 *  plus faible garde une barre au lieu de ressembler à une donnee manquante. */
function Barre({ part, teinte }: { part: number; teinte: string }) {
  return (
    <span aria-hidden="true" style={{ display: "block", height: 3, marginTop: 4, borderRadius: 2, background: "color-mix(in srgb, var(--border) 70%, transparent)" }}>
      <span style={{ display: "block", height: "100%", borderRadius: 2, background: teinte, width: `${Math.max(1.5, Math.min(100, part * 100))}%` }} />
    </span>
  );
}

/* « au feu », « à l'eau », « à la terre » : `A_L_ELEMENT` et `enListe` sont
 * remontés dans `components/monstres/vocabulaire.ts`. La fiche du monstre écrivait
 * « il encaisse mieux le eau » quand cette page disait déjà « résiste à l'eau » du
 * même monstre — une seule table, une seule phrase. */

/** L'élément et ce qu'il change, LU dans les cinq colonnes de résistance du client.
 *  Jamais déduit de la roue élémentaire : des monstres de ce jeu sont faibles à leur
 *  propre élément, ce que la roue ne produit jamais. */
function Elementaire({ m, taille = 15 }: { m: Bete; taille?: number }) {
  const ic = iconeElement(m.elem);
  const { faible, resiste } = faiblesses(m.res);
  const sep = <span style={{ color: "var(--text-muted)", opacity: .7 }}>·</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontSize: 11.5 }}>
      {ic && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ic} alt="" width={taille} height={taille} style={{ objectFit: "contain" }} />
      )}
      <span style={{ color: "var(--text-muted)" }}>{ELEMENT_FR[m.elem] ?? m.elem}</span>
      {faible.length > 0 && <>{sep}<span style={{ color: "var(--green)" }}>faible {enListe(faible)}</span></>}
      {resiste.length > 0 && <>{sep}<span style={{ color: "var(--red)" }}>résiste {enListe(resiste)}</span></>}
      {faible.length === 0 && resiste.length === 0 && <>{sep}<span style={{ color: "var(--text-muted)" }}>indifférent</span></>}
    </span>
  );
}

/**
 * LE MONSTRE EN BREF, à coller à côté d'un événement.
 *
 * Quatre chiffres et rien de plus : ce qu'il faut pour décider de venir. Les points
 * de vie affichés sont les PV EFFECTIFS (PV × vies), le seul chiffre sur lequel on
 * prépare un run — un boss à dix vies annonce un dixième de ce qu'il faut sortir.
 * Le reste est sur sa fiche, dont le lien est ici.
 */
export function BeteEnBref({ m }: { m: Bete }) {
  const seReleve = m.vies > 1;
  const tuile: React.CSSProperties = {
    background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8,
    padding: "5px 9px", fontSize: 11.5, fontVariantNumeric: "tabular-nums",
  };
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".7px", color: "var(--text-muted)" }}>
          Le monstre, lu dans le client
        </span>
        <span style={{ fontSize: 11.5, color: tonRang(m.rang) }}>{m.rang} · niveau {m.niv}</span>
        {m.groupe && <span style={{ fontSize: 11.5, color: "var(--purple)" }}>{m.groupe}</span>}
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <span style={{ ...tuile, borderColor: seReleve ? "color-mix(in srgb, var(--red) 40%, var(--border))" : "var(--border)" }}>
          <Icon name="heart" size={11} style={{ marginRight: 4, color: "var(--orange)" }} />
          <b>{court(m.pvEff)}</b> PV à sortir
          {seReleve && <span style={{ color: "var(--red)" }}> ({court(m.pv)} × {m.vies} vies)</span>}
        </span>
        <span style={tuile}>
          <Icon name="sword" size={11} style={{ marginRight: 4, color: "var(--red)" }} />
          <b>{court(coupMax(m))}</b> par coup
        </span>
        <span style={tuile}>
          <Icon name="clock" size={11} style={{ marginRight: 4, color: "var(--gold)" }} />
          {cadence(m.delai)} · <b>{court(Math.round(parSeconde(m)))}</b>/s
        </span>
        <span style={tuile}><Elementaire m={m} taille={13} /></span>
      </div>

      {seReleve && (
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.55 }}>
          <b style={{ color: "var(--red)" }}>Il se relève {m.vies - 1} fois.</b> Sa barre annonce{" "}
          {entier(m.pv)} PV ; à zéro il repart à plein tant qu&apos;il lui reste une vie. Un groupe qui
          se prépare sur le chiffre affiché se trompe d&apos;un facteur {m.vies}.
        </div>
      )}

      <Link href={`/monstres/${m.id}`} style={{ fontSize: 11.5, color: "var(--orange)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
        <Icon name="arrow-right" size={12} /> Sa fiche complète — mécaniques, butin connu, famille
      </Link>
    </div>
  );
}

/** Quand le nom saisi ne retrouve aucun monstre du relevé. On le dit, on ne devine
 *  pas : afficher les points de vie d'un homonyme serait plus nuisible que rien. */
export function BeteInconnue({ nom }: { nom: string }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.55 }}>
      <Icon name="help" size={12} style={{ marginRight: 5, color: "var(--gold)" }} />
      Aucun monstre du client ne porte ce nom-là : «&nbsp;{nom}&nbsp;» ne se retrouve dans aucun des{" "}
      {CANDIDATS.length} monstres relevés sur cette page. Les chiffres du combat restent donc inconnus pour ce passage.
      Le nom du boss est saisi à la main dans la gestion — c&apos;est la seule raison de cet écart.
    </div>
  );
}

/* ── Le tableau d'une famille ─────────────────────────────────────────────── */

const th: React.CSSProperties = {
  textAlign: "right", padding: "7px 9px", fontSize: 10.5, textTransform: "uppercase",
  letterSpacing: ".5px", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  textAlign: "right", padding: "7px 9px", fontSize: 12, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
};

function Tableau({ monstres }: { monstres: Bete[] }) {
  const maxVie = Math.max(1, ...monstres.map((m) => m.pvEff));
  const maxSec = Math.max(1, ...monstres.map(parSeconde));
  // Les lignes dont le client a inversé les deux bornes de dégâts. Elles sont
  // affichées sur la borne haute, et DITES : corriger sans le dire reviendrait à
  // maquiller le fichier du jeu.
  const inversees = monstres.filter(bornesInversees);
  return (
    <>
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ ...th, textAlign: "left" }}>Monstre</th>
            <th style={th}>Niv.</th>
            <th style={th}>PV à sortir</th>
            <th style={th}>Vies</th>
            <th style={th}>Par coup</th>
            <th style={th}>Par seconde</th>
            <th style={{ ...th, textAlign: "left" }}>Élément lu</th>
          </tr>
        </thead>
        <tbody>
          {monstres.map((m, i) => {
            const ps = parSeconde(m);
            return (
              <tr key={m.id} style={{ borderTop: i ? "1px solid color-mix(in srgb, var(--border) 45%, transparent)" : "none" }}>
                <td style={{ ...td, textAlign: "left", whiteSpace: "normal", minWidth: 200 }}>
                  <Link href={`/monstres/${m.id}`} style={{ color: "var(--text)", fontWeight: 600, textDecoration: "none" }}>{m.nom}</Link>
                  <span style={{ display: "block", fontSize: 10.5, color: "var(--text-muted)", fontVariantNumeric: "normal" }}>
                    {m.id}
                    {m.groupe && <span style={{ color: "var(--purple)" }}> · {m.groupe}</span>}
                  </span>
                </td>
                <td style={{ ...td, color: "var(--text-muted)" }}>{m.niv}</td>
                <td style={{ ...td, fontWeight: 700, color: "var(--orange)", minWidth: 96 }}>
                  {court(m.pvEff)}
                  <Barre part={m.pvEff / maxVie} teinte="var(--orange)" />
                </td>
                <td style={{ ...td, color: m.vies > 1 ? "var(--red)" : "var(--text-muted)", fontWeight: m.vies > 1 ? 700 : 400 }}>{m.vies}</td>
                <td style={td}>
                  {court(coupMax(m))}
                  {bornesInversees(m) && (
                    <span title="Le client écrit ici une borne haute plus basse que sa borne basse. La colonne retient la plus haute des deux." style={{ color: "var(--gold)", marginLeft: 3 }}>*</span>
                  )}
                </td>
                <td style={{ ...td, fontWeight: 700, color: "var(--red)", minWidth: 96 }}>
                  {court(Math.round(ps))}
                  <Barre part={ps / maxSec} teinte="var(--red)" />
                </td>
                <td style={{ ...td, textAlign: "left", whiteSpace: "normal", minWidth: 210 }}><Elementaire m={m} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    {inversees.length > 0 && (
      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0", lineHeight: 1.6 }}>
        <span style={{ color: "var(--gold)" }}>*</span>{" "}
        {inversees.length === 1 ? "Une ligne porte" : `${inversees.length} lignes portent`} deux bornes de
        dégâts <b>inversées</b> dans le client —{" "}
        {inversees.map((m, i) => (
          <span key={m.id}>
            {i > 0 ? ", " : ""}{m.nom} : {entier(m.atkMin)} en borne basse, {entier(m.atkMax)} en borne haute
          </span>
        ))}
        . La colonne retient la plus haute des deux : retenir l&apos;autre annoncerait un coup{" "}
        {(coupMax(inversees[0]) / Math.max(1, Math.min(inversees[0].atkMin, inversees[0].atkMax))).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}{" "}
        fois trop faible, et rangerait le plus violent du tableau en dernier.
      </p>
    )}
    </>
  );
}

/** Les cinq colonnes brutes, telles que le client les écrit. Négatif = il prend
 *  PLUS. On les montre parce que c'est la preuve de ce que la ligne au-dessus dit. */
function Colonnes({ res }: { res: Record<string, number> }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {ELEMENTS.map((e) => {
        const v = res?.[e] ?? 0;
        const ton = v < 0 ? "var(--green)" : v > 0 ? "var(--red)" : "var(--text-muted)";
        return (
          <span key={e} title={ELEMENT_FR[e]} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--bg-3)", border: `1px solid color-mix(in srgb, ${ton} 30%, var(--border))`, borderRadius: 8, padding: "4px 9px", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconeElement(e)!} alt="" width={14} height={14} style={{ objectFit: "contain" }} />
            <b style={{ color: ton, fontWeight: 700 }}>{v > 0 ? "+" : ""}{v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</b>
          </span>
        );
      })}
    </div>
  );
}

function Encart({ ton, children }: { ton: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid color-mix(in srgb, ${ton} 38%, transparent)`, background: `color-mix(in srgb, ${ton} 7%, transparent)`, borderRadius: 10, padding: "12px 14px", fontSize: 12.5, lineHeight: 1.6 }}>
      {children}
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
  const plusGros = [...TOUTES].sort((a, b) => b.pvEff - a.pvEff)[0];
  const cogneur = [...TOUTES].sort((a, b) => parSeconde(b) - parSeconde(a))[0];
  const sansCarte = TOUTES.filter((m) => m.apparitions === 0);
  const sansButin = TOUTES.filter((m) => m.butin === 0);

  /* ── Les marqués « WB » ────────────────────────────────────────────────────
     Tout se déduit du champ dont la phrase parle, et de lui seul. La version
     précédente annonçait « ce sont exactement les deux qui ont plusieurs vies » en
     comptant en réalité ceux qui portent un `groupe` : deux champs différents, une
     coïncidence vraie aujourd'hui, et une phrase que la prochaine fouille pouvait
     rendre fausse sans rien casser. */
  const aVies = wb.monstres.filter((m) => m.vies > 1);
  const uneSeuleVie = wb.monstres.filter((m) => m.vies === 1);
  /** Vrai seulement si « plusieurs vies » et « rangé dans un groupe » désignent bien
   *  le même ensemble : c'est ce que la phrase affirme, donc c'est ce qu'on vérifie. */
  const viesEtGroupe = aVies.length > 0 && aVies.every((m) => m.groupe)
    && wb.monstres.filter((m) => m.groupe).length === aVies.length;
  const tousMinuscule = uneSeuleVie.length > 0 && uneSeuleVie.every((m) => /^MINUSCULE/i.test(m.nom));
  // Le rapport de dégâts entre les bêtes à une vie et celles à plusieurs. Calculé,
  // et seulement si les deux camps existent : un `!` sur un `find` ferait tomber la
  // page le jour où la fouille ne rend plus qu'une seule sorte.
  const rapportCoup = uneSeuleVie.length > 0 && aVies.length > 0
    ? Math.max(...uneSeuleVie.map(coupMax)) / Math.max(1, Math.max(...aVies.map(coupMax)))
    : null;
  const communsWb = partages(wb.monstres);
  const separentWb = separent(wb.monstres);

  /* ── Les « (Big Boss) » ────────────────────────────────────────────────────── */
  const variantesBb = bb.variantes ?? [];
  /** Faibles à leur PROPRE élément — compté dans la famille dont la phrase parle,
   *  pas sur les douze : « ces monstres » doit désigner ceux du tableau au-dessus. */
  const faiblesALui = bb.monstres.filter((m) => (m.res?.[m.elem] ?? 0) < 0);
  const faiblesALuiTous = TOUTES.filter((m) => (m.res?.[m.elem] ?? 0) < 0);
  const memeDelai = identique(bb.monstres, (m) => m.delai);
  const delaisBb = [...new Set(bb.monstres.map((m) => m.delai))].sort((a, b) => a - b);
  /** Ce qui était commun aux « (Big Boss) » et cesse de l'être si on y range la
   *  variante : la mesure de sa distance au gabarit, calculée et non estimée. */
  const rompusParVariante = nomsIdentiques(bb.monstres)
    .filter((n) => !nomsIdentiques([...bb.monstres, ...variantesBb]).includes(n));
  /** Ceux des boss de siège que les fichiers de carte placent vraiment quelque part. */
  const poses = guilde.monstres.filter((m) => m.zones.length > 0);

  // Le badge de prestige : les paliers et le total se lisent dans PRESTIGE_COSTS,
  // la même source que la page Prestige. Deux pages, un seul chiffre.
  /** Ceux des objets dont le LIBELLÉ porte le mot : le coffre, lui, ne le porte que
   *  dans le nom de fichier de son icône (itm_box_worldboss). « Trois objets portent
   *  le nom du world boss » comptait donc un objet de trop. */
  const auNom = R.recompenses.filter((o) => /world\s*boss/i.test(o.nom));

  const CLEF_BADGE = "Badge World Boss prestigieux";
  const paliers = Object.entries(PRESTIGE_COSTS)
    .filter(([, c]) => c[CLEF_BADGE])
    .map(([p, c]) => ({ palier: Number(p), n: c[CLEF_BADGE] }))
    .sort((a, b) => a.palier - b.palier);
  const totalBadges = paliers.reduce((s, p) => s + p.n, 0);

  const sections: SectionVolet[] = [

    {
      clef: "critere", titre: "Qui sont les world boss", sous: "le critère, et ce qu'il ne prouve pas", icon: "target-eye",
      compte: TOUTES.length,
      contenu: (
        <div style={{ display: "grid", gap: 14 }}>
          <Encart ton="var(--gold)">
            <b style={{ color: "var(--gold)" }}>Il n&apos;existe aucun rang « world boss » dans le jeu.</b>{" "}
            {entier(R.ranges)} des {entier(R.catalogue)} monstres du client portent un rang, et il n&apos;y en a
            que {R.rangs.length} — {R.rangs.join(", ")} — et pas un ne porte ce mot
            {R.catalogue > R.ranges && <> (les {R.catalogue - R.ranges} restants n&apos;ont aucun rang du tout)</>}.
            La question ne se règle donc pas par un filtre de rang, et une liste
            inventée serait pire qu&apos;une liste courte. Ce qui suit est ce que les fichiers écrivent
            vraiment, avec son critère à côté.
          </Encart>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(128px,1fr))", gap: 8 }}>
            <Chiffre valeur={String(wb.monstres.length)} quoi="marqués « WB » dans leur identifiant" ton="var(--orange)" />
            <Chiffre valeur={String(bb.monstres.length)} quoi="nommés « (Big Boss) »" ton="var(--purple)" />
            <Chiffre valeur={court(plusGros.pvEff)} quoi="le plus gros, PV à sortir" ton="var(--red)" />
            <Chiffre valeur={`${court(Math.round(parSeconde(cogneur)))}/s`} quoi="le plus violent, par seconde" ton="var(--red)" />
          </div>

          {[wb, bb].map((f) => (
            <div key={f.clef} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>
                {f.titre} <span style={{ color: "var(--gold)", fontWeight: 400 }}>· {f.monstres.length}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <b style={{ color: "var(--orange)" }}>Critère :</b> {f.critere}
                <div style={{ marginTop: 3 }}>{f.note}</div>
              </div>
            </div>
          ))}

          <Encart ton="var(--red)">
            <b style={{ color: "var(--red)" }}>Et aucun des {TOUTES.length} n&apos;est posé sur une carte.</b>{" "}
            {entier(R.localises)} des {entier(R.catalogue)} monstres du client ont au moins un point
            d&apos;apparition dans les fichiers de carte. Ces {sansCarte.length}-là n&apos;en ont aucun : le
            client ne les place nulle part, c&apos;est le serveur qui les fait sortir. Le passage annoncé
            en haut de cette page est donc la <b>seule</b> information d&apos;endroit qui existe — il n&apos;y a
            rien de plus précis à afficher, et surtout rien à inventer.
          </Encart>

          <p style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
            Relevé {R.genere}. Chaque nom mène à sa fiche complète, où vivent les mécaniques, le butin
            connu et la famille du monstre : cette page ne recopie pas ces chiffres, elle y renvoie.
          </p>
        </div>
      ),
    },

    {
      clef: "wb", titre: "Les marqués « WB »", sous: "niveau 250, un seul gabarit", icon: "skull",
      compte: wb.monstres.length,
      contenu: (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <b style={{ color: "var(--orange)" }}>Critère :</b> {wb.critere}
          </div>

          <Tableau monstres={wb.monstres} />

          <Encart ton="var(--orange)">
            <b>Les {wb.monstres.length} sortent du même gabarit.</b>{" "}
            Identiques pour tous les {wb.monstres.length} : {etListe(communsWb)}.
            {separentWb.length > 0 && <> Ce qui les sépare, et rien d&apos;autre : {etListe(separentWb)}.</>}{" "}
            Ce n&apos;est pas une coïncidence : c&apos;est un modèle de world boss dupliqué, et c&apos;est ce
            qui rend le critère solide.
            {aVies.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <b style={{ color: "var(--purple)" }}>
                  {aVies.length} d&apos;entre eux portent plusieurs vies
                </b>{" "}
                — {aVies.map((m) => `${m.nom} (${m.vies})`).join(" et ")} —
                {viesEtGroupe && <> et ce sont exactement ceux que la fouille du client range sous « {aVies[0].groupe} »</>}.
                {uneSeuleVie.length > 0 && (
                  <>
                    {" "}Les {uneSeuleVie.length} autres n&apos;ont qu&apos;une vie
                    {tousMinuscule && <> et s&apos;appellent tous « MINUSCULE… »</>}
                    {rapportCoup != null && (
                      <>
                        , mais frappent{" "}
                        {rapportCoup.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} fois plus fort par coup
                      </>
                    )}
                    .
                  </>
                )}{" "}
                Ce que le serveur en fait, les fichiers ne le disent pas.
              </div>
            )}
          </Encart>

          <div>
            <div className="font-heading" style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              Les cinq colonnes de résistance
              {identique(wb.monstres, (m) => JSON.stringify(m.res)) ? `, identiques pour les ${wb.monstres.length}` : ` du premier des ${wb.monstres.length}`}
            </div>
            <Colonnes res={wb.monstres[0].res} />
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "6px 0 0", lineHeight: 1.6 }}>
              Négatif = il prend plus. Ces valeurs sont <b>lues</b>, pas déduites de la roue élémentaire :
              on verra à l&apos;onglet suivant {faiblesALuiTous.length} monstres faibles à leur propre élément,
              ce que la roue ne produit jamais.
            </p>
          </div>
        </div>
      ),
    },

    {
      clef: "bigboss", titre: "Les « (Big Boss) »", sous: "presque dix coups par seconde", icon: "swords",
      compte: bb.monstres.length,
      contenu: (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <b style={{ color: "var(--orange)" }}>Critère :</b> {bb.critere}
          </div>

          <Tableau monstres={bb.monstres} />

          <Encart ton="var(--red)">
            <b style={{ color: "var(--red)" }}>C&apos;est la cadence qui tue, pas la barre de vie.</b>{" "}
            {memeDelai
              ? <>Ils frappent tous toutes les {entier(bb.monstres[0].delai)} ms — {cadence(bb.monstres[0].delai)} —</>
              : <>Ils frappent toutes les {etListe(delaisBb.map((d) => `${entier(d)} ms`))} —</>}
            {" "}là où les « WB » sont à {cadence(wb.monstres[0].delai)}. Le plus dur d&apos;entre eux sort{" "}
            {court(Math.round(Math.max(...bb.monstres.map(parSeconde))))} de dégâts par seconde sur une seule
            cible, avant réduction par ta défense. Un tank qui se prépare sur les points de vie se prépare
            sur le mauvais chiffre.
          </Encart>

          {variantesBb.length > 0 && (
            <div>
              <Encart ton="var(--gold)">
                <b style={{ color: "var(--gold)" }}>
                  L&apos;espace compte : {variantesBb.length === 1 ? "un autre monstre écrit" : `${variantesBb.length} autres monstres écrivent`} ce
                  suffixe sans espace.
                </b>{" "}
                {variantesBb.map((v) => v.nom).join(", ")} — que le critère du tableau ci-dessus, pris au
                caractère près, laisse tomber. {variantesBb.length === 1 ? "Il est montré ici" : "Ils sont montrés ici"} et
                non compté{variantesBb.length === 1 ? "" : "s"} avec {bb.monstres.length === 1 ? "l'autre" : "les autres"},
                parce que le gabarit n&apos;a rien à voir : tout ce que les {bb.monstres.length} du tableau
                avaient en commun — {etListe(rompusParVariante)} — change {variantesBb.length === 1 ? "chez lui" : "chez eux"}.
                Le suffixe est donc une étiquette collée sur un nom, pas la marque d&apos;un modèle de
                monstre : c&apos;est précisément pour ça que cette page ne se résume pas à une liste de noms.
              </Encart>
              <div style={{ marginTop: 8 }}><Tableau monstres={variantesBb} /></div>
            </div>
          )}

          {faiblesALui.length > 0 && (
            <div>
              <Encart ton="var(--green)">
                <b style={{ color: "var(--green)" }}>
                  {faiblesALui.length === bb.monstres.length
                    ? `Tous les ${bb.monstres.length} sont faibles à leur PROPRE élément.`
                    : `${faiblesALui.length} des ${bb.monstres.length} sont faibles à leur PROPRE élément.`}
                </b>{" "}
                {identique(faiblesALui, (m) => m.elem)
                  ? <>Ils sont de {ELEMENT_FR[faiblesALui[0].elem].toLowerCase()}, et ils sont faibles {A_L_ELEMENT[faiblesALui[0].elem]}.</>
                  : <>Chacun est faible à son propre élément, celui-là même dont il porte la marque.</>}{" "}
                La roue élémentaire ne donne jamais ça — un
                élément n&apos;a aucun avantage sur lui-même. Voilà pourquoi ce site <b>lit</b> les cinq
                colonnes du client au lieu de les deviner : la déduction aurait envoyé le groupe avec le
                mauvais élément.
              </Encart>
              <div style={{ marginTop: 8 }}><Colonnes res={faiblesALui[0].res} /></div>
            </div>
          )}
        </div>
      ),
    },

    {
      clef: "rapporte", titre: "Ce que ça rapporte", sous: `les ${R.recompenses.length} objets qui s'y rattachent`, icon: "coins",
      compte: R.recompenses.length,
      contenu: (
        <div style={{ display: "grid", gap: 14 }}>
          <p style={{ fontSize: 12.5, margin: 0, lineHeight: 1.6 }}>
            {R.recompenses.length} objets du jeu se rattachent au world boss — {auNom.length} le nomment
            dans leur libellé, {R.recompenses.length - auNom.length} dans le nom de fichier de{" "}
            {R.recompenses.length - auNom.length === 1 ? "son icône" : "leur icône"} du client. C&apos;est la
            meilleure confirmation qu&apos;on ait que ce contenu existe et qu&apos;il est à part : le client
            lui a fabriqué son coffre, son badge et son buff.
          </p>

          <div style={{ display: "grid", gap: 8 }}>
            {R.recompenses.map((o) => (
              <div key={o.nom} style={{ display: "flex", gap: 11, alignItems: "flex-start", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 13px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.icone} alt="" width={32} height={32} style={{ objectFit: "contain", flexShrink: 0, imageRendering: "pixelated" }} />
                <div style={{ minWidth: 0 }}>
                  <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>{o.nom}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>{o.quoi}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted)", opacity: .8, marginTop: 2 }}>{o.source}</div>
                </div>
              </div>
            ))}
          </div>

          {paliers.length > 0 && (
            <Encart ton="var(--gold)">
              <b style={{ color: "var(--gold)" }}>
                Le prestige en réclame {totalBadges} en tout.
              </b>{" "}
              {paliers.map((p, i) => (
                <span key={p.palier}>
                  {i > 0 ? (i === paliers.length - 1 ? " et " : ", ") : ""}
                  <b>{p.n}</b> au palier {p.palier}
                </span>
              ))}
              . Personne ne passe les derniers paliers sans venir à ces passages — c&apos;est la raison
              concrète de cliquer « présent » plus haut. Le détail des coûts est sur{" "}
              <Link href="/prestige" style={{ color: "var(--orange)" }}>la page Prestige</Link>.
            </Encart>
          )}

          <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: "11px 13px", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <Icon name="info" size={13} style={{ marginRight: 5, color: "var(--gold)" }} />
            {AVERTISSEMENT_BUTIN}
          </div>

          <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
            Concrètement, pour ces {TOUTES.length} bêtes : {sansButin.length} n&apos;ont aucune ligne de
            butin dans le client. Ce n&apos;est pas un trou du wiki, c&apos;est la règle rappelée juste
            au-dessus — la table est côté serveur.
          </p>
        </div>
      ),
    },

    {
      clef: "confusion", titre: "Ne pas confondre", sous: "les boss de siège de guilde", icon: "help",
      compte: guilde.monstres.length,
      contenu: (
        <div style={{ display: "grid", gap: 14 }}>
          <p style={{ fontSize: 12.5, margin: 0, lineHeight: 1.6 }}>
            {guilde.note}
          </p>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <b style={{ color: "var(--orange)" }}>Critère :</b> {guilde.critere}
          </div>

          <Tableau monstres={guilde.monstres} />

          {poses.length > 0 && (
            <Encart ton="var(--blue)">
              <b>
                {poses.length === 1
                  ? `Un seul de ces ${guilde.monstres.length} est posé dans une carte du jeu`
                  : `${poses.length} de ces ${guilde.monstres.length} sont posés dans une carte du jeu`}
              </b>{" "}
              :{" "}
              {poses.map((m, i) => (
                <span key={m.id}>{i > 0 ? ", " : ""}{m.nom}, à {m.zones.join(" et ")}</span>
              ))}
              . On donne la destination, pas des coordonnées : un couple de nombres ne se situe pas
              quand on est dans le jeu.
            </Encart>
          )}

          <Encart ton="var(--gold)">
            <b>Ce qu&apos;on ne sait pas, et qu&apos;il faudrait demander à iBeats :</b> à quelle fréquence
            le passage a lieu, et lequel de ces monstres le serveur fait sortir. Rien dans le client ne
            le dit. Tant que ce n&apos;est pas écrit, l&apos;annonce du staff en haut de page reste la
            seule source.
          </Encart>
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
