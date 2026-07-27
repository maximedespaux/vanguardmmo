"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { Fil } from "@/components/Fil";
import { canAccessAdmin } from "@/config/roles";
import type { Role } from "@prisma/client";
import type { Conversation } from "@/lib/messagerie";

/**
 * Boîte de réception : toutes les conversations au même endroit.
 *
 * Avant, un fil était enfermé dans sa carte de demande — il fallait déjà savoir
 * que la demande existait pour retrouver ce qui s'y était dit, et ouvrir la
 * bonne page parmi cinq. Ici on entre par la conversation.
 *
 * Chaque ligne porte de quoi juger SANS ouvrir : qui, l'état de la transaction,
 * le dernier mot échangé, et si l'autre est en ligne — parce que la question
 * qu'on se pose devant une liste, c'est « est-ce que ça avance ? ».
 */

const TONS: Record<Conversation["ton"], string> = {
  attente: "var(--gold)",
  encours: "var(--orange)",
  fini: "var(--green)",
  stop: "var(--text-muted)",
};

/** Date lisible d'un coup d'œil : l'heure aujourd'hui, la date au-delà. */
function quandCourt(iso: string) {
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 60 * 24) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (min < 60 * 48) return "hier";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

type Filtre = "tous" | "nonlus" | "requete" | "dette";

