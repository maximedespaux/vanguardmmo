"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Invisible } from "@/components/Bulle";
import { useCardFx } from "@/components/VgFx";
import { IconeObjet } from "./IconeObjet";
import { BADGE_ULTIME, CADENAS, COULEUR_GRADE, chiffreDeCombat, classeFr, emblemeClasse, FAMILLES, libelleEtPourcent, MARQUEUR_AIRFLYFF, type Famille, type ObjetFiche } from "./vocabulaire";

/**
 * CHERCHER UN OBJET — le catalogue du client du jeu, 12 134 lignes.
 *
 * Rien n'arrive en bloc : le catalogue pèse 3 Mo, la route en renvoie 50 lignes à la
 * fois. On ne pagine pas non plus, exprès — au-delà de cinquante réponses la bonne
 * façon d'avancer est d'affiner le mot-clé, pas de tourner des pages.
 *
 * La frappe est amortie de 220 ms. Sans ça, taper « epee de luzaka » lançait quatorze
 * requêtes dont treize jetées, et les réponses arrivaient dans le désordre : c'est le
 * `jeton` qui écarte celles qui reviennent trop tard.
 *
 * ┌──────────── CE QUI A CHANGÉ DANS LA VITRINE ────────────┐
 * │ · Le PRIX a quitté la carte. Un montant de PNJ ne dit    │
 * │   rien du marché entre joueurs, et il occupait la place   │
 * │   d'un renseignement qui, lui, sert : les bonus.          │
 * │ · Un filtre AJOUTS AIRFLYFF est arrivé. C'est le tri qui  │
 * │   compte sur un serveur privé — 1 455 objets sortent des  │
 * │   espaces de noms propres au serveur, et ceux-là          │
 * │   n'existent nulle part ailleurs.                         │
 * │ · Les bonus se montrent sur la carte, pas seulement leur  │
 * │   nombre : c'est ce qui fait choisir entre deux pièces.   │
 * └─────────────────────────────────────────────────────────┘
 *
 * ┌──── LES DEUX ENTRÉES QUE CETTE PASSE AJOUTE ────┐
 * │ · PAR STATISTIQUE. « Qu'est-ce qui donne du taux │
 * │   critique ? » n'avait aucune réponse ici : on    │
 * │   pouvait demander « qui portent des bonus »,     │
 * │   jamais lequel. Le choix se fait sur les codes   │
 * │   du client, et chaque libellé porte son compte.  │
 * │ · CE QUI TOMBE SUR UN MONSTRE. C'est le pont vers │
 * │   /monstres pris dans le sens de l'objet, et il   │
 * │   n'existait pas non plus.                        │
 * └─────────────────────────────────────────────────┘
 */

type Comptes = { maison: number; bonus: number; unique: number; ultime: number; lache: number };
/** Une statistique demandable : son code du client, son libellé, son nombre
 *  d'objets. Calculée côté serveur et passée en propriété — elle ne bouge pas. */
export type StatDispo = { code: string; fr: string; objets: number };
type Reponse = {
  objets: ObjetFiche[]; total: number; montres: number;
  familles: Record<string, number>;
  comptes: Comptes;
  catalogue: { objets: number; genere: string };
};

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

const champ: React.CSSProperties = {
  background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10,
  padding: "11px 13px", color: "var(--text)", fontSize: 14, fontFamily: "inherit", width: "100%",
};

/** Une pastille de filtre. La même forme partout : c'est ce qui la rend lisible. */
function Pastille({ on, onClick, children, couleur = "var(--orange)" }: { on: boolean; onClick: () => void; children: React.ReactNode; couleur?: string }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit",
      fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 20,
      color: on ? "#0A0A0C" : "var(--text)",
      background: on ? couleur : "var(--bg-3)",
      border: `1px solid ${on ? couleur : "var(--border)"}`,
    }}>{children}</button>
  );
}

