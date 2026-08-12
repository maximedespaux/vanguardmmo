#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
#  GENERATEUR de public/wiki/competences.json. A relancer si la fouille change.
#
#  Il vit ici, a cote de ce qu'il alimente, et pas dans scripts/ : ce qu'il
#  produit n'a de sens que pour /competences, et les regles de reduction (ce
#  qu'on garde, ce qu'on jette, le dedoublonnage) se lisent en meme temps que
#  le code qui les consomme. Il n'est jamais importe : Next l'ignore.
#  Entree : dossiers/competences.json de la fouille du client (hors depot).
# ─────────────────────────────────────────────────────────────────────────────
# Reduit competences.json (989 Ko) a ce que la page /competences affiche.
# Idee de compression : un champ qui vaut la MEME chose sur les 20 niveaux ne se
# repete pas 20 fois — il monte dans `fixe`. C'est le cas de l'incantation, de la
# portee et de la duree sur la grande majorite des competences.
import json, os, unicodedata, collections

SRC = "/private/tmp/claude-501/-Users-maximedespaux-Documents-GitHub-vanguardmmo/57ca9f13-4387-4f49-b48c-8b3d0d4bf58d/scratchpad/dossiers/competences.json"
OUT = "/Users/maximedespaux/Documents/GitHub/vanguardmmo/public/wiki/competences.json"

d = json.load(open(SRC))

# Reaccentuation : le JSON de la fouille est desaccentue sur les libelles
# generes (paliers, classes, familles), pas sur les noms de competences.
ACC = {
    "Metier 1": "Métier 1", "Metier 2": "Métier 2",
    "Maitre": "Maître", "Heros": "Héros",
    "Legendaire (3e classe)": "Légendaire",
    "Vagabond (base)": "Vagabond",
    "Elementaliste": "Élémentaliste", "Elementaliste Maitre": "Élémentaliste Maître",
    "Elementaliste Heros": "Élémentaliste Héros",
    "Arbaletrier": "Arbalétrier", "Envouteur": "Envoûteur",
    # « Assistant » n'existe pas en jeu : la classe s'appelle ACOLYTE (20 fois
    # dans les textes de personnage, 36 dans les quetes). Seul propJob.inc, d'ou
    # sortent ces libelles, a garde l'ancien nom.
    "Assistant": "Acolyte",
    "Chevalier Maitre": "Chevalier Maître", "Chevalier Heros": "Chevalier Héros",
    "Lame Maitre": "Lame Maître", "Lame Heros": "Lame Héros",
    "Baladin Maitre": "Baladin Maître", "Baladin Heros": "Baladin Héros",
    "Ranger Maitre": "Ranger Maître", "Ranger Heros": "Ranger Héros",
    "Meneur Maitre": "Meneur Maître", "Meneur Heros": "Meneur Héros",
    "Moine Maitre": "Moine Maître", "Moine Heros": "Moine Héros",
    "Psykeeper Maitre": "Psykeeper Maître", "Psykeeper Heros": "Psykeeper Héros",
    "Attaque au corps a corps": "Attaque au corps à corps",
    "Effet de groupe et soi": "Effet sur le groupe et soi",
    "Apres animation": "Après animation", "Avant animation": "Avant animation",
    "Degats": "Dégâts", "Duree": "Durée",
    # Familles, armes, portees et statistiques de reference.
    "Arme a deux mains": "Arme à deux mains", "Epee": "Épée",
    "Epee a deux mains": "Épée à deux mains", "Double epee": "Double épée",
    "Hache a deux mains": "Hache à deux mains", "Malediction": "Malédiction",
    "Magie (3e classe)": "Magie (3ᵉ classe)", "Bouclier (3e classe)": "Bouclier (3ᵉ classe)",
    "Sacre": "Sacré", "Arc ou arbalete": "Arc ou arbalète",
    "Baton": "Bâton", "Baton de soin": "Bâton de soin", "Baton ou baguette": "Bâton ou baguette",
    "Arme enchantable": "Arme enchantable",
    "Dexterite": "Dextérité",
    "Distance (baguette heros)": "Distance (baguette Héros)", "Distance (heros)": "Distance (Héros)",
    "Speciale": "Spéciale",
}

