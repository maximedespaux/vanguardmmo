"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/Icon";
import { ClassLogo } from "@/components/ClassLogo";
import { EtatMesures, chiffresEnClair, conditionsEnClair, pastille, roleLibelle } from "@/components/staff/MesuresStuff";
import type { EtatStuff, Mesures, RoleMesure } from "@/lib/mesures";
import { NOTE_MAX, NOTE_MIN, RANG_LIBELLE, TONS, type Droits, type Geste, type Ton } from "@/lib/gestes";
import type { Role as Rang } from "@prisma/client";

/**
 * LE DOSSIER D'UN MEMBRE — et les gestes qu'on peut poser sur lui.
 *
 * Avant : pour décider du sort de quelqu'un, il fallait ouvrir le GuildViewer
 * (ses persos), Mes absences (les siennes) et Quête Guilde (ce qu'il a apporté).
 * Plusieurs pages, aucune ne montrant la même personne au même moment. On décidait
 * donc de mémoire. (Le volet ventes et coffre est parti avec la Boutique et
 * l'AirGuild, le 2026-10-21 ; l'onglet « Quêtes » avec Quête Guilde, le même jour —
 * ses apports restent en base, `QueteContribution`.)
 *
 * Ici tout tient dans un panneau, en quatre onglets — l'empilement complet
 * ferait deux mètres de défilement sur téléphone. Le quatrième, « Notes », est venu
 * le 2026-10-21 avec les gestes des quatre rangs bras droits (promouvoir, rétrograder,
 * cacher, retirer de la guilde — SPEC-INFORMATION-GUILDE §4) : ce qu'on retient d'un
 * membre entre deux décisions, problème ou effort, signé et daté.
 *
 * LE MOTIF EST OBLIGATOIRE, et le bouton reste inerte tant qu'il manque. Ce
 * n'est pas de la paperasse : c'est ce qu'on relira dans six mois quand
 * l'intéressé demandera pourquoi, et c'est ce que le bot écrit dans le journal
 * d'audit de Discord à côté du geste.
 *
 * Monté sur <body> par portail : les cartes du GuildViewer portent un
 * `transform` (effet de relief), et un `position:fixed` à l'intérieur d'un
 * élément transformé se recadre sur la carte au lieu de l'écran.
 */
type Role = { id: string; name: string; color: number; managed: boolean };
type Stuff = { id: string; name: string; mode: string; hp: number; attack: number; defense: number; etat: EtatStuff; role: RoleMesure; mesures: Mesures | null };
type Perso = { id: string; name: string; class: string; level: number; prestige: number; isMain: boolean; stuffs: Stuff[]; specialisations: { type: string; score: number }[] };
type Abs = { id: string; debut: string; fin: string; motif: string | null; statut: string; enCours: boolean; jours: number };
type Decision = { id: string; action: string; detail: string | null; motif: string; auteur: string; statut: string; resultat: string | null; date: string };
type Note = { id: string; ton: string; texte: string; auteur: string; date: string };
type Dossier = {
  identite: { id: string; discordId: string; username: string; avatar: string | null; role: Rang; isActive: boolean; cacheLe: string | null; pseudoJeu: string | null; lastSeenAt: string | null; inactifDepuis: number | null; inscritDepuis: number | null; createdAt: string };
  /** Ce que JE peux faire sur lui, geste par geste, et pourquoi pas (lib/gestes.ts). */
  droits: Droits;
  rolesDiscord: Role[];
  personnages: Perso[];
  absences: Abs[];
  deLaGuilde: boolean;
  decisions: Decision[];
  /** `null` : pas le droit de les lire — un rang égal ou supérieur au mien, ou moi. */
  notes: Note[] | null;
  compteurs: { absences: number; versions: number };
};

/**
 * Les gestes, du plus doux au plus définitif — l'ordre est celui-là exprès. Les quatre
 * premiers sont ouverts aux quatre rangs bras droits ; les trois derniers restent au rang
 * Vanguard et au-dessus. Chacun : un motif, une confirmation, une trace.
 */
