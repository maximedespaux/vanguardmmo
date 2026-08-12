import {
  CARTES_ATTAQUE, CARTES_DEFENSE, COULEUR_CARTE,
  ICONE_ELEMENT, ICONE_EVEIL, ICONE_SCROLL, ICONE_DIAMANT, ICONE_HOLO, ICONE_UPGRADE,
  ICONE_RARETE, COULEUR_RARETE, ICONE_RUNE_ARME, ICONE_RUNE_MARTEAU, ICONE_RUNE_STAT, ICONE_RUNE_VIERGE,
  ETIQUETTE_ARTEFACT, ETIQUETTE_ULTIME, ETOILE_PLEINE, ETOILE_VIDE,
  planAscension, essenceArme,
} from "@/lib/assetsJeu";
import {
  RARETES, STATS_DIAMANT, STATS_HOLO, STATS_EVEIL, STATS_SCROLL, reglagesDeSlot,
} from "@/lib/specsFlyff";
import { Bareme, Bonus, Case, Chip, Deux, Groupe, LigneObjet, Point, Vignette, grille, note } from "./Blocs";
import {
  ECHELLE, PARCHEMINS_ABSOLUS,
  cartesDElement, cartesDePercage, comptoirDeLuca, eveilFixe, famillesDeJoyau, iconeDe, iconePercage,
  nombreDeGemmesMenteuses, nombreDeGemmesNommees, objet, objets, ordresDeSertissage, panneau,
  parcheminsClasses, plafondDeStat, plafondsDeSertissage, rareteChiffree, runes, tableauDesGemmes,
} from "./releves";

/**
 * LES MÉCANIQUES D'UNE PIÈCE — huit facettes, une par question qu'on se pose en
 * regardant son arme.
 *
 * Ce fichier lit le relevé du client (`./releves`), donc il touche au disque : il
 * ne doit JAMAIS être importé par un composant client. La page qui l'emploie est
 * un composant serveur, et c'est ce qui permet d'afficher des comptes exacts sans
 * envoyer 3 Mo de JSON au navigateur.
 *
 * Règle de toute la planche, héritée de la première version : on ne dit ici que ce
 * que les fichiers disent. Là où le client ne fournit rien — la rareté Commune, la
 * Mythique, l'image d'un palier de carte —, on l'écrit au lieu d'emprunter l'image
 * du palier voisin.
 */

/** Les neuf familles d'ascension du client. Le glaive et la doloire n'en font
 *  qu'une : c'est le nom de fichier lui-même qui le dit. On garde ici un nom
 *  d'arme réel par famille, parce que `planAscension` lit un NOM d'arme — la
 *  planche se sert donc de la même fonction que les formulaires. */
export const FAMILLES: { arme: string; label: string }[] = [
  { arme: "Épée", label: "Épée" },
  { arme: "Hache", label: "Hache" },
  { arme: "Glaive", label: "Glaive & Doloire" },
  { arme: "Arc", label: "Arc" },
  { arme: "Baguette", label: "Baguette" },
  { arme: "Bâton", label: "Bâton" },
  { arme: "Sceptre", label: "Sceptre" },
  { arme: "Poing", label: "Poing" },
  { arme: "Yoyo", label: "Yoyo" },
];

/** Les ressources d'artefact, telles que le client les nomme. On les montre sans
 *  expliquer leur recette : les crafts d'artefact ne sont pas dans nos données, et
 *  inventer une recette ici enverrait quelqu'un farmer pour rien. */
const RESSOURCES: { f: string; nom: string }[] = [
  { f: "artefact-pierre", nom: "Pierre d'artefact" },
  { f: "artefact-plan", nom: "Plan" },
  { f: "artefact-morceau-parchemin", nom: "Morceau de parchemin" },
  { f: "artefact-coffret-plans", nom: "Coffret de plans" },
  { f: "artefact-boite-pierres", nom: "Boîte de pierres" },
  { f: "artefact-protection", nom: "Protection" },
  { f: "artefact-orichalque-pure", nom: "Orichalque pur" },
  { f: "artefact-orichalque-scintillant", nom: "Orichalque scintillant" },
  { f: "artefact-roche-lunaire", nom: "Roche lunaire" },
  { f: "artefact-diamant-holographique", nom: "Diamant holographique" },
];

/** La pièce de référence de toute la page : une arme passée en artefact. C'est
 *  elle qui porte les plafonds les plus hauts, et tous les chiffres de la planche
 *  sortent de cette table plutôt que du clavier. */
const ARME_ARTEFACT = reglagesDeSlot("weapon", { artefact: true });
const ARME_SIMPLE = reglagesDeSlot("weapon");
const TENUE = reglagesDeSlot("suit");
const BIJOU = reglagesDeSlot("jewel");

/* ═══ 1. Les gemmes mentent ══════════════════════════════════════════════════ */

