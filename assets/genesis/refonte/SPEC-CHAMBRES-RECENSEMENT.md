# Spécification : Chambres Secrètes, Guild Siege et Recensement

*GENESIS, révision 2 du 2026-10-21, contre-examinée le même jour (corrections listées au §16 et
déjà reportées dans le texte). Elle remplace la version du 2026-10-20. Les points marqués
« À CONFIRMER PAR MAXIME » attendent sa réponse (les 6 questions du §15). Tout le reste peut se coder
tel quel.*

**Ce qui change depuis la révision 1.** Maxime a tranché six points, et ils changent la spec :
1. **Un seul bot.** Le nôtre (TypeScript, `bot/`) reprend tout ce que fait le bot Python de Dracarys
   pour les Chambres, y compris l'**inscription par poste**, que la révision 1 laissait de côté. Le bot
   Python sera arrêté (§8.10).
2. **Chaque message du bot est réécrit**, en embeds structurés avec un émoji par information, le même
   d'un message à l'autre. La table émoji → sens est au §8.2, et un exemple rendu de chaque message au §8.3.
3. **Un écran de paramétrage** pour le staff : salons, horaires et interrupteurs des rappels, textes
   modifiables avec leurs valeurs par défaut, liste des étapes. Il est stocké en base et lu par le bot (§9).
4. **Des vidéos de débrief** : un lien ou un fichier court, rattaché à une étape et à un moment (§10).
5. **Le Guild Siege** profite de la même mécanique, en version simplifiée (§11).
6. **Le coffre AirGuild, le plan de farm, les ventes, la Boutique, le journal et les statistiques sont
   supprimés du site.** Cette spec ne s'appuie sur aucun d'eux. L'espace des bras droits (`/staff`) aura
   une rubrique **Suivi**, à laquelle le recensement se relie (§12.4).

**Ce qui a été lu pour l'écrire.**
- Le modèle Dracarys, **en entier** : `bot.py` (2 238 lignes), `tableau_debrief.py` (113 lignes),
  `LISEZMOI.md`, `.env.example` et `docker-compose.yml`. Toute référence `bot.py:NNN` renvoie à ce
  fichier, dans le dossier `~/Downloads/BotGuilde_pour_iBeats/`.
- Notre site : `src/lib/compositions.ts`, `src/app/(guild)/compositions/page.tsx` et `slots.ts`,
  `src/data/classes.ts`, `src/components/StrategieCS.tsx`, `src/data/chambres-adversaires.json`,
  `src/app/(public)/donjons/donnees.ts`, `public/wiki/faits-wiki-officiel.json` (fiches `chambres.*` et
  `guildSiege.cadre`), les routes `src/app/api/compositions/*`, `/api/characters/sync`,
  `/api/builder-state`, `/api/admin/settings`, `/api/admin/bot-command`, `/api/reglages`,
  `src/lib/access.ts`, `src/lib/reglages.ts`, `src/lib/auth.ts`, `src/config/roles.ts`, `src/config/nav.ts`,
  `src/middleware.ts`, `prisma/schema.prisma`, `next.config.js`, le `Dockerfile` et `docker-compose.prod.yml`.
- Notre bot : `bot/index.ts`, `bot/config.ts`, `bot/scheduler.ts`, `bot/lib/botcommands.ts`,
  `bot/lib/helpers.ts`, `bot/lib/permissions.ts`, `bot/lib/mp.ts`, `bot/commands/*` et `bot/README.md`.
- Le bloc « LES MESURES DU STUFF » de `public/airbuilder/airbuilder.js:1231-1365`.

**Comment lire ce document.** Chaque partie commence par ce qui change pour les joueurs. Les blocs
« Pour qui codera » donnent les fichiers, les règles et le pseudo-code. Pour écrire cette spec, rien n'a
été modifié dans `src/`, `bot/` ni `prisma/`.

---

## Décisions de Maxime du 2026-10-21 — elles PRIMENT sur toute recommandation de ce document

1. **Discord (Q4) : TOUT se fait aussi dans Discord**, « tout comme Discord [Dracarys], mais en rajoutant
   l'essentiel pour que ça se fasse sur Discord, tout en un ». Donc l'option « tout dans Discord » : les
   boutons des salles des Asuras, des équipes des Jumeaux, les menus du staff (placement, échanges), la
   clôture (cocher les présents) et le débrief étape par étape (statut, chrono, remarque, à retenir,
   gagné / perdu) se font AUSSI dans Discord, comme dans le modèle — et tout reste faisable sur le site, sur
   la même base. Le lot « boutons de salles et de jumeaux » n'est plus facultatif.
2. **Guild Siege (Q5) : prévu, mais TOUJOURS INACTIF** pour l'instant (« le PvP n'est pas encore
   installé »). Tout est codé et réglable, désactivé par défaut ; Maxime donnera les jours et horaires.
3. **Vidéos (Q6) : le STAFF SEULEMENT** (les 4 rangs des bras droits) envoie des fichiers ET des liens.
   Les membres regardent.
4. **Les Primats (Q2) : trois Primats possibles**, comme la composition du site — **DPS** (on doit
   connaître son DPS), **Off Tank** (ses PV en sceptre ; ses dégâts s'il veut aussi frapper, facultatif),
   **Tank** (il fait office d'Off Tank PUIS de Tank : ses PV en poing ET en sceptre). Déjà appliqué dans
   les mesures de l'AirBuilder (`mesChamps` : Primat offtank = pv requis + boulette/dps facultatifs ;
   Primat tank = pv (poing) + pvSceptre requis).
5. **Tout doit rester paramétrable sur le site** : « prévoir toujours une possibilité de pouvoir modifier
   quelques éléments texte, ou autre dans le site pour pouvoir paramétrer au cas où en changement de
   stratégie ». L'écran de paramétrage couvre donc aussi les POSTES (libellés, classe, rôle, nombre), les
   rôles par phase, les consignes du récap (golems, araignée), les salles et les textes de chaque message.
6. Q3 (participants) : la recommandation du document s'applique.
7. **Les PHASES et les ÉTAPES par défaut sont EXACTEMENT celles du vrai débrief du 18/10/2026** (image
   fournie par Maxime, retranscrite dans `assets/genesis/refonte/debrief-2026-10-18.json`). Cela REMPLACE
   la liste du §3.2 et Q1 : on garde « Phase 1 — Chambres » (pas « Les salles »), « Phase 2 — Couloir »,
   « Phase 3 — Araignée », « Phase 4 — Escalier », « Phase 5 — Boss final », et les intitulés
   « 480 monstres », « 12 Asuras », « 3 Malphas », « 100 soldats », « Jumeaux », « 100 araignées »,
   « Troll 1 (Dra'Zhul gauche) », « Troll 2 (Dra'Zhul droite) », « Araignée (Nyzarra) », « 100 araignées »,
   « Mini-soldats (escalier) », « Double boss Gor'Thar », « Boss final : Aatrox » — codes 1.1 à 5. Le tout
   reste modifiable dans le paramétrage.
8. **Les MONSTRES de chaque étape sont indiqués** dans la stratégie du site (StrategieCS, par étape, avec
   le lien vers la fiche /monstres quand elle existe — données src/data/chambres-adversaires.json et le
   catalogue des monstres) ET dans les messages Discord (récap, chrono, débrief). La correspondance
   étape → monstres est paramétrable.
9. **Les DÉGÂTS de chacun sont intégrés** partout où l'on voit les joueurs de la séance — composition,
   récap, chrono, débrief, image du débrief, historique — à partir des mesures déclarées dans l'AirBuilder
   (GearProfile.mesures : DPS/s, ou min–max, Bulle/Boulette, PV), « même si sur le site les dégâts ne sont
   pas justes » : on les affiche comme des valeurs DÉCLARÉES (avec la date de mesure et le témoin
   « à remesurer »), jamais comme des valeurs vérifiées.
10. **Le paramétrage vit dans l'espace Bras droits** (`/staff`, rubrique Outils, page des événements),
   réservé aux 4 rangs staff : étapes, phases, monstres par étape, postes, rôles, consignes, textes,
   rappels, et l'affichage des dégâts (afficher / masquer, quel chiffre par poste).
11. **Le débrief du 18/10/2026 est IMPORTÉ** comme première séance de l'historique dès que le lot des
   débriefs existe (statuts et remarques mot pour mot, aucun chrono, gagné, 10 joueurs).

---

## 0. En une minute

- **Un seul bot, le nôtre.** Il publie un **panneau d'inscription vivant** la veille de chaque Chambre.
  On y clique « Je viens » ou « Pas cette fois », et on y choisit son poste. Il envoie ensuite les rappels
  du jour J : 13 h 30 et 18 h 30 s'il manque du monde, 20 h, puis le récap complet à 20 h 40. Il tient le
  **chrono en direct**, à la fois dans Discord et sur le site, et publie le **débrief en image**. Tout ce
  qu'il fait passe par la même base que le site : une action faite sur Discord se voit sur le site, et
  inversement.
- **Le site reste l'outil.** On y trouve la répartition des phases (salles des Asuras, équipes des
  Jumeaux, golems, rotations de l'araignée), le débrief étape par étape, la clôture, l'historique et les
  vidéos. Le staff y règle tout le reste depuis un écran de paramétrage.
- **Des messages clairs.** Un émoji veut dire une seule chose, partout : 🛡️ un tank, ❤️ des PV, ⚠️ ce
  qui manque.
- **Recensement** : une page `/recensement`, ouverte à tous les membres, montre les chiffres de chacun,
  stuff par stuff, avec le témoin « à remesurer ». Les mêmes chiffres s'affichent à côté des noms dans la
  compo et dans le panneau Discord. La saisie, elle, existe déjà dans l'AirBuilder.
- **Vidéos** : sur la page d'un débrief, on joint un lien (YouTube, Twitch, Medal, Discord) ou un fichier
  de 100 Mo au plus, rattaché à une étape et à un moment, pour sauter directement à l'erreur.
- **Guild Siege** : des créneaux réglables, « Je viens », des rappels et un débrief simplifié. Tout ce qui
  dépend des règles du jeu est « À CONFIRMER PAR MAXIME ».
- **On construit en 10 lots**, chacun livrable seul. Le premier est le recensement, qui ne touche pas à
  la base. Le bot Python s'arrête à la fin du lot 7.

---

## 1. Le bot Dracarys, fonction par fonction, et qui la reprend chez nous

Chez Dracarys, **tout** se passe dans Discord, en boutons et en menus éphémères. Chez nous, la règle est
celle que Maxime a déjà posée pour la Boutique : *« tout se passe sur le site, pour ne plus jongler entre
deux outils »*. Elle est appliquée depuis : la Boutique et ses relais Discord ont quitté le site le 2026-10-21 (`bot/scheduler.ts:212-213`). Discord sert de **haut-parleur** : on y lit l'état, et on y
fait les **gestes d'un clic** qu'on y fait le plus souvent. Les gestes qui demandent de la place
(répartir, noter, comparer) se font sur le site. Le partage exact entre les deux est la question Q4.

| Fonction Dracarys | `bot.py` | Chez nous, sur Discord (notre bot) | Chez nous, sur le site | § · lot |
|---|---|---|---|---|
| Ouvrir une Chambre (`/chambre <date>`) | 2184-2207 | **Automatique** : le panneau part la veille à 20 h. `/chambre panneau` le republie | Rien à ouvrir : les créneaux sont fixes (mer. et dim., 21 h) | 2.5, 8.3 · 3 |
| Inscription par poste (boutons de poste, choix du perso) | 374-399, 432-552 | Panneau vivant : **✅ Je viens**, **❌ Pas cette fois**, choix du perso puis du poste en menu éphémère | Onglet Inscription (l'existant), avec les chiffres en plus | 4.12, 8.3 · 3 |
| Contrôle « le perso peut tenir le poste » | 581-585 | Seuls les postes de la classe du perso sont proposés | Idem (`page.tsx:353`) | 4.12 · 3 |
| Plafonds (5 par poste, 10 joueurs) | 325-326, 432-440 | **Non repris** : notre compo est une *cible*, pas un plafond (`compositions.ts:46-48`) | Le staff « retient » | 2.4 |
| Recensement (`/recensement`, fiche dans `#recensement`) | 577-742 | `/recensement` **en lecture** : tes chiffres, et ceux d'une classe | **Saisie dans l'AirBuilder** (déjà faite) ; page `/recensement` | 12 · 1 |
| Phase 1 : salles des Asuras (prendre, attribuer, compléter) | 746-818, 944-1009 | Lecture : 📍 Mes positions, récap | Onglet Répartition | 4.3 · 4 |
| Phase 2 : équipes des Jumeaux (choisir, placer, échanger) | 753-837, 1012-1116 | Lecture : 📍 Mes positions, récap | Onglet Répartition | 4.4 · 4 |
| Mes chambres et mon jumeau | 1119-1180, 1311-1320 | **📍 Mes positions** (éphémère) | Bandeau « Mes positions » | 8.3 · 4 |
| Échanges entre joueurs | 1183-1308 | — | Demande, puis acceptation (notification du site) | 4.5 · 10 |
| Récap de 20 h 40 (rôles, salles, jumeaux, golems, araignée) | 1553-1710 | **Embed** à 20 h 40, mis à jour jusqu'à la clôture | Aperçu dans l'onglet Répartition | 4.6, 8.3 · 4 |
| Rappels 13 h 30, 18 h 30, 20 h | 1519-1550, 1713-1748 | **Repris, réécrits et réglables**. Ceux de 13 h 30 et 18 h 30 s'ajoutent aux rappels existants ; celui de 20 h **fusionne** avec le rappel existant de 20 h (`@everyone` + mention des inscrits), pour ne pas envoyer deux messages à la même minute | Écran de paramétrage | 8.5, 9 · 3 |
| Chrono en direct | 1751-1902 | **Message vivant** avec les boutons du staff | Onglet Chrono, mis à jour toutes les 5 s | 4.9, 8.3 · 5 |
| Clôture (cocher les présents) | 1354-1473 | `/chambre cloturer` : lien vers la clôture (éphémère) | Bouton « Clôturer la séance » | 4.8 · 2 |
| Historique (`/historique`) | 1476-1503 | `/chambre historique` (éphémère) | Onglet Bilans | 4.8 · 2 |
| Débrief (parcours, chrono, remarque, à retenir, gagné/perdu) | 1904-2072 | `/chambre debrief` : lien vers le débrief (éphémère) | Onglet Bilans, en mode parcours | 4.10 · 6 |
| Analyse comparée aux débriefs précédents | 2074-2111 | Dans l'embed publié | Dans la page | 4.10 · 6 |
| Image du débrief | 2114-2137, `tableau_debrief.py` | **Publiée** avec l'embed, plus un bouton lien vers la page | Aperçu avant publication | 4.11, 8.6 · 7 |
| Menus expirés après redémarrage | 100-112 | **Sans objet** : nos boutons sont sans état, tout est relu en base (§8.1) | — | 8.1 |
| `/setup`, `/membre`, `/invite`, `/retirer`, `/annonce`, journal des arrivées, tags de forum | 173-301, 127-146 | **Non repris** : hors sujet, ou déjà couvert ailleurs | — | — |
| Données dans `data_chambre.json` | 306-367 | **Non repris** : base PostgreSQL commune (§5). Reprise facultative de l'historique (lot 10) | — | 5, 14 |

---

## 2. Correspondances Dracarys vers GENESIS

### 2.1 Les classes

Le modèle a 7 classes (`bot.py:311`). Nous en avons 8 (`src/data/classes.ts:30-39`). Les clés de
classe de la composition sont celles de `slots.ts`, sans accents (`Arbaletrier`, `Envouteur`). L'enum
Prisma les écrit en majuscules (`ARBALETRIER`). Pour passer de l'enum à la clé, on utilise
`classeAffichee` (`compositions.ts:130-133`).

| Dracarys | GENESIS (clé) | Libellé | Anglais | Libellé du poste chez nous |
|---|---|---|---|---|
| Arcaniste | `Arcaniste` | Arcaniste | Arcanist | « Arcaniste » (m1, m2, m3, d6) |
| Sorcier | `Envouteur` | Envoûteur | Mentalist | « Soso » (m4) |
| Chevalier | `Templier` | Templier | Templar | « Cheva » (d1) |
| Spadassin | `Spadassin` | Spadassin | Slayer | « Spadassin » (d3) |
| Yoyo Jester | `Sylphide` | Sylphide | Harlequin | « YJ » (d2) |
| Arbalétrier | `Arbaletrier` | Arbalétrier | Crackshooter | « Arbalétrier » (d4) |
| Primat | `Primat` | Primat | Seraph | « Primat — Tank croix », « … croix jumeaux » (p1, p2) |
| *(absent)* | `Chanoine` | Chanoine | Forcemaster | « Moine » (d5) |

Maxime dit aussi « Élémentaliste » pour l'Arcaniste et « Jester » pour la Sylphide (note
`mesures-stuff-airbuilder.md`).

**L'émoji d'une classe dans Discord.** On prend toujours l'**émoji personnalisé du serveur**,
`CLASS_EMOJIS` (`bot/config.ts:61-70`), qui reprend le logo de la classe. Le modèle fixait ses propres
émojis (`bot.py:856-857`) : ils sont abandonnés. Il faut une clé d'accès, `emojiClasse(cle) =
CLASS_EMOJIS[sansAccent(cle).toUpperCase()]`. En repli, si l'émoji personnalisé manque, on prend
`CLASS_LABELS[...].emoji` (`config.ts:73-82`), **sauf pour le Templier** : son repli 🛡️ se confondrait
avec « tank ». On lui donne 🐎, le cheval du modèle.

### 2.2 Les postes

Le modèle a 9 postes (`bot.py:313-323`), avec 5 places chacun et 10 joueurs au plus (`:325-326`).
Nous en avons 12 (`slots.ts:5-18`), dont 2 optionnels (d6, m3). Nous visons 10 places (`nbPlaces()`,
`compositions.ts:213-215`), ce que confirme le wiki officiel : « 10 joueurs par guilde »
(`faits-wiki-officiel.json`, fiche `chambres.cadre`).

| Notre poste | Classe | Groupe `slots.ts` | Poste Dracarys le plus proche | Écart |
|---|---|---|---|---|
| p1 Primat — Tank croix | Primat | Tanks (Primats) | `prima_tank` | Le build de p1 exige trois stuffs : DPS, Off-Tank (sceptre) et Tank (poing) (`slots.ts:6`) |
| p2 Primat — Tank croix jumeaux | Primat | Tanks (Primats) | `prima_tank` / `prima_dps` | p2 fait la croix sur les jumeaux, **du DPS sur l'araignée**, puis la croix au boss final (`slots.ts:7`) |
| d1 Cheva | Templier | DPS physique | `cheva_dps` | Nous n'avons **pas** de poste « Chevalier Tank » (`cheva_tank`, `bot.py:317`) |
| d2 YJ | Sylphide | DPS physique | `yj` | — |
| d3 Spadassin | Spadassin | DPS physique | `spada` | — |
| d4 Arbalétrier | Arbaletrier | DPS physique | `arba` | — |
| d5 Moine | Chanoine | DPS physique | *(aucun)* | Classe absente du modèle |
| d6 Arcaniste (option) | Arcaniste | **DPS physique** | `arca` | Rangé dans le groupe physique alors que l'Arcaniste est magique : **le type suit la classe, pas le groupe** (§2.3) |
| m1, m2 Arcaniste | Arcaniste | DPS magique | `arca` | — |
| m3 Arcaniste (option) | Arcaniste | DPS magique | `arca` | — |
| m4 Soso | Envouteur | DPS magique | `soso` | — |

### 2.3 Le rôle de chaque poste, phase par phase

Le modèle déduit le rôle d'un joueur de **ses postes**. Il est tank si l'un de ses postes est un poste de
tank (`bot.py:779-786`), et sinon il prend un type de DPS tiré de `TYPE_DPS` (`:751-752`). Il garde
ensuite, pour toute la soirée, le rôle tenu chez les jumeaux (`role_final`, `:1557-1563`).

Cela ne colle pas à nos Primats : p2 tanke les jumeaux puis fait du DPS sur l'araignée. On décrit donc le
rôle **par poste et par phase**, avec un champ facultatif `cs` ajouté au type `Slot` de `slots.ts`. C'est
un champ de code, qui ne demande aucune migration :

```ts
// src/app/(guild)/compositions/slots.ts — ajout au type Slot (facultatif)
cs?: {
  jumeaux: "tank" | "dps";      // Phase 2
  golems: "tank" | "dps";       // Phase 3 : Dra'Zhul gauche / droite
  araignee: "tank" | "dps";     // rotations de debuff (les tanks en sont exclus)
  mesure: ("tank" | "offtank" | "dps")[]; // quel stuff afficher, par ordre de préférence
};
```

Valeurs par défaut (« À CONFIRMER PAR MAXIME », question Q2) :

| Poste | jumeaux | golems | araignee | mesure affichée |
|---|---|---|---|---|
| p1 | tank | tank | tank | `["offtank", "tank"]`, **les deux affichés** : PV en sceptre et PV en poing |
| p2 | tank | tank | **dps** | `["offtank", "tank"]` : PV en sceptre, sinon en poing |
| tous les autres | dps | dps | dps | `["dps"]` |

*Contre-examen.* `slots.ts:6` dit que p1 a besoin des deux stuffs : l'**Off-Tank en sceptre tanke les
boss** (4M8 de PV) et la croix, le **Tank en poing** ne sert qu'au boss final (7M8). Les jumeaux et les
golems sont des boss : n'afficher que le poing montrerait le mauvais stuff pour les phases 2 et 3. Pour
p1, la compo, le panneau et le récap affichent donc les deux chiffres (« ❤️ 4,9 M sceptre · 7,9 M
poing »), le sceptre en premier. Le tri par chiffre (Phase 2) prend le sceptre. p2 n'a pas de stuff Tank
dans son build (`slots.ts:7` : « DPS / Off-Tank ») : le poing n'y est qu'un repli.

Un annoncé **sans poste** prend les valeurs du premier poste de sa classe dans `CS_SLOTS`. Pour une
classe sans poste, c'est `dps` partout.

Le **type de DPS** (magique ou physique) se déduit de la **classe**, jamais du groupe du poste. Le modèle
hésitait pour le Primat (commentaire « les deux possibles (à confirmer) » et valeur `"mag phy"`,
`bot.py:750-752`). Concrètement, chez lui, un Primat DPS **peut prendre une place magique OU physique**
chez les jumeaux (`peut_jouer` teste `role in "mag phy"`, `:784`), et le récap le range en magique
(`split()[0]`, `:1563`). Chez nous, un Primat DPS se mesure « à la Boulette », comme l'Envoûteur
(`airbuilder.js:1273`). On le range donc en magique, ce qui lui **retire** la place physique que le
modèle lui laissait : « À CONFIRMER PAR MAXIME » (Q2) :

```ts
export const TYPE_DPS: Record<string, "mag" | "phy"> = {
  Arcaniste: "mag", Envouteur: "mag", Primat: "mag",
  Templier: "phy", Sylphide: "phy", Spadassin: "phy", Arbaletrier: "phy", Chanoine: "phy",
};
```

Le **rôle de mesure** (dps, offtank, tank) vient de l'AirBuilder : `mesRoles(cls)`,
`airbuilder.js:1255-1258`. Tout le monde a `dps`, le Primat ajoute `offtank`, et le Primat, le Templier et
le Chanoine ajoutent `tank`. Le modèle a la même règle sous la forme de `CLASSES_TANK` (`bot.py:578`,
contrôle `:670-673`), mais il n'a que le Chevalier et le Primat.

### 2.4 Qui est « inscrit » à une séance

Le modèle n'a qu'une notion, `ch["inscrits"]` : ceux qui ont cliqué sur un poste pour cette Chambre.
Chez nous, trois notions se superposent (`compositions.ts:29-62`) :

- **l'inscription sur un poste** (`Signup`) : une candidature durable, qui ne dépend d'aucune date ;
- **l'annonce** « je serai là » (`Presence`) : un personnage annoncé pour une séance. Elle vaut depuis
  l'ouverture de la préparation de cette séance (`presencesSeance`, `compositions.ts:203-205`) ;
- **le retenu** (`Presence.retenu`) : le staff a choisi ce personnage pour jouer ce soir-là.

**Les participants d'une séance** (répartition, message de 20 h, récap, clôture) sont **les retenus**.
Tant que personne n'est retenu, ce sont **les annoncés** (« À CONFIRMER PAR MAXIME », question Q3).

Chaque participant est **un personnage** (son pseudo en jeu), pas un compte : on ne joue qu'un perso à
la fois. On le relie à son poste par l'inscription du même pseudo, titulaire d'abord. On le relie à son
compte par le **nom du personnage**, unique en jeu, et jamais par `charId` (piège n° 1, §13).

### 2.5 Une séance = un événement + une date + un créneau

Le modèle ouvre une Chambre à la main (`/chambre 18/10/2026 21h`, `bot.py:2184-2207`) et retrouve la
date en lisant ce texte (`chambres_du_jour`, `:1525-1537`). Si l'on oublie le format JJ/MM, les rappels
ne partent pas (`:2205-2206`). Chez nous, les créneaux de Chambre sont fixes : mercredi et dimanche à
21 h (`CRENEAUX`, `compositions.ts:21-24`). Une séance est donc **implicite**.

Sa clé est `cs_AAAA-MM-JJ_mer` ou `cs_AAAA-MM-JJ_dim`, avec la date **de Paris**. Pour le Guild Siege,
c'est `gs_AAAA-MM-JJ_<créneau>`, par exemple `gs_2026-10-25_sam2100` (§11). La séance est créée en base au
premier geste (panneau, rappel, répartition, chrono, débrief, clôture). Il n'y a rien à « ouvrir ».

Trois helpers, à écrire en heure de Paris (piège n° 4, §13), dans `src/lib/evenements.ts` :
- `partiesParis(d)` renvoie `{ date: "2026-10-22", jour: 3, hhmm: "13:30", minutes: 810 }`, via
  `Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", … }).formatToParts()` ;
- `prochaineSeanceParis(now)` reprend les fenêtres de `prochaineSeance` (`compositions.ts:186-195`),
  calculées sur l'heure de Paris et non sur l'heure locale du serveur. Elle renvoie en plus `cle` ;
- `seanceCouranteParis(now)` renvoie la séance **commencée depuis moins de 6 h**, sinon la prochaine.
  C'est celle que visent la répartition, le chrono et la synchronisation des messages du bot. Le cas qui
  l'impose : le mercredi à 21 h 30, la prochaine séance bascule sur le dimanche alors que le chrono du
  mercredi tourne encore.
- `derniereSeanceParis(now)` renvoie **la dernière séance commencée** (début ≤ maintenant), quel que
  soit l'écart. C'est celle que visent par défaut **la clôture, « Ils étaient là » et le débrief**.
  *Contre-examen* : avec `seanceCouranteParis`, une clôture ou un débrief fait le jeudi à 9 h (plus de
  6 h après le mercredi 21 h) visait le **dimanche suivant**, une séance pas encore jouée. Le staff
  garde un sélecteur de séance pour en viser une autre.

### 2.6 Le staff

Pour le modèle, le « staff », ce sont les rôles Discord `Admin` et `Staff`, ou la permission
Administrateur (`bot.py:760-764`). Chez nous :
- **sur le site**, c'est `ADMIN_ROLES` (DIRECTION, VANGUARD, GENERAL, OFFICIER, `src/config/roles.ts:19`),
  testé par `canAccessAdmin(role)`. Les membres sont `GUILD_ROLES`, avec GUARD et VETERAN en plus
  (`roles.ts:18`), testés par `canAccessGuild(role)` ;
- **dans le bot**, c'est `isStaff(member)` (`bot/lib/permissions.ts:26-30`) : la permission « Gérer le
  serveur », ou l'un des rôles de gestion. Les deux définitions désignent **presque** les mêmes
  personnes : `User.role` est synchronisé depuis ces mêmes rôles Discord (`scheduler.ts:186-205`), mais
  `isStaff` accepte en plus quiconque a « Gérer le serveur » sans rang de staff. Un tel membre pourrait
  cliquer le chrono dans Discord et pas sur le site. C'est acceptable (ce sont des administrateurs du
  serveur), mais à savoir.
- **Un geste du bot qui lit des données de membres** (« Je viens », 📍 Mes positions, `/recensement`,
  `/chambre historique`) ne se fie à aucun rôle Discord : il retrouve le `User` par `discordId` et exige
  `canAccessGuild(user.role) && user.isActive`, sinon il répond ⛔ (M9). Le serveur Discord compte aussi
  des visiteurs et des candidats (rôle Vérifié(e), `roles.ts:38`) : sans ce contrôle, `/recensement
  classe:Arcaniste` leur montrerait les chiffres de la guilde.

### 2.7 Les salons

| Dracarys (`LISEZMOI.md`) | Chez nous |
|---|---|
| `⚔️・composition-chambre` (inscription, phases, récap, chrono) | Salon **« Chambres »** du paramétrage (§9). Par défaut : la variable **nouvelle et facultative** `CHANNEL_CS`, sinon l'actuel `SALON_CS = "1498696982229811352"` (`bot/scheduler.ts:35`) |
| `debriefchambre`, sinon le forum `🧠・stratégie-chambre` (`bot.py:1763`, `:1994`) | Salon **« Débriefs »** du paramétrage (salon texte ou forum). Par défaut : la variable **nouvelle et facultative** `CHANNEL_CS_DEBRIEF`, sinon le salon « Chambres » |
| `📜・historique-chambres` (`:1355`) | Le site (onglet Bilans). Pas de salon |
| `📋・recensement` (`:329`) | Le site (`/recensement`). Pas de salon |
| — | Salon **« Essais »** du paramétrage, pour les messages d'essai. Par défaut : `CHANNEL_STAFF` (`bot/config.ts:18`) |

---

## 3. Les étapes du chrono et du débrief

**Pour les joueurs.** Le chrono et le débrief suivent le déroulé réel de notre Chambre. Le staff peut
renommer, ajouter ou retirer des étapes depuis l'écran de paramétrage, sans attendre un développeur.

### 3.1 Les 13 étapes du modèle, comparées à nos données

La liste du modèle est `ETAPES` (`bot.py:1753-1758`). Les noms de phase viennent de `PHASES_DEBRIEF`
(`:1759-1760`) : « Phase 1 — Chambres », « Phase 2 — Couloir », « Phase 3 — Araignée », « Phase 4 —
Escalier » et « Phase 5 — Boss final ».

Nos sources :
- **[W]** `public/wiki/faits-wiki-officiel.json`, fiches `chambres.cadre` et `chambres.mecaniques`, tirées
  du GitBook officiel Airborn et marquées `verifie: true`. Partie 1 : 480 mobs, 12 Asuras Mutant en
  mini-boss, 3 Malphas en boss. Partie 2 : 400 mobs, 4 mini-boss, 4 boss.
- **[I]** `public/wiki/images-wiki.json`, les légendes de la page du wiki, dans l'ordre : 480 mobs →
  12 mini-boss Asuras → 3 boss Malphas → 400 mobs → Kraavus & Kraavos → Dra'Zhul → Nyzarra → Gor'Thar.
- **[C]** `src/data/chambres-adversaires.json`, le relevé du client (37 adversaires).
- **[M]** le modèle lui-même, ailleurs que dans `ETAPES` : l'embed de la Phase 2 dit « Ces équipes servent
  aussi pour Dra'Zhul (🟢 gauche · 🔴 droite) » (`bot.py:877-878`), et le récap appelle ces deux équipes
  « Golem de GAUCHE » et « Golem de DROITE » (`:1682`). **Les « golems » du récap sont donc les deux
  Dra'Zhul.**
