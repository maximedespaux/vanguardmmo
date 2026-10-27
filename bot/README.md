# 🦉 Bot Discord Vanguard

Le bot et le site partagent **la même base PostgreSQL**. Ils ne se parlent jamais
directement : ils lisent/écrivent tous les deux dans la base. Le site dépose des
« ordres » dans la table `BotCommand` (file d'attente) et des demandes
(candidatures) ; le bot les consomme et agit sur Discord.

## En deux mots
- **Salon Décision** (`#decisions`, type *forum*) : dès qu'une candidature est
  créée — sur le **site** ou via le **bot** — le bot poste un
  **embed avec boutons** dans ce salon. Le staff valide/refuse en un clic → le
  résultat repart en base **et** un MP part au membre concerné.
- **Pilotage depuis le site** : la page *Administration → Discord* envoie des
  commandes (poster un embed, lancer un giveaway, poster le panneau de classes) que
  le bot exécute dans les ~12 s.
- **Rappels automatiques** : candidatures en attente, événements du jeu, Chambres Secrètes.
- **Chambres Secrètes** : le panneau d'inscription vivant la veille (✅ Je viens, ❌ Pas cette
  fois, choix du perso et du poste), les rappels du jour J, le récap de 20 h 40, 📍 Mes positions,
  les boutons des salles des Asuras et des équipes des Jumeaux (le placement du staff compris),
  le chrono en direct, `/chambre` et `/recensement` — sur la même base que le site (voir plus bas).

---

## Ce que fait le bot

### Commandes slash
| Commande | Rôle |
|---|---|
| `/aide` | Liste les commandes |
| `/mesperso` | Affiche tes personnages enregistrés sur le site |
| `/absence <début> <fin> [raison]` | Déclare une absence (enregistrée en base, staff prévenu sur le site) |
| `/candidature` | Postuler à la guilde depuis Discord |
| `/embed` | Construire et poster un embed |
| `/giveaway` | Lancer un giveaway (bouton *Participer* + tirage auto) |
| `/panneau-classes` | Poster le panneau d'auto-attribution des 8 classes |
| `/boutonrole` | Créer un message à **boutons** de rôle |
| `/rolereaction` | Créer un message à **rôle-réaction** (emoji → rôle) |
| `/recensement [classe]` | Tes chiffres déclarés dans l'AirBuilder (DPS, PV), ou le classement d'une classe — membres seulement |
| `/chambre historique [joueur]` | Tes Chambres : présences et absences (`joueur` : staff) |
| `/chambre positions` | Tes salles, ton équipe des jumeaux, ton golem et ta rotation, avec les menus pour les changer |
| `/chambre panneau` | (Staff) Republier le panneau d'inscription de la prochaine Chambre, sans mention |
| `/chambre repartition` | (Staff) Publier les boutons des salles et des équipes des jumeaux (ferme les anciens) |
| `/chambre recap` | (Staff) Envoyer le récap de la soirée maintenant, sans mention |
| `/chambre chrono` | (Staff) Publier le chrono en direct de la Chambre qui se joue (ferme l'ancien) |
| `/chambre cloturer [seance]` | (Staff) Clôturer une Chambre dans Discord : tous les participants cochés, on décoche les absents, on ajoute un annoncé venu quand même, on valide |
| `/chambre debrief [seance]` | (Staff) Le débrief étape par étape dans Discord : 🟢 🟠 🔴, chrono et remarque, 🏆 / 💀, 📌 à retenir, 📝 publier |

### Boutons gérés
- **Décisions staff** (dans `#decisions`) : accepter / refuser / attente / entretien pour les
  candidatures.
- **Rôles** : un clic ajoute/retire le rôle (boutons + réactions).
- **Giveaway** : *Participer* (toggle).
- **Chambres Secrètes** : *Je viens*, *Pas cette fois*, et les menus « quels persos » et « quel
  poste » ; *📍 Mes positions* et ses menus (ses salles, son équipe) ; une salle des Asuras
  (prendre, reclique pour libérer), une place chez les Jumeaux (Verte ou Rouge, tank, DPS
  magique ou physique) ; pour le staff, *Compléter*, *Placer* (la salle, puis le joueur) et
  *Placer · échanger* (le joueur, puis sa place, un retrait ou un échange). Boutons **sans état**
  (`cs:viens:<séance>`, `cs:salle:<séance>:<salle>`…) : tout est relu en base, un redémarrage ne
  casse aucun bouton. Chaque geste passe par les mêmes règles que l'onglet Répartition du site
  (`src/lib/chambres.ts`) : un clic d'un côté se voit de l'autre en moins de 30 s. Qui n'a pas le
  droit (pas membre en base, pas staff pour un geste du staff) reçoit un refus que lui seul voit.
- **Clôture et débrief** (lot 6 bis, staff, messages éphémères) : les menus « Qui était là ? » et
  « Venus quand même ? », *Valider la clôture*, *Rouvrir la séance*, *Corriger la clôture* ;
  puis le parcours du débrief : *Bien*, *Moyen*, *Mal* (la note passe à l'étape suivante,
  recliquer la retire), *‹ Précédente*, *Suivante ›*, le menu « Aller à l'étape… », *⏱️ Chrono ·
  remarque* et *📌 À retenir* (deux fenêtres de saisie), *🏆 Gagné*, *💀 Perdu*, *📝 Publier le
  débrief*, *Repasser en brouillon* (après confirmation). Sans état eux aussi
  (`cs:debs:<séance>:<étape>:<statut>:<statut montré>`…) : l'étape voyage dans l'identifiant, les
  cochés dans le message, et ce qui était montré (la liste des participants, la note et le
  résultat portés par les boutons, l'empreinte d'une fenêtre de saisie) refuse d'écraser ce qu'un
  autre membre du staff vient d'écrire, ici ou sur le site : le second voit le conflit (« Un autre
  membre du staff vient de modifier… »), sa saisie lui est rendue. La consigne en tête de la
  clôture et du débrief se règle dans le paramétrage (`textes.cloture`, `textes.debrief`).
  Le **chrono** : *Démarrer*, *Fin : 2.2 Jumeaux*, *Annuler le dernier clic*, *Arrêter* — le staff
  seul (`cs:chrono:<séance>:<geste>:<repère>`). Le repère est l'état que le message montrait : un
  clic sur le site et un clic ici au même instant ne font qu'une fin, le second reçoit « Le chrono
  a déjà avancé » et le message se remet à jour. « Effacer » ne se fait que sur le site.