export function Gemmes() {
  const table = tableauDesGemmes();
  const menteuses = nombreDeGemmesMenteuses();
  const ordres = ordresDeSertissage();
  const familles = famillesDeJoyau();
  const sertisseur = familles.find((f) => f.sertisseur)?.sertisseur ?? "";
  const neufs = table.map((g) => g.neuf).filter((o): o is NonNullable<typeof o> => !!o);

  return (
    <>
      <Point titre="Le nom de la gemme et son effet réel ne correspondent plus" marque="profit">
        <p>
          Sertir une arme ultime demande une arme <b>+6 au minimum</b> ; le joyau brut tire
          une statistique <b>au hasard parmi {STATS_DIAMANT.length}</b>, et chaque joyau du même
          type renforce toujours la même. À côté du joyau brut, le jeu vend {table.length} gemmes
          <b> nommées</b> qui, elles, forcent la statistique — c&apos;est la seule façon de choisir
          ce qu&apos;on obtient{sertisseur ? <>, et ça se passe chez <b>{sertisseur}</b></> : null}.
        </p>
        <p>
          Sauf que <b>{menteuses} de ces {table.length} noms sont faux</b>. AirFlyff a changé
          l&apos;ordre des {STATS_DIAMANT.length} statistiques de sertissage dans son fichier de
          données sans jamais retoucher les textes d&apos;objets, restés sur l&apos;ordre du Flyff
          d&apos;origine. Le nom que tu lis dans l&apos;infobulle décrit donc l&apos;effet
          d&apos;une <i>autre</i> gemme.
        </p>
        {/* La colonne de droite porte maintenant le PLAFOND de la statistique.
            Sans lui, « Attaque » et « PV max » se lisaient comme equivalents
            alors qu'ils ne jouent pas dans le meme ordre de grandeur — et c'est
            precisement ce qui decide quelle gemme on cherche. */}
        <Deux
          gauche="Ce que dit l'infobulle"
          droite="Ce que la gemme donne, et jusqu'où"
          lignes={table.map((g) => {
            const max = plafondDeStat(g.reel);
            return [
              g.nom,
              max != null ? <>{g.reel} <span style={{ opacity: .75 }}>· jusqu&apos;à +{max}</span></> : g.reel,
              g.juste,
            ] as [React.ReactNode, React.ReactNode, boolean?];
          })}
        />
        <p className="mc-src">
          La colonne de droite n&apos;est pas notre interprétation : c&apos;est le <b>libellé des
          {" "}{neufs.length} Diamants qu&apos;AirFlyff a ajoutés</b>, recopié tel quel, coquilles
          comprises. Ces neuf-là disent ce qu&apos;ils font et suivent l&apos;ordre du fichier ;
          c&apos;est la preuve que c&apos;est le fichier qui fait loi, pas l&apos;infobulle. Les
          plafonds viennent de la table de valeurs du builder, où ils sont les seuls à être écrits.
        </p>

        {/* La demonstration par recoupement. Elle vaut mieux qu'une
            affirmation : deux fichiers que personne n'a ecrits ensemble
            tombent d'accord rang par rang, et c'est CET ordre-la qui ne
            correspond pas aux noms des gemmes. */}
        {ordres.rangs.length > 0 && (
          <>
            <p>
              Et ça ne repose pas sur notre lecture : <b>deux fichiers indépendants</b> donnent le
              même ordre. Le client nomme ses {ordres.rangs.length} Diamants rang par rang ; la table
              de valeurs du builder liste les {ordres.fichier.length} statistiques dans son propre
              ordre. Les deux tombent d&apos;accord{" "}
              {ordres.concordent
                ? <><b>sur les {ordres.rangs.length} rangs</b></>
                : <><b>sur {ordres.justes} rangs sur {ordres.rangs.length}</b></>}
              {" "}— et c&apos;est cet ordre-là que les noms de gemmes ne suivent pas.
            </p>
            {/* `Deux` et pas `Bareme` : la colonne de droite d'un bareme est en
                white-space:nowrap, faite pour des nombres courts. Une phrase
                comme « la table dit Melee Stealhp (meme stat, autre mot) » y
                debordait du panneau sur telephone. `Deux` replie, et sa coche
                verte dit deja ce qu'on veut montrer — les deux fichiers sont
                d'accord. */}
            <Deux
              gauche="Le Diamant du client, rang par rang"
              droite="La table de valeurs du builder"
              lignes={ordres.rangs.map((r) => [
                `${String(r.rang).padStart(2, "0")} · ${r.diamant}`,
                r.doublet ? `${r.table} — même stat, autre mot` : r.table,
                r.concorde,
              ] as [React.ReactNode, React.ReactNode, boolean?])}
            />
            {ordres.doublets > 0 && (
              <p className="mc-src">
                Sur ces {ordres.rangs.length} rangs, <b>{ordres.doublets} disent la même statistique
                avec deux vocabulaires</b> — HP et PV, PvP et JcJ, « siphon de vie » et « steal
                HP ». Ce sont les deux langues du client, pas deux effets : on les rapproche, et on
                le dit ici plutôt que de faire passer une normalisation pour une donnée.
              </p>
            )}
            {!ordres.memeRangPartout && (
              <p className="mc-src">
                Le builder, lui, porte ces {ordres.fichier.length} statistiques <b>deux fois dans
                deux ordres différents</b> : celui de sa liste déroulante et celui de sa table de
                valeurs. C&apos;est la même bascule d&apos;ordre que celle qui fait mentir les
                gemmes, et elle a laissé sa trace jusque dans nos fichiers.
              </p>
            )}
          </>
        )}
        <p className="mc-src">
          L&apos;exemple est pris sur la Topaze, mais le décalage est le même rang 01→09 dans les
          {" "}{familles.length} familles — <b>{nombreDeGemmesNommees()} gemmes nommées</b> en tout.
          Le joyau à employer dépend du niveau de l&apos;arme :{" "}
          {familles.map((f) => `${f.nom} ${f.plage}`).join(", ")}.
        </p>
      </Point>

      <div className="mc-vignettes">
        {familles.map((f) => <Vignette key={f.nom} src={f.img} legende={`${f.nom} ${f.plage}`} />)}
      </div>

      <Point titre="Ce qu'on en fait, concrètement">
        <p>
          Tu veux des <b>PV</b> ? Prends celle « de maîtrise ». De la <b>Force</b> ? Celle
          « de puissance ». De l&apos;<b>Endurance</b> ? Celle « de force ». Et quand tu as le
          choix, prends l&apos;un des {neufs.length} Diamants ci-dessous : leur libellé ne peut pas
          te tromper.
        </p>
        <div style={{ display: "grid", gap: 5 }}>
          {neufs.map((o) => <LigneObjet key={o.cle} o={o} />)}
        </div>
        <p className="mc-src">
          En cas d&apos;échec du sertissage (90 % de réussite annoncés), seul le joyau est
          perdu — l&apos;arme ne risque rien. C&apos;est la seule opération de la forge dans ce cas.
        </p>
      </Point>

      <Point titre="Avant d'en faire une règle" marque="verifier">
        <p>
          Le décalage est celui du client d&apos;octobre 2025 ; le serveur peut avoir été corrigé
          depuis. Que le premier qui sertit une gemme nommée dise dans le vocal ce qu&apos;il a
          réellement obtenu : deux confirmations et on grave, une contradiction et on retire cette
          section.
        </p>
      </Point>
    </>
  );
}

/* ═══ 2. Rareté ══════════════════════════════════════════════════════════════ */

/** Les trois statistiques qu'un tank cherche. Elles servent à INTERROGER le
 *  vivier de rareté, pas à décrire son contenu : la phrase à l'écran se construit
 *  sur le résultat de la recherche, si bien qu'elle se corrige toute seule le jour
 *  où AirFlyff en ajoute une au tirage. Écrite à la main, elle resterait affirmée
 *  après avoir cessé d'être vraie — et c'est justement la ligne sur laquelle
 *  quelqu'un décide de ne pas dépenser ses parchemins. */
