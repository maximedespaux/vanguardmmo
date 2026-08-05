"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { canAccessGuild } from "@/config/roles";
import { Icon } from "@/components/Icon";
import type { Role } from "@prisma/client";

/**
 * La première chose à faire quand on entre dans la guilde : dire qui on joue.
 *
 * Sans personnage enregistré, un membre est invisible pour tout ce qui compte —
 * les compositions de Chambres Secrètes ne peuvent pas le placer, une demande
 * ne sait pas à qui envoyer l'objet, et le staff ne voit ni sa classe ni son
 * stuff. Ça ne se devine pas : personne n'ouvre spontanément « Mes
 * personnages » un jour de première connexion. D'où cette fenêtre, une fois.
 *
 * Elle ne s'affiche QUE si les trois conditions sont réunies : membre de la
 * guilde (un membre du serveur n'a rien à déclarer), aucun personnage en base,
 * et pas déjà écartée. « Plus tard » est un vrai choix, gardé sur l'appareil :
 * on invite, on ne séquestre pas.
 */
const CLEF = "vg_accueil_persos";

export function AccueilPersonnages() {
  const { data: session } = useSession();
  const role = ((session?.user as { role?: Role } | undefined)?.role ?? "RECRUE") as Role;
  const deLaGuilde = canAccessGuild(role) || process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!deLaGuilde) return;
    try { if (localStorage.getItem(CLEF)) return; } catch { /* stockage refusé : on tentera la prochaine fois */ }
    let vivant = true;
    fetch("/api/characters")
      .then((r) => (r.ok ? r.json() : null))
      .then((cs: unknown[] | null) => { if (vivant && Array.isArray(cs) && cs.length === 0) setOuvert(true); })
      .catch(() => {});
    return () => { vivant = false; };
  }, [deLaGuilde]);

  const fermer = () => {
    setOuvert(false);
    try { localStorage.setItem(CLEF, "1"); } catch { /* sans stockage, elle reviendra — tant pis */ }
  };

  if (!ouvert) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ap-titre" onClick={fermer}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,8,11,.72)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass-card"
        style={{ width: "100%", maxWidth: 460, padding: "26px 24px 22px", borderColor: "rgba(255,140,26,.34)", boxShadow: "0 26px 70px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 12, background: "rgba(255,140,26,.12)", border: "1px solid rgba(255,140,26,.32)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--orange)" }}>
            <Icon name="users" size={23} />
          </span>
          <div>
            <h2 id="ap-titre" className="font-heading" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Commence par tes personnages</h2>
            <span style={{ fontSize: 11.5, color: "var(--orange)", textTransform: "uppercase", letterSpacing: .8 }}>Bienvenue dans Vanguard</span>
          </div>
        </div>

        <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 16px" }}>
          Déclare tes persos — nom, classe, prestige — puis monte leur stuff sur l&apos;<b style={{ color: "var(--text)" }}>AirBuilder</b>.
          C&apos;est ce qui permet aux Chambres Secrètes de te placer au bon poste, aux demandes de savoir
          à qui envoyer un objet, et au staff de voir avec quoi tu joues. Cinq minutes, une fois.
        </p>

        <div style={{ display: "grid", gap: 8 }}>
          <Link href="/personnages" onClick={fermer} className="vg-btn" style={{ justifyContent: "center" }}>
            <Icon name="user-plus" size={16} />Créer mes personnages
          </Link>
          <Link href="/builder" onClick={fermer}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 14px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}>
            <Icon name="shirt" size={16} />Monter mon stuff sur l&apos;AirBuilder
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
