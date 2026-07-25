"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ensureVgIcons } from "@/lib/vanillaLoader";

// Charge l'app AirGuild d'iBeats (vanilla JS) et branche son stockage sur la base
// (state partagé via /api/admin/airguild). Recharge proprement si une autre app
// (AirBuilder) tenait les globals.
export function AirGuildRunner({ roster = [] }: { roster?: string[] }) {
  const { data: session } = useSession();
  /**
   * Le coffre est un etat partage remplace EN BLOC a chaque sauvegarde. Si sa
   * lecture echoue, demarrer le moteur quand meme le ferait partir d'un coffre
   * VIDE — et la premiere action ecraserait le vrai coffre de la guilde. On
   * refuse donc de demarrer plutot que de risquer ca.
   */
  const [echecLecture, setEchecLecture] = useState(false);
  // Expose le staff connecté (pseudo + rôle) : tracer qui dépose (#29) + gating édition réservée Vanguard.
  // + le roster Discord (F2) : les coffres membres sont auto-créés depuis la vraie liste de guilde.
  useEffect(() => {
    const w = window as unknown as { __agUser?: string; __agRole?: string; __agRoster?: string[] };
    const u = session?.user as { username?: string; name?: string; role?: string } | undefined;
    w.__agUser = (u?.username) || (session?.user?.name ?? "") || "";
    w.__agRole = u?.role || (process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1" ? "DIRECTION" : "");
    w.__agRoster = roster;
  }, [session, roster]);
  useEffect(() => {
    const w = window as unknown as { __APP?: string; render?: () => void; renderTabs?: () => void; __AGSTATE?: unknown; __agSave?: (s: unknown) => void; __agt?: ReturnType<typeof setTimeout> };
    // Re-navigation SPA (Administration → AirGuild) : le markup est recréé vide → on re-rend les onglets ET la vue (sinon onglets vides jusqu'au refresh).
    if (w.__APP === "airguild" && typeof w.render === "function") { try { w.renderTabs?.(); w.render(); } catch { /* noop */ } return; }
    if (w.__APP && w.__APP !== "airguild") { window.location.reload(); return; }

    let cancelled = false;
    w.__agSave = (s: unknown) => {
      clearTimeout(w.__agt);
      w.__agt = setTimeout(() => {
        fetch("/api/admin/airguild", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }).catch(() => {});
      }, 600);
    };
    (async () => {
      // On distingue « pas encore de coffre » (reponse valide, contenu vide) de
      // « lecture impossible » : seul le second cas doit empecher le demarrage.
      let lu = true;
      const state = await fetch("/api/admin/airguild")
        .then((r) => { if (!r.ok) { lu = false; return null; } return r.json(); })
        .catch(() => { lu = false; return null; });
      if (cancelled) return;
      if (!lu) { setEchecLecture(true); return; }
      w.__AGSTATE = state;
      const data = await fetch("/airguild/data.json").then((r) => r.text()).catch(() => "{}");
      if (cancelled) return;
      if (!document.getElementById("AG_DATA")) {
        const d = document.createElement("script"); d.id = "AG_DATA"; d.type = "application/json"; d.textContent = data; document.body.appendChild(d);
      }
      await ensureVgIcons(); // window.VGI + classes .vgi-* avant le premier rendu du moteur
      if (!document.getElementById("__ag_js")) {
        const sc = document.createElement("script"); sc.id = "__ag_js"; sc.src = "/airguild/airguild.js"; document.body.appendChild(sc);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (echecLecture) {
    return (
      <div style={{ margin: 24, padding: 20, borderRadius: 12, border: "1px solid var(--red)", background: "rgba(248,113,113,.08)" }}>
        <div style={{ fontWeight: 700, color: "var(--red)", marginBottom: 6 }}>Coffre non chargé</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
          Impossible de lire le coffre de guilde. L&apos;éditeur reste fermé volontairement : l&apos;ouvrir sur un coffre vide
          écraserait le vrai au premier enregistrement.
        </div>
        <button className="vg-btn" onClick={() => window.location.reload()}>Réessayer</button>
      </div>
    );
  }
  return null;
}
