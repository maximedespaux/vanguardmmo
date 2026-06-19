"use client";
import { useEffect, useRef, useState } from "react";

// Dropdown 100% maison (remplace les <select> natifs moches du navigateur).
// Usage : <VgSelect value={v} onChange={v => setV(v)} options={["a","b"]} />
//   options : tableau de strings/numbers, ou {value,label}.

type Opt = { value: string; label: string };
type In = string | number | Opt;

export function VgSelect({ value, onChange, options, style, minWidth, placeholder, full }: {
  value: string | number;
  onChange: (v: string) => void;
  options: In[];
  style?: React.CSSProperties;
  minWidth?: number;
  placeholder?: string;
  full?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const opts: Opt[] = options.map((o) => (typeof o === "object" ? o : { value: String(o), label: String(o) }));
  const cur = opts.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);

  return (
    <div ref={ref} className="vg-dd" style={{ position: "relative", minWidth, width: full ? "100%" : undefined, ...style }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "var(--bg-3)", border: `1px solid ${open ? "var(--orange)" : "var(--border)"}`, borderRadius: 9, padding: "9px 12px", color: cur ? "var(--text)" : "var(--text-muted)", fontFamily: "'Rajdhani',sans-serif", fontSize: 13.5, fontWeight: 600, cursor: "pointer", boxShadow: open ? "0 0 0 3px rgba(255,140,26,.16)" : "none", transition: "border-color .15s, box-shadow .15s" }}>
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cur?.label ?? placeholder ?? String(value)}</span>
        <span style={{ color: "var(--orange)", fontSize: 11, transform: open ? "rotate(180deg)" : "none", transition: "transform .18s", flexShrink: 0 }}>▾</span>
      </button>
      {open && (
        <div className="vg-dd-list" style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, zIndex: 200, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 11, boxShadow: "0 16px 40px rgba(0,0,0,.6)", padding: 5, maxHeight: 264, overflowY: "auto", animation: "vgddin .14s ease" }}>
          {opts.map((o) => {
            const sel = String(o.value) === String(value);
            return (
              <div key={String(o.value)} className="vg-dd-opt" onClick={() => { onChange(String(o.value)); setOpen(false); }}
                style={{ padding: "8px 11px", borderRadius: 7, fontSize: 13.5, cursor: "pointer", color: sel ? "var(--orange)" : "var(--text)", background: sel ? "rgba(255,140,26,.12)" : "transparent", fontWeight: sel ? 700 : 500, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, transition: "background .12s" }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>{sel && <span style={{ fontSize: 11, flexShrink: 0 }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
