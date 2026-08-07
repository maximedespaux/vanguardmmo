"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { DEVISES, montant, type Devise } from "@/lib/monnaies";

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
type Offre = { id: string; membre: Membre; prix: number | null; devise: string; reglement: string; aObjet: boolean; statut: string; moi: boolean };
type Vente = {
  requestId: string;
  detenteur: Offre | null;
  offres: Offre[];
  detenteursPossibles: { pseudo: string; quantite: number }[];
  rendezVous: string | null;
  demandeur: { id: string; nom: string; enLigne: boolean } | null;
  prixReference: number | null;
  dettePossible: boolean;
};

const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("fr-FR"));
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
  const [dev, setDev] = useState<Devise>("perins");
  const [credit, setCredit] = useState(false);
  const [rdv, setRdv] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

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
    setOccupe(true); setErreur("");
    try {
      const r = await fetch(`/api/ventes/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...corps }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErreur(j.error ?? "Action refusée.");
      else if (j.requestId) setV(j);
      else charger();
    } catch { setErreur("Réseau indisponible."); }
    setOccupe(false);
  };

  if (!v) return null;

  const jeSuisDemandeur = !!moiId && v.demandeur?.id === moiId;
  const jeSuisDetenteur = !!v.detenteur?.moi;
  const jePeuxPrendre = !!deLaGuilde && !jeSuisDemandeur && !jeSuisDetenteur;
  const autres = v.offres.filter((o) => o.id !== v.detenteur?.id);

  const bouton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", cursor: occupe ? "default" : "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", opacity: occupe ? .6 : 1 };
  const champ: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 11px", color: "var(--text)", fontSize: 13, fontFamily: "inherit" };

  return (
    <div className="glass-card" style={{ padding: 14, marginBottom: 12, borderColor: v.detenteur ? "rgba(74,222,128,.32)" : "rgba(255,140,26,.3)" }}>
      <div className="font-heading" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 1.4, color: "var(--orange)", marginBottom: 9, display: "flex", alignItems: "center", gap: 7 }}>
        <Icon name="swap" size={14} />L&apos;échange
      </div>

      {/* ── Qui fournit ── */}
      {v.detenteur ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <Pastille enLigne={v.detenteur.membre.enLigne} />
          <b style={{ fontSize: 13.5 }}>{v.detenteur.membre.nom}</b>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>s&apos;en occupe</span>
          {v.detenteur.prix != null && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--gold)", fontWeight: 700 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DEVISES.find((d) => d.clef === v.detenteur!.devise)?.icone ?? DEVISES[0].icone} alt="" style={{ width: 16, height: 16 }} />
              {montant(v.detenteur.prix, v.detenteur.devise)}
            </span>
          )}
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
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 10 }}>
          Personne ne s&apos;en occupe pour l&apos;instant.
          {v.detenteursPossibles.length > 0 && (
            <> Au coffre : <b style={{ color: "var(--text)" }}>{v.detenteursPossibles.map((d) => `${d.pseudo} (${d.quantite})`).join(", ")}</b>.</>
          )}
        </div>
      )}

      {/* ── Le rendez-vous, ou la présence ── */}
      {(jeSuisDemandeur || jeSuisDetenteur || estStaff) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: 12.5 }}>
          {v.demandeur && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
              <Pastille enLigne={v.demandeur.enLigne} />{v.demandeur.nom}
            </span>
          )}
          {v.rendezVous ? (
            <span style={{ color: "var(--gold)", fontWeight: 600 }}><Icon name="clock" size={13} /> {quand(v.rendezVous)}</span>
          ) : null}
          {v.detenteur && (
            <>
              <input type="datetime-local" value={rdv} onChange={(e) => setRdv(e.target.value)} style={{ ...champ, padding: "6px 9px", fontSize: 12 }} aria-label="Heure du rendez-vous" />
              <button style={bouton} disabled={occupe || !rdv} onClick={() => agir("rendezVous", { quand: rdv })}>
                <Icon name="calendar" size={13} />{v.rendezVous ? "Changer l'heure" : "Fixer un rendez-vous"}
              </button>
              <button style={bouton} disabled={occupe} onClick={() => agir("enLigne")}>
                <Icon name="zap" size={13} />Je suis en ligne
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Ce que je peux faire ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {jePeuxPrendre && (
          <>
            <input type="number" min={0} value={prix} onChange={(e) => setPrix(e.target.value)}
              placeholder={v.prixReference ? `${fmt(v.prixReference)} (tarif)` : "ton prix"} style={{ ...champ, width: 130 }} aria-label="Ton prix" />
            {/* Deux monnaies qui ne se convertissent pas : le prix ne part
                jamais sans dire laquelle. */}
            {DEVISES.map((d) => (
              <button key={d.clef} onClick={() => setDev(d.clef)} title={d.label}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  border: `1px solid ${dev === d.clef ? "var(--orange)" : "var(--border)"}`,
                  background: dev === d.clef ? "rgba(255,140,26,.14)" : "var(--bg-3)",
                  color: dev === d.clef ? "var(--orange)" : "var(--text-muted)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.icone} alt="" style={{ width: 15, height: 15 }} />{d.court}
              </button>
            ))}
            {v.dettePossible && (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: credit ? "var(--gold)" : "var(--text-muted)", cursor: "pointer" }}>
                <input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} style={{ accentColor: "var(--orange)" }} />
                à crédit
              </label>
            )}
            <button className="vg-btn" style={{ padding: "8px 14px", fontSize: 12.5, opacity: occupe ? .6 : 1 }} disabled={occupe}
              onClick={() => agir("prendre", { prix: prix || v.prixReference, devise: dev, reglement: credit ? "dette" : "comptant" })}>
              <Icon name="check" size={14} />{v.detenteur ? "Je peux aussi le fournir" : "Je m'en occupe"}
            </button>
          </>
        )}
        {jeSuisDetenteur && (
          <>
            <button style={bouton} disabled={occupe} onClick={() => agir("objet", { aObjet: !v.detenteur?.aObjet })}>
              <Icon name="package" size={13} />{v.detenteur?.aObjet ? "Je ne l'ai plus" : "J'ai bien l'objet"}
            </button>
            <button className="vg-btn" style={{ padding: "8px 14px", fontSize: 12.5, opacity: occupe ? .6 : 1 }} disabled={occupe}
              onClick={() => { if (confirm("Confirmer l'échange ? L'objet sortira de ton coffre.")) agir("vendu"); }}>
              <Icon name="check" size={14} />Échange fait
            </button>
            <button style={{ ...bouton, color: "var(--text-muted)" }} disabled={occupe} onClick={() => agir("liberer")}>
              Je me désiste
            </button>
          </>
        )}
        {estStaff && !jeSuisDetenteur && v.detenteur && (
          <button style={{ ...bouton, color: "var(--text-muted)" }} disabled={occupe} onClick={() => agir("liberer")}>
            Libérer la demande
          </button>
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
              <b>{o.membre.nom}</b>{o.prix != null ? ` — ${montant(o.prix, o.devise)}${o.reglement === "dette" ? " à crédit" : ""}` : ""}
            </span>
          ))}
        </div>
      )}

      {erreur && <div style={{ marginTop: 8, fontSize: 12, color: "var(--red)" }}>{erreur}</div>}
    </div>
  );
}
