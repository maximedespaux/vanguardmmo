"use client";
import { findClass } from "@/data/classes";
import { Icon } from "./Icon";

// Affiche le logo d'une classe (avec fallback emoji). Usage: <ClassLogo name="Primat" size={28} />
export function ClassLogo({ name, size = 28, showLabel = false }: { name: string; size?: number; showLabel?: boolean }) {
  const c = findClass(name);
  if (!c) return <span style={{ display: "inline-flex", color: "var(--text-muted)" }} title="Classe inconnue"><Icon name="help" size={size * 0.8} /></span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <img src={c.logo} alt={c.label} title={c.label} width={size} height={size} style={{ objectFit: "contain", verticalAlign: "middle" }} />
      {showLabel && <span>{c.label}</span>}
    </span>
  );
}
