import Link from "next/link";
import { Bulle, Invisible } from "@/components/Bulle";
import { NomObjet } from "@/components/objets/NomObjet";
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
import {
  Bareme, Barres, Bonus, Case, Chips, Codes, Deux, Escalier, Grille, Groupe, Objets, Paliers,
  Point, Vignettes, ligneDe, type Vue,
} from "./Blocs";
import {
  ECHELLE, PARCHEMINS_ABSOLUS, PARCHEMINS_EVEIL, RAMASSEUR, RUNE_TANK,
  cartesDElement, cartesDePercage, comptoirDeLuca, eveilFixe, famillesDeJoyau, iconeDe, iconePercage,
  mantras, nombreDeGemmesMenteuses, objet, objets, ordresDeSertissage,
  panneau, parcheminsClasses, plafondDeStat, plafondsDeSertissage, rareteChiffree, runes, tableauDesGemmes,
} from "./releves";
import { bonusDesCartes, courbeArtefact, libelleDe, ordreDuClient, paliersDeGemme } from "./sources";

/**
 * LES MÉCANIQUES D'UNE PIÈCE — une facette par question qu'on se pose devant son
 * arme.
 *
 * Ce fichier lit les relevés du client sur le DISQUE (`./releves`, `./sources`) :
 * il ne doit JAMAIS être importé par un composant client. La page qui l'emploie
 * est un composant serveur, et c'est ce qui permet d'afficher des comptes exacts
 * sans envoyer 3 Mo de JSON au navigateur.
 *
 * ┌──────────── LA PASSE V3 : MOINS DE MOTS, PAS MOINS DE FAITS ────────────┐
 * │ Cette planche était la page la plus lourde du site — dix mille mots     │
 * │ servis, vingt fois le catalogue d'objets — et son contenu était bon. Le │
 * │ problème était sa FORME : chaque mécanique chiffrée s'écrivait en        │
 * │ paragraphes. Quatre échanges, appliqués partout ici :                   │
 * │                                                                        │
 * │  1. UN TAUX QUI S'EFFONDRE DEVIENT UN ESCALIER. La réussite d'une       │
 * │     amélioration d'artefact est divisée par dix de +11 à +20 : en       │
 * │     colonne on lit dix options, dessinée on voit la chute.             │
 * │  2. UN COMPTE DEVIENT UN SCHÉMA. Cinq logements de gemme contre huit se │
 * │     comptent d'un coup d'œil ; « 5 » et « 8 » dans une phrase se lisent │
 * │     comme équivalents.                                                 │
 * │  3. UNE ÉNUMÉRATION DEVIENT UNE GRILLE D'ICÔNES, et chaque case mène à  │
 * │     la fiche de son objet. C'est la demande de wiki : on retrouve une   │
 * │     pièce, sa rareté et sa provenance depuis la mécanique qui l'emploie.│
 * │  4. UNE PRÉCISION SECONDAIRE PASSE DANS UNE BULLE, ou disparaît.        │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────── DEUX RÈGLES QUI RETIRENT DU CONTENU ────────────┐
 * │ · UN RENSEIGNEMENT INCOMPLET NE S'AFFICHE PLUS, et sa         │
 * │   réserve part avec lui. SEULE EXCEPTION : la mise en garde   │
 * │   contre une erreur coûteuse, utile même incomplète — « on ne │
 * │   retire que la dernière gemme posée » en est le type. C'est  │
 * │   à ce titre que le volet Perçage garde la citation du        │
 * │   panneau du jeu, et que trois blocs « la gamme a un trou     │
 * │   qu'on n'explique pas » sont partis.                        │
 * │ · LES TAUX DE BUTIN, L'EXPÉRIENCE ET LES PENYAS DE            │
 * │   RÉCOMPENSE quittent l'écran (voir `estRecompense`). Un PRIX │
 * │   d'opération, lui, reste : le million qu'on paie pour        │
 * │   retirer une carte change ce qu'on fait.                    │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Là où le client ne fournit rien — la rareté Commune, la Mythique — on l'écrit
 * au lieu d'emprunter l'image du palier voisin.
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

/** Les ressources d'artefact, telles que le client les nomme. Le nom sert deux
 *  fois : sous l'image, et comme requête vers la fiche de l'objet. */
