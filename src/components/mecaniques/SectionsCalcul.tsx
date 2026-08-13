import { Bulle, Invisible } from "@/components/Bulle";
import { Feuille, PanneauCaracteristiques } from "@/components/statistiques/Feuille";
import { PORTEUR_EXEMPLE, planche } from "@/components/statistiques/donnees";
import { Bareme, Point } from "./Blocs";

/**
 * LE VOLET « LE CALCUL, TERME PAR TERME » — la preuve arithmétique de la planche.
 *
 * Demande de Maxime : « pour mieux réaliser les statistiques […] pour voir le rendu
 * dégâts etc… comme le Flyffulator », et la contrainte qui l'accompagne : le calcul
 * « s'affiche avec sa source, sans être donné pour exact ».
 *
 * ┌──────── POURQUOI CE VOLET EST ICI ET PAS DANS LE BUILDER ────────┐
 * │ Le builder RECALCULE — on y pose une pièce, le panneau bouge.      │
 * │ C'est son métier, et le panneau détaillé du builder est en JS       │
 * │ vanilla dans public/airbuilder/airbuilder.js.                       │
 * │                                                                    │
 * │ Ce volet-ci PROUVE. Il montre cinq calculs entiers, un terme par    │
 * │ ligne, chacun avec le fichier du client d'où il sort. C'est ce qui  │
 * │ permet à un joueur de contester un nombre en pointant la ligne où   │
 * │ il n'est pas d'accord — et c'est la seule chose qui distingue un    │
 * │ moteur d'un générateur de nombres.                                 │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * COMPOSANT SERVEUR, VOLONTAIREMENT. `planche()` lit près de trois mégaoctets de
 * relevés avec `fs`. Un `"use client"` ici les enverrait au navigateur. Ce qui part,
 * c'est une trentaine de termes chiffrés.
 *
 * LES SUJETS NE SONT PAS CHOISIS À LA MAIN. L'arme, le monstre, la compétence, la
 * panoplie et l'accessoire des cinq feuilles sont DÉSIGNÉS PAR UNE RÈGLE appliquée au
 * relevé (voir l'en-tête de `statistiques/donnees.ts`). Le jour où le client change,
 * les exemples suivent — et les nombres des phrases avec eux.
 */
