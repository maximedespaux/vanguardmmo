"use client";
import { Bulle } from "@/components/Bulle";
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

/** Y a-t-il une faiblesse relevée sur ce donjon ? À demander AVANT de dessiner le
 *  cadre qui entoure les icônes : sans ça, une instance sans faiblesse relevée
 *  affichait une pastille vide ne portant que son pictogramme. */
export const aDesFaiblesses = (d: DonjonClient) => d.monstres.some((m) => !!m.faible);

/**
 * CE À QUOI LE PEUPLEMENT EST FAIBLE, en icônes.
 *
 * On agrège les faiblesses des créatures posées et on compte combien d'espèces
 * portent chacune : deux icônes dans une pastille disent en 40 px ce que
 * « faible au vent, faible au feu » disait sur deux lignes de tuile. La bulle
 * garde le détail — quelle espèce, pour ne pas emporter le mauvais élément sur
 * la foi d'une majorité.
 *
 * Rend `null` quand aucune espèce posée n'a de faiblesse relevée : le Temple
 * aérien n'a aucun monstre dans son fichier de carte, et une pastille vide
 * laisserait croire à un site cassé.
 */
export function FaiblessesDonjon({ d, taille = 13, bulle = true }: {
  d: DonjonClient;
  taille?: number;
  /** `false` DANS UN ÉLÉMENT DÉJÀ CLIQUABLE. Une bulle est un `<button>` : posée
   *  dans la tuile d'un donjon, qui ouvre la fiche au clic, l'ouvrir ouvrait aussi
   *  la fiche. Les tuiles s'en servent sans bulle, la fiche avec. */
  bulle?: boolean;
}) {
  const compte = new Map<string, string[]>();
  for (const m of d.monstres) {
    if (!m.faible) continue;
    compte.set(m.faible, [...(compte.get(m.faible) ?? []), m.nom]);
  }
  if (!compte.size) return null;
  const rangs = [...compte.entries()].sort((a, b) => b[1].length - a[1].length);
  const icones = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      {rangs.map(([el]) => <IconeElementDonjon key={el} elem={el} taille={taille} />)}
    </span>
  );
  if (!bulle) return icones;
  return (
    <Bulle
      largeur={280}
      quoi={
        <span style={{ display: "grid", gap: 6 }}>
          {rangs.map(([el, noms]) => (
            <span key={el} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <IconeElementDonjon elem={el} taille={14} />
              <span style={{ minWidth: 0 }}>
                <b>{el}</b> — {noms.slice(0, 4).join(", ")}
                {noms.length > 4 ? ` et ${noms.length - 4} autre${noms.length - 4 > 1 ? "s" : ""}` : ""}
              </span>
            </span>
          ))}
          <span style={{ color: "var(--text-muted)" }}>
            Lu dans la table de résistances de chaque créature, pas déduit de la roue élémentaire.
          </span>
        </span>
      }
    >
      {icones}
    </Bulle>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   QUEL ÉLÉMENT EMPORTER DANS CETTE INSTANCE — et lequel y est perdu.

   ┌──── CE QUE LA FICHE MONTRAIT, ET CE QU'ELLE TAISAIT ────┐
   │ Elle disait « ils sont faibles à … » et s'arrêtait là.   │
   │ Or `donjons-client.json` porte DEUX champs par créature  │
   │ posée : `faible` ET `resiste`. Le second est renseigné   │
   │ sur toutes les créatures posées du fichier, il est juste │
   │ — vérifié colonne par colonne contre le catalogue des    │
   │ monstres — et il n'était affiché NULLE PART.             │
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

/** Combien de créatures posées portent chaque valeur d'un champ élémentaire.
 *  Trié du plus fréquent au moins, à égalité par ordre alphabétique — sans quoi
 *  deux éléments à égalité changeaient de place d'un rendu à l'autre. */
function comptePar(d: DonjonClient, champ: "elem" | "faible" | "resiste") {
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
export function dominantInstance(d: DonjonClient) {
  const rangs = comptePar(d, "elem");
  const poses = d.monstres.length;
  if (!rangs.length || !poses) return null;
  return { ...rangs[0], sur: poses, seul: rangs.length === 1, tetes: enTete(rangs) };
}

/**
 * LE CONSEIL D'UNE INSTANCE — trois lignes, tous les nombres comptés sur sa carte.
 *
 * Rend `null` quand aucune créature n'est posée : le Temple aérien n'a rien dans
 * son fichier de carte, et un cadre vide se lit comme un site cassé.
 */
export function ConseilInstance({ d }: { d: DonjonClient }) {
  const dom = dominantInstance(d);
  const faibles = comptePar(d, "faible");
  const resistes = comptePar(d, "resiste");
  if (!dom && !faibles.length) return null;

  /* TOUS LES EX ÆQUO, pas le premier de l'alphabet. Voir `enTete`. */
  const emporter = enTete(faibles);
  const tete = emporter[0] ?? null;
  const eviter = resistes[0] ?? null;
  const poses = d.monstres.length;
  /* CE QU'ON DIT DE LAISSER OUVRE-T-IL QUAND MÊME UNE PARTIE DU PEUPLEMENT ?
     Au Sentier de Rhisis, les trois espèces posées ont trois faiblesses et trois
     résistances toutes différentes : « Laisse Feu » y désignait un élément
     auquel l'une des trois est FAIBLE. Le compte est lu dans le même fichier de
     carte que la ligne au-dessus — c'est une comparaison de nombres, pas une
     exception écrite à la main. */
  const laisseMaisOuvre = eviter ? (faibles.find((f) => f.e === eviter.e)?.n ?? 0) : 0;
  /* « le feu / l'eau / l'électricité / le vent / LA TERRE » — une table, pas une
     règle : « terre » est féminin et deux des cinq commencent par une voyelle.
     La version calculée qui vivait ici rendait « le terre ». Même convention que
     `LE_ELEMENT` dans FicheClient.tsx. */
  const LE: Record<string, string> = {
    Feu: "le feu", Eau: "l'eau", "Électricité": "l'électricité",
    Vent: "le vent", Terre: "la terre",
  };
  const article = (el: string) => LE[el] ?? el.toLowerCase();

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
      {eviter && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: "var(--text-muted)" }}>
          <Icon name="shield" size={12} style={{ color: "var(--red)", flexShrink: 0 }} />
          <span>Laisse</span>
          <IconeElementDonjon elem={eviter.e} taille={15} />
          <b style={{ color: "var(--text)" }}>{eviter.e}</b>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            — {eviter.n} espèce{eviter.n > 1 ? "s" : ""} sur {poses} {eviter.n > 1 ? "l'encaissent" : "l'encaisse"} mieux
          </span>
        </div>
      )}

      {/* ET LE DÉMENTI SORT AVEC LA LIGNE, JAMAIS APRÈS. Un « Laisse Feu » posé
          seul sur une carte où une espèce EST faible au feu se lit comme une
          consigne, et le peuplement plus bas la contredit sans le dire. */}
      {laisseMaisOuvre > 0 && eviter && (
        <div style={{ color: "var(--text-muted)", fontSize: 11.5, paddingLeft: 18 }}>
          Mais {laisseMaisOuvre} espèce{laisseMaisOuvre > 1 ? "s" : ""} sur {poses} y {laisseMaisOuvre > 1 ? "sont" : "est"} au
          contraire faible{laisseMaisOuvre > 1 ? "s" : ""} : c&apos;est le peuplement, plus bas, qui tranche espèce par espèce.
        </div>
      )}

      {/* L'AVERTISSEMENT QUI CHANGE UN GESTE : sur le catalogue entier, la terre
          domine et c'est le vent qui l'ouvre. Quand CETTE instance dit le
          contraire, on ne laisse pas le joueur arbitrer entre deux écrans en
          silence. Le test est fait sur les nombres de la carte, pas sur une
          liste d'instances écrite à la main. */}
      {eviter?.e === "Vent" && dom?.e === "Terre" && dom.tetes.length === 1 && tete && (
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
        Élément de <b>l&apos;arme</b> — l&apos;armure conseillée est un autre champ du relevé.
        Compté sur les créatures posées dans le fichier de carte, dans leur table de
        résistances : les boss que le serveur fait apparaître en cours de progression
        n&apos;y sont pas.
      </div>
    </div>
  );
}