const RESSOURCES: [string, string][] = [
  ["artefact-pierre", "Pierre d'artefact"],
  ["artefact-plan", "Plan"],
  ["artefact-morceau-parchemin", "Morceau de parchemin"],
  ["artefact-coffret-plans", "Coffret de plans"],
  ["artefact-boite-pierres", "Boîte de pierres"],
  ["artefact-protection", "Protection"],
  ["artefact-orichalque-pure", "Orichalque pur"],
  ["artefact-orichalque-scintillant", "Orichalque scintillant"],
  ["artefact-roche-lunaire", "Roche lunaire"],
  ["artefact-diamant-holographique", "Diamant holographique"],
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
 * Ce sont les losanges du jeu (`public/jeu/rarete/emplacement_*`), donc exactement
 * ce qu'on a sous les yeux dans la fenêtre de sertissage. Il pose une image par
 * case : on le réserve donc aux comparaisons qui portent la page, et `Paliers`
 * sert pour les tableaux secondaires.
 *
 * ATTENTION : le client ne livre que trois losanges colorés — rare, epic,
 * legendary — plus le vide. Il n'y a PAS de `emplacement_common`.
 */
export function Slots({ lignes }: {
  lignes: { quoi: string; base: number; extra?: number; legende?: React.ReactNode }[];
}) {
  return (
    <div className="mc-slots">
      {lignes.map((l) => {
        const gemmes: RareteCadre[] = [
          ...Array.from({ length: l.base }, () => "legendary" as RareteCadre),
          ...Array.from({ length: l.extra ?? 0 }, () => "epic" as RareteCadre),
        ];
        return (
          <div key={l.quoi} className="mc-slot">
            <span>{l.quoi}</span>
            <Emplacements gemmes={gemmes} total={l.base + (l.extra ?? 0)} hauteur={20} />
            {l.legende && <i>{l.legende}</i>}
          </div>
        );
      })}
    </div>
  );
}

/* ═══ 1. Les gemmes mentent ══════════════════════════════════════════════════ */

export function Gemmes() {
  const table = tableauDesGemmes();
  const menteuses = nombreDeGemmesMenteuses();
  const ordres = ordresDeSertissage();
  const familles = famillesDeJoyau();
  const neufs = table.map((g) => g.neuf).filter((o): o is NonNullable<typeof o> => !!o);
  /** Le sertisseur, nommé par la description du client (« … par Bobochan »). C'est
   *  la seule chose de ce volet qui dise OÙ le geste se fait, et rien d'autre sur
   *  le site ne le dit : elle vaut ses trois mots. */
  const sertisseur = familles.find((f) => f.sertisseur)?.sertisseur ?? "";

  return (
    <>
      <Point
        titre={
          <Invisible enJeu={`L'infobulle affiche l'ancien nom. Le serveur applique l'ordre de sa table de valeurs, qui n'est plus celui des textes d'objets : ${menteuses} noms sur ${table.length} désignent l'effet d'une autre gemme.`}>
            {menteuses} des {table.length} gemmes ultimes donnent l&apos;effet d&apos;une autre
          </Invisible>
        }
        marque="piege"
      >
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
        {/* LA CAUSE, ETABLIE. L'ordre ci-dessous est celui d'Ultimate_GemAbility.txt,
            et les neuf Diamants d'Airborn y repondent rang pour rang. */}
        <p className="mc-src">La cause — l&apos;ordre du client, celui auquel le jeu répond :</p>
        <Codes codes={ordreDuClient()} libelle={libelleDe} />
        <p className="mc-src">
          {ordres.concordent && <>Les {neufs.length} Diamants y répondent <b>{ordres.justes} sur {ordres.rangs.length}</b>. </>}
          Les noms, eux, ont gardé l&apos;ordre de <b>DIASTATS</b>, la liste déroulante du builder :
          {" "}<b>elle ne nomme jamais l&apos;effet d&apos;une gemme.</b>
        </p>
      </Point>

      <Point titre="Ce qu'on prend, sans se tromper" marque="profit">
        <p>
          Des <b>PV</b> : « de maîtrise ». De la <b>Force</b> : « de puissance ». De
          l&apos;<b>Endurance</b> : « de force ». Ou un Diamant, dont le libellé ne trompe pas :
        </p>
        <Grille cases={neufs.map((o): Vue => ({
          cle: o.cle, src: iconeDe(o), cherche: o.n,
          nom: o.n.replace(/^.*sertissage en\s*/i, ""),
        }))} />
        {/* LE JOYAU BRUT TIRE AU HASARD, la gemme nommee force : c'est ce fait-la qui
            fait acheter la gemme nommee plutot que le joyau brut, et il avait disparu
            en meme temps que le paragraphe qui le portait. Trois lignes de moins, le
            fait garde. */}
        <p className="mc-src">
          Arme <b>+6 au minimum</b>, réussite <b>90 %</b>, et l&apos;échec ne coûte que le joyau. Le
          joyau <b>brut</b> tire sa statistique <b>au hasard</b> parmi {STATS_DIAMANT.length} ; une
          gemme nommée la force
          {sertisseur ? <>, et ça se passe chez <b>{sertisseur}</b></> : null}.
        </p>
      </Point>

      <Groupe titre={`Le joyau dépend du niveau de l'arme — ${familles.length} familles`}>
        <Vignettes items={familles.map((f) => ({ src: f.img, legende: `${f.nom} ${f.plage}` }))} />
        {/* LES QUATRE MORCEAUX, images du client jamais branchees jusqu'ici : un
            eclat effile contre une pierre taillee, dans la teinte de sa famille. */}
        <Grille taille={26} cases={familles.flatMap((f): Vue[] => (
          f.imgMorceau ? [{ cle: f.nom, src: f.imgMorceau, nom: `Morceau de ${f.nom}` }] : []
        ))} />
      </Groupe>
    </>
  );
}

/* ═══ 2. Sertissage : huit logements, pas cinq ═══════════════════════════════ */

export function Sertissage() {
  const dia = ARME_ARTEFACT.sertissage?.diamants ?? 0;
  const nHolo = ARME_ARTEFACT.sertissage?.holo ?? 0;
  const holo = objet("II_SYS_SYS_DIAMOND_ARTEFACT");
  const diamant = objet("II_GEN_MAT_DIAMOND");
  const plafonds = plafondsDeSertissage();
  const p = paliersDeGemme();

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Point
        titre={
          <Invisible enJeu={`La fenêtre de sertissage n'annonce que ${dia} logements. Les ${nHolo} holographiques n'apparaissent qu'une fois la pièce passée en artefact, et aucune interface ne récapitule le total.`}>
            Une arme Artefact +{ARME_ARTEFACT.upMax} accepte {dia + nHolo} gemmes, pas {dia}
          </Invisible>
        }
        marque="profit"
      >
        <Slots lignes={[
          { quoi: `Arme +${ARME_SIMPLE.upMax}`, base: dia, legende: `${dia} diamants` },
          {
            quoi: `Arme Artefact +${ARME_ARTEFACT.upMax}`, base: dia, extra: nHolo,
            legende: <>{dia} diamants <b>+ {nHolo} holographiques</b></>,
          },
        ]} />
        {/* LES DEUX PIERRES SONT CELLES DU CLIENT, ET C'ETAIT UNE CORRECTION.
            `ICONE_HOLO` (`/airbuilder/icons/sertissage/diamant-holo.png`) est un
            diamant VIOLET dessine pour le builder : verifie empreinte par
            empreinte, ce fichier n'existe nulle part ailleurs dans le depot et ne
            correspond a aucune icone du client. Le vrai Diamant holographique
            d'Airborn est MULTICOLORE (`itm_diamant_multicolore.webp`) — et la
            case portait un violet invente juste au-dessus de la phrase du client
            qui decrit l'objet. La pierre ordinaire, elle, est pixel pour pixel la
            meme des deux cotes : on prend quand meme celle du client, pour que la
            grille ait une seule source. Le fichier du builder reste en repli. */}
        <Grille cases={[
          { cle: "d", src: iconeDe(diamant) ?? ICONE_DIAMANT, nom: "Diamant", cherche: diamant?.n },
          { cle: "h", src: iconeDe(holo) ?? ICONE_HOLO, nom: "Holographique", cherche: holo?.n ?? "Diamant holographique" },
        ]} />
        {/* LA PREUVE, PAR DEUX FICHIERS QUI NE SE PARLENT PAS : la phrase que le
            client ecrit sur l'objet, et la FORME de sa table de valeurs. */}
        {holo?.d && <p className="mc-cite">« {holo.d} »</p>}
        {p.total > 0 && (
          <>
            <p>
              Sa table le confirme : <b>{p.total} paliers</b> par gemme, l&apos;en-tête n&apos;en
              numérote que <b>{p.nommes}</b>. Une seule famille les remplit.
            </p>
            <Paliers total={p.total} lignes={p.familles.map((f) => ({
              cle: f.cle, nom: f.nom, sous: f.plage, servis: f.remplis,
            }))} />
            {/* ┌──── CE QUE LE CLIENT PORTE N'EST PAS CE QUI CIRCULE ────┐
                   La table ci-dessus est celle du client, et elle est juste :
                   cinq familles de joyau y ont leurs paliers. Mais sur le
                   serveur, seuls le Diamant et le Diamant holographique
                   servent au sertissage — les quatre autres familles ne se
                   rencontrent pas. Aucun fichier ne le dit : le relevé donne
                   une provenance à chacune des cinq, parce qu'il décrit ce
                   qui est REPRÉSENTABLE, pas ce qui tourne aujourd'hui.
                   C'est donc une observation de jeu, et elle est signée comme
                   telle — la règle de la maison interdit de faire passer un
                   constat pour une donnée.                                */}
            <p className="mc-src">
              <b>Constaté en jeu par la guilde</b>, et non lu dans le client :
              seuls le <b>Diamant</b> et le <b>Diamant holographique</b> servent au
              sertissage. Les quatre autres familles existent dans la table sans
              circuler.
            </p>
            {p.complets.length > 0 && p.plafonnent.length > 0 && (
              <p className="mc-src">
                Les {p.total - p.nommes} paliers de plus du{" "}
                <b>{p.complets.map((f) => f.nom).join(", ")}</b> rapportent autant que le
                {" "}{p.nommes}<sup>e</sup> : comparer sur {p.nommes} gemmes
                {" "}<b>sous-estime le haut du jeu</b>.
              </p>
            )}
          </>
        )}
      </Point>

      <Groupe titre={`Les ${plafonds.length || STATS_DIAMANT.length} statistiques, et leur plafond`}>
        <Chips puces={plafonds.length > 0
          ? plafonds.map((s) => ({ texte: `${s.stat} +${s.max}` }))
          : STATS_DIAMANT.map((s) => ({ texte: s }))} />
      </Groupe>

      <Groupe titre={`Les ${nHolo} holographiques : ${STATS_HOLO.length} valeurs, on choisit`}>
        <Chips puces={STATS_HOLO.map((s) => ({ texte: s }))} />
      </Groupe>
    </div>
  );
}