- `StrategieCS.tsx` ne contient **aucune** structure d'étapes : ce sont des blocs libres (titre, texte,
  image) stockés sous la clé `strategie:cs` (`src/lib/strategie.ts:14`). Il n'y a donc aucun conflit.
  `donjons/donnees.ts` ne parle pas des Chambres.

| Code | Modèle (`bot.py:1753-1758`) | Ce que disent nos données | Verdict |
|---|---|---|---|
| 1.1 | 480 monstres | [W] partie 1, 480 mobs. [I] « Ensemble des 480 mobs » | Conforme |
| 1.2 | 12 Asuras | [W] « Asuras Mutant » × 12. [C] `MI_ASURA04_2` « Asuras Mutant Secret » | Conforme |
| 1.3 | 3 Malphas | [W] « Malphas » × 3. **Absent de [C]** : aucun identifiant ne répond au critère du relevé | Conforme au wiki |
| 2.1 | 100 soldats | [W] partie 2, 400 mobs au total. Le découpage en 4 × 100 vient du seul modèle | À garder (invérifiable) |
| 2.2 | Jumeaux | [W] **Kraavus & Kraavos** : 3 barres chacun, environ 13,3 M PV/s de régénération. Ils doivent mourir à **4 s d'écart au plus**, sinon chacun régénère 50 % de ses PV. [C] `MI_CHAMBRE_BOSS_4` « Kraavus, titan putréfié », `BOSS_6` « Kraavos, titan maudit » | Renommer « Jumeaux — Kraavus & Kraavos » |
| 3.1 | 100 araignées | [C] « Tisseuse écarlate rampante » et « Araignée écarlate rampante » (`TRASH_4`, `TRASH_8`) | Conforme |
| 3.2 | Troll 1 (Dra'Zhul gauche) | [W] « Dra'Zhul » : **1 barre**. [C] un seul identifiant, `BOSS_5` « Dra'Zhul, le briseur de crânes ». [M] deux équipes, gauche et droite | Deux exemplaires du même monstre, ce qui est cohérent avec [M]. À confirmer (Q1) |
| 3.3 | Troll 2 (Dra'Zhul droite) | idem | idem |
| 3.4 | Araignée (Nyzarra) | [W] « Nyzarra » : 5 barres, renvoie 10 % des dégâts, on a 4 s pour cesser toute attaque. [C] l'écrit **« Nyzzara, la mère dévoreuse »** (`BOSS_2`) | Renommer. On garde l'orthographe du client, Nyzzara (Q1) |
| 4.1 | 100 araignées | [C] les mêmes araignées que 3.1 | Conforme |
| 4.2 | Mini-soldats (escalier) | [C] fantassins, archers, chevaliers et lames jumelles maudits (`TRASH_1/2/3/5/6/7`) | Invérifiable, à garder |
| 4.3 | Double boss Gor'Thar | [W] « Gor'Thar » : **2 barres**. [C] un seul identifiant, `BOSS_3` « Gor'Thar, le faucheur d'âmes » | **À CONFIRMER** (Q1) : « double » veut-il dire 2 barres ou 2 exemplaires ? |
| 5 | Boss final : Aatrox | [W] **6 barres**. Ses résistances tournent toutes les 10 s à partir de 20 s de combat (jaune = corps à corps, vert = distance, violet = magie). À 3 barres, le mauvais type de dégâts le **soigne du double**. [C] `BOSS_1` « Aatrox, juge de la corruption » | Conforme |

**Ce que nos données ont en plus, et que le modèle ne compte pas :**
- `MI_CHAMBRE_OBJ_2` « Statue d'invocation Maléfique » (3 barres) et `MI_CHAMBRE_OBJ_1` « Objet
  chambre 1 » (2 barres). Si on les détruit pendant la séance, il faut une étape de plus (Q1).
- Les `MI_CHAMBER_ANCIENT_*` du « Mausolée » et du « Tombeau » (Jumelosen, Brabus, Syku, Scar, Bàäl'tru,
  Simérïs, Igor, Grichka, Béérite, Coolike) n'apparaissent dans aucune étape du modèle. Ils ne sont pas au
  programme de nos séances : on ne les ajoute pas.
- Les neuf autres « Mutant Secret » (de Catsy à Ganessa) peuplent vraisemblablement les salles de la
  Phase 1. Aucune donnée ne le vérifie : on ne s'en sert pas.

### 3.2 La liste retenue par défaut (modifiable dans le paramétrage)

Chaque étape porte un émoji, comme dans le modèle (`bot.py:1753-1758`), avec **une seule correction** :
2.1 « 100 soldats » passe de ⚔️ à 💂, parce que ⚔️ veut dire « DPS physique » dans nos messages (§8.2).

```ts
// src/lib/evenements.ts
export type Etape = { code: string; label: string; phase: string; emoji: string };
export const PHASES_CS_DEFAUT: Record<string, string> = {
  "1": "Phase 1 — Les salles", "2": "Phase 2 — Le couloir", "3": "Phase 3 — L'araignée",
  "4": "Phase 4 — L'escalier", "5": "Phase 5 — Boss final",
};
export const ETAPES_CS_DEFAUT: Etape[] = [
  { code: "1.1", label: "480 monstres",                 phase: "1", emoji: "🧟" },
  { code: "1.2", label: "12 Asuras",                    phase: "1", emoji: "🌳" },
  { code: "1.3", label: "3 Malphas",                    phase: "1", emoji: "👹" },
  { code: "2.1", label: "100 soldats",                  phase: "2", emoji: "💂" },
  { code: "2.2", label: "Jumeaux — Kraavus & Kraavos",  phase: "2", emoji: "👯" },
  { code: "3.1", label: "100 araignées",                phase: "3", emoji: "🕸️" },
  { code: "3.2", label: "Dra'Zhul gauche",              phase: "3", emoji: "🗿" },
  { code: "3.3", label: "Dra'Zhul droite",              phase: "3", emoji: "🗿" },
  { code: "3.4", label: "Nyzzara",                      phase: "3", emoji: "🕷️" },
  { code: "4.1", label: "100 araignées",                phase: "4", emoji: "🕸️" },
  { code: "4.2", label: "Mini-soldats de l'escalier",   phase: "4", emoji: "🪜" },
  { code: "4.3", label: "Gor'Thar",                     phase: "4", emoji: "👺" },
  { code: "5",   label: "Aatrox, boss final",           phase: "5", emoji: "🐉" },
];
```

« Phase 1 — Chambres » devient « Phase 1 — Les salles » : sur notre site, le mot « Chambre » désigne déjà
le donjon entier. Le modèle fait lui-même ce remplacement dans son récap (`bot.py:1666`,
`.replace("Chambre ", "Salle ")`).

**Règles d'édition** (normalisation dans `normaliserParametres`, §9.3) :
- 1 à 30 étapes. Le `code` est **la clé de comparaison** d'une séance à l'autre : il est unique, fait 1 à
  8 caractères `[0-9A-Za-z.]`, et **ne change pas quand on renomme l'étape**.
- `label` : 1 à 60 caractères. `phase` : une clé de `phases`, avec 1 à 9 phases. `emoji` : un seul
  pictogramme (`/^\p{Extended_Pictographic}️?$/u`), sinon « ▫️ ».
- Une séance **fige sa liste d'étapes** au premier clic du chrono, ou à la première note du débrief
  (`SeanceGuilde.etapes`, §5.1). Modifier la liste ensuite ne touche pas aux séances passées. Deux séances
  se comparent étape par étape, sur le `code`. Une étape absente de l'une des deux n'a pas d'écart.

---

## 4. Les règles reprises, une par une

Tout ce qui suit est du **code pur**, placé dans `src/lib/chambres.ts` (règles des Chambres),
`src/lib/evenements.ts` (séances, heures de Paris, paramétrage, textes des messages) ou
`src/lib/recensement.ts` (mesures). Ces trois modules n'ont **aucune dépendance**, ni React, ni `next/*`,
ni Prisma, comme `src/lib/compositions.ts` : le bot les importe aussi (`tsx` résout `@/*` grâce au
`tsconfig`, `bot/scheduler.ts:12-14`). La clé d'un participant est son pseudo en minuscules : `cle(p) =
p.pseudo.toLowerCase()`.

### 4.1 Nombres et durées

**Nombres : `lireNombre` et `chiffreCourt`.** Ce sont des ports **à l'identique** de `mesLire` et
`mesCourt` (`airbuilder.js:1304-1311`), qui reprennent déjà `lire_nombre` et `fmt_nombre`
(`bot.py:588-614`) :
- « 9,4M », « 1.2 m », « 850k » et « 9 400 000 » donnent un entier. Sans suffixe, `.` et `,` séparent les
  milliers. Avec un suffixe, la virgule est décimale. Les espaces normales, insécables et fines sont
  retirées. Une valeur de 0, ou illisible, donne 0.
- `chiffreCourt(n)` : au-delà de 1e6, `toFixed(2)` sans les zéros finaux, avec une virgule et « M »
  (« 9,4 M ») ; au-delà de 1e3, `toFixed(1)` et « k » (« 850 k ») ; sinon le nombre lui-même ; et « — »
  pour 0.

**Durées : `lireDuree`.** C'est le port de `lire_duree` (`bot.py:1773-1788`), avec une différence voulue.
On met la saisie en minuscules et on retire ses espaces. Une saisie vide donne `null`, ce qui veut dire
« reprendre le chrono mesuré ». Puis, dans l'ordre :
1. `^\d+$` : des secondes (« 45 » donne 45) ;
2. `^(\d+)h(\d+)?$` : des heures, puis **des minutes** (« 1h02 » donne 3 720). C'est la différence avec
   le modèle : chez lui, le nombre nu après « h » tombe dans le groupe des secondes, et « 1h02 » donne
   3 602 ;
3. `^(?:(\d+)h)?(?:(\d+)(?:m|mn|min))?(?:(\d+)s?)?$`, avec au moins un groupe : « 2m34 » donne 154,
   « 1h2m3s » donne 3 723 et « 45s » donne 45 ;
4. `h:mm:ss`, `m:ss` ou `ss` (« 1:02:03 » donne 3 723, « 2:34 » donne 154) ;
5. sinon : illisible, et on renvoie `undefined`.

**Durées : `fmtDuree`.** C'est le port de `fmt_duree` (`bot.py:1766-1770`) : `null` donne « — », au moins
3 600 s donne `h:mm:ss`, et sinon `m:ss`. Les secondes sont arrondies.

**Écart : `ecart(nouveau, ancien)`** (`bot.py:2078-2082`, `:2126-2128`). Si l'un des deux manque, il n'y
a pas d'écart. Sinon on calcule `d = round(nouveau − ancien)`. `d < 0` donne « −m:ss » (plus rapide),
`d > 0` donne « +m:ss » (plus lent) et `d = 0` donne « = ». La fonction renvoie `{ texte, signe: -1 | 0 |
1 }`, et l'émoji suit le signe (§8.2).

### 4.2 Recensement : quel chiffre pour quel poste

Le modèle affiche les HP pour un poste de tank, et l'attaque sinon (`stat_poste`, `bot.py:617-623`). Il
refuse un perso dont la classe ou le rôle ne tient pas le poste (`perso_peut`, `:581-585`). Chez nous, les
mesures sont plus riches, et elles dépendent de la classe (`mesChamps`, `airbuilder.js:1270-1276`).

| Rôle | Classe | Champs de `mesures.v` | Chiffre principal (tri et totaux) | Affichage |
|---|---|---|---|---|
| dps | Arcaniste | `bulle`, `dps` | `dps` | « 182 k/s », détail « Bulle 45 k » |
| dps | Envoûteur, Primat | `boulette`, `dps` | `dps` | « 182 k/s », détail « Boulette 45 k » |
| dps | Spadassin, Templier, Chanoine, Sylphide, Arbalétrier | `dpsMin`, `dpsMax` | `round((dpsMin + dpsMax) / 2)` | « 150 k – 210 k/s » |
| offtank | Primat | `pv` | `pv` | « 9,4 M PV (sceptre) » |
| tank | Primat, Chanoine | `pv` | `pv` | « 9,4 M PV (poing) » |
| tank | Templier | `pv` | `pv` | « 9,4 M PV (doloire) » |

Sans DPS mesuré, il n'y a pas de chiffre. On ne prend jamais la Bulle ni la Boulette comme chiffre
principal : elles ne s'additionnent pas avec un DPS par seconde.

```ts
// src/lib/recensement.ts
export type Mesures = { role: "dps"|"offtank"|"tank"; v: Record<string, number>;
  poudres: Record<string, boolean>; buffs: Record<string, boolean>; cond: Record<string, boolean>;
  maj: number|null; mesureLe: number|null; complet: boolean|null };
export type Chiffre = { valeur: number; texte: string; detail: string | null;
  role: "tank"|"offtank"|"dps"; aRemesurer: boolean; mesureLe: number | null };
export const VIEILLE_MS = 30 * 864e5;              // MES_VIEILLE, airbuilder.js:1315

/** GearProfile.mesures (Json) -> Mesures | null. Jamais d'exception. */
export function lireMesures(json: unknown): Mesures | null;

/** complet === null : stuff vide (mesVide), on l'ignore partout. */
export const aRemesurer = (m: Mesures, now: number) =>
  m.complet === true && !!m.mesureLe && now - m.mesureLe > VIEILLE_MS;   // mesVieille, :1316

/**
 * Le stuff à montrer pour un poste. Préférences : rôle dans l'ordre de `roles` ; puis complet === true
 * avant false ; puis mesureLe le plus récent ; puis le chiffre le plus haut. Un stuff vide ne compte jamais.
 */
export function choisirStuff(stuffs: { mesures: unknown }[], roles: ("tank"|"offtank"|"dps")[], now: number): Chiffre | null;
```

Le rôle d'un stuff est `mesures.role`, déjà résolu par le builder, même quand il est déduit du nom du
stuff (`mesExport`, `airbuilder.js:1296-1298`). On ne se sert pas de `GearProfile.mode` : l'enum n'a pas
d'« off tank », et il range l'off tank en `HYBRIDE` (`/api/characters/sync`, `route.ts:11-19`).

### 4.3 Phase 1 : les salles des Asuras

**Pour les joueurs.** Chacun prend en un clic la ou les salles qu'il tient, et un deuxième clic les
libère. On ne vole pas une salle prise par un autre : on demande un échange (lot 10) ou on passe par le
staff. Le staff place n'importe qui, libère une salle, ou complète d'un coup toutes les salles vides.

**Les places.** Le modèle a 12 places : « Chambre 1 » à « Chambre 10 », plus « Asura 11 (arbre) » et
« Asura 12 (arbre) » (`SLOTS`, `bot.py:746-749`). C'est autant que d'Asuras d'après le wiki. Défaut chez
nous, modifiable dans le paramétrage :

```ts
export const SALLES_DEFAUT = [
  ...Array.from({ length: 10 }, (_, i) => ({ cle: `s${i + 1}`, label: `Salle ${i + 1}` })),
  { cle: "a11", label: "Asura 11 (arbre)" }, { cle: "a12", label: "Asura 12 (arbre)" },
];
```

**Le nettoyage.** C'est `repart`, `bot.py:767-776`. À chaque lecture, on retire des salles et des jumeaux
toute clé qui n'est plus un participant. On retire aussi des jumeaux toute place que le participant ne peut
plus tenir (`peutJouer`, §4.4). La conversion de l'ancien format `_dps` (`:771-773`) ne nous concerne pas.

**Prendre ou libérer une salle.** C'est `basculer_chambre`, `bot.py:789-803` :

```ts
function basculerSalle(r, participants, salle, cible: string, parStaff: boolean): Resultat {
  if (!participants.some(p => cle(p) === cible)) return refus("Seuls les participants de la séance prennent une place.");
  const occupant = r.salles[salle];
  if (occupant === cible && !parStaff) { delete r.salles[salle]; return ok(`Tu libères ${label(salle)}.`); }
  if (occupant && !parStaff) return refus(`${label(salle)} est déjà prise par ${nom(occupant)}.`);
  r.salles[salle] = cible;             // le staff écrase l'occupant
  return ok(`${label(salle)} → ${nom(cible)}.`);
}
// Libérer (le staff, ou l'occupant lui-même) : delete r.salles[salle]   (bot.py:998-1000)
```

Un joueur peut tenir plusieurs salles (`bot.py:849-850` : « plusieurs possibles, 1 joueur par chambre »).

**Compléter automatiquement** (staff). C'est `remplir_auto`, `bot.py:806-818`. Chaque salle vide, dans
l'ordre des salles, va au participant qui en tient le moins. En cas d'égalité, on suit l'ordre des
participants : chez nous, c'est **l'ordre d'annonce** (`Presence.ts` croissant), qui remplace l'ordre
d'inscription du modèle.

```ts
function remplirAuto(r, participants, salles): number {
  const js = participants.map(cle);
  if (!js.length) return 0;
  const charge = Object.fromEntries(js.map(j => [j, Object.values(r.salles).filter(x => x === j).length]));
  const vides = salles.filter(s => !r.salles[s.cle]);
  for (const s of vides) {
    const j = js.reduce((m, x) => (charge[x] < charge[m] ? x : m)); // égalité : le premier
    r.salles[s.cle] = j; charge[j]++;
  }
  return vides.length;
}
```

**Le compteur.** C'est `embed_phase1`, `bot.py:844-853` : « 11/12 couvertes ». Une salle vide s'affiche
« personne ! » en crimson. Le bloc passe au vert quand tout est couvert, et reste or sinon.

### 4.4 Phase 2 : les équipes des Jumeaux

**Pour les joueurs.** Il y a deux équipes, Verte et Rouge, chacune avec **1 tank et 4 DPS**, magiques ou
physiques confondus (`bot.py:759`, `:876`). Chacun choisit son équipe dans le rôle que son poste lui
permet. Le staff place un joueur, le retire, ou échange deux joueurs. Chaque équipe affiche son DPS total
et les PV de son tank. **En plus du modèle**, le site signale l'écart de DPS entre les deux équipes :
d'après le wiki, Kraavus et Kraavos doivent mourir à **4 s d'écart au plus**, sinon chacun régénère 50 %
de ses PV. Deux équipes trop inégales font donc échouer l'étape.

**Les places.** Ce sont les clés `vert_tank`, `vert_mag`, `vert_phy`, `rouge_tank`, `rouge_mag` et
`rouge_phy` (`JUMEAUX`, `bot.py:755-758`). Leurs libellés : « Verte — Tank », « Verte — DPS magique », etc.
(`ROLES_JUMEAU`, `:753`).

**Qui peut tenir quoi.** C'est `peut_jouer`, `bot.py:779-786`, adapté : chez nous, un participant n'a
qu'un poste.

```ts
const peutJouer = (p, role: "tank"|"mag"|"phy") =>
  role === "tank" ? p.roles.jumeaux === "tank"
                  : p.roles.jumeaux === "dps" && TYPE_DPS[p.classe] === role;
```

**Choisir son équipe** (le joueur). C'est `choisir_jumeau`, `bot.py:821-837` :

```ts
function choisirJumeau(r, p, place): Resultat {
  const [equipe, role] = place.split("_");
  if (r.jumeaux[cle(p)] === place) { delete r.jumeaux[cle(p)]; return ok(`Tu quittes ${libelle(place)}.`); }
  if (!peutJouer(p, role)) return refus(`Ton poste ne tient pas « ${ROLE_LABEL[role]} ».`);
  const autres = Object.entries(r.jumeaux).filter(([k, v]) => k !== cle(p) && v.startsWith(equipe + "_")).map(([, v]) => v.split("_")[1]);
  if (role === "tank" && autres.filter(x => x === "tank").length >= 1) return refus(`L'équipe ${nomEquipe(equipe)} a déjà son tank.`);
  if (role !== "tank" && autres.filter(x => x !== "tank").length >= 4) return refus(`L'équipe ${nomEquipe(equipe)} a déjà ses 4 DPS.`);
  r.jumeaux[cle(p)] = place;
  return ok(`Tu es dans l'équipe ${libelle(place)}.`);
}
```

**Le placement par le staff.** C'est `placer_jumeau_staff`, `bot.py:1026-1060`. L'action est l'une de
ces trois :
- `retirer` : le joueur sort de son équipe ;
- `echanger avec Y` : c'est refusé si Y n'est pas placé, ou si l'un des deux ne peut pas tenir le rôle de
  l'autre. Sinon X prend la place de Y, et Y prend celle de X, ou sort si X n'en avait pas ;
- une place : mêmes contrôles de rôle et de plafond que ci-dessus. Le message de refus propose l'échange :
  « L'équipe Rouge a déjà son tank : utilise plutôt Échanger avec… ».

**Ce que l'écran affiche.** C'est `embed_phase2`, `bot.py:872-908`. Pour chaque équipe : ses membres,
groupés par rôle (tank, DPS magique, DPS physique), chacun avec son chiffre (`joueur_jumeau`,
`:860-869`). Puis la ligne « Il manque : 1 tank, 2 DPS » (`:893-899`), le total « DPS : 812 k/s · PV
tank : 9,4 M » (`:900-902`) et la liste « Pas encore placés » (`:904-906`). **En plus du modèle**, la
ligne « Écart entre les équipes : 3 % » s'affiche. Elle passe en or au-delà de 10 %, et en crimson au-delà
de 20 %. Ces seuils sont un point de départ à ajuster à l'usage, pas une règle de jeu.

**En plus du modèle, au lot 10 : « Équilibrer les jumeaux »** (staff). On place un tank par équipe, puis
les DPS par chiffre décroissant, chacun dans l'équipe dont le total est le plus bas, sans dépasser 4 DPS.
Les DPS sans chiffre passent en dernier, dans l'ordre d'annonce. Le résultat écrase les places
existantes, après une confirmation.

### 4.5 Échanges entre joueurs (lot 10)

C'est `options_echange`, `appliquer_echange`, `decrire_echange` et `DemandeEchangeView`
(`bot.py:1183-1308`).

- **Les échanges qu'on peut proposer à un joueur** (`:1183-1202`) :
  - toute salle tenue par un autre. L'échange est alors une **reprise** : le demandeur prend la salle, et
    l'autre la perd sans rien recevoir ;
  - toute place de jumeau tenue par un autre, à trois conditions : le demandeur peut tenir ce rôle, l'autre
    n'est pas dans **sa propre** équipe, et, si le demandeur a déjà une place, l'autre peut tenir le rôle
    du demandeur. L'échange est alors un **troc** de places, ou une reprise si le demandeur n'avait rien.
- **La demande** est stockée dans `repartition.demandes[] = { id, de, a, quoi: "salle:s3" | "jumeau",
  ts }`. Elle **expire au bout d'1 h** (`:1243`, `timeout=3600`) : on filtre les demandes périmées à chaque
  lecture. Le texte reprend `decrire_echange` (`:1227-1236`) : « Kaelis voudrait reprendre ta Salle 3 »,
  ou « … voudrait ta place Rouge — DPS magique, et te donne la sienne : Verte — DPS physique ».
- **Seul le joueur visé, ou le staff, accepte ou refuse** (`:1247-1251`). Au moment d'accepter, on
  revérifie tout, comme `appliquer_echange` (`:1205-1224`) : « La place de jumeau a changé entre-temps. »
- **L'avertissement** passe par une notification du site (modèle `Notification`, avec un type
  `"chambre"` à ajouter dans `src/lib/typesNotif.ts` et le lien `/compositions?onglet=repartition`) et par
  un bandeau en haut de l'onglet Répartition du joueur visé. Rien ne passe par Discord : le modèle
  publiait la demande dans le salon public (`:1302-1305`), ce qui encombre le salon pour une affaire entre
  deux personnes.
- *Réalisé au lot 10 (2026-10-21), avec la décision 1 de Maxime (« tout se fait aussi dans
  Discord »)* : la demande se fait et se répond AUSSI dans Discord, sans rien publier dans le salon —
  🔄 Échanges (bouton de 📍 Mes positions) pour demander ou répondre, et un **message privé** au
  joueur visé (✅ Accepter, ❌ Refuser), puis au demandeur pour la réponse, après la bascule. Une
  demande garde les places des deux joueurs au moment où elle est faite : l'acceptation est refusée
  si l'une a bougé, même quand les rôles resteraient compatibles. Trois demandes en attente par
  joueur au plus ; le demandeur peut retirer la sienne ; une réponse reste lisible une heure.
  « Équilibrer » essaie tous les partages des DPS (huit DPS : 70 partages) au lieu du placement
  glouton décrit au §4.4, qui laissait 21 % d'écart sur la compo type quand 15 % étaient possibles.
  *Contre-vérification du lot 10* : « Équilibrer » lit toujours les dégâts déclarés (le site et
  Discord forment les mêmes équipes) ; seule sa réponse suit l'affichage du paramétrage
  (`degats.composition` sur le site, `degats.discord` dans Discord) et tait les totaux quand il les
  masque. On ne demande pas la place d'un autre de ses propres persos (personne d'autre n'y
  répondrait) : on le déplace soi-même. La notification ne renvoie à Discord qu'après la bascule.

### 4.6 Le récap : rôles, golems, araignée

**Le rôle tenu ce soir.** C'est `role_final`, `bot.py:1557-1563` : le rôle chez les jumeaux si le joueur
y est placé, sinon celui de son premier poste. Chez nous :
- pour les **listes par rôle** du récap (Tanks, DPS magiques, DPS physiques) : la place chez les jumeaux
  si elle existe, sinon `tank` quand `roles.jumeaux === "tank"`, et sinon `TYPE_DPS[classe]` ;
- pour les **golems**, on prend `roles.golems`, et pour l'**araignée**, `roles.araignee` (§2.3). C'est
  ce qui permet à p2 de tanker les jumeaux puis de faire du DPS sur l'araignée.

`classe_tenue` (`:1566-1573`) n'a pas d'équivalent à porter : chez nous, chaque participant a une seule
classe, celle de son personnage.

**Les deux équipes des golems (les deux Dra'Zhul).** C'est `equipes_golems`, `bot.py:1582-1619`. Le nom
affiché est « Golems » par défaut, et le paramétrage le rend modifiable (`noms.golems`).

```ts
function equipesGolems(ps, r) {
  const k = (p) => `${p.roles.golems === "tank" ? "T" : "D"}|${p.classe}`;
  const equilibre = (g, d) => {
    if (Math.abs(g.length - d.length) > 1) return false;
    for (const c of new Set(ps.map(k)))
      if (Math.abs(g.filter(p => k(p) === c).length - d.filter(p => k(p) === c).length) > 1) return false;
    return g.filter(p => p.roles.golems === "tank").length <= 1 && d.filter(p => p.roles.golems === "tank").length <= 1;
  };
  // 1. On garde les équipes des jumeaux si tout le monde y est placé et qu'elles sont déjà équilibrées.
  const g = ps.filter(p => r.jumeaux[cle(p)]?.startsWith("vert"));
  const d = ps.filter(p => r.jumeaux[cle(p)]?.startsWith("rouge"));
  if (g.length + d.length === ps.length && equilibre(g, d)) return { gauche: g, droite: d, depuis: "jumeaux" };
  // 2. Sinon, groupe par groupe (tank ?, classe) : les tanks d'abord, puis les groupes les plus nombreux.
  //    Le tri est STABLE : à égalité, on garde l'ordre d'apparition des groupes (comme le dict Python).
  const groupes = grouper(ps, k);                       // Map qui conserve l'ordre d'insertion
  const ordre = [...groupes].sort(([ka, a], [kb, b]) => (ka[0] === "T" ? 0 : 1) - (kb[0] === "T" ? 0 : 1) || b.length - a.length);
  const G = [], D = [];
  for (const [, membres] of ordre) for (const p of membres) {
    const cote = r.jumeaux[cle(p)]?.startsWith("vert") ? "G" : r.jumeaux[cle(p)] ? "D" : null;
    const ng = G.filter(x => membres.includes(x)).length, nd = D.filter(x => membres.includes(x)).length;
    const cible = ng !== nd ? (ng < nd ? "G" : "D")
                : G.length !== D.length ? (G.length < D.length ? "G" : "D")
                : (cote ?? "G");
    (cible === "G" ? G : D).push(p);
  }
  return { gauche: G, droite: D, depuis: "calcul" };
}
```

Avec notre composition de 10 (2 Primats, 2 Arcanistes, et une fois chacune des autres classes), on
obtient un Primat et un Arcaniste de chaque côté, et les classes uniques alternent jusqu'à 5 contre 5.

**Les rotations de debuff de l'araignée.** C'est `rotations_araignee`, `bot.py:1622-1636`. Les tanks en
sont exclus, et deux joueurs de la même classe ne sont jamais dans la même rotation :

```ts
function rotationsAraignee(ps) {
  const dps = ps.filter(p => p.roles.araignee !== "tank");
  const parClasse = grouper(dps, p => p.classe);            // ordre d'apparition
  const tri = [...parClasse].sort((a, b) => b[1].length - a[1].length); // stable
  const r1 = [], r2 = [], reserve = [];
  for (const [, m] of tri) {
    if (m.length >= 2) { r1.push(m[0]); r2.push(m[1]); reserve.push(...m.slice(2)); }
    else (r1.length <= r2.length ? r1 : r2).push(m[0]);
  }
  return { r1, r2, reserve };
}
```

**Le résumé des classes d'une équipe.** C'est `resume_classes`, `bot.py:1639-1645` : « 2 Arcaniste ·
1 Primat tank · 1 Templier ».

**Le contenu du récap.** C'est `message_recap`, `bot.py:1648-1702`. Une seule fonction pure,
`recap(seance, participants, repartition, parametres)`, renvoie une structure. Le site l'affiche (aperçu
dans l'onglet Répartition) et le bot la met en embed (§8.3, message M5). Ses blocs, dans l'ordre :
1. le titre et la ligne « {n}/{PLACES} joueurs · lisez bien votre rôle à chaque phase » ;
2. trois colonnes : **Tanks**, **DPS magiques** et **DPS physiques** ;
3. **Phase 1 — Asuras** : les salles regroupées par joueur, dans l'ordre des salles. Une ligne donne par
   exemple « **Salle 3 + Salle 4** → Kaelis ». S'il en reste, une dernière ligne « Sans joueur : … »
   (`:1662-1671`) ;
4. **Phase 2 — Équipe Verte** et **Équipe Rouge** : les membres, tank en tête, suivi de « — tank »
   (`:1673-1678`) ;
5. **Phase 3 — {golems} de gauche** et **de droite**, tank en tête, avec le résumé des classes en italique
   (`:1680-1685`) ;
6. la consigne des golems (`:1686`) ;
7. **Araignée — Rotation 1** et **Rotation 2**. S'il y a des remplaçants, un bloc « Remplaçants debuff »,
   avec « Debuff seulement si celui de sa classe est raté » (`:1689-1695`) ;
8. les rappels de l'araignée (`:1696-1699`).

**Les consignes** (blocs 6 et 8) sont celles du modèle, rangées dans le paramétrage et modifiables par le
staff (§9). Ce ne sont pas des faits vérifiés chez nous, d'où la mention « À RELIRE PAR MAXIME » :
- golems : « Ne debuff pas les golems. Longez les murs, n'attirez pas l'araignée. »
- araignée : « Jamais deux debuffs de la même classe en même temps. » · « Tout le monde collé à
  l'araignée, même à distance. » · « Cercle DANGER : Échap tout de suite (elle renvoie les dégâts). »

La troisième consigne est cohérente avec le wiki : Nyzarra renvoie 10 % des dégâts, et on a 4 s pour
cesser d'attaquer.

### 4.7 Les rappels du jour J (règles)

C'est `RAPPELS_PLACES`, `RAPPEL_INSCRITS` et `RAPPEL_RECAP` (`bot.py:1520-1522`, `:1554`), ainsi que
`rappels_chambre` (`:1713-1748`). Le détail des horaires et des textes est au §8.5. Ce qu'on garde du
modèle :
- les rappels de 13 h 30 et 18 h 30 ne partent **que s'il reste des places**. Chez nous, cela veut dire
  « il manque au moins une classe » (`ecartsClasse(annonces)` avec un `manque > 0`). C'est plus juste qu'un
  simple compte, parce que notre compo est une cible par classe ;
- **le rappel précédent est supprimé** avant d'envoyer le suivant, pour ne pas encombrer le salon
  (`:1735-1740`) ;
- le rappel de 20 h dit « ça commence dans 1 h » et **mentionne les inscrits**, seulement s'il y en a
  (`:1547-1550`, `:1730-1732`). Chez nous il fusionne avec le rappel `@everyone` existant de 20 h, et
  garde la mention des participants (M3) ;
- 20 h 40 : le récap (§4.6), avec la mention des participants (`:1701`).

Ce qu'on ne reprend pas : la lecture de la date dans un texte libre (`:1525-1537`), et le calcul de
« l'horaire prévu le plus proche » (`:1721-1722`). Chez nous, un tick par minute compare l'heure de Paris
aux horaires du paramétrage (§8.5), et la séance est connue d'avance.

### 4.8 Clôture et historique

**Pour les joueurs.** Après la séance, le staff ouvre « Clôturer la séance ». Tous les participants sont
cochés : il décoche les absents et valide. Chacun retrouve ensuite ses participations.

- **La clôture.** C'est `ClotureView`, `bot.py:1389-1445` : tous les inscrits sont cochés par défaut, le
  staff décoche les absents puis valide. Chez nous, la liste montre les participants (§2.4). Le staff peut
  aussi **ajouter** un annoncé non retenu qui est venu quand même. À la validation, on écrit une ligne
  `SeanceParticipant` par personnage : `present: true` pour les cochés, `false` pour les participants
  décochés. `details` reprend ce que montrait `ligne_participant` (`:1359-1369`) : le poste, les salles et
  la place chez les jumeaux. La séance passe à `clotureAt = now`.
- **Après la clôture**, la répartition refuse toute modification, comme chez le modèle, où la Chambre
  « terminée » perd ses boutons (`:1429-1445`). Le bot ferme aussi ses messages (panneau, chrono, récap :
  titre « · terminée », boutons retirés). Le staff peut **rouvrir** la séance (`clotureAt = null`). Une
  nouvelle clôture remplace les lignes, par un effacement puis une création, dans une seule transaction.
- **Ensuite**, le site propose « Faire le débrief maintenant ? » et ouvre l'onglet Bilans
  (`ProposerDebriefView`, `:2174-2181`, message `:1421-1423`).
- **Le bouton « Ils étaient là »** de l'onglet Inscription (`page.tsx:309-312`) ouvre cette même clôture,
  sur `derniereSeanceParis` (§2.5), jamais sur la prochaine. L'ancienne route `POST
  /api/compositions/presences` reste en place, mais plus rien ne l'appelle (piège n° 6, §13).
- **L'historique.** C'est `/historique`, `bot.py:1476-1503`. Par joueur : les séances jouées sur le total,
  la liste des dates jouées, et « inscrit mais absent » (`:1484-1489`). Pour la guilde : le classement des
  participations, limité aux 40 premiers, et le bilan « N victoires · M défaites, selon les débriefs »
  (`:1490-1501`). Le modèle le réserve au staff. Chez nous, **le staff voit tout et un membre voit sa
  propre ligne**, plus la liste des séances avec leur résultat et leur temps, qui sont publics sur Discord
  de toute façon.

### 4.9 Le chrono en direct

**Pour les joueurs.** Un membre du staff, le chronométreur, clique « Démarrer » au lancement de
l'instance, puis « Fin : 1.1 480 monstres », « Fin : 1.2 12 Asuras », et ainsi de suite. Il peut cliquer
**sur le site ou dans Discord** : les deux écrivent au même endroit. Tout le monde voit l'étape en cours et
son temps qui défile. Un clic de trop s'annule.

**L'état.** `SeanceGuilde.chrono = { debut: number|null, fins: number[], par: string, fini: boolean }`,
en millisecondes epoch fixées par le serveur (ou par le bot). C'est la forme de `bot.py:1863`, `:1895`.

**Les durées.** C'est `durees_chrono`, `bot.py:1792-1797` : `bornes = [debut, ...fins]` et
`duree(etapes[i].code) = bornes[i + 1] − bornes[i]`.

**Les actions** (`cliquer_chrono`, `bot.py:1861-1876`) :

```ts
function appliquerChrono(c, action, now, par, n /* nb d'étapes figées */) {
  if (action === "suivante") {
    if (!c.debut) Object.assign(c, { debut: now, fins: [], par, fini: false });  // « Démarrer »
    else if (c.fins.length < n) { c.fins.push(now); c.fini = c.fins.length === n; }
  } else if (action === "annuler") {
    if (c.fini && c.fins.length < n) c.fini = false;          // annule un « Arrêter »
    else if (c.fins.length) { c.fins.pop(); c.fini = false; }
    else Object.assign(c, { debut: null, fins: [], fini: false });
  } else if (action === "arreter") c.fini = true;
  else if (action === "reinitialiser") Object.assign(c, { debut: null, fins: [], fini: false });
  // « reinitialiser » : staff, après une confirmation (« Effacer tout le chrono de ce soir ? »), avec
  // le même contrôle de `vu`. Il n'existe pas chez le modèle (son « Annuler » remonte clic par clic,
  // :1867-1874) ; la route 6 le cite, il fallait donc le définir. Absent des boutons Discord.
}
```

- **Qui peut cliquer.** Le modèle accepte le chronométreur et le staff (`:1857-1859`). Comme seul le
  staff peut lancer un chrono (`:1886`), cela revient chez nous au **staff seulement** : `ADMIN_ROLES` sur
  le site, `isStaff` dans le bot. Le champ `par` sert à l'affichage (« chronométreur : Maxime »).
- **Le double clic.** Deux membres du staff peuvent cliquer en même temps, ou l'un sur le site et l'autre
  dans Discord. Le client envoie `vu = fins.length`, tel qu'il l'a affiché. Le bouton Discord porte la
  même valeur dans son `custom_id` (§8.1). Si ce n'est plus la bonne valeur, le serveur (ou le bot) refuse
  avec un 409 et réaffiche l'état, sans rien appliquer.
- **Les étapes figées.** Au premier « Démarrer », `seance.etapes = parametres.etapes` (§3.2).
- **L'affichage**, inspiré d'`embed_chrono` (`bot.py:1800-1822`) : une étape faite affiche sa durée,
  l'étape en cours affiche « en cours depuis m:ss » (calculé chez le client), et une étape à venir
  n'affiche que son nom. En tête, selon le cas : « Clique sur Démarrer au lancement de l'instance » ;
  « Départ à 21:04:12 · chronométreur : X » ; ou « Terminé en 42:17 », suivi de « (arrêté avant la fin) »
  s'il manque des étapes (`:1813-1818`).
- **Le total** est la somme des durées faites (`:1816`).
- Le bouton principal du staff s'appelle « Démarrer », puis « Fin : {code} {label} », puis « Terminé »,
  grisé (`ChronoView`, `:1825-1845`). Les boutons « Annuler le dernier clic » et « Arrêter » sont grisés
  quand ils n'ont pas de sens.

### 4.10 Le débrief et son analyse

**Pour les joueurs.** Après la séance, le staff note chaque étape (bien, moyen ou mal), corrige un chrono
si besoin, ajoute une remarque, indique gagné ou perdu, et écrit ce qu'il faut retenir. Il joint des
vidéos (§10). Le site compare la séance à la précédente. Une fois publié, le débrief est lisible par tous,
sur le site et sur Discord.

**Les données** (`SeanceGuilde.debrief`) : `{ [code]: { statut: "bien"|"moyen"|"mal"|null, chrono:
number|null (secondes, saisie manuelle), remarque: string } }`, plus `resultat`, `aRetenir` et
`debriefPar`. C'est la forme de `bot.py:1911`, `:1964`, `:2041`, `:2059`.

- **Le chrono d'une étape.** C'est `chrono_etape`, `bot.py:1905-1907` : la saisie manuelle si elle existe,
  **sinon la durée mesurée** par le chrono (§4.9). Une saisie vidée fait revenir la mesure.
- **Le parcours étape par étape.** C'est `texte_wizard`, `DebriefView` et `noter` (`bot.py:1910-1966`) :
  un clic sur Bien, Moyen ou Mal **enregistre et passe à l'étape suivante**, et on s'arrête à la dernière.
  Précédente et Suivante naviguent sans rien noter. La remarque fait 300 caractères au plus (`:2028`), et
  « à retenir » 1 000 caractères au plus (`:2052`).
- **Publier** reste possible quand il manque des statuts, avec l'avertissement « Étapes sans statut : 3.2,
  4.1 » (`:1992`, `:2016`).
- **Le résumé.** C'est `resume_debrief`, `bot.py:2065-2071` : pour chaque étape figée, le statut, le chrono
  (via `chronoEtape`) et la remarque. `total` est la somme des chronos connus.
- **L'analyse.** C'est `embed_debrief`, `bot.py:2074-2111`. Voici la fonction pure, utilisée par le site,
  par l'embed **et** par l'image :

```ts
function analyseDebrief(courant: Resume, precedents: Resume[] /* séances PUBLIÉES, même événement, date < courante, triées par date */) {
  const dernier = precedents.at(-1) ?? null;
  const out = {
    resultat: courant.resultat,                                   // gagne / perdu
    total: courant.total,
    ecartTotal: dernier && complet(courant) && complet(dernier) ? ecart(courant.total, dernier.total) : null,   // « −1:23 vs dimanche 19 octobre »
    // complet(r) : chaque étape figée de r a un chrono (§4.10, point 3)
    record: complet(courant) && precedents.some(p => complet(p) && p.total)
            && courant.total < Math.min(...precedents.filter(p => complet(p) && p.total).map(p => p.total)),
    plusLongue: null as null | { code, label, duree, part },     // part = round(100 × duree / total)
    malDeuxFois: [] as string[],                                  // « 3.4 Nyzzara »
  };
  const avec = Object.entries(courant.etapes).filter(([, e]) => e.chrono);
  if (avec.length && courant.total) { const [c, e] = maxPar(avec, e => e.chrono); out.plusLongue = { code: c, label: libelle(c), duree: e.chrono, part: Math.round(100 * e.chrono / courant.total) }; }
  if (dernier) out.malDeuxFois = codesFiges.filter(c => courant.etapes[c]?.statut === "mal" && dernier.etapes[c]?.statut === "mal");
  return out;
}
```

**Deux écarts au modèle, voulus.**
1. *Le précédent.* Pour le modèle, le « dernier » débrief est le dernier **publié**, quelle que soit sa date
   (`precedents[-1]`, `:1998`, `:2075`). Republier un vieux débrief le comparait donc à un débrief plus
   récent. Chez nous, c'est **la dernière séance publiée avant celle-ci**, par date.
2. *Le record.* Le modèle annonce « Nouveau record » dès le tout premier débrief, alors qu'il n'existe pas
   encore de précédent (`:2089`, `not totaux`). Chez nous, le record exige **au moins un précédent** avec
   un temps total.
3. *Le run complet* (contre-examen). Le total est la somme des chronos connus (`:2069`). Un chrono
   arrêté en Phase 2 (« arrêté avant la fin », `:1816`) donne donc un total court, que le modèle
   proclame « record » et compare au total complet de la fois précédente. Chez nous, une séance est
   **complète** quand chaque étape figée a un chrono (mesuré ou saisi). `record` exige une séance
   complète, comparée aux seules séances complètes ; `ecartTotal` n'est calculé qu'entre deux séances
   complètes, et sinon l'écran affiche « temps partiel » au lieu d'un écart. Les écarts **par étape**,
   eux, restent calculés.

### 4.11 L'image du débrief

C'est `tableau_debrief.image_debrief` et `image_tableau` (`tableau_debrief.py:45-113`,
`bot.py:2114-2137`). Le modèle dessine une image de 1 200 px de large, en 5 colonnes (étape, statut,
chrono, écart, remarque), avec du texte de 19 à 22 px. Sur un téléphone, ce texte tombe autour de 6 px :
c'est trop petit. **Notre mise en page est pensée pour le téléphone d'abord** : 960 px de large, du texte
de 26 à 30 px, et la remarque sur sa propre ligne, sous l'étape.

| Élément | Règle |
|---|---|
| Fond | `#08080C` (noir). Barre d'accent à gauche, 8 px, en `#A6192E` (crimson). Le modèle en a une aussi (`tableau_debrief.py:66`) |
| Marges | 48 px |
| Titre | « RETOUR CHAMBRE SECRÈTE », Cinzel 600, 44 px, `#C69A55` (or) |
| Sous-titre | « Mercredi 22 octobre 2026 · 10 joueurs · comparé au dimanche 19 octobre », Athiti 400, 28 px, `#A39C93` (`--gn-texte-doux`). Repris de `bot.py:2135` |
| Pastille de résultat | En haut à droite, 56 px de haut, rayon 28. « GAGNÉ » sur `#2F8F5B`, « PERDU » sur `#A6192E`, en Cinzel 700 28 px, couleur `#F2EDE5` (ivoire). Rien s'il n'y a pas de résultat (`tableau_debrief.py:69-74`) |
| Bandeau du total | **En haut**, et non en bas comme chez le modèle : c'est le chiffre qu'on cherche. Carte `#15151D` (anthracite), rayon 16. « TEMPS TOTAL » en Athiti 600 24 px `#A39C93`, puis « 42:17 » en Cinzel 700 64 px `#F2EDE5`. À droite, l'écart « −1:23 vs 19/10 » en Athiti 600 32 px : `#4ADE80` si plus rapide, `#E35D6F` (`--gn-crimson-texte`) si plus lent, `#A39C93` si égal. Badge « NOUVEAU RECORD » en or, bordé `rgba(198,154,85,.42)` |
| Phase | Nom de la phase en Cinzel 600 30 px `#E6C48A` (`--gn-or-clair`), filet de 2 px `rgba(198,154,85,.42)` |
| Ligne d'étape | Carte `#15151D`, rayon 14, 16 px de marge haute et basse, 20 px de côté. **Ligne 1** : le code en Athiti 700 26 px `#A39C93` sur 64 px ; le libellé en Athiti 600 30 px `#F2EDE5`, qui passe à la ligne si besoin ; à droite, un bloc de 300 px avec la pastille de statut, puis le chrono (Athiti 700 30 px `#F2EDE5`, chiffres alignés à droite) et, dessous, l'écart (Athiti 600 24 px, coloré). **Ligne 2**, seulement s'il y a une remarque : Athiti 400 26 px `#E6DFD4`, sur toute la largeur, 4 lignes au plus, puis « … ». Si l'étape a des vidéos, la ligne 2 se termine par « · 2 vidéos sur le site », en `#A39C93` |
| Pastilles de statut | « Bien » sur `#2F8F5B`, texte `#F2EDE5` · « Moyen » sur `#C69A55`, texte `#08080C` (comme le texte sombre du modèle sur l'orange, `tableau_debrief.py:93`) · « Mal » sur `#A6192E`, texte `#F2EDE5` · « — » sur `#2A2A33`, texte `#A39C93`. Hauteur 40, rayon 20, Athiti 700 24 px |
| Analyse | Titre « ANALYSE » en Cinzel 600 28 px `#E6C48A`. Puces en Athiti 26 px : « Étape la plus longue : 2.2 Jumeaux — 6:12 (15 % du temps) » ; « Mal deux fois de suite : 3.4 Nyzzara — à retravailler » |
| À retenir | Titre « À RETENIR », puis le texte en Athiti 400 28 px `#F2EDE5`, 8 lignes au plus |
| Pied | « Vert : plus rapide que la dernière fois · rouge : plus lent », puis l'hôte du site tiré de `NEXTAUTH_URL` (« vanguardhub.fr/compositions »), en Athiti 22 px `#A39C93` |
| Hauteur | Calculée sur le contenu, autour de 2 000 px pour 13 étapes. PNG avec `compressionLevel: 9` |
| Émojis | **Aucun** dans l'image : l'image Docker n'a pas de police d'émojis, Pango les remplacerait par des carrés. Les émojis restent dans l'embed |

Le vert `#2F8F5B` n'appartient pas à la palette GENESIS. Il faut pourtant un vert pour dire « bien » et
« plus rapide », et le `--green` du site (`#4ADE80`) est trop clair pour porter du texte ivoire.
« À VALIDER PAR MAXIME » : sa consigne nomme cinq couleurs (noir, anthracite, crimson, or, ivoire). Le
repli sans vert serait « Bien » en ivoire sur anthracite, bordé d'or, et « plus rapide » en or.

**La production en TypeScript** : `src/lib/seance-image.ts`, du code Node qui utilise sharp. Le bot
l'importe, et la route d'aperçu aussi (§6, route 14).
- **Les formes** (fond, cartes, pastilles, filets) sont dessinées dans un SVG, rendu par
  `sharp(Buffer.from(svg))`.
- **Le texte** est rendu morceau par morceau avec l'entrée texte de sharp (Pango), puis posé par
  `composite()`. Exemple : `sharp({ text: { text: markup, font: "Athiti 26", fontfile, width, wrap:
  "word", rgba: true, dpi: 72 } })`. Seul Pango sait couper un paragraphe à une largeur donnée, et il donne
  la hauteur exacte du résultat (`metadata()`), ce qui permet de placer la ligne suivante. Un `<text>` SVG
  ne passe pas à la ligne.
- **Tout texte saisi est échappé** (`&`, `<`, `>`, `"`, `'`) avant d'entrer dans le balisage Pango ou dans
  le SVG. Les remarques et « à retenir » sont libres : sans cela, un « < » casse l'image, ou injecte du
  balisage.
- **Les polices** : voir le piège n° 8 (§13) et le lot 7. Il faut installer Cinzel et Athiti dans l'image
  Docker, sinon Pango retombe sur une police par défaut, sans erreur.

### 4.12 S'inscrire depuis Discord

**Pour les joueurs.** Sur le panneau de la Chambre, on clique **✅ Je viens**. Si on n'a qu'un perso
jouable, il est annoncé. Si on en a plusieurs, un menu demande lesquels on peut amener : on peut en cocher
plusieurs, et le staff choisira, exactement comme sur le site. Si le perso n'a pas encore de poste, un
second menu propose les postes de sa classe. **❌ Pas cette fois** retire ses annonces. Tout se voit sur
le site, et le panneau se met à jour.

C'est la reprise d'`inscrire`, `valider` et `ChoixPerso` (`bot.py:470-552`), réécrite sur nos données :

```ts
// src/lib/evenements.ts (pur) + bot/lib/seances.ts (Discord)
async function cliquerJeViens(db, discordUser, cleSeance): Reponse {
  const s = prochaineSeanceParis(new Date());
  if (cleSeance !== s.cle) return info("Ce panneau est celui d'une séance passée.", lienVersPanneau(s));
  const user = await db.user.findUnique({ where: { discordId: discordUser.id } });
  if (!user) return erreur("compte_non_lie");                    // 🔗 (§8.3, M9)
  if (!canAccessGuild(user.role) || !user.isActive) return erreur("reserve_membres");   // ⛔
  const persos = (await db.character.findMany({ where: { userId: user.id } }))
    .filter(c => CLASSES_CS.includes(classeAffichee(c.class)));
  if (!persos.length) return erreur("aucun_perso");              // 🧙
  // Ordre : les persos qui ont une inscription sur un poste, puis le perso principal (isMain), puis le nom.
  // 1 perso → on l'annonce. Plusieurs → menu à choix multiple (25 au plus), avec les annonces actuelles cochées.
}

function annoncer(etat: CompoState, seance, choisis: Character[], tousMesPersos: Character[], player: string, now: number) {
  const miens = new Set(tousMesPersos.map(c => c.name.toLowerCase()));
  // On retire les annonces de CETTE séance pour les persos de ce compte, puis on pose celles choisies.
  // On reprend le geste de basculerPresence (page.tsx:118-127) : l'annonce périmée du même perso part aussi.
  etat.presences = etat.presences.filter(p => !(p.creneau === seance.creneau && miens.has(p.pseudo.toLowerCase())));
  for (const c of choisis)
    etat.presences.push({ player, pseudo: c.name, classe: classeAffichee(c.class), creneau: seance.creneau, ts: now,
                          retenu: ancienRetenu(c) });         // un retenu le reste s'il est recoché
}
```

- **`player`** vaut **`user.username`**, lu en base sur le `User` retrouvé par `discordId`.
  *Contre-examen* : la révision 2 écrivait `discordUser.globalName ?? discordUser.username`, en croyant
  que `session.user.name` était le nom affiché. C'est faux : le fournisseur Discord de next-auth 4.24
  fait `name: profile.username` (`node_modules/next-auth/providers/discord.js:25`), sans `global_name`,
  et `auth.ts` ne surcharge pas `profile()`. `session.user.name`, donc `meName` (`page.tsx:21`), est
  l'**identifiant** Discord, la même valeur que `User.username` (`auth.ts:100`, mis à jour à chaque
  connexion). Avec le nom affiché, l'annonce faite sur Discord n'aurait jamais été reconnue comme « la
  mienne » (`jySuis`, `page.tsx:214`) et la page aurait reposé sa question. Le bot ajoute aussi `userId`
  (§5.3), qui ne dépend d'aucun nom.
- **« Pas cette fois »** retire toutes les annonces de la séance pour les persos du compte. Si l'un d'eux
  était retenu, la réponse le dit : « Tu étais retenu : préviens le staff. » Le panneau, lui, montre le
  trou.
- **Choisir son poste.** Si le perso annoncé n'a aucune inscription, la réponse propose un menu avec les
  postes de sa classe (libellés de `slotMeta`, avec « 2 déjà inscrits »). Le choix écrit un `Signup`, avec
  la même règle que `registerToSlot` (`page.tsx:151-163`) : un perso n'est que sur **un** poste, et son
  éventuelle inscription ailleurs est retirée. La page la retire par `charId` ; le bot la retire **par
  pseudo, sans tenir compte de la casse**, puisque `charId` est orphelin après chaque synchro (piège
  n° 1). On renseigne quand même `charId = Character.id` pour que la page reconnaisse le perso, plus
  `ts: now` et `userId` (§5.3, §5.4).
- **L'écriture** passe par `modifierCompo` (§5.4), jamais par un `upsert` aveugle. La page renvoie l'état
  entier à chaque clic : sans le correctif du §5.4, son prochain enregistrement effacerait l'annonce faite
  sur Discord.
- **Répondre dans les 3 s.** Discord abandonne une interaction sans réponse au bout de 3 s. Le bot appelle
  donc `deferReply({ ephemeral: true })` **avant** de lire la base, puis `editReply` (piège n° 16).

---

## 5. Modèle de données

### 5.1 Quatre modèles Prisma neufs

On n'ajoute que des modèles nouveaux. **Aucune colonne existante n'est modifiée**, et `User` n'est pas
touché (ni relation inverse, ni champ). D'autres agents modifient le schéma en même temps, et `prisma db
push` refuse toute suppression en production (`docker-compose.prod.yml`, service `migrate`).

```prisma
/// Une séance d'un événement de guilde : Chambre Secrète ("cs") ou Guild Siege ("gs").
/// Créée au premier geste (panneau, rappel, répartition, chrono, débrief, clôture) — jamais à la lecture.
model SeanceGuilde {
  id              String    @id @default(cuid())
  /// "cs_2026-10-22_mer" | "gs_2026-10-25_sam2100" — clé lisible, utilisée dans les URL et par le bot.
  cle             String    @unique
  evenement       String    // "cs" | "gs"
  date            String    // "2026-10-22", jour de Paris
  creneau         String    // "mer" | "dim" | id de créneau GS ("sam2100")
  /// Instant du début (21 h à Paris pour une Chambre) : tri, rappels, « commencée depuis moins de 6 h ».
  debut           DateTime
  /// Séance annulée (jeu indisponible ce soir-là) : plus aucun rappel, panneau fermé.
  annulee         Boolean   @default(false)
  annuleePar      String?
  /// Verrou optimiste : chaque écriture fait version = version + 1 (§5.4).
  version         Int       @default(0)
  /// CS : { salles: { s1: "kaelis" }, jumeaux: { kaelis: "rouge_mag" }, demandes: [] }
  repartition     Json?
  /// Instantané figé au 1er chrono ou à la 1re note : { etapes: Etape[], phases: { "1": "…" } }
  etapes          Json?
  /// { debut: ms|null, fins: ms[], par: string, fini: boolean }
  chrono          Json?
  /// { "1.1": { statut, chrono, remarque }, … } ; GS sans étapes : {}
  debrief         Json?
  resultat        String?   // "gagne" | "perdu"
  aRetenir        String?
  debriefPar      String?
  debriefPublieAt DateTime?
  /// Lien du message Discord du débrief (jump URL), écrit par le bot.
  debriefLien     String?
  /// Messages Discord vivants de la séance : { panneau: {canal, id}, places: {…}, jour: {…}, recap: {…}, chrono: {…} }
  messages        Json?
  /// Marqueurs d'envoi des rappels, par id de rappel : { "veille": ms, "places_1": ms, … }
  rappels         Json?
  clotureAt       DateTime?
  cloturePar      String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  participants SeanceParticipant[]
  videos       SeanceVideo[]

  @@index([evenement, date])
}

/// Qui jouait. CS : une ligne par personnage, écrite à la CLÔTURE (les annonces vivent dans
/// CompositionState). GS : une ligne par annonce « Je viens », complétée à la clôture.
model SeanceParticipant {
  id        String       @id @default(cuid())
  seanceId  String
  seance    SeanceGuilde @relation(fields: [seanceId], references: [id], onDelete: Cascade)
  pseudo    String       // personnage joué, tel qu'affiché
  classe    String       // clé de slots.ts
  player    String       // Presence.player de l'annonce : le User.username du jour de la connexion (piège n° 2)
  userId    String?      // User.id résolu par le nom du personnage (null si introuvable)
  slotId    String?
  /// GS : moment de l'annonce. CS : null.
  annonceAt DateTime?
  /// null = annoncé, séance pas encore clôturée (GS) ; true / false = constaté à la clôture.
  present   Boolean?
  /// { salles: ["s3","s4"], jumeau: "rouge_mag" | null, role: "tank" | "mag" | "phy" }
  details   Json?
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@unique([seanceId, pseudo])
  @@index([userId])
}

/// Une vidéo jointe au débrief : un lien externe, ou un fichier court stocké sur le volume vidéos (§10).
model SeanceVideo {
  id        String       @id @default(cuid())
  seanceId  String
  seance    SeanceGuilde @relation(fields: [seanceId], references: [id], onDelete: Cascade)
  etape     String?      // code de l'étape ("2.2") ; null = toute la séance
  moment    Int?         // secondes dans la vidéo, où sauter
  titre     String       // ≤ 120 : « Aggro ratée sur Kraavos »
  type      String       // "lien" | "fichier"
  source    String?      // "youtube" | "twitch" | "medal" | "discord" | "autre" (pour un lien)
  url       String?      // le lien d'origine, normalisé (pour un lien)
  fichier   String?      // "<id>.mp4" | "<id>.webm", sur le volume (pour un fichier)
  mime      String?      // "video/mp4" | "video/webm"
  taille    Int?         // octets
  statut    String       @default("pret") // "envoi" (fichier en cours d'envoi) | "pret"
  auteurId  String       // User.id
  auteur    String       // pseudo affiché
  createdAt DateTime     @default(now())

  @@index([seanceId])
  @@index([statut, createdAt])
}

/// LE PARAMÉTRAGE D'UN ÉVÉNEMENT (§9) : un document par événement ("cs", "gs"), lu par le site ET par le
/// bot. Versionné et signé : un rappel @everyone mal réglé part chez toute la guilde.
model ParametresEvenement {
  id        String   @id          // "cs" | "gs"
  data      Json
  version   Int      @default(0)
  parQui    String?
  updatedAt DateTime @updatedAt
}
```

`pseudo` est écrit tel qu'il s'affiche. On le dédoublonne en minuscules avant chaque écriture. `userId`
et `auteurId` sont de simples chaînes, sans relation, comme `ActionMembre.discordId` : le nom d'un joueur
parti reste ainsi lisible dans l'historique.

### 5.2 Pourquoi la répartition, le chrono et le débrief ne vont pas dans `CompositionState`

- `CompositionState("main")` est **renvoyé en entier** à chaque clic d'annonce, et relu par chaque client
  toutes les 15 s (`compositions/page.tsx:84`, `:91-104`). Y ranger la répartition ou le chrono donnerait
  à chaque annonce le pouvoir d'écraser un placement fait par le staff. Les trois garde-fous de
  `PUT /api/compositions` (`route.ts:28-83`) protègent les inscriptions, et rien d'autre.
- Le chrono s'écrit pendant que d'autres annoncent leur présence. Ces deux écritures doivent rester
  séparées.
- L'historique interroge les séances **par joueur** (participations, absences) : il faut des lignes, pas
  un blob.
- Le paramétrage doit porter une **version** et une **signature** (`parQui`), et le Guild Siege a le sien.
  D'où `ParametresEvenement`, plutôt qu'une ligne `CompositionState("chambres:config")` comme le proposait
  la révision 1.

### 5.3 Ce que `CompositionState` suffit à porter

| Donnée | Où | Pourquoi ça suffit |
|---|---|---|
| Inscriptions, annonces, retenus des **Chambres** | `CompositionState("main")`, **inchangé** | C'est déjà la source, lue par le site et par le bot |
| Interrupteur général des rappels | `Setting("cs_rappels_actifs")` et `Setting("gs_rappels_actifs")`, **inchangés** | La page `/discord` les pilote déjà (`discord/page.tsx:31-51`) |
| Tout le reste du paramétrage | `ParametresEvenement` (§9) | — |

**Un renfort facultatif au lot 2.** Dans `PUT /api/compositions`, toute annonce ou inscription
**nouvelle**, absente de l'état précédent, reçoit côté serveur `userId: a.user.id`. Ce champ est
facultatif, et il s'ajoute à `Presence` et à `Signup` dans `normaliserCompo`. Le bot le renseigne aussi.
Les entrées existantes restent sans `userId` et se résolvent par le nom du personnage.

**Un second champ, obligatoire pour le correctif du lot 3 (contre-examen) : `Signup.ts`.** Une
`Presence` a déjà son `ts` ; un `Signup` n'en a pas (`compositions.ts:29-37`). Sans lui, le correctif
`lu` du §5.4 ne peut pas savoir qu'une inscription a été posée après la lecture du client. La page
(`registerToSlot`) et le bot écrivent `ts: Date.now()` à la création ; `normaliserCompo` le garde
(nombre fini, sinon 0). Les inscriptions existantes valent 0.

### 5.4 Écrire sans écraser l'autre

**Une séance : `majSeance`.** Dans `src/lib/seances-serveur.ts`, le client Prisma est **passé en
paramètre** : le site donne `@/lib/prisma`, le bot `bot/lib/prisma`. On ne crée ainsi jamais de second
client. Ce module n'importe pas `server-only` (piège n° 7).

```ts
export async function majSeance(db: PrismaClient, ref: { cle, evenement, date, creneau, debut }, modifier: (s: SeanceEditable) => Resultat) {
  for (let essai = 0; essai < 3; essai++) {
    // Deux créations simultanées de la même séance (deux bots, ou un clic site + un clic Discord) :
    // Prisma lève P2002 sur la clé unique au lieu de fusionner. On relit, l'autre a créé la ligne.
    const s = await db.seanceGuilde.upsert({ where: { cle: ref.cle }, create: ref, update: {} })
      .catch((e) => { if (e?.code === "P2002") return null; throw e; });
    if (!s) continue;
    const copie = structuredClone(s);
    const res = modifier(copie);                    // fonctions pures du §4
    if (!res.ok) return res;                        // refus métier : rien n'est écrit
    const n = await db.seanceGuilde.updateMany({
      where: { id: s.id, version: s.version },
      data: { ...champsModifies(copie), version: { increment: 1 } },
    });
    if (n.count === 1) return res;                  // gagné
  }                                                 // perdu 3 fois : quelqu'un écrit en rafale
  return { ok: false, status: 409, message: "La séance vient d'être modifiée. Recharge et réessaie." };
}
```

**La composition : `modifierCompo`.** Dans `src/lib/compositions-serveur.ts`, elle sert au bot (« Je
viens », choix du poste) et, plus tard, à toute nouvelle route qui touche aux annonces :

```ts
export async function modifierCompo(db, fn: (e: CompoState) => Resultat): Promise<Resultat> {
  for (let essai = 0; essai < 3; essai++) {
    const row = await db.compositionState.findUnique({ where: { id: "main" } });
    const etat = normaliserCompo(row?.data);
    const res = fn(etat); if (!res.ok) return res;
    const propre = normaliserCompo(etat);                        // mêmes bornes que le PUT
    if (!row) { try { await db.compositionState.create({ data: { id: "main", data: propre } }); return res; } catch { continue; } }
    const n = await db.compositionState.updateMany({ where: { id: "main", updatedAt: row.updatedAt }, data: { data: propre } });
    if (n.count === 1) { await sauverPrecedent(db, row.data); return res; }   // même copie que le PUT (route.ts:85-94)
  }
  return { ok: false, status: 409, message: "La composition vient d'être modifiée. Réessaie." };
}
```

**Le correctif du `PUT /api/compositions` (lot 3).** Aujourd'hui, la page envoie l'état qu'elle a lu, au
plus 15 s plus tôt. Une annonce faite entre-temps, par le bot ou par un autre membre, est donc effacée
sans bruit. Le correctif tient en trois lignes :
1. `GET /api/compositions` renvoie en plus `lu: row.updatedAt.getTime()`. `normaliserCompo` l'ignore à la
   lecture, et la page le garde dans un `useRef`.
2. La page le renvoie dans le corps du PUT (`{ ...etat, lu }`).
3. Le serveur, si `avant.updatedAt > lu`, **ré-ajoute** les annonces de `precedent` absentes de `data`
   dont `ts > lu`, c'est-à-dire les annonces posées après la lecture du client. Il fait de même pour les
   **inscriptions** (`Signup.ts > lu`, §5.3) : la révision 2 ne protégeait que les annonces, et un poste
   choisi dans le menu Discord était effacé par le prochain clic d'un autre membre sur le site. Une
   inscription ré-ajoutée n'est pas ré-ajoutée si `data` contient déjà le même pseudo sur un poste (le
   client l'a déplacé entre-temps). Un retrait fait par un autre pendant ces 15 s peut, lui,
   réapparaître : c'est le moindre mal, et ce cas existe déjà entre deux membres.

---

## 6. API

Les gardes viennent de `src/lib/access.ts` : `apiAuth`, `apiGuild` et `apiRole(roles)`, avec
`ADMIN_ROLES` importé de `@/config/roles`. **`apiAdmin` n'existe pas.** Une route mixte appelle
`apiGuild`, puis `canAccessAdmin(a.user.role)` pour chaque geste réservé au staff. Aucune de ces routes
n'appelle `getCurrentUser` directement : les gardes le font. Toute réponse d'erreur a la forme `{ error:
string }`, avec le code HTTP indiqué. Le middleware ne couvre aucune route `/api` (`middleware.ts:59-67`),
et il ne doit pas commencer à le faire (piège n° 13).

Le paramètre `[cle]` suit la regex `^(cs_\d{4}-\d{2}-\d{2}_(mer|dim)|gs_\d{4}-\d{2}-\d{2}_[a-z]{3}\d{4})$`.
On peut aussi écrire **`cs_courante`** ou **`gs_courante`**, résolus par `seanceCouranteParis(now)`, et
**`cs_derniere`** ou **`gs_derniere`**, résolus par `derniereSeanceParis(now)` (§2.5) : ce sont eux que
la clôture (route 9) et l'onglet Bilans emploient par défaut. Pour une Chambre, le jour de la semaine
(heure de Paris) doit correspondre au créneau, sinon la route renvoie 400 « Ce jour n'est pas un
mercredi ». Pour le Guild Siege, l'id de créneau est **calculé**, jamais saisi : les trois premières
lettres du jour suivies de l'heure (`sam2100`), ce qui garantit la forme `[a-z]{3}\d{4}`.

| # | Méthode et route | Garde | Corps | Réponse |
|---|---|---|---|---|
| 1 | `GET /api/evenements/parametres?evenement=cs\|gs` | `apiRole(ADMIN_ROLES)` | — | `{ evenement, data, defauts, version, parQui, modifieLe, salons: GuildChannel[] }` (salons texte, annonce et forum, pour les menus) |
| 2 | `PUT /api/evenements/parametres` | `apiRole(ADMIN_ROLES)` | `{ evenement, data, version }` | `{ data, version }` normalisés. 409 si `version` a changé entre-temps ; 400 `{ error, details: string[] }` si la validation échoue (§9.3) |
| 3 | `POST /api/evenements/parametres/essai` | `apiRole(ADMIN_ROLES)` | `{ evenement, message: idDeRappel \| "recap" \| "debrief" \| "panneau" }` | 202 `{ commande: id }`. Crée **côté serveur** un `BotCommand` `evenement_essai` (§8.7) |
| 4 | `GET /api/seances/[cle]` | `apiGuild` | — (`?partie=chrono` renvoie une réponse allégée, pour le rafraîchissement) | `VueSeance` (ci-dessous) |
| 5 | `POST /api/seances/[cle]/repartition` | `apiGuild`, puis staff selon l'action | `ActionRepartition` | `{ ok, message, vue: VueSeance["repartition"] }`. 400 pour une séance GS. 403 pour un geste du staff tenté par un membre, ou pour le perso d'un autre. 409 si la séance est clôturée, ou en conflit |
| 6 | `POST /api/seances/[cle]/chrono` | `apiRole(ADMIN_ROLES)` | `{ action: "suivante"\|"annuler"\|"arreter"\|"reinitialiser", vu: number }` | `{ chrono, etapes, maintenant }`. 409 si `vu !== fins.length` |
| 7 | `PUT /api/seances/[cle]/debrief` | `apiRole(ADMIN_ROLES)` | Patch partiel : `{ etapes?: { [code]: { statut?, chrono?: string /* lu par lireDuree */, remarque? } }, resultat?: "gagne"\|"perdu"\|null, aRetenir?: string }` | `{ debrief, resume, analyse }`. 400 « Chrono illisible : écris par exemple 2:34 ou 45s » (`bot.py:2035-2037`) |
| 8 | `POST /api/seances/[cle]/debrief/publier` | `apiRole(ADMIN_ROLES)` | — | 202 `{ commande: id, manquants: string[] }`. Crée **côté serveur** un `BotCommand` `seance_debrief` (§8.6) |
| 9 | `POST /api/seances/[cle]/cloture` | `apiRole(ADMIN_ROLES)` | `{ presents: string[] /* pseudos */, ajoutes?: string[] }` ou `{ rouvrir: true }` | `{ presents: n, absents: m }`. Écrit les `SeanceParticipant` (§4.8) et met en file `seance_fermer`. La page l'appelle sur `cs_derniere`, jamais sur `cs_courante` (§2.5). 409 sur une séance qui n'a pas encore commencé |
| 10 | `POST /api/seances/[cle]/annuler` | `apiRole(ADMIN_ROLES)` | `{ annulee: boolean, motif?: string /* ≤ 200 */ }` | `{ annulee }`. Si le paramétrage le prévoit, met en file `seance_annulation` (§8.3, M8) |
| 11 | `POST /api/seances/[cle]/discord` | `apiRole(ADMIN_ROLES)` | `{ quoi: "panneau"\|"chrono"\|"recap" }` | 202 `{ commande: id }`. Met en file `seance_publier` : publier ou republier ce message tout de suite |
| 12 | `POST /api/seances/[cle]/inscription` | `apiGuild` | GS seulement : `{ pseudo: string, viens: boolean }` | `{ annonces: n }`. 403 si le perso n'est pas à l'appelant. 409 après la clôture |
| 13 | `GET /api/seances/historique?evenement=cs\|gs&limite=30` | `apiGuild` | `limite` vaut 100 au plus | `{ seances: [{ cle, date, creneau, resultat, total, presents, publie, videos }], bilan: { victoires, defaites }, participations: [...] }`. Le staff reçoit toutes les lignes, un membre la sienne seulement (§4.8) |
| 14 | `GET /api/seances/[cle]/debrief/image` | `apiRole(ADMIN_ROLES)` | — | `image/png` : l'aperçu exact de ce que le bot publiera (lot 7) |
| 15 | `POST /api/seances/[cle]/videos` | `apiGuild`, puis les règles du §10.3 | `{ type: "lien"\|"fichier", url?, etape?, moment?: string /* "1:35" */, titre, taille?, mime? }` | Lien : `SeanceVideo`. Fichier : `{ id, envoi: "/api/videos/{id}/fichier", max: 104857600 }`, avec la ligne en `statut: "envoi"` |
| 16 | `PUT /api/videos/[id]/fichier` | `apiGuild`, **auteur** de la ligne seulement | Corps **brut** (pas de multipart), `Content-Type: video/mp4\|video/webm`, `Content-Length` obligatoire | 200 `SeanceVideo` (`statut: "pret"`). 413 au-delà de 100 Mo ; 415 pour un mauvais type ; 409 si la ligne n'est plus en `envoi` |
| 17 | `GET /api/videos/[id]/fichier` | `apiGuild`, plus la règle de visibilité (§10.3) | En-tête `Range` accepté | 200 ou **206** (`Accept-Ranges: bytes`, `Content-Range`), flux du fichier |
| 18 | `PATCH /api/videos/[id]` | `apiGuild` : l'auteur ou le staff | `{ titre?, etape?, moment? }` | `SeanceVideo` |
| 19 | `DELETE /api/videos/[id]` | `apiGuild` : l'auteur ou le staff | — | 204. Efface la ligne **et** le fichier |
| 20 | `GET /api/recensement` | `apiGuild` | `?vue=resume` pour les totaux par classe (§12.4) | §12.2 |
| 21 | `GET /api/compositions/comparatif` *(existante, étendue au lot 1)* | inchangée (`apiAuth` + `canAccessGuild`) | — | Ajout de `mesures: { [pseudoMinuscule]: { tank?, offtank?, dps?: Chiffre } }` (§12.3) |
| 22 | `GET` et `PUT /api/compositions` *(existante, correctif du lot 3)* | inchangée | `lu` en plus | §5.4 |
| 23 | `POST /api/admin/settings` *(existante)* | inchangée | `cs_rappels_actifs`, `gs_rappels_actifs` | Inchangée : ce sont les interrupteurs généraux |

**Les types de `BotCommand` ajoutés** : `evenement_essai`, `seance_publier`, `seance_fermer`,
`seance_annulation` et `seance_debrief`. Ils sont tous créés **par les routes elles-mêmes**, côté
serveur. **On ne les ajoute pas** à la liste `ALLOWED` de `/api/admin/bot-command` (`route.ts:6`) :
personne ne peut ainsi fabriquer une commande avec une charge arbitraire en passant par la route générique.
Deux règles de plus (contre-examen) :
- **Aucune de ces charges ne porte de salon ni de texte** : seulement `seanceId`, `evenement`, et un mot
  d'une liste fermée (`quoi`, `message`). Le bot relit le salon dans le paramétrage et le contenu en
  base. `processBotCommands` exécute tout type qu'il connaît, quelle que soit la route qui l'a écrit :
  une charge qui porterait un `channelId` rouvrirait, par la base, la porte fermée côté route.
- **La page `/discord`** liste les 20 dernières commandes et n'a de libellé que pour les trois types
  existants (`TYPE_LABEL`, `discord/page.tsx:12`) : on y ajoute les cinq nouveaux (« Panneau CS »,
  « Débrief », « Essai »…), sinon le suivi affiche `seance_publier` en clair.

**`VueSeance`**, ce que voient tous les membres. On n'y met jamais de `discordId` ni de blob de build.

```ts
type Participant = {
  pseudo: string; classe: string; player: string; moi: boolean;
  slotId: string | null; poste: string | null;               // libellé du poste (slotMeta compris)
  roles: { jumeaux: "tank"|"dps"; golems: "tank"|"dps"; araignee: "tank"|"dps" };
  type: "mag" | "phy" | null;
  chiffre: Chiffre | null;                                    // §4.2
};
type VueSeance = {
  cle: string; evenement: "cs"|"gs"; date: string; creneau: string; label: string; // « mercredi 22 octobre · 21 h »
  annulee: boolean; cloturee: boolean; maintenant: number;          // heure du serveur, pour le chrono
  source: "retenus" | "annonces";
  participants: Participant[];
  repartition: {                                                     // CS seulement
    salles: { cle: string; label: string; pseudo: string | null }[];
    jumeaux: Record<"vert"|"rouge", { tank: string[]; mag: string[]; phy: string[]; totalDps: number; pvTank: number; manque: string[] }>;
    ecartJumeaux: number | null;                                     // % (§4.4)
    nonPlaces: string[];
    demandes: { id: string; de: string; a: string; texte: string; pourMoi: boolean }[]; // lot 10
  } | null;
  recap: Recap | null;                                               // §4.6
  etapes: Etape[];                                                   // figées, sinon celles du paramétrage
  phases: Record<string, string>;
  chrono: { debut: number|null; fins: number[]; par: string; fini: boolean } | null;
  debrief: DebriefVue | null;      // staff : toujours ; membre : seulement après publication
  analyse: Analyse | null;
  videos: VueVideo[];              // filtrées par la règle de visibilité (§10.3)
  publication: { statut: "aucune"|"en_file"|"faite"|"echec"; lien: string|null; erreur: string|null };
                                   // `erreur` (texte brut renvoyé par Discord) : staff seulement, null pour un membre
  discord: { panneau: string|null; chrono: string|null; recap: string|null };   // jump URLs (staff seulement)
};
```

La `publication` se lit dans le dernier `BotCommand` de type `seance_debrief` dont `payload.seanceId ===
seance.id` : `where: { type: "seance_debrief", payload: { path: ["seanceId"], equals: id } }`.

**`ActionRepartition`** (route 5). `pseudo` peut manquer : il désigne alors **le** participant du compte
appelant. Un pseudo qui n'appartient pas au compte appelant (`Character.userId !== a.user.id`) exige le
staff.

| `action` | Champs | Qui | Règle |
|---|---|---|---|
| `salle` | `salle`, `pseudo?` | soi ; le staff pour tout le monde | `basculerSalle` (§4.3). Pour le staff, `parStaff = true` |
| `liberer` | `salle` | l'occupant ou le staff | `bot.py:998-1000` |
| `auto` | — | staff | `remplirAuto` |
| `jumeau` | `place`, `pseudo?` | soi : `choisirJumeau` ; staff : `placerJumeauStaff` | §4.4 |
| `jumeau_retirer` | `pseudo` | soi ou staff | `bot.py:1033-1035` |
| `jumeau_echanger` | `pseudo`, `avec` | staff | `bot.py:1036-1050` |
| `equilibrer` | — | staff | lot 10 (§4.4) |
| `demander` | `quoi` (`salle:s3` ou `jumeau`), `avec` | soi | lot 10 (§4.5) |
| `repondre` | `demande`, `accepter: boolean` | le joueur visé ou le staff | lot 10 (§4.5) |

---

## 7. Pages

### 7.1 Les onglets de `/compositions`

Aujourd'hui, la page a trois onglets : Chambre Secrète, Stratégie et Guild Siege (`page.tsx:23`,
`:245-247`). Demain :

```
[ Inscription ] [ Répartition ] [ Chrono ] [ Bilans ] [ Stratégie ] [ Guild Siege ]     (staff) [⚙ Paramétrer]
   key            grid            clock      trophy     book          sword
```

- **Inscription**, c'est l'onglet actuel « Chambre Secrète », renommé : il ne fait plus que ça.
  **Bilans** réunit les débriefs, l'historique et les vidéos : ce sont trois vues des mêmes séances passées,
  et huit onglets ne tiendraient pas sur un téléphone.
- L'onglet ouvert se lit dans l'URL : `?onglet=inscription|repartition|chrono|bilans|strategie|gvg`.
  Les messages du bot mènent ainsi au bon endroit (`?onglet=repartition`,
  `?onglet=bilans&seance=cs_2026-10-22_mer`). L'ancien état `"cs" | "strat" | "gvg"` correspond à
  `inscription`, `strategie` et `gvg`.
- Répartition, Chrono et Bilans lisent leurs données sur leurs propres routes (§6), et n'appellent
  **jamais** `sauver()`, qui renvoie tout `CompositionState`.
- La page calcule `isAdmin` avec une copie en dur d'`ADMIN_ROLES` (`page.tsx:14`). Les nouveaux onglets
  importent la liste de `@/config/roles`.
- **⚙ Paramétrer** (staff) mène à `/discord/evenements` (§9.4).

### 7.2 Inscription (l'existant, avec les chiffres et Discord)

Pour les joueurs : **à côté de chaque nom**, sur un poste ou parmi les « Annoncés », apparaît son chiffre
pour **ce** poste. Sur un poste de tank, ce sont des PV, et sinon des dégâts. Un témoin « à remesurer » ou
« sans mesure » complète l'affichage. Une annonce faite sur Discord apparaît ici comme les autres.

```
+--------------------------------------------------------------+
| [logo] Primat — Tank croix                          [edit][eye]|
|        Croix puis boss final (tank/dps)                         |
| ANNONCES EN PRIMAT — clique pour retenir                        |
|  (*Brann  9,4 M PV)  (Ysolde  6,1 M PV  [horloge])               |
| ---------------------------------------------------------------|
|  * Brann · Maxime        9,4 M PV     94%   [ok]      [*][x]    |
|  . Ysolde · Lina         6,1 M PV  a remesurer  pas annonce     |
|  . Orin · Tom            sans mesure                             |
| - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |
|                     [+ Kaelis]                                   |
+--------------------------------------------------------------+
| (staff) Panneau Discord : publie hier a 20:00 [voir] [Republier]  |
+--------------------------------------------------------------+
```

- Le chiffre est le `texte` de `choisirStuff(stuffs, slot.cs.mesure)` (§4.2). Le survol donne le détail :
  « Bulle 45 k · 182 k/s · mesuré le 12/10 · poudres : Orange, Rose · avec perles, consommables ».
- « à remesurer » : petite pastille or, avec l'icône `clock`. « sans mesure » : en gris, avec le lien
  « Mettre à jour dans l'AirBuilder » si c'est mon personnage.
- **Le tri** des candidats d'un poste ne change pas : l'écart au build de référence d'abord
  (`page.tsx:349-352`). Le chiffre est une information, pas un ordre.
- **Pour le staff**, une ligne dit où en est le panneau Discord (`VueSeance.discord.panneau`), avec un
  bouton « Republier » (route 11).

### 7.3 Répartition

```
+------------------------------------------------------------------------------------+
| REPARTITION — mercredi 22 octobre · 21 h        10 retenus · Seance ouverte         |
| (staff) [Completer les salles] [Equilibrer les jumeaux] [Annuler la seance] [Cloturer]|
+------------------------------------------------------------------------------------+
| MES POSITIONS — Kaelis (Arcaniste) · Salles 3 et 4 · Jumeaux ROUGE — DPS magique    |
|   1 demande pour toi : Thorn voudrait reprendre ta Salle 4   [Accepter] [Refuser]    |
+------------------------------------------------------------------------------------+
| PHASE 1 — LES 12 ASURAS                                          11/12 couvertes    |
|  [Salle 1  Brann ] [Salle 2  Thorn ] [Salle 3  Kaelis] [Salle 4  Kaelis]           |
|  [Salle 5  Mira  ] [Salle 6  !personne] [Salle 7  Orin] [Salle 8  Lina ]           |
|  [Salle 9  Ysolde] [Salle 10 Pyra  ] [Asura 11 (arbre) Sol] [Asura 12 (arbre) Sol] |
|  (clic = prendre / liberer · staff : menu « placer… »)                              |
+------------------------------------------------------------------------------------+
| PHASE 2 — JUMEAUX (Kraavus & Kraavos) — morts a 4 s d'ecart au plus                 |
|  VERTE                                   | ROUGE                                    |
|  Tank  Brann (Primat)      9,4 M PV       | Tank  Ysolde (Primat)     6,1 M PV       |
|  Mag   Mira (Arcaniste)    190 k/s        | Mag   Kaelis (Arcaniste)  182 k/s        |
|  Phy   Thorn (Templier)    160 k/s        | Phy   Orin (Spadassin)    170 k/s        |
|  Phy   Lina (Sylphide)     150 k/s        | Phy   Sol (Arbaletrier)   175 k/s        |
|  Phy   Pyra (Chanoine)     140 k/s        | — il manque 1 DPS                        |
|  DPS 640 k/s · PV tank 9,4 M             | DPS 527 k/s · PV tank 6,1 M               |
|  Ecart entre les equipes : 18 %  (or)                                                |
|  Pas encore places : Nox                                                             |
+------------------------------------------------------------------------------------+
| PHASE 3 — GOLEMS (calcule)               | ARAIGNEE — ROTATIONS DE DEBUFF           |
|  Gauche : Brann (tank), Mira, Thorn, …   |  Rotation 1 : Mira, Thorn, Lina, …        |
|  2 Arcaniste · 1 Primat tank · …         |  Rotation 2 : Kaelis, Orin, …             |
|  Droite : Ysolde (tank), Kaelis, …       |  Remplacants : Nox (Arcaniste)            |
+------------------------------------------------------------------------------------+
| LE RECAP, TEL QU'IL PARTIRA SUR DISCORD A 20 H 40                [Replier]          |
|  …                                                                                   |
+------------------------------------------------------------------------------------+
```

- **Un membre** ne voit les boutons « prendre » que pour **son** participant. S'il n'est ni retenu ni
  annoncé, une ligne l'invite à s'annoncer et le renvoie à l'onglet Inscription.
- **Le staff** dispose d'un menu « Placer… » sur chaque salle et sur chaque place de jumeau (un
  participant, ou « Libérer »), et du menu « Échanger avec… » en Phase 2.
- Les golems et l'araignée sont **calculés**, pas modifiables : ils découlent de la Phase 2 (§4.6).
- **Le rafraîchissement** se fait toutes les 15 s, comme la page actuelle (`page.tsx:84`), et après chaque
  action, à partir de la réponse de la route. Il s'arrête quand l'onglet du navigateur est caché
  (`document.visibilityState`).
- **Sur téléphone**, la grille des salles passe à deux colonnes, et Verte et Rouge s'empilent.

### 7.4 Chrono

```
+--------------------------------------------------------------------+
| CHRONO — mercredi 22 octobre        Depart a 21:04:12 · chrono : Maxime |
|                                                                        |
|                    0:17:42                                             |
|              en cours : 2.2 Jumeaux — Kraavus & Kraavos · 3:08         |
|                                                                        |
|  (staff) [  FIN : 2.2 JUMEAUX  ]   [Annuler le dernier clic] [Arreter] |
+--------------------------------------------------------------------+
| PHASE 1 — LES SALLES                                                   |
|  ok  1.1  480 monstres ................................ 6:12           |
|  ok  1.2  12 Asuras ................................... 4:40           |
|  ok  1.3  3 Malphas ................................... 3:42           |
| PHASE 2 — LE COULOIR                                                   |
|  ok  2.1  100 soldats ................................. 2:58           |
|  >>  2.2  Jumeaux — Kraavus & Kraavos ...... en cours 3:08             |
| PHASE 3 — L'ARAIGNEE                                                   |
|  ..  3.1  100 araignees                                                |
|  …                                                                     |
+--------------------------------------------------------------------+
| Mis a jour il y a 3 s · aussi dans Discord [voir le message]           |
+--------------------------------------------------------------------+
```

- **Comment les membres le voient avancer** : un simple rafraîchissement périodique, sans websocket.
  - Pendant que le chrono tourne (`debut && !fini`), la page appelle `GET /api/seances/cs_courante?partie=chrono`
    toutes les **5 s**.
  - Sinon, toutes les **30 s**.
  - Jamais quand l'onglet du navigateur est caché, et une lecture immédiate quand il redevient visible.
- **Le temps qui défile** se calcule chez le client chaque seconde, avec un `setInterval(…, 1000)` (et non
  un `requestAnimationFrame` seul, cf. la note sur la refonte du front). La formule est `(Date.now() +
  decalage) − (fins.at(-1) ?? debut)`, avec `decalage = maintenant_serveur − Date.now()`, mesuré à chaque
  réponse. Une horloge de téléphone en avance ne fausse donc pas l'affichage.
- **Pour le chronométreur**, le bouton principal fait toute la largeur sur téléphone, avec au moins 64 px
  de haut. Sur ordinateur, Espace ou Entrée vaut « suivante ». Chaque clic part avec `vu` (§4.9). Pendant
  l'envoi, le bouton est désactivé. En cas de 409, le client relit l'état et affiche « Un autre membre du
  staff vient de valider cette étape. »
- **Hors séance**, l'onglet montre le dernier chrono terminé avec son total, et un sélecteur de séance.

### 7.5 Bilans (débriefs, historique et vidéos)

```
+------------------------------------------------------------------------------------+
| BILANS   [Chambres] [Guild Siege]      12 victoires · 3 defaites (selon les debriefs)|
|  Date              Resultat   Temps    Ecart     Presents   Videos  Debrief          |
|  mer. 22 oct.      GAGNE      42:17    -1:23     10         2       publie [Discord] |
|  dim. 19 oct.      GAGNE      43:40    +0:51     9          0       publie           |
|  mer. 15 oct.      PERDU      —        —         10         1       brouillon (staff)|
+------------------------------------------------------------------------------------+
| MES PARTICIPATIONS (membre) : 9 seances sur 12 · inscrit mais absent : 15/10        |
| PARTICIPATIONS (staff) : 1. Maxime 12 · 2. Lina 11 · …  [voir les absences]          |
+------------------------------------------------------------------------------------+
```

Un clic sur une séance ouvre son débrief. **Ce que lit un membre**, une fois le débrief publié :

```
+------------------------------------------------------------------------------------+
| RETOUR — mercredi 22 octobre                     GAGNE    Temps total 42:17 (-1:23)|
| Nouveau record de temps total !                                                     |
| ANALYSE : etape la plus longue 2.2 Jumeaux — 6:12 (15 %) · mal deux fois : 3.4       |
| A RETENIR : …                                                                        |
|  1.1  480 monstres        [Bien]   6:12   -0:20   « bonne entree »                    |
|  2.2  Jumeaux             [Mal]    6:12   +1:02   « Kraavos mort 9 s apres »          |
|       [video] Aggro ratee sur Kraavos — par Lina — a 1:35   [Lire]                    |
|       [video] Vue du tank — par Brann — a 0:48 (YouTube)     [Lire]                    |
|  …                                                                                   |
|  [Joindre une video]                                  [Voir sur Discord]             |
+------------------------------------------------------------------------------------+
```

**Ce que fait le staff** : le même écran, avec un mode « parcours » d'une étape à la fois.

```
+------------------------------------------------------------------------------------+
| DEBRIEF — mercredi 22 octobre    Resultat : [Gagne] [Perdu]      Etape 5/13          |
|   2.2 Jumeaux — Kraavus & Kraavos (Phase 2 — Le couloir)                             |
|   Chrono [ 6:12 ] (mesure : 6:12)        Remarque [_____________________] 0/300      |
|   [  Bien  ] [  Moyen  ] [  Mal  ]   <- note et passe a la suivante                   |
|   [< Precedente]  [Suivante >]     Videos de l'etape : 2  [+ Joindre]                 |
|  -----------------------------------------------------------------------------------|
|   ok 1.1 … 6:12   ok 1.2 … 4:40   ok 1.3 … 3:42   ok 2.1 … 2:58   >> 2.2 … 6:12  …   |
|  A retenir [______________________________________________] 0/1000                  |
|  Etapes sans statut : 3.2, 4.1            [Apercu de l'image] [Publier sur Discord]  |
|  Publication : en file… / publie le 22/10 a 22:31 [lien] / echec : <raison>          |
+------------------------------------------------------------------------------------+
```

- Une note s'enregistre au clic, une remarque à la sortie du champ. Il n'y a pas de bouton
  « Enregistrer ».
- La clôture (§4.8) est proposée **ici** et dans l'onglet Répartition, tant que la séance n'est pas
  clôturée.
- L'éditeur d'étapes est dans le paramétrage (§9.4). Le lien « Modifier les étapes » y mène, et prévient :
  « les séances déjà chronométrées gardent leur liste ».
- Le formulaire et le lecteur des vidéos sont décrits au §10.4.

### 7.6 Guild Siege

Voir le §11.3 : l'onglet remplace l'encart « En standby » (`page.tsx:466-481`) **seulement** quand le
paramétrage GS est actif. Sinon, l'encart actuel reste.

### 7.7 La page `/recensement`

Le fichier est `src/app/(guild)/recensement/page.tsx`. Le gabarit `(guild)/layout.tsx` applique
`requireGuild()` : **un visiteur ou un candidat est renvoyé à la connexion**. On ajoute aussi
`/recensement` à `GUILD_PREFIXES` et au `matcher` de `middleware.ts:31`, `:59-67`, pour l'aligner sur ses
voisines. Le détail de la page est au §12.

**Sa déclaration dans `nav.ts`** se fait dans le même mouvement que la création de la page. C'est la règle
de Maxime : une page absente de `nav.ts` n'existe pour personne. D'autres agents modifient `nav.ts` en ce
moment : l'intégrateur du lot 1 pose la ligne une fois leur travail fusionné.

```ts
// espace « Guilde », juste après « Chambres Secrètes » (nav.ts:221)
{ label: "Recensement", href: "/recensement", icon: "gauge", desc: "Les chiffres de chacun, stuff par stuff.", acces: "guild" },
```

L'icône `gauge` existe (`src/lib/vg-icon-paths.ts`) et n'est prise par aucun voisin (`castle`, `dragon`,
`moon`, `book`, `target`, `home` ; `cart` est parti avec la Boutique). Le lien depuis la rubrique
**Suivi** de `/staff` est au §12.4. Les numéros de ligne de `nav.ts` cités ici sont ceux de l'arbre de
travail du 2026-10-21, que d'autres agents modifient : l'intégrateur cherche le libellé, pas la ligne.

**La seconde page neuve, `/discord/evenements` (§9.4), doit être déclarée elle aussi** (contre-examen :
la révision 2 l'oubliait, et c'est exactement la page « écrite et injoignable » que la règle de Maxime
veut éviter ; sans entrée, `accesDe` ne lui connaît aucun niveau). Elle va dans l'espace **Bras droits**,
rubrique Outils, hors de la barre, au lot 2 :

```ts
// espace « Bras droits », juste après « Bot Discord »
{ label: "Paramétrage des événements", href: "/discord/evenements", icon: "settings", desc: "Salons, rappels, textes et étapes des Chambres et du Guild Siege.", groupe: "Outils", barre: false },
```

`settings` n'est pris par aucun voisin (`users`, `user-plus`, `discord`, `calendar`, `dragon`,
`megaphone`). L'entrée hérite de `acces: "admin"` de l'espace.

---

## 8. Le bot

### 8.1 L'architecture : un tick, des messages vivants, des boutons sans état

Le nouveau code vit dans `bot/lib/seances.ts` (messages, boutons, rappels) et `bot/commands/chambre.ts`
et `recensement.ts` (commandes slash). Toutes les règles viennent des modules purs du §4 : le bot ne
réimplémente rien.

- **Un tick par minute**, `tickSeances(client)`, remplace les tâches `cron` fixes des Chambres et du
  Guild Siege (`scheduler.ts:227-240`). Il lit l'heure de Paris et le paramétrage, et envoie ce qui est
  dû (§8.5). C'est le modèle de `tickEvents` (`scheduler.ts:148-164`), qui lit déjà ses événements en base
  pour qu'on les modifie sans redémarrer le bot.
- **Des messages vivants.** Le panneau d'inscription, le chrono et le récap sont **modifiés en place**
  quand l'état change, que le changement vienne du site ou de Discord. La boucle `synchroniserMessages`
  tourne toutes les **15 s**, sur les séances `cs_courante` et `gs_courante`. Elle recalcule l'embed de
  chaque message enregistré dans `SeanceGuilde.messages` et ne le modifie que s'il a changé. C'est
  `editer_si_change` (`bot.py:405-417`), avec la même raison : éviter les limites de débit de Discord.
  Pendant un chrono en cours, sa période tombe à **10 s** pour le seul message du chrono.
- **Des boutons sans état.** Chaque bouton porte dans son `custom_id` tout ce qu'il faut : `cs:viens:<cle>`,
  `cs:absent:<cle>`, `cs:pos:<cle>`, `cs:chrono:<action>:<cle>:<vu>`, `gs:viens:<cle>`, etc. (100 caractères
  au plus). Le traitement relit tout en base. Un redémarrage du bot ne casse donc aucun bouton, et le
  problème des menus expirés du modèle (`bot.py:100-112`) n'existe pas chez nous.
- **Le branchement** dans `bot/index.ts` :
  - dans la branche des boutons (`index.ts:55-69`), ajouter `else if (id.startsWith("cs:") ||
    id.startsWith("gs:")) await gererBoutonSeance(interaction)` ;
  - ajouter une branche `interaction.isStringSelectMenu()`, **qui n'existe pas aujourd'hui**, pour les
    menus « quel perso » et « quel poste » (`cs:choix:<cle>`, `cs:poste:<cle>:<pseudo>`) ;
  - déclarer les commandes `chambre` et `recensement` dans `bot/commands/index.ts`, puis relancer
    `bot/deploy-commands.ts` (piège n° 18).
- **La garde de chaque geste** est celle du §2.6 : `User` retrouvé par `discordId`, `canAccessGuild` pour
  tout ce qui lit ou écrit des données de membres, `isStaff` pour les gestes du staff. Rien ne se décide
  sur le seul fait d'avoir pu cliquer : un bouton est visible de tous ceux qui voient le salon.

### 8.2 La table émoji → sens, et les couleurs

**Règle.** Un émoji veut dire **une seule chose**, dans tous les messages. On ne met d'émoji que devant
une information qui en a une, jamais par décoration. Les classes s'affichent toujours avec l'émoji
personnalisé du serveur (§2.1), noté `<Classe>` dans les exemples.

| Émoji | Point de code | Sens, partout | Où on le voit |
|---|---|---|---|
| 🏰 | U+1F3F0 | Chambre Secrète (titre) | panneau, rappels |
| 🏯 | U+1F3EF | Guild Siege (titre) | messages du GS |
| 📋 | U+1F4CB | Récap de la soirée | récap 20 h 40 |
| ⏱️ | U+23F1 U+FE0F | Chrono | message du chrono |
| 📝 | U+1F4DD | Débrief | débrief publié |
| 📅 | U+1F4C5 | Date | annulation, historique |
| 🕘 | U+1F558 | Heure du rendez-vous (21 h) | rappels |
| ⏰ | U+23F0 | Rappel : « dans 1 h », « ce soir » | titres des rappels |
| 👥 | U+1F465 | Effectif (annoncés / places) | panneau, rappels |
| ✅ | U+2705 | Oui : annoncé, retenu, fait, au complet. Bouton « Je viens » | partout |
| ❌ | U+274C | Non : pas cette fois, absent. Bouton « Pas cette fois » | panneau, réponses |
| ⚠️ | U+26A0 U+FE0F | Ce qui manque, ou ce qui demande attention | panneau, rappels, récap |
| ⛔ | U+26D4 | Pas autorisé (déjà employé par le bot, `index.ts:76`) | réponses éphémères |
| 🚫 | U+1F6AB | Séance annulée | annulation |
| 🙋 | U+1F64B | Annoncé sans poste | panneau |
| 🛡️ | U+1F6E1 U+FE0F | Tank | panneau, récap, positions |
| 🔮 | U+1F52E | DPS magique | panneau, récap |
| ⚔️ | U+2694 U+FE0F | DPS physique | panneau, récap |
| ❤️ | U+2764 U+FE0F | PV (chiffre d'un tank) | panneau, récap, recensement |
| 💥 | U+1F4A5 | Dégâts par seconde (chiffre d'un DPS) | panneau, récap, recensement |
| 📏 | U+1F4CF | Mesure de plus de 30 jours : à remesurer | panneau, recensement |
| ❔ | U+2754 | Sans mesure | panneau, recensement |
| 🌳 | U+1F333 | Phase 1 : les Asuras (salles) — aussi l'étape 1.2 | récap, positions |
| 👯 | U+1F46F | Phase 2 : les Jumeaux — aussi l'étape 2.2 | récap, positions |
| 🟩 | U+1F7E9 | Équipe Verte | récap, positions |
| 🟥 | U+1F7E5 | Équipe Rouge | récap, positions |
| 🗿 | U+1F5FF | Phase 3 : les golems (Dra'Zhul) — aussi les étapes 3.2 et 3.3 | récap, positions |
| ⬅️ ➡️ | U+2B05, U+27A1 (+FE0F) | Golem de gauche, de droite | récap, positions |
| 🕷️ | U+1F577 U+FE0F | L'araignée (Nyzzara) et ses rotations — aussi l'étape 3.4 | récap, positions |
| 1️⃣ 2️⃣ | U+0031/0032 U+FE0F U+20E3 | Rotation 1, rotation 2 | récap, positions |
| 🔁 | U+1F501 | Remplaçant (debuff) | récap |
| 🔄 | U+1F504 | Demande d'échange de place entre joueurs (ajouté au lot 10 ; le modèle l'employait déjà, `bot.py:1302`) | message privé de la demande, 🔄 Échanges, 📍 Mes positions |
| 📍 | U+1F4CD | Mes positions (bouton et réponse) | panneau, rappels |
| 🌐 | U+1F310 | Ouvrir sur le site (boutons lien) | partout |
| ▶️ | U+25B6 U+FE0F | Démarrer · étape en cours | chrono |
| ⏭️ | U+23ED U+FE0F | Fin de l'étape en cours | chrono |
| ↩️ | U+21A9 U+FE0F | Annuler le dernier clic | chrono |
| ⏹️ | U+23F9 U+FE0F | Arrêter | chrono |
| ▫️ | U+25AB U+FE0F | Pas encore fait, ou personne | chrono, panneau |
| 🏁 | U+1F3C1 | Chrono terminé | chrono |
| 🟢 🟠 🔴 ⚪ | U+1F7E2, U+1F7E0, U+1F534, U+26AA | Statut d'une étape : bien, moyen, mal, pas noté | débrief |
| ⚡ | U+26A1 | Plus rapide que la dernière fois | débrief |
| 🐌 | U+1F40C | Plus lent que la dernière fois | débrief |
| 🟰 | U+1F7F0 | Même temps | débrief |
| ⌛ | U+231B | Étape la plus longue | débrief |
| 🎯 | U+1F3AF | À retravailler (mal deux fois de suite) | débrief |
| 📌 | U+1F4CC | À retenir | débrief |
| 🏆 | U+1F3C6 | Gagné | débrief, historique |
| 💀 | U+1F480 | Perdu | débrief, historique |
| 🥇 | U+1F947 | Nouveau record | débrief |
| 🔎 | U+1F50E | Analyse | débrief |
| 🎬 | U+1F3AC | Vidéo jointe | débrief |
| 📜 | U+1F4DC | Historique, participations | `/chambre historique` |
| 📊 | U+1F4CA | Recensement : les chiffres de chacun (titre) | `/recensement` |
| 🔗 | U+1F517 | Compte Discord à lier au site | réponses éphémères |
| 🧙 | U+1F9D9 | Personnage à créer (déjà employé par `/mesperso`) | réponses éphémères |
| 🧪 | U+1F9EA | Message d'essai du paramétrage | salon des essais |

**Les émojis des étapes** (🧟 👹 💂 🕸️ 🪜 👺 🐉, §3.2) ne servent qu'aux étapes, dans le chrono et le
débrief. 🌳, 👯, 🗿 et 🕷️ désignent le même adversaire comme étape et comme phase : c'est la même
information.

**Les couleurs des embeds** (la barre latérale) :

| Couleur | Valeur | Sens |
|---|---|---|
| Crimson | `0xA6192E` | Chambre Secrète, état normal |
| Or | `0xC69A55` | Il manque du monde · chrono en cours |
| Vert | `0x2F8F5B` | Au complet · chrono terminé · gagné |
| Anthracite | `0x2A2A33` | Séance terminée ou annulée |
| Or clair | `0xE6C48A` | Guild Siege, état normal |

Le pied de page devient « GENESIS · Chambres Secrètes » ou « GENESIS · Guild Siege », et remplace
« Vanguard · … » (`scheduler.ts:85`). L'horodatage de l'embed montre la dernière mise à jour.

### 8.3 Les messages, un par un

**Conventions des exemples.** `┃` marque la barre de l'embed, `[ … ]` un bouton, `<Primat>` l'émoji
personnalisé de la classe et `{…}` une variable. Le texte en *italique* de la colonne « Modifiable » est
la phrase d'ouverture que le staff peut réécrire dans le paramétrage (§9). Tout le reste se calcule.

**Les variables des textes modifiables** : `{date}` (« mercredi 22 octobre »), `{heure}` (« 21 h »),
`{annonces}` (« 7 »), `{retenus}` (« 5 »), `{places}` (« 10 »), `{manque}` (« 1 Envoûteur et
2 Arcanistes »), `{lien}` (l'URL de la page). Une variable inconnue reste telle quelle. Les mentions
saisies à la main (`@everyone`, `@here`, `<@…>`, `<@&…>`) sont retirées des textes : la mention se règle
par le champ « Mention » du rappel, jamais dans le texte (piège n° 15).

#### M1 — Le panneau d'inscription (la veille à 20 h, puis mis à jour en continu)

Il remplace `embed_inscription` et `embed_composition` (`bot.py:374-399`), ainsi que l'actuel rappel de
la veille (`rappelCreneau`, `scheduler.ts:50-89`, texte `:80-84`), dont il reprend la phrase.

```
@everyone
┃ 🏰 Chambre Secrète — mercredi 22 octobre · 21 h
┃ ⏰ Demain à 21 h. Annonce-toi dès maintenant : on compose les équipes à l'avance.
┃ 👥 7 / 10 annoncés · ✅ 5 retenus
┃ ⚠️ Il manque : 1 Envoûteur et 2 Arcanistes
┃
┃ 🛡️ Tanks
┃ <Primat> Tank croix — ✅ Brann ❤️ 9,4 M
┃ <Primat> Tank croix jumeaux — ✅ Ysolde ❤️ 6,1 M 📏
┃
┃ ⚔️ DPS physiques
┃ <Templier> Cheva — ✅ Thorn 💥 150 k – 210 k/s
┃ <Sylphide> YJ — Lina 💥 140 k – 190 k/s
┃ <Spadassin> Spadassin — ✅ Orin ❔
┃ <Arbaletrier> Arbalétrier — ▫️ personne
┃ <Chanoine> Moine — ✅ Pyra 💥 120 k – 160 k/s
┃
┃ 🔮 DPS magiques
┃ <Arcaniste> Arcaniste — Mira 💥 190 k/s
┃ <Arcaniste> Arcaniste — ▫️ personne
┃ <Envouteur> Soso — ▫️ personne
┃
┃ 🙋 Annoncés sans poste : <Arcaniste> Nox 💥 175 k/s
┃ GENESIS · Chambres Secrètes · mis à jour aujourd'hui à 18:42
[✅ Je viens] [❌ Pas cette fois] [📍 Mes positions] [🌐 Choisir mon poste sur le site]
```

| Élément | Règle |
|---|---|
| Quand | Par le rappel `veille` (20 h la veille, §8.5). `/chambre panneau` ou le bouton « Republier » le republient à tout moment |
| Salon | « Chambres » du paramétrage. **Les chiffres (❤️, 💥, 📏, ❔) ne s'affichent que si ce salon est fermé à `@everyone`** (`salon.permissionsFor(guild.roles.everyone).has(ViewChannel) === false`) : le serveur Discord compte aussi des visiteurs et des candidats, et la page `/recensement` est réservée aux membres. Dans un salon ouvert, le panneau part sans chiffres, et le paramétrage affiche « ⚠️ Ce salon est visible des visiteurs : les chiffres n'y seront pas publiés ». Même règle pour le récap (M5) et le panneau du Guild Siege |
| Mention | `@everyone` à la **première** publication du panneau d'une séance seulement (`allowedMentions: { parse: ["everyone"] }`). Une republication (`/chambre panneau`, « Republier ») ne mentionne personne. Les modifications ne notifient personne |
| Modifiable | *« Demain à {heure}. Annonce-toi dès maintenant : on compose les équipes à l'avance. »* Le jour J, la même ligne dit « Ce soir à {heure}. » |
| Postes | Les 12 postes, dans l'ordre et sous les libellés de `slotMeta` (`page.tsx:139`). Un poste optionnel vide n'est pas affiché. Sur un poste : les **annoncés** de la séance qui y sont inscrits, ✅ devant les retenus, puis leur chiffre |
| Couleur | Or s'il manque une classe, vert au complet, anthracite après la clôture ou l'annulation |
| Fermeture | À la clôture, à l'annulation, ou quand un nouveau panneau le remplace : titre suivi de « · terminée » (ou « · annulée »), boutons retirés, comme le fait le modèle (`bot.py:1429-1445`) |
| Limites | 1 024 caractères par champ, 6 000 au total. Au-delà, la ligne coupée se termine par « … (voir le site) » |

#### M2 — « Il manque du monde » (13 h 30 et 18 h 30, s'il manque une classe)

Il remplace `texte_places` (`bot.py:1540-1544`).

```
@everyone
┃ ⏰ Chambre Secrète ce soir à 21 h — il manque du monde
┃ 👥 7 / 10 annoncés
┃ ⚠️ Il manque : 1 Envoûteur et 2 Arcanistes
┃ Tu peux venir ? Un clic sur ✅ Je viens suffit, ici ou sur le panneau.
┃ GENESIS · Chambres Secrètes
[✅ Je viens] [🌐 Voir le panneau]
```

- Le second bouton est un lien vers le message du panneau (sa jump URL).
- Le message de 18 h 30 **supprime** celui de 13 h 30 avant de partir (`bot.py:1735-1740`).
- Modifiable : *« Tu peux venir ? Un clic sur ✅ Je viens suffit, ici ou sur le panneau. »*

#### M3 — « Ça commence dans 1 h » (20 h le jour J)

Il fusionne l'actuel rappel du jour (`@everyone`, `scheduler.ts:76-88`) et `texte_rappel_inscrits`
(`bot.py:1547-1550`) en **un seul message**. Cela fait une notification au lieu de deux, au même moment :
garder les deux, comme le suggère « en plus du rappel existant », enverrait deux messages à 20 h pile.

```
@everyone — ce soir : @Maxime @Lina @Tom @Sol @Nox @Pyra @Mira @Kaelis @Orin @Sel
┃ ⏰ La Chambre Secrète commence dans 1 h
┃ 🕘 Rendez-vous à 21 h en vocal. Vérifie ton stuff, tes salles et ton équipe de jumeaux avant de te connecter.
┃ 👥 10 / 10 retenus — au complet, merci à tous !
┃ ✅ Ce soir : <Primat> Brann · <Primat> Ysolde · <Templier> Thorn · <Sylphide> Lina · <Spadassin> Orin ·
┃    <Chanoine> Pyra · <Arcaniste> Mira · <Arcaniste> Kaelis · <Arcaniste> Nox · <Envouteur> Sel
┃ GENESIS · Chambres Secrètes
[📍 Mes positions] [🌐 Voir la répartition]
```

- S'il manque du monde, la ligne 👥 devient « 👥 8 / 10 retenus » et une ligne « ⚠️ Il manque : 1 Envoûteur »
  s'ajoute. La couleur passe à l'or.
- Mention (contre-examen) : **`@everyone` et les participants**, mention `everyone_participants`
  (`allowedMentions: { parse: ["everyone"], users: [ids] }`). La révision 2 ne gardait que `@everyone`,
  or Maxime a décidé « 20 h aux inscrits », et c'est ce que fait le modèle (`bot.py:1730-1732` :
  mention des seuls inscrits, et seulement s'il y en a). Le `@everyone` est celui du rappel existant ; la
  mention des participants est celle du modèle, et elle surligne le message chez ceux qui jouent. Un
  même message qui mentionne `@everyone` et un membre ne lui envoie **qu'une** notification. S'il n'y a
  aucun participant, seul `@everyone` part. Les noms de l'embed (persos) ne notifient pas.
- Tant que `nouveauxMessages` est coupé (§8.10), la mention reste `@everyone` seul : c'est le rappel
  existant, et le bot Python mentionne encore les inscrits de son côté.
- Modifiable : *« Rendez-vous à {heure} en vocal. Vérifie ton stuff, tes salles et ton équipe de jumeaux
  avant de te connecter. »*

#### M4 — Le rappel de la veille sans panneau

Si le staff coupe le panneau dans le paramétrage (`panneau: false`), le rappel de la veille reste un
message simple, avec le texte actuel réécrit :

```
@everyone
┃ ⏰ Chambre Secrète demain à 21 h
┃ Prépare ton stuff et annonce-toi dès maintenant : on compose les équipes à l'avance.
┃ 👥 4 / 10 annoncés · ⚠️ Il manque : 1 Envoûteur, 2 Arcanistes et 1 Primat
[✅ Je viens] [🌐 S'annoncer sur le site]
```

#### M5 — Le récap (20 h 40, puis mis à jour jusqu'à la clôture)

Il remplace `message_recap` (`bot.py:1648-1702`).

```
📋 Récap de ce soir — @Maxime @Lina @Tom @Sol @Nox @Pyra @Mira @Kaelis @Orin @Sel
┃ 📋 Chambre Secrète — mercredi 22 octobre · récap
┃ 👥 10 / 10 joueurs · lis bien ton rôle à chaque phase.
┃
┃ 🛡️ Tanks              🔮 DPS magiques          ⚔️ DPS physiques
┃ <Primat> Brann        <Arcaniste> Mira         <Templier> Thorn
┃ <Primat> Ysolde       <Arcaniste> Kaelis       <Sylphide> Lina
┃                       <Arcaniste> Nox          <Spadassin> Orin
┃                       <Envouteur> Sel          <Chanoine> Pyra
┃
┃ 🌳 Phase 1 — Asuras (salles)
┃ Salle 1 → <Primat> Brann · Salle 2 → <Templier> Thorn · Salles 3 + 4 → <Arcaniste> Kaelis
┃ Salle 5 → <Arcaniste> Mira · …  · Asuras 11 + 12 → <Arbaletrier> Sol
┃ ⚠️ Sans joueur : Salle 6
┃
┃ 👯 Phase 2 — 🟩 Équipe Verte          👯 Phase 2 — 🟥 Équipe Rouge
┃ <Primat> Brann — tank                <Primat> Ysolde — tank
┃ <Arcaniste> Mira                     <Arcaniste> Kaelis
┃ …                                    …
┃
┃ 🗿 Phase 3 — Golem ⬅️ gauche          🗿 Phase 3 — Golem ➡️ droite
┃ <Primat> Brann — tank                <Primat> Ysolde — tank
┃ …                                    …
┃ 1 Primat tank · 1 Arcaniste · …      1 Primat tank · 1 Arcaniste · …
┃ ⚠️ Ne debuff pas les golems. Longez les murs, n'attirez pas l'araignée.
┃
┃ 🕷️ Araignée — 1️⃣ Rotation 1          🕷️ Araignée — 2️⃣ Rotation 2
┃ <Arcaniste> Mira                     <Arcaniste> Kaelis
┃ <Templier> Thorn                     <Spadassin> Orin
┃ …                                    …
┃ 🔁 Remplaçant debuff : <Arcaniste> Nox — debuff seulement si celui de sa classe est raté.
┃ ⚠️ Araignée : jamais deux debuffs de la même classe en même temps · tout le monde collé à elle,
┃    même à distance · cercle DANGER : Échap tout de suite (elle renvoie les dégâts).
┃ GENESIS · Chambres Secrètes · bonne Chambre à tous !
[📍 Mes positions] [🌐 Voir la répartition]
```

- `content` porte la mention des participants qui ont un compte : `allowedMentions: { users: [ids] }`. Un
  participant sans compte retrouvé reste dans la liste, en gras, sans mention.
- Dans l'embed, on écrit les **persos**, pas les mentions : un nom de perso se lit mieux en jeu.
- Champs : 25 au plus, 1 024 caractères par champ, 6 000 au total. Le modèle coupe à 1 024
  (`bot.py:1671`, `:1685`). Avec 10 participants, on reste loin de ces limites.
- Modifiables : les consignes des golems et de l'araignée (§4.6), et le pied « bonne Chambre à tous ! ».

#### M6 — Le chrono (message vivant, boutons réservés au staff)

Il remplace `embed_chrono` et `ChronoView` (`bot.py:1800-1845`). Trois états :

```
┃ ⏱️ Chrono — Chambre du mercredi 22 octobre
┃ ▶️ Un membre du staff clique sur Démarrer au lancement de l'instance.
┃ ▫️ 🧟 1.1 480 monstres
┃ ▫️ 🌳 1.2 12 Asuras
┃ …
[▶️ Démarrer] [🌐 Suivre sur le site]
```
```
┃ ⏱️ Chrono — Chambre du mercredi 22 octobre
┃ Départ à 21:04:12 · chronométreur : Maxime
┃ ✅ 🧟 1.1 480 monstres — 6:12
┃ ✅ 🌳 1.2 12 Asuras — 4:40
┃ ✅ 👹 1.3 3 Malphas — 3:42
┃ ✅ 💂 2.1 100 soldats — 2:58
┃ ▶️ 👯 2.2 Jumeaux — Kraavus & Kraavos — en cours depuis il y a 3 minutes
┃ ▫️ 🕸️ 3.1 100 araignées
┃ …
[⏭️ Fin : 2.2 Jumeaux] [↩️ Annuler le dernier clic] [⏹️ Arrêter] [🌐 Suivre sur le site]
```
```
┃ ⏱️ Chrono — Chambre du mercredi 22 octobre
┃ 🏁 Terminé en 42:17
┃ ✅ 🧟 1.1 480 monstres — 6:12
┃ …
[↩️ Annuler le dernier clic] [🌐 Suivre sur le site]
```

- « en cours depuis » s'écrit `<t:{unix}:R>` : Discord met ce texte à jour tout seul, sans modifier le
  message (`bot.py:1810`). Le départ s'écrit `<t:{unix}:T>`.
- Quand : `/chambre chrono`, le bouton « Publier dans Discord » de l'onglet Chrono, ou le rappel `chrono`
  du paramétrage (coupé par défaut). Comme le panneau, une nouvelle publication **ferme l'ancienne**
  (boutons retirés) : deux messages de chrono vivants pour la même séance ne doivent jamais coexister.
- Couleur : or pendant le chrono, vert quand il est terminé.
- Clic par un non-staff : « ⛔ Seul le staff fait avancer le chrono. Suis-le sur le site : {lien} »
  (éphémère).
- Clic en retard (`vu` dépassé) : « ⚠️ Le chrono a déjà avancé. Le message est à jour. » (éphémère), puis
  le message est modifié.
- Le clic modifie le message **dans la réponse** (`interaction.update`), comme le modèle (`bot.py:1878-1879`) :
  cela ne fait qu'un appel à Discord.

#### M7 — Le débrief publié (embed, image et lien)

Il remplace `embed_debrief` (`bot.py:2074-2111`).

```
┃ 📝 Retour de la Chambre — mercredi 22 octobre
┃ 🏆 GAGNÉ · ⏱️ Temps total 42:17 (⚡ −1:23 par rapport au dimanche 19 octobre)
┃ 🥇 Nouveau record de temps total !
┃
┃ 🔎 Analyse
┃ ⌛ Étape la plus longue : 2.2 Jumeaux — 6:12 (15 % du temps)
┃ 🎯 Mal deux fois de suite : 3.4 Nyzzara — à retravailler
┃
┃ 📌 À retenir
┃ Équilibrer les deux équipes des jumeaux avant de lancer : Kraavos est mort 9 s après Kraavus.
┃
┃ 🎬 Vidéos (2)
┃ 2.2 Jumeaux — Aggro ratée sur Kraavos (Lina, à 1:35)
┃ 2.2 Jumeaux — Vue du tank (Brann, à 0:48)
┃
┃ [image : le tableau, §4.11]
┃ GENESIS · ⚡ plus rapide · 🐌 plus lent que la dernière fois
[🌐 Lire le débrief sur le site]
```

- Le titre mène à `{URL}/compositions?onglet=bilans&seance={cle}`. Le bouton est un `ButtonStyle.Link`,
  qui ne demande aucun traitement de clic.
- PERDU : « 💀 PERDU », et la couleur reste crimson. GAGNÉ : vert.
- Les vidéos sont listées avec un lien vers la page, au bon moment : `…&seance={cle}&video={id}`. On ne met
  jamais l'URL d'un fichier : elle exige d'être connecté.
- Mention : aucune.

#### M8 — Séance annulée

```
@everyone
┃ 🚫 Chambre Secrète de ce soir annulée
┃ 📅 mercredi 22 octobre · 21 h — {motif, s'il y en a un}
┃ La prochaine : dimanche 26 octobre · 21 h.
┃ GENESIS · Chambres Secrètes
```

Mention `@everyone` seulement si l'annulation tombe le jour même. Sinon, aucune. Le panneau passe en
« · annulée ». Modifiable : on peut couper ce message (`annoncerAnnulation`).

#### M9 — Les réponses éphémères (seul l'auteur du clic les voit)

| Cas | Texte |
|---|---|
| Annoncé (un perso) | ✅ **Kaelis** (<Arcaniste> Arcaniste) est annoncé pour mercredi 22 octobre · 21 h. Tu changes d'avis ? ❌ Pas cette fois. |
| Annoncé, sans poste | ✅ **Kaelis** est annoncé. Il n'a pas encore de poste : choisis-en un ci-dessous (facultatif). *[menu des postes de sa classe]* |
| Plusieurs persos | Quels persos peux-tu amener ce soir ? Le staff choisira. *[menu à choix multiple, annonces actuelles cochées]* |
| Pas cette fois | ❌ C'est noté : **Kaelis** ne vient pas mercredi. Merci d'avoir prévenu. |
| Retiré alors que retenu | ❌ C'est noté. ⚠️ Tu étais retenu : préviens le staff pour qu'on te remplace. |
| Poste choisi | ✅ **Kaelis** est inscrit au poste **Arcaniste**. |
| Compte non lié | 🔗 Ton Discord n'est pas encore lié au site. Connecte-toi une fois sur {URL}, puis reviens cliquer. |
| Pas membre | ⛔ Les Chambres sont réservées aux membres de la guilde. |
| Aucun perso | 🧙 Tu n'as aucun personnage sur le site. Crée-le dans Mes personnages : {URL}/personnages |
| Panneau périmé | ⚠️ Ce panneau est celui d'une séance passée. Le bon est ici : {jump URL} |
| Séance clôturée | ⚠️ Cette séance est terminée. |
| Erreur | ⚠️ Je n'ai pas pu enregistrer, réessaie dans un instant. *(Le détail part dans le journal du bot.)* |

#### M10 — 📍 Mes positions (éphémère)

Il remplace `texte_positions` (`bot.py:1119-1125`).

```
📍 Tes positions — mercredi 22 octobre · 21 h
<Arcaniste> Kaelis · poste Arcaniste · ✅ retenu
🌳 Salles : 3 + 4
👯 Jumeaux : 🟥 Équipe Rouge — 🔮 DPS magique
🗿 Golem : ➡️ droite
🕷️ Araignée : 2️⃣ Rotation 2
[🌐 Modifier sur le site]
```

Si la répartition n'est pas faite : « 🌳 Salles : pas encore choisies — prends-les sur le site ».

#### M11 — Commandes slash (§8.4)

```
/recensement
📊 Tes chiffres — mesurés sur le totem de l'Oasis
<Primat> Brann
  🛡️ Tank (poing) ❤️ 9,4 M · mesuré le 12/10
  🛡️ Off tank (sceptre) ❤️ 6,8 M · 📏 mesuré le 02/09, à remesurer
  🔮 DPS ❔ sans mesure
[🌐 Mettre à jour dans l'AirBuilder] [🌐 Voir le recensement]
```

*Contre-examen* : la révision 2 titrait avec 📏, qui veut dire « à remesurer » dans la table du §8.2,
et marquait le DPS d'un Primat avec ⚔️ (« DPS physique »), alors que le §2.3 range le Primat en
magique. Le titre prend 📊 (ajouté à la table), et la ligne DPS prend l'émoji de `TYPE_DPS[classe]`
(🔮 ou ⚔️).
```
/chambre historique
📜 Tes Chambres : 9 sur 12 depuis le 1er septembre
✅ 22/10 🏆 · 19/10 🏆 · 15/10 💀 · …
❌ Annoncé mais absent : 08/10
[🌐 Voir les bilans]
```

#### M12 — Le message d'essai (paramétrage)

Le message rendu, tel qu'il partirait, mais dans le salon « Essais », précédé de « 🧪 ESSAI — » dans le
titre, **sans aucune mention** (`allowedMentions: { parse: [] }`) et sans boutons actifs (les boutons
d'essai répondent « 🧪 Ceci est un essai. »).

### 8.4 Les commandes slash

| Commande | Qui | Effet | Remplace |
|---|---|---|---|
| `/chambre panneau` | staff | (Re)publie le panneau de la prochaine séance, et ferme l'ancien | `/chambre <date>` (`bot.py:2184`) |
| `/chambre chrono` | staff | Publie le chrono de la séance courante | `/chrono` (`:1882`) |
| `/chambre recap` | staff | Envoie le récap maintenant, sans mention | `/repartition` (`:1331`), pour la partie lecture |
| `/chambre positions` | membre | 📍 Mes positions (M10) | bouton 📍 (`:458-461`) |
| `/chambre historique [joueur]` | membre ; `joueur` pour le staff | M11 | `/historique` (`:1476`) |
| `/recensement [classe]` | membre | Ses chiffres (M11). Avec `classe` : le classement de la classe, 15 lignes au plus, et le lien vers la page filtrée | `/recensement` (`:659`), en lecture |
| `/chambre cloturer` | staff | Répond (éphémère) par le lien direct vers la clôture de `cs_derniere` sur le site | `/cloturer` (`:1448`) |
| `/chambre debrief` | staff | Répond (éphémère) par le lien direct vers le débrief de `cs_derniere` (onglet Bilans) | `/debrief` (`:2161`) |

*Contre-examen* : la révision 2 laissait `/cloturer` et `/debrief` sans équivalent dans Discord. Maxime
a décidé que notre bot « reprend TOUT » : chaque commande du modèle a donc une porte chez nous, même
quand le geste lui-même se fait sur le site (Q4). « Membre » veut dire `canAccessGuild` vérifié en base
(§2.6), pas un rôle Discord : la réponse refusée est le ⛔ de M9.

`/aide` (`bot/commands/aide.ts`) gagne ces lignes, dans ses blocs « Membres » et « Staff ».

### 8.5 Les rappels du jour J

**Pour les joueurs.** Le jour de la Chambre, mercredi et dimanche :
- la veille à 20 h, le panneau d'inscription (M1) : c'est le rappel existant, enrichi ;
- à 13 h 30, et de nouveau à 18 h 30, **s'il manque du monde**, un `@everyone` dit ce qui manque (M2) ;
- à 20 h, « ça commence dans 1 h » (M3) : c'est le rappel existant, fusionné avec la mention du modèle ;
- à 20 h 40, le récap complet, avec la mention de tous les participants (M5).

**La liste par défaut**, modifiable dans le paramétrage (§9) :

| id | Quand | Heure | Condition | Mention | Message | Actif par défaut |
|---|---|---|---|---|---|---|
| `veille` | veille | 20:00 | toujours | everyone | M1 (ou M4 sans panneau) | oui (existant) |
| `places_1` | jour | 13:30 | s'il manque une classe | everyone | M2 | oui* |
| `places_2` | jour | 18:30 | s'il manque une classe | everyone | M2, remplace le précédent | oui* |
| `jour` | jour | 20:00 | toujours | everyone + participants (`everyone_participants`) ; `everyone` seul tant que `nouveauxMessages` est coupé | M3 | oui (existant) |
| `recap` | jour | 20:40 | s'il y a des participants | participants | M5 | oui* |
| `chrono` | jour | 20:55 | — | aucune | M6 | non |

\* Ces rappels-là ne partent que si `nouveauxMessages` est allumé (§8.10) : c'est l'interrupteur de la
bascule depuis le bot Python.

**L'algorithme du tick** (`bot/lib/seances.ts`) :

```ts
async function tickSeances(client) {
  const p = partiesParis(new Date());                              // { date, jour, hhmm, minutes }
  for (const evenement of ["cs", "gs"] as const) {
    if (!(await rappelsActifs(`${evenement}_rappels_actifs`))) continue;   // interrupteur général (scheduler.ts:37-44)
    const params = await lireParametres(prisma, evenement);          // cache de 30 s
    for (const r of params.rappels.filter(r => r.actif && (r.existant || params.nouveauxMessages))) {
      const s = seanceVisee(evenement, r.quand, p, params);          // CS : la séance du jour (ou du lendemain pour « veille »)
      if (!s) continue;
      const t = minutesDe(r.heure);
      if (p.minutes < t || p.minutes > t + 10) continue;             // fenêtre de rattrapage : 10 min
      await envoyerRappel(client, s, r, params);                      // idempotent
    }
  }
}
```

- **Pas de double envoi.** `envoyerRappel` **réclame** d'abord le rappel : avec `majSeance`, il écrit
  `rappels[r.id] = now` à condition que la clé soit absente. S'il obtient le marqueur, il envoie, puis
  range l'id du message dans `messages`. Si l'envoi échoue, il **libère** le marqueur : le tick suivant
  réessaie, tant qu'on est dans la fenêtre de 10 minutes. Un redémarrage du bot dans la minute, ou deux
  bots lancés par erreur, n'envoient donc qu'un message.
- **La fenêtre de rattrapage.** Un bot redémarré à 13 h 34 envoie encore le rappel de 13 h 30. À 13 h 41,
  il y renonce et l'écrit dans son journal, plutôt que d'envoyer « il manque du monde » en retard.
- **Rien ne part** pour une séance annulée, ni avant l'ouverture de sa préparation
  (`presencesSeance`, `compositions.ts:197-205`).
- **Un seul `@everyone` par salon et par demi-heure** (contre-examen). Le Guild Siege proposé le samedi
  à 21 h (§11, Q5) a son rappel « dans 1 h » le samedi à 20 h, à la minute où part le panneau de la
  veille du dimanche : deux `@everyone` en même temps, peut-être dans le même salon. Deux garde-fous :
  `validerParametres` refuse un rappel `@everyone` du Guild Siege qui tombe à moins de 30 min d'un
  rappel `@everyone` des Chambres le même jour (« Ce rappel tombe en même temps que le panneau des
  Chambres du samedi 20:00 : décale-le ou retire sa mention ») ; et, à l'envoi, `envoyerRappel` lit les
  marqueurs `rappels` des séances du jour : si un `@everyone` est parti dans ce salon depuis moins de
  30 min, le rappel part **sans mention** et le journal du bot le note.
- **L'effectif** se compte sur `presencesSeance(etat, prochaineSeanceParis(now))`, et la phrase du manque
  vient de `phraseManques(liste)`, extraite de `resumeManques` (`compositions.ts:255-262`) pour prendre une
  liste en entrée. Cela corrige au passage le rappel existant, qui compte **toutes** les annonces du
  créneau depuis toujours (`presencesDu`, `scheduler.ts:64-67` ; piège n° 3).

**Le branchement dans `startScheduler`** (`scheduler.ts:207-242`) :
- retirer les quatre `cron.schedule` des Chambres (`:231-234`) et les deux du Guild Siege (`:239-240`) ;
- ajouter `cron.schedule("* * * * *", () => tickSeances(client).catch(console.error), CRON_TZ)` ;
- ajouter `setInterval(() => synchroniserMessages(client).catch(console.error), 15_000)`, plus la purge
  des vidéos chaque jour à 4 h 30 (§10.5).

Les valeurs par défaut reproduisent les deux rappels existants : `veille` et `jour` à 20 h, `@everyone`,
sous l'interrupteur `cs_rappels_actifs`. Tant que `nouveauxMessages` reste coupé, les membres reçoivent
donc **les mêmes rappels, aux mêmes heures, avec la même mention**, sous leur forme réécrite (M4 et M3) :
ni plus de messages ni plus de notifications. *Contre-examen* : la révision 2 disait ici « rien ne
change » et au lot 3 « sous leur nouvelle forme » ; c'est la seconde qui est vraie. Un bouton n'apparaît
sur un message qu'une fois son lot livré : « 📍 Mes positions » attend le lot 4.

### 8.6 La publication de l'image du débrief

**Le canal du site vers le bot** est la file `BotCommand` existante (`bot/lib/botcommands.ts:67-97`) :

1. La route `POST /api/seances/[cle]/debrief/publier` (§6, route 8) crée **elle-même** la commande, côté
   serveur : `prisma.botCommand.create({ data: { type: "seance_debrief", payload: { seanceId },
   createdBy: a.user.username } })`.
2. Dans `processBotCommands`, qui tourne toutes les 12 s (`scheduler.ts:221`), on ajoute une branche par
   type : `else if (cmd.type === "seance_debrief") result = await publierDebrief(client, String(p.seanceId))`,
   et de même pour `seance_publier`, `seance_fermer`, `seance_annulation` et `evenement_essai`.
3. `publierDebrief` (`bot/lib/seances.ts`) **relit tout en base** : la séance, son débrief, ses vidéos,
   les séances publiées avant elle, et le paramétrage. On ne fait jamais confiance au contenu de la charge.
   Ensuite :
   - le résumé et l'analyse viennent d'`analyseDebrief` (§4.10), l'image (un `Buffer` PNG)
     d'`imageDebrief()`, dans `src/lib/seance-image.ts` (§4.11) ;
   - l'embed est le message M7, avec l'image en `attachment://debrief.png` ;
   - le salon est « Débriefs » du paramétrage. Si c'est un **forum** (`ChannelType.GuildForum`), on crée
     un fil nommé « Retour Chambre — {date} » (`bot.py:2001-2006`), avec l'étiquette « Donjon » si le forum
     en a une (`:2002`). Si c'est un salon texte, un simple `send` ;
   - on écrit `debriefPublieAt`, `debriefLien` (la jump URL) et `debriefPar` sur la séance ;
   - on renvoie `"message " + jumpUrl`, qui part dans `BotCommand.result`.
4. En cas d'échec (salon introuvable, ou droits manquants : *Envoyer des messages*, *Intégrer des liens*,
   *Joindre des fichiers*, et *Créer des publications* pour un forum), la commande passe en `FAILED`, avec
   la raison. Le site l'affiche dans « Publication : échec ».
5. **Republier** crée un nouveau message et remplace le lien, comme le modèle, qui remplace son résumé
   (`bot.py:2011-2014`). L'ancien message n'est pas supprimé.

### 8.7 Le message d'essai

`POST /api/evenements/parametres/essai` (§6, route 3) met en file `evenement_essai` `{ evenement, message }`.
Le bot rend le message **avec le paramétrage enregistré** et la séance prochaine (ou une séance fictive
« démo » si elle n'existe pas encore), puis l'envoie selon le §8.3 (M12). C'est l'outil qui permet de
régler un texte sans attendre mercredi 13 h 30.

### 8.8 Les salons et les variables d'environnement

Trois variables **nouvelles et facultatives**, à ajouter dans `.env.example`, `bot/config.ts` (objet
`CHANNELS`) et `bot/README.md` :

```
CHANNEL_CS=""           # salon des Chambres (panneau, rappels, récap, chrono) ; vide = 1498696982229811352
CHANNEL_CS_DEBRIEF=""   # salon (texte ou forum) des débriefs ; vide = CHANNEL_CS
CHANNEL_GS=""           # salon du Guild Siege ; vide = CHANNEL_CS
```

**L'ordre de résolution** d'un salon : la valeur choisie dans le paramétrage, puis la variable, puis le
défaut. Le paramétrage ne propose que des salons du cache `GuildChannel` (`schema.prisma:608`, rempli par
`syncGuildChannels`, `botcommands.ts:24-44`) : texte ou annonce partout, et forum en plus pour les
débriefs. C'est la même protection que la route générique (`bot-command/route.ts:23-26`).

`VIDEOS_DIR` (§10.2) est la quatrième variable, facultative elle aussi.

### 8.9 Les permissions du bot dans ces salons

*Voir le salon*, *Envoyer des messages*, *Intégrer des liens*, *Joindre des fichiers*, *Mentionner
@everyone*, *Lire l'historique des messages* et, pour un forum, *Créer des publications*. Supprimer ses
propres messages (M2) ne demande aucune permission de plus. Les émojis personnalisés du serveur sont
utilisables par le bot, puisqu'il est membre de ce serveur.

### 8.10 Arrêter le bot Python sans double message

Deux bots qui annoncent la même Chambre, cela fait deux `@everyone`. On passe donc de l'un à l'autre
**d'un coup**, avec un interrupteur prévu pour ça : `nouveauxMessages`, dans le paramétrage CS, coupé par
défaut.

Tant qu'il est coupé, notre bot ne fait que ce qu'il fait déjà (les rappels `veille` et `jour`, aux mêmes
heures et avec la même mention, sous leur forme réécrite M4 et M3), et tout le reste attend. Le jour de la
bascule, une fois les lots 3 à 7 livrés :
1. Maxime arrête le bot Python **sur la machine qui l'héberge** (`docker compose down` dans son dossier ;
   ce n'est pas un geste Discord) ;
2. il **retire l'application du bot Python du serveur Discord** (Paramètres du serveur → Intégrations →
   le bot → Retirer), ou au minimum y désactive ses commandes. *Contre-examen* : arrêter le conteneur ne
   désinscrit pas ses commandes slash, que le modèle enregistre par serveur (`tree.sync(guild=…)`,
   `bot.py:123-124`). Sans ce geste, chaque membre verrait deux `/chambre` et deux `/recensement` (le
   sien et le nôtre), plus `/chrono`, `/debrief`, `/cloturer`, `/historique` et `/repartition`, qui
   répondraient « L'application n'a pas répondu » ;
3. sur `/discord/evenements`, il envoie un **essai** de chaque message (§8.7) ;
4. il allume `nouveauxMessages`. Au prochain 20 h de veille, le panneau part ;
5. les anciens messages du bot Python (panneau, Phase 1, Phase 2) restent dans le salon. Le staff les
   supprime à la main, ou les laisse : leurs boutons ne répondent plus.

Avant la bascule (lots 3 à 7), nos `/chambre` et `/recensement` coexistent avec ceux du bot Python :
Discord les distingue par le nom de l'application, mais c'est déroutant. On peut ne lancer
`deploy-commands.ts` avec ces deux commandes que le jour de la bascule.

**La reprise de l'historique** est facultative (lot 10). Si Maxime a le fichier `data/data_chambre.json`
du bot Python, un script `scripts/importer-dracarys.ts` en tire les séances publiées (`debriefs`) et les
participations (`historique`). L'uid Discord devient `User.discordId`, puis `userId`. Les records et la
comparaison « vs la dernière fois » repartent alors de l'historique existant. Sans ce fichier, on démarre
à vide. Trois précisions (contre-examen) :
- **seulement un fichier tiré du serveur GENESIS** : le même bot a d'abord servi la guilde Dracarys
  (`SERVEUR_GUILDE_ID` par défaut, `bot.py:45`), et importer son historique mêlerait les records d'une
  autre guilde aux nôtres. Le script refuse un fichier dont aucun uid ne correspond à un `User` ;
- la date du modèle est un texte libre (« 18/10/2026 21h », `:2186`) : le script la lit comme
  `chambres_du_jour` (`:1529-1535`), ne garde que les mercredis et dimanches (la clé `cs_…_mer|dim` du
  §2.5 l'exige) et liste ce qu'il écarte ;
- les salles du modèle s'appellent `c1`…`c10` (`:747`), les nôtres `s1`…`s10` : on les renomme ;
  `a11` et `a12` ne changent pas. Les chronos du modèle sont en secondes, comme les nôtres dans le
  débrief.

---

## 9. Le paramétrage

**Pour le staff.** Un seul écran règle tout ce que le bot envoie pour les Chambres et le Guild Siege : les
salons, chaque rappel (allumé ou non, à quelle heure, à qui), les phrases des messages, les étapes du
chrono, les salles de la Phase 1, les consignes du récap et les règles des vidéos. Chaque texte a un bouton
« Rétablir le défaut », chaque message un bouton « Essai ». On voit qui a modifié quoi, et quand.

### 9.1 Où il vit, et qui y touche

- **L'écran** : `/discord/evenements` (`src/app/(admin)/discord/evenements/page.tsx`), une page neuve de
  l'espace staff, avec un lien depuis la carte « Chambres Secrètes » de `/discord` (`discord/page.tsx:50`)
  et depuis le bouton « ⚙ Paramétrer » de `/compositions`. Le préfixe `/discord` est déjà gardé par le
  middleware (`ADMIN_PREFIXES`, `middleware.ts:32`) et par `requireAdmin()` du gabarit `(admin)`. Elle
  est **déclarée dans `nav.ts`** au lot 2 (§7.7, espace Bras droits, `barre: false`).
- **Le stockage** : `ParametresEvenement`, une ligne `"cs"` et une ligne `"gs"` (§5.1).
- **Qui écrit** : le staff (`apiRole(ADMIN_ROLES)`), comme les interrupteurs actuels des rappels
  (`/api/admin/settings`, `route.ts:31`). Les réglages de page, eux, sont réservés au rang Vanguard
  (`canParametrer`, `roles.ts:77`). Si Maxime veut la même règle ici, la garde de la route 2 change sur une
  ligne.
- **Qui lit** : le site (routes 1, 4 et 13) et le bot, à chaque tick, avec un cache de 30 s.
- On n'utilise pas `PageReglages` (`schema.prisma:1048`) : elle n'accepte que des valeurs plates (booléen,
  nombre, texte, `api/reglages/route.ts:76-93`), alors que les rappels et les étapes sont des listes.
- **On n'écrit que ce qui diffère du défaut** (contre-examen), comme `reglages.ts` le fait déjà et pour
  la même raison : écrire le document entier fige les défauts, et une phrase par défaut corrigée plus tard
  dans le code ne s'appliquerait jamais. `data` garde donc, clé de premier niveau par clé de premier
  niveau (`rappels`, `etapes`, `textes`…), seulement celles que le staff a changées ; une liste modifiée
  est gardée entière. « Rétablir le défaut » retire la clé.

### 9.2 Le contenu, et ses valeurs par défaut

```ts
// src/lib/evenements.ts
export type RappelDef = {
  id: string;                     // "veille" | "places_1" | … | libre : [a-z0-9_]{1,20}, unique
  type: "panneau" | "places" | "jour" | "recap" | "chrono" | "gs_staff";
  actif: boolean;
  existant?: true;                // rappels d'avant la bascule : partent même si nouveauxMessages est coupé
  quand: "veille" | "jour";
  heure: string;                  // "HH:MM", heure de Paris (Chambres : leur créneau est fixe, 21 h)
  /** Guild Siege : l'heure se compte DEPUIS le créneau, réglable (contre-examen). « 1 h avant » et
   *  « 30 min avant la fin d'inscription » ne s'écrivent pas en heure fixe quand le créneau bouge.
   *  Présent : `heure` est ignorée et recalculée pour chaque séance. */
  avant?: { base: "debut" | "finInscription"; minutes: number };   // minutes : 0 à 1440
  condition: "toujours" | "si_manque" | "si_participants";
  mention: "everyone" | "participants" | "everyone_participants" | "aucune";
  remplacePrecedent: boolean;     // supprime le message précédent du même type (M2)
  texte: string;                  // phrase d'ouverture, ≤ 400 caractères, avec {variables} (§8.3)
};

export type ParametresCS = {
  nouveauxMessages: boolean;      // bascule depuis le bot Python (§8.10), false par défaut
  panneau: boolean;               // le rappel « veille » publie le panneau (M1), sinon M4 ; true
  salons: { chambres: string; debriefs: string; essais: string };   // "" = variable d'environnement, puis défaut
  rappels: RappelDef[];           // 0 à 12 ; défauts : le tableau du §8.5
  annoncerAnnulation: boolean;    // M8 ; true
  textes: { piedRecap: string };  // « bonne Chambre à tous ! »
  etapes: Etape[]; phases: Record<string, string>;                  // §3.2
  salles: { cle: string; label: string }[];                         // §4.3
  noms: { golems: string };                                         // « Golems »
  consignes: { golems: string; araignee: string[] };                // §4.6
  videos: { membres: boolean; maxParSeance: number; maxParMembre: number; conservationJours: number; quotaGo: number };
                                  // défauts : true, 10, 3, 180, 5 (§10, Q6)
};

export type ParametresGS = {
  actif: boolean;                 // false : l'onglet reste « En standby »
  creneaux: { id: string; jour: JourFr; heure: string; finInscription: string | null }[];   // §11
  salons: { siege: string; debriefs: string };
  rappels: RappelDef[];
  places: number | null;          // null = sans plafond (À CONFIRMER)
  etapes: Etape[];                // vide par défaut : débrief simplifié
  textes: { panneau: string };
};

export function normaliserParametres(evenement: "cs", raw: unknown): ParametresCS;
export function normaliserParametres(evenement: "gs", raw: unknown): ParametresGS;
export function validerParametres(evenement, data): string[];   // les erreurs, lisibles
```

### 9.3 Les règles de validation

`normaliserParametres` ne lève jamais d'exception : une valeur abîmée reprend son défaut, comme
`fusionner` (`src/lib/reglages.ts:60-79`). `validerParametres`, appelée par la route 2 **avant**
d'écrire, refuse et explique :
- une heure qui n'est pas `HH:MM` entre 00:00 et 23:59 ;
- deux rappels avec le même `id` ;
- un rappel `quand: "jour"` placé à 21:00 ou après pour une Chambre (il partirait pendant la séance) ;
- une mention `everyone` (ou `everyone_participants`) sur un rappel `recap` ou `chrono` (on ne pingue pas
  toute la guilde pour un récap) ;
- un rappel `@everyone` du Guild Siege à moins de 30 min d'un rappel `@everyone` des Chambres le même
  jour (§8.5, « un seul `@everyone` par demi-heure ») ;
- un salon absent du cache `GuildChannel`, ou d'un type interdit (§8.8). Un salon **visible de
  `@everyone`** n'est pas refusé, mais l'écran prévient que les chiffres n'y seront pas publiés (§8.3,
  M1). Seul le bot connaît les permissions : à chaque `syncGuildChannels` (toutes les 10 min), il écrit
  la liste des salons visibles de `@everyone` dans `Setting("salons_publics")` (un tableau JSON d'ids,
  dans la colonne texte `value`). On ne touche pas au modèle `GuildChannel` (§5.1 : aucune colonne
  existante n'est modifiée), et la route n'a besoin que de lire cette ligne ;
- un texte de plus de 400 caractères, et des étapes ou des salles hors des bornes du §3.2 et du §4.3 ;
- pour le Guild Siege, un créneau sans jour ou sans heure, ou deux créneaux identiques.

Les mentions écrites dans un texte sont retirées en silence, à la normalisation (piège n° 15).

### 9.4 L'écran

```
+------------------------------------------------------------------------------------+
| PARAMETRAGE DES EVENEMENTS          [Chambres Secretes] [Guild Siege]               |
| Modifie par Maxime le 21/10 a 18:02 · version 7                                     |
+------------------------------------------------------------------------------------+
| INTERRUPTEURS                                                                        |
|  Rappels des Chambres (general)            [Oui] [Non]     <- Setting cs_rappels_actifs|
|  Messages de notre bot (bascule)           [Oui] [Non]     ! arrete d'abord le bot   |
|                                                              Python (voir l'aide)    |
|  Panneau d'inscription la veille           [Oui] [Non]                               |
|  Annoncer une annulation                   [Oui] [Non]                               |
+------------------------------------------------------------------------------------+
| SALONS                                                                               |
|  Chambres (panneau, rappels, recap, chrono)  [# chambres-secretes   v]  defaut : CHANNEL_CS |
|    ! si le salon est visible de @everyone : « les chiffres n'y seront pas publies »  |
|  Debriefs (texte ou forum)                   [# strategie-chambre v ]                |
|  Essais                                      [# staff            v ]                 |
+------------------------------------------------------------------------------------+
| RAPPELS                                                                [+ Ajouter]   |
|  Actif  Quand   Heure   Condition          Mention        Message                    |
|  [x]    veille  20:00   toujours           @everyone      Panneau     [Texte] [Essai]|
|  [x]    jour    13:30   s'il manque        @everyone      Il manque   [Texte] [Essai]|
|  [x]    jour    18:30   s'il manque        @everyone      Il manque   [Texte] [Essai]|
|  [x]    jour    20:00   toujours           @everyone+insc Dans 1 h    [Texte] [Essai]|
|  [x]    jour    20:40   s'il y a du monde  participants   Recap       [Texte] [Essai]|
|  [ ]    jour    20:55   —                  aucune         Chrono      [Texte] [Essai]|
|  [Texte] ouvre : [_Demain a {heure}. Annonce-toi des maintenant…_] 112/400            |
|                  Variables : {date} {heure} {annonces} {retenus} {places} {manque} {lien}|
|                  [Retablir le defaut]   Apercu : « Demain a 21 h. Annonce-toi… »      |
+------------------------------------------------------------------------------------+
| ETAPES DU CHRONO ET DU DEBRIEF                                         [+ Etape]     |
|  Code  Emoji  Libelle                          Phase                                 |
|  1.1   🧟     [480 monstres            ]       [1 — Les salles   v]  [^][v][x]        |
|  …                                                                                   |
|  Phases : 1 [Phase 1 — Les salles] 2 [Phase 2 — Le couloir] …                        |
|  ! Les seances deja chronometrees gardent leur liste.                                |
+------------------------------------------------------------------------------------+
| REPARTITION : salles de la Phase 1 (12) [Modifier] · nom de la Phase 3 [Golems]      |
| CONSIGNES DU RECAP : golems [_______] · araignee [_______] [_______] [+]             |
| VIDEOS : membres [Oui] · 10 par seance · 3 par membre · conservees 180 j · quota 5 Go |
|          Espace utilise : 1,2 Go sur 5 Go                                           |
+------------------------------------------------------------------------------------+
|                                   [Annuler les modifications] [Enregistrer]          |
+------------------------------------------------------------------------------------+
```

- **On enregistre en bloc**, avec la version lue. Si quelqu'un a enregistré entre-temps, la route renvoie
  409 et l'écran propose « Recharger » sans rien perdre de la saisie (le brouillon reste affiché).
- **L'aperçu** d'un texte se calcule chez le client, avec les variables de la prochaine séance.
- **« Essai »** enregistre d'abord, s'il y a des modifications, puis appelle la route 3.
- **L'interrupteur général** reste la `Setting` actuelle. L'écran l'affiche et l'écrit par
  `/api/admin/settings`, comme `/discord` le fait déjà (`discord/page.tsx:38-46`).

---

## 10. Les vidéos de débrief

**Pour les joueurs.** Sur la page d'un débrief, on joint une vidéo qui montre une erreur : soit un
**lien** (YouTube non répertorié, Twitch, Medal, message Discord), soit un **fichier** de 100 Mo au plus,
en MP4 ou WebM. On la range sous une étape, et on indique le moment où regarder (« 1:35 »). Un clic sur
« Lire » ouvre la vidéo **à ce moment-là**.

### 10.1 Les liens

`lireLienVideo(url)` (dans `src/lib/evenements.ts`, pur) normalise et classe le lien :

| Source | Formes acceptées | Lecture dans la page | Moment |
|---|---|---|---|
| YouTube | `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID`, `youtube.com/live/ID` (et `t=` / `start=`) | `<iframe src="https://www.youtube-nocookie.com/embed/ID?start=95">` | `start` en secondes. Un `t=` présent dans le lien sert de défaut |
| Twitch (vidéo) | `twitch.tv/videos/ID` (et `?t=1h2m3s`) | `<iframe src="https://player.twitch.tv/?video=vID&parent={hôte}&time=0h1m35s&autoplay=false">` | `time`. Le paramètre `parent` est **obligatoire** : c'est `window.location.hostname`, lu chez le client (Twitch le compare à la page qui l'intègre ; l'hôte de `NEXTAUTH_URL` casserait le lecteur en local et sur toute autre adresse) |
| Twitch (clip) | `clips.twitch.tv/SLUG`, `twitch.tv/<chaîne>/clip/SLUG` | `<iframe src="https://clips.twitch.tv/embed?clip=SLUG&parent={hôte}">` | Pas de moment : un clip est court |
| Medal | `medal.tv/…/clips/ID…` | **Lien externe** « Ouvrir sur Medal » (À VÉRIFIER : Medal propose peut-être un lecteur intégrable) | Affiché à côté (« à 1:35 ») |
| Discord (message) | `discord.com/channels/<serveur>/<salon>/<message>` | **Lien externe** « Ouvrir dans Discord » : tous les membres sont sur le serveur | Affiché à côté |
| Discord (fichier) | `cdn.discordapp.com/attachments/…`, `media.discordapp.net/…` | **Refusé** : ces liens sont signés et **expirent** (paramètres `ex=`/`hm=`). Message : « Les liens de fichiers Discord expirent au bout d'un jour environ : envoie plutôt le fichier ici. » | — |
| Autre | tout `https://` | Lien externe | Affiché à côté |

Le site n'envoie aucun en-tête `Content-Security-Policy` (ni `next.config.js` ni `middleware.ts` n'en
posent) : les `<iframe>` YouTube et Twitch ne demandent donc aucun réglage. Si une CSP arrive un jour, il
faudra y ouvrir `frame-src` à `www.youtube-nocookie.com`, `player.twitch.tv` et `clips.twitch.tv`.

### 10.2 Les fichiers : où, combien, comment

- **Où.** Sur un **volume Docker nommé**, `vanguard_videos`, monté sur `/app/data/videos` dans le service
  `web` et dans le service `bot` (pour la purge, §10.5). **Jamais dans `public/`**, qui est servi à tout
  le monde sans garde. Le chemin se règle par `VIDEOS_DIR` (facultative ; par défaut `/app/data/videos`,
  et `./data/videos` en local). On ajoute **`/data/`** à `.gitignore` et **`data`** à `.dockerignore`.
  *Contre-examen* : la révision 2 écrivait `data/` dans `.gitignore`. Sans barre initiale, ce motif
  ignore **tout** dossier nommé `data`, donc `src/data/` (les données du jeu, suivies par git) : chaque
  nouveau fichier qu'on y poserait serait ignoré sans bruit. Dans `.dockerignore`, les motifs partent de
  la racine du contexte : `data` n'y vise que `./data`.
- **La déclaration dans `docker-compose.prod.yml`** :

```yaml
  web:
    # … (inchangé)
    volumes:
      - vanguard_videos:/app/data/videos
  bot:
    # … (inchangé)
    volumes:
      - vanguard_videos:/app/data/videos

volumes:
  vanguard_db:
  vanguard_videos:
```

  Le conteneur tourne en `root` (le `Dockerfile` ne pose pas d'`USER`) : il peut écrire dans le volume
  sans réglage. Le volume **n'est pas** dans la sauvegarde de la base : il faudra le sauvegarder à part,
  si on y tient (`docker run --rm -v vanguard_videos:/v -v $PWD:/b alpine tar czf /b/videos.tgz -C /v .`).
- **La taille.** 100 Mo au plus par fichier, soit **104 857 600 octets**, contrôlés **côté serveur** à
  trois endroits :
  1. à la création de la ligne (route 15), sur la `taille` annoncée ;
  2. sur l'en-tête `Content-Length` (route 16), qui est obligatoire : 411 s'il manque, 413 s'il dépasse,
     **avant** de lire le moindre octet ;
  3. pendant l'écriture : on compte les octets reçus, et on coupe à 104 857 600 + 1 (fichier partiel
     effacé, 413). Le client peut mentir sur l'en-tête, le compteur non.
- **Le type.** `Content-Type` vaut `video/mp4` ou `video/webm` (sinon 415), **et** les premiers octets le
  confirment : pour MP4, `ftyp` aux octets 4 à 7, avec une marque `isom`, `iso2`, `iso5`, `iso6`, `mp41`,
  `mp42`, `avc1`, `M4V ` ou `dash` (on refuse `qt  `, le MOV de l'iPhone, que les navigateurs ne lisent pas
  partout) ; pour WebM, `1A 45 DF A3` aux octets 0 à 3. Le message de refus le dit : « Ce fichier n'est ni
  un MP4 ni un WebM. Exporte-le en MP4 (Medal, OBS ou l'appareil photo le font). »
- **L'envoi en deux temps.** La route 15 crée la ligne (`statut: "envoi"`), puis le navigateur envoie le
  fichier **brut** à la route 16, avec `XMLHttpRequest` : `fetch` ne donne pas l'avancement de l'envoi, et
  on veut une barre de progression. Côté serveur, la route 16 déclare `export const runtime = "nodejs"`
  et `dynamic = "force-dynamic"`, puis écrit le flux `req.body` par `Readable.fromWeb(req.body)` dans
  `<id>.part`, à travers un compteur. À la fin, elle renomme en `<id>.mp4` (ou `.webm`) et passe la ligne
  en `pret`. Rien n'est gardé en mémoire : pas de `req.formData()`, qui chargerait les 100 Mo d'un coup.
- **Le proxy.** Nginx Proxy Manager peut limiter la taille des requêtes (`client_max_body_size`). À
  vérifier à la mise en service : si l'envoi d'un fichier de 90 Mo répond 413 **avant** d'atteindre le
  site, on ajoute `client_max_body_size 110m;` dans l'onglet *Advanced* de l'hôte `vanguardhub.fr`.
- **La lecture.** La route 17 répond aux requêtes `Range` (206, `Content-Range`, `Accept-Ranges: bytes`)
  avec `fs.createReadStream(chemin, { start, end })`. Sans cela, le navigateur ne peut pas sauter à 1:35
  dans un MP4 sans tout télécharger. En-têtes : `Content-Type` (le `mime` en base), `Cache-Control:
  private, max-age=3600`, `X-Content-Type-Options: nosniff` et `Content-Disposition: inline`.

### 10.3 Qui envoie, qui voit, qui supprime

Recommandation (« À CONFIRMER PAR MAXIME », Q6) :

| Geste | Qui | Pourquoi |
|---|---|---|
| Joindre un **lien** | Tout membre de la guilde (`apiGuild`) **qui a participé** à la séance (participant, ou présent à la clôture), et le staff | Celui qui a filmé l'erreur, c'est souvent le joueur, de son point de vue |
| Envoyer un **fichier** | Les mêmes, dans la limite de **3 fichiers par membre et par séance**, et de **10 fichiers par séance** | Cela borne le disque sans brider le staff, qui n'a pas de limite par membre |
| Voir | Le staff et l'auteur, **tout de suite** ; tous les membres, **une fois le débrief publié** | La même règle que le débrief (`VueSeance.debrief`) |
| Modifier (titre, étape, moment) | L'auteur et le staff | — |
| Supprimer | L'auteur et le staff. La ligne **et** le fichier partent ensemble (route 19) | — |

Si le paramétrage coupe `videos.membres`, seul le staff peut joindre des vidéos. Un visiteur ou un
candidat n'y a jamais accès : toutes les routes sont derrière `apiGuild`.

**Les refus, en clair** : « Tu as déjà envoyé 3 vidéos pour cette séance. Supprimes-en une, ou mets-la
sur YouTube et colle le lien. » · « Cette séance a déjà 10 vidéos. » · « L'espace vidéo est plein (5 Go).
Le staff peut supprimer d'anciennes vidéos. » · « Il reste moins de 1 Go sur le disque du serveur : envoi
impossible pour l'instant. » (testé avec `fs.statfs(VIDEOS_DIR)`).

### 10.4 Dans la page du débrief

```
+------------------------------------------------------------------------------------+
| JOINDRE UNE VIDEO                                                                    |
|  Etape [2.2 Jumeaux — Kraavus & Kraavos   v]   Moment dans la video [ 1:35 ]         |
|  Titre [Aggro ratee sur Kraavos_______________]                                      |
|  ( ) Lien  [https://youtu.be/…_______________]                                       |
|  (o) Fichier [Choisir…] combat.mp4 — 64 Mo        [=========>        ] 58 %           |
|                                                         [Annuler] [Joindre]          |
+------------------------------------------------------------------------------------+
| LECTEUR (fenetre)                                                                    |
|  2.2 Jumeaux — Aggro ratee sur Kraavos · par Lina · a 1:35                           |
|  [ video 16:9, demarre a 1:35 ]                                                      |
|  [Ouvrir l'original]                         [Modifier] [Supprimer] (auteur / staff) |
+------------------------------------------------------------------------------------+
```

- **Le moment** se saisit comme un chrono (« 1:35 », « 95 », « 1m35 ») et se lit par `lireDuree` (§4.1).
  Pour un fichier, le lecteur est un `<video controls preload="metadata" src=".../fichier#t=95">`, et on
  pose aussi `currentTime = 95` à `loadedmetadata`, pour les navigateurs qui ignorent `#t=`.
- **Contrôles côté client, avant l'envoi** : taille (100 Mo au plus) et type. Ils évitent d'attendre un
  refus, mais ne remplacent pas ceux du serveur.
- **Sur téléphone**, le formulaire tient en une colonne, et le lecteur passe en plein écran.
- **Depuis Discord**, le lien d'une vidéo dans M7 ouvre la page avec `&video={id}` : la page ouvre ce
  lecteur directement, au bon moment.

### 10.5 Le nettoyage

Une tâche du bot, `purgerVideos`, tourne **chaque jour à 4 h 30** (heure de Paris), sur le volume monté
dans le service `bot` :
1. les **fichiers** des séances plus anciennes que `conservationJours` (180 jours par défaut) sont
   effacés, avec leur ligne. Les **liens**, qui ne coûtent rien, sont gardés ;
2. les lignes restées en `statut: "envoi"` depuis plus de 2 h (envoi abandonné) sont effacées, avec leur
   `.part` ;
3. les fichiers `*.part` de plus de 2 h, et les fichiers **sans ligne** de plus d'un jour (un crash entre
   l'écriture et la base), sont effacés ;
4. le bilan part dans le journal du bot : « Vidéos : 3 fichiers effacés (412 Mo), 1 envoi abandonné ».

Le quota (5 Go par défaut) se vérifie à chaque envoi, en additionnant `taille` sur les lignes `pret`
**et** sur les lignes `envoi` de moins de 2 h (leur taille annoncée) : sinon dix envois lancés en même
temps passeraient tous le contrôle et dépasseraient le quota ensemble. L'écran de paramétrage affiche
l'espace utilisé (§9.4).

---

## 11. Le Guild Siege

**Pour les joueurs.** Quand le staff l'active, le Guild Siege a ses séances, comme les Chambres : un
panneau « Je viens » sur Discord et sur le site, des rappels, la liste de qui vient avec ses chiffres, puis
un débrief court (gagné ou perdu, ce qu'il faut retenir, des vidéos). Il n'y a pas de postes : le Guild
Siege reste **libre**, comme le dit la page actuelle (« ramène ton meilleur perso, peu importe la
classe », `page.tsx:477`).

### 11.1 Ce qu'on sait, et ce qu'on ne sait pas

- **Ce que dit le dépôt.** La fiche `guildSiege.cadre` du wiki officiel (`faits-wiki-officiel.json`,
  `verifie: true`) : il a lieu **tous les jours**, les inscriptions ferment à **19 h** et à **22 h**, et
  le buff de Penyas vaut +5 % pour un participant et +15 % pour le gagnant.
- **Ce que fait le bot aujourd'hui.** Des rappels le vendredi et le samedi à 20 h, pour un samedi à 21 h
  pris par défaut, « l'HORAIRE RESTE A CONFIRMER » (`scheduler.ts:235-240`), sous l'interrupteur
  `gs_rappels_actifs`, coupé.
- **Ce que le dépôt ne dit pas**, et qui est donc « À CONFIRMER PAR MAXIME » (Q5) : le ou les jours où
  GENESIS joue ; l'heure ; si la guilde doit s'inscrire **avant** 19 h (ou 22 h), et qui le fait ; le
  nombre de joueurs par guilde ; et la forme du résultat (gagné ou perdu, ou un classement).

### 11.2 Ce qui s'applique aussi au Guild Siege

| Brique | Pour le GS | État |
|---|---|---|
| Créneaux | **Réglables** dans le paramétrage GS : une liste `{ jour, heure, finInscription }`. Aucun créneau par défaut. Proposition : samedi 21:00, fin d'inscription 19:00 | À CONFIRMER |
| Séance | `SeanceGuilde` avec `evenement: "gs"` et une clé `gs_2026-10-25_sam2100` | Prêt |
| Inscription | **« Je viens » libre**, sans poste ni « retenu ». Un perso par compte et par séance. Écrit dans `SeanceParticipant` (`annonceAt`, `present: null`), par la route 12 ou par le bouton Discord | Prêt. Plafond (`places`) : À CONFIRMER |
| Chiffres | Le chiffre de son stuff DPS, à défaut Tank, à défaut Off tank : `choisirStuff(stuffs, ["dps", "tank", "offtank"])` (ce n'est pas « le meilleur » : des PV et des DPS ne se comparent pas) | Prêt |
| Rappels | `veille` 20:00, le panneau GS, `@everyone` · `jour` `avant: { base: "debut", minutes: 60 }`, « ça commence dans 1 h », `@everyone` · `gs_staff` `avant: { base: "finInscription", minutes: 30 }`, dans le salon staff, sans mention : « 🏯 Pensez à inscrire la guilde au Guild Siege avant 19 h ». Ces deux-là se comptent depuis le créneau (champ `avant`, §9.2) : une heure fixe ne suivrait pas un créneau déplacé. Avec un créneau le samedi à 21 h, le rappel `jour` (20 h) tombe sur le panneau de la veille du dimanche : la règle « un seul `@everyone` par demi-heure » (§8.5) s'applique | Mécanique prête. Horaires et rappel staff : À CONFIRMER |
| Récap | Non : sans postes ni phases, le message H − 1 h liste déjà qui vient | — |
| Chrono | Non par défaut. Si le GS a des manches, le staff ajoute des étapes dans le paramétrage GS, et le chrono du §4.9 s'applique tel quel | À CONFIRMER |
| Clôture | La même (§4.8) : on coche qui était là. Elle met à jour `present` | Prêt |
| Débrief | **Simplifié** : résultat, « à retenir », remarques libres et vidéos. Pas d'étapes, sauf si le staff en ajoute. Publié en embed, sans image | Prêt. Forme du résultat : À CONFIRMER |
| Historique | Onglet Bilans, filtre « Guild Siege ». Participations et victoires comptées à part | Prêt |

### 11.3 Ce que ça donne

**L'onglet Guild Siege**, quand le paramétrage GS est actif :

```
+------------------------------------------------------------------------------------+
| GUILD SIEGE — samedi 25 octobre · 21 h            Inscription de la guilde avant 19 h |
| Libre : ramene ton meilleur perso, peu importe la classe.                            |
| [ Je viens avec : Kaelis (Arcaniste) v ]   [Pas cette fois]          9 annonces      |
|  <logo> Brann     Primat      9,4 M PV        <logo> Mira    Arcaniste  190 k/s       |
|  <logo> Thorn     Templier    150-210 k/s     <logo> Orin    Spadassin  sans mesure   |
|  …                                                                                   |
| (staff) [Cloturer] [Annuler la seance] [Publier le panneau sur Discord]              |
+------------------------------------------------------------------------------------+
| DERNIERS SIEGES : sam. 18 oct. GAGNE · 11 presents · 1 video   [voir le debrief]     |
+------------------------------------------------------------------------------------+
```

**Le panneau GS sur Discord** (couleur or clair) :

```
@everyone
┃ 🏯 Guild Siege — samedi 25 octobre · 21 h
┃ ⏰ Demain à 21 h. C'est libre : ramène ton meilleur perso, peu importe la classe.
┃ 👥 9 annoncés
┃ ✅ <Primat> Brann ❤️ 9,4 M · <Arcaniste> Mira 💥 190 k/s · <Templier> Thorn 💥 150 k – 210 k/s · …
┃ GENESIS · Guild Siege
[✅ Je viens] [❌ Pas cette fois] [🌐 Ouvrir le site]
```

**Le débrief GS publié** :

```
┃ 📝 Retour du Guild Siege — samedi 25 octobre
┃ 🏆 GAGNÉ · 👥 11 présents
┃ 📌 À retenir : …
┃ 🎬 Vidéos (1) : Prise du fort nord (Thorn, à 3:10)
[🌐 Lire le débrief sur le site]
```

---

## 12. Recensement

### 12.1 La page

**Pour les joueurs.** On voit, pour chaque personnage de la guilde, ce que donne son stuff : son DPS
mesuré sur le totem de l'Oasis, ou ses PV. On filtre une classe ou un rôle, on trie par chiffre, et on
repère d'un coup d'œil les mesures à refaire. Son propre perso porte un lien direct vers l'AirBuilder.

```
+------------------------------------------------------------------------------------+
| RECENSEMENT                     54 personnages · 41 mesures · 6 a remesurer          |
| Classe [Toutes v] [Arca][Envo][Templ][Spad][Sylph][Arba][Primat][Chan]               |
| Role   [Tous] [DPS] [Off tank] [Tank]     [ ] a remesurer   [ ] sans mesure   [Q___] |
+------------------------------------------------------------------------------------+
| TANK                                                                                 |
|  Perso         Classe     Joueur   Chiffre        Mesure le           Poste CS  Build |
|  Brann         Primat     Maxime   9,4 M PV poing 12/10               p1        [->]  |
|  Ysolde        Primat     Lina     6,1 M PV poing 02/09 [a remesurer] p2        —     |
| OFF TANK                                                                             |
|  …                                                                                   |
| DPS                                                                                  |
|  Mira          Arcaniste  Sol      190 k/s  Bulle 48 k   15/10        m1        [->]  |
|  Thorn         Templier   Tom      150 k – 210 k/s       01/10        d1        —     |
|  Orin          Spadassin  Nox      sans mesure                         d3        —     |
+------------------------------------------------------------------------------------+
| Tes chiffres sont faux ou vieux ? Mets-les a jour dans l'AirBuilder ->               |
+------------------------------------------------------------------------------------+
```

- **Une ligne par personnage et par rôle mesuré.** Un Primat qui a un stuff Tank et un stuff Off tank a
  deux lignes. Un personnage sans aucun stuff mesuré a une ligne « sans mesure », sans rôle. On ne peut
  trier que ce qu'on voit.
- **Les colonnes** : Perso (logo de classe et nom), Classe (libellé de `CLASSES`), Joueur
  (`User.username`), Niveau et prestige (`Character.level` et `prestige`, au survol), Chiffre (principal et
  détail, §4.2), Poudres, buffs et conditions (pastilles discrètes, détail au survol), Mesuré le (date
  courte, et « à remesurer » en or quand `aRemesurer`), État (« à renseigner » en crimson quand
  `complet === false`), Poste CS (le libellé du poste de son inscription, s'il en a une) et Build (le lien).
- **Les filtres** : les 8 classes (en puces), le rôle (DPS, Off tank, Tank), « à remesurer seulement »,
  « sans mesure ou incomplet », et une recherche sur le perso ou le joueur. Ils se lisent dans l'URL
  (`?classe=Arcaniste&role=dps&vieux=1`), pour qu'on puisse envoyer un lien. `/recensement classe:` sur
  Discord (§8.4) mène à cette URL filtrée.
- **Le tri par défaut** groupe par rôle (Tank, Off tank, DPS, puis sans mesure) et trie par chiffre
  décroissant dans chaque groupe. On ne mélange jamais des PV et des DPS dans un même tri. Un clic sur
  l'en-tête « Chiffre », « Mesuré le » ou « Perso » change le tri à l'intérieur des groupes.
- **Le lien vers le build** suit les droits réels de `/api/builder-state` (piège n° 5) :
  - pour le staff : `/builder/{userId}` ;
  - pour **mon** personnage : `/builder` ;
  - pour un autre membre : `/build/{shareId}` si son build est partagé (`User.sharePublic`), et sinon aucun
    lien, avec « build privé » au survol.
- **Sur téléphone** (moins de 720 px), le tableau devient une liste de cartes : en haut le perso et sa
  classe, au milieu le chiffre en grand, en bas la date et le lien. Le défilement se fait sur `.vg-main`
  (note de la refonte du front).

### 12.2 La route `GET /api/recensement`

La garde est **`apiGuild`** : membres seulement. Un compte connecté mais RECRUE reçoit 403 « Réservé aux
membres de la guilde. » (`access.ts:150-156`).

```ts
// Qui : les personnages des comptes de la guilde (canAccessGuild(user.role) && user.isActive).
const persos = await prisma.character.findMany({
  where: { user: { isActive: true, role: { in: GUILD_ROLES } } },
  select: { name: true, class: true, level: true, prestige: true,
            user: { select: { id: true, username: true, sharePublic: true, shareId: true } },
            gearProfiles: { select: { mesures: true } } },        // RIEN d'autre du stuff
});
// Réponse — uniquement ce qui s'affiche :
type LigneRecensement = {
  perso: string; classe: string; joueur: string; niveau: number; prestige: number;
  role: "dps" | "offtank" | "tank" | null;
  chiffre: number | null;                   // clé de tri (§4.2)
  texte: string | null;                     // « 182 k/s », « 9,4 M PV »
  detail: string | null;                    // « Bulle 45 k », « poing »
  poudres: string[]; buffs: string[]; avec: string[];   // libellés des cases cochées
  mesureLe: number | null; aRemesurer: boolean; complet: boolean | null;
  posteCS: string | null;                   // libellé du poste de l'inscription du même pseudo
  lienBuild: string | null;                 // calculé côté serveur selon l'appelant (§12.1)
  moi: boolean;
};
return NextResponse.json({ maintenant: Date.now(), lignes });
```

On ne renvoie **jamais** les colonnes `stats`, `weapon`, `armor`, `jewelry`, `pets` ou `cards`, ni
`userId`, `discordId` ou `builderBlob`. Le `userId` n'apparaît que dans `lienBuild`, et seulement pour le
staff, qui l'a déjà.

### 12.3 Les chiffres dans la composition (et dans le panneau Discord)

- **Où on les lit.** `GET /api/compositions/comparatif`, déjà appelée après chaque chargement de la page
  (`page.tsx:72-75`), gagne un champ `mesures: { [pseudo en minuscules]: { tank?: Chiffre; offtank?:
  Chiffre; dps?: Chiffre } }`. On le calcule pour tous les pseudos des inscriptions **et** des annonces de
  la séance, en une seule requête : `character.findMany({ where: { OR: noms.map(n => ({ name: { equals:
  n, mode: "insensitive" } })) } })`. Le bot calcule les mêmes chiffres pour le panneau, par
  `participantsSeance` (§12.5).
- **Le choix du stuff, quand un perso en a plusieurs** : celui dont le rôle correspond au poste, dans
  l'ordre de préférence `slot.cs.mesure` (§2.3), puis selon les règles de `choisirStuff` (§4.2). Pour un
  annoncé sans poste, on prend le premier poste de sa classe dans `CS_SLOTS`.
- **Au passage, on corrige** `comparatif/route.ts:35-38`, qui retrouve les personnages par `charId`. Ce lien
  casse à chaque synchro de l'AirBuilder (piège n° 1), et les écarts au build de référence disparaissent
  alors sans bruit. On les retrouve par **pseudo**, comme les mesures.
- **Les homonymes** (contre-examen). Le nom est unique en jeu, pas en base : `Character.name` n'a aucune
  contrainte d'unicité, et un candidat peut déclarer un perso du même nom qu'un membre. Quand une
  recherche par nom rend plusieurs personnages, on prend celui du compte de l'inscription ou de l'annonce
  (`userId` du §5.3, sinon le `User.username` égal à `player`), puis un compte de la guilde
  (`GUILD_ROLES`, `isActive`), et jamais un compte RECRUE.

### 12.4 Le lien avec la rubrique Suivi de `/staff`

L'espace des bras droits aura une rubrique **Suivi** : stuff, mesures, classes de la guilde, dégâts.
Aujourd'hui elle est vide : `nav.ts:240-243` dit qu'elle « reviendra avec la page qui la remplace ». Le
recensement en est la source, et on ne duplique rien :
- **la page de la rubrique** (celle que prépare le chantier `/staff`) lit la vue résumée ci-dessous, et
  renvoie vers `/recensement` pour le détail. On ne déclare pas une deuxième entrée `/recensement` dans
  `nav.ts` : une adresse appartient à un seul espace ;
- **une vue résumée**, `GET /api/recensement?vue=resume` (même garde), donne à `/staff` ses chiffres sans
  recalcul : `{ parClasse: [{ classe, persos, mesures, aRemesurer, incomplets, dpsMedian, pvMedian }],
  parRole: {...}, aRelancer: [{ joueur, perso, raison: "incomplet" | "a_remesurer" | "sans_mesure" }] }`.
  `aRelancer` n'est renvoyé qu'au staff ;
- **sur `/recensement`, le staff voit en plus** le filtre « comptes sans aucun perso mesuré » et, dans la
  colonne Joueur, un lien vers son dossier du GuildViewer (`/guildviewer?dossier={userId}`).
  *Contre-examen* : ce paramètre n'existe pas. Le GuildViewer ouvre le dossier par un état local
  (`useState`, `guildviewer/page.tsx:39`, bouton `:152`) et ne lit aucun paramètre d'adresse. Il faut
  lui faire lire `?dossier=` au chargement (chantier GuildViewer, mené en parallèle par un autre agent) ;
  tant que ce n'est pas fait, le lien mène à `/guildviewer` tout court.

### 12.5 Retrouver les participants (site et bot)

`participantsSeance(db, seance, etat)` vit dans `src/lib/seances-serveur.ts` et sert au site comme au
bot :

```ts
export async function participantsSeance(db, seance, etat: CompoState) {
  const annonces = presencesSeance(etat, seance).sort((a, b) => a.ts - b.ts); // ordre d'annonce
  const retenus = annonces.filter(p => p.retenu);
  const base = retenus.length ? retenus : annonces;                          // §2.4, Q3
  // Le personnage et son compte, par le NOM (unique en jeu, pas en base : homonymes, §12.3). Jamais par
  // charId : il change à chaque synchro de l'AirBuilder (piège n° 1). Presence.player n'est qu'un
  // départage : c'est le User.username du jour de la connexion, qui peut avoir vieilli (piège n° 2).
  // Avec userId (§5.3), le compte est connu sans nom du tout.
  const persos = await db.character.findMany({
    where: { OR: base.map(p => ({ name: { equals: p.pseudo, mode: "insensitive" } })) },
    select: { name: true, class: true, userId: true,
              user: { select: { discordId: true, username: true, role: true } },
              gearProfiles: { select: { mesures: true } } },
  });
  // Le poste : l'inscription du même pseudo, titulaire d'abord.
  // Le rôle par phase : slot.cs (§2.3) ; sans poste, le premier poste de la classe.
  // Le chiffre : choisirStuff(gearProfiles, slot.cs.mesure, now) (§4.2).
  …
}
```

Un participant sans compte retrouvé reste dans la liste. Le bot écrit alors son nom en gras, au lieu de
le mentionner.

---

## 13. Pièges connus (vérifiés dans le code les 2026-10-20 et 21)

1. **`Signup.charId` devient orphelin à chaque synchro de l'AirBuilder.** `/api/characters/sync` efface
   tous les personnages du compte, puis les recrée (`sync/route.ts:47-49`) : leurs `id` changent. Tout lien
   vers un personnage passe donc par son **nom**, insensible à la casse.
2. **`Presence.player`, c'est l'identifiant Discord, et il peut vieillir.** La page écrit `meName =
   discordName ?? username ?? session.user.name` (`page.tsx:21`) ; la session ne porte ni `discordName`
   ni `username` (`src/lib/auth.ts:162-170`), donc c'est `session.user.name`. *Contre-examen* : la
   révision 2 en déduisait « le nom affiché par Discord ». C'est faux : le fournisseur Discord de
   next-auth 4.24 fait `name: profile.username` (`node_modules/next-auth/providers/discord.js:25`), et
   `User.username` vaut `p.username ?? p.global_name` (`auth.ts:100`). `Presence.player` est donc le
   `User.username` **du jour de la connexion** : la route `/api/compositions/presences`, qui cherche
   `User.username` (`presences/route.ts:34-37`), a raison. Le piège réel est ailleurs : un membre qui
   change d'identifiant Discord garde l'ancien dans ses annonces jusqu'à sa prochaine connexion. Pour les
   mentions et l'historique, on part donc du **`userId`** quand il existe (§5.3), sinon du **nom du
   personnage**. Le bot écrit `player = user.username`, lu en base (§4.12).
3. **Le rappel CS existant compte des annonces périmées.** Il utilise `presencesDu`, qui ne filtre que le
   créneau, sans fenêtre de dates (`scheduler.ts:64-67`), et `resumeManques` passe par le même
   `presencesDu`. La page, elle, utilise `presencesSeance`. Le lot 3 corrige le bot.
4. **L'heure du serveur, c'est UTC.** Ni le `Dockerfile` ni `docker-compose.prod.yml` ne posent `TZ`.
   `prochaineSeance()` calcule avec `getDay()` et `setHours(21)` à l'heure locale
   (`compositions.ts:172-195`). Sur le serveur, « 21 h » tombe donc à 23 h à Paris en été. Tout calcul de
   séance côté serveur ou bot passe par les helpers de Paris (§2.5). `node-cron`, lui, est déjà réglé sur
   Paris (`CRON_TZ`, `helpers.ts:28`).
5. **Voir le build d'un autre est réservé au staff.** `/builder/[user]` n'exige que la guilde, mais l'API
   qu'il appelle, `/api/builder-state?user=`, renvoie 403 à un membre qui n'est pas du staff
   (`builder-state/route.ts:22-24`). Un lien `/builder/{id}` montré à un membre mène donc à une erreur.
6. **« Ils étaient là » ne crédite rien.** La route compte les joueurs et renvoie `credites`, sans rien
   écrire (`presences/route.ts:41-49`). Elle lit aussi toutes les annonces du créneau, sans fenêtre de
   dates (`:29`). La clôture du §4.8 la remplace, et dit ce qu'elle fait réellement : « 10 présences
   enregistrées ».
7. **Le bot ne peut pas importer `server-only`.** Sous `tsx`, sans la condition `react-server`, ce paquet
   lève une exception à l'import. `chambres.ts`, `evenements.ts`, `recensement.ts`, `seances-serveur.ts`,
   `compositions-serveur.ts` et `seance-image.ts` ne l'importent donc pas.
8. **Sharp, les polices et Pango.**
   - **Testé le 2026-10-20**, avec sharp 0.34.5 sur macOS : un SVG en `font-family="Cinzel"`, comme une
     entrée texte avec `fontfile: public/fonts/Cinzel-VariableFont_wght.ttf`, s'affichent tous deux **en
     Helvetica**, sans aucune erreur. Même chose avec un `FONTCONFIG_FILE` qui pointe vers le dossier des
     polices. Sur macOS, Pango passe par CoreText et ignore fontconfig.
   - Sous Linux (l'image Docker), Pango passe par fontconfig. L'image `node:20-bookworm-slim` n'a **ni
     fontconfig ni police**.
   - Le lot 7 ajoute donc au `Dockerfile` : `apt-get install -y --no-install-recommends openssl
     fontconfig`, puis `COPY public/fonts/Cinzel-VariableFont_wght.ttf public/fonts/Athiti-*.ttf
     /usr/local/share/fonts/genesis/`, puis `RUN fc-cache -f`. Cinzel est une police **variable** : il
     faut vérifier que « Cinzel Bold » en sort bien la graisse 700.
   - Il faut ensuite **regarder** une image d'essai rendue dans le conteneur, avec `docker compose -f
     docker-compose.prod.yml run --rm bot npx tsx scripts/essai-image-debrief.ts`, avant de publier quoi
     que ce soit.
   - `sharp` n'est qu'une dépendance **transitive** (optionnelle de `next`) : elle manque dans
     `package.json`. Le lot 7 l'y ajoute, en version `0.34.5`, sinon une mise à jour de Next pourrait
     l'emporter avec elle.
9. **Échapper le texte libre.** Les remarques et « à retenir » entrent dans du balisage Pango et SVG
   (§4.11). Dans les embeds, la coupe à 1 024 caractères doit tomber hors d'un mot.
10. **Ne rien écrire dans `CompositionState("main")` depuis les nouveaux onglets** (§5.2). La page
    actuelle renvoie l'état entier à chaque clic : une écriture concurrente s'y perd. Le bot n'y écrit que
    par `modifierCompo`, et seulement après le correctif `lu` du PUT (§5.4).
11. **Deux bots, deux `@everyone`.** Le bot Python doit être arrêté **avant** d'allumer
    `nouveauxMessages` (§8.10). Ses rappels partent pour toute Chambre ouverte par `/chambre`
    (`bot.py:1713-1748`).
12. **Un événement « Chambres Secrètes » dans `/events` ferait doublon.** `tickEvents` annonce tout
    `GameEvent` actif (`scheduler.ts:148-164`), et `bot/config.ts:110-111` en montre deux pour les
    Chambres, avec un rappel 15 min avant. Ce tableau n'est plus lu par le bot, mais si le staff a recréé
    ces événements sur `/events`, il faut les désactiver à la bascule.
13. **Le middleware tronque les gros corps.** Next 15.5.19 limite à 10 Mo le corps d'une requête que le
    middleware intercepte (`middlewareClientMaxBodySize: 10485760`,
    `node_modules/next/dist/server/config-shared.js:220`). Le `matcher` actuel ne couvre aucune route
    `/api` (`middleware.ts:59-67`) : il ne faut **jamais** y ajouter `/api/videos`, sinon l'envoi d'un
    fichier de 50 Mo arriverait coupé à 10 Mo.
14. **Les liens de fichiers Discord expirent** (paramètres signés `ex=`, `is=`, `hm=`) : on les refuse
    (§10.1).
15. **Les mentions dans les textes saisis.** Un texte du paramétrage contenant « @everyone » notifierait
    toute la guilde. On le retire à la normalisation, et chaque envoi passe un `allowedMentions` explicite.
16. **Trois secondes pour répondre à Discord.** Un bouton qui lit la base doit appeler `deferReply` ou
    `deferUpdate` d'abord. Sinon, Discord affiche « Échec de l'interaction ».
17. **`bot/index.ts` ne traite pas les menus déroulants.** Il n'y a que les commandes et les boutons
    (`index.ts:40-70`). Il faut ajouter la branche `isStringSelectMenu()`.
18. **Les commandes slash ne s'enregistrent pas seules.** Après l'ajout de `/chambre` et `/recensement`,
    il faut relancer `bot/deploy-commands.ts` : `docker compose -f docker-compose.prod.yml run --rm bot
    npx tsx bot/deploy-commands.ts`.
19. **Les limites de débit de Discord.** On ne modifie un message que si son contenu a changé, au plus une
    fois toutes les 15 s (10 s pour le chrono). Un message qui change à chaque seconde se ferait bloquer.
20. **`data/` dans `.gitignore` ignore aussi `src/data/`** (ajouté au contre-examen, vérifié avec `git
    check-ignore`). Le motif sans barre initiale vaut à toute profondeur : on écrit `/data/` (§10.2).
21. **Arrêter un bot ne retire pas ses commandes slash** (ajouté au contre-examen). Celles du bot Python
    restent affichées et échouent tant que son application n'est pas retirée du serveur (§8.10).
22. **Le serveur Discord n'est pas la guilde** (ajouté au contre-examen). Visiteurs et candidats y sont
    aussi (rôle Vérifié(e)). Un bouton ou une commande qui montre des données de membres vérifie
    `canAccessGuild` en base, et les chiffres ne sont publiés que dans un salon fermé à `@everyone` (§2.6,
    §8.3).

---

## 14. Les lots de réalisation

Chaque lot peut être livré seul, dans l'ordre conseillé ci-dessous, et chacun se vérifie de la même
façon :
- `npx tsc --noEmit` ;
- `npm run build` ;
- les fonctions pures, avec un script `scripts/verifier-seances.ts` lancé par `tsx`, qui appelle
  `node:assert` sur des cas tirés de ce document. Le dépôt n'a pas de framework de test, et ce script n'en
  ajoute pas.

### Lot 1 : le recensement (aucun changement de base)
- **Pour les joueurs** : la page `/recensement`, et les chiffres à côté des noms dans l'onglet
  Inscription, avec les témoins « à remesurer » et « sans mesure ».
- **Fichiers** :
  - `src/lib/recensement.ts` (§4.1, §4.2) ;
  - `src/app/api/recensement/route.ts` (§12.2, avec `?vue=resume`) ;
  - `src/app/(guild)/recensement/page.tsx` (§12.1) ;
  - `slots.ts` : le champ `cs` (§2.3) ;
  - `comparatif/route.ts` : le champ `mesures`, et la correction du lien par pseudo (§12.3) ;
  - `compositions/page.tsx` : l'affichage (§7.2) ;
  - **`nav.ts`** et `middleware.ts` : l'entrée Recensement (§7.7).
- **À vérifier** :
  - un Primat qui a des stuffs Tank et Off tank affiche ses deux PV (sceptre puis poing) sur p1, et ses
    PV en sceptre sur p2 (§2.3) ;
  - une mesure du 01/09, consultée le 20/10, est « à remesurer » ;
  - un RECRUE reçoit 403 sur `/api/recensement` ;
  - la réponse ne contient aucune colonne `stats`.

### Lot 2 : le socle des séances et le paramétrage
- **Pour les joueurs** : le staff enregistre qui était vraiment là, et chacun voit ses participations dans
  l'onglet Bilans (la liste des séances, pas encore de débrief). Le staff dispose de l'écran de paramétrage
  (étapes, salles, consignes ; les rappels s'y affichent, mais ne changent rien avant le lot 3).
- **Fichiers** :
  - `prisma/schema.prisma` : les **quatre** modèles du §5.1, d'un coup, pour n'avoir qu'un `db push` ;
  - `src/lib/evenements.ts` : types, heures de Paris, clé de séance, paramétrage et normalisation ;
  - `src/lib/seances-serveur.ts` : `majSeance` et `participantsSeance` ;
  - les routes 1, 2, 4 (séance et participants), 9, 10 et 13 ;
  - `/discord/evenements` (§9.4), le lien depuis `/discord`, et **son entrée dans `nav.ts`** (§7.7) ;
  - les onglets Inscription (« Ils étaient là » ouvre la clôture) et Bilans ;
  - le renfort facultatif `userId` dans `PUT /api/compositions` (§5.3).
- **À vérifier** :
  - `prisma db push` n'annonce **aucune** perte de données ;
  - une clôture faite le mercredi à 22 h vise bien le mercredi, et non le dimanche ; **une clôture faite
    le jeudi à 9 h aussi** (`cs_derniere`, §2.5) ;
  - `/discord/evenements` apparaît dans le plan du site pour un Officier, et pas pour un Vétéran ;
  - une deuxième clôture remplace les lignes, sans les doubler ;
  - deux enregistrements du paramétrage avec la même version : le second reçoit 409.

### Lot 3 : notre bot reprend l'inscription et les rappels
- **Pour les joueurs** : le panneau d'inscription vivant la veille à 20 h, « Je viens » et « Pas cette
  fois » sur Discord, le choix du perso et du poste, puis les rappels de 13 h 30, 18 h 30 et 20 h, réécrits.
  Tant que `nouveauxMessages` est coupé, seuls les deux rappels existants partent, sous leur nouvelle forme.
- **Fichiers** :
  - `bot/lib/seances.ts` : `tickSeances`, `synchroniserMessages`, les messages M1 à M4, M8, M9 et M12, et
    les boutons ;
  - `bot/index.ts` : les branches boutons et menus (§8.1) ;
  - `bot/scheduler.ts` : le tick à la place des tâches fixes, et la correction de `presencesSeance` ;
  - `bot/lib/botcommands.ts` : `seance_publier`, `seance_fermer`, `seance_annulation` et `evenement_essai` ;
  - `src/lib/compositions-serveur.ts` (`modifierCompo`), et le correctif `lu` du GET et du PUT de
    `/api/compositions` (annonces **et** inscriptions), plus la page qui renvoie `lu` et date ses
    inscriptions (`Signup.ts`, §5.3-5.4) ;
  - `compositions.ts` : `phraseManques(liste)`, et `ts` / `userId` gardés par `normaliserCompo` ;
  - les routes 3 et 11 ;
  - `bot/commands/chambre.ts` (`panneau`, `historique`, `cloturer`, `debrief`) et `/aide` ;
  - `src/app/(admin)/discord/page.tsx` : les libellés des cinq nouveaux types de commande (§6) ;
  - `bot/lib/botcommands.ts` : `syncGuildChannels` écrit aussi `Setting("salons_publics")` (§9.3) ;
  - `bot/config.ts`, `.env.example` et `bot/README.md` : `CHANNEL_CS`, `CHANNEL_CS_DEBRIEF`, `CHANNEL_GS`.
- **À vérifier** :
  - interrupteur général coupé : rien ne part ;
  - séance annulée : rien ne part, et M8 part si le paramétrage le prévoit ;
  - effectif complet : pas de message à 13 h 30 ;
  - le rappel de 18 h 30 supprime celui de 13 h 30 ;
  - un bot redémarré à 13 h 34 envoie le rappel de 13 h 30, et à 13 h 41 il ne l'envoie plus ;
  - deux bots lancés en même temps n'envoient qu'un message ;
  - une annonce faite sur Discord, puis un clic sur le site 5 s plus tard par un autre membre :
    l'annonce reste ; **un poste choisi dans le menu Discord aussi** (`Signup.ts`, §5.4) ;
  - une annonce faite sur Discord s'affiche « Je suis annoncé·e » sur le site pour son auteur (`player =
    user.username`, §4.12) ;
  - un compte RECRUE qui clique « Je viens » ou tape `/recensement classe:Arcaniste` reçoit le ⛔ ;
  - dans un salon visible de `@everyone`, le panneau part sans chiffres ;
  - avec un Guild Siege le samedi à 21 h, un seul `@everyone` part le samedi à 20 h ;
  - un compte avec deux Arcanistes reçoit le menu à choix multiple, et ses deux annonces se voient sur le
    site ;
  - chaque message d'essai arrive dans le salon des essais, sans mention.

### Lot 4 : la répartition des phases, le récap et « Mes positions »
- **Pour les joueurs** : l'onglet Répartition. On prend ses salles et son équipe de jumeaux, on voit les
  golems, les rotations de l'araignée et le récap tel qu'il partira. Le récap arrive à 20 h 40 et se met à
  jour. 📍 Mes positions répond sur Discord.
- **Fichiers** :
  - `src/lib/chambres.ts` : §4.3, §4.4 (sans « équilibrer ») et §4.6 ;
  - les routes 4 (partie répartition) et 5 (sans `equilibrer`, `demander` ni `repondre`) ;
  - l'onglet Répartition (§7.3) ;
  - `bot/lib/seances.ts` : M5 et M10 ; `bot/commands/chambre.ts` : `recap` et `positions`.
- **À vérifier, avec la compo type de 10** :
  - golems à 5 contre 5, avec un Primat et un Arcaniste de chaque côté ;
  - rotations sans doublon de classe (la compo type n'a que deux Arcanistes, un par rotation) ; puis,
    avec un troisième Arcaniste retenu sur le poste optionnel m3, celui-ci passe en réserve ;
  - un membre ne peut pas placer le perso d'un autre (403) ;
  - deux clics simultanés sur la même salle : un seul l'obtient ;
  - une salle changée sur le site après 20 h 40 se voit dans le récap Discord en moins de 30 s.

### Lot 5 : le chrono en direct
- **Pour les joueurs** : l'onglet Chrono et le message du chrono dans Discord. Le staff valide chaque étape
  d'un clic, d'un côté ou de l'autre, et les autres voient le temps défiler.
- **Fichiers** :
  - `src/lib/chambres.ts` : §4.9 et `ETAPES_CS_DEFAUT` ;
  - la route 6, et la réponse allégée de la route 4 (`?partie=chrono`) ;
  - l'onglet Chrono (§7.4) ;
  - `bot/lib/seances.ts` : M6 et ses boutons ; `bot/commands/chambre.ts` : `chrono`.
- **À vérifier** :
  - les étapes sont figées au démarrage ;
  - « Annuler » défait un « Arrêter » ;
  - un clic sur le site et un clic sur Discord au même instant ne créent qu'une seule fin ;
  - un non-staff qui clique sur Discord reçoit le refus éphémère ;
  - une horloge de téléphone avancée de 2 min affiche le bon temps.

### Lot 6 : les débriefs (sur le site)
- **Pour les joueurs** : le débrief étape par étape (staff), l'analyse comparée à la séance précédente, et
  la lecture des débriefs publiés (tous les membres).
- **Fichiers** :
  - `src/lib/chambres.ts` : §4.1 (durées) et §4.10 ;
  - la route 7, et la route 8 en mode « marquer publié » sans Discord, tant que le lot 7 n'est pas livré ;
  - l'onglet Bilans (§7.5).
- **À vérifier** :
  - « 2m34 », « 1:02:03 », « 45 » et « 1h02 » donnent 154, 3 723, 45 et 3 720 s ;
  - une saisie vidée fait revenir la mesure du chrono ;
  - pas de record au premier débrief, ni sur un chrono arrêté avant la fin (§4.10, point 3) ;
  - « mal deux fois de suite » ne compare qu'avec la dernière séance **publiée** et antérieure.

### Lot 7 : l'image et la publication sur Discord
- **Pour les joueurs** : le débrief arrive sur Discord, en une image lisible sur téléphone, avec le lien
  vers la page.
- **Fichiers** :
  - `src/lib/seance-image.ts` (§4.11) ;
  - `bot/lib/seances.ts` : `publierDebrief` (M7) ; `bot/lib/botcommands.ts` : la branche `seance_debrief` ;
  - la route 8 complète, et la route 14 (aperçu) ;
  - `Dockerfile` : fontconfig et les polices (piège n° 8) ; `package.json` : `sharp` ;
  - `scripts/essai-image-debrief.ts`, qui rend une image à partir d'un jeu de données fixe.
- **À vérifier** :
  - **regarder** l'image rendue **dans le conteneur** : elle doit être en Cinzel et en Athiti ;
  - une remarque contenant « <b> & co » s'affiche telle quelle ;
  - la publication dans un salon forum crée un fil ;
  - un salon sans droits fait passer la commande en `FAILED`, avec la raison, et le site l'affiche.
- **Après ce lot** : la bascule (§8.10). Le bot Python peut s'arrêter.

### Lot 8 : les vidéos de débrief
- **Pour les joueurs** : on joint un lien ou un fichier à une étape, avec un moment, et on le lit au bon
  endroit. Les vidéos sont listées dans le débrief Discord.
- **Fichiers** :
  - les routes 15 à 19 ;
  - `lireLienVideo` dans `src/lib/evenements.ts` (§10.1) ;
  - le formulaire et le lecteur dans l'onglet Bilans (§10.4) ;
  - `bot/lib/seances.ts` : `purgerVideos` (§10.5), et le bloc 🎬 de M7 ;
  - `docker-compose.prod.yml` : le volume `vanguard_videos` ; `.gitignore` : `/data/` (avec la barre,
    §10.2) ; `.dockerignore` : `data`.
- **À vérifier** :
  - un fichier de 101 Mo est refusé, même avec un `Content-Length` menteur ;
  - un `.mov` renommé en `.mp4` est refusé (marque `qt  `) ;
  - une vidéo de 80 Mo se lit à partir de 1:35 **sans** tout télécharger (206 dans l'onglet réseau) ;
  - un membre ne voit pas la vidéo d'un autre avant la publication du débrief ;
  - après la suppression d'une vidéo, le fichier a disparu du volume ;
  - un envoi interrompu à 50 % ne laisse rien, deux heures plus tard.

### Lot 9 : le Guild Siege
- **Pour les joueurs** : quand le staff l'active, le Guild Siege a son panneau, ses rappels, sa liste de
  qui vient, sa clôture et son débrief court.
- **Fichiers** :
  - le paramétrage GS (§9.2) ;
  - la route 12 ; l'onglet Guild Siege (§11.3) ; le filtre GS de Bilans ;
  - `bot/lib/seances.ts` : le panneau GS, les rappels `gs_staff`, et le débrief GS.
- **Dépendance** : les réponses de Maxime à la question Q5.
- **À vérifier** : un compte ne peut annoncer qu'un perso par séance de GS ; avec le paramétrage GS
  inactif, l'onglet reste « En standby ».

### Lot 10 (facultatif) : les échanges, l'équilibrage, la reprise de l'historique
- **Pour les joueurs** : on demande la place d'un autre, qui accepte ou refuse, et le staff équilibre les
  deux équipes des jumeaux d'un clic. L'historique du bot Python est repris, s'il existe.
- **Fichiers** :
  - `src/lib/chambres.ts` : §4.5 et « équilibrer » (§4.4) ;
  - la route 5 (actions `equilibrer`, `demander` et `repondre`) ;
  - `src/lib/typesNotif.ts` : le type `"chambre"` ;
  - le bandeau des demandes dans l'onglet Répartition ;
  - `scripts/importer-dracarys.ts` (§8.10).
- **À vérifier** :
  - une demande expire au bout d'1 h ;
  - une acceptation après qu'une place a changé est refusée, avec le message du modèle ;
  - l'équilibrage donne un écart de DPS inférieur à 10 % sur la compo type ;
  - l'import, lancé deux fois, ne double rien (clé `cle` de la séance).

---

## 15. Questions à confirmer par Maxime

Chaque question a une option recommandée. Tant que Maxime n'a pas répondu, c'est elle qui est codée.

**Q1. Les étapes du chrono et du débrief, et leurs noms.**
On reprend les 13 étapes de Dracarys sous nos noms : « Jumeaux — Kraavus & Kraavos », « Dra'Zhul gauche »
et « Dra'Zhul droite », « Nyzzara », « Gor'Thar » et « Aatrox » (§3.2). Trois points restent incertains :
- « Double boss Gor'Thar » veut-il dire 2 barres ou 2 exemplaires ?
- la Statue d'invocation Maléfique compte-t-elle comme une étape ?
- les deux Dra'Zhul : le modèle les traite comme les « golems » gauche et droite (`bot.py:877-878`,
  `:1682`), mais notre relevé n'en a qu'un identifiant. Est-ce bien deux exemplaires ?

*Recommandé : la liste du §3.2 telle quelle, sans étape pour la Statue, avec l'orthographe du client
(Nyzzara). On corrigera dans le paramétrage après la première séance chronométrée.*

**Q2. Le rôle des deux Primats, phase par phase.**
Les valeurs par défaut :
- p1 et p2 tankent chacun une équipe des jumeaux, et chacun un golem ;
- p2 fait partie des rotations de debuff de l'araignée, p1 non ;
- la compo affiche les deux PV de p1 (sceptre pour les boss, poing pour le boss final, comme le dit son
  build, `slots.ts:6`), et les PV en sceptre pour p2 ;
- un Primat en DPS compte comme magique (sa mesure se fait « à la Boulette »). Le modèle, lui, le
  laissait prendre une place magique **ou** physique chez les jumeaux (`bot.py:752`, `:784`) : dis-nous
  si un Primat DPS doit pouvoir compléter une équipe en physique.

*Recommandé : ces valeurs (§2.3). Qui tanke quelle équipe se règle de toute façon à la main, dans la
répartition.*

**Q3. Qui compte comme participant de la soirée ?**
Cela concerne la répartition, le message de 20 h, le récap et la clôture.
*Recommandé : les **retenus** par le staff ; tant que personne n'est retenu, les **annoncés**.*

**Q4. Qu'est-ce qui se clique dans Discord ?**
Dracarys fait tout dans Discord, y compris les salles des Asuras et les équipes des jumeaux (12 + 6
boutons, plus les menus du staff).
*Recommandé : dans Discord, **Je viens**, **Pas cette fois**, le choix du perso et du poste, **Mes
positions**, et les boutons du **chrono** pour le staff. La répartition, le débrief, la clôture et les
vidéos se font sur le site, où l'écran est fait pour ça. L'autre option, les boutons de salles et de
jumeaux dans Discord comme chez Dracarys, ajoute un lot et deux messages de plus dans le salon.*
*Contre-examen : ta décision dit que notre bot « reprend TOUT ». Avec la recommandation, chaque
commande du modèle garde une porte dans Discord (`/chambre cloturer` et `/chambre debrief` renvoient
vers la bonne page, §8.4) ; seul le geste lui-même change d'écran. Si tu veux les gestes eux-mêmes dans
Discord, c'est l'autre option.*

**Q5. Le Guild Siege : quand, et comment ?**
Le wiki dit « tous les jours », avec une fin d'inscription à 19 h et à 22 h, mais rien sur nos soirs.
*Recommandé : un créneau « samedi 21 h » (celui que le bot suppose déjà), coupé tant que tu ne l'as pas
validé. Une inscription libre, sans plafond. Un rappel la veille à 20 h et un autre 1 h avant. Un rappel
au staff à 18 h 30 pour inscrire la guilde avant 19 h, si c'est bien le staff qui l'inscrit. Un débrief
court : gagné ou perdu, « à retenir », vidéos. Dis-nous les vrais jours et heures, et si le Guild Siege a
des manches à chronométrer.*

**Q6. Les vidéos : qui les envoie, et combien de temps on les garde ?**
*Recommandé : **tous les membres qui ont participé** à la séance peuvent joindre un lien ou un fichier (3
fichiers chacun et 10 par séance au plus), le staff sans limite par membre. Le staff modère. Les fichiers
sont gardés **180 jours**, dans un espace de **5 Go** au plus, et les liens pour toujours. L'autre
option, plus prudente : seul le staff envoie des fichiers, et les membres collent des liens.*

---

## Annexe : index des références au modèle

| Sujet | `bot.py` | Section ici |
|---|---|---|
| Vues persistantes, menus expirés | 81-86, 100-112 | 8.1 |
| Postes, places | 311-326 | 2.1, 2.2 |
| Données, fichier JSON, migration | 306-367 | 1, 8.10 |
| Embeds inscription et composition, `editer_si_change` | 374-429 | 8.1, 8.3 (M1) |
| Contrôle de place, inscription, choix du perso | 432-552 | 4.12 |
| Rôles de perso, classes tank, `perso_peut` | 577-585 | 2.3, 4.2 |
| `lire_nombre`, `fmt_nombre`, `stat_poste` | 588-623 | 4.1, 4.2 |
| `RecensementModal`, `/recensement`, fiche, `/supprimer_perso` | 626-742 | 1, 12 |
| Salles, types de DPS, jumeaux, plafonds, staff | 746-764 | 2.6, 4.3, 4.4 |
| `repart`, `peut_jouer`, `basculer_chambre`, `remplir_auto`, `choisir_jumeau` | 767-837 | 4.3, 4.4 |
| Affichage Phase 1 et Phase 2, émojis de classe | 844-908 | 2.1, 3.1, 4.3, 4.4 |
| Assignation par le staff, `placer_jumeau_staff` | 944-1116 | 4.3, 4.4 |
| Positions, échanges | 1119-1321 | 4.5, 8.3 (M10) |
| `/repartition` | 1331-1351 | 8.4 |
| Clôture, historique | 1354-1516 | 4.8, 8.3 (M11) |
| Rappels | 1519-1550, 1713-1748 | 4.7, 8.5 |
| `role_final`, golems, araignée, récap | 1553-1710 | 4.6, 8.3 (M5) |
| Étapes, phases, durées | 1751-1797 | 3, 4.1, 4.9 |
| Chrono (affichage, boutons, clics) | 1800-1902 | 4.9, 7.4, 8.3 (M6) |
| Débrief (parcours, saisies, résumé, analyse, image, publication) | 1904-2181 | 4.10, 4.11, 8.3 (M7), 8.6 |
| `/chambre`, salons de la Chambre | 2184-2226 | 2.5, 2.7, 8.4 |
| Image (palette, colonnes, hauteurs, pastilles) | `tableau_debrief.py:8-113` | 4.11 |

---

## 16. Contre-examen (2026-10-21)

Relecture de la révision 2 contre `bot.py`, `tableau_debrief.py`, `LISEZMOI.md` et le code du site.
Chaque correction ci-dessous est **déjà reportée dans le texte**, au paragraphe indiqué (les ajouts y
portent la mention *Contre-examen*). Rien n'a été modifié hors de ce fichier.

### 16.1 Les corrections

| # | Où | Ce qui était faux ou manquait | Correction |
|---|---|---|---|
| 1 | §4.12, piège n° 2, §5.1, §12.5 | `player = globalName ?? username`, « parce que `session.user.name` est le nom affiché ». Faux : next-auth 4.24 fait `name: profile.username` (`providers/discord.js:25`), `auth.ts` ne surcharge pas `profile()`. L'annonce faite sur Discord n'aurait jamais été reconnue comme « la mienne » (`jySuis`, `page.tsx:214`) | Le bot écrit `player = user.username` lu en base ; piège n° 2 réécrit (`/api/compositions/presences` avait raison ; le vrai piège est un identifiant Discord changé depuis la dernière connexion) |
| 2 | §8.3 M3, §8.5, §4.7, §1, §9.2 | Le rappel de 20 h ne mentionnait que `@everyone`. Or Maxime a décidé « 20 h aux inscrits », et le modèle ne mentionne que les inscrits, seulement s'il y en a (`bot.py:1730-1732`) | Message fusionné (pas de doublon avec le rappel existant) qui mentionne `@everyone` **et** les participants : nouvelle valeur `everyone_participants` ; `@everyone` seul tant que `nouveauxMessages` est coupé |
| 3 | §2.5, §4.8, §6 (route 9), lot 2 | La clôture et le débrief visaient `seanceCouranteParis` (commencée depuis moins de 6 h, sinon la prochaine) : une clôture le jeudi à 9 h visait le dimanche suivant | Nouveau helper `derniereSeanceParis` et clés `cs_derniere` / `gs_derniere`, par défaut pour la clôture, « Ils étaient là » et Bilans ; test ajouté |
| 4 | §2.6, §8.1, §8.3 M1, §8.4, §9.3, piège n° 22 | Des données de membres pouvaient sortir vers des visiteurs : le serveur Discord compte des candidats et des visiteurs, `/recensement classe:` n'avait pas de contrôle d'appartenance, et les chiffres partaient dans n'importe quel salon choisi | Chaque geste du bot vérifie `canAccessGuild` en base par `discordId` ; chiffres publiés seulement dans un salon fermé à `@everyone` (sinon panneau sans chiffres et avertissement) ; liste des salons publics dans `Setting("salons_publics")`, sans toucher au modèle `GuildChannel` |
| 5 | §7.7, §9.1, lot 2 | Oubli de `nav.ts` : `/discord/evenements` était créée sans entrée, contre la règle de Maxime | Entrée « Paramétrage des événements » dans Bras droits (Outils, `barre: false`, icône `settings`) ; icône voisine `cart` retirée de la liste (Boutique partie) |
| 6 | §10.2, lot 8, piège n° 20 | `data/` dans `.gitignore` ignore aussi `src/data/` (vérifié par `git check-ignore`) | `/data/` dans `.gitignore`, `data` dans `.dockerignore` |
| 7 | §5.3, §5.4, §4.12, lot 3 | Le correctif `lu` ne protégeait que les annonces : un poste choisi dans le menu Discord était effacé par le prochain clic d'un autre membre sur le site | `Signup.ts` (page et bot), gardé par `normaliserCompo` ; le PUT ré-ajoute aussi les inscriptions postérieures à `lu` ; le bot retire l'ancienne inscription par pseudo, pas par `charId` |
| 8 | §9.2, §11.2 | Les rappels du Guild Siege « 1 h avant » et « 30 min avant la fin d'inscription » ne s'écrivaient pas avec une heure fixe, alors que ses créneaux sont réglables | Champ `avant: { base, minutes }` dans `RappelDef` |
| 9 | §8.5, §9.3, §11.2, §8.3 M1/M6 | Doublon de `@everyone` : un Guild Siege le samedi à 21 h ferait partir son rappel de 20 h à la minute du panneau de la veille du dimanche ; une republication du panneau re-mentionnait | Un seul `@everyone` par salon et par demi-heure (validation + garde à l'envoi) ; republication du panneau sans mention ; un nouveau chrono ferme l'ancien |
| 10 | §8.10, piège n° 21 | L'arrêt du bot Python était décrit « dans Discord », et ses commandes slash, enregistrées par serveur (`bot.py:123-124`), restaient affichées après l'arrêt | Arrêt sur sa machine, puis retrait de l'application du serveur ; nos deux commandes peuvent attendre la bascule |
| 11 | §8.10 (import) | L'import ne disait rien de l'origine du fichier, des dates en texte libre ni des clés de salles | Fichier du serveur GENESIS seulement (le bot a servi Dracarys, `bot.py:45`) ; dates lues comme `chambres_du_jour`, mercredis et dimanches seuls ; `c1…c10` → `s1…s10` |
| 12 | §8.4, §1, Q4 | `/cloturer` et `/debrief` du modèle n'avaient aucun équivalent dans Discord, alors que notre bot « reprend TOUT » | `/chambre cloturer` et `/chambre debrief` (staff) : lien direct vers la bonne page |
| 13 | §8.3 M11, §8.2 | 📏 servait de titre alors qu'il veut dire « à remesurer », et ⚔️ (DPS physique) marquait le DPS d'un Primat, rangé en magique | Titre 📊 (ajouté à la table) ; émoji de DPS tiré de `TYPE_DPS` |
| 14 | §4.10 | Repris du modèle (`:2069`, `:2089`) : un chrono arrêté avant la fin donne un total court, proclamé « record » et comparé à un total complet | Record et écart total seulement entre séances complètes (« temps partiel » sinon) ; test ajouté au lot 6 |
| 15 | §4.9 | La route 6 acceptait `reinitialiser`, que `appliquerChrono` ne définissait pas | Défini (staff, confirmation, contrôle de `vu`), absent des boutons Discord |
| 16 | §2.3, §15 Q2, lot 1 | p1 n'affichait que ses PV en poing, alors que `slots.ts:6` dit que le sceptre tanke les boss (jumeaux, golems) et le poing le seul boss final | p1 affiche ses deux PV, sceptre d'abord ; le tri prend le sceptre |
| 17 | §2.3, §15 Q2 | « Le modèle hésitait » : en réalité il laissait un Primat DPS prendre une place magique **ou** physique chez les jumeaux (`:752`, `:784`) | Précisé ; le rangement en magique retire cette souplesse, question posée à Maxime |
| 18 | §2.6 | « Les deux définitions désignent les mêmes personnes » : `isStaff` accepte aussi « Gérer le serveur » sans rang | Nuance écrite |
| 19 | §12.4 | Le lien `/guildviewer?dossier=` visait un paramètre que le GuildViewer ne lit pas (dossier en `useState`, `guildviewer/page.tsx:39`) | Dépendance notée pour le chantier GuildViewer ; lien simple en attendant |
| 20 | §12.3, §12.5 | `Character.name` n'est pas unique en base : homonymes possibles (un candidat peut déclarer le même nom) | Départage : compte de l'annonce (`userId`, puis `player`), puis compte de la guilde, jamais RECRUE |
| 21 | §5.4 | `majSeance` : deux créations simultanées de la même séance lèvent P2002 au lieu de fusionner | P2002 rattrapé, nouvel essai |
| 22 | §6 | Rien n'interdisait qu'une charge de `BotCommand` porte un salon ou un texte ; la page `/discord` n'a pas de libellé pour les nouveaux types | Charges réduites à des ids et des mots d'une liste fermée ; libellés ajoutés à `TYPE_LABEL` |
| 23 | §6 (`VueSeance`) | `publication.erreur` (texte brut de Discord) était envoyé à tous les membres | Staff seulement |
| 24 | §9.1 | Le paramétrage enregistrait le document entier, ce qui fige les défauts (le dépôt fait déjà l'inverse dans `reglages.ts`) | Seules les clés modifiées sont écrites ; « Rétablir le défaut » retire la clé |
| 25 | §10.5 | Le quota ne comptait que les vidéos `pret` : des envois simultanés le dépassaient ensemble | Les envois en cours comptent aussi |
| 26 | §10.1 | Le `parent` du lecteur Twitch venait de `NEXTAUTH_URL`, qui casse en local et sur toute autre adresse | `window.location.hostname` |
| 27 | §8.5, §8.10 | « Rien ne change tant que `nouveauxMessages` est coupé » contredisait le lot 3 (« sous leur nouvelle forme ») | Mêmes heures, même mention, forme réécrite ; boutons livrés avec leur lot |
| 28 | Lot 4 | Le test « le troisième Arcaniste en réserve » est impossible avec la compo type, qui n'en a que deux | Test réécrit avec un Arcaniste retenu sur m3 |
| 29 | §11.2 | « Le meilleur chiffre, tous rôles confondus » alors que `choisirStuff` suit un ordre de rôles | Libellé corrigé : DPS, à défaut Tank, à défaut Off tank |
| 30 | §4.11 | Le vert `#2F8F5B` sort des cinq couleurs nommées par Maxime | Marqué « À VALIDER PAR MAXIME », avec un repli sans vert |
| 31 | §2.1, §8.3, §9.1 | Références de lignes décalées : `classes.ts:31-40`, `scheduler.ts:79-85`, `middleware.ts:42` | `classes.ts:30-39`, `scheduler.ts:50-89` / `:76-88`, `middleware.ts:32` |

### 16.2 Vérifié, sans correction

- **Les références à `bot.py`** : toutes celles des §1 à §12 et de l'annexe ont été relues ligne à ligne ;
  hors les nuances 2, 14 et 17 ci-dessus, chacune pointe bien la règle citée. `tableau_debrief.py` aussi
  (largeur 1 200, colonnes, barre d'accent `:66`, pastille `:69-74`, texte sombre sur « Moyen » `:93`).
- **Les faits de jeu** cités au §3.1 correspondent à `faits-wiki-officiel.json` (`chambres.cadre`,
  `chambres.mecaniques`, `guildSiege.cadre`) et à `chambres-adversaires.json` (37 adversaires, `BOSS_1`
  à `BOSS_6`, `OBJ_1` et `OBJ_2`).
- **Prisma** : les quatre modèles sont neufs, aucune colonne existante n'est touchée ni rendue
  obligatoire, aucune relation n'est ajoutée à `User` ; `prisma db push --skip-generate` (service
  `migrate`) les crée sans perte. La seule modification du schéma dans l'arbre de travail est
  `GearProfile.mesures Json?`, nullable.
- **Les gardes des routes** du §6 : chaque route nommée a la bonne garde (`apiGuild` pour la lecture des
  membres, `apiRole(ADMIN_ROLES)` pour les gestes du staff, `apiAuth` + `canAccessGuild` inchangé pour le
  comparatif) ; aucune n'est ouverte aux visiteurs ; `/recensement` est sous `requireGuild()`.
- **Le chrono** ne demande aucun temps réel : sondage de 5 s sur le site, temps calculé chez le client,
  `<t:…:R>` que Discord met à jour seul, messages modifiés au plus toutes les 10 s, conflits tranchés
  par `vu` et la version de la séance.
- **`/api/admin/bot-command`** reste fermée aux nouveaux types (`ALLOWED`, `route.ts:6`), et le
  middleware ne couvre toujours aucune route `/api` (piège n° 13).
- **Les vidéos** : volume nommé déclaré dans `web` et `bot`, limite de 100 Mo contrôlée trois fois côté
  serveur, type vérifié sur les premiers octets, garde `apiGuild` + auteur ou staff, purge quotidienne.
