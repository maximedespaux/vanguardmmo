"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { Pseudo } from "@/components/Pseudo";
import { Fil } from "@/components/Fil";
import { BulleObjet } from "@/components/BulleObjet";
import { specDepuisJson } from "@/lib/specObjet";
import { canAccessAdmin, canAccessGuild } from "@/config/roles";
import type { Role } from "@prisma/client";
import type { Conversation } from "@/lib/messagerie";
import { BandeauVente } from "@/components/BandeauVente";

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

/**
 * Trois façons de chercher, parce qu'on ne cherche pas la même chose :
 * « à faire » = ce qui attend une action ; « non lus » = ce qui a bougé ;
 * « clos » = l'archive, qu'on ne veut justement PAS voir le reste du temps.
 */
type Filtre = "afaire" | "tous" | "nonlus" | "clos";

/**
 * Une conversation appartient-elle à cette section ?
 *
 * Écrit une fois et utilisé aussi bien pour filtrer que pour compter : quand la
 * règle existait en double, le compte et la liste pouvaient se contredire, et
 * un onglet qui annonce quinze pour en montrer trois se lit comme un tri cassé.
 */
const estClose = (c: Conversation) => c.ton === "fini" || c.ton === "stop";
function dansSection(c: Conversation, f: Filtre): boolean {
  if (f === "afaire") return !estClose(c);
  if (f === "clos") return estClose(c);
  if (f === "nonlus") return c.nonLus > 0;
  return true;
}

/**
 * De quoi parle cette demande — un achat, ou une requête d'objet.
 *
 * Les deux arrivaient dans la même liste, avec la même icône de caddie : rien
 * ne disait si on lisait une commande à servir depuis le coffre ou un appel à
 * la guilde pour trouver l'objet. Ce sont pourtant deux façons d'y répondre.
 */
