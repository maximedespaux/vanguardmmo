"use client";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { canAccessAdmin } from "@/config/roles";
import type { Role } from "@prisma/client";

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
  { icon: "message", label: "Mes demandes", href: "/messages" },

  { icon: "moon", label: "Mes absences", href: "/absences" },
];

/** Le detail marchand est une affaire d'encadrement : le raccourci ne s'affiche
 *  qu'au staff, comme la page elle-meme. */
const VENTES: { icon: IconName; label: string; href: string } = { icon: "coins", label: "Mes ventes", href: "/mes-ventes" };

/** Ce que /api/profil renvoie, réduit à ce que le panneau affiche. */
type EtatProfil = {
  compteurs: { commandes: number; enCours: number; personnages: number; stuffs: number };
  commandes: { id: string; statut: string; lignes: { item: string | null }[] }[];
};

/** L'état d'une commande, dit du point de vue de celui qui l'a passée. Court, parce
 *  qu'il s'affiche dans une largeur de 288 px. */
const ETATS: Record<string, { txt: string; couleur: string }> = {
  PENDING: { txt: "en attente", couleur: "var(--gold)" },
  ACCEPTE_ACHAT: { txt: "à récupérer", couleur: "var(--green)" },
  ACCEPTE_DETTE: { txt: "à régler", couleur: "var(--green)" },
  EN_ECHANGE: { txt: "en échange", couleur: "var(--blue)" },
  REMIS: { txt: "remise", couleur: "var(--text-muted)" },
  REFUSE: { txt: "refusée", couleur: "var(--red)" },
  ANNULE: { txt: "annulée", couleur: "var(--text-muted)" },
};

