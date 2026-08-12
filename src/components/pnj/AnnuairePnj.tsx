"use client";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { VoletSections, EnteteVolet, type SectionVolet } from "@/components/VoletSections";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { Portrait } from "@/components/pnj/Portrait";

/**
 * L'ANNUAIRE DES PNJ — la matière que personne n'avait ouverte.
 *
 * Le client d'AirFlyff porte 131 portraits de dialogue (200×240, canal alpha)
 * dans `Char/data.air`. Ils n'étaient affichés nulle part : ni sur le site, ni
 * sur le wiki. Le problème n'était pas de les extraire mais de savoir QUI est
 * sur chaque image — un visage attribué au mauvais marchand est pire que pas de
 * visage. L'appariement ne devine rien : `character.inc` donne, pour chaque
 * PNJ, un `SetImage( IDS_CHARACTER_INC_xxxxxx )`, et cet identifiant se résout
 * dans `character.txt` en un nom de fichier (`char_Boboku.tga`). C'est le jeu
 * lui-même qui dit qui porte quel visage. 121 des 131 portraits trouvent ainsi
 * leur PNJ ; les 10 restants ne sont câblés à personne dans ce client.
 *
 * Ce qu'un joueur vient chercher ici n'est pas une liste : c'est « qui vend
 * quoi, et où le trouver ». D'où le rail par MÉTIER plutôt que par ordre
 * alphabétique — les 578 PNJ du fichier ne servent à rien, les artisans et les
 * boutiques oui. Les prix affichés sortent des lignes `AddShopItem` du client,
 * donc ce sont les vrais, en perins.
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

const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const fmt = (n: number) => n.toLocaleString("fr-FR");

/** Les familles, dans l'ordre où elles servent : on fabrique, on achète, puis le reste. */
const FAMILLES: { clef: string; titre: string; sous: string; icon: IconName }[] = [
  { clef: "craft", titre: "Chez qui tu fabriques", sous: "Les artisans et leurs recettes", icon: "hammer" },
  { clef: "boutique", titre: "Qui vend quoi", sous: "Les marchands, avec leurs prix", icon: "basket" },
  { clef: "service", titre: "Les services", sous: "Coiffeur, familiers, bazar, mairie", icon: "sparkles" },
  { clef: "guilde", titre: "Guerre de guilde", sous: "Inscription et paiement des jetons", icon: "shield" },
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

/** Ce que le PNJ apporte, en trois mots — c'est ce qui fait choisir une vignette. */
function resume(p: Vignette): string {
  const bouts: string[] = [];
  if (p.nbVend) bouts.push(`${p.nbVend} article${p.nbVend > 1 ? "s" : ""} en perins`);
  if (p.nbTroc) bouts.push(`${p.nbTroc} contre des jetons`);
  if (p.nbCraft) bouts.push(`${p.nbCraft} recette${p.nbCraft > 1 ? "s" : ""}`);
  if (!bouts.length && p.quetes) bouts.push(`${p.quetes} quête${p.quetes > 1 ? "s" : ""} à rendre`);
  return bouts.join(" · ") || "Dialogue seulement";
}

/** Une vignette de la grille : le visage, le nom, le métier, la ville. */
function CartePnj({ p, onOuvrir }: { p: Vignette; onOuvrir: () => void }) {
  return (
    /* `aria-label` explicite : le nom du PNJ vit dans des <span> imbriqués, et
       l'arbre d'accessibilité rendait le bouton SANS nom — inutilisable au
       lecteur d'écran comme au pilotage clavier. */
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
        <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, marginTop: "auto" }}>
          <Icon name="map-pin" size={11} />
          {p.ville ?? "ville non relevée"}
        </span>
      </span>
    </button>
  );
}

