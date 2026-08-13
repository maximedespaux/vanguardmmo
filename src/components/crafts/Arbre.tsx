"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { NomObjet } from "@/components/objets/NomObjet";

/**
 * L'ARBRE DU FARM — 39 fabrications, 115 ingrédients, et le chemin entre les deux.
 *
 * Ces recettes ne sont NULLE PART dans les fichiers d'échange du client : elles
 * vivent dans les descriptions françaises des ingrédients, sous la forme « Objet
 * nécessaire à la création de X (monstres et lieu) ». C'est la seule source pour
 * 38 des 39.
 *
 * L'arbre a plusieurs étages, et c'est tout l'intérêt : quand la source d'un
 * ingrédient dit « Crafting Masque Saint City », l'ingrédient n'est pas un butin,
 * c'est le produit d'un AUTRE craft. Une liste plate ferait croire qu'on va
 * chercher tout ça sur des monstres, alors qu'un tiers des lignes se fabrique.
 * D'où la descente (« ça se fabrique aussi ») et la remontée (« sert à »).
 */

export type Ingredient = {
  n: string; ic: string | null; ou: string; maison: boolean;
  /** Clef de l'arbre qui produit cet ingrédient, ou `null` s'il se farme. */
  vers: string | null;
  /** Quantité, quand la recette chiffrée du client la donne. Souvent absente. */
  q: number | null;
};
export type ArbreCraft = {
  cle: string; nom: string; pnj: string | null; st: string | null;
  recette: number | null; ing: Ingredient[]; utilisePar: string[];
};

