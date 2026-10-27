# Bilan des Chambres Secrètes : lots 1 à 10, avec 4 bis et 6 bis

*GENESIS, le 2026-10-21 au soir. Ce bilan relit le code tel qu'il est dans le worktree
`genesis-logo-identity-9b8b28`, et le compare à `SPEC-CHAMBRES-RECENSEMENT.md`, à ses
décisions du 2026-10-21 (points 1 à 11) et au bot de Dracarys (`bot.py`, lu, jamais exécuté).
Il se fonde sur le code, les tests, le build et les captures, pas sur la mémoire des lots. Il
n'a rien modifié dans `src/`, `bot/`, `scripts/` ni `prisma/`. Aucune opération git n'a été
faite.*

**En une minute.**
- **Les douze lots sont livrés dans le code** (1 à 10, plus 4 bis et 6 bis). `tsc` ne trouve
  aucune erreur. `scripts/verifier-seances.ts` passe ses **214 cas**. Le `next build` isolé
  se termine en EXIT 0, avec 70 pages. Les sept modules du bot se chargent sans erreur
  d'import.
- **Toutes les fonctions du bot de Dracarys qui servent aux Chambres existent chez nous**,
  dans Discord ET sur le site, sur la même base (décision 1). Il reste quatre écarts, tous
  voulus ou mineurs (§2) : la saisie du recensement, la suppression d'un perso, le classement
  général des participations et l'archive postée à la clôture. Ces quatre-là se font sur le
  site.
- **Pour un visiteur, tout est fermé.** Les 21 méthodes des routes `/api/evenements/*`,
  `/api/seances/*`, `/api/videos/*` et `/api/recensement` répondent 401. `/compositions` et
  `/discord/evenements` redirigent vers `/login`.
- **Rien n'a encore été essayé dans Discord réel**, puisque le token est vide en local.
  Messages, boutons, menus et refus ne sont vérifiés que par les fonctions pures. Le §5 donne
  l'ordre exact des essais à faire en production avec un compte test.
- **La bascule n'est pas faite.** Le bot Python tourne encore, et `nouveauxMessages` est
  coupé. La procédure est dans `BASCULE-BOT.md`. Le lot 7 est livré : la bascule peut se
  faire.
- **Le Guild Siege est codé, mais éteint** (décision 2). Il attend les jours et les horaires
  de Maxime.
- **Pas de redémarrage du serveur de dev** (§7).
- **Quatre petits défauts trouvés**, sans risque (§4) : une phrase périmée dans le
  paramétrage, une ligne périmée dans `BASCULE-BOT.md`, des notes de poste fausses dans la
  compo de dev (des données, pas du code), et l'alerte des Chambres affichée sur l'onglet
  Guild Siege.

---

## 1. Ce qui est livré, lot par lot

### Lot 1 : le recensement

- `src/lib/recensement.ts` contient `lireNombre`, `chiffreCourt`, le choix du stuff et le
  témoin « à remesurer ».
- `GET /api/recensement` est gardée par `apiGuild` et accepte `?vue=resume`.
- **Le recensement est une section d'Information Guilde** : `/recensement` redirige en 307
  vers `/guilde#recensement`. Ce déplacement vient de la refonte Information Guilde, voir
  `BILAN-INFORMATION-GUILDE.md`.
- Les chiffres DÉCLARÉS s'affichent à côté des noms dans l'onglet Inscription, avec « sans
  mesure » et 📏 « à remesurer ».
- Le comparatif expose `mesures`.
- **Les trois Primats** (décision 4) :
  - DPS : ses dégâts ;
  - Off tank : ses PV en sceptre ;
  - Tank : ses PV en sceptre ET en poing.
  Le chiffre montré se règle par poste dans le paramétrage (« Tank — PV en sceptre ET en
  poing », « Off tank — PV en sceptre (repli : poing) », « DPS »).
- Tests : 18 cas.

### Lot 2 : le socle des séances et le paramétrage

- **Prisma : les quatre modèles d'un coup**, `SeanceGuilde`, `SeanceParticipant`,
  `SeanceVideo` et `ParametresEvenement`. Ce sont des ajouts seulement. C'est le **seul**
  changement de schéma des douze lots.
- `src/lib/evenements.ts` gère les heures de Paris, la clé de séance, `cs_courante` et
  `cs_derniere`, le paramétrage et sa validation. `src/lib/seances-serveur.ts` fournit
  `majSeance`, sous verrou de version, et `participantsSeance`, qui n'y met jamais un Friend
  ni un membre caché.
- Routes livrées :
  - 1 et 2 : le paramétrage, avec 409 sur une version périmée ;
  - 4 : la séance ;
  - 9 : la clôture, qui vise la dernière séance commencée ;
  - 10 : l'annulation ;
  - 13 : l'historique.
- `/api/evenements/lecture` (`apiGuild`) s'ajoute à la spec. Elle donne aux membres ce que
  la page affiche : postes, déroulé et monstres, affichage des dégâts. Elle ne donne ni
  salons, ni rappels, ni textes.
- **`/discord/evenements`** est l'écran de paramétrage des bras droits (décisions 5 et 10),
  déclaré dans `nav.ts` : Bras droits, groupe Outils, `barre: false`, icône `settings`. Il
  règle :
  - les interrupteurs et les salons ;
  - les rappels, chacun avec son Essai ;
  - les 5 phases et les 13 étapes, avec leurs monstres ;
  - les postes : titre, classe, rôle aux jumeaux, aux golems et à l'araignée, chiffre
    montré, option ;
  - les dégâts déclarés (composition, bilans, Discord) ;
  - les salles et le nom des golems ;
  - les consignes du récap ;
  - les textes de chaque message ;
  - les vidéos.
  Seules les clés modifiées sont écrites (« Jamais modifié » en dev).
- `/compositions` a sept onglets : Inscription, Répartition, Chrono, Bilans, Stratégie,
  Guild Siege et « Paramétrer », un lien réservé au staff.
