"use client";
import Link from "next/link";
import { createContext, useContext } from "react";

/**
 * UN NOM DE CRÉATURE QUI MÈNE À SA FICHE.
 *
 * RÈGLE DE LA MAISON : un sujet, une page. Les monstres appartiennent à
 * /monstres — /donjons ne garde d'eux que ce qui fait DÉCIDER d'entrer (les PV à
 * sortir, la faiblesse, une rage scriptée) et pointe la fiche pour le reste. Sans
 * ce lien, les quatre-vingt-cinq créatures citées ici étaient des culs-de-sac : il
 * fallait retenir un nom, ouvrir /monstres, et le retaper.
 *
 * ┌───────── POURQUOI UN CONTEXTE, ET PAS UNE PROPRIÉTÉ ─────────┐
 * │ La table des identifiants est lue côté SERVEUR (le catalogue  │
 * │ fait 612 Ko, cf. app/(public)/donjons/donnees.ts) et les noms │
 * │ sont écrits par cinq composants différents, jusqu'à quatre    │
 * │ niveaux plus bas. La passer de main en main aurait ajouté une │
 * │ propriété à chacun d'eux, y compris à ceux qui ne la lisent   │
 * │ pas. Un contexte la dépose une fois pour toute la page.       │
 * └──────────────────────────────────────────────────────────────┘
 *
 * SANS IDENTIFIANT, PAS DE LIEN. La table ne contient que les clés qui désignent
 * UNE seule fiche : DEUX créatures de cette page sont de vrais jumeaux — le Lézard
 * Prestigieux (niveau 180, 2 M PV, deux caméléons dans le client) et Elin (niveau
 * 129, deux mobs d'Ishtar) —, mêmes niveau, mêmes PV, deux identifiants. Comme
 * l'une des deux est nommée deux fois sur la page, ce sont TROIS mentions sur 86
 * qui restent du texte, pour 83 liées. Un lien qui se trompe une fois sur deux vaut
 * moins qu'un nom qui reste du texte : elles s'affichent donc telles quelles, sans
 * que rien ne le signale — il n'y a rien à en dire.
 */
const Ctx = createContext<Record<string, string>>({});

/** La clé d'appariement, la même qu'à la lecture : le nom, le niveau, les PV. */
export const clefMonstre = (nom: string, niv: number, pv: number) => `${nom}|${niv}|${pv}`;

export function IdsMonstres({ ids, children }: { ids: Record<string, string>; children: React.ReactNode }) {
  return <Ctx.Provider value={ids}>{children}</Ctx.Provider>;
}

export function LienMonstre({ nom, niv, pv, couleur }: {
  nom: string; niv: number; pv: number;
  /** La couleur du texte quand il n'est pas lié : le rang la porte parfois. */
  couleur?: string;
}) {
  const id = useContext(Ctx)[clefMonstre(nom, niv, pv)];
  /* La couleur du rang s'applique DANS LES DEUX CAS : elle n'est pas la marque du
     lien, c'est le renseignement (un « super » se repère sans lire l'étiquette). La
     lui retirer quand il n'y a pas de fiche aurait fait passer trois créatures pour
     des rangs ordinaires. */
  if (!id) return <span style={{ color: couleur }}>{nom}</span>;
  return (
    <Link
      href={`/monstres/${encodeURIComponent(id)}`}
      /* Une tuile de donjon est cliquable dans son entier : sans ce `stopPropagation`,
         cliquer le nom d'un monstre ouvrait la fiche du donjon PAR-DESSUS la
         navigation, et on atterrissait sur /monstres avec une modale ouverte. */
      onClick={(e) => e.stopPropagation()}
      style={{ color: couleur ?? "inherit", textDecoration: "none", borderBottom: "1px dotted var(--orange)" }}
    >
      {nom}
    </Link>
  );
}
