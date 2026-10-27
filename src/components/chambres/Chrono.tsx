"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClassLogo } from "@/components/ClassLogo";
import { Icon } from "@/components/Icon";
import { VgSelect } from "@/components/VgSelect";
import { vgConfirm } from "@/components/Dialogs";
import { ChiffreDeclare } from "@/components/chambres/ChiffreDeclare";
import { partiesParis, type ChiffreFige, type Etape } from "@/lib/evenements";
import {
  EQUIPES, NOM_EQUIPE, ROLES_JUMEAU, ROLE_JUMEAU_LABEL, chronoParDefaut, cleJoueur, etatChrono, fmtDuree, momentDe, repere, singulier,
  type ActionChrono, type Chrono as EtatDuChrono, type Moment, type RecapNoms, type VueRepartition,
} from "@/lib/chambres";

/**
 * L'ONGLET CHRONO de /compositions (SPEC-CHAMBRES-RECENSEMENT §4.9, §7.4 ; lot 5).
 *
 * Un membre du staff clique « Démarrer » au lancement de l'instance, puis « Fin : 1.1 480
 * monstres », « Fin : 1.2 12 Asuras »… — ici, ou sur les boutons du message Discord (M6) : les
 * deux écrivent au même endroit (route 6, `modifierChrono`), et chacun voit l'autre. Tout le
 * monde voit l'étape en cours, son temps qui défile, et les MONSTRES qu'on y affronte (décision
 * 8) ; et qui joue cette étape, avec ses dégâts DÉCLARÉS (décision 9).
 *
 * LE TEMPS QUI DÉFILE se calcule ici, chaque seconde (`setInterval`, jamais un
 * `requestAnimationFrame` seul : il s'arrête quand l'onglet est caché), sur l'heure du SERVEUR :
 * chaque réponse porte `maintenant`, d'où le décalage de l'horloge du navigateur. Une horloge de
 * téléphone avancée de 2 min affiche donc le bon temps.
 *
 * LE RAFRAÎCHISSEMENT, sans websocket : la réponse allégée de la route 4 (`?partie=chrono`)
 * toutes les 5 s pendant que le chrono tourne, toutes les 30 s sinon ; jamais pour un onglet du
 * navigateur caché, et tout de suite quand il redevient visible. Chaque clic part avec `vu`, le
 * repère de l'état affiché : si un autre membre du staff a cliqué entre-temps, le serveur refuse
 * (409), l'écran se remet à jour et le dit.
 *
 * HORS SÉANCE, l'onglet montre le dernier chrono terminé avec son total, et un sélecteur de
 * séance (`chronoParDefaut`). Il ne lit et n'écrit que ses propres routes (§7.1).
 */

type Lien = { lien: string; at: number; ferme: string | null } | null;
type Demande = { statut: string; resultat: string | null; at: number };
type SeanceListe = { cle: string; label: string; date: string; total: number; fini: boolean; arrete: boolean; enCours: boolean };
type Vue = {
  cle: string; date: string; label: string; debut: number; commencee: boolean; annulee: boolean; motif: string | null; cloturee: boolean;
  maintenant: number; etapes: Etape[]; phases: Record<string, string>; figees: boolean; chrono: EtatDuChrono;
  /** Pourquoi le staff ne peut plus y toucher (séance passée, annulée, clôturée) ; null : il peut. */
  refus: string | null;
  discord: null | { chrono: Lien; bascule: boolean; demande: Demande | null };
  seances?: SeanceListe[];
};
type P = { pseudo: string; classe: string; moi: boolean; poste: string | null; retenu: boolean; chiffres: ChiffreFige[]; enLigne: string };
/** Ce que la route 4 complète dit des joueurs : relue à l'ouverture, puis toutes les 60 s. */
type Joueurs = { cle: string; participants: P[]; degats: boolean; source: "retenus" | "annonces"; repartition: VueRepartition | null; recap: RecapNoms | null };

