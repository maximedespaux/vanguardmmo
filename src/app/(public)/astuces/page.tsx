"use client";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { EnteteVolet } from "@/components/VoletSections";
import { Icon, type IconName } from "@/components/Icon";
import { Bulle, Invisible } from "@/components/Bulle";
import { useCardFx } from "@/components/VgFx";
import { prestigeNeed } from "@/data/prestige";
import { FrisePaliers, ARMURE_COMMUNE } from "@/components/guides/FrisePaliers";
import { IconeRessource, Instance, Objet, Verrou, fr } from "@/components/guides/Briques";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  PAR OÙ COMMENCER — et rien d'autre.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * CE QUE CETTE PAGE POSSÈDE : l'ORDRE. Dans quel ordre s'y prendre, ce que le palier
 * suivant ouvre, et les règles de la vie du serveur qu'on n'apprend qu'en les payant.
 *
 * CE QU'ELLE NE POSSÈDE PLUS. Elle portait quatorze cartes et quatre panneaux, dont
 * trois entiers sur des sujets qui ont leur page : perçage, élément d'une pièce,
 * fashion, gemmes de costume, runes, éveil (→ /builder/mecaniques, qui a une section
 * pour chacun), provenance des runes, parchemins, étuis et coffrets de cartes
 * (→ /objets, qui les lit dans ou-trouver.json), recettes (→ /crafts), phrases de boss
 * (→ /monstres), totaux de ressources (→ /prestige, qui les calcule). Chacun de ces
 * développements se réduit ici à une phrase et un lien. Les deux blocs qui n'existaient
 * nulle part ailleurs — les phrases de boss et trois recettes de badge — sont gardés
 * dans src/components/guides/aDeplacer.ts en attendant leur page.
 *
 * CE QUI A DISPARU POUR DE BON, sur demande : les taux du serveur (expérience, penyas,
 * chute d'objets), les prix en penyas d'un défaut d'enchantement ou d'un retrait de
 * perçage, et l'avertissement sur le butin ordinaire absent du client — il n'existait
 * que pour expliquer l'absence d'un chiffre dont on se fiche.
 *
 * ET LA FORME. Plus de rail à quatre panneaux : ce qui reste tient dans une page qui se
 * lit de haut en bas, et tout y est visible d'un coup. La prose est devenue une frise,
 * des barres, une grille de pastilles ; les précisions secondaires sont passées sous
 * des bulles, où elles ne prennent plus la place des chiffres.
 */

/** Le total demandé du P1 au P10, calculé. Aucun de ces nombres ne s'écrit à la main. */
const TOTAUX = prestigeNeed(1, 10);

/* Le helper `pv()` a été retiré : il ne servait qu'à glisser les points de vie du
   Sietch Kalgas dans une bulle, et les points de vie d'une instance appartiennent à
   /donjons — la frise de cette page les montre déjà en barres, palier par palier.
   Un sujet, une page : ici on garde l'ORDRE, pas la fiche. */

/**
 * Le rendement de Tower Defense, seul nombre de cette page qui ne vient pas d'un
 * fichier : c'est le relevé de Sugot, et il est attribué comme tel dans la bulle.
 * Ce qu'on en TIRE, en revanche, se calcule — et c'est ça qui manquait : personne ne
 * fait la division de tête, donc personne ne sait que le stock d'emblèmes du P10 tient
 * en une vingtaine d'entrées.
 */
const EMBLEMES_PAR_ENTREE = 700;
const ENTREES_TOWER = Math.ceil(TOTAUX["Emblème de protection"] / EMBLEMES_PAR_ENTREE);

/**
 * UNE PRIORITÉ. `rythme` est l'ajout de cette passe, et il vaut plus qu'une
 * économie de mots : « 4 entrées par jour », « Deux heures d'attente », « chaque
 * jour à 18 h 30 » étaient noyés en tête de phrase, alors que c'est exactement ce
 * qu'on cherche quand on organise sa soirée. Le rythme sort du texte et devient une
 * pastille, à côté du palier : la colonne se balaie au lieu de se lire.
 */
type Priorite = {
  ic: React.ReactNode;
  palier?: number;
  /** Cadence ou attente, telle que le jeu l'impose. Pas de rythme, pas de pastille. */
  rythme?: string;
  titre: React.ReactNode;
  quoi: React.ReactNode;
};

/** Une icône de la barre d'outils du site, pour les priorités qui n'ont pas d'objet. */
const ic = (nom: IconName) => <Icon name={nom} size={20} style={{ color: "var(--orange)" }} />;

export default function GuidePage() {
  // Halo suivant le curseur + leger relief sur les .fx-card (cf. VgFx).
  useCardFx();

  /**
   * LES PRIORITÉS DE SUGOT — ce qu'il faut FAIRE, une ligne chacune.
   *
   * C'était un accordéon de six paliers, en prose, où chaque conseil se noyait dans un
   * paragraphe. Ici chaque priorité porte l'icône de l'objet qu'elle sert, son palier
   * quand il en faut un, et une seule phrase. Le détail qui n'est pas indispensable
   * passe sous une bulle : il reste à portée de curseur sans occuper l'écran.
   */
  const PRIORITES: Priorite[] = [
    {
      ic: <Objet nom="Jeton d'Air" texte="" taille={22} />,
      titre: <Instance nom="Faille du débutant" />,
      quoi: <>Les{" "}
        <Bulle quoi={<>Consommables et tickets de Chambre Secrète, gratuits.</>}>Jetons d&apos;Air</Bulle>{" "}
        s&apos;échangent à l&apos;entrée.</>,
    },
    {
      ic: ic("ghost"),
      rythme: "4 / jour",
      titre: <b>Instance Vampirique</b>,
      quoi: <>Chez Pépito (forge de Flaris) : les armes deviennent des morceaux vampiriques.</>,
    },
    {
      ic: <Objet nom="Perles niv 3" texte="" taille={22} />,
      titre: <><Instance nom="Forêt d'Euphrasia" /> · <Instance nom="Grotte d'Herneos" /></>,
      quoi: <>Le stock de perles niveau 3.</>,
    },
    {
      ic: ic("snow"),
      rythme: "1 entrée",
      titre: <Instance nom="Ruines givrées" />,
      quoi: <>Mobs et boss donnent les{" "}
        {/* La bulle mène maintenant à la page propriétaire des recettes au lieu de
            l'écrire en gras : « une phrase et un LIEN ». */}
        <Bulle quoi={<>Durabilité 7 jours, cumulable jusqu&apos;à 30. Recettes sur <a href="/crafts" className="gd-lien">Crafts et collections</a>.</>}>pièces de meuble</Bulle>.</>,
    },
    {
      ic: <Objet nom="Badge Jardin Prestigieux" texte="" taille={22} />,
      palier: 3,
      rythme: "1 / jour",
      titre: <Instance nom="Ruine Prestigieuse" />,
      quoi: <>Seule source du badge le plus réclamé : <b>{fr(TOTAUX["Badge Jardin Prestigieux"])}</b> en tout.</>,
    },
    {
      ic: ic("rocket"),
      rythme: "2 h d'attente",
      titre: <Instance nom="USS Celestia" />,
      quoi: <>Le{" "}
        <Bulle quoi={<>La mutation coûte 1 mutagène et 7 clés.</>}>ramasseur PVE</Bulle>{" "}
        de ta classe s&apos;y mute.</>,
    },
    {
      ic: <Objet nom="Badge de la Tour" texte="" taille={22} />,
      titre: <>Badge de la Tour</>,
      /* « EN 1 CONTRE 1 » ET NON « EN SOLO », et la nuance décide du nombre : la
         source de Sugot dit « 15K mobs en 1vs1 ou 40K en AoE ». C'est la MANIÈRE de
         frapper — une cible à la fois contre une attaque de zone — pas le fait de
         jouer seul ou en groupe. Écrit « en solo », le lecteur qui part à deux
         conclut qu'il lui faut 40 000 monstres, ce qui est faux. */
      quoi: <>Quête à <a href="/donjons#oasis" className="gd-lien">Oasis</a> : 15 000 monstres en 1 contre 1, 40 000{" "}
        <Bulle quoi={<>Un Primat magique qui tue les monstres d&apos;un coup est le partenaire idéal.</>}>à l&apos;AoE</Bulle>. Il en faut <b>{fr(TOTAUX["Badge de la Tour"])}</b>.</>,
    },
    {
      ic: <IconeRessource nom="Emblème de protection" taille={22} alt="" />,
      palier: 5,
      rythme: "3 / jour",
      titre: <b>Tower Defense</b>,
      quoi: <><Bulle quoi={<>Rendement relevé par Sugot. La statue à défendre apparaît en croix rouge sur la mini-carte ; l&apos;AoE Primat en combo Halo peut s&apos;arrêter — décale ton personnage pour la relancer.</>}>{EMBLEMES_PAR_ENTREE} emblèmes</Bulle>{" "}
        par entrée : <b>{ENTREES_TOWER}</b> entrées couvrent les <b>{fr(TOTAUX["Emblème de protection"])}</b> du P10.</>,
    },
    {
      ic: ic("dragon"),
      palier: 5,
      titre: <Instance nom="Sietch Kalgas" />,
      /* Les points de vie que la fiche demande ont quitté cette bulle : ils sont à
         /donjons, et la frise du haut de page les dessine déjà en barres. Ce qui
         reste est ce qu'aucun écran du jeu ne dit — que l'aggro ne suit pas.
         (Accolades interdites ici : on est dans un objet, pas dans du JSX.) */
      quoi:<><Invisible enJeu="rien n'annonce que l'aggro de ce boss est fixe, on le fait donc très loin sous les points de vie exigés">Aggro fixe</Invisible> : deux P5, l&apos;un tourne autour, l&apos;autre frappe sans être touché.</>,
    },
    {
      ic: <Objet nom="Badge de donjon mineur" texte="" taille={22} />,
      palier: 5,
      titre: <>Badge de donjon mineur</>,
      /* Les quatre instances passent sous une bulle, comme celles du badge Donjon
         plus bas : même geste, même forme. Le contenu d'une <Bulle> n'est monté
         qu'à l'ouverture — il ne pèse donc rien dans la page servie, et reste à
         portée de curseur. */
      quoi: <><b>{fr(TOTAUX["Badge de donjon mineur"])}</b> jusqu&apos;au P10. Un badge ={" "}
        <Bulle quoi={<>Vampirique, <Instance nom="Behemoth" />, <Instance nom="Bastion de l'Archange" /> et <Instance nom="USS Celestia" />.</>}>quatre instances</Bulle>{" "}
        sur trois jours.</>,
    },
    {
      ic: <IconeRessource nom="Nucléus parfait" taille={22} alt="" />,
      palier: 7,
      titre: <b>Zone de farm du Jardin</b>,
      quoi: <>Au téléporteur du Jardin : <b>{fr(TOTAUX["Nucléus parfait"])}</b> nucléus parfaits jusqu&apos;au P10.</>,
    },
    {
      ic: <Objet nom="Marteau Runique Yggdrasil" texte="" taille={22} />,
      palier: 7,
      titre: <Instance nom="Jardin de Jade" />,
      quoi: <>Les marteaux de la <a href="/builder/mecaniques" className="gd-lien">rune Yggdrasil</a> <Verrou quoi="compte" /> :{" "}
        <Bulle quoi={<>L&apos;astuce de Sugot : restat full END aux parchemins d&apos;Isruel, stuff DPS, dugkug en continu au Ftool, AoE sur les monstres seulement — jamais le boss.</>}>le farm le plus long</Bulle>, à commencer tôt.</>,
    },
    {
      ic: ic("flower"),
      /* « / jour » et pas seulement l'heure : la phrase disait « chaque jour à
         18 h 30 », et une pastille qui ne porte qu'une heure laisse croire à un
         rendez-vous unique. Même forme que « 4 / jour » et « 1 / jour » juste
         au-dessus, donc la cadence se lit sans se relire. */
      rythme: "18 h 30 / jour",
      titre: <b>Jardin Prestigieux</b>,
      quoi: <>Buff du CW : deux heures, dont le temps s&apos;arrête hors connexion.</>,
    },
    {
      ic: ic("torii"),
      palier: 8,
      rythme: "3 h d'attente",
      titre: <Instance nom="Temple aérien" />,
      quoi: <>La dernière étape de la quête du{" "}
        <Bulle quoi={<><Instance nom="Sentier de Rhisis" />, <Instance nom="Dédale de Rhisis" />, <Instance nom="Sietch Kalgas" /> et <Instance nom="Temple aérien" />, sur trois jours.</>}>badge Donjon</Bulle>.</>,
    },
  ];

  /**
   * LES RÈGLES QUI COÛTENT UNE SOIRÉE.
   *
   * Elles étaient huit ; il en reste six. Ce qui est parti : les prix en penyas d'un
   * défaut d'enchantement et d'un retrait de perçage, et le bonus de penyas du VIP.
   * Ce qui reste des deux règles de mécanique tient en une ligne et un lien — la page
   * des mécaniques en est propriétaire — mais elle reste, parce qu'une mise en garde
   * qui protège d'un objet détruit est utile même réduite à sa moitié.
   */
  const REGLES: React.ReactNode[] = [
    <><Invisible enJeu="aucune fenêtre du jeu ne donne cette heure">Les entrées d&apos;instance</Invisible> se remettent à zéro à <b>8 h</b>, pas à minuit : une entrée gardée pour demain se perd.</>,
    <>Le calendrier de connexion ne compte qu&apos;après <b>60 minutes</b> en ligne.</>,
    <>Prêtre : <code>/mode fs</code> ou <code>/mode dps</code>, à choisir{" "}
      <Bulle quoi={<>Un délai court sépare deux bascules : dedans, il est trop tard.</>}><i>avant</i> d&apos;entrer</Bulle>.</>,
    <>Deux gestes détruisent sans retour :{" "}
      <Bulle quoi={<>Et au perçage, c&apos;est la <b>dernière</b> carte posée qui part — on sertit donc en dernier ce dont on est sûr.</>}>enchanter sans parchemin de protection, et retirer un perçage</Bulle>.{" "}
      <a href="/builder/mecaniques" className="gd-lien">Les mécaniques</a> <Verrou quoi="compte" /></>,
    <>Un seul{" "}
      <Bulle quoi={<>Clic droit sur son icône de buff pour le retirer ; les invendus reviennent par la poste.</>}>marchand hors ligne</Bulle>{" "}
      à la fois.</>,
    <>Le VIP donne toutes stats +25, une entrée journalière de plus et −20 % d&apos;attente.</>,
  ];

  /** Un sujet, une page : d'ici on ne fait que mener. */
  const SUITE: { href: string; icon: IconName; titre: string; quoi: string; verrou?: "membres" | "compte" | "en partie" }[] = [
    { href: "/donjons", icon: "castle", titre: "Les donjons", quoi: "PV, élément, boss." },
    { href: "/monstres", icon: "paw", titre: "Les monstres", quoi: "PV, résistances, boss." },
    { href: "/prestige", icon: "star", titre: "Le prestige", quoi: "Le coût de chaque palier." },
    { href: "/builder/mecaniques", icon: "gem", titre: "Les mécaniques", quoi: "Perçage, gemmes, éveil, runes.", verrou: "compte" },
    /* /pnj MANQUAIT, et c'est ce guide qui en avait le plus besoin : il nomme
       Pépito, le marchand de l'entrée, le téléporteur du Jardin. « Qui vend quoi »
       a une page propriétaire, et elle est PUBLIQUE — src/app/(public)/pnj. */
    { href: "/pnj", icon: "users", titre: "Marchands et artisans", quoi: "Qui vend quoi." },
    /* « en partie » et non « membres » : depuis le mode vitrine la page s'ouvre à
       tout le monde. Les titres, succès, anges, maîtrises, carnets et karma se lisent
       sans compte ; les recettes et leur statut restent aux membres. Promettre le tout
       ferait un lien qui déçoit, marquer « membres » un lien qui refuse à tort. */
    { href: "/crafts", icon: "hammer", titre: "Crafts et collections", quoi: "Recettes, titres, succès, anges.", verrou: "en partie" },
    { href: "/objets", icon: "package", titre: "Les objets", quoi: "Où trouver une pièce.", verrou: "membres" },
  ];

  return (
    <div style={{ padding: "24px 32px 56px", maxWidth: 1300, margin: "0 auto" }}>
      {/* `art` : la place de village du jeu, prise dans ses propres écrans de générique
          (public/jeu/credits/). Les dix-sept images de ce dossier sont les seules du
          client qui n'ont ni logo d'éditeur ni barre de chargement incrustés —
          contrairement aux écrans de /jeu/chargement/, qu'il faut recadrer. */}
      <PageHeader art="/jeu/credits/shotcredit03.webp" banner="/assets/site/banners/banner-guides.webp" title="Guide de progression" subtitle="Dans quel ordre s'y prendre, et ce que ça coûte." />
      <SectionTabs section="guides" />

      <div className="gd">
        <EnteteVolet
          icon="graduation"
          titre="La trame de Sugot"
          /* « l'ordre dans lequel s'y prendre » était ici ET dans le sous-titre de
             l'en-tête, à trois centimètres. Ce qui reste est ce que cette ligne est
             seule à dire : d'où parle Sugot. */
          sous="Niveau 200, prestige 3."
          marque={{ texte: "Formateur volontaire", couleur: "var(--orange)" }}
        />

        {/* ── LA FRISE ──
            Le schéma qui remplace l'accordéon de six paliers ET le tableau replié du
            calculateur. Voir src/components/guides/FrisePaliers.tsx : tout y est
            calculé sur dungeons.json et PRESTIGE_COSTS. */}
        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle">
            <Icon name="path" size={18} />
            <Invisible enJeu="l'écran de personnage affiche ton prestige, jamais ce que le suivant ouvre ni ce qu'il demande">
              Ce que chaque palier ouvre
            </Invisible>
          </h2>
          <FrisePaliers avecInstances />
          <p className="gd-legende">
            <span className="gd-lg"><span className="gd-lgb" /> points de vie demandés</span>
            <span className="gd-lg"><Icon name="chevron-right" size={12} /> ce que coûte le palier suivant</span>
            {/* Le guide écrivait cette armure à la main dans une phrase de conseil. Elle
                est la même pour les douze instances à palier, et c'est le relevé qui le
                dit — sinon la frise ne l'affirmerait pas (cf. ARMURE_COMMUNE). */}
            {ARMURE_COMMUNE && <span className="gd-lg"><Icon name="shirt-armor" size={13} /> partout : {ARMURE_COMMUNE}</span>}
          </p>
        </div>

        {/* ── LES PRIORITÉS ── */}
        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle"><Icon name="target" size={18} />À faire en priorité</h2>
          <div className="gd-prio">
            {PRIORITES.map((p, i) => (
              <div key={i} className="gd-p">
                <span className="gd-pic">{p.ic}</span>
                <span className="gd-pt">
                  <span className="gd-ph">
                    {p.titre}
                    {p.palier ? <span className="gd-pp">P{p.palier}</span> : null}
                    {/* La cadence en pastille : « 4 / jour », « 2 h d'attente ». Elle
                        était en tête de phrase, là où on ne la cherche pas. */}
                    {p.rythme ? <span className="gd-pr">{p.rythme}</span> : null}
                  </span>
                  <span className="gd-pq">{p.quoi}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── LES RÈGLES ── */}
        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle"><Icon name="clock" size={18} />Les {REGLES.length} règles qui coûtent une soirée</h2>
          <ul className="gd-regles">
            {REGLES.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        {/* ── UN SUJET, UNE PAGE ── */}
        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle"><Icon name="compass" size={18} />Pour la suite</h2>
          <div className="gd-suite">
            {SUITE.map((s) => (
              <a key={s.href} href={s.href} className="gd-s">
                <Icon name={s.icon} size={17} />
                <span>
                  <b>{s.titre} {s.verrou && <Verrou quoi={s.verrou} />}</b>
                  <i>{s.quoi}</i>
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="gd-foot">Votre dévoué Sugot.</div>
      </div>

      {/* ── POURQUOI CETTE CSS EST ÉCRITE COMME ÇA ──
          Ces notes vivaient DANS le littéral ci-dessous, donc dans le `<style>` que
          le navigateur télécharge. Sorties d'ici, elles sont effacées à la
          compilation — et le piège de l'accent grave qui referme le gabarit
          disparaît, ce qui explique pourquoi elles étaient écrites sans accents.

          .gd-lien — un donjon cité mène à sa fiche.

          .gd-legende — trois repères, dont un échantillon de barre : elle remplace
          la phrase qui disait la même chose en vingt mots.

          .gd-prio — les priorités sont une grille de pastilles, l'icône de l'objet à
          gauche, et non une liste en prose.

          .gd-pp / .gd-pr — deux pastilles à distinguer d'un coup d'œil sur la même
          ligne : le PALIER exigé est doré comme les chiffres de coût du site, la
          CADENCE est bleue parce qu'elle ne se gagne pas, elle s'attend.

          Le repli @media(pointer:coarse) — les liens d'instance font 21 px de haut,
          on les rate au doigt. On ne grossit pas le texte, on ouvre la zone sensible
          autour. */}
      <style>{`
        .gd { line-height:1.6; color:var(--text); }
        .gd h2 { font-family:'Rubik',sans-serif; margin:0; font-weight:700; }
        .gd p { margin:0; }
        .gd b { color:var(--text); }
        .gd-card { background:var(--bg-2); border:1px solid var(--border); border-radius:14px; padding:22px; margin-bottom:16px; }
        .gd-cardtitle { font-size:18px; text-transform:uppercase; letter-spacing:1px; color:var(--orange);
          margin-bottom:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .gd-lien { display:inline-flex; align-items:center; gap:5px; color:var(--orange); text-decoration:none;
          border-bottom:1px dotted currentColor; font-weight:600; }
        .gd-lien:hover { color:var(--text); }

        .gd-legende { display:flex; flex-wrap:wrap; gap:14px; margin-top:12px; font-size:11.5px; color:var(--text-muted); }
        .gd-lg { display:inline-flex; align-items:center; gap:6px; }
        .gd-lgb { display:inline-block; width:26px; height:5px; border-radius:3px; background:var(--orange); }

        .gd-prio { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr)); gap:9px; }
        .gd-p { display:flex; gap:11px; align-items:flex-start; background:var(--bg-3);
          border:1px solid var(--border); border-radius:11px; padding:11px 13px; }
        .gd-pic { width:24px; display:flex; align-items:center; justify-content:center; flex-shrink:0; padding-top:1px; }
        .gd-pt { display:flex; flex-direction:column; gap:2px; min-width:0; }
        .gd-ph { display:flex; align-items:center; gap:7px; flex-wrap:wrap; font-size:13.5px; font-weight:600; }
        .gd-pp { font-size:10px; font-weight:700; letter-spacing:.6px; color:var(--gold);
          border:1px solid var(--gold); border-radius:20px; padding:0 6px; }
        .gd-pr { font-size:10px; font-weight:700; letter-spacing:.6px; color:var(--blue);
          border:1px solid color-mix(in srgb, var(--blue) 60%, transparent); border-radius:20px; padding:0 6px;
          font-variant-numeric:tabular-nums; white-space:nowrap; }
        .gd-pq { font-size:12.5px; color:var(--text-muted); line-height:1.55; }
        .gd-pq b { color:var(--gold); font-family:'Rubik',sans-serif; }

        .gd-regles { margin:0; padding-left:19px; display:grid; gap:9px; font-size:13.5px; }
        .gd-regles li { line-height:1.6; }
        .gd-regles code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12.5px;
          background:var(--bg-4); border:1px solid var(--border); border-radius:5px; padding:1px 5px; color:var(--orange); }

        .gd-suite { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr)); gap:9px; }
        .gd-s { display:flex; gap:10px; align-items:flex-start; text-decoration:none; color:var(--text);
          background:var(--bg-3); border:1px solid var(--border); border-radius:11px; padding:11px 13px;
          transition:border-color .15s, transform .15s; }
        .gd-s:hover { border-color:var(--orange); transform:translateY(-2px); }
        .gd-s > svg { color:var(--orange); flex-shrink:0; margin-top:2px; }
        .gd-s span { display:flex; flex-direction:column; gap:2px; min-width:0; }
        .gd-s b { font-size:13px; }
        .gd-s i { font-style:normal; font-size:11.5px; color:var(--text-muted); }

        .gd-foot { text-align:center; color:var(--text-muted); font-size:13px; padding:14px; font-style:italic; }

        @media (pointer:coarse){
          .gd-pq .gd-lien { position:relative; }
          .gd-pq .gd-lien::before { content:""; position:absolute; left:0; right:0; top:50%;
            transform:translateY(-50%); height:40px; }
        }
      `}</style>
    </div>
  );
}
