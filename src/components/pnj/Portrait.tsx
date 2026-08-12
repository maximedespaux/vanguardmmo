"use client";
import { Icon } from "@/components/Icon";

/**
 * Le portrait de dialogue d'un PNJ, ou son remplacement.
 *
 * Les 131 fichiers de /jeu/pnj/ sont des PNG 200×240 à canal alpha : ils n'ont
 * pas de fond. Posés à nu sur le fond sombre du site, les cheveux et les
 * contours noirs disparaissent. D'où le dégradé clair DERRIÈRE l'image — c'est
 * aussi ce que fait la fenêtre de dialogue du jeu.
 *
 * Quand on n'a pas de visage, on ne bricole pas une image : on met l'initiale.
 * Un portrait attribué au mauvais PNJ serait pire que pas de portrait, donc
 * l'appariement ne descend jamais à la ressemblance de nom — il vient de la
 * chaîne SetImage → IDS_CHARACTER_INC_* → char_*.tga du client.
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
      {img ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={`/jeu/pnj/${img}`} alt={`Portrait de ${nom}`} width={taille} height={h}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
      ) : (
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-muted)", opacity: .75 }}>
          <Icon name="user" size={Math.round(taille * 0.34)} />
        </span>
      )}
    </span>
  );
}
