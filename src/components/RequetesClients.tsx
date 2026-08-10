"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { BulleObjet } from "@/components/BulleObjet";
import { specDepuisJson } from "@/lib/specObjet";

/**
 * Les commandes qui attendent qu'on s'en charge — vu du staff.
 *
 * Une requête d'objet pouvait déjà devenir une quête ouverte à plusieurs, mais
 * le bouton dormait au fond d'une conversation et seuls le demandeur et le
 * staff le voyaient : neuf requêtes sur dix restaient sans quête, invisibles.
 *
 * Elles se lisent donc ici, dans la boutique, là où le staff travaille déjà.
 * Ce n'est pas une quête de guilde — ce n'est pas ce dont la GUILDE a besoin,
 * mais ce qu'un membre a commandé, à un tarif convenu avec lui. Ouvrir la
 * quête n'engage à rien : ça rend la commande visible et rejoignable, et
 * chacun y apportera sa part.
 */
type Requete = {
  id: string; item: string; quantite: number; demandeur: string; estLaMienne: boolean;
  note: string | null; cat: string | null; prix: number | null; spec: unknown; quand: string;
};

const fmt = (n: number) => n.toLocaleString("fr-FR");

/** « il y a 3 j » plutôt qu'une date : ce qui compte est depuis quand ça attend. */
function depuis(iso: string) {
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (j < 1) return "aujourd'hui";
  if (j === 1) return "hier";
  if (j < 31) return `il y a ${j} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function RequetesClients() {
  const [liste, setListe] = useState<Requete[] | null>(null);
  const [ouverture, setOuverture] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const [ouvertes, setOuvertes] = useState<Record<string, boolean>>({});

  const charger = useCallback(async () => {
    try {
      const r = await fetch("/api/quetes/a-prendre");
      if (r.ok) { setListe(await r.json()); setErreur(""); }
      else setErreur((await r.json().catch(() => ({})))?.error ?? `Chargement impossible (${r.status}).`);
    } catch { setErreur("Impossible de joindre le serveur."); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const ouvrirQuete = async (id: string) => {
    setOuverture(id); setErreur("");
    try {
      const r = await fetch(`/api/ventes/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enQuete" }),
      });
      if (!r.ok) setErreur((await r.json().catch(() => ({})))?.error ?? "L'ouverture a échoué.");
      else await charger();
    } catch { setErreur("Impossible de joindre le serveur."); }
    setOuverture(null);
  };

  return (
    <div className="glass-card fx-card" style={{ padding: 18, marginBottom: 16 }}>
      <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}>
        <Icon name="package" size={14} />Requêtes clients
        <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
          — les commandes que personne n&apos;a encore prises
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 14px" }}>
        Personne ne les a au coffre : il faut les farmer. Ouvre la quête et chacun pourra y apporter sa part —
        la somme convenue avec le client se partage ensuite au prorata de ce que chacun a ramené.
      </p>

      {erreur && <div style={{ fontSize: 12.5, color: "var(--red)", marginBottom: 10 }}>{erreur}</div>}

      {liste === null ? (
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "16px 2px" }}>Lecture des commandes…</div>
      ) : liste.length === 0 ? (
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55, padding: "14px 2px" }}>
          <Icon name="check" size={15} style={{ color: "var(--green)", flexShrink: 0, marginTop: 1 }} />
          <span>
            Aucune commande en attente. Celles qui ont déjà leur quête se suivent sur{" "}
            <Link href="/quetes" style={{ color: "var(--orange)" }}>Quête Guilde</Link>.
          </span>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 9 }}>
          {liste.map((r) => {
            const spec = specDepuisJson(r.spec);
            const ouvert = !!ouvertes[r.id];
            const total = r.prix ? r.prix * r.quantite : null;
            return (
              <div key={r.id} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "11px 13px" }}>
                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span style={{ color: spec?.couleur ?? "var(--text)" }}>{r.item}</span>
                      {r.quantite > 1 && <span style={{ color: "var(--gold)" }}>× {fmt(r.quantite)}</span>}
                      {r.estLaMienne && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--orange)", border: "1px solid var(--orange)", borderRadius: 6, padding: "1px 6px", textTransform: "uppercase", letterSpacing: .4 }}>ma demande</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                      <span>{r.demandeur}</span>
                      <span style={{ opacity: .5 }}>·</span>
                      <span>{depuis(r.quand)}</span>
                      {r.cat && <><span style={{ opacity: .5 }}>·</span><span>{r.cat}</span></>}
                    </div>
                    {r.note && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3, fontStyle: "italic" }}>« {r.note} »</div>}
                  </div>

                  {/* Le tarif convenu avec le client : c'est lui qui dit si ça vaut
                      la peine de s'y mettre, et ce qu'il y aura à partager. */}
                  <div style={{ textAlign: "right", flexShrink: 0, minWidth: 96 }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>Tarif client</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: total ? "var(--gold)" : "var(--text-muted)", fontFamily: "'Rubik',sans-serif" }}>
                      {total ? `${fmt(total)} périns` : "à convenir"}
                    </div>
                    {total && r.quantite > 1 && (
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{fmt(r.prix!)} / unité</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                    {spec && (
                      <button onClick={() => setOuvertes((p) => ({ ...p, [r.id]: !ouvert }))}
                        aria-expanded={ouvert} aria-label={ouvert ? "Masquer le détail" : "Voir l'objet exact"}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 11px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                        <Icon name={ouvert ? "chevron-down" : "chevron-right"} size={12} />Détail
                      </button>
                    )}
                    <button className="vg-btn" disabled={ouverture === r.id} onClick={() => ouvrirQuete(r.id)}
                      style={{ padding: "8px 14px", fontSize: 12.5, opacity: ouverture === r.id ? .6 : 1 }}>
                      <Icon name="target" size={13} />{ouverture === r.id ? "Ouverture…" : "Ouvrir la quête"}
                    </button>
                  </div>
                </div>

                {/* L'objet EXACT commandé, pas seulement son nom : une pièce +10
                    percée et son homonyme brut ne se farment pas pareil. */}
                {ouvert && spec && (
                  <div style={{ padding: "0 13px 12px" }}><BulleObjet spec={spec} compact /></div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
