"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClassLogo } from "@/components/ClassLogo";
import { Icon } from "@/components/Icon";
import { VgSelect } from "@/components/VgSelect";
import { ChiffreDeclare } from "@/components/chambres/ChiffreDeclare";
import { LignePanneau, type EtatDiscord } from "@/components/chambres/PanneauDiscord";
import { classeAffichee } from "@/lib/compositions";
import { NOMS_CLASSES, effectifGS, heureDite, partiesParis, type ChiffreFige, type CreneauGS } from "@/lib/evenements";

/**
 * L'ONGLET GUILD SIEGE de /compositions (SPEC-CHAMBRES-RECENSEMENT §11.3 ; lot 9).
 *
 * DÉCISION 2 DE MAXIME : le Guild Siege est codé et réglable, mais INACTIF tant que le staff ne
 * l'allume pas (« le PvP n'est pas encore installé »). Éteint, l'onglet reste « En standby »,
 * comme avant ; les bras droits y trouvent le lien vers son paramétrage. Allumé, il montre la
 * séance qui vient (son créneau, la fin d'inscription de la guilde), « Je viens avec : [perso] »
 * et « Pas cette fois », la liste de qui vient avec le chiffre DÉCLARÉ de chacun (son stuff DPS,
 * à défaut Tank, à défaut Off tank — décision 9 : daté, avec « à remesurer », jamais vérifié),
 * puis les derniers sièges et leur débrief.
 *
 * LIBRE : ni poste ni « retenu », un perso par compte et par séance — en choisir un autre
 * remplace le premier (route 12, `inscrireGS`). Le bouton « ✅ Je viens » du panneau Discord fait
 * le même geste sur la même ligne : l'onglet se relit toutes les 15 s.
 *
 * Pour le staff : « Ils étaient là » (la clôture, la même fenêtre que les Chambres), annuler ou
 * rétablir la séance, et le panneau Discord (le voir, le republier). Sur ses propres routes :
 * jamais `sauver()` de la page, qui renvoie toute la composition.
 */

type Joueur = { pseudo: string; classe: string; player: string; moi: boolean; annonceAt: number; chiffres: ChiffreFige[]; enLigne: string };
type VueGS = {
  cle: string; label: string; date: string; debut: number; commencee: boolean;
  annulee: boolean; motif: string | null; cloturee: boolean;
  degats: boolean; participants: Joueur[]; places: number | null; moiCache: boolean;
  inscription: { ouverte: boolean; raison: string | null };
  gs: { finInscription: string | null; regle: string; actif: boolean };
  discord: EtatDiscord | null;
};
type Lecture = { actif: boolean; creneaux: CreneauGS[]; places: number | null; regle: string };
type Perso = { id: string; name: string; class: string };
type Siege = { cle: string; date: string; annulee: boolean; resultat: string | null; cloturee: boolean; presents: number | null; annonces?: number | null; videos: number; debrief: string | null };

const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };
const titre: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, color: "var(--gn-accent)", textTransform: "uppercase", fontSize: 15, letterSpacing: 1, margin: 0 };
/** Le « Pas cette fois » de la fenêtre « Je serai là » de la même page. */
const pasCetteFois: React.CSSProperties = { fontSize: 12.5, padding: "9px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" };

/** « dans 2 j 4 h », « dans 40 min », « en cours » — le délai de « Prochaine séance ». */
const delai = (ms: number) => {
  const min = Math.round((ms - Date.now()) / 60_000);
  if (min <= 0) return "en cours";
  if (min < 60) return `dans ${min} min`;
  const h = Math.floor(min / 60), j = Math.floor(h / 24);
  return j > 0 ? `dans ${j} j ${h % 24} h` : `dans ${h} h`;
};
const court = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
};
const nomClasse = (c: string) => NOMS_CLASSES[classeAffichee(c)] ?? c;

