"use client";
import { Icon } from "@/components/Icon";
import { Faiblesses, SchemaVies } from "@/components/monstres/Graphiques";
import TABLE from "@/data/chambres-adversaires.json";

/**
 * CE QU'ON VA COMBATTRE DANS LES CHAMBRES SECRÈTES — la partie de la stratégie qui
 * vient des fichiers du jeu, à côté de celle que le staff écrit à la main.
 *
 * Pourquoi les deux cohabitent : `StrategieCS` est un éditeur, le staff y raconte le
 * déroulé et les placements. Personne n'y saisira jamais à la main les points de vie
 * de trente-sept adversaires — et s'il le faisait, ces chiffres seraient périmés à la
 * prochaine fouille du client. Ce bloc-ci les LIT ; l'autre dit comment on joue.
 *
 * Le relevé (src/data/chambres-adversaires.json, 15 Ko) est extrait de
 * public/wiki/monstres.json, qui pèse 612 Ko : on n'embarque pas 612 Ko dans le
 * paquet du navigateur pour trente-sept lignes. Le critère d'extraction est écrit
 * dans le fichier — nom finissant par « Mutant Secret », ou identifiant client
 * commençant par MI_CHAMBER_ / MI_CHAMBRE_.
 *
 * AUCUN CHIFFRE N'EST ÉCRIT EN DUR ici, y compris dans les phrases : les comptes,
 * les extrêmes et jusqu'à « celui qui frappe le plus fort » se recalculent sur la
 * table. Un chiffre saisi à la main devient faux sans que personne ne s'en aperçoive,
 * et l'intérêt de cette page est d'être juste avant d'être jolie.
 */
type Adversaire = {
  id: string; nom: string; niv: number; pv: number; vies: number; pvEff: number;
  atkMax: number; delai: number; elem: string | null;
  res: Record<string, number>; def: number; resMag: number; esq: number;
  exp: number; penya: number; rang: string;
};

const ADV = (TABLE as { adversaires: Adversaire[] }).adversaires;

const fr = (n: number) => n.toLocaleString("fr-FR");
/** 30 000 000 000 se lit mal ; « 30 Md » se compare d'un coup d'œil. */
function court(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (n >= 1e3) return `${(n / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k`;
  return fr(n);
}
/** Le délai du client est en millisecondes entre deux coups. */
const parSeconde = (m: Adversaire) => (m.delai > 0 ? (m.atkMax / (m.delai / 1000)) : 0);

/**
 * IL Y AVAIT ICI UNE TABLE `ELEMENT_FR` ET UNE FONCTION `elements()`, qui
 * écrivaient « faible au feu, eau · résiste au vent » en français dans la
 * dernière colonne. C'était la troisième copie de la même idée sur le site.
 *
 * La brique `Faiblesses` de components/monstres/Graphiques.tsx fait le même
 * travail avec les CINQ ICÔNES DU JEU, tient dans 40 px au lieu d'une colonne
 * large sur trente-sept lignes, et porte le détail chiffré dans une bulle. Elle
 * lit les résistances exactement de la même façon — dans les cinq colonnes du
 * client, jamais déduites de la roue élémentaire, parce que des monstres de ce
 * jeu résistent à trois éléments à la fois.
 *
 * Le contrat de la brique demande un `res` dont les clés sont
 * feu/eau/electricite/vent/terre : c'est déjà la forme du relevé.
 */

/**
 * LA MISE EN GARDE, SORTIE DE SON ONGLET.
 *
 * ┌──────────── LE DÉFAUT QU'ELLE CORRIGE ────────────┐
 * │ « Une barre à zéro ne veut pas dire mort » vivait   │
 * │ dans le bloc des adversaires, donc dans l'onglet    │
 * │ « Stratégie ». Or la page OUVRE sur « Chambre       │
 * │ Secrète » : celui qui vient s'inscrire pour ce soir │
 * │ ne la voyait jamais. Une mise en garde qu'il faut   │
 * │ aller chercher n'en est plus une.                   │
 * └────────────────────────────────────────────────────┘
 *
 * Elle tient sur une ligne, sous les onglets, quel que soit l'onglet ouvert. Les
 * deux nombres sont COMPTÉS sur le relevé, comme partout ailleurs dans ce fichier.
 * Le bouton mène au tableau qui donne la colonne « PV à sortir » — le geste au bout
 * de l'avertissement, sinon c'est une phrase de plus.
 *
 * @param onVoir — bascule vers l'onglet qui porte le tableau. Absent, la ligne
 *   reste informative et ne promet pas un clic qui ne fait rien.
 */
