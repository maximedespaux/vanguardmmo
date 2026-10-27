"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClassLogo } from "@/components/ClassLogo";
import { Icon, type IconName } from "@/components/Icon";
import { VgSelect } from "@/components/VgSelect";
import { vgConfirm } from "@/components/Dialogs";
import { ChiffreDeclare } from "@/components/chambres/ChiffreDeclare";
import { NOMS_CLASSES, heureDite, type ChiffreFige } from "@/lib/evenements";
import {
  EQUIPES, NOM_EQUIPE, PLACES, ROLES_JUMEAU, ROLE_JUMEAU_LABEL, cleJoueur, enSuite, equipeDe, libellePlace, niveauEcart, phraseConsignes, placesPermises,
  regrouperSalles, roleDe, singulier,
  type Equipe, type JoueurCS, type Place, type Positions, type RecapNoms, type RoleJumeau, type VueDemande, type VueRepartition,
} from "@/lib/chambres";

/**
 * L'ONGLET RÉPARTITION de /compositions (SPEC-CHAMBRES-RECENSEMENT §7.3 ; lot 4).
 *
 * Chacun prend ses salles des Asuras (Phase 1) et son équipe des Jumeaux (Phase 2) ; les golems
 * et les rotations de l'araignée en DÉCOULENT (§4.6) — ils se lisent, ils ne se modifient pas.
 * Le staff place n'importe qui (« Placer… » sur chaque salle, la liste « Placer · échanger » des
 * jumeaux), complète les salles vides d'un clic, et publie le récap et la répartition sur
 * Discord. Tout ce qui se fait ici se fait AUSSI dans Discord (décision 1 de Maxime : boutons
 * des salles et des jumeaux, 📍 Mes positions), sur la même séance en base : les deux se lisent.
 *
 * L'onglet ne lit et n'écrit que ses propres routes (§7.1) : la séance (route 4,
 * `cs_courante` — celle qui se joue, sinon la prochaine) et ses gestes (route 5). Il n'appelle
 * JAMAIS l'enregistrement de la composition, qui renvoie tout `CompositionState` (§5.2) : un
 * placement ne peut donc pas effacer une annonce. Rafraîchi toutes les 15 s tant que l'onglet du
 * navigateur est visible, et tout de suite après chaque geste.
 *
 * Les chiffres à côté des noms et les totaux d'équipe sont DÉCLARÉS dans l'AirBuilder (décision
 * 9) : jamais présentés comme vérifiés, et absents si le paramétrage masque les dégâts.
 *
 * LOT 10 (§4.4, §4.5) : on ne vole pas la place d'un autre, on la lui DEMANDE (« Demander une
 * place… » sous Mes positions) ; le bandeau « Demandes d'échange », en haut, montre celles qui
 * me visent (Accepter, Refuser), les miennes (Retirer, puis leur réponse pendant une heure) et,
 * pour le staff, toutes celles qui attendent. Le staff « équilibre les jumeaux » d'un clic, après
 * confirmation. Les mêmes gestes existent dans Discord (🔄 Échanges, message privé, « Équilibrer
 * (staff) »), sur la même séance.
 */

type P = {
  pseudo: string; classe: string; player: string; moi: boolean; slotId: string | null; poste: string | null; retenu: boolean;
  roles: JoueurCS["roles"]; type: "mag" | "phy" | null; sansCompte: boolean; chiffres: ChiffreFige[]; enLigne: string;
};
type Lien = { lien: string; at: number; ferme: string | null } | null;
type Demande = { statut: string; resultat: string | null; at: number };
type Vue = {
  cle: string; label: string; date: string; commencee: boolean; annulee: boolean; motif: string | null; cloturee: boolean;
  /** L'heure du serveur à la lecture : ce qui reste aux demandes d'échange. */
  maintenant: number;
  source: "retenus" | "annonces"; degats: boolean; participants: P[];
  places: number | null; repartition: VueRepartition | null; recap: (RecapNoms & { phrase: string; heure: string | null }) | null; positions: Positions[];
  /** Mes persos annoncés mais pas retenus (le staff en a retenu d'autres). */
  nonRetenus?: string[];
  /** Mon compte est caché par un bras droit : jamais parmi les joueurs. */
  moiCache?: boolean;
  discord: null | { recap: Lien; repartition: Lien; bascule: boolean; rappels: boolean; demandes?: Record<string, Demande> };
};

const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };
const titre: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, color: "var(--gn-accent)", textTransform: "uppercase", fontSize: 15, letterSpacing: 1, margin: 0 };
const ICONE_ROLE: Record<RoleJumeau, IconName> = { tank: "shield", mag: "orb", phy: "sword-cross" };
const LIBERER = "__liberer";
/** La place dans la case du menu « Placer… » du staff : « Verte — DPS phy. ». Le libellé entier
 *  (« Verte — DPS physique ») coupait la case en trois colonnes ; il reste dans la liste ouverte. */
const COURT: Record<RoleJumeau, string> = { tank: "Tank", mag: "DPS mag.", phy: "DPS phy." };
const placeCourte = (p: Place) => `${NOM_EQUIPE[equipeDe(p)]} — ${COURT[roleDe(p)]}`;
/** « Primat · poste Tank croix · retenu », comme la réponse 📍 de Discord (M10) ; la classe
 *  s'efface quand le poste porte déjà son nom (« poste Sylphide », pas « Sylphide · Sylphide »). */
