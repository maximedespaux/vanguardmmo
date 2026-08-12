"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { VoletSections } from "@/components/VoletSections";
import { Deroule } from "@/components/oasis/Deroule";
import { Emblemes } from "@/components/oasis/Emblemes";
import { Reserves } from "@/components/oasis/Reserves";
import { Vagues } from "@/components/oasis/Vagues";
import { bilan, frappeVague, nb, pvCourt, pvVague, type Vague } from "@/components/oasis/modele";

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
      <div id="oasis" style={{ marginTop: 26 }}>
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
    <div id="oasis" style={{ marginTop: 26 }}>
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
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.4 }}>
            La Tour Infernale vue de dessus : une arène, et rien autour.
          </div>
        </div>

        <div style={{ flex: "1 1 280px", minWidth: 0, fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55 }}>
          Elle n&apos;est pas dans la grille au-dessus, et pour une raison plus forte encore que la Tour
          Oubliée : ce n&apos;est pas un donjon, c&apos;est un <b style={{ color: "var(--text)" }}>événement</b>.
          Le mode s&apos;appelle <b style={{ color: "var(--text)" }}>Protection de l&apos;Oasis</b>, la carte
          où il se joue <b style={{ color: "var(--text)" }}>Tour Infernale</b>, et les vagues y sont
          envoyées par le serveur — le fichier de carte, lui, est vide.
          <div style={{ marginTop: 8 }}>
            Un tour complet, c&apos;est <b style={{ color: "var(--text)" }}>{nb(b.vagues)} vagues</b>,
            {" "}{nb(b.monstres)} monstres de {b.especes} espèces et <b style={{ color: "var(--text)" }}>{pvCourt(b.pv)} de
            points de vie</b> à sortir, pour {nb(b.primeSimple + b.primeSup)} emblèmes. La montée est
            brutale : la première vague demande {pvCourt(pvVague(premiere))} de PV et frappe à
            {" "}{nb(frappeVague(premiere))} par coup, la <b style={{ color: "var(--gold)" }}>{derniere.n}<sup>e</sup> et
            dernière</b> en demande {pvCourt(pvVague(derniere))} et frappe jusqu&apos;à
            {" "}<b style={{ color: "var(--red)" }}>{nb(frappeVague(derniere))}</b>.
          </div>
          {/* LA RESERVE REVIENT AU GRAND JOUR. L'ancienne page /oasis l'annoncait
              dans son sous-titre — « avec ce qui reste a verifier en jeu, dit sans
              le cacher » —, donc au-dessus de tout le reste. En devenant un bloc
              replie, le mode l'avait reléguée a deux clics : ouvrir le detail, puis
              choisir « A prendre avec des pincettes ». Or c'est la provenance des
              chiffres juste au-dessus : elle se lit avec eux, pas apres eux. */}
          <div style={{ marginTop: 8 }}>
            Deux sources, et l&apos;écart compte : le niveau, les PV et les dégâts de chaque monstre sont
            lus dans les <b style={{ color: "var(--text)" }}>fichiers du jeu</b>, mais la structure du
            tour — les {nb(b.vagues)} vagues, les quantités, les primes — vient d&apos;un
            {" "}<b style={{ color: "var(--text)" }}>relevé maison fait sur captures d&apos;écran</b> : la
            carte étant vide, rien dans le client ne la porte. Ce qu&apos;on n&apos;a pas pu vérifier est
            listé tel quel dans « À prendre avec des pincettes », ci-dessous.
          </div>
          <div style={{ marginTop: 8 }}>
            Rien à voir avec la <b style={{ color: "var(--text)" }}>Tour Oubliée</b> juste au-dessus, ni
            avec l&apos;objet du même nom : deux contenus distincts, deux cartes distinctes. Et ce
            n&apos;est pas une « tour sans fin » — le client a une phrase pour dire que la dernière vague
            est passée.
          </div>
        </div>
      </div>

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
