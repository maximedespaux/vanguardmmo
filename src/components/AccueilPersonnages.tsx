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
  /* Le pseudo EN JEU du personnage principal, demandé ici plutôt que renvoyé
     vers un formulaire. C'est la seule information dont le site a besoin tout
     de suite : une demande boutique ne sait pas où envoyer l'objet sans lui, et
     le GuildViewer n'affiche qu'un compte Discord sans nom de perso. Le reste —
     classe, niveau, prestige — se règle ensuite sur « Mes personnages ». */
  const [pseudo, setPseudo] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

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

  const enregistrer = async () => {
    const nom = pseudo.trim();
    if (!nom) { setErreur("Indique le pseudo de ton personnage principal."); return; }
    setEnvoi(true); setErreur("");
    try {
      const r = await fetch("/api/characters", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nom, isMain: true }),
      });
      if (!r.ok) { setErreur((await r.json().catch(() => ({})))?.error ?? "Enregistrement impossible."); setEnvoi(false); return; }
      fermer();
      window.location.href = "/personnages";
    } catch { setErreur("Impossible de joindre le serveur."); setEnvoi(false); }
  };

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
          Commence par le <b style={{ color: "var(--text)" }}>pseudo en jeu</b> de ton personnage principal.
          C&apos;est lui qui permet aux Chambres Secrètes de te placer, aux demandes boutique de savoir à qui
          envoyer l&apos;objet, et au GuildViewer de t&apos;afficher autrement que par ton compte Discord.
        </p>

        {/* Le champ plutôt qu'un lien : renvoyer vers un formulaire pour une
            seule ligne, c'est perdre la moitié des gens en route. */}
        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)", marginBottom: 5 }}>
            Pseudo en jeu — personnage principal
          </span>
          <input autoFocus value={pseudo} onChange={(e) => { setPseudo(e.target.value); setErreur(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") enregistrer(); }}
            placeholder="ex. Daiisuke" maxLength={80}
            style={{ width: "100%", background: "var(--bg-3)", border: `1px solid ${erreur ? "var(--red)" : "var(--border)"}`, borderRadius: 10, padding: "11px 13px", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
          <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 5, lineHeight: 1.45 }}>
            Classe, niveau et prestige se règlent juste après. Tu pourras le modifier depuis ton profil.
          </span>
        </label>

        {erreur && <div style={{ fontSize: 12.5, color: "var(--red)", marginBottom: 10 }}>{erreur}</div>}

        <div style={{ display: "grid", gap: 8 }}>
          <button onClick={enregistrer} disabled={envoi} className="vg-btn" style={{ justifyContent: "center", opacity: envoi ? .6 : 1 }}>
            <Icon name="user-plus" size={16} />{envoi ? "Enregistrement…" : "Enregistrer et continuer"}
          </button>
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
