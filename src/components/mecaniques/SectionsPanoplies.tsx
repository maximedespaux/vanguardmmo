import { Invisible } from "@/components/Bulle";
import { Barres, Chips, Groupe, Point } from "./Blocs";
import { libelleDe, panopliesNegatives } from "./sources";

/**
 * LA PANOPLIE NE FAIT PAS QUE DONNER — ELLE RETIRE AUSSI.
 *
 * C'est le fait le plus invisible de toute la page, et il coûte cher. Le client
 * écrit, dans `propItemEtc.inc`, des lignes de bonus NÉGATIVES sur des panoplies :
 * l'Armure de Shaïtan retire 200 de dégâts JcJ %, celle des Dryades 300 de dégâts
 * JcJ, l'Apocalypse 400 de dégâts sur monstres et jusqu'à 500 de précision.
 * Compléter l'ensemble vous COÛTE ces statistiques.
 *
 * Rien, en jeu, ne l'annonce : la fenêtre de panoplie liste ce qu'elle ajoute.
 * Aucun joueur ne le devine, et c'est exactement le critère de tri qu'on nous a
 * donné — ce qu'on ne voit pas en jouant passe devant.
 *
 * ┌────────── CE QUE CETTE SECTION MONTRE, ET CE QU'ELLE NE MONTRE PAS ──────────┐
 * │ Elle montre le BARÈME — dix lignes couvrent cent douze ensembles — et les    │
 * │ FAMILLES concernées, pour qu'on sache si l'on est touché. Elle ne liste pas   │
 * │ les cent douze : ce serait la même ligne écrite quarante fois, et le relevé   │
 * │ signale lui-même que deux identifiants de panoplie sont écrits en double dans │
 * │ le client — d'où le regroupement par NOM et jamais par `id`.                 │
 * │                                                                            │
 * │ Elle ne montre PAS les lignes positives des mêmes panoplies : le catalogue    │
 * │ d'objets en est propriétaire, et ce qui est utile ici est le SIGNE.          │
 * │                                                                            │
 * │ LE PALIER COMPTE AUTANT QUE LE SIGNE, et c'est lui qui change le geste : un   │
 * │ malus posé à la quatrième pièce s'évite en n'en portant que trois, un malus   │
 * │ posé dès la première ne s'évite pas. Les deux cas existent, ils sont donc     │
 * │ comptés séparément plutôt que résumés.                                      │
 * └────────────────────────────────────────────────────────────────────────────┘
 */
/** Le libellé au fil de la phrase : seule l'INITIALE tombe en minuscule. Un
 *  `toLowerCase()` entier écrivait « dégâts jcj », et une abréviation décapitalisée
 *  se lit comme une faute — donc comme un doute sur le reste de la page. */
const minuscule = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

export function Panoplies() {
  const p = panopliesNegatives();
  if (!p.lignes.length) return null;

  // La ligne la plus répandue sert de titre : c'est celle qui touche le plus de
  // monde, et elle se recalcule si le client change.
  const pire = p.lignes[0];
  const complet = Math.max(...p.lignes.map((l) => l.pieces));
  const aLaFin = p.lignes.filter((l) => l.pieces === complet).reduce((n, l) => n + l.n, 0);
  const desLeDebut = p.lignes.filter((l) => l.pieces < complet).reduce((n, l) => n + l.n, 0);
  /* LE CONTROLE CROISE NE VA PAS A L'ECRAN. `p.concordance` dit que les seize
     panoplies comparables entre le releve du site et la table du client tombent
     d'accord valeur par valeur. C'est ce qui AUTORISE cette section a publier ses
     chiffres — mais c'est du travail de releve, pas un renseignement de joueur : le
     controle reste dans `sources.ts`, l'ecran ne montre que ce qu'il valide. */

  return (
    <>
      <Point
        titre={
          <Invisible enJeu="La fenêtre de panoplie n'affiche que ce que l'ensemble ajoute. Les lignes négatives sont dans propItemEtc.inc et n'apparaissent nulle part à l'écran : on les découvre en comparant ses statistiques avant et après.">
            {p.touchees} des {p.total} panoplies RETIRENT une statistique
          </Invisible>
        }
        marque="piege"
      >
        <p>
          Une panoplie donne ses bonus par paliers — deux pièces, trois, quatre. Sur
          {" "}<b>{p.touchees} ensembles</b>, un palier est <b>négatif</b> : la statistique
          {" "}<b>descend</b>. Le plus répandu retire
          {" "}<b>{Math.abs(pire.valeur)} de {minuscule(libelleDe(pire.code))}</b>.
        </p>
        <Barres
          lignes={p.lignes.map((l) => ({
            nom: `${libelleDe(l.code)} ${l.valeur} — dès ${l.pieces} pièce${l.pieces > 1 ? "s" : ""}`,
            v: l.n,
            texte: `${l.n}`,
          }))}
        />
        <p className="mc-src">
          Presque toutes visent le <b>JcJ</b> : compléter un set de haut niveau, c&apos;est gagner
          en PV et <b>perdre en dégâts contre les joueurs</b>.
        </p>
      </Point>

      <Point titre="Le palier décide si l'on peut y échapper" marque="profit">
        <p>
          <b>{aLaFin}</b> n&apos;arrivent qu&apos;à la {complet}<sup>e</sup> pièce : s&apos;arrêter à
          {" "}{complet - 1} les évite, au prix du dernier palier de bonus.
          {desLeDebut > 0 && <> Les <b>{desLeDebut}</b> autres tombent <b>dès la première pièce</b> :
            rien à arbitrer.</>}
        </p>
      </Point>

      <Groupe titre={`Les ${p.familles.length} familles concernées`}>
        <Chips puces={p.familles.map((f) => ({
          texte: f.nom,
          titre: f.codes.map(libelleDe).join(" · "),
          lien: `/objets?q=${encodeURIComponent(f.nom)}`,
        }))} />
      </Groupe>
    </>
  );
}
