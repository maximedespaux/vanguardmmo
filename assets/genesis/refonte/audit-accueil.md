# Audit des accueils — un seul accueil pour GENESIS

Date : 2026-10-20. Périmètre : `/`, `/histoire`, `/dashboard`, `/sommaire`, le panneau « Tout ».
Méthode : lecture intégrale du code de chaque page, bloc par bloc, et des routes `/api` qui les
alimentent. Aucun fichier de `src/` ni de `bot/` n'a été modifié. Chaque affirmation cite son
fichier ; ce qui n'a pas pu être vérifié est marqué **(à vérifier)**.

Demande de Maxime : « On va enlever "Quête Guilde", "Boutique", "Toutes les pages", un seul et
même accueil avec tous les éléments. Faire du tri. [...] Avoir un espace, pour les bras droits :
dashboard, membres et suivi. »

---

## 0. En bref

- Le site a **cinq points d'entrée** qui se disent « accueil » ou en jouent le rôle, et le mot
  « accueil » désigne deux pages différentes selon l'endroit où on clique.
- `/` et `/histoire` affichent **le même hero**, au pixel près. `/sommaire` et le panneau « Tout »
  sont **la même liste**, calculée deux fois. `/dashboard` est une troisième liste de liens.
- Un membre qui se connecte **atterrit sur `/`**, la page publique, avec un bouton « Se connecter
  avec Discord » alors qu'il vient de le faire. Son vrai accueil (`/dashboard`) est à deux clics.
- Cible : **une seule URL, `/`, trois vues** (visiteur, membre, bras droit). Le public reste en
  HTML servi à tous ; tout ce qui concerne la guilde arrive après, depuis des routes gardées.
- Quête Guilde et Boutique deviennent des **tuiles d'action** et des lignes du bloc « À faire ».
  « Toutes les pages » devient un **plan du site replié** en bas de l'accueil.
- Quatre défauts de données sont à corriger avant de recopier les chiffres du tableau de bord sur
  le nouvel accueil (section 4).

---

## 1. L'état des lieux : cinq points d'entrée

| Entrée | Fichier | Accès | Comment on y arrive |
|---|---|---|---|
| `/` | `src/app/page.tsx` → `src/components/accueil/PageAccueil.tsx` | public | logo (`Shell.tsx:53`), nav « Accueil » (`nav.ts:253`), **retour après connexion** (`login/page.tsx:75`, `callbackUrl: "/"`), renvoi du middleware `/?error=` (`middleware.ts:52-53`) |
| `/histoire` | `src/app/(public)/histoire/page.tsx` | public | nav « La guilde » (`nav.ts:254`), et **trois liens « Retour à l'accueil »** : `not-found.tsx:14`, `error.tsx:21`, `login/page.tsx:81` |
| `/dashboard` | `src/app/(guild)/dashboard/page.tsx` | guilde (`middleware.ts:35`, layout `requireGuild`) | clic sur l'espace « Guilde » (`nav.ts:225`), entrée « Accueil de la guilde » (`nav.ts:228`), porte de `/` (`PortesSite.tsx:200-204`) |
| `/sommaire` | `src/app/(shop)/sommaire/page.tsx` | guilde (`middleware.ts:36`, layout `(shop)`) | entrée « Toutes les pages » (`nav.ts:267`), porte « Tout le site » de `/dashboard` (`portes.ts:196-201`) |
| Panneau « Tout » | `src/components/PanneauTout.tsx` | toute session (`Shell.tsx:110-112`) | bouton en haut à droite |

**Le mot « accueil » ne désigne pas la même page partout** : `/` pour le logo et la nav, `/histoire`
pour les pages d'erreur et la page de connexion. Le commentaire de `src/app/page.tsx:13` dit encore
que `/histoire` « reste l'entrée Accueil de la navigation », ce que `nav.ts:253` ne fait plus.

**Ce que la barre du haut montre aujourd'hui** (compté sur `nav.ts` avec le filtre de `Shell.tsx:35-45`) :

| Qui | Entrées de la barre | Pages dans « Tout » |
|---|---|---|
| Visiteur | Accueil, La guilde, Candidature, AirBuilder▾, Astuces▾ (5) + « Se connecter » | pas de panneau (pas de session) |
| Membre (Guard, Vétéran) | Accueil, La guilde, Toutes les pages, AirBuilder▾, Astuces▾, Quête Guilde, Boutique▾, Guilde▾ (8) | 21 |
| Bras droit (Officier et +) | les mêmes 8 | 32 |

---

## 2. Inventaire bloc par bloc

Légende « pour qui » : V = visiteur non connecté, C = candidat (connecté, rôle RECRUE),
M = membre (GUILD_ROLES, `roles.ts:18`), S = staff (ADMIN_ROLES, `roles.ts:19`).

### 2.1 `/` — PageAccueil (7 blocs)

