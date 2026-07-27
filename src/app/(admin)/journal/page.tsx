"use client";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";

/**
 * Journal du staff — ce qui est pris, ce qui est donné, par qui.
 *
 * Le tableau du haut répond à la seule question qui compte pour repérer un
 * abus : qui demande plus qu'il n'aide. Le fil du bas donne le détail, dans
 * l'ordre, pour vérifier un cas précis plutôt que de croire un ressenti.
 */
type Ligne = {
  id: string; quand: string; type: "demande" | "credit" | "xp" | "decision";
  qui: string; quoi: string; valeur: number | null;
};
type Membre = { nom: string; gagnes: number; depenses: number; demandes: number };

/** Le solde en toutes lettres. Recopié ici plutôt qu'importé de lib/credits :
 *  ce module-là parle à Prisma, et une page cliente n'a rien à en tirer. */
function lireSolde(n: number): { texte: string; ton: "bon" | "neutre" | "dette" } {
  if (n > 0) return { texte: `${n} crédit${n > 1 ? "s" : ""} d'avance`, ton: "bon" };
  if (n === 0) return { texte: "à l'équilibre", ton: "neutre" };
  return { texte: `${-n} de plus reçu que donné`, ton: "dette" };
}

const TYPE: Record<Ligne["type"], { l: string; c: string; ic: IconName }> = {
  demande: { l: "Demande", c: "var(--orange)", ic: "cart" },
  credit: { l: "Crédits", c: "var(--gold)", ic: "coins" },
  xp: { l: "XP", c: "var(--green)", ic: "medal" },
  decision: { l: "Décision", c: "var(--blue)", ic: "shield-check" },
};

export default function JournalPage() {
  useCardFx();
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [membre, setMembre] = useState("");
  const [filtre, setFiltre] = useState<"" | Ligne["type"]>("");
  const [pret, setPret] = useState(false);

  const charger = useCallback(async () => {
    const r = await fetch(`/api/admin/journal${membre ? `?membre=${encodeURIComponent(membre)}` : ""}`);
    if (r.ok) { const d = await r.json(); setLignes(d.lignes ?? []); setMembres(d.parMembre ?? []); }
    setPret(true);
  }, [membre]);
  useEffect(() => { const t = setTimeout(charger, 250); return () => clearTimeout(t); }, [charger]);

  const visibles = filtre ? lignes.filter((l) => l.type === filtre) : lignes;

  return (
    <div style={{ padding: "24px 22px 60px", maxWidth: 1080, margin: "0 auto" }}>
      <PageHeader icon="list" title="Journal" subtitle="Ce qui est pris, ce qui est donné, et par qui. De quoi vérifier un cas plutôt que de se fier à une impression." />

      {/* ── L'équilibre par membre ── */}
      <div className="glass-card fx-card" style={{ padding: 16, marginBottom: 18 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="swap" size={14} />Équilibre donner / recevoir
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 11 }}>
          Les plus en déficit d&apos;abord. Un solde négatif n&apos;est pas une faute — c&apos;est une conversation à avoir.
        </div>
        {membres.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Rien à afficher pour l&apos;instant.</div>
        ) : (
          <div style={{ display: "grid", gap: 5 }}>
            {membres.slice(0, 12).map((m) => {
              const s = m.gagnes - m.depenses;
              const l = lireSolde(s);
              const couleur = l.ton === "bon" ? "var(--green)" : l.ton === "dette" ? "var(--red)" : "var(--text-muted)";
              return (
                <div key={m.nom} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", fontSize: 12.5 }}>
                  <button onClick={() => setMembre(m.nom)} style={{ fontWeight: 700, color: "var(--text)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 12.5 }}>
                    {m.nom}
                  </button>
                  <span style={{ color: "var(--text-muted)" }}>{m.demandes} demande{m.demandes > 1 ? "s" : ""}</span>
                  <span style={{ marginLeft: "auto", color: "var(--green)" }}>+{m.gagnes}</span>
                  <span style={{ color: "var(--red)" }}>−{m.depenses}</span>
                  <b style={{ color: couleur, minWidth: 150, textAlign: "right" }}>{l.texte}</b>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Le fil ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input value={membre} onChange={(e) => setMembre(e.target.value)} placeholder="Filtrer par membre…"
          style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 13, minWidth: 200 }} />
        {([["", "Tout"], ["demande", "Demandes"], ["credit", "Crédits"], ["xp", "XP"], ["decision", "Décisions"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFiltre(k)}
            style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", border: `1px solid ${filtre === k ? "var(--orange)" : "var(--border)"}`, background: filtre === k ? "rgba(255,140,26,.14)" : "var(--bg-3)", color: filtre === k ? "var(--orange)" : "var(--text-muted)" }}>
            {l}
          </button>
        ))}
      </div>

      {!pret ? <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Chargement…</div>
        : visibles.length === 0 ? (
          <div className="glass-card fx-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Aucune ligne.</div>
        ) : (
          <div style={{ display: "grid", gap: 4 }}>
            {visibles.map((l) => {
              const t = TYPE[l.type];
              return (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", fontSize: 12.5 }}>
                  <Icon name={t.ic} size={13} style={{ color: t.c, flexShrink: 0 }} />
                  <span style={{ color: t.c, fontWeight: 600, minWidth: 62, flexShrink: 0 }}>{t.l}</span>
                  <b style={{ minWidth: 110, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.qui}</b>
                  <span style={{ flex: 1, minWidth: 0, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.quoi}</span>
                  {l.valeur != null && (
                    <b style={{ flexShrink: 0, color: l.valeur >= 0 ? "var(--green)" : "var(--red)" }}>{l.valeur > 0 ? "+" : ""}{l.valeur}</b>
                  )}
                  <span style={{ flexShrink: 0, fontSize: 11, color: "var(--text-muted)" }}>
                    {new Date(l.quand).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
