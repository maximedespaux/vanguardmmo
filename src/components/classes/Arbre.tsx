"use client";
import { LIGNEES } from "@/app/(public)/classes/donnees";
import { NB_NOMS_DE_CLASSE, PALIERS } from "./vue";

/** Combien de compétences porte un nom de classe, d'après le relevé. `null` tant
 *  qu'il n'est pas arrivé : la case retombe alors sur l'instantané. Le type est
 *  redéclaré ici plutôt qu'importé d'`Echelles`, qui importe ce fichier. */
type CompteClasse = (nomClasse: string) => number | null;

/**
 * L'ARBRE DES PROMOTIONS, EN SVG.
 *
 * Il y avait ici une grille CSS de cinq colonnes et un paragraphe pour l'expliquer.
 * La grille rangeait bien les cases, mais elle ne DESSINAIT pas le branchement : rien
 * ne reliait le Mercenaire aux deux lignées qui en sortent, il fallait déduire le lien
 * de la position des cases. Un trait le dit sans phrase.
 *
 * ┌──────────── CE QUE LE SCHÉMA DOIT FAIRE VOIR ────────────┐
 * │ 1. LE BRANCHEMENT : un départ, quatre troncs, huit fins.  │
 * │ 2. QUE MAÎTRE ET HÉROS NE SONT PAS DES CLASSES. C'est le  │
 * │    contresens que le site a longtemps porté (« trente-sept│
 * │    classes ») : le client écrit que Chevalier Maître a     │
 * │    pour promuDe Chevalier. Ici, les deux emblèmes de       │
 * │    promotion sont DANS la case du Métier 2, derrière un    │
 * │    filet — ce sont des étages du même nom, pas des voisins.│
 * │    D'où 21 noms de classe et non 37.                      │
 * └──────────────────────────────────────────────────────────┘
 *
 * Aucune dépendance : du SVG en ligne, des variables CSS pour les teintes, et un
 * `viewBox` qui laisse le dessin se mettre à l'échelle du panneau. Le cadre défile
 * horizontalement plutôt que de se replier — replié en colonne, un arbre ne montre
 * plus le branchement, qui est la seule chose qu'on vient y chercher.
 *
 * Chaque ligne est un bouton : le rôle et le `tabIndex` sont posés à la main parce
 * qu'un `<g>` n'est rien pour le clavier tant qu'on ne le lui dit pas.
 */

const ROW = 46;
const HAUT = 30;
const W = 706;

/** Les quatre colonnes du dessin. Le vide entre deux colonnes est l'espace où
 *  passent les traits : 22 px, assez pour qu'un coude se lise. */
const COL = {
  depart: { x: 6, w: 92 },
  metier1: { x: 120, w: 126 },
  metier2: { x: 268, w: 208 },
  legendaire: { x: 498, w: 202 },
};

type Tronc = { nom: string; embleme: string; lignees: typeof LIGNEES; premiere: number; derniere: number };

/** Les lignées regroupées par Métier 1 — calculé, pas écrit : si une lignée
 *  s'ajoutait, l'arbre suivrait sans qu'on y touche. */
function troncsDe(): Tronc[] {
  const out: Tronc[] = [];
  LIGNEES.forEach((l, i) => {
    const m1 = l.etapes[1];
    const t = out.find((x) => x.nom === m1.nom);
    if (t) { t.lignees.push(l); t.derniere = i; }
    else out.push({ nom: m1.nom, embleme: m1.embleme, lignees: [l], premiere: i, derniere: i });
  });
  return out;
}

const centre = (i: number) => HAUT + i * ROW + ROW / 2;