export function ProfilePanel({ devAll = false }: { devAll?: boolean }) {
  const { data: session } = useSession();
  const u = session?.user as any;
  const [open, setOpen] = useState(false);
  /* Le pseudo EN JEU du personnage principal. Le nom Discord et l'identifiant
     viennent du compte : ils ne se modifient pas ici, et les afficher grisés
     evite qu'on les cherche ailleurs. Le pseudo, lui, est la seule chose que le
     membre doit pouvoir corriger — c'est l'adresse ou partent ses objets. */
  const [principal, setPrincipal] = useState<{ id: string; name: string } | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [etatPseudo, setEtatPseudo] = useState<"" | "envoi" | "ok" | "erreur">("");
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
    if (!open || principal) return;
    fetch("/api/characters").then((r) => (r.ok ? r.json() : null))
      .then((cs: { id: string; name: string; isMain: boolean }[] | null) => {
        const p = cs?.find((c) => c.isMain) ?? cs?.[0];
        if (p) { setPrincipal({ id: p.id, name: p.name }); setPseudo(p.name); }
      }).catch(() => {});
  }, [open, principal]);

  const enregistrerPseudo = async () => {
    const nom = pseudo.trim();
    if (!nom || nom === principal?.name) return;
    setEtatPseudo("envoi");
    try {
      const r = principal
        ? await fetch(`/api/characters/${principal.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nom }),
          })
        : await fetch("/api/characters", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nom, isMain: true }),
          });
      if (!r.ok) { setEtatPseudo("erreur"); return; }
      const j = await r.json().catch(() => null);
      setPrincipal({ id: j?.id ?? principal?.id ?? "", name: nom });
      setEtatPseudo("ok");
      setTimeout(() => setEtatPseudo(""), 2200);
    } catch { setEtatPseudo("erreur"); }
  };

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
        <img src={`/assets/site/ranks/${r.badge}.webp`} alt={r.label} style={{ height: 30, width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 6px rgba(255,140,26,.4))" }} />
        <span className="vg-prof-nom" style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", fontWeight: 600, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
        <Icon name="chevron-right" size={13} style={{ color: "var(--text-muted)", transform: open ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform .18s" }} />
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 9px)", right: 0, width: 288, maxWidth: "calc(100vw - 24px)", background: "linear-gradient(180deg,#191920,#121217)", border: "1px solid #2f2f3a", borderTop: "2px solid var(--orange)", borderRadius: "0 0 14px 14px", boxShadow: "0 18px 44px rgba(0,0,0,.6)", zIndex: 50, overflow: "hidden", animation: "vgdrop .16s ease" }}>
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

          {/* La seule ligne modifiable : c'est l'adresse où partent les objets. */}
          <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 6 }}>
              Pseudo en jeu — perso principal
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={pseudo} onChange={(e) => { setPseudo(e.target.value); setEtatPseudo(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") enregistrerPseudo(); }}
                placeholder="ex. Daiisuke" maxLength={80} aria-label="Pseudo en jeu du personnage principal"
                style={{ flex: 1, minWidth: 0, background: "var(--bg-3)", border: `1px solid ${etatPseudo === "erreur" ? "var(--red)" : etatPseudo === "ok" ? "var(--green)" : "var(--border)"}`, borderRadius: 8, padding: "7px 10px", color: "var(--text)", fontSize: 12.5, fontFamily: "inherit" }} />
              <button onClick={enregistrerPseudo}
                disabled={etatPseudo === "envoi" || !pseudo.trim() || pseudo.trim() === principal?.name}
                aria-label="Enregistrer le pseudo"
                style={{ flexShrink: 0, width: 34, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: pseudo.trim() && pseudo.trim() !== principal?.name ? "var(--orange)" : "var(--text-muted)", cursor: pseudo.trim() && pseudo.trim() !== principal?.name ? "pointer" : "default" }}>
                <Icon name={etatPseudo === "ok" ? "check" : "save"} size={14} />
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: etatPseudo === "erreur" ? "var(--red)" : "var(--text-muted)", marginTop: 5, lineHeight: 1.45 }}>
              {etatPseudo === "erreur" ? "Enregistrement impossible — réessaie."
                : etatPseudo === "ok" ? "Pseudo enregistré."
                : "Nécessaire pour les demandes à la boutique : c'est là que l'objet t'est envoyé par courrier."}
            </div>
          </div>

          {/* Où j'en suis. Le panneau était une porte : il donnait accès à quatre écrans
              sans jamais rien dire. Un membre l'ouvrait pour savoir où en était sa
              commande, et devait aller voir ailleurs. Les chiffres tiennent ici, le
              détail reste sur les pages. Chargé à l'ouverture seulement. */}
          {etat && (
            <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 8 }}>Où j&apos;en suis</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: etat.commandes.length ? 9 : 0 }}>
                {[
                  { n: etat.compteurs.enCours, l: "commande" + (etat.compteurs.enCours > 1 ? "s" : "") + " en cours", fort: etat.compteurs.enCours > 0 },
                  { n: etat.compteurs.personnages, l: "personnage" + (etat.compteurs.personnages > 1 ? "s" : ""), fort: false },
                  { n: etat.compteurs.stuffs, l: "stuff" + (etat.compteurs.stuffs > 1 ? "s" : ""), fort: false },
                ].map((k) => (
                  <div key={k.l} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.15, fontVariantNumeric: "tabular-nums", color: k.fort ? "var(--orange)" : "var(--text)" }}>{k.n}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.3 }}>{k.l}</div>
                  </div>
                ))}
              </div>
              {/* Les deux commandes les plus récentes, avec leur état en clair : c'est
                  la seule chose qu'on vient vraiment vérifier. */}
              {etat.commandes.slice(0, 2).map((c) => {
                const e = ETATS[c.statut] ?? { txt: c.statut, couleur: "var(--text-muted)" };
                return (
                  <Link key={c.id} href="/profil" onClick={() => setOpen(false)}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 8px", borderRadius: 8, textDecoration: "none", background: "var(--bg-3)", border: "1px solid var(--border)", marginBottom: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: e.couleur, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.lignes[0]?.item ?? "Commande"}{c.lignes.length > 1 ? ` +${c.lignes.length - 1}` : ""}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: e.couleur }}>{e.txt}</span>
                  </Link>
                );
              })}
              <Link href="/profil" onClick={() => setOpen(false)} style={{ display: "block", fontSize: 11.5, color: "var(--orange)", textDecoration: "none", paddingTop: 2 }}>
                Tout mon profil →
              </Link>
            </div>
          )}

          {/* Raccourcis persos */}
          <div style={{ padding: "10px 10px 7px" }}>
            <div className="font-heading" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, color: "var(--text-muted)", padding: "0 4px 5px", display: "flex", alignItems: "center", gap: 6 }}><Icon name="link" size={12} /> Raccourcis</div>
            {[...SHORTCUTS, ...(canAccessAdmin((u?.role as Role) ?? "RECRUE") ? [VENTES] : [])].map((s) => (
              <Link key={s.href} href={s.href} onClick={() => setOpen(false)} className="vg-prof-link" style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px", borderRadius: 9, textDecoration: "none", color: "var(--text)" }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--orange)", flexShrink: 0 }}><Icon name={s.icon} size={16} /></span>
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

          <style>{`.vg-prof-link{transition:background .13s,transform .1s}.vg-prof-link:hover{background:rgba(255,140,26,.1);transform:translateX(2px)}.vg-prof-logout:hover{border-color:var(--red);background:rgba(248,113,113,.08)}`}</style>
        </div>
      )}
    </div>
  );
}