| # | Bloc | Ce qu'il montre | Données | Pour qui | Doublon |
|---|---|---|---|---|---|
| 1 | Hero `HeroFlyff` (`PageAccueil.tsx:85`) | plein écran (`HeroFlyff.tsx:108`), titre GENESIS, « Peu de membres, mais présents. Discord et vocal obligatoires », bouton « Se connecter avec Discord », « Découvrir la guilde » | aucune ; image `/assets/site/new/accueil.webp` | V, C | **identique** au hero de `/histoire` (`histoire/page.tsx:122`). Le bouton de connexion s'affiche **même connecté** : le fichier ne lit pas la session (`HeroFlyff.tsx:1-3`, `:94`) |
| 2 | Avis d'accès `AvisAcces` (`:90`) | « réservé aux membres / au staff » après un renvoi du middleware | `?error=` (`AvisAcces.tsx:24`) | tous | aucun — à garder |
| 3 | Bandeau « Serveur privé Airborn… On a ouvert le jeu » (`:93-137`) | d'où viennent les données, « sans compte » | aucune (`BandeauCartes.tsx`) | V | aucun |
| 4 | Quatre chiffres (`:139-157`) | 8 spécialisations, N instances, N objets, N vagues | comptés côté serveur (`chiffres.ts:45-87`) dans `src/data` et `public/wiki` | V | aucun depuis le retrait de `/histoire` |
| 5 | « Les huit fins de partie » `ClassesHeros` (`:160-182`) | 8 cartes classe + arme → `/classes` | `src/data/classes.ts` + armes écrites dans `ClassesHeros.tsx:56-65` | V, C | même sujet que « Les classes représentées » de `/dashboard` (le jeu d'un côté, la guilde de l'autre) |
| 6 | « Ce que le site fait » `PortesSite` (`:190-204`) | 13 portes dont 4 sous cadenas (`PortesSite.tsx:107-205`) | comptes côté serveur (`chiffres.ts:113-134`) | V, C | recoupe les menus, « Tout », `/sommaire` et 7 portes de `/dashboard`. La porte `/dashboard` (`:200-204`) mène à l'accueil qu'on va fusionner |
| 7 | « Rejoindre » (`:207-277`) | illustration du serveur, 20 capes, « Postuler » + « La guilde et ses règles » | aucune | V, C | même rôle que le bloc « Prêt à nous rejoindre ? » de `/histoire` (`histoire/page.tsx:215-230`) |

Points de détail : la page exporte `metadata` (`page.tsx:28-31`) et reste prérendue en statique
(`AvisAcces` est sous `Suspense` pour ça, `PageAccueil.tsx:88-90`). Sur `/`, un visiteur voit
**deux** boutons de connexion (la barre et le hero), parce que `Shell.tsx:116` ne masque celui de la
barre que sur `/histoire` et `/candidature`.

### 2.2 `/histoire` — « La guilde » (5 blocs)

| # | Bloc | Ce qu'il montre | Données | Pour qui | Doublon |
|---|---|---|---|---|---|
| 1 | Hero `HeroFlyff` (`:122`) | le même que `/` | aucune | V, C | **doublon exact** |
| 2 | Intro « Présents, ça veut dire… » (`:131-161`) | la définition de l'engagement, image `guildsiege.webp` | aucune | V, C | aucun — contenu propre à garder |
| 3 | « Nos objectifs », 4 cartes (`:70-108`, `:171-203`) | vocal, guide → `/astuces`, Chambres Secrètes → `/compositions` (membres), coffre → `/boutique` | aucune | V, C | les liens recoupent les portes de `/` |
| 4 | Phrase « Le site et le bot partagent la même base » + lien vers `/` (`:207-210`) | renvoi | aucune | V | n'existe que parce qu'il y a deux pages |
| 5 | CTA « Prêt à nous rejoindre ? » (`:215-230`) | la seule condition ferme (« être joignable en vocal ») + « Postuler maintenant » | aucune | V, C | même rôle que le bloc 7 de `/` |

La page est un composant client (`:1`) sans `metadata` ni layout propre : son titre de page est
celui du gabarit racine, « GENESIS » (`src/app/layout.tsx:7-9`). La fusionner dans `/`, qui a un
vrai titre et une vraie description, ne fait rien perdre au référencement.

### 2.3 `/dashboard` — « L'accueil de la guilde » (7 blocs + réglages)

