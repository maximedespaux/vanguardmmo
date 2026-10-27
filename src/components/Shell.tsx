"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accesDe, espacesPour, peutOuvrir, regardDe, type Espace, type Lien } from "@/config/nav";
import { canAccessGuild } from "@/config/roles";
import { Icon } from "@/components/Icon";
import { ProfilePanel } from "@/components/ProfilePanel";
import { PanneauTout } from "@/components/PanneauTout";
import { Alertes } from "@/components/Alertes";
import { AccueilPersonnages } from "@/components/AccueilPersonnages";

// ── Navigation — les espaces et leurs droits viennent de config/nav ──
// Chaque entrée porte une ligne qui dit ce qu'on y trouve, parce que « AirGuild »
// ou « GuildViewer » ne le disent pas.

// Fond de page (assets fournis par iBeats) — clé → /assets/site/bg/<clé>.webp
// (seuls les .webp sont versionnés : déposer le PNG puis `npm run assets` — voir
//  scripts/optimize-assets.mjs ; règles CSS dans globals.css)
/* /guildviewer, /suivi et /candidatures sont devenues des sections de /staff (2026-10-21) :
   leur fond part avec elles, la page tout-en-un garde le sien. */
const PAGE_BG: Record<string, string> = {
  "/staff": "sup11",
  "/builder": "sup2", "/astuces": "sup3", "/prestige": "sup3", "/donjons": "sup4",
  "/worldboss": "sup5", "/compositions": "sup6", "/candidature": "sup7",
  "/discord": "sup9", "/events": "sup10", "/personnages": "sup1",
  /* Le fond « airguild » a survécu au coffre puis à Quête Guilde, partie le 2026-10-21 :
     c'est le campement de la guilde — des membres penchés sur la carte, les coffres,
     l'étendard —, et il passe à Information Guilde plutôt que de dormir dans public/. */
  "/guilde": "airguild",
};

