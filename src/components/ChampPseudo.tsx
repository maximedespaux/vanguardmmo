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
 * UNE SAISIE, pas une liste. C'était un menu déroulant des personnages
 * déclarés : on ne pouvait donc écrire QUE ce qui était déjà enregistré. Or on
 * fait livrer sur un perso de mule, sur un second compte, sur un personnage
 * créé la veille — et il fallait alors aller le déclarer avant de pouvoir
 * commander, pour une case qui ne sert qu'à adresser un courrier.
 *
 * Les personnages déclarés restent proposés, en suggestions : la commodité
 * sans l'obligation. Le principal est pré-rempli, parce que c'est lui qui
 * reçoit neuf fois sur dix — mais il s'efface d'un coup de touche.
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

  return (
    <>
      <input
        value={valeur} onChange={(e) => onChange(e.target.value)}
        placeholder="ton personnage en jeu" style={base} aria-label="Personnage en jeu"
        list={persos.length ? "vg-mes-persos" : undefined}
        autoComplete="off" maxLength={80}
      />
      {persos.length > 0 && (
        <datalist id="vg-mes-persos">
          {persos.map((c) => <option key={c.name} value={c.name} />)}
        </datalist>
      )}
      {/* Les persos déclarés, cliquables : la liste déroulante rendait ce
          service et c'est le seul qu'elle rendait. */}
      {persos.length > 1 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
          {persos.map((c) => (
            <button key={c.name} type="button" onClick={() => onChange(c.name)}
              style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${valeur === c.name ? "var(--orange)" : "var(--border)"}`,
                background: valeur === c.name ? "rgba(255,140,26,.14)" : "var(--bg-2)",
                color: valeur === c.name ? "var(--orange)" : "var(--text-muted)" }}>
              {c.name}{c.isMain ? " ★" : ""}
            </button>
          ))}
        </div>
      )}
      {deLaGuilde && charge && persos.length === 0 && (
        // Membre de la guilde sans personnage enregistré : on ne bloque pas sa
        // demande, mais on dit où corriger — c'est la liste qui sert partout
        // ailleurs (compositions, GuildViewer, quêtes).
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Aucun personnage enregistré. <Link href="/personnages" style={{ color: "var(--orange)" }}>Ajoute-le</Link> pour ne plus avoir à le retaper.
        </div>
      )}
    </>
  );
}
