import { AnnuairePnj } from "@/components/pnj/AnnuairePnj";

/**
 * `/pnj` — l'annuaire des PNJ.
 *
 * La page est un composant serveur qui ne fait rien : tout le travail est dans
 * `AnnuairePnj`, côté client, parce que l'annuaire se lit à travers
 * `/api/pnj` (le fichier fait 205 Ko, on ne l'embarque pas dans le paquet JS).
 * Ce fichier existe pour que le `layout.tsx` voisin puisse porter les
 * métadonnées — un composant `"use client"` ne peut pas exporter `metadata`.
 */
export default function Page() {
  return <AnnuairePnj />;
}
