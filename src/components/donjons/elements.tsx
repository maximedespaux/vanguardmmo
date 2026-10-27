"use client";
import { Icon } from "@/components/Icon";
import type { DonjonClient } from "./donneesClient";

/**
 * L'ÉLÉMENT, EN IMAGE — et la réponse à un défaut de données qui traînait.
 *
 * ┌──── CE QUE LA PAGE AFFICHAIT, ET POURQUOI ÇA NE DISAIT RIEN ────┐
 * │ `dungeons.json` porte un champ `elem` présenté comme « Élément   │
 * │ boss ». Il vaut « Terre » sur LES VINGT-TROIS donjons, sans      │
 * │ exception — compté sur le fichier. Une colonne dont toutes les   │
 * │ lignes sont identiques ne permet aucun choix, et la série a      │
 * │ toutes les allures du copier-coller déjà constaté sur les        │
 * │ prestiges du client (voir `EcartPrestige`).                      │
 * │                                                                  │
 * │ Ce qui, lui, change ce qu'on emporte, c'est la FAIBLESSE des     │
 * │ créatures posées — et elle varie : vent, feu, eau, électricité   │
 * │ selon l'instance. Elle est LUE dans la table de résistances de   │
 * │ chaque monstre, jamais déduite de la roue élémentaire : des      │
 * │ monstres de ce jeu résistent à trois éléments à la fois.         │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Les cinq dessins viennent du client (`/jeu/mecaniques/element-*.webp`) et
 * servent déjà sur la page des monstres : le même élément a la même image d'un
 * écran à l'autre, c'est tout l'intérêt. Un élément hors des cinq — « Aucun » —
 * n'a pas d'image et n'en reçoit pas d'inventée.
 */

/** Les cinq éléments du jeu, écrits comme les données de donjon les écrivent. */
const FICHIER: Record<string, string> = {
  Feu: "feu", Eau: "eau", Vent: "vent", Terre: "terre",
  "Électricité": "electricite", Electricite: "electricite",
};

export const iconeElementFr = (elem?: string | null): string | null => {
  const f = elem ? FICHIER[elem.trim()] : null;
  return f ? `/jeu/mecaniques/element-${f}.webp` : null;
};

/** L'image d'un élément, ou rien. `titre` porte le mot pour qui survole. */
export function IconeElementDonjon({ elem, taille = 15 }: { elem?: string | null; taille?: number }) {
  const src = iconeElementFr(elem);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={elem ?? ""} title={elem ?? undefined} width={taille} height={taille}
    style={{ objectFit: "contain", flexShrink: 0, verticalAlign: "-2px" }} />;
}

/* ┌──── DEUX BRIQUES SONT MORTES ICI, ET C'EST UNE BONNE NOUVELLE ────┐
      `aDesFaiblesses` et `FaiblessesDonjon` dessinaient, sur la tuile, les
      icônes de ce à quoi les créatures posées sont faibles — sans un mot, la
      phrase reléguée dans un attribut `title`. `PastilleElement`, plus bas,
      fait le même travail en nommant l'élément ET en montrant celui qu'on
      laisse ; plus rien n'appelait ces deux-là. Un export que personne
      n'importe se relit comme du code vivant, alors il part.
   └────────────────────────────────────────────────────────────────────┘ */

/* ════════════════════════════════════════════════════════════════════════════
   QUEL ÉLÉMENT EMPORTER DANS CETTE INSTANCE — et lequel y est perdu.

   ┌──── CE QUE LA FICHE MONTRAIT, ET CE QU'ELLE TAISAIT ────┐
   │ Elle disait « ils sont faibles à … » et s'arrêtait là.   │
   │ Or `donjons-client.json` porte DEUX champs par créature  │
   │ posée : `faible` ET `resiste`. Le second est renseigné   │
   │ sur toutes les créatures posées du fichier, il est juste │
   │ — les 67 créatures posées ont été recomparées aux cinq   │
   │ colonnes de `public/wiki/monstres.json`, 67 concordances │
   │ et zéro écart — et il n'était affiché NULLE PART.        │
   │                                                          │
   │ C'est pourtant lui qui coûte. Un joueur qui a lu « la    │
   │ plupart des monstres sont de terre, prends du vent »     │
   │ entre dans une instance dont les créatures ENCAISSENT    │
   │ MIEUX le vent, tape dans une résistance, et croit que le │
   │ site s'est trompé.                                       │
   └──────────────────────────────────────────────────────────┘

   Le bloc dit donc les deux, et il les COMPTE sur les créatures posées : la
   règle générale du catalogue n'entre pas ici. Une instance qui contredit la
   règle générale se contredit toute seule, avec ses propres nombres.

   MISE EN GARDE QUI RESTE : les créatures listées sont celles POSÉES DANS LE
   FICHIER DE CARTE. Plusieurs boss finaux sont créés par le serveur et n'y sont
   pas — voir `donneesClient.ts`. Le bloc annonce donc « les créatures posées »,
   jamais « le donjon ».
   ════════════════════════════════════════════════════════════════════════════ */

