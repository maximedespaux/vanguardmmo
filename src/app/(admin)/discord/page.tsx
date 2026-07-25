"use client";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { VgSelect } from "@/components/VgSelect";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";

type Channel = { id: string; name: string; type: string };
type Cmd = { id: string; type: string; status: string; result: string | null; createdBy: string; createdAt: string; payload: any };

const TYPE_LABEL: Record<string, string> = { post_embed: "Embed", create_giveaway: "Giveaway", post_class_panel: "Panneau classes" };
const STATUS_META: Record<string, { c: string; l: React.ReactNode }> = {
  PENDING: { c: "var(--gold)", l: <><Icon name="clock" size={14} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 5 }} />en attente</> },
  DONE: { c: "var(--green)", l: <><Icon name="check" size={14} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 5 }} />envoyé</> },
  FAILED: { c: "var(--red)", l: <><Icon name="x" size={14} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 5 }} />échec</> },
};

function parseDurationMs(s: string): number | null {
  const m = s.trim().match(/^(\d+)\s*(m|min|h|d|j)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10), u = m[2].toLowerCase();
  return n * (u.startsWith("m") ? 60_000 : u === "h" ? 3_600_000 : 86_400_000);
}
const hexToInt = (hex: string) => { const n = parseInt(hex.replace(/^#/, ""), 16); return Number.isNaN(n) ? 0xff8c1a : n; };

export default function DiscordPage() {
  // Interrupteur des rappels Chambres Secretes (mercredi et dimanche 21h).
  // Il existe parce que le jeu peut etre indisponible : on coupe les rappels sans
  // toucher au code ni au bot.
  const [reglages, setReglages] = useState<Record<string, boolean> | null>(null);
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setReglages({ cs: j?.cs_rappels_actifs === "1", gs: j?.gs_rappels_actifs === "1" }))
      .catch(() => setReglages({ cs: false, gs: false }));
  }, []);
  const basculer = async (quel: "cs" | "gs", actif: boolean) => {
    setReglages((r) => ({ ...(r ?? { cs: false, gs: false }), [quel]: actif })); // retour immediat
    const rep = await fetch("/api/admin/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `${quel}_rappels_actifs`, value: actif ? "1" : "0" }),
    }).catch(() => null);
    // Le serveur refuse ? On revient a l'etat precedent plutot que de mentir a l'ecran.
    if (!rep || !rep.ok) setReglages((r) => ({ ...(r ?? { cs: false, gs: false }), [quel]: !actif }));
  };

  /** Un creneau recurrent : rappel @everyone la veille puis le jour meme. */
  const CRENEAUX = [
    { cle: "cs" as const, icone: "key" as const, titre: "Chambres Secrètes", quand: "Mercredi et dimanche à 21h" },
    { cle: "gs" as const, icone: "swords" as const, titre: "Guild Siege", quand: "Horaire à définir" },
  ];

  // Halo curseur + leger relief sur les cartes (.fx-card), cf. VgFx.
  useCardFx();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [cmds, setCmds] = useState<Cmd[]>([]);
  const [tab, setTab] = useState<"embed" | "giveaway" | "classes">("embed");
  const [toast, setToast] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  // Embed
  const [eCh, setECh] = useState(""); const [eTitle, setETitle] = useState(""); const [eDesc, setEDesc] = useState(""); const [eColor, setEColor] = useState("#FF8C1A"); const [eImg, setEImg] = useState(""); const [eFoot, setEFoot] = useState("");
  // Giveaway
  const [gCh, setGCh] = useState(""); const [gPrizes, setGPrizes] = useState<string[]>([""]); const [gDur, setGDur] = useState("1h"); const [gWin, setGWin] = useState(1); const [gDesc, setGDesc] = useState(""); const [gTitle, setGTitle] = useState(""); const [gColor, setGColor] = useState("#FF8C1A"); const [gImg, setGImg] = useState("");
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
      setOk(r.ok);
      setToast(r.ok ? "Commande envoyée au bot — exécution dans quelques secondes." : `Erreur : ${d.error ?? "inconnue"}`);
      if (r.ok) loadCmds();
    } catch { setOk(false); setToast("Erreur réseau."); }
    setBusy(false); setTimeout(() => setToast(""), 4000);
  }

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 16 };
  const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 14, width: "100%" };
  const lab: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4, marginTop: 10 };
  const ChannelSelect = ({ v, set }: { v: string; set: (s: string) => void }) => (
    <VgSelect full value={v} onChange={set} options={postable.length === 0 ? [{ value: "", label: "(salons en cours de synchro…)" }] : postable.map((c) => ({ value: c.id, label: `#${c.name}${c.type === "announcement" ? "" : ""}` }))} />
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 980, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-discord.webp" title="Discord" subtitle="Pilote le bot depuis le site : poste des embeds, lance des giveaways et le panneau de classes. Le bot exécute dans les secondes qui suivent." />
      <SectionTabs section="discord" />

      {toast && <div className="fx-card" style={{ ...card, padding: "10px 14px", color: ok ? "var(--green)" : "var(--red)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>{ok && <Icon name="check" size={16} />}{toast}</div>}

      {/* Créneaux récurrents — un rappel @everyone la veille puis le jour même, dans
          le salon de la guilde. Chacun a son interrupteur : le jeu peut être
          indisponible, et deux @everyone par semaine dans le vide apprennent surtout
          aux membres à ignorer le salon. */}
      <div id="creneaux" className="fx-card" style={card}>
        <div className="font-heading" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--orange)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="calendar" size={16} />Créneaux récurrents
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.55 }}>
          Le bot annonce <b>@everyone</b> dans le salon de la guilde : la veille à 20h pour préparer, puis le jour même à 20h pour se connecter.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {CRENEAUX.map((c) => {
            const actif = reglages?.[c.cle] ?? false;
            return (
              <div key={c.cle} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11, padding: "12px 14px" }}>
                <Icon name={c.icone} framed frameSize={38} tone="orange" />
                <div style={{ flex: 1, minWidth: 190 }}>
                  <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>{c.titre}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {c.quand}
                    {reglages && !actif && <span style={{ color: "var(--gold)" }}> · rappels coupés</span>}
                  </div>
                </div>
                {reglages === null ? (
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Chargement…</span>
                ) : (
                  <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 9, overflow: "hidden" }}>
                    {[false, true].map((v) => (
                      <button key={String(v)} onClick={() => basculer(c.cle, v)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 15px", border: 0, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                          background: actif === v ? (v ? "linear-gradient(180deg,#FFC061,#FF8C1A)" : "var(--bg-4)") : "rgba(0,0,0,.25)",
                          color: actif === v ? (v ? "#2a1400" : "var(--text)") : "var(--text-muted)" }}>
                        <Icon name={v ? "bell" : "ban"} size={13} />{v ? "Activés" : "Coupés"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="vg-subtabs">
        <button className={`vg-subtab ${tab === "embed" ? "active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 7 }} onClick={() => setTab("embed")}><Icon name="edit" size={15} />Embed Builder</button>
        <button className={`vg-subtab ${tab === "giveaway" ? "active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 7 }} onClick={() => setTab("giveaway")}><Icon name="sparkles" size={15} />Giveaway</button>
        <button className={`vg-subtab ${tab === "classes" ? "active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 7 }} onClick={() => setTab("classes")}><Icon name="users" size={15} />Panneau classes</button>
      </div>

      <div key={tab} className="vg-swap">
      {tab === "embed" && (
        <div className="fx-card" style={card}>
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
        <div className="fx-card" style={card}>
          <label style={lab}>Salon</label><ChannelSelect v={gCh} set={setGCh} />
          <label style={lab}>Lot(s) à gagner</label>
          {gPrizes.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input style={inp} value={p} onChange={(e) => setGPrizes(gPrizes.map((x, j) => (j === i ? e.target.value : x)))} placeholder={i === 0 ? "Ex : Stuff Yggdrasil complet" : `Lot ${i + 1}`} />
              {gPrizes.length > 1 && <button onClick={() => setGPrizes(gPrizes.filter((_, j) => j !== i))} title="Retirer ce lot" style={{ ...inp, width: 44, cursor: "pointer", color: "var(--red)", flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={15} /></button>}
            </div>
          ))}
          <button onClick={() => setGPrizes([...gPrizes, ""])} style={{ ...inp, width: "auto", cursor: "pointer", fontSize: 13, color: "var(--orange)", borderColor: "var(--orange)", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="plus" size={15} />Ajouter un lot</button>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
            <div style={{ flex: 1, minWidth: 120 }}><label style={lab}>Durée (30m, 2h, 1d)</label><input style={inp} value={gDur} onChange={(e) => setGDur(e.target.value)} /></div>
            <div style={{ width: 110 }}><label style={lab}>Gagnants</label><input type="number" min={1} style={inp} value={gWin} onChange={(e) => setGWin(Math.max(1, +e.target.value || 1))} /></div>
          </div>
          <div style={{ borderTop: "1px dashed var(--border)", marginTop: 12, paddingTop: 4 }}><span style={{ fontSize: 11, color: "var(--orange)", textTransform: "uppercase", letterSpacing: 1, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="palette" size={13} />Embed (optionnel)</span></div>
          <label style={lab}>Titre</label><input style={inp} value={gTitle} onChange={(e) => setGTitle(e.target.value)} placeholder="vide = GIVEAWAY — (1er lot)" />
          <label style={lab}>Description</label><input style={inp} value={gDesc} onChange={(e) => setGDesc(e.target.value)} placeholder="Texte de l'embed (optionnel)" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div><label style={lab}>Couleur</label><input type="color" value={gColor} onChange={(e) => setGColor(e.target.value)} style={{ ...inp, width: 60, padding: 4, height: 38 }} /></div>
            <div style={{ flex: 1, minWidth: 180 }}><label style={lab}>Image (URL)</label><input style={inp} value={gImg} onChange={(e) => setGImg(e.target.value)} placeholder="https://…" /></div>
          </div>
          <button className="vg-btn" style={{ marginTop: 14, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => { const ms = parseDurationMs(gDur); if (!ms) { setOk(false); setToast("Durée invalide (ex : 30m, 2h, 1d)."); setTimeout(() => setToast(""), 4000); return; } const prizes = gPrizes.map((p) => p.trim()).filter(Boolean); if (!prizes.length) { setOk(false); setToast("Ajoute au moins un lot."); setTimeout(() => setToast(""), 4000); return; } send("create_giveaway", { channelId: gCh, prize: prizes[0], prizes, durationMs: ms, winnersCount: gWin, description: gDesc || undefined, embedTitle: gTitle || undefined, embedColor: hexToInt(gColor), embedImage: gImg || undefined }); }}>Lancer le giveaway</button>
        </div>
      )}

      {tab === "classes" && (
        <div className="fx-card" style={card}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>Poste le panneau des 8 classes (boutons d'auto-attribution de rôle) dans le salon choisi.</p>
          <label style={lab}>Salon</label><ChannelSelect v={cCh} set={setCCh} />
          <button className="vg-btn" style={{ marginTop: 14, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => send("post_class_panel", { channelId: cCh })}>Poster le panneau de classes</button>
        </div>
      )}
      </div>

      {/* Historique */}
      <div className="fx-card" style={card}>
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