# Les libelles de statistique et d'etat, tels qu'on veut les lire. Ils sortent
# desaccentues de la fouille (« Defense », « Etat inflige ») : reaccentues ici,
# une fois, plutot que rattrapes a l'affichage.
STAT_FR = {
    "Degats magiques %": "Dégâts magiques %", "Defense": "Défense", "Defense %": "Défense %",
    "Precision": "Précision", "Vitesse d'attaque": "Vitesse d'attaque",
    "Regeneration PV": "Régénération PV", "Regeneration PM": "Régénération PM",
    "Regeneration PF": "Régénération PF",
    "Degats a la hache": "Dégâts à la hache", "Degats a l'epee": "Dégâts à l'épée",
    "Blocage melee": "Blocage mêlée", "Etat inflige": "État infligé",
    "Chance de saignement": "Chance de saignement", "Taux de critique": "Taux de critique",
    "Degats contre joueurs": "Dégâts contre joueurs", "Degats critiques": "Dégâts critiques",
    "Dexterite": "Dextérité", "Dexterite %": "Dextérité %",
    "Experience gagnee": "Expérience gagnée", "Experience recuperee": "Expérience récupérée",
    "PV preserves %": "PV préservés %", "Degats forces": "Dégâts forcés",
    "Degats contre monstres": "Dégâts contre monstres", "Degats contre boss": "Dégâts contre boss",
    "Degats JcJ": "Dégâts JcJ", "Degats subis %": "Dégâts subis %",
    "Degats renvoyes": "Dégâts renvoyés",
    "Maitrise Terre": "Maîtrise Terre", "Maitrise Foudre": "Maîtrise Foudre",
    "Maitrise Feu": "Maîtrise Feu", "Maitrise Eau": "Maîtrise Eau",
    "Maitrise Vent": "Maîtrise Vent",
    "Resistance Terre": "Résistance Terre", "Resistance Foudre": "Résistance Foudre",
    "Resistance Eau": "Résistance Eau", "Resistance magique %": "Résistance magique %",
    "Vitesse de deplacement": "Vitesse de déplacement",
    "Immunite au vol de vie": "Immunité au vol de vie",
    "Penyas trouves": "Penyas trouvés",
}
ETAT_FR = {
    "Etourdissement": "Étourdissement", "Saignement": "Saignement",
    "Aveuglement": "Aveuglement", "Ralentissement": "Ralentissement",
    "Empoisonnement": "Empoisonnement", "Invisibilite": "Invisibilité",
    "Contre-attaque": "Contre-attaque", "Silence": "Silence", "Sommeil": "Sommeil",
    "Butin augmente": "Butin augmenté", "Petrification": "Pétrification",
    "Dedoublement": "Dédoublement",
}

def acc(s):
    if s is None: return None
    return ACC.get(s, s)

def eff(e):
    """Un effet, mis en clair : soit un chiffre sur une statistique, soit un état."""
    o = {"stat": STAT_FR.get(e["statFr"], e["statFr"])}
    if e.get("etat"):
        o["etat"] = ETAT_FR.get(e["etat"], e["etat"])
        if e.get("intensite") is not None: o["intensite"] = e["intensite"]
        if e.get("chancePourCent") is not None: o["chance"] = e["chancePourCent"]
    else:
        o["valeur"] = e.get("valeur")
    return o

PALIER_CLE = {
    "Vagabond (base)": "vagabond", "Metier 1": "metier1", "Metier 2": "metier2",
    "Maitre": "maitre", "Heros": "heros", "Legendaire (3e classe)": "legendaire",
}