- Les anciens boutons de la Boutique (requête, détenteur, salon d'échange) répondent seulement
  qu'ils ne servent plus : la Boutique, les dettes et le coffre ont quitté le site le 2026-10-21.

### Rappels & relais automatiques (planificateur)
- Candidatures en attente depuis +24 h → relance du staff (toutes les 2 h).
- Relais **site → `#decisions`** des nouvelles candidatures (toutes les 2 min).
- Clôture des giveaways arrivés à terme (chaque minute).
- **Événements du jeu** → annonce + rappel « X min avant » (à configurer, voir plus bas).
- **Chambres Secrètes et Guild Siege** → un tick chaque minute (voir « Les Chambres Secrètes »).
- **Vidéos de débrief** → purge du volume chaque nuit à 4 h 30 (voir « Les Chambres Secrètes »).

---

## Configuration — fichier `.env` (à la racine de `vanguard`, partagé avec le site)

> Pour copier un ID : Discord → Paramètres → Avancés → **Mode développeur**, puis
> clic droit sur le salon / rôle / serveur → **Copier l'identifiant**.

```
# ── Identité du bot ──
DISCORD_BOT_TOKEN="…"        # onglet Bot → Reset Token
DISCORD_CLIENT_ID="…"        # ID de l'application
DISCORD_GUILD_ID="…"         # ID du serveur

# ── Salons où le bot poste ──
CHANNEL_DECISION="…"         # ⚠️ FORUM — embeds à boutons (candidatures)
CHANNEL_CANDIDATURES="…"     # ⚠️ FORUM — relances de candidatures
CHANNEL_STAFF="…"            # salon officiers (récaps internes)
CHANNEL_EVENTS="…"           # salon des annonces d'événements du jeu

# ── Chambres Secrètes et Guild Siege (FACULTATIFS) ──
CHANNEL_CS="…"               # panneau, rappels, récap, chrono ; vide = 1498696982229811352
CHANNEL_CS_DEBRIEF="…"       # débriefs (texte ou forum) ; vide = CHANNEL_CS
CHANNEL_GS="…"               # Guild Siege (panneau, rappels, ses débriefs) ; vide = CHANNEL_CS
VIDEOS_DIR="…"               # vidéos de débrief ; vide = data/videos (/app/data/videos, volume vanguard_videos)

# ── Rôles : rangs (accès + pings staff) ──
ROLE_DIRECTION / ROLE_VANGUARD / ROLE_GENERAL / ROLE_OFFICIER / ROLE_VETERAN / ROLE_GUARD

# ── Rôles : 8 classes (panneau d'auto-attribution) ──
ROLE_CLASSE_SPADASSIN … ROLE_CLASSE_CHANOINE

# ── Rôles : spécialisations ──
ROLE_SPEC_CHAMBRES_SECRETES / ROLE_SPEC_PVE / ROLE_SPEC_PVP

# ── Base de données (la même que le site) ──
DATABASE_URL="postgresql://…"
```

Le **bot doit pouvoir** : *Envoyer des messages*, *Intégrer des liens*, *Gérer les rôles*
(pour le panneau de classes / les boutons de rôle), et **créer des posts** dans les deux
salons *forum* (`#decisions`, `#candidatures`). Le rôle du bot doit être **au-dessus** des
rôles qu'il distribue dans la liste des rôles du serveur.

---

## 🏰 Les Chambres Secrètes

Tout se règle sur le site, **sans redémarrer le bot** : *Bras droits → Outils → Paramétrage des
événements* (`/discord/evenements`). Le bot relit ce paramétrage chaque minute.

- **Salons** : la valeur choisie dans le paramétrage, sinon `CHANNEL_CS` (`CHANNEL_CS_DEBRIEF`,
  `CHANNEL_GS`), sinon le salon historique des rappels. Les essais partent dans le salon
  « Essais » du paramétrage, sinon `CHANNEL_STAFF` — jamais dans celui de la guilde.
- **Les chiffres des membres** (❤️ PV, 💥 dégâts, 📏 à remesurer) ne sont publiés que dans un
  salon **fermé à @everyone** : le serveur compte aussi des visiteurs et des candidats. Toutes
  les 10 minutes, le bot écrit la liste des salons visibles de tous (`Setting salons_publics`) :
  le paramétrage prévient quand un salon choisi en fait partie.
- **Rappels** (heure de Paris) : la veille à 20 h, le panneau d'inscription ; à 13 h 30 et
  18 h 30, « il manque du monde » s'il manque une classe (celui de 18 h 30 remplace celui de
  13 h 30) ; à 20 h, « ça commence dans 1 h ». Un rappel ne part qu'**une fois**, même avec deux
  bots ou un redémarrage (marqueur réclamé en base) ; un bot redémarré le rattrape pendant
  10 minutes, puis y renonce. Un seul `@everyone` par salon et par demi-heure.
