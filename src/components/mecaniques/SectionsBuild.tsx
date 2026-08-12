"use client";
import { useEffect, useState } from "react";
import { Anges } from "@/components/collections/Anges";
import { Maitrise } from "@/components/collections/Maitrise";
import { Icon } from "@/components/Icon";
import type { Ange, Collections } from "@/components/collections/donnees";

/**
 * LA MAÎTRISE D'ARME, LES ANGES ET LA POUDRE FÉERIQUE — sur la planche du build.
 *
 * Ces trois-là étaient sur /crafts, arrivées là en venant de /collections quand
 * les deux pages ont fusionné. Le reproche est net : « j'ai plus les
 * informations de la poudre féerique des fées, maîtrise d'arme […] j'aimerais
 * concentrer sur une page pour comprendre en réalisant le build ». Et il est
 * juste : on ne DÉCROCHE pas une maîtrise d'arme, on la MONTE sur l'arme qu'on
 * est en train de composer — au même titre qu'un perçage ou un éveil. Elles
 * appartiennent à /builder/mecaniques.
 *
 * LES DEUX ÉCRANS SONT REPRIS TELS QUELS (`collections/Maitrise.tsx` et
 * `collections/Anges.tsx`). Les redessiner aurait donné deux calculateurs sur
 * les mêmes paliers, qui divergent au premier ajustement. Ce fichier ne fait
 * qu'une chose : apporter la donnée jusqu'à eux.
 *
 * UNE SEULE DEMANDE POUR LES DEUX VOLETS. `/wiki/collections.json` pèse 43 Ko et
 * les deux volets en ont besoin ; la promesse est donc gardée au niveau du
 * module. Sans ce partage, ouvrir « Maîtrise » puis « Anges » téléchargeait le
 * relevé deux fois, et rouvrir le premier une troisième.
 */

let promesse: Promise<Collections> | null = null;
function releve(): Promise<Collections> {
  promesse ??= fetch("/wiki/collections.json").then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<Collections>;
  });
  return promesse;
}

function useReleve() {
  const [d, setD] = useState<Collections | null>(null);
  const [rate, setRate] = useState(false);
  useEffect(() => {
    let vivant = true;
    releve().then(
      (x) => { if (vivant) setD(x); },
      () => {
        if (vivant) setRate(true);
        // La promesse ratée ne doit pas rester en cache : sinon un incident
        // réseau condamne le volet pour toute la vie de la page.
        promesse = null;
      });
    return () => { vivant = false; };
  }, []);
  return { d, rate };
}

/** Ce qu'un volet montre avant que le relevé soit là — ou s'il ne vient pas. */
function Attente({ rate }: { rate: boolean }) {
  if (!rate) return <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Chargement du relevé du client…</p>;
  return (
    <p style={{ display: "flex", gap: 9, alignItems: "flex-start", margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>
      <Icon name="alert" size={16} style={{ color: "var(--red)", flexShrink: 0, marginTop: 2 }} />
      <span>
        Le relevé du client n&apos;a pas pu être chargé. Recharge la page ; s&apos;il manque
        toujours, le fichier <code>public/wiki/collections.json</code> n&apos;est pas en place.
      </span>
    </p>
  );
}

/**
 * LES SIX PASTILLES « M » DU JEU.
 *
 * Le client en livre six : le même dessin dans six teintes. Ce qu'aucun fichier
 * ne dit, c'est quelle teinte vaut quel palier — les six couleurs ne suivent ni
 * l'échelle des raretés (il y manque le bleu, il s'y ajoute un vert) ni les
 * treize paliers de la table. On les montre donc POUR CE QU'ELLES SONT, la
 * marque que le jeu pose sur une arme maîtrisée, et sans légende par teinte, qui
 * serait une invention.
 *
 * `expertise-*` et non `maitrise-*` : le dossier porte les deux séries, et ce ne
 * sont pas les mêmes dessins — celle-ci fait 25 px et garde son cadre ouvragé,
 * l'autre fait 14 px. À la taille où la page les montre, la seconde ne serait
 * qu'une tache.
 */
const PASTILLES = [1, 2, 3, 4, 5, 6];
function PastillesM() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 13,
      background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11, padding: "9px 13px" }}>
      <span style={{ display: "inline-flex", gap: 5 }}>
        {PASTILLES.map((n) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={n} src={`/jeu/mecaniques/expertise-${n}.webp`} alt="" aria-hidden="true"
            width={25} height={25} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
        ))}
      </span>
      <span style={{ fontSize: 12.5, color: "var(--text-muted)", flex: "1 1 240px", lineHeight: 1.45 }}>
        La marque que le jeu pose sur une arme maîtrisée, telle qu&apos;elle est dans le client.
      </span>
    </div>
  );
}

