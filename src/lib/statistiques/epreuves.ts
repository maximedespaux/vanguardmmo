import type { Personnage } from "./moteur";

/**
 * LES CINQ ÉPREUVES — cinq personnages choisis pour MORDRE.
 *
 * Un moteur de statistiques ne se prouve pas sur un cas facile : il se prouve sur
 * les cas où une lecture négligente donne un nombre faux. Chacune de ces cinq
 * épreuves attaque un point précis, et le résultat de `/api/statistiques?epreuve=N`
 * montre le calcul terme par terme avec la source de chaque terme.
 *
 *  1. TEMPLIER SHAÏTAN COMPLET — les LIGNES NÉGATIVES. La panoplie donne
 *     DST_PVP_DMG_RATE = −200 sur quatre pièces : porter l'ensemble complet COÛTE
 *     des dégâts JcJ. Un moteur qui prend la valeur absolue, ou qui ignore les
 *     lignes négatives « parce qu'elles doivent être une erreur de relevé »,
 *     annonce un bonus là où il y a une perte.
 *     Elle attaque aussi les SEUILS : le Haubert seul (une pièce) ne déclenche
 *     rien, les quatre déclenchent les six lignes.
 *
 *  2. ANNEAU AILÉ +30 ET BOUCLES HARPE +30 — les PLATEAUX. Le client réécrit
 *     DST_ATKPOWER = 1000 aux paliers 20 À 30 des Boucles Harpe. Sous un cumul,
 *     onze mille d'attaque sortiraient de nulle part ; la valeur du palier
 *     REMPLACE, donc c'est 1000. L'Anneau Ailé ajoute le second piège : ses trois
 *     bonus propres sont des POURCENTAGES d'attribut (Force %, Dextérité %,
 *     Intelligence %) que rien, dans le client, ne dit où appliquer.
 *
 *  3. GLAIVE ÉTERNEL ARTEFACT +20, CINQ GEMMES ET TROIS HOLOGRAPHIQUES — le
 *     SERTISSAGE au complet. Elle attaque l'ordre des neuf statistiques (GEMU et
 *     non DIASTATS), la lecture des paliers de gemme, et le fait que le +20 de
 *     l'arme ne compte pour RIEN puisque son gain n'existe dans aucun fichier.
 *
 *  4. ARBALÉTRIER ARC ÉTERNEL MYTHIQUE — le TROU. L'arc n'a pas de facteur
 *     d'arme dans propJob.inc : son attaque n'est pas chiffrable, et le moteur le
 *     DIT au lieu d'emprunter le facteur du yo-yo. La rareté Mythique y ajoute la
 *     séparation entre maîtrise d'arme (déterministe) et lignes de rareté
 *     (tirées au sort, rendues en intervalle).
 *
 *  5. CHANOINE SCEPTRE, COSTUME COMPLET, CARNETS — les POURCENTAGES DE PARTOUT.
 *     Le costume ne paie qu'aux quatre pièces et son tableau se compte UNE fois ;
 *     le sceptre porte 300 de Soins % et 100 de Temps d'incantation % (une
 *     RÉDUCTION : positif veut dire moins) ; les carnets versent « Toutes les
 *     statistiques », qui se répand sur les quatre attributs.
 */

