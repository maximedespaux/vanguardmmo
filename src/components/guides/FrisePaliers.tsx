"use client";
import { Icon, type IconName } from "@/components/Icon";
import { PRESTIGE_COSTS, prestigeNeed } from "@/data/prestige";
import { Barre, IconeRessource, DONJONS, court, fr, type Donjon } from "./Briques";

/**
 * LA FRISE DES PALIERS — un schéma à la place de deux développements.
 *
 * Ce qu'elle remplace, et pourquoi c'est le même objet :
 *  · sur /astuces, un accordéon de six paliers où chaque palier racontait en prose ce
 *    qui s'y débloque ;
 *  · sur /prestige, un tableau replié de dix lignes sur neuf colonnes de chiffres.
 * Les deux répondaient à la même question — QU'EST-CE QUE LE PALIER SUIVANT DEMANDE, ET
 * QU'EST-CE QU'IL OUVRE — et aucune des deux ne se lisait d'un coup d'œil.
 *
 * C'est exactement ce que le jeu ne montre pas : l'écran de personnage affiche le
 * prestige actuel, jamais ce que le suivant réclame, et jamais ce qu'il ouvrira. La
 * liste des ouvertures se lit dans les fiches d'instance du client.
 *
 * AUCUN CHIFFRE N'EST ÉCRIT ICI. Les ouvertures viennent du champ `prestige` de
 * src/data/dungeons.json, les points de vie demandés de son champ `hp`, les coûts de
 * PRESTIGE_COSTS. Un palier ajouté au jeu apparaît dans la frise sans qu'on y touche.
 */

/**
 * À quels paliers une instance s'ouvre.
 *
 * Une seule en ouvre DEUX, et c'est le champ `prestigeDetail` qui le dit plutôt qu'une
 * exception écrite à la main : la Ruine Prestigieuse porte « 3 (étage 1) · 6 (étage 2) ».
 * Le P6 n'ouvre donc rien de neuf en apparence, alors qu'il ouvre le second étage de la
 * seule source du badge le plus demandé — le renseignement le plus utile du palier, et
 * il se perdait dans une phrase.
 */
function ouvertures(d: Donjon): { palier: number; note?: string }[] {
  if (d.prestigeDetail) {
    const out: { palier: number; note?: string }[] = [];
    for (const m of d.prestigeDetail.matchAll(/(\d+)\s*\(([^)]+)\)/g)) out.push({ palier: +m[1], note: m[2] });
    if (out.length) return out;
  }
  return d.prestige != null ? [{ palier: d.prestige }] : [];
}

const A_PALIER = DONJONS.filter((d) => d.prestige != null);

const OUVRE = new Map<number, { d: Donjon; note?: string }[]>();
for (const d of A_PALIER) {
  for (const o of ouvertures(d)) {
    const l = OUVRE.get(o.palier) ?? [];
    l.push({ d, note: o.note });
    OUVRE.set(o.palier, l);
  }
}
// Le plus gros mur en tête : c'est lui qui commande la préparation du palier.
for (const l of OUVRE.values()) l.sort((a, b) => b.d.hp - a.d.hp);

/** L'échelle des barres : le mur le plus haut de toute la frise. */
export const MUR_MAX = Math.max(...A_PALIER.map((d) => d.hp));

/**
 * L'armure demandée, si elle est la même partout.
 *
 * Le guide l'écrivait à la main dans une phrase (« 150K en élément vent +20 »). Le
 * relevé le dit pour les douze instances à palier, et le Set le prouve : s'il en
 * contenait deux valeurs, ou une valeur vide, on n'affirmerait rien.
 */
const ARMURES = new Set(A_PALIER.map((d) => d.armor));
export const ARMURE_COMMUNE = ARMURES.size === 1 ? [...ARMURES][0] : null;

/** Le dernier palier du jeu : celui après lequel PRESTIGE_COSTS ne demande plus rien. */
const DERNIER = Math.max(...Object.keys(PRESTIGE_COSTS).map(Number)) + 1;

