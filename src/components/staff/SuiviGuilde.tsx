"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClassLogo } from "@/components/ClassLogo";
import { VgSelect } from "@/components/VgSelect";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { TitreStaff } from "@/components/staff/TitreStaff";
import { ClassesGuilde, Jauge } from "@/components/guilde/ClassesGuilde";
import { EtatMesures, chiffresEnClair, conditionsEnClair } from "@/components/staff/MesuresStuff";
import { CLASS_NAMES, findClass } from "@/data/classes";
import { ROLE_LIBELLE, chiffreDeTri, nomClasse, type RoleMesure } from "@/lib/mesures";
import { chiffreCourt as court, type ResumeRecensement } from "@/lib/recensement";
import type { MembreSuivi, PersoSuivi, StuffSuivi, Suivi } from "@/lib/recap";

/**
 * LE SUIVI DE LA GUILDE — la section « Suivi » du tableau de bord des bras droits (/staff).
 *
 * Demande de Maxime, mot pour mot : « un suivi du stuff, dashboard, les classes de la
 * guilde, dégâts etc… les choses utiles ». Il remplace les statistiques et le journal,
 * partis avec la Boutique : ceux-là comptaient des ventes, celui-ci compte ce qui sert à
 * COMPOSER — qui a un stuff, qui l'a mesuré, ce qu'il fait, et ce que la guilde aligne
 * par classe.
 *
 * C'était la page /suivi ; elle est devenue une section de /staff le 2026-10-21
 * (SPEC-INFORMATION-GUILDE §3 : « une page, plus de pages éclatées »), et /suivi y
 * redirige avec sa requête. Trois vues, toujours dans l'adresse (?vue=, ?filtre=) pour
 * que la file y mène : le stuff de chacun, les classes, les dégâts et PV. Tout vient de
 * /api/admin/suivi (lib/recap.ts) — les compteurs du haut sont ceux de la file.
 *
 * Le dossier d'un membre s'ouvre dans la page (`onDossier`), sans la quitter.
 */

const VUES: { clef: string; label: string; icon: IconName }[] = [
  { clef: "stuff", label: "Le stuff", icon: "shirt" },
  { clef: "classes", label: "Les classes", icon: "sword-cross" },
  { clef: "degats", label: "Dégâts & PV", icon: "target" },
];
const FILTRES = [
  { value: "", label: "Tous les persos" },
  { value: "sans-build", label: "Sans build" },
  { value: "a-renseigner", label: "Mesures manquantes" },
  { value: "a-remesurer", label: "À remesurer" },
  { value: "sans-perso", label: "Membres sans perso" },
];
const RANG_LIBELLE: Record<string, string> = { DIRECTION: "Direction", VANGUARD: "Vanguard", GENERAL: "Général", OFFICIER: "Officier", VETERAN: "Vétéran", GUARD: "Guard" };
const INACTIF_APRES_MS = 30 * 86_400_000;

/** « auj. », « hier », « 12 j », « jamais » — comme la pastille du GuildViewer. */
function derniereVisite(iso: string | null): string {
  if (!iso) return "jamais venu";
  const j = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return j <= 0 ? "venu aujourd'hui" : j === 1 ? "venu hier" : `venu il y a ${j} j`;
}

/** Les valeurs de `?filtre=` que cette section lit — la page ignore les autres. */
export const FILTRES_SUIVI = FILTRES.map((f) => f.value).filter(Boolean);

