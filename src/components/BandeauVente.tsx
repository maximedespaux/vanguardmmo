"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Pseudo } from "@/components/Pseudo";
import { DEVISES, prixMixte } from "@/lib/monnaies";

/**
 * Qui fournit l'objet, et quand on se voit.
 *
 * Une demande partait « au staff » — c'est-à-dire à personne. Le demandeur ne
 * savait pas si quelqu'un s'en occupait, les détenteurs ne savaient pas ce que
 * faisaient les autres, et deux membres pouvaient livrer la même arme. Ce
 * bandeau met un NOM en face de la demande : le premier détenteur qui la prend
 * la verrouille, sa présence s'affiche des deux côtés, et la remise se conclut
 * ici — stock du coffre compris.
 */
type Membre = { id: string; nom: string; avatar: string | null; enLigne: boolean; vuLe: string | null };
type Offre = { id: string; membre: Membre; prix: number | null; prixAp: number | null; tauxAp: number | null; devise: string; reglement: string; validee: boolean; aObjet: boolean; statut: string; moi: boolean };
type Vente = {
  requestId: string;
  statut: string;
  detenteur: Offre | null;
  offres: Offre[];
  detenteursPossibles: { pseudo: string; quantite: number }[];
  rendezVous: string | null;
  rendezVousPar: string | null;
  rendezVousOk: boolean;
  demandeur: { id: string; nom: string; enLigne: boolean; vuLe: string | null } | null;
  prixReference: number | null;
  dettePossible: boolean;
  souhaitPaiement: string;
  nature: "boutique" | "aFaire";
  queteId: string | null;
  raison: string | null;
};

const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("fr-FR"));
/** « en jeu » ou « vu il y a 12 min » : une pastille verte ne dit pas depuis quand. */
const presence = (enLigne: boolean, vuLe: string | null) => {
  if (enLigne) return "· en ligne";
  if (!vuLe) return "· jamais vu";
  const min = Math.round((Date.now() - new Date(vuLe).getTime()) / 60_000);
  if (min < 60) return `· vu il y a ${min} min`;
  const h = Math.round(min / 60);
  return h < 48 ? `· vu il y a ${h} h` : `· vu il y a ${Math.round(h / 24)} j`;
};

const quand = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

function Pastille({ enLigne }: { enLigne: boolean }) {
  return (
    <span title={enLigne ? "En ligne sur le site" : "Hors ligne"}
      style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: enLigne ? "var(--green)" : "var(--text-muted)", boxShadow: enLigne ? "0 0 7px var(--green)" : "none" }} />
  );
}

