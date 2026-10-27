# Audit — le bot Discord et l'automatisation (GENESIS)

*Relevé du 2026-10-20, sur le worktree `genesis-logo-identity-9b8b28`. Audit en lecture seule : rien n'a été exécuté contre Discord.*

**Demande de Maxime concernée :** « Voir aussi le système du bot discord pour tout automatiser sur le site. Avoir un espace, pour les bras droits : dashboard, membres et suivi etc… »

**Limite à garder en tête :** en local, `DISCORD_BOT_TOKEN` est vide (`.env`, longueur 0), comme `DISCORD_GUILD_ID`, `CHANNEL_*` et `ROLE_*`. Le bot s'arrête dès le démarrage (`bot/index.ts:20`), et toutes les fonctions de `src/lib/discord.ts` renvoient `null`/`false` en silence (`discord.ts:15-18`). **Aucune des automatisations ci-dessous ne peut être vérifiée ailleurs qu'en production.** Ce rapport décrit le code. Il ne dit pas ce que la prod affiche.

---

## En bref

1. **Le bot tourne déjà en continu** : 13 tâches planifiées, 10 commandes slash, 6 familles de boutons. Mais une bonne part du code est éteinte, notamment toute la boutique et les dettes.
2. **Le site parle à Discord par quatre canaux**, et non un seul : la base partagée (file `BotCommand` et tables relues par le bot), des appels REST directs avec le token du bot, un webhook, et le jeton OAuth du joueur à la connexion.
3. **Le geste le plus coûteux pour le staff reste manuel : donner le rôle de rang à une recrue acceptée.** Aucune ligne du dépôt n'attribue de rang (un `grep` de `roles.add` ne trouve que les boutons et réactions de rôle). Et une candidature tranchée **sur le site** ne prévient pas le candidat et ne met pas à jour l'embed Discord.
4. **Le site n'a aucun planificateur** (pas de `node-cron` ni d'instrumentation dans `src/`). Tout ce qui se déclenche à une heure fixe doit donc vivre dans `bot/scheduler.ts`.
5. **Pour le tri** : `/annonce` fait la même chose que l'onglet Embed de `/discord`. `/events`, `/gestion-worldboss`, `/annonce` et `/discord` peuvent devenir une seule page « Discord & agenda » dans l'espace bras droits.

---

## 1. Ce que le bot fait déjà seul

### 1.1 Tâches planifiées (`bot/scheduler.ts:271-315`)

| Tâche | Fréquence | Ce qu'elle fait | Preuve |
|---|---|---|---|
| `remindApplications` | toutes les 2 h | Relance le staff (ping `ROLE_OFFICIER`) sur les candidatures en attente depuis plus de 24 h, au plus une fois par 24 h et par candidature. Le message part dans `CHANNEL_STAFF`, ou dans `CHANNEL_CANDIDATURES` à défaut. | `scheduler.ts:94-126`, `:273` |
| `relayNewApplications` | toutes les 2 min | Poste dans `#decision` (texte ou forum) toute candidature PENDING, WAITING ou INTERVIEW qui n'a pas encore de `messageId`, avec les boutons Accepter / Refuser / Attente / Entretien. | `scheduler.ts:171-181`, `:275` ; `decisions.ts:135-139` |
| `endDueGiveaways` | chaque minute | Tire les gagnants des giveaways arrivés à échéance (transition atomique RUNNING → ENDED). | `giveaways.ts:72-87`, `:128-131` |
| `syncGuildChannels` | au démarrage, puis toutes les 10 min | Remplit le cache `GuildChannel`, lu par les menus de salons du site. | `botcommands.ts:24-44` |
| `syncGuildRoles` | au démarrage, puis toutes les 10 min | Remplit le cache `GuildRole`, qui affiche les rôles par leur nom dans le dossier membre. | `moderation.ts:27-44` |
| `processBotCommands` | toutes les 12 s | Consomme la file `BotCommand` : `post_embed`, `create_giveaway`, `post_class_panel`, `moderation`. 5 commandes par passage, avec une garde contre la réentrance. | `botcommands.ts:67-97` |
| `syncMemberRanks` | au démarrage, puis toutes les 10 min | Recalcule `User.role` depuis les rôles Discord en direct, sans attendre une reconnexion. Si la lecture des membres échoue, personne n'est rétrogradé. | `scheduler.ts:250-269` |
| `tickEvents` | chaque minute | Annonce les `GameEvent` activés (embed personnalisable), avec un rappel N minutes avant. Les événements sont lus en base et se modifient sur `/events`. | `scheduler.ts:149-165`, `:299` |
| Rappels Chambres Secrètes | mar., mer., sam., dim. à 20 h | `@everyone` la veille et le jour même, avec le compte de présents et des manques par classe (lu dans `CompositionState`). Coupés par défaut, interrupteur `cs_rappels_actifs`. | `scheduler.ts:51-90`, `:302-307` |
| Rappels Guild Siege | ven. et sam. à 20 h | Même mécanique. **Horaire jamais confirmé**, interrupteur `gs_rappels_actifs` coupé. | `scheduler.ts:308-313` |