- « Ils étaient là » ouvre la clôture (`Cloture.tsx`). Bilans liste les séances.
- Les étapes et phases par défaut sont celles du débrief du 18/10/2026, mot pour mot
  (décision 7) : codes 1.1 à 5, « Phase 1 — Chambres » à « Phase 5 — Boss final ».
- Tests : 18 cas.

### Lot 3 : notre bot reprend l'inscription et les rappels

- **Le bot** : un tick à la minute remplace les cron fixes, et une synchro toutes les 15 s
  garde les messages vivants. Les boutons sont sans état (`cs:…`, `gs:…`). Chaque geste
  relit le compte en base par `discordId` (`canAccessGuild`, membre actif, non caché).
- **Les messages** : M1 (panneau vivant ✅ Je viens / ❌ Pas cette fois, menus du perso et
  du poste), M2 (« il manque du monde »), M3 (« dans 1 h », `@everyone` et participants en
  un seul message), M4, M8, M9, M11 et M12 (essai).
- **Les règles** :
  - un seul `@everyone` par salon et par demi-heure ;
  - le rappel de 18 h 30 remplace celui de 13 h 30 ;
  - un rappel en retard de plus de 10 min est abandonné ;
  - un marqueur réclamé sous verrou empêche que deux bots envoient deux fois le même
    message.
- **Les commandes** `/chambre` et `/recensement`, cette dernière réservée aux membres relus
  en base.
- **Le correctif `lu`** (`fusionnerLu`, `modifierCompo`) : une annonce ou un poste choisi
  dans Discord ne sont plus effacés par le clic d'un autre membre sur le site.
- **Les routes** 3 (essai) et 11 (publier), et la ligne staff « Panneau Discord » sous
  « Prochaine séance ».
- **Les cinq types de `BotCommand`** sont créés côté serveur seulement. `ALLOWED` de
  `/api/admin/bot-command` est inchangé : `post_embed`, `create_giveaway`,
  `post_class_panel`, vérifié.
- Tests : 24 cas.

### Lot 4 : la répartition, le récap et « Mes positions »

- `src/lib/chambres.ts` porte les règles :
  - Phase 1 : prendre, libérer, compléter ;
  - Phase 2 : son équipe, le placement du staff, l'échange ;
  - les golems à 5 contre 5, les rotations de l'araignée sans doublon de classe, un m3
    retenu en réserve ;
  - les totaux d'équipe et leur écart (or au-delà de 10 %, crimson au-delà de 20 %) ;
  - le récap et `positionsDe`.
- **Onglet Répartition** : Mes positions, Phase 1, Phase 2 avec ses totaux DÉCLARÉS, les
  golems, l'araignée et l'aperçu du récap « tel qu'il partira ». Il se rafraîchit toutes les
  15 s quand il est visible.
- **Route 5**, avec 403 pour le perso d'un autre et 409 pour une séance clôturée ou en
  conflit.
- **Dans le bot** : M5 (récap de 20 h 40, vivant jusqu'à la clôture) et M10 (📍 Mes
  positions). Les commandes `/chambre recap`, `positions` et `repartition`.
- Tests : 18 cas.

### Lot 4 bis : les salles et les jumeaux dans Discord (décision 1)

- **Deux messages vivants** :
  - 🌳 Phase 1 : un bouton par salle, 5 par rangée, 20 salles au plus. On prend une salle,
    on reclique pour la rendre, et on ne vole pas celle d'un autre ;
  - 👯 Phase 2 : 🟩 Verte et 🟥 Rouge × 🛡️ Tank / 🔮 DPS magique / ⚔️ DPS physique.
- **Les menus du staff** : « Compléter (staff) », « Placer (staff) » et « Placer · échanger
  (staff) ».
- Chaque geste passe par `modifierRepartition`, la même fonction que la route 5. Un geste se
  voit de l'autre côté en moins de 30 s.
- La publication se fait par `/chambre repartition` ou par le bouton « Publier la
  répartition » du site (route 11, `quoi=repartition`).

### Lot 5 : le chrono en direct

- `appliquerChrono` : suivante, annuler, arrêter, et réinitialiser (« Effacer », staff, avec
  confirmation). Le contrôle de `vu` fait qu'un clic sur le site et un clic sur Discord au
  même instant ne créent qu'une seule fin. Les étapes sont figées au démarrage. Le temps est
  pris sur l'horloge du serveur.
- **Route 6**, et la réponse allégée de la route 4 (`?partie=chrono`).
- **Onglet Chrono** : il se relit toutes les 5 s pendant que le chrono tourne, 30 s sinon.
  Il affiche « Qui joue cette étape » selon les salles, les jumeaux, le golem et la rotation.
  Sur ordinateur, Espace ou Entrée valide l'étape.
- **M6 dans Discord** :
  - trois états, l'étape en cours « depuis `<t:…:R>` » et ses monstres (décision 8) ;
  - les joueurs et leurs dégâts DÉCLARÉS, seulement dans un salon fermé ;
  - des boutons réservés au staff : un non-staff reçoit un refus éphémère.
- `/chambre chrono`. Le rappel « chrono » de 20 h 55 est **coupé par défaut**.
- Tests : 12 cas.

### Lot 6 : les débriefs sur le site

- **Le débrief étape par étape** (`Debrief.tsx`) :
  - Bien, Moyen ou Mal ;
  - le chrono saisi, que `lireDuree` lit dans « 2m34 », « 1:02:03 », « 45 » ou « 1h02 » ;
    vidé, il laisse revenir la mesure du chrono ;
  - une remarque, « à retenir », gagné ou perdu ;
  - « Repasser en brouillon ».
- **L'analyse** :
  - l'écart à la dernière séance **publiée** et antérieure ;
  - pas de record au premier débrief, ni sur un chrono partiel (« temps partiel ») ;
  - « Mal deux fois de suite » ;
  - l'étape la plus longue.
- Routes 7 et 8.
- **L'import du 18/10/2026** (décision 11) : `scripts/importer-debrief.ts` lit la copie
  embarquée `src/data/chambres-debrief-2026-10-18.json`, identique octet pour octet à
  `assets/…/debrief-2026-10-18.json`, ce que le test vérifie. L'import est idempotent. **Il
  est fait en dev** : « Dim. 18 Oct. — GAGNÉ — 10 (import) — publié ». En prod, il reste à
  lancer (§5, étape 0).
