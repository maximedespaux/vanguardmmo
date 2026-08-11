import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { VoletSections, EnteteVolet, type SectionVolet } from "@/components/VoletSections";
import { CarteFx } from "@/components/astuces/CarteFx";

/**
 * LES ASTUCES QU'ON NE PUBLIE PAS.
 *
 * Le guide public (/astuces) dit comment progresser : il est fait pour être
 * trouvé par un moteur de recherche, c'est par là qu'un joueur découvre la
 * guilde. Cette page-ci dit autre chose — ce qu'on a relevé dans les fichiers
 * du client et qui donne un avantage : des noms d'objets qui mentent sur leur
 * effet, un plafond de sertissage que personne n'annonce, des recettes éteintes
 * pour lesquelles on farme dans le vide, et la deuxième table d'équilibrage qui
 * fait qu'un build d'arène n'est pas un build de donjon.
 *
 * CETTE PAGE EST UN COMPOSANT SERVEUR, VOLONTAIREMENT.
 * Le garde du groupe `(guild)` (requireGuild) ne protège que le rendu côté
 * serveur. Si on écrivait `"use client"` ici, tout le texte ci-dessous partirait
 * dans un fichier JS statique de /_next/static/, servi à qui connaît l'adresse,
 * sans repasser par le moindre contrôle : la porte fermée et la fenêtre ouverte.
 * L'interactivité passe donc par des composants clients qui ne portent AUCUN
 * texte (VoletSections reçoit son contenu en props, CarteFx ne fait que poser le
 * halo). Si un jour cette page a besoin d'un état, on ajoute une coquille
 * cliente — on ne convertit pas la page.
 *
 * Aucune route /api : il n'y a rien à charger, donc rien de plus à garder.
 * Le jour où il en faudra une, elle portera son propre apiGuild().
 */
export const metadata: Metadata = {
  title: "Astuces de guilde — Vanguard",
  // Réservée : on ne veut ni la voir dans un moteur de recherche, ni la voir
  // résumée dans un aperçu de lien collé sur un Discord public.
  robots: { index: false, follow: false },
};

/** Un point de la page : le constat, puis ce qu'on en fait. */
function Point({ titre, children, marque }: { titre: React.ReactNode; children: React.ReactNode; marque?: "verifier" | "profit" | "piege" }) {
  const M = {
    verifier: { t: "À confirmer en jeu", c: "var(--gold)" },
    profit: { t: "À notre avantage", c: "var(--green)" },
    piege: { t: "Piège coûteux", c: "var(--red)" },
  };
  const m = marque ? M[marque] : null;
  return (
    <div className="ag-point">
      <h4>
        {titre}
        {m && <span className="ag-marque" style={{ color: m.c, borderColor: m.c }}>{m.t}</span>}
      </h4>
      <div className="ag-corps">{children}</div>
    </div>
  );
}

/** Deux colonnes : ce que tu lis à gauche, ce que c'est vraiment à droite. */
function Deux({ lignes, gauche, droite }: { lignes: [React.ReactNode, React.ReactNode, boolean?][]; gauche: string; droite: string }) {
  return (
    <div className="ag-deux">
      <div className="ag-deux-tete"><span>{gauche}</span><span>{droite}</span></div>
      {lignes.map((l, i) => (
        <div key={i} className={`ag-deux-l ${l[2] ? "ok" : ""}`}>
          <span>{l[0]}</span>
          <span>{l[1]}{l[2] && <Icon name="check" size={13} style={{ marginLeft: 6, color: "var(--green)" }} />}</span>
        </div>
      ))}
    </div>
  );
}

/** Une image du jeu, légendée. Toutes vérifiées présentes dans public/jeu/. */
function Vignette({ src, legende }: { src: string; legende: string }) {
  return (
    <span className="ag-vignette">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" />
      <i>{legende}</i>
    </span>
  );
}

/** Le barème d'un geste : libellé à gauche, points à droite. */
function Bareme({ lignes }: { lignes: [string, string][] }) {
  return (
    <div className="ag-bareme">
      {lignes.map(([l, v]) => (
        <div key={l}><span>{l}</span><b>{v}</b></div>
      ))}
    </div>
  );
}