export default function MessagesPage() {
  const { data: session } = useSession();
  const moi = session?.user as { id?: string; role?: Role } | undefined;
  const estStaff = moi?.role ? canAccessAdmin(moi.role) : false;

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [pret, setPret] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [q, setQ] = useState("");

  const charger = useCallback(async () => {
    try {
      const r = await fetch("/api/messages");
      if (r.ok) setConvs((await r.json()).conversations ?? []);
    } catch { /* silencieux : la liste se retentera au prochain tour */ }
    setPret(true);
  }, []);

  useEffect(() => {
    charger();
    const t = setInterval(charger, 30000);
    return () => clearInterval(t);
  }, [charger]);

  // Lien direct vers une conversation (`/messages?fil=req:xxx`), utilisé par les
  // notifications. Lu depuis l'URL plutôt qu'avec useSearchParams : ce dernier
  // impose une frontière Suspense au build, pour un seul paramètre facultatif.
  useEffect(() => {
    const fil = new URLSearchParams(window.location.search).get("fil");
    if (fil) setOuvert(fil);
  }, []);

  const liste = useMemo(() => {
    const texte = q.trim().toLowerCase();
    return convs.filter((c) => {
      if (filtre === "nonlus" && c.nonLus === 0) return false;
      if (filtre === "requete" && c.type !== "requete") return false;
      if (filtre === "dette" && c.type !== "dette") return false;
      if (!texte) return true;
      return (c.titre + " " + c.avec + " " + (c.dernier?.corps ?? "")).toLowerCase().includes(texte);
    });
  }, [convs, filtre, q]);

  const courante = convs.find((c) => c.filId === ouvert) ?? null;
  const totalNonLus = convs.reduce((s, c) => s + (c.nonLus > 0 ? 1 : 0), 0);

  const ouvrir = (c: Conversation) => {
    setOuvert(c.filId);
    // La pastille tombe tout de suite : le serveur pose le repère de son côté,
    // mais attendre son aller-retour laisserait la ligne « non lue » sous le
    // doigt de quelqu'un qui est en train de la lire.
    setConvs((p) => p.map((x) => (x.filId === c.filId ? { ...x, nonLus: 0 } : x)));
  };

  return (
    <div style={{ padding: "24px 22px 60px", maxWidth: 1180, margin: "0 auto" }}>
      <PageHeader
        icon="message"
        title="Messages"
        subtitle="Toutes tes conversations — demandes de la boutique et dettes — au même endroit, la plus récente en haut."
      />

      <div className="msg-layout" data-vue={ouvert ? "fil" : "liste"} style={{ display: "grid", gap: 14, alignItems: "start" }}>
        {/* ── Colonne des conversations ── */}
        <div className="msg-liste glass-card" style={{ padding: 12 }}>
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…"
            style={{ width: "100%", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 13, marginBottom: 9 }}
          />
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {([["tous", "Tout"], ["nonlus", `Non lus${totalNonLus ? ` (${totalNonLus})` : ""}`], ["requete", "Boutique"], ["dette", "Dettes"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFiltre(k)}
                style={{ padding: "5px 11px", borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontWeight: 600, border: `1px solid ${filtre === k ? "var(--orange)" : "var(--border)"}`, background: filtre === k ? "rgba(255,140,26,.14)" : "var(--bg-3)", color: filtre === k ? "var(--orange)" : "var(--text-muted)" }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 5, maxHeight: "62vh", overflowY: "auto" }}>
            {!pret && <div style={{ fontSize: 13, color: "var(--text-muted)", padding: 14 }}>Chargement…</div>}
            {pret && liste.length === 0 && (
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "18px 12px", textAlign: "center" }}>
                {convs.length === 0
                  ? "Aucune conversation. Elles s'ouvrent quand tu fais une demande à la boutique ou qu'une dette est enregistrée."
                  : "Rien ne correspond à ce filtre."}
              </div>
            )}
            {liste.map((c) => {
              const actif = c.filId === ouvert;
              return (
                <button key={c.filId} onClick={() => ouvrir(c)}
                  style={{ textAlign: "left", display: "grid", gap: 4, padding: "9px 11px", borderRadius: 10, cursor: "pointer", border: `1px solid ${actif ? "var(--orange)" : "transparent"}`, background: actif ? "rgba(255,140,26,.10)" : c.nonLus ? "rgba(255,140,26,.05)" : "var(--bg-3)", color: "var(--text)", fontFamily: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Icon name={c.type === "dette" ? "coins" : "cart"} size={13} style={{ color: "var(--orange)", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>{c.titre}</span>
                    <span style={{ fontSize: 10.5, color: "var(--text-muted)", flexShrink: 0 }}>{quandCourt(c.quand)}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-muted)" }}>
                    {/* Pastille de présence : savoir si ça sert d'attendre une réponse maintenant. */}
                    <span style={{ width: 7, height: 7, borderRadius: 4, flexShrink: 0, background: c.enLigne ? "var(--green)" : "var(--border)" }} />
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.avec}</span>
                    <span style={{ marginLeft: "auto", flexShrink: 0, color: TONS[c.ton], fontWeight: 600 }}>{c.etat}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 11.5, color: c.nonLus ? "var(--text)" : "var(--text-muted)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.dernier
                        ? `${c.dernier.kind === "system" ? "" : c.dernier.auteur ? c.dernier.auteur + " : " : ""}${c.dernier.corps}`
                        : "Aucun message"}
                    </span>
                    {c.nonLus > 0 && (
                      <span style={{ flexShrink: 0, minWidth: 17, height: 17, padding: "0 5px", borderRadius: 9, background: "var(--orange)", color: "#0a0a0c", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {c.nonLus > 9 ? "9+" : c.nonLus}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Conversation ouverte ── */}
        <div className="msg-fil glass-card fx-card" style={{ padding: 16, minHeight: 320 }}>
          {!courante ? (
            <div style={{ display: "grid", placeItems: "center", gap: 8, minHeight: 260, color: "var(--text-muted)", textAlign: "center" }}>
              <Icon name="message" size={26} style={{ opacity: .5 }} />
              <div style={{ fontSize: 13 }}>Choisis une conversation à gauche.</div>
            </div>
          ) : (
            <>
              <button className="msg-retour" onClick={() => setOuvert(null)}
                style={{ alignItems: "center", gap: 6, marginBottom: 10, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12.5, padding: 0, fontFamily: "inherit" }}>
                <Icon name="arrow-left" size={13} /> Conversations
              </button>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", paddingBottom: 11, marginBottom: 13, borderBottom: "1px solid var(--border)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{courante.titre}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 4, background: courante.enLigne ? "var(--green)" : "var(--border)" }} />
                    avec <b style={{ color: "var(--text)" }}>{courante.avec}</b>
                    {courante.enLigne && <span style={{ color: "var(--green)" }}>· en ligne</span>}
                    <span style={{ color: TONS[courante.ton], fontWeight: 600 }}>· {courante.etat}</span>
                  </div>
                </div>
                <Link href={courante.lien} style={{ fontSize: 12, color: "var(--orange)", display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none", flexShrink: 0 }}>
                  Voir la demande <Icon name="chevron-right" size={12} />
                </Link>
              </div>

              {/* Le fil est le même composant partout : la boîte de réception ne
                  redéfinit ni l'envoi, ni la négociation, ni le marquage « lu ». */}
              <Fil
                key={courante.filId}
                type={courante.type}
                id={courante.id}
                moiId={moi?.id}
                estStaff={estStaff}
                negociation={courante.type === "requete"}
                hauteur="46vh"
                onActivite={charger}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