const cle = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Les libellés viennent de phrases de description : certains démarrent en minuscule. */
const titre = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Vignette({ ic, taille = 30 }: { ic: string | null; taille?: number }) {
  if (!ic) {
    return <span style={{ width: taille, height: taille, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}><Icon name="package" size={Math.round(taille * 0.6)} /></span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/jeu/icones/${ic}`} alt="" width={taille} height={taille}
    style={{ width: taille, height: taille, flexShrink: 0, objectFit: "contain", imageRendering: "pixelated" }} />;
}

/**
 * LA PILE DES INGRÉDIENTS — et la correction d'une image qui mentait.
 *
 * ┌──────────────────── CE QU'ELLE REMPLACE ────────────────────┐
 * │ La liste des 39 fabrications, et l'en-tête de celle qu'on    │
 * │ regarde, affichaient `actif.ing[0].ic` : l'icône du PREMIER  │
 * │ INGRÉDIENT, posée à gauche du nom du PRODUIT. On lisait donc │
 * │ « Masque PvE Rang 2 » à côté d'un cœur de géant, « Potion    │
 * │ Anti-vampire » à côté d'un œuf de Poisifurm, « Statuette de  │
 * │ Kailun » à côté d'une tête de statue. Vérifié sur les 39 :   │
 * │ aucune n'était l'image du produit.                          │
 * │                                                             │
 * │ ET ON NE PEUT PAS LA CORRIGER PAR LA BONNE IMAGE : ces 39    │
 * │ noms ne viennent pas du catalogue d'objets, ils viennent de  │
 * │ phrases de description (« nécessaire à la création de X »).  │
 * │ Croisés avec les 8 507 noms d'objets du dépôt, ils donnent   │
 * │ ZÉRO correspondance — « masque PvE Rang 1 » n'existe sous ce │
 * │ nom dans aucune table d'objets. Il n'y a pas d'icône de      │
 * │ produit à brancher, et il n'y en aura pas.                   │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Alors on montre ce qu'on a VRAIMENT : les icônes des ingrédients, empilées et
 * décalées. Trois images qui se chevauchent se lisent « un tas de matériaux »,
 * jamais « cet objet-là » — la forme dit d'elle-même qu'il y en a plusieurs, et
 * c'est exactement ce qu'une ligne de craft contient. Les icônes, elles, sont
 * justes : ce sont celles du relevé, et le tas se compte sur `ing`.
 */
function PileIngredients({ ing, taille = 22, combien = 3 }: {
  ing: Ingredient[]; taille?: number; combien?: number;
}) {
  const avecIcone = ing.filter((g) => g.ic).slice(0, combien);
  if (!avecIcone.length) {
    return <Vignette ic={null} taille={taille} />;
  }
  // Le chevauchement d'un tiers : assez pour que la pile se voie comme une pile,
  // assez peu pour qu'on distingue encore chaque icône.
  const pas = Math.round(taille * 0.66);
  return (
    <span
      // Le titre ET l'étiquette : le survol pour la souris, l'étiquette pour un
      // lecteur d'écran, qui ne dirait sinon rien du tout de ces images décoratives.
      title={`${ing.length} ingrédient${ing.length > 1 ? "s" : ""}`}
      aria-label={`${ing.length} ingrédient${ing.length > 1 ? "s" : ""}`}
      role="img"
      style={{ position: "relative", flexShrink: 0, display: "block", height: taille, width: pas * (avecIcone.length - 1) + taille }}
    >
      {avecIcone.map((g, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={g.n} src={`/jeu/icones/${g.ic}`} alt="" width={taille} height={taille}
          style={{
            position: "absolute", left: i * pas, top: 0, width: taille, height: taille,
            objectFit: "contain", imageRendering: "pixelated",
            // La dernière posée passe DEVANT : sans ça la pile se lit à l'envers et
            // la première icône, celle qu'on distingue le mieux, finit dessous.
            zIndex: avecIcone.length - i,
            filter: i ? "drop-shadow(-1px 0 0 var(--bg-2))" : undefined,
          }} />
      ))}
    </span>
  );
}

export function ArbreDuFarm({ arbres, carteRecette }: {
  arbres: ArbreCraft[];
  /** Rend la recette chiffrée correspondante. Dépliée SUR PLACE, pas dans une
   *  fenêtre : une modale posée dans un panneau qui porte un `transform` s'y
   *  retrouve enfermée, et on l'a déjà payé une fois sur ce site. */
  carteRecette?: (id: number) => React.ReactNode;
}) {
  // Le chemin parcouru, pas juste la sélection : on descend d'un cran par clic et
  // on doit pouvoir revenir sur ses pas sans perdre l'endroit d'où l'on venait.
  const [chemin, setChemin] = useState<string[]>([arbres[0]?.cle ?? ""]);
  const [q, setQ] = useState("");
  const [chiffree, setChiffree] = useState(false);

  const parCle = useMemo(() => new Map(arbres.map((a) => [a.cle, a])), [arbres]);
  const actif = parCle.get(chemin[chemin.length - 1]) ?? arbres[0];

  // La recherche porte aussi sur les ingrédients : on cherche « Koori » sans savoir
  // dans quelle fabrication il entre — c'est justement la question.
  const liste = useMemo(() => {
    const k = cle(q.trim());
    if (!k) return arbres;
    return arbres.filter((a) => cle(a.nom).includes(k) || a.ing.some((g) => cle(g.n).includes(k) || cle(g.ou).includes(k)));
  }, [arbres, q]);

  // Changer de fabrication referme la recette chiffrée : celle de la précédente
  // n'a rien à faire sous la suivante.
  const aller = (c: string) => { setChiffree(false); setChemin((p) => (p[p.length - 1] === c ? p : [...p, c])); };
  const remonter = (i: number) => { setChiffree(false); setChemin((p) => p.slice(0, i + 1)); };

  if (!actif) return null;

  const seFabriquent = actif.ing.filter((g) => g.vers).length;

  return (
    <div className="cr-arbre">

      <div style={{ display: "grid", gap: 9, alignContent: "start" }}>
        <label style={{ position: "relative", display: "block" }}>
          <Icon name="search" size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--text-muted)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="un objet, un monstre, une zone…"
            style={{
              width: "100%", padding: "9px 10px 9px 31px", fontFamily: "inherit", fontSize: 12.5,
              background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, color: "var(--text)",
            }} />
        </label>

        <div style={{ maxHeight: 520, overflowY: "auto", display: "grid", gap: 5, paddingRight: 3 }}>
          {liste.map((a) => {
            const on = a.cle === actif.cle;
            return (
              <button key={a.cle} onClick={() => setChemin([a.cle])} style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", cursor: "pointer",
                fontFamily: "inherit", padding: "7px 9px", borderRadius: 9,
                background: on ? "rgba(255,140,26,.1)" : "var(--bg-2)",
                border: `1px solid ${on ? "var(--orange)" : "var(--border)"}`,
              }} onClickCapture={() => setChiffree(false)}>
                <PileIngredients ing={a.ing} taille={22} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? "var(--orange)" : "var(--text)" }}>
                  {titre(a.nom)}
                </span>
                <span style={{ flexShrink: 0, fontSize: 11, fontVariantNumeric: "tabular-nums", color: "var(--text-muted)" }}>{a.ing.length}</span>
              </button>
            );
          })}
          {!liste.length && <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "6px 2px" }}>Aucune fabrication ne parle de ça.</p>}
        </div>
      </div>

      <div style={{ minWidth: 0 }}>

        {chemin.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 11, fontSize: 12 }}>
            {chemin.map((c, i) => (
              <span key={c + i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <Icon name="chevron-right" size={12} style={{ color: "var(--text-muted)" }} />}
                <button onClick={() => remonter(i)} disabled={i === chemin.length - 1} style={{
                  background: "none", border: "none", padding: 0, fontFamily: "inherit", fontSize: 12,
                  cursor: i === chemin.length - 1 ? "default" : "pointer",
                  fontWeight: i === chemin.length - 1 ? 700 : 500,
                  color: i === chemin.length - 1 ? "var(--text)" : "var(--orange)",
                  textDecoration: i === chemin.length - 1 ? "none" : "underline",
                  textDecorationStyle: "dotted",
                }}>{titre(parCle.get(c)?.nom ?? c)}</button>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 11, paddingBottom: 11, borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
          {/* Quatre icônes ici et trois dans la liste : l'en-tête a la place, et la
              pile y sert de rappel de ce que le tas contient avant que l'œil descende
              dans l'arbre. Voir la note de `PileIngredients` : ce n'est PAS l'image du
              produit, elle n'existe pas. */}
          <PileIngredients ing={actif.ing} taille={30} combien={4} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-heading" style={{ fontSize: 16, fontWeight: 700 }}>{titre(actif.nom)}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {actif.ing.length} ingrédient{actif.ing.length > 1 ? "s" : ""}
              {seFabriquent > 0 && ` · dont ${seFabriquent} qui se fabrique${seFabriquent > 1 ? "nt" : ""} aussi`}
            </div>
          </div>
          {actif.pnj && (
            <span style={{ flexShrink: 0, fontSize: 11.5, textAlign: "right", color: "var(--text-muted)" }}>
              chez<br /><b style={{ color: "var(--orange)" }}>{actif.pnj}</b>
            </span>
          )}
        </div>

        {actif.recette != null && carteRecette && (
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => setChiffree((v) => !v)} className="fx-card" style={{
              display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12.5, padding: "9px 11px", borderRadius: 10,
              background: "rgba(74,222,128,.07)", border: "1px solid color-mix(in srgb, var(--green) 35%, transparent)", color: "var(--text)",
            }}>
              <Icon name="check" size={15} style={{ color: "var(--green)", flexShrink: 0 }} />
              <span style={{ flex: 1 }}>Cette fabrication a aussi une <b>recette chiffrée</b> dans le client — quantités et PNJ confirmés.</span>
              <Icon name={chiffree ? "chevron-up" : "chevron-down"} size={14} style={{ color: "var(--green)", flexShrink: 0 }} />
            </button>
            {chiffree && <div style={{ marginTop: 9 }}>{carteRecette(actif.recette)}</div>}
          </div>
        )}

        {/* L'ARBRE, DESSINÉ. Voir la note `Branche` plus bas : les traits sont en CSS,
            les étages se déplient sur place, et chaque ingrédient passe par
            <NomObjet> — sa fiche et sa provenance au survol. */}
        <Branche noeud={actif} parCle={parCle} niveau={0} />
        <p style={{ margin: "9px 0 0", fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span><Icon name="pickaxe" size={11} style={{ marginRight: 4 }} />se ramasse</span>
          <span><Icon name="hammer" size={11} style={{ marginRight: 4, color: "var(--orange)" }} />se fabrique — clique pour ouvrir l&apos;étage</span>
        </p>

        {actif.utilisePar.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--text-muted)", marginBottom: 7 }}>
              ce que ça sert à fabriquer
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {actif.utilisePar.map((c) => (
                <button key={c} onClick={() => aller(c)} style={{
                  display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12,
                  padding: "6px 10px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)",
                }}>
                  <Icon name="arrow-up" size={12} style={{ color: "var(--orange)" }} />
                  {titre(parCle.get(c)?.nom ?? c)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* LA MISE EN GARDE RESTE : elle protège d'une erreur coûteuse — partir farmer
            un exemplaire d'un ingrédient dont on aura besoin de mille. Ce qui part,
            c'est la provenance de la lacune (« sauf les masques PvE, dont la recette
            chiffrée existe par ailleurs ») : le bouton vert « recette chiffrée »
            au-dessus le dit déjà, et seulement quand c'est vrai. */}
        <p style={{ marginTop: 12, fontSize: 11.5, lineHeight: 1.55, color: "var(--text-muted)" }}>
          Une quantité absente est <b>inconnue</b>, pas égale à un : les descriptions du client
          ne les donnent pas.
        </p>
      </div>

      <style>{`
        .cr-arbre{display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px;align-items:start}
        @media(max-width:880px){.cr-arbre{grid-template-columns:1fr}}

        /* ── LES TRAITS DE L'ARBRE ──
           TOUT EN CSS ET PAS EN SVG : une carte d'ingredient porte du texte qui se
           replie, une icone et une bulle au survol — dans un SVG il aurait fallu
           mesurer chaque hauteur a l'execution et redessiner a chaque repli. Le trait
           en CSS se contente de suivre ce que la mise en page a decide.
           CHAQUE NOEUD DESSINE SES DEUX TRAITS LUI-MEME : ::before est le morceau de
           TRONC qui le traverse, ::after son COUDE vers la carte. Le tronc n'est donc
           PAS une bordure de la liste — c'est le point qui compte.
           Une premiere version posait le tronc sur la <ul> et masquait sa retombee
           avec un rectangle de la couleur du fond. Ça ne pouvait pas tenir : le fond
           reel depend du panneau qui contient l'arbre, et un jour ou l'autre le
           masque se serait vu comme une barre pale. Ici le dernier noeud arrete son
           propre tronc a la hauteur de son coude, et il n'y a rien a masquer.
             · dernier noeud     : du haut jusqu'au coude, puis plus rien ;
             · les autres        : de bord a bord, gouttiere comprise ;
             · le premier        : demarre a son propre haut, pas 7 px au-dessus. */
        .cr-tronc{list-style:none;margin:0;padding:0 0 0 20px}
        .cr-noeud{position:relative;margin-top:7px}
        .cr-noeud:first-child{margin-top:0}
        .cr-noeud::before{content:"";position:absolute;left:-20px;top:-7px;height:29px;width:1px;
          background:var(--border)}
        .cr-noeud:first-child::before{top:0;height:22px}
        .cr-noeud:not(:last-child)::before{height:calc(100% + 7px)}
        .cr-noeud::after{content:"";position:absolute;left:-20px;top:22px;width:20px;height:1px;
          background:var(--border)}
        .cr-carte{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:10px;
          background:var(--bg-2);border:1px solid var(--border)}
        /* Un ingredient qui se fabrique est une porte : on le montre. */
        .cr-porte{cursor:pointer;width:100%;text-align:left;font-family:inherit;color:var(--text);
          border-color:color-mix(in srgb, var(--orange) 38%, var(--border));transition:border-color .15s}
        .cr-porte:hover{border-color:var(--orange)}
      `}</style>
    </div>
  );
}

/**
 * UNE BRANCHE DE L'ARBRE — le produit, puis ses ingrédients, puis les leurs.
 *
 * ┌──────────── CE QUI A CHANGÉ, ET POURQUOI ÇA COMPTE ────────────┐
 * │ C'ÉTAIT UNE LISTE À PLAT. Sept lignes empilées, avec un bouton  │
 * │ « ça se fabrique » qui REMPLAÇAIT tout l'écran par la sous-      │
 * │ recette. On perdait donc de vue ce qu'on fabriquait au moment    │
 * │ précis où l'on descendait — et un arbre dont on ne voit qu'un    │
 * │ étage à la fois n'est plus un arbre, c'est un couloir.           │
 * │ Ici l'étage s'ouvre SOUS son ingrédient, décalé et relié par un  │
 * │ trait : le chemin complet reste à l'écran. C'est la seule chose  │
 * │ qu'on vient chercher dans un arbre de craft — combien de niveaux │
 * │ me séparent d'un objet que je peux ramasser.                    │
 * └────────────────────────────────────────────────────────────────┘
 *
 * CHAQUE INGRÉDIENT PASSE PAR <NomObjet> : sa fiche du catalogue et sa provenance,
 * dans une bulle qui ne charge qu'au survol. Un arbre peut porter quinze
 * ingrédients ; quinze `OuTrouver` montés au chargement auraient coûté plus que la
 * page entière. La demande de Maxime — « mène à sa provenance » — est donc servie
 * sans que rien ne parte avant qu'on le demande.
 *
 * `PROFONDEUR` ferme deux portes d'un coup. La première est un CYCLE : rien ne
 * garantit que les descriptions du client ne se renvoient pas l'une à l'autre, et
 * un arbre qui se replie sur lui-même fige l'onglet. La seconde est la LISIBILITÉ :
 * au quatrième décalage, la carte n'a plus de largeur sur un téléphone.
 */
const PROFONDEUR = 3;

function Branche({ noeud, parCle, niveau }: {
  noeud: ArbreCraft; parCle: Map<string, ArbreCraft>; niveau: number;
}) {
  return (
    <ul className="cr-tronc">
      {noeud.ing.map((g) => (
        <Feuille key={g.n} g={g} parCle={parCle} niveau={niveau} />
      ))}
    </ul>
  );
}

/** Un ingrédient : sa carte, et l'étage qu'il ouvre quand il se fabrique. */
function Feuille({ g, parCle, niveau }: {
  g: Ingredient; parCle: Map<string, ArbreCraft>; niveau: number;
}) {
  const sous = g.vers ? parCle.get(g.vers) : undefined;
  /* Ouvrable seulement si la sous-recette existe ET qu'on n'est pas au bout : au
     dernier étage on garde la carte, sans la promesse d'une porte qui ne s'ouvre pas. */
  const ouvrable = Boolean(sous) && niveau < PROFONDEUR - 1;
  const [ouvert, setOuvert] = useState(false);

  const corps = (
    <>
      <Vignette ic={g.ic} taille={26} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>
          <NomObjet nom={g.n} icone={null} />
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
          <Icon name={sous ? "hammer" : "pickaxe"} size={10} style={{ flexShrink: 0, color: sous ? "var(--orange)" : undefined }} />
          {g.ou}
        </span>
      </span>
      {g.q != null && (
        <b style={{ flexShrink: 0, fontSize: 12.5, fontVariantNumeric: "tabular-nums", color: "var(--gold)" }}>×{g.q.toLocaleString("fr-FR")}</b>
      )}
      {ouvrable && (
        <Icon name={ouvert ? "chevron-up" : "chevron-down"} size={13} style={{ flexShrink: 0, color: "var(--orange)" }} />
      )}
    </>
  );

  return (
    <li className="cr-noeud">
      {/* Un <div> quand la carte n'ouvre rien : <NomObjet> pose un déclencheur de
          bulle, et l'imbriquer dans un <button> ferait un bouton dans un bouton —
          HTML invalide, et le clic de la bulle remonterait au parent. */}
      {ouvrable
        ? <div className="cr-carte cr-porte" role="button" tabIndex={0} aria-expanded={ouvert}
            onClick={() => setOuvert((v) => !v)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOuvert((v) => !v); } }}>
            {corps}
          </div>
        : <div className="cr-carte">{corps}</div>}
      {ouvert && sous && <Branche noeud={sous} parCle={parCle} niveau={niveau + 1} />}
    </li>
  );
}