**Écrit mais plus planifié (code mort)** : `relayBankRequests`, `openDiscussions`, `closeFinishedExchanges` (`scheduler.ts:184-244`), `syncDecidedBankRequests` (importé en `:15`, jamais appelé). Le commentaire de `scheduler.ts:283-286` annonce un `remindDebts` « conservé », mais **cette fonction n'existe nulle part** : un `grep remindDebts` ne trouve que ce commentaire.

### 1.2 Commandes slash (`bot/commands/index.ts:13-17`)

| Commande | Pour qui | Remarque |
|---|---|---|
| `/aide` | tous | **Liste des commandes qui n'existent plus** : `/dette`, `/dettes`, `/dette-payer`, `/dette-supprimer` (`aide.ts:20`, `:32`). |
| `/mesperso` | tous | Personnages du site (`mesperso.ts`). |
| `/coffre [catégorie]` | tous | **Lit `CoffreItem`, une table que plus aucune page n'alimente.** Le vrai stock est dans `AirGuildState.inv` (`coffre/depot/route.ts:29-33`). Seule `/api/admin/coffre` écrit dans `CoffreItem`, et aucune page ne l'appelle. |
| `/absence` | tous | Crée une `Absence` en PENDING. Crée aussi un `User` RECRUE si la personne n'en a pas (`absence.ts:35-43`). |
| `/candidature` | tous | Candidature réduite : une seule classe, sans personnages, sans quiz ni build (`candidature.ts:48-59`). La version du site est plus complète. |
| `/embed` | staff (ManageMessages) | Créer, poster ou éditer des embeds, avec modèles (`EmbedTemplate`). |
| `/giveaway` | staff | Créer, terminer, refaire un tirage, compter les participants (`giveaway.ts`). |
| `/panneau-classes` | staff (ManageRoles) | Panneau de 8 boutons de classe (`classpanel.ts`). |
| `/boutonrole`, `/rolereaction` | staff (ManageRoles) | Rôles en libre-service par bouton ou par réaction, avec vérification de la hiérarchie (`boutonrole.ts:42-47`, `rolereaction.ts:30-34`). |

L'enregistrement des commandes auprès de Discord est **manuel** (`npm run bot:deploy`, `deploy-commands.ts`). Le conteneur `bot` ne lance que `npx tsx bot/index.ts` (`docker-compose.prod.yml`). Si l'ancien jeu de commandes (`/dette`…) est encore enregistré en prod, un membre qui l'utilise ne reçoit aucune réponse : `index.ts:45` fait `if (!cmd) return;` sans répondre. **À vérifier en prod.**

### 1.3 Boutons, réactions, modales (`bot/index.ts:56-85`)

