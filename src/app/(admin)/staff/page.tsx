"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx, useReveal } from "@/components/VgFx";
import { PortesSite, type Porte } from "@/components/accueil/PortesSite";
import { TitreStaff } from "@/components/staff/TitreStaff";
import { FileATraiter } from "@/components/staff/FileATraiter";
import { MembresBuilds } from "@/components/staff/MembresBuilds";
import { AbsencesGuilde } from "@/components/staff/AbsencesGuilde";
import { SuiviGuilde } from "@/components/staff/SuiviGuilde";
import { Candidatures } from "@/components/staff/Candidatures";
import { DossierMembre, estOngletDossier } from "@/components/DossierMembre";
import { ESPACES } from "@/config/nav";
import type { Recap } from "@/lib/recap";

/**
 * LE TABLEAU DE BORD DES BRAS DROITS — /staff, TOUT-EN-UN (SPEC-INFORMATION-GUILDE §3).
 *
 * Demande de Maxime du 2026-10-21 : « la page suivi de la guilde l'avoir aussi dedans tout
 * en un pour éviter les multiples pages et trouver les informations nécessaires sur un
 * même endroit ». Le travail des bras droits tenait sur quatre pages — la file ici, le
 * GuildViewer, le Suivi, les Candidatures — et chaque ligne de la file renvoyait sur une
 * autre. Ce sont maintenant les SECTIONS d'une seule page :
 *
 *   · Tableau de bord — la file « À traiter », les compteurs, et les outils ;
 *   · Membres & builds — l'ancien GuildViewer (/guildviewer y redirige) ;
 *   · Absences — l'ancienne vue `?vue=absences` du GuildViewer ;
 *   · Suivi — l'ancienne page /suivi (qui y redirige), avec ses trois vues ;
 *   · Candidatures — l'ancienne page /candidatures (qui y redirige).
 *
 * L'ADRESSE PORTE L'ÉTAT, comme avant : `?section=`, et pour chaque section ses propres
 * paramètres (?filtre=, ?vue=, ?statut=) — un onglet est une adresse propre, ceux d'une
 * section ne suivent pas dans une autre. Les anciennes adresses arrivent ici avec leur
 * requête (next.config.js) : /guildviewer?vue=absences ouvre les Absences.
 *
 * LE DOSSIER D'UN MEMBRE se porte au niveau de la page (?dossier=, ?onglet=) : il s'ouvre
 * de n'importe quelle section — une carte de membre, une absence, une ligne du suivi, la
 * file — et toutes les notifications qui ouvraient /guildviewer?dossier= l'ouvrent
 * toujours. Un geste fait dans le dossier fait relire la liste, le suivi et la file — à
 * son dépôt, puis à l'arrivée du verdict du bot.
 *
 * Les onglets sont lus dans config/nav.ts (rubrique « Tableau de bord ») : la barre du
 * site et cette page nomment les mêmes sections.
 */

type Section = "tableau" | "membres" | "absences" | "suivi" | "candidatures";
const ONGLETS: { section: Section; label: string; icon: IconName; href: string }[] =
  (ESPACES.find((e) => e.acces === "admin")?.liens ?? [])
    .filter((l) => l.groupe === "Tableau de bord")
    .map((l) => ({ section: (new URLSearchParams(l.href.split("?")[1] ?? "").get("section") ?? "tableau") as Section, label: l.label, icon: l.icon, href: l.href }));
const SECTIONS = new Set<string>(ONGLETS.map((o) => o.section));

