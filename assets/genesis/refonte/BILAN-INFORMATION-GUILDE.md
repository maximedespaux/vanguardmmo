# Bilan de la refonte « Information Guilde » (SPEC-INFORMATION-GUILDE, §1 à §10)

*GENESIS, le 2026-10-21. Ce bilan relit le code tel qu'il est dans le worktree
`genesis-logo-identity-9b8b28`, après les quatre parties de la refonte : Accueil & persos,
Information Guilde, Bras droits (tableau de bord tout-en-un et dossier), Friend. Il le compare
à `SPEC-INFORMATION-GUILDE.md`, qui prime sur les autres documents du dossier. Il n'a rien
modifié dans `src/`, `bot/` ni `prisma/`, et aucune opération git n'a été faite.*

*Les rapports des parties me sont arrivés incomplets : celui d'Accueil & persos en entier,
celui d'Information Guilde coupé au milieu du point (b), et rien des parties Bras droits et
Friend. Ces trois parties sont donc relevées ici dans le code, dans les notes de mémoire
`moderation-guildviewer` et `acces-amis-friend`, et par les vérifications du §4.*

**En une minute.**
- **Les dix points de la spécification sont livrés.** Il reste un écart volontaire (§5.1) et
  des choix à confirmer par Maxime (§5).
- **`tsc` ne trouve aucune erreur.** Le `next build` isolé se termine en EXIT 0, avec
  65 pages générées et aucun avertissement. Le script `scripts/verifier-seances.ts` passe
  ses **41 cas**.
- **Pour un visiteur, chaque adresse répond comme prévu** : les 24 pages vivantes et les
  24 anciennes adresses, testées sans cookie sur un `next start` de production (§4.3).
- **Le HTML de `/` servi à un visiteur est neutre.** Il ne contient aucun champ de
  recherche, aucun rendez-vous, et aucun des 22 noms de la base (comptes et persos).
- **L'accueil est la même vitrine pour tous.** Seul « Mes personnages » s'y ajoute en
  tête, lu dans le navigateur. Après la connexion, un membre arrive sur **Information
  Guilde** (`/guilde`) ; les autres restent sur `/`.
- **Le travail des bras droits tient sur une seule page, `/staff`.** Le GuildViewer, les
  Absences, le Suivi et les Candidatures en sont devenus des sections, et leurs anciennes
  adresses y redirigent avec leur requête.
- **Le dossier d'un membre gagne quatre gestes et un onglet.** Les gestes sont promouvoir,
  rétrograder, cacher et montrer de nouveau ; l'onglet est « Notes ». L'onglet « Quêtes »
  disparaît.
- **Quête Guilde a quitté le site**, mais ses données restent en base.
- **Le rôle Discord Friend ouvre Astuces et l'AirBuilder.** Le réglage se fait dans
  `/acces-amis`, et un ami ne figure dans aucune liste de la guilde.
- **Pas de redémarrage du serveur de dev.** Le schéma est poussé, et le processus de
  :3040 est plus récent que le dernier `prisma generate` (§7).

---

## 1. Ce qui est livré, partie par partie

### Partie 1 : Accueil & persos (§1, §8, §10)

| point de la spec | état | où |
|---|---|---|
| §1 Accueil public et neutre : même vitrine pour tous, sans recherche, sans rendez-vous, sans « Régler cette page », sans « À traiter », « À faire », « Mes outils », « La guilde cherche » ni « Les classes de la guilde » | livré | `src/app/page.tsx` → `AccueilVisiteur` ; le bandeau du jeu et `ChampWiki` sont retirés ; la phrase et les 4 chiffres passent sous « Ce que le site fait » |
| §1 « Mes personnages » EN PREMIER, lu côté client, rien dans le HTML | livré | `src/components/accueil/MesPersonnages.tsx`, au-dessus du hero, lit `GET /api/characters` (`apiAuth`) ; 4 persos au plus, chaque stuff mène à son lien profond, avec sa pastille d'état des mesures |
| §1 `AccueilMembre` disparaît | livré | supprimés : `AccueilMembre.tsx`, `OuJenSuis.tsx`, `BandeauCartes.tsx` (archivés dans `scratchpad/ig-accueil-retires/`) ; le CSS mort est retiré de `genesis.css` |
| §8 « Mes personnages » en lecture seule | livré | `src/app/(public)/personnages/page.tsx` : plus aucun bouton créer, modifier, supprimer ou rendre principal ; module pur `src/lib/mesPersos.ts` |
| §8 Lien profond `/builder?perso=<nom>&stuff=<rang>` | livré | `vgOuvrirDepuisURL` (`public/airbuilder/airbuilder.js`) : le rang part de 0, et un `stuff` non numérique est lu comme un nom. `GET /api/characters` trie les stuffs par `[createdAt, id]`, le même rang que le builder |
| §8 Rendre principal et supprimer, dans l'AirBuilder | livré | fenêtre « Mes personnages » : `vgRendrePrincipal` (avec confirmation), et `delChar` dont la confirmation nomme le perso et ses stuffs |
| §8 Retirer les routes d'écriture directe | livré | supprimés : `POST /api/characters` et tout `api/characters/[id]` (GET, PATCH, DELETE, gear), qui répondent 404 ; un grep sur `src/`, `bot/` et `public/` ne trouve plus aucun appelant |
| §10 Les mécaniques passent dans Astuces | livré | `src/app/(public)/mecaniques/page.tsx` (statique ○), entrée Astuces (icône `gem`) ; `/builder/mecaniques` et `/astuces-guilde` répondent **308** vers `/mecaniques` |

