"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { Bulle, Invisible } from "@/components/Bulle";
import { useCardFx } from "@/components/VgFx";
import { OuTrouver } from "@/components/OuTrouver";
import { Etiquette } from "@/components/jeu/Rarete";
import { IconeObjet } from "./IconeObjet";
import { iconeElement, tonRang, court, type Lacheur } from "@/components/monstres/vocabulaire";
import type { Marchand } from "@/components/pnj/types";
import {
  BADGE_ULTIME, CADENAS, COULEUR_GRADE, DE_STAT, chiffreDeCombat,
  classeFr, elementPorte, emblemeClasse, emplacementFr, libelleEtPourcent,
  RESISTANCES, type Bonus, type ObjetFiche,
} from "./vocabulaire";
// 9 Ko de comptes précalculés (scripts/extraire-fashion.mjs), pas les 3 Mo du
// catalogue : ce fichier est un composant client.
import FASHION from "@/data/fashion-bonus.json";

/**
 * LA FICHE D'UN OBJET.
 *
 * Pas de rail de sections ici, exprès : une fiche est une feuille de
 * caractéristiques, on la lit d'un regard. Cacher les bonus derrière un onglet
 * obligerait à cliquer pour comparer deux pièces — c'est précisément ce qu'on vient
 * faire.
 *
 * ┌─────────────── CE QUI A QUITTÉ LA FICHE ───────────────┐
 * │ · LE PRIX DE RÉFÉRENCE. C'était un montant de PNJ, sans │
 * │   rapport avec le marché entre joueurs. Le champ reste   │
 * │   dans les données ; il ne s'affiche plus.               │
 * │ · LE PARAGRAPHE de la fashion. Le chiffre qui situait la │
 * │   pièce est passé dans une bulle, et le tableau des      │
 * │   plafonds appartient de toute façon aux mécaniques.     │
 * │ · Les libellés « Force », « Dextérité », « Intelligence »,│
 * │   « Endurance » : le jeu a ses propres tuiles FOR/DEX/    │
 * │   INT/END, elles disent la même chose en image.          │
 * └─────────────────────────────────────────────────────────┘
 *
 * ┌────────── CE QUE CETTE PASSE A AJOUTÉ ──────────┐
 * │ · LES BONUS VIENNENT DES CODES DU CLIENT quand le │
 * │   relevé par codes connaît l'objet, et chacun est │
 * │   un LIEN vers tout ce qui porte la même          │
 * │   statistique. Un bonus cesse d'être une ligne    │
 * │   morte : c'est par là qu'on compare deux pièces. │
 * │ · « LÂCHÉ PAR » — la question qu'aucune page ne   │
 * │   savait traiter. Le nom du monstre, son niveau,  │
 * │   ce qu'il faut lui sortir. Jamais la chance.     │
 * │ · « CHEZ QUI » — les PNJ qui l'ont, lus dans      │
 * │   leurs étals. Ça REMPLACE la ligne « Vendu par   │
 * │   un PNJ », qui s'appuyait sur un champ ne        │
 * │   voulant pas dire ça : 1 088 objets le portent,  │
 * │   60 seulement sont dans un étal du client.       │
 * └─────────────────────────────────────────────────┘
 *
 * Trois pièges du client du jeu sont traités plutôt que recopiés :
 *  - le niveau DE L'OBJET n'est pas le niveau REQUIS (le wiki confond les deux, d'où
 *    3 437 niveaux faux là-bas) : on montre le requis en gros et on ne signale
 *    l'autre que quand il diverge ;
 *  - `dwHanded` et la portée sont incohérents sur les armes d'Airborn : on ne les
 *    affiche pas du tout, le type dit déjà « deux mains » ;
 *  - le poids de rareté (`dwItemRare`) ressemble à une rareté mais n'en est pas une :
 *    il est resté hors du catalogue réduit, et c'est pourquoi aucun cadre de carte
 *    `bordure_*` n'apparaît ici — on ne connaît pas la rareté des objets.
 */

const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const carte: React.CSSProperties = { padding: 16 };
const titreBloc: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: ".5px", color: "var(--orange)", marginBottom: 12,
};

/** Une ligne « libellé … valeur ». Les chiffres sont alignés : on compare deux fiches
 *  côte à côte, et des chiffres qui dansent ne se comparent pas. */