- **Interrupteurs** : l'interrupteur général (`cs_rappels_actifs`, page Bot Discord) coupe tout.
  La **bascule** depuis le bot Python (`Messages de notre bot`) est coupée par défaut : tant
  qu'elle l'est, seuls les deux rappels de 20 h partent, sous leur nouvelle forme. Le jour de la
  bascule : arrêter le bot Python sur sa machine, **retirer son application du serveur**, envoyer
  un **Essai** de chaque message depuis le paramétrage, puis allumer la bascule.
- **Commandes slash** : `/chambre` et `/recensement` s'enregistrent avec `npm run bot:deploy`.
  À lancer le jour de la bascule, pour ne pas montrer deux `/chambre` aux membres.
- **Le récap** part à 20 h 40 (rappel « recap » du paramétrage) et reste à jour jusqu'à la
  clôture. **La répartition** (deux messages : 🌳 les salles, 👯 les jumeaux) se publie à la main,
  par `/chambre repartition` ou le bouton « Publier la répartition » de l'onglet Répartition ;
  elle se ferme d'elle-même à la clôture. Les deux attendent la bascule, comme `/chambre
  positions` (avant elle, la réponse renvoie à l'onglet Répartition du site). La consigne en tête
  des deux messages se règle dans le paramétrage (Textes des messages), avec son **Essai**.
- **Le chrono en direct** (lot 5) se publie par `/chambre chrono`, le bouton « Publier dans
  Discord » de l'onglet Chrono, ou le rappel « chrono » (20 h 55, coupé par défaut). Il montre
  chaque étape faite avec sa durée, l'étape en cours (« en cours depuis », que Discord fait défiler
  seul) et ses **monstres** (liens vers leur fiche), puis les joueurs et leurs chiffres déclarés.
  Pendant qu'il tourne, le bot le resynchronise toutes les **10 s** : un clic fait sur le site s'y
  voit aussitôt. Il se ferme à la clôture. Il attend la bascule, comme le récap — le site, lui, le
  tient déjà. Après la mise à jour, relancer `npm run bot:deploy` (sous-commande `chrono`).
- **Les débriefs** (lot 6) se font sur le site, onglet Bilans de `/compositions` : le staff
  note chaque étape (bien, moyen, mal), corrige un chrono, écrit une remarque, le résultat et
  « à retenir », puis **publie** : tous les membres le lisent alors, avec l'analyse comparée à la
  séance publiée juste avant.
- **Le débrief publié sur Discord** (lot 7) : « Publier » (le site, ou `/chambre debrief`) met en
  file la commande `seance_debrief` — après la bascule seulement : avant, c'est le bot Python qui
  publie ses débriefs. Le bot relit tout en base, rend l'**image** du débrief (1 080 px de large,
  aux couleurs de GENESIS, en Cinzel et Athiti : chaque étape avec son statut, son chrono, son
  écart et sa remarque, l'analyse, « à retenir », les joueurs et leurs chiffres DÉCLARÉS si le
  salon est fermé à @everyone) et l'envoie avec l'embed M7 et le bouton « Lire le débrief sur le
  site » dans le salon des **débriefs** du paramétrage (sinon `CHANNEL_CS_DEBRIEF`, sinon celui des
  Chambres). Un **forum** reçoit un fil « Retour Chambre — {date} », étiqueté « Donjon » s'il en a
  une. Un salon introuvable ou un droit qui manque fait échouer la commande, avec sa raison, que
  l'onglet Bilans affiche. **Republier** envoie un nouveau message (l'ancien reste). L'aperçu de
  l'image (staff) : « Aperçu de l'image » dans l'onglet Bilans ; l'essai : « Essai du débrief
  publié » dans le paramétrage (Textes des messages), qui règle aussi la phrase au-dessus de l'image.
- **Les polices de l'image** (piège n° 8) : sans fontconfig ni Cinzel et Athiti, Pango prend une
  autre police **sans rien dire**. Le `Dockerfile` les installe ; il faut quand même **regarder** une
  image rendue dans le conteneur avant la première publication :
  `mkdir -p essai && docker compose -f docker-compose.prod.yml run --rm -v "$PWD/essai:/app/essai" bot npx tsx scripts/essai-image-debrief.ts --complet essai/debrief.png`
  (sans `--complet` : le débrief du 18/10). Le script dit aussi ce que `fc-match` trouve.
- **La clôture et le débrief dans Discord** (lot 6 bis, décision 1) : `/chambre cloturer` et
  `/chambre debrief` ouvrent, pour le staff seul (compte relu en base : de la guilde, actif, staff),
  les mêmes gestes que le site, comme le `/cloturer` et le `/debrief` du bot Python. Ils écrivent
  par les mêmes fonctions que les routes 7, 8 et 9 (`cloturerSeance`, `modifierDebrief`,
  `marquerDebriefPublie`, dans `src/lib/seances-serveur.ts`), sous le même verrou de version :
  une clôture faite dans Discord se voit dans l'onglet Inscription, une note posée sur le site se
  voit au clic suivant dans Discord. L'option `seance` choisit une autre séance que la dernière
  commencée. Ils attendent la bascule (avant elle, ils renvoient au site), et demandent de
  relancer `npm run bot:deploy` (nouvelles options).
- **Les chiffres DÉCLARÉS** de chacun (décision 9) s'affichent dans la clôture et le débrief de
  Discord quand le paramétrage les montre dans Discord (`degats.discord`) : ce sont des messages
  éphémères du staff, la condition du salon fermé n'y joue pas.
- **Le débrief du 18/10/2026** (celui du bot Python, retranscrit dans
  `assets/genesis/refonte/debrief-2026-10-18.json`, et embarqué par l'image dans
  `src/data/chambres-debrief-2026-10-18.json`) devient la première séance de l'historique
  par un import **idempotent**, à lancer une fois, après la mise à jour :
  `docker compose -f docker-compose.prod.yml run --rm bot npx tsx scripts/importer-debrief.ts`
  (`--essai` pour voir ce qu'il ferait). Relancé, il ne change rien ; il n'écrase jamais un
  débrief fait sur le site, ni l'import une fois retouché (ou repassé en brouillon) par le staff. La liste des joueurs de ce soir-là n'existe nulle part : la séance
  dit « 10 joueurs », sans noms, et n'est pas clôturée.
- **Les échanges de place entre joueurs** (lot 10, §4.5, décision 1) : on ne vole pas la salle ou
  la place de jumeau d'un autre, on la lui **demande** — sur le site (« Demander une place… », sous
  Mes positions de l'onglet Répartition) ou dans Discord (**🔄 Échanges**, le bouton de
  📍 Mes positions). Le joueur visé la reçoit en **message privé** du bot (✅ Accepter, ❌ Refuser),
  en notification du site et dans le bandeau de l'onglet ; le demandeur reçoit la réponse de même.
  Une demande tombe au bout d'**1 h** ; acceptée après qu'une des deux places a bougé, elle est
  refusée (« La place de jumeau a changé entre-temps. »). Rien ne s'écrit dans le salon. Les
  messages privés attendent la bascule ; une demande faite sur le site arrive au bot par la file
  (`seance_echange`, mise en file par la route 5 elle-même). Un membre qui a fermé ses messages
  privés retrouve ses demandes dans 🔄 Échanges et sur le site. La phrase sous la demande se règle
  dans le paramétrage (Textes des messages), avec un essai.
- **Équilibrer les jumeaux** (lot 10, §4.4, staff) : « Équilibrer (staff) » sous les boutons des
  jumeaux (aperçu éphémère, puis confirmation), ou « Équilibrer les jumeaux » dans l'onglet
  Répartition : un tank par équipe, puis les DPS répartis pour que les dégâts DÉCLARÉS des deux
  équipes soient les plus proches. Il remplace toutes les places des deux équipes.
- **Reprendre l'historique du bot Python** (lot 10, §8.10, facultatif) : si l'on a son fichier
  `data/data_chambre.json` (tiré du serveur GENESIS), on le copie à côté du dépôt, puis
  `docker compose -f docker-compose.prod.yml run --rm -v "$PWD/data_chambre.json:/app/data_chambre.json:ro" bot npx tsx scripts/importer-dracarys.ts data_chambre.json --essai`,
  et sans `--essai` pour écrire. Il reprend les débriefs publiés et les clôtures (qui était là) des
  mercredis et dimanches, liste ce qu'il écarte, refuse un fichier dont aucun joueur n'a de compte
  sur le site (celui de Dracarys), et ne double rien s'il est relancé ; il ne touche jamais une
  séance débriefée, clôturée ou annulée sur le site.
- **Les vidéos de débrief** (lot 8, §10) : le **staff seul** (les quatre rangs des bras droits,
  décision du 21/10) joint, depuis le débrief d'une séance (onglet Bilans), un **lien** (YouTube non
  répertorié, Twitch, Medal, le lien d'un message Discord — les liens de *fichiers* Discord expirent
  et sont refusés) ou un **fichier** MP4 / WebM de **100 Mo au plus**, rangé sous une étape avec le
  moment où regarder (« 1:35 ») ; « Lire » l'ouvre à ce moment-là. Les membres les regardent une
  fois le débrief publié. Le débrief publié sur Discord (M7) les liste dans un bloc **🎬 Vidéos** :
  chaque ligne mène à la page du débrief, lecteur ouvert (`&video={id}`), jamais au fichier. Les
  fichiers vivent sur le volume Docker **`vanguard_videos`**, monté sur `/app/data/videos` dans
  `web` ET dans `bot` (`VIDEOS_DIR` pour un autre dossier) ; **jamais dans `public/`**. Chaque nuit
  à **4 h 30**, le bot efface les fichiers des séances plus anciennes que la conservation du
  paramétrage (180 jours par défaut ; les liens restent), les envois abandonnés depuis plus de 2 h
  et les fichiers oubliés, et écrit son bilan dans le journal (« Vidéos : 3 fichiers effacés
  (412 Mo), 1 envoi abandonné »). Les bornes (fichiers par séance, conservation, quota en Go) se
  règlent dans le paramétrage, qui affiche l'espace utilisé. **À la mise en service** : si l'envoi
  d'un fichier de 90 Mo répond 413 *avant* d'atteindre le site, ajouter `client_max_body_size 110m;`
  dans l'onglet *Advanced* de l'hôte du site dans Nginx Proxy Manager (DEPLOY.md).
- **Le Guild Siege** (lot 9, §11) est **codé mais ÉTEINT** par défaut (décision du 21/10 : le PvP
  n'est pas installé en jeu). Rien ne part, et l'onglet Guild Siege de `/compositions` reste « En
  standby », tant que le staff ne l'allume pas dans le paramétrage (onglet Guild Siege) — ce qui
  demande au moins un **créneau** (jour, heure, fin d'inscription de la guilde : Maxime les
  donnera) — **et** que l'interrupteur `gs_rappels_actifs` (Bot Discord) n'est pas allumé pour ses
  rappels. Allumé : la veille, un **panneau vivant** (🏯, or clair) avec « ✅ Je viens » et « ❌ Pas
  cette fois » — **libre**, un perso par compte et par séance (en choisir un autre remplace le
  premier), le même geste que l'onglet du site (`inscrireGS`) et tenu à jour de même ; « ça
  commence dans 1 h » avec la liste de qui vient ; le rappel au staff (« pensez à inscrire la
  guilde avant 19 h ») dans `CHANNEL_STAFF`, sans mention. La clôture (« Ils étaient là », sur le
  site) ferme le panneau ; le **débrief** (résultat, « à retenir », vidéos ; des manches seulement
  si le staff en pose) part en **embed, sans image**, dans le salon de ses débriefs (sinon le salon
  du siège). Le bot Python ne faisant pas le siège, rien de tout cela n'attend la bascule. Pas de
  nouvelle commande slash : rien à redéployer.
- **Permissions dans ces salons** : *Voir le salon*, *Envoyer des messages*, *Intégrer des liens*,
  *Joindre des fichiers*, *Mentionner @everyone*, *Lire l'historique des messages* (et *Créer des
  publications* pour un forum de débriefs).
- **La bascule depuis le bot Python**, pas à pas (sans double @everyone) :
  `assets/genesis/refonte/BASCULE-BOT.md`.

---

## 📅 Configurer les événements du jeu

Airborn n'a pas d'API : le calendrier se renseigne **à la main**, une fois (il change
rarement). Ouvre [`bot/config.ts`](config.ts) → tableau `EVENTS`. Une ligne par événement
récurrent :

```ts
export const EVENTS: GameEvent[] = [
  { name: "Chambres Secrètes", day: "mardi",  time: "21:00", remindBefore: 15, mention: "@here" },
  { name: "GvG",               day: "samedi", time: "21:00", remindBefore: 30, mention: "@everyone" },
  { name: "Reset quotidien",   day: "tous",   time: "06:00", remindBefore: 0,  mention: "" },
];
```

- `day` : `"lundi"` … `"dimanche"`, ou `"tous"` (quotidien)
- `time` : `"HH:MM"` (heure de **Paris**)
- `remindBefore` : minutes de rappel **avant** (`0` = pas de rappel avancé)
- `mention` : `"@here"` | `"@everyone"` | `"<@&ID_DU_ROLE>"` | `""` (rien)
- `channelId` *(optionnel)* : vide = `CHANNEL_EVENTS`, sinon un salon précis

> Après modification : relance le bot (`Ctrl+C` puis `npm run bot`).

---

## Installation & lancement

> Toujours se placer dans le dossier `vanguard` avant toute commande.

```
1. Dépendances          →  npm install
2. Base à jour          →  npm run db:push
3. Enregistrer les cmds →  npm run bot:deploy   (à refaire après tout ajout/retrait de commande)
4. Lancer le bot        →  npm run bot          (laisse la fenêtre ouverte : tant qu'elle tourne, le bot est en ligne)
```

---

## Mise en production (checklist)

- [ ] **Régénérer** le `DISCORD_BOT_TOKEN` et la clé secrète sur le portail Discord
      (ils ont circulé en clair pendant le dev) puis mettre à jour le `.env`.
- [ ] Renseigner le tableau `EVENTS` avec le vrai calendrier d'Airborn.
- [ ] Vérifier les permissions du bot (rôles + posts forum) sur le serveur.
- [ ] Faire tourner le bot **24/7** (VPS) au lieu d'une fenêtre locale.

## Ajouter une commande plus tard
1. Crée `bot/commands/maCommande.ts` (copie une commande existante comme modèle).
2. Ajoute-la dans `bot/commands/index.ts`.
3. `npm run bot:deploy` puis `npm run bot`.