| # | Bloc | Ce qu'il montre | Données | Pour qui | Doublon |
|---|---|---|---|---|---|
| 1 | En-tête (`:317-328`) | art `flyff00000`, « N portes vers les outils », bouton réglages | aucune | M | — |
| 2 | Priorités du jour (`:334-356`) | jusqu'à 6 lignes classées haute/moyenne/basse | `/api/dashboard` → `priorities` (`route.ts:86-103`) | **S** (filtré côté client, `page.tsx:241`) | les chiffres reviennent dans les blocs 4 et 6 |
| 3 | Où j'en suis `OuJenSuis` (`:245-257`) | mes persos, niveau, prestige, nombre de stuffs, alerte « sans stuff » | `/api/profil` (`route.ts:83-98`) | M | recoupe `ProfilePanel` (compteurs et commandes depuis la même route, `ProfilePanel.tsx:72`) et la fenêtre `AccueilPersonnages` (zéro perso) |
| 4 | L'état de la guilde `Grandeurs` (`:259-275`) | 4 barres : membres actifs, persos avec build, coffre au seuil, candidatures traitées | `/api/dashboard` (`Grandeurs.tsx:50-94`) | surtout **S** ; affiché à tous les membres | les notes répètent les priorités |
| 5 | Les classes représentées `Classes` (`:277-282`) | répartition des persos de la guilde par classe | `/api/dashboard` → `characters.classes` | M (préparer une compo), S | même sujet que les 8 cartes de `/` |
| 6 | Portes en 4 groupes (`:286-296`, `portes.ts:72-190`) | Mes affaires (5), Jouer ensemble (3), Ce que la guilde sait (3), Tenir la guilde (11, staff) | libellés lus dans `nav.ts`, comptes depuis les deux routes | M, S | **troisième liste de liens** après la nav et « Tout » ; « Mes affaires » recopie les raccourcis de `ProfilePanel.tsx:22-27` |
| 7 | Porte « Tout le site » (`:299-301`) | renvoi vers `/sommaire` | — | M | n'existe que parce que l'index est une autre page |
| — | Réglages Vanguard (`:69-118`) | 7 réglages + 1 par groupe + « groupe en premier » | `PageReglages` | Vanguard et Direction | — |

Le compte « 23 portes » vu par Maxime est celui du staff : 5 + 3 + 3 + 11 portes de groupe
(`portes.ts:78-188`) + la porte du sommaire (`page.tsx:239`). Un membre en voit 12.

### 2.4 `/sommaire` et le panneau « Tout »

Les deux affichent **la même chose** : les entrées de `ESPACES` et `HORS_ESPACES`, filtrées par le
même calcul de droits, recopié deux fois (`Shell.tsx:35-45` pour le panneau,
`sommaire/page.tsx:24-28` pour la page). `/sommaire` se liste lui-même (`nav.ts:261-267`, le
commentaire l'assume). Utile pour M et S comme filet de sécurité ; pour un visiteur, aucun des deux
n'est accessible (`middleware.ts:36` et `Shell.tsx:110`).

### 2.5 À côté des accueils, mais dans le même sujet

- `ProfilePanel` (haut-droite) : identité, commandes en cours, raccourcis Mes personnages / Mon
  build / Mes demandes / Mes absences (`ProfilePanel.tsx:22-27`), Mes ventes pour le staff.
- `AccueilPersonnages` : fenêtre unique « déclare tes personnages » pour un membre sans perso
  (`AccueilPersonnages.tsx:9-23`).
- `Alertes` : cloche et enveloppe, `/api/notifications` rend `{ items, unread, fils }`
  (`api/notifications/route.ts:19`).

---

## 3. Les doublons, mesurés

1. **Le hero** : 1 composant, 2 pages, même texte et même bouton (`PageAccueil.tsx:85`,
   `histoire/page.tsx:122`).
2. **L'appel à rejoindre** : 2 blocs, 2 boutons « Postuler » sur 2 pages voisines.
3. **Les listes de liens** : la nav, « Tout », `/sommaire`, les portes de `/dashboard`, les portes
   de `/`, les raccourcis de `ProfilePanel`. Six listes. Pour un membre sur `/dashboard`, `/builder`
   est atteignable par la porte (`portes.ts:95`), l'alerte « Ouvrir AirBuilder »
   (`OuJenSuis.tsx:70`), chaque ligne de perso (`OuJenSuis.tsx:78`), le menu, « Tout » et
   « Mon build ».
4. **Le même nombre répété sur un seul écran staff** : les objets sous le seuil apparaissent
   **4 fois** (priorité `route.ts:100-101`, note de barre `Grandeurs.tsx:76`, porte coffre
   `portes.ts:160`, porte plan de farm `portes.ts:169`), les candidatures en attente **3 fois**
   (`route.ts:89-90`, `Grandeurs.tsx:88`, `portes.ts:151`).
5. **Les classes** : les 8 cartes du jeu (`ClassesHeros`) et la répartition de la guilde
   (`Grandeurs.tsx:162-184`) parlent des mêmes 8 classes sur deux pages. Les clés concordent :
   l'enum `CharacterClass` (`schema.prisma:25-34`) et les clés de `CLASSES` (`classes.ts:30-40`)
   sont les mêmes 8 noms, à la casse près. On peut donc poser le compte de la guilde sur chaque
   carte.

---

## 4. Défauts trouvés en lisant, à corriger dans la même passe

Ils comptent parce que le nouvel accueil recopierait ces chiffres.

1. **Les absences ne sont jamais validées, donc « N absents en ce moment » vaut toujours 0.**
   Une absence naît `PENDING` (`schema.prisma:208`), `POST /api/absences` ne fait que créer
   (`api/absences/route.ts:17-25`), et aucune route ni le bot n'écrivent `APPROVED` (seul lecteur :
   `api/dashboard/route.ts:66`). La priorité « absence(s) à valider » envoie le staff vers une page
   qui ne peut pas valider. C'était déjà la question ouverte de la note GuildViewer du 2026-08-10.