const ligneDuPerso = (classe: string, poste: string | null, retenu: boolean) => {
  const nom = NOMS_CLASSES[classe] ?? classe;
  return [poste && poste.toLowerCase() === nom.toLowerCase() ? null : nom, poste ? `poste ${poste}` : "sans poste", retenu ? "retenu" : null].filter(Boolean).join(" · ");
};

/** « jeudi à 20:40 », à l'heure de Paris — celle des messages. */
const quand = (ms: number) => {
  const d = new Date(ms);
  return `${d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long" })} à ${d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })}`;
};
const nombre = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2).replace(/\.?0+$/, "").replace(".", ",")} M` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, "").replace(".", ",")} k` : String(n));
/** « il reste 42 min » : ce qui reste à une demande d'échange avant qu'elle tombe. */
const reste = (expire: number, maintenant: number) => {
  const min = Math.max(1, Math.ceil((expire - maintenant) / 60_000));
  return `il reste ${min} min`;
};
/** La réponse d'une demande, dite à celui qui l'a faite (ou au joueur visé, quand le staff a tranché). */
const verdictDemande = (r: NonNullable<VueDemande["reponse"]>) =>
  r.motif ? `impossible : ${r.motif}` : r.par === "demandeur" ? "retirée" : `${r.accepte ? "acceptée" : "refusée"}${r.par === "staff" ? " par le staff" : ""}`;

