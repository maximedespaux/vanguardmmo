"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Role } from "@prisma/client";
import { canAccessAdmin } from "@/config/roles";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx, useReveal } from "@/components/VgFx";
import { PortesSite, type Porte } from "@/components/accueil/PortesSite";
import { useReglages } from "@/components/reglages/PanneauReglages";
import type { SchemaPage } from "@/lib/reglages";
import type { Dashboard, Profil } from "./donnees";
import { Classes, Grandeurs } from "./Grandeurs";
import { OuJenSuis } from "./OuJenSuis";
import { GROUPES, PORTE_SOMMAIRE, porteDe } from "./portes";

/**
 * L'ACCUEIL DE LA GUILDE — /dashboard.
 *
 * Demande de Maxime, mot pour mot : « améliore la partie accueil et la
 * description, faire un même système pour l'accueil guilde (par défaut l'accueil
 * de la guilde) pour retrouver les informations et fonctionnalités, pour cliquer
 * plus facilement, un accès plus simple ».
 *
 * ┌──────────────── CE QUE LA PAGE ÉTAIT, ET CE QUI N'ALLAIT PAS ────────────────┐
 * │ Elle s'appelait « GuildViewer · Tableau de bord » et alignait, dans cet       │
 * │ ordre : une bannière au mot anglais, un bandeau orange « Mets à jour ton      │
 * │ build » qui s'affichait même quand tout était à jour, sept cartes de trois    │
 * │ chiffres nus, un graphique de classes, puis trois « hubs » qui répétaient     │
 * │ des chiffres déjà affichés au-dessus.                                        │
 * │ Trois défauts, et le troisième est le vrai sujet :                            │
 * │  1. les chiffres nus ne disent pas s'ils sont bons — deux absences, c'est peu │
 * │     ou beaucoup ? La réponse est dans le rapport, jamais dans le nombre ;     │
 * │  2. rien sur le membre lui-même, alors que c'est SA page d'accueil ;          │
 * │  3. sur une trentaine de pages réservées, la page en atteignait SEPT. Pour    │
 * │     les autres il fallait retrouver le bon menu déroulant. « Un accès plus    │
 * │     simple » ne demandait pas un plus beau tableau : il demandait des PORTES. │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * ELLE REPREND LE SYSTÈME DE L'ACCUEIL PUBLIC, sans le recopier :
 * `components/accueil/PortesSite.tsx` est le MÊME composant, appelé avec une autre
 * liste et une autre densité de colonnes. Un visiteur et un membre apprennent donc
 * la même forme une seule fois.
 *
 * TROIS CHOSES QU'ELLE NE FAIT PLUS, et pourquoi :
 *
 *   · LE BANDEAU « METS À JOUR TON BUILD » est parti. Il s'affichait toujours,
 *     donc il ne voulait rien dire, et il disait trois fois la même chose que la
 *     porte AirBuilder et que le bloc « où j'en suis » — lequel, lui, ne le dit
 *     que s'il y a vraiment un personnage sans stuff.
 *   · LES TROIS « HUBS » DU BAS sont partis : ils reprenaient mot pour mot les
 *     chiffres des cartes du dessus, avec un bouton en plus.
 *   · LA PAGE NE S'ARRÊTE PLUS SUR UN ÉCRAN DE CHARGEMENT. Elle rendait
 *     « Chargement du dashboard… » à la place de TOUT, et « Impossible de charger
 *     les données » à la place de TOUT quand une clef manquait au relevé — c'est
 *     ce qui a fait tomber la page entière le jour où l'API a cessé de renvoyer
 *     `debts`. L'en-tête et les portes n'ont besoin d'aucune donnée : elles
 *     s'affichent tout de suite, et les mesures arrivent dedans.
 */

/**
 * CE QUE LE RANG VANGUARD PEUT RÉGLER ICI.
 *
 * La règle de la maison, respectée à la lettre : TOUS LES DÉFAUTS SONT L'ÉTAT
 * LIVRÉ. Tant que personne n'ouvre le panneau, la page se comporte exactement
 * comme si les réglages n'existaient pas — et si la base est injoignable, pareil.
 */
