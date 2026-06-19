"use client";
import { useEffect, useState } from "react";

// Dialogues maison (confirm / prompt / toast) — remplacent les popups natifs du navigateur.
// Usage : import { vgConfirm, vgPrompt, vgToast } from "@/components/Dialogs";
//   if (await vgConfirm("Supprimer ?")) { ... }
//   const note = await vgPrompt("Raison ?");
//   vgToast("Enregistré ✓");

type Dlg = { kind: "confirm" | "prompt"; msg: string; def?: string; resolve: (v: unknown) => void };
let _open: ((d: Dlg | null) => void) | null = null;
let _toast: ((t: { msg: string; ok: boolean } | null) => void) | null = null;

export function vgConfirm(msg: string): Promise<boolean> {
  return new Promise(res => { if (_open) _open({ kind: "confirm", msg, resolve: res as (v: unknown) => void }); else res(window.confirm(msg)); });
}
export function vgPrompt(msg: string, def = ""): Promise<string | null> {
  return new Promise(res => { if (_open) _open({ kind: "prompt", msg, def, resolve: res as (v: unknown) => void }); else res(window.prompt(msg, def)); });
}
export function vgToast(msg: string, ok = true) { if (_toast) _toast({ msg, ok }); }

export function DialogHost() {
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const [val, setVal] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    _open = (d) => { setDlg(d); setVal(d?.def ?? ""); };
    _toast = (t) => { setToast(t); if (t) setTimeout(() => setToast(null), 2800); };
    return () => { _open = null; _toast = null; };
  }, []);

  const close = (ok: boolean) => { if (dlg) dlg.resolve(dlg.kind === "prompt" ? (ok ? val : null) : ok); setDlg(null); };

  return (
    <>
      {dlg && (
        <div onClick={() => close(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "vgfade .18s ease" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, maxWidth: 420, width: "100%", boxShadow: "0 18px 50px rgba(0,0,0,.6)" }}>
            <div style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 16, whiteSpace: "pre-line", color: "var(--text)" }}>{dlg.msg}</div>
            {dlg.kind === "prompt" && (
              <input autoFocus value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") close(true); if (e.key === "Escape") close(false); }}
                style={{ width: "100%", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", marginBottom: 16, outline: "none" }} />
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => close(false)} style={{ padding: "9px 16px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer", fontWeight: 600 }}>Annuler</button>
              <button onClick={() => close(true)} className="vg-btn">{dlg.kind === "prompt" ? "OK" : "Confirmer"}</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 26, transform: "translateX(-50%)", zIndex: 9999, background: "#16161c", color: "var(--text)", border: `1px solid ${toast.ok ? "var(--orange)" : "var(--red)"}`, borderRadius: 10, padding: "11px 18px", fontWeight: 600, fontSize: 13, maxWidth: "90vw", boxShadow: "0 10px 30px rgba(0,0,0,.55)", animation: "vgswap .25s ease" }}>{toast.msg}</div>
      )}
    </>
  );
}
