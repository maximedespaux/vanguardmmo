"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";

// Braises : positions fixées une fois pour toutes (pas de Math.random au rendu,
// sinon le serveur et le client génèrent des valeurs différentes -> écart
// d'hydratation). Valeurs choisies à la main, réparties sur la largeur.
const EMBERS = [
  { l: 6, d: 0.0, dur: 9.5, dx: 18, rise: 78, s: 1.0 },
  { l: 15, d: 2.4, dur: 11.0, dx: -14, rise: 70, s: 0.7 },
  { l: 24, d: 4.8, dur: 8.5, dx: 22, rise: 84, s: 1.2 },
  { l: 33, d: 1.2, dur: 12.5, dx: -20, rise: 66, s: 0.8 },
  { l: 42, d: 6.0, dur: 10.0, dx: 12, rise: 80, s: 1.0 },
  { l: 50, d: 3.2, dur: 9.0, dx: -18, rise: 74, s: 0.6 },
  { l: 58, d: 7.4, dur: 11.5, dx: 24, rise: 88, s: 1.1 },
  { l: 67, d: 1.8, dur: 8.8, dx: -12, rise: 72, s: 0.9 },
  { l: 76, d: 5.2, dur: 12.0, dx: 16, rise: 68, s: 0.7 },
  { l: 85, d: 2.8, dur: 10.5, dx: -22, rise: 82, s: 1.15 },
  { l: 93, d: 6.6, dur: 9.2, dx: 14, rise: 76, s: 0.85 },
];

const TITRE = "VANGUARD";

