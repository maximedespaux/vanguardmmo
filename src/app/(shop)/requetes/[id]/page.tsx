"use client";
import { useCallback, useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { canAccessAdmin } from "@/config/roles";
import type { Role } from "@prisma/client";

/**
 * Page d'une requête boutique : la négociation en plein écran.
 *
 * Le fil existait déjà dans un panneau replié au fond d'une carte — utilisable
 * pour un mot, intenable pour marchander. Ici la demande, la discussion et les
 * offres tiennent ensemble, et le lien est partageable : on peut renvoyer
 * quelqu'un vers SA demande, ce qu'un panneau replié ne permet pas.
 */
type Msg = {
  id: string; kind: string; author: string | null; body: string; createdAt: string;
  amount: number | null; acceptedAt: string | null; userId: string | null;
};

const fmt = (n: number | string | null) => (n == null ? "?" : Number(n).toLocaleString("fr-FR"));

export default function RequetePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const moi = session?.user as { id?: string; role?: Role } | undefined;
  const estStaff = moi?.role ? canAccessAdmin(moi.role) : false;

  const [fil, setFil] = useState<Msg[]>([]);
  const [msg, setMsg] = useState("");
  const [offre, setOffre] = useState("");
  const [erreur, setErreur] = useState("");
  const [pret, setPret] = useState(false);

  const charger = useCallback(async () => {
    try {
      const r = await fetch(`/api/bank-request/${id}/fil`);
      if (r.ok) setFil(await r.json());
      else setErreur(r.status === 403 ? "Cette demande ne t'est pas accessible." : "Demande introuvable.");
    } catch { setErreur("Chargement impossible."); }
    setPret(true);
  }, [id]);

  // Rafraîchissement régulier : sans Discord, c'est ici qu'on attend la réponse.
  useEffect(() => { charger(); const t = setInterval(charger, 15000); return () => clearInterval(t); }, [charger]);

  const envoyer = async (corps: Record<string, unknown>) => {
    const r = await fetch(`/api/bank-request/${id}/fil`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErreur(j.error ?? "Action refusée."); return false; }
    setErreur(""); await charger(); return true;
  };

  /** Dernière offre encore ouverte : c'est la seule sur laquelle on peut agir. */
  const offreVive = [...fil].reverse().find((m) => m.kind === "offer" && !m.acceptedAt);
  const prixConvenu = fil.find((m) => m.kind === "offer" && m.acceptedAt);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 18px 80px" }}>
      <PageHeader icon="cart" title="Demande" subtitle="Discute et négocie ici. Tout se règle sur le site." />
      <Link href="/dettes" style={{ fontSize: 12.5, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        <Icon name="arrow-left" size={13} /> Retour à mes demandes
      </Link>

      {erreur && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--red)" }}>{erreur}</div>}

      {prixConvenu && (
        <div className="glass-card fx-card" style={{ padding: 14, marginBottom: 14, borderColor: "var(--green)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Icon name="check" size={17} style={{ color: "var(--green)" }} />
            <span style={{ fontWeight: 700, color: "var(--green)" }}>Prix convenu : {fmt(prixConvenu.amount)} périns</span>
          </div>
        </div>
      )}

      <div className="glass-card fx-card" style={{ padding: 16 }}>
        <div style={{ maxHeight: "48vh", overflow: "auto", display: "grid", gap: 10, marginBottom: 14 }}>
          {!pret && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Chargement…</div>}
          {pret && fil.length === 0 && !erreur && (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Aucun message. Écris pour ouvrir la discussion.</div>
          )}
          {fil.map((m) => {
            if (m.kind === "system") {
              return (
                <div key={m.id} style={{ fontSize: 12.5, color: "var(--text-muted)", borderLeft: "2px solid var(--orange)", paddingLeft: 10 }}>
                  {m.body}<span style={{ opacity: .7 }}> · {new Date(m.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              );
            }
            if (m.kind === "offer") {
              const aMoi = m.userId === moi?.id;
              return (
                <div key={m.id} style={{ padding: 11, borderRadius: 10, border: `1px solid ${m.acceptedAt ? "var(--green)" : "var(--gold)"}`, background: m.acceptedAt ? "rgba(74,222,128,.08)" : "rgba(255,181,82,.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <Icon name="coins" size={15} style={{ color: m.acceptedAt ? "var(--green)" : "var(--gold)" }} />
                    <b style={{ fontSize: 14 }}>{fmt(m.amount)} périns</b>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>proposé par {m.author}</span>
                    {m.acceptedAt && <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--green)" }}>accepté</span>}
                    {/* On n'accepte pas sa propre offre : ce serait s'accorder un
                        prix tout seul. Le serveur le refuse aussi. */}
                    {!m.acceptedAt && !aMoi && (
                      <button className="vg-btn" onClick={() => envoyer({ accept: m.id })} style={{ marginLeft: "auto", padding: "6px 13px", fontSize: 12.5 }}>
                        Accepter ce prix
                      </button>
                    )}
                  </div>
                  {m.body && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 5 }}>{m.body}</div>}
                </div>
              );
            }
            return (
              <div key={m.id} style={{ fontSize: 13.5 }}>
                <b style={{ color: "var(--orange)" }}>{m.author}</b>
                <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}> · {new Date(m.createdAt).toLocaleString("fr-FR")}</span>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={msg} onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (msg.trim()) envoyer({ body: msg }).then((ok) => ok && setMsg("")); } }}
            placeholder="Écrire un message…"
            style={{ flex: 1, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "11px 13px", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
          <button className="vg-btn" onClick={() => msg.trim() && envoyer({ body: msg }).then((ok) => ok && setMsg(""))}>Envoyer</button>
        </div>

        {/* La négociation est ouverte aux DEUX parties : un prix imposé n'est pas
            négocié. Le staff propose, le demandeur peut contre-proposer. */}
        {!prixConvenu && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", paddingTop: 11, borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
              {estStaff ? "Proposer un prix" : offreVive ? "Contre-proposer" : "Proposer un prix"} :
            </span>
            <input type="number" min={1} value={offre} onChange={(e) => setOffre(e.target.value)} placeholder="périns"
              style={{ width: 130, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 13.5 }} />
            <button onClick={() => Number(offre) > 0 && envoyer({ offer: Number(offre) }).then((ok) => ok && setOffre(""))}
              style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid var(--gold)", background: "transparent", color: "var(--gold)", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
              Proposer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