/* ═══ 3. Perçage ═════════════════════════════════════════════════════════════ */

export function Percage() {
  const c = cartesDePercage();
  const annuler = panneau(/annuler un effet de piercing/i);
  const bonus = bonusDesCartes();
  const familles = [...c.attaque, ...c.defense];
  /** Combien de DESSINS distincts le client donne à une famille : c'est ce qui
   *  montre qu'il ne distingue pas ses paliers bas les uns des autres. */
  const confondus = familles.filter(
    (f) => new Set(f.paliers.map((p) => p.fiche.ic).filter(Boolean)).size < f.paliers.length,
  ).length;

  /* UNE FAMILLE PAR RANGEE : ses paliers en images, et ce qu'elle donne.
     L'ancienne planche ecrivait le palier en pointilles quand nos assets
     n'avaient pas le dessin, et l'expliquait en trois lignes. C'etait inutile :
     les cartes du client ont TOUTES leur icone sur le disque. On prefere celle de
     l'AirBuilder, qui porte le palier imprime dessus et distingue donc un 7 %
     d'un 12 %, puis celle du client quand elle manque. */
  const rangee = (f: (typeof c.attaque)[number], suffixe = "") => (
    <div key={f.famille} className="mc-carte-l">
      <span className="mc-carte-n" style={{ color: COULEUR_CARTE[f.famille] ?? "var(--text)" }}>{f.famille}</span>
      <span className="mc-carte-c">
        <Grille cases={f.paliers.map((p): Vue => ({
          cle: p.fiche.cle,
          src: iconePercage(f.famille, p.palier) ?? iconeDe(p.fiche),
          nom: `${p.palier}${suffixe}`,
          couleur: COULEUR_CARTE[f.famille],
          cherche: p.fiche.n,
        }))} />
        <Codes codes={bonus.get(f.famille) ?? []} libelle={libelleDe} />
      </span>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Slots lignes={[
        { quoi: `Arme +${ARME_SIMPLE.upMax}`, base: ARME_SIMPLE.percage?.max ?? 0 },
        { quoi: "Arme Artefact", base: ARME_ARTEFACT.percage?.max ?? 0, legende: <b>le maximum du jeu</b> },
        { quoi: "Tenue", base: TENUE.percage?.max ?? 0 },
      ]} />
      <p className="mc-note">
        Emplacements et <b>palier</b> sont deux choses : c&apos;est le palier que le vendeur oublie
        d&apos;écrire.{" "}
        <Bulle quoi={<>Une arme et un bouclier prennent des cartes d&apos;<b>attaque</b>, une tenue des cartes de <b>défense</b>. Le feu attaque sous « Feu » et défend sous « Volcano » — d&apos;où deux séries de dessins pour cinq éléments.</>}>
          {c.nAttaque} cartes d&apos;attaque, {c.nDefense} de défense
        </Bulle>.
      </p>

      {/* ┌──── LA PLANCHE MONTRE TOUS LES RANGS, TROIS SEULEMENT CIRCULENT ────┐
             Les rangées ci-dessous sont celles du client : D, C, B, A, S, R pour
             l'attaque. Sur le serveur, seuls B, A et S se rencontrent — les
             autres rangs existent dans le catalogue sans être distribués.
             LE RELEVÉ NE PEUT PAS LE DIRE : il donne une provenance à D et à C
             comme aux trois autres, parce qu'il décrit les tables du client et
             non ce qui tourne. R et SR, eux, n'ont AUCUNE source dans le relevé
             (et SR est du Baruna, hors sujet ici) — c'est le seul indice que les
             fichiers portent, et il ne suffit pas à trancher pour D et C.
             D'où une observation de jeu, signée comme telle plutôt que glissée
             parmi les faits.                                                   */}
      <p className="mc-src">
        <b>Constaté en jeu par la guilde</b>, et non lu dans le client : seules les
        cartes <b>B</b>, <b>A</b> et <b>S</b> circulent pour l&apos;instant. Les autres
        rangs figurent dans le catalogue sans se rencontrer.
      </p>

      <Groupe titre={`Attaque — arme et bouclier (${CARTES_ATTAQUE.length} éléments)`}>
        {c.attaque.map((f) => rangee(f))}
      </Groupe>
      <Groupe titre={`Défense — tenue (${CARTES_DEFENSE.length} éléments)`}>
        {c.defense.map((f) => rangee(f, " %"))}
      </Groupe>

      <p className="mc-note">
        {confondus > 0 && (
          <>
            <Invisible enJeu="Deux cartes de paliers différents portent la même icône dans l'inventaire : seul le nom, entre parenthèses, dit laquelle on tient.">
              {confondus} familles sur {familles.length} dessinent leurs paliers bas à l&apos;identique
            </Invisible>.{" "}
          </>
        )}
        L&apos;<b>Air</b> est le seul élément sans rang R.
      </p>

      {annuler && (
        <Point titre="Se tromper de carte se paie autant de fois qu'il y a de cartes posées après" marque="piege">
          <p className="mc-cite">« {annuler.texte} »</p>
          <p>
            On ouvre donc <b>en dernier</b> les emplacements dont on est le moins sûr : sur une arme
            à {ARME_ARTEFACT.percage?.max} emplacements, une erreur au 2<sup>e</sup> perçage se
            défait en retirant tout ce qui suit.
          </p>
        </Point>
      )}
    </div>
  );
}

