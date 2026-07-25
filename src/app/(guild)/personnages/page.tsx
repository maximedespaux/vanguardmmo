"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ClassLogo } from "@/components/ClassLogo";
import { renduPerso, type Sexe } from "@/data/charRenders";
import { PageHeader } from "@/components/PageHeader";
import { VgSelect } from "@/components/VgSelect";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";

const CLASS_ENUM = ["SPADASSIN","TEMPLIER","ARCANISTE","ENVOUTEUR","ARBALETRIER","SYLPHIDE","PRIMAT","CHANOINE"];
const MODES = ["DPS","TANK","HYBRIDE"];
type Gear = { id: string; name: string; mode: string };
type Char = { id: string; name: string; class: string; level: number; prestige: number; isMain: boolean; sex?: string | null; gearProfiles: Gear[]; specializations: any[] };

export default function PersonnagesPage() {
  // Halo curseur + leger relief sur les cartes (.fx-card), cf. VgFx.
  useCardFx();
  const [chars, setChars] = useState<Char[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(""); const [cls, setCls] = useState("SPADASSIN"); const [prestige, setPrestige] = useState(3); const [level, setLevel] = useState(200); const [isMain, setIsMain] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [gearModal, setGearModal] = useState<{ charId: string; mode: string } | null>(null);
  const [gearName, setGearName] = useState("");
  // ok = succès (vert + coche) ; sinon neutre. Avant, la couleur dépendait d'un
  // préfixe du message, ce qui rendait le texte porteur de logique.
  const flash = (m: string, ok = false) => { setToast({ msg: m, ok }); setTimeout(() => setToast(null), 2500); };

  const load = async () => { setLoading(true); try { const r = await fetch("/api/characters"); if (r.ok) setChars(await r.json()); } catch {} setLoading(false); };
  useEffect(() => { load(); }, []);
  // Quels stuffs sont REELLEMENT equipes ? Les profils DPS / Tank / Hybride sont
  // crees par defaut mais souvent vides : afficher une pastille pour un stuff vide
  // laisse croire qu'un build existe. On lit donc l'etat de l'AirBuilder (meme
  // source que la candidature) et on ne garde que les stuffs portant au moins une
  // piece. Cle = nom du perso en minuscules -> ensemble des noms de stuffs remplis.
  const [stuffsRemplis, setStuffsRemplis] = useState<Record<string, Set<string>>>({});
  useEffect(() => {
    type Stuff = { name?: string; eq?: Record<string, unknown> };
    type Blob = { chars?: { name?: string; stuffs?: Stuff[] }[] };
    const equipe = (st: Stuff) => Object.values(st?.eq ?? {}).some((e) => e && (e as { item?: unknown }).item);
    const lire = (blob: Blob | null) => {
      const out: Record<string, Set<string>> = {};
      for (const pc of blob?.chars ?? []) {
        if (!pc?.name) continue;
        const noms = (pc.stuffs ?? []).filter(equipe).map((st, i) => (st.name?.trim() || `Stuff ${i + 1}`).toLowerCase());
        if (noms.length) out[String(pc.name).trim().toLowerCase()] = new Set(noms);
      }
      return out;
    };
    let annule = false;
    (async () => {
      let local: Blob | null = null;
      try { local = JSON.parse(localStorage.getItem("vg_air_e1") || "null"); } catch { /* rien en local */ }
      let distant: Blob | null = null;
      try { const r = await fetch("/api/builder-state"); if (r.ok) distant = (await r.json())?.blob ?? null; } catch { /* hors ligne */ }
      if (annule) return;
      // Le local prime : il reflete ce que le joueur vient de faire dans le builder.
      setStuffsRemplis({ ...lire(distant), ...lire(local) });
    })();
    return () => { annule = true; };
  }, []);


  const createChar = async () => {
    if (!name.trim()) { flash("Donne un nom au personnage."); return; }
    const r = await fetch("/api/characters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, class: cls, prestige, level, isMain }) });
    if (r.ok) { setName(""); setIsMain(false); load(); flash("Personnage créé.", true); } else flash("Erreur lors de la création.");
  };
  const doDelChar = async () => { if (!confirmDel) return; await fetch(`/api/characters/${confirmDel}`, { method: "DELETE" }); setConfirmDel(null); load(); flash("Personnage supprimé."); };
  const openGear = (charId: string, mode: string) => { setGearName(`Stuff ${mode}`); setGearModal({ charId, mode }); };
  const doAddGear = async () => { if (!gearModal) return; await fetch(`/api/characters/${gearModal.charId}/gear`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: gearName || `Stuff ${gearModal.mode}`, mode: gearModal.mode }) }); setGearModal(null); load(); flash("Stuff ajouté.", true); };
  const delGear = async (gearId: string) => { await fetch(`/api/gear/${gearId}`, { method: "DELETE" }); load(); };

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };
  const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)" };
  const modeColor = (m: string) => m === "TANK" ? "var(--blue)" : m === "HYBRIDE" ? "var(--purple)" : "var(--orange)";

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: "0 auto" }}>
      <PageHeader icon="users" title="Mes Personnages" subtitle="Crée d'abord ton personnage (nom, classe, prestige, niveau), puis configure un ou plusieurs stuffs (DPS / Tank / Hybride). Le Suivi & axes utilisera ces personnages." />

      {toast && <div style={{ marginBottom: 14, padding: "9px 12px", borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)", color: toast.ok ? "var(--green)" : "var(--text)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>{toast.ok && <Icon name="check" size={15} />}{toast.msg}</div>}

      {/* Création */}
      <div className="fx-card" style={card}>
        <h2 className="font-heading" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--orange)", textTransform: "uppercase", fontSize: 16, marginBottom: 12 }}><Icon name="plus" size={16} /> Créer un personnage</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input placeholder="Nom du personnage" value={name} onChange={e => setName(e.target.value)} style={{ ...inp, flex: 1, minWidth: 150 }} />
          <VgSelect value={cls} onChange={setCls} options={CLASS_ENUM} minWidth={140} />
          <VgSelect value={prestige} onChange={v => setPrestige(+v)} options={[1,2,3,4,5,6,7,8,9,10].map(p => ({ value: String(p), label: `P${p}` }))} style={{ width: 100 }} />
          <input type="number" value={level} onChange={e => setLevel(+e.target.value)} style={{ ...inp, width: 90 }} title="Niveau" />
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}><input type="checkbox" checked={isMain} onChange={e => setIsMain(e.target.checked)} /> Principal</label>
          <button onClick={createChar} className="vg-btn">Créer</button>
        </div>
      </div>

      {/* Liste */}
      {loading ? <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 30 }}>Chargement…</div> :
       chars.length === 0 ? <div className="fx-card" style={{ ...card, textAlign: "center", color: "var(--text-muted)" }}>Aucun personnage. Crée ton premier ci-dessus</div> :
       chars.map(c => (
        <div key={c.id} style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            {/* Illustration du personnage (classe + sexe), meme visuel que la
                candidature et l'AirBuilder : on reconnait son perso d'un coup d'oeil.
                Repli sur le logo de classe si l'illustration manque. */}
            <div style={{ width: 74, height: 102, flexShrink: 0, borderRadius: 11, overflow: "hidden", position: "relative",
              background: "radial-gradient(circle at 50% 26%, rgba(255,140,26,.15), rgba(10,10,12,.9) 72%)",
              border: "1px solid rgba(255,140,26,.28)", boxShadow: "inset 0 0 18px rgba(0,0,0,.6)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              {renduPerso(c.class, (c.sex === "F" ? "F" : "G") as Sexe)
                ? <img src={renduPerso(c.class, (c.sex === "F" ? "F" : "G") as Sexe)!} alt={c.name}
                    style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "bottom center",
                      filter: "drop-shadow(0 4px 10px rgba(255,140,26,.25))" }} />
                : <ClassLogo name={c.class} size={34} />}
            </div>
            <div style={{ flex: 1 }}>
              <div className="font-heading" style={{ fontWeight: 700, fontSize: 18 }}>{c.name} {c.isMain && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--gold)" }}><Icon name="star" size={11} /> principal</span>}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.class} · Niveau {c.level} · Prestige {c.prestige}</div>
            </div>
            <button onClick={() => setConfirmDel(c.id)} title="Supprimer" style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={16} /></button>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Stuffs</span>
              {MODES.map(m => <button key={m} onClick={() => openGear(c.id, m)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", border: `1px solid ${modeColor(m)}`, background: "transparent", color: modeColor(m) }}>+ {m}</button>)}
              {/* C'est l'action principale de la carte : c'est dans le Builder qu'on
                  equipe reellement un personnage. Elle est donc traitee comme un
                  vrai bouton et non comme un lien discret. */}
              <Link href="/builder" className="vg-btn" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, padding: "9px 16px", textDecoration: "none" }}><Icon name="sword" size={14} /> Configurer dans le Builder</Link>
            </div>
            {(() => {
              // Un profil cree mais vide ne compte pas : afficher « DPS » alors que rien
              // n'est equipe laisse croire qu'un build existe. On ne garde que les stuffs
              // portant au moins une piece dans l'AirBuilder.
              const remplis = stuffsRemplis[c.name.trim().toLowerCase()];
              const visibles = c.gearProfiles.filter(g =>
                remplis?.has((g.name || "").trim().toLowerCase()) || remplis?.has((g.mode || "").trim().toLowerCase()));
              if (!visibles.length) return (
                <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon name="info" size={13} />
                  Aucun stuff equipe pour l&apos;instant — ouvre le Builder pour en composer un.
                </div>
              );
              return (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{visibles.map(g => (
                <span key={g.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-3)", border: `1px solid ${modeColor(g.mode)}`, borderRadius: 7, padding: "5px 10px", fontSize: 12 }}>
                  {/* Un clic sur un stuff rempli ouvre directement sa page dans le Builder. */}
                  <Link href={`/builder?perso=${encodeURIComponent(c.name)}&stuff=${encodeURIComponent(g.name || g.mode)}`}
                    title={`Ouvrir « ${g.name || g.mode} » dans le Builder`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: "inherit" }}>
                    <b style={{ color: modeColor(g.mode) }}>{g.mode}</b> {g.name}
                  </Link>
                  <button onClick={() => delGear(g.id)} title="Retirer ce stuff" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={13} /></button>
                </span>
              ))}</div>
              );
            })()}
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
