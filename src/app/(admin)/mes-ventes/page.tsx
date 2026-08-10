"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";

/**
 * Mes ventes — ce que j'ai fourni, et ce que ça m'a rapporté.
 *
 * Le bilan d'un membre existait, mais tourné vers les AUTRES : on l'ouvrait en
 * cliquant un pseudo, et son volet marchand était réservé au staff. Pour se
 * regarder soi-même, il n'y avait rien — alors que c'est la question qu'on se
 * pose le plus souvent : est-ce que ça vaut la peine que je fournisse ?
 *
 * Trois états, jamais mélangés, parce qu'ils ne valent pas la même chose :
 * ce qui est ENCAISSÉ, ce qui est ENGAGÉ mais pas encore remis, et ce qui est
 * ATTENDU sur une commande farmée à plusieurs. Les additionner ferait un total
 * flatteur et faux.
 */
type Vente = { id: string; item: string; quantite: number; pour: string; perins: number; airpoints: number; date: string };
type Engagee = { id: string; item: string; quantite: number; pour: string; perins: number; etat: string };
type Part = { queteId: string; titre: string; quantite: number; part: number; acquise: boolean; date: string };
type Bilan = {
  totaux: { ventes: number; perins: number; airpoints: number; partsAcquises: number; partsAttendues: number; enAttente: number; perinsEnAttente: number };
  ventes: Vente[]; engagees: Engagee[]; parts: Part[];
  mois: { mois: string; perins: number; ventes: number }[];
};

const fmt = (n: number) => n.toLocaleString("fr-FR");
const jour = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
const moisCourt = (m: string) => new Date(m + "-01").toLocaleDateString("fr-FR", { month: "short" });

/** Un chiffre et ce qu'il veut dire. Le libellé sous le nombre, jamais à côté :
 *  un nombre sans son unité ne se lit pas. */
