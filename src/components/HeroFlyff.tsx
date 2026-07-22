"use client";
import { useEffect, useState } from "react";

export function HeroFlyff() {
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const onScroll = () => setScroll(Math.min(1, window.scrollY / 600));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="hero-flyff">
      {/* Fond : illustration Vanguard, zoom lent + parallaxe au scroll */}
      <div className="hf-bgwrap" style={{ transform: `translateY(${scroll * 70}px) scale(${1 + scroll * 0.06})` }}>
        <div className="hf-bg" />
      </div>
      {/* Voiles sobres : vignette + halo orange pulsé + fondu vers le noir de la page */}
      <div className="hf-vignette" />
      <div className="hf-glow" style={{ opacity: 0.55 - scroll * 0.4 }} />

      {/* Titre + connexion (accueil = login Discord + histoire en dessous) */}
      <div className="hf-title" style={{ transform: `translateY(${-scroll * 40}px)`, opacity: 1 - scroll }}>
        <h1 className="font-heading">VANGUARD</h1>
        <p>La guilde d&apos;élite d&apos;AirFlyff — progresser ensemble, dominer le end-game.</p>
        <a href="/login" className="hf-login">🎮 Se connecter avec Discord</a>
      </div>

      <div className="hf-scrollhint" style={{ opacity: 1 - scroll * 2 }}>▾ défile</div>

      <style>{`
        .hero-flyff{position:relative;width:100%;height:100vh;min-height:560px;overflow:hidden;background:#050200;margin:0}
        .hf-bgwrap{position:absolute;inset:-6%;z-index:1;will-change:transform;transition:transform .12s linear}
        .hf-bg{position:absolute;inset:0;background:url('/assets/site/new/accueil.png') center 28% / cover no-repeat;animation:hfken 26s ease-in-out infinite alternate}
        .hf-vignette{position:absolute;inset:0;z-index:2;pointer-events:none;background:
          radial-gradient(ellipse 85% 75% at 50% 38%, transparent 32%, rgba(5,2,0,.5) 100%),
          linear-gradient(to bottom, rgba(5,2,0,.55) 0%, transparent 22%, transparent 50%, rgba(10,10,12,.85) 88%, #0A0A0C 100%)}
        .hf-glow{position:absolute;inset:0;z-index:3;pointer-events:none;mix-blend-mode:screen;
          background:radial-gradient(circle 40% at 50% 42%, rgba(255,140,26,.28), transparent 60%);animation:hfglow 5s ease-in-out infinite}
        .hf-header{position:absolute;top:0;left:0;right:0;z-index:10;display:flex;align-items:center;justify-content:flex-end;padding:16px 30px}
        .hf-logo{height:62px;width:auto;filter:drop-shadow(0 0 16px rgba(255,140,26,.45))}
        .hf-discord{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;padding:10px 22px;border-radius:10px;
          background:linear-gradient(180deg,#FF8C1A,#CC6E00);box-shadow:0 6px 20px rgba(255,140,26,.35);transition:transform .15s,box-shadow .15s}
        .hf-discord:hover{transform:translateY(-2px);box-shadow:0 8px 26px rgba(255,140,26,.5)}
        .hf-discord span{color:#0A0A0C;font-family:Rubik,sans-serif;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:1.5px}
        .hf-title{position:absolute;top:20%;left:0;right:0;text-align:center;z-index:6;transition:transform .2s,opacity .2s;animation:hfup 1s ease both}
        .hf-login{display:inline-flex;align-items:center;gap:9px;margin-top:28px;padding:15px 38px;border-radius:14px;background:rgba(12,8,4,.55);border:1.5px solid rgba(255,140,26,.75);color:#fff;font-family:Rubik,sans-serif;font-weight:700;font-size:18px;text-transform:uppercase;letter-spacing:1.5px;text-decoration:none;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);box-shadow:0 8px 26px rgba(0,0,0,.5),0 0 24px rgba(255,140,26,.22);transition:transform .15s,box-shadow .15s,background .15s,color .15s,border-color .15s}
        .hf-login:hover{transform:translateY(-3px);background:linear-gradient(180deg,#FFB552,#FF8C1A);color:#241402;border-color:transparent;box-shadow:0 14px 36px rgba(255,140,26,.6)}
        .hf-title h1{font-family:'Rubik',Rubik,sans-serif;font-weight:400;font-size:clamp(54px,10vw,132px);letter-spacing:4px;color:#fff;margin:0;
          text-shadow:0 0 36px rgba(255,140,26,.65),0 4px 24px #000}
        .hf-title p{color:#f4c89a;max-width:580px;margin:10px auto 0;font-size:15.5px;line-height:1.6;text-shadow:0 2px 10px #000;padding:0 18px}
        .hf-scrollhint{position:absolute;bottom:18px;left:0;right:0;text-align:center;z-index:7;color:#f4c89a;font-family:Rubik,sans-serif;letter-spacing:3px;font-size:13px;animation:hfbob 1.7s ease-in-out infinite}
        @keyframes hfken{from{transform:scale(1)}to{transform:scale(1.09)}}
        @keyframes hfglow{0%,100%{opacity:.45}50%{opacity:.72}}
        @keyframes hfup{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes hfbob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
        @media(max-width:760px){.hf-logo{height:46px}.hf-title{top:14%}.hf-bg{background-position:center 32%}}
        @media(prefers-reduced-motion:reduce){.hf-bg,.hf-glow,.hf-scrollhint{animation:none}}
      `}</style>
    </div>
  );
}
