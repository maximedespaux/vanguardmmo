"use client";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/Icon";
import { ClassLogo } from "@/components/ClassLogo";

/**
 * LE DOSSIER D'UN MEMBRE — et les gestes qu'on peut poser sur lui.
 *
 * Avant : pour décider du sort de quelqu'un, il fallait ouvrir le GuildViewer
 * (ses persos), Mes absences (les siennes), la boutique (ce qu'il a fourni) et
 * l'AirGuild (son coffre). Quatre pages, aucune ne montrant la même personne au
 * même moment. On décidait donc de mémoire.
 *
 * Ici tout tient dans un panneau, en quatre onglets — l'empilement complet
 * ferait deux mètres de défilement sur téléphone.
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
type Perso = { id: string; name: string; class: string; level: number; prestige: number; isMain: boolean; stuffs: { id: string; name: string; mode: string; hp: number; attack: number; defense: number }[]; specialisations: { type: string; score: number }[] };
type Abs = { id: string; debut: string; fin: string; motif: string | null; statut: string; enCours: boolean; jours: number };
type Decision = { id: string; action: string; detail: string | null; motif: string; auteur: string; statut: string; resultat: string | null; date: string };
type Dossier = {
  identite: { id: string; discordId: string; username: string; avatar: string | null; role: string; isActive: boolean; pseudoJeu: string | null; lastSeenAt: string | null; inactifDepuis: number | null; inscritDepuis: number | null; createdAt: string };
  peutModerer: boolean;
  rolesDiscord: Role[];
  personnages: Perso[];
  absences: Abs[];
  economie: { ventes: { id: string; item: string; quantite: number; pour: string; perins: number; remis: boolean; date: string }[]; demandes: { id: string; item: string | null; quantite: number; statut: string; date: string }[]; contributions: { id: string; quete: string; quantite: number; statut: string; date: string }[]; partsAcquises: number };
  coffre: { nom: string | null; objets: number; tous: { nom: string; tenuPar: string | null }[] };
  decisions: Decision[];
  compteurs: { absences: number; versions: number; contributions: number };
};

/** Les cinq gestes, du plus doux au plus définitif — l'ordre est celui-là exprès. */
const GESTES: { clef: string; libelle: string; icone: IconName; couleur: string; explique: string; verbe: string }[] = [
  { clef: "coffre", libelle: "Ouvrir un coffre", icone: "key", couleur: "var(--green)", verbe: "Oui, ouvrir le coffre",
    explique: "Il pourra déposer et retirer dans ce coffre. Il continue de voir tous les autres en lecture." },
  { clef: "role", libelle: "Retirer un rôle", icone: "tag", couleur: "var(--gold)", verbe: "Oui, retirer ce rôle",
    explique: "Il perd une casquette et ce qu'elle ouvre. Il reste membre de la guilde et du Discord." },
  { clef: "guilde", libelle: "Retirer de la guilde", icone: "medal", couleur: "var(--orange)", verbe: "Oui, le sortir de la guilde",
    explique: "Tous ses rangs sautent d'un coup : il n'est plus de la guilde, mais il reste sur le Discord. C'est le départ à l'amiable." },
  { clef: "kick", libelle: "Exclure du Discord", icone: "arrow-right", couleur: "var(--red)", verbe: "Oui, l'exclure",
    explique: "Il sort du serveur. Il peut revenir si on lui redonne une invitation." },
  { clef: "ban", libelle: "Bannir", icone: "ban", couleur: "var(--red)", verbe: "Oui, bannir",
    explique: "Il sort du serveur et ne peut plus y revenir. Ses ventes et son historique restent au dossier." },
];

const ACTION_LABEL: Record<string, string> = { coffre: "Coffre ouvert", role: "Rôle retiré", guilde: "Sorti de la guilde", kick: "Exclu du Discord", ban: "Banni" };
const STATUT_ABS: Record<string, { l: string; c: string }> = { APPROVED: { l: "acceptée", c: "var(--green)" }, PENDING: { l: "en attente", c: "var(--gold)" }, REJECTED: { l: "refusée", c: "var(--red)" } };
const jour = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
const nb = (n: number) => n.toLocaleString("fr-FR");
const ONGLETS = [["membre", "Le membre", "user"], ["absences", "Absences", "calendar"], ["economie", "Économie", "coins"], ["decisions", "Décisions", "scroll"]] as const;