export default function StaffPage() {
  useCardFx();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const brute = sp.get("section") ?? "";
  /* /guildviewer?vue=absences arrive en ?section=membres&vue=absences (la requête suit la
     redirection) : c'est la section Absences. */
  const section: Section = brute === "membres" && sp.get("vue") === "absences" ? "absences"
    : SECTIONS.has(brute) ? (brute as Section) : "tableau";
  const dossier = sp.get("dossier");
  const ongletDossier = sp.get("onglet");

  const changer = (modifs: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(modifs)) if (!v) p.delete(k); else p.set(k, v);
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  const ouvrirDossier = (id: string, onglet?: string) => changer({ dossier: id, onglet: onglet ?? null });
  const fermerDossier = () => changer({ dossier: null, onglet: null });

  /* Après un geste du dossier (un rang, un membre caché ou sorti), la liste, le suivi et
     la file se relisent : sans ça, la carte disait encore l'état d'avant. */
  const [version, setVersion] = useState(0);
  /* Le dossier se monte sur <body> par portail : il n'existe pas au rendu serveur. Une
     alerte qui arrive avec ?dossier= rendait sinon la page en erreur 500 (« document is
     not defined »). Il s'ouvre donc au premier rendu du navigateur. */
  const [navigateur, setNavigateur] = useState(false);
  useEffect(() => setNavigateur(true), []);
  const lienSection = (s: Section) => {
    const o = ONGLETS.find((x) => x.section === s);
    return o?.href ?? "/staff";
  };

  return (
    <div style={{ padding: "28px 32px 64px", maxWidth: 1150, margin: "0 auto" }}>
      <PageHeader icon="crown" title="Bras droits" subtitle="Ce qui attend un geste du staff, les membres et leurs builds, le suivi de la guilde et les candidatures — sur une seule page." />

      {/* Les sections : la barre d'onglets du Suivi (.vg-subtabs, icône devant le
          libellé), en liens — chacune a son adresse, et la file y mène. */}
      <nav className="vg-subtabs gn-staff-onglets" aria-label="Sections du tableau de bord">
        {ONGLETS.map((o) => (
          <Link key={o.section} href={o.href} scroll={false} className={`vg-subtab ${section === o.section ? "active" : ""}`} aria-current={section === o.section ? "page" : undefined}>
            <Icon name={o.icon} size={15} />{o.label}
          </Link>
        ))}
      </nav>

      <div key={section} className="vg-swap">
        {section === "tableau" && <SectionTableau version={version} lienSection={lienSection} />}

        {section === "membres" && (
          <>
            <TitreStaff icon="users" sous="Chaque membre, ses persos, ses builds et leurs mesures. Le dossier : ses absences, les décisions prises, les notes — et les gestes.">Membres &amp; builds</TitreStaff>
            <MembresBuilds filtre={sp.get("filtre")} onFiltre={(f) => changer({ filtre: f })} onDossier={(id) => ouvrirDossier(id)} version={version} />
          </>
        )}

        {section === "absences" && (
          <>
            <TitreStaff icon="moon" sous="Qui est absent aujourd'hui, qui revient, et ce qui est annoncé.">Absences de la guilde</TitreStaff>
            <AbsencesGuilde onDossier={(id) => ouvrirDossier(id, "absences")} />
          </>
        )}

        {section === "suivi" && (
          <SuiviGuilde vue={sp.get("vue")} filtre={sp.get("filtre")} onChanger={changer} onDossier={(id) => ouvrirDossier(id)} version={version} />
        )}

        {section === "candidatures" && (
          <>
            <TitreStaff icon="user-plus" sous="Les demandes d'entrée, à accepter, refuser, mettre en attente ou en entretien.">Candidatures</TitreStaff>
            <Candidatures statut={sp.get("statut")} />
          </>
        )}
      </div>

      {navigateur && dossier && (
        <DossierMembre key={dossier} userId={dossier} onglet={estOngletDossier(ongletDossier) ? ongletDossier : undefined}
          onFermer={fermerDossier} onChange={() => setVersion((v) => v + 1)} />
      )}
    </div>
  );
}

const pl = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

/** Les outils des bras droits, lus dans la carte (rubrique « Outils »), pas recopiés. */
const OUTILS = (ESPACES.find((e) => e.acces === "admin")?.liens ?? []).filter((l) => l.groupe === "Outils");

/** Ce que chaque outil affiche du relevé — rien quand il n'y a rien à compter. */
function chiffreOutil(href: string, r: Recap | null): { texte: string; ton?: string } | null {
  if (!r) return null;
  const ligne = (clef: string) => r.lignes.find((l) => l.clef === clef);
  if (href === "/discord") {
    if (ligne("bot-muet")) return { texte: "le bot ne répond plus", ton: "var(--red)" };
    const l = ligne("bot-echecs");
    return l ? { texte: pl(l.nombre, "échec", "échecs"), ton: "var(--gold)" } : null;
  }
  if (href === "/gestion-worldboss") {
    const l = ligne("worldboss");
    return l ? { texte: l.detail ?? pl(l.nombre, "passage", "passages"), ton: "var(--red)" } : null;
  }
  return null;
}