export function Arbre({ choisi, onChoix, nbDe }: {
  choisi: string; onChoix: (cle: string) => void; nbDe: CompteClasse;
}) {
  const troncs = troncsDe();
  const H = HAUT + LIGNEES.length * ROW + 8;
  const vagabond = LIGNEES[0].etapes[0];
  const yDepart = centre((LIGNEES.length - 1) / 2);

  return (
    <>
      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 11, background: "var(--bg-2)", padding: 8 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img"
          style={{ display: "block", maxWidth: "none" }}
          aria-label={`Arbre des promotions : le Vagabond mène à ${troncs.length} métiers, chacun à deux lignées, soit ${LIGNEES.length} classes légendaires. Maître et Héros sont des promotions du Métier 2, pas des classes : ${NB_NOMS_DE_CLASSE} noms de classe en tout.`}>
          <title>Les {NB_NOMS_DE_CLASSE} noms de classe d&apos;Airborn et leurs branchements</title>

          {/* Les en-têtes de colonne portent la couleur de leur palier : c'est le seul
              repère qui permette de lire le dessin sans légende. */}
          {[
            { c: COL.depart, p: "vagabond" as const, t: "Départ" },
            { c: COL.metier1, p: "metier1" as const, t: "Métier 1" },
            { c: COL.metier2, p: "metier2" as const, t: "Métier 2 · + Maître · Héros" },
            { c: COL.legendaire, p: "legendaire" as const, t: "Légendaire" },
          ].map(({ c, p, t }) => (
            <text key={t} x={c.x} y={16} fontSize={9.5} fontWeight={700} letterSpacing={0.7}
              fill={PALIERS[p].couleur} style={{ textTransform: "uppercase" }}>{t}</text>
          ))}

          {/* ── Les traits d'abord, pour qu'ils passent SOUS les cases ── */}
          {troncs.map((t) => {
            const yT = centre((t.premiere + t.derniere) / 2);
            const coudeA = COL.depart.x + COL.depart.w + 11;
            return (
              <g key={`fil-${t.nom}`} fill="none" stroke="var(--border)" strokeWidth={1.4}>
                <path d={`M${COL.depart.x + COL.depart.w} ${yDepart} H${coudeA} V${yT} H${COL.metier1.x}`} />
                {t.lignees.map((l, j) => {
                  const i = t.premiere + j;
                  const coudeB = COL.metier1.x + COL.metier1.w + 11;
                  return (
                    <path key={l.cle}
                      d={`M${COL.metier1.x + COL.metier1.w} ${yT} H${coudeB} V${centre(i)} H${COL.metier2.x}`} />
                  );
                })}
              </g>
            );
          })}
          {/* Métier 2 → Légendaire : un trait droit, c'est la même lignée qui continue. */}
          {LIGNEES.map((l, i) => (
            <line key={`fin-${l.cle}`} x1={COL.metier2.x + COL.metier2.w} y1={centre(i)}
              x2={COL.legendaire.x} y2={centre(i)} stroke="var(--border)" strokeWidth={1.4} />
          ))}

          {/* ── Le départ ── */}
          <Case x={COL.depart.x} y={yDepart} w={COL.depart.w} embleme={vagabond.embleme}
            nom={vagabond.nom} nb={nbDe(vagabond.nom) ?? vagabond.nbCompetences} teinte={PALIERS.vagabond.couleur} />

          {/* ── Les quatre troncs ── */}
          {troncs.map((t) => (
            <Case key={t.nom} x={COL.metier1.x} y={centre((t.premiere + t.derniere) / 2)} w={COL.metier1.w}
              embleme={t.embleme} nom={t.nom} nb={nbDe(t.nom)} teinte={PALIERS.metier1.couleur} />
          ))}

          {/* ── Les huit lignées : Métier 2 avec ses promotions, puis la légendaire ── */}
          {LIGNEES.map((l, i) => {
            const y = centre(i);
            const m2 = l.etapes[2];
            const leg = l.etapes[5];
            const actif = l.cle === choisi;
            const choisir = () => onChoix(l.cle);
            return (
              <g key={l.cle} role="button" tabIndex={0} aria-pressed={actif}
                aria-label={`${m2.nom}, puis ${leg.nom} — voir cette lignée`}
                onClick={choisir}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choisir(); } }}
                style={{ cursor: "pointer" }}>
                <CaseMetier2 x={COL.metier2.x} y={y} w={COL.metier2.w} etape={m2}
                  promotions={[l.etapes[3], l.etapes[4]]} nb={nbDe(m2.nom)} actif={actif} />
                <Case x={COL.legendaire.x} y={y} w={COL.legendaire.w} embleme={leg.embleme} nom={leg.nom}
                  nb={nbDe(leg.nom)} teinte={actif ? "var(--orange)" : PALIERS.legendaire.couleur} epais={actif} />
              </g>
            );
          })}
        </svg>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5, margin: "8px 0 0" }}>
        Les deux petits emblèmes derrière le filet sont <b style={{ color: "var(--text)" }}>Maître</b> et{" "}
        <b style={{ color: "var(--text)" }}>Héros</b> : des étages du Métier 2, pas des classes. Clique une ligne.
      </p>
    </>
  );
}

