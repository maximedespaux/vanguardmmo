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
type Apport = { id: string; quantite: number; statut: "annonce" | "confirme"; par: { nom: string }; part: number };
type Quete = { id: string; quantite: number; confirme: number; annonce: number; reste: number; cagnotte: number | null; contributions: Apport[] };
type EnCours = Requete & { quete: Quete };

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
  const [enCours, setEnCours] = useState<EnCours[]>([]);
  const [ouverture, setOuverture] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const [ouvertes, setOuvertes] = useState<Record<string, boolean>>({});

  const charger = useCallback(async () => {
    try {
      const r = await fetch("/api/quetes/a-prendre");
      if (r.ok) { const j = await r.json(); setListe(j.aPrendre ?? []); setEnCours(j.enCours ?? []); setErreur(""); }
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

      {/* ── Ce qui est deja lance, avec sa cagnotte ─────────────────────────
          Ces commandes ne sont plus dans Quete Guilde : elles se suivent ici,
          la ou le tarif se negocie. La cagnotte se partage au prorata de ce que
          chacun RAMENE — le site dit qui a droit a combien, le versement se
          regle entre vous. */}
      {enCours.length > 0 && (
        <div style={{ display: "grid", gap: 9, marginBottom: 16 }}>
          <div className="font-heading" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)" }}>
            En cours — {enCours.length} commande{enCours.length > 1 ? "s" : ""} lancée{enCours.length > 1 ? "s" : ""}
          </div>
          {enCours.map((r) => {
            const q = r.quete;
            const pcRecu = Math.min(100, Math.round((q.confirme / Math.max(1, q.quantite)) * 100));
            const pcPromis = Math.min(100 - pcRecu, Math.round((q.annonce / Math.max(1, q.quantite)) * 100));
            return (
              <div key={r.id} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11, padding: "11px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                      {r.item}{r.quantite > 1 && <span style={{ color: "var(--gold)" }}> × {fmt(r.quantite)}</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>pour {r.demandeur} · {depuis(r.quand)}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>Cagnotte</div>
                    <div className="font-heading" style={{ fontSize: 15, fontWeight: 700, color: q.cagnotte ? "var(--gold)" : "var(--text-muted)" }}>
                      {q.cagnotte ? `${fmt(q.cagnotte)} périns` : "à convenir"}
                    </div>
                  </div>
                  <Link href={`/messages?fil=req:${r.id}`}
                    style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text-muted)", textDecoration: "none", fontSize: 12 }}>
                    <Icon name="message" size={13} />La discussion
                  </Link>
                </div>

                {/* Ce qui est REÇU (plein) et ce qui est PROMIS (hachuré) :
                    sans le second, deux personnes farment la même chose. */}
                <div style={{ height: 9, borderRadius: 6, background: "var(--bg-2)", border: "1px solid var(--border)", overflow: "hidden", display: "flex" }}>
                  <div style={{ width: `${pcRecu}%`, background: "linear-gradient(90deg,#4ADE80,#22c55e)" }} />
                  <div style={{ width: `${pcPromis}%`, background: "repeating-linear-gradient(45deg,rgba(255,140,26,.55),rgba(255,140,26,.55) 5px,rgba(255,140,26,.18) 5px,rgba(255,140,26,.18) 10px)" }} />
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11.5, marginTop: 5, color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--green)" }}><b>{fmt(q.confirme)}</b> reçu</span>
                  {q.annonce > 0 && <span style={{ color: "var(--orange)" }}><b>{fmt(q.annonce)}</b> promis</span>}
                  <span>{q.reste ? <>reste <b>{fmt(q.reste)}</b></> : "tout est couvert"}</span>
                </div>

                {q.contributions.length > 0 && (
                  <div style={{ display: "grid", gap: 4, marginTop: 9, paddingTop: 8, borderTop: "1px dashed var(--border)" }}>
                    {q.contributions.map((c) => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <b>{c.par.nom}</b>
                        <span style={{ color: c.statut === "confirme" ? "var(--green)" : "var(--orange)" }}>
                          {c.statut === "confirme" ? "a livré" : "apporte"} {fmt(c.quantite)}
                        </span>
                        {!!c.part && (
                          <span style={{ marginLeft: "auto", fontWeight: 700, color: c.statut === "confirme" ? "var(--gold)" : "var(--text-muted)" }}
                            title={c.statut === "confirme" ? "Part acquise" : "Part attendue si l'apport est confirmé"}>
                            {fmt(c.part)} périns
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {liste === null ? (
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "16px 2px" }}>Lecture des commandes…</div>
      ) : liste.length === 0 ? (
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55, padding: "14px 2px" }}>
          <Icon name="check" size={15} style={{ color: "var(--green)", flexShrink: 0, marginTop: 1 }} />
          <span>Aucune commande en attente d&apos;être lancée.</span>
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
