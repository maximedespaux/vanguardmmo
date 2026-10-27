# Audit — l'espace des bras droits (staff)

Date : 2026-10-20 · Périmètre : lecture seule de `src/`, `bot/`, `prisma/`, `public/airguild/`.
Aucune écriture hors de ce fichier. Chaque affirmation cite son fichier ; ce qui n'a pas pu
être vérifié est marqué « à confirmer ».

---

## 1. Qui est « bras droit » : les rangs

| rang (`Role`) | niveau | ce qu'il ouvre |
|---|---|---|
| RECRUE | visiteur / candidat | rien de la guilde (`src/config/roles.ts:18`) |
| GUARD, VETERAN | membre | pages `guild` (`roles.ts:18`, `canAccessGuild` l.30) |
| OFFICIER, GENERAL | **staff** | pages `admin` (`roles.ts:19`, `canAccessAdmin` l.57) |
| VANGUARD, DIRECTION | staff **+** | en plus : modération, réglages de page, catalogue AirGuild |

- Hiérarchie : `ROLE_RANK` (`src/config/roles.ts:15`), 7 rangs.
- « Bras droits » est écrit en toutes lettres à deux endroits : `isOfficer = canAccessAdmin`
  commenté « Officier+ = bras droits » (`src/lib/access.ts:157`), et le badge du GuildViewer
  qui range GENERAL et OFFICIER sous `brasdroit`, DIRECTION et VANGUARD sous `fondateur`
  (`src/app/(admin)/guildviewer/page.tsx:24`).
- Côté bot, même périmètre : `isStaff` = permission ManageGuild ou l'un des 4 rôles
  DIRECTION/VANGUARD/GENERAL/OFFICIER (`bot/lib/permissions.ts:18-30`).
- **Il existe donc un cran intermédiaire dans le staff**, défini par rang et non par liste :
  - `canParametrer` = VANGUARD et au-dessus (`roles.ts:77`) — réglages de page (`/api/reglages`) ;
  - modération réservée au rang Vanguard (`src/app/api/admin/moderation/route.ts:57-58`,
    `peutModerer` dans `src/app/api/admin/membre/[id]/route.ts:107`) ;
  - édition du catalogue AirGuild réservée VANGUARD/DIRECTION (`public/airguild/airguild.js:33`).
- **Les gardes** : la consigne en cite six dont `apiAdmin`, qui **n'existe nulle part** dans
  `src/` ni `bot/`. Les gardes réelles du staff sont `requireAdmin` (layout,
  `src/app/(admin)/layout.tsx:4`), `apiRole(ADMIN_ROLES)` (`src/lib/access.ts:129`, 8 routes)
  et `apiAuth` + `canAccessAdmin`. **Un relevé qui ne cherche pas `apiRole` voit 8 routes
  staff « sans garde » à tort** : `admin/bank-request`, `admin/bank-request/[id]`,
  `admin/bot-command`, `admin/channels`, `admin/membre/[id]`, `admin/moderation`,
  `admin/users`, `transactions/[id]`.
- Le middleware recopie les listes de rôles au lieu de les importer
  (`src/middleware.ts:38-39`) : deux sources à tenir d'accord.

---

## 2. Inventaire des outils staff

### 2a. Les 11 pages du groupe `(admin)`

Toutes protégées par `requireAdmin` (`src/app/(admin)/layout.tsx:4`) et par
`ADMIN_PREFIXES` (`src/middleware.ts:37`).

