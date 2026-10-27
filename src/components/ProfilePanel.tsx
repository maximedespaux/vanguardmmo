"use client";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { canAccessGuild } from "@/config/roles";
import type { Role } from "@prisma/client";
import { DEV_ROLE } from "@/lib/devAccess";
import { lienBuilder } from "@/lib/mesPersos";

/** Panneau profil déroulant (haut-droite) : identité + raccourcis persos + déconnexion.
 *  Remplace la page « Paramètres » du menu. */
const ROLE_META: Record<string, { label: string; color: string; badge: string }> = {
  DIRECTION: { label: "Direction", color: "var(--red)", badge: "fondateur" },
  VANGUARD: { label: "Vanguard", color: "var(--gold)", badge: "fondateur" },
  GENERAL: { label: "Général", color: "var(--gn-accent)", badge: "brasdroit" },
  OFFICIER: { label: "Officier", color: "var(--gn-accent)", badge: "brasdroit" },
  VETERAN: { label: "Vétéran", color: "var(--blue)", badge: "guilde" },
  GUARD: { label: "Guard", color: "var(--blue)", badge: "guilde" },
  RECRUE: { label: "Recrue", color: "var(--text-muted)", badge: "public" },
  /* Pas un rang : un compte hors guilde qui porte le rôle Discord Friend (config/amis.ts).
     Il était « Recrue », le mot d'un candidat — un ami n'a rien demandé. */
  AMI: { label: "Ami", color: "var(--text-muted)", badge: "public" },
};

// Raccourcis vers les affaires perso du membre. `guilde` : la page refuse un
// candidat, qui ne garde donc que ce que sa candidature lui demande (ses persos,
// son build) au lieu d'un lien qui le renvoyait à l'accueil. « Mes demandes » et
// « Mes ventes » sont partis avec la Boutique, le 2026-10-21.
const SHORTCUTS: { icon: IconName; label: string; href: string; guilde?: true }[] = [
  { icon: "users", label: "Mes personnages", href: "/personnages" },
  { icon: "sword", label: "Mon build", href: "/builder" },
  { icon: "moon", label: "Mes absences", href: "/absences", guilde: true },
];

/** Ce que /api/profil renvoie, réduit à ce que le panneau affiche. */
type EtatProfil = {
  compteurs: { personnages: number; stuffs: number };
};

/** `role` : celui que la barre montre (la session, ou DEV_ROLE en local). `ami` : le rôle
 *  Friend lui ouvre des espaces, et il n'est pas de la guilde (Shell le calcule). */
