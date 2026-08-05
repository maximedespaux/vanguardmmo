"use client";
import { useEffect, useState } from "react";
import { BUILDER_MARKUP } from "@/app/(verified)/builder/markup";
import { ensureVgIcons } from "@/lib/vanillaLoader";
import { Icon } from "@/components/Icon";

// Charge un build PARTAGÉ (public) par shareId et le rend en lecture seule (window.__VIEW).
export function SharedBuildViewer({ shareId }: { shareId: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [who, setWho] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as unknown as { __APP?: string; __VIEW?: boolean; __VIEW_BLOB?: unknown; __viewUser?: string };
    if (w.__APP === "airbuilder") { window.location.reload(); return; } // moteur déjà chargé → reboot propre en mode vue
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/builder-share/${encodeURIComponent(shareId)}`);
        if (r.status === 404) { setErr("Ce build n'existe pas ou n'est pas public."); return; }
        if (!r.ok) { setErr("Erreur de chargement du build."); return; }
        const j = await r.json();
        if (cancelled) return;
        const blob = j.blob as { chars?: unknown[] } | null;
        if (!blob || !Array.isArray(blob.chars) || !blob.chars.length) { setErr("Ce build est vide."); return; }
        w.__VIEW = true; w.__VIEW_BLOB = blob; w.__viewUser = j.username || "";
        setWho(j.username || ""); setReady(true);
      } catch { setErr("Erreur de chargement du build."); }
    })();
    return () => { cancelled = true; };
  }, [shareId]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const txt = await fetch("/airbuilder/data.json").then((r) => r.text()).catch(() => null);
      if (cancelled || txt === null) return;
      if (!document.getElementById("DATA")) { const d = document.createElement("script"); d.id = "DATA"; d.type = "application/json"; d.textContent = txt; document.body.appendChild(d); }
      await ensureVgIcons(); // window.VGI doit exister avant le premier rendu du moteur
      if (cancelled) return;
      if (!document.getElementById("__ab_js")) { const s = document.createElement("script"); s.id = "__ab_js"; s.src = "/airbuilder/airbuilder.js"; document.body.appendChild(s); }
    })();
    return () => { cancelled = true; };
  }, [ready]);

  if (err) return <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>{err}</div>;
  if (!ready) return <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Chargement du build…</div>;
  return (
    <>
      <style>{`.builder-readonly .actions{display:none}`}</style>
      <div style={{ margin: "0 0 12px", padding: "9px 14px", borderRadius: 10, background: "rgba(255,140,26,.10)", border: "1px solid rgba(255,140,26,.35)", color: "var(--orange)", fontSize: 13, fontWeight: 600 }}>
        <Icon name="eye" size={15} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 6 }} />Build partagé de <b>{who || "un membre"}</b> — consultation (lecture seule).
      </div>
      <div dangerouslySetInnerHTML={{ __html: BUILDER_MARKUP }} />
    </>
  );
}
