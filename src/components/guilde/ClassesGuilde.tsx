"use client";
import { ClassLogo } from "@/components/ClassLogo";
import { Icon } from "@/components/Icon";
import { TitreStaff } from "@/components/staff/TitreStaff";
import { CLASS_NAMES } from "@/data/classes";
import { nomClasse } from "@/lib/mesures";

/**
 * LES CLASSES DE LA GUILDE — la répartition, puis qui joue quoi.
 *
 * C'était la vue « Les classes » du Suivi des bras droits (/suivi). Information Guilde
 * montre la même chose à tous les membres (SPEC-INFORMATION-GUILDE §2.3) : une seule
 * brique pour les deux, sinon les deux répartitions divergeraient au premier réglage.
 * Elle ne lit que le pseudo et les persos — rien de ce que le Suivi sait de plus.
 *
 * `titre` : le titre de la répartition, qui ouvre la section quand elle est seule.
 */
export type MembreClasses = {
  pseudo: string;
  persos: { nom: string; classe: string; niveau: number; prestige: number; principal: boolean }[];
};

/* Le plancher à 1,5 % rend visible une très petite part ; un vrai zéro, lui, n'a pas de
   barre — sa note le dit en mots (« personne ne la joue »). */
export function Jauge({ part }: { part: number }) {
  return <span aria-hidden="true" className="gn-j-piste">{part > 0 && <span className="gn-j-jauge" style={{ width: `${Math.max(1.5, Math.min(100, part * 100))}%` }} />}</span>;
}

export function ClassesGuilde({ membres, titre = "La répartition" }: { membres: MembreClasses[]; titre?: string }) {
  const persos = membres.flatMap((m) => m.persos.map((p) => ({ ...p, pseudo: m.pseudo })));
  /* LES HUIT CLASSES, même vides : une classe que personne ne joue est justement ce
     qu'on cherche en composant. Triées par nombre, comme la répartition de l'accueil. */
  const parClasse = CLASS_NAMES.map((nom) => {
    const l = persos.filter((p) => nomClasse(p.classe) === nomClasse(nom))
      .sort((a, b) => b.prestige - a.prestige || b.niveau - a.niveau || a.nom.localeCompare(b.nom, "fr"));
    const prestiges = l.map((p) => p.prestige);
    return {
      nom, persos: l,
      moyenne: l.length ? prestiges.reduce((a, b) => a + b, 0) / l.length : 0,
      max: l.length ? Math.max(...prestiges) : 0,
    };
  }).sort((a, b) => b.persos.length - a.persos.length);
  const max = Math.max(1, ...parClasse.map((c) => c.persos.length));
  const total = persos.length;
  const pFr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

  return (
    <>
      <TitreStaff icon="sword-cross" sous={`${total} perso${total > 1 ? "s" : ""} déclaré${total > 1 ? "s" : ""}, dont ${persos.filter((p) => p.principal).length} principaux. La barre compare à la classe la plus jouée ; le pourcentage est celui du total.`}>{titre}</TitreStaff>
      <div className="gn-carte">
        <div className="gn-j-bloc">
          {parClasse.map((c) => (
            <div key={c.nom} className="gn-j-ligne">
              <span className="gn-j-lab"><ClassLogo name={c.nom} size={20} /><span className="gn-j-lab-t">{nomClasse(c.nom)}</span></span>
              <span className="gn-j-mid"><Jauge part={c.persos.length / max} />{c.persos.length === 0 && <span className="gn-j-note">personne ne la joue</span>}</span>
              <span className="gn-j-chif"><b>{c.persos.length}</b></span>
              <span className="gn-j-pc">{total ? Math.round((c.persos.length / total) * 100) : 0} %</span>
            </div>
          ))}
        </div>
      </div>

      <TitreStaff icon="users" sous="Qui joue quoi, du prestige le plus haut au plus bas. L'étoile marque le perso principal.">Les persos par classe</TitreStaff>
      <div className="gn-suivi-classes">
        {parClasse.filter((c) => c.persos.length).map((c) => (
          <div key={c.nom} className="glass-card fx-card" style={{ padding: "14px 15px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
              <ClassLogo name={c.nom} size={26} />
              <span className="font-heading" style={{ fontSize: 15, fontWeight: 700 }}>{nomClasse(c.nom)}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>P{pFr(c.moyenne)} en moyenne · P{c.max} max.</span>
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              {c.persos.map((p) => (
                <div key={`${p.pseudo}|${p.nom}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", minWidth: 0 }}>
                  <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{p.nom}</span>
                  {p.principal && <span title="Personnage principal" style={{ display: "inline-flex", color: "var(--gold)", flexShrink: 0 }}><Icon name="star" size={11} /></span>}
                  <span style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{p.pseudo}</span>
                  <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>niv {p.niveau} · <b style={{ color: "var(--text)" }}>P{p.prestige}</b></span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
