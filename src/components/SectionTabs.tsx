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
  discord: [
    { label: "Pilotage", href: "/discord" },
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
