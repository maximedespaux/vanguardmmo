# Bilan des lots 0, 0 bis, 1, 2 et 3, et de la suppression du 2026-10-21

*GENESIS, le 2026-10-21. Ce bilan relit le code tel qu'il est dans le worktree
`genesis-logo-identity-9b8b28`. Il compare ce code à `PROPOSITION.md` et aux trois décisions
de Maxime prises après elle. Il n'a rien modifié dans `src/` ni dans `bot/`. Aucune opération
git n'a été faite.*

**En une minute.**
- **Les cinq lots demandés sont livrés.** `tsc` ne trouve aucune erreur. Le `next build`
  isolé se termine en EXIT 0 (70 pages générées). Toutes les adresses de la proposition
  répondent comme prévu pour un visiteur.
- **La barre fait 5 entrées pour un visiteur, 4 pour un membre et 5 pour un bras droit.**
  Quête Guilde reste une page vivante. Elle n'apparaît plus dans la barre (`barre: false`),
  mais l'accueil y mène, ainsi que le plan du site et le panneau « Tout ».
- **Il ne reste qu'un accueil, `/`, avec trois visages.** La section « La guilde » s'affiche
  en entier pour tout le monde. `/histoire` y redirige en 308, `/dashboard` et `/sommaire`
  en 307.
- **Le site a perdu** la Boutique, le Coffre AirGuild, le Plan de farm, les Ventes, le
  Journal et les Statistiques. Les données restent en base : aucun modèle Prisma n'a été
  retiré. Chaque ancienne adresse redirige vers une page vivante.
- **Les comptes finaux** : **26 pages utiles** (27 promises), **18 redirections**
  (16 promises), **28 entrées dans `nav.ts`** (environ 28 promises). Les écarts viennent
  tous de la deuxième décision et du lot 6, qui n'est pas fait (§3).
- **Deux défauts visibles sont à corriger**, et aucun ne touche aux droits. Les compteurs
  du GuildViewer comptent les candidats, contrairement à ceux de `/staff`. Les quatre
  images « Nos objectifs » portent une bande noire, présente dans les fichiers eux-mêmes
  (§5).
- **Pas de redémarrage du serveur de dev.** Les lots 0 à 3 n'ont pas touché au schéma. Le
  serveur :3040 applique déjà le `next.config.js` actuel (§7).

---

## 1. Ce qui est livré, lot par lot

### Lot 0 : le menu dit vrai

Ce qui change pour les joueurs : aucun lien de menu ne mène plus à un refus, les chiffres
sont justes, et un rang changé sur Discord se voit sans se reconnecter.

| point | état | où |
|---|---|---|
| Crafts au menu des visiteurs | livré | `src/config/nav.ts`, entrée « Crafts & collections » sans `acces` |
| Les mécaniques publiques (décision de Maxime) | livré : le dossier est passé de `(verified)` à `(public)` | `src/app/(public)/builder/mecaniques/page.tsx` ; `/builder/mecaniques` est statique (○) au build |
| « Retour à l'accueil » vers `/` | livré | `login/page.tsx`, `not-found.tsx`, `error.tsx` |
| Onglets réservés cachés à qui ne peut pas les ouvrir | livré : `accesDe` + `peutOuvrir`, lus par `SectionTabs` | `nav.ts`, `SectionTabs.tsx` ; `/donjons` ne montre plus de lien `/worldboss` à un visiteur (vérifié) |
| Enveloppe ✉ et raccourcis du profil filtrés | livré, puis **rendu sans objet** : la suppression a retiré l'enveloppe, « Mes demandes » et « Mes ventes » | `Alertes.tsx`, `ProfilePanel.tsx` |
| « Réserver sa part » en PATCH | livré, puis **rendu sans objet** : `RequetesClients.tsx` a été supprimé avec la Boutique | — |
| Priorités vers `/guildviewer`, coffre au vrai stock, comptes limités à la guilde dans `/api/dashboard` | livré, puis **remplacé** : `/api/dashboard` a disparu au lot 3, et `lib/recap.ts` reprend ces règles (rangs de guilde seulement, aucune ligne coffre) | `src/lib/recap.ts` |
| « Le staff est prévenu » devient vrai | livré : notification sur le site pour chaque rang staff sauf l'auteur, sans MP Discord, sur les deux chemins (page et commande `/absence`) | `src/lib/absences.ts`, `api/absences/route.ts:26`, `bot/commands/absence.ts:47` |
| Rôle de session relu en base | livré : toutes les 5 min (`RELECTURE_ROLE`) dans le callback `jwt` | `src/lib/auth.ts:25`, `:133` |