- `app:*` : décision sur une candidature, staff seulement (`isStaff`, `permissions.ts:26-30`). Met à jour la base, édite l'embed, écrit l'audit **et envoie un MP au candidat** (`index.ts:88-107`).
- `role:*` : bascule d'un rôle (`buttonroles.ts`) ; réactions → rôle (`reactionroles.ts`).
- `gw:join:*` : participer à un giveaway (bascule).
- `bank:*`, `hold:*`, `exch:*`, modale `exchtime:` : **plus jamais émis**. `bankRequestButtons` renvoie `[]` (`decisions.ts:202-204`) et les salons d'échange ne sont plus créés. Leurs gestionnaires restent pourtant actifs. Comme `closeFinishedExchanges` ne tourne plus, d'anciens salons d'échange peuvent encore exister avec des boutons qui marchent. Un clic sur « J'accepte » appelle alors `applyBankAccept`, qui débite `CoffreItem` (`decisions.ts:385`). **À vérifier côté serveur Discord.**

### 1.4 Messages privés envoyés par le bot

Un seul est encore atteignable : la décision sur une candidature, **et seulement quand elle est prise par le bouton Discord** (`index.ts:99-105`). Les MP de la boutique (`index.ts:119`, `:125`) dépendent de boutons qui ne sont plus émis.

---

## 2. Ce que le site commande au bot, et par quel canal

| Canal | Sens | Ce qui passe par là | Preuve |
|---|---|---|---|
| **A. Base partagée, file `BotCommand`** | site → bot | Embed (pages `/discord` et `/annonce`), giveaway, panneau de classes, modération (retirer un rôle, retirer de la guilde, kick, ban). Exécuté en 12 s environ. Le statut DONE ou FAILED revient dans `BotCommand.result`, et dans `ActionMembre` pour la modération. **Pas de nouvelle tentative, pas d'heure programmée.** | `api/admin/bot-command/route.ts:6,44` ; `api/admin/moderation/route.ts:116-124` ; `botcommands.ts:76-94` ; `schema.prisma:594-606` |
| **A bis. Base partagée, tables relues par le bot** | site → bot | `Setting` (interrupteurs CS et GS), `GameEvent` (`/events`), `Application` sans `messageId`, `CompositionState` (présences CS) | `api/admin/settings/route.ts:14` ; `api/admin/events/route.ts` ; `scheduler.ts:65,155,173` |
| **A ter. Base partagée, caches écrits par le bot** | bot → site | `GuildChannel`, `GuildRole`, `User.role` / `discordRoles`, verdict `ActionMembre`, `Giveaway` | voir 1.1 |
| **B. REST direct avec le token du bot** (`src/lib/discord.ts`) | site → Discord | Annonce et mise à jour « pris par X » dans le salon des ventes (`CHANNEL_VENTES`, ID par défaut codé en dur), appel à participer à un chantier, **MP de vente** (`prevenir`), rôle **Vérifié(e)** à la connexion, test d'appartenance au serveur, invitation au serveur | `ventes.ts:309-322`, `:345`, `:382-447` ; `auth.ts:96` ; `access.ts:58-63` ; `api/discord/invite` |
| **C. Webhook** `DISCORD_CANDIDATURES_WEBHOOK` | site → Discord | Embed public « Nouvelle candidature » dans `#candidatures`. **En plus** du post du bot dans `#decision` : une candidature venue du site produit donc deux messages. | `api/application/route.ts:40-83` |
| **D. Jeton OAuth du joueur** | Discord → site | Appartenance au serveur et rôles du joueur, lus à la connexion | `auth.ts:40-51`, `:60-69` |

**Incohérence de doctrine.** Le commentaire de la modération dit que « le site n'a pas de connexion Discord » (`api/admin/moderation/route.ts:25`), alors que `src/lib/discord.ts` en est une, en service. Il existe deux façons d'agir sur Discord :
- **BotCommand** : tracée, avec un verdict lisible sur le site, mais différée de 12 s ;
- **REST direct** : immédiat, mais muet en cas d'échec.

**Règle proposée :** toute action qui doit laisser une trace (rôles, sanctions, annonces programmées) passe par BotCommand. Le REST direct reste réservé aux notifications sans enjeu (MP, annonce de vente).

---

## 3. Ce qui reste manuel, et comment l'automatiser

*Classement par temps gagné pour le staff, du plus fort au plus faible.*

### 3.1 Candidature acceptée : rôle de rang, MP et embed à jour