| page | ce qu'elle permet | API | rangée dans nav.ts |
|---|---|---|---|
| `/guildviewer` | liste des membres, persos, builds, filtres (rang, sans build), historique de build, bouton **Dossier** | `/api/admin/users` (apiRole) | Guilde, l.236 |
| ↳ Dossier membre (`src/components/DossierMembre.tsx`) | 4 onglets : le membre / absences / économie / décisions ; 5 gestes (ouvrir un coffre, retirer un rôle, retirer de la guilde, kick, ban) avec motif obligatoire | `/api/admin/membre/[id]`, `POST /api/admin/moderation` | — (modale) |
| `/candidatures` | filtrer, accepter / refuser / mettre en attente / entretien | `/api/admin/candidatures` (apiAuth+canAccessAdmin) | Guilde, l.237 |
| `/statistiques` | qui livre, qui demande, courbe 30 j, devenir des ventes (servies, abandons, délai médian, sans détenteur) | `/api/admin/statistiques` | Guilde, l.238 |
| `/journal` | demandes, apports, décisions d'audit, filtré par membre ; tableau « qui prend / qui donne » | `/api/admin/journal` | Guilde, l.239 |
| `/gestion-worldboss` | fiches de boss, programmer, changer le statut, supprimer | `/api/admin/worldboss` (createBoss, createEvent, setStatus, deleteEvent) | Guilde, l.240 |
| `/discord` | interrupteurs des rappels CS / Guild Siege, Embed Builder, Giveaway, Panneau classes, suivi des commandes du bot | `/api/admin/settings`, `/api/admin/bot-command`, `/api/admin/channels` | Guilde, l.241 |
| `/annonce` | un embed dans un salon (même commande `post_embed` que l'onglet Embed de `/discord`, `annonce/page.tsx:36-38`) | `/api/admin/bot-command` | Guilde, l.242 |
| `/events` | événements du jeu annoncés par le bot (CRUD + activer) | `/api/admin/events` | Guilde, l.243 |
| `/mes-ventes` | ce que le staff connecté a vendu, encaissé / engagé | `/api/mes-ventes` | **Boutique**, l.202 |
| `/coffre` (AirGuild) | stock par coffre de membre, crafts, base des objets | `/api/admin/airguild` | **Boutique**, l.208 |
| `/plan-farm` | ce qui manque aux seuils, sur le stock réel | `/api/admin/farm` | **Boutique**, l.209 |

**Le « Bot Discord » est déjà un seul outil à 5 onglets** — Pilotage, Créneaux, Events du jeu,
World Boss, Annonce (`src/components/SectionTabs.tsx:18-24`, posé sur les 4 pages). nav.ts en
fait pourtant **4 entrées distinctes** (l.240-243).

### 2b. Les fonctions staff nichées dans des pages de membres

| où | fonction staff | preuve |
|---|---|---|
| `/dashboard` | bandeau « Priorités du jour » + groupe de portes « Tenir la guilde » (11 portes) | `dashboard/page.tsx:74,241` ; `dashboard/portes.ts:141-187` |
| `/boutique` → groupe « Servir », onglet « À livrer » | commandes des autres, sans détenteur ; ouvrir un chantier, réserver sa part | `src/components/EcranEconomie.tsx:80,347` ; `RequetesClients.tsx` |
| bandeau d'une vente | valider une offre, passer en quête, libérer, clore, rouvrir | `src/app/api/ventes/[id]/route.ts:159` et suiv. |
| `/quetes` → « Quêtes secondaires » | ce qui manque au coffre + dépôt rapide | `quetes/page.tsx:161,265` ; `/api/coffre/depot` |
| `/compositions` | « Ils étaient là », consignes, builds de référence | `compositions/page.tsx:110` ; routes `compositions/presences`, `strategie`, `ref` (canAccessAdmin) |
| `/messages` | le staff voit les fils de toutes les commandes | `src/lib/messagerie.ts` (via `compterFilsNonLus`) |
| toute page à réglages | panneau Vanguard (`/dashboard`, `/donjons`) | `useReglages` dans `dashboard/page.tsx`, `donjons/PageDonjons.tsx` |

**Bilan** : 11 pages staff réparties sur **2 espaces** du menu (8 sous Guilde, 3 sous
Boutique), plus 7 fonctions staff dispersées dans des pages de membres. Les retirer de
l'espace Boutique — que Maxime veut supprimer — exige de leur trouver une autre place.

---

## 3. Ce qu'un bras droit doit suivre chaque jour — et où c'est aujourd'hui

| à suivre | où on le voit aujourd'hui | compteur qui existe déjà | ce qui ne va pas |
|---|---|---|---|
| Candidatures en attente | `/candidatures`, salon Décision Discord, rappel bot toutes les 2 h avec mention @Officier (`bot/scheduler.ts:94-126,273`), priorité du jour | `/api/dashboard` → `candidatures.pending/waiting` ; `/api/admin/candidatures?status=PENDING` | décision prise sur le site ≠ décision prise sur Discord (voir §4) |
| Absences | nulle part en liste : seulement dans le dossier de CHAQUE membre | `/api/dashboard` → `absences.pending/active` ; `/api/absences?all=1` (officiers, `absences/route.ts:9`) **sans aucun appelant** | aucune validation possible (§4) |
| Commandes sans détenteur | `/boutique?mode=requetes`, `/statistiques` | `/api/quetes/a-prendre` ; `/api/admin/statistiques` → `ventes.sansDetenteur` (l.120), `demandesEnAttente` (l.138) | éclaté entre boutique et stats |
| Offres de vente à valider | seulement dans le bandeau de chaque vente | aucun | pas de liste « à valider » |
| Achats à crédit (ce qui reste des « dettes ») | dossier du membre, compteur `achatsACredit` | `/api/membres/[nom]` l.103-110 | un compteur qui ne descend jamais : aucun état « remboursé » |
| World Boss | `/gestion-worldboss`, priorité « < 1 h » | `/api/dashboard` → `worldboss.upcoming/next` | le bot n'annonce rien (§4) |
| Membres inactifs | dossier (« inactif depuis N j ») | `inactifDepuis` (`admin/membre/[id]/route.ts:101`), `membresActifs` (`statistiques/route.ts:134`) | aucune LISTE des inactifs ; `isActive` ne mesure pas l'activité (§4) |
| Coffre sous le seuil | `/plan-farm`, `/coffre`, porte + priorité de l'accueil | `/api/admin/farm`, `/api/catalogue` (via `etatCoffre`) | l'accueil compte sur une autre table que le plan de farm (§4) |
| Gestes de modération en attente / échoués | dossier de chaque membre | `GET /api/admin/moderation` sans `discordId` rend les 60 derniers — **aucun appelant** | un geste ÉCHOUÉ ne remonte nulle part |
| Commandes du bot échouées | `/discord` (20 dernières) | `/api/admin/bot-command` GET | le bot en panne ne se voit que là |
| Présences CS | `/compositions` | `/api/compositions` | correct, à relier |
| Messages en attente | `/messages`, enveloppe du bandeau | `/api/notifications` → `fils` | correct |

Le « suivi » est donc éclaté entre **7 pages** (`/dashboard`, `/candidatures`, `/guildviewer`
+ dossier, `/boutique`, `/statistiques`, `/discord`, `/gestion-worldboss`) et **3 sujets
n'ont aucune vue d'ensemble** : les absences, les gestes de modération et les offres à valider.

---

## 4. Défauts trouvés en chemin (vérifiés dans le code)

1. **Les absences ne se valident pas.** Le statut naît `PENDING` (`prisma/schema.prisma:57`)
   et aucune ligne du dépôt n'écrit `APPROVED` ni `REJECTED` sur une absence : la route n'a que
   GET et POST (`src/app/api/absences/route.ts:6,17`). Conséquences :
   - « absences en cours » ne compte que les `APPROVED` (`api/dashboard/route.ts:65-67`) → **vaut
     toujours 0** ;
   - la priorité « absence(s) à valider » (`api/dashboard/route.ts:97-99`) envoie vers
     `/absences`, qui n'affiche que les absences **de la personne connectée**
     (`absences/page.tsx:29`, pas de `?all=1`) ;
   - la page dit « le staff est prévenu » (`absences/page.tsx:39`) alors que le POST ne crée
     aucune notification ; le bot dit « en attente de validation par un officier »
     (`bot/commands/absence.ts:47`).
2. **Une candidature décidée sur le site ne prévient personne.** `POST /api/admin/candidatures`
   met à jour la ligne et l'audit, rien d'autre (`route.ts:31-35`). Depuis Discord, le bot
   envoie un MP au candidat (`bot/index.ts:105`) et réécrit l'embed (`bot/lib/decisions.ts:150`).
   Depuis le site : pas de MP, l'embed garde ses boutons (le relais ne repasse que sur
   `messageId: null`, `bot/scheduler.ts:174`). **Aucun des deux chemins ne donne le rôle de
   guilde** : le bot n'a pas de commande pour ça (`bot/lib/botcommands.ts:76-85`), alors que
   le site sait déjà le faire (`attribuerRole`, `src/lib/discord.ts:87`).