/**
 * TOUT CE DONT LE CONSEIL ÉLÉMENTAIRE A BESOIN, ET RIEN DE PLUS.
 *
 * ┌──── POURQUOI CE TYPE EXISTE PLUTÔT QUE `DonjonClient` ────┐
 * │ Ces fonctions ne lisaient que trois champs par créature,   │
 * │ mais elles réclamaient un donjon ENTIER — monde, dossier,  │
 * │ blocs, coordonnée d'entrée, prestige… Résultat : le conseil │
 * │ ne pouvait servir QUE sur les 23 instances du téléporteur,  │
 * │ alors que les dix lieux hors téléporteur ont exactement les │
 * │ mêmes colonnes de résistance et posent la même question au  │
 * │ joueur — le Royaume de Kaelis aligne seize espèces de terre.│
 * │ `DonjonClient` reste assignable à ce type : aucun appel     │
 * │ existant ne change, et le conseil devient portable.         │
 * └────────────────────────────────────────────────────────────┘
 */
export type PeuplementElementaire = {
  monstres: { elem: string | null; faible?: string; resiste?: string }[];
};

/** Combien de créatures posées portent chaque valeur d'un champ élémentaire.
 *  Trié du plus fréquent au moins, à égalité par ordre alphabétique — sans quoi
 *  deux éléments à égalité changeaient de place d'un rendu à l'autre. */
function comptePar(d: PeuplementElementaire, champ: "elem" | "faible" | "resiste") {
  const c = new Map<string, number>();
  for (const m of d.monstres) {
    const v = m[champ];
    if (!v || v === "Aucun") continue;
    c.set(v, (c.get(v) ?? 0) + 1);
  }
  return [...c.entries()].map(([e, n]) => ({ e, n })).sort((a, b) => b.n - a.n || a.e.localeCompare(b.e, "fr"));
}

/** LES ÉLÉMENTS EN TÊTE D'UN COMPTAGE — tous ceux qui font le même score, pas
 *  seulement le premier. Le tri ci-dessus départage les ex æquo par ordre
 *  alphabétique : sans cette fonction, le Sentier de Rhisis — trois créatures,
 *  trois faiblesses différentes, une chacune — annonçait « Emporte Eau » parce
 *  qu'« Eau » vient avant « Feu » dans l'alphabet. Un départage d'affichage ne
 *  doit jamais devenir un conseil. */
const enTete = (rangs: { e: string; n: number }[]) =>
  rangs.length ? rangs.filter((x) => x.n === rangs[0].n) : [];

/** L'élément dominant du peuplement posé, et sa part. `null` quand rien n'est posé
 *  ou qu'aucune créature ne porte d'élément. `tetes` porte les ex æquo : une
 *  instance dont les espèces sont d'éléments tous différents n'a PAS de dominante,
 *  et le dire est plus utile que d'en désigner une au hasard de l'alphabet. */
export function dominantInstance(d: PeuplementElementaire) {
  const rangs = comptePar(d, "elem");
  const poses = d.monstres.length;
  if (!rangs.length || !poses) return null;
  return { ...rangs[0], sur: poses, seul: rangs.length === 1, tetes: enTete(rangs) };
}

/* « le feu / l'eau / l'électricité / le vent / LA TERRE » — une table, pas une
   règle : « terre » est féminin et deux des cinq commencent par une voyelle.
   La version calculée qui vivait ici rendait « le terre ». Même convention que
   `LE_ELEMENT` dans FicheClient.tsx. */
const LE: Record<string, string> = {
  Feu: "le feu", Eau: "l'eau", "Électricité": "l'électricité",
  Vent: "le vent", Terre: "la terre",
};
const article = (el: string) => LE[el] ?? el.toLowerCase();

/* LE PARTITIF — « demande DU feu », « demande DE L'eau », « demande DE LA terre ».
   Une troisième table et non une règle, pour la même raison que la précédente : la
   version calculée écrivait « demandent le feu », qui ne se dit pas. */
