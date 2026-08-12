import { notFound } from "next/navigation";
import { monstreParId, voisins } from "@/components/monstres/catalogue";
import { FicheMonstre } from "@/components/monstres/Fiche";
import { court } from "@/components/monstres/vocabulaire";

/**
 * La fiche d'un monstre, à sa propre adresse.
 *
 * Volontairement une page et non un panneau qui se déplie dans la recherche : une
 * fiche se colle dans Discord (« regarde ce qu'il faut sortir »), et un panneau
 * n'a pas d'adresse. L'identifiant est celui du client du jeu (`MI_…`) parce que
 * plusieurs monstres partagent le même nom français — les quatre paliers d'une
 * famille, les doubles d'event — ce qui interdisait de nommer l'adresse par le nom.
 *
 * Le catalogue est lu ici côté serveur : rien de ses 612 Ko ne descend au
 * navigateur, seule la fiche demandée voyage.
 */
export default async function FicheMonstrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = monstreParId(decodeURIComponent(id));
  if (!m) notFound();
  return <FicheMonstre m={m} voisins={voisins(m)} />;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = monstreParId(decodeURIComponent(id));
  if (!m) return { title: "Monstre introuvable · Vanguard" };
  const vies = (m.vies ?? 0) > 1 ? ` — ${m.vies} vies, ${court(m.pvEff)} PV à sortir` : "";
  return {
    title: `${m.nom} · Monstres · Vanguard`,
    description: `${m.nom}, niveau ${m.niv ?? "?"} · ${court(m.pv)} PV${vies}. Dégâts, cadence, élément, résistances et mécaniques de combat.`,
  };
}
