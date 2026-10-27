"use client";
import { useEffect, useMemo, useState } from "react";
import { ClassLogo } from "@/components/ClassLogo";
import { VgSelect } from "@/components/VgSelect";
import { Icon, type IconName } from "@/components/Icon";
import { EtatMesures, chiffresEnClair, conditionsEnClair } from "@/components/staff/MesuresStuff";
import { canAccessGuild } from "@/config/roles";
import { ROLE_LIBELLE, type EtatStuff, type Mesures, type RoleMesure } from "@/lib/mesures";
import type { Role } from "@prisma/client";

/**
 * MEMBRES & BUILDS — la section « Membres » du tableau de bord des bras droits (/staff).
 *
 * C'était la page /guildviewer : la même liste, les mêmes cartes, les mêmes filtres. Elle
 * est devenue une section de /staff le 2026-10-21 (SPEC-INFORMATION-GUILDE §3, Maxime :
 * « tout en un pour éviter les multiples pages ») ; /guildviewer y redirige avec sa
 * requête, et les alertes qui ouvraient un dossier (?dossier=) l'ouvrent toujours.
 *
 * Le dossier n'est plus monté ici : c'est la page qui le porte, pour qu'une ligne du
 * suivi, une absence ou la file l'ouvrent aussi. On ne fait que le demander (`onDossier`).
 *
 * LA LISTE EST CELLE DE LA GUILDE. Les comptes hors guilde — un candidat, quelqu'un
 * sorti de la guilde ou exclu — se rangent à part, repliés : « retirer de la guilde »
 * doit faire disparaître quelqu'un de la liste, pas le faire glisser en bas sous une
 * pastille Recrue. Leur dossier reste à un clic : c'est de là qu'on les fait revenir.
 *
 * LES AMIS ONT LEUR CATÉGORIE, à part elle aussi et repliée (SPEC-INFORMATION-GUILDE §9,
 * Maxime : « avoir la possibilité de connaître leurs stuffs mais uniquement dans la page
 * Membres & Stuffs dans une catégorie spécifique (hors guilde) »). Un ami porte le rôle
 * Discord Friend sans être de la guilde : la route les renvoie à part (`amis`), et ils ne
 * comptent dans rien — ni les cartes chiffrées, ni les filtres de rang. Leurs persos,
 * stuffs et mesures se lisent comme ceux d'un membre ; pas de dossier, donc ni notes ni
 * gestes de rang.
 */

type Gear = { id: string; name: string; mode: string; weaponRarity?: string; hp?: number; attack?: number; defense?: number; critRate?: number; etat: EtatStuff; role: RoleMesure; mesures: Mesures | null };
type Spec = { id: string; type: string; score: number };
type Char = { id: string; name: string; class: string; level: number; prestige: number; isMain: boolean; gearProfiles: Gear[]; specializations: Spec[] };
type Member = { id: string; username: string; avatar?: string | null; role: string; isActive: boolean; cacheLe: string | null; lastSeenAt: string | null; characters: Char[]; _count: { absences: number } };
/** Un ami, tel que la route le renvoie : rien de ce qui ferait un dossier. */
type Ami = { id: string; username: string; avatar?: string | null; lastSeenAt: string | null; characters: Char[] };
/* La carte d'un ami est celle d'un membre, lue sans rang ni dossier (`ami` de CarteMembre). */
const commeCompte = (a: Ami): Member => ({ ...a, role: "RECRUE", isActive: true, cacheLe: null, _count: { absences: 0 } });

export const ROLE_META: Record<string, { icon: IconName; label: string; color: string }> = {
  DIRECTION: { icon: "shield", label: "Direction", color: "var(--red)" },
  VANGUARD: { icon: "crown", label: "Vanguard", color: "var(--gold)" },
  GENERAL: { icon: "compass", label: "Général", color: "var(--gn-accent)" },
  OFFICIER: { icon: "flame", label: "Officier", color: "var(--gn-accent)" },
  VETERAN: { icon: "clipboard", label: "Vétéran", color: "var(--blue)" },
  GUARD: { icon: "sword-cross", label: "Guard", color: "var(--blue)" },
  RECRUE: { icon: "sprout", label: "Recrue", color: "var(--text-muted)" },
};
const RANK_BADGE: Record<string, string> = { DIRECTION: "fondateur", VANGUARD: "fondateur", GENERAL: "brasdroit", OFFICIER: "brasdroit", VETERAN: "guilde", GUARD: "guilde", RECRUE: "public" };
const RANK_ORDER = ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER", "VETERAN", "GUARD"];
const rankIdx = (role: string) => { const i = RANK_ORDER.indexOf(role); return i === -1 ? 99 : i; };
/* La teinte suit le RÔLE du stuff, celui qu'affiche la pastille : par le `mode` de la
   base, un « Hybride » d'Arcaniste (qui ne tanke pas, donc DPS) sortait violet à côté
   d'un DPS doré, deux couleurs pour un même mot. */
