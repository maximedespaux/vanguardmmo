"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ClassLogo } from "@/components/ClassLogo";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { CS_SLOTS, GROUP_META, GROUPS, type Slot } from "./slots";
import { useCardFx } from "@/components/VgFx";
import { classeAffichee, ecartsClasse, nbPlaces, normaliserCompo, presencesSeance, prochaineSeance, type CompoState, type Creneau, type Presence, type Seance } from "@/lib/compositions";

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
  const [popupPresence, setPopupPresence] = useState(false);
  /**
   * La séance qu'on prépare. Calculée côté client seulement : la même page
   * rendue sur le serveur puis dans le navigateur donnerait deux « dans 2 j »
   * différents, et React s'en plaindrait à chaque chargement.
   */
  const [seance, setSeance] = useState<Seance | null>(null);
  useEffect(() => {
    const maj = () => setSeance(prochaineSeance());
    maj();
    const t = setInterval(maj, 60_000); // la bascule mercredi 21 h 30 doit se faire seule
    return () => clearInterval(t);
  }, []);

  // Inscriptions + renommage des postes partagés (backend commun) + actualisation auto 15 s.
  const load = useCallback(() => {
    fetch("/api/compositions").then(r => (r.ok ? r.json() : null)).then(d => {
      if (!d) return;
      const e = normaliserCompo(d);
      setSignups(e.signups); setSlotMeta(e.slotMeta); setPresences(e.presences);
      setCharge(true);
      // Le texte des consignes n'est plus affiche ici (il aura sa page), mais on
      // le garde en memoire : chaque enregistrement renvoie l'etat ENTIER, et
      // l'oublier reviendrait a l'effacer pour tout le monde.
      setInstructions(e.instructions);
    }).catch(() => {});
  }, []);
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

  /** « Je serai la » : une bascule par personnage, sur la seance preparee. */
  const basculerPresence = (char: { name: string; class: string }) => {
    if (!seance) return;
    const creneau = seance.creneau;
    const nom = char.name.toLowerCase();
    const deja = annonces.some(p => p.pseudo.toLowerCase() === nom);
    // On efface aussi une annonce PERIMEE du meme personnage : garder les deux
    // ferait remonter l'ancienne date au prochain cycle.
    const autres = presences.filter(p => !(p.creneau === creneau && p.pseudo.toLowerCase() === nom));
    sauver({ presences: deja ? autres : [...autres, { player: meName, pseudo: char.name, classe: classeAffichee(char.class), creneau, ts: Date.now() }] });
  };
  const marquerRepondu = () => { if (seance) try { localStorage.setItem(cleReponse(seance), "1"); } catch { /* navigation privee */ } };
  /**
   * Retenir quelqu'un dans la composition du soir, ou l'en sortir.
   *
   * S'annoncer ne bloque personne — on peut etre cinq Primats a lever la main.
   * C'est ce tri, fait par le staff, qui dit qui joue : la compo est une cible
   * a atteindre, pas un plafond a l'inscription.
   */
  const basculerRetenu = (creneau: Creneau, pseudo: string) => {
    sauver({ presences: presences.map(p => (p.creneau === creneau && p.pseudo === pseudo ? { ...p, retenu: !p.retenu } : p)) });
  };
  const lbl = (s: Slot) => slotMeta[s.id]?.label || s.label;
  const nt = (s: Slot) => slotMeta[s.id]?.note ?? s.note;
  const renameSlot = (slot: Slot, label: string, note: string) => { persist(signups, { ...slotMeta, [slot.id]: { label: label || slot.label, note } }); setEditSlot(null); };
  const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const removeSignup = (id: string) => persist(signups.filter(s => s.id !== id));
  /**
   * Se poser sur un poste ET s'annoncer pour la séance, d'un seul geste.
   *
   * C'étaient deux saisies séparées pour la même information — on se mettait
   * sur un poste sans jamais dire qu'on serait là, et l'effectif restait à zéro
   * alors que douze personnes s'étaient inscrites.
   */
  const registerToSlot = (slot: Slot, char: { id: string; name: string; class: string }) => {
    // Un perso ne peut être que sur UN poste : on retire son éventuelle inscription ailleurs avant d'ajouter.
    const prochains = [...signups.filter(s => s.charId !== char.id), { id: Math.random().toString(36).slice(2), player: meName, pseudo: char.name, classe: slot.classe, slotId: slot.id, charId: char.id }];
    const nom = char.name.toLowerCase();
    const dejaLa = annonces.some(p => p.pseudo.toLowerCase() === nom);
    if (!seance || dejaLa) { persist(prochains); return; }
    sauver({
      signups: prochains,
      presences: [...presences.filter(p => !(p.creneau === seance.creneau && p.pseudo.toLowerCase() === nom)),
        { player: meName, pseudo: char.name, classe: classeAffichee(char.class), creneau: seance.creneau, ts: Date.now() }],
    });
    marquerRepondu();
  };
  /**
   * Choisir le titulaire d'un poste, c'est le retenir pour la séance.
   *
   * C'étaient deux gestes pour la même décision : l'étoile sur le poste et le
   * clic sur l'annonce. Le compteur « x/10 retenus » ne bougeait donc pas quand
   * le staff composait poste par poste.
   */
  const selectSignup = (slotId: string, id: string) => {
    const prochains = signups.map(s => (s.slotId === slotId ? { ...s, selected: s.id === id ? !s.selected : false } : s));
    if (!seance) { persist(prochains); return; }
    const concernes = signups.filter(s => s.slotId === slotId).map(s => s.pseudo.toLowerCase());
    const titulaires = new Set(prochains.filter(s => s.selected).map(s => s.pseudo.toLowerCase()));
    sauver({
      signups: prochains,
      presences: presences.map(p => (p.creneau === seance.creneau && concernes.includes(p.pseudo.toLowerCase())
        ? { ...p, retenu: titulaires.has(p.pseudo.toLowerCase()) }
        : p)),
    });
  };
  const resetAll = () => {
    if (!window.confirm("Réinitialiser toute la composition ? Toutes les inscriptions seront effacées pour tout le monde.")) return;
    sauver({ signups: [], presences: [] }, true); // effacement explicitement voulu
  };

  const selectedSlots = new Set(signups.filter(s => s.selected && s.slotId).map(s => s.slotId));
  const playersCount = new Set(signups.map(s => s.player.toLowerCase())).size;
  const byClass: Record<string, number> = {}; signups.forEach(s => { byClass[s.classe] = (byClass[s.classe] || 0) + 1; });
  const fillPct = Math.round((selectedSlots.size / CS_SLOTS.length) * 100);

  const PLACES_CS = nbPlaces(CS_SLOTS);

  /** « mercredi 12 août · 21 h » — la date, pas seulement le jour de la semaine. */
  const dateSeance = (d: Date) => `${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · 21 h`;
  /** « dans 2 j 4 h », « dans 40 min », « en cours ». */
  const delai = (d: Date) => {
    const min = Math.round((d.getTime() - Date.now()) / 60_000);
    if (min <= 0) return "en cours";
    if (min < 60) return `dans ${min} min`;
    const h = Math.floor(min / 60);
    const j = Math.floor(h / 24);
    return j > 0 ? `dans ${j} j ${h % 24} h` : `dans ${h} h`;
  };
  const cleReponse = (s: Seance) => `vg_cs_presence_${s.creneau}_${s.debut.toISOString().slice(0, 10)}`;

  const etatCourant: CompoState = { signups, slotMeta, presences, instructions };
  const annonces = seance ? presencesSeance(etatCourant, seance) : [];
  const retenus = annonces.filter(p => p.retenu);
  const ecarts = ecartsClasse(annonces);
  const manques = ecarts.filter(e => e.manque > 0);
  const surplus = ecarts.filter(e => e.enPlus > 0);
  const jySuis = annonces.some(p => p.player === meName);
  const fermerPopup = () => { marquerRepondu(); setPopupPresence(false); };

  /**
   * On pose la question une fois par séance, à qui n'y a pas déjà répondu.
   * Une case à cocher au milieu de la page se rate ; une fenêtre qui revient à
   * chaque visite s'ignore. D'où le repère local, posé aussi par « Pas cette
   * fois » : refuser EST une réponse.
   */
  const dejaDemande = useRef(false);
  useEffect(() => {
    if (!seance || !charge || dejaDemande.current) return;
    dejaDemande.current = true;
    let repondu = true;
    try { repondu = localStorage.getItem(cleReponse(seance)) === "1"; } catch { /* navigation privée : on ne harcèle pas */ }
    if (!repondu && !annonces.some(p => p.player === meName)) setPopupPresence(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seance, charge]);

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

        {/* ── La prochaine séance ───────────────────────────────────────────
            Un tableau affichait les deux créneaux en permanence : on préparait
            dimanche pendant qu'on jouait mercredi, et la question « qui est là
            ce soir ? » n'avait pas de réponse évidente. On ne prépare qu'une
            séance — la prochaine — et tout la vise : le compte, ce qui manque,
            et la question posée en arrivant. */}
        {seance && (
          <div className="fx-card" style={{ ...card, borderColor: "rgba(255,140,26,.32)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
              <h2 className="font-heading" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--orange)", textTransform: "uppercase", fontSize: 15, letterSpacing: 1, margin: 0 }}>
                <Icon name="calendar" size={17} />Prochaine séance
              </h2>
              <span className="font-heading" style={{ fontWeight: 700, fontSize: 15 }}>{dateSeance(seance.debut)}</span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{delai(seance.debut)}</span>
              <button className="vg-btn" onClick={() => setPopupPresence(true)} style={{ marginLeft: "auto", padding: "8px 15px", fontSize: 12.5 }}>
                <Icon name={jySuis ? "check" : "plus"} size={14} />{jySuis ? "Je suis annoncé·e" : "Je serai là"}
              </button>
              {isAdmin && annonces.length > 0 && (
                <button onClick={() => confirmerPresences(seance.creneau, seance.label, annonces.length)}
                  title="Crédite l'XP de présence aux membres encore listés"
                  style={{ fontSize: 11.5, fontWeight: 600, padding: "7px 12px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--gold)", background: "transparent", color: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon name="medal" size={12} />Ils étaient là
                </button>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 11.5 }}>
              <span style={{ fontWeight: 700, color: "var(--green)", background: "rgba(74,222,128,.11)", border: "1px solid rgba(74,222,128,.3)", borderRadius: 20, padding: "2px 9px" }}>
                {annonces.length} annoncé{annonces.length > 1 ? "s" : ""}
              </span>
              <span style={{ fontWeight: 700, color: retenus.length >= PLACES_CS ? "var(--green)" : "var(--gold)" }}>
                {retenus.length}/{PLACES_CS} retenus
              </span>
              {manques.length === 0
                ? <span style={{ fontWeight: 700, color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="check" size={12} />Effectif au complet</span>
                : <span style={{ color: "var(--orange)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="alert" size={12} />Manque {manques.map(m => `${m.manque} ${m.classe}`).join(", ")}</span>}
              {/* Le surplus n'est pas un problème : c'est la réserve du soir. */}
              {surplus.length > 0 && (
                <span title="Plus d'annoncés que de places sur ces classes — le staff départage" style={{ color: "var(--blue)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon name="arrow-up" size={12} />En plus : {surplus.map(m => `${m.enPlus} ${m.classe}`).join(", ")}
                </span>
              )}
              <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>
                Les annonces se font entre {seance.creneau === "mer" ? "dimanche 21 h et mercredi" : "mercredi 21 h 30 et dimanche"} 21 h.
              </span>
            </div>
          </div>
        )}

        {/* Zones de composition */}
        {GROUPS.map(g => { const meta = GROUP_META[g]; const slots = CS_SLOTS.filter(s => s.group === g); const done = slots.filter(s => selectedSlots.has(s.id)).length; return (
          <div key={g} className="fx-card" style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: `linear-gradient(90deg, ${meta.color}22, transparent)`, borderLeft: `4px solid ${meta.color}` }}>
              <Icon name={meta.icon as IconName} framed frameSize={30} tone="orange" />
              <span className="font-heading" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontSize: 15 }}>{g}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: meta.color, fontWeight: 600 }}>{done}/{slots.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(235px,1fr))", gap: 12, padding: 18 }}>
              {slots.map(slot => { const taken = signups.filter(s => s.slotId === slot.id); const hasSel = taken.some(s => s.selected); const mine = myChars.filter(c => norm(c.class) === norm(slot.classe) && !signups.some(s => s.charId === c.id)); const presentsClasse = annonces.filter(p => norm(p.classe) === norm(slot.classe) && !taken.some(t => t.pseudo.toLowerCase() === p.pseudo.toLowerCase())); return (
                <div key={slot.id} style={{ position: "relative", background: hasSel ? `${meta.color}11` : "var(--bg-3)", borderRadius: 12, padding: 14, border: `1px solid ${hasSel ? meta.color : "var(--border)"}`, transition: "all .15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--bg-2)", border: `1px solid ${hasSel ? meta.color : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ClassLogo name={slot.classe} size={32} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}><div className="font-heading" style={{ fontWeight: 600, fontSize: 14 }}>{lbl(slot)}</div><div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.3 }}>{nt(slot)}</div></div>
                    {isAdmin && <button onClick={() => setEditSlot(slot)} title="Renommer le poste (titre + desc)" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", flexShrink: 0, padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="edit" size={14} /></button>}
                    <button onClick={() => setInfo(slot)} title="Build conseillé & build de référence" style={{ background: "none", border: "none", color: meta.color, cursor: "pointer", flexShrink: 0, padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="eye" size={16} /></button>
                  </div>
                  {presentsClasse.length > 0 && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: .7, color: "var(--text-muted)", marginBottom: 5 }}>
                      Annoncés en {slot.classe}{isAdmin ? " — clique pour retenir" : ""}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {presentsClasse.map(pr => {
                        const dedans = !!pr.retenu;
                        return (
                          <span key={pr.pseudo} title={`${pr.pseudo} · annoncé par ${pr.player}${dedans ? " · retenu" : ""}`}
                            onClick={isAdmin && seance ? () => basculerRetenu(seance.creneau, pr.pseudo) : undefined}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, cursor: isAdmin ? "pointer" : "default",
                              color: dedans ? "var(--gold)" : "var(--text)", fontWeight: dedans ? 700 : 400,
                              background: dedans ? "rgba(255,210,74,.12)" : "var(--bg-2)",
                              border: `1px solid ${dedans ? "var(--gold)" : "var(--border)"}`, borderRadius: 20, padding: "2px 8px" }}>
                            {dedans && <Icon name="star" size={10} />}{pr.pseudo}
                            {(isAdmin || pr.player === meName) && (
                              <button onClick={e => { e.stopPropagation(); sauver({ presences: presences.filter(x => !(x.creneau === pr.creneau && x.pseudo === pr.pseudo)) }); }}
                                title="Retirer l'annonce" style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 0, display: "flex" }}><Icon name="x" size={10} /></button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>}
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
                      {/* Etre sur un poste ne dit pas qu'on sera la : les deux se
                          lisent maintenant sur la meme ligne. */}
                      {annonces.some(p => p.pseudo.toLowerCase() === t.pseudo.toLowerCase())
                        ? <span title="Annoncé pour la prochaine séance" style={{ color: "var(--green)", display: "inline-flex" }}><Icon name="check" size={11} /></span>
                        : <span title="Ne s'est pas encore annoncé pour la prochaine séance" style={{ color: "var(--text-muted)", fontSize: 9 }}>pas annoncé</span>}
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
        <div style={{ ...card, textAlign: "center", padding: 40 }}>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "center", color: "var(--text-muted)" }}><Icon name="sword" size={44} /></div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 20, padding: "3px 12px", marginBottom: 12 }}>
            <Icon name="clock" size={12} />En standby
          </div>
          <h2 className="font-heading" style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Guild Siege</h2>
          {/* Rien a organiser ici pour l'instant : le dire franchement vaut mieux
              qu'une page qui ressemble a une page active. */}
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
            Aucune séance n&apos;est organisée pour le moment. Quand ça reprendra, ce sera <b style={{ color: "var(--text)" }}>libre</b> : pas de composition stricte, ramène ton meilleur perso, peu importe la classe. L&apos;essentiel c&apos;est d&apos;être présent et de jouer ensemble. <Icon name="zap" size={16} style={{ display: "inline-block", verticalAlign: "-3px", color: "var(--orange)" }} />
          </p>
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

      {/* ── La question posée en arrivant ─────────────────────────────────
          Annoncer sa présence était une case à cocher au milieu d'un tableau :
          on passait devant sans la voir, et l'effectif restait vide jusqu'au
          rappel Discord de la veille. On la pose donc franchement, une fois par
          séance — et « Pas cette fois » compte comme une réponse, sinon la
          fenêtre reviendrait à chaque visite. */}
      {popupPresence && seance && (
        <div onClick={fermerPopup} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, maxWidth: 460, width: "100%" }}>
            <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 17, fontWeight: 700 }}>
              <Icon name="key" size={17} style={{ color: "var(--orange)" }} />Chambre secrète — {dateSeance(seance.debut)}
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "9px 0 4px" }}>
              Tu seras là ? Coche les personnages que tu comptes jouer {delai(seance.debut)}.
            </p>
            {manques.length > 0 && (
              <p style={{ fontSize: 12, color: "var(--orange)", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="alert" size={12} />Il manque {manques.map(m => `${m.manque} ${m.classe}`).join(", ")}
              </p>
            )}
            {myChars.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "10px 0 16px" }}>Crée un personnage dans ton profil pour annoncer ta présence.</div>
            ) : (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "10px 0 16px" }}>
                {myChars.map(ch => {
                  const on = annonces.some(p => p.pseudo.toLowerCase() === ch.name.toLowerCase());
                  return (
                    <button key={ch.id} onClick={() => { basculerPresence(ch); marquerRepondu(); }}
                      title={on ? "Retirer ma présence" : "Je serai là avec ce personnage"}
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, padding: "8px 13px", borderRadius: 20, cursor: "pointer",
                        border: `1px solid ${on ? "var(--green)" : "var(--border)"}`,
                        background: on ? "rgba(74,222,128,.13)" : "var(--bg-3)",
                        color: on ? "var(--green)" : "var(--text-muted)" }}>
                      <ClassLogo name={classeAffichee(ch.class)} size={17} />
                      {ch.name}
                      <Icon name={on ? "check" : "plus"} size={12} />
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={fermerPopup} style={{ fontSize: 12.5, padding: "9px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer" }}>
                Pas cette fois
              </button>
              <button className="vg-btn" onClick={fermerPopup}>C&apos;est noté</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
