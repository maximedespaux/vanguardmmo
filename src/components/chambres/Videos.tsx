"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { VgSelect } from "@/components/VgSelect";
import { vgConfirm } from "@/components/Dialogs";
import { OUVRIR_SOURCE, type Etape } from "@/lib/evenements";
import {
  MIMES_VIDEO, REFUS_TYPE_VIDEO, TITRE_VIDEO_MAX, VIDEO_MAX_OCTETS, lecteurDe, momentDit, sourceDite, tailleDite,
  type MimeVideo, type VueVideo,
} from "@/lib/videos";

/**
 * LES VIDÉOS DE DÉBRIEF dans l'onglet Bilans (SPEC-CHAMBRES-RECENSEMENT §10.4 ; lot 8).
 *
 * - `LigneVideo` : une vidéo sous son étape — son titre, qui l'a jointe, le moment, d'où elle
 *   vient, et « Lire ».
 * - `JoindreVideo` (le STAFF seulement, décision 3 de Maxime) : l'étape, le moment (« 1:35 », lu
 *   comme un chrono), le titre, puis un LIEN (YouTube non répertorié, Twitch, Medal, le message
 *   Discord) ou un FICHIER MP4 / WebM de 100 Mo au plus. Le fichier part BRUT, par
 *   `XMLHttpRequest` (fetch ne donne pas l'avancement de l'envoi), avec sa barre de progression ;
 *   un envoi refusé, interrompu ou annulé efface sa ligne. La taille et le type sont contrôlés
 *   ici avant l'envoi, pour ne pas attendre un refus — le serveur les recontrôle.
 * - `LecteurVideo` : la fenêtre de lecture, qui démarre AU BON MOMENT ; plein écran sur téléphone.
 *
 * Les fenêtres passent par un portail : les cartes de la page s'inclinent au survol (transform),
 * et un `position: fixed` s'y calerait au lieu de l'écran.
 */

/** « 2.2 Jumeaux », ou « Toute la séance ». */
export function etapeDite(code: string | null, etapes: Pick<Etape, "code" | "label">[]): string {
  if (!code) return "Toute la séance";
  const e = etapes.find((x) => x.code === code);
  return e ? `${e.code} ${e.label}` : code;
}

export function LigneVideo({ v, onLire, etape }: {
  v: VueVideo; onLire: (v: VueVideo) => void;
  /** Hors de la ligne d'une étape (le bloc « Vidéos de la séance ») : d'où elle vient. */
  etape?: string;
}) {
  const m = momentDit(v.moment);
  return (
    <div className="gn-vid-ligne">
      <Icon name="video" size={13} style={{ color: "var(--gn-accent)", flexShrink: 0 }} />
      {etape && <span className="gn-vid-ou">{etape} —</span>}
      <b className="gn-vid-titre">{v.titre}</b>
      <span className="gn-vid-meta">par {v.auteur}{m ? ` · à ${m}` : ""} · {sourceDite(v)}</span>
      <button type="button" className="gn-cs-discord-btn" onClick={() => onLire(v)} title={m ? `Ouvre la vidéo à ${m}` : "Ouvre la vidéo"}>
        <Icon name="eye" size={12} />Lire
      </button>
    </div>
  );
}

/** Le type d'un fichier choisi : celui que le navigateur annonce, sinon son extension. */
function mimeDuFichier(f: File): MimeVideo | null {
  if ((MIMES_VIDEO as readonly string[]).includes(f.type)) return f.type as MimeVideo;
  // Un .m4v est un MP4 (marque « M4V », que le serveur accepte) : certains systèmes l'annoncent ainsi.
  if (f.type === "video/x-m4v") return "video/mp4";
  if (f.type) return null; // video/quicktime (un .mov), video/x-matroska…
  return /\.(mp4|m4v)$/i.test(f.name) ? "video/mp4" : /\.webm$/i.test(f.name) ? "video/webm" : null;
}

