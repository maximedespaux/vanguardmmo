"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";

/**
 * Mes ventes — ce que j'ai fourni, et ce que ça m'a rapporté.
 *
 * Tout tenait sur une colonne : quatre chiffres, puis quatre sections
 * empilées qu'il fallait dérouler pour savoir ce qu'elles contenaient. On
 * cherchait « ma dernière vente » en faisant défiler.
 *
 * Une carte d'identité en tête, un RAIL de sections à gauche, le contenu à
 * droite. Chaque entrée du rail porte son compte : on sait ce qu'il y a
 * dedans sans l'ouvrir, et on va droit à celle qu'on veut.
 *
 * Deux états, jamais additionnés, parce qu'ils ne valent pas la même chose :
 * ce qui est ENCAISSÉ, et ce qui est ENGAGÉ mais pas encore remis. Les mêler
 * ferait un total flatteur et faux.
 */
type Vente = { id: string; item: string; quantite: number; pour: string; perins: number; airpoints: number; date: string };
type Engagee = { id: string; item: string; quantite: number; pour: string; perins: number; etat: string };
type Bilan = {
  totaux: { ventes: number; perins: number; airpoints: number; enAttente: number; perinsEnAttente: number };
  ventes: Vente[]; engagees: Engagee[];
  mois: { mois: string; perins: number; ventes: number }[];
};

const fmt = (n: number) => n.toLocaleString("fr-FR");
const jour = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
const moisCourt = (m: string) => new Date(m + "-01").toLocaleDateString("fr-FR", { month: "short" });

type Onglet = "bilan" | "livraisons" | "attente" | "mois";
const SECTIONS: { clef: Onglet; titre: string; sous: string; icon: IconName }[] = [
  { clef: "bilan", titre: "Bilan", sous: "Ce que ça t'a rapporté", icon: "bar-chart" },
  { clef: "livraisons", titre: "Mes livraisons", sous: "Ce que tu as remis", icon: "package" },
  { clef: "attente", titre: "En attente", sous: "Engagé, pas encore remis", icon: "clock" },
  { clef: "mois", titre: "Mois par mois", sous: "Six derniers mois", icon: "trending" },
];

const ligne: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
  padding: "10px 12px", borderRadius: 10, background: "var(--bg-3)", border: "1px solid var(--border)", fontSize: 12.5,
};
const vide: React.CSSProperties = { fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5, padding: "14px 2px" };

/** Un chiffre et ce qu'il veut dire — le libellé sous le nombre, jamais à côté. */
function Chiffre({ valeur, unite, label, icon, couleur, aide }: {
  valeur: number; unite?: string; label: string; icon: IconName; couleur: string; aide?: string;
}) {
  return (
    <div style={{ padding: "15px 17px", flex: "1 1 180px", minWidth: 0, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 12 }} title={aide}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
        <span style={{ width: 28, height: 28, borderRadius: 9, display: "inline-flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${couleur} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${couleur} 34%, transparent)`, color: couleur, flexShrink: 0 }}>
          <Icon name={icon} size={15} />
        </span>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.3 }}>{label}</span>
      </div>
      <div className="font-heading" style={{ fontSize: 23, fontWeight: 700, color: valeur ? couleur : "var(--text-muted)", lineHeight: 1 }}>
        {fmt(valeur)}{unite && <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 4, color: "var(--text-muted)" }}>{unite}</span>}
      </div>
    </div>
  );
}

