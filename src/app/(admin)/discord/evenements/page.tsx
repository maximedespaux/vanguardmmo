"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { VgSelect } from "@/components/VgSelect";
import { ClassLogo } from "@/components/ClassLogo";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { rolesDeClasse } from "@/lib/mesures";
import { GO, tailleDite } from "@/lib/videos";
import {
  ADVERSAIRES_CS, CHOIX_MESURE, CLASSES_CLES, JOURS, JOURS_LONGS, LIBELLE_CONDITION, LIBELLE_MENTION, LIBELLE_TYPE_RAPPEL,
  NOMS_CLASSES, POSTES_DEFAUT, VARIABLES_TEXTE, choixDeMesure, dateLongue, memeValeur, remplirTexte,
  type Etape, type Evenement, type JourFr, type ParametresCS, type ParametresGS, type RappelDef, type TypeRappel,
} from "@/lib/evenements";

/**
 * LE PARAMÉTRAGE DES ÉVÉNEMENTS — espace Bras droits, rubrique Outils (SPEC-CHAMBRES-RECENSEMENT
 * §9.4 ; décisions 5 et 10 de Maxime : « prévoir toujours une possibilité de pouvoir modifier […]
 * dans le site pour pouvoir paramétrer au cas où en changement de stratégie »).
 *
 * Un seul écran pour tout ce que le site et le bot lisent des Chambres et du Guild Siege. On
 * ENREGISTRE EN BLOC, avec la version lue : si quelqu'un a enregistré entre-temps, la route
 * répond 409 et l'écran garde la saisie, avec deux sorties (reprendre sa version, ou écraser).
 * Chaque bloc a son « Rétablir le défaut » : le défaut vit dans le code (lib/evenements.ts), la
 * base ne garde que ce qui en diffère.
 *
 * Ce qui agit tout de suite : le déroulé (étapes, phases, monstres — la Stratégie), les postes
 * et l'affichage des dégâts (la page des Chambres), et — depuis le lot 3 — les salons, les
 * rappels et leurs textes, que le bot relit chaque minute ; depuis le lot 4, les salles de la
 * Phase 1, le nom des golems, les consignes et le pied du récap (onglet Répartition et récap de
 * 20 h 40) ; depuis le lot 5, le rappel « chrono » et sa phrase d'attente (le chrono en direct,
 * qui suit les étapes figées au premier « Démarrer ») ; depuis le lot 8, les bornes des vidéos de
 * débrief (fichiers par séance, conservation, quota), avec l'espace qu'elles occupent ; depuis le
 * lot 9, tout le Guild Siege — codé mais ÉTEINT par défaut (décision 2) : son interrupteur, ses
 * créneaux, son panneau, ses rappels, ses textes et ses dégâts. Chaque message a son « Essai » :
 * il part dans le salon des essais, sans mention. Rien ne prétend agir avant de le faire.
 *
 * Les contrôles sont ceux d'« Accès des amis » et de « Bot Discord », ses voisins de rubrique :
 * la carte, la ligne encadrée, l'interrupteur à deux boutons, `inp`.
 */

type Salon = { id: string; name: string; type: string };
type Lu = {
  evenement: Evenement;
  data: ParametresCS | ParametresGS;
  defauts: ParametresCS | ParametresGS;
  version: number;
  parQui: string | null;
  modifieLe: string | null;
  modifies: string[];
  salons: Salon[];
  salonsPublics: string[] | null;
  rappelsActifs: boolean;
  postesRenommes: Record<string, string>;
  prochaine: { cle: string; date: string; label: string; debut: number } | null;
  /** L'espace des vidéos de débrief (lot 8) : occupé (envois en cours compris), et libre sur le
   *  disque du serveur (null : il ne se mesure pas). Chambres seulement. */
  videos: { octets: number; fichiers: number; libre: number | null } | null;
};

const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 16 };
const titreCarte: React.CSSProperties = { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--gn-accent)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const sousTitre: React.CSSProperties = { fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.55 };
const ligne: React.CSSProperties = { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11, padding: "12px 14px", minWidth: 0 };
const petitBouton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9, border: "1px solid var(--gn-accent)", background: "transparent", color: "var(--gn-accent)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" };
const geste: React.CSSProperties = { background: "none", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", cursor: "pointer", padding: "5px 7px", display: "inline-flex", alignItems: "center" };

const copie = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Les clés du paramétrage, dites en clair dans la ligne « s'écarte du défaut sur ». */
const NOMS_CLES: Record<string, string> = {
  nouveauxMessages: "bascule du bot", panneau: "panneau", annoncerAnnulation: "annonce d'annulation", salons: "salons", rappels: "rappels",
  textes: "textes", etapes: "étapes", phases: "phases", salles: "salles", noms: "nom des golems", consignes: "consignes", postes: "postes",
  degats: "dégâts", videos: "vidéos", actif: "activation", creneaux: "créneaux", places: "plafond",
};

/* ── Les briques de l'écran ─────────────────────────────────────────────────── */

/** L'interrupteur à deux boutons de Bot Discord. */
function Bascule({ valeur, onChange, oui = "Oui", non = "Non", iconOui = "check", iconNon = "ban", disabled }: {
  valeur: boolean; onChange: (v: boolean) => void; oui?: string; non?: string; iconOui?: IconName; iconNon?: IconName; disabled?: boolean;
}) {
  return (
    <div className="gn-bascule">
      {[false, true].map((v) => (
        <button key={String(v)} type="button" disabled={disabled} onClick={() => valeur !== v && onChange(v)}
          className={valeur === v ? (v ? "on" : "off") : ""}>
          <Icon name={v ? iconOui : iconNon} size={12} />{v ? oui : non}
        </button>
      ))}
    </div>
  );
}

/** Une carte de l'écran, avec son « Rétablir le défaut » quand elle s'en écarte. */
function Carte({ id, icon, titre, sous, bientot, modifie, onRetablir, children }: {
  id?: string; icon: IconName; titre: string; sous?: React.ReactNode; bientot?: string; modifie?: boolean; onRetablir?: () => void; children: React.ReactNode;
}) {
  return (
    <section id={id} className="fx-card" style={{ ...card, scrollMarginTop: 16 }}>
      <div className="font-heading" style={titreCarte}>
        <Icon name={icon} size={16} />{titre}
        {modifie && onRetablir && (
          <button type="button" onClick={onRetablir} style={{ ...petitBouton, marginLeft: "auto", padding: "4px 10px", fontSize: 12, textTransform: "none", letterSpacing: 0, fontWeight: 600 }}>
            <Icon name="rotate-ccw" size={13} />Rétablir le défaut
          </button>
        )}
      </div>
      {sous && <div style={sousTitre}>{sous}</div>}
      {bientot && <div className="gn-param-bientot">{bientot}</div>}
      {children}
    </section>
  );
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "block", minWidth: 0 }}><span className="gn-param-lab">{label}</span>{children}</label>;
}

/** Le menu d'un salon : « par défaut » (la variable du bot), puis le cache GuildChannel. */
function MenuSalon({ valeur, onChange, salons, forum, publics }: { valeur: string; onChange: (v: string) => void; salons: Salon[]; forum?: boolean; publics: string[] | null }) {
  const permis = salons.filter((s) => s.type === "text" || s.type === "announcement" || (forum && s.type === "forum"));
  const options = [{ value: "", label: "Par défaut (réglage du bot)" }, ...permis.map((s) => ({ value: s.id, label: `${s.type === "forum" ? "▤" : "#"} ${s.name}` }))];
  // Un salon choisi que le cache ne connaît plus reste lisible.
  if (valeur && !permis.some((s) => s.id === valeur)) options.push({ value: valeur, label: `Salon ${valeur} (inconnu du bot)` });
  return (
    <div style={{ minWidth: 0 }}>
      <VgSelect full value={valeur} onChange={onChange} options={options} />
      {valeur && publics?.includes(valeur) && (
        <div className="gn-panne" style={{ marginTop: 6 }}><Icon name="alert" size={13} style={{ flexShrink: 0 }} />Ce salon est visible des visiteurs : les chiffres n&apos;y seront pas publiés.</div>
      )}
    </div>
  );
}

/* ── Les rappels ───────────────────────────────────────────────────────────── */

/** Ce qu'un message attend encore : son lot. Rien ne s'essaie avant d'exister. Le chrono est
 *  arrivé au lot 5 : tous les types de rappel des Chambres s'essaient désormais. */
