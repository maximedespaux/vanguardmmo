"use client";
import { useEffect, useState, type ReactNode } from "react";
import { PRESTIGE_COSTS, PRESTIGE_KEYS, prestigeNeed } from "@/data/prestige";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { VgSelect } from "@/components/VgSelect";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";

const fmt = (n: number) => n.toLocaleString("fr-FR");

/**
 * Le mot-clé qui retrouve la ressource dans le catalogue d'objets.
 *
 * Pourquoi une table et pas le nom affiché : le client n'écrit pas ces noms comme
 * le wiki de prestige. Le badge s'y appelle « Badge du Jardin Préstigieux » — avec
 * un « du » et un accent — et le badge de world boss « Badge Worldboss
 * Préstigieux », en un mot. Un lien bâti sur le nom affiché tombait donc sur zéro
 * résultat, ce qui est PIRE qu'une absence de lien : ça laisse croire que l'objet
 * n'existe pas dans le jeu.
 *
 * Les neuf valeurs ont été rejouées une à une contre /api/objets. Une seule ne
 * tenait pas la promesse : « jardin prestigieux » ramenait d'abord le TICKET
 * d'instance (« Jardin préstigieux (1h) ») et le badge en second. Le mot-clé porte
 * donc le mot « badge », et le badge revient seul.
 */
const RECHERCHE: Record<string, string> = {
  "Badge Jardin Prestigieux": "badge du jardin",
  "Nucléus neutre": "nucleus neutre",
  "Emblème de protection": "embleme de protection",
  "Badge de la Tour": "badge de la tour",
  "Périn": "perin",
  "Nucléus parfait": "nucleus parfait",
  "Badge World Boss prestigieux": "worldboss",
  "Badge de donjon mineur": "badge de donjon mineur",
  "Badge Donjon": "badge des donjons",
};

/**
 * OÙ EST LE MUR — la répartition d'une ressource sur les paliers demandés.
 *
 * Le total répond à « combien », jamais à « quand ». 75 badges du P1 au P10, ça
 * ressemble à un effort régulier ; en réalité le seul saut P9→P10 en réclame 25,
 * soit un tiers du tout. C'est le genre de rapport qu'un nombre ne dit pas et
 * qu'une longueur dit d'un coup d'œil.
 *
 * Les deux règles de la barre, les mêmes que partout sur le site :
 *  · UNE seule teinte — celle que la carte emploie déjà pour son chiffre. C'est la
 *    LONGUEUR qui porte la grandeur. Colorer par valeur ne marche pas : le vert et
 *    le doré de la charte ne se distinguent pas pour un daltonien protan.
 *  · Plancher à 1,5 %, sinon un petit palier perd sa barre et l'absence se lit
 *    comme une donnée manquante.
 *
 * Et si un seul palier réclame la ressource, il n'y a rien à comparer : on
 * n'affiche rien du tout plutôt qu'une barre pleine qui ferait croire à un maximum.
 */
