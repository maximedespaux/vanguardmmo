"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Ce qu'on vient faire à la boutique, demandé à l'entrée.
 *
 * Les deux circuits existaient déjà — le stock du coffre et l'objet sur mesure —
 * mais sous forme d'onglets qu'il fallait remarquer une fois la page ouverte.
 * Or ce sont deux démarches sans rapport : on vient prendre ce qui dort au
 * coffre, ou faire fabriquer une pièce précise. La question se pose donc avant,
 * et l'écran s'ouvre déjà au bon endroit.
 *
 * Le sur-mesure a lui-même deux portes. La composer ici convient quand on sait
 * ce qu'on veut. Quand la pièce est déjà montée sur un stuff, la reprendre de
 * l'AirBuilder évite de la ressaisir : elle part avec ses réglages, et le
 * détenteur la voit exactement comme elle est portée.
 */
/* « commande » n'est pas une porte du panneau d'entrée — on n'arrive pas à la
   Boutique pour relire une commande — mais c'est bien un panneau, et c'est ce
   type qui sert à en changer. */
export type ChoixFait = "stock" | "surMesure" | "commande" | "requetes";

/** Un stuff qui porte au moins une pièce. Un stuff vide n'a rien à reprendre. */
export type StuffRempli = { perso: string; stuff: string; pieces: number };

/**
 * Les stuffs réellement équipés, lus là où le builder les écrit.
 *
 * Même lecture que « Mes personnages » : le local prime sur le distant, parce
 * qu'il reflète ce que le joueur vient de faire dans le builder.
 */
export async function lireStuffsRemplis(): Promise<StuffRempli[]> {
  type Piece = { item?: unknown };
  type Stuff = { name?: string; eq?: Record<string, Piece> };
  type Blob = { chars?: { name?: string; stuffs?: Stuff[] }[] };
  const compte = (st: Stuff) => Object.values(st?.eq ?? {}).filter((e) => e && e.item).length;
  const lire = (blob: Blob | null) => {
    const out: StuffRempli[] = [];
    for (const pc of blob?.chars ?? []) {
      if (!pc?.name) continue;
      (pc.stuffs ?? []).forEach((st, i) => {
        const n = compte(st);
        if (n) out.push({ perso: pc.name!, stuff: st.name?.trim() || `Stuff ${i + 1}`, pieces: n });
      });
    }
    return out;
  };
  let local: Blob | null = null;
  try { local = JSON.parse(localStorage.getItem("vg_air_e1") || "null"); } catch { /* rien en local */ }
  if (local) return lire(local);
  try { const r = await fetch("/api/builder-state"); if (r.ok) return lire((await r.json())?.blob ?? null); } catch { /* hors ligne */ }
  return [];
}

const carte: React.CSSProperties = {
  display: "flex", gap: 13, alignItems: "flex-start", textAlign: "left", width: "100%",
  background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 12,
  padding: "15px 16px", cursor: "pointer", color: "var(--text)", fontFamily: "inherit",
};

function Porte({ icon, titre, texte, onClick, href }: { icon: IconName; titre: string; texte: string; onClick?: () => void; href?: string }) {
  const dedans = (
    <>
      <span style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,140,26,.12)", border: "1px solid rgba(255,140,26,.3)", color: "var(--orange)" }}>
        <Icon name={icon} size={19} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="font-heading" style={{ display: "block", fontSize: 14.5, fontWeight: 700, marginBottom: 3 }}>{titre}</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{texte}</span>
      </span>
    </>
  );
  return href
    ? <Link href={href} className="fx-card vg-porte" style={{ ...carte, textDecoration: "none" }}>{dedans}</Link>
    : <button onClick={onClick} className="fx-card vg-porte" style={carte}>{dedans}</button>;
}

