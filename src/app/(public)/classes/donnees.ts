// ════════════════════════════════════════════════════════════════════════
//  LA CHAÎNE DE PROMOTION — donnees extraites du client AirFlyff
//
//  Genere depuis `competences.json` (fouille du client, octobre 2025), qui vit
//  hors du depot : ce fichier en est la copie reduite — seulement ce que la page
//  affiche, pas les 202 fiches completes ni leur progression niveau par niveau.
//  Si un jour on veut le simulateur de competences, c'est la source complete
//  qu'il faudra verser, pas ce fichier.
//
//  Les libelles sont reaccentues ici : le JSON de la fouille est desaccentue
//  (« Elementaliste Maitre »), ce qui ne se montre pas a l'ecran.
// ════════════════════════════════════════════════════════════════════════

/** Les six marches de la chaine. Le nom du palier, pas celui de la classe. */
export type Palier = "vagabond" | "metier1" | "metier2" | "maitre" | "heros" | "legendaire";

export type Etape = {
  nom: string;
  /** Embleme officiel 64x64 verse dans /public/jeu/classes/. */
  embleme: string;
  palier: Palier;
  nbCompetences: number;
  /** Plafond des competences du palier : 10 en base, 20 en metier, 5 ensuite. */
  niveauMaxCompetence: number;
  /** Niveau de perso exige. `null` quand les donnees disent 1 — donc rien a annoncer. */
  niveauRequis: number | null;
  /** Points de competence pour monter TOUT le palier au maximum. */
  coutPoints: number;
};

/** Une competence de palier (Maitre ou Heros) : une seule par classe, 5 niveaux. */
export type CompetencePalier = {
  nom: string;
  description: string | null;
  niveauRequis: number;
  /** Cout en PM des niveaux 1 a 5. `null` = la colonne est vide dans le client. */
  coutPM: (number | null)[];
  /** Effets chiffres au niveau 5, deja mis en francais. */
  effets5: string[];
  dureeS: number | null;
  rechargeS: number | null;
};

export type CompetenceLegendaire = {
  nom: string;
  description: string | null;
  niveauRequis: number;
  arme: string | null;
  zone: string | null;
  pm1: number | null;
  pm5: number | null;
  /** Degats min/max au niveau 5, quand la competence en inflige. */
  degats5: [number, number] | null;
  rechargeS: number | null;
  effets5: string[];
};

export type Lignee = {
  /** Clef de CLASSES (src/data/classes.ts) : c'est la que vivent le role, le
   *  nom anglais, l'embleme officiel et le bandeau — pas ici, sinon deux
   *  tables a tenir d'accord. */
  cle: string;
  nom: string;
  jobCode: string;
  etapes: Etape[];
  nbCompetences: number;
  /** Budget pour monter les {nbCompetences} competences au maximum. */
  coutPoints: number;
  sommeNiveauxMax: number;
  maitre: CompetencePalier;
  heros: CompetencePalier;
  legendaires: CompetenceLegendaire[];
};