2. **Le coffre du tableau de bord lit une table que l'interface n'alimente pas.**
   `/api/dashboard` lit `CoffreItem` (`route.ts:34`). Le vrai stock est calculé depuis
   `AirGuildState` par `etatCoffre()` (`src/lib/coffre.ts:77-83`), qu'utilisent le plan de farm,
   le catalogue et les ventes. `/api/admin/coffre`, seule route qui écrit `CoffreItem` en entier,
   n'est appelée par aucune page (recherche dans `src/`, `public/` et `bot/`). La barre « Coffre au
   seuil » et le « N à combler » de la porte plan de farm peuvent donc contredire la page plan de
   farm elle-même **(l'écart réel en base est à vérifier)**.
3. **Deux priorités mènent au mauvais endroit.** « personnage(s) sans build » et « membre(s) sans
   personnage principal » comptent toute la guilde mais envoient vers `/personnages`
   (`route.ts:94`, `:96`), qui ne liste que les persos du membre connecté
   (`api/characters/route.ts:9`, `where: { userId }`). Destination juste : `/guildviewer`.
4. **Le hero propose de se connecter à quelqu'un qui l'est déjà** (`HeroFlyff.tsx:94`), et c'est
   l'écran où tout membre atterrit après la connexion (`login/page.tsx:75`).
5. **`/api/dashboard` envoie à tout membre des champs de staff** : `priorities`,
   `members.roles`, `coffre.topDeficits` (`route.ts:105-114`), gardée par `apiGuild` seulement
   (`route.ts:8`). Le tri est fait côté navigateur (`dashboard/page.tsx:241`). Ce n'est pas une
   fuite publique, mais l'espace bras droits demande de séparer ces données.
6. **La boutique est publique, le menu la cache aux visiteurs.** `(vitrine)` n'a aucun garde
   (`(vitrine)/layout.tsx:23-25`), `boutique/page.tsx:17-19` rend pour tous, et `/` comme
   `/histoire` la présentent « à regarder sans compte » (`PortesSite.tsx:174-177`,
   `histoire/page.tsx:106`). Mais l'espace Boutique porte `acces: "guild"` (`nav.ts:194`).
7. **Commentaires périmés** (sans effet à l'écran) : `page.tsx:13` (voir section 1) et
   `PortesSite.tsx:67-68`, qui dit que la nav présente `/objets` comme publique alors que
   `nav.ts:138` porte `acces: "guild"`.

---

## 5. La cible : un seul accueil à `/`

### 5.1 Principes

1. **Une URL, trois vues.** `/` reste l'adresse indexée. La vue dépend de qui regarde :
   **visiteur** (aucune session, ou RECRUE), **membre** (`canAccessGuild`), **bras droit**
   (`canAccessAdmin`, soit Direction, Vanguard, Général, Officier, `roles.ts:19`).
   `ProfilePanel.tsx:14-15` réserve le badge « brasdroit » à Général et Officier : à faire confirmer.
2. **Le public est servi en HTML à tous, la guilde arrive après.** Aucune donnée de membre n'est
   jamais dans le HTML de `/` (voir 5.6).
3. **`nav.ts` reste la source unique.** Le plan du site, les tuiles et la barre lisent le même
   fichier. Une page qui quitte la barre doit **rester déclarée** dans `nav.ts`, sinon elle
   disparaît du plan : c'est déjà ce qui arrive aux portes, `porteDe` rend `null` pour une adresse
   absente de la nav (`portes.ts:211-216`).
4. **Un chiffre, une place.** Chaque compte s'affiche à un seul endroit : la ligne « À faire » ou
   « À traiter » s'il y a un geste à faire, sinon la tuile.

### 5.2 Ce qu'on garde, fusionne, supprime

| Bloc actuel | Décision | Où il va |
|---|---|---|
| Hero (`/` et `/histoire`) | **garder une fois** | vue visiteur seulement ; le bouton de connexion disparaît quand on est connecté. Vue membre : bandeau compact (~140 px) |
| AvisAcces | garder | en tête, toutes vues |
| Bandeau « le jeu » + 4 chiffres | garder, **ajouter le champ de recherche du wiki** (`/wiki?q=`, accepté par `wiki/page.tsx:29-30`) | visiteur ; le champ seul remonte dans le bandeau compact des membres |
| 8 cartes de classe + « classes représentées » | **fusionner** | une grille : la carte du jeu pour tous, le compte de la guilde par-dessus pour les membres |
| Portes publiques (13) | garder, **retirer la porte `/dashboard`** (`PortesSite.tsx:200-204`) | visiteur |
| Intro « Présents… » + 4 objectifs (`/histoire`) | **déplacer** | section « La guilde » (ancre `#la-guilde`), visiteur ; repliée en bas pour les membres (ce sont les règles) |
| Les deux « Rejoindre » | **fusionner** | un seul bloc : l'illustration de `/`, la condition ferme et le bouton de `/histoire` |
| Phrase « le site et le bot… » (`histoire:207-210`) | **supprimer** | elle renvoyait d'une page à l'autre |
| Priorités du jour | garder, corriger (section 4) | bloc « À traiter », bras droit, tout en haut |
| Où j'en suis | garder | « À faire » (l'alerte) + « Mes personnages » (la liste) |
| État de la guilde (barres) | **sortir de l'accueil** | espace bras droits (autre chantier) ; une tuile y mène |
| Portes « Mes affaires » | **supprimer** | les raccourcis de `ProfilePanel` le font déjà |
| Portes « Jouer ensemble » | **transformer** | tuiles d'action (avec Boutique) |
| Portes « Ce que la guilde sait » | **supprimer** | plan du site + menu Astuces |
| Portes « Tenir la guilde » (11) | **déplacer** | espace bras droits ; sur l'accueil, une seule tuile |
| Porte « Tout le site », `/sommaire`, panneau « Tout » | **remplacer** | plan du site intégré (5.5) |
| Réglages du tableau de bord | garder le mécanisme | rattachés à `/` ; les réglages des blocs supprimés partent avec eux |

### 5.3 L'ordre des sections selon qui regarde

| Ordre | Visiteur / candidat | Membre | Bras droit |
|---|---|---|---|
| 0 | Avis d'accès (si `?error`) | Avis d'accès | Avis d'accès |
| 1 | Hero plein écran : connexion + Postuler | Bandeau compact : GENESIS, recherche, prochain rendez-vous | Bandeau compact |
| 2 | Le jeu : recherche wiki + 4 chiffres | **À faire** (mes gestes en attente) | **À traiter** (priorités corrigées) |
| 3 | Ce que le site fait (12 portes) | **Mes outils** (6 tuiles) | À faire |
| 4 | Les huit classes | Mes personnages | Mes outils (+ tuile « Espace bras droits ») |
| 5 | La guilde (Présents + objectifs) | Les classes de la guilde (cartes + comptes) | Mes personnages |
| 6 | Rejoindre | Plan du site (replié) | Les classes de la guilde |
| 7 | Plan du site (pages publiques) | La guilde et ses règles (replié) | Plan du site (replié, groupe staff compris) |

Un candidat connecté (RECRUE) voit la vue visiteur, sans le bouton de connexion et avec
« Postuler » en action principale : il est sur le serveur, pas dans la guilde
(`canAccessGuild` exclut RECRUE, `roles.ts:18`).

### 5.4 Où vont Quête Guilde et Boutique

Elles quittent la barre du haut **sans quitter `nav.ts`** : leurs entrées passent dans l'espace
« Guilde », donc elles restent dans le menu Guilde▾ et dans le plan du site. Sur l'accueil, elles
existent à deux endroits, chacun pour un usage :

- **Tuile d'action** (on y va pour faire quelque chose) :
  « Quête Guilde — N à prendre » ; « Boutique — commander, ou ta commande en cours ».
- **Ligne « À faire »** (quelque chose attend le membre) :
  « N apports à confirmer sur tes quêtes » (le compte existe déjà dans la page,
  `quetes/page.tsx:253`) ; « Ta commande : à récupérer » (état tiré de `/api/profil`, mêmes
  libellés que `ProfilePanel.tsx:42-50`).
- Pour un bras droit, « À traiter » ajoute « N commandes à servir » (onglet « Servir » de la
  boutique, `EcranEconomie.tsx:80`). **Ce compte n'existe dans aucune route aujourd'hui** : il faut
  l'ajouter.

Une ligne « À faire » ne s'affiche que s'il y a un geste. Bloc vide : une seule ligne, « Rien ne
t'attend. »

### 5.5 Remplacer « Toutes les pages » : le plan du site

- Une section **repliée par défaut** (`<details>`) en bas de l'accueil, ancre `#plan`, sur 4
  colonnes (AirBuilder, Astuces, Guilde, Staff), libellés seuls, sans description.
- Générée depuis `nav.ts` avec **une seule fonction de filtre**, sortie de `Shell.tsx:35-45` et
  `sommaire/page.tsx:24-28`, qui la recopient aujourd'hui. Par exemple `espacesPour(role)` dans
  `nav.ts`, appelée par la barre et par le plan.
- La partie publique est rendue côté serveur : un moteur de recherche y trouve des liens vers
  toutes les pages publiques. Les entrées membre et staff s'ajoutent après connexion.
- `/sommaire` devient une redirection vers `/#plan`. Le bouton « Tout » est retiré
  (`Shell.tsx:10`, `:112`) : il faisait la même chose sur un autre support.

### 5.6 Ne jamais montrer une donnée de membre à un visiteur

Les garanties, dans l'ordre :

1. **Le HTML de `/` ne contient que du public.** Les blocs membre sont des composants client qui
   ne s'affichent qu'avec une session de guilde et lisent **uniquement des routes gardées** :
   `/api/dashboard` (`apiGuild`, `route.ts:8`), `/api/profil` (`apiAuth` + `canAccessGuild`,
   `route.ts:83-84`), `/api/quetes` (`route.ts:13-17`), `/api/compositions` (`route.ts:10-14`),
   `/api/worldboss` (`apiGuild`, `route.ts:7`), `/api/notifications` (`apiAuth`, ne rend que les
   alertes de la personne, `route.ts:13`). Même un navigateur trafiqué reçoit un 403.
2. **Les comptes de la guilde par classe sont des données de membre** : le badge sur les cartes de
   classe ne s'affiche jamais en vue visiteur.
3. **Le plan du site public ne nomme aucune page staff** : même filtre que la barre aujourd'hui.
4. **Pas de pseudo ni de compteur de membres dans le HTML**, règle déjà posée dans
   `PageAccueil.tsx:29-31`.

**Un choix technique à trancher, avec deux options :**

- **A. `/` reste statique.** La vue est choisie dans le navigateur par `useSession`. Avantage :
  page prérendue, rien de changé côté performance. Défaut : le membre voit le hero visiteur
  quelques centaines de millisecondes avant que sa vue s'affiche.
- **B. `/` lit le niveau d'accès côté serveur** avec `etatVisiteur()` (`src/lib/vitrine.ts:67-72`,
  déjà écrit pour la boutique, « sans jamais rediriger »), étendu d'un drapeau `staff`.
  Seul l'**ordre des sections** se décide côté serveur ; les données de membre arrivent toujours
  par les routes gardées. Avantage : pas de flash. Défaut : la page est rendue à chaque requête,
  donc les lectures de fichiers de `chiffresAccueil()` (`chiffres.ts:26-36`) sont à mettre en
  cache au niveau du module.
