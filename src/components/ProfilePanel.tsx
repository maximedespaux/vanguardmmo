"use client";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

/** Panneau profil déroulant (haut-droite) : identité + raccourcis persos + déconnexion.
 *  Remplace la page « Paramètres » du menu. */
const ROLE_META: Record<string, { label: string; color: string; badge: string }> = {
  DIRECTION: { label: "Direction", color: "var(--red)", badge: "fondateur" },
  VANGUARD: { label: "Vanguard", color: "var(--gold)", badge: "fondateur" },
  GENERAL: { label: "Général", color: "var(--orange)", badge: "brasdroit" },
  OFFICIER: { label: "Officier", color: "var(--orange)", badge: "brasdroit" },
  VETERAN: { label: "Vétéran", color: "var(--blue)", badge: "guilde" },
  GUARD: { label: "Guard", color: "var(--blue)", badge: "guilde" },
  RECRUE: { label: "Recrue", color: "var(--text-muted)", badge: "public" },
};

// Raccourcis vers les affaires perso du membre.
const SHORTCUTS: { icon: IconName; label: string; href: string }[] = [
  { icon: "users", label: "Mes personnages", href: "/personnages" },
  { icon: "sword", label: "Mon build", href: "/builder" },
  { icon: "coins", label: "Mes dettes", href: "/dettes" },
  { icon: "moon", label: "Mes absences", href: "/absences" },
];

export function ProfilePanel({ devAll = false }: { devAll?: boolean }) {
  const { data: session } = useSession();
  const u = session?.user as any;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const dev = devAll || !u?.discordId;
  const r = ROLE_META[u?.role as string] ?? (dev ? ROLE_META.VANGUARD : ROLE_META.RECRUE);
  const name = u?.name ?? u?.discordName ?? (dev ? "Maxime (dev)" : "Membre");

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Profil" aria-expanded={open} style={{ display: "flex", alignItems: "center", gap: 9, background: open ? "rgba(255,140,26,.1)" : "none", border: `1px solid ${open ? "rgba(255,140,26,.4)" : "transparent"}`, borderRadius: 10, padding: "4px 9px 4px 5px", cursor: "pointer", transition: "background .15s, border-color .15s" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/site/ranks/${r.badge}.png`} alt={r.label} style={{ height: 30, width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 6px rgba(255,140,26,.4))" }} />
        <span style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", fontWeight: 600, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
        <Icon name="chevron-right" size={13} style={{ color: "var(--text-muted)", transform: open ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform .18s" }} />
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 9px)", right: 0, width: 288, maxWidth: "calc(100vw - 24px)", background: "linear-gradient(180deg,#191920,#121217)", border: "1px solid #2f2f3a", borderTop: "2px solid var(--orange)", borderRadius: "0 0 14px 14px", boxShadow: "0 18px 44px rgba(0,0,0,.6)", zIndex: 50, overflow: "hidden", animation: "vgdrop .16s ease" }}>
          {/* Identité */}
          <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "16px 16px 14px", background: `linear-gradient(90deg, color-mix(in srgb, ${r.color} 12%, transparent), transparent 70%)`, borderBottom: "1px solid var(--border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/assets/site/ranks/${r.badge}.png`} alt={r.label} style={{ width: 48, height: 48, objectFit: "contain", flexShrink: 0, filter: `drop-shadow(0 0 8px color-mix(in srgb, ${r.color} 55%, transparent))` }} />
            <div style={{ minWidth: 0 }}>
              <div className="font-heading" style={{ fontSize: 16, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: r.color, textTransform: "uppercase", letterSpacing: 0.6 }}>{r.label}{dev ? " · dev" : ""}</span>
            </div>
          </div>

          {u?.discordId && (
            <div style={{ padding: "10px 16px", fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 6, alignItems: "center", borderBottom: "1px solid var(--border)" }}>
              <span>Discord ID</span><span style={{ fontFamily: "monospace", color: "var(--text)", background: "var(--bg-3)", borderRadius: 6, padding: "2px 7px", fontSize: 10.5 }}>{u.discordId}</span>
            </div>
          )}

          {/* Raccourcis persos */}
          <div style={{ padding: "10px 10px 7px" }}>
            <div className="font-heading" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: "var(--text-muted)", padding: "0 4px 5px", display: "flex", alignItems: "center", gap: 6 }}><Icon name="link" size={12} /> Raccourcis</div>
            {SHORTCUTS.map((s) => (
              <Link key={s.href} href={s.href} onClick={() => setOpen(false)} className="vg-prof-link" style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px", borderRadius: 9, textDecoration: "none", color: "var(--text)" }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--orange)", flexShrink: 0 }}><Icon name={s.icon} size={16} /></span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                <Icon name="chevron-right" size={13} style={{ color: "var(--text-muted)" }} />
              </Link>
            ))}
          </div>

          {u?.discordId && (
            <div style={{ padding: "8px 12px 12px", borderTop: "1px solid var(--border)" }}>
              <button onClick={() => signOut()} className="vg-prof-logout" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--red)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}><Icon name="power" size={16} /> Se déconnecter</button>
            </div>
          )}

          <style>{`.vg-prof-link{transition:background .13s,transform .1s}.vg-prof-link:hover{background:rgba(255,140,26,.1);transform:translateX(2px)}.vg-prof-logout:hover{border-color:var(--red);background:rgba(248,113,113,.08)}`}</style>
        </div>
      )}
    </div>
  );
}
