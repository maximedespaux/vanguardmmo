"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { ClassLogo } from "@/components/ClassLogo";
import { renduPerso, type Sexe } from "@/data/charRenders";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { FichePerso, Confirmation, type Fiche } from "@/components/FichePerso";

/**
 * Mes personnages — qui je joue, et avec quoi.
 *
 * La page mêlait trois choses sans les distinguer : un formulaire de création
 * en haut, des cartes en dessous, et sur chaque carte des boutons qui
 * AJOUTAIENT ou SUPPRIMAIENT des stuffs. Or un stuff ne se crée pas ici — il se
 * monte dans l'AirBuilder, et c'est lui qui décide s'il existe. Les boutons
 * fabriquaient donc des profils vides que la page cachait ensuite, faute d'y
 * trouver la moindre pièce.
 *
 * Trois gestes désormais, et trois seulement :
 *   · LIRE ses stuffs — ce qui est monté, sans pouvoir y toucher d'ici ;
 *   · MODIFIER la fiche — nom, sexe, classe, niveau, prestige ;
 *   · DÉSIGNER le principal — avec confirmation, parce que ça déplace ce que
 *     la guilde voit de nous partout ailleurs.
 *
 * La page est ouverte à tous : déclarer ses persos ne demande pas d'être DE la
 * guilde, un candidat doit pouvoir le faire.
 */
type Gear = { id: string; name: string; mode: string };
type Char = {
  id: string; name: string; class: string; level: number; prestige: number;
  isMain: boolean; sex?: string | null; gearProfiles: Gear[];
};

const MODE_COULEUR = (m: string) => (m === "TANK" ? "var(--blue)" : m === "HYBRIDE" ? "var(--purple)" : "var(--orange)");

const carte: React.CSSProperties = {
  background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 14,
};

