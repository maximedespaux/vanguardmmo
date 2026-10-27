"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { IconeGrade } from "@/components/jeu/Rarete";
import { COULEUR_GRADE } from "@/components/objets/vocabulaire";
import { infoType, type Entree } from "./vocabulaire";

/**
 * UNE LIGNE DE RÉSULTAT — la même dans la page et dans le champ compact.
 *
 * Quatre choses, et rien d'autre : l'image du jeu, le nom, ce que c'est, et où ça se
 * trouve. Une ligne de résultat qui décrit longuement n'est plus une liste : on ne
 * balaie plus, on lit. Les mots-clés sont donc des pastilles, pas des phrases.
 *
 * ELLE MÈNE TOUJOURS QUELQUE PART. `href` vient de l'index, et il pointe la page
 * PROPRIÉTAIRE du sujet — un objet vers sa fiche, un monstre vers la sienne, une
 * recette vers /crafts, un PNJ vers l'annuaire, une compétence vers /classes. Un
 * résultat sans adresse n'est pas un résultat.
 */

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

/**
 * UNE ICÔNE PAR NATURE DE PROVENANCE — et pas une punaise pour trois sens.
 *
 * Le bloc de provenance dit cinq choses différentes selon la ligne : où trouver un
 * objet, ce qu'un monstre lâche, ce qu'une recette demande, ce qu'un PNJ propose, ce
 * qu'une compétence débloque. La punaise servait pour TROIS d'entre elles — un objet,
 * un marchand et une compétence — et l'intitulé qui les distinguait vivait dans un
 * `title=""`, que le DOIGT N'OUVRE JAMAIS (voir le cadre « POURQUOI PAS title="" » en
 * tête de src/components/Bulle.tsx). Sur téléphone, la ligne d'un PNJ montrait donc une
 * punaise suivie de trois noms d'objets, sans rien pour dire qu'il les VEND.
 *
 * ET PAS UNE <Bulle> ICI : la ligne entière est un <Link>, et `Bulle` rend un bouton —
 * un bouton dans un lien n'est pas du HTML valide. C'est l'icône qui doit porter le
 * sens, doublée d'un intitulé caché pour les lecteurs d'écran, que l'icône seule laisse
 * muets. Zéro mot ajouté à l'écran.
 */
const ICONE_PROV: Record<Entree["t"], IconName> = {
  objet: "map-pin",
  monstre: "swords",
  recette: "hammer",
  pnj: "cart",
  competence: "graduation",
};

/**
 * L'intitulé passe par l'ICÔNE ELLE-MÊME, pas par un texte caché.
 *
 * Un `<span>` en hors-écran aurait marché, mais il ajoute quatre mots de DOM par ligne —
 * cent soixante sur une page de quarante résultats, sur une page dont toute la consigne
 * est d'en écrire moins. `Icon` étale ses props APRÈS son `aria-hidden` : lui passer
 * `aria-hidden={false}` et un `aria-label` nomme le pictogramme sans poser un seul mot
 * de plus dans la page.
 */
const nomme = (titre: string) => ({ "aria-hidden": false as const, "aria-label": titre, role: "img" });

/**
 * L'IMAGE, ou rien.
 *
 * Trois cas, dans cet ordre : le cadre de grade du client quand l'objet en porte un
 * (c'est la lueur qui signale l'unique et l'ultime), l'icône du jeu, et à défaut le
 * pictogramme de la nature. On ne pointe JAMAIS un fichier absent — 935 objets sur
 * 12 134 n'ont pas d'icône sur le disque, et aucun monstre n'a d'image du tout.
 */