3. **L'accueil compte le coffre sur une table déconnectée.** `/api/dashboard` lit `CoffreItem`
   (`route.ts:34,71`) ; le plan de farm dit en commentaire que cette table « était
   déconnectée » et lit le vrai stock (`api/admin/farm/route.ts:6-7`). La porte « Plan de
   farm » affiche donc un chiffre que la page derrière ne montre pas (`portes.ts:165-170`).
4. **« Actifs » ne veut pas dire actifs.** `User.isActive` (`schema.prisma:106`) ne passe à
   `false` que lors d'un kick / ban par le bot (`bot/lib/moderation.ts:126-128`). Le vrai signe
   de vie est `lastSeenAt` (`schema.prisma:103`) — visites du SITE, pas présence en jeu.
   `/statistiques` compte ses actifs après avoir écarté ceux qui n'ont ni apporté ni demandé
   (`statistiques/route.ts:62`) : le chiffre sous-compte.
5. **Réserver sa part depuis la boutique échoue.** `RequetesClients.tsx:59-61` envoie un
   **POST** à `/api/quetes/[id]`, qui n'exporte que **PATCH** (`route.ts:22`) ; `/quetes`, lui,
   appelle bien en PATCH (`quetes/page.tsx:214`). À confirmer en navigateur (attendu : 405).
