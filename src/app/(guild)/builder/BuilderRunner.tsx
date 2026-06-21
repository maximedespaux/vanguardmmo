"use client";
import { useEffect } from "react";

// Charge le moteur AirBuilder (vanilla JS d'iBeats). Re-render au re-montage de la page.
// Recharge proprement si une autre app (AirGuild) tenait les globals (isolation SPA).
export function BuilderRunner() {
  useEffect(() => {
    const w = window as unknown as { __APP?: string; render?: () => void };
    if (w.__APP === "airbuilder" && typeof w.render === "function") { try { w.render(); } catch { /* noop */ } return; }
    if (w.__APP && w.__APP !== "airbuilder") { window.location.reload(); return; }

    let cancelled = false;
    (async () => {
      // Sync cross-device : on charge le build sauvegardé en base s'il est plus récent que le local.
      try {
        const r = await fetch("/api/builder-state");
        if (r.ok) {
          const j = await r.json();
          if (j && j.blob) {
            let localTs = 0;
            try { localTs = JSON.parse(localStorage.getItem("vg_air_e1") || "{}")._ts || 0; } catch { /* noop */ }
            if ((j.blob._ts || 0) > localTs) { try { localStorage.setItem("vg_air_e1", JSON.stringify(j.blob)); } catch { /* noop */ } }
          }
        }
      } catch { /* non connecté / hors-ligne : on garde le build local */ }
      if (cancelled) return;
      const txt = await fetch("/airbuilder/data.json").then((r) => r.text()).catch(() => null);
      if (cancelled || txt === null) return;
      if (!document.getElementById("DATA")) {
        const d = document.createElement("script");
        d.id = "DATA"; d.type = "application/json"; d.textContent = txt;
        document.body.appendChild(d);
      }
      if (!document.getElementById("__ab_js")) {
        const s = document.createElement("script");
        s.id = "__ab_js"; s.src = "/airbuilder/airbuilder.js";
        document.body.appendChild(s);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return null;
}
