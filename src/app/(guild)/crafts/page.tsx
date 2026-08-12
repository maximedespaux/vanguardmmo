import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { Atelier } from "@/components/crafts/Atelier";

/**
 * LES CRAFTS — la demande la plus ancienne de Maxime, et la dernière à avoir eu
 * une page.
 *
 * Le site savait déjà nommer 13 000 objets sans jamais dire comment on en
 * fabrique un. Les recettes AirFlyff avaient été déclarées « côté serveur » lors
 * d'une passe précédente : c'est faux pour une bonne moitié d'entre elles, et la
 * conclusion a coûté des mois d'attente. Elles sont dans le client, à deux
 * endroits qu'on ne regardait pas — le fichier d'échange des PNJ pour les
 * quantités et les statuts, les descriptions françaises des ingrédients pour
 * l'arbre du farm.
 *
 * Réservée à la guilde, pour la même raison que /astuces-guilde : la page dit
 * quelles recettes sont ÉTEINTES, c'est-à-dire pour lesquelles la concurrence
 * farme dans le vide.
 *
 * La page est un composant serveur ; tout l'écran vit dans <Atelier />, qui va
 * chercher la donnée sur /api/crafts (gardée par apiGuild). Le relevé ne part
 * donc pas dans un fichier JS statique servi à qui connaît l'adresse.
 */
export const metadata: Metadata = {
  title: "Crafts et PNJ d’échange — Vanguard",
  // Réservée : ni dans un moteur de recherche, ni résumée dans un aperçu de lien
  // collé sur un Discord public.
  robots: { index: false, follow: false },
};

export default function CraftsPage() {
  return (
    <>
      <PageHeader icon="hammer" title="Les crafts"
        subtitle="834 échanges de PNJ relevés dans le client, et les 39 arbres de craft maison — avec les quantités, les statuts, et où farmer chaque morceau."
        right={
          <span style={{ fontSize: 11.5, color: "var(--text-muted)", textAlign: "right", lineHeight: 1.5 }}>
            client d’octobre 2025<br />
            <span style={{ opacity: 0.75 }}>Exchange_Script + descriptions</span>
          </span>
        } />
      <Atelier />
    </>
  );
}