- Les monstres de chaque étape sont affichés sous l'étape (décision 8), et aussi dans
  l'onglet Stratégie (`Deroule.tsx`, avec un lien vers `/monstres/{id}`).
- Tests : 14 cas.

### Lot 6 bis : la clôture et le débrief dans Discord (décision 1)

- **`/chambre cloturer`** : un menu éphémère où tous les participants sont cochés. On y
  ajoute un annoncé non retenu, et le poste et le chiffre DÉCLARÉ de chacun s'affichent. Les
  cochés sont gardés dans le message. La clôture est refusée pour une séance annulée, à
  venir ou vide. Une séance déjà clôturée propose de clôturer de nouveau, de rouvrir ou de
  faire le débrief.
- **« Faire le débrief maintenant »**, ou `/chambre debrief` : un parcours étape par étape.
  - Chaque étape montre ses monstres et son chrono.
  - Les boutons Bien, Moyen et Mal passent à la suivante ; recliquer retire la note.
  - Des fenêtres de saisie servent au chrono, à la remarque et à « à retenir ».
  - Gagné ou perdu, puis Publier.
- Le bot écrit par les fonctions des routes 7, 8 et 9 : mêmes règles, même verrou. La même
  étape écrite des deux côtés donne un 409, et rien n'est écrasé.
- L'autocomplétion de `seance` ne s'ouvre qu'au staff, compte relu en base.
- Les consignes des deux messages se règlent dans le paramétrage (décision 5).
- Tests : 21 cas, qui portent aussi ceux du lot 7.

### Lot 7 : l'image du débrief et sa publication

- **`src/lib/seance-image.ts`** (sharp + Pango) produit un PNG plein de 1 080 px de large,
  en Cinzel et Athiti. Le texte saisi est échappé : « <b> & co » s'affiche tel quel, sans
  émoji. Les joueurs sont les présents de la clôture. Leurs chiffres DÉCLARÉS n'y figurent
  que si le salon les permet.
- **M7** : l'embed donne le résultat, le temps, l'analyse et « à retenir », avec l'image
  jointe et le lien vers le site, sans aucune mention.
  - Dans un **forum**, le bot ouvre un fil « Retour Chambre — {date} », étiqueté Donjon.
  - Les droits sont vérifiés AVANT l'envoi. S'il en manque un, la commande passe en
    `FAILED`, avec la raison en clair, que le staff lit dans Bilans.
