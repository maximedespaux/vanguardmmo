"use client";
import { useState } from "react";
import dungeonsData from "@/data/dungeons.json";
import ICONES_OBJETS from "@/data/icones-objets.json";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";

/**
 * `drops` est le résumé qui tient sur une carte ; `dropsComplets`, quand il
 * existe, est la liste telle que la fenêtre d'information du jeu l'affiche.
 * Les deux coexistent parce qu'ils ne servent pas au même moment : on parcourt
 * la grille pour repérer une instance, on ouvre la fiche pour savoir ce qui
 * tombe vraiment. Les donjons à set complet (Draken, Catacombes, Sentier,
 * Dédale) n'ont volontairement pas de liste complète : énumérer 32 pièces d'une
 * même armure en dit moins que « le set complet ».
 */
type Dungeon = { id: number; name: string; type: string; lvl: string; prestige: number | null; prestigeDetail?: string; hp: number; armor: string | null; elem: string; cat: string; icon: string; drops: string[]; dropsComplets?: string[]; video?: string };

/** L'identifiant YouTube de la vidéo du donjon, quand il y en a une. */
const PLAYLIST = "PL64S1j7adQcwMHVfTyRfMkBOu8hS7c08V";

/**
 * Un donjon à `hp: 0` n'est pas un donjon sans données : c'est un donjon sans PV
 * minimal requis (Sietch Kalgas, dont le boss a un aggro fixe — cf. le guide de
 * progression). Afficher « 0 » laissait croire à une fiche incomplète.
 */
const hpLabel = (hp: number) => (hp > 0 ? hp.toLocaleString("fr-FR") : "Aucun minimum");

/**
 * L'icône du jeu, quand on la connaît.
 *
 * Rien, dans les fichiers du jeu, ne relie un nom français à un code d'icône :
 * les 12 871 PNG extraits sont nommés par code interne, et deux tentatives de
 * reconnaissance d'image ont donné des écarts de 1,0 entre le premier et le
 * deuxième candidat — autant tirer au sort. La table qui manquait était déjà
 * dans le dépôt : la base d'objets de l'AirBuilder porte le nom français ET
 * l'icône de chaque pièce. `icones-objets.json` en est le croisement, complété
 * par les assets déjà rangés sous /assets/items.
 *
 * Un objet absent de la table n'affiche pas d'icône, et c'est tout : ajouter
 * une ligne au fichier suffit à en poser une.
 */
function IconeObjet({ nom }: { nom: string }) {
  const src = (ICONES_OBJETS as Record<string, string>)[nom];
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={20} height={20} style={{ objectFit: "contain", flexShrink: 0 }} />;
}

