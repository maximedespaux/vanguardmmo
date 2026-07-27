/**
 * Signal sonore et notification du navigateur.
 *
 * Depuis que Discord ne relaie plus rien, une demande qui arrive pendant qu'on
 * regarde ailleurs peut dormir des heures : le site est le seul canal. Un badge
 * ne suffit pas, il faut que ça sorte de l'onglet.
 *
 * Rien ne se déclenche sans accord explicite : le son se coupe d'un clic et la
 * permission du navigateur est demandée sur un geste, jamais à l'ouverture de
 * la page — une demande d'autorisation surgie de nulle part se refuse par
 * réflexe, et elle ne se redemande pas.
 */

const CLEF_SON = "vg.alerte.son";

export function sonActif(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CLEF_SON) !== "0";
}

export function reglerSon(actif: boolean) {
  try { window.localStorage.setItem(CLEF_SON, actif ? "1" : "0"); } catch { /* mode privé */ }
}

/**
 * Deux notes courtes, synthétisées à la volée. Pas de fichier audio : un asset
 * de plus à charger, à versionner et à retrouver en 404 le jour où le dossier
 * bouge, pour un son de trois dixièmes de seconde.
 */
export function jouerCarillon() {
  if (!sonActif()) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [880, 1174.7]; // la, ré — un intervalle qui monte, donc qui appelle
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.13;
      // Enveloppe douce : un carré brut claque et fait sursauter.
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.24);
    });
    // On referme : un contexte audio laissé ouvert par page finit par saturer.
    window.setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch { /* pas de son : ce n'est qu'un confort */ }
}

export type EtatPermission = "default" | "granted" | "denied" | "absent";

export function permissionNotif(): EtatPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "absent";
  return Notification.permission as EtatPermission;
}

/** À n'appeler que depuis un clic : les navigateurs exigent un geste. */
export async function demanderPermission(): Promise<EtatPermission> {
  if (permissionNotif() === "absent") return "absent";
  try { return (await Notification.requestPermission()) as EtatPermission; } catch { return permissionNotif(); }
}

/** Notification hors de l'onglet. Silencieuse si la permission manque. */
export function notifierNavigateur(titre: string, corps: string, lien?: string | null) {
  if (permissionNotif() !== "granted") return;
  try {
    const n = new Notification(titre, { body: corps, icon: "/assets/site/logo-bat.webp", tag: "vanguard" });
    n.onclick = () => {
      window.focus();
      if (lien) window.location.href = lien;
      n.close();
    };
  } catch { /* certains navigateurs exigent un service worker : tant pis */ }
}
