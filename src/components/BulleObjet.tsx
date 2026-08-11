"use client";
import { Icon } from "@/components/Icon";
import type { SpecObjet } from "@/lib/specObjet";
import { iconeDeLigne, iconeDePuce, couleurDePuce, ETIQUETTE_ARTEFACT, ETOILE_PLEINE } from "@/lib/assetsJeu";

/** Une image du jeu, à sa taille de pictogramme. Un `null` ne dessine rien —
 *  c'est ce qui permet de n'illustrer que ce dont on est sûr. */
function Vignette({ src, taille = 14 }: { src?: string | null; taille?: number }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={{ width: taille, height: taille, objectFit: "contain", flexShrink: 0 }} />;
}

/**
 * La bulle d'un objet, telle qu'on la voit dans le builder.
 *
 * Redessinée ici à partir des données plutôt que réinjectée en HTML : ce qui
 * arrive du builder passe par la base et serait, sinon, du balisage écrit par
 * un membre et affiché dans l'écran d'un autre.
 *
 * Elle sert à trancher d'un coup d'œil : c'est bien CETTE pièce-là qu'on
 * demande — la Légendaire +9 percée, pas son homonyme du coffre.
 */
export function BulleObjet({ spec, compact = false }: { spec: SpecObjet; compact?: boolean }) {
  const couleur = spec.couleur || "var(--text)";
  return (
    <div style={{
      display: "inline-block", minWidth: compact ? 0 : 230, maxWidth: 340,
      background: "linear-gradient(180deg,#191920,#121217)", border: "1px solid var(--border)",
      borderTop: `2px solid ${couleur}`, borderRadius: "0 0 11px 11px", padding: "10px 12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {spec.icone && <img src={spec.icone} alt="" style={{ width: 26, height: 26, objectFit: "contain", flexShrink: 0 }} />}
        <span style={{ fontWeight: 700, fontSize: 13.5, color: couleur, lineHeight: 1.2 }}>
          {spec.nom}
          {spec.up ? <span style={{ color: "var(--gold)" }}> +{spec.up}</span> : null}
          {/* Les étoiles étaient un « ★ » de police, doré à la main. Ce sont les
              vraies étoiles d'artefact du jeu : c'est ce que le membre a sous
              les yeux sur sa pièce, et le doute « combien il en a ? » tombe. */}
          {spec.etoiles ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 1, marginLeft: 4, verticalAlign: "-2px" }}>
              {Array.from({ length: Math.min(5, spec.etoiles) }, (_, i) => <Vignette key={i} src={ETOILE_PLEINE} taille={13} />)}
            </span>
          ) : null}
        </span>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
        {spec.slot}
        {/* Au-delà de +10 la pièce EST un artefact — le bandeau du jeu le dit
            mieux qu'une phrase, et il est reconnaissable au premier regard.
            La largeur reste libre : c'est une étiquette 51×14, pas un carré. */}
        {(spec.up ?? 0) > 10 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ETIQUETTE_ARTEFACT} alt="Artefact" title="Artefact (+11 à +20)" style={{ height: 13, width: "auto", objectFit: "contain" }} />
        )}
      </div>

      {(spec.puces?.length ?? 0) > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
          {/* Les pastilles étaient six mots dorés à la file : la rareté, la rune
              et la maîtrise se ressemblaient. Chacune prend l'image du jeu
              quand elle en a une, et la rareté reprend SA couleur — celle du
              moteur, pas l'or commun à tout. Sans image, la pastille ne change
              pas d'un pixel : c'est le repli, et il est fréquent. */}
          {spec.puces!.map((p, i) => {
            const ic = iconeDePuce(p, spec.nom);
            const col = couleurDePuce(p) ?? "var(--gold)";
            return (
              <span key={i} title={p} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, padding: "2px 7px", paddingLeft: ic ? 4 : 7, borderRadius: 20, border: `1px solid ${couleurDePuce(p) ? `${col}66` : "var(--border)"}`, color: col }}>
                <Vignette src={ic} taille={13} />{p}
              </span>
            );
          })}
        </div>
      )}

      {spec.attaque && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginTop: 7, color: "var(--text-muted)" }}>
          <span>Attaque</span><b style={{ color: "var(--text)" }}>{spec.attaque[0]} ~ {spec.attaque[1]}</b>
        </div>
      )}

      {(spec.lignes?.length ?? 0) > 0 && (
        <div style={{ marginTop: 7, paddingTop: 6, borderTop: "1px dashed var(--border)", display: "grid", gap: 3 }}>
          {spec.lignes!.map((l, i) => {
            const ic = iconeDeLigne(l.label, l.valeur);
            return (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 11.5, alignItems: "center" }}>
              <span style={{ color: "var(--text-muted)", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {ic && <img src={ic} alt="" style={{ width: 16, height: 16, objectFit: "contain", flexShrink: 0 }} />}
                {l.label}
              </span>
              <span style={{ marginLeft: "auto", textAlign: "right", color: "var(--text)" }}>{l.valeur}</span>
            </div>
            );
          })}
        </div>
      )}

      {!compact && (spec.classe || spec.niveau || spec.prestige) && (
        <div style={{ marginTop: 7, paddingTop: 6, borderTop: "1px solid var(--border)", display: "grid", gap: 2, fontSize: 12 }}>
          {spec.classe && <div style={{ display: "flex" }}><span style={{ color: "var(--text-muted)" }}>Classe</span><b style={{ marginLeft: "auto" }}>{spec.classe}</b></div>}
          {spec.niveau ? <div style={{ display: "flex" }}><span style={{ color: "var(--text-muted)" }}>Niveau requis</span><b style={{ marginLeft: "auto" }}>{spec.niveau}</b></div> : null}
          {spec.prestige ? <div style={{ display: "flex" }}><span style={{ color: "var(--text-muted)" }}>Prestige</span><b style={{ marginLeft: "auto" }}>P{spec.prestige}</b></div> : null}
        </div>
      )}
    </div>
  );
}

/** Repli discret quand une demande n'a pas de spec (panier, ancienne requête). */
export function SansBulle({ texte }: { texte: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
      <Icon name="package" size={13} />{texte}
    </span>
  );
}
