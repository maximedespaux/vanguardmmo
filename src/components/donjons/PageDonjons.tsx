"use client";
import { useEffect, useMemo, useState } from "react";
import dungeonsData from "@/data/dungeons.json";
import ICONES_OBJETS from "@/data/icones-objets.json";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { donjonClient, pvCourt, PLANS, TOUR_OUBLIEE } from "@/components/donjons/donneesClient";
import { EcartPrestige, KalgasEnPlus, Peuplement, PlanDonjon, Situation, SousTitre } from "@/components/donjons/FicheClient";
import { TourOubliee } from "@/components/donjons/TourOubliee";
import { BlocOasis } from "@/components/donjons/BlocOasis";
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
function IconeObjet({ nom }: { nom: string }) {
  const src = (ICONES_OBJETS as Record<string, string>)[nom];
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={20} height={20} style={{ objectFit: "contain", flexShrink: 0 }} />;
}

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
const REGLAGES_DONJONS = {
  page: "/donjons",
  titre: "Réglages du wiki des donjons",
  quoi: "Ce que la page montre à toute la guilde. Les valeurs d'origine sont son état actuel.",
  reglages: [
    { clef: "cartes", type: "interrupteur", label: "Les cartes du jeu sur les tuiles",
      aide: "La bande en tête de chaque tuile : le plan du client, ou une lueur élémentaire pour les six donjons qui n'ont pas de carte montrable.", defaut: true },
    { clef: "tour", type: "interrupteur", label: "Le bloc Tour Oubliée",
      aide: "Ses cinq étages, après la grille. Ce n'est pas une destination du téléporteur — d'où le bloc séparé.", defaut: true },
    { clef: "oasis", type: "interrupteur", label: "Le bloc Protection de l'Oasis",
      aide: "Les 52 vagues de la Tour Infernale. L'ancienne adresse /oasis y mène par une ancre.", defaut: true },
    { clef: "butins", type: "nombre", label: "Butins listés sur une tuile",
      aide: "Au-delà, la tuile affiche des points de suspension. Monter ce nombre allonge les tuiles.", defaut: 3, min: 1, max: 8 },
  ],
} as const satisfies SchemaPage;

