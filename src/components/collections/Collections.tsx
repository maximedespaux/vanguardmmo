"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { type SectionVolet } from "@/components/VoletSections";
import { Karma } from "./Karma";
import { Succes } from "./Succes";
import { Titres } from "./Titres";
import { type Collections as TCollections } from "./donnees";

/**
 * LES QUATRE VOLETS DE LA FAMILLE « Collections ».
 *
 * Titres, succès, carnets de cartes, karma PK : quatre choses dont le site ne
 * disait rien, et qui posent toutes la même question — « qu'est-ce qu'il me
 * reste à décrocher ? ».
 *
 * ILS ÉTAIENT SIX. La maîtrise d'arme et les anges (avec leur poudre féerique)
 * sont partis sur /mecaniques, sur demande de Maxime : « j'aimerais
 * concentrer sur une page pour comprendre en réalisant le build ». Ce sont des
 * MÉCANIQUES DE BUILD et pas des collections — on ne DÉCROCHE pas une maîtrise
 * d'arme, on la MONTE sur la pièce qu'on compose. Un sujet, une page : les
 * garder ici les aurait fait dire deux fois.
 *
 * NE PAS SUPPRIMER `./Anges` NI `./Maitrise` : ce sont toujours eux qui rendent
 * les deux volets, mais c'est désormais `mecaniques/SectionsBuild.tsx` qui les
 * importe. Il les enveloppe en plus d'un filtre que cette page n'avait pas —
 * leurs paliers annoncent de l'expérience, du taux de chute et des périns de
 * récompense, qui n'ont rien à faire à l'écran.
 *
 * Elles avaient leur page, /collections. Elles n'en ont plus besoin : « ce qu'on
 * fabrique » et « ce qu'on collectionne » sont deux faces de la même chose, ce
 * qui se décroche à la longue. Les deux familles vivent donc dans le rail de
 * /crafts, et ce fichier rend des sections au lieu d'une page. /collections
 * redirige.
 *
 * Les données arrivent par un seul appel à `/wiki/collections.json` (43 Ko), pas
 * par un import : un import statique de JSON part dans le paquet JS de la page
 * et se télécharge même quand on n'ouvre aucun volet. Et depuis la fusion, on ne
 * le demande QUE si le lecteur va de ce côté-là (`actif`) — celui qui vient
 * chercher une recette n'a pas à payer les collections.
 */

type Volet = {
  clef: string;
  titre: string;
  sous: string;
  icon: IconName;
  compte: (d: TCollections) => number;
  contenu: (d: TCollections) => ReactNode;
};

/** Les quatre volets, titres et comptes compris. Le compte de chaque entrée se lit
 *  sur le relevé : un nombre écrit à la main serait faux à la prochaine fouille. */
