// ════════════════════════════════════════════════════════════════════════════
//  LA DÉFENSE — le seul endroit du moteur dont la FORME est une hypothèse.
//
//  Tout le reste du module additionne et multiplie des nombres écrits dans le
//  client. Ici, non : la manière dont une défense mange un coup est une formule,
//  et cette formule vient du Flyff OFFICIEL. AirFlyff a changé des valeurs
//  ailleurs ; rien ne garantit qu'il n'a pas changé celle-ci. Tout résultat qui
//  passe par ce fichier repart donc avec `RESERVE_DEFENSE`, sans exception.
//
//  LA FORME, telle qu'elle s'applique chez le Flyff officiel :
//
//      v          = racine( défense / (défense + 2 × attaque) )
//      correction = plancher( défense × (1 − v) + attaque × v )
//      dégâts     = attaque − correction
//
//  Ce qu'elle produit, pour qu'on voie de quoi on parle : à défense nulle elle
//  ne retire rien ; quand la défense égale l'attaque elle retire environ 58 % ;
//  quand la défense vaut le double de l'attaque, environ 71 %. Elle n'atteint
//  jamais zéro et ne devient jamais négative.
//
//  DEUX CHIFFRES DE DÉFENSE, ET DEUX CHEMINS. Le relevé des monstres porte `def`
//  (défense physique) et `resMag` (résistance magique) — deux colonnes du client,
//  donc deux faits. Ce qui n'est PAS un fait, c'est le passage par `def / 7 + 1`
//  qu'applique le Flyff officiel avant la formule quand le coup est une
//  compétence : cette compression-là est reprise, et signalée.
//
//  UN CHOIX ASSUMÉ, ET DIFFÉRENT DE FLYFFULATOR. Face à une compétence magique,
//  Flyffulator ne lit pas la résistance magique du monstre — son chemin magique
//  retombe sur un bonus d'équipement, que les monstres n'ont pas, donc sur zéro.
//  Le client d'AirFlyff, lui, écrit bien un `resMag` par monstre (103 pour Elun).
//  On l'emploie, plutôt que de jeter une colonne que le serveur renseigne.
// ════════════════════════════════════════════════════════════════════════════

import type { Cible, Terme } from "./contrat";

/** Interpolation linéaire. Deux lignes, mais nommer l'opération évite de la relire. */
const entre = (a: number, b: number, t: number) => a * (1 - t) + b * t;

/** Quel chemin le coup emprunte. Le nom du chemin change la défense employée. */
export type NatureDuCoup = "ordinaire" | "competenceMelee" | "competenceMagique";

export type Reduction = {
  degats: number;
  termes: Terme[];
  /** La part retirée, en pourcentage du coup avant défense. Pour l'affichage. */
  partRetiree: number;
};

/**
 * La défense qu'on oppose au coup, avec sa source.
 *
 * · coup ordinaire      → `def` telle quelle. Le Flyff officiel recalcule ici
 *   une défense à partir de l'Endurance et de l'équipement du monstre ; le relevé
 *   ne porte ni l'un ni l'autre pour un monstre, donc on prend le chiffre que le
 *   client écrit lui-même. C'est une divergence connue, pas un oubli.
 * · compétence au corps à corps → `def / 7 + 1`.
 * · compétence magique          → `resMag / 7 + 1`.
 */
export function defenseOpposee(cible: Cible, nature: NatureDuCoup): { valeur: number; terme: Terme } {
  if (nature === "ordinaire") {
    return {
      valeur: Math.max(0, Math.floor(cible.defense)),
      terme: {
        cle: "defense.valeur",
        libelle: `Défense de ${cible.nom}`,
        valeur: cible.defense,
        unite: "points",
        source: `Client ▸ propMover ▸ dwDefense, relevé dans monstres.json (${cible.id})`,
        certitude: "client",
        note: "Le Flyff officiel recompose ici la défense depuis l'Endurance et l'équipement du monstre ; le relevé ne porte ni l'une ni l'autre, on emploie donc le chiffre de défense que le client écrit lui-même.",
      },
    };
  }
  const magique = nature === "competenceMagique";
  const brut = magique ? cible.resistanceMagique : cible.defense;
  return {
    valeur: Math.max(0, Math.floor(brut / 7 + 1)),
    terme: {
      cle: "defense.valeur",
      libelle: magique
        ? `Résistance magique de ${cible.nom} (${brut}), comprimée en ${Math.floor(brut / 7 + 1)}`
        : `Défense de ${cible.nom} (${brut}), comprimée en ${Math.floor(brut / 7 + 1)}`,
      valeur: Math.floor(brut / 7 + 1),
      unite: "points",
      source: `${magique ? "dwMagicDefense" : "dwDefense"} : Client ▸ propMover, relevé dans monstres.json (${cible.id}) — la compression « / 7 + 1 » : Flyff officiel`,
      certitude: "flyff-officiel",
      note: "Le chiffre de départ vient du client ; la division par sept qu'on lui applique avant la formule, non.",
    },
  };
}

/**
 * LA RÉDUCTION. Rend les dégâts après défense, et les termes qui l'expliquent.
 *
 * `attaque` est déjà la fourchette basse ou haute : la fonction se calcule sur un
 * nombre, l'appelant l'invoque deux fois.
 */
export function appliquerDefense(attaque: number, defense: number): Reduction {
  const somme = defense + 2 * attaque;
  let v = 0;
  if (defense > 0 && somme > 1) v = Math.sqrt(defense / somme);
  const correction = Math.floor(entre(defense, attaque, v));
  const degats = Math.max(0, attaque - correction);

  return {
    degats,
    partRetiree: attaque > 0 ? (correction / attaque) * 100 : 0,
    termes: [
      {
        cle: "defense.correction",
        libelle: `Réduction par la défense : −${Math.round(attaque > 0 ? (correction / attaque) * 100 : 0)} %`,
        valeur: -correction,
        unite: "points",
        source: "formule du Flyff officiel — NON confirmée sur AirFlyff",
        certitude: "flyff-officiel",
        note: "racine(défense / (défense + 2 × attaque)) sert de curseur entre la défense et l'attaque ; la valeur obtenue est retirée du coup.",
      },
    ],
  };
}

/**
 * L'ÉCART DE NIVEAU, en JcE. Un monstre plus haut que vous encaisse mieux, et le
 * client ne dit pas de combien : la table ci-dessous est celle du Flyff officiel.
 * Elle s'arrête à quinze niveaux d'écart, où il ne reste qu'un centième du coup.
 */
const REDUCTION_ECART = [1, 1, 0.98, 0.95, 0.91, 0.87, 0.81, 0.75, 0.67, 0.59, 0.51, 0.42, 0.32, 0.22, 0.12, 0.01];

export function facteurEcartDeNiveau(niveauAttaquant: number, niveauCible: number): Terme | null {
  const ecart = niveauCible - niveauAttaquant;
  if (ecart <= 0) return null;
  const i = Math.min(ecart, REDUCTION_ECART.length - 1);
  return {
    cle: "ecart.niveau",
    libelle: `Cible ${ecart} niveau${ecart > 1 ? "x" : ""} au-dessus de vous`,
    valeur: REDUCTION_ECART[i],
    unite: "facteur",
    source: "table du Flyff officiel — absente des fichiers du client",
    certitude: "flyff-officiel",
    note: ecart >= 15 ? "Au-delà de quinze niveaux d'écart, il ne reste qu'un centième du coup." : undefined,
  };
}
