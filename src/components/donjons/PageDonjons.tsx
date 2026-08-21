"use client";
import { useEffect, useMemo, useState } from "react";
import dungeonsData from "@/data/dungeons.json";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { NomObjet } from "@/components/objets/NomObjet";
import ICONES_OBJETS from "@/data/icones-objets.json";
import { donjonClient, pvCourt, PLANS, TOUR_OUBLIEE } from "@/components/donjons/donneesClient";
import { EcartPrestige, KalgasEnPlus, Peuplement, PlanDonjon, Situation, SousTitre } from "@/components/donjons/FicheClient";
import { TourOubliee } from "@/components/donjons/TourOubliee";
import { BlocOasis } from "@/components/donjons/BlocOasis";
import { CommentOnEntre, type Porte } from "@/components/donjons/CommentOnEntre";
import { IdsMonstres } from "@/components/donjons/LienMonstre";
import { HorsTeleporteur, GROUPES_HORS_TELEPORTEUR, MOTS_HORS_TELEPORTEUR } from "@/components/donjons/HorsTeleporteur";
import { aDesFaiblesses, ConseilInstance, dominantInstance, FaiblessesDonjon } from "@/components/donjons/elements";
import { useReglages } from "@/components/reglages/PanneauReglages";
import type { SchemaPage } from "@/lib/reglages";
import type { Vague } from "@/components/oasis/modele";

/**
 * TOUT CE DANS QUOI ON ENTRE, SUR UNE SEULE PAGE.
 *
 * Trois blocs, et l'ordre dit comment on y accède : la grille des donjons du
 * TÉLÉPORTEUR d'abord, puis la Tour Oubliée — cinq cartes séparées, entrée par
 * PNJ —, puis la Protection de l'Oasis, qui n'est pas un donjon du tout mais un
 * événement sur son arène. Chacun explique pourquoi il n'est pas dans le bloc
 * d'avant ; sans ça, on croit qu'on y entre pareil.
 *
 * Ce corps de page était le fichier page.tsx lui-même. Il a déménagé ici pour une
 * raison mécanique : les 52 vagues de l'Oasis sont lues dans un fichier, donc par
 * le SERVEUR, et un composant « use client » ne peut pas ouvrir un fichier. La
 * page est devenue un composant serveur de trois lignes qui lit et passe le
 * relevé ; tout ce qui a besoin d'état — la recherche, les filtres, la fiche
 * ouverte — vit ici.
 *
 * `drops` est le résumé qui tient sur une carte ; `dropsComplets`, quand il
 * existe, est la liste telle que la fenêtre d'information du jeu l'affiche.
 * Les deux coexistent parce qu'ils ne servent pas au même moment : on parcourt
 * la grille pour repérer une instance, on ouvre la fiche pour savoir ce qui
 * tombe vraiment. Les donjons à set complet (Draken, Catacombes, Sentier,
 * Dédale) n'ont volontairement pas de liste complète : énumérer 32 pièces d'une
 * même armure en dit moins que « le set complet ».
 */
type Dungeon = { id: number; name: string; type: string; lvl: string; prestige: number | null; prestigeDetail?: string; hp: number; armor: string | null; elem: string; cat: string; icon: string; drops: string[]; dropsComplets?: string[]; video?: string };

/** L'identifiant YouTube de la vidéo du donjon, quand il y en a une. */
const PLAYLIST = "PL64S1j7adQcwMHVfTyRfMkBOu8hS7c08V";

/**
 * Le garde-fou est resté, la seule fiche qu'il couvrait a été comblée.
 *
 * Sietch Kalgas était le trou du wiki : son champ PV valait 0, et on avait
 * supposé un donjon « sans minimum requis ». C'était faux — les captures d'écran
 * n'en avaient simplement aucune, celle censée le montrer étant en réalité une
 * capture d'USS Celestia. Le tooltip du téléporteur, lui, annonce 1 700 000 PV :
 * la valeur est désormais dans `dungeons.json`. On garde ce repli au cas où une
 * fiche future arriverait sans chiffre : afficher « 0 » ne veut rien dire.
 */
const hpLabel = (hp: number) => (hp > 0 ? hp.toLocaleString("fr-FR") : "Pas encore relevés");

/**
 * Ce qu'une recherche doit trouver EN DEHORS de la grille.
 *
 * La grille filtre sur le nom du donjon ; les deux blocs du bas n'ont pas de
 * ligne dans `dungeons.json`, donc ils ont besoin de leurs propres mots. Taper
 * « oasis » ou « infernale » ne peut désigner que le mode : dans ce cas on ouvre
 * son détail au lieu de le laisser replié.
 */
const MOTS_TOUR = "tour oubliée";
const MOTS_OASIS = "protection de l'oasis tour infernale vagues emblèmes";

/**
 * L'icône du jeu, quand on la connaît.
 *
 * Rien, dans les fichiers du jeu, ne relie un nom français à un code d'icône :
 * les 12 871 PNG extraits sont nommés par code interne, et deux tentatives de
 * reconnaissance d'image ont donné des écarts de 1,0 entre le premier et le
 * deuxième candidat — autant tirer au sort. La table qui manquait était déjà
 * dans le dépôt : la base d'objets de l'AirBuilder porte le nom français ET
 * l'icône de chaque pièce. `icones-objets.json` en est le croisement, complété
 * par les assets déjà rangés sous /assets/items.
 *
 * Un objet absent de la table n'affiche pas d'icône, et c'est tout : ajouter
 * une ligne au fichier suffit à en poser une.
 */