const LOT_DU_TYPE: Partial<Record<TypeRappel, string>> = {};

function EditeurRappels({ ev, rappels, defauts, onChange, apercu, onEssai, essaiEnCours }: {
  ev: Evenement; rappels: RappelDef[]; defauts: RappelDef[]; onChange: (r: RappelDef[]) => void; apercu: Record<string, string>;
  onEssai: (message: string) => void; essaiEnCours: boolean;
}) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const maj = (i: number, patch: Partial<RappelDef>) => onChange(rappels.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const ajouter = () => {
    let n = rappels.length + 1;
    while (rappels.some((r) => r.id === `rappel_${n}`)) n++;
    onChange([...rappels, { id: `rappel_${n}`, type: ev === "cs" ? "places" : "jour", actif: false, quand: "jour", heure: "19:00", condition: "toujours", mention: "aucune", remplacePrecedent: false, texte: "" }]);
  };
  const types: TypeRappel[] = ev === "cs" ? ["panneau", "places", "jour", "recap", "chrono"] : ["panneau", "jour", "gs_staff"];
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rappels.length === 0 && <div style={{ ...ligne, color: "var(--text-muted)", fontSize: 13 }}>Aucun rappel : le bot ne dira rien.</div>}
      {rappels.map((r, i) => {
        const d = defauts.find((x) => x.id === r.id);
        return (
          <div key={r.id} style={{ display: "grid", gap: 6 }}>
            <div className={`gn-param-ligne gn-param-rappel${r.actif ? "" : " eteint"}`}>
              <Bascule valeur={r.actif} onChange={(v) => maj(i, { actif: v })} oui="Actif" non="Coupé" iconOui="bell" />
              <Champ label="Quand"><VgSelect full value={r.quand} onChange={(v) => maj(i, { quand: v as RappelDef["quand"] })} options={[{ value: "veille", label: "La veille" }, { value: "jour", label: "Le jour J" }]} /></Champ>
              {r.avant ? (
                <Champ label="Avant">
                  <input className="gn-param-champ court" inputMode="numeric" value={r.avant.minutes} aria-label="Minutes avant"
                    onChange={(e) => maj(i, { avant: { ...r.avant!, minutes: Math.max(0, Math.min(1440, Number(e.target.value.replace(/\D/g, "")) || 0)) } })} />
                </Champ>
              ) : (
                <Champ label="Heure"><input className="gn-param-champ court" value={r.heure} maxLength={5} placeholder="HH:MM" onChange={(e) => maj(i, { heure: e.target.value })} /></Champ>
              )}
              <Champ label="Condition"><VgSelect full value={r.condition} onChange={(v) => maj(i, { condition: v as RappelDef["condition"] })} options={Object.entries(LIBELLE_CONDITION).map(([value, label]) => ({ value, label }))} /></Champ>
              <Champ label="Mention"><VgSelect full value={r.mention} onChange={(v) => maj(i, { mention: v as RappelDef["mention"] })} options={Object.entries(LIBELLE_MENTION).map(([value, label]) => ({ value, label }))} /></Champ>
              <Champ label="Message"><VgSelect full value={r.type} onChange={(v) => maj(i, { type: v as TypeRappel })} options={types.map((t) => ({ value: t, label: LIBELLE_TYPE_RAPPEL[t] }))} /></Champ>
              <div style={{ display: "flex", gap: 6, alignSelf: "end" }}>
                <button type="button" style={geste} title="Le texte du message" onClick={() => setOuvert(ouvert === r.id ? null : r.id)}><Icon name="edit" size={14} /></button>
                <button type="button" className="gn-param-essai" disabled={essaiEnCours || !!LOT_DU_TYPE[r.type]}
                  title={LOT_DU_TYPE[r.type] ?? "Envoie ce message dans le salon des essais, tel qu'il partirait, sans mention (enregistre d'abord si besoin)"}
                  onClick={() => onEssai(r.id)}><Icon name="send" size={13} />Essai</button>
                {!d && <button type="button" style={{ ...geste, color: "var(--red)" }} title="Retirer ce rappel" onClick={() => onChange(rappels.filter((_, j) => j !== i))}><Icon name="x" size={14} /></button>}
              </div>
            </div>
            {r.avant && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", paddingLeft: 12 }}>
                {r.avant.minutes} min avant {r.avant.base === "debut" ? "le début du créneau" : "la fin d'inscription"} — l&apos;heure suit le créneau.{" "}
                <button type="button" onClick={() => maj(i, { avant: { ...r.avant!, base: r.avant!.base === "debut" ? "finInscription" : "debut" } })} style={{ ...petitBouton, padding: "2px 8px", fontSize: 11.5 }}>
                  compter depuis {r.avant.base === "debut" ? "la fin d'inscription" : "le début"}
                </button>
              </div>
            )}
            {ouvert === r.id && (
              <div className="gn-param-ligne" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
                <Champ label={`Texte d'ouverture · ${r.texte.length}/400`}>
                  <textarea className="gn-param-champ" rows={3} value={r.texte} onChange={(e) => maj(i, { texte: e.target.value })} />
                </Champ>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  Variables : {Object.keys(VARIABLES_TEXTE).map((k) => <code key={k} title={VARIABLES_TEXTE[k]} style={{ marginRight: 6 }}>{`{${k}}`}</code>)}
                  · Une mention écrite à la main (@everyone…) est retirée : la mention se règle au-dessus.
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text)" }}><span style={{ color: "var(--text-muted)" }}>Aperçu : </span>« {remplirTexte(r.texte, apercu)} »</div>
                {d && d.texte !== r.texte && (
                  <button type="button" onClick={() => maj(i, { texte: d.texte })} style={{ ...petitBouton, justifySelf: "start" }}><Icon name="rotate-ccw" size={13} />Rétablir le texte par défaut</button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {rappels.length < 12 && (
        <button type="button" onClick={ajouter} style={{ ...petitBouton, justifySelf: "start" }}><Icon name="plus" size={14} />Ajouter un rappel</button>
      )}
    </div>
  );
}

/* ── Le déroulé : phases, étapes et leurs monstres ─────────────────────────── */

function EditeurEtapes({ etapes, phases, onChange, monstres = true }: {
  etapes: Etape[]; phases: Record<string, string>; onChange: (e: Etape[], p: Record<string, string>) => void; monstres?: boolean;
}) {
  const [libre, setLibre] = useState<Record<string, string>>({});
  const majE = (i: number, patch: Partial<Etape>) => onChange(etapes.map((e, j) => (j === i ? { ...e, ...patch } : e)), phases);
  const deplacer = (i: number, s: -1 | 1) => {
    const l = [...etapes]; const j = i + s;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    onChange(l, phases);
  };
  const clesPhases = Object.keys(phases).sort();
  const ajouterEtape = () => {
    const derniere = etapes.at(-1);
    const phase = derniere?.phase ?? clesPhases[0] ?? "1";
    let n = etapes.filter((e) => e.phase === phase).length + 1;
    while (etapes.some((e) => e.code === `${phase}.${n}`)) n++;
    onChange([...etapes, { code: `${phase}.${n}`, label: "Nouvelle étape", phase, emoji: "▫️", monstres: [] }], Object.keys(phases).length ? phases : { "1": "Phase 1" });
  };
  const ajouterPhase = () => {
    const k = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].find((x) => !phases[x]);
    if (k) onChange(etapes, { ...phases, [k]: `Phase ${k}` });
  };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <span className="gn-param-lab" style={{ marginBottom: 0 }}>Phases</span>
        {clesPhases.map((k) => {
          const utilisee = etapes.some((e) => e.phase === k);
          return (
            <div key={k} className="gn-param-ligne" style={{ gridTemplateColumns: "32px minmax(0,1fr) auto" }}>
              <b style={{ textAlign: "center", color: "var(--gn-accent)" }}>{k}</b>
              <input className="gn-param-champ" value={phases[k]} maxLength={60} onChange={(e) => onChange(etapes, { ...phases, [k]: e.target.value })} aria-label={`Titre de la phase ${k}`} />
              <button type="button" style={{ ...geste, color: utilisee ? "var(--text-muted)" : "var(--red)", opacity: utilisee ? 0.4 : 1 }} disabled={utilisee}
                title={utilisee ? "Des étapes la portent encore" : "Retirer cette phase"}
                onClick={() => { const p = { ...phases }; delete p[k]; onChange(etapes, p); }}><Icon name="x" size={14} /></button>
            </div>
          );
        })}
        {clesPhases.length < 9 && <button type="button" onClick={ajouterPhase} style={{ ...petitBouton, justifySelf: "start" }}><Icon name="plus" size={14} />Phase</button>}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <span className="gn-param-lab" style={{ marginBottom: 0 }}>Étapes {monstres ? "et leurs monstres" : ""}</span>
        {etapes.length === 0 && <div style={{ ...ligne, color: "var(--text-muted)", fontSize: 13 }}>Aucune étape : le débrief sera simplifié (résultat, à retenir, vidéos).</div>}
        {etapes.map((e, i) => (
          <div key={`${i}-${e.code}`} className="gn-param-ligne gn-param-etape">
            <Champ label="Code"><input className="gn-param-champ court" value={e.code} maxLength={8} onChange={(x) => majE(i, { code: x.target.value.trim() })} /></Champ>
            <Champ label="Émoji"><input className="gn-param-champ court" value={e.emoji} maxLength={4} onChange={(x) => majE(i, { emoji: x.target.value.trim() })} /></Champ>
            <Champ label="Libellé"><input className="gn-param-champ" value={e.label} maxLength={60} onChange={(x) => majE(i, { label: x.target.value })} /></Champ>
            <Champ label="Phase"><VgSelect full value={e.phase} onChange={(v) => majE(i, { phase: v })} options={clesPhases.map((k) => ({ value: k, label: phases[k] || `Phase ${k}` }))} /></Champ>
            <div style={{ display: "flex", gap: 4, alignSelf: "end" }}>
              <button type="button" style={{ ...geste, opacity: i === 0 ? 0.35 : 1 }} disabled={i === 0} title="Monter" onClick={() => deplacer(i, -1)}><Icon name="arrow-up" size={13} /></button>
              <button type="button" style={{ ...geste, opacity: i === etapes.length - 1 ? 0.35 : 1 }} disabled={i === etapes.length - 1} title="Descendre" onClick={() => deplacer(i, 1)}><Icon name="arrow-down" size={13} /></button>
              <button type="button" style={{ ...geste, color: "var(--red)" }} title="Retirer cette étape" onClick={() => onChange(etapes.filter((_, j) => j !== i), phases)}><Icon name="x" size={13} /></button>
            </div>
            {monstres && (
              <div className="gn-param-monstres">
                {e.monstres.length === 0 && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Aucun monstre indiqué.</span>}
                {e.monstres.map((m, k) => {
                  const retirer = <button type="button" title="Retirer ce monstre" onClick={(ev) => { ev.preventDefault(); majE(i, { monstres: e.monstres.filter((_, j) => j !== k) }); }}><Icon name="x" size={11} /></button>;
                  return m.id
                    ? <a key={k} className="gn-monstre" href={`/monstres/${encodeURIComponent(m.id)}`} target="_blank" rel="noreferrer" title={`Fiche ${m.id}`}><span>{m.nom}</span>{retirer}</a>
                    : <span key={k} className="gn-monstre" title="Sans fiche dans le relevé du client"><span>{m.nom}</span>{retirer}</span>;
                })}
                {e.monstres.length < 12 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", flex: "1 1 260px", minWidth: 0 }}>
                    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                      <VgSelect full value="" placeholder="+ Monstre du relevé" onChange={(v) => {
                        const a = ADVERSAIRES_CS.find((x) => x.id === v);
                        if (a && !e.monstres.some((m) => m.id === a.id)) majE(i, { monstres: [...e.monstres, { id: a.id, nom: a.nom }] });
                      }} options={[{ value: "", label: "+ Monstre du relevé" }, ...ADVERSAIRES_CS.map((a) => ({ value: a.id, label: `${a.nom}${a.vies > 1 ? ` · ${a.vies} vies` : ""}` }))]} />
                    </div>
                    <input className="gn-param-champ" style={{ flex: "1 1 160px", width: "auto" }} placeholder="…ou un nom libre" maxLength={60}
                      value={libre[`${i}`] ?? ""} onChange={(x) => setLibre({ ...libre, [`${i}`]: x.target.value })}
                      onKeyDown={(x) => {
                        const nom = (libre[`${i}`] ?? "").trim();
                        if (x.key === "Enter" && nom) { majE(i, { monstres: [...e.monstres, { id: null, nom }] }); setLibre({ ...libre, [`${i}`]: "" }); }
                      }} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {etapes.length < 30 && <button type="button" onClick={ajouterEtape} style={{ ...petitBouton, justifySelf: "start" }}><Icon name="plus" size={14} />Étape</button>}
      </div>
      <div className="gn-panne"><Icon name="info" size={13} style={{ flexShrink: 0 }} />Les séances déjà chronométrées ou débriefées gardent leur liste : le code d&apos;une étape est ce qui compare deux séances, il ne change pas quand on la renomme.</div>
    </div>
  );
}

/* ── L'écran des Chambres ──────────────────────────────────────────────────── */

function EcranCS({ d, def, setD, lu, apercu, basculerGeneral, onEssai, essaiEnCours }: {
  d: ParametresCS; def: ParametresCS; setD: (p: ParametresCS) => void; lu: Lu; apercu: Record<string, string>; basculerGeneral: (v: boolean) => void;
  onEssai: (message: string) => void; essaiEnCours: boolean;
}) {
  const maj = <K extends keyof ParametresCS>(k: K, v: ParametresCS[K]) => setD({ ...d, [k]: v });
  const ecart = (k: keyof ParametresCS) => !memeValeur(d[k], def[k]);
  const retablir = (k: keyof ParametresCS) => () => setD({ ...d, [k]: copie(def[k]) });
  const majPoste = (id: string, patch: Partial<ParametresCS["postes"][number]>) => maj("postes", d.postes.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <>
      <Carte icon="power" titre="Interrupteurs" modifie={ecart("nouveauxMessages") || ecart("panneau") || ecart("annoncerAnnulation")}
        onRetablir={() => setD({ ...d, nouveauxMessages: def.nouveauxMessages, panneau: def.panneau, annoncerAnnulation: def.annoncerAnnulation })}
        sous="L'interrupteur général agit tout de suite (c'est celui de Bot Discord). Les trois autres s'enregistrent avec le reste.">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={ligne}>
            <Icon name="bell" framed frameSize={38} tone="gold" />
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>Rappels des Chambres (général)</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Coupé : le bot ne dit rien des Chambres, quoi que règle cet écran.</div>
            </div>
            <Bascule valeur={lu.rappelsActifs} onChange={basculerGeneral} oui="Activés" non="Coupés" iconOui="bell" />
          </div>
          <div style={ligne}>
            <Icon name="discord" framed frameSize={38} tone="gold" />
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>Messages de notre bot (bascule)</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.5 }}>
                Allumée : le panneau d&apos;inscription la veille, « il manque du monde » à 13 h 30 et 18 h 30, le récap de 20 h 40, la répartition à boutons et 📍 Mes positions, l&apos;annonce d&apos;une annulation, le chrono en direct, et le débrief publié en image dans le salon des débriefs. Coupée : seuls les deux rappels de 20 h partent. <b style={{ color: "var(--gold)" }}>Arrête d&apos;abord le bot Python et retire son application du serveur</b> : deux bots, deux @everyone, et des commandes en double.
              </div>
            </div>
            <Bascule valeur={d.nouveauxMessages} onChange={(v) => maj("nouveauxMessages", v)} />
          </div>
          <div style={ligne}>
            <Icon name="clipboard" framed frameSize={38} tone="gold" />
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>Panneau d&apos;inscription la veille</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Non : le rappel de la veille reste un message simple.</div>
            </div>
            <button type="button" className="gn-param-essai" disabled={essaiEnCours} onClick={() => onEssai("panneau")}
              title="Envoie le panneau d'inscription dans le salon des essais, sans mention"><Icon name="send" size={13} />Essai</button>
            <Bascule valeur={d.panneau} onChange={(v) => maj("panneau", v)} />
          </div>
          <div style={ligne}>
            <Icon name="ban" framed frameSize={38} tone="gold" />
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>Annoncer une annulation</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Un message dans le salon des Chambres quand le staff annule une séance (@everyone le jour même seulement). Le panneau passe en « annulée » dans tous les cas.</div>
            </div>
            <button type="button" className="gn-param-essai" disabled={essaiEnCours || !lu.data || !(lu.data as ParametresCS).annoncerAnnulation} onClick={() => onEssai("annulation")}
              title={(lu.data as ParametresCS).annoncerAnnulation ? "Envoie l'annonce d'annulation dans le salon des essais, sans mention" : "Annonce coupée (enregistrée) : rien à essayer"}><Icon name="send" size={13} />Essai</button>
            <Bascule valeur={d.annoncerAnnulation} onChange={(v) => maj("annoncerAnnulation", v)} />
          </div>
        </div>
      </Carte>

      <Carte icon="discord" titre="Salons" modifie={ecart("salons")} onRetablir={retablir("salons")}
        sous={<>{lu.salons.length ? "Les salons que le bot a relevés sur le serveur." : "Le bot n'a encore relevé aucun salon (en local, il ne tourne pas contre le serveur) : seul « par défaut » est proposé."}{" "}
          « Par défaut » : pour les Chambres, la variable CHANNEL_CS du bot, sinon le salon actuel des rappels ; pour les débriefs, CHANNEL_CS_DEBRIEF, sinon celui des Chambres ; pour les essais, CHANNEL_STAFF.
          {lu.salonsPublics === null && " Le bot n'a pas encore relevé quels salons sont visibles des visiteurs."}</>}>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
          <Champ label="Chambres (panneau, rappels, récap, chrono)"><MenuSalon valeur={d.salons.chambres} onChange={(v) => maj("salons", { ...d.salons, chambres: v })} salons={lu.salons} publics={lu.salonsPublics} /></Champ>
          <Champ label="Débriefs (texte ou forum)"><MenuSalon valeur={d.salons.debriefs} forum onChange={(v) => maj("salons", { ...d.salons, debriefs: v })} salons={lu.salons} publics={lu.salonsPublics} /></Champ>
          <Champ label="Essais"><MenuSalon valeur={d.salons.essais} onChange={(v) => maj("salons", { ...d.salons, essais: v })} salons={lu.salons} publics={lu.salonsPublics} /></Champ>
        </div>
      </Carte>

      <Carte id="rappels" icon="clock" titre="Rappels du jour J" modifie={ecart("rappels")} onRetablir={retablir("rappels")}
        sous="Heure de Paris. Le bot relit ce réglage chaque minute. Le rappel de la veille et celui de 20 h partent déjà ; les autres attendent la bascule ci-dessus. Un rappel en retard de plus de 10 minutes (bot redémarré) est abandonné, jamais envoyé en retard. Le chrono (coupé par défaut) publie le chrono en direct ; son texte est la phrase qu'il affiche avant « Démarrer ».">
        <EditeurRappels ev="cs" rappels={d.rappels} defauts={def.rappels} onChange={(r) => maj("rappels", r)} apercu={apercu} onEssai={onEssai} essaiEnCours={essaiEnCours} />
      </Carte>

      <Carte id="etapes" icon="list" titre="Étapes du chrono et du débrief" modifie={ecart("etapes") || ecart("phases")}
        onRetablir={() => setD({ ...d, etapes: copie(def.etapes), phases: copie(def.phases) })}
        sous={<>Par défaut, celles du débrief du 18/10/2026, mot pour mot. Les monstres de chaque étape s&apos;affichent dans la{" "}
          <Link href="/compositions?onglet=strategie" style={{ color: "var(--gn-accent)" }}>Stratégie</Link>, avec le lien vers leur fiche quand elle existe, et sous l&apos;étape en cours du{" "}
          <Link href="/compositions?onglet=chrono" style={{ color: "var(--gn-accent)" }}>Chrono</Link> (sur le site et dans Discord).</>}>
        <EditeurEtapes etapes={d.etapes} phases={d.phases} onChange={(e, p) => setD({ ...d, etapes: e, phases: p })} />
      </Carte>

      <Carte id="postes" icon="users" titre="Postes de la composition" modifie={ecart("postes")} onRetablir={retablir("postes")}
        sous={<>Titre, classe, rôle à chaque phase, et le chiffre DÉCLARÉ montré à côté du nom. Les trois Primats : DPS ; Off tank (PV en sceptre) ; Tank (PV en sceptre ET en poing). Un titre laissé tel quel laisse s&apos;afficher celui renommé sur la page des Chambres.</>}>
        <div style={{ display: "grid", gap: 8 }}>
          {d.postes.map((p) => {
            const code = POSTES_DEFAUT.find((x) => x.id === p.id)!;
            const renomme = lu.postesRenommes[p.id];
            const permis = rolesDeClasse(p.classe);
            const choix = CHOIX_MESURE.filter((c) => c.mesure.every((r) => permis.includes(r)));
            const cle = choixDeMesure(p.cs);
            return (
              <div key={p.id} className="gn-param-ligne gn-param-poste">
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <ClassLogo name={p.classe} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label !== code.label ? p.label : renomme || p.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{p.id}{renomme && p.label === code.label ? ` · renommé sur la page` : ""}</div>
                  </div>
                </div>
                <Champ label="Titre"><input className="gn-param-champ" value={p.label} maxLength={60} placeholder={code.label} onChange={(e) => majPoste(p.id, { label: e.target.value })} /></Champ>
                <Champ label="Classe">
                  <VgSelect full value={p.classe} options={CLASSES_CLES.map((c) => ({ value: c, label: NOMS_CLASSES[c] }))}
                    onChange={(v) => {
                      const r = rolesDeClasse(v);
                      // Une classe qui ne se mesure pas comme l'ancienne repart sur le DPS.
                      const cs = p.cs.mesure.every((m) => r.includes(m)) ? p.cs : { ...p.cs, mesure: ["dps" as const], toutes: undefined };
                      majPoste(p.id, { classe: v, cs });
                    }} />
                </Champ>
                <Champ label="Chiffre montré">
                  <VgSelect full value={cle ?? ""} placeholder="Personnalisé"
                    options={choix.map((c) => ({ value: c.cle, label: c.label }))}
                    onChange={(v) => { const c = CHOIX_MESURE.find((x) => x.cle === v); if (c) majPoste(p.id, { cs: { ...p.cs, mesure: [...c.mesure], toutes: c.toutes } }); }} />
                </Champ>
                <div className="gn-param-roles">
                  {(["jumeaux", "golems", "araignee"] as const).map((ph) => (
                    <span key={ph} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--text-muted)" }}>
                      {ph === "jumeaux" ? "Jumeaux" : ph === "golems" ? "Golems" : "Araignée"}
                      <Bascule valeur={p.cs[ph] === "tank"} onChange={(v) => majPoste(p.id, { cs: { ...p.cs, [ph]: v ? "tank" : "dps" } })} oui="Tank" non="DPS" iconOui="shield" iconNon="sword" />
                    </span>
                  ))}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                    Dans les 10 places
                    <Bascule valeur={!p.optionnel} onChange={(v) => majPoste(p.id, { optionnel: !v })} oui="Oui" non="Option" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Carte>

      <Carte icon="zap" titre="Dégâts déclarés" modifie={ecart("degats")} onRetablir={retablir("degats")}
        sous="Les chiffres que chacun déclare dans l'AirBuilder, montrés comme DÉCLARÉS : avec leur date et le témoin « à remesurer », jamais comme vérifiés.">
        <div style={{ display: "grid", gap: 10 }}>
          {([
            ["composition", "Sur la composition", "À côté de chaque nom, sur la page des Chambres et dans la clôture."],
            ["bilans", "Dans les bilans", "Le chiffre déclaré le soir de la séance, figé à la clôture : dans le débrief et l'historique."],
            ["discord", "Dans Discord", "Le panneau, le rappel de 20 h, le récap, la répartition, le chrono et le débrief — jamais dans un salon ouvert aux visiteurs."],
          ] as const).map(([k, t, s]) => (
            <div key={k} style={ligne}>
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>{t}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s}</div>
              </div>
              <Bascule valeur={d.degats[k]} onChange={(v) => maj("degats", { ...d.degats, [k]: v })} oui="Afficher" non="Masquer" iconOui="eye" />
            </div>
          ))}
        </div>
      </Carte>

      <Carte icon="grid" titre="Répartition" modifie={ecart("salles") || ecart("noms")}
        onRetablir={() => setD({ ...d, salles: copie(def.salles), noms: copie(def.noms) })}
        sous={<>Les places de la Phase 1 et le nom de la Phase 3, tels que les montrent l&apos;onglet{" "}
          <Link href="/compositions?onglet=repartition" style={{ color: "var(--gn-accent)" }}>Répartition</Link>, le récap et les boutons de Discord. Une salle retirée libère celui qui la tenait.</>}>
        <div style={{ display: "grid", gap: 8 }}>
          <span className="gn-param-lab" style={{ marginBottom: 0 }}>Les places de la Phase 1 ({d.salles.length})</span>
          <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))" }}>
            {d.salles.map((s, i) => (
              <div key={i} className="gn-param-ligne" style={{ gridTemplateColumns: "64px minmax(0,1fr) auto", padding: "7px 9px" }}>
                <input className="gn-param-champ court" value={s.cle} maxLength={8} aria-label="Clé" onChange={(e) => maj("salles", d.salles.map((x, j) => (j === i ? { ...x, cle: e.target.value.trim().toLowerCase() } : x)))} />
                <input className="gn-param-champ" value={s.label} maxLength={40} aria-label="Nom" onChange={(e) => maj("salles", d.salles.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <button type="button" style={{ ...geste, color: "var(--red)" }} title="Retirer" onClick={() => maj("salles", d.salles.filter((_, j) => j !== i))}><Icon name="x" size={13} /></button>
              </div>
            ))}
          </div>
          {d.salles.length < 20 && (
            <button type="button" style={{ ...petitBouton, justifySelf: "start" }} onClick={() => {
              let n = d.salles.length + 1; while (d.salles.some((x) => x.cle === `s${n}`)) n++;
              maj("salles", [...d.salles, { cle: `s${n}`, label: `Salle ${n}` }]);
            }}><Icon name="plus" size={14} />Place</button>
          )}
          <Champ label="Nom de la Phase 3 (les deux Dra'Zhul)">
            <input className="gn-param-champ" style={{ maxWidth: 320 }} value={d.noms.golems} maxLength={30} onChange={(e) => maj("noms", { golems: e.target.value })} />
          </Champ>
        </div>
      </Carte>

      <Carte icon="scroll" titre="Consignes du récap" modifie={ecart("consignes")} onRetablir={retablir("consignes")}
        sous="Les consignes du modèle, à relire : ce ne sont pas des faits vérifiés chez nous. Elles partent dans le récap de 20 h 40 et s'affichent dans l'onglet Répartition.">
        <div style={{ display: "grid", gap: 10 }}>
          <Champ label={`Golems · ${d.consignes.golems.length}/400`}>
            <textarea className="gn-param-champ" rows={2} value={d.consignes.golems} onChange={(e) => maj("consignes", { ...d.consignes, golems: e.target.value })} />
          </Champ>
          <span className="gn-param-lab" style={{ marginBottom: 0 }}>Araignée</span>
          {d.consignes.araignee.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <textarea className="gn-param-champ" rows={1} value={t} onChange={(e) => maj("consignes", { ...d.consignes, araignee: d.consignes.araignee.map((x, j) => (j === i ? e.target.value : x)) })} />
              <button type="button" style={{ ...geste, color: "var(--red)", marginTop: 6 }} title="Retirer" onClick={() => maj("consignes", { ...d.consignes, araignee: d.consignes.araignee.filter((_, j) => j !== i) })}><Icon name="x" size={13} /></button>
            </div>
          ))}
          {d.consignes.araignee.length < 8 && <button type="button" style={{ ...petitBouton, justifySelf: "start" }} onClick={() => maj("consignes", { ...d.consignes, araignee: [...d.consignes.araignee, ""] })}><Icon name="plus" size={14} />Consigne</button>}
        </div>
      </Carte>

      <Carte icon="message" titre="Textes des messages" modifie={ecart("textes")} onRetablir={retablir("textes")}
        sous="Les phrases d'ouverture des rappels se règlent sur chaque rappel (crayon) — celle du récap aussi. Ici, celles qui n'en dépendent pas : le pied du récap, le rappel de la veille quand le panneau est coupé, la consigne en tête des deux messages à boutons de la répartition (/chambre repartition), celles de la clôture et du débrief dans Discord (/chambre cloturer, /chambre debrief : seul le staff les voit), la phrase du débrief publié, au-dessus de son image, et la consigne d'une demande d'échange de place entre joueurs.">
        <div style={{ display: "grid", gap: 10 }}>
          <Champ label={`Pied du récap · ${d.textes.piedRecap.length}/400`}>
            <input className="gn-param-champ" value={d.textes.piedRecap} onChange={(e) => maj("textes", { ...d.textes, piedRecap: e.target.value })} />
          </Champ>
          <Champ label={`Rappel de la veille quand le panneau est coupé · ${d.textes.sansPanneau.length}/400`}>
            <textarea className="gn-param-champ" rows={2} value={d.textes.sansPanneau} onChange={(e) => maj("textes", { ...d.textes, sansPanneau: e.target.value })} />
          </Champ>
          <Champ label={`Boutons des salles (Phase 1) · ${d.textes.phase1.length}/400`}>
            <textarea className="gn-param-champ" rows={2} value={d.textes.phase1} onChange={(e) => maj("textes", { ...d.textes, phase1: e.target.value })} />
          </Champ>
          <Champ label={`Boutons des jumeaux (Phase 2) · ${d.textes.phase2.length}/400`}>
            <textarea className="gn-param-champ" rows={3} value={d.textes.phase2} onChange={(e) => maj("textes", { ...d.textes, phase2: e.target.value })} />
          </Champ>
          {/* L'essai des deux messages à boutons : la bascule (§8.10) demande un essai de chacun. */}
          <button type="button" className="gn-param-essai" style={{ justifySelf: "start" }} disabled={essaiEnCours} onClick={() => onEssai("repartition")}
            title="Envoie les deux messages à boutons de la répartition dans le salon des essais, sans mention"><Icon name="send" size={13} />Essai de la répartition</button>
          {/* Les deux messages éphémères du staff (lot 6 bis) : pas d'essai, seul celui qui tape la
              commande les voit. */}
          <Champ label={`Clôture dans Discord (/chambre cloturer) · ${d.textes.cloture.length}/400`}>
            <textarea className="gn-param-champ" rows={2} value={d.textes.cloture} onChange={(e) => maj("textes", { ...d.textes, cloture: e.target.value })} />
          </Champ>
          <Champ label={`Débrief dans Discord (/chambre debrief) · ${d.textes.debrief.length}/400`}>
            <textarea className="gn-param-champ" rows={2} value={d.textes.debrief} onChange={(e) => maj("textes", { ...d.textes, debrief: e.target.value })} />
          </Champ>
          {/* Le débrief PUBLIÉ (lot 7) : l'embed et l'image, dans le salon des débriefs. Vide : pas
              de phrase, le bilan et l'image suffisent. */}
          <Champ label={`Débrief publié (au-dessus de l'image, salon des débriefs) · ${d.textes.debriefPublie.length}/400`}>
            <textarea className="gn-param-champ" rows={2} value={d.textes.debriefPublie} onChange={(e) => maj("textes", { ...d.textes, debriefPublie: e.target.value })} />
          </Champ>
          <button type="button" className="gn-param-essai" style={{ justifySelf: "start" }} disabled={essaiEnCours} onClick={() => onEssai("debrief")}
            title="Envoie le dernier débrief noté — l'embed et son image — dans le salon des essais, sans mention"><Icon name="send" size={13} />Essai du débrief publié</button>
          {/* Lot 10 : la demande d'échange de place, en message privé au joueur visé (et dans
              🔄 Échanges de « Mes positions ») ; sa phrase de tête se calcule, la consigne se règle. */}
          <Champ label={`Demande d'échange (message privé au joueur visé) · ${d.textes.echange.length}/400`}>
            <textarea className="gn-param-champ" rows={2} value={d.textes.echange} onChange={(e) => maj("textes", { ...d.textes, echange: e.target.value })} />
          </Champ>
          <button type="button" className="gn-param-essai" style={{ justifySelf: "start" }} disabled={essaiEnCours} onClick={() => onEssai("echange")}
            title="Envoie une demande d'échange d'exemple — telle que le joueur visé la recevrait en privé — dans le salon des essais"><Icon name="send" size={13} />Essai de la demande d&apos;échange</button>
        </div>
      </Carte>

      <Carte icon="video" titre="Vidéos de débrief" modifie={ecart("videos")} onRetablir={retablir("videos")}
        sous={<>Le staff seulement joint des vidéos — un lien (YouTube, Twitch, Medal, Discord) ou un fichier MP4 / WebM de 100 Mo au plus — depuis le débrief d&apos;une séance (onglet Bilans) ; les membres les regardent une fois le débrief publié (décision du 21/10). Chaque nuit à 4 h 30, le bot efface les fichiers plus anciens que la conservation ; les liens restent.</>}>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          {([["maxParSeance", "Fichiers par séance", 1, 50], ["conservationJours", "Gardés (jours)", 7, 3650], ["quotaGo", "Espace (Go)", 1, 100]] as const).map(([k, t, min, max]) => (
            <Champ key={k} label={`${t} · ${min} à ${max}`}>
              <input className="gn-param-champ court" inputMode="numeric" value={d.videos[k]}
                onChange={(e) => maj("videos", { ...d.videos, [k]: Math.max(min, Math.min(max, Number(e.target.value.replace(/\D/g, "")) || min)) })} />
            </Champ>
          ))}
        </div>
        {/* L'espace utilisé (§9.4) : ce que le quota compte — fichiers prêts et envois en cours. */}
        {lu.videos && (
          <div style={{ ...sousTitre, marginTop: 12, marginBottom: 0 }}>
            Espace utilisé : <b style={{ color: lu.videos.octets >= d.videos.quotaGo * GO ? "var(--gn-crimson-texte)" : "var(--text)" }}>{tailleDite(lu.videos.octets)}</b> sur {d.videos.quotaGo} Go
            {" "}· {lu.videos.fichiers} fichier{lu.videos.fichiers > 1 ? "s" : ""}
            {lu.videos.libre !== null && <> · {tailleDite(lu.videos.libre)} libres sur le disque du serveur</>}
          </div>
        )}
      </Carte>
    </>
  );
}

/* ── L'écran du Guild Siege ────────────────────────────────────────────────── */

/** Le Guild Siege (§11, lot 9) : CODÉ, réglable, et ÉTEINT par défaut (décision 2 de Maxime :
 *  « le PvP n'est pas encore installé »). Allumé, l'onglet de la page des Chambres s'ouvre et le
 *  bot publie son panneau la veille ; éteint, rien ne part et l'onglet reste « En standby ».
 *  Les jours et les horaires viendront de Maxime : les créneaux se saisissent ici. */
function EcranGS({ d, def, setD, lu, apercu, basculerGeneral, onEssai, essaiEnCours }: {
  d: ParametresGS; def: ParametresGS; setD: (p: ParametresGS) => void; lu: Lu; apercu: Record<string, string>; basculerGeneral: (v: boolean) => void;
  onEssai: (message: string) => void; essaiEnCours: boolean;
}) {
  const maj = <K extends keyof ParametresGS>(k: K, v: ParametresGS[K]) => setD({ ...d, [k]: v });
  const ecart = (k: keyof ParametresGS) => !memeValeur(d[k], def[k]);
  const retablir = (k: keyof ParametresGS) => () => setD({ ...d, [k]: copie(def[k]) });
  const enregistre = lu.data as ParametresGS;
  return (
    <>
      <Carte icon="swords" titre="Le Guild Siege" modifie={ecart("actif") || ecart("annoncerAnnulation")}
        onRetablir={() => setD({ ...d, actif: def.actif, annoncerAnnulation: def.annoncerAnnulation })}
        sous="Codé, mais INACTIF par défaut : le PvP n'est pas installé en jeu (décision du 21/10). Allumé, l'onglet Guild Siege de la page des Chambres s'ouvre — « Je viens », qui vient avec ses chiffres déclarés, la clôture et le débrief —, et le bot publie le panneau la veille. Il ne s'allume qu'avec un créneau.">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={ligne}>
            <Icon name="swords" framed frameSize={38} tone="gold" />
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>Guild Siege actif</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {enregistre.actif ? "Actif : l'onglet est ouvert aux membres." : "Inactif : l'onglet reste « En standby », le bot ne dit rien."} S&apos;enregistre avec le reste.
              </div>
            </div>
            <Bascule valeur={d.actif} onChange={(v) => maj("actif", v)} oui="Actif" non="Inactif" iconOui="unlock" iconNon="lock" />
          </div>
          <div style={ligne}>
            <Icon name="bell" framed frameSize={38} tone="gold" />
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>Rappels du Guild Siege (général)</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>L&apos;interrupteur de Bot Discord ; il agit tout de suite. Coupé, aucun rappel ne part, même siège actif.</div>
            </div>
            <Bascule valeur={lu.rappelsActifs} onChange={basculerGeneral} oui="Activés" non="Coupés" iconOui="bell" />
          </div>
          <div style={ligne}>
            <Icon name="clipboard" framed frameSize={38} tone="gold" />
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>Panneau d&apos;inscription</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>« Je viens » libre, « Pas cette fois », un perso par compte ; tenu à jour sur Discord quand on s&apos;annonce sur le site.</div>
            </div>
            <button type="button" className="gn-param-essai" disabled={essaiEnCours} onClick={() => onEssai("panneau")}
              title="Envoie le panneau du Guild Siege dans le salon des essais, sans mention"><Icon name="send" size={13} />Essai</button>
          </div>
          <div style={ligne}>
            <Icon name="ban" framed frameSize={38} tone="gold" />
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>Annoncer une annulation</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Un message dans le salon du siège quand le staff annule une séance (@everyone le jour même seulement). Le panneau passe en « annulée » dans tous les cas.</div>
            </div>
            <button type="button" className="gn-param-essai" disabled={essaiEnCours || !enregistre.annoncerAnnulation} onClick={() => onEssai("annulation")}
              title={enregistre.annoncerAnnulation ? "Envoie l'annonce d'annulation dans le salon des essais, sans mention" : "Annonce coupée (enregistrée) : rien à essayer"}><Icon name="send" size={13} />Essai</button>
            <Bascule valeur={d.annoncerAnnulation} onChange={(v) => maj("annoncerAnnulation", v)} />
          </div>
        </div>
      </Carte>

      <Carte icon="calendar" titre="Créneaux" modifie={ecart("creneaux")} onRetablir={retablir("creneaux")}
        sous="Aucun par défaut : les jours et les horaires viendront de Maxime. Proposition à confirmer : samedi 21:00, fin d'inscription 19:00 — l'inscription de la GUILDE au siège, côté jeu, que le rappel du staff rappelle.">
        <div style={{ display: "grid", gap: 8 }}>
          {d.creneaux.length === 0 && <div style={{ ...ligne, color: "var(--text-muted)", fontSize: 13 }}>Aucun créneau : le Guild Siege ne peut pas s&apos;allumer.</div>}
          {d.creneaux.map((c, i) => (
            <div key={i} className="gn-param-ligne gn-param-creneau">
              <Champ label="Jour"><VgSelect full value={c.jour} options={JOURS.map((j, k) => ({ value: j, label: JOURS_LONGS[k] }))} onChange={(v) => maj("creneaux", d.creneaux.map((x, j) => (j === i ? { ...x, jour: v as JourFr } : x)))} /></Champ>
              <Champ label="Heure"><input className="gn-param-champ court" value={c.heure} maxLength={5} placeholder="HH:MM" onChange={(e) => maj("creneaux", d.creneaux.map((x, j) => (j === i ? { ...x, heure: e.target.value } : x)))} /></Champ>
              <Champ label="Fin d'inscription"><input className="gn-param-champ court" value={c.finInscription ?? ""} maxLength={5} placeholder="—" onChange={(e) => maj("creneaux", d.creneaux.map((x, j) => (j === i ? { ...x, finInscription: e.target.value || null } : x)))} /></Champ>
              <button type="button" style={{ ...geste, color: "var(--red)", alignSelf: "end" }} title="Retirer" onClick={() => maj("creneaux", d.creneaux.filter((_, j) => j !== i))}><Icon name="x" size={14} /></button>
            </div>
          ))}
          {d.creneaux.length < 7 && (
            <button type="button" style={{ ...petitBouton, justifySelf: "start" }} onClick={() => maj("creneaux", [...d.creneaux, { id: "", jour: "sam", heure: "21:00", finInscription: "19:00" }])}>
              <Icon name="plus" size={14} />Créneau
            </button>
          )}
        </div>
      </Carte>

      <Carte icon="discord" titre="Salons" modifie={ecart("salons")} onRetablir={retablir("salons")}
        sous="« Par défaut » : pour le siège, la variable CHANNEL_GS du bot, sinon le salon des Chambres ; pour ses débriefs, le salon du siège. Le rappel au staff part dans le salon du staff (CHANNEL_STAFF).">
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
          <Champ label="Guild Siege (panneau, rappels)"><MenuSalon valeur={d.salons.siege} onChange={(v) => maj("salons", { ...d.salons, siege: v })} salons={lu.salons} publics={lu.salonsPublics} /></Champ>
          <Champ label="Débriefs (texte ou forum)"><MenuSalon valeur={d.salons.debriefs} forum onChange={(v) => maj("salons", { ...d.salons, debriefs: v })} salons={lu.salons} publics={lu.salonsPublics} /></Champ>
        </div>
      </Carte>

      <Carte icon="clock" titre="Rappels" modifie={ecart("rappels")} onRetablir={retablir("rappels")}
        sous="Heure de Paris. « Avant » se compte depuis le créneau : un rappel suit son créneau quand il bouge. La veille, le panneau à boutons ; « dans 1 h », qui vient ; au staff, l'inscription de la guilde à faire, sans mention. Un seul @everyone par demi-heure avec les Chambres.">
        <EditeurRappels ev="gs" rappels={d.rappels} defauts={def.rappels} onChange={(r) => maj("rappels", r)} apercu={apercu} onEssai={onEssai} essaiEnCours={essaiEnCours} />
      </Carte>

      <Carte icon="list" titre="Manches (étapes)" modifie={ecart("etapes") || ecart("phases")} onRetablir={() => setD({ ...d, etapes: copie(def.etapes), phases: copie(def.phases) })}
        sous="Vide par défaut : un débrief simplifié (résultat, à retenir, vidéos). Si le siège a des manches à noter, elles se posent ici et le débrief les suit (bien, moyen, mal, chrono, remarque).">
        <EditeurEtapes etapes={d.etapes} phases={d.phases} monstres={false} onChange={(e, p) => setD({ ...d, etapes: e, phases: p })} />
      </Carte>

      <Carte icon="message" titre="Textes et plafond" modifie={ecart("textes") || ecart("places")} onRetablir={() => setD({ ...d, textes: copie(def.textes), places: def.places })}
        sous="La phrase d'ouverture du panneau est celle du rappel de la veille (Rappels → Texte). La règle vient dessous, et en tête de l'onglet du site.">
        <div style={{ display: "grid", gap: 10 }}>
          <Champ label={`La règle du siège · ${d.textes.panneau.length}/400`}>
            <textarea className="gn-param-champ" rows={2} value={d.textes.panneau} onChange={(e) => maj("textes", { ...d.textes, panneau: e.target.value })} />
          </Champ>
          <div style={{ fontSize: 12.5, color: "var(--text)" }}><span style={{ color: "var(--text-muted)" }}>Aperçu : </span>« {remplirTexte(d.textes.panneau, apercu)} »</div>
          <Champ label={`Débrief publié (en tête de l'embed, salon des débriefs) · ${d.textes.debriefPublie.length}/400`}>
            <textarea className="gn-param-champ" rows={2} value={d.textes.debriefPublie} placeholder="Vide : le résultat, à retenir et les vidéos suffisent."
              onChange={(e) => maj("textes", { ...d.textes, debriefPublie: e.target.value })} />
          </Champ>
          <button type="button" className="gn-param-essai" style={{ justifySelf: "start" }} disabled={essaiEnCours} onClick={() => onEssai("debrief")}
            title="Envoie le dernier débrief noté du Guild Siege — un embed, sans image — dans le salon des essais, sans mention"><Icon name="send" size={13} />Essai du débrief publié</button>
          <Champ label="Plafond de joueurs (vide = sans plafond, à confirmer)">
            <input className="gn-param-champ court" style={{ maxWidth: 140 }} inputMode="numeric" value={d.places ?? ""}
              onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "")); maj("places", n ? Math.min(100, n) : null); }} />
          </Champ>
        </div>
      </Carte>

      <Carte icon="zap" titre="Dégâts déclarés" modifie={ecart("degats")} onRetablir={retablir("degats")}
        sous="Le chiffre de chacun : son stuff DPS, à défaut Tank, à défaut Off tank — DÉCLARÉ dans l'AirBuilder, avec sa date et le témoin « à remesurer », jamais vérifié.">
        <div style={{ display: "grid", gap: 10 }}>
          {([
            ["composition", "Dans l'onglet Guild Siege", "À côté de chaque nom de la liste de qui vient, et dans la clôture."],
            ["bilans", "Dans les bilans", "Le chiffre déclaré le soir du siège, figé à la clôture : dans le débrief."],
            ["discord", "Dans Discord", "Le panneau et le rappel « dans 1 h » — jamais dans un salon ouvert aux visiteurs."],
          ] as const).map(([k, t, sous]) => (
            <div key={k} style={ligne}>
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>{t}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{sous}</div>
              </div>
              <Bascule valeur={d.degats[k]} onChange={(v) => maj("degats", { ...d.degats, [k]: v })} oui="Afficher" non="Masquer" iconOui="eye" />
            </div>
          ))}
        </div>
      </Carte>
    </>
  );
}

/* ── La page ───────────────────────────────────────────────────────────────── */

export default function ParametrageEvenementsPage() {
  useCardFx();
  const [ev, setEv] = useState<Evenement>("cs");
  const [lu, setLu] = useState<Lu | null>(null);
  const [brouillon, setBrouillon] = useState<ParametresCS | ParametresGS | null>(null);
  const [panne, setPanne] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [conflit, setConflit] = useState<{ message: string; actuel: Pick<Lu, "data" | "version" | "parQui" | "modifieLe" | "modifies"> } | null>(null);
  const [toast, setToast] = useState<{ texte: string; ok: boolean } | null>(null);

  const charger = useCallback(async (quel: Evenement) => {
    setPanne(false);
    try {
      const r = await fetch(`/api/evenements/parametres?evenement=${quel}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const j = (await r.json()) as Lu;
      setLu(j); setBrouillon(copie(j.data)); setErreurs([]); setConflit(null);
    } catch { setPanne(true); }
  }, []);
  useEffect(() => {
    // L'onglet se lit dans l'adresse (#gs) : on y revient après un rechargement.
    const quel: Evenement = typeof window !== "undefined" && window.location.hash === "#gs" ? "gs" : "cs";
    setEv(quel); charger(quel);
  }, [charger]);

  /* « Modifier les étapes » (Stratégie) mène à #etapes : le navigateur cherche l'ancre à
     l'arrivée, quand l'écran dit encore « Chargement… », et la page restait en haut. On y va
     donc une fois le paramétrage affiché. */
  const pret = !!(lu && brouillon);
  useEffect(() => {
    if (!pret) return;
    const ancre = window.location.hash.slice(1);
    if (ancre && ancre !== "gs") document.getElementById(ancre)?.scrollIntoView({ block: "start" });
  }, [pret]);

  const modifie = !!(lu && brouillon && !memeValeur(brouillon, lu.data));
  useEffect(() => {
    if (!modifie) return;
    // Quitter la page avec une saisie non enregistrée la perdrait sans un mot.
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [modifie]);

  const flash = (texte: string, ok: boolean) => { setToast({ texte, ok }); setTimeout(() => setToast(null), 4500); };

  const changerOnglet = (quel: Evenement) => {
    if (quel === ev) return;
    if (modifie && !window.confirm("Tes modifications ne sont pas enregistrées. Changer d'onglet les abandonne ?")) return;
    history.replaceState(null, "", quel === "gs" ? "#gs" : location.pathname + location.search);
    setEv(quel); setLu(null); setBrouillon(null); charger(quel);
  };

  const enregistrer = async (version?: number): Promise<boolean> => {
    if (!lu || !brouillon) return false;
    setBusy(true); setErreurs([]);
    const r = await fetch("/api/evenements/parametres", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evenement: ev, data: brouillon, version: version ?? lu.version }),
    }).catch(() => null);
    setBusy(false);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r) { flash("Le serveur n'a pas répondu : rien n'est enregistré.", false); return false; }
    if (r.status === 409 && j.actuel) { setConflit({ message: j.error, actuel: j.actuel }); return false; }
    if (r.status === 400 && Array.isArray(j.details)) { setErreurs(j.details); flash(j.error ?? "Des points sont à corriger.", false); return false; }
    if (!r.ok) { flash(j.error ?? "Enregistrement refusé.", false); return false; }
    setLu({ ...lu, data: j.data, version: j.version, parQui: j.parQui, modifieLe: j.modifieLe, modifies: j.modifies });
    setBrouillon(copie(j.data)); setConflit(null);
    flash(`Enregistré — version ${j.version}.`, true);
    return true;
  };

  /**
   * « ESSAI » (spec §8.7, route 3) : enregistre d'abord s'il y a des modifications — le bot rend
   * le message avec le paramétrage ENREGISTRÉ —, puis le bot l'envoie dans le salon des essais,
   * sans mention. La demande part dans sa file : on suit son verdict quelques secondes.
   */
  const [essai, setEssai] = useState<{ texte: string; ok: boolean | null; lien: string | null } | null>(null);
  const essayer = async (message: string) => {
    if (!lu || !brouillon) return;
    if (modifie && !(await enregistrer())) return;
    setEssai({ texte: "Essai demandé : le bot l'envoie dans le salon des essais sous 15 s…", ok: null, lien: null });
    const r = await fetch("/api/evenements/parametres/essai", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evenement: ev, message }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) { setEssai({ texte: j.error ?? "L'essai a été refusé.", ok: false, lien: null }); return; }
    const id = j.commande as string;
    for (let k = 0; k < 12; k++) {
      await new Promise((ok) => setTimeout(ok, 3000));
      const l = await fetch("/api/admin/bot-command", { cache: "no-store" }).then((x) => (x.ok ? x.json() : [])).catch(() => []) as { id: string; status: string; result: string | null }[];
      const c = l.find((x) => x.id === id);
      if (c?.status === "DONE") {
        const lien = /https:\/\/\S+/.exec(c.result ?? "")?.[0] ?? null;
        setEssai({ texte: "Essai envoyé dans le salon des essais.", ok: true, lien });
        return;
      }
      if (c?.status === "FAILED") { setEssai({ texte: `L'essai a échoué : ${c.result ?? "raison inconnue"}`, ok: false, lien: null }); return; }
    }
    setEssai({ texte: "Le bot n'a pas encore pris l'essai : il est peut-être arrêté (en local, il ne tourne pas). La demande reste dans sa file.", ok: false, lien: null });
  };
  const essaiEnCours = essai?.ok === null;

  const basculerGeneral = async (actif: boolean) => {
    if (!lu) return;
    const avant = lu.rappelsActifs;
    setLu({ ...lu, rappelsActifs: actif });
    const r = await fetch("/api/admin/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `${ev}_rappels_actifs`, value: actif ? "1" : "0" }),
    }).catch(() => null);
    // Refusé : l'écran revient à ce que la base dit.
    if (!r || !r.ok) { setLu((x) => (x ? { ...x, rappelsActifs: avant } : x)); flash("L'interrupteur n'a pas pu être changé.", false); }
    else flash(actif ? "Rappels activés." : "Rappels coupés.", true);
  };

  // L'aperçu des textes : la séance qui vient, et des nombres d'exemple.
  const apercu: Record<string, string> = {
    date: lu?.prochaine ? dateLongue(lu.prochaine.date) : "mercredi 21 octobre",
    heure: lu?.prochaine ? lu.prochaine.label.split(" · ")[1] ?? "21 h" : "21 h",
    annonces: "7", retenus: "5", places: "10", manque: "1 Envoûteur et 2 Arcanistes",
    lien: typeof window !== "undefined" ? `${window.location.origin}/compositions` : "/compositions", fin: "19 h",
  };

  const entete = (
    <>
      <PageHeader icon="settings" title="Paramétrage des événements"
        subtitle="Étapes, monstres, postes, textes et rappels des Chambres Secrètes et du Guild Siege — ce que le site et le bot lisent." />
      <SectionTabs rubrique="Outils" />
    </>
  );
  if (panne) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1060, margin: "0 auto" }}>
        {entete}
        <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />Le paramétrage n&apos;a pas pu être lu.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1060, margin: "0 auto" }}>
      {entete}
      <div className="vg-subtabs gn-cs-onglets">
        <button type="button" className={`vg-subtab ${ev === "cs" ? "active" : ""}`} onClick={() => changerOnglet("cs")}><Icon name="key" size={15} />Chambres Secrètes</button>
        <button type="button" className={`vg-subtab ${ev === "gs" ? "active" : ""}`} onClick={() => changerOnglet("gs")}><Icon name="swords" size={15} />Guild Siege</button>
      </div>

      {toast && <div className="fx-card" style={{ ...card, padding: "10px 14px", color: toast.ok ? "var(--green)" : "var(--red)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>{toast.ok && <Icon name="check" size={16} />}{toast.texte}</div>}


      {lu && (
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "-6px 0 16px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Icon name="info" size={13} />
          {lu.version === 0
            ? "Jamais modifié : tout ce qui s'affiche est le réglage par défaut, écrit dans le code."
            : <>Modifié par <b style={{ color: "var(--text)" }}>{lu.parQui ?? "?"}</b>{lu.modifieLe ? ` le ${new Date(lu.modifieLe).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""} · version {lu.version}{lu.modifies.length ? ` · s'écarte du défaut sur : ${lu.modifies.map((k) => NOMS_CLES[k] ?? k).join(", ")}` : " · tout au défaut"}</>}
        </div>
      )}

      {conflit && (
        <div className="gn-param-erreurs" style={{ paddingLeft: 14, listStyle: "none" }}>
          <div style={{ marginBottom: 8 }}>{conflit.message}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={petitBouton} onClick={() => { if (lu) { setLu({ ...lu, ...conflit.actuel }); setBrouillon(copie(conflit.actuel.data)); setConflit(null); } }}>
              <Icon name="rotate-ccw" size={13} />Recharger sa version (ta saisie est abandonnée)
            </button>
            <button type="button" style={{ ...petitBouton, color: "var(--gn-crimson-texte)", borderColor: "var(--gn-crimson-texte)" }} onClick={() => enregistrer(conflit.actuel.version)}>
              <Icon name="save" size={13} />Enregistrer la mienne par-dessus
            </button>
          </div>
        </div>
      )}

      {erreurs.length > 0 && <ul className="gn-param-erreurs">{erreurs.map((e, i) => <li key={i}>{e}</li>)}</ul>}

      {!lu || !brouillon ? (
        <div style={{ ...card, fontSize: 13, color: "var(--text-muted)" }}>Chargement…</div>
      ) : ev === "cs" ? (
        <EcranCS d={brouillon as ParametresCS} def={lu.defauts as ParametresCS} setD={setBrouillon} lu={lu} apercu={apercu} basculerGeneral={basculerGeneral} onEssai={essayer} essaiEnCours={essaiEnCours} />
      ) : (
        <EcranGS d={brouillon as ParametresGS} def={lu.defauts as ParametresGS} setD={setBrouillon} lu={lu} apercu={apercu} basculerGeneral={basculerGeneral} onEssai={essayer} essaiEnCours={essaiEnCours} />
      )}

      {lu && brouillon && (
        <div className="gn-param-barre">
          {/* Le verdict d'un essai vit dans la barre collée au bas de l'écran : le bouton « Essai »
              d'un rappel est loin du haut de page, et un bandeau là-haut passerait inaperçu. */}
          {essai && (
            <div className="gn-param-essai-etat" style={{ color: essai.ok === null ? "var(--gold)" : essai.ok ? "var(--green)" : "var(--gn-crimson-texte)" }}>
              <Icon name={essai.ok === null ? "clock" : essai.ok ? "check" : "alert"} size={15} style={{ flexShrink: 0 }} />
              <span style={{ flex: "1 1 220px", minWidth: 0 }}>{essai.texte}</span>
              {essai.lien && <a href={essai.lien} target="_blank" rel="noreferrer" style={{ ...petitBouton, textDecoration: "none" }}><Icon name="link" size={13} />Voir sur Discord</a>}
              {essai.ok !== null && <button type="button" style={geste} title="Fermer" onClick={() => setEssai(null)}><Icon name="x" size={13} /></button>}
            </div>
          )}
          <span className="gn-param-etat">{modifie ? "Des modifications ne sont pas enregistrées." : "Tout est enregistré."}</span>
          <button type="button" disabled={!modifie || busy} onClick={() => { setBrouillon(copie(lu.data)); setErreurs([]); }}
            style={{ ...petitBouton, color: "var(--text-muted)", borderColor: "var(--border)", opacity: !modifie || busy ? 0.5 : 1 }}>Annuler les modifications</button>
          <button type="button" className="vg-btn" disabled={!modifie || busy} onClick={() => enregistrer()} style={{ opacity: !modifie || busy ? 0.6 : 1 }}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      )}
    </div>
  );
}
