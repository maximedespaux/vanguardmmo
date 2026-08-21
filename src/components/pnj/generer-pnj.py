# -*- coding: utf-8 -*-
"""Construit public/wiki/pnj.json : les PNJ de service d'Airborn, leur portrait
apparie par la chaine SetImage -> IDS_* -> char_*.tga, leur ville, leur
inventaire de vente (AddShopItem, avec prix) et leurs crafts.

On ne verse QUE les champs affiches : le fichier doit rester leger."""
import json, os, re, unicodedata
from collections import defaultdict

BASE = "/private/tmp/claude-501/-Users-maximedespaux-Documents-GitHub-vanguardmmo/57ca9f13-4387-4f49-b48c-8b3d0d4bf58d/scratchpad"
INC = BASE + "/extrait/donnees/character.inc"
TXT = BASE + "/conv2/character.txt.txt"
PORTRAITS = "/Users/maximedespaux/Documents/GitHub/vanguardmmo/public/jeu/pnj"
ICONES = "/Users/maximedespaux/Documents/GitHub/vanguardmmo/public/jeu/icones"
SORTIE = "/Users/maximedespaux/Documents/GitHub/vanguardmmo/public/wiki/pnj.json"

# ---------- libelles ----------
# Piege : une cinquantaine de lignes separent la cle du libelle par des ESPACES
# et non par une tabulation. En decoupant sur "\t" on perdait 56 libelles — dont
# tous les PNJ de l'Oasis, ceux qui portent justement les services d'Airborn.
tids = {}
for line in open(TXT, encoding="utf-8", errors="replace").read().splitlines():
    m = re.match(r"\s*(IDS_[A-Z_0-9]+)[ \t]+(.*)$", line)
    if m:
        tids[m.group(1)] = m.group(2).strip()

def libelle(t, sauts=4):
    """Certaines cles renvoient vers une AUTRE cle au lieu du texte (`IDS_… ->
    IDS_…`). Sans suivre le renvoi, cinq PNJ s'affichaient sous un code interne.

    Au passage on repare `½` : l'equipe a saisi ses textes en cp1252 et le
    ligature `œ` s'est transformee en `½` DANS LE FICHIER DU JEU. « Bureau des
    c½urs d'argent » n'est pas notre bug, mais l'afficher tel quel serait le
    notre."""
    v = tids.get(t) if t else None
    while v and v.startswith("IDS_") and sauts > 0:
        v = tids.get(v)
        sauts -= 1
    if not v or v.startswith("IDS_"):
        return None
    return v.replace("½", "œ")

inc = open(INC, encoding="utf-16-le", errors="replace").read()

# ---------- objets : id -> nom + icone ----------
objets = json.load(open(BASE + "/dossiers/objets.json"))
if isinstance(objets, dict):
    for k in ("objets", "items"):
        if k in objets:
            objets = objets[k]
            break
# La cle metier d'un objet est `cle` (II_WEA_...), pas `id` (un entier).
parObjet = {}
for o in objets:
    if o.get("cle"):
        parObjet[o["cle"]] = (o.get("nom"), o.get("icone"))
print("objets indexes:", len(parObjet))

# Les icones servies sont en minuscules et en .webp, alors que le client les
# nomme `itm_WeaAxeCurin.dds` : on renvoie le nom du FICHIER REEL, sinon l'URL
# casse sur un systeme de fichiers sensible a la casse (le VPS).
icones = {f.lower(): f for f in os.listdir(ICONES)}
portraits = {f.lower(): f for f in os.listdir(PORTRAITS)}

def icone_ok(name):
    """Une icone cassee est un defaut visible : on ne renvoie que du certain."""
    if not name:
        return None
    tronc = os.path.splitext(name)[0].lower()
    for cand in (name.lower(), tronc + ".webp", tronc + ".png"):
        if cand in icones:
            return icones[cand]
    return None

