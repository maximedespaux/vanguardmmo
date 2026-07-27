"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import type { ObjetCoffre } from "@/lib/coffre";

/**
 * Quêtes : ce dont la guilde a besoin, et qui s'en charge.
 *
 * Le plan de farm dit ce qui manque, mais pas QUI s'en occupe — donc chacun
 * suppose que quelqu'un d'autre le fera. Ici un nom est attaché au besoin, et
 * c'est le demandeur qui clôt en confirmant la réception : lui seul sait.
 */
type Personne = { id: string; nom: string; avatar: string | null };
type Quete = {
  id: string; titre: string; quantite: number; note: string | null; manque: number | null; itemRef: string | null;
  statut: "ouverte" | "prise" | "livree" | "annulee";
  auteur: Personne; preneur: Personne | null; createdAt: string; livreeAt: string | null;
};

const ETAT: Record<Quete["statut"], { l: string; c: string }> = {
  ouverte: { l: "Cherche un volontaire", c: "var(--gold)" },
  prise: { l: "En cours", c: "var(--orange)" },
  livree: { l: "Livrée", c: "var(--green)" },
  annulee: { l: "Annulée", c: "var(--text-muted)" },
};

const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 12px", color: "var(--text)", fontSize: 13.5, fontFamily: "inherit" };

function Avatar({ p }: { p: Personne | null }) {
  if (p?.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.avatar} alt="" style={{ width: 22, height: 22, borderRadius: 11, objectFit: "cover", flexShrink: 0 }} />;
  }
  return <span style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, background: "var(--bg-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}><Icon name="user" size={12} /></span>;
}