const SCHEMA: SchemaPage = {
  page: "/dashboard",
  titre: "L'accueil de la guilde",
  quoi: "Quels blocs on montre, dans quel ordre, et combien de personnages on liste.",
  reglages: [
    { clef: "montrerPriorites", type: "interrupteur", defaut: true, label: "Les priorités du jour", aide: "Le bandeau du staff, tout en haut. Il ne s'affiche de toute façon qu'au staff." },
    { clef: "montrerOuJenSuis", type: "interrupteur", defaut: true, label: "« Où j'en suis »", aide: "Les personnages du membre connecté, et lesquels n'ont pas de stuff." },
    { clef: "montrerGrandeurs", type: "interrupteur", defaut: true, label: "L'état de la guilde", aide: "Les barres : membres actifs, personnages équipés, coffre, candidatures." },
    { clef: "montrerClasses", type: "interrupteur", defaut: true, label: "Les classes représentées", aide: "La répartition des personnages de la guilde, classe par classe." },
    { clef: "portesEnPremier", type: "interrupteur", defaut: false, label: "Les portes avant les chiffres", aide: "Par défaut on voit d'abord où on en est, puis les portes." },
    /* LE MODE COMPACT, et pourquoi il existe.
       Vingt-et-une portes, c'est vingt-et-une lignes de description : environ deux
       cents mots de plus qu'avant sur cette page, alors que la consigne de la maison
       est que le nombre de mots BAISSE. Ces mots ne sont pas de la prose neuve — ce
       sont les libellés que la nav écrit déjà dans ses menus — et c'est justement
       cette ligne qui, d'après nav.ts, « répond à je m'y perds ». Trancher pour
       Maxime aurait été présomptueux : l'interrupteur le laisse décider en un clic,
       et son défaut est ce qu'on livre. */
    { clef: "descriptionsDesPortes", type: "interrupteur", defaut: true, label: "La description sous chaque porte", aide: "Décoché, une porte n'affiche que son nom et son compte — la page tient sur beaucoup moins de hauteur." },
    { clef: "persosMontres", type: "nombre", defaut: 4, min: 1, max: 12, label: "Personnages listés dans « Où j'en suis »", aide: "Au-delà, un lien mène à la page des personnages." },

    /* ┌───────── QUELLES PORTES, ET DANS QUEL ORDRE ─────────┐
       Demande du lot : « Le tableau de bord est un bon candidat : quelles portes on
       montre, dans quel ordre. »

       UN INTERRUPTEUR PAR GROUPE, et pas un par porte. Vingt-trois cases à cocher
       font un panneau qu'on n'ouvre plus, et le grain utile n'est pas la porte :
       c'est la FAMILLE. Un officier qui vit dans les outils du staff veut « Tenir la
       guilde » en premier, pas déplacer /annonce d'un cran.

       LES CLEFS SONT DÉRIVÉES DE `GROUPES` : ajouter une famille lui donne son
       interrupteur sans qu'on y pense, et en retirer une fait disparaître le sien.
       Le libellé du réglage est celui du groupe — impossible qu'ils divergent.

       TOUS LES DÉFAUTS SONT L'ÉTAT ACTUEL, sans exception : chaque groupe est visible
       (`defaut: true`) et l'ordre par défaut est celui du fichier. Tant que personne
       n'ouvre le panneau, la page rend exactement ce qu'elle rendait avant. */
    ...GROUPES.map((g) => ({
      clef: `voir_${g.clef}` as const, type: "interrupteur" as const, defaut: true,
      label: `Le groupe « ${g.titre} »`,
      aide: g.admin ? "Réservé au staff de toute façon." : "Décoché, ses portes disparaissent de l'accueil.",
    })),
    {
      clef: "premierGroupe", type: "choix", defaut: "",
      label: "Le groupe à mettre en premier",
      aide: "Les autres gardent leur ordre. « L'ordre du site » est ce qu'on livre.",
      options: [{ valeur: "", label: "L'ordre du site" }, ...GROUPES.map((g) => ({ valeur: g.clef, label: g.titre }))],
    },
  ],
};