const options = (etapes: Etape[]) => [{ value: "", label: "Toute la séance" }, ...etapes.map((e) => ({ value: e.code, label: `${e.code} ${e.label}` }))];

export function JoindreVideo({ cle, etapes, etapeInitiale, onJointe, onFermer }: {
  cle: string; etapes: Etape[]; etapeInitiale: string | null;
  onJointe: (v: VueVideo) => void; onFermer: () => void;
}) {
  const [etape, setEtape] = useState(etapeInitiale ?? "");
  const [moment, setMoment] = useState("");
  const [titre, setTitre] = useState("");
  const [mode, setMode] = useState<"lien" | "fichier">("lien");
  const [url, setUrl] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [progression, setProgression] = useState<number | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const xhr = useRef<XMLHttpRequest | null>(null);
  useEffect(() => { setEtape(etapeInitiale ?? ""); }, [etapeInitiale]);

  // Un envoi en cours : quitter la page le couperait. On le demande d'abord.
  useEffect(() => {
    if (progression === null) return;
    const retenir = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", retenir);
    return () => window.removeEventListener("beforeunload", retenir);
  }, [progression]);

  const choisir = (f: File | null) => {
    setErreur("");
    if (!f) { setFichier(null); return; }
    if (!mimeDuFichier(f)) {
      setFichier(null);
      setErreur(/\.mov$/i.test(f.name) || f.type === "video/quicktime" ? `${REFUS_TYPE_VIDEO} (C'est un MOV QuickTime, que les navigateurs ne lisent pas partout.)` : REFUS_TYPE_VIDEO);
      return;
    }
    if (f.size > VIDEO_MAX_OCTETS) {
      setFichier(null);
      setErreur(`Ce fichier fait ${tailleDite(f.size)} : 100 Mo au plus. Coupe la vidéo, ou mets-la sur YouTube (non répertoriée) et colle le lien.`);
      return;
    }
    setFichier(f);
    if (!titre.trim()) setTitre(f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").slice(0, TITRE_VIDEO_MAX));
  };

  /** Une ligne en envoi qui n'aboutira pas (refus, coupure, annulation) : effacée tout de suite,
   *  pour qu'elle ne compte pas deux heures dans le quota. */
  const effacer = (id: string) => { fetch(`/api/videos/${id}`, { method: "DELETE" }).catch(() => {}); };

  const joindre = async () => {
    setErreur("");
    if (!titre.trim()) { setErreur("Donne un titre à la vidéo : ce qu'elle montre (« Aggro ratée sur Kraavos »)."); return; }
    if (mode === "lien" && !url.trim()) { setErreur("Colle le lien de la vidéo."); return; }
    if (mode === "fichier" && !fichier) { setErreur("Choisis un fichier MP4 ou WebM."); return; }
    setOccupe(true);
    const mime = fichier ? mimeDuFichier(fichier) : null;
    const corps = mode === "lien"
      ? { type: "lien", url: url.trim(), etape: etape || null, moment, titre }
      : { type: "fichier", taille: fichier!.size, mime, etape: etape || null, moment, titre };
    const r = await fetch(`/api/seances/${encodeURIComponent(cle)}/videos`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) { setOccupe(false); setErreur(j.error ?? "Le serveur n'a pas répondu : réessaie dans un instant."); return; }
    if (mode === "lien") { setOccupe(false); onJointe(j.video as VueVideo); return; }

    // Le fichier, brut, à l'adresse que la ligne a reçue (route 16).
    const id = String(j.id);
    setProgression(0);
    const x = new XMLHttpRequest();
    xhr.current = x;
    x.open("PUT", String(j.envoi));
    x.setRequestHeader("Content-Type", mime!);
    x.upload.onprogress = (e) => { if (e.lengthComputable) setProgression(Math.min(99, Math.floor((e.loaded / e.total) * 100))); };
    x.onload = () => {
      xhr.current = null;
      let rep: { video?: VueVideo; error?: string } = {};
      try { rep = JSON.parse(x.responseText); } catch { /* réponse vide */ }
      if (x.status === 200 && rep.video) { setProgression(null); setOccupe(false); onJointe(rep.video); return; }
      effacer(id);
      setProgression(null); setOccupe(false);
      setErreur(rep.error ?? `L'envoi a été refusé (${x.status}).`);
    };
    x.onerror = () => {
      xhr.current = null; effacer(id);
      setProgression(null); setOccupe(false);
      setErreur("L'envoi a été interrompu (connexion coupée, ou fichier refusé avant d'arriver au site) : recommence.");
    };
    x.onabort = () => { xhr.current = null; effacer(id); setProgression(null); setOccupe(false); };
    x.send(fichier);
  };

  const annuler = () => {
    if (xhr.current) { xhr.current.abort(); return; }
    onFermer();
  };

  return (
    <div className="gn-vid-form">
      <div className="gn-deb-bloc-titre" style={{ marginBottom: 0 }}><Icon name="video" size={13} />Joindre une vidéo</div>
      <div className="gn-vid-champs">
        {/* Pas de <label> autour du menu : un clic sur son libellé l'ouvrirait et le refermerait. */}
        <div className="gn-deb-champ">
          <span className="gn-param-lab">Étape</span>
          <VgSelect full value={etape} onChange={setEtape} options={options(etapes)} />
        </div>
        <label className="gn-deb-champ">
          <span className="gn-param-lab">Moment dans la vidéo</span>
          <input className="gn-param-champ court" value={moment} maxLength={20} placeholder="1:35" onChange={(e) => setMoment(e.target.value)} />
        </label>
        <label className="gn-deb-champ gn-vid-large">
          <span className="gn-param-lab">Titre <span className="gn-deb-compteur">{titre.length}/{TITRE_VIDEO_MAX}</span></span>
          <input className="gn-param-champ" value={titre} maxLength={TITRE_VIDEO_MAX} placeholder="Aggro ratée sur Kraavos" onChange={(e) => setTitre(e.target.value)} />
        </label>
      </div>

      <div className="gn-vid-modes" role="radiogroup" aria-label="Lien ou fichier">
        <button type="button" role="radio" aria-checked={mode === "lien"} className={`gn-vid-mode${mode === "lien" ? " actif" : ""}`} disabled={occupe} onClick={() => { setMode("lien"); setErreur(""); }}>
          <Icon name="link" size={12} />Lien
        </button>
        <button type="button" role="radio" aria-checked={mode === "fichier"} className={`gn-vid-mode${mode === "fichier" ? " actif" : ""}`} disabled={occupe} onClick={() => { setMode("fichier"); setErreur(""); }}>
          <Icon name="upload" size={12} />Fichier
        </button>
      </div>

      {mode === "lien" ? (
        <label className="gn-deb-champ">
          <span className="gn-param-lab">Lien de la vidéo</span>
          <input className="gn-param-champ" value={url} inputMode="url" placeholder="https://youtu.be/…" onChange={(e) => setUrl(e.target.value)} />
          <span className="gn-deb-aide">YouTube (non répertoriée), Twitch (rediffusion ou clip), Medal, ou le lien d&apos;un message Discord. Un « t= » dans le lien donne le moment si tu n&apos;en écris pas.</span>
        </label>
      ) : (
        <div className="gn-deb-champ">
          <span className="gn-param-lab">Fichier MP4 ou WebM, 100 Mo au plus</span>
          <div className="gn-vid-fichier">
            <label className="gn-cs-discord-btn" style={{ cursor: occupe ? "default" : "pointer" }}>
              <Icon name="upload" size={12} />Choisir…
              <input type="file" accept="video/mp4,video/webm,.mp4,.m4v,.webm" hidden disabled={occupe} onChange={(e) => choisir(e.target.files?.[0] ?? null)} />
            </label>
            {fichier ? <span className="gn-vid-meta"><b style={{ color: "var(--text)" }}>{fichier.name}</b> — {tailleDite(fichier.size)}</span>
              : <span className="gn-vid-meta">Medal, OBS et l&apos;appareil photo exportent en MP4. Plus long : YouTube non répertorié, puis le lien.</span>}
          </div>
          {progression !== null && (
            <div className="gn-vid-progression" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progression} aria-label="Envoi du fichier">
              <span className="gn-j-piste"><span className="gn-j-jauge" style={{ width: `${progression}%` }} /></span>
              <span className="gn-vid-pc">{progression} %</span>
            </div>
          )}
        </div>
      )}

      {erreur && (
        <div role="alert" className="gn-rep-verdict" style={{ color: "var(--gn-crimson-texte)" }}>
          <Icon name="alert" size={14} style={{ flexShrink: 0 }} /><span>{erreur}</span>
        </div>
      )}

      <div className="gn-vid-pied">
        <button type="button" className="gn-cs-discord-btn" onClick={annuler}>{progression !== null ? "Annuler l'envoi" : "Annuler"}</button>
        <button type="button" className="vg-btn" disabled={occupe} onClick={joindre}>
          <Icon name={mode === "lien" ? "link" : "upload"} size={14} />{progression !== null ? "Envoi…" : "Joindre"}
        </button>
      </div>
    </div>
  );
}

