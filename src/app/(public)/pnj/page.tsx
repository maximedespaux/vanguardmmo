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
 * DEUX ENTRÉES PAR L'ADRESSE, et la seconde était un lien mort :
 *
 *  · `?objet=…` arrive de la fiche d'un objet : son bloc « Chez qui » renvoie ici avec
 *    le nom déjà écrit, et l'annuaire s'ouvre sur la recherche par objet. Sans ça le
 *    lien retombait sur la page d'accueil de l'annuaire et il fallait retaper le nom.
 *
 *  · `?pnj=<clé>` arrive du WIKI. Les 293 lignes de PNJ de /wiki pointent toutes
 *    `/pnj?pnj=MaFl_Boboko` depuis leur création — et cette page ne lisait QUE `objet`.
 *    Le paramètre était donc jeté en silence : chercher « Boboko » dans le wiki,
 *    cliquer, et atterrir sur l'annuaire générique, à retaper le nom qu'on venait de
 *    taper. « Chaque résultat doit MENER quelque part » n'était pas tenu pour un
 *    cinquième de l'index. La clé est celle du client (`MaFl_*`), celle que
 *    `/api/pnj?cle=` attend déjà : rien à traduire.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ objet?: string; pnj?: string }> }) {
  const { objet, pnj } = await searchParams;
  return <AnnuairePnj depart={objet ?? ""} cleDepart={pnj ?? ""} />;
}