export function AlerteVies({ onVoir }: { onVoir?: () => void }) {
  const aVies = ADV.filter((m) => m.vies > 1);
  if (!aVies.length) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 18,
      padding: "9px 13px", borderRadius: 10, fontSize: 12.5, lineHeight: 1.5,
      background: "color-mix(in srgb, var(--red) 7%, transparent)",
      border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)",
    }}>
      <Icon name="alert" size={15} style={{ color: "var(--red)", flexShrink: 0 }} />
      <span>
        <b style={{ color: "var(--red)" }}>Une barre à zéro ne veut pas dire mort.</b>{" "}
        {/* « des Chambres » ET NON « de la salle ». Le relevé nomme des lieux
            DISTINCTS dans les noms mêmes de ses adversaires — Gardien du Mausolée,
            Gardien du Tombeau, Gardienne de l'antichambre — et la légende du plan,
            dix centimètres plus bas, annonce « deux ailes et une salle ronde ». Écrire
            « la salle » au singulier dans la phrase la plus visible de la page la
            faisait contredire sa propre carte. */}
        {aVies.length} des {ADV.length} adversaires des Chambres se relèvent.
      </span>
      {onVoir && (
        <button type="button" onClick={onVoir} style={{
          marginLeft: "auto", flexShrink: 0, cursor: "pointer", fontFamily: "inherit",
          fontSize: 11.5, fontWeight: 600, padding: "5px 11px", borderRadius: 8,
          background: "transparent", border: "1px solid var(--red)", color: "var(--red)",
        }}>
          Les PV à sortir
        </button>
      )}
    </div>
  );
}

