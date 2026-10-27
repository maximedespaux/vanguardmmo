import React from "react";
import { Icon, type IconName } from "@/components/Icon";
import { pvCourt, TOUR_OUBLIEE, PLANS } from "./donneesClient";
import { IconeElementDonjon } from "./elements";
import { LienMonstre } from "./LienMonstre";

/**
 * LA TOUR OUBLIÉE — cinq étages que le wiki ne connaissait pas.
 *
 * Elle n'est pas dans la grille des vingt-trois pour une raison de fond : ce
 * n'est pas une destination du téléporteur. Chaque étage est un MONDE À PART
 * ENTIÈRE (identifiants 21 à 25), et il n'y a aucun escalier entre eux — tous
 * les portails de sortie renvoient à Flarine. On entre par le PNJ « Gardien de
 * la Tour Oubliée », étage par étage. La ranger avec les donjons du téléporteur
 * aurait laissé croire qu'on y accède comme aux autres.
 *
 * À ne pas confondre avec la Tour Infernale, qui est la carte du mode
 * « Protection de l'Oasis » : deux contenus différents, deux cartes différentes.
 */
export function TourOubliee() {
  /* LA TAILLE DE CARTE ÉTAIT ÉCRITE CINQ FOIS, ET C'ÉTAIT CINQ FOIS LA MÊME. Les cinq
     étages font 512 × 512 : un renseignement identique sur toutes les fiches n'en est
     pas un, et il coûtait dix mots par tuile. On le dit UNE fois, en tête, et
     seulement s'il est vrai — si un étage sortait un jour à une autre taille, la puce
     disparaît et la valeur remonte dans les tuiles. */
  const tailles = new Set(TOUR_OUBLIEE.map((e) => `${e.unites[0]} × ${e.unites[1]}`));
  const memeTaille = tailles.size === 1 ? [...tailles][0] : null;
  /* MÊME GARDE POUR LA SORTIE, et elle manquait. « Toute sortie renvoie à Flarine »
     était écrit sur chaque tuile SOUS CONDITION (`e.sortie && …`) ; remontée en puce
     de tête, la phrase a perdu sa condition et s'est mise à parler des cinq étages
     sans les avoir regardés. Elle est vraie aujourd'hui — les cinq portent le même
     portail — mais un étage ajouté sans sortie relevée l'aurait rendue fausse en
     silence, et c'est la puce la plus visible du bloc. Le mot « Flarine » ne se
     déduit pas du relevé (qui ne porte qu'un portail) ; l'universalité, elle, se
     vérifie, et c'est elle que « toute » affirme. */
  const touteSortie = TOUR_OUBLIEE.every((e) => e.sortie);
  return (
    /* `scrollMarginTop` : le schéma d'entrée en tête de page renvoie ici, et la barre
       de navigation est fixe. Même valeur que les autres cibles. */
    <div id="tour-oubliee" style={{ marginTop: 26, scrollMarginTop: 88 }}>
      {/* Un h2, comme le bloc Protection de l'Oasis juste en dessous : les deux
          sont les grandes parties de la page, sous le h1 du wiki. `fontWeight: 400`
          est explicite parce qu'un h2 arrive gras par defaut. */}
      <h2 className="font-heading" style={{ fontSize: 12.5, fontWeight: 400, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--gn-accent)", margin: "4px 0 10px", display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        La Tour Oubliée
        <span style={{ fontSize: 12, letterSpacing: 0, textTransform: "none", color: "var(--text-muted)", fontWeight: 400 }}>
          {TOUR_OUBLIEE.length} étages, {TOUR_OUBLIEE.length} cartes séparées
        </span>
      </h2>

      {/* ┌────── CE PARAGRAPHE DE QUATRE-VINGT-QUINZE MOTS EST DEVENU TROIS PUCES
                  ET UN SCHÉMA ──────┐
          Il disait cinq choses. Trois sont des règles d'accès qui tiennent en un
          groupe de mots chacune : on entre par un PNJ, rien ne relie les étages,
          une seule espèce par étage. Elles deviennent des puces.
          La quatrième — « ne prends pas le numéro d'étage pour une difficulté » —
          était la plus utile et la plus mal servie par de la prose : deux barres à
          la même échelle la démontrent sans qu'on l'affirme. D'où `EchelleEtages`.
          La cinquième, la confusion avec la Tour Infernale, est portée par le titre
          du bloc voisin, qui s'appelle « Protection de l'Oasis » et pas « Tour » :
          la répéter ici, c'était dire deux fois la même chose sur le même écran. */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
        {/* LA PUCE D'ENTRÉE A DÉMÉNAGÉ DANS LE SCHÉMA DE TÊTE DE PAGE, et le nom complet
            du PNJ est parti avec elle — « Gardien de la Tour Oubliée », en entier, parce
            que c'est le mot qu'on tape dans une recherche et que trente-quatre libellés
            du jeu portent « Gardien ». Le garder ici EN PLUS aurait écrit deux fois la
            même chose sur le même écran. */}
        {(
          [
            /* « Aucun escalier » tient tout seul : c'est un fait de structure, pas un
               relevé de sortie. La destination ne s'y ajoute que si les cinq étages en
               portent une — cf. `touteSortie`. Commentaire SANS accolades : on est dans
               un tableau JS, pas dans des enfants JSX. */
            { ic: "path", texte: <>Aucun escalier{touteSortie ? <> · toute sortie renvoie à Flarine</> : null}</> },
            { ic: "skull", texte: <>Une seule espèce par étage</> },
            ...(memeTaille ? [{ ic: "map", texte: <>{TOUR_OUBLIEE.length} cartes de {memeTaille}</> }] : []),
          ] as { ic: IconName; texte: React.ReactNode }[]
        ).map(({ ic, texte }, k) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-muted)", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 10px" }}>
            <Icon name={ic} size={11} style={{ color: "var(--gn-accent)", flexShrink: 0 }} />{texte}
          </span>
        ))}
      </div>

      <EchelleEtages />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 12 }}>
        {TOUR_OUBLIEE.map((e) => (
          <div key={e.monde} className="fx-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
            {/* La carte de l'étage, en tête de fiche. Elle porte son propre titre
                imprimé (« Tour Oubliée B1 ») : on ne l'annonce donc pas une
                deuxième fois au-dessus, et son `alt` reste vide puisque le nom de
                l'étage est écrit juste en dessous en texte.
                `aspectRatio` plutôt qu'une hauteur fixe : les cinq cartes sont des
                4/3 du client, et une hauteur fixe les aurait déformées. */}
            {PLANS[e.carte] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={PLANS[e.carte].src}
                alt=""
                style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)", marginBottom: 12, display: "block" }}
              />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Icon name="tower" framed frameSize={36} tone="purple" />
              <div style={{ minWidth: 0 }}>
                <div className="font-heading" style={{ fontWeight: 600, fontSize: 15 }}>Étage {e.etage}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{e.nom}</div>
              </div>
            </div>
            {/* QUATRE MOTS D'ÉTIQUETTE SONT DEVENUS UN CRÂNE. « Le boss de l'étage »
                était écrit sur les cinq tuiles au-dessus d'un seul nom ; le
                pictogramme le dit, et le `title` garde la phrase. Le nom, lui, mène
                désormais à sa fiche : les monstres appartiennent à /monstres. */}
            <div title="Le boss de l'étage" className="font-heading" style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="skull" size={13} style={{ color: "var(--red)", flexShrink: 0 }} />
              <LienMonstre nom={e.boss} niv={e.niv} pv={e.pv} />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
              <span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}>niv. {e.niv}</span>
              <span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px", color: "var(--gn-accent)" }}>
                <Icon name="heart" size={11} style={{ marginRight: 3 }} />{pvCourt(e.pv)} PV
              </span>
              {/* LE PICTOGRAMME MAISON A CÉDÉ LA PLACE AU DESSIN DU JEU. Les cinq
                  éléments ont leur image dans le client (`/jeu/mecaniques/element-*`),
                  elle sert déjà sur /monstres et sur les tuiles de donjon : le même
                  élément a la même image partout, ce qui est tout l'intérêt. Le mot
                  reste à côté — c'est un étage unique, il y a la place, et l'image
                  seule demanderait de connaître le dessin par cœur. */}
              {e.elem && (
                <span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px", color: "var(--blue)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <IconeElementDonjon elem={e.elem} taille={12} />{e.elem}
                </span>
              )}
              {e.faible ? (
                <span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px", color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="target" size={11} />
                  <IconeElementDonjon elem={e.faible} taille={12} />
                  faible
                </span>
              ) : (
                /* ┌──── L'ABSENCE DE PASTILLE SE LISAIT COMME UNE ABSENCE DE RELEVÉ ────┐
                      Quatre des cinq capitaines n'ont AUCUNE faiblesse : leurs cinq
                      colonnes de résistance sont à zéro dans le client — vérifié
                      colonne par colonne, ce n'est pas un trou de fouille. La tuile
                      ne montrait alors rien du tout, et un joueur qui a lu « les
                      monstres sont surtout de terre, prends du vent » repart d'ici
                      en croyant que l'information manque, ou qu'il faut deviner.
                      Le wiki des monstres écrit « indifférent » dans exactement ce
                      cas ; la Tour dit maintenant la même chose.
                      └────────────────────────────────────────────────────────────┘ */
                <span title="Ses cinq colonnes de résistance sont à zéro : aucun élément ne lui fait plus de mal qu'un autre."
                  style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="info" size={11} />
                  l&apos;élément n&apos;y change rien
                </span>
              )}
            </div>
            {/* ┌──── SEIZE MOTS PAR TUILE, DONT ONZE ÉCRITS CINQ FOIS ────┐
                La ligne disait « 19 emplacements sur une carte de 512 × 512 · la
                sortie te renvoie à Flarine ». Or les cinq cartes font toutes
                512 × 512 et les cinq sorties renvoient toutes à Flarine : les deux
                sont donc annoncés UNE fois, en puce de tête de bloc, où ils ne
                mentent pas plus et ne se répètent plus. Reste le seul nombre qui
                varie d'un étage à l'autre.
                La coordonnée du portail était ici avant : `coord()` a été supprimée
                exprès — le jeu n'affiche pas sa position, et on ne se rend pas à un
                couple de nombres. Ce qui sert, c'est la destination.
                └─────────────────────────────────────────────────────────┘ */}
            <div title="Les points de réapparition posés sur la carte de l'étage"
              style={{ marginTop: 9, fontSize: 11.5, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              <Icon name="grid" size={11} style={{ marginRight: 4 }} />{e.points} emplacements
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * L'ÉCHELLE DES ÉTAGES — la seule chose qu'il faut savoir avant de monter.
 *
 * Le numéro d'étage n'est PAS une difficulté, et c'est le genre d'erreur qui coûte
 * une soirée : on prend le B5 en dernier en croyant finir par le plus dur. Deux
 * barres à la même échelle le montrent sans qu'on l'écrive — les PV du boss d'un
 * côté, son niveau de l'autre.
 *
 * TOUT SE CALCULE SUR LA TABLE, phrase comprise. L'ancien texte nommait « le 5ᵉ »
 * et « le 3ᵉ » en dur ; ici le plus dur et le plus facile se cherchent dans les
 * données, et la ligne ne s'affiche QUE si l'ordre est réellement rompu. Le jour
 * où les cinq étages monteraient dans l'ordre, elle disparaît au lieu de mentir.
 *
 * Une seule teinte : c'est la LONGUEUR qui compare, jamais la couleur — deux tons
 * ne se distinguent pas pour un daltonien protan.
 */
function EchelleEtages() {
  const max = Math.max(...TOUR_OUBLIEE.map((e) => e.pv));
  const dur = TOUR_OUBLIEE.reduce((a, e) => (e.pv > a.pv ? e : a));
  const doux = TOUR_OUBLIEE.reduce((a, e) => (e.pv < a.pv ? e : a));
  /** L'ordre est-il rompu ? Vrai dès que le dernier étage n'est pas le plus dur. */
  const rompu = dur.etage !== TOUR_OUBLIEE.length;
  return (
    <figure style={{ margin: "0 0 12px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "13px 15px" }}>
      <figcaption style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--text-muted)", marginBottom: 9 }}>
        Ce que pèse chaque étage
      </figcaption>
      <div style={{ display: "grid", gap: 5 }}>
        {TOUR_OUBLIEE.map((e) => (
          <div key={e.monde} className="to-ligne">
            <span className="to-etage">B{e.etage}</span>
            <span className="to-piste"
              role="img" aria-label={`Étage ${e.etage} : ${pvCourt(e.pv)} points de vie, niveau ${e.niv}`}>
              <span style={{ display: "block", height: "100%", width: `${Math.max(2, (e.pv / max) * 100)}%`, borderRadius: 3, background: "var(--gn-jauge)" }} />
            </span>
            <span className="to-valeur">{pvCourt(e.pv)} PV · niv. {e.niv}</span>
          </div>
        ))}
      </div>
      {/* LA MISE EN PAGE DES BARRES, ET LE REPLI QUI COMPTE.
          118 px de colonne de valeur et non 96 : à 96, « 300 000 PV · niv. 121 » passait
          sur deux lignes et les cinq barres perdaient leur alignement — vu à l'écran.
          MAIS à 375 px de large, ces 118 px plus les 30 du numéro d'étage ne laissaient
          que 85 px de piste — mesuré dans le navigateur. Sur 85 px, l'écart entre
          300 000 et 2,5 M ne fait plus que dix pixels, et le schéma ne démontre plus
          rien, ce qui est la seule chose qu'on lui demande. Sous 560 px la valeur passe
          donc SOUS la barre, qui reprend toute la largeur. */}
      <style>{`
        .to-ligne{display:grid;grid-template-columns:30px minmax(0,1fr) 118px;align-items:center;
          gap:9px;font-size:11.5px}
        .to-etage{color:var(--text-muted)}
        .to-piste{display:block;height:9px;border-radius:3px;
          background:color-mix(in srgb, var(--border) 70%, transparent)}
        .to-valeur{text-align:right;white-space:nowrap;color:var(--text-muted);
          font-variant-numeric:tabular-nums}
        @media(max-width:560px){
          .to-ligne{grid-template-columns:30px minmax(0,1fr);gap:4px 9px;margin-bottom:4px}
          .to-piste{grid-column:1 / -1;order:2}
          .to-valeur{order:1;text-align:left}
        }
      `}</style>
      {rompu && (
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 9, lineHeight: 1.5 }}>
          <Icon name="info" size={12} style={{ marginRight: 5, color: "var(--gold)" }} />
          Le numéro d&apos;étage n&apos;est pas une difficulté : le plus dur est le
          {" "}<b style={{ color: "var(--text)" }}>B{dur.etage}</b>, le plus facile le
          {" "}<b style={{ color: "var(--text)" }}>B{doux.etage}</b>.
        </div>
      )}
    </figure>
  );
}
