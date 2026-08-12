"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { VgSelect } from "@/components/VgSelect";
// `findClass` et pas `CLASSES[cle]` : les clefs de CLASSES sont désaccentuées
// (« Arbaletrier », « Envouteur ») alors que la fouille rend le nom accentué.
// Un accès direct rendait `undefined` pour deux classes sur huit — donc pas
// d'emblème et un libellé cru, mais seulement pour celles-là.
import { findClass } from "@/data/classes";
import { Cadre, Encart, Pastille, SousTitre, TD, TH } from "./ui";
import {
  PALIERS, PM_MUR, couleurPalier, effetTexte, fmt, ms, nomPalier,
  type Entree, type Fiche, type Lignee, type Niveau, type Palier,
} from "./donnees";

/**
 * LE CATALOGUE — les 202 compétences, cherchées comme on les cherche.
 *
 * Trois façons d'arriver sur une compétence, et elles ne se remplacent pas :
 *  · par le nom, quand on sait déjà lequel on veut ;
 *  · par la LIGNÉE, quand la question est « qu'est-ce que mon Templier peut
 *    apprendre ? » — et là l'ordre du fichier ne vaut rien, c'est l'ordre
 *    d'apprentissage qui compte, donc on regroupe par palier ;
 *  · par le palier seul, quand on compare les huit classes entre elles.
 *
 * La fiche s'ouvre EN PLACE, sous la ligne. Pas de fenêtre modale : la
 * progression d'une compétence de métier fait vingt lignes de tableau, et un
 * voile qui se referme au moindre clic à côté est le pire endroit pour lire ça.
 */

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

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