function Ligne({ quoi, children }: { quoi: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "6px 0", borderTop: "1px solid color-mix(in srgb, var(--border) 55%, transparent)", fontSize: 13 }}>
      <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{quoi}</span>
      <span style={{ marginLeft: "auto", textAlign: "right", fontWeight: 600, ...NUM }}>{children}</span>
    </div>
  );
}

/** Les pastilles du haut : ce qui change la façon de se servir de l'objet. */
function Marque({ texte, couleur, icon, image }: { texte: string; couleur: string; icon?: IconName; image?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: ".6px", color: couleur, padding: "3px 9px", borderRadius: 20,
      background: `color-mix(in srgb, ${couleur} 11%, transparent)`,
      border: `1px solid color-mix(in srgb, ${couleur} 40%, transparent)` }}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" width={11} height={11} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
      ) : icon ? <Icon name={icon} size={11} /> : null}
      {texte}
    </span>
  );
}

/**
 * UNE LIGNE DE BONUS — avec le dé du jeu quand il en existe un, et un LIEN quand on
 * connaît son code.
 *
 * Les quatre statistiques de base ont leur tuile dans le client (FOR, DEX, INT, END) :
 * pour celles-là, l'image REMPLACE le mot. Les soixante-dix autres libellés
 * (Précision, Taux critique, Dégâts sur monstres…) n'ont pas d'image et gardent leur
 * texte — inventer un pictogramme pour chacun ferait soixante-dix devinettes.
 *
 * ┌──────── LE LIBELLÉ SEUL NE MÈNE NULLE PART, LE CODE SI ────────┐
 * │ Tant qu'un bonus n'était qu'un couple « mot, nombre », la fiche │
 * │ était un cul-de-sac : on lisait « Taux critique +70 » sans      │
 * │ pouvoir demander ce qui en donne plus. Avec le code `DST_*` du  │
 * │ client, la ligne devient un lien vers la recherche filtrée sur  │
 * │ cette statistique. C'est le geste que fait un joueur qui        │
 * │ compare, et il ne demandait qu'un identifiant.                  │
 * │ Sans code (le repli sur le champ `b` du catalogue), la ligne     │
 * │ reste du texte : mieux qu'un lien qui filtrerait à côté.         │
 * └────────────────────────────────────────────────────────────────┘
 */
function LigneBonus({ libelle, valeur, code }: { libelle: string; valeur: number; code?: string }) {
  const { mot, pct } = libelleEtPourcent(libelle);
  const de = DE_STAT[mot];
  const corps = (
    <>
      {de ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={de} alt={mot} title={mot} height={15}
          style={{ objectFit: "contain", imageRendering: "pixelated", flexShrink: 0, borderRadius: 3 }} />
      ) : (
        <Icon name="zap" size={11} style={{ color: "var(--orange)", opacity: 0.7, flexShrink: 0 }} />
      )}
      <span style={{ color: "var(--text-muted)" }}>{de ? (pct ? "%" : "") : mot}</span>
      <b style={{ marginLeft: "auto", color: valeur < 0 ? "var(--red)" : "var(--green)", ...NUM }}>
        {valeur > 0 ? "+" : ""}{valeur.toLocaleString("fr-FR")}{pct ? " %" : ""}
      </b>
    </>
  );
  const cadre: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 13 };
  if (!code) return <div style={cadre}>{corps}</div>;
  return (
    <Link href={`/objets?stat=${encodeURIComponent(code)}`} title={`Tout ce qui donne ${mot}`}
      style={{ ...cadre, textDecoration: "none", color: "var(--text)", padding: "1px 0" }}>
      {corps}
    </Link>
  );
}

/**
 * CHEZ QUI ON LE TROUVE — le nom du PNJ, son métier, sa ville.
 *
 * PAS DE COORDONNÉES et pas de prix : ce qui sert est le NOM du marchand et la ville
 * où le jeu le place, parce que c'est ce qu'on tape dans le téléporteur. Chaque nom
 * mène à l'annuaire ouvert sur cet objet — on y trouve son visage, sa carte de
 * région, et le reste de son étal.
 */