const roleColor = (r: RoleMesure) => (r === "tank" ? "var(--blue)" : r === "offtank" ? "var(--purple)" : "var(--gn-accent)");
const RARITY_FR: Record<string, string> = { COMMUN: "Commun", RARE: "Rare", EPIQUE: "Épique", LEGENDAIRE: "Légendaire", PREMYTHIQUE: "Pré-myth.", MYTHIQUE: "Mythique" };
const kfmt = (n?: number) => { const v = n || 0; return v >= 1e6 ? (v / 1e6).toFixed(1).replace(".0", "") + "M" : v >= 1e3 ? (v / 1e3).toFixed(1).replace(".0", "") + "k" : String(v); };
const SPEC_FR: Record<string, string> = { PVE: "PvE", PVP_BOSS: "PvP/Boss", CHAMBRES_SECRETES: "Chambres S." };

/* « Inactif », c'est 30 jours sans venir sur le site — la règle de la file (lib/recap.ts).
   `isActive`, qui allumait la pastille, ne passe à faux qu'au kick ou au ban : tout le
   monde y était « actif », y compris qui n'était plus venu depuis l'été. */
const INACTIF_APRES_MS = 30 * 86_400_000;
const inactif = (u: Member) => !u.lastSeenAt || Date.now() - Date.parse(u.lastSeenAt) > INACTIF_APRES_MS;
/** « auj. », « hier », « 12 j », « 3 mois », « jamais » : ce qui tient dans une pastille. */
function derniereVisite(iso: string | null): string {
  if (!iso) return "jamais";
  const j = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return j <= 0 ? "auj." : j === 1 ? "hier" : j < 60 ? `${j} j` : `${Math.floor(j / 30)} mois`;
}
const sansBuild = (c: Char) => c.gearProfiles.every((g) => g.etat === "vide");
const deLaGuilde = (u: Member) => canAccessGuild(u.role as Role);

