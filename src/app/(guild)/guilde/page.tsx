"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx, useReveal } from "@/components/VgFx";
import { TitreStaff } from "@/components/staff/TitreStaff";
import { LaGuilde } from "@/components/accueil/LaGuilde";
import { QuiEstQui } from "@/components/guilde/QuiEstQui";
import { ClassesGuilde } from "@/components/guilde/ClassesGuilde";
import { SectionRecensement } from "@/components/guilde/Recensement";
import { CLASS_NAMES } from "@/data/classes";
import { CRENEAUX, prochaineSeance, type Seance } from "@/lib/compositions";
import { etatSuivi, type EtatSuivi, type InformationGuilde, type MembreGuilde } from "@/lib/guilde";
import { nomClasse } from "@/lib/mesures";

/**
 * INFORMATION GUILDE — /guilde, la page tout-en-un des MEMBRES (SPEC-INFORMATION-GUILDE
 * §2, demande de Maxime du 2026-10-21 : « avoir un œil pour tous les membres de la guilde
 * et connaître les personnes… pour avoir un bon récapitulatif sur cette page… et la page
 * suivi de la guilde l'avoir aussi dedans tout en un pour éviter les multiples pages »).
 *
 * Elle remplace la ligne « La guilde et ses règles » du menu Guilde, dont elle est la
 * première ligne, et c'est là qu'un membre arrive après la connexion (/api/arrivee). Un
 * visiteur ne l'ouvre pas : son gabarit (guild) appelle requireGuild, sa route apiGuild,
 * et le libellé « Guilde » de la barre le mène à la présentation publique, sur l'accueil.
 *
 * Dans l'ordre, le récapitulatif d'abord : le récap, « Qui est qui », les classes de la
 * guilde, le recensement (l'ancienne page /recensement, qui redirige ici), le suivi des
 * mesures, puis « La guilde » — l'histoire, ce que « présents » veut dire et les
 * objectifs, en entier, tels que l'accueil les montre.
 *
 * RIEN D'INTERNE : tout vient de GET /api/guilde (lib/guilde.ts), qui ne rend que ce qui
 * s'affiche. Pas de build non partagé, pas de note, pas de dossier, pas de dernière
 * visite, pas de motif d'absence — et c'est vrai aussi pour un bras droit qui la lit :
 * il a tout cela dans son tableau de bord.
 *
 * Les sections sont posées DÈS LE PREMIER RENDU (seul leur contenu attend la route) :
 * « La guilde » porte des `.vg-reveal`, que `useReveal` ne relève qu'au montage, et une
 * ancre (#recensement) doit exister quand le navigateur la cherche.
 */

const SOMMAIRE: { id: string; label: string; icon: IconName }[] = [
  { id: "qui", label: "Qui est qui", icon: "users" },
  { id: "classes", label: "Les classes", icon: "sword-cross" },
  { id: "recensement", label: "Recensement", icon: "gauge" },
  { id: "suivi", label: "Le suivi", icon: "target" },
  { id: "la-guilde", label: "La guilde", icon: "shield" },
];

const pl = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