/* ═══ 4. Amélioration : les taux, et les plafonds ════════════════════════════ */

export function Amelioration() {
  const luca = comptoirDeLuca();
  const taux = parcheminsClasses();
  const absolus = objets(PARCHEMINS_ABSOLUS);
  const courbe = courbeArtefact();
  const bas = courbe.length ? courbe[courbe.length - 1] : null;
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
      {courbe.length > 0 && bas && (
        <Point
          titre={
            <Invisible enJeu="La fenêtre d'amélioration n'affiche aucun pourcentage. Le taux est dans propweaponleveling.inc, et rien à l'écran ne dit qu'il se divise par dix.">
              Le taux d&apos;un artefact tombe de {courbe[0].pct} % à {bas.pct} %
            </Invisible>
          }
          marque="piege"
        >
          <Escalier
            titre={`Taux de réussite par palier, en pourcentage : ${courbe.map((x) => `+${x.niveau} ${x.pct}`).join(", ")}`}
            marches={courbe.map((x) => ({ de: x.niveau, a: x.niveau, v: x.pct, nom: `+${x.niveau}` }))}
          />
          {/* « De +11 a +20 » disait pour la troisieme fois la meme tranche : le
              titre du point la porte deja, et l'escalier l'ecrit sous chaque
              marche. Reste ce que le dessin ne dit pas — ce qu'on en FAIT. */}
          <p className="mc-src">C&apos;est cette pente qui décide où poser sa protection.</p>
        </Point>
      )}

      <Point titre={`${taux.remplacent.length} parchemins REMPLACENT ce taux, ils ne s'y ajoutent pas`} marque="piege">
        <p>
          Glisser deux parchemins ne fait pas 200 % : <b>{taux.ajoutent.length}</b> s&apos;ajoutent
          ou garantissent, <b>{taux.remplacent.length}</b> remplacent — chacun sur sa tranche.
        </p>
        {marches.length > 0 && (
          <>
            <Escalier
              marches={marches}
              titre={`Taux garanti par tranche, en pourcentage : ${marches.map((m) => `${m.de === m.a ? `+${m.de}` : `+${m.de} à +${m.a}`} ${m.v}`).join(", ")}`}
            />
            <p className="mc-src">
              {marches.map((m, i) => (
                <span key={m.nom}>
                  {i > 0 ? " · " : ""}<b>{m.nom}</b> {m.de === m.a ? `+${m.de}` : `+${m.de} → +${m.a}`}
                </span>
              ))}
              {taux.remplacent.some((x) => x.pasArmure) && <> — l&apos;un ne vaut <b>que sur les armes</b>.</>}
            </p>
          </>
        )}
        {taux.ajoutent.length > 0 && (
          <Bareme lignes={taux.ajoutent.map((x) => [
            x.fiche.n,
            `${x.genre === "garantit" ? "réussite" : "taux"} ${x.pct} %`,
          ] as [string, string])} />
        )}
        {taux.unTir > 0 && (
          <p className="mc-src">
            <b>{taux.unTir}</b> l&apos;écrivent, aucune interface ne le rappelle : le parchemin ne
            vaut que pour <b>une seule tentative</b>.
          </p>
        )}
      </Point>

      {absolus.length > 0 && (
        <Point titre={`${absolus.length} Parchemins d'Enchantement Absolu : le palier à coup sûr`} marque="profit">
          <Grille cases={absolus.map((o): Vue => ({
            cle: o.cle, src: iconeDe(o), cherche: o.n,
            nom: o.n.replace(/^Parchemin d.Enchantement Absolu\s*/i, ""),
          }))} />
          <p className="mc-src">
            Un par palier, sans protection — mais <b>pas sur une arme Ultime</b>. On garde le sien
            pour le palier qui casse.
          </p>
        </Point>
      )}

      <Point titre={`L'échelle monte jusqu'à +${BIJOU.upMax}, et pas sur toutes les pièces`}>
        <Bareme lignes={[
          ["Anneau, boucle, collier", `+${BIJOU.upMax}`],
          ["Arme Artefact", `+${ARME_ARTEFACT.upMax}`],
          ["Arme, tenue, casque, gants", `+${TENUE.upMax}`],
        ]} />
        {/* « Un +20 ne dit rien tant qu'on ignore de quelle piece on parle » est
            parti : le bareme juste au-dessus met trois pieces en face de trois
            plafonds differents, il DIT deja ca, et mieux qu'une phrase. */}
        <div>
          {ECHELLE.map((e) => {
            const l = objets(e.cles);
            if (!l.length) return null;
            return (
              <div key={e.de} className="mc-etage">
                <span className="mc-etage-t"><b>{e.de}</b><span>{e.titre}</span></span>
                <span className="mc-etage-l">
                  {/* Une grille d'icones, pas une liste de phrases : a cet etage
                      la question est « avec QUOI », et le nom y repond. */}
                  <Grille taille={26} cases={l.map((o): Vue => ({
                    cle: o.cle, src: iconeDe(o), nom: o.n, cherche: o.n,
                  }))} />
                </span>
              </div>
            );
          })}
        </div>
      </Point>

      {luca.objets.length > 0 && (
        <Point titre={`Le PNJ Donjon Luca tient ${luca.objets.length} de ces objets`} marque="profit">
          <p>Passage obligé du haut niveau, qu&apos;aucune interface ne récapitule.</p>
          {/* `NomObjet` PLUTOT QU'UN LIEN NU, ET SEULEMENT ICI. Il est CLIENT et
              coute une reference par emploi : sur les cent cinquante cases de la
              planche, un lien nu suffit. Sur cet etal, la question est « ou ca se
              trouve » — au survol il donne la fiche ET la provenance sans quitter
              la page. */}
          <p className="mc-noms">
            {luca.objets.map((o) => <NomObjet key={o.cle} nom={o.n} icone={o.ic} taille={18} />)}
          </p>
          {luca.monnaies.length > 0 && (
            <>
              <p className="mc-src">Il ne prend que {luca.monnaies.length} monnaies :</p>
              <Grille taille={26} cases={luca.monnaies.map((o): Vue => ({
                cle: o.cle, src: iconeDe(o), nom: o.n, cherche: o.n,
              }))} />
            </>
          )}
        </Point>
      )}
    </>
  );
}

