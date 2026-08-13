"use client";
import { Icon, type IconName } from "@/components/Icon";
import { Bulle, Invisible } from "@/components/Bulle";
import {
  colonnesRes, court, ELEMENT_FR, ELEMENTS, entier, faiblesses, iconeElement, RES_ECHELLE,
} from "./vocabulaire";

/**
 * LES DESSINS DE LA PAGE MONSTRES — ce qui remplace les paragraphes.
 *
 * Demande de Maxime : « enlever les descriptions et textes : les images parlent
 * beaucoup plus, et les graphiques, des schémas ». Chacun de ceux-là a remplacé
 * une phrase, et pas un fait n'est parti avec elle :
 *
 *   `SchemaVies`           ← « il repart à plein PV et son compteur descend… »
 *   `Resistances`          ← « il prend plus de dégâts au feu et résiste à l'eau… »
 *   `Faiblesses`           ← la colonne « Faible à » écrite en français
 *   `ProvenanceMonstres`   ← une rangée de six pastilles où deux étaient des filtres
 *   `ContenusBoss`         ← une rangée de quinze pastilles qui comptaient autre chose
 *                            que le tableau au-dessus d'elles
 *   `SchemaSeuils`         ← « sous 30 % PV : dégâts ×2 », ligne par ligne et sans
 *                            jamais dire que tout se déclenche à la fin du combat
 *
 * Aucune dépendance : des `div` et des variables CSS. C'est la LONGUEUR qui porte
 * la grandeur, jamais la couleur (le vert et le doré ne se distinguent pas pour un
 * daltonien protan), et chaque barre porte son nombre EN TEXTE à côté d'elle.
 */

/**
 * D'OÙ VIENT CE CATALOGUE — le schéma d'emboîtement, et les deux filtres qui vont
 * avec.
 *
 * ┌──────── CE QU'IL REMPLACE, ET POURQUOI ────────┐
 * │ « Ajoutés par AirFlyff » et « se relèvent »     │
 * │ étaient deux tuiles au milieu de six, de la     │
 * │ même taille et de la même forme que les quatre  │
 * │ constats qui les entouraient. Or ce sont les    │
 * │ DEUX SEULS tris de la page (règle : ce que le   │
 * │ serveur a ajouté passe devant le jeu de base),  │
 * │ et le fait qui les relie ne se lisait nulle     │
 * │ part : les monstres à plusieurs vies sont TOUS  │
 * │ du contenu AirFlyff. Une rangée de pastilles ne │
 * │ peut pas dire « celui-là est DANS celui-là ».   │
 * │ Trois barres à la même échelle, si.             │
 * └────────────────────────────────────────────────┘
 *
 * L'EMBOÎTEMENT EST PORTÉ PAR LA GÉOMÉTRIE, pas par la couleur : les trois barres
 * partent du même bord gauche et la plus courte est visiblement contenue dans la
 * précédente. Chaque barre porte son nombre et son nom en texte à côté d'elle —
 * la teinte n'est que celle que la page emploie déjà pour ce mot (violet pour
 * AirFlyff, rouge pour ceux qui se relèvent, comme les branches de la recherche),
 * elle ne code aucune grandeur.
 *
 * `viesMaison` décide de la PHRASE : tant qu'il vaut exactement `vies`, on dessine
 * l'un dans l'autre et on le dit ; s'il tombe en dessous à la prochaine fouille,
 * la ligne devient « dont N du contenu AirFlyff » sans qu'on ait rien à réécrire.
 */
export function ProvenanceMonstres({ total, maison, vies, viesMaison, surMaison, surVies }: {
  total: number; maison: number; vies: number; viesMaison: number;
  surMaison: () => void; surVies: () => void;
}) {
  const tousMaison = vies > 0 && viesMaison === vies;
  /* Le dénominateur est gardé : un catalogue vide donnerait `NaN %` de largeur, et une
     largeur invalide se dessine comme une barre absente — donc comme une donnée
     manquante alors que c'est le catalogue qui manque. */
  const part = (n: number) => (total > 0 ? n / total : 0);
  return (
    <div className="glass-card" style={{ padding: "14px 16px", display: "grid", gap: 12 }}>
      <Bande part={1} valeur={total} teinte="var(--orange)" libelle="monstres dans le client" />
      <Bande part={part(maison)} valeur={maison} teinte="var(--purple)"
        libelle="ajoutés par AirFlyff" action={surMaison} />
      <Bande part={part(vies)} valeur={vies} teinte="var(--red)" decale action={surVies}
        libelle="se relèvent"
        suite={tousMaison ? "tous du contenu AirFlyff" : `dont ${entier(viesMaison)} du contenu AirFlyff`}
        detail={tousMaison
          ? "Plusieurs barres de vie = contenu ajouté par le serveur. La règle se vérifie ligne à ligne dans le relevé : aucun monstre du jeu d'origine ne se relève, et la marque du serveur est écrite dans leur identifiant."
          : "Le relevé compte ici des monstres à plusieurs vies qui ne portent pas la marque du serveur : la règle ne tient plus, ce chiffre le dit."} />
    </div>
  );
}

