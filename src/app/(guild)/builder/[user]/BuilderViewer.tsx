"use client";
import { useEffect, useState } from "react";
import { BUILDER_MARKUP } from "../markup";

// Vue lecture seule du build d'un membre (pour le staff, depuis le GuildViewer).
// version → ouvre un snapshot archivé (#7) au lieu du build courant.
// airbuilder.js bloque toute sauvegarde quand window.__VIEW est vrai (le build perso de l'admin n'est jamais touché).
export function BuilderViewer({ user, version }: { user: string; version?: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [who, setWho] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as unknown as { __APP?: string; __VIEW?: boolean; __VIEW_BLOB?: unknown; __viewUser?: string };
    if (w.__APP === "airbuilder") { window.location.reload(); return; } // moteur déjà chargé → reboot propre en mode vue
    let cancelled = false;
    (async () => {
      let blob: { chars?: unknown[] } | null = null;
      let username = "";
      try {
        const r = await fetch(`/api/builder-state?user=${encodeURIComponent(user)}${version ? `&v=${encodeURIComponent(version)}` : ""}`);
        if (r.status === 403) { setErr("Accès réservé au staff."); return; }
        if (r.status === 401) { setErr("Connecte-toi pour consulter ce build."); return; }
        if (r.status === 404) { setErr("Membre introuvable."); return; }
        if (!r.ok) { setErr("Erreur de chargement du build."); return; }
        const j = await r.json();
        blob = j.blob; username = j.username || "";
      } catch { setErr("Erreur de chargement du build."); return; }
      if (cancelled) return;
      if (!blob || !Array.isArray(blob.chars) || !blob.chars.length) {
        setErr(version ? "Version introuvable ou expirée." : `${username || "Ce membre"} n'a pas encore enregistré de build dans l'AirBuilder.`);
        return;
      }
      w.__VIEW = true; w.__VIEW_BLOB = blob; w.__viewUser = username;
      setWho(username); setReady(true);
    })();
    return () => { cancelled = true; };
  }, [user, version]);

  // Une fois le markup monté (ready), on injecte les données + le moteur.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
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
  }, [ready]);

  if (err) return <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>{err}</div>;
  if (!ready) return <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Chargement du build…</div>;
  return (
    <>
      <style>{`.builder-readonly .actions{display:none}`}</style>
      <div style={{ margin: "0 0 12px", padding: "9px 14px", borderRadius: 10, background: "rgba(255,140,26,.10)", border: "1px solid rgba(255,140,26,.35)", color: "var(--orange)", fontSize: 13, fontWeight: 600 }}>
        {version ? "🕘 Ancienne version" : "👁️ Mode lecture"} — build de <b>{who || "ce membre"}</b> (consultation, non modifiable).
      </div>
      <div dangerouslySetInnerHTML={{ __html: BUILDER_MARKUP }} />
    </>
  );
}