/* ═══ 5. Artefact & ascension ════════════════════════════════════════════════ */

export function Artefact() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
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
      <Bareme lignes={[
        ["Amélioration ordinaire", `+1 → +${ARME_SIMPLE.upMax}`],
        ["La pièce devient un artefact", `+${ARME_SIMPLE.upMax + 1} → +${ARME_ARTEFACT.upMax}`],
        ["Étoiles d'ascension", "3"],
        ["Gemmes en plus", `+${ARME_ARTEFACT.sertissage?.holo} holographiques`],
      ]} />

      <Groupe titre={`Le plan d'ascension dépend de l'arme — ${FAMILLES.length} familles`}>
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
        <p className="mc-src">Le glaive et la doloire partagent le leur.</p>
      </Groupe>

      <Groupe titre="Ce qu'on ramasse pour ça">
        <Grille cases={RESSOURCES.map(([f, nom]): Vue => ({
          cle: f, src: `/jeu/mecaniques/${f}.webp`, nom, cherche: nom,
        }))} />
      </Groupe>
    </div>
  );
}

/* ═══ 6. Rareté ══════════════════════════════════════════════════════════════ */

/** Les trois statistiques qu'un tank cherche. Elles servent à INTERROGER le
 *  vivier de rareté, pas à décrire son contenu : la phrase à l'écran se construit
 *  sur le résultat de la recherche, si bien qu'elle se corrige toute seule le jour
 *  où Airborn en ajoute une au tirage. */