const VOLETS: Volet[] = [
  {
    clef: "titres", titre: "Titres d'honneur", sous: "Lequel tu peux viser maintenant", icon: "trophy",
    compte: (d) => d.titres.length,
    contenu: (d) => <Titres titres={d.titres} source={d.sources.titres} />,
  },
  {
    // La pastille compte les MARCHES, pas les familles : le client range ses
    // succès en 22 familles, mais sa famille « CHASSE » à elle seule pèse 82
    // marches sur onze régions — on la redécoupe par région, d'où un nombre de
    // cartes affichées supérieur au nombre de familles du client. Les marches,
    // elles, ne bougent pas.
    clef: "succes", titre: "Succès", sous: "Les marches, rangées par famille", icon: "medal",
    compte: (d) => d.nbSucces,
    contenu: (d) => <Succes familles={d.succesFamilles} nbSucces={d.nbSucces} source={d.sources.succes} />,
  },
  {
    /* LES CARNETS DES ARCANES ONT QUITTÉ CETTE PAGE, et c'est un doublon corrigé, pas
       une perte. Maxime : « tu avais fait le deck des arcanes et tu as repris dans
       collections le carnet des arcanes — évite les doublons, c'est de ça que je te
       parle. »

       Le sujet appartient à l'AIRBUILDER : un carnet donne un BONUS DE BUILD, on le
       consulte au moment d'équiper, pas en faisant l'inventaire de ses collections.
       C'est la même correction que la maîtrise d'arme et les anges, déplacés pour la
       même raison.

       ET LA VERSION D'ICI ÉTAIT LA MOINS BONNE DES DEUX. Elle lisait le relevé du
       client, qui n'a AUCUN nom français : elle affichait donc les carnets numérotés,
       en expliquant « on n'invente pas de nom français » — alors que les quinze noms
       existaient, écrits à la main par Maxime dans le builder. Celui du builder porte
       maintenant les deux : ses noms, et les 59 illustrations du client, greffées par
       scripts/completer-airbuilder-data.mjs.

       Le volet devient donc un RENVOI. Il reste dans le rail parce qu'on le cherche
       ici — les carnets sont bien une collection — mais il n'en développe plus le
       détail : une phrase et un lien. */
    clef: "cartes", titre: "Carnets de cartes", sous: "Le détail est dans l'AirBuilder", icon: "card",
    compte: (d) => d.decks.length,
    contenu: (d) => (
      <div style={{ fontSize: 13, lineHeight: 1.65 }}>
        Les {d.decks.length} carnets et leurs {d.nbCartesDefinies} cartes vivent dans l&apos;
        <a href="/builder" style={{ color: "var(--gn-accent)" }}>AirBuilder</a> : leur bonus
        compte dans ton build, donc il se lit au moment où tu équipes.
        <div style={{ color: "var(--text-muted)", marginTop: 8, fontSize: 12 }}>
          On y trouve les noms français des carnets et les illustrations du client, réunis —
          cette page-ci n&apos;avait que les seconds.
        </div>
      </div>
    ),
  },
  {
    clef: "karma", titre: "Karma PK", sous: "Ce que coûte une mauvaise réputation", icon: "skull",
    compte: (d) => d.karma.length,
    contenu: (d) => <Karma grades={d.karma} source={d.sources.karma} />,
  },
];

/** Ce qu'un volet montre avant que le relevé soit là — ou s'il ne vient pas. */
function Attente({ rate }: { rate: boolean }) {
  if (rate) {
    return (
      <p style={{ display: "flex", gap: 9, alignItems: "flex-start", margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>
        <Icon name="alert" size={16} style={{ color: "var(--red)", flexShrink: 0, marginTop: 2 }} />
        <span>Le relevé du client n&apos;a pas pu être chargé. Recharge la page ; s&apos;il manque toujours, le fichier <code>public/wiki/collections.json</code> n&apos;est pas en place.</span>
      </p>
    );
  }
  return <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Chargement du relevé du client…</p>;
}

export type EcranCollections = {
  sections: SectionVolet[];
  erreur: boolean;
  d: TCollections | null;
};

/**
 * @param actif — le lecteur regarde (ou s'apprête à regarder) cette famille.
 *   Tant qu'il est faux, rien n'est téléchargé ; les six volets existent quand
 *   même, pour que le rail ne change pas de forme quand la donnée arrive.
 */
export function useSectionsCollections(actif: boolean): EcranCollections {
  const [d, setD] = useState<TCollections | null>(null);
  const [rate, setRate] = useState(false);
  // Une seule demande pour toute la vie de la page : `actif` repasse à vrai
  // chaque fois qu'on revient sur la famille, et sans ce verrou on relirait
  // 43 Ko à chaque aller-retour.
  const demande = useRef(false);

  useEffect(() => {
    if (!actif || demande.current) return;
    demande.current = true;
    let vivant = true;
    fetch("/wiki/collections.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((x: TCollections) => { if (vivant) setD(x); })
      .catch(() => { if (vivant) setRate(true); });
    return () => { vivant = false; };
  }, [actif]);

  const sections: SectionVolet[] = VOLETS.map((v) => ({
    clef: v.clef,
    titre: v.titre,
    sous: v.sous,
    icon: v.icon,
    compte: d ? v.compte(d) : null,
    contenu: d ? v.contenu(d) : <Attente rate={rate} />,
  }));

  return { sections, erreur: rate, d };
}
