"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { VoletSections } from "@/components/VoletSections";
import { Deroule } from "@/components/oasis/Deroule";
import { Emblemes } from "@/components/oasis/Emblemes";
import { Reserves } from "@/components/oasis/Reserves";
import { Vagues } from "@/components/oasis/Vagues";
import { bilan, frappeVague, nb, pvCourt, pvVague, type Bilan, type Vague } from "@/components/oasis/modele";

/**
 * LA PROTECTION DE L'OASIS — le troisième bloc de « dans quoi on entre ».
 *
 * Il avait sa page, /oasis. Elle disait la même chose que celle-ci, à un autre
 * endroit : voilà une carte, voilà ce qui t'y attend, voilà ce que ça rapporte.
 * Deux adresses pour une seule question, c'est une adresse de trop — /oasis
 * redirige maintenant ici, avec l'ancre #oasis pour tomber directement dessus.
 *
 * Il est APRÈS la grille, comme la Tour Oubliée et pour une raison plus forte
 * encore : ce n'est pas une destination du téléporteur, c'est un ÉVÉNEMENT, sur
 * une arène qui n'appartient à personne d'autre. Le mêler aux vingt-trois
 * laisserait croire qu'on y entre pareil.
 *
 * TROIS NOMS À NE PAS MÉLANGER, et c'est la confusion la plus facile à faire :
 *   · « Protection de l'Oasis » est le MODE (16 chaînes IDS_OASIS_PROTECTION_*) ;
 *   · « Tour Infernale » est la CARTE sur laquelle il se joue (monde nº 8) ;
 *   · « Tour Oubliée » est le bloc juste au-dessus — cinq étages de donjon, à
 *     entrée par PNJ. Rien à voir.
 * Et « Tour sans fin », le nom que notre relevé lui donnait, n'existe nulle part
 * dans le jeu : le client a une chaîne pour annoncer la DERNIÈRE vague.
 *
 * Les quatre sections du rail sont celles de l'ancienne page, entières, aux mêmes
 * clefs (`marche`, `vagues`, `emblemes`, `reserves`) et sous les mêmes titres. Le
 * rail est replié par défaut : il pèse 52 lignes de tableau, et la page porte
 * déjà vingt-huit cartes au-dessus. Un clic l'ouvre, et l'essentiel — combien de
 * vagues, ce que pèse la dernière — se lit sans ouvrir quoi que ce soit.
 */
/**
 * LA MONTÉE, EN DEUX BARRES — première vague contre dernière.
 *
 * Le texte disait « la montée est brutale » puis alignait quatre nombres. Une
 * affirmation qu'il faut vérifier de tête n'est pas un renseignement : deux paires
 * de barres à la MÊME échelle rendent le rapport visible, et le mot « brutale »
 * devient inutile — c'est le dessin qui le dit.
 *
 * Deux échelles séparées, une par grandeur : les PV et les dégâts par coup ne se
 * comparent pas entre eux, seulement chacun à son propre maximum. Les mettre sur
 * la même règle aurait écrasé la ligne des dégâts contre zéro.
 *
 * Une seule teinte par ligne, et le rapport est écrit au bout : la longueur porte
 * la comparaison, la couleur ne porte rien (elle ne se lit pas pour un daltonien).
 *
 * ┌──── LA TROISIÈME BARRE, ET POURQUOI ELLE N'EST PAS OPTIONNELLE ────┐
 * │ Ce schéma s'appelait « Vague 1 contre vague 52 » et s'arrêtait là.  │
 * │ Le problème n'est pas ce qu'il disait, c'est ce qu'un DESSIN dit en │
 * │ plus des mots : une barre rouge qui remplit toute la piste se lit   │
 * │ « voilà le maximum ». Or la plus forte frappe du tour n'est PAS sur │
 * │ la dernière vague — `bilan()` la cherche depuis toujours, et son    │
 * │ propre commentaire prévient que « la plus grosse frappe n'est pas   │
 * │ forcément sur la dernière vague ». Relevé sur les données : la      │
 * │ vague 47 frappe à 990 101, soit deux fois et demie la 52ᵉ.          │
 * │ Quelqu'un qui prépare un run sur ce dessin se protège contre        │
 * │ 390 001 et se fait sortir par 990 101 : c'est une erreur coûteuse,  │
 * │ donc elle relève de la mise en garde qui reste.                     │
 * │ La barre ne s'affiche QUE si le pire n'est pas la dernière vague —  │
 * │ même parti pris que l'échelle des étages de la Tour Oubliée : le    │
 * │ jour où le tour monterait dans l'ordre, elle disparaît au lieu de   │
 * │ mentir. Et le titre parle de « la plus dure », pas de « la 52ᵉ ».   │
 * └────────────────────────────────────────────────────────────────────┘
 */
