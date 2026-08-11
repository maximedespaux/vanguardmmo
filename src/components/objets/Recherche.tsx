"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { IconeObjet } from "./IconeObjet";
import { classeFr, COULEUR_GRADE, emblemeClasse, FAMILLES, penyas, type Famille, type ObjetFiche } from "./vocabulaire";

/**
 * CHERCHER UN OBJET — le catalogue du client du jeu, 12 134 lignes.
 *
 * Rien n'arrive en bloc : le catalogue pèse 3 Mo, la route en renvoie 50 lignes
 * à la fois. On ne pagine pas non plus, exprès — au-delà de cinquante réponses
 * la bonne façon d'avancer est d'affiner le mot-clé, pas de tourner des pages.
 * Le compte total est affiché pour qu'on sache qu'on n'a pas tout vu.
 *
 * La frappe est amortie de 220 ms. Sans ça, taper « epee de luzaka » lançait
 * quatorze requêtes dont treize jetées, et les réponses arrivaient dans le
 * désordre : c'est le `jeton` qui écarte celles qui reviennent trop tard.
 */

type Reponse = {
  objets: ObjetFiche[]; total: number; montres: number;
  familles: Record<string, number>;
  catalogue: { objets: number; genere: string };
};

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

export function RechercheObjets({ depart = "" }: { depart?: string }) {
  useCardFx();
  const [q, setQ] = useState(depart);
  const [famille, setFamille] = useState<Famille | "">("");
  const [grade, setGrade] = useState<"" | "Unique" | "Ultime">("");
  const [niveau, setNiveau] = useState("");
  const [avecBonus, setAvecBonus] = useState(false);
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
    const d = await fetch(`/api/objets?${p}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    // Une réponse qui arrive après la suivante ne doit pas l'écraser.
    if (mien !== jeton.current) return;
    setR(d); setCharge(true);
  }, [q, famille, grade, niveau, avecBonus]);

  useEffect(() => { const t = setTimeout(chercher, 220); return () => clearTimeout(t); }, [chercher]);

  const filtre = Boolean(q.trim() || famille || grade || niveau || avecBonus);
  const familles = useMemo(() => r?.familles ?? {}, [r]);

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
              style={{ ...champ, width: 66, textAlign: "center", padding: "9px 6px", fontVariantNumeric: "tabular-nums" }} />
          </span>
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <Pastille on={!famille} onClick={() => setFamille("")}>Tout</Pastille>
          {FAMILLES.map((f) => (
            <Pastille key={f.clef} on={famille === f.clef} onClick={() => setFamille(famille === f.clef ? "" : f.clef)}>
              <Icon name={f.icon} size={13} />
              {f.label}
              {familles[f.clef] ? (
                <span style={{ fontVariantNumeric: "tabular-nums", opacity: famille === f.clef ? 0.7 : 0.55 }}>{familles[f.clef]}</span>
              ) : null}
            </Pastille>
          ))}
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 11 }}>
          <Pastille on={grade === "Unique"} couleur={COULEUR_GRADE.Unique} onClick={() => setGrade(grade === "Unique" ? "" : "Unique")}>Unique</Pastille>
          <Pastille on={grade === "Ultime"} couleur={COULEUR_GRADE.Ultime} onClick={() => setGrade(grade === "Ultime" ? "" : "Ultime")}>Ultime</Pastille>
          <Pastille on={avecBonus} onClick={() => setAvecBonus(!avecBonus)}>
            <Icon name="sparkles" size={13} /> Qui portent des bonus
          </Pastille>
          {filtre && (
            <button onClick={() => { setQ(""); setFamille(""); setGrade(""); setNiveau(""); setAvecBonus(false); }}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icon name="x" size={13} /> Tout remettre à zéro
            </button>
          )}
        </div>
      </div>

      {/* Le compte : combien on montre, combien il y en a. Sans ça, cinquante
          lignes laissent croire qu'il n'y en a que cinquante. */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5, color: "var(--text-muted)", flexWrap: "wrap" }}>
        {!charge && !r ? "Recherche…" : r ? (
          <>
            <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{r.total.toLocaleString("fr-FR")}</b>
            {r.total === 1 ? "objet trouvé" : "objets trouvés"}
            {r.total > r.montres && <span>· les {r.montres} plus proches sont affichés, affine le nom pour voir les autres</span>}
            <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              catalogue du client : {r.catalogue.objets.toLocaleString("fr-FR")} objets nommés
            </span>
          </>
        ) : "La recherche n’a pas répondu."}
      </div>

      {r && r.objets.length === 0 && (
        <div className="glass-card" style={{ padding: "26px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
          <Icon name="search" size={22} style={{ opacity: 0.5 }} />
          <p style={{ margin: "9px 0 0" }}>Rien sous ce nom. Essaie un mot plus court : la recherche cherche dans le nom, pas dans la description.</p>
          <p style={{ margin: "6px 0 0", fontSize: 12.5 }}>992 objets du client n’ont aucun nom français : ceux-là ne sont pas cherchables, et n’auraient rien à montrer.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(268px,1fr))", gap: 10 }}>
        {r?.objets.map((o) => <Carte key={o.i} o={o} />)}
      </div>
    </div>
  );
}

/** Une ligne de résultat : de quoi reconnaître la pièce sans ouvrir la fiche. */
function Carte({ o }: { o: ObjetFiche }) {
  const couleur = o.g ? COULEUR_GRADE[o.g] : null;
  const emb = emblemeClasse(o.cl);
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
          {o.nr ? <b style={{ fontVariantNumeric: "tabular-nums", color: "var(--text)", fontWeight: 600 }}>niv. {o.nr}</b> : null}
          {emb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={emb} alt={classeFr(o.cl) ?? ""} title={classeFr(o.cl) ?? ""} width={15} height={15} style={{ objectFit: "contain" }} />
          )}
        </span>
        {(o.dn || o.px || o.b?.length) && (
          <span style={{ display: "flex", gap: 9, fontSize: 11, color: "var(--text-muted)", marginTop: 4, flexWrap: "wrap", fontVariantNumeric: "tabular-nums" }}>
            {o.dn ? <span>{o.f === "arme" ? "Dégâts" : "Déf."} <b style={{ color: "var(--text)" }}>{o.dn}{o.dx && o.dx !== o.dn ? `–${o.dx}` : ""}</b></span> : null}
            {o.b?.length ? <span><Icon name="sparkles" size={10} /> {o.b.length} bonus</span> : null}
            {o.px ? <span style={{ marginLeft: "auto", color: "var(--gold)" }}>{penyas(o.px)}</span> : null}
          </span>
        )}
      </span>
    </Link>
  );
}
