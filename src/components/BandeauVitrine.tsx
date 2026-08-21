import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { EtatVisiteur } from "@/lib/vitrine";

/**
 * LE BANDEAU DE VITRINE — ce qu'on dit au visiteur qui regarde sans pouvoir toucher.
 *
 * Il ne s'affiche QUE pour celui qui ne peut pas agir. Pour un membre, il n'existe pas
 * dans le rendu : un bandeau permanent expliquant un droit qu'on a déjà est du bruit,
 * et on finit par ne plus le lire.
 *
 * CE QU'IL DIT, ET DANS CET ORDRE :
 *  1. ce qu'on regarde est RÉEL — pas une démonstration, pas des données d'exemple.
 *     C'est ce qui donne envie, et c'est vrai : la page sert le vrai stock ;
 *  2. le prérequis, en entier et sans détour — être sur le serveur Discord ET
 *     connecté. Dire seulement « connecte-toi » ferait revenir un joueur qui n'est
 *     pas sur le serveur, il échouerait sans comprendre pourquoi ;
 *  3. la porte, une seule, au même endroit que partout ailleurs sur le site.
 *
 * IL NE DIT PAS qui a le droit, ni combien ils sont, ni ce que contiennent les pages
 * fermées. La page est publique : elle n'a pas à décrire la vie interne de la guilde.
 */
export function BandeauVitrine({ etat, quoi, action }: {
  etat: EtatVisiteur;
  /** Ce qu'on est en train de regarder, en deux mots : « le stock de la guilde ». */
  quoi: string;
  /** Le geste précis qui est refusé : « passer une commande ». */
  action: string;
}) {
  if (etat.peutAgir) return null;

  /* Deux situations, deux messages. Un visiteur non connecté doit franchir deux
     étapes ; un membre du serveur qui n'est pas de la guilde n'a rien à faire de son
     côté, et le lui dire évite qu'il cherche un bouton qui n'existe pas. */
  const connecteMaisPasMembre = etat.connecte && !etat.membre;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap",
      background: "linear-gradient(100deg, color-mix(in srgb, var(--orange) 13%, transparent), var(--bg-2) 60%)",
      border: "1px solid color-mix(in srgb, var(--orange) 42%, transparent)",
      borderRadius: 14, padding: "14px 16px", marginBottom: 18,
    }}>
      <span style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--orange)",
      }}>
        <Icon name="eye" size={18} />
      </span>

      <div style={{ flex: "1 1 300px", minWidth: 0, fontSize: 13, lineHeight: 1.6 }}>
        <div className="font-heading" style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 3 }}>
          Tu regardes {quoi}, en vrai.
        </div>
        {connecteMaisPasMembre ? (
          <>
            Ce ne sont pas des données d&apos;exemple : c&apos;est ce que la guilde a réellement.
            Pour <b style={{ color: "var(--text)" }}>{action}</b>, il faut être <b style={{ color: "var(--text)" }}>membre de Vanguard</b> —
            tu es bien sur le serveur, il n&apos;y a rien de plus à faire de ton côté.
          </>
        ) : (
          <>
            Ce ne sont pas des données d&apos;exemple : c&apos;est ce que la guilde a réellement.
            Pour <b style={{ color: "var(--text)" }}>{action}</b>, deux choses sont nécessaires —
            être <b style={{ color: "var(--text)" }}>sur le serveur Discord Airborn</b>, et{" "}
            <b style={{ color: "var(--text)" }}>connecté ici</b> avec ce compte.
          </>
        )}
      </div>

      {!etat.connecte && (
        <Link href="/login" className="font-heading" style={{
          flexShrink: 0, alignSelf: "center", display: "inline-flex", alignItems: "center", gap: 7,
          padding: "9px 16px", borderRadius: 9, background: "#5865F2", color: "#fff",
          textDecoration: "none", fontWeight: 700, fontSize: 13,
        }}>
          <Icon name="discord" size={15} />Se connecter
        </Link>
      )}
    </div>
  );
}

/**
 * L'ENVELOPPE D'UN GESTE INTERDIT — ce qui entoure un bouton qu'un visiteur ne peut
 * pas actionner.
 *
 * Pourquoi une enveloppe et non un simple `disabled` : un bouton grisé ne dit pas
 * POURQUOI il est grisé, et sur un téléphone il n'a même pas d'infobulle. Ici le
 * geste reste visible — c'est lui qui donne envie — mais il porte son cadenas et sa
 * raison.
 *
 * `pointerEvents: none` sur l'enfant plutôt qu'un `disabled` sur chaque bouton : la
 * page contient des dizaines de contrôles imbriqués (les pas de quantité, les
 * sélecteurs, les champs), et les désactiver un par un aurait laissé passer celui
 * qu'on oublie. On neutralise l'ensemble d'un bloc, et le serveur reste le dernier
 * mot de toute façon.
 */
export function GesteReserve({ etat, pourquoi, children }: {
  etat: EtatVisiteur;
  /** Une phrase courte : « Réservé aux membres de la guilde. » */
  pourquoi: string;
  children: React.ReactNode;
}) {
  if (etat.peutAgir) return <>{children}</>;
  return (
    <div style={{ position: "relative" }}>
      <div aria-hidden="true" style={{ pointerEvents: "none", opacity: 0.4, filter: "saturate(0.4)" }}>
        {children}
      </div>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 12, textAlign: "center",
      }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600,
          background: "var(--bg-2)", border: "1px solid var(--orange)", borderRadius: 20,
          padding: "7px 14px", color: "var(--text)", boxShadow: "0 4px 16px rgba(0,0,0,.5)",
        }}>
          <Icon name="lock" size={13} style={{ color: "var(--orange)" }} />{pourquoi}
        </span>
      </div>
    </div>
  );
}
