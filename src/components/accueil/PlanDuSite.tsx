"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/Icon";
import { espacesPour, regardDe, type Lien } from "@/config/nav";

/**
 * LE PLAN DU SITE — l'index, replié en bas de l'accueil.
 *
 * Il remplace /sommaire, qui y redirige (`/#plan`), et la ligne « Toutes les pages »
 * de la barre. Il se génère de config/nav.ts par `espacesPour`, la même fonction que
 * la barre et le panneau « Tout » : il ne peut donc pas annoncer une page que la
 * barre refuserait, ni en oublier une qu'elle montre.
 *
 * REPLIÉ, parce que c'est un filet et non une destination : on y vient quand on ne
 * sait plus où une chose est rangée. Mais il S'OUVRE DE LUI-MÊME quand l'adresse vise
 * #plan — sans quoi l'ancien lien /sommaire tomberait sur un titre fermé.
 *
 * La liste est TOUJOURS DANS LE HTML, seulement masquée : au rendu serveur il n'y a
 * pas de session, ce sont donc les pages publiques qu'un moteur de recherche lit, et
 * rien d'autre. Les pages réservées s'ajoutent dans le navigateur, une fois la
 * session lue.
 */
/**
 * `titre` : le titre de section de la vue qui l'accueille — le h2 de la vitrine pour un
 * visiteur, celui des blocs du membre sur son accueil — pour que le plan ne soit pas le
 * seul titre de la page à une autre taille que ses voisins.
 */
export function PlanDuSite({ titre }: { titre?: React.ReactNode }) {
  const { data: session } = useSession();
  const { espaces, hors } = espacesPour(regardDe(session), "plan");
  const total = hors.length + espaces.reduce((s, e) => s + e.liens.length, 0);
  const [ouvert, setOuvert] = useState(false);
  /** Ouvert PAR L'ANCRE : il reste à y défiler, une fois la liste dépliée. */
  const [viser, setViser] = useState(false);

  useEffect(() => {
    const lire = () => {
      if (window.location.hash !== "#plan") return;
      setOuvert(true);
      setViser(true);
    };
    lire();
    // Un lien `#plan` suivi depuis l'accueil même ne remonte pas la page.
    window.addEventListener("hashchange", lire);
    return () => window.removeEventListener("hashchange", lire);
  }, []);
  /* Le défilement attend le rendu de la liste ouverte. Lancé dans le même temps que
     l'ouverture, il butait sur le bas d'une page encore courte : le titre restait
     au pied de l'écran et la liste, dessous, hors de vue (mesuré : 704 px plus bas). */
  useEffect(() => {
    if (!viser) return;
    setViser(false);
    document.getElementById("plan")?.scrollIntoView({ block: "start" });
  }, [viser]);

  return (
    <section id="plan" style={{ scrollMarginTop: 16 }}>
      {titre ?? (
        <h2 className="font-heading vg-reveal" style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: 1, margin: "46px 0 4px", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="grid" framed frameSize={34} tone="orange" /> <span className="vg-h2">Plan du site</span>
        </h2>
      )}
      <p className="vg-reveal" style={{ fontFamily: "'Alef',sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "10px 0 18px", letterSpacing: ".2px", maxWidth: 720 }}>
        Chaque page, avec ce qu&apos;on y fait. Si tu ne sais pas où chercher, c&apos;est ici.
      </p>

      {/* Le contrôle copie le dépli de la Protection de l'Oasis (BlocOasis) : même
          bouton pleine largeur, et il annonce ce qu'il ouvre AVEC son compte. */}
      <button
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-controls="plan-liste"
        className="font-heading"
        style={{ width: "100%", padding: 10, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13,
          background: ouvert ? "rgba(var(--gn-lueur-rgb),.09)" : "var(--bg-3)",
          border: `1px solid ${ouvert ? "var(--gn-accent)" : "var(--border)"}`,
          color: ouvert ? "var(--gn-accent)" : "var(--text)" }}
      >
        <Icon name={ouvert ? "chevron-up" : "chevron-down"} size={14} />
        {ouvert ? "Replier le plan du site" : `Les ${total} pages qui te sont ouvertes, espace par espace`}
      </button>

      {/* `hidden` ET `display:none`, comme le rail de l'Oasis : le premier retire le
          bloc de l'arbre d'accessibilité, le second ne dépend d'aucune feuille. */}
      <div id="plan-liste" hidden={!ouvert} style={{ display: ouvert ? "block" : "none", marginTop: 18 }}>
        {espaces.map((e) => (
          <div key={e.label} style={{ marginBottom: 26 }}>
            <h3 className="font-heading" style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--gn-accent)", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Icon name={e.icon} size={16} />{e.label}
            </h3>
            <Grille liens={e.liens} />
          </div>
        ))}
        {hors.length > 0 && (
          <div>
            <h3 className="font-heading" style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 12 }}>Le reste</h3>
            <Grille liens={hors} />
          </div>
        )}
      </div>
    </section>
  );
}

/** Les cartes de l'ancien /sommaire, telles quelles. */
function Grille({ liens }: { liens: Lien[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 10 }}>
      {liens.map((l) => (
        <Link key={l.href} href={l.href} className="glass-card fx-card" style={{ display: "flex", gap: 11, padding: 13, borderRadius: 12, textDecoration: "none", color: "inherit", minWidth: 0 }}>
          <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gn-accent)" }}>
            <Icon name={l.icon} size={17} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{l.label}</span>
            <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.35 }}>{l.desc}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
