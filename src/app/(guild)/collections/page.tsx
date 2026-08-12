import { PageHeader } from "@/components/PageHeader";
import { Collections } from "@/components/collections/Collections";

/**
 * /collections — les systèmes « à collectionner » du jeu.
 *
 * Réservée à la guilde comme les autres pages tirées du client : c'est un
 * travail de fouille qu'on partage entre nous, pas une vitrine.
 *
 * La page est mince exprès : tout le contenu est un panneau client, parce que
 * les six volets se filtrent, se cherchent et se calculent à l'écran. Rien à
 * lire en base, donc rien à faire côté serveur — l'en-tête et le titre de
 * l'onglet.
 */
export const metadata = {
  title: "Collections · Vanguard",
  description: "Titres d'honneur, succès, anges, maîtrise d'arme, carnets de cartes et karma PK, relevés dans le client d'AirFlyff.",
};

export default function CollectionsPage() {
  return (
    <div style={{ padding: "24px 32px 56px", maxWidth: 1300, margin: "0 auto" }}>
      <PageHeader icon="trophy" title="Collections"
        subtitle="Titres, succès, anges, maîtrise d'arme : les systèmes du jeu qu'on décroche à la longue, chiffres du client en main." />
      <Collections />
    </div>
  );
}