- **Recommandation : B.** Le membre atterrit sur `/` après chaque connexion
  (`login/page.tsx:75`) : c'est l'écran qu'il voit le plus. Un moteur de recherche n'a pas de
  cookie, il reçoit toujours la vue visiteur.

### 5.7 Ce que le bot peut nourrir sur l'accueil

Le bot annonce déjà sur Discord des rendez-vous que le site ne montre nulle part au même endroit.
Un « prochain rendez-vous » dans le bandeau membre pourrait lire les mêmes sources :

- les créneaux des Chambres Secrètes : `CRENEAUX` (`src/lib/compositions.ts:21-24`, mercredi et
  dimanche 21h), module partagé avec les rappels du bot (`bot/scheduler.ts:30-35`) ;
- les événements du jeu : `GameEvent` (`schema.prisma:293-307`), joués par `tickEvents`
  (`scheduler.ts:149`). Ils ne sont lisibles que par `/api/admin/events`, réservée au staff
  (`route.ts:10`) : il faut une route en lecture pour les membres ;
- les passages de World Boss : `WorldBossEvent`, déjà comptés par `/api/dashboard` (`route.ts:36`).

Le reste de l'automatisation par le bot (modération, relances) relève de l'espace bras droits et
n'est pas audité ici.

---

## 6. Maquettes