export const LIGNEES: Lignee[] = [
  {
    "cle": "Templier",
    "nom": "Templier",
    "jobCode": "JOB_LORDTEMPLER_HERO",
    "etapes": [
      {
        "nom": "Vagabond",
        "embleme": "/jeu/classes/jobvagrant.webp",
        "palier": "vagabond",
        "nbCompetences": 3,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 10158
      },
      {
        "nom": "Mercenaire",
        "embleme": "/jeu/classes/jobmercenary.webp",
        "palier": "metier1",
        "nbCompetences": 15,
        "niveauMaxCompetence": 20,
        "niveauRequis": null,
        "coutPoints": 889050
      },
      {
        "nom": "Chevalier",
        "embleme": "/jeu/classes/jobknight.webp",
        "palier": "metier2",
        "nbCompetences": 8,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 27088
      },
      {
        "nom": "Chevalier Maître",
        "embleme": "/jeu/classes/jobknightmaster.webp",
        "palier": "maitre",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 60,
        "coutPoints": 472
      },
      {
        "nom": "Chevalier Héros",
        "embleme": "/jeu/classes/jobknighthero.webp",
        "palier": "heros",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 120,
        "coutPoints": 472
      },
      {
        "nom": "Templier",
        "embleme": "/jeu/classes/joblordtemplerhero.webp",
        "palier": "legendaire",
        "nbCompetences": 6,
        "niveauMaxCompetence": 5,
        "niveauRequis": 130,
        "coutPoints": 2832
      }
    ],
    "nbCompetences": 34,
    "coutPoints": 930072,
    "sommeNiveauxMax": 450,
    "maitre": {
      "nom": "Expertise des armes à deux mains",
      "description": "Augmente considérablement la vitesse de déplacement et la vitesse d'attaque.",
      "niveauRequis": 60,
      "coutPM": [
        null,
        null,
        null,
        null,
        null
      ],
      "effets5": [
        "Force +15 %",
        "PV max +15 %"
      ],
      "dureeS": 1800,
      "rechargeS": null
    },
    "heros": {
      "nom": "Attirance",
      "description": "Augmente de 6% tous les dégâts physiques subit par la cible.",
      "niveauRequis": 120,
      "coutPM": [
        9999999,
        9999999,
        9999999,
        9999999,
        500
      ],
      "effets5": [
        "Dégâts subis +6 %"
      ],
      "dureeS": 60,
      "rechargeS": 120
    },
    "legendaires": [
      {
        "nom": "Armure Divine",
        "description": "Augmente la résistance du Chevalier face aux Boss",
        "niveauRequis": 130,
        "arme": null,
        "zone": "Cible unique",
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "PV max +20 %"
        ]
      },
      {
        "nom": "Attraction",
        "description": "Attire la cible à vous",
        "niveauRequis": 130,
        "arme": "Épée",
        "zone": "Cible unique",
        "pm1": 300,
        "pm5": 500,
        "degats5": [
          90,
          100
        ],
        "rechargeS": null,
        "effets5": []
      },
      {
        "nom": "Châtiment divin",
        "description": "Inflige de lourds dommages à la cible",
        "niveauRequis": 130,
        "arme": "Épée",
        "zone": "Cible unique",
        "pm1": 300,
        "pm5": 500,
        "degats5": [
          300,
          385
        ],
        "rechargeS": null,
        "effets5": []
      },
      {
        "nom": "Coup de Bouclier",
        "description": "Frappe la cible avec le bouclier, l'étourdissant pour quelques instants",
        "niveauRequis": 130,
        "arme": "Bouclier",
        "zone": "Cible unique",
        "pm1": 300,
        "pm5": 500,
        "degats5": [
          219,
          282
        ],
        "rechargeS": null,
        "effets5": [
          "État infligé : Étourdissement (25 %)"
        ]
      },
      {
        "nom": "Provocation",
        "description": "Tente d'attirer l'attention de la cible",
        "niveauRequis": 130,
        "arme": null,
        "zone": "Cible unique",
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": []
      },
      {
        "nom": "Tacle",
        "description": "Inflige des dommages à tous les ennemis autour du Templier",
        "niveauRequis": 130,
        "arme": "Hache",
        "zone": "Zone au sol",
        "pm1": 300,
        "pm5": 500,
        "degats5": [
          165,
          199
        ],
        "rechargeS": null,
        "effets5": [
          "État infligé : Étourdissement (22 %)"
        ]
      }
    ]
  },
  {
    "cle": "Spadassin",
    "nom": "Spadassin",
    "jobCode": "JOB_STORMBLADE_HERO",
    "etapes": [
      {
        "nom": "Vagabond",
        "embleme": "/jeu/classes/jobvagrant.webp",
        "palier": "vagabond",
        "nbCompetences": 3,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 10158
      },
      {
        "nom": "Mercenaire",
        "embleme": "/jeu/classes/jobmercenary.webp",
        "palier": "metier1",
        "nbCompetences": 15,
        "niveauMaxCompetence": 20,
        "niveauRequis": null,
        "coutPoints": 889050
      },
      {
        "nom": "Lame",
        "embleme": "/jeu/classes/jobblade.webp",
        "palier": "metier2",
        "nbCompetences": 8,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 27088
      },
      {
        "nom": "Lame Maître",
        "embleme": "/jeu/classes/jobblademaster.webp",
        "palier": "maitre",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 60,
        "coutPoints": 472
      },
      {
        "nom": "Lame Héros",
        "embleme": "/jeu/classes/jobbladehero.webp",
        "palier": "heros",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 120,
        "coutPoints": 472
      },
      {
        "nom": "Spadassin",
        "embleme": "/jeu/classes/jobstormbladehero.webp",
        "palier": "legendaire",
        "nbCompetences": 4,
        "niveauMaxCompetence": 5,
        "niveauRequis": 130,
        "coutPoints": 1888
      }
    ],
    "nbCompetences": 32,
    "coutPoints": 929128,
    "sommeNiveauxMax": 440,
    "maitre": {
      "nom": "Expertise des armes à une main",
      "description": "Augmente considérablement les dégâts infligés avec une arme à une main+300 et la vitesse de déplacement",
      "niveauRequis": 60,
      "coutPM": [
        null,
        null,
        null,
        null,
        null
      ],
      "effets5": [
        "Force +15 %"
      ],
      "dureeS": 1800,
      "rechargeS": null
    },
    "heros": {
      "nom": "Défense ultime",
      "description": "Augmente de 6% tous les dégâts physiques subit par la cible.",
      "niveauRequis": 120,
      "coutPM": [
        9999999,
        9999999,
        9999999,
        9999999,
        500
      ],
      "effets5": [
        "Dégâts subis +6 %"
      ],
      "dureeS": 60,
      "rechargeS": 120
    },
    "legendaires": [
      {
        "nom": "Berserker",
        "description": "Augmente la puissance d'attaque de l'Assassin",
        "niveauRequis": 130,
        "arme": null,
        "zone": null,
        "pm1": 100,
        "pm5": 300,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Dégâts contre monstres +10 %"
        ]
      },
      {
        "nom": "Croix de Sang",
        "description": "Inflige de lourds dommages à la cible",
        "niveauRequis": 130,
        "arme": null,
        "zone": "Cible unique",
        "pm1": 100,
        "pm5": 300,
        "degats5": [
          142,
          143
        ],
        "rechargeS": null,
        "effets5": []
      },
      {
        "nom": "Pesanteur",
        "description": "Empêche la cible de se déplacer pendant quelques secondes",
        "niveauRequis": 130,
        "arme": null,
        "zone": "Cible unique",
        "pm1": null,
        "pm5": null,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Vitesse de déplacement −50"
        ]
      },
      {
        "nom": "Poussière de Diamant",
        "description": "Inflige des dégâts à de nombreuses cibles autour du Spadassin",
        "niveauRequis": 130,
        "arme": null,
        "zone": "Zone au sol",
        "pm1": 100,
        "pm5": 300,
        "degats5": [
          1075,
          1076
        ],
        "rechargeS": null,
        "effets5": []
      }
    ]
  },
  {
    "cle": "Sylphide",
    "nom": "Sylphide",
    "jobCode": "JOB_WINDLURKER_HERO",
    "etapes": [
      {
        "nom": "Vagabond",
        "embleme": "/jeu/classes/jobvagrant.webp",
        "palier": "vagabond",
        "nbCompetences": 3,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 10158
      },
      {
        "nom": "Acrobate",
        "embleme": "/jeu/classes/jobacrobat.webp",
        "palier": "metier1",
        "nbCompetences": 21,
        "niveauMaxCompetence": 20,
        "niveauRequis": null,
        "coutPoints": 1244670
      },
      {
        "nom": "Baladin",
        "embleme": "/jeu/classes/jobjester.webp",
        "palier": "metier2",
        "nbCompetences": 8,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 27088
      },
      {
        "nom": "Baladin Maître",
        "embleme": "/jeu/classes/jobjestermaster.webp",
        "palier": "maitre",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 60,
        "coutPoints": 472
      },
      {
        "nom": "Baladin Héros",
        "embleme": "/jeu/classes/jobjesterhero.webp",
        "palier": "heros",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 120,
        "coutPoints": 472
      },
      {
        "nom": "Sylphide",
        "embleme": "/jeu/classes/jobwindlurkerhero.webp",
        "palier": "legendaire",
        "nbCompetences": 4,
        "niveauMaxCompetence": 5,
        "niveauRequis": 130,
        "coutPoints": 1888
      }
    ],
    "nbCompetences": 38,
    "coutPoints": 1284748,
    "sommeNiveauxMax": 560,
    "maitre": {
      "nom": "Expertise du yo-yo",
      "description": "Augmente considérablement les dégâts infligés avec le yo-yo ainsi que la puissance d'attaque du Jester",
      "niveauRequis": 60,
      "coutPM": [
        null,
        null,
        null,
        null,
        null
      ],
      "effets5": [
        "Force +15 %"
      ],
      "dureeS": 1800,
      "rechargeS": null
    },
    "heros": {
      "nom": "Onde d'affaiblissement",
      "description": "Augmente de 6% tous les dégâts physiques subit par la cible.",
      "niveauRequis": 120,
      "coutPM": [
        9999999,
        9999999,
        9999999,
        9999999,
        500
      ],
      "effets5": [
        "Dégâts subis +6 %"
      ],
      "dureeS": 60,
      "rechargeS": 120
    },
    "legendaires": [
      {
        "nom": "Coup en traitre",
        "description": "Attaque la cible par derrière",
        "niveauRequis": 130,
        "arme": "Yoyo",
        "zone": "Cible unique",
        "pm1": 80,
        "pm5": 160,
        "degats5": [
          398,
          514
        ],
        "rechargeS": null,
        "effets5": []
      },
      {
        "nom": "Grâce aérienne",
        "description": "Augmente les dégâts contre les boss",
        "niveauRequis": 130,
        "arme": "Yoyo",
        "zone": null,
        "pm1": 50,
        "pm5": null,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Attaque +15 %",
          "Précision +30"
        ]
      },
      {
        "nom": "Précision éclair",
        "description": "Augmente les chances de toucher",
        "niveauRequis": 130,
        "arme": "Yoyo",
        "zone": null,
        "pm1": 50,
        "pm5": 130,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Force +5 %"
        ]
      },
      {
        "nom": "Vent de folie",
        "description": "Inflige de lourds dommages à la cible",
        "niveauRequis": 130,
        "arme": "Yoyo",
        "zone": "Cible unique",
        "pm1": 80,
        "pm5": 160,
        "degats5": [
          398,
          514
        ],
        "rechargeS": null,
        "effets5": []
      }
    ]
  },
  {
    "cle": "Arbaletrier",
    "nom": "Arbalétrier",
    "jobCode": "JOB_CRACKSHOOTER_HERO",
    "etapes": [
      {
        "nom": "Vagabond",
        "embleme": "/jeu/classes/jobvagrant.webp",
        "palier": "vagabond",
        "nbCompetences": 3,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 10158
      },
      {
        "nom": "Acrobate",
        "embleme": "/jeu/classes/jobacrobat.webp",
        "palier": "metier1",
        "nbCompetences": 21,
        "niveauMaxCompetence": 20,
        "niveauRequis": null,
        "coutPoints": 1244670
      },
      {
        "nom": "Ranger",
        "embleme": "/jeu/classes/jobranger.webp",
        "palier": "metier2",
        "nbCompetences": 8,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 27088
      },
      {
        "nom": "Ranger Maître",
        "embleme": "/jeu/classes/jobrangermaster.webp",
        "palier": "maitre",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 60,
        "coutPoints": 472
      },
      {
        "nom": "Ranger Héros",
        "embleme": "/jeu/classes/jobrangerhero.webp",
        "palier": "heros",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 120,
        "coutPoints": 472
      },
      {
        "nom": "Arbalétrier",
        "embleme": "/jeu/classes/jobcrackshooterhero.webp",
        "palier": "legendaire",
        "nbCompetences": 4,
        "niveauMaxCompetence": 5,
        "niveauRequis": 130,
        "coutPoints": 1888
      }
    ],
    "nbCompetences": 38,
    "coutPoints": 1284748,
    "sommeNiveauxMax": 560,
    "maitre": {
      "nom": "Expertise de l'arc",
      "description": "Augmente considérablement les dégâts infligés avec un arc",
      "niveauRequis": 60,
      "coutPM": [
        null,
        null,
        null,
        null,
        null
      ],
      "effets5": [
        "Dextérité +15 %"
      ],
      "dureeS": 1800,
      "rechargeS": null
    },
    "heros": {
      "nom": "Flèche vicieuse",
      "description": "Augmente de 6% tous les dégâts physiques subit par la cible.",
      "niveauRequis": 120,
      "coutPM": [
        9999999,
        9999999,
        9999999,
        9999999,
        500
      ],
      "effets5": [
        "Dégâts subis +6 %"
      ],
      "dureeS": 60,
      "rechargeS": 120
    },
    "legendaires": [
      {
        "nom": "Flèches Téléguidées",
        "description": "Augmente les dégâts contre les boss",
        "niveauRequis": 130,
        "arme": "Arc ou arbalète",
        "zone": null,
        "pm1": 50,
        "pm5": 130,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Dégâts contre boss +15 %"
        ]
      },
      {
        "nom": "Tension",
        "description": "Augmente la puissance d'attaque du Ranger",
        "niveauRequis": 130,
        "arme": "Arc ou arbalète",
        "zone": null,
        "pm1": 50,
        "pm5": 130,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Attaque +450"
        ]
      },
      {
        "nom": "Tir Groupé",
        "description": "Inflige des dégâts à tous les ennemis autour de la cible de l'Arbalétrier.",
        "niveauRequis": 130,
        "arme": "Arc ou arbalète",
        "zone": "Zone au sol",
        "pm1": 80,
        "pm5": 160,
        "degats5": [
          199,
          256
        ],
        "rechargeS": null,
        "effets5": []
      },
      {
        "nom": "Œil du Faucon",
        "description": "Augmente la vitesse de déplacement de l'arbalétrier.",
        "niveauRequis": 130,
        "arme": "Arc ou arbalète",
        "zone": null,
        "pm1": 80,
        "pm5": 160,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Vitesse de déplacement +25"
        ]
      }
    ]
  },
  {
    "cle": "Primat",
    "nom": "Primat",
    "jobCode": "JOB_FLORIST_HERO",
    "etapes": [
      {
        "nom": "Vagabond",
        "embleme": "/jeu/classes/jobvagrant.webp",
        "palier": "vagabond",
        "nbCompetences": 3,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 10158
      },
      {
        "nom": "Acolyte",
        "embleme": "/jeu/classes/jobassist.webp",
        "palier": "metier1",
        "nbCompetences": 17,
        "niveauMaxCompetence": 20,
        "niveauRequis": null,
        "coutPoints": 1007590
      },
      {
        "nom": "Meneur",
        "embleme": "/jeu/classes/jobringmaster.webp",
        "palier": "metier2",
        "nbCompetences": 9,
        "niveauMaxCompetence": 10,
        "niveauRequis": 60,
        "coutPoints": 20456
      },
      {
        "nom": "Meneur Maître",
        "embleme": "/jeu/classes/jobringmastermaster.webp",
        "palier": "maitre",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 60,
        "coutPoints": 472
      },
      {
        "nom": "Meneur Héros",
        "embleme": "/jeu/classes/jobringmasterhero.webp",
        "palier": "heros",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 120,
        "coutPoints": 472
      },
      {
        "nom": "Primat",
        "embleme": "/jeu/classes/jobfloristhero.webp",
        "palier": "legendaire",
        "nbCompetences": 6,
        "niveauMaxCompetence": 5,
        "niveauRequis": 130,
        "coutPoints": 2832
      }
    ],
    "nbCompetences": 37,
    "coutPoints": 1041980,
    "sommeNiveauxMax": 475,
    "maitre": {
      "nom": "Bénédiction du sage",
      "description": "INT+15% et Soins +25%",
      "niveauRequis": 60,
      "coutPM": [
        500,
        500,
        500,
        500,
        500
      ],
      "effets5": [
        "Intelligence +15 %",
        "Puissance de soin +25 %"
      ],
      "dureeS": 1800,
      "rechargeS": null
    },
    "heros": {
      "nom": "Marque de vulnérabilité",
      "description": "Augmente de 10% tous les dégâts magique subit par la cible.",
      "niveauRequis": 120,
      "coutPM": [
        500,
        500,
        500,
        500,
        500
      ],
      "effets5": [
        "Résistance magique −10 %"
      ],
      "dureeS": 60,
      "rechargeS": 120
    },
    "legendaires": [
      {
        "nom": "Bénédiction transcendante",
        "description": "Rebuff instanténément la cible avec tous les buffs du lanceur.",
        "niveauRequis": 120,
        "arme": "Bâton de soin",
        "zone": null,
        "pm1": 1000,
        "pm5": 1800,
        "degats5": null,
        "rechargeS": 5,
        "effets5": []
      },
      {
        "nom": "Empêtrement",
        "description": "Immobilise la cible pendant quelques secondes",
        "niveauRequis": 130,
        "arme": "Bâton de soin",
        "zone": "Cible unique",
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Vitesse de déplacement −100"
        ]
      },
      {
        "nom": "Progression Divine",
        "description": "Augmente l'expérience gagné en tuant des monstres.",
        "niveauRequis": 130,
        "arme": "Bâton de soin",
        "zone": "Cible unique",
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Expérience gagnée +10 %"
        ]
      },
      {
        "nom": "Protection Divine",
        "description": "Augmente les dégâts contre les monstres des membres du groupe",
        "niveauRequis": 130,
        "arme": "Bâton de soin",
        "zone": "Zone au sol",
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Dégâts contre monstres +10 %"
        ]
      },
      {
        "nom": "Soin Actif",
        "description": "Augmente la puissance d'attaque et les soins de la cible.",
        "niveauRequis": 130,
        "arme": "Bâton de soin",
        "zone": "Cible unique",
        "pm1": 100,
        "pm5": 300,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Attaque +8 %",
          "Puissance de soin +10 %"
        ]
      },
      {
        "nom": "Vélocité",
        "description": "Augmente la vitesse de déplacement des membres du groupe",
        "niveauRequis": 130,
        "arme": "Bâton de soin",
        "zone": "Zone au sol",
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Vitesse de déplacement +15"
        ]
      }
    ]
  },
  {
    "cle": "Chanoine",
    "nom": "Chanoine",
    "jobCode": "JOB_FORCEMASTER_HERO",
    "etapes": [
      {
        "nom": "Vagabond",
        "embleme": "/jeu/classes/jobvagrant.webp",
        "palier": "vagabond",
        "nbCompetences": 3,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 10158
      },
      {
        "nom": "Acolyte",
        "embleme": "/jeu/classes/jobassist.webp",
        "palier": "metier1",
        "nbCompetences": 17,
        "niveauMaxCompetence": 20,
        "niveauRequis": null,
        "coutPoints": 1007590
      },
      {
        "nom": "Moine",
        "embleme": "/jeu/classes/jobbillposter.webp",
        "palier": "metier2",
        "nbCompetences": 8,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 27088
      },
      {
        "nom": "Moine Maître",
        "embleme": "/jeu/classes/jobbillpostermaster.webp",
        "palier": "maitre",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 60,
        "coutPoints": 472
      },
      {
        "nom": "Moine Héros",
        "embleme": "/jeu/classes/jobbillposterhero.webp",
        "palier": "heros",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 120,
        "coutPoints": 472
      },
      {
        "nom": "Chanoine",
        "embleme": "/jeu/classes/jobforcemasterhero.webp",
        "palier": "legendaire",
        "nbCompetences": 4,
        "niveauMaxCompetence": 5,
        "niveauRequis": 130,
        "coutPoints": 1888
      }
    ],
    "nbCompetences": 34,
    "coutPoints": 1047668,
    "sommeNiveauxMax": 480,
    "maitre": {
      "nom": "Expertise des poings",
      "description": "Augmente considérablement les dégâts infligés par le moine.",
      "niveauRequis": 60,
      "coutPM": [
        500,
        500,
        500,
        500,
        500
      ],
      "effets5": [
        "Force +15 %"
      ],
      "dureeS": 1800,
      "rechargeS": null
    },
    "heros": {
      "nom": "Désenchantement",
      "description": "Augmente de 6% tous les dégâts physiques subit par la cible.",
      "niveauRequis": 120,
      "coutPM": [
        9999999,
        9999999,
        9999999,
        9999999,
        500
      ],
      "effets5": [
        "Dégâts subis +6 %"
      ],
      "dureeS": 60,
      "rechargeS": 120
    },
    "legendaires": [
      {
        "nom": "Coalition",
        "description": "Augmente l'attaque des membres du groupe",
        "niveauRequis": 130,
        "arme": null,
        "zone": "Zone au sol",
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Toutes les statistiques +25"
        ]
      },
      {
        "nom": "Frénésie",
        "description": "Augmente le taux de coups critiques des membres du groupe",
        "niveauRequis": 130,
        "arme": null,
        "zone": "Zone au sol",
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Dégâts contre monstres +10 %"
        ]
      },
      {
        "nom": "Infusion de puissance",
        "description": "Augmente la puissance des sorts des membres du groupe",
        "niveauRequis": 130,
        "arme": null,
        "zone": "Zone au sol",
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "PM max +10 %",
          "Vitesse d'incantation +15 %"
        ]
      },
      {
        "nom": "Vitesse Divine",
        "description": "Augmente la vitesse d'attaque des membres du groupe",
        "niveauRequis": 130,
        "arme": null,
        "zone": "Zone au sol",
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Dégâts critiques +25"
        ]
      }
    ]
  },
  {
    "cle": "Envouteur",
    "nom": "Envoûteur",
    "jobCode": "JOB_MENTALIST_HERO",
    "etapes": [
      {
        "nom": "Vagabond",
        "embleme": "/jeu/classes/jobvagrant.webp",
        "palier": "vagabond",
        "nbCompetences": 3,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 10158
      },
      {
        "nom": "Magicien",
        "embleme": "/jeu/classes/jobmagician.webp",
        "palier": "metier1",
        "nbCompetences": 17,
        "niveauMaxCompetence": 20,
        "niveauRequis": null,
        "coutPoints": 1007590
      },
      {
        "nom": "Psykeeper",
        "embleme": "/jeu/classes/jobpsychikeeper.webp",
        "palier": "metier2",
        "nbCompetences": 8,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 27088
      },
      {
        "nom": "Psykeeper Maître",
        "embleme": "/jeu/classes/jobpsychikeepermaster.webp",
        "palier": "maitre",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 60,
        "coutPoints": 472
      },
      {
        "nom": "Psykeeper Héros",
        "embleme": "/jeu/classes/jobpsychikeeperhero.webp",
        "palier": "heros",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 120,
        "coutPoints": 472
      },
      {
        "nom": "Envoûteur",
        "embleme": "/jeu/classes/jobmentalisthero.webp",
        "palier": "legendaire",
        "nbCompetences": 5,
        "niveauMaxCompetence": 5,
        "niveauRequis": 130,
        "coutPoints": 2360
      }
    ],
    "nbCompetences": 35,
    "coutPoints": 1048140,
    "sommeNiveauxMax": 485,
    "maitre": {
      "nom": "Maître du savoir",
      "description": "Accroît considérablement la puissance d'attaque du Sorcier",
      "niveauRequis": 60,
      "coutPM": [
        500,
        500,
        500,
        500,
        500
      ],
      "effets5": [
        "Intelligence +15 %"
      ],
      "dureeS": 1800,
      "rechargeS": null
    },
    "heros": {
      "nom": "Malédiction",
      "description": "Baisse de 10% la resistance magique du boss pendant 60s",
      "niveauRequis": 120,
      "coutPM": [
        9999999,
        9999999,
        9999999,
        9999999,
        500
      ],
      "effets5": [
        "Résistance magique −10 %"
      ],
      "dureeS": 60,
      "rechargeS": 120
    },
    "legendaires": [
      {
        "nom": "Damnation",
        "description": "Inflige des dégâts à la cible de manière périodique",
        "niveauRequis": 130,
        "arme": "Bâton ou baguette",
        "zone": "Cible unique",
        "pm1": 300,
        "pm5": 500,
        "degats5": [
          128,
          129
        ],
        "rechargeS": null,
        "effets5": [
          "État infligé : Saignement"
        ]
      },
      {
        "nom": "Déchéance",
        "description": "Augmente la défense de l'Envoûteur",
        "niveauRequis": 130,
        "arme": null,
        "zone": null,
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Dégâts contre monstres +10 %"
        ]
      },
      {
        "nom": "Engourdissement",
        "description": "Augmente la vitesse d'attaque de l'envoûteur",
        "niveauRequis": 130,
        "arme": null,
        "zone": null,
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Dégâts magiques +10 %"
        ]
      },
      {
        "nom": "Langueur",
        "description": "Augmente l'attaque de l'Envoûteur",
        "niveauRequis": 130,
        "arme": null,
        "zone": null,
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "Attaque +10 %"
        ]
      },
      {
        "nom": "Sombre pari",
        "description": "Inflige de lourds dommages à la cible",
        "niveauRequis": 130,
        "arme": "Bâton ou baguette",
        "zone": "Cible unique",
        "pm1": 300,
        "pm5": 500,
        "degats5": [
          148,
          149
        ],
        "rechargeS": 2,
        "effets5": []
      }
    ]
  },
  {
    "cle": "Arcaniste",
    "nom": "Arcaniste",
    "jobCode": "JOB_ELEMENTORLORD_HERO",
    "etapes": [
      {
        "nom": "Vagabond",
        "embleme": "/jeu/classes/jobvagrant.webp",
        "palier": "vagabond",
        "nbCompetences": 3,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 10158
      },
      {
        "nom": "Magicien",
        "embleme": "/jeu/classes/jobmagician.webp",
        "palier": "metier1",
        "nbCompetences": 17,
        "niveauMaxCompetence": 20,
        "niveauRequis": null,
        "coutPoints": 1007590
      },
      {
        "nom": "Élémentaliste",
        "embleme": "/jeu/classes/jobelementor.webp",
        "palier": "metier2",
        "nbCompetences": 19,
        "niveauMaxCompetence": 10,
        "niveauRequis": null,
        "coutPoints": 60948
      },
      {
        "nom": "Élémentaliste Maître",
        "embleme": "/jeu/classes/jobelementormaster.webp",
        "palier": "maitre",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 60,
        "coutPoints": 472
      },
      {
        "nom": "Élémentaliste Héros",
        "embleme": "/jeu/classes/jobelementorhero.webp",
        "palier": "heros",
        "nbCompetences": 1,
        "niveauMaxCompetence": 5,
        "niveauRequis": 120,
        "coutPoints": 472
      },
      {
        "nom": "Arcaniste",
        "embleme": "/jeu/classes/jobelementorlordhero.webp",
        "palier": "legendaire",
        "nbCompetences": 4,
        "niveauMaxCompetence": 5,
        "niveauRequis": 130,
        "coutPoints": 1888
      }
    ],
    "nbCompetences": 45,
    "coutPoints": 1081528,
    "sommeNiveauxMax": 581,
    "maitre": {
      "nom": "Maître du savoir",
      "description": "Accroît considérablement la puissance d'attaque de l'Elémentaliste",
      "niveauRequis": 60,
      "coutPM": [
        500,
        500,
        500,
        500,
        500
      ],
      "effets5": [
        "Intelligence +15 %"
      ],
      "dureeS": 1800,
      "rechargeS": null
    },
    "heros": {
      "nom": "Esprit maudit",
      "description": "Augmente de 10% tous les dégâts magique subit par la cible.",
      "niveauRequis": 120,
      "coutPM": [
        9999999,
        9999999,
        9999999,
        9999999,
        500
      ],
      "effets5": [
        "Résistance magique −10 %"
      ],
      "dureeS": 60,
      "rechargeS": 120
    },
    "legendaires": [
      {
        "nom": "Coma",
        "description": "Endort la cible pour quelques secondes",
        "niveauRequis": 130,
        "arme": "Bâton",
        "zone": "Cible unique",
        "pm1": 300,
        "pm5": 500,
        "degats5": null,
        "rechargeS": null,
        "effets5": [
          "État infligé : Sommeil (100 %)"
        ]
      },
      {
        "nom": "Lance de l‘esprit",
        "description": "Projette une lance de magie pure sur la cible",
        "niveauRequis": 130,
        "arme": "Bâton",
        "zone": "Cible unique",
        "pm1": 300,
        "pm5": 500,
        "degats5": [
          109,
          110
        ],
        "rechargeS": null,
        "effets5": []
      },
      {
        "nom": "Sphère Céleste",
        "description": "Une sphère qui contient la furie des arcanes et inflige des dégâts à la cible",
        "niveauRequis": 130,
        "arme": "Bâton",
        "zone": "Cible unique",
        "pm1": 300,
        "pm5": 500,
        "degats5": [
          109,
          110
        ],
        "rechargeS": null,
        "effets5": []
      },
      {
        "nom": "Électrocution",
        "description": "Inflige des dégâts de foudre à toutes les cibles autour de l'Arcaniste",
        "niveauRequis": 130,
        "arme": "Bâton",
        "zone": "Zone au sol",
        "pm1": 300,
        "pm5": 500,
        "degats5": [
          150,
          151
        ],
        "rechargeS": null,
        "effets5": [
          "État infligé : Étourdissement (25 %)"
        ]
      }
    ]
  }
];

