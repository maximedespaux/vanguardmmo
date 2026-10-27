"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { GesteReserve } from "@/components/BandeauVitrine";
import { type SectionVolet } from "@/components/VoletSections";
import type { EtatVisiteur } from "@/lib/vitrine";
// La forme « relevé dans le client du jeu : <fichier> » est née avec les volets
// de collections. Depuis la fusion c'est la même page : on reprend la brique au
// lieu d'en redessiner une deuxième qui divergerait au premier ajustement.
import { Source } from "@/components/collections/briques";
import { CarteRecette, Recettes, STATUT, type Recette } from "./Piece";
import { ArbreDuFarm, type ArbreCraft } from "./Arbre";

/**
 * LES SIX VOLETS DE LA FAMILLE « Les crafts ». Interactifs, donc client — mais
 * la donnée reste derrière /api/crafts (apiEspace("astuces")) : elle n'est pas embarquée
 * dans le paquet JS de la page.
 *
 * Deux sources, complémentaires et qui ne disent pas la même chose :
 *   · les recettes d'échange du client, avec leurs QUANTITÉS et leur STATUT ;
 *   · les arbres de craft maison, avec OÙ FARMER chaque ingrédient.
 * La première ne dit pas où farmer, la seconde ne dit pas combien. On les montre
 * côte à côte plutôt que d'en fabriquer une troisième qui aurait l'air complète.
 *
 * CE FICHIER NE DESSINE PLUS LE RAIL. /crafts porte désormais DEUX familles —
 * ce qu'on fabrique et ce qu'on collectionne — dans un seul rail. Il n'y a donc
 * plus un écran par famille mais un écran (Etabli) qui compose les deux listes
 * de sections. D'où le crochet : il rend des sections, pas une page.
 */

type Atelier = { titre: string; texte: string; pct: number[]; penya: number[] };
type Metier = { metier: string; pnj: string[] };
export type Depart = {
  genere: string;
  maison: Recette[];
  arbres: ArbreCraft[];
  ateliers: Atelier[];
  metiers: Metier[];
  total: number; actives: number; eteintes: number; orphelines: number; pnjDistincts: number;
};

/**
 * Le titre, la ligne de sous-titre et l'icône de chaque volet, écrits UNE fois.
 *
 * Le rail existe dès l'arrivée, avant que le relevé soit chargé : sans cette
 * table, le squelette et les vraies sections auraient porté deux jeux de
 * libellés, et le rail aurait changé de mots en cours de route.
 */
const META: Record<string, { titre: string; sous: string; icon: IconName }> = {
  maison: { titre: "Ce qu’Airborn a écrit", sous: "masques, mantras, buffs de guilde, couturier", icon: "hammer" },
  arbre: { titre: "Où farmer chaque morceau", sous: "l’arbre maison, étage par étage", icon: "tree" },
  comptoirs: { titre: "Les comptoirs à jetons", sous: "GvG, Colisée, FLY SHOP, fragments", icon: "coins" },
  recherche: { titre: "Qui échange quoi", sous: "qui vend ça, et que vend celui-là", icon: "search" },
  ateliers: { titre: "Les ateliers du jeu", sous: "les panneaux d’aide, avec leurs vrais chiffres", icon: "wrench" },
  /* « Où chercher ailleurs » et non « Ce que le client ne dit pas » : le volet ne
     porte plus des trous, il porte des RENVOIS — le wiki pour les menus récents, et
     deux certitudes qui font arrêter de chercher. Le titre annonçait un inventaire
     de nos manques, ce qui n'est le sujet de personne. */
  manques: { titre: "Où chercher ailleurs", sous: "ce qui n’est pas dans ce relevé, et où c’est", icon: "help" },
};
/** L'ordre du rail. Il suit la lecture : ce qu'on fabrique, où le farmer, ce
 *  qu'on achète, puis les outils de recherche et les réserves. */
const ORDRE = ["maison", "arbre", "comptoirs", "recherche", "ateliers", "manques"] as const;

/**
 * CE QUI NE SE MONTRE PAS, quel que soit le lecteur. Règle de la maison, sans
 * exception : rien qui porte ce nom ne se compte ni ne s'affiche.
 *
 * ATTENTION, CE FILTRE NE COUVRE QUE LES ATELIERS. Le relevé porte aussi 64 recettes
 * du comptoir Yggdrasil et un arbre (« Rune d'énergie d'isthar ») qui nomment Baruna,
 * et ceux-là passent par /api/crafts (vues `comptoirs` et `recherche`), dont les
 * COMPTES — total, actives, éteintes, orphelines — sont calculés côté serveur sur
 * l'ensemble. Les filtrer ici ferait mentir ces compteurs. Le seul endroit où ce
 * retrait se fait sans créer de contradiction est src/app/api/crafts/route.ts, dans
 * `charger()`, avant que les comptes soient faits — plus la fonction `chiffres()` de
 * src/app/(vitrine)/crafts/page.tsx, qui compte le fichier brut. Les deux sont hors
 * de ce lot.
 */
const SANS = /baruna/i;

