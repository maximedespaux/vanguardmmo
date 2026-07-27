"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { AvatarCadre } from "@/components/AvatarCadre";
import { rangDe, rangSuivant } from "@/lib/rangs";
import type { ObjetCoffre } from "@/lib/coffre";

/**
 * QUÊTE GUILDE — ce dont la guilde a besoin, et ce que ça rapporte.
 *
 * Le principe qui tient tout : on ne paie pas ce qu'on demande, on le mérite.
 * Aider donne de l'XP (ce qu'on a fait) et des crédits (ce qu'on peut demander
 * en retour). Le bandeau du haut montre les deux en permanence — sans ça, la
 * boucle ne se voit pas et personne ne joue.
 *
 * Le demandeur, et lui seul, confirme la réception : c'est ce qui rend la
 * récompense du livreur incontestable.
 */
type Personne = { id: string; nom: string; avatar: string | null };
type Apport = { id: string; quantite: number; statut: "annonce" | "confirme"; par: Personne };
type Quete = {
  id: string; titre: string; quantite: number; note: string | null; manque: number | null;
  itemRef: string | null; unite: string | null;
  statut: "ouverte" | "livree" | "annulee";
  auteur: Personne; createdAt: string; livreeAt: string | null;
  /** Ce qui est reçu, ce qui est promis, ce qui manque encore. */
  contributions: Apport[]; confirme: number; annonce: number; reste: number;
};
type Progression = {
  moi: { total: number; niveau: number; dansNiveau: number; pourNiveau: number };
  credits: { solde: number; gagnes: number; depenses: number };
};

const ETAT: Record<Quete["statut"], { l: string; c: string; ic: "target" | "check" | "x" }> = {
  ouverte: { l: "En cours", c: "var(--gold)", ic: "target" },
  livree: { l: "Complète", c: "var(--green)", ic: "check" },
  annulee: { l: "Annulée", c: "var(--text-muted)", ic: "x" },
};

