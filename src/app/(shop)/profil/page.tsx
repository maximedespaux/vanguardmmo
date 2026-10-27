"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { ClassLogo } from "@/components/ClassLogo";

/**
 * MON PROFIL — un seul espace pour ce qui concerne le membre lui-même.
 *
 * La donnée existait déjà, dispersée : l'identité vient de Discord, les personnages
 * du builder.
 *
 * Une seule PAGE avec des sections ancrées, et non une page par section : chaque
 * bloc tient en quelques lignes. Les sections « Mes commandes » et « Mes mouvements
 * de périns » sont parties avec la Boutique, le 2026-10-21 ; leurs lignes restent en
 * base.
 */

type Profil = {
  identite: { pseudo: string; role: string; membreDepuis: string; verifieLe: string | null; partageBuild: boolean; lienBuild: string | null };
  compteurs: { personnages: number; stuffs: number };
  personnages: { id: string; name: string; class: string; level: number; prestige: number; isMain: boolean; stuffs: number }[];
};

const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: "informations", label: "Mes informations", icon: "user" },
  { id: "personnages", label: "Mes personnages", icon: "sword-cross" },
];

const jour = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function ProfilPage() {
  const [p, setP] = useState<Profil | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [actif, setActif] = useState("informations");

  useEffect(() => {
    fetch("/api/profil")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setP)
      .catch(() => setErr("Ton profil n'a pas pu être chargé."));
  }, []);

  // La section courante se met en avant à mesure qu'on descend : sans ça, la
  // colonne de gauche ne sert qu'au premier clic.
  useEffect(() => {
    if (!p) return;
    const obs = SECTIONS.map((s) => {
      const el = document.getElementById(s.id);
      if (!el) return null;
      const o = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) setActif(s.id); }, { rootMargin: "-15% 0px -75%" });
      o.observe(el);
      return o;
    });
    return () => obs.forEach((o) => o?.disconnect());
  }, [p]);

  return (
    <>
      <PageHeader icon="user" title="Mon profil" subtitle="Tes personnages et tes informations, au même endroit." />

      <style>{`
        .pf-wrap { display:grid; grid-template-columns:248px minmax(0,1fr); gap:20px; align-items:start; }
        .pf-side { position:sticky; top:14px; background:var(--bg-2); border:1px solid var(--border); border-radius:14px; padding:8px; display:flex; flex-direction:column; gap:2px; }
        .pf-side a { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:9px; color:var(--text-muted); text-decoration:none; font-size:13.5px; }
        .pf-side a:hover { background:var(--bg-3); color:var(--text); }
        .pf-side a[data-on="1"] { background:rgba(var(--gn-lueur-rgb),.12); color:var(--gn-accent); font-weight:600; }
        .pf-side hr { border:0; border-top:1px solid var(--border); margin:6px 4px; }
        .pf-card { background:var(--bg-2); border:1px solid var(--border); border-radius:14px; padding:20px 22px; margin-bottom:18px; scroll-margin-top:16px; }
        .pf-h2 { display:flex; align-items:center; gap:9px; font-size:15px; font-weight:700; letter-spacing:.02em; text-transform:uppercase; color:var(--gn-accent); margin:0 0 4px; }
        .pf-sub { color:var(--text-muted); font-size:12.5px; margin:0 0 16px; }
        .pf-defs { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:14px; }
        .pf-def span { display:block; font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted); margin-bottom:4px; }
        .pf-def b { font-size:14.5px; font-weight:600; }
        .pf-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin-bottom:16px; }
        .pf-kpi { background:var(--bg-3); border:1px solid var(--border); border-radius:11px; padding:12px 14px; }
        .pf-kpi b { display:block; font-size:22px; color:var(--gn-accent-clair); font-variant-numeric:tabular-nums; line-height:1.2; }
        .pf-kpi span { font-size:11.5px; color:var(--text-muted); }
        .pf-ligne { display:flex; align-items:baseline; gap:8px; font-size:13px; padding:3px 0; color:#c9cbd4; }
        .pf-ligne b { color:var(--text); }
        .pf-vide { color:var(--text-muted); font-size:13.5px; }
        .pf-nb { font-variant-numeric:tabular-nums; }
        @media (max-width:860px) { .pf-wrap { grid-template-columns:1fr; } .pf-side { position:static; flex-direction:row; overflow-x:auto; } }
      `}</style>

      {err && <div className="pf-card"><p className="pf-vide">{err}</p></div>}
      {!p && !err && <div className="pf-card"><p className="pf-vide">Chargement…</p></div>}

      {p && (
        <div className="pf-wrap">
          <nav className="pf-side">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} data-on={actif === s.id ? "1" : "0"}>
                <Icon name={s.icon} size={15} />{s.label}
              </a>
            ))}
            <hr />
            {/* Ce qui existe déjà ailleurs : on y mène, on ne le recopie pas. */}
            <a href="/builder"><Icon name="sword-cross" size={15} />Mon build</a>
          </nav>

          <div>
            <section id="informations" className="pf-card">
              <h2 className="pf-h2"><Icon name="user" size={16} />Mes informations</h2>
              <p className="pf-sub">Ton pseudo et ton rôle viennent de Discord et sont resynchronisés à chaque connexion : ils ne se modifient pas ici.</p>
              <div className="pf-defs">
                <div className="pf-def"><span>Pseudo</span><b>{p.identite.pseudo}</b></div>
                <div className="pf-def"><span>Rôle</span><b>{p.identite.role}</b></div>
                <div className="pf-def"><span>Membre depuis</span><b>{jour(p.identite.membreDepuis)}</b></div>
                <div className="pf-def"><span>Build partagé</span><b>{p.identite.partageBuild ? "Oui" : "Non"}</b></div>
              </div>
            </section>

            <section id="personnages" className="pf-card">
              <h2 className="pf-h2"><Icon name="sword-cross" size={16} />Mes personnages</h2>
              <p className="pf-sub">Ils viennent du Stuff Builder : c&apos;est là qu&apos;on les ajoute et qu&apos;on les modifie.</p>
              <div className="pf-kpis">
                <div className="pf-kpi"><b>{p.compteurs.personnages}</b><span>personnages</span></div>
                <div className="pf-kpi"><b>{p.compteurs.stuffs}</b><span>stuffs montés</span></div>
              </div>
              {!p.personnages.length && <p className="pf-vide">Aucun personnage enregistré. <a href="/builder" style={{ color: "var(--gn-accent)" }}>Monter un build →</a></p>}
              {p.personnages.map((c) => (
                <div key={c.id} className="pf-ligne" style={{ alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <ClassLogo name={c.class} size={26} />
                  <b>{c.name}</b>
                  {c.isMain && <span style={{ fontSize: 10.5, color: "var(--gn-accent)", fontWeight: 700 }}>PRINCIPAL</span>}
                  <span className="pf-nb">niveau {c.level} · prestige {c.prestige}</span>
                  <span style={{ marginLeft: "auto", color: c.stuffs ? "var(--text-muted)" : "var(--red)" }}>
                    {c.stuffs ? `${c.stuffs} stuff${c.stuffs > 1 ? "s" : ""}` : "aucun stuff"}
                  </span>
                </div>
              ))}
            </section>

          </div>
        </div>
      )}
    </>
  );
}
