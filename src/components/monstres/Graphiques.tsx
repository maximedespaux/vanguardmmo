"use client";
import { Icon, type IconName } from "@/components/Icon";
import { Bulle, Invisible } from "@/components/Bulle";
import {
  colonnesRes, court, ELEMENT_FR, ELEMENTS, entier, faceALaRegle, faiblesses, iconeElement,
  RES_ECHELLE, type ConseilElement,
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
 * │ « Ajoutés par Airborn » et « se relèvent »      │
 * │ étaient deux tuiles au milieu de six, de la     │
 * │ même taille et de la même forme que les quatre  │
 * │ constats qui les entouraient. Or ce sont les    │
 * │ DEUX SEULS tris de la page (règle : ce que le   │
 * │ serveur a ajouté passe devant le jeu de base),  │
 * │ et le fait qui les relie ne se lisait nulle     │
 * │ part : les monstres à plusieurs vies sont TOUS  │
 * │ du contenu Airborn. Une rangée de pastilles ne  │
 * │ peut pas dire « celui-là est DANS celui-là ».   │
 * │ Trois barres à la même échelle, si.             │
 * └────────────────────────────────────────────────┘
 *
 * L'EMBOÎTEMENT EST PORTÉ PAR LA GÉOMÉTRIE, pas par la couleur : les trois barres
 * partent du même bord gauche et la plus courte est visiblement contenue dans la
 * précédente. Chaque barre porte son nombre et son nom en texte à côté d'elle —
 * la teinte n'est que celle que la page emploie déjà pour ce mot (violet pour
 * Airborn, rouge pour ceux qui se relèvent, comme les branches de la recherche),
 * elle ne code aucune grandeur.
 *
 * `viesMaison` décide de la PHRASE : tant qu'il vaut exactement `vies`, on dessine
 * l'un dans l'autre et on le dit ; s'il tombe en dessous à la prochaine fouille,
 * la ligne devient « dont N du contenu Airborn » sans qu'on ait rien à réécrire.
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
        libelle="ajoutés par Airborn" action={surMaison} />
      <Bande part={part(vies)} valeur={vies} teinte="var(--red)" decale action={surVies}
        libelle="se relèvent"
        suite={tousMaison ? "tous du contenu Airborn" : `dont ${entier(viesMaison)} du contenu Airborn`}
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
 * │ CATALOGUE ENTIER (`meta.groupes`, calculés sur les 1 123      │
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
       1 123 monstres et les 37 adversaires des Chambres ont TOUS leur bloc `res` ;
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

/* ════════════════════════════════════════════════════════════════════════════
   QUEL ÉLÉMENT EMPORTER — LE RENSEIGNEMENT QUI N'ÉTAIT NULLE PART

   Le site savait dire, monstre par monstre, ce à quoi CELUI-LÀ est faible. Il
   n'a jamais dit la règle pratique, celle qu'on emporte dans son sac avant
   d'entrer : la plupart des monstres sont de terre, et c'est le vent qui les
   ouvre. Un joueur qui ne l'a pas lue ouvre 499 fiches ou emporte au hasard.

   ┌──── POURQUOI LA RÈGLE SORT TOUJOURS AVEC SON DÉMENTI ────┐
   │ Un pourcentage seul ferait plus de mal que de bien. La    │
   │ faiblesse dominante des monstres de terre est le vent,    │
   │ mais une partie d'entre eux ENCAISSE MIEUX le vent, et    │
   │ une autre ne bouge pas. Le compte des trois est donc      │
   │ affiché ensemble : c'est ce qui autorise à s'en servir.   │
   │ Et l'élément le plus ENCAISSÉ est nommé aussi — se        │
   │ tromper d'élément ne coûte pas « un peu », ça tape dans   │
   │ une résistance.                                           │
   └──────────────────────────────────────────────────────────┘

   Pas un nombre n'est écrit ici : tout vient de `regleElementaire`, qui compte
   les cinq colonnes du client. Le jour où une fouille renverse le classement,
   ces blocs changent de phrase tout seuls.
   ════════════════════════════════════════════════════════════════════════════ */

/** L'icône d'un élément, avec son mot en info-bulle. Les cinq dessins viennent du
 *  client et servent déjà partout ailleurs : même élément, même image. */
function Pastel({ e, taille = 16, anneau }: { e: string; taille?: number; anneau?: string }) {
  const src = iconeElement(e);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={ELEMENT_FR[e]} title={ELEMENT_FR[e]} width={taille} height={taille}
      style={{ objectFit: "contain", flexShrink: 0, verticalAlign: "-3px", borderRadius: 5, boxShadow: anneau ? `0 0 0 1.5px ${anneau}` : undefined }} />
  );
}

