import type { Certitude as CertitudeMoteur, Resultat, Terme as TermeMoteur } from "@/lib/degats/contrat";
import type { Certitude, Etape, Feuille, Terme } from "./moteur";

/**
 * LE RACCORD ENTRE LE MOTEUR DE DÉGÂTS ET L'ÉCRAN QUI MONTRE LE CALCUL.
 *
 * ┌──────────── POURQUOI CE FICHIER EXISTE ────────────┐
 * │ Deux lots ont été menés en parallèle. `src/lib/degats/**` │
 * │ est le MOTEUR : il lit les relevés et rend un `Resultat`   │
 * │ (une fourchette de dégâts, la liste des termes qui l'ont   │
 * │ produite, ses réserves, ses manques).                     │
 * │ `src/components/statistiques/**` est l'ÉCRAN : il sait     │
 * │ dessiner une feuille de calcul, une pastille de certitude, │
 * │ une barre, un panneau de caractéristiques.                │
 * │                                                          │
 * │ Ils ne se connaissaient pas au moment d'être écrits, et    │
 * │ chacun a nommé ses types. Plutôt que de réécrire l'un des  │
 * │ deux — ce qui se ferait à l'aveugle et casserait l'autre — │
 * │ ce fichier TRADUIT. Une fonction, un sens, et le jour où   │
 * │ les deux vocabulaires seront fondus en un seul, c'est ce   │
 * │ fichier qui disparaît.                                    │
 * └───────────────────────────────────────────────────────────┘
 *
 * IMPORT DE TYPES SEULEMENT (`import type`). Aucun code de `lib/degats` n'entre
 * ici, donc aucune lecture disque : ce module reste utilisable partout où l'écran
 * l'est. C'est ce qui permet d'appeler le moteur côté serveur (ou dans une route
 * API) et de ne faire traverser au navigateur que le résultat traduit.
 */

/**
 * LES DEUX ÉCHELLES DE CERTITUDE NE SE RECOUVRENT PAS TOUT À FAIT, et il faut le
 * savoir avant de lire une pastille :
 *
 *   moteur (`lib/degats`)   écran (`components/statistiques`)
 *   client                  client       — écrit dans un fichier du client
 *   flyff-officiel          hypothese    — la forme vient du Flyff officiel
 *   inconnu                 absent       — le client ne le dit pas
 *   (rien)                  deduit       — calculé sans choix, sur des nombres du client
 *
 * `deduit` N'A PAS D'ÉQUIVALENT en amont : le moteur range un comptage ou une somme
 * avec ce qu'il a lu, sous `client`. La traduction ne l'invente donc pas — un terme
 * traduit ne sortira jamais en `deduit`, et c'est exact : on ne sait pas, à la
 * lecture d'un `Resultat`, si un `client` est lu ou recalculé.
 */
const CERTITUDE: Record<CertitudeMoteur, Certitude> = {
  client: "client",
  "flyff-officiel": "hypothese",
  inconnu: "absent",
};

/**
 * L'UNITÉ VA DANS LE LIBELLÉ, PAS À CÔTÉ DU NOMBRE.
 *
 * Le moteur porte une `unite` typée (`points`, `pourcent`, `facteur`, `ms`,
 * `parSeconde`) ; l'écran, lui, écrit une valeur nue. Sans marque, « 25 » de
 * pourcentage d'attaque et « 25 » de points d'attaque s'affichent pareil au milieu
 * d'une même liste — et se comparent, alors qu'ils ne se comparent pas. Le suffixe
 * est donc collé au libellé du terme, là où le lecteur le lit avec le nom.
 *
 * `points` ne reçoit aucun suffixe : c'est le cas par défaut, et le marquer
 * alourdirait toutes les lignes pour ne rien distinguer.
 */
const SUFFIXE: Record<TermeMoteur["unite"], string> = {
  points: "", pourcent: " (%)", facteur: " (facteur)", ms: " (ms)", parSeconde: " (par seconde)",
};