const STATS_DEFENSIVES = ["PV max", "Endurance", "Défense"];

export function Rarete() {
  const r = rareteChiffree();
  const dansLeVivier = (nom: string) =>
    r.vivier.some((v) => v.stat.localeCompare(nom, "fr", { sensitivity: "base" }) === 0);
  const absentes = STATS_DEFENSIVES.filter((s) => !dansLeVivier(s));
  const presentes = STATS_DEFENSIVES.filter(dansLeVivier);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p style={note}>
        La rareté est le premier chiffre qu&apos;on lit sur une arme : c&apos;est elle qui donne
        les lignes bonus. Chaque palier a sa couleur — la même que dans l&apos;AirBuilder.
      </p>
      <div style={grille}>
        {RARETES.map((r2) => <Case key={r2} src={ICONE_RARETE[r2]} nom={r2} couleur={COULEUR_RARETE[r2]} />)}
      </div>
      <p style={note}>
        Tu ne verras que {Object.keys(ICONE_RARETE).length} parchemins : <b>Commun</b> est
        l&apos;état de base et le client n&apos;en livre pas pour <b>Mythique</b>. Plutôt que de te
        montrer celui du palier d&apos;à côté, on n&apos;en montre aucun.
      </p>

      {/* Ce qui decide de la valeur d'une arme rare n'est pas le palier mais le
          TIRAGE : combien de lignes, et dans quel vivier elles se prennent. Ces
          deux tables ne sont dans aucune infobulle du jeu — elles viennent de la
          table de valeurs du builder, d'ou la reserve a l'ecran. */}
      {r.lignes.length > 0 && (
        <Point titre="Ce que « Légendaire » tire vraiment : le nombre de lignes" marque="verifier">
          <p>
            Le palier ne dit pas combien de lignes bonus l&apos;arme reçoit — c&apos;est un tirage, et
            il est très déséquilibré. <b>Une seule ligne</b> est le cas le plus fréquent, et les
            {" "}<b>{r.lignes[r.lignes.length - 1]?.amount} lignes</b> sont l&apos;exception qui fait
            le prix d&apos;une arme.
          </p>
          <Bareme
            lignes={r.lignes.map((l) => [
              `${l.amount} ligne${l.amount > 1 ? "s" : ""} bonus`,
              `${l.chance} %`,
            ] as [string, string])}
          />
          {r.vivier.length > 0 && (
            <>
              <p>
                Et les lignes se tirent dans un vivier de <b>{r.vivier.length} statistiques</b>, chacune
                entre <b>+{Math.min(...r.vivier.map((v) => v.min))}</b> et
                {" "}<b>+{Math.max(...r.vivier.map((v) => v.max))}</b> :
              </p>
              <div style={grille}>
                {r.vivier.map((v) => <Chip key={v.stat} texte={`${v.stat} +${v.min} → +${v.max}`} />)}
              </div>
              <p className="mc-src">
                {absentes.length === STATS_DEFENSIVES.length
                  ? <>
                      {/* Le separateur est le meme partout : une enumeration en
                          « ni » se ponctue « ni A, ni B, ni C » du debut a la
                          fin, et traiter le dernier a part donnait « ni B ni C »
                          sans virgule. */}
                      Ce vivier est <b>orienté dégâts</b> : {absentes.map((s, i) => (
                        <span key={s}>{i === 0 ? "ni " : ", ni "}{s}</span>
                      ))} n&apos;y figurent. Un tank ne gagne donc <b>rien de garanti</b> à monter la
                      rareté de son arme, et c&apos;est le genre de chose qu&apos;on n&apos;apprend
                      qu&apos;après avoir dépensé les parchemins.
                    </>
                  : <>
                      Ce vivier porte {presentes.length === 1 ? "une statistique défensive" : `${presentes.length} statistiques défensives`}
                      {" "}(<b>{presentes.join(", ")}</b>) : un tank y trouve donc son compte, contrairement à
                      ce que cette page a longtemps dit.
                    </>}
              </p>
            </>
          )}
          <p className="mc-src">
            Ces deux tables viennent de la table de valeurs du builder, pas d&apos;une infobulle du
            jeu : <b>elles n&apos;ont pas été rejouées</b>.{" "}
            {r.somme === 100
              ? <>Les chances font bien {r.somme} % au total, ce qui est bon signe sans être une preuve.</>
              : <>Attention, elles font {r.somme} % au total et non 100 — la table est donc incomplète ou mal lue.</>}
          </p>
        </Point>
      )}
    </div>
  );
}

/* ═══ 3. Artefact & ascension ════════════════════════════════════════════════ */