/**
 * La section d'arrivée : la file « À traiter », la plus urgente en tête, les compteurs —
 * chacun mène à la section qu'il compte —, puis les outils.
 *
 * Elle a son propre `useReveal` : les portes des outils portent `.vg-reveal`, que le hook
 * ne relève qu'au montage, et cette section se monte à chaque retour sur l'onglet.
 */
function SectionTableau({ version, lienSection }: { version: number; lienSection: (s: Section) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);

  const [r, setR] = useState<Recap | null>(null);
  const [etat, setEtat] = useState<"attente" | "ok" | "panne">("attente");
  useEffect(() => {
    let vivant = true;
    const lire = () => fetch("/api/admin/a-traiter")
      .then((x) => (x.ok ? x.json() : Promise.reject(new Error(String(x.status)))))
      .then((j: Recap) => { if (vivant) { setR(j); setEtat("ok"); } })
      .catch(() => { if (vivant) setEtat((e) => (e === "ok" ? e : "panne")); });
    lire();
    // Une file qui se périme sous les yeux ment : relue chaque minute, onglet ouvert.
    const t = setInterval(lire, 60_000);
    return () => { vivant = false; clearInterval(t); };
  }, [version]);

  const c = r?.compteurs;
  const releve = r ? new Date(r.genereLe).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : null;
  const membres = lienSection("membres");
  const suivi = lienSection("suivi");

  return (
    <div ref={ref}>
      <TitreStaff icon="zap" droite={releve ? `relevé à ${releve}` : undefined}>À traiter</TitreStaff>
      {etat === "attente" && <div className="gn-attente" aria-hidden="true" />}
      {etat === "panne" && (
        <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />La file n&apos;a pas pu être lue. Les autres sections fonctionnent quand même.</div>
      )}
      {etat === "ok" && r && <FileATraiter lignes={r.lignes} />}

      <TitreStaff icon="gauge">En chiffres</TitreStaff>
      <div className="gn-compteurs">
        <Compteur href={membres} icon="user-check" couleur="var(--green)" valeur={c?.actifs30j} libelle="membres actifs (30 j)"
          detail={c ? `sur ${pl(c.membres, "membre", "membres")} de la guilde` : undefined} />
        <Compteur href={lienSection("absences")} icon="moon" couleur={c?.absentsAujourdhui ? "var(--gold)" : "var(--text)"} valeur={c?.absentsAujourdhui} libelle="absents aujourd'hui"
          detail={c?.deRetourAujourdhui ? `${c.deRetourAujourdhui} de retour aujourd'hui` : c ? "personne de retour aujourd'hui" : undefined} />
        <Compteur href={suivi} icon="target" couleur="var(--gn-accent)" valeur={c?.stuffsMesures} libelle="stuffs mesurés"
          detail={c ? `${c.stuffsARemesurer ? `dont ${c.stuffsARemesurer} à remesurer · ` : ""}sur ${pl(c.stuffsMontes, "stuff monté", "stuffs montés")}` : undefined} />
        <Compteur href={`${suivi}&filtre=sans-build`} icon="shirt" couleur={c?.persosSansBuild ? "var(--red)" : "var(--green)"} valeur={c?.persosSansBuild} libelle="persos sans build"
          detail={c ? `sur ${pl(c.persos, "perso", "persos")}` : undefined} />
      </div>

      <TitreStaff icon="wrench" sous="Le bot, les passages de World Boss et les événements qu'il annonce.">Outils</TitreStaff>
      <PortesSite min={300} portes={OUTILS.map((l): Porte => {
        const ch = chiffreOutil(l.href, r);
        return { href: l.href, icon: l.icon, titre: l.label, texte: l.desc, chiffre: ch?.texte, ton: ch?.ton };
      })} />
    </div>
  );
}

/** Un compteur : la carte chiffrée du GuildViewer, qui mène à la section qu'elle compte. */
function Compteur({ href, icon, couleur, valeur, libelle, detail }: { href: string; icon: IconName; couleur: string; valeur?: number; libelle: string; detail?: string }) {
  return (
    <Link href={href} scroll={false} className="gn-compteur glass-card fx-card">
      <span className="gn-compteur-fond"><Icon name={icon} size={50} /></span>
      <span className="gn-compteur-trait" style={{ background: couleur }} />
      <span className="font-heading gn-compteur-n" style={{ color: couleur }}>{valeur ?? "—"}</span>
      <span className="gn-compteur-l">{libelle}</span>
      {detail && <span className="gn-compteur-d">{detail}</span>}
    </Link>
  );
}
