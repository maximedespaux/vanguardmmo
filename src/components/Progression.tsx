"use client";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Ma progression et celle de la guilde.
 *
 * Le niveau seul ne dit rien : ce qui fait revenir, c'est de voir CE QUI
 * rapporte. Les quatre sources sont donc listées même à zéro — elles tiennent
 * lieu de règles du jeu, sans page d'explications à aller lire.
 */
type Resume = {
  total: number; niveau: number; dansNiveau: number; pourNiveau: number;
  parSource: { source: string; label: string; points: number }[];
  derniers: { id: string; source: string; points: number; detail: string | null; createdAt: string }[];
};
type Ligne = { userId: string; username: string; avatar: string | null; total: number; niveau: number };

const ICONE: Record<string, IconName> = { depot: "vault", quete: "target", presence: "users", dette: "coins" };

export function Progression() {
  const [moi, setMoi] = useState<Resume | null>(null);
  const [top, setTop] = useState<Ligne[]>([]);

  useEffect(() => {
    fetch("/api/xp").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      setMoi(d.moi); setTop(d.classement ?? []);
    }).catch(() => {});
  }, []);

  if (!moi) return null;
  const pc = Math.min(100, Math.round((moi.dansNiveau / moi.pourNiveau) * 100));

  return (
    <div className="dash-card fx-card" style={{ padding: 17, marginBottom: 24 }}>
      <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
        <Icon name="medal" size={15} /> Ma progression
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 7 }}>
        <span className="font-heading" style={{ fontSize: 24, fontWeight: 700, color: "var(--orange)" }}>Niveau {moi.niveau}</span>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{moi.total.toLocaleString("fr-FR")} XP au total</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
          {moi.dansNiveau} / {moi.pourNiveau} vers le niveau {moi.niveau + 1}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 5, background: "var(--bg-3)", border: "1px solid var(--border)", overflow: "hidden", marginBottom: 15 }}>
        <div style={{ width: `${pc}%`, height: "100%", background: "linear-gradient(90deg,#FFB552,#FF8C1A)", transition: "width .35s" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 15 }}>
        {moi.parSource.map((s) => (
          <div key={s.source} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name={ICONE[s.source] ?? "star"} size={12} style={{ color: "var(--orange)" }} />{s.label}
            </div>
            <div className="font-heading" style={{ fontSize: 17, fontWeight: 700, color: s.points ? "var(--gold)" : "var(--text-muted)", marginTop: 3 }}>
              {s.points.toLocaleString("fr-FR")}
            </div>
          </div>
        ))}
      </div>

      {moi.derniers.length > 0 && (
        <div style={{ marginBottom: 15 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 6 }}>Derniers gains</div>
          <div style={{ display: "grid", gap: 4 }}>
            {moi.derniers.slice(0, 5).map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                <Icon name={ICONE[e.source] ?? "star"} size={12} style={{ color: "var(--orange)", flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.detail}</span>
                <b style={{ color: "var(--green)", flexShrink: 0 }}>+{e.points}</b>
                <span style={{ flexShrink: 0, fontSize: 10.5 }}>{new Date(e.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {top.length > 0 && (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 6 }}>Ceux qui portent la guilde</div>
          <div style={{ display: "grid", gap: 5 }}>
            {top.slice(0, 5).map((l, i) => (
              <div key={l.userId} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 9px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                <span className="font-heading" style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? "var(--gold)" : "var(--text-muted)", width: 16 }}>{i + 1}</span>
                {/* Avatar Discord : déjà connu à la connexion, rien à héberger. */}
                {l.avatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={l.avatar} alt="" style={{ width: 22, height: 22, borderRadius: 11, objectFit: "cover" }} />
                  : <span style={{ width: 22, height: 22, borderRadius: 11, background: "var(--bg-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}><Icon name="user" size={12} /></span>}
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.username}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>niv. {l.niveau}</span>
                <b style={{ fontSize: 12.5, color: "var(--gold)" }}>{l.total.toLocaleString("fr-FR")}</b>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
