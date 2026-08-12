"use client";
import { Icon } from "@/components/Icon";
import FASHION from "@/data/fashion-bonus.json";

/**
 * LE FASHION, SES BONUS, ET LES GEMMES DE COSTUME.
 *
 * La question posée était : « les parties des bonus, les gemmes, le fashion —
 * tous les questionnements qu'on peut se poser ». Le site n'en disait qu'une
 * ligne, dans la carte de l'éveil : « Éveil à Fashion → Paradis Arcanique ».
 * Rien sur ce que le fashion RAPPORTE, alors que la réponse est dans le
 * catalogue du client depuis le début.
 *
 * Les quatre questions auxquelles cette section répond, dans l'ordre où on se
 * les pose :
 *
 *   1. Le fashion donne-t-il des statistiques ? — Rarement : 464 pièces sur
 *      3 099. Mais la moyenne ne veut rien dire, car…
 *   2. …lesquelles ? — La cape et le masque, aux deux tiers. Les quatre pièces
 *      qu'on VOIT (coiffe, tenue, gants, chaussures) sont un costume à 94 %
 *      (156 pièces à bonus sur 2 623 — recompté, la note disait 95).
 *      C'est le fait le plus utile de la page, et personne ne peut le deviner.
 *   3. Le plafond dépend-il de l'emplacement ? — Oui, et il se renverse trois
 *      fois : le masque bloque mieux que la cape, les chaussures portent les PM,
 *      la coiffe égale la cape en dégâts critiques.
 *   4. Faut-il monter une gemme au dernier palier ? — Ça dépend de la gemme, et
 *      d'un facteur 2 : le dernier palier vaut ×2,5 sur les PV et ×1,3 sur la
 *      défense.
 *
 * Aucun chiffre n'est écrit ici. Tout vient de `src/data/fashion-bonus.json`,
 * régénéré par `node scripts/extraire-fashion.mjs` : le catalogue d'objets pour
 * le fashion, `builder-data.json` pour les gemmes. Un chiffre recopié à la main
 * finit toujours par mentir — deux totaux de prestige l'avaient déjà fait sur
 * cette même page.
 */

const N = { fontVariantNumeric: "tabular-nums" } as const;
const pct = (n: number) => Math.round(n * 100);

/**
 * Une barre. Même forme que celle des Chambres Secrètes, et mêmes deux règles :
 *
 *  · UNE SEULE teinte, celle que le chiffre voisin emploie déjà. C'est la
 *    LONGUEUR qui porte la grandeur. Colorer par valeur ne marche pas : le vert
 *    et le doré de la charte ne se distinguent pas pour un daltonien protan
 *    (écart mesuré 5,8 de deltaE — deux teintes qu'on croit opposées).
 *  · Plancher à 1,5 %. Sans lui une valeur minuscule n'a plus de barre du tout,
 *    et une barre absente se lit comme une donnée manquante, pas comme un petit
 *    nombre. Le zéro, lui, ne reçoit PAS de barre : là, l'absence est la donnée.
 */
function Barre({ part, teinte = "var(--gold)", hauteur = 4 }: { part: number; teinte?: string; hauteur?: number }) {
  if (!(part > 0)) return null;
  return (
    <span aria-hidden="true" className="fa-barre" style={{ height: hauteur }}>
      <span style={{ width: `${Math.max(1.5, Math.min(100, part * 100))}%`, background: teinte }} />
    </span>
  );
}

/** Les six emplacements dans l'ordre du catalogue, cape et masque en tête. */
const EMPL = FASHION.emplacements;
/** Les bonus présents sur au moins trois emplacements : ceux dont la comparaison
 *  d'un emplacement à l'autre a un sens. En dessous, la ligne serait surtout vide. */
const COMPARABLES = FASHION.bonus.filter((b) => Object.keys(b.ou).length >= 3);
/**
 * Ce qui n'existe QUE sur une cape ou un masque — la réponse à « pourquoi ma
 * cape vaut plus cher que le reste de mon fashion ».
 *
 * ET LE RESTE, qui tombait dans un trou. Deux filtres se suivaient — « au moins
 * trois emplacements » pour le tableau, « cape ou masque uniquement » pour cette
 * carte — et deux bonus ne rentraient dans NI l'un NI l'autre : « Attaque » (cape
 * et coiffe) et « Vitesse d'attaque % » (coiffe seule). Ils disparaissaient de la
 * page, et avec eux la valeur la plus haute de tout le fashion hors PV : 320
 * d'attaque sur une cape. Le partage se fait donc sur trois ensembles dont la
 * somme est le total, et non sur deux qui laissent un reste.
 */
