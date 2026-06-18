"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ClassLogo } from "@/components/ClassLogo";
import { PageHeader } from "@/components/PageHeader";

const CLASS_ENUM = ["SPADASSIN","TEMPLIER","ARCANISTE","ENVOUTEUR","ARBALETRIER","SYLPHIDE","PRIMAT","CHANOINE"];
const MODES = ["DPS","TANK","HYBRIDE"];
type Gear = { id: string; name: string; mode: string };
type Char = { id: string; name: string; class: string; level: number; prestige: number; isMain: boolean; gearProfiles: Gear[]; specializations: any[] };

export default function PersonnagesPage() {
  const [chars, setChars] = useState<Char[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(""); const [cls, setCls] = useState("SPADASSIN"); const [prestige, setPrestige] = useState(3); const [level, setLevel] = useState(200); const [isMain, setIsMain] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [gearModal, setGearModal] = useState<{ charId: string; mode: string } | null>(null);
  const [gearName, setGearName] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const load = async () => { setLoading(true); try { const r = await fetch("/api/characters"); if (r.ok) setChars(await r.json()); } catch {} setLoading(false); };
  useEffect(() => { load(); }, []);

  const createChar = async () => {
    if (!name.trim()) { flash("Donne un nom au personnage."); return; }
    const r = await fetch("/api/characters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, class: cls, prestige, level, isMain }) });
    if (r.ok) { setName(""); setIsMain(false); load(); flash("✅ Personnage créé."); } else flash("Erreur lors de la création.");
  };
  const doDelChar = async () => { if (!confirmDel) return; await fetch(`/api/characters/${confirmDel}`, { method: "DELETE" }); setConfirmDel(null); load(); flash("Personnage supprimé."); };
  const openGear = (charId: string, mode: string) => { setGearName(`Stuff ${mode}`); setGearModal({ charId, mode }); };
  const doAddGear = async () => { if (!gearModal) return; await fetch(`/api/characters/${gearModal.charId}/gear`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: gearName || `Stuff ${gearModal.mode}`, mode: gearModal.mode }) }); setGearModal(null); load(); flash("✅ Stuff ajouté."); };
  const delGear = async (gearId: string) => { await fetch(`/api/gear/${gearId}`, { method: "DELETE" }); load(); };

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };
  const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)" };
  const modeColor = (m: string) => m === "TANK" ? "var(--blue)" : m === "HYBRIDE" ? "var(--purple)" : "var(--orange)";

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: "0 auto" }}>
      <PageHeader icon="🧙" title="Mes Personnages" subtitle="Crée d'abord ton personnage (nom, classe, prestige, niveau), puis configure un ou plusieurs stuffs (DPS / Tank / Hybride). Le Suivi & axes utilisera ces personnages." />

      {toast && <div style={{ marginBottom: 14, padding: "9px 12px", borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)", color: toast.startsWith("✅") ? "var(--green)" : "var(--text)", fontSize: 13 }}>{toast}</div>}

      {/* Création */}
      <div style={card}>
        <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", fontSize: 16, marginBottom: 12 }}>➕ Créer un personnage</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input placeholder="Nom du personnage" value={name} onChange={e => setName(e.target.value)} style={{ ...inp, flex: 1, minWidth: 150 }} />
          <select value={cls} onChange={e => setCls(e.target.value)} className="vg-select" style={{ minWidth: 140 }}>{CLASS_ENUM.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <select value={prestige} onChange={e => setPrestige(+e.target.value)} className="vg-select" style={{ width: 100 }}>{[1,2,3,4,5,6,7,8,9,10].map(p => <option key={p} value={p}>P{p}</option>)}</select>
          <input type="number" value={level} onChange={e => setLevel(+e.target.value)} style={{ ...inp, width: 90 }} title="Niveau" />
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}><input type="checkbox" checked={isMain} onChange={e => setIsMain(e.target.checked)} /> Principal</label>
          <button onClick={createChar} className="vg-btn">Créer</button>
        </div>
      </div>

      {/* Liste */}
      {loading ? <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 30 }}>Chargement…</div> :
       chars.length === 0 ? <div style={{ ...card, textAlign: "center", color: "var(--text-muted)" }}>Aucun personnage. Crée ton premier ci-dessus 👆</div> :
       chars.map(c => (
        <div key={c.id} style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--bg-3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}><ClassLogo name={c.class} size={34} /></div>
            <div style={{ flex: 1 }}>
              <div className="font-heading" style={{ fontWeight: 700, fontSize: 18 }}>{c.name} {c.isMain && <span style={{ fontSize: 11, color: "var(--gold)" }}>★ principal</span>}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.class} · Niveau {c.level} · Prestige {c.prestige}</div>
            </div>
            <button onClick={() => setConfirmDel(c.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 18 }}>🗑️</button>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Stuffs</span>
              {MODES.map(m => <button key={m} onClick={() => openGear(c.id, m)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", border: `1px solid ${modeColor(m)}`, background: "transparent", color: modeColor(m) }}>+ {m}</button>)}
              <Link href="/builder" style={{ marginLeft: "auto", fontSize: 12, color: "var(--orange)", textDecoration: "none" }}>⚔️ Configurer dans le Builder →</Link>
            </div>
            {c.gearProfiles.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Aucun stuff. Ajoute DPS / Tank / Hybride ci-dessus.</div> :
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{c.gearProfiles.map(g => (
                <span key={g.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-3)", border: `1px solid ${modeColor(g.mode)}`, borderRadius: 7, padding: "5px 10px", fontSize: 12 }}>
                  <b style={{ color: modeColor(g.mode) }}>{g.mode}</b> {g.name}
                  <button onClick={() => delGear(g.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
                </span>
              ))}</div>}
          </div>
        </div>
      ))}

      {/* Confirmation de suppression */}
      {confirmDel && (
        <div onClick={() => setConfirmDel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 360, marginBottom: 0 }}>
            <div className="font-heading" style={{ fontSize: 16, marginBottom: 8 }}>Supprimer ce personnage ?</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>Le personnage et tous ses stuffs seront supprimés. Action définitive.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDel(null)} style={{ ...inp, cursor: "pointer" }}>Annuler</button>
              <button onClick={doDelChar} style={{ padding: "9px 16px", borderRadius: 8, background: "var(--red)", color: "#0A0A0C", border: "none", fontWeight: 600, cursor: "pointer" }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Ajout de stuff */}
      {gearModal && (
        <div onClick={() => setGearModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 360, marginBottom: 0 }}>
            <div className="font-heading" style={{ fontSize: 16, marginBottom: 10 }}>Nouveau stuff <span style={{ color: modeColor(gearModal.mode) }}>{gearModal.mode}</span></div>
            <input autoFocus value={gearName} onChange={(e) => setGearName(e.target.value)} style={{ ...inp, width: "100%" }} placeholder="Nom du stuff" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={() => setGearModal(null)} style={{ ...inp, cursor: "pointer" }}>Annuler</button>
              <button onClick={doAddGear} className="vg-btn">Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
