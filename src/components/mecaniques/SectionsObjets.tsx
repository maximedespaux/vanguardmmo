import Link from "next/link";
import { Bulle, Invisible } from "@/components/Bulle";
import { Emplacements, type Rarete as RareteCadre } from "@/components/jeu/Rarete";
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
import { Bareme, Barres, Bonus, Case, Chip, Deux, Escalier, Groupe, LigneObjet, Point, Vignette } from "./Blocs";
import {
  ECHELLE, PARCHEMINS_ABSOLUS, RAMASSEUR, RUNE_TANK,
  cartesDElement, cartesDePercage, comptoirDeLuca, eveilFixe, famillesDeJoyau, iconeDe, iconePercage,
  nombreDeGemmesMenteuses, nombreDeGemmesNommees, objet, objets, ordresDeSertissage,
  panneau, parcheminsClasses, plafondDeStat, plafondsDeSertissage, rareteChiffree, runes, tableauDesGemmes,
} from "./releves";

/**
 * LES MÉCANIQUES D'UNE PIÈCE — neuf facettes, une par question qu'on se pose en
 * regardant son arme.
 *
 * Ce fichier lit le relevé du client (`./releves`), donc il touche au disque : il
 * ne doit JAMAIS être importé par un composant client. La page qui l'emploie est
 * un composant serveur, et c'est ce qui permet d'afficher des comptes exacts sans
 * envoyer 3 Mo de JSON au navigateur.
 *
 * ┌───────────── LES DEUX RÈGLES QUI ONT REFAIT CE FICHIER ─────────────┐
 * │ 1. UN RENSEIGNEMENT INCOMPLET NE S'AFFICHE PLUS. La version          │
 * │    précédente listait honnêtement ce qu'elle ne savait pas — « le     │
 * │    taux de base n'est écrit nulle part », « ces valeurs sont des      │
 * │    plafonds, pas la marche ». Ces phrases sont parties avec les       │
 * │    demi-faits qu'elles accompagnaient. SEULE EXCEPTION : une mise en  │
 * │    garde qui protège d'une erreur coûteuse reste, parce qu'elle est   │
 * │    utile même incomplète — « on ne retire que la dernière gemme       │
 * │    posée » en est le type.                                           │
 * │ 2. LES TAUX DE BUTIN, L'EXPÉRIENCE ET LES PENYAS DE RÉCOMPENSE NE     │
 * │    S'AFFICHENT PLUS DU TOUT. Un PRIX d'opération, lui, reste : le     │
 * │    million qu'on paie pour retirer une carte de perçage change ce     │
 * │    qu'on fait, une récompense de monstre non.                         │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Là où le client ne fournit rien — la rareté Commune, la Mythique, l'image d'un
 * palier de carte —, on l'écrit au lieu d'emprunter l'image du palier voisin.
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

/** Les ressources d'artefact, telles que le client les nomme. */
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

/**
 * UNE RANGÉE DE LOSANGES, LÉGENDÉE — le schéma qui remplace un nombre.
 *
 * « Une arme accepte 5 emplacements, 8 en artefact » : les deux nombres se
 * lisent comme équivalents dans une phrase. Dessinés, ils se comptent. Ce sont
 * les losanges du jeu (`public/jeu/rarete/emplacement_*`), donc exactement ce
 * qu'on a sous les yeux dans la fenêtre de sertissage.
 *
 * ATTENTION : le client ne livre que trois losanges colorés — rare, epic,
 * legendary — plus le vide. Il n'y a PAS de `emplacement_common`, et le demander
 * afficherait une image cassée.
 */
