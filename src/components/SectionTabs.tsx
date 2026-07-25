"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  // Tout le pilotage du bot vit sous une seule entree « Bot Discord » : les
  // panneaux restent des pages distinctes, mais partagent cette barre d'onglets
  // pour se comporter comme un seul outil.
  discord: [
    { label: "Pilotage", href: "/discord" },
    { label: "Créneaux", href: "/discord#creneaux" },
    { label: "Events du jeu", href: "/events" },
    { label: "World Boss", href: "/gestion-worldboss" },
    { label: "Annonce", href: "/annonce" },
  ],
};

export function SectionTabs({ section }: { section: string }) {
  const pathname = usePathname();
  const tabs = SECTIONS[section] ?? [];
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
