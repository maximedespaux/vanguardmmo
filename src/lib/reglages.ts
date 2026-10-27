/**
 * LES RÉGLAGES DE PAGE — ce qu'une page laisse changer, et à qui.
 *
 * Demande de Maxime : « avoir la possibilité sur chaque page de faire un paramétrage
 * en tant que vanguard uniquement ».
 *
 * LE PRINCIPE, et c'est ce qui décide de tout le reste : le SCHÉMA vit dans le code
 * de la page, la base ne garde que les VALEURS. Une page qui gagne un réglage n'a
 * donc besoin d'aucune migration, et un réglage qu'on retire cesse simplement
 * d'exister — la valeur orpheline dort en base sans rien casser.
 *
 * CE QUE CE N'EST PAS. Pas un CMS : on ne réécrit pas le contenu d'une page depuis
 * un panneau. On règle ce qu'elle MONTRE et COMMENT — une section visible ou non, un
 * nombre de lignes, un ordre, un avertissement qu'on veut mettre en avant. Le
 * contenu, lui, reste dans le code et dans les relevés du client, où il est
 * vérifiable. Un éditeur de texte libre existe déjà là où il a du sens
 * (`StrategieCS`, où le staff écrit sa stratégie) et c'est un choix différent.
 *
 * POURQUOI LES VALEURS PAR DÉFAUT SONT DANS LE SCHÉMA. Une page doit rendre
 * correctement AVANT que quiconque ait ouvert le panneau, et si la base est
 * injoignable. Le défaut n'est donc pas « rien » mais l'état actuel de la page : un
 * réglage neuf ne change jamais ce qu'on voit tant que personne ne l'a touché.
 */

export type Reglage =
  | { clef: string; type: "interrupteur"; label: string; aide?: string; defaut: boolean }
  | { clef: string; type: "nombre"; label: string; aide?: string; defaut: number; min?: number; max?: number }
  | { clef: string; type: "choix"; label: string; aide?: string; defaut: string; options: { valeur: string; label: string }[] }
  | { clef: string; type: "texte"; label: string; aide?: string; defaut: string; long?: boolean };

export type ValeurReglage = boolean | number | string;
export type Valeurs = Record<string, ValeurReglage>;

/** Le schéma d'une page : son chemin, ce qu'on y règle, et une phrase qui dit à quoi
 *  sert le panneau — sans elle, on ouvre un panneau d'interrupteurs anonymes. */
export type SchemaPage = {
  page: string;
  /**
   * L'ancienne adresse de la page, quand elle en a changé : tant que la nouvelle n'a
   * jamais été réglée, on relit les valeurs rangées sous l'ancienne. Sans ce repli, le
   * déménagement d'une page remettait ses réglages à zéro sans que personne n'y touche.
   * Le premier enregistrement écrit sous `page`, et le repli cesse de servir.
   */
  repli?: string;
  titre: string;
  quoi: string;
  reglages: Reglage[];
};

/** Les valeurs par défaut, lues sur le schéma. */
export function defauts(schema: SchemaPage): Valeurs {
  const v: Valeurs = {};
  for (const r of schema.reglages) v[r.clef] = r.defaut;
  return v;
}

/**
 * Les valeurs effectives : le défaut du schéma, écrasé par ce qui est en base.
 *
 * On ne fait PAS confiance au blob : il a été écrit par une version antérieure de la
 * page, et une valeur dont le type ne correspond plus au réglage est écartée au
 * profit du défaut. Sans ce contrôle, un interrupteur devenu un nombre rendrait la
 * page avec une chaîne là où elle attend un entier — et l'erreur se produirait chez
 * le lecteur, pas chez celui qui a réglé.
 */
export function fusionner(schema: SchemaPage, brut: unknown): Valeurs {
  const v = defauts(schema);
  if (!brut || typeof brut !== "object") return v;
  const b = brut as Record<string, unknown>;
  for (const r of schema.reglages) {
    const x = b[r.clef];
    if (x === undefined || x === null) continue;
    if (r.type === "interrupteur" && typeof x === "boolean") v[r.clef] = x;
    else if (r.type === "nombre" && typeof x === "number" && Number.isFinite(x)) {
      // Les bornes du schéma sont respectées ici et pas seulement à la saisie : la
      // valeur en base peut venir d'un schéma où la borne était plus large.
      const min = r.min ?? -Infinity, max = r.max ?? Infinity;
      v[r.clef] = Math.min(max, Math.max(min, x));
    } else if (r.type === "choix" && typeof x === "string" && r.options.some((o) => o.valeur === x)) v[r.clef] = x;
    else if (r.type === "texte" && typeof x === "string") v[r.clef] = x;
  }
  return v;
}

/** Ne garder que ce qui DIFFÈRE du défaut. Écrire l'ensemble figerait les défauts :
 *  une page qui change son défaut plus tard ne le verrait jamais s'appliquer, parce
 *  que l'ancienne valeur identique serait en base et gagnerait. */
export function aEnregistrer(schema: SchemaPage, valeurs: Valeurs): Valeurs {
  const d = defauts(schema);
  const out: Valeurs = {};
  for (const r of schema.reglages) {
    if (valeurs[r.clef] !== undefined && valeurs[r.clef] !== d[r.clef]) out[r.clef] = valeurs[r.clef];
  }
  return out;
}
