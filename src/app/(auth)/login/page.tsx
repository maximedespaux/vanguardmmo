"use client";
import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

// Messages amicaux par code d'erreur (auth NextAuth + accès par rôle).
const ERRORS: Record<string, { icon: IconName; title: string; msg: string; access?: boolean }> = {
  guild:         { icon: "lock", title: "Accès réservé aux membres", msg: "Tu dois être membre de la guilde Vanguard sur Discord pour ouvrir cet espace.", access: true },
  admin:         { icon: "shield", title: "Réservé au staff", msg: "Cette section est réservée aux officiers et à la direction de Vanguard.", access: true },
  forbidden:     { icon: "ban", title: "Accès non autorisé", msg: "Tu n'as pas les droits nécessaires pour cette page.", access: true },
  AccessDenied:  { icon: "ban", title: "Connexion refusée", msg: "L'accès Discord a été refusé. Autorise la connexion pour continuer." },
  Configuration: { icon: "settings", title: "Configuration invalide", msg: "La connexion est mal réglée côté serveur. Préviens un admin." },
  Verification:  { icon: "clock", title: "Lien expiré", msg: "Ce lien de connexion a expiré. Relance la connexion." },
  default:       { icon: "alert", title: "Connexion impossible", msg: "Une erreur est survenue pendant la connexion. Réessaie dans un instant." },
};

function LoginCard() {
  const code = useSearchParams().get("error");
  const info = code ? (ERRORS[code] ?? ERRORS.default) : null;

  return (
    <div className="lg-wrap">
      <div className="lg-card">
        <img src="/assets/site/logo-bat.png" alt="Vanguard" className="lg-logo" />
        <h1 className="lg-title font-heading">Vanguard<span>Control Center</span></h1>

        {info ? (
          <div className={`lg-alert ${info.access ? "is-access" : ""}`}>
            <span className="lg-alert-ico"><Icon name={info.icon} size={22} style={{ color: info.access ? "var(--orange)" : "var(--red)" }} /></span>
            <div className="lg-alert-txt"><strong>{info.title}</strong><span>{info.msg}</span></div>
          </div>
        ) : (
          <div className="lg-sub">Connexion via Discord — réservé aux membres de la guilde.</div>
        )}

        <button className="lg-discord" onClick={() => signIn("discord", { callbackUrl: "/" })}>
          <svg viewBox="0 0 127.14 96.36" aria-hidden="true"><path fill="currentColor" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z" /></svg>
          {info?.access ? "Se connecter avec un autre compte" : "Se connecter avec Discord"}
        </button>

        <Link href="/histoire" className="lg-back">← Retour à l&apos;accueil</Link>
        <div className="lg-fine">On lit seulement ton identité et ton rôle Discord pour débloquer ton espace.</div>
      </div>

      <style>{`
        .lg-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden;
          background:linear-gradient(rgba(8,8,11,.84),rgba(8,8,11,.93)),url('/assets/site/new/guild.png') center / cover no-repeat}
        .lg-wrap::before{content:"";position:absolute;width:560px;height:560px;left:50%;top:46%;transform:translate(-50%,-50%);pointer-events:none;
          background:radial-gradient(circle,rgba(255,140,26,.16),transparent 62%)}
        .lg-card{position:relative;z-index:1;width:100%;max-width:430px;padding:42px 34px 30px;text-align:center;
          background:linear-gradient(180deg,rgba(25,25,31,.88),rgba(13,13,18,.93));border:1px solid var(--border);border-radius:20px;
          box-shadow:0 30px 80px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
        .lg-logo{display:block;width:76px;height:76px;object-fit:contain;margin:0 auto 14px;filter:drop-shadow(0 0 20px rgba(255,140,26,.55))}
        .lg-title{font-size:24px;font-weight:400;text-transform:uppercase;letter-spacing:1px;line-height:1.05;color:#fff;margin:0}
        .lg-title span{display:block;font-size:13px;letter-spacing:5px;color:var(--orange);margin-top:5px}
        .lg-sub{font-family:'Athiti',sans-serif;color:var(--text-muted);font-size:13.5px;margin:14px 4px 26px;line-height:1.55}
        .lg-alert{display:flex;gap:12px;text-align:left;align-items:flex-start;margin:18px 0 22px;padding:14px 15px;border-radius:13px;
          background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.32)}
        .lg-alert.is-access{background:rgba(255,140,26,.08);border-color:rgba(255,140,26,.38)}
        .lg-alert-ico{font-size:21px;line-height:1.2}
        .lg-alert-txt strong{display:block;font-family:'Rubik',sans-serif;font-weight:700;font-size:15px;color:#fff;margin-bottom:3px}
        .lg-alert-txt span{font-family:'Athiti',sans-serif;font-size:12.5px;color:var(--text-muted);line-height:1.5}
        .lg-discord{width:100%;display:flex;align-items:center;justify-content:center;gap:11px;padding:14px;border:none;border-radius:13px;cursor:pointer;
          font-family:'Rubik',sans-serif;font-weight:700;font-size:15px;text-transform:uppercase;letter-spacing:.8px;color:#241402;
          background:linear-gradient(180deg,#FFB552,#FF8C1A);box-shadow:0 8px 24px rgba(255,140,26,.4);transition:transform .14s,box-shadow .14s}
        .lg-discord:hover{transform:translateY(-2px);box-shadow:0 12px 34px rgba(255,140,26,.58)}
        .lg-discord svg{width:21px;height:21px;flex-shrink:0}
        .lg-back{display:inline-block;margin-top:16px;color:var(--text-muted);font-size:13px;text-decoration:none;transition:color .15s}
        .lg-back:hover{color:var(--orange)}
        .lg-fine{font-family:'Athiti',sans-serif;color:var(--text-muted);font-size:11px;margin-top:16px;line-height:1.5;opacity:.75}
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh" }} />}><LoginCard /></Suspense>;
}
