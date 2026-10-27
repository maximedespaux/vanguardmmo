"use client";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { EnteteVolet } from "@/components/VoletSections";
import { Icon, type IconName } from "@/components/Icon";
import { Bulle, Invisible } from "@/components/Bulle";
import { useCardFx } from "@/components/VgFx";
import { prestigeNeed } from "@/data/prestige";
import { FrisePaliers, ARMURE_COMMUNE } from "@/components/guides/FrisePaliers";
import { IconeRessource, Instance, Objet, ObjetLie, Verrou, Vignette, fr } from "@/components/guides/Briques";

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
 * fashion, gemmes de costume, runes, éveil (→ /mecaniques, qui a une section
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
 *
 * ET DÉSORMAIS EN COMBIEN DE JOURS, ce qui est la vraie question. Un joueur ne planifie
 * pas en entrées, il planifie en soirées : « 22 entrées » ne se compare à rien, « 8
 * jours » se compare au temps qu'il lui reste. Le diviseur est la cadence que le jeu
 * impose et qui est déjà affichée en pastille sur la même ligne — trois entrées par
 * jour — donc l'arithmétique est sous les yeux du lecteur, elle n'est pas assénée.
 * C'est un PLANCHER : le VIP donne une entrée journalière de plus (voir les règles).
 */
const EMBLEMES_PAR_ENTREE = 700;
const ENTREES_PAR_JOUR_TOWER = 3;
const ENTREES_TOWER = Math.ceil(TOTAUX["Emblème de protection"] / EMBLEMES_PAR_ENTREE);
const JOURS_TOWER = Math.ceil(ENTREES_TOWER / ENTREES_PAR_JOUR_TOWER);

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
  /**
   * CE QU'IL EN FAUT EN TOUT, POUR ALLER AU P10 — et c'est la troisième pastille.
   *
   * Cinq priorités portaient ce total, et les cinq le disaient autrement : « 75 en tout »,
   * « Il en faut 2 », « 4 jusqu'au P10 », « 74 995 … jusqu'au P10 », « les 15 000 du
   * P10 ». Cinq formulations pour une seule idée, cachées à cinq endroits différents de
   * cinq phrases — donc illisibles côte à côte, alors que c'est justement en les comparant
   * qu'on décide par quoi commencer.
   *
   * La valeur reste CALCULÉE (`TOTAUX`, c'est-à-dire `prestigeNeed`) : aucun de ces cinq
   * nombres n'est écrit, et un coût de prestige qui change les met tous à jour.
   */
  total?: number;
  titre: React.ReactNode;
  quoi: React.ReactNode;
};