const GESTES: { clef: Geste; libelle: string; icone: IconName; couleur: string; explique: string; verbe: string }[] = [
  { clef: "promouvoir", libelle: "Promouvoir", icone: "trending-up", couleur: "var(--green)", verbe: "Oui, le promouvoir",
    explique: "Il monte de rang. Le bot pose le rôle Discord du nouveau rang et retire l'ancien : c'est Discord qui fait le rang du site." },
  { clef: "retrograder", libelle: "Rétrograder", icone: "arrow-down", couleur: "var(--gold)", verbe: "Oui, le rétrograder",
    explique: "Il descend de rang sans quitter la guilde. Le bot retire son rôle de rang et pose celui du rang choisi." },
  { clef: "cacher", libelle: "Cacher", icone: "ghost", couleur: "var(--blue)", verbe: "Oui, le cacher",
    explique: "Il disparaît d'Information Guilde et du recensement. Rien ne change sur Discord : il reste de la guilde, et le staff le voit toujours ici." },
  { clef: "montrer", libelle: "Montrer de nouveau", icone: "eye", couleur: "var(--blue)", verbe: "Oui, le montrer",
    explique: "Il réapparaît dans Information Guilde et dans le recensement." },
  { clef: "guilde", libelle: "Retirer de la guilde", icone: "medal", couleur: "var(--gn-accent)", verbe: "Oui, le sortir de la guilde",
    explique: "Il n'est plus en jeu ? Tous ses rangs sautent d'un coup : il ne figure plus nulle part dans la guilde — ni Information Guilde, ni recensement, ni Chambres Secrètes —, mais il reste sur le Discord." },
  { clef: "role", libelle: "Retirer un rôle", icone: "tag", couleur: "var(--gold)", verbe: "Oui, retirer ce rôle",
    explique: "Il perd une casquette et ce qu'elle ouvre. Il reste membre de la guilde et du Discord." },
  { clef: "kick", libelle: "Exclure du Discord", icone: "arrow-right", couleur: "var(--red)", verbe: "Oui, l'exclure",
    explique: "Il sort du serveur. Il peut revenir si on lui redonne une invitation." },
  { clef: "ban", libelle: "Bannir", icone: "ban", couleur: "var(--red)", verbe: "Oui, bannir",
    explique: "Il sort du serveur et ne peut plus y revenir. Son historique reste au dossier." },
];

// « Coffre ouvert » reste lisible : des décisions de l'ancien geste sont au dossier.
const ACTION_LABEL: Record<string, string> = {
  coffre: "Coffre ouvert", role: "Rôle retiré", guilde: "Sorti de la guilde", kick: "Exclu du Discord", ban: "Banni",
  promouvoir: "Promu", retrograder: "Rétrogradé", cacher: "Caché", montrer: "Montré de nouveau",
};
/** La teinte d'un ton de note : les mots de la file (rouge, vert), le gris pour le neutre. */
const TON_META: Record<Ton, { c: string; icone: IconName }> = {
  probleme: { c: "var(--red)", icone: "alert" }, effort: { c: "var(--green)", icone: "trending-up" }, neutre: { c: "var(--text-muted)", icone: "info" },
};
const tonDe = (t: string): Ton => (t === "probleme" || t === "effort" ? t : "neutre");
const STATUT_ABS: Record<string, { l: string; c: string }> = { APPROVED: { l: "acceptée", c: "var(--green)" }, PENDING: { l: "en attente", c: "var(--gold)" }, REJECTED: { l: "refusée", c: "var(--red)" } };
const jour = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
const nb = (n: number) => n.toLocaleString("fr-FR");
/* « Quêtes » est parti avec Quête Guilde (2026-10-21) : un ancien lien `?onglet=quetes`
   n'est plus un onglet, et le dossier s'ouvre alors sur « Le membre » (estOngletDossier). */
const ONGLETS = [["membre", "Le membre", "user"], ["absences", "Absences", "calendar"], ["decisions", "Décisions", "scroll"], ["notes", "Notes", "edit"]] as const;
export type OngletDossier = (typeof ONGLETS)[number][0];
export const estOngletDossier = (x: unknown): x is OngletDossier => ONGLETS.some(([k]) => k === x);

/** `onglet` : l'onglet d'arrivée. Une alerte d'absence ouvre le dossier sur ses
 *  absences, un geste de modération échoué sur ses décisions (?onglet= de /staff). */
