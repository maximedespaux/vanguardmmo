import Link from "next/link";
import { reglagesDeSlot } from "@/lib/specsFlyff";
import { Bonus, Case, Chip, Groupe, LigneObjet, Point, Vignette, grille, note } from "./Blocs";
import {
  costumesQuiPaientSeuls, eveilFixe, gemmesCostumeDuBuilder, joyauxDeCostume, masquesDuDragon,
  melangeDeCostumes, objet, panneau, piecesDeFashion, recetteDeJoyau, setsDeFashion, teintures,
} from "./releves";

/**
 * LE COSTUME — la facette que le site n'expliquait nulle part.
 *
 * Le mot « fashion » traversait quatre fichiers de code (`specsFlyff`,
 * `ObjetSurMesure`, l'atelier des crafts, la planche des mécaniques) et aucune
 * page ne disait ce que c'était. On composait donc des commandes « fashion avec
 * 4 gemmes » sans que personne ne puisse répondre à la première question du
 * joueur : est-ce que ça compte dans mes statistiques, ou est-ce que c'est du
 * déguisement ?
 *
 * D'OÙ L'ORDRE DE CETTE SECTION : ce sont des QUESTIONS, pas des tables. Chaque
 * bloc pose celle qu'on se pose devant l'atelier, y répond avec le chiffre et sa
 * source, et dit franchement « le fichier ne le dit pas » quand c'est le cas. Un
 * bloc sans réponse mais avec la question posée vaut mieux qu'un bloc qui
 * comble : sur un costume, l'opération est irréversible et une devinette coûte
 * la pièce.
 *
 * TROIS SOURCES SE CROISENT ICI, et il faut savoir laquelle parle :
 *   · `objets-fiches.json` — ce que le client ÉCRIT sur l'objet (les noms, les
 *     phrases d'infobulle) ;
 *   · `airbuilder/data.json` — ce que le moteur du builder CHIFFRE (les valeurs
 *     de gemme, les bonus de set) ;
 *   · `crafts.json` — les panneaux d'aide des fenêtres de transformation, seule
 *     source sur ce qu'une opération DÉTRUIT.
 * Là où deux sources se recoupent, l'accord est dit ; là où elles divergent, la
 * page montre les deux au lieu de choisir. Cette section ne tranche jamais entre
 * deux fichiers.
 */

