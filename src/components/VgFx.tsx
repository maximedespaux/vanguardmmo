"use client";
import { useEffect } from "react";

/**
 * Briques d'effets réutilisables, posables sur n'importe quelle page sans en
 * changer le markup : on ajoute une classe, le hook fait le reste.
 *   .vg-reveal → apparition au défilement (useReveal)
 *   .fx-card   → halo qui suit le curseur + léger relief 3D (useCardFx)
 *
 * Les deux respectent `prefers-reduced-motion` : le contenu s'affiche alors
 * immédiatement, sans mouvement.
 */

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Apparition au défilement, AVEC REPLI.
 *
 * Les éléments `.vg-reveal` démarrent à `opacity:0`. L'ancienne implémentation
 * ne comptait que sur un IntersectionObserver (seuil 0.12, rootMargin -8 %) :
 * dès qu'il ratait un élément — défilement rapide, position restaurée au retour
 * en arrière, élément plus haut que la fenêtre — celui-ci restait invisible
 * DÉFINITIVEMENT. C'était un vrai bug : du contenu ne s'affichait jamais.
 *
 * D'où le double filet :
 *   1. l'observateur (seuil 0, il déclenche au premier pixel visible) ;
 *   2. un balayage manuel au montage puis à chaque défilement / redimensionnement.
 * Le défilement est porté par `.vg-main` (le shell est en `overflow:hidden`),
 * pas par la fenêtre : écouter `window` n'aurait rien capté.
 */
export function useReveal<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(".vg-reveal"));
    if (!els.length) return;
    const show = (el: Element) => el.classList.add("in");

    if (reduced()) { els.forEach(show); return; }

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }),
      { threshold: 0, rootMargin: "0px 0px -5% 0px" }
    );
    els.forEach((el) => io.observe(el));

    // Repli : révèle tout ce qui touche la fenêtre, sans dépendre de l'observateur.
    const sweep = () => {
      for (const el of els) {
        if (el.classList.contains("in")) continue;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.98 && r.bottom > 0) { show(el); io.unobserve(el); }
      }
    };
    const raf = requestAnimationFrame(sweep);
    const t = setTimeout(sweep, 350);
    const scroller: HTMLElement | Window = document.querySelector<HTMLElement>(".vg-main") ?? window;
    scroller.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("resize", sweep, { passive: true });
    return () => {
      cancelAnimationFrame(raf); clearTimeout(t); io.disconnect();
      scroller.removeEventListener("scroll", sweep);
      window.removeEventListener("resize", sweep);
    };
  }, [ref]);
}

/**
 * Halo qui suit le curseur + léger relief 3D sur les enfants `.fx-card`.
 * Un seul écouteur posé sur le conteneur (délégation d'événements) : le coût ne
 * dépend pas du nombre de cartes. Le halo est piloté par des variables CSS
 * (--mx/--my pour la position, --rx/--ry pour l'inclinaison) lues par le CSS,
 * et limité à une mise à jour par image affichée.
 */
export function useCardFx<T extends HTMLElement>(ref: React.RefObject<T | null>, tilt = 3) {
  useEffect(() => {
    const root = ref.current;
    if (!root || reduced()) return;
    let frame = 0;

    const onMove = (ev: PointerEvent) => {
      const card = (ev.target as HTMLElement)?.closest<HTMLElement>(".fx-card");
      if (!card || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = card.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width;
        const py = (ev.clientY - r.top) / r.height;
        card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        card.style.setProperty("--rx", ((0.5 - py) * tilt * 2).toFixed(2) + "deg");
        card.style.setProperty("--ry", ((px - 0.5) * tilt * 2).toFixed(2) + "deg");
      });
    };
    const onLeave = (ev: PointerEvent) => {
      const card = (ev.target as HTMLElement)?.closest<HTMLElement>(".fx-card");
      if (!card) return;
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    };

    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerout", onLeave, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerout", onLeave);
    };
  }, [ref, tilt]);
}