/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  CE QUE LA MONTÉE ENTIÈRE RÉCLAME — la référence qui transforme les coûts en BARRES.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Les pastilles de coût étaient des nombres nus, et un nombre nu ne répond pas à la
 * seule question qui se pose devant elles : EST-CE BEAUCOUP ? « 25 badges » au P9→P10
 * ressemble à « 15 badges » au P6→P7 ; ce sont en réalité un tiers de tous les badges du
 * jeu contre un cinquième. C'est exactement le point que le jeu ne montre nulle part —
 * l'écran de personnage donne le palier atteint, jamais le poids de celui d'après.
 *
 * Chaque pastille est donc REMPLIE à la part que ce saut représente dans le total de sa
 * propre ressource, du P1 au dernier palier. La pastille EST la barre : pas de nouvelle
 * série de barres à côté des points de vie, donc aucune ambiguïté de teinte — la règle
 * de la maison veut qu'une seule teinte porte une série, et que ce soit la LONGUEUR qui
 * porte la grandeur.
 *
 * La référence est FIXE (la montée entière) et non l'intervalle choisi : sur /prestige,
 * où le sélecteur bouge, des barres qui se rejaugeraient à chaque changement ne se
 * compareraient plus d'un écran à l'autre.
 *
 * Rien n'est écrit à la main : `prestigeNeed` additionne PRESTIGE_COSTS.
 */
const TOUT = prestigeNeed(1, DERNIER);

