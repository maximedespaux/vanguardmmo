"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ETAPES_CS_DEFAUT, PHASES_CS_DEFAUT, type Etape } from "@/lib/evenements";

/**
 * LE DÉROULÉ D'UNE CHAMBRE — phase par phase, étape par étape, avec les MONSTRES de chaque étape
 * (décision 8 de Maxime, 2026-10-21). Les étapes sont celles du chrono et du débrief, réglées par
 * les bras droits dans le paramétrage (/discord/evenements) ; un monstre qui a sa fiche y mène
 * (/monstres/{id}, page publique du wiki).
 *
 * Avant la réponse, ce sont les étapes par défaut qui s'affichent — celles du débrief du
 * 18/10/2026, écrites dans le code : le bloc ne saute pas à l'arrivée des données, et une route
 * indisponible laisse un déroulé juste plutôt qu'un trou.
 */
export function Deroule({ isAdmin }: { isAdmin: boolean }) {
  const [etapes, setEtapes] = useState<Etape[]>(ETAPES_CS_DEFAUT);
  const [phases, setPhases] = useState<Record<string, string>>(PHASES_CS_DEFAUT);
  useEffect(() => {
    fetch("/api/evenements/lecture?evenement=cs", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.etapes) { setEtapes(j.etapes); setPhases(j.phases ?? {}); } })
      .catch(() => {});
  }, []);

  const parPhase = Object.keys(phases).sort().map((k) => ({ k, titre: phases[k], etapes: etapes.filter((e) => e.phase === k) })).filter((p) => p.etapes.length);
  return (
    <div className="fx-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <h2 className="font-heading" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--gn-accent)", textTransform: "uppercase", fontSize: 15, letterSpacing: 1, margin: 0 }}>
          <Icon name="list" size={17} />Le déroulé — étape par étape
        </h2>
        {isAdmin && (
          <Link href="/discord/evenements#etapes" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, padding: "6px 11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", textDecoration: "none" }}>
            <Icon name="settings" size={13} />Modifier les étapes
          </Link>
        )}
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
        Les étapes du chrono et du débrief, et ce qu&apos;on y affronte. Un nom en or mène à la fiche du monstre : ses PV, ses vies, ses résistances.
      </p>
      <div className="gn-deroule">
        {parPhase.map((p) => (
          <div key={p.k}>
            <h3 className="gn-deroule-phase">{p.titre}</h3>
            {p.etapes.map((e) => (
              <div key={e.code} className="gn-deroule-etape">
                <span aria-hidden="true">{e.emoji}</span>
                <span className="gn-deroule-code">{e.code}</span>
                <span className="gn-deroule-label">{e.label}</span>
                {e.monstres.length > 0 && (
                  <span className="gn-param-monstres">
                    {e.monstres.map((m, i) => m.id
                      ? <a key={i} className="gn-monstre" href={`/monstres/${encodeURIComponent(m.id)}`} title="Voir sa fiche"><span>{m.nom}</span></a>
                      : <span key={i} className="gn-monstre" title="Pas de fiche : absent du relevé du client"><span>{m.nom}</span></span>)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