export function GuildSiege({ isAdmin, onCloturer, onVoirBilan, rafraichir }: {
  isAdmin: boolean;
  /** « Ils étaient là » sur une séance du siège (la dernière commencée par défaut). */
  onCloturer: (cle: string) => void;
  /** « Voir le débrief » : l'onglet Bilans, filtre Guild Siege, cette séance ouverte. */
  onVoirBilan: (cle: string) => void;
  rafraichir: number;
}) {
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [panne, setPanne] = useState(false);
  const [vue, setVue] = useState<VueGS | null>(null);
  const [erreurVue, setErreurVue] = useState("");
  const [persos, setPersos] = useState<Perso[]>([]);
  const [choix, setChoix] = useState("");
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<{ ok: boolean; texte: string } | null>(null);
  const [derniers, setDerniers] = useState<Siege[] | null>(null);
  const [publication, setPublication] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/evenements/lecture?evenement=gs", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Lecture) => { setLecture(j); setPanne(false); })
      .catch(() => setPanne(true));
  }, [rafraichir]);

  const actif = !!lecture?.actif && lecture.creneaux.length > 0;
  const lireVue = useCallback(() => {
    // La séance qu'on PRÉPARE : celle qui se joue ce soir se clôture par « Ils étaient là ».
    fetch("/api/seances/gs_prochaine", { cache: "no-store" })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error ?? "Le Guild Siege n'a pas pu être lu."); return j as VueGS; })
      .then((j) => { setVue(j); setErreurVue(""); })
      .catch((e: Error) => setErreurVue(e.message));
    fetch("/api/seances/historique?evenement=gs&limite=6", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { seances?: Siege[] } | null) => setDerniers(j?.seances ?? []))
      .catch(() => setDerniers([]));
  }, []);
  useEffect(() => {
    if (!actif) return;
    lireVue();
    // Un « Je viens » cliqué sur Discord se voit ici sans recharger.
    const t = setInterval(lireVue, 15_000);
    return () => clearInterval(t);
  }, [actif, lireVue, rafraichir]);
  useEffect(() => {
    if (!actif) return;
    fetch("/api/characters").then((r) => (r.ok ? r.json() : [])).then((l: Perso[]) => setPersos(Array.isArray(l) ? l : [])).catch(() => {});
  }, [actif]);

  const moi = vue?.participants.find((p) => p.moi) ?? null;
  // Le perso proposé : celui déjà annoncé, sinon le premier (le principal d'abord).
  useEffect(() => {
    if (moi) setChoix(moi.pseudo);
    else if (!choix && persos[0]) setChoix(persos[0].name);
  }, [moi?.pseudo, persos]); // eslint-disable-line react-hooks/exhaustive-deps

  const annoncer = async (viens: boolean) => {
    if (!vue) return;
    setBusy(true); setVerdict(null);
    const r = await fetch(`/api/seances/${encodeURIComponent(vue.cle)}/inscription`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pseudo: choix, viens }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    setVerdict(r && r.ok ? { ok: true, texte: j.message ?? "C'est noté." } : { ok: false, texte: j.error ?? "Le serveur n'a pas répondu : réessaie dans un instant." });
    lireVue();
  };

  const annulerSeance = async (annulee: boolean) => {
    if (!vue) return;
    let motif = "";
    if (annulee) {
      const m = window.prompt(`Annuler le Guild Siege du ${vue.label} ?\nUn motif pour les membres (facultatif, 200 signes) :`, "");
      if (m === null) return;
      motif = m.trim();
    } else if (!window.confirm("Rétablir ce Guild Siege ?")) return;
    const r = await fetch(`/api/seances/${encodeURIComponent(vue.cle)}/annuler`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ annulee, motif }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) window.alert(j.error ?? "Le serveur a refusé.");
    lireVue();
  };

  /** « Publier » / « Republier » le panneau (route 11) : sans mention, l'ancien fermé. */
  const republier = async () => {
    if (!vue) return;
    setPublication("Demande envoyée au bot…");
    const r = await fetch(`/api/seances/${encodeURIComponent(vue.cle)}/discord`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoi: "panneau" }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) { setPublication(null); window.alert(j.error ?? "Le serveur a refusé."); return; }
    lireVue();
    for (const ms of [4000, 9000, 15000, 25000]) setTimeout(lireVue, ms);
    setTimeout(() => setPublication(null), 26000);
  };

  if (panne) return <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />Le Guild Siege n&apos;a pas pu être lu.</div>;
  if (!lecture) return <div style={{ ...card, fontSize: 13, color: "var(--text-muted)" }}>Chargement…</div>;

  /* ── Éteint (le défaut, décision 2) : « En standby », comme avant ── */
  if (!actif) {
    return (
      <div style={{ ...card, textAlign: "center", padding: 40 }}>
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "center", color: "var(--text-muted)" }}><Icon name="sword" size={44} /></div>
        <div className="gn-gs-standby"><Icon name="clock" size={12} />En standby</div>
        <h2 className="font-heading" style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Guild Siege</h2>
        {/* Rien à organiser ici pour l'instant : le dire franchement vaut mieux qu'une page qui
            ressemble à une page active. */}
        <p style={{ color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
          Aucune séance n&apos;est organisée pour le moment. Quand ça reprendra, ce sera <b style={{ color: "var(--text)" }}>libre</b> : pas de composition stricte, ramène ton meilleur perso, peu importe la classe. L&apos;essentiel c&apos;est d&apos;être présent et de jouer ensemble. <Icon name="zap" size={16} style={{ display: "inline-block", color: "var(--gn-accent)" }} />
        </p>
        {isAdmin && (
          <div style={{ marginTop: 18, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {lecture.actif ? "Activé, mais sans créneau : il ne s'ouvre qu'avec un jour et une heure." : "Codé et réglable, éteint tant que le PvP n'est pas installé."}
            </span>
            <Link href="/discord/evenements#gs" className="gn-cs-discord-btn"><Icon name="settings" size={12} />Paramétrer le Guild Siege</Link>
          </div>
        )}
      </div>
    );
  }

  const ouverte = !!vue?.inscription.ouverte;
  const aujourdhui = partiesParis(new Date()).date;
  const passes = (derniers ?? []).filter((x) => x.cle !== vue?.cle && x.date <= aujourdhui).slice(0, 5);
  const fin = vue?.gs.finInscription;
  return (
    <>
      <div className="fx-card" style={{ ...card, borderColor: "rgba(var(--gn-or-rgb),.32)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <h2 className="font-heading" style={titre}><Icon name="swords" size={17} />Guild Siege</h2>
          {vue && <span className="font-heading" style={{ fontWeight: 700, fontSize: 15 }}>{vue.label}</span>}
          {vue && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{vue.annulee ? "annulé" : vue.cloturee ? "clôturé" : delai(vue.debut)}</span>}
          {fin && (
            <span className="gn-gs-fin" title="L'inscription de la GUILDE au siège, côté jeu : le staff s'en charge">
              <Icon name="clock" size={12} />Inscription de la guilde avant {heureDite(fin)}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.6 }}>{vue?.gs.regle ?? lecture.regle}</p>

        {erreurVue && <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />{erreurVue}</div>}
        {!vue && !erreurVue && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Chargement de la séance…</div>}

        {vue && (
          <>
            {vue.annulee && <div className="gn-panne" style={{ marginBottom: 12 }}><Icon name="ban" size={14} style={{ flexShrink: 0 }} />Guild Siege annulé{vue.motif ? ` — ${vue.motif}` : ""}.</div>}

            {/* ── « Je viens avec : [perso] » · « Pas cette fois » ── */}
            {vue.moiCache ? (
              <div className="gn-panne" style={{ marginBottom: 12 }}><Icon name="ban" size={14} style={{ flexShrink: 0 }} />Ton compte n&apos;apparaît pas dans la liste de la guilde : vois avec le staff.</div>
            ) : ouverte ? (
              persos.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 12 }}>Crée un personnage dans ton profil pour annoncer ta présence.</div>
              ) : (
                <div className="gn-gs-inscription">
                  <span className="gn-param-lab" style={{ margin: 0 }}>Je viens avec</span>
                  <div className="gn-gs-choix">
                    <VgSelect full value={choix} onChange={setChoix} options={persos.map((p) => ({ value: p.name, label: `${p.name} · ${nomClasse(p.class)}` }))} />
                  </div>
                  <button type="button" className="vg-btn" disabled={busy || !choix || moi?.pseudo === choix} onClick={() => annoncer(true)}
                    title={moi && moi.pseudo !== choix ? "Un perso par séance : il remplace celui annoncé" : undefined}>
                    <Icon name={moi ? (moi.pseudo === choix ? "check" : "swap") : "plus"} size={14} />
                    {moi ? (moi.pseudo === choix ? "Je suis annoncé·e" : "Venir avec lui") : "Je viens"}
                  </button>
                  {moi && <button type="button" style={pasCetteFois} disabled={busy} onClick={() => annoncer(false)}>Pas cette fois</button>}
                </div>
              )
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="lock" size={12} />{vue.inscription.raison}
              </div>
            )}
            {verdict && (
              <div role="status" aria-live="polite" className="gn-rep-verdict" style={{ color: verdict.ok ? "var(--green)" : "var(--gn-crimson-texte)", marginBottom: 10 }}>
                <Icon name={verdict.ok ? "check" : "alert"} size={14} style={{ flexShrink: 0 }} /><span>{verdict.texte}</span>
              </div>
            )}

            {/* ── Qui vient, avec son chiffre DÉCLARÉ ── */}
            <div className="gn-gs-compte">
              <Icon name="users" size={13} />{effectifGS(vue.participants.length, vue.places)}
              {vue.places !== null && vue.participants.length >= vue.places && <span style={{ color: "var(--green)" }}>· au complet</span>}
            </div>
            {vue.participants.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>Personne ne s&apos;est encore annoncé.</div>
            ) : (
              <div className="gn-gs-liste">
                {vue.participants.map((p) => (
                  <div key={p.pseudo} className={`gn-gs-joueur${p.moi ? " moi" : ""}`}>
                    <ClassLogo name={p.classe} size={24} />
                    <span className="gn-gs-joueur-nom">
                      <b>{p.pseudo}</b>
                      <span>{nomClasse(p.classe)}</span>
                    </span>
                    {p.enLigne
                      ? <ChiffreDeclare enLigne={p.enLigne} chiffres={p.chiffres} style={{ fontSize: 12, marginLeft: "auto", fontWeight: 600 }} />
                      : vue.degats && <span className="gn-gs-sans">sans mesure</span>}
                  </div>
                ))}
              </div>
            )}
            {vue.degats && vue.participants.length > 0 && (
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "10px 0 0", lineHeight: 1.55 }}>
                Le chiffre de son stuff DPS, à défaut Tank, à défaut Off tank — DÉCLARÉ dans l&apos;AirBuilder, jamais vérifié : la date au survol, et le témoin « à remesurer ».
              </p>
            )}

            {/* ── Les gestes du staff ── */}
            {isAdmin && (
              <>
                <div className="gn-gs-staff">
                  <button type="button" className="gn-cs-discord-btn" onClick={() => onCloturer("gs_derniere")} title="Cocher qui était là au dernier Guild Siege joué">
                    <Icon name="medal" size={12} />Ils étaient là
                  </button>
                  {!vue.cloturee && (
                    <button type="button" className="gn-cs-discord-btn" onClick={() => annulerSeance(!vue.annulee)}>
                      <Icon name={vue.annulee ? "rotate-ccw" : "ban"} size={12} />{vue.annulee ? "Rétablir la séance" : "Annuler la séance"}
                    </button>
                  )}
                  <Link href="/discord/evenements#gs" className="gn-cs-discord-btn"><Icon name="settings" size={12} />Paramétrer</Link>
                </div>
                {vue.discord && <LignePanneau gs d={vue.discord} annulee={vue.annulee || vue.cloturee} enCours={publication} onPublier={republier} />}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Les derniers sièges : ceux déjà joués (ou qui se jouent), jamais celui qu'on prépare ── */}
      {passes.length > 0 && (
        <div className="fx-card" style={card}>
          <h2 className="font-heading" style={{ ...titre, marginBottom: 12 }}><Icon name="trophy" size={17} />Derniers sièges</h2>
          <div style={{ display: "grid", gap: 6 }}>
            {passes.map((x) => (
              <div key={x.cle} className="gn-gs-siege">
                <b style={{ textTransform: "capitalize" }}>{court(x.date)}</b>
                <span>
                  {x.annulee ? <span style={{ color: "var(--text-muted)" }}>annulé</span>
                    : x.resultat === "gagne" ? <b style={{ color: "var(--green)" }}>GAGNÉ</b>
                      : x.resultat === "perdu" ? <b style={{ color: "var(--gn-crimson-texte)" }}>PERDU</b> : <span style={{ color: "var(--text-muted)" }}>résultat à venir</span>}
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  {x.cloturee ? `${x.presents} présent${(x.presents ?? 0) > 1 ? "s" : ""}` : x.annonces ? `${x.annonces} annoncé${x.annonces > 1 ? "s" : ""}` : "—"}
                  {x.videos > 0 && ` · ${x.videos} vidéo${x.videos > 1 ? "s" : ""}`}
                </span>
                <button type="button" className="gn-cs-discord-btn" onClick={() => onVoirBilan(x.cle)}><Icon name="eye" size={12} />Voir le débrief</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