const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };
const titre: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, color: "var(--gn-accent)", textTransform: "uppercase", fontSize: 15, letterSpacing: 1, margin: 0 };

/** « 21:04:12 », à l'heure de Paris — celle du jeu et des messages. */
const heure = (ms: number) => new Date(ms).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", second: "2-digit" });
/** « jeudi à 20:55 ». */
const quand = (ms: number) => {
  const d = new Date(ms);
  return `${d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long" })} à ${d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })}`;
};
const nombre = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2).replace(/\.?0+$/, "").replace(".", ",")} M` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, "").replace(".", ",")} k` : String(n));
/** Un bouton, un lien, un champ a le focus : Espace et Entrée lui appartiennent. */
const INTERACTIF = "input, textarea, select, button, a, [contenteditable], [role=dialog], [role=listbox], [role=option], [role=combobox]";

export function Chrono({ isAdmin }: { isAdmin: boolean }) {
  /** La séance affichée (sa clé résolue) ; null tant que le choix par défaut n'est pas fait. */
  const [cible, setCible] = useState<string | null>(null);
  const [vue, setVue] = useState<Vue | null>(null);
  const [courante, setCourante] = useState<{ cle: string; label: string } | null>(null);
  const [liste, setListe] = useState<SeanceListe[]>([]);
  const [joueurs, setJoueurs] = useState<Joueurs | null>(null);
  const [panne, setPanne] = useState(false);
  /** L'heure du serveur moins celle du navigateur, mesurée à chaque réponse (§7.4). */
  const [decalage, setDecalage] = useState(0);
  const [tick, setTick] = useState(() => Date.now());
  const [majA, setMajA] = useState<number | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [verdict, setVerdict] = useState<{ ok: boolean; texte: string } | null>(null);
  const [publication, setPublication] = useState<string | null>(null);

  /** Une lecture de la route allégée ; `t0`/`t1` encadrent l'aller-retour, et le décalage se
   *  mesure au milieu : la latence ne fausse pas l'horloge. */
  const lire = useCallback(async (cle: string, liste = false): Promise<Vue | null> => {
    const t0 = Date.now();
    const r = await fetch(`/api/seances/${encodeURIComponent(cle)}?partie=chrono${liste ? "&liste=1" : ""}`, { cache: "no-store" }).catch(() => null);
    const t1 = Date.now();
    const j = r?.ok ? ((await r.json().catch(() => null)) as Vue | null) : null;
    if (!j) { setPanne(true); return null; }
    setPanne(false);
    setDecalage(j.maintenant - (t0 + t1) / 2);
    setMajA(Date.now());
    if (j.seances) setListe(j.seances);
    return j;
  }, []);

  /* À l'ouverture : la séance qui se joue, et la liste des chronos récents ; « hors séance »,
     le dernier chrono terminé (`chronoParDefaut`). */
  useEffect(() => {
    let fini = false;
    (async () => {
      const j = await lire("cs_courante", true);
      if (!j || fini) return;
      setCourante({ cle: j.cle, label: j.label });
      const choix = chronoParDefaut({ cle: j.cle, date: j.date, chrono: j.chrono }, j.seances ?? [], partiesParis(new Date(j.maintenant)).date);
      if (choix === j.cle) { setVue(j); setCible(j.cle); return; }
      const k = await lire(choix);
      if (fini) return;
      setVue(k ?? j);
      setCible(k ? k.cle : j.cle);
    })();
    return () => { fini = true; };
  }, [lire]);

  const recharger = useCallback(async (cle: string) => {
    const j = await lire(cle);
    if (j && j.cle === cle) setVue((v) => (v && v.cle !== cle ? v : j));
  }, [lire]);

  const v = useMemo(() => (vue ? etatChrono(vue.chrono, vue.etapes, tick + decalage) : null), [vue, tick, decalage]);
  const tourne = v?.statut === "en_cours";

  /* Toutes les 5 s pendant le chrono, 30 s sinon ; rien pour un onglet caché, et tout de suite
     quand il revient (§7.4). */
  useEffect(() => {
    if (!cible) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") recharger(cible); }, tourne ? 5_000 : 30_000);
    const vis = () => { if (document.visibilityState === "visible") recharger(cible); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [cible, tourne, recharger]);

  /* Le temps qui défile : chaque seconde, un `setInterval` — et seulement quand il défile. */
  useEffect(() => {
    if (!tourne) return;
    const t = setInterval(() => setTick(Date.now()), 1_000);
    return () => clearInterval(t);
  }, [tourne]);
  // « Mis à jour il y a 3 s » avance aussi hors chrono, plus lentement.
  useEffect(() => {
    if (tourne) return;
    const t = setInterval(() => setTick(Date.now()), 10_000);
    return () => clearInterval(t);
  }, [tourne]);

  /* Les joueurs de la séance (route 4 complète), pour « qui joue cette étape » : à l'ouverture
     et toutes les 60 s — ils ne changent guère pendant une séance. */
  useEffect(() => {
    if (!cible) return;
    let fini = false;
    const charger = () => fetch(`/api/seances/${encodeURIComponent(cible)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (!fini && j) setJoueurs({ ...j, cle: cible }); }).catch(() => {});
    charger();
    const t = setInterval(() => { if (document.visibilityState === "visible") charger(); }, 60_000);
    return () => { fini = true; clearInterval(t); };
  }, [cible]);

  const peutCliquer = isAdmin && !!vue && !vue.refus;
  /** Une confirmation est ouverte : Espace et Entrée ne valident pas d'étape derrière elle. */
  const enConfirmation = useRef(false);

  /** Un clic (route 6), avec le repère de l'état AFFICHÉ. */
  const cliquer = useCallback(async (action: ActionChrono) => {
    if (!vue || envoi || vue.refus) return;
    if (action === "reinitialiser") {
      enConfirmation.current = true;
      const oui = await vgConfirm("Effacer tout le chrono de ce soir ?\nLes temps déjà pris seront perdus.");
      enConfirmation.current = false;
      if (!oui) return;
    }
    setEnvoi(true); setVerdict(null);
    const t0 = Date.now();
    const r = await fetch(`/api/seances/${encodeURIComponent(vue.cle)}/chrono`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, vu: repere(vue.chrono) }),
    }).catch(() => null);
    const t1 = Date.now();
    const j = r ? await r.json().catch(() => ({})) : {};
    setEnvoi(false);
    if (j.chrono) {
      setVue((x) => (x && x.cle === vue.cle ? { ...x, chrono: j.chrono, etapes: j.etapes ?? x.etapes, phases: j.phases ?? x.phases, figees: x.figees || !!j.chrono.debut } : x));
      if (typeof j.maintenant === "number") setDecalage(j.maintenant - (t0 + t1) / 2);
      setTick(Date.now()); setMajA(Date.now());
    }
    if (r?.status === 409 && j.conflit) setVerdict({ ok: false, texte: "Un autre membre du staff vient de valider cette étape." });
    else setVerdict({ ok: !!r?.ok, texte: j.message ?? j.error ?? "Le serveur n'a pas répondu : réessaie dans un instant." });
    // « Effacer » peut libérer la liste figée (aucun débrief noté) : la relire tout de suite, plutôt
    // que d'afficher « La liste est figée » jusqu'au prochain rafraîchissement.
    if (!r?.ok || action === "reinitialiser") recharger(vue.cle);
  }, [vue, envoi, recharger]);

  /* Sur ordinateur, Espace ou Entrée vaut « suivante » (§7.4) — sauf quand un bouton, un champ
     ou un menu a le focus : la touche lui appartient. */
  const cliquerRef = useRef(cliquer);
  useEffect(() => { cliquerRef.current = cliquer; }, [cliquer]);
  const principalActif = !!v?.principal.actif;
  useEffect(() => {
    if (!peutCliquer || !principalActif) return;
    const f = (e: KeyboardEvent) => {
      if ((e.key !== " " && e.key !== "Enter") || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.(INTERACTIF) || enConfirmation.current || document.visibilityState !== "visible") return;
      e.preventDefault();
      cliquerRef.current("suivante");
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [peutCliquer, principalActif]);

  /** « Publier dans Discord » (route 11) : le bot publie dans sa file, on relit son verdict. */
  const publier = async () => {
    if (!vue) return;
    setPublication("Chrono demandé au bot…");
    const r = await fetch(`/api/seances/${encodeURIComponent(vue.cle)}/discord`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoi: "chrono" }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) { setPublication(null); setVerdict({ ok: false, texte: j.error ?? "Le serveur a refusé." }); return; }
    for (const ms of [4000, 9000, 15000, 25000]) setTimeout(() => recharger(vue.cle), ms);
    setTimeout(() => setPublication(null), 26000);
  };

  const choisir = (cle: string) => {
    if (cle === cible) return;
    setVerdict(null); setJoueurs(null);
    setCible(cle);
    lire(cle).then((j) => { if (j) setVue(j); });
  };

  if (panne && !vue) return <div style={card}><div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />Le chrono n&apos;a pas pu être lu. Réessaie dans un instant.</div></div>;
  if (!vue || !v) return <div style={{ ...card, fontSize: 13, color: "var(--text-muted)" }}>Chargement du chrono…</div>;

  const c = vue.chrono;
  const etapeCourante = v.courante !== null ? vue.etapes[v.courante] : null;
  const horsSeance = !!courante && vue.cle !== courante.cle;
  // Le sélecteur : la séance qui se joue, puis les chronos récents.
  const options = [
    ...(courante ? [{ value: courante.cle, label: `${courante.label} (celle qui se joue)` }] : []),
    ...liste.filter((x) => x.cle !== courante?.cle).map((x) => ({ value: x.cle, label: `${x.label} · ${x.enCours ? "en cours" : `${fmtDuree(x.total)}${x.arrete ? " (arrêté)" : ""}`}` })),
  ];
  if (!options.some((o) => o.value === vue.cle)) options.push({ value: vue.cle, label: vue.label });

  const tete = !vue.etapes.length ? "Aucune étape : les bras droits les règlent dans le paramétrage."
    : v.statut === "attente" ? (isAdmin ? "Clique sur Démarrer au lancement de l'instance." : "Le staff lance le chrono au lancement de l'instance.")
      : v.statut === "en_cours" ? `Départ à ${heure(c.debut!)}${c.par ? ` · chronométreur : ${c.par}` : ""}`
        : !c.fins.length ? "Arrêté avant la fin de la première étape."
          : `Terminé en ${fmtDuree(v.total)}${v.arreteAvantFin ? " (arrêté avant la fin)" : ""}${c.par ? ` · chronométreur : ${c.par}` : ""}`;

  const d = vue.discord;
  const demande = d?.demande && (!d.chrono || d.demande.at > d.chrono.at) ? d.demande : null;
  const enFile = publication ?? (demande?.statut === "PENDING" ? "Chrono en file : le bot le prend sous 15 s." : demande?.statut === "FAILED" ? `Échec : ${demande.resultat ?? "raison inconnue"}` : null);
  const ilYA = majA ? Math.max(0, Math.round((tick - majA) / 1000)) : null;

  const parPhase = Object.keys(vue.phases).sort().map((k) => ({ k, titre: vue.phases[k], lignes: v.lignes.map((l, i) => ({ l, i })).filter((x) => x.l.etape.phase === k) })).filter((p) => p.lignes.length);

  return (
    <>
      <div className="fx-card" style={{ ...card, borderColor: tourne ? "rgba(var(--gn-or-rgb),.55)" : "rgba(var(--gn-or-rgb),.32)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <h2 className="font-heading" style={titre}><Icon name="clock" size={17} />Chrono</h2>
          <span className="font-heading" style={{ fontWeight: 700, fontSize: 15 }}>{vue.label}</span>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            {vue.annulee ? "séance annulée" : vue.cloturee ? "séance clôturée" : v.statut === "en_cours" ? "chrono en cours" : v.statut === "termine" ? "chrono terminé" : vue.commencee ? "séance en cours" : "séance à venir"}
          </span>
          {options.length > 1 && (
            <span className="gn-chrono-choix">
              <VgSelect full value={vue.cle} options={options} onChange={choisir} />
            </span>
          )}
        </div>
        {horsSeance && (
          <div className="gn-param-bientot" style={{ margin: "4px 0 10px" }}>
            Hors séance : voici {v.statut === "en_cours" ? "le dernier chrono" : "le dernier chrono terminé"}. La séance qui se joue est {courante!.label} — choisis-la ci-dessus.
          </div>
        )}

        <div className="gn-chrono-tableau">
          <div className="gn-chrono-tete">{tete}</div>
          <div className={`font-heading gn-chrono-temps ${v.statut}`} aria-live="off">{v.statut === "attente" ? "0:00" : fmtDuree(v.ecoule)}</div>
          {etapeCourante && v.statut !== "termine" && (
            <div className="gn-chrono-courante">
              <span>{v.statut === "attente" ? "première étape" : "en cours"} :</span>
              <b><span aria-hidden="true">{etapeCourante.emoji}</span> {etapeCourante.code} {etapeCourante.label}</b>
              {v.dansEtape !== null && <span className="gn-chrono-dans">{fmtDuree(v.dansEtape)}</span>}
            </div>
          )}
          {/* Les monstres de l'étape en cours (décision 8) : un nom en or mène à sa fiche. */}
          {etapeCourante && v.statut !== "termine" && etapeCourante.monstres.length > 0 && (
            <div className="gn-param-monstres gn-chrono-monstres">
              <span className="gn-chrono-contre">Contre</span>
              {etapeCourante.monstres.map((m, i) => m.id
                ? <a key={i} className="gn-monstre" href={`/monstres/${encodeURIComponent(m.id)}`} title="Voir sa fiche : PV, vies, résistances"><span>{m.nom}</span></a>
                : <span key={i} className="gn-monstre" title="Pas de fiche : absent du relevé du client"><span>{m.nom}</span></span>)}
            </div>
          )}
        </div>

        {isAdmin && !vue.refus && (
          <div className="gn-chrono-gestes">
            <button type="button" className="vg-btn gn-chrono-principal" disabled={envoi || !v.principal.actif} onClick={() => cliquer("suivante")}>
              <Icon name={v.statut === "attente" ? "zap" : v.statut === "termine" ? "check" : "arrow-right"} size={18} />{v.principal.label}
            </button>
            <span className="gn-chrono-secondaires">
              <button type="button" className="gn-cs-discord-btn" disabled={envoi || !v.annuler} onClick={() => cliquer("annuler")}
                title="Défait le dernier clic : un « Arrêter », sinon la dernière fin, sinon le départ"><Icon name="rotate-ccw" size={12} />Annuler le dernier clic</button>
              <button type="button" className="gn-cs-discord-btn" disabled={envoi || !v.arreter} onClick={() => cliquer("arreter")}
                title="Termine le chrono avant la dernière étape (« arrêté avant la fin »)"><Icon name="ban" size={12} />Arrêter</button>
              <button type="button" className="gn-cs-discord-btn gn-chrono-effacer" disabled={envoi || c.debut === null} onClick={() => cliquer("reinitialiser")}
                title="Efface tout le chrono de cette séance, après confirmation"><Icon name="trash" size={12} />Effacer</button>
            </span>
            {v.principal.actif && <span className="gn-chrono-clavier">Sur ordinateur : Espace ou Entrée valide l&apos;étape.</span>}
          </div>
        )}
        {isAdmin && vue.refus && <div className="gn-panne" style={{ marginTop: 12 }}><Icon name="lock" size={14} style={{ flexShrink: 0 }} /><span>{vue.refus}</span></div>}
        {!isAdmin && v.statut !== "termine" && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "12px 0 0" }}>Le staff valide chaque étape, ici ou sur Discord ; le temps défile tout seul.</p>}
        {vue.annulee && <div className="gn-panne" style={{ marginTop: 10 }}><Icon name="ban" size={14} style={{ flexShrink: 0 }} /><span><b>Séance annulée</b>{vue.motif ? ` — ${vue.motif}` : ""}.</span></div>}
        {verdict && (
          <div role="status" aria-live="polite" className="gn-rep-verdict" style={{ color: verdict.ok ? "var(--green)" : "var(--gn-crimson-texte)" }}>
            <Icon name={verdict.ok ? "check" : "alert"} size={14} style={{ flexShrink: 0 }} /><span>{verdict.texte}</span>
          </div>
        )}
        {isAdmin && d && !horsSeance && (
          <div className="gn-cs-discord">
            <Icon name="discord" size={14} style={{ flexShrink: 0, color: "var(--gn-accent)" }} />
            <span className="gn-cs-discord-etat">
              {!d.bascule ? "Discord : le chrono part avec la bascule (« Messages de notre bot », paramétrage des événements). Le site le tient déjà."
                : d.chrono && !d.chrono.ferme ? `Discord : chrono publié ${quand(d.chrono.at)} — ses boutons suivent ce chrono, et inversement.`
                  : "Discord : chrono pas encore publié (/chambre chrono, ou ce bouton)."}
            </span>
            {enFile && <span className={enFile.startsWith("Échec") ? "gn-cs-discord-echec" : "gn-cs-discord-file"}>{enFile}</span>}
            <span className="gn-cs-discord-gestes">
              {d.chrono && !d.chrono.ferme && <a href={d.chrono.lien} target="_blank" rel="noreferrer" className="gn-cs-discord-btn"><Icon name="link" size={12} />Voir</a>}
              {d.bascule && !vue.refus && (
                <button type="button" className="gn-cs-discord-btn" disabled={!!publication} onClick={publier}
                  title="Publie le chrono dans le salon des Chambres, sans mention, et ferme l'ancien"><Icon name="send" size={12} />{d.chrono && !d.chrono.ferme ? "Republier" : "Publier dans Discord"}</button>
              )}
            </span>
          </div>
        )}
      </div>

      {/* ── LES ÉTAPES, PHASE PAR PHASE (§7.4) : faite → sa durée ; en cours → depuis quand ;
             à venir → son nom. ── */}
      <div className="fx-card" style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <h2 className="font-heading" style={titre}><Icon name="list" size={17} />Les étapes</h2>
          {v.total > 0 && <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: v.statut === "termine" ? "var(--green)" : "var(--gold)", fontVariantNumeric: "tabular-nums" }}>Total {fmtDuree(v.total)}</span>}
        </div>
        {vue.figees && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "-6px 0 12px" }}>La liste est figée depuis le départ : une étape modifiée dans le paramétrage ne change pas ce chrono.</p>}
        <div className="gn-deroule">
          {parPhase.map((p) => (
            <div key={p.k}>
              <h3 className="gn-deroule-phase">{p.titre}</h3>
              {p.lignes.map(({ l, i }) => (
                <div key={l.etape.code} className={`gn-deroule-etape gn-chrono-etape ${l.statut}`}>
                  <span className="gn-chrono-statut" aria-label={l.statut === "fait" ? "faite" : l.statut === "en_cours" ? "en cours" : "à venir"}>
                    {l.statut === "fait" ? <Icon name="check" size={13} /> : l.statut === "en_cours" ? <Icon name="arrow-right" size={13} /> : <span className="gn-chrono-point" />}
                  </span>
                  <span aria-hidden="true">{l.etape.emoji}</span>
                  <span className="gn-deroule-code">{l.etape.code}</span>
                  <span className="gn-deroule-label">{l.etape.label}</span>
                  <span className="gn-chrono-duree">
                    {l.statut === "fait" ? fmtDuree(l.duree) : l.statut === "en_cours" && v.dansEtape !== null ? `en cours ${fmtDuree(v.dansEtape)}` : ""}
                  </span>
                  {i === v.courante && v.statut === "en_cours" && l.etape.monstres.length > 0 && (
                    <span className="gn-param-monstres">
                      {l.etape.monstres.map((m, k) => m.id
                        ? <a key={k} className="gn-monstre" href={`/monstres/${encodeURIComponent(m.id)}`}><span>{m.nom}</span></a>
                        : <span key={k} className="gn-monstre"><span>{m.nom}</span></span>)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="gn-chrono-pied">
          <Icon name="clock" size={12} style={{ flexShrink: 0 }} />
          <span>{ilYA === null ? "" : ilYA < 2 ? "Mis à jour à l'instant" : `Mis à jour il y a ${ilYA} s`}{tourne ? " · relu toutes les 5 s" : ""} · le même chrono vit aussi dans Discord.</span>
          {isAdmin && d?.chrono && !d.chrono.ferme && <a href={d.chrono.lien} target="_blank" rel="noreferrer">voir le message</a>}
        </div>
      </div>

      {joueurs && joueurs.cle === vue.cle && joueurs.participants.length > 0 && (
        <QuiJoue joueurs={joueurs} moment={etapeCourante && v.statut !== "termine" ? momentDe(etapeCourante) : null} etape={v.statut !== "termine" ? etapeCourante : null} />
      )}
    </>
  );
}

/**
 * QUI JOUE CETTE ÉTAPE — et ses dégâts DÉCLARÉS (décision 9) : les salles des Asuras, les deux
 * équipes des Jumeaux (et leurs totaux), le golem de gauche ou de droite, les rotations de
 * l'araignée ; à toute autre étape, tous les joueurs de la séance. Lu dans la répartition et le
 * récap de la séance (lot 4), tels que la route 4 les rend.
 */
function QuiJoue({ joueurs, moment, etape }: { joueurs: Joueurs; moment: Moment | null; etape: Etape | null }) {
  const par = new Map(joueurs.participants.map((p) => [cleJoueur(p.pseudo), p]));
  const nom = (pseudo: string, suffixe?: string) => {
    const p = par.get(cleJoueur(pseudo));
    return (
      <span key={pseudo} className={`gn-rep-membre${p?.moi ? " moi" : ""}`}>
        {p && <ClassLogo name={p.classe} size={18} />}
        <b>{pseudo}</b>
        {suffixe && <span style={{ color: "var(--text-muted)" }}>{suffixe}</span>}
        {p && (p.enLigne
          ? <ChiffreDeclare enLigne={p.enLigne} chiffres={p.chiffres} style={{ fontSize: 11.5, color: "var(--text-muted)" }} />
          : joueurs.degats && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>sans mesure</span>)}
      </span>
    );
  };
  const colonne = (titreCol: string, l: React.ReactNode[], pied?: React.ReactNode) => (
    <div className="gn-rep-role" style={{ alignContent: "start" }}>
      <span className="gn-rep-role-nom">{titreCol}</span>
      {l.length ? l : <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>personne</span>}
      {pied}
    </div>
  );
  const rep = joueurs.repartition, rc = joueurs.recap;
  let titreBloc = "Les joueurs de ce soir";
  let contenu: React.ReactNode = <div className="gn-chrono-joueurs">{joueurs.participants.map((p) => nom(p.pseudo, p.poste ? `· ${p.poste}` : undefined))}</div>;
  if (moment?.quoi === "salles" && rep) {
    titreBloc = "À cette étape : les salles";
    contenu = <div className="gn-chrono-joueurs">{rep.salles.map((s) => (
      <span key={s.cle} style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
        <b style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: .7, color: "var(--text-muted)" }}>{s.label}</b>
        {s.pseudo ? nom(s.pseudo) : <span style={{ fontSize: 12.5, color: "var(--gn-crimson-texte)", fontWeight: 700 }}>personne !</span>}
      </span>
    ))}</div>;
  } else if (moment?.quoi === "jumeaux" && rep) {
    titreBloc = "À cette étape : les équipes des Jumeaux";
    contenu = (
      <div className="gn-rep-equipes">
        {EQUIPES.map((eq) => {
          const e = rep.jumeaux[eq];
          return (
            <div key={eq} className={`gn-rep-equipe ${eq}`}>
              <div className="gn-rep-equipe-titre"><span className="gn-rep-carre" aria-hidden="true" />Équipe {NOM_EQUIPE[eq]}</div>
              {ROLES_JUMEAU.map((r) => <div key={r}>{colonne(ROLE_JUMEAU_LABEL[r], e[r].map((x) => nom(x)))}</div>)}
              {joueurs.degats && (e.totalDps > 0 || e.pvTank > 0) && (
                <div className="gn-rep-total" title="La somme des chiffres DÉCLARÉS dans l'AirBuilder, jamais vérifiés">DPS {e.totalDps ? `${nombre(e.totalDps)}/s` : "—"} · PV tank {e.pvTank ? nombre(e.pvTank) : "—"}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  } else if (moment?.quoi === "golems" && rc) {
    const golem = singulier(rc.golems.nom).toLowerCase();
    titreBloc = moment.cote ? `À cette étape : le ${golem} de ${moment.cote}` : `À cette étape : les ${golem}s de gauche et de droite`;
    const cotes = moment.cote ? [moment.cote] : (["gauche", "droite"] as const);
    contenu = (
      <div className="gn-rep-calcul">
        {cotes.map((cote) => (
          <div key={cote} style={{ minWidth: 0 }}>
            {colonne(cote === "gauche" ? "Gauche" : "Droite", rc.golems[cote].map((m) => nom(m.pseudo, m.tank ? "— tank" : undefined)),
              (cote === "gauche" ? rc.golems.resumeGauche : rc.golems.resumeDroite) ? <i style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{cote === "gauche" ? rc.golems.resumeGauche : rc.golems.resumeDroite}</i> : undefined)}
          </div>
        ))}
      </div>
    );
  } else if (moment?.quoi === "araignee" && rc) {
    titreBloc = "À cette étape : les rotations de l'araignée";
    contenu = (
      <div className="gn-rep-calcul">
        <div style={{ minWidth: 0 }}>{colonne("Rotation 1", rc.araignee.r1.map((x) => nom(x)))}</div>
        <div style={{ minWidth: 0 }}>{colonne("Rotation 2", rc.araignee.r2.map((x) => nom(x)),
          rc.araignee.reserve.length ? <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Remplaçant{rc.araignee.reserve.length > 1 ? "s" : ""} debuff : {rc.araignee.reserve.join(", ")}</span> : undefined)}</div>
      </div>
    );
  }
  return (
    <div className="fx-card" style={card}>
      <h2 className="font-heading" style={{ ...titre, marginBottom: 4 }}><Icon name="users" size={17} />{titreBloc}</h2>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
        {etape ? <>Étape {etape.code} {etape.label}. </> : null}
        {joueurs.source === "annonces" ? "Personne n'est encore retenu : ce sont les annoncés. " : ""}
        {joueurs.degats ? "Les chiffres sont DÉCLARÉS dans l'AirBuilder, jamais vérifiés : la date de mesure au survol, et le témoin « à remesurer »." : ""}
      </p>
      {contenu}
    </div>
  );
}
