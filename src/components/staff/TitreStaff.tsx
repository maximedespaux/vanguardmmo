import { Icon, type IconName } from "@/components/Icon";

/**
 * Un titre de section des pages des bras droits — celui de l'ancien accueil de guilde
 * (/dashboard), recopié à l'identique (h2 20 px en capitales, icône encadrée de 32 px,
 * filet `vg-h2`), sans l'apparition au défilement : ces pages se remplissent à l'arrivée
 * de leurs relevés, et un bloc `.vg-reveal` monté après coup reste invisible (`useReveal`
 * ne relève ses éléments qu'au montage, components/VgFx).
 */
export function TitreStaff({ icon, children, sous, droite }: { icon: IconName; children: React.ReactNode; sous?: string; droite?: React.ReactNode }) {
  return (
    <div style={{ margin: "34px 0 14px" }}>
      <h2 className="font-heading" style={{ fontSize: 20, textTransform: "uppercase", letterSpacing: 1, margin: 0, display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
        <Icon name={icon} framed frameSize={32} tone="orange" /> <span className="vg-h2">{children}</span>
        {droite && <span className="gn-titre-droite">{droite}</span>}
      </h2>
      {sous && <p style={{ margin: "8px 0 0", fontFamily: "'Alef',sans-serif", fontSize: 13, color: "var(--text-muted)", letterSpacing: ".2px" }}>{sous}</p>}
    </div>
  );
}
