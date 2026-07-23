"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessGuild, canAccessAdmin } from "@/config/roles";
import { Icon, type IconName } from "@/components/Icon";
import { ProfilePanel } from "@/components/ProfilePanel";
import { NotificationBell } from "@/components/NotificationBell";

// ── Navigation v2 — bandeau supérieur (sections + sous-sections en déroulants) ──
type Sub = { label: string; href: string };
type Item = { label: string; href: string; icon: IconName; access: "public" | "guild" | "admin"; sub?: Sub[] };

const NAV: Item[] = [
  { label: "Accueil", href: "/histoire", icon: "book", access: "public" },
  { label: "Candidature", href: "/candidature", icon: "user-plus", access: "public" },
  { label: "Dashboard", href: "/dashboard", icon: "grid", access: "guild" },
  { label: "AirBuilder", href: "/builder", icon: "shirt", access: "guild" },
  { label: "Boutique", href: "/dettes", icon: "cart", access: "public" },
  { label: "Guides", href: "/astuces", icon: "compass", access: "guild", sub: [{ label: "Guide", href: "/astuces" }, { label: "Prestige", href: "/prestige" }] },
  { label: "PvE", href: "/donjons", icon: "skull", access: "guild", sub: [{ label: "Donjons", href: "/donjons" }, { label: "World Boss", href: "/worldboss" }] },
  { label: "Chambres S.", href: "/compositions", icon: "key", access: "guild" },
  { label: "Administration", href: "/guildviewer", icon: "shield", access: "admin", sub: [
    { label: "GuildViewer", href: "/guildviewer" },
    { label: "AirGuild", href: "/coffre" },
    { label: "Banque (gestion)", href: "/gestion-dettes" },
    { label: "Discord", href: "/discord" },
    { label: "Events", href: "/events" },
    { label: "Annonce", href: "/annonce" },
    { label: "Candidatures", href: "/candidatures" },
  ] },
];

// Fond de page (assets fournis par iBeats) — clé → /assets/site/bg/<clé>.png
const PAGE_BG: Record<string, string> = {
  "/coffre": "airguild", "/dettes": "banque", "/gestion-dettes": "banque", "/guildviewer": "guildviewer",
  "/dashboard": "sup1", "/builder": "sup2", "/astuces": "sup3", "/prestige": "sup3", "/donjons": "sup4",
  "/worldboss": "sup5", "/compositions": "sup6", "/candidature": "sup7", "/candidatures": "sup8",
  "/discord": "sup9", "/events": "sup10", "/annonce": "sup11", "/personnages": "sup1",
  "/echanges": "sup2", "/parametres": "sup3", "/plan-farm": "airguild",
};
export function Shell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const DEV_ALL = process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1"; // dev local uniquement (jamais en prod)
  const userRole = (session?.user as any)?.role ?? "RECRUE";
  const bgKey = PAGE_BG[pathname] ?? "";
  const has = (a: string) => (DEV_ALL ? true : a === "public" ? true : a === "guild" ? canAccessGuild(userRole) : canAccessAdmin(userRole));
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const items = NAV.filter((it) => has(it.access) && !(it.href === "/candidature" && canAccessGuild(userRole)));

  return (
    <div className="vg-shell">
      <header className="vg-topnav">
        <Link href="/histoire" className="vg-top-brand">
          <img src="/assets/site/logo-bat.png" alt="Vanguard" className="vg-top-logo" />
          <span className="vg-top-title">Vanguard</span>
        </Link>

        <button className="vg-top-burger" onClick={() => setNavOpen((o) => !o)} aria-label="Menu"><Icon name="menu" size={19} /></button>

        <nav className={`vg-top-nav ${navOpen ? "open" : ""}`}>
          {items.map((it) => {
            const active = isActive(it.href) || (it.sub?.some((s) => isActive(s.href)) ?? false);
            return (
              <div key={it.href} className="vg-top-item">
                <Link href={it.href} onClick={() => setNavOpen(false)} className={`vg-top-link ${active ? "active" : ""}`}>
                  <Icon name={it.icon} size={16} />{it.label}{it.sub ? " ▾" : ""}
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
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <NotificationBell />
              <ProfilePanel devAll={DEV_ALL} />
            </div>
          ) : (pathname !== "/histoire" && pathname !== "/candidature") ? (
            <Link href="/login" style={{ padding: "8px 16px", background: "#5865F2", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 13 }} className="font-heading">Se connecter</Link>
          ) : null}
        </div>
      </header>

      <main className="vg-main" data-bg={bgKey}><div key={pathname} className="vg-page">{children}</div></main>
    </div>
  );
}