export function Artefact() {
  const source = objets(["II_SYS_SYS_PLAN_ARTEFACT", "II_SYS_SYS_STONE_ARTEFACT"]);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={note}>
        Jusqu&apos;à +{ARME_SIMPLE.upMax}, tu améliores. À partir de +{ARME_SIMPLE.upMax + 1} ta
        pièce devient un <b>artefact</b> : elle porte ce bandeau, elle gagne jusqu&apos;à trois
        étoiles d&apos;ascension, elle monte jusqu&apos;à +{ARME_ARTEFACT.upMax} et elle ouvre les
        {" "}{ARME_ARTEFACT.sertissage?.holo} diamants holographiques.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ETIQUETTE_ARTEFACT} alt="Artefact" style={{ height: 24, width: "auto", imageRendering: "pixelated" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ETIQUETTE_ULTIME} alt="Ultime" style={{ height: 24, width: "auto", imageRendering: "pixelated" }} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          {[1, 2, 3].map((i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={i <= 2 ? ETOILE_PLEINE : ETOILE_VIDE} alt="" style={{ width: 20, height: 20, imageRendering: "pixelated" }} />
          ))}
          <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginLeft: 6 }}>2 étoiles sur 3</span>
        </span>
        <Case src={ICONE_UPGRADE} nom="Amélioration" taille={26} />
      </div>

      <Groupe titre="Le plan d'ascension dépend de ton arme">
        <p style={note}>
          {FAMILLES.length} familles, et une seule pour le glaive et la doloire. Si ton arme
          n&apos;est pas dans cette liste, le client ne dessine pas son plan : le site te le dira
          en mots plutôt qu&apos;avec l&apos;image d&apos;une autre arme.
        </p>
        {/* `flexWrap` et non une largeur fixe sur la ligne de famille : « nom +
            trois plans + essence » fait 355 px, et sur un telephone cette seule
            ligne poussait la PAGE entiere en defilement horizontal. Elle se
            replie maintenant dans son propre cadre.
            Et le commentaire est ICI, pas dans le `map` : entre accolades, a
            l'interieur d'un retour de fonction flechee, il compte comme une
            expression a part et met la page en 500. */}
        <div style={{ display: "grid", gap: 6 }}>
          {FAMILLES.map((f) => (
            <div key={f.arme} className="fx-card" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "7px 10px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
              <span style={{ flex: "0 0 auto", minWidth: 110, fontSize: 12.5, fontWeight: 700 }}>{f.label}</span>
              {[1, 2, 3].map((n) => {
                const src = planAscension(f.arme, n);
                if (!src) return null;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={n} src={src} alt="" title={`${f.label} — ascension ${n}`} style={{ width: 28, height: 28, objectFit: "contain", imageRendering: "pixelated" }} />
                );
              })}
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginLeft: 4 }}>1 · 2 · 3</span>
              {/* Jamais de `src=""` en repli : le navigateur recharge alors la
                  page courante comme si c'était une image, et l'icône cassée est
                  plus bruyante que l'absence. */}
              {essenceArme(f.arme) && (
                <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={essenceArme(f.arme)!} alt="" title={`Essence — ${f.label}`} style={{ width: 26, height: 26, objectFit: "contain", imageRendering: "pixelated" }} />
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>essence</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </Groupe>

      <Groupe titre="Ce que tu ramasses pour ça">
        <div style={grille}>
          {RESSOURCES.map((r) => <Case key={r.f} src={`/jeu/mecaniques/${r.f}.webp`} nom={r.nom} />)}
        </div>
        {source.length > 0 && (
          <>
            <p style={note}>
              Deux de ces objets disent eux-mêmes où ils tombent — c&apos;est écrit dans leur
              infobulle, et ça ne l&apos;est nulle part ailleurs :
            </p>
            <div style={{ display: "grid", gap: 5 }}>
              {source.map((o) => <LigneObjet key={o.cle} o={o} />)}
            </div>
          </>
        )}
        <p style={note}>
          Ce qui vient <i>après</i> le passage en artefact — de +{ARME_SIMPLE.upMax + 1} à
          +{BIJOU.upMax}, et le sertissage au-delà de {ARME_ARTEFACT.sertissage?.diamants} — est
          dans <b>Les plafonds cachés</b>.
        </p>
      </Groupe>
    </div>
  );
}

/* ═══ 4. Les plafonds cachés ═════════════════════════════════════════════════ */

