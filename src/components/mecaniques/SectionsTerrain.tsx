import { Bareme, Point } from "./Blocs";
import { ARENE_ARMES, GVG_BAREME } from "./releves";

/**
 * CE QUE LES MÊMES FICHIERS DISENT DU TERRAIN.
 *
 * Ces quatre facettes ne parlent pas d'une pièce d'équipement : elles parlent de
 * ce qui arrive à un build en arène, de recettes qu'aucun PNJ ne propose, du
 * barème de la GvG et de la taxe des Chambres Secrètes. Elles viennent de la page
 * « Astuces de guilde », qui a fusionné ici.
 *
 * Pourquoi elles sont là, et pas ailleurs : l'arène EST une mécanique de build —
 * un calcul de dégâts juste en donjon est faux en GvG, ce qui est exactement le
 * genre de chose qu'on vient chercher sur cette page. Les trois autres n'ont pas
 * de page d'accueil ailleurs sur le site ; les perdre pour cause de rangement
 * aurait été le pire choix des trois. C'est signalé au fil principal : le jour où
 * /crafts et une page de GvG les accueilleront mieux, elles déménagent d'un bloc.
 *
 * Aucune de ces sections n'est calculée : ce sont des relevés de LECTURE, et
 * chacune garde sa réserve à l'écran. Rien ici ne doit se lire comme mesuré en
 * jeu.
 */

/* ═══ En arène, tu n'es pas le même ══════════════════════════════════════════ */

export function Arene() {
  return (
    <>
      <Point titre="Un build calculé en donjon ne vaut rien en JcJ" marque="profit">
        <p>
          Le serveur ne tient pas une table d&apos;équilibrage mais <b>deux</b> : une pour le JcE,
          une pour le JcJ. En arène, les coefficients d&apos;arme des classes légendaires
          <b> s&apos;effondrent</b> vers les valeurs de base, et la vitesse d&apos;attaque avec.
          Un calcul de dégâts fait avec les chiffres du builder est juste en donjon et
          <b> faux en GvG</b>.
        </p>
        <Bareme lignes={ARENE_ARMES} />
        <p className="mc-src">
          Les classes de tissu perdent aussi en défense (1,7 → 1,3), l&apos;Arbalétrier et la
          Sylphide un peu moins (1,7 → 1,5). Le Templier ne perd rien de sa défense.
        </p>
      </Point>

      <Point titre="Des compétences changent carrément de camp">
        <p>
          Certaines sont <b>quasi désactivées</b> en arène — facteur ramené à un dixième :
          la <b>Foudre divine</b> du prêtre, la <b>Tornade</b> de l&apos;Élémentaliste, et chez
          le Psykeeper l&apos;Explosion de mana, le Monde parallèle et la Nova psychique. Les
          lancer en GvG, c&apos;est perdre son tour.
        </p>
        <p>
          À l&apos;inverse, d&apos;autres <b>n&apos;existent qu&apos;en JcJ</b> et y frappent très
          fort : <b>Pile ou face</b> et <b>Vent de folie</b> de la Sylphide, <b>Eau bénite</b> du
          Primat, <b>Croix de Sang</b> du Spadassin, <b>Paume de Bouddha</b> du Chanoine,
          le <b>Fouet mental</b> du Psykeeper. Elles n&apos;apparaissent nulle part côté JcE :
          un joueur qui n&apos;a jamais fait d&apos;arène ne sait même pas qu&apos;elles comptent.
        </p>
        <p>
          Ce que ça dit pour une compo d&apos;arène : <b>les magiques et le Primat gardent leur
          puissance, les classes de vitesse la perdent</b>. Ce n&apos;est pas une impression de
          joueur, c&apos;est la seconde table.
        </p>
      </Point>

      <Point titre="La limite de ce constat" marque="verifier">
        <p>
          Relevé dans les fichiers du client d&apos;octobre 2025. Seules les formes Hero et les
          secondes classes ont un réglage JcJ dédié — les formes Master et Ultimate n&apos;en ont
          pas, ce qui veut dire qu&apos;on ne sait pas lesquelles retombent sur quelle valeur. À
          confronter à ce qu&apos;on constate en GvG avant d&apos;en faire une consigne de
          composition.
        </p>
      </Point>
    </>
  );
}

