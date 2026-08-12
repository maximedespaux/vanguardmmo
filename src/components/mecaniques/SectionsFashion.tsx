import { Invisible } from "@/components/Bulle";
import { reglagesDeSlot } from "@/lib/specsFlyff";
import { Bareme, Bonus, Case, Chip, Groupe, LigneObjet, Point, Vignette } from "./Blocs";
import { Slots } from "./SectionsObjets";
import {
  costumesQuiPaientSeuls, eveilFixe, gemmesCostumeDuBuilder, iconeDe, joyauxDeCostume,
  masquesDuDragon, melangeDeCostumes, objet, panneau, piecesDeFashion, recetteDeJoyau, setsDeFashion,
} from "./releves";

/**
 * LE COSTUME — la facette que le site n'expliquait nulle part.
 *
 * ┌────────── CE QUE CETTE SECTION A PERDU, ET POURQUOI ──────────┐
 * │ Elle listait honnêtement sept choses qu'elle ne savait pas :   │
 * │ ce qu'une gemme rapporte à l'unité, le taux d'échec d'un       │
 * │ sertissage de costume, d'où viennent les joyaux nommés, ce que │
 * │ l'amélioration apporte, le bonus réel d'un set sur lequel deux │
 * │ sources se contredisent, si le joyau brut tire au hasard.      │
 * │                                                                │
 * │ Toutes sont parties. La consigne est nette : un renseignement  │
 * │ incomplet ne se publie plus, et sa réserve part avec lui. Un   │
 * │ bloc « voilà la question, on n'a pas la réponse » coûte de la  │
 * │ place à ce qui répond.                                        │
 * │                                                                │
 * │ CE QUI RESTE, PARCE QUE ÇA CHANGE CE QU'ON FAIT : on ne retire │
 * │ que la DERNIÈRE gemme posée, donc on sertit en dernier ce dont │
 * │ on est sûr. C'est l'exception à la règle — une mise en garde   │
 * │ contre une erreur coûteuse est utile même incomplète.          │
 * │                                                                │
 * │ CONSÉQUENCE SUR LES SETS : un set n'affiche ses valeurs que si │
 * │ la boîte du jeu et la table du builder tombent d'accord. Là où │
 * │ elles divergent, le set garde son nom et son rôle et PERD ses  │
 * │ chiffres — au lieu d'afficher les deux versions côte à côte    │
 * │ avec un appareil de réconciliation à l'écran.                  │
 * └───────────────────────────────────────────────────────────────┘
 */

/** Les emplacements de gemme d'une pièce de costume, pris à la table de vérité
 *  du site — celle qui sert aussi à composer les commandes sur mesure. */
const FASHION = reglagesDeSlot("fashion");