export function SuiviGuilde({ vue: vueBrute, filtre: filtreBrut, onChanger, onDossier, version }: {
  vue: string | null; filtre: string | null;
  onChanger: (modifs: Record<string, string | null>) => void;
  onDossier: (userId: string) => void;
  /** La page l'incrémente après un geste du dossier : un membre sorti quitte le suivi. */
  version: number;
}) {
  const vue = VUES.some((v) => v.clef === vueBrute) ? String(vueBrute) : "stuff";
  const filtre = FILTRES.some((f) => f.value === filtreBrut) ? String(filtreBrut) : "";

  const [s, setS] = useState<Suivi | null>(null);
  const [panne, setPanne] = useState(false);
  useEffect(() => {
    fetch("/api/admin/suivi").then((r) => (r.ok ? r.json() : Promise.reject())).then(setS).catch(() => setPanne(true));
  }, [version]);

  return (
    <>
      {panne && <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />Le suivi n&apos;a pas pu être chargé.</div>}
      {!s && !panne && <div className="gn-attente" aria-hidden="true" />}

      {s && (
        <>
          <EtatDeLaGuilde s={s} />

          {/* Mêmes onglets que ceux du Bot Discord (Embed, Giveaway, Panneau) : des vues
              d'une même section, pas des pages. */}
          <div className="vg-subtabs" style={{ marginTop: 26 }}>
            {VUES.map((v) => (
              <button key={v.clef} className={`vg-subtab ${vue === v.clef ? "active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                onClick={() => onChanger({ vue: v.clef === "stuff" ? null : v.clef })}>
                <Icon name={v.icon} size={15} />{v.label}
              </button>
            ))}
          </div>

          <div key={vue} className="vg-swap">
            {vue === "stuff" && <VueStuff membres={s.membres} filtre={filtre} onFiltre={(f) => onChanger({ filtre: f || null })} onDossier={onDossier} />}
            {vue === "classes" && <VueClasses membres={s.membres} />}
            {vue === "degats" && <VueDegats membres={s.membres} />}
          </div>
        </>
      )}
    </>
  );
}

/* ── Les indicateurs : des longueurs, comme l'état de la guilde de l'accueil ───────
   Une seule teinte de jauge, un plancher à 1,5 %, et ce qui ne va pas dit en MOTS à
   côté de la barre — les règles de Grandeurs, recopiées. */
function EtatDeLaGuilde({ s }: { s: Suivi }) {
  const c = s.compteurs;
  const lignes = [
    { label: "Membres venus en 30 jours", icon: "users" as IconName, n: c.actifs30j, total: c.membres, de: "membres",
      note: c.membres - c.actifs30j ? `${c.membres - c.actifs30j} sans visite depuis 30 jours` : undefined },
    { label: "Persos avec un build", icon: "shirt" as IconName, n: c.persos - c.persosSansBuild, total: c.persos, de: "persos",
      note: c.persosSansBuild ? `${c.persosSansBuild} sans aucune pièce` : undefined },
    { label: "Stuffs mesurés", icon: "target" as IconName, n: c.stuffsMesures, total: c.stuffsMontes, de: "stuffs montés",
      note: [c.stuffsARenseigner ? `${c.stuffsARenseigner} à renseigner` : "", c.stuffsARemesurer ? `${c.stuffsARemesurer} à remesurer` : ""].filter(Boolean).join(" · ") || undefined },
  ].filter((l) => l.total > 0);
  return (
    <>
      <TitreStaff icon="gauge">L&apos;état de la guilde</TitreStaff>
      <div className="gn-carte">
        {lignes.length === 0
          ? <div style={{ color: "var(--text-muted)", fontSize: 13.5 }}>Rien à mesurer pour l&apos;instant — la guilde n&apos;a encore aucun perso déclaré.</div>
          : <div className="gn-j-bloc">{lignes.map((l) => (
              <div key={l.label} className="gn-j-ligne">
                <span className="gn-j-lab"><Icon name={l.icon} size={15} style={{ color: "var(--gn-accent)", flexShrink: 0 }} /><span className="gn-j-lab-t">{l.label}</span></span>
                <span className="gn-j-mid"><Jauge part={l.n / l.total} />{l.note && <span className="gn-j-note">{l.note}</span>}</span>
                <span className="gn-j-chif"><b>{l.n}</b><span className="gn-j-tot">/ {l.total} {l.de}</span></span>
                <span className="gn-j-pc">{Math.round((l.n / l.total) * 100)} %</span>
              </div>
            ))}</div>}
      </div>
    </>
  );
}

/* La jauge (plancher à 1,5 %, un vrai zéro sans barre) est celle de ClassesGuilde. */

/* ── Vue 1 : le stuff de chacun ──────────────────────────────────────────── */
function VueStuff({ membres, filtre, onFiltre, onDossier }: { membres: MembreSuivi[]; filtre: string; onFiltre: (f: string) => void; onDossier: (userId: string) => void }) {
  const [q, setQ] = useState("");
  const liste = useMemo(() => {
    const garde = (p: PersoSuivi) =>
      filtre === "sans-build" ? p.stuffs.length === 0
        : filtre === "a-renseigner" || filtre === "a-remesurer" ? p.stuffs.some((x) => x.etat === filtre)
          : true;
    const needle = q.trim().toLowerCase();
    return membres
      .filter((m) => (filtre === "sans-perso" ? m.persos.length === 0 : true))
      .filter((m) => !needle || m.pseudo.toLowerCase().includes(needle) || m.persos.some((p) => p.nom.toLowerCase().includes(needle) || nomClasse(p.classe).toLowerCase().includes(needle)))
      .map((m) => ({ ...m, persos: m.persos.filter(garde) }))
      .filter((m) => filtre === "sans-perso" || !filtre ? true : m.persos.length > 0);
  }, [membres, filtre, q]);

  const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 13px", color: "var(--text)", fontSize: 14 };
  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <input style={{ ...inp, flex: 1, minWidth: 220 }} placeholder="Rechercher un membre, un perso, une classe…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ minWidth: 210 }}><VgSelect value={filtre} onChange={onFiltre} options={FILTRES} /></div>
      </div>
      {liste.length === 0
        ? <div className="glass-card" style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>{filtre ? "Personne dans ce cas — c'est une bonne nouvelle." : "Aucun membre ne correspond."}</div>
        : liste.map((m) => <CarteMembre key={m.id} m={m} onDossier={onDossier} />)}
    </>
  );
}

function CarteMembre({ m, onDossier }: { m: MembreSuivi; onDossier: (userId: string) => void }) {
  const absent = !m.lastSeenAt || Date.now() - Date.parse(m.lastSeenAt) > INACTIF_APRES_MS;
  return (
    <div className="glass-card fx-card" style={{ padding: 0, marginBottom: 13, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", flexWrap: "wrap" }}>
        <span className="font-heading" style={{ fontWeight: 700, fontSize: 16 }}>{m.pseudo}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gn-accent)", textTransform: "uppercase", letterSpacing: 0.6 }}>{RANG_LIBELLE[m.role] ?? m.role}</span>
        <span style={{ fontSize: 12, color: absent ? "var(--gold)" : "var(--text-muted)" }}>{derniereVisite(m.lastSeenAt)}</span>
        <button onClick={() => onDossier(m.id)} title={`Ouvrir le dossier de ${m.pseudo}`}
          style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "var(--text)", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 11px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "inherit" }}>
          <Icon name="scroll" size={14} />Dossier
        </button>
      </div>
      {m.persos.length === 0 ? (
        <div style={{ margin: "0 16px 14px", padding: "11px 14px", background: "rgba(255,210,74,.06)", border: "1px dashed var(--gold)", borderRadius: 10, fontSize: 12.5, color: "var(--gold)" }}>
          <Icon name="alert" size={14} style={{ marginRight: 6 }} />Aucun personnage déclaré — à inviter à créer ses persos dans l&apos;AirBuilder.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 7, padding: "0 16px 14px" }}>
          {m.persos.map((p) => (
            <div key={p.id} className="gn-suivi-perso">
              <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0, flexWrap: "wrap" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--border)" }}><ClassLogo name={p.classe} size={23} /></div>
                <div style={{ minWidth: 130, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.nom} {p.principal && <span title="Personnage principal" style={{ display: "inline-flex", color: "var(--gold)" }}><Icon name="star" size={12} /></span>}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{nomClasse(p.classe)} · Niv {p.niveau} · P{p.prestige}</div>
                </div>
                {p.stuffs.length === 0
                  ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--red)", background: "rgba(248,113,113,.1)", border: "1px solid var(--red)", borderRadius: 6, padding: "2px 9px" }}>aucun build</span>
                  : <a className="vg-touch" href={`/builder/${m.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--gn-accent)", background: "rgba(var(--gn-lueur-rgb),.1)", border: "1px solid var(--gn-accent)", borderRadius: 6, padding: "3px 10px", textDecoration: "none", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="sword" size={12} />Voir le build ↗</a>}
              </div>
              {p.stuffs.length > 0 && (
                <div style={{ display: "grid", gap: 5, marginTop: 8 }}>
                  {p.stuffs.map((x) => <LigneStuff key={x.id} classe={p.classe} x={x} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LigneStuff({ classe, x }: { classe: string; x: StuffSuivi }) {
  const chiffres = chiffresEnClair(classe, x.role, x.v);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, minWidth: 0 }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 6, border: "1px solid var(--border)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{ROLE_LIBELLE[x.role]}</span>
      {/* Le nom du stuff seulement s'il dit autre chose que son rôle (« DPS · DPS »). */}
      {x.nom.toLowerCase() !== ROLE_LIBELLE[x.role].toLowerCase() && <span style={{ fontWeight: 600 }}>{x.nom}</span>}
      {chiffres && <span style={{ fontVariantNumeric: "tabular-nums" }}>{chiffres}</span>}
      {x.etat !== "a-renseigner" && <span style={{ color: "var(--text-muted)", minWidth: 0 }}>{conditionsEnClair(x)}</span>}
      <span style={{ marginLeft: "auto" }} title={x.mesureLe ? `Mesuré le ${new Date(x.mesureLe).toLocaleDateString("fr-FR")}` : undefined}><EtatMesures etat={x.etat} /></span>
    </div>
  );
}

/* ── Vue 2 : les classes de la guilde ───────────────────────────────────────
   La répartition et les persos par classe vivent dans components/guilde/ClassesGuilde :
   Information Guilde montre la même chose à tous les membres (2026-10-21), et deux copies
   auraient divergé au premier réglage. */
function VueClasses({ membres }: { membres: MembreSuivi[] }) {
  return <ClassesGuilde membres={membres} />;
}

/* ── Vue 3 : les dégâts et PV mesurés ─────────────────────────────────────── */
const ROLES: { role: RoleMesure; titre: string; icon: IconName; sous: string }[] = [
  { role: "dps", titre: "DPS", icon: "sword", sous: "Mesurés sur le totem de l'Oasis. Classés par DPS/s — le maximum, pour les classes qui mesurent un minimum et un maximum." },
  { role: "tank", titre: "Tank", icon: "shield", sous: "Les PV dans la fenêtre du personnage : en poing (Primat, Chanoine), en doloire (Templier)." },
  { role: "offtank", titre: "Off tank", icon: "shield-check", sous: "Le Primat seul, PV en sceptre." },
];

function VueDegats({ membres }: { membres: MembreSuivi[] }) {
  type Mesure = StuffSuivi & { perso: string; classe: string; pseudo: string; userId: string };
  const tous: Mesure[] = membres.flatMap((m) => m.persos.flatMap((p) => p.stuffs.map((x) => ({ ...x, perso: p.nom, classe: p.classe, pseudo: m.pseudo, userId: m.id }))));
  const mesures = tous.filter((x) => x.etat === "complet" || x.etat === "a-remesurer");

  if (mesures.length === 0) {
    return (
      <>
        <ResumeDuRecensement />
        <div className="glass-card" style={{ padding: 28, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5, marginTop: 8 }}>
          Aucune mesure enregistrée pour l&apos;instant. Chaque joueur les saisit dans l&apos;AirBuilder, stuff par stuff
          {tous.length ? ` — ${tous.length} stuff${tous.length > 1 ? "s" : ""} monté${tous.length > 1 ? "s" : ""} les attendent` : ""}.
        </div>
      </>
    );
  }

  return (
    <>
      <ResumeDuRecensement />
      {ROLES.map((r) => {
        const duRole = mesures.filter((x) => x.role === r.role);
        const attendent = tous.filter((x) => x.role === r.role && x.etat === "a-renseigner").length;
        if (!duRole.length && !attendent) return null;
        /* Une classe à la fois : une Bulle d'Arcaniste et un DPS de Spadassin ne se
           comparent pas, et un classement commun ferait croire le contraire. */
        const classes = CLASS_NAMES.map((nom) => ({
          nom,
          l: duRole.filter((x) => nomClasse(x.classe) === nomClasse(nom))
            .sort((a, b) => chiffreDeTri(b.classe, r.role, b.v) - chiffreDeTri(a.classe, r.role, a.v)),
        })).filter((c) => c.l.length);
        return (
          <div key={r.role}>
            <TitreStaff icon={r.icon} sous={r.sous} droite={attendent ? `${attendent} stuff${attendent > 1 ? "s" : ""} sans mesures` : undefined}>{r.titre}</TitreStaff>
            {classes.length === 0
              ? <div className="glass-card" style={{ padding: 18, color: "var(--text-muted)", fontSize: 13 }}>Aucun stuff {r.titre} mesuré pour l&apos;instant.</div>
              : <div style={{ display: "grid", gap: 12 }}>
                  {classes.map((c) => (
                    <div key={c.nom} className="glass-card" style={{ padding: "13px 15px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
                        <ClassLogo name={c.nom} size={22} />
                        <span className="font-heading" style={{ fontSize: 14, fontWeight: 700 }}>{nomClasse(c.nom)}</span>
                        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>{c.l.length} mesure{c.l.length > 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ display: "grid", gap: 5 }}>
                        {c.l.map((x, i) => (
                          <div key={x.id} className="gn-classement">
                            <span className="font-heading gn-classement-rang">{i + 1}</span>
                            <span style={{ minWidth: 0 }}>
                              <b>{x.perso}</b> <span style={{ color: "var(--text-muted)" }}>· {x.pseudo}{x.nom.toLowerCase() !== ROLE_LIBELLE[x.role].toLowerCase() ? ` · ${x.nom}` : ""}</span>
                              <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{conditionsEnClair(x)}</span>
                            </span>
                            <span className="gn-classement-chiffre">
                              <b>{court(chiffreDeTri(x.classe, r.role, x.v))}</b>
                              <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", fontWeight: 400 }}>{chiffresEnClair(x.classe, r.role, x.v)}</span>
                            </span>
                            <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                              {x.etat === "a-remesurer" && <EtatMesures etat="a-remesurer" />}
                              <a className="vg-touch" href={`/builder/${x.userId}`} target="_blank" rel="noopener noreferrer" title="Voir le build" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--gn-accent)", background: "rgba(var(--gn-lueur-rgb),.1)", border: "1px solid var(--gn-accent)", borderRadius: 6, padding: "3px 10px", textDecoration: "none", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="sword" size={12} />Build ↗</a>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>}
          </div>
        );
      })}
    </>
  );
}

/* ── Le résumé du recensement (spec §12.4) ──────────────────────────────────────
   La rubrique Suivi ne recompte pas : elle lit la vue résumée de /api/recensement — les
   mêmes lignes que celles des membres, comptées par classe — et renvoie au recensement
   pour le détail. Le recensement est une SECTION d'Information Guilde depuis le
   2026-10-21 (/guilde#recensement, filtres dans l'adresse) : les liens y vont tout droit,
   sans passer par la redirection de l'ancienne adresse /recensement. */
const RAISON: Record<"sans_mesure" | "incomplet" | "a_remesurer", string> = {
  sans_mesure: "sans mesure", incomplet: "incomplet", a_remesurer: "à remesurer",
};

function ResumeDuRecensement() {
  const [r, setR] = useState<ResumeRecensement | null>(null);
  const [panne, setPanne] = useState(false);
  useEffect(() => {
    fetch("/api/recensement?vue=resume").then((x) => (x.ok ? x.json() : Promise.reject())).then(setR).catch(() => setPanne(true));
  }, []);
  const relances = r?.aRelancer ?? [];
  const parRaison = (Object.keys(RAISON) as (keyof typeof RAISON)[])
    .map((k) => ({ k, n: relances.filter((x) => x.raison === k).length })).filter((x) => x.n);
  const med = (n: number | null) => (n === null ? <span style={{ color: "var(--text-muted)" }}>—</span> : <b>{court(n)}</b>);
  return (
    <>
      <TitreStaff icon="gauge" sous="La médiane des chiffres déclarés, classe par classe, et ce qui reste à mesurer. Le détail, perso par perso, est dans le recensement d'Information Guilde."
        droite={<Link href="/guilde#recensement" className="gn-titre-lien">Le recensement →</Link>}>Par classe</TitreStaff>
      {panne && <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />Le résumé du recensement n&apos;a pas pu être lu.</div>}
      {!r && !panne && <div className="gn-attente" aria-hidden="true" />}
      {r && (
        <div className="gn-rec-resume">
          <div className="gn-rec-resume-l gn-rec-resume-tete" aria-hidden="true">
            <span>Classe</span><span>DPS/s médian</span><span>PV médians</span><span>PV sceptre</span><span>Chiffres</span><span>À reprendre</span>
          </div>
          {r.parClasse.map((c) => (
            <Link key={c.classe} href={`/guilde?classe=${encodeURIComponent(findClass(c.classe)?.key ?? c.classe)}#recensement`} className="gn-rec-resume-l" title={`Ouvrir le recensement des ${c.classe}`}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}><ClassLogo name={c.classe} size={20} /><b style={{ fontWeight: 600 }}>{c.classe}</b></span>
              {/* `data-l` : le nom de la colonne, que le téléphone écrit devant chaque valeur
                  quand l'en-tête disparaît — « 4,9 M » seul ne dirait pas s'il s'agit de
                  PV en poing ou en sceptre. */}
              <span data-l="DPS/s">{med(c.dpsMedian)}</span>
              <span data-l="PV">{med(c.pvMedian)}</span>
              <span data-l="Sceptre">{med(c.pvSceptreMedian)}</span>
              <span>{c.mesures} <span style={{ color: "var(--text-muted)" }}>pour {c.persos} perso{c.persos > 1 ? "s" : ""}</span></span>
              <span style={{ color: c.aRemesurer || c.incomplets ? "var(--gold)" : "var(--text-muted)" }}>
                {[c.incomplets ? `${c.incomplets} incomplet${c.incomplets > 1 ? "s" : ""}` : "", c.aRemesurer ? `${c.aRemesurer} à remesurer` : ""].filter(Boolean).join(" · ") || "—"}
              </span>
            </Link>
          ))}
          {parRaison.length > 0 && (
            <Link href="/guilde?manque=1#recensement" className="gn-rec-resume-relance" title={relances.map((x) => `${x.perso} (${x.joueur}) — ${RAISON[x.raison]}`).join("\n")}>
              <Icon name="alert" size={14} style={{ color: "var(--gold)", flexShrink: 0 }} />
              À relancer : {parRaison.map((x) => `${x.n} ${RAISON[x.k]}`).join(", ")}
            </Link>
          )}
        </div>
      )}
    </>
  );
}
