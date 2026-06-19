"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { VgSelect } from "@/components/VgSelect";

type Channel = { id: string; name: string; type: string };

export default function AnnoncePage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [ch, setCh] = useState("");
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [color, setColor] = useState("#FF8C1A");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/channels").then((r) => (r.ok ? r.json() : [])).then((cs: Channel[]) => {
      const post = cs.filter((c) => c.type === "text" || c.type === "announcement");
      setChannels(post);
      const ann = post.find((c) => /annonce/i.test(c.name)) ?? post[0];
      if (ann) setCh(ann.id);
    }).catch(() => {});
  }, []);

  async function publish() {
    if (!title && !msg) { setToast("Donne un titre ou un message."); setTimeout(() => setToast(""), 3000); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/bot-command", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "post_embed", payload: { channelId: ch, title, description: msg, color: parseInt(color.replace(/^#/, ""), 16) || 0xff8c1a } }),
      });
      const d = await r.json();
      setToast(r.ok ? "✅ Annonce envoyée — le bot la publie dans quelques secondes." : `Erreur : ${d.error ?? "inconnue"}`);
      if (r.ok) { setTitle(""); setMsg(""); }
    } catch { setToast("Erreur réseau."); }
    setBusy(false); setTimeout(() => setToast(""), 4000);
  }

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 16 };
  const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 14, width: "100%" };
  const lab: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4, marginTop: 12 };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 760, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-annonce.png" title="Annonce" subtitle="Rédige une annonce : le bot la publie en embed dans le salon choisi." />
      <SectionTabs section="discord" />
      {toast && <div style={{ ...card, padding: "10px 14px", color: toast.startsWith("✅") ? "var(--green)" : "var(--red)", fontSize: 14 }}>{toast}</div>}
      <div style={card}>
        <label style={lab}>Salon</label>
        <VgSelect full value={ch} onChange={setCh} options={channels.length === 0 ? [{ value: "", label: "(salons en cours de synchro…)" }] : channels.map((c) => ({ value: c.id, label: `#${c.name}${c.type === "announcement" ? " 📢" : ""}` }))} />
        <label style={lab}>Titre</label>
        <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'annonce" />
        <label style={lab}>Message (utilise \n pour un saut de ligne)</label>
        <textarea style={{ ...inp, minHeight: 120, resize: "vertical" }} value={msg} onChange={(e) => setMsg(e.target.value)} />
        <label style={lab}>Couleur</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ ...inp, width: 60, padding: 4, height: 38 }} />
        <div>
          <button disabled={busy} onClick={publish} className="vg-btn" style={{ marginTop: 16, opacity: busy ? 0.6 : 1 }}>Publier l'annonce</button>
        </div>
      </div>
    </div>
  );
}
