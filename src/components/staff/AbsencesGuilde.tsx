"use client";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { StatCartes } from "@/components/staff/MembresBuilds";
import { canAccessGuild } from "@/config/roles";
import type { Role } from "@prisma/client";

type Absence = { id: string; userId: string; startDate: string; endDate: string; reason: string | null; status: string; user: { username: string; role: Role } };

/* Les dates d'absence sont des JOURS, stockés à minuit UTC, bornes comprises : on compare
   des dates, comme la file des bras droits, et non des instants. */
const jourUTC = (iso: string) => iso.slice(0, 10);
const jourParis = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const jourCourt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });
const STATUT_ABS: Record<string, { l: string; c: string }> = { APPROVED: { l: "acceptée", c: "var(--green)" }, PENDING: { l: "en attente", c: "var(--gold)" }, REJECTED: { l: "refusée", c: "var(--red)" } };

/**
 * LES ABSENCES DE LA GUILDE — la section « Absences » du tableau de bord des bras droits.
 * C'était la vue `?vue=absences` du GuildViewer : la liste que le staff n'avait nulle
 * part, quand les absences ne se lisaient que dans le dossier de CHAQUE membre.
 *
 * Le statut est montré tel qu'il est en base, sans geste pour le changer : valider une
 * absence, ou seulement la déclarer, est une question encore ouverte.
 *
 * Seule lecture de /api/absences?all=1, réservée au staff par la route ; faite à la
 * première ouverture de la section, pas avant.
 */
export function AbsencesGuilde({ onDossier }: { onDossier: (userId: string) => void }) {
  const [absences, setAbsences] = useState<Absence[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let vivant = true;
    fetch("/api/absences?all=1")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Absence[]) => { if (vivant) setAbsences(j); })
      .catch(() => { if (vivant) setErr(true); });
    return () => { vivant = false; };
  }, []);

  if (err) return <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />Les absences n&apos;ont pas pu être chargées.</div>;
  if (!absences) return <div className="gn-attente" aria-hidden="true" />;

  const auj = jourParis(new Date());
  const hier = new Date(Date.parse(`${auj}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const il30j = new Date(Date.parse(`${auj}T00:00:00Z`) - 30 * 86_400_000).toISOString().slice(0, 10);
  // La guilde seulement, et sans les refus : comme le compte de la file.
  const liste = absences.filter((a) => canAccessGuild(a.user.role) && a.status !== "REJECTED");
  const enCours = liste.filter((a) => jourUTC(a.startDate) <= auj && jourUTC(a.endDate) >= auj);
  const aVenir = liste.filter((a) => jourUTC(a.startDate) > auj).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const finies = liste.filter((a) => jourUTC(a.endDate) < auj && jourUTC(a.endDate) >= il30j).sort((a, b) => b.endDate.localeCompare(a.endDate));
  /* Les cartes comptent des MEMBRES, comme la file : deux absences qui se chevauchent ne
     font pas deux absents, et qui enchaîne sur une autre absence n'est pas « de retour ». */
  const absents = new Set(enCours.map((a) => a.userId));
  const deRetour = new Set(finies.filter((a) => jourUTC(a.endDate) === hier && !absents.has(a.userId)).map((a) => a.userId)).size;

  const groupe = (titre: string, ic: IconName, l: Absence[], vide: string) => (
    <div className="glass-card" style={{ padding: "14px 16px", marginBottom: 14 }}>
      <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 10 }}>
        <Icon name={ic} size={13} />{titre}{l.length > 0 && <span style={{ marginLeft: "auto", color: "var(--gn-accent)", letterSpacing: 0 }}>{l.length}</span>}
      </div>
      {l.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{vide}</div> : (
        <div style={{ display: "grid", gap: 7 }}>
          {l.map((a) => {
            const s = STATUT_ABS[a.status] ?? { l: a.status, c: "var(--text-muted)" };
            const jours = Math.max(1, Math.round((Date.parse(a.endDate) - Date.parse(a.startDate)) / 86_400_000) + 1);
            const retour = jourUTC(a.endDate) === hier;
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "var(--bg-3)", border: `1px solid ${retour ? "var(--gold)" : "var(--border)"}`, borderRadius: 10, padding: "9px 12px", fontSize: 12.5, minWidth: 0 }}>
                <button onClick={() => onDossier(a.userId)} title={`Ouvrir le dossier de ${a.user.username}`}
                  style={{ fontSize: 12, fontWeight: 700, cursor: "pointer", color: "var(--text)", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 11px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "inherit" }}>
                  <Icon name="scroll" size={14} />{a.user.username}
                </button>
                <span style={{ minWidth: 140 }}>
                  <b>{jourCourt(a.startDate)} → {jourCourt(a.endDate)}</b>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{jours} jour{jours > 1 ? "s" : ""}{retour ? " · de retour aujourd'hui" : ""}</span>
                </span>
                {a.reason && <span style={{ flex: "1 1 140px", minWidth: 0, color: "var(--text-muted)", fontStyle: "italic" }}>« {a.reason} »</span>}
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: s.c, border: `1px solid color-mix(in srgb, ${s.c} 42%, transparent)`, background: `color-mix(in srgb, ${s.c} 11%, transparent)`, borderRadius: 6, padding: "2px 9px" }}>{s.l}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      <StatCartes liste={[
        { v: absents.size, l: "absents aujourd'hui", c: absents.size ? "var(--gold)" : "var(--green)", icon: "moon" },
        { v: deRetour, l: "de retour aujourd'hui", c: "var(--text)", icon: "user-check" },
        { v: aVenir.length, l: "absences annoncées", c: "var(--gn-accent)", icon: "calendar" },
      ]} />
      {groupe("En ce moment", "clock", enCours, "Personne n'est absent aujourd'hui.")}
      {groupe("Annoncées", "calendar", aVenir, "Aucune absence annoncée.")}
      {groupe("Terminées ces 30 derniers jours", "check", finies, "Aucune absence ces 30 derniers jours.")}
    </>
  );
}