export default function PersonnagesPage() {
  useCardFx();
  const { status } = useSession();
  const anonyme = status === "unauthenticated" && process.env.NEXT_PUBLIC_DEV_ALL_ACCESS !== "1";

  const [chars, setChars] = useState<Char[]>([]);
  const [pret, setPret] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  /** Ce qu'on est en train d'éditer, de créer, de promouvoir ou de supprimer. */
  const [edite, setEdite] = useState<string | null>(null);
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [creation, setCreation] = useState<Fiche | null>(null);
  const [promouvoir, setPromouvoir] = useState<Char | null>(null);
  const [supprimer, setSupprimer] = useState<Char | null>(null);

  const flash = (msg: string, ok = false) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2800); };

  const charger = useCallback(async () => {
    try { const r = await fetch("/api/characters"); if (r.ok) setChars(await r.json()); } catch { /* hors ligne */ }
    setPret(true);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  /**
   * Quels stuffs sont RÉELLEMENT montés ?
   *
   * Les profils DPS / Tank / Hybride existent par défaut mais restent souvent
   * vides : afficher une pastille pour un stuff vide laisse croire qu'un build
   * existe. On lit donc l'état de l'AirBuilder — la même source que la
   * candidature — et on ne garde que ceux qui portent au moins une pièce.
   */
  const [remplis, setRemplis] = useState<Record<string, Set<string>>>({});
  useEffect(() => {
    type Stuff = { name?: string; eq?: Record<string, unknown> };
    type Blob = { chars?: { name?: string; stuffs?: Stuff[] }[] };
    const equipe = (st: Stuff) => Object.values(st?.eq ?? {}).some((e) => e && (e as { item?: unknown }).item);
    const lire = (b: Blob | null) => {
      const out: Record<string, Set<string>> = {};
      for (const pc of b?.chars ?? []) {
        if (!pc?.name) continue;
        const noms = (pc.stuffs ?? []).filter(equipe).map((st, i) => (st.name?.trim() || `Stuff ${i + 1}`).toLowerCase());
        if (noms.length) out[String(pc.name).trim().toLowerCase()] = new Set(noms);
      }
      return out;
    };
    let vivant = true;
    (async () => {
      let local: Blob | null = null;
      try { local = JSON.parse(localStorage.getItem("vg_air_e1") || "null"); } catch { /* rien en local */ }
      let distant: Blob | null = null;
      try { const r = await fetch("/api/builder-state"); if (r.ok) distant = (await r.json())?.blob ?? null; } catch { /* hors ligne */ }
      if (!vivant) return;
      // Le local prime : il reflète ce que le joueur vient de faire dans le builder.
      setRemplis({ ...lire(distant), ...lire(local) });
    })();
    return () => { vivant = false; };
  }, [chars]);

  const enregistrer = async () => {
    if (!edite || !fiche) return;
    if (!fiche.name.trim()) { flash("Donne un pseudo à ce personnage."); return; }
    setEnvoi(true);
    const r = await fetch(`/api/characters/${edite}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fiche.name.trim(), class: fiche.class, sex: fiche.sex, level: fiche.level, prestige: fiche.prestige }),
    }).catch(() => null);
    setEnvoi(false);
    if (!r?.ok) { flash("Enregistrement impossible."); return; }
    setEdite(null); setFiche(null); await charger(); flash("Fiche mise à jour.", true);
  };

  const creer = async () => {
    if (!creation) return;
    if (!creation.name.trim()) { flash("Donne un pseudo à ce personnage."); return; }
    setEnvoi(true);
    const r = await fetch("/api/characters", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: creation.name.trim(), class: creation.class, sex: creation.sex, level: creation.level, prestige: creation.prestige, isMain: chars.length === 0 }),
    }).catch(() => null);
    setEnvoi(false);
    if (!r?.ok) { flash("Création impossible."); return; }
    setCreation(null); await charger(); flash("Personnage créé.", true);
  };

  const designerPrincipal = async () => {
    if (!promouvoir) return;
    setEnvoi(true);
    const r = await fetch(`/api/characters/${promouvoir.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isMain: true }),
    }).catch(() => null);
    setEnvoi(false);
    setPromouvoir(null);
    if (!r?.ok) { flash("Changement impossible."); return; }
    await charger(); flash("Personnage principal changé.", true);
  };

  const doSupprimer = async () => {
    if (!supprimer) return;
    setEnvoi(true);
    await fetch(`/api/characters/${supprimer.id}`, { method: "DELETE" }).catch(() => null);
    setEnvoi(false); setSupprimer(null); await charger(); flash("Personnage supprimé.");
  };

  return (
    <div style={{ padding: "24px 22px 60px", maxWidth: 940, margin: "0 auto" }}>
      <PageHeader icon="users" title="Mes Personnages"
        subtitle="Tes persos et leurs stuffs — ce sont eux qu'on retrouve dans les compositions et les demandes." />

      {anonyme && (
        <div className="glass-card" style={{ padding: 18, marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ flex: "1 1 260px", fontSize: 13.5, lineHeight: 1.55 }}>
            Tes personnages sont rattachés à ton compte. <b>Connecte-toi</b> pour les déclarer — c&apos;est ce
            qui permet aux demandes de savoir à qui envoyer un objet, et à ta candidature d&apos;être complète.
          </span>
          <a href="/login" className="vg-btn" style={{ flexShrink: 0 }}>Se connecter</a>
        </div>
      )}

      {toast && (
        <div style={{ marginBottom: 14, padding: "10px 13px", borderRadius: 9, background: "var(--bg-2)", border: "1px solid var(--border)",
          color: toast.ok ? "var(--green)" : "var(--text)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          {toast.ok && <Icon name="check" size={15} />}{toast.msg}
        </div>
      )}

      {!anonyme && (
        <button onClick={() => setCreation({ name: "", class: "SPADASSIN", sex: "G", level: 200, prestige: 3 })}
          className="vg-btn" style={{ marginBottom: 16 }}>
          <Icon name="user-plus" size={16} />Nouveau personnage
        </button>
      )}

      {!pret ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 26, textAlign: "center" }}>Chargement…</div>
      ) : chars.length === 0 && !anonyme ? (
        <div className="fx-card" style={{ ...carte, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Aucun personnage déclaré. Commence par le premier — c&apos;est lui qu&apos;on retrouvera partout.
        </div>
      ) : chars.map((c) => {
        const stuffs = remplis[c.name.trim().toLowerCase()];
        const visibles = c.gearProfiles.filter((g) =>
          stuffs?.has((g.name || "").trim().toLowerCase()) || stuffs?.has((g.mode || "").trim().toLowerCase()));
        const rendu = renduPerso(c.class, (c.sex === "F" ? "F" : "G") as Sexe);
        const enEdition = edite === c.id;

        return (
          <div key={c.id} className="fx-card" style={carte}>
            {enEdition && fiche ? (
              <>
                <FichePerso valeur={fiche} onChange={setFiche} compact />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 15 }}>
                  <button onClick={() => { setEdite(null); setFiche(null); }} disabled={envoi}
                    style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                    Annuler
                  </button>
                  <button onClick={enregistrer} disabled={envoi} className="vg-btn" style={{ fontSize: 12.5 }}>
                    <Icon name="save" size={14} />{envoi ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap" }}>
                  <div style={{ width: 68, height: 94, flexShrink: 0, borderRadius: 11, overflow: "hidden", position: "relative",
                    background: "radial-gradient(circle at 50% 26%, rgba(255,140,26,.15), rgba(10,10,12,.9) 72%)",
                    border: "1px solid rgba(255,140,26,.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {rendu
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={rendu} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "bottom center" }} />
                      : <ClassLogo name={c.class} size={32} />}
                  </div>

                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <div className="font-heading" style={{ fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {c.name}
                      {c.isMain && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--gold)",
                          border: "1px solid var(--gold)", borderRadius: 6, padding: "1px 7px", textTransform: "uppercase", letterSpacing: .5 }}>
                          <Icon name="star" size={11} />principal
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <ClassLogo name={c.class} size={15} />
                      {c.class.charAt(0) + c.class.slice(1).toLowerCase()}
                      <span style={{ opacity: .5 }}>·</span>Niveau {c.level}
                      <span style={{ opacity: .5 }}>·</span>Prestige {c.prestige}
                      <span style={{ opacity: .5 }}>·</span>{c.sex === "F" ? "Fille" : "Garçon"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 7, flexShrink: 0, flexWrap: "wrap" }}>
                    {!c.isMain && (
                      <button onClick={() => setPromouvoir(c)} className="vg-touch"
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 9,
                          border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                        <Icon name="star" size={13} />En principal
                      </button>
                    )}
                    <button onClick={() => { setEdite(c.id); setFiche({ name: c.name, class: c.class, sex: (c.sex === "F" ? "F" : "G") as Sexe, level: c.level, prestige: c.prestige }); }}
                      className="vg-touch"
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 9,
                        border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                      <Icon name="edit" size={13} />Modifier
                    </button>
                    <button onClick={() => setSupprimer(c)} className="vg-touch" aria-label={`Supprimer ${c.name}`} title="Supprimer"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 9,
                        border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--red)", cursor: "pointer" }}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>

                {/* Les stuffs se LISENT ici. Ils se montent dans l'AirBuilder :
                    les ajouter d'ici fabriquait des profils vides que la page
                    masquait ensuite, faute d'y trouver la moindre pièce. */}
                <div style={{ borderTop: "1px solid var(--border)", marginTop: 14, paddingTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Stuffs montés</span>
                    {visibles.length > 0 ? (
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                        {visibles.map((g) => (
                          <Link key={g.id} href={`/builder?perso=${encodeURIComponent(c.name)}&stuff=${encodeURIComponent(g.name || g.mode)}`}
                            title={`Ouvrir « ${g.name || g.mode} » dans l'AirBuilder`}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-3)",
                              border: `1px solid ${MODE_COULEUR(g.mode)}`, borderRadius: 8, padding: "5px 11px", fontSize: 12,
                              textDecoration: "none", color: "inherit" }}>
                            <b style={{ color: MODE_COULEUR(g.mode) }}>{g.mode}</b>{g.name}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Aucun pour l&apos;instant.</span>
                    )}
                    <Link href={`/builder?perso=${encodeURIComponent(c.name)}`} className="vg-btn"
                      style={{ marginLeft: "auto", fontSize: 12, padding: "8px 14px" }}>
                      <Icon name="sword" size={14} />Monter un stuff
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* ── Les fenêtres, sur <body> : un parent en `transform` (.fx-card)
          enfermerait un `position:fixed` à l'intérieur de la carte. ── */}
      {typeof document !== "undefined" && creation && createPortal(
        <div onClick={() => !envoi && setCreation(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 18, overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto" }}>
            <h2 className="font-heading" style={{ margin: "0 0 4px", fontSize: 18, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="user-plus" size={18} style={{ color: "var(--orange)" }} />Nouveau personnage
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Choisis sa classe et son sexe : l&apos;illustration suit, c&apos;est elle qu&apos;on verra partout.
            </p>
            <FichePerso valeur={creation} onChange={setCreation} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
              <button onClick={() => setCreation(null)} disabled={envoi}
                style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                Annuler
              </button>
              <button onClick={creer} disabled={envoi} className="vg-btn">
                {envoi ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>, document.body)}

      {typeof document !== "undefined" && promouvoir && createPortal(
        <Confirmation titre="Changer de personnage principal ?" action="Le désigner" occupe={envoi}
          onOui={designerPrincipal} onNon={() => setPromouvoir(null)}
          texte={<><b style={{ color: "var(--text)" }}>{promouvoir.name}</b> deviendra ton personnage principal.
            C&apos;est lui qui te représente partout — compositions, GuildViewer, demandes à la boutique —
            et il remplacera {chars.find((x) => x.isMain)?.name ?? "l'actuel"}.</>} />,
        document.body)}

      {typeof document !== "undefined" && supprimer && createPortal(
        <Confirmation titre="Supprimer ce personnage ?" action="Supprimer" danger occupe={envoi}
          onOui={doSupprimer} onNon={() => setSupprimer(null)}
          texte={<><b style={{ color: "var(--text)" }}>{supprimer.name}</b> et ses stuffs seront retirés de ton compte.
            Action définitive.</>} />,
        document.body)}
    </div>
  );
}
