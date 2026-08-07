"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { normaliserStrategie, type BlocStrategie } from "@/lib/strategie";

/**
 * La stratégie des Chambres Secrètes, écrite par le staff.
 *
 * Elle se compose comme on écrit un guide : des titres, des paragraphes, des
 * captures. Chaque bloc se déplace, se remplace, se supprime — le donjon change,
 * la page doit suivre sans qu'on ait à tout réécrire ni à rappeler quelqu'un.
 *
 * Les images se collent (un lien) ou s'importent (un fichier). Un fichier est
 * réduit ET recompressé dans le navigateur avant l'envoi : une capture Flyff
 * brute pèse 2 à 4 Mo, et personne n'ouvrirait une page qui en contient cinq.
 */
type Mode = "lecture" | "edition";

const LARGEUR_MAX = 1400;

/** Réduit une image au format utile pour la page, et la sort en WebP. */
function reduireImage(fichier: File): Promise<string> {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => rejeter(new Error("Fichier illisible."));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => rejeter(new Error("Ce fichier n'est pas une image."));
      img.onload = () => {
        const ratio = Math.min(1, LARGEUR_MAX / (img.naturalWidth || LARGEUR_MAX));
        const l = Math.max(1, Math.round((img.naturalWidth || LARGEUR_MAX) * ratio));
        const h = Math.max(1, Math.round((img.naturalHeight || LARGEUR_MAX) * ratio));
        const cv = document.createElement("canvas");
        cv.width = l; cv.height = h;
        const cx = cv.getContext("2d");
        if (!cx) return rejeter(new Error("Canvas indisponible."));
        cx.drawImage(img, 0, 0, l, h);
        // Le WebP tient dans le tiers d'un PNG sur une capture de jeu.
        resoudre(cv.toDataURL("image/webp", 0.82));
      };
      img.src = String(lecteur.result);
    };
    lecteur.readAsDataURL(fichier);
  });
}

const nouvelId = () => Math.random().toString(36).slice(2, 10);
const poids = (blocs: BlocStrategie[]) => JSON.stringify({ blocs }).length;
const enMo = (n: number) => `${(n / 1_000_000).toFixed(1)} Mo`;

