"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/Icon";
import { Invisible } from "@/components/Bulle";
import { Faiblesses } from "@/components/monstres/Graphiques";
import {
  cadence, cadenceCourte, coupMax, coupMin, ELEMENT_FR, entier, iconeElement, parSeconde,
} from "@/components/monstres/vocabulaire";
import { NomObjet } from "@/components/objets/NomObjet";
import { pvCourt, TON_RANG } from "./donneesClient";
import { ConseilInstance, type PeuplementElementaire } from "./elements";
import { LienMonstre } from "./LienMonstre";
import type { Lieu } from "./HorsTeleporteur";
import COMBATS from "@/data/lieux-monstres.json";

/**
 * LE PANNEAU D'UN LIEU — le plan en grand, qui vit là, et ce que ça frappe.
 *
 * Demande de Maxime, mot pour mot : « Sur la map donjons sur la partie "Fly Coins"
 * prévoir une zone cliquable pour voir le plan et les monstres et les informations
 * dégâts des monstres etc… ». Les tuiles portaient la carte au format vignette,
 * un compte d'espèces et le nom du plus coriace : de quoi RECONNAÎTRE un lieu, pas
 * de quoi décider d'y entrer. Ce panneau porte les trois choses demandées, dans
 * l'ordre où elles ont été demandées.
 *
 * LE PLAN EST LA SEULE DES TROIS QUI PUISSE MANQUER. Deux des dix lieux n'ont pas
 * de parchemin dans le client : leur section « Le plan » ne se rend pas du tout,
 * plutôt qu'un cadre vide sous un titre qui promet une image.
 *
 * ┌──── POURQUOI CE FICHIER EST À PART, ET CHARGÉ À LA DEMANDE ─────┐
 * │ /donjons est la page la plus lourde du site. Le relevé de       │
 * │ combat des 120 créatures de ces dix lieux pèse 25,0 Ko, et il   │
 * │ ne sert QU'ICI. Ce module est donc importé par `next/dynamic`   │
 * │ (`ssr: false`) : ni le HTML du serveur ni le paquet de départ   │
 * │ ne le portent, le navigateur ne le télécharge qu'au premier     │
 * │ panneau ouvert, et jamais si personne n'en ouvre.               │
 * │ Corollaire : ne JAMAIS importer ce fichier autrement que par    │
 * │ `dynamic()`, sinon les 25,0 Ko repartent dans le paquet commun. │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * AUCUN CHIFFRE EN DUR, y compris dans les phrases : les comptes, les extrêmes et
 * jusqu'à « le plus gros n'est pas le plus dangereux » se recalculent sur le
 * relevé. Ce qui ne se calcule pas ne s'écrit pas.
 *
 * CE QUI N'EST PAS À L'ÉCRAN : l'expérience, la penya et les taux de chute. Ils ne
 * sont même pas dans le relevé — `scripts/extraire-lieux.mjs` ne les y met pas.
 * Le prix du ticket, lui, est un COÛT et il reste, sur la tuile.
 */

type Fiche = {
  nom: string; niv: number; rang: string; pv: number; vies?: number;
  /** Ce que la BARRE DE VIE DU JEU annonce : les PV d'une seule vie. Écrit
   *  seulement quand il diffère de `pv`, c'est-à-dire quand la créature se relève. */
  pv1?: number;
  atkMin: number | null; atkMax: number | null; delai: number | null;
  elem: string | null; res: Record<string, number>; poses: number;
  /* Les deux mécaniques de fin de combat, absentes quand la créature n'en a pas.
     Un tableau et non un seuil unique : une créature d'ici en porte DEUX. */
  rage?: { pv: number; x: number }[];
  soigne?: { pv: number; rend: number }[];
  /** À quel peuplement de la carte cette créature appartient. Absente quand la
   *  carte n'en porte qu'un — clé absente = première bande, comme partout dans
   *  ces relevés. Le relevé reste UNE SEULE LISTE, triée par dégâts : deux listes
   *  séparées auraient obligé à les recoller pour comparer d'un bout à l'autre de
   *  la carte, ce que les barres de ce panneau font justement. */
  bande?: number;
  /** À quel MODE elle appartient — même convention, autre découpage. Une bande dit
   *  d'où vient le peuplement, un mode dit comment on y joue. */
  mode?: number;
};
type Releve = { especes: Fiche[] };

const TABLE = (COMBATS as { lieux: Record<string, Releve> }).lieux;
const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const fr = (n: number) => n.toLocaleString("fr-FR");
/** « le plan d'Île Corail », pas « le plan de Île Corail » : deux des huit noms
 *  relevés commencent par une voyelle, et un lecteur d'écran prononce ce qui est
 *  écrit. Même règle que dans `HorsTeleporteur`. */
const de = (nom: string) => (/^[aeiouyàâäéèêëîïôöûüh]/i.test(nom) ? `d'${nom}` : `de ${nom}`);

const th: React.CSSProperties = {
  textAlign: "right", padding: "7px 9px", fontSize: 10.5, textTransform: "uppercase",
  letterSpacing: ".5px", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  textAlign: "right", padding: "7px 9px", fontSize: 12, whiteSpace: "nowrap", ...NUM,
};

/**
 * COMMENT SE NOMME UN PEUPLEMENT DANS UN TITRE DE SECTION.
 *
 * La tuile écrit la forme courte (« Airborn », en violet) ; ici il y a la place
 * d'une phrase, et un titre de section doit dire ce qu'on va lire. Les deux
 * tables sont donc séparées EXPRÈS — même fait, deux longueurs — et le violet
 * d'« Airborn » vient de la fiche d'objet, qui marque déjà de cette teinte ce que
 * le serveur a ajouté.
 * Elles ne sont pas partagées entre les deux fichiers : `HorsTeleporteur` ne
 * connaît ce panneau que par `dynamic()`, et n'en importe QUE le type — un import
 * de valeur dans l'autre sens ramènerait un cycle entre les deux modules.
 */
const TITRE_ORIGINE: Record<string, string> = {
  flyff: "Le peuplement du Flyff d'origine",
  airborn: "Ce qu'Airborn a posé sur la même carte",
};

