"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { VoletSections, EnteteVolet, type SectionVolet } from "@/components/VoletSections";
import { Icon, type IconName } from "@/components/Icon";
import { Bulle, Invisible } from "@/components/Bulle";
import { useCardFx } from "@/components/VgFx";
import { NomObjet } from "@/components/objets/NomObjet";
import { Portrait } from "@/components/pnj/Portrait";

/**
 * L'ANNUAIRE DES PNJ — « qui vend quoi, qui fabrique quoi, et où ».
 *
 * Le client d'AirFlyff porte 131 portraits de dialogue (200×240, canal alpha) que rien
 * n'affichait. L'appariement ne devine rien : `character.inc` donne, pour chaque PNJ,
 * un `SetImage( IDS_CHARACTER_INC_xxxxxx )` qui se résout dans `character.txt` en un
 * nom de fichier. C'est le jeu qui dit qui porte quel visage.
 *
 * ┌──────────── CE QUE CETTE PASSE A CHANGÉ ────────────┐
 * │ 1. LES PRIX SONT PARTIS. Ils tenaient une colonne sur │
 * │    chaque ligne d'étal. Ce qui sert, c'est de savoir  │
 * │    QUE ce marchand a l'objet, et par quelle monnaie   │
 * │    il se paie — perins, jeton, nucléus. Pas combien.  │
 * │ 2. ON CHERCHE PAR OBJET. « Qui vend une potion ? » se │
 * │    posait forcément et l'annuaire n'y répondait pas ;  │
 * │    il fallait ouvrir les fiches une par une.          │
 * │ 3. LES RECETTES SONT DEVENUES DES NOMS. La liste des  │
 * │    ingrédients appartient à /crafts : ici on dit CHEZ │
 * │    QUI, et on renvoie là-bas pour le détail. C'était  │
 * │    le même sujet développé sur deux pages.            │
 * │ 4. Chaque nom d'objet mène quelque part — sa fiche du │
 * │    catalogue, et sa provenance quand le client la sait.│
 * └──────────────────────────────────────────────────────┘
 */

type Objet = { n: string; p?: number; i: string | null };
/** Un troc : l'objet, et l'objet-monnaie qu'il faut donner en échange. */
type Troc = { n: string; i: string | null; m: string; mi: string | null };
type Recette = { l: string; s: string | null; i: string | null; e: { n: string; q: number }[] };
type Vignette = {
  cle: string; nom: string; img: string | null; metier: string | null; quoi: string | null;
  famille: string; srt: string | null; ville: string | null; role: string | null;
  monnaies: string[];
  nbVend: number; nbTroc: number; nbCraft: number; nbCraftTotal: number; craftEteints: number; quetes: number;
};
type Fiche = Vignette & { vend: Objet[]; troc: Troc[]; craft: Recette[] };
type Trouve = {
  cle: string; nom: string; img: string | null; metier: string | null; ville: string | null;
  comment: string; articles: { n: string; i: string | null }[];
};

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

/** Les familles, dans l'ordre où elles servent : on fabrique, on achète, puis le reste. */
const FAMILLES: { clef: string; titre: string; sous: string; icon: IconName }[] = [
  { clef: "craft", titre: "Chez qui tu fabriques", sous: "Les artisans", icon: "hammer" },
  { clef: "boutique", titre: "Qui vend quoi", sous: "Les marchands", icon: "basket" },
  { clef: "service", titre: "Les services", sous: "Coiffeur, familiers, bazar, mairie", icon: "sparkles" },
  { clef: "guilde", titre: "Guerre de guilde", sous: "Inscription et jetons", icon: "shield" },
  { clef: "pvp", titre: "Arènes", sous: "Le colisée et les jetons rouges", icon: "swords" },
  { clef: "monde", titre: "Les entrées", sous: "Tour, chambres secrètes, salle du temps", icon: "torii" },
  { clef: "quete", titre: "À qui tu rends", sous: "Les PNJ de fin de quête", icon: "scroll" },
];

