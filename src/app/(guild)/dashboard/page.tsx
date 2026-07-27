"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { canAccessAdmin } from "@/config/roles";
import { ClassLogo } from "@/components/ClassLogo";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { Progression } from "@/components/Progression";

type Prio = { level: "haute" | "moyenne" | "basse"; label: string; count: number; href: string };
type Deficit = { item: string; stock: number; target: number; manque: number };
type Data = {
  members: { total: number; active: number; inactive: number; roles: { role: string; count: number }[] };
  characters: { total: number; mains: number; secondaries: number; withoutBuild: number; classes: { classe: string; count: number }[] };
  builds: { total: number; withoutBuild: number };
  debts: { ongoing: number; repaid: number; toValidate: number; ongoingAmount: number; overdue: number; remaining: number };
  absences: { active: number; pending: number };
  coffre: { under: number; total: number; topDeficits: Deficit[] };
  candidatures: { pending: number; waiting: number; total: number };
  worldboss: { upcoming: number; next: string | null };
  priorities: Prio[];
};

const PRIO_COLOR = { haute: "var(--red)", moyenne: "var(--gold)", basse: "var(--text-muted)" } as const;
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function Stat({ value, label, color }: { value: React.ReactNode; label: string; color?: string }) {
  return (
    <div>
      <div className="font-heading" style={{ fontSize: 30, fontWeight: 700, color: color ?? "var(--text)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

// Carte de chiffres CLIQUABLE : elle mène directement à l'outil concerné.
// Avant, un bouton « + » dépliait un détail sur place — un clic pour voir, un autre
// pour aller à l'outil. La carte entière est désormais le lien : on va là où on peut
// agir (les dettes vers leur suivi, les membres vers leur fiche…).
function StatCard({ icon, title, summary, href }: { icon: IconName; title: string; summary: React.ReactNode; href: string }) {
  return (
    <Link href={href} className="dash-card fx-card dash-stat-link" style={{ position: "relative", display: "block", textDecoration: "none", color: "inherit" }}>
      <div className="font-heading" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
        <Icon name={icon} size={16} style={{ color: "var(--orange)" }} />{title}
        <Icon name="arrow-right" size={14} className="dash-stat-arrow" style={{ marginLeft: "auto", color: "var(--orange)" }} />
      </div>
      {summary}
    </Link>
  );
}

function GoLink({ href, label, show = true }: { href: string; label: string; show?: boolean }) {
  if (!show) return null;
  return <Link href={href} className="vg-btn" style={{ textDecoration: "none", marginTop: 4, fontSize: 12, padding: "8px 14px", alignSelf: "flex-start" }}>{label} →</Link>;
}

function Hub({ icon, title, metric, href, cta }: { icon: IconName; title: string; metric: React.ReactNode; href: string; cta: string }) {
  return (
    <div className="dash-card dash-hub fx-card" style={{ padding: 17, display: "flex", flexDirection: "column", gap: 5 }}>
      <div className="font-heading" style={{ fontSize: 17, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 9 }}><Icon name={icon} size={18} style={{ color: "var(--orange)" }} />{title}</div>
      <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{metric}</div>
      <Link href={href} className="dash-hub-cta" style={{ marginTop: 10, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 17px", borderRadius: 9, fontFamily: "Rubik,sans-serif", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, textDecoration: "none" }}>{cta} <span className="dash-hub-arrow">→</span></Link>
    </div>
  );
}

export default function DashboardPage() {
  // Mêmes effets que l'accueil : halo suivant le curseur + léger relief sur les
  // cartes portant la classe .fx-card. Un seul écouteur délégué pour toute la page.
  useCardFx();
  const { data: session } = useSession();
  const DEV_ALL = process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";
  const isAdmin = DEV_ALL || canAccessAdmin((session?.user as any)?.role ?? "RECRUE");
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/dashboard"); if (r.ok) setD(await r.json()); } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 30, color: "var(--text-muted)" }}>Chargement du dashboard…</div>;
  if (!d) return <div style={{ padding: 30, color: "var(--red)" }}>Impossible de charger les données.</div>;

  const maxClass = Math.max(1, ...d.characters.classes.map((c) => c.count));
  const wbNext = d.worldboss.next ? new Date(d.worldboss.next).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Le tableau de bord n'est plus une fonctionnalité à part : c'est la vue
          d'entrée du GuildViewer, dans l'organisation en 3 outils. */}
      <PageHeader banner="/assets/site/banners/banner-dashboard.webp" title="GuildViewer · Tableau de bord" subtitle="L'état de Vanguard en temps réel : membres, personnages, builds et économie." />

      {/* ── CTA AirBuilder ── */}
      <Link href="/builder" className="dash-cta" style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", marginBottom: 24, borderRadius: 14, textDecoration: "none", background: "linear-gradient(90deg, rgba(255,140,26,0.18), rgba(255,140,26,0.04))", border: "1px solid var(--orange)" }}>
        <span style={{ color: "var(--orange)", display: "flex" }}><Icon name="sword" size={28} /></span>
        <div style={{ flex: 1 }}>
          <div className="font-heading" style={{ fontSize: 16, fontWeight: 700, color: "var(--orange)", textTransform: "uppercase", letterSpacing: 0.5 }}>Mets à jour ton build</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Tiens ton stuff à jour sur AirBuilder pour que le staff puisse t&apos;accompagner.</div>
        </div>
        <span className="font-heading" style={{ color: "var(--orange)", fontWeight: 700, whiteSpace: "nowrap" }}>Ouvrir AirBuilder →</span>
      </Link>

      {/* ── Ma progression ──
          Avant les priorités du staff : sur SON tableau de bord, un membre veut
          d'abord savoir où il en est. */}
      <Progression />

      {/* ── Priorités (staff seulement) ── */}
      {isAdmin && <div className="dash-card dash-prio" style={{ marginBottom: 24 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}><Icon name="zap" size={15} /> Priorités du jour</div>
        {d.priorities.length === 0 ? (
          <div style={{ color: "var(--green)", fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}><Icon name="check" size={16} /> Rien à signaler — tout est à jour.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {d.priorities.map((p, i) => (
              <Link key={i} href={p.href} className="dash-prio-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 9, textDecoration: "none", background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: PRIO_COLOR[p.level], flexShrink: 0 }} />
                <span className="font-heading" style={{ fontSize: 18, fontWeight: 700, color: PRIO_COLOR[p.level], minWidth: 28 }}>{p.count}</span>
                <span style={{ fontSize: 14, color: "var(--text)" }}>{p.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>{p.level} →</span>
              </Link>
            ))}
          </div>
        )}
      </div>}

      {/* ── Cartes chiffres (dépliables) ── */}
      <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard href="/guildviewer" icon="users" title="Membres" summary={
          <div style={{ display: "flex", gap: 22 }}>
            <Stat value={d.members.total} label="total" />
            <Stat value={d.members.active} label="actifs" color="var(--green)" />
            <Stat value={d.members.inactive} label="inactifs" color="var(--text-muted)" />
          </div>} />

        {isAdmin && <StatCard href="/guildviewer" icon="sword" title="Personnages" summary={
          <div style={{ display: "flex", gap: 22 }}>
            <Stat value={d.characters.total} label="total" />
            <Stat value={d.characters.mains} label="principaux" color="var(--gold)" />
            <Stat value={d.characters.secondaries} label="secondaires" />
          </div>} />}

        {isAdmin && <StatCard href="/guildviewer" icon="shield" title="Builds" summary={
          <div style={{ display: "flex", gap: 22 }}>
            <Stat value={d.builds.total} label="enregistrés" color="var(--blue)" />
            <Stat value={d.builds.withoutBuild} label="sans build" color={d.builds.withoutBuild ? "var(--red)" : "var(--green)"} />
          </div>} />}

        <StatCard href="/coffre" icon="vault" title="Coffre de guilde" summary={
          <div style={{ display: "flex", gap: 22 }}>
            <Stat value={d.coffre.under} label="à compléter" color={d.coffre.under ? "var(--red)" : "var(--green)"} />
            <Stat value={d.coffre.total} label="objets suivis" />
          </div>} />

        <StatCard href="/gestion-dettes" icon="coins" title="Dettes" summary={
          <>
            <div style={{ display: "flex", gap: 22 }}>
              <Stat value={d.debts.ongoing} label="en cours" color={d.debts.ongoing ? "var(--gold)" : "var(--green)"} />
              <Stat value={d.debts.repaid} label="remboursées" color="var(--green)" />
              <Stat value={d.debts.overdue} label="en retard" color={d.debts.overdue ? "var(--red)" : "var(--green)"} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>{d.debts.remaining.toLocaleString("fr-FR")} périns restant à rembourser sur {d.debts.ongoingAmount.toLocaleString("fr-FR")} périn en circulation</div>
          </>} />

        <StatCard href="/absences" icon="moon" title="Absences" summary={
          <div style={{ display: "flex", gap: 22 }}>
            <Stat value={d.absences.active} label="en cours" color="var(--purple)" />
            <Stat value={d.absences.pending} label="à valider" color={d.absences.pending ? "var(--gold)" : "var(--text-muted)"} />
          </div>} />

        {isAdmin && <StatCard href="/candidatures" icon="clipboard" title="Candidatures" summary={
          <div style={{ display: "flex", gap: 22 }}>
            <Stat value={d.candidatures.pending} label="en attente" color={d.candidatures.pending ? "var(--gold)" : "var(--green)"} />
            <Stat value={d.candidatures.waiting} label="en suivi" color="var(--blue)" />
          </div>} />}

        <StatCard href="/worldboss" icon="dragon" title="World Boss" summary={
          <>
            <Stat value={d.worldboss.upcoming} label="à venir" color={d.worldboss.upcoming ? "var(--red)" : "var(--text-muted)"} />
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>{wbNext ? `Prochain : ${wbNext}` : "Aucun programmé"}</div>
          </>} />
      </div>

      {/* ── Répartition des classes ── */}
      <div className="dash-card" style={{ marginBottom: 8 }}>
        <div className="font-heading" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 12 }}>Classes représentées</div>
        {d.characters.classes.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Aucun personnage pour l&apos;instant.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {d.characters.classes.map((c) => (
              <div key={c.classe} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 130, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <ClassLogo name={c.classe} size={22} /> {cap(c.classe)}
                </span>
                <div style={{ flex: 1, height: 10, background: "var(--bg-3)", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${(c.count / maxClass) * 100}%`, height: "100%", background: "linear-gradient(90deg,#FFB552,#FF8C1A)" }} />
                </div>
                {/* La barre est relative à la classe la plus jouée (bonne pour comparer),
                    mais 100 % se lisait comme « au maximum ». La part du total donne
                    le sens réel : 3 personnages sur 14, c'est 21 % de la guilde. */}
                <span className="font-heading" style={{ fontSize: 14, fontWeight: 600, width: 28, textAlign: "right" }}>{c.count}</span>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)", width: 42, textAlign: "right" }}>
                  {d.characters.total ? Math.round((c.count / d.characters.total) * 100) : 0} %
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Relié aux 3 fonctionnalités ── */}
      <div className="font-heading" style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted)", margin: "32px 0 6px", display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="link" size={15} /> Relié à tes outils<span style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      <div className="dash-hubs" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(255px, 1fr))", gap: 14 }}>
        <Hub icon="sword" title="AirBuilder" metric={<>{d.builds.total} builds suivis · <b style={{ color: "var(--gold)" }}>{d.builds.withoutBuild} sans stuff</b></>} href="/builder" cta="Ouvrir" />
        {isAdmin && <Hub icon="vault" title="AirGuild" metric={<><b style={{ color: "var(--red)" }}>{d.coffre.under} objets</b> sous le seuil</>} href="/plan-farm" cta="Plan de farm" />}
        {isAdmin && <Hub icon="eye" title="GuildViewer" metric={<>{d.members.total} membres · <b style={{ color: "var(--gold)" }}>{d.characters.withoutBuild} à accompagner</b></>} href="/guildviewer" cta="Ouvrir" />}
      </div>

      <style>{`
        .dash-card{background:linear-gradient(180deg,#191920,#121218);border:1px solid var(--border);border-radius:15px;padding:16px;transition:transform .15s,border-color .15s,box-shadow .15s}
        .dash-card:hover{transform:translateY(-2px);border-color:#3a3a46;box-shadow:0 8px 26px rgba(0,0,0,.35)}
        .dash-prio{border-color:rgba(255,140,26,.28);background:linear-gradient(180deg,rgba(255,140,26,.06),#121218);padding:18px}
        .dash-prio:hover{transform:none;border-color:rgba(255,140,26,.45)}
        .dash-prio-row{transition:background .15s,border-color .15s}
        .dash-prio-row:hover{background:#23232c !important;border-color:var(--orange) !important}
        .dash-hub{border-color:#3a2c16}
        .dash-hub:hover{border-color:var(--orange)}
        .dash-cta{transition:transform .15s,box-shadow .15s}
        .dash-cta:hover{transform:translateY(-2px);box-shadow:0 8px 26px rgba(255,140,26,.25)}
        @keyframes dashIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .dash-grid>*,.dash-hubs>*{animation:dashIn .5s ease both}
        .dash-grid>*:nth-child(1){animation-delay:.03s}.dash-grid>*:nth-child(2){animation-delay:.07s}.dash-grid>*:nth-child(3){animation-delay:.11s}.dash-grid>*:nth-child(4){animation-delay:.15s}.dash-grid>*:nth-child(5){animation-delay:.19s}.dash-grid>*:nth-child(6){animation-delay:.23s}.dash-grid>*:nth-child(7){animation-delay:.27s}.dash-grid>*:nth-child(8){animation-delay:.31s}
        .dash-hubs>*:nth-child(1){animation-delay:.05s}.dash-hubs>*:nth-child(2){animation-delay:.12s}.dash-hubs>*:nth-child(3){animation-delay:.19s}
        @media(prefers-reduced-motion:reduce){.dash-grid>*,.dash-hubs>*{animation:none}}
      `}</style>
    </div>
  );
}
