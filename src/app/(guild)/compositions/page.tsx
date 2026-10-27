"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ClassLogo } from "@/components/ClassLogo";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { GROUP_META, GROUPS, type RolesCS, type Slot } from "./slots";
import { useCardFx } from "@/components/VgFx";
import { StrategieCS } from "@/components/StrategieCS";
import { AdversairesChambres, AlerteVies } from "@/components/chambres/Adversaires";
import { classeAffichee, ecartsClasse, nbPlaces, normaliserCompo, presencesSeance, prochaineSeance, type CompoState, type Creneau, type Presence, type Seance } from "@/lib/compositions";
import { chiffresDuPoste, enLigne, rolesDuPoste, survol, type Chiffre } from "@/lib/recensement";
import type { RoleMesure } from "@/lib/mesures";
import Link from "next/link";
import { ADMIN_ROLES } from "@/config/roles";
import { PARAMETRES_CS_DEFAUT, cleDeSeance, libellePoste, postesEffectifs, type Poste } from "@/lib/evenements";
import { Cloture } from "@/components/chambres/Cloture";
import { Bilans } from "@/components/chambres/Bilans";
import { LignePanneau, type EtatDiscord } from "@/components/chambres/PanneauDiscord";
import { Repartition } from "@/components/chambres/Repartition";
import { Chrono } from "@/components/chambres/Chrono";
import { GuildSiege } from "@/components/chambres/GuildSiege";

import type { Signup } from "@/lib/compositions";

/** Les onglets (spec §7.1), lus dans l'adresse (`?onglet=`) : un message du bot ou un lien de
 *  Discord mène ainsi au bon endroit (le récap et 📍 Mes positions mènent à `?onglet=repartition`,
 *  le chrono à `?onglet=chrono`). Les anciens noms (« cs », « strat ») restent compris. */
type Onglet = "inscription" | "repartition" | "chrono" | "bilans" | "strategie" | "gvg";
const ONGLETS: Record<string, Onglet> = { inscription: "inscription", cs: "inscription", repartition: "repartition", chrono: "chrono", bilans: "bilans", strategie: "strategie", strat: "strategie", gvg: "gvg" };