export function FrisePaliers({ avecInstances = false, de, a }: {
  /** Ajoute ce que chaque palier OUVRE. Le calculateur, lui, ne montre que les coûts. */
  avecInstances?: boolean;
  /** Bornes de la sélection à mettre en avant (le calculateur les pilote). */
  de?: number;
  a?: number;
}) {
  const paliers: number[] = [];
  for (let p = 1; p <= (avecInstances ? DERNIER : DERNIER - 1); p++) paliers.push(p);

  return (
    <div className="fr">
      {paliers.map((p) => {
        const ouvre = OUVRE.get(p) ?? [];
        const cout = PRESTIGE_COSTS[p];
        const actif = de != null && a != null && p >= de && p < a;
        return (
          <div key={p} className={`fr-l${actif ? " on" : ""}`}>
            <span className="fr-badge">P{p}</span>
            <div className="fr-c">
              {avecInstances && (
                ouvre.length > 0 ? (
                  <div className="fr-inst">
                    {ouvre.map(({ d, note }) => (
                      <a key={d.name + (note ?? "")} className="fr-i" href={`/donjons?instance=${encodeURIComponent(d.name)}`}>
                        <Icon name={d.icon as IconName} size={14} />
                        <span className="fr-in">{d.name}{note ? <i> · {note}</i> : null}</span>
                        <span className="fr-ib"><Barre part={d.hp / MUR_MAX} teinte="var(--gn-jauge)" hauteur={5} /></span>
                        <span className="fr-iv">{court(d.hp)}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  /* Un tiret plutôt que « Rien de neuf » écrit quatre fois : la ligne
                     du palier est vide, et c'est ça l'information. Le mot reste dans
                     le title, pour qui doute de ce que le tiret veut dire. */
                  <div className="fr-rien" title="Ce palier n'ouvre aucune instance">—</div>
                )
              )}
              {cout ? (
                <div className="fr-cout">
                  <span className="fr-fl">P{p + 1}</span>
                  {Object.entries(cout).map(([k, v]) => {
                    /* Le plancher à 1,5 % et le plafond à 100 sont ceux de la brique
                       `Barre` : sans plancher, un saut minuscule perd son remplissage, et
                       une pastille vide se lit comme une donnée manquante et non comme un
                       petit nombre. Le `title` porte le calcul en clair — c'est aussi le
                       seul texte de remplacement possible pour un remplissage qui n'est
                       qu'un fond. */
                    const part = TOUT[k] ? Math.max(1.5, Math.min(100, (v / TOUT[k]) * 100)) : 0;
                    return (
                      <span
                        key={k}
                        className="fr-chip"
                        style={{ ["--part" as string]: `${part}%` }}
                        title={TOUT[k]
                          ? `${k} : ${fr(v)} sur les ${fr(TOUT[k])} de toute la montée, soit ${Math.round((v / TOUT[k]) * 100)} %`
                          : `${k} : ${fr(v)}`}
                      >
                        <IconeRessource nom={k} taille={18} />
                        <b>{fr(v)}</b>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="fr-cout"><span className="fr-fl fin">Arrivée</span></div>
              )}
            </div>
          </div>
        );
      })}

      {/* ── POURQUOI CETTE CSS EST ÉCRITE COMME ÇA ── (sorti du littéral de gabarit :
          là-dedans, ces lignes partaient dans le `<style>` servi au navigateur, sur
          les deux pages qui emploient la frise)

          .fr-l — le badge du palier a une colonne à lui : les dix badges s'alignent,
          et la frise se lit verticalement comme une échelle.

          .fr-i — une ligne d'instance : icône, nom, barre, valeur. La barre prend la
          place qui reste ; le nom et la valeur sont à largeur fixe pour que tout
          s'aligne d'un palier à l'autre. Sous 560 px le nom et la barre ne tiennent
          plus sur une ligne : le nom prend toute la largeur, barre et valeur passent
          dessous.

          .fr-cout — le coût du palier suivant est fait de pastilles icône + nombre,
          pas d'une phrase.

          .fr-chip — LA PASTILLE EST LA BARRE. Son fond est un dégradé à arrêt net dont
          la coupure est `--part`, la part de ce saut dans le total de sa ressource (voir
          TOUT plus haut). Un dégradé de fond plutôt qu'un élément de plus : il n'ajoute
          aucun nœud à l'arbre, et surtout il ne fabrique pas une DEUXIÈME série de barres
          à côté de celles des points de vie — deux séries de barres orange dans la même
          ligne, l'une pour des PV et l'autre pour un coût, ne se distinguent plus.
          Les deux arrêts sont écrits en double (`0`, `--part`, `--part`, `100%`) : c'est
          la forme qui coupe franc dans tous les moteurs, un `0 var(--part)` sur une seule
          ligne n'étant pas lu partout. */}
      <style>{`
        .fr{display:grid;gap:7px}
        .fr-l{display:grid;grid-template-columns:44px minmax(0,1fr);gap:11px;align-items:start;
          background:var(--bg-3);border:1px solid var(--border);border-radius:11px;padding:9px 12px}
        .fr-l.on{border-color:var(--gn-accent);background:rgba(var(--gn-lueur-rgb),.07)}
        .fr-badge{display:flex;align-items:center;justify-content:center;height:26px;border-radius:7px;
          background:var(--bg-4);border:1px solid var(--gold);color:var(--gold);
          font-family:'Rubik',sans-serif;font-weight:700;font-size:12.5px}
        .fr-c{min-width:0;display:grid;gap:6px}
        .fr-inst{display:grid;gap:4px}
        .fr-i{display:grid;grid-template-columns:16px minmax(0,1fr) 88px 52px;align-items:center;gap:9px;
          text-decoration:none;color:var(--text);border-radius:7px;padding:2px 4px;margin:0 -4px}
        .fr-i:hover{background:rgba(var(--gn-lueur-rgb),.09)}
        .fr-i>svg{color:var(--gn-accent);flex-shrink:0}
        .fr-in{font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .fr-in i{font-style:normal;color:var(--text-muted);font-size:11.5px}
        .fr-ib{min-width:0}
        .fr-iv{font-size:11.5px;text-align:right;color:var(--gold);font-variant-numeric:tabular-nums;
          font-family:'Rubik',sans-serif}
        .fr-rien{font-size:11.5px;color:var(--text-muted)}
        .fr-cout{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .fr-fl{font-size:10.5px;text-transform:uppercase;letter-spacing:.7px;color:var(--gn-accent);
          font-family:'Rubik',sans-serif;font-weight:700}
        .fr-fl::before{content:"→ ";}
        .fr-fl.fin{color:var(--text-muted)}
        .fr-fl.fin::before{content:"";}
        .fr-chip{display:inline-flex;align-items:center;gap:5px;
          border:1px solid var(--border);border-radius:20px;padding:2px 9px 2px 6px;
          background:linear-gradient(90deg,
            rgba(var(--gn-lueur-rgb),.26) 0,
            rgba(var(--gn-lueur-rgb),.26) var(--part,0%),
            var(--bg-2) var(--part,0%), var(--bg-2) 100%)}
        .fr-chip b{font-size:11.5px;font-variant-numeric:tabular-nums;font-family:'Rubik',sans-serif;color:var(--text)}
        @media(max-width:560px){
          .fr-i{grid-template-columns:16px minmax(0,1fr) 52px;row-gap:2px}
          .fr-in{grid-column:2 / -1;white-space:normal}
          .fr-ib{grid-column:2}
        }
      `}</style>
    </div>
  );
}
