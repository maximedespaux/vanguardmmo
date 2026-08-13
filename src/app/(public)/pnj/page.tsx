import { AnnuairePnj } from "@/components/pnj/AnnuairePnj";

/**
 * `/pnj` — l'annuaire des PNJ.
 *
 * La page est un composant serveur qui ne fait rien : tout le travail est dans
 * `AnnuairePnj`, côté client, parce que l'annuaire se lit à travers
 * `/api/pnj` (le fichier fait 205 Ko, on ne l'embarque pas dans le paquet JS).
 * Ce fichier existe pour que le `layout.tsx` voisin puisse porter les
 * métadonnées — un composant `"use client"` ne peut pas exporter `metadata`.
 *
 * `?objet=…` arrive de la fiche d'un objet : son bloc « Chez qui » renvoie ici avec
 * le nom déjà écrit, et l'annuaire s'ouvre sur la recherche par objet. Sans ça le
 * lien retombait sur la page d'accueil de l'annuaire et il fallait retaper le nom.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ objet?: string }> }) {
  const { objet } = await searchParams;
  return <AnnuairePnj depart={objet ?? ""} />;
}