/** Un élément nommé, dessin plus mot — la forme courte réutilisée par les trois
 *  blocs. Le mot RESTE à côté du dessin : cinq icônes de 16 px ne se retiennent
 *  pas par cœur, et c'est le mot qu'on cherche dans son inventaire. */
function ElementDit({ e, taille = 16, anneau, gras = true }: { e: string; taille?: number; anneau?: string; gras?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0 }}>
      <Pastel e={e} taille={taille} anneau={anneau} />
      <span style={{ fontWeight: gras ? 700 : 400 }}>{ELEMENT_FR[e]}</span>
    </span>
  );
}

/** L'ÉLÉMENT AVEC SON ARTICLE : « le feu », « l'eau », « la terre ». Une table et
 *  non une règle — « terre » est féminin, deux des cinq commencent par une
 *  voyelle. Cinq entrées coûtent moins cher qu'une phrase fausse, et une phrase
 *  fausse dans un conseil de combat se lit comme un site qui ne sait pas. */
const AVEC_ARTICLE: Record<string, string> = {
  feu: "le feu", eau: "l'eau", electricite: "l'électricité", vent: "le vent", terre: "la terre",
};
const avecArticle = (e: string) => AVEC_ARTICLE[e] ?? ELEMENT_FR[e] ?? e;

/** La même table, contractée avec « à » : « faible AU vent », « faible À L'eau ».
 *  Séparée de la précédente parce que « à + le » se contracte et que « à + la »
 *  ne se contracte pas — une seule table produisait « faible à le vent ». */
const A_ARTICLE: Record<string, string> = {
  feu: "au feu", eau: "à l'eau", electricite: "à l'électricité", vent: "au vent", terre: "à la terre",
};
const aArticle = (e: string) => A_ARTICLE[e] ?? `à ${ELEMENT_FR[e] ?? e}`;
/** « le vent » → « Le vent », « l'eau » → « L'eau ». En début de phrase seulement. */
const capitale = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** La part en pourcent, arrondie au dixième. PAS à l'entier : 277 sur 499 vaut
 *  55,5 %, que l'entier arrondit à 56 — et le chiffre qui circule dans la guilde
 *  est 55. Un dixième coûte deux caractères et supprime la discussion. */