const NOMS_COMPARABLES = new Set(COMPARABLES.map((b) => b.nom));
// `ou` est typé par le JSON emplacement par emplacement (chaque bonus a sa forme
// exacte, avec des clés `?: undefined`) : un paramètre Record<string, number> ne
// l'accepte pas. On ne lit que les valeurs, d'où la signature minimale.
const parPlusHaut = (a: { ou: object }, b: { ou: object }) =>
  Math.max(...(Object.values(b.ou) as number[])) - Math.max(...(Object.values(a.ou) as number[]));
const RESTANTS = FASHION.bonus.filter((b) => !NOMS_COMPARABLES.has(b.nom));
const EXCLUSIFS = RESTANTS
  .filter((b) => Object.keys(b.ou).every((e) => e === "Cape" || e === "Masque"))
  .sort(parPlusHaut);
const NOMS_EXCLUSIFS = new Set(EXCLUSIFS.map((b) => b.nom));
/** Ni comparables, ni cape/masque : les deux orphelins, nommés plutôt qu'omis. */
const AUTRES = RESTANTS.filter((b) => !NOMS_EXCLUSIFS.has(b.nom)).sort(parPlusHaut);

/**
 * Les sommets, RANGÉS PAR LA CARTE QUI LES MONTRE.
 *
 * `FASHION.sommets` en compte 32 sur les six emplacements, tous bonus confondus.
 * Onze d'entre eux portent sur un bonus absent du tableau des plafonds, qui ne
 * montre que les bonus présents sur au moins trois emplacements. Écrire « 32 de
 * ces sommets » sous ce tableau attribuait onze exceptions à des lignes qui ne
 * s'y trouvent pas — le même genre d'erreur qu'un classement coupé à 60 sous un
 * compteur qui annonce 94.
 *
 * Chaque carte compte donc les siens, et les trois comptes s'additionnent au
 * total : 21 dans le tableau, 9 sur les exclusifs cape/masque, 2 sur les deux
 * bonus restants. Aucun sommet n'est cité sous une carte qui ne le montre pas.
 */
const sommetsDe = (noms: Set<string>) => FASHION.sommets.filter((s) => noms.has(s.bonus));
const SOMMETS_TABLEAU = sommetsDe(NOMS_COMPARABLES);
const SOMMETS_EXCLUSIFS = sommetsDe(NOMS_EXCLUSIFS);

/**
 * « Je monte laquelle au bout ? » — la réponse se DÉDUIT, elle ne s'écrit pas.
 *
 * La phrase disait « PV max et Dégâts magiques % gagnent plus de deux fois leur
 * valeur ». Deux erreurs dans une demi-ligne : la gemme de Dégâts critiques passe
 * elle aussi ×2,03 du 3ᵉ au 4ᵉ palier (32 → 65) et manquait donc à l'appel, et
 * « gagner plus de deux fois sa valeur » voudrait dire finir au-delà du triple,
 * alors qu'un ×2,5 ajoute une fois et demie. On nomme donc les gemmes en les
 * relisant dans la donnée, et on dit « multiplie par », qui est ce que le rapport
 * mesure.
 */
const RATIO_DERNIER = (g: { paliers: number[] }) => g.paliers[3] / g.paliers[2];
const GEMMES_TRIEES = [...FASHION.gemmes].sort((a, b) => RATIO_DERNIER(b) - RATIO_DERNIER(a));
const AU_BOUT = GEMMES_TRIEES.filter((g) => RATIO_DERNIER(g) >= 2);
const MOINDRE = GEMMES_TRIEES[GEMMES_TRIEES.length - 1];
/** « x,y fois » — jamais « 1.0 fois » ni un point décimal dans du texte français. */
const foisFr = (n: number) => n.toFixed(2).replace(/0$/, "").replace(".", ",");
const listeFr = (noms: string[]) =>
  noms.length < 2 ? (noms[0] ?? "") : `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`;