# char_question.tga n'est pas un visage : c'est le point d'interrogation jaune
# que le jeu pose quand l'equipe n'a PAS choisi de portrait. L'afficher ferait
# croire a un visage manquant chez nous alors que c'est le jeu qui n'en a pas.
FAUX_VISAGES = {"char_question.webp"}

def portrait_ok(tga):
    if not tga or not tga.lower().endswith((".tga", ".dds", ".png")):
        return None
    b = os.path.splitext(tga)[0].lower()
    if b + ".webp" in FAUX_VISAGES:
        return None
    for cand in (b + ".webp", b.replace("_", "-") + ".webp"):
        if cand in portraits:
            return portraits[cand]
    return None

# ---------- les blocs de character.inc ----------
# Piege : le bloc `setting` interne est lui aussi « un nom suivi d'une accolade ».
# On ne peut donc pas decouper a l'expression reguliere — on compte les
# accolades, et une cle de PNJ est un identifiant rencontre a la profondeur 0.
# (Les accolades qui vivent dans un commentaire `//` ne comptent pas.)
MOTS_CLES = {"SetName", "setting", "Setting", "SETTING", "SetImage", "AddVendorSlot"}
lignes = inc.splitlines()
depth, cle, debut, blocs = 0, None, 0, []
for i, ln in enumerate(lignes):
    utile = ln.split("//", 1)[0]
    if depth == 0:
        m = re.match(r"\s*([A-Za-z][A-Za-z0-9_]{2,})\s*\{?\s*$", utile)
        # Un mot-cle du langage seul sur sa ligne (`SetName` avant sa parenthese)
        # ressemble a une cle de PNJ : sans ce filtre il volait le bloc suivant.
        if m and cle is None and m.group(1) not in MOTS_CLES:
            cle, debut = m.group(1), i + 1
    depth += utile.count("{") - utile.count("}")
    if cle is not None and depth <= 0 and "}" in utile:
        blocs.append((cle, debut, i))
        cle, depth = None, 0

pnjs = {}
for cle, a, b in blocs:
    corps = "\n".join(lignes[a:b + 1])
    img = re.search(r"SetImage\s*\(\s*(IDS_CHARACTER_INC_\d+)\s*\)", corps)
    nom = re.search(r"SetName\s*\(\s*(IDS_CHARACTER_INC_\d+)\s*\)", corps)
    struct, menus, eteints, vend, troc = None, [], [], [], []
    for ln in corps.splitlines():
        t = ln.strip()
        off = t.startswith("//")
        m = re.search(r"m_nStructure\s*=\s*(SRT_[A-Z_0-9]*)", t)
        if m and not off:
            struct = m.group(1)
        m = re.search(r"AddMenu\s*\(\s*(MMI_[A-Z_0-9]+)", t)
        if m:
            (eteints if off else menus).append(m.group(1))
        # Deux etals differents. `AddShopItem` = un prix en perins.
        # `AddVendorItem2` = un TROC : l'objet s'achete contre un autre objet
        # (nucleus, jeton noir, piece de donjon…) et le client ne dit pas
        # combien il en faut — c'est le serveur qui fixe la quantite.
        m = re.search(r"AddShopItem\s*\(\s*(\d+)\s*,\s*([A-Za-z0-9_]+)\s*,\s*(\d+)", t)
        if m and not off:
            vend.append((m.group(2), int(m.group(3))))
        m = re.search(r"AddVendorItem2\s*\(\s*(\d+)\s*,\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)", t)
        if m and not off:
            troc.append((m.group(2), m.group(3)))
    pnjs[cle] = {
        "cle": cle, "nom": libelle(nom.group(1)) if nom else None,
        "img": portrait_ok(libelle(img.group(1)) if img else None),
        "structure": struct, "menus": menus, "eteints": eteints, "vend": vend, "troc": troc,
    }
print("blocs:", len(pnjs))

# ---------- ville, depuis instances.json ----------
inst = json.load(open(BASE + "/dossiers/instances.json"))
villes = {c["cle"]: c["titre"] for c in inst["cartesJeu"]}