Corrigé en chemin, dans la chaîne « persos ↔ stuffs » :
- `/api/characters/sync` enregistre maintenant le sexe et le prestige 0 ;
- le perso d'exemple « Daiisuke » devient « Perso 1 » ;
- un état vierge n'est plus publié au compte.

### Partie 2 : Information Guilde (§1 dernier point, §2, §5 en partie, §6)

| point de la spec | état | où |
|---|---|---|
| §2 La page `/guilde`, gardée, en première ligne du menu Guilde | livré | `src/app/(guild)/guilde/page.tsx` (`requireGuild` par le gabarit, `GUILD_PREFIXES` et matcher du middleware) ; `nav.ts` : « Information Guilde », icône `landmark`, `acces: "guild"` |
| §2 Pour un visiteur, « Guilde » mène à `/#la-guilde` | livré | `hrefVisiteur`, et une ligne `horsGuilde` « La guilde » que seuls les comptes hors guilde voient |
| §2.1 Le récap | livré | 5 compteurs : membres, classes x/8 avec celles qui manquent, prochaine Chambre Secrète (calculée dans le navigateur), absents du jour (les noms seuls), stuffs mesurés |
| §2.2 Qui est qui | livré | `src/components/guilde/QuiEstQui.tsx` : pseudo en jeu, rang, nom Discord, ID copiable d'un clic, les persos et leurs chiffres déclarés, et « Voir le build » si le build est partagé ; recherche, filtres par classe et par rang |
| §2.3 Les classes | livré | brique partagée `src/components/guilde/ClassesGuilde.tsx`, aussi lue par la vue Classes du Suivi de `/staff` |
| §2.4 Le recensement devient une section, et `/recensement` redirige | livré | `src/components/guilde/Recensement.tsx`, calculé avec `staff:false` pour tout le monde ; `/recensement?classe=Primat&role=dps` répond **307** vers `/guilde?classe=Primat&role=dps#recensement` |
| §2.5 Le suivi visible des mesures | livré | section `#suivi` : « Mesures manquantes » et « Aucun stuff monté », sans note interne ni dernière visite |
| §2.6 La guilde, en entier | livré | `LaGuilde` dans la section `#la-guilde` de la page |
| §2 Ce que la page ne montre jamais | livré | `GET /api/guilde` (`apiGuild`) ne demande à la base ni `builderBlob`, ni `lastSeenAt`, ni motif ; aucun id de compte ne sort (§4.6) |
| §2 Membres cachés exclus | livré | `User.cacheLe DateTime?` ; Information Guilde les exclut, et `/api/recensement` aussi pour un appelant hors staff |
| §1 Arrivée après la connexion | livré | `/login` passe `callbackUrl: "/api/arrivee"`. La route lit le rang en base et redirige, par une adresse relative, vers `/guilde` pour un membre et vers `/` pour les autres, Friend compris. En visiteur : 307 vers `/` |
| §6 Quête Guilde disparaît entièrement | livré | supprimés : la page `/quetes`, `api/quetes`, `api/quetes/[id]`, `lib/quetes.ts`, `lib/catalogueQuetes.ts`, `data/catalogue-quetes.json`, `api/catalogue`, `Pseudo.tsx`, `api/membres/[nom]`, ainsi que `lib/accueil.ts` et `/api/accueil`, qui n'avaient plus d'appelant. **Les modèles `Quete` et `QueteContribution` restent dans le schéma.** `/quetes` répond 307 vers `/guilde`. Le bot ne parle plus de quêtes ; les étiquettes « Quête » de `typesNotif.ts` restent pour les anciennes notifications |

### Partie 3 : Bras droits, le tableau de bord et le dossier (§3, §4, §5)