const pourCent = (n: number, sur: number) => (sur ? (n / sur) * 100 : 0);
const ditPourCent = (p: number) => `${p.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

/**
 * LA TABLE « CE QUE JE PRENDS CONTRE QUOI », sur tout le catalogue.
 *
 * Une ligne par élément de monstre, la plus peuplée en tête — l'ordre est celui
 * du poids, pas celui du jeu, parce que la première ligne est la réponse dans la
 * grande majorité des cas et doit se lire sans chercher.
 *
 * LA BARRE SUIT LA RÈGLE DE LA MAISON : une seule teinte, la longueur porte la
 * grandeur. Elle ne dit qu'une chose — quelle part du lot s'ouvre à l'élément
 * conseillé — et le reste est écrit en chiffres. Deux teintes auraient prétendu
 * opposer « bon » et « mauvais » à des yeux qui ne les distinguent pas.
 */
export function QuelElementEmporter({ regle }: {
  regle: { total: number; lots: ConseilElement[]; dominant: ConseilElement | null; indifferents: number };
}) {
  const { total, lots, dominant, indifferents } = regle;
  /* COMBIEN D'ÉLÉMENTS IL FAUT ADDITIONNER POUR NE PAS ENCORE ÉGALER LE DOMINANT.
     Compté, jamais « les deux suivants » écrit à la main : c'est exactement le
     genre de phrase qui devient fausse à la fouille suivante. On n'ajoute un lot
     que si la somme reste SOUS le dominant — sinon la phrase compterait celui qui
     fait basculer le total et affirmerait le contraire de ce qu'elle a mesuré. */
  const autres = lots.filter((l) => l.groupe !== "aucun" && l !== dominant);
  let cumul = 0;
  let combien = 0;
  for (const l of autres) {
    if (!dominant || cumul + l.n >= dominant.n) break;
    cumul += l.n;
    combien++;
  }
  const tousLesAutres = combien > 0 && combien === autres.length;

  return (
    <div className="glass-card" style={{ padding: "14px 16px", display: "grid", gap: 11 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
        <span className="font-heading" style={{ fontSize: 12.5, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--orange)" }}>
          Quel élément emporter
        </span>
        {dominant?.emporter && (
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            {entier(dominant.n)} des {entier(total)} monstres sont de <b style={{ color: "var(--text)" }}>{ELEMENT_FR[dominant.groupe].toLowerCase()}</b>
            {tousLesAutres
              ? ` — plus que les ${autres.length} autres éléments réunis`
              : combien > 1 ? ` — plus que les ${combien} éléments suivants réunis` : ""}
          </span>
        )}
      </div>

      {/* LA DEUXIÈME COLONNE PASSE SOUS LA PREMIÈRE EN ÉTROIT. Mesuré à 375 px :
          en deux colonnes, la gauche (élément + compte) se centre verticalement
          contre une droite de cinq lignes, et le couple « ce qu'on affronte / ce
          qu'on emporte » cesse de se lire comme un couple. Une media query et non
          un test sur la largeur en JS : le premier rendu serait faux le temps que
          l'effet se déclenche. Pas d'accent ni de commentaire dans cette CSS —
          un commentaire dans un litteral de gabarit part en 500 sans que tsc le
          voie. */}
      <style>{`.vg-elem-ligne{display:grid;grid-template-columns:minmax(104px,auto) minmax(0,1fr);gap:4px 12px;align-items:center}