export default function CompositionsPage() {
  // Halo curseur + relief sur les cartes de poste (.fx-card), cf. VgFx.
  useCardFx();
  const { data: session } = useSession();
  const su = session?.user as { discordName?: string; username?: string; name?: string; role?: string } | undefined;
  const meName = su?.discordName ?? su?.username ?? session?.user?.name ?? "Moi";
  // La liste des rangs vient de la config (spec §7.1) : la copie en dur qui vivait ici aurait
  // dérivé au premier rang ajouté.
  const isAdmin = (su?.role ? (ADMIN_ROLES as readonly string[]).includes(su.role) : false) || process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";
  const [tab, setTabEtat] = useState<Onglet>("inscription");
  const [seanceBilan, setSeanceBilan] = useState<string | null>(null);
  /** `&video={id}` : le lien d'une vidéo dans le débrief Discord (M7) ouvre son lecteur (lot 8). */
  const [videoBilan, setVideoBilan] = useState<string | null>(null);
  useEffect(() => {
    // Lue après le montage : le rendu serveur ne connaît pas l'adresse complète d'un composant client.
    const q = new URLSearchParams(window.location.search);
    const o = ONGLETS[q.get("onglet") ?? ""];
    if (o) setTabEtat(o);
    setSeanceBilan(q.get("seance"));
    setVideoBilan(q.get("video"));
    // `/chambre cloturer` (Discord) mène ici avec `?cloture=1` (la dernière séance commencée) ou
    // `?cloture=<clé>` (la séance ouverte dans Discord) : la clôture s'ouvre d'elle-même pour le
    // staff, une fois la session connue.
    const c = q.get("cloture");
    if (c === "1") clotureDemandee.current = true;
    // Une Chambre, ou un Guild Siege (lot 9 : « gs_derniere », ou la clé d'une séance du siège).
    else if (c && /^(cs_\d{4}-\d{2}-\d{2}_(mer|dim)|gs_derniere|gs_\d{4}-\d{2}-\d{2}_[a-z]{3}\d{4})$/.test(c)) clotureDemandee.current = c;
  }, []);
  const setTab = (o: Onglet) => {
    setTabEtat(o);
    const q = new URLSearchParams(window.location.search);
    q.set("onglet", o);
    if (o !== "bilans") { q.delete("seance"); q.delete("video"); }
    window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
  };
  /** « Ils étaient là » : la clôture de la dernière séance commencée (Cloture.tsx) — ou, depuis
   *  le débrief d'une séance (Bilans), de celle-là. */
  const [cloture, setCloture] = useState<boolean | string>(false);
  /** Après une clôture, le débrief s'ouvre directement sur son parcours (§4.8 : « Faire le
   *  débrief maintenant ? »). */
  const [parcoursBilan, setParcoursBilan] = useState(false);
  const clotureDemandee = useRef<boolean | string>(false);
  useEffect(() => {
    if (!isAdmin || !clotureDemandee.current) return;
    const c = clotureDemandee.current;
    clotureDemandee.current = false;
    setCloture(c);
  }, [isAdmin]);
  const [nBilans, setNBilans] = useState(0);
  /**
   * LES POSTES ET L'AFFICHAGE DES DÉGÂTS, TELS QUE LES BRAS DROITS LES ONT RÉGLÉS (paramétrage,
   * /discord/evenements) : titre, classe, rôle à chaque phase, chiffre montré, et s'il compte
   * dans les 10 places. Avant la réponse, les valeurs du code — les mêmes que la route rend
   * quand personne n'a rien changé.
   */
  const [postes, setPostes] = useState<Poste[]>(() => postesEffectifs(PARAMETRES_CS_DEFAUT));
  const [degatsCompo, setDegatsCompo] = useState(true);
  useEffect(() => {
    fetch("/api/evenements/lecture?evenement=cs").then(r => (r.ok ? r.json() : null)).then(j => {
      if (Array.isArray(j?.postes)) setPostes(j.postes);
      if (j?.degats) setDegatsCompo(j.degats.composition !== false);
    }).catch(() => {});
  }, []);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [myChars, setMyChars] = useState<{ id: string; name: string; class: string }[]>([]);
  const [info, setInfo] = useState<Slot | null>(null);
  const [slotMeta, setSlotMeta] = useState<Record<string, { label?: string; note?: string }>>({});
  const [editSlot, setEditSlot] = useState<Slot | null>(null);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [instructions, setInstructions] = useState("");
  /**
   * Écart au build de référence, calculé par /api/compositions/comparatif.
   * Indexé par id d'inscription. La page ne lit qu'un entier par inscrit : le
   * calcul (deux blobs de build à comparer par personne) est fait côté serveur.
   */
  const [ecartsRef, setEcartsRef] = useState<Record<string, { score: number; sansBuild?: boolean; parMode?: Record<string, { score: number; completude: number; manques: string[] }> }>>({});
  const [refsDispo, setRefsDispo] = useState<Record<string, { dispo: boolean; sansStats: boolean }>>({});
  /**
   * Les chiffres DÉCLARÉS dans l'AirBuilder (le recensement), par pseudo en minuscules
   * puis par rôle — lus par le même appel que les écarts. Le poste choisit lequel montrer
   * (slots.ts, `cs`) : des PV sur un poste de tank, des dégâts sinon.
   */
  const [mesures, setMesures] = useState<Record<string, Partial<Record<RoleMesure, Chiffre>>>>({});
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

  /**
   * L'instant de la dernière lecture de la composition (spec §5.4, lot 3), renvoyé avec chaque
   * enregistrement : ce qui a été posé depuis — un « Je viens » cliqué sur Discord, l'annonce
   * d'un autre membre — n'est plus effacé par l'état que cette page a lu jusqu'à 15 s plus tôt.
   */
  const luRef = useRef<number | null>(null);
  // Inscriptions + renommage des postes partagés (backend commun) + actualisation auto 15 s.
  const load = useCallback(() => {
    fetch("/api/compositions").then(r => (r.ok ? r.json() : null)).then(d => {
      if (!d) return;
      luRef.current = typeof d.lu === "number" ? d.lu : null;
      const e = normaliserCompo(d);
      setSignups(e.signups); setSlotMeta(e.slotMeta); setPresences(e.presences);
      // Les écarts se lisent après la composition et n'en bloquent pas l'affichage :
      // un comparatif indisponible ne doit pas empêcher de s'inscrire.
      fetch("/api/compositions/comparatif").then(r => (r.ok ? r.json() : null)).then(c => {
        if (!c) return;
        setEcartsRef(c.scores ?? {}); setRefsDispo(c.references ?? {}); setMesures(c.mesures ?? {});
      }).catch(() => {});
      setCharge(true);
      // Le texte des anciennes consignes n'est plus edite ici, mais il reste
      // renvoye a chaque enregistrement : l'etat part EN ENTIER, l'oublier
      // reviendrait a l'effacer pour tout le monde. La page Strategie le
      // propose comme point de depart tant qu'il n'a pas ete repris.
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
    fetch("/api/compositions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...etat, lu: luRef.current }) })
      // Relu après CHAQUE écriture, pas seulement après un refus : le serveur a pu y remettre ce
      // qu'un autre venait de poser (correctif `lu`), et la lecture suivante doit le connaître.
      .then(() => load())
      .catch(() => {});
  };
  const persist = (next: Signup[], meta: Record<string, { label?: string; note?: string }> = slotMeta) => sauver({ signups: next, slotMeta: meta });

  /* « Le staff atteste de la venue » passait par POST /api/compositions/presences, qui comptait
     les annonces du créneau SANS RIEN ÉCRIRE (piège n° 6 de la spec). La clôture la remplace :
     elle vise la dernière séance commencée et enregistre qui y était (Cloture.tsx). */

  /** L'état de la séance préparée côté serveur : annulée ou non, et — pour le staff — son
   *  panneau Discord (route 4, sans la créer). */
  const [etatSeance, setEtatSeance] = useState<{ annulee: boolean; motif: string | null; discord: EtatDiscord | null } | null>(null);
  const lireEtatSeance = useCallback((s: Seance) => {
    fetch(`/api/seances/${cleDeSeance(s)}`).then(r => (r.ok ? r.json() : null))
      .then(j => setEtatSeance(j ? { annulee: !!j.annulee, motif: j.motif ?? null, discord: j.discord ?? null } : null)).catch(() => {});
  }, []);
  /** « Republier » (route 11) : le bot publie un nouveau panneau, sans mention, et ferme
   *  l'ancien. La demande part dans sa file : on relit l'état quelques fois pour voir le verdict. */
  const [publication, setPublication] = useState<string | null>(null);
  const republier = async () => {
    if (!seance) return;
    setPublication("Demande envoyée au bot…");
    const r = await fetch(`/api/seances/${cleDeSeance(seance)}/discord`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoi: "panneau" }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) { setPublication(null); window.alert(j.error ?? "Le serveur a refusé."); return; }
    lireEtatSeance(seance);
    for (const ms of [4000, 9000, 15000, 25000]) setTimeout(() => lireEtatSeance(seance), ms);
    setTimeout(() => setPublication(null), 26000);
  };
  const cleSeance = seance ? cleDeSeance(seance) : null;
  useEffect(() => { if (seance) lireEtatSeance(seance); }, [cleSeance]); // eslint-disable-line react-hooks/exhaustive-deps
  const annulerSeance = async (annulee: boolean) => {
    if (!seance) return;
    let motif = "";
    if (annulee) {
      const m = window.prompt(`Annuler la séance du ${dateSeance(seance.debut)} ?\nUn motif pour les membres (facultatif, 200 signes) :`, "");
      if (m === null) return;
      motif = m.trim();
    } else if (!window.confirm("Rétablir cette séance ?")) return;
    const r = await fetch(`/api/seances/${cleDeSeance(seance)}/annuler`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ annulee, motif }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) window.alert(j.error ?? "Le serveur a refusé.");
    lireEtatSeance(seance);
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
  // Le titre fixé par le paramétrage l'emporte ; sinon celui renommé ici, sinon celui du code.
  const lbl = (s: Slot) => libellePoste(s as Poste, slotMeta);
  /** Les chiffres d'un pseudo pour CE poste ; vide = « sans mesure ». */
  const chiffresPour = (pseudo: string, slot: Slot) => chiffresDuPoste(mesures[pseudo.toLowerCase()] ?? {}, rolesDuPoste(slot));
  const estAMoi = (pseudo: string) => myChars.some(c => c.name.toLowerCase() === pseudo.toLowerCase());
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
    // Datée (`ts`) : c'est ce qui la protège, sur le serveur, d'un enregistrement plus ancien
    // envoyé par un autre membre (correctif `lu`, spec §5.3).
    const prochains = [...signups.filter(s => s.charId !== char.id), { id: Math.random().toString(36).slice(2), player: meName, pseudo: char.name, classe: slot.classe, slotId: slot.id, charId: char.id, ts: Date.now() }];
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
  const fillPct = Math.round((selectedSlots.size / postes.length) * 100);

  const PLACES_CS = nbPlaces(postes);

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
  const ecarts = ecartsClasse(annonces, postes);
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
    // Arrivé par l'onglet Guild Siege (lot 9 : « Je viens » libre, son propre geste), la question
    // de la Chambre attendrait mal son tour : elle se pose si l'on passe sur une autre page.
    if (!seance || !charge || dejaDemande.current || tab === "gvg") return;
    dejaDemande.current = true;
    let repondu = true;
    try { repondu = localStorage.getItem(cleReponse(seance)) === "1"; } catch { /* navigation privée : on ne harcèle pas */ }
    if (!repondu && !annonces.some(p => p.player === meName)) setPopupPresence(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seance, charge, tab]);

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      {/* « Chambres Secrètes » et non « Compositions ». La bannière affichée juste
          au-dessus DIT « Chambres Secrètes » — elle a toujours porté ce nom, avec sa
          clé — pendant que le titre et le menu disaient « Compositions ». L'image
          annonçait donc une page, le menu une autre.
          Le titre compte même sous une bannière : c'est lui qui devient le h1 pour
          les moteurs et les lecteurs d'écran, et il contredisait l'image. */}
      <PageHeader banner="/assets/site/banners/banner-chambres.webp" icon="puzzle" title="Chambres Secrètes" subtitle="Qui vient, à quel poste, qui tient quoi à chaque phase, le chrono en direct — et comment on joue chaque salle. Le Guild Siege reste libre." />
      {/* « Inscription » est l'ancien onglet « Chambre Secrète » : il ne fait plus que ça.
          « Bilans » réunit les séances passées (spec §7.1). « Paramétrer » mène les bras droits
          au paramétrage des événements, rubrique Outils. */}
      <div className="vg-subtabs gn-cs-onglets">
        <button onClick={() => setTab("inscription")} className={`vg-subtab ${tab === "inscription" ? "active" : ""}`}><Icon name="key" size={15} />Inscription</button>
        <button onClick={() => setTab("repartition")} className={`vg-subtab ${tab === "repartition" ? "active" : ""}`}><Icon name="grid" size={15} />Répartition</button>
        <button onClick={() => setTab("chrono")} className={`vg-subtab ${tab === "chrono" ? "active" : ""}`}><Icon name="clock" size={15} />Chrono</button>
        <button onClick={() => setTab("bilans")} className={`vg-subtab ${tab === "bilans" ? "active" : ""}`}><Icon name="trophy" size={15} />Bilans</button>
        <button onClick={() => setTab("strategie")} className={`vg-subtab ${tab === "strategie" ? "active" : ""}`}><Icon name="book" size={15} />Stratégie</button>
        <button onClick={() => setTab("gvg")} className={`vg-subtab ${tab === "gvg" ? "active" : ""}`}><Icon name="sword" size={15} />Guild Siege</button>
        {isAdmin && <Link href="/discord/evenements" className="vg-subtab gn-cs-parametrer" title="Étapes, monstres, postes, textes et rappels"><Icon name="settings" size={15} />Paramétrer</Link>}
      </div>

      {/* LA MISE EN GARDE EST HORS DES ONGLETS, ET C'EST LE POINT.
          « Une barre à zéro ne veut pas dire mort » vivait dans le bloc des
          adversaires, donc dans l'onglet Stratégie ; la page ouvre sur Chambre
          Secrète, et celui qui vient s'inscrire pour ce soir ne la voyait jamais.
          Elle est ici : une ligne, les deux nombres comptés sur le relevé, et un
          bouton qui mène au tableau des PV à sortir. Posée après les onglets pour
          qu'elle ne s'insère pas entre le titre et la navigation de la page.
          Elle parle des Chambres : l'onglet Guild Siege ne la montre pas. */}
      {tab !== "gvg" && <AlerteVies onVoir={() => setTab("strategie")} />}

      <div key={tab} className="vg-swap">
      {tab === "inscription" ? (<>
        {/* Bandeau de progression */}
        <div style={{ ...card, background: "linear-gradient(135deg, rgba(var(--gn-lueur-rgb),0.08), rgba(199,125,255,0.05))", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 84, height: 84 }}>
            <svg width="84" height="84" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="42" cy="42" r="36" fill="none" stroke="var(--bg-3)" strokeWidth="8" />
              <circle cx="42" cy="42" r="36" fill="none" stroke="var(--gn-accent)" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={`${2 * Math.PI * 36 * (1 - fillPct / 100)}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><span className="font-heading" style={{ fontWeight: 700, fontSize: 20, color: "var(--gn-accent)" }}>{fillPct}%</span></div>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 22 }}>{selectedSlots.size}<span style={{ color: "var(--text-muted)", fontSize: 14 }}>/{postes.length}</span></div><div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>Postes validés</div></div>
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 22, color: "var(--blue)" }}>{playersCount}</div><div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>Joueurs</div></div>
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 22, color: "var(--purple)" }}>{signups.length}</div><div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>Candidatures</div></div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 6px var(--green)" }} /> Partagé · live</span>
            {isAdmin && <button onClick={resetAll} style={{ fontSize: 11.5, padding: "7px 13px", borderRadius: 8, border: "1px solid var(--red)", background: "transparent", color: "var(--red)", cursor: "pointer", fontWeight: 600 }}>↺ Réinitialiser</button>}
          </div>
        </div>

        {/* Tant que la composition partagée n'est pas lue, aucune action n'est
            enregistrée (voir `charge`). On le dit, plutôt que de laisser croire
            qu'un clic a été pris en compte. */}
        {!charge && (
          <div style={{ ...card, display: "flex", alignItems: "center", gap: 10, borderColor: "rgba(var(--gn-or-rgb),.35)", background: "rgba(var(--gn-lueur-rgb),.06)" }}>
            <Icon name="clock" size={16} style={{ color: "var(--gn-accent)" }} />
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
          <div className="fx-card" style={{ ...card, borderColor: "rgba(var(--gn-or-rgb),.32)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
              <h2 className="font-heading" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--gn-accent)", textTransform: "uppercase", fontSize: 15, letterSpacing: 1, margin: 0 }}>
                <Icon name="calendar" size={17} />Prochaine séance
              </h2>
              <span className="font-heading" style={{ fontWeight: 700, fontSize: 15 }}>{dateSeance(seance.debut)}</span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{delai(seance.debut)}</span>
              <button className="vg-btn" onClick={() => setPopupPresence(true)} style={{ marginLeft: "auto", padding: "8px 15px", fontSize: 12.5 }}>
                <Icon name={jySuis ? "check" : "plus"} size={14} />{jySuis ? "Je suis annoncé·e" : "Je serai là"}
              </button>
              {/* La clôture vise la DERNIÈRE séance commencée, pas celle qu'on prépare : le
                  bouton est donc là même quand personne ne s'est encore annoncé ici. */}
              {isAdmin && (
                <button onClick={() => setCloture(true)}
                  title="Clôturer la dernière séance : qui était vraiment là"
                  style={{ fontSize: 11.5, fontWeight: 600, padding: "7px 12px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--gold)", background: "transparent", color: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon name="medal" size={12} />Ils étaient là
                </button>
              )}
              {isAdmin && etatSeance && (
                <button onClick={() => annulerSeance(!etatSeance.annulee)}
                  title={etatSeance.annulee ? "Rétablir cette séance" : "Le jeu est indisponible ce soir-là : annuler la séance"}
                  style={{ fontSize: 11.5, fontWeight: 600, padding: "7px 12px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon name={etatSeance.annulee ? "rotate-ccw" : "ban"} size={12} />{etatSeance.annulee ? "Rétablir" : "Annuler"}
                </button>
              )}
            </div>
            {/* ANNULÉE (route 10) : on le dit en tête, avec le motif. Le bot la lit (lot 3) : plus
                aucun rappel pour elle, et son panneau Discord passe en « annulée ». */}
            {etatSeance?.annulee && (
              <div className="gn-panne" style={{ marginBottom: 10, flexWrap: "wrap" }}>
                <Icon name="ban" size={14} style={{ flexShrink: 0 }} />
                <b>Séance annulée</b>{etatSeance.motif ? ` — ${etatSeance.motif}` : ""}
                {isAdmin && <span style={{ color: "var(--text-muted)" }}>· Le bot n&apos;envoie plus aucun rappel pour elle.</span>}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 11.5 }}>
              <span style={{ fontWeight: 700, color: "var(--green)", background: "rgba(74,222,128,.11)", border: "1px solid rgba(74,222,128,.3)", borderRadius: 20, padding: "2px 9px" }}>
                {annonces.length} annoncé{annonces.length > 1 ? "s" : ""}
              </span>
              <span style={{ fontWeight: 700, color: retenus.length >= PLACES_CS ? "var(--green)" : "var(--gold)" }}>
                {retenus.length}/{PLACES_CS} retenus
              </span>
              {manques.length === 0
                ? <span style={{ fontWeight: 700, color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="check" size={12} />Effectif au complet</span>
                : <span style={{ color: "var(--gn-accent)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="alert" size={12} />Manque {manques.map(m => `${m.manque} ${m.classe}`).join(", ")}</span>}
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
            {/* LE PANNEAU DISCORD, pour le staff (spec §7.2), au pied de la carte : où il en est, et « Republier ». */}
            {isAdmin && etatSeance?.discord && <LignePanneau d={etatSeance.discord} annulee={etatSeance.annulee} enCours={publication} onPublier={republier} />}
          </div>
        )}

        {/* Zones de composition */}
        {GROUPS.map(g => { const meta = GROUP_META[g]; const slots = postes.filter(s => s.group === g); const done = slots.filter(s => selectedSlots.has(s.id)).length; return (
          <div key={g} className="fx-card" style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: `linear-gradient(90deg, ${meta.color}22, transparent)`, borderLeft: `4px solid ${meta.color}` }}>
              <Icon name={meta.icon as IconName} framed frameSize={30} tone="orange" />
              <span className="font-heading" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontSize: 15 }}>{g}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: meta.color, fontWeight: 600 }}>{done}/{slots.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(235px,1fr))", gap: 12, padding: 18 }}>
              {slots.map(slot => { const taken = signups.filter(s => s.slotId === slot.id)
                    // Le mieux optimisé remonte tout seul : c'est ce qui permet à
                    // l'officier de choisir sans comparer de tête. Un inscrit sans
                    // écart connu reste à sa place plutôt que de passer pour mauvais.
                    .slice().sort((a, b) => (ecartsRef[b.id]?.score ?? -1) - (ecartsRef[a.id]?.score ?? -1));
                  const hasSel = taken.some(s => s.selected); const mine = myChars.filter(c => norm(c.class) === norm(slot.classe) && !signups.some(s => s.charId === c.id)); const presentsClasse = annonces.filter(p => norm(p.classe) === norm(slot.classe) && !taken.some(t => t.pseudo.toLowerCase() === p.pseudo.toLowerCase())); return (
                <div key={slot.id} style={{ position: "relative", background: hasSel ? `${meta.color}11` : "var(--bg-3)", borderRadius: 12, padding: 14, border: `1px solid ${hasSel ? meta.color : "var(--border)"}`, transition: "all .15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--bg-2)", border: `1px solid ${hasSel ? meta.color : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ClassLogo name={slot.classe} size={32} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}><div className="font-heading" style={{ fontWeight: 600, fontSize: 14 }}>{lbl(slot)}</div><div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.3 }}>{nt(slot)}</div></div>
                    {isAdmin && <button onClick={() => setEditSlot(slot)} title="Renommer le poste (titre + desc)" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", flexShrink: 0, padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="edit" size={14} /></button>}
                    <button onClick={() => setInfo(slot)} title="Build conseillé & build de référence" style={{ background: "none", border: "none", color: meta.color, cursor: "pointer", flexShrink: 0, padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="eye" size={16} /></button>
                  </div>
                  {presentsClasse.length > 0 && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: .7, color: "var(--text-muted)", marginBottom: 5 }}>
                      Annoncés en {slot.classe}{isAdmin ? " — clique pour retenir" : ""}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {presentsClasse.map(pr => {
                        const dedans = !!pr.retenu;
                        return (
                          <span key={pr.pseudo} title={[`${pr.pseudo} · annoncé par ${pr.player}${dedans ? " · retenu" : ""}`, ...(degatsCompo ? chiffresPour(pr.pseudo, slot).map(survol) : [])].join("\n")}
                            onClick={isAdmin && seance ? () => basculerRetenu(seance.creneau, pr.pseudo) : undefined}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, cursor: isAdmin ? "pointer" : "default",
                              color: dedans ? "var(--gold)" : "var(--text)", fontWeight: dedans ? 700 : 400,
                              background: dedans ? "rgba(255,210,74,.12)" : "var(--bg-2)",
                              border: `1px solid ${dedans ? "var(--gold)" : "var(--border)"}`, borderRadius: 20, padding: "2px 8px" }}>
                            {dedans && <Icon name="star" size={10} />}{pr.pseudo}
                            {degatsCompo && <ChiffresPoste chiffres={chiffresPour(pr.pseudo, slot)} cs={rolesDuPoste(slot)} moi={estAMoi(pr.pseudo)} compact />}
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
                      {/* Le nom, et sous lui son chiffre pour CE poste : une ligne de plus
                          plutôt qu'une pastille de plus, la rangée porte déjà l'écart, l'annonce
                          et les gestes du staff. */}
                      <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: "1 1 auto" }}>
                        {isAdmin ? (
                          <a href={`/builder/${encodeURIComponent(t.player)}`} title={`Voir le build de ${t.player} (lecture seule)`} style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "baseline", gap: 4, overflow: "hidden", minWidth: 0 }}>
                            <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: "1px dotted currentColor" }}>{t.pseudo}</b>
                            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>· {t.player}</span>
                          </a>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, overflow: "hidden", minWidth: 0 }}><b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.pseudo}</b> <span style={{ color: "var(--text-muted)", fontSize: 11 }}>· {t.player}</span></span>
                        )}
                        {degatsCompo && <ChiffresPoste chiffres={chiffresPour(t.pseudo, slot)} cs={rolesDuPoste(slot)} moi={estAMoi(t.pseudo)} />}
                      </span>
                      {(() => {
                        const ec = ecartsRef[t.id];
                        // Trois états distincts, à ne pas confondre : pas de référence pour
                        // le poste, pas de build chez le membre, ou un écart mesuré.
                        if (!refsDispo[slot.id]?.dispo) return null;
                        if (!ec || ec.sansBuild) return <span title="Aucun build enregistré dans le builder" style={{ marginLeft: "auto", flexShrink: 0, fontSize: 9.5, color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 99, padding: "1px 7px" }}>sans build</span>;
                        const c = ec.score >= 90 ? "var(--green)" : ec.score >= 70 ? "var(--gold)" : "var(--red)";
                        const detail = Object.entries(ec.parMode ?? {}).map(([m, v]) => `${m} ${v.score}% (complet ${v.completude}%${v.manques.length ? ` · à combler : ${v.manques.join(", ")}` : ""})`).join("\n");
                        return <span title={`Écart au build de référence du poste\n${detail}`} style={{ marginLeft: "auto", flexShrink: 0, fontSize: 9.5, fontWeight: 700, color: c, background: `color-mix(in srgb, ${c} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 45%, transparent)`, borderRadius: 99, padding: "1px 7px", fontVariantNumeric: "tabular-nums" }}>{ec.score}%</span>;
                      })()}
                      {/* Etre sur un poste ne dit pas qu'on sera la : les deux se
                          lisent maintenant sur la meme ligne. */}
                      {annonces.some(p => p.pseudo.toLowerCase() === t.pseudo.toLowerCase())
                        ? <span title="Annoncé pour la prochaine séance" style={{ color: "var(--green)", display: "inline-flex" }}><Icon name="check" size={11} /></span>
                        : <span title="Ne s'est pas encore annoncé pour la prochaine séance" style={{ color: "var(--text-muted)", fontSize: 11, whiteSpace: "nowrap" }}>pas annoncé</span>}
                      <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                        {isAdmin && <button onClick={() => selectSignup(slot.id, t.id)} title={t.selected ? "Désélectionner" : "Sélectionner ce candidat"} style={{ background: "none", border: "none", color: t.selected ? "var(--gn-accent)" : "var(--text-muted)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="star" size={14} /></button>}
                        {(isAdmin || t.player === meName) && <button onClick={() => removeSignup(t.id)} title="Retirer" style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={13} /></button>}
                      </span>
                    </div>)}
                  </div>}
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
                    {mine.length === 0
                      ? <div style={{ fontSize: 11.5, color: "var(--text-muted)", textAlign: "center" }}>{taken.some(s => s.charId && myChars.some(c => c.id === s.charId)) ? "Inscrit·e" : `Aucun perso ${slot.classe} dispo`}</div>
                      : <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>{mine.map(c => <button key={c.id} onClick={() => registerToSlot(slot, c)} style={{ fontSize: 11.5, padding: "4px 9px", borderRadius: 6, border: `1px solid ${meta.color}`, background: "transparent", color: meta.color, cursor: "pointer" }}>+ {c.name}</button>)}</div>}
                  </div>
                </div>
              ); })}
            </div>
          </div>
        ); })}

        <div style={card}>
          {/* ┌──── LE MODE D'EMPLOI EST DEVENU UNE LÉGENDE ────┐
                 C'était un paragraphe de quarante mots qui décrivait en phrases
                 trois boutons présents à l'écran, deux centimètres plus haut :
                 « clique + ton perso… un responsable sélectionne ensuite… le œil
                 donne… ». Une légende met le VRAI contrôle en regard de ce qu'il
                 fait — on reconnaît le signe au lieu de lire sa description, et la
                 seule chose qui ne se voit pas (plusieurs candidats par poste)
                 tient en quatre mots. */}
          <dl className="cs-legende">
            <dt><span className="cs-lg-btn">+ ton perso</span></dt>
            <dd>se porter candidat·e — plusieurs par poste</dd>
            <dt><Icon name="star" size={14} style={{ color: "var(--gn-accent)" }} /></dt>
            <dd>le titulaire, choisi par un responsable</dd>
            <dt><Icon name="eye" size={14} /></dt>
            <dd>le build conseillé, et celui de référence</dd>
          </dl>
          {signups.length > 0 && (<>
            <div className="font-heading" style={{ color: "var(--gn-accent)", textTransform: "uppercase", fontSize: 13, margin: "14px 0 8px" }}>Classes engagées</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{Object.entries(byClass).map(([c, n]) => <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--bg-3)", borderRadius: 7, padding: "4px 9px", fontSize: 12 }}><ClassLogo name={c} size={20} /> ×{n}</span>)}</div>
          </>)}
        </div>
      </>
      ) : tab === "repartition" ? (
        /* Les salles des Asuras, les équipes des Jumeaux, les golems, l'araignée et le récap
           tel qu'il partira (§7.3, lot 4). Sur ses propres routes : il n'appelle jamais
           `sauver()`, qui renvoie toute la composition (§5.2). */
        <Repartition isAdmin={isAdmin} onInscription={() => setTab("inscription")} onCloturer={() => setCloture(true)} />
      ) : tab === "chrono" ? (
        /* Le chrono en direct (§4.9, §7.4, lot 5) : le staff valide chaque étape, ici ou dans
           Discord ; tout le monde voit le temps défiler et les monstres de l'étape en cours. Sur
           ses propres routes, comme la Répartition. */
        <Chrono isAdmin={isAdmin} />
      ) : tab === "bilans" ? (
        <Bilans isAdmin={isAdmin} seanceOuverte={seanceBilan} videoOuverte={videoBilan} parcours={parcoursBilan} onCloturer={(c) => setCloture(c ?? true)} rafraichir={nBilans} />
      ) : tab === "strategie" ? (
        /* Le déroulé et les placements, à côté de la composition qu'ils
           expliquent — mais pas dans la même page : on vient ici pour lire,
           on allait là-bas pour s'inscrire, et les deux se gênaient.

           DEUX BLOCS, ET C'EST VOULU. `AdversairesChambres` vient AVANT parce qu'il
           dit CONTRE QUOI on joue, lu dans les fichiers du client : personne ne
           saisira à la main les points de vie de trente-sept adversaires, et s'il le
           faisait ils seraient périmés à la prochaine fouille. `StrategieCS` reste
           l'éditeur du staff : le déroulé, les placements, ce qui ne se déduit
           d'aucun fichier. Les chiffres se lisent, les tactiques s'écrivent. */
        <>
          <AdversairesChambres />
          <StrategieCS isAdmin={isAdmin} texteExistant={instructions} />
        </>
      ) : (
        /* Le Guild Siege (lot 9, §11.3) : « En standby » tant que le staff ne l'allume pas
           (décision 2) ; allumé, « Je viens » libre, qui vient, la clôture et les derniers
           sièges. Sur ses propres routes, comme la Répartition. */
        <GuildSiege isAdmin={isAdmin} rafraichir={nBilans}
          onCloturer={(c) => setCloture(c)}
          onVoirBilan={(c) => { setSeanceBilan(c); setParcoursBilan(false); setTab("bilans"); }} />
      )}
      </div>

      {cloture && (
        <Cloture initiale={typeof cloture === "string" ? cloture : undefined} onFermer={() => setCloture(false)}
          onEcrite={() => setNBilans((n) => n + 1)}
          onFaite={(cle) => { setCloture(false); setSeanceBilan(cle); setParcoursBilan(true); setNBilans((n) => n + 1); setTab("bilans"); }} />
      )}

      {/* Bulle d'info : build conseillé + accès au build de référence */}
      {info && <div onClick={() => setInfo(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, maxWidth: 460, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <ClassLogo name={info.classe} size={34} />
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 17 }}>{lbl(info)}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{info.classe} · build conseillé</div></div>
            <button onClick={() => setInfo(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={18} /></button>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text)", whiteSpace: "pre-line" }}>{info.build || "Build conseillé à venir."}</div>
          <div style={{ marginTop: 16 }}>
            <a href={`/compositions/build/${info.id}`} style={{ fontSize: 13, fontWeight: 600, padding: "9px 16px", borderRadius: 8, border: "1px solid rgba(var(--gn-or-rgb),.55)", background: "var(--gn-action)", color: "var(--gn-sur-action)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="eye" size={14} /> Voir le build de référence ↗</a>
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
            <button onClick={() => { const l = (document.getElementById("es-label") as HTMLInputElement | null)?.value.trim() ?? ""; const n = (document.getElementById("es-note") as HTMLTextAreaElement | null)?.value.trim() ?? ""; renameSlot(editSlot, l, n); }} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--gn-action)", color: "var(--gn-sur-action)", fontWeight: 700, cursor: "pointer" }}>Enregistrer</button>
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
              <Icon name="key" size={17} style={{ color: "var(--gn-accent)" }} />Chambre secrète — {dateSeance(seance.debut)}
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "9px 0 4px" }}>
              Tu seras là ? Coche les personnages que tu comptes jouer {delai(seance.debut)}.
            </p>
            {manques.length > 0 && (
              <p style={{ fontSize: 12, color: "var(--gn-accent)", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
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

      {/* ┌──── LES NOTES DE CSS SE LISENT ICI, PAS DANS LE `<style>` ────┐
          Un commentaire écrit DANS le gabarit du `<style>` part chez le visiteur :
          il est servi mot pour mot dans le HTML de la page, pesé par la mesure des
          mots servis, et téléchargé par tout le monde. Ces deux notes-là faisaient
          164 mots à elles seules sur une page qui en sert 784 — un cinquième de la
          page, pour un texte qu'aucun lecteur ne lira jamais. Hors du gabarit elles
          ne coûtent rien, elles gardent leurs accents, et le piège du caractère qui
          referme le littéral (payé sur ce site, invisible pour tsc jusqu'à la 500)
          ne peut plus se poser. C'est la forme déjà en service sur /astuces et
          /prestige, dont les feuilles servies ne portent aucun commentaire.
          └───────────────────────────────────────────────────────────────┘

          .cs-legende — une liste de DÉFINITIONS et non deux colonnes de div : le
          couple signe/sens EST une définition, et un lecteur d'écran annonce alors le
          terme avant sa description au lieu de lire six morceaux de phrase à la suite.
          La grille tient les signes alignés sur une colonne étroite, la description
          prend le reste. Le centrage vertical est explicite : une icône de 14 px et un
          texte de 12,5 px ne partagent pas leur ligne de base, et l'icône flottait
          au-dessus du mot.

          .cs-lg-btn — le faux bouton reprend la forme du vrai « + ton perso » des
          postes : même rayon, même graisse, même taille de texte. Il ne se clique pas,
          c'est une légende — donc pas de curseur ni de survol. */}
      <style>{`
        .cs-legende{display:grid;grid-template-columns:auto minmax(0,1fr);
          gap:7px 11px;align-items:center;margin:0;font-size:12.5px;
          color:var(--text-muted)}
        .cs-legende dt{display:flex;align-items:center;justify-content:center;min-width:0}
        .cs-legende dd{margin:0;min-width:0}
        .cs-lg-btn{white-space:nowrap;font-size:11.5px;font-weight:600;padding:4px 9px;
          border-radius:6px;border:1px solid var(--gn-accent);color:var(--gn-accent)}
      `}</style>
    </div>
  );
}

/**
 * LE CHIFFRE À CÔTÉ DU NOM (spec §7.2) : des PV sur un poste de tank, des dégâts sinon —
 * ceux que le joueur a DÉCLARÉS dans l'AirBuilder, jamais vérifiés. Le survol en dit la
 * date et les conditions ; « à remesurer » au-delà de 30 jours, « sans mesure » quand rien
 * n'est déclaré pour ce poste. C'est une information, pas un ordre : le tri des candidats
 * reste l'écart au build de référence.
 *
 * Les pastilles copient leurs voisines : « à remesurer » la forme de « sans build »
 * (9,5 px, rayon 99), en or ; dans la puce d'un annoncé, l'horloge seule.
 */
function ChiffresPoste({ chiffres, cs, moi, compact = false }: { chiffres: Chiffre[]; cs: RolesCS; moi: boolean; compact?: boolean }) {
  const taille = compact ? 10.5 : 11;
  if (!chiffres.length) {
    /* Dans la puce d'un annoncé, « sans mesure » devient lui-même le lien quand c'est mon
       perso : la phrase entière ne tient pas dans une puce. Le clic ne remonte pas à la
       puce, qui, pour le staff, retient ou relâche l'annoncé. */
    if (compact && moi) {
      return (
        <a href="/builder" onClick={(e) => e.stopPropagation()} title="Aucun chiffre déclaré pour ce poste — mettre à jour dans l'AirBuilder"
          style={{ fontSize: taille, color: "var(--text-muted)", fontWeight: 400, whiteSpace: "nowrap", textDecoration: "none", borderBottom: "1px dotted var(--gn-accent)" }}>
          sans mesure
        </a>
      );
    }
    return (
      <span title="Aucun chiffre déclaré dans l'AirBuilder pour ce poste" style={{ fontSize: taille, color: "var(--text-muted)", fontWeight: 400, whiteSpace: "nowrap" }}>
        sans mesure
        {moi && <> · <a href="/builder" style={{ color: "var(--gn-accent)", textDecoration: "none" }}>Mettre à jour dans l&apos;AirBuilder</a></>}
      </span>
    );
  }
  const vieux = chiffres.some((c) => c.aRemesurer);
  return (
    <span title={compact ? undefined : chiffres.map(survol).join("\n")} style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontSize: taille, fontWeight: 400, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
      <span style={{ color: "var(--text)", fontWeight: 600, whiteSpace: "nowrap" }}>{enLigne(chiffres, cs)}</span>
      {vieux && (compact
        ? <span style={{ color: "var(--gold)", display: "inline-flex" }}><Icon name="clock" size={10} /></span>
        : <span style={{ fontSize: 9.5, color: "var(--gold)", border: "1px solid var(--gold)", borderRadius: 99, padding: "1px 7px", display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}><Icon name="clock" size={9} />à remesurer</span>)}
    </span>
  );
}
