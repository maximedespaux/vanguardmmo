"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessGuild, canAccessAdmin } from "@/config/roles";
import { Icon, type IconName } from "@/components/Icon";
import { ProfilePanel } from "@/components/ProfilePanel";
import { Alertes } from "@/components/Alertes";

// ── Navigation v2 — bandeau supérieur (sections + sous-sections en déroulants) ──
type Sub = { label: string; href: string; access?: "public" | "guild" | "admin" };
type Item = { label: string; href: string; icon: IconName; access: "public" | "guild" | "admin"; sub?: Sub[] };

// Navigation organisee autour des TROIS outils de la guilde, chacun regroupant ce
// qui le concerne, au lieu d'une liste plate ou « Dashboard », « Boutique » et
// « GuildViewer » vivaient separement :
//   AirBuilder  -> creer et partager les builds
//   AirGuild    -> l'economie (coffres, boutique, crafts, farm)
//   GuildViewer -> les membres (tableau de bord, fiches, compositions)
// Events et Annonces ont quitte la navigation : ils se pilotent depuis Discord.
const NAV: Item[] = [
  { label: "Accueil", href: "/histoire", icon: "book", access: "public" },
  { label: "Candidature", href: "/candidature", icon: "user-plus", access: "public" },

  { label: "AirBuilder", href: "/builder", icon: "shirt", access: "guild", sub: [
    { label: "Mes builds", href: "/builder" },
    { label: "Mes personnages", href: "/personnages" },
  ] },

  { label: "AirGuild", href: "/dettes", icon: "vault", access: "public", sub: [
    { label: "Boutique", href: "/dettes", access: "public" },
    // Depuis que Discord ne relaie plus rien, les echanges vivent sur le site :
    // ils ont droit a leur entree, sans quoi on ne les retrouve qu'en rouvrant
    // la demande dont ils sont partis.
    { label: "Messages", href: "/messages", access: "public" },
    { label: "Coffres & crafts", href: "/coffre", access: "admin" },
    { label: "Plan de farm", href: "/plan-farm", access: "admin" },
  ] },

  { label: "GuildViewer", href: "/dashboard", icon: "users", access: "guild", sub: [
    { label: "Tableau de bord", href: "/dashboard", access: "guild" },
    { label: "Membres & builds", href: "/guildviewer", access: "admin" },
    { label: "Compositions", href: "/compositions", access: "guild" },
    { label: "Candidatures", href: "/candidatures", access: "admin" },
    // Le suivi des dettes parle des MEMBRES (qui doit quoi a qui), pas du stock :
    // sa place est avec le GuildViewer, pas dans l'espace marchand.
    { label: "Suivi des dettes", href: "/gestion-dettes", access: "admin" },
    // Rattachees ici et plus bas : ces pages EXISTAIENT sans aucun lien dans la
    // nav — on ne pouvait y arriver qu'en tapant l'URL. C'est la premiere cause
    // du sentiment de se perdre : des ecrans qu'on ne sait pas atteindre.
    { label: "Absences", href: "/absences", access: "guild" },
  ] },

  { label: "Guides", href: "/astuces", icon: "compass", access: "guild", sub: [
    { label: "Guide de progression", href: "/astuces" },
    { label: "Prestige", href: "/prestige" },
  ] },
  { label: "PvE", href: "/donjons", icon: "skull", access: "guild", sub: [
    { label: "Donjons", href: "/donjons" },
    { label: "World Boss", href: "/worldboss" },
    { label: "World Boss — gestion", href: "/gestion-worldboss", access: "admin" },
    { label: "Échanges PNJ", href: "/echanges" },
  ] },

  // Tout le pilotage du bot est regroupe sur « Bot Discord » : creneaux recurrents,
  // events du jeu, World Boss et annonces s'y gerent via ses onglets, plutot que
  // d'occuper quatre entrees de navigation distinctes.
  { label: "Bot Discord", href: "/discord", icon: "discord", access: "admin", sub: [
    { label: "Pilotage du bot", href: "/discord", access: "admin" },
    // Ces deux pages existaient sans lien : on ne pouvait les ouvrir qu'en
    // connaissant l'URL, alors qu'elles pilotent des envois Discord.
    { label: "Annonce", href: "/annonce", access: "admin" },
    { label: "Events du jeu", href: "/events", access: "admin" },
  ] },
];


// Fond de page (assets fournis par iBeats) — clé → /assets/site/bg/<clé>.webp
// (les .webp sont générés depuis les PNG par `npm run assets` ; règles CSS dans globals.css)
const PAGE_BG: Record<string, string> = {
  "/coffre": "airguild", "/dettes": "banque", "/gestion-dettes": "guildviewer", "/guildviewer": "guildviewer",
  "/dashboard": "sup1", "/builder": "sup2", "/astuces": "sup3", "/prestige": "sup3", "/donjons": "sup4",
  "/worldboss": "sup5", "/compositions": "sup6", "/candidature": "sup7", "/candidatures": "sup8",
  "/discord": "sup9", "/events": "sup10", "/annonce": "sup11", "/personnages": "sup1",
  "/echanges": "sup2", "/parametres": "sup3", "/plan-farm": "airguild", "/messages": "banque",
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
          <img src="/assets/site/logo-bat.webp" alt="Vanguard" className="vg-top-logo" />
          {/* Traitement bicolore, comme « AirBuilder » : la première syllabe en
              orange, la suite en blanc. Charte orange et noir. */}
          <span className="vg-top-title">Van<span>guard</span></span>
        </Link>

        <button className="vg-top-burger" onClick={() => setNavOpen((o) => !o)} aria-label="Menu"><Icon name="menu" size={19} /></button>

        <nav className={`vg-top-nav ${navOpen ? "open" : ""}`}>
          {items.map((it) => {
            const active = isActive(it.href) || (it.sub?.some((s) => isActive(s.href)) ?? false);
            return (
              <div key={it.href} className="vg-top-item">
                <Link href={it.href} onClick={() => setNavOpen(false)} className={`vg-top-link ${active ? "active" : ""}`}>
                  <Icon name={it.icon} size={16} />{it.label}{it.sub ? <Icon name="chevron-down" size={13} style={{ opacity: .7 }} /> : null}
                </Link>
                {it.sub && (
                  <div className="vg-dropdown">
                    {it.sub.filter((s) => has(s.access ?? it.access)).map((s) => (
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
              <Alertes />
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