| point de la spec | état | où |
|---|---|---|
| §3 `/staff` tout-en-un | livré | `src/app/(admin)/staff/page.tsx`, avec 5 sections (`?section=`) : Tableau de bord (file, compteurs, outils), Membres & builds, Absences, Suivi (Le stuff, Les classes, Dégâts & PV) et Candidatures. Les onglets sont lus dans `nav.ts`, rubrique « Tableau de bord ». Composants dans `src/components/staff/` |
| §3 Les anciennes adresses redirigent avec leur requête | livré | `/suivi`, `/guildviewer` (et sa variante `?vue=absences`) et `/candidatures` répondent 307 vers la section de `/staff`. `?dossier=`, `?onglet=`, `?filtre=` et `?statut=` suivent (§4.3). Les pages `/suivi`, `/guildviewer` et `/candidatures` sont supprimées |
| §3 Le dossier s'ouvre depuis n'importe quelle section | livré | `?dossier=&onglet=` est porté par la page. La notification d'absence (`lib/absences.ts:47`) et la file (`lib/recap.ts`) visent directement `/staff?section=…` |
| §4 Promouvoir et rétrograder, pour les 4 rangs bras droits | livré | qui peut quoi se décide dans **un seul endroit**, `src/lib/gestes.ts` (`droitsSur`), relu par `/api/admin/moderation` et par le dossier. On n'agit que sur un rang strictement inférieur au sien ; on ne promeut pas au-delà du rang juste sous le sien ; on rétrograde jusqu'à Guard au plus bas |
| §4 Le rang change sur Discord, par la file `BotCommand` | livré | la route dépose une `BotCommand` de type `moderation` avec l'action `rang`. Le bot (`bot/lib/moderation.ts`) pose le nouveau rôle, puis retire les anciens, avec `comparePositionTo`. `repercuteEnBase` relit les rôles réels. Un seul geste de rang en vol par membre (409) |
| §4 Cacher et montrer de nouveau | livré | sur place, dans `User.cacheLe`, sans rien changer sur Discord. La trace va dans `ActionMembre`, et le staff voit la pastille « Caché » |
| §4 Retirer de la guilde, ouvert aux 4 rangs | livré | le membre passe RECRUE, `isActive=false`, et sort de la composition des Chambres (`retirerDeLaCompo`, avec sauvegarde `main:precedent`). Un rang de guilde relu sur Discord le remet parmi les actifs (`rangRelu`) |
| §4 Motif, confirmation, trace, verdict | livré | le motif fait 5 caractères au moins, et la route le refuse s'il manque. Chaque geste se confirme par un « Oui, … ». Le geste est tracé dans `ActionMembre` et `auditLog`. Tant qu'une décision de moins de 3 min attend le bot, le dossier se relit toutes les 5 s |
| §4 Notes internes | livré | modèle `NoteMembre` (rattaché au `discordId`, avec un ton problème, effort ou neutre, ni modifiable ni supprimable) ; `POST /api/admin/membre/[id]/notes`. Lecture et écriture suivent la même règle que les gestes, si bien que personne ne lit les notes qui le concernent |
| §4 L'onglet « Quêtes » disparaît | livré | onglets : Le membre / Absences / Décisions / Notes ; un ancien `?onglet=quetes` ouvre « Le membre » |
| §5 Partage du build par le membre, une case par perso | livré | `User.persosPartages String[]` ; la fenêtre « Partager » de l'AirBuilder propose « Visible dans Information Guilde » pour chaque perso. `GET /api/builder-share/[shareId]` ne renvoie que les persos cochés, et seulement à un membre de la guilde. Décocher retire le partage |

Corrigés en chemin, deux défauts du bilan précédent :
- les compteurs de Membres & builds ne comptent plus les candidats. Ils disent maintenant
  6 membres, comme `/staff`, et une catégorie repliée « Hors guilde (4) » range les autres
  comptes ;
- les quatre images « Nos objectifs » sont rognées en 454×256 : la bande noire a disparu.

### Partie 4 : Friend (§9)

| point de la spec | état | où |
|---|---|---|
| Un ami accède à Astuces et à l'AirBuilder, et à rien d'autre | livré | décision unique `peutOuvrir(acces, qui, espace)` dans `src/config/nav.ts` (avec `espaceDe`). Le **plafond** `ESPACES_OUVRABLES` (`astuces`, `airbuilder`) est dans `src/config/amis.ts` : un jeton qui porterait « guilde » n'ouvrirait rien |
| Le rôle est lu dans `discordRoles`, le jeton porte les espaces | livré | le callback `jwt` (`lib/auth.ts`) calcule `token.amis` à la connexion et à chaque relecture du rang (toutes les 5 min). Le middleware, la barre, « Tout », le plan et les gardes lisent cette valeur |
| Les pages et les routes des espaces ouverts | livré | groupe `(espace-astuces)` (`/objets` y est déplacé, gardé par `requireEspace("astuces")`). `apiEspace("astuces")` garde `/api/objets`, `/api/ou-trouver` et `/api/crafts`. Les routes de l'AirBuilder ne demandent qu'une connexion |
| Un réglage dans Bras droits → Outils, stocké en base | livré | page `/acces-amis` et route `/api/admin/acces-amis`, `Setting` `acces_amis`. Défaut : le rôle `1550844483095232712`, avec Astuces et AirBuilder. Un réglage illisible **ferme** tout ; la valeur est gardée 60 s ; trace « acces-amis.regler » |
| Le rang ne change pas | livré | un ami reste RECRUE. Un membre qui porte aussi le rôle reste un membre |
| Absent de toute liste de la guilde | livré | par le rang. Information Guilde, le recensement, les classes, la compo, les compteurs et la file ne lisent que les rangs de guilde |
| Catégorie « Amis (hors guilde) » dans Membres & builds | livré | repliée par défaut, sans dossier, sans notes ni gestes ; `/api/admin/users` renvoie `{ comptes, amis }` |
| Le bot fait remonter un rôle Friend posé à la main | livré | `syncMemberRanks` réécrit `discordRoles` quand les rôles bougent seuls (`memesRoles`, sans @everyone) |