/** Les emplacements de gemme d'une pièce de costume, pris à la table de vérité
 *  du site — celle qui sert aussi à composer les commandes sur mesure. On ne le
 *  réécrit pas ici : deux chiffres pour un seul fait finiraient par diverger. */
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
  const pose = panneau(/composition de gemmes de costume/i);
  const parchemin = objet("II_GEN_MAT_COSTUME_GEM_CANCEL");
  const nommees = joyaux.reduce((n, j) => n + j.nommees.length, 0);
  const seuls = costumesQuiPaientSeuls();
  const teinture = teintures();
  /** Les sets que le jeu et la table du site décrivent différemment : un chiffre
   *  du site absent de la phrase du jeu. */
  const discordants = s.sets.filter((x) => x.annonce && !x.toutesRetrouvees);

  return (
    <>
      <p className="mc-chapo">
        Un costume se porte par-dessus l&apos;armure et ne la remplace pas : les
        {" "}<b>{joyaux.length} emplacements</b> ci-dessous s&apos;ajoutent à ta tenue au lieu de
        s&apos;y substituer. Ce qui suit répond aux questions dans l&apos;ordre où on se les pose
        devant l&apos;atelier — et chaque chiffre porte sa source.
      </p>

      {/* ── 1. La question qui décide de tout le reste ─────────────────────── */}
      <Point titre="Est-ce que ça compte dans mes statistiques, ou c'est du déguisement ?" marque="profit">
        <p>
          Ça compte — mais sur <b>ces {s.sets.length} sets</b>, <b>pas la pièce</b>. Sur les
          {" "}{p.total} pièces qui les composent,{" "}
          <b>{p.avecBonus === 0 ? "aucune ne porte de ligne de bonus" : `${p.avecBonus} portent une ligne de bonus`}</b> :
          une couronne ou des bottes du Roi Dragon, seules, ne donnent rien. Ce qui paie, ce sont
          {" "}<b>trois choses différentes</b> posées dessus :
        </p>
        <ul>
          <li>
            le <b>bonus de set</b> — c&apos;est le nom que la table du builder donne à ce champ, et
            c&apos;est de là que vient l&apos;idée qu&apos;il faut les {joyaux.length} pièces
            ensemble ; <i>aucun de nos fichiers ne l&apos;écrit noir sur blanc</i> ;
          </li>
          <li>
            les <b>{FASHION.gemmes} gemmes</b> qu&apos;on sertit dans chaque pièce, une famille de
            joyau par emplacement ;
          </li>
          <li>
            une <b>ligne d&apos;éveil</b> posée au parchemin, plus faible que celle d&apos;une pièce
            d&apos;équipement.
          </li>
        </ul>
        <p className="mc-src">
          Le compte est fait sur <b>les deux relevés séparément</b>, et ils tombent d&apos;accord :
          les {s.total} pièces de la table du builder ont
          {s.piecesAvecBonusPropre === 0
            ? <> toutes un champ de bonus propre <b>vide</b></>
            : <> {s.piecesAvecBonusPropre} champs de bonus propres remplis</>}
          , et les {p.total} pièces du client n&apos;ont pas de ligne de bonus non plus. Deux
          fichiers que personne n&apos;a écrits ensemble, le même constat.
        </p>
      </Point>

      {/* LE CONTRE-EXEMPLE, ET IL EST OBLIGATOIRE. Le bloc precedent se lisait
          comme « une piece de costume ne donne rien seule » : c'est faux sur les
          memes quatre emplacements, et pas seulement sur la cape ou le masque.
          Une page qui pose la regle doit poser l'exception, sinon elle fait
          acheter le mauvais chapeau. Les comptes sortent du releve. */}
      {seuls.avecBonus > 0 && (
        <Point titre="Attention : d'autres costumes, eux, paient à la pièce" marque="piege">
          <p>
            Ne généralise pas la phrase ci-dessus. Sur les{" "}
            <b>{seuls.total.toLocaleString("fr-FR")} pièces de mode</b> que le client range sur ces{" "}
            <b>{seuls.emplacements} mêmes emplacements</b>,{" "}
            <b>{seuls.avecBonus} portent une ligne de bonus à elles seules</b> — sans set, sans
            gemme, sans éveil. Ce qui est propre au Roi Dragon, ce n&apos;est pas que le costume ne
            donne rien : c&apos;est qu&apos;il paie <b>par le set</b> là où d&apos;autres paient{" "}
            <b>par la pièce</b>.
          </p>
          {/* Pourquoi ce total n'est pas celui du guide. Sans cette phrase, deux pages
              du site annoncent deux nombres pour les mêmes quatre emplacements et
              rien ne dit lequel croire. */}
          {seuls.horsEmplacement > 0 && (
            <p className="mc-src">
              Ce total compte par <b>emplacement d&apos;équipement</b>, parce que c&apos;est lui qui
              décide si une gemme peut se poser. Le{" "}
              <Link href="/astuces" style={{ color: "var(--orange)" }}>guide de progression</Link>{" "}
              compte la garde-robe par le <b>type affiché</b> et annonce donc{" "}
              <b>{seuls.totalParType.toLocaleString("fr-FR")}</b> : l&apos;écart est fait de{" "}
              <b>{seuls.horsEmplacement} pièces</b> que le client dit être de la mode mais qu&apos;il
              range sur les emplacements de l&apos;<b>armure</b>. Elles se portent, elles ne se
              sertissent pas.
            </p>
          )}
          <p className="mc-src">
            Un exemple par emplacement, celui dont la valeur est la plus haute — et le premier suffit
            à faire tomber la règle :
          </p>
          <div style={{ display: "grid", gap: 6 }}>
            {seuls.exemples.map((x) => (
              <LigneObjet key={x.fiche.cle} o={x.fiche} apres={<Bonus b={x.fiche.b} />} />
            ))}
          </div>
          <p className="mc-src">
            Est-ce que ces pièces-là prennent aussi des gemmes ? Rien dans les fichiers ne réserve
            les joyaux au Roi Dragon — le Grenat est dit « pour les coiffes », pas « pour la couronne
            du Roi Dragon » — mais <b>personne ne l&apos;a vérifié en jeu</b>. On pose donc la
            question sans y répondre : si tu as serti une coiffe qui n&apos;est pas du Roi Dragon,
            dis-le.
          </p>
          <p className="mc-src">
            Et deux emplacements de mode <b>ne prennent pas de gemme du tout</b>, faute de famille de
            joyau : {seuls.sansGemme.map((x, i) => (
              <span key={x.nom}>
                {i > 0 ? " et " : ""}{x.art} <b>{x.nom}</b> ({x.avecBonus} pièces à bonus sur {x.total})
              </span>
            ))}. Eux paient à la pièce — on en voit trois plus bas.
          </p>
        </Point>
      )}

      {/* ── 2. Les quatre emplacements, en images ──────────────────────────── */}
      <Groupe titre={`Les ${joyaux.length} emplacements, et ce que le jeu dessine`}>
        <div style={grille}>
          {p.montrees.map((o) => <LigneObjet key={o.cle} o={o} />)}
        </div>
        <p style={note}>
          Le relevé compte <b>{p.total} pièces</b> pour <b>{p.dessins} dessins</b> seulement : les
          {" "}{s.sets.length} sets <i>partagent leur apparence</i>. Conséquence directe, et elle
          compte en jeu : <b>on ne peut pas voir sur quelqu&apos;un lequel des {s.sets.length} sets
          il porte</b> — le nom n&apos;est que dans l&apos;infobulle, et c&apos;est le nom qui décide
          du bonus.
        </p>
      </Groupe>

      {/* ── 3. Les sets, avec les DEUX sources en regard ───────────────────── */}
      <Point titre={`Quel set prendre ? Les ${s.sets.length} ne visent pas le même jeu`}>
        <p>
          Chacun a son rôle, écrit dans la table du builder, et le jeu vend une boîte par set qui
          annonce son bonus. Les deux phrases sont mises côte à côte, et le rapprochement se fait
          {" "}<b>sur les nombres</b>, pas sur les libellés : le jeu écrit « HP 5% » là où la table
          écrit « PV max % +5 », et deux vocabulaires ne se comparent pas. Une ligne n&apos;est donc
          donnée pour sûre que si <i>tous</i> les nombres de la table se retrouvent dans la phrase du
          jeu <i>et</i> que les deux listes ont la même longueur — sinon l&apos;une dit quelque chose
          que l&apos;autre ignore.
        </p>
        <div className="mc-sets">
          {s.sets.map((x) => (
            <div key={x.nom} className="fx-card mc-set">
              <b>{x.nom}</b>
              <span className="mc-set-role">{x.role}</span>
              <Bonus b={x.bonus} />
              {x.annonce && (
                // Trois etats et pas deux : accord franc, accord partiel, et
                // desaccord. Peindre en vert un set dont le jeu annonce moins de
                // lignes que le site le donnait pour double-source alors qu'il
                // ne l'est pas.
                <span className={`mc-set-jeu ${x.concordent ? "ok" : x.retrouves > 0 ? "mi" : "ko"}`}>
                  <i>Le jeu écrit :</i> « {x.annonce} »
                </span>
              )}
              {/* La phrase change de forme selon le compte : « 0 des 1
                  chiffres se retrouvent » se lit comme une coquille alors que
                  c'est le fait le plus important de la carte. */}
              <span className="mc-set-src">
                {!x.annonce
                  ? "Le client n'annonce rien pour ce set."
                  : x.concordent
                    ? `${x.bonus.length > 1 ? `Les ${x.bonus.length} valeurs` : "La seule valeur"} du site se retrouve${x.bonus.length > 1 ? "nt" : ""} dans la phrase du jeu, qui en annonce autant.`
                    : x.retrouves === 0
                      ? `Aucune valeur du site ne se retrouve dans la phrase du jeu, qui en annonce ${x.nombresDuJeu}.`
                      : `Seules ${x.retrouves} des ${x.bonus.length} valeurs du site se retrouvent ; la phrase du jeu ne nomme pas ${x.enTrop.map(([st, v]) => `${st} +${v}`).join(", ")}.`}
              </span>
            </div>
          ))}
        </div>
        {discordants.length > 0 && (
          <p className="mc-src">
            À retenir : pour {discordants.length === 1 ? "le set" : "les sets"}{" "}
            {/* Le separateur est indispensable des qu'il y a deux noms : sans
                lui, « Roi Dragon Fulgurant Roi Dragon Immortel » se lit comme un
                seul nom de set qui n'existe pas. */}
            {discordants.map((x, i) => (
              <span key={x.nom}>{i > 0 ? " et " : ""}<b>{x.nom}</b></span>
            ))}, <b>le site et le jeu ne disent pas la même chose</b> — voir le bloc de réserves en
            bas de cette section.
          </p>
        )}
        <p className="mc-src">
          Une précaution qui a déjà servi : chercher chaque nombre du site dans la phrase du jeu
          {" "}<b>sans le consommer</b> faisait passer une ligne pour confirmée dès qu&apos;une
          <i> autre</i> ligne portait le même nombre. C&apos;est pour ça que le rapprochement retire
          les nombres du sac à mesure qu&apos;il les emploie — sinon le set Fulgurant paraissait
          d&apos;accord sur ses {s.sets.find((x) => /fulgurant/i.test(x.nom))?.bonus.length ?? 5}{" "}
          lignes, alors que la boîte n&apos;en nomme pas autant.
        </p>
      </Point>

      {/* ── 4. Le sertissage d'un costume : une famille par pièce ──────────── */}
      <Point titre="Puis-je sertir une pièce de costume ? Oui, mais pas avec n'importe quelle gemme" marque="piege">
        <p>
          Chaque pièce prend <b>{FASHION.gemmes} gemmes</b>, et <b>le joyau dépend de la pièce</b>. C&apos;est le
          piège le plus simple de tout le système : un Grenat ne va que sur une coiffe, une Améthyste
          que sur des bottes. Le client le dit dans une phrase d&apos;infobulle que personne ne relit,
          et aucune fenêtre ne le récapitule.
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
                  {/* Deux vignettes et pas trois : l'icone d'emplacement du
                      builder (`gemme-fhead.png`…) montre le meme joyau que la
                      famille. La montrer a cote donnerait deux fois le meme
                      dessin sous deux legendes differentes.
                      VERIFIE image par image, et pas suppose : sur la coiffe,
                      la tenue et les gants, le fichier du builder est le
                      fichier du client au pixel pres (ecart nul sur un
                      comparatif 32x32). Sur les bottes il ne l'est PAS : c'est
                      une autre gravure de la meme amethyste — meme silhouette,
                      meme violet, un eclat interieur different. D'ou la phrase
                      plus bas, qui ne dit plus « dessin pour dessin ». */}
                  <span className="mc-vignettes" style={{ marginBottom: 0 }}>
                    <Vignette src={j.img} legende={j.nom} />
                    <Vignette src={j.imgMorceau} legende={j.morceau?.n ?? "Morceau"} />
                  </span>
                  {j.stats.length > 0 && (
                    <span style={grille}>
                      {j.stats.map((st) => <Chip key={st} texte={st} />)}
                    </span>
                  )}
                  {/* On ne recopie PAS la phrase du coffret : les pastilles
                      ci-dessus en sortent mot pour mot, la citer en plus
                      dirait deux fois la meme chose — et sa parenthese, que le
                      client oublie de refermer, se lirait comme notre faute. */}
                  <span className="mc-src">
                    {j.stats.length > 0 && (
                      <>
                        Ces <b>{j.stats.length} statistiques</b> sont celles que le coffret du jeu
                        nomme, et il n&apos;en nomme pas d&apos;autres.{" "}
                      </>
                    )}
                    {j.nommees.length > 0 && (
                      <><b>{j.nommees.length} versions nommées</b> existent à côté du joyau brut.{" "}</>
                    )}
                    {r && (
                      <>
                        Il se fabrique avec{" "}
                        <b>{r.entrants.map((e) => `${e.q ?? 1}× ${e.n}`).join(" + ")}</b>
                        {r.pnj ? <> chez <b>{r.pnj}</b></> : null}
                        {r.taux != null ? <>, {r.taux} % de réussite</> : null}.
                      </>
                    )}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="mc-src">
          Les <b>{nommees} joyaux nommés</b> sont exactement le même geste qu&apos;AirFlyff a fait
          sur les Diamants d&apos;arme : à côté d&apos;un joyau brut, des versions qui forcent la
          statistique. Ici, au moins, <b>le nom dit ce qu&apos;il fait</b> — « Grenat FOR » donne de
          la Force. Ce sont les gemmes d&apos;<i>arme</i> qui mentent, pas celles de costume.
        </p>
        {/* CETTE PHRASE A ETE CORRIGEE APRES COMPARAISON DES PIXELS.
            Elle disait « sont, dessin pour dessin, les 4 joyaux ci-dessus ».
            C'est vrai de trois emplacements sur quatre : coiffe, tenue et gants
            sont le fichier du client a l'identique. gemme-ffoot, non — c'est une
            autre gravure de la meme amethyste. Le rapprochement joyau/piece
            tient toujours, mais pas l'egalite des fichiers : on dit donc ce que
            les images montrent, et rien de plus. */}
        <p className="mc-src">
          Et l&apos;appariement joyau ↔ pièce était déjà dans nos propres assets sans que personne ne
          le sache : les {joyaux.length} icônes d&apos;emplacement de l&apos;AirBuilder
          {" "}(<b>gemme-fhead</b>, <b>ftop</b>, <b>fhand</b>, <b>ffoot</b>) montrent ces mêmes
          joyaux, <b>chacun sur la bonne pièce</b>. Troisième source, même conclusion — avec une
          nuance vérifiée image par image : la coiffe, la tenue et les gants reprennent le fichier du
          client <i>au pixel près</i>, tandis que celle des bottes est <b>une autre gravure de la
          même améthyste</b> (même silhouette, même violet, un éclat intérieur différent).
        </p>
      </Point>

      {/* ── 5. Ce que ça vaut, et où le site se trompe de liste ────────────── */}
      <Point titre="Quel palier vaut le coup ? Et pourquoi la liste du site est trop longue" marque="piege">
        <p>
          Le formulaire du site propose <b>les {b.uniques.length} mêmes statistiques</b> pour les
          {" "}{joyaux.length} emplacements. Le jeu, lui, n&apos;en a que{" "}
          <b>{joyaux[0]?.stats.length ?? 0} par pièce</b> — celles listées plus haut. Demander
          « Attaque » sur des bottes, c&apos;est demander une gemme qui n&apos;existe pas.
        </p>
        {/* LE SIGNE POUR CENT NE SE POSE PAS DEUX FOIS. La table marque le
            pourcentage dans un champ a part, mais UN de ses libelles le porte
            deja dans son nom (« Degats magiques % ») : coller le suffixe sans
            regarder donnait « Degats magiques % +32 % » a l'ecran. On ne
            l'ajoute donc que si le nom ne le dit pas lui-meme. */}
        {/* Les 4 paliers plutot que le seul plafond, quand le second releve les
            porte. C'est la reponse a « quel palier vaut le coup » : une gemme dont
            les trois premieres marches sont courtes ne vaut que montee au bout. */}
        <div style={grille}>
          {b.uniques.map((x) => (
            <Chip
              key={x.stat}
              texte={`${x.stat} ${x.paliers ? x.paliers.map((v) => `+${v}`).join(" → ") : `+${x.v}`}${x.pourcent && !/%\s*$/.test(x.stat) ? " %" : ""}`}
            />
          ))}
        </div>
        {/* CE PARAGRAPHE A ETE RESSERRE. Il concluait « les deux releves se
            recoupent donc ». Ce qui se recoupe vraiment, c'est la STRUCTURE :
            douze entrees pour quatre pieces, et le nom qui revient est celui des
            deux pieces dont le coffret cite « Soin ». Les LIBELLES, eux, ne se
            recoupent pas partout — le coffret de la coiffe dit « Puissance
            magique » la ou la table dit « Degats magiques », et celui de la
            tenue dit « Degats magiques » la ou la table dit « Degats magiques
            % ». Annoncer un recoupement des deux listes aurait fait passer ce
            rapprochement de vocabulaire pour une donnee. */}
        <p className="mc-src">
          La table du builder porte <b>{b.entrees.length} entrées pour {b.uniques.length} noms</b>, et
          le nom qui revient est{" "}
          {b.repetes.map((r) => <b key={r}>{r}</b>)} : c&apos;est la trace de la structure réelle —
          <b> quatre statistiques communes aux {joyaux.length} pièces, plus deux propres à
          chacune</b>, et deux pièces se partagent celle-là. C&apos;est cette <i>structure</i> que les
          deux relevés partagent. Les <b>libellés</b>, eux, ne se répondent pas tous : le coffret
          d&apos;une pièce peut nommer une statistique autrement que la table (« Puissance magique »
          contre « Dégâts magiques »). Les pastilles ci-dessus emploient les mots de la table, les
          pastilles par pièce plus haut ceux du coffret — et personne n&apos;a vérifié en jeu qu&apos;il
          s&apos;agit bien de la même ligne.
        </p>
        {/* CETTE PAGE A DIT LE CONTRAIRE. Elle affirmait que « le fichier ne dit ni
            combien la premiere gemme donne, ni comment les 4 se repartissent »,
            pendant que le guide de progression affichait les 4 paliers des 11
            gemmes. Ils sont dans un SECOND fichier du depot (builder-data.json), et
            son dernier palier vaut le plafond de celui-ci — recoupement recalcule
            ici plutot qu'affirme. */}
        {b.nPaliers > 0 ? (
          <p className="mc-src">
            Ce ne sont pas des plafonds hors d&apos;atteinte : ce sont les{" "}
            <b>{b.marches} paliers</b> d&apos;une gemme, du premier au dernier, et le dernier est le
            plafond. Deux fichiers du dépôt les portent — l&apos;un n&apos;écrit que la valeur
            haute, l&apos;autre la série entière — et ils concordent sur{" "}
            <b>{b.nConcordent} des {b.nPaliers} statistiques</b>
            {b.doublets.length > 0 && (
              <>
                {" "}— dont{" "}
                {b.doublets.map((d, i) => (
                  <span key={d.stat}>
                    {i > 0 ? ", " : ""}<b>{d.stat}</b>, que le second relevé appelle{" "}
                    <b>{d.autre}</b>
                  </span>
                ))}
                , un rapprochement de vocabulaire et non une donnée
              </>
            )}
            . C&apos;est là que se lit{" "}
            <i>quel palier vaut le coup</i> : l&apos;écart entre la 3<sup>e</sup> et la 4
            <sup>e</sup> marche n&apos;est pas le même d&apos;une gemme à l&apos;autre — le{" "}
            <Link href="/astuces" style={{ color: "var(--orange)" }}>guide de progression</Link>{" "}
            les met en barres, gemme par gemme.
          </p>
        ) : (
          <p className="mc-src">
            Ces valeurs sont les <b>plafonds inscrits dans la table</b>, pas ce qu&apos;une gemme
            rapporte à l&apos;unité : ce relevé ne porte que la valeur haute.
          </p>
        )}
        <p className="mc-src">
          Ce qui reste inconnu, en revanche : le moteur du builder ne se sert pas de ces valeurs pour
          calculer — il n&apos;emploie que les noms — et <b>aucun fichier ne dit le taux d&apos;échec
          d&apos;un sertissage de costume</b>, là où celui de l&apos;arme affiche ses 90 %. Absence de
          chiffre n&apos;est pas absence de risque.
        </p>
      </Point>

      {/* ── 6. Défaire : la question la plus coûteuse ──────────────────────── */}
      <Point titre="Est-ce que je perds la gemme si je la retire ?" marque="piege">
        <p>
          Oui, et pire : <b>tu ne retires que la dernière</b>. Le panneau du jeu le dit mot pour
          mot, et il ne le dit qu&apos;une fois, dans la fenêtre de retrait :
        </p>
        {retrait && <p className="mc-cite">« {retrait.texte} »</p>}
        <p>
          Conséquence pratique, celle qui coûte : une erreur sur la <b>2<sup>e</sup></b> gemme
          d&apos;une pièce à {FASHION.gemmes} emplacements se paie en défaisant d&apos;abord la
          {" "}<b>4<sup>e</sup></b> et la <b>3<sup>e</sup></b>. On sertit donc les gemmes dont on est
          sûr <b>en dernier</b>, pas en premier — c&apos;est l&apos;inverse du réflexe.
        </p>
        {parchemin && <LigneObjet o={parchemin} />}
        {pose && (
          <p className="mc-src">
            La fenêtre de pose, elle, s&apos;intitule « {pose.titre} » et son aide tient en deux
            mots : « {pose.texte} ». Le jeu n&apos;annonce <b>aucun taux d&apos;échec</b> pour le
            sertissage d&apos;un costume — contrairement à celui d&apos;une arme, qui affiche ses
            90 %. Absence de chiffre n&apos;est pas absence de risque : personne n&apos;a vérifié.
          </p>
        )}
      </Point>

      {/* ── 7. La teinture : la question qu'on pose et que le client ignore ── */}
      <Point titre="Qu'est-ce que je perds à la teinture ?" marque="verifier">
        <p>
          <b>Il n&apos;y a pas de teinture de costume dans ce client.</b> Le mot existe sur
          {" "}<b>{teinture.length} objets</b> — {teinture.map((o) => o.n).join(", ")} — et
          {" "}{teinture.length > 1 ? "tous servent" : "il sert"} à colorer <i>un ours en
          peluche</i>. On le dit plutôt que de décrire un système qu&apos;on n&apos;a pas trouvé.
        </p>
        <p>
          Ce qui existe, et qui ressemble à la question, ce sont <b>deux séries de masques</b> —
          l&apos;apparence d&apos;un côté, le bonus de l&apos;autre :
        </p>
        <div style={{ display: "grid", gap: 6 }}>
          {masques.saveurs.map((o) => (
            <LigneObjet key={o.cle} o={o} apres={<Bonus b={o.b} />} />
          ))}
        </div>
        <p>
          Ces {masques.saveurs.length} effets tournent en boucle chez{" "}
          <b>{masques.couturier || "le Grand Couturier"}</b> :{" "}
          <b>{masques.rotations} transformations</b> dans le relevé
          {masques.tauxRotation.length === 1 && masques.tauxRotation[0] != null
            ? <>, toutes à <b>{masques.tauxRotation[0]} %</b></>
            : null}
          , et elles reviennent au point de départ. Autrement dit :{" "}
          <b>le bonus d&apos;un masque se change sans rien perdre</b>, et l&apos;apparence ne bouge
          pas.
        </p>
        <div style={grille}>
          {masques.recolores.map((o) => (
            <Case key={o.cle} src={o.ic ? `/jeu/icones/${o.ic}` : null} nom={o.n.replace(/^Masque du dragon\s*/i, "")} taille={26} />
          ))}
        </div>
        <p className="mc-src">
          En face, le même masque existe en <b>{masques.recolores.length} recolorations</b> — le même
          dessin, une autre couleur — et{" "}
          {masques.sansBonus === masques.recolores.length
            ? <><b>aucune ne porte de ligne de bonus</b></>
            : <><b>{masques.sansBonus} d&apos;entre elles</b> n&apos;en portent pas</>}
          . C&apos;est la seule réponse honnête à la question : ici, <b>la couleur et le bonus ne
          vivent pas sur le même objet</b>. Aucune recette de notre relevé ne transforme un masque à
          bonus en masque coloré ni l&apos;inverse — d&apos;où viennent les colorés n&apos;est pas
          dans nos fichiers.
        </p>
      </Point>

      {/* ── 8. Le geste vraiment destructeur ───────────────────────────────── */}
      {melange && (
        <Point titre="Le seul geste de costume qui détruit vraiment" marque="piege">
          <p>
            Il ne s&apos;appelle ni teinture ni sertissage mais <b>mélange de costumes</b>, et le
            panneau du jeu en donne la règle : on en met{" "}
            {melange.min > 0 ? <><b>{melange.min} à {melange.max}</b></> : <b>plusieurs</b>} et on en
            ressort <b>un seul, au hasard</b>.
          </p>
          <p>
            Le relevé compte <b>{melange.sorties.length} résultats possibles</b>, dont{" "}
            <b>{melange.avecBonus.length} seulement</b> sont des sets qui portent un bonus connu. Les
            autres sont des déguisements — écolier, chat, girafe, infirmière. Autrement dit{" "}
            <b>{melange.avecBonus.length} sorties utiles sur {melange.sorties.length}</b> : ce
            n&apos;est pas une façon d&apos;obtenir un set, c&apos;est une façon de perdre
            {melange.min > 0 ? <> les {melange.min} à {melange.max} costumes qu&apos;on y met</> : " ce qu'on y met"}.
          </p>
          <p className="mc-src">
            Une précision qui compte avant de calculer une espérance :{" "}
            <b>le panneau ne donne aucune probabilité</b>. Il dit « aléatoirement » et rien de plus.
            {" "}{melange.avecBonus.length} sur {melange.sorties.length} est donc un rapport de
            <i> nombre de sorties</i>, pas une chance sur {melange.sorties.length} — si le jeu pondère
            sa table, personne ici ne le sait.
          </p>
          {melange.protection && <LigneObjet o={melange.protection} />}
          <p className="mc-src">
            La liste complète des {melange.sorties.length} sorties est celle du panneau du jeu, avec
            les <b>{melange.autresPanneaux} autres</b> fenêtres de transformation, dans
            {" "}<b>Les crafts</b> → « Les ateliers du jeu ». On ne la recopie pas ici : c&apos;est le
            même relevé.
          </p>
        </Point>
      )}

      {/* ── 9. L'éveil du costume : il existe, et le site l'ignore ─────────── */}
      <Point titre="Un costume s'éveille-t-il ? Oui — et le formulaire du site ne le propose pas">
        <p>
          Le client vend <b>{evFashion.total} parchemins d&apos;éveil de costume</b> :{" "}
          {evFashion.lignes.length} statistiques, en rang 1 et rang 2. Ce sont des éveils
          {" "}<b>fixes</b> — la ligne est connue d&apos;avance, il n&apos;y a rien à tirer.
        </p>
        <div className="mc-bareme">
          {evFashion.lignes.map((l) => (
            <div key={l.code}>
              <span>{l.label || l.code}</span>
              <b>
                R1 +{l.r1}{l.pourcent ? " %" : ""} · R2 +{l.r2}{l.pourcent ? " %" : ""}
              </b>
            </div>
          ))}
        </div>
        {evFashion.pasDouble.length > 0 && (
          <p>
            Attention à un raccourci qui traîne : <b>R2 n&apos;est pas toujours le double de R1</b>.
            {" "}{evFashion.pasDouble.map((l) => (
              <span key={l.code}>
                Sur <b>{l.label || l.code}</b>, R1 vaut +{l.r1}{l.pourcent ? " %" : ""} et R2 seulement
                {" "}+{l.r2}{l.pourcent ? " %" : ""} au lieu de +{l.r1 * 2}
                {l.pourcent ? " %" : ""}.{" "}
              </span>
            ))}
            Les {evFashion.lignes.length - evFashion.pasDouble.length} autres doublent bien.
          </p>
        )}
        <p className="mc-src">
          À comparer avec la série d&apos;équipement : <b>{evStuff.total} parchemins</b> pour{" "}
          <b>{evStuff.lignes.length} statistiques</b>
          {evStuff.liees > 0 ? <> (plus {evStuff.liees} versions liées, qui sont les mêmes)</> : null}
          , et des valeurs bien plus hautes —{" "}
          {(() => {
            const f = evStuff.lignes.find((l) => l.code === "STR");
            const c = evFashion.lignes.find((l) => l.code === "STR");
            return f && c && c.r1 > 0
              ? <>une ligne de Force vaut <b>+{f.r1}</b> sur une pièce d&apos;équipement contre
                {" "}<b>+{c.r1}</b> sur un costume, soit {Math.round(f.r1 / c.r1)} fois moins</>
              : <>une même statistique vaut plus sur une pièce d&apos;équipement que sur un costume</>;
          })()}
          . Le costume complète, il ne remplace pas.
        </p>
        <p className="mc-src">
          Et chaque parchemin d&apos;équipement dit <b>sur quelles pièces il se pose</b> — une
          information qu&apos;aucune interface ne récapitule, et qui n&apos;est pas la même d&apos;une
          statistique à l&apos;autre :{" "}
          {evStuff.lignes.filter((l) => l.pieces.length).map((l, i) => (
            <span key={l.code}>{i > 0 ? " · " : ""}<b>{l.label || l.code}</b> {l.pieces.join(", ")}</span>
          ))}
          .
        </p>
      </Point>

      {/* ── 10. Les réserves, à l'écran et pas dans un commentaire ─────────── */}
      <Point titre="Ce que les fichiers ne disent pas, et qu'il ne faut pas deviner" marque="verifier">
        <ul>
          <li>
            <b>Ce qu&apos;une gemme rapporte à l&apos;unité.</b> On a les plafonds, pas la marche.
            Personne ne devrait annoncer « +40 Force par gemme » sur cette base.
          </li>
          <li>
            <b>Le taux d&apos;échec du sertissage de costume.</b> Le panneau du jeu n&apos;en donne
            aucun, là où celui de l&apos;arme affiche ses 90 %.
          </li>
          <li>
            <b>D&apos;où viennent les {nommees} joyaux nommés</b>, les coffrets et le parchemin de
            réinitialisation : aucun n&apos;apparaît dans le relevé des sources. Seul le joyau brut a
            une recette. Et le relevé prévient lui-même que le butin ordinaire des monstres
            n&apos;est pas dans le client — l&apos;absence ne prouve donc rien.
          </li>
          <li>
            <b>Si le joyau brut tire au hasard.</b> Les coffrets parlent de « statistiques
            prédéfinies », ce qui le suggère, mais aucune phrase ne le dit du joyau brut.
          </li>
          {discordants.map((x) => (
            <li key={x.nom}>
              <b>Le bonus du set {x.nom}.</b> La table du site annonce{" "}
              « {x.bonus.map(([st, v]) => `${st} +${v}`).join(", ")} » ; la boîte du jeu annonce
              {" "}« {x.annonce} ».{" "}
              <b>
                {x.retrouves === 0
                  ? "Aucune valeur ne se retrouve"
                  : `Seules ${x.retrouves} des ${x.bonus.length} valeurs se retrouvent`}
              </b>{" "}
              dans l&apos;autre phrase.{" "}
              {/* Le sens de l'ecart change la conclusion, donc il se calcule.
                  Dire « le site sous-estime » quand c'est lui qui en annonce le
                  plus serait exactement l'erreur qu'on veut eviter. */}
              {x.nombresDuJeu > x.bonus.length
                ? <>Ici c&apos;est <b>le jeu</b> qui annonce le plus de lignes : le formulaire du site
                  sous-estime probablement ce set.</>
                : x.nombresDuJeu < x.bonus.length
                  ? <>Ici c&apos;est <b>le site</b> qui annonce le plus de lignes : il en promet
                    peut-être une que le jeu ne donne pas
                    {x.enTrop.length > 0
                      ? <> — <b>{x.enTrop.map(([st, v]) => `${st} +${v}`).join(", ")}</b></>
                      : null}.</>
                  : <>Les deux listes ont la même longueur : ce sont les valeurs qui diffèrent, pas
                    leur nombre.</>}
              {" "}Tant que personne n&apos;a lu l&apos;infobulle en jeu, la page ne tranche pas.
            </li>
          ))}
          <li>
            <b>Ce que l&apos;amélioration d&apos;un costume apporte.</b> Le formulaire du site laisse
            monter une pièce jusqu&apos;à +10 et le client vend un billet d&apos;île « pour
            l&apos;upgrade des fashions », mais <b>aucun fichier ne dit ce que chaque palier
            donne</b>.
          </li>
        </ul>
        <p className="mc-src">
          Si tu constates l&apos;inverse de l&apos;une de ces lignes en jeu, dis-le : deux
          confirmations et on grave, une contradiction et on retire. C&apos;est la règle de toute la
          page.
        </p>
      </Point>
    </>
  );
}