/* ── LES TROIS RÉCOMPENSES QUI NE VONT PAS À L'ÉCRAN ────────────────────────
 *
 * Règle de la maison : les taux de drop, l'expérience et les penyas de
 * récompense ne sont ni colonne, ni tri, ni pastille, ni mention. Le relevé des
 * anges écrit ses buffs en une seule chaîne, et ces trois-là y sont dedans :
 * « Exp +25% / PvE +1% / Dépla +5% / All Stat +10 » aux quatre premiers paliers
 * de Goldea, « Drop +1 / Penyas 35% » à son cinquième, et
 * « Exp +125% PvE+7% Dépla+30% All stat+35 » sur le buff commun des quinze
 * habillages — celui-là s'affichait à l'ouverture du volet, sans qu'on clique.
 *
 * On ne peut donc pas filtrer une ligne : il faut retirer le FRAGMENT et
 * recoller la chaîne. Le séparateur du relevé est tantôt « / », tantôt l'espace,
 * d'où la reprise des deux. Quand il ne reste rien du buff — le palier 50 de
 * Goldea n'est QUE du drop et de la penya —, le palier disparaît : un « — » dans
 * la colonne dirait que ce niveau ne donne rien, ce qui serait faux.
 *
 * Ce filtre est ici, dans le fichier qui apporte la donnée aux deux volets, et
 * pas dans `collections/Anges.tsx` : ce composant n'appartient pas à cette page,
 * et le relevé garde ses valeurs intactes — la règle dit qu'elles restent dans
 * les données. */
/* Le `\b` après le mot n'est pas décoratif : sans lui, « exp » mordrait dans
 * n'importe quel mot commençant par ces lettres et laisserait sa fin à l'écran. */
const FRAGMENT_RECOMPENSE = /(?:^|\s|\/)\s*(?:exp|xp|drop|penyas?)\b\s*\+?\s*[\d.,]*\s*%?/gi;
function sansRecompense(buff: string): string {
  return buff.replace(FRAGMENT_RECOMPENSE, " ")
    .replace(/\s*\/\s*\/\s*/g, " / ").replace(/^\s*\/\s*|\s*\/\s*$/g, "")
    .replace(/\s{2,}/g, " ").trim();
}
function angesSansRecompense(anges: Ange[]): Ange[] {
  return anges.map((a) => ({
    ...a,
    paliers: a.paliers
      .map((p) => ({ ...p, buff: sansRecompense(p.buff) }))
      .filter((p) => p.buff.length > 0),
  }));
}

export function VoletMaitrise() {
  const { d, rate } = useReleve();
  if (!d) return <Attente rate={rate} />;
  return (
    <>
      <PastillesM />
      <Maitrise m={d.maitrise} source={d.sources.maitrise} />
    </>
  );
}

export function VoletAnges() {
  const { d, rate } = useReleve();
  if (!d) return <Attente rate={rate} />;
  return <Anges anges={angesSansRecompense(d.anges)} poudre={d.poudre} source={d.sources.anges} />;
}