/**
 * LES DEUX BOUTS D'UNE TABLE DE RÉSISTANCES — celui qui ouvre, celui qui bloque.
 *
 * ┌──── POURQUOI ON NE PREND QU'UN SEUL ÉLÉMENT DE CHAQUE CÔTÉ ────┐
 * │ `donjons-client.json` porte, par créature posée, UN `faible` et │
 * │ UN `resiste` — et c'est sur ces deux champs que le conseil      │
 * │ élémentaire compte. Les dix lieux hors téléporteur, eux, ont    │
 * │ les CINQ COLONNES brutes. Il faut donc les réduire de la même   │
 * │ façon, sinon les deux écrans compteraient deux choses           │
 * │ différentes sous le même mot.                                    │
 * │ La réduction retenue : l'extremum STRICT. Un élément n'est « le │
 * │ » point faible que si aucun autre ne descend aussi bas — sinon  │
 * │ la clé n'est pas écrite et la créature ne vote pas. Deux        │
 * │ colonnes à −30 % ne désignent pas un vainqueur, et en désigner  │
 * │ un par l'ordre du tableau, c'est le défaut déjà corrigé dans    │
 * │ `enTete` : un départage d'affichage ne doit jamais devenir un   │
 * │ conseil.                                                          │
 * │ Le détail des cinq colonnes reste visible ligne par ligne, dans │
 * │ la colonne « Élément » du tableau : rien n'est perdu, c'est le  │
 * │ RÉSUMÉ qui refuse de trancher, pas la donnée.                    │
 * └──────────────────────────────────────────────────────────────────┘
 */
function extremesRes(res: Record<string, number>) {
  const cols = Object.entries(res ?? {}).filter(([, v]) => typeof v === "number");
  if (!cols.length) return {};
  const seul = (garder: (v: number) => boolean, mieux: (a: number, b: number) => boolean) => {
    const cands = cols.filter(([, v]) => garder(v));
    if (!cands.length) return undefined;
    const val = cands.reduce((a, c) => (mieux(c[1], a) ? c[1] : a), cands[0][1]);
    const gagnants = cands.filter(([, v]) => v === val);
    return gagnants.length === 1 ? ELEMENT_FR[gagnants[0][0]] ?? gagnants[0][0] : undefined;
  };
  return {
    faible: seul((v) => v < 0, (v, a) => v < a),
    resiste: seul((v) => v > 0, (v, a) => v > a),
  };
}

/** Le peuplement d'un lieu, dans la forme que le conseil élémentaire attend. */
const pourConseil = (lignes: Fiche[]): PeuplementElementaire => ({
  monstres: lignes.map((m) => ({
    // Le conseil écrit les éléments en français capitalisé (« Terre »), comme
    // `donjons-client.json` ; le relevé des lieux les écrit en minuscules.
    elem: m.elem ? ELEMENT_FR[m.elem] ?? m.elem : null,
    ...extremesRes(m.res),
  })),
});