def norm(s):
    s = re.sub(r"^\[[^\]]*\]\s*", "", s or "")          # « [Joaillier] Angie » -> « Angie »
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9]", "", s)

parNom = defaultdict(dict)
for p in pnjs.values():
    if p["nom"]:
        parNom[norm(p["nom"])][p["cle"]] = p
    # « MaFl_Rudvihil » -> « Rudvihil » : la carte nomme parfois la cle, pas le libelle.
    # Un dict par cle, sinon le meme PNJ compte deux fois et l'ambiguite est fausse.
    parNom[norm(p["cle"].split("_", 1)[-1])][p["cle"]] = p

places = 0
for x in inst["pnjSurCarte"]:
    d = parNom.get(norm(x["nom"]))
    cibles = list(d.values()) if d else None
    if cibles and len(cibles) == 1:
        cibles[0]["ville"] = villes.get(x["carte"], x["carte"])
        cibles[0]["roleCarte"] = (re.match(r"^\[([^\]]*)\]", x["nom"]) or [None, None])[1]
        places += 1
print("PNJ situes:", places, "/", len(inst["pnjSurCarte"]))

# ---------- crafts ----------
crafts = json.load(open(BASE + "/dossiers/crafts.json"))
recParNom = defaultdict(lambda: {"actives": [], "eteintes": 0})
for r in crafts["recettes"]:
    for n in r.get("pnjActifs") or []:
        recParNom[norm(n)]["actives"].append(r)
    for n in r.get("pnjDesactives") or []:
        recParNom[norm(n)]["eteintes"] += 1

# ---------- quetes rendues ----------
quetes = json.load(open(BASE + "/dossiers/quetes.json"))["quetes"]
rendues = defaultdict(int)
for q in quetes:
    for c in (q.get("objectifs") or {}).get("rendreA") or []:
        rendues[c] += 1