- **Aujourd'hui :** après « Accepter » sur `/candidatures`, la route ne fait que mettre à jour la base et le journal d'audit (`api/admin/candidatures/route.ts:31-35`). Il n'y a **ni MP, ni rôle, ni mise à jour de l'embed `#decision`**. Ce dernier reste « En attente », boutons actifs, car `relayNewApplications` ne traite que les candidatures sans message (`scheduler.ts:174`). Le staff doit donc aller sur Discord, retrouver la personne, lui ajouter le rang, éventuellement ses classes, et la prévenir. Tant que le rang manque, le site la traite en RECRUE et lui ferme les pages de guilde (`roles.ts:30`). Même en passant par le bouton Discord, le MP part mais **aucun rôle n'est donné**.
- **Déclencheur :** une décision sur `/candidatures` **ou** un bouton `app:*`. Les deux chemins doivent appeler la même fonction.
- **Action du bot :** nouvelle `BotCommand` `candidature { appId, status, auteur }`. Le bot réédite l'embed (`applyApplicationDecision`, `decisions.ts:142-152`) et envoie le MP (textes déjà écrits en `index.ts:99-104`). Si la candidature est acceptée, il ajoute `RANK_ROLES.GUARD` (`config.ts:34-41`) puis, en option, les rôles de classe déduits de `Application.chars[].cls` via `CLASS_ROLES` (`config.ts:54-63`). Il passe ensuite `User.role` à GUARD, sans attendre la synchro de 10 min, et écrit le verdict dans `BotCommand.result`, affiché sur `/candidatures`.
- **Déjà là :** la file, `dm()` (`mp.ts`), le contrôle de hiérarchie (`verifieHierarchie`, `moderation.ts:53-58`), les tables de rôles, l'embed.
- **Manque :** le type de commande, sa mise en file depuis la route, l'affichage du verdict, et le choix du rôle d'entrée. GUARD est le plus bas des rangs connus (`config.ts:42`). Existe-t-il un rôle Discord « Recrue » chez GENESIS ? **Question pour Maxime.**
- **Risques :** le bot n'attribue qu'un rôle **placé sous son rôle le plus haut**. La note de juillet le place 3ᵉ en partant du haut ; c'est à revérifier après la refonte GENESIS, si des rôles ont été recréés. Le propriétaire du serveur est intouchable. Ajouter un rôle déjà présent est sans effet, donc un double clic ne pose pas de problème. Rien de tout cela n'est testable en local.
- **Gain : le plus fort.** Il porte sur chaque recrue, et sur plusieurs gestes Discord à chaque fois.

### 3.2 Départs du serveur répercutés sur le site

- **Aujourd'hui :** `syncMemberRanks` saute les membres absents du serveur (`scheduler.ts:260` : `if (!m) continue;`). Un membre parti garde son rang en base. Il reste dans la liste des membres, les statistiques et les notifications de guilde (`quetes/route.ts:122-127` prévient tous les GUARD et plus). Surtout, il **garde l'accès** jusqu'à la fin de sa session : `estVerifie` accepte un rang de guilde sans interroger Discord (`access.ts:54`), et la session JWT n'a pas de durée fixée (`auth.ts:11`), donc le défaut de next-auth v4 s'applique, soit 30 jours. Seuls le kick et le ban font le ménage (`moderation.ts:120-129`).
- **Déclencheur :** l'événement `GuildMemberRemove` (l'intent `GuildMembers` est déjà demandé, `index.ts:25`), plus la synchro de 10 min en filet de sécurité.
- **Action :** même traitement en base que `repercuteEnBase("guilde")` : RECRUE, `isActive: false`, `discordRoles: []`. Écrire une ligne `ActionMembre` « départ » pour garder une trace dans le dossier, et prévenir le staff.
- **Manque :** la branche « absent du serveur » et l'écouteur d'événement.
- **Risques :** une lecture partielle de la liste des membres rétrograderait des gens à tort. Il faut un **seuil de sécurité** : ne rien appliquer si plus d'environ 20 % de la base serait touchée. L'intent `GuildMembers` est privilégié : s'il est coupé sur le portail Discord, la lecture échoue et rien ne se passe, ce qui est déjà le comportement actuel.
- **Gain : fort.** Les listes restent justes sans ménage à la main, et une fuite d'accès se ferme.