const clef = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function Pastille({ texte, couleur, titre }: { texte: string; couleur: string; titre?: string }) {
  return (
    <span title={titre} style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: couleur,
      background: `color-mix(in srgb, ${couleur} 11%, transparent)`, border: `1px solid color-mix(in srgb, ${couleur} 38%, transparent)`,
      borderRadius: 20, padding: "2px 9px", whiteSpace: "nowrap" }}>{texte}</span>
  );
}

/** Ce que le PNJ apporte, en trois mots — c'est ce qui fait choisir une vignette.
 *  Des COMPTES et des natures, plus de montants : « 14 articles » situe l'étal,
 *  « 14 articles à 1 200 perins » ne situait rien de plus. */
function resume(p: Vignette): string {
  const bouts: string[] = [];
  if (p.nbCraft) bouts.push(`${p.nbCraft} recette${p.nbCraft > 1 ? "s" : ""}`);
  if (p.nbTroc) bouts.push(`${p.nbTroc} contre jetons`);
  if (p.nbVend) bouts.push(`${p.nbVend} article${p.nbVend > 1 ? "s" : ""}`);
  if (!bouts.length && p.quetes) bouts.push(`${p.quetes} quête${p.quetes > 1 ? "s" : ""}`);
  return bouts.join(" · ") || "Dialogue seulement";
}

/** Une vignette de la grille : le visage, le nom, le métier, la ville. */
function CartePnj({ p, onOuvrir }: { p: Vignette; onOuvrir: () => void }) {
  return (
    /* `aria-label` explicite : le nom du PNJ vit dans des <span> imbriqués, et l'arbre
       d'accessibilité rendait le bouton SANS nom — inutilisable au lecteur d'écran
       comme au pilotage clavier. */
    <button onClick={onOuvrir} className="fx-card pnj-vignette"
      aria-label={`${p.nom}${p.metier ? `, ${p.metier}` : ""} — ouvrir sa fiche`}
      style={{ display: "flex", gap: 11, textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: "inherit",
        padding: 10, borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--border)", width: "100%" }}>
      <Portrait img={p.img} nom={p.nom} taille={62} />
      <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <span className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.25 }}>{p.nom}</span>
        {p.metier && <span style={{ fontSize: 11.5, color: "var(--orange)", fontWeight: 700 }}>{p.metier}</span>}
        <span style={{ fontSize: 11, color: "var(--text-muted)", ...NUM }}>{resume(p)}</span>
        {p.monnaies.length > 0 && (
          <span style={{ fontSize: 10.5, color: "var(--gold)", fontWeight: 700 }}>
            {p.monnaies.slice(0, 2).join(", ")}{p.monnaies.length > 2 ? "…" : ""}
          </span>
        )}
        {p.ville && (
          <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, marginTop: "auto" }}>
            <Icon name="map-pin" size={11} />{p.ville}
          </span>
        )}
      </span>
    </button>
  );
}

/** Une rangée d'articles : icône + nom cliquable. Le nom mène à sa fiche du catalogue
 *  et à sa provenance ; l'icône du client suffit à reconnaître la pièce. */