export default function MesVentesPage() {
  useCardFx();
  const { data: session } = useSession();
  const moi = session?.user as { name?: string; role?: string } | undefined;
  const [d, setD] = useState<Bilan | null>(null);
  const [panne, setPanne] = useState("");
  const [onglet, setOnglet] = useState<Onglet>("bilan");

  useEffect(() => {
    fetch("/api/mes-ventes")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setD)
      .catch((e) => setPanne(`Impossible de charger tes ventes (erreur ${e.message}).`));
  }, []);

  const maxMois = Math.max(1, ...(d?.mois ?? []).map((m) => m.perins));
  const compte: Record<Onglet, number | null> = {
    bilan: null,
    livraisons: d?.ventes.length ?? 0,
    attente: d?.engagees.length ?? 0,
    mois: d?.mois.filter((m) => m.perins > 0).length ?? 0,
  };

  return (
    <div style={{ padding: "24px 22px 60px", maxWidth: 1040, margin: "0 auto" }}>

      {/* ── Carte d'identité ── */}
      <div className="glass-card fx-card" style={{ padding: "18px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
        <span style={{ width: 54, height: 54, borderRadius: 15, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(180deg, rgba(255,210,74,.18), rgba(255,140,26,.1))", border: "1px solid rgba(255,210,74,.35)", color: "var(--gold)" }}>
          <Icon name="coins" size={26} />
        </span>
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <div className="font-heading" style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            Mes ventes
            {d && d.totaux.ventes > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, color: "var(--green)", background: "rgba(74,222,128,.11)", border: "1px solid color-mix(in srgb, var(--green) 40%, transparent)", borderRadius: 20, padding: "2px 10px" }}>
                {d.totaux.ventes} vente{d.totaux.ventes > 1 ? "s" : ""} conclue{d.totaux.ventes > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>
            {moi?.name ? <>{moi.name} · </> : null}Ce que tu as fourni à la guilde, et ce que ça t&apos;a rapporté.
          </div>
        </div>
        <Link href="/boutique?mode=requetes" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 10, textDecoration: "none", fontSize: 13, fontWeight: 700, fontFamily: "'Rubik',sans-serif", background: "var(--orange)", color: "#0A0A0C" }}>
          <Icon name="package" size={15} />Commandes à livrer
        </Link>
      </div>

      {panne && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--red)" }}>{panne}</div>}
      {!d && !panne && <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 20 }}>Lecture de tes ventes…</div>}

      {d && (
        <div className="mv-layout" style={{ display: "grid", gridTemplateColumns: "270px 1fr", gap: 14, alignItems: "start" }}>

          {/* ── Le rail : chaque section porte son compte ── */}
          <div style={{ display: "grid", gap: 8 }}>
            {SECTIONS.map((s) => {
              const actif = onglet === s.clef;
              const n = compte[s.clef];
              return (
                <button key={s.clef} onClick={() => setOnglet(s.clef)}
                  className="fx-card"
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                    padding: "13px 14px", borderRadius: 12,
                    background: actif ? "rgba(255,140,26,.09)" : "var(--bg-2)",
                    border: `1px solid ${actif ? "var(--orange)" : "var(--border)"}` }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: actif ? "var(--orange)" : "var(--bg-3)", border: `1px solid ${actif ? "var(--orange)" : "var(--border)"}`,
                    color: actif ? "#0A0A0C" : "var(--orange)" }}>
                    <Icon name={s.icon} size={17} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="font-heading" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 700, color: actif ? "var(--orange)" : "var(--text)" }}>
                      {s.titre}
                      {n != null && (
                        <span style={{ fontSize: 11, fontWeight: 700, minWidth: 20, textAlign: "center", padding: "1px 7px", borderRadius: 20,
                          background: n ? "var(--bg-3)" : "transparent", border: `1px solid ${n ? "var(--border)" : "transparent"}`,
                          color: n ? "var(--gold)" : "var(--text-muted)" }}>{n}</span>
                      )}
                    </span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>{s.sous}</span>
                  </span>
                  <Icon name="chevron-right" size={15} style={{ color: actif ? "var(--orange)" : "var(--text-muted)", flexShrink: 0 }} />
                </button>
              );
            })}
          </div>

          {/* ── Le panneau ── */}
          <div className="glass-card fx-card" style={{ padding: 18, minHeight: 260 }}>
            {(() => {
              const s = SECTIONS.find((x) => x.clef === onglet)!;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 11, paddingBottom: 13, marginBottom: 14, borderBottom: "1px solid var(--border)" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--orange)" }}>
                    <Icon name={s.icon} size={17} />
                  </span>
                  <span>
                    <span className="font-heading" style={{ display: "block", fontSize: 15.5, fontWeight: 700 }}>{s.titre}</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{s.sous}</span>
                  </span>
                </div>
              );
            })()}

            {onglet === "bilan" && (
              <>
                {/* Deux états, jamais additionnés : encaissé, et engagé. */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  <Chiffre valeur={d.totaux.perins} unite="périns" label="Encaissé sur tes ventes" icon="coins" couleur="var(--gold)"
                    aide="Objets que tu avais et que tu as remis." />
                  <Chiffre valeur={d.totaux.perinsEnAttente} unite="périns" label="Engagé, pas encore remis" icon="clock" couleur="var(--orange)"
                    aide="Tu t'es proposé, l'échange n'est pas conclu. Ce n'est pas gagné tant que ce n'est pas remis." />
                  <Chiffre valeur={d.totaux.ventes} label="Ventes conclues" icon="check" couleur="var(--green)" />
                </div>
                {d.totaux.airpoints > 0 && (
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14 }}>
                    Et <b style={{ color: "var(--gold)" }}>{fmt(d.totaux.airpoints)} Airpoints</b> encaissés en plus des périns.
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
                  <Icon name="info" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Le site ne déplace pas de périns : il dit ce qui te revient, le versement se règle entre vous.</span>
                </div>
              </>
            )}

            {onglet === "livraisons" && (
              d.ventes.length === 0 ? (
                <div style={vide}>
                  Aucune vente conclue. Quand quelqu&apos;un demande un objet que tu as, tu peux le lui fournir depuis{" "}
                  <Link href="/boutique?mode=requetes" style={{ color: "var(--orange)" }}>les commandes à livrer</Link>.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {d.ventes.map((v) => (
                    <div key={v.id} style={ligne}>
                      <span style={{ flex: "1 1 180px", minWidth: 0, fontWeight: 600 }}>
                        {v.item}{v.quantite > 1 && <span style={{ color: "var(--gold)" }}> × {fmt(v.quantite)}</span>}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>à {v.pour}</span>
                      <span style={{ color: "var(--text-muted)" }}>{jour(v.date)}</span>
                      <b style={{ marginLeft: "auto", color: "var(--gold)" }}>
                        {v.perins ? `${fmt(v.perins)} périns` : v.airpoints ? `${fmt(v.airpoints)} AP` : "troc"}
                      </b>
                    </div>
                  ))}
                </div>
              )
            )}

            {onglet === "attente" && (
              d.engagees.length === 0 ? (
                <div style={vide}>Rien en attente : tout ce que tu as pris en charge a été remis.</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {d.engagees.map((v) => (
                    <div key={v.id} style={ligne}>
                      <span style={{ flex: "1 1 180px", minWidth: 0, fontWeight: 600 }}>
                        {v.item}{v.quantite > 1 && <span style={{ color: "var(--gold)" }}> × {fmt(v.quantite)}</span>}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>à {v.pour}</span>
                      <b style={{ marginLeft: "auto", color: "var(--orange)" }}>{v.perins ? `${fmt(v.perins)} périns` : "à convenir"}</b>
                    </div>
                  ))}
                </div>
              )
            )}

            {onglet === "mois" && (
              d.mois.every((m) => !m.perins) ? (
                <div style={vide}>Rien de vendu sur les six derniers mois.</div>
              ) : (
                <>
                  <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    Un total seul ne dit pas si ça monte ou si ça s&apos;est arrêté.
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120 }}>
                    {d.mois.map((m) => (
                      <div key={m.mois} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: m.perins ? "var(--gold)" : "var(--text-muted)", fontWeight: 700 }}>
                          {m.perins ? fmt(m.perins) : "—"}
                        </span>
                        <div title={`${m.ventes} vente(s)`}
                          style={{ width: "100%", height: `${Math.max(3, (m.perins / maxMois) * 74)}px`, borderRadius: "4px 4px 0 0", background: m.perins ? "linear-gradient(180deg,#FFD24A,#FF8C1A)" : "var(--bg-3)" }} />
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{moisCourt(m.mois)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}

      {/* Sur téléphone le rail passe au-dessus : deux colonnes de 270 px et de
          reste ne tiennent pas côte à côte sous 800 px. */}
      <style>{`@media(max-width:800px){.mv-layout{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}