export default function PanneauLieu({ lieu, zonesDuReleve, onFermer }: {
  lieu: Lieu;
  /** Sur combien de zones du relevé un rang de densité se compte. Passé en
   *  propriété et non importé : voir le commentaire de `TITRE_ORIGINE`. */
  zonesDuReleve: number;
  onFermer: () => void;
}) {
  const releve: Releve | undefined = TABLE[lieu.clef];
  const fermer = useRef<HTMLButtonElement>(null);

  /* ÉCHAP FERME. Le voile se ferme déjà au clic, mais un panneau qui remplit
     l'écran sur un téléphone ne laisse pas toujours un bord de voile à viser. Le
     bouton prend le focus à l'ouverture : sans lui, la tabulation repartait du
     haut du document, derrière le voile. */
  useEffect(() => {
    fermer.current?.focus();
    const surTouche = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  const toutes = releve?.especes ?? [];
  /* LES BARRES SE MESURENT SUR TOUTE LA CARTE, PAS SUR CHAQUE TABLEAU. C'est le
     point d'avoir gardé un relevé unique : sur Azria, les trois créatures du haut
     frappent plusieurs fois plus fort que les huit du bas, et deux échelles
     séparées auraient dessiné deux fois la même barre pleine. */
  const maxSeconde = Math.max(1, ...toutes.map(parSeconde));
  /* ┌──── UN TABLEAU PAR DÉCOUPAGE, ET IL Y EN A DEUX SORTES ────┐
     │ Le relevé peut découper un lieu de deux façons, jamais les  │
     │ deux à la fois : par BANDE (d'où vient le peuplement — huit  │
     │ espèces du Flyff d'origine puis trois posées par Airborn sur │
     │ Azria) ou par MODE (comment on y joue — « 1v1 » et « AoE »   │
     │ au Royaume de Kaelis et au Parc prestigieux).                │
     │ Le titre de section change avec, parce que la question       │
     │ change : « Ce qu'Airborn a posé sur la même carte » ne veut  │
     │ rien dire au-dessus d'un mode de jeu, et « En 1v1 » ne veut  │
     │ rien dire au-dessus d'une bande de niveaux.                  │
     │ L'ordre interne de chaque tableau reste celui des dégâts,    │
     │ fixé à l'extraction.                                          │
     └──────────────────────────────────────────────────────────────┘ */
  const parModes = (lieu.modes ?? []).map((m, i) => ({
    clef: m.nom,
    titre: `En ${m.nom}`,
    apres: `${m.especes} espèce${m.especes > 1 ? "s" : ""} · ${fr(m.poses)} emplacement${m.poses > 1 ? "s" : ""} · niv. ${m.nivMin === m.nivMax ? m.nivMin : `${m.nivMin}–${m.nivMax}`}`,
    lignes: toutes.filter((x) => (x.mode ?? 0) === i),
  }));
  const parBandes = lieu.bandes.map((b, i) => ({
    clef: `b${b.nivMin}`,
    titre: lieu.bandes.length === 1
      ? "Ce qui vit ici, et ce que ça frappe"
      : (b.origine && TITRE_ORIGINE[b.origine]) ?? "Ce qui vit ici",
    apres: `${b.especes} espèce${b.especes > 1 ? "s" : ""} · niv. ${b.nivMin === b.nivMax ? b.nivMin : `${b.nivMin}–${b.nivMax}`}`,
    lignes: toutes.filter((x) => (x.bande ?? 0) === i),
  }));
  const sections = parModes.length > 1 ? parModes : parBandes;
  /* Comptés sur TOUS les tableaux du panneau, parce que la légende les couvre tous
     — et recomptés à chaque lieu, jamais écrits. */
  const nbRage = toutes.filter((m) => m.rage?.length).length;
  const nbSoin = toutes.filter((m) => m.soigne?.length).length;
  /* LES CRÉATURES QUI SE RELÈVENT — la clause qui dormait depuis huit lieux. Aucune
     n'en avait ; les seize du Royaume de Kaelis en ont toutes, deux pour la
     piétaille et six pour les boss. C'est l'erreur la plus chère de ce panneau si
     on la tait : la barre de vie du jeu n'annonce QU'UNE vie. */
  const seRelevent = toutes.filter((m) => (m.vies ?? 1) > 1);

  /**
   * ┌──── LE VOILE SORT DE LA PAGE, ET C'EST UNE CORRECTION MESURÉE ────┐
   * │ `position: fixed` ne se cale sur la fenêtre que si AUCUN ancêtre  │
   * │ ne porte de `transform` — sinon c'est cet ancêtre qui devient le  │
   * │ repère. Or `globals.css` fait entrer chaque bloc de page avec     │
   * │ `@keyframes vgfade` (`.vg-page>*>*`), qui applique un             │
   * │ `translateY(16px)`. Relevé dans le navigateur, pas supposé : le   │
   * │ voile mesurait 2 038 px de haut pour une fenêtre de 1 000, et son │
   * │ bord haut était à −110 px. Traduction à l'écran : le panneau      │
   * │ s'ouvrait quelque part au milieu de la page au lieu de se poser   │
   * │ devant, et il fallait faire défiler pour le trouver.              │
   * │ Le portail le pose sur `document.body`, hors de tout `transform`. │
   * │ Il reste enfant de ce composant côté React, donc le contexte des  │
   * │ identifiants de monstres continue de le traverser — c'est lui qui │
   * │ fait des cent deux noms des liens vers /monstres.                 │
   * │ C'est le piège déjà payé sur ce site : une modale enfermée dans   │
   * │ sa carte.                                                          │
   * └────────────────────────────────────────────────────────────────────┘
   * `document.body` est atteignable sans garde : ce module est chargé par
   * `dynamic(..., { ssr: false })`, il ne s'exécute jamais côté serveur.
   */
  return createPortal(
    <div
      onClick={onFermer}
      role="presentation"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
        alignItems: "center", justifyContent: "center", zIndex: 100, padding: "88px 20px 20px",
      }}
    >
      {/* La marge haute vaut la barre de navigation (68 px) plus un souffle : sans
          elle, un panneau assez haut pour remplir l'écran passe SOUS la barre et
          perd son titre. Piège déjà payé sur la fiche de donjon. */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={lieu.carte
          ? `${lieu.nom} : le plan, les créatures et leurs dégâts`
          : `${lieu.nom} : les créatures et leurs dégâts — ce lieu n'a pas de plan dans le client`}
        style={{
          background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14,
          padding: 20, maxWidth: 860, width: "100%", maxHeight: "calc(100vh - 108px)",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="font-heading" style={{ fontSize: 20, margin: 0 }}>{lieu.nom}</h2>
            {/* LES BORNES SE LISENT BANDE PAR BANDE. « niveau 73 à 210 » pour
                Azria décrirait une progression continue là où il y a soixante-
                quinze niveaux de vide ; les deux intervalles côte à côte le
                démentent en trois caractères de plus. */}
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", ...NUM }}>
              {lieu.especes} espèce{lieu.especes > 1 ? "s" : ""} · {fr(lieu.poses)} emplacement{lieu.poses > 1 ? "s" : ""}
              {" · "}niveau{lieu.bandes.length > 1 ? "x" : ""}{" "}
              {lieu.bandes
                .map((b) => (b.nivMin === b.nivMax ? `${b.nivMin}` : `${b.nivMin} à ${b.nivMax}`))
                .join(", puis ")}
            </div>
          </div>
          <button
            ref={fermer}
            type="button"
            onClick={onFermer}
            aria-label="Fermer le panneau"
            style={{
              flexShrink: 0, cursor: "pointer", fontFamily: "inherit", lineHeight: 0,
              padding: 7, borderRadius: 8, background: "var(--bg-3)",
              border: "1px solid var(--border)", color: "var(--text)",
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* ─── 1. LE PLAN, QUAND IL Y EN A UN ───
            Deux lieux du relevé n'ont pas de parchemin dans le client : la section
            entière disparaît plutôt que de montrer un cadre vide sous un titre qui
            promet un plan. Ce qui reste — les créatures, leurs dégâts, les modes —
            est justement ce que ce panneau a de plus utile. */}
        {lieu.carte && (
          <>
        <Titre icon="map">Le plan</Titre>
        {/* LA HAUTEUR DU PLAN EST BRIDÉE, ET C'EST CE QUI REND LE PANNEAU LISIBLE.
            Ces cartes sont en 4/3 : à 820 px de large, le plan faisait 615 px de haut
            et remplissait l'écran à lui seul — on ouvrait « le plan ET les créatures »
            et il fallait faire défiler une page entière avant de voir la première
            créature. `maxHeight` avec une largeur automatique le réduit SANS LE
            RECADRER : le cartouche du bas reste dans l'image, et c'est lui qui prouve
            que cette carte est bien celle de ce lieu.

            Le commentaire est ICI et pas entre les attributs de l'image : un
            commentaire posé dans une liste d'attributs JSX a déjà mis six pages de ce
            site en 500. */}
        <figure style={{ margin: "0 0 16px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lieu.carte}
            alt={`Le plan ${de(lieu.nom)}, tel qu'il sort du client — le cartouche imprimé dit « ${lieu.cartouche} »`}
            style={{ display: "block", maxWidth: "100%", maxHeight: "min(48vh, 420px)", width: "auto", margin: "0 auto", borderRadius: 10, border: "1px solid var(--border)" }}
          />
          {/* Le cartouche est une CITATION de l'image, recopié tel quel : c'est la
              seule preuve que cette carte est bien celle de ce lieu — les noms de
              FICHIERS du client mentent (« town_oasis » affiche « Tour Oubliée »). */}
          <figcaption style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            Le plan tel qu&apos;il sort du client. Le cartouche imprimé dessus dit «&nbsp;{lieu.cartouche}&nbsp;».
          </figcaption>
        </figure>
          </>
        )}

        {/* ─── LES DEUX PEUPLEMENTS D'UNE MÊME CARTE, QUAND IL Y EN A DEUX ─── */}
        {lieu.bandes.length > 1 && <DeuxPeuplements lieu={lieu} zonesDuReleve={zonesDuReleve} />}

        {/* ─── LE MÊME ENDROIT, DEUX FAÇONS D'Y JOUER ─── */}
        {lieu.modes && lieu.modes.length > 1 && <DeuxModes lieu={lieu} ticket={lieu.ticket ?? null} />}

        {/* ─── QUEL ÉLÉMENT EMPORTER, ET LEQUEL EST PERDU ICI ───
            Le même bloc que les fiches de donjon, et c'est tout l'intérêt : la
            question ne change pas d'un écran à l'autre, donc la réponse ne doit pas
            changer de forme. Il ne servait qu'aux 23 instances du téléporteur parce
            qu'il exigeait un donjon entier ; il ne demande plus que trois champs par
            créature (voir `PeuplementElementaire`), et ces dix lieux les ont.
            LES CINQ COLONNES TRANCHENT, PAS LA ROUE ÉLÉMENTAIRE — voir `extremesRes`. */}
        {toutes.length > 0 && (
          <ConseilInstance
            d={pourConseil(toutes)}
            provenance={
              <>
                Élément de <b>l&apos;arme</b>. Compté sur les {toutes.length} espèces posées ici,
                dans leurs cinq colonnes de résistance — pas dans la roue élémentaire :
                plusieurs monstres de ce jeu résistent à trois éléments à la fois.
              </>
            }
          />
        )}

        {/* ─── 2 et 3. QUI VIT LÀ, ET CE QUE ÇA FRAPPE ─── */}
        {toutes.length > 0 ? (
          sections.map((s, i) => (
            <div key={s.clef} style={i ? { marginTop: 18 } : undefined}>
              {/* LE TITRE NOMME LE DÉCOUPAGE, ET SES COMPTES SONT DANS `apres`.
                  Sur un lieu à deux sections, « Ce qui vit ici » deux fois de suite
                  n'aurait distingué que par l'ordre — or c'est la PROVENANCE (pour
                  une bande) ou le MODE (pour un mode) qui explique la différence,
                  et c'est elle qu'on lit dans le relevé. */}
              <Titre icon="skull" apres={s.apres}>{s.titre}</Titre>
              <PlusGrosPlusFort lignes={s.lignes} />
              <Tableau lignes={s.lignes} maxSeconde={maxSeconde} />
            </div>
          ))
        ) : (
          /* Un lieu sans relevé de combat ne doit pas afficher un tableau vide : le
             panneau garde alors son plan et le dit en une ligne. Le cas n'existe
             pas aujourd'hui — les huit lieux sont peuplés, c'est même la condition
             pour qu'ils entrent dans la liste — mais un relevé refait demain peut
             en vider un. */
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "0 0 16px" }}>
            Le relevé de combat de ce lieu n&apos;a pas été extrait.
          </p>
        )}

        {/* ─── CE QUE LES QUÊTES ENVOIENT CHERCHER ICI ─── */}
        {lieu.objets.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Titre icon="gift" apres={`${lieu.objets.length}`}>À chercher ici</Titre>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {lieu.objets.map((o) => (
                <span
                  key={o.nom}
                  style={{
                    /* Marge SYMÉTRIQUE, et c'est mesuré : sur les 46 objets que
                       ces lieux envoient chercher, UN SEUL porte une icône dans le
                       relevé. La marge gauche réduite des étiquettes à icône
                       décalait donc 45 noms sur 46. Quand l'icône est là, la
                       gouttière du `flex` lui fait sa place. */
                    fontSize: 12, padding: "4px 10px", borderRadius: 7,
                    background: "var(--bg-3)", border: "1px solid var(--border)",
                    display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0,
                  }}
                >
                  {/* `NomObjet` mène à la fiche ET à la provenance, et il ne charge
                      cette dernière qu'à l'ouverture de sa bulle : vingt objets sur
                      un panneau, c'est vingt requêtes évitées à l'ouverture. */}
                  <NomObjet nom={o.nom} icone={o.icone} taille={18} />
                </span>
              ))}
            </div>
          </div>
        )}

        {/* LA LÉGENDE N'EXISTE QUE SI LES PASTILLES EXISTENT, ET ELLE SE COMPTE.
            Une flamme et des étincelles ne se devinent pas ; un mot les nomme une
            fois pour tout le tableau, au lieu de vingt-deux fois dedans. Quatre des
            huit lieux n'ont ni rage ni soin — la ligne y disparaît d'elle-même
            plutôt que d'annoncer une mécanique absente. */}
        {/* ┌──── LA BARRE DE VIE DU JEU MENT D'UN FACTEUR SIX, ET ON LE DIT ────┐
            Les seize créatures du Royaume de Kaelis se relèvent : deux fois pour la
            piétaille, SIX pour les boss. Le jeu affiche une barre de 1,5 Md ; il
            faut en sortir 9. Un groupe qui dimensionne son run sur le chiffre
            affiché se trompe d'un facteur six — c'est la définition même de
            l'erreur coûteuse, donc la mise en garde reste, et elle est portée par
            la brique `Invisible` que /monstres emploie déjà pour le même fait.
            La ligne ne s'écrit que si des créatures se relèvent, et le facteur est
            COMPTÉ sur celles-ci : elle disparaît toute seule là où elle serait
            fausse.
            └────────────────────────────────────────────────────────────────────┘ */}
        {seRelevent.length > 0 && (
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.7, margin: "12px 0 0" }}>
            <Invisible enJeu={`La barre de vie du jeu n'annonce que les PV d'une vie. La colonne PV ci-dessus les multiplie déjà par le nombre de vies : c'est ce qu'il faut réellement sortir.`}>
              <span>
                <Icon name="rotate-ccw" size={11} style={{ color: "var(--red)", marginRight: 4 }} />
                <b style={{ color: "var(--text)", ...NUM }}>{seRelevent.length}</b> se relève{seRelevent.length > 1 ? "nt" : ""}{" "}
                — jusqu&apos;à <b style={{ color: "var(--red)", ...NUM }}>{Math.max(...seRelevent.map((m) => m.vies ?? 1))} vies</b>,
                et la barre du jeu n&apos;en annonce qu&apos;une.
              </span>
            </Invisible>
          </p>
        )}

        {(nbRage > 0 || nbSoin > 0) && (
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.7, margin: "12px 0 0", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px 10px" }}>
            {nbRage > 0 && (
              <span>
                <Icon name="flame" size={11} style={{ color: "var(--red)", marginRight: 4 }} />
                <b style={{ color: "var(--text)", ...NUM }}>{nbRage}</b> entre{nbRage > 1 ? "nt" : ""} en rage sous ce pourcentage de PV : les dégâts sont multipliés à partir de là.
              </span>
            )}
            {nbSoin > 0 && (
              <span>
                <Icon name="sparkles" size={11} style={{ color: "var(--green)", marginRight: 4 }} />
                <b style={{ color: "var(--text)", ...NUM }}>{nbSoin}</b> se soigne{nbSoin > 1 ? "nt" : ""} une fois arrivé{nbSoin > 1 ? "s" : ""} à ce seuil — le franchir d&apos;un seul coup l&apos;empêche.
              </span>
            )}
          </p>
        )}

        {/* LA PHRASE SUR LES CINQ COLONNES A DÉMÉNAGÉ, ELLE N'A PAS DISPARU. Elle
            vivait ici, tout en bas, à vingt lignes de tableau de la seule chose
            qu'elle explique ; elle est maintenant SOUS le conseil élémentaire, qui
            est justement ce qu'elle justifie. La laisser aux deux endroits la
            faisait lire deux fois sur le même panneau. Reste ici ce que ce bas de
            page est seul à couvrir : d'où viennent les dégâts, et ce qui n'y est
            pas. */}
        <p style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.6, margin: "16px 0 0" }}>
          Dégâts et cadence <b>lus</b> dans la table des monstres du client, jamais déduits. Ce que le
          serveur ajoute en combat, lui, n&apos;est dans aucun fichier.
        </p>

        <button
          type="button"
          onClick={onFermer}
          className="font-heading"
          style={{
            marginTop: 16, width: "100%", padding: 10, borderRadius: 8, background: "var(--bg-3)",
            border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer", fontSize: 13,
          }}
        >
          Fermer
        </button>
      </div>
    </div>,
    document.body
  );
}