### 6.1 Membre (bureau, ~1040 px)

```
+------------------------------------------------------------------------------+
| [G] GENESIS   Accueil   AirBuilder v   Astuces v   Guilde v    (!) (@) [moi] |
+------------------------------------------------------------------------------+
+-- BANDEAU COMPACT (~140 px, art du serveur) ---------------------------------+
|  GENESIS                                  Prochain : Chambres Secretes       |
|  [ Chercher un objet, un monstre, un PNJ...      ]   mer. 21h  .  WB sam.    |
+------------------------------------------------------------------------------+

 A FAIRE                                                                   (3)
 +----------------------------------------------------------------------------+
 | * 2 apports a confirmer sur tes quetes                    [ Confirmer > ]  |
 | * Ta commande "Arc +6" : a recuperer                      [ Suivre > ]     |
 | * Chambres Secretes mer. 21h : tu n'es pas inscrit        [ Je serai la > ]|
 +----------------------------------------------------------------------------+

 MES OUTILS
 +-------------------+ +-------------------+ +-------------------+
 | Quete Guilde      | | Boutique          | | Chambres Secretes |
 | 4 a prendre       | | 1 commande        | | mer. 9 / 12       |
 +-------------------+ +-------------------+ +-------------------+
 +-------------------+ +-------------------+ +-------------------+
 | World Boss        | | AirBuilder        | | Mes absences      |
 | 1 passage a venir | | 5 stuffs          | | Prevenir          |
 +-------------------+ +-------------------+ +-------------------+

 MES PERSONNAGES                                     Tous mes personnages >
 | [T] Kael    principal   niv. 165 . P4     3 stuffs                     > |
 | [P] Lyra                niv. 140          sans stuff                   > |

 LES CLASSES DE LA GUILDE
 [Spadassin  3] [Templier  2] [Arbaletrier 4] [Sylphide   1]
 [Arcaniste  2] [Envouteur 0] [Primat      3] [Chanoine   1]

 > PLAN DU SITE  (replie ; ouvert = 4 colonnes)
   AirBuilder       Astuces          Guilde              Mon compte
   . Mes persos     . Le wiki        . Chambres Secretes . Mon profil
   . AirBuilder     . Donjons        . World Boss        . Messages
   . Mecaniques     . Objets ...     . Quete Guilde      . Mes absences
                                     . Boutique
 > LA GUILDE ET SES REGLES  (replie)
```

