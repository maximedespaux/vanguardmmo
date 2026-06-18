import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      background: "linear-gradient(rgba(8,8,11,.86),rgba(8,8,11,.93)), url('/assets/site/new/guild.png') center / cover no-repeat" }}>
      <div className="glass-card" style={{ maxWidth: 460, width: "100%", padding: "46px 34px", textAlign: "center", borderRadius: 20 }}>
        <div style={{ fontFamily: "'Bruno Ace SC', Rajdhani, sans-serif", fontSize: 70, color: "var(--orange)", lineHeight: 1, textShadow: "0 0 34px rgba(255,140,26,.5), 0 4px 20px #000" }}>404</div>
        <h1 className="font-heading" style={{ fontSize: 22, fontWeight: 400, margin: "16px 0 0", textTransform: "uppercase", letterSpacing: 1, color: "#fff" }}>Page introuvable</h1>
        <div style={{ fontFamily: "'Inter', sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "10px auto 28px", lineHeight: 1.6, maxWidth: 340 }}>
          Cette page n&apos;existe pas (ou plus). Vérifie l&apos;adresse, ou retourne à la base.
        </div>
        <Link href="/histoire" className="vg-btn" style={{ textDecoration: "none" }}>🏠 Retour à l&apos;accueil</Link>
      </div>
    </div>
  );
}
