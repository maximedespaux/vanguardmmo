"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

// Charge l'app AirGuild d'iBeats (vanilla JS) et branche son stockage sur la base
// (state partagé via /api/admin/airguild). Recharge proprement si une autre app
// (AirBuilder) tenait les globals.
export function AirGuildRunner() {
  const { data: session } = useSession();
  // Expose le staff connecté (pseudo + rôle) : tracer qui dépose (#29) + gating édition réservée Vanguard.
  useEffect(() => {
    const w = window as unknown as { __agUser?: string; __agRole?: string };
    const u = session?.user as { username?: string; name?: string; role?: string } | undefined;
    w.__agUser = (u?.username) || (session?.user?.name ?? "") || "";
    w.__agRole = u?.role || (process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1" ? "DIRECTION" : "");
  }, [session]);
  useEffect(() => {
    const w = window as unknown as { __APP?: string; render?: () => void; __AGSTATE?: unknown; __agSave?: (s: unknown) => void; __agt?: ReturnType<typeof setTimeout> };
    if (w.__APP === "airguild" && typeof w.render === "function") { try { w.render(); } catch { /* noop */ } return; }
    if (w.__APP && w.__APP !== "airguild") { window.location.reload(); return; }

    let cancelled = false;
    w.__agSave = (s: unknown) => {
      clearTimeout(w.__agt);
      w.__agt = setTimeout(() => {
        fetch("/api/admin/airguild", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }).catch(() => {});
      }, 600);
    };
    (async () => {
      const state = await fetch("/api/admin/airguild").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (cancelled) return;
      w.__AGSTATE = state;
      const data = await fetch("/airguild/data.json").then((r) => r.text()).catch(() => "{}");
      if (cancelled) return;
      if (!document.getElementById("AG_DATA")) {
        const d = document.createElement("script"); d.id = "AG_DATA"; d.type = "application/json"; d.textContent = data; document.body.appendChild(d);
      }
      if (!document.getElementById("__ag_js")) {
        const sc = document.createElement("script"); sc.id = "__ag_js"; sc.src = "/airguild/airguild.js"; document.body.appendChild(sc);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return null;
}
