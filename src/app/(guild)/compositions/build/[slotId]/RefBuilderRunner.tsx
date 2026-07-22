"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { BUILDER_MARKUP } from "@/app/(guild)/builder/markup";
import { CS_SLOTS } from "../../slots";
import { canAccessAdmin } from "@/config/roles";
import type { Role } from "@prisma/client";

// Build de référence d'un poste : chargé depuis /api/compositions/ref/[slotId].
// - lecture (tout le monde) : window.__VIEW (non modifiable, comme la vue d'un membre).
// - édition (staff/admin, ?edit=1) : window.__refSave → la sauvegarde du moteur part vers la compo
//   (et window.__embed bloque toute écriture sur le compte perso de l'admin).
export function RefBuilderRunner({ slotId, edit }: { slotId: string; edit: boolean }) {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  // Édition des builds de référence = tout le staff admin (Direction/Vanguard/Général/Officier), cohérent avec le reste de la page Compositions.
  const canEditRef = (role ? canAccessAdmin(role as Role) : false) || process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";
  const editMode = edit && canEditRef;
  const slot = CS_SLOTS.find((s) => s.id === slotId);
  const label = slot?.label ?? slotId;
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<"idle" | "saving" | "ok">("idle");
  const [noRef, setNoRef] = useState(false);
  // Le markup du moteur est monté UNE SEULE FOIS (référence d'élément stable) : sinon chaque changement
  // d'état `saved` re-render le composant et React ré-applique le dangerouslySetInnerHTML → il écrase le
  // DOM que airbuilder.js a construit (retour à un #setup VIDE) → le MutationObserver auto-réparateur du
  // moteur rappelle render() → render() re-save → setSaved → … : boucle de rendu (« sauvegarde/actualisation
  // constante »). Un élément mémoïsé n'est jamais re-réconcilié, donc le DOM du moteur est préservé.
  const builderMarkup = useMemo(() => <div dangerouslySetInnerHTML={{ __html: BUILDER_MARKUP }} />, []);
  useEffect(() => {
    // On attend que la session soit résolue AVANT de charger le moteur : `editMode` doit être final
    // avant le montage du builder. AUCUN window.location.reload() ici : cette page n'est atteinte QUE par
    // navigation pleine page (liens <a href>, jamais <Link>), donc la fenêtre est toujours neuve et le
    // moteur jamais pré-chargé — un reload ne pouvait que créer une boucle (editMode bascule → l'effet se
    // relance → voit __APP posé par notre propre moteur → recharge → …). On configure juste les globals.
    if (status === "loading") return;
    const w = window as unknown as { __APP?: string; __VIEW?: boolean; __VIEW_BLOB?: unknown; __refSave?: (s: unknown) => void; __embed?: boolean; __rt?: ReturnType<typeof setTimeout> };
    let cancelled = false;
    (async () => {
      let blob: { chars?: unknown[] } | null = null;
      try {
        const r = await fetch(`/api/compositions/ref/${encodeURIComponent(slotId)}`);
        if (r.status === 403) { setErr("Accès réservé à la guilde."); return; }
        if (r.ok) blob = (await r.json()).blob;
      } catch { setErr("Erreur de chargement du build de référence."); return; }
      if (cancelled) return;
      const has = !!(blob && Array.isArray(blob.chars) && blob.chars.length);
      if (!has) {
        if (!editMode) { setNoRef(true); return; }
        blob = { chars: [{ name: label, cls: slot?.classe ?? "Arcaniste", sex: "G", lvl: 200, prestige: 3, carnets: [], carnetsFull: [], stuffs: [{ name: "DPS", eq: {} }, { name: "Tank", eq: {} }, { name: "Hybride", eq: {} }], curStuff: 0 }] };
      }
      w.__VIEW_BLOB = blob;
      if (editMode) {
        w.__VIEW = false;
        w.__embed = true;
        w.__refSave = (s: unknown) => {
          setSaved("saving");
          clearTimeout(w.__rt);
          w.__rt = setTimeout(() => {
            fetch(`/api/compositions/ref/${encodeURIComponent(slotId)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blob: s }) }).then((r) => setSaved(r.ok ? "ok" : "idle")).catch(() => setSaved("idle"));
          }, 800);
        };
      } else {
        w.__embed = false;
        w.__refSave = undefined;
        w.__VIEW = true;
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [status, slotId, editMode, label, slot]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const txt = await fetch("/airbuilder/data.json").then((r) => r.text()).catch(() => null);
      if (cancelled || txt === null) return;
      if (!document.getElementById("DATA")) { const d = document.createElement("script"); d.id = "DATA"; d.type = "application/json"; d.textContent = txt; document.body.appendChild(d); }
      if (!document.getElementById("__ab_js")) { const s = document.createElement("script"); s.id = "__ab_js"; s.src = "/airbuilder/airbuilder.js"; document.body.appendChild(s); }
    })();
    return () => { cancelled = true; };
  }, [ready]);

  if (noRef) return <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Aucun build de référence défini pour ce poste pour l&apos;instant.<div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>{canEditRef && <a href={`/compositions/build/${slotId}?edit=1`} style={{ color: "#0a0a0c", background: "var(--green)", padding: "9px 16px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>✏️ Créer la référence</a>}<a href="/compositions" style={{ color: "var(--orange)", padding: "9px 16px" }}>← Retour aux compositions</a></div></div>;
  if (err) return <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>{err}<div style={{ marginTop: 12 }}><a href="/compositions" style={{ color: "var(--orange)" }}>← Retour aux compositions</a></div></div>;
  if (!ready) return <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Chargement…</div>;
  return (
    <>
      {!editMode && <style>{`.builder-readonly .actions{display:none}`}</style>}
      <div style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "9px 14px", borderRadius: 10, background: editMode ? "rgba(74,222,128,.10)" : "rgba(255,140,26,.10)", border: `1px solid ${editMode ? "rgba(74,222,128,.35)" : "rgba(255,140,26,.35)"}`, color: editMode ? "var(--green)" : "var(--orange)", fontSize: 13, fontWeight: 600 }}>
        <a href="/compositions" style={{ color: "inherit", textDecoration: "none", opacity: 0.85 }}>← Compositions</a>
        <span style={{ opacity: 0.5 }}>·</span>
        {editMode
          ? <span>✏️ Édition du <b>build de référence</b> — {label} <span style={{ fontWeight: 400, opacity: 0.85 }}>(enregistré dans la composition, jamais sur ton compte)</span>{saved === "saving" ? " · 💾…" : saved === "ok" ? " · ✓ enregistré" : ""}</span>
          : <><span>👁️ <b>Build de référence</b> — {label} <span style={{ fontWeight: 400, opacity: 0.85 }}>(consultation)</span></span>{canEditRef && <a href={`/compositions/build/${slotId}?edit=1`} style={{ marginLeft: "auto", color: "#0a0a0c", background: "var(--green)", padding: "7px 14px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>✏️ Éditer ce build ↗</a>}</>}
      </div>
      {builderMarkup}
    </>
  );
}