function MonteeDesVagues({ premiere, derniere, pireVague, pireFrappe }: {
  premiere: Vague; derniere: Vague;
  /** La vague qui frappe le plus fort du tour, et sa frappe — venues de `bilan()`. */
  pireVague: number; pireFrappe: number;
}) {
  /** Le pire n'est-il pas la dernière ? Alors le dessin doit le porter. */
  const ailleurs = pireVague !== derniere.n && pireFrappe > frappeVague(derniere);
  const lignes = [
    { quoi: "PV à sortir", a: pvVague(premiere), b: pvVague(derniere), fmt: pvCourt, pire: null as number | null },
    { quoi: "Dégâts par coup", a: frappeVague(premiere), b: frappeVague(derniere), fmt: nb, pire: ailleurs ? pireFrappe : null },
  ];
  return (
    <figure style={{ margin: 0, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 13px" }}>
      <figcaption style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--text-muted)", marginBottom: 8 }}>
        Vague 1, vague {derniere.n}{ailleurs ? ", et la plus dure" : ""}
      </figcaption>
      <div style={{ display: "grid", gap: 9 }}>
        {lignes.map((l) => {
          /* Le maximum de l'échelle inclut la pire vague, sinon sa barre déborderait
             de la piste — et surtout la 52ᵉ garderait sa pleine largeur trompeuse. */
          const max = Math.max(l.a, l.b, l.pire ?? 0) || 1;
          return (
            <div key={l.quoi}>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginBottom: 3 }}>{l.quoi}</div>
              {([
                ["1", l.a, "var(--text-muted)"],
                [String(derniere.n), l.b, "var(--red)"],
                ...(l.pire != null ? [[String(pireVague), l.pire, "var(--red)"] as const] : []),
              ] as const).map(([n, v, ton]) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11 }}>
                  <span style={{ width: 18, flexShrink: 0, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{n}</span>
                  <span style={{ flex: 1, minWidth: 0, height: 8, borderRadius: 3, background: "color-mix(in srgb, var(--border) 70%, transparent)" }}
                    /* Pas de `.toLowerCase()` : il transformait « PV à sortir » en
                       « pv à sortir », et un lecteur d'écran épelle alors « p v ». */
                    role="img" aria-label={`Vague ${n} : ${l.fmt(v)} — ${l.quoi}`}>
                    <span style={{ display: "block", height: "100%", width: `${Math.max(1.5, (v / max) * 100)}%`, borderRadius: 3, background: ton }} />
                  </span>
                  <span style={{ width: 62, textAlign: "right", flexShrink: 0, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{l.fmt(v)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {/* LA PHRASE QUI CHANGE LE GESTE, et elle seule : contre quoi se protéger.
          Elle se calcule, elle ne s'écrit pas — « vague 47 » et « 990 101 » viennent
          de `bilan()`. Elle disparaît d'elle-même si le pire redevient la dernière. */}
      {ailleurs && (
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 9, lineHeight: 1.5 }}>
          <Icon name="alert" size={12} style={{ marginRight: 5, color: "var(--red)" }} />
          La dernière vague n&apos;est pas celle qui frappe le plus fort : c&apos;est la
          {" "}<b style={{ color: "var(--text)" }}>{pireVague}<sup>e</sup></b>, à
          {" "}<b style={{ color: "var(--red)" }}>{nb(pireFrappe)}</b> par coup.
        </div>
      )}
    </figure>
  );
}

/**
 * CE QUE LE WIKI OFFICIEL DIT DE LA PROTECTION, ET QUE LE CLIENT NE DIT NULLE PART.
 *
 * ┌──────── LE TROU QU'ON VIENT DE TROUVER ────────┐
 * │ Ce bloc savait tout du TOUR — cinquante-deux    │
 * │ vagues, ce qu'elles pèsent, ce qu'elles paient, │
 * │ jusqu'à la vague qui frappe le plus fort — et   │
 * │ rien de ce qu'il faut savoir AVANT de lancer :  │
 * │ où est l'entrée, chez qui, et avec quoi. Les    │
 * │ deux pages du wiki officiel le disent, et rien  │
 * │ dans le client ne le porte : la carte du mode   │
 * │ est une arène vide.                             │
 * └─────────────────────────────────────────────────┘
 *
 * CE SONT DES CITATIONS, PAS DES MESURES, et c'est pour ça qu'elles vivent dans
 * une table nommée avec leur source au lieu d'être noyées dans une phrase. La
 * règle de la maison veut que les chiffres se calculent ; ceux-là ne se calculent
 * pas, ils se CITENT — alors ils portent leur provenance à l'écran, et l'écran ne
 * les affiche que si le relevé les rend possibles : un palier annoncé à la vague
 * 36 disparaît le jour où le tour n'en compte plus que trente.
 *
 * CE QUI N'EST PAS REPRIS, ET POURQUOI : la page `fonctionnalites/loasis` du même
 * wiki annonce « 25 étages » et « 100 emblèmes ». C'est l'ancienne version du mode
 * — la page `activites/pve/…` du même wiki dit elle-même que la deuxième extension
 * a poussé jusqu'à l'étage 52, ce que notre relevé confirme. Une source qui se
 * contredit ne fait pas disparaître le fait : elle désigne laquelle de ses deux
 * pages est périmée.
 */
export const AVANT_D_ENTRER = {
  ou: "à l'Oasis, tout en haut des marches",
  pnj: "Plank",
  /** Les points de vie qu'il faut, d'après le wiki, pour tenir jusqu'au bout. */
  pvDuJoueur: 200000,
  /** Les crans de difficulté, à la vague près, avec ce qu'ils réclament. */
  paliers: [
    { vague: 26, quoi: "il faut un gros DPS en dryades" },
    { vague: 36, quoi: "niveau 180 et l'équipement de la deuxième extension" },
  ],
  source: "wiki officiel Airborn — [PvE] Protection de l'Oasis (Solo) et L'Oasis",
};

/**
 * AVANT D'ENTRER — l'entrée, le PNJ, et de quoi il faut être fait.
 *
 * ┌──── LA CONFRONTATION QUI SORT DE CE BLOC, ET ELLE VAUT LE DÉTOUR ────┐
 * │ Le wiki annonce qu'il faut « environ 200k HP pour tout tank jusqu'à  │
 * │ la fin ». Notre relevé, lui, mesure une frappe brute de 990 101 à la │
 * │ vague 47. Les deux ne peuvent pas être vrais en même temps SI les    │
 * │ dégâts bruts sont ceux qui tombent — un tank à 200 000 PV part en un │
 * │ coup. Ils le sont si les dégâts sont corrigés en jeu, ce qui est     │
 * │ exactement l'hypothèse que la section « À prendre avec des           │
 * │ pincettes » défend depuis le début à propos du multiplicateur.       │
 * │ Deux sources qui ne se sont pas parlé et qui pointent au même        │
 * │ endroit, ça ne prouve rien, mais ça se dit : le lecteur qui voit     │
 * │ 990 101 dans le tableau doit savoir qu'un joueur, lui, a fini le     │
 * │ tour avec deux cent mille points de vie.                             │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Le rapport entre les deux nombres est CALCULÉ, pas écrit : il suit le relevé.
 */
function AvantDEntrer({ b }: { b: Bilan }) {
  /* Un palier qui tombe au-delà du dernier étage relevé ne s'affiche pas : il
     parlerait d'une vague qui n'existe pas dans nos données. */
  const paliers = AVANT_D_ENTRER.paliers.filter((p) => p.vague <= b.vagues);
  const facteur = Math.round(b.pireFrappe / AVANT_D_ENTRER.pvDuJoueur);
  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, marginBottom: 12, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-muted)", display: "grid", gap: 7 }}>
      <div>
        <Icon name="map-pin" size={13} style={{ marginRight: 6, color: "var(--orange)" }} />
        L&apos;entrée est <b style={{ color: "var(--text)" }}>{AVANT_D_ENTRER.ou}</b>,
        chez <b style={{ color: "var(--text)" }}>{AVANT_D_ENTRER.pnj}</b> — c&apos;est lui qui lance
        la session et qui reprend les emblèmes.
      </div>
      <div>
        <Icon name="heart" size={13} style={{ marginRight: 6, color: "var(--red)" }} />
        Il faut environ <b style={{ color: "var(--text)", ...NUM2 }}>{nb(AVANT_D_ENTRER.pvDuJoueur)} PV</b> pour
        tenir jusqu&apos;au bout.
        {paliers.length > 0 && (
          <> La difficulté prend un cran{paliers.length > 1 ? " puis un autre" : ""} à la
          {" "}{paliers.map((p, i) => (
            <span key={p.vague}>
              {i > 0 ? " et à la " : " "}<b style={{ color: "var(--text)" }}>{p.vague}<sup>e</sup></b> ({p.quoi})
            </span>
          ))}.</>
        )}
      </div>
      {/* LA CONFRONTATION, ET ELLE NE TRANCHE PAS : elle met les deux nombres côte
          à côte et renvoie à la réserve qui en discute. */}
      <div>
        <Icon name="alert" size={13} style={{ marginRight: 6, color: "var(--gold)" }} />
        Ce conseil et le tableau ne se rejoignent qu&apos;à une condition : la plus forte frappe
        relevée est de <b style={{ color: "var(--red)", ...NUM2 }}>{nb(b.pireFrappe)}</b> par coup
        (vague {b.pireVague}), soit <b style={{ color: "var(--text)" }}>{facteur} fois</b> ces points de
        vie. Les deux ne tiennent ensemble que si les dégâts sont corrigés en combat — c&apos;est
        l&apos;hypothèse discutée dans «&nbsp;À prendre avec des pincettes&nbsp;».
      </div>
      <div style={{ fontSize: 11 }}>{AVANT_D_ENTRER.source}</div>
    </div>
  );
}

const NUM2 = { fontVariantNumeric: "tabular-nums" } as const;

export function BlocOasis({ vagues, ouvrir }: { vagues: Vague[]; ouvrir?: boolean }) {
  const [ouvert, setOuvert] = useState(false);

  /**
   * Deux façons d'arriver ici en voulant précisément ça, et les deux ouvrent le
   * rail : la redirection de l'ancienne adresse (/oasis → /donjons#oasis), et une
   * recherche qui ne peut désigner que ce bloc (« oasis », « infernale »).
   * L'ancre fait aussi défiler : atterrir en haut d'une page de donjons quand on
   * demandait l'Oasis se lit comme un lien cassé.
   */
  useEffect(() => {
    if (window.location.hash !== "#oasis") return;
    setOuvert(true);
    document.getElementById("oasis")?.scrollIntoView({ block: "start" });
  }, []);
  useEffect(() => {
    if (ouvrir) setOuvert(true);
  }, [ouvrir]);

  /**
   * Un h2, et pas un div : en absorbant /oasis, le mode a perdu son h1 — il n'y a
   * qu'un titre de niveau 1 par page, et c'est celui du wiki. Le rendre titre de
   * niveau 2 lui rend son rang dans le plan de la page, a cote de la Tour Oubliee
   * qui est son egale. `fontWeight: 400` est explicite parce qu'un h2 arrive gras
   * par defaut : sans lui, changer la balise changeait le dessin.
   */
  const titre = (
    <h2 className="font-heading" style={{ fontSize: 12.5, fontWeight: 400, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--orange)", margin: "4px 0 10px", display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
      Protection de l&apos;Oasis
      <span style={{ fontSize: 12, letterSpacing: 0, textTransform: "none", color: "var(--text-muted)", fontWeight: 400 }}>
        {vagues.length ? `${vagues.length} vagues, une seule arène` : "relevé indisponible"}
      </span>
    </h2>
  );

  /**
   * Sans le relevé, le bloc se réduit à ce qu'on sait quand même — et surtout, il
   * ne fait pas tomber les vingt-trois donjons avec lui. `bilan()` part du premier
   * élément du tableau : sur une liste vide, il n'a rien à réduire.
   */
  if (!vagues.length) {
    return (
      <div id="oasis" style={{ marginTop: 26, scrollMarginTop: 88 }}>
        {titre}
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55 }}>
          {/* Pas de « 52 » dans cette phrase : sur cette branche, on n'a rien lu — l'annoncer
              serait le seul chiffre de la page à ne venir d'aucune donnee. */}
          Le relevé des vagues n&apos;a pas pu être lu. Ce qu&apos;on peut dire sans lui : le mode
          s&apos;appelle <b style={{ color: "var(--text)" }}>Protection de l&apos;Oasis</b>, il se joue sur
          la carte <b style={{ color: "var(--text)" }}>Tour Infernale</b> — à ne pas confondre avec la
          Tour Oubliée ci-dessus — et il paie en <b style={{ color: "var(--text)" }}>emblèmes de
          protection</b>, la monnaie des hauts paliers de prestige.
        </div>
      </div>
    );
  }

  const b = bilan(vagues);
  const premiere = vagues[0];
  const derniere = vagues[vagues.length - 1];

  return (
    /* `scrollMarginTop` : deux chemins arrivent sur cette ancre — la redirection de
       /oasis et le schéma d'entrée en tête de page — et la barre de navigation est
       fixe. Sans la marge, le titre du bloc atterrit dessous. */
    <div id="oasis" style={{ marginTop: 26, scrollMarginTop: 88 }}>
      {titre}

      <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, marginBottom: 12, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* L'arène vue de dessus. C'est la vue aérienne du monde nº 8, le seul
            fichier de carte du mode — le tableau « L'arène » de la section
            « Comment ça se passe » le nomme (WdTowermap), c'est la même carte.
            `alt` vide : elle n'apprend rien qu'un lecteur d'écran puisse lire, et
            sa légende est écrite juste en dessous. */}
        <div style={{ flex: "0 0 168px", maxWidth: 168 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/jeu/aerien/wdtowermap.webp"
            alt=""
            style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)", display: "block" }}
          />
          {/* La légende nommait la carte, que la ligne juste à droite nomme déjà.
              Reste ce que l'image ne montre pas d'elle-même : qu'il n'y a RIEN
              autour, et que c'est le fait — la carte est vide, tout vient du serveur. */}
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.4 }}>
            Une arène, et rien autour.
          </div>
        </div>

        {/* ┌───── DEUX CENTS MOTS DE PROSE SONT DEVENUS QUATRE CHIFFRES ET DEUX BARRES ─────┐
            L'ancien bloc écrivait en phrases ce qui se lit mieux posé : le bilan d'un tour
            (vagues, monstres, espèces, PV, emblèmes) était une phrase de trente mots, il
            devient quatre tuiles. « La montée est brutale » était une affirmation suivie de
            quatre nombres qu'il fallait comparer de tête ; deux barres à la même échelle
            font la comparaison à notre place, et le mot « brutale » n'a plus à être écrit.
            CE QUI EST GARDÉ EN MOTS, et seulement ça : les DEUX NOMS (le mode s'appelle
            « Protection de l'Oasis », la carte « Tour Infernale » — les confondre fait
            chercher au mauvais endroit), et la PROVENANCE en une ligne, parce que la
            structure du tour vient de captures et pas du client.
            CE QUI EST PARTI : « ce n'est pas un donjon, c'est un événement » (le bloc est
            séparé et titré, il le dit par sa place), la comparaison avec la Tour Oubliée
            (déjà dite au-dessus), et « ce n'est pas une tour sans fin » — de la
            comptabilité du site, qui corrigeait notre propre ancien libellé. */}
        <div style={{ flex: "1 1 280px", minWidth: 0, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Le mode s&apos;appelle <b style={{ color: "var(--text)" }}>Protection de l&apos;Oasis</b>,
            la carte <b style={{ color: "var(--text)" }}>Tour Infernale</b>.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(96px,1fr))", gap: 8 }}>
            {([
              [nb(b.vagues), "vagues", "var(--text)"],
              [`${nb(b.monstres)}`, `monstres · ${b.especes} espèces`, "var(--text)"],
              [pvCourt(b.pv), "PV à sortir", "var(--orange)"],
              [nb(b.primeSimple + b.primeSup), "emblèmes", "var(--gold)"],
            ] as const).map(([v, quoi, ton]) => (
              <div key={quoi} style={{ minWidth: 0 }}>
                <div className="font-heading" style={{ fontSize: 17, fontWeight: 700, color: ton, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.3 }}>{quoi}</div>
              </div>
            ))}
          </div>

          <MonteeDesVagues premiere={premiere} derniere={derniere}
            pireVague={b.pireVague} pireFrappe={b.pireFrappe} />

          {/* LA PROVENANCE RESTE AU GRAND JOUR, en une ligne. Elle n'est pas décorative :
              les PV et les dégâts viennent des fichiers, la STRUCTURE du tour vient de
              captures d'écran — la carte du mode est vide, rien dans le client ne la
              porte. Qui prépare un run sur ces nombres doit savoir lesquels sont relevés
              à la main. Le détail est dans « À prendre avec des pincettes », ci-dessous. */}
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
            <Icon name="info" size={12} style={{ marginRight: 5, color: "var(--gold)" }} />
            Monstres lus dans les fichiers ; la structure du tour vient de captures d&apos;écran.
          </div>
        </div>
      </div>

      {/* CE QU'IL FAUT SAVOIR AVANT DE LANCER, et il vient APRÈS le bilan pour une
          raison : on décide d'y aller en voyant ce que ça pèse et ce que ça paie,
          puis on regarde ce qu'il faut pour y survivre. L'inverse ferait fuir avant
          d'avoir montré l'intérêt. */}
      <AvantDEntrer b={b} />

      {/* Le contrôle copie la forme du bouton « Fermer » des fiches de donjon —
          même famille de page, même bouton pleine largeur. Il annonce ce qu'il
          ouvre AVEC ses comptes : « ouvrir le détail » tout seul ne dit pas s'il
          y a trois lignes ou cinquante-deux derrière. */}
      <button
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className="font-heading"
        style={{ width: "100%", padding: 10, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13,
          background: ouvert ? "rgba(255,140,26,.09)" : "var(--bg-3)",
          border: `1px solid ${ouvert ? "var(--orange)" : "var(--border)"}`,
          color: ouvert ? "var(--orange)" : "var(--text)" }}
      >
        <Icon name={ouvert ? "chevron-up" : "chevron-down"} size={14} />
        {ouvert
          ? "Replier la Protection de l'Oasis"
          : `Le détail : le déroulé, les ${b.vagues} vagues, les emblèmes, les réserves`}
      </button>

      {/* Les quatre sections de l'ancienne page, entières et aux mêmes clefs.
          Le rail est TOUJOURS MONTÉ, seulement caché quand le bloc est replié :
          ses quatre entrées et leurs comptes restent donc dans le HTML rendu, ce
          qui était l'apport de /oasis à un moteur de recherche. Ce qui n'y a
          JAMAIS été, ni ici ni sur /oasis, c'est le contenu des panneaux : le
          rail n'affiche que la section active. Le tableau des 52 vagues, lui,
          voyage dans la charge de la page — vérifié en lisant le HTML servi.
          `hidden` ET `display:none` : le premier retire le bloc de l'arbre
          d'accessibilité, le second ne dépend pas d'une feuille de style qui
          aurait redéfini les `div`. */}
      <div hidden={!ouvert} style={{ display: ouvert ? "block" : "none", marginTop: 12 }}>
        <VoletSections
          defaut="marche"
          sections={[
            { clef: "marche", titre: "Comment ça se passe", sous: "Le déroulé, lu dans le client", icon: "clock", compte: null, contenu: <Deroule b={b} /> },
            { clef: "vagues", titre: "Les vagues, une par une", sous: "Ce qui arrive et ce que ça encaisse", icon: "layers", compte: b.vagues, contenu: <Vagues vagues={vagues} b={b} /> },
            { clef: "emblemes", titre: "Ce que ça te rapporte", sous: "Les emblèmes et ce qu'ils achètent", icon: "medal", compte: b.primeSimple + b.primeSup, contenu: <Emblemes b={b} /> },
            { clef: "reserves", titre: "À prendre avec des pincettes", sous: "Ce qu'on ne sait pas encore", icon: "alert", compte: 4, contenu: <Reserves vagues={vagues} b={b} /> },
          ]}
        />
      </div>
    </div>
  );
}
