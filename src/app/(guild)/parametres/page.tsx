"use client";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";

const ROLE_LABEL: Record<string, string> = {
  DIRECTION: "🛡️ Direction", VANGUARD: "👑 Vanguard", GENERAL: "🧭 Général",
  OFFICIER: "🔥 Officier", VETERAN: "📋 Vétéran", GUARD: "⚔️ Guard", RECRUE: "🌱 Recrue",
};

export default function ParametresPage() {
  const { data: session } = useSession();
  const u = session?.user as any;
  const [compact, setCompact] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setCompact(localStorage.getItem("vanguard_compact") === "1");
    setReduceMotion(localStorage.getItem("vanguard_reduce_motion") === "1");
  }, []);
  const setPref = (key: string, v: boolean, set: (b: boolean) => void) => { set(v); localStorage.setItem(key, v ? "1" : "0"); };

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 16 };
  const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" };
  const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!on)} style={{ width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", background: on ? "var(--orange)" : "var(--bg-4)", position: "relative", transition: "background .15s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
    </button>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 720, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-parametres.png" icon="⚙️" title="Paramètres" subtitle="Ton compte et tes préférences d'affichage." />

      <div style={card}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 12 }}>Compte</div>
        {u?.discordId ? (
          <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
            <div style={row}><span style={{ color: "var(--text-muted)" }}>Pseudo</span><b>{u.name ?? u.discordName ?? "—"}</b></div>
            <div style={row}><span style={{ color: "var(--text-muted)" }}>Rôle</span><b style={{ color: "var(--orange)" }}>{ROLE_LABEL[u.role] ?? u.role ?? "—"}</b></div>
            <div style={{ ...row, borderBottom: "none" }}><span style={{ color: "var(--text-muted)" }}>Discord ID</span><span style={{ fontFamily: "monospace", color: "var(--text-muted)", fontSize: 12 }}>{u.discordId}</span></div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Mode développement local (accès Direction simulé). Connecte-toi via Discord en production pour voir ton compte réel.</p>
        )}
      </div>

      <div style={card}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 4 }}>Affichage</div>
        <div style={row}><span style={{ fontSize: 14 }}>Mode compact</span><Toggle on={compact} onChange={(v) => setPref("vanguard_compact", v, setCompact)} /></div>
        <div style={{ ...row, borderBottom: "none" }}><span style={{ fontSize: 14 }}>Réduire les animations</span><Toggle on={reduceMotion} onChange={(v) => setPref("vanguard_reduce_motion", v, setReduceMotion)} /></div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Préférences enregistrées sur cet appareil.</p>
      </div>

      {u?.discordId && (
        <button onClick={() => signOut()} style={{ padding: "9px 18px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--red)", cursor: "pointer", fontWeight: 600 }}>Se déconnecter</button>
      )}
    </div>
  );
}