const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 12px", color: "var(--text)", fontSize: 13.5, fontFamily: "inherit" };
const pas: React.CSSProperties = { width: 26, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", cursor: "pointer", fontSize: 15, lineHeight: 1 };

/** « 12 slots » ou « 400 unités » : 1 slot = 9 999 unités, le mot compte. */
const lisible = (n: number, unite: string | null) =>
  `${n.toLocaleString("fr-FR")}${unite === "slot" ? ` slot${n > 1 ? "s" : ""}` : unite === "unitaire" ? ` unité${n > 1 ? "s" : ""}` : ""}`;

export default function QuetesPage() {
  useCardFx();
  const { data: session } = useSession();
  const moi = (session?.user as { id?: string; image?: string } | undefined)?.id;
  const monAvatar = (session?.user as { image?: string } | undefined)?.image ?? null;

  const [quetes, setQuetes] = useState<Quete[]>([]);
  const [prog, setProg] = useState<Progression | null>(null);
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");
  const [pret, setPret] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  // ── Catalogue du coffre : on demande ce qui existe, avec ses chiffres ──
  const [catalogue, setCatalogue] = useState<ObjetCoffre[]>([]);
  const [q, setQ] = useState("");
  /** Quantités choisies, par objet. Vide = 0 : rien n'est demandé par défaut. */
  const [panier, setPanier] = useState<Record<string, number>>({});

  const charger = useCallback(async () => {
    const [a, b] = await Promise.all([
      fetch("/api/quetes").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/xp").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    if (a) setQuetes(a);
    if (b) setProg({ moi: b.moi, credits: b.credits });
    setPret(true);
  }, []);
  useEffect(() => { charger(); const t = setInterval(charger, 30000); return () => clearInterval(t); }, [charger]);
  useEffect(() => {
    fetch("/api/catalogue").then((r) => (r.ok ? r.json() : null)).then((d) => d && setCatalogue(d.items ?? [])).catch(() => {});
  }, []);

  // Arrivée depuis le plan de farm : l'objet visé est déjà dans la recherche.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const item = p.get("item");
    if (item) setQ(item);
  }, []);

  const listeObjets = useMemo(() => {
    const t = q.trim().toLowerCase();
    // Sans recherche : ce qui manque le plus. C'est la réponse à « je peux
    // demander quoi d'utile ? » posée sans mot-clé.
    const base = t
      ? catalogue.filter((o) => (o.item + " " + o.cat + " " + o.classe).toLowerCase().includes(t))
      : catalogue.filter((o) => o.manque > 0);
    return base.slice(0, 10);
  }, [catalogue, q]);

  const choisis = Object.entries(panier).filter(([, n]) => n > 0);
  const objetDe = (id: string) => catalogue.find((o) => o.id === id);
  const bouger = (id: string, n: number) => setPanier((p) => {
    const v = Math.max(0, Math.min(99999, Math.round(n) || 0));
    const c = { ...p };
    if (v <= 0) delete c[id]; else c[id] = v;
    return c;
  });

  const demander = async () => {
    if (!choisis.length) { setErreur("Choisis au moins un objet, avec une quantité."); return; }
    if (!note.trim()) { setErreur("Indique la raison : c'est ce qui décide quelqu'un à s'en charger."); return; }
    setEnvoi(true);
    const r = await fetch("/api/quetes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note,
        items: choisis.map(([id, n]) => {
          const o = objetDe(id);
          return { titre: o?.classe ? `${o.item} (${o.classe})` : o?.item ?? id, quantite: n, itemRef: id, unite: o?.unit, manque: o?.manque };
        }),
      }),
    });
    const j = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) { setErreur(j.error ?? `Demande refusée (erreur ${r.status}).`); return; }
    setPanier({}); setNote(""); setErreur("");
    charger();
  };

  /** Ce que je m'apprête à apporter, par quête. */
  const [apport, setApport] = useState<Record<string, string>>({});
  const [onglet, setOnglet] = useState<"principales" | "miennes" | "reglees">("principales");

  const agir = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    const r = await fetch(`/api/quetes/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }),
    });
    const j = await r.json().catch(() => ({}));
    setErreur(r.ok ? "" : (j.error ?? `Action refusée (erreur ${r.status}).`));
    charger();
  };

  // Trois vues pour trois questions différentes : « qu'est-ce que je peux
  // faire pour la guilde ? », « où en sont MES demandes ? », « qu'est-ce qui
  // a bougé ? ». Mélangées, on ne répondait bien à aucune des trois.
  const ouvertes = quetes.filter((x) => x.statut === "ouverte");
  const closes = quetes.filter((x) => x.statut === "livree" || x.statut === "annulee");
  const miennes = quetes.filter((x) => !!moi && x.auteur.id === moi && x.statut === "ouverte");
  // Les quêtes des autres d'abord : c'est là qu'on peut aider. Les siennes ont
  // leur onglet, et y attendre un volontaire ne demande aucune action.
  const aFaire = ouvertes.filter((x) => !moi || x.auteur.id !== moi);
  /** Une confirmation en attente est la seule chose qui BLOQUE quelqu'un d'autre. */
  const aConfirmer = miennes.reduce((s, x) => s + x.contributions.filter((c) => c.statut === "annonce").length, 0);
  const liste = onglet === "principales" ? aFaire : onglet === "miennes" ? miennes : closes;
  const niveau = prog?.moi.niveau ?? 1;
  const rang = rangDe(niveau);
  const suivant = rangSuivant(niveau);
  const pc = prog ? Math.min(100, Math.round((prog.moi.dansNiveau / prog.moi.pourNiveau) * 100)) : 0;

  return (
    <div style={{ padding: "24px 22px 60px", maxWidth: 1080, margin: "0 auto" }}>
      <PageHeader icon="target" title="Quête Guilde" subtitle="Ce dont la guilde a besoin. Aider rapporte de l'XP et des crédits ; demander en dépense — c'est ce qui fait que ça ne va pas dans un seul sens." />

      {/* ── Bandeau de progression : la boucle du jeu, toujours à l'écran ── */}
      <div className="glass-card fx-card" style={{ padding: 16, marginBottom: 18, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <AvatarCadre src={monAvatar} niveau={niveau} taille={64} montrerRang />

        <div style={{ flex: "1 1 260px", minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
            <span className="font-heading" style={{ fontSize: 19, fontWeight: 700, color: rang.couleur }}>Niveau {niveau}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{(prog?.moi.total ?? 0).toLocaleString("fr-FR")} XP</span>
            <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-muted)" }}>
              {suivant ? `${suivant.nom} au niveau ${suivant.seuil}` : "rang maximal atteint"}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 5, background: "var(--bg-3)", border: "1px solid var(--border)", overflow: "hidden", margin: "7px 0 5px" }}>
            <div style={{ width: `${pc}%`, height: "100%", background: `linear-gradient(90deg, ${rang.couleur}, var(--orange))`, transition: "width .4s var(--ease,ease)" }} />
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{rang.obtention}</div>
        </div>

        {/* Les crédits : ce qu'on peut demander parce qu'on a donné. */}
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <Compteur valeur={prog?.credits.solde ?? 0} label="crédits" principal />
          <Compteur valeur={prog?.credits.gagnes ?? 0} label="gagnés en aidant" />
          <Compteur valeur={prog?.credits.depenses ?? 0} label="dépensés" />
        </div>
      </div>

      {erreur && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--red)" }}>{erreur}</div>}

      {/* ── Demander de l'aide ── */}
      <div className="glass-card fx-card" style={{ padding: 16, marginBottom: 22 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="plus" size={14} />Demander de l&apos;aide
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 11 }}>
          Cherche dans le coffre, mets une quantité sur ce qu&apos;il te faut. Tout est à 0 tant que tu n&apos;as rien demandé.
        </div>

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un objet…" style={{ ...inp, width: "100%", marginBottom: 10 }} />

        <div style={{ display: "grid", gap: 5, maxHeight: 320, overflowY: "auto", marginBottom: 12 }}>
          {listeObjets.length === 0 && (
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "14px 4px" }}>
              {catalogue.length ? "Aucun objet ne correspond." : "Catalogue en cours de chargement…"}
            </div>
          )}
          {listeObjets.map((o) => {
            const n = panier[o.id] ?? 0;
            return (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 10, background: n ? "rgba(255,140,26,.07)" : "var(--bg-3)", border: `1px solid ${n ? "var(--orange)" : "var(--border)"}` }}>
                <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {o.icon ? <img src={o.icon} alt="" style={{ width: 25, height: 25, objectFit: "contain" }} /> : <Icon name="package" size={15} style={{ color: "var(--text-muted)" }} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {o.item}{o.classe ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · {o.classe}</span> : null}
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>
                    {o.cat} · coffre {o.stock}/{o.target}
                    {o.manque > 0 && <b style={{ color: "var(--red)" }}> — il en manque {o.manque}</b>}
                  </span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => bouger(o.id, n - 1)} style={pas} aria-label={`Moins de ${o.item}`}>−</button>
                  <input value={n} onChange={(e) => bouger(o.id, +e.target.value || 0)} inputMode="numeric"
                    style={{ ...inp, width: 62, textAlign: "center", padding: "6px 4px", fontSize: 13 }} aria-label={`Quantité de ${o.item}`} />
                  <button onClick={() => bouger(o.id, n + 1)} style={pas} aria-label={`Plus de ${o.item}`}>＋</button>
                  {o.manque > 0 && (
                    <button onClick={() => bouger(o.id, o.manque)} title="Demander tout ce qui manque au seuil"
                      style={{ ...pas, width: "auto", padding: "0 9px", fontSize: 11, color: "var(--text-muted)" }}>
                      manque
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {choisis.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 11 }}>
            {choisis.map(([id, n]) => {
              const o = objetDe(id);
              return (
                <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: "1px solid var(--orange)", background: "rgba(255,140,26,.1)", fontSize: 12 }}>
                  <b style={{ color: "var(--orange)" }}>{lisible(n, o?.unit ?? null)}</b> {o?.item ?? id}
                  <button onClick={() => bouger(id, 0)} aria-label="Retirer" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, display: "flex" }}>
                    <Icon name="x" size={11} />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pourquoi tu en as besoin *" style={{ ...inp, flex: "1 1 240px" }} />
          <button className="vg-btn" onClick={demander} disabled={envoi || !choisis.length}
            style={{ opacity: envoi || !choisis.length ? .5 : 1, cursor: envoi || !choisis.length ? "default" : "pointer" }}>
            {envoi ? "Envoi…" : choisis.length > 1 ? `Demander ${choisis.length} objets` : "Demander"}
          </button>
        </div>
      </div>

      {/* ── Le tableau des quêtes ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {([
          ["principales", "target", `Quêtes principales${aFaire.length ? ` (${aFaire.length})` : ""}`],
          ["miennes", "clipboard", `Mes requêtes${miennes.length ? ` (${miennes.length})` : ""}`],
          ["reglees", "check", "Réglées"],
        ] as const).map(([k, ic, l]) => (
          <button key={k} onClick={() => setOnglet(k)}
            style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "'Rubik',sans-serif", border: `1px solid ${onglet === k ? "var(--orange)" : "var(--border)"}`, background: onglet === k ? "rgba(255,140,26,.14)" : "var(--bg-3)", color: onglet === k ? "var(--orange)" : "var(--text-muted)" }}>
            <Icon name={ic} size={15} />{l}
            {/* Une confirmation qui attend bloque celui qui a livré : elle se
                signale même quand on regarde un autre onglet. */}
            {k === "miennes" && aConfirmer > 0 && (
              <span style={{ minWidth: 17, height: 17, padding: "0 5px", borderRadius: 9, background: "var(--green)", color: "#0a0a0c", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {aConfirmer}
              </span>
            )}
          </button>
        ))}
      </div>
      {!pret ? <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Chargement…</div>
        : liste.length === 0 ? (
          <div className="glass-card fx-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {onglet === "principales" ? "Personne n'a besoin de rien pour l'instant. C'est bon signe."
              : onglet === "miennes" ? "Tu n'as rien demandé. Le formulaire est juste au-dessus."
              : "Rien de réglé ces derniers jours."}
          </div>
        ) : (
          <div className="vg-stagger" style={{ display: "grid", gap: 10 }}>
            {liste.map((x) => {
              // Une quête close n'a plus d'action : on la montre en résumé.
              if (x.statut !== "ouverte") {
                return (
                  <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 10, background: "var(--bg-3)", border: "1px solid var(--border)", fontSize: 12.5, color: "var(--text-muted)" }}>
                    <Icon name={ETAT[x.statut].ic} size={13} style={{ color: ETAT[x.statut].c }} />
                    <span style={{ color: "var(--text)" }}>{lisible(x.quantite, x.unite)} × {x.titre}</span>
                    {x.statut === "livree" && x.contributions.length > 0 && (
                      <>· livré par <b style={{ color: "var(--text)" }}>{[...new Set(x.contributions.map((c) => c.par.nom))].join(", ")}</b></>
                    )}
                    <span style={{ marginLeft: "auto" }}>{new Date(x.livreeAt ?? x.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                );
              }
              const jeSuisAuteur = !!moi && x.auteur.id === moi;
              const e = ETAT[x.statut];
              const pcConfirme = Math.min(100, Math.round((x.confirme / Math.max(1, x.quantite)) * 100));
              const pcPromis = Math.min(100 - pcConfirme, Math.round((x.annonce / Math.max(1, x.quantite)) * 100));
              const monApport = x.contributions.find((c) => c.par.id === moi && c.statut === "annonce");
              return (
                <div key={x.id} className="glass-card fx-card" style={{ padding: 14, borderLeft: `3px solid ${e.c}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Icon name={e.ic} size={16} style={{ color: e.c }} />
                    <span className="font-heading" style={{ fontSize: 15.5, fontWeight: 700 }}>{lisible(x.quantite, x.unite)} × {x.titre}</span>
                    {x.manque != null && x.manque > 0 && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>il en manquait {x.manque} au seuil</span>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Icon name="medal" size={12} />récompense au prorata de ce que tu apportes
                    </span>
                  </div>

                  {/* La barre dit ce qui est REÇU (plein) et ce qui est PROMIS
                      (hachuré) : sans le second, quatre personnes farment la
                      même chose sans le savoir. */}
                  <div style={{ margin: "10px 0 6px" }}>
                    <div style={{ height: 10, borderRadius: 6, background: "var(--bg-3)", border: "1px solid var(--border)", overflow: "hidden", display: "flex" }}>
                      <div style={{ width: `${pcConfirme}%`, background: "linear-gradient(90deg,#4ADE80,#22c55e)", transition: "width .4s var(--ease,ease)" }} />
                      <div style={{ width: `${pcPromis}%`, background: "repeating-linear-gradient(45deg,rgba(255,140,26,.55),rgba(255,140,26,.55) 5px,rgba(255,140,26,.22) 5px,rgba(255,140,26,.22) 10px)", transition: "width .4s var(--ease,ease)" }} />
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11.5, marginTop: 5 }}>
                      <span style={{ color: "var(--green)" }}><b>{x.confirme}</b> reçu</span>
                      {x.annonce > 0 && <span style={{ color: "var(--orange)" }}><b>{x.annonce}</b> promis</span>}
                      <span style={{ color: x.reste ? "var(--text-muted)" : "var(--green)" }}>
                        {x.reste ? <>reste <b>{lisible(x.reste, x.unite)}</b></> : "tout est couvert"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)" }}>
                    <AvatarCadre src={x.auteur.avatar} nom={x.auteur.nom} niveau={1} taille={22} />
                    demandé par <b style={{ color: "var(--text)" }}>{x.auteur.nom}</b>
                  </div>
                  {x.note && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>« {x.note} »</div>}

                  {/* Qui apporte quoi. Le demandeur confirme apport par apport :
                      c'est lui qui sait ce qu'il a reçu. */}
                  {x.contributions.length > 0 && (
                    <div style={{ display: "grid", gap: 5, marginTop: 10, paddingTop: 9, borderTop: "1px dashed var(--border)" }}>
                      {x.contributions.map((c) => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                          <AvatarCadre src={c.par.avatar} nom={c.par.nom} niveau={1} taille={20} />
                          <b>{c.par.nom}</b>
                          <span style={{ color: c.statut === "confirme" ? "var(--green)" : "var(--orange)" }}>
                            {c.statut === "confirme" ? "a livré" : "apporte"} {lisible(c.quantite, x.unite)}
                          </span>
                          {c.statut === "confirme" && <Icon name="check" size={12} style={{ color: "var(--green)" }} />}
                          <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                            {jeSuisAuteur && c.statut === "annonce" && (
                              <button onClick={() => agir(x.id, "confirmer", { contributionId: c.id })}
                                style={{ padding: "5px 11px", borderRadius: 8, border: "1px solid var(--green)", background: "transparent", color: "var(--green)", cursor: "pointer", fontWeight: 600, fontSize: 11.5, fontFamily: "inherit" }}>
                                J&apos;ai bien reçu
                              </button>
                            )}
                            {!!moi && c.par.id === moi && c.statut === "annonce" && (
                              <button onClick={() => agir(x.id, "retirer", { contributionId: c.id })}
                                style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer", fontSize: 11.5, fontFamily: "inherit" }}>
                                Retirer
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap", alignItems: "center" }}>
                    {!jeSuisAuteur && x.reste > 0 && !monApport && (
                      <>
                        <input type="number" min={1} max={x.reste} value={apport[x.id] ?? ""}
                          onChange={(ev) => setApport((p) => ({ ...p, [x.id]: ev.target.value }))}
                          placeholder={`jusqu'à ${x.reste}`} aria-label="Ce que j'apporte"
                          style={{ ...inp, width: 130, padding: "8px 11px", fontSize: 13 }} />
                        <button className="vg-btn" style={{ padding: "8px 15px", fontSize: 12.5 }}
                          onClick={() => agir(x.id, "contribuer", { quantite: Number(apport[x.id]) || x.reste })}>
                          J&apos;apporte
                        </button>
                        <button onClick={() => agir(x.id, "contribuer", { quantite: x.reste })}
                          style={{ padding: "8px 13px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12.5, fontFamily: "inherit" }}>
                          Je prends tout
                        </button>
                      </>
                    )}
                    {!jeSuisAuteur && x.reste === 0 && (
                      <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Tout est couvert — rien à apporter.</span>
                    )}
                    {jeSuisAuteur && (
                      <button onClick={() => agir(x.id, "annuler")}
                        style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12.5, fontFamily: "inherit" }}>
                        Annuler ma demande
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

    </div>
  );
}

/** Un chiffre du bandeau. Le solde est mis en avant : c'est celui qui décide. */
function Compteur({ valeur, label, principal = false }: { valeur: number; label: string; principal?: boolean }) {
  const couleur = principal ? (valeur > 0 ? "var(--green)" : valeur < 0 ? "var(--red)" : "var(--gold)") : "var(--text)";
  return (
    <div style={{ minWidth: 92, padding: "9px 13px", borderRadius: 11, background: "var(--bg-3)", border: `1px solid ${principal ? "var(--orange)" : "var(--border)"}`, textAlign: "center" }}>
      <div className="font-heading" style={{ fontSize: principal ? 22 : 17, fontWeight: 700, color: couleur, lineHeight: 1.1 }}>{valeur}</div>
      <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 3 }}>{label}</div>
    </div>
  );
}
