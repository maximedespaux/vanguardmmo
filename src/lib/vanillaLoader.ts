/**
 * Chargement ordonné des scripts des apps « vanilla » (AirBuilder / AirGuild).
 *
 * Pourquoi ce helper : un <script> créé via document.createElement a async=true
 * par défaut, donc son ordre d'exécution n'est PAS garanti. Le moteur
 * (airbuilder.js / airguild.js) appelle VGI() dès son premier rendu : il faut
 * donc être certain que /icons/vg-icons.js est exécuté AVANT lui.
 */

/** Charge un script une seule fois et résout quand il est réellement exécuté. */
export function loadScriptOnce(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const prev = document.getElementById(id) as HTMLScriptElement | null;
    if (prev) {
      if (prev.dataset.loaded === "1") { resolve(); return; }
      prev.addEventListener("load", () => resolve(), { once: true });
      prev.addEventListener("error", () => reject(new Error(`Échec du chargement de ${src}`)), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = false; // conserve l'ordre d'exécution entre scripts injectés
    s.addEventListener("load", () => { s.dataset.loaded = "1"; resolve(); }, { once: true });
    s.addEventListener("error", () => reject(new Error(`Échec du chargement de ${src}`)), { once: true });
    document.body.appendChild(s);
  });
}

/**
 * Garantit que window.VGI (jeu d'icônes partagé) est disponible.
 * À attendre avant d'injecter airbuilder.js / airguild.js.
 */
export function ensureVgIcons(): Promise<void> {
  if (typeof window !== "undefined" && (window as unknown as { VGI?: unknown }).VGI) return Promise.resolve();
  return loadScriptOnce("__vg_icons", "/icons/vg-icons.js");
}