/** Une icône de la barre d'outils du site, pour les priorités qui n'ont pas d'objet. */
const ic = (nom: IconName) => <Icon name={nom} size={20} style={{ color: "var(--gn-accent)" }} />;

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
      /* LA BULLE A CHANGÉ D'ANCRE, et ce n'est pas cosmétique : elle était posée sur le
         NOM DE L'OBJET, qui est justement le mot qui doit mener quelque part (fiche,
         provenance, requête à la guilde). Deux bulles ne peuvent pas s'emboîter — l'ancre
         de l'une est un bouton, et un bouton dans un bouton est du HTML que le navigateur
         défait. On déplace donc la bulle sur « à l'entrée », qui est l'autre moitié du
         renseignement, et le nom devient un lien. Rien n'est perdu, ni un mot ni un fait. */
      /* « Le … s'échange » et non « Les … s'échangent » : le catalogue connaît l'objet au
         SINGULIER (« Jeton d'Air »), et c'est ce nom-là qui doit être écrit puisque c'est
         lui qui mène à la fiche. L'article suit le nom, pas l'inverse. */
      quoi: <>Le <ObjetLie nom="Jeton d'Air" avecIcone={false} /> s&apos;échange{" "}
        <Bulle quoi={<>Consommables et tickets de Chambre Secrète, gratuits.</>}>à l&apos;entrée</Bulle>.</>,
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
      total: TOTAUX["Badge Jardin Prestigieux"],
      titre: <Instance nom="Ruine Prestigieuse" />,
      quoi: <>Seule source du badge le plus réclamé.</>,
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
      total: TOTAUX["Badge de la Tour"],
      titre: <ObjetLie nom="Badge de la Tour" avecIcone={false} />,
      /* « EN 1 CONTRE 1 » ET NON « EN SOLO », et la nuance décide du nombre : la
         source de Sugot dit « 15K mobs en 1vs1 ou 40K en AoE ». C'est la MANIÈRE de
         frapper — une cible à la fois contre une attaque de zone — pas le fait de
         jouer seul ou en groupe. Écrit « en solo », le lecteur qui part à deux
         conclut qu'il lui faut 40 000 monstres, ce qui est faux. */
      quoi: <>Quête à <a href="/donjons#oasis" className="gd-lien">Oasis</a> : 15 000 monstres en 1 contre 1, 40 000{" "}
        <Bulle quoi={<>Un Primat magique qui tue les monstres d&apos;un coup est le partenaire idéal.</>}>à l&apos;AoE</Bulle>.</>,
    },
    {
      ic: <IconeRessource nom="Emblème de protection" taille={22} alt="" />,
      palier: 5,
      rythme: "3 / jour",
      total: TOTAUX["Emblème de protection"],
      titre: <b>Tower Defense</b>,
      /* « N JOURS » EST L'AJOUT, et c'est la seule des grandeurs de cette ligne qu'un
         joueur puisse comparer à quelque chose : un nombre d'entrées ne se compare à rien,
         un nombre de jours se compare au temps qu'il lui reste avant son prestige. Tout
         est calculé (voir JOURS_TOWER) ; le total part dans la pastille et la cadence est
         déjà dans la sienne — l'arithmétique est donc sous les yeux, sans un mot de plus. */
      quoi: <><Bulle quoi={<>Rendement relevé par Sugot. La statue à défendre apparaît en croix rouge sur la mini-carte ; l&apos;AoE Primat en combo Halo peut s&apos;arrêter — décale ton personnage pour la relancer.</>}>{EMBLEMES_PAR_ENTREE} emblèmes</Bulle>{" "}
        par entrée : <b>{ENTREES_TOWER}</b> entrées, <b>{JOURS_TOWER}</b> jours.</>,
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
      total: TOTAUX["Badge de donjon mineur"],
      titre: <ObjetLie nom="Badge de donjon mineur" avecIcone={false} />,
      /* Les quatre instances passent sous une bulle, comme celles du badge Donjon
         plus bas : même geste, même forme. Le contenu d'une <Bulle> n'est monté
         qu'à l'ouverture — il ne pèse donc rien dans la page servie, et reste à
         portée de curseur. */
      quoi: <>Un badge ={" "}
        <Bulle quoi={<>Vampirique, <Instance nom="Behemoth" />, <Instance nom="Bastion de l'Archange" /> et <Instance nom="USS Celestia" />.</>}>quatre instances</Bulle>{" "}
        sur trois jours.</>,
    },
    {
      ic: <IconeRessource nom="Nucléus parfait" taille={22} alt="" />,
      palier: 7,
      total: TOTAUX["Nucléus parfait"],
      titre: <b>Zone de farm du Jardin</b>,
      /* Le nom de l'objet passe DEVANT, et le chiffre part dans la pastille : « 74 995
         Nucléus parfait » accolait un pluriel à un nom que le catalogue écrit au
         singulier, et on ne peut pas retoucher ce nom sans casser le lien vers la fiche. */
      quoi: <><ObjetLie nom="Nucléus parfait" avecIcone={false} />, au téléporteur du Jardin.</>,
    },
    {
      ic: <Objet nom="Marteau Runique Yggdrasil" texte="" taille={22} />,
      palier: 7,
      titre: <Instance nom="Jardin de Jade" />,
      /* « Les marteaux » est devenu le NOM EXACT de l'objet, et cliquable : c'est ce que
         le catalogue connaît, et c'est ce qu'un joueur tape. Le lien vers les mécaniques
         s'écrit « sa rune » et non « la rune Yggdrasil » : le mot Yggdrasil est déjà dans
         le nom de l'objet, trois mots plus tôt. */
      quoi: <>Le <ObjetLie nom="Marteau Runique Yggdrasil" avecIcone={false} />, pour{" "}
        <a href="/mecaniques" className="gd-lien">sa rune</a> :{" "}
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
      <a href="/mecaniques" className="gd-lien">Les mécaniques</a></>,
    <>Un seul{" "}
      <Bulle quoi={<>Clic droit sur son icône de buff pour le retirer ; les invendus reviennent par la poste.</>}>marchand hors ligne</Bulle>{" "}
      à la fois.</>,
    <>Le VIP donne toutes stats +25, une entrée journalière de plus et −20 % d&apos;attente.</>,
  ];

  /**
   * Un sujet, une page : d'ici on ne fait que mener.
   *
   * LES SEPT DESCRIPTIONS SONT PARTIES, et c'est vingt-huit mots pour rien. Elles
   * paraphrasaient leur propre titre — « Les donjons : PV, élément, boss », « Les
   * monstres : PV, résistances, boss » —, et les deux premières se ressemblaient au point
   * qu'on ne pouvait plus les distinguer l'une de l'autre. Un lecteur arrivé au bas d'un
   * guide sait ce qu'il trouve derrière le mot « donjons » ; ce qu'il ne sait pas, et ce
   * qui reste écrit, c'est laquelle de ces pages va lui refuser l'entrée.
   *
   * Ce n'est PAS le doublon des portes de l'accueil : là-bas les descriptions vendent le
   * site à un visiteur qui ne le connaît pas, ici ce sont sept destinations au bas d'une
   * page qu'on vient de lire.
   */
  const SUITE: { href: string; icon: IconName; titre: string; verrou?: "membres" | "compte" | "en partie" }[] = [
    { href: "/donjons", icon: "castle", titre: "Les donjons" },
    { href: "/monstres", icon: "paw", titre: "Les monstres" },
    { href: "/prestige", icon: "star", titre: "Le prestige" },
    { href: "/mecaniques", icon: "gem", titre: "Les mécaniques" },
    /* /pnj MANQUAIT, et c'est ce guide qui en avait le plus besoin : il nomme
       Pépito, le marchand de l'entrée, le téléporteur du Jardin. « Qui vend quoi »
       a une page propriétaire, et elle est PUBLIQUE — src/app/(public)/pnj. */
    { href: "/pnj", icon: "users", titre: "Marchands et artisans" },
    /* « en partie » et non « membres » : depuis le mode vitrine la page s'ouvre à
       tout le monde. Les titres, succès, anges, maîtrises, carnets et karma se lisent
       sans compte ; les recettes et leur statut restent aux membres. Promettre le tout
       ferait un lien qui déçoit, marquer « membres » un lien qui refuse à tort. */
    { href: "/crafts", icon: "hammer", titre: "Crafts et collections", verrou: "en partie" },
    { href: "/objets", icon: "package", titre: "Les objets", verrou: "membres" },
  ];

  return (
    <div style={{ padding: "24px 32px 56px", maxWidth: 1300, margin: "0 auto" }}>
      {/* `art` : la place de village du jeu, prise dans ses propres écrans de générique
          (public/jeu/credits/). Les dix-sept images de ce dossier sont les seules du
          client qui n'ont ni logo d'éditeur ni barre de chargement incrustés —
          contrairement aux écrans de /jeu/chargement/, qu'il faut recadrer. */}
      {/* « et ce que ça coûte » est retiré du sous-titre : /prestige est propriétaire du
          coût d'un palier, et la frise juste dessous le montre déjà, chiffré et en
          pastilles remplies. Ce qui reste est ce que cette page est SEULE à porter. */}
      <PageHeader art="/jeu/credits/shotcredit03.webp" banner="/assets/site/banners/banner-guides.webp" title="Guide de progression" subtitle="Dans quel ordre s'y prendre." />
      <SectionTabs section="guides" />

      <div className="gd">
        <EnteteVolet
          icon="graduation"
          titre="La trame de Sugot"
          /* « l'ordre dans lequel s'y prendre » était ici ET dans le sous-titre de
             l'en-tête, à trois centimètres. Ce qui reste est ce que cette ligne est
             seule à dire : d'où parle Sugot. */
          sous="Niveau 200, prestige 3."
          marque={{ texte: "Formateur volontaire", couleur: "var(--gn-accent)" }}
        />

        {/* ── LA FRISE ──
            Le schéma qui remplace l'accordéon de six paliers ET le tableau replié du
            calculateur. Voir src/components/guides/FrisePaliers.tsx : tout y est
            calculé sur dungeons.json et PRESTIGE_COSTS. */}
        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle">
            {/* La vue : un portail allumé dans une colline — ce qu'un palier OUVRE, en
                image. Les quatre vignettes de cette page viennent du générique du client
                (public/jeu/credits/), les seules captures du jeu sans logo d'éditeur ni
                barre de chargement incrustés, et toutes quatre en 1024x768 comme la
                vignette (voir la note de `Vignette`). */}
            <Vignette vue="shotcredit01" />
            <Icon name="path" size={18} />
            <Invisible enJeu="l'écran de personnage affiche ton prestige, jamais ce que le suivant ouvre ni ce qu'il demande">
              Ce que chaque palier ouvre
            </Invisible>
          </h2>
          <FrisePaliers avecInstances />
          <p className="gd-legende">
            <span className="gd-lg"><span className="gd-lgb" /> points de vie demandés</span>
            {/* LE TROISIÈME REPÈRE EST NOUVEAU, et il explique le seul dessin de la frise
                qu'on ne devine pas : chaque pastille de coût est REMPLIE à la part que ce
                saut représente dans le total de sa ressource. C'est ce qui rend visible
                d'un coup d'œil que le dernier saut pèse plus que les trois précédents. */}
            <span className="gd-lg"><span className="gd-lgp" /> part de la montée</span>
            <span className="gd-lg"><Icon name="chevron-right" size={12} /> ce que coûte le palier suivant</span>
            {/* Le guide écrivait cette armure à la main dans une phrase de conseil. Elle
                est la même pour les douze instances à palier, et c'est le relevé qui le
                dit — sinon la frise ne l'affirmerait pas (cf. ARMURE_COMMUNE). */}
            {ARMURE_COMMUNE && <span className="gd-lg"><Icon name="shirt-armor" size={13} /> partout : {ARMURE_COMMUNE}</span>}
          </p>
        </div>

        {/* ── LES PRIORITÉS ── */}
        <div className="gd-card fx-card">
          {/* La vue : un boss sur son trône au fond d'une caverne — ce qu'on va chercher. */}
          <h2 className="gd-cardtitle"><Vignette vue="shotcredit04" /><Icon name="target" size={18} />À faire en priorité</h2>
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
                    {/* Le total, en pastille lui aussi. La flèche est celle de la frise
                        (`.fr-fl::before`), pour que « 75 → P10 » se lise du premier coup
                        comme « il en faut 75 pour aller au P10 » et pas comme un intervalle. */}
                    {p.total ? (
                      <span className="gd-pt2" title={`Il en faut ${fr(p.total)} en tout pour aller du P1 au P10 — calculé sur les coûts de prestige.`}>
                        {fr(p.total)} → P10
                      </span>
                    ) : null}
                  </span>
                  <span className="gd-pq">{p.quoi}</span>
                </span>
              </div>
            ))}
          </div>
          {/* LE CADENAS EST DIT UNE FOIS, ICI, et pas quatorze fois au fil du texte.
              Les objets nommés ouvrent maintenant leur fiche du catalogue, sa provenance
              et la requête à la guilde (voir `ObjetLie`) — mais /objets vit dans le groupe
              (guild), et cette page est publique. La maison veut qu'une porte fermée se
              dise AVANT le clic ; posée sur chaque nom, la pastille aurait mangé la
              colonne, posée en légende elle couvre toute la liste. */}
          <p className="gd-legende">
            <span className="gd-lg">Objet nommé → sa fiche, sa provenance <Verrou quoi="membres" /></span>
          </p>
        </div>

        {/* ── LES RÈGLES ── */}
        <div className="gd-card fx-card">
          {/* La vue : un village la nuit, lampadaires allumés — la soirée dont il est
              question dans le titre. */}
          <h2 className="gd-cardtitle"><Vignette vue="shotcredit08" /><Icon name="clock" size={18} />Les {REGLES.length} règles qui coûtent une soirée</h2>
          <ul className="gd-regles">
            {REGLES.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        {/* ── UN SUJET, UNE PAGE ── */}
        <div className="gd-card fx-card">
          {/* La vue : un vaisseau au mouillage — on part ailleurs. */}
          <h2 className="gd-cardtitle"><Vignette vue="shotcredit09" /><Icon name="compass" size={18} />Pour la suite</h2>
          <div className="gd-suite">
            {SUITE.map((s) => (
              <a key={s.href} href={s.href} className="gd-s">
                <Icon name={s.icon} size={17} />
                <b>{s.titre}</b>
                {s.verrou && <Verrou quoi={s.verrou} />}
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

          .gd-legende — des repères plutôt qu'une phrase, dont deux échantillons
          dessinés : la barre des points de vie et la pastille de coût à demi remplie.
          Elle remplace la phrase qui disait la même chose en vingt mots. Elle sert deux
          fois — sous la frise, et sous les priorités pour y porter le cadenas des fiches
          d'objet, une fois pour toute la liste.

          .gd-lgp — l'échantillon de pastille est rempli à 55 %, pas à 50 : à moitié
          exacte, l'oeil lit une pastille COUPÉE EN DEUX plutôt qu'une pastille
          partiellement remplie, et l'échantillon ne dit plus ce qu'il illustre.

          La vignette du jeu vit dans le titre de section, donc dans un conteneur déjà en
          flex avec align-items:center — elle n'a besoin d'aucune règle à elle, et son
          style tient dans la brique (cf. Vignette).

          .gd-prio — les priorités sont une grille de pastilles, l'icône de l'objet à
          gauche, et non une liste en prose.

          .gd-pp / .gd-pr / .gd-pt2 — TROIS pastilles à distinguer d'un coup d'œil sur la
          même ligne, et elles répondent à trois questions différentes : « à partir de
          quand » (le palier exigé), « à quel rythme » (la cadence), « combien en tout »
          (le total jusqu'au P10).
          Le palier et le total sont tous deux DORÉS, et c'est voulu : le doré est la
          teinte des quantités sur tout le site, et ces deux-là sont des quantités. On les
          sépare par la forme et non par la couleur — le palier est un contour nu et court
          (« P5 »), le total est un fond teinté et porte une flèche (« 75 → P10 »). La
          CADENCE est la seule bleue, parce qu'elle n'est pas une quantité : elle ne se
          gagne pas, elle s'attend. C'est aussi la règle des barres appliquée aux
          pastilles — ce n'est jamais la couleur seule qui porte le sens.

          Le repli @media(pointer:coarse) — les liens d'instance font 21 px de haut,
          on les rate au doigt. On ne grossit pas le texte, on ouvre la zone sensible
          autour. */}
      <style>{`
        .gd { line-height:1.6; color:var(--text); }
        .gd h2 { font-family:var(--gn-titre); margin:0; font-weight:700; }
        .gd p { margin:0; }
        .gd b { color:var(--text); }
        .gd-card { background:var(--bg-2); border:1px solid var(--border); border-radius:14px; padding:22px; margin-bottom:16px; }
        .gd-cardtitle { font-size:18px; text-transform:uppercase; letter-spacing:1px; color:var(--gn-accent);
          margin-bottom:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .gd-lien { display:inline-flex; align-items:center; gap:5px; color:var(--gn-accent); text-decoration:none;
          border-bottom:1px dotted currentColor; font-weight:600; }
        .gd-lien:hover { color:var(--text); }

        .gd-legende { display:flex; flex-wrap:wrap; gap:14px; margin-top:12px; font-size:11.5px; color:var(--text-muted); }
        .gd-lg { display:inline-flex; align-items:center; gap:6px; }
        .gd-lgb { display:inline-block; width:26px; height:5px; border-radius:3px; background:var(--gn-jauge); }
        .gd-lgp { display:inline-block; width:26px; height:13px; border-radius:20px; border:1px solid var(--border);
          background:linear-gradient(90deg,
            rgba(var(--gn-lueur-rgb),.26) 0,
            rgba(var(--gn-lueur-rgb),.26) 55%,
            var(--bg-2) 55%, var(--bg-2) 100%); }

        .gd-prio { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr)); gap:9px; }
        .gd-p { display:flex; gap:11px; align-items:flex-start; background:var(--bg-3);
          border:1px solid var(--border); border-radius:11px; padding:11px 13px; }
        .gd-pic { width:24px; display:flex; align-items:center; justify-content:center; flex-shrink:0; padding-top:1px; }
        .gd-pt { display:flex; flex-direction:column; gap:2px; min-width:0; }
        .gd-ph { display:flex; align-items:center; gap:7px; flex-wrap:wrap; font-size:13.5px; font-weight:600; }
        .gd-pp { font-size:10px; font-weight:700; letter-spacing:.6px; color:var(--gold);
          border:1px solid var(--gold); border-radius:20px; padding:0 6px; }
        .gd-pt2 { font-size:10px; font-weight:700; letter-spacing:.6px; color:var(--gold);
          background:color-mix(in srgb, var(--gold) 13%, transparent);
          border:1px solid color-mix(in srgb, var(--gold) 40%, transparent); border-radius:20px; padding:0 6px;
          font-variant-numeric:tabular-nums; white-space:nowrap; }
        .gd-pr { font-size:10px; font-weight:700; letter-spacing:.6px; color:var(--blue);
          border:1px solid color-mix(in srgb, var(--blue) 60%, transparent); border-radius:20px; padding:0 6px;
          font-variant-numeric:tabular-nums; white-space:nowrap; }
        .gd-pq { font-size:12.5px; color:var(--text-muted); line-height:1.55; }
        .gd-pq b { color:var(--gold); font-family:'Rubik',sans-serif; }

        .gd-regles { margin:0; padding-left:19px; display:grid; gap:9px; font-size:13.5px; }
        .gd-regles li { line-height:1.6; }
        .gd-regles code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12.5px;
          background:var(--bg-4); border:1px solid var(--border); border-radius:5px; padding:1px 5px; color:var(--gn-accent); }

        .gd-suite { display:flex; flex-wrap:wrap; gap:9px; }
        .gd-s { display:inline-flex; gap:9px; align-items:center; text-decoration:none; color:var(--text);
          background:var(--bg-3); border:1px solid var(--border); border-radius:11px; padding:10px 14px;
          transition:border-color .15s, transform .15s; }
        .gd-s:hover { border-color:var(--gn-accent); transform:translateY(-2px); }
        .gd-s > svg { color:var(--gn-accent); flex-shrink:0; }
        .gd-s b { font-size:13px; }

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