### 6.2 Visiteur (bureau)

```
+------------------------------------------------------------------------------+
| [G] GENESIS   Accueil   Candidature   AirBuilder v   Astuces v               |
+------------------------------------------------------------------------------+
+-- HERO (plein ecran, inchange) ----------------------------------------------+
|                              G E N E S I S                                   |
|      Peu de membres, mais presents. Discord et vocal obligatoires...         |
|          [ SE CONNECTER AVEC DISCORD ]      [ Postuler ]                     |
|                           Decouvrir  v                                       |
+------------------------------------------------------------------------------+
 (avis "reserve aux membres" si le middleware a renvoye ici)

+-- LE JEU (bandeau de cartes) ------------------------------------------------+
| SERVEUR PRIVE AIRBORN : WINDS OF RHISIS                                      |
| On a ouvert le jeu, et on a tout mis ici - ca se consulte sans compte.       |
| [ Chercher un objet, un monstre, une recette, un PNJ...         ] -> /wiki   |
+------------------------------------------------------------------------------+
 [ 8 specialisations ] [ 23 instances ] [ 4 867 objets ] [ 52 vagues ]

 CE QUE LE SITE FAIT            9 ouvertes sans compte, 3 reservees aux membres
 [AirBuilder] [Donjons] [Monstres] [Objets (cadenas)] [PNJ] [Wiki] [Prestige]
 [Guide] [Boutique] [Chambres Secretes (cadenas)] [World Boss (cadenas)] [Crafts]

 LES HUIT FINS DE PARTIE        (cartes du jeu, sans compte de la guilde)
 [Spadassin  Epee . Hache] [Templier ...] [Arbaletrier ...] [Sylphide ...] ...

 LA GUILDE                      (ex-/histoire, ancre #la-guilde)
 "Presents, ca veut dire : venir en vocal, prevenir quand on ne peut pas..."
 [Vocal avant tout] [Personne ne reste bloque] [CS serieuses] [Un coffre qui sert]

+-- REJOINDRE ----------------------------------------------------------------+
| (illustration du serveur)       GENESIS, c'est une de ces capes             |
| Une seule condition ferme : etre joignable en vocal.        [ Postuler ]    |
+-----------------------------------------------------------------------------+
 PLAN DU SITE (pages publiques seulement, dans le HTML servi)
```

### 6.3 Ce qui change pour un bras droit

```
 A TRAITER                                              Espace bras droits >
 +----------------------------------------------------------------------------+
 | 3  candidatures en attente                  haute    -> Candidatures       |
 | 1  World Boss dans moins d'une heure        haute    -> World Boss         |
 | 5  commandes a servir         (compte a creer) moy.  -> Boutique . Servir  |
 | 7  personnages sans build                   moyenne  -> Membres & builds   |
 | 8  objets a combler (depuis etatCoffre)     basse    -> Plan de farm       |
 +----------------------------------------------------------------------------+
 ... puis A FAIRE, MES OUTILS (+ tuile "Espace bras droits"), comme un membre.
```

Sur mobile (375 px), les tuiles passent sur 2 colonnes et « À faire » / « À traiter » occupent
toute la largeur, chaque bouton passant sous sa phrase.

---

## 7. Mise en œuvre proposée (après la passe de recoloration en cours)

**Barre du haut, avant / après**

| Qui | Avant | Après |
|---|---|---|
| Visiteur | Accueil, La guilde, Candidature, AirBuilder▾, Astuces▾ | Accueil, Candidature, AirBuilder▾, Astuces▾ |
| Membre | Accueil, La guilde, Toutes les pages, AirBuilder▾, Astuces▾, Quête Guilde, Boutique▾, Guilde▾ + « Tout » | Accueil, AirBuilder▾, Astuces▾, Guilde▾ |
| Bras droit | la même chose que le membre | la même chose + Staff▾ (espace bras droits) |

