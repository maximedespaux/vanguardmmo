"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * Un fil de discussion, dette ou requête boutique.
 *
 * Le même rendu servait déjà en deux endroits (la page d'une requête, le
 * panneau replié des dettes) en deux copies qui divergeaient. La boîte de
 * réception en aurait fait une troisième : le fil devient donc un composant, et
 * ce qui change d'un cas à l'autre — l'URL de l'API, la négociation — passe en
 * propriété.
 */
export type MsgFil = {
  id: string; kind: string; author: string | null; body: string; createdAt: string;
  amount: number | null; acceptedAt: string | null; refusedAt?: string | null; userId: string | null; prive?: boolean;
  /** "perins" (défaut) ou "troc" sur une offre. */
  mode?: string | null;
};

const fmt = (n: number | string | null) => (n == null ? "?" : Number(n).toLocaleString("fr-FR"));

/** Rafraîchissement : sans Discord, c'est ici qu'on attend la réponse. */
const PAS_RAFRAICHISSEMENT = 15000;

export function Fil({
  type, id, moiId, estStaff, negociation = false, hauteur = "48vh", onActivite, coulisses = false,
}: {
  type: "dette" | "requete";
  id: string;
  moiId?: string;
  estStaff?: boolean;
  /** Les requêtes se négocient (offres de prix) ; une dette, non : son montant est fixé. */
  negociation?: boolean;
  hauteur?: string;
  /** Prévient le parent qu'il y a du nouveau (la boîte de réception s'en sert pour se remettre à jour). */
  onActivite?: () => void;
  /** Droit d'ouvrir les coulisses — réservé aux détenteurs et au staff, jamais
   *  au demandeur : c'est de lui qu'on y parle. */
  coulisses?: boolean;
}) {
  const url = `/api/${type === "dette" ? "debts" : "bank-request"}/${id}/fil`;
  const [fil, setFil] = useState<MsgFil[]>([]);
  const [msg, setMsg] = useState("");
  const [offre, setOffre] = useState("");
  const [erreur, setErreur] = useState("");
  const [pret, setPret] = useState(false);
  /** Deux discussions, une seule demande : « client » et « entre nous ». */
  const [salon, setSalon] = useState<"client" | "prive">("client");
  const bas = useRef<HTMLDivElement>(null);

  const filId = `${type === "dette" ? "debt" : "req"}:${id}`;

  const charger = useCallback(async () => {
    try {
      const r = await fetch(url);
      if (r.ok) {
        setFil(await r.json());
        setErreur("");
        // Le fil est sous les yeux : il est lu. Poser le repère ici plutôt qu'au
        // clic couvre tous les endroits qui affichent un fil, sans que chacun ait
        // à y penser — et il se déplace tant que la conversation reste ouverte.
        fetch("/api/messages", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filId }),
        }).catch(() => {});
      }
      else setErreur(r.status === 403 ? "Cette conversation ne t'est pas accessible." : "Conversation introuvable.");
    } catch { setErreur("Chargement impossible."); }
    setPret(true);
  }, [url, filId]);

  useEffect(() => {
    setPret(false); setFil([]); charger();
    const t = setInterval(charger, PAS_RAFRAICHISSEMENT);
    return () => clearInterval(t);
  }, [charger]);

  // On se cale en bas à l'arrivée d'un message : un fil qui s'ouvre sur son
  // premier message obligerait à faire défiler pour lire ce qui vient d'arriver.
  useEffect(() => { bas.current?.scrollIntoView({ block: "nearest" }); }, [fil.length]);

  const envoyer = async (corps: Record<string, unknown>) => {
    const r = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErreur(j.error ?? "Action refusée."); return false; }
    setErreur(""); await charger(); onActivite?.(); return true;
  };

  // Le message part dans le salon ouvert : le serveur revérifie le droit, il ne
  // se fie pas au drapeau.
  const envoyerTexte = () => { if (msg.trim()) envoyer({ body: msg, prive: salon === "prive" }).then((ok) => ok && setMsg("")); };

  /** Dernière offre encore ouverte : c'est la seule sur laquelle on peut agir. */
  const visibles = fil.filter((m) => (salon === "prive" ? m.prive : !m.prive));
  const nbPrives = fil.filter((m) => m.prive).length;
  const offreVive = [...fil].reverse().find((m) => m.kind === "offer" && !m.acceptedAt && !m.refusedAt);
  const prixConvenu = fil.find((m) => m.kind === "offer" && m.acceptedAt);

  return (
    <div>
      {erreur && <div style={{ marginBottom: 10, fontSize: 12.5, color: "var(--red)" }}>{erreur}</div>}

      {prixConvenu && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", marginBottom: 12, borderRadius: 9, border: "1px solid var(--green)", background: "rgba(74,222,128,.08)" }}>
          <Icon name={prixConvenu.mode === "troc" ? "swap" : "check"} size={16} style={{ color: "var(--green)" }} />
          <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--green)" }}>
            {prixConvenu.mode === "troc"
              ? <>Échange en objets convenu <span style={{ fontWeight: 400 }}>— valeur estimée {fmt(prixConvenu.amount)} périns</span></>
              : <>Prix convenu : {fmt(prixConvenu.amount)} périns</>}
          </span>
        </div>
      )}

      {/* Deux discussions pour une même demande : celle qu'on tient AVEC le
          client, et celle qu'on tient ENTRE vendeurs pour savoir qui vend et à
          quel prix. La seconde n'existe que pour ceux qui y ont droit — et le
          serveur ne l'envoie même pas aux autres. */}
      {coulisses && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {([["client", "Avec le client"], ["prive", `Entre nous${nbPrives ? ` (${nbPrives})` : ""}`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSalon(k)}
              style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                border: `1px solid ${salon === k ? "var(--orange)" : "var(--border)"}`,
                background: salon === k ? "rgba(255,140,26,.14)" : "var(--bg-3)",
                color: salon === k ? "var(--orange)" : "var(--text-muted)" }}>
              {l}
            </button>
          ))}
        </div>
      )}
      {salon === "prive" && (
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 9, padding: "7px 10px", borderRadius: 8, background: "rgba(255,140,26,.07)", border: "1px solid rgba(255,140,26,.25)" }}>
          <Icon name="lock" size={12} style={{ verticalAlign: "-1px", marginRight: 5, color: "var(--orange)" }} />
          Entre détenteurs et staff. <b>Le demandeur ne voit rien de ce qui s&apos;écrit ici.</b>
        </div>
      )}

      <div style={{ maxHeight: hauteur, overflow: "auto", display: "grid", gap: 10, marginBottom: 13 }}>
        {!pret && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Chargement…</div>}
        {pret && visibles.length === 0 && !erreur && (
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {salon === "prive" ? "Rien entre vous pour l'instant. Écris ici pour vous mettre d'accord." : "Aucun message. Écris pour ouvrir la discussion."}
          </div>
        )}
        {visibles.map((m) => {
          if (m.kind === "system") {
            // Un fait enregistré, pas une parole : liseré et aucun auteur, pour
            // qu'on ne le prenne pas pour l'avis de quelqu'un.
            return (
              <div key={m.id} style={{ fontSize: 12.5, color: "var(--text-muted)", borderLeft: "2px solid var(--orange)", paddingLeft: 10 }}>
                {m.body}<span style={{ opacity: .7 }}> · {new Date(m.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
            );
          }
          if (m.kind === "offer") {
            const aMoi = m.userId === moiId;
            const troc = m.mode === "troc";
            // Trois états, trois lectures : en attente (doré), accepté (vert),
            // refusé ou dépassé (éteint). Avant, tout était doré et dix prix
            // semblaient également valables.
            // Une offre non retenue s'éteint aussi quand un prix est convenu :
            // sinon elle reste dorée à côté de l'accord, comme si elle attendait
            // encore une réponse.
            const refuse = !!m.refusedAt || (!!prixConvenu && !m.acceptedAt);
            const teinte = m.acceptedAt ? "var(--green)" : refuse ? "var(--border)" : "var(--gold)";
            return (
              <div key={m.id} style={{ padding: 11, borderRadius: 10, opacity: refuse ? .55 : 1, border: `1px solid ${teinte}`, background: m.acceptedAt ? "rgba(74,222,128,.08)" : refuse ? "transparent" : "rgba(255,181,82,.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <Icon name={troc ? "swap" : "coins"} size={15} style={{ color: teinte }} />
                  <b style={{ fontSize: 14, textDecoration: refuse ? "line-through" : "none" }}>{troc ? "Échange en objets" : `${fmt(m.amount)} périns`}</b>
                  {/* Sur un troc, le chiffre reste affiché mais comme une estimation :
                      c'est ce qui permet de comparer, pas une somme à payer. */}
                  {troc && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>≈ {fmt(m.amount)} périns</span>}
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>proposé par {m.author}</span>
                  {m.acceptedAt && <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--green)" }}>accepté</span>}
                  {refuse && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{m.refusedAt ? "refusé" : "non retenu"}</span>}
                  {!m.acceptedAt && !refuse && aMoi && (
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>en attente de sa réponse</span>
                  )}
                  {/* On n'accepte pas sa propre offre : ce serait s'accorder un
                      prix tout seul. Et plus rien ne s'accepte une fois l'accord
                      conclu — les offres précédentes ne sont plus que l'historique
                      de la négociation. Le serveur refuse les deux cas. */}
                  {!m.acceptedAt && !refuse && !aMoi && !prixConvenu && (
                    <span style={{ marginLeft: "auto", display: "flex", gap: 7 }}>
                      <button onClick={() => envoyer({ refuse: m.id })}
                        style={{ padding: "6px 13px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit" }}>
                        Refuser
                      </button>
                      <button className="vg-btn" onClick={() => envoyer({ accept: m.id })} style={{ padding: "6px 13px", fontSize: 12.5 }}>
                        {troc ? "Accepter cet échange" : "Accepter ce prix"}
                      </button>
                    </span>
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
        <div ref={bas} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={msg} onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyerTexte(); } }}
          placeholder={salon === "prive" ? "Message entre détenteurs…" : "Écrire un message…"}
          style={{ flex: 1, minWidth: 0, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "11px 13px", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
        <button className="vg-btn" onClick={envoyerTexte}>Envoyer</button>
      </div>

      {/* La négociation est ouverte aux DEUX parties : un prix imposé n'est pas
          négocié. Le staff propose, le demandeur peut contre-proposer.
          On ne parle QUE de périns ici : le troc reste possible côté serveur,
          mais il se décide avec le détenteur, pas au milieu d'une discussion —
          un second bouton dans le fil ajoutait un choix là où la règle de la
          guilde est simple. */}
      {negociation && !prixConvenu && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", paddingTop: 11, borderTop: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            {estStaff ? "Proposer un prix" : offreVive ? "Contre-proposer" : "Proposer un prix"} :
          </span>
          <input type="number" min={1} value={offre} onChange={(e) => setOffre(e.target.value)} placeholder="périns"
            style={{ width: 140, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 13.5 }} />
          <button
            onClick={() => {
              if (!(Number(offre) > 0)) { setErreur("Indique un montant : sans chiffre, une offre ne se compare pas."); return; }
              envoyer({ offer: Number(offre) }).then((ok) => { if (ok) setOffre(""); });
            }}
            style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid var(--gold)", background: "transparent", color: "var(--gold)", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
            Proposer
          </button>
        </div>
      )}
    </div>
  );
}
