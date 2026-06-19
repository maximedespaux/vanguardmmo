"use client";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { VgSelect } from "@/components/VgSelect";

type Channel = { id: string; name: string; type: string };
type Cmd = { id: string; type: string; status: string; result: string | null; createdBy: string; createdAt: string; payload: any };

const TYPE_LABEL: Record<string, string> = { post_embed: "Embed", create_giveaway: "Giveaway", post_class_panel: "Panneau classes" };
const STATUS_META: Record<string, { c: string; l: string }> = {
  PENDING: { c: "var(--gold)", l: "⏳ en attente" }, DONE: { c: "var(--green)", l: "✅ envoyé" }, FAILED: { c: "var(--red)", l: "❌ échec" },
};

function parseDurationMs(s: string): number | null {
  const m = s.trim().match(/^(\d+)\s*(m|min|h|d|j)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10), u = m[2].toLowerCase();
  return n * (u.startsWith("m") ? 60_000 : u === "h" ? 3_600_000 : 86_400_000);
}
const hexToInt = (hex: string) => { const n = parseInt(hex.replace(/^#/, ""), 16); return Number.isNaN(n) ? 0xff8c1a : n; };

export default function DiscordPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [cmds, setCmds] = useState<Cmd[]>([]);
  const [tab, setTab] = useState<"embed" | "giveaway" | "classes">("embed");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  // Embed
  const [eCh, setECh] = useState(""); const [eTitle, setETitle] = useState(""); const [eDesc, setEDesc] = useState(""); const [eColor, setEColor] = useState("#FF8C1A"); const [eImg, setEImg] = useState(""); const [eFoot, setEFoot] = useState("");
  // Giveaway
  const [gCh, setGCh] = useState(""); const [gPrize, setGPrize] = useState(""); const [gDur, setGDur] = useState("1h"); const [gWin, setGWin] = useState(1); const [gDesc, setGDesc] = useState("");
  // Classes
  const [cCh, setCCh] = useState("");

  const postable = useMemo(() => channels.filter((c) => c.type === "text" || c.type === "announcement"), [channels]);

  const loadCmds = async () => { try { const r = await fetch("/api/admin/bot-command"); if (r.ok) setCmds(await r.json()); } catch {} };
  useEffect(() => {
    (async () => { try { const r = await fetch("/api/admin/channels"); if (r.ok) { const ch: Channel[] = await r.json(); setChannels(ch); const first = ch.find((c) => c.type === "text" || c.type === "announcement")?.id ?? ""; setECh(first); setGCh(first); setCCh(first); } } catch {} })();
    loadCmds(); const t = setInterval(loadCmds, 5000); return () => clearInterval(t);
  }, []);

  async function send(type: string, payload: any) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/bot-command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, payload }) });
      const d = await r.json();
      setToast(r.ok ? "✅ Commande envoyée au bot — exécution dans quelques secondes." : `Erreur : ${d.error ?? "inconnue"}`);
      if (r.ok) loadCmds();
    } catch { setToast("Erreur réseau."); }
    setBusy(false); setTimeout(() => setToast(""), 4000);
  }

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 16 };
  const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 14, width: "100%" };
  const lab: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4, marginTop: 10 };
  const ChannelSelect = ({ v, set }: { v: string; set: (s: string) => void }) => (
    <VgSelect full value={v} onChange={set} options={postable.length === 0 ? [{ value: "", label: "(salons en cours de synchro…)" }] : postable.map((c) => ({ value: c.id, label: `#${c.name}${c.type === "announcement" ? " 📢" : ""}` }))} />
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 980, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-discord.png" title="Discord" subtitle="Pilote le bot depuis le site : poste des embeds, lance des giveaways et le panneau de classes. Le bot exécute dans les secondes qui suivent." />
      <SectionTabs section="discord" />

      {toast && <div style={{ ...card, padding: "10px 14px", color: toast.startsWith("✅") ? "var(--green)" : "var(--red)", fontSize: 14 }}>{toast}</div>}

      <div className="vg-subtabs">
        <button className={`vg-subtab ${tab === "embed" ? "active" : ""}`} onClick={() => setTab("embed")}>📝 Embed Builder</button>
        <button className={`vg-subtab ${tab === "giveaway" ? "active" : ""}`} onClick={() => setTab("giveaway")}>🎉 Giveaway</button>
        <button className={`vg-subtab ${tab === "classes" ? "active" : ""}`} onClick={() => setTab("classes")}>🎭 Panneau classes</button>
      </div>

      <div key={tab} className="vg-swap">
      {tab === "embed" && (
        <div style={card}>
          <label style={lab}>Salon</label><ChannelSelect v={eCh} set={setECh} />
          <label style={lab}>Titre</label><input style={inp} value={eTitle} onChange={(e) => setETitle(e.target.value)} placeholder="Titre de l'embed" />
          <label style={lab}>Description (utilise \n pour un saut de ligne)</label><textarea style={{ ...inp, minHeight: 90, resize: "vertical" }} value={eDesc} onChange={(e) => setEDesc(e.target.value)} />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div><label style={lab}>Couleur</label><input type="color" value={eColor} onChange={(e) => setEColor(e.target.value)} style={{ ...inp, width: 60, padding: 4, height: 38 }} /></div>
            <div style={{ flex: 1, minWidth: 180 }}><label style={lab}>Image (URL)</label><input style={inp} value={eImg} onChange={(e) => setEImg(e.target.value)} placeholder="https://…" /></div>
          </div>
          <label style={lab}>Footer</label><input style={inp} value={eFoot} onChange={(e) => setEFoot(e.target.value)} />
          <button className="vg-btn" style={{ marginTop: 14, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => send("post_embed", { channelId: eCh, title: eTitle, description: eDesc, color: hexToInt(eColor), image: eImg || undefined, footer: eFoot || undefined })}>Envoyer l'embed</button>
        </div>
      )}

      {tab === "giveaway" && (
        <div style={card}>
          <label style={lab}>Salon</label><ChannelSelect v={gCh} set={setGCh} />
          <label style={lab}>Lot à gagner</label><input style={inp} value={gPrize} onChange={(e) => setGPrize(e.target.value)} placeholder="Ex : Stuff Yggdrasil complet" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 120 }}><label style={lab}>Durée (30m, 2h, 1d)</label><input style={inp} value={gDur} onChange={(e) => setGDur(e.target.value)} /></div>
            <div style={{ width: 110 }}><label style={lab}>Gagnants</label><input type="number" min={1} style={inp} value={gWin} onChange={(e) => setGWin(Math.max(1, +e.target.value || 1))} /></div>
          </div>
          <label style={lab}>Description (optionnel)</label><input style={inp} value={gDesc} onChange={(e) => setGDesc(e.target.value)} />
          <button className="vg-btn" style={{ marginTop: 14, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => { const ms = parseDurationMs(gDur); if (!ms) { setToast("Durée invalide (ex : 30m, 2h, 1d)."); setTimeout(() => setToast(""), 4000); return; } send("create_giveaway", { channelId: gCh, prize: gPrize, durationMs: ms, winnersCount: gWin, description: gDesc || undefined }); }}>Lancer le giveaway</button>
        </div>
      )}

      {tab === "classes" && (
        <div style={card}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>Poste le panneau des 8 classes (boutons d'auto-attribution de rôle) dans le salon choisi.</p>
          <label style={lab}>Salon</label><ChannelSelect v={cCh} set={setCCh} />
          <button className="vg-btn" style={{ marginTop: 14, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => send("post_class_panel", { channelId: cCh })}>Poster le panneau de classes</button>
        </div>
      )}
      </div>

      {/* Historique */}
      <div style={card}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 12 }}>Historique des commandes</div>
        {cmds.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Aucune commande pour l'instant.</div> :
          <div style={{ display: "grid", gap: 8 }}>
            {cmds.map((c) => { const s = STATUS_META[c.status] ?? { c: "var(--text-muted)", l: c.status }; return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "var(--bg-3)", borderRadius: 8, fontSize: 13 }}>
                <span style={{ minWidth: 110, color: "var(--text)" }}>{TYPE_LABEL[c.type] ?? c.type}</span>
                <span style={{ color: s.c, minWidth: 110 }}>{s.l}</span>
                <span style={{ color: "var(--text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.result ?? ""}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>par {c.createdBy}</span>
              </div>
            ); })}
          </div>}
      </div>
    </div>
  );
}