export function Calcul() {
  const { feuilles, panneau, build, constats: c } = planche();

  return (
    <>
      {/* ── LA PROSE CÈDE LA PLACE AU TABLEAU ────────────────────────────────
          Deux paragraphes expliquaient les quatre degrés de certitude. Ils
          n'apprenaient rien qu'une pastille survolée ne dise mieux : chaque
          pastille porte déjà son mot en clair, et sa bulle porte le fichier. Ce
          qui reste ici, c'est ce qu'aucune pastille ne peut dire — l'assiette du
          moteur, en chiffres, calculés sur les relevés. */}
      <Point titre="Sur quoi le moteur calcule">
        <p>
          Survole une <b>pastille</b> : elle dit le fichier du client d&apos;où sort le nombre.
          Un terme <b style={{ color: "var(--red)" }}>absent</b> reste dans la liste et dit{" "}
          <i>non pris en compte</i> à la place de sa valeur — un total amputé en silence se
          compare comme s&apos;il était complet.
        </p>
        <Bareme lignes={[
          ["Armes dont les bonus sont lus", c.armes.toLocaleString("fr-FR")],
          ["Statistiques que le client nomme", `${c.codesNommes} sur ${c.codesNommes + c.codesSansNom}`],
          ["Classes au tableau de facteurs du client", `${c.classes}`],
          /* LE DÉNOMINATEUR ÉTAIT ÉCRIT À LA MAIN (« sur 8 ») et il était faux : le
             relevé porte une famille de plus que le compte de mémoire. Il se compte
             maintenant sur les armes qu'une classe peut porter. */
          ["Familles d'arme que ce tableau couvre", `${c.famillesDArme} sur ${c.famillesDArmeTotal} — l'arc n'y est pas`],
          ["Compétences relevées", `${c.competences}, dont ${c.competencesDAttaque} d'attaque`],
          ["Monstres avec défense et résistances", c.monstres.toLocaleString("fr-FR")],
        ]} />
      </Point>

      <Point titre="Le panneau de caractéristiques : le total, et d'où vient chaque point">
        <p>
          Les quatre valeurs du porteur —{" "}
          <b>FOR {PORTEUR_EXEMPLE.force} · END {PORTEUR_EXEMPLE.endurance} · DEX{" "}
            {PORTEUR_EXEMPLE.dexterite} · INT {PORTEUR_EXEMPLE.intelligence}</b>{" "}
          — sont la <b>question posée</b> au moteur, pas une donnée du client : aucun relevé ne
          dit comment un joueur répartit ses points. Elles ne portent donc aucune pastille.
        </p>
        {build.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4, fontSize: 12.5, lineHeight: 1.5 }}>
            {build.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        )}
        <PanneauCaracteristiques
          lignes={panneau.lignes}
          sources={panneau.sources}
          /* Les quatre dés portent la BASE du porteur plus le bonus de l'équipement,
             comme la fenêtre du jeu. Sans la base, ils affichaient quatre tirets : ni
             l'arme ni la panoplie de l'exemple ne donnent de statistique brute. */
          base={{ str: PORTEUR_EXEMPLE.force, sta: PORTEUR_EXEMPLE.endurance,
            dex: PORTEUR_EXEMPLE.dexterite, int: PORTEUR_EXEMPLE.intelligence }}
        />
        <p className="mc-src">
          <Invisible enJeu="La fenêtre de panoplie du jeu n'affiche que ce que l'ensemble AJOUTE. Les lignes qui retirent des points sont dans propItemEtc.inc et n'apparaissent nulle part à l'écran.">
            <b>{c.panopliesNegatives} panoplies</b> du relevé retirent une statistique
          </Invisible>
          {" "}— {c.lignesNegatives} lignes négatives en tout.
        </p>
      </Point>

      {/* ── LE FAIT LE PLUS COÛTEUX DE LA PLANCHE ───────────────────────────────
          Il ne se déduit pas d'une phrase générale sur les panoplies : le SEUIL
          change la nature du fait. Une ligne négative à quatre pièces se paie en
          COMPLÉTANT l'ensemble, et on peut choisir de ne pas le compléter. Une
          ligne négative à UNE pièce se paie en la portant. */}
      {c.negativesDesUnePiece > 0 && (
        <Point titre="Les sets en Yggdrasil coûtent 300 de dégâts JcJ dès la PREMIÈRE pièce" marque="piege">
          <p>
            Sur les {c.lignesNegatives} lignes négatives du relevé,{" "}
            <b>{c.negativesDesUnePiece} tombent à une seule pièce portée</b> — les autres{" "}
            {c.lignesNegatives - c.negativesDesUnePiece} attendent l&apos;ensemble complet. La
            différence n&apos;est pas un détail : une ligne à quatre pièces, on peut choisir de ne
            pas la déclencher ; une ligne à une pièce, non.
          </p>
          {/* LE FAIT TIENT EN UN CONSTAT, PAS EN SEIZE NOMS. Les nommer un par un
              répétait « en Yggdrasil » seize fois pour cent mots servis ; le constat
              qui compte est qu'ils couvrent TOUTES les classes légendaires, ce qui se
              vérifie par le compte. */}
          <p>
            Ce sont les {c.setsQuiCoutentDesUnePiece.length} sets{" "}
            <b>en Yggdrasil</b> — les huit classes légendaires, dans les deux genres. Le stuff de
            fin de jeu de Vanguard, donc. Poser un seul casque suffit.
          </p>
        </Point>
      )}

      {feuilles.map((f, i) => <Feuille key={i} f={f} />)}

      <Point titre="Deux unités pour un même champ : ce qui interdit de chiffrer l'échelle d'une compétence" marque="piege">
        {/* ── LA PHRASE DISAIT UNE CHOSE PLUS FORTE QUE LE RELEVÉ ────────────────
            « Deux populations sans recouvrement » est faux, et le relevé le dit :
            au-dessus du plus fort coefficient d'attaque il n'y a plus une seule
            attaque — cela, c'est vrai — mais les buffs occupent AUSSI la plage des
            attaques, cinquante et quelques d'entre eux. Ce qui est établi, c'est une
            BANDE HAUTE réservée, pas deux familles séparées. */}
        <p>
          Le relevé donne, pour chaque compétence, un <b>coefficient</b> de référence — mais
          jamais son diviseur. Et une <b>bande haute</b> y est réservée : les{" "}
          {c.buffsAGrosCoef} compétences dont le coefficient atteint{" "}
          <b>{c.coefBuffMin.toLocaleString("fr-FR")}</b> ou plus sont <b>toutes des buffs</b>,
          aucune n&apos;est une attaque — la plus forte attaque du jeu plafonne à{" "}
          <b>{c.coefAttaqueMax}</b>.
        </p>
        <p>
          En bas, en revanche, <b>les deux se mêlent</b> : {c.buffsDansLaBandeDesAttaques} buffs
          portent un coefficient dans la même plage que les attaques. Le coefficient ne suffit
          donc pas à dire de quelle unité il s&apos;agit — c&apos;est le <b>type</b> de la
          compétence qui tranche. L&apos;écran affiche le socle, qui est certain, et le terme
          d&apos;échelle reste{" "}
          <Bulle quoi="Le total de la feuille « compétence » est un PLANCHER : la frappe réelle est plus forte, d'une quantité que le client ne permet pas de calculer.">
            <b>non compté</b>
          </Bulle>.
        </p>
      </Point>
    </>
  );
}
