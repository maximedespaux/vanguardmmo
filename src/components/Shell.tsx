"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessGuild, canAccessAdmin } from "@/config/roles";
import { ESPACES, HORS_ESPACES, type Acces } from "@/config/nav";
import { Icon } from "@/components/Icon";
import { ProfilePanel } from "@/components/ProfilePanel";
import { Alertes } from "@/components/Alertes";

// ── Navigation v3 — trois espaces nommés par la TÂCHE, définis dans config/nav ──
// Le regroupement seul ne suffisait pas : chaque entrée porte une ligne qui dit
// ce qu'on y trouve, parce que « AirGuild » ou « GuildViewer » ne le disent pas.

// Fond de page (assets fournis par iBeats) — clé → /assets/site/bg/<clé>.webp
// (les .webp sont générés depuis les PNG par `npm run assets` ; règles CSS dans globals.css)
const PAGE_BG: Record<string, string> = {
  "/coffre": "airguild", "/guildviewer": "guildviewer",
  "/dashboard": "sup1", "/builder": "sup2", "/astuces": "sup3", "/prestige": "sup3", "/donjons": "sup4",
  "/worldboss": "sup5", "/compositions": "sup6", "/candidature": "sup7", "/candidatures": "sup8",
  "/discord": "sup9", "/events": "sup10", "/annonce": "sup11", "/personnages": "sup1",
  "/parametres": "sup3", "/plan-farm": "airguild", "/messages": "banque", "/quetes": "airguild",
  "/boutique": "banque", "/demandes": "banque", "/sommaire": "guildviewer",
};
export function Shell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const DEV_ALL = process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1"; // dev local uniquement (jamais en prod)
  const userRole = (session?.user as any)?.role ?? "RECRUE";
  const bgKey = PAGE_BG[pathname] ?? "";
  const has = (a: Acces) => (DEV_ALL ? true : a === "public" ? true : a === "guild" ? canAccessGuild(userRole) : canAccessAdmin(userRole));
  // Le `?tab=` des liens (« Mes dettes ») ne fait pas partie de l'adresse d'une page.
  const chemin = (href: string) => href.split("?")[0];
  const isActive = (href: string) => pathname === chemin(href) || pathname.startsWith(chemin(href) + "/");

  const horsEspaces = HORS_ESPACES.filter(
    (l) => has(l.acces ?? "public") && !(l.href === "/candidature" && canAccessGuild(userRole))
  );
  // Un espace dont toutes les entrées sont hors de portée n'a rien à montrer.
  const espaces = ESPACES.map((e) => ({ ...e, liens: e.liens.filter((l) => has(l.acces ?? e.acces)) }))
    .filter((e) => has(e.acces) && e.liens.length > 0);

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
          {horsEspaces.map((l) => (
            <div key={l.href} className="vg-top-item">
              <Link href={l.href} onClick={() => setNavOpen(false)} className={`vg-top-link ${isActive(l.href) ? "active" : ""}`}>
                <Icon name={l.icon} size={16} />{l.label}
              </Link>
            </div>
          ))}

          {espaces.map((e) => {
            const active = e.liens.some((l) => isActive(l.href));
            return (
              <div key={e.label} className="vg-top-item">
                <Link href={e.href} onClick={() => setNavOpen(false)} className={`vg-top-link ${active ? "active" : ""}`}>
                  <Icon name={e.icon} size={16} />{e.label}<Icon name="chevron-down" size={13} style={{ opacity: .7 }} />
                </Link>
                {/* Chaque entrée dit ce qu'on y trouve. C'est ce qui manquait :
                    un menu de noms d'outils oblige à ouvrir pour comprendre. */}
                <div className="vg-dropdown vg-mega">
                  {e.liens.map((l) => (
                    <Link key={l.href} href={l.href} onClick={() => setNavOpen(false)} className={`vg-mega-link ${isActive(l.href) ? "active" : ""}`}>
                      <span className="vg-mega-ic"><Icon name={l.icon} size={15} /></span>
                      <span className="vg-mega-txt">
                        <span className="vg-mega-l">{l.label}</span>
                        <span className="vg-mega-d">{l.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Le filet : quand on ne sait pas sous quel espace chercher, une page
              montre tout d'un coup. C'est aussi ce qui rattrape les pages qu'on
              n'ouvre qu'une fois par an. */}
          <div className="vg-top-item">
            <Link href="/sommaire" onClick={() => setNavOpen(false)} className={`vg-top-link ${isActive("/sommaire") ? "active" : ""}`} title="Toutes les pages du site">
              <Icon name="grid" size={16} /><span className="vg-top-som">Tout</span>
            </Link>
          </div>
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