export function Catalogue({ entrees, lignees }: { entrees: Entree[]; lignees: Lignee[] }) {
  const [q, setQ] = useState("");
  const [lignee, setLignee] = useState("tous");
  const [palier, setPalier] = useState<"tous" | Palier>("tous");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [fiches, setFiches] = useState<Record<string, Fiche | "chargement">>({});
  // Une compétence déjà lue ne se redemande pas : la fiche ne bouge jamais.
  const enCours = useRef(new Set<string>());

  const ouvrir = useCallback(async (id: string) => {
    setOuvert((o) => (o === id ? null : id));
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

  /** Aller sur une compétence citée par une autre : on l'ouvre, on ferme rien. */
  const suivre = useCallback((id: string) => {
    // Les filtres en place peuvent cacher la cible : un prérequis de Vagabond
    // reste invisible si on filtre sur « Légendaire ». On les relâche donc.
    setPalier("tous"); setQ("");
    setOuvert(null);
    void ouvrir(id);
    // Le défilement est porté par .vg-main, pas par la fenêtre (cf. VgFx).
    requestAnimationFrame(() => document.getElementById(`comp-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }, [ouvrir]);

  const parLignee = useMemo(() => new Map(lignees.map((l) => [l.cle, l])), [lignees]);

  const liste = useMemo(() => {
    const l = lignee === "tous" ? null : parLignee.get(lignee);
    let base = entrees;
    if (l) {
      // L'ordre de la lignée EST l'ordre d'apprentissage : on s'y tient plutôt
      // que de retrier alphabétiquement, ce qui mélangerait les six paliers.
      const rang = new Map(l.competences.map((id, i) => [id, i]));
      base = entrees.filter((e) => rang.has(e.id)).sort((a, b) => rang.get(a.id)! - rang.get(b.id)!);
    }
    if (palier !== "tous") base = base.filter((e) => e.palier === palier);
    const k = sansAccent(q.trim());
    if (k) base = base.filter((e) => sansAccent(`${e.nom} ${e.classe} ${e.resume ?? ""} ${e.famille ?? ""}`).includes(k));
    return base;
  }, [entrees, lignee, palier, q, parLignee]);

  /** Groupé par palier quand une lignée est choisie : c'est là que l'ordre parle. */
  const groupes = useMemo(() => {
    if (lignee === "tous" || palier !== "tous") return [{ titre: "", items: liste }];
    return PALIERS
      .map((p) => ({ titre: p.nom, cle: p.cle, items: liste.filter((e) => e.palier === p.cle) }))
      .filter((g) => g.items.length > 0);
  }, [liste, lignee, palier]);

  const l = lignee === "tous" ? null : parLignee.get(lignee);

  return (
    <>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 13 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cherche un nom, un effet…"
          style={{ flex: "1 1 190px", minWidth: 0, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9,
            padding: "9px 12px", color: "var(--text)", fontFamily: "'Rubik',sans-serif", fontSize: 13.5 }} />
        <VgSelect value={lignee} onChange={setLignee} minWidth={168}
          options={[{ value: "tous", label: "Toutes les classes" },
            ...lignees.map((x) => ({ value: x.cle, label: `${findClass(x.cle)?.label ?? x.cle} · ${x.nbCompetences}` }))]} />
        <VgSelect value={palier} onChange={(v) => setPalier(v as "tous" | Palier)} minWidth={148}
          options={[{ value: "tous", label: "Tous les paliers" },
            ...PALIERS.map((p) => ({ value: p.cle, label: p.nom }))]} />
      </div>

      {/* Quand une lignée est choisie, on annonce ce qu'elle pèse : c'est la
          réponse à « et si je monte tout ? », qui ne se lit pas dans la liste. */}
      {l && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 13, padding: "11px 14px",
          background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11 }}>
          {findClass(l.cle)?.embleme && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={findClass(l.cle)!.embleme} alt="" width={34} height={34} style={{ objectFit: "contain", flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0, flex: "1 1 200px", fontSize: 12.5, color: "var(--text-muted)" }}>
            <b className="font-heading" style={{ color: "var(--text)", fontSize: 13.5 }}>{l.chaine.join(" → ")}</b>
            <div style={{ marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
              {l.nbCompetences} compétences · {fmt(l.coutPoints)} points pour tout monter au maximum
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 9, fontVariantNumeric: "tabular-nums" }}>
        {liste.length === 0
          ? "Rien ne correspond. Le catalogue ne contient que les compétences de JOUEUR : les états infligés par les monstres n'y sont pas."
          : `${liste.length} compétence${liste.length > 1 ? "s" : ""}${liste.length !== entrees.length ? ` sur ${entrees.length}` : ""}`}
      </div>

      {groupes.map((g) => (
        <div key={g.titre || "tout"} style={{ marginBottom: g.titre ? 16 : 0 }}>
          {g.titre && <SousTitre icon="layers" apres={`${g.items.length}`}>{g.titre}</SousTitre>}
          <div style={{ display: "grid", gap: 7 }}>
            {g.items.map((e) => (
              <Ligne key={e.id} e={e} ouvert={ouvert === e.id} onClick={() => void ouvrir(e.id)}
                fiche={fiches[e.id]} suivre={suivre} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Une ligne du catalogue, et la fiche qu'elle déplie. */
function Ligne({ e, ouvert, onClick, fiche, suivre }: {
  e: Entree; ouvert: boolean; onClick: () => void; fiche: Fiche | "chargement" | undefined; suivre: (id: string) => void;
}) {
  const c = couleurPalier(e.palier);
  return (
    <div id={`comp-${e.id}`} style={{ background: "var(--bg-2)", border: `1px solid ${ouvert ? "var(--orange)" : "var(--border)"}`, borderRadius: 11, overflow: "hidden" }}>
      <button onClick={onClick} className="fx-card" style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left",
        padding: "11px 13px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", color: "var(--text)" }}>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <b className="font-heading" style={{ fontSize: 14 }}>{e.nom}</b>
            <Pastille texte={nomPalier(e.palier)} couleur={c} />
            {e.aPrerequis && <Pastille texte="prérequis" couleur="var(--text-muted)" titre="Une autre compétence doit être montée avant" />}
          </span>
          <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
            {e.classe}
            {e.nivPerso > 1 && ` · niveau ${e.nivPerso}`}
            {` · jusqu'au niveau ${e.nivMax}`}
            {e.resume && ` · ${e.resume}`}
          </span>
        </span>
        <Icon name={ouvert ? "chevron-up" : "chevron-down"} size={15} style={{ color: ouvert ? "var(--orange)" : "var(--text-muted)", flexShrink: 0 }} />
      </button>
      {ouvert && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 13px 16px", background: "var(--bg-3)" }}>
          {fiche === "chargement" || fiche === undefined
            ? <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Lecture de la fiche…</div>
            : <FicheDetail f={fiche} suivre={suivre} />}
        </div>
      )}
    </div>
  );
}

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

function FicheDetail({ f, suivre }: { f: Fiche; suivre: (id: string) => void }) {
  // Les dégâts comptent pour UNE colonne, quels que soient les deux champs qui
  // varient derrière.
  const colonnes = useMemo(() => {
    const c = f.colonnes.filter((x) => x !== "dmin" && x !== "dmax") as string[];
    if (f.colonnes.includes("dmin") || f.colonnes.includes("dmax")) c.unshift("degats");
    return c;
  }, [f.colonnes]);
  const aEffets = f.niveaux.some((n) => n.effets?.length);

  return (
    <>
      {f.desc && <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 13px", color: "var(--text)" }}>{f.desc}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(118px,1fr))", gap: "11px 14px", marginBottom: 14 }}>
        <Champ label="Classe" valeur={f.classe} />
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

      {colonnes.length > 0 || aEffets ? (
        <div style={{ marginBottom: 14 }}>
          <SousTitre icon="trending-up" apres={`${f.nivMax} niveaux`}>Ce que chaque niveau change</SousTitre>
          <Cadre minWidth={140 + colonnes.length * 96 + (aEffets ? 190 : 0)}>
            <thead>
              <tr>
                <th style={TH}>Niv.</th>
                {colonnes.map((k) => <th key={k} style={TH}>{COLONNES[k].titre}</th>)}
                {aEffets && <th style={TH}>Effets</th>}
              </tr>
            </thead>
            <tbody>
              {f.niveaux.map((n) => {
                // Le dernier niveau est celui qu'on vise : on le distingue, parce
                // que sur les paliers Maître et Héros c'est le SEUL qui compte.
                const dernier = n.niveau === f.nivMax;
                return (
                  <tr key={n.niveau} style={dernier ? { background: "rgba(255,140,26,.06)" } : undefined}>
                    <td style={{ ...TD, fontWeight: dernier ? 700 : 400, color: dernier ? "var(--orange)" : "var(--text)" }}>{n.niveau}</td>
                    {colonnes.map((k) => {
                      const brut = (n as unknown as Record<string, number | null>)[k];
                      return (
                        <td key={k} style={TD}>
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