export function Plafonds() {
  const holo = objet("II_SYS_SYS_DIAMOND_ARTEFACT");
  const dia = ARME_ARTEFACT.sertissage?.diamants ?? 0;
  const nHolo = ARME_ARTEFACT.sertissage?.holo ?? 0;
  const luca = comptoirDeLuca();
  const taux = parcheminsClasses();
  const absolus = objets(PARCHEMINS_ABSOLUS);
  // Le palier est dans le nom du parchemin (« … Absolu +6 ») : on le lit plutôt
  // que de le déduire du nombre de parchemins, qui ne dit rien du premier.
  const paliersAbsolus = absolus
    .map((o) => Number(/\+(\d+)/.exec(o.n)?.[1] ?? 0))
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const plageAbsolue = paliersAbsolus.length
    ? `+${paliersAbsolus[0]} à +${paliersAbsolus[paliersAbsolus.length - 1]}`
    : "";
  const familles = famillesDeJoyau();
  // Les quatre premières familles plafonnent ; la dernière — le Diamant — non.
  const quiPlafonnent = familles.slice(0, -1).map((f) => f.nom).join(", ");
  const quiDepasse = familles[familles.length - 1]?.nom ?? "Diamant";

  return (
    <>
      <Point titre={`Une arme Artefact +${ARME_ARTEFACT.upMax} accepte ${dia + nHolo} gemmes, pas ${dia}`} marque="profit">
        <div className="mc-cote">
          <Vignette src="/jeu/mecaniques/artefact-diamant-holographique.webp" legende="Diamant holographique" />
          <p>
            {quiPlafonnent} plafonnent bien à <b>{dia}</b> gemmes. Le <b>{quiDepasse}</b>, non :
            il a <b>{nHolo} paliers de plus</b>, et chacun rapporte autant que le
            {" "}{dia}<sup>e</sup>. Ce qui les débloque porte un nom dans le jeu, et son infobulle
            le dit mot pour mot.
          </p>
        </div>
        {holo && <LigneObjet o={holo} />}
        <p>
          Conséquence directe : toute comparaison de build faite sur {dia} gemmes
          <b> sous-estime le haut du jeu de {nHolo} paliers</b>. Quand on compare le stuff
          d&apos;un inscrit à un build de référence, c&apos;est là que l&apos;écart se creuse pour
          de bon.
        </p>
      </Point>

      <Point titre={`Et l'échelle d'amélioration ne s'arrête pas à +${ARME_ARTEFACT.upMax}`}>
        <p>
          Elle monte jusqu&apos;à <b>+{BIJOU.upMax}</b>. Chaque étage a ses objets, et le client
          écrit lui-même à quoi ils servent : ce sont ses phrases qui sont citées ci-dessous, pas
          les nôtres.
        </p>
        <div>
          {ECHELLE.map((e) => {
            const l = objets(e.cles);
            if (!l.length) return null;
            return (
              <div key={e.de} className="mc-etage">
                <span className="mc-etage-t"><b>{e.de}</b><span>{e.titre}</span></span>
                <span className="mc-etage-l">
                  {l.map((o) => <LigneObjet key={o.cle} o={o} />)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mc-src">
          Un anneau, une boucle ou un collier monte à <b>+{BIJOU.upMax}</b> sans passer par
          l&apos;artefact ; une tenue, un casque, des gants s&apos;arrêtent à
          {" "}<b>+{TENUE.upMax}</b>. Ce n&apos;est pas la même échelle, et c&apos;est pour ça
          qu&apos;un « +20 » ne veut rien dire tant qu&apos;on ne sait pas de quelle pièce on parle.
        </p>
      </Point>

      {luca.objets.length > 0 && (
        <Point titre="Un seul PNJ tient la moitié de cette échelle">
          <p>
            {luca.objets.length} de ces objets s&apos;échangent au même endroit :
            le PNJ <b>Donjon Luca</b>. C&apos;est le passage obligé de tout le haut niveau, et
            aucune interface du jeu ne le récapitule.
          </p>
          <ul>
            {luca.objets.map((o) => <li key={o.cle}>{o.n}</li>)}
          </ul>
          {luca.monnaies.length > 0 && (
            <>
              <p className="mc-src">Il prend {luca.monnaies.length} monnaies, et rien d&apos;autre :</p>
              <div style={{ display: "grid", gap: 5 }}>
                {luca.monnaies.map((o) => <LigneObjet key={o.cle} o={o} />)}
              </div>
            </>
          )}
        </Point>
      )}

      <Point titre="Ce que les parchemins ajoutent vraiment — et ceux qui n'ajoutent rien" marque="piege">
        <p>
          On lisait ici « les taux affichés sont des bonus, pas des probabilités de base ». C&apos;est
          vrai de la moitié d&apos;entre eux seulement, et la confusion coûte cher :{" "}
          <b>{taux.ajoutent.length} parchemins s&apos;ajoutent au taux ou le garantissent</b>, et
          {" "}<b>{taux.remplacent.length} le remplacent</b> — ceux-là n&apos;empilent rien, glisser
          deux « Parchemin d&apos;amélioration » ne fait pas 200 %.
        </p>
        {taux.ajoutent.length > 0 && (
          <>
            <p className="mc-src">Ceux qui <b>s&apos;ajoutent</b>, ou garantissent le coup :</p>
            <div style={{ display: "grid", gap: 5 }}>
              {taux.ajoutent.map((x) => (
                <LigneObjet
                  key={x.fiche.cle}
                  o={x.fiche}
                  apres={
                    <Bonus
                      b={[
                        [x.genre === "garantit" ? "réussite" : "taux", x.pct] as [string, number],
                      ]}
                    />
                  }
                />
              ))}
            </div>
          </>
        )}
        {taux.remplacent.length > 0 && (
          <>
            <p className="mc-src">
              Ceux qui <b>remplacent</b> le taux, chacun sur sa propre tranche de paliers — c&apos;est
              la tranche qui compte, pas le pourcentage :
            </p>
            <Bareme
              lignes={taux.remplacent.map((x) => [
                `${x.fiche.n}${x.plage ? ` — ${x.plage}` : ""}`,
                `${x.pct} %`,
              ] as [string, string])}
            />
            {taux.remplacent.some((x) => x.pasArmure) && (
              <p className="mc-src">
                Et l&apos;un d&apos;eux ne marche <b>que sur les armes</b> : son infobulle exclut les
                armures et les boucliers, ce que personne ne relit avant de l&apos;essayer.
              </p>
            )}
          </>
        )}
        {taux.autres.length > 0 && (
          <div style={{ display: "grid", gap: 5 }}>
            {taux.autres.map((x) => <LigneObjet key={x.fiche.cle} o={x.fiche} />)}
          </div>
        )}
        {/* « La limite que TOUS partagent » etait faux : seuls les Sfusion
            ecrivent « une seule tentative », les trois Parchemins
            d'amelioration n'en parlent pas. On compte ceux qui le disent
            plutot que d'etendre la phrase aux six. */}
        {taux.unTir > 0 && (
          <p className="mc-src">
            La limite qu&apos;aucune interface ne rappelle : un parchemin n&apos;est actif que pour
            {" "}<b>une seule tentative</b>, il ne reste pas posé sur la pièce.{" "}
            {taux.unTir < taux.total
              ? <>Mais attention à la portée : <b>{taux.unTir} des {taux.total}</b> l&apos;écrivent
                dans leur infobulle. Les {taux.total - taux.unTir} autres n&apos;en disent rien —
                ça ne veut pas dire qu&apos;ils durent, ça veut dire que <i>le client ne le
                précise pas</i>.</>
              : <>Les {taux.total} l&apos;écrivent dans leur infobulle.</>}
          </p>
        )}
        {absolus.length > 0 && (
          <>
            <p>
              Et il existe {absolus.length} <b>Parchemins d&apos;Enchantement Absolu</b>, un par
              palier de {plageAbsolue}, qui ne parlent pas de taux du tout : ils amènent la pièce
              au palier <b>à coup sûr</b>, sans objet de protection. Quand un membre en a un, il
              vaut mieux le garder pour le palier qui casse.
            </p>
            {/* Ces cinq-la partagent une seule et meme infobulle, qu'on ne cite
                donc pas cinq fois — et qui parle en passant d'une gamme
                d'armes que ce serveur n'a pas integree. On garde la limite qui
                compte, en une ligne. */}
            <div style={grille}>
              {absolus.map((o) => (
                <Case key={o.cle} src={iconeDe(o)} nom={o.n.replace(/^Parchemin d.Enchantement Absolu\s*/i, "")} />
              ))}
            </div>
            <p className="mc-src">
              Leur infobulle pose une limite : ils <b>ne fonctionnent pas sur une arme Ultime</b>.
            </p>
          </>
        )}
        <p className="mc-src">
          Le taux de <b>base</b>, lui, n&apos;est écrit nulle part dans le client — on ne le
          publiera donc pas, et personne ne devrait le citer de mémoire.
        </p>
      </Point>
    </>
  );
}

/* ═══ 5. Perçage ═════════════════════════════════════════════════════════════ */

/** Un palier de carte : son image si nos assets l'ont, son nom sinon. Les deux
 *  disent la même chose ; ce qu'on refuse, c'est de montrer le dessin du palier
 *  voisin faute d'avoir le bon. */
function Palier({ famille, palier, nom, couleur }: { famille: string; palier: string; nom: string; couleur?: string }) {
  const src = iconePercage(famille, palier);
  if (src) return <Case src={src} nom={nom} couleur={couleur} />;
  return <Chip texte={nom} titre="Le client a ce palier, nos assets n'en ont pas l'image" />;
}

export function Percage() {
  const c = cartesDePercage();
  const annuler = panneau(/annuler un effet de piercing/i);
  const sansImage = [...c.attaque, ...c.defense]
    .flatMap((f) => f.paliers.filter((p) => !iconePercage(f.famille, p.palier)).map((p) => p.palier))
    .length;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={note}>
        Le même élément change de nom selon ce qu&apos;il fait : le feu <b>attaque</b> sous
        « Feu » et <b>défend</b> sous « Volcano ». Une arme et un bouclier prennent des cartes
        d&apos;attaque, une tenue prend des cartes de défense — d&apos;où deux séries de dessins,
        {" "}<b>{c.nAttaque}</b> cartes d&apos;un côté, <b>{c.nDefense}</b> de l&apos;autre.
      </p>
      <p style={note}>
        Une arme percée ouvre jusqu&apos;à <b>{ARME_SIMPLE.percage?.max}</b> emplacements,
        {" "}<b>{ARME_ARTEFACT.percage?.max}</b> une fois passée en artefact ; une tenue,
        {" "}<b>{TENUE.percage?.max}</b>. Le nombre d&apos;emplacements et le palier de la carte
        sont deux choses différentes, et c&apos;est le palier que le vendeur oublie d&apos;écrire.
      </p>

      <Groupe titre={`Attaque — arme et bouclier (${CARTES_ATTAQUE.length} éléments)`}>
        <div style={{ display: "grid", gap: 7 }}>
          {c.attaque.map((f) => (
            <div key={f.famille} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ width: 74, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: COULEUR_CARTE[f.famille] ?? "var(--text)" }}>{f.famille}</span>
              {f.paliers.map((p) => (
                <Palier key={p.palier} famille={f.famille} palier={p.palier} nom={p.palier} couleur={COULEUR_CARTE[f.famille]} />
              ))}
            </div>
          ))}
        </div>
      </Groupe>

      <Groupe titre={`Défense — tenue (${CARTES_DEFENSE.length} éléments)`}>
        <div style={{ display: "grid", gap: 7 }}>
          {c.defense.map((f) => (
            <div key={f.famille} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ width: 74, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: COULEUR_CARTE[f.famille] ?? "var(--text)" }}>{f.famille}</span>
              {f.paliers.map((p) => (
                <Palier key={p.palier} famille={f.famille} palier={p.palier} nom={`${p.palier} %`} couleur={COULEUR_CARTE[f.famille]} />
              ))}
            </div>
          ))}
        </div>
      </Groupe>

      <p style={note}>
        Les paliers en pointillés existent dans le client mais nos assets n&apos;en ont pas
        l&apos;image ({sansImage} sur {c.total}) : on écrit le palier plutôt que de te montrer le
        dessin d&apos;un autre. Et l&apos;<b>Air</b> n&apos;a pas de rang R là où les quatre autres
        éléments en ont un — ce n&apos;est pas un oubli de notre part, c&apos;est le client.
      </p>

      {annuler && (
        <Point titre="Se tromper de carte se paie, et pas qu'en carte" marque="piege">
          <p>
            Le panneau du jeu, seul endroit où c&apos;est écrit, pose deux règles d&apos;un coup : on
            ne retire que <b>la dernière carte sertie</b>, et l&apos;opération a un tarif fixe.
          </p>
          <p className="mc-cite">« {annuler.texte} »</p>
          <p>
            Comme pour les gemmes de costume, on ouvre donc <b>en dernier</b> les emplacements dont on
            est le moins sûr : sur une arme à {ARME_ARTEFACT.percage?.max} emplacements, une erreur au
            {" "}2<sup>e</sup> perçage se paie autant de fois qu&apos;il y a de cartes posées après
            elle.
          </p>
        </Point>
      )}
    </div>
  );
}

