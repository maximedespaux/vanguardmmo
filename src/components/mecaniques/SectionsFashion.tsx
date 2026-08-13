import { Invisible } from "@/components/Bulle";
import { reglagesDeSlot } from "@/lib/specsFlyff";
import {
  Bareme, Bonus, Chips, Grille, Groupe, Objets, Point, Vignettes, ligneDe, type Vue,
} from "./Blocs";
import { Slots } from "./SectionsObjets";
import {
  costumesQuiPaientSeuls, eveilFixe, iconeDe, joyauxDeCostume,
  masquesDuDragon, melangeDeCostumes, objet, panneau, piecesDeFashion, setsDeFashion,
} from "./releves";

/**
 * LE COSTUME — la facette que le site n'expliquait nulle part.
 *
 * ┌────────── CE QUE CETTE SECTION A PERDU, ET POURQUOI ──────────┐
 * │ Elle pesait mille mots, le tiers de la planche, pour cinq      │
 * │ faits. Ce qui est parti :                                      │
 * │                                                                │
 * │ · LES SEPT « ON NE SAIT PAS ». Elle listait honnêtement ce      │
 * │   qu'elle ignorait — le taux d'échec d'un sertissage de         │
 * │   costume, d'où viennent les joyaux nommés, ce que              │
 * │   l'amélioration apporte. Un renseignement incomplet ne se      │
 * │   publie plus, et sa réserve part avec lui.                    │
 * │ · L'APPAREIL DE RÉCONCILIATION. Elle expliquait à l'écran       │
 * │   pourquoi deux pages du site comptent 2 549 et 2 623 pièces,   │
 * │   et pourquoi un set garde son nom sans ses chiffres. C'est du  │
 * │   travail de relevé, pas un renseignement de joueur : les       │
 * │   contrôles restent dans le code (`concordent`), l'écran ne     │
 * │   montre que ce qu'ils valident.                               │
 * │ · LA PHRASE SUR « QUATRE STATISTIQUES COMMUNES PLUS DEUX PAR    │
 * │   PIÈCE ». C'était une lecture d'un doublon dans le fichier ;   │
 * │   le relevé dit depuis qu'il s'agit d'une LIGNE ÉCRITE DEUX     │
 * │   FOIS À L'IDENTIQUE dans Costume_GemAbility.txt. Une           │
 * │   supposition contredite par sa source ne se garde pas.        │
 * │ · LA RECETTE DE CHAQUE JOYAU, une phrase par famille. Elle      │
 * │   appartient à /crafts, qui la tient déjà du même relevé.      │
 * │                                                                │
 * │ CE QUI RESTE, PARCE QUE ÇA CHANGE CE QU'ON FAIT : on ne retire  │
 * │ que la DERNIÈRE gemme posée, donc on sertit en dernier ce dont  │
 * │ on est sûr. C'est l'exception à la règle — une mise en garde    │
 * │ contre une erreur coûteuse est utile même incomplète.          │
 * └───────────────────────────────────────────────────────────────┘
 */

/** Les emplacements de gemme d'une pièce de costume, pris à la table de vérité
 *  du site — celle qui sert aussi à composer les commandes sur mesure. */
const FASHION = reglagesDeSlot("fashion");