### 3.3 Récap hebdo du staff, et socle de l'espace bras droits

- **Aujourd'hui :** le staff doit faire le tour du tableau de bord, de `/candidatures`, `/statistiques`, `/journal`, `/guildviewer`… Les « priorités » du tableau de bord existent (`api/dashboard/route.ts:86-103`), mais le compteur « coffre à compléter » lit `CoffreItem`, une table morte (`:34`, `:71`).
- **Déclencheur :** une tâche du bot (par exemple le lundi à 9 h), avec une notification sur le site en parallèle.
- **Contenu :** candidatures en attente, arrivées et départs de la semaine, absences en cours et à venir, membres sans visite depuis 30 jours (`actifRecemment`, `api/admin/statistiques/route.ts:59`), quêtes ouvertes, commandes sans preneur, manques au coffre **lus dans `AirGuildState`**, présences aux CS.
- **Manque :** un module partagé `src/lib/recap.ts`, utilisable par le bot via l'alias `@/*` comme `compositions.ts` l'est déjà (`scheduler.ts:14`). **Le même module alimenterait le tableau de bord des bras droits** : le récap Discord et la page staff affichent ainsi les mêmes chiffres.
- **Risque :** faible, il ne fait que poster.
- **Gain : fort et récurrent.** C'est aussi la réponse directe à « un espace pour tout suivre ».

### 3.4 Rappels World Boss

- **Aujourd'hui :** le schéma prévoit `WorldBossEvent.channelId`, `remind1hSent`, `remind30Sent` et `remind10Sent` (`schema.prisma:434-438`), mais **aucun code ne les lit** (un `grep` ne trouve rien). La page `/gestion-worldboss` ne propose même pas de choisir un salon. Programmer un passage ne prévient donc personne.
- **Action :** une tâche par minute qui lit les passages PLANNED, poste un rappel à 1 h, 30 min et 10 min (effectif inscrit, lien `/worldboss`), lève le drapeau correspondant, puis passe le statut à ONGOING et DONE. Ajouter un bouton « Je viens » sur le message, qui écrirait un `EventParticipant` comme le fait `gw:join` pour les giveaways.
- **Déjà là :** le modèle, la boucle `tickEvents`, les inscriptions (`api/worldboss/[eventId]/participate`).
- **Manque :** la tâche, le choix du salon dans l'interface, le bouton.
- **Risque :** faible. Prévoir une mention modérée (`@here` ou un rôle, pas `@everyone`).

### 3.5 Absences : validation inutile, staff prévenu, retour annoncé

- **Aujourd'hui :** l'absence naît PENDING (`api/absences/route.ts:21` ; `absence.ts:41`), mais **aucune route ne permet de la valider** (seuls GET et POST existent). Le tableau de bord affiche pourtant « absence(s) à valider » avec un lien vers `/absences` (`api/dashboard/route.ts:97-99`), une page qui ne montre que **ses propres** absences : elle n'appelle jamais `?all=1` (`absences/page.tsx:29`). Le message de confirmation affirme « le staff est prévenu » (`absences/page.tsx:39`), ce qui est faux : aucune notification n'est créée.
- **Proposition :** une absence est une **information**, pas une demande. Elle serait APPROVED dès sa création. Le staff recevrait une notification (et un message dans `CHANNEL_STAFF` via le bot). Une tâche quotidienne annoncerait « de retour aujourd'hui ». Les absents seraient retirés du compte des manques dans le rappel CS. En option : un rôle Discord « Absent » posé puis retiré automatiquement.
- **Risque :** le rôle « Absent » est soumis à la hiérarchie. Valider automatiquement reste une **décision de Maxime** : la question est ouverte depuis le 2026-08-10.

### 3.6 Annonces programmées

