"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { canAccessAdmin } from "@/config/roles";
import type { Role } from "@prisma/client";
import { AvatarCadre } from "@/components/AvatarCadre";
import { rangDe, rangSuivant } from "@/lib/rangs";
import type { ObjetCoffre } from "@/lib/coffre";
import type { Source } from "@/lib/ouFarmer";
import { reglagesPour, resumerPiece, CHOIX_VIDE, type ChoixPiece } from "@/lib/specsFlyff";
import { ReglagesPiece } from "@/components/ReglagesPiece";

type ObjetAFarmer = ObjetCoffre & { sources?: Source[]; besoin?: "fort" | "moyen" | "ok" };
type Objectif = { id: string; titre: string; cible: number; fait: number; unite: string | null; detail: string | null; termineAt: string | null };

/**
 * QUÊTE GUILDE — ce dont la guilde a besoin, et ce que ça rapporte.
 *
 * Le principe qui tient tout : ce qu'on apporte se voit. Aider fait monter le
 * niveau et le rang, et le bandeau du haut le montre en permanence — sans ça,
 * la boucle ne se voit pas et personne ne joue.
 *
 * Les crédits d'entraide ont été retirés le 2026-07-27 : un compteur de plus à
 * comprendre pour ce que l'XP et le journal du staff disaient déjà.
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
type Progression = { moi: { total: number; niveau: number; dansNiveau: number; pourNiveau: number } };

const ETAT: Record<Quete["statut"], { l: string; c: string; ic: "target" | "check" | "x" }> = {
  ouverte: { l: "En cours", c: "var(--gold)", ic: "target" },
  livree: { l: "Complète", c: "var(--green)", ic: "check" },
  annulee: { l: "Annulée", c: "var(--text-muted)", ic: "x" },
};

/** L'état de saisie d'une pièce, plus la quantité visée. */
type Choix = ChoixPiece & { qte: string };
const CHOIX_DEPART: Choix = { ...CHOIX_VIDE, qte: "1" };