6. **Le World Boss n'a aucun rappel.** Les drapeaux `remind1hSent/30/10` existent
   (`schema.prisma:436-438`) mais rien ne les lit ; le bot ne mentionne le World Boss que dans
   un commentaire (`bot/config.ts:118`). La page est pourtant rangée sous l'onglet du bot.
7. **« Vanguard seul » n'est tenu que côté client pour l'AirGuild.** `PUT /api/admin/airguild`
   remplace tout l'état avec une simple garde staff (`route.ts:55-59,72-86`). La restriction
   VANGUARD/DIRECTION est dans le JS (`public/airguild/airguild.js:33`). Un officier peut donc,
   par un appel direct, réécrire `owners` — l'attribution de coffre que la modération réserve
   au rang Vanguard (`api/admin/moderation/route.ts:80-95`).
8. **Routes staff sans appelant** (aucune référence dans `src/` hors API ni dans `public/`) :
   `/api/admin/bank-request` (+ `[id]`), `/api/transactions` (+ `[id]`), `/api/admin/coffre`,
   `/api/admin/coffre/log`, `GET /api/admin/moderation` sans filtre, `/api/absences?all=1`.
9. Le relevé `/api/dashboard` renvoie les `priorities` du staff à tout membre de la guilde
   (garde `apiGuild`, `route.ts:8`) ; seul l'écran les masque (`dashboard/page.tsx:241`).
   Ce ne sont que des compteurs : faible gravité.

---

## 5. Proposition : l'espace « Bras droits »

Rien ne bouge sur le disque : les groupes de routes ne changent pas les URL. C'est une carte
dans `src/config/nav.ts` (un espace `acces: "admin"`) plus **une page d'entrée**.

### 5.1 Tableau de bord staff — une file « à traiter » unique

Une page neuve (proposition : `/staff`, groupe `(admin)`, déclarée dans nav.ts le même jour).
En haut, **une seule file**, triée par urgence, chaque ligne = un geste et un lien :