function Articles({ liste, couleur }: { liste: { n: string; i: string | null }[]; couleur?: string }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {liste.map((o, i) => (
        <span key={i} style={{ fontSize: 11.5, padding: "4px 9px", borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
          <NomObjet nom={o.n} icone={o.i} couleur={couleur} taille={17} />
        </span>
      ))}
    </div>
  );
}

/** L'étal de vente. Plafonné à 30 lignes : au-delà, l'étal est un catalogue et c'est
 *  la recherche par objet qui répond, pas le déroulé. */
function Vente({ vend }: { vend: Objet[] }) {
  const [tout, setTout] = useState(false);
  const montres = tout ? vend : vend.slice(0, 30);
  return (
    <>
      <Articles liste={montres} />
      {vend.length > 30 && (
        <button onClick={() => setTout(!tout)} style={{ marginTop: 9, fontFamily: "inherit", cursor: "pointer", fontSize: 12,
          padding: "6px 12px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--orange)", fontWeight: 700 }}>
          {tout ? "Replier" : `+ ${vend.length - 30}`}
        </button>
      )}
    </>
  );
}

/**
 * L'ÉTAL À JETONS, groupé par monnaie.
 *
 * C'est la mécanique maison d'AirFlyff : on paie avec un OBJET — jeton rouge, nucléus,
 * médaille de donjon — et pas avec des perins. Le client dit ce qui est en vente et
 * contre quoi ; la QUANTITÉ exigée, elle, est décidée côté serveur. Ce trou-là reste
 * signalé, mais dans une bulle et pas en paragraphe : il protège d'un farm inutile,
 * c'est la seule raison qui vaille de garder une réserve.
 */
function TrocEtal({ troc }: { troc: Troc[] }) {
  const groupes = useMemo(() => {
    const m = new Map<string, Troc[]>();
    for (const t of troc) m.set(t.m, [...(m.get(t.m) ?? []), t]);
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [troc]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {groupes.map(([monnaie, liste]) => (
        <div key={monnaie}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
            {liste[0].mi ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={`/jeu/icones/${liste[0].mi}`} alt="" width={22} height={22} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
            ) : null}
            <Invisible enJeu={`Le client dit qu'on paie en ${monnaie}, jamais COMBIEN il en faut : la quantité est fixée côté serveur. Compte-la dans la fenêtre du PNJ avant de partir farmer.`}>
              <b style={{ fontSize: 12.5, color: "var(--gold)" }}>contre du {monnaie}</b>
            </Invisible>
            <span style={{ fontSize: 11, color: "var(--text-muted)", ...NUM }}>{liste.length}</span>
          </div>
          <Articles liste={liste.map((t) => ({ n: t.n, i: t.i }))} />
        </div>
      ))}
    </div>
  );
}

/**
 * CE QU'IL FABRIQUE — les RÉSULTATS, pas les recettes.
 *
 * La liste des ingrédients vivait ici ET sur /crafts, mot pour mot. Cette page répond
 * à « chez qui ? » ; le détail d'une recette appartient à la page des crafts, qui en
 * est propriétaire. Un nom, une icône, un lien.
 *
 * Reste un piège qui ne se voit que d'ici, parce qu'il se voit en comparant les
 * recettes d'UN MÊME PNJ : chez Karlagarfeld, quatre coffrets différents demandent
 * exactement les mêmes ingrédients. En jeu, une fenêtre d'échange ne rend qu'un
 * résultat pour une entrée donnée — les suivants sont probablement inatteignables. On
 * le détecte au lieu de l'écrire en dur : la collision réapparaîtra au prochain patch.
 */
function Craft({ craft, eteints }: { craft: Recette[]; eteints: number }) {
  const collisions = useMemo(() => {
    const vus = new Map<string, number>();
    for (const r of craft) {
      const k = r.e.map((e) => `${e.n}x${e.q}`).sort().join("|");
      if (!k) continue;
      vus.set(k, (vus.get(k) ?? 0) + 1);
    }
    return [...vus.values()].filter((n) => n > 1).reduce((a, n) => a + n - 1, 0);
  }, [craft]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Articles liste={craft.map((r) => ({ n: r.s || r.l || "Résultat non nommé", i: r.i }))} couleur="var(--green)" />

      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
        <Link href="/crafts" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--orange)", fontWeight: 700, textDecoration: "none" }}>
          <Icon name="hammer" size={13} /> Les recettes, ingrédient par ingrédient
        </Link>
        {collisions > 0 && (
          <Invisible enJeu={`${collisions} de ces recettes réclament exactement les mêmes ingrédients qu'une autre. Une fenêtre d'échange ne rend qu'un résultat par entrée : en jeu tu n'obtiendras probablement que le premier. Teste avec un exemplaire avant de farmer la pile.`}>
            <b style={{ color: "var(--gold)", ...NUM }}>{collisions} en collision</b>
          </Invisible>
        )}
        {eteints > 0 && (
          <Invisible enJeu={`${eteints} recette${eteints > 1 ? "s" : ""} existe${eteints > 1 ? "nt" : ""} dans le client mais la ligne est commentée : l'équipe l'a éteinte au lieu de la supprimer. Elle n'apparaît pas chez le PNJ en jeu — ne compte pas dessus.`}>
            <b style={{ color: "var(--red)", ...NUM }}>{eteints} éteinte{eteints > 1 ? "s" : ""}</b>
          </Invisible>
        )}
      </div>
    </div>
  );
}

