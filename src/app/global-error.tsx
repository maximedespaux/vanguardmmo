"use client";

// Capture les erreurs du layout racine lui-même : doit fournir ses propres <html>/<body>
// et ne peut pas dépendre de globals.css → styles inline uniquement.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#0a0a0c", color: "#E8E8EC", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 440, textAlign: "center", padding: "44px 32px", background: "linear-gradient(180deg,#18181e,#0e0e13)", border: "1px solid #2E2E38", borderRadius: 20, boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}>
          <div style={{ fontSize: 52 }}>⚠️</div>
          <h1 style={{ fontSize: 22, margin: "14px 0 8px", color: "#fff" }}>Erreur critique</h1>
          <p style={{ color: "#8A8A95", fontSize: 14, lineHeight: 1.6, margin: "0 0 26px" }}>
            L&apos;application a rencontré un problème majeur. Recharge la page pour repartir.
            {error?.digest && <span style={{ display: "block", marginTop: 10, fontSize: 11, opacity: 0.6 }}>Réf : {error.digest}</span>}
          </p>
          <button onClick={() => reset()} style={{ padding: "12px 24px", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, color: "#241402", background: "linear-gradient(180deg,#FFB552,#FF8C1A)" }}>↻ Recharger</button>
        </div>
      </body>
    </html>
  );
}
