"use client";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessGuild, canAccessAdmin } from "@/config/roles";

// ── Navigation v2 — bandeau supérieur (sections + sous-sections en déroulants) ──
type Sub = { label: string; href: string };
type Item = { label: string; href: string; icon: string; access: "public" | "guild" | "admin"; sub?: Sub[] };

const NAV: Item[] = [
  { label: "Accueil", href: "/histoire", icon: "📖", access: "public" },
  { label: "Candidature", href: "/candidature", icon: "📋", access: "public" },
  { label: "Dashboard", href: "/dashboard", icon: "🛰️", access: "guild" },
  { label: "AirBuilder", href: "/builder", icon: "⚔️", access: "guild" },
  { label: "Banque", href: "/dettes", icon: "🏦", access: "guild" },
  { label: "Guides", href: "/astuces", icon: "🎓", access: "guild", sub: [{ label: "Guide", href: "/astuces" }, { label: "Prestige", href: "/prestige" }] },
  { label: "PvE", href: "/donjons", icon: "🐉", access: "guild", sub: [{ label: "Donjons", href: "/donjons" }, { label: "World Boss", href: "/worldboss" }] },
  { label: "Chambres S.", href: "/compositions", icon: "🗝️", access: "guild" },
  { label: "Paramètres", href: "/parametres", icon: "⚙️", access: "guild" },
  { label: "Administration", href: "/guildviewer", icon: "🛠️", access: "admin", sub: [
    { label: "GuildViewer", href: "/guildviewer" },
    { label: "AirGuild", href: "/coffre" },
    { label: "Banque (gestion)", href: "/gestion-dettes" },
    { label: "Discord", href: "/discord" },
    { label: "Events", href: "/events" },
    { label: "Annonce", href: "/annonce" },
    { label: "Candidatures", href: "/candidatures" },
  ] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const DEV_ALL = process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1"; // dev local uniquement (jamais en prod)
  const userRole = (session?.user as any)?.role ?? "RECRUE";
  const ROLE_META: Record<string, { emoji: string; label: string }> = {
    DIRECTION: { emoji: "🛡️", label: "Direction" }, VANGUARD: { emoji: "👑", label: "Vanguard" },
    GENERAL: { emoji: "🧭", label: "Général" }, OFFICIER: { emoji: "🔥", label: "Officier" },
    VETERAN: { emoji: "📋", label: "Vétéran" }, GUARD: { emoji: "⚔️", label: "Guard" }, RECRUE: { emoji: "🌱", label: "Recrue" },
  };
  const role = DEV_ALL ? { emoji: "👑", label: "Vanguard (dev)" } : (ROLE_META[userRole] ?? ROLE_META.RECRUE);
  const has = (a: string) => (DEV_ALL ? true : a === "public" ? true : a === "guild" ? canAccessGuild(userRole) : canAccessAdmin(userRole));
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const items = NAV.filter((it) => has(it.access));

  return (
    <div className="vg-shell">
      <header className="vg-topnav">
        <Link href="/histoire" className="vg-top-brand">
          <img src="/assets/site/logo-bat.png" alt="Vanguard" className="vg-top-logo" />
          <span className="vg-top-title">Vanguard</span>
        </Link>

        <button className="vg-top-burger" onClick={() => setNavOpen((o) => !o)} aria-label="Menu">☰</button>

        <nav className={`vg-top-nav ${navOpen ? "open" : ""}`}>
          {items.map((it) => {
            const active = isActive(it.href) || (it.sub?.some((s) => isActive(s.href)) ?? false);
            return (
              <div key={it.href} className="vg-top-item">
                <Link href={it.href} onClick={() => setNavOpen(false)} className={`vg-top-link ${active ? "active" : ""}`}>
                  <span>{it.icon}</span>{it.label}{it.sub ? " ▾" : ""}
                </Link>
                {it.sub && (
                  <div className="vg-dropdown">
                    {it.sub.map((s) => (
                      <Link key={s.href} href={s.href} onClick={() => setNavOpen(false)} className={`vg-drop-link ${isActive(s.href) ? "active" : ""}`}>{s.label}</Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="vg-top-user">
          {(session || DEV_ALL) ? (
            <>
              <span className="vg-user-av" style={{ width: 30, height: 30, fontSize: 15 }}>🦉</span>
              <span style={{ fontSize: 12, color: "var(--orange)", whiteSpace: "nowrap" }}>{role.emoji} {role.label}</span>
              {session && <button onClick={() => signOut()} title="Déconnexion" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>⏻</button>}
            </>
          ) : (
            <Link href="/login" style={{ padding: "8px 16px", background: "#5865F2", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 13 }} className="font-heading">Se connecter</Link>
          )}
        </div>
      </header>

      <main className="vg-main"><div key={pathname} className="vg-page">{children}</div></main>
    </div>
  );
}