export function ChoixBoutique({ ouvert, staff = false, onChoix, onFermer }: {
  ouvert: boolean;
  /** Le staff a une troisième porte : les commandes que personne n'a prises. */
  staff?: boolean;
  onChoix: (c: ChoixFait) => void;
  onFermer: () => void;
}) {
  /** Deux étapes : ce qu'on veut, puis — pour le sur-mesure — par quel bout. */
  const [etape, setEtape] = useState<"quoi" | "comment">("quoi");
  const [stuffs, setStuffs] = useState<StuffRempli[] | null>(null);

  useEffect(() => { if (ouvert) setEtape("quoi"); }, [ouvert]);
  useEffect(() => {
    if (etape !== "comment" || stuffs !== null) return;
    lireStuffsRemplis().then(setStuffs).catch(() => setStuffs([]));
  }, [etape, stuffs]);

  // Échap referme, comme partout ailleurs sur le site.
  useEffect(() => {
    if (!ouvert) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [ouvert, onFermer]);

  if (!ouvert || typeof document === "undefined") return null;

  // Monté sur <body> : un parent en `transform` (.fx-card) casserait le
  // `position:fixed` et enfermerait la fenêtre dans la carte.
  return createPortal(
    <div onClick={onFermer} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.55)" }}>

        {etape === "quoi" ? (
          <>
            <h2 className="font-heading" style={{ margin: "0 0 4px", fontSize: 19, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="cart" size={19} style={{ color: "var(--orange)" }} /> Que viens-tu chercher ?
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
              Deux démarches, deux écrans. Tu pourras passer de l&apos;une à l&apos;autre ensuite.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              <Porte icon="cart" titre="Un objet du coffre"
                texte="Parcours ce que la guilde a en stock, remplis ton panier et envoie la demande."
                onClick={() => onChoix("stock")} />
              <Porte icon="hammer" titre="Un objet précis, sur mesure"
                texte="Une pièce qui n'est pas au coffre : tu la décris avec ses réglages, le staff te répond."
                onClick={() => setEtape("comment")} />
              {/* La porte du staff : ce que les autres ont commandé et que
                  personne n'a encore pris en charge. Elle n'a rien à faire dans
                  la liste d'un membre — il n'a pas à servir les commandes. */}
              {staff && (
                <>
                  <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 12, fontSize: 11.5, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)" }}>
                    Réservé au staff
                  </div>
                  <Porte icon="package" titre="Les requêtes clients"
                    texte="Les commandes que personne n'a prises. Ouvre-leur une quête : chacun y apporte sa part, et la somme se partage."
                    onClick={() => onChoix("requetes")} />
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setEtape("quoi")} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12.5, padding: 0, marginBottom: 12, fontFamily: "inherit" }}>
              <Icon name="arrow-left" size={13} /> Retour
            </button>
            <h2 className="font-heading" style={{ margin: "0 0 4px", fontSize: 19, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="hammer" size={19} style={{ color: "var(--orange)" }} /> Par quel bout ?
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
              Si la pièce est déjà montée sur un de tes stuffs, inutile de la ressaisir.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              <Porte icon="hammer" titre="La composer ici"
                texte="Choisis l'emplacement, l'objet et ses réglages — la bulle se dessine à mesure."
                onClick={() => onChoix("surMesure")} />

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 4 }}>
                <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 9 }}>
                  La reprendre d&apos;un de mes stuffs
                </div>
                {stuffs === null ? (
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "6px 2px" }}>Lecture de tes builds…</div>
                ) : stuffs.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55, display: "flex", gap: 7, alignItems: "flex-start" }}>
                    <Icon name="info" size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>Aucun stuff équipé pour l&apos;instant. <Link href="/builder" style={{ color: "var(--orange)" }}>Ouvre l&apos;AirBuilder</Link> pour en monter un.</span>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 7 }}>
                    {stuffs.map((s) => (
                      <Porte key={`${s.perso}::${s.stuff}`} icon="sword"
                        titre={`${s.perso} · ${s.stuff}`}
                        texte={`${s.pieces} pièce${s.pieces > 1 ? "s" : ""} montée${s.pieces > 1 ? "s" : ""} — coche celles que tu veux commander.`}
                        href={`/builder?perso=${encodeURIComponent(s.perso)}&stuff=${encodeURIComponent(s.stuff)}&acheter=1`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
