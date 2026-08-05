"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { AvatarCadre } from "@/components/AvatarCadre";

/**
 * Statistiques de la guilde — la vue d'ensemble.
 *
 * Le journal raconte les événements un par un ; ici on regarde l'ensemble :
 * qui porte l'entraide, qui ne fait que demander, et si l'activité monte ou
 * descend. Le classement est trié par XP donné, parce que c'est le seul chiffre
 * qui mesure ce qu'on APPORTE — le reste se déduit.
 */
type Membre = {
  id: string; nom: string; role: string; avatar: string | null;
  xp: number; niveau: number; depots: number; quetes: number; presences: number;
  unitesApportees: number; demandes: number; quetesOuvertes: number; actifRecemment: boolean;
};
type Stats = {
  totaux: {
    membresActifs: number; xpTotal: number; quetesOuvertes: number; quetesLivrees: number;
    unitesApportees: number; demandesEnAttente: number; demandesTotal: number;
  };
  parMembre: Membre[];
  parJour: { jour: string; xp: number; demandes: number }[];
};

function Chiffre({ valeur, label, icon, couleur = "var(--orange)" }: { valeur: number | string; label: string; icon: IconName; couleur?: string }) {
  return (
    <div className="glass-card fx-card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: "var(--bg-3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: couleur }}>
        <Icon name={icon} size={18} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="font-heading" style={{ display: "block", fontSize: 22, fontWeight: 700, color: couleur, lineHeight: 1 }}>
          {typeof valeur === "number" ? valeur.toLocaleString("fr-FR") : valeur}
        </span>
        <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 3 }}>{label}</span>
      </span>
    </div>
  );
}

export default function StatistiquesPage() {
  useCardFx();
  const [d, setD] = useState<Stats | null>(null);
  const [panne, setPanne] = useState("");

  useEffect(() => {
    fetch("/api/admin/statistiques")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setD)
      .catch((s) => setPanne(`Impossible de charger les statistiques (erreur ${s}).`));
  }, []);

  if (panne) return <div style={{ padding: 30, color: "var(--red)" }}>{panne}</div>;
  if (!d) return <div style={{ padding: 30, color: "var(--text-muted)" }}>Chargement…</div>;

  const maxJour = Math.max(1, ...d.parJour.map((j) => j.xp));

  return (
    <div style={{ padding: "24px 22px 60px", maxWidth: 1080, margin: "0 auto" }}>
      <PageHeader icon="bar-chart" title="Statistiques" subtitle="Qui porte l'entraide, qui ne fait que demander, et si l'activité monte ou descend." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, marginBottom: 22 }}>
        <Chiffre valeur={d.totaux.membresActifs} label="membres vus ce mois-ci" icon="users" />
        <Chiffre valeur={d.totaux.xpTotal} label="XP donné, tous membres" icon="medal" couleur="var(--green)" />
        <Chiffre valeur={d.totaux.unitesApportees} label="objets livrés en quête" icon="package" couleur="var(--gold)" />
        <Chiffre valeur={`${d.totaux.quetesLivrees} / ${d.totaux.quetesLivrees + d.totaux.quetesOuvertes}`} label="quêtes bouclées" icon="target" />
        <Chiffre valeur={d.totaux.demandesEnAttente} label="demandes en attente" icon="cart" couleur={d.totaux.demandesEnAttente ? "var(--red)" : "var(--text-muted)"} />
        <Chiffre valeur={d.totaux.demandesTotal} label="demandes au total" icon="clipboard" couleur="var(--text-muted)" />
      </div>

      {/* ── Activité ── */}
      <div className="glass-card fx-card" style={{ padding: 16, marginBottom: 22 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="trending" size={14} />30 derniers jours
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 12 }}>
          XP donné par jour. Une guilde qui s&apos;essouffle se voit ici avant de se voir ailleurs.
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 90 }}>
          {d.parJour.map((j) => (
            <div key={j.jour} title={`${j.jour} — ${j.xp} XP, ${j.demandes} demande(s)`}
              style={{ flex: 1, minWidth: 0, height: `${Math.max(2, (j.xp / maxJour) * 100)}%`, borderRadius: "3px 3px 0 0", background: j.xp ? "linear-gradient(180deg,#FFB552,#FF8C1A)" : "var(--bg-3)" }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-muted)", marginTop: 6 }}>
          <span>{new Date(d.parJour[0].jour).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
          <span>aujourd&apos;hui</span>
        </div>
      </div>

      {/* ── Par membre ── */}
      <div className="glass-card fx-card" style={{ padding: 16 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="users" size={14} />Membre par membre
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 12 }}>
          Trié par ce qui est DONNÉ. Un nom en bas avec beaucoup de demandes mérite une conversation, pas une sanction.
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="vg-table-membres" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ color: "var(--text-muted)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: .8 }}>
                <th style={{ textAlign: "left", padding: "6px 8px" }}>Membre</th>
                <th style={{ textAlign: "right", padding: "6px 8px" }}>XP donné</th>
                <th className="vg-col-sec" style={{ textAlign: "right", padding: "6px 8px" }}>Dépôts</th>
                <th className="vg-col-sec" style={{ textAlign: "right", padding: "6px 8px" }}>Quêtes</th>
                <th className="vg-col-sec" style={{ textAlign: "right", padding: "6px 8px" }}>CS</th>
                <th className="vg-col-sec" style={{ textAlign: "right", padding: "6px 8px" }}>Objets livrés</th>
                <th style={{ textAlign: "right", padding: "6px 8px" }}>Demandes</th>
                <th style={{ padding: "6px 8px" }} />
              </tr>
            </thead>
            <tbody>
              {d.parMembre.map((m) => (
                <tr key={m.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px", display: "flex", alignItems: "center", gap: 8 }}>
                    <AvatarCadre src={m.avatar} nom={m.nom} niveau={m.niveau} taille={26} />
                    <span>
                      <b>{m.nom}</b>
                      <span style={{ display: "block", fontSize: 10.5, color: "var(--text-muted)" }}>
                        niv. {m.niveau}{m.actifRecemment ? "" : " · pas vu ce mois-ci"}
                      </span>
                    </span>
                  </td>
                  <td style={{ textAlign: "right", padding: "8px", fontWeight: 700, color: m.xp ? "var(--green)" : "var(--text-muted)" }}>{m.xp.toLocaleString("fr-FR")}</td>
                  <td className="vg-col-sec" style={{ textAlign: "right", padding: "8px", color: "var(--text-muted)" }}>{m.depots || "—"}</td>
                  <td className="vg-col-sec" style={{ textAlign: "right", padding: "8px", color: "var(--text-muted)" }}>{m.quetes || "—"}</td>
                  <td className="vg-col-sec" style={{ textAlign: "right", padding: "8px", color: "var(--text-muted)" }}>{m.presences || "—"}</td>
                  <td className="vg-col-sec" style={{ textAlign: "right", padding: "8px", color: "var(--gold)" }}>{m.unitesApportees || "—"}</td>
                  <td style={{ textAlign: "right", padding: "8px", color: m.demandes && !m.xp ? "var(--red)" : "var(--text)" }}>{m.demandes || "—"}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    <Link href={`/journal?membre=${encodeURIComponent(m.nom)}`} style={{ color: "var(--orange)", textDecoration: "none", fontSize: 11.5, whiteSpace: "nowrap" }}>
                      journal →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
