"use client";
import { Icon } from "@/components/Icon";
import { NomObjet } from "@/components/objets/NomObjet";

/**
 * Les briques d'une recette : un objet avec sa quantité, un statut, une carte.
 *
 * Séparées de l'écran principal parce qu'elles servent partout — dans le fait
 * maison, dans les comptoirs à jetons, dans la recherche et dans l'arbre. Une
 * recette redessinée à quatre endroits divergerait au premier ajustement.
 */

export type Piece = { n: string | null; ic: string | null; q: number; c?: number | null };
export type Recette = {
  id: number;
  g: string;
  st: "on" | "off" | "orphelin";
  pnj: string[];
  off: string[];
  e: Piece[];
  s: Piece[];
  alea: boolean;
  mec: "fonte" | "transfert" | null;
};

/** Ce que veut dire chaque statut, en une phrase, sans jargon de fichier. */
export const STATUT = {
  on: { mot: "Jouable", couleur: "var(--green)", dit: "Un PNJ propose cet échange." },
  off: {
    mot: "Éteinte", couleur: "var(--red)",
    dit: "La ligne est commentée chez le PNJ : la recette existe dans le client mais personne ne la propose. Farmer pour elle, c’est farmer dans le vide.",
  },
  orphelin: {
    mot: "Sans PNJ", couleur: "var(--gold)",
    dit: "La recette est écrite mais aucun PNJ ne la porte. Rien ne prouve qu’elle soit atteignable en jeu.",
  },
} as const;

/**
 * Un objet du jeu : son icône, son nom, sa quantité.
 *
 * Les icônes du client font 32 px : agrandies elles bavent, donc `pixelated` —
 * laid en flou, net en pixels, et c'est ce qu'on a sous les yeux en jeu. Quand le
 * nom français manque (34 objets référencés n'en ont pas), on le dit plutôt que
 * d'afficher un identifiant interne que personne ne peut chercher.
 */
