"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { canAccessAdmin, canAccessGuild } from "@/config/roles";
import { ESPACES, HORS_ESPACES, type Acces } from "@/config/nav";
import type { Role } from "@prisma/client";

/**
 * Toutes les pages du site, en clair.
 *
 * Le filet de sécurité de la navigation : quand on ne sait pas sous quel espace
 * une chose est rangée, on ne devine pas — on vient ici et on lit. C'est aussi
 * ce qui rattrape les écrans qu'on n'ouvre qu'une fois par an et dont personne
 * ne se rappelle le nom.
 */
export default function SommairePage() {
  useCardFx();
  const { data: session } = useSession();
  const role = (session?.user as { role?: Role } | undefined)?.role ?? "RECRUE";
  const devAll = process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";
  const has = (a: Acces) => (devAll ? true : a === "public" ? true : a === "guild" ? canAccessGuild(role) : canAccessAdmin(role));

  const espaces = ESPACES.map((e) => ({ ...e, liens: e.liens.filter((l) => has(l.acces ?? e.acces)) })).filter(
    (e) => has(e.acces) && e.liens.length
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader icon="grid" title="Tout le site" subtitle="Chaque page, avec ce qu'on y fait. Si tu ne sais pas où chercher, c'est ici." />

      {espaces.map((e) => (
        <section key={e.label} style={{ marginBottom: 26 }}>
          <h2 className="font-heading" style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--orange)", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon name={e.icon} size={16} />{e.label}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 10 }}>
            {e.liens.map((l) => (
              <Link key={l.href} href={l.href} className="glass-card fx-card" style={{ display: "flex", gap: 11, padding: 13, borderRadius: 12, textDecoration: "none", color: "inherit" }}>
                <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--orange)" }}>
                  <Icon name={l.icon} size={17} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{l.label}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.35 }}>{l.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="font-heading" style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 12 }}>Le reste</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 10 }}>
          {HORS_ESPACES.filter((l) => has(l.acces ?? "public")).map((l) => (
            <Link key={l.href} href={l.href} className="glass-card fx-card" style={{ display: "flex", gap: 11, padding: 13, borderRadius: 12, textDecoration: "none", color: "inherit" }}>
              <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--orange)" }}>
                <Icon name={l.icon} size={17} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{l.label}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.35 }}>{l.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
