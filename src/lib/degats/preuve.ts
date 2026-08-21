// ════════════════════════════════════════════════════════════════════════════
//  LA PREUVE — cinq calculs complets, terme par terme, avec la source de chacun.
//
//  Un moteur de dégâts ne se relit pas : il se fait dérouler. Ce fichier prend
//  cinq situations réelles, les calcule, et imprime CHAQUE ligne du calcul avec
//  l'endroit d'où le nombre sort. C'est la seule vérification qui vaille, et elle
//  se rejoue :
//
//      npx tsx src/lib/degats/preuve.ts
//
//  Les cinq cas sont choisis pour couvrir ce qui peut mal tourner, pas pour faire
//  de beaux chiffres :
//    1. une compétence de bas niveau, où l'on peut suivre chaque terme à la main ;
//    2. une compétence de haut niveau, arme ultime, contre un monstre à vies ;
//    3. une attaque ordinaire avec un élément posé, contre une cible VULNÉRABLE ;
//    4. une compétence magique, où la résistance magique du monstre entre en jeu ;
//    5. L'ARC, qui ne se calculait pas et se calcule enfin, plus deux REFUS
//       qui tiennent toujours — parce qu'un moteur qui ne sait pas refuser
//       n'est pas fiable, et qu'un moteur qui refuse à tort ne l'est pas non plus.
// ════════════════════════════════════════════════════════════════════════════

import { avecAppoints, catalogueDeGuilde } from "./consommables";
import type { Combattant, Resultat } from "./contrat";
import { famillesSansFacteurDArme, lectureDuFacteurDArme, type FamilleArme } from "./armes";
import { armeEquipee, bonusDObjet, cible, cibleParNom, competences } from "./donnees";
import { coupDeCompetence, coupOrdinaire } from "./moteur";

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });

const SIGLE = { client: "[CLIENT]", "flyff-officiel": "[FLYFF OFFICIEL]", inconnu: "[INCONNU]" };

function imprimer(titre: string, r: Resultat) {
  console.log("\n" + "═".repeat(100));
  console.log(titre);
  console.log("═".repeat(100));
  console.log(r.quoi + "\n");
  for (const t of r.termes) {
    const v = t.valeurMax != null && t.valeurMax !== t.valeur ? `${fmt(t.valeur)} … ${fmt(t.valeurMax)}` : fmt(t.valeur);
    const u = { points: "", pourcent: " %", facteur: " ×", ms: " ms", parSeconde: "/s" }[t.unite];
    console.log(`  ${SIGLE[t.certitude].padEnd(18)} ${t.libelle}`);
    console.log(`  ${" ".repeat(18)}   = ${v}${u}`);
    console.log(`  ${" ".repeat(18)}   source : ${t.source}`);
    if (t.note) console.log(`  ${" ".repeat(18)}   ⚠ ${t.note}`);
  }
  console.log(`\n  ➜ DÉGÂTS : ${fmt(r.degatsMin)} à ${fmt(r.degatsMax)} (moyenne ${fmt(r.degatsMoyen)})`);
  if (r.cadenceMs != null) console.log(`  ➜ Cadence : ${fmt(r.cadenceMs)} ms — ${fmt(r.degatsParSeconde ?? 0)} dégâts par seconde`);
  if (r.coupsPourTuer != null) console.log(`  ➜ Coups pour vider la cible : ${fmt(r.coupsPourTuer)}${r.secondesPourTuer != null ? ` (${fmt(r.secondesPourTuer)} s)` : ""}`);
  if (r.reserves.length) {
    console.log("\n  RÉSERVES — à afficher AVEC le nombre :");
    for (const x of new Set(r.reserves)) console.log(`   · ${x}`);
  }
  if (r.nonPrisEnCompte.length) {
    console.log("\n  NON PRIS EN COMPTE :");
    for (const x of new Set(r.nonPrisEnCompte)) console.log(`   · ${x}`);
  }
}