export function Slots({ quoi, base, extra = 0, legende }: {
  quoi: string;
  /** Les logements du premier genre (les diamants) : losange doré. */
  base: number;
  /** Les logements du second genre (les holographiques) : losange rose. */
  extra?: number;
  legende?: React.ReactNode;
}) {
  const gemmes: RareteCadre[] = [
    ...Array.from({ length: base }, () => "legendary" as RareteCadre),
    ...Array.from({ length: extra }, () => "epic" as RareteCadre),
  ];
  return (
    <div className="mc-slot">
      <span>{quoi}</span>
      <Emplacements gemmes={gemmes} total={base + extra} hauteur={20} />
      {legende && <i>{legende}</i>}
    </div>
  );
}

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
      <Point
        titre={
          <Invisible enJeu={`L'infobulle affiche l'ancien nom. Le serveur applique l'ordre de sa table de valeurs, qui n'est plus celui des textes d'objets : ${menteuses} noms sur ${table.length} désignent l'effet d'une autre gemme.`}>
            {menteuses} des {table.length} gemmes ultimes ne donnent pas ce qu&apos;elles annoncent
          </Invisible>
        }
        marque="piege"
      >
        <p>
          Sertir une arme ultime demande une arme <b>+6 au minimum</b>. Le joyau brut tire une
          statistique <b>au hasard parmi {STATS_DIAMANT.length}</b> ; les {table.length} gemmes
          {" "}<b>nommées</b> la forcent — c&apos;est la seule façon de choisir
          {sertisseur ? <>, et ça se passe chez <b>{sertisseur}</b></> : null}.
        </p>
        <Deux
          gauche="Ce que dit l'infobulle"
          droite="Ce que la gemme donne, et jusqu'où"
          lignes={table.map((g) => {
            const max = plafondDeStat(g.reel);
            return [
              g.nom,
              max != null ? <>{g.reel} <span style={{ opacity: .75 }}>· max +{max}</span></> : g.reel,
              g.juste,
            ] as [React.ReactNode, React.ReactNode, boolean?];
          })}
        />
        {/* LA CAUSE, EN UNE PHRASE. Elle n'est plus « a confirmer » : elle est
            etablie sur deux fichiers du depot, et le compte se recalcule. */}
        <p className="mc-src">
          La cause est connue : la table de valeurs du builder porte les {ordres.fichier.length}
          {" "}statistiques <b>deux fois, dans deux ordres différents</b> —{" "}
          <b>DIASTATS</b> pour la liste déroulante, <b>GEMU</b> pour les valeurs. Le jeu suit
          {" "}<b>GEMU</b>, les noms de gemmes ont gardé l&apos;autre ordre.
          {ordres.concordent && <> Les {ordres.rangs.length} rangs de GEMU répondent un à un aux
            {" "}{neufs.length} Diamants qu&apos;AirFlyff a ajoutés : deux fichiers indépendants, le
            même ordre.</>}
        </p>
      </Point>

      <Point titre="Ce qu'on prend, concrètement" marque="profit">
        <p>
          Tu veux des <b>PV</b> ? La gemme « de maîtrise ». De la <b>Force</b> ? Celle « de
          puissance ». De l&apos;<b>Endurance</b> ? Celle « de force ». Mieux : prends
          l&apos;un des {neufs.length} Diamants ci-dessous, dont le libellé ne peut pas tromper.
        </p>
        <div className="mc-grille">
          {neufs.map((o) => <Case key={o.cle} src={iconeDe(o)} nom={o.n.replace(/^.*sertissage en\s*/i, "")} />)}
        </div>
        <p className="mc-src">
          Le sertissage annonce <b>90 % de réussite</b> ; en cas d&apos;échec seul le joyau est
          perdu, l&apos;arme ne risque rien. C&apos;est la seule opération de la forge dans ce cas.
        </p>
      </Point>

      <Groupe titre={`Les ${familles.length} familles de joyau, et le morceau qui la fabrique`}>
        <div className="mc-vignettes">
          {familles.map((f) => (
            <Vignette key={f.nom} src={f.img} legende={`${f.nom} ${f.plage}`} />
          ))}
        </div>
        {/* LES QUATRE MORCEAUX, images du client jamais branchees jusqu'ici. Le
            morceau est un dessin DIFFERENT du joyau (un eclat effile contre une
            pierre taillee) : verifie image par image avant de le poser ici. */}
        <div className="mc-grille">
          {familles.map((f) => (
            f.imgMorceau ? <Case key={f.nom} src={f.imgMorceau} nom={`Morceau de ${f.nom}`} taille={26} /> : null
          ))}
        </div>
        <p className="mc-src">
          Le joyau à employer dépend du niveau de l&apos;arme :{" "}
          {familles.map((f) => `${f.nom} ${f.plage}`).join(", ")}. Chaque famille porte
          {" "}<b>{nombreDeGemmesNommees()} gemmes nommées</b> en tout, décalées du même rang.
        </p>
      </Groupe>
    </>
  );
}

/* ═══ 2. Rareté ══════════════════════════════════════════════════════════════ */

/** Les trois statistiques qu'un tank cherche. Elles servent à INTERROGER le
 *  vivier de rareté, pas à décrire son contenu : la phrase à l'écran se construit
 *  sur le résultat de la recherche, si bien qu'elle se corrige toute seule le jour
 *  où AirFlyff en ajoute une au tirage. */
const STATS_DEFENSIVES = ["PV max", "Endurance", "Défense"];

