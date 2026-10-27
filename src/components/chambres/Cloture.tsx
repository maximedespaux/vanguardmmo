"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ClassLogo } from "@/components/ClassLogo";
import { Icon } from "@/components/Icon";
import { VgSelect } from "@/components/VgSelect";
import { seancesRecentesGS, seancesRecentesParis, type ChiffreFige, type CreneauGS } from "@/lib/evenements";
import { ChiffreDeclare } from "@/components/chambres/ChiffreDeclare";

/**
 * « ILS ÉTAIENT LÀ » — la clôture d'une séance (spec §4.8 ; lot 2).
 *
 * Tous les participants sont cochés : le staff décoche les absents, ajoute au besoin un annoncé
 * non retenu venu quand même, et valide. La séance visée est la DERNIÈRE COMMENCÉE
 * (`cs_derniere`) — le jeudi matin, c'est encore le mercredi —, avec un sélecteur pour en viser
 * une autre. Une séance déjà clôturée se rouvre, ou se clôture de nouveau : les lignes sont
 * alors remplacées, jamais doublées.
 *
 * La fenêtre passe par un portail (createPortal) : les cartes de la page s'inclinent au survol
 * (`useCardFx`), et un `position: fixed` s'y caserait sur la carte au lieu de l'écran.
 *
 * LE GUILD SIEGE (lot 9) : une clé initiale en `gs_` ouvre la clôture du siège — ses ANNONCÉS
 * (sans poste ni « retenu »), ses séances récentes d'après ses créneaux, la même route 9.
 */

type P = { pseudo: string; classe: string; player: string; poste: string | null; enLigne: string; chiffres: ChiffreFige[]; sansCompte: boolean; retenu: boolean };
type Vue = {
  cle: string; label: string; commencee: boolean; annulee: boolean; motif: string | null;
  cloturee: boolean; clotureAt: number | null; cloturePar: string | null;
  source: "retenus" | "annonces"; participants: P[]; autres: P[]; exclus: number; degats: boolean;
  constat: { pseudo: string; present: boolean | null }[];
};