Le lien de la notification d'absence a changé au lot 2. Il ouvre désormais le dossier sur
son onglet absences : `/guildviewer?dossier=<id>&onglet=absences` (`lib/absences.ts:45`).

### Lot 0 bis : la réserve Vanguard de l'AirGuild

**Ce lot a été livré, puis il est devenu sans objet.** `src/lib/reserveAirguild.ts` fermait
côté serveur ce que les 32 appels de `canEdit()` ne gardaient que dans le navigateur. Le
test se trouve dans le scratchpad, sous `lot0bis/essai.ts`. Le module a été supprimé le
2026-10-21 avec le coffre, ses routes et `public/airguild/`. `/api/admin/airguild` répond
maintenant 404, et `/coffre` redirige vers `/staff`.

**Si le coffre revient un jour, cette réserve est à refaire.**

### Lot 1 : la barre courte

Ce qui change pour les joueurs : la barre passe de 8 entrées à 4 pour un membre, et
« Toutes les pages » devient le plan du site, en bas de l'accueil.

- **`nav.ts` réécrit.** Les espaces « Quête Guilde » et « Boutique » ont disparu.
  - L'espace **Guilde** est public. Son libellé mène à `/compositions` pour un membre et à
    `/#la-guilde` pour un visiteur (`hrefVisiteur`). Chaque lien réservé y porte
    `acces: "guild"` en toutes lettres.
  - Ses lignes : Chambres Secrètes, World Boss (venu d'Astuces), Mes absences, La guilde et
    ses règles, et Quête Guilde en `barre: false`.
- **Nouveaux champs** : `hrefVisiteur`, `groupe`, `barre?: false` et `appel?: true`.
  - « Postuler » s'affiche en bouton à droite, et jamais pour un membre.
  - `/profil` est déclaré pour la première fois, avec `barre: false`.
- **Une seule fonction de filtre**, `espacesPour(role, devAll, vue)`. La barre
  (`Shell.tsx:51`), le panneau « Tout » (`PanneauTout.tsx:26`) et le plan du site
  (`PlanDuSite.tsx:33`) la lisent tous les trois. **Le bouton « Tout » reste** (décision de
  Maxime) : il ne recopie plus le filtre.
- **`DEV_ROLE`** permet de voir en local les barres visiteur, membre et bras droit. Il est
  vidé au build de production (`next.config.js`, `lib/devAccess.ts`) et documenté dans
  `.env.example:37`.
- **Les redirections passent par `next.config.js`.** Le middleware a été nettoyé : ses
  listes de rôles viennent maintenant de `config/roles.ts`.
- `chemin()` coupe seulement le `?`, pas le `#` (`Shell.tsx:48`). `/#la-guilde` ne s'allume
  donc jamais. C'est le comportement voulu par le contre-examen, point 2.

### Suppression du 2026-10-21 (deuxième décision de Maxime)

Ce qui a été supprimé :
- **9 fichiers de page** : `/journal`, `/statistiques`, `/coffre` (et ses deux fichiers
  voisins), `/plan-farm`, `/mes-ventes`, `/boutique` et `/requetes/[id]`.
- **19 routes API.**
- **14 composants**, dont EcranEconomie, MesCommandes, ObjetSurMesure, TicketCommande et
  BandeauVente.
- **11 modules** de `src/lib`, ainsi que `src/data/coffre.ts` et `public/airguild/`.

Ce qui est gardé, parce que d'autres pages l'utilisent encore : `BandeauVitrine` et
`lib/vitrine.ts` (crafts), `Pseudo`, `AvatarCadre`, `OuTrouver`, `VgSelect`, `Bulle`,
`lib/quetes`, `lib/typesNotif` et `lib/alerte`.

Les retouches qui ont suivi :
- **Quête Guilde** perd son onglet « Quêtes secondaires », qui dépendait du coffre, et le
  lien « Requête objet ». Elle garde trois onglets : principales, mes requêtes et réglées.
  Les quêtes nées d'une commande sont écartées par `api/quetes/route.ts:31`.
- **L'AirBuilder** perd son bouton « Acheter un objet » : `public/airbuilder/airbuilder.js`
  ne contient plus `piece=1`.
- **Le bot** perd la commande `/coffre`, `lib/exchange.ts` et l'annonce des ventes. Un
  ancien bouton `bank:`, `exch:` ou `hold:` répond désormais « Ce bouton ne sert plus »
  (`bot/index.ts:61`), au lieu de « l'interaction a échoué ».
- **Le schéma Prisma** n'a perdu aucun modèle : `BankRequest`, `OffreVente`,
  `AirGuildState` et `CoffreItem` y sont toujours.

### Lot 2 : l'espace bras droits

Ce qui change pour les bras droits : une page « à traiter » remplace sept pages, et le
suivi du stuff demandé par Maxime existe.

- **`/staff`** (`src/app/(admin)/staff/page.tsx`) se compose de quatre parties :
  - la file « À traiter », triée par urgence ;
  - les **4 compteurs demandés** : membres actifs sur 30 jours, absents aujourd'hui,
    stuffs mesurés (« dont N à remesurer »), persos sans build ;
  - les tuiles des trois rubriques Membres, Suivi et Outils.
- **La file** (`src/lib/recap.ts:211-324`) ne contient **aucune ligne** coffre, vente,
  commande, offre ou objet sous le seuil. Ses lignes :
  - candidatures en attente ;
  - World Boss dans moins d'une heure ;
  - gestes de modération échoués ;
  - bot muet, et commandes du bot en échec ;
  - candidatures à reprendre ;
  - absents ou retours du jour ;
  - inactifs depuis 30 jours ;
  - persos sans build, membres sans perso ;
  - stuffs à renseigner et à remesurer.
- **`recap.ts` peut tourner dans le bot.** Il n'importe ni `next/*`, ni `next-auth`, ni
  `@/lib/access`, et le client Prisma lui est passé en paramètre. Le bot pourra donc s'en
  servir au lot 5.
- **Les routes** `GET /api/admin/a-traiter` et `GET /api/admin/suivi` sont gardées par
  `apiRole(ADMIN_ROLES)`.
- **`/suivi`** est une page nouvelle, déclarée dans `nav.ts` (rubrique Suivi), dans
  `ADMIN_PREFIXES` et dans le matcher. Elle a trois onglets : le stuff (qui a un build, ses
  mesures, ce qui est à remesurer, le lien vers le build), les classes (répartition, persos,
  prestige) et les dégâts et PV mesurés, classés par classe et par rôle à partir de
  `GearProfile.mesures`. Elle porte aussi les barres de l'état de la guilde.
- **Le GuildViewer** lit maintenant trois paramètres d'adresse : `?vue=absences`,
  `?filtre=inactifs` et `?dossier=` (`guildviewer/page.tsx:72-74`). Il affiche aussi la
  dernière visite (`lastSeenAt`, ajouté à `/api/admin/users`). Le menu Bras droits ▾
  compte 8 lignes, rangées en 4 rubriques.
- **`/annonce`** redirige vers `/discord`. L'onglet Embed de `/discord` reprend la
  présélection du salon d'annonces.

### Lot 3 : l'accueil unique

Ce qui change pour les joueurs : après la connexion, chacun arrive sur **son** accueil, et il
ne reste qu'une page à retenir.

- **`src/app/page.tsx`** reste un composant serveur, avec son `metadata`. Il choisit le
  visage avec le rang **en base** (`etatVisiteur()`) et ne met aucune donnée de membre dans
  le HTML. Le contrôle est au §4.
- **Le visage visiteur** (`AccueilVisiteur.tsx`) montre, dans l'ordre :
  - l'avis d'accès, puis le hero ;
  - le jeu (recherche du wiki et 4 chiffres) ;
  - ce que le site fait : les portes, dont 4 portent le cadenas « membres » ;
  - les huit classes ;
  - **La guilde** ;
  - un seul bloc « Rejoindre » ;
  - le plan du site, replié.

  Le bouton « Se connecter » de la barre est masqué sur `/` (`Shell.tsx:161`), puisque le
  hero le porte déjà.
- **Le visage membre et bras droit** (`AccueilMembre.tsx`) montre, dans l'ordre :
  - un bandeau compact (recherche, prochain rendez-vous, réglages) ;
  - **À traiter** (bras droit seulement : les 3 premières lignes de la file) ;
  - À faire ;
  - Mes outils (6 tuiles, dont « Espace bras droits ») ;
  - **La guilde cherche** (quêtes ouvertes, « J'apporte », « Toutes les quêtes → ») ;
  - Mes personnages ;
  - Les classes de la guilde ;
  - **La guilde**, affichée en entier ;
  - le plan du site, replié, qui s'ouvre de lui-même quand l'adresse vise `#plan`.
- **Une seule route `GET /api/accueil`** (`apiGuild`, module `src/lib/accueil.ts`) remplace
  les six lectures qu'aurait faites la page.
- **`/api/dashboard` est supprimée**, comme `/dashboard`, `/histoire`, `PageAccueil.tsx` et
  les fichiers de `dashboard/`. Ils sont archivés dans le scratchpad, sous
  `lot3-accueil/pages-retirees/`.
- **Les quatre réglages Vanguard** sont relus sous `page: "/"`, avec `"/dashboard"` en
  repli (`AccueilMembre.tsx:63-74`). La vue visiteur ne lit aucun réglage.
- **La section Boutique de l'accueil n'existe pas.** La première décision la prévoyait, mais
  elle a été annulée par la deuxième.

---

## 2. Ce qui n'est pas livré, et pourquoi

| sujet | pourquoi | où c'est prévu |
|---|---|---|
| Automatisations du bot (rang d'une recrue acceptée, départ du serveur, récap du lundi, santé du bot, rappels World Boss) | hors de cette mission | lots 4 et 5 |
| Fusions `/events` → `/discord` et `/gestion-worldboss` → `/worldboss` | lot 6, non fait. Ces deux pages restent vivantes, gardées et déclarées dans `nav.ts` (Outils) | lot 6 |
| Ménage du bot : `/aide` et les MP de candidature disent encore « Vanguard » (`bot/commands/aide.ts:6,11,37`, `bot/index.ts:85-88`) | automatisation 12 | lot 6 |
| Validation des absences | question 5, encore ouverte. La page montre toujours le statut « En attente », et rien ne passe une absence en APPROVED. La file staff ne promet plus de « valider » : elle compte les absents et les retours du jour | Maxime |
| Rôle Discord donné à une recrue acceptée ; Officier qui pose un rang | questions 6 et 7, encore ouvertes. Rien n'est codé | Maxime |
| Pastille « bot en ligne » | demande un battement de cœur côté bot | lot 4 |
| Route membre `GET /api/agenda` (World Boss et events dans le « prochain rendez-vous ») | le bandeau n'affiche que les Chambres Secrètes, calculées dans le navigateur | lot 5 |

---

## 3. Les comptes, face aux promesses

| | promis (PROPOSITION §5) | obtenu | écart |
|---|---|---|---|
| pages utiles | 27 | **26** | −4 pages supprimées par la deuxième décision (Boutique, Coffre, Mes ventes, Statistiques) ; +1 page créée (`/suivi`) ; +2 pages encore vivantes (`/events`, `/gestion-worldboss`, lot 6) |
| adresses qui redirigent | 16 | **18** | +4 (`/boutique`, `/coffre`, `/mes-ventes`, `/statistiques`) ; −2 (`/events` et `/gestion-worldboss` ne redirigent pas avant le lot 6) |
| entrées dans `nav.ts` | ~28 | **28** | AirBuilder 3, Astuces 9, Guilde 5, Bras droits 8, hors espaces 3. Deux sont en `barre: false` (Quête Guilde, Mon profil) et une est un appel (Postuler) |
| fichiers `page.tsx` | — | 35 (48 avant) | 26 utiles, 5 fiches de détail, 3 relais de redirection (`/collections`, `/competences`, `/oasis`) et la connexion |

**Les 26 pages utiles** :
- **public (13)** : `/`, `/builder`, `/personnages`, `/builder/mecaniques`, `/donjons`,
  `/astuces`, `/prestige`, `/wiki`, `/classes`, `/monstres`, `/pnj`, `/crafts`,
  `/candidature` ;
- **guilde (6)** : `/compositions`, `/worldboss`, `/absences`, `/quetes`, `/objets`,
  `/profil` ;
- **staff (7)** : `/staff`, `/guildviewer`, `/candidatures`, `/suivi`, `/discord`,
  `/gestion-worldboss`, `/events`.

**Les 18 redirections** :
- **15 dans `next.config.js`** : `/sommaire`, `/histoire` (308), `/dashboard`,
  `/astuces-guilde` (308), les cinq pages staff retirées vers `/staff`, `/annonce` vers
  `/discord`, et les cinq adresses de la Boutique vers `/` ;
- **3 relais `redirect()`** dans des pages, déjà là avant les lots.

**La barre, par regard** :
- **visiteur, 5 entrées** : Accueil, AirBuilder ▾, Astuces ▾ (8 lignes, Objets masqués),
  Guilde (vers `/#la-guilde`) et le bouton Postuler ;
- **membre, 4 entrées** : Guilde ▾ y compte 4 lignes ;
- **bras droit, 5 entrées** : Bras droits ▾ y compte 8 lignes, en 4 rubriques.

Le bouton « Tout » s'ajoute pour toute personne connectée.

---

## 4. Les vérifications faites pour ce bilan

1. **`npx tsc --noEmit`** dans la copie isolée : 0 erreur. L'include couvre aussi `bot/`.
2. **`next build` isolé**, avec `DEV_ALL` vidé, dans le scratchpad (`build-bilan/`) :
   EXIT 0, 70 pages générées, sans avertissement. `/` est dynamique (ƒ) ;
   `/builder/mecaniques`, `/astuces`, `/donjons` et `/login` sont statiques (○). Journal :
   `build-bilan.log`.
3. **`next start -p 3051` sur cette copie, testé en visiteur sans cookie.** Le serveur a été
   arrêté avec `kill`, le port 3051 est libéré, et le port 3040 n'a jamais été touché. Le
   relevé complet se trouve dans `bilan-curl-visiteur.txt` :
   - pages publiques en 200 : `/`, `/?error=guild`, `/candidature`, `/login`, `/builder`,
     `/personnages`, `/builder/mecaniques`, `/donjons`, `/astuces`, `/prestige`, `/wiki`,
     `/classes`, `/pnj`, `/monstres`, `/monstres/<id>` et `/crafts` ;
   - pages de guilde en 307 vers `/login` : `/quetes`, `/worldboss`, `/compositions`,
     `/compositions/build/<id>`, `/absences`, `/objets`, `/objets/<id>`, `/profil`,
     `/build/<id>` et `/builder/<membre>` ;
   - pages staff en 307 vers `/login` : `/staff`, `/suivi`, `/guildviewer`,
     `/guildviewer?vue=absences`, `/candidatures`, `/discord`, `/events` et
     `/gestion-worldboss` ;
   - redirections :
     - `/histoire` répond **308 vers `/#la-guilde`** : l'ancre traverse bien la
       redirection ;
     - `/sommaire` répond 307 vers `/#plan`, et `/dashboard` 307 vers `/` ;
     - `/astuces-guilde` répond 308 vers `/builder/mecaniques` ;
     - `/statistiques`, `/journal`, `/coffre`, `/mes-ventes` et `/plan-farm` répondent
       307 vers `/staff`. `?membre=` suit la redirection et n'a pas d'effet sur `/staff` ;
     - `/annonce` répond 307 vers `/discord` ;
     - `/boutique`, `/boutique?mode=commande`, `/boutique?piece=1`, `/messages`,
       `/messages?fil=req:x`, `/demandes`, `/dettes` et `/requetes/<id>` répondent 307 vers
       `/`. La requête suit et n'a pas d'effet ;
     - `/collections`, `/competences` et `/oasis` répondent 307 ;
   - une adresse inconnue répond 404, avec un bouton vers `/`.
4. **Les API en visiteur.**
   - Elles répondent 401 : `/api/accueil`, `/api/admin/a-traiter`, `/api/admin/suivi`,
     `/api/admin/users`, `/api/quetes`, `/api/absences`, `/api/profil`,
     `/api/notifications` et `/api/reglages`.
   - Elles répondent 404, car supprimées : `/api/admin/airguild`, `/api/shop`,
     `/api/admin/statistiques` et `/api/dashboard`.
5. **Le HTML de `/` servi à un visiteur** (90 Ko) :
   - il contient `id="la-guilde"`, `id="plan"` et le texte « Présents, ça veut dire » ;
   - il ne contient ni « La guilde cherche », ni « Boutique », ni aucun lien vers
     `/quetes`, `/staff`, `/suivi` ou `/guildviewer` ;
   - **aucun des 21 pseudos de la base n'y figure** (liste du scratchpad,
     `noms-membres.txt`) ;
   - les liens `/compositions`, `/worldboss` et `/objets` qu'il contient sont les portes
     marquées d'un cadenas « membres », comme prévu au §3.5 de la proposition ;
   - la barre visiteur contient exactement : `/`, l'AirBuilder et ses 3 pages, les 8 pages
     d'Astuces, `/#la-guilde` et `/candidature`.
6. **Liens internes** : un grep de `src/`, `bot/` et `public/airbuilder/` ne trouve plus
   aucun lien vers une adresse retirée. Il ne reste que des commentaires, et la clé de
   réglage `repli: "/dashboard"`. Aucun lien du site ne dépend donc d'une redirection.
7. **Schéma Prisma** : tous les modèles de la copie principale (`main`) sont présents. La
   seule différence est `GearProfile.mesures Json?`, une colonne nullable qui vient du
   chantier « Mesures du stuff », pas de ces lots.
8. **Captures sur :3040 à 1440 px** (DEV_ALL, donc vue Direction), relues une par une. Elles
   sont dans le scratchpad, sous `bilan/` :
   - `accueil-1440.png`, puis `-y1500` et `-y3000` : À traiter, À faire, Mes outils, La
     guilde cherche, Mes personnages, Les classes de la guilde, La guilde en entier et le
     plan du site replié (« Les 27 pages qui te sont ouvertes ») ;
   - `staff-1440.png` : la file sans aucune ligne coffre, les 4 compteurs, les rubriques
     Membres, Suivi et Outils ;
   - `guildviewer-1440.png` : les onglets de la rubrique Membres, la dernière visite, les
     mesures par stuff ;
   - `boutique-commande-1440.png` : `/boutique?mode=commande` arrive bien sur l'accueil ;
   - `mecaniques-1440.png` : la page rend normalement ;
   - `suivi-1440.png`, en plus des captures demandées : les onglets Le stuff, Les classes,
     Dégâts & PV.

---

## 5. Les risques et les défauts relevés

**À corriger : aucun ne touche aux droits.**

1. **Le GuildViewer et `/staff` ne comptent pas les mêmes personnes.** Les compteurs du
   GuildViewer (`guildviewer/page.tsx:115-121`, affichés `:185-189`) portent sur toute la
   liste de `/api/admin/users`, candidats compris. `/staff`, `/suivi` et l'accueil ne
   comptent que les rangs de guilde. Mesuré sur la même base, à quelques secondes
   d'intervalle :

   | compteur | GuildViewer | `/staff` et `/suivi` |
   |---|---|---|
   | membres | 10 | 6 |
   | actifs sur 30 jours | 4 | 2 |
   | personnages | 14 | 11 |
   | persos sans build | 3 | 2 |
   | membres sans perso | 4 | 2 |

   Le filtre « Inactifs », lui, écarte déjà les candidats (`:130`). La correction tient en
   une ligne : calculer `stats` sur les seuls `canAccessGuild(u.role)`, ou renommer le
   compteur en « comptes ».
2. **Une bande noire sur les quatre images « Nos objectifs ».** Les fichiers
   `public/jeu/credits/shotcredit{11,12,13,16}.webp` ont tous les quatre leurs colonnes
   454 à 511 noires, soit 58 px sur 512. Le défaut est dans l'image, pas dans la CSS, et il
   existait déjà sur `/histoire`. La section est maintenant vue par tous les membres, à
   chaque visite. Deux corrections possibles :
   - cadrer l'image dans `LaGuilde.tsx:183` (agrandie à environ 113 % et calée à gauche) ;
   - ré-exporter les quatre images rognées.
3. **La carte « Un coffre qui sert »** reste dans « Nos objectifs ». Le texte de `/histoire`
   est conservé tel quel, comme l'a voulu Maxime, et le coffre existe toujours en jeu. Mais
   le site ne le montre plus nulle part. **À confirmer par Maxime** : garder la carte, ou la
   retirer.
4. **`/collections`, `/competences` et `/oasis` répondent en 307**, alors que le tableau du
   §5 annonçait 308. Ces trois relais existaient avant les lots, et ils appellent
   `redirect()`, qui renvoie 307. Pour que les moteurs déplacent leur lien, il suffit de les
   passer dans `next.config.js`, en `permanent: true`.
5. **Les anciennes notifications « Boutique » et « Échange »** restent en base avec leur
   étiquette. Leur lien mène à l'accueil, avec un `?fil=` ou un `?mode=` qui n'a aucun
   effet. C'est sans danger, mais un membre qui clique ne comprendra pas forcément pourquoi
   il arrive là.

**À surveiller**

6. **Le cache du proxy.** `/` est maintenant rendue à chaque requête, et son squelette
   change selon la personne. Il faut vérifier que Nginx Proxy Manager, sur le VPS, ne sert
   pas une même réponse de `/` à plusieurs personnes. Ce réglage ne figure pas dans le
   dépôt.
7. **Le délai de relecture du rôle.** Il faut 5 minutes au plus, **puis** un chargement de
   page ou un retour sur l'onglet. Un onglet resté ouvert sans focus garde l'ancien rang.
   Si Maxime veut un délai garanti, il faut un `refetchInterval` sur `SessionProvider`, qui
   n'existe pas aujourd'hui.
8. **Une absence déclarée sur Discord par un RECRUE** prévient aussi le staff. Le bot ne
   vérifie pas l'appartenance à la guilde, contrairement à la page (`apiGuild`). Ce point
   n'est pas tranché.
9. **Les déroulants au-delà de 1 200 px s'ouvrent au survol.** Sur une grande tablette
   tactile, toucher « Guilde » peut suivre le lien vers `/compositions` sans ouvrir le
   menu. Comme Quête Guilde n'est plus au menu, le risque est faible : tout reste joignable
   par l'accueil et par « Tout ». **À essayer sur un appareil.**
10. **Les mécaniques, devenues publiques**, contiennent des liens vers des fiches
    `/objets`, qui restent réservées aux membres. Un visiteur qui clique arrive sur
    `/login`, comme depuis le reste du wiki.
11. **Le plan du site** annonce « Les 27 pages ». Il compte en réalité des entrées de
    `nav.ts`, dont deux ne sont pas des pages : la vue Absences et la section La guilde.
12. **Le déploiement.** Le site et le bot doivent partir ensemble, dans la même image : le
    bot importe `@/lib/absences`, et `bot/commands/coffre.ts` n'existe plus. Il faut aussi
    vérifier que `GearProfile.mesures` existe en production. Sinon, `prisma db push`
    l'ajoute sans risque, puisque la colonne est nullable.

---

## 6. Ce qu'il faut tester en production

Les variables Discord sont vides en local. Ces gestes ne se vérifient donc que sur le
VPS, avec un compte test.

1. **La relecture du rôle.**
   1. Changer le rang Discord d'un compte test, par exemple de Guard à Officier, puis
      revenir.
   2. Attendre la recopie des rangs par le bot (10 min), puis au plus 5 min.
   3. Recharger une page.
   4. Vérifier que la barre affiche ou masque « Bras droits ▾ », et que `/staff` s'ouvre ou
      renvoie vers `/?error=admin`, **sans se reconnecter**.
   5. Refaire l'essai avec un compte RECRUE à qui l'on donne Guard à la main : `/compositions`
      doit s'ouvrir sans reconnexion.
2. **Les notifications d'absence.**
   1. Déclarer une absence depuis `/absences`, puis une autre avec `/absence` sur Discord.
   2. Chaque rang staff, **sauf l'auteur**, doit recevoir une notification « Absence »
      (lune, or clair), et aucun MP Discord.
   3. Le clic sur la notification doit ouvrir le dossier du membre sur son onglet absences
      (`/guildviewer?dossier=…&onglet=absences`).
   4. Le bot doit répondre « Le staff est prévenu sur le site ».
3. **AirGuild en Officier : ce test devient sans objet.** Le coffre a quitté le site. À
   vérifier à la place, avec un compte Officier :
   - `/coffre` mène à `/staff` ;
   - `PUT /api/admin/airguild` répond 404 ;
   - aucune entrée « Coffre » n'apparaît dans les menus.
4. **Les anciens liens qui circulent.**
   - Un ancien lien `/boutique` ou `/requetes/<id>` posté sur Discord mène à l'accueil.
   - Un ancien bouton d'échange (`bank:`, `exch:` ou `hold:`) répond « Ce bouton ne sert
     plus ».
   - Une ancienne notification de vente mène à l'accueil sans erreur.
5. **`/histoire` depuis un moteur de recherche** : la redirection 308 doit arriver sur la
   section La guilde, et non en haut de l'accueil.
6. **Le cache du proxy (§5, point 6)** : se connecter comme membre, puis ouvrir `/` en
   navigation privée. Le visiteur ne doit voir ni « À faire », ni « Mes outils ».

---

## 7. Le serveur de dev : faut-il le redémarrer ?

**Non.** Trois raisons :
- les lots 0 à 3 n'ont changé ni le schéma Prisma, ni le client généré ;
- `next.config.js` a changé, mais le serveur :3040 l'applique déjà : `/histoire` y répond
  308 vers `/#la-guilde`, `/statistiques` 307 vers `/staff`, `/sommaire` 307 vers `/#plan`
  et `/boutique?mode=commande` 307 vers `/?mode=commande` ;
- les pages `/`, `/staff`, `/suivi`, `/guildviewer` et `/builder/mecaniques` y répondent 200.

Une seule exception : pour regarder la barre d'un autre rôle avec `DEV_ROLE`, il faut
redémarrer le serveur après avoir changé la variable. C'est voulu.