/**
 * DEUX PEUPLEMENTS SUR UNE MÊME CARTE — la phrase qui répare deux erreurs.
 *
 * ┌───────────────── CE QU'ON A ÉCRIT DE FAUX, DEUX FOIS ──────────────────┐
 * │ Azria a d'abord été annoncée « du niveau 73 au 210 » : une progression │
 * │ continue qui n'existe pas, il y a soixante-quinze niveaux de vide au   │
 * │ milieu. Puis « 73 à 115 », la bande haute rangée en note de bas de     │
 * │ page — alors qu'elle porte plus d'emplacements de réapparition         │
 * │ qu'aucune autre zone du jeu. Les deux phrases de Maxime étaient vraies │
 * │ en même temps : « Azria c'est la dernière zone (73-114) » ET « Azria   │
 * │ c'est la zone la plus haut niveau ». C'est la carte qui porte deux     │
 * │ peuplements, pas lui qui se contredit.                                 │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * TOUT S'Y COMPTE : le nombre de peuplements, les niveaux de vide entre eux, les
 * emplacements, le rang de la bande la plus fournie et le nombre de zones sur
 * lequel ce rang est mesuré. Aucun chiffre d'expérience n'est nécessaire pour
 * dire à quoi sert une zone : des emplacements de monstres, comptés, suffisent.
 */