/**
 * CE QUE CHAQUE VOLET CONTIENT, DIT À CELUI QUI NE PEUT PAS L'OUVRIR.
 *
 * Le mode vitrine ne consiste pas à cacher poliment : il consiste à montrer qu'il y a
 * quelque chose. Un visiteur qui trouve six panneaux vides s'en va ; un visiteur qui
 * lit ce qu'il y a derrière revient avec un compte.
 *
 * AUCUN CHIFFRE DANS CES SIX PHRASES, et c'est une règle, pas un oubli : ces comptes
 * vivent dans le relevé, que le visiteur ne charge pas. Les écrire ici les figerait à
 * la main et ils démentiraient le relevé au premier versement — le site a déjà payé ça
 * trois fois. Les seuls chiffres que voit un visiteur sont ceux de l'en-tête de page,
 * comptés sur les fichiers à chaque rendu.
 */
const PROMESSE: Record<string, string> = {
  maison: "Les menus qu’Airborn a écrits lui-même — masques, mantras, buffs de guilde, couturier, rachat de matériaux — avec les quantités exactes de chaque rang.",
  arbre: "Les arbres de fabrication maison : sur quel monstre et dans quelle zone ramasser chaque morceau, étage par étage.",
  comptoirs: "Les barèmes des comptoirs à jetons : Guerre de Guilde, Colisée, FLY SHOP, fragments de cartes, Yggdrasil.",
  recherche: "Chercher un objet ou un PNJ : qui vend ça, et que vend celui-là — les deux questions au même endroit.",
  /* PAS « avec leurs taux ». Sur les vingt-et-un panneaux, TROIS seulement portent un
     pourcentage — et un visiteur ne peut pas le vérifier avant d'avoir un compte, ce
     qui est exactement la situation où une promesse trop large se retourne. On promet
     ce qu'il y a : le texte du jeu, mot pour mot, et les chiffres quand il en donne. */
  ateliers: "Les fenêtres de transformation du jeu, mot pour mot : sertissage, forge, désintégration, mélange de costumes — et les chiffres quand le panneau en donne.",
  manques: "Ce que le client ne dit pas — pour ne pas passer une soirée à chercher ce qui n’y est nulle part.",
};

/** Les trois portes ouvertes sans compte, quand celle-ci est fermée. */
const AILLEURS: { href: string; icon: IconName; quoi: string }[] = [
  { href: "/astuces", icon: "compass", quoi: "Par où commencer" },
  { href: "/prestige", icon: "star", quoi: "Ce que coûte un prestige" },
  { href: "/donjons", icon: "skull", quoi: "Les instances" },
];

/**
 * LE CHAMP DE RECHERCHE, extrait pour être rendu DEUX fois : vivant pour un membre,
 * inerte sous <GesteReserve> pour un visiteur.
 *
 * Extrait et non recopié : deux copies d'un même champ divergent au premier
 * ajustement, et c'est la version morte — celle qu'on ne teste jamais — qui aurait
 * gardé l'ancien texte d'invite.
 */
function ChampRecherche({ q, surQ, inerte = false }: { q: string; surQ: (v: string) => void; inerte?: boolean }) {
  return (
    <label style={{ position: "relative", display: "block", marginBottom: 14 }}>
      <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-muted)" }} />
      {/* `inerte` SORT LE CHAMP DU PARCOURS AU CLAVIER, et ce n'est pas un détail de
          confort. <GesteReserve> enveloppe son enfant dans un conteneur
          aria-hidden + pointer-events:none : la souris ne l'atteint plus, mais la
          touche Tab, elle, y entrait encore — un lecteur au clavier tombait dans un
          champ que son lecteur d'écran n'annonce pas et où la frappe ne fait rien.
          Un élément focusable sous aria-hidden est interdit par ARIA pour cette
          raison exacte. `disabled` plutôt que `tabIndex={-1}` : il coupe aussi la
          saisie, et l'explication est déjà posée par-dessus par GesteReserve. */}
      <input id="cr-q" value={q} onChange={(e) => surQ(e.target.value)}
        disabled={inerte}
        placeholder="un objet, ou le nom d’un PNJ — « Perin », « Bibi », « Emblème »…"
        style={{
          width: "100%", padding: "10px 12px 10px 35px", fontFamily: "inherit", fontSize: 13,
          background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)",
        }} />
    </label>
  );
}

/**
 * UN VOLET DE CRAFTS VU PAR QUI N'EST PAS MEMBRE.
 *
 * Trois étages, dans cet ordre — et l'ordre est le message :
 *  1. CE QU'IL Y A DERRIÈRE, en clair et lisible. Ce n'est pas la donnée, c'est sa
 *     description : rien ici ne se recopie dans un tableur de guilde rivale.
 *  2. LE GESTE, quand le volet en porte un — le champ de recherche, le bouton des
 *     barèmes. Rendu, visible, et neutralisé par <GesteReserve>, qui pose le cadenas
 *     et la raison PAR-DESSUS. Un contrôle simplement absent ne se raconte pas ; un
 *     contrôle grisé qui dit pourquoi, si. Les quatre volets sans geste reçoivent la
 *     même pastille, seule.
 *  3. OÙ ALLER MAINTENANT. Un mur sans issue est un cul-de-sac ; trois portes
 *     ouvertes, non.
 *
 * CE QU'ON NE FAIT PAS : un faux squelette de contenu. Des barres grises floutées
 * feraient croire à une donnée chargée puis masquée, alors qu'elle n'a jamais
 * traversé le réseau. Le refus est prononcé par /api/crafts, côté serveur, et cette
 * page ne fait même pas la demande.
 */
