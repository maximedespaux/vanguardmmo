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
    fetch("/airbuilder/data.json")
      .then((r) => r.text())
      .then((txt) => {
        if (cancelled) return;
        if (!document.getElementById("DATA")) {
          const d = document.createElement("script");
          d.id = "DATA";
          d.type = "application/json";
          d.textContent = txt;
          document.body.appendChild(d);
        }
        if (!document.getElementById("__ab_js")) {
          const s = document.createElement("script");
          s.id = "__ab_js";
          s.src = "/airbuilder/airbuilder.js";
          document.body.appendChild(s);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return null;
}