const iconeButin = (nom: string): string | null => (ICONES_OBJETS as Record<string, string>)[nom] ?? null;

/**
 * LA RÉCOMPENSE EN MONNAIE NE S'AFFICHE PAS, ET C'EST UNE RÈGLE DE LA MAISON.
 *
 * Les taux de chute, l'expérience et les PENYAS DE RÉCOMPENSE ne sont ni une
 * colonne, ni une pastille, ni une mention. Un COÛT en penyas reste — c'est un
 * prix d'opération — mais une penya qu'on RAMASSE est une récompense, et elle
 * n'aide personne à choisir un donjon : elle tombe partout.
 *
 * `dungeons.json` en portait une, et elle passait à l'écran depuis longtemps :
 * la Faille du débutant annonce « Penya » en tête de ses butins, sur la tuile
 * comme dans la fiche. Depuis que la liste est faite de `NomObjet`, elle était
 * même devenue un lien vers une fiche de catalogue qui n'existe pas.
 *
 * On filtre à L'AFFICHAGE et pas dans le fichier : la donnée reste où elle est,
 * c'est sa présence sur l'écran que la règle interdit. Le test porte sur le nom
 * réduit (sans accent, sans pluriel), parce que le relevé écrit aussi bien
 * « Penya » que « Penyas ».
 */
const RECOMPENSES_TAIRE = /^(penyas?|exp|experience|xp)$/;
const butinsMontrables = (liste: string[]): string[] =>
  liste.filter((n) => !RECOMPENSES_TAIRE.test(n.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase()));

/**
 * CE QUE LE RANG VANGUARD PEUT RÉGLER SUR CETTE PAGE.
 *
 * Demande de Maxime : « avoir la possibilité sur chaque page de faire un paramétrage
 * en tant que vanguard uniquement ». Le schéma vit ICI, dans la page qu'il règle — la
 * base ne garde que les valeurs choisies, donc ajouter un réglage ne demande aucune
 * migration, et en retirer un le fait simplement disparaître.
 *
 * TOUS LES DÉFAUTS SONT L'ÉTAT ACTUEL DE LA PAGE. C'est la règle à ne pas casser : un
 * réglage neuf ne doit rien changer tant que personne ne l'a touché, sinon poser un
 * interrupteur modifierait le site pour toute la guilde sans que personne l'ait
 * demandé.
 */
/* COMBIEN DE TUILES TOMBENT SUR LA LUEUR — compté, plus écrit. L'aide du réglage
   annonçait « les six donjons qui n'ont pas de carte montrable » ; la table des
   plans en couvre dix-huit sur vingt-trois, donc cinq. Un nombre tapé au clavier
   à côté d'une table qui bouge : le défaut que ce fichier a déjà payé deux fois
   (les vues aériennes retirées après avoir été regardées, le champ « élément
   boss »). Il se recompte ici sur les deux sources qu'il décrit. */
const SANS_PLAN = (dungeonsData as { id: number }[])
  .filter((d) => { const c = donjonClient(d.id); return !c || !PLANS[c.dossier]; }).length;

const REGLAGES_DONJONS = {
  page: "/donjons",
  titre: "Réglages du wiki des donjons",
  quoi: "Ce que la page montre à toute la guilde. Les valeurs d'origine sont son état actuel.",
  reglages: [
    { clef: "cartes", type: "interrupteur", label: "Les cartes du jeu sur les tuiles",
      aide: `La bande en tête de chaque tuile : le plan du client, ou une lueur élémentaire pour ${SANS_PLAN} donjons sur ${(dungeonsData as unknown[]).length} qui n'ont pas de carte montrable.`, defaut: true },
    { clef: "tour", type: "interrupteur", label: "Le bloc Tour Oubliée",
      aide: "Ses cinq étages, après la grille. Ce n'est pas une destination du téléporteur — d'où le bloc séparé.", defaut: true },
    { clef: "oasis", type: "interrupteur", label: "Le bloc Protection de l'Oasis",
      aide: "Les 52 vagues de la Tour Infernale. L'ancienne adresse /oasis y mène par une ancre.", defaut: true },
    { clef: "horsTeleporteur", type: "interrupteur", label: "Le bloc Hors du téléporteur",
      aide: "Les quatre zones à ticket et les quatre cartes de donjon que le téléporteur ne propose pas, avec leur carte du client.", defaut: true },
    { clef: "butins", type: "nombre", label: "Butins listés sur une tuile",
      aide: "Au-delà, la tuile affiche des points de suspension. Monter ce nombre allonge les tuiles.", defaut: 3, min: 1, max: 8 },
  ],
} as const satisfies SchemaPage;