const PROVENANCE: Record<string, string> = {
  flyff: "le Flyff d'origine",
  airborn: "le contenu d'Airborn",
};

function DeuxPeuplements({ lieu, zonesDuReleve }: { lieu: Lieu; zonesDuReleve: number }) {
  const trous = lieu.bandes.slice(1).map((b, i) => b.nivMin - lieu.bandes[i].nivMax);
  /* La bande que rien ne dépasse dans tout le relevé, s'il y en a une ici. */
  const tete = lieu.bandes.find((b) => b.rangPoses === 1);
  return (
    <p style={{ fontSize: 12.5, lineHeight: 1.65, color: "var(--text-muted)", margin: "0 0 14px" }}>
      <Icon name="layers" size={13} style={{ marginRight: 6, color: "var(--orange)" }} />
      Une carte, <b style={{ color: "var(--text)" }}>{lieu.bandes.length} peuplements</b> séparés
      de <b style={{ color: "var(--text)", ...NUM }}>{trous.join(" et ")} niveaux</b>.{" "}
      {lieu.bandes.map((b) => (
        <span key={b.nivMin}>
          {b.especes} espèce{b.especes > 1 ? "s" : ""} de {b.nivMin} à {b.nivMax}
          {b.origine && PROVENANCE[b.origine] ? ` — ${PROVENANCE[b.origine]}` : ""}.{" "}
        </span>
      ))}
      {tete && (
        <>
          Les <b style={{ color: "var(--text)", ...NUM }}>{fr(tete.poses)} emplacements</b> de
          réapparition de la bande {tete.nivMin}–{tete.nivMax} sont le plus grand nombre
          des {zonesDuReleve} zones du relevé : c&apos;est le terrain de farm le plus fourni du serveur.
        </>
      )}
    </p>
  );
}