/**
 * Une bande du schéma d'emboîtement. Cliquable, elle pose son filtre dans la
 * recherche — et le pointillé sous le libellé est le seul signal qui l'annonce,
 * exactement comme sur les tuiles qu'elle remplace.
 *
 * `suite` EST HORS DU BOUTON, et ce n'est pas un détail de mise en page : une
 * `Bulle` est un `<button>`, et un bouton dans un bouton est du HTML invalide — le
 * clic partirait sur le filtre au lieu d'ouvrir la bulle. Le filtre et son
 * commentaire sont donc deux ancres voisines, jamais imbriquées. C'est le même
 * arbitrage que `Faiblesses` avec sa prop `bulle`.
 */
function Bande({ part, valeur, libelle, teinte, action, decale, suite, detail }: {
  part: number; valeur: number; libelle: string; teinte: string;
  action?: () => void; decale?: boolean; suite?: string; detail?: string;
}) {
  const tete = (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
      <span className="font-heading" style={{ fontSize: 19, fontWeight: 700, color: teinte, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {entier(valeur)}
      </span>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{libelle}</span>
      {action && <Icon name="search" size={12} style={{ color: "var(--orange)", opacity: .8, alignSelf: "center" }} />}
    </span>
  );
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 4, flexWrap: "wrap" }}>
        {action ? (
          <button onClick={action} aria-label={`Chercher : ${libelle}`}
            style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", borderBottom: "1px dotted var(--orange)" }}>
            {tete}
          </button>
        ) : tete}
        {suite && (
          detail
            ? <Bulle quoi={detail}><span style={{ fontSize: 12, color: teinte }}>{suite}</span></Bulle>
            : <span style={{ fontSize: 12, color: teinte }}>{suite}</span>
        )}
      </div>
      {/* Le rail fait toute la largeur pour les trois bandes : sans lui, une bande à
          8 % ne se compare à rien et on perd l'emboîtement, qui est tout le propos.
          `aria-hidden` parce que les trois nombres sont écrits juste au-dessus. */}
      <span aria-hidden="true" style={{ display: "block", height: 11, borderRadius: 3, background: "color-mix(in srgb, var(--border) 55%, transparent)", marginLeft: decale ? 16 : 0 }}>
        <span style={{ display: "block", height: "100%", borderRadius: 3, background: `color-mix(in srgb, ${teinte} 62%, transparent)`, border: `1px solid ${teinte}`, boxSizing: "border-box", width: `${Math.max(1.5, part * 100)}%` }} />
      </span>
    </div>
  );
}

/**
 * DE QUEL CONTENU VIENNENT LES LIGNES DU TABLEAU — compté SUR CES LIGNES.
 *
 * ┌──────── LE DÉFAUT QU'IL CORRIGE, ET IL ÉTAIT CHIFFRÉ ────────┐
 * │ La rangée de pastilles qui vivait ici portait les comptes du  │
 * │ CATALOGUE ENTIER (`meta.groupes`, calculés sur les 1 124      │
 * │ monstres) et elle était posée sous un tableau qui n'en montre │
 * │ que 94 : on lisait « Chambres Secrètes 16 » sous sept lignes  │
 * │ de Chambres Secrètes, « Halloween 21 » sous dix. Deux         │
 * │ comptages voisins de trois centimètres, et rien ne disait     │
 * │ qu'ils ne comptaient pas la même chose. Le compte est         │
 * │ maintenant fait sur les lignes MONTRÉES : la somme des barres │
 * │ est le nombre de lignes du tableau, par construction.         │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Une seule teinte, celle que le tableau emploie déjà pour sa colonne de tri :
 * c'est la LONGUEUR qui porte la grandeur. Le nom et le nombre sont écrits, la
 * barre ne fait que rendre le rapport lisible d'un coup d'œil.
 */
