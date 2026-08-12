"use client";

/**
 * Le portrait de dialogue d'un PNJ, ou son remplacement.
 *
 * Les 131 fichiers de /jeu/pnj/ sont des PNG 200×240 à canal alpha : ils n'ont pas de
 * fond. Posés à nu sur le fond sombre du site, les cheveux et les contours noirs
 * disparaissent. D'où le dégradé clair DERRIÈRE l'image — c'est aussi ce que fait la
 * fenêtre de dialogue du jeu.
 *
 * ┌──────────── LE REPLI EST UNE IMAGE DU JEU ────────────┐
 * │ Il y avait ici un pictogramme maison « utilisateur ».  │
 * │ Le client porte sa propre image pour ce cas :          │
 * │ `char_question.webp`, un gros point d'interrogation     │
 * │ jaune, l'un des 37 portraits que le client n'attache à  │
 * │ personne. Vérifié à l'œil avant de le brancher — c'est  │
 * │ bien un « ? » sur fond transparent, pas un visage.      │
 * │                                                        │
 * │ Ça reste un REPLI, pas une attribution. Un portrait     │
 * │ donné au mauvais PNJ serait pire que pas de portrait,   │
 * │ donc l'appariement ne descend jamais à la ressemblance  │
 * │ de nom : il vient de la chaîne                          │
 * │ SetImage → IDS_CHARACTER_INC_* → char_*.tga du client.  │
 * └────────────────────────────────────────────────────────┘
 */
export function Portrait({ img, nom, taille = 84 }: { img: string | null; nom: string; taille?: number }) {
  const h = Math.round((taille * 240) / 200); // le format d'origine, 200×240
  return (
    <span
      style={{
        display: "block", width: taille, height: h, flexShrink: 0, borderRadius: 10, overflow: "hidden",
        border: "1px solid var(--border)",
        background: "linear-gradient(165deg, rgba(255,210,74,.16), rgba(90,110,160,.14) 55%, rgba(10,10,12,.35))",
        position: "relative",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img ? `/jeu/pnj/${img}` : "/jeu/pnj/char_question.webp"}
        alt={img ? `Portrait de ${nom}` : `Aucun portrait pour ${nom}`}
        width={taille} height={h}
        style={{
          width: "100%", height: "100%", display: "block",
          objectFit: img ? "cover" : "contain", objectPosition: "top center",
          // Le « ? » est un dessin plein cadre : à pleine opacité il criait plus fort
          // qu'un vrai visage voisin dans la même grille.
          opacity: img ? 1 : 0.5, padding: img ? 0 : "14%", boxSizing: "border-box",
        }}
      />
    </span>
  );
}