export function Fashion() {
  const p = piecesDeFashion();
  const s = setsDeFashion();
  const joyaux = joyauxDeCostume();
  const masques = masquesDuDragon();
  const melange = melangeDeCostumes();
  const evFashion = eveilFixe(/^II_SYS_SYS_SCR_FIX_FASHION_/);
  const evStuff = eveilFixe(/^II_SYS_SYS_SCR_FIX_AWAKE_/);
  const retrait = panneau(/retrait de gemmes de costume/i);
  const parchemin = objet("II_GEN_MAT_COSTUME_GEM_CANCEL");
  const seuls = costumesQuiPaientSeuls();
  /** Les seuls sets dont on publie les valeurs : ceux sur lesquels la boîte du
   *  jeu et la table du builder disent la même chose, nombre de lignes compris. */
  const surs = s.sets.filter((x) => x.concordent);
  /** Le rapport entre une ligne d'équipement et la même sur un costume, calculé
   *  sur la seule statistique que les deux séries portent au même rang. */
  const forceStuff = evStuff.lignes.find((l) => l.code === "STR");
  const forceMode = evFashion.lignes.find((l) => l.code === "STR");
  const rapport = forceStuff && forceMode && forceMode.r1 > 0
    ? Math.round(forceStuff.r1 / forceMode.r1)
    : 0;

  return (
    <>
      <Point
        titre={
          <Invisible enJeu={`Chaque pièce a une infobulle, donc l'air de porter un bonus. Sur les ${p.total} pièces des ${s.sets.length} sets du Roi Dragon, aucune n'a de ligne : le bonus n'apparaît qu'une fois les ${joyaux.length} portées ensemble.`}>
            Aucune des {p.total} pièces du Roi Dragon ne paie seule : c&apos;est le SET qui paie
          </Invisible>
        }
        marque="piege"
      >
        <p>
          Il se porte <b>par-dessus</b> l&apos;armure, et ce qui rapporte est posé dessus : le
          bonus de set, les {FASHION.gemmes} gemmes par pièce, une ligne d&apos;éveil.
        </p>
        <Slots lignes={[{
          quoi: "Une pièce de costume", base: FASHION.gemmes,
          legende: <>un joyau <b>propre à la pièce</b> par logement</>,
        }]} />
      </Point>

      {/* LE CONTRE-EXEMPLE, ET IL EST OBLIGATOIRE. Sans lui, la regle ci-dessus
          se lit comme « une piece de costume ne donne jamais rien seule », ce qui
          est faux sur les memes emplacements et fait acheter le mauvais chapeau. */}
      {seuls.avecBonus > 0 && (
        <Point titre="D'autres costumes, eux, paient à la pièce" marque="profit">
          <p>
            Sur {seuls.total.toLocaleString("fr-FR")} pièces de mode des mêmes
            {" "}{seuls.emplacements} emplacements, <b>{seuls.avecBonus} paient seules</b> — sans
            set, sans gemme, sans éveil. La plus haute de chaque emplacement :
          </p>
          <Objets liste={seuls.exemples.map((x) => ligneDe(x.fiche, { bonus: true }))} />
          <p className="mc-src">
            Et {seuls.sansGemme.map((x, i) => (
              <span key={x.nom}>{i > 0 ? " et " : ""}{x.art} <b>{x.nom}</b></span>
            ))} ne prennent <b>aucune gemme</b> : pas de famille de joyau pour eux.
          </p>
        </Point>
      )}

      <Groupe titre={`Les ${joyaux.length} emplacements, et les ${s.sets.length} sets`}>
        <Grille taille={28} cases={p.montrees.map((o): Vue => ({
          cle: o.cle, src: iconeDe(o), nom: o.n, cherche: o.n,
        }))} />
        <div className="mc-sets">
          {s.sets.map((x) => (
            <div key={x.nom} className="fx-card mc-set">
              <b>{x.nom}</b>
              <span className="mc-set-role">{x.role}</span>
              {/* LE CHIFFRE N'APPARAIT QUE S'IL EST DOUBLE-SOURCE. La boite du jeu
                  et la table du builder ne s'accordent pas sur tous les sets ;
                  publier les deux versions ferait deux verites pour un set. Le
                  desaccord ne se commente pas non plus : il ne s'affiche pas. */}
              {surs.includes(x) && <Bonus b={x.bonus} />}
            </div>
          ))}
        </div>
        <p className="mc-note">
          <b>{p.total} pièces</b>, <b>{p.dessins} dessins</b> : <b>on ne voit pas sur quelqu&apos;un
          lequel il porte</b>. Le nom n&apos;est que dans l&apos;infobulle, et c&apos;est lui qui
          décide du bonus.
        </p>
      </Groupe>

      <Point titre="Le joyau dépend de la PIÈCE : un Grenat ne va que sur une coiffe" marque="piege">
        <p>Le client ne le dit que dans une phrase d&apos;infobulle. Aucune fenêtre ne le récapitule.</p>
        <div>
          {joyaux.map((j) => (
            <div key={j.nom} className="mc-etage">
              <span className="mc-etage-t">
                <b>{j.nom}</b>
                <span>{j.piece ? `pour les ${j.piece}` : ""}</span>
              </span>
              <span className="mc-etage-l">
                <Vignettes items={[
                  { src: j.img, legende: j.nom },
                  { src: j.imgMorceau, legende: j.morceau?.n ?? "Morceau" },
                ]} />
                <Chips puces={j.stats.map((st) => ({ texte: st }))} />
              </span>
            </div>
          ))}
        </div>
        <p className="mc-src">
          Le coffret du jeu n&apos;en nomme pas d&apos;autres : demander « Attaque » sur des bottes,
          c&apos;est demander une gemme qui n&apos;existe pas. Les joyaux <b>nommés</b>, eux, forcent
          la statistique — et ici <b>le nom dit ce qu&apos;il fait</b>.
        </p>
      </Point>

      <Point titre="Tu ne retires que la DERNIÈRE gemme posée" marque="piege">
        <p>
          Une erreur sur la <b>2<sup>e</sup></b> gemme d&apos;une pièce à {FASHION.gemmes} logements
          se paie en défaisant la <b>4<sup>e</sup></b> puis la <b>3<sup>e</sup></b>. On sertit donc
          en dernier ce dont on est sûr — l&apos;inverse du réflexe. Le jeu ne le dit
          {retrait ? " que dans sa fenêtre de retrait" : " nulle part ailleurs"}.
        </p>
        {parchemin && <Objets liste={[ligneDe(parchemin)]} />}
      </Point>

      <Point titre="Le bonus d'un masque se change sans rien perdre" marque="profit">
        <p>
          Deux séries : l&apos;<b>apparence</b> d&apos;un côté, le <b>bonus</b> de l&apos;autre. Les
          {" "}{masques.saveurs.length} effets tournent en boucle chez{" "}
          <b>{masques.couturier || "le Grand Couturier"}</b> — <b>{masques.rotations} transformations</b>
          {masques.tauxRotation.length === 1 && masques.tauxRotation[0] != null
            ? <> à <b>{masques.tauxRotation[0]} %</b></>
            : null}
          , et l&apos;on revient au point de départ.
        </p>
        <Objets liste={masques.saveurs.map((o) => ligneDe(o, { bonus: true }))} />
        <Grille taille={26} cases={masques.recolores.map((o): Vue => ({
          cle: o.cle, src: o.ic ? `/jeu/icones/${o.ic}` : null, cherche: o.n,
          nom: o.n.replace(/^Masque du dragon\s*/i, ""),
        }))} />
        <p className="mc-src">
          {masques.recolores.length} recolorations, et{" "}
          {masques.sansBonus === masques.recolores.length
            ? <><b>aucune ne porte de bonus</b></>
            : <><b>{masques.sansBonus}</b> n&apos;en portent pas</>}
          : la couleur et le bonus <b>ne vivent pas sur le même objet</b>.
        </p>
      </Point>

      {melange && (
        <Point titre="Le mélange de costumes détruit ce qu'on y met" marque="piege">
          <p>
            On en met{" "}
            {melange.min > 0 ? <><b>{melange.min} à {melange.max}</b></> : <b>plusieurs</b>}, on en
            ressort <b>un seul, au hasard</b> parmi {melange.sorties.length} — dont
            {" "}<b>{melange.avecBonus.length}</b> à bonus connu. La liste est sur <b>Les crafts</b>.
          </p>
          {melange.protection && <Objets liste={[ligneDe(melange.protection)]} />}
        </Point>
      )}

      <Groupe titre={`Un costume s'éveille aussi : ${evFashion.total} parchemins`}>
        <Bareme lignes={evFashion.lignes.map((l) => [
          l.label || l.code,
          `R1 +${l.r1}${l.pourcent ? " %" : ""} · R2 +${l.r2}${l.pourcent ? " %" : ""}`,
        ] as [string, string])} />
        <p className="mc-src">
          Éveils <b>fixes</b> : la ligne est connue d&apos;avance, rien à tirer.
          {evFashion.pasDouble.length > 0 && <> <b>R2 ne double pas toujours R1</b> —{" "}
            {evFashion.pasDouble.map((l) => l.label || l.code).join(", ")}.</>}
          {rapport > 1 && <> Et la Force vaut <b>+{forceStuff!.r1}</b> sur l&apos;équipement contre
            {" "}<b>+{forceMode!.r1}</b> ici : le costume complète, il ne remplace pas.</>}
        </p>
      </Groupe>
    </>
  );
}