const STATS_DEFENSIVES = ["PV max", "Endurance", "Défense"];

export function Rarete() {
  const r = rareteChiffree();
  /** LES PALIERS QUE LE CLIENT NE DESSINE PAS. Le rail annonce le nombre de
   *  paliers, la grille n'en montre que ceux qui ont une image : sans cette
   *  phrase, la page se lit comme un classement coupé sous son compteur — le
   *  défaut exact qu'on nous a demandé de ne plus reproduire. Le compte et les
   *  noms sortent de la table, jamais du clavier. */
  const sansDessin = RARETES.filter((x) => !ICONE_RARETE[x]);
  const presentes = STATS_DEFENSIVES.filter(
    (nom) => r.vivier.some((v) => v.stat.localeCompare(nom, "fr", { sensitivity: "base" }) === 0),
  );
  // Les chances ne s'affichent QUE si la table est cohérente. Un total qui ne
  // fait pas 100 est une table incomplète ou mal lue : on ne la publie pas, et
  // on n'écrit pas de réserve à la place — la section se contente du reste.
  const tirageSain = r.somme === 100 && r.lignes.length > 0;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Grille cases={RARETES.map((x): Vue => ({
        cle: x, src: ICONE_RARETE[x], nom: x, couleur: COULEUR_RARETE[x],
      }))} />
      <p className="mc-note">
        La rareté donne les lignes bonus, et sa couleur est celle de l&apos;AirBuilder. Sur
        {" "}<b>{RARETES.length} paliers</b>, {RARETES.length - sansDessin.length} ont un dessin :
        {" "}<b>{sansDessin.join(" et ")}</b> {sansDessin.length > 1 ? "n'en ont" : "n'en a"} pas de
        parchemin dans le client.
      </p>

      {tirageSain && (
        <Point titre="Le palier ne dit pas combien de lignes l'arme reçoit" marque="piege">
          <Barres max={100} lignes={r.lignes.map((l) => ({
            nom: `${l.amount} ligne${l.amount > 1 ? "s" : ""} bonus`,
            v: l.chance,
            texte: `${l.chance} %`,
          }))} />
          {r.vivier.length > 0 && (
            <>
              <p className="mc-src">Un tirage, et très déséquilibré. Le vivier :</p>
              <Chips puces={r.vivier.map((v) => ({ texte: `${v.stat} +${v.min} → +${v.max}` }))} />
              <p className="mc-src">
                {presentes.length === 0
                  ? <>Aucune n&apos;est défensive : un tank ne gagne <b>rien de garanti</b> à monter
                      la rareté de son arme.</>
                  : <>Dont <b>{presentes.join(", ")}</b> : un tank y trouve son compte.</>}
              </p>
            </>
          )}
        </Point>
      )}
    </div>
  );
}

/* ═══ 7. Éveil, scroll, élément ══════════════════════════════════════════════ */

/** « Parchemin de Léthargie » → « Léthargie ». Les quatre parchemins d'éveil
 *  commencent tous par le même mot, et la case le porterait quatre fois : ce qui
 *  distingue les quatre est ce qui vient APRÈS. Le nom entier reste dans le lien
 *  vers la fiche, parce que c'est lui qu'on tape dans le jeu. */
