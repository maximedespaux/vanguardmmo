"use client";
import { Icon } from "@/components/Icon";
import { IconeGrade, type Grade } from "@/components/jeu/Rarete";
import { iconeDeType, type ObjetFiche } from "./vocabulaire";

/**
 * L'icône d'un objet, dans le cadre que le jeu lui met.
 *
 * LE CADRE VIENT DE `components/jeu/Rarete.tsx`. Ce fichier posait sa propre image
 * de bordure en absolu par-dessus l'icône ; c'était la troisième copie de la même
 * idée sur le site, et elle ignorait la marge de 12 % que `IconeGrade` réserve à la
 * lueur du cadre — la lueur est précisément ce qui signale le grade.
 *
 * ┌─────────────── DEUX AXES, PAS UNE ÉCHELLE ───────────────┐
 * │ Les GRADES (unique, ultime) et les quatre RARETÉS (commun,│
 * │ rare, épique, légendaire) sont deux axes séparés. Le      │
 * │ catalogue réduit ne porte QUE le grade : aucun champ du   │
 * │ client ne donne la rareté d'un objet (`dwItemRare` est un │
 * │ poids de tirage, pas un cran). On n'affiche donc jamais   │
 * │ les cadres de carte `bordure_*` ici — ce serait inventer  │
 * │ un renseignement qu'on n'a pas.                           │
 * └───────────────────────────────────────────────────────────┘
 *
 * Les icônes du client font 32 px : agrandies, elles bavent. On les rend donc en
 * `pixelated` — net en pixels, et c'est ce que le joueur a sous les yeux en jeu.
 *
 * 935 objets sur 12 134 n'ont pas d'icône sur le disque. On ne pointe jamais un
 * fichier absent : le repli est le pictogramme du type, qui dit au moins de quoi il
 * s'agit. Une image cassée est pire que pas d'image.
 */
export function IconeObjet({ o, taille = 40 }: { o: ObjetFiche; taille?: number }) {
  const icone = o.ic ? `/jeu/icones/${o.ic}` : null;
  const grade: Grade | null = o.g === "Unique" ? "unique" : o.g === "Ultime" ? "ultimate" : null;

  if (grade && icone) return <IconeGrade icone={icone} grade={grade} taille={taille} titre={o.g} />;

  return (
    <span style={{ position: "relative", width: taille, height: taille, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {icone ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icone} alt="" width={taille} height={taille}
          style={{ width: taille, height: taille, objectFit: "contain", imageRendering: "pixelated" }} />
      ) : (
        <Icon name={iconeDeType(o.t, o.f)} size={Math.round(taille * 0.55)} style={{ color: "var(--text-muted)" }} />
      )}
    </span>
  );
}
