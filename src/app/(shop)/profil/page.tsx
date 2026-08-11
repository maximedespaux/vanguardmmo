"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { ClassLogo } from "@/components/ClassLogo";

/**
 * MON PROFIL — un seul espace pour ce qui concerne le membre lui-même.
 *
 * La donnée existait déjà, dispersée : l'identité vient de Discord, les commandes
 * de la Boutique, les mouvements de périns de la banque, les personnages du
 * builder. « Où en est ma commande ? » demandait trois écrans.
 *
 * Une seule PAGE avec des sections ancrées, et non une page par section : chaque
 * bloc tient en quelques lignes, en éclater cinq ferait cinq destinations vides.
 * Les sections qui existent déjà ailleurs (la Boutique, les Messages, le Builder)
 * ne sont pas recopiées ici — elles sont liées.
 */

type Ligne = { id: string; item: string | null; quantite: number; categorie: string | null; statut: string; prix: number | null; personnage: string | null };
type Commande = {
  id: string; cree: string; statut: string; origine: string | null; paiement: string;
  total: number | null; dateSouhaitee: string | null; rendezVous: string | null;
  aUnDetenteur: boolean; lignes: Ligne[];
};
type Profil = {
  bilan?: { servies: number; abandons: number; refus: number; conclues: number; tauxService: number | null; delaiMedianJours: number | null; perinsDepenses: number };
  identite: { pseudo: string; role: string; membreDepuis: string; verifieLe: string | null; partageBuild: boolean; lienBuild: string | null };
  commandes: Commande[];
  compteurs: { commandes: number; enCours: number; personnages: number; stuffs: number };
  mouvements: { id: string; type: string; item: string | null; amount: number; status: string; description: string | null; createdAt: string }[];
  personnages: { id: string; name: string; class: string; level: number; prestige: number; isMain: boolean; stuffs: number }[];
};

/** Libellés des états, du point de vue de celui qui a commandé — pas du staff. */
const ETAT: Record<string, { txt: string; couleur: string }> = {
  PENDING: { txt: "En attente d'une réponse", couleur: "var(--gold)" },
  ACCEPTE_ACHAT: { txt: "Acceptée — à récupérer", couleur: "var(--green)" },
  ACCEPTE_DETTE: { txt: "Acceptée — à régler", couleur: "var(--green)" },
  EN_ECHANGE: { txt: "Échange en cours", couleur: "var(--blue)" },
  REMIS: { txt: "Remise", couleur: "var(--text-muted)" },
  REFUSE: { txt: "Refusée", couleur: "var(--red)" },
  ANNULE: { txt: "Annulée", couleur: "var(--text-muted)" },
};
const MOUVEMENT: Record<string, string> = { DETTE: "Dette", REMBOURSEMENT: "Remboursement", ACHAT: "Achat", VENTE: "Vente" };

const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: "informations", label: "Mes informations", icon: "user" },
  { id: "commandes", label: "Mes commandes", icon: "cart" },
  { id: "personnages", label: "Mes personnages", icon: "sword-cross" },
  { id: "perins", label: "Mes mouvements de périns", icon: "coins" },
];