/**
 * LA FENÊTRE DE LECTURE : YouTube et Twitch dans leur lecteur, au bon moment ; un fichier dans
 * `<video>`, qui part de `#t=` — et `currentTime` posé au chargement, pour les navigateurs qui
 * ignorent `#t=` ; Medal, Discord et les autres liens s'ouvrent à côté, le moment affiché.
 */
export function LecteurVideo({ v, etapes, onFermer, onModifiee, onSupprimee }: {
  v: VueVideo; etapes: Etape[]; onFermer: () => void;
  onModifiee: (v: VueVideo) => void; onSupprimee: (id: string) => void;
}) {
  const [monte, setMonte] = useState(false);
  const [hote, setHote] = useState("");
  const [edition, setEdition] = useState(false);
  const [etape, setEtape] = useState(v.etape ?? "");
  const [moment, setMoment] = useState(momentDit(v.moment) ?? "");
  const [titre, setTitre] = useState(v.titre);
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);
  useEffect(() => { setMonte(true); setHote(window.location.hostname); }, []);
  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [onFermer]);
  useEffect(() => { setEtape(v.etape ?? ""); setMoment(momentDit(v.moment) ?? ""); setTitre(v.titre); }, [v]);

  if (!monte || !hote) return null;
  const l = lecteurDe(v, hote);
  const m = momentDit(v.moment);

  const enregistrer = async () => {
    setErreur(""); setOccupe(true);
    const r = await fetch(`/api/videos/${v.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titre, etape: etape || null, moment }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setOccupe(false);
    if (!r || !r.ok) { setErreur(j.error ?? "La modification a été refusée."); return; }
    setEdition(false);
    onModifiee(j.video as VueVideo);
  };
  const supprimer = async () => {
    if (!(await vgConfirm(`Supprimer la vidéo « ${v.titre} » ?${v.type === "fichier" ? "\nLe fichier est effacé du serveur." : "\nLe lien d'origine, lui, reste où il est."}`))) return;
    setOccupe(true);
    const r = await fetch(`/api/videos/${v.id}`, { method: "DELETE" }).catch(() => null);
    setOccupe(false);
    if (!r || (!r.ok && r.status !== 404)) { const j = r ? await r.json().catch(() => ({})) : {}; setErreur(j.error ?? "La suppression a été refusée."); return; }
    onSupprimee(v.id);
  };

  return createPortal(
    <div className="gn-vid-fond" onClick={onFermer}>
      <div className="gn-vid-fenetre" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Vidéo : ${v.titre}`}>
        <div className="gn-vid-tete">
          <Icon name="video" size={16} style={{ color: "var(--gn-accent)", flexShrink: 0 }} />
          <span className="gn-vid-tete-t">
            <b>{etapeDite(v.etape, etapes)} — {v.titre}</b>
            <span className="gn-vid-meta">par {v.auteur}{m ? ` · à ${m}` : ""} · {sourceDite(v)}{v.taille ? ` · ${tailleDite(v.taille)}` : ""}</span>
          </span>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="gn-vid-fermer"><Icon name="x" size={18} /></button>
        </div>

        {l.genre === "externe" ? (
          <div className="gn-vid-externe">
            <p>Cette vidéo se regarde {v.source === "discord" ? "dans Discord" : v.source === "medal" ? "sur Medal" : "sur son site"}{m ? <>, <b>à {m}</b></> : null}.</p>
            <a className="vg-btn" href={l.url} target="_blank" rel="noopener noreferrer"><Icon name="link" size={14} />{v.source === "fichier" ? "Ouvrir" : OUVRIR_SOURCE[v.source]}</a>
          </div>
        ) : (
          <div className="gn-vid-cadre">
            {l.genre === "iframe" ? (
              <iframe src={l.src} title={v.titre} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            ) : (
              // `currentTime` en plus de `#t=` : certains navigateurs ignorent le fragment.
              <video controls preload="metadata" playsInline src={l.src}
                onLoadedMetadata={(e) => { const t = v.moment ?? 0; if (t > 0 && Math.abs(e.currentTarget.currentTime - t) > 1) e.currentTarget.currentTime = t; }} />
            )}
          </div>
        )}

        {edition && (
          <div className="gn-vid-champs" style={{ marginTop: 12 }}>
            <div className="gn-deb-champ">
              <span className="gn-param-lab">Étape</span>
              <VgSelect full value={etape} onChange={setEtape} options={options(etapes)} />
            </div>
            <label className="gn-deb-champ">
              <span className="gn-param-lab">Moment</span>
              <input className="gn-param-champ court" value={moment} maxLength={20} placeholder="1:35" onChange={(e) => setMoment(e.target.value)} />
            </label>
            <label className="gn-deb-champ gn-vid-large">
              <span className="gn-param-lab">Titre <span className="gn-deb-compteur">{titre.length}/{TITRE_VIDEO_MAX}</span></span>
              <input className="gn-param-champ" value={titre} maxLength={TITRE_VIDEO_MAX} onChange={(e) => setTitre(e.target.value)} />
            </label>
          </div>
        )}
        {erreur && (
          <div role="alert" className="gn-rep-verdict" style={{ color: "var(--gn-crimson-texte)", marginTop: 10 }}>
            <Icon name="alert" size={14} style={{ flexShrink: 0 }} /><span>{erreur}</span>
          </div>
        )}

        <div className="gn-vid-pied">
          {l.genre !== "externe" && (
            <a className="gn-cs-discord-btn" href={v.url} target="_blank" rel="noopener noreferrer" style={{ marginRight: "auto" }}>
              <Icon name="link" size={12} />{v.source === "fichier" ? "Ouvrir dans un onglet" : OUVRIR_SOURCE[v.source]}
            </a>
          )}
          {v.gerer && (edition ? (
            <>
              <button type="button" className="gn-cs-discord-btn" disabled={occupe} onClick={() => { setEdition(false); setErreur(""); }}>Annuler</button>
              <button type="button" className="vg-btn" disabled={occupe} onClick={enregistrer}><Icon name="save" size={14} />Enregistrer</button>
            </>
          ) : (
            <>
              <button type="button" className="gn-cs-discord-btn" disabled={occupe} onClick={() => setEdition(true)}><Icon name="edit" size={12} />Modifier</button>
              <button type="button" className="gn-cs-discord-btn gn-vid-suppr" disabled={occupe} onClick={supprimer}><Icon name="trash" size={12} />Supprimer</button>
            </>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