---

## 2. Ce qui n'est pas livré, ou reste ouvert

| sujet | pourquoi | qui |
|---|---|---|
| Le chantier « Chambres », lot 2 | en pause, hors de cette refonte | — |
| La validation des absences | question 5, toujours ouverte : rien ne passe une absence en APPROVED | Maxime |
| Les automatisations du bot (rôle d'une recrue acceptée, récap du lundi, santé du bot, rappels World Boss) et les fusions `/events` → `/discord` et `/gestion-worldboss` → `/worldboss` | lots 4, 5 et 6 de PROPOSITION.md, non faits. Les trois pages restent vivantes et déclarées (Outils) | plus tard |
| Le mode `?volet=1` de `/builder` | n'a plus d'appelant depuis que l'iframe de l'ancienne page a disparu. Il est laissé tel quel, car il est sans effet | ménage |
| Des tests du moteur de l'AirBuilder (lien profond, rendre principal) dans le dépôt | ils n'existent que dans le scratchpad (`essai-builder/`). `verifier-seances.ts` couvre les modules purs, pas le moteur | à décider |
| La carte « Un coffre qui sert » de « Nos objectifs » | toujours là, alors que le coffre n'existe plus sur le site (point 3 du bilan précédent) | Maxime |
| Les anciennes notifications « Boutique » et « Échange » | leur lien mène toujours à l'accueil, avec un paramètre sans effet | sans danger |

---

## 3. Les comptes

| | bilan des lots 0 à 3 | maintenant | écart |
|---|---|---|---|
| pages utiles | 26 | **24** | −4 (`/quetes`, `/suivi`, `/guildviewer`, `/candidatures`) et +2 (`/guilde`, `/acces-amis`) ; `/builder/mecaniques` devient `/mecaniques` |
| fichiers `page.tsx` | 35 | **30** | 24 utiles, 5 fiches de détail (`/objets/[id]`, `/monstres/[id]`, `/compositions/build/[slotId]`, `/build/[shareId]`, `/builder/[user]`) et `/login`. Les 3 relais `redirect()` ont disparu : ils sont dans `next.config.js` |
| adresses qui redirigent | 18 | **24** (25 règles) | +6 : `/builder/mecaniques`, `/quetes`, `/recensement`, `/guildviewer`, `/suivi`, `/candidatures`. Il y a 6 redirections en 308 (`/histoire`, `/builder/mecaniques`, `/astuces-guilde`, `/collections`, `/competences`, `/oasis`) et 18 en 307 |
| entrées dans `nav.ts` | 28 | **29** | AirBuilder 2, Astuces 10, Guilde 5, Bras droits 9 (5 sections de `/staff` et 4 outils), hors espaces 3 |

**Les 24 pages utiles** :
- **publiques (13)** : `/`, `/builder`, `/personnages`, `/mecaniques`, `/donjons`, `/astuces`,
  `/prestige`, `/wiki`, `/classes`, `/monstres`, `/pnj`, `/crafts`, `/candidature` ;
- **réservées à la guilde (6)** : `/guilde`, `/compositions`, `/worldboss`, `/absences`,
  `/profil`, et `/objets`, que le rôle Friend ouvre aussi ;
- **réservées au staff (5)** : `/staff`, `/discord`, `/gestion-worldboss`, `/events`,
  `/acces-amis`.

Toutes sont déclarées dans `nav.ts`.

**La barre, par regard** (`espacesPour`, calculé par tsx, `scratchpad/bilan-ig/barres.txt`) :
- **visiteur, et candidat connecté : 5 entrées.** Accueil, AirBuilder ▾ (2 lignes),
  Astuces ▾ (9 lignes, sans Objets), Guilde (un lien direct vers `/#la-guilde`) et le
  bouton Postuler ;
- **ami (Friend) : les mêmes 5 entrées.** Astuces ▾ y compte 10 lignes, Objets compris ;
- **membre (Guard, Vétéran) : 4 entrées.** Guilde ▾ y compte 4 lignes : Information
  Guilde, Chambres Secrètes, World Boss et Mes absences ;
- **bras droit : 5 entrées.** Bras droits ▾ y compte 9 lignes, en 2 rubriques.

---

## 4. Les vérifications faites pour ce bilan

1. **`npx tsc --noEmit`** dans la copie isolée : 0 erreur, `bot/` compris (l'include couvre
   `**/*.ts`). Journal : `scratchpad/bilan-ig-tsc.txt`.
2. **`next build` isolé** dans `scratchpad/build-bilan-ig/`, avec `DEV_ALL` vidé : EXIT 0,
   65 pages générées, aucun avertissement. `/mecaniques`, `/personnages`, `/astuces`,
   `/donjons` et `/login` sont statiques (○) ; `/`, `/guilde` et `/staff` sont dynamiques
   (ƒ). Journal : `scratchpad/build-bilan-ig.log`.
3. **`next start -p 3051` sur cette copie, testé en visiteur sans cookie.** Le serveur a été
   arrêté par `kill`, le port 3051 est libre, et le port 3040 n'a jamais été touché. Relevé
   complet : `scratchpad/bilan-ig/curl-visiteur.txt`.
   - **Pages publiques en 200** : `/`, `/personnages`, `/builder`, `/donjons`, `/astuces`,
     `/prestige`, `/wiki`, `/mecaniques`, `/classes`, `/monstres`,
     `/monstres/MI_ICE_RUSH_FINAL_BOSS`, `/pnj`, `/crafts`, `/candidature`, `/login`,
     `/?error=guild` et `/?error=admin`.
   - **Pages réservées en 307 vers `/login`** : `/guilde`, `/objets`, `/objets/1`,
     `/compositions`, `/compositions/build/x`, `/worldboss`, `/absences`, `/profil`,
     `/staff` et ses 4 sections, `/discord`, `/gestion-worldboss`, `/events`,
     `/acces-amis`, `/build/abc` et `/builder/quelquun`.
   - **Anciennes adresses** :
     - `/quetes` répond 307 vers `/guilde`, et la requête suit ;
     - `/recensement?classe=Primat&role=dps` répond 307 vers
       `/guilde?classe=Primat&role=dps#recensement` ;
     - `/suivi?vue=classes` répond 307 vers `/staff?vue=classes&section=suivi` ;
     - `/guildviewer?dossier=abc&onglet=absences` répond 307 vers
       `/staff?dossier=abc&onglet=absences&section=membres` ;
     - `/guildviewer?vue=absences` répond 307 vers `/staff?vue=absences&section=absences`,
       que la page lit comme la section Absences ;
     - `/guildviewer?filtre=inactifs` répond 307, et `?filtre=` suit ;
     - `/candidatures?statut=PENDING` répond 307 vers `/staff?statut=PENDING&section=candidatures` ;
     - `/builder/mecaniques` et `/astuces-guilde` répondent 308 vers `/mecaniques` ;
     - `/histoire` répond 308 vers `/#la-guilde` ;
     - `/collections`, `/competences` et `/oasis` répondent 308 (en 307 au bilan
       précédent) ;
     - `/sommaire`, `/dashboard`, les 5 pages staff retirées, `/annonce` et les 5 adresses
       de la Boutique répondent 307 comme avant ;
     - une adresse inconnue répond 404.
   - **API en visiteur, 401** : `/api/guilde`, `/api/recensement`, `/api/characters`,
     `/api/objets`, `/api/crafts`, `/api/ou-trouver`, `/api/builder-share`,
     `/api/builder-share/abc`, et sous `/api/admin/` : `users`, `a-traiter`, `suivi`,
     `moderation` (GET et POST), `membre/x`, `membre/x/notes` (POST), `acces-amis` (GET et
     POST) et `candidatures`. `/api/pnj` et `/api/monstres` restent ouvertes, comme
     prévu.
   - **API supprimées, 404** : `/api/quetes`, `/api/quetes/x`, `/api/accueil`,
     `/api/catalogue`, `/api/membres/x`, `/api/characters/x` et `/api/characters/x/gear`.
4. **Le HTML de `/` servi à un visiteur** (84 228 octets, contrôle dans
   `scratchpad/bilan-ig/home-visiteur-controle.txt`) :
   - **aucune recherche** : 0 `<input`, 0 `placeholder`, 0 `ChampWiki`, 0 « Rechercher » ;
   - **aucun rendez-vous** : 0 « rendez-vous », 0 « Prochain », 0 « mercredi » ;
   - **rien d'interne** : 0 « Régler cette page », « À traiter », « À faire », « Mes
     outils », « La guilde cherche », « Les classes de la guilde » ; 0 lien vers `/quetes`,
     `/staff`, `/guilde`, `/suivi` ou `/guildviewer` ; 0 `discordId`, `builderBlob` ou
     `devUser` ;
   - **aucun des 22 noms de la base** n'y figure (les `User.username` et les
     `Character.name`, liste dans `scratchpad/bilan-ig/noms-base.txt`) ;
   - « Mes personnages » apparaît 2 fois : c'est la ligne publique du menu AirBuilder et
     celle du plan du site, pas le bloc personnel ;
   - `id="la-guilde"`, `id="plan"` et « Ce que le site fait » sont présents.

   La page `/personnages` servie à un visiteur ne contient aucun de ces 22 noms non plus.