/** Un combattant de test, monté à partir de vraies lignes du relevé. */
function combattant(o: {
  niveau: number;
  classe: string;
  force: number;
  endurance: number;
  dexterite: number;
  intelligence: number;
  arme: string;
  upgrade?: number;
  element?: Combattant["armeDroite"] extends null ? never : NonNullable<Combattant["armeDroite"]>["element"];
  bonusSupplementaires?: Record<string, number>;
}): Combattant {
  const arme = armeEquipee(o.arme, { upgrade: o.upgrade, element: o.element ?? null });
  if (!arme) throw new Error(`Arme ${o.arme} absente du relevé`);
  // Les bonus que porte l'arme elle-même sont de vrais bonus : on les prend.
  const bonus = { ...bonusDObjet(o.arme), ...(o.bonusSupplementaires ?? {}) };
  // Le contrat veut que les quatre statistiques soient déjà totalisées : on retire
  // donc de `bonus` les codes qui les alimentent, après les avoir versés.
  const c: Combattant = {
    niveau: o.niveau,
    classe: o.classe,
    force: o.force + (bonus.DST_STR ?? 0) + (bonus.DST_STAT_ALLUP ?? 0),
    endurance: o.endurance + (bonus.DST_STA ?? 0) + (bonus.DST_STAT_ALLUP ?? 0),
    dexterite: o.dexterite + (bonus.DST_DEX ?? 0) + (bonus.DST_STAT_ALLUP ?? 0),
    intelligence: o.intelligence + (bonus.DST_INT ?? 0) + (bonus.DST_STAT_ALLUP ?? 0),
    bonus,
    armeDroite: arme,
    armeGauche: null,
  };
  for (const code of ["DST_STR", "DST_STA", "DST_DEX", "DST_INT", "DST_STAT_ALLUP", "DST_STR_PERCENT", "DST_STA_PERCENT", "DST_DEX_PERCENT", "DST_INT_PERCENT"]) {
    if (c.bonus[code] != null) {
      if (code.endsWith("_PERCENT")) {
        const champ = { DST_STR_PERCENT: "force", DST_STA_PERCENT: "endurance", DST_DEX_PERCENT: "dexterite", DST_INT_PERCENT: "intelligence" }[code] as "force";
        c[champ] = Math.floor(c[champ] * (1 + c.bonus[code] / 100));
      }
      delete c.bonus[code];
    }
  }
  return c;
}

// ── CAS 1 ───────────────────────────────────────────────────────────────────
// Frappe pure niveau 10, Vagabond niveau 15, hache Rodney. Le cas où tout se
// vérifie à la main : arme 25–33, fourchette de compétence 13–13, coefficient 5,
// Force 40.
{
  const c = combattant({ niveau: 15, classe: "VAGRANT", force: 40, endurance: 20, dexterite: 25, intelligence: 15, arme: "II_WEA_AXE_RODNEY" });
  const adversaire = cible("MI_AIBATT1")!;
  imprimer("CAS 1 — Frappe pure niveau 10 · Vagabond 15 · Hache Rodney contre un Jeune Aibatt", coupDeCompetence(c, adversaire, "SI_VAG_ONE_CLEANHIT", 10));
}