function ParPalier({ cle, de, a, teinte }: { cle: string; de: number; a: number; teinte: string }) {
  const lignes: [number, number][] = [];
  for (let p = de; p < a; p++) {
    const v = PRESTIGE_COSTS[p]?.[cle];
    if (v) lignes.push([p, v]);
  }
  if (lignes.length < 2) return null;
  const haut = Math.max(...lignes.map(([, v]) => v));
  return (
    <div className="pr-palier">
      <div className="pr-palier-t">Réparti sur {lignes.length} paliers</div>
      {lignes.map(([p, v]) => (
        <div key={p} className="pr-palier-l">
          <span className="pr-palier-p">P{p}→{p + 1}</span>
          <span aria-hidden="true" className="pr-palier-b">
            <span style={{ width: `${Math.max(1.5, (v / haut) * 100)}%`, background: teinte }} />
          </span>
          <span className="pr-palier-v">{fmt(v)}</span>
        </div>
      ))}
    </div>
  );
}
// Icône d'une ressource : vraie image si présente (override connu, ou PNG déposé dans
// /public/assets/items/prestige/<slug>.png par l'admin) → sinon une icône SVG stylée en repli.
// Déposer un PNG au bon nom suffit à basculer sur la vraie icône, sans toucher au code.
const ICON_OVERRIDE: Record<string, string> = {
  "Périn": "/assets/items/prestige/perin.gif",
};
// Éléments d'un nucléus parfait (1 parfait = 1 nucléus au choix parmi ces 5).
const NUCLEUS_ELEMENTS: [string, string][] = [
  ["Feu", "/assets/items/prestige/nucleus-feu.png"],
  ["Eau", "/assets/items/prestige/nucleus-eau.png"],
  ["Foudre", "/assets/items/prestige/nucleus-foudre.png"],
  ["Vent", "/assets/items/prestige/nucleus-vent.png"],
  ["Terre", "/assets/items/prestige/nucleus-terre.png"],
];
const SVGBOX = { display: "inline-block", verticalAlign: "middle" } as const;
function slugify(k: string): string {
  return k.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function iconSrc(k: string): string {
  return ICON_OVERRIDE[k] ?? `/assets/items/prestige/${slugify(k)}.png`;
}
function svgFor(k: string, size: number) {
  const s = k.toLowerCase();
  const orb = (base: string, stops: [number, string][], ring: string) => {
    const gid = base + size;
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} style={SVGBOX}>
        <defs><radialGradient id={gid} cx="38%" cy="33%" r="75%">{stops.map(([o, c]) => <stop key={o} offset={`${o}%`} stopColor={c} />)}</radialGradient></defs>
        <circle cx="12" cy="12" r="9" fill={`url(#${gid})`} stroke={ring} strokeWidth="0.6" />
        <ellipse cx="9" cy="8.4" rx="2.6" ry="1.5" fill="#ffffff" opacity="0.5" />
      </svg>
    );
  };
  const medal = (base: string, ribbon: string, c1: string, c2: string, ring: string, emblem: ReactNode) => {
    const gid = base + size;
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} style={SVGBOX}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs>
        <path d="M8.4 2 H15.6 L14 8.4 H10 Z" fill={ribbon} />
        <circle cx="12" cy="14.6" r="6.6" fill={`url(#${gid})`} stroke={ring} strokeWidth="0.7" />
        {emblem}
      </svg>
    );
  };
  if (s.includes("parfait")) return orb("nuP", [[0, "#ffffff"], [32, "#a6ecff"], [58, "#c3a3ff"], [82, "#ff9ec7"], [100, "#ffce6b"]], "#e9c2ff");
  if (s.includes("feu")) return orb("nuFeu", [[0, "#fff0e0"], [55, "#ff8a4c"], [100, "#c0341a"]], "#ffb38a");
  if (s.includes("eau")) return orb("nuEau", [[0, "#eaffff"], [55, "#54c8ff"], [100, "#1f6fd0"]], "#a9e4ff");
  if (s.includes("foudre")) return orb("nuFou", [[0, "#fffbe0"], [55, "#ffd84a"], [100, "#caa00f"]], "#ffe98a");
  if (s.includes("vent")) return orb("nuVen", [[0, "#eafff4"], [55, "#56e0a8"], [100, "#1f9c6e"]], "#a9f0d2");
  if (s.includes("terre")) return orb("nuTer", [[0, "#f6ecde"], [55, "#caa06a"], [100, "#7d5a2e"]], "#e0c8a4");
  if (s.includes("nucl")) return orb("nuN", [[0, "#ffffff"], [45, "#d2d6dd"], [100, "#6b7280"]], "#9aa1ab");
  if (s.includes("embl")) return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={SVGBOX}>
      <defs><linearGradient id={`emb${size}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fb8ff" /><stop offset="1" stopColor="#2f6fd6" /></linearGradient></defs>
      <path d="M12 2.4 L20 5.2 V11 C20 16 16.5 19.6 12 21.8 C7.5 19.6 4 16 4 11 V5.2 Z" fill={`url(#emb${size})`} stroke="#a8ccff" strokeWidth="0.7" />
      <path d="M9 12 l2 2 3.6 -3.9" fill="none" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (s.includes("mineur")) return medal("bMin", "#0f6e5f", "#7fe6d4", "#1f9c84", "#2fbfa6", (
    <g fill="none" stroke="#e3fffa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.2" cy="12.6" r="2.2" /><path d="M11.8 14.2 L15.6 18 M14.2 16.6 L15.4 15.4 M15.6 18 L16.8 16.8" /></g>
  ));
  if (s.includes("jardin")) return medal("bJar", "#b06a14", "#FFD96B", "#E29A16", "#b07d16", (
    <path d="M8.6 17.6 L8.1 12.4 L10.2 14.2 L12 10.9 L13.8 14.2 L15.9 12.4 L15.4 17.6 Z" fill="#fff7df" />
  ));
  if (s.includes("tour")) return medal("bTou", "#27406e", "#a9c2e6", "#3a5a8a", "#7d9bc4", (
    <g><path d="M9.4 18 V12.2 H10.4 V11.2 H11.2 V12.2 H12.8 V11.2 H13.6 V12.2 H14.6 V18 Z" fill="#eef3fb" /><rect x="11.2" y="15" width="1.6" height="3" fill="#3a5a8a" /></g>
  ));
  if (s.includes("boss")) return medal("bBos", "#7a1828", "#e8788a", "#a82038", "#d05a6e", (
    <g><path d="M12 9.6 C9.6 9.6 8.1 11.1 8.1 13 C8.1 14.2 8.7 15 9.5 15.4 V17.6 H10.6 V16.4 H11.4 V17.6 H12.6 V16.4 H13.4 V17.6 H14.5 V15.4 C15.3 15 15.9 14.2 15.9 13 C15.9 11.1 14.4 9.6 12 9.6 Z" fill="#ffe9ec" /><circle cx="10.3" cy="12.8" r="1.05" fill="#a82038" /><circle cx="13.7" cy="12.8" r="1.05" fill="#a82038" /></g>
  ));
  if (s.includes("donjon")) return medal("bDon", "#46228a", "#b89ae0", "#6a3fb0", "#9a78d0", (
    <g fill="none" stroke="#f0e8fb"><path d="M8.2 18 V13.6 A3.8 3.8 0 0 1 15.8 13.6 V18" strokeWidth="1.3" /><path d="M10.3 11.6 V18 M12 10.7 V18 M13.7 11.6 V18 M8.2 18 H15.8" strokeWidth="1.1" /></g>
  ));
  if (s.includes("badge")) return medal("bGen", "#b06a14", "#FFD96B", "#E29A16", "#b07d16", (
    <path d="M12 11.1 l1.05 2.13 2.35 .34 -1.7 1.66 .4 2.34 -2.1 -1.1 -2.1 1.1 .4 -2.34 -1.7 -1.66 2.35 -.34 Z" fill="#fff7df" />
  ));
  if (s.includes("perin") || s.includes("périn")) return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={SVGBOX}>
      <defs><radialGradient id={`coin${size}`} cx="40%" cy="34%" r="72%"><stop offset="0" stopColor="#fff3c4" /><stop offset="60%" stopColor="#f4c542" /><stop offset="100%" stopColor="#c2871a" /></radialGradient></defs>
      <circle cx="12" cy="12" r="9" fill={`url(#coin${size})`} stroke="#b07d16" strokeWidth="0.7" />
      <text x="12" y="15.6" textAnchor="middle" fontSize="9" fontWeight="700" fill="#946410">P</text>
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#9aa1ab" strokeWidth="1.5" strokeLinejoin="round" style={SVGBOX}>
      <path d="M3.5 7 L12 3 L20.5 7 V17 L12 21 L3.5 17 Z" /><path d="M3.5 7 L12 11 L20.5 7 M12 11 V21" />
    </svg>
  );
}
function PrestigeIcon({ name, size = 22 }: { name: string; size?: number }) {
  // Repli robuste (compatible SSR) : on affiche l'icône SVG par défaut, et on précharge
  // la vraie image en arrière-plan. Si elle existe (override connu ou PNG déposé), on bascule
  // dessus → jamais d'image cassée, et le « drop to swap » fonctionne sans toucher au code.
  const override = ICON_OVERRIDE[name];
  const [dropped, setDropped] = useState<string | null>(null);
  useEffect(() => {
    if (override) return;
    let alive = true;
    const im = new Image();
    im.onload = () => { if (alive) setDropped(iconSrc(name)); };
    im.src = iconSrc(name);
    return () => { alive = false; };
  }, [name, override]);
  const src = override ?? dropped;
  if (src) return <img src={src} alt="" width={size} height={size} style={{ objectFit: "contain", display: "inline-block", verticalAlign: "middle" }} />;
  return svgFor(name, size);
}

