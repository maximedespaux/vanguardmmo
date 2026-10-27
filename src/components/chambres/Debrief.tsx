"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ClassLogo } from "@/components/ClassLogo";
import { Icon } from "@/components/Icon";
import { vgConfirm } from "@/components/Dialogs";
import { ChiffreDeclare } from "@/components/chambres/ChiffreDeclare";
import { JoindreVideo, LecteurVideo, LigneVideo, etapeDite } from "@/components/chambres/Videos";
import { trierVideos, type VueVideo } from "@/lib/videos";
import type { Etape } from "@/lib/evenements";
import type { JoueurDebrief, VueDebrief } from "@/lib/seances-serveur";
import {
  A_RETENIR_MAX, EQUIPES, LIBELLE_STATUT, NOM_EQUIPE, REMARQUE_MAX, ROLES_JUMEAU, ROLE_JUMEAU_LABEL, STATUTS_ETAPE, avantDuPatch, equipeDe, etapeSuivante, fmtDuree,
  lireDuree, momentDe, roleDe, texteDuPatch, type Ecart, type IssueSeance, type LigneDebrief, type PatchDebrief, type StatutEtape,
} from "@/lib/chambres";

/**
 * LE DÉBRIEF D'UNE SÉANCE, dans l'onglet Bilans de /compositions (SPEC-CHAMBRES-RECENSEMENT
 * §4.10, §7.5 ; lot 6).
 *
 * CE QUE LIT UN MEMBRE, une fois le débrief publié : le résultat, le temps total et son écart à
 * la séance publiée juste avant, l'analyse (étape la plus longue, « mal deux fois de suite »),
 * « à retenir », chaque étape avec son statut, son chrono, son écart, sa remarque et ses monstres
 * (décision 8) ; puis les joueurs de la séance et leurs chiffres DÉCLARÉS, tels que la clôture
 * les a figés ce soir-là (décision 9 : jamais comme des valeurs vérifiées).
 *
 * CE QUE FAIT LE STAFF : le même écran, plus le PARCOURS d'une étape à la fois (`DebriefView` du
 * modèle, bot.py:1925-1966) — Bien, Moyen ou Mal enregistre et passe à la suivante ; le chrono
 * et la remarque s'enregistrent à la sortie du champ, sans bouton « Enregistrer » ; un chrono
 * vidé fait revenir la mesure du chrono en direct. Puis « Publier » (route 8) : sur le site, et —
 * une fois la bascule faite — en image dans le salon des débriefs de Discord (lot 7). L'aperçu de
 * l'image (route 14) se regarde avant ; où en est Discord (en file, publié, échec et sa raison) se
 * lit sous le titre.
 *
 * LES VIDÉOS (lot 8, §10.4) : sous chaque étape, celles qui la montrent, avec « Lire » qui ouvre
 * la vidéo AU BON MOMENT ; celles de toute la séance dans un bloc à part. Le staff seul les joint
 * (décision 3 de Maxime) — depuis la lecture (« Joindre une vidéo ») ou l'étape du parcours —, les
 * modifie et les supprime. Un lien de Discord (`&video={id}`, M7) ouvre directement son lecteur.
 *
 * Il lit et écrit ses propres routes (route 4 `?partie=debrief`, routes 7, 8, 15 à 19) : jamais
 * `sauver()` de la page, qui renvoie toute la composition (§5.2).
 *
 * LE GUILD SIEGE (lot 9, §11.2) : le même écran, SIMPLIFIÉ — sans étapes par défaut, le parcours
 * tient en son résultat, « à retenir » et ses vidéos ; s'il a des manches (paramétrage), elles se
 * notent comme les étapes d'une Chambre. Pas de temps total sans étape, pas d'image : il part sur
 * Discord en embed.
 */

/** La publication du débrief sur Discord (route 4, `publication`) : la dernière commande
 *  `seance_debrief`. `bascule` : null pour un membre. */
type Publication = { statut: "aucune" | "en_file" | "faite" | "echec"; lien: string | null; erreur: string | null; le: number | null; bascule: boolean | null };
type Vue = {
  cle: string; evenement: "cs" | "gs"; date: string; label: string; debut: number; commencee: boolean; existe: boolean;
  annulee: boolean; motif: string | null; cloturee: boolean; clotureAt: number | null; cloturePar: string | null;
  etapes: Etape[]; phases: Record<string, string>; figees: boolean;
  salles: { cle: string; label: string }[]; degats: boolean;
  debrief: VueDebrief; publication: Publication;
  /** Les vidéos que l'appelant peut voir (lot 8) ; `joindre` : le staff, sur une séance jouée. */
  videos: VueVideo[]; joindre: boolean;
};

const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };
const titre: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, color: "var(--gn-accent)", textTransform: "uppercase", fontSize: 15, letterSpacing: 1, margin: 0 };

/** « 21/10 à 15:02 », à l'heure de Paris. */
const leA = (ms: number) => {
  const d = new Date(ms);
  return `${d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" })} à ${d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })}`;
};
const classeEcart = (e: Ecart) => (e.signe < 0 ? "plus-rapide" : e.signe > 0 ? "plus-lent" : "egal");
const titreEcart = (e: Ecart, quand: string | null) =>
  `${e.signe < 0 ? "Plus rapide" : e.signe > 0 ? "Plus lent" : "Même temps"} que ${quand ? `le ${quand}` : "la fois précédente"}`;

/** La pastille d'un statut : Bien en vert, Moyen en or, Mal en crimson, « — » atténué. */
function Statut({ s }: { s: StatutEtape | null }) {
  return <span className={`gn-deb-statut ${s ?? "vide"}`}>{s ? LIBELLE_STATUT[s] : "—"}</span>;
}