function VoletFerme({ etat, clef, geste }: { etat: EtatVisiteur; clef: string; geste?: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-muted)", margin: 0 }}>{PROMESSE[clef]}</p>

      {geste ? (
        <GesteReserve etat={etat} pourquoi="Réservé aux membres de GENESIS">{geste}</GesteReserve>
      ) : (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 7, justifySelf: "start",
          fontSize: 12.5, fontWeight: 600, background: "var(--bg-2)", border: "1px solid var(--gn-accent)",
          borderRadius: 20, padding: "7px 14px", color: "var(--text)",
        }}>
          <Icon name="lock" size={13} style={{ color: "var(--gn-accent)" }} />Réservé aux membres de GENESIS
        </span>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", paddingTop: 4, borderTop: "1px solid var(--border)" }}>
        <span style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".7px", color: "var(--text-muted)", marginTop: 10 }}>
          Ouvert sans compte
        </span>
        {AILLEURS.map((a) => (
          <a key={a.href} href={a.href} style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, textDecoration: "none",
            fontSize: 12.5, fontWeight: 600, color: "var(--text)", background: "var(--bg-3)",
            border: "1px solid var(--border)", borderRadius: 9, padding: "6px 11px",
          }}>
            <Icon name={a.icon} size={13} style={{ color: "var(--gn-accent)" }} />{a.quoi}
          </a>
        ))}
      </div>
    </div>
  );
}

/** La CSS des grilles de cette famille. Posée par l'écran qui compose la page :
 *  ces classes ne servent qu'aux sections ci-dessous. */
export const cssCrafts = `
.cr-grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:11px}
.cr-metiers{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:9px}
.cr-ateliers{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:11px;align-items:start}
`;

export type EcranCrafts = {
  sections: SectionVolet[];
  /** Incrémenté quand un clic sur un PNJ doit rouvrir la recherche. */
  saut: number;
  erreur: boolean;
  d: Depart | null;
};

/** Un titre de bloc à l'intérieur d'une section, avec ce qu'il faut savoir avant de lire. */
function Bloc({ icon, titre, compte, note, children }: {
  icon: IconName; titre: string; compte?: number; note?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h3 className="font-heading" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 700, margin: "0 0 6px" }}>
        <Icon name={icon} size={15} style={{ color: "var(--gn-accent)" }} />
        {titre}
        {compte != null && <span style={{ fontSize: 11.5, fontWeight: 400, color: "var(--text-muted)" }}>{compte}</span>}
      </h3>
      {note && <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-muted)", margin: "0 0 11px" }}>{note}</p>}
      {children}
    </section>
  );
}

/**
 * OÙ CHERCHER CE QUI N'EST PAS ICI — trois renvois, et pas huit constats.
 *
 * ┌──────────── ILS ÉTAIENT HUIT, RÈGLE 2 DE LA MAISON ────────────┐
 * │ « Si les renseignements ne sont pas complets, tu oublies » —    │
 * │ sauf la mise en garde qui protège d'une erreur coûteuse. Le     │
 * │ test appliqué aux huit : est-ce que ça change le GESTE ?        │
 * │                                                                │
 * │  · les chances de raffinage +1→+20 « absentes, personne ne les  │
 * │    a » ................................. NON, constat pur      │
 * │  · les chances de désintégration, « le jeu renvoie à son site » │
 * │    ...................................... NON, constat pur     │
 * │  · la table d'objets de la récolte, « aucun objet »             │
 * │    ...................................... NON, et hors sujet   │
 * │  · les neuf statistiques du sertissage ultime ... DOUBLON : le  │
 * │    volet « ateliers » porte déjà ce renvoi vers les mécaniques  │
 * │  · où les PNJ sont posés .... FONDU dans `Reserve()`, qui pose  │
 * │    déjà la même réserve à l'endroit où elle sert                │
 * │  · les vingt-quatre menus récents ....... OUI : ça dit d'aller  │
 * │    chercher au wiki, donc ça déplace le lecteur                │
 * │  · les recettes de métier ou de cuisine ... OUI : « il n'y en a │
 * │    pas » est une certitude, pas une ignorance — on arrête de    │
 * │    chercher                                                    │
 * │  · le butin ordinaire des monstres ...... OUI : la provenance   │
 * │    est le cœur du wiki, et croire qu'un objet ne tombe pas      │
 * │    parce qu'on ne l'a pas trouvé coûte des semaines de farm     │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Hors du corps du crochet : ce sont des constats de fouille, ils ne dépendent
 * d'aucune donnée chargée, et le rail a besoin de leur nombre pour afficher sa
 * pastille avant que le relevé arrive.
 */
const MANQUES: [string, React.ReactNode][] = [
  /* LE « sur 856 » EST PARTI. L'en-tête de la page affiche « 834 échanges de PNJ »,
     compté sur crafts.json ; cette phrase annonçait 856 juste en dessous. Deux
     nombres pour deux relevés différents — l'extrait du dépôt et la fouille source —
     mais rien à l'écran ne les distinguait, et le lecteur voyait la page se
     contredire. Le relevé source n'est pas dans le dépôt : 856 ne se recalcule pas,
     donc il ne peut pas rester écrit à la main. Le fait utile est le RECOUVREMENT
     minuscule, pas son dénominateur — c'est lui qui est gardé. */
  ["Les vingt-quatre menus les plus récents", <>Anniversaire, runes Yggdrasil, nucléus, artefacts, prestige du World Boss, sets Tank, Noël et Halloween 2024 : <b>déclarés</b> et <b>câblés à un PNJ</b>, mais leur contenu vit côté serveur. Ces recettes-là sont dans <a href="/wiki" style={{ color: "var(--gn-accent)" }}>le wiki</a> — les deux relevés ne se recouvrent qu’à <b>22 recettes</b>.</>],
  ["Les recettes de métier ou de cuisine", <>Il n’y en a pas dans ce jeu. Rien à chercher.</>],
  ["Le butin ordinaire des monstres", <>Le serveur le calcule, le client ne le porte pas. Quand une page du site ne trouve pas d’où vient un objet, ça ne veut <b>jamais</b> dire qu’il ne tombe pas.</>],
];