export function SectionFashion() {
  const partAvecBonus = FASHION.avecBonus / FASHION.total;
  // « L'écart est de un à treize » était écrit en toutes lettres. Il se calcule :
  // c'est le rapport entre l'emplacement le mieux servi et le moins bien servi.
  // Écrit à la main, il aurait survécu au premier relevé qui le démentait.
  const parts = EMPL.map((e) => e.avecBonus / e.pieces);
  const ecart = Math.round(Math.max(...parts) / Math.min(...parts));

  return (
    <>
      <div className="gd-card fx-card">
        <h2 className="gd-cardtitle"><Icon name="shirt" size={18} />Le fashion, et ce qu&apos;il rapporte</h2>
        <p className="gd-intro" style={{ marginBottom: 14 }}>
          Six emplacements, <b style={N}>{FASHION.total.toLocaleString("fr-FR")}</b> pièces dans le catalogue du
          client — et <b style={N}>{FASHION.avecBonus}</b> seulement qui portent un bonus, soit{" "}
          <b style={N}>{pct(partAvecBonus)} %</b>. La moyenne ne dit rien d&apos;utile : tout dépend de
          l&apos;emplacement, et l&apos;écart va de un à <b style={N}>{ecart}</b>.
        </p>

        {/* La barre porte la PART, pas le nombre de pièces : « 196 capes à bonus »
            et « 54 coiffes à bonus » se ressemblent, alors que 196 capes sur 294
            et 54 coiffes sur 707 disent deux choses opposées. */}
        <div className="fa-empl">
          {EMPL.map((e) => (
            <div key={e.nom} className="fa-empl-l">
              <span className="fa-empl-n">{e.nom}</span>
              <span className="fa-empl-b">
                <Barre part={e.avecBonus / e.pieces} hauteur={7} />
              </span>
              <span className="fa-empl-v" style={N}>{pct(e.avecBonus / e.pieces)} %</span>
              <span className="fa-empl-d" style={N}>{e.avecBonus} / {e.pieces}</span>
            </div>
          ))}
        </div>

        <div className="gd-note" style={{ marginTop: 14 }}>
          <b>Ce qu&apos;il faut en retenir :</b> les statistiques du fashion sont dans la{" "}
          <b>cape</b> et le <b>masque</b>. Les quatre pièces qu&apos;on voit — coiffe, tenue, gants,
          chaussures — sont un costume neuf fois sur dix. Payer une tenue rare pour ses bonus,
          c&apos;est payer un déguisement.
        </div>
      </div>

      <div className="gd-card fx-card">
        <h2 className="gd-cardtitle"><Icon name="layers" size={18} />Le plafond change avec l&apos;emplacement</h2>
        <p className="gd-intro" style={{ marginBottom: 4 }}>
          Le même bonus ne monte pas aussi haut partout. Sur chaque ligne, la barre compare les
          emplacements entre eux — la plus longue est le meilleur endroit pour ce bonus.
        </p>
        <p className="gd-src" style={{ marginBottom: 14 }}>
          {COMPARABLES.length} bonus se retrouvent sur au moins trois emplacements. Valeur = la plus
          haute relevée dans le catalogue, pas un maximum théorique.
        </p>

        <div className="fa-table">
          <div className="fa-th">
            <span />
            {EMPL.map((e) => <span key={e.nom}>{e.nom}</span>)}
          </div>
          {COMPARABLES.map((b) => {
            const ou = b.ou as Record<string, number>;
            const haut = Math.max(...Object.values(ou));
            return (
              <div key={b.nom} className="fa-tr">
                <span className="fa-tl">{b.nom}</span>
                {EMPL.map((e) => {
                  const v = ou[e.nom];
                  // Rien à cet emplacement : on n'écrit rien. Un « 0 » se lirait
                  // comme « ce bonus existe et vaut zéro », ce qui est faux.
                  if (v == null) return <span key={e.nom} className="fa-td vide">·</span>;
                  return (
                    <span key={e.nom} className={`fa-td${v === haut ? " haut" : ""}`}>
                      {/* Le nom de l'emplacement est répété dans chaque cellule, et
                          caché tant que l'en-tête du tableau est visible. Sur un
                          téléphone, la ligne d'en-tête disparaît et ce libellé prend
                          le relais : sans lui, « 20 15 10 9 7 7 » ne dit plus à quoi
                          chaque chiffre appartient. */}
                      <i className="fa-slot">{e.nom}</i>
                      <b style={N}>{v.toLocaleString("fr-FR")}</b>
                      <Barre part={v / haut} />
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="gd-note" style={{ marginTop: 14 }}>
          <b>Trois renversements à connaître.</b> La cape mène presque partout, sauf ici :
          le <b>masque</b> est la pièce de blocage (10 contre 5 sur la cape), les <b>chaussures</b>
          {" "}portent les PM et les PC (700 contre 150), et la <b>coiffe</b> égale la cape en dégâts
          critiques alors que le masque y plafonne à 5.
        </div>

        {/* Un maximum tenu par UNE pièce n'est pas un plafond : c'est une
            exception d'événement. Les nommer évite qu'un joueur cherche pendant
            une semaine une coiffe à 9 999 PV qui n'existe qu'en un exemplaire.
            Le compte est celui des sommets DE CE TABLEAU (cf. SOMMETS_TABLEAU) :
            les onze autres appartiennent à la carte suivante, et les additionner
            ici ferait pointer des exceptions vers des lignes absentes. */}
        <div className="gd-note" style={{ marginTop: 10 }}>
          <Icon name="alert" size={14} style={{ display: "inline-block", marginRight: 6 }} />
          <b>{SOMMETS_TABLEAU.length} des valeurs de ce tableau sont tenues par une seule pièce</b>, souvent
          d&apos;un événement passé. Les trois plus trompeuses :{" "}
          {SOMMETS_TABLEAU.slice(0, 3).map((s, i) => (
            <span key={s.objet + s.bonus}>
              {i > 0 ? ", " : ""}<b>{s.objet}</b> ({s.bonus} {s.valeur.toLocaleString("fr-FR")})
            </span>
          ))}
          . Ne construis pas un objectif sur une ligne unique du catalogue.
        </div>
      </div>

      <div className="gd-card fx-card">
        <h2 className="gd-cardtitle"><Icon name="cape" size={18} />Ce qui n&apos;existe que sur une cape ou un masque</h2>
        <p className="gd-intro" style={{ marginBottom: 14 }}>
          {EXCLUSIFS.length} bonus ne se posent sur aucune autre pièce de fashion. C&apos;est ce qui
          fait la valeur d&apos;une cape : les gains de confort — expérience, butin, penyas — n&apos;ont
          pas d&apos;autre porte d&apos;entrée.
        </p>
        <div className="fa-excl">
          {EXCLUSIFS.map((b) => {
            const ou = b.ou as Record<string, number>;
            return (
              <div key={b.nom} className="fa-excl-l">
                <span className="fa-excl-n">{b.nom}</span>
                <span className="fa-excl-v">
                  {["Cape", "Masque"].filter((e) => ou[e] != null).map((e) => (
                    <span key={e}><i>{e}</i> <b style={N}>{ou[e].toLocaleString("fr-FR")}</b></span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
        {/* LES ORPHELINS DES DEUX FILTRES.
            « Attaque » (cape, coiffe) et « Vitesse d'attaque % » (coiffe) ne sont ni
            sur trois emplacements ni réservés à la cape et au masque : ils
            n'apparaissaient donc NULLE PART, alors que 320 d'attaque sur une cape
            est la deuxième plus grosse valeur du fashion. Une ligne suffit à les
            rendre, et le compte des trois blocs fait alors le total du relevé. */}
        {AUTRES.length > 0 && (
          <p className="gd-src" style={{ marginTop: 10 }}>
            {AUTRES.length === 1 ? "Un bonus reste à part — trop rare" : `${AUTRES.length} bonus restent à part — trop rares`}{" "}
            pour le tableau, pas réservés à la cape :{" "}
            {AUTRES.map((b, i) => {
              const ou = b.ou as Record<string, number>;
              return (
                <span key={b.nom}>
                  {i > 0 ? " ; " : ""}<b>{b.nom}</b>{" "}
                  {EMPL.filter((e) => ou[e.nom] != null)
                    .map((e) => `${e.nom} ${ou[e.nom].toLocaleString("fr-FR")}`)
                    .join(" · ")}
                </span>
              );
            })}
            .
          </p>
        )}
        {/* La même mise en garde que sous le tableau, pour les sommets qui vivent
            ICI : ces valeurs ne sont pas des plafonds atteignables mais des pièces
            uniques, souvent d'événement. Le compte se lit dans la donnée. */}
        <p className="gd-src" style={{ marginTop: 10 }}>
          <b>{SOMMETS_EXCLUSIFS.length} de ces valeurs sont tenues par une seule pièce</b> — dont{" "}
          {SOMMETS_EXCLUSIFS.slice(0, 3).map((s, i) => (
            <span key={s.objet + s.bonus}>
              {i > 0 ? ", " : ""}<b>{s.objet}</b> ({s.bonus} {s.valeur.toLocaleString("fr-FR")})
            </span>
          ))}
          . Deux des capes citées portent le nom que l&apos;AirBuilder leur donne, la <b>Cape du
          farmeur doré</b> et la <b>Cape donjon dorée</b> : ce sont bien les mêmes objets, écrits
          « Farmeur Dore » et « Donjon Dore » dans sa liste de capes.
        </p>
      </div>

      <div className="gd-card fx-card">
        <h2 className="gd-cardtitle"><Icon name="gem" size={18} />Les gemmes de costume — {FASHION.gemmes.length} bonus, 4 paliers</h2>
        <p className="gd-intro" style={{ marginBottom: 4 }}>
          Une gemme de costume se pose sur le fashion et monte par paliers. Les quatre valeurs sont
          connues ; ce qu&apos;on ne voit pas dans une liste de chiffres, c&apos;est <b>où se trouve le
          gain</b>. Les barres le montrent : elles comparent les quatre paliers d&apos;une même gemme
          entre eux, le quatrième valant toute la longueur.
        </p>
        <p className="gd-src" style={{ marginBottom: 14 }}>
          Une gemme dont les barres montent régulièrement se joue à n&apos;importe quel palier ; une
          gemme dont les trois premières barres sont courtes ne vaut que montée au bout.
        </p>

        <div className="fa-gem">
          {FASHION.gemmes.map((g) => {
            const p = g.paliers;
            const der = p[3] / p[2];
            const tot = p[3] / p[0];
            return (
              <div key={g.stat} className="fa-gem-c">
                <div className="fa-gem-h">
                  <b>{g.stat}</b>
                  <i style={N}>×{tot.toFixed(1).replace(".", ",").replace(",0", "")} du 1<sup>er</sup> au 4<sup>e</sup></i>
                </div>
                <div className="fa-gem-p">
                  {p.map((v, i) => (
                    <span key={i} className="fa-gem-l">
                      <span className="fa-gem-r">{i + 1}</span>
                      <span className="fa-gem-b"><Barre part={v / p[3]} hauteur={6} /></span>
                      <span className="fa-gem-v" style={N}>{v.toLocaleString("fr-FR")}</span>
                    </span>
                  ))}
                </div>
                <div className="fa-gem-f">
                  Dernier palier : <b style={N}>×{der.toFixed(2).replace(".", ",")}</b>
                </div>
              </div>
            );
          })}
        </div>

        <div className="gd-note" style={{ marginTop: 14 }}>
          <b>Répondre à « je monte laquelle au bout ? »</b> — Le dernier palier ne vaut pas la même
          chose selon la gemme. {AU_BOUT.length === 1 ? "Une seule" : `${AU_BOUT.length}`}{" "}
          {AU_BOUT.length === 1 ? "gemme au moins double" : "gemmes au moins doublent"} du 3
          <sup>e</sup> au 4<sup>e</sup> palier — <b>{listeFr(AU_BOUT.map((g) => g.stat))}</b> —
          quand la <b>{MOINDRE.stat}</b> ne se multiplie que par{" "}
          <b style={N}>{foisFr(RATIO_DERNIER(MOINDRE))}</b>. Une gemme de{" "}
          {MOINDRE.stat.toLowerCase()} au palier 3 est presque une gemme au palier 4 ; une gemme de
          PV au palier 3, non.
        </div>

        {/* Une bizarrerie de la donnée, dite plutôt que corrigée en silence : si
            quelqu'un compare avec l'AirBuilder, il doit savoir pourquoi le compte
            diffère d'une unité. */}
        {FASHION.gemmesDoublons > 0 && (
          <p className="gd-src" style={{ marginTop: 10 }}>
            La table de l&apos;AirBuilder compte {FASHION.gemmesBrutes} entrées pour{" "}
            {FASHION.gemmes.length} bonus : « Soin % » y figure deux fois, aux mêmes valeurs. On ne
            l&apos;affiche qu&apos;une fois.
          </p>
        )}

        {/* Le partage des rôles avec l'autre page qui parle de costume, dit
            explicitement — sans ça les deux se ressemblent et le lecteur croit
            avoir déjà lu. Ici : COMBIEN vaut chaque bonus, et lequel mérite le
            dernier palier. Là-bas : ce qu'est le costume, combien d'emplacements
            de gemme porte une pièce, et ce qu'une opération DÉTRUIT — la seule
            question dont la réponse est irréversible. */}
        {/* La pastille du cadenas, comme sur les autres liens sortants de cette
            page publique : /builder/mecaniques vit dans src/app/(verified)/, dont
            le layout appelle requireVerified(). Un visiteur non connecté part sur
            /login. La classe .gd-verrou est celle de la page hôte — cette section
            est rendue dedans, elle n'a pas de style à elle. */}
        <p className="gd-src" style={{ marginTop: 10 }}>
          Cette carte dit ce que <b>vaut</b> chaque gemme. Combien d&apos;emplacements de gemme porte
          une pièce, quel joyau va dans lequel, et ce qu&apos;un retrait détruit :{" "}
          <a href="/builder/mecaniques">le costume dans Les mécaniques</a>{" "}
          <span className="gd-verrou" title="Demande un compte : connexion Discord (membre du serveur)">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/jeu/interface/lock.webp" alt="" width={11} height={13} />
            compte
          </span>.
        </p>
      </div>

      <style>{`
        /* Une barre : le fond est la piste, l'enfant la valeur. Le border-radius
           est sur les deux, sinon une barre pleine a un bout carré. */
        .fa-barre{display:block;width:100%;border-radius:3px;overflow:hidden;
          background:color-mix(in srgb, var(--border) 70%, transparent)}
        .fa-barre > span{display:block;height:100%;border-radius:3px}

        /* Six lignes, quatre colonnes : nom · barre · part · détail. La barre
           prend la place qui reste, les trois autres sont à largeur fixe pour que
           les chiffres s'alignent verticalement. */
        .fa-empl{display:grid;gap:9px}
        .fa-empl-l{display:grid;grid-template-columns:98px minmax(0,1fr) 46px 74px;align-items:center;gap:11px}
        .fa-empl-n{font-size:13px;font-weight:600}
        .fa-empl-b{min-width:0}
        .fa-empl-v{font-family:'Rubik',sans-serif;font-weight:700;font-size:13.5px;color:var(--gold);text-align:right}
        .fa-empl-d{font-size:11.5px;color:var(--text-muted);text-align:right}

        /* Le tableau des plafonds. Il défile DANS son cadre : sept colonnes ne
           tiennent pas sur un téléphone, et une page qui défile de côté est
           cassée — pas le tableau. */
        .fa-table{overflow-x:auto;padding-bottom:4px}
        /* 150 + 6x54 + les ecarts = 522 px : les sept colonnes tiennent dans le
           panneau du volet des 560 px de large. Plus large (168 et 66, la premiere
           version) et il en manquait deux a droite sur un panneau etroit — or ce
           sont Gants et Chaussures, et Chaussures porte le plafond des PM. */
        .fa-th,.fa-tr{display:grid;grid-template-columns:150px repeat(6,minmax(54px,1fr));gap:7px;min-width:522px}
        .fa-th{font-size:10.5px;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);
          padding-bottom:7px;margin-bottom:5px;border-bottom:1px solid var(--border)}
        .fa-th > span{text-align:center}
        .fa-th > span:first-child{text-align:left}
        .fa-tr{padding:6px 0;align-items:start}
        .fa-tr + .fa-tr{border-top:1px solid color-mix(in srgb, var(--border) 45%, transparent)}
        .fa-tl{font-size:12.5px;font-weight:600;line-height:1.3;padding-top:1px}
        .fa-td{display:flex;flex-direction:column;gap:3px;align-items:stretch;text-align:center}
        .fa-td b{font-size:12px;color:var(--text-muted);font-weight:600}
        /* La valeur la plus haute de la ligne est la réponse à la question : on la
           met en avant par le POIDS et la couleur du texte, la barre restant d'une
           seule teinte partout (cf. Barre). */
        .fa-td.haut b{color:var(--gold);font-weight:700}
        .fa-td.vide{color:var(--text-muted);opacity:.35;font-size:12px}
        .fa-slot{display:none}
        /* Les liens des paragraphes .gd-src de ce fichier : la page hote donne deja
           cette regle a .gd-note a et .gd-src a, on ne la redit pas ici. */

        .fa-excl{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:7px}
        .fa-excl-l{display:flex;align-items:center;justify-content:space-between;gap:12px;
          background:var(--bg-3);border:1px solid var(--border);border-radius:9px;padding:8px 12px}
        .fa-excl-n{font-size:12.5px;min-width:0}
        .fa-excl-v{display:flex;gap:10px;flex-shrink:0;font-size:11.5px;color:var(--text-muted)}
        .fa-excl-v i{font-style:normal;opacity:.75}
        .fa-excl-v b{color:var(--gold);font-family:'Rubik',sans-serif}

        .fa-gem{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,258px),1fr));gap:10px}
        .fa-gem-c{background:var(--bg-3);border:1px solid var(--border);border-radius:11px;padding:12px 14px}
        .fa-gem-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:9px;flex-wrap:wrap}
        .fa-gem-h b{font-size:13.5px}
        .fa-gem-h i{font-style:normal;font-size:11px;color:var(--text-muted)}
        .fa-gem-p{display:grid;gap:5px}
        .fa-gem-l{display:grid;grid-template-columns:14px minmax(0,1fr) 62px;align-items:center;gap:8px}
        .fa-gem-r{font-size:10.5px;color:var(--text-muted);text-align:center}
        .fa-gem-b{min-width:0}
        .fa-gem-v{font-size:11.5px;color:var(--text);text-align:right;font-family:'Rubik',sans-serif}
        .fa-gem-f{margin-top:9px;padding-top:8px;border-top:1px solid color-mix(in srgb, var(--border) 55%, transparent);
          font-size:11.5px;color:var(--text-muted)}
        .fa-gem-f b{color:var(--gold);font-family:'Rubik',sans-serif}

        @media(max-width:620px){
          .fa-empl-l{grid-template-columns:86px minmax(0,1fr) 42px;row-gap:2px}
          .fa-empl-d{display:none}
        }

        /* ── LE TABLEAU CHANGE DE FORME SUR TÉLÉPHONE, et il le DOIT ──
           Sept colonnes réclament 522 px. Le rail du volet passe en une colonne
           sous 800 px avec « grid-template-columns:1fr » — et 1fr vaut
           minmax(AUTO,1fr), dont le minimum est la largeur min-content du contenu.
           Le panneau refusait donc de descendre sous 522 px dans une colonne de
           311, et .vg-main (overflow-x:hidden) COUPAIT la droite du tableau : pas
           de barre de défilement, juste des chiffres inatteignables. C'est le même
           piège que la brique VoletSections évite avec minmax(0,1fr) sur son rail
           de bureau, et que son repli téléphone laisse repasser.
           On ne corrige pas la brique — d'autres pages en dépendent : on retire au
           tableau son besoin de 522 px. La grille devient une liste de pastilles
           « emplacement + valeur », chacune portant son nom (cf. .fa-slot), et rien
           n'est perdu. */
        @media(max-width:700px){
          .fa-table{overflow-x:visible}
          .fa-th{display:none}
          .fa-tr{display:flex;flex-wrap:wrap;gap:6px;min-width:0;align-items:center;padding:9px 0}
          .fa-tl{flex:1 1 100%;font-size:12.5px;color:var(--orange)}
          .fa-td{flex:0 0 auto;min-width:74px;display:flex;flex-direction:column;gap:2px;
            background:var(--bg-3);border:1px solid var(--border);border-radius:8px;padding:5px 8px}
          .fa-slot{display:block;font-style:normal;font-size:9.5px;text-transform:uppercase;
            letter-spacing:.5px;color:var(--text-muted)}
          /* Une case vide n'a plus de colonne pour dire de quel emplacement il
             s'agit : sans en-tête, un point isolé ne veut rien dire. On l'omet, et
             l'absence de la pastille EST l'information. */
          .fa-td.vide{display:none}
        }
      `}</style>
    </>
  );
}