export function BandeauVente({ id, moiId, estStaff, deLaGuilde, onClos }: {
  id: string;
  moiId?: string;
  estStaff?: boolean;
  /** Seuls les membres de la guilde peuvent fournir : le coffre est le leur. */
  deLaGuilde?: boolean;
  /** Prévient la liste : une demande close change de section. */
  onClos?: () => void;
}) {
  const [v, setV] = useState<Vente | null>(null);
  const [prix, setPrix] = useState("");
  // Deux parts : on peut payer tout en périns, tout en Airpoints, ou mêler les
  // deux — personne n'a jamais le compte rond dans une seule monnaie.
  const [ap, setAp] = useState("");
  const [taux, setTaux] = useState("");
  const [credit, setCredit] = useState(false);
  const [rdv, setRdv] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  /** Ce que le serveur a répondu quand tout va bien — « c'est signalé ». */
  const [info, setInfo] = useState("");
  /** Dernier « je suis là » envoyé : le bouton se verrouille derrière. */
  const [signaleLe, setSignaleLe] = useState(0);

  const charger = useCallback(async () => {
    try {
      const r = await fetch(`/api/ventes/${id}`, { cache: "no-store" });
      if (r.ok) setV(await r.json());
    } catch { /* le bandeau est un plus : son échec ne casse pas la conversation */ }
  }, [id]);

  useEffect(() => {
    charger();
    // La présence de l'autre n'a de valeur que fraîche : on la relit
    // régulièrement, sinon « en ligne » veut dire « l'était en ouvrant la page ».
    const t = setInterval(charger, 45_000);
    return () => clearInterval(t);
  }, [charger]);

  const agir = async (action: string, corps: Record<string, unknown> = {}) => {
    setOccupe(true); setErreur(""); setInfo("");
    let j: Record<string, unknown> = {};
    try {
      const r = await fetch(`/api/ventes/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...corps }),
      });
      j = await r.json().catch(() => ({}));
      if (!r.ok) setErreur((j.error as string) ?? "Action refusée.");
      else {
        if (typeof j.message === "string") setInfo(j.message);
        if (j.requestId) setV(j as unknown as Vente); else charger();
      }
    } catch { setErreur("Réseau indisponible."); }
    setOccupe(false);
    return j;
  };

  if (!v) return null;

  /** Le nom derrière un identifiant, pour dire QUI a proposé l'heure. */
  const nomDe = (id: string | null) =>
    !id ? null : id === v.demandeur?.id ? v.demandeur.nom : v.detenteur?.membre.id === id ? v.detenteur.membre.nom : null;

  /** Dix minutes de silence après un signal : c'est le même délai côté serveur. */
  const signale = Date.now() - signaleLe < 10 * 60_000;
  const jeSuisDemandeur = !!moiId && v.demandeur?.id === moiId;
  const jeSuisDetenteur = !!v.detenteur?.moi;
  const jePeuxPrendre = !!deLaGuilde && !jeSuisDemandeur && !jeSuisDetenteur;
  const autres = v.offres.filter((o) => o.id !== v.detenteur?.id);

  const bouton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", cursor: occupe ? "default" : "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", opacity: occupe ? .6 : 1 };
  const champ: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 11px", color: "var(--text)", fontSize: 13, fontFamily: "inherit" };

  /**
   * Une demande close ne se re-pilote pas.
   *
   * Le bandeau ignorait le statut : apres « Echange fait » ou « Abandonner », il
   * se redessinait a l'identique, boutons compris. On cliquait, le serveur
   * faisait son travail, et rien a l'ecran ne disait que c'etait fini — donc on
   * recliquait. Il dit maintenant ce qui s'est passe, et se tait sur le reste.
   */
  const fait = v.statut === "REMIS";
  const abandonnee = v.statut === "ANNULE" || v.statut === "REFUSE";
  if (fait || abandonnee) {
    return (
      <div className="glass-card" style={{ padding: "12px 14px", marginBottom: 12, borderColor: fait ? "rgba(74,222,128,.32)" : "var(--border)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Icon name={fait ? "check" : "x"} size={15} style={{ color: fait ? "var(--green)" : "var(--text-muted)" }} />
        <b className="font-heading" style={{ fontSize: 13.5, letterSpacing: .4, color: fait ? "var(--green)" : "var(--text-muted)" }}>
          {fait ? "Échange terminé" : "Demande abandonnée"}
        </b>
        {fait && v.detenteur && (
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            remis par <b style={{ color: "var(--text)" }}>{v.detenteur.membre.nom}</b>
            {(v.detenteur.prix || v.detenteur.prixAp) ? <> — <b style={{ color: "var(--gold)" }}>{prixMixte(v.detenteur.prix, v.detenteur.prixAp, v.detenteur.tauxAp)}</b>{v.detenteur.reglement === "dette" ? " à crédit" : ""}</> : null}
          </span>
        )}
        {/* Un « Abandonner » cliqué de travers ne doit pas obliger a tout
            refaire. Rien n'a bouge dans les coffres : c'est reversible. */}
        {abandonnee && (jeSuisDemandeur || estStaff) && (
          <button style={{ ...bouton, marginLeft: "auto" }} disabled={occupe}
            onClick={() => agir("rouvrir").then(() => onClos?.())}>
            <Icon name="rotate-ccw" size={13} />Rouvrir
          </button>
        )}
        {erreur && <span style={{ fontSize: 12, color: "var(--red)" }}>{erreur}</span>}
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: 14, marginBottom: 12, borderColor: v.detenteur ? "rgba(74,222,128,.32)" : "rgba(255,140,26,.3)" }}>
      <div className="font-heading" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 1.4, color: "var(--orange)", marginBottom: 9, display: "flex", alignItems: "center", gap: 7 }}>
        <Icon name={v.nature === "boutique" ? "swap" : "sprout-farm"} size={14} />
        {v.nature === "boutique" ? "L'échange" : "À faire — personne ne l'a au coffre"}
      </div>
      {v.raison && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 9 }}>
          <Icon name="info" size={12} style={{ verticalAlign: "-1px", marginRight: 5 }} />
          {v.raison}
        </div>
      )}

      {/* ── Qui fournit ── */}
      {v.detenteur ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <Pastille enLigne={v.detenteur.membre.enLigne} />
          <b style={{ fontSize: 13.5 }}><Pseudo nom={v.detenteur.membre.nom} /></b>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>s&apos;en occupe</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--gold)", fontWeight: 700 }}>
            {/* Les deux pièces quand le paiement est mixte : on voit ce qu'on
                doit sortir avant de lire les chiffres. */}
            {!!v.detenteur.prix && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={DEVISES[0].icone} alt="" style={{ width: 16, height: 16 }} />
            )}
            {!!v.detenteur.prixAp && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={DEVISES[1].icone} alt="" style={{ width: 16, height: 16 }} />
            )}
            {prixMixte(v.detenteur.prix, v.detenteur.prixAp, v.detenteur.tauxAp)}
          </span>
          {/* Achat ou dette : celui qui remet l'objet doit le savoir AVANT de
              le remettre, et celui qui reçoit doit savoir ce qu'il devra. */}
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: "2px 9px", borderRadius: 20, border: `1px solid ${v.detenteur.reglement === "dette" ? "var(--gold)" : "var(--green)"}`, color: v.detenteur.reglement === "dette" ? "var(--gold)" : "var(--green)" }}>
            {v.detenteur.reglement === "dette" ? "à crédit" : "achat comptant"}
          </span>
          {!!v.prixReference && v.detenteur.prix != null && v.detenteur.prix !== v.prixReference && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>réf. {fmt(v.prixReference)}</span>
          )}
          <span style={{ fontSize: 11.5, padding: "2px 9px", borderRadius: 20, border: `1px solid ${v.detenteur.aObjet ? "var(--green)" : "var(--border)"}`, color: v.detenteur.aObjet ? "var(--green)" : "var(--text-muted)" }}>
            {v.detenteur.aObjet ? "objet vérifié" : "objet pas encore vérifié"}
          </span>
          {v.detenteur.validee && (
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: "2px 9px", borderRadius: 20, border: "1px solid var(--green)", color: "var(--green)" }}>
              validé par le staff
            </span>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 10 }}>
          Personne ne s&apos;en occupe pour l&apos;instant.
          {v.detenteursPossibles.length > 0 && (
            <> Au coffre : {v.detenteursPossibles.map((d, i) => (
              <span key={d.pseudo}>{i > 0 ? ", " : ""}<b style={{ color: "var(--text)" }}><Pseudo nom={d.pseudo} /></b> ({d.quantite})</span>
            ))}.</>
          )}
          {/* Ce que l'acheteur a annoncé pouvoir sortir : le vendeur compose son
              tarif en le sachant, au lieu de poser la question dans le fil. */}
          {v.souhaitPaiement !== "perins" && (
            <> Il paie en <b style={{ color: "var(--gold)" }}>{v.souhaitPaiement === "mixte" ? "périns et Airpoints" : "Airpoints"}</b>.</>
          )}
        </div>
      )}

      {/* ── Qui, et quand ──
          « ibeats · 13:41 » ne disait ni qui proposait l'heure, ni à qui elle
          s'adressait. On nomme donc les deux rôles, on dit depuis quand chacun
          n'a pas été vu, et le rendez-vous porte le nom de celui qui l'a
          proposé — l'autre confirme. */}
      {(jeSuisDemandeur || jeSuisDetenteur || estStaff) && (
        <div style={{ display: "grid", gap: 8, marginBottom: 10, paddingTop: 9, borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5 }}>
            {v.demandeur && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Pastille enLigne={v.demandeur.enLigne} />
                <span style={{ color: "var(--text-muted)" }}>Client :</span>
                <b><Pseudo nom={v.demandeur.nom} /></b>
                <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>{presence(v.demandeur.enLigne, v.demandeur.vuLe)}</span>
              </span>
            )}
            {v.detenteur && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Pastille enLigne={v.detenteur.membre.enLigne} />
                <span style={{ color: "var(--text-muted)" }}>Vendeur :</span>
                <b><Pseudo nom={v.detenteur.membre.nom} /></b>
                <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>{presence(v.detenteur.membre.enLigne, v.detenteur.membre.vuLe)}</span>
              </span>
            )}
          </div>

          {v.detenteur && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12.5 }}>
              {v.rendezVous ? (
                <>
                  <span style={{ color: v.rendezVousOk ? "var(--green)" : "var(--gold)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Icon name="clock" size={13} />
                    {quand(v.rendezVous)}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    proposé par <b style={{ color: "var(--text)" }}>{nomDe(v.rendezVousPar) ?? "l'autre"}</b>
                    {v.rendezVousOk ? " · confirmé" : " · en attente de confirmation"}
                  </span>
                  {!v.rendezVousOk && v.rendezVousPar !== moiId && (
                    <button className="vg-btn" style={{ padding: "6px 12px", fontSize: 12, opacity: occupe ? .6 : 1 }} disabled={occupe}
                      onClick={() => agir("rdvOk")}>
                      <Icon name="check" size={13} />Ça me va
                    </button>
                  )}
                </>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>Aucune heure convenue.</span>
              )}
            </div>
          )}

          {v.detenteur && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <input type="datetime-local" value={rdv} onChange={(e) => setRdv(e.target.value)}
                style={{ ...champ, padding: "6px 9px", fontSize: 12 }} aria-label="Heure du rendez-vous" />
              <button style={bouton} disabled={occupe || !rdv} onClick={() => agir("rendezVous", { quand: rdv })}>
                <Icon name="calendar" size={13} />{v.rendezVous ? "Proposer une autre heure" : "Proposer cette heure"}
              </button>
              {/* On convient d'abord d'une heure ; « je suis connecté » ne sert
                  qu'ensuite, pour dire qu'on y est. Et quand c'est tout de
                  suite, un seul geste pose l'heure ET prévient — au lieu de
                  deux notifications pour la même intention. */}
              {!v.rendezVous ? (
                <button style={bouton} disabled={occupe || signale} onClick={() => agir("maintenant").then(() => setSignaleLe(Date.now()))}>
                  <Icon name="zap" size={13} />{signale ? "C'est signalé" : "C'est maintenant"}
                </button>
              ) : (
                <button style={bouton} disabled={occupe || signale}
                  title={signale ? "Déjà signalé — laisse-lui le temps de voir" : "Prévient l'autre que tu es connecté au jeu"}
                  onClick={() => agir("enLigne").then(() => setSignaleLe(Date.now()))}>
                  <Icon name={signale ? "check" : "zap"} size={13} />{signale ? "Signalé" : "Je suis connecté"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Personne ne l'a au coffre : ça ne se vend pas, ça se farme — et à
          plusieurs. La quête garde le « pourquoi » attaché au « quoi ». */}
      {v.nature === "aFaire" && (jeSuisDemandeur || estStaff) && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 10, padding: "9px 11px", borderRadius: 9, background: "rgba(255,140,26,.07)", border: "1px solid rgba(255,140,26,.25)" }}>
          {v.queteId ? (
            <>
              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Une quête de guilde est ouverte pour cet objet.</span>
              <Link href={`/quetes?q=${v.queteId}`} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, color: "var(--orange)", textDecoration: "none", fontSize: 12.5, fontWeight: 600 }}>
                <Icon name="target" size={13} />Suivre la quête →
              </Link>
            </>
          ) : (
            <>
              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                Personne n&apos;a cet objet au coffre. Ouvre une quête : plusieurs membres pourront y contribuer.
              </span>
              <button className="vg-btn" style={{ marginLeft: "auto", padding: "7px 13px", fontSize: 12.5, opacity: occupe ? .6 : 1 }} disabled={occupe}
                onClick={() => agir("enQuete").then(charger)}>
                <Icon name="target" size={13} />En faire une quête
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Ce que je peux faire ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {jePeuxPrendre && (
          <>
            {/* Une part par monnaie : laisser un champ vide, c'est payer
                entièrement dans l'autre. */}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DEVISES[0].icone} alt="" title="Périns" style={{ width: 16, height: 16 }} />
              <input type="number" min={0} value={prix} onChange={(e) => setPrix(e.target.value)}
                placeholder={v.prixReference ? `${fmt(v.prixReference)} (tarif)` : "périns"} style={{ ...champ, width: 120 }} aria-label="Part en périns" />
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DEVISES[1].icone} alt="" title="Airpoints" style={{ width: 16, height: 16 }} />
              <input type="number" min={0} value={ap} onChange={(e) => setAp(e.target.value)}
                placeholder="AP" style={{ ...champ, width: 80 }} aria-label="Part en Airpoints" />
            </span>
            {/* Il n'y a pas de cours officiel : c'est le vendeur qui dit à
                combien il prend l'Airpoint. */}
            {!!Number(ap) && (
              <input type="number" min={0} value={taux} onChange={(e) => setTaux(e.target.value)}
                placeholder="1 AP = ? périns" style={{ ...champ, width: 130 }} aria-label="Taux de l'Airpoint" />
            )}
            {v.dettePossible && (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: credit ? "var(--gold)" : "var(--text-muted)", cursor: "pointer" }}>
                <input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} style={{ accentColor: "var(--orange)" }} />
                à crédit
              </label>
            )}
            <button className="vg-btn" style={{ padding: "8px 14px", fontSize: 12.5, opacity: occupe ? .6 : 1 }} disabled={occupe}
              onClick={() => agir("prendre", { prix: prix || (Number(ap) ? "" : v.prixReference), prixAp: ap, tauxAp: taux, reglement: credit ? "dette" : "comptant" })}>
              <Icon name="check" size={14} />{v.detenteur ? "Je peux aussi le fournir" : "Je souhaite m'en occuper"}
            </button>
          </>
        )}
        {jeSuisDetenteur && (
          <>
            <button style={bouton} disabled={occupe} onClick={() => agir("objet", { aObjet: !v.detenteur?.aObjet })}>
              <Icon name="package" size={13} />{v.detenteur?.aObjet ? "Je ne l'ai plus" : "J'ai bien l'objet"}
            </button>
            <button className="vg-btn" style={{ padding: "8px 14px", fontSize: 12.5, opacity: occupe ? .6 : 1 }} disabled={occupe}
              onClick={() => { if (confirm("Confirmer l'échange ? L'objet sortira de ton coffre.")) agir("vendu").then(() => onClos?.()); }}>
              <Icon name="check" size={14} />Échange fait
            </button>
            <button style={{ ...bouton, color: "var(--text-muted)" }} disabled={occupe} onClick={() => agir("liberer")}>
              Je me désiste
            </button>
          </>
        )}
        {/* Le staff regarde, se joint, ou dit non. Il ne bloque rien : la vente
            a déjà commencé — sinon une demande dormirait jusqu'à ce qu'un
            officier passe. */}
        {estStaff && !jeSuisDetenteur && v.detenteur && (
          <>
            {!v.detenteur.validee && (
              <button style={bouton} disabled={occupe} onClick={() => agir("valider")}>
                <Icon name="shield" size={13} />Valider cet échange
              </button>
            )}
            <button style={{ ...bouton, color: "var(--text-muted)" }} disabled={occupe}
              onClick={() => { if (confirm("Refuser cette prise en charge ? La demande repartira aux autres détenteurs.")) agir("liberer"); }}>
              Refuser
            </button>
          </>
        )}
        {/* Clore appartient à celui qui a demandé : lui seul sait s'il en a
            encore besoin. Une demande morte restait « en attente » pour
            toujours et encombrait la liste de tout le monde. */}
        {(jeSuisDemandeur || estStaff) && (
          <span style={{ marginLeft: "auto", display: "flex", gap: 7 }}>
            <button style={bouton} disabled={occupe}
              onClick={() => { if (confirm("Clore cette demande comme réglée ?")) agir("clore", { issue: "fait" }).then(() => onClos?.()); }}>
              <Icon name="check" size={13} />C&apos;est réglé
            </button>
            <button style={{ ...bouton, color: "var(--text-muted)" }} disabled={occupe}
              onClick={() => { if (confirm("Abandonner cette demande ?")) agir("clore", { issue: "abandon" }).then(() => onClos?.()); }}>
              Abandonner
            </button>
          </span>
        )}
      </div>

      {/* ── Les autres qui se sont proposés ── */}
      {autres.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 9, borderTop: "1px solid var(--border)", fontSize: 12 }}>
          <span style={{ color: "var(--text-muted)" }}>Aussi disponibles : </span>
          {autres.map((o) => (
            <span key={o.id} style={{ marginRight: 10 }}>
              <b><Pseudo nom={o.membre.nom} /></b> — {prixMixte(o.prix, o.prixAp, o.tauxAp)}{o.reglement === "dette" ? " à crédit" : ""}
            </span>
          ))}
        </div>
      )}

      {erreur && <div style={{ marginTop: 8, fontSize: 12, color: "var(--red)" }}>{erreur}</div>}
      {info && <div style={{ marginTop: 8, fontSize: 12, color: "var(--green)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="check" size={12} />{info}</div>}
    </div>
  );
}
