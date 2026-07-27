"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ClassLogo } from "@/components/ClassLogo";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { CS_SLOTS, GROUP_META, GROUPS, type Slot } from "./slots";
import { useCardFx } from "@/components/VgFx";
import { CRENEAUX, classeAffichee, classesManquantes, normaliserCompo, type CompoState, type Creneau, type Presence } from "@/lib/compositions";

import type { Signup } from "@/lib/compositions";
const ADMIN_ROLES = ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER"];

export default function CompositionsPage() {
  // Halo curseur + relief sur les cartes de poste (.fx-card), cf. VgFx.
  useCardFx();
  const { data: session } = useSession();
  const su = session?.user as { discordName?: string; username?: string; name?: string; role?: string } | undefined;
  const meName = su?.discordName ?? su?.username ?? session?.user?.name ?? "Moi";
  const isAdmin = (su?.role ? ADMIN_ROLES.includes(su.role) : false) || process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";
  const [tab, setTab] = useState<"cs" | "gvg">("cs");
  const [signups, setSignups] = useState<Signup[]>([]);
  const [myChars, setMyChars] = useState<{ id: string; name: string; class: string }[]>([]);
  const [info, setInfo] = useState<Slot | null>(null);
  const [slotMeta, setSlotMeta] = useState<Record<string, { label?: string; note?: string }>>({});
  const [editSlot, setEditSlot] = useState<Slot | null>(null);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [instructions, setInstructions] = useState("");
  const [editInstr, setEditInstr] = useState<string | null>(null);
  /**
   * Vrai une fois la composition partagée lue au moins une fois.
   * L'état est un blob remplacé EN BLOC : écrire avant de l'avoir lu revient à
   * publier un état vide. Un joueur qui s'inscrivait pendant le chargement
   * effaçait ainsi les inscriptions de tous les autres.
   */
  const [charge, setCharge] = useState(false);
  /**
   * Personnage qui vient d'être inscrit sur un poste. Ouvre la demande de
   * disponibilité : s'inscrire sur un poste et annoncer sa présence étaient deux
   * saisies séparées pour la même information, donc l'une des deux restait vide.
   */
  const [dispoChoix, setDispoChoix] = useState<Creneau[] | null>(null);
  const [aprsInscription, setAprsInscription] = useState<{ slot: Slot; char: { id: string; name: string; class: string } } | null>(null);

  // Inscriptions + renommage des postes partagés (backend commun) + actualisation auto 15 s.
  const load = useCallback(() => {
    fetch("/api/compositions").then(r => (r.ok ? r.json() : null)).then(d => {
      if (!d) return;
      const e = normaliserCompo(d);
      setSignups(e.signups); setSlotMeta(e.slotMeta); setPresences(e.presences);
      setCharge(true);
      // On n'ecrase pas le texte pendant qu'un membre du staff le redige.
      setInstructions(prev => (editInstr === null ? e.instructions : prev));
    }).catch(() => {});
  }, [editInstr]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  useEffect(() => { fetch("/api/characters").then(r => (r.ok ? r.json() : [])).then(setMyChars).catch(() => {}); }, []);

  /**
   * Envoie TOUJOURS l'etat complet. L'API normalise ce qu'elle recoit : un PUT
   * partiel effacerait donc les champs absents (les presences, les consignes).
   */
  const sauver = (patch: Partial<CompoState>, force = false) => {
    if (!charge) return; // rien n'a encore été lu : écrire écraserait tout
    const etat: CompoState & { force?: boolean } = { signups, slotMeta, presences, instructions, ...patch };
    // L'API refuse un effacement massif sans ce drapeau : seul le bouton
    // « Réinitialiser » a le droit de vider la composition de tout le monde.
    if (force) etat.force = true;
    if (patch.signups) setSignups(patch.signups);
    if (patch.slotMeta) setSlotMeta(patch.slotMeta);
    if (patch.presences) setPresences(patch.presences);
    if (patch.instructions !== undefined) setInstructions(patch.instructions);
    fetch("/api/compositions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(etat) })
      .then(r => { if (!r.ok) load(); })  // refus cote serveur : on reprend l'etat reel plutot que de garder un affichage faux
      .catch(() => {});
  };
  const persist = (next: Signup[], meta: Record<string, { label?: string; note?: string }> = slotMeta) => sauver({ signups: next, slotMeta: meta });

  /** Le staff atteste de la venue : c'est ce constat, et lui seul, qui donne l'XP. */
  const confirmerPresences = async (creneau: Creneau, label: string, combien: number) => {
    if (!window.confirm(`Confirmer que les ${combien} membre(s) encore listés étaient présents (${label}) ?\nRetire d'abord les absents avec la croix.`)) return;
    const r = await fetch("/api/compositions/presences", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creneau }),
    });
    const j = await r.json().catch(() => ({}));
    window.alert(r.ok ? `${j.credites ?? 0} membre(s) crédités.` : (j.error ?? "Confirmation refusée."));
  };

  /** « Je serai la » : une bascule par personnage et par creneau. */
  const basculerPresence = (creneau: Creneau, char: { name: string; class: string }) => {
    const deja = presences.some(p => p.creneau === creneau && p.pseudo.toLowerCase() === char.name.toLowerCase());
    sauver({ presences: deja
      ? presences.filter(p => !(p.creneau === creneau && p.pseudo.toLowerCase() === char.name.toLowerCase()))
      : [...presences, { player: meName, pseudo: char.name, classe: classeAffichee(char.class), creneau, ts: Date.now() }] });
  };
  const lbl = (s: Slot) => slotMeta[s.id]?.label || s.label;
  const nt = (s: Slot) => slotMeta[s.id]?.note ?? s.note;
  const renameSlot = (slot: Slot, label: string, note: string) => { persist(signups, { ...slotMeta, [slot.id]: { label: label || slot.label, note } }); setEditSlot(null); };
  const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const removeSignup = (id: string) => persist(signups.filter(s => s.id !== id));
  const registerToSlot = (slot: Slot, char: { id: string; name: string; class: string }) => {
    // Un perso ne peut être que sur UN poste : on retire son éventuelle inscription ailleurs avant d'ajouter.
    persist([...signups.filter(s => s.charId !== char.id), { id: Math.random().toString(36).slice(2), player: meName, pseudo: char.name, classe: slot.classe, slotId: slot.id, charId: char.id }]);
    setAprsInscription({ slot, char });
  };

  /** Enregistre les créneaux annoncés pour ce personnage, en une écriture. */
  const enregistrerDispos = (char: { name: string; class: string }, creneaux: Creneau[]) => {
    const nom = char.name.toLowerCase();
    const autres = presences.filter(p => p.pseudo.toLowerCase() !== nom);
    sauver({ presences: [...autres, ...creneaux.map(c => ({ player: meName, pseudo: char.name, classe: classeAffichee(char.class), creneau: c, ts: Date.now() }))] });
  };
  const selectSignup = (slotId: string, id: string) => persist(signups.map(s => s.slotId === slotId ? { ...s, selected: s.id === id ? !s.selected : false } : s));
  const resetAll = () => {
    if (!window.confirm("Réinitialiser toute la composition ? Toutes les inscriptions seront effacées pour tout le monde.")) return;
    sauver({ signups: [], presences: [] }, true); // effacement explicitement voulu
  };

  const selectedSlots = new Set(signups.filter(s => s.selected && s.slotId).map(s => s.slotId));
  const playersCount = new Set(signups.map(s => s.player.toLowerCase())).size;
  const byClass: Record<string, number> = {}; signups.forEach(s => { byClass[s.classe] = (byClass[s.classe] || 0) + 1; });
  const fillPct = Math.round((selectedSlots.size / CS_SLOTS.length) * 100);

  const etatCourant: CompoState = { signups, slotMeta, presences, instructions };

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-chambres.webp" icon="puzzle" title="Compositions" subtitle="La composition optimale des Chambres Secrètes (à respecter pour la cohésion) et le Guild Siege (libre)." />
      <div className="vg-subtabs">
        <button onClick={() => setTab("cs")} className={`vg-subtab ${tab === "cs" ? "active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="key" size={15} /> Chambre Secrète</button>
        <button onClick={() => setTab("gvg")} className={`vg-subtab ${tab === "gvg" ? "active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="sword" size={15} /> Guild Siege</button>
      </div>

      <div key={tab} className="vg-swap">
      {tab === "cs" ? (<>
        {/* Bandeau de progression */}
        <div style={{ ...card, background: "linear-gradient(135deg, rgba(255,140,26,0.08), rgba(199,125,255,0.05))", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 84, height: 84 }}>
            <svg width="84" height="84" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="42" cy="42" r="36" fill="none" stroke="var(--bg-3)" strokeWidth="8" />
              <circle cx="42" cy="42" r="36" fill="none" stroke="var(--orange)" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={`${2 * Math.PI * 36 * (1 - fillPct / 100)}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><span className="font-heading" style={{ fontWeight: 700, fontSize: 20, color: "var(--orange)" }}>{fillPct}%</span></div>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 22 }}>{selectedSlots.size}<span style={{ color: "var(--text-muted)", fontSize: 14 }}>/{CS_SLOTS.length}</span></div><div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Postes validés</div></div>
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 22, color: "var(--blue)" }}>{playersCount}</div><div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Joueurs</div></div>
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 22, color: "var(--purple)" }}>{signups.length}</div><div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Candidatures</div></div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 6px var(--green)" }} /> Partagé · live</span>
            {isAdmin && <button onClick={resetAll} style={{ fontSize: 11.5, padding: "7px 13px", borderRadius: 8, border: "1px solid var(--red)", background: "transparent", color: "var(--red)", cursor: "pointer", fontWeight: 600 }}>↺ Réinitialiser</button>}
          </div>
        </div>

        {/* Tant que la composition partagée n'est pas lue, aucune action n'est
            enregistrée (voir `charge`). On le dit, plutôt que de laisser croire
            qu'un clic a été pris en compte. */}
        {!charge && (
          <div style={{ ...card, display: "flex", alignItems: "center", gap: 10, borderColor: "rgba(255,140,26,.35)", background: "rgba(255,140,26,.06)" }}>
            <Icon name="clock" size={16} style={{ color: "var(--orange)" }} />
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Chargement de la composition partagée… les inscriptions et présences sont en lecture seule le temps de la récupérer.</span>
          </div>
        )}

        {/* ── Presences ────────────────────────────────────────────────────
            « Je serai la » par creneau. C'est cette liste que le rappel Discord
            lit pour annoncer « il manque un Templier » : une bascule par
            personnage, pour connaitre la classe et pas seulement le nombre. */}
        <div className="fx-card" style={card}>
          <h2 className="font-heading" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--orange)", textTransform: "uppercase", fontSize: 15, letterSpacing: 1, marginBottom: 4 }}>
            <Icon name="check" size={17} />Présences
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
            Annonce tes personnages présents. Le rappel Discord de la veille annonce ce qu&apos;il manque.
          </p>

          {CRENEAUX.map(cr => {
            const liste = presences.filter(p => p.creneau === cr.id);
            const manques = classesManquantes(etatCourant, cr.id);
            return (
              <div key={cr.id} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  <span className="font-heading" style={{ fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: .6 }}>{cr.label}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--green)", background: "rgba(74,222,128,.11)", border: "1px solid rgba(74,222,128,.3)", borderRadius: 20, padding: "2px 9px" }}>
                    {liste.length} présent{liste.length > 1 ? "s" : ""}
                  </span>
                  {manques.length === 0
                    ? <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="check" size={12} />Effectif au complet</span>
                    : <span style={{ fontSize: 11.5, color: "var(--orange)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="alert" size={12} />Manque {manques.map(m => `${m.manque} ${m.classe}`).join(", ")}</span>}

                  {/* Confirmation APRÈS coup : « je serai là » est une annonce, pas
                      une venue. Le staff retire d'abord les absents avec la croix,
                      puis valide ce qui reste — c'est ce qui rend l'XP méritée. */}
                  {isAdmin && liste.length > 0 && (
                    <button onClick={() => confirmerPresences(cr.id, cr.label, liste.length)}
                      title="Crédite l'XP de présence aux membres encore listés"
                      style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, padding: "5px 11px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--gold)", background: "transparent", color: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Icon name="medal" size={12} />Ils étaient là
                    </button>
                  )}
                </div>

                {myChars.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Crée un personnage pour annoncer ta présence.</div>
                ) : (
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {myChars.map(ch => {
                      const on = liste.some(p => p.pseudo.toLowerCase() === ch.name.toLowerCase());
                      return (
                        <button key={ch.id} onClick={() => basculerPresence(cr.id, ch)}
                          title={on ? "Retirer ma présence" : "Je serai là avec ce personnage"}
                          style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                            border: `1px solid ${on ? "var(--green)" : "var(--border)"}`,
                            background: on ? "rgba(74,222,128,.13)" : "var(--bg-2)",
                            color: on ? "var(--green)" : "var(--text-muted)" }}>
                          <ClassLogo name={classeAffichee(ch.class)} size={16} />
                          {ch.name}
                          <Icon name={on ? "check" : "plus"} size={12} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {liste.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    {liste.map(pr => (
                      <span key={`${pr.creneau}|${pr.pseudo}`} title={`${pr.pseudo} · ${pr.classe} — annoncé par ${pr.player}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text)", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 20, padding: "3px 9px" }}>
                        <ClassLogo name={pr.classe} size={13} />{pr.pseudo}
                        {(isAdmin || pr.player === meName) && (
                          <button onClick={() => sauver({ presences: presences.filter(x => !(x.creneau === pr.creneau && x.pseudo === pr.pseudo)) })}
                            title="Retirer" style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 0, display: "flex" }}><Icon name="x" size={11} /></button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Consignes ────────────────────────────────────────────────────
            Redigees par le staff, lues par tout le monde. Maxime voulait une
            page d'instructions : elle est ici, a cote des postes qu'elle
            explique, plutot que sur une page separee qu'il faudrait aller
            chercher. */}
        <div className="fx-card" style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <h2 className="font-heading" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--orange)", textTransform: "uppercase", fontSize: 15, letterSpacing: 1, margin: 0 }}>
              <Icon name="book" size={17} />Consignes
            </h2>
            {isAdmin && editInstr === null && (
              <button onClick={() => setEditInstr(instructions)} style={{ marginLeft: "auto", fontSize: 11.5, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", cursor: "pointer", fontWeight: 600 }}>
                {instructions ? "Modifier" : "Rédiger"}
              </button>
            )}
          </div>

          {editInstr !== null ? (
            <>
              <textarea value={editInstr} onChange={e => setEditInstr(e.target.value.slice(0, 4000))} rows={10}
                placeholder="Déroulé de la Chambre Secrète, rôle de chaque poste, points de rendez-vous…"
                style={{ width: "100%", boxSizing: "border-box", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, color: "var(--text)", fontFamily: "inherit", fontSize: 13.5, lineHeight: 1.6, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", marginTop: 10 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: "auto" }}>{editInstr.length}/4000</span>
                <button onClick={() => setEditInstr(null)} style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer" }}>Annuler</button>
                <button className="vg-btn" onClick={() => { sauver({ instructions: editInstr }); setEditInstr(null); }}>Enregistrer</button>
              </div>
            </>
          ) : instructions ? (
            <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text)", whiteSpace: "pre-wrap" }}>{instructions}</div>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
              Aucune consigne pour l&apos;instant{isAdmin ? " — clique sur « Rédiger »." : ". Le staff les publiera ici."}
            </div>
          )}
        </div>

        {/* Zones de composition */}
        {GROUPS.map(g => { const meta = GROUP_META[g]; const slots = CS_SLOTS.filter(s => s.group === g); const done = slots.filter(s => selectedSlots.has(s.id)).length; return (
          <div key={g} className="fx-card" style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: `linear-gradient(90deg, ${meta.color}22, transparent)`, borderLeft: `4px solid ${meta.color}` }}>
              <Icon name={meta.icon as IconName} framed frameSize={30} tone="orange" />
              <span className="font-heading" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontSize: 15 }}>{g}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: meta.color, fontWeight: 600 }}>{done}/{slots.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(235px,1fr))", gap: 12, padding: 18 }}>
              {slots.map(slot => { const taken = signups.filter(s => s.slotId === slot.id); const hasSel = taken.some(s => s.selected); const mine = myChars.filter(c => norm(c.class) === norm(slot.classe) && !signups.some(s => s.charId === c.id)); return (
                <div key={slot.id} style={{ position: "relative", background: hasSel ? `${meta.color}11` : "var(--bg-3)", borderRadius: 12, padding: 14, border: `1px solid ${hasSel ? meta.color : "var(--border)"}`, transition: "all .15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--bg-2)", border: `1px solid ${hasSel ? meta.color : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ClassLogo name={slot.classe} size={32} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}><div className="font-heading" style={{ fontWeight: 600, fontSize: 14 }}>{lbl(slot)}</div><div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.3 }}>{nt(slot)}</div></div>
                    {isAdmin && <button onClick={() => setEditSlot(slot)} title="Renommer le poste (titre + desc)" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", flexShrink: 0, padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="edit" size={14} /></button>}
                    <button onClick={() => setInfo(slot)} title="Build conseillé & build de référence" style={{ background: "none", border: "none", color: meta.color, cursor: "pointer", flexShrink: 0, padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="eye" size={16} /></button>
                  </div>
                  {taken.length > 0 && <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid var(--border)`, display: "flex", flexDirection: "column", gap: 5 }}>
                    {taken.map(t => <div key={t.id} style={{ fontSize: 11.5, color: t.selected ? meta.color : "var(--text)", display: "flex", alignItems: "center", gap: 5, fontWeight: t.selected ? 700 : 400 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.selected ? meta.color : "var(--text-muted)", flexShrink: 0 }} />
                      {t.selected && <span title="Sélectionné" style={{ color: meta.color, display: "inline-flex", alignItems: "center" }}><Icon name="check" size={12} /></span>}
                      {isAdmin ? (
                        <a href={`/builder/${encodeURIComponent(t.player)}`} title={`Voir le build de ${t.player} (lecture seule)`} style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "baseline", gap: 4, overflow: "hidden", minWidth: 0 }}>
                          <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: "1px dotted currentColor" }}>{t.pseudo}</b>
                          <span style={{ color: "var(--text-muted)", fontSize: 10 }}>· {t.player}</span>
                        </a>
                      ) : (
                        <><b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.pseudo}</b> <span style={{ color: "var(--text-muted)", fontSize: 10 }}>· {t.player}</span></>
                      )}
                      <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                        {isAdmin && <button onClick={() => selectSignup(slot.id, t.id)} title={t.selected ? "Désélectionner" : "Sélectionner ce candidat"} style={{ background: "none", border: "none", color: t.selected ? "var(--orange)" : "var(--text-muted)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="star" size={14} /></button>}
                        {(isAdmin || t.player === meName) && <button onClick={() => removeSignup(t.id)} title="Retirer" style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={13} /></button>}
                      </span>
                    </div>)}
                  </div>}
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
                    {mine.length === 0
                      ? <div style={{ fontSize: 10.5, color: "var(--text-muted)", textAlign: "center" }}>{taken.some(s => s.charId && myChars.some(c => c.id === s.charId)) ? "Inscrit·e" : `Aucun perso ${slot.classe} dispo`}</div>
                      : <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>{mine.map(c => <button key={c.id} onClick={() => registerToSlot(slot, c)} style={{ fontSize: 10.5, padding: "4px 9px", borderRadius: 6, border: `1px solid ${meta.color}`, background: "transparent", color: meta.color, cursor: "pointer" }}>+ {c.name}</button>)}</div>}
                  </div>
                </div>
              ); })}
            </div>
          </div>
        ); })}

        <div style={card}>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Clique <b style={{ color: "var(--orange)" }}>« + ton perso »</b> sur un poste de ta classe pour te porter candidat·e — <b>plusieurs personnes peuvent candidater au même poste</b>. Un responsable sélectionne ensuite le titulaire (<Icon name="star" size={13} style={{ display: "inline-block", verticalAlign: "-2px", color: "var(--orange)" }} />). Le <Icon name="eye" size={14} style={{ display: "inline-block", verticalAlign: "-3px" }} /> donne le build conseillé + le build de référence.</div>
          {signups.length > 0 && (<>
            <div className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", fontSize: 13, margin: "14px 0 8px" }}>Classes engagées</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{Object.entries(byClass).map(([c, n]) => <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--bg-3)", borderRadius: 7, padding: "4px 9px", fontSize: 12 }}><ClassLogo name={c} size={20} /> ×{n}</span>)}</div>
          </>)}
        </div>
      </>) : (
        <div style={{ ...card, textAlign: "center", padding: 40, background: "radial-gradient(circle at 50% 30%, rgba(255,140,26,0.08), transparent 70%)" }}>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "center", color: "var(--orange)" }}><Icon name="sword" size={44} /></div>
          <h2 className="font-heading" style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Guild Siege — Libre</h2>
          <p style={{ color: "var(--text)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>Tout le monde peut participer, il n&apos;y a pas de composition stricte. On s&apos;adapte : ramène ton meilleur perso, peu importe la classe. L&apos;essentiel c&apos;est d&apos;être présent et de jouer ensemble. <Icon name="zap" size={16} style={{ display: "inline-block", verticalAlign: "-3px", color: "var(--orange)" }} /></p>
        </div>
      )}
      </div>

      {/* Bulle d'info : build conseillé + accès au build de référence */}
      {info && <div onClick={() => setInfo(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, maxWidth: 460, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <ClassLogo name={info.classe} size={34} />
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 17 }}>{lbl(info)}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{info.classe} · build conseillé</div></div>
            <button onClick={() => setInfo(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={18} /></button>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text)", whiteSpace: "pre-line" }}>{info.build || "Build conseillé à venir."}</div>
          <div style={{ marginTop: 16 }}>
            <a href={`/compositions/build/${info.id}`} style={{ fontSize: 13, fontWeight: 600, padding: "9px 16px", borderRadius: 8, border: "1px solid var(--orange)", background: "var(--orange)", color: "#0a0a0c", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="eye" size={14} /> Voir le build de référence ↗</a>
          </div>
        </div>
      </div>}

      {/* Renommer un poste (admin) */}
      {editSlot && <div onClick={() => setEditSlot(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div key={editSlot.id} onClick={e => e.stopPropagation()} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, maxWidth: 440, width: "100%" }}>
          <div className="font-heading" style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><Icon name="edit" size={16} /> Renommer le poste</div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Titre du poste</label>
          <input id="es-label" defaultValue={lbl(editSlot)} style={{ width: "100%", margin: "6px 0 12px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)" }} />
          <label style={{ fontSize: 12, fontWeight: 600 }}>Description</label>
          <textarea id="es-note" defaultValue={nt(editSlot)} rows={2} style={{ width: "100%", margin: "6px 0 14px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", resize: "vertical", fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setEditSlot(null)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer" }}>Annuler</button>
            <button onClick={() => { const l = (document.getElementById("es-label") as HTMLInputElement | null)?.value.trim() ?? ""; const n = (document.getElementById("es-note") as HTMLTextAreaElement | null)?.value.trim() ?? ""; renameSlot(editSlot, l, n); }} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--orange)", color: "#0a0a0c", fontWeight: 700, cursor: "pointer" }}>Enregistrer</button>
          </div>
        </div>
      </div>}

      {/* Après une inscription : on demande les créneaux, puis on propose d'en
          inscrire un autre. Les deux gestes que Maxime enchaîne en pratique.
          Les créneaux déjà annoncés pour ce personnage sont pré-cochés — on
          corrige, on ne ressaisit pas. */}
      {aprsInscription && (() => {
        const ch = aprsInscription.char;
        const nom = ch.name.toLowerCase();
        const dejaLa = CRENEAUX.filter(c => presences.some(p => p.creneau === c.id && p.pseudo.toLowerCase() === nom)).map(c => c.id);
        const choix = dispoChoix ?? dejaLa;
        const fermer = () => { setDispoChoix(null); setAprsInscription(null); };
        const valider = (encore: boolean) => { enregistrerDispos(ch, choix); setDispoChoix(null); setAprsInscription(null); if (!encore) return; };
        return (
          <div onClick={fermer} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, maxWidth: 440, width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <ClassLogo name={classeAffichee(ch.class)} size={26} />
                <div>
                  <div className="font-heading" style={{ fontWeight: 700, fontSize: 16 }}>{ch.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>inscrit sur {lbl(aprsInscription.slot)}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "10px 0 9px" }}>
                Tu seras là quand ? Coche les deux si tu es disponible mercredi <b>et</b> dimanche.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {CRENEAUX.map(cr => {
                  const on = choix.includes(cr.id);
                  return (
                    <button key={cr.id} onClick={() => setDispoChoix(on ? choix.filter(x => x !== cr.id) : [...choix, cr.id])}
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, padding: "9px 15px", borderRadius: 10, cursor: "pointer",
                        border: `1px solid ${on ? "var(--green)" : "var(--border)"}`,
                        background: on ? "rgba(74,222,128,.13)" : "var(--bg-3)",
                        color: on ? "var(--green)" : "var(--text-muted)" }}>
                      <Icon name={on ? "check" : "plus"} size={13} />{cr.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button onClick={fermer} style={{ fontSize: 12.5, padding: "9px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer" }}>
                  Plus tard
                </button>
                {/* « Un autre personnage » enregistre AUSSI les créneaux : sinon
                    enchaîner les inscriptions perdrait ce qu'on vient de cocher. */}
                <button onClick={() => valider(true)} style={{ fontSize: 12.5, fontWeight: 600, padding: "9px 14px", borderRadius: 9, border: "1px solid var(--orange)", background: "transparent", color: "var(--orange)", cursor: "pointer" }}>
                  Enregistrer et en inscrire un autre
                </button>
                <button className="vg-btn" onClick={() => valider(false)}>Terminé</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