function Vignette({ e, taille = 34 }: { e: Entree; taille?: number }) {
  if (e.grade && e.img) return <IconeGrade icone={e.img} grade={e.grade} taille={taille} titre={e.grade === "unique" ? "Unique" : "Ultime"} />;

  if (e.img) {
    /* Les portraits de PNJ sont des 200×240, pas des carrés : en `contain` ils
       flottaient au milieu d'un carré vide. En `cover` cadré haut, on voit le visage —
       ce qui est exactement ce qu'on cherche à reconnaître. Les icônes d'objet, elles,
       font 32 px et doivent rester nettes en pixels. */
    const portrait = e.t === "pnj";
    return (
      <span style={{
        width: taille, height: taille, flexShrink: 0, borderRadius: portrait ? 8 : 0,
        overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: portrait ? "var(--bg-3)" : undefined,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={e.img} alt="" width={taille} height={taille}
          style={{
            width: taille, height: taille,
            objectFit: portrait ? "cover" : "contain",
            objectPosition: portrait ? "center top" : undefined,
            imageRendering: portrait ? undefined : "pixelated",
          }} />
      </span>
    );
  }

  return (
    <span style={{
      width: taille, height: taille, flexShrink: 0, borderRadius: 8,
      background: "var(--bg-3)", border: "1px solid var(--border)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}>
      <Icon name={infoType(e.t).icon} size={Math.round(taille * 0.5)} style={{ color: "var(--text-muted)" }} />
    </span>
  );
}

/** La pastille de nature : c'est elle qui répond à « je suis sur quelle page ? »
 *  quand cinq sortes de choses se mélangent dans une seule liste. */
export function Nature({ e }: { e: Entree }) {
  const i = infoType(e.t);
  return (
    <span title={i.unite} style={{
      display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
      fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px",
      padding: "1px 6px", borderRadius: 20, color: i.couleur,
      background: `color-mix(in srgb, ${i.couleur} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${i.couleur} 34%, transparent)`,
    }}>
      <Icon name={i.icon} size={10} /> {i.unite}
    </span>
  );
}

export function Resultat({ e, compact = false }: { e: Entree; compact?: boolean }) {
  const couleur = e.grade ? COULEUR_GRADE[e.grade === "unique" ? "Unique" : "Ultime"] : null;
  const mots = e.mots.slice(0, compact ? 2 : 3);
  const reste = e.mots.length - mots.length;

  return (
    <Link href={e.href} className={compact ? undefined : "glass-card fx-card"}
      style={{
        display: "flex", gap: 10, alignItems: "flex-start", textDecoration: "none", color: "var(--text)",
        padding: compact ? "7px 9px" : 11, borderRadius: compact ? 9 : undefined,
        borderColor: !compact && couleur ? `color-mix(in srgb, ${couleur} 34%, var(--border))` : undefined,
      }}>
      <Vignette e={e} taille={compact ? 28 : 34} />

      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          {/* `minWidth: 0` sur le nom lui-même, et pas seulement sur son parent : un
              élément de flex vaut `min-width: auto` par défaut, donc un nom long en
              `nowrap` ÉLARGIT la ligne au lieu de se couper — la pastille de nature
              sortait de la carte. Piège déjà payé ailleurs sur ce site. */}
          <span className="font-heading" style={{
            fontSize: compact ? 12.5 : 13.5, fontWeight: 700, lineHeight: 1.25, color: couleur ?? "var(--text)",
            minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{e.nom}</span>
          {/* Le repère Airborn est une étincelle et pas un mot : il apparaît sur
              chaque ligne concernée, et un mot répété mille fois cesse d'être lu. */}
          {e.maison && <Icon name="sparkles" size={11} style={{ color: "var(--gn-accent)", flexShrink: 0 }} />}
          <span style={{ marginLeft: "auto" }}><Nature e={e} /></span>
        </span>

        <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 3, fontSize: 11.5, color: "var(--text-muted)" }}>
          <span style={{ ...NUM }}>{e.sous}</span>
          {/* L'ÉLÉMENT, EN DESSIN. Il occupait une pastille de texte sur les trois que
              la ligne montre — « terre » sur 499 monstres, « feu » sur 112 — pour un
              fait que le client dessine, et dont l'image sert déjà sur /monstres et sur
              les fiches d'armure. Le nom passe par `alt` et `title` : zéro mot servi,
              et le mot-clé reste tapable (il est indexé en clé, cf. src/lib/wiki.ts). */}
          {e.el && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.el.image} alt={e.el.label} title={e.el.label} width={13} height={13}
              style={{ objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 }} />
          )}
          {mots.map((m) => (
            <span key={m} style={{
              fontSize: 10.5, padding: "1px 6px", borderRadius: 7, maxWidth: 190,
              background: "var(--bg-3)", border: "1px solid var(--border)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{m}</span>
          ))}
          {reste > 0 && <span style={{ fontSize: 10.5, ...NUM }}>+{reste}</span>}
        </span>

        {/* LA PROVENANCE EST DANS LA LIGNE, pas dans un panneau à côté : « qui lâche
            ça » est la question, pas un détail qu'on va chercher au clic. Jamais de
            taux — le nom du monstre suffit à savoir où aller. */}
        {e.prov && !compact && (
          <span style={{ display: "flex", gap: 6, alignItems: "baseline", marginTop: 5, fontSize: 11, color: "var(--text-muted)", minWidth: 0 }}>
            <Icon name={ICONE_PROV[e.t]} size={11} {...nomme(e.prov.titre)}
              style={{ flexShrink: 0, opacity: .7, transform: "translateY(2px)" }} />
            <span title={e.prov.titre} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.prov.lignes.join(" · ")}
            </span>
            {e.prov.total > e.prov.lignes.length && (
              <span style={{ flexShrink: 0, ...NUM }}>+{e.prov.total - e.prov.lignes.length}</span>
            )}
          </span>
        )}
      </span>
    </Link>
  );
}