export function Fashion() {
  const p = piecesDeFashion();
  const s = setsDeFashion();
  const joyaux = joyauxDeCostume();
  const b = gemmesCostumeDuBuilder();
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

  return (
    <>
      <div className="mc-slots" style={{ marginBottom: 12 }}>
        <Slots quoi="Une pièce de costume" base={FASHION.gemmes}
          legende={<>un joyau <b>propre à la pièce</b> par logement</>} />
      </div>

      {/* ── 1. La question qui décide de tout le reste ─────────────────────── */}
      <Point
        titre={
          <Invisible enJeu={`Chaque pièce a l'air de porter un bonus puisqu'elle a une infobulle. Sur les ${p.total} pièces des ${s.sets.length} sets du Roi Dragon, aucune n'a de ligne : le bonus n'apparaît qu'une fois les ${joyaux.length} portées ensemble.`}>
            Aucune des {p.total} pièces ne paie seule : c&apos;est le SET qui paie
          </Invisible>
        }
        marque="piege"
      >
        <p>
          Un costume se porte <b>par-dessus</b> l&apos;armure et ne la remplace pas. Sur les
          {" "}{s.sets.length} sets du Roi Dragon, ce qui rapporte est <b>trois choses posées
          dessus</b> : le bonus de set, les {FASHION.gemmes} gemmes de chaque pièce, et une ligne
          d&apos;éveil au parchemin.
        </p>
        <p className="mc-src">
          Compté sur <b>les deux relevés séparément</b>, qui tombent d&apos;accord : les {s.total}
          {" "}pièces de la table du builder ont
          {s.piecesAvecBonusPropre === 0 ? <> un champ de bonus propre <b>vide</b></> : <> {s.piecesAvecBonusPropre} champs remplis</>}
          , et les {p.total} pièces du client n&apos;ont pas de ligne de bonus non plus.
        </p>
      </Point>

      {/* LE CONTRE-EXEMPLE, ET IL EST OBLIGATOIRE. Sans lui, la regle ci-dessus
          se lit comme « une piece de costume ne donne jamais rien seule », ce qui
          est faux sur les memes quatre emplacements et fait acheter le mauvais
          chapeau. Les comptes sortent du releve. */}
      {seuls.avecBonus > 0 && (
        <Point titre="Mais d'autres costumes, eux, paient à la pièce" marque="profit">
          <p>
            Sur les <b>{seuls.total.toLocaleString("fr-FR")} pièces de mode</b> rangées sur ces
            {" "}<b>{seuls.emplacements} mêmes emplacements</b>,{" "}
            <b>{seuls.avecBonus} portent une ligne à elles seules</b> — sans set, sans gemme, sans
            éveil. Le propre du Roi Dragon n&apos;est pas de ne rien donner : c&apos;est de payer
            <b> par le set</b> là où d&apos;autres paient <b>par la pièce</b>.
          </p>
          <div style={{ display: "grid", gap: 6 }}>
            {seuls.exemples.map((x) => (
              <LigneObjet key={x.fiche.cle} o={x.fiche} sansPhrase apres={<Bonus b={x.fiche.b} />} />
            ))}
          </div>
          <p className="mc-src">
            Un exemple par emplacement, celui dont la valeur est la plus haute. Et deux emplacements
            de mode <b>ne prennent aucune gemme</b>, faute de famille de joyau :{" "}
            {seuls.sansGemme.map((x, i) => (
              <span key={x.nom}>
                {i > 0 ? " et " : ""}{x.art} <b>{x.nom}</b> ({x.avecBonus} à bonus sur {x.total})
              </span>
            ))} — eux paient à la pièce.
          </p>
        </Point>
      )}

      {/* ── 2. Les quatre emplacements, en images ──────────────────────────── */}
      <Groupe titre={`Les ${joyaux.length} emplacements, et ce que le jeu dessine`}>
        <div className="mc-grille">
          {p.montrees.map((o) => <Case key={o.cle} src={iconeDe(o)} nom={o.n} taille={28} />)}
        </div>
        <p className="mc-note">
          <b>{p.total} pièces</b> pour <b>{p.dessins} dessins</b> : les {s.sets.length} sets
          partagent leur apparence. Conséquence en jeu — <b>on ne peut pas voir sur quelqu&apos;un
          lequel il porte</b>, le nom n&apos;est que dans l&apos;infobulle, et c&apos;est le nom qui
          décide du bonus.
        </p>
      </Groupe>

      {/* ── 3. Les sets : le nom, le rôle, et les chiffres seulement s'ils sont sûrs ── */}
      <Groupe titre={`Les ${s.sets.length} sets ne visent pas le même jeu`}>
        <div className="mc-sets">
          {s.sets.map((x) => {
            const sur = surs.includes(x);
            return (
              <div key={x.nom} className="fx-card mc-set">
                <b>{x.nom}</b>
                <span className="mc-set-role">{x.role}</span>
                {/* LE CHIFFRE N'APPARAIT QUE S'IL EST DOUBLE-SOURCE. La boite du
                    jeu et la table du builder ne s'accordent pas sur tous les
                    sets ; publier les deux versions ferait deux verites pour un
                    seul set. On publie l'accord, on tait le desaccord. */}
                {sur ? <Bonus b={x.bonus} /> : (
                  <span className="mc-set-role" style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                    bonus non publié
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="mc-src">
          Un set n&apos;affiche ses valeurs que si la <b>boîte du jeu</b> et la <b>table du
          builder</b> annoncent les mêmes, en même nombre. Sur les autres, les deux sources ne
          disent pas la même chose : la page ne tranche pas et ne publie rien plutôt que de te faire
          viser un bonus qui n&apos;existe peut-être pas.
        </p>
      </Groupe>

      {/* ── 4. Le sertissage d'un costume : une famille par pièce ──────────── */}
      <Point titre="Le joyau dépend de la PIÈCE : un Grenat ne va que sur une coiffe" marque="piege">
        <p>
          C&apos;est le piège le plus simple du système, et le client ne le dit que dans une phrase
          d&apos;infobulle : aucune fenêtre ne le récapitule.
        </p>
        <div>
          {joyaux.map((j) => {
            const r = recetteDeJoyau(j.nom);
            return (
              <div key={j.nom} className="mc-etage">
                <span className="mc-etage-t">
                  <b>{j.nom}</b>
                  <span>{j.piece ? `pour les ${j.piece}` : ""}</span>
                </span>
                <span className="mc-etage-l">
                  <span className="mc-vignettes" style={{ marginBottom: 0 }}>
                    <Vignette src={j.img} legende={j.nom} />
                    <Vignette src={j.imgMorceau} legende={j.morceau?.n ?? "Morceau"} />
                  </span>
                  {j.stats.length > 0 && (
                    <span className="mc-grille">
                      {j.stats.map((st) => <Chip key={st} texte={st} />)}
                    </span>
                  )}
                  {r && (
                    <span className="mc-src">
                      Il se fabrique avec{" "}
                      <b>{r.entrants.map((e) => `${e.q ?? 1}× ${e.n}`).join(" + ")}</b>
                      {r.pnj ? <> chez <b>{r.pnj}</b></> : null}
                      {r.taux != null ? <>, {r.taux} % de réussite</> : null}.
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mc-src">
          Les statistiques ci-dessus sont celles que le coffret du jeu nomme, et il n&apos;en nomme
          pas d&apos;autres : <b>{joyaux[0]?.stats.length ?? 0} par pièce</b> là où le formulaire du
          site en propose {b.uniques.length} pour les {joyaux.length} emplacements. Demander
          « Attaque » sur des bottes, c&apos;est demander une gemme qui n&apos;existe pas.
        </p>
        <p className="mc-src">
          À côté du joyau brut, AirFlyff a posé des joyaux <b>nommés</b> qui forcent la statistique
          — même geste que sur les Diamants d&apos;arme. Ici, au moins, <b>le nom dit ce qu&apos;il
          fait</b> : « Grenat FOR » donne de la Force. Ce sont les gemmes d&apos;<i>arme</i> qui
          mentent, pas celles de costume.
        </p>
      </Point>

      {/* ── 5. Défaire : la seule réserve qui reste, parce qu'elle coûte cher ── */}
      <Point titre="Tu ne retires que la DERNIÈRE gemme posée, sans retour en arrière" marque="piege">
        {retrait && <p className="mc-cite">« {retrait.texte} »</p>}
        <p>
          Une erreur sur la <b>2<sup>e</sup></b> gemme d&apos;une pièce à {FASHION.gemmes}
          {" "}emplacements se paie en défaisant d&apos;abord la <b>4<sup>e</sup></b> et la
          {" "}<b>3<sup>e</sup></b>. On sertit donc les gemmes dont on est sûr <b>en dernier</b>,
          pas en premier — c&apos;est l&apos;inverse du réflexe, et le jeu ne le dit qu&apos;une
          fois, dans la fenêtre de retrait.
        </p>
        {parchemin && <LigneObjet o={parchemin} />}
      </Point>

      {/* ── 6. Les masques : le bonus se change sans rien perdre ───────────── */}
      <Point titre="Le bonus d'un masque se change sans rien perdre" marque="profit">
        <p>
          Deux séries existent — l&apos;<b>apparence</b> d&apos;un côté, le <b>bonus</b> de
          l&apos;autre. Les {masques.saveurs.length} effets tournent en boucle chez{" "}
          <b>{masques.couturier || "le Grand Couturier"}</b> :{" "}
          <b>{masques.rotations} transformations</b>
          {masques.tauxRotation.length === 1 && masques.tauxRotation[0] != null
            ? <>, toutes à <b>{masques.tauxRotation[0]} %</b></>
            : null}
          , et elles reviennent au point de départ.
        </p>
        <div style={{ display: "grid", gap: 6 }}>
          {masques.saveurs.map((o) => (
            <LigneObjet key={o.cle} o={o} sansPhrase apres={<Bonus b={o.b} />} />
          ))}
        </div>
        <div className="mc-grille">
          {masques.recolores.map((o) => (
            <Case key={o.cle} src={o.ic ? `/jeu/icones/${o.ic}` : null} nom={o.n.replace(/^Masque du dragon\s*/i, "")} taille={26} />
          ))}
        </div>
        <p className="mc-src">
          Le même masque existe en <b>{masques.recolores.length} recolorations</b> — même dessin,
          autre couleur — et{" "}
          {masques.sansBonus === masques.recolores.length
            ? <><b>aucune ne porte de bonus</b></>
            : <><b>{masques.sansBonus}</b> n&apos;en portent pas</>}
          . La couleur et le bonus <b>ne vivent pas sur le même objet</b>.
        </p>
      </Point>

      {/* ── 7. Le geste vraiment destructeur ───────────────────────────────── */}
      {melange && (
        <Point titre="Le mélange de costumes détruit ce qu'on y met" marque="piege">
          <p>
            On en met{" "}
            {melange.min > 0 ? <><b>{melange.min} à {melange.max}</b></> : <b>plusieurs</b>} et on
            en ressort <b>un seul, au hasard</b> parmi
            {" "}<b>{melange.sorties.length} résultats</b> — dont{" "}
            <b>{melange.avecBonus.length} seulement</b> sont des sets à bonus connu. Les autres sont
            des déguisements : écolier, chat, girafe, infirmière.
          </p>
          {melange.protection && <LigneObjet o={melange.protection} sansPhrase />}
          <p className="mc-src">
            La liste complète des {melange.sorties.length} sorties est dans <b>Les crafts</b> →
            « Les ateliers du jeu », avec les {melange.autresPanneaux} autres fenêtres de
            transformation. On ne la recopie pas : c&apos;est le même relevé.
          </p>
        </Point>
      )}

      {/* ── 8. L'éveil du costume ──────────────────────────────────────────── */}
      <Groupe titre={`Un costume s'éveille aussi : ${evFashion.total} parchemins, ${evFashion.lignes.length} statistiques`}>
        <Bareme
          lignes={evFashion.lignes.map((l) => [
            l.label || l.code,
            `R1 +${l.r1}${l.pourcent ? " %" : ""} · R2 +${l.r2}${l.pourcent ? " %" : ""}`,
          ] as [string, string])}
        />
        {evFashion.pasDouble.length > 0 && (
          <p className="mc-note">
            <b>R2 n&apos;est pas toujours le double de R1.</b>{" "}
            {evFashion.pasDouble.map((l) => (
              <span key={l.code}>
                Sur <b>{l.label || l.code}</b>, R2 vaut +{l.r2}{l.pourcent ? " %" : ""} au lieu de
                {" "}+{l.r1 * 2}{l.pourcent ? " %" : ""}.{" "}
              </span>
            ))}
            Les {evFashion.lignes.length - evFashion.pasDouble.length} autres doublent bien.
          </p>
        )}
        <p className="mc-src">
          Ce sont des éveils <b>fixes</b> : la ligne est connue d&apos;avance, il n&apos;y a rien à
          tirer. Et elle vaut moins que sur une pièce d&apos;équipement —{" "}
          {(() => {
            const f = evStuff.lignes.find((l) => l.code === "STR");
            const c = evFashion.lignes.find((l) => l.code === "STR");
            return f && c && c.r1 > 0
              ? <>une ligne de Force vaut <b>+{f.r1}</b> sur l&apos;équipement contre <b>+{c.r1}</b>
                {" "}sur un costume, soit {Math.round(f.r1 / c.r1)} fois moins</>
              : <>une même statistique vaut plus sur une pièce d&apos;équipement</>;
          })()}
          . Le costume complète, il ne remplace pas.
        </p>
      </Groupe>
    </>
  );
}