| ligne de la file | source | API existante | manque |
|---|---|---|---|
| N candidatures en attente (et depuis combien d'heures) | `Application` | `/api/dashboard` | — |
| N absences à regarder | `Absence` | `/api/absences?all=1` | une route de validation (ou acter qu'on ne valide pas) |
| N commandes sans détenteur | `BankRequest` | `/api/admin/statistiques` (`sansDetenteur`) | — |
| N offres à valider | `OffreVente` | — | un compte `statut retenue/proposee, valideePar null` |
| N gestes de modération échoués | `ActionMembre` | `GET /api/admin/moderation` | filtre `statut: ECHOUEE` |
| N commandes du bot échouées | `BotCommand` | `/api/admin/bot-command` | filtre `FAILED` |
| World Boss dans moins d'une heure | `WorldBossEvent` | `/api/dashboard` | — |
| N membres sans visite depuis 14 j | `User.lastSeenAt` | — (calcul par membre seulement) | une liste |
| N objets du coffre sous le seuil | `AirGuildState` | `/api/admin/farm` | corriger l'accueil (§4.3) |

En dessous, **4 compteurs qui comptent** : membres actifs (30 j, sur `lastSeenAt`), absents
aujourd'hui, commandes en cours, objets sous le seuil.

### 5.2 Membres
- La liste du GuildViewer + le dossier (déjà là) ; une colonne « dernière visite » et un filtre
  « inactifs ».
- Candidatures **à côté** des membres : c'est le même geste (qui entre, qui reste).

### 5.3 Suivi
- **Absences** (nouvelle vue staff : qui est absent cette semaine).
- **Commandes** : l'onglet « À livrer » de la boutique, les offres à valider, les achats à crédit.
- **Activité** : `/statistiques` et `/journal` en deux onglets d'une même entrée.
- Plan de farm.

### 5.4 Outils
- **Bot Discord** en UNE entrée (ses 5 onglets existent déjà).
- Coffre (AirGuild), Mes ventes.

### 5.5 Correspondance avec la demande de Maxime
- Supprimer l'espace **Boutique** (`nav.ts:183-211`) libère `/mes-ventes`, `/coffre`,
  `/plan-farm` : ils rejoignent Bras droits.
- Supprimer **Quête Guilde** (`nav.ts:173-182`) : l'onglet staff « Quêtes secondaires » de
  `/quetes` est en partie le plan de farm ; à rapprocher de Suivi.
- Supprimer **Toutes les pages** (`nav.ts:267`) : si l'accueil unique liste tout, l'espace staff
  y tient en UNE porte « Bras droits » à la place des 11 du groupe « Tenir la guilde »
  (`portes.ts:141-187`), et les priorités du jour quittent l'accueil des membres pour le
  tableau de bord staff.
- Résultat chiffré : 11 entrées staff aujourd'hui → **4 entrées** (Tableau de bord, Membres,
  Suivi, Outils).

---

## 6. API : ce qu'il faut ajouter, au plus court

1. **`GET /api/admin/a-traiter`** (garde `apiRole(ADMIN_ROLES)`) : une seule route qui agrège la
   file du §5.1 en réutilisant les requêtes de `/api/dashboard` et `/api/admin/statistiques`.
   Une seule lecture au lieu de neuf, et elle peut voyager avec `/api/notifications`, déjà
   appelé toutes les 45 s (`src/app/api/notifications/route.ts`).
2. **`PATCH /api/absences/[id]`** (valider / refuser) — OU retirer le mot « validation » de
   l'écran et du bot si Maxime préfère une simple déclaration.
3. Corriger `/api/dashboard` pour compter le coffre avec `etatCoffre()` (`src/lib/coffre.ts:77`).
4. Une liste des membres inactifs (`lastSeenAt` plus vieux que N jours, rangs guilde).

## 7. Ce que le bot ou le site peut automatiser

Le site possède déjà le jeton du bot et sait poster, modifier un message, envoyer un MP et
donner un rôle (`src/lib/discord.ts:22,50,67,87`). Sans toucher au bot :
- **Candidature acceptée sur le site** → MP au candidat, rôle de guilde, embed Discord mis à jour
  (le site connaît `channelId`/`messageId`, `schema.prisma` modèle `Application`).
- **Absence déclarée** → `prevenirStaff` (`src/lib/ventes.ts:331`) existe, il suffit de l'appeler.
- **Récap quotidien** dans le salon staff : `remindApplications` (`bot/scheduler.ts:94-126`) est
  le gabarit exact ; on l'élargit à la file « à traiter ».
- **Rappels World Boss** : les drapeaux sont en base, il manque le tick.

## 8. Questions pour Maxime
1. Une absence se **valide**-t-elle, ou se **déclare**-t-elle seulement ?
2. L'espace est-il ouvert aux 4 rangs staff, ou les outils de réglage (Bot, AirGuild) restent-ils
   Vanguard+ comme la modération ?
3. Acceptation de candidature : quel rôle Discord donner automatiquement (Guard ?) ?
4. Les achats à crédit doivent-ils pouvoir être marqués « remboursés » ?
5. Toujours ouvert depuis août : « kick » et « retirer de la guilde » restent-ils deux gestes ?

## 9. Ordre de travaux proposé
1. Corriger les 3 mensonges d'affichage (absences, coffre de l'accueil, POST → PATCH).
2. Route `a-traiter` + page tableau de bord staff, déclarée dans nav.ts le même jour.
3. Regrouper la nav : 11 entrées → 4.
4. Automatisations candidature / absence / récap quotidien.
5. Fermer côté serveur la réserve « Vanguard seul » de l'AirGuild.
