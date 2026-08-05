"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/Icon";

/**
 * Le pas suivant, en bas d'une page ouverte à tous.
 *
 * Ces pages existent pour être trouvées depuis un moteur de recherche : un
 * joueur d'AirFlyff cherche « donjon niveau 120 », lit la réponse, et repart.
 * Cet encart est le seul endroit qui lui dit qu'il y a autre chose derrière —
 * et il ne s'affiche QUE pour un visiteur non connecté : un membre n'a pas
 * besoin qu'on lui propose de rejoindre ce qu'il a déjà rejoint.
 *
 * Le lien vient du bot (obtenirInvitation). Pas de lien, pas d'encart : mieux
 * vaut rien qu'un bouton mort.
 */
export function EncartRejoindre() {
  const { data: session, status } = useSession();
  const [invite, setInvite] = useState("");

  useEffect(() => {
    if (status !== "unauthenticated") return;
    let vivant = true;
    fetch("/api/discord/invite", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (vivant && j?.url) setInvite(String(j.url)); })
      .catch(() => {});
    return () => { vivant = false; };
  }, [status]);

  if (session || status === "loading") return null;

  return (
    <div className="glass-card" style={{ marginTop: 26, padding: "20px 22px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", borderColor: "rgba(255,140,26,.3)" }}>
      <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: "rgba(255,140,26,.12)", border: "1px solid rgba(255,140,26,.32)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--orange)" }}>
        <Icon name="discord" size={22} />
      </span>
      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
        <div className="font-heading" style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Le reste du site est réservé aux membres</div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Ton stuff sur l&apos;AirBuilder, le coffre de guilde, les quêtes, les compositions de Chambres Secrètes.
          Rejoins le Discord Vanguard, connecte-toi, et tout s&apos;ouvre.
        </div>
      </div>
      {invite && (
        <a className="vg-btn" href={invite} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
          <Icon name="discord" size={16} />Rejoindre le Discord
        </a>
      )}
    </div>
  );
}