/** La fiche ouverte : qui c'est, où il est, et tout ce qu'il propose. */
function FichePnj({ v, fiche, onFermer }: { v: Vignette; fiche: Fiche | null; onFermer: () => void }) {
  const rien = fiche && !fiche.craft.length && !fiche.vend.length && !fiche.troc.length;
  return (
    <div>
      <button onClick={onFermer} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14, cursor: "pointer",
        fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 9,
        background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
        <Icon name="arrow-left" size={13} /> Revenir à la liste
      </button>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 16 }}>
        <Portrait img={v.img} nom={v.nom} taille={116} />
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div className="font-heading" style={{ fontSize: 21, fontWeight: 700, marginBottom: 6 }}>{v.nom}</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 9 }}>
            {v.metier && <Pastille texte={v.metier} couleur="var(--orange)" />}
            {v.ville && <Pastille texte={v.ville} couleur="var(--blue)" titre="La carte sur laquelle le jeu le place" />}
            {v.quetes > 0 && <Pastille texte={`${v.quetes} quête${v.quetes > 1 ? "s" : ""}`} couleur="var(--gold)" />}
          </div>
          {v.quoi && <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>{v.quoi}</p>}
        </div>
      </div>

      {!fiche ? (
        <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Ce qu&apos;il propose se charge…</div>
      ) : (
        <>
          {fiche.craft.length > 0 && (
            <>
              <SousTitre icon="hammer" texte="Il fabrique" compte={fiche.nbCraftTotal} />
              <Craft craft={fiche.craft} eteints={fiche.craftEteints} />
            </>
          )}

          {fiche.troc.length > 0 && (
            <>
              <SousTitre icon="coins" texte="Contre des jetons" compte={fiche.troc.length} />
              <TrocEtal troc={fiche.troc} />
            </>
          )}

          {fiche.vend.length > 0 && (
            <>
              <SousTitre icon="basket" texte="Il vend" compte={fiche.vend.length} />
              <Vente vend={fiche.vend} />
            </>
          )}

          {/* Un étal écrit « toute cette catégorie » n'est pas énumérable : c'est le
              seul cas où l'absence de liste ne veut pas dire l'absence d'étal, et un
              joueur qui l'ignore croit le PNJ vide. Une bulle, pas un paragraphe. */}
          {rien && (
            <Bulle quoi="Beaucoup de marchands vendent « toute une catégorie » au lieu d'une liste d'objets : ces étals-là ne peuvent pas être énumérés depuis les fichiers. Va voir sa fenêtre en jeu.">
              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Aucun article écrit noir sur blanc</span>
            </Bulle>
          )}
        </>
      )}
    </div>
  );
}

function SousTitre({ icon, texte, compte }: { icon: IconName; texte: string; compte?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0 10px" }}>
      <Icon name={icon} size={15} style={{ color: "var(--orange)" }} />
      <span className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>{texte}</span>
      {compte != null && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", ...NUM }}>{compte}</span>}
    </div>
  );
}

/** La grille d'un métier. */
function Grille({ liste, onOuvrir, vide }: { liste: Vignette[]; onOuvrir: (v: Vignette) => void; vide: string }) {
  if (!liste.length) return <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>{vide}</p>;
  return (
    <div className="pnj-grille">
      {liste.map((p) => <CartePnj key={p.cle} p={p} onOuvrir={() => onOuvrir(p)} />)}
    </div>
  );
}

/** Le résultat d'une recherche PAR OBJET : le porteur, et ce qui a répondu chez lui. */
function LigneTrouve({ t, onOuvrir }: { t: Trouve; onOuvrir: () => void }) {
  return (
    <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: 10, borderRadius: 11, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
      <Portrait img={t.img} nom={t.nom} taille={44} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onOuvrir} className="font-heading" style={{ background: "none", border: "none", padding: 0, cursor: "pointer",
            fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: "var(--orange)" }}>{t.nom}</button>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            {t.comment}{t.metier ? ` · ${t.metier}` : ""}{t.ville ? ` · ${t.ville}` : ""}
          </span>
        </div>
        <div style={{ marginTop: 6 }}><Articles liste={t.articles} /></div>
      </div>
    </div>
  );
}