/**
 * L'avertissement qu'on répète parce qu'il change ce qu'on fait de la page.
 *
 * Il a absorbé le trou « où les PNJ sont posés », qui disait la même chose une
 * ligne plus bas : c'est le MÊME fichier manquant, et il n'a d'importance que
 * parce qu'il fragilise le mot « jouable ». Le dire deux fois faisait douter
 * qu'il s'agisse de la même réserve.
 */
function Reserve() {
  return (
    <div style={{ display: "flex", gap: 9, padding: "10px 12px", borderRadius: 10, background: "var(--bg-3)", border: "1px dashed var(--border)", fontSize: 12, lineHeight: 1.6, color: "var(--text-muted)" }}>
      <Icon name="info" size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--gold)" }} />
      <span>
        « <b>Jouable</b> » veut dire <b>branchée sur la fiche du PNJ</b>, pas « je l’ai vue en
        jeu » : aucun fichier du relevé ne dit où les PNJ sont posés.
        Une recette <b style={{ color: "var(--red)" }}>éteinte</b>, en revanche, est une
        certitude — sa ligne est commentée, donc personne ne peut la faire.
      </span>
    </div>
  );
}

/**
 * @param etat — l'état du visiteur, rendu par `etatVisiteur()` côté serveur et
 *   descendu en prop. Quand il ne peut pas agir, ce crochet NE DEMANDE RIEN : ni au
 *   montage, ni au clic sur les barèmes, ni à la frappe dans la recherche. Trois
 *   raisons, dans l'ordre d'importance :
 *     · un 403 par volet dans la console d'un visiteur ressemble à une panne du site,
 *       et c'est la première chose qu'un joueur curieux ouvre ;
 *     · l'attente « Lecture du relevé du client… » n'aboutirait jamais ;
 *     · le serveur n'a pas à traiter des demandes dont on connaît déjà la réponse.
 *   Ce n'est PAS le verrou. Le verrou est `apiEspace("astuces")` dans /api/crafts :
 *   quelqu'un qui appelle la route à la main se fait refuser par le serveur, pas par
 *   cet écran. Ici on évite un bruit, là-bas on refuse.
 */