export function Repartition({ isAdmin, onInscription, onCloturer }: { isAdmin: boolean; onInscription: () => void; onCloturer: () => void }) {
  const [vue, setVue] = useState<Vue | null>(null);
  const [panne, setPanne] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [verdict, setVerdict] = useState<{ ok: boolean; texte: string } | null>(null);
  const [actif, setActif] = useState<string | null>(null);
  const [recapOuvert, setRecapOuvert] = useState(true);
  const [publication, setPublication] = useState<string | null>(null);

  const charger = useCallback(() => {
    fetch("/api/seances/cs_courante", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Vue) => { setVue(j); setPanne(false); })
      .catch(() => setPanne(true));
  }, []);
  useEffect(() => {
    charger();
    // Toutes les 15 s, comme la page ; jamais pour un onglet caché (§7.3) — et tout de suite
    // quand on y revient.
    const t = setInterval(() => { if (document.visibilityState === "visible") charger(); }, 15_000);
    const vis = () => { if (document.visibilityState === "visible") charger(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [charger]);

  const parPseudo = useMemo(() => new Map((vue?.participants ?? []).map((p) => [cleJoueur(p.pseudo), p])), [vue]);
  const miens = useMemo(() => (vue?.participants ?? []).filter((p) => p.moi), [vue]);
  // Le perso que je place : le premier des miens, ou celui que j'ai choisi (plusieurs annoncés).
  const moi = miens.find((p) => p.pseudo === actif) ?? miens[0] ?? null;

  /** Un geste (route 5), sur la séance AFFICHÉE — sa clé résolue, pas l'alias : un geste fait à
   *  la minute où la séance bascule ne doit pas tomber sur la suivante. */
  const agir = async (corps: Record<string, unknown>) => {
    if (!vue || occupe) return;
    setOccupe(true); setVerdict(null);
    const r = await fetch(`/api/seances/${encodeURIComponent(vue.cle)}/repartition`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setOccupe(false);
    if (j.vue) setVue((v) => (v ? { ...v, repartition: j.vue } : v));
    setVerdict({ ok: !!r?.ok, texte: j.message ?? j.error ?? "Le serveur n'a pas répondu : réessaie dans un instant." });
    charger(); // le récap, les golems, l'araignée et mes positions suivent
  };

  /** « Équilibrer les jumeaux » (lot 10, staff) : il REMPLACE toutes les places des deux
   *  équipes — on le dit, et on attend un oui. */
  const equilibrer = async () => {
    const oui = await vgConfirm("Équilibrer les jumeaux ?\nToutes les places des deux équipes seront remplacées : un tank par équipe, puis les DPS répartis pour que les dégâts déclarés des deux équipes soient les plus proches.");
    if (oui) await agir({ action: "equilibrer" });
  };

  /** « Publier le récap » / « Publier la répartition » (route 11) : le bot publie dans sa file,
   *  on relit l'état quelques fois pour voir son verdict. */
  const publier = async (quoi: "recap" | "repartition") => {
    if (!vue) return;
    setPublication(quoi === "recap" ? "Récap demandé au bot…" : "Répartition demandée au bot…");
    const r = await fetch(`/api/seances/${encodeURIComponent(vue.cle)}/discord`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoi }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) { setPublication(null); setVerdict({ ok: false, texte: j.error ?? "Le serveur a refusé." }); return; }
    for (const ms of [4000, 9000, 15000, 25000]) setTimeout(charger, ms);
    setTimeout(() => setPublication(null), 26000);
  };

  if (panne && !vue) return <div style={card}><div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />La séance n&apos;a pas pu être lue. Réessaie dans un instant.</div></div>;
  if (!vue) return <div style={{ ...card, fontSize: 13, color: "var(--text-muted)" }}>Chargement de la répartition…</div>;

  const rep = vue.repartition;
  const rc = vue.recap;
  const fige = vue.annulee || vue.cloturee;
  const n = vue.participants.length;
  const joueur = (pseudo: string) => parPseudo.get(cleJoueur(pseudo));
  const estMien = (pseudo: string | null) => !!pseudo && miens.some((p) => cleJoueur(p.pseudo) === cleJoueur(pseudo));

  /** Un nom de joueur : son logo de classe, son pseudo, et (si demandé) son chiffre déclaré.
   *  Une fonction de rendu, pas un composant : déclaré dans le corps, un composant serait recréé
   *  — et remonté — à chaque rafraîchissement. */
  const nomEl = (pseudo: string, { chiffre = false, suffixe }: { chiffre?: boolean; suffixe?: string } = {}) => {
    const p = joueur(pseudo);
    return (
      <span key={pseudo} className={`gn-rep-membre${estMien(pseudo) ? " moi" : ""}`}>
        {p && <ClassLogo name={p.classe} size={18} />}
        <b>{pseudo}</b>
        {suffixe && <span style={{ color: "var(--text-muted)" }}>{suffixe}</span>}
        {chiffre && p && (p.enLigne
          ? <ChiffreDeclare enLigne={p.enLigne} chiffres={p.chiffres} style={{ fontSize: 11.5, color: "var(--text-muted)" }} />
          : vue.degats && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>sans mesure</span>)}
      </span>
    );
  };

  /* ── En tête : la séance, son état, et les gestes du staff ── */
  const d = vue.discord;
  const lienDiscord = (l: Lien, nom: string) => (l && !l.ferme ? <a href={l.lien} target="_blank" rel="noreferrer" className="gn-cs-discord-btn"><Icon name="link" size={12} />{nom}</a> : null);
  const etatDiscord = !d ? null : !d.bascule
    ? "Discord : le récap de la soirée et les boutons de la répartition partent avec la bascule (« Messages de notre bot », paramétrage des événements)."
    : [
      d.recap && !d.recap.ferme ? `récap publié ${quand(d.recap.at)}` : rc?.heure ? `le récap partira à ${heureDite(rc.heure)}` : "récap : aucun envoi automatique",
      d.repartition && !d.repartition.ferme ? `répartition publiée ${quand(d.repartition.at)}` : "répartition pas encore publiée",
    ].join(" · ").replace(/^./, (c) => `Discord : ${c}`);
  const demandeEnCours = (q: string) => {
    const x = d?.demandes?.[q];
    const ref = q === "recap" ? d?.recap : d?.repartition;
    if (!x || (ref && x.at <= ref.at)) return null;
    return x.statut === "PENDING" ? `${q === "recap" ? "Récap" : "Répartition"} en file : le bot la prend sous 15 s.` : x.statut === "FAILED" ? `Échec : ${x.resultat ?? "raison inconnue"}` : null;
  };
  const enFile = publication ?? demandeEnCours("recap") ?? demandeEnCours("repartition");

  /** Une équipe des jumeaux : ses membres par rôle, ce qui manque, ses totaux déclarés, et les
   *  boutons « Rejoindre » du perso que je place. */
  function equipeBloc(eq: Equipe, v: VueRepartition["jumeaux"][Equipe]) {
    const moiIci = moi ? ROLES_JUMEAU.find((r) => v[r].some((x) => cleJoueur(x) === cleJoueur(moi.pseudo))) : undefined;
    const dps = v.mag.length + v.phy.length;
    return (
      <div key={eq} className={`gn-rep-equipe ${eq}`}>
        <div className="gn-rep-equipe-titre"><span className="gn-rep-carre" aria-hidden="true" />Équipe {NOM_EQUIPE[eq]}</div>
        {ROLES_JUMEAU.map((r) => (
          <div key={r} className="gn-rep-role">
            <span className="gn-rep-role-nom"><Icon name={ICONE_ROLE[r]} size={12} />{ROLE_JUMEAU_LABEL[r]}</span>
            {v[r].map((x) => (
              <span key={x} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                {nomEl(x, { chiffre: true })}
                {estMien(x) && !fige && (
                  <button type="button" disabled={occupe} onClick={() => agir({ action: "jumeau_retirer", pseudo: x })} title="Quitter cette équipe"
                    style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 0, display: "flex", marginLeft: "auto" }}><Icon name="x" size={13} /></button>
                )}
              </span>
            ))}
          </div>
        ))}
        {moi && !fige && !isAdmin && placesPermises(moi).filter((p) => equipeDe(p) === eq).map((p) => {
          const plein = roleDe(p) === "tank" ? v.tank.length >= 1 : dps >= 4;
          const ici = moiIci === roleDe(p);
          return ici ? null : (
            <button key={p} type="button" className="gn-rep-rejoindre" disabled={occupe || plein} onClick={() => agir({ action: "jumeau", place: p, pseudo: moi.pseudo })}
              title={plein ? `L'équipe ${NOM_EQUIPE[eq]} est complète pour ce rôle` : `Rejoindre l'équipe ${libellePlace(p)}`}>
              + {moi.pseudo} en {ROLE_JUMEAU_LABEL[roleDe(p)]}
            </button>
          );
        })}
        <div className="gn-rep-total">
          {v.manque.length > 0 && <div className="gn-rep-manque">Il manque : {v.manque.join(", ")}</div>}
          {vue!.degats && (v.totalDps > 0 || v.pvTank > 0) && (
            <div title="La somme des chiffres DÉCLARÉS dans l'AirBuilder, jamais vérifiés">DPS {v.totalDps ? `${nombre(v.totalDps)}/s` : "—"} · PV tank {v.pvTank ? nombre(v.pvTank) : "—"}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fx-card" style={{ ...card, borderColor: "rgba(var(--gn-or-rgb),.32)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <h2 className="font-heading" style={titre}><Icon name="grid" size={17} />Répartition</h2>
          <span className="font-heading" style={{ fontWeight: 700, fontSize: 15 }}>{vue.label}</span>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            {n} {vue.source === "retenus" ? `retenu${n > 1 ? "s" : ""}` : `annoncé${n > 1 ? "s" : ""}`} · {vue.annulee ? "séance annulée" : vue.cloturee ? "séance clôturée" : vue.commencee ? "séance en cours" : "séance ouverte"}
          </span>
          {isAdmin && (
            <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
              {!fige && rep && <button type="button" className="gn-cs-discord-btn" disabled={occupe || !n} onClick={() => agir({ action: "auto" })}
                title="Chaque salle vide va au participant qui en tient le moins (à égalité, le premier annoncé)"><Icon name="layers" size={12} />Compléter les salles</button>}
              {!fige && rep && <button type="button" className="gn-cs-discord-btn" disabled={occupe || !n} onClick={equilibrer}
                title="Un tank par équipe, puis les DPS répartis au plus près de dégâts déclarés égaux — remplace les places actuelles, après confirmation"><Icon name="gauge" size={12} />Équilibrer les jumeaux</button>}
              <button type="button" onClick={onCloturer} title="Clôturer la dernière séance : qui était vraiment là"
                style={{ fontSize: 11.5, fontWeight: 600, padding: "7px 12px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--gold)", background: "transparent", color: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon name="medal" size={12} />Ils étaient là
              </button>
            </span>
          )}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
          Chacun prend ses salles des Asuras et son équipe des Jumeaux ; les golems et les rotations de l&apos;araignée en découlent.
          Tout se fait aussi dans Discord (<b style={{ color: "var(--text)" }}>Mes positions</b>, boutons des salles et des équipes), sur la même séance.
        </p>
        {vue.annulee && <div className="gn-panne" style={{ marginTop: 10 }}><Icon name="ban" size={14} style={{ flexShrink: 0 }} /><span><b>Séance annulée</b>{vue.motif ? ` — ${vue.motif}` : ""} : la répartition ne bouge plus.</span></div>}
        {vue.cloturee && <div className="gn-panne" style={{ marginTop: 10 }}><Icon name="check" size={14} style={{ flexShrink: 0 }} />Séance clôturée : la répartition est figée, telle que la clôture l&apos;a retenue.</div>}
        {!fige && vue.source === "annonces" && n > 0 && (
          <div className="gn-param-bientot" style={{ margin: "10px 0 0" }}>Personne n&apos;est encore retenu : ce sont les annoncés qui se répartissent. Quand le staff retient, ceux qui ne le sont pas perdent leurs places.</div>
        )}
        {verdict && (
          <div role="status" aria-live="polite" className="gn-rep-verdict" style={{ color: verdict.ok ? "var(--green)" : "var(--gn-crimson-texte)" }}>
            <Icon name={verdict.ok ? "check" : "alert"} size={14} style={{ flexShrink: 0 }} /><span>{verdict.texte}</span>
          </div>
        )}
        {isAdmin && d && (
          <div className="gn-cs-discord">
            <Icon name="discord" size={14} style={{ flexShrink: 0, color: "var(--gn-accent)" }} />
            <span className="gn-cs-discord-etat">{etatDiscord}</span>
            {enFile && <span className={enFile.startsWith("Échec") ? "gn-cs-discord-echec" : "gn-cs-discord-file"}>{enFile}</span>}
            <span className="gn-cs-discord-gestes">
              {lienDiscord(d.recap, "Récap")}
              {lienDiscord(d.repartition, "Répartition")}
              {d.bascule && !fige && (<>
                <button type="button" className="gn-cs-discord-btn" disabled={!!publication} onClick={() => publier("recap")}
                  title="Publie le récap tout de suite, sans mention, et ferme l'ancien"><Icon name="send" size={12} />Publier le récap</button>
                <button type="button" className="gn-cs-discord-btn" disabled={!!publication} onClick={() => publier("repartition")}
                  title="Publie les boutons des salles et des équipes des jumeaux, et ferme les anciens"><Icon name="send" size={12} />Publier la répartition</button>
              </>)}
            </span>
          </div>
        )}
      </div>

      {/* ── LES DEMANDES D'ÉCHANGE (lot 10, §4.5) : en haut, pour qu'on ne les manque pas ── */}
      {rep && rep.demandes.length > 0 && (
        <div className="fx-card gn-rep-demandes" style={{ ...card, borderColor: "rgba(var(--gn-or-rgb),.45)" }}>
          <h2 className="font-heading" style={{ ...titre, marginBottom: 10 }}><Icon name="swap" size={17} />Demandes d&apos;échange</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {rep.demandes.map((x) => {
              // Sa propre demande se RETIRE, même pour le staff (qui, lui, place directement) ;
              // celle d'un autre s'accepte ou se refuse par le joueur visé, ou par le staff.
              const repondre = !x.reponse && !fige && !x.deMoi && (x.pourMoi || isAdmin);
              const retirer = !x.reponse && !fige && x.deMoi && !x.pourMoi;
              return (
                <div key={x.id} className={`gn-rep-demande${x.pourMoi && !x.reponse ? " pour-moi" : ""}`}>
                  <div className="gn-rep-demande-texte">
                    <span>{x.texte}</span>
                    <span className="gn-rep-demande-etat">
                      {x.reponse ? verdictDemande(x.reponse)
                        : !x.valable ? `${x.raison ?? "Elle n'est plus faisable."} Elle ne peut plus que se refuser.`
                          : `${x.pourMoi ? "à toi de répondre" : x.deMoi ? "en attente de sa réponse" : "en attente"} · ${reste(x.expire, vue.maintenant)}`}
                    </span>
                  </div>
                  {(repondre || retirer) && (
                    <span className="gn-rep-demande-gestes">
                      {repondre && x.valable && (
                        <button type="button" className="gn-deb-issue gagne" disabled={occupe} onClick={() => agir({ action: "repondre", demande: x.id, accepter: true })}
                          title={x.pourMoi ? "Accepter : l'échange se fait tout de suite" : "Accepter pour lui (staff)"}><Icon name="check" size={12} />Accepter</button>
                      )}
                      {repondre && (
                        <button type="button" className="gn-cs-discord-btn" disabled={occupe} onClick={() => agir({ action: "repondre", demande: x.id, accepter: false })}
                          title={x.pourMoi ? "Refuser : rien ne bouge" : "Refuser pour lui (staff)"}><Icon name="x" size={12} />Refuser</button>
                      )}
                      {retirer && (
                        <button type="button" className="gn-cs-discord-btn" disabled={occupe} onClick={() => agir({ action: "repondre", demande: x.id, accepter: false })}
                          title="Retirer ta demande"><Icon name="x" size={12} />Retirer</button>
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MES POSITIONS (§7.3) : ce que la réponse 📍 de Discord dit aussi ── */}
      <div className="fx-card gn-rep-positions" style={card}>
        <h2 className="font-heading" style={{ ...titre, marginBottom: 10 }}><Icon name="map-pin" size={17} />Mes positions</h2>
        {miens.length === 0 && vue.moiCache ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Ton compte n&apos;apparaît pas dans la liste de la guilde : vois avec le staff.</div>
        ) : miens.length === 0 && (vue.nonRetenus?.length ?? 0) > 0 ? (
          // Annoncé, mais le staff en a retenu d'autres : l'inviter à s'annoncer serait faux.
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <b style={{ color: "var(--text)" }}>{vue.nonRetenus!.join(", ")}</b>{" "}
            {vue.nonRetenus!.length > 1 ? "sont annoncés, mais le staff ne les a pas retenus" : "est annoncé, mais le staff ne l'a pas retenu"} pour cette séance : pas de place à prendre ce soir.
          </div>
        ) : miens.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, color: "var(--text-muted)" }}>
            Tu n&apos;es ni retenu ni annoncé pour cette séance : annonce-toi d&apos;abord, puis reviens prendre tes places.
            <button type="button" className="vg-btn" onClick={onInscription} style={{ padding: "7px 13px", fontSize: 12.5 }}><Icon name="key" size={13} />S&apos;annoncer</button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {miens.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)" }}>
                Je place :
                {miens.map((p) => (
                  <button key={p.pseudo} type="button" onClick={() => setActif(p.pseudo)} className={`gn-rep-perso${moi?.pseudo === p.pseudo ? " actif" : ""}`}>
                    <ClassLogo name={p.classe} size={16} />{p.pseudo}
                  </button>
                ))}
              </div>
            )}
            {vue.positions.map((pos) => {
              const p = joueur(pos.pseudo);
              return (
                <div key={pos.pseudo} className="gn-rep-pos">
                  <span className="gn-rep-membre moi"><ClassLogo name={pos.classe} size={20} /><b>{pos.pseudo}</b></span>
                  <span style={{ color: "var(--text-muted)" }}>{ligneDuPerso(pos.classe, p?.poste ?? null, !!p?.retenu)}</span>
                  <span className="gn-rep-pastille"><Icon name="tree" size={12} />{pos.salles.length ? regrouperSalles(pos.salles) : "aucune salle"}</span>
                  <span className="gn-rep-pastille"><Icon name="users" size={12} />{pos.jumeau ? `Jumeaux ${libellePlace(pos.jumeau)}` : "pas d'équipe"}</span>
                  {pos.golem && <span className="gn-rep-pastille"><Icon name="statue" size={12} />{singulier(rc?.golems.nom ?? "Golems")} {pos.golem}{pos.golemTank ? " — tank" : ""}</span>}
                  {pos.araignee && <span className="gn-rep-pastille"><Icon name="target" size={12} />{pos.araignee === "tank" ? "Araignée : tank" : pos.araignee === "reserve" ? "Araignée : remplaçant debuff" : `Araignée : rotation ${pos.araignee}`}</span>}
                </div>
              );
            })}
            {/* Lot 10 : la place d'un autre se DEMANDE (lui seul, ou le staff, accepte). Le staff,
                lui, place directement : « Placer… ». */}
            {!isAdmin && !fige && moi && (() => {
              const opts = rep?.echanges.find((e) => cleJoueur(e.pseudo) === cleJoueur(moi.pseudo))?.options ?? [];
              if (!opts.length) return null;
              return (
                <div className="gn-rep-demander">
                  <span className="gn-rep-demander-lab"><Icon name="swap" size={13} />Demander une place{miens.length > 1 ? ` pour ${moi.pseudo}` : ""}</span>
                  <VgSelect full value="" placeholder="Une salle ou une place de jumeau tenue par un autre…"
                    options={opts.map((o) => ({ value: `${o.quoi}>${o.avec}`, label: `${o.libelle} · ${o.detail}` }))}
                    onChange={(v) => {
                      const i = v.indexOf(">");
                      if (i > 0) agir({ action: "demander", quoi: v.slice(0, i), avec: v.slice(i + 1), pseudo: moi.pseudo });
                    }} />
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {rep && (<>
        {/* ── PHASE 1 : LES SALLES DES ASURAS (§4.3) ── */}
        <div className="fx-card" style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <h2 className="font-heading" style={titre}><Icon name="tree" size={17} />Phase 1 — Les Asuras</h2>
            <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: rep.couvertes === rep.salles.length ? "var(--green)" : "var(--gold)", fontVariantNumeric: "tabular-nums" }}>
              {rep.couvertes}/{rep.salles.length} couvertes
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
            {isAdmin ? "Chaque salle : « Placer… » donne la salle à un participant, ou la libère." : "Un clic prend la salle pour ton perso, un second la libère. Plusieurs salles possibles, un joueur par salle."}
          </p>
          <div className="gn-rep-salles">
            {rep.salles.map((s) => {
              const mienne = estMien(s.pseudo);
              const etat = `${s.pseudo ? "prise" : "vide"}${mienne ? " mienne" : ""}`;
              if (isAdmin && !fige) {
                return (
                  <div key={s.cle} className={`gn-rep-salle ${etat}`}>
                    <span className="gn-rep-salle-nom">{s.label}</span>
                    <VgSelect full value={s.pseudo ?? ""} placeholder="Placer…"
                      options={[...vue.participants.map((p) => ({ value: p.pseudo, label: p.pseudo })), ...(s.pseudo ? [{ value: LIBERER, label: "— Libérer la salle —" }] : [])]}
                      onChange={(v) => (v === LIBERER ? agir({ action: "liberer", salle: s.cle }) : v !== s.pseudo && agir({ action: "salle", salle: s.cle, pseudo: v, force: true }))} />
                  </div>
                );
              }
              const prenable = !fige && !!moi && (!s.pseudo || mienne);
              return (
                <button key={s.cle} type="button" className={`gn-rep-salle ${etat}`} disabled={!prenable || occupe}
                  title={!moi ? "Annonce-toi pour prendre une salle" : s.pseudo && !mienne ? `Prise par ${s.pseudo} : demande-la-lui (« Demander une place », sous Mes positions)` : mienne ? "Libérer cette salle" : `Prendre cette salle pour ${moi.pseudo}`}
                  onClick={() => moi && agir({ action: "salle", salle: s.cle, pseudo: mienne && s.pseudo ? s.pseudo : moi.pseudo })}>
                  <span className="gn-rep-salle-nom">{s.label}</span>
                  <span className="gn-rep-occupant">
                    {s.pseudo ? <>{joueur(s.pseudo) && <ClassLogo name={joueur(s.pseudo)!.classe} size={18} />}<span>{s.pseudo}</span></> : <span>personne !</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── PHASE 2 : LES ÉQUIPES DES JUMEAUX (§4.4) ── */}
        <div className="fx-card" style={card}>
          <h2 className="font-heading" style={{ ...titre, marginBottom: 4 }}><Icon name="users" size={17} />Phase 2 — Les Jumeaux</h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
            Kraavus et Kraavos doivent mourir à 4 s d&apos;écart au plus : deux équipes de même force. Chacune : 1 tank et 4 DPS, magiques ou physiques.
          </p>
          <div className="gn-rep-equipes">
            {EQUIPES.map((eq) => equipeBloc(eq, rep.jumeaux[eq]))}
          </div>
          {vue.degats && rep.ecartJumeaux !== null && (
            <div className={`gn-rep-ecart ${niveauEcart(rep.ecartJumeaux)}`} title="Des chiffres DÉCLARÉS dans l'AirBuilder, jamais vérifiés : un ordre de grandeur, pas une mesure">
              <Icon name={niveauEcart(rep.ecartJumeaux) === "ok" ? "check" : "alert"} size={13} style={{ flexShrink: 0 }} />
              <span>Écart de dégâts déclarés entre les équipes : {rep.ecartJumeaux} %</span>
            </div>
          )}
          {rep.nonPlaces.length > 0 && (
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {/* Leur chiffre DÉCLARÉ aussi (décision 9) : c'est en les plaçant qu'on équilibre les équipes. */}
              Pas encore placés : {rep.nonPlaces.map((x) => nomEl(x, { chiffre: true }))}
            </div>
          )}
          {isAdmin && !fige && n > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: .7, color: "var(--text-muted)", marginBottom: 8 }}>Placer · échanger (staff)</div>
              <div className="gn-rep-staff">
                {vue.participants.map((p) => {
                  const k = cleJoueur(p.pseudo);
                  const place = PLACES.find((x) => [...rep.jumeaux[equipeDe(x)][roleDe(x)]].some((y) => cleJoueur(y) === k)) ?? null;
                  const autres = vue.participants.filter((x) => cleJoueur(x.pseudo) !== k).flatMap((x) => {
                    const pl = PLACES.find((y) => rep.jumeaux[equipeDe(y)][roleDe(y)].some((z) => cleJoueur(z) === cleJoueur(x.pseudo)));
                    return pl ? [{ value: `ech:${x.pseudo}`, label: `Échanger avec ${x.pseudo} (${libellePlace(pl)})` }] : [];
                  });
                  return (
                    <div key={p.pseudo} className="gn-param-ligne gn-rep-staff-ligne">
                      {nomEl(p.pseudo)}
                      <VgSelect full value={place ?? ""} placeholder="Placer…"
                        options={[
                          ...placesPermises(p).map((x) => ({ value: x, label: placeCourte(x) })),
                          ...(place ? [{ value: "retirer", label: "— Retirer de son équipe —" }] : []),
                          ...autres,
                        ]}
                        onChange={(v) => {
                          if (v === place) return;
                          if (v === "retirer") agir({ action: "jumeau_retirer", pseudo: p.pseudo });
                          else if (v.startsWith("ech:")) agir({ action: "jumeau_echanger", pseudo: p.pseudo, avec: v.slice(4) });
                          else agir({ action: "jumeau", place: v, pseudo: p.pseudo, force: true });
                        }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── PHASE 3 ET ARAIGNÉE : CALCULÉS, PAS MODIFIABLES (§4.6) ── */}
        {rc && (
          <div className="fx-card" style={card}>
            <div className="gn-rep-calcul">
              <div style={{ minWidth: 0 }}>
                <h2 className="font-heading" style={{ ...titre, marginBottom: 4 }}><Icon name="statue" size={17} />Phase 3 — {rc.golems.nom}</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px" }}>
                  {rc.golems.depuis === "jumeaux" ? "Les équipes des jumeaux, déjà équilibrées : Verte à gauche, Rouge à droite." : "Calculées : un tank de chaque côté, chaque classe partagée."}
                </p>
                {(["gauche", "droite"] as const).map((cote) => (
                  <div key={cote} className="gn-rep-role" style={{ marginBottom: 10 }}>
                    <span className="gn-rep-role-nom"><Icon name={cote === "gauche" ? "arrow-left" : "arrow-right"} size={12} />{cote === "gauche" ? "Gauche" : "Droite"}</span>
                    {rc.golems[cote].length ? rc.golems[cote].map((m) => nomEl(m.pseudo, { suffixe: m.tank ? "— tank" : undefined })) : <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>personne</span>}
                    {(cote === "gauche" ? rc.golems.resumeGauche : rc.golems.resumeDroite) && <i style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{cote === "gauche" ? rc.golems.resumeGauche : rc.golems.resumeDroite}</i>}
                  </div>
                ))}
                {rc.golems.consigne && <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />{rc.golems.consigne}</div>}
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 className="font-heading" style={{ ...titre, marginBottom: 4 }}><Icon name="target" size={17} />Araignée — rotations</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px" }}>Jamais deux joueurs de la même classe dans une rotation ; les tanks de l&apos;araignée n&apos;en font pas partie.</p>
                {([["r1", "Rotation 1"], ["r2", "Rotation 2"]] as const).map(([k, nom]) => (
                  <div key={k} className="gn-rep-role" style={{ marginBottom: 10 }}>
                    <span className="gn-rep-role-nom">{nom}</span>
                    {rc.araignee[k].length ? rc.araignee[k].map((x) => nomEl(x)) : <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>personne</span>}
                  </div>
                ))}
                {rc.araignee.reserve.length > 0 && (
                  <div className="gn-rep-role" style={{ marginBottom: 10 }}>
                    <span className="gn-rep-role-nom">Remplaçant{rc.araignee.reserve.length > 1 ? "s" : ""} debuff</span>
                    {rc.araignee.reserve.map((x) => nomEl(x))}
                    <i style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Debuff seulement si celui de sa classe est raté.</i>
                  </div>
                )}
                {/* Le même encadré que la consigne des golems, sa voisine. */}
                {rc.araignee.consignes.length > 0 && (
                  <div className="gn-panne" style={{ alignItems: "flex-start" }}>
                    <Icon name="alert" size={14} style={{ flexShrink: 0, marginTop: 3 }} />
                    <ul className="gn-rep-consignes">{rc.araignee.consignes.map((c, i) => <li key={i}>{c}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── LE RÉCAP, TEL QU'IL PARTIRA SUR DISCORD (M5) ── */}
        {rc && (
          <div className="fx-card" style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 className="font-heading" style={titre}><Icon name="clipboard" size={17} />Le récap, tel qu&apos;il partira sur Discord{rc.heure ? ` à ${heureDite(rc.heure)}` : ""}</h2>
              <button type="button" className="gn-cs-discord-btn" style={{ marginLeft: "auto" }} onClick={() => setRecapOuvert(!recapOuvert)} aria-expanded={recapOuvert}>
                <Icon name={recapOuvert ? "chevron-up" : "chevron-down"} size={12} />{recapOuvert ? "Replier" : "Déplier"}
              </button>
            </div>
            {recapOuvert && <ApercuRecap rc={rc} vue={vue} nomEl={nomEl} />}
          </div>
        )}
      </>)}
    </>
  );
}

/** L'aperçu du récap : les blocs de M5, dans l'ordre, avec les logos de classe à la place des
 *  émojis du serveur. Ce que les membres liront à 20 h 40. */
function ApercuRecap({ rc, vue, nomEl }: { rc: NonNullable<Vue["recap"]>; vue: Vue; nomEl: (pseudo: string, o?: { chiffre?: boolean; suffixe?: string }) => React.ReactElement }) {
  const champ = (nom: string, contenu: React.ReactNode) => (
    <div style={{ minWidth: 0 }}><div className="gn-rep-champ-nom">{nom}</div><div className="gn-rep-liste">{contenu}</div></div>
  );
  const vide = <span style={{ color: "var(--text-muted)" }}>▫️ personne</span>;
  const noms = (l: string[], chiffre = false) => (l.length ? l.map((x) => nomEl(x, { chiffre })) : vide);
  const membres = (l: { pseudo: string; tank: boolean }[]) => (l.length ? l.map((m) => nomEl(m.pseudo, { suffixe: m.tank ? "— tank" : undefined })) : vide);
  const n = vue.participants.length;
  return (
    <div className="gn-rep-embed">
      <div className="gn-rep-embed-titre">📋 Chambre Secrète — {vue.label.split(" · ")[0]} · récap</div>
      <div style={{ color: "var(--text-muted)" }}>👥 {n} / {rc.places} joueurs{rc.phrase.trim() ? ` · ${enSuite(rc.phrase.trim())}` : ""}</div>
      <div className="gn-rep-champs">
        {champ("🛡️ Tanks", noms(rc.tanks, vue.degats))}
        {champ("🔮 DPS magiques", noms(rc.mag, vue.degats))}
        {champ("⚔️ DPS physiques", noms(rc.phy, vue.degats))}
      </div>
      {champ("🌳 Phase 1 — Asuras (salles)", (<>
        {rc.phase1.length === 0 && !rc.sansJoueur.length && vide}
        {rc.phase1.map((x) => <span key={x.libelle + x.pseudo} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}><b>{x.libelle}</b> → {nomEl(x.pseudo)}</span>)}
        {rc.sansJoueur.length > 0 && <span style={{ color: "var(--gold)" }}>⚠️ Sans joueur : {rc.sansJoueur.join(", ")}</span>}
      </>))}
      <div className="gn-rep-champs deux">
        {champ("👯 Phase 2 — 🟩 Équipe Verte", membres(rc.jumeaux.vert))}
        {champ("👯 Phase 2 — 🟥 Équipe Rouge", membres(rc.jumeaux.rouge))}
      </div>
      <div className="gn-rep-champs deux">
        {champ(`🗿 Phase 3 — ${singulier(rc.golems.nom)} ⬅️ gauche`, (<>{membres(rc.golems.gauche)}{rc.golems.resumeGauche && <i style={{ color: "var(--text-muted)" }}>{rc.golems.resumeGauche}</i>}</>))}
        {champ(`🗿 Phase 3 — ${singulier(rc.golems.nom)} ➡️ droite`, (<>{membres(rc.golems.droite)}{rc.golems.resumeDroite && <i style={{ color: "var(--text-muted)" }}>{rc.golems.resumeDroite}</i>}</>))}
      </div>
      {rc.golems.consigne && <div>⚠️ {rc.golems.consigne}</div>}
      <div className="gn-rep-champs deux">
        {champ("🕷️ Araignée — 1️⃣ Rotation 1", noms(rc.araignee.r1))}
        {champ("🕷️ Araignée — 2️⃣ Rotation 2", noms(rc.araignee.r2))}
      </div>
      {rc.araignee.reserve.length > 0 && champ(`🔁 Remplaçant${rc.araignee.reserve.length > 1 ? "s" : ""} debuff`, (<>{noms(rc.araignee.reserve)}<i style={{ color: "var(--text-muted)" }}>Debuff seulement si celui de sa classe est raté.</i></>))}
      {rc.araignee.consignes.length > 0 && <div>⚠️ Araignée : {phraseConsignes(rc.araignee.consignes)}</div>}
      <div className="gn-rep-embed-pied">GENESIS · Chambres Secrètes{rc.pied ? ` · ${rc.pied}` : ""}</div>
    </div>
  );
}