- **Aujourd'hui :** une `post_embed` part dès le passage suivant (`botcommands.ts:71`). On ne peut ni programmer, ni mentionner : l'embed part sans `content` (`botcommands.ts:60`).
- **Manque :** `BotCommand.runAt DateTime?`, sans risque pour `db push` puisque la colonne accepte `null`, un filtre `runAt <= maintenant`, un champ date et heure, une liste « programmées » avec un bouton d'annulation, et un choix de mention.
- **Risque :** si le bot est arrêté à l'heure prévue, l'annonce part en retard. Il faut une fenêtre d'expiration.

### 3.7 Un seul système d'événements récurrents

Trois mécanismes coexistent aujourd'hui :
1. `GameEvent`, réglable sur `/events` ;
2. les créneaux CS et GS **codés en dur**, avec leur salon `SALON_CS` (`scheduler.ts:36`, `:300-313`) et leurs deux interrupteurs sur `/discord` ;
3. le tableau `EVENTS` de `config.ts:115-119`, que **plus rien ne lit**, alors que le README demande toujours de l'éditer (`README.md:94-114`).

**Proposition :** ajouter à `GameEvent` un rappel « la veille » et un lien optionnel vers un créneau CS, migrer CS et GS en lignes `GameEvent`, et supprimer `EVENTS`. L'horaire du Guild Siege devient alors modifiable sans toucher au code. **Gain :** surtout de la maintenance, plus une page en moins.

### 3.8 Relance des commandes qui dorment

`annoncerVente` poste une seule fois (`ventes.ts:417-428`), puis rien. **Proposition :** une demande sans preneur depuis 24 h serait relancée dans le salon des ventes et signalée au staff. **Risque :** du bruit. Une seule relance suffit.

### 3.9 Inactifs : une liste proposée, jamais un kick automatique

**Déclencheur :** le récap hebdo. **Contenu :** les membres sans visite depuis 30 ou 60 jours et sans absence déclarée, chacun avec un bouton qui ouvre le dossier membre. Le geste « retirer de la guilde » existe déjà (`api/admin/moderation/route.ts:30-36`) : rang Vanguard, motif obligatoire.

**Risque :** `lastSeenAt` mesure la présence **sur le site**, pas en jeu, d'où des faux positifs. La décision reste humaine.

### 3.10 Rôles de classe tirés des personnages du site

`CLASS_ROLES` ne sert qu'au panneau en libre-service (`classpanel.ts:14`), malgré son commentaire « Utilisé par la synchro » (`config.ts:53`). **Proposition :** ajouter les rôles des classes réellement jouées, sans jamais en retirer, pour ne pas défaire un choix fait sur le panneau. `ROLE_SPEC_*` est présent dans `.env.prod.example` et le README, mais n'est lu par aucun code. **Gain :** faible.

### 3.11 Pseudos

**Ne jamais synchroniser un surnom dans `User.username`.** Le coffre est indexé par pseudo : `inv[a.user.username]` (`coffre/depot/route.ts:33`) et `detenteursDe` (`ventes.ts:69`). Le bot retrouve aussi les vendeurs par `username` (`decisions.ts:236`). Un renommage couperait le membre de son coffre. Ce risque **existe déjà** : `auth.ts:75` réécrit `username` à chaque connexion. Une synchro de surnom doit écrire dans un champ séparé (par exemple `pseudoJeu`), et tout renommage du surnom Discord par le bot exige ManageNicknames et la hiérarchie.

### Hors de portée tant que rien n'est décidé : les rappels de dettes

Les dettes ont été retirées (`schema.prisma:214-219`). La seule « dette » restante est `OffreVente.reglement = "dette"`, qui n'a **ni échéance, ni état « réglé »** (`schema.prisma:764-816`). On ne peut pas relancer une dette sans date. Il faudrait d'abord trancher : Maxime a jugé le système « trop lourd ».

---

## 4. Le tri, dans le sens de la demande (moins de pages)

- **Fusionner `/discord`, `/annonce`, `/events` et `/gestion-worldboss`** en une seule entrée de l'espace bras droits, « Discord & agenda », avec trois onglets. `SectionTabs.tsx:18-24` les regroupe déjà, mais `nav.ts:240-243` les liste toujours comme 4 entrées.
  - **Agenda** : événements récurrents, World Boss, créneaux.
  - **Publier** : annonce, embed, giveaway, panneau ; avec programmation.
  - **Journal du bot** : historique `BotCommand`, et santé du bot.
