"use client";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";

/**
 * « D'où vient cet objet ? » — la question qu'un joueur se pose devant un nom.
 *
 * Les données viennent du client du jeu : recettes de craft, butin de quête, contenu
 * des coffres, tables de clés, paliers de la Tour.
 *
 * ┌──────────── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ────────────┐
 * │ Ce composant portait une colonne de POURCENTAGES, et un   │
 * │ encadré expliquant que le butin ordinaire est calculé     │
 * │ côté serveur. Les deux sont partis ensemble : les taux    │
 * │ de drop ne se montrent plus, donc l'encadré qui excusait  │
 * │ leur absence n'avait plus rien à excuser. Ce qui sert     │
 * │ ici, c'est la SOURCE et le NOM — « craft chez Bobochan », │
 * │ « coffre ouvert avec la Clé d'Or ». Pas la chance.        │
 * │                                                           │
 * │ Et quand le client ne sait rien : on n'affiche RIEN. Un   │
 * │ cadre qui dit « on ne sait pas » est un renseignement     │
 * │ incomplet, donc il part avec le reste.                    │
 * └───────────────────────────────────────────────────────────┘
 */

type Source = { quoi: string; ou: string | null };
type Reponse = { nom: string; trouve: boolean; sources?: Source[]; total?: number };

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

  useEffect(() => {
    if (!nom) { setR(null); return; }
    let annule = false;
    fetch(`/api/ou-trouver?nom=${encodeURIComponent(nom)}`)
      .then((x) => (x.ok ? x.json() : null))
      .then((d) => { if (!annule) setR(d); })
      .catch(() => {});
    return () => { annule = true; };
  }, [nom]);

  if (!nom || !r?.trouve || !r.sources?.length) return null;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-3)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 11px", borderBottom: "1px solid var(--border)", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--gn-accent)" }}>
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
          </div>
        ))}
      </div>
    </div>
  );
}
