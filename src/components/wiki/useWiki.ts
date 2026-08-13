"use client";
import { useEffect, useRef, useState } from "react";
import type { Reponse, TypeEntree } from "./vocabulaire";

/**
 * L'INTERROGATION DE /api/wiki, écrite une fois.
 *
 * Deux pièges, tous les deux déjà payés sur ce site :
 *
 * 1. LA FRAPPE EST AMORTIE de 220 ms. Sans ça, taper « ame de demon » lance treize
 *    requêtes dont douze jetées.
 * 2. UN JETON écarte les réponses en retard. Les réponses n'arrivent pas dans l'ordre
 *    où on les demande : sans le jeton, la réponse de « ame » écrase celle de « ame de
 *    demon » et le champ affiche autre chose que ce qu'on a tapé.
 *
 * `charge` distingue « pas encore demandé » de « rien trouvé » : sans ça, le premier
 * rendu affiche « aucun résultat » avant même que la requête soit partie.
 */
export type Reglages = { q: string; type: TypeEntree | ""; maison: boolean; n?: number };
export type ReponseWiki = Reponse & {
  index?: { total: number; parType: Record<string, number>; maison: number; provenances: number; genere: string };
};

/**
 * `depart` — LA PREMIÈRE RÉPONSE EST DÉJÀ RENDUE PAR LE SERVEUR, on ne la redemande
 * pas.
 *
 * La page /wiki cherche côté serveur avant d'envoyer le HTML : un lien collé dans
 * Discord (`/wiki?q=luzaka`) montre donc ses réponses tout de suite, sans clignoter,
 * et un moteur de recherche voit autre chose qu'un champ vide. Sans ce garde-fou, le
 * même travail serait refait 220 ms plus tard pour un résultat identique.
 */
export function useWiki({ q, type, maison, n }: Reglages, actif = true, depart?: { q: string; reponse: ReponseWiki }) {
  const [r, setR] = useState<ReponseWiki | null>(depart?.reponse ?? null);
  const [charge, setCharge] = useState(Boolean(depart));
  const jeton = useRef(0);
  /* La réponse du serveur est LUE DANS UN REF et pas dans les dépendances de l'effet :
     le parent en recrée l'objet à chaque rendu, et la mettre en dépendance relancerait
     la recherche sans fin. `premier` la rend valable une seule fois, au montage. */
  const departRef = useRef(depart);
  const premier = useRef(true);

  useEffect(() => {
    if (!actif) { setR(null); setCharge(false); return; }
    const d0 = departRef.current;
    const dejaRendu = premier.current && d0 !== undefined && q === d0.q && !type && !maison;
    premier.current = false;
    if (dejaRendu) return;
    const mien = ++jeton.current;
    const t = setTimeout(async () => {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      if (type) p.set("type", type);
      if (maison) p.set("maison", "1");
      if (n) p.set("n", String(n));
      const d = await fetch(`/api/wiki?${p}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
      if (mien !== jeton.current) return;
      setR(d); setCharge(true);
    }, 220);
    return () => clearTimeout(t);
  }, [q, type, maison, n, actif]);

  return { r, charge };
}