// ── CAS 2 ───────────────────────────────────────────────────────────────────
// Guillotine niveau 20, Stormblade niveau 250, épée à Yggdrasil purifié. Trois
// choses à voir ici : les bonus que l'arme porte elle-même (Attaque % 15, Dégâts
// sur monstres 10), le buff de guilde en terme séparé, et surtout LA FOURCHE —
// le relevé ne dit pas si la Guillotine est physique ou magique, et sur Elun les
// deux colonnes s'écartent d'un facteur quatre (défense 464, résistance 103).
{
  const base = combattant({
    niveau: 250,
    classe: "STORMBLADE_HERO",
    force: 1200,
    endurance: 400,
    dexterite: 300,
    intelligence: 100,
    arme: "II_WEA_SWO_YGGDRASILL",
    upgrade: 10,
  });
  const buff = catalogueDeGuilde().find((x) => x.cle === "II_SYS_SCR_GUILD_PVE_BUFF01")!;
  const { combattant: avec, termes } = avecAppoints(base, [buff]);
  // Elun : niveau 250 comme le personnage — l'écart de niveau ne masque donc rien —
  // et DIX vies, soit 20 milliards de PV à sortir et non deux.
  const adversaire = cibleParNom("Elun, Premier Regard d’Ipuli")!;

  const sans = coupDeCompetence(base, adversaire, "SI_MER_ONE_GUILOTINE", 20);
  const plus = coupDeCompetence(avec, adversaire, "SI_MER_ONE_GUILOTINE", 20);
  plus.termes.unshift(...termes);
  imprimer("CAS 2 — Guillotine niveau 20 · Stormblade 250 · Épée en Yggdrasil Purifié contre Elun (250, 10 vies) AVEC le buff de guilde", plus);
  console.log(`\n  ÉCART DÛ AU BUFF DE GUILDE : ${fmt(sans.degatsMoyen)} → ${fmt(plus.degatsMoyen)} (+${fmt(plus.degatsMoyen - sans.degatsMoyen)}, soit ${(((plus.degatsMoyen - sans.degatsMoyen) / sans.degatsMoyen) * 100).toFixed(1).replace(".", ",")} %)`);
}

// ── CAS 3 ───────────────────────────────────────────────────────────────────
// Attaque ordinaire, élément feu posé sur l'arme, contre un Jeune Aibatt qui
// porte feu = −0,3 : le signe négatif doit produire 130 % de dégâts, pas 70 %.
{
  const c = combattant({
    niveau: 60,
    classe: "BLADE",
    force: 200,
    endurance: 80,
    dexterite: 120,
    intelligence: 30,
    arme: "II_WEA_AXE_RODNEY",
    upgrade: 3,
    element: "feu",
  });
  imprimer("CAS 3 — Attaque ordinaire · Spadassin 60 · Hache Rodney à l'élément FEU contre un Jeune Aibatt (vulnérable au feu)", coupOrdinaire(c, cible("MI_AIBATT1")!));
}

// ── CAS 4 ───────────────────────────────────────────────────────────────────
// Une compétence magique de discipline « Foudre » : la résistance MAGIQUE du
// monstre passe par la compression / 7 + 1, l'Intelligence porte le coefficient,
// et l'élément vient de la DISCIPLINE de la compétence — pas de l'arme.
// La cible résiste à la foudre à 30 % : le calcul doit le retirer.
{
  const magique = competences().get("SI_ELE_STF_THUNDERBOLT")!;
  const c = combattant({
    niveau: 250,
    classe: "ELEMENTORLORD_HERO",
    force: 60,
    endurance: 200,
    dexterite: 100,
    intelligence: 900,
    arme: "II_WEA_WAN_YGGDRASILL",
  });
  const adversaire = cibleParNom("Elun, Premier Regard d’Ipuli")!;
  imprimer(
    `CAS 4 — ${magique.nom} niveau ${magique.nivMax} · Arcaniste légendaire 250 contre Elun — résistance MAGIQUE et élément de discipline`,
    coupDeCompetence(c, adversaire, magique.id, magique.nivMax),
  );
}

