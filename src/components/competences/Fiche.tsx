"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { Bulle } from "@/components/Bulle";
import { Icon } from "@/components/Icon";
import { Cadre, Encart, SousTitre, TD, TH } from "./ui";
import { IconeCompetence } from "./IconeCompetence";
import {
  PM_MUR, classeAffichee, effetTexte, fmt, ms, nomPalier,
  type Fiche, type Niveau, type Planche,
} from "./donnees";

/**
 * LA FICHE D'UNE COMPÉTENCE — et le magasin qui va la chercher.
 *
 * Ce fichier était le bas de `Catalogue.tsx`. Il en est sorti le jour où
 * l'arbre des compétences a voulu ouvrir la même fiche : deux endroits qui
 * dépliaient chacun leur version de la progression auraient divergé à la
 * première colonne ajoutée. Une seule fiche, deux appelants.
 */

/** Le libellé de chaque colonne de progression, et comment on écrit sa valeur. */
const COLONNES: Record<string, { titre: string; ecrit: (v: number | null | undefined) => string }> = {
  degats: { titre: "Dégâts", ecrit: () => "" }, // composée : cf. valeurDegats
  // Le mur touche les DEUX coûts : les compétences de Héros sont à 9 999 999 en
  // PM et en PF aux niveaux 1 à 4. Écrire le nombre laissait croire à un prix.
  pm: { titre: "PM", ecrit: (v) => (v == null ? "—" : v === PM_MUR ? "mur" : fmt(v)) },
  pf: { titre: "PF", ecrit: (v) => (v == null ? "—" : v === PM_MUR ? "mur" : fmt(v)) },
  inc: { titre: "Incantation", ecrit: ms },
  duree: { titre: "Durée", ecrit: ms },
  recharge: { titre: "Recharge", ecrit: ms },
  portee: { titre: "Portée", ecrit: (v) => (v == null ? "—" : fmt(v)) },
  coups: { titre: "Coups", ecrit: (v) => (v == null ? "—" : fmt(v)) },
  proba: { titre: "Chance", ecrit: (v) => (v == null ? "—" : `${v} %`) },
  provoc: { titre: "Provocation", ecrit: (v) => (v == null ? "—" : fmt(v)) },
  dureeDouleur: { titre: "Douleur", ecrit: ms },
  vitAtq: { titre: "Vit. attaque", ecrit: (v) => (v == null ? "—" : fmt(v)) },
};

/** Les dégâts tiennent dans UNE colonne : deux colonnes min et max pour lire
 *  « 164 » puis « 211 » demandaient de recoller la plage de tête. */
const valeurDegats = (n: Niveau) =>
  n.dmax == null ? "—" : n.dmin != null && n.dmin !== n.dmax ? `${fmt(n.dmin)}–${fmt(n.dmax)}` : fmt(n.dmax);

// ════════════════════════════════════════════════════════════════════════
//  LE MAGASIN DE FICHES
// ════════════════════════════════════════════════════════════════════════

export type EtatFiche = Fiche | "chargement" | undefined;

/**
 * Les fiches déjà lues, et de quoi en demander une.
 *
 * Une fiche ne bouge jamais : lue une fois, elle est gardée. Le garde-fou
 * `enCours` évite qu'un double-clic parte deux fois — le catalogue et l'arbre
 * peuvent d'ailleurs demander la même compétence, chacun de son côté.
 */
export function useFiches() {
  const [fiches, setFiches] = useState<Record<string, EtatFiche>>({});
  const enCours = useRef(new Set<string>());

  const demander = useCallback(async (id: string) => {
    if (fiches[id] || enCours.current.has(id)) return;
    enCours.current.add(id);
    setFiches((f) => ({ ...f, [id]: "chargement" }));
    try {
      const r = await fetch(`/api/competences?id=${encodeURIComponent(id)}`);
      const d = await r.json();
      if (d.fiche) setFiches((f) => ({ ...f, [id]: d.fiche as Fiche }));
      else setFiches((f) => { const c = { ...f }; delete c[id]; return c; });
    } catch {
      setFiches((f) => { const c = { ...f }; delete c[id]; return c; });
    } finally {
      enCours.current.delete(id);
    }
  }, [fiches]);

  return { fiches, demander };
}

/** Ce qu'on montre le temps que la fiche arrive. */
export function FicheEnAttente() {
  return <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Lecture de la fiche…</div>;
}

// ════════════════════════════════════════════════════════════════════════
//  LA FICHE
// ════════════════════════════════════════════════════════════════════════