const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 12px", color: "var(--text)", fontSize: 13.5, fontFamily: "inherit" };
const pas: React.CSSProperties = { width: 26, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", cursor: "pointer", fontSize: 15, lineHeight: 1 };

/** « 12 slots » ou « 400 unités » : 1 slot = 9 999 unités, le mot compte. */
const lisible = (n: number, unite: string | null) =>
  `${n.toLocaleString("fr-FR")}${unite === "slot" ? ` slot${n > 1 ? "s" : ""}` : unite === "unitaire" ? ` unité${n > 1 ? "s" : ""}` : ""}`;

export default function QuetesPage() {
  useCardFx();
  const { data: session } = useSession();
  const moi = (session?.user as { id?: string; image?: string } | undefined)?.id;
  // Les quêtes secondaires touchent aux coffres : elles restent au staff, comme
  // les coffres eux-mêmes.
  const estStaff = canAccessAdmin(((session?.user as { role?: Role } | undefined)?.role ?? "RECRUE") as Role)
    || process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";
  const monAvatar = (session?.user as { image?: string } | undefined)?.image ?? null;

  const [quetes, setQuetes] = useState<Quete[]>([]);
  const [prog, setProg] = useState<Progression | null>(null);
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");
  const [pret, setPret] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  // ── Catalogue du coffre : on demande ce qui existe, avec ses chiffres ──
  const [catalogue, setCatalogue] = useState<ObjetAFarmer[]>([]);
  const [q, setQ] = useState("");
  /** Quantités choisies, par objet. Vide = 0 : rien n'est demandé par défaut. */
  const [panier, setPanier] = useState<Record<string, number>>({});

  const charger = useCallback(async () => {
    const [a, b] = await Promise.all([
      fetch("/api/quetes").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/xp").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    if (a) setQuetes(a);
    if (b) setProg({ moi: b.moi });
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
  const [onglet, setOnglet] = useState<"principales" | "farm" | "miennes" | "reglees">("principales");
  /** Objet déplié dans « Que farmer » : où le trouver, et quoi en faire. */
  const [objetOuvert, setObjetOuvert] = useState<string | null>(null);
  const [objectifs, setObjectifs] = useState<Objectif[]>([]);
  /** Ce que je m'apprête à déposer, par objet. */
  const [depot, setDepot] = useState<Record<string, string>>({});
  /** Recherche et catégories dépliées de l'onglet « Quêtes secondaires ». */
  const [qFarm, setQFarm] = useState("");
  const [catsOuvertes, setCatsOuvertes] = useState<Record<string, boolean>>({});
  /** Le choix d'une quête ne s'ouvre qu'à la demande : le reste du temps, cet
   *  onglet doit montrer CE QUE J'AI À FAIRE, pas un catalogue de 264 lignes. */
  const [choixOuvert, setChoixOuvert] = useState(false);
  /** Les précisions de la pièce en cours de choix (rareté, +N, perçage, éveil…). */
  const [choix, setChoix] = useState<Choix>(CHOIX_DEPART);

  const deposer = async (o: ObjetAFarmer) => {
    const n = Number(depot[o.id]);
    if (!Number.isFinite(n) || n <= 0) { setErreur("Indique la quantité que tu as ramenée."); return; }
    const r = await fetch("/api/coffre/depot", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemRef: o.id, quantite: n }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErreur(j.error ?? `Dépôt refusé (erreur ${r.status}).`); return; }
    setErreur("");
    setDepot((p) => ({ ...p, [o.id]: "" }));
    // Le stock a bougé : on relit le catalogue plutôt que de le deviner.
    fetch("/api/catalogue").then((x) => (x.ok ? x.json() : null)).then((d) => d && setCatalogue(d.items ?? [])).catch(() => {});
    charger();
  };

  const chargerObjectifs = useCallback(async () => {
    const r = await fetch("/api/objectifs");
    if (r.ok) setObjectifs(await r.json());
  }, []);
  useEffect(() => { chargerObjectifs(); }, [chargerObjectifs]);

  /** Je m'engage — envers moi-même. Aucun XP : sinon il suffirait de cocher. */
  /** Ouvrir la fiche d'un objet, réglages remis à zéro : on configure la pièce
   *  qu'on regarde, jamais celle d'avant. */
  const ouvrirFiche = (o: ObjetAFarmer) => {
    const deja = objetOuvert === o.id;
    setObjetOuvert(deja ? null : o.id);
    if (!deja) setChoix({ ...CHOIX_DEPART, qte: String(reglagesPour(o) ? 1 : o.manque || 1) });
  };

  const seLancer = async (o: ObjetAFarmer) => {
    const detail = reglagesPour(o) ? resumerPiece(choix) : "";
    setChoixOuvert(false);
    setObjetOuvert(null);
    await fetch("/api/objectifs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: o.classe ? `${o.item} (${o.classe})` : o.item,
        // La quantité vient du champ : ce qui manque au coffre est une valeur
        // par défaut, pas une obligation — et un membre ne voit pas ce chiffre.
        cible: Math.max(1, Number(choix.qte) || 1),
        itemRef: o.id, unite: o.unit, detail,
      }),
    });
    setChoix(CHOIX_DEPART);
    setOnglet("farm");
    chargerObjectifs();
  };
  const majObjectif = async (corps: Record<string, unknown>) => {
    await fetch("/api/objectifs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    chargerObjectifs();
  };
  /** Quête dépliée dans la liste des réglées : qui a apporté quoi. */
  const [detail, setDetail] = useState<string | null>(null);

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
  // Une quête dont tout est PROMIS n'attend plus de volontaire : elle sort de
  // « à faire », sinon on la relit dix fois sans rien pouvoir y faire. Elle
  // rejoint « Réglées », où le demandeur voit ce qu'il lui reste à confirmer.
  const aFaire = ouvertes.filter((x) => (!moi || x.auteur.id !== moi) && x.reste > 0);
  const couvertes = ouvertes.filter((x) => x.reste === 0);
  // Le plan de farm, vu par la guilde : ce qui manque au coffre, sans les
  // chiffres de gestion. Les coffres eux-mêmes restent au staff.
  const manquants = catalogue.filter((o) => (o.besoin ? o.besoin !== "ok" : o.manque > 0));
  // Regroupé par catégorie, la plus en retard en tête : 264 objets à plat ne se
  // lisent pas, et on cherche presque toujours dans UNE famille à la fois.
  const rechercheFarm = qFarm.trim().toLowerCase();
  const groupesFarm = Object.values(
    manquants
      .filter((o) => !rechercheFarm || (o.item + " " + o.cat + " " + o.classe).toLowerCase().includes(rechercheFarm))
      .reduce<Record<string, { cat: string; objets: ObjetAFarmer[]; manque: number }>>((acc, o) => {
        const cat = o.cat || "Divers";
        (acc[cat] ??= { cat, objets: [], manque: 0 }).objets.push(o);
        acc[cat].manque += o.manque;
        return acc;
      }, {})
  ).sort((a, b) => b.manque - a.manque);
  const enCours = objectifs.filter((o) => !o.termineAt);
  /** Une confirmation en attente est la seule chose qui BLOQUE quelqu'un d'autre. */
  const aConfirmer = miennes.reduce((s, x) => s + x.contributions.filter((c) => c.statut === "annonce").length, 0);
  const liste = onglet === "principales" ? aFaire : onglet === "miennes" ? miennes : [...couvertes, ...closes];
  const niveau = prog?.moi.niveau ?? 1;
  const rang = rangDe(niveau);
  const suivant = rangSuivant(niveau);
  const pc = prog ? Math.min(100, Math.round((prog.moi.dansNiveau / prog.moi.pourNiveau) * 100)) : 0;

  return (
    <div style={{ padding: "24px 22px 60px", maxWidth: 1080, margin: "0 auto" }}>
      <PageHeader icon="target" title="Quête Guilde" subtitle="Ce dont la guilde a besoin, et qui s'en charge. Aider fait monter ton niveau ; celui qui a demandé confirme la réception." />

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

      </div>

      {erreur && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--red)" }}>{erreur}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {([
          ["principales", "target", `Quêtes principales${aFaire.length ? ` (${aFaire.length})` : ""}`],
          ["farm", "sprout-farm", `Quêtes secondaires${enCours.length ? ` (${enCours.length})` : ""}`],
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
      {/* Demander vit dans « Mes requêtes » : sur l'onglet principal, ce qu'on
          vient chercher c'est ce que la guilde attend de nous, pas un
          formulaire. Le mettre en tête poussait les quêtes sous la ligne de
          flottaison — on ne voyait plus ce qu'il y avait à faire. */}
      {onglet === "miennes" && (
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

      )}

      {onglet === "farm" && (
        <div style={{ display: "grid", gap: 14 }}>
          {/* Ce que JE me suis engagé à ramener. En tête, parce que c'est la
              seule chose ici qui demande une action de ma part aujourd'hui. */}
          <div className="glass-card fx-card" style={{ padding: 16 }}>
            <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 6, display: "flex", alignItems: "center", gap: 7 }}>
              <Icon name="target" size={14} />Mes quêtes secondaires
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Une quête principale, c&apos;est quelqu&apos;un qui attend quelque chose de toi.
              Une quête <b style={{ color: "var(--text)" }}>secondaire</b>, c&apos;est ce que <b style={{ color: "var(--text)" }}>tu</b> décides
              de farmer — pour toi, ou pour renflouer le coffre.
              <br />
              À quoi ça sert : tu choisis une fois, et tu retrouves ta liste à chaque connexion au lieu
              de rouvrir le plan de farm en te demandant ce que tu voulais faire. La barre te dit où tu
              en es, la ligne te dit dans quel donjon aller. {estStaff
                ? "Et tu déposes ce que tu as ramené sans rouvrir l'AirGuild."
                : "Quand tu as fini, préviens le staff : c'est lui qui enregistre le dépôt, et c'est ce dépôt qui te donne ton XP."}
            </div>
          </div>

          {enCours.length > 0 && (
            <div className="glass-card fx-card" style={{ padding: 16 }}>
              <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 11, display: "flex", alignItems: "center", gap: 7 }}>
                <Icon name="target" size={14} />Ce que je farme
                <span style={{ marginLeft: "auto", fontSize: 11, letterSpacing: 0, textTransform: "none", color: "var(--text-muted)" }}>
                  {enCours.filter((o) => o.fait >= o.cible).length} / {enCours.length} terminée{enCours.length > 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "grid", gap: 9 }}>
                {enCours.map((o) => {
                  const pc = Math.min(100, Math.round((o.fait / Math.max(1, o.cible)) * 100));
                  return (
                    <div key={o.id} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 7 }}>
                        {/* La case, c'est le geste de la to-do list : cocher =
                            j'ai fini. Le reste (les paliers) sert à dire « j'y
                            suis à moitié » sans mentir sur la fin. */}
                        <button onClick={() => majObjectif({ id: o.id, fait: pc >= 100 ? 0 : o.cible })} title={pc >= 100 ? "Rouvrir" : "Marquer comme fait"}
                          style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                            border: `1.5px solid ${pc >= 100 ? "var(--green)" : "var(--border)"}`,
                            background: pc >= 100 ? "var(--green)" : "transparent", color: "#0b0b0d" }}>
                          {pc >= 100 && <Icon name="check" size={13} />}
                        </button>
                        <b style={{ fontSize: 13.5, textDecoration: pc >= 100 ? "line-through" : "none", color: pc >= 100 ? "var(--text-muted)" : "var(--text)" }}>{o.titre}</b>
                        {o.detail && <span style={{ fontSize: 11.5, color: "var(--gold)", padding: "2px 8px", borderRadius: 20, border: "1px solid var(--gold)" }}>{o.detail}</span>}
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{lisible(o.fait, o.unite)} / {lisible(o.cible, o.unite)}</span>
                        <button onClick={() => majObjectif({ id: o.id, supprimer: true })}
                          style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 11.5, fontFamily: "inherit" }}>
                          abandonner
                        </button>
                      </div>
                      <div style={{ height: 8, borderRadius: 5, background: "var(--bg-2)", border: "1px solid var(--border)", overflow: "hidden", marginBottom: 8 }}>
                        <div style={{ width: `${pc}%`, height: "100%", background: "linear-gradient(90deg,#FFB552,#FF8C1A)", transition: "width .35s" }} />
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {/* Où j'en suis, en un clic. Des paliers plutôt qu'un
                            champ : on sait rarement au caillou près, mais on
                            sait toujours si on en est à la moitié. 100 % tombe
                            pile sur la cible, sans arrondi. */}
                        {[25, 50, 75, 100].map((n) => {
                          const valeur = n === 100 ? o.cible : Math.max(1, Math.round((o.cible * n) / 100));
                          const atteint = o.fait >= valeur;
                          return (
                            <button key={n} onClick={() => majObjectif({ id: o.id, fait: valeur })}
                              style={{ padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit",
                                border: `1px solid ${atteint ? "var(--green)" : "var(--border)"}`,
                                background: atteint ? "rgba(74,222,128,.12)" : "var(--bg-2)",
                                color: atteint ? "var(--green)" : "var(--text)" }}>
                              {n} %
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button className="vg-btn" onClick={() => setChoixOuvert((o) => !o)} style={{ justifySelf: "start" }}>
            <Icon name={choixOuvert ? "chevron-down" : "plus"} size={15} />
            {choixOuvert ? "Fermer la liste" : "Choisir une quête secondaire"}
          </button>

          {choixOuvert && <div className="glass-card fx-card" style={{ padding: 16 }}>
            <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}>
              <Icon name="sprout-farm" size={14} />Choisir une quête secondaire
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 12 }}>
              Ce qui manque au coffre. Sur une pièce d&apos;équipement, tu peux préciser ce que le jeu permet dessus — une arme se perce et se rend rare, un casque non.
            </div>
            <input value={qFarm} onChange={(e) => setQFarm(e.target.value)} placeholder="Chercher un objet ou une catégorie…"
              style={{ ...inp, width: "100%", marginBottom: 10 }} />

            {groupesFarm.length === 0 ? (
              <div style={{ fontSize: 13, color: rechercheFarm ? "var(--text-muted)" : "var(--green)" }}>
                {rechercheFarm ? "Rien ne correspond." : "Tout est au-dessus du seuil. Rien à farmer."}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 7 }}>
                {groupesFarm.map((g) => {
                  // Une recherche déplie d'office : sinon on cherche un objet
                  // pour ne trouver qu'une catégorie fermée.
                  const ouverteCat = catsOuvertes[g.cat] ?? !!rechercheFarm;
                  return (
                  <div key={g.cat}>
                    <button onClick={() => setCatsOuvertes((p) => ({ ...p, [g.cat]: !ouverteCat }))}
                      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 11px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", textAlign: "left", border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)" }}>
                      <Icon name={ouverteCat ? "chevron-down" : "chevron-right"} size={13} style={{ color: "var(--text-muted)" }} />
                      <b style={{ fontSize: 13 }}>{g.cat}</b>
                      <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{g.objets.length} objet{g.objets.length > 1 ? "s" : ""}</span>
{estStaff && <b style={{ marginLeft: "auto", color: "var(--red)", fontSize: 12.5 }}>−{g.manque.toLocaleString("fr-FR")}</b>}
                    </button>
                    {ouverteCat && <div style={{ display: "grid", gap: 5, marginTop: 5, paddingLeft: 10 }}>
                {g.objets.map((o) => {
                  const ouvert = objetOuvert === o.id;
                  const pc = Math.min(100, Math.round((o.stock / Math.max(1, o.target)) * 100));
                  return (
                    <div key={o.id} style={{ borderRadius: 10, background: "var(--bg-3)", border: `1px solid ${ouvert ? "var(--orange)" : "var(--border)"}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px 0 0" }}>
                      <button onClick={() => ouvrirFiche(o)}
                        style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, padding: "8px 11px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "var(--text)" }}>
                        <span style={{ width: 28, height: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {o.icon ? <img src={o.icon} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} /> : <Icon name="package" size={14} style={{ color: "var(--text-muted)" }} />}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {o.item}{o.classe ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · {o.classe}</span> : null}
                          </span>
                          <span style={{ display: "block", fontSize: 10.5, color: "var(--text-muted)" }}>{o.cat}</span>
                        </span>
                        {estStaff ? (
                          <>
                            <span style={{ width: 90, flexShrink: 0 }}>
                              <span style={{ display: "block", height: 6, borderRadius: 4, background: "var(--bg-2)", border: "1px solid var(--border)", overflow: "hidden" }}>
                                <span style={{ display: "block", width: `${pc}%`, height: "100%", background: pc >= 80 ? "var(--green)" : pc >= 40 ? "var(--gold)" : "var(--red)" }} />
                              </span>
                              <span style={{ display: "block", fontSize: 10, color: "var(--text-muted)", marginTop: 3, textAlign: "right" }}>{o.stock}/{o.target}</span>
                            </span>
                            <b style={{ flexShrink: 0, color: "var(--red)", fontSize: 12.5, width: 62, textAlign: "right" }}>−{o.manque.toLocaleString("fr-FR")}</b>
                          </>
                        ) : (
                          /* Le membre voit l'URGENCE, pas les stocks : ce qu'il
                             lui faut pour choisir, sans l'état du coffre. */
                          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, border: `1px solid ${o.besoin === "fort" ? "var(--red)" : "var(--gold)"}`, color: o.besoin === "fort" ? "var(--red)" : "var(--gold)" }}>
                            {o.besoin === "fort" ? "en priorité" : "utile"}
                          </span>
                        )}
                        <Icon name={ouvert ? "chevron-down" : "chevron-right"} size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      </button>
                      {/* Le geste principal ne se cache pas derrière un
                          dépliage : « choisir » est ce qu'on vient faire ici. */}
                      <button onClick={() => ouvrirFiche(o)} title="Mettre dans mes quêtes secondaires"
                        style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                          border: `1px solid ${ouvert ? "var(--orange)" : "var(--border)"}`,
                          background: ouvert ? "rgba(255,140,26,.14)" : "var(--bg-2)",
                          color: ouvert ? "var(--orange)" : "var(--text)" }}>
                        <Icon name="plus" size={13} />{reglagesPour(o) ? "Choisir" : "Ajouter"}
                      </button>
                      </div>

                      {ouvert && (
                        <div style={{ padding: "0 11px 11px", display: "grid", gap: 9 }}>
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: "var(--text-muted)" }}>Où le trouver : </span>
                            {o.sources?.length
                              ? o.sources.map((s) => `${s.donjon}${s.niveau ? ` (${s.niveau})` : ""}`).join(" · ")
                              : <span style={{ color: "var(--text-muted)" }}>pas de donjon connu — demande à la guilde.</span>}
                          </div>
                          {/* Dépôt rapide : même stock que l'AirGuild, saisi
                              depuis la ligne « il en manque 900 » plutôt qu'en
                              rouvrant l'app. Réservé au staff, comme les coffres :
                              un membre suit ce qu'il farme, il ne l'enregistre pas. */}
                          {estStaff && <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                            <input type="number" min={1} value={depot[o.id] ?? ""}
                              onChange={(ev) => setDepot((p) => ({ ...p, [o.id]: ev.target.value }))}
                              placeholder="j'en ai ramené…" aria-label="Quantité déposée"
                              style={{ ...inp, width: 150, padding: "8px 11px", fontSize: 13 }} />
                            <button onClick={() => deposer(o)}
                              style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid var(--green)", background: "transparent", color: "var(--green)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit" }}>
                              <Icon name="vault" size={13} /> Ajouter à mon coffre
                            </button>
                          </div>}
                          {/* Quelle pièce, exactement — le même panneau que la
                              commande sur mesure de la boutique, et il n'ouvre
                              que ce que le jeu permet sur celle-là. */}
                          {(() => {
                            const r = reglagesPour(o);
                            if (!r) return null;
                            return <ReglagesPiece reglages={r} choix={choix} nom={o.classe ? `${o.item} (${o.classe})` : o.item}
                              onChange={(c) => setChoix((p) => ({ ...c, qte: p.qte }))} />;
                          })()}

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Combien</span>
                            <input type="number" min={1} value={choix.qte} aria-label="Quantité visée"
                              onChange={(e) => setChoix((p) => ({ ...p, qte: e.target.value }))}
                              style={{ ...inp, width: 100, padding: "8px 11px", fontSize: 13 }} />
                            <button className="vg-btn" style={{ padding: "8px 14px", fontSize: 12.5 }} onClick={() => seLancer(o)}>
                              <Icon name="target" size={14} />Ajouter à ma liste
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                    </div>}
                  </div>
                  );
                })}
              </div>
            )}
          </div>}
        </div>
      )}

      {onglet !== "farm" && (!pret ? <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Chargement…</div>
        : liste.length === 0 ? (
          <div className="glass-card fx-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {onglet === "principales" ? "Personne n'a besoin de rien pour l'instant. C'est bon signe."
              : onglet === "miennes" ? "Tu n'as rien demandé. Le formulaire est juste au-dessus."
              : "Rien de réglé ces derniers jours."}
          </div>
        ) : (
          <div className="vg-stagger" style={{ display: "grid", gap: 10 }}>
            {liste.map((x) => {
              // Une quête close, ou entièrement promise, n'appelle plus de
              // volontaire : résumé d'une ligne. Sauf pour son auteur, qui a
              // encore des réceptions à confirmer — il la retrouve entière
              // dans « Mes requêtes ».
              if (x.statut !== "ouverte" || (onglet === "reglees" && x.reste === 0)) {
                const ouvert = detail === x.id;
                return (
                  <div key={x.id} style={{ borderRadius: 10, background: "var(--bg-3)", border: `1px solid ${ouvert ? "var(--orange)" : "var(--border)"}` }}>
                    {/* Cliquable : le résumé dit QUI a livré, le dépliage dit
                        combien chacun a apporté. La deuxième question ne se pose
                        pas toujours — mais quand elle se pose, il faut y répondre
                        sans aller fouiller le journal du staff. */}
                    <button onClick={() => setDetail(ouvert ? null : x.id)}
                      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "10px 12px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, color: "var(--text-muted)", textAlign: "left" }}>
                      <Icon name={ETAT[x.statut].ic} size={13} style={{ color: ETAT[x.statut].c, flexShrink: 0 }} />
                      <span style={{ color: "var(--text)" }}>{lisible(x.quantite, x.unite)} × {x.titre}</span>
                      {x.statut === "ouverte" && <span style={{ color: "var(--orange)" }}>· tout est promis, en attente de réception</span>}
                      {x.statut === "livree" && x.contributions.length > 0 && (
                        <>· livré par <b style={{ color: "var(--text)" }}>{[...new Set(x.contributions.map((c) => c.par.nom))].join(", ")}</b></>
                      )}
                      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                        {new Date(x.livreeAt ?? x.createdAt).toLocaleDateString("fr-FR")}
                        <Icon name={ouvert ? "chevron-down" : "chevron-right"} size={12} />
                      </span>
                    </button>
                    {ouvert && (
                      <div style={{ padding: "0 12px 11px", display: "grid", gap: 5 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          demandé par <b style={{ color: "var(--text)" }}>{x.auteur.nom}</b>{x.note ? ` — « ${x.note} »` : ""}
                        </div>
                        {x.contributions.length === 0 ? (
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Personne n&apos;a contribué.</div>
                        ) : x.contributions.map((c) => (
                          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                            <AvatarCadre src={c.par.avatar} nom={c.par.nom} niveau={1} taille={20} />
                            <b>{c.par.nom}</b>
                            <span style={{ color: c.statut === "confirme" ? "var(--green)" : "var(--orange)" }}>
                              {c.statut === "confirme" ? "a livré" : "avait promis"} {lisible(c.quantite, x.unite)}
                            </span>
                            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
                              {Math.round((c.quantite / Math.max(1, x.quantite)) * 100)} % de la quête
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
                        {/* Une part du RESTE, pas de la quantité totale : c'est ce
                            qu'on peut encore prendre. 100 % tombe pile dessus,
                            sans arrondi — sinon il resterait une unité orpheline
                            que personne ne pense à venir chercher. */}
                        {[25, 50, 75, 100].map((pct) => (
                          <button key={pct}
                            onClick={() => setApport((p) => ({
                              ...p,
                              [x.id]: String(pct === 100 ? x.reste : Math.max(1, Math.round((x.reste * pct) / 100))),
                            }))}
                            style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit" }}>
                            {pct} %
                          </button>
                        ))}
                        <button className="vg-btn" style={{ padding: "8px 15px", fontSize: 12.5 }}
                          onClick={() => agir(x.id, "contribuer", { quantite: Number(apport[x.id]) || x.reste })}>
                          J&apos;apporte
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
        ))}

    </div>
  );
}