/* ═══ Ce qu'on ne farme pas ═════════════════════════════════════════════════ */

export function Farm() {
  return (
    <>
      <p className="mc-chapo">
        Une recette peut vivre dans les fichiers du jeu sans qu&apos;aucun PNJ ne l&apos;affiche :
        l&apos;équipe éteint un craft en commentant une seule ligne, sans supprimer la recette.
        Résultat, on lit la recette quelque part, on farme les composants, et le menu
        n&apos;existe pas. Voilà celles qui sont dans ce cas.
      </p>

      <Point titre="Toute la filière PvP est éteinte" marque="piege">
        <p>
          Le <b>Masque PvP</b> (chez Bibi la Bicrave) et le <b>Mantra Ravageur / Dueliste</b>
          (chez le Sage des Mantras) ont leur recette complète dans le fichier — et la ligne
          qui les propose au PNJ est <b>commentée</b>. Les paliers 3 des mantras sont
          commentés en entier. Le <b>démontage des armes vampiriques</b> est éteint de la
          même façon.
        </p>
        <p>
          Et les recettes PvP coûtent le <b>double</b> de leurs équivalents PvE en
          matériaux. Quelqu&apos;un qui suit un guide trouvé ailleurs peut farmer des semaines
          pour un objet qu&apos;il ne pourra pas fabriquer.
        </p>
      </Point>

      <Point titre="Quatre coffrets du Couturier partagent la même recette" marque="piege">
        <p>
          Chez <b>Karlagarfeld</b>, les coffrets « dragon immortel », « dragon fulgurant »,
          « farmeur » et « raréfaction pré-mythique » demandent <b>exactement</b> les mêmes
          composants et portent en plus <b>le même identifiant de libellé</b>. En jeu, seul
          le premier bloc rencontré est probablement atteignable. Avant que quelqu&apos;un mette
          cent-vingt tissus de cape dans un coffret « farmeur », il faut qu&apos;un membre ait
          vu le coffret sortir.
        </p>
      </Point>

      <Point titre="Deux recettes que personne ne peut lancer">
        <p>
          La <b>Statuette de Kailun</b> (les six morceaux de statue) et surtout les deux
          <b> Buffs de Guilde</b> — celui qui donne <b>+7 % de dégâts PvE à toute la
          guilde</b> et celui qui donne <b>+7 % de PV</b> — ont leur recette écrite, mais
          <b> aucun PNJ ne les propose</b> dans ce client. Ça vaut la peine de demander au
          staff du serveur si c&apos;est voulu : c&apos;est le seul buff de guilde craftable du jeu.
        </p>
      </Point>

      <Point titre="Le nom du PNJ des échanges de matériaux" marque="profit">
        <p>
          Les échanges « 9 999 branches → Périns » ne sont pas chez « Changori » comme le
          répètent les guides : le PNJ s&apos;appelle <b>Angie</b>. Et la ligne qui vaut le coup
          chez elle n&apos;est pas une branche : <b>100 Orichalques + 100 Pierres Lunaires
          donnent 20 Orichalques Scintillants</b>, le matériau de toute la filière ultime.
        </p>
      </Point>
    </>
  );
}

/* ═══ La GvG se gagne aux points ════════════════════════════════════════════ */