export function DossierMembre({ userId, onFermer, onChange }: { userId: string; onFermer: () => void; onChange?: () => void }) {
  const [d, setD] = useState<Dossier | null>(null);
  const [err, setErr] = useState("");
  const [onglet, setOnglet] = useState<(typeof ONGLETS)[number][0]>("membre");

  const charger = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/membre/${userId}`);
      if (!r.ok) { setErr((await r.json().catch(() => ({}))).error || "Chargement impossible."); return; }
      setD(await r.json());
    } catch { setErr("Chargement impossible."); }
  }, [userId]);

  useEffect(() => { charger(); }, [charger]);
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
        <div style={{ padding: "16px 18px 0", borderBottom: "1px solid var(--border)", background: "linear-gradient(180deg, rgba(255,140,26,.07), transparent)" }}>
          <div style={{ display: "flex", gap: 13, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <div className="font-heading" style={{ fontSize: 19, fontWeight: 700, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                {i?.username ?? "…"}
                {i && <span title={i.isActive ? "Actif" : "Inactif"} style={{ width: 9, height: 9, borderRadius: "50%", background: i.isActive ? "var(--green)" : "var(--text-muted)", boxShadow: i.isActive ? "0 0 8px var(--green)" : "none" }} />}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>
                {i?.pseudoJeu ? <>En jeu : <b style={{ color: "var(--gold)" }}>{i.pseudoJeu}</b> · </> : null}
                {i ? <>Rang {i.role.charAt(0) + i.role.slice(1).toLowerCase()}</> : null}
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
              <Fait icone="vault" val={d.coffre.nom ?? "aucun"} lab="coffre" />
            </div>
          )}

          {/* Les quatre onglets doivent tenir d'un bloc, y compris sur 375 px :
              le dernier — Décisions — porte les gestes de modération, et un
              onglet qu'il faut deviner en faisant défiler n'est pas un onglet.
              Sous 430 px on sacrifie donc les icônes, pas les libellés. */}
          <div className="dm-onglets" style={{ display: "flex", gap: 3, marginTop: 13, overflowX: "auto" }}>
            {ONGLETS.map(([clef, lab, ic]) => (
              <button key={clef} onClick={() => setOnglet(clef)}
                style={{ borderBottom: `2px solid ${onglet === clef ? "var(--orange)" : "transparent"}`,
                  color: onglet === clef ? "var(--orange)" : "var(--text-muted)" }}>
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
          {d && onglet === "economie" && <OngletEconomie d={d} />}
          {d && onglet === "decisions" && <OngletDecisions d={d} onFait={() => { charger(); onChange?.(); }} />}
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
      {apres != null && <span style={{ marginLeft: "auto", color: "var(--orange)", letterSpacing: 0 }}>{apres}</span>}
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
                    {p.stuffs.length === 0
                      ? <span style={{ fontSize: 11, color: "var(--red)" }}>aucun stuff</span>
                      : p.stuffs.map((s) => <span key={s.id} title={`${s.name} — PV ${nb(s.hp)} · Atq ${nb(s.attack)} · Déf ${nb(s.defense)}`} style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)", color: "var(--text-muted)" }}>{s.mode}</span>)}
                  </span>
                </div>
              ))}
            </div>}
      </div>

      <div>
        <Titre icone="vault">Coffre AirGuild</Titre>
        {d.coffre.nom
          ? <div style={ligne}><Icon name="vault" size={16} style={{ color: "var(--green)" }} />Il tient <b>{d.coffre.nom}</b><span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>{nb(d.coffre.objets)} objets</span></div>
          : <Vide>Aucun coffre ne lui est attribué : il consulte tous les coffres, mais n&apos;écrit dans aucun. Ça s&apos;ouvre dans l&apos;onglet Décisions.</Vide>}
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

/* ── Onglet 3 : ce qu'il apporte ──────────────────────────────────────── */
function OngletEconomie({ d }: { d: Dossier }) {
  const e = d.economie;
  const gagne = e.ventes.filter((v) => v.remis).reduce((s, v) => s + v.perins, 0);
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <Fait icone="coins" val={nb(gagne)} lab="périns gagnés" />
        <Fait icone="package" val={String(e.ventes.length)} lab="ventes" />
        <Fait icone="sprout" val={nb(e.partsAcquises)} lab="parts de cagnotte" />
        <Fait icone="basket" val={String(e.demandes.length)} lab="demandes" />
      </div>

      <div>
        <Titre icone="package">Ce qu&apos;il a fourni</Titre>
        {e.ventes.length === 0 ? <Vide>Aucune vente retenue.</Vide>
          : <div style={{ display: "grid", gap: 6 }}>
              {e.ventes.slice(0, 12).map((v) => (
                <div key={v.id} style={ligne}>
                  <span style={{ minWidth: 130, flex: "1 1 auto" }}><b>{v.item}</b>{v.quantite > 1 ? ` ×${v.quantite}` : ""}<span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>pour {v.pour || "?"} · {jour(v.date)}</span></span>
                  <span style={{ marginLeft: "auto", fontWeight: 700, color: v.remis ? "var(--gold)" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{nb(v.perins)}</span>
                  <span style={{ fontSize: 11, color: v.remis ? "var(--green)" : "var(--text-muted)" }}>{v.remis ? "remis" : "en cours"}</span>
                </div>
              ))}
            </div>}
      </div>

      <div>
        <Titre icone="sprout">Ce qu&apos;il a farmé pour la guilde</Titre>
        {e.contributions.length === 0 ? <Vide>Aucune contribution à une commande partagée.</Vide>
          : <div style={{ display: "grid", gap: 6 }}>
              {e.contributions.slice(0, 12).map((c) => (
                <div key={c.id} style={ligne}>
                  <span style={{ flex: "1 1 auto", minWidth: 130 }}><b>{c.quete || "quête"}</b><span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{jour(c.date)}</span></span>
                  <span style={{ marginLeft: "auto" }}>×{c.quantite}</span>
                  <span style={{ fontSize: 11, color: c.statut === "confirme" ? "var(--green)" : "var(--gold)" }}>{c.statut === "confirme" ? "confirmé" : "annoncé"}</span>
                </div>
              ))}
            </div>}
      </div>

      <div>
        <Titre icone="basket">Ce qu&apos;il a demandé</Titre>
        {e.demandes.length === 0 ? <Vide>Aucune demande passée à la boutique.</Vide>
          : <div style={{ display: "grid", gap: 6 }}>
              {e.demandes.slice(0, 12).map((r) => (
                <div key={r.id} style={ligne}>
                  <span style={{ flex: "1 1 auto", minWidth: 130 }}><b>{r.item || "objet sur mesure"}</b>{r.quantite > 1 ? ` ×${r.quantite}` : ""}<span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{jour(r.date)}</span></span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>{r.statut.toLowerCase()}</span>
                </div>
              ))}
            </div>}
      </div>
    </div>
  );
}

/* ── Onglet 4 : ce qui a été décidé, et ce qu'on peut décider ─────────── */
function OngletDecisions({ d, onFait }: { d: Dossier; onFait: () => void }) {
  const [geste, setGeste] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const [roleId, setRoleId] = useState("");
  const [coffre, setCoffre] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; msg: string } | null>(null);

  const g = GESTES.find((x) => x.clef === geste);
  const retirables = d.rolesDiscord.filter((r) => !r.managed);
  const libres = d.coffre.tous.filter((c) => !c.tenuPar || c.tenuPar === d.identite.discordId);
  const manque = geste === "role" ? !roleId : geste === "coffre" ? !coffre : false;
  const pret = !!g && motif.trim().length >= 5 && !manque && !envoi;

  const fermer = () => { setGeste(null); setMotif(""); setRoleId(""); setCoffre(""); };

  const envoyer = async () => {
    if (!pret) return;
    setEnvoi(true); setRetour(null);
    try {
      const r = await fetch("/api/admin/moderation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: geste, userId: d.identite.id, motif: motif.trim(), roleId: roleId || undefined, coffre: coffre || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setRetour({ ok: false, msg: j.error || "Refusé." }); setEnvoi(false); return; }
      setRetour({ ok: true, msg: j.message || "C'est enregistré." });
      fermer(); onFait();
    } catch { setRetour({ ok: false, msg: "Le site n'a pas répondu." }); }
    setEnvoi(false);
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {d.peutModerer ? (
        <div>
          <Titre icone="shield">Agir sur ce membre</Titre>

          {!geste ? (
            <>
              <div style={{ display: "grid", gap: 6 }}>
                {GESTES.map((x) => {
                  const indispo = x.clef === "role" && retirables.length === 0 ? "Aucun rôle retirable connu"
                    : x.clef === "coffre" && libres.length === 0 ? "Tous les coffres sont déjà tenus" : null;
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
                      <button key={r.id} type="button" onClick={() => setRoleId(r.id)}
                        style={{ fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                          border: `1px solid ${roleId === r.id ? "var(--orange)" : "var(--border)"}`,
                          background: roleId === r.id ? "rgba(255,140,26,.14)" : "var(--bg-2)",
                          color: roleId === r.id ? "var(--orange)" : "var(--text-muted)" }}>{r.name}</button>
                    ))}
                  </div>
                </label>
              )}

              {geste === "coffre" && (
                <label style={{ display: "block", marginBottom: 12 }}>
                  <span style={etiq}>Quel coffre ?</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 132, overflowY: "auto" }}>
                    {libres.map((c) => (
                      <button key={c.nom} type="button" onClick={() => setCoffre(c.nom)}
                        style={{ fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                          border: `1px solid ${coffre === c.nom ? "var(--orange)" : "var(--border)"}`,
                          background: coffre === c.nom ? "rgba(255,140,26,.14)" : "var(--bg-2)",
                          color: coffre === c.nom ? "var(--orange)" : "var(--text-muted)" }}>{c.nom}</button>
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
                  Il part avec le geste dans le journal d&apos;audit de Discord, et il reste au dossier. {motif.trim().length < 5 ? "Encore trop court." : `${400 - motif.length} caractères restants.`}
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
      ) : (
        <Vide>
          Les gestes de modération sont réservés au rang <b style={{ color: "var(--gold)" }}>Vanguard</b>, et jamais sur quelqu&apos;un de rang égal ou supérieur au sien.
        </Vide>
      )}

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
                    </span>
                  </div>
                );
              })}
            </div>}
      </div>
    </div>
  );
}

const etiq: React.CSSProperties = { display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: .9, color: "var(--text-muted)", marginBottom: 6 };
