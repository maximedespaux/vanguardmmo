import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { LigneATraiter, Urgence } from "@/lib/recap";

const URGENCES: { clef: Urgence; titre: string; couleur: string }[] = [
  /* Le mot dit l'urgence, la pastille ne fait que la répéter : une couleur seule ne se
     lit pas sans légende, ni par un daltonien. */
  { clef: "haute", titre: "Urgent", couleur: "var(--red)" },
  { clef: "moyenne", titre: "Dans la journée", couleur: "var(--gold)" },
  { clef: "basse", titre: "À suivre", couleur: "var(--text-muted)" },
];

/**
 * La file « à traiter », par urgence — celle de /staff, et ses premières lignes sur
 * l'accueil d'un bras droit. Un seul dessin pour les deux : la même ligne ne doit pas
 * avoir deux allures selon la page où on la croise.
 *
 * `max` coupe la file APRÈS le tri (lib/recap la rend de la plus urgente à la moins
 * urgente) : l'accueil n'en montre que la tête, /staff la montre entière. Une urgence
 * sans ligne ne laisse pas de titre au-dessus du vide.
 */
export function FileATraiter({ lignes, max }: { lignes: LigneATraiter[]; max?: number }) {
  const vues = max ? lignes.slice(0, max) : lignes;
  if (!vues.length) {
    return (
      <div className="gn-file">
        <div style={{ color: "var(--green)", fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="check" size={16} /> Rien en attente — tout est à jour.
        </div>
      </div>
    );
  }
  return (
    <div className="gn-file">
      {URGENCES.map((u) => {
        const l = vues.filter((x) => x.urgence === u.clef);
        if (!l.length) return null;
        return (
          <div key={u.clef} className="gn-file-groupe">
            <div className="font-heading gn-file-t" style={{ color: u.couleur }}>{u.titre}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {l.map((x) => (
                <Link key={x.clef} href={x.href} className="gn-file-ligne">
                  <span className="gn-file-point" style={{ background: u.couleur }} />
                  <span className="font-heading gn-file-n" style={{ color: u.couleur }}>{x.nombre}</span>
                  <span className="gn-file-txt">
                    <span className="gn-file-phrase">{x.phrase}</span>
                    {x.detail && <span className="gn-file-detail">{x.detail}</span>}
                  </span>
                  <span className="gn-file-geste">{x.geste}<Icon name="chevron-right" size={13} /></span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