// ── CAS 5 ───────────────────────────────────────────────────────────────────
// L'ARC, ET LES DEUX REFUS QUI TIENNENT.
//
// 5a était un refus pendant des mois : « propJob.inc n'a pas de colonne pour
// l'arc ». C'était vrai de propJob.inc et faux du client — `propBalance.xml`
// écrit `Bow="11.8"` sur un Rôdeur. Le cas est donc devenu un CALCUL, et c'est
// le gain principal de ce lot.
//
// 5b et 5c restent des refus, et ce sont eux qui prouvent que le moteur n'a pas
// simplement appris à dire oui.
{
  console.log("\n" + "═".repeat(100));
  console.log("CAS 5 — L'ARC QUI SE CALCULE, ET LES REFUS QUI TIENNENT");
  console.log("═".repeat(100));

  const arc = combattant({ niveau: 120, classe: "RANGER_HERO", force: 100, endurance: 150, dexterite: 800, intelligence: 60, arme: "II_WEA_BOW_ANCIENT" });
  const r1 = coupOrdinaire(arc, cible("MI_AIBATT1")!);
  console.log("\n  5a. ATTAQUE ORDINAIRE À L'ARC — ce qui était refusé");
  console.log(`      ${r1.quoi}`);
  console.log(`      dégâts rendus : ${fmt(r1.degatsMin)} à ${fmt(r1.degatsMax)}`);
  for (const t of r1.termes.filter((x) => x.cle === "arme.stat" || x.cle === "arme.appointArc")) {
    console.log(`      ➜ ${t.libelle} = ${fmt(t.valeur)}`);
    console.log(`        source : ${t.source}`);
  }

  console.log("\n  5b. LE MÊME ARC DANS LES MAINS D'UN SPADASSIN — refus, et il est juste");
  const horsVoie = combattant({ niveau: 120, classe: "BLADE_HERO", force: 500, endurance: 150, dexterite: 300, intelligence: 60, arme: "II_WEA_BOW_ANCIENT" });
  const r2 = coupOrdinaire(horsVoie, cible("MI_AIBATT1")!);
  console.log(`      ${r2.quoi}`);
  console.log(`      dégâts rendus : ${r2.degatsMin} — une ligne d'équilibrage ne nomme QUE les armes de sa voie,`);
  console.log(`      et propJob.inc n'a aucune colonne d'arc : il n'existe donc aucun facteur pour ce couple.`);

  const decale = cibleParNom("Rizontie")!;
  const c = combattant({ niveau: 129, classe: "BLADE_HERO", force: 500, endurance: 200, dexterite: 200, intelligence: 60, arme: "II_WEA_AXE_RODNEY", element: "eau" });
  const r3 = coupOrdinaire(c, decale);
  console.log("\n  5c. RÉSISTANCE DÉCALÉE DANS LE RELEVÉ (Rizontie, colonne eau = 100)");
  console.log(`      ${r3.quoi}`);
  for (const x of r3.reserves.filter((s) => s.includes("décalée"))) console.log(`      ➜ ${x}`);
  console.log(`      dégâts rendus : ${fmt(r3.degatsMin)} à ${fmt(r3.degatsMax)} — la colonne est écartée, le reste du calcul tient.`);
  console.log(`      Sans ce garde-fou, le facteur aurait été 1 − 100 = −99 : le coup aurait SOIGNÉ la cible.`);
}

// ── CAS 6 ───────────────────────────────────────────────────────────────────
// LES DEUX TABLES, CÔTE À CÔTE. Le facteur d'arme sort maintenant de
// `propBalance.xml` quand la ligne du métier le nomme, et de `propJob.inc`
// sinon. On imprime les deux lectures sur les métiers qui comptent : c'est
// exactement ce qu'un écran doit montrer, et ce que le lot précédent avait le
// tort de trancher en silence.
{
  console.log("\n" + "═".repeat(100));
  console.log("CAS 6 — LE FACTEUR D'ARME DANS LES DEUX TABLES");
  console.log("═".repeat(100));
  const couples: [string, FamilleArme][] = [
    ["VAGRANT", "SWD"], ["KNIGHT", "SWD"], ["LORDTEMPLER_HERO", "SWD"],
    ["ACROBAT", "BOW"], ["RANGER", "BOW"], ["CRACKSHOOTER_HERO", "BOW"],
    ["ACROBAT", "YOYO"], ["JESTER", "YOYO"], ["WINDLURKER_HERO", "YOYO"],
    ["MAGICIAN", "WAND"], ["ASSIST", "KNUCKLE"], ["BILLPOSTER", "KNUCKLE"],
    ["VAGRANT", "WAND"],
  ];
  console.log(`  ${"métier".padEnd(20)}${"arme".padEnd(9)}${"employé".padStart(9)}  table employée        autre table`);
  for (const [classe, famille] of couples) {
    const l = lectureDuFacteurDArme(classe, famille);
    if (!l) { console.log(`  ${classe.padEnd(20)}${famille.padEnd(9)}${"—".padStart(9)}  AUCUN FACTEUR : le moteur refuse de calculer`); continue; }
    const autre = l.autre ? `${l.autre.table} ${fmt(l.autre.valeur)}` : "—";
    console.log(`  ${classe.padEnd(20)}${famille.padEnd(9)}${fmt(l.valeur).padStart(9)}  ${l.table.padEnd(22)}${autre}${l.accord ? "  (d'accord)" : ""}`);
  }
  const vides = famillesSansFacteurDArme();
  console.log(`\n  Familles d'arme sans AUCUN facteur, les deux tables réunies : ${vides.length ? vides.join(", ") : "aucune"}`);
}