export function HeroFlyff() {
  const [scroll, setScroll] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Le défilement est porté par .vg-main (le shell est en overflow:hidden), pas
  // par la fenêtre : window.scrollY restait à 0, donc la parallaxe et le fondu
  // du titre ne se déclenchaient jamais.
  useEffect(() => {
    const scroller: HTMLElement | null = document.querySelector(".vg-main");
    const read = () => {
      const y = scroller ? scroller.scrollTop : window.scrollY;
      setScroll(Math.min(1, y / 600));
    };
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener("scroll", read, { passive: true });
    read();
    return () => target.removeEventListener("scroll", read);
  }, []);

  const lettres = useMemo(
    () => TITRE.split("").map((c, i) => (
      <span key={i} className="hf-ch" style={{ animationDelay: `${0.18 + i * 0.055}s` }}>{c}</span>
    )),
    []
  );

  const versLaSuite = () => {
    const scroller = document.querySelector(".vg-main");
    const cible = ref.current?.getBoundingClientRect().height ?? 600;
    if (scroller) scroller.scrollTo({ top: cible - 70, behavior: "smooth" });
    else window.scrollTo({ top: cible - 70, behavior: "smooth" });
  };

  return (
    <div className="hero-flyff" ref={ref}>
      {/* Fond : illustration Vanguard, zoom lent + parallaxe au scroll */}
      <div className="hf-bgwrap" style={{ transform: `translateY(${scroll * 70}px) scale(${1 + scroll * 0.06})` }}>
        <div className="hf-bg" />
      </div>

      {/* Voiles : vignette + halo orange pulsé + voile de lisibilité du texte */}
      <div className="hf-vignette" />
      <div className="hf-glow" style={{ opacity: 0.55 - scroll * 0.4 }} />
      <div className="hf-scrim" style={{ zIndex: 4 }} />

      {/* Braises qui montent (décor pur, ignorées par le pointeur) */}
      <div className="hf-embers" style={{ zIndex: 5, opacity: 1 - scroll * 1.4 }} aria-hidden="true">
        {EMBERS.map((e, i) => (
          <span key={i} className="hf-ember" style={{
            left: `${e.l}%`,
            animationDelay: `${e.d}s`,
            animationDuration: `${e.dur}s`,
            transform: `scale(${e.s})`,
            ["--dx" as string]: `${e.dx}px`,
            ["--rise" as string]: `${e.rise}vh`,
          }} />
        ))}
      </div>

      {/* Titre + connexion (accueil = login Discord + histoire en dessous) */}
      <div className="hf-title" style={{ transform: `translateY(${-scroll * 40}px)`, opacity: 1 - scroll }}>
        <h1 className="font-heading hf-h1" aria-label={TITRE}>{lettres}</h1>
        <p>La guilde d&apos;élite d&apos;AirFlyff — progresser ensemble, dominer le end-game.</p>
        <a href="/login" className="hf-login"><Icon name="discord" size={19} /> Se connecter avec Discord</a>
      </div>

      {/* 70 % du contenu est sous la ligne de flottaison : on le signale, et le
          clic amène directement à la suite. */}
      <button type="button" className="hf-scroll" style={{ opacity: 1 - scroll * 2, zIndex: 7 }} onClick={versLaSuite}>
        Découvrir la guilde
        <Icon name="chevron-down" size={17} className="chev" />
      </button>

      <style>{`
        /* Le hero vit DANS .vg-main, qui commence sous la barre de nav fixe (68px).
           À 100dvh il dépassait donc de 68px sous la fenêtre, ce qui coupait
           l'indice de défilement placé en bas. */
        .hero-flyff{position:relative;width:100%;height:calc(100vh - 68px);min-height:520px;overflow:hidden;background:#050200;margin:0}
        @supports (height:100dvh){.hero-flyff{height:calc(100dvh - 68px)}}
        .hf-bgwrap{position:absolute;inset:-6%;z-index:1;will-change:transform;transition:transform .12s linear}
        .hf-bg{position:absolute;inset:0;background:url('/assets/site/new/accueil.webp') center 28% / cover no-repeat;animation:hfken 26s ease-in-out infinite alternate}
        .hf-vignette{position:absolute;inset:0;z-index:2;pointer-events:none;background:
          radial-gradient(ellipse 85% 75% at 50% 38%, transparent 32%, rgba(5,2,0,.5) 100%),
          linear-gradient(to bottom, rgba(5,2,0,.55) 0%, transparent 22%, transparent 50%, rgba(10,10,12,.85) 88%, #0A0A0C 100%)}
        .hf-glow{position:absolute;inset:0;z-index:3;pointer-events:none;mix-blend-mode:screen;
          background:radial-gradient(circle 40% at 50% 42%, rgba(255,140,26,.28), transparent 60%);animation:hfglow 5s ease-in-out infinite}
        .hf-title{position:absolute;top:20%;left:0;right:0;text-align:center;z-index:6;transition:transform .2s,opacity .2s}
        /* Le CTA est l'action principale du site : il doit être l'élément le plus
           fort de l'écran, pas un simple contour. */
        .hf-login{display:inline-flex;align-items:center;gap:10px;margin-top:30px;padding:16px 40px;border-radius:14px;
          background:linear-gradient(180deg,#FFC061,#FF8C1A);color:#2a1400;border:0;
          font-family:Rubik,sans-serif;font-weight:700;font-size:17px;text-transform:uppercase;letter-spacing:1.6px;text-decoration:none;
          box-shadow:0 10px 30px rgba(255,140,26,.46),0 2px 0 rgba(255,255,255,.28) inset;
          position:relative;overflow:hidden;transition:transform .16s,box-shadow .22s,filter .16s}
        .hf-login::after{content:"";position:absolute;inset:0;pointer-events:none;
          background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.42) 50%,transparent 62%);
          transform:translateX(-120%);transition:transform .6s cubic-bezier(.16,1,.3,1)}
        .hf-login:hover::after{transform:translateX(120%)}
        .hf-login:hover{transform:translateY(-3px);box-shadow:0 16px 42px rgba(255,140,26,.62);filter:brightness(1.05)}
        .hf-login:active{transform:translateY(-1px) scale(.985)}
        .hf-login:focus-visible{outline:3px solid #fff;outline-offset:3px}
        .hf-title h1{font-family:'Rubik',Rubik,sans-serif;font-weight:400;font-size:clamp(54px,10vw,132px);letter-spacing:4px;margin:0}
        .hf-title p{color:#f7d8b4;max-width:580px;margin:12px auto 0;font-size:16px;line-height:1.6;text-shadow:0 2px 12px rgba(0,0,0,.9);padding:0 18px}
        @keyframes hfken{from{transform:scale(1)}to{transform:scale(1.09)}}
        @keyframes hfglow{0%,100%{opacity:.45}50%{opacity:.72}}
        @media(max-width:760px){.hf-title{top:15%}.hf-bg{background-position:center 32%}.hf-login{font-size:15px;padding:14px 30px}}
        @media(prefers-reduced-motion:reduce){.hf-bg,.hf-glow{animation:none}.hf-login::after{display:none}}
      `}</style>
    </div>
  );
}
