"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      background: "linear-gradient(rgba(8,8,11,.86),rgba(8,8,11,.93)), url('/assets/site/new/guild.png') center / cover no-repeat" }}>
      <div className="glass-card" style={{ maxWidth: 460, width: "100%", padding: "44px 34px", textAlign: "center", borderRadius: 20 }}>
        <div style={{ fontSize: 52, lineHeight: 1 }}>🛠️</div>
        <h1 className="font-heading" style={{ fontSize: 22, fontWeight: 400, margin: "14px 0 0", textTransform: "uppercase", letterSpacing: 1, color: "#fff" }}>Oups, un pépin</h1>
        <div style={{ fontFamily: "'Inter', sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "10px auto 26px", lineHeight: 1.6, maxWidth: 360 }}>
          Une erreur inattendue est survenue de notre côté. Tu peux réessayer — si ça persiste, préviens un officier.
          {error?.digest && <div style={{ marginTop: 10, fontSize: 11, opacity: 0.6 }}>Réf : {error.digest}</div>}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => reset()} className="vg-btn" style={{ cursor: "pointer" }}>↻ Réessayer</button>
          <Link href="/histoire" style={{ display: "inline-flex", alignItems: "center", padding: "11px 22px", borderRadius: 10, border: "1px solid var(--border)", color: "var(--text)", textDecoration: "none", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, fontSize: 13 }}>Accueil</Link>
        </div>
      </div>
    </div>
  );
}