/** Une valeur de la carte d'identité. Rien ne s'affiche quand on ne sait pas. */
function Champ({ label, valeur }: { label: string; valeur: React.ReactNode }) {
  if (valeur == null || valeur === "") return null;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--text-muted)" }}>{label}</div>
      <div className="font-heading" style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{valeur}</div>
    </div>
  );
}

export function FicheDetail({ f, suivre, planche, desc = true }: {
  f: Fiche;
  suivre: (id: string) => void;
  planche: Planche | null;
  /** Répéter la description en tête. `false` quand la ligne qui vient d'être
   *  dépliée l'affiche déjà : la lire deux fois à trois lignes d'intervalle
   *  n'apprend rien et éloigne d'autant le tableau. */
  desc?: boolean;
}) {
  // Les dégâts comptent pour UNE colonne, quels que soient les deux champs qui
  // varient derrière.
  const colonnes = useMemo(() => {
    const c = f.colonnes.filter((x) => x !== "dmin" && x !== "dmax") as string[];
    if (f.colonnes.includes("dmin") || f.colonnes.includes("dmax")) c.unshift("degats");
    return c;
  }, [f.colonnes]);
  const aEffets = f.niveaux.some((n) => n.effets?.length);
  const muets = new Set(f.rangsMuets?.rangs ?? []);

  return (
    <>
      {/* Une fiche ouverte depuis l'arbre se lit seule : rien au-dessus d'elle
          ne dit ce que la compétence fait. Depuis le catalogue, la ligne juste
          au-dessus le dit déjà — d'où le `desc={false}` de ce côté-là. */}
      {desc && f.desc && (
        <p style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, lineHeight: 1.6, margin: "0 0 13px", color: "var(--text)" }}>
          <IconeCompetence planche={planche} index={f.icone} titre={f.nom} />
          <span style={{ minWidth: 0 }}>{f.desc}</span>
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(118px,1fr))", gap: "11px 14px", marginBottom: 14 }}>
        <Champ label="Classe" valeur={classeAffichee(f.classe)} />
        <Champ label="Palier" valeur={nomPalier(f.palier)} />
        <Champ label="École" valeur={f.famille} />
        <Champ label="Niveau requis" valeur={f.nivPerso > 1 ? f.nivPerso : "aucun"} />
        <Champ label="Niveau max" valeur={f.nivMax} />
        <Champ label="Arme" valeur={f.arme ?? (f.mains ? f.mains : null)} />
        <Champ label="Effet" valeur={f.type} />
        <Champ label="Zone" valeur={f.zone} />
        <Champ label="Portée" valeur={f.porteeTexte} />
        <Champ label="Monte avec" valeur={f.stat ? `${f.stat}${f.coef != null ? ` (${fmt(f.coef)})` : ""}` : null} />
      </div>

      {/* Ce qui vaut pareil à tous les niveaux : dit une fois. Répété sur vingt
          lignes de tableau, ça noyait les deux colonnes qui bougent vraiment. */}
      {Object.keys(f.constant).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <SousTitre icon="lock">Identique à tous les niveaux</SousTitre>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
            {(["pm", "pf", "inc", "duree", "recharge", "portee", "coups", "proba", "provoc", "dureeDouleur", "vitAtq"] as const).map((k) => {
              const v = f.constant[k];
              if (v == null) return null;
              return (
                <span key={k} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "3px 9px" }}>
                  <span style={{ color: "var(--text-muted)" }}>{COLONNES[k].titre} </span>
                  {COLONNES[k].ecrit(v as number)}
                </span>
              );
            })}
            {f.constant.effets?.map((ef, i) => (
              <span key={i} style={{ background: "rgba(126,231,135,.08)", border: "1px solid color-mix(in srgb, var(--green) 32%, transparent)", borderRadius: 7, padding: "3px 9px", color: "var(--green)" }}>
                {effetTexte(ef)}
              </span>
            ))}
          </div>
        </div>
      )}

      <RangsMuetsEncart f={f} />

      {colonnes.length > 0 || aEffets ? (
        <div style={{ marginBottom: 14 }}>
          <SousTitre icon="trending-up" apres={`${f.nivMax} niveaux`}>Ce que chaque niveau change</SousTitre>
          <Cadre minWidth={140 + colonnes.length * 96 + (aEffets ? 190 : 0)}>
            <thead>
              <tr>
                <th style={TH}>Niv.</th>
                {/* LA SEULE RÉSERVE QUI RESTE À L'ÉCRAN, ET ELLE EST ICI.
                    Le volet « Ce qu'on ne sait pas » portait cinq encarts ; quatre
                    étaient des constats d'ignorance et sont partis (règle 2). Celui-ci
                    protège d'une erreur coûteuse — bâtir un build sur les
                    « 164–211 dégâts » de cette colonne, qui sont la valeur de base de
                    la compétence et pas ce qu'on tape à l'écran. Il est donc posé SUR
                    la colonne fautive, dans une bulle : au moment où on lit le chiffre,
                    pas dans un volet qu'il faut penser à ouvrir. */}
                {colonnes.map((k) => (
                  <th key={k} style={TH}>
                    {k === "degats"
                      ? <Bulle cote="bas" largeur={280} quoi={
                          <>La <b>valeur de base</b> de la compétence, pas ce que tu vas taper :
                          le client donne la statistique de référence et son coefficient,
                          jamais l&apos;équation qui les combine à ton arme.</>
                        }>{COLONNES[k].titre}</Bulle>
                      : COLONNES[k].titre}
                  </th>
                ))}
                {aEffets && <th style={TH}>Effets</th>}
              </tr>
            </thead>
            <tbody>
              {f.niveaux.map((n) => {
                // Le dernier niveau est celui qu'on vise : on le distingue, parce
                // que sur les paliers Maître et Héros c'est le SEUL qui compte.
                const dernier = n.niveau === f.nivMax;
                const muet = muets.has(n.niveau);
                return (
                  <tr key={n.niveau} style={dernier ? { background: "rgba(255,140,26,.06)" } : undefined}>
                    <td style={{ ...TD, fontWeight: dernier ? 700 : 400, color: dernier ? "var(--orange)" : muet ? "var(--text-muted)" : "var(--text)" }}>
                      {n.niveau}
                      {/* Le rang qui recopie le précédent est marqué DANS le tableau,
                          là où on lit deux lignes identiques et où on se demande si
                          on a mal lu. */}
                      {muet && <span title="Aucune valeur ne change par rapport au rang précédent" style={{ marginLeft: 5, color: "var(--text-muted)", cursor: "help" }}>=</span>}
                    </td>
                    {colonnes.map((k) => {
                      const brut = (n as unknown as Record<string, number | null>)[k];
                      return (
                        <td key={k} style={{ ...TD, color: muet && !dernier ? "var(--text-muted)" : undefined }}>
                          {k === "degats" ? valeurDegats(n)
                            : brut === PM_MUR
                              // Le mot seul serait cryptique dans une cellule : le
                              // chiffre reste accessible au survol.
                              ? <span title="9 999 999 : le client rend le niveau injouable" style={{ color: "var(--red)", borderBottom: "1px dotted currentColor", cursor: "help" }}>mur</span>
                              : COLONNES[k].ecrit(brut)}
                        </td>
                      );
                    })}
                    {aEffets && (
                      <td style={{ ...TD, color: "var(--green)" }}>
                        {n.effets?.length ? n.effets.map(effetTexte).join(" · ") : <span style={{ color: "var(--text-muted)" }}>aucun</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Cadre>
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14 }}>
          Aucun chiffre ne bouge d&apos;un niveau à l&apos;autre dans les données du client : monter cette
          compétence ne change rien de mesurable ici. Ce n&apos;est pas une preuve que rien ne change
          en jeu — c&apos;est le serveur qui calcule les dégâts.
        </div>
      )}

      <Alertes f={f} />

      {(f.prerequis.length > 0 || f.debloque.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
          {f.prerequis.length > 0 && (
            <div>
              <SousTitre icon="lock">Ce qu&apos;il faut monter avant</SousTitre>
              {f.prerequis.map((p) => <LienComp key={p.id} l={p} suivre={suivre} />)}
            </div>
          )}
          {f.debloque.length > 0 && (
            <div>
              <SousTitre icon="unlock" apres={`${f.debloque.length}`}>Ce que ça ouvre</SousTitre>
              {f.debloque.map((p) => <LienComp key={p.id} l={p} suivre={suivre} />)}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * LES RANGS QUI RECOPIENT LE PRÉCÉDENT — et ce qu'ils coûtent.
 *
 * C'est de la même famille que les paliers de bijou : un prix qu'on paie sans
 * rien recevoir, et qui ne se voit qu'en comparant deux lignes d'un tableau de
 * vingt.
 *
 * La formulation compte. On ne dit pas « ce rang ne sert à rien » : on dit
 * qu'aucune valeur du CLIENT ne change, parce que c'est ce qu'on sait. Les
 * dégâts finaux sont calculés par le serveur, et le client ne le voit pas.
 * La liste des rangs, elle, est relevée sur `propSkillAdd.csv` colonne par
 * colonne — la déduire du tableau affiché ici, qui ne montre que les colonnes
 * qui varient, faisait déclarer muets des rangs où la compétence progresse.
 */
function RangsMuetsEncart({ f }: { f: Fiche }) {
  const m = f.rangsMuets;
  if (!m?.rangs.length) return null;
  const liste = m.rangs.join(", ");
  return (
    <Encart icon="coins" ton="gold" titre={`${m.rangs.length} rang${m.rangs.length > 1 ? "s" : ""} sur ${f.nivMax} recopie${m.rangs.length > 1 ? "nt" : ""} le précédent`}>
      Aux rangs <b>{liste}</b>, aucune valeur du client ne bouge : mêmes dégâts, même coût, mêmes
      effets qu&apos;au rang d&apos;avant. Les franchir coûte tout de même{" "}
      <b style={{ color: "var(--gold)" }}>{fmt(m.cout)} points de compétence</b>. Le calcul des dégâts
      appartient au serveur, donc ce n&apos;est pas la preuve que rien ne change en jeu — mais si tu
      montes cette compétence pour un chiffre précis, c&apos;est le rang <b>suivant</b> qu&apos;il faut viser.
    </Encart>
  );
}

function LienComp({ l, suivre }: { l: { id: string; nom: string; niveau: number }; suivre: (id: string) => void }) {
  return (
    <button onClick={() => suivre(l.id)} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "left",
      background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", marginBottom: 6,
      color: "var(--text)", fontFamily: "inherit", fontSize: 12.5, cursor: "pointer", fontVariantNumeric: "tabular-nums" }}>
      <Icon name="chevron-right" size={12} style={{ color: "var(--orange)", flexShrink: 0 }} />
      <span style={{ minWidth: 0 }}>{l.nom} <span style={{ color: "var(--text-muted)" }}>au niveau {l.niveau}</span></span>
    </button>
  );
}

/**
 * Les trois choses qu'une fiche ne dit pas d'elle-même, posées SUR la fiche
 * concernée. En note de bas de page, personne ne les relie à la compétence
 * qu'il est en train de regarder.
 */
function Alertes({ f }: { f: Fiche }) {
  const mur = f.niveaux.some((n) => n.pm === PM_MUR);
  return (
    <>
      {mur && (
        <Encart icon="ban" ton="red" titre="Injouable avant le niveau 5">
          Aux niveaux 1 à 4, le client fixe le coût à <b>9 999 999, en PM comme en PF</b> — aucun
          personnage ne paie ça. Il retombe à 500 PM au niveau 5, sans coût en PF. Et le niveau ne
          se choisit pas : une compétence de
          Héros se monte avec un joyau de chaque type (topaze, rubis, saphir, émeraude, diamant),
          et <b>le niveau obtenu est tiré au hasard</b>, plafonné à 5. Tant que le tirage n&apos;a pas
          donné 5, la compétence ne sert à rien.
        </Encart>
      )}
      {f.palier === "maitre" && (
        <Encart icon="alert" ton="gold" titre="Le niveau 5 n'est pas la suite des quatre premiers">
          Le niveau 5 des compétences de Maître est réécrit à la main : les niveaux 1 à 4 portent
          l&apos;effet d&apos;origine, le 5 le remplace par un bonus de +15 % sur une statistique et fait
          passer la durée de 10 à 30 minutes. Une compétence de Maître à 4 ne donne donc pas
          « presque » le niveau 5 : elle donne autre chose.
        </Encart>
      )}
      {f.id === "SI_STORM_DOUBLE_STORMBLAST" && (
        <Encart icon="help" ton="orange" titre="Ce 1 075 est à vérifier en jeu">
          Aux niveaux 1 à 4, cette compétence porte exactement les mêmes chiffres que « Tir Groupé »
          de l&apos;Arbalétrier (164–211 → 189–244). Au niveau 5, Tir Groupé passe à 199–256 et
          celle-ci à 1 075–1 076, soit ×4,4 quand les treize autres compétences légendaires
          offensives progressent de ×1,01 à ×1,11. Ou c&apos;est le meilleur coup du serveur, ou c&apos;est
          une faute de saisie. <b>On ne tranche pas depuis les fichiers</b> : il faut le mesurer en jeu.
        </Encart>
      )}
    </>
  );
}