export default function PrestigePage() {
  // Halo suivant le curseur + leger relief sur les .fx-card (cf. VgFx).
  useCardFx();
  const [cur, setCur] = useState(1);
  const [tgt, setTgt] = useState(10);
  const [have, setHave] = useState<Record<string, number>>({});
  const [showTable, setShowTable] = useState(false);

  const need = prestigeNeed(cur, tgt);
  const keys = PRESTIGE_KEYS.filter((k) => need[k]);
  const done = keys.filter((k) => (have[k] ?? 0) >= need[k]).length;
  const globalPct = keys.length ? Math.round((keys.reduce((s, k) => s + Math.min(1, (have[k] ?? 0) / need[k]), 0) / keys.length) * 100) : 0;

  return (
    <div style={{ padding: "24px 18px 60px", maxWidth: 1040, margin: "0 auto" }}>
      {/* La porte du désert du jeu, en fond d'en-tête : passer un prestige, c'est
          franchir une porte. Elle vient des écrans de générique du client
          (public/jeu/credits/) — les onze grandes images de ce dossier sont les
          seules du jeu sans logo ni barre de chargement incrustés, contrairement à
          celles de /jeu/chargement/, qu'il faut recadrer.
          Le bandeau restait le même que sur le guide : deux pages voisines de la
          même section portaient exactement la même image. */}
      <PageHeader art="/jeu/credits/shotcredit10.webp" banner="/assets/site/banners/banner-guides.webp" title="Calculateur de Prestige" subtitle="Ton prestige actuel, ta cible : le total des ressources de chaque palier." />
      <SectionTabs section="guides" />

      {/* Sélecteur */}
      <div className="glass-card fx-card" style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", padding: 18, marginBottom: 16 }}>
        <label style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Prestige actuel</div>
          <VgSelect full value={cur} onChange={(val) => { const v = +val; setCur(v); if (v >= tgt) setTgt(Math.min(10, v + 1)); }} options={[1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => ({ value: String(p), label: `Prestige ${p}` }))} />
        </label>
        <div style={{ display: "flex", alignItems: "center", paddingBottom: 8, color: "var(--orange)", fontSize: 22 }}>→</div>
        <label style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Prestige cible</div>
          <VgSelect full value={tgt} onChange={(v) => setTgt(+v)} options={[2, 3, 4, 5, 6, 7, 8, 9, 10].filter((p) => p > cur).map((p) => ({ value: String(p), label: `Prestige ${p}` }))} />
        </label>
      </div>

      {keys.length === 0 ? (
        <div className="glass-card fx-card" style={{ padding: 26, textAlign: "center", color: "var(--text-muted)" }}>Aucune donnée pour cet intervalle.</div>
      ) : (
        <>
          {/* Progression globale */}
          <div className="glass-card fx-card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9, flexWrap: "wrap", gap: 6 }}>
              <span className="font-heading" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14, color: "var(--orange)", textTransform: "uppercase", letterSpacing: 1 }}><Icon name="package" size={16} /> Pour passer de P{cur} à P{tgt}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{done}/{keys.length} ressources · <b style={{ color: globalPct === 100 ? "var(--green)" : "var(--orange)" }}>{globalPct}%</b></span>
            </div>
            <div style={{ height: 12, background: "var(--bg-3)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${globalPct}%`, background: globalPct === 100 ? "var(--green)" : "linear-gradient(90deg,#FFB552,#FF8C1A)", transition: "width .35s ease", boxShadow: "0 0 12px rgba(255,140,26,.4)" }} />
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>Total cumulé sur {tgt - cur} palier(s) · renseigne ce que tu as déjà pour suivre ton restant.</div>
          </div>

          {/* Grille des ressources */}
          <div className="pr-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12, marginBottom: 18 }}>
            {keys.map((k) => {
              const total = need[k]; const owned = have[k] ?? 0; const rem = Math.max(0, total - owned);
              const pct = Math.min(100, Math.round((owned / total) * 100)); const ok = rem === 0;
              return (
                <div key={k} className="pr-card" style={{ border: `1px solid ${ok ? "var(--green)" : "var(--border)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
                    <PrestigeIcon name={k} size={24} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1, minWidth: 0 }}>{k}</span>
                    {ok && <Icon name="check" size={16} style={{ color: "var(--green)" }} />}
                  </div>
                  {k.toLowerCase().includes("parfait") && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 9, fontSize: 11.5, color: "var(--text-muted)", flexWrap: "wrap" }}>
                      <span>1 parfait = 1 au choix :</span>
                      {NUCLEUS_ELEMENTS.map(([label, src]) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={label} src={src} alt={label} title={`Nucléus ${label}`} width={17} height={17} style={{ objectFit: "contain" }} />
                      ))}
                    </div>
                  )}
                  <div style={{ height: 9, background: "var(--bg-3)", borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: ok ? "var(--green)" : "linear-gradient(90deg,#FFB552,#FF8C1A)", transition: "width .3s ease" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="number" min={0} value={owned || ""} onChange={(e) => setHave({ ...have, [k]: Math.max(0, +e.target.value || 0) })} placeholder="J'en ai…"
                      style={{ width: 92, padding: "6px 9px", fontSize: 12.5, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text)" }} />
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>/ {fmt(total)}</span>
                    <span style={{ marginLeft: "auto", fontFamily: "Rubik,sans-serif", fontWeight: 700, fontSize: 13, color: ok ? "var(--green)" : "var(--orange)" }}>{ok ? "Complet" : `reste ${fmt(rem)}`}</span>
                  </div>

                  {/* La barre reprend la teinte du chiffre de la carte — verte quand
                      la ressource est complète, orange sinon — et jamais deux
                      teintes dans la même série. */}
                  <ParPalier cle={k} de={cur} a={tgt} teinte={ok ? "var(--green)" : "var(--orange)"} />

                  {/* La page nommait neuf ressources sans jamais mener à aucune :
                      pour savoir à quoi ressemble un « Badge Worldboss », il fallait
                      quitter la page et chercher ailleurs. */}
                  {RECHERCHE[k] && (
                    <a className="pr-fiche" href={`/objets?q=${encodeURIComponent(RECHERCHE[k])}`}
                      title="Voir la fiche de l'objet — réservé aux membres de la guilde">
                      {/* Le cadenas du client (lock.webp, 13x16) plutôt qu'une icône
                          maison : cette page est publique, /objets vit dans le groupe
                          (guild) et passe par requireGuild(). En production, un
                          visiteur atterrit sur /login au lieu de la fiche. Le dire
                          avant le clic coûte onze pixels. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/jeu/interface/lock.webp" alt="" width={11} height={13} />
                      Voir la fiche de l&apos;objet
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ces ressources se farment et se craftent : deux pages du site le
              disent, aucune n'était atteignable d'ici. */}
          <div className="glass-card fx-card" style={{ padding: 15, marginBottom: 18, display: "flex", gap: 11, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>
            <Icon name="info" size={15} style={{ color: "var(--orange)", flexShrink: 0, marginTop: 2 }} />
            <span>
              Le compte ne dit pas où farmer. Les badges se <b style={{ color: "var(--text)" }}>craftent</b> à partir de
              composants d&apos;instance — recettes complètes dans <a className="pr-lien" href="/crafts">Crafts et collections</a>,
              réservé aux membres — et l&apos;ordre dans lequel s&apos;y prendre, palier par palier, est dans le{" "}
              <a className="pr-lien" href="/astuces">guide de progression</a>, ouvert à tous.
            </span>
          </div>

          {/* Détail par palier (repliable) */}
          <button onClick={() => setShowTable((s) => !s)} className="pr-toggle">{showTable ? "▾" : "▸"} Détail par palier</button>
          {showTable && (
            <div className="glass-card fx-card" style={{ padding: 16, marginTop: 10 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: 11, borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: 8, textAlign: "left" }}>Palier</th>
                      {PRESTIGE_KEYS.map((k) => <th key={k} style={{ padding: 8, textAlign: "right" }} title={k}><PrestigeIcon name={k} size={16} /></th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(PRESTIGE_COSTS).map((p) => {
                      const pn = +p; const c = PRESTIGE_COSTS[pn]; const active = pn >= cur && pn < tgt;
                      return (
                        <tr key={p} style={{ borderBottom: "1px solid rgba(46,46,56,0.4)", background: active ? "rgba(255,140,26,0.07)" : "transparent" }}>
                          <td style={{ padding: 8, fontWeight: 600, color: active ? "var(--orange)" : "var(--text)" }}>P{pn}→{pn + 1}</td>
                          {PRESTIGE_KEYS.map((k) => <td key={k} style={{ padding: 8, textAlign: "right", fontFamily: "monospace", color: c[k] ? "var(--text)" : "var(--text-muted)" }}>{c[k] ? fmt(c[k]) : "·"}</td>)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .pr-card{background:linear-gradient(180deg,#191920,#131318);border-radius:13px;padding:13px 15px;transition:transform .15s,box-shadow .15s}
        .pr-card:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.32)}
        .pr-card input:focus{outline:none;border-color:var(--orange)}
        /* La repartition par palier : trois colonnes fixes pour que les paliers et
           les valeurs s'alignent d'une carte a l'autre, la barre prend le reste. */
        .pr-palier{margin-top:11px;padding-top:10px;border-top:1px solid color-mix(in srgb, var(--border) 60%, transparent)}
        .pr-palier-t{font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted);margin-bottom:6px}
        .pr-palier-l{display:grid;grid-template-columns:52px minmax(0,1fr) 58px;align-items:center;gap:8px;margin-bottom:4px}
        .pr-palier-p{font-size:10.5px;color:var(--text-muted);font-variant-numeric:tabular-nums}
        .pr-palier-b{display:block;height:4px;border-radius:3px;overflow:hidden;
          background:color-mix(in srgb, var(--border) 70%, transparent)}
        .pr-palier-b>span{display:block;height:100%;border-radius:3px}
        .pr-palier-v{font-size:11px;text-align:right;font-variant-numeric:tabular-nums;color:var(--text)}
        .pr-fiche{display:inline-flex;align-items:center;gap:5px;margin-top:10px;font-size:11.5px;
          color:var(--text-muted);text-decoration:none;transition:color .15s}
        .pr-fiche:hover{color:var(--orange)}
        .pr-fiche img{width:11px;height:13px;object-fit:contain;image-rendering:pixelated;opacity:.8}
        .pr-lien{color:var(--orange);text-decoration:none;font-weight:600;border-bottom:1px dotted currentColor}
        .pr-lien:hover{color:var(--text)}
        .pr-toggle{background:var(--bg-3);border:1px solid var(--border);color:var(--text-muted);border-radius:9px;padding:9px 16px;font-family:'Rubik',sans-serif;font-weight:700;font-size:12.5px;text-transform:uppercase;letter-spacing:.6px;cursor:pointer;transition:color .15s,border-color .15s}
        .pr-toggle:hover{color:var(--orange);border-color:var(--orange)}
        @keyframes prIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .pr-grid>*{animation:prIn .4s ease both}
        .pr-grid>*:nth-child(2){animation-delay:.03s}.pr-grid>*:nth-child(3){animation-delay:.06s}.pr-grid>*:nth-child(4){animation-delay:.09s}.pr-grid>*:nth-child(5){animation-delay:.12s}.pr-grid>*:nth-child(6){animation-delay:.15s}.pr-grid>*:nth-child(7){animation-delay:.18s}.pr-grid>*:nth-child(8){animation-delay:.21s}.pr-grid>*:nth-child(9){animation-delay:.24s}
        @media(prefers-reduced-motion:reduce){.pr-grid>*{animation:none}}
      `}</style>
    </div>
  );
}