- Route 8 complète, et route 14 (« Aperçu de l'image »).
- `Dockerfile` : fontconfig, les polices dans `/usr/local/share/fonts/genesis/`, puis
  `fc-cache`. `sharp` est épinglé.
- `scripts/essai-image-debrief.ts` rend l'image du 18/10, ou une séance fictive complète
  avec `--complet`.

### Lot 8 : les vidéos de débrief

- **Routes 15 à 19** :
  - un lien (YouTube, Twitch, Medal, un message Discord, tout https) ;
  - ou un fichier MP4 ou WebM de 100 Mo au plus. Le compteur coupe même un
    `Content-Length` menteur. Le type est lu dans les premiers octets : un .mov renommé est
    refusé (415) ;
  - la lecture accepte `Range` (206 ou 416).
- **Décision 3 : le staff seul joint**, et les membres regardent une fois le débrief publié.
- Le lecteur saute au bon moment : `start=` pour YouTube, `time=` pour Twitch avec `parent`
  = l'hôte de la page, `#t=` pour un fichier.
- Bornes : 10 fichiers par séance, 180 jours, 5 Go, 1 Go libre sur le disque. Les envois en
  cours comptent dans le quota.
- Purge à 4 h 30 : les fichiers trop vieux, les envois abandonnés, les `.part` et les
  orphelins.
- M7 a un bloc 🎬 dont les liens mènent à la PAGE, jamais au fichier.
- Volume `vanguard_videos` sur `web` ET `bot`. `/data/` dans `.gitignore`, `data` dans
  `.dockerignore`.
- Tests : 14 cas.

### Lot 9 : le Guild Siege (codé, éteint)

- Le paramétrage GS a son propre onglet sur `/discord/evenements` : actif, créneaux,
  plafond, salons, rappels, texte et règle.
- **Route 12** : un perso par compte et par séance. Un autre perso REMPLACE le premier. Le
  plafond compte les comptes.
- Le panneau 🏯 (✅ Je viens / ❌ Pas cette fois / 🌐) donne le chiffre DÉCLARÉ : DPS, à
  défaut Tank, à défaut Off tank.
- Les rappels sont la veille, « dans 1 h » et le rappel staff `gs_staff`, sans mention.
- La clôture GS se fait parmi les annoncés. Le débrief GS est un embed sans image.
- Bilans a un filtre « Guild Siege ».
- **Éteint par défaut, sans créneau** : aucun rappel ne part, et l'onglet affiche « En
  standby » (capture 5).
- Tests : 13 cas.

### Lot 10 : les échanges, l'équilibrage et l'import du bot Python

- **Échanges** (`options_echange`) :
  - on demande la salle d'un autre, ou sa place chez les jumeaux si chacun tient le rôle de
    l'autre ;
  - seul le joueur visé, ou le staff, accepte ;
  - la demande expire au bout d'1 h, et 3 au plus restent en attente ;
  - une acceptation après qu'une place a changé est refusée avec le message du modèle ;
  - deux persos d'un même compte ne s'échangent pas entre eux.
- Sur le site, le bandeau des demandes s'affiche dans l'onglet Répartition, et une
  notification de type `chambre` prévient le joueur visé.
- Dans Discord : un message privé 🔄 avec ✅ Accepter et ❌ Refuser, sans @, par le type
  `seance_echange`, créé côté serveur et **seulement après la bascule**. 🔄 Échanges liste
  les demandes reçues, à trancher et envoyées.
- **Équilibrer** (staff, avec confirmation, sur le site et dans Discord) : sur la compo
  type, l'écart de DPS reste sous 10 %, avec un tank par équipe et les deux Arcanistes
  séparés. Le calcul lit toujours les chiffres déclarés, même quand leur affichage est
  masqué.
- **`scripts/importer-dracarys.ts`** (avec `--essai`) :
  - il ne prend que les mercredis et les dimanches, et renomme les salles `c3` → `s3` ;
  - il reprend les débriefs mot pour mot et les clôtures ;
  - il est refusé si aucun uid ne correspond à un compte du site (le bot a d'abord servi
    Dracarys) ;
  - il est idempotent et n'écrase jamais ce qui a été fait sur le site.
  **Il n'a pas été lancé** : le fichier `data_chambre.json` du serveur GENESIS n'est pas
  disponible ici.
- Tests : 39 cas. Le lot en ajoute aussi d'autres, sur une base en mémoire : verrous,
  clôture, débrief et import, d'où qu'ils viennent.

---

## 2. Le bot de Dracarys, fonction par fonction (§1 de la spec, revu avec la décision 1)

| Fonction de Dracarys | `bot.py` | Chez nous, dans Discord | Chez nous, sur le site | État |
|---|---|---|---|---|
| Ouvrir une Chambre (`/chambre <date>`) | 2184-2207 | Le panneau part tout seul la veille à 20 h ; `/chambre panneau` le republie, sans mention | Rien à ouvrir : les créneaux sont fixes (mer. et dim., 21 h) | repris |
| Inscription par poste (vue de la Chambre, choix du perso, inscrire, valider) | 448-552 | M1 : ✅ Je viens / ❌ Pas cette fois, menu du perso (choix multiple), puis du poste | Onglet Inscription | repris |
| Embed de composition vivant (`editer_si_change`) | 387-429 | Panneau resynchronisé toutes les 15 s, modifié seulement s'il change | — | repris |
| Le perso peut tenir le poste (`perso_peut`) | 581-585 | Seuls les postes de sa classe sont proposés | Idem | repris |
| Plafonds (5 par poste, 10 joueurs) | 432-440 | Non : notre compo est une cible | Le staff « retient » | non repris, voulu (§1 de la spec) |
| `lire_nombre`, `fmt_nombre`, `stat_poste` | 588-623 | Chiffres DÉCLARÉS (❤️ 💥 📏 ❔) dans le panneau, le rappel de 20 h, le récap, le chrono, la clôture et le débrief | Compo, Répartition, Chrono, Bilans, image | repris (`recensement.ts`) |
| Recensement : saisie par fenêtre, fiche dans `#recensement` | 626-725 | `/recensement` **en lecture** : soi, ou une classe | Saisie dans l'AirBuilder ; section Recensement de `/guilde` | **partiel** : la saisie ne se fait pas dans Discord (choix de la spec, à confirmer) |
| `/supprimer_perso` | 726-742 | — | Les persos se gèrent sur le site | non repris dans Discord |
| Phase 1 : boutons des salles, `basculer_chambre` | 944-973, 789 | Message 🌳 à boutons | Onglet Répartition | repris (4 bis) |
| `remplir_auto` | 806-818 | « Compléter (staff) » | « Compléter les salles » | repris |
| Assignation d'une salle par le staff | 975-1009 | « Placer (staff) » : la salle, puis le joueur, ou « Libérer » | Menu « Placer… » | repris |
| Phase 2 : équipes des jumeaux, `choisir_jumeau` | 1012-1023, 821 | Message 👯 : 🟩 / 🟥 × 🛡️ / 🔮 / ⚔️ | Onglet Répartition | repris (4 bis) |
| Le staff place et échange chez les jumeaux | 1026-1116 | « Placer · échanger (staff) » | Menus du staff | repris |
| Mes chambres et mon jumeau | 1119-1180 | 📍 Mes positions (bouton et `/chambre positions`), avec des menus par perso | Bandeau « Mes positions » | repris |
| Échanges entre joueurs | 1183-1308 | 🔄 Échanges ; la demande en message privé, ✅ / ❌ ; expire au bout d'1 h | Bandeau des demandes, et une notification | repris (lot 10) |
| `/repartition` | 1334-1351 | `/chambre repartition` | « Publier la répartition » | repris |
| Rappels de 13 h 30 et 18 h 30 (`@everyone` s'il reste des places) | 1519-1550, 1713 | M2, seulement s'il manque une classe ; le second remplace le premier ; réglables | Paramétrage | repris |
| Rappel de 20 h aux inscrits | 1547, 1730 | M3 : `@everyone` et les participants dans un seul message | Paramétrage | repris |
| Récap de 20 h 40 (rôles, golems, araignée) | 1557-1710 | M5, vivant jusqu'à la clôture ; `/chambre recap` | Aperçu dans Répartition | repris |
| Chrono (`/chrono`, boutons) | 1800-1902 | M6 et `/chambre chrono` ; boutons du staff | Onglet Chrono | repris (lot 5) |
| Clôture (`/cloturer`, cocher les présents) | 1389-1475 | `/chambre cloturer`, en éphémère | « Ils étaient là » | repris (6 bis) |
| Archive postée dans `#historique` à la clôture | 1430-1432, 1506 | — | Onglet Bilans (l'historique entier) | non repris dans Discord |
| « On fait le débrief ? » après la clôture | 2174-2182 | « Faire le débrief maintenant » | Bouton « Faire le débrief » | repris |
| `/historique joueur` | 1478-1491 | `/chambre historique [joueur]` (un autre joueur : staff seulement) | « Mes participations » | repris, et ouvert à chaque membre pour lui-même |
| `/historique` sans joueur : classement et bilan victoires/défaites | 1492-1501 | — (🏆 / 💀 par séance seulement) | « Participations de la guilde » (staff), « 1 victoire · 0 défaite » | **site seulement** |
| Débrief pas à pas (statut, chrono, remarque, à retenir, gagné/perdu) | 1928-2063 | `/chambre debrief` en éphémère, avec boutons et fenêtres de saisie | Onglet Bilans | repris (6 bis) |
| Résumé et analyse comparée | 2065-2111 | Dans M7 | Dans la page | repris (lot 6) |
| Image `tableau_debrief.py` et publication | 2114-2137 | M7, l'image, un fil dans un forum | « Aperçu de l'image » | repris (lot 7) |
| Menus expirés après un redémarrage | 100-112 | Sans objet : les boutons sont sans état, tout est relu en base | — | sans objet |
| `/setup`, création des salons | 173-243, 2210-2225 | Non : les salons se choisissent dans le paramétrage | Paramétrage, carte Salons | non repris, voulu |
| `/membre`, `/invite`, `/retirer` | 251-288 | Non | Dossier membre dans `/staff` | ailleurs |
| `/annonce` | 291-301 | `/embed` (existant) | Onglet Embed de `/discord` | ailleurs |
| Journal des arrivées et des départs | 127-146 | Non | — | non repris : vérifier que personne n'en dépend (`BASCULE-BOT.md`, étape 2) |
| `data_chambre.json` et sa migration | 306-367 | — | Base PostgreSQL commune ; import (lot 10) | repris ; l'import est écrit mais pas lancé |

En plus du modèle :
- les vidéos (lot 8) ;
- le Guild Siege (lot 9) ;
- l'annulation annoncée (M8) ;
- les essais de chaque message (M12) ;
- l'écran de paramétrage ;
- les dégâts déclarés partout (décision 9) ;
- les monstres par étape (décision 8) ;
- les gardes « membre relu en base » sur chaque geste Discord.

---

## 3. Les vérifications faites pour ce bilan

1. **`npx tsc --noEmit`** : 0 erreur, en incrémental puis avec `--incremental false`
   (EXIT 0). `tsconfig.json` inclut `**/*.ts` : `bot/` et `scripts/` sont donc vérifiés.
2. **`npx tsx scripts/verifier-seances.ts`** : **214 cas**, EXIT 0. Par section :
   - les sections hors Chambres : Information Guilde 7, le partage 2, les gestes 7,
     Friend 7 ;
   - les lots des Chambres : lot 1 18, lot 2 18, lot 3 24, lot 4 18, lot 5 12, lot 6 14,
     lot 6 bis 21 (avec le lot 7), lot 8 14, lot 9 13, lot 10 39.
3. **Le build isolé** se fait dans la copie
   `/private/tmp/claude-501/-Users-maximedespaux-Documents-GitHub-vanguardmmo--claude-worktrees-genesis-logo-identity-9b8b28/b1c4d845-a36a-4f90-ab7e-d3b142097df9/scratchpad/build-bilan-ch`,
   avec `DEV_ALL_ACCESS` vidé : « Compiled successfully », 70/70 pages, **EXIT 0**. Les 18
   routes des séances, des événements, des vidéos et du recensement sont dynamiques (ƒ),
   ainsi que `/compositions` et `/discord/evenements`.
4. **En visiteur sur :3051**, avec `next start` dans la copie, arrêté ensuite :
   - `/compositions` (et `?onglet=repartition|chrono|bilans|gs`), `/compositions/build/p1`,
     `/discord`, `/discord/evenements`, `/staff` et `/guilde` répondent **307 vers
     `/login`** ;
   - `/recensement` répond 307 vers `/guilde#recensement` ;
   - les 21 méthodes de `/api/evenements/{lecture, parametres, parametres/essai}`,
     `/api/seances/{[cle], repartition, chrono, cloture, debrief, debrief/publier,
     debrief/image, annuler, discord, inscription, videos, historique}`,
     `/api/videos/[id]` (PATCH, DELETE), `/api/videos/[id]/fichier` (GET, PUT) et
     `/api/recensement` répondent **401 « Non authentifié »**. Seules exceptions : GET sur
     `debrief` et sur `videos`, des méthodes qui n'existent pas, répondent 405.
   - **Les gardes, lues dans le code**, sont celles du §6 de la spec :
     - `apiRole(ADMIN_ROLES)` pour 1, 2, 3, 6, 7, 8, 9, 10, 11 et 14 ;
     - `apiGuild`, plus `canAccessAdmin` geste par geste, pour 4, 5, 12, 13 et 15 à 19, et
       pour `lecture`.
5. **Le bot se charge** (`npx tsx -e "import(…)"`) : `bot/lib/seances.ts` (30 exports),
   `seances-messages.ts` (120), `botcommands.ts`, `commands/index.ts`, `commands/chambre.ts`,
   `commands/recensement.ts` et `scheduler.ts`, tous sans erreur d'import.
   - `/chambre` a 8 sous-commandes : `panneau`, `positions`, `recap`, `repartition`,
     `chrono`, `historique [joueur]`, `cloturer [seance]` et `debrief [seance]`.
   - `/recensement` prend `[classe]`.
6. **Base de dev, en lecture seule** :
   - `prisma migrate diff` (base ↔ schéma) dit « No difference detected » ;
   - deux séances : `cs_2026-10-18_dim` (importée, publiée) et `cs_2026-10-21_mer` ;
   - 0 participant, 0 vidéo ;
   - une seule commande des séances en base, un `evenement_essai` en `FAILED` (pas de bot
     en local) ;
   - le paramétrage n'a jamais été modifié.
7. **Les captures sur :3040** (vue Direction, 1440 px), relues une par une, sont dans
   `/private/tmp/claude-501/-Users-maximedespaux-Documents-GitHub-vanguardmmo--claude-worktrees-genesis-logo-identity-9b8b28/b1c4d845-a36a-4f90-ab7e-d3b142097df9/scratchpad/bilan-ch/`.
   Le script de capture ne relève **aucun débordement** horizontal :
   - `1-inscription-1440.png` : la prochaine séance (dim. 25 oct.), « Il manque 2 Primat,
     2 Arcaniste… », la ligne « Notre bot ne publie pas encore de panneau : la bascule… est
     coupée », les postes avec « sans mesure ».
   - `2-repartition-1440.png` : la séance du mer. 21 oct. « en cours », les boutons du
     staff, Mes positions avec « S'annoncer », les 12 places de la Phase 1, les équipes
     Verte et Rouge, les golems, l'araignée et ses trois consignes, et le récap « tel qu'il
     partira sur Discord ».
   - `3-chrono-1440.png` : 0:00, Démarrer, « Annuler le dernier clic », Arrêter et Effacer,
     les 13 étapes en 5 phases avec leurs émojis, conformes à la décision 7.
   - `4-bilans-18-10-1440.png` : « 1 victoire · 0 défaite », « Dim. 18 Oct. GAGNÉ 10
     (import) publié ». Le débrief ouvert reprend les statuts et les remarques mot pour mot,
     avec les monstres de chaque étape en étiquettes, et « 10 joueurs, selon le débrief
     importé : la liste, elle, n'a pas été gardée ».
   - `5-guild-siege-1440.png` : « En standby », « Codé et réglable, éteint tant que le PvP
     n'est pas installé ».
   - `6-parametrage-1440.png` (8 596 px, relue en cinq morceaux `z-param-0..4.png`) :
     - les interrupteurs (Rappels général : Coupés ; bascule : Non) ;
     - les salons, les 6 rappels avec Essai (chrono coupé) ;
     - les 5 phases et les 13 étapes avec leurs monstres ;
     - les 12 postes (p1, p2, d1 à d6, m1 à m4) avec leurs rôles par phase et leur chiffre
       montré ;
     - les dégâts déclarés (3 interrupteurs), la répartition (12 places, « Golems ») ;
     - les consignes, les textes (avec trois Essai), les vidéos (10 / 180 j / 5 Go) ;
     - la barre « Enregistrer » collée en bas.
8. **L'image du débrief**, rendue par `scripts/essai-image-debrief.ts` et relue :
   - `7-image-debrief-18-10.png` (1 080 × 2 538) : « RETOUR CHAMBRE SECRÈTE » en Cinzel,
     GAGNÉ, « 10 joueurs », « aucun chrono pris », les 5 phases et les 13 étapes, les
     statuts Bien (vert), Moyen (or) et Mal (crimson), les monstres sous chaque étape, les
     quatre remarques mot pour mot, et le pied « vanguardhub.fr/compositions · GENESIS ·
     CHAMBRES SECRÈTES » ;
   - `8-image-debrief-complet.png` (1 080 × 3 728) : un temps total, « NOUVEAU RECORD »,
     « −0:55 vs 18/10 », les écarts verts et crimson, « 1:41* » (un chrono corrigé),
     « <b> & co » affiché tel quel, « · 2 vidéos sur le site », l'analyse, « à retenir »,
     et les 10 joueurs avec leurs chiffres DÉCLARÉS (deux PV pour le Primat, « à
     remesurer », « sans mesure »).
   - En local, `fc-match` est absent : les polices sont chargées par fichier
     (`public/fonts`). **Dans le conteneur, c'est fontconfig qui les trouve : à regarder en
     production** (§5, étape 0).

Ce bilan ne refait pas les vérifications à 390 px : chaque lot les a faites sur ses propres
écrans.

---

## 4. Défauts trouvés, et ce qui reste ouvert

### Défauts (aucun ne touche aux droits ni aux données)

1. **(Corrigé après le bilan.) Une phrase périmée dans le paramétrage.** La ligne « Dans Discord » de la carte Dégâts
   déclarés dit « … et le chrono (puis le débrief, avec son lot) ». Or le débrief suit déjà
   ce réglage (`bot/lib/seances.ts:1062`, `:2045`). La phrase est dans
   `src/app/(admin)/discord/evenements/page.tsx:451`. Il suffit de retirer « (puis le
   débrief, avec son lot) » et d'ajouter « le débrief » à la liste.
2. **(Corrigé après le bilan.) `BASCULE-BOT.md`, partie « Plus tard »**, dit que `scripts/importer-dracarys.ts` est
   « à écrire ». Il existe depuis le lot 10. La commande à utiliser :
   `docker compose -f docker-compose.prod.yml run --rm -v "$PWD/data_chambre.json:/app/data_chambre.json:ro" bot npx tsx scripts/importer-dracarys.ts data_chambre.json --essai`,
   puis la même sans `--essai`.
3. **Des notes de poste fausses dans la compo de dev.** Ce sont des données, pas du code :
   dans `CompositionState.slotMeta`, les postes m1, m2, m3 et m4 (groupe DPS MAGIQUE)
   portent la note « DPS physique », et m3 a perdu son « (option) ». Sur la page, les
   Arcanistes et l'Envoûteur s'affichent donc « DPS physique » sous « DPS MAGIQUE »
   (capture 1). **Vérifier la compo de production**, et corriger au crayon de chaque poste
   si elle a la même chose. Le calcul n'en dépend pas : `TYPE_DPS` suit la classe.
4. **(Corrigé après le bilan.) L'alerte « Une barre à zéro ne veut pas dire mort »**, propre aux Chambres, s'affiche
   aussi sur l'onglet Guild Siege (capture 5). C'est mineur. On peut la masquer quand
   `tab === "gvg"`.

### Non livré, ou à faire hors du code

- **Discord n'a jamais été essayé en conditions réelles** (token vide en local). C'est tout
  le §5.
- **La bascule n'est pas faite** : le bot Python tourne, et `npm run bot:deploy` n'a pas été
  lancé (`/chambre` et `/recensement` ne sont pas enregistrées).
- **L'import du 18/10 n'est fait qu'en dev.** En production, c'est l'étape 3 de « Avant le
  jour J » de `BASCULE-BOT.md`.
- **L'historique du bot Python n'est pas importé.** Il faut son `data_chambre.json`, tiré du
  serveur GENESIS.
- **Le Guild Siege attend Maxime** : jours, horaires, plafond, et s'il a des manches à
  chronométrer.
- **Les écarts du §2** : la saisie du recensement, la suppression d'un perso et le
  classement général se font sur le site seulement. **À confirmer par Maxime**, puisque la
  décision 1 dit « tout dans Discord ».
- **Les participants du 18/10 sont inconnus** : la séance n'a aucune ligne de participant.
  Le staff peut la clôturer s'il retrouve qui était là.

### À trancher ou à relire par Maxime

1. **Les consignes des golems et de l'araignée** sont celles du modèle Dracarys
   (`evenements.ts:569`, « À RELIRE PAR MAXIME »). Elles se modifient dans le paramétrage.
2. **Le vert « Bien » `#2F8F5B`** de l'image et des embeds sort des cinq couleurs de
   GENESIS (§4.11 de la spec, « À VALIDER »).
3. **Un Primat en DPS compte en magique** (`TYPE_DPS`). Le modèle le laissait aussi
   compléter une équipe en physique (Q2 de la spec).
4. **L'écart connu du lot 3 (`fusionnerLu`)** : un membre qui s'annonce sur Discord, puis
   clique sur le site depuis un autre appareil moins de 15 s après, peut perdre son annonce
   Discord. C'est voulu, pour que « je m'annonce » puis « non » se défasse.
5. **Les lignes de poste du panneau Discord** reprennent le titre complet du poste : un
   titre comme « Primat — Tank croix » répète la classe. On peut renommer le poste dans le
   paramétrage.
6. **Les liens 🌐 du bot** prennent `NEXTAUTH_URL`, ou `SITE_URL`. Si ce n'est pas
   l'adresse publique en production, les boutons lien disparaissent ou pointent mal.
7. **`CHANNEL_CS` vide** veut dire le salon `1498696982229811352` (`.env.example:31`). Le
   salon choisi dans le paramétrage passe avant.

---

## 5. Ce qui ne se teste qu'en production : les essais Discord, dans l'ordre

Il faut :
- **A**, un compte staff (Maxime) ;
- **B**, un compte test membre : un second compte Discord relié au site, avec un rang de
  guilde, et si possible deux persos de la même classe (deux Arcanistes, par exemple) ;
- **E**, un second membre non staff, pour les échanges (un volontaire) ;
- **C**, un compte du serveur sans rang de guilde (visiteur, candidat ou Friend).

B et E acceptent les messages privés des membres du serveur. Il faut aussi un salon
**#essais-chambres** fermé à `@everyone` (staff, B et E).

### Étape 0 : après le déploiement, bascule encore coupée (n'importe quel jour)

1. Déployer en deux temps (`DEPLOY`, `BASCULE-BOT.md`, « Avant le jour J » 1). Le service
   `migrate` pousse le schéma : il ne doit annoncer aucune perte. **Le bot doit redémarrer** : le tick
   remplace les cron. Sur `/discord`, le bot doit être vivant.
2. Regarder **l'image dans le conteneur** : `essai-image-debrief.ts --complet`. `fc-match`
   doit trouver « Cinzel » et « Athiti », pas « DejaVu ». Ouvrir le PNG (étape 2 de
   `BASCULE-BOT.md`).
3. **Importer le 18/10** : `importer-debrief.ts --essai`, puis sans `--essai`. Bilans montre
   « Dim. 18 Oct. GAGNÉ publié ».
4. Sur `/discord/evenements`, régler les salons : Essais = **#essais-chambres** ; Chambres et
   Débriefs = les vrais salons. Enregistrer.
5. Cliquer **chaque Essai**. Le verdict « Essai envoyé » s'affiche dans la barre du bas.
   Dans #essais-chambres, chaque message doit arriver **sans aucune mention**, avec des
   boutons inactifs, les émojis de la table §8.2, et les chiffres DÉCLARÉS (le salon est
   fermé). Les essais à faire :
   - Panneau d'inscription, Annoncer une annulation ;
   - les rappels : veille, 13 h 30, 18 h 30, 20 h, récap ;
   - Essai de la répartition, Essai du débrief publié (avec l'image), Essai de la demande
     d'échange.
6. Retirer un droit au bot dans #essais-chambres (Joindre des fichiers), puis refaire
   « Essai du débrief publié ». Sur `/discord`, la commande doit passer en **échec, avec la
   raison en clair**. Rendre le droit.

### Étape 1 : le jour de la bascule (un lundi ou un jeudi, en journée)

1. Suivre `BASCULE-BOT.md`, « Le jour J », étapes 1 à 4 : arrêter le bot Python, retirer son
   application, `bot/deploy-commands.ts`, désactiver le doublon sur `/events`.
2. Sur `/discord/evenements` : pointer **temporairement** les salons Chambres ET Débriefs sur
   #essais-chambres. Mettre « Rappels des Chambres (général) » sur Activés, allumer la
   **bascule**, puis Enregistrer.
3. Dans Discord, recharger avec Ctrl+R. `/chambre` (8 sous-commandes) et `/recensement`
   doivent apparaître **une seule fois**, et aucune commande du bot Python ne doit rester.
4. **Avec B** : `/recensement` donne ses chiffres, avec leur date et 📏 ;
   `/recensement classe:Arcaniste` donne la liste de la classe ; `/chambre historique` donne
   ses Chambres. **Avec C** : `/recensement` et « Je viens » répondent ⛔.
5. **A** : `/chambre panneau`. M1 de la prochaine Chambre arrive dans #essais-chambres,
   **sans `@everyone`** (c'est une republication).
6. **B** : ✅ Je viens. La réponse est éphémère, avec un menu à choix multiple s'il a deux
   persos de la classe, puis le menu du poste. Sur le site, connecté en B : « Je suis
   annoncé·e », et le perso au bon poste. B clique ensuite « Pas cette fois » sur le site :
   le panneau Discord se met à jour en moins de 30 s. Puis ❌ Pas cette fois dans Discord.
   Même chose en sens inverse.
7. **A** : `/chambre repartition`. Les messages 🌳 et 👯 arrivent.
   - B prend Salle 3, puis reclique pour la libérer. E ne peut pas prendre une salle tenue
     par B.
   - B choisit 🟩 et son rôle.
   - B clique un bouton « (staff) » : il reçoit un refus éphémère.
   - A essaie Compléter, Placer et Placer · échanger.
   - Chaque geste se voit sur l'onglet Répartition en moins de 30 s, et un geste fait sur le
     site se voit dans Discord en moins de 30 s.
8. **B** : 📍 Mes positions (le bouton, puis `/chambre positions`). Il doit voir ses salles,
   son équipe, son golem et sa rotation, avec les menus par perso.
9. **Les échanges** :
   - E demande la salle de B. B reçoit le **message privé** 🔄 (✅ Accepter, ❌ Refuser, aucun
     @) et accepte : la salle change dans Discord et sur le site ;
   - une seconde demande est refusée ;
   - on laisse une troisième expirer (1 h) ;
   - A clique « Équilibrer (staff) », confirme, et regarde les équipes.
10. **A** : `/chambre recap`. M5 arrive sans mention, avec les golems, l'araignée, les
    consignes et les chiffres (le salon est fermé).
11. **L'annulation** : A annule la prochaine séance sur le site. M8 part, sans `@everyone`
    puisque ce n'est pas le jour même, et le panneau passe en « annulée ». A la rétablit.
12. **Ranger** : B et E se désannoncent, et A libère les salles (Effacer ou les menus du
    staff). Remettre les salons **Chambres et Débriefs sur les vrais salons**, puis
    Enregistrer. Le panneau de la veille partira à 20 h dans le bon salon.

### Étape 2 : la veille de la première Chambre (mardi ou samedi)

13. **20 h 00** : **UN** panneau, **UN** `@everyone`, dans le vrai salon. S'il y en a deux,
    le bot Python tourne encore : couper la bascule, puis revoir l'étape 1 de
    `BASCULE-BOT.md`.

### Étape 3 : le jour J

14. **13 h 30 et 18 h 30** : M2 ne part que s'il manque une classe, et celui de 18 h 30
    **supprime** celui de 13 h 30.
15. **20 h 00** : **un seul** message M3, avec `@everyone` et les participants.
16. **20 h 40** : M5 mentionne les participants. Une salle changée sur le site se voit dans
    le récap en moins de 30 s.
17. **Au lancement** : A tape `/chambre chrono`, puis Démarrer dans Discord. Le chrono
    tourne sur le site en moins de 5 s. Faire « étape suivante » sur le site : Discord suit
    en quelques secondes. B clique : refus éphémère. Faire « Annuler le dernier clic »,
    puis Arrêter, puis Annuler. *Le chrono ne se teste que pendant une vraie séance* :
    seule la séance qui se joue se chronomètre.

### Étape 4 : après la séance

18. **A** : `/chambre cloturer`. Tous sont cochés : décocher un absent, ajouter un annoncé
    non retenu, valider. Le panneau, le récap, la répartition et le chrono se ferment. Sur
    le site, chacun voit ses participations.
19. **« Faire le débrief maintenant »** :
    - noter Bien, Moyen ou Mal, saisir un chrono « 2:34 », une remarque contenant
      « <b> & co », « à retenir », gagné ;
    - pendant ce temps, noter **la même étape** sur le site : le second des deux voit le
      conflit, et rien n'est écrasé.
20. **Vidéos** (site, A) :
    - joindre un MP4 de moins de 100 Mo avec le moment 1:35, et un lien YouTube avec `t=` ;
    - connecté en B, il ne voit rien avant la publication ;
    - la vidéo se lit à partir de 1:35 avec des réponses **206** dans l'onglet réseau.
21. **Publier** :
    - M7 arrive dans le salon des débriefs, avec l'image en Cinzel et Athiti, l'analyse
      « vs dim. 18 oct. » et le bloc 🎬, dont les liens mènent à la page ;
    - dans un forum, un fil « Retour Chambre — {date} » s'ouvre, étiqueté Donjon ;
    - Bilans montre « publié » et le lien ;
    - B voit le débrief et les vidéos.

### Plus tard

- **Le Guild Siege**, quand Maxime aura donné ses jours : l'allumer et lui donner un
  créneau. Vérifier le panneau 🏯, « Je viens » avec un perso (un autre remplace le
  premier), le rappel `gs_staff` sans mention, la clôture et le débrief GS.
- **L'import de l'historique du bot Python**, si le fichier existe (§4, défaut 2).
- *Facultatif* : un bot redémarré à 13 h 34 envoie le rappel de 13 h 30, mais plus à
  13 h 41.

**Revenir en arrière** : couper la bascule sur `/discord/evenements`, puis Enregistrer. Le
détail est dans `BASCULE-BOT.md`, « Revenir en arrière ».

---

## 6. La bascule depuis le bot Python

Tout est dans **`BASCULE-BOT.md`** (même dossier) : pourquoi d'un coup, avant le jour J, le
jour J en six étapes, le contrôle de la première Chambre, et le retour en arrière. Ce bilan
y ajoute trois choses :
- les essais de l'étape 1 du §5, à faire avec les salons Chambres et Débriefs pointés sur un
  salon fermé de test, avant de les remettre ;
- la ligne périmée sur `importer-dracarys.ts` (§4, défaut 2) ;
- la décision de Maxime, « le bot Python s'arrête après le lot 7 », est maintenant possible
  à appliquer : le lot 7 est livré.

---

## 7. Le serveur de dev : faut-il le redémarrer ?

**Non.**
- **Le schéma n'a pas changé depuis le lot 2.** `prisma/schema.prisma` et le client généré
  (`node_modules/.prisma/client/schema.prisma`) datent tous deux de 09:29 et sont
  identiques.
- **La base de dev est à jour** : `prisma migrate diff` dit « No difference detected ».
- **Le serveur de :3040** (`next-server`, pid 69697) est né à 22:01:06. C'est après ce
  `generate`, et après la dernière modification de `next.config.js` (08:00), du middleware
  (08:38), du `Dockerfile` et de `package.json` (19:23). Aucun fichier de `src/`, `bot/`,
  `scripts/` ni `prisma/` n'a changé depuis le dernier build du lot 10.
- Les captures de ce bilan ont été faites sur ce serveur sans erreur.

**En production, en revanche**, le déploiement des lots 3 à 10 doit :
- pousser le schéma (le service `migrate`) ;
- reconstruire l'image, pour les polices et fontconfig ;
- **redémarrer le bot**, pour le tick et les nouvelles commandes ;
- créer le volume `vanguard_videos`, ce que `docker compose up` fait seul.