# ---------- metiers ----------
METIERS = {
    "SRT_CRAFTING": ("Sage des Mantras", "Il forge les mantras — les runes d'arme PvE, PvP et PV.", "craft"),
    "SRT_FLARINE_FORGE": ("Forge", "Le raffinage et la transformation des armes.", "craft"),
    "SRT_FLARINE_JEWEL": ("Joaillier", "Elle reprend tes matériaux bruts contre des perins, et assemble l'orichalque scintillant.", "craft"),
    "SRT_FLARINE_RARITY": ("Rareté", "Il transforme ta poussière d'arme en modificateur de rareté.", "craft"),
    "SRT_OASIS_COUTURIER": ("Couturier", "Les capes et les tenues du roi dragon, contre du tissu et des nucléus.", "craft"),
    "SRT_OASIS_NUCLEUS": ("Nucléus", "Le comptoir des nucléus.", "craft"),
    "SRT_ACTE_3_ARTEFACT": ("Artefacts", "Les artefacts et leurs essences.", "craft"),
    "SRT_ACTE_3_ANGE": ("Anges", "Les anges gardiens et leur poussière.", "craft"),
    "SRT_ACTE_3_ETERNELLE": ("Éternelle", "L'équipement éternel.", "craft"),
    "SRT_ACTE_3_DONJON": ("Donjons", "Les récompenses de donjon.", "craft"),
    "SRT_FLARINE_TOWER": ("Tour Infernale", "L'entrée de la Protection de l'Oasis.", "monde"),
    "SRT_SECRET_ROOM": ("Chambres secrètes", "Les deux managers qui t'ouvrent les chambres.", "monde"),
    "SRT_OASIS_TIMEROOM": ("Salle du temps", "L'accès à la salle du temps.", "monde"),
    # Le mode s'appelle « Protection de l'Oasis » et la carte « Tour Infernale ».
    # Le nom interne du menu (`MMI_ENTER_ENDLESS_TOWER`) parle d'une tour sans
    # fin : elle n'existe pas dans le jeu, et ce mode a une derniere vague.
    "SRT_OASIS_PROTECTION": ("Protection de l'Oasis", "Il reprend tes emblèmes de protection, et c'est par lui qu'on entre dans la Tour Infernale.", "monde"),
    "SRT_OASIS_WEATHER": ("Météo", "Il change le temps qu'il fait.", "monde"),
    "SRT_OASIS_CREED": ("Credo", "Les credos.", "service"),
    "SRT_FLARINE_GS_MANAGER": ("Guerre de guilde — inscription", "C'est lui qui lance la Guerre de Guilde.", "guilde"),
    "SRT_FLARINE_GS_REWARD": ("Guerre de guilde — récompenses", "C'est lui qui paie les jetons que tu as gagnés.", "guilde"),
    "SRT_ARENA": ("Arène", "Les arènes et le colisée.", "pvp"),
    "SRT_OASIS_JETON_ROUGE": ("Jetons rouges", "Il change tes jetons rouges.", "pvp"),
    "SRT_BAZAR": ("Bazar", "L'hôtel des ventes entre joueurs.", "service"),
    "SRT_FLARINE_BEAUTY_SALON": ("Coiffeur", "Coupe, couleur, maquillage.", "service"),
    "SRT_FLARINE_PET_TRAINER": ("Dresseur de familiers", "Il s'occupe de tes familiers.", "service"),
    "SRT_FLARINE_STUDIO": ("Studio", "Les studios et leurs décors.", "service"),
    "SRT_OASIS_DISTRIBUTEUR": ("Distributeur", "Les collections et la boutique AirPoint.", "boutique"),
    "SRT_CASH": ("Boutique cash", "La boutique du serveur.", "boutique"),
    "SRT_BUFF_PANG": ("Guide des débutants", "Il te donne les buffs de départ.", "service"),
    "SRT_MAYOR": ("Maire", "La mairie de Flarine.", "service"),
    "SRT_PARCHEMIN": ("Parchemins", "Les parchemins de téléportation.", "boutique"),
    "SRT_FASHION": ("Mode", "Les tenues.", "boutique"),
    "SRT_WEAPON": ("Armurier", "Il vend les armes.", "boutique"),
    "SRT_SHIELD": ("Armures", "Il vend les armures.", "boutique"),
    "SRT_BUCKLER": ("Boucliers", "Il vend les boucliers et les protections.", "boutique"),
    "SRT_MAGIC": ("Magie", "Pierres, cristaux et consommables magiques.", "boutique"),
    "SRT_FOOD": ("Nourriture", "La nourriture et les boissons de soin.", "boutique"),
    "SRT_GENERAL": ("Marchand général", "Un peu de tout.", "boutique"),
    "SRT_KEY": ("Clés", "Les clés des coffres.", "boutique"),
    "SRT_STATION": ("Station", "Les montures et leurs accessoires.", "boutique"),
    "SRT_QUESTOFFICE": ("Bureau des quêtes", "Les quêtes de la ville.", "quete"),
    "SRT_PUBLICOFFICE": ("Mairie", "Les intendants, et le changement de classe.", "quete"),
}