function Chiffre({ valeur, unite, label, icon, couleur, aide }: {
  valeur: number; unite?: string; label: string; icon: IconName; couleur: string; aide?: string;
}) {
  return (
    <div className="glass-card fx-card" style={{ padding: "15px 17px", flex: "1 1 190px", minWidth: 0 }} title={aide}>
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

function Section({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) {
  return (
    <div className="glass-card fx-card" style={{ padding: 17, marginBottom: 14 }}>
      <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4, color: "var(--orange)", marginBottom: aide ? 3 : 11 }}>{titre}</div>
      {aide && <p style={{ margin: "0 0 11px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{aide}</p>}
      {children}
    </div>
  );
}

const ligne: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
  padding: "9px 11px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", fontSize: 12.5,
};
const vide: React.CSSProperties = { fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5, padding: "6px 2px" };

export default function MesVentesPage() {
  useCardFx();
  const [d, setD] = useState<Bilan | null>(null);
  const [panne, setPanne] = useState("");

  useEffect(() => {
    fetch("/api/mes-ventes")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setD)
      .catch((e) => setPanne(`Impossible de charger tes ventes (erreur ${e.message}).`));
  }, []);

  const maxMois = Math.max(1, ...(d?.mois ?? []).map((m) => m.perins));

  return (
    <div style={{ padding: "24px 22px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <PageHeader icon="coins" title="Mes ventes"
        subtitle="Ce que tu as fourni, et ce que ça t'a rapporté — vente directe comme part de cagnotte." />

      {panne && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--red)" }}>{panne}</div>}

      {!d ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 20 }}>Lecture de tes ventes…</div>
      ) : (
        <>
          {/* Trois états, jamais additionnés : encaissé, engagé, attendu. */}
          <div style={{ display: "flex", gap: 11, flexWrap: "wrap", marginBottom: 16 }}>
            <Chiffre valeur={d.totaux.perins} unite="périns" label="Encaissé sur tes ventes" icon="coins" couleur="var(--gold)"
              aide="Objets que tu avais et que tu as remis." />
            <Chiffre valeur={d.totaux.partsAcquises} unite="périns" label="Parts de cagnotte acquises" icon="target" couleur="var(--green)"
              aide="Ta part sur les commandes farmées à plusieurs, une fois la réception confirmée." />
            <Chiffre valeur={d.totaux.perinsEnAttente + d.totaux.partsAttendues} unite="périns" label="En attente" icon="clock" couleur="var(--orange)"
              aide="Ventes engagées pas encore remises, et parts pas encore confirmées. Ce n'est pas gagné tant que ce n'est pas remis." />
            <Chiffre valeur={d.totaux.ventes} label="Ventes conclues" icon="check" couleur="var(--blue)" />
          </div>

          {d.totaux.airpoints > 0 && (
            <div style={{ marginBottom: 16, fontSize: 12.5, color: "var(--text-muted)" }}>
              Et <b style={{ color: "var(--gold)" }}>{fmt(d.totaux.airpoints)} Airpoints</b> encaissés en plus des périns.
            </div>
          )}

          {/* Six mois : un total seul ne dit pas si ça monte ou si ça s'est arrêté. */}
          <Section titre="Ces six derniers mois" aide="Ce que tes ventes ont rapporté, mois par mois.">
            {d.mois.every((m) => !m.perins) ? (
              <div style={vide}>Rien de vendu sur la période.</div>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 110 }}>
                {d.mois.map((m) => (
                  <div key={m.mois} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: m.perins ? "var(--gold)" : "var(--text-muted)", fontWeight: 700 }}>
                      {m.perins ? fmt(m.perins) : "—"}
                    </span>
                    <div title={`${m.ventes} vente(s)`}
                      style={{ width: "100%", height: `${Math.max(3, (m.perins / maxMois) * 70)}px`, borderRadius: "4px 4px 0 0", background: m.perins ? "linear-gradient(180deg,#FFD24A,#FF8C1A)" : "var(--bg-3)" }} />
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{moisCourt(m.mois)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section titre="Ce que tu as vendu">
            {d.ventes.length === 0 ? (
              <div style={vide}>
                Aucune vente conclue. Quand quelqu&apos;un demande un objet que tu as, tu peux le lui fournir depuis{" "}
                <Link href="/messages" style={{ color: "var(--orange)" }}>ses demandes</Link>.
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
            )}
          </Section>

          {d.engagees.length > 0 && (
            <Section titre="Engagé, pas encore remis" aide="Tu t'es proposé, l'échange n'est pas conclu. Ce n'est pas encore à toi.">
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
            </Section>
          )}

          <Section titre="Tes parts de cagnotte"
            aide="Les commandes farmées à plusieurs : ta part suit ce que tu as ramené, et devient acquise quand le demandeur confirme la réception.">
            {d.parts.length === 0 ? (
              <div style={vide}>
                Tu n&apos;as encore participé à aucune commande collective. Elles se trouvent dans{" "}
                <Link href="/boutique?mode=requetes" style={{ color: "var(--orange)" }}>les requêtes clients</Link>.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {d.parts.map((p, i) => (
                  <div key={`${p.queteId}-${i}`} style={ligne}>
                    <span style={{ flex: "1 1 180px", minWidth: 0, fontWeight: 600 }}>{p.titre}</span>
                    <span style={{ color: "var(--text-muted)" }}>tu as ramené {fmt(p.quantite)}</span>
                    <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: .5, fontWeight: 700, color: p.acquise ? "var(--green)" : "var(--orange)", border: `1px solid ${p.acquise ? "var(--green)" : "var(--orange)"}`, borderRadius: 6, padding: "1px 7px" }}>
                      {p.acquise ? "acquise" : "attendue"}
                    </span>
                    <b style={{ marginLeft: "auto", color: p.acquise ? "var(--gold)" : "var(--text-muted)" }}>{fmt(p.part)} périns</b>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
            <Icon name="info" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Le site ne déplace pas de périns : il dit ce qui te revient, le versement se règle entre vous.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