/* ═══ 6. Éveil, scroll, élément ══════════════════════════════════════════════ */

export function Eveil() {
  const cartes = cartesDElement();
  const obsoletes = cartes.filter((x) => x.obsolete).length;
  const fixes = eveilFixe(/^II_SYS_SYS_SCR_FIX_AWAKE_/);
  const changer = panneau(/changement d.él[eé]ment/i);
  const eveiller = panneau(/éveil d.objet/i);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={note}>
        <b>R1</b> et <b>R2</b> sont deux parchemins d&apos;éveil : ils posent une statistique en
        plus sur la pièce, R2 plus fort que R1, prise parmi {STATS_EVEIL.length}. Le <b>scroll de
        stat</b> monte une des {STATS_SCROLL.length} statistiques de base de +1 à +4.
        L&apos;<b>élément</b> de l&apos;arme (jusqu&apos;à +{ARME_ARTEFACT.elementMax}) ne se
        confond pas avec les cartes de perçage.
      </p>
      <div style={grille}>
        <Case src={ICONE_EVEIL.R1} nom="Éveil R1" />
        <Case src={ICONE_EVEIL.R2} nom="Éveil R2" />
        <Case src={ICONE_SCROLL} nom="Scroll de stat" />
      </div>

      <Groupe titre="Élément de l'arme">
        <div style={grille}>
          {Object.entries(ICONE_ELEMENT).map(([nom, src]) => <Case key={nom} src={src} nom={nom} taille={24} />)}
        </div>
      </Groupe>

      <Groupe titre={`Ce qui monte l'élément : ${cartes.length} cartes, et un piège`}>
        <p style={note}>
          Ces cartes-là s&apos;appellent aussi « Carte » et ne percent rien : elles montent
          l&apos;élément. Il y en a deux par élément, et <b>{obsoletes} sont marquées obsolètes par
          le client lui-même</b> parce qu&apos;elles plafonnent à +5. Acheter une Carte Flamma
          plutôt qu&apos;une Carte Brasero, c&apos;est payer un plafond quatre fois plus bas.
        </p>
        <div style={{ display: "grid", gap: 5 }}>
          {cartes.map(({ fiche }) => <LigneObjet key={fiche.cle} o={fiche} />)}
        </div>
        <p style={note}>
          À noter : le client dit « foudre » là où le builder dit
          {" "}« {Object.keys(ICONE_ELEMENT).find((k) => /lectric/i.test(k)) ?? "Électricité"} ».
          Même élément, deux mots. Les cinq pastilles montrées ici sont celles du builder
          {" "}(<b>/airbuilder/icons/elements/</b>) ; la fouille du client en a livré une seconde
          série (<b>/jeu/mecaniques/element-*</b>) qu&apos;on n&apos;affiche pas, pour que le même
          élément ait le même dessin ici et dans l&apos;AirBuilder.
        </p>
      </Groupe>

      {changer && (
        <Point titre="Changer d'élément ne recommence pas à zéro" marque="profit">
          <p>
            C&apos;est la bonne nouvelle que le jeu n&apos;annonce que dans sa fenêtre de
            transformation, et personne ne va la lire avant d&apos;avoir monté vingt niveaux
            d&apos;élément :
          </p>
          <p className="mc-cite">« {changer.texte} »</p>
          {/* L'exemple du jeu est a +10, et il ne faut PAS le reecrire a +20 :
              la page affichait sa citation a +10 puis « Eau +20 devient Feu +20 »
              juste en dessous, et le chiffre du site contredisait celui du jeu
              dans la meme respiration. La regle est la conservation, quel que
              soit le palier — on le dit comme ca, et le plafond reste une
              precision separee. */}
          <p>
            Autrement dit, <b>la valeur suit l&apos;élément</b> : l&apos;exemple du jeu la montre à
            +10, et rien dans la phrase ne la limite — jusqu&apos;au plafond de
            {" "}<b>+{ARME_ARTEFACT.elementMax}</b> qu&apos;une arme peut atteindre. Une arme
            élémentarisée au mauvais élément n&apos;est donc <b>pas perdue</b>, et elle se vend au
            prix d&apos;une arme élémentarisée, pas au prix d&apos;une arme nue.
          </p>
        </Point>
      )}

      {fixes.lignes.length > 0 && (
        <Point titre={`L'éveil ne se tire pas forcément : ${fixes.total} parchemins posent la ligne qu'on veut`}>
          <p>
            À côté de l&apos;éveil au hasard, le client vend des parchemins d&apos;éveil
            {" "}<b>fixe</b> : la statistique est écrite sur le parchemin. Il y en a pour
            {" "}<b>{fixes.lignes.length} statistiques</b> — soit{" "}
            {fixes.lignes.length > STATS_EVEIL.length
              ? <><b>{fixes.lignes.length - STATS_EVEIL.length} de plus</b> que ce que le formulaire du
                site propose</>
              : <>autant que le formulaire du site en propose</>}
            {" "}— chacune en rang 1 et rang 2.
          </p>
          <Bareme
            lignes={fixes.lignes.map((l) => [
              `${l.label || l.code}${l.pieces.length ? ` — ${l.pieces.join(", ")}` : ""}`,
              `R1 +${l.r1}${l.pourcent ? " %" : ""} · R2 +${l.r2}${l.pourcent ? " %" : ""}`,
            ] as [string, string])}
          />
          <p className="mc-src">
            La colonne de gauche n&apos;est pas décorative : chaque parchemin nomme{" "}
            <b>les pièces sur lesquelles il se pose</b>, et ce n&apos;est pas la même liste pour
            tous — la Force ne va pas sur des bottes, les Soins ne vont pas sur un casque. Aucune
            interface du jeu ne récapitule ça.
          </p>
          {fixes.pasDouble.length === 0 && (
            <p className="mc-src">
              Sur cette série, <b>le rang 2 vaut exactement le double du rang 1</b>, sans exception.
              Ce n&apos;est pas vrai de la série pour costumes : voir <b>Costumes &amp; gemmes de
              costume</b>.
            </p>
          )}
          {/* Le panneau du jeu commence par un code couleur du client
              (« #cfff ») : on l'enleve sur ses chiffres hexa SEULEMENT. Un \w+
              mangeait le mot qui suit et la phrase demarrait sur un verbe nu.
              Et ce commentaire est ICI, au-dessus de la condition : entre
              accolades juste apres un `&& (`, il compte comme l'expression a
              rendre et met la page en 500. */}
          {eveiller && (
            <p className="mc-src">
              Et l&apos;opération a un tarif : « {eveiller.texte.replace(/^#[0-9a-fA-F]{3,6}/, "")} »
            </p>
          )}
        </Point>
      )}
    </div>
  );
}

/* ═══ 7. Sertissage & gemmes ═════════════════════════════════════════════════ */

export function Sertissage() {
  const dia = ARME_ARTEFACT.sertissage?.diamants ?? 0;
  const nHolo = ARME_ARTEFACT.sertissage?.holo ?? 0;
  const plafonds = plafondsDeSertissage();
  const ordres = ordresDeSertissage();
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={note}>
        Une arme porte <b>{dia} diamants</b>, et <b>{nHolo} holographiques</b> de plus une fois
        passée en artefact — soit {dia + nHolo} emplacements en tout, ce que presque personne ne
        sait (voir <b>Les plafonds cachés</b>). Ce qui se sertit sur un <b>costume</b> n&apos;est
        pas un diamant mais un joyau de la pièce, et ça n&apos;obéit pas aux mêmes règles : tout est
        dans <b>Costumes &amp; gemmes de costume</b>, juste en dessous.
      </p>
      <div style={grille}>
        <Case src={ICONE_DIAMANT} nom="Diamant" />
        <Case src={ICONE_HOLO} nom="Diamant holographique" />
      </div>

      <Groupe titre={`Les ${plafonds.length || STATS_DIAMANT.length} statistiques du sertissage, et jusqu'où elles montent`}>
        <p style={note}>
          L&apos;ordre de cette liste est la clef de tout : c&apos;est lui qu&apos;AirFlyff a changé
          sans retoucher les noms des gemmes, et c&apos;est pour ça que
          {" "}<b>{nombreDeGemmesMenteuses()} noms sur {tableauDesGemmes().length} mentent</b>
          {" "}(section <b>Les gemmes mentent</b>). Les plafonds, eux, ne sont écrits dans aucune
          infobulle : ils viennent de la table de valeurs du builder.
        </p>
        {/* Le rang affiche est celui de la table de VALEURS, pas celui de la
            liste deroulante : c'est l'ordre auquel les neuf Diamants du client
            repondent rang pour rang (cf. Les gemmes mentent). Numeroter la
            liste deroulante ferait de la page un troisieme temoin faux. */}
        <div style={grille}>
          {plafonds.length > 0
            ? plafonds.map((p, i) => (
              <Chip key={p.stat} texte={`${String(i + 1).padStart(2, "0")} · ${p.stat} +${p.max}`} />
            ))
            : STATS_DIAMANT.map((s, i) => <Chip key={s} texte={`${String(i + 1).padStart(2, "0")} · ${s}`} />)}
        </div>
        {plafonds.length > 0 && !ordres.memeRangPartout && (
          <p style={note}>
            À noter, et c&apos;est le nœud de l&apos;affaire : le builder porte ces
            {" "}{plafonds.length} statistiques <b>deux fois, dans deux ordres différents</b> — celui
            de sa liste déroulante et celui de sa table de valeurs. C&apos;est le second qui
            correspond au jeu.
          </p>
        )}
        <p style={note}>
          Ces valeurs sont des <b>plafonds</b>, pas le gain d&apos;une gemme : le fichier ne dit pas
          ce que la première pierre rapporte, ni comment les {dia + nHolo} se répartissent jusque-là.
          Et les libellés sont ceux de la table, en l&apos;état : « Melee Stealhp » y désigne ce que
          le client appelle ailleurs le <b>siphon de vie</b> — les doublets de vocabulaire sont
          listés dans <b>Les gemmes mentent</b>.
        </p>
      </Groupe>

      <Groupe titre={`Les ${nHolo} holographiques, et ce qu'ils donnent`}>
        <div style={grille}>
          {STATS_HOLO.map((s) => <Chip key={s} texte={s} />)}
        </div>
        <p style={note}>
          {STATS_HOLO.length} valeurs pour {nHolo} emplacements : on choisit, on ne cumule pas
          tout.
        </p>
      </Groupe>
    </div>
  );
}

