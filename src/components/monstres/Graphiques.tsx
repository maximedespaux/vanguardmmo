"use client";
import { Icon } from "@/components/Icon";
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