const CATEGORIES = {
  achat: { label: "Achat au coffre", icone: "cart" as IconName, couleur: "var(--green)" },
  requete: { label: "Requête objet", icone: "package" as IconName, couleur: "var(--purple)" },
};
function BadgeCategorie({ categorie, taille = 10 }: { categorie: "achat" | "requete"; taille?: number }) {
  const c = CATEGORIES[categorie];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, padding: "1px 7px", borderRadius: 6, border: `1px solid ${c.couleur}`, color: c.couleur, fontWeight: 700, fontSize: taille, textTransform: "uppercase", letterSpacing: .4, whiteSpace: "nowrap" }}>
      <Icon name={c.icone} size={taille - 1} />{c.label}
    </span>
  );
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const moi = session?.user as { id?: string; role?: Role } | undefined;
  const estStaff = (moi?.role ? canAccessAdmin(moi.role) : false) || process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";
  // Fournir un objet suppose d'en avoir au coffre : c'est réservé à la guilde.
  const deLaGuilde = (moi?.role ? canAccessGuild(moi.role) : false) || process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [pret, setPret] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("afaire");
  const [q, setQ] = useState("");

  // Un échec ne doit PAS se lire « aucune conversation » : c'est exactement ce
  // qui a caché pendant des semaines le 500 des dettes. Une liste vide est une
  // information, une panne en est une autre.
  const [panne, setPanne] = useState("");
  /** La conversation qu'on s'apprête à abandonner. Une demande abandonnée n'est
   *  pas effacée : elle passe en « Annulée » et rejoint les closes, pour que le
   *  staff garde la trace de ce qui a été demandé puis retiré. */
  const [aAbandonner, setAAbandonner] = useState<Conversation | null>(null);
  const [abandonEnCours, setAbandonEnCours] = useState(false);

  const charger = useCallback(async () => {
    try {
      const r = await fetch("/api/messages");
      if (r.ok) { setConvs((await r.json()).conversations ?? []); setPanne(""); }
      else setPanne(`Impossible de charger tes conversations (erreur ${r.status}).`);
    } catch { setPanne("Impossible de joindre le serveur."); }
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
      if (!dansSection(c, filtre)) return false;
      if (!texte) return true;
      return (c.titre + " " + c.avec + " " + (c.dernier?.corps ?? "")).toLowerCase().includes(texte);
    });
  }, [convs, filtre, q]);

  const courante = convs.find((c) => c.filId === ouvert) ?? null;
  /** Le compte de chaque onglet, par le MÊME prédicat que la liste : un onglet
   *  qui annonce 15 et n'en montre que 3 se lit comme un tri cassé. */
  const comptes = useMemo(() => ({
    afaire: convs.filter((c) => dansSection(c, "afaire")).length,
    tous: convs.length,
    nonlus: convs.filter((c) => dansSection(c, "nonlus")).length,
    clos: convs.filter((c) => dansSection(c, "clos")).length,
  }), [convs]);

  const abandonner = async () => {
    if (!aAbandonner) return;
    setAbandonEnCours(true);
    try {
      const r = await fetch(`/api/ventes/${aAbandonner.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clore", issue: "abandon" }),
      });
      if (!r.ok) setPanne((await r.json().catch(() => ({})))?.error ?? "L'abandon a échoué.");
      else { if (ouvert === aAbandonner.filId) setOuvert(null); await charger(); }
    } catch { setPanne("Impossible de joindre le serveur."); }
    setAbandonEnCours(false);
    setAAbandonner(null);
  };

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
        title="Mes demandes & messages"
        subtitle="Une demande est une conversation : son état, son prix et la discussion au même endroit."
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        {/* Beaucoup de demandes finissent en quête : le chemin doit être court. */}
        <Link href="/quetes" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", textDecoration: "none", fontSize: 12.5, fontWeight: 600 }}>
          <Icon name="target" size={14} />Les quêtes de la guilde
        </Link>
      </div>

      <div className="msg-layout" data-vue={ouvert ? "fil" : "liste"} style={{ display: "grid", gap: 14, alignItems: "start" }}>
        {/* ── Colonne des conversations ── */}
        <div className="msg-liste glass-card" style={{ padding: 12 }}>
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…"
            style={{ width: "100%", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 13, marginBottom: 9 }}
          />
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {([["afaire", "À faire"], ["tous", "Tout"], ["nonlus", "Non lus"], ["clos", "Clos"]] as const).map(([k, base]) => {
              const l = `${base} (${comptes[k]})`;
              return (
              <button key={k} onClick={() => setFiltre(k)}
                style={{ padding: "5px 11px", borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontWeight: 600, border: `1px solid ${filtre === k ? "var(--orange)" : "var(--border)"}`, background: filtre === k ? "rgba(255,140,26,.14)" : "var(--bg-3)", color: filtre === k ? "var(--orange)" : "var(--text-muted)" }}>
                {l}
              </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gap: 5, maxHeight: "62vh", overflowY: "auto" }}>
            {!pret && <div style={{ fontSize: 13, color: "var(--text-muted)", padding: 14 }}>Chargement…</div>}
            {pret && panne && (
              <div style={{ fontSize: 12.5, color: "var(--red)", padding: "18px 12px", textAlign: "center", lineHeight: 1.5 }}>
                {panne}
                <div style={{ color: "var(--text-muted)", marginTop: 6 }}>
                  Ce n&apos;est pas « aucune conversation » : le serveur n&apos;a pas répondu.
                </div>
              </div>
            )}
            {pret && !panne && liste.length === 0 && (
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "18px 12px", textAlign: "center" }}>
                {convs.length === 0
                  ? "Aucune conversation. Elles s'ouvrent quand tu fais une demande à la boutique ou qu'une dette est enregistrée."
                  : "Rien ne correspond à ce filtre."}
              </div>
            )}
            {liste.map((c) => {
              const actif = c.filId === ouvert;
              const abandonnable = !estClose(c) && (c.jeSuisLAuteur || estStaff);
              return (
                <div key={c.filId} style={{ position: "relative", borderRadius: 10, border: `1px solid ${actif ? "var(--orange)" : "transparent"}`, background: actif ? "rgba(255,140,26,.10)" : c.nonLus ? "rgba(255,140,26,.05)" : "var(--bg-3)" }}>
                {abandonnable && (
                  <button onClick={() => setAAbandonner(c)} title="Abandonner cette commande"
                    aria-label={`Abandonner « ${c.titre} »`}
                    style={{ position: "absolute", top: 6, right: 6, zIndex: 1, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}>
                    <Icon name="trash" size={11} />
                  </button>
                )}
                <button onClick={() => ouvrir(c)}
                  style={{ textAlign: "left", display: "grid", gap: 4, padding: "9px 11px", borderRadius: 10, cursor: "pointer", border: "none", background: "transparent", color: "var(--text)", fontFamily: "inherit", width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Icon name={c.categorie === "achat" ? "cart" : "package"} size={13} style={{ color: c.categorie === "achat" ? "var(--green)" : "var(--purple)", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>{c.titre}</span>
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)", flexShrink: 0, paddingRight: abandonnable ? 24 : 0 }}>{quandCourt(c.quand)}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-muted)" }}>
                    {/* Pastille de présence : savoir si ça sert d'attendre une réponse maintenant. */}
                    <span style={{ width: 7, height: 7, borderRadius: 4, flexShrink: 0, background: c.enLigne ? "var(--green)" : "var(--border)" }} />
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{c.avec}</span>
                    {/* Le troc est l'exception : on ne l'annonce que quand il a été
                        accepté, sinon la ligne dirait un accord qui n'existe pas. */}
                    {c.paiement === "troc" && (
                      <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", borderRadius: 6, border: "1px solid var(--gold)", color: "var(--gold)", fontWeight: 600, fontSize: 11 }}>
                        <Icon name="swap" size={9} />troc
                      </span>
                    )}
                    <span style={{ marginLeft: "auto", flexShrink: 0, color: TONS[c.ton], fontWeight: 600 }}>{c.etat}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 11.5, color: c.nonLus ? "var(--text)" : "var(--text-muted)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.dernier
                        ? `${c.dernier.kind === "system" ? "" : c.dernier.auteur ? c.dernier.auteur + " : " : ""}${c.dernier.corps}`
                        : "Aucun message"}
                    </span>
                    {c.nonLus > 0 && (
                      <span style={{ flexShrink: 0, minWidth: 17, height: 17, padding: "0 5px", borderRadius: 9, background: "var(--orange)", color: "#0a0a0c", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {c.nonLus > 9 ? "9+" : c.nonLus}
                      </span>
                    )}
                  </div>
                </button>
                </div>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{courante.titre}</span>
                    <BadgeCategorie categorie={courante.categorie} taille={10.5} />
                    {/* Une requête prise en charge à plusieurs se suit dans la
                        boutique — avec sa cagnotte et la part de chacun. Le fil,
                        lui, part vite en trente messages. */}
                    {courante.queteId && (
                      <Link href="/boutique?mode=requetes" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6, border: "1px solid var(--orange)", color: "var(--orange)", textDecoration: "none" }}>
                        <Icon name="target" size={11} />Suivre la commande →
                      </Link>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 4, background: courante.enLigne ? "var(--green)" : "var(--border)" }} />
                    {/* « Staff Vanguard » est un collectif : il n'a pas de fiche. */}
                    avec <b style={{ color: "var(--text)" }}>{courante.jeSuisLAuteur ? courante.avec : <Pseudo nom={courante.avec} />}</b>
                    {courante.enLigne && <span style={{ color: "var(--green)" }}>· en ligne</span>}
                    <span style={{ color: TONS[courante.ton], fontWeight: 600 }}>· {courante.etat}</span>
                    {courante.detail && <span>· {courante.detail}</span>}
                    {/* Combien de fois ce membre a demandé. Cliquable pour le
                        staff : c'est le premier réflexe quand une demande
                        paraît de trop, et le journal a déjà tout l'historique. */}
                    {courante.demandesDeLAuteur > 0 && (estStaff ? (
                      <Link href={`/journal?membre=${encodeURIComponent(courante.avec)}`} style={{ color: "var(--orange)", textDecoration: "none" }}>
                        · {courante.demandesDeLAuteur} demande{courante.demandesDeLAuteur > 1 ? "s" : ""} au total →
                      </Link>
                    ) : (
                      <span>· {courante.demandesDeLAuteur} demande{courante.demandesDeLAuteur > 1 ? "s" : ""} au total</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* L'objet demandé, à l'écran pendant qu'on répond : c'est de ÇA
                  qu'on parle, et le staff n'a pas à le reconstituer de mémoire. */}
              {(() => { const s = specDepuisJson(courante.spec); return s ? <div style={{ marginBottom: 12 }}><BulleObjet spec={s} /></div> : null; })()}

              {/* Le fil est le même composant partout : la boîte de réception ne
                  redéfinit ni l'envoi, ni la négociation, ni le marquage « lu ». */}
              {courante.type === "requete" && (
                <BandeauVente key={`v:${courante.id}`} id={courante.id} moiId={moi?.id}
                  estStaff={estStaff} deLaGuilde={deLaGuilde} onClos={charger} />
              )}
              {/* Les coulisses n'existent que pour ceux qui vendent : jamais
                  pour l'auteur de la demande, même s'il est de la guilde. */}
              {/* « Entre nous » : les détenteurs quand l'objet dort au coffre,
                  le staff quand il faut le faire fabriquer ou farmer. Dans les
                  deux cas, jamais l'auteur de la demande. */}
              <Fil
                coulisses={deLaGuilde && courante.type === "requete" && !courante.jeSuisLAuteur}
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

      {/* Abandonner une commande — sur <body>, pas dans la carte : un parent en
          `transform` (.fx-card) enfermerait la fenêtre à l'intérieur. */}
      {aAbandonner && typeof document !== "undefined" && createPortal(
        <div onClick={() => !abandonEnCours && setAAbandonner(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 18 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, width: "100%", maxWidth: 420 }}>
            <div className="font-heading" style={{ fontSize: 16.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="alert" size={17} style={{ color: "var(--red)" }} /> Abandonner cette commande ?
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 6px" }}>
              <b style={{ color: "var(--text)" }}>{aAbandonner.titre}</b> ne sera plus attendue : la demande passe en
              « Annulée » et rejoint les conversations closes. Celui d&apos;en face en est prévenu.
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 14px" }}>
              La conversation reste consultable dans « Clos » — rien n&apos;est effacé, et elle peut se rouvrir.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setAAbandonner(null)} disabled={abandonEnCours}
                style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                Garder
              </button>
              <button onClick={abandonner} disabled={abandonEnCours}
                style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: "var(--red)", color: "#0A0A0C", fontWeight: 700, cursor: abandonEnCours ? "wait" : "pointer", fontSize: 13, fontFamily: "inherit" }}>
                {abandonEnCours ? "Abandon…" : "Abandonner"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
