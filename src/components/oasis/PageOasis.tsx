"use client";
import { useCardFx } from "@/components/VgFx";
import { EnteteVolet, VoletSections } from "@/components/VoletSections";
import { Deroule } from "./Deroule";
import { Emblemes } from "./Emblemes";
import { Reserves } from "./Reserves";
import { Vagues } from "./Vagues";
import { bilan, nb, pvCourt, type Vague } from "./modele";

/**
 * LA PAGE, EN QUATRE FACETTES.
 *
 * Le rail plutôt qu'une longue colonne, pour une raison précise : quatre
 * questions se posent ici et une seule à la fois. « Comment ça marche ? » quand
 * on n'y a jamais mis les pieds, « qu'est-ce qui m'attend à la vague 40 ? » quand
 * on y est, « est-ce que ça vaut ma soirée ? » quand on compte ses emblèmes, et
 * « est-ce que je peux faire confiance à cette page ? » quand on veut bâtir un
 * plan dessus. Empilées, la dernière serait enterrée sous 52 lignes de tableau —
 * or c'est justement celle qu'il ne faut pas manquer.
 *
 * Les vagues arrivent déjà lues par le serveur (voir donnees.ts) : rien ici ne
 * va chercher un fichier.
 */
export function PageOasis({ vagues }: { vagues: Vague[] }) {
  useCardFx();
  const b = bilan(vagues);

  return (
    <VoletSections
      defaut="marche"
      entete={
        <EnteteVolet
          icon="tower"
          titre="Protection de l'Oasis"
          marque={{ texte: `${b.vagues} vagues, puis la fin`, couleur: "var(--orange)" }}
          sous={
            <>
              Le mode s&apos;appelle <b style={{ color: "var(--text)" }}>Protection de l&apos;Oasis</b>, la
              carte <b style={{ color: "var(--text)" }}>Tour Infernale</b>. Un tour complet, c&apos;est
              {" "}{nb(b.monstres)} monstres et <b style={{ color: "var(--text)" }}>{pvCourt(b.pv)} de points de
              vie</b> à sortir, pour {nb(b.primeSimple + b.primeSup)} emblèmes.
            </>
          }
        />
      }
      sections={[
        { clef: "marche", titre: "Comment ça se passe", sous: "Le déroulé, lu dans le client", icon: "clock", compte: null, contenu: <Deroule b={b} /> },
        { clef: "vagues", titre: "Les vagues, une par une", sous: "Ce qui arrive et ce que ça encaisse", icon: "layers", compte: b.vagues, contenu: <Vagues vagues={vagues} b={b} /> },
        { clef: "emblemes", titre: "Ce que ça te rapporte", sous: "Les emblèmes et ce qu'ils achètent", icon: "medal", compte: b.primeSimple + b.primeSup, contenu: <Emblemes b={b} /> },
        { clef: "reserves", titre: "À prendre avec des pincettes", sous: "Ce qu'on ne sait pas encore", icon: "alert", compte: 4, contenu: <Reserves vagues={vagues} b={b} /> },
      ]}
    />
  );
}