/** Les monstres d'une étape (décision 8) : un nom en or mène à sa fiche, comme dans le déroulé. */
function Monstres({ e }: { e: Etape }) {
  if (!e.monstres.length) return null;
  return (
    <span className="gn-param-monstres gn-deb-monstres">
      {e.monstres.map((m, i) => m.id
        ? <a key={i} className="gn-monstre" href={`/monstres/${encodeURIComponent(m.id)}`} title="Voir sa fiche : PV, vies, résistances"><span>{m.nom}</span></a>
        : <span key={i} className="gn-monstre" title="Pas de fiche : absent du relevé du client"><span>{m.nom}</span></span>)}
    </span>
  );
}

export function Debrief({ cle, isAdmin, parcoursInitial = false, videoInitiale = null, onChange, onCloturer }: {
  cle: string; isAdmin: boolean; parcoursInitial?: boolean;
  /** Une vidéo à ouvrir d'emblée (`&video={id}` dans l'adresse : le lien du débrief sur Discord). */
  videoInitiale?: string | null;
  /** Le débrief a changé (note, publication) : la liste des séances se relit. */
  onChange?: () => void;
  /** « Ils étaient là » sur CETTE séance (staff). */
  onCloturer?: (cle: string) => void;
}) {
  const [vue, setVue] = useState<Vue | null>(null);
  const [erreur, setErreur] = useState("");
  const [parcours, setParcours] = useState(parcoursInitial && isAdmin);
  const [i, setI] = useState(0);
  /** Les écritures en vol : elles partent L'UNE APRÈS L'AUTRE (`file`), jamais en parallèle ni
   *  perdues — taper une remarque puis cliquer « Mal » fait deux écritures, dans cet ordre. */
  const [busy, setBusy] = useState(0);
  const file = useRef<Promise<unknown>>(Promise.resolve());
  const [verdict, setVerdict] = useState<{ ok: boolean; texte: string } | null>(null);
  /** Les champs du parcours : la saisie en cours, comparée à ce qui est enregistré. */
  const [chrono, setChrono] = useState("");
  const [remarque, setRemarque] = useState("");
  const [aRetenir, setARetenir] = useState("");
  /** Les saisies telles que le serveur les a rendues en dernier (chargement, ou réponse d'une
   *  écriture). Chaque écriture envoie ce qu'elles disaient des champs qu'elle change (`avant`) :
   *  une saisie faite entre-temps par un autre membre du staff — ici ou dans Discord, décision 1 —
   *  n'est pas écrasée sans le dire. Dans une ref, à jour avant même le rendu : deux écritures à
   *  la suite dans la file ne se prennent pas l'une l'autre pour un conflit. */
  const vues = useRef<VueDebrief["saisies"]>(null);
  /** La vidéo en lecture, et le formulaire « Joindre » ouvert (avec l'étape choisie d'avance). */
  const [lecture, setLecture] = useState<VueVideo | null>(null);
  const [joindre, setJoindre] = useState<{ etape: string | null } | null>(null);
  const videoOuverte = useRef(false);

  const charger = useCallback(async () => {
    const r = await fetch(`/api/seances/${encodeURIComponent(cle)}?partie=debrief`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) { setErreur(j.error ?? "Le débrief n'a pas pu être lu."); return; }
    setErreur("");
    vues.current = (j as Vue).debrief?.saisies ?? null;
    setVue(j as Vue);
  }, [cle]);
  useEffect(() => { setVue(null); charger(); }, [charger]);

  /* `&video={id}` : le lecteur s'ouvre dès que le débrief est lu — une seule fois. Une vidéo
     supprimée depuis (ou pas encore visible) : on le dit, plutôt que de ne rien faire. */
  useEffect(() => {
    if (!vue || !videoInitiale || videoOuverte.current) return;
    videoOuverte.current = true;
    // Déjà regardée (le lecteur fermé retire `video` de l'adresse) : un débrief relu après une
    // clôture ne la rouvre pas.
    if (new URLSearchParams(window.location.search).get("video") !== videoInitiale) return;
    const v = vue.videos.find((x) => x.id === videoInitiale);
    if (v) setLecture(v);
    else if (isAdmin || vue.debrief.publie) setVerdict({ ok: false, texte: "Cette vidéo n'est plus jointe au débrief." });
  }, [vue, videoInitiale, isAdmin]);
  const fermerLecture = useCallback(() => {
    setLecture(null);
    // Le lien de Discord a servi : l'adresse le retire, pour qu'un rechargement ne rouvre pas la vidéo.
    const q = new URLSearchParams(window.location.search);
    if (q.has("video")) { q.delete("video"); window.history.replaceState(null, "", `${window.location.pathname}?${q}`); }
  }, []);
  const jointe = (v: VueVideo) => {
    setVue((x) => (x ? { ...x, existe: true, videos: [...x.videos.filter((y) => y.id !== v.id), v] } : x));
    setJoindre(null);
    setVerdict({ ok: true, texte: `Vidéo jointe à ${v.etape ? `l'étape ${v.etape}` : "la séance"}.` });
    onChange?.();
  };
  const modifiee = (v: VueVideo) => {
    setVue((x) => (x ? { ...x, videos: x.videos.map((y) => (y.id === v.id ? v : y)) } : x));
    setLecture(v);
  };
  const supprimee = (id: string) => {
    setVue((x) => (x ? { ...x, videos: x.videos.filter((y) => y.id !== id) } : x));
    fermerLecture();
    setVerdict({ ok: true, texte: "Vidéo supprimée." });
    onChange?.();
  };

  /* Une publication EN FILE : le bot la prend sous 15 s. On relit la seule `publication` toutes les
     4 s (une minute au plus) — jamais le débrief entier, qui écraserait une saisie en cours. */
  const enFileDiscord = vue?.publication.statut === "en_file";
  useEffect(() => {
    if (!enFileDiscord) return;
    let n = 0;
    const t = setInterval(async () => {
      if (++n > 15) { clearInterval(t); return; }
      const r = await fetch(`/api/seances/${encodeURIComponent(cle)}?partie=debrief`, { cache: "no-store" }).catch(() => null);
      const j = r && r.ok ? await r.json().catch(() => null) : null;
      if (j?.publication) setVue((v) => (v ? { ...v, publication: j.publication } : v));
    }, 4000);
    return () => clearInterval(t);
  }, [enFileDiscord, cle]);

  const d = vue?.debrief ?? null;
  const resume = d?.resume ?? null;
  const lignes = resume?.lignes ?? [];
  const n = lignes.length;
  const courante: LigneDebrief | null = lignes[Math.min(i, Math.max(0, n - 1))] ?? null;
  const saisie = courante && d?.saisies ? d.saisies.notes[courante.etape.code] : undefined;

  /* Les champs suivent l'étape affichée et ce qui est enregistré. Pas de rafraîchissement
     périodique ici : rien n'écrase une saisie en cours. */
  const cleChamps = `${courante?.etape.code ?? ""}|${saisie?.chrono ?? ""}|${saisie?.remarque ?? ""}`;
  useEffect(() => {
    setChrono(saisie && saisie.chrono !== null ? fmtDuree(saisie.chrono) : "");
    setRemarque(saisie?.remarque ?? "");
  }, [cleChamps]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setARetenir(d?.saisies?.aRetenir ?? ""); }, [d?.saisies?.aRetenir]);

  /** Une écriture, mise à la suite des autres. */
  const enFile = (f: () => Promise<void>) => {
    setBusy((b) => b + 1);
    const p = file.current.then(f).finally(() => setBusy((b) => b - 1));
    file.current = p.catch(() => {});
    return p;
  };

  /** Une saisie (route 7). La réponse porte le débrief relu : l'écran se met à jour sans attendre.
   *  Un 409 (un autre membre du staff a changé ce champ entre-temps, ou la séance a bougé) : rien
   *  n'est écrit, le débrief se relit, et ce qui avait été tapé est rendu dans le verdict. */
  const enregistrer = (patch: PatchDebrief) => enFile(async () => {
    if (!vue) return;
    setVerdict(null);
    const corps: PatchDebrief = vues.current ? { ...patch, avant: avantDuPatch(patch, vues.current) } : patch;
    const r = await fetch(`/api/seances/${encodeURIComponent(vue.cle)}/debrief`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) {
      const tape = texteDuPatch(patch);
      const texte = j.error ?? "Le serveur n'a pas répondu : réessaie dans un instant.";
      setVerdict({ ok: false, texte: r?.status === 409 && tape ? `${texte} Ce que tu avais écrit : « ${tape} »` : texte });
      if (r?.status === 409) await charger();
      return;
    }
    vues.current = j.debrief?.saisies ?? vues.current;
    setVue((v) => (v ? { ...v, existe: true, figees: true, etapes: j.etapes ?? v.etapes, phases: j.phases ?? v.phases, debrief: j.debrief } : v));
    setVerdict({ ok: true, texte: j.message ?? "Enregistré." });
    onChange?.();
  });

  const noter = (s: StatutEtape) => {
    if (!courante) return;
    // Recliquer la note déjà posée la retire, sans changer d'étape ; une autre note enregistre et
    // passe aussitôt à la suivante (bot.py:1945-1950) — l'écriture suit, dans la file.
    if (saisie?.statut === s) { enregistrer({ etapes: { [courante.etape.code]: { statut: null } } }); return; }
    enregistrer({ etapes: { [courante.etape.code]: { statut: s } } });
    setI(etapeSuivante(i, n));
  };
  const sortirChrono = () => {
    if (!courante) return;
    const avant = saisie && saisie.chrono !== null ? fmtDuree(saisie.chrono) : "";
    if (chrono.trim() === avant) return;
    if (lireDuree(chrono) === undefined) { setVerdict({ ok: false, texte: "Chrono illisible : écris par exemple 2:34 ou 45s." }); return; }
    enregistrer({ etapes: { [courante.etape.code]: { chrono: chrono.trim() } } });
  };
  const sortirRemarque = () => {
    if (!courante || remarque.trim() === (saisie?.remarque ?? "")) return;
    enregistrer({ etapes: { [courante.etape.code]: { remarque } } });
  };
  const sortirARetenir = () => {
    if (aRetenir.trim() === (d?.saisies?.aRetenir ?? "")) return;
    enregistrer({ aRetenir });
  };
  const choisirResultat = (x: IssueSeance) => enregistrer({ resultat: d?.saisies?.resultat === x ? null : x });

  /** Publier (route 8) : sur le site, puis sur Discord après la bascule ; ou repasser en
   *  brouillon. À la suite des saisies en vol : on publie ce qui vient d'être tapé. Republier sur
   *  Discord envoie un NOUVEAU message : on le demande d'abord. */
  const publier = async (retirer = false) => {
    if (!vue) return;
    if (retirer && !(await vgConfirm("Repasser ce débrief en brouillon ?\nLes membres ne le verront plus tant qu'il n'est pas republié. Le message Discord, lui, reste."))) return;
    const dejaSurDiscord = !retirer && vue.publication.bascule && (vue.publication.statut === "faite" || vue.publication.statut === "en_file");
    if (dejaSurDiscord && !(await vgConfirm("Republier sur Discord ?\nUn NOUVEAU message part dans le salon des débriefs, avec l'image à jour ; l'ancien reste."))) return;
    await enFile(async () => {
      setVerdict(null);
      const r = await fetch(`/api/seances/${encodeURIComponent(vue.cle)}/debrief/publier`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(retirer ? { retirer: true } : {}),
      }).catch(() => null);
      const j = r ? await r.json().catch(() => ({})) : {};
      if (!r || !r.ok) { setVerdict({ ok: false, texte: j.error ?? "La publication a été refusée." }); return; }
      vues.current = j.debrief?.saisies ?? vues.current;
      setVue((v) => (v ? { ...v, existe: true, figees: true, debrief: j.debrief, publication: j.publication ? { ...j.publication, bascule: j.bascule ?? v.publication.bascule } : v.publication } : v));
      setVerdict({ ok: true, texte: j.message });
      if (!retirer) setParcours(false);
      onChange?.();
    });
  };

  /** Les vidéos rangées dans l'ordre du déroulé ; celles d'une étape, et celles de toute la
   *  séance (ou d'une étape que le déroulé n'a plus). */
  const videos = useMemo(() => (vue ? trierVideos(vue.videos, vue.etapes) : []), [vue]);
  const videosDe = (code: string) => videos.filter((v) => v.etape === code);
  const codes = useMemo(() => new Set(lignes.map((l) => l.etape.code)), [lignes]);
  const horsEtape = videos.filter((v) => !v.etape || !codes.has(v.etape));

  const parPhase = useMemo(() => (vue ? Object.keys(vue.phases).sort().map((k) => ({
    k, titre: vue.phases[k], lignes: lignes.map((l, idx) => ({ l, idx })).filter((x) => x.l.etape.phase === k),
  })).filter((p) => p.lignes.length) : []), [vue, lignes]);

  if (erreur && !vue) return <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />{erreur}</div>;
  if (!vue || !d) return <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Chargement du débrief…</div>;

  const a = d.analyse;
  const quand = a?.precedentLabel ?? null;
  const rienDeNote = !!d.saisies && !Object.keys(d.saisies.notes).length && !d.saisies.resultat && !d.saisies.aRetenir;
  const peutDebriefer = isAdmin && !vue.annulee && vue.commencee;
  const salle = (k: string) => vue.salles.find((s) => s.cle === k)?.label ?? k;
  /** Le Guild Siege (lot 9) : sans étapes, son débrief se fait d'un écran (résultat, à retenir, vidéos). */
  const gs = vue.evenement === "gs";
  const sansEtapes = n === 0;

  /* ── Pour un membre, rien tant que ce n'est pas publié ── */
  if (!isAdmin && !d.publie) {
    return (
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
        {vue.annulee ? `Séance annulée${vue.motif ? ` — ${vue.motif}` : ""}.` : "Le débrief de cette séance n'est pas encore publié : le staff le prépare."}
      </div>
    );
  }

  return (
    <div className="gn-deb">
      {/* ── L'EN-TÊTE : le résultat, le temps, l'écart, et d'où vient le débrief ── */}
      <div className="gn-deb-tete">
        <h3 className="font-heading gn-deb-titre">Retour — {vue.label.split(" · ")[0]}</h3>
        {resume?.resultat && <span className={`gn-deb-resultat ${resume.resultat}`}>{resume.resultat === "gagne" ? "Gagné" : "Perdu"}</span>}
        {!sansEtapes && <span className="gn-deb-temps" title={resume?.complet ? "Somme des chronos de chaque étape" : "Il manque le chrono d'au moins une étape"}>
          <span className="gn-deb-temps-lab">Temps total</span>
          {resume && resume.total > 0 ? <b>{fmtDuree(resume.total)}</b> : <span className="gn-deb-ecart egal">aucun chrono pris</span>}
          {a?.ecartTotal && <span className={`gn-deb-ecart ${classeEcart(a.ecartTotal)}`} title={titreEcart(a.ecartTotal, quand)}>{a.ecartTotal.texte}{quand ? ` vs ${quand}` : ""}</span>}
          {!a?.ecartTotal && resume && resume.total > 0 && !resume.complet && <span className="gn-deb-ecart egal">temps partiel</span>}
          {/* Le précédent peut n'avoir AUCUN chrono (le 18/10/2026, importé) : « pas de temps
              complet » dit vrai dans les deux cas, « temps partiel » non. */}
          {!a?.ecartTotal && a?.sansEcart === "precedent_partiel" && <span className="gn-deb-ecart egal" title="Sans chrono complet la fois précédente, pas d'écart">pas d&apos;écart : pas de temps complet le {quand}</span>}
        </span>}
      </div>
      <div className="gn-deb-sous">
        {d.nbJoueurs !== null && <span>{d.nbJoueurs} joueur{d.nbJoueurs > 1 ? "s" : ""}{d.nbJoueursSource === "import" ? " (liste inconnue)" : ""}</span>}
        {!sansEtapes && quand && <span>comparé au {quand}</span>}
        {!sansEtapes && !quand && d.publie && <span>premier débrief publié : rien à comparer</span>}
        {d.importe && <span title={d.importe.source}>importé — {d.importe.source}</span>}
        {isAdmin && (d.publie
          ? <span className="gn-deb-publie"><Icon name="check" size={12} />publié{d.publieLe ? ` le ${leA(d.publieLe)}` : ""}{d.par ? ` · ${d.par}` : ""}</span>
          : <span className="gn-deb-brouillon">{rienDeNote ? "pas encore de débrief" : "brouillon — les membres ne le voient pas encore"}</span>)}
        {isAdmin && <EtatDiscord p={vue.publication} publie={d.publie} gs={gs} />}
      </div>
      {a?.record && <div className="gn-deb-record"><Icon name="medal" size={14} />Nouveau record de temps total !</div>}

      {vue.annulee && <div className="gn-panne" style={{ marginBottom: 12 }}><Icon name="ban" size={14} style={{ flexShrink: 0 }} />Séance annulée{vue.motif ? ` — ${vue.motif}` : ""} : pas de débrief.</div>}

      {/* ── LES GESTES DU STAFF ── */}
      {peutDebriefer && !parcours && (
        <div className="gn-deb-gestes">
          <button type="button" className="vg-btn" onClick={() => { setParcours(true); setI(Math.max(0, lignes.findIndex((l) => !l.statut))); setVerdict(null); }}>
            <Icon name="edit" size={14} />{rienDeNote ? "Faire le débrief" : "Modifier le débrief"}
          </button>
          {!d.publie && !rienDeNote && <button type="button" className="gn-cs-discord-btn" onClick={() => publier()}><Icon name="send" size={12} />Publier</button>}
          {d.publie && vue.publication.bascule && (
            <button type="button" className="gn-cs-discord-btn" disabled={vue.publication.statut === "en_file"} onClick={() => publier()}
              title="Un nouveau message part dans le salon des débriefs, avec l'image à jour ; l'ancien reste"><Icon name="discord" size={12} />Republier sur Discord</button>
          )}
          {d.publie && <button type="button" className="gn-cs-discord-btn" onClick={() => publier(true)} title="Les membres ne le verront plus tant qu'il n'est pas republié"><Icon name="rotate-ccw" size={12} />Repasser en brouillon</button>}
          {/* L'aperçu (route 14) : l'image exacte que le bot publiera, brouillon compris. Le Guild
              Siege part en embed, sans image. */}
          {!gs && vue.existe && !rienDeNote && (
            <a className="gn-cs-discord-btn" href={`/api/seances/${encodeURIComponent(vue.cle)}/debrief/image`} target="_blank" rel="noopener noreferrer"
              title="L'image que le bot publie dans le salon des débriefs, rendue maintenant"><Icon name="image" size={12} />Aperçu de l&apos;image</a>
          )}
          {!vue.cloturee && onCloturer && (
            <button type="button" className="gn-cs-discord-btn" onClick={() => onCloturer(vue.cle)} title="Cocher qui était là : la liste et les chiffres de chacun se figent"><Icon name="medal" size={12} />Ils étaient là</button>
          )}
          {vue.joindre && !joindre && (
            <button type="button" className="gn-cs-discord-btn" onClick={() => { setJoindre({ etape: null }); setVerdict(null); }}
              title="Un lien (YouTube, Twitch, Medal, Discord) ou un fichier de 100 Mo au plus, rangé sous une étape, avec le moment où regarder"><Icon name="video" size={12} />Joindre une vidéo</button>
          )}
        </div>
      )}
      {joindre && !parcours && vue.joindre && (
        <JoindreVideo cle={vue.cle} etapes={vue.etapes} etapeInitiale={joindre.etape} onJointe={jointe} onFermer={() => setJoindre(null)} />
      )}
      {verdict && !parcours && (
        <div role="status" aria-live="polite" className="gn-rep-verdict" style={{ color: verdict.ok ? "var(--green)" : "var(--gn-crimson-texte)", marginBottom: 10 }}>
          <Icon name={verdict.ok ? "check" : "alert"} size={14} style={{ flexShrink: 0 }} /><span>{verdict.texte}</span>
        </div>
      )}

      {/* ── LE PARCOURS, une étape à la fois (staff) ── */}
      {peutDebriefer && parcours && (courante || sansEtapes) && d.saisies && (
        <div className="gn-deb-parcours">
          <div className="gn-deb-parcours-tete">
            <span className="gn-deb-lab">Résultat</span>
            <span className="gn-deb-issues">
              <button type="button" className={`gn-deb-issue gagne${d.saisies.resultat === "gagne" ? " actif" : ""}`} onClick={() => choisirResultat("gagne")}
                title={d.saisies.resultat === "gagne" ? "Recliquer retire le résultat" : undefined}><Icon name="trophy" size={12} />Gagné</button>
              <button type="button" className={`gn-deb-issue perdu${d.saisies.resultat === "perdu" ? " actif" : ""}`} onClick={() => choisirResultat("perdu")}
                title={d.saisies.resultat === "perdu" ? "Recliquer retire le résultat" : undefined}><Icon name="skull" size={12} />Perdu</button>
            </span>
            {busy > 0 && <span className="gn-deb-aide">enregistrement…</span>}
            {courante && <span className="gn-deb-position">Étape {Math.min(i, n - 1) + 1}/{n}</span>}
          </div>

          {courante && (<>
          <div className="gn-deb-courante">
            <span aria-hidden="true">{courante.etape.emoji}</span>
            <b>{courante.etape.code} {courante.etape.label}</b>
            <span className="gn-deb-phase">({vue.phases[courante.etape.phase] ?? `Phase ${courante.etape.phase}`})</span>
            <Monstres e={courante.etape} />
          </div>

          <div className="gn-deb-champs">
            <label className="gn-deb-champ">
              <span className="gn-param-lab">Chrono</span>
              <input className="gn-param-champ court" value={chrono} maxLength={20} inputMode="text"
                placeholder={courante.mesure !== null ? fmtDuree(courante.mesure) : "2:34"}
                onChange={(e) => setChrono(e.target.value)} onBlur={sortirChrono}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
              <span className="gn-deb-aide">{courante.mesure !== null ? `mesuré : ${fmtDuree(courante.mesure)}${saisie?.chrono != null ? " — vide le champ pour le reprendre" : ""}` : "pas de mesure du chrono"}</span>
            </label>
            <label className="gn-deb-champ">
              <span className="gn-param-lab">Remarque <span className="gn-deb-compteur">{remarque.length}/{REMARQUE_MAX}</span></span>
              <textarea className="gn-param-champ" rows={2} value={remarque} maxLength={REMARQUE_MAX}
                placeholder="Ce qui s'est passé à cette étape" onChange={(e) => setRemarque(e.target.value)} onBlur={sortirRemarque} />
            </label>
          </div>

          <div className="gn-deb-notes">
            {STATUTS_ETAPE.map((s) => (
              <button key={s} type="button" className={`gn-deb-noter ${s}${saisie?.statut === s ? " actif" : ""}`} onClick={() => noter(s)}
                title={saisie?.statut === s ? "Recliquer retire la note" : "Note l'étape et passe à la suivante"}>
                {LIBELLE_STATUT[s]}
              </button>
            ))}
          </div>
          <div className="gn-deb-nav">
            <button type="button" className="gn-cs-discord-btn" disabled={i <= 0} onClick={() => setI(Math.max(0, i - 1))}><Icon name="arrow-left" size={12} />Précédente</button>
            <button type="button" className="gn-cs-discord-btn" disabled={i >= n - 1} onClick={() => setI(etapeSuivante(i, n))}>Suivante<Icon name="arrow-right" size={12} /></button>
            <span className="gn-deb-aide">Une note passe à l&apos;étape suivante ; le chrono et la remarque s&apos;enregistrent à la sortie du champ.</span>
          </div>

          {/* Toutes les étapes d'un coup d'œil : un clic y mène. */}
          <div className="gn-deb-puces">
            {lignes.map((l, idx) => (
              <button key={l.etape.code} type="button" className={`gn-deb-puce ${l.statut ?? "vide"}${idx === i ? " courante" : ""}`} onClick={() => setI(idx)}
                title={`${l.etape.code} ${l.etape.label} — ${l.statut ? LIBELLE_STATUT[l.statut] : "pas noté"} · ${fmtDuree(l.chrono)}`}>
                {l.etape.code}
              </button>
            ))}
          </div>

          <AEtape ligne={courante} joueurs={d.joueurs} salle={salle} />

          {/* Les vidéos de l'étape (lot 8) : les lire, en joindre une, rangée sous cette étape. */}
          <div className="gn-vid-etape">
            <span className="gn-rep-role-nom">Vidéos de l&apos;étape : {videosDe(courante.etape.code).length}</span>
            {videosDe(courante.etape.code).map((v) => <LigneVideo key={v.id} v={v} onLire={setLecture} />)}
            {vue.joindre && !joindre && (
              <button type="button" className="gn-cs-discord-btn" style={{ justifySelf: "start" }} onClick={() => setJoindre({ etape: courante.etape.code })}>
                <Icon name="plus" size={12} />Joindre une vidéo à {courante.etape.code}
              </button>
            )}
          </div>
          </>)}
          {/* Sans étapes (le Guild Siege, par défaut) : les vidéos de toute la séance. */}
          {!courante && (
            <div className="gn-vid-etape">
              <span className="gn-rep-role-nom">Vidéos de la séance : {videos.length}</span>
              {videos.map((v) => <LigneVideo key={v.id} v={v} onLire={setLecture} />)}
              {vue.joindre && !joindre && (
                <button type="button" className="gn-cs-discord-btn" style={{ justifySelf: "start" }} onClick={() => setJoindre({ etape: null })}>
                  <Icon name="plus" size={12} />Joindre une vidéo
                </button>
              )}
            </div>
          )}
          {joindre && vue.joindre && (
            <JoindreVideo cle={vue.cle} etapes={vue.etapes} etapeInitiale={joindre.etape} onJointe={jointe} onFermer={() => setJoindre(null)} />
          )}

          <label className="gn-deb-champ" style={{ marginTop: 4 }}>
            <span className="gn-param-lab">À retenir pour la prochaine fois <span className="gn-deb-compteur">{aRetenir.length}/{A_RETENIR_MAX}</span></span>
            <textarea className="gn-param-champ" rows={3} value={aRetenir} maxLength={A_RETENIR_MAX}
              onChange={(e) => setARetenir(e.target.value)} onBlur={sortirARetenir} />
          </label>

          {verdict && (
            <div role="status" aria-live="polite" className="gn-rep-verdict" style={{ color: verdict.ok ? "var(--green)" : "var(--gn-crimson-texte)" }}>
              <Icon name={verdict.ok ? "check" : "alert"} size={14} style={{ flexShrink: 0 }} /><span>{verdict.texte}</span>
            </div>
          )}

          <div className="gn-deb-pied">
            <span className="gn-deb-manquants">
              {sansEtapes ? <>Pas de manches : le résultat, « à retenir » et les vidéos suffisent.</>
                : resume && resume.manquants.length ? <>Étapes sans statut : {resume.manquants.join(", ")}</> : <>Toutes les étapes sont notées.</>}
            </span>
            <Link href={gs ? "/discord/evenements#gs" : "/discord/evenements#etapes"} className="gn-cs-discord-btn" title="Les séances déjà chronométrées ou débriefées gardent leur liste"><Icon name="settings" size={12} />{gs ? "Paramétrer les manches" : "Modifier les étapes"}</Link>
            <button type="button" className="gn-cs-discord-btn" onClick={() => { setParcours(false); setVerdict(null); }}><Icon name="eye" size={12} />Voir le résultat</button>
            <button type="button" className="vg-btn" disabled={rienDeNote} onClick={() => publier()}
              title={gs ? "Sur le site, pour tous les membres, puis dans le salon des débriefs du Guild Siege"
                : vue.publication.bascule ? "Sur le site, pour tous les membres, puis en image dans le salon des débriefs" : "Sur le site, pour tous les membres. Discord : après la bascule"}>
              <Icon name="send" size={14} />{d.publie ? "Republier" : "Publier"}
            </button>
          </div>
          <div className="gn-deb-aide" style={{ marginTop: 6 }}>
            {gs
              ? <>Publier le montre à tous les membres dans Bilans, filtre Guild Siege{vue.publication.bascule ? ", et l'envoie dans le salon des débriefs du siège (republier envoie un nouveau message)" : ""}.</>
              : <>{vue.figees ? "La liste des étapes est figée pour cette séance : un changement du paramétrage ne la touche plus." : "La liste des étapes se fige à la première note."}
                {" "}Publier le montre à tous les membres dans Bilans{vue.publication.bascule ? ", et l'envoie en image dans le salon des débriefs (republier envoie un nouveau message)" : " ; sur Discord, le bot Python publie encore les débriefs jusqu'à la bascule"}.</>}
          </div>
        </div>
      )}

      {/* ── LA LECTURE : analyse, à retenir, puis les étapes ── */}
      {!parcours && (
        <>
          {a && (a.plusLongue || a.malDeuxFois.length > 0) && (
            <div className="gn-deb-bloc">
              <div className="gn-deb-bloc-titre"><Icon name="search" size={13} />Analyse</div>
              <ul className="gn-deb-analyse">
                {a.plusLongue && <li><Icon name="clock" size={12} />Étape la plus longue : <b>{a.plusLongue.code} {a.plusLongue.label}</b> — {fmtDuree(a.plusLongue.duree)} ({a.plusLongue.part} % du temps)</li>}
                {a.malDeuxFois.length > 0 && <li><Icon name="target" size={12} />Mal deux fois de suite : <b>{a.malDeuxFois.map((x) => `${x.code} ${x.label}`).join(", ")}</b> — à retravailler</li>}
              </ul>
            </div>
          )}
          {resume?.aRetenir && (
            <div className="gn-deb-bloc">
              <div className="gn-deb-bloc-titre"><Icon name="map-pin" size={13} />À retenir</div>
              <p className="gn-deb-texte">{resume.aRetenir}</p>
            </div>
          )}
          {!sansEtapes && <div className="gn-deroule gn-deb-etapes">
            {parPhase.map((p) => (
              <div key={p.k}>
                <h4 className="gn-deroule-phase">{p.titre}</h4>
                {p.lignes.map(({ l }) => {
                  const e = a?.ecarts[l.etape.code] ?? null;
                  return (
                    <div key={l.etape.code} className="gn-deroule-etape gn-deb-etape">
                      <Statut s={l.statut} />
                      <span aria-hidden="true">{l.etape.emoji}</span>
                      <span className="gn-deroule-code">{l.etape.code}</span>
                      <span className="gn-deroule-label">{l.etape.label}</span>
                      <span className="gn-deb-chrono" title={l.chrono === null ? "Pas de chrono" : l.saisi ? `Corrigé au débrief${l.mesure !== null ? ` (mesuré : ${fmtDuree(l.mesure)})` : ""}` : "Mesuré par le chrono en direct"}>
                        {fmtDuree(l.chrono)}{l.saisi && <span className="gn-deb-saisi">*</span>}
                      </span>
                      <span className={`gn-deb-ecart ${e ? classeEcart(e) : "vide"}`} title={e ? titreEcart(e, quand) : undefined}>{e ? e.texte : ""}</span>
                      {l.remarque && <span className="gn-deb-remarque">« {l.remarque} »</span>}
                      <Monstres e={l.etape} />
                      {videosDe(l.etape.code).length > 0 && (
                        <div className="gn-vid-liste">{videosDe(l.etape.code).map((v) => <LigneVideo key={v.id} v={v} onLire={setLecture} />)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>}
          {/* La légende, seulement quand il y a quelque chose à lire : un écart, ou une correction. */}
          {(Object.values(a?.ecarts ?? {}).some(Boolean) || lignes.some((l) => l.saisi)) && (
            <p className="gn-deb-aide" style={{ margin: "-6px 0 0" }}>
              Écart : vert, plus rapide que la séance publiée juste avant ; rouge, plus lent. * : chrono corrigé au débrief.
            </p>
          )}
        </>
      )}

      {/* ── LES VIDÉOS DE TOUTE LA SÉANCE (ou d'une étape que le déroulé n'a plus) ── */}
      {!parcours && horsEtape.length > 0 && (
        <div className="gn-deb-bloc">
          <div className="gn-deb-bloc-titre"><Icon name="video" size={13} />Vidéos de la séance</div>
          <div className="gn-vid-liste">
            {horsEtape.map((v) => <LigneVideo key={v.id} v={v} onLire={setLecture} etape={v.etape ? etapeDite(v.etape, vue.etapes) : undefined} />)}
          </div>
        </div>
      )}

      {/* ── LES JOUEURS DE LA SÉANCE, ET LEURS CHIFFRES DÉCLARÉS CE SOIR-LÀ ── */}
      <Joueurs vue={vue} d={d} isAdmin={isAdmin} salle={salle} />

      {lecture && <LecteurVideo v={lecture} etapes={vue.etapes} onFermer={fermerLecture} onModifiee={modifiee} onSupprimee={supprimee} />}
    </div>
  );
}

/**
 * OÙ EN EST DISCORD (staff) : la dernière demande de publication de l'image (route 8), lue dans
 * la file du bot — en file, publiée (et son lien), ou en échec, avec la raison que Discord a
 * donnée (un salon introuvable, un droit qui manque). Avant la bascule, rien ne part : on le dit.
 */
function EtatDiscord({ p, publie, gs = false }: { p: Publication; publie: boolean; gs?: boolean }) {
  if (p.statut === "en_file") return <span className="gn-deb-discord en-file"><Icon name="clock" size={12} />Discord : {gs ? "le débrief part" : "l'image part"} sous 15 s…</span>;
  if (p.statut === "echec") return <span className="gn-deb-discord echec" title={p.erreur ?? undefined}><Icon name="alert" size={12} />Discord : échec — {p.erreur ?? "raison inconnue"}</span>;
  if (p.statut === "faite") {
    return (
      <span className="gn-deb-discord faite"><Icon name="discord" size={12} />Discord : publié{p.le ? ` le ${leA(p.le)}` : ""}
        {p.lien && <> · <a href={p.lien} target="_blank" rel="noopener noreferrer">voir le message</a></>}
      </span>
    );
  }
  if (!publie) return null;
  if (gs && p.bascule === false) return <span className="gn-deb-discord" title="Le Guild Siege est éteint (paramétrage des événements) : rien ne part sur Discord">Discord : Guild Siege éteint</span>;
  return p.bascule === false
    ? <span className="gn-deb-discord" title="Le bot Python publie encore les débriefs : le nôtre part après la bascule (paramétrage des événements)">Discord : après la bascule</span>
    : <span className="gn-deb-discord">Discord : pas encore publié</span>;
}

/**
 * QUI JOUAIT À CETTE ÉTAPE — lu dans ce que la clôture a figé : les salles des Asuras (1.2) et
 * les équipes des Jumeaux (2.2), avec les chiffres DÉCLARÉS ce soir-là. Les golems et l'araignée
 * se calculaient sur les rôles du soir, que la clôture ne garde pas : pas de liste inventée.
 */
function AEtape({ ligne, joueurs, salle }: { ligne: LigneDebrief; joueurs: JoueurDebrief[]; salle: (k: string) => string }) {
  const m = momentDe(ligne.etape);
  const presents = joueurs.filter((j) => j.present === true);
  if (!m || !presents.length) return null;
  const nom = (j: JoueurDebrief, suffixe?: string) => (
    <span key={j.pseudo + (suffixe ?? "")} className={`gn-rep-membre${j.moi ? " moi" : ""}`}>
      <ClassLogo name={j.classe} size={18} /><b>{j.pseudo}</b>
      {suffixe && <span style={{ color: "var(--text-muted)" }}>{suffixe}</span>}
      {j.enLigne && <ChiffreDeclare enLigne={j.enLigne} chiffres={j.chiffres} style={{ fontSize: 11.5, color: "var(--text-muted)" }} />}
    </span>
  );
  if (m.quoi === "salles") {
    const avec = presents.filter((j) => j.salles.length);
    if (!avec.length) return null;
    return (
      <div className="gn-deb-aetape">
        <span className="gn-rep-role-nom">À cette étape : les salles</span>
        <div className="gn-chrono-joueurs">{avec.map((j) => nom(j, `· ${j.salles.map(salle).join(", ")}`))}</div>
      </div>
    );
  }
  if (m.quoi === "jumeaux") {
    const places = presents.filter((j) => j.jumeau);
    if (!places.length) return null;
    return (
      <div className="gn-deb-aetape">
        <span className="gn-rep-role-nom">À cette étape : les équipes des Jumeaux</span>
        <div className="gn-rep-equipes">
          {EQUIPES.map((eq) => (
            <div key={eq} className={`gn-rep-equipe ${eq}`}>
              <div className="gn-rep-equipe-titre"><span className="gn-rep-carre" aria-hidden="true" />Équipe {NOM_EQUIPE[eq]}</div>
              {ROLES_JUMEAU.map((r) => {
                const l = places.filter((j) => j.jumeau && equipeDe(j.jumeau) === eq && roleDe(j.jumeau) === r);
                return l.length ? <div key={r} className="gn-rep-role"><span className="gn-rep-role-nom">{ROLE_JUMEAU_LABEL[r]}</span>{l.map((j) => nom(j))}</div> : null;
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

/** Les joueurs de la séance : ce que la clôture a figé. Un membre ne voit que les présents ; le
 *  staff voit aussi les absents. Sans clôture, on le dit — rien n'est deviné. */
function Joueurs({ vue, d, isAdmin, salle }: { vue: Vue; d: VueDebrief; isAdmin: boolean; salle: (k: string) => string }) {
  const clotureLe = vue.clotureAt ? new Date(vue.clotureAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" }) : null;
  return (
    <div className="gn-deb-bloc gn-deb-joueurs">
      <div className="gn-deb-bloc-titre"><Icon name="users" size={13} />Les joueurs de la séance</div>
      {!vue.cloturee ? (
        <p className="gn-deb-aide" style={{ margin: 0 }}>
          {d.nbJoueursSource === "import"
            ? `${d.nbJoueurs} joueurs, selon le débrief importé : la liste, elle, n'a pas été gardée.`
            : isAdmin ? "Pas encore clôturée : « Ils étaient là » fige qui était là, et les chiffres déclarés de chacun ce soir-là." : "La liste des joueurs n'a pas été enregistrée pour cette séance."}
        </p>
      ) : !d.joueurs.length ? (
        <p className="gn-deb-aide" style={{ margin: 0 }}>Personne à montrer.</p>
      ) : (
        <>
          <p className="gn-deb-aide" style={{ margin: "0 0 10px" }}>
            {vue.degats ? `Chiffres DÉCLARÉS dans l'AirBuilder, figés à la clôture${clotureLe ? ` du ${clotureLe}` : ""} — jamais vérifiés : la date de mesure au survol, et le témoin « à remesurer ».` : `Clôturée${clotureLe ? ` le ${clotureLe}` : ""}.`}
          </p>
          <div className="gn-deb-liste">
            {d.joueurs.map((j) => (
              <div key={j.pseudo} className={`gn-deb-joueur${j.present === false ? " absent" : ""}`}>
                <ClassLogo name={j.classe} size={20} />
                <span className="gn-deb-joueur-nom">
                  <b className={j.moi ? "moi" : undefined}>{j.pseudo}</b>
                  <span>{j.player}{j.poste ? ` · ${j.poste}` : ""}{j.salles.length ? ` · ${j.salles.map(salle).join(", ")}` : ""}{j.jumeau ? ` · Jumeaux ${NOM_EQUIPE[equipeDe(j.jumeau)]} — ${ROLE_JUMEAU_LABEL[roleDe(j.jumeau)]}` : ""}</span>
                </span>
                {j.enLigne
                  ? <ChiffreDeclare enLigne={j.enLigne} chiffres={j.chiffres} style={{ fontSize: 12, marginLeft: "auto" }} />
                  : vue.degats && <span className="gn-deb-aide" style={{ marginLeft: "auto" }}>sans mesure</span>}
                {isAdmin && <span className={`gn-deb-presence ${j.present ? "present" : "absent"}`}>{j.present ? "présent" : "absent"}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
