"use client";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";

/**
 * « D'où vient cet objet ? » — la question qu'un joueur se pose devant un nom.
 *
 * Les données viennent du client du jeu (recettes de craft, butin de quête chiffré,
 * contenu des coffres, tables de clés, paliers de la Tour), servies par
 * /api/ou-trouver. Le butin ORDINAIRE des monstres n'y est pas : il est calculé par
 * le serveur. L'absence de réponse ne veut donc pas dire « ça ne tombe pas », et le
 * composant le dit plutôt que de laisser croire à un vide.
 */

type Source = { quoi: string; ou: string | null; chance: number | null };
type Reponse = { nom: string; trouve: boolean; sources?: Source[]; total?: number; avertissement?: string };

/** Une icône par nature de source, pour que ça se lise sans lire. */
function icone(quoi: string): IconName {
  if (quoi.startsWith("Craft")) return "hammer";
  if (quoi.startsWith("Sert")) return "package";
  if (quoi.startsWith("Butin")) return "sword-cross";
  if (quoi.startsWith("Coffre") || quoi.startsWith("Dans")) return "package";
  if (quoi.startsWith("Protection")) return "shield";
  return "info";
}

export function OuTrouver({ nom, compact = false }: { nom: string | null | undefined; compact?: boolean }) {
  const [r, setR] = useState<Reponse | null>(null);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    if (!nom) { setR(null); return; }
    let annule = false;
    setCharge(false);
    fetch(`/api/ou-trouver?nom=${encodeURIComponent(nom)}`)
      .then((x) => (x.ok ? x.json() : null))
      .then((d) => { if (!annule) { setR(d); setCharge(true); } })
      .catch(() => { if (!annule) setCharge(true); });
    return () => { annule = true; };
  }, [nom]);

  if (!nom || !charge) return null;

  // Rien de connu : on le dit, et on dit pourquoi. Un composant qui disparaît
  // laisserait croire que l'objet ne s'obtient nulle part.
  if (!r?.trouve || !r.sources?.length) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 11px", border: "1px dashed var(--border)", borderRadius: 9 }}>
        Le client du jeu ne dit pas d’où vient cet objet. Le butin ordinaire des monstres est calculé côté serveur : ça ne veut pas dire qu’il ne tombe pas.
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-3)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 11px", borderBottom: "1px solid var(--border)", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--orange)" }}>
        <Icon name="search" size={13} /> Où le trouver
        {r.total && r.total > (r.sources?.length ?? 0) ? (
          <span style={{ marginLeft: "auto", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--text-muted)" }}>
            {r.sources!.length} sur {r.total}
          </span>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {r.sources!.slice(0, compact ? 4 : 12).map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "7px 11px", borderTop: i ? "1px solid color-mix(in srgb, var(--border) 55%, transparent)" : "none", fontSize: 12.5 }}>
            <Icon name={icone(s.quoi)} size={13} style={{ flexShrink: 0, opacity: 0.7, transform: "translateY(2px)" }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontWeight: 600 }}>{s.quoi}</b>
              {s.ou && <span style={{ color: "var(--text-muted)" }}> — {s.ou}</span>}
            </span>
            {s.chance != null && (
              <span style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", fontWeight: 700, color: s.chance >= 10 ? "var(--green)" : s.chance >= 2 ? "var(--gold)" : "var(--text-muted)" }}>
                {s.chance}&nbsp;%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