const DU: Record<string, string> = {
  Feu: "du feu", Eau: "de l'eau", "Électricité": "de l'électricité",
  Vent: "du vent", Terre: "de la terre",
};
const partitif = (el: string) => DU[el] ?? `de ${el.toLowerCase()}`;
/** « la terre » → « terre » : le nom nu, quand la phrase porte déjà son article. */
const nu = (el: string) => article(el).replace(/^(le |la |l')/, "");

/**
 * CE QU'UNE INSTANCE DIT D'ELLE-MÊME, COMPTÉ UNE SEULE FOIS.
 *
 * La tuile et la fiche montrent le MÊME conseil : si chacune refaisait son
 * comptage, elles finiraient par diverger sur un ex æquo, et deux écrans du même
 * site se contrediraient sur ce qu'il faut emporter. Une fonction, un résultat.
 *
 * ┌──── LE DÉPARTAGE PAR L'ALPHABET AVAIT SURVÉCU D'UN CÔTÉ ────┐
 * │ `enTete` avait été écrit pour que « Emporte » ne désigne pas  │
 * │ le premier de l'alphabet parmi des ex æquo. `eviter` prenait  │
 * │ pourtant encore `resistes[0]` tel quel : au Sentier de Rhisis │
 * │ — trois espèces, trois résistances différentes, une chacune — │
 * │ la fiche annonçait « Laisse Feu » parce que « Feu » vient     │
 * │ avant « Terre » et « Vent ». Le même défaut, corrigé d'un     │
 * │ côté seulement. Les deux passent maintenant par `enTete`.     │
 * └──────────────────────────────────────────────────────────────┘
 */
export function conseilDe(d: PeuplementElementaire) {
  const dom = dominantInstance(d);
  const faibles = comptePar(d, "faible");
  const resistes = comptePar(d, "resiste");
  const poses = d.monstres.length;
  /* TOUS LES EX ÆQUO, pas le premier de l'alphabet. Voir `enTete`. */
  const emporter = enTete(faibles);
  const eviter = enTete(resistes);
  const tete = emporter[0] ?? null;
  const bloc = eviter[0] ?? null;
  /* CE QU'ON DIT DE LAISSER OUVRE-T-IL QUAND MÊME UNE PARTIE DU PEUPLEMENT ?
     Au Sentier de Rhisis, les trois espèces posées ont trois faiblesses et trois
     résistances toutes différentes : « Laisse Feu » y désignait un élément
     auquel l'une des trois est FAIBLE. Le compte est lu dans le même fichier de
     carte que la ligne au-dessus — c'est une comparaison de nombres, pas une
     exception écrite à la main. */
  const laisseMaisOuvre = eviter
    .map((x) => ({ e: x.e, n: faibles.find((f) => f.e === x.e)?.n ?? 0 }))
    .filter((x) => x.n > 0);
  /* LA RÈGLE GÉNÉRALE SE RETOURNE-T-ELLE ICI ? Sur le catalogue entier la terre
     domine et c'est le vent qui l'ouvre ; deux instances posent des créatures de
     terre qui ENCAISSENT MIEUX le vent. Le test est fait sur les nombres de la
     carte, jamais sur une liste d'instances écrite à la main. */
  const contreLaRegle =
    dom?.tetes.length === 1 && dom.e === "Terre" &&
    eviter.length === 1 && eviter[0].e === "Vent" && Boolean(tete);
  /* `resistes` NE SORT PAS : personne ne s'en sert hors d'ici, et un champ exporté
     que rien ne lit finit par être lu à la place de `eviter`, c'est-à-dire sans le
     départage des ex æquo — exactement le défaut qu'on vient de corriger. */
  return { dom, faibles, emporter, eviter, tete, bloc, poses, laisseMaisOuvre, contreLaRegle };
}

/** La phrase entière du conseil, pour un `title` ou un lecteur d'écran : la tuile
 *  n'en montre que la moitié, et un survol ne se fait pas sur un téléphone. */
export function phraseConseil(d: PeuplementElementaire): string {
  const { emporter, eviter, tete, bloc, poses } = conseilDe(d);
  if (!tete) return "";
  const un = emporter.map((x) => x.e).join(" ou ");
  const debut = emporter.length > 1
    ? `Emporte ${un} — ${tete.n} espèce${tete.n > 1 ? "s" : ""} chacun sur ${poses}, aucun ne les ouvre toutes.`
    : `Emporte ${un} — ${tete.n} espèce${tete.n > 1 ? "s" : ""} sur ${poses} y ${tete.n > 1 ? "sont" : "est"} faible${tete.n > 1 ? "s" : ""}.`;
  if (!bloc || eviter.length > 1) return `${debut} C'est l'élément de l'arme.`;
  return `${debut} Laisse ${bloc.e} — ${bloc.n} sur ${poses} ${bloc.n > 1 ? "l'encaissent" : "l'encaisse"} mieux. C'est l'élément de l'arme.`;
}

/**
 * LE CONSEIL D'UNE INSTANCE — trois lignes, tous les nombres comptés sur sa carte.
 *
 * Rend `null` quand aucune créature n'est posée : le Temple aérien n'a rien dans
 * son fichier de carte, et un cadre vide se lit comme un site cassé.
 *
 * `provenance` DIT OÙ ONT ÉTÉ COMPTÉS CES NOMBRES, et c'est une propriété parce
 * que le bloc ne sert plus dans un seul endroit. Sur une instance du téléporteur
 * les créatures sont posées dans un FICHIER DE CARTE, et la phrase doit prévenir
 * que les boss d'ambiance n'y sont pas. Sur une zone de farm, elles viennent de la
 * table des monstres du client, où il n'y a pas de boss d'ambiance à manquer :
 * répéter la mise en garde de l'un chez l'autre l'aurait rendue fausse.
 */
export function ConseilInstance({ d, provenance }: {
  d: PeuplementElementaire;
  provenance?: React.ReactNode;
}) {
  const { dom, faibles, emporter, eviter, tete, bloc, poses, laisseMaisOuvre, contreLaRegle } = conseilDe(d);
  if (!dom && !faibles.length) return null;

  return (
    <div style={{
      background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8,
      padding: "10px 12px", marginBottom: 14, fontSize: 12.5, lineHeight: 1.6, display: "grid", gap: 5,
    }}>
      {dom && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: "var(--text-muted)" }}>
          <Icon name="skull" size={12} style={{ flexShrink: 0 }} />
          <span>{dom.tetes.length > 1 ? "Peuplement mêlé" : "Peuplement posé"}</span>
          {dom.tetes.map((t) => (
            <span key={t.e} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <IconeElementDonjon elem={t.e} taille={14} />
              <b style={{ color: "var(--text)" }}>{t.e}</b>
            </span>
          ))}
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {dom.tetes.length > 1
              /* AUCUNE DOMINANTE : on ne désigne pas un vainqueur que le tri a
                 fabriqué. « — 1 espèce chacun sur 3 » dit exactement ce que le
                 fichier de carte porte. */
              ? `— ${dom.n} espèce${dom.n > 1 ? "s" : ""} chacun sur ${dom.sur}`
              /* « les 1 espèce posée » se lisait sur les six instances qui n'en
                 posent qu'une seule. */
              : dom.seul
                ? dom.sur > 1 ? `— les ${dom.sur} espèces posées` : "— la seule espèce posée"
                : `— ${dom.n} espèce${dom.n > 1 ? "s" : ""} sur ${dom.sur}`}
          </span>
        </div>
      )}

      {tete && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Icon name="target" size={12} style={{ color: "var(--green)", flexShrink: 0 }} />
          <span style={{ color: "var(--text-muted)" }}>Emporte</span>
          {emporter.map((x, i) => (
            <span key={x.e} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              {i > 0 && <span style={{ color: "var(--text-muted)" }}>ou</span>}
              <IconeElementDonjon elem={x.e} taille={15} />
              <b>{x.e}</b>
            </span>
          ))}
          <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
            {emporter.length > 1
              ? `— ${tete.n} espèce${tete.n > 1 ? "s" : ""} chacun sur ${poses} : aucun ne les ouvre toutes`
              : `— ${tete.n} espèce${tete.n > 1 ? "s" : ""} sur ${poses} y ${tete.n > 1 ? "sont" : "est"} faible${tete.n > 1 ? "s" : ""}`}
          </span>
        </div>
      )}

      {/* LA LIGNE QUI N'EXISTAIT PAS. `resiste` était dans le fichier et dans le
          type, et ne sortait sur aucun écran. C'est pourtant l'erreur qui coûte :
          taper dans une résistance, ce n'est pas « moins bien », c'est un run
          qu'on rallonge sans comprendre pourquoi. */}
      {/* LE PICTOGRAMME N'EST PLUS UN BOUCLIER, et ce n'est pas une coquetterie :
          le bandeau « Armure conseillée » se peint à trois centimètres sous ce
          bloc AVEC UN BOUCLIER. Deux boucliers voisins, l'un pour l'arme qu'on
          laisse et l'autre pour l'armure qu'on porte, se lisent comme la même
          consigne dite deux fois. Le panneau d'interdiction ne se confond avec
          rien, et c'est le même que la tuile porte dans la grille. */}
      {bloc && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: "var(--text-muted)" }}>
          <Icon name="ban" size={12} style={{ color: "var(--red)", flexShrink: 0 }} />
          <span>Laisse</span>
          {eviter.map((x, i) => (
            <span key={x.e} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              {i > 0 && <span>ou</span>}
              <IconeElementDonjon elem={x.e} taille={15} />
              <b style={{ color: "var(--text)" }}>{x.e}</b>
            </span>
          ))}
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {eviter.length > 1
              /* AUCUN ÉLÉMENT N'EST « CELUI » QU'ON LAISSE quand trois espèces en
                 encaissent chacune un. Dire les trois, c'est dire qu'il n'y a pas
                 de consigne — et c'est vrai. */
              ? `— ${bloc.n} espèce${bloc.n > 1 ? "s" : ""} chacun sur ${poses} : aucun n'est perdu partout`
              : `— ${bloc.n} espèce${bloc.n > 1 ? "s" : ""} sur ${poses} ${bloc.n > 1 ? "l'encaissent" : "l'encaisse"} mieux`}
          </span>
        </div>
      )}

      {/* ET LE DÉMENTI SORT AVEC LA LIGNE, JAMAIS APRÈS. Un « Laisse Feu » posé
          seul sur une carte où une espèce EST faible au feu se lit comme une
          consigne, et le peuplement plus bas la contredit sans le dire. */}
      {laisseMaisOuvre.length > 0 && bloc && (
        <div style={{ color: "var(--text-muted)", fontSize: 11.5, paddingLeft: 18 }}>
          {/* L'ÉLÉMENT EST NOMMÉ, PAS DÉSIGNÉ PAR « Y ». Quand la ligne au-dessus
              en aligne trois — au Sentier de Rhisis, trois espèces encaissent
              chacune le sien —, « 1 espèce y est au contraire faible » ne dit pas
              LEQUEL des trois, c'est-à-dire ne dit rien d'utilisable. */}
          Mais {laisseMaisOuvre.map((x) => article(x.e)).join(" et ")}{" "}
          {laisseMaisOuvre.length > 1 ? "ouvrent" : "ouvre"} au contraire{" "}
          {laisseMaisOuvre.reduce((s, x) => s + x.n, 0)} espèce
          {laisseMaisOuvre.reduce((s, x) => s + x.n, 0) > 1 ? "s" : ""} sur {poses} :
          c&apos;est le peuplement, plus bas, qui tranche espèce par espèce.
        </div>
      )}

      {/* L'AVERTISSEMENT QUI CHANGE UN GESTE : sur le catalogue entier, la terre
          domine et c'est le vent qui l'ouvre. Quand CETTE instance dit le
          contraire, on ne laisse pas le joueur arbitrer entre deux écrans en
          silence. Le test vit dans `conseilDe` — la tuile de la grille s'en sert
          aussi, et les deux ne peuvent donc pas désigner des instances
          différentes. */}
      {contreLaRegle && tete && (
        <div style={{ color: "var(--red)", display: "flex", alignItems: "flex-start", gap: 6 }}>
          <Icon name="alert" size={12} style={{ flexShrink: 0, marginTop: 3 }} />
          <span>
            Ici la règle générale se retourne : les créatures sont de terre, mais elles
            <b> encaissent mieux le vent</b>. C&apos;est {emporter.map((x) => article(x.e)).join(" ou ")} qui les ouvre.
          </span>
        </div>
      )}

      {/* ┌──── LE MALENTENDU À DÉSAMORCER, ET IL EST À TROIS CENTIMÈTRES ────┐
             Le bandeau juste sous ce bloc annonce « Armure conseillée : Armure
             vent +20 » sur dix-neuf des vingt-trois fiches. Quand ce bloc écrit
             « Laisse Vent » au-dessus, les deux lignes se lisent comme un site
             qui se contredit — alors qu'elles ne parlent pas de la même chose et
             ne viennent pas du même champ du relevé. On le dit, plutôt que de
             laisser le joueur arbitrer. */}
      <div style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
        {provenance ?? (
          <>
            Élément de <b>l&apos;arme</b> — l&apos;armure conseillée est un autre champ du relevé.
            Compté sur les créatures posées dans le fichier de carte, dans leur table de
            résistances : les boss que le serveur fait apparaître en cours de progression
            n&apos;y sont pas.
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LE CONSEIL SORT DES FICHES.

   ┌──── CE QUI EXISTAIT, ET POURQUOI ÇA NE SUFFISAIT PAS ────┐
   │ `ConseilInstance` dit tout ce qu'il faut — mais il vit    │
   │ DANS la fiche, qui ne se monte qu'au clic. Mesuré sur le  │
   │ HTML servi de /donjons : ni « Emporte » ni « Laisse » n'y │
   │ apparaissaient une seule fois. La tuile portait bien les  │
   │ icônes de faiblesse, sans un mot, et la phrase qui les    │
   │ nommait était dans un attribut `title` — c'est-à-dire     │
   │ nulle part sur un téléphone, où le survol n'existe pas.   │
   │ Le renseignement était écrit et restait invisible.        │
   └──────────────────────────────────────────────────────────┘

   Deux endroits, donc, et aucun n'est un paragraphe :
     · UNE PASTILLE PAR TUILE, là où on choisit — le dessin de l'élément, son
       NOM, et le panneau d'interdiction de celui qu'on laisse.
     · UN BLOC EN TÊTE DE GRILLE qui dit la règle générale ET sa limite, comptée
       instance par instance. Il absorbe la ligne de légende de l'armure, qui
       disait déjà « le bouclier sur une tuile veut dire… » : les deux
       expliquent comment lire une tuile, elles tiennent dans le même cadre.
   ════════════════════════════════════════════════════════════════════════════ */

/**
 * CE QU'ON EMPORTE, SUR LA TUILE — un mot, deux dessins, aucun survol requis.
 *
 * Le NOM de l'élément est écrit, et c'est le seul mot ajouté à la tuile : cinq
 * icônes de 13 px ne se retiennent pas par cœur, et c'est le mot qu'on cherche
 * dans son inventaire. Il tombe quand il y a des ex æquo — trois noms sur une
 * tuile de 250 px ne se lisent plus, et « aucun élément ne les ouvre toutes »
 * est justement ce que trois dessins côte à côte disent sans un mot.
 *
 * `null` quand rien n'est posé sur la carte : le Temple aérien n'a aucune
 * créature dans son fichier, et une pastille vide se lit comme un site cassé.
 */
export function PastilleElement({ d }: { d: PeuplementElementaire }) {
  const { emporter, eviter, tete, bloc } = conseilDe(d);
  if (!tete) return null;
  /* LE « LAISSE » NE SORT QUE S'IL DÉSIGNE QUELQU'UN. Au Sentier de Rhisis, les
     trois espèces encaissent chacune un élément différent : trois panneaux
     d'interdiction sur une tuile annonceraient une consigne que la fiche dément
     aussitôt. La tuile se tait, la fiche détaille. */
  const laisse = eviter.length === 1 ? bloc : null;
  return (
    <span
      title={phraseConseil(d)}
      style={{
        background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px",
        display: "inline-flex", alignItems: "center", gap: 4,
      }}
    >
      <Icon name="target" size={11} style={{ color: "var(--green)", flexShrink: 0 }} />
      {emporter.map((x) => <IconeElementDonjon key={x.e} elem={x.e} taille={13} />)}
      {emporter.length === 1 && <b>{emporter[0].e}</b>}
      {laisse && (
        <>
          <span aria-hidden="true" style={{ width: 1, height: 11, background: "var(--border)", flexShrink: 0 }} />
          <Icon name="ban" size={11} style={{ color: "var(--red)", flexShrink: 0 }} />
          <IconeElementDonjon elem={laisse.e} taille={13} />
        </>
      )}
    </span>
  );
}

/** CE QU'UNE INSTANCE DEMANDE, EN UN SEUL MOT — l'élément quand il n'y en a qu'un,
 *  `null` quand plusieurs font le même score. `null` n'est pas une absence : c'est
 *  le Sentier de Rhisis, trois espèces et trois faiblesses différentes. */
const demandeDe = (c: ReturnType<typeof conseilDe>) =>
  c.emporter.length === 1 ? c.emporter[0].e : null;

/** Le comptage d'un lot d'instances déjà conseillées, rangé du plus fréquent au
 *  moins. À égalité, l'ordre alphabétique : il ne désigne aucun vainqueur puisque
 *  chaque nombre est écrit à côté de son élément. */
function repartition(lot: { c: ReturnType<typeof conseilDe> }[]) {
  const compte = new Map<string | null, number>();
  for (const { c } of lot) {
    const k = demandeDe(c);
    compte.set(k, (compte.get(k) ?? 0) + 1);
  }
  return [...compte.entries()]
    .map(([e, n]) => ({ e, n }))
    .sort((a, b) => b.n - a.n || (a.e ?? "￿").localeCompare(b.e ?? "￿", "fr"));
}

/**
 * QUEL ÉLÉMENT EMPORTER, EN TÊTE DE GRILLE — la règle de Maxime, et sa limite.
 *
 * ┌──── LES DEUX PHRASES SONT VRAIES, ET LA DONNÉE LES SÉPARE ────┐
 * │ « La plupart des monstres sont de terre, prends du vent » se  │
 * │ vérifie sur le catalogue entier : c'est /monstres qui le      │
 * │ compte, et le lien y mène. Mais DANS LES INSTANCES la règle   │
 * │ n'est pas une majorité, c'est un tirage : sur les instances à │
 * │ dominante terre, une bonne moitié demande autre chose, et     │
 * │ deux d'entre elles ENCAISSENT MIEUX le vent. Un joueur qui    │
 * │ n'a lu que la règle y tape dans une résistance et conclut que │
 * │ le wiki s'est trompé.                                         │
 * └───────────────────────────────────────────────────────────────┘
 *
 * PAS UN NOMBRE, PAS UN NOM D'INSTANCE N'EST ÉCRIT ICI : tout est compté sur les
 * créatures posées de `donjons-client.json`. Le jour où une fouille rend le
 * peuplement du Temple aérien, les comptes et les noms cités suivent.
 *
 * La légende de l'armure est entrée dans ce cadre au lieu de vivre sur sa propre
 * ligne juste au-dessus : les deux disent comment lire une tuile.
 */
export function ConseilDesInstances({ instances, armure, nbArmures }: {
  instances: { nom: string; d: DonjonClient }[];
  /** L'armure conseillée quand elle est la même partout, sinon `null`. */
  armure?: string | null;
  /** Combien d'instances en demandent une — le pictogramme de bouclier les marque. */
  nbArmures?: number;
}) {
  /* LE CONSEIL EST CALCULÉ UNE FOIS PAR INSTANCE, puis relu : la suite pose six
     questions au même comptage, et le refaire six fois est le genre de détail
     qui finit par diverger quand quelqu'un modifie l'un des six appels. */
  const avec = instances
    .map((x) => ({ ...x, c: conseilDe(x.d) }))
    .filter((x) => x.c.tete);
  if (!avec.length) return null;

  const parts = repartition(avec);
  /* LA DOMINANTE DU PEUPLEMENT DE TOUTE LA GRILLE, comptée en créatures posées :
     c'est le « la plupart sont de terre » de la règle, vérifié ici. */
  const poses = instances.flatMap(({ d }) => d.monstres);
  const parElem = new Map<string, number>();
  for (const m of poses) {
    if (!m.elem || m.elem === "Aucun") continue;
    parElem.set(m.elem, (parElem.get(m.elem) ?? 0) + 1);
  }
  const dominant = [...parElem.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  /* LES INSTANCES DONT LE PEUPLEMENT EST DE LA MÊME COULEUR QUE LA RÈGLE. C'est là
     que la règle se joue : ailleurs elle ne s'applique pas, et personne ne
     l'attend. */
  const memeCouleur = dominant
    ? avec.filter(({ c }) => c.dom?.tetes.length === 1 && c.dom.e === dominant[0])
    : [];
  /* CE QUE LA RÈGLE RÉPOND, RECOMPTÉ ICI plutôt que supposé : la faiblesse la plus
     fréquente des créatures de ce lot. Sur les données d'aujourd'hui ça tombe sur
     le vent, ce qui est exactement ce que Maxime dit — et le jour où une fouille
     le renverse, la phrase change toute seule au lieu de mentir. */
  const faiblesLot = new Map<string, number>();
  for (const { d } of memeCouleur) for (const m of d.monstres) {
    if (m.faible) faiblesLot.set(m.faible, (faiblesLot.get(m.faible) ?? 0) + 1);
  }
  const attendu = [...faiblesLot.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const suivent = memeCouleur.filter(({ c }) => demandeDe(c) === attendu);
  const autresDemandes = repartition(memeCouleur.filter(({ c }) => demandeDe(c) !== attendu))
    .map((x) => ({ e: x.e ?? "mêlé", n: x.n }));
  /* LES TUILES OÙ LA RÈGLE SE RETOURNE, NOMMÉES. Deux noms coûtent six mots et
     remplacent une chasse dans vingt-trois tuiles ; au-delà de trois on ne les
     nomme plus, on donne le compte — une liste qu'on ne peut pas retenir ne
     change aucun geste. */
  const pieges = avec.filter(({ c }) => c.contreLaRegle);

  return (
    <div style={{
      background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "12px 14px", marginBottom: 14, display: "grid", gap: 9, fontSize: 12.5, lineHeight: 1.6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <span className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.1, color: "var(--gn-accent)" }}>
          Quel élément emporter
        </span>
        {/* LA RÉPARTITION EST LA RÉPONSE : un dessin et un nombre par élément
            demandé disent qu'il n'y a PAS une réponse unique, ce qu'aucune phrase
            ne fait aussi vite. LE MOT RESTE À CÔTÉ DU DESSIN — même règle que sur
            /monstres :
            cinq icônes de 14 px ne se retiennent pas par cœur, et sur un téléphone
            il n'y a pas de survol pour aller chercher le nom. */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          {parts.map((p) => (
            <span key={p.e ?? "mele"} style={{
              display: "inline-flex", alignItems: "center", gap: 4, background: "var(--bg-3)",
              border: "1px solid var(--border)", borderRadius: 7, padding: "2px 8px", fontVariantNumeric: "tabular-nums",
            }}>
              {p.e
                ? <><IconeElementDonjon elem={p.e} taille={14} /><span>{p.e}</span></>
                /* PAS DE DESSIN INVENTÉ POUR CE CAS-LÀ. « Mêlé » n'est pas un
                   élément : c'est une instance dont chaque espèce a la sienne.
                   Un pictogramme d'échange et le mot, pas une sixième icône
                   d'élément qui n'existe pas dans le jeu. */
                : <><Icon name="swap" size={12} style={{ color: "var(--text-muted)" }} /><span>Mêlé</span></>}
              <b>{p.n}</b>
            </span>
          ))}
          <span style={{ color: "var(--text-muted)" }}>
            {/* LE COMPTE DES PASTILLES EST ÉCRIT, pas seulement le total de la
                grille : sans lui, huit + huit + trois + deux + un font vingt-deux
                à côté d'un « sur 23 », et le lecteur qui additionne croit à une
                erreur. La différence, c'est le Temple aérien : le client ne pose
                aucune créature sur sa carte. */}
            — {avec.length} instance{avec.length > 1 ? "s" : ""} sur {instances.length}
          </span>
        </span>
      </div>

      {dominant && attendu && memeCouleur.length > 0 && (
        <div>
          Surtout de <b>{nu(dominant[0])}</b> ({dominant[1]} créatures posées sur {poses.length}),
          et {article(attendu)} est bien ce qui en ouvre le plus — mais ça ne tient que
          {" "}<b>sur {suivent.length} des {memeCouleur.length} instances de {nu(dominant[0])}</b>
          {/* LE VERBE UNE SEULE FOIS. « 7 demandent du feu, 2 demandent de l'eau »
              répète un mot que la virgule sous-entend déjà. */}
          {autresDemandes.length > 0 && <> : {autresDemandes.map((a, i) => `${a.n}${i === 0 ? (a.n > 1 ? " demandent" : " demande") : ""} ${a.e === "mêlé" ? "un élément par espèce" : partitif(a.e)}`).join(", ")}</>}.
          {pieges.length > 0 && (
            <> Sur {pieges.length <= 3
              ? <>{pieges.length > 1 ? `${pieges.length} d'entre elles (${pieges.map((p) => p.nom).join(", ")})` : pieges[0].nom}</>
              : `${pieges.length} d'entre elles`}, les créatures de {nu(dominant[0])}
              {" "}<b style={{ color: "var(--red)" }}>encaissent mieux {article(attendu)}</b>.</>
          )}
        </div>
      )}

      {/* COMMENT LIRE UNE TUILE — et le bouclier a rejoint la ligne, parce qu'il
          répond à la même question. La phrase de l'armure comptait ses instances
          toute seule ; elle continue, avec le nombre qu'on lui passe. */}
      {/* PAS UN CONTENEUR FLEX, ET C'EST MESURÉ. En flex, chaque morceau devient
          une unité de retour à la ligne : à 375 px, la légende partait sur cinq
          lignes ragged de trois mots. En texte ordinaire avec des pictogrammes
          en ligne, elle coule comme une phrase et tient sur trois. */}
      <div style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
        Sur une tuile : <Icon name="target" size={12} style={{ color: "var(--green)", verticalAlign: "-2px" }} />{" "}
        l&apos;élément de <b style={{ color: "var(--text)" }}>l&apos;arme</b> à emporter,{" "}
        <Icon name="ban" size={12} style={{ color: "var(--red)", verticalAlign: "-2px" }} /> celui qu&apos;on laisse.
        {armure && (
          <>
            {" "}<Icon name="shield" size={12} style={{ color: "var(--gn-accent)", verticalAlign: "-2px" }} />{" "}
            <b style={{ color: "var(--text)" }}>{armure}</b>, la même sur les {nbArmures} qui en demandent une.
          </>
        )}
      </div>

      {/* LA MISE EN GARDE RESTE PARCE QU'ELLE CHANGE UN GESTE : le boss final de
          plusieurs instances est créé par le serveur et n'est PAS dans le fichier
          de carte. Sans cette ligne, on prépare une arme sur un comptage qui ne
          l'inclut pas. Le détail — quelle créature, quelle table — est dans la
          fiche, il n'a pas à être répété ici. */}
      <div style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
        Compté sur les créatures posées dans le fichier de carte : les boss que le serveur
        ajoute en cours de progression n&apos;y sont pas.{" "}
        <a href="/monstres" style={{ color: "var(--gn-accent)", textDecoration: "none" }}>
          La règle sur tout le catalogue
        </a>
      </div>
    </div>
  );
}