/**
 * LE MÊME ENDROIT, DEUX FAÇONS D'Y JOUER — et ce que le client en dit.
 *
 * ┌──────── CE QUE CE PARAGRAPHE EST LE SEUL À POUVOIR DIRE ────────┐
 * │ Le relevé donne deux zones qui ne diffèrent que par un suffixe.  │
 * │ Rien, ni dans une carte ni dans un tableau de créatures, ne dit  │
 * │ que ce sont DEUX FAÇONS DE JOUER LE MÊME TERRAIN plutôt que deux │
 * │ endroits — et pour Kaelis, le client tranche : il vend un ticket │
 * │ par mode, « Rêve de Kaelis 1v1 (2h) » et « Rêve de Kaelis AoE    │
 * │ (2h) ». Deux papiers, une destination.                           │
 * │ La conséquence est un geste : on choisit son mode AVANT d'entrer,│
 * │ à l'achat, et pour deux heures. Se tromper de billet, c'est deux │
 * │ heures dans le mauvais mode.                                     │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * LA CITATION DU CLIENT EST RECOPIÉE MOT POUR MOT, avec le fichier d'où elle
 * sort : c'est elle qui dit à quoi sert la zone, et c'est la seule source qui le
 * dise. La résumer la rendrait invérifiable.
 */