export function ProfilePanel({ devAll = false, role, ami = false }: { devAll?: boolean; role?: Role; ami?: boolean }) {
  const { data: session } = useSession();
  const u = session?.user as any;
  const vu: Role = role ?? (u?.role as Role) ?? "RECRUE";
  const [open, setOpen] = useState(false);
  /* Le pseudo EN JEU du personnage principal, EN LECTURE (2026-10-21). Il se corrigeait
     ici, par PATCH /api/characters/[id] : la synchro de l'AirBuilder, qui recrée tout
     le compte à chaque changement, le défaisait aussitôt. L'AirBuilder est la seule
     source : le panneau montre le pseudo et mène au perso dans le builder.
     `null` = pas encore lu ; `false` = lu, aucun perso. */
  const [principal, setPrincipal] = useState<{ name: string } | false | null>(null);
  /** Où j'en suis : chargé à la PREMIÈRE ouverture du panneau, pas au montage.
   *  Le panneau est dans l'en-tête de toutes les pages — l'interroger à chaque
   *  rendu ferait une requête par page visitée, pour une information que la
   *  plupart du temps personne ne regarde. */
  const [etat, setEtat] = useState<EtatProfil | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || etat) return;
    fetch("/api/profil").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setEtat(d); }).catch(() => {});
  }, [open, etat]);

  useEffect(() => {
    if (!open || principal !== null) return;
    fetch("/api/characters").then((r) => (r.ok ? r.json() : null))
      .then((cs: { name: string; isMain: boolean }[] | null) => {
        if (!Array.isArray(cs)) return;
        const p = cs.find((c) => c.isMain) ?? cs[0];
        setPrincipal(p ? { name: p.name } : false);
      }).catch(() => {});
  }, [open, principal]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const dev = devAll || !u?.discordId;
  // Un rôle simulé porte son propre badge : c'est tout ce qu'on vient vérifier.
  const r = (ami ? ROLE_META.AMI : DEV_ROLE ? ROLE_META[vu] : ROLE_META[u?.role as string]) ?? (dev ? ROLE_META.VANGUARD : ROLE_META.RECRUE);
  const name = u?.name ?? u?.discordName ?? (dev ? "Maxime (dev)" : "Membre");

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Profil" aria-expanded={open} style={{ display: "flex", alignItems: "center", gap: 9, background: open ? "rgba(var(--gn-lueur-rgb),.1)" : "none", border: `1px solid ${open ? "rgba(var(--gn-or-rgb),.4)" : "transparent"}`, borderRadius: 10, padding: "4px 9px 4px 5px", cursor: "pointer", transition: "background .15s, border-color .15s" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/site/ranks/${r.badge}.webp`} alt={r.label} style={{ height: 30, width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 6px rgba(var(--gn-lueur-rgb),.4))" }} />
        <span className="vg-prof-nom" style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", fontWeight: 600, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
        <Icon name="chevron-right" size={13} style={{ color: "var(--text-muted)", transform: open ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform .18s" }} />
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 9px)", right: 0, width: 288, maxWidth: "calc(100vw - 24px)", background: "linear-gradient(180deg,#191920,#121217)", border: "1px solid #2f2f3a", borderTop: "2px solid var(--gn-accent)", borderRadius: "0 0 14px 14px", boxShadow: "0 18px 44px rgba(0,0,0,.6)", zIndex: 50, overflow: "hidden", animation: "vgdrop .16s ease" }}>
          {/* Identité */}
          <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "16px 16px 14px", background: `linear-gradient(90deg, color-mix(in srgb, ${r.color} 12%, transparent), transparent 70%)`, borderBottom: "1px solid var(--border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/assets/site/ranks/${r.badge}.webp`} alt={r.label} style={{ width: 48, height: 48, objectFit: "contain", flexShrink: 0, filter: `drop-shadow(0 0 8px color-mix(in srgb, ${r.color} 55%, transparent))` }} />
            <div style={{ minWidth: 0 }}>
              <div className="font-heading" style={{ fontSize: 16, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: r.color, textTransform: "uppercase", letterSpacing: 0.6 }}>{r.label}{dev ? " · dev" : ""}</span>
            </div>
          </div>


          {/* Ce qui vient du compte Discord, et qui ne se change pas ici. */}
          <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", display: "grid", gap: 6 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "var(--text-muted)" }}>
              <span style={{ minWidth: 66 }}>Discord</span>
              <span style={{ color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
            </div>
            {u?.discordId && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "var(--text-muted)" }}>
                <span style={{ minWidth: 66 }}>Identifiant</span>
                <span style={{ fontFamily: "monospace", color: "var(--text)", background: "var(--bg-3)", borderRadius: 6, padding: "2px 7px", fontSize: 11.5 }}>{u.discordId}</span>
              </div>
            )}
          </div>

          {/* Le perso principal, en lecture : il se renomme et se choisit dans
              l'AirBuilder, et le lien y mène sur ce perso (lien profond). */}
          <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 6 }}>
              Pseudo en jeu — perso principal
            </div>
            {/* La case du pseudo (même fond, filet, rayon, taille), devenue une ligne
                qu'on lit ; le bouton à sa droite garde sa place et mène au builder. */}
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ flex: 1, minWidth: 0, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: principal ? "var(--text)" : "var(--text-muted)", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {principal ? principal.name : principal === false ? "Aucun personnage" : "…"}
              </span>
              <Link href={principal ? lienBuilder(principal.name) : "/builder"} onClick={() => setOpen(false)}
                aria-label={principal ? "Modifier ce perso dans l'AirBuilder" : "Créer mon perso dans l'AirBuilder"}
                title={principal ? "Modifier dans l'AirBuilder" : "Créer dans l'AirBuilder"}
                style={{ flexShrink: 0, width: 34, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--gn-accent)" }}>
                <Icon name="shirt" size={14} />
              </Link>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 5, lineHeight: 1.45 }}>
              {principal === false
                ? "Crée ton perso dans l'AirBuilder : c'est lui que la guilde retrouvera."
                : "Le nom sous lequel la guilde te retrouve en jeu. Il se change dans l'AirBuilder."}
            </div>
          </div>

          {/* Où j'en suis. Le panneau était une porte : il donnait accès à quatre écrans
              sans jamais rien dire. Les chiffres tiennent ici, le détail reste sur les
              pages. Chargé à l'ouverture seulement. */}
          {etat && (
            <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 8 }}>Où j&apos;en suis</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6, marginBottom: 9 }}>
                {[
                  { n: etat.compteurs.personnages, l: "personnage" + (etat.compteurs.personnages > 1 ? "s" : ""), fort: false },
                  { n: etat.compteurs.stuffs, l: "stuff" + (etat.compteurs.stuffs > 1 ? "s" : ""), fort: false },
                ].map((k) => (
                  <div key={k.l} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.15, fontVariantNumeric: "tabular-nums", color: k.fort ? "var(--gn-accent)" : "var(--text)" }}>{k.n}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.3 }}>{k.l}</div>
                  </div>
                ))}
              </div>
              <Link href="/profil" onClick={() => setOpen(false)} style={{ display: "block", fontSize: 11.5, color: "var(--gn-accent)", textDecoration: "none", paddingTop: 2 }}>
                Tout mon profil →
              </Link>
            </div>
          )}

          {/* Raccourcis persos */}
          <div style={{ padding: "10px 10px 7px" }}>
            <div className="font-heading" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, color: "var(--text-muted)", padding: "0 4px 5px", display: "flex", alignItems: "center", gap: 6 }}><Icon name="link" size={12} /> Raccourcis</div>
            {SHORTCUTS.filter((s) => !s.guilde || devAll || canAccessGuild(vu)).map((s) => (
              <Link key={s.href} href={s.href} onClick={() => setOpen(false)} className="vg-prof-link" style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px", borderRadius: 9, textDecoration: "none", color: "var(--text)" }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gn-accent)", flexShrink: 0 }}><Icon name={s.icon} size={16} /></span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                <Icon name="chevron-right" size={13} style={{ color: "var(--text-muted)" }} />
              </Link>
            ))}
          </div>

          {/* Se deconnecter n'est plus sous condition. Il l'etait de `discordId`,
              qui vaut la chaine vide sur un jeton emis avant son ajout ; puis de
              la session, absente en mode dev. Deux fois le bouton disparaissait.
              Or ce panneau ne s'ouvre QUE pour quelqu'un de connecte : la
              condition est deja remplie par sa presence a l'ecran. */}
          <div style={{ padding: "8px 12px 12px", borderTop: "1px solid var(--border)" }}>
              <button onClick={() => signOut()} className="vg-prof-logout" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--red)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}><Icon name="power" size={16} /> Se déconnecter</button>
          </div>

          <style>{`.vg-prof-link{transition:background .13s,transform .1s}.vg-prof-link:hover{background:rgba(var(--gn-lueur-rgb),.1);transform:translateX(2px)}.vg-prof-logout:hover{border-color:var(--red);background:rgba(248,113,113,.08)}`}</style>
        </div>
      )}
    </div>
  );
}
