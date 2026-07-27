"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; createdAt: string };

// Cloche de notifications du bandeau — ex. « X veut ton Glaive » pour les détenteurs.
export function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try { const r = await fetch("/api/notifications"); if (r.ok) { const d = await r.json(); setItems(d.items ?? []); setUnread(d.unread ?? 0); } } catch { /* silencieux */ }
  };
  useEffect(() => { load(); const t = setInterval(load, 45000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = async () => {
    const willOpen = !open; setOpen(willOpen);
    if (willOpen && unread > 0) {
      setUnread(0); setItems(prev => prev.map(n => ({ ...n, read: true })));
      try { await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); } catch { /* silencieux */ }
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={toggle} aria-label="Notifications" title="Notifications" style={{ position: "relative", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 6, display: "flex", alignItems: "center" }}>
        <Icon name="bell" size={19} />
        {unread > 0 && <span style={{ position: "absolute", top: 1, right: 1, minWidth: 15, height: 15, padding: "0 3px", borderRadius: 8, background: "var(--orange)", color: "#0a0a0c", fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 320, maxWidth: "90vw", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 16px 40px rgba(0,0,0,.5)", zIndex: 200, overflow: "hidden" }}>
          <div style={{ padding: "11px 14px", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--orange)", fontFamily: "'Rubik',sans-serif" }}>Notifications</div>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {items.length === 0 ? (
              <div style={{ padding: 22, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Aucune notification.</div>
            ) : items.map(n => {
              const inner = (
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10, background: n.read ? "transparent" : "rgba(255,140,26,.06)" }}>
                  <Icon name={n.type === "bank_request" ? "cart" : "info"} size={16} style={{ color: "var(--orange)", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, wordBreak: "break-word" }}>{n.body}</div>}
                  </div>
                </div>
              );
              return n.link ? <a key={n.id} href={n.link} onClick={() => setOpen(false)} style={{ textDecoration: "none", display: "block" }}>{inner}</a> : <div key={n.id}>{inner}</div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
