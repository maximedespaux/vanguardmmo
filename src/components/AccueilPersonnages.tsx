"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessGuild } from "@/config/roles";
import { Icon } from "@/components/Icon";
import type { Role } from "@prisma/client";
import { apresPublication } from "@/lib/mesPersos";

/**
 * La première chose à faire quand on entre dans la guilde : dire qui on joue.
 *
 * Sans personnage enregistré, un membre est invisible pour tout ce qui compte —
 * les compositions de Chambres Secrètes ne peuvent pas le placer, et le staff ne
 * voit ni sa classe ni son stuff. Ça ne se devine pas : personne n'ouvre
 * spontanément l'AirBuilder un jour de première connexion. D'où cette fenêtre, une
 * fois.
 *
 * Elle ne s'affiche QUE si les trois conditions sont réunies : membre de la
 * guilde (un membre du serveur n'a rien à déclarer), aucun personnage en base,
 * et pas déjà écartée. « Plus tard » est un vrai choix, gardé sur l'appareil :
 * on invite, on ne séquestre pas.
 *
 * ELLE N'ENREGISTRE PLUS RIEN (2026-10-21). Elle demandait le pseudo du perso
 * principal et le créait par POST /api/characters — une route partie avec la règle
 * « l'AirBuilder est la seule source » : un perso créé là n'existait pas dans le
 * builder, et sa synchro suivante l'effaçait. (Elle ne marchait d'ailleurs plus :
 * la route exigeait la classe, que la fenêtre n'envoyait pas.) Elle mène donc au
 * builder, qui ouvre de lui-même la création d'un perso quand le compte n'en a
 * aucun. Pas sur /builder : la création s'y ouvre déjà, deux fenêtres l'une sur
 * l'autre ne disent rien de plus.
 */
const CLEF = "vg_accueil_persos";

export function AccueilPersonnages() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = ((session?.user as { role?: Role } | undefined)?.role ?? "RECRUE") as Role;
  const deLaGuilde = canAccessGuild(role) || process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";
  const surLeBuilder = pathname === "/builder" || pathname.startsWith("/builder/");
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!deLaGuilde || surLeBuilder) return;
    try { if (localStorage.getItem(CLEF)) return; } catch { /* stockage refusé : on tentera la prochaine fois */ }
    let vivant = true;
    /* En sortant du builder, où l'on vient peut-être de créer son premier perso : sans
       cette attente, la route répondait « aucun » avant que la synchro ne parte, et la
       fenêtre s'ouvrait sur quelqu'un qui venait de le faire. */
    apresPublication()
      .then(() => fetch("/api/characters"))
      .then((r) => (r.ok ? r.json() : null))
      .then((cs: unknown[] | null) => { if (vivant && Array.isArray(cs) && cs.length === 0) setOuvert(true); })
      .catch(() => {});
    return () => { vivant = false; };
  }, [deLaGuilde, surLeBuilder]);

  const fermer = () => {
    setOuvert(false);
    try { localStorage.setItem(CLEF, "1"); } catch { /* sans stockage, elle reviendra — tant pis */ }
  };

  if (!ouvert || surLeBuilder) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ap-titre" onClick={fermer}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,8,11,.72)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass-card"
        style={{ width: "100%", maxWidth: 460, padding: "26px 24px 22px", borderColor: "rgba(var(--gn-or-rgb),.34)", boxShadow: "0 26px 70px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 12, background: "rgba(var(--gn-lueur-rgb),.12)", border: "1px solid rgba(var(--gn-or-rgb),.32)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gn-accent)" }}>
            <Icon name="users" size={23} />
          </span>
          <div>
            <h2 id="ap-titre" className="font-heading" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Commence par tes personnages</h2>
            <span style={{ fontSize: 11.5, color: "var(--gn-accent)", textTransform: "uppercase", letterSpacing: .8 }}>Bienvenue chez GENESIS</span>
          </div>
        </div>

        <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 16px" }}>
          Tes personnages se créent dans l&apos;<b style={{ color: "var(--text)" }}>AirBuilder</b> : son pseudo en
          jeu, sa classe, son niveau, puis son stuff. Ils partent à la guilde tout seuls — c&apos;est ce qui
          permet aux Chambres Secrètes de te placer, et au staff de te conseiller.
        </p>

        <div style={{ display: "grid", gap: 8 }}>
          <Link href="/builder" onClick={fermer} className="vg-btn" style={{ justifyContent: "center" }}>
            <Icon name="user-plus" size={16} />Créer mon perso dans l&apos;AirBuilder
          </Link>
          <button onClick={fermer}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12.5, fontFamily: "inherit", padding: "6px 0 0" }}>
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