export const EPREUVES: Personnage[] = [
  {
    nom: "Épreuve 1 — Templier Shaïtan complet",
    classe: "Templier",
    sexe: "G",
    niveau: 200,
    attributs: { Endurance: 300, Force: 98 },
    equipement: {
      weapon: { id: 22501 },
      helmet: { id: 20833 },
      suit: { id: 20849, percage: [24824, 24824, 24824, 24824] },
      gauntlet: { id: 20865 },
      boots: { id: 20881 },
    },
  },
  {
    nom: "Épreuve 2 — Anneau Ailé +30 et Boucles Harpe +30",
    classe: "Spadassin",
    sexe: "G",
    niveau: 200,
    attributs: { Force: 300, Dextérité: 98 },
    equipement: {
      weapon: { id: 25034 },
      ring1: { id: 25177, palier: 30 },
      ring2: { id: 25184, palier: 30 },
      earring1: { id: 25178, palier: 30 },
      earring2: { id: 25178, palier: 25 },
      necklace: { id: 25179, palier: 30 },
    },
  },
  {
    nom: "Épreuve 3 — Glaive éternel Artefact +20, huit logements",
    classe: "Templier",
    sexe: "G",
    niveau: 200,
    attributs: { Force: 200, Endurance: 198 },
    equipement: {
      weapon: {
        id: 22501,
        palier: 20,
        gemmes: [
          { stat: "PV max", gemme: "Diamant" },
          { stat: "PV max", gemme: "Diamant" },
          { stat: "PV max", gemme: "Diamant" },
          { stat: "Attaque", gemme: "Diamant" },
          { stat: "Attaque", gemme: "Diamant" },
        ],
        holographiques: ["Force", "Force", "Dégâts JcJ"],
      },
      helmet: { id: 22533 },
      suit: { id: 22534 },
      gauntlet: { id: 22535 },
      boots: { id: 22536 },
      // LE GRENAT D'AMOUR +20 est ajouté pour deux chemins que rien d'autre
      // n'empruntait. (a) Son palier donne DST_CHR_DMG = 900, la ligne dont le
      // libellé du relevé (« Dégâts subis réduits ») contredit la description du
      // jeu (« fournit de l'ATQ ») : le moteur ne l'ajoute pas à l'attaque et
      // annonce l'écart chiffré. (b) Son palier donne aussi « Défense % » 10 —
      // le seul pourcentage de défense de toutes les épreuves, et il vérifie que
      // le pourcentage s'applique APRÈS l'absolu, l'inverse de l'attaque.
      ring1: { id: 24365, palier: 20 },
    },
  },
  {
    nom: "Épreuve 4 — Arbalétrier Arc éternel Mythique",
    classe: "Arbaletrier",
    sexe: "F",
    niveau: 200,
    attributs: { Dextérité: 300, Endurance: 98 },
    equipement: {
      weapon: {
        id: 22509,
        rarete: "MYTHIC",
        percage: [24187, 24187, 24187, 24187, 24187, 24187, 24187, 24187, 24187, 24187, 24187, 24187],
        eveil: [{ stat: "Force", valeur: 15 }, { stat: "Dégâts critiques", valeur: 40 }],
        scroll: { stat: "Dextérité", valeur: 4 },
      },
      ring1: { id: 23920 },
    },
  },
  {
    nom: "Épreuve 5 — Chanoine, sceptre, costume complet, carnets",
    classe: "Chanoine",
    sexe: "G",
    niveau: 200,
    attributs: { Intelligence: 300, Endurance: 98 },
    equipement: {
      weapon: { id: 22505 },
      fhead: { id: "itm_mSeakingLook01_Cap-32.dds#PvE", gemmesCostume: ["Intelligence", "Intelligence", "Intelligence", "Intelligence"] },
      ftop: { id: "itm_mSeakingLook01_Upper-32.dds#PvE" },
      fhand: { id: "itm_mSeakingLook01_Hand-32.dds#PvE" },
      ffoot: { id: "itm_mSeakingLook01_Foot-32.dds#PvE" },
    },
    // TROIS CARNETS, ET LE TROISIÈME EST LE SEUL QUI PROUVE QUELQUE CHOSE.
    // Les carnets 0 et 1 écrivent le MÊME tableau dans `base` et dans `complet` :
    // les demander complets ou non donne le même résultat, donc ils ne vérifient
    // pas la distinction. « Le potentiel de l'esprit » (rang 5) la vérifie —
    // base : Maîtrise d'arme % 15, Précision 15, Taux critique 10 ;
    // complet : 25, 25, 15. C'est le seul des trois dont le nombre change.
    carnets: [{ rang: 0 }, { rang: 1, complet: true }, { rang: 5, complet: true }],
  },
];
