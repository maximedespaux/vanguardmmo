import { Invisible } from "@/components/Bulle";
import { Barres, Point } from "./Blocs";
import { chiffresDEquilibrage } from "./releves";

/**
 * L'ÉQUILIBRAGE DU SERVEUR — LA SECONDE TABLE DE MÉTIER, ET L'ARC QU'ELLE NOMME.
 *
 * ┌──────────── POURQUOI CETTE SECTION EXISTE ────────────┐
 * │ Elle prend la place du « calcul, terme par terme », et │
 * │ c'est un échange assumé. Le calcul affichait un dégât  │
 * │ dont vingt-deux termes sur quarante-neuf reposaient    │
 * │ sur des constantes du Flyff officiel qu'aucun fichier  │
 * │ d'Airborn n'écrit. Ce qui suit ne montre QUE des       │
 * │ valeurs lues dans le client de ce serveur.            │
 * └────────────────────────────────────────────────────────┘
 *
 * CE QU'ELLE NE FERA JAMAIS : multiplier ces coefficients par quoi que ce soit.
 * Le client donne le COEFFICIENT d'arme ; il ne donne ni le seuil retiré à la
 * statistique, ni le facteur de niveau, ni la réduction par la défense. Un
 * coefficient est un fait ; le dégât qu'on en tirerait serait une supposition.
 */
export function Equilibrage() {
  const e = chiffresDEquilibrage();
  if (!e) return null;

  return (
    <>
      <Point
        titre={
          <Invisible enJeu="Aucune fenêtre du jeu n'affiche de coefficient de métier. Les deux tables sont dans le client — propJob.inc et propBalance.xml — et elles ne donnent pas les mêmes chiffres.">
            L&apos;arc a enfin un coefficient — et il n&apos;est pas dans la table qu&apos;on lisait
          </Invisible>
        }
      >
        <p>
          Le client porte <b>deux</b> tables de métier. <code>propJob.inc</code> était la
          seule lue, et sur les <b>{e.familles} familles d&apos;arme</b> que le client emploie,
          elle en nomme {e.familles - e.famillesSansPropJob.length} :
          {" "}<b>l&apos;arc n&apos;a aucune colonne</b>. La seconde, <code>propBalance.xml</code>,
          le nomme{e.arc && <> — <code>{e.arc.nom}</code>, rang {e.arc.rang}</>} et lui donne
          une valeur <b>par métier</b>.
        </p>
        <p>
          Les deux tables ne s&apos;accordent pas : sur <b>{e.comparees} valeurs comparables</b>,
          {" "}<b>{e.divergentes} divergent</b>. Un coefficient cité sans dire de quelle table
          il sort ne veut donc rien dire.
        </p>
      </Point>

      <Point
        titre={
          <>
            Le même arc rend {e.ecartArc ? <b>{e.ecartArc.toFixed(1).replace(".", ",")} fois</b> : "beaucoup"} plus
            {" "}sur une lignée que sur une autre
          </>
        }
        marque="profit"
      >
        <p>
          Le coefficient d&apos;arc de <code>propBalance.xml</code>, en situation PvE, lignée
          par lignée. C&apos;est la seule chose que le client dise de l&apos;arc — et elle suffit à
          trancher <b>sur quelle classe un arc rend quelque chose</b>.
        </p>
        <Barres
          lignes={e.bow.map((b) => ({
            nom: b.nom,
            v: b.v,
            texte: b.v.toString().replace(".", ","),
          }))}
        />
        <p>
          {e.metiers} lignes d&apos;équilibrage, dont {e.declaresDansDefineJob} correspondent à un
          métier réellement déclaré par le client : les autres sont des paliers préparés que
          le serveur n&apos;a pas ouverts. Et ces chiffres sont ceux du <b>PvE</b> —
          {" "}<code>propBalance.xml</code> range {e.situations} situations séparément, le jeu
          n&apos;applique pas les mêmes valeurs contre un monstre et contre un joueur.
        </p>
      </Point>
    </>
  );
}