export function StrategieCS({ isAdmin, texteExistant = "" }: { isAdmin: boolean; texteExistant?: string }) {
  const [blocs, setBlocs] = useState<BlocStrategie[]>([]);
  const [brouillon, setBrouillon] = useState<BlocStrategie[] | null>(null);
  const [charge, setCharge] = useState(false);
  const [etat, setEtat] = useState("");
  const [occupe, setOccupe] = useState(false);
  const fichierRef = useRef<HTMLInputElement | null>(null);
  const cibleImage = useRef<string | null>(null);
  const mode: Mode = brouillon ? "edition" : "lecture";

  const charger = useCallback(async () => {
    try {
      const r = await fetch("/api/compositions/strategie", { cache: "no-store" });
      if (r.ok) setBlocs(normaliserStrategie(await r.json()).blocs);
    } catch { /* la page reste vide plutôt que de casser l'onglet */ }
    setCharge(true);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const ouvrirEdition = () => {
    // Rien d'écrit, mais d'anciennes consignes existent : on part de là plutôt
    // que de laisser le staff les recopier à la main.
    if (!blocs.length && texteExistant.trim()) {
      setBrouillon([{ id: nouvelId(), type: "texte", texte: texteExistant }]);
    } else {
      setBrouillon(blocs.map((b) => ({ ...b })));
    }
    setEtat("");
  };

  const majBloc = (id: string, patch: Partial<BlocStrategie>) =>
    setBrouillon((p) => (p ?? []).map((b) => (b.id === id ? ({ ...b, ...patch } as BlocStrategie) : b)));
  const retirer = (id: string) => setBrouillon((p) => (p ?? []).filter((b) => b.id !== id));
  const deplacer = (id: string, sens: -1 | 1) =>
    setBrouillon((p) => {
      const l = [...(p ?? [])];
      const i = l.findIndex((b) => b.id === id);
      const j = i + sens;
      if (i < 0 || j < 0 || j >= l.length) return l;
      [l[i], l[j]] = [l[j], l[i]];
      return l;
    });
  const ajouter = (type: BlocStrategie["type"]) =>
    setBrouillon((p) => [...(p ?? []),
      type === "image"
        ? { id: nouvelId(), type: "image", url: "", legende: "" }
        : { id: nouvelId(), type, texte: "" }]);

  const importer = async (fichiers: FileList | null) => {
    const f = fichiers?.[0];
    const id = cibleImage.current;
    if (!f || !id) return;
    setEtat("");
    try {
      const url = await reduireImage(f);
      majBloc(id, { url } as Partial<BlocStrategie>);
    } catch (e) {
      setEtat(e instanceof Error ? e.message : "Import impossible.");
    }
    if (fichierRef.current) fichierRef.current.value = "";
  };

  const enregistrer = async () => {
    if (!brouillon) return;
    setOccupe(true); setEtat("");
    try {
      const r = await fetch("/api/compositions/strategie", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocs: brouillon }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setEtat(j.error ?? "Enregistrement refusé.");
      else { setBlocs(normaliserStrategie(j).blocs); setBrouillon(null); }
    } catch { setEtat("Réseau indisponible."); }
    setOccupe(false);
  };

  const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 11px", color: "var(--text)", fontFamily: "inherit", fontSize: 13.5 };
  const petitBouton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, padding: "6px 11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", cursor: "pointer", fontFamily: "inherit" };

  const liste = brouillon ?? blocs;
  const vide = !liste.length && !texteExistant.trim();

  return (
    <div className="fx-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <h2 className="font-heading" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--orange)", textTransform: "uppercase", fontSize: 15, letterSpacing: 1, margin: 0 }}>
          <Icon name="book" size={17} />Stratégie — Chambre Secrète
        </h2>
        {isAdmin && mode === "lecture" && charge && (
          <button onClick={ouvrirEdition} style={{ ...petitBouton, marginLeft: "auto" }}>
            <Icon name="edit" size={13} />{liste.length || texteExistant ? "Modifier" : "Composer la page"}
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
        Le déroulé, le rôle de chaque poste, les placements. Écrit par le staff, lu par tout le monde.
      </p>

      {!charge && <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Chargement…</div>}

      {/* ── Lecture ── */}
      {charge && mode === "lecture" && (
        vide ? (
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "26px 0", textAlign: "center" }}>
            Rien d&apos;écrit pour l&apos;instant{isAdmin ? " — clique sur « Composer la page »." : ". Le staff publiera la stratégie ici."}
          </div>
        ) : liste.length ? (
          <div style={{ display: "grid", gap: 14 }}>
            {liste.map((b) => (
              <div key={b.id}>
                {b.type === "titre" && (
                  <h3 className="font-heading" style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "6px 0 0" }}>{b.texte}</h3>
                )}
                {b.type === "texte" && (
                  <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text)", whiteSpace: "pre-wrap" }}>{b.texte}</div>
                )}
                {b.type === "image" && (
                  <figure style={{ margin: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.url} alt={b.legende || "Capture de la stratégie"} style={{ width: "100%", maxWidth: 900, borderRadius: 10, border: "1px solid var(--border)", display: "block" }} />
                    {b.legende && <figcaption style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 5 }}>{b.legende}</figcaption>}
                  </figure>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Ancien texte des consignes, gardé tant qu'il n'a pas été repris. */
          <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text)", whiteSpace: "pre-wrap" }}>{texteExistant}</div>
        )
      )}

      {/* ── Édition ── */}
      {mode === "edition" && brouillon && (
        <>
          <input ref={fichierRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => importer(e.target.files)} />
          <div style={{ display: "grid", gap: 10 }}>
            {brouillon.map((b, i) => (
              <div key={b.id} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11, padding: 11 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)", fontWeight: 700 }}>
                    {b.type === "titre" ? "Titre" : b.type === "image" ? "Image" : "Paragraphe"}
                  </span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    <button onClick={() => deplacer(b.id, -1)} disabled={i === 0} title="Monter"
                      style={{ ...petitBouton, padding: "4px 7px", opacity: i === 0 ? .35 : 1 }}><Icon name="arrow-up" size={12} /></button>
                    <button onClick={() => deplacer(b.id, 1)} disabled={i === brouillon.length - 1} title="Descendre"
                      style={{ ...petitBouton, padding: "4px 7px", opacity: i === brouillon.length - 1 ? .35 : 1 }}><Icon name="arrow-down" size={12} /></button>
                    <button onClick={() => retirer(b.id)} title="Retirer ce bloc"
                      style={{ ...petitBouton, padding: "4px 7px", color: "var(--red)", borderColor: "var(--border)" }}><Icon name="x" size={12} /></button>
                  </span>
                </div>

                {b.type === "titre" && (
                  <input value={b.texte} onChange={(e) => majBloc(b.id, { texte: e.target.value } as Partial<BlocStrategie>)}
                    placeholder="ex. Phase 2 — les jumeaux" style={{ ...champ, fontWeight: 700 }} />
                )}
                {b.type === "texte" && (
                  <textarea value={b.texte} onChange={(e) => majBloc(b.id, { texte: e.target.value } as Partial<BlocStrategie>)} rows={5}
                    placeholder="Ce qu'il faut faire, dans l'ordre…" style={{ ...champ, lineHeight: 1.6, resize: "vertical" }} />
                )}
                {b.type === "image" && (
                  <div style={{ display: "grid", gap: 7 }}>
                    {b.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.url} alt="" style={{ width: "100%", maxWidth: 420, borderRadius: 9, border: "1px solid var(--border)" }} />
                    )}
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      <button onClick={() => { cibleImage.current = b.id; fichierRef.current?.click(); }} style={petitBouton}>
                        <Icon name="image" size={12} />{b.url ? "Remplacer l'image" : "Importer une image"}
                      </button>
                      {b.url && <button onClick={() => majBloc(b.id, { url: "" } as Partial<BlocStrategie>)} style={{ ...petitBouton, color: "var(--text-muted)" }}>Retirer l&apos;image</button>}
                    </div>
                    <input value={b.url.startsWith("data:") ? "" : b.url}
                      onChange={(e) => majBloc(b.id, { url: e.target.value.trim() } as Partial<BlocStrategie>)}
                      placeholder={b.url.startsWith("data:") ? "Image importée" : "…ou colle un lien https:// ou /assets/…"}
                      disabled={b.url.startsWith("data:")} style={{ ...champ, fontSize: 12, opacity: b.url.startsWith("data:") ? .5 : 1 }} />
                    <input value={b.legende} onChange={(e) => majBloc(b.id, { legende: e.target.value } as Partial<BlocStrategie>)}
                      placeholder="Légende (facultatif)" style={{ ...champ, fontSize: 12 }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
            <button onClick={() => ajouter("titre")} style={petitBouton}><Icon name="plus" size={12} />Titre</button>
            <button onClick={() => ajouter("texte")} style={petitBouton}><Icon name="plus" size={12} />Paragraphe</button>
            <button onClick={() => ajouter("image")} style={petitBouton}><Icon name="plus" size={12} />Image</button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {brouillon.length} bloc{brouillon.length > 1 ? "s" : ""} · {enMo(poids(brouillon))}
            </span>
            {etat && <span style={{ fontSize: 12, color: "var(--red)" }}>{etat}</span>}
            <button onClick={() => { setBrouillon(null); setEtat(""); }} style={{ ...petitBouton, marginLeft: "auto", color: "var(--text-muted)" }}>Annuler</button>
            <button className="vg-btn" onClick={enregistrer} disabled={occupe} style={{ opacity: occupe ? .6 : 1 }}>
              {occupe ? "Enregistrement…" : "Publier"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