/** Une case ordinaire : emblème, nom, compte de compétences. */
function Case({ x, y, w, embleme, nom, nb, teinte, epais = false }: {
  x: number; y: number; w: number; embleme: string; nom: string; nb: number | null; teinte: string; epais?: boolean;
}) {
  const h = 34;
  return (
    <g>
      <rect x={x} y={y - h / 2} width={w} height={h} rx={8}
        fill="var(--bg-3)" stroke={teinte} strokeWidth={epais ? 1.8 : 1} opacity={epais ? 1 : 0.92} />
      <image href={embleme} x={x + 6} y={y - 11} width={22} height={22} preserveAspectRatio="xMidYMid meet" />
      <text x={x + 33} y={nb != null ? y - 1 : y + 4} fontSize={11.5} fontWeight={700} fill="var(--text)">{nom}</text>
      {nb != null && (
        <text x={x + 33} y={y + 10} fontSize={9} fill="var(--text-muted)">{nb} comp.</text>
      )}
    </g>
  );
}

/**
 * LA CASE DU MÉTIER 2 — et ses deux promotions dans la même boîte.
 *
 * Tout est là : le filet vertical sépare le nom de classe de ses deux étages, et les
 * deux emblèmes de promotion tiennent DANS la case. Les sortir en colonnes séparées
 * les aurait fait passer pour deux classes de plus, ce qui est exactement l'erreur
 * qu'on corrige.
 */
function CaseMetier2({ x, y, w, etape, promotions, nb, actif }: {
  x: number; y: number; w: number;
  etape: { nom: string; embleme: string };
  promotions: { nom: string; embleme: string }[];
  nb: number | null; actif: boolean;
}) {
  const h = 34;
  const filet = x + w - 52;
  return (
    <g>
      <rect x={x} y={y - h / 2} width={w} height={h} rx={8}
        fill={actif ? "rgba(255,140,26,.10)" : "var(--bg-3)"}
        stroke={actif ? "var(--orange)" : PALIERS.metier2.couleur} strokeWidth={actif ? 1.8 : 1} />
      <image href={etape.embleme} x={x + 6} y={y - 11} width={22} height={22} preserveAspectRatio="xMidYMid meet" />
      <text x={x + 33} y={nb != null ? y - 1 : y + 4} fontSize={11.5} fontWeight={700}
        fill={actif ? "var(--orange)" : "var(--text)"}>{etape.nom}</text>
      {nb != null && <text x={x + 33} y={y + 10} fontSize={9} fill="var(--text-muted)">{nb} comp.</text>}

      <line x1={filet} y1={y - 12} x2={filet} y2={y + 12} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 2" />
      {promotions.map((p, k) => (
        <image key={p.nom} href={p.embleme} x={filet + 8 + k * 20} y={y - 8} width={16} height={16}
          preserveAspectRatio="xMidYMid meet" opacity={0.85}>
          <title>{p.nom}</title>
        </image>
      ))}
    </g>
  );
}