/** L'inventaire de vente, tel que le client l'écrit — prix en perins. */
function Vente({ vend }: { vend: Objet[] }) {
  const [tout, setTout] = useState(false);
  const montres = tout ? vend : vend.slice(0, 24);
  return (
    <>
      <div style={{ display: "grid", gap: 6 }}>
        {montres.map((o, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", borderRadius: 9,
            background: "var(--bg-2)", border: "1px solid var(--border)" }}>
            {o.i ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={`/jeu/icones/${o.i}`} alt="" width={26} height={26} style={{ flexShrink: 0, objectFit: "contain" }} />
            ) : <span style={{ width: 26, flexShrink: 0 }} />}
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{o.n}</span>
            {o.p != null && <b style={{ fontSize: 12.5, color: "var(--gold)", whiteSpace: "nowrap", ...NUM }}>{fmt(o.p)} perins</b>}
          </div>
        ))}
      </div>
      {vend.length > 24 && (
        <button onClick={() => setTout(!tout)} style={{ marginTop: 9, fontFamily: "inherit", cursor: "pointer", fontSize: 12,
          padding: "7px 13px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--orange)", fontWeight: 700 }}>
          {tout ? "Ne montrer que les 24 premiers" : `Montrer les ${vend.length - 24} autres`}
        </button>
      )}
    </>
  );
}

/**
 * L'étal à jetons, groupé par monnaie.
 *
 * C'est la mécanique maison d'AirFlyff : on paie avec un OBJET (jeton rouge,
 * nucléus, médaille de donjon) et pas avec des perins. Le client dit ce qui est
 * en vente et contre quoi, mais PAS combien il en faut — cette quantité est
 * décidée côté serveur. On l'écrit noir sur blanc plutôt que d'afficher une
 * colonne vide qui laisserait croire que c'est gratuit.
 */
function TrocEtal({ troc }: { troc: Troc[] }) {
  const [tout, setTout] = useState(false);
  const groupes = useMemo(() => {
    const m = new Map<string, Troc[]>();
    for (const t of troc) {
      const l = m.get(t.m) ?? [];
      l.push(t);
      m.set(t.m, l);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [troc]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {groupes.map(([monnaie, liste]) => {
        const montres = tout ? liste : liste.slice(0, 10);
        return (
          <div key={monnaie}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
              {liste[0].mi ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={`/jeu/icones/${liste[0].mi}`} alt="" width={22} height={22} style={{ objectFit: "contain" }} />
              ) : null}
              <b style={{ fontSize: 12.5, color: "var(--gold)" }}>contre du {monnaie}</b>
              <span style={{ fontSize: 11, color: "var(--text-muted)", ...NUM }}>{liste.length}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {montres.map((t, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, padding: "5px 10px",
                  borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                  {t.i ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={`/jeu/icones/${t.i}`} alt="" width={18} height={18} style={{ objectFit: "contain" }} />
                  ) : null}
                  {t.n}
                </span>
              ))}
              {!tout && liste.length > 10 && (
                <span style={{ fontSize: 11.5, padding: "5px 10px", color: "var(--text-muted)", ...NUM }}>
                  + {liste.length - 10}
                </span>
              )}
            </div>
          </div>
        );
      })}
      {troc.length > 10 && (
        <button onClick={() => setTout(!tout)} style={{ justifySelf: "start", fontFamily: "inherit", cursor: "pointer", fontSize: 12,
          padding: "7px 13px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--orange)", fontWeight: 700 }}>
          {tout ? "Replier l'étal" : "Tout montrer"}
        </button>
      )}
      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
        Le client dit contre quoi ça s&apos;échange, jamais <b>combien</b> il en faut : cette quantité est fixée
        côté serveur. Vérifie le tarif dans la fenêtre du PNJ avant de farmer.
      </p>
    </div>
  );
}