export default function InformationGuildePage() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  useCardFx();

  const [d, setD] = useState<InformationGuilde | null>(null);
  const [panne, setPanne] = useState(false);
  useEffect(() => {
    let vivant = true;
    fetch("/api/guilde")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: InformationGuilde) => { if (vivant) setD(j); })
      .catch(() => { if (vivant) setPanne(true); });
    return () => { vivant = false; };
  }, []);

  /* La prochaine Chambre Secrète se choisit ICI, à l'heure du navigateur (lib/guilde : le
     serveur ne tourne pas à l'heure de Paris). Recalculée chaque minute : passé mercredi
     21 h 30, la page annonce dimanche sans qu'on la recharge. */
  const [seance, setSeance] = useState<Seance | null>(null);
  useEffect(() => {
    const maj = () => setSeance(prochaineSeance());
    maj();
    const t = setInterval(maj, 60_000);
    return () => clearInterval(t);
  }, []);

  /* ARRIVER PAR UNE ANCRE (#recensement depuis l'ancienne adresse, #la-guilde…). Le
     navigateur y défile au chargement, puis le contenu arrive AU-DESSUS et pousse la
     section plus bas. On y retourne une fois, quand tout est posé (MesPersonnages). */
  const recale = useRef(false);
  useEffect(() => {
    if (recale.current || !d) return;
    recale.current = true;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [d]);

  return (
    <div ref={ref} className="gn-accueil gn-ig">
      <PageHeader icon="landmark" title="Information Guilde"
        subtitle="Qui est qui, ce que la guilde aligne, et ses règles — la même page pour tous les membres." />

      {/* Le sommaire : les onglets du Suivi des bras droits, en ancres — la page est
          longue, et chaque section se rejoint d'un clic. */}
      <nav className="vg-subtabs gn-ig-sommaire" aria-label="Sur cette page">
        {SOMMAIRE.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="vg-subtab"><Icon name={s.icon} size={15} />{s.label}</a>
        ))}
      </nav>

      {panne && <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />Les informations de la guilde n&apos;ont pas pu être chargées. La section « La guilde », plus bas, reste lisible.</div>}

      {/* ── 1. Le récap ── */}
      <section id="recap" aria-label="Récapitulatif">
        {d ? <Recap d={d} seance={seance} /> : !panne && <div className="gn-attente" aria-hidden="true" />}
      </section>

      {/* ── 2. Qui est qui ── */}
      <section id="qui">
        <TitreStaff icon="users" droite={d ? pl(d.membres.length, "membre", "membres") : undefined}
          sous="Chaque membre, son rang, son Discord — l'identifiant se copie d'un clic — et ses personnages avec les chiffres qu'il a déclarés. Le build, seulement s'il l'a partagé — « Partager » dans l'AirBuilder, une case par perso.">
          Qui est qui
        </TitreStaff>
        {d ? <QuiEstQui membres={d.membres} recensement={d.recensement} /> : !panne && <div className="gn-attente" aria-hidden="true" />}
      </section>

      {/* ── 3. Les classes de la guilde ── la brique du Suivi des bras droits ; à côté de
          chaque perso, le nom Discord de qui le joue (la carte dit déjà le pseudo). */}
      <section id="classes">
        {d
          ? <ClassesGuilde titre="Les classes de la guilde" membres={d.membres.map((m) => ({ pseudo: m.discord.nom, persos: m.persos }))} />
          : <><TitreStaff icon="sword-cross">Les classes de la guilde</TitreStaff>{!panne && <div className="gn-attente" aria-hidden="true" />}</>}
      </section>

      {/* ── 4. Le recensement ── l'ancienne page /recensement. Sa frontière Suspense est
          à elle seule : ses filtres lisent l'adresse (useSearchParams). */}
      <section id="recensement">
        <TitreStaff icon="gauge" droite={d ? pl(d.recensement.length, "ligne", "lignes") : undefined}
          sous="Les dégâts et les PV de chacun, stuff par stuff — déclarés dans l'AirBuilder, datés, jamais vérifiés.">
          Recensement
        </TitreStaff>
        {d
          ? <Suspense fallback={<div className="gn-attente" aria-hidden="true" />}><SectionRecensement lignes={d.recensement} maintenant={d.maintenant} /></Suspense>
          : !panne && <div className="gn-attente" aria-hidden="true" />}
      </section>

      {/* ── 5. Le suivi des mesures ── */}
      <section id="suivi">
        <TitreStaff icon="target"
          sous="Qui a déclaré les dégâts ou les PV de chacun de ses stuffs, et qui doit les reprendre. Au-delà de 30 jours, une mesure est à refaire : une pièce, un +N ou un prestige ont pu bouger.">
          Le suivi des mesures
        </TitreStaff>
        {d ? <SuiviMesures membres={d.membres} /> : !panne && <div className="gn-attente" aria-hidden="true" />}
      </section>

      {/* ── 6. La guilde ── la section de l'accueil, affichée en entier. `membre` : la
          phrase du hero l'ouvre, et le cadenas « membres » ne se pose plus sur un lien
          que le lecteur peut ouvrir. */}
      <LaGuilde membre titre={<TitreStaff icon="shield">La guilde</TitreStaff>} />
    </div>
  );
}