/* ═══ 8. Runes ═══════════════════════════════════════════════════════════════ */

export function Runes() {
  const r = runes();
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={note}>
        Deux choses portent ce mot. La rune d&apos;<b>arme</b> dépend du palier de l&apos;arme,
        et le <b>marteau</b> a sa propre série. La rune de <b>tenue</b> (aussi cape, familier,
        ramasseur) porte la pierre de la statistique qu&apos;elle donne. Confondre les deux fait
        acheter la mauvaise — et il y en a <b>{r.total}</b> dans le jeu, pas quatre.
      </p>

      <Groupe titre="Rune d'arme">
        <div style={grille}>
          {Object.entries(ICONE_RUNE_ARME).map(([nom, src]) => <Case key={nom} src={src} nom={nom} />)}
          <Case src={ICONE_RUNE_VIERGE} nom="Yggdrasil vierge" />
        </div>
      </Groupe>
      <Groupe titre="Rune de marteau">
        <div style={grille}>
          {Object.entries(ICONE_RUNE_MARTEAU).map(([nom, src]) => <Case key={nom} src={src} nom={nom} />)}
        </div>
      </Groupe>
      <Groupe titre="Rune de tenue, par statistique">
        <div style={grille}>
          {Object.entries(ICONE_RUNE_STAT).map(([nom, src]) => <Case key={nom} src={src} nom={nom} />)}
        </div>
      </Groupe>

      <Groupe titre={`Les ${r.familles.length} familles, et combien chacune en compte`}>
        <Bareme lignes={r.familles.map((f) => [`${f.nom} — ${f.sous}`, String(f.membres.length)] as [string, string])} />
      </Groupe>

      <div style={{ display: "grid", gap: 8, paddingTop: 4 }}>
        <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>
          Deux runes à ne pas payer
        </div>

        {r.tankMenteuses.map((o) => (
          <div key={o.cle} className="mc-cote">
            <Vignette src={ICONE_RUNE_ARME.Ancestrale} legende="Rune Luzaka" />
            <Point titre={`« ${o.n} » n'est pas une rune tank`} marque="piege">
              <p>
                Les autres runes TANK de la gamme Luzaka donnent PV max % et Endurance. Celle-là,
                non : le fichier lui met ces deux statistiques, qui sont celles d&apos;une version
                support.
              </p>
              <Bonus b={o.b} />
              {o.d && <p className="mc-src">Et sa propre infobulle annonce autre chose encore : « {o.d} ».</p>}
              <p>
                Elle se vendra pourtant au prix des autres runes TANK, parce que son nom est le
                même. Un Templier au glaive qui la grave a payé une rune de prêtre.
              </p>
            </Point>
          </div>
        ))}

        {r.manquants.map((m) => (
          <Point key={`${m.gamme}-${m.modele}`} titre={`La ${m.modele} ${m.gamme.replace(/^Arme /, "")} n'existe pas dans le relevé`} marque="verifier">
            <p>
              C&apos;est le seul trou de la gamme : les autres modèles d&apos;arme y sont tous,
              celui-là n&apos;a ni nom français ni colonnes de statistiques. Tant que personne
              n&apos;a lu ses bonus en jeu, elle ne vaut <b>rien de prouvé</b> — et surtout pas le
              prix des autres.
            </p>
            <p className="mc-src">
              Le client laisse un indice ailleurs : l&apos;arme
              {" "}« {objet("II_WEA_AXT_VEMPIRE")?.n ?? "Doloire Vampirique"} » porte la note
              {" "}« {objet("II_WEA_AXT_VEMPIRE")?.d ?? ""} ».
            </p>
          </Point>
        ))}

        {r.intruses.map((o) => (
          <Point key={o.cle} titre={`« ${o.n} » détonne dans sa gamme`} marque="verifier">
            <p>
              Toutes ses voisines donnent du critique, de la vitesse ou de la puissance
              magique. Elle, elle donne du défensif :
            </p>
            <Bonus b={o.b} />
            <p>
              Ce n&apos;est peut-être pas une erreur — la doloire est l&apos;arme des tanks — mais
              qui l&apos;achète pour taper se trompe.
            </p>
          </Point>
        ))}

        {r.doublons.map((l) => (
          <Point key={l[0].cle} titre="Et un doublon qui traîne">
            <p>
              La « <b>{l[0].n}</b> » existe {l.length} fois, sous {l.length} clés différentes —
              {" "}{l.map((o) => o.cle.replace("II_SYS_SYS_RUNE_", "")).join(" et ")} — dont une
              rangée du côté des runes d&apos;arme avec les bonus de la rune de tenue. Deux objets
              différents, un seul nom : de quoi se tromper à l&apos;achat comme à la vente.
            </p>
            <Bonus b={l[0].b} />
          </Point>
        ))}
      </div>
    </div>
  );
}