/** Le compte que porte une pastille. En dernier, toujours, pour que l'œil suive une
 *  seule colonne quand les pastilles s'alignent. */
function Compte({ n, on }: { n: number | undefined; on: boolean }) {
  if (!n) return null;
  return <span style={{ ...NUM, opacity: on ? 0.7 : 0.55 }}>{n.toLocaleString("fr-FR")}</span>;
}

export function RechercheObjets({ depart = "", departStat = "", stats = [] }: {
  depart?: string;
  /** Un code `DST_*` arrivé par l'URL, posé par une ligne de bonus d'une fiche. */
  departStat?: string;
  stats?: StatDispo[];
}) {
  useCardFx();
  const [q, setQ] = useState(depart);
  const [famille, setFamille] = useState<Famille | "">("");
  const [grade, setGrade] = useState<"" | "Unique" | "Ultime">("");
  const [niveau, setNiveau] = useState("");
  const [avecBonus, setAvecBonus] = useState(false);
  const [maison, setMaison] = useState(false);
  const [stat, setStat] = useState(departStat);
  const [lache, setLache] = useState(false);
  const [r, setR] = useState<Reponse | null>(null);
  const [charge, setCharge] = useState(false);
  const jeton = useRef(0);

  const chercher = useCallback(async () => {
    const mien = ++jeton.current;
    setCharge(false);
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (famille) p.set("famille", famille);
    if (grade) p.set("grade", grade);
    if (niveau) p.set("niveau", niveau);
    if (avecBonus) p.set("bonus", "1");
    if (maison) p.set("maison", "1");
    if (stat) p.set("stat", stat);
    if (lache) p.set("lache", "1");
    const d = await fetch(`/api/objets?${p}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    // Une réponse qui arrive après la suivante ne doit pas l'écraser.
    if (mien !== jeton.current) return;
    setR(d); setCharge(true);
  }, [q, famille, grade, niveau, avecBonus, maison, stat, lache]);

  useEffect(() => { const t = setTimeout(chercher, 220); return () => clearTimeout(t); }, [chercher]);

  const filtre = Boolean(q.trim() || famille || grade || niveau || avecBonus || maison || stat || lache);
  const statChoisie = stats.find((s) => s.code === stat) ?? null;
  const familles = useMemo(() => r?.familles ?? {}, [r]);
  const c = r?.comptes;

  return (
    <div style={{ display: "grid", gap: 14 }}>

      <div className="glass-card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ position: "relative", flex: "1 1 260px", minWidth: 0 }}>
            <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus
              placeholder="Le nom de l'objet — les accents n'ont pas d'importance"
              style={{ ...champ, paddingLeft: 34 }} />
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
            Portable au niveau
            <input value={niveau} onChange={(e) => setNiveau(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric" placeholder="—"
              style={{ ...champ, width: 66, textAlign: "center", padding: "9px 6px", ...NUM }} />
          </span>
        </div>

        {/* CHERCHER PAR STATISTIQUE — le choix se fait sur le CODE du client et non
            sur le libellé. Trois libellés du relevé se sont décalés d'une colonne ;
            un code, lui, est écrit noir sur blanc dans defineattribute.h. Le compte
            entre parenthèses vient du même relevé : on sait avant de cliquer s'il y
            a deux objets derrière ou deux cents.
            Le `<select>` copie la forme du champ voisin (même fond, même bordure,
            même rayon) : un contrôle ajouté prend l'allure de son voisin le plus
            proche, sinon il se voit comme une pièce rapportée. */}
        {stats.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)", flex: "1 1 300px", minWidth: 0 }}>
              <Icon name="zap" size={14} style={{ color: "var(--orange)", flexShrink: 0 }} />
              Qui donne
              <select value={stat} onChange={(e) => setStat(e.target.value)} aria-label="Chercher par statistique"
                style={{ ...champ, flex: 1, minWidth: 0, padding: "9px 10px", cursor: "pointer" }}>
                <option value="">n’importe quoi</option>
                {stats.map((s) => (
                  <option key={s.code} value={s.code}>{s.fr} ({s.objets})</option>
                ))}
              </select>
            </span>
            {statChoisie && (
              <span style={{ fontSize: 12, color: "var(--text-muted)", ...NUM }}>
                {statChoisie.objets.toLocaleString("fr-FR")} objets portent {statChoisie.fr.toLowerCase()}
              </span>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <Pastille on={!famille} onClick={() => setFamille("")}>Tout</Pastille>
          {FAMILLES.map((f) => (
            <Pastille key={f.clef} on={famille === f.clef} onClick={() => setFamille(famille === f.clef ? "" : f.clef)}>
              <Icon name={f.icon} size={13} />
              {f.label}
              <Compte n={familles[f.clef]} on={famille === f.clef} />
            </Pastille>
          ))}
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 11 }}>
          {/* Le tri qui vaut la place sur un serveur privé : ce qui n'existe qu'ici.
              Le repère « hors jeu » est posé À CÔTÉ de la pastille et non autour :
              `Invisible` rend un bouton, et un bouton dans un bouton n'est pas du HTML
              valide — le clic du filtre se serait perdu. */}
          <Pastille on={maison} onClick={() => setMaison(!maison)}>
            <Icon name="sparkles" size={13} /> Ajouts AirFlyff
            <Compte n={c?.maison} on={maison} />
          </Pastille>
          {/* Le texte est celui de `MARQUEUR_AIRFLYFF` — le même que sur /wiki. Il était
              écrit à la main dans les deux fichiers, en deux versions différentes. */}
          <Invisible enJeu={MARQUEUR_AIRFLYFF}>
            <></>
          </Invisible>
          <Pastille on={grade === "Unique"} couleur={COULEUR_GRADE.Unique} onClick={() => setGrade(grade === "Unique" ? "" : "Unique")}>
            Unique <Compte n={c?.unique} on={grade === "Unique"} />
          </Pastille>
          <Pastille on={grade === "Ultime"} couleur={COULEUR_GRADE.Ultime} onClick={() => setGrade(grade === "Ultime" ? "" : "Ultime")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BADGE_ULTIME} alt="Ultime" height={11} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
            <Compte n={c?.ultime} on={grade === "Ultime"} />
          </Pastille>
          <Pastille on={avecBonus} onClick={() => setAvecBonus(!avecBonus)}>
            <Icon name="zap" size={13} /> Qui portent des bonus
            <Compte n={c?.bonus} on={avecBonus} />
          </Pastille>
          {/* LE PONT VERS /monstres, dans le sens de l'objet. Le compte est celui des
              objets que le relevé sait rattacher à un monstre nommé — compté, pas
              écrit : la prochaine fouille le fera bouger tout seul. */}
          <Pastille on={lache} couleur="var(--red)" onClick={() => setLache(!lache)}>
            <Icon name="sword-cross" size={13} /> Que lâche un monstre
            <Compte n={c?.lache} on={lache} />
          </Pastille>
          {filtre && (
            <button onClick={() => { setQ(""); setFamille(""); setGrade(""); setNiveau(""); setAvecBonus(false); setMaison(false); setStat(""); setLache(false); }}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icon name="x" size={13} /> Remettre à zéro
            </button>
          )}
        </div>
      </div>

      {/* Le compte : combien on montre, combien il y en a. Sans ça, cinquante lignes
          laissent croire qu'il n'y en a que cinquante. */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5, color: "var(--text-muted)", flexWrap: "wrap" }}>
        {!charge && !r ? "Recherche…" : r ? (
          <>
            <b style={{ color: "var(--text)", ...NUM }}>{r.total.toLocaleString("fr-FR")}</b>
            {r.total === 1 ? "objet" : "objets"}
            {r.total > r.montres && <span>· les {r.montres} plus proches sont affichés</span>}
            <span style={{ marginLeft: "auto", ...NUM }}>sur {r.catalogue.objets.toLocaleString("fr-FR")}</span>
          </>
        ) : "La recherche n’a pas répondu."}
      </div>

      {r && r.objets.length === 0 && (
        <div className="glass-card" style={{ padding: "26px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
          <Icon name="search" size={22} style={{ opacity: 0.5 }} />
          <p style={{ margin: "9px 0 0" }}>Rien sous ce nom. Essaie un mot plus court.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(268px,1fr))", gap: 10 }}>
        {r?.objets.map((o) => <Carte key={o.i} o={o} />)}
      </div>
    </div>
  );
}

/**
 * LE VERROU D'ÉCHANGE, EN IMAGE ET SANS UN MOT.
 *
 * 4 602 objets du catalogue sont NON ÉCHANGEABLES et 2 170 sont LIÉS. C'est le seul
 * champ de la carte qui change un geste avant même de regarder les bonus : sur un site
 * de guilde qui tient une boutique, un coffre et un salon de troc, une pièce liée ne
 * peut ni se vendre, ni se prêter, ni se demander. Le savoir dans la liste évite d'ouvrir
 * la fiche pour rien — et évite de promettre à quelqu'un un objet qu'on ne peut pas lui
 * donner.
 *
 * LE CADENAS EST CELUI DU JEU (`/jeu/interface/lock.webp`, déjà servi par la fiche), pas
 * un pictogramme maison : c'est l'image que le joueur voit sur l'objet dans son sac. Zéro
 * mot ajouté à l'écran — l'intitulé passe par `alt`, que le lecteur d'écran lit et que la
 * mesure des mots ne compte pas comme de la prose.
 *
 * Les trois cas du client sont distingués par la COULEUR, parce qu'ils n'ont pas le même
 * poids : rouge pour ce qui ne bougera plus (non échangeable, lié au personnage), or pour
 * « lié à l'équipement », qui reste dans le jeu du joueur.
 */
function Verrou({ o }: { o: ObjetFiche }) {
  const cas = o.ne === 1 ? { titre: "Non échangeable", ton: "var(--red)" }
    : o.li === 1 ? { titre: "Lié au personnage", ton: "var(--red)" }
    : o.li === 2 ? { titre: "Lié à l’équipement", ton: "var(--gold)" }
    : null;
  if (!cas) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={CADENAS} alt={cas.titre} title={cas.titre} width={11} height={11}
      style={{ objectFit: "contain", imageRendering: "pixelated", flexShrink: 0,
        // Le cadenas du client est gris : la teinte vient d'un `drop-shadow` posé
        // dessous, qui garde le dessin lisible là où un `filter: hue-rotate` le
        // déformerait.
        filter: `drop-shadow(0 0 2px color-mix(in srgb, ${cas.ton} 80%, transparent))` }} />
  );
}

/**
 * Une carte de résultat : de quoi reconnaître la pièce sans ouvrir la fiche.
 *
 * Les DEUX premiers bonus s'affichent, pas leur nombre. « 5 bonus » ne permet de
 * choisir entre rien ; « Attaque +15 % · Taux critique +70 » si. Deux et pas cinq
 * parce qu'au-delà la carte devient un pavé et la grille perd sa régularité — les
 * autres sont sur la fiche.
 */
function Carte({ o }: { o: ObjetFiche }) {
  const couleur = o.g ? COULEUR_GRADE[o.g] : null;
  const emb = emblemeClasse(o.cl);
  const bonus = o.b?.slice(0, 2) ?? [];
  /* La carte écrivait « Déf. 1 » sur les 3 098 pièces de mode et « Déf. 350 » sur les
     185 familiers : la colonne `dn` du client n'a de sens que pour une arme ou une
     armure (cf. `chiffreDeCombat`). Ailleurs la ligne n'existe plus. */
  const combat = chiffreDeCombat(o);
  return (
    <Link href={`/objets/${o.i}`} className="glass-card fx-card"
      style={{ padding: 11, display: "flex", gap: 11, alignItems: "flex-start", textDecoration: "none", color: "var(--text)",
        borderColor: couleur ? `color-mix(in srgb, ${couleur} 34%, var(--border))` : undefined }}>
      <IconeObjet o={o} taille={38} />
      <span style={{ minWidth: 0, flex: 1 }}>
        <span className="font-heading" style={{ display: "block", fontSize: 13.5, fontWeight: 700, lineHeight: 1.25, color: couleur ?? "var(--text)" }}>
          {o.n}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, flexWrap: "wrap" }}>
          {o.t ?? "—"}
          {o.nr ? <b style={{ ...NUM, color: "var(--text)", fontWeight: 600 }}>niv. {o.nr}</b> : null}
          {o.af === 1 && <Icon name="sparkles" size={11} style={{ color: "var(--orange)" }} />}
          {emb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={emb} alt={classeFr(o.cl) ?? ""} title={classeFr(o.cl) ?? ""} width={15} height={15} style={{ objectFit: "contain" }} />
          )}
          <Verrou o={o} />
        </span>
        {combat ? (
          <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 4, ...NUM }}>
            {combat.court}{" "}
            <b style={{ color: "var(--text)" }}>
              {combat.min.toLocaleString("fr-FR")}
              {combat.max && combat.max !== combat.min ? `–${combat.max.toLocaleString("fr-FR")}` : ""}
            </b>
          </span>
        ) : null}
        {bonus.length > 0 && (
          <span style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
            {bonus.map(([libelle, valeur], i) => {
              // Le « % » du client vit dans le libellé : la même fonction que la
              // fiche le déplace sur le chiffre, sinon « Attaque % +15 % ».
              const { mot, pct } = libelleEtPourcent(libelle);
              return (
                <span key={i} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 7, background: "var(--bg-3)",
                  border: "1px solid var(--border)", color: "var(--text-muted)", ...NUM }}>
                  {mot}{" "}
                  <b style={{ color: valeur < 0 ? "var(--red)" : "var(--green)" }}>
                    {valeur > 0 ? "+" : ""}{valeur.toLocaleString("fr-FR")}{pct ? " %" : ""}
                  </b>
                </span>
              );
            })}
            {o.b && o.b.length > 2 && (
              <span style={{ fontSize: 10.5, padding: "2px 5px", color: "var(--text-muted)", ...NUM }}>+{o.b.length - 2}</span>
            )}
          </span>
        )}

        {/* D'OÙ IL VIENT, DANS LA CARTE. C'était le trou de la page : le sous-titre
            promet de chercher « par ce qui le lâche », le filtre existe, et une fois
            filtré aucune des cinquante cartes ne nommait le monstre. La ligne dit UN
            nom — celui qui répond, le butin passant devant par construction — et le
            compte des autres. Jamais de taux.

            PAS DE <Bulle> ICI : la carte entière est un <Link>, et `Bulle` rend un
            bouton. Un bouton dans un lien n'est pas du HTML valide, et le clic de la
            carte se perdrait. C'est l'icône qui porte le sens, nommée pour les
            lecteurs d'écran. */}
        {o.pv && (
          <span style={{ display: "flex", gap: 5, alignItems: "baseline", marginTop: 5, fontSize: 10.5, color: "var(--text-muted)", minWidth: 0 }}>
            <Icon name="map-pin" size={10} aria-hidden={false} aria-label={o.pv.titre} role="img"
              style={{ flexShrink: 0, opacity: .7, transform: "translateY(1px)" }} />
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {o.pv.lignes[0]}
            </span>
            {o.pv.total > o.pv.lignes.length && (
              <span style={{ flexShrink: 0, ...NUM }}>+{o.pv.total - o.pv.lignes.length}</span>
            )}
          </span>
        )}
      </span>
    </Link>
  );
}