/* ── Le récap ─────────────────────────────────────────────────────────────────
   Les compteurs de /staff (.gn-compteur), dans l'ordre de la spec : les membres, les
   classes représentées, le prochain rendez-vous, les absents du jour, les stuffs
   mesurés. Chacun mène à la section — ou à la page — qui le détaille. */
function Recap({ d, seance }: { d: InformationGuilde; seance: Seance | null }) {
  const persos = d.membres.flatMap((m) => m.persos);
  const jouees = new Set(persos.map((p) => nomClasse(p.classe)));
  const manquent = CLASS_NAMES.map(nomClasse).filter((c) => !jouees.has(c));
  const stuffs = d.membres.reduce((s, m) => ({
    montes: s.montes + m.mesures.montes, mesures: s.mesures + m.mesures.aJour + m.mesures.aRemesurer,
    aRemesurer: s.aRemesurer + m.mesures.aRemesurer, manquantes: s.manquantes + m.mesures.manquantes,
  }), { montes: 0, mesures: 0, aRemesurer: 0, manquantes: 0 });
  /* La teinte dit ce qui reste à faire, comme les pastilles d'état (EtatMesures) : des
     chiffres manquants d'abord, des mesures vieillies ensuite. Un « 0 » en vert sur 18
     stuffs montés se lisait comme une bonne nouvelle. */
  const teinteStuffs = stuffs.manquantes ? "var(--gn-crimson-texte)" : stuffs.aRemesurer ? "var(--gold)" : stuffs.montes ? "var(--green)" : "var(--text)";

  /* Les annonces qui valent pour CETTE séance : celles faites depuis l'ouverture de sa
     préparation — la règle de `presencesSeance` (lib/compositions). */
  const vaut = (a: { creneau: string; ts: number }) => !!seance && a.creneau === seance.creneau && a.ts >= seance.ouverture.getTime();
  const annonces = d.cs.annonces.filter(vaut).length;
  const annonce = d.cs.miennes.some(vaut);
  const jourSeance = seance?.debut.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="gn-compteurs gn-ig-recap">
      <Compteur href="#qui" icon="users" couleur="var(--text)" valeur={String(d.membres.length)} libelle={d.membres.length > 1 ? "membres" : "membre"}
        detail={pl(persos.length, "personnage", "personnages")} />
      <Compteur href="#classes" icon="sword-cross" couleur="var(--gn-accent)" valeur={`${jouees.size} / ${CLASS_NAMES.length}`} libelle="classes représentées"
        detail={manquent.length === 0 ? "les huit sont jouées" : `personne en ${manquent.join(", ")}`} />
      <Compteur href="/compositions" icon="castle" couleur="var(--gold)"
        valeur={seance ? `${CRENEAUX.find((c) => c.id === seance.creneau)?.court ?? ""} ${seance.debut.getHours()} h` : "—"} libelle="Chambre Secrète"
        detail={seance ? `${jourSeance} · ${pl(annonces, "annoncé", "annoncés")} sur ${d.cs.places} places${annonce ? " · tu es annoncé" : ""}` : undefined} />
      <Compteur icon="moon" couleur={d.absents.length ? "var(--gold)" : "var(--text)"} valeur={String(d.absents.length)}
        libelle={d.absents.length > 1 ? "absents aujourd'hui" : "absent aujourd'hui"}
        detail={d.absents.length ? d.absents.join(", ") : "personne aujourd'hui"} />
      <Compteur href="#suivi" icon="target" couleur={teinteStuffs} valeur={String(stuffs.mesures)}
        libelle={stuffs.mesures > 1 ? "stuffs mesurés" : "stuff mesuré"}
        detail={[
          `sur ${pl(stuffs.montes, "stuff monté", "stuffs montés")}`,
          stuffs.aRemesurer ? `dont ${stuffs.aRemesurer} à remesurer` : "",
          stuffs.manquantes ? `${stuffs.manquantes} sans chiffre` : "",
        ].filter(Boolean).join(" · ")} />
    </div>
  );
}