const courtParchemin = (n: string) => {
  const s = n.replace(/^Parchemin\s+(?:d[e’']\s*)?/i, "");
  return s ? s[0].toUpperCase() + s.slice(1) : n;
};

export function Eveil() {
  const cartes = cartesDElement();
  const obsoletes = cartes.filter((x) => x.obsolete);
  /* LES DEUX PLAFONDS SE LISENT, ils ne s'ecrivent plus. La phrase disait
     « elles plafonnent a +5, quatre fois plus bas que leur voisine » : deux
     chiffres tapes a la main sur une page dont toute la valeur est de ne jamais
     en taper. Ils sortent maintenant de la phrase du client, carte par carte. */
  const plafondBas = obsoletes[0]?.max ?? null;
  const plafondPlein = cartes.find((x) => !x.obsolete)?.max ?? null;
  const parcheminsDEveil = objets(PARCHEMINS_EVEIL);
  const revele = parcheminsDEveil[0];
  /** Le prix d'un tirage, tel que la fenêtre du jeu l'annonce. Un COÛT reste à
   *  l'écran là où une récompense n'y va pas : c'est lui qui dit combien coûte
   *  un éveil raté. */
  const coutEveil = panneau(/veil d.objet/i)?.penya?.[0] ?? "";
  const fixes = eveilFixe(/^II_SYS_SYS_SCR_FIX_AWAKE_/);
  const changer = panneau(/changement d.él[eé]ment/i);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Grille cases={[
        { cle: "r1", src: ICONE_EVEIL.R1, nom: "Éveil R1" },
        { cle: "r2", src: ICONE_EVEIL.R2, nom: "Éveil R2" },
        { cle: "sc", src: ICONE_SCROLL, nom: "Scroll de stat" },
        ...Object.entries(ICONE_ELEMENT).map(([nom, src]): Vue => ({ cle: nom, src, nom })),
      ]} />
      <Bareme lignes={[
        ["Éveil R1 et R2 — une ligne en plus", `parmi ${STATS_EVEIL.length} statistiques`],
        ["Scroll de stat", `+1 → +4 sur ${STATS_SCROLL.length} statistiques de base`],
        ["Élément de l'arme", `jusqu'à +${ARME_ARTEFACT.elementMax}`],
      ]} />
      {/* LA MOITIE DE CETTE LIGNE EST PARTIE. Elle finissait par « l'element ne se
          confond pas avec les cartes de percage » — le Groupe juste dessous le dit
          deja, et mieux : « elles s'appellent aussi Carte et ne percent rien ».
          Reste ce que rien d'autre ne donne : le mot a taper dans le jeu. */}
      <p className="mc-src">
        <Bulle quoi={<>Le client dit « <b>foudre</b> », le builder dit « <b>Électricité</b> ». Même élément, deux mots — celui qu&apos;on cherche en jeu est « foudre ».</>}>
          Deux mots pour le même élément
        </Bulle>
      </p>

      <Groupe titre={`Ce qui monte l'élément : ${cartes.length} cartes, et un piège`}>
        <Grille taille={26} cases={cartes.map(({ fiche, obsolete }): Vue => ({
          cle: fiche.cle, src: iconeDe(fiche), cherche: fiche.n,
          nom: `${fiche.n}${obsolete ? " — obsolète" : ""}`,
          couleur: obsolete ? "var(--red)" : undefined,
        }))} />
        <p className="mc-note">
          Elles s&apos;appellent aussi « Carte » et ne percent rien. Deux par élément, dont
          {" "}<b>{obsoletes.length} marquées obsolètes par le client</b>
          {plafondBas != null && plafondPlein != null
            ? <> : elles plafonnent à <b>+{plafondBas}</b> contre <b>+{plafondPlein}</b>.</>
            : "."}
        </p>
      </Groupe>

      {changer && (
        <Point titre="Changer d'élément ne recommence pas à zéro" marque="profit">
          <p>
            <b>La valeur suit l&apos;élément</b>, jusqu&apos;à +{ARME_ARTEFACT.elementMax} : une arme
            élémentarisée au mauvais élément n&apos;est <b>pas perdue</b>, et se vend au même prix.
            Le jeu ne le dit que dans sa fenêtre de transformation.
          </p>
        </Point>
      )}

      {/* ── LE VOLET NE MONTRAIT PAS COMMENT ON EVEILLE ─────────────────────
          Il ouvrait sur R1 et R2 comme sur deux cases a cocher, et le point
          suivant vantait les parchemins « qui posent la ligne qu'on veut » sans
          jamais dire CONTRE QUOI. Contre un tirage : le client ecrit sur son
          propre parchemin que la propriete revelee peut etre NEGATIVE, et la
          fenetre du jeu facture chaque essai. Les quatre images sont celles du
          client (`/jeu/icones`), pas les copies renommees de
          `/jeu/mecaniques/eveil-*.webp` — memes pixels, empreinte verifiee, et
          celles-ci ouvrent la fiche de l'objet. */}
      {parcheminsDEveil.length > 0 && (
        <Point titre="L'éveil est un tirage, pas un réglage" marque="piege">
          <Grille cases={parcheminsDEveil.map((o): Vue => ({
            cle: o.cle, src: iconeDe(o), nom: courtParchemin(o.n), cherche: o.n,
          }))} />
          {revele?.d && <p className="mc-cite">« {revele.d} »</p>}
          {coutEveil && (
            <p className="mc-src">
              Chaque essai coûte <b>{coutEveil} penyas</b> : la <b>Léthargie</b> le rejoue, le
              {" "}<b>Lprotect</b> garde le meilleur des deux.
            </p>
          )}
        </Point>
      )}

      {fixes.lignes.length > 0 && (
        <Point titre={`${fixes.total} parchemins posent la ligne d'éveil qu'on veut`} marque="profit">
          {/* LES PIECES SONT DANS LE LIBELLE, et pas seulement annoncees par la phrase
              qui suit. Elles DIFFERENT d'un parchemin a l'autre — la Force va sur
              casque/torse/bouclier/arme, les Coups critiques sur torse/bottes, les PM
              exigent le set complet — et aucune fenetre du jeu ne les recapitule : la
              phrase seule promettait un renseignement que l'ecran ne donnait plus. */}
          <Bareme lignes={fixes.lignes.map((l) => [
            `${l.label || l.code}${l.pieces.length ? ` — ${l.pieces.join(", ")}` : ""}`,
            `R1 +${l.r1}${l.pourcent ? " %" : ""} · R2 +${l.r2}${l.pourcent ? " %" : ""}`,
          ] as [string, string])} />
          {/* « Chacun nomme les pieces ou il se pose : la Force ne va pas sur des
              bottes » est parti : le bareme du dessus LISTE ces pieces, ligne par
              ligne. La phrase decrivait le tableau qu'on avait sous les yeux.
              Reste le rapport entre les deux rangs, qu'aucune ligne ne donne. */}
          {fixes.pasDouble.length === 0 && (
            <p className="mc-src">
              Le <b>rang 2 vaut le double du rang 1</b> — pas sur la série pour costumes.
            </p>
          )}
        </Point>
      )}
    </div>
  );
}

/* ═══ 8. Runes & mantras ═════════════════════════════════════════════════════ */

export function Runes() {
  const r = runes();
  const m = mantras();
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p className="mc-note">
        La rune d&apos;<b>arme</b> dépend du palier de l&apos;arme, le <b>marteau</b> a sa série, et
        celle de <b>tenue</b> (aussi cape, familier, ramasseur) porte la pierre de la statistique
        qu&apos;elle donne. Il y en a <b>{r.total}</b>, pas quatre.
      </p>

      <Groupe titre="Rune d'arme">
        <Grille cases={[
          ...Object.entries(ICONE_RUNE_ARME).map(([nom, src]): Vue => ({ cle: nom, src, nom })),
          { cle: "vierge", src: ICONE_RUNE_VIERGE, nom: "Yggdrasil vierge" },
        ]} />
      </Groupe>
      <Groupe titre="Rune de marteau">
        <Grille cases={Object.entries(ICONE_RUNE_MARTEAU).map(([nom, src]): Vue => ({ cle: nom, src, nom }))} />
      </Groupe>
      <Groupe titre="Rune de tenue, par statistique">
        <Grille cases={Object.entries(ICONE_RUNE_STAT).map(([nom, src]): Vue => ({ cle: nom, src, nom }))} />
      </Groupe>
      {/* LES RUNES DE RAMASSEUR, images du client jamais branchees. Elles portent
          la distinction que le reste du site ne montre nulle part : la MEME
          statistique existe en version JcE et en version JcJ. */}
      <Groupe titre={`Rune de ramasseur — ${RAMASSEUR.length} pierres`}>
        <Grille taille={28} cases={RAMASSEUR.map((x): Vue => ({
          cle: x.f, src: `/jeu/mecaniques/${x.f}.webp`, nom: x.nom,
        }))} />
        <p className="mc-src">
          <b>Force</b> et <b>Intelligence</b> existent en <b>JcE</b> et en <b>JcJ</b> : deux pierres
          pour une même statistique, et pas la même selon qu&apos;on farme ou qu&apos;on va en arène.
        </p>
      </Groupe>

      <Groupe titre={`Les ${r.familles.length} familles, et combien chacune en compte`}>
        <Barres lignes={r.familles.map((f) => ({ nom: `${f.nom} — ${f.sous}`, v: f.membres.length }))} />
      </Groupe>

      {/* LES MANTRAS, jamais montres jusqu'ici. Le client les range en
          « consommable », mais ils occupent l'emplacement de MUNITION : c'est une
          ligne de bonus de plus sur le personnage, chiffree par le client. */}
      {m.paliers.length > 0 && (
        <Groupe titre={`Mantra — ${m.total} pierres, ${m.familles.length} effets`}>
          <Objets liste={m.paliers.map((o) => ligneDe(o, { bonus: true }))} />
          <p className="mc-src">
            Sur l&apos;emplacement de <b>munition</b> : porter un mantra, c&apos;est renoncer à ses
            flèches.
          </p>
        </Groupe>
      )}

      <div style={{ display: "grid", gap: 8, paddingTop: 4 }}>
        {r.tankMenteuses.map((o) => (
          <Point key={o.cle} titre={`« ${o.n} » n'est pas une rune tank`} marque="piege">
            <p>
              Les autres TANK de la gamme Luzaka donnent PV max % et Endurance. Celle-là porte des
              statistiques de support, et se vend au prix des autres :
            </p>
            <Bonus b={o.b} />
          </Point>
        ))}

        {r.intruses.map((o) => (
          <Point key={o.cle} titre={`« ${o.n} » donne du défensif là où sa gamme donne du dégât`} marque="piege">
            <Bonus b={o.b} />
            <p>Qui l&apos;achète pour taper se trompe : la doloire est l&apos;arme des tanks.</p>
          </Point>
        ))}

        {r.doublons.map((l) => (
          <Point key={l[0].cle} titre={`« ${l[0].n} » existe ${l.length} fois, sous ${l.length} clés`} marque="piege">
            <p>
              Deux objets, un seul nom — dont un rangé côté runes d&apos;arme avec les bonus de la
              rune de tenue. De quoi se tromper à l&apos;achat comme à la vente.
            </p>
            <Bonus b={l[0].b} />
          </Point>
        ))}
      </div>
      {/* La vignette de la pierre TANK accompagne le premier piege ci-dessus sans
          entrer dans son texte : elle montre le dessin qu'on croit acheter. */}
      {r.tankMenteuses.length > 0 && (
        <Vignettes items={[{ src: RUNE_TANK, legende: "Rune TANK" }]} />
      )}
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
 * déjà. Un sujet, une page : ici on montre la porte, on ne redéveloppe pas.
 */
const PORTES: [string, string, string][] = [
  ["/objets", "Le catalogue d'objets", "Une pièce nommée, sa rareté, sa provenance."],
  ["/crafts", "Recettes et crafts", "Les comptoirs à jetons, l'arbre du farm."],
  ["/classes", "Arène et compétences", "Un build juste en donjon est faux en JcJ."],
  ["/compositions", "GvG et Chambres Secrètes", "Le barème aux points, la taxe de région."],
];

export function Ailleurs() {
  return (
    <div className="mc-ailleurs">
      {PORTES.map(([href, titre, quoi]) => (
        <Link key={href} href={href} className="fx-card mc-porte">
          <span><b>{titre}</b><i>{quoi}</i></span>
        </Link>
      ))}
    </div>
  );
}