export function ContenusBoss({ lignes }: { lignes: { groupe?: string }[] }) {
  /* « hors contenu reconstitué » et non « inconnu » : la fouille n'a pas échoué,
     ces monstres n'appartiennent à aucun des donjons et events qu'elle sait
     reconstituer. C'est un renseignement, pas un trou. */
  const HORS = "hors contenu reconstitué";
  const par = new Map<string, number>();
  for (const l of lignes) {
    const k = l.groupe || HORS;
    par.set(k, (par.get(k) ?? 0) + 1);
  }
  const rangs = [...par].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  const max = Math.max(1, ...rangs.map(([, n]) => n));
  return (
    <div style={{ display: "grid", gap: 5 }}>
      {rangs.map(([nom, n]) => (
        <div key={nom} style={{ display: "grid", gridTemplateColumns: "minmax(96px,1.1fr) minmax(0,2fr) 30px", gap: 9, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: nom === HORS ? "var(--text-muted)" : "var(--text)", minWidth: 0 }}>{nom}</span>
          {/* `aria-hidden` : le nombre est écrit dans la colonne suivante. */}
          <span aria-hidden="true" style={{ display: "block", height: 8, borderRadius: 2, background: "color-mix(in srgb, var(--border) 55%, transparent)" }}>
            <span style={{ display: "block", height: "100%", borderRadius: 2, background: "var(--orange)", width: `${Math.max(1.5, (n / max) * 100)}%` }} />
          </span>
          <b className="font-heading" style={{ fontSize: 12.5, textAlign: "right", color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>{n}</b>
        </div>
      ))}
    </div>
  );
}

/**
 * LE SCHÉMA DES VIES — le champion de « on ne le devine pas en jouant ».
 *
 * La barre de vie du jeu annonce les PV d'UNE vie. Azharyon affiche 2 milliards et
 * il en faut 30. Aucun joueur ne peut le savoir en combat : il voit seulement le
 * boss remonter à plein, et croit à un bug.
 *
 * Le dessin dit la chose en une image : le bloc du haut est ce que la barre montre,
 * la rangée du bas est le combat réel. Les deux sont à la MÊME échelle — c'est tout
 * l'intérêt, et c'est pour ça que le bloc du haut ne fait qu'un `vies`-ième de la
 * largeur au lieu d'être plein.
 */
export function SchemaVies({ pv, vies, pvEff, taille = "normale" }: {
  pv: number; vies: number; pvEff: number; taille?: "normale" | "petite";
}) {
  const h = taille === "petite" ? 9 : 13;
  const etiquette: React.CSSProperties = {
    fontSize: taille === "petite" ? 10 : 11, textTransform: "uppercase",
    letterSpacing: ".6px", color: "var(--text-muted)",
  };
  const valeur: React.CSSProperties = {
    fontVariantNumeric: "tabular-nums", fontWeight: 700,
    fontSize: taille === "petite" ? 12 : 14,
  };
  return (
    <div style={{ display: "grid", gap: taille === "petite" ? 7 : 10 }}>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
          <span style={etiquette}>Ce que la barre annonce</span>
          <span className="font-heading" style={{ ...valeur, color: "var(--text-muted)" }}>{court(pv)}</span>
        </div>
        <div style={{ display: "flex", gap: 2, height: h }}>
          <span style={{ width: `${100 / vies}%`, background: "color-mix(in srgb, var(--orange) 32%, transparent)", border: "1px solid color-mix(in srgb, var(--orange) 55%, transparent)", borderRadius: 3 }} />
        </div>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
          <span style={etiquette}>Ce qu&apos;il faut sortir</span>
          {/* La pastille est POSÉE SUR LE CHIFFRE, pas dans un encadré en tête de
              page : c'est ici qu'un joueur lit le nombre et c'est ici qu'il doit
              apprendre que le jeu ne le lui montrera jamais. */}
          <Invisible enJeu={`La barre de vie n'affiche que ${court(pv)}, les PV d'une seule vie. À zéro il repart à plein tant qu'il lui en reste : ${vies} barres à vider.`}>
            <span className="font-heading" style={{ ...valeur, color: "var(--red)" }}>{court(pvEff)}</span>
          </Invisible>
          <span style={{ ...etiquette, marginLeft: "auto" }}>{vies} vies</span>
        </div>
        <div style={{ display: "flex", gap: 2, height: h }} aria-hidden="true">
          {Array.from({ length: vies }, (_, i) => (
            <span key={i} style={{ flex: 1, background: "color-mix(in srgb, var(--red) 40%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 62%, transparent)", borderRadius: 3 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * QUAND ÇA SE DÉCLENCHE — les seuils de PV, dessinés sur la durée du combat.
 *
 * ┌──────── CE QU'IL REMPLACE, ET CE QU'IL AJOUTE ────────┐
 * │ « sous 30 % PV → dégâts ×2 », « sous 10 % PV → il rend │
 * │ 20 % de sa vie », « il fuit sous 10 % de PV » : trois   │
 * │ lignes sous trois titres, chacune répétant les mots     │
 * │ « sous » et « PV ». Le fait qu'AUCUNE ne se lisait      │
 * │ nulle part est celui qui décide du combat : presque      │
 * │ tout se déclenche à la FIN. Recompté sur les données —   │
 * │ les seuils du client ne prennent que huit valeurs, de 2  │
 * │ à 50 %, et 353 des 426 lignes à seuil (cinq sur six)     │
 * │ sont à 20 % de vie restante ou moins. Le dernier quart   │
 * │ n'est pas un absolu : 70 lignes sont à 30 % et une à     │
 * │ 50 %, et le dessin les met où elles sont.                │
 * │ Une barre par événement, remplie de ce qu'on a déjà     │
 * │ enlevé quand il part : les barres les plus longues sont │
 * │ les surprises de la fin, et elles se voient sans lire.  │
 * └──────────────────────────────────────────────────────┘
 *
 * La teinte est celle que la fiche donne DÉJÀ à la mécanique (rouge la rage, vert
 * le soin, doré les renforts, bleu la fuite) : elle nomme, elle ne mesure pas —
 * c'est la longueur qui mesure. Chaque ligne porte son pourcentage en clair.
 */
export type EvenementSeuil = {
  /** Le seuil, en pourcentage de PV restants. 100 = dès l'engagement. */
  pv: number;
  icon: IconName;
  ton: string;
  /** L'effet, en trois mots. Du JSX : un nombre en valeur, une icône. */
  quoi: React.ReactNode;
  /** Le conseil de jeu qu'on ne devine pas — posé sur l'effet, en bulle. À mettre sur
   *  CHAQUE ligne de la mécanique : c'est ce schéma qui ne le garde que sur la
   *  première ligne DESSINÉE, une fois le tri fait. L'appelant ne peut pas savoir
   *  laquelle ce sera — il lit un fichier dont l'ordre n'est pas celui du combat. */
  astuce?: string;
};

export function SchemaSeuils({ seuils }: { seuils: EvenementSeuil[] }) {
  if (seuils.length === 0) return null;
  /* Dans l'ORDRE DU COMBAT, pas dans celui du fichier : le client écrit les lignes
     de rage d'un Junglosaure en 20, 10, 30, 30, 2, 30, 20 — illisible tel quel,
     alors que la fiche doit répondre à « qu'est-ce qui m'attend, et dans quel
     ordre ».
     ET LE CONSEIL SUIT LE TRI. Une astuce accrochée par l'appelant à sa première
     ligne de fichier se retrouvait au milieu du dessin : le conseil du tank tombait
     sur la cinquième ligne du Junglosaure, sous les yeux de personne. On le garde
     donc sur la première ligne DESSINÉE qui le porte, et on l'enlève des suivantes —
     répété à chaque seuil, il devient du bruit. */
  const dejaDit = new Set<string>();
  const rangs = [...seuils]
    .sort((a, b) => b.pv - a.pv)
    .map((s) => {
      if (!s.astuce) return s;
      if (dejaDit.has(s.astuce)) return { ...s, astuce: undefined };
      dejaDit.add(s.astuce);
      return s;
    });
  /* Les quatre colonnes sont reprises à l'identique par la ligne d'axe : c'est ce
     qui garantit que les deux bouts de l'échelle tombent bien aux deux bouts des
     barres, et non quelque part au-dessus des icônes. */
  const rail: React.CSSProperties = { flex: "1 1 90px", minWidth: 56 };
  const nombre: React.CSSProperties = { width: 42, textAlign: "right", flexShrink: 0 };
  const effet: React.CSSProperties = { flex: "1 1 160px", minWidth: 0 };
  return (
    <div style={{ display: "grid", gap: 5 }}>
      {/* LES DEUX BOUTS DE L'AXE SONT DES NOMBRES, PAS DES MOTS — et c'est un défaut
          payé à l'écran : « engagement » et « mort » se touchaient sur un téléphone
          (le rail ne fait plus que 90 px à 375 px de large) et se lisaient
          « ENGAGEMENTMORT ». « 100 % » et « 0 » tiennent toujours, disent la même
          chose — c'est la barre de vie, pleine à gauche, vide à droite — et emploient
          la même unité que la colonne des seuils juste à côté. La phrase complète est
          dans l'infobulle. */}
      <div title="La barre de vie, de l'engagement (100 % de ses PV) à sa mort (0)"
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, letterSpacing: ".4px", color: "var(--text-muted)" }}>
        <span style={{ width: 13, flexShrink: 0 }} />
        <span style={{ ...rail, display: "flex", justifyContent: "space-between", fontVariantNumeric: "tabular-nums" }}>
          <span>100 %</span><span>0</span>
        </span>
        <span style={{ ...nombre, textTransform: "uppercase" }}>seuil</span>
        <span style={effet} />
      </div>
      {/* SOUS 560 PX, L'EFFET PASSE À LA LIGNE ENTIÈRE. Sinon il lui reste 128 px et
          « dégâts ×2 · jusqu'à 3 708 par coup » se casse en quatre lignes à côté
          d'une barre de 72 px. Mesuré sur un téléphone de 375 px, où la carte du
          volet n'offre que 279 px utiles.
          La feuille de style est en ASCII pur : un accent dans un commentaire CSS à
          l'intérieur d'un littéral de gabarit ferme le littéral et met la page en
          500 — piège de la maison, et tsc ne le voit pas. */}
      <style>{`@media(max-width:560px){.vg-seuil{flex-wrap:wrap}.vg-seuil-effet{flex:1 1 100% !important;padding-left:21px}}`}</style>
      {rangs.map((s, i) => (
        <div key={i} className="vg-seuil" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name={s.icon} size={13} style={{ color: s.ton, flexShrink: 0 }} />
          {/* La barre porte ce qui est DÉJÀ ENLEVÉ quand l'événement part : un seuil
              à 30 % de PV restants, c'est 70 % du combat derrière soi. Plancher à
              1,5 % pour que « dès l'engagement » garde un trait au lieu de
              ressembler à une donnée manquante. */}
          <span aria-hidden="true" style={{ ...rail, display: "block", height: 8, borderRadius: 2, background: "color-mix(in srgb, var(--border) 55%, transparent)" }}>
            <span style={{ display: "block", height: "100%", borderRadius: 2, background: s.ton, width: `${Math.max(1.5, 100 - s.pv)}%` }} />
          </span>
          <b className="font-heading" style={{ ...nombre, fontSize: 12, color: s.ton, fontVariantNumeric: "tabular-nums" }}>
            {s.pv >= 100 ? "100 %" : `${s.pv} %`}
          </b>
          <span className="vg-seuil-effet" style={{ ...effet, fontSize: 12.5 }}>
            {s.astuce ? <Bulle quoi={s.astuce}>{s.quoi}</Bulle> : s.quoi}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * LES CINQ COLONNES DE RÉSISTANCE, en graphique.
 *
 * On les LIT, on ne les déduit jamais de la roue élémentaire : des monstres
 * résistent à trois éléments à la fois, et des boss sont faibles à leur propre
 * élément. Le sens est porté par le CÔTÉ de l'axe (à gauche : il prend plus) et
 * par le signe du nombre — deux encodages qui ne dépendent pas de la couleur.
 */
export function Resistances({ res }: { res: Record<string, number> }) {
  const lignes = colonnesRes(res);
  const rien = lignes.every((l) => l.v === 0);
  return (
    <div style={{ display: "grid", gap: 5 }}>
      <div style={{ display: "flex", fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".6px" }}>
        <span style={{ flex: 1 }}>← il prend plus</span>
        <span>il encaisse mieux →</span>
      </div>
      {lignes.map(({ e, v }) => {
        const part = Math.min(1, Math.abs(v) / RES_ECHELLE);
        const ton = v < 0 ? "var(--green)" : "var(--red)";
        return (
          <div key={e} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconeElement(e)!} alt={ELEMENT_FR[e]} title={ELEMENT_FR[e]} width={16} height={16} style={{ objectFit: "contain", flexShrink: 0 }} />
            <span style={{ flex: 1, display: "flex", height: 10, minWidth: 0 }} aria-hidden="true">
              <span style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                {v < 0 && <span style={{ width: `${Math.max(1.5, part * 100)}%`, background: ton, borderRadius: "3px 0 0 3px" }} />}
              </span>
              <span style={{ width: 1, background: "var(--border)" }} />
              <span style={{ flex: 1 }}>
                {v > 0 && <span style={{ display: "block", width: `${Math.max(1.5, part * 100)}%`, height: "100%", background: ton, borderRadius: "0 3px 3px 0" }} />}
              </span>
            </span>
            <span style={{ width: 52, textAlign: "right", fontSize: 11.5, fontVariantNumeric: "tabular-nums", color: v === 0 ? "var(--text-muted)" : ton, fontWeight: v === 0 ? 400 : 700 }}>
              {v === 0 ? "0" : `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`}
            </span>
          </div>
        );
      })}
      {rien && (
        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Tous les éléments lui font le même mal.</div>
      )}
    </div>
  );
}

/**
 * LES FAIBLESSES EN ICÔNES — pour une cellule de tableau ou une vignette.
 *
 * Remplace la colonne « Faible à » qui écrivait « Eau, Vent » en français : deux
 * icônes du jeu se reconnaissent d'un coup d'œil et tiennent dans 40 px, là où les
 * mots demandaient une colonne large sur 94 lignes.
 */
export function Faiblesses({ res, bulle = true }: {
  res: Record<string, number>;
  /** `false` DANS UN LIEN. Une bulle est un `<button>`, et un bouton dans une
   *  ancre est du HTML invalide : le clic partirait sur la fiche au lieu d'ouvrir
   *  la bulle. Les vignettes de résultat s'en servent sans bulle, les tableaux
   *  avec. */
  bulle?: boolean;
}) {
  const { faible, resiste } = faiblesses(res);
  if (faible.length === 0 && resiste.length === 0) {
    /* PAS UN TIRET. Un « — » se lit « on n'a pas le relevé », et c'est faux : le
       relevé est là, il ne porte que des zéros. Vérifié sur les deux tables — les
       1 124 monstres et les 37 adversaires des Chambres ont TOUS leur bloc `res` ;
       le cas « aucune ligne » n'existe pas. Ce qu'il faut dire est donc l'inverse
       d'une absence : l'élément qu'on emporte ne change rien contre celui-là, ce
       qui est un renseignement, et un renseignement qui change un geste.
       C'est aussi le mot que la colonne des Chambres écrivait avant de passer à
       cette brique — 10 de ses 37 lignes l'ont perdu en chemin. */
    return (
      <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}
        title="Aucune faiblesse ni résistance : l'élément n'y change rien.">indifférent</span>
    );
  }
  const rangee = (es: string[], bord: string, quoi: string) => (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {es.map((e) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={e} src={iconeElement(e)!} alt={`${quoi} ${ELEMENT_FR[e]}`} title={`${quoi} ${ELEMENT_FR[e]}`} width={17} height={17}
          style={{ objectFit: "contain", borderRadius: 5, boxShadow: `0 0 0 1.5px ${bord}` }} />
      ))}
    </span>
  );
  const icones = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {faible.length > 0 && rangee(faible, "var(--green)", "faible")}
      {resiste.length > 0 && rangee(resiste, "var(--red)", "résiste")}
    </span>
  );
  if (!bulle) return icones;
  return (
    <Bulle quoi={
      <span style={{ display: "grid", gap: 6 }}>
        {ELEMENTS.map((e) => {
          const v = res?.[e] ?? 0;
          return (
            <span key={e} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={iconeElement(e)!} alt="" width={14} height={14} style={{ objectFit: "contain" }} />
              <span style={{ flex: 1 }}>{ELEMENT_FR[e]}</span>
              <b style={{ color: v < 0 ? "var(--green)" : v > 0 ? "var(--red)" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                {v > 0 ? "+" : ""}{v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
              </b>
            </span>
          );
        })}
        <span style={{ color: "var(--text-muted)" }}>Négatif : il prend plus.</span>
      </span>
    }>{icones}</Bulle>
  );
}