# ---------- assemblage : on ne garde que ce qui sert ----------
fiches = []
for p in pnjs.values():
    n = norm(p["nom"] or "")
    rec = recParNom.get(n) or recParNom.get(norm(p["cle"].split("_", 1)[-1])) or {"actives": [], "eteintes": 0}
    p.setdefault("ville", None)
    nbQ = rendues.get(p["cle"], 0)
    interessant = bool(p["structure"] or p["vend"] or p["troc"] or rec["actives"] or nbQ)
    if not (interessant and p["nom"]):
        continue
    met = METIERS.get(p["structure"] or "")
    vend = []
    for iid, prix in p["vend"]:
        nomO, ico = parObjet.get(iid, (None, None))
        vend.append({"n": nomO or iid, "p": prix, "i": icone_ok(ico)})
    # Le troc : on ne montre que les lignes dont l'objet ET la monnaie ont un nom
    # francais. Une ligne « II_CHP_BLACK3 contre II_SYS_… » n'aide personne.
    troc, vusTroc = [], set()
    for iid, mid in p["troc"]:
        nomO, ico = parObjet.get(iid, (None, None))
        nomM, icoM = parObjet.get(mid, (None, None))
        if not nomO or not nomM or (iid, mid) in vusTroc:
            continue
        vusTroc.add((iid, mid))
        troc.append({"n": nomO, "i": icone_ok(ico), "m": nomM, "mi": icone_ok(icoM)})
    # les recettes : juste leur libelle et leur sortie, pas les tables entieres
    craft = []
    for r in rec["actives"][:30]:
        sortie = (r.get("sortants") or [{}])[0]
        craft.append({
            "l": r.get("libelle") or "",
            "s": sortie.get("nom"),
            "i": icone_ok(sortie.get("icone")),
            "e": [{"n": x.get("nom"), "q": x.get("qte")} for x in (r.get("entrants") or [])[:6]],
        })
    # Sans etiquette de batiment, on classe le PNJ par ce qu'il FAIT : le seau
    # « autre » ne dit rien a personne, et il ramassait les deux tiers de la liste.
    if met:
        famille = met[2]
    elif craft:
        famille = "craft"
    elif vend or troc:
        famille = "boutique"
    else:
        famille = "quete"
    fiches.append({
        "cle": p["cle"], "nom": p["nom"], "img": p["img"],
        "metier": met[0] if met else p.get("roleCarte"),
        "quoi": met[1] if met else None,
        "famille": famille,
        "srt": p["structure"],
        "ville": p.get("ville"), "role": p.get("roleCarte"),
        "vend": vend, "troc": troc, "craft": craft,
        # Les monnaies acceptees, pour repondre a « j'ai des jetons rouges,
        # qui les prend ? » sans avoir a ouvrir les 301 fiches.
        "monnaies": sorted({t["m"] for t in troc}),
        "nbCraftTotal": len(rec["actives"]),
        "craftEteints": rec["eteintes"],
        "quetes": nbQ,
    })

fiches.sort(key=lambda f: (f["famille"], -(len(f["vend"]) + len(f["troc"]) + len(f["craft"])), f["nom"]))

# `character.inc` declare deux fois certains PNJ (memes nom, visage, ville et
# etal, deux cles differentes). Deux vignettes jumelles cote a cote ressemblent
# a un bug d'affichage : on n'en garde qu'une.
vus, uniques = set(), []
for f in fiches:
    sig = (f["nom"], f["img"], f["ville"], len(f["vend"]), len(f["troc"]), f["nbCraftTotal"], f["quetes"])
    if sig in vus:
        continue
    vus.add(sig)
    uniques.append(f)
print("doublons ecartes:", len(fiches) - len(uniques))
fiches = uniques
os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
json.dump(fiches, open(SORTIE, "w"), ensure_ascii=False, separators=(",", ":"))

print("fiches:", len(fiches))
print("  avec portrait:", sum(1 for f in fiches if f["img"]))
print("  avec metier:", sum(1 for f in fiches if f["metier"]))
print("  avec ville:", sum(1 for f in fiches if f["ville"]))
print("  vendeurs (perins):", sum(1 for f in fiches if f["vend"]))
print("  troqueurs (objet contre objet):", sum(1 for f in fiches if f["troc"]))
print("  crafteurs:", sum(1 for f in fiches if f["craft"]))
print("  donneurs de quete:", sum(1 for f in fiches if f["quetes"]))
print("portraits distincts (fiches):", len({f["img"] for f in fiches if f["img"]}))
tous = {p["img"] for p in pnjs.values() if p["img"]}
print("portraits distincts (tous les 602 blocs):", len(tous), "/", len(portraits))
print("orphelins:", sorted(set(portraits.values()) - tous))
print("poids:", os.path.getsize(SORTIE) // 1024, "Ko")
from collections import Counter
print(Counter(f["famille"] for f in fiches))
print("SRT sans libelle:", {f["srt"] for f in fiches if f["srt"] and not f["metier"]})