# Les 44 lignes « Commune (toutes classes) » ne sont pas des competences de
# joueur : ce sont les etats infliges par les monstres, plus les runes d'arme —
# lesquelles ne sont pas integrees au serveur et ne sont donc plus versees.
# Elles sortent du catalogue (elles ont leur propre section, en dur dans la page).
brut = [c for c in d["competences"] if c["palier"] in PALIER_CLE]
assert len(brut) == 202, len(brut)

# ── LE FICHIER DU CLIENT LISTE CINQ COMPETENCES DEUX FOIS.
#    Les cinq competences d'arc de l'Acrobate (Fleches multiples, Visee
#    sournoise, Fleche furtive, Pluie de fleches, Fleche lugubre) apparaissent en
#    double dans propSkill.txt, et les deux copies sont IDENTIQUES au champ pres
#    — verifie par comparaison exhaustive. Il y a donc 197 competences de joueur,
#    pas 202. On garde la premiere copie.
#
#    Ce n'est pas un detail de comptage : le fichier annonce 38 competences et
#    1 284 748 points pour la Sylphide et l'Arbaletrier alors qu'ils en ont 33 et
#    988 398 — le doublon etait compte deux fois, a 20 niveaux, deux fois. Les
#    budgets des huit lignees sont donc RECALCULES plus bas, jamais recopies.
vus, joueur, doublons = set(), [], []
for c in brut:
    if c["id"] in vus:
        doublons.append({"id": c["id"], "nom": c["nom"], "classe": acc(c["classe"])})
        continue
    vus.add(c["id"])
    joueur.append(c)
assert len(joueur) == 197, len(joueur)

# ── L'arbre a l'envers : « cette competence en debloque quelles autres ? »
#    Le client ne donne que le sens prerequis → competence ; le sens utile a
#    l'ecran est aussi l'inverse (« si je monte ca a 5, j'ouvre quoi ? »).
debloque = collections.defaultdict(list)
for c in joueur:
    for p in c.get("prerequis", []):
        debloque[p["competence"]].append({"id": c["id"], "nom": c["nom"], "niveau": p["niveau"]})

NIV_ORDRE = ["degatsMin", "degatsMax", "coutPM", "coutPF", "incantationMs", "dureeMs",
             "rechargeMs", "portee", "nbCoups", "probabilite", "provocation",
             "dureeDouleurMs", "vitesseAttaque"]
COURT = {"degatsMin": "dmin", "degatsMax": "dmax", "coutPM": "pm", "coutPF": "pf",
         "incantationMs": "inc", "dureeMs": "duree", "rechargeMs": "recharge",
         "portee": "portee", "nbCoups": "coups", "probabilite": "proba",
         "provocation": "provoc", "dureeDouleurMs": "dureeDouleur",
         "vitesseAttaque": "vitAtq"}