export function AdversairesChambres() {
  const parMenace = [...ADV].sort((a, b) => parSeconde(b) - parSeconde(a));
  const parVie = [...ADV].sort((a, b) => b.pvEff - a.pvEff);
  const cogneur = parMenace[0];
  const plusGros = parVie[0];
  const mutants = ADV.filter((m) => /Mutant Secret$/.test(m.nom));
  const aVies = ADV.filter((m) => m.vies > 1);
  const maxSeconde = Math.max(1, ...ADV.map(parSeconde));
  const maxVie = Math.max(1, ...ADV.map((m) => m.pvEff));

  // Le tank ne se prépare pas sur le plus gros sac de points de vie mais sur celui
  // qui frappe le plus vite. Quand les deux ne sont pas le même, ça se dit.
  const menaceNestPasLaPlusGrosse = cogneur.id !== plusGros.id;

  const th: React.CSSProperties = {
    textAlign: "right", padding: "7px 9px", fontSize: 10.5, textTransform: "uppercase",
    letterSpacing: ".5px", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    textAlign: "right", padding: "7px 9px", fontSize: 12, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "grid", gap: 14, marginBottom: 18 }}>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,320px) minmax(0,1fr)", gap: 14, alignItems: "start" }} className="cs-haut">
        {/* LA CARTE DES CHAMBRES. Elle existait dans public/jeu/cartes-monde/ sans être
            affichée nulle part, alors que cette page parle de ces salles depuis
            toujours. C'est une carte sur parchemin du client, avec le logo AirFlyff
            dessus — donc rien à filtrer ni à recadrer. */}
        <figure style={{ margin: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/jeu/cartes-monde/dungeon_secretroom.webp" alt="Le plan des Chambres Secrètes, tel qu'il sort du client"
            style={{ width: "100%", display: "block", borderRadius: 12, border: "1px solid var(--border)" }} />
          {/* « l'antichambre » EST PARTI, remplacé par ce qu'on VOIT. Le plan montre
              deux grandes structures et une salle ronde ; rien, ni dans l'image ni
              dans le relevé, ne dit que la ronde est une antichambre — elle pourrait
              tout aussi bien être la salle du dernier boss. On décrit la carte, on
              ne la commente pas : c'est la même règle que pour les icônes, une
              légende qui affirme plus que sa source finit par tromper. */}
          <figcaption style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            Le plan, tel qu&apos;il sort du client : deux ailes et une salle ronde.
          </figcaption>
        </figure>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(128px,1fr))", gap: 8 }}>
            <Chiffre valeur={fr(ADV.length)} quoi="adversaires relevés" />
            <Chiffre valeur={fr(aVies.length)} quoi="se relèvent" ton="var(--red)" />
            <Chiffre valeur={court(plusGros.pvEff)} quoi="le plus gros, PV à sortir" ton="var(--orange)" />
            <Chiffre valeur={court(cogneur.atkMax)} quoi="le coup le plus fort" ton="var(--red)" />
          </div>

          {/* LE PARAGRAPHE DES PLUSIEURS VIES EST DEVENU UN SCHÉMA. Il expliquait en
              trois lignes qu'une barre à zéro ne veut pas dire mort ; `SchemaVies`
              met les deux quantités à la MÊME échelle et la démonstration se fait
              d'un regard — c'est la brique écrite pour ça (components/monstres/
              Graphiques.tsx), et elle porte déjà sa propre mise en garde « invisible
              en jeu » sur le chiffre.

              Le schéma est celui du PIRE cas relevé, pas d'un exemple choisi : le
              plus gros sac de points de vie effectifs de la salle.

              LA PHRASE D'ALERTE N'EST PLUS EN TÊTE DE CE BLOC : `AlerteVies` la porte
              au-dessus des onglets, donc elle est déjà à l'écran quand on arrive ici.
              La répéter à dix centimètres faisait douter qu'il s'agisse du même fait.
              Ce qui reste est ce que l'alerte ne peut pas tenir sur une ligne : le
              schéma à l'échelle, et quel chiffre sert à préparer un run. */}
          <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", fontSize: 12.5, lineHeight: 1.6 }}>
            {plusGros.vies > 1 && (
              <div style={{ margin: "0 0 8px" }}>
                <SchemaVies pv={plusGros.pv} vies={plusGros.vies} pvEff={plusGros.pvEff} taille="petite" />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>
                  {/* Même correction que dans l'alerte : le donjon a plusieurs
                      salles, le relevé les nomme, la carte les montre. */}
                  {plusGros.nom}, le plus gros du donjon.
                </div>
              </div>
            )}
            La colonne <b>PV à sortir</b> fait déjà cette multiplication : c&apos;est le seul chiffre
            sur lequel préparer un run.
            {menaceNestPasLaPlusGrosse && (
              <div style={{ marginTop: 8 }}>
                <b style={{ color: "var(--gold)" }}>Et le plus gros n&apos;est pas le plus dangereux.</b>{" "}
                {/* Deux-points et non « c'est X qui… » : plusieurs de ces noms portent
                    déjà une virgule (« Nyzzara, la mère dévoreuse »), et la relative
                    s'y raccrochait de travers à la lecture. */}
                Le coup le plus fort vient de <b style={{ color: "var(--text)" }}>{cogneur.nom}</b> :{" "}
                {court(cogneur.atkMax)} par coup toutes les {fr(cogneur.delai)} ms, soit{" "}
                {court(Math.round(parSeconde(cogneur)))} par seconde. Un tank qui se prépare sur la
                barre de vie se prépare sur le mauvais.
              </div>
            )}
          </div>

          {mutants.length > 0 && (
            <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", fontSize: 12.5, lineHeight: 1.6 }}>
              <b>Les {mutants.length} « Mutant Secret » : l&apos;élément que tu apportes ne change rien.</b>{" "}
              Leurs cinq colonnes de résistance sont à zéro — ni faiblesse, ni résistance. Ce sont
              leurs points de vie qui montent, de {court(Math.min(...mutants.map((m) => m.pv)))} à{" "}
              {court(Math.max(...mutants.map((m) => m.pv)))}, et ils frappent tous toutes les{" "}
              {fr(mutants[0].delai)} ms.
              {/* LA PHRASE SUR L'EXPÉRIENCE ET LA PENYA EST PARTIE — règle 1 de la
                  maison, et Maxime nomme ces deux-là avec les taux de chute : elles
                  restent dans les DONNÉES (le relevé porte toujours `exp` et `penya`
                  pour chaque adversaire) et quittent l'ÉCRAN. Rien d'autre n'est
                  perdu : le tableau n'a jamais eu de colonne de récompense. */}
            </div>
          )}
        </div>
      </div>

      {/* Le tableau défile dans son propre conteneur : sinon c'est la page entière qui
          gagne une barre horizontale sur un téléphone. */}
      <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ ...th, textAlign: "left" }}>Adversaire</th>
              <th style={th}>Niv.</th>
              <th style={th}>PV à sortir</th>
              <th style={th}>Vies</th>
              <th style={th}>Par coup</th>
              <th style={th}>Par seconde</th>
              <th style={{ ...th, textAlign: "left" }}>Élément</th>
            </tr>
          </thead>
          <tbody>
            {parVie.map((m, i) => {
              const ps = parSeconde(m);
              return (
                <tr key={m.id} style={{ borderTop: i ? "1px solid color-mix(in srgb, var(--border) 45%, transparent)" : "none" }}>
                  <td style={{ ...td, textAlign: "left", whiteSpace: "normal", minWidth: 190, fontWeight: 600 }}>
                    {m.nom}
                    {m.vies > 1 && (
                      <span style={{ display: "block", fontSize: 10.5, fontWeight: 400, color: "var(--red)" }}>
                        {court(m.pv)} PV × {m.vies} vies
                      </span>
                    )}
                  </td>
                  <td style={{ ...td, color: "var(--text-muted)" }}>{m.niv}</td>
                  <td style={{ ...td, fontWeight: 700, color: "var(--orange)", minWidth: 92 }}>
                    {court(m.pvEff)}
                    <Barre part={m.pvEff / maxVie} teinte="var(--orange)" />
                  </td>
                  <td style={{ ...td, color: m.vies > 1 ? "var(--red)" : "var(--text-muted)", fontWeight: m.vies > 1 ? 700 : 400 }}>{m.vies}</td>
                  <td style={td}>{court(m.atkMax)}</td>
                  <td style={{ ...td, fontWeight: 700, color: "var(--red)", minWidth: 92 }}>
                    {court(Math.round(ps))}
                    <Barre part={ps / maxSeconde} teinte="var(--red)" />
                  </td>
                  <td style={{ ...td, textAlign: "left", whiteSpace: "normal", fontSize: 11.5 }}>
                    <Faiblesses res={m.res} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
        Relevé sur le client d&apos;octobre 2025. Les faiblesses sont <b>lues</b> dans les cinq colonnes
        de résistance du fichier, pas déduites de la roue élémentaire — plusieurs monstres de ce jeu
        résistent à trois éléments à la fois, et déduire donnerait une faiblesse qui n&apos;existe pas.
        Le butin ordinaire, lui, n&apos;est pas dans le client : c&apos;est le serveur qui le calcule.
      </p>

      <style>{`@media(max-width:820px){.cs-haut{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}

function Chiffre({ valeur, quoi, ton = "var(--text)" }: { valeur: string; quoi: string; ton?: string }) {
  return (
    <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 11px" }}>
      <div className="font-heading" style={{ fontSize: 17, fontWeight: 700, color: ton, fontVariantNumeric: "tabular-nums" }}>{valeur}</div>
      <div style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.3 }}>{quoi}</div>
    </div>
  );
}

/**
 * La barre du classement : deux nombres voisins se lisent comme voisins, deux barres
 * montrent le rapport de force. UNE SEULE TEINTE, celle que la colonne emploie déjà
 * pour son chiffre — c'est la longueur qui porte la grandeur, jamais la couleur (le
 * vert et le doré ne se distinguent pas pour un daltonien protan).
 * Plancher à 1,5 % : sans lui, une valeur mille fois plus faible que la première perd
 * sa barre, et une absence se lit comme une donnee manquante plutot que comme « tres
 * peu ». `aria-hidden` parce que le nombre exact est juste au-dessus.
 */
function Barre({ part, teinte }: { part: number; teinte: string }) {
  return (
    <span aria-hidden="true" style={{ display: "block", height: 3, marginTop: 4, borderRadius: 2, background: "color-mix(in srgb, var(--border) 70%, transparent)" }}>
      <span style={{ display: "block", height: "100%", borderRadius: 2, background: teinte, width: `${Math.max(1.5, Math.min(100, part * 100))}%` }} />
    </span>
  );
}