export default function QuetesPage() {
  useCardFx();
  const { data: session } = useSession();
  const moi = (session?.user as { id?: string } | undefined)?.id;

  const [quetes, setQuetes] = useState<Quete[]>([]);
  const [titre, setTitre] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");
  const [pret, setPret] = useState(false);

  // Catalogue du coffre : chargé une fois, filtré à la frappe.
  const [catalogue, setCatalogue] = useState<ObjetCoffre[]>([]);
  const [choisi, setChoisi] = useState<ObjetCoffre | null>(null);
  const [listeOuverte, setListeOuverte] = useState(false);
  useEffect(() => {
    fetch("/api/catalogue").then((r) => (r.ok ? r.json() : null)).then((d) => d && setCatalogue(d.items ?? [])).catch(() => {});
  }, []);

  const suggestions = useMemo(() => {
    const q = titre.trim().toLowerCase();
    // Sans recherche, on montre ce qui manque le plus : c'est la réponse à
    // « qu'est-ce que je peux faire d'utile ? », posée sans mot-clé.
    const base = q
      ? catalogue.filter((o) => (o.item + " " + o.cat + " " + o.classe).toLowerCase().includes(q))
      : catalogue.filter((o) => o.manque > 0);
    return base.slice(0, 8);
  }, [catalogue, titre]);

  const prendreObjet = (o: ObjetCoffre) => {
    setChoisi(o);
    setTitre(o.classe ? `${o.item} (${o.classe})` : o.item);
    // La quantité proposée est ce qu'il manque : le chiffre utile, pas 1.
    if (o.manque > 0) setQuantite(String(o.manque));
    setListeOuverte(false);
  };

  const charger = useCallback(async () => {
    try { const r = await fetch("/api/quetes"); if (r.ok) setQuetes(await r.json()); } catch { /* silencieux */ }
    setPret(true);
  }, []);
  useEffect(() => { charger(); const t = setInterval(charger, 30000); return () => clearInterval(t); }, [charger]);

  // Le formulaire est pré-rempli quand on arrive du plan de farm
  // (`/quetes?item=Griffe&manque=12`) : la quête part de ce qui manque
  // vraiment, sans avoir à recopier le nom de l'objet.
  const [prefill, setPrefill] = useState<{ itemRef?: string; manque?: number }>({});
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const item = p.get("item");
    if (item) {
      setTitre(item);
      const manque = Number(p.get("manque"));
      if (Number.isFinite(manque) && manque > 0) setQuantite(String(manque));
      setPrefill({ itemRef: p.get("ref") ?? undefined, manque: Number.isFinite(manque) ? manque : undefined });
    }
  }, []);

  const creer = async () => {
    if (!titre.trim()) { setErreur("Dis ce dont tu as besoin."); return; }
    const r = await fetch("/api/quetes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre, quantite: Number(quantite) || 1, note,
        // L'objet du catalogue prime sur le pré-remplissage venu du plan de farm.
        ...(choisi ? { itemRef: choisi.id, manque: choisi.manque } : prefill),
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErreur(j.error ?? "Création refusée."); return; }
    setTitre(""); setQuantite("1"); setNote(""); setErreur(""); setPrefill({}); setChoisi(null);
    charger();
  };

  const agir = async (id: string, action: string) => {
    const r = await fetch(`/api/quetes/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErreur(j.error ?? "Action refusée."); else setErreur("");
    charger();
  };

  const ouvertes = quetes.filter((q) => q.statut === "ouverte" || q.statut === "prise");
  const closes = quetes.filter((q) => q.statut === "livree" || q.statut === "annulee");

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <PageHeader icon="target" title="Quêtes" subtitle="Ce dont la guilde a besoin, et qui s'en charge. Celui qui a demandé confirme la réception — c'est ce qui donne l'XP au livreur." />

      {erreur && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--red)" }}>{erreur}</div>}

      {/* ── Demander ── */}
      {/* z-index : la liste de suggestions déborde sur les cartes suivantes,
          qui sont peintes après elle sans cela. */}
      <div className="glass-card fx-card" style={{ padding: 16, marginBottom: 20, position: "relative", zIndex: 5 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 11, display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="plus" size={14} />J&apos;ai besoin de quelque chose
        </div>

        {/* Le champ cherche dans les objets du coffre : on voit le stock et ce
            qu'il manque au seuil AVANT de demander. En texte libre, on ne
            savait ni ce que la guilde possède, ni comment l'objet s'appelle
            exactement — deux quêtes pour le même objet mal orthographié. */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", position: "relative" }}>
          <div style={{ flex: "2 1 260px", minWidth: 220, position: "relative" }}>
            <input
              value={titre}
              onChange={(e) => { setTitre(e.target.value); setChoisi(null); setListeOuverte(true); }}
              onFocus={() => setListeOuverte(true)}
              placeholder="Cherche un objet du coffre, ou écris librement…"
              style={{ ...inp, width: "100%" }}
            />
            {listeOuverte && suggestions.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30, maxHeight: 280, overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 16px 40px rgba(0,0,0,.5)", padding: 5 }}>
                {suggestions.map((o) => (
                  <button key={o.id} onClick={() => prendreObjet(o)}
                    style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", padding: "7px 9px", borderRadius: 8, border: "none", background: "transparent", color: "var(--text)", cursor: "pointer", fontFamily: "inherit" }}>
                    <span style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 7, background: "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {o.icon ? <img src={o.icon} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} /> : <Icon name="package" size={14} style={{ color: "var(--text-muted)" }} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {o.item}{o.classe ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · {o.classe}</span> : null}
                      </span>
                      <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>{o.cat}</span>
                    </span>
                    <span style={{ flexShrink: 0, textAlign: "right" }}>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{o.stock}/{o.target}</span>
                      {o.manque > 0
                        ? <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--red)" }}>−{o.manque}</span>
                        : <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--green)" }}>au seuil</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input type="number" min={1} value={quantite} onChange={(e) => setQuantite(e.target.value)} placeholder="quantité" style={{ ...inp, width: 110 }} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pourquoi / pour quand (facultatif)" style={{ ...inp, flex: "2 1 180px" }} />
          <button className="vg-btn" onClick={creer}>Demander</button>
        </div>

        {choisi && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 10, padding: "8px 11px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", fontSize: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {choisi.icon && <img src={choisi.icon} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />}
            <b>{choisi.item}</b>
            <span style={{ color: "var(--text-muted)" }}>{choisi.cat}{choisi.classe ? ` · ${choisi.classe}` : ""}</span>
            <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
              coffre : <b style={{ color: "var(--text)" }}>{choisi.stock}</b> / {choisi.target}
              {choisi.manque > 0 && <b style={{ color: "var(--red)" }}> — il en manque {choisi.manque}</b>}
            </span>
          </div>
        )}
      </div>

      {/* ── En cours ── */}
      <h2 className="font-heading" style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>À faire</h2>
      {!pret ? <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Chargement…</div>
        : ouvertes.length === 0 ? (
          <div className="glass-card fx-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Aucune quête en cours. Demande ce dont tu as besoin — quelqu&apos;un s&apos;en chargera.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 9 }}>
            {ouvertes.map((q) => {
              // `moi` peut manquer (session pas encore lue, mode dev) : sans le
              // vérifier, `undefined === undefined` ferait passer tout le monde
              // pour le preneur, et « Je ne peux plus » s'afficherait sur les
              // quêtes de tous les autres.
              const jeSuisAuteur = !!moi && q.auteur.id === moi;
              const jeSuisPreneur = !!moi && q.preneur?.id === moi;
              return (
                <div key={q.id} className="glass-card fx-card" style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Icon name="target" size={16} style={{ color: "var(--orange)" }} />
                    <span className="font-heading" style={{ fontSize: 15, fontWeight: 700 }}>{q.quantite} × {q.titre}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: ETAT[q.statut].c }}>{ETAT[q.statut].l}</span>
                    {/* Le lien avec le plan de farm, figé à l'ouverture : c'est la
                        raison d'être de la quête, pas un compteur à rafraîchir. */}
                    {q.manque != null && q.manque > 0 && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>il en manquait {q.manque} au seuil</span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)" }}>
                    <Avatar p={q.auteur} />demandé par <b style={{ color: "var(--text)" }}>{q.auteur.nom}</b>
                    {q.preneur && <><span>·</span><Avatar p={q.preneur} />pris par <b style={{ color: "var(--text)" }}>{q.preneur.nom}</b></>}
                    {q.note && <span>· {q.note}</span>}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
                    {q.statut === "ouverte" && !jeSuisAuteur && (
                      <button className="vg-btn" onClick={() => agir(q.id, "prendre")} style={{ padding: "8px 15px", fontSize: 12.5 }}>Je m&apos;en charge</button>
                    )}
                    {jeSuisPreneur && (
                      <button onClick={() => agir(q.id, "abandonner")} style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12.5 }}>Je ne peux plus</button>
                    )}
                    {/* Confirmer la réception est réservé au demandeur : c'est ce
                        qui rend l'XP du livreur incontestable. */}
                    {jeSuisAuteur && q.preneur && (
                      <button onClick={() => agir(q.id, "livrer")} style={{ padding: "8px 15px", borderRadius: 9, border: "1px solid var(--green)", background: "transparent", color: "var(--green)", cursor: "pointer", fontWeight: 600, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Icon name="check" size={14} />J&apos;ai bien reçu
                      </button>
                    )}
                    {jeSuisAuteur && (
                      <button onClick={() => agir(q.id, "annuler")} style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12.5 }}>Annuler</button>
                    )}
                    {q.statut === "ouverte" && jeSuisAuteur && (
                      <span style={{ fontSize: 11.5, color: "var(--text-muted)", alignSelf: "center" }}>En attente d&apos;un volontaire.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* ── Réglées ── */}
      {closes.length > 0 && (
        <>
          <h2 className="font-heading" style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1, margin: "22px 0 10px" }}>Réglées récemment</h2>
          <div style={{ display: "grid", gap: 6 }}>
            {closes.map((q) => (
              <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 10, background: "var(--bg-3)", border: "1px solid var(--border)", fontSize: 12.5, color: "var(--text-muted)" }}>
                <Icon name={q.statut === "livree" ? "check" : "x"} size={13} style={{ color: ETAT[q.statut].c }} />
                <span style={{ color: "var(--text)" }}>{q.quantite} × {q.titre}</span>
                {q.preneur && q.statut === "livree" && <>· livré par <b style={{ color: "var(--text)" }}>{q.preneur.nom}</b></>}
                <span style={{ marginLeft: "auto" }}>{new Date(q.livreeAt ?? q.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
