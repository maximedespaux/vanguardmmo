"use client";
import { Icon } from "@/components/Icon";
import { rangDe, type Rang } from "@/lib/rangs";

/**
 * Un avatar dans son cadre de rang.
 *
 * Le cadre est le trophée : c'est lui qu'on voit avant le chiffre, et c'est
 * pour lui qu'on monte de niveau. Il se lit sans légende — plus le rang est
 * haut, plus l'anneau est chaud et lumineux, et les deux derniers respirent.
 *
 * Dessiné en CSS plutôt qu'en images : sept cadres × trois tailles feraient
 * vingt-et-un fichiers à produire, à peser et à tenir à jour, pour un anneau.
 */
export function AvatarCadre({
  src, nom, niveau, taille = 56, montrerRang = false,
}: {
  src?: string | null;
  nom?: string | null;
  niveau: number;
  taille?: number;
  /** Affiche le titre sous l'avatar (profil, classement). */
  montrerRang?: boolean;
}) {
  const rang: Rang = rangDe(niveau);
  const bordure = Math.max(2, Math.round(taille / 22));
  const interieur = taille - bordure * 2;

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span
        className={rang.anime ? "vg-cadre vg-cadre-anime" : "vg-cadre"}
        title={`${rang.nom} — niveau ${niveau}`}
        style={{
          width: taille, height: taille, borderRadius: "50%", padding: bordure, flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: `conic-gradient(from 210deg, ${rang.couleur}, #2a2a34 42%, ${rang.couleur} 78%, #2a2a34)`,
          boxShadow: rang.halo ? `0 0 ${Math.round(taille / 4)}px ${rang.halo}` : "none",
        }}
      >
        <span style={{ width: interieur, height: interieur, borderRadius: "50%", overflow: "hidden", background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {src
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={src} alt={nom ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <Icon name="user" size={Math.round(interieur * 0.5)} style={{ color: "var(--text-muted)" }} />}
        </span>
      </span>

      {montrerRang && (
        <span style={{ fontSize: Math.max(9, Math.round(taille / 6)), fontWeight: 700, color: rang.couleur, textTransform: "uppercase", letterSpacing: .6, whiteSpace: "nowrap" }}>
          {rang.nom}
        </span>
      )}
    </span>
  );
}