const PRIO_COULEUR = { haute: "var(--red)", moyenne: "var(--gold)", basse: "var(--text-muted)" } as const;

/**
 * Un titre de section, à la charte des autres pages du site.
 *
 * `tardif` RETIRE l'apparition au défilement, et ce n'est pas un détail de goût :
 * voir la note « CE QUI NE PORTE PAS .vg-reveal » plus bas. Un titre qui n'apparaît
 * qu'une fois le relevé arrivé ne doit PAS porter la classe, sinon il reste
 * invisible pour de bon.
 */
function Titre({ icon, children, sous, tardif }: { icon: IconName; children: React.ReactNode; sous?: string; tardif?: boolean }) {
  return (
    <div className={tardif ? undefined : "vg-reveal"} style={{ margin: "34px 0 14px" }}>
      <h2 className="font-heading" style={{ fontSize: 20, textTransform: "uppercase", letterSpacing: 1, margin: 0, display: "flex", alignItems: "center", gap: 11 }}>
        <Icon name={icon} framed frameSize={32} tone="orange" /> <span className="vg-h2">{children}</span>
      </h2>
      {sous && <p style={{ margin: "8px 0 0", fontFamily: "'Alef',sans-serif", fontSize: 13, color: "var(--text-muted)", letterSpacing: ".2px" }}>{sous}</p>}
    </div>
  );
}

/** Le temps que les relevés arrivent : une bande neutre, pas un mot d'attente. */
function Attente() {
  return <div className="dash-attente" aria-hidden="true" />;
}