export function Rarete() {
  const r = rareteChiffree();
  const dansLeVivier = (nom: string) =>
    r.vivier.some((v) => v.stat.localeCompare(nom, "fr", { sensitivity: "base" }) === 0);
  const absentes = STATS_DEFENSIVES.filter((s) => !dansLeVivier(s));
  const presentes = STATS_DEFENSIVES.filter(dansLeVivier);
  // Les chances ne s'affichent QUE si la table est cohérente. Un total qui ne
  // fait pas 100 est une table incomplète ou mal lue : on ne la publie pas, et
  // on n'écrit pas de réserve à la place — la section se contente du reste.
  const tirageSain = r.somme === 100 && r.lignes.length > 0;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="mc-grille">
        {RARETES.map((r2) => <Case key={r2} src={ICONE_RARETE[r2]} nom={r2} couleur={COULEUR_RARETE[r2]} />)}
      </div>
      <p className="mc-note">
        C&apos;est la rareté qui donne les lignes bonus, et sa couleur est celle de
        l&apos;AirBuilder. <b>Commun</b> est l&apos;état de base et le client ne livre pas de
        parchemin <b>Mythique</b> : ces deux-là n&apos;ont pas de dessin.
      </p>

      {tirageSain && (
        <Point titre="Le palier ne dit pas combien de lignes l'arme reçoit" marque="piege">
          <p>
            C&apos;est un tirage, et il est très déséquilibré : <b>une seule ligne</b> est le cas
            courant, et les <b>{r.lignes[r.lignes.length - 1]?.amount} lignes</b> sont
            l&apos;exception qui fait le prix d&apos;une arme.
          </p>
          <Barres
            max={100}
            lignes={r.lignes.map((l) => ({
              nom: `${l.amount} ligne${l.amount > 1 ? "s" : ""} bonus`,
              v: l.chance,
              texte: `${l.chance} %`,
            }))}
          />
          {r.vivier.length > 0 && (
            <>
              <p className="mc-src">
                Les lignes se tirent dans un vivier de <b>{r.vivier.length} statistiques</b>, chacune
                entre <b>+{Math.min(...r.vivier.map((v) => v.min))}</b> et
                {" "}<b>+{Math.max(...r.vivier.map((v) => v.max))}</b> :
              </p>
              <div className="mc-grille">
                {r.vivier.map((v) => <Chip key={v.stat} texte={`${v.stat} +${v.min} → +${v.max}`} />)}
              </div>
              <p className="mc-src">
                {absentes.length === STATS_DEFENSIVES.length
                  ? <>
                      Ce vivier est <b>orienté dégâts</b> : {absentes.map((s, i) => (
                        <span key={s}>{i === 0 ? "ni " : ", ni "}{s}</span>
                      ))} n&apos;y figurent. Un tank ne gagne donc <b>rien de garanti</b> à monter
                      la rareté de son arme — à savoir avant de dépenser les parchemins.
                    </>
                  : <>
                      Ce vivier porte {presentes.length === 1 ? "une statistique défensive" : `${presentes.length} statistiques défensives`}
                      {" "}(<b>{presentes.join(", ")}</b>) : un tank y trouve son compte.
                    </>}
              </p>
            </>
          )}
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
      <p className="mc-note">
        Jusqu&apos;à +{ARME_SIMPLE.upMax}, tu améliores. À partir de +{ARME_SIMPLE.upMax + 1} la
        pièce devient un <b>artefact</b> : ce bandeau, trois étoiles d&apos;ascension,
        +{ARME_ARTEFACT.upMax} au bout et {ARME_ARTEFACT.sertissage?.holo} diamants
        holographiques de plus.
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
          <span className="mc-src" style={{ marginLeft: 6 }}>2 étoiles sur 3</span>
        </span>
        <Case src={ICONE_UPGRADE} nom="Amélioration" taille={26} />
      </div>

      <Groupe titre={`Le plan d'ascension dépend de ton arme — ${FAMILLES.length} familles`}>
        <div style={{ display: "grid", gap: 6 }}>
          {FAMILLES.map((f) => (
            <div key={f.arme} className="fx-card mc-slot">
              <span>{f.label}</span>
              {[1, 2, 3].map((n) => {
                const src = planAscension(f.arme, n);
                if (!src) return null;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={n} src={src} alt="" title={`${f.label} — ascension ${n}`} style={{ width: 28, height: 28, objectFit: "contain", imageRendering: "pixelated" }} />
                );
              })}
              {/* Jamais de `src=""` en repli : le navigateur recharge alors la
                  page courante comme si c'était une image, et l'icône cassée est
                  plus bruyante que l'absence. */}
              {essenceArme(f.arme) && (
                <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={essenceArme(f.arme)!} alt="" title={`Essence — ${f.label}`} style={{ width: 26, height: 26, objectFit: "contain", imageRendering: "pixelated" }} />
                  <i>essence</i>
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mc-src">
          Le glaive et la doloire partagent le leur. Une arme absente de cette liste n&apos;a pas
          de plan dans le client — on ne lui prête pas celui d&apos;une voisine.
        </p>
      </Groupe>

      <Groupe titre="Ce qu'on ramasse pour ça">
        <div className="mc-grille">
          {RESSOURCES.map((r) => <Case key={r.f} src={`/jeu/mecaniques/${r.f}.webp`} nom={r.nom} />)}
        </div>
        {source.length > 0 && (
          <div style={{ display: "grid", gap: 5 }}>
            {source.map((o) => <LigneObjet key={o.cle} o={o} />)}
          </div>
        )}
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
  const paliersAbsolus = absolus
    .map((o) => Number(/\+(\d+)/.exec(o.n)?.[1] ?? 0))
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const plageAbsolue = paliersAbsolus.length
    ? `+${paliersAbsolus[0]} à +${paliersAbsolus[paliersAbsolus.length - 1]}`
    : "";
  const familles = famillesDeJoyau();
  const quiPlafonnent = familles.slice(0, -1).map((f) => f.nom).join(", ");
  const quiDepasse = familles[familles.length - 1]?.nom ?? "Diamant";
  /** Les marches de l'escalier des parchemins qui REMPLACENT le taux : la tranche
   *  de paliers est relue sur le libellé déjà calculé, jamais écrite ici. */
  const marches = taux.remplacent
    .map((x) => {
      const n = (x.plage.match(/\d+/g) ?? []).map(Number);
      return n.length ? { de: n[0], a: n[n.length - 1], v: x.pct, nom: x.fiche.n } : null;
    })
    .filter((m): m is { de: number; a: number; v: number; nom: string } => !!m)
    .sort((a, b) => a.de - b.de);

  return (
    <>
      <Point
        titre={
          <Invisible enJeu={`La fenêtre de sertissage n'annonce que ${dia} logements. Les ${nHolo} holographiques n'apparaissent qu'une fois la pièce passée en artefact, et aucune interface ne récapitule le total.`}>
            Une arme Artefact +{ARME_ARTEFACT.upMax} accepte {dia + nHolo} gemmes, pas {dia}
          </Invisible>
        }
        marque="profit"
      >
        <div className="mc-slots">
          <Slots quoi={`Arme +${ARME_SIMPLE.upMax}`} base={dia} legende={`${dia} diamants`} />
          <Slots quoi={`Arme Artefact +${ARME_ARTEFACT.upMax}`} base={dia} extra={nHolo}
            legende={<>{dia} diamants <b>+ {nHolo} holographiques</b></>} />
        </div>
        <p>
          {quiPlafonnent} plafonnent bien à <b>{dia}</b>. Le <b>{quiDepasse}</b>, non : chacun de
          ses <b>{nHolo} paliers de plus</b> rapporte autant que le {dia}<sup>e</sup>. Toute
          comparaison de build faite sur {dia} gemmes <b>sous-estime le haut du jeu</b>.
        </p>
        {holo && <LigneObjet o={holo} />}
      </Point>

      <Point titre={`L'échelle d'amélioration monte jusqu'à +${BIJOU.upMax}`}>
        <div>
          {ECHELLE.map((e) => {
            const l = objets(e.cles);
            if (!l.length) return null;
            return (
              <div key={e.de} className="mc-etage">
                <span className="mc-etage-t"><b>{e.de}</b><span>{e.titre}</span></span>
                <span className="mc-etage-l">
                  {/* Une grille d'icones, pas une liste de phrases : a cet etage
                      la question est « avec QUOI », et le nom de l'objet y
                      repond. Les infobulles disaient toutes la meme chose en
                      douze lignes. */}
                  <span className="mc-grille">
                    {l.map((o) => <Case key={o.cle} src={iconeDe(o)} nom={o.n} taille={26} />)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="mc-src">
          Un anneau, une boucle ou un collier monte à <b>+{BIJOU.upMax}</b> sans passer par
          l&apos;artefact ; une tenue, un casque, des gants s&apos;arrêtent à
          {" "}<b>+{TENUE.upMax}</b>. Un « +20 » ne veut donc rien dire tant qu&apos;on ne sait pas
          de quelle pièce on parle.
        </p>
      </Point>

      {luca.objets.length > 0 && (
        <Point titre={`Un seul PNJ tient ${luca.objets.length} de ces objets`} marque="profit">
          <p>
            Le PNJ <b>Donjon Luca</b> — passage obligé de tout le haut niveau, qu&apos;aucune
            interface du jeu ne récapitule.
          </p>
          <div className="mc-grille">
            {luca.objets.map((o) => <Chip key={o.cle} texte={o.n} />)}
          </div>
          {luca.monnaies.length > 0 && (
            <>
              <p className="mc-src">Il prend {luca.monnaies.length} monnaies, et rien d&apos;autre :</p>
              <div className="mc-grille">
                {luca.monnaies.map((o) => <Case key={o.cle} src={iconeDe(o)} nom={o.n} taille={26} />)}
              </div>
            </>
          )}
        </Point>
      )}

      <Point titre={`${taux.remplacent.length} parchemins REMPLACENT le taux, ils ne s'y ajoutent pas`} marque="piege">
        <p>
          Glisser deux « Parchemin d&apos;amélioration » ne fait pas 200 % :{" "}
          <b>{taux.ajoutent.length} parchemins s&apos;ajoutent au taux ou le garantissent</b>,
          {" "}<b>{taux.remplacent.length} le remplacent</b>, chacun sur sa propre tranche. C&apos;est
          la tranche qui compte — et le taux s&apos;effondre quand elle monte.
        </p>
        {marches.length > 0 && (
          <>
            <Escalier
              marches={marches}
              titre={`Taux garanti par tranche de paliers : ${marches.map((m) => `${m.de === m.a ? `+${m.de}` : `+${m.de} à +${m.a}`} ${m.v} %`).join(", ")}`}
            />
            <p className="mc-src">
              {marches.map((m, i) => (
                <span key={m.nom}>
                  {i > 0 ? " · " : ""}<b>{m.nom}</b> {m.de === m.a ? `+${m.de}` : `+${m.de} → +${m.a}`}
                </span>
              ))}
              {taux.remplacent.some((x) => x.pasArmure) && (
                <> — et l&apos;un d&apos;eux ne marche <b>que sur les armes</b> : son infobulle
                  exclut armures et boucliers.</>
              )}
            </p>
          </>
        )}
        {taux.ajoutent.length > 0 && (
          <>
            <p className="mc-src">Ceux qui s&apos;<b>ajoutent</b>, ou garantissent le coup :</p>
            <Bareme
              lignes={taux.ajoutent.map((x) => [
                x.fiche.n,
                `${x.genre === "garantit" ? "réussite" : "taux"} ${x.pct} %`,
              ] as [string, string])}
            />
          </>
        )}
        {taux.unTir > 0 && (
          <p className="mc-src">
            La limite qu&apos;aucune interface ne rappelle, écrite dans l&apos;infobulle de
            {" "}<b>{taux.unTir}</b> d&apos;entre eux : le parchemin n&apos;est actif que pour
            {" "}<b>une seule tentative</b>, il ne reste pas posé sur la pièce.
          </p>
        )}
        {absolus.length > 0 && (
          <>
            <p>
              À côté, {absolus.length} <b>Parchemins d&apos;Enchantement Absolu</b>, un par palier
              de {plageAbsolue} : ils amènent la pièce au palier <b>à coup sûr</b>, sans objet de
              protection. On garde le sien pour le palier qui casse.
            </p>
            <div className="mc-grille">
              {absolus.map((o) => (
                <Case key={o.cle} src={iconeDe(o)} nom={o.n.replace(/^Parchemin d.Enchantement Absolu\s*/i, "")} />
              ))}
            </div>
            <p className="mc-src">
              Leur infobulle pose une limite : ils <b>ne fonctionnent pas sur une arme Ultime</b>.
            </p>
          </>
        )}
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

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="mc-slots">
        <Slots quoi={`Arme percée +${ARME_SIMPLE.upMax}`} base={ARME_SIMPLE.percage?.max ?? 0} />
        <Slots quoi="Arme Artefact" base={ARME_ARTEFACT.percage?.max ?? 0}
          legende={<b>le maximum du jeu</b>} />
        <Slots quoi="Tenue" base={TENUE.percage?.max ?? 0} />
      </div>
      <p className="mc-note">
        Le nombre d&apos;emplacements et le <b>palier</b> de la carte sont deux choses
        différentes — et c&apos;est le palier que le vendeur oublie d&apos;écrire. Le même élément
        change de nom selon ce qu&apos;il fait :{" "}
        <Bulle quoi={<>Une arme et un bouclier prennent des cartes d&apos;<b>attaque</b>, une tenue des cartes de <b>défense</b>. Le feu attaque sous « Feu » et défend sous « Volcano » — d&apos;où deux séries de dessins pour cinq éléments.</>}>
          {c.nAttaque} cartes d&apos;attaque, {c.nDefense} de défense
        </Bulle>.
      </p>

      <Groupe titre={`Attaque — arme et bouclier (${CARTES_ATTAQUE.length} éléments)`}>
        <div style={{ display: "grid", gap: 7 }}>
          {c.attaque.map((f) => (
            <div key={f.famille} className="mc-slot">
              <span style={{ color: COULEUR_CARTE[f.famille] ?? "var(--text)" }}>{f.famille}</span>
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
            <div key={f.famille} className="mc-slot">
              <span style={{ color: COULEUR_CARTE[f.famille] ?? "var(--text)" }}>{f.famille}</span>
              {f.paliers.map((p) => (
                <Palier key={p.palier} famille={f.famille} palier={p.palier} nom={`${p.palier} %`} couleur={COULEUR_CARTE[f.famille]} />
              ))}
            </div>
          ))}
        </div>
      </Groupe>

      <p className="mc-note">
        Les paliers en pointillés sont ceux dont nos assets n&apos;ont pas le dessin : on écrit le
        palier plutôt que de montrer celui d&apos;un autre. Et l&apos;<b>Air</b> n&apos;a pas de
        rang R là où les quatre autres éléments en ont un — c&apos;est le client, pas un oubli.
      </p>

      {annuler && (
        <Point titre="Se tromper de carte se paie autant de fois qu'il y a de cartes posées après" marque="piege">
          <p>
            Le panneau du jeu, seul endroit où c&apos;est écrit, pose deux règles d&apos;un coup :
            on ne retire que <b>la dernière carte sertie</b>, et l&apos;opération a un tarif fixe.
          </p>
          <p className="mc-cite">« {annuler.texte} »</p>
          <p>
            Donc on ouvre <b>en dernier</b> les emplacements dont on est le moins sûr : sur une arme
            à {ARME_ARTEFACT.percage?.max} emplacements, une erreur au 2<sup>e</sup> perçage se
            défait en retirant tout ce qui suit.
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
      <div className="mc-grille">
        <Case src={ICONE_EVEIL.R1} nom="Éveil R1" />
        <Case src={ICONE_EVEIL.R2} nom="Éveil R2" />
        <Case src={ICONE_SCROLL} nom="Scroll de stat" />
      </div>
      <p className="mc-note">
        <b>R1</b> et <b>R2</b> posent une statistique en plus sur la pièce, R2 plus fort que R1,
        prise parmi {STATS_EVEIL.length}. Le <b>scroll de stat</b> monte une des
        {" "}{STATS_SCROLL.length} statistiques de base de +1 à +4. L&apos;<b>élément</b> de
        l&apos;arme (jusqu&apos;à +{ARME_ARTEFACT.elementMax}) ne se confond pas avec les cartes de
        perçage.
      </p>

      <Groupe titre="Élément de l'arme">
        <div className="mc-grille">
          {Object.entries(ICONE_ELEMENT).map(([nom, src]) => <Case key={nom} src={src} nom={nom} taille={24} />)}
        </div>
        <p className="mc-src">
          <Bulle quoi={<>Le client dit « <b>foudre</b> », le builder dit « <b>Électricité</b> ». Même élément, deux mots — celui qu&apos;on cherche en jeu est « foudre ».</>}>
            Deux mots pour le même élément
          </Bulle>
        </p>
      </Groupe>

      <Groupe titre={`Ce qui monte l'élément : ${cartes.length} cartes, et un piège`}>
        <p className="mc-note">
          Ces cartes-là s&apos;appellent aussi « Carte » et ne percent rien. Il y en a deux par
          élément, et <b>{obsoletes} sont marquées obsolètes par le client lui-même</b> parce
          qu&apos;elles plafonnent à +5 : acheter une Carte Flamma plutôt qu&apos;une Carte Brasero,
          c&apos;est payer un plafond quatre fois plus bas.
        </p>
        <div className="mc-grille">
          {cartes.map(({ fiche, obsolete }) => (
            <Case key={fiche.cle} src={iconeDe(fiche)} nom={`${fiche.n}${obsolete ? " — obsolète" : ""}`}
              couleur={obsolete ? "var(--red)" : undefined} taille={26} />
          ))}
        </div>
      </Groupe>

      {changer && (
        <Point titre="Changer d'élément ne recommence pas à zéro" marque="profit">
          <p className="mc-cite">« {changer.texte} »</p>
          <p>
            <b>La valeur suit l&apos;élément</b>, jusqu&apos;au plafond de
            {" "}<b>+{ARME_ARTEFACT.elementMax}</b>. Une arme élémentarisée au mauvais élément
            n&apos;est donc <b>pas perdue</b>, et elle se vend au prix d&apos;une arme
            élémentarisée. Le jeu ne l&apos;annonce que dans sa fenêtre de transformation.
          </p>
        </Point>
      )}

      {fixes.lignes.length > 0 && (
        <Point titre={`L'éveil ne se tire pas forcément : ${fixes.total} parchemins posent la ligne qu'on veut`} marque="profit">
          <p>
            La statistique est écrite sur le parchemin — <b>{fixes.lignes.length} statistiques</b>,
            chacune en rang 1 et rang 2. Et chaque parchemin nomme <b>les pièces sur lesquelles il
            se pose</b> : la Force ne va pas sur des bottes, les Soins ne vont pas sur un casque.
            Aucune interface du jeu ne récapitule ça.
          </p>
          <Bareme
            lignes={fixes.lignes.map((l) => [
              `${l.label || l.code}${l.pieces.length ? ` — ${l.pieces.join(", ")}` : ""}`,
              `R1 +${l.r1}${l.pourcent ? " %" : ""} · R2 +${l.r2}${l.pourcent ? " %" : ""}`,
            ] as [string, string])}
          />
          {fixes.pasDouble.length === 0 && (
            <p className="mc-src">
              Sur cette série, <b>le rang 2 vaut exactement le double du rang 1</b>. Ce n&apos;est
              pas vrai de la série pour costumes : voir <b>Costumes &amp; gemmes de costume</b>.
            </p>
          )}
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
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="mc-grille">
        <Case src={ICONE_DIAMANT} nom="Diamant" />
        <Case src={ICONE_HOLO} nom="Diamant holographique" />
      </div>
      <div className="mc-slots">
        <Slots quoi="Arme Artefact" base={dia} extra={nHolo}
          legende={<>{dia} diamants + {nHolo} holographiques</>} />
      </div>
      <p className="mc-note">
        Ce qui se sertit sur un <b>costume</b> n&apos;est pas un diamant mais un joyau propre à la
        pièce, et les règles n&apos;y sont pas les mêmes : voir <b>Costumes &amp; gemmes de
        costume</b>, juste en dessous.
      </p>

      <Groupe titre={`Les ${plafonds.length || STATS_DIAMANT.length} statistiques, et jusqu'où elles montent`}>
        <div className="mc-grille">
          {plafonds.length > 0
            ? plafonds.map((p, i) => (
              <Chip key={p.stat} texte={`${String(i + 1).padStart(2, "0")} · ${p.stat} +${p.max}`} />
            ))
            : STATS_DIAMANT.map((s, i) => <Chip key={s} texte={`${String(i + 1).padStart(2, "0")} · ${s}`} />)}
        </div>
        {/* Le rang affiche est celui de la table de VALEURS (GEMU), pas celui de
            la liste deroulante : c'est l'ordre auquel le jeu repond. Numeroter la
            liste deroulante ferait de la page un troisieme temoin faux. */}
        <p className="mc-src">
          C&apos;est cet ordre-là — celui de <b>GEMU</b> — que les noms de gemmes ne suivent pas
          (section <b>Les gemmes mentent</b>).
        </p>
      </Groupe>

      <Groupe titre={`Les ${nHolo} holographiques, et ce qu'ils donnent`}>
        <div className="mc-grille">
          {STATS_HOLO.map((s) => <Chip key={s} texte={s} />)}
        </div>
        <p className="mc-src">
          {STATS_HOLO.length} valeurs pour {nHolo} emplacements : on choisit, on ne cumule pas tout.
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
      <p className="mc-note">
        Deux choses portent ce mot. La rune d&apos;<b>arme</b> dépend du palier de l&apos;arme, et
        le <b>marteau</b> a sa propre série. La rune de <b>tenue</b> (aussi cape, familier,
        ramasseur) porte la pierre de la statistique qu&apos;elle donne. Confondre les deux fait
        acheter la mauvaise — et il y en a <b>{r.total}</b> dans le jeu, pas quatre.
      </p>

      <Groupe titre="Rune d'arme">
        <div className="mc-grille">
          {Object.entries(ICONE_RUNE_ARME).map(([nom, src]) => <Case key={nom} src={src} nom={nom} />)}
          <Case src={ICONE_RUNE_VIERGE} nom="Yggdrasil vierge" />
        </div>
      </Groupe>
      <Groupe titre="Rune de marteau">
        <div className="mc-grille">
          {Object.entries(ICONE_RUNE_MARTEAU).map(([nom, src]) => <Case key={nom} src={src} nom={nom} />)}
        </div>
      </Groupe>
      <Groupe titre="Rune de tenue, par statistique">
        <div className="mc-grille">
          {Object.entries(ICONE_RUNE_STAT).map(([nom, src]) => <Case key={nom} src={src} nom={nom} />)}
        </div>
      </Groupe>
      {/* LES HUIT RUNES DE RAMASSEUR, images du client jamais branchees. Elles
          portent la distinction que le reste du site ne montre nulle part : la
          MEME statistique existe en version JcE et en version JcJ. */}
      <Groupe titre={`Rune de ramasseur — ${RAMASSEUR.length} pierres, et la même statistique en deux versions`}>
        <div className="mc-grille">
          {RAMASSEUR.map((x) => <Case key={x.f} src={`/jeu/mecaniques/${x.f}.webp`} nom={x.nom} taille={28} />)}
        </div>
        <p className="mc-src">
          La <b>Force</b> et l&apos;<b>Intelligence</b> existent en <b>JcE</b> et en <b>JcJ</b> :
          deux pierres différentes pour la même statistique, et ce n&apos;est pas la même qu&apos;on
          grave selon qu&apos;on farme ou qu&apos;on va en arène.
        </p>
      </Groupe>

      <Groupe titre={`Les ${r.familles.length} familles, et combien chacune en compte`}>
        <Barres lignes={r.familles.map((f) => ({ nom: `${f.nom} — ${f.sous}`, v: f.membres.length }))} />
      </Groupe>

      <div style={{ display: "grid", gap: 8, paddingTop: 4 }}>
        {r.tankMenteuses.map((o) => (
          <div key={o.cle} className="mc-cote">
            <Vignette src={RUNE_TANK} legende="Rune TANK" />
            <Point titre={`« ${o.n} » n'est pas une rune tank`} marque="piege">
              <p>
                Les autres runes TANK de la gamme Luzaka donnent PV max % et Endurance. Celle-là,
                non — le fichier lui met les statistiques d&apos;une version support :
              </p>
              <Bonus b={o.b} />
              <p>
                Elle se vendra pourtant au prix des autres, parce que son nom est le même. Un
                Templier au glaive qui la grave a payé une rune de prêtre.
              </p>
            </Point>
          </div>
        ))}

        {r.manquants.map((m) => (
          <Point key={`${m.gamme}-${m.modele}`} titre={`La ${m.modele} ${m.gamme.replace(/^Arme /, "")} : ni nom ni statistiques dans le relevé`} marque="piege">
            <p>
              C&apos;est le seul trou de la gamme, les autres modèles y sont tous. Elle ne vaut
              <b> rien de prouvé</b> — et surtout pas le prix des autres.
            </p>
          </Point>
        ))}

        {r.intruses.map((o) => (
          <Point key={o.cle} titre={`« ${o.n} » donne du défensif là où toute sa gamme donne du dégât`} marque="piege">
            <Bonus b={o.b} />
            <p>Qui l&apos;achète pour taper se trompe : la doloire est l&apos;arme des tanks.</p>
          </Point>
        ))}

        {r.doublons.map((l) => (
          <Point key={l[0].cle} titre={`« ${l[0].n} » existe ${l.length} fois, sous ${l.length} clés`} marque="piege">
            <p>
              {l.map((o) => o.cle.replace("II_SYS_SYS_RUNE_", "")).join(" et ")} — dont une rangée
              du côté des runes d&apos;arme avec les bonus de la rune de tenue. Deux objets
              différents, un seul nom : de quoi se tromper à l&apos;achat comme à la vente.
            </p>
            <Bonus b={l[0].b} />
          </Point>
        ))}
      </div>
    </div>
  );
}

/* ═══ Le renvoi — un sujet, une page ═════════════════════════════════════════ */

/**
 * QUATRE SUJETS QUI VIVAIENT ICI ET N'Y APPARTIENNENT PAS.
 *
 * Cette page portait l'arène, les recettes éteintes, le barème de la GvG et la
 * taxe des Chambres Secrètes. Aucun des quatre ne parle d'une pièce
 * d'équipement, et trois d'entre eux redisaient ce qu'une autre page développe
 * déjà — les recettes éteintes se lisaient mot pour mot sur /crafts. Un sujet,
 * une page : ici on montre la porte, on ne redéveloppe pas.
 *
 * Le développement retiré est SIGNALÉ au fil principal : c'est au propriétaire
 * de la page d'accueillir ce qui lui revient, pas à ce lot de le déposer chez un
 * voisin qu'il ne possède pas.
 */
const PORTES: { href: string; titre: string; quoi: string }[] = [
  { href: "/crafts", titre: "Recettes et crafts éteints", quoi: "Ce qu'aucun PNJ ne propose, les comptoirs à jetons, l'arbre du farm." },
  { href: "/classes", titre: "L'arène et les compétences", quoi: "La seconde table d'équilibrage : un build juste en donjon est faux en JcJ." },
  { href: "/compositions", titre: "GvG et Chambres Secrètes", quoi: "Le barème aux points, et la taxe d'une région qui ne se fixe qu'une fois." },
  { href: "/objets", titre: "Le catalogue des objets", quoi: "Retrouver une pièce nommée, sa rareté et sa provenance." },
];

export function Ailleurs() {
  return (
    <div className="mc-ailleurs">
      {PORTES.map((p) => (
        <Link key={p.href} href={p.href} className="fx-card mc-porte">
          <span>
            <b>{p.titre}</b>
            <i>{p.quoi}</i>
          </span>
        </Link>
      ))}
    </div>
  );
}