comps = []
for c in joueur:
    nivs = c.get("niveaux", [])
    fixe, variable = {}, {}
    for champ in NIV_ORDRE:
        vals = [n.get(champ) for n in nivs]
        if all(v is None for v in vals):
            continue
        if len(set(map(repr, vals))) == 1:
            fixe[COURT[champ]] = vals[0]
        else:
            variable[COURT[champ]] = vals

    # Les effets de buff : meme traitement. Une liste d'effets identique sur tous
    # les niveaux (cas de Coalition, +25 partout) monte dans `fixe` — sinon on
    # affichait cinq lignes strictement identiques dans le tableau.
    effets = [n.get("effets") for n in nivs]
    eff_fixe = None
    if any(effets):
        norm = [json.dumps(e, sort_keys=True, ensure_ascii=False) for e in effets]
        if len(set(norm)) == 1:
            eff_fixe = [eff(e) for e in (effets[0] or [])]
        else:
            variable["effets"] = [[eff(e) for e in (e2 or [])] for e2 in effets]

    o = {
        "id": c["id"], "nom": c["nom"], "desc": c["description"] or None,
        "palier": PALIER_CLE[c["palier"]],
        "classe": acc(c["classe"]),
        "famille": acc(c["famille"]),
        "nivPerso": c["niveauPersoRequis"], "nivMax": c["niveauMaxCompetence"],
        "type": acc(c["typeEffet"]), "zone": acc(c["zone"]), "porteeTexte": acc(c["portee"]),
        "arme": acc(c["armeRequise"]), "mains": acc(c["mains"]),
        "stat": acc(c["statDeReference"]), "coef": c["referenceValeur"],
        "fixe": fixe,
        "niveaux": variable,
    }
    if eff_fixe: o["effetsFixes"] = eff_fixe
    if c.get("prerequis"):
        o["prerequis"] = [{"id": p["competence"], "nom": p["nom"], "niveau": p["niveau"]} for p in c["prerequis"]]
    if debloque.get(c["id"]):
        o["debloque"] = debloque[c["id"]]
    # Ce qui ne sert a rien a l'ecran ne part pas dans le fichier : `combo`,
    # `lanceApres`, `conserveArme`, `xpParUtilisation`, les codes internes.
    # `fixe` et `niveaux` restent TOUJOURS presents, meme vides : c'est la seule
    # facon pour le lecteur de ne pas avoir a se demander si l'absence veut dire
    # « rien a afficher » ou « champ oublie ». Le reste s'efface quand il est vide.
    comps.append({k: v for k, v in o.items()
                  if v not in (None, [], {}) or k in ("fixe", "niveaux")})

# ── Les 8 lignees : l'ordre dans lequel un perso apprend, pas l'ordre du fichier.
#    Les trois chiffres (nombre, points, somme des niveaux) sont RECALCULES depuis
#    la liste dedoublonnee et la table de cout. La methode se valide d'elle-meme :
#    elle retrouve a l'unite les six lignees que le fichier annonce juste, et ne
#    corrige que les deux qu'il gonflait (Sylphide et Arbaletrier).
xp_par_niveau = {x["niveauCompetence"]: x["xpRequise"] for x in d["tableXpCompetence"]}
cumul = lambda n: sum(v for k, v in xp_par_niveau.items() if k <= n)
niv_max = {c["id"]: c["niveauMaxCompetence"] for c in joueur}

lignees = []
for p in d["panoplies"]:
    ids = list(dict.fromkeys(x["id"] for x in p["competences"] if x["id"] in niv_max))
    lignees.append({
        "cle": acc(p["classe"]),
        "jobCode": p["jobCode"],
        "chaine": [acc(x) for x in p["ligneeDePromotion"]],
        "nbCompetences": len(ids),
        "coutPoints": sum(cumul(niv_max[i]) for i in ids),
        "sommeNiveauxMax": sum(niv_max[i] for i in ids),
        "competences": ids,
    })
    # Garde-fou : si un jour le fichier cesse d'etre gonfle, on veut le savoir.
    if lignees[-1]["coutPoints"] != p["coutTotalPointsCompetence"]:
        print(f"  corrige {p['classe']}: {p['coutTotalPointsCompetence']} -> {lignees[-1]['coutPoints']}"
              f" ({p['nbCompetences']} -> {len(ids)} competences)")

