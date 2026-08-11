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
  genre?: "achat" | "requete";
  id: string; item: string; quantite: number; demandeur: string; estLaMienne: boolean;
  note: string | null; cat: string | null; prix: number | null; spec: unknown; quand: string;
};
type Apport = { id: string; quantite: number; statut: "annonce" | "confirme"; par: { nom: string }; part: number };
type Quete = { id: string; quantite: number; confirme: number; annonce: number; reste: number; cagnotte: number | null; contributions: Apport[]; titre?: string };
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
  /** Ce que je m'apprête à réserver sur chaque chantier. */
  const [reserve, setReserve] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState<string | null>(null);

  /* RÉSERVER SA PART, depuis l'endroit où on lit le chantier.
     Il fallait aller sur Quête Guilde pour s'inscrire : on voyait donc ici ce
     qu'il y avait à faire, sans pouvoir le prendre. Et tant que personne
     n'annonce, deux personnes farment la même chose sans le savoir. */
  const reserver = async (queteId: string, quantite: number) => {
    if (quantite <= 0) return;
    setEnvoi(queteId); setErreur("");
    try {
      const r = await fetch(`/api/quetes/${queteId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "contribuer", quantite }),
      });
      if (!r.ok) setErreur((await r.json().catch(() => ({})))?.error ?? "Réservation impossible.");
      else { setReserve((p) => ({ ...p, [queteId]: "" })); await charger(); }
    } catch { setErreur("Impossible de joindre le serveur."); }
    setEnvoi(null);
  };

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
        <Icon name="package" size={14} />À livrer
        <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
          — les commandes que personne n&apos;a encore prises
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 14px" }}>
        Certaines dorment au coffre, d&apos;autres sont à trouver. Les deux se servent ici.
      </p>
      {/* UNE LÉGENDE, pas un paragraphe par carte. Les mêmes trois notions
          revenaient en toutes lettres sur chaque chantier ; elles sont dites
          une fois, et les cartes n'affichent plus que leurs chiffres. */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11.5, color: "var(--text-muted)", margin: "0 0 14px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "linear-gradient(90deg,#4ADE80,#22c55e)" }} />reçu
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "repeating-linear-gradient(45deg,rgba(255,140,26,.55),rgba(255,140,26,.55) 3px,rgba(255,140,26,.18) 3px,rgba(255,140,26,.18) 6px)" }} />promis
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon name="coins" size={12} style={{ color: "var(--gold)" }} />cagnotte, au prorata du livré
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon name="message" size={12} />la discussion avec le client
        </span>
      </div>

      {erreur && <div style={{ fontSize: 12.5, color: "var(--red)", marginBottom: 10 }}>{erreur}</div>}

      {/* ── Ce qui est deja lance, avec sa cagnotte ─────────────────────────
          Ces commandes ne sont plus dans Quete Guilde : elles se suivent ici,
          la ou le tarif se negocie. La cagnotte se partage au prorata de ce que
          chacun RAMENE — le site dit qui a droit a combien, le versement se
          regle entre vous. */}
      {enCours.length > 0 && (
        <div style={{ display: "grid", gap: 9, marginBottom: 16 }}>
          <div className="font-heading" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)" }}>
            Chantiers en cours — {enCours.length} à plusieurs
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
                {/* LA RÈGLE, ÉCRITE SUR LE CHANTIER. Elle vivait dans le
                    paragraphe d'introduction, au-dessus de la liste : on la
                    lisait une fois, la première, puis plus jamais. Un désaccord
                    sur la règle découvert au moment du partage est le conflit le
                    plus difficile à défaire — elle est donc rappelée là où l'on
                    s'engage. */}
                {/* La règle en UNE ligne : la légende, en haut, porte le reste.
                    Elle occupait quatre lignes sur chaque carte — le même
                    paragraphe répété autant de fois qu'il y a de chantiers. */}
                {!!q.cagnotte && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9, fontSize: 11.5, color: "var(--text-muted)" }}>
                    <Icon name="coins" size={12} style={{ color: "var(--gold)", flexShrink: 0 }} />
                    <b style={{ color: "var(--gold)" }}>{fmt(q.cagnotte)} périns</b> au prorata du <b>livré</b>, pas du promis.
                  </div>
                )}
                <div style={{ height: 9, borderRadius: 6, background: "var(--bg-2)", border: "1px solid var(--border)", overflow: "hidden", display: "flex" }}>
                  <div style={{ width: `${pcRecu}%`, background: "linear-gradient(90deg,#4ADE80,#22c55e)" }} />
                  <div style={{ width: `${pcPromis}%`, background: "repeating-linear-gradient(45deg,rgba(255,140,26,.55),rgba(255,140,26,.55) 5px,rgba(255,140,26,.18) 5px,rgba(255,140,26,.18) 10px)" }} />
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11.5, marginTop: 5, color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--green)" }}><b>{fmt(q.confirme)}</b> reçu</span>
                  {q.annonce > 0 && <span style={{ color: "var(--orange)" }}><b>{fmt(q.annonce)}</b> promis</span>}
                  <span>{q.reste ? <>reste <b>{fmt(q.reste)}</b></> : "tout est couvert"}</span>
                </div>

                {/* CE QUE ÇA TE RAPPORTERAIT, avant de farmer.
                    La part se calculait au partage — donc on découvrait après
                    coup ce qu'on avait gagné, et c'est là que naissent les
                    désaccords. Elle s'annonce maintenant AVANT l'engagement :
                    au prorata de ce que chacun aura ramené, sur la somme
                    convenue avec le client. */}
                {q.reste > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10, paddingTop: 9, borderTop: "1px dashed var(--border)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>Je prends</span>
                    <input type="number" min={1} max={q.reste}
                      value={reserve[q.id] ?? ""} onChange={(e) => setReserve((p) => ({ ...p, [q.id]: e.target.value }))}
                      placeholder={String(q.reste)} aria-label={`Quantité à réserver, ${q.reste} restants`}
                      style={{ width: 88, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--text)", fontSize: 13, textAlign: "right", fontFamily: "inherit" }} />
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>sur {fmt(q.reste)}</span>
                    {(() => {
                      const veut = Math.max(0, Math.min(q.reste, Math.floor(Number(reserve[q.id]) || 0)));
                      // Le total sur lequel la part se calculera : ce qui est
                      // déjà pris, plus ce que je m'apprête à prendre.
                      const base = q.confirme + q.annonce + veut;
                      const part = q.cagnotte && veut && base ? Math.round((q.cagnotte * veut) / base) : 0;
                      return (
                        <>
                          {part > 0 && (
                            <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700 }}
                              title="Au prorata de ce que chacun aura ramené. Si d'autres s'inscrivent après toi, la part se recalcule sur le total réellement livré.">
                              ≈ {fmt(part)} périns pour toi
                            </span>
                          )}
                          <button className="vg-btn" disabled={!veut || envoi === q.id}
                            onClick={() => reserver(q.id, veut)}
                            style={{ marginLeft: "auto", padding: "7px 13px", fontSize: 12.5, opacity: veut && envoi !== q.id ? 1 : .5 }}>
                            {envoi === q.id ? "…" : "Je m'en charge"}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                )}

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
          <span>Aucune commande n&apos;attend d&apos;être prise.</span>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 9 }}>
          {/* DEUX TRAVAUX DIFFÉRENTS, donc deux groupes. Sortir un objet du
              coffre prend deux minutes ; le farmer prend une soirée. Les mêler
              dans une seule liste obligeait à ouvrir chaque ligne pour savoir
              dans quoi on s'engageait. */}
          {(["achat", "requete"] as const).map((genre) => {
            const dedans = liste.filter((x) => (x.genre ?? "requete") === genre);
            if (!dedans.length) return null;
            return (
              <div key={genre} style={{ display: "grid", gap: 9 }}>
                <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.1, color: genre === "achat" ? "var(--green)" : "var(--purple)", marginTop: 4 }}>
                  <Icon name={genre === "achat" ? "vault" : "sprout"} size={13} />
                  {genre === "achat" ? "À sortir du coffre" : "À farmer"}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>
                    — {dedans.length} {genre === "achat" ? "(l'objet est là, c'est l'affaire de deux minutes)" : "(personne ne l'a : il faut le trouver)"}
                  </span>
                </div>
                {dedans.map((r) => {
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
                      title={(r.genre ?? "requete") === "achat"
                        ? "L'objet est au coffre : ouvrir un chantier n'a de sens que si tu veux vous y mettre à plusieurs."
                        : undefined}
                      style={{ padding: "8px 14px", fontSize: 12.5, opacity: ouverture === r.id ? .6 : 1 }}>
                      <Icon name="target" size={13} />{ouverture === r.id ? "Ouverture…" : "Lancer le chantier"}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