function ChezQui({ marchands, total, objet }: { marchands: Marchand[]; total: number; objet: string }) {
  if (!marchands.length) return null;
  const ton: Record<string, string> = { fabrique: "var(--green)", "contre un jeton": "var(--gold)", vend: "var(--blue)" };
  return (
    <div className="glass-card fx-card" style={carte}>
      <div style={titreBloc}>
        <Icon name="basket" size={13} /> Chez qui
        <span style={{ marginLeft: "auto", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--text-muted)", ...NUM }}>
          {total > marchands.length ? `${marchands.length} sur ${total}` : total}
        </span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {marchands.map((m) => (
          <Link key={`${m.cle}-${m.comment}`} href={`/pnj?objet=${encodeURIComponent(objet)}`}
            style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "6px 8px", borderRadius: 9,
              border: "1px solid var(--border)", background: "var(--bg-3)", textDecoration: "none", fontSize: 12.5, color: "var(--text)" }}>
            <span style={{ color: ton[m.comment], fontWeight: 700, flexShrink: 0, fontSize: 11 }}>{m.comment}</span>
            <span style={{ minWidth: 0, flex: 1, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {m.nom}
            </span>
            {m.monnaie && <span style={{ color: "var(--gold)", flexShrink: 0, fontSize: 11 }}>{m.monnaie}</span>}
            {m.ville && <span style={{ color: "var(--text-muted)", flexShrink: 0, fontSize: 11 }}>{m.ville}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * QUI LÂCHE CET OBJET.
 *
 * Le relevé des monstres nomme ce qu'ils lâchent ; personne ne pouvait lire la
 * relation dans l'autre sens. C'est pourtant le geste courant : on tient un nom
 * d'objet — dans une recette, dans une requête, dans un étal — et la question est
 * « où est-ce que ça tombe ».
 *
 * TROIS CHOSES PAR LIGNE, et pas une de plus : le nom, le niveau, ce qu'il faut lui
 * sortir. Pas de chance de butin (elle n'existe même pas dans le type `Monstre`), pas
 * de coordonnées. Rangés du plus bas niveau au plus haut : on veut le plus abordable.
 *
 * Rien ne s'affiche quand le relevé ne sait pas — pas d'encadré pour expliquer le
 * trou. Le butin ordinaire d'Airborn est calculé côté serveur et n'est pas dans les
 * fichiers ; le dire à chaque fiche serait répéter un constat d'ignorance 12 134 fois.
 *
 * PLAFONNÉ À HUIT, comme « Chez qui » juste dessous, et pour la même raison mesurée :
 * cinq objets du relevé sont lâchés par plus de huit monstres, et deux d'entre eux par
 * DEUX CENT SOIXANTE-CINQ. Sans plafond, la fiche du « Fragment de Cœur » sortait
 * 1 662 mots — quatre fois une fiche normale — sur une passe dont la consigne est
 * « compacter les informations ». Les huit montrés sont les huit PLUS BAS EN NIVEAU
 * (le tri est fait avant le plafond) : c'est la réponse à « le plus facile où je peux
 * l'avoir », et le compte complet reste écrit à droite du titre.
 */
function LachePar({ lacheurs, total }: { lacheurs: Lacheur[]; total: number }) {
  if (!lacheurs.length) return null;
  return (
    <div className="glass-card fx-card" style={carte}>
      <div style={titreBloc}>
        <Icon name="sword-cross" size={13} /> Lâché par
        <span style={{ marginLeft: "auto", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--text-muted)", ...NUM }}>
          {total > lacheurs.length ? `${lacheurs.length} sur ${total.toLocaleString("fr-FR")}` : total}
        </span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {lacheurs.map((m) => {
          const ic = iconeElement(m.elem);
          const seReleve = (m.vies ?? 0) > 1;
          return (
            <Link key={m.id} href={`/monstres/${m.id}`}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 9,
                border: `1px solid ${seReleve ? "color-mix(in srgb, var(--red) 32%, var(--border))" : "var(--border)"}`,
                background: "var(--bg-3)", textDecoration: "none", fontSize: 12.5, color: "var(--text)" }}>
              {ic && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ic} alt="" width={15} height={15} style={{ objectFit: "contain", flexShrink: 0 }} />
              )}
              <span style={{ minWidth: 0, flex: 1, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.nom}
              </span>
              {m.maison && <span style={{ fontSize: 10, color: "var(--purple)", fontWeight: 700, flexShrink: 0 }}>Airborn</span>}
              {m.niv != null && (
                <span style={{ color: tonRang(m.rang), flexShrink: 0, ...NUM }}>niv. {m.niv}</span>
              )}
              <span style={{ color: "var(--orange)", fontWeight: 700, flexShrink: 0, ...NUM }}>{court(m.pvEff)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * SITUER UNE PIÈCE DE FASHION — en une bulle, plus en paragraphe.
 *
 * Le chiffre n'interprète pas la pièce, il la situe : « 196 des 294 capes portent un
 * bonus » dit que sur une cape c'est la norme, là où « 54 des 707 coiffes » dit que
 * c'est l'exception. Le tableau des plafonds appartient aux mécaniques d'équipement,
 * pas ici : un lien, pas une copie.
 *
 * Un emplacement inconnu n'affiche RIEN plutôt qu'un compte inventé.
 */
function ModeSituee({ o }: { o: ObjetFiche }) {
  if (o.f !== "mode") return null;
  const nom = (o.t ?? "").replace(/\s*\(mode\)$/, "");
  const e = FASHION.emplacements.find((x) => x.nom === nom);
  if (!e) return null;
  return (
    <div style={{ marginTop: 11, paddingTop: 10, borderTop: "1px dashed var(--border)", fontSize: 12 }}>
      <Bulle quoi={<>Le plafond d’un bonus dépend de l’emplacement : le même bonus monte plus haut sur une cape que sur une coiffe. Le tableau complet est sur les mécaniques d’équipement.</>}>
        <b style={{ color: "var(--text)", ...NUM }}>{e.avecBonus}</b>
        <span style={{ color: "var(--text-muted)" }}>/{e.pieces} {nom.toLowerCase()}s à bonus</span>
      </Bulle>
      {" "}
      <Link href="/builder/mecaniques" style={{ color: "var(--orange)", textDecoration: "none", fontWeight: 600, borderBottom: "1px dotted currentColor" }}>
        les plafonds
      </Link>
    </div>
  );
}

export function Fiche({ o, voisins, bonus, lacheurs = [], lacheursTotal = 0, marchands = [], marchandsTotal = 0 }: {
  o: ObjetFiche;
  voisins: ObjetFiche[];
  /**
   * Les bonus lus par code du client. `null` quand le relevé par codes ne connaît
   * pas l'objet : on retombe alors sur le champ `b` du catalogue, qui couvre douze
   * objets de plus. Les codes passent devant parce qu'ils ne se décalent pas, là où
   * les libellés du relevé se sont décalés sur trois statistiques.
   */
  bonus?: Bonus[] | null;
  /** Les monstres qui le lâchent, les plus bas en niveau d'abord — plafonnés à huit. */
  lacheurs?: Lacheur[];
  /** Combien il y en a en tout, pour que « 8 sur 265 » ne se lise pas « 8 ». */
  lacheursTotal?: number;
  /** Les PNJ qui ont l'objet, lus dans leurs étals — plafonnés à huit. */
  marchands?: Marchand[];
  /** Combien il y en a en tout, pour que « 8 sur 61 » ne se lise pas « 8 ». */
  marchandsTotal?: number;
}) {
  useCardFx();
  /* Les lignes affichées : les codes d'abord, le relevé en repli. On n'affiche
     JAMAIS les deux — deux listes de bonus sur la même fiche se liraient comme deux
     jeux de bonus cumulés. */
  const lignes: { libelle: string; valeur: number; code?: string }[] =
    bonus?.length
      ? bonus.map((b) => ({ libelle: b.fr, valeur: b.v, code: b.code }))
      : (o.b ?? []).map(([libelle, valeur]) => ({ libelle, valeur }));
  const couleur = (o.g && COULEUR_GRADE[o.g]) || "var(--text)";
  const emb = emblemeClasse(o.cl);
  const classe = classeFr(o.cl);
  /* `null` pour tout ce qui n'est ni arme ni armure : la colonne du client y porte un
     bouchon, un nombre de penyas ou un identifiant de monstre (cf. `chiffreDeCombat`). */
  const combat = chiffreDeCombat(o);
  const emplacement = emplacementFr(o.em);
  // Le niveau de l'objet ne mérite un mot que s'il s'écarte du niveau requis :
  // sinon c'est un doublon qui embrouille.
  const niveauxDivergent = o.no != null && o.nr != null && Math.abs(o.no - o.nr) >= 5;

  return (
    <div style={{ display: "grid", gap: 14 }}>

      <Link href="/objets" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)", textDecoration: "none", width: "fit-content" }}>
        <Icon name="arrow-left" size={14} /> Chercher un autre objet
      </Link>

      {/* ── Carte d'identité ─────────────────────────────────────────── */}
      <div className="glass-card fx-card" style={{ padding: "18px 20px", display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap",
        borderColor: o.g ? `color-mix(in srgb, ${couleur} 40%, var(--border))` : undefined }}>
        <span style={{ padding: 8, borderRadius: 14, background: "var(--bg-3)", border: "1px solid var(--border)", display: "inline-flex" }}>
          <IconeObjet o={o} taille={64} />
        </span>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <h1 className="font-heading" style={{ fontSize: 23, fontWeight: 700, margin: 0, lineHeight: 1.2, color: couleur }}>{o.n}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 5, fontSize: 13, color: "var(--text-muted)", flexWrap: "wrap" }}>
            {o.t && <span>{o.t}</span>}
            {/* L'emplacement se pose tel quel, sans verbe : « se porte sur les
                munitions » n'a pas de sens, et une préposition par cas serait trois
                lignes de code pour une tournure que personne ne lit. */}
            {emplacement && <span>· {emplacement}</span>}
            {emb && classe && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={emb} alt="" width={18} height={18} style={{ objectFit: "contain" }} />{classe}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* Le grade Ultime porte le badge que le client dessine lui-même ; le grade
                Unique n'a pas d'image dans le dossier, il garde son mot — et c'est
                `Etiquette` de `jeu/Rarete.tsx` qui l'écrit, avec la teinte relevée sur
                le cadre `item_edgeunique`. La pastille maison faisait la même chose
                avec sa propre couleur : c'était la deuxième table de teintes de grade
                du site, et elles ont déjà divergé une fois. */}
            {o.g === "Ultime" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={BADGE_ULTIME} alt="Ultime" title="Grade Ultime" height={14} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
            )}
            {o.g === "Unique" && <Etiquette grade="unique" />}
            {o.af === 1 && <Marque texte="Ajout Airborn" couleur="var(--orange)" icon="sparkles" />}
            {o.ne === 1 && <Marque texte="Non échangeable" couleur="var(--red)" image={CADENAS} />}
            {o.li === 1 && <Marque texte="Lié au personnage" couleur="var(--red)" image={CADENAS} />}
            {o.li === 2 && <Marque texte="Lié à l’équipement" couleur="var(--gold)" image={CADENAS} />}
            {o.dl === 1 && <Marque texte="Durée de vie réelle" couleur="var(--gold)" icon="clock" />}
            {o.nou === 1 && <Marque texte="Nourriture" couleur="var(--green)" icon="leaf" />}
          </div>
        </div>
        {o.nr != null && (
          <div style={{ textAlign: "center", padding: "10px 16px", borderRadius: 12, background: "var(--bg-3)", border: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".7px", color: "var(--text-muted)" }}>Niveau requis</div>
            <div className="font-heading" style={{ fontSize: 27, fontWeight: 700, lineHeight: 1.1, color: "var(--gold)", ...NUM }}>{o.nr}</div>
            {o.nm != null && <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>jusqu’au niveau {o.nm}</div>}
          </div>
        )}
      </div>

      {o.d && (
        <div className="glass-card fx-card" style={{ ...carte, fontSize: 13.5, fontStyle: "italic", color: "var(--text-muted)", lineHeight: 1.55 }}>
          <Icon name="message" size={13} style={{ marginRight: 7, opacity: 0.6 }} />{o.d}
        </div>
      )}

      <div className="vg-fiche" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>

        {/* ── Ce que ça fait ──────────────────────────────────────────── */}
        <div style={{ display: "grid", gap: 14 }}>
          {/* `o.el` MANQUAIT DANS CETTE CONDITION, et ça se voyait sur les cartes de
              perçage : 204 objets ne portent QUE leur élément — la Carte Flamma, la
              Carte Fulgur, toute la série — et le bloc étant fermé, leur fiche
              n'affichait rien du tout. Compté sur le catalogue, pas supposé. */}
          {(combat || lignes.length || o.va || o.bm || o.ae || o.el) && (
            <div className="glass-card fx-card" style={carte}>
              <div style={titreBloc}><Icon name="zap" size={13} /> Ce que ça apporte</div>

              {combat ? (
                <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{combat.label}</span>
                  <b className="font-heading" style={{ marginLeft: "auto", fontSize: 20, color: "var(--text)", ...NUM }}>
                    {combat.min.toLocaleString("fr-FR")}
                    {combat.max && combat.max !== combat.min ? ` – ${combat.max.toLocaleString("fr-FR")}` : ""}
                  </b>
                </div>
              ) : null}

              {o.va ? <Vitesse v={o.va} /> : null}
              {o.bm ? <Ligne quoi="Bonus magique">+{o.bm}</Ligne> : null}
              {o.ae ? <Ligne quoi="Attaque élémentaire">+{o.ae}</Ligne> : null}
              {/* « Élément porté : FIRE » — c'était le code du client, affiché tel
                  quel sur 223 objets. Il est traduit, et le dessin du jeu vient
                  avec : le même élément a la même image ici, sur /monstres et sur
                  les donjons. Un code inconnu garderait son texte brut. */}
              {o.el ? (
                <Ligne quoi="Élément porté">
                  {(() => {
                    const e = elementPorte(o.el);
                    if (!e) return o.el;
                    return (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={e.image} alt="" width={16} height={16} style={{ objectFit: "contain" }} />
                        {e.label}
                      </span>
                    );
                  })()}
                </Ligne>
              ) : null}

              {lignes.length ? (
                <div style={{ marginTop: 12, paddingTop: 11, borderTop: "1px dashed var(--border)", display: "grid", gap: 5 }}>
                  {lignes.map((b, i) => <LigneBonus key={i} libelle={b.libelle} valeur={b.valeur} code={b.code} />)}
                </div>
              ) : null}

              <ModeSituee o={o} />
            </div>
          )}

          {o.re && (
            <div className="glass-card fx-card" style={carte}>
              <div style={titreBloc}><Icon name="shield" size={13} /> Résistances</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {/* LE DESSIN DU JEU REMPLACE LE MOT. « Feu 7 % » devient l'icône de feu
                    du client suivie du chiffre : cinq pastilles se lisent alors d'un
                    coup d'œil, et l'image est celle que le joueur a sous les yeux en
                    jeu. Le mot reste dans `alt` et `title` — c'est le seul texte
                    qu'un lecteur d'écran verra, et il doit dire lequel des cinq. */}
                {RESISTANCES.filter((x) => o.re?.[x.clef]).map((x) => (
                  <span key={x.clef} title={x.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
                    padding: "4px 11px 4px 7px", borderRadius: 20, color: x.couleur, ...NUM,
                    background: `color-mix(in srgb, ${x.couleur} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${x.couleur} 35%, transparent)` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={x.image} alt={x.label} width={16} height={16} style={{ objectFit: "contain", flexShrink: 0 }} />
                    {Math.round((o.re?.[x.clef] ?? 0) * 100)} %
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card fx-card" style={carte}>
            <div style={titreBloc}><Icon name="info" size={13} /> Bon à savoir</div>
            <div style={{ marginTop: -6 }}>
              {/* LA LIGNE « VENDU PAR UN PNJ » A ÉTÉ RETIRÉE D'ICI. Elle s'appuyait
                  sur le champ `pnj` du catalogue, et le rapprochement avec les étals
                  du client montre qu'il ne dit pas ça : 1 088 objets le portent, 60
                  seulement sont posés dans un étal, et 530 des 571 objets réellement
                  en vente ne le portent PAS. Le champ reste dans les données — on ne
                  touche pas au relevé — mais il ne prétend plus rien à l'écran. Le
                  bloc « Chez qui », lui, lit les étals eux-mêmes. */}
              {o.pi ? <Ligne quoi="Par pile">{o.pi.toLocaleString("fr-FR")}</Ligne> : null}
              {o.du ? <Ligne quoi="Durabilité">{o.du.toLocaleString("fr-FR")}</Ligne> : null}
              {o.sx ? <Ligne quoi="Réservé à">{o.sx === "male" ? "un garçon" : "une fille"}</Ligne> : null}
              {niveauxDivergent ? (
                <Ligne quoi={
                  <Invisible enJeu={`Le client porte DEUX niveaux : celui-ci (${o.no}), qui sert au raffinement, et le niveau requis (${o.nr}), le seul qui décide si tu peux l'équiper. Le wiki affiche le premier — d'où 3 437 niveaux faux là-bas.`}>
                    Niveau de l’objet
                  </Invisible>
                }>{o.no}</Ligne>
              ) : null}
              <Ligne quoi="Clé du client">
                <code style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{o.cle}</code>
              </Ligne>
            </div>
          </div>
        </div>

        {/* ── D'où ça vient, et quoi d'autre au même emplacement ─────────
            `OuTrouver` porte déjà son propre en-tête « Où le trouver » et son propre
            cadre : l'envelopper dans une carte titrée donnait deux bordures et deux
            titres qui disaient la même chose. On le pose nu — et il ne rend RIEN
            quand le client ne sait pas d'où l'objet vient. */}
        <div style={{ display: "grid", gap: 14 }}>
          {/* « Lâché par » AVANT « Où le trouver » : un monstre est la provenance la
              plus concrète — on y va tout de suite — là où un coffre ou une clé
              demandent d'abord de trouver le coffre ou la clé. */}
          <LachePar lacheurs={lacheurs} total={lacheursTotal || lacheurs.length} />
          <ChezQui marchands={marchands} total={marchandsTotal} objet={o.n} />
          <OuTrouver nom={o.n} />

          {voisins.length > 0 && (
            <div className="glass-card fx-card" style={carte}>
              <div style={titreBloc}><Icon name="swap" size={13} /> Au même emplacement</div>
              <div style={{ display: "grid", gap: 6 }}>
                {voisins.map((v) => {
                  const c = (v.g && COULEUR_GRADE[v.g]) || "var(--text)";
                  // Même garde qu'en haut de fiche : sans elle, la colonne de droite
                  // annonçait « 1 » sur six pièces de mode voisines.
                  const cv = chiffreDeCombat(v);
                  return (
                    <Link key={v.i} href={`/objets/${v.i}`} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 9,
                      border: "1px solid var(--border)", background: "var(--bg-3)", textDecoration: "none", fontSize: 12.5 }}>
                      <IconeObjet o={v} taille={26} />
                      <span style={{ minWidth: 0, flex: 1, color: c, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.n}</span>
                      {v.nr != null && <span style={{ color: "var(--text-muted)", ...NUM, flexShrink: 0 }}>niv. {v.nr}</span>}
                      {cv ? <b style={{ color: "var(--text)", ...NUM, flexShrink: 0 }}>{cv.min.toLocaleString("fr-FR")}</b> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sous 860 px les deux colonnes s'empilent : une feuille de stats sur deux
          colonnes de 300 px devient illisible sur un téléphone. */}
      <style>{`@media(max-width:860px){.vg-fiche{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}

/**
 * La vitesse d'attaque, rendue comparable.
 *
 * Le client donne un coefficient (0,025 à 0,085) qui ne dit rien tout seul : plus il
 * est haut, plus l'arme frappe vite, et il ne dépend QUE du type d'arme. D'où la
 * jauge : on situe l'arme entre la baguette et l'épée sans connaître l'échelle.
 *
 * UNE SEULE TEINTE, celle de la page. Le dégradé vert→or d'avant faisait croire que
 * la couleur portait un jugement ; c'est la LONGUEUR qui porte la grandeur.
 */
function Vitesse({ v }: { v: number }) {
  const part = Math.max(0.015, Math.min(1, (v - 0.025) / 0.06));
  return (
    <div style={{ padding: "8px 0 2px", borderTop: "1px solid color-mix(in srgb, var(--border) 55%, transparent)", marginTop: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, fontSize: 13 }}>
        <span style={{ color: "var(--text-muted)" }}>Vitesse d’attaque</span>
        <b style={{ marginLeft: "auto", ...NUM }}>{v.toLocaleString("fr-FR")}</b>
      </div>
      <div role="img" aria-label={`Vitesse ${v}, soit ${Math.round(part * 100)} % de l'échelle des armes`}
        style={{ height: 5, borderRadius: 3, background: "var(--bg-4)", marginTop: 6, overflow: "hidden" }}>
        <div style={{ width: `${part * 100}%`, height: "100%", borderRadius: 3, background: "var(--orange)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-muted)", marginTop: 3 }}>
        <span>lente (baguette)</span><span>rapide (épée)</span>
      </div>
    </div>
  );
}
