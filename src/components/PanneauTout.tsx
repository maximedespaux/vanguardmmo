"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { espacesPour, type Lien, type Qui } from "@/config/nav";

/**
 * « Tout » — chaque page du site, en un panneau.
 *
 * C'était une entrée de la barre de navigation, à côté des espaces. Elle y
 * jurait : les espaces disent ce qu'on vient FAIRE, « Tout » ne dit rien — c'est
 * un filet, pas une destination. Il occupait pourtant la même place et la même
 * importance visuelle qu'eux.
 *
 * Il vit donc à côté de l'identité, avec les affaires personnelles : c'est là
 * qu'on va quand on ne sait plus où chercher, pas dans le fil des espaces.
 *
 * IL GARDE SA PLACE alors que la barre a maigri — décision de Maxime. Il porte
 * donc aussi les pages que la barre ne nomme pas (le profil) : il
 * lit la carte entière par `espacesPour`, la même fonction que la barre et le plan
 * du site. Il recevait jusqu'ici les listes déjà filtrées de la barre, ce qui
 * l'aurait amputé de ces pages-là sans un mot.
 */
export function PanneauTout({ qui }: { qui: Qui }) {
  const { espaces, hors } = espacesPour(qui, "plan");
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false); };
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => { document.removeEventListener("mousedown", clic); document.removeEventListener("keydown", touche); };
  }, [ouvert]);

  const total = hors.length + espaces.reduce((s, e) => s + e.liens.length, 0);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} aria-label="Toutes les pages du site"
        title="Toutes les pages du site" className="vg-top-tout"
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 10, cursor: "pointer",
          border: `1px solid ${ouvert ? "rgba(var(--gn-or-rgb),.4)" : "transparent"}`,
          background: ouvert ? "rgba(var(--gn-lueur-rgb),.1)" : "none", color: "var(--text-muted)",
          fontSize: 12.5, fontWeight: 600, fontFamily: "inherit" }}>
        <Icon name="grid" size={16} /><span className="vg-top-som">Tout</span>
      </button>

      {ouvert && (
        <div style={{ position: "absolute", top: "calc(100% + 9px)", right: 0, width: 340, maxWidth: "calc(100vw - 24px)",
          maxHeight: "min(72vh, 640px)", overflowY: "auto",
          background: "linear-gradient(180deg,#191920,#121217)", border: "1px solid #2f2f3a", borderTop: "2px solid var(--gn-accent)",
          borderRadius: "0 0 14px 14px", boxShadow: "0 18px 44px rgba(0,0,0,.6)", zIndex: 50, animation: "vgdrop .16s ease" }}>

          <div style={{ padding: "13px 16px 9px", borderBottom: "1px solid var(--border)" }}>
            <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>Tout le site</div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
              {total} page{total > 1 ? "s" : ""} — celles qui te sont ouvertes.
            </div>
          </div>

          {hors.length > 0 && (
            <div style={{ padding: "9px 9px 4px" }}>
              {hors.map((l) => <Ligne key={l.href} l={l} onGo={() => setOuvert(false)} />)}
            </div>
          )}

          {espaces.map((e) => (
            <div key={e.label} style={{ padding: "4px 9px 6px" }}>
              <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5,
                textTransform: "uppercase", letterSpacing: 1.2, color: "var(--gn-accent)", padding: "7px 6px 5px" }}>
                <Icon name={e.icon} size={12} />{e.label}
              </div>
              {e.liens.map((l) => <Ligne key={l.href} l={l} onGo={() => setOuvert(false)} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Une page, avec la ligne qui dit ce qu'on y fait — c'est elle qu'on lit. */
function Ligne({ l, onGo }: { l: Lien; onGo: () => void }) {
  return (
    <Link href={l.href} onClick={onGo} className="vg-prof-link"
      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 8px", borderRadius: 9, textDecoration: "none", color: "var(--text)" }}>
      <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gn-accent)", flexShrink: 0 }}>
        <Icon name={l.icon} size={14} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{l.label}</span>
        <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{l.desc}</span>
      </span>
    </Link>
  );
}