/** Les rubriques d'un déroulant, dans l'ordre où la carte les nomme. */
function parGroupe(liens: Lien[]): { titre: string; liens: Lien[] }[] {
  const groupes: { titre: string; liens: Lien[] }[] = [];
  for (const l of liens) {
    const titre = l.groupe ?? "";
    const g = groupes.find((x) => x.titre === titre);
    if (g) g.liens.push(l); else groupes.push({ titre, liens: [l] });
  }
  return groupes;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const regard = regardDe(session);
  const { role, devAll } = regard;
  const bgKey = PAGE_BG[pathname] ?? "";
  // Le `?vue=` d'un lien ne fait pas partie de l'adresse d'une page. Le `#` n'est pas
  // coupé, et c'est voulu : « /#la-guilde » ne doit pas s'allumer sur tout l'accueil.
  const chemin = (href: string) => href.split("?")[0];
  const isActive = (href: string) => pathname === chemin(href) || pathname.startsWith(chemin(href) + "/");

  /* Le regard entier, et pas le seul rang : un ami (rôle Discord Friend) voit les espaces
     que son réglage lui ouvre — la décision est `peutOuvrir`, dans config/nav.ts. */
  const barre = espacesPour(regard, "barre");
  /* Un espace s'allume aussi sur ses pages sans ligne de barre (`barre: false`) : la
     carte sait où l'on est même quand la barre ne nomme pas la page. (Quête Guilde, qui en
     était l'exemple, a quitté le site le 2026-10-21.) */
  const toutes = espacesPour(regard, "plan").espaces;
  const allume = (e: Espace) => (toutes.find((x) => x.label === e.label)?.liens ?? e.liens).some((l) => isActive(l.href));
  const cible = (e: Espace) =>
    e.hrefVisiteur && !peutOuvrir(accesDe(e.href) ?? e.acces, regard, e.cle) ? e.hrefVisiteur : e.href;
  const liensHors = barre.hors.filter((l) => !l.appel);
  const appel = barre.hors.find((l) => l.appel);

  return (
    <div className="vg-shell">
      <header className="vg-topnav">
        {/* Le logo menait à /histoire, faute de page d'accueil : `/` n'était qu'un
            renvoi. Maintenant qu'elle existe, il mène là où tout le monde
            s'attend qu'un logo mène. */}
        <Link href="/" className="vg-top-brand">
          {/* Le monogramme G arrive d'UN seul fichier : le jour où Maxime choisit
              sa proposition (A-F), on remplace logo-mark.svg et rien d'autre. */}
          <img src="/assets/genesis/logo-mark.svg" alt="" aria-hidden="true" className="vg-top-logo" />
          {/* Plus de traitement bicolore : GENESIS s'écrit d'un seul tenant, en
              capitales gravées ivoire — l'or et le crimson vivent dans le G. */}
          <span className="vg-top-title">Genesis</span>
        </Link>

        <button className="vg-top-burger" onClick={() => setNavOpen((o) => !o)} aria-label="Menu"><Icon name="menu" size={19} /></button>

        <nav className={`vg-top-nav ${navOpen ? "open" : ""}`}>
          {liensHors.map((l) => (
            <div key={l.href} className="vg-top-item">
              <Link href={l.href} onClick={() => setNavOpen(false)} className={`vg-top-link ${isActive(l.href) ? "active" : ""}`}>
                <Icon name={l.icon} size={16} />{l.label}
              </Link>
            </div>
          ))}

          {barre.espaces.map((e) => {
            const href = cible(e);
            const active = allume(e);
            /* Un déroulant d'une seule ligne qui mène là où mène déjà le libellé ajoute
               un clic pour rien : c'est la Guilde d'un visiteur, qui n'y garde que la
               page de la guilde elle-même. */
            if (e.liens.length === 1 && e.liens[0].href === href) {
              return (
                <div key={e.label} className="vg-top-item">
                  <Link href={href} onClick={() => setNavOpen(false)} className={`vg-top-link ${active ? "active" : ""}`}>
                    <Icon name={e.icon} size={16} />{e.label}
                  </Link>
                </div>
              );
            }
            const groupes = parGroupe(e.liens);
            const rubriques = groupes.some((g) => g.titre);
            /* Une ligne qui vise une VUE (`/staff?section=absences`) ne s'allume pas :
               la barre ne lit pas la requête, et elle s'allumait avec la page entière, à
               côté de « Membres & builds ». C'est la barre d'onglets de la page qui
               dit la vue ouverte. */
            const ligne = (l: Lien) => (
              <Link key={l.href} href={l.href} onClick={() => setNavOpen(false)} className={`vg-mega-link ${!l.href.includes("?") && isActive(l.href) ? "active" : ""}`}>
                <span className="vg-mega-ic"><Icon name={l.icon} size={15} /></span>
                <span className="vg-mega-txt">
                  <span className="vg-mega-l">{l.label}</span>
                  <span className="vg-mega-d">{l.desc}</span>
                </span>
              </Link>
            );
            return (
              <div key={e.label} className="vg-top-item">
                <Link href={href} onClick={() => setNavOpen(false)} className={`vg-top-link ${active ? "active" : ""}`}>
                  <Icon name={e.icon} size={16} />{e.label}<Icon name="chevron-down" size={13} style={{ opacity: .7 }} />
                </Link>
                {/* Chaque entrée dit ce qu'on y trouve. C'est ce qui manquait :
                    un menu de noms d'outils oblige à ouvrir pour comprendre. */}
                <div className={`vg-dropdown vg-mega${rubriques ? " gn-mega-rubriques" : ""}`}>
                  {rubriques
                    ? groupes.map((g) => (
                        <div key={g.titre} className="gn-mega-rubrique">
                          <div className="gn-mega-titre">{g.titre}</div>
                          {g.liens.map(ligne)}
                        </div>
                      ))
                    : e.liens.map(ligne)}
                </div>
              </div>
            );
          })}

          {/* Le bouton « Postuler » ne tient pas dans la barre d'un téléphone, à
              côté de « Se connecter » : il redescend ici, à la fin du menu. */}
          {appel && (
            <div className="vg-top-item gn-appel-menu">
              <Link href={appel.href} onClick={() => setNavOpen(false)} className={`vg-top-link ${isActive(appel.href) ? "active" : ""}`}>
                <Icon name={appel.icon} size={16} />{appel.label}
              </Link>
            </div>
          )}
        </nav>

        <div className="vg-top-user">
          {/* À droite et en bouton, comme dans la maquette : c'est un appel, pas une
              destination parmi les autres. Inutile sur sa propre page. */}
          {appel && pathname !== appel.href && (
            <Link href={appel.href} className="font-heading gn-postuler">{appel.label}</Link>
          )}
          {regard.connecte ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <PanneauTout qui={regard} />
              <Alertes />
              <ProfilePanel devAll={devAll} role={role} ami={regard.amis.length > 0 && !canAccessGuild(role)} />
            </div>
          ) : (pathname !== "/" && pathname !== "/candidature") ? (
            /* Pas sur l'accueil : son hero porte déjà « Se connecter avec Discord », et
               un visiteur y voyait deux boutons pour le même geste. */
            <Link href="/login" style={{ padding: "8px 16px", background: "#5865F2", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 13 }} className="font-heading">Se connecter</Link>
          ) : null}
        </div>
      </header>

      <main className="vg-main" data-bg={bgKey}><div key={pathname} className="vg-page">{children}</div></main>

      {/* Première connexion d'un membre de la guilde : on lui fait déclarer ses
          personnages avant qu'il ne se demande pourquoi rien ne le concerne. */}
      <AccueilPersonnages />
    </div>
  );
}