// ── CONTRÔLE D'ENSEMBLE ─────────────────────────────────────────────────────
// Cinq calculs justes ne prouvent pas que le moteur tient sur les 197 lignes. On
// les passe donc toutes, à tous leurs niveaux, contre les 1 124 monstres réduits
// à quatre représentants — et on compte ce qui sort, ce qui bloque et ce qui reste
// ambigu. Les nombres imprimés ici sont ceux qu'on cite ailleurs : ils ne sont
// jamais écrits à la main.
{
  const c = combattant({ niveau: 200, classe: "BLADE_HERO", force: 800, endurance: 300, dexterite: 400, intelligence: 400, arme: "II_WEA_SWO_YGGDRASILL" });
  const cibles = ["MI_AIBATT1", "MI_CHAMBER_ANCIENT_6", "MI_EVENT_FWCMONSTER", "MI_WB_IPULI_1"].map((x) => cible(x)).filter((x) => x != null);

  let offensives = 0;
  let calculs = 0;
  let ambigues = 0;
  let avecElement = 0;
  let avecRecharge = 0;
  let sansEchelle = 0;
  const bloquees: string[] = [];

  for (const comp of competences().values()) {
    const aDesDegats = (comp.niveaux.dmin as unknown[] | undefined)?.some((v) => typeof v === "number" && v > 0) === true;
    if (!aDesDegats) continue;
    offensives += 1;
    if (comp.coef == null || !comp.stat) sansEchelle += 1;

    for (const adversaire of cibles) {
      for (let n = 1; n <= comp.nivMax; n += 1) {
        const r = coupDeCompetence(c, adversaire, comp.id, n);
        if (r.degatsMin === 0 && r.termes.length === 0) {
          bloquees.push(`${comp.nom} niveau ${n} — ${r.quoi}`);
          continue;
        }
        calculs += 1;
        if (n === 1 && adversaire === cibles[0]) {
          if (r.reserves.some((x) => x.includes("physique ou magique"))) ambigues += 1;
          if (r.termes.some((t) => t.cle === "competence.element")) avecElement += 1;
          if (r.cadenceMs != null) avecRecharge += 1;
        }
      }
    }
  }

  console.log("\n" + "═".repeat(100));
  console.log("CONTRÔLE D'ENSEMBLE — les 197 compétences, tous niveaux, contre quatre cibles");
  console.log("═".repeat(100));
  console.log(`  Compétences portant une fourchette de dégâts : ${offensives}`);
  console.log(`  Calculs menés à terme sans exception : ${fmt(calculs)}`);
  console.log(`  Calculs bloqués : ${bloquees.length}`);
  for (const b of bloquees.slice(0, 5)) console.log(`     · ${b}`);
  console.log(`  Compétences dont le relevé ne dit pas si le coup est physique ou magique : ${ambigues} sur ${offensives}`);
  console.log(`  Compétences dont la discipline donne l'élément : ${avecElement} sur ${offensives}`);
  console.log(`  Compétences dont la recharge est écrite, donc dont les dégâts par seconde se calculent : ${avecRecharge} sur ${offensives}`);
  console.log(`  Compétences offensives sans coefficient ni statistique de référence : ${sansEchelle} sur ${offensives}`);
}