export function Cloture({ initiale, onFermer, onFaite, onEcrite }: {
  /** La séance à viser d'abord (le débrief d'une séance de l'onglet Bilans) ; sinon la dernière. */
  initiale?: string; onFermer: () => void; onFaite: (cle: string) => void;
  /** Une clôture (ou une réouverture) vient d'être ENREGISTRÉE : le débrief ouvert derrière la
   *  modale se relit — sinon il dirait encore « pas encore clôturée », sans les joueurs. */
  onEcrite?: (cle: string) => void;
}) {
  const gs = !!initiale?.startsWith("gs");
  // Les créneaux du siège, pour son sélecteur (le paramétrage que lisent les membres).
  const [creneaux, setCreneaux] = useState<CreneauGS[]>([]);
  useEffect(() => {
    if (!gs) return;
    fetch("/api/evenements/lecture?evenement=gs").then((r) => (r.ok ? r.json() : null)).then((j) => setCreneaux(Array.isArray(j?.creneaux) ? j.creneaux : [])).catch(() => {});
  }, [gs]);
  const recentes = useMemo(() => (gs ? seancesRecentesGS(new Date(), creneaux, 8) : seancesRecentesParis(new Date(), 8)), [gs, creneaux]);
  const derniere = gs ? "gs_derniere" : "cs_derniere";
  const [cle, setCle] = useState(() => {
    if (gs) return initiale && initiale !== "gs_derniere" ? initiale : "gs_derniere";
    const i = initiale ? recentes.findIndex((s) => s.cle === initiale) : -1;
    return i > 0 ? recentes[i].cle : "cs_derniere";
  });
  const [vue, setVue] = useState<Vue | null>(null);
  const [erreur, setErreur] = useState("");
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [ajoutes, setAjoutes] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [fait, setFait] = useState<{ cle: string; message: string } | null>(null);
  const [monte, setMonte] = useState(false);
  useEffect(() => { setMonte(true); }, []);

  const charger = async (c: string) => {
    setVue(null); setErreur(""); setFait(null);
    const r = await fetch(`/api/seances/${encodeURIComponent(c)}`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) { setErreur(j.error ?? "La séance n'a pas pu être lue."); return; }
    const v = j as Vue;
    setVue(v);
    // Déjà clôturée : on repart du constat ; sinon, tout le monde est coché.
    const constat = new Map(v.constat.map((l) => [l.pseudo.toLowerCase(), l.present]));
    setCoches(new Set(v.participants.filter((p) => (v.cloturee ? constat.get(p.pseudo.toLowerCase()) !== false : true)).map((p) => p.pseudo)));
    setAjoutes(new Set(v.cloturee ? v.autres.filter((p) => constat.get(p.pseudo.toLowerCase()) === true).map((p) => p.pseudo) : []));
  };
  useEffect(() => { charger(cle); }, [cle]);

  const basculer = (set: Set<string>, maj: (s: Set<string>) => void, nom: string) => {
    const s = new Set(set); if (s.has(nom)) s.delete(nom); else s.add(nom); maj(s);
  };

  const valider = async (rouvrir = false) => {
    if (!vue) return;
    setBusy(true); setErreur("");
    const r = await fetch(`/api/seances/${encodeURIComponent(vue.cle)}/cloture`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rouvrir ? { rouvrir: true } : { presents: [...coches], ajoutes: [...ajoutes] }),
    }).catch(() => null);
    setBusy(false);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) { setErreur(j.error ?? "La clôture a été refusée."); return; }
    onEcrite?.(vue.cle);
    if (rouvrir) { await charger(vue.cle); return; }
    setFait({ cle: vue.cle, message: j.message ?? "Clôture enregistrée." });
  };

  const presents = coches.size + ajoutes.size;
  const absents = vue ? vue.participants.length - coches.size : 0;
  const options = recentes.map((s, i) => ({ value: i === 0 ? derniere : s.cle, label: `${gs ? "Guild Siege — " : ""}${s.label}${i === 0 ? " — la dernière" : ""}` }));
  // Une séance visée par sa clé, hors de la liste (le siège sans créneau relu) : elle reste lisible.
  if (vue && !options.some((o) => o.value === cle)) options.unshift({ value: cle, label: `${gs ? "Guild Siege — " : ""}${vue.label}` });

  const ligneP = (p: P, coche: boolean, onClick: () => void) => (
    <label key={p.pseudo} className={`gn-cloture-p${coche ? " coche" : ""}`}>
      <input type="checkbox" checked={coche} onChange={onClick} />
      <ClassLogo name={p.classe} size={20} />
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: "1 1 140px" }}>
        <span className="gn-cloture-nom">{p.pseudo}</span>
        <span className="gn-cloture-info">{p.player}{p.poste ? ` · ${p.poste}` : gs ? "" : " · sans poste"}{p.sansCompte ? " · aucun compte ne porte ce perso" : ""}</span>
      </span>
      {p.enLigne
        ? <span className="gn-cloture-chiffre"><ChiffreDeclare enLigne={p.enLigne} chiffres={p.chiffres ?? []} /></span>
        : vue?.degats && <span className="gn-cloture-chiffre" style={{ color: "var(--text-muted)", fontWeight: 400 }}>sans mesure</span>}
    </label>
  );

  if (!monte) return null;
  return createPortal(
    <div onClick={onFermer} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="gn-cloture" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Clôturer la séance">
        <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 17, fontWeight: 700 }}>
          <Icon name="medal" size={17} style={{ color: "var(--gn-accent)" }} />Ils étaient là
          <button type="button" onClick={onFermer} aria-label="Fermer" style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, display: "flex" }}><Icon name="x" size={18} /></button>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "8px 0 12px", lineHeight: 1.55 }}>
          {gs ? "Guild Siege : décoche les annoncés qui ne sont pas venus, puis valide :" : "Décoche les absents, puis valide :"} chacun retrouve ses participations dans l&apos;onglet Bilans. Une nouvelle clôture remplace la précédente.
        </p>
        <VgSelect full value={cle} onChange={setCle} options={options} />

        {erreur && <div className="gn-param-erreurs" style={{ paddingLeft: 14, margin: "12px 0 0" }}>{erreur}</div>}
        {!vue && !erreur && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 14 }}>Chargement…</div>}

        {fait ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontSize: 14, fontWeight: 600 }}><Icon name="check" size={16} />{fait.message}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 16 }}>
              <button type="button" onClick={onFermer} style={{ fontSize: 12.5, padding: "9px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer" }}>Fermer</button>
              <button type="button" className="vg-btn" onClick={() => onFaite(fait.cle)}>Faire le débrief maintenant</button>
            </div>
          </div>
        ) : vue && (
          <>
            {vue.annulee && <div className="gn-panne" style={{ marginTop: 12 }}><Icon name="ban" size={14} style={{ flexShrink: 0 }} />Séance annulée{vue.motif ? ` — ${vue.motif}` : ""} : rétablis-la avant de la clôturer.</div>}
            {vue.cloturee && (
              <div className="gn-panne" style={{ marginTop: 12, flexWrap: "wrap" }}>
                <Icon name="check" size={14} style={{ flexShrink: 0 }} />
                Clôturée{vue.clotureAt ? ` le ${new Date(vue.clotureAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}{vue.cloturePar ? ` par ${vue.cloturePar}` : ""}.
                <button type="button" disabled={busy} onClick={() => valider(true)} style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8, border: "1px solid var(--gn-accent)", background: "transparent", color: "var(--gn-accent)", cursor: "pointer" }}>Rouvrir</button>
              </div>
            )}
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: .7, color: "var(--text-muted)", marginTop: 14 }}>
              {gs ? "Les annoncés du Guild Siege" : vue.source === "retenus" ? "Les retenus du staff" : "Personne n'a été retenu : ce sont les annoncés"} ({vue.participants.length})
            </div>
            {vue.participants.length === 0
              ? <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Personne ne s&apos;est annoncé pour cette séance.</div>
              : <div className="gn-cloture-liste">{vue.participants.map((p) => ligneP(p, coches.has(p.pseudo), () => basculer(coches, setCoches, p.pseudo)))}</div>}
            {vue.autres.length > 0 && (<>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: .7, color: "var(--text-muted)", marginTop: 6 }}>Annoncés non retenus — venus quand même ?</div>
              <div className="gn-cloture-liste">{vue.autres.map((p) => ligneP(p, ajoutes.has(p.pseudo), () => basculer(ajoutes, setAjoutes, p.pseudo)))}</div>
            </>)}
            {vue.exclus > 0 && (
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                {vue.exclus} annonce{vue.exclus > 1 ? "s" : ""} d&apos;un compte hors de la guilde, inactif ou caché n&apos;apparai{vue.exclus > 1 ? "ssent" : "t"} pas.
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", marginTop: 16 }}>
              <span style={{ fontSize: 12.5, color: "var(--text-muted)", marginRight: "auto" }}>{presents} présent{presents > 1 ? "s" : ""}{absents > 0 ? ` · ${absents} absent${absents > 1 ? "s" : ""}` : ""}</span>
              <button type="button" onClick={onFermer} style={{ fontSize: 12.5, padding: "9px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer" }}>Annuler</button>
              <button type="button" className="vg-btn" disabled={busy || vue.annulee || !vue.commencee || (vue.participants.length + vue.autres.length === 0)}
                onClick={() => valider()} style={{ opacity: busy || vue.annulee || !vue.commencee ? 0.6 : 1 }}>
                {busy ? "Enregistrement…" : vue.cloturee ? "Clôturer de nouveau" : "Valider la clôture"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