/**
 * Cout d'un palier de competence (table `expSkill` du client). Le meme pour
 * toutes les classes — rien dans les fichiers n'indique de remise par classe.
 * Les sauts 9→11 et 18→19 sont la ou se decide un build.
 */
export const XP_COMPETENCE: { niveau: number; palier: number; cumul: number }[] = [
  {
    "niveau": 2,
    "palier": 40,
    "cumul": 40
  },
  {
    "niveau": 3,
    "palier": 100,
    "cumul": 140
  },
  {
    "niveau": 4,
    "palier": 138,
    "cumul": 278
  },
  {
    "niveau": 5,
    "palier": 194,
    "cumul": 472
  },
  {
    "niveau": 6,
    "palier": 266,
    "cumul": 738
  },
  {
    "niveau": 7,
    "palier": 346,
    "cumul": 1084
  },
  {
    "niveau": 8,
    "palier": 430,
    "cumul": 1514
  },
  {
    "niveau": 9,
    "palier": 856,
    "cumul": 2370
  },
  {
    "niveau": 10,
    "palier": 1016,
    "cumul": 3386
  },
  {
    "niveau": 11,
    "palier": 2064,
    "cumul": 5450
  },
  {
    "niveau": 12,
    "palier": 2272,
    "cumul": 7722
  },
  {
    "niveau": 13,
    "palier": 3210,
    "cumul": 10932
  },
  {
    "niveau": 14,
    "palier": 3470,
    "cumul": 14402
  },
  {
    "niveau": 15,
    "palier": 4690,
    "cumul": 19092
  },
  {
    "niveau": 16,
    "palier": 5010,
    "cumul": 24102
  },
  {
    "niveau": 17,
    "palier": 6576,
    "cumul": 30678
  },
  {
    "niveau": 18,
    "palier": 6990,
    "cumul": 37668
  },
  {
    "niveau": 19,
    "palier": 9602,
    "cumul": 47270
  },
  {
    "niveau": 20,
    "palier": 12000,
    "cumul": 59270
  }
];

/** Comment se monte une competence de Heros. Source : `heroskillup.inc`. */
export const REGLE_HEROS = "Les competences de Heros se montent avec un joyau de chaque type (topaze, rubis, saphir, emeraude, diamant). Le niveau obtenu est aleatoire et plafonne a 5. Source : heroskillup.inc.";

export const LIMITES = {
  niveauMaxPersonnage: 200,
  niveauMaxGeneral: 120,
  niveauMaxLegendaire: 130,
};

/**
 * Retrouve une lignee par sa clef (« Envouteur ») ou son nom affiche
 * (« Envoûteur »). Insensible aux accents : les clefs n'en portent pas, les
 * libelles si, et les appelants melangent les deux.
 */
export function ligneeDe(cle: string): Lignee | undefined {
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return LIGNEES.find((l) => norm(l.cle) === norm(cle) || norm(l.nom) === norm(cle));
}
