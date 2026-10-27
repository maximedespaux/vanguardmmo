"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ensureVgIcons } from "@/lib/vanillaLoader";

// Charge le moteur AirBuilder (vanilla JS d'iBeats). Re-render au re-montage de la page.
// Recharge proprement si une autre app (AirGuild) tenait les globals (isolation SPA).
export function BuilderRunner({ embed = false, connecte = true }: { embed?: boolean; connecte?: boolean }) {
  useEffect(() => {
    const w = window as unknown as { __APP?: string; render?: () => void; __VIEW?: boolean; __embed?: number; __ANON?: boolean; vgOuvrirDepuisURL?: () => void; vgPublierMaintenant?: () => unknown };
    /* EN QUITTANT /builder PAR UN LIEN DU SITE, la publication en attente part tout de
       suite (vgPublierMaintenant) : le moteur reste chargé, mais il l'aurait envoyée
       1,5 s plus tard — après que « Mes personnages » ou l'accueil ont déjà lu
       /api/characters. Ceux-ci attendent la promesse qu'elle laisse (lib/mesPersos,
       `apresPublication`). */
    const publier = () => { try { w.vgPublierMaintenant?.(); } catch { /* noop */ } };
    /* Visiteur non connecté : il compose librement, mais rien ne quitte son
       navigateur. Le moteur lit ce drapeau pour couper la sauvegarde cloud et
       renvoyer vers la connexion sur tout ce qui engage un compte. Posé AVANT
       le chargement du moteur, comme `__embed` — après, la sauvegarde aurait
       déjà pu partir. */
    w.__ANON = !connecte;
    // L'ancien public/builder.html posait __embed = 1. Le moteur s'en sert pour
    // renvoyer le build au parent par postMessage (c'est ainsi que la
    // candidature le recupere) et pour couper la sauvegarde cloud.
    // A poser AVANT le chargement du moteur, sinon la capture ne marche plus.
    if (embed) w.__embed = 1;
    if (w.__APP === "airbuilder" && typeof w.render === "function") {
      if (w.__VIEW) { window.location.reload(); return; } // on revient d'une vue lecture seule → reboot propre sur mon build
      // Le moteur est déjà chargé : on revient sur /builder depuis une autre page
      // du site (ou React remonte le composant, en développement). Le lien
      // ?perso=…&stuff=… de CETTE visite doit donc être relu ici — le moteur ne
      // le lit de lui-même qu'à son premier chargement. Le rejouer est sans effet
      // de bord : il n'écrit rien et rouvre ce qui est déjà ouvert.
      try { w.render(); w.vgOuvrirDepuisURL?.(); } catch { /* noop */ } return publier;
    }
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
      await ensureVgIcons(); // window.VGI doit exister avant le premier rendu du moteur
      if (cancelled) return;
      if (!document.getElementById("__ab_js")) {
        const s = document.createElement("script");
        s.id = "__ab_js"; s.src = "/airbuilder/airbuilder.js";
        document.body.appendChild(s);
      }
    })();
    return () => { cancelled = true; publier(); };
  }, [embed, connecte]);

  /* UN LIEN PROFOND SUIVI DEPUIS /builder MÊME — le perso principal du panneau profil,
     dans l'en-tête : même chemin, autre requête, la page ne se remonte pas et l'effet
     du dessus ne repart pas. L'adresse changeait, le builder restait sur l'ancien
     perso. On relit donc le lien à chaque changement de la requête ; sans objet tant
     que le moteur n'est pas chargé, il le lit lui-même à son démarrage. */
  const requete = useSearchParams()?.toString() ?? "";
  useEffect(() => {
    const w = window as unknown as { __APP?: string; vgOuvrirDepuisURL?: () => void };
    if (w.__APP === "airbuilder") { try { w.vgOuvrirDepuisURL?.(); } catch { /* noop */ } }
  }, [requete]);
  return null;
}
