"use client";
import { useCardFx } from "@/components/VgFx";

/**
 * Le halo des `.fx-card`, posable sur une page qui reste un composant SERVEUR.
 *
 * `useCardFx` est un hook : il exige `"use client"`. Mettre `"use client"` en
 * tête de la page d'astuces réservée serait un contresens — tout son texte
 * partirait alors dans un fichier JS statique de `/_next/static/`, servi à qui
 * connaît l'adresse, sans jamais repasser par `requireGuild()`. Le verrou
 * fermerait la porte et laisserait la fenêtre ouverte.
 *
 * D'où cette coquille : elle seule est cliente, elle ne contient aucun texte, et
 * le contenu qu'on lui passe reste rendu côté serveur — donc protégé.
 */
export function CarteFx({ children }: { children: React.ReactNode }) {
  useCardFx();
  return <>{children}</>;
}
