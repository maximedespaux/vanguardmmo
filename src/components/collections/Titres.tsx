"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { Chercher, Pastille, Source } from "./briques";
import { clef, GROUPES, nb, type Titre } from "./donnees";

/**
 * LES 143 TITRES D'HONNEUR — « lequel je peux viser maintenant ».
 *
 * Le site n'en connaissait que 25. Les 143 empilés en une liste ne valent pas
 * mieux : personne ne lit 143 lignes pour trouver son prochain objectif. D'où
 * deux décisions.
 *
 * D'abord le REGROUPEMENT. Le client range ses titres en cinq catégories
 * techniques — « objets utilisés », « compteur atteint » — qui mettent une
 * promotion de classe et une pilule dans le même sac. On regroupe par ce qu'on
 * FAIT pour l'avoir : passer un palier, chasser une espèce, accumuler des
 * points d'arène. Chaque pastille porte son compte, donc on choisit sans
 * ouvrir.
 *
 * Ensuite l'ORDRE. Par défaut, du moins exigeant au plus exigeant : c'est la
 * réponse à « lequel est à ma portée ». L'ordre alphabétique reste disponible
 * pour l'autre question, « où est passé tel titre ».
 */
export function Titres({ titres, source }: { titres: Titre[]; source: string }) {
  const [q, setQ] = useState("");
  const [groupe, setGroupe] = useState<string>("");
  const [alpha, setAlpha] = useState(false);

  const comptes = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of titres) c[t.g] = (c[t.g] ?? 0) + 1;
    return c;
  }, [titres]);

  const vus = useMemo(() => {
    const k = clef(q.trim());
    // On cherche dans le nom du titre ET dans l'objectif : « pilule » doit
    // ramener « Accro aux Pilules Grises », dont le nom ne dit pas tout.
    const liste = titres.filter((t) =>
      (!groupe || t.g === groupe) &&
      (!k || clef(t.n).includes(k) || clef(t.q).includes(k) || clef(t.ou ?? "").includes(k)));
    if (alpha) return [...liste].sort((a, b) => a.n.localeCompare(b.n, "fr"));
    // « Du plus accessible » trie par seuil — mais les titres REMIS par un objet
    // à usage unique ont tous un seuil de 1, et remontaient donc en tête : la
    // liste s'ouvrait sur les trente-quatre titres qu'on ne peut PAS viser. Ils
    // passent en fin de liste, ce qui rend enfin l'ordre utile.
    const rang = (t: Titre) => (t.g === "remis" ? 1 : 0);
    return [...liste].sort((a, b) =>
      rang(a) - rang(b) || a.s - b.s || a.n.localeCompare(b.n, "fr"));
  }, [titres, q, groupe, alpha]);

  const g = GROUPES.find((x) => x.cle === groupe);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 11 }}>
        <Chercher valeur={q} sur={setQ} invite="Un titre, un objet, une espèce, un lieu" />
        <button onClick={() => setAlpha(!alpha)} className="vg-select"
          style={{ backgroundImage: "none", paddingRight: 12, display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Icon name="sort" size={14} style={{ color: "var(--gn-accent)" }} />
          {alpha ? "Par ordre alphabétique" : "Du plus accessible"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 5 }}>
        <Pastille on={!groupe} onClick={() => setGroupe("")}>Tout <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.6 }}>{titres.length}</span></Pastille>
        {GROUPES.map((x) => (
          <Pastille key={x.cle} on={groupe === x.cle} onClick={() => setGroupe(groupe === x.cle ? "" : x.cle)}>
            <Icon name={x.icon as IconName} size={13} />
            {x.label}
            <span style={{ fontVariantNumeric: "tabular-nums", opacity: groupe === x.cle ? 0.7 : 0.55 }}>{comptes[x.cle] ?? 0}</span>
          </Pastille>
        ))}
      </div>

      {/* Ce que la pastille choisie veut dire. Le compte seul ne l'explique pas :
          « Remis par un objet · 34 » se lisait comme un objectif farmable. */}
      <p style={{ margin: "0 0 13px", fontSize: 12, color: "var(--text-muted)", minHeight: 17 }}>
        {g ? g.quoi : `${nb(vus.length)} titres — huit façons de les décrocher.`}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(272px,1fr))", gap: 9 }}>
        {vus.map((t) => <Carte key={t.n + t.q} t={t} />)}
      </div>

      {vus.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "26px 0" }}>
          Rien sous ce mot. La recherche lit le nom du titre et son objectif, pas la description en jeu.
        </p>
      )}

      <Source fichier={source}
        avertissement={<>Le client donne une <b>clef</b> de condition (<code style={{ fontSize: 11 }}>HS_PVP_POINT03</code>), pas une phrase : les objectifs ci-dessus sont notre lecture de ces clefs. Les seuils, eux, sont bien ceux du client.</>} />
    </div>
  );
}

/** Une carte de titre : le nom, ce qu'il demande, et de quoi le reconnaître. */
function Carte({ t }: { t: Titre }) {
  const g = GROUPES.find((x) => x.cle === t.g);
  const corps = (
    <>
      <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-3)", border: "1px solid var(--border)", overflow: "hidden" }}>
        {t.ic ? (
          // Les icônes du client font 32 px : agrandies elles bavent, d'où le
          // rendu en pixels — c'est ce que le joueur a sous les yeux en jeu.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/jeu/icones/${t.ic}`} alt="" width={28} height={28} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
        ) : t.emb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.emb} alt="" width={26} height={26} style={{ objectFit: "contain" }} />
        ) : (
          <Icon name={(g?.icon ?? "trophy") as IconName} size={16} style={{ color: "var(--text-muted)" }} />
        )}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span className="font-heading" style={{ display: "block", fontSize: 13.5, fontWeight: 700, lineHeight: 1.25, color: "var(--gold)" }}>
          {t.n}
        </span>
        <span style={{ display: "block", fontSize: 12, color: "var(--text)", marginTop: 2, lineHeight: 1.35 }}>{t.q}</span>
        {(t.niv || t.ou) && (
          <span style={{ display: "flex", gap: 9, flexWrap: "wrap", fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
            {t.niv ? <span style={{ fontVariantNumeric: "tabular-nums" }}>niv. {t.niv}</span> : null}
            {t.ou ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="map-pin" size={11} />{t.ou}</span> : null}
          </span>
        )}
      </span>
      {t.oid ? <Icon name="chevron-right" size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} /> : null}
    </>
  );

  const style: React.CSSProperties = {
    display: "flex", gap: 10, alignItems: "flex-start", padding: 10, borderRadius: 12,
    background: "var(--bg-2)", border: "1px solid var(--border)", textDecoration: "none", color: "var(--text)",
  };

  // Quand on connaît l'objet, la carte mène à sa fiche : « 200 000 sucettes »
  // ne dit pas où on en trouve, la fiche le dit.
  return t.oid
    ? <Link href={`/objets/${t.oid}`} className="fx-card" style={style}>{corps}</Link>
    : <div className="fx-card" style={style}>{corps}</div>;
}