export function PageDonjons({ vagues, idsMonstres = {} }: {
  vagues: Vague[];
  /** nom|niveau|PV → identifiant de fiche /monstres. Lu côté serveur, cf. donnees.ts. */
  idsMonstres?: Record<string, string>;
}) {
  const { valeurs, bouton, panneau } = useReglages(REGLAGES_DONJONS);
  const voirCartes = Boolean(valeurs.cartes);
  const nbButins = Number(valeurs.butins) || 3;
  // Halo curseur + relief sur les cartes de donjon (.fx-card), cf. VgFx.
  useCardFx();
  const dungeons = dungeonsData as Dungeon[];

  const [q, setQ] = useState(""); const [typeFilter, setTypeFilter] = useState<"Tous" | "SOLO" | "GROUPE">("Tous"); const [sel, setSel] = useState<Dungeon | null>(null);
  /** « Par prestige » regroupe au lieu de filtrer : on cherche rarement UN prestige, on veut voir la marche à suivre. */
  const [tri, setTri] = useState<"ordre" | "prestige">("ordre");

  /**
   * `?instance=<nom>` ouvre directement la fiche visée. C'est ce qui permet au
   * guide de progression de renvoyer sur l'instance dont il parle, au lieu de
   * laisser le lecteur la chercher dans une grille de vingt-trois cartes.
   */
  useEffect(() => {
    const vise = new URLSearchParams(window.location.search).get("instance");
    if (!vise) return;
    const cible = dungeons.find((d) => d.name.toLowerCase() === vise.toLowerCase());
    if (cible) setSel(cible);
  }, [dungeons]);
  const wikiList = dungeons.filter(d => (typeFilter === "Tous" || d.type === typeFilter) && (!q || d.name.toLowerCase().includes(q.toLowerCase())));

  /**
   * La liste, telle qu'on la parcourt. Par défaut, l'ordre du fichier — celui
   * dans lequel on débloque les instances. Par prestige, les mêmes donjons
   * rangés sous le palier qui les ouvre : c'est la question « qu'est-ce que je
   * peux faire à mon prestige ? », qu'une liste à plat ne répond pas.
   */
  const groupes = useMemo(() => {
    if (tri === "ordre") return [{ titre: "", items: wikiList }];
    const par = new Map<number, Dungeon[]>();
    for (const d of wikiList) {
      const p = d.prestige ?? 0;
      if (!par.has(p)) par.set(p, []);
      par.get(p)!.push(d);
    }
    return [...par.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([p, items]) => ({ titre: p === 0 ? "Sans prestige requis" : `Prestige ${p}`, items }));
  }, [wikiList, tri]);

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };

  /** Ce que le client du jeu sait de l'instance ouverte. Absent = fiche d'avant la fouille. */
  const clSel = sel ? donjonClient(sel.id) : undefined;

  const qMin = q.trim().toLowerCase();
  const chercheTour = !qMin || MOTS_TOUR.includes(qMin);
  const chercheOasis = !qMin || MOTS_OASIS.includes(qMin);
  /* Sans accents des DEUX côtés : les mots du bloc sont dépliés sans accent
     (« rartesia », « ile corail »), donc la frappe doit l'être aussi — sinon
     taper « Rartésia » ne trouvait pas Rartésia. */
  const chercheLieux =
    !qMin || MOTS_HORS_TELEPORTEUR.includes(qMin.normalize("NFD").replace(/[̀-ͯ]/g, ""));

  /**
   * LE SOUS-TITRE NE RÉPÈTE PLUS LES COMPTEURS, et c'est une règle déjà posée sur
   * /monstres pour la même raison. Il alignait « 23 donjons du téléporteur · 8 lieux
   * hors téléporteur · 5 étages de Tour Oubliée · 52 vagues à l'Oasis » — soit
   * EXACTEMENT les quatre nombres que le schéma d'entrée, à trois centimètres en
   * dessous, porte déjà, chacun à côté de la porte qui y mène. Le même chiffre écrit
   * deux fois sur le même écran ne renseigne pas deux fois.
   *
   * Ce qui reste est ce que le schéma ne dit pas : la promesse de la page. Les
   * comptes n'ont pas disparu du HTML pour un moteur de recherche — ils sont dans le
   * schéma, et la description de layout.tsx les porte aussi.
   */
  const sousTitre = "Par où on entre, ce qu'on y trouve, et ce qui en tombe.";

  /**
   * LES PORTES DU SCHÉMA D'ENTRÉE, montées ici parce que c'est ici que vivent les
   * comptes ET les réglages. Une porte qui mènerait à un bloc éteint par un Vanguard
   * serait un lien mort ; une porte dont le compte serait écrit à la main serait
   * fausse au prochain relevé.
   *
   * Elles sont dans l'ORDRE DE LA PAGE, et cet ordre est le renseignement : du plus
   * proche du téléporteur au plus à part. Le schéma se cache pendant une recherche —
   * les blocs, eux, se cachent selon ce que la frappe désigne, et un plan de page qui
   * renvoie vers ce qui n'est plus affiché ment.
   */
  /**
   * L'ARMURE CONSEILLÉE ÉTAIT ÉCRITE DIX-NEUF FOIS, ET DIX-NEUF FOIS LA MÊME.
   *
   * « Armure vent +20 » apparaît sur 19 des 23 tuiles ; les 4 autres n'exigent rien.
   * C'est le défaut que la page a déjà corrigé une fois : la pastille « élément »
   * valait « Terre » partout, et une pastille identique partout ne fait choisir
   * personne. Ici la valeur ne distingue rien non plus — ce qui distingue, c'est
   * qu'il y en ait une OU PAS.
   *
   * Alors on la dit UNE fois, sous les filtres, et la tuile ne garde que le
   * pictogramme de bouclier. Et c'est CALCULÉ : la phrase ne s'écrit que si toutes
   * les armures relevées sont réellement identiques. Le jour où une instance
   * demandera autre chose, la phrase disparaît et chaque tuile reprend sa valeur —
   * sans quoi le pictogramme mentirait par omission.
   */
  const armures = [...new Set(dungeons.map((d) => d.armor).filter(Boolean))] as string[];
  const memeArmure = armures.length === 1 ? armures[0] : null;

  const portes: Porte[] = [
    { icon: "spiral", par: "Le téléporteur", quoi: `${dungeons.length} donjons`, ancre: "teleporteur" },
    ...(Boolean(valeurs.horsTeleporteur)
      ? GROUPES_HORS_TELEPORTEUR.map((g) => ({ icon: g.icon, par: g.par, quoi: g.quoi, ancre: g.ancre }))
      : []),
    /* LE NOM COMPLET DU PNJ, ET C'EST SA SEULE OCCURRENCE À L'ÉCRAN. Une passe
       d'allègement l'avait raccourci en « Gardien » et fait disparaître « Gardien de
       la Tour Oubliée » de tout le site — or trente-quatre libellés du jeu portent le
       mot « Gardien », donc le raccourci ne désigne plus personne qu'on puisse
       chercher. Il a été rapatrié depuis la puce de la Tour Oubliée, où il faisait
       doublon avec ce schéma. */
    ...(Boolean(valeurs.tour)
      ? [{ icon: "user" as const, par: <>Le <b style={{ fontWeight: 600 }}>Gardien de la Tour Oubliée</b>, à Flarine</>, quoi: `${TOUR_OUBLIEE.length} étages`, ancre: "tour-oubliee" }]
      : []),
    ...(Boolean(valeurs.oasis) && vagues.length
      ? [{ icon: "shield" as const, par: "Un événement, sur son arène", quoi: `${vagues.length} vagues`, ancre: "oasis" }]
      : []),
  ];

  return (
    <IdsMonstres ids={idsMonstres}>
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-pve.webp" icon="map" title="Wiki des Donjons" subtitle={sousTitre} />
      <SectionTabs section="pve" />
      {/* L'engrenage n'existe pas dans le rendu pour les autres rangs : ni grise, ni
          masque en CSS — absent. Un bouton visible qu'on ne peut pas actionner
          invite a cliquer pour rien. */}
      {bouton && <div style={{ margin: "-6px 0 14px" }}>{bouton}</div>}
      {/* L'onglet « Wiki des donjons » a ete retire : il etait seul dans sa barre,
          donc il ne proposait aucun choix — la page EST le wiki. Le suivi quotidien
          et le rapport d'instances qui l'accompagnaient sont partis avec lui ; leur
          code restait la sans qu'aucun clic ne puisse plus l'atteindre. */}

      {/* LE PLAN DE LA PAGE, EN SCHÉMA ET AVANT TOUT LE RESTE : la question que
          /donjons résout n'est pas « lequel » mais « par où ». Cf. CommentOnEntre.tsx
          pour les quatre phrases qu'il remplace. */}
      {!qMin && <CommentOnEntre portes={portes} />}

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un donjon..." style={{ flex: 1, minWidth: 180, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)" }} />
        <div className="vg-subtabs" style={{ margin: 0 }}>{(["Tous", "SOLO", "GROUPE"] as const).map(t => <button key={t} onClick={() => setTypeFilter(t)} className={`vg-subtab ${typeFilter === t ? "active" : ""}`}>{t}</button>)}</div>
        {/* Le type FILTRE, le prestige REGROUPE : ce sont deux questions
            différentes, « en solo ou à plusieurs ? » et « à mon palier, je peux
            faire quoi ? ». Les mêler dans une seule barre obligeait à renoncer
            à l'une pour poser l'autre. */}
        <div className="vg-subtabs" style={{ margin: 0 }}>
          {([["ordre", "Par ordre"], ["prestige", "Par prestige"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTri(k)} className={`vg-subtab ${tri === k ? "active" : ""}`}>{l}</button>
          ))}
        </div>
      </div>
      {/* La phrase qui remplace dix-neuf pastilles bavardes. Elle compte les tuiles
          concernées au lieu de les annoncer : « 19 » vient des données. */}
      {memeArmure && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", margin: "-4px 0 12px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Icon name="shield" size={12} style={{ color: "var(--orange)", flexShrink: 0 }} />
          Le bouclier sur une tuile veut dire <b style={{ color: "var(--text)" }}>{memeArmure}</b> :
          c&apos;est la même sur les {dungeons.filter((d) => d.armor).length} instances qui en demandent une.
        </div>
      )}
      {/* « Aucun donjon » ne veut plus dire « rien sur cette page » : la recherche
          peut ne rien trouver dans la grille et désigner un des deux blocs du bas. */}
      {wikiList.length === 0 && !chercheTour && !chercheOasis && !chercheLieux && <div style={{ color: "var(--text-muted)", padding: "18px 2px", fontSize: 13 }}>Aucun donjon ne correspond.</div>}
      {/* LA CIBLE DE LA PREMIÈRE PORTE. `scrollMarginTop` vaut la hauteur de la barre
          de navigation plus un souffle : sans lui, l'ancre pose le titre du bloc
          exactement SOUS la barre, qui est fixe — le lecteur croit avoir atterri au
          milieu de nulle part. Même valeur que la marge du voile des fiches (88 px),
          pour la même raison et la même barre. */}
      <div id="teleporteur" style={{ scrollMarginTop: 88 }}>
      {groupes.map((g) => (
      <div key={g.titre || "tout"} style={{ marginBottom: g.titre ? 20 : 0 }}>
      {g.titre && (
        <div className="font-heading" style={{ fontSize: 12.5, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--orange)", margin: "4px 0 10px", display: "flex", alignItems: "baseline", gap: 8 }}>
          {g.titre}
          <span style={{ fontSize: 12, letterSpacing: 0, textTransform: "none", color: "var(--text-muted)", fontWeight: 400 }}>
            {g.items.length} donjon{g.items.length > 1 ? "s" : ""}
          </span>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 12 }}>
        {g.items.map(d => {
          const cl = donjonClient(d.id);
          // Le plus gros PV posé sur la carte : la vraie mesure de « à quoi je
          // m'attaque ». Les PV conseillés disent ce qu'il faut encaisser, pas ce
          // qu'il faut abattre, et l'écart va de 85 400 à 570 millions.
          const grosPV = cl?.monstres.length ? Math.max(...cl.monstres.map(m => m.pv)) : 0;
          return (
          <div key={d.id} className="fx-card" onClick={() => setSel(d)} style={{ ...card, padding: 0, marginBottom: 0, cursor: "pointer", overflow: "hidden" }}>
            {/* LA CARTE DU DONJON EN TÊTE DE TUILE. Vingt-trois tuiles de texte sur
                une page qui dispose de quinze plans du jeu, c'était le reproche de
                Maxime — « je n'ai pas vu un grand changement » — et il était juste.

                `PLANS[dossier]` peut manquer, et c'est VOULU : six donjons n'ont rien
                de montrable, dont quatre dont la vue aérienne a été retirée parce
                qu'elle ne montrait qu'un carré vert ou du noir. La tuile retombe
                alors sur sa mise en page d'origine — mieux vaut pas d'image qu'un
                carré vide.

                `aspectRatio` et non une hauteur fixe : les plans du client sont des
                4/3 et les vues aériennes des carrés ; une hauteur imposée écraserait
                les uns ou les autres. Le dégradé en bas rattache l'image à la tuile
                au lieu de la poser dessus comme une vignette collée. */}
            {(() => {
              if (!voirCartes) return null;
              const plan = cl ? PLANS[cl.dossier] : undefined;
              /* SIX DONJONS N'ONT PAS DE CARTE MONTRABLE, et la tuile ne peut pas se
                 contenter de sauter la bande : une grille où certaines tuiles ont un
                 bandeau et d'autres non partait en dents de scie — constaté à l'écran,
                 pas supposé.

                 On ne met donc PAS une fausse carte. On met une lueur du jeu
                 (public/jeu/decor/, treize textures qui ne servaient nulle part), et
                 on la fait DIRE quelque chose.

                 ELLE NE DISAIT RIEN. Elle suivait `d.elem`, le champ « élément boss »
                 de dungeons.json — qui vaut « Terre » sur les vingt-trois donjons.
                 Une clé constante donne une texture constante : les cinq bandes
                 étaient la même image, et le commentaire annonçait une variation
                 qui n'existait pas. Le même défaut que la pastille supprimée plus
                 bas, à trois cents lignes d'écart.

                 Elle suit maintenant l'élément DOMINANT des créatures posées, lu
                 dans le fichier de carte du client. NE PAS SURVENDRE CE QUE ÇA
                 DONNE : sur les cinq tuiles concernées, trois instances posent des
                 créatures de terre (Faille du débutant, Ruines givrées, Dédale de
                 Rhisis) et deux n'ont aucun élément relevé (Ruine Prestigieuse,
                 Temple aérien) — donc deux textures, pas cinq. La clé n'est plus
                 constante par construction, ce qui est le point : le jour où une
                 fouille rend le peuplement d'une de ces cartes, la bande suit.
                 Sans peuplement connu, la lueur neutre.
                 La bande garde la même hauteur, la grille s'aligne, et le libellé
                 avoue franchement qu'il n'y a pas de plan — au lieu de laisser croire
                 qu'on regarde une carte. */
              if (!plan) {
                const LUEUR: Record<string, string> = {
                  Feu: "crystalglow05", Eau: "crystalglow01", Électricité: "crystalglow06",
                  Electricite: "crystalglow06", Vent: "crystalglow07", Terre: "crystalglow06",
                };
                const f = LUEUR[(cl && dominantInstance(cl)?.e) ?? ""] ?? "aurora3";
                return (
                  <div style={{ position: "relative", aspectRatio: "16 / 7", overflow: "hidden", borderBottom: "1px solid var(--border)", background: "var(--bg-3)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/jeu/decor/${f}.webp`} alt="" aria-hidden="true"
                      style={{ width: "100%", height: "100%", objectFit: "cover", opacity: .38 }} />
                    <span aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", opacity: .55 }}>
                      <Icon name={d.icon as IconName} size={30} />
                    </span>
                    {/* SIX MOTS DEVENUS DEUX, et l'aveu tient toujours : la bande n'est
                        pas une carte. Le `title` garde la phrase entière pour qui
                        s'interroge. */}
                    <span title="Le client ne porte aucune carte montrable de cette instance"
                      style={{ position: "absolute", left: 8, bottom: 6, fontSize: 9.5, textTransform: "uppercase", letterSpacing: .7, color: "var(--text-muted)", background: "rgba(13,13,17,.6)", borderRadius: 4, padding: "1px 6px" }}>
                      sans plan
                    </span>
                  </div>
                );
              }
              return (
                <div style={{ position: "relative", aspectRatio: "16 / 7", overflow: "hidden", borderBottom: "1px solid var(--border)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={plan.src} alt="" aria-hidden="true"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", filter: plan.filtre, opacity: .92 }} />
                  <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(13,13,17,0) 40%, rgba(13,13,17,.85) 100%)" }} />
                  {/* Le genre est dit, comme sur la fiche : une vue aérienne n'est pas
                      un plan, et l'annoncer comme tel promettait une carte lisible. */}
                  <span style={{ position: "absolute", left: 8, bottom: 6, fontSize: 9.5, textTransform: "uppercase", letterSpacing: .7, color: "var(--text-muted)", background: "rgba(13,13,17,.6)", borderRadius: 4, padding: "1px 6px" }}>
                    {plan.genre === "aerien" ? "vue aérienne" : "plan du client"}
                  </span>
                </div>
              );
            })()}
            <div style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><Icon name={d.icon as IconName} framed frameSize={36} tone="orange" /><div style={{ minWidth: 0 }}><div className="font-heading" style={{ fontWeight: 600, fontSize: 15 }}>{d.name}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{d.type} · {d.lvl}{d.prestige ? ` · P${d.prestige}` : ""}</div></div></div>
            {/* LA PASTILLE « ÉLÉMENT » A CHANGÉ DE CONTENU. Elle affichait `d.elem`,
                qui vaut « Terre » sur les vingt-trois donjons sans exception : une
                pastille identique partout ne fait choisir personne. À sa place, les
                icônes du jeu pour ce à quoi les créatures posées sont FAIBLES —
                lu dans leur table de résistances, et ça varie d'une instance à
                l'autre. Voir components/donjons/elements.tsx. Quand le client ne
                connaît pas l'instance, la pastille n'apparaît pas plutôt que
                d'afficher un mot vide de sens. */}
            {/* ┌──── LA LIGNE DE PASTILLES A AVALÉ DEUX PHRASES ────┐
                Elle portait les PV conseillés, la faiblesse et l'armure. Sous elle
                venaient deux lignes de texte : « 6 espèces · le plus coriace à
                3,3 M PV » et « Vidéo disponible ». Onze mots plus trois, sur
                vingt-trois tuiles, pour trois renseignements qui tiennent chacun dans
                une pastille — le compte d'espèces, le plus gros sac de PV, et un
                pictogramme de caméra. Le `title` porte la phrase entière pour qui la
                veut, et la tuile ne la sert plus à tout le monde.
                └───────────────────────────────────────────────────┘ */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12, alignItems: "center" }}>
              <span title="Les PV conseillés pour y entrer" style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}><Icon name="heart" size={11} style={{ marginRight: 3 }} />{hpLabel(d.hp)}</span>
              {grosPV > 0 && (
                <span title={`${cl!.monstres.length} espèce${cl!.monstres.length > 1 ? "s" : ""} posée${cl!.monstres.length > 1 ? "s" : ""} sur la carte, la plus coriace à ${pvCourt(grosPV)} PV`}
                  style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px", fontVariantNumeric: "tabular-nums" }}>
                  <Icon name="skull" size={11} style={{ marginRight: 3 }} />{cl!.monstres.length} · {pvCourt(grosPV)}
                </span>
              )}
              {cl && aDesFaiblesses(cl) && <span title="Ce à quoi les créatures posées sont faibles" style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="target" size={11} style={{ color: "var(--green)" }} /><FaiblessesDonjon d={cl} bulle={false} /></span>}
              {d.armor && (
                <span title={`Armure conseillée : ${d.armor}`} style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px", display: "inline-flex", alignItems: "center", gap: 3, color: "var(--orange)" }}>
                  <Icon name="shield" size={11} />{memeArmure ? null : d.armor}
                </span>
              )}
              {/* Le pictogramme SEUL, et il est orange quand la vidéo existe. Les deux
                  états restent distingués — c'est ce qui évite d'ouvrir les fiches une
                  par une — mais sans les trois mots qui les nommaient. Le champ
                  n'existe que sur les instances Solo : les autres tuiles ne montrent
                  rien du tout, ce qui est le troisième état. */}
              {d.video !== undefined && (
                <span title={d.video ? "Une vidéo de l'instance est disponible dans la fiche" : "Pas encore de vidéo pour cette instance"}
                  style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px", display: "inline-flex", alignItems: "center", color: d.video ? "var(--orange)" : "var(--text-muted)", opacity: d.video ? 1 : .5 }}>
                  <Icon name="video" size={11} />
                </span>
              )}
            </div>
            {/* ┌──── LES BUTINS SONT DEVENUS LEURS ICÔNES DU JEU ────┐
                La tuile alignait trois noms complets — « Armes Luzaka oubliée (DPS) —
                toutes classes, Boucliers Luzaka (DCC/INT/END), Armes Luzaka oubliée
                (TANK) … », quinze mots — et c'est exactement ce que Maxime demande de
                remplacer : « les images parlent beaucoup plus ». Les 51 butins que les
                tuiles montrent ont TOUS leur icône dans icones-objets.json, vérifié
                avant d'écrire cette ligne : aucune tuile ne retombe sur du vide.
                Le nom reste dans l'`alt` et dans le `title` — donc lisible au survol et
                par un lecteur d'écran — et la fiche, elle, garde la liste écrite avec
                <NomObjet>, qui mène au catalogue, à la provenance et à la requête.
                Le compte des restants passe en « +5 » : la tuile promettait « … », qui
                ne dit pas combien.
                └────────────────────────────────────────────────────┘ */}
            {(() => {
              const montrables = butinsMontrables(d.drops);
              if (montrables.length === 0) return null;
              const vus = montrables.slice(0, nbButins);
              const reste = montrables.length - vus.length;
              return (
                <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <Icon name="gift" size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  {vus.map((n) => {
                    const ic = iconeButin(n);
                    return ic ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={n} src={ic} alt={n} title={n} width={22} height={22}
                        style={{ objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 }} />
                    ) : (
                      /* Sans icône, le nom reprend sa place : mieux vaut un mot qu'un
                         trou. Aucun cas à ce jour, mais un butin ajouté demain n'a pas
                         à disparaître de la tuile en attendant son image. */
                      <span key={n} style={{ fontSize: 11, color: "var(--text-muted)" }}>{n}</span>
                    );
                  })}
                  {reste > 0 && (
                    <span title={`${reste} autre${reste > 1 ? "s" : ""} butin${reste > 1 ? "s" : ""} dans la fiche`}
                      style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>+{reste}</span>
                  )}
                </div>
              );
            })()}
            </div>
          </div>
          );
        })}
      </div>
      </div>
      ))}
      </div>

      {/* Après la grille, pas dedans : la Tour Oubliée n'est pas une destination
          du téléporteur, et la mêler aux vingt-trois ferait croire qu'on y entre
          pareil. Elle répond quand même à la recherche — quelqu'un qui tape
          « tour » la cherche, et la voir disparaître pendant qu'on cherche autre
          chose évite de croire qu'elle fait partie des résultats. */}
      {/* HORS DU TÉLÉPORTEUR, juste après la grille et avant la Tour Oubliée : ce
          sont encore des destinations, alors que la Tour et l'Oasis ont chacune
          leur propre façon d'y entrer. L'ordre de la page reste « du plus proche
          du téléporteur au plus à part ». */}
      {chercheLieux && Boolean(valeurs.horsTeleporteur) && <HorsTeleporteur />}

      {chercheTour && Boolean(valeurs.tour) && <TourOubliee />}

      {/* Le troisième bloc, et le plus à part des trois : un événement, pas un
          donjon. Il avait sa propre page — /oasis, qui redirige maintenant ici.
          Même règle de recherche que la Tour Oubliée, à un détail près : un mot
          qui ne peut désigner QUE l'Oasis en ouvre le détail. « tour » n'en fait
          pas partie — il désigne aussi bien la Tour Oubliée, et déplier
          cinquante-deux vagues sur un mot ambigu répond à côté. */}
      {chercheOasis && Boolean(valeurs.oasis) && <BlocOasis vagues={vagues} ouvrir={!!qMin && MOTS_OASIS.includes(qMin) && !MOTS_TOUR.includes(qMin)} />}

      {/* La marge haute du voile vaut la hauteur de la barre de navigation (68 px)
          plus un souffle. Sans elle, une fiche assez haute pour remplir l'écran
          passait SOUS la barre et perdait son titre : la barre se peint au-dessus
          du voile malgré son z-index plus bas, parce qu'elle vit dans un autre
          contexte d'empilement. Le voile ne peut pas gagner ce duel, il s'écarte. */}
      {sel && (
        <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "88px 20px 20px" }}>
          {/* Élargie de 500 à 720 px : la fiche ne portait que les PV, l'élément et
              le butin, elle porte maintenant la situation de la carte et son
              peuplement. À 500 px, chaque ligne de monstre passait sur trois
              lignes de texte. */}
          <div onClick={e => e.stopPropagation()} style={{ ...card, maxWidth: 720, width: "100%", marginBottom: 0, maxHeight: "calc(100vh - 108px)", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><Icon name={sel.icon as IconName} framed frameSize={48} tone="orange" /><div style={{ minWidth: 0 }}><h2 className="font-heading" style={{ fontSize: 22 }}>{sel.name}</h2><div style={{ color: "var(--text-muted)", fontSize: 13 }}>{sel.type} · Niveau {sel.lvl}{sel.prestigeDetail ? ` · Prestige ${sel.prestigeDetail}` : sel.prestige ? ` · Prestige ${sel.prestige}` : ""}</div><EcartPrestige site={sel.prestige} client={clSel?.prestigeClient ?? null} /></div></div>
            {/* ┌──── DEUX TUILES SONT DEVENUES UNE TUILE ET UN CONSEIL ────┐
                   La seconde disait « ÉLÉMENT BOSS : TERRE », et elle le disait
                   sur les vingt-trois fiches : le champ vaut « Terre » partout
                   dans dungeons.json, sans exception. Elle a d'abord été
                   remplacée par les icônes de faiblesse du peuplement posé — ce
                   qui change bien ce qu'on emporte, mais ne disait toujours que
                   la moitié. `donjons-client.json` porte DEUX champs par créature
                   posée, `faible` ET `resiste` ; le second est renseigné sur
                   toutes, il est juste, et il ne sortait sur aucun écran du site.
                   C'est pourtant lui qui coûte : un joueur qui a retenu « les
                   monstres sont surtout de terre, prends du vent » entre dans une
                   instance dont les créatures ENCAISSENT MIEUX le vent, et croit
                   que le wiki s'est trompé.
                   `ConseilInstance` dit les trois — la dominante posée, ce qu'on
                   emporte, ce qu'on laisse — comptés sur la carte de l'instance.
                   Il ne s'affiche pas quand le client ne connaît pas l'instance :
                   mieux vaut rien qu'un cadre vide.
                   └───────────────────────────────────────────────────────────┘ */}
            <div style={{ background: "var(--bg-3)", borderRadius: 8, padding: 12, minWidth: 0, marginBottom: 10 }}><div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>PV recommandés</div><div className="font-heading" style={{ fontWeight: 700, color: "var(--orange)" }}>{hpLabel(sel.hp)}</div></div>
            {clSel && <ConseilInstance d={clSel} />}
            {sel.armor && <div style={{ background: "rgba(255,140,26,0.06)", border: "1px solid var(--orange-dark)", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13 }}><Icon name="shield" size={13} style={{ marginRight: 5 }} />Armure conseillée : <b>{sel.armor}</b></div>}

            {/* Tout ce qui vient de la fouille du client : où est la carte, à quoi
                elle ressemble, qui y est posé. Les fiches d'avant la fouille
                n'affichent rien de plus qu'avant. */}
            {clSel && <>
              <Situation d={clSel} nomAffiche={sel.name} />
              <PlanDonjon d={clSel} />
              <Peuplement d={clSel} />
              <KalgasEnPlus d={clSel} />
            </>}

            {/* La vidéo du donjon, quand elle existe dans la playlist de Sugot.
                Domaine nocookie : rien n'est déposé chez le visiteur tant qu'il
                n'a pas lancé la lecture. `loading=lazy` évite de charger le
                lecteur pour une fiche qu'on ne fait qu'entrouvrir. */}
            {sel.video !== undefined && (
              <div style={{ marginBottom: 14 }}>
                <SousTitre icon="video">En vidéo</SousTitre>
                {sel.video ? (
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${sel.video}?list=${PLAYLIST}&rel=0`}
                      title={`${sel.name} en vidéo`} loading="lazy" allowFullScreen
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                    />
                  </div>
                ) : (
                  // Dire l'absence plutôt que de ne rien afficher : la série est
                  // en cours, et sans cette ligne on ne sait pas s'il n'y a pas
                  // de vidéo ou si la fiche est cassée.
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    Pas encore de vidéo pour cette instance.
                    <a href={`https://www.youtube.com/playlist?list=${PLAYLIST}`} target="_blank" rel="noreferrer"
                      style={{ color: "var(--orange)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Icon name="video" size={12} />Voir la playlist
                    </a>
                  </div>
                )}
              </div>
            )}
            {(() => {
              // La fiche montre la liste complète quand on l'a ; la carte, elle, garde le résumé.
              // Filtrée de la même façon que la tuile : le compte annoncé à côté du titre
              // doit être celui des objets réellement listés dessous.
              const liste = butinsMontrables(sel.dropsComplets ?? sel.drops);
              return (<>
                <SousTitre icon="gift" apres={liste.length > 0 ? `${liste.length} objet${liste.length > 1 ? "s" : ""}` : undefined}>Drops</SousTitre>
                {/* CHAQUE BUTIN MÈNE MAINTENANT QUELQUE PART. Demande de Maxime, mot
                    pour mot : « il faut aussi que ça redirige les objets ou les
                    drops ». `NomObjet` fait les deux d'un coup — la fiche du
                    catalogue, et la provenance quand le client la connaît — et il
                    ne charge la provenance qu'à l'ouverture de la bulle : une fiche
                    de donjon peut porter trente-deux butins, trente-deux requêtes au
                    chargement auraient coûté plus que la page. */}
                {liste.length > 0
                  ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{liste.map(d => <span key={d} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px 4px 6px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}><NomObjet nom={d} icone={iconeButin(d)} taille={18} /></span>)}</div>
                  /* LA MISE EN GARDE RESTE, RÉDUITE AU FAIT QUI CHANGE LE GESTE.
                     Elle faisait quarante mots pour dire deux choses : rien n'est
                     relevé, et l'absence ne prouve rien. La seconde est celle qui
                     empêche de conclure « ce donjon ne lâche rien » — elle vaut la
                     place, la première tenait déjà dans le titre du bloc. */
                  : <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      Non relevés. Le butin ordinaire est calculé par le serveur : son absence
                      ici ne veut pas dire que rien ne tombe.
                    </div>}
              </>);
            })()}
            <button onClick={() => setSel(null)} style={{ marginTop: 16, width: "100%", padding: 10, borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer" }} className="font-heading">Fermer</button>
          </div>
        </div>
      )}

      {/* Le tiroir de réglages, rendu UNE fois et en dernier. Il se pose lui-même en
          `position: fixed` : le mettre plus haut dans l'arbre le ferait enfermer par le
          premier ancêtre qui porte un `transform` — piège déjà payé sur ce site, une
          modale s'était retrouvée coincée dans sa carte. */}
      {panneau}
    </div>
    </IdsMonstres>
  );
}