/** Une recette : ce que tu donnes, ce que tu récupères. */
function Craft({ craft }: { craft: Recette[] }) {
  /**
   * Le piège du couturier, généralisé.
   *
   * Chez Karlagarfeld, quatre coffrets différents demandent EXACTEMENT les mêmes
   * ingrédients. En jeu, une fenêtre d'échange ne peut proposer qu'un seul
   * résultat pour une entrée donnée : les suivants sont probablement
   * inatteignables. Plutôt que d'écrire ça en dur pour ce PNJ, on le détecte —
   * la même collision existe ailleurs, et elle réapparaîtra au prochain patch.
   */
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
    <div style={{ display: "grid", gap: 9 }}>
      {collisions > 0 && (
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "11px 13px", borderRadius: 10,
          background: "rgba(255,210,74,.07)", border: "1px solid color-mix(in srgb, var(--gold) 30%, transparent)" }}>
          <Icon name="alert" size={15} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, lineHeight: 1.55 }}>
            <b style={NUM}>{collisions}</b> de ces recettes réclament <b>exactement</b> les mêmes ingrédients
            qu&apos;une autre. Une fenêtre d&apos;échange ne rend qu&apos;un résultat par entrée : en jeu, tu
            n&apos;obtiendras probablement que le premier. Teste avec un exemplaire avant de farmer la pile.
          </span>
        </div>
      )}
      {craft.map((r, i) => (
        <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: r.e.length ? 8 : 0 }}>
            {r.i ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={`/jeu/icones/${r.i}`} alt="" width={26} height={26} style={{ flexShrink: 0, objectFit: "contain" }} />
            ) : <Icon name="package" size={20} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
            <b className="font-heading" style={{ fontSize: 13, color: "var(--green)" }}>{r.s ?? (r.l || "Résultat non nommé")}</b>
          </div>
          {r.e.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {r.e.map((e, j) => (
                <span key={j} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 7, background: "var(--bg-3)",
                  border: "1px solid var(--border)", color: "var(--text-muted)", ...NUM }}>
                  {e.n} ×{fmt(e.q)}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** La fiche ouverte : qui c'est, où il est, et tout ce qu'il propose. */
function FichePnj({ v, fiche, onFermer }: { v: Vignette; fiche: Fiche | null; onFermer: () => void }) {
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
            {v.quetes > 0 && <Pastille texte={`${v.quetes} quête${v.quetes > 1 ? "s" : ""} à rendre`} couleur="var(--gold)" />}
          </div>
          {v.quoi && <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>{v.quoi}</p>}
          {!v.ville && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, margin: "8px 0 0" }}>
              Les cartes du client ne le posent nulle part : soit il n&apos;est pas placé sur cette version, soit son
              emplacement est décidé côté serveur. On préfère te le dire plutôt que d&apos;inventer une ville.
            </p>
          )}
          <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 10, opacity: .8, fontFamily: "monospace" }}>
            {v.cle}{v.srt ? ` · ${v.srt}` : ""}
          </div>
        </div>
      </div>

      {!fiche ? (
        <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Ce qu&apos;il propose se charge…</div>
      ) : (
        <>
          {fiche.craft.length > 0 && (
            <>
              <SousTitre icon="hammer" texte="Ce qu'il fabrique pour toi" compte={fiche.nbCraftTotal} />
              <Craft craft={fiche.craft} />
              {fiche.nbCraftTotal > fiche.craft.length && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 9 }}>
                  {fiche.nbCraftTotal - fiche.craft.length} autres recettes chez lui ne sont pas détaillées ici.
                </p>
              )}
            </>
          )}

          {fiche.craftEteints > 0 && (
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 14, padding: "11px 13px", borderRadius: 10,
              background: "rgba(255,90,90,.07)", border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)" }}>
              <Icon name="alert" size={15} style={{ color: "var(--red)", flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                <b style={{ ...NUM }}>{fiche.craftEteints}</b> recette{fiche.craftEteints > 1 ? "s" : ""} existe{fiche.craftEteints > 1 ? "nt" : ""} dans
                le client mais {fiche.craftEteints > 1 ? "sont" : "est"} <b>éteinte{fiche.craftEteints > 1 ? "s" : ""}</b> chez lui :
                l&apos;équipe a commenté la ligne au lieu de supprimer la recette. Ne compte pas dessus.
              </span>
            </div>
          )}

          {fiche.troc.length > 0 && (
            <>
              <SousTitre icon="coins" texte="Ce qu'il te donne contre des jetons" compte={fiche.troc.length} />
              <TrocEtal troc={fiche.troc} />
            </>
          )}

          {fiche.vend.length > 0 && (
            <>
              <SousTitre icon="basket" texte="Ce qu'il te vend en perins" compte={fiche.vend.length} />
              <Vente vend={fiche.vend} />
            </>
          )}

          {fiche.craft.length === 0 && fiche.vend.length === 0 && fiche.troc.length === 0 && (
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
              Le client ne lui attache ni inventaire de vente écrit noir sur blanc, ni recette.
              {v.quetes > 0 && ` Il sert de point d'arrivée à ${v.quetes} quête${v.quetes > 1 ? "s" : ""}.`}
              {" "}Beaucoup de marchands vendent « toute une catégorie » au lieu d&apos;une liste d&apos;objets : ce
              genre d&apos;étal ne peut pas être énuméré depuis les fichiers.
            </p>
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

export function AnnuairePnj() {
  useCardFx();
  const [annuaire, setAnnuaire] = useState<Vignette[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [portraits, setPortraits] = useState(0);
  const [q, setQ] = useState("");
  /** `ou` retient DEPUIS QUELLE section la fiche a été ouverte : sans ça, changer
   *  de métier dans le rail laisserait la fiche d'un autre métier affichée. */
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
   *  C'est la question qu'on se pose en vidant son sac — « qui prend ça ? » —
   *  et elle ne tombe dans aucune des familles du client. */
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
      clef: "chercher", titre: "Chercher quelqu'un", sous: "Par nom, métier ou ville", icon: "search",
      compte: annuaire?.length ?? null,
      contenu: choix && choix.ou === "chercher"
        ? <FichePnj v={choix.v} fiche={fiches[choix.v.cle] ?? null} onFermer={fermer} />
        : (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Angie, couturier, Flarine…"
              style={{ width: "100%", padding: "10px 13px", borderRadius: 10, background: "var(--bg-2)",
                border: "1px solid var(--border)", color: "var(--text)", fontFamily: "inherit", fontSize: 13.5, marginBottom: 13 }} />
            {clef(q).length < 2
              ? <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                  Tape deux lettres. Tu peux chercher un nom (« Bobochan »), un métier (« joaillier »,
                  « armurier »), une ville (« Saincity ») ou une monnaie (« jeton rouge », « nucléus ») —
                  les quatre marchent.
                </p>
              : <Grille liste={trouves} onOuvrir={ouvrir("chercher")} vide={`Personne ne correspond à « ${q} ».`} />}
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
      <PageHeader icon="users" title="Les PNJ d'AirFlyff"
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
                Le client d&apos;AirFlyff porte 131 portraits de dialogue que rien n&apos;affichait. On ne les a pas
                attribués à la ressemblance : c&apos;est le jeu qui dit, PNJ par PNJ, quel fichier lui appartient —
                {" "}<b>121 des 131</b> trouvent ainsi leur propriétaire, {portraits ? <b style={NUM}>{portraits}</b> : "une partie"} se
                retrouvent sur cette page. Les prix sont ceux du client, en perins.
              </>
            }
          />
        }
      />

      <div className="glass-card" style={{ padding: "14px 16px", marginTop: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Icon name="info" size={15} style={{ color: "var(--blue)", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          Deux réserves qu&apos;on assume. Un étal de marchand est parfois écrit « toute cette catégorie » au lieu
          d&apos;une liste d&apos;objets : ces inventaires-là ne peuvent pas être énumérés, et le PNJ apparaît alors
          sans article. Et la ville vient des cartes du client : quand elle manque, c&apos;est que rien ne l&apos;y
          place — pas qu&apos;il n&apos;existe pas.
        </p>
      </div>

      <style>{`
        .pnj-grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:10px}
        .pnj-vignette{transition:border-color .15s,background .15s}
        .pnj-vignette:hover{border-color:var(--orange);background:rgba(255,140,26,.06)}
        @media(max-width:520px){.pnj-grille{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}