const SOURCE = "Relevé dans les fichiers du client d'octobre 2025.";

export default function AstucesGuildePage() {
  const sections: SectionVolet[] = [

    // ── 1 ──────────────────────────────────────────────────────────────────
    {
      clef: "gemmes",
      titre: "Les gemmes mentent",
      sous: "7 noms sur 9 ne donnent pas ce qu'ils annoncent",
      icon: "gem",
      compte: 9,
      contenu: (
        <>
          <Point titre="Le nom de la gemme et son effet réel ne correspondent plus" marque="profit">
            <p>
              Sertir une arme ultime demande une arme <b>+6 au minimum</b> ; le joyau brut tire
              une statistique <b>au hasard parmi neuf</b>, et chaque joyau du même type
              renforce toujours la même. À côté du joyau brut, le jeu vend neuf gemmes
              <b> nommées</b> qui, elles, forcent la statistique — c&apos;est la seule façon de
              choisir ce qu&apos;on obtient.
            </p>
            <p>
              Sauf que <b>sept de ces neuf noms sont faux</b>. AirFlyff a changé l&apos;ordre des
              neuf statistiques dans son fichier de données sans jamais retoucher les textes
              d&apos;objets, restés sur l&apos;ordre du Flyff d&apos;origine. Le nom que tu lis dans
              l&apos;infobulle décrit donc l&apos;effet d&apos;une <i>autre</i> gemme.
            </p>
            <Deux
              gauche="Ce que dit l'infobulle"
              droite="Ce que la gemme donne"
              lignes={[
                ["Topaze de maîtrise", "PV max"],
                ["Topaze de vengeance", "Attaque"],
                ["Topaze de vie", "Défense"],
                ["Topaze de brutalité", "Siphon de vie (mêlée)"],
                ["Topaze de fureur", "Dégâts JcJ"],
                ["Topaze de puissance", "Force"],
                ["Topaze de force", "Endurance"],
                ["Topaze de dextérité", "Dextérité", true],
                ["Topaze d'intelligence", "Intelligence", true],
              ]}
            />
            <p className="ag-src">
              L&apos;exemple est pris sur la Topaze, mais le décalage est identique sur le Rubis,
              le Saphir, l&apos;Émeraude et le Diamant : c&apos;est le même rang 01→09 dans les cinq
              familles. Le joyau à employer dépend du niveau de l&apos;arme — Topaze 60-70,
              Rubis 71-85, Saphir 86-100, Émeraude 101-119, Diamant 120.
            </p>
          </Point>

          <div className="ag-vignettes">
            <Vignette src="/jeu/mecaniques/gemme-topaze.webp" legende="Topaze" />
            <Vignette src="/jeu/mecaniques/gemme-rubis.webp" legende="Rubis" />
            <Vignette src="/jeu/mecaniques/gemme-saphir.webp" legende="Saphir" />
            <Vignette src="/jeu/mecaniques/gemme-emeraude.webp" legende="Émeraude" />
            <Vignette src="/jeu/mecaniques/gemme-diamant.webp" legende="Diamant" />
          </div>

          <Point titre="Ce qu'on en fait, concrètement">
            <p>
              Tu veux des <b>PV</b> ? Prends celle « de maîtrise ». De la <b>Force</b> ? Celle
              « de puissance ». De l&apos;<b>Endurance</b> ? Celle « de force ». Et quand tu as le
              choix, prends l&apos;un des <b>neuf Diamants ajoutés par AirFlyff</b> : leurs
              libellés, eux, disent ce qu&apos;ils font (« Diamant — sertissage en attaque »,
              « … en siphon de vie »…) et suivent exactement l&apos;ordre du fichier. C&apos;est aussi
              la preuve que c&apos;est bien le fichier qui fait loi, pas l&apos;infobulle.
            </p>
            <p className="ag-src">
              En cas d&apos;échec du sertissage (90 % de réussite annoncés), seul le joyau est
              perdu — l&apos;arme ne risque rien. C&apos;est la seule opération de la forge dans ce cas.
            </p>
          </Point>

          <Point titre="Avant d'en faire une règle" marque="verifier">
            <p>
              {SOURCE} Le serveur peut avoir été corrigé depuis. Que le premier qui sertit une
              gemme nommée dise dans le vocal ce qu&apos;il a réellement obtenu : deux
              confirmations et on grave, une contradiction et on retire cette section.
            </p>
          </Point>
        </>
      ),
    },

    // ── 2 ──────────────────────────────────────────────────────────────────
    {
      clef: "plafonds",
      titre: "Les plafonds cachés",
      sous: "Le sertissage va à 8, l'amélioration à +30",
      icon: "sparkles",
      compte: null,
      contenu: (
        <>
          <Point titre="Une arme Artefact +20 accepte huit gemmes, pas cinq" marque="profit">
            <div className="ag-cote">
              <Vignette src="/jeu/mecaniques/artefact-diamant-holographique.webp" legende="Diamant holographique" />
              <p>
                Topaze, Rubis, Saphir et Émeraude plafonnent bien à <b>cinq</b> gemmes. Le
                <b> Diamant</b>, non : il a trois paliers de plus, et chacun rapporte autant que
                le cinquième. Ce qui les débloque porte un nom dans le jeu — le
                <b> Diamant holographique</b>, « permettant le sertissage de 6 à 8 sur vos armes
                Artefact +20 », qui tombe <b>sur le boss du Jardin des Rois</b>.
              </p>
            </div>
            <p>
              Conséquence directe : toute comparaison de build faite sur cinq gemmes
              <b> sous-estime le haut du jeu de trois paliers</b>. Quand on compare le stuff d&apos;un
              inscrit à un build de référence, c&apos;est là que l&apos;écart se creuse pour de bon.
            </p>
          </Point>

          <Point titre="Et l'échelle d'amélioration ne s'arrête pas à +20">
            <p>
              Les <b>parures du Bastion de l&apos;Archange</b> montent de <b>+21 à +30</b>, avec les
              Pierres d&apos;amélioration de parure (DPS ou Tank) et le Parchemin
              <b> Aprotect Lunaire</b>. Le passage obligé pour tout le haut niveau est le même
              PNJ : <b>Donjon Luca</b>, qui échange contre des Médailles de Donjon
              l&apos;Orichalque Scintillant pure (Artefact +11 → +20), la Roche lunaire (perçage
              d&apos;Artefact) et les quatre parchemins de protection.
            </p>
            <p className="ag-src">
              Il existe aussi cinq <b>Parchemins d&apos;Enchantement Absolu +6 à +10</b> :
              « améliorer une arme ou une armure à +X à coup sûr, sans objet de protection ».
              Quand un membre en a un, il vaut mieux le garder pour le palier qui casse.
            </p>
          </Point>

          <Point titre="Ce que les parchemins ajoutent vraiment">
            <p>
              Les taux affichés sont des <b>bonus</b>, pas des probabilités de base : Sfusion
              donne +10 % jusqu&apos;à +7, Sfusion X garantit la réussite jusqu&apos;à +7, les
              parchemins d&apos;amélioration (S) 100 % de +3 à +6, (V) 50 % de +7 à +8, (P) 30 %
              sur un +9. Le taux de base, lui, <b>n&apos;est écrit nulle part dans le client</b> —
              on ne le publiera donc pas, et personne ne devrait le citer de mémoire.
            </p>
          </Point>
        </>
      ),
    },

    // ── 3 ──────────────────────────────────────────────────────────────────
    {
      clef: "arene",
      titre: "En arène, tu n'es pas le même",
      sous: "Le serveur a une seconde table d'équilibrage",
      icon: "swords",
      compte: null,
      contenu: (
        <>
          <Point titre="Un build calculé en donjon ne vaut rien en JcJ" marque="profit">
            <p>
              Le serveur ne tient pas une table d&apos;équilibrage mais <b>deux</b> : une pour le
              JcE, une pour le JcJ. En arène, les coefficients d&apos;arme des classes légendaires
              <b> s&apos;effondrent</b> vers les valeurs de base, et la vitesse d&apos;attaque avec.
              Un calcul de dégâts fait avec les chiffres du builder est juste en donjon et
              <b> faux en GvG</b>.
            </p>
            <div className="ag-bareme">
              <div><span>Arbalétrier</span><b>vitesse ÷ 3,3 · arc ÷ 4</b></div>
              <div><span>Sylphide</span><b>vitesse ÷ 1,6 · yoyo ÷ 4</b></div>
              <div><span>Templier, Spadassin</span><b>arme ÷ 3,6 environ</b></div>
              <div><span>Chanoine</span><b>poing ÷ 2,3</b></div>
              <div><span>Arcaniste, Envoûteur</span><b>rien : identique</b></div>
              <div><span>Primat</span><b>il y gagne un peu</b></div>
            </div>
            <p className="ag-src">
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
              À l&apos;inverse, d&apos;autres <b>n&apos;existent qu&apos;en JcJ</b> et y frappent très fort :
              <b> Pile ou face</b> et <b>Vent de folie</b> de la Sylphide, <b>Eau bénite</b> du
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
              {SOURCE} Seules les formes Hero et les secondes classes ont un réglage JcJ dédié —
              les formes Master et Ultimate n&apos;en ont pas, ce qui veut dire qu&apos;on ne sait pas
              lesquelles retombent sur quelle valeur. À confronter à ce qu&apos;on constate en GvG
              avant d&apos;en faire une consigne de composition.
            </p>
          </Point>
        </>
      ),
    },

    // ── 4 ──────────────────────────────────────────────────────────────────
    {
      clef: "farm",
      titre: "Ce qu'on ne farme pas",
      sous: "Des recettes existent mais aucun PNJ ne les propose",
      icon: "ban",
      compte: null,
      contenu: (
        <>
          <p className="ag-chapo">
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
      ),
    },

    // ── 5 ──────────────────────────────────────────────────────────────────
    {
      clef: "runes",
      titre: "Deux runes à ne pas payer",
      sous: "Le fichier ne dit pas ce que le nom promet",
      icon: "rune",
      compte: 2,
      contenu: (
        <>
          <div className="ag-cote">
            <Vignette src="/jeu/mecaniques/rune-tank.webp" legende="Rune TANK" />
            <Point titre="La Rune Glaive Luzaka oubliée (TANK) n'est pas une rune tank" marque="piege">
              <p>
                Neuf des dix runes TANK de la gamme Luzaka donnent <b>PV max % +20 et
                Endurance +20</b>. La dixième, celle du <b>glaive</b>, donne
                <b> Intelligence +20 et Vitesse d&apos;incantation +20</b> :
                c&apos;est le bloc de la version SUPPORT resté collé là. Ce n&apos;est pas une erreur de
                lecture, le fichier porte bien les deux mauvaises statistiques.
              </p>
              <p>
                Elle se vendra pourtant au prix des autres runes TANK, parce que son nom est le
                même. Un Templier au glaive qui la grave a payé une rune de prêtre.
              </p>
            </Point>
          </div>

          <div className="ag-cote">
            <Vignette src="/jeu/mecaniques/rune-arme-vampirique.webp" legende="Rune vampirique" />
            <Point titre="La Doloire Vampirique n'a aucun bonus dans le fichier" marque="verifier">
              <p>
                C&apos;est le seul trou de la gamme vampirique : ni nom français, ni colonnes de
                statistiques. Tant que personne n&apos;a lu ses bonus en jeu, elle ne vaut
                <b> rien de prouvé</b> — et surtout pas le prix des neuf autres.
              </p>
            </Point>
          </div>

          <Point titre="Et un doublon qui traîne">
            <p>
              La « <b>[Tenue &amp; Cape] Rune de force</b> » existe deux fois, dont une classée
              parmi les <b>runes d&apos;arme</b> avec les bonus de la rune de tenue. Deux objets
              différents, un seul nom : de quoi se tromper à l&apos;achat comme à la vente.
            </p>
          </Point>

          <p className="ag-src">
            Pour mémoire, il y a <b>68 runes</b> dans le jeu, pas quatre : armes (par modèle
            d&apos;arme), ramasseur, familier, tenue &amp; cape, et deux familles Baruna. Les runes
            Baruna ne donnent pas de statistique mais un <b>effet déclenché</b> — la Rune du
            néant tue d&apos;un coup, avec 10 % de chances de se graver ; les cinq autres se gravent
            à 25 %.
          </p>
        </>
      ),
    },

    // ── 6 ──────────────────────────────────────────────────────────────────
    {
      clef: "gvg",
      titre: "La GvG se gagne aux points",
      sous: "Le barème exact, et ce qu'il impose",
      icon: "trophy",
      compte: null,
      contenu: (
        <>
          <Point titre="Le barème, tel que le panneau du jeu l'affiche" marque="profit">
            <Bareme lignes={[
              ["Vaincre un ennemi", "+2"],
              ["… que ce joueur n'avait jamais battu", "+1"],
              ["… en étant maître de guilde", "+1"],
              ["… quand c'est un défenseur", "+1"],
              ["… qui n'a plus de résurrection", "+1"],
              ["Chaque résurrection qu'il te reste à la fin", "+1"],
            ]} />
            <p>
              Deux conséquences que personne ne tire spontanément. La première : un ennemi
              <b> jamais battu par toi</b> vaut trois points, le même ennemi retué n&apos;en vaut que
              deux — donc on <b>répartit les cibles</b> au lieu de s&apos;acharner sur celui qui
              tombe le plus vite. La seconde : <b>une résurrection non consommée rapporte un
              point</b>. Mourir pour rien coûte deux fois, une fois en points donnés, une fois
              en point perdu.
            </p>
            <p className="ag-src">
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
            <p className="ag-src">
              Le bienfait de la guilde gagnante dure une semaine : PV +10 %, Parade +5 %,
              Blocage en mêlée et à distance +5 %. Deux victoires de suite le doublent.
            </p>
          </Point>
        </>
      ),
    },

    // ── 7 ──────────────────────────────────────────────────────────────────
    {
      clef: "taxe",
      titre: "La taxe ne se fixe qu'une fois",
      sous: "Chambres Secrètes : une décision sans retour",
      icon: "coins",
      compte: null,
      contenu: (
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
            <p className="ag-src">
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
      ),
    },
  ];

  return (
    <div style={{ padding: "24px 32px 56px", maxWidth: 1300, margin: "0 auto" }}>
      <PageHeader
        icon="lock"
        title="Astuces de guilde"
        subtitle="Ce qu'on a trouvé dans les fichiers du jeu et qu'on ne met pas sur la page publique."
      />

      {/* Le halo des cartes, sans rendre la page cliente (cf. CarteFx). */}
      <CarteFx>
        <VoletSections
          sections={sections}
          entete={
            <EnteteVolet
              icon="eye"
              titre="Ça reste entre nous"
              marque={{ texte: "Ne pas diffuser", couleur: "var(--red)" }}
              sous={
                <>
                  Rien ici n&apos;est un secret volé : tout sort des fichiers du client, que
                  n&apos;importe qui peut ouvrir. Ce qui a de la valeur, c&apos;est <b>de l&apos;avoir
                  lu</b> — un nom de gemme qui ment, un plafond de sertissage que personne
                  n&apos;annonce, une recette éteinte pour laquelle d&apos;autres farment encore.
                  Recopié sur un Discord public, cet avantage disparaît en une soirée, et
                  les anomalies seront corrigées avant qu&apos;on en ait profité.
                  {" "}<b>Le guide public reste public ; cette page-ci ne se copie pas.</b>
                </>
              }
            />
          }
        />
      </CarteFx>

      <p className="ag-pied">
        Tout ce qui est écrit ici a été relevé dans les fichiers du client d&apos;octobre 2025,
        jamais estimé. Ce qui porte la mention <b>« À confirmer en jeu »</b> ne l&apos;a pas encore
        été : le serveur peut avoir été corrigé depuis, et un fichier ne dit pas si le PNJ est
        posé sur la carte. Si tu constates l&apos;inverse de ce qui est écrit là, dis-le — une
        astuce fausse coûte plus cher qu&apos;une astuce absente.
      </p>

      <style>{`
        .ag-point { background:var(--bg-3); border-radius:10px; padding:14px 16px; margin-bottom:11px;
          border-left:2px solid var(--orange-dark); }
        .ag-point h4 { font-family:'Rubik',sans-serif; font-weight:700; font-size:14.5px; color:var(--orange);
          margin:0 0 8px; display:flex; align-items:center; gap:9px; flex-wrap:wrap; line-height:1.4; }
        .ag-corps { display:grid; gap:9px; font-size:13.5px; line-height:1.62; color:var(--text); }
        .ag-corps p { margin:0; }
        .ag-corps b { color:var(--text); }
        .ag-corps ul { margin:0; padding-left:19px; display:grid; gap:7px; }
        .ag-corps li { line-height:1.6; }
        .ag-src { font-size:12px; color:var(--text-muted); line-height:1.55; }
        .ag-src b { color:var(--text-muted); }
        .ag-chapo { font-size:13.5px; line-height:1.62; color:var(--text-muted); margin:0 0 12px; }
        /* La pastille dit d'un coup d'oeil si la ligne est un avantage a prendre,
           un piege a eviter, ou une chose qu'on n'a pas encore verifiee. Sans
           elle, tout se lit avec la meme confiance — c'est justement le probleme
           qu'on veut eviter sur une page tiree de fichiers. */
        .ag-marque { font-size:10.5px; text-transform:uppercase; letter-spacing:1px; font-weight:700;
          padding:2px 8px; border-radius:4px; border:1px solid currentColor; white-space:nowrap; }
        /* « Ce que tu lis » / « ce que c'est » : deux colonnes, et la coche verte
           sur les deux seules lignes qui ne mentent pas. Les chiffres et les noms
           s'alignent (tabular-nums) pour qu'on suive la ligne du regard. */
        .ag-deux { display:grid; gap:3px; font-variant-numeric:tabular-nums; }
        /* minmax(0,1fr) et non 1fr : un « 1fr » nu garde min-content pour
           minimum, donc un libelle un peu long pousse la ligne hors du panneau
           au lieu de se replier. Le piege se voit sur telephone seulement. */
        .ag-deux-tete, .ag-deux-l { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:10px; padding:7px 11px; }
        .ag-deux-tete { font-size:10.5px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted);
          font-family:'Rubik',sans-serif; font-weight:700; padding-bottom:2px; }
        .ag-deux-l { background:var(--bg-2); border:1px solid var(--border); border-radius:8px; font-size:12.5px; }
        .ag-deux-l > span:first-child { color:var(--text-muted); text-decoration:line-through;
          text-decoration-color:var(--red); text-decoration-thickness:1px; }
        .ag-deux-l > span:last-child { color:var(--gold); font-weight:600; display:flex; align-items:center; }
        .ag-deux-l.ok > span:first-child { text-decoration:none; color:var(--text); }
        .ag-deux-l.ok > span:last-child { color:var(--green); }
        .ag-bareme { display:grid; gap:5px; font-variant-numeric:tabular-nums; }
        .ag-bareme > div { display:flex; align-items:center; justify-content:space-between; gap:12px;
          background:var(--bg-2); border:1px solid var(--border); border-radius:8px; padding:8px 12px; font-size:12.5px; }
        .ag-bareme > div > span { color:var(--text-muted); min-width:0; }
        .ag-bareme > div > b { color:var(--gold); font-family:'Rubik',sans-serif; white-space:nowrap; }
        .ag-vignettes { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:11px; }
        .ag-vignette { display:inline-flex; align-items:center; gap:7px; background:var(--bg-3);
          border:1px solid var(--border); border-radius:8px; padding:6px 10px; flex-shrink:0; }
        .ag-vignette img { width:26px; height:26px; object-fit:contain; }
        .ag-vignette i { font-style:normal; font-size:11.5px; color:var(--text-muted); white-space:nowrap; }
        /* Une vignette a cote d'un bloc de texte. En dessous de 560 px la
           vignette passe au-dessus : a deux colonnes le texte tombe a quatre
           mots par ligne et devient illisible. */
        .ag-cote { display:flex; align-items:flex-start; gap:12px; margin-bottom:11px; }
        .ag-cote > .ag-point { flex:1; min-width:0; margin-bottom:0; }
        .ag-cote > p { flex:1; min-width:0; margin:0; font-size:13.5px; line-height:1.62; }
        @media(max-width:560px){ .ag-cote { flex-direction:column; } }
        .ag-pied { max-width:820px; margin:20px auto 0; font-size:12.5px; line-height:1.65;
          color:var(--text-muted); text-align:center; font-style:italic; }
      `}</style>
    </div>
  );
}