export default function AccueilGuildePage() {
  const conteneur = useRef<HTMLDivElement>(null);
  // Mêmes effets que l'accueil public : révélation au défilement (avec le repli de
  // useReveal, sans lequel un élément raté par l'observateur reste invisible pour
  // de bon) et halo au curseur sur les .fx-card.
  useReveal(conteneur);
  useCardFx();
  /* ┌──────────── CE QUI NE PORTE PAS `.vg-reveal`, ET POURQUOI ────────────┐
     │ `useReveal` RELÈVE LA LISTE DES `.vg-reveal` UNE SEULE FOIS, au       │
     │ montage (son effet ne dépend que de la référence). Un bloc qui        │
     │ n'apparaît qu'à l'arrivée du relevé n'est donc jamais observé, jamais │
     │ balayé — et `.vg-reveal` vaut `opacity:0` dans globals.css. Il reste  │
     │ INVISIBLE POUR DE BON.                                               │
     │ Mesuré dans le navigateur sur cette page : les priorités, « Où j'en   │
     │ suis », l'état de la guilde et les classes restaient à opacity 0      │
     │ après un défilement complet, à 1280 px comme à 375 px. La page        │
     │ n'affichait que ses titres au-dessus du vide.                        │
     │ D'où la règle, locale et sans risque : TOUT CE QUI DÉPEND DE `etatD`  │
     │ OU DE `etatP` REND SANS `.vg-reveal`. Les portes et l'en-tête, eux,   │
     │ sont là dès le premier rendu et gardent leur apparition.             │
     │ (Le vrai correctif est dans `useReveal` — voir `demandesGlobales`.)   │
     └──────────────────────────────────────────────────────────────────────┘ */

  const { data: session } = useSession();
  const DEV_TOUT = process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";
  const role = ((session?.user as { role?: Role } | undefined)?.role ?? "RECRUE") as Role;
  const staff = DEV_TOUT || canAccessAdmin(role);

  const { valeurs, bouton, panneau } = useReglages(SCHEMA);
  const voir = (clef: string) => Boolean(valeurs[clef]);

  const [d, setD] = useState<Dashboard | null>(null);
  const [p, setP] = useState<Profil | null>(null);
  /** L'état de CHAQUE relevé, séparément : l'un peut manquer sans l'autre. */
  const [etatD, setEtatD] = useState<"attente" | "ok" | "panne">("attente");
  const [etatP, setEtatP] = useState<"attente" | "ok" | "panne">("attente");

  useEffect(() => {
    let vivant = true;
    // Les deux relevés en parallèle et TRAITÉS SÉPARÉMENT. Dans un seul try/catch,
    // un profil indisponible emportait les chiffres de la guilde avec lui.
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: Dashboard) => { if (vivant) { setD(j); setEtatD("ok"); } })
      .catch(() => { if (vivant) setEtatD("panne"); });
    fetch("/api/profil")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: Profil) => { if (vivant) { setP(j); setEtatP("ok"); } })
      .catch(() => { if (vivant) setEtatP("panne"); });
    return () => { vivant = false; };
  }, []);

  /**
   * Les portes, groupe par groupe, avec leur compte du moment.
   *
   * Une porte dont la définition ne se résout pas (adresse disparue de la nav)
   * est ÉCARTÉE plutôt qu'affichée à moitié — voir `porteDe`. Un groupe qui se
   * vide disparaît avec elle : un titre de section au-dessus du vide se lit comme
   * une panne.
   */
  const avecTexte = voir("descriptionsDesPortes");
  const premier = String(valeurs.premierGroupe ?? "");
  const groupes = useMemo(
    () => {
      const liste = GROUPES
        .filter((g) => !g.admin || staff)
        // Le réglage de visibilité du groupe, avant tout le reste : un groupe éteint
        // ne coûte même pas la résolution de ses portes.
        .filter((g) => Boolean(valeurs[`voir_${g.clef}`] ?? true))
        .map((g) => ({
          ...g,
          portes: g.defs
            .map((def) => porteDe(def, d, p))
            .filter((x): x is Porte => x !== null)
            // Mode compact : on vide le texte, PortesSite ne rend alors pas la ligne.
            .map((x) => (avecTexte ? x : { ...x, texte: "" })),
        }))
        .filter((g) => g.portes.length > 0);
      /* REMONTER UN GROUPE, PAS RÉORDONNER LES QUATRE. Un tri complet demanderait
         quatre champs de rang dans le panneau, et personne ne veut classer une liste
         de quatre à la main. Ce qu'on veut vraiment, c'est « celui-là d'abord » — et
         les autres gardent leur ordre relatif, ce qui laisse la page reconnaissable.
         Un groupe éteint ou absent (le staff, pour un membre) ne fait rien : le
         `findIndex` rend -1 et on ne touche à rien. */
      const i = premier ? liste.findIndex((g) => g.clef === premier) : -1;
      if (i > 0) liste.unshift(...liste.splice(i, 1));
      return liste;
    },
    [d, p, staff, avecTexte, valeurs, premier],
  );

  // COMPTÉ, jamais écrit : le sous-titre annonce ce nombre, et le taper à la main
  // le rendrait faux à la première porte ajoutée ou au premier changement de rang.
  const nbPortes = groupes.reduce((s, g) => s + g.portes.length, 0) + 1;

  const prios = voir("montrerPriorites") && staff ? d?.priorities ?? [] : [];

  const blocMoi = (
    <>
      {voir("montrerOuJenSuis") && (
        <>
          <Titre icon="user">Où j&apos;en suis</Titre>
          {etatP === "attente" && <Attente />}
          {etatP === "ok" && p && <div><OuJenSuis p={p} max={Number(valeurs.persosMontres)} /></div>}
          {etatP === "panne" && (
            <div className="dash-panne">
              <Icon name="alert" size={14} style={{ flexShrink: 0 }} />
              Tes personnages n&apos;ont pas pu être chargés. Le reste de la page est à jour.
            </div>
          )}
        </>
      )}

      {voir("montrerGrandeurs") && (
        <>
          {/* Pas de sous-titre. Il disait « chaque barre est une part d'un tout,
              c'est la longueur qui compare, jamais la couleur » : une note sur notre
              propre convention de dessin, alors que chaque ligne porte déjà
              « 12 / 14 membres » et « 86 % » à droite de sa barre. */}
          <Titre icon="gauge">L&apos;état de la guilde</Titre>
          {etatD === "attente" && <Attente />}
          {etatD === "ok" && d && <div className="dash-carte"><Grandeurs d={d} staff={staff} /></div>}
          {etatD === "panne" && (
            <div className="dash-panne">
              <Icon name="alert" size={14} style={{ flexShrink: 0 }} />
              Les chiffres de la guilde n&apos;ont pas répondu. Les portes ci-dessous fonctionnent quand même.
            </div>
          )}
        </>
      )}

      {voir("montrerClasses") && etatD === "ok" && d && (
        <>
          <Titre icon="sword-cross" tardif>Les classes représentées</Titre>
          <div className="dash-carte"><Classes d={d} /></div>
        </>
      )}
    </>
  );

  const blocPortes = (
    <>
      {groupes.map((g) => (
        <div key={g.clef}>
          <Titre icon={g.icon} sous={g.sous}>{g.titre}</Titre>
          {/* 330 px et non les 400 du défaut : quatre portes veulent 2×2 sur
              l'accueil public, une vingtaine veut trois colonnes. Voir la note de
              la grille dans PortesSite. */}
          <PortesSite portes={g.portes} min={330} />
        </div>
      ))}

      {/* L'index complet, à part : ce n'est pas un outil, c'est le filet. */}
      <div style={{ marginTop: 22 }}>
        <PortesSite portes={[avecTexte ? PORTE_SOMMAIRE : { ...PORTE_SOMMAIRE, texte: "" }]} min={330} />
      </div>
    </>
  );

  return (
    <div ref={conteneur} className="dash-accueil" style={{ padding: "28px 32px 64px", maxWidth: 1100, margin: "0 auto" }}>
      {/* L'ART DE L'EN-TÊTE EST UNE CAPTURE DU VRAI AIRBORN —
          `accueil/flyff00000.webp`, la seule image du dépôt prise sur le serveur
          lui-même et non dans l'imagerie de base du jeu. C'est la règle : ce qui
          vaut la place, c'est ce qu'Airborn a changé.
          Le recadrage est CALCULÉ, pas choisi à l'œil, et sa valeur est celle du
          bloc de style plus bas (24 %) : le détail du calcul y est. Aucun texte du
          jeu n'entre dans le cadre — vérifié en recadrant le fichier source sur la
          bande réellement visible (19,1 %–39,4 % de la hauteur).
          `banner` n'est pas repris : notre bannière disait « Dashboard », le mot
          anglais dessiné dans l'image, et cette page ne s'appelle plus comme ça. */}
      <PageHeader
        art="/jeu/accueil/flyff00000.webp"
        icon="home"
        title="L'accueil de la guilde"
        /* « ... vers ce qui est réservé aux membres » était FAUX, et vérifié groupe de
           routes par groupe de routes : sur les 23 portes, /builder et /personnages
           vivent dans (public), /boutique et /crafts dans (vitrine) — quatre pages
           qu'un visiteur ouvre sans compte. Le sous-titre dit maintenant ce que les
           23 portes ont réellement en commun : ce sont les outils de la guilde. */
        subtitle={`Ce qui t'attend, où tu en es, et ${nbPortes} portes vers les outils de la guilde.`}
        right={bouton}
      />

      {/* ── Priorités du jour (staff) ──
          Le seul bloc qui n'a pas bougé : il était déjà le plus utile de la page.
          Il ne s'affiche que s'il y a quelque chose, et il le dit quand il n'y a
          rien — un bandeau vide laisse croire que le relevé n'est pas passé. */}
      {voir("montrerPriorites") && staff && etatD === "ok" && (
        <div className="dash-prio">
          <div className="font-heading dash-prio-t">
            <Icon name="zap" size={15} /> Priorités du jour
          </div>
          {prios.length === 0 ? (
            <div style={{ color: "var(--green)", fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <Icon name="check" size={16} /> Rien à signaler — tout est à jour.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {prios.map((pr, i) => (
                <Link key={i} href={pr.href} className="dash-prio-row">
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: PRIO_COULEUR[pr.level], flexShrink: 0 }} />
                  <span className="font-heading" style={{ fontSize: 18, fontWeight: 700, color: PRIO_COULEUR[pr.level], minWidth: 28, fontVariantNumeric: "tabular-nums" }}>{pr.count}</span>
                  <span style={{ fontSize: 14 }}>{pr.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>{pr.level} →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* L'ordre des deux moitiés est le seul réglage qui change la STRUCTURE de la
          page, et son défaut est celui qu'on livre : sur son accueil, un membre
          veut d'abord savoir où il en est. */}
      {voir("portesEnPremier") ? <>{blocPortes}{blocMoi}</> : <>{blocMoi}{blocPortes}</>}

      {panneau}

      <style>{`
        /* LE RECADRAGE DE L'ART DE L'EN-TETE, et il n'est pas decoratif.
           globals.css cadre tous les arts de page a « center 38 % », ce qui convient
           aux artworks peints. Celle-ci est une CAPTURE d'ecran du serveur, et elle
           porte donc du texte : l'interface du client occupe son cinquieme haut, les
           PSEUDOS DES AUTRES JOUEURS et une infobulle d'objet vivent vers 43-56 % de
           la hauteur, et le bandeau de discussion tout en bas.
           Les valeurs sont MESUREES dans le navigateur, pas estimees. A 38 % la bande
           visible tombait en plein sur les pseudos. A 30 % elle courait de 23,9 % a
           44,2 % — ce qui mordait encore de 1,2 point sur le haut des pseudos. A 24 %
           elle couvre 19,1 %-39,4 % : sous l'interface, au-dessus des pseudos, aucun
           texte du jeu dans le cadre.
           La regle reste locale a cette page — globals.css n'est pas touche. */
        .dash-accueil .vg-pagehead-art{object-position:center 24%}
        .dash-carte{background:linear-gradient(180deg,#191920,#121218);border:1px solid var(--border);
          border-radius:15px;padding:12px 10px}
        .dash-prio{background:linear-gradient(180deg,rgba(255,140,26,.06),#121218);
          border:1px solid rgba(255,140,26,.28);border-radius:15px;padding:18px;margin-bottom:4px}
        .dash-prio-t{font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:var(--orange);
          margin-bottom:14px;display:flex;align-items:center;gap:7px}
        .dash-prio-row{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:9px;
          text-decoration:none;color:var(--text);background:var(--bg-3);border:1px solid var(--border);
          transition:background .15s,border-color .15s}
        .dash-prio-row:hover{background:#23232c;border-color:var(--orange)}

        /* L'attente est une bande, pas une phrase. « Chargement... » a la place d'un
           bloc fait sauter la page quand le texte cede sa place au contenu ; une
           bande de la meme hauteur ne bouge pas. */
        .dash-attente{height:86px;border-radius:15px;border:1px solid var(--border);
          background:linear-gradient(90deg,#141419,#1c1c24,#141419);background-size:200% 100%;
          animation:dashOnde 1.4s ease-in-out infinite}
        @keyframes dashOnde{0%{background-position:0% 0}100%{background-position:-200% 0}}
        @media(prefers-reduced-motion:reduce){.dash-attente{animation:none}}

        /* Une panne de relevé se dit A SA PLACE, sur une ligne, et n'emporte pas la
           page : c'est exactement ce qui est arrive le jour ou l'API a cesse de
           renvoyer une clef que la page lisait encore. */
        .dash-panne{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--gold);
          background:color-mix(in srgb, var(--gold) 8%, transparent);
          border:1px solid color-mix(in srgb, var(--gold) 28%, transparent);
          border-radius:10px;padding:9px 12px}

        @media(max-width:640px){
          .dash-prio{padding:14px}
          .dash-carte{padding:8px 4px}
        }
      `}</style>
    </div>
  );
}
