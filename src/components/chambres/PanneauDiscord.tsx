"use client";
import { Icon } from "@/components/Icon";
import { heureDite } from "@/lib/evenements";

/**
 * OÙ EN EST LE PANNEAU DISCORD DE LA SÉANCE — pour le staff, sous « Prochaine séance » de
 * l'onglet Inscription (spec §7.2 ; lot 3).
 *
 * Le bot publie le panneau d'inscription la veille à 20 h (« ✅ Je viens », « ❌ Pas cette
 * fois », choix du perso et du poste) et le tient à jour. Cette ligne dit s'il est parti, mène
 * au message, et « Republier » en publie un nouveau tout de suite — sans mention, l'ancien
 * fermé. Tant que la bascule depuis le bot Python est coupée, notre bot n'en publie aucun : la
 * ligne le dit au lieu de proposer un bouton qui serait refusé.
 */

export type EtatDiscord = {
  panneau: { lien: string; at: number; ferme: string | null } | null;
  /** `nouveauxMessages` du paramétrage. */
  bascule: boolean;
  /** L'interrupteur général des rappels des Chambres (/discord). */
  rappels: boolean;
  /** Le rappel qui publie le panneau tout seul, ou null (panneau ou rappel coupé). */
  auto?: { quand: "veille" | "jour"; heure: string } | null;
  /** La dernière demande « Republier » et son verdict (file BotCommand). */
  demande: { statut: string; resultat: string | null; at: number } | null;
};

const FERME: Record<string, string> = {
  terminee: "fermé (séance terminée)", annulee: "fermé (séance annulée)", remplace: "remplacé", supprime: "supprimé de Discord",
};

/** « mardi à 20:00 », à l'heure de Paris — celle du panneau. */
const quand = (ms: number) => {
  const d = new Date(ms);
  const jour = d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long" });
  const h = d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
  return `${jour} à ${h}`;
};

export function LignePanneau({ d, annulee, enCours, onPublier, gs = false }: {
  d: EtatDiscord; annulee: boolean; enCours: string | null; onPublier: () => void;
  /** Le panneau du Guild Siege (lot 9) : pas de bascule (le bot Python ne fait pas le siège) —
   *  `bascule` dit alors s'il est actif —, et ses propres rappels. */
  gs?: boolean;
}) {
  const pan = d.panneau;
  const etat = !d.bascule
    ? gs ? "Le Guild Siege est éteint (paramétrage des événements) : pas de panneau." : "Notre bot ne publie pas encore de panneau : la bascule depuis le bot Python est coupée (paramétrage des événements)."
    : pan
      ? pan.ferme ? `Panneau Discord ${FERME[pan.ferme] ?? "fermé"}.` : `Panneau Discord publié ${quand(pan.at)}.`
      : !d.rappels ? `Panneau Discord : pas encore publié — les rappels ${gs ? "du Guild Siege" : "des Chambres"} sont coupés (Bot Discord).`
        // L'heure du paramétrage, pas « 20 h » écrit ici : le staff la règle, et peut couper le
        // panneau (la veille part alors en message simple) — la ligne ne promet que ce qui partira.
        : d.auto ? `Panneau Discord : il partira ${d.auto.quand === "veille" ? "la veille" : "le jour même"} à ${heureDite(d.auto.heure)}.`
          : "Panneau Discord : aucune publication automatique (panneau ou rappel de la veille coupé dans le paramétrage).";
  // Le verdict de la dernière demande, tant qu'elle est plus récente que le panneau affiché.
  const dem = d.demande && (!pan || d.demande.at > pan.at) ? d.demande : null;
  const verdict = enCours ?? (dem?.statut === "PENDING" ? "Republication en file : le bot la prend sous 15 s." : dem?.statut === "FAILED" ? `Échec : ${dem.resultat ?? "raison inconnue"}` : null);
  return (
    <div className="gn-cs-discord">
      <Icon name="discord" size={14} style={{ flexShrink: 0, color: "var(--gn-accent)" }} />
      <span className="gn-cs-discord-etat">{etat}</span>
      {verdict && <span className={dem?.statut === "FAILED" && !enCours ? "gn-cs-discord-echec" : "gn-cs-discord-file"}>{verdict}</span>}
      <span className="gn-cs-discord-gestes">
        {pan && !pan.ferme && (
          <a href={pan.lien} target="_blank" rel="noreferrer" className="gn-cs-discord-btn"><Icon name="link" size={12} />Voir</a>
        )}
        {d.bascule && !annulee && (
          <button type="button" className="gn-cs-discord-btn" onClick={onPublier} disabled={!!enCours}
            title="Publie un nouveau panneau tout de suite, sans mention, et ferme l'ancien">
            <Icon name="send" size={12} />{pan && !pan.ferme ? "Republier" : "Publier"}
          </button>
        )}
      </span>
    </div>
  );
}