export default function DonjonsPage() {
  // Halo curseur + relief sur les cartes de donjon (.fx-card), cf. VgFx.
  useCardFx();
  const dungeons = dungeonsData as Dungeon[];

  const [q, setQ] = useState(""); const [typeFilter, setTypeFilter] = useState<"Tous" | "SOLO" | "GROUPE">("Tous"); const [sel, setSel] = useState<Dungeon | null>(null);
  const wikiList = dungeons.filter(d => (typeFilter === "Tous" || d.type === typeFilter) && (!q || d.name.toLowerCase().includes(q.toLowerCase())));

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };

  return (
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-pve.webp" icon="map" title="Wiki des Donjons" subtitle={`Le wiki des ${dungeons.length} donjons : PV, élément, armure conseillée et drops.`} />
      <SectionTabs section="pve" />
      {/* L'onglet « Wiki des donjons » a ete retire : il etait seul dans sa barre,
          donc il ne proposait aucun choix — la page EST le wiki. Le suivi quotidien
          et le rapport d'instances qui l'accompagnaient sont partis avec lui ; leur
          code restait la sans qu'aucun clic ne puisse plus l'atteindre. */}

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un donjon..." style={{ flex: 1, minWidth: 180, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)" }} />
        <div className="vg-subtabs" style={{ margin: 0 }}>{(["Tous", "SOLO", "GROUPE"] as const).map(t => <button key={t} onClick={() => setTypeFilter(t)} className={`vg-subtab ${typeFilter === t ? "active" : ""}`}>{t}</button>)}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 12 }}>
        {wikiList.map(d => (
          <div key={d.id} className="fx-card" onClick={() => setSel(d)} style={{ ...card, padding: 16, marginBottom: 0, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><Icon name={d.icon as IconName} framed frameSize={36} tone="orange" /><div style={{ minWidth: 0 }}><div className="font-heading" style={{ fontWeight: 600, fontSize: 15 }}>{d.name}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.type} · {d.lvl}{d.prestige ? ` · P${d.prestige}` : ""}</div></div></div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11 }}><span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}><Icon name="heart" size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />{hpLabel(d.hp)}</span><span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}><Icon name="sparkles" size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />{d.elem}</span>{d.armor && <span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}><Icon name="shield" size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />{d.armor}</span>}</div>
            {d.drops.length > 0 && <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}><Icon name="gift" size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />{d.drops.slice(0, 3).join(", ")}{d.drops.length > 3 ? "…" : ""}</div>}
            {/* Signalé sur la carte : sans ça, personne ne devine qu'il y a une
                vidéo derrière et le travail de Sugot reste invisible. */}
            {d.video && <div style={{ marginTop: 7, fontSize: 10.5, color: "var(--orange)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="video" size={11} />Vidéo disponible</div>}
          </div>
        ))}
      </div>
      {sel && (
        <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, maxWidth: 500, width: "100%", marginBottom: 0, maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><Icon name={sel.icon as IconName} framed frameSize={48} tone="orange" /><div style={{ minWidth: 0 }}><h2 className="font-heading" style={{ fontSize: 22 }}>{sel.name}</h2><div style={{ color: "var(--text-muted)", fontSize: 13 }}>{sel.type} · Niveau {sel.lvl}{sel.prestigeDetail ? ` · Prestige ${sel.prestigeDetail}` : sel.prestige ? ` · Prestige ${sel.prestige}` : ""}</div></div></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ background: "var(--bg-3)", borderRadius: 8, padding: 12, minWidth: 0 }}><div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>PV recommandés</div><div className="font-heading" style={{ fontWeight: 700, color: "var(--orange)" }}>{hpLabel(sel.hp)}</div></div>
              <div style={{ background: "var(--bg-3)", borderRadius: 8, padding: 12, minWidth: 0 }}><div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Élément boss</div><div className="font-heading" style={{ fontWeight: 700, color: "var(--blue)" }}>{sel.elem}</div></div>
            </div>
            {sel.armor && <div style={{ background: "rgba(255,140,26,0.06)", border: "1px solid var(--orange-dark)", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13 }}><Icon name="shield" size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />Armure conseillée : <b>{sel.armor}</b></div>}

            {/* La vidéo du donjon, quand elle existe dans la playlist de Sugot.
                Domaine nocookie : rien n'est déposé chez le visiteur tant qu'il
                n'a pas lancé la lecture. `loading=lazy` évite de charger le
                lecteur pour une fiche qu'on ne fait qu'entrouvrir. */}
            {sel.video && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="video" size={12} />En vidéo
                </div>
                <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${sel.video}?list=${PLAYLIST}&rel=0`}
                    title={`${sel.name} en vidéo`} loading="lazy" allowFullScreen
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                  />
                </div>
              </div>
            )}
            {(() => {
              // La fiche montre la liste complète quand on l'a ; la carte, elle, garde le résumé.
              const liste = sel.dropsComplets ?? sel.drops;
              return (<>
                <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
                  <span><Icon name="gift" size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />Drops</span>
                  {liste.length > 0 && <span style={{ textTransform: "none", letterSpacing: 0, fontSize: 11 }}>{liste.length} objet{liste.length > 1 ? "s" : ""}</span>}
                </div>
                {liste.length > 0
                  ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{liste.map(d => <span key={d} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px 4px 6px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}><IconeObjet nom={d} />{d}</span>)}</div>
                  : <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>Personne n&apos;a encore relevé les drops de cette instance.</div>}
              </>);
            })()}
            <button onClick={() => setSel(null)} style={{ marginTop: 16, width: "100%", padding: 10, borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer" }} className="font-heading">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