- **Supprimer `/annonce`** : elle envoie la même `post_embed` que l'onglet Embed de `/discord` (`annonce/page.tsx:36-39` contre `discord/page.tsx:165`).
- **Ajouter un indicateur « bot en ligne »** : battement de cœur dans `Setting` à chaque passage, ou alerte quand une `BotCommand` reste PENDING plus d'une minute. Aujourd'hui, si le bot tombe, rien ne le dit ; les commandes s'empilent en silence.
- **Commandes slash :**
  - corriger `/aide` ;
  - réaligner ou retirer `/coffre`, qui lit une table morte ;
  - remplacer `/candidature` par un lien vers le formulaire du site, plus complet ;
  - garder `/absence`, pratique sur mobile.
- **Choisir un seul message par candidature** : le webhook `#candidatures` **ou** le post `#decision`, pas les deux.
- **Supprimer le code mort de la boutique** : `exchange.ts`, les boutons `bank:`, `hold:` et `exch:`, et les relais non planifiés. Fermer d'abord les éventuels anciens salons d'échange.

---

## 5. Défauts relevés au passage (non corrigés : audit seulement)

| Défaut | Preuve |
|---|---|
| Absence : « le staff est prévenu », alors qu'aucune notification n'est créée | `absences/page.tsx:39` ; `api/absences/route.ts:17-25` |
| « Absences à valider » renvoie vers une page qui ne montre que les siennes, et aucune route ne valide | `api/dashboard/route.ts:97-99` ; `absences/page.tsx:29` |
| Candidature tranchée sur le site : ni MP, ni mise à jour de l'embed Discord ; ses boutons restent cliquables et peuvent contredire la décision | `api/admin/candidatures/route.ts:31-35` ; `scheduler.ts:174` |
| Départ volontaire du serveur : le rang reste en base, et l'accès jusqu'à 30 jours | `scheduler.ts:260` ; `access.ts:54` ; `auth.ts:11` |
| Drapeaux de rappel World Boss jamais lus | `schema.prisma:434-438` |
| `/coffre` et le tableau de bord lisent `CoffreItem`, qui n'est plus alimentée | `commands/coffre.ts:17,38` ; `api/dashboard/route.ts:34` |
| `/aide` et le README décrivent des commandes et des rappels de dettes disparus | `aide.ts:20,32` ; `README.md:30-33,51` |
| Tableau `EVENTS` de la config inutilisé | `config.ts:115-119` |
| Textes du bot encore signés « Vanguard » : MP de candidature, pied des rappels CS, `/aide`, webhook | `index.ts:100-103` ; `scheduler.ts:86` ; `aide.ts:11` ; `api/application/route.ts:60,80` |

---

## 6. Questions pour Maxime

1. Quel rôle Discord recevra une recrue acceptée : GUARD, ou un rôle « Recrue » à créer ? Et doit-on lui donner ses rôles de classe automatiquement ?
2. Une absence doit-elle encore être validée, ou devient-elle une simple information ?
3. Un seul message par candidature : `#candidatures` (public) ou `#decision` (staff, avec boutons) ?
4. Après la refonte GENESIS, le rôle du bot est-il toujours au-dessus de tous les rangs ?
5. Quel est l'horaire du Guild Siege ?
6. Les inactifs : à quel seuil (30 ou 60 jours) ? Le site doit-il se contenter de proposer, ou aussi agir ?

## 7. Ordre conseillé

1. 3.1 (recrue).
2. 3.2 (départs). Ces deux points ensemble rendent la liste des membres fiable : c'est le socle du tableau de bord des bras droits.
3. 3.3 (récap partagé avec la page staff).
4. 3.4 (World Boss) et 3.5 (absences).
5. 4 (fusion des pages Discord et nettoyage du code mort), avec 3.6 et 3.7.

**À chaque étape, prévoir un essai en production** avec un compte test et un rôle placé tout en bas : le local ne peut rien prouver.