@media(max-width:560px){.vg-elem-ligne{grid-template-columns:1fr;align-items:start;gap:6px}}`}</style>
      <div style={{ display: "grid", gap: 7 }}>
        {lots.map((l) => {
          const part = l.emporter ? pourCent(l.emporter.faible, l.n) : 0;
          return (
            <div key={l.groupe} className="vg-elem-ligne" style={{
              fontSize: 12.5,
              background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 11px",
            }}>
              {/* CE QU'ON AFFRONTE : l'élément du monstre, et combien il y en a. */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                {l.groupe === "aucun"
                  ? <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>Sans élément</span>
                  : <ElementDit e={l.groupe} />}
                <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{entier(l.n)}</span>
              </div>

              {/* CE QU'ON EMPORTE, ET CE QU'ON LAISSE. Le second n'est pas un
                  ornement : c'est l'erreur qui coûte, et elle ne se devine pas —
                  rien à l'écran ne disait qu'un élément pouvait être ENCAISSÉ par
                  la majorité d'un lot. */}
              <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                {l.emporter ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                    <Icon name="target" size={12} style={{ color: "var(--green)", flexShrink: 0 }} />
                    <ElementDit e={l.emporter.e} anneau="var(--green)" />
                    <Bulle largeur={280} quoi={
                      <span style={{ display: "grid", gap: 4 }}>
                        <span>Sur les <b>{entier(l.n)}</b> monstres {l.groupe === "aucun" ? "sans élément" : `de ${ELEMENT_FR[l.groupe].toLowerCase()}`}, face à {avecArticle(l.emporter.e)} :</span>
                        <span><b style={{ color: "var(--green)" }}>{entier(l.emporter.faible)}</b> prennent plus</span>
                        <span><b style={{ color: "var(--red)" }}>{entier(l.emporter.resiste)}</b> encaissent mieux</span>
                        <span><b>{entier(l.emporter.neutre)}</b> ne bougent pas</span>
                        <span style={{ color: "var(--text-muted)" }}>Compté dans les cinq colonnes du client, monstre par monstre.</span>
                      </span>
                    }>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>
                        {entier(l.emporter.faible)} sur {entier(l.n)}
                      </span>
                    </Bulle>
                    {/* LA BARRE : une teinte, la longueur porte la part. Plancher à
                        1,5 % pour qu'une part minuscule reste visible au lieu de
                        disparaître et de se lire comme « rien ». */}
                    <span aria-hidden="true" style={{ flex: "0 1 200px", minWidth: 60, maxWidth: 240, height: 7, background: "var(--bg-2)", borderRadius: 4, overflow: "hidden", display: "block" }}>
                      <span style={{ display: "block", width: `${Math.max(1.5, part)}%`, height: "100%", background: "var(--orange)", borderRadius: 4 }} />
                    </span>
                    <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", width: 52, textAlign: "right" }}>{ditPourCent(part)}</span>
                  </div>
                ) : (
                  <div style={{ color: "var(--text-muted)" }}>
                    Aucun élément ne leur fait plus de mal qu'un autre.
                  </div>
                )}

                {/* QUAND LE CONSEIL NE VAUT PAS LE GESTE, ON LE DIT. Sur les monstres
                    sans élément, la meilleure faiblesse n'ouvre qu'une petite partie du
                    lot pendant que la majorité ne réagit à RIEN : afficher la première
                    ligne seule ferait changer d'arme pour rien. Le test est un
                    comparatif de nombres, pas une liste d'exceptions écrite à la main —
                    il suit les données. */}
                {l.emporter && l.indifferents > l.emporter.faible && (
                  <div style={{ color: "var(--text-muted)" }}>
                    Mais <b style={{ color: "var(--text)" }}>{entier(l.indifferents)}</b> des {entier(l.n)} ne réagissent à aucun élément :
                    contre ceux-là, changer d&apos;arme ne change rien.
                  </div>
                )}

                {l.eviter && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", color: "var(--text-muted)", minWidth: 0 }}>
                    <Icon name="shield" size={12} style={{ color: "var(--red)", flexShrink: 0 }} />
                    <span>à laisser</span>
                    <ElementDit e={l.eviter.e} anneau="var(--red)" gras={false} />
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{entier(l.eviter.resiste)} l&apos;encaissent mieux</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* LE DÉMENTI, ET IL RESTE PARCE QU'IL CHANGE UN GESTE. Un joueur qui lit
          « le vent, sur les monstres de terre » et n'entend pas « sauf pour
          ceux-là » ouvre une fiche qui le contredit et croit le site cassé. */}
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.55 }}>
        <Invisible enJeu="Le jeu n'affiche aucune de ces colonnes : il montre l'élément du monstre, jamais ce qu'il encaisse. C'est pour ça que la règle circule de bouche à oreille et qu'elle circule fausse.">
          <span>La règle générale ne remplace jamais la fiche.</span>
        </Invisible>{" "}
        {dominant?.emporter && (
          <>
            Sur les {entier(dominant.n)} monstres de {ELEMENT_FR[dominant.groupe].toLowerCase()},{" "}
            <b style={{ color: "var(--text)" }}>{entier(dominant.emporter.resiste)}</b> encaissent mieux{" "}
            {avecArticle(dominant.emporter.e)} malgré tout, et{" "}
            <b style={{ color: "var(--text)" }}>{entier(dominant.emporter.neutre)}</b> n&apos;y sont ni faibles ni résistants.{" "}
          </>
        )}
        {entier(indifferents)} des {entier(total)} monstres du catalogue ne portent que des zéros : contre eux, l&apos;élément ne change rien.
        Chaque fiche montre ses cinq colonnes, et c&apos;est elle qui tranche.
      </div>
    </div>
  );
}

/**
 * LA RÈGLE, VUE DEPUIS UNE FICHE — trois cas, et le troisième est celui qui coûte.
 *
 * Posée sous les cinq colonnes du monstre, jamais à leur place : quand la fiche
 * contredit la règle générale, ce sont SES colonnes qui font foi, et elles sont
 * juste au-dessus. Le bloc dit alors la contradiction au lieu de la taire —
 * taire un désaccord entre deux écrans du même site est la façon la plus sûre de
 * faire emporter le mauvais élément.
 */
export function RegleSurLaFiche({ res, regle }: { res: Record<string, number>; regle: ConseilElement | null }) {
  if (!regle?.emporter) return null;
  const conseille = regle.emporter.e;
  const etat = faceALaRegle(res, conseille);
  const sien = faiblesses(res).faible;
  const nomLot = regle.groupe === "aucun" ? "sans élément" : `de ${ELEMENT_FR[regle.groupe].toLowerCase()}`;

  /* ┌──── « LES 176 AUTRES » EN COMPTAIT 175 ────┐
     Les colonnes de `conseilElement` comptent TOUT le lot, cette fiche comprise :
     un monstre neutre au vent est l'un des 176 neutres, pas un de plus. Écrire
     « comme aux 176 autres » l'ajoutait à son propre groupe. On retire donc la
     fiche affichée avant de dire « autres », et la clause disparaît quand il n'en
     reste aucun — « comme aux 0 autres » ne veut rien dire.
     └────────────────────────────────────────────┘ */
  const lesAutres = (n: number) => n - 1;

  /* Le ton et le pictogramme suivent le CAS, pas la couleur seule : chaque état a
     son mot écrit en toutes lettres juste à côté. */
  const cas = {
    suit: { ic: "target" as IconName, ton: "var(--green)" },
    neutre: { ic: "info" as IconName, ton: "var(--text-muted)" },
    resiste: { ic: "alert" as IconName, ton: "var(--red)" },
    sansRegle: { ic: "info" as IconName, ton: "var(--text-muted)" },
  }[etat];

  return (
    <div style={{
      marginTop: 9, background: "var(--bg-3)", border: "1px solid var(--border)",
      borderRadius: 9, padding: "9px 11px", fontSize: 12, lineHeight: 1.6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 4 }}>
        <Icon name={cas.ic} size={13} style={{ color: cas.ton, flexShrink: 0 }} />
        <span style={{ color: "var(--text-muted)" }}>Contre les {entier(regle.n)} monstres {nomLot}, on emporte</span>
        <ElementDit e={conseille} anneau="var(--green)" />
        <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
          ({entier(regle.emporter.faible)} sur {entier(regle.n)})
        </span>
      </div>

      {etat === "suit" && (
        <div>Celui-ci suit la règle : ses colonnes le donnent faible {aArticle(conseille)}.</div>
      )}

      {etat === "neutre" && (
        <div>
          <b style={{ color: "var(--text)" }}>Pas lui.</b>{" "}
          {capitale(avecArticle(conseille))} ne lui fait ni plus ni moins de mal
          {lesAutres(regle.emporter.neutre) > 1
            ? <> — comme aux {entier(lesAutres(regle.emporter.neutre))} autres de son élément.</>
            : lesAutres(regle.emporter.neutre) === 1
              ? <> — comme au seul autre de son élément.</>
              : <> — et il est le seul de son élément dans ce cas.</>}
          {sien.length > 0
            ? <> Ce qui l&apos;ouvre, ce sont ses colonnes ci-dessus : {sien.map((e) => ELEMENT_FR[e].toLowerCase()).join(", ")}.</>
            : <> Ses cinq colonnes sont à zéro : aucun élément ne l&apos;ouvre.</>}
        </div>
      )}

      {etat === "resiste" && (
        <div>
          <b style={{ color: "var(--red)" }}>Surtout pas lui.</b>{" "}
          Il <b>encaisse mieux</b> {avecArticle(conseille)}
          {lesAutres(regle.emporter.resiste) > 1
            ? <>, comme {entier(lesAutres(regle.emporter.resiste))} autres de son élément</>
            : lesAutres(regle.emporter.resiste) === 1
              ? <>, comme le seul autre de son élément dans ce cas</>
              : <>, et il est le seul de son élément dans ce cas</>}. La règle générale se trompe sur cette fiche —
          {sien.length > 0
            ? <> ce sont ses colonnes qui commandent : {sien.map((e) => ELEMENT_FR[e].toLowerCase()).join(", ")}.</>
            : <> et ses cinq colonnes ne désignent aucun remplaçant.</>}
        </div>
      )}

      {regle.eviter && regle.eviter.e !== conseille && (
        <div style={{ color: "var(--text-muted)", marginTop: 3 }}>
          Le piège de son élément : <ElementDit e={regle.eviter.e} taille={14} anneau="var(--red)" gras={false} />{" "}
          — {entier(regle.eviter.resiste)} des {entier(regle.n)} l&apos;encaissent mieux.
        </div>
      )}
    </div>
  );
}