/** Les cartes chiffrées en tête d'une section (celles du GuildViewer). */
export function StatCartes({ liste }: { liste: { v: number; l: string; c: string; icon: IconName }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))", gap: 12, marginBottom: 22 }}>
      {liste.map((s) => (
        <div key={s.l} className="gv-stat glass-card" style={{ padding: "15px 17px", position: "relative", overflow: "hidden" }}>
          <span style={{ position: "absolute", right: -10, top: -14, fontSize: 50, opacity: 0.07, pointerEvents: "none" }}><Icon name={s.icon} size={50} /></span>
          <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: s.c }} />
          <div className="font-heading" style={{ fontSize: 30, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>{s.l}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * `filtre` : celui de l'adresse (`?filtre=inactifs`, la ligne « membres sans visite » de
 * la file y mène). `version` : la page l'incrémente après un geste du dossier, et la
 * liste se relit — le rang ou la pastille « caché » ont pu bouger.
 */
export function MembresBuilds({ filtre, onFiltre, onDossier, version }: {
  filtre: string | null; onFiltre: (f: string | null) => void; onDossier: (id: string) => void; version: number;
}) {
  const onlyInactifs = filtre === "inactifs";
  const [members, setMembers] = useState<Member[] | null>(null);
  const [amis, setAmis] = useState<Ami[]>([]);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState("");
  const [onlyNoBuild, setOnlyNoBuild] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");
  const [histUser, setHistUser] = useState<string | null>(null);
  const [hist, setHist] = useState<{ id: string; createdAt: string }[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const openHist = async (uid: string) => {
    if (histUser === uid) { setHistUser(null); return; }
    setHistUser(uid); setHist([]); setHistLoading(true);
    try { const r = await fetch(`/api/builder-state?user=${uid}&list=1`); if (r.ok) { const j = await r.json(); setHist(j.snapshots || []); } } catch { /* noop */ }
    setHistLoading(false);
  };

  useEffect(() => {
    let vivant = true;
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { comptes: Member[]; amis: Ami[] }) => { if (vivant) { setMembers(j.comptes); setAmis(j.amis ?? []); } })
      .catch(() => { if (vivant) setErr(true); });
    return () => { vivant = false; };
  }, [version]);

  const stats = useMemo(() => {
    // Les compteurs portent sur la GUILDE, comme la file et le suivi.
    const m = (members ?? []).filter(deLaGuilde);
    const chars = m.flatMap((u) => u.characters);
    const builds = chars.reduce((s, c) => s + c.gearProfiles.filter((g) => g.etat !== "vide").length, 0);
    const charsNoBuild = chars.filter(sansBuild).length;
    const membersNoChar = m.filter((u) => u.characters.length === 0).length;
    return { members: m.length, active: m.filter((u) => !inactif(u)).length, chars: chars.length, builds, charsNoBuild, membersNoChar };
  }, [members]);

  const { guilde, horsGuilde } = useMemo(() => {
    let m = members ?? [];
    const needle = q.trim().toLowerCase();
    if (needle) m = m.filter((u) => u.username.toLowerCase().includes(needle) || u.characters.some((c) => c.name.toLowerCase().includes(needle) || c.class.toLowerCase().includes(needle)));
    if (onlyNoBuild) m = m.filter((u) => u.characters.length === 0 || u.characters.some(sansBuild));
    if (onlyInactifs) m = m.filter((u) => deLaGuilde(u) && inactif(u));
    if (roleFilter) m = m.filter((u) => u.role === roleFilter);
    const tri = (a: Member, b: Member) => rankIdx(a.role) - rankIdx(b.role) || a.username.localeCompare(b.username);
    return { guilde: m.filter(deLaGuilde).sort(tri), horsGuilde: m.filter((u) => !deLaGuilde(u)).sort(tri) };
  }, [members, q, onlyNoBuild, onlyInactifs, roleFilter]);

  /* Les amis suivent la recherche et « À accompagner » ; un filtre de rang ou « Inactifs »
     parle de la guilde, et les retire — comme il retire « Hors guilde ». */
  const amisVus = useMemo(() => {
    if (roleFilter || onlyInactifs) return [];
    const needle = q.trim().toLowerCase();
    let a = amis.map(commeCompte);
    if (needle) a = a.filter((u) => u.username.toLowerCase().includes(needle) || u.characters.some((c) => c.name.toLowerCase().includes(needle) || c.class.toLowerCase().includes(needle)));
    if (onlyNoBuild) a = a.filter((u) => u.characters.length === 0 || u.characters.some(sansBuild));
    return a.sort((x, y) => x.username.localeCompare(y.username));
  }, [amis, q, onlyNoBuild, onlyInactifs, roleFilter]);

  const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 13px", color: "var(--text)", fontSize: 14 };
  const filtreCase = (actif: boolean, onChange: (v: boolean) => void, ic: IconName, label: string) => (
    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: actif ? "var(--gn-accent)" : "var(--text-muted)", cursor: "pointer", background: "var(--bg-3)", border: `1px solid ${actif ? "var(--gn-accent)" : "var(--border)"}`, borderRadius: 9, padding: "9px 14px", transition: "border-color .15s, color .15s" }}>
      <input type="checkbox" checked={actif} onChange={(e) => onChange(e.target.checked)} /><Icon name={ic} size={14} />{label}
    </label>
  );

  if (err) return <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />La liste des membres n&apos;a pas pu être chargée.</div>;
  if (!members) return <div className="gn-attente" aria-hidden="true" />;

  const carte = (u: Member, ami = false) => (
    <CarteMembre key={u.id} u={u} ami={ami} onDossier={onDossier} histOuvert={histUser === u.id} onHist={() => openHist(u.id)}
      hist={histUser === u.id ? { liste: hist, chargement: histLoading } : null} />
  );

  return (
    <>
      <StatCartes liste={[
        { v: stats.members, l: "membres", c: "var(--text)", icon: "users" },
        { v: stats.active, l: "actifs (30 j)", c: "var(--green)", icon: "user-check" },
        { v: stats.chars, l: "personnages", c: "var(--gn-accent)", icon: "users" },
        { v: stats.builds, l: "stuffs montés", c: "var(--blue)", icon: "sword" },
        { v: stats.charsNoBuild, l: "persos sans build", c: stats.charsNoBuild ? "var(--red)" : "var(--green)", icon: "shield" },
        { v: stats.membersNoChar, l: "membres sans perso", c: stats.membersNoChar ? "var(--gold)" : "var(--green)", icon: "user-plus" },
      ]} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <input style={{ ...inp, flex: 1, minWidth: 220 }} placeholder="Rechercher un membre, un perso, une classe…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ minWidth: 190 }}><VgSelect value={roleFilter} onChange={setRoleFilter} options={[{ value: "", label: "Tous les rangs" }, ...[...RANK_ORDER, "RECRUE"].map((role) => ({ value: role, label: ROLE_META[role]?.label ?? role }))]} /></div>
        {filtreCase(onlyNoBuild, setOnlyNoBuild, "alert", "À accompagner (sans build)")}
        {filtreCase(onlyInactifs, (v) => onFiltre(v ? "inactifs" : null), "moon", "Inactifs (30 j)")}
      </div>

      {guilde.length === 0
        ? <div className="glass-card" style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>{roleFilter === "RECRUE" ? "Aucun membre de la guilde à ce rang — les comptes hors guilde sont plus bas." : "Aucun membre ne correspond."}</div>
        : guilde.map((u) => carte(u))}

      {/* HORS GUILDE, repliés : candidats, comptes sortis ou exclus. Ils ne comptent
          nulle part, mais leur dossier — et le geste qui les ferait revenir — reste là. */}
      {horsGuilde.length > 0 && !onlyInactifs && (
        <details className="gn-hors-guilde">
          <summary>
            <Icon name="chevron-right" size={14} className="gn-hors-guilde-chevron" />
            <span className="font-heading">Hors guilde</span>
            <span className="gn-hors-guilde-n">{horsGuilde.length}</span>
            <span className="gn-hors-guilde-sous">Candidats, comptes sortis de la guilde ou exclus — ils ne comptent nulle part.</span>
          </summary>
          <div className="gn-hors-guilde-liste">{horsGuilde.map((u) => carte(u))}</div>
        </details>
      )}

      {/* LES AMIS, repliés, sous les comptes hors guilde : le rôle Discord Friend leur ouvre
          les Astuces et l'AirBuilder, rien de la guilde. On lit leurs persos et leurs
          stuffs, sans dossier — le réglage du rôle est dans Outils, « Accès des amis ». */}
      {amisVus.length > 0 && (
        <details className="gn-hors-guilde">
          <summary>
            <Icon name="chevron-right" size={14} className="gn-hors-guilde-chevron" />
            <span className="font-heading">Amis (hors guilde)</span>
            <span className="gn-hors-guilde-n">{amisVus.length}</span>
            <span className="gn-hors-guilde-sous">Le rôle Discord Friend : les Astuces et l&apos;AirBuilder, rien de la guilde — ils ne comptent nulle part.</span>
          </summary>
          <div className="gn-hors-guilde-liste">{amisVus.map((u) => carte(u, true))}</div>
        </details>
      )}

      <style>{`
        .gv-stat{transition:transform .18s, box-shadow .18s}
        .gv-char{transition:border-color .15s, transform .12s, background .15s}
        .gv-char:hover{border-color:var(--gn-accent);transform:translateX(2px);background:var(--bg-4)}
      `}</style>
    </>
  );
}