export function useSectionsCrafts(etat: EtatVisiteur): EcranCrafts {
  const ouvert = etat.peutAgir;
  const [d, setD] = useState<Depart | null>(null);
  const [erreur, setErreur] = useState(false);

  // Chargé au clic, pas au montage : envoyer les 834 recettes d'entrée ferait
  // 280 Ko pour des écrans que la plupart n'ouvriront pas.
  const [comptoirs, setComptoirs] = useState<Recette[] | null>(null);
  const [q, setQ] = useState("");
  const [trouve, setTrouve] = useState<{ recettes: Recette[]; total: number } | null>(null);

  useEffect(() => {
    if (!ouvert) return;
    fetch("/api/crafts?vue=depart")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      /* BARUNA NE S'AFFICHE PAS, ET NE SE COMPTE PAS. Deux des vingt-trois panneaux
         d'atelier du client portent ce nom (« Gemme d'arme de Baruna », « Retirer une
         gemme (Baruna) ») et arrivaient à l'écran tels quels. Le filtre est posé ICI,
         sur la donnée qui vient d'atterrir, et pas au rendu : `d.ateliers.length`
         nourrit à la fois la pastille du volet et la phrase de l'en-tête, si bien
         qu'un filtre au rendu aurait laissé un compteur qui annonce plus de panneaux
         qu'il n'en montre — le défaut le plus cher de ce site.
         Rien n'est perdu : le retrait d'une gemme ultime a son propre panneau, et
         c'est celui-là qui porte la mise en garde utile. */
      .then((x: Depart) => setD({ ...x, ateliers: x.ateliers.filter((a) => !SANS.test(a.titre + " " + a.texte)) }))
      .catch(() => setErreur(true));
  }, [ouvert]);

  const chargerComptoirs = useCallback(() => {
    if (comptoirs || !ouvert) return;
    fetch("/api/crafts?vue=comptoirs")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((x) => setComptoirs(x.recettes))
      .catch(() => setComptoirs([]));
  }, [comptoirs, ouvert]);

  // La recherche part après une pause : une requête par touche frappée réveillerait
  // le serveur dix fois pour un mot de dix lettres.
  useEffect(() => {
    const k = q.trim();
    if (!ouvert || k.length < 2) { setTrouve(null); return; }
    const t = setTimeout(() => {
      fetch(`/api/crafts?vue=recherche&q=${encodeURIComponent(k)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(setTrouve)
        .catch(() => setTrouve({ recettes: [], total: 0 }));
    }, 220);
    return () => clearTimeout(t);
  }, [q, ouvert]);

  const parGroupe = useMemo(() => {
    const m = new Map<string, Recette[]>();
    for (const r of d?.maison ?? []) {
      if (!m.has(r.g)) m.set(r.g, []);
      m.get(r.g)!.push(r);
    }
    return m;
  }, [d]);

  const maisonParId = useMemo(() => new Map((d?.maison ?? []).map((r) => [r.id, r])), [d]);

  const comptoirsParGroupe = useMemo(() => {
    const m = new Map<string, Recette[]>();
    for (const r of comptoirs ?? []) {
      if (!m.has(r.g)) m.set(r.g, []);
      m.get(r.g)!.push(r);
    }
    return m;
  }, [comptoirs]);

  /**
   * Cliquer le nom d'un PNJ écrit son nom dans la recherche et OUVRE cette section.
   *
   * Sans le second geste, le clic était mort : la recherche se remplissait dans un
   * panneau qu'on ne voyait pas. VoletSections garde sa section ouverte dans son
   * propre état et n'expose que `defaut` — on la remonte donc avec une clef neuve,
   * ce qui la fait repartir sur la section voulue. Le compteur sert à ce que deux
   * clics de suite sur des PNJ différents remontent bien deux fois.
   */
  const [saut, setSaut] = useState(0);
  const surPnj = (nom: string) => {
    setQ(nom);
    setSaut((n) => n + 1);
    // Après le remontage : sans l'attente, l'input n'existe pas encore.
    setTimeout(() => document.querySelector<HTMLInputElement>("#cr-q")?.focus(), 0);
  };

  /**
   * LE VISITEUR — six volets fermés, mais six volets QUI EXISTENT.
   *
   * Ce branchement passe AVANT celui de l'attente, et il ne partage rien avec lui :
   * ce n'est pas un chargement qui n'aboutit pas, c'est un refus. Les deux se
   * ressemblaient à l'écran (un panneau, une phrase grise) et se seraient confondus
   * dans la tête du lecteur — l'un dit « patiente », l'autre « reviens avec un
   * compte », et ce ne sont pas les mêmes gestes.
   *
   * Le rail garde ses six titres, ses six sous-titres et son ordre : c'est la table
   * des matières de la page, et c'est ELLE qui donne envie. Les pastilles de compte
   * restent vides — ces comptes sont dans le relevé qu'on ne charge pas, et un zéro
   * s'y lirait « il n'y a rien ».
   *
   * Deux volets portent un GESTE et le rendent pour de vrai, inerte : la recherche et
   * le bouton des barèmes. Voir <VoletFerme>.
   */
  if (!ouvert) {
    return {
      sections: ORDRE.map((c): SectionVolet => ({
        clef: c, ...META[c], compte: null,
        contenu: (
          <VoletFerme etat={etat} clef={c}
            geste={
              c === "recherche" ? <ChampRecherche q="" surQ={() => {}} inerte />
                : c === "comptoirs" ? (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700,
                    padding: "10px 14px", borderRadius: 10, background: "rgba(var(--gn-lueur-rgb),.1)",
                    border: "1px solid color-mix(in srgb, var(--gn-accent) 45%, transparent)", color: "var(--gn-accent)",
                  }}>
                    <Icon name="download" size={14} /> Charger les barèmes
                  </span>
                ) : undefined
            } />
        ),
      })),
      saut, erreur: false, d: null,
    };
  }

  // Les six volets existent AVANT le relevé : le rail est la table des matières
  // de la page, il ne doit ni apparaître en retard ni changer de forme quand la
  // donnée arrive. Seul le contenu attend.
  if (!d) {
    return {
      sections: ORDRE.map((c): SectionVolet => ({
        clef: c, ...META[c], compte: null,
        contenu: erreur
          ? <p style={{ fontSize: 13, color: "var(--red)", margin: 0 }}>Le relevé des crafts n’a pas pu être chargé.</p>
          : <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Lecture du relevé du client…</p>,
      })),
      saut, erreur, d: null,
    };
  }

  const g = (k: string) => parGroupe.get(k) ?? [];
  const c = (k: string) => comptoirsParGroupe.get(k) ?? [];

  const sections: SectionVolet[] = [

    // ── 1 · le fait maison ────────────────────────────────────────────────────
    {
      clef: "maison", ...META.maison,
      compte: d.maison.length,
      contenu: (
        <>
          <div style={{ marginBottom: 18 }}><Reserve /></div>

          {/* ┌─────── LES CINQ NOTES SONT PASSÉES DE 430 MOTS À 120 ───────┐
              Le tri est le même partout : on garde ce qui CHANGE UN GESTE, on retire
              ce qui raconte l'état du site ou reformule la liste posée juste dessous.
              PARTI, et nommé pour qu'on ne le remette pas :
               · « le site n'en connaissait que quatre runes », « le site avait les
                 buffs, pas ce qu'ils coûtent » — la progression de notre propre
                 relevé, invisible pour un joueur ;
               · « ce n'est pas un objectif de soirée, c'est un objectif de guilde » —
                 le nombre 1 400 le dit mieux, et sans nous ;
               · « si un officier en a lancé un, dis-le, ça vaut correction » — un
                 appel à contribution, pas un renseignement ;
               · la correction du PNJ « Changori » du wiki communautaire — un rectificatif
                 sur un site tiers, que personne ne vient chercher ici.
              GARDÉ, parce que ça coûte cher de l'ignorer : les branches ÉTEINTES (on
              ne farme pas pour une recette infaisable), les recettes SANS PNJ, le
              doublon des coffrets du couturier, et le meilleur taux d'Angie. */}
          <Bloc icon="mask" titre="Les masques" compte={g("masques").length}
            note={<>
              Trois branches — <b>PvE</b>, <b>PvP</b>, <b>PV</b> — de trois rangs, chez
              <b> [Masque] Bibi la Bicrave</b>. <b style={{ color: "var(--red)" }}>La branche PvP est
              éteinte</b>, et ses quantités sont le double. Le rang 3 monte à <b>1 400 Âmes de
              sentinelles géants dekanes</b>.
            </>}>
            <Recettes liste={g("masques")} surPnj={surPnj} />
          </Bloc>

          <Bloc icon="rune" titre="Les mantras" compte={g("mantras").length}
            note={<>
              <b>Trois branches × trois paliers</b> chez le <b>Sage des Mantras</b>. La branche PvP
              est éteinte, et <b>les trois paliers 3 sont commentés</b> dans le fichier : jamais
              livrés, donc à ne pas viser — le <b>Mantra Bestial</b> compris, malgré sa recette
              écrite. La branche PV n’a pas de nom français dans le client, d’où les libellés bancals.
            </>}>
            <Recettes liste={g("mantras")} surPnj={surPnj} />
          </Bloc>

          <Bloc icon="shield" titre="Les buffs de guilde" compte={g("buffs").length}
            note={<>
              Libellés réels : <b>« PVE+7% pour toute la guilde »</b> et <b>« HP+7% pour toute la
              guilde »</b>. <b style={{ color: "var(--gold)" }}>Aucun PNJ ne les porte</b> dans ce
              relevé — écrites, mais rien ne prouve qu’on puisse les faire.
            </>}>
            <Recettes liste={g("buffs")} surPnj={surPnj} />
          </Bloc>

          <Bloc icon="shirt" titre="Le couturier" compte={g("couturier").length}
            note={<>
              <b>Karlagarfeld</b>, le seul couturier du serveur.{" "}
              <b style={{ color: "var(--gold)" }}>Quatre des cinq coffrets</b> demandent des
              ingrédients identiques sous le <b>même identifiant de libellé</b> : seul le premier
              est vraisemblablement atteignable. Ne promets pas un coffret farmeur avant de
              l’avoir vu sortir.
            </>}>
            <Recettes liste={g("couturier")} surPnj={surPnj} />
          </Bloc>

          <Bloc icon="gem" titre="Matériaux, rareté, démontage" compte={g("materiaux").length}
            note={<>
              <b>Angie</b> reprend tes matériaux contre des Perins — meilleur taux de la liste :{" "}
              <span style={{ fontVariantNumeric: "tabular-nums" }}>9 999</span> Branches de Cormier
              pour <span style={{ fontVariantNumeric: "tabular-nums" }}>500</span> Perins. Le démontage
              des dix armes vampiriques est <b style={{ color: "var(--red)" }}>éteint</b>.
            </>}>
            <Recettes liste={g("materiaux")} surPnj={surPnj} />
          </Bloc>
        </>
      ),
    },

    // ── 2 · l'arbre ───────────────────────────────────────────────────────────
    {
      clef: "arbre", ...META.arbre,
      compte: d.arbres.length,
      contenu: (
        <>
          {/* CE PARAGRAPHE EXPLIQUAIT LE DESSIN QUI N'EXISTAIT PAS ENCORE. Sa dernière
              phrase — « quand la source dit Crafting…, le bouton descend d'un étage » —
              décrivait en mots ce que l'arbre montre maintenant par un trait et un
              chevron ; sa légende, deux icônes, remplace la consigne. Reste la source,
              parce qu'elle explique pourquoi ces 39 fabrications n'ont pas de quantités
              là où les 834 échanges en ont. */}
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-muted)", margin: "0 0 14px" }}>
            Relevé dans les <b>descriptions françaises des ingrédients</b> — la seule source qui
            dise <b>sur quel monstre et dans quelle zone</b> ramasser chaque morceau.
          </p>
          <ArbreDuFarm arbres={d.arbres}
            carteRecette={(id) => {
              const r = maisonParId.get(id);
              return r ? <CarteRecette r={r} surPnj={surPnj} /> : null;
            }} />
        </>
      ),
    },

    // ── 3 · les comptoirs ─────────────────────────────────────────────────────
    {
      clef: "comptoirs", ...META.comptoirs,
      // Les barèmes se chargent au clic : avant, le compte n'existe pas — d'où la
      // pastille absente plutôt qu'un zéro, qui se lirait « il n'y a rien ».
      // `|| null` et non `comptoirs ? ... : null` : quand la lecture ÉCHOUE, l'état
      // retombe sur une liste vide, et un « 0 » dans le rail annoncerait qu'il n'y a
      // pas de comptoir alors qu'il y en a 295. Vu à l'écran une fois.
      compte: comptoirs?.length || null,
      contenu: (
        <>
          <p style={{ fontSize: 12.5, lineHeight: 1.65, color: "var(--text-muted)", margin: "0 0 14px" }}>
            Ici on ne fabrique pas, on paie — en pièces, en emblèmes, en jetons. Ce sont les
            barèmes qu’on veut connaître <b>avant</b> de dépenser.
          </p>
          {comptoirs === null ? (
            <button onClick={chargerComptoirs} style={{
              display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13,
              padding: "10px 14px", borderRadius: 10, background: "rgba(var(--gn-lueur-rgb),.1)",
              border: "1px solid color-mix(in srgb, var(--gn-accent) 45%, transparent)", color: "var(--gn-accent)", fontWeight: 700,
            }}>
              <Icon name="download" size={14} /> Charger les barèmes
            </button>
          ) : (
            <>
              <Bloc icon="swords" titre="Guerre de Guilde" compte={c("gvg").length}
                note={<>
                  <b>Marchand de Guerre de Guilde</b>, en <b>Pièce de Guerre de Guilde</b> : les
                  <b> dix armes « éternelles » à 10 pièces</b>, la Cape de Mahtolle à 20.
                </>}>
                <Recettes liste={c("gvg")} surPnj={surPnj} />
              </Bloc>

              <Bloc icon="medal" titre="Jetons Bleus et Jetons Secrets" compte={c("jetons-guilde").length}
                note={<>
                  Boîtes surprises d’armure et d’arme à <b>100 Jetons Bleus</b>, par classe. Le reste
                  en <b>Jetons Secrets</b>, la monnaie des Chambres secrètes.
                </>}>
                <Recettes liste={c("jetons-guilde")} surPnj={surPnj} />
              </Bloc>

              <Bloc icon="trophy" titre="Colisée" compte={c("colisee").length}
                note={<>
                  <b>[Armes du colisée] Bademogeau</b>, trois monnaies : <b>Emblème bleu</b>,
                  <b> rouge</b>, <b>de victoire</b>. Plusieurs lignes tirent
                  <b> une carte au hasard parmi cinq</b> — la pastille violette le dit.
                </>}>
                <Recettes liste={c("colisee")} surPnj={surPnj} />
              </Bloc>

              <Bloc icon="card" titre="Fragments → cartes et gemmes" compte={c("fragments").length}
                note={<>
                  <b>Dix fragments font une pièce entière.</b> Chaque carte de perçage a
                  <b> sa propre</b> matière première : les cartes en pourcentage et les cartes (S) ne
                  se mélangent pas. Les 2 / 4 / 7 % sont écrites
                  mais <b style={{ color: "var(--gold)" }}>sans PNJ</b>.
                </>}>
                <Recettes liste={c("fragments")} surPnj={surPnj} />
              </Bloc>

              <Bloc icon="coin" titre="FLY SHOP" compte={c("flyshop").length}
                note={<>Payé en <b>FLY coins</b>. Sept rayons branchés ; le rayon costume est éteint.</>}>
                <Recettes liste={c("flyshop")} surPnj={surPnj} />
              </Bloc>

              <Bloc icon="shirt-armor" titre="Yggdrasil niveau 155" compte={c("yggdrasil").length}
                note={<>
                  <b>Toutes ces pièces coûtent exactement la même chose</b> : Feuille d’Yggdrasil ×15
                  + Esprits de Dryade Purifiée ×15 + Branche d’Yggdrasil Purifié ×15 — une recette
                  chez l’entraîneur de chaque classe. Les <b>armes</b> au même prix existent dans le
                  fichier mais <b style={{ color: "var(--gold)" }}>aucun PNJ ne les propose</b>.
                </>}>
                <Recettes liste={c("yggdrasil")} surPnj={surPnj} />
              </Bloc>

              <Bloc icon="tag" titre="Lettres FLY / FOR / FUN" compte={c("coupang").length}
                note={<>Chez <b>Coupang</b> : trois lettres contre un coupon. Les vingt-quatre lignes
                  sont les combinaisons « normale » et « évènement » — <b>trois échanges</b>, écrits
                  vingt-quatre fois.</>}>
                <Recettes liste={c("coupang")} surPnj={surPnj} />
              </Bloc>
            </>
          )}
        </>
      ),
    },

    // ── 4 · chercher ──────────────────────────────────────────────────────────
    {
      clef: "recherche", ...META.recherche,
      sous: `${d.total} recettes, ${d.pnjDistincts} PNJ nommés`,
      compte: null,
      contenu: (
        <>
          {/* Le même champ que celui rendu inerte pour un visiteur : une seule
              définition, donc aucune chance que les deux divergent. */}
          <ChampRecherche q={q} surQ={setQ} />

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14, fontSize: 12, color: "var(--text-muted)" }}>
            {([["on", d.actives], ["off", d.eteintes], ["orphelin", d.orphelines]] as const).map(([k, n]) => (
              <span key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: STATUT[k].couleur }} />
                <b style={{ fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>{n}</b> {STATUT[k].mot.toLowerCase()}
              </span>
            ))}
          </div>

          {trouve ? (
            <>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 11px" }}>
                {trouve.total === 0 ? "Rien sous ce mot." : (
                  <>
                    <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{trouve.total}</b> recette{trouve.total > 1 ? "s" : ""}
                    {trouve.total > trouve.recettes.length && <> — les {trouve.recettes.length} premières, les jouables d’abord</>}
                  </>
                )}
              </p>
              <Recettes liste={trouve.recettes} surPnj={surPnj} vide="" />
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "0 0 18px" }}>
              Deux lettres suffisent — objets <b>et</b> noms de PNJ.
            </p>
          )}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <h3 className="font-heading" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 700, margin: "0 0 4px" }}>
              <Icon name="users" size={15} style={{ color: "var(--gn-accent)" }} /> Les métiers, tels que le jeu les étiquette
            </h3>
            {/* L'exemple qui suivait — « le PNJ étiqueté joaillerie est bien celui qui
                échange les gemmes » — démontrait la validation croisée. La grille de
                métiers juste en dessous la démontre mieux : on y voit les noms. */}
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-muted)", margin: "0 0 12px" }}>
              Le client range ses PNJ par type de bâtiment, dans une partie du fichier qui ne sait
              rien des menus : c’est <b>la validation croisée</b> de tout ce qui précède.
            </p>
            <div className="cr-metiers">
              {d.metiers.map((m) => (
                <div key={m.metier} className="fx-card" style={{ padding: "9px 11px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--gn-accent)", marginBottom: 3 }}>{m.metier}</div>
                  <div style={{ fontSize: 12.5, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {m.pnj.map((p) => (
                      <button key={p} onClick={() => surPnj(p)} style={{
                        background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit",
                        fontSize: 12.5, color: "var(--text)", textDecoration: "underline", textDecorationStyle: "dotted",
                        textDecorationColor: "var(--border)",
                      }}>{p}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ),
    },

    // ── 5 · les ateliers du jeu ───────────────────────────────────────────────
    {
      clef: "ateliers", ...META.ateliers,
      compte: d.ateliers.length,
      contenu: (
        <>
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-muted)", margin: "0 0 14px" }}>
            Les <b>fenêtres de transformation</b> du jeu, mot pour mot : la seule source qui donne
            les taux de réussite et ce qu’on perd en cas d’échec.
          </p>
          {/* UN SUJET, UNE PAGE — et le lien qui va avec.
              La maîtrise d'arme, les anges et la poudre féerique ont quitté cette page
              pour /mecaniques : ce sont des mécaniques de build, pas des
              collections. Elles n'y sont plus, vérifié — Collections.tsx ne rend que
              quatre volets, et `chiffres()` de la page ne lit plus ni `anges` ni
              `maitrise`. Ce qui manquait, c'est la PORTE : quelqu'un qui les cherchait
              ici trouvait le silence. Une phrase et un lien, pas un développement. */}
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px" }}>
            <Icon name="arrow-right" size={12} style={{ marginRight: 5, color: "var(--gn-accent)" }} />
            Sertissage, perçage, runes, éveil, maîtrise d’arme, anges et poudre féerique :
            sur <a href="/mecaniques" style={{ color: "var(--gn-accent)" }}>les mécaniques</a>.
          </p>
          <div className="cr-ateliers">
            {d.ateliers.map((a) => (
              <div key={a.titre} className="fx-card" style={{ padding: "12px 14px", borderRadius: 11, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 5 }}>{a.titre}</div>
                <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0, color: "var(--text-muted)", whiteSpace: "pre-line" }}>{a.texte}</p>
                {(a.pct.length > 0 || a.penya.length > 0) && (
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 9 }}>
                    {a.pct.map((p) => (
                      <span key={"p" + p} style={{ fontSize: 11.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", padding: "2px 8px", borderRadius: 20, color: p >= 90 ? "var(--green)" : "var(--gold)", background: "var(--bg-3)", border: "1px solid var(--border)" }}>{p}&nbsp;%</span>
                    ))}
                    {a.penya.map((p) => (
                      <span key={"y" + p} style={{ fontSize: 11.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", padding: "2px 8px", borderRadius: 20, color: "var(--text-muted)", background: "var(--bg-3)", border: "1px solid var(--border)" }}>{p.toLocaleString("fr-FR")} penya</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ),
    },

    // ── 6 · les trous ─────────────────────────────────────────────────────────
    {
      clef: "manques", ...META.manques,
      // Les réserves sont écrites en dur ci-dessous : ce sont des CONSTATS de fouille,
      // pas des lignes de relevé. Le compte suit donc la liste elle-même — elles étaient
      // huit, le tri de la règle 2 en a gardé trois (voir MANQUES), et ce commentaire
      // n'a pas à porter un nombre que `MANQUES.length` donne déjà juste.
      compte: MANQUES.length,
      contenu: (
        <div style={{ display: "grid", gap: 12 }}>
          <Reserve />
          {MANQUES.map(([t, corps], i) => (
            <div key={i} style={{ padding: "11px 13px", borderRadius: 11, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
              <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>
                <Icon name="x" size={13} style={{ color: "var(--red)", flexShrink: 0 }} />{t}
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0, color: "var(--text-muted)" }}>{corps}</p>
            </div>
          ))}
          {/* D'OÙ SORT CE VOLET. L'en-tête de la page nommait ces fichiers dans sa
              colonne de droite ; cette colonne est partie (elle étranglait le
              sous-titre sur un téléphone), la provenance ne devait pas partir avec.
              Elle atterrit ici, dans le volet qui parle justement de ce que le
              relevé contient et de ce qu'il ne contient pas. Même forme que la
              source des volets de collections : c'est la même page maintenant. */}
          <Source fichier="Exchange_Script.txt + character.inc (les recettes chiffrées) · propitem.txt.txt (l’arbre du farm)"
            avertissement={<>Le relevé date du <b>client d’octobre 2025</b>. Les deux sources ne se recouvrent presque pas : celle des recettes donne les quantités et le PNJ sans dire où farmer, celle des descriptions dit où farmer sans donner les quantités.</>} />
        </div>
      ),
    },
  ];

  return { sections, saut, erreur, d };
}