export function Gvg() {
  return (
    <>
      <Point titre="Le barème, tel que le panneau du jeu l'affiche" marque="profit">
        <Bareme lignes={GVG_BAREME} />
        <p>
          Deux conséquences que personne ne tire spontanément. La première : un ennemi
          <b> jamais battu par toi</b> vaut trois points, le même ennemi retué n&apos;en vaut que
          deux — donc on <b>répartit les cibles</b> au lieu de s&apos;acharner sur celui qui
          tombe le plus vite. La seconde : <b>une résurrection non consommée rapporte un
          point</b>. Mourir pour rien coûte deux fois, une fois en points donnés, une fois
          en point perdu.
        </p>
        <p className="mc-src">
          Départage, dans cet ordre : total de points, puis total des résurrections
          restantes, puis le plus bas niveau parmi les survivants.
        </p>
      </Point>

      <Point titre="Le cadre, à connaître avant l'entrée">
        <ul>
          <li><b>Trente minutes</b> de combat, <b>groupes et bienfaits annulés</b> à l&apos;entrée.</li>
          <li>Les <b>cinq premiers de la file</b> ouvrent le combat ; quand l&apos;un meurt le suivant entre, et le mort <b>repart en dernier</b> — l&apos;ordre de la file est une décision tactique, pas un détail.</li>
          <li><b>Dix résurrections</b> par joueur, pas plus.</li>
          <li>Le maître de guilde rapporte des points bonus quand il tue ; le <b>défenseur en donne à l&apos;adversaire en mourant</b>.</li>
          <li>Inscriptions closes à <b>20 h</b>, compositions à <b>21 h</b>, entrées dans l&apos;arène à <b>21 h 07</b>. Mise minimale : <b>100 millions de penyas</b>.</li>
          <li>Annuler l&apos;inscription coûte <b>20 % de la mise</b> ; ne pas être retenue, <b>2 %</b>.</li>
        </ul>
      </Point>

      <Point titre="La faute qui coûte les récompenses" marque="piege">
        <p>
          Le panneau du jeu le dit et personne ne le lit : il faut
          <b> assez de place libre dans le coffre de guilde AVANT d&apos;entrer</b>. Les
          récompenses de première place sont volumineuses — dix capes pour la guilde, plus
          par participant des jetons rouges, une cape de participation et une Pièce de
          Guerre de Guilde. Un coffre plein le soir de la GvG, c&apos;est un mois de préparation
          qui n&apos;entre pas.
        </p>
        <p className="mc-src">
          Le bienfait de la guilde gagnante dure une semaine : PV +10 %, Parade +5 %,
          Blocage en mêlée et à distance +5 %. Deux victoires de suite le doublent.
        </p>
      </Point>
    </>
  );
}

/* ═══ La taxe ne se fixe qu'une fois ════════════════════════════════════════ */

export function Taxe() {
  return (
    <>
      <Point titre="Une seule occasion de choisir, et elle passe vite" marque="piege">
        <p>
          La guilde qui domine une région des Chambres Secrètes fixe une taxe
          <b> entre 5 % et 20 %</b>, sur les ventes <i>et</i> sur les achats aux PNJ de la
          zone. Si elle ne la fixe pas, elle est de <b>5 % par défaut</b>. Et surtout :
          <b> une fois définie, elle ne peut plus être changée</b>.
        </p>
        <p>
          C&apos;est donc une décision à prendre <b>en réunion, avant</b>, pas dans la fenêtre du
          PNJ le soir de la victoire. Une taxe à 20 % rapporte plus par transaction et
          pousse les joueurs à aller vendre ailleurs ; à 5 % elle passe inaperçue. On ne
          peut pas essayer les deux.
        </p>
      </Point>

      <Point titre="Où va l'argent">
        <p>
          Les taxes se répartissent <b>45 % à la guilde dominante, 45 % au Souverain,
          10 % au serveur</b>, et arrivent <b>par courrier au maître de guilde à minuit</b>.
          La <b>région Est</b> (Flaris, Saint Morning, Jardin de Rhisis, Tour Oubliée)
          encaisse en plus les inscriptions de la Tour Oubliée — c&apos;est la région qui vaut
          le plus, et ce n&apos;est écrit nulle part ailleurs.
        </p>
        <p className="mc-src">
          Côté Ouest (Darkon 1, 2, 3), le gain est autre : une zone de chasse réservée aux
          membres, et tous les autres joueurs de la zone téléportés à Darkon le lundi à
          minuit. La guilde occupe la région du lundi minuit au dimanche suivant.
        </p>
      </Point>

      <Point titre="Le coût de l'inscription elle-même">
        <p>
          Annuler son inscription coûte <b>20 % de la mise</b> ; ne pas être retenue parmi
          les huit plus fortes mises, <b>2 %</b>. Et les <b>huit guildes retenues ne sont pas
          remboursées</b> : la mise est dépensée, gagnée ou perdue. Il faut aussi que le
          <b> maître de guilde participe</b> — pas seulement qu&apos;il inscrive.
        </p>
      </Point>
    </>
  );
}