export function AnnuairePnj() {
  useCardFx();
  const [annuaire, setAnnuaire] = useState<Vignette[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [portraits, setPortraits] = useState(0);
  const [q, setQ] = useState("");
  const [trouvesObjet, setTrouvesObjet] = useState<Trouve[]>([]);
  /** `ou` retient DEPUIS QUELLE section la fiche a été ouverte : sans ça, changer de
   *  métier dans le rail laisserait la fiche d'un autre métier affichée. */
  const [choix, setChoix] = useState<{ v: Vignette; ou: string } | null>(null);
  const [fiches, setFiches] = useState<Record<string, Fiche>>({});

  useEffect(() => {
    let vivant = true;
    fetch("/api/pnj")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("annuaire"))))
      .then((d: { pnj: Vignette[]; portraits: number }) => {
        if (!vivant) return;
        setAnnuaire(d.pnj);
        setPortraits(d.portraits);
      })
      .catch(() => vivant && setErreur(true));
    return () => { vivant = false; };
  }, []);

  // La fiche complète n'est demandée qu'à l'ouverture, et une seule fois par PNJ :
  // les inventaires de vente pèsent l'essentiel du fichier.
  useEffect(() => {
    const cle = choix?.v.cle;
    if (!cle || fiches[cle]) return;
    let vivant = true;
    fetch(`/api/pnj?cle=${encodeURIComponent(cle)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fiche"))))
      .then((f: Fiche) => vivant && setFiches((d) => ({ ...d, [cle]: f })))
      .catch(() => {});
    return () => { vivant = false; };
  }, [choix, fiches]);

  /** La recherche par OBJET part côté serveur, amortie : les inventaires ne
   *  descendent jamais au navigateur, donc on ne peut pas filtrer sur place. */
  useEffect(() => {
    const k = clef(q);
    if (k.length < 3) { setTrouvesObjet([]); return; }
    let vivant = true;
    const t = setTimeout(() => {
      fetch(`/api/pnj?objet=${encodeURIComponent(q.trim())}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { resultats: Trouve[] } | null) => vivant && setTrouvesObjet(d?.resultats ?? []))
        .catch(() => {});
    }, 260);
    return () => { vivant = false; clearTimeout(t); };
  }, [q]);

  const parFamille = useMemo(() => {
    const m: Record<string, Vignette[]> = {};
    for (const p of annuaire ?? []) (m[p.famille] ??= []).push(p);
    return m;
  }, [annuaire]);

  const trouves = useMemo(() => {
    const k = clef(q);
    if (k.length < 2) return [];
    return (annuaire ?? []).filter((p) =>
      clef(p.nom).includes(k) || clef(p.metier ?? "").includes(k) || clef(p.ville ?? "").includes(k) ||
      p.monnaies.some((m) => clef(m).includes(k))
    ).slice(0, 60);
  }, [q, annuaire]);

  /** Vue transversale : tous ceux qui prennent un jeton, quel que soit leur métier.
   *  C'est la question qu'on se pose en vidant son sac — « qui prend ça ? » — et elle
   *  ne tombe dans aucune des familles du client. */
  const aJetons = useMemo(
    () => (annuaire ?? []).filter((p) => p.nbTroc > 0).sort((a, b) => b.nbTroc - a.nbTroc),
    [annuaire]
  );

  const ouvrir = (ou: string) => (v: Vignette) => setChoix({ v, ou });
  const fermer = () => setChoix(null);

  /** Un métier = une entrée du rail ; la fiche remplace la grille dans le même panneau. */
  const panneau = (ou: string, liste: Vignette[], vide: string) =>
    choix && choix.ou === ou
      ? <FichePnj v={choix.v} fiche={fiches[choix.v.cle] ?? null} onFermer={fermer} />
      : <Grille liste={liste} onOuvrir={ouvrir(ou)} vide={vide} />;

  const sections: SectionVolet[] = [
    {
      clef: "chercher", titre: "Chercher", sous: "Un nom, un métier, une ville — ou un objet", icon: "search",
      compte: annuaire?.length ?? null,
      contenu: choix && choix.ou === "chercher"
        ? <FichePnj v={choix.v} fiche={fiches[choix.v.cle] ?? null} onFermer={fermer} />
        : (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Angie · couturier · Flarine · potion de vie"
              style={{ width: "100%", padding: "10px 13px", borderRadius: 10, background: "var(--bg-2)",
                border: "1px solid var(--border)", color: "var(--text)", fontFamily: "inherit", fontSize: 13.5, marginBottom: 13 }} />

            {trouvesObjet.length > 0 && (
              <>
                <SousTitre icon="package" texte="Cet objet est chez" compte={trouvesObjet.length} />
                <div style={{ display: "grid", gap: 8, marginBottom: 6 }}>
                  {trouvesObjet.map((t, i) => (
                    <LigneTrouve key={`${t.cle}-${t.comment}-${i}`} t={t}
                      onOuvrir={() => {
                        const v = (annuaire ?? []).find((x) => x.cle === t.cle);
                        if (v) setChoix({ v, ou: "chercher" });
                      }} />
                  ))}
                </div>
              </>
            )}

            {clef(q).length >= 2 && (
              <>
                {trouvesObjet.length > 0 && <SousTitre icon="users" texte="Ces PNJ" compte={trouves.length} />}
                <Grille liste={trouves} onOuvrir={ouvrir("chercher")}
                  vide={trouvesObjet.length ? "Aucun PNJ ne porte ce nom." : `Rien sous « ${q} ».`} />
              </>
            )}
          </>
        ),
    },
    {
      clef: "jetons", titre: "Qui prend tes jetons", sous: "Les étals qui se paient en objets", icon: "coins",
      compte: aJetons.length || null,
      contenu: panneau("jetons", aJetons, "Aucun étal à jetons dans le client."),
    },
    ...FAMILLES.map((f) => ({
      clef: f.clef, titre: f.titre, sous: f.sous, icon: f.icon,
      compte: parFamille[f.clef]?.length ?? null,
      contenu: panneau(f.clef, parFamille[f.clef] ?? [], "Rien dans cette catégorie."),
    })),
  ];

  return (
    <>
      {/* Un intérieur habité, avec une PNJ debout derrière son comptoir : c'est à ça
          que ressemble la rencontre dont parle la page. */}
      <PageHeader art="/jeu/chargement/maploading_guildhouse.webp" icon="users" title="Les PNJ d'AirFlyff"
        subtitle="Qui vend quoi, qui fabrique quoi, et dans quelle ville le trouver." />

      {erreur && (
        <div className="glass-card" style={{ padding: 16, marginBottom: 16, fontSize: 13, color: "var(--red)" }}>
          L&apos;annuaire n&apos;a pas pu être chargé. Recharge la page.
        </div>
      )}

      <VoletSections
        sections={sections}
        entete={
          <EnteteVolet icon="users" titre="131 visages qui n'avaient jamais servi"
            marque={annuaire ? { texte: `${annuaire.length} PNJ utiles`, couleur: "var(--orange)" } : undefined}
            sous={
              <>
                Aucun visage n&apos;est attribué à la ressemblance : c&apos;est le jeu qui dit, PNJ par PNJ,
                quel fichier lui appartient. {portraits ? <b style={NUM}>{portraits}</b> : "Une partie"} sont
                sur cette page.
              </>
            }
          />
        }
      />

      <style>{`
        .pnj-grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:10px}
        .pnj-vignette{transition:border-color .15s,background .15s}
        .pnj-vignette:hover{border-color:var(--orange);background:rgba(255,140,26,.06)}
        @media(max-width:520px){.pnj-grille{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}
