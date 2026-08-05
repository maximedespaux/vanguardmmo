"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { canAccessGuild } from "@/config/roles";
import type { Role } from "@prisma/client";

/**
 * Le pseudo EN JEU d'une demande — l'objet part par courrier, c'est cette
 * ligne qui dit où.
 *
 * Deux publics, deux champs :
 *
 * — Membre de la GUILDE : il choisit parmi SES personnages. Ils sont déjà
 *   enregistrés, ils servent aux compositions et au GuildViewer, et une liste
 *   force à les tenir à jour — une demande adressée à un perso supprimé se
 *   perd en jeu, pas sur le site.
 *
 * — Membre du serveur seulement : saisie libre. Il n'a pas de personnage
 *   enregistré ici, et lui en demander un pour acheter un objet serait lui
 *   imposer la paperasse d'une guilde qu'il n'a pas rejointe.
 */
export function ChampPseudo({ valeur, onChange, style }: {
  valeur: string;
  onChange: (v: string) => void;
  /** Style du champ, pour coller à l'écran qui l'accueille. */
  style?: React.CSSProperties;
}) {
  const { data: session } = useSession();
  const role = ((session?.user as { role?: Role } | undefined)?.role ?? "RECRUE") as Role;
  const deLaGuilde = canAccessGuild(role) || process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";

  const [persos, setPersos] = useState<{ name: string; isMain: boolean }[]>([]);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    if (!deLaGuilde) { setCharge(true); return; }
    let vivant = true;
    fetch("/api/characters")
      .then((r) => (r.ok ? r.json() : []))
      .then((cs: { name: string; isMain: boolean }[]) => {
        if (!vivant) return;
        setPersos(cs ?? []);
        setCharge(true);
        // Le principal d'abord : c'est celui qui reçoit, neuf fois sur dix.
        const principal = cs?.find((c) => c.isMain) ?? cs?.[0];
        if (principal && !valeur) onChange(principal.name);
      })
      .catch(() => setCharge(true));
    return () => { vivant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deLaGuilde]);

  const base: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 13.5, fontFamily: "inherit", width: "100%", ...style };

  if (deLaGuilde && persos.length > 0) {
    return (
      <select value={valeur} onChange={(e) => onChange(e.target.value)} style={base} aria-label="Personnage en jeu">
        {persos.map((c) => <option key={c.name} value={c.name}>{c.name}{c.isMain ? " (principal)" : ""}</option>)}
      </select>
    );
  }

  return (
    <>
      <input value={valeur} onChange={(e) => onChange(e.target.value)} placeholder="ton personnage en jeu" style={base} aria-label="Personnage en jeu" />
      {deLaGuilde && charge && (
        // Membre de la guilde sans personnage enregistré : on ne bloque pas sa
        // demande, mais on dit où corriger — c'est la liste qui sert partout
        // ailleurs (compositions, GuildViewer, quêtes).
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          Aucun personnage enregistré. <Link href="/personnages" style={{ color: "var(--orange)" }}>Ajoute-le</Link> pour ne plus avoir à le retaper.
        </div>
      )}
    </>
  );
}