/** Un ami n'a pas de rang : sa pastille dit ce qu'il est, avec la teinte d'un compte hors guilde. */
const AMI_META: { icon: IconName; label: string; color: string } = { icon: "heart", label: "Ami", color: "var(--text-muted)" };

/** `ami` : la carte d'un ami (rôle Friend) — sans dossier ni absences, qui sont la guilde. */
function CarteMembre({ u, ami = false, onDossier, histOuvert, onHist, hist }: {
  u: Member; ami?: boolean; onDossier: (id: string) => void; histOuvert: boolean; onHist: () => void;
  hist: { liste: { id: string; createdAt: string }[]; chargement: boolean } | null;
}) {
  const r = ami ? AMI_META : (ROLE_META[u.role] ?? ROLE_META.RECRUE);
  const noChar = u.characters.length === 0;
  const absent = inactif(u);
  const miniStat = (ic: IconName, n: number | string, l: string, c: string, title?: string) => (
    <div title={title} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 50, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "5px 9px" }}>
      <span className="font-heading" style={{ fontSize: 15, fontWeight: 700, color: c, lineHeight: 1 }}>{n}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-muted)", marginTop: 2, whiteSpace: "nowrap" }}><Icon name={ic} size={11} />{l}</span>
    </div>
  );
  return (
    <div className="gv-member glass-card fx-card" style={{ padding: 0, marginBottom: 13, overflow: "hidden", borderLeft: `3px solid ${r.color}` }}>
      {/* En-tête membre */}
      <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 17px", flexWrap: "wrap", background: `linear-gradient(90deg, color-mix(in srgb, ${r.color} 9%, transparent), transparent 55%)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/site/ranks/${RANK_BADGE[u.role] ?? "public"}.webp`} alt={r.label} title={r.label} style={{ width: 46, height: 46, objectFit: "contain", flexShrink: 0, filter: `drop-shadow(0 0 7px color-mix(in srgb, ${r.color} 55%, transparent))` }} />
        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span className="font-heading" style={{ fontWeight: 700, fontSize: 17 }}>{u.username}</span>
            <span title={absent ? "Pas venu sur le site depuis plus de 30 jours" : "Venu sur le site ces 30 derniers jours"} style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: absent ? "var(--text-muted)" : "var(--green)", boxShadow: absent ? "none" : "0 0 7px var(--green)" }} />
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
            <span style={{ display: "inline-block", fontSize: 11.5, fontWeight: 700, color: r.color, background: `color-mix(in srgb, ${r.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${r.color} 40%, transparent)`, borderRadius: 20, padding: "2px 11px", textTransform: "uppercase", letterSpacing: 0.6 }}><Icon name={r.icon} size={12} style={{ display: "inline-block", marginRight: 5 }} />{r.label}</span>
            {/* Caché par un bras droit : il ne figure plus dans Information Guilde. La
                pastille de rang, en gris — un état, pas un rang. */}
            {u.cacheLe && <span className="gn-pastille-etat" title={`Caché d'Information Guilde et du recensement depuis le ${new Date(u.cacheLe).toLocaleDateString("fr-FR")} — « Montrer de nouveau » dans son dossier`}><Icon name="ghost" size={12} />Caché</span>}
            {!u.isActive && <span className="gn-pastille-etat" title="Sorti de la guilde, exclu ou banni depuis le site">Parti</span>}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* La dernière visite : `lastSeenAt`, des visites du SITE, pas du jeu. */}
          {miniStat("clock", derniereVisite(u.lastSeenAt), "visite", absent ? "var(--gold)" : "var(--text)",
            u.lastSeenAt ? `Dernière visite le ${new Date(u.lastSeenAt).toLocaleDateString("fr-FR")}` : "Jamais venu sur le site")}
          {miniStat("users", u.characters.length, "perso", noChar ? "var(--gold)" : "var(--text)")}
          {!ami && miniStat("ban", u._count.absences, "abs.", u._count.absences ? "var(--gold)" : "var(--text-muted)")}
          {/* Le dossier : persos, absences, décisions, notes — et les gestes. Pas pour un
              ami : il n'est pas de la guilde, il n'y a ni rang à changer ni note à tenir. */}
          {!ami && (
            <button onClick={() => onDossier(u.id)} title={`Ouvrir le dossier de ${u.username} — ses persos, ses absences, les décisions prises et les notes`}
              style={{ fontSize: 12, fontWeight: 700, cursor: "pointer", color: "var(--text)", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 11px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "inherit" }}>
              <Icon name="scroll" size={14} />Dossier
            </button>
          )}
          <button onClick={onHist} title="Historique des builds — 10 dernières versions sauvegardées" style={{ fontSize: 12, fontWeight: 700, cursor: "pointer", color: histOuvert ? "var(--gn-sur-action)" : "var(--text-muted)", background: histOuvert ? "var(--gn-action)" : "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 11px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="clock" size={14} />Versions{histOuvert ? " ▲" : ""}</button>
        </div>
      </div>
      {hist && (
        <div style={{ margin: "0 17px 13px", padding: "11px 13px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10 }}>
          <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 8 }}><Icon name="clock" size={13} />Historique des builds</div>
          {hist.chargement ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Chargement…</div>
            : hist.liste.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Aucune version archivée — les versions se créent automatiquement quand le membre édite son build.</div>
            : <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{hist.liste.map((s, i) => (
                <a key={s.id} href={`/builder/${u.id}?v=${s.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, fontWeight: 600, color: i === 0 ? "var(--gn-accent)" : "var(--text)", background: "var(--bg-2)", border: `1px solid ${i === 0 ? "var(--gn-accent)" : "var(--border)"}`, borderRadius: 7, padding: "5px 11px", textDecoration: "none", whiteSpace: "nowrap" }}>{i === 0 ? "● Actuel · " : ""}{new Date(s.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</a>
              ))}</div>}
        </div>
      )}

      {/* Personnages */}
      {noChar ? (
        <div style={{ margin: "0 17px 15px", padding: "11px 14px", background: "rgba(255,210,74,.06)", border: "1px dashed var(--gold)", borderRadius: 10, fontSize: 12.5, color: "var(--gold)" }}><Icon name="alert" size={14} style={{ marginRight: 6 }} />Aucun personnage déclaré — à inviter à compléter son profil via le Builder.</div>
      ) : (
        <div style={{ display: "grid", gap: 7, padding: "0 17px 15px" }}>
          {u.characters.map((c) => {
            // Un stuff vide n'est pas un build : chaque perso naît avec trois.
            const montes = c.gearProfiles.filter((g) => g.etat !== "vide");
            const manquent = montes.filter((g) => g.etat === "a-renseigner").length;
            const vieilles = montes.filter((g) => g.etat === "a-remesurer").length;
            return (
              <div key={c.id} className="gv-char" style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11, padding: "9px 13px" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--border)" }}><ClassLogo name={c.class} size={23} /></div>
                <div style={{ minWidth: 130 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name} {c.isMain && <span title="Personnage principal" style={{ display: "inline-flex", color: "var(--gold)" }}><Icon name="star" size={12} /></span>}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.class} · Niv {c.level} · P{c.prestige}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginLeft: "auto" }}>
                  {montes.length === 0
                    ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--red)", background: "rgba(248,113,113,.1)", border: "1px solid var(--red)", borderRadius: 6, padding: "2px 9px" }}>aucun build</span>
                    : montes.map((g) => {
                        const m = g.mesures;
                        const chiffres = m ? chiffresEnClair(c.class, g.role, m.v) : "";
                        const titre = [
                          g.name,
                          chiffres || "mesures à renseigner dans l'AirBuilder",
                          m && g.etat !== "a-renseigner" ? conditionsEnClair(m) : "",
                          `PV ${kfmt(g.hp)} · Atq ${kfmt(g.attack)} · Déf ${kfmt(g.defense)}`,
                        ].filter(Boolean).join(" — ");
                        return (
                          <span key={g.id} title={titre} style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 6, border: `1px solid ${roleColor(g.role)}`, background: `color-mix(in srgb, ${roleColor(g.role)} 13%, transparent)`, color: roleColor(g.role), whiteSpace: "nowrap" }}>
                            {ROLE_LIBELLE[g.role]}{chiffres ? ` · ${chiffres}` : g.weaponRarity ? ` · ${RARITY_FR[g.weaponRarity] ?? g.weaponRarity}` : ""}
                          </span>
                        );
                      })}
                  {/* Le témoin des mesures : obligatoires par stuff, c'est ce que
                      le staff compare pour composer. */}
                  {manquent > 0 && <span title={`${manquent} stuff${manquent > 1 ? "s" : ""} sans dégâts ni PV mesurés`}><EtatMesures etat="a-renseigner" /></span>}
                  {manquent === 0 && vieilles > 0 && <EtatMesures etat="a-remesurer" />}
                  {c.specializations.length > 0 && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--purple)", background: "rgba(199,125,255,.1)", border: "1px solid color-mix(in srgb, var(--purple) 45%, transparent)", borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap" }}>{c.specializations.map((s) => `${SPEC_FR[s.type] ?? s.type} ${s.score}%`).join(" · ")}</span>
                  )}
                  {montes.length > 0 && <a className="vg-touch" href={`/builder/${u.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--gn-accent)", background: "rgba(var(--gn-lueur-rgb),.1)", border: "1px solid var(--gn-accent)", borderRadius: 6, padding: "3px 10px", textDecoration: "none", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="sword" size={12} />AirBuilder ↗</a>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