/** Un compteur de /staff (`Compteur`) ; sans `href`, celui du recensement (`Compte`). */
function Compteur({ href, icon, couleur, valeur, libelle, detail }: { href?: string; icon: IconName; couleur: string; valeur: string; libelle: string; detail?: string }) {
  const dedans = (
    <>
      <span className="gn-compteur-fond"><Icon name={icon} size={50} /></span>
      <span className="gn-compteur-trait" style={{ background: couleur }} />
      <span className="font-heading gn-compteur-n" style={{ color: couleur }}>{valeur}</span>
      <span className="gn-compteur-l">{libelle}</span>
      {detail && <span className="gn-compteur-d">{detail}</span>}
    </>
  );
  return href
    ? <Link href={href} className="gn-compteur glass-card fx-card">{dedans}</Link>
    : <div className="gn-compteur glass-card fx-card">{dedans}</div>;
}

/* ── Le suivi des mesures ─────────────────────────────────────────────────────
   « Qui a mesuré ses stuffs, qui doit remesurer » (§2.5) — en NOMS, rangés par ce qui
   reste à faire. Les cartes des persos par classe (ClassesGuilde) : un titre, un compte,
   et une ligne par membre. Pas de note, pas de dossier, pas de dernière visite : ce que
   le membre a déclaré dans l'AirBuilder, rien d'autre. */
const GROUPES_SUIVI: { etat: EtatSuivi; titre: string; icon: IconName; couleur: string; dire: (m: MembreGuilde) => string }[] = [
  { etat: "manquantes", titre: "Mesures manquantes", icon: "alert", couleur: "var(--gn-crimson-texte)",
    dire: (m) => `${m.mesures.manquantes} sans chiffre sur ${pl(m.mesures.montes, "stuff", "stuffs")}` },
  { etat: "a-remesurer", titre: "À remesurer", icon: "clock", couleur: "var(--gold)",
    dire: (m) => `${m.mesures.aRemesurer} à refaire sur ${pl(m.mesures.montes, "stuff", "stuffs")}` },
  { etat: "a-jour", titre: "À jour", icon: "check", couleur: "var(--green)",
    dire: (m) => (m.mesures.montes > 1 ? `ses ${m.mesures.montes} stuffs mesurés` : "son stuff mesuré") },
  { etat: "aucun", titre: "Aucun stuff monté", icon: "shirt", couleur: "var(--text-muted)",
    dire: (m) => (m.persos.length ? "rien de porté dans l'AirBuilder" : "pas encore de personnage") },
];

function SuiviMesures({ membres }: { membres: MembreGuilde[] }) {
  const groupes = useMemo(() => GROUPES_SUIVI
    .map((g) => ({ ...g, liste: membres.filter((m) => etatSuivi(m.mesures) === g.etat) }))
    .filter((g) => g.liste.length), [membres]);
  if (!groupes.length) return <div className="glass-card" style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>Personne dans la guilde pour l&apos;instant.</div>;
  return (
    <div className="gn-suivi-classes">
      {groupes.map((g) => (
        <div key={g.etat} className="glass-card fx-card" style={{ padding: "14px 15px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <Icon name={g.icon} size={20} style={{ color: g.couleur, flexShrink: 0 }} />
            <span className="font-heading" style={{ fontSize: 15, fontWeight: 700 }}>{g.titre}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{pl(g.liste.length, "membre", "membres")}</span>
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {g.liste.map((m) => (
              <div key={m.discord.id} className={`gn-ig-suivi-l${m.moi ? " moi" : ""}`}>
                <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{m.pseudo}</span>
                {m.moi && <span className="gn-rec-toi">toi</span>}
                <span style={{ marginLeft: "auto", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{g.dire(m)}</span>
                {/* Le seul geste de la section, pour soi : « Mes personnages » rouvre chaque
                    stuff dans l'AirBuilder. */}
                {m.moi && (g.etat === "manquantes" || g.etat === "a-remesurer") && (
                  <Link href="/personnages" className="gn-rec-lien" style={{ flexShrink: 0, fontSize: 12 }} title="Mes personnages : chaque stuff s'y rouvre dans l'AirBuilder">Corriger</Link>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