# ── Ce qui ne s'apprend pas dans un arbre de classe : Souverain, groupe,
#    couple. Trois familles minuscules, une seule chose en commun — aucune
#    n'apparait dans l'arbre de competences du jeu, donc personne ne les trouve
#    en cherchant la ou il cherche d'habitude.
#
#    Les runes d'arme gravees, elles, ne sont PAS versees : la famille d'objets
#    qui les porte n'est pas integree au serveur, donc la page ne la montre pas.
REACC_TEXTE = [
    ("Benediction", "Bénédiction"), ("Teleportation", "Téléportation"),
    ("Teleporte", "Téléporte"), ("Tresor", "Trésor"),
    ("defense", "défense"), ("Defense", "Défense"),
    ("Experience", "Expérience"), ("recuperation", "récupération"),
    ("Agressivite", "Agressivité"), ("Eclaireur", "Éclaireur"),
    ("Traitrise", "Traîtrise"), ("eidetique", "eidétique"),
    ("pres du leader", "près du leader"), ("Frenesie", "Frénésie"),
    ("aux cotes", "aux côtés"), ("Enleve", "Enlève"),
    ("competences", "compétences"), ("hurlement du", "hurlements du"),
    ("degats", "dégâts"), ("probabilite", "probabilité"),
]
def texte(s):
    if not s: return s
    for a, b in REACC_TEXTE: s = s.replace(a, b)
    # Le client colle des « Durée: 5mn, » et des « Points requis: 3 » a la fin des
    # descriptions. Ces deux chiffres ont leur propre colonne dans le tableau :
    # laisses la, ils s'affichaient deux fois, dont une avec une virgule orpheline.
    for coupe in ("Durée:", "Duree:", "Points requis:", "Point requis:", "Niveau requis:"):
        s = s.split(coupe)[0]
    return s.strip().rstrip(".,").strip()

souverain = [{
    "nom": texte(s["nom"]), "type": texte(s["type"]), "description": texte(s["description"]),
    "cible": texte(s["cible"]), "rechargeS": s.get("rechargeSecondes"),
    "porteeMax": s.get("porteeMax"), "permanente": s.get("permanente", False),
} for s in d["competencesSouverain"]]

groupe = [{
    "nom": texte(g["nom"]),
    # La description du client recopie « Niveau requis: 10, Point requis: 0 » a la
    # fin de chaque ligne. Les deux chiffres ont leur colonne : on coupe la redite.
    "description": texte(g["description"]),
    "actif": g.get("actif", True),
    "niveauGroupe": g.get("niveauGroupeRequis"), "coutPoints": g.get("coutPoints"),
} for g in d["competencesGroupe"]]

couple = [{
    "nom": texte(c["nom"]),
    "niveaux": [{"niveau": n["niveau"], "niveauCouple": n["niveauCoupleRequis"], "effets": texte(n["effets"])}
                for n in c["niveaux"]],
} for c in d["competencesCouple"]]

sortie = {
    "source": d["source"],
    "fichiers": d["fichiers"],
    "xpCompetence": [{"niveau": x["niveauCompetence"], "xp": x["xpRequise"]} for x in d["tableXpCompetence"]],
    "lignees": lignees,
    "competences": comps,
    # Les cinq lignes en double du client, gardees pour pouvoir le DIRE sur la
    # page plutot que d'annoncer 197 sans expliquer l'ecart avec les 202 relevees.
    "doublons": doublons,
    "horsClasse": {
        "souverain": souverain, "groupe": groupe, "couple": couple,
        # La derniere ligne du client porte « niveau de groupe 1000 » : c'est une
        # sentinelle de fin de table, pas un palier atteignable. Elle sort.
        "bonusGroupe": [{"niveauGroupe": b["niveauGroupe"], "bonus": b["bonusPourCent"]}
                        for b in d["tableBonusCompetenceGroupe"] if b["niveauGroupe"] <= 100],
    },
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(sortie, f, ensure_ascii=False, separators=(",", ":"))
print("ecrit", OUT, round(os.path.getsize(OUT) / 1024, 1), "Ko")
print("competences", len(comps), "lignees", len(lignees))
print("prerequis", sum(1 for c in comps if "prerequis" in c))
# Controles pour le rapport
print("familles:", sorted({c["famille"] for c in comps if c.get("famille")}))
print("types:", sorted({c["type"] for c in comps if c.get("type")}))
print("armes:", sorted({c["arme"] for c in comps if c.get("arme")}))
print("zones:", sorted({c["zone"] for c in comps if c.get("zone")}))
print("portees:", sorted({c["porteeTexte"] for c in comps if c.get("porteeTexte")}))
print("stats:", sorted({c["stat"] for c in comps if c.get("stat")}))
print("mains:", sorted({c["mains"] for c in comps if c.get("mains")}))