export function PageDonjons({ vagues }: { vagues: Vague[] }) {
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

  /**
   * Le sous-titre se compte, il ne s'écrit pas : trois nombres qui viennent de
   * trois sources différentes (le wiki, le client, le relevé). Le jour où une
   * ligne s'ajoute quelque part, la phrase se corrige seule. Sans relevé, la
   * troisième moitié de phrase disparaît plutôt que d'annoncer « 0 vagues ».
   */
  const sousTitre = `Les ${dungeons.length} donjons du téléporteur, les ${TOUR_OUBLIEE.length} étages de la Tour Oubliée`
    + (vagues.length ? ` et les ${vagues.length} vagues de la Protection de l'Oasis` : "")
    + " : où on entre, ce qu'on y croise, ce qui tombe.";

  return (
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
      {/* « Aucun donjon » ne veut plus dire « rien sur cette page » : la recherche
          peut ne rien trouver dans la grille et désigner un des deux blocs du bas. */}
      {wikiList.length === 0 && !chercheTour && !chercheOasis && <div style={{ color: "var(--text-muted)", padding: "18px 2px", fontSize: 13 }}>Aucun donjon ne correspond.</div>}
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
                 on la fait DIRE quelque chose : sa couleur suit l'élément du donjon.
                 La bande garde la même hauteur, la grille s'aligne, et le libellé
                 avoue franchement qu'il n'y a pas de plan — au lieu de laisser croire
                 qu'on regarde une carte. */
              if (!plan) {
                const LUEUR: Record<string, string> = {
                  Feu: "crystalglow05", Eau: "crystalglow01", Électricité: "crystalglow06",
                  Electricite: "crystalglow06", Vent: "crystalglow07", Terre: "crystalglow06",
                };
                const f = LUEUR[d.elem] ?? "aurora3";
                return (
                  <div style={{ position: "relative", aspectRatio: "16 / 7", overflow: "hidden", borderBottom: "1px solid var(--border)", background: "var(--bg-3)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/jeu/decor/${f}.webp`} alt="" aria-hidden="true"
                      style={{ width: "100%", height: "100%", objectFit: "cover", opacity: .38 }} />
                    <span aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", opacity: .55 }}>
                      <Icon name={d.icon as IconName} size={30} />
                    </span>
                    <span style={{ position: "absolute", left: 8, bottom: 6, fontSize: 9.5, textTransform: "uppercase", letterSpacing: .7, color: "var(--text-muted)", background: "rgba(13,13,17,.6)", borderRadius: 4, padding: "1px 6px" }}>
                      pas de carte dans le client
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
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12 }}><span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}><Icon name="heart" size={11} style={{ marginRight: 3 }} />{hpLabel(d.hp)}</span><span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}><Icon name="sparkles" size={11} style={{ marginRight: 3 }} />{d.elem}</span>{d.armor && <span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}><Icon name="shield" size={11} style={{ marginRight: 3 }} />{d.armor}</span>}</div>
            {d.drops.length > 0 && <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}><Icon name="gift" size={11} style={{ marginRight: 3 }} />{d.drops.slice(0, nbButins).join(", ")}{d.drops.length > nbButins ? "…" : ""}</div>}
            {/* Signalé sur la carte, dans un sens comme dans l'autre : sans ça,
                personne ne devine qu'il y a une vidéo derrière, et celui qui
                en cherche une ouvre les fiches une par une pour rien. Le champ
                n'existe que sur les instances Solo — la série ne couvre
                qu'elles, donc les autres cartes ne disent rien. */}
            {grosPV > 0 && (
              <div style={{ marginTop: 7, fontSize: 11.5, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                <Icon name="skull" size={11} style={{ marginRight: 3 }} />
                {cl!.monstres.length} espèce{cl!.monstres.length > 1 ? "s" : ""} · le plus coriace à {pvCourt(grosPV)} PV
              </div>
            )}
            {d.video !== undefined && (
              <div style={{ marginTop: 7, fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 5, color: d.video ? "var(--orange)" : "var(--text-muted)" }}>
                <Icon name="video" size={11} />{d.video ? "Vidéo disponible" : "Pas encore de vidéo"}
              </div>
            )}
            </div>
          </div>
          );
        })}
      </div>
      </div>
      ))}

      {/* Après la grille, pas dedans : la Tour Oubliée n'est pas une destination
          du téléporteur, et la mêler aux vingt-trois ferait croire qu'on y entre
          pareil. Elle répond quand même à la recherche — quelqu'un qui tape
          « tour » la cherche, et la voir disparaître pendant qu'on cherche autre
          chose évite de croire qu'elle fait partie des résultats. */}
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ background: "var(--bg-3)", borderRadius: 8, padding: 12, minWidth: 0 }}><div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>PV recommandés</div><div className="font-heading" style={{ fontWeight: 700, color: "var(--orange)" }}>{hpLabel(sel.hp)}</div></div>
              <div style={{ background: "var(--bg-3)", borderRadius: 8, padding: 12, minWidth: 0 }}><div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Élément boss</div><div className="font-heading" style={{ fontWeight: 700, color: "var(--blue)" }}>{sel.elem}</div></div>
            </div>
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
              const liste = sel.dropsComplets ?? sel.drops;
              return (<>
                <SousTitre icon="gift" apres={liste.length > 0 ? `${liste.length} objet${liste.length > 1 ? "s" : ""}` : undefined}>Drops</SousTitre>
                {liste.length > 0
                  ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{liste.map(d => <span key={d} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px 4px 6px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}><IconeObjet nom={d} />{d}</span>)}</div>
                  : <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      Personne n&apos;a encore relevé les drops de cette instance. Ce n&apos;est pas la
                      preuve que rien n&apos;y tombe : le butin ordinaire des monstres est calculé par
                      le serveur, il n&apos;existe nulle part dans les fichiers du jeu.
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
  );
}