**Fichiers concernés** (aucun n'a été touché)

- `src/config/nav.ts` : retirer « La guilde » et « Toutes les pages » de `HORS_ESPACES`, l'espace
  « Quête Guilde » et l'espace « Boutique », l'entrée « Accueil de la guilde » ; **redéclarer**
  `/quetes` et `/boutique` dans l'espace Guilde, `/coffre`, `/plan-farm` et `/mes-ventes` dans un
  espace Staff ; ajouter `espacesPour(role)`.
- `src/app/page.tsx` + `src/components/accueil/PageAccueil.tsx` : ordre des sections par vue.
  Nouveaux composants dans `components/accueil/` : À faire, À traiter, tuiles, plan du site, la
  guilde (repris de `/histoire`). `OuJenSuis` y déménage. `ClassesHeros` reçoit les comptes en
  option.
- `src/components/HeroFlyff.tsx` : bouton de connexion masqué avec une session.
- `src/components/Shell.tsx` : retirer `PanneauTout`, masquer « Se connecter » sur `/` comme sur
  `/histoire` (`:116`), retirer `/dashboard` et `/sommaire` de `PAGE_BG` (`:22`, `:26`).
- Redirections : `/histoire` → `/#la-guilde` (`permanentRedirect`, page publique et indexable),
  `/dashboard` → `/`, `/sommaire` → `/#plan`. **Piège déjà rencontré** : un layout de groupe
  s'exécute avant la redirection de sa page (commentaire de `(vitrine)/collections/page.tsx`).
  Les deux stubs de redirection vont donc dans `(public)`, et `/dashboard` et `/sommaire` sortent
  de `GUILD_PREFIXES` et du `matcher` (`middleware.ts:35-36`, `:69`, `:72`).
- Liens « accueil » : `not-found.tsx:14`, `error.tsx:21`, `login/page.tsx:81` pointent vers `/`.
- `src/app/api/dashboard/route.ts` : coffre via `etatCoffre()`, destinations des priorités
  (`:94`, `:96` → `/guildviewer`), priorité absences retirée tant qu'il n'existe pas de validation,
  champs staff servis au staff seulement.
- Après chaque déplacement : un `next build` complet (le serveur de dev ne compile que les routes
  visitées, note refonte-navigation).

---

## 8. Risques

1. **Pages qui disparaissent en silence** si une entrée est retirée de `nav.ts` sans être redéclarée
   ailleurs : elles sortent du plan du site et des tuiles (`portes.ts:211-216`). C'est déjà arrivé
   six fois (note méthode-assets-et-nav).
2. **Rendu à chaque requête** de `/` avec l'option B : lectures de fichiers à mettre en cache, et
   une page plus lente si une route est lente (les blocs membre doivent rester indépendants, comme
   les deux relevés de `dashboard/page.tsx:183-196`).
3. **Blocs invisibles** : `useReveal` ne relève les `.vg-reveal` qu'au montage. Tout bloc qui arrive
   avec les données doit s'en passer (`dashboard/page.tsx:153-167`). Le nouvel accueil en a
   davantage.
4. **Liens et favoris** vers `/dashboard`, `/sommaire`, `/histoire` : couverts par les
   redirections, à condition de ne pas les laisser derrière un garde.
5. **Réglages perdus** : les réglages Vanguard enregistrés sous la page `/dashboard`
   (`SCHEMA.page`, `dashboard/page.tsx:70`) ne suivent pas tout seuls une page `/`.
6. **Chiffres faux recopiés** : sans les corrections de la section 4, l'accueil afficherait des
   absences toujours à zéro et un coffre lu dans la mauvaise table.
7. **Écritures en conflit** : d'autres agents recolorent `src/` en ce moment. La fusion touche
   `Shell.tsx`, `nav.ts` et les trois pages d'accueil : à faire après leur passe.
8. **Un accueil staff trop long** : si l'état de la guilde et les 11 portes restent sur `/` faute
   d'espace bras droits prêt, on recrée la page de 23 portes. L'espace bras droits doit exister
   avant ou en même temps.

---

## 9. Questions pour Maxime

1. **Qui sont les « bras droits »** : Général et Officier seulement (badge de `ProfilePanel`), ou
   les 4 rôles de `ADMIN_ROLES` (Direction et Vanguard compris) ?
2. **Statique ou pas de flash** (5.6) : je recommande B.
3. **Le bouton « Tout »** part avec « Toutes les pages », ou on le garde comme raccourci ?
4. **La boutique dans le menu d'un visiteur** : elle est publique mais le menu la cache. On la
   montre ?
5. **Les absences** : faut-il une validation (et par qui), ou on retire « absences à valider » des
   priorités ?
6. **Un membre** doit-il garder « La guilde et ses règles » sur son accueil (repliée en bas), ou
   seulement dans le plan du site ?
