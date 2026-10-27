"use client";
import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ESPACES, accesDe, espaceDe, peutOuvrir, regardDe, type Acces } from "@/config/nav";

const NIVEAU: Record<Acces, number> = { public: 0, guild: 1, admin: 2 };

// Sous-onglets d'une section (regroupe des pages existantes sous une même section v2).
const SECTIONS: Record<string, { label: string; href: string }[]> = {
  guides: [
    { label: "Guide", href: "/astuces" },
    { label: "Prestige", href: "/prestige" },
  ],
  pve: [
    { label: "Donjons", href: "/donjons" },
    { label: "World Boss", href: "/worldboss" },
  ],
  /* Le pilotage du bot n'est plus une liste tenue ici : c'est la rubrique « Outils » des
     bras droits, lue dans config/nav.ts (`rubrique`). L'onglet « Annonce » est parti
     avec sa page, et « Créneaux » n'était qu'une ancre en tête de /discord. */
};

/**
 * La barre d'onglets d'une section — ou, avec `rubrique`, celle d'une rubrique des
 * bras droits, générée depuis config/nav.ts (`Lien.groupe`) : une page staff ajoutée
 * à la carte apparaît dans la barre de ses voisines sans qu'on la recopie ici.
 */
export function SectionTabs({ section, rubrique }: { section?: string; rubrique?: string }) {
  if (rubrique) {
    /* useSearchParams exige une frontière Suspense ; le repli rend la même barre, sans
       savoir encore quelle vue de la page est ouverte. */
    return (
      <Suspense fallback={<OngletsRubrique rubrique={rubrique} recherche={null} />}>
        <OngletsRubriqueEnDirect rubrique={rubrique} />
      </Suspense>
    );
  }
  return <OngletsSection section={section ?? ""} />;
}

function OngletsSection({ section }: { section: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const regard = regardDe(session);
  /* Un onglet qui mène à un refus n'est pas montré : les droits viennent de
     config/nav.ts. Une adresse que la carte ne déclare pas est traitée comme
     réservée au staff — le plus étroit des niveaux, pour qu'un oubli ne
     l'affiche jamais à un visiteur.
     LE NIVEAU DE LA PAGE OUVERTE est un plancher : qui lit /discord a passé la
     garde staff. Sans lui, la session (absente au rendu serveur et jusqu'à sa
     lecture) masquait toute la barre de /discord et de /worldboss, qui
     surgissait ensuite et poussait la page vers le bas. */
  const plancher = NIVEAU[accesDe(pathname) ?? "public"];
  const tabs = (SECTIONS[section] ?? []).filter((t) => {
    const a = accesDe(t.href) ?? "admin";
    // Avec l'espace de l'onglet : le rôle Friend peut l'ouvrir (config/nav.ts, `peutOuvrir`).
    return NIVEAU[a] <= plancher || peutOuvrir(a, regard, espaceDe(t.href));
  });
  if (tabs.length < 2) return null;
  return (
    <div className="vg-subtabs">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} className={`vg-subtab ${active ? "active" : ""}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

function OngletsRubriqueEnDirect({ rubrique }: { rubrique: string }) {
  const recherche = useSearchParams();
  return <OngletsRubrique rubrique={rubrique} recherche={recherche} />;
}

function OngletsRubrique({ rubrique, recherche }: { rubrique: string; recherche: URLSearchParams | null }) {
  const pathname = usePathname();
  // Les pages d'une rubrique sont toutes du staff, et qui les lit a passé la garde :
  // pas de filtre de droit à refaire ici.
  const tabs = ESPACES.flatMap((e) => (e.acces === "admin" ? e.liens : [])).filter((l) => l.groupe === rubrique);
  if (tabs.length < 2) return null;

  /* DEUX ONGLETS PEUVENT VISER LA MÊME PAGE (les sections de /staff, `?section=`).
     L'onglet actif est celui dont TOUS les paramètres sont
     dans l'adresse, le plus précis l'emportant — sinon les deux s'allumaient ensemble. */
  const precision = (href: string) => {
    const [chemin, requete = ""] = href.split("?");
    if (pathname !== chemin) return -1;
    const attendus = [...new URLSearchParams(requete).entries()];
    return attendus.every(([k, v]) => recherche?.get(k) === v) ? attendus.length : -1;
  };
  const meilleure = Math.max(...tabs.map((t) => precision(t.href)));
  return (
    <div className="vg-subtabs">
      {tabs.map((t) => {
        const active = meilleure >= 0 && precision(t.href) === meilleure;
        return (
          <Link key={t.href} href={t.href} className={`vg-subtab ${active ? "active" : ""}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