function traduireTerme(t: TermeMoteur): Terme {
  return {
    quoi: t.libelle + SUFFIXE[t.unite],
    /* UN TERME `inconnu` PERD SA VALEUR, VOLONTAIREMENT. Le moteur lui en donne une
       (souvent zéro) pour que ses additions tiennent ; l'écran, lui, doit écrire
       « non pris en compte : la valeur n'est pas dans le client » à sa place. Un zéro
       affiché se lirait comme « ce terme n'apporte rien », ce qui est faux : il
       apporte une quantité qu'on ignore. */
    valeur: t.certitude === "inconnu" ? null : t.valeur,
    source: t.source,
    certitude: CERTITUDE[t.certitude],
    detail: [
      t.note,
      /* La borne haute part dans le détail et non dans une deuxième colonne : la
         fourchette du RÉSULTAT est déjà affichée en bas de feuille, et deux colonnes
         de nombres par ligne rendaient la liste illisible sur téléphone. */
      t.valeurMax != null && t.valeurMax !== t.valeur
        ? `Fourchette : ${t.valeur.toLocaleString("fr-FR")} à ${t.valeurMax.toLocaleString("fr-FR")}`
        : null,
    ].filter(Boolean).join(" — ") || undefined,
  };
}

/**
 * UN `Resultat` DU MOTEUR, EN FEUILLE AFFICHABLE.
 *
 * UNE SEULE ÉTAPE, et c'est fidèle : le moteur rend une liste plate de termes dans
 * l'ordre où ils s'appliquent, sans les grouper. Inventer des étapes ici — « le
 * socle », « la défense », « l'élément » — supposerait de deviner où couper à partir
 * des libellés, et un découpage faux ferait croire à des sous-totaux qui n'existent
 * pas. Le jour où le moteur groupera ses termes, cette fonction rendra plusieurs
 * étapes sans que l'écran change.
 *
 * `nonPrisEnCompte` REJOINT LES RÉSERVES au lieu de vivre à part. Les deux répondent
 * à la même question du lecteur — « qu'est-ce que ce nombre ne couvre pas ? » — et
 * deux listes séparées sous un même total se lisent comme deux avertissements dont
 * un seul compte. Les manques passent en tête : ils sont plus graves qu'une réserve
 * de forme.
 */
export function feuilleDepuisResultat(r: Resultat, titre = "Le calcul, terme par terme"): Feuille {
  const etape: Etape = {
    nom: "Dans l'ordre où le moteur applique les termes",
    formule: "chaque ligne s'applique au résultat de la précédente",
    termes: r.termes.map(traduireTerme),
    resultat: r.degatsMin,
    resultatMax: r.degatsMax,
  };

  const etapes: Etape[] = [etape];

  /* Le temps de tuer n'est PAS un terme de dégât : c'est ce qu'on en fait. Il forme
     donc son étape, et il ne s'affiche que si le moteur a trouvé une cadence — le
     relevé ne la donne pas pour toutes les armes. */
  if (r.coupsPourTuer != null) {
    etapes.push({
      nom: "Combien de coups, et combien de temps",
      formule: "PV effectifs de la cible ÷ dégâts moyens par coup",
      termes: [
        {
          quoi: "Dégâts moyens par coup",
          valeur: r.degatsMoyen,
          source: "Moyenne de la fourchette calculée ci-dessus",
          certitude: "deduit",
        },
        {
          quoi: r.cadenceMs != null ? "Intervalle entre deux coups (ms)" : "Intervalle entre deux coups",
          valeur: r.cadenceMs,
          detail: r.cadenceMs == null
            ? "Le relevé ne donne pas de vitesse exploitable pour cette arme : le nombre de coups reste juste, la durée non."
            : undefined,
          source: "objets-stats.json ▸ champ va de l'arme (dwAttackSpeed)",
          certitude: r.cadenceMs != null ? "client" : "absent",
        },
      ],
      resultat: r.coupsPourTuer,
      reserve: r.secondesPourTuer == null
        ? "Sans cadence, on compte des coups et pas des secondes."
        : undefined,
    });
  }

  return {
    titre,
    sujet: r.quoi,
    etapes,
    resultat: r.degatsMin,
    resultatMax: r.degatsMax,
    unite: "dégâts",
    reserves: [...r.nonPrisEnCompte, ...r.reserves],
  };
}