5. **`scripts/verifier-seances.ts`** (tsx, sans base ni réseau) : EXIT 0, **41 cas**. Ils
   couvrent Information Guilde (« la réponse ne contient RIEN d'interne »), le partage par
   perso, les gestes du dossier, les tons des notes, le départ de la composition, le retour
   parmi les actifs, et l'accès des amis : le réglage, la décision, l'espace d'une
   adresse, la carte d'un ami et la synchro du bot. Journal :
   `scratchpad/bilan-ig/verifier-seances.txt`.
6. **`GET /api/guilde` sur :3040**, en vue Direction, relu clé par clé
   (`api-guilde-direction.json`) :
   - aucune clé `builderBlob`, `lastSeenAt`, `motif`, `discordRoles`, `stats` ni `note` ;
   - les `id` sont des identifiants Discord, ceux que la page rend copiables ;
   - `lienDossier` vaut `null` partout ;
   - le seul `lienBuild` est le mien, vers `/builder?perso=Daiisuke`.
7. **Schéma Prisma, comparé à la copie principale** : **uniquement des ajouts**.
   - `User.persosPartages String[] @default([])` ;
   - `User.cacheLe DateTime?` ;
   - le modèle `NoteMembre` ;
   - le commentaire de `ActionMembre.action` ;
   - `GearProfile.mesures Json?`, qui vient du chantier « Mesures du stuff ».

   La base locale a les colonnes `cacheLe` et `persosPartages`, et la table `NoteMembre`
   (0 ligne). Aucun modèle ni aucune colonne n'a été retiré.
8. **Captures sur :3040 à 1440 px** (DEV_ALL, vue Direction), relues une par une, dans
   `scratchpad/bilan-ig/` :
   - **Accueil** :
     - `accueil-1440.png` : « Mes personnages » en tête (Daiisuke, principal, niv. 200 ·
       P3, « Ouvrir dans l'AirBuilder »), puis le hero. Pas de recherche ni de bandeau ;
     - `accueil-1440-y1000.png` : « Ce que le site fait », avec la phrase et les 4 chiffres
       (« 8 portes ouvertes sans compte, 3 réservées aux membres »).
   - **Information Guilde** :
     - `guilde-1440.png` : le sommaire en ancres, puis les 5 compteurs (6 membres,
       6/8 classes « personne en Sylphide, Chanoine », Mer. 21 h, 0 absent, 0 stuff mesuré
       sur 18) ;
     - `-qui` : Qui est qui, avec « ID DEV » et « ID 151348… » copiables, et « Mon
       AirBuilder » sur mon perso seulement ;
     - `-recensement` : 11 lignes « sans mesure », filtres par classe et par rôle, sans
       lien de dossier ;
     - `-suivi` : « Mesures manquantes (2) » et « Aucun stuff monté (4) », puis La guilde
       en entier.
   - **Tableau de bord** :
     - `staff-1440.png` : 5 onglets de section, la file « À traiter » (4 lignes, aucune
       ligne coffre), « En chiffres » et les Outils ;
     - `staff-membres-1440.png` et `-bas` : 6 membres, comme `/staff`, la pastille de
       rang et la catégorie repliée « Hors guilde (4) ». La catégorie « Amis » est absente,
       car la base locale n'a aucun Friend ;
     - `staff-suivi-1440.png` : l'état de la guilde (2/6, 9/11, 0/18), puis les onglets
       Le stuff, Les classes et Dégâts & PV.
   - **Le dossier d'un membre (de0ksys, Général)** :
     - `dossier-membre-1440.png` : 4 onglets, sans « Quêtes » ;
     - `dossier-decisions-1440.png` : Promouvoir, Rétrograder, Cacher, Retirer de la
       guilde, puis Retirer un rôle (grisé avec sa raison), Exclure et Bannir ;
     - `dossier-notes-1440.png` : le ton (Problème, Effort, Neutre), le texte, « Signée de
       ton nom, datée, visible des seuls bras droits ».
   - **Mes personnages** : `personnages-1440.png`, en lecture seule. La ligne de tête
     renvoie à l'AirBuilder ; on y voit l'illustration, le badge Principal et les 3 stuffs
     vides en retrait.
   - **Le lien profond** :
     - `builder-lien-1440.png` : `/builder?perso=Daiisuke&stuff=0` ouvre le stuff DPS ;
     - `builder-lien-stuff1-1440.png` : `&stuff=1` ouvre bien le stuff **Tank**.
   - **Accès des amis** : `acces-amis-1440.png`, avec le rôle Friend par défaut et Astuces
     et AirBuilder « Ouvert ».
   - **En plus, à 390 px** : `guilde-390.png`, `staff-membres-390.png` et
     `accueil-390.png`. La largeur du document vaut 390 sur les trois : aucun débordement.

---

## 5. À signaler, et à trancher par Maxime

1. **Un écart volontaire à « la même vitrine pour tous ».** Pour un membre de la guilde,
   le hero n'a plus « Postuler », et le bloc « Rejoindre » est masqué. C'est la règle
   d'`appel` de `nav.ts`. Ce ne sont que des boutons en moins, aucune donnée de membre ;
   mais le HTML de `/` varie donc encore selon la personne (voir le §6.7). **À confirmer.**
2. **La candidature ne crée plus de perso.** Les persos déclarés sont publiés à la première
   ouverture de l'AirBuilder. Entre l'acceptation et cette ouverture, une recrue n'a aucun
   perso visible dans la guilde.
3. **Le perso d'exemple « Daiisuke » est resté en base.** Il était publié aux comptes avant
   la correction. Il est le **perso principal de `.dexoz`** (RECRUE) et celui du compte de
   dev ; chez `ibeats`, c'est peut-être son vrai perso. Rien n'a été nettoyé. **À
   trancher.**
4. **Seul Vanguard et plus peut écrire le réglage des amis.** Les 4 rangs peuvent le lire,
   mais l'écriture passe par `canParametrer`. C'est un choix de l'implémentation : la spec
   dit seulement « paramétrable dans l'espace Bras droits ». Si les 4 rangs doivent
   pouvoir l'écrire, c'est une ligne à changer dans `api/admin/acces-amis/route.ts`.
   **À confirmer.**
5. **La case « AirBuilder » du réglage des amis ne change rien aujourd'hui.** Les pages et
   les routes de l'AirBuilder s'ouvrent déjà à tout compte connecté, puisqu'un candidat y
   monte son build. La page `/acces-amis` le dit.
6. **Promouvoir une Recrue la fait entrer dans la guilde** (`rangsDePromotion`). Cela vaut
   pour un candidat comme pour un membre sorti, sans passer par la candidature. Le geste
   est voulu, motivé et confirmé, mais il n'est pas écrit dans la spec. **À confirmer.**
7. **« Cacher » ne retire un membre que d'Information Guilde et du recensement des
   membres.** Ses inscriptions aux Chambres et au World Boss restent, puisque c'est lui qui
   les pose. Seul « Retirer de la guilde » le sort de la composition.
8. **Le partage par perso se fait par le NOM du perso.** La synchro recrée les persos à
   chaque publication, donc leurs identifiants ne tiennent pas. En conséquence, un perso
   renommé n'est plus partagé tant que le membre ne recoche pas la case. C'est voulu : on
   ferme plutôt que de deviner.
9. **Le plan du site dit « Les N pages ».** Il compte en fait des lignes de `nav.ts`. Pour
   un bras droit, il annonce 27 « pages », dont 4 sections de `/staff` et l'accueil : la
   formule exacte serait « lignes » ou « adresses ».
10. **À 390 px, les 6 compteurs de Membres & builds s'empilent un par ligne.** Cela fait
    environ 600 px de compteurs avant la liste. Il n'y a pas de débordement, mais une
    grille de deux colonnes, comme celle d'Information Guilde, serait plus courte.
11. **En dev seulement**, le HTML de `/` porte le compte de dev dans les infos de débogage
    de React. Le build de production n'en contient rien : 0 `devUser`, vérifié ci-dessus.

---

## 6. Ce qu'il faut tester en production

Les gestes qui passent par Discord ne se jouent pas en local. Le bot ne tourne pas contre
le serveur, et aucun compte n'y porte le rôle Friend. Il faut donc les essayer sur le VPS,
avec un compte test.

**Avant la mise en ligne :**
- lancer `prisma db push` en production. Il n'ajoute que des colonnes et une table :
  `User.persosPartages`, `User.cacheLe`, `NoteMembre`, et `GearProfile.mesures` s'il manque
  encore ;
- déployer le site et le bot **ensemble**, dans la même image : le bot importe
  `@/lib/gestes`, `@/config/amis` et `@/lib/compositions` ;
- vérifier que les `ROLE_*` sont remplis dans l'environnement de production. Sinon la
  route refuse toute promotion, avec un message clair.

1. **Changer un rang par le bot.**
   1. Depuis le dossier d'un compte test Guard, un Officier choisit « Promouvoir » vers
      Vétéran, avec un motif et « Oui ».
   2. Sous 15 s, le dossier doit afficher le verdict du bot (« Guard → Vétéran »).
   3. Sur Discord, le rôle Vétéran doit être posé, le rôle Guard retiré, et le motif
      inscrit dans le journal d'audit.
   4. La carte doit dire « Vétéran » sans attendre la synchro de 10 min.
   5. Au plus 5 min plus tard, la session du compte test doit voir son nouveau rang sans
      se reconnecter.

   Refaire l'essai avec « Rétrograder ». Puis vérifier les refus :
   - une promotion au rang de l'acteur répond 400 ;
   - une seconde promotion en vol répond 409 ;
   - un rôle de rang placé au-dessus du bot donne un verdict d'échec lisible.
2. **Retirer de la guilde.**
   1. Le compte test doit perdre tous ses rangs sur Discord, mais rester sur le serveur.
   2. Il doit disparaître d'Information Guilde, du recensement, des classes, des compteurs
      et de la composition (ses inscriptions partent).
   3. Il doit passer dans la catégorie « Hors guilde » de Membres & builds.
   4. Lui rendre Guard à la main sur Discord : après la synchro (10 min), il doit revenir
      parmi les actifs.
3. **Ouvrir l'accès Friend avec un vrai rôle Discord.**
   1. Poser le rôle `1550844483095232712` sur un compte test hors guilde.
   2. Attendre la synchro du bot (10 min), puis au plus 5 min, et recharger la page.
   3. La barre doit montrer Objets dans Astuces.
   4. `/objets` et la recherche d'objets doivent s'ouvrir, et `/crafts` doit montrer les
      recettes.
   5. `/guilde` et `/compositions` doivent mener à `/?error=guild`, et `/staff` à
      `/?error=admin`.
   6. Le compte doit apparaître dans « Amis (hors guilde) », et `/acces-amis` doit compter
      « 1 compte reconnu ».
   7. Retirer le rôle : tout doit se refermer dans le même délai.
   8. Refaire l'essai après avoir fermé « Astuces » dans `/acces-amis`.

   **Au déploiement, le réglage par défaut s'applique sans qu'on y touche** : le rôle
   Friend ouvre Astuces et l'AirBuilder dès la mise en ligne.
4. **L'arrivée après la connexion, derrière le proxy.** Un membre doit arriver sur
   `/guilde`, et un candidat ou un ami sur `/`. L'adresse doit rester celle du site public,
   jamais l'hôte interne du conteneur.
5. **Les liens qui circulent.** Les anciennes notifications d'absence
   (`/guildviewer?dossier=…&onglet=absences`) doivent ouvrir le dossier sur son onglet
   absences, dans `/staff`. Une ancienne notification de quête doit mener à `/guilde`.
6. **« Voir le build » entre deux membres.** Un membre coche un perso dans « Partager » de
   l'AirBuilder. Un autre membre doit alors voir « Voir le build ↗ » dans Qui est qui, et
   la vue ne doit contenir que ce perso. Un ami, lui, doit lire « Ce build n'existe pas ou
   n'est pas public » : la route lui répond 404, sauf si le lien ouvert (`sharePublic`) est
   actif.
7. **Le cache du proxy.** Un membre se connecte, puis on ouvre `/` en navigation privée.
   Le visiteur doit voir « Postuler », et aucun bloc « Mes personnages ».

---

## 7. Le serveur de dev : faut-il le redémarrer ?

**Non.** Le schéma a changé (§4.7), mais le processus qui sert :3040 le connaît déjà :
- **le schéma est poussé.** La base locale a `User.cacheLe`, `User.persosPartages` et la
  table `NoteMembre` ;
- **le client Prisma généré correspond au schéma actuel.** Généré à 07:51, il ne diffère de
  `prisma/schema.prisma` que d'une ligne de commentaire `///` (`lib/rangs.ts` →
  `lib/gestes.ts`, ligne 678). Un `npx prisma generate` ne la rafraîchirait que dans
  l'aide de l'éditeur ;
- **le serveur de :3040 a redémarré après ce `generate`.** Son processus d'écoute
  (`next-server`, pid 12691) est né à 08:00:44, une seconde après la dernière modification
  de `next.config.js` (08:00:43) et après le `generate` de 07:51. Il porte donc le client
  à jour et les redirections actuelles. Sur :3040, `/quetes`, `/recensement`, `/suivi`,
  `/guildviewer` et `/candidatures` y répondent comme en production. `/api/guilde`,
  `/api/admin/users` et l'onglet Notes du dossier, qui lisent les nouvelles colonnes,
  répondent sans erreur.

Une seule exception, déjà connue : pour regarder la barre d'un autre rôle avec `DEV_ROLE`
(`AMI` compris), il faut redémarrer le serveur après avoir changé la variable.
