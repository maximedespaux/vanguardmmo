"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * Un avatar, rond, avec un repli quand l'image manque.
 *
 * Il portait un cadre de rang colore par le niveau : le systeme d'XP a ete
 * retire, le cadre n'avait plus rien a dire. Reste ce dont les listes ont
 * besoin — reconnaitre quelqu'un d'un coup d'oeil.
 *
 * LE REPLI VAUT AUSSI POUR UNE IMAGE QUI NE CHARGE PAS. L'avatar est une adresse du CDN
 * de Discord bâtie sur le hash lu à la connexion : quand le joueur change d'avatar, l'ancien
 * hash répond 404, et le navigateur peignait l'icône d'image cassée avec le texte de
 * remplacement par-dessus (constaté sur Information Guilde, 2026-10-21).
 */
export function AvatarCadre({ src, nom, taille = 56 }: {
  src?: string | null;
  nom?: string | null;
  taille?: number;
}) {
  const [casse, setCasse] = useState<string | null>(null);
  const bordure = Math.max(2, Math.round(taille / 22));
  const interieur = taille - bordure * 2;
  return (
    <span
      title={nom ?? undefined}
      style={{
        width: taille, height: taille, borderRadius: "50%", padding: bordure, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg,#3a3a46,#23232c)",
      }}
    >
      {src && casse !== src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt={nom ?? ""} onError={() => setCasse(src)} style={{ width: interieur, height: interieur, borderRadius: "50%", objectFit: "cover", display: "block" }} />
      ) : (
        <span style={{ width: interieur, height: interieur, borderRadius: "50%", background: "var(--bg-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
          <Icon name="user" size={Math.round(interieur * 0.55)} />
        </span>
      )}
    </span>
  );
}