function DeuxModes({ lieu, ticket }: { lieu: Lieu; ticket: Lieu["ticket"] }) {
  const modes = lieu.modes!;
  return (
    <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 12.5, lineHeight: 1.6, display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: "var(--text-muted)" }}>
        <Icon name="swords" size={13} style={{ flexShrink: 0, color: "var(--orange)" }} />
        <span>Un seul endroit,</span>
        {modes.map((m, i) => (
          <span key={m.nom} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            {i > 0 && <span>ou</span>}
            <b style={{ color: "var(--text)" }}>{m.nom}</b>
          </span>
        ))}
        <span style={{ ...NUM }}>
          — {modes[0].especes} espèce{modes[0].especes > 1 ? "s" : ""} et {fr(modes[0].poses)} emplacements
          de chaque côté, aux mêmes niveaux.
        </span>
      </div>
      {ticket?.billets?.length ? (
        <div style={{ color: "var(--text-muted)" }}>
          <Icon name="clock" size={12} style={{ marginRight: 5, color: "var(--gold)" }} />
          Le client vend <b style={{ color: "var(--text)" }}>{ticket.billets.length} billets</b>, un par mode
          {ticket.heures?.length ? <>, <b style={{ color: "var(--text)" }}>{ticket.heures.join(" ou ")}&nbsp;h</b> chacun</> : null}
          {ticket.ou ? <> — {ticket.ou}</> : null}. Le mode se choisit donc à l&apos;achat, pas sur place.
        </div>
      ) : null}
      {ticket?.dit ? (
        <div style={{ color: "var(--text-muted)", fontSize: 11.5, borderLeft: "2px solid var(--border)", paddingLeft: 9 }}>
          {/* La phrase du client, entière. Elle dit à quoi sert la zone — aucune autre
              source ne le dit — et c'est elle qui autorise le bloc « ce qu'on en
              rapporte » de la tuile. */}
          «&nbsp;{ticket.dit}&nbsp;»
          {ticket.source ? <span style={{ display: "block", marginTop: 2 }}>{ticket.source}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * « LE PLUS GROS N'EST PAS LE PLUS DANGEREUX » — et seulement quand c'est vrai.
 *
 * La phrase empêche de préparer un run sur la mauvaise barre. Elle se calcule par
 * PEUPLEMENT : sur une carte à deux bandes, comparer le plus gros de l'une au
 * cogneur de l'autre ne compare rien.
 *
 * ELLE EXIGE UNE INÉGALITÉ STRICTE, et pas seulement deux noms différents. Les
 * trois créatures de la bande haute d'Azria sortent EXACTEMENT les mêmes dégâts
 * par seconde : le départage par nom seul y désignait un « plus dangereux » qui
 * ne l'est pas, et la phrase affirmait le contraire de ce que le tableau montre
 * juste en dessous.
 */
function PlusGrosPlusFort({ lignes }: { lignes: Fiche[] }) {
  if (!lignes.length) return null;
  const cogneur = lignes.reduce((a, m) => (parSeconde(m) > parSeconde(a) ? m : a));
  const plusGros = lignes.reduce((a, m) => (m.pv > a.pv ? m : a));
  if (parSeconde(cogneur) <= parSeconde(plusGros)) return null;
  return (
    <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-muted)", margin: "0 0 10px" }}>
      <Icon name="info" size={13} style={{ marginRight: 6, color: "var(--gold)" }} />
      Le plus gros n&apos;est pas le plus dangereux : <b style={{ color: "var(--text)" }}>{plusGros.nom}</b>{" "}
      porte {pvCourt(plusGros.pv)} PV, mais c&apos;est <b style={{ color: "var(--text)" }}>{cogneur.nom}</b>{" "}
      {/* LA CADENCE SE DIT EN FRANÇAIS, PAS EN MILLISECONDES. La phrase écrivait
          « toutes les 3 000 ms » à dix centimètres d'une colonne qui écrit « 3 s »
          pour le même monstre : deux unités pour un seul fait, et la brute du
          client en prime. `cadence()` existe pour ça et sert déjà dans l'infobulle
          de cette colonne — elle bascule seule en coups par seconde quand le
          monstre frappe plus d'une fois par seconde, ce qu'aucune de ces cent deux
          créatures ne fait aujourd'hui mais que le relevé peut apporter demain. */}
      qui sort le plus de dégâts — {entier(coupMax(cogneur))} par coup,{" "}
      {cadence(cogneur.delai)}, soit {entier(parSeconde(cogneur))} par seconde.
    </p>
  );
}

/**
 * LE TABLEAU DES CRÉATURES — trié du plus dangereux au moins, pas par niveau.
 *
 * Le niveau est déjà porté deux fois ailleurs (l'échelle du bloc et l'entête de ce
 * panneau) ; ce que ce tableau seul peut dire, c'est QUI FAIT MAL. L'ordre est donc
 * celui des dégâts par seconde, et il est fixé à l'extraction.
 *
 * Le tableau défile DANS SON PROPRE CADRE : sinon c'est le panneau entier qui gagne
 * une barre horizontale sur un téléphone, et le plan part avec.
 */
function Tableau({ lignes, maxSeconde }: { lignes: Fiche[]; maxSeconde: number }) {
  /* La colonne des vies ne s'affiche que si une créature en a plusieurs. Aucune
     n'en a dans ces huit lieux aujourd'hui — une colonne de « 1 » sur vingt-sept
     lignes n'apprend rien —, mais le jour où une zone en gagne une, elle apparaît
     sans qu'on y touche. */
  const aVies = lignes.some((m) => (m.vies ?? 1) > 1);
  return (
    <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 660 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ ...th, textAlign: "left" }}>Créature</th>
            <th style={th}>Niv.</th>
            <th style={th}>PV</th>
            {aVies && <th style={th}>Vies</th>}
            <th style={th} title="Les deux bornes du coup, telles que le client les donne">Par coup</th>
            <th style={th} title="Le délai entre deux coups, lu dans le client">Cadence</th>
            <th style={th} title="Le coup le plus fort divisé par le délai : c'est ce qui compare un gros coup lent et un petit coup rapide">Par seconde</th>
            <th style={{ ...th, textAlign: "left" }}>Élément</th>
            <th style={th} title="Le nombre de points de réapparition sur la carte, pas le nombre de monstres : c'est le serveur qui décide du rythme">Emplac.</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((m, i) => {
            const ic = iconeElement(m.elem);
            const ps = parSeconde(m);
            const bas = coupMin(m);
            const haut = coupMax(m);
            return (
              <tr key={`${m.nom}|${m.niv}|${m.pv}`} style={{ borderTop: i ? "1px solid color-mix(in srgb, var(--border) 45%, transparent)" : "none" }}>
                <td style={{ ...td, textAlign: "left", whiteSpace: "normal", minWidth: 170, fontWeight: 600 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {ic && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ic} alt="" title={`Élément : ${ELEMENT_FR[m.elem!] ?? m.elem}`} width={15} height={15}
                        style={{ objectFit: "contain", flexShrink: 0 }} />
                    )}
                    {/* LE NOM MÈNE À SA FICHE — les monstres appartiennent à
                        /monstres, ce panneau ne garde d'eux que ce qui fait décider
                        d'entrer. `LienMonstre` résout l'identifiant sur la clé
                        nom + niveau + PV, posée côté serveur. */}
                    <LienMonstre nom={m.nom} niv={m.niv} pv={m.pv} couleur={TON_RANG[m.rang] ?? "var(--text)"} />
                  </span>
                  {/* LE RANG NE S'ÉCRIT QUE QUAND IL N'EST PAS « NORMAL ». Il
                      s'écrivait sur chaque ligne, et l'Île Corail affichait alors
                      vingt-sept fois le mot « NORMAL » — vingt-sept mots pour dire
                      que rien ne sort du lot. « Normal » est le rang par défaut du
                      jeu : le nommer n'apprend rien, tandis que « capitaine » ou
                      « boss » change ce qu'on emmène.
                      Le rang reste porté par la COULEUR du nom dans les deux cas,
                      comme partout ailleurs sur le site.
                      Le rang sous le nom et non à côté : sur un téléphone la colonne
                      des créatures est la seule qui se replie, et « capitaine »
                      collé au nom faisait passer chaque ligne sur trois. */}
                  {m.rang !== "normal" && (
                    <span style={{ display: "block", fontSize: 10.5, fontWeight: 400, textTransform: "uppercase", letterSpacing: ".5px", color: TON_RANG[m.rang] ?? "var(--gold)" }}>
                      {m.rang}
                    </span>
                  )}
                  <Seuils m={m} />
                </td>
                <td style={{ ...td, color: "var(--text-muted)" }}>{m.niv}</td>
                {/* LES PV EFFECTIFS, ET LE CALCUL DANS L'INFOBULLE QUAND IL Y EN A UN.
                    Cette colonne a toujours affiché ce qu'il faut RÉELLEMENT sortir ;
                    tant qu'aucune créature ne se relevait, c'était aussi ce que la
                    barre du jeu annonce. Ce n'est plus vrai : au Royaume de Kaelis,
                    9,0 Md à sortir pour une barre qui en affiche 1,5. L'infobulle
                    écrit donc l'opération, `55,0 M × 2 vies`, pour qu'on reconnaisse
                    le chiffre de l'écran de jeu au lieu de croire à une erreur. */}
                <td style={{ ...td, fontWeight: 700, color: "var(--orange)" }}
                  title={m.pv1 ? `${entier(m.pv1)} PV par vie × ${m.vies} vies = ${entier(m.pv)} à sortir. La barre du jeu n'affiche que ${entier(m.pv1)}.` : undefined}>
                  {pvCourt(m.pv)}
                </td>
                {aVies && (
                  <td style={{ ...td, color: (m.vies ?? 1) > 1 ? "var(--red)" : "var(--text-muted)", fontWeight: (m.vies ?? 1) > 1 ? 700 : 400 }}>
                    {m.vies ?? 1}
                  </td>
                )}
                <td style={td}>
                  {/* LES DEUX BORNES, PAS SEULEMENT LA HAUTE : sur ces créatures
                      l'écart va de 5 % (361–380) à 456 % (1 000–5 567). Annoncer la
                      seule borne haute ferait préparer un run sur un coup qui ne
                      tombe presque jamais ; n'annoncer que la basse ferait mourir. */}
                  {haut ? (bas === haut ? entier(haut) : `${entier(bas)}–${entier(haut)}`) : "—"}
                </td>
                <td style={{ ...td, color: "var(--text-muted)" }} title={cadence(m.delai) ?? undefined}>
                  {cadenceCourte(m.delai) ?? "—"}
                </td>
                <td style={{ ...td, fontWeight: 700, color: "var(--red)", minWidth: 88 }}>
                  {ps ? entier(ps) : "—"}
                  <Barre part={ps / maxSeconde} />
                </td>
                <td style={{ ...td, textAlign: "left", whiteSpace: "normal" }}>
                  <Faiblesses res={m.res} />
                </td>
                <td style={{ ...td, color: "var(--text-muted)" }}>{fr(m.poses)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * CE QUI ARRIVE DANS LES DERNIERS POUR-CENT — la rage et le soin.
 *
 * ┌──── POURQUOI ILS SONT LÀ, ALORS QUE LE RESTE DU CLIENT NE L'EST PAS ────┐
 * │ La règle de /donjons est écrite dans LienMonstre.tsx : la page ne garde │
 * │ des monstres que « ce qui fait DÉCIDER d'entrer — les PV à sortir, la   │
 * │ faiblesse, UNE RAGE SCRIPTÉE », et pointe la fiche pour tout le reste.  │
 * │ La fiche de donjon l'applique déjà (« Rage sous X % de PV : ×N          │
 * │ dégâts ») ; ce panneau, lui, n'en disait rien — sur 33 créatures qui    │
 * │ entrent en rage et 6 qui se soignent, comptées sur le relevé.           │
 * │ Ce sont les deux seuls faits de ce tableau qui changent l'ORDRE des     │
 * │ gestes et pas seulement leur quantité : garder les soins pour le seuil  │
 * │ de rage, et franchir le seuil de soin d'un seul coup pour qu'il ne      │
 * │ parte pas. Une colonne de plus aurait coûté 60 px sur une table qui     │
 * │ défile déjà à 375 px — ils tiennent donc sous le nom, là où le rang     │
 * │ s'écrit, et seulement quand ils existent.                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * L'ICÔNE ET LA TEINTE SONT CELLES DE LA MAISON, pas des nouvelles : flamme rouge
 * pour la rage, étincelles vertes pour le soin — les mêmes que la fiche de monstre
 * et que la recherche. Le SEUIL s'écrit, parce qu'aucune icône ne dit « 10 % » ;
 * le multiplicateur et le montant rendu passent dans l'infobulle, comme la cadence
 * complète juste à côté.
 *
 * UN SEUIL NE S'ÉCRIT QU'UNE FOIS, MÊME QUAND LE RELEVÉ LE PORTE DEUX FOIS.
 * Le Capitaine Merel de l'Île Corail a DEUX rages au même seuil — 20 % ×2 et
 * 20 % ×2,5. Comme la pastille n'écrit que le seuil (le multiplicateur est dans
 * l'infobulle), elles se rendaient en « 20 % 20 % » : deux étiquettes que rien
 * ne distingue à l'œil, et React signalait deux enfants de même clé, donc un
 * rendu où l'une des deux peut disparaître sans prévenir. On regroupe donc par
 * seuil : une pastille par valeur de PV, et l'infobulle nomme TOUS les
 * multiplicateurs de ce seuil, du plus faible au plus fort. Rien du relevé n'est
 * jeté — la fiche du monstre, elle, garde une ligne par entrée parce qu'elle
 * écrit le multiplicateur à côté et qu'elles s'y distinguent.
 *
 * La clé porte le rang dans la liste et non le seuil : deux entrées de même
 * valeur ne peuvent plus se télescoper, quelle que soit la prochaine fouille.
 */
function Seuils({ m }: { m: Fiche }) {
  /** Un groupe par seuil de PV, dans l'ordre où le relevé les donne. */
  function parSeuil<T extends { pv: number }>(liste: T[]): { pv: number; tout: T[] }[] {
    const out: { pv: number; tout: T[] }[] = [];
    for (const e of liste) {
      const deja = out.find((g) => g.pv === e.pv);
      if (deja) deja.tout.push(e);
      else out.push({ pv: e.pv, tout: [e] });
    }
    return out;
  }
  const rage = parSeuil(m.rage ?? []);
  const soigne = parSeuil(m.soigne ?? []);
  if (!rage.length && !soigne.length) return null;
  /** « ×2 » ; « ×2 et ×2,5 » ; « ×2, ×2,5 et ×3 » — jamais une liste nue. */
  const et = (bouts: string[]) =>
    bouts.length < 2 ? (bouts[0] ?? "") : `${bouts.slice(0, -1).join(", ")} et ${bouts[bouts.length - 1]}`;
  return (
    <span style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 2, fontSize: 10.5, fontWeight: 400, ...NUM }}>
      {rage.map((g, i) => (
        <span key={`r${i}`}
          title={`Sous ${g.pv} % de ses PV, ses dégâts passent à ${et([...g.tout].sort((a, b) => a.x - b.x).map((r) => `×${r.x.toLocaleString("fr-FR")}`))}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--red)" }}>
          <Icon name="flame" size={11} />{g.pv}&nbsp;%
        </span>
      ))}
      {soigne.map((g, i) => (
        <span key={`s${i}`}
          title={`Sous ${g.pv} % de ses PV, il rend ${et([...g.tout].sort((a, b) => a.rend - b.rend).map((s) => `${s.rend} %`))} de sa vie`}
          style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--green)" }}>
          <Icon name="sparkles" size={11} />{g.pv}&nbsp;%
        </span>
      ))}
    </span>
  );
}

function Titre({ icon, apres, children }: { icon: IconName; apres?: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
      <span><Icon name={icon} size={12} style={{ marginRight: 5 }} />{children}</span>
      {apres && <span style={{ textTransform: "none", letterSpacing: 0, ...NUM }}>{apres}</span>}
    </div>
  );
}

/**
 * La barre de la colonne « par seconde ». UNE SEULE TEINTE, celle que la colonne
 * emploie déjà pour son chiffre : c'est la LONGUEUR qui porte la grandeur, jamais
 * la couleur (le vert et le doré ne se distinguent pas pour un daltonien protan).
 * Plancher à 1,5 % pour qu'une valeur dix fois plus faible que la première garde une
 * barre — une absence se lirait comme une donnée manquante. `aria-hidden` parce que
 * le nombre exact est juste au-dessus.
 */
function Barre({ part }: { part: number }) {
  return (
    <span aria-hidden="true" style={{ display: "block", height: 3, marginTop: 4, borderRadius: 2, background: "color-mix(in srgb, var(--border) 70%, transparent)" }}>
      <span style={{ display: "block", height: "100%", borderRadius: 2, background: "var(--red)", width: `${Math.max(1.5, Math.min(100, part * 100))}%` }} />
    </span>
  );
}