export function Objet({ p, gros = false }: { p: Piece; gros?: boolean }) {
  const t = gros ? 34 : 26;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
      {/* ┌──────── LES 236 OBJETS DE CETTE PAGE ÉTAIENT DES CULS-DE-SAC ────────┐
             Mesuré dans le DOM : /crafts servait 236 icônes d'objet et ZÉRO
             poignée de bulle, quand /donjons en sert 63 et une fiche de monstre
             4 sur ses 4 butins. C'était le seul écart du site, et sur la page qui
             nomme le PLUS d'objets — chaque « ce que tu donnes » aligne ses
             ingrédients. `Arbre.tsx`, juste à côté, employait bien `NomObjet` ;
             ce fichier-ci, qui rend les 834 échanges, ne l'employait pas du tout.

             Devant « Rune d'énergie d'Isthar ×700 », la question suivante est
             « où ça tombe » et « je peux le demander à la guilde ? ». Les trois
             réponses existaient — fiche, provenance, requête — et elles étaient
             hors d'atteinte ici. Demande de Maxime, mot pour mot : « pour passer
             une requête il faut plus de liens logiques ».

             L'ICÔNE ENTRE DANS LA POIGNÉE au lieu de rester à côté : c'est
             `NomObjet` qui la pose, et la survoler ouvre donc la bulle elle
             aussi — la cible est plus grande, ce qui compte au doigt.

             UN OBJET SANS NOM NE DEVIENT PAS UN LIEN. Le client en porte, et une
             bulle sur « objet sans nom français » mènerait à une fiche vide :
             il garde son gabarit d'icône et son italique, comme avant.        */}
      {p.n ? (
        <span style={{ minWidth: 0, flex: 1, fontSize: gros ? 14.5 : 13, fontWeight: gros ? 700 : 500, wordBreak: "break-word" }}>
          <NomObjet nom={p.n} icone={p.ic} taille={t} />
        </span>
      ) : (
        <>
          {p.ic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/jeu/icones/${p.ic}`} alt="" width={t} height={t}
              style={{ width: t, height: t, flexShrink: 0, objectFit: "contain", imageRendering: "pixelated" }} />
          ) : (
            <span style={{ width: t, height: t, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              <Icon name="package" size={Math.round(t * 0.6)} />
            </span>
          )}
          <span style={{ minWidth: 0, flex: 1, fontSize: gros ? 14 : 12.5, fontStyle: "italic", color: "var(--text-muted)" }}>
            objet sans nom français dans le client
          </span>
        </>
      )}
      {p.q > 1 && (
        <b style={{ flexShrink: 0, fontSize: gros ? 14 : 13, fontVariantNumeric: "tabular-nums", color: "var(--gold)" }}>
          ×{p.q.toLocaleString("fr-FR")}
        </b>
      )}
      {p.c != null && p.c < 100 && (
        <span style={{ flexShrink: 0, fontSize: 12, fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "var(--text-muted)" }}>
          {p.c.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}&nbsp;%
        </span>
      )}
    </span>
  );
}

/** La pastille de statut. Le titre porte la phrase longue : on n'alourdit pas la carte. */
export function Pastille({ st }: { st: Recette["st"] }) {
  const s = STATUT[st];
  return (
    <span title={s.dit} style={{
      flexShrink: 0, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px",
      padding: "2px 9px", borderRadius: 20, cursor: "help",
      color: s.couleur,
      background: `color-mix(in srgb, ${s.couleur} 11%, transparent)`,
      border: `1px solid color-mix(in srgb, ${s.couleur} 40%, transparent)`,
    }}>{s.mot}</span>
  );
}

/**
 * Une recette, telle qu'on la lit : ce qu'on obtient d'abord, ce que ça coûte
 * ensuite. L'inverse (les entrants d'abord) obligeait à descendre pour savoir de
 * quoi on parle.
 *
 * `surPnj` permet de rebondir : cliquer le nom du PNJ montre tout ce qu'il
 * propose. Sans ça on lisait une recette isolée sans savoir ce qu'il y avait à
 * côté, sur le même écran de dialogue.
 */
export function CarteRecette({ r, surPnj }: { r: Recette; surPnj?: (nom: string) => void }) {
  const porteurs = r.pnj.length ? r.pnj : r.off;
  return (
    <div className="fx-card" style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg-2)", overflow: "hidden" }}>

      <div style={{ padding: "11px 13px", background: "var(--bg-3)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 6 }}>
            {r.s.map((p, i) => <Objet key={i} p={p} gros />)}
          </span>
          <Pastille st={r.st} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
          {porteurs.length ? (
            <span style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <Icon name="user" size={12} />
              {r.st === "off" ? "éteinte chez" : "chez"}
              {porteurs.map((nom) => (
                surPnj ? (
                  <button key={nom} onClick={() => surPnj(nom)} style={{
                    background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12,
                    fontWeight: 700, color: "var(--gn-accent)", textDecoration: "underline", textDecorationStyle: "dotted",
                  }}>{nom}</button>
                ) : <b key={nom} style={{ color: "var(--gn-accent)" }}>{nom}</b>
              ))}
            </span>
          ) : r.st === "on" ? (
            // Le statut dit « branchée », mais le nom du PNJ n'est pas résolu en
            // français dans notre relevé. Écrire « aucun PNJ » ici serait un mensonge.
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon name="user" size={12} /> chez un PNJ dont le nom n’est pas résolu</span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon name="ghost" size={12} /> aucun PNJ ne la porte</span>
          )}
          {r.alea && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--purple)" }}>
              <Icon name="sparkles" size={12} /> un seul résultat, tiré au sort
            </span>
          )}
          {r.mec === "fonte" && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon name="flame" size={12} /> passe par la fenêtre de fonte</span>}
          {r.mec === "transfert" && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon name="swap" size={12} /> transfert d’enchantement</span>}
        </div>
      </div>

      <div style={{ padding: "9px 13px 11px" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--text-muted)", marginBottom: 7 }}>
          ce que tu donnes
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {r.e.map((p, i) => <Objet key={i} p={p} />)}
        </div>
      </div>
    </div>
  );
}

/** Une liste de recettes en colonnes, avec un mot quand il n'y a rien. */
export function Recettes({ liste, surPnj, vide = "Rien ici." }: { liste: Recette[]; surPnj?: (n: string) => void; vide?: string }) {
  if (!liste.length) {
    return <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{vide}</p>;
  }
  return (
    <div className="cr-grille">
      {liste.map((r) => <CarteRecette key={r.id} r={r} surPnj={surPnj} />)}
    </div>
  );
}