export function DossierMembre({ userId, onFermer, onChange, onglet: ongletInitial = "membre" }: { userId: string; onFermer: () => void; onChange?: () => void; onglet?: OngletDossier }) {
  const [d, setD] = useState<Dossier | null>(null);
  const [err, setErr] = useState("");
  const [onglet, setOnglet] = useState<OngletDossier>(ongletInitial);

  const charger = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/membre/${userId}`);
      if (!r.ok) { setErr((await r.json().catch(() => ({}))).error || "Chargement impossible."); return; }
      setD(await r.json());
    } catch { setErr("Chargement impossible."); }
  }, [userId]);

  useEffect(() => { charger(); }, [charger]);

  /* LE VERDICT DU BOT, sans rouvrir le dossier. Un geste posé attend le bot (un tick de
     12 s) : le dossier le disait « en attente » jusqu'à ce qu'on le ferme et le rouvre.
     Tant qu'une décision RÉCENTE attend, on relit donc le dossier toutes les 5 s ; quand
     le verdict tombe, la page relit aussi sa liste (le rang a pu bouger). Pas au-delà de
     3 minutes : un bot à l'arrêt se dit dans la file « À traiter » (bot muet), pas dans
     un dossier qui tournerait sans fin. */
  const enAttente = d?.decisions.some((x) => x.statut === "EN_ATTENTE" && Date.now() - Date.parse(x.date) < 3 * 60_000) ?? false;
  useEffect(() => {
    if (!enAttente) return;
    const t = setTimeout(charger, 5000);
    return () => clearTimeout(t);
  }, [enAttente, d, charger]);
  const attendait = useRef(false);
  useEffect(() => {
    if (attendait.current && !enAttente) onChange?.();
    attendait.current = enAttente;
  }, [enAttente, onChange]);

  useEffect(() => {
    const t = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    document.addEventListener("keydown", t);
    return () => document.removeEventListener("keydown", t);
  }, [onFermer]);

  const i = d?.identite;

  return createPortal(
    <div onClick={onFermer} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.68)", backdropFilter: "blur(3px)", zIndex: 80, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "clamp(10px,4vh,44px) 14px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="glass-card" style={{ width: "100%", maxWidth: 760, borderRadius: 16, overflow: "hidden", background: "var(--bg-2)", border: "1px solid var(--border)" }}>

        {/* Identité — ce qui doit rester à l'écran quel que soit l'onglet */}
        <div style={{ padding: "16px 18px 0", borderBottom: "1px solid var(--border)", background: "linear-gradient(180deg, rgba(var(--gn-lueur-rgb),.07), transparent)" }}>
          <div style={{ display: "flex", gap: 13, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <div className="font-heading" style={{ fontSize: 19, fontWeight: 700, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                {i?.username ?? "…"}
                {/* La pastille dit la même chose que celle du GuildViewer : venu sur le site
                    ces 30 derniers jours. `isActive` ne bougeait qu'au kick ou au ban. */}
                {i && (() => {
                  // Sur l'instant et non sur les jours arrondis : à 30,5 jours, la file disait
                  // « inactif » et la pastille « venu ».
                  const vu = !!i.lastSeenAt && Date.now() - Date.parse(i.lastSeenAt) <= 30 * 86_400_000;
                  return <span title={vu ? "Venu sur le site ces 30 derniers jours" : "Pas venu sur le site depuis plus de 30 jours"} style={{ width: 9, height: 9, borderRadius: "50%", background: vu ? "var(--green)" : "var(--text-muted)", boxShadow: vu ? "0 0 8px var(--green)" : "none" }} />;
                })()}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span>
                  {i?.pseudoJeu ? <>En jeu : <b style={{ color: "var(--gold)" }}>{i.pseudoJeu}</b> · </> : null}
                  {i ? <>Rang {RANG_LIBELLE[i.role] ?? i.role}</> : null}
                </span>
                {/* Caché : il ne figure plus dans Information Guilde. Dit ici, à côté du rang,
                    parce que c'est ce qu'on vérifie en ouvrant le dossier. */}
                {i?.cacheLe && <span className="gn-pastille-etat" title={`Caché depuis le ${jour(i.cacheLe)}`}><Icon name="ghost" size={12} />Caché d&apos;Information Guilde</span>}
              </div>
            </div>
            <button onClick={onFermer} aria-label="Fermer le dossier" style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, color: "var(--text-muted)", cursor: "pointer", padding: "7px 9px", display: "flex", flexShrink: 0 }}>
              <Icon name="x" size={16} />
            </button>
          </div>

          {i && (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "12px 0 0" }}>
              <Fait icone="clock" val={i.inactifDepuis == null ? "jamais vu" : i.inactifDepuis === 0 ? "aujourd'hui" : `il y a ${i.inactifDepuis} j`} lab="dernière visite" alerte={i.inactifDepuis == null || i.inactifDepuis > 30} />
              <Fait icone="calendar" val={i.inscritDepuis != null ? `${i.inscritDepuis} j` : "—"} lab="dans la guilde" />
              <Fait icone="users" val={String(d.personnages.length)} lab="personnages" />
              <Fait icone="ban" val={String(d.compteurs.absences)} lab="absences" alerte={d.compteurs.absences > 4} />
            </div>
          )}

          {/* Les onglets doivent tenir d'un bloc, y compris sur 375 px :
              le dernier — Décisions — porte les gestes de modération, et un
              onglet qu'il faut deviner en faisant défiler n'est pas un onglet.
              Sous 430 px on sacrifie donc les icônes, pas les libellés. */}
          <div className="dm-onglets" style={{ display: "flex", gap: 3, marginTop: 13, overflowX: "auto" }}>
            {ONGLETS.map(([clef, lab, ic]) => (
              <button key={clef} onClick={() => setOnglet(clef)}
                style={{ borderBottom: `2px solid ${onglet === clef ? "var(--gn-accent)" : "transparent"}`,
                  color: onglet === clef ? "var(--gn-accent)" : "var(--text-muted)" }}>
                {/* Aucun style inline sur l'icône ni sur le bouton hors couleur :
                    un `display` ou un `padding` posé en inline gagne toujours
                    contre la règle responsive, qui ne s'appliquerait jamais. */}
                <span className="dm-onglet-ic"><Icon name={ic as IconName} size={14} /></span>{lab}
              </button>
            ))}
          </div>
          <style>{`
            .dm-onglets>button{display:inline-flex;align-items:center;gap:6px;padding:9px 13px;border:none;
              background:none;cursor:pointer;font-size:12.5px;font-weight:600;font-family:inherit;white-space:nowrap}
            .dm-onglets .dm-onglet-ic{display:inline-flex}
            @media (max-width:430px){
              .dm-onglets .dm-onglet-ic{display:none}
              .dm-onglets>button{padding-left:9px;padding-right:9px}
            }`}</style>
        </div>

        <div style={{ padding: 18, maxHeight: "min(62vh, 620px)", overflowY: "auto" }}>
          {err && <div style={{ color: "var(--red)", fontSize: 13 }}>{err}</div>}
          {!d && !err && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Ouverture du dossier…</div>}

          {d && onglet === "membre" && <OngletMembre d={d} />}
          {d && onglet === "absences" && <OngletAbsences d={d} />}
          {d && onglet === "decisions" && <OngletDecisions d={d} onFait={() => { charger(); onChange?.(); }} />}
          {d && onglet === "notes" && <OngletNotes d={d} onFait={charger} />}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Un fait chiffré, en tête de dossier ──────────────────────────────── */
function Fait({ icone, val, lab, alerte }: { icone: IconName; val: string; lab: string; alerte?: boolean }) {
  return (
    <div title={lab} style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--bg-3)", border: `1px solid ${alerte ? "color-mix(in srgb, var(--gold) 45%, transparent)" : "var(--border)"}`, borderRadius: 9, padding: "6px 11px" }}>
      <Icon name={icone} size={13} style={{ color: alerte ? "var(--gold)" : "var(--text-muted)", flexShrink: 0 }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: alerte ? "var(--gold)" : "var(--text)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>{val}</span>
        <span style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: .6, color: "var(--text-muted)" }}>{lab}</span>
      </span>
    </div>
  );
}

function Titre({ icone, children, apres }: { icone: IconName; children: React.ReactNode; apres?: React.ReactNode }) {
  return (
    <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, textTransform: "uppercase", letterSpacing: 1.1, color: "var(--text-muted)", margin: "0 0 9px" }}>
      <Icon name={icone} size={13} />{children}
      {apres != null && <span style={{ marginLeft: "auto", color: "var(--gn-accent)", letterSpacing: 0 }}>{apres}</span>}
    </div>
  );
}
const Vide = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 12.5, color: "var(--text-muted)", background: "var(--bg-3)", border: "1px dashed var(--border)", borderRadius: 10, padding: "12px 14px" }}>{children}</div>
);
const ligne: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", fontSize: 12.5 };

/* ── Onglet 1 : qui il est ────────────────────────────────────────────── */
function OngletMembre({ d }: { d: Dossier }) {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <Titre icone="discord" apres={`${d.rolesDiscord.length}`}>Rôles Discord</Titre>
        {d.rolesDiscord.length === 0
          ? <Vide>Aucun rôle connu. Le bot remplit cette liste toutes les 10 minutes — si elle reste vide, c&apos;est qu&apos;il n&apos;a pas encore tourné depuis la mise à jour.</Vide>
          : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {d.rolesDiscord.map((r) => {
                const c = r.color ? `#${r.color.toString(16).padStart(6, "0")}` : "var(--text-muted)";
                return <span key={r.id} title={r.managed ? "Géré par une intégration — non retirable" : undefined}
                  style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 20, color: c, background: `color-mix(in srgb, ${c} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 42%, transparent)` }}>
                  {r.managed && <Icon name="lock" size={10} style={{ display: "inline-block", marginRight: 4, verticalAlign: -1 }} />}{r.name}
                </span>;
              })}
            </div>}
      </div>

      <div>
        <Titre icone="users" apres={`${d.personnages.length}`}>Personnages et stuffs</Titre>
        {d.personnages.length === 0
          ? <Vide>Aucun personnage déclaré — il n&apos;a pas encore rempli sa fiche.</Vide>
          : <div style={{ display: "grid", gap: 7 }}>
              {d.personnages.map((p) => (
                <div key={p.id} style={ligne}>
                  <ClassLogo name={p.class} size={22} />
                  <span style={{ minWidth: 110 }}>
                    <b>{p.name}</b>{p.isMain && <Icon name="star" size={11} style={{ color: "var(--gold)", marginLeft: 5, verticalAlign: -1 }} />}
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{p.class.charAt(0) + p.class.slice(1).toLowerCase()} · Niv {p.level} · P{p.prestige}</span>
                  </span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {p.stuffs.every((s) => s.etat === "vide") && <span style={{ fontSize: 11, color: "var(--red)" }}>aucun stuff</span>}
                  </span>
                  {/* Les stuffs MONTÉS, chacun avec ses mesures : un stuff vide n'a rien à
                      dire, et chaque perso en porte trois dès sa création. */}
                  {p.stuffs.some((s) => s.etat !== "vide") && (
                    <div style={{ flexBasis: "100%", display: "grid", gap: 5 }}>
                      {p.stuffs.filter((s) => s.etat !== "vide").map((s) => {
                        const chiffres = s.mesures ? chiffresEnClair(p.class, s.role, s.mesures.v) : "";
                        return (
                          <div key={s.id} title={`${s.name} — PV ${nb(s.hp)} · Atq ${nb(s.attack)} · Déf ${nb(s.defense)}`}
                            style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", fontSize: 11.5, minWidth: 0 }}>
                            <span style={pastille("var(--text-muted)")}>{roleLibelle(s.role)}</span>
                            {s.name.toLowerCase() !== roleLibelle(s.role).toLowerCase() && <span style={{ fontWeight: 600, color: "var(--text)" }}>{s.name}</span>}
                            {chiffres && <span style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{chiffres}</span>}
                            {s.mesures && s.etat !== "a-renseigner" && <span style={{ color: "var(--text-muted)" }}>{conditionsEnClair(s.mesures)}</span>}
                            <span style={{ marginLeft: "auto" }}><EtatMesures etat={s.etat} /></span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>}
      </div>
    </div>
  );
}

/* ── Onglet 2 : ses absences ──────────────────────────────────────────── */
function OngletAbsences({ d }: { d: Dossier }) {
  const jours = d.absences.filter((a) => a.statut !== "REJECTED").reduce((s, a) => s + a.jours, 0);
  return (
    <div>
      <Titre icone="calendar" apres={jours ? `${jours} jours cumulés` : undefined}>Absences déclarées</Titre>
      {d.absences.length === 0
        ? <Vide>Aucune absence déclarée.</Vide>
        : <div style={{ display: "grid", gap: 7 }}>
            {d.absences.map((a) => {
              const s = STATUT_ABS[a.statut] ?? { l: a.statut, c: "var(--text-muted)" };
              return (
                <div key={a.id} style={{ ...ligne, borderColor: a.enCours ? "var(--gold)" : "var(--border)" }}>
                  <Icon name={a.enCours ? "clock" : "calendar"} size={15} style={{ color: a.enCours ? "var(--gold)" : "var(--text-muted)", flexShrink: 0 }} />
                  <span style={{ minWidth: 150 }}>
                    <b>{jour(a.debut)} → {jour(a.fin)}</b>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{a.jours} jour{a.jours > 1 ? "s" : ""}{a.enCours ? " · en cours" : ""}</span>
                  </span>
                  {a.motif && <span style={{ flex: "1 1 140px", minWidth: 0, color: "var(--text-muted)", fontStyle: "italic" }}>« {a.motif} »</span>}
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: s.c, border: `1px solid color-mix(in srgb, ${s.c} 42%, transparent)`, background: `color-mix(in srgb, ${s.c} 11%, transparent)`, borderRadius: 6, padding: "2px 9px" }}>{s.l}</span>
                </div>
              );
            })}
          </div>}
    </div>
  );
}

/* ── Onglet 3 : ce qui a été décidé, et ce qu'on peut décider ─────────── */
function OngletDecisions({ d, onFait }: { d: Dossier; onFait: () => void }) {
  const [geste, setGeste] = useState<Geste | null>(null);
  const [motif, setMotif] = useState("");
  const [roleId, setRoleId] = useState("");
  const [rang, setRang] = useState<Rang | "">("");
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; msg: string } | null>(null);

  const g = GESTES.find((x) => x.clef === geste);
  const retirables = d.rolesDiscord.filter((r) => !r.managed);
  const rangs = geste === "promouvoir" ? d.droits.promotions : geste === "retrograder" ? d.droits.retrogradations : [];
  const manque = geste === "role" ? !roleId : geste === "promouvoir" || geste === "retrograder" ? !rang : false;
  const pret = !!g && motif.trim().length >= 5 && !manque && !envoi;

  const fermer = () => { setGeste(null); setMotif(""); setRoleId(""); setRang(""); };

  const envoyer = async () => {
    if (!pret) return;
    setEnvoi(true); setRetour(null);
    try {
      const r = await fetch("/api/admin/moderation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: geste, userId: d.identite.id, motif: motif.trim(), roleId: roleId || undefined, rang: rang || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setRetour({ ok: false, msg: j.error || "Refusé." }); setEnvoi(false); return; }
      setRetour({ ok: true, msg: j.message || "C'est enregistré." });
      fermer(); onFait();
    } catch { setRetour({ ok: false, msg: "Le site n'a pas répondu." }); }
    setEnvoi(false);
  };

  /* Un seul des deux s'affiche : « Cacher » sur un membre visible, « Montrer de nouveau »
     sur un membre caché. Les deux boutons côte à côte, l'un toujours grisé, disaient
     moins bien l'état du membre que le bouton seul. */
  const visibles = GESTES.filter((x) => (x.clef === "cacher" ? !d.identite.cacheLe : x.clef === "montrer" ? !!d.identite.cacheLe : true));
  const raisonDe = (x: Geste) => d.droits.gestes[x] ?? (x === "role" && retirables.length === 0 ? "Aucun rôle retirable connu." : null);
  /* La même raison partout (c'est moi, ou un rang égal ou supérieur au mien) : une phrase
     plutôt que huit boutons grisés qui la répètent. */
  const raisons = visibles.map((x) => raisonDe(x.clef));
  const aucun = raisons.every((r) => r && r === raisons[0]) ? raisons[0] : null;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <Titre icone="shield">Agir sur ce membre</Titre>

        {aucun ? <Vide>{aucun}</Vide> : !geste ? (
          <>
            <div style={{ display: "grid", gap: 6 }}>
              {visibles.map((x) => {
                const indispo = raisonDe(x.clef);
                return (
                  <button key={x.clef} disabled={!!indispo} onClick={() => { setGeste(x.clef); setRetour(null); }} title={indispo ?? x.explique}
                    style={{ display: "flex", alignItems: "center", gap: 11, textAlign: "left", width: "100%", padding: "11px 13px", borderRadius: 10, fontFamily: "inherit",
                      border: `1px solid ${indispo ? "var(--border)" : `color-mix(in srgb, ${x.couleur} 34%, var(--border))`}`,
                      background: "var(--bg-3)", cursor: indispo ? "not-allowed" : "pointer", opacity: indispo ? .45 : 1 }}>
                    <Icon name={x.icone} size={17} style={{ color: x.couleur, flexShrink: 0 }} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{x.libelle}</span>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{indispo ?? x.explique}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {retour && <div style={{ marginTop: 10, fontSize: 12.5, color: retour.ok ? "var(--green)" : "var(--red)" }}>{retour.msg}</div>}
          </>
        ) : (
          <div style={{ border: `1px solid color-mix(in srgb, ${g!.couleur} 45%, transparent)`, borderRadius: 12, padding: 15, background: `color-mix(in srgb, ${g!.couleur} 6%, var(--bg-3))` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
              <Icon name={g!.icone} size={17} style={{ color: g!.couleur }} />
              <b className="font-heading" style={{ fontSize: 14.5 }}>{g!.libelle} — {d.identite.username}</b>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 13px" }}>{g!.explique}</p>

            {geste === "role" && (
              <label style={{ display: "block", marginBottom: 12 }}>
                <span style={etiq}>Quel rôle ?</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {retirables.map((r) => (
                    <button key={r.id} type="button" onClick={() => setRoleId(r.id)} style={choix(roleId === r.id)}>{r.name}</button>
                  ))}
                </div>
              </label>
            )}

            {/* Le rang cible, parmi ceux que JE peux donner : jamais au-delà du rang juste
                sous le mien (lib/gestes.ts) — la route refait le même calcul. */}
            {(geste === "promouvoir" || geste === "retrograder") && (
              <label style={{ display: "block", marginBottom: 12 }}>
                <span style={etiq}>{RANG_LIBELLE[d.identite.role]} → quel rang ?</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {rangs.map((r) => (
                    <button key={r} type="button" onClick={() => setRang(r)} style={choix(rang === r)}>{RANG_LIBELLE[r]}</button>
                  ))}
                </div>
              </label>
            )}

            <label style={{ display: "block" }}>
              <span style={etiq}>Motif — obligatoire</span>
              <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} maxLength={400}
                placeholder="Ce qui s'est passé, en une phrase. C'est ce qu'on relira dans six mois."
                style={{ width: "100%", background: "var(--bg-2)", border: `1px solid ${motif.trim().length >= 5 ? "var(--border)" : "color-mix(in srgb, var(--red) 45%, var(--border))"}`, borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
              <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                {geste === "cacher" || geste === "montrer" ? "Il reste au dossier, avec ton nom." : "Il part avec le geste dans le journal d'audit de Discord, et il reste au dossier."} {motif.trim().length < 5 ? "Encore trop court." : `${400 - motif.length} caractères restants.`}
              </span>
            </label>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={fermer} disabled={envoi} style={{ padding: "9px 15px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Annuler</button>
              <button onClick={envoyer} disabled={!pret}
                title={!pret ? (manque ? "Choisis d'abord." : "Le motif est obligatoire.") : undefined}
                style={{ padding: "9px 17px", borderRadius: 9, border: "none", background: pret ? g!.couleur : "var(--bg-2)", color: pret ? "#0A0A0C" : "var(--text-muted)", fontWeight: 700, cursor: pret ? "pointer" : "not-allowed", fontSize: 13, fontFamily: "inherit" }}>
                {envoi ? "…" : g!.verbe}
              </button>
            </div>
            {retour && !retour.ok && <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--red)" }}>{retour.msg}</div>}
          </div>
        )}
      </div>

      <div>
        <Titre icone="scroll" apres={d.decisions.length ? `${d.decisions.length}` : undefined}>Ce qui a déjà été décidé</Titre>
        {d.decisions.length === 0
          ? <Vide>Rien au dossier — aucune décision n&apos;a jamais été prise à son sujet.</Vide>
          : <div style={{ display: "grid", gap: 7 }}>
              {d.decisions.map((x) => {
                const c = x.statut === "ECHOUEE" ? "var(--red)" : x.statut === "EN_ATTENTE" ? "var(--gold)" : "var(--text-muted)";
                return (
                  <div key={x.id} style={{ ...ligne, alignItems: "flex-start", borderLeft: `3px solid ${c}` }}>
                    <span style={{ flex: "1 1 auto", minWidth: 0 }}>
                      <b>{ACTION_LABEL[x.action] ?? x.action}{x.detail ? ` — ${x.detail}` : ""}</b>
                      <span style={{ display: "block", color: "var(--text-muted)", fontStyle: "italic", margin: "3px 0" }}>« {x.motif} »</span>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>
                        par {x.auteur} · {jour(x.date)}
                        {x.statut === "EN_ATTENTE" && " · en attente du bot"}
                        {x.statut === "ECHOUEE" && <span style={{ color: "var(--red)" }}> · échec : {x.resultat}</span>}
                      </span>
                      {/* Le verdict du bot : ce que Discord a réellement fait. */}
                      {x.statut === "FAITE" && x.resultat && <span style={{ display: "block", fontSize: 11.5, color: "var(--green)", marginTop: 2 }}>{x.resultat}</span>}
                    </span>
                  </div>
                );
              })}
            </div>}
      </div>
    </div>
  );
}

/* ── Onglet 4 : les notes internes ─────────────────────────────────────
   Lues et écrites par les bras droits, sur un rang strictement inférieur au leur : la
   route ne les envoie pas autrement (`notes: null`). Jamais ailleurs que dans ce dossier. */
function OngletNotes({ d, onFait }: { d: Dossier; onFait: () => void }) {
  const [ton, setTon] = useState<Ton>("neutre");
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  if (!d.notes) {
    return (
      <Vide>
        Les notes d&apos;un dossier ne se lisent et ne s&apos;écrivent que sur un rang <b>strictement inférieur</b> au tien :
        personne ne lit jamais celles qui le concernent.
      </Vide>
    );
  }

  const pret = texte.trim().length >= NOTE_MIN && !envoi;
  const ajouter = async () => {
    if (!pret) return;
    setEnvoi(true); setErreur("");
    try {
      const r = await fetch(`/api/admin/membre/${d.identite.id}/notes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ton, texte: texte.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErreur(j.error || "Refusé.");
      else { setTexte(""); setTon("neutre"); onFait(); }
    } catch { setErreur("Le site n'a pas répondu."); }
    setEnvoi(false);
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <Titre icone="edit">Ajouter une note</Titre>
        <div style={{ ...ligne, display: "block", padding: 13 }}>
          <span style={etiq}>Le ton</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 11 }}>
            {TONS.map((t) => {
              const m = TON_META[t.clef];
              const actif = ton === t.clef;
              return (
                <button key={t.clef} type="button" onClick={() => setTon(t.clef)}
                  style={{ ...choix(actif), display: "inline-flex", alignItems: "center", gap: 6,
                    ...(actif ? { borderColor: m.c, color: m.c, background: `color-mix(in srgb, ${m.c} 13%, transparent)` } : null) }}>
                  <Icon name={m.icone} size={13} />{t.libelle}
                </button>
              );
            })}
          </div>
          <span style={etiq}>La note</span>
          <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} maxLength={NOTE_MAX}
            placeholder="Ce qu'on retient de lui : un problème, un effort, un fait à garder en tête."
            style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", flex: "1 1 200px" }}>
              Signée de ton nom, datée, visible des seuls bras droits — jamais de lui. Elle ne se modifie pas : on complète d&apos;une note de plus.
            </span>
            <button onClick={ajouter} disabled={!pret}
              style={{ padding: "9px 17px", borderRadius: 9, border: "none", background: pret ? "var(--gn-action)" : "var(--bg-2)", color: pret ? "var(--gn-sur-action)" : "var(--text-muted)", fontWeight: 700, cursor: pret ? "pointer" : "not-allowed", fontSize: 13, fontFamily: "inherit" }}>
              {envoi ? "…" : "Ajouter la note"}
            </button>
          </div>
          {erreur && <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--red)" }}>{erreur}</div>}
        </div>
      </div>

      <div>
        <Titre icone="list" apres={d.notes.length ? `${d.notes.length}` : undefined}>Les notes</Titre>
        {d.notes.length === 0
          ? <Vide>Aucune note pour l&apos;instant.</Vide>
          : <div style={{ display: "grid", gap: 7 }}>
              {d.notes.map((n) => {
                const t = tonDe(n.ton);
                const m = TON_META[t];
                return (
                  <div key={n.id} style={{ ...ligne, alignItems: "flex-start", borderLeft: `3px solid ${m.c}` }}>
                    <span style={{ flex: "1 1 auto", minWidth: 0 }}>
                      <span style={{ ...pastille(m.c), marginBottom: 5 }}><Icon name={m.icone} size={11} />{TONS.find((x) => x.clef === t)?.libelle}</span>
                      <span style={{ display: "block", color: "var(--text)", whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.5 }}>{n.texte}</span>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                        par {n.auteur} · {jour(n.date)} à {new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>}
      </div>
    </div>
  );
}

/** Un choix parmi des pastilles (un rôle, un rang, un ton) — le bouton de rôle d'avant. */
const choix = (actif: boolean): React.CSSProperties => ({
  fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
  border: `1px solid ${actif ? "var(--gn-accent)" : "var(--border)"}`,
  background: actif ? "rgba(var(--gn-lueur-rgb),.14)" : "var(--bg-2)",
  color: actif ? "var(--gn-accent)" : "var(--text-muted)",
});

const etiq: React.CSSProperties = { display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: .9, color: "var(--text-muted)", marginBottom: 6 };