const jour = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const perins = (n: number | null) => (n == null ? "—" : n.toLocaleString("fr-FR") + " périns");

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
      <PageHeader icon="user" title="Mon profil" subtitle="Tes commandes, tes personnages et tes informations, au même endroit." />

      <style>{`
        .pf-wrap { display:grid; grid-template-columns:248px minmax(0,1fr); gap:20px; align-items:start; }
        .pf-side { position:sticky; top:14px; background:var(--bg-2); border:1px solid var(--border); border-radius:14px; padding:8px; display:flex; flex-direction:column; gap:2px; }
        .pf-side a { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:9px; color:var(--text-muted); text-decoration:none; font-size:13.5px; }
        .pf-side a:hover { background:var(--bg-3); color:var(--text); }
        .pf-side a[data-on="1"] { background:color-mix(in srgb, var(--orange) 12%, transparent); color:var(--orange); font-weight:600; }
        .pf-side hr { border:0; border-top:1px solid var(--border); margin:6px 4px; }
        .pf-card { background:var(--bg-2); border:1px solid var(--border); border-radius:14px; padding:20px 22px; margin-bottom:18px; scroll-margin-top:16px; }
        .pf-h2 { display:flex; align-items:center; gap:9px; font-size:15px; font-weight:700; letter-spacing:.02em; text-transform:uppercase; color:var(--orange); margin:0 0 4px; }
        .pf-sub { color:var(--text-muted); font-size:12.5px; margin:0 0 16px; }
        .pf-defs { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:14px; }
        .pf-def span { display:block; font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:var(--text-muted); margin-bottom:4px; }
        .pf-def b { font-size:14.5px; font-weight:600; }
        .pf-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin-bottom:16px; }
        .pf-kpi { background:var(--bg-3); border:1px solid var(--border); border-radius:11px; padding:12px 14px; }
        .pf-kpi b { display:block; font-size:22px; color:var(--orange); font-variant-numeric:tabular-nums; line-height:1.2; }
        .pf-kpi span { font-size:11.5px; color:var(--text-muted); }
        .pf-cmd { border:1px solid var(--border); border-radius:11px; padding:13px 15px; margin-bottom:9px; background:var(--bg-3); }
        .pf-cmd-h { display:flex; align-items:center; gap:9px; flex-wrap:wrap; margin-bottom:8px; }
        .pf-etat { font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.5px; padding:3px 9px; border-radius:99px; }
        .pf-ligne { display:flex; align-items:baseline; gap:8px; font-size:13px; padding:3px 0; color:#c9cbd4; }
        .pf-ligne b { color:var(--text); }
        .pf-vide { color:var(--text-muted); font-size:13.5px; }
        .pf-tab { width:100%; border-collapse:collapse; font-size:13px; }
        .pf-tab th { text-align:left; color:var(--orange); font-weight:700; padding:7px 10px; border-bottom:1px solid var(--border); white-space:nowrap; }
        .pf-tab td { padding:7px 10px; border-bottom:1px solid var(--border); vertical-align:top; }
        .pf-scroll { overflow-x:auto; }
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
            <a href="/boutique"><Icon name="cart" size={15} />Commander au coffre</a>
            <a href="/messages"><Icon name="chat" size={15} />Mes conversations</a>
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

            <section id="commandes" className="pf-card">
              <h2 className="pf-h2"><Icon name="cart" size={16} />Mes commandes</h2>
              <p className="pf-sub">Un panier vaut une commande. L&apos;état affiché est le moins avancé de ses lignes : tant qu&apos;une ligne attend, la commande attend.</p>
              <div className="pf-kpis">
                <div className="pf-kpi"><b>{p.compteurs.commandes}</b><span>au total</span></div>
                <div className="pf-kpi"><b>{p.compteurs.enCours}</b><span>en cours</span></div>
                {/* Le devenir des commandes conclues. « 1 au total » ne disait rien :
                    une servie, une abandonnée et une refusée comptaient pareil. */}
                {p.bilan && p.bilan.conclues > 0 && (
                  <>
                    <div className="pf-kpi"><b style={{ color: "var(--green)" }}>{p.bilan.servies}</b><span>servie{p.bilan.servies > 1 ? "s" : ""}</span></div>
                    <div className="pf-kpi"><b style={{ color: p.bilan.abandons ? "var(--red)" : undefined }}>{p.bilan.abandons}</b><span>abandonnée{p.bilan.abandons > 1 ? "s" : ""}</span></div>
                    {p.bilan.refus > 0 && <div className="pf-kpi"><b>{p.bilan.refus}</b><span>refusée{p.bilan.refus > 1 ? "s" : ""}</span></div>}
                  </>
                )}
              </div>
              {p.bilan && p.bilan.conclues > 0 && (
                <p className="pf-sub" style={{ marginTop: -6 }}>
                  {/* Le taux porte sur les commandes CONCLUES : l'inclure celles en cours
                      le ferait baisser à chaque nouvelle commande, ce qui ne veut rien dire. */}
                  <b style={{ color: "var(--text)" }}>{p.bilan.tauxService} %</b> de tes {p.bilan.conclues} commandes conclues ont abouti
                  {p.bilan.delaiMedianJours != null && <> · délai habituel <b style={{ color: "var(--text)" }}>{p.bilan.delaiMedianJours} j</b></>}
                  {p.bilan.perinsDepenses > 0 && <> · <b style={{ color: "var(--text)" }}>{p.bilan.perinsDepenses.toLocaleString("fr-FR")}</b> périns dépensés</>}
                </p>
              )}
              {!p.commandes.length && <p className="pf-vide">Tu n&apos;as encore rien commandé. <a href="/boutique" style={{ color: "var(--orange)" }}>Voir le coffre commun →</a></p>}
              {p.commandes.map((c) => {
                const e = ETAT[c.statut] ?? { txt: c.statut, couleur: "var(--text-muted)" };
                return (
                  <div key={c.id} className="pf-cmd">
                    <div className="pf-cmd-h">
                      <span className="pf-etat" style={{ color: e.couleur, background: `color-mix(in srgb, ${e.couleur} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${e.couleur} 40%, transparent)` }}>{e.txt}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{jour(c.cree)}</span>
                      {c.origine && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· {c.origine === "achat" ? "achat au coffre" : "sur mesure"}</span>}
                      {c.paiement === "troc" && <span style={{ fontSize: 12, color: "var(--purple)" }}>· troc</span>}
                      {c.total != null && <span className="pf-nb" style={{ marginLeft: "auto", fontWeight: 700 }}>{perins(c.total)}</span>}
                    </div>
                    {c.lignes.map((l) => (
                      <div key={l.id} className="pf-ligne">
                        <b>{l.item ?? "Objet"}</b>
                        {l.quantite > 1 && <span className="pf-nb">×{l.quantite}</span>}
                        {l.personnage && <span>· pour {l.personnage}</span>}
                        {l.statut !== c.statut && <span style={{ color: ETAT[l.statut]?.couleur }}>· {ETAT[l.statut]?.txt ?? l.statut}</span>}
                      </div>
                    ))}
                    {(c.rendezVous || c.dateSouhaitee) && (
                      <div style={{ marginTop: 7, fontSize: 12.5, color: "var(--text-muted)" }}>
                        {c.rendezVous ? `Rendez-vous en jeu : ${jour(c.rendezVous)}` : `Souhaitée pour le ${jour(c.dateSouhaitee)}`}
                        {!c.aUnDetenteur && c.statut === "PENDING" && " · personne ne s'est encore engagé à la fournir"}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            <section id="personnages" className="pf-card">
              <h2 className="pf-h2"><Icon name="sword-cross" size={16} />Mes personnages</h2>
              <p className="pf-sub">Ils viennent du Stuff Builder : c&apos;est là qu&apos;on les ajoute et qu&apos;on les modifie.</p>
              <div className="pf-kpis">
                <div className="pf-kpi"><b>{p.compteurs.personnages}</b><span>personnages</span></div>
                <div className="pf-kpi"><b>{p.compteurs.stuffs}</b><span>stuffs montés</span></div>
              </div>
              {!p.personnages.length && <p className="pf-vide">Aucun personnage enregistré. <a href="/builder" style={{ color: "var(--orange)" }}>Monter un build →</a></p>}
              {p.personnages.map((c) => (
                <div key={c.id} className="pf-ligne" style={{ alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <ClassLogo name={c.class} size={26} />
                  <b>{c.name}</b>
                  {c.isMain && <span style={{ fontSize: 10.5, color: "var(--orange)", fontWeight: 700 }}>PRINCIPAL</span>}
                  <span className="pf-nb">niveau {c.level} · prestige {c.prestige}</span>
                  <span style={{ marginLeft: "auto", color: c.stuffs ? "var(--text-muted)" : "var(--red)" }}>
                    {c.stuffs ? `${c.stuffs} stuff${c.stuffs > 1 ? "s" : ""}` : "aucun stuff"}
                  </span>
                </div>
              ))}
            </section>

            <section id="perins" className="pf-card">
              <h2 className="pf-h2"><Icon name="coins" size={16} />Mes mouvements de périns</h2>
              <p className="pf-sub">Les cinquante derniers, du plus récent au plus ancien.</p>
              {!p.mouvements.length ? <p className="pf-vide">Aucun mouvement enregistré.</p> : (
                <div className="pf-scroll">
                  <table className="pf-tab">
                    <thead><tr><th>Date</th><th>Type</th><th>Objet</th><th style={{ textAlign: "right" }}>Montant</th><th>État</th></tr></thead>
                    <tbody>
                      {p.mouvements.map((m) => (
                        <tr key={m.id}>
                          <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)" }}>{jour(m.createdAt)}</td>
                          <td>{MOUVEMENT[m.type] ?? m.type}</td>
                          <td>{m.item ?? m.description ?? "—"}</td>
                          <td className="pf-nb" style={{ textAlign: "right", fontWeight: 600 }}>{m.amount ? m.amount.toLocaleString("fr-FR") : "—"}</td>
                          <td style={{ color: "var(--text-muted)" }}>{m.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
