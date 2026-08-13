"use client";
import { useId, useRef, useState } from "react";

/**
 * LA BULLE — un détail au survol, sans quitter la page.
 *
 * Demande de Maxime : « faire plus des bulles interactives », et « enlever les
 * descriptions et textes, les images parlent beaucoup plus ». Les deux vont ensemble :
 * une bulle permet de RETIRER un paragraphe d'explication de la page tout en gardant
 * son contenu à portée de curseur. Le texte ne disparaît pas, il cesse d'occuper la
 * place que méritent les chiffres et les images.
 *
 * Ce n'est PAS `BulleObjet`, qui redessine la fiche d'une pièce d'équipement telle que
 * le jeu la montre. Celle-ci est générique : un mot, un chiffre, une icône, et ce
 * qu'on n'aurait pas devinée derrière.
 *
 * ┌──────────────── POURQUOI PAS `title=""` ────────────────┐
 * │ L'attribut `title` du navigateur existe et serait plus   │
 * │ simple. Il ne convient pas ici pour trois raisons        │
 * │ mesurables : il n'accepte que du texte brut (donc pas    │
 * │ d'icône du jeu, pas de nombre mis en valeur), il met une │
 * │ à deux secondes à apparaître, et il ne s'ouvre PAS au    │
 * │ toucher — sur téléphone, la moitié du contenu du site    │
 * │ deviendrait inatteignable. D'où le clic en plus du       │
 * │ survol.                                                 │
 * └─────────────────────────────────────────────────────────┘
 *
 * TROIS PARTIS PRIS :
 *
 * 1. SURVOL **ET** CLIC. Le survol pour la souris, le clic pour le doigt. Le clic
 *    verrouille la bulle ouverte : sans ça, un utilisateur au doigt la voit
 *    disparaître dès qu'il bouge.
 * 2. LA BULLE SORT DU FLUX MAIS PAS DE L'ARBRE. `position: absolute` dans un parent
 *    `relative`, et pas un portail : un portail imposerait de calculer la position à
 *    la main, et surtout PIÈGE DÉJÀ PAYÉ SUR CE SITE — une modale posée haut dans
 *    l'arbre s'est retrouvée enfermée par un ancêtre portant un `transform`. Ici la
 *    bulle est petite et suit son ancre.
 * 3. ELLE EXISTE POUR UN LECTEUR D'ÉCRAN. `aria-describedby` relie l'ancre à son
 *    contenu : une bulle purement visuelle rendrait le détail invisible à qui ne
 *    survole pas.
 */
export function Bulle({ children, quoi, cote = "haut", largeur = 260 }: {
  /** L'ancre : le mot, le chiffre ou l'icône qu'on survole. */
  children: React.ReactNode;
  /** Ce qu'on découvre. Accepte du JSX : une icône du jeu, un chiffre en valeur. */
  quoi: React.ReactNode;
  /** Au-dessus par défaut ; « bas » quand l'ancre est en haut de l'écran. */
  cote?: "haut" | "bas";
  largeur?: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [verrou, setVerrou] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement | null>(null);
  const visible = ouvert || verrou;

  return (
    <span
      ref={ref}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setOuvert(true)}
      onMouseLeave={() => setOuvert(false)}
    >
      <button
        type="button"
        aria-describedby={visible ? id : undefined}
        aria-expanded={visible}
        onClick={(e) => { e.stopPropagation(); setVerrou((v) => !v); }}
        /* LE VERROU NE SAUTE PAS QUAND LE FOCUS ENTRE DANS LA BULLE.
           `onBlur={() => setVerrou(false)}` fermait la bulle dès que l'ancre perdait
           le focus — y compris quand il partait vers un LIEN posé À L'INTÉRIEUR du
           contenu. Le contenu étant démonté sur ce même rendu, le lien disparaissait
           avant que la tabulation ou le doigt ne l'atteigne : injoignable autrement
           qu'à la souris. Il y a de tels liens en service (la bulle « pièces de
           meuble » de /astuces mène à /crafts, et NomObjet mène à une fiche).
           `relatedTarget` est l'élément qui REÇOIT le focus : s'il est dans l'ancre
           ou dans la bulle, on garde ouvert. `null` (clic dans le vide, changement
           d'onglet) ferme, comme avant. */
        onBlur={(e) => {
          if (ref.current?.contains(e.relatedTarget as Node | null)) return;
          setVerrou(false);
        }}
        style={{
          /* Le pointillé sous l'ancre est le SEUL signal qu'il y a quelque chose
             derrière. Sans lui, la bulle n'est découverte que par hasard, et le
             paragraphe qu'elle remplace est perdu pour de bon. */
          background: "none", border: "none", padding: 0, font: "inherit", color: "inherit",
          cursor: "help", borderBottom: "1px dotted var(--orange)", lineHeight: "inherit",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}
      >
        {children}
      </button>
      {visible && (
        <span
          id={id}
          role="tooltip"
          style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            [cote === "haut" ? "bottom" : "top"]: "calc(100% + 8px)",
            width: largeur, maxWidth: "min(88vw, 340px)", zIndex: 60,
            background: "var(--bg-2)", border: "1px solid var(--orange)", borderRadius: 10,
            padding: "10px 12px", fontSize: 12, lineHeight: 1.55, color: "var(--text)",
            boxShadow: "0 8px 26px rgba(0,0,0,.55)", textAlign: "left",
            /* `normal` explicitement : la bulle est souvent posée dans une cellule de
               tableau en `nowrap`, et elle héritait alors du non-retour à la ligne —
               une phrase de trente mots sur une seule ligne qui sortait de l'écran. */
            whiteSpace: "normal", fontWeight: 400,
          }}
        >
          {quoi}
        </span>
      )}
    </span>
  );
}

/**
 * LE REPÈRE « ON NE LE DEVINE PAS EN JEU ».
 *
 * C'est le critère de tri que Maxime a donné pour toutes les pages : « trier les
 * informations sur le plan intérêt et détails qu'on va pas forcément deviner en game ».
 * Ce composant le rend visible — une pastille qui dit qu'on tient là quelque chose que
 * le jeu ne montre pas, et pas une redite de ce que l'écran de jeu affiche déjà.
 *
 * À employer AVEC PARCIMONIE. Si tout est marqué, plus rien ne l'est : la pastille ne
 * va qu'à ce qui est réellement invisible en jouant — la barre de vie d'un boss qui
 * annonce 2 milliards quand il en faut 30, un nom de gemme qui ne correspond pas à son
 * effet, un plafond de sertissage à huit et non cinq.
 */
export function Invisible({ enJeu, children }: {
  /** Ce que le jeu montre, ou ne montre pas — la raison d'être de la pastille. */
  enJeu: string;
  children: React.ReactNode;
}) {
  return (
    <Bulle quoi={<><b style={{ color: "var(--gold)" }}>Invisible en jeu.</b> {enJeu}</>}>
      {children}
      <span aria-hidden="true" style={{
        fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5,
        color: "var(--gold)", background: "color-mix(in srgb, var(--gold) 14%, transparent)",
        border: "1px solid color-mix(in srgb, var(--gold) 38%, transparent)",
        borderRadius: 20, padding: "0 5px", whiteSpace: "nowrap",
      }}>hors jeu</span>
    </Bulle>
  );
}
