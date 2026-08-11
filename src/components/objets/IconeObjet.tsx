"use client";
import { Icon } from "@/components/Icon";
import { BORDURE_GRADE, iconeDeType, type ObjetFiche } from "./vocabulaire";

/**
 * L'icône d'un objet, avec le cadre de grade que le jeu lui met.
 *
 * Les icônes du client font 32 px : agrandies, elles bavent. On les rend donc en
 * `pixelated` — c'est laid en flou, net en pixels, et c'est ce que le joueur a
 * sous les yeux en jeu.
 *
 * 935 objets sur 12 134 n'ont pas d'icône sur le disque. On ne pointe jamais un
 * fichier absent : le repli est le pictogramme du type, qui dit au moins de quoi
 * il s'agit. Une image cassée est pire que pas d'image.
 */
export function IconeObjet({ o, taille = 40 }: { o: ObjetFiche; taille?: number }) {
  const cadre = o.g ? BORDURE_GRADE[o.g] : null;
  return (
    <span style={{ position: "relative", width: taille, height: taille, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {o.ic ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/jeu/icones/${o.ic}`} alt="" width={taille} height={taille}
          style={{ width: taille, height: taille, objectFit: "contain", imageRendering: "pixelated" }} />
      ) : (
        <Icon name={iconeDeType(o.t, o.f)} size={Math.round(taille * 0.55)} style={{ color: "var(--text-muted)" }} />
      )}
      {cadre && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cadre} alt="" aria-hidden
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated", pointerEvents: "none" }} />
      )}
    </span>
  );
}
