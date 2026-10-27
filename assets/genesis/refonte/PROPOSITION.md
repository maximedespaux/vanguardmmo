# Proposition d'architecture : une barre courte, un seul accueil, un espace bras droits

*GENESIS, le 2026-10-20. Ce document est à valider par Maxime **avant toute ligne de code**.*

Il s'appuie sur les quatre audits du même dossier (`audit-pages.md`, `audit-accueil.md`,
`audit-staff.md`, `audit-bot.md`). Les points qui comptent ont été revérifiés dans le code et
chaque affirmation cite son fichier. Je n'ai rien modifié dans `src/` ni dans `bot/`.

La demande de Maxime, mot pour mot : « Autre chose pour gagner du temps et de l'espace. On va
enlever "Quête Guilde", "Boutique", "Toutes les pages", un seul et même accueil avec tous les
éléments. Faire du tri. Voir aussi le système du bot discord pour tout automatiser sur le site.
Avoir un espace, pour les bras droits : dashboard, membres et suivi etc... pour tout suivre etc... »

**Comment lire ce document.** Chaque partie commence par ce qui change pour les joueurs, en
clair. Les blocs « Pour qui codera » donnent les fichiers et les lignes à toucher. On peut les
sauter si on ne code pas.

**En une minute.**
- La barre passe de **8 entrées à 4** pour un membre, et à 5 pour un bras droit.
- Quête Guilde et Boutique ne disparaissent pas : elles rejoignent le menu « Guilde » et
  l'accueil.
- `/`, `/dashboard`, `/histoire` et `/sommaire` deviennent **un seul accueil**, qui s'adapte à
  la personne connectée.
- Les bras droits ont **leur espace** : une file « à traiter », puis les rubriques Membres, Suivi
  et Outils.
- Le bot reprend d'abord le geste le plus long du staff, qui reste manuel aujourd'hui : **donner
  son rang à une recrue acceptée**.
- Au total, on passe de **35 à 27 pages utiles**. Aucune adresse ne meurt : chaque ancienne
  adresse redirige vers la nouvelle.
- **Un prérequis, trouvé au contre-examen (§9)** : la barre du haut et le middleware lisent le
  rôle **figé au moment de la connexion** (`lib/auth.ts:54-107`, `middleware.ts:51`). Tant que ce
  n'est pas corrigé, une recrue acceptée ou un officier promu ne voit rien changer avant de se
  reconnecter, jusqu'à 30 jours plus tard. La correction est petite et passe au lot 0.

---

## 1. Le constat, en chiffres

1. **48 fichiers de page** (`find src/app -name page.tsx`) : 35 pages utiles, 7 qui ne font que
   rediriger, 5 fiches de détail et la page de connexion. En juillet, on comptait 28 pages
   (note `refonte-navigation`).
2. **33 entrées de navigation** dans `src/config/nav.ts` : 29 rangées dans 5 espaces
   (`nav.ts:45-246`), 4 hors espace (`nav.ts:249-268`). La barre d'un membre a **8 entrées**,
   plus le bouton « Tout ». Ce bouton liste 21 pages pour un membre et 32 pour un bras droit
   (`PanneauTout.tsx:34`).
3. **Deux accueils** : `/` et `/dashboard`. `/histoire` reprend le même hero (`PageAccueil.tsx`,
   `histoire/page.tsx`). **L'index des pages existe trois fois** : le lien « Toutes les pages »
   (`nav.ts:267`), le bouton « Tout » (`Shell.tsx:112`) et la page `/sommaire`. On relève
   **9 doublons de fonction** en tout (audit-pages §6).
4. **Aucune page utile n'est orpheline** : les 4 orphelines de juillet ont toutes une entrée de
   menu aujourd'hui. En revanche, on trouve **7 décalages entre le menu et l'accès réel**
   (audit-pages §7). Exemple : `/crafts` est publique, mais le menu la marque « guilde »
   (`nav.ts:166`).
5. **Le staff** travaille avec 11 pages rangées sous **deux** menus (`nav.ts:202-209` et
   `:236-243`), et avec 7 fonctions éparpillées dans des pages de membres (audit-staff §2b). Les
   absences ne peuvent pas être validées : aucune ligne du dépôt n'écrit `APPROVED`, et
   `api/absences/route.ts` n'a que GET et POST. Personne ne donne son rang à une recrue
   acceptée : ni le site, ni le bot (`api/admin/candidatures/route.ts:31-35`,
   `bot/lib/botcommands.ts:76-85`). Le site **sait** pourtant poser un rôle Discord :
   `attribuerRole` (`src/lib/discord.ts:87`) pose déjà « Vérifié(e) » à la connexion
   (`lib/auth.ts:95-96`). Il ne le fait simplement pas pour un rang.
6. **Le rôle d'une session ne bouge plus après la connexion.** Le callback `jwt` n'écrit
   `token.role` que lorsque `account` existe, c'est-à-dire à la connexion (`lib/auth.ts:54-107`).
   Le middleware lit ce rôle-là (`middleware.ts:51`), comme la barre (`Shell.tsx:33`, via
   `auth.ts:116`). Les layouts et les routes, eux, relisent la base (`getCurrentUser`,
   `lib/access.ts:78`). Un rang changé sur Discord est donc vu par les pages, mais ni par la barre
   ni par le middleware, jusqu'à la prochaine connexion. La session n'a pas de durée fixée
   (`auth.ts:11`) : c'est le défaut de next-auth v4, soit 30 jours.

---

## 2. La nouvelle barre du haut

**Ce qui change pour les joueurs.** Trois entrées quittent la barre : « Quête Guilde »,
« Boutique » et « Toutes les pages ». Les deux premières passent dans le menu **Guilde ▾**.
Elles restent donc à un survol, et l'accueil les met en avant. « Toutes les pages » est
remplacée par le **plan du site**, en bas de l'accueil. « La guilde » (`/histoire`) devient une
section de l'accueil et une ligne du menu Guilde. Le World Boss quitte Astuces pour Guilde,
puisqu'il est réservé aux membres.

### Visiteur (et candidat connecté) : 5 entrées

```
+--------------------------------------------------------------------------------+
| [G] GENESIS   Accueil   AirBuilder v   Astuces v   Guilde v   [Postuler]        |
|                                                               [Se connecter]   |
+--------------------------------------------------------------------------------+
   Guilde v   La guilde et ses regles   -> /#la-guilde
              La boutique (vitrine)      -> /boutique
```

Un candidat connecté (rôle RECRUE) voit cette même barre. « Se connecter » y est remplacé par la
cloche et le profil. L'enveloppe ✉ disparaît pour lui, puisqu'elle mène à une page qui le refuse
(`Alertes.tsx:101`).

### Membre (Guard, Vétéran) : 4 entrées

```
+--------------------------------------------------------------------------------+
| [G] GENESIS   Accueil   AirBuilder v   Astuces v   Guilde v       (@)  (!)  [moi]|
+--------------------------------------------------------------------------------+
   Guilde v   Quete Guilde            -> /quetes        (clic sur "Guilde" = ici)
              Chambres Secretes       -> /compositions
              World Boss              -> /worldboss     (vient d'Astuces)
              Boutique                -> /boutique
              Mes absences            -> /absences
              La guilde et ses regles -> /#la-guilde
```

### Bras droit (Officier, Général, Vanguard, Direction) : 5 entrées

```
+---------------------------------------------------------------------------------------+
| [G] GENESIS   Accueil   AirBuilder v   Astuces v   Guilde v   Bras droits v  (@) (!) [moi]|
+---------------------------------------------------------------------------------------+
   Bras droits v  (clic = tableau de bord /staff)
     TABLEAU DE BORD    MEMBRES               SUIVI                 OUTILS
     . A traiter        . Membres & builds    . Activite & journal  . Coffre & farm (AirGuild)
                        . Candidatures                              . Mes ventes
                                                                    . Bot Discord
```

Les deux autres menus ne changent presque pas :
- **AirBuilder ▾** : Mes personnages · AirBuilder · Les mécaniques (`nav.ts:61-66`).
- **Astuces ▾** : Le wiki · Donjons · Guide · Prestige · Objets *(membres)* · Classes ·
  Monstres · PNJ · Crafts. C'est 9 entrées au lieu de 10 (le World Boss est parti). Les Crafts
  deviennent visibles des visiteurs, parce que la page leur est déjà ouverte
  (`(vitrine)/crafts/page.tsx:152`, `etatVisiteur()`).

| | barre avant | barre après | déroulants |
|---|---|---|---|
| visiteur | 5 (Accueil, La guilde, Candidature, AirBuilder, Astuces) | 5 | Guilde ▾ : 2 lignes |
| membre | 8 + « Tout » | **4** | Guilde ▾ : 6 lignes |
| bras droit | 8 + « Tout » | **5** | Bras droits ▾ : 7 lignes (11 tant que les pages staff ne sont pas fusionnées) |

Sur téléphone et jusqu'à 1 200 px, le burger affiche déjà tous les déroulants ouverts
(`globals.css:235-241`). Retirer « Tout » ne cache donc aucune page. Au-delà de 1 200 px, un
déroulant ne s'ouvre qu'au survol (`globals.css:227`). Sur une grande tablette tactile, le
premier toucher sur « Guilde » peut ouvrir le menu ou suivre le lien vers `/quetes`, selon le
navigateur : **à vérifier sur un appareil**. Dans le pire cas, la Boutique reste joignable par la
tuile de l'accueil, l'enveloppe ✉ et le panneau du profil.

Tant que l'accueil unique n'existe pas (lot 3), « La guilde et ses règles » et le libellé
« Guilde » d'un visiteur mènent à **`/histoire`**, qui existe encore. Ils passent à `/#la-guilde`
au lot 3, en même temps que la redirection.

> **Pour qui codera — la barre**
> - `nav.ts` : supprimer les espaces « Quête Guilde » (`:173-182`) et « Boutique »
>   (`:183-211`) **en re-déclarant leurs liens** : `/quetes` et `/boutique` vont dans Guilde,
>   `/mes-ventes`, `/coffre` et `/plan-farm` dans Bras droits. Si un lien disparaît de
>   `ESPACES`, sa porte disparaît sans bruit (`dashboard/portes.ts:35,211-216`).
> - `nav.ts` : dans Guilde, déplacer « World Boss » (`:170`) depuis Astuces. Retirer « Accueil
>   de la guilde » (`:228`) **au lot 3 seulement**, avec la redirection de `/dashboard` : avant,
>   `/dashboard` resterait une page vivante absente de `nav.ts`, ce que la règle
>   `methode-assets-et-nav` interdit.
> - `nav.ts` : l'espace Guilde passe en `acces: "public"`. **Chaque lien réservé doit alors
>   porter `acces: "guild"` en toutes lettres.** Un lien sans `acces` hérite de celui de son
>   espace (`Shell.tsx:44`, `l.acces ?? e.acces`). Aujourd'hui « Chambres Secrètes » (`:234`) et
>   « Mes absences » (`:235`) n'en portent pas. Sans ce marquage, un visiteur les verrait au
>   menu et serait renvoyé vers `/login` (`middleware.ts:50`). Même chose pour la ligne
>   « Quête Guilde » à créer. Le filtre de `Shell.tsx:44-45` masque déjà un espace vide.
> - `nav.ts` : dans `HORS_ESPACES`, retirer « La guilde » (`:254`) et « Toutes les pages »
>   (`:267`). Garder « Accueil », et renommer « Candidature » en « Postuler », toujours masquée
>   aux membres (`Shell.tsx:41`). La barre rend les `HORS_ESPACES` **avant** les espaces
>   (`Shell.tsx:65-71`). Pour que « Postuler » soit à droite comme dans la maquette, `Shell.tsx`
>   doit le rendre à part, en bouton.
> - Champs à ajouter : `Espace.hrefVisiteur` (où mène le libellé quand on ne peut pas ouvrir
>   `href` ; pour Guilde, `href` vaut `/quetes` et `hrefVisiteur` vaut `/histoire`, puis
>   `/#la-guilde` au lot 3) ;
>   `Lien.groupe` (le sous-titre du déroulant Bras droits) ; `Lien.barre?: false` (déclaré et
>   listé au plan du site, mais absent de la barre). Ce dernier champ sert à `/profil`, qui n'est
>   déclaré nulle part aujourd'hui (`nav.ts:197-201`). C'est la règle « toute page dans
>   `nav.ts` ».
> - **Une seule fonction de filtre**, `espacesPour(role)`, exportée de `nav.ts`. Elle est
>   appelée par la barre et par le plan du site. Elle remplace les deux copies de `Shell.tsx:35-45`
>   et de `sommaire/page.tsx:24-28`.
> - `Shell.tsx` :
>   - le libellé d'un espace utilise `hrefVisiteur` (`:87`) ;
>   - **ne pas toucher à `chemin()`** (`:37`). `usePathname()` ne rend jamais le `#`, donc un
>     lien `/#la-guilde` n'est jamais « actif », et c'est le comportement voulu. Couper le `#`
>     ferait l'inverse : `chemin("/#la-guilde")` vaudrait `/`, et « La guilde », comme tout
>     l'espace Guilde, s'allumerait sur toute la page d'accueil ;
>   - retirer `PanneauTout` (`:10`, `:112`) si la question 2 est tranchée par oui.
> - `Alertes.tsx` et `ProfilePanel.tsx:22-28` : filtrer par `canAccessGuild`. « Mes demandes »
>   et l'enveloppe ✉ pointent vers `/boutique?mode=commande`. `Alertes.tsx` cite `/messages`
>   **trois fois** : l'enveloppe (`:101`), le clic sur une alerte du navigateur quand plusieurs
>   arrivent (`:62`) et l'alerte de test (`:85`).
> - **La Boutique doit suivre l'adresse.** Elle lit `?mode=` une seule fois, au montage
>   (`EcranEconomie.tsx:171`, `useState(() => panneauDeLURL())`), et `MesCommandes` lit `?fil=`
>   une seule fois aussi (`MesCommandes.tsx:192-196`). Or la page n'est pas remontée quand seule
>   la requête change : `Shell.tsx:122` ne change de clé qu'avec le chemin. Un membre déjà sur
>   Boutique › Au coffre qui clique ✉ resterait donc sur Au coffre. Les deux composants doivent
>   réagir au changement de paramètres.
> - **Le rôle de la session doit être relu** (`lib/auth.ts:54-107`). Dans le callback `jwt`,
>   quand `account` est absent, relire `role` et `discordRoles` en base au plus toutes les
>   5 minutes. Le cookie est réécrit à chaque appel de `/api/auth/session`, que `useSession`
>   fait au chargement et au retour sur l'onglet. Sans cela, la barre et le middleware gardent
>   le rang de la connexion (§1, point 6).
> - **Les barres par rôle ne se vérifient pas en local tel quel.** Avec `DEV_ALL`, tout le monde est
>   DIRECTION : le compte de dev est créé avec ce rang (`lib/access.ts:14-20`), la barre
>   affiche tout (`Shell.tsx:32-35`) et le middleware laisse tout passer (`middleware.ts:42`).
>   Il faut une variable de dev, par exemple `DEV_ROLE=GUARD`, sans effet en production comme
>   `DEV_ALL` (`lib/devAccess.ts`), pour voir les barres visiteur, membre et bras droit.
> - `SectionTabs.tsx:6-25` : lire libellés et droits dans `nav.ts`, et filtrer selon le rôle.
>   Aujourd'hui, l'onglet « World Boss » s'affiche à un visiteur sur `/donjons`
>   (`components/donjons/PageDonjons.tsx:286`) et l'envoie vers la page de connexion.
> - Le libellé « Bras droits » vise le hub actuel `/guildviewer` tant que `/staff` n'existe pas
>   (lot 1), puis `/staff` (lot 2).

---

## 3. L'accueil unique

**Ce qui change pour les joueurs.** Il ne reste qu'une adresse, **`/`**. Le logo et « Accueil »
y mènent, et c'est là qu'on arrive après la connexion (`login/page.tsx:75`, `callbackUrl: "/"`).
La page montre trois visages : un pour le visiteur, un pour le membre, un pour le bras droit. Un
membre n'atterrit plus sur la page publique avec un bouton « Se connecter avec Discord »
(`HeroFlyff.tsx:95`). Il voit directement ce qui l'attend.

### 3.1 Les sections, dans l'ordre, selon qui regarde

| # | Section | Visiteur / candidat | Membre | Bras droit | Ce qu'elle reprend | Données |
|---|---|---|---|---|---|---|
| 0 | Avis d'accès | oui, si `?error=` | oui | oui | `AvisAcces` de `/` (`PageAccueil.tsx:90`) | `?error=` du middleware (`middleware.ts:52-53`) |
| 1 | En-tête | **Hero plein écran** : connexion (masquée si connecté) et Postuler | **bandeau compact** : GENESIS, recherche du wiki, prochain rendez-vous | idem membre | hero de `/` et de `/histoire` (doublon exact) | aucune ; rendez-vous : `CRENEAUX` (`lib/compositions.ts:21-24`) et `/api/worldboss` |
| 2 | **À traiter** | — | — | les 3 lignes les plus urgentes, puis « Espace bras droits → » | « Priorités du jour » de `/dashboard` (`dashboard/page.tsx:241`) | `/api/admin/a-traiter` (**à créer**, §4) |
| 3 | Le jeu | bandeau, recherche du wiki, 4 chiffres | — | — | blocs 3-4 de `/` (`PageAccueil.tsx:93-157`) | `chiffresAccueil()` côté serveur |
| 3 | **À faire** | — | ce qui attend un geste du membre (voir 3.2) | idem | l'alerte de `OuJenSuis`, le badge « à confirmer » de `/quetes` (`quetes/page.tsx:253`) | `/api/quetes`, `/api/profil`, `/api/compositions`, `/api/absences` |
| 4 | Ce que le site fait / **Mes outils** | 12 portes publiques, Boutique vitrine comprise | 6 tuiles : Quête Guilde, Boutique, Chambres Secrètes, World Boss, AirBuilder, Mes absences | idem, plus la tuile « Espace bras droits » | portes de `/` (`PortesSite.tsx:107-205`, **sans** la porte `/dashboard` `:201`) et groupe « Jouer ensemble » de `dashboard/portes.ts` | « N à prendre » : `/api/quetes` ; « 1 commande », « 5 stuffs » : `/api/profil` (`compteurs`) ; « mer. 9 / 12 » : `/api/compositions` ; « 1 passage » : `/api/worldboss` ; absences : `/api/absences`. `/api/dashboard` n'a **aucun** de ces comptes (`route.ts:105-114`) |
| 5 | **La guilde cherche** | — | les 3 quêtes ouvertes, bouton « J'apporte », lien « Toutes les quêtes → » | idem | onglet « principales » de `/quetes` | `/api/quetes` |
| 6 | Les huit classes / **Mes personnages** | les 8 cartes du jeu | mes persos, niveau, stuffs | idem | `ClassesHeros` / `OuJenSuis` | `/api/profil` |
| 7 | Les classes de la guilde | — | les 8 cartes, avec le compte de la guilde par-dessus | idem | `Classes` de `/dashboard` (`Grandeurs.tsx`) | `/api/dashboard` → `characters.classes` |
| 8 | **La guilde** `#la-guilde` | dépliée : « Présents, ça veut dire… » et les 4 objectifs | repliée en bas (les règles). Le bloc s'ouvre tout seul quand l'adresse vise `#la-guilde` : sinon le lien du menu tomberait sur un titre fermé | repliée, même règle | tout `/histoire`, sauf son hero et la phrase-renvoi `:207-210` | aucune |
| 9 | Rejoindre | **un seul** bloc : l'illustration de `/`, la condition ferme et le bouton de `/histoire` | — | — | fusionne `PageAccueil.tsx:207-277` et `histoire/page.tsx:215-230` | aucune |
| 10 | **Plan du site** `#plan` | pages publiques, présentes dans le HTML servi | replié, filtré par `espacesPour(role)`, ouvert d'office quand on arrive par `#plan` (c'est le cas de tout ancien lien `/sommaire`) | replié, staff compris | remplace `/sommaire`, le bouton « Tout » et la porte « Tout le site » (`portes.ts:196`) | `nav.ts` |

Ce qui **quitte** l'accueil :
- les barres « État de la guilde » (`Grandeurs`) partent sur le tableau de bord des bras droits,
  où **les 4 compteurs du §4.1 les remplacent**. Deux barres n'ont pas d'équivalent :
  « Personnages avec un build » devient une ligne de la file, et « Candidatures traitées »
  (`Grandeurs.tsx:86`) disparaît. Si Maxime y tient, sa place est `/statistiques` ;
- les 11 portes « Tenir la guilde » (`portes.ts:141-187`) laissent place à une seule tuile ;
- les portes « Mes affaires » et « Ce que la guilde sait » sont supprimées : elles recopient les
  raccourcis du profil et les menus (audit-accueil §5.2).

### 3.2 La ligne « À faire » d'un membre

Une ligne ne s'affiche que si un geste attend. Quand le bloc est vide, il tient en une ligne :
« Rien ne t'attend ».
- « N apports à confirmer sur tes quêtes » → `/quetes`. Ce compte bloque le livreur, qui attend
  sa récompense (`quetes/page.tsx:252-253`).
- « Ta commande "…" : à récupérer » → `/boutique?mode=commande`. Le libellé reprend celui du
  panneau profil (`ProfilePanel.tsx:42-50`).
- « Chambres Secrètes mercredi 21 h : tu n'es pas inscrit » → `/compositions`.
- « Tu es déclaré absent jusqu'au … » → `/absences`, avec le bouton « Prévenir d'une absence »
  quand il n'y a pas d'absence en cours.
- « N perso(s) sans stuff » → `/builder`, comme l'alerte de `OuJenSuis.tsx:70`.

### 3.3 Où vivent désormais Quête Guilde, Boutique et l'index

| | page | dans la barre | sur l'accueil | ailleurs |
|---|---|---|---|---|
| **Quête Guilde** | `/quetes` **reste** (4 onglets) | 1re ligne de Guilde ▾. Un clic sur « Guilde » y mène, comme le faisait l'entrée directe | tuile « N à prendre », section « La guilde cherche », ligne « à confirmer » | l'onglet staff « Quêtes secondaires » (manques du coffre et dépôt, `quetes/page.tsx:265`) reste dans la page pour l'instant. Il est lié depuis Bras droits › Coffre & farm |
| **Boutique** | `/boutique` **reste**, à la même adresse : elle est postée sur Discord (`lib/ventes.ts:409`) | Guilde ▾, y compris pour un visiteur (vitrine, `middleware.ts:26-29`) | porte (visiteur), tuile et ligne « ta commande » (membre) | ✉ et profil → `/boutique?mode=commande`, à condition que la page suive le changement de `?mode=` (§2) ; « N commandes sans preneur » pour les bras droits |
| **Index des pages** | `/sommaire` **redirige** vers `/#plan` | supprimé | plan du site replié, en bas | bouton « Tout » retiré (question 2) |

> **Pour qui codera — l'accueil**
> - `src/app/page.tsx` reste un composant serveur avec son `metadata` (`:28-31`), donc la page
>   reste **publique et indexable**. Il lit le niveau d'accès avec `etatVisiteur()`
>   (`src/lib/vitrine.ts:67-72`), auquel on ajoute un drapeau `staff`, puis il choisit **l'ordre
>   des sections**. Je recommande ce choix plutôt que `useSession` : il évite le flash du hero
>   visiteur chez un membre. Un moteur de recherche n'a pas de cookie, il reçoit donc toujours
>   la vue visiteur.
> - **Aucune donnée de membre dans le HTML.** Les blocs membre sont des composants client. Ils
>   lisent seulement des routes gardées :
>   - `/api/profil` (`route.ts:83-84`) ;
>   - `/api/quetes` (`route.ts:13-17`) ;
>   - `/api/compositions` (`route.ts:11-13`) ;
>   - `/api/worldboss` (`apiGuild`, `route.ts:7`) ;
>   - `/api/absences` (`apiGuild`, `route.ts:7`).
>
>   Les comptes de la guilde par classe ne s'affichent jamais en vue visiteur. Les données
>   restent dans ces routes, mais le HTML d'un membre n'est pas celui d'un visiteur : il faut
>   donc vérifier qu'**aucun cache partagé** ne sert `/` sur le VPS. Le trafic y passe par
>   Nginx Proxy Manager (`docker-compose.prod.yml`, réseau `nginx-proxy-manager_default`), dont
>   le réglage de cache ne figure pas dans le dépôt. Je ne l'ai pas vérifié.
> - **Six lectures par affichage, c'est trop.** Les blocs d'un membre lisent `/api/quetes`,
>   `/api/profil`, `/api/compositions`, `/api/worldboss`, `/api/absences` et `/api/dashboard`,
>   en plus de `/api/notifications` que la cloche interroge toutes les 45 s. Je recommande
>   **une seule route `GET /api/accueil`** (garde `apiGuild`), qui calcule « À faire » et les
>   comptes des tuiles en une lecture, sur le modèle de `/api/admin/a-traiter` (§4.1).
> - **Deux rôles, une seule page.** `/` choisit l'ordre des sections avec le rôle **en base**
>   (`etatVisiteur()` → `getCurrentUser`), alors que la barre affiche le rôle **de la session**
>   (§1, point 6). Sans la relecture du rôle prévue au lot 0, un officier promu verrait la vue
>   bras droit sous une barre de membre.
> - `/` devient dynamique. Il faut donc mettre en cache, au niveau du module, les lectures de
>   fichiers de `chiffresAccueil()` **et de `comptesPortes()`** (`components/accueil/chiffres.ts:45`
>   et `:113`) : aucune des deux n'a de cache aujourd'hui.
> - À réutiliser : `HeroFlyff` (masquer le bouton `:95` si une session existe), `AvisAcces`,
>   `BandeauCartes`, `ClassesHeros` (qui reçoit les comptes en option), `OuJenSuis`, `Classes`
>   de `Grandeurs.tsx`, `PortesSite`.
> - `Shell.tsx:116` : masquer « Se connecter » sur `/` aussi, puisque le hero le porte déjà.
>   Aujourd'hui, un visiteur voit deux boutons.
> - Les réglages Vanguard sont rangés sous `page: "/dashboard"` (`dashboard/page.tsx:70`). Il
>   faut les relire sous `/`, avec l'ancienne clé en repli. **Seuls quatre réglages survivent**,
>   parce que leurs blocs restent : `montrerOuJenSuis`, `montrerClasses`, `persosMontres` et
>   `descriptionsDesPortes`. Les autres suivent leur bloc ou meurent avec lui :
>   `montrerPriorites` et `montrerGrandeurs` vont sur `/staff`, et `portesEnPremier`, les
>   `voir_<groupe>` et `premierGroupe` disparaissent avec les groupes de portes
>   (`dashboard/page.tsx:74-117`). Autre limite : `GET /api/reglages` exige la guilde
>   (`api/reglages/route.ts:33-35`). La vue visiteur ne se règle donc pas, et elle ne doit pas
>   appeler `useReglages`, sinon chaque visite d'un inconnu produit un 401. Retirer aussi
>   `/dashboard` et `/sommaire` de `PAGE_BG` (`Shell.tsx:20-27`).
> - Piège connu : `useReveal` ne relève les blocs qu'au montage. Les blocs qui arrivent avec les
>   données doivent s'en passer (`dashboard/page.tsx:153-167`).
> - Deux défauts à corriger **avant** de recopier les chiffres de `/api/dashboard` :
>   - le coffre est lu dans `CoffreItem`, une table que plus rien n'alimente (`route.ts:34,71`).
>     Il faut lire le vrai stock avec `etatCoffre()` (`src/lib/coffre.ts:77`) ;
>   - les comptes portent sur **tous** les comptes, Recrues comprises : `user.findMany`,
>     `character.findMany` et `groupBy` n'ont aucun filtre (`route.ts:23-32`). Les « classes de
>     la guilde » comptent donc aussi les persos des candidats. Il faut restreindre aux
>     `GUILD_ROLES`.

### 3.4 Maquette : membre (bureau)

```
+--------------------------------------------------------------------------------+
| [G] GENESIS   Accueil   AirBuilder v   Astuces v   Guilde v       (@)  (!)  [moi]|
+--------------------------------------------------------------------------------+
+-- BANDEAU COMPACT (~140 px) ---------------------------------------------------+
|  GENESIS                                   Prochain : Chambres Secretes mer. 21h|
|  [ Chercher un objet, un monstre, un PNJ...          ]     World Boss sam. 20h  |
+--------------------------------------------------------------------------------+
 A FAIRE                                                                     (3)
 | * 2 apports a confirmer sur tes quetes                       [ Confirmer > ] |
 | * Ta commande "Arc +6" : a recuperer                         [ Suivre > ]    |
 | * Chambres Secretes mer. 21h : tu n'es pas inscrit           [ Je serai la > ]|

 MES OUTILS
 [ Quete Guilde    ] [ Boutique        ] [ Chambres Secretes ]
 [ 4 a prendre     ] [ 1 commande      ] [ mer. 9 / 12       ]
 [ World Boss      ] [ AirBuilder      ] [ Mes absences      ]
 [ 1 passage       ] [ 5 stuffs        ] [ Prevenir          ]

 LA GUILDE CHERCHE                                         Toutes les quetes >
 | 40 Ame de demon        25 / 40 promis               [ J'apporte ]          |
 | 12 Cristal d'Oasis      3 / 12                      [ J'apporte ]          |

 MES PERSONNAGES                                      Tous mes personnages >
 | [T] Kael   principal   niv. 165 . P4    3 stuffs                         > |
 | [P] Lyra               niv. 140         sans stuff                       > |

 LES CLASSES DE LA GUILDE
 [Spadassin 3] [Templier 2] [Arbaletrier 4] [Sylphide 1]
 [Arcaniste 2] [Envouteur 0] [Primat 3]     [Chanoine 1]

 > PLAN DU SITE (replie)            > LA GUILDE ET SES REGLES (replie)
```

Pour un **bras droit**, un bloc s'ajoute tout en haut, entre le bandeau et « À faire » :

```
 A TRAITER                                              Espace bras droits >
 | 3  candidatures en attente (la plus vieille : 2 j)   [ Voir > ]          |
 | 1  World Boss dans moins d'une heure                 [ Voir > ]          |
 | 5  commandes sans preneur                            [ A livrer > ]      |
```

### 3.5 Maquette : visiteur (bureau)

```
+--------------------------------------------------------------------------------+
| [G] GENESIS   Accueil   AirBuilder v   Astuces v   Guilde v   [Postuler]        |
+--------------------------------------------------------------------------------+
+-- HERO (plein ecran, celui d'aujourd'hui) -------------------------------------+
|                              G E N E S I S                                     |
|        Peu de membres, mais presents. Discord et vocal obligatoires.           |
|            [ SE CONNECTER AVEC DISCORD ]      [ Postuler ]                     |
+--------------------------------------------------------------------------------+
 (avis "reserve aux membres" si le middleware a renvoye ici)

 LE JEU - Serveur prive Airborn : Winds of Rhisis. Ca se consulte sans compte.
 [ Chercher un objet, un monstre, une recette, un PNJ...         ] -> /wiki
 [ 8 specialisations ] [ N instances ] [ N objets ] [ N vagues ]

 CE QUE LE SITE FAIT                 9 ouvertes sans compte, 3 reservees aux membres
 [AirBuilder] [Donjons] [Monstres] [PNJ] [Wiki] [Prestige] [Guide] [Crafts]
 [Boutique (vitrine)] [Objets (cadenas)] [Chambres Secretes (cadenas)] [World Boss (cadenas)]

 LES HUIT FINS DE PARTIE              (les cartes du jeu, sans compte de la guilde)

 LA GUILDE   #la-guilde               (ex-/histoire)
 "Presents, ca veut dire..."   [Vocal avant tout] [Personne ne reste bloque]
                               [CS serieuses]     [Un coffre qui sert]

 REJOINDRE - Une seule condition ferme : etre joignable en vocal.  [ Postuler ]

 PLAN DU SITE  #plan                  (pages publiques, presentes dans le HTML)
```

Sur téléphone (375 px), les tuiles passent sur deux colonnes. « À faire » et « À traiter »
prennent toute la largeur, et chaque bouton passe sous sa phrase.

---

## 4. L'espace bras droits

**Pour qui.** Les quatre rangs staff : Direction, Vanguard, Général et Officier. C'est déjà la
règle du site (`roles.ts:19`, `canAccessAdmin` `:57`) et du bot (`bot/lib/permissions.ts:26`,
`isStaff`). Le code parle déjà de « bras droits » (`lib/access.ts:157`). Les gestes sensibles
gardent leur cran au-dessus, réservé à Vanguard et plus : la modération
(`api/admin/moderation/route.ts:55-56`) et les réglages de page (`roles.ts:77`). L'espace
lui-même n'élargit aucun droit : il range des pages déjà réservées aux mêmes quatre rangs. **Deux
points de la proposition en élargissent un, et reviennent à Maxime** : l'automatisation 1 (§6),
qui donne de fait à un Officier le pouvoir de poser un rang Discord en acceptant une
candidature (question 7), et l'ouverture des Mécaniques au public (question 4).

**L'entrée.** Un seul « Bras droits ▾ » dans la barre (dessin au §2). Un clic ouvre le tableau
de bord, `/staff`. Sous le menu, chaque page staff porte la **même barre d'onglets** que ses
voisines de rubrique, sur le modèle de `SectionTabs`, mais générée depuis `nav.ts`.

### 4.1 Le tableau de bord `/staff` : la file « à traiter »

En haut, **une seule file**, triée par urgence. Chaque ligne donne un nombre, une phrase et le
bouton qui mène au geste. Une ligne à zéro ne s'affiche pas. Quand la file est vide, elle dit
« Rien en attente ».

| ligne | urgence | source | API qui existe | ce qui manque | mène à |
|---|---|---|---|---|---|
| N candidatures en attente, la plus vieille depuis X | haute | `Application` PENDING / WAITING / INTERVIEW | `/api/dashboard` → `candidatures` (`route.ts:78-79`) ; `/api/admin/candidatures?status=` (`route.ts:10-18`) | l'ancienneté | `/candidatures` |
| World Boss dans moins d'une heure | haute | `WorldBossEvent` | `/api/dashboard` → `worldboss` (`route.ts:82-84`) | — | `/worldboss` |
| N gestes de modération **échoués** | haute | `ActionMembre.statut = ECHOUEE` (`schema.prisma`, modèle `ActionMembre`) | `GET /api/admin/moderation` : les 60 derniers, sans filtre et sans appelant (`route.ts:38-50`) | filtre `statut` ; **une adresse qui ouvre un dossier** : le dossier n'est qu'un état de la page (`guildviewer/page.tsx:39,204`), aucun lien ne peut l'ouvrir. Il faut un `?dossier=`. Le dossier se cherche par `userId`, alors qu'`ActionMembre` est indexé par `discordId` et qu'un banni peut ne plus avoir de ligne `User` | dossier du membre |
| Bot : N commandes échouées, ou bot muet | haute | `BotCommand` FAILED, ou PENDING depuis plus d'une minute (`schema.prisma:594-606`) | `GET /api/admin/bot-command` : les 20 dernières (`route.ts:9-13`) | filtre et signal de vie | `/discord` |
| N commandes sans preneur | moyenne | `BankRequest` sans détenteur | `/api/admin/statistiques` → `ventes.sansDetenteur` (`route.ts:120`) | — | `/boutique?mode=requetes` |
| N offres de vente à valider | moyenne | `OffreVente` (`statut`, `valideePar`) | aucune | un compte (règle exacte à fixer au codage) | la conversation de la vente |
| N absences : en cours, de retour aujourd'hui | moyenne | `Absence` | `/api/absences?all=1`, réservé aux officiers et **sans appelant** (`absences/route.ts:8-11`) | la vue (et une route de validation si la question 5 la garde) | Membres › Absences |
| N membres sans visite depuis 30 jours | basse | `User.lastSeenAt` (`schema.prisma:103`) | calcul par membre dans `statistiques/route.ts:59` | une liste | Membres, filtre « inactifs » |
| N persos sans build, N membres sans perso principal | basse | `Character` | `/api/dashboard` (`route.ts:93-96`) | destination juste : aujourd'hui `/personnages`, qui ne montre que **ses** persos | `/guildviewer` |
| N objets du coffre sous le seuil | basse | `AirGuildState` via `etatCoffre()` | `/api/admin/farm` | corriger `/api/dashboard`, qui lit `CoffreItem` | Coffre & farm |

En dessous, **4 compteurs** :
- **membres actifs sur 30 jours**, comptés sur `lastSeenAt` et sur les seuls rangs de guilde,
  et non sur `isActive`, qui ne bouge qu'au kick ou au ban (`bot/lib/moderation.ts:120`) ;
- **absents aujourd'hui** ;
- **commandes en cours** ;
- **objets sous le seuil**.

Une pastille « bot en ligne » les accompagne. Elle demande un battement de cœur, donc
l'automatisation 5 (lot 4). Au lot 2, `/staff` ne peut dire que « une commande attend depuis plus
d'une minute », ce qui se calcule déjà sur `BotCommand.createdAt` et `status`.

> **Pour qui codera — le tableau de bord**
> - Créer la page `src/app/(admin)/staff/page.tsx`. Elle est protégée par `requireAdmin`
>   (`(admin)/layout.tsx:4`). Ajouter `/staff` à `ADMIN_PREFIXES` (`middleware.ts:37`) et au
>   `matcher` (`:68-74`), et la déclarer dans `nav.ts` **dans le même commit**.
> - Le libellé « Bras droits » et `/staff` lisent le rang de la session dans le middleware
>   (`middleware.ts:51-52`). Un officier tout juste promu n'y entre donc qu'après la relecture du
>   rôle prévue au lot 0.
> - Créer `GET /api/admin/a-traiter`, gardée par `apiRole(ADMIN_ROLES)` (`lib/access.ts:129`).
>   Elle calcule toute la file en une lecture et s'appuie sur un module partagé
>   **`src/lib/recap.ts`**. Le bot l'importera pour son récap, par l'alias `@/*`, comme il
>   importe déjà `@/lib/compositions` (`bot/scheduler.ts:14`). Discord et `/staff` montreront
>   ainsi les mêmes chiffres. **Contrainte** : le bot tourne sous `tsx`, hors de Next. `recap.ts`
>   ne doit donc importer ni `next/*`, ni `next-auth`, ni `@/lib/access`, mais seulement
>   `@/lib/prisma` et des modules purs comme `@/lib/coffre` (`etatCoffre`, qui lit le disque et la
>   base, `coffre.ts:1-3`). C'est ce que fait déjà `compositions.ts`. Le bot aura alors deux
>   clients Prisma, le sien (`bot/lib/prisma.ts`) et celui de `@/lib/prisma` : c'est acceptable,
>   sinon `recap.ts` reçoit le client en paramètre.
> - Sortir de `/api/dashboard` les champs réservés au staff : `priorities`, `members.roles`,
>   `coffre.topDeficits` (`route.ts:105-114`). Aujourd'hui, ils partent chez tout membre, et
>   seul l'écran les cache (`dashboard/page.tsx:241`). **Attention à l'ordre** : `/dashboard`
>   vit jusqu'au lot 3, et c'est le seul lecteur de `priorities` (`dashboard/page.tsx:241`,
>   `donnees.ts:38`). Retirer le champ au lot 2 vide son bloc « Priorités du jour ». Il faut
>   donc, au même lot, faire lire `/api/admin/a-traiter` à ce bloc.
> - Attention : la garde `apiAdmin` citée dans les notes **n'existe pas** dans le dépôt (grep vide
>   sur `src/` et `bot/`). La garde staff des routes est `apiRole(ADMIN_ROLES)` ou
>   `apiAuth` + `canAccessAdmin`.

### 4.2 Les rubriques

| rubrique | onglets | pages | API qui existe | ce qu'il faut créer |
|---|---|---|---|---|
| **Membres** | Membres & builds · Absences · Candidatures | `/guildviewer`, avec le dossier à 4 onglets (`components/DossierMembre.tsx`) ; vue Absences en `?vue=absences` ; `/candidatures` reste une page qui porte la même barre | `/api/admin/users` (`apiRole`, `route.ts:8`), `/api/admin/membre/[id]`, `/api/admin/moderation`, `/api/absences?all=1`, `/api/admin/candidatures` | `lastSeenAt` dans `/api/admin/users` (absent aujourd'hui), une colonne « dernière visite » ; les paramètres `?vue=absences`, `?filtre=inactifs` et `?dossier=`, qu'aucune page ne lit aujourd'hui. Le hub de `guildviewer/page.tsx:92-97` (4 boutons, dont `/plan-farm` et `/gestion-worldboss`) devient inutile avec `/staff` : à retirer au lot 2 ou à repointer au lot 6 |
| **Suivi** | Activité · Journal | `/statistiques` ; `/journal` y entre comme onglet au lot 6. La page le disait déjà : « ici on regarde l'ensemble » | `/api/admin/statistiques`, `/api/admin/journal` | rien. Le suivi des commandes passe par la file (§4.1), qui mène à Boutique › À livrer |
| **Outils** | Coffre & farm · Mes ventes · Bot Discord | `/coffre` (AirGuild), avec le plan de farm en onglet au lot 6 (demande de Maxime, note `chantier-boutique-suite` point 5) ; `/mes-ventes` ; `/discord`, avec les onglets Pilotage, Agenda (créneaux, events, puis World Boss) et Publier (annonce, embed, giveaway, panneau) | `/api/admin/airguild`, `/api/admin/farm`, `/api/mes-ventes`, `/api/admin/settings`, `/api/admin/bot-command`, `/api/admin/channels`, `/api/admin/events` | fermer **côté serveur** la réserve « Vanguard seul » de l'AirGuild : elle n'est tenue que dans le navigateur (`public/airguild/airguild.js:33`), alors que le `PUT` (`api/admin/airguild/route.ts:72`) n'exige qu'un rang staff. **Ce n'est pas une petite correction** : `airguild.js` appelle `canEdit()` à 32 endroits (catalogue, attribution des coffres, seuils de farm, coffres des autres membres), et le `PUT` remplace le blob entier (`route.ts:82-86`). Il faut comparer chaque partie réservée à l'état précédent, déjà lu (`route.ts:80`), et refuser ou restaurer. Effort M, lot 0 bis (§7) |

Le World Boss staff n'a pas de rubrique à lui. Sa gestion entre **dans `/worldboss`** au lot 6 :
les gestes réservés au staff s'affichent dans la page, comme sur `/compositions`. Le menu staff
tombe ainsi de **11 entrées éparses** à **7, rangées en 4 groupes**.

---

## 5. Le tri, page par page

Règle de lecture : **aucune adresse ne meurt.** Une ancienne adresse redirige vers sa nouvelle
place, en gardant ses paramètres. Une redirection est « permanente » (308) seulement pour une
page publique déjà indexée. Partout ailleurs, elle reste « temporaire » (307), pour qu'on puisse
encore changer d'avis.

| adresse | aujourd'hui | décision | l'ancienne adresse mène à | lot |
|---|---|---|---|---|
| `/` | accueil public | **garder** : elle devient l'accueil unique | — | 3 |
| `/histoire` | La guilde | **fusionner dans `/`** (section La guilde) | `/#la-guilde` (308) | 3 |
| `/dashboard` | accueil de la guilde | **fusionner dans `/`**. La partie staff part sur `/staff` | `/` | 3 |
| `/sommaire` | index de `nav.ts` | **retirer** | `/#plan` | 1 |
| `/messages` | `<MesCommandes/>` (`messages/page.tsx:9-10`), le même composant que Boutique › Ma commande | **retirer**. La redirection vit pour toujours : des notifications en base y pointent (`api/ventes/[id]/route.ts:139` et suivantes), ainsi que les MP déjà envoyés par `prevenir` (`lib/ventes.ts:309-323`, lien `${site}${lien}`) | `/boutique?mode=commande` (`?fil=` conservé, lu par `MesCommandes.tsx:196`) | 1 |
| `/quetes` | barre, entrée directe | **garder, déplacer** dans Guilde ▾ (1re ligne) et sur l'accueil | — | 1 |
| `/boutique` | barre, menu Boutique | **garder, déplacer** dans Guilde ▾ et sur l'accueil. Elle absorbe `/messages` | — | 1 |
| `/worldboss` | menu Astuces | **garder, déplacer** dans Guilde ▾. Elle absorbe `/gestion-worldboss` | — | 1 puis 6 |
| `/compositions` · `/compositions/build/[slotId]` | Guilde ▾ | garder | — | — |
| `/absences` | Guilde ▾ | garder (Guilde ▾, accueil, profil) | — | — |
| `/objets` · `/objets/[id]` | Astuces ▾ (membres) | garder | — | — |
| `/profil` | panneau du profil | **garder** : c'est le détail, l'accueil n'en montre qu'un résumé. Il est déclaré dans `nav.ts` avec `barre: false` | — | 1 |
| `/candidature` | barre (non-membres) | garder, sous le nom « Postuler » | — | 1 |
| `/login` | connexion | garder. Son « Retour à l'accueil » mène à `/histoire` (`login/page.tsx:81`) et doit mener à `/` | — | 0 |
| `/builder` · `/personnages` · `/build/[shareId]` · `/builder/[user]` | AirBuilder | garder | — | — |
| `/builder/mecaniques` | menu public, page réservée aux connectés (`(verified)/layout.tsx:11`) | garder. Public ou non : **question 4**. L'ouvrir veut dire **déplacer** le dossier `(verified)/builder/mecaniques/` vers `(public)/builder/mecaniques/` : une redirection ne peut pas changer le garde d'une même adresse. Le risque reste faible, parce que tous ses imports passent par `@/` (`page.tsx:1-18`). Un `next build` complet reste obligatoire | — | 0 |
| `/donjons` `/astuces` `/prestige` `/wiki` `/classes` `/pnj` `/monstres` `/monstres/[id]` | Astuces ▾ | garder | — | — |
| `/crafts` | menu « guilde », page publique | garder. Le menu passe en public | — | 0 |
| **`/staff`** | — | **nouvelle** : tableau de bord des bras droits | — | 2 |
| `/guildviewer` · `/candidatures` | Guilde ▾ (staff) | garder, rubrique Membres | — | 2 |
| `/statistiques` | Guilde ▾ (staff) | garder, rubrique Suivi. Elle absorbe `/journal` | — | 2 |
| `/journal` | Guilde ▾ (staff) | **fusionner dans `/statistiques`** (onglet). Deux liens internes à repointer : `statistiques/page.tsx:134` et `MesCommandes.tsx:384` | `/statistiques?vue=journal` (`?membre=` conservé) | 6 |
| `/coffre` · `/mes-ventes` | menu Boutique (staff) | garder, rubrique Outils | — | 2 |
| `/plan-farm` | menu Boutique (staff) | **fusionner dans `/coffre`** (onglet). `/coffre` est l'app AirGuild en JS natif, avec ses propres onglets (`coffre/page.tsx:8-17`), et `/plan-farm` une page React de 359 lignes. L'onglet se pose donc **au-dessus** d'AirGuild, côté React, sans toucher `airguild.js`. Le lien « ouvrir une quête » de chaque manque (`/quetes?item=…`, `plan-farm/page.tsx:107`) doit suivre | `/coffre?onglet=farm` | 6 |
| `/discord` | Guilde ▾ (staff) | garder, rubrique Outils. Elle absorbe `/annonce` et `/events` | — | 2 |
| `/annonce` | Guilde ▾ (staff) | **retirer** : elle envoie la même commande `post_embed` que l'onglet Embed de `/discord` (`annonce/page.tsx:36-38`). Une chose à reporter dans `/discord` : `/annonce` présélectionne le salon dont le nom contient « annonce » (`annonce/page.tsx:27`). Retirer aussi son onglet de `SectionTabs.tsx:23` | `/discord`, sans paramètre : l'onglet Embed y est déjà celui par défaut (`discord/page.tsx:58`). `?onglet=publier` n'existera qu'au lot 6 | 2 |
| `/events` | Guilde ▾ (staff) | **fusionner dans `/discord`** (onglet Agenda) | `/discord?onglet=agenda` | 6 |
| `/gestion-worldboss` | Guilde ▾ (staff) | **fusionner dans `/worldboss`** (gestes staff dans la page) | `/worldboss` | 6 |
| `/demandes` | redirige vers `/messages` | garder, viser **la cible finale** sans chaîne | `/boutique?mode=commande` | 1 |
| `/requetes/[id]` | redirige vers `/messages?fil=req:<id>`. Le lien est posté sur Discord (`lib/ventes.ts:364`) et en base (`lib/messagerie.ts:212`) | garder **le fichier** (il change un segment d'adresse en paramètre) et viser la cible finale | `/boutique?mode=commande&fil=req:<id>` | 1 |
| `/dettes` | redirige vers `/boutique`, **derrière le garde de guilde** : un visiteur atterrit sur la page de connexion (`(shop)/layout.tsx:16`) | garder, **sortir du garde** | `/boutique` | 1 |
| `/astuces-guilde` | redirige vers `/builder/mecaniques`, derrière le garde de guilde | garder, sortir du garde | `/builder/mecaniques` (308) | 1 |
| `/collections` · `/competences` · `/oasis` | redirections publiques | garder | `/crafts` · `/classes` · `/donjons#oasis` (308) | — |

**Bilan.**
- **27 pages utiles au lieu de 35** : 9 retirées ou fusionnées, 1 créée.
- **16 adresses qui redirigent** : les 7 d'aujourd'hui et 9 nouvelles.
- **28 entrées déclarées dans `nav.ts`**, contre 33.
- Toutes les pages restent atteignables par un menu ou par le plan du site.

> **Pour qui codera — les redirections**
> - Regrouper les redirections dans `next.config.js`, avec `redirects()`. Aujourd'hui le fichier
>   ne contient que `{ reactStrictMode: true }`. Ces redirections passent **avant** le middleware
>   et les layouts, ce qui supprime le piège du garde qui s'exécute avant la redirection (décrit
>   dans `(vitrine)/collections/page.tsx:17-22`). Le garde de la **destination** s'applique
>   toujours : aucun droit ne s'élargit.
> - Next transmet la chaîne de requête à la destination, donc `?fil=` et `?membre=` suivent
>   seuls. **À vérifier au build** : une destination qui contient un `#` (`/#plan`,
>   `/#la-guilde`). À défaut, il faut une page-relais `redirect()` placée dans un groupe sans
>   garde.
> - **À vérifier aussi : la navigation côté client.** La documentation de Next signale que les
>   `redirects()` de `next.config.js` ne s'appliquent pas à `Link` ni à `router.push`, sauf si
>   un middleware correspond au chemin. Je ne l'ai pas éprouvé sur cette version (Next 15.5).
>   La règle sûre : **aucun lien interne ne doit compter sur une redirection**. Les
>   redirections servent les liens venus d'ailleurs (Discord, MP, favoris) et les
>   notifications, que la cloche ouvre par un `<a href>`, donc par un chargement complet
>   (`Alertes.tsx:175`).
> - `/requetes/[id]` **garde son fichier** (§5, tableau). Il ne fait donc pas partie de la liste
>   `next.config.js`, il change seulement de cible.
> - Les notifications **nouvelles** visent directement la cible finale. Les anciennes, déjà en
>   base, passent par la redirection. Le lien sert aussi de **clé anti-doublon** : on ne renvoie
>   pas « vente en jeu » si une notification au même `link` existe déjà
>   (`api/ventes/[id]/route.ts:331-333` et `:363-365`). Il faut donc changer la valeur à un seul
>   endroit, une constante, et accepter un doublon possible pendant la fenêtre `DELAI_EN_JEU`
>   qui suit le déploiement.
> - **Les liens codés en dur à repointer**, relevés par grep sur `src/`, `bot/` et `public/` :
>   - vers `/messages` → `/boutique?mode=commande` (lot 1) : `Alertes.tsx:62,85,101`,
>     `ProfilePanel.tsx:25`, `TicketCommande.tsx:167`, `profil/page.tsx:133`,
>     `quetes/page.tsx:680` et `RequetesClients.tsx:151` (`?fil=req:` à garder),
>     `api/bank-request/route.ts:59`, `api/bank-request/[id]/fil/route.ts:268,284`, les douze
>     occurrences de `api/ventes/[id]/route.ts` (`:139` à `:466`), `demandes/page.tsx:9` ;
>   - vers `/requetes/<id>` : `lib/ventes.ts:364` (posté sur Discord) et `lib/messagerie.ts:212` ;
>   - vers `/histoire` → `/` ou `/#la-guilde` : `not-found.tsx:14`, `error.tsx:21`,
>     `login/page.tsx:81` (lot 0), `PageAccueil.tsx:274` et `Shell.tsx:116` (lot 3) ;
>   - vers `/dashboard` : `PortesSite.tsx:201` (lot 3) ;
>   - vers `/sommaire` : `dashboard/portes.ts:196-201` (lot 1) ;
>   - vers `/annonce`, `/events`, `/gestion-worldboss` : `SectionTabs.tsx:21-23` et
>     `guildviewer/page.tsx:94` (lots 2 et 6) ;
>   - vers `/journal` : `statistiques/page.tsx:134`, `MesCommandes.tsx:384` (lot 6) ;
>   - vers `/plan-farm` : `guildviewer/page.tsx:94` (lot 6).
>
>   Restent valables et ne bougent pas : `/boutique` et `/boutique?mode=requetes`
>   (`lib/ventes.ts:409`, `mes-ventes/page.tsx:87,156`, `BandeauVente.tsx:335`,
>   `NomObjet.tsx:68`, `profil/page.tsx:132,174`), `/boutique?piece=1`
>   (`public/airbuilder/airbuilder.js:2236,2267`), et `/quetes` (`api/quetes/route.ts:131`,
>   `api/quetes/[id]/route.ts:54,91`). Le bot ne contient aucune adresse du site : ses messages
>   ne renvoient vers aucune page qui bouge.
> - Nettoyer ensuite `GUILD_PREFIXES` et `matcher` (`middleware.ts:35-36`, `:69-73`) des
>   adresses qui ne sont plus des pages, et `PAGE_BG` (`Shell.tsx:20-27`), qui garde même une
>   clé `/parametres` pour une page qui n'existe pas. Le middleware recopie les listes de rôles
>   (`:38-39`) : il faut les importer de `config/roles.ts`.
> - Après chaque lot, lancer un `next build` complet. Le serveur de dev ne compile que les routes
>   visitées (note `refonte-navigation`). Il vaut mieux rediriger que déplacer un fichier d'un
>   groupe à l'autre.

---

## 6. L'automatisation par le bot

**Le constat.**
- Le bot tourne déjà en continu (`bot/scheduler.ts:271-315`). Il relaie les candidatures, clôt
  les giveaways, consomme la file des commandes du site toutes les 12 s, recopie les rangs
  toutes les 10 min, annonce les events et rappelle les Chambres Secrètes.
- Le site n'a **aucun planificateur** à lui (audit-bot, « En bref » point 4) : tout ce qui
  part à heure fixe doit vivre dans le bot.
- **Rien n'est testable en local** : les variables Discord y sont vides (audit-bot, ligne 7). Il
  faut prévoir un essai en production avec un compte test.

Deux règles valent pour tout ce qui suit :
- une action qui doit laisser une trace (rôle, sanction, annonce programmée) passe par la file
  `BotCommand`, qui garde un verdict lisible. L'appel direct à Discord depuis le site
  (`src/lib/discord.ts`) reste réservé aux messages sans enjeu ;
- **ne jamais recopier un surnom Discord dans `User.username`** : le coffre est rangé par pseudo
  (`api/coffre/depot/route.ts:33-34`, `detenteursDe` dans `lib/ventes.ts:63-69`) ;
- **un nouveau type de commande ne s'ouvre jamais au formulaire générique.** `POST
  /api/admin/bot-command` accepte le `type` envoyé par le navigateur, dans la liste `ALLOWED`
  (`route.ts:5`). Y ajouter `candidature` permettrait à tout Officier d'envoyer
  `{ discordId: n'importe qui, status: "ACCEPTED" }`, et donc de faire poser un rang à
  n'importe qui. La commande est mise en file **côté serveur seulement**, par la route qui
  décide (comme la modération, `api/admin/moderation/route.ts:116-124`). Le bot relit ensuite la
  candidature en base (statut, `discordId`) au lieu de croire la charge utile ;
- **le site et le bot se déploient ensemble.** Les deux conteneurs tournent sur la même image
  (`docker-compose.prod.yml`, services `web` et `bot`, `vanguard-app:latest`). Une commande d'un
  type que le bot ne connaît pas passe en FAILED sans nouvelle tentative
  (`botcommands.ts:86`, « type de commande inconnu »). Un déploiement partiel la perdrait donc.

Classement par **temps gagné pour le staff**, du plus fort au plus faible :

| # | automatisation | ce qui existe | ce qui manque | effort | risque |
|---|---|---|---|---|---|
| 1 | **Recrue acceptée : rang, MP et embed à jour**, que la décision soit prise sur le site ou sur Discord | file `BotCommand` (`botcommands.ts:67-97`), `dm()`, `RANK_ROLES` (`config.ts:34-41`), `applyApplicationDecision` (`decisions.ts:142`). Le contrôle de hiérarchie qui convient est celui **du rôle à poser**, déjà écrit dans `boutonrole.ts:44` (`comparePositionTo`). `verifieHierarchie` (`moderation.ts:53-58`) ne convient pas : il compare le bot au membre visé, pas au rôle. Le site sait aussi poser un rôle tout seul (`attribuerRole`, `src/lib/discord.ts:87`), mais sans trace ni verdict : la file reste le bon canal. Le MP ne part que du bouton Discord (`bot/index.ts:95-105`) | un type de commande `candidature`, mis en file par `POST /api/admin/candidatures` (`route.ts:31-35` ne fait que la base et l'audit), **jamais** par le formulaire générique (règle ci-dessus) ; le verdict affiché sur `/candidatures` ; le choix du rôle (question 6). Aucune ligne du dépôt ne donne de rang : `roles.add` n'apparaît que dans `buttonroles.ts:32` et `reactionroles.ts:37`. **Et la relecture du rôle de session (lot 0)** : sans elle, la recrue reste RECRUE pour la barre et le middleware jusqu'à sa reconnexion (§1, point 6). À défaut, le MP doit lui dire de se reconnecter | M | moyen : le bot ne donne que des rôles placés sous le sien ; à vérifier après la refonte GENESIS. **Élargissement de droit** : un Officier qui accepte poserait un rang Discord, ce qu'il ne fait pas aujourd'hui (question 7) |
| 2 | **Départ du serveur répercuté** : rang RECRUE, accès fermé, trace dans le dossier, staff prévenu | `syncMemberRanks` (`scheduler.ts:250-269`), qui **saute** les absents (`:260`, `if (!m) continue`) ; `repercuteEnBase` (`moderation.ts:120`) ; intention `GuildMembers` déjà demandée (`bot/index.ts:25`) et active sur le portail, puisque le bot s'y connecte en production (note `feuille-route-vanguard`) | un écouteur `GuildMemberRemove` (absent du dépôt), la branche « absent » avec un seuil de sécurité (ne rien appliquer si plus d'environ 20 % des membres seraient touchés), une ligne `ActionMembre`. **Trois précisions** : appliquer la branche kick/ban de `repercuteEnBase` (`verifiedAt: null`, `discordRoles: []`, `moderation.ts:126`), et non la branche « guilde » (`:128`), sinon la personne garde l'accès « connecté », parce que `verifiedAt` suffit à `estVerifie` (`lib/access.ts:54`, `roles.ts:55`) ; ajouter `Partials.GuildMember` à `bot/index.ts:29`, sinon discord.js ne signale pas le départ d'un membre absent de son cache ; ne pas doubler l'`ActionMembre` quand le départ vient d'un kick ou d'un ban du bot lui-même | S-M | moyen : une lecture partielle rétrograderait des gens à tort, d'où le seuil |
| 3 | **Récap hebdo du staff sur Discord**, avec les mêmes chiffres que `/staff` | `remindApplications` comme gabarit (`scheduler.ts:94-126`) ; module partagé déjà pratiqué (`scheduler.ts:14`) | `src/lib/recap.ts` (le même que §4.1, avec ses contraintes d'import), une tâche du lundi, le salon `CHANNEL_STAFF`. **Sans le repli du gabarit** : `remindApplications` poste dans `CHANNELS.staff \|\| CHANNELS.candidatures` (`scheduler.ts:118`), et `#candidatures` reçoit l'annonce publique des candidatures (`api/application/route.ts:40`). Un récap qui nomme des absents et des inactifs n'a rien à y faire. `CHANNEL_STAFF` est déclaré « optionnel » (`bot/config.ts:18`) : s'il est vide, le récap ne part qu'en notification sur le site | M | faible, une fois le repli retiré |
| 4 | **Absences** : staff prévenu, retour annoncé, absents retirés des manques au rappel CS | `prevenirStaff` (`lib/ventes.ts:331`) ; les rappels CS (`scheduler.ts:51-90`). Aujourd'hui la page affirme « le staff est prévenu » (`absences/page.tsx:39`) alors que le POST ne prévient personne (`api/absences/route.ts:17-25`) | l'appel à la création, une tâche quotidienne « de retour aujourd'hui », un filtre dans le rappel. **`prevenirStaff` ne convient pas tel quel** : il envoie une notification **et un MP Discord** à chacun des quatre rangs staff (`lib/ventes.ts:309-323`, `:331-335`), donc un MP par absence et par bras droit. Une notification sur le site, ou un message dans `CHANNEL_STAFF`, suffit. **Deux chemins créent une absence** : la page et la commande `/absence` du bot (`bot/commands/absence.ts:40-47`, qui répond « en attente de validation par un officier »). Les deux doivent prévenir et tenir le même discours. Si la question 5 est tranchée pour la déclaration : créer en APPROVED dans les deux chemins, passer une fois en APPROVED les absences PENDING déjà en base, et retirer la priorité « absence(s) à valider » (`api/dashboard/route.ts:97-99`) | S-M | faible |
| 5 | **Santé du bot visible** sur `/staff` | `BotCommand.status` et `processedAt` (`schema.prisma:594-606`) | un battement de cœur (`Setting`) ou une alerte « commande en attente depuis plus d'une minute » | S | faible |
| 6 | **Rappels World Boss** (1 h, 30 min, 10 min) et bouton « Je viens » | les drapeaux `remind1hSent`, `remind30Sent`, `remind10Sent` et `channelId` (`schema.prisma:434-438`), **jamais lus** (grep vide dans `src/` et `bot/`) | une tâche par minute, le choix du salon dans la gestion du World Boss, le bouton | M | faible ; mentionner un rôle ou `@here`, pas `@everyone` |
| 7 | **Relance d'une commande sans preneur** après 24 h | `annoncerVente` poste une seule fois (`lib/ventes.ts:417`) | une tâche et un drapeau « relancée » | S | du bruit, d'où une seule relance |
| 8 | **Liste des inactifs dans le récap**, jamais de kick automatique | `lastSeenAt` (`schema.prisma:103`) ; le geste « retirer de la guilde » existe (`api/admin/moderation/route.ts`) | un seuil, à 30 jours | S (avec 3) | faux positifs : `lastSeenAt` mesure les visites du site, pas le jeu |
| 9 | **Annonces programmées**, avec mention | `post_embed` (`botcommands.ts:76`) | une colonne `BotCommand.runAt` nullable (sans risque pour `db push`), un champ date, une liste annulable, une fenêtre d'expiration | M | faible |
| 10 | **Un seul agenda** : les créneaux CS et GS deviennent des `GameEvent` ; le tableau `EVENTS` de `config.ts:115-119`, que plus rien ne lit, disparaît | `tickEvents` (`scheduler.ts:149-165`), `GameEvent` | la migration des créneaux, codés en dur (`scheduler.ts:300-313`), et un rappel « la veille » | L | moyen : les rappels CS sont en service |
| 11 | **Rôles de classe** tirés des persos du site, par ajout seulement | `CLASS_ROLES` (`config.ts:54-63`), qui ne sert qu'au panneau | un appel au moment de l'acceptation | S | faible |
| 12 | **Ménage** : `/aide` annonce des commandes de dettes disparues (`aide.ts:20,32`) ; `/coffre` lit `CoffreItem`, une table morte (`commands/coffre.ts:17,38`) ; les boutons `bank:`, `hold:` et `exch:` répondent encore et débitent `CoffreItem` (`decisions.ts:347-348`) ; les textes sont encore signés « Vanguard » (`bot/index.ts:100-103`) | — | les suppressions et les corrections de texte | S-M | fermer d'abord les éventuels anciens salons d'échange |

---

## 7. L'ordre de réalisation

Chaque lot se livre seul. `nav.ts`, `Shell.tsx` et `middleware.ts` passent par une seule main,
**après** la recoloration en cours. Toute page neuve est déclarée dans `nav.ts` dans le même
commit (note `methode-assets-et-nav`).

| lot | contenu | effort | ce que ça change pour les joueurs |
|---|---|---|---|
| **0. Le menu dit vrai** | Crafts public au menu ; « Retour à l'accueil » vers `/` (`login/page.tsx:81`, `not-found.tsx:14`, `error.tsx:21`) ; onglet World Boss caché aux visiteurs ; ✉ et raccourcis du profil filtrés pour un candidat ; « réserver sa part » réparé (le panneau envoie un POST, `RequetesClients.tsx:59-61`, alors que la route n'accepte que PATCH, `api/quetes/[id]/route.ts:22`) ; priorités dirigées vers `/guildviewer` ; coffre de l'accueil lu au vrai stock ; comptes limités à la guilde ; « le staff est prévenu » rendu vrai, sur les deux chemins (page et `/absence`) ; **rôle de session relu en base** (`lib/auth.ts`, §2) | S-M | plus aucun lien qui mène à un refus. Les chiffres deviennent justes, réserver sa part depuis la Boutique marche, et un rang changé sur Discord se voit sans se reconnecter |
| **0 bis. Réserve Vanguard de l'AirGuild** | fermer côté serveur ce que les 32 appels de `canEdit()` ne gardent que dans le navigateur (§4.2, Outils) ; essai avec un compte Officier | M | aucun changement visible ; un Officier ne peut plus réécrire le catalogue ni l'attribution des coffres par un appel direct |
| **1. La barre courte** | nouvelle `nav.ts`, avec `acces: "guild"` explicite sur chaque lien réservé ; `espacesPour()` ; Guilde ▾ ; Bras droits ▾ (vers le hub `/guildviewer` en attendant) ; plan du site en bas de `/` ; redirections dans `next.config.js` (`/sommaire`, `/messages`, `/demandes`, `/dettes`, `/astuces-guilde`) et nouvelle cible pour la page `/requetes/[id]` ; les liens codés en dur repointés (§5) ; la Boutique qui suit `?mode=` et `?fil=` ; bouton « Tout » retiré ; variable `DEV_ROLE` pour voir les trois barres en local | M | **8 entrées → 4.** Quête Guilde et Boutique sont à un survol, sous Guilde. « Toutes les pages » disparaît |
| **2. L'espace bras droits** | `/staff`, `/api/admin/a-traiter`, `src/lib/recap.ts`, onglets générés depuis `nav.ts`, `lastSeenAt` dans la liste des membres, vue Absences et paramètres `?vue=`, `?filtre=`, `?dossier=` du GuildViewer, champs staff retirés de `/api/dashboard` **et** bloc « Priorités » de `/dashboard` branché sur `a-traiter`, `/annonce` redirigée vers `/discord` | M | les bras droits ont **une page « à traiter » au lieu de sept**. Rien ne change pour les membres |
| **3. L'accueil unique** | `/` à trois visages, `/api/accueil`, `/dashboard` → `/`, `/histoire` → `/#la-guilde`, « Accueil de la guilde » retiré du menu, appel à rejoindre fusionné, hero sans bouton de connexion pour qui est connecté, blocs repliés ouverts par leur ancre, réglages Vanguard migrés (4 clés), `PAGE_BG` nettoyé | M-L | après la connexion, on arrive sur **son** accueil. Il n'y a plus qu'une page à retenir |
| **4. Le bot fait le répétitif** | automatisations 1, 2, 4 et 5 | M-L | une recrue acceptée reçoit son rang et un MP sans attendre ; un départ ferme l'accès ; le staff apprend une absence au moment où elle est déclarée |
| **5. Récap et rappels** | automatisations 3, 6, 7 et 8 ; une route membre `GET /api/agenda` (`apiGuild`), parce que les `GameEvent` ne se lisent que par une route staff (`api/admin/events/route.ts:10-12`), pour le « prochain rendez-vous » du bandeau | M-L | les rappels World Boss arrivent sur Discord ; le staff reçoit un résumé le lundi |
| **6. Fusions staff et ménage du bot** | `/journal` → `/statistiques`, `/plan-farm` → `/coffre`, `/events` → `/discord`, `/gestion-worldboss` → `/worldboss`, chacune avec le paramètre d'onglet que sa redirection vise ; automatisation 12 | M-L | le menu des bras droits passe de 11 à 7 lignes ; `/aide` sur Discord dit enfin vrai |
| 7. Optionnel | automatisations 9, 10 et 11 | L | annonces à l'heure dite ; horaire du Guild Siege réglable sans toucher au code |

Les lots 4 à 6 touchent au bot. Chacun se termine par un **essai en production** avec un compte
test, et un rôle de test placé tout en bas de la hiérarchie (audit-bot, §7). La moitié « site »
de chaque automatisation se vérifie pourtant en local : mise en file d'une `BotCommand`,
affichage de son verdict. Seule l'exécution par Discord demande la production.

**Pourquoi les efforts ont été relevés** (lots 0, 1, 4, 5 et 6, voir §9). Le lot 0 compte dix
corrections réparties sur une douzaine de fichiers, bot compris. Le lot 1 repointe près de
trente liens codés en dur, dont douze dans `api/ventes/[id]/route.ts`, en plus de `nav.ts` et de
`Shell.tsx`. Les lots 4 à 6 additionnent chacun une automatisation M et
plusieurs S, ou quatre fusions de pages. Ces estimations restent des ordres de grandeur, pas des
mesures.

---

## 8. Les questions à trancher

1. **Les « bras droits », ce sont bien les 4 rangs staff** (Direction, Vanguard, Général,
   Officier) ?
   **Je recommande oui.** C'est la règle actuelle du site (`roles.ts:19`) et du bot
   (`bot/lib/permissions.ts:26`). Rien ne s'élargit, et les gestes sensibles restent réservés à
   Vanguard et plus. L'autre option, Général et Officier seuls comme sur le badge
   (`ProfilePanel.tsx:14-15`), retirerait l'espace à la Direction et à Vanguard.
2. **Le bouton « Tout » part-il avec « Toutes les pages » ?**
   **Je recommande oui.** Son titre est littéralement « Toutes les pages du site »
   (`PanneauTout.tsx:38-39`). Avec 4 ou 5 entrées, des menus dépliés sur téléphone et le plan du
   site en bas de l'accueil, il ne sert plus qu'à doubler.
3. **`/histoire` devient-elle la section « La guilde » de l'accueil ?**
   **Je recommande oui.** Elle porte le même hero que `/`. Son texte est conservé tel quel et son
   adresse redirige pour toujours. L'autre option, garder une page à part, ajoute une ligne au
   menu Guilde et laisse deux appels « Postuler ».
4. **Que voit un visiteur ?**
   **Je recommande :**
   - la Boutique en vitrine dans son menu Guilde. C'est ta décision de vitrine, déjà en place
     (`middleware.ts:26-29`) ;
   - **ouvrir Les mécaniques au public.** C'est un lexique du jeu, la page n'appelle aucune route
     de membre : ses imports (`builder/mecaniques/page.tsx:1-18`) ne lisent que des fichiers du
     dépôt, et son seul `fetch` vise `/wiki/collections.json`, un fichier public
     (`components/mecaniques/SectionsBuild.tsx:32`). Mais c'est un élargissement de
     droit : il te revient. Il se fait en déplaçant la page de groupe (§5). Si c'est non,
     l'entrée sort du menu des visiteurs ;
   - les Crafts dans le menu d'un visiteur relèvent de la même décision de vitrine que la
     Boutique : la page a été refaite pour les visiteurs, colonne « éteintes » retirée et
     bandeau d'invitation (`(vitrine)/crafts/page.tsx:152-175`). Le menu est le seul à dire
     encore « guilde » (`nav.ts:163-166`).
5. **Une absence se valide-t-elle, ou se déclare-t-elle seulement ?** La question est ouverte
   depuis le 2026-08-10.
   **Je recommande la déclaration.** L'absence est acceptée à sa création, le staff est prévenu
   et les bras droits voient la liste. Aujourd'hui, rien ne valide, et le compteur « absents en
   ce moment » vaut donc toujours 0 (`api/dashboard/route.ts:65-67`). Si c'est oui, les
   absences déjà en base, toutes PENDING, passent une fois en APPROVED. Le texte du bot
   « en attente de validation par un officier » (`bot/commands/absence.ts:47`) change aussi.
6. **Quel rôle Discord le bot donne-t-il à une recrue acceptée ?**
   **Je recommande Guard**, le plus bas rang connu du bot (`bot/config.ts:34-41`), et ses rôles
   de classe déduits de sa candidature, par ajout seulement. L'autre option, un rôle « Recrue »
   à créer sur le serveur, ajoute une étape pour le même accès.
7. **Un Officier qui accepte une candidature doit-il poser le rang tout seul ?** Aujourd'hui,
   accepter ne pose aucun rôle Discord, ni sur le site ni par le bouton du bot : le rang se
   donne à la main, sur Discord. Qui en a le droit sur le serveur, le dépôt ne le dit pas. Avec
   l'automatisation 1, n'importe lequel des quatre rangs staff le poserait d'un clic, sur le
   site comme sur le bouton Discord (`isStaff`, `bot/lib/permissions.ts:26-30`).
   **Je recommande oui**, puisque c'est tout l'intérêt de l'automatisation, avec le nom de
   l'auteur dans le MP et dans l'audit (`audit()`, `api/admin/candidatures/route.ts:35`).
   L'autre option, réserver le rang automatique à Vanguard et plus comme la modération,
   garderait un geste manuel pour les Officiers.

**Ce que cette proposition ne tranche pas**, à reprendre plus tard :
- un seul formulaire « Demander un objet » au lieu de deux (`quetes/page.tsx:124` contre
  `ObjetSurMesure.tsx:375`) ;
- un seul message par candidature, `#candidatures` ou `#decision`
  (`api/application/route.ts:41`) ;
- l'horaire du Guild Siege ;
- « kick » et « retirer de la guilde » : deux gestes ou un seul ;
- la rémunération des requêtes (note `chantier-requetes-objets`).

---

## 9. Contre-examen

*Le 2026-10-20. J'ai relu la proposition contre les quatre audits et contre le code, en
cherchant ce qu'elle casse ou oublie. Méthode : lecture des fichiers cités, et grep de chaque
adresse retirée dans `src/`, `bot/`, `public/airguild/` et `public/airbuilder/`. Aucun fichier de
`src/` ni de `bot/` n'a été modifié. Les corrections ci-dessous sont déjà intégrées plus haut.*

### 9.1 Ce qui a été corrigé, et pourquoi

**Ce qui cassait ou rendait une promesse fausse**

1. **Le rôle de la session est figé à la connexion. Ajouté en prérequis au lot 0.** Le callback
   `jwt` n'écrit `token.role` que lorsque `account` existe (`lib/auth.ts:54-107`). Le middleware
   (`middleware.ts:51`) et la barre (`Shell.tsx:33`) lisent ce rôle, alors que les pages relisent
   la base. Sans correction, l'automatisation 1 ne tient pas sa promesse « sans attendre » : la
   recrue reste refusée par le middleware jusqu'à sa reconnexion, jusqu'à 30 jours plus tard
   (`auth.ts:11`). De même, un officier promu ne pourrait pas ouvrir `/staff`, et l'accueil
   montrerait la vue bras droit sous une barre de membre.
2. **`chemin()` : la consigne était inversée.** `usePathname()` ne rend jamais le `#`, donc
   `/#la-guilde` n'est jamais actif tel quel. Couper le `#` le rendrait égal à `/` et allumerait
   « La guilde » et tout l'espace Guilde sur l'accueil (`Shell.tsx:37-38`, `:74`).
3. **L'espace Guilde en `public` aurait montré des pages réservées aux visiteurs.** Un lien sans
   `acces` hérite de celui de son espace (`Shell.tsx:44`). « Chambres Secrètes » et « Mes
   absences » n'en portent pas (`nav.ts:234-235`). Le marquage `acces: "guild"` est maintenant
   exigé en toutes lettres.
4. **Le lot 1 laissait deux trous.** Retirer « Accueil de la guilde » au lot 1 laissait
   `/dashboard` vivante mais hors de `nav.ts` jusqu'au lot 3. Faire pointer « La guilde et ses
   règles » vers `/#la-guilde` visait une section qui n'existe qu'au lot 3. Les deux sont
   décalés au lot 3, et le lien vise `/histoire` d'ici là.
5. **Les liens codés en dur étaient sous-comptés.** Pour `/messages`, la proposition n'en citait
   que deux : l'enveloppe et le profil. Le grep en trouve près de trente, dont `Alertes.tsx:62,85`,
   `TicketCommande.tsx:167`, `profil/page.tsx:133`, `quetes/page.tsx:680`,
   `RequetesClients.tsx:151`, deux routes de notification et douze occurrences dans
   `api/ventes/[id]/route.ts`. L'inventaire complet, par adresse et par lot, est au §5.
6. **La Boutique ne suit pas l'adresse.** `?mode=` et `?fil=` ne sont lus qu'au montage
   (`EcranEconomie.tsx:171`, `MesCommandes.tsx:192-196`), et `Shell.tsx:122` ne remonte la page
   que si le chemin change. Faire pointer ✉ vers `/boutique?mode=commande` n'ouvrirait donc rien
   pour un membre déjà sur la Boutique. Ajouté au lot 1.
7. **`/annonce` visait un paramètre qui n'existe pas.** `/discord` ne lit aucun `?onglet=`, mais
   son onglet par défaut est déjà Embed (`discord/page.tsx:58`). La cible devient `/discord`. La
   présélection du salon « annonce » (`annonce/page.tsx:27`) est à reporter, et l'onglet de
   `SectionTabs.tsx:23` à retirer. Plus généralement, chaque `?onglet=` ou `?vue=` visé par une
   redirection est créé dans le même lot que celle-ci.
8. **Le lot 2 vidait le bloc « Priorités » de `/dashboard`.** C'est le seul lecteur de
   `priorities` (`dashboard/page.tsx:241`), et la page vit jusqu'au lot 3. Ce bloc est désormais
   branché sur `/api/admin/a-traiter` dans le même lot.
9. **Les comptes des tuiles étaient attribués à des routes qui ne les ont pas.** `/api/dashboard`
   ne compte ni les quêtes, ni les présences CS, ni les passages de World Boss
   (`route.ts:105-114`). Corrigé dans le tableau du §3.1. Comme un membre déclencherait ainsi six
   lectures par affichage, je recommande une route unique `/api/accueil`.
10. **Les blocs repliés auraient caché leur propre ancre.** « La guilde et ses règles » et le plan
    du site sont repliés pour un membre. Le lien du menu et l'ancien `/sommaire` auraient donc
    abouti sur un titre fermé. Ils s'ouvrent maintenant quand l'adresse les vise.
11. **La réserve Vanguard de l'AirGuild n'est pas une petite correction.** Elle repose sur 32
    appels de `canEdit()` dans `airguild.js`, et sur un `PUT` qui remplace le blob entier
    (`api/admin/airguild/route.ts:72-88`). Elle sort du lot 0 (S) et devient le lot 0 bis (M).

**Ce qui élargissait un droit ou exposait une donnée**

12. **« La proposition n'élargit aucun droit » était trop fort.** L'automatisation 1 donne à un
    Officier le pouvoir de poser un rang Discord. C'est la nouvelle question 7.
13. **Le type de commande `candidature` ne doit jamais entrer dans `ALLOWED`**
    (`api/admin/bot-command/route.ts:5`). Sinon, n'importe quel Officier pourrait faire poser un
    rang à n'importe qui. La mise en file se fait côté serveur, et le bot relit la candidature en
    base. C'est une nouvelle règle au §6.
14. **Le récap staff aurait pu partir dans un salon public.** Le gabarit retenu poste dans
    `CHANNELS.staff || CHANNELS.candidatures` (`scheduler.ts:118`). Or `#candidatures` reçoit
    l'annonce publique des candidatures (`api/application/route.ts:40`), et `CHANNEL_STAFF` est
    optionnel (`bot/config.ts:18`). Le repli est retiré.
15. **Un membre parti du serveur aurait gardé son accès « connecté ».** La branche « guilde » de
    `repercuteEnBase` ne remet pas `verifiedAt` à zéro (`moderation.ts:128`), et `verifiedAt`
    suffit à `estVerifie` (`lib/access.ts:54`, `roles.ts:55`). La correction applique la branche
    kick/ban (`:126`).

**Ce qui était impossible ou bruyant tel quel, côté bot**

16. **Le bon contrôle de hiérarchie est celui du rôle à poser.** Il existe déjà dans
    `boutonrole.ts:44`. `verifieHierarchie` (`moderation.ts:53-58`) compare le bot au membre
    visé, pas au rôle. Le §6 rappelle aussi que le site sait poser un rôle seul (`attribuerRole`,
    `discord.ts:87`), et que le site et le bot se déploient ensemble : un type de commande
    inconnu échoue sans nouvelle tentative (`botcommands.ts:86`).
17. **Un départ peut ne jamais être signalé.** Sans `Partials.GuildMember`, absent de
    `bot/index.ts:29`, discord.js ne signale pas le départ d'un membre qu'il n'a pas en cache. La
    synchro des 10 minutes reste le filet. Un kick ou un ban du bot ne doit pas produire une
    deuxième trace « départ ».
18. **`prevenirStaff` aurait envoyé un MP à chaque bras droit pour chaque absence.** Il double
    chaque notification d'un MP (`lib/ventes.ts:309-323`, `:331-335`). Autres manques corrigés :
    le chemin du bot `/absence` (`bot/commands/absence.ts:40-47`), qui crée aussi des absences,
    et le passage en APPROVED des absences déjà en base si la question 5 est tranchée pour la
    déclaration. L'effort passe de S à S-M.
19. **`recap.ts` a des contraintes d'import.** Il tourne aussi dans le bot, sous `tsx` : ni
    `next/*`, ni `next-auth`, ni `@/lib/access`. C'est ajouté au §4.1.

**Ce qui était oublié ou incohérent**

20. **Le « dossier du membre » n'a pas d'adresse.** C'est un état de page
    (`guildviewer/page.tsx:39,204`). La file ne pouvait donc pas y mener. Il faut un
    `?dossier=`, avec `?vue=absences` et `?filtre=inactifs`. Le hub de `guildviewer/page.tsx:92-97`
    est aussi à retirer ou à repointer.
21. **`Grandeurs` partait sur `/staff` au §3 mais n'y figurait pas au §4.** La correction dit que
    les 4 compteurs le remplacent, et nomme la barre perdue : « Candidatures traitées ».
22. **Les réglages Vanguard ne se migrent pas en bloc.** Quatre clés seulement survivent. Et
    `GET /api/reglages` exige la guilde (`route.ts:33-35`) : la vue visiteur ne se règle pas.
    `comptesPortes()` a aussi besoin d'un cache (`chiffres.ts:113`), pas seulement
    `chiffresAccueil()`.
23. **Les trois vues ne se testent pas en local.** `DEV_ALL` fait de tout le monde un DIRECTION
    (`lib/access.ts:14-20`, `Shell.tsx:32-35`, `middleware.ts:42`). Une variable `DEV_ROLE` est
    ajoutée au lot 1.
24. **Petits manques de mise en œuvre :**
    - « Postuler » à droite exige un rendu à part, parce que la barre rend les `HORS_ESPACES` en
      premier (`Shell.tsx:65-71`) ;
    - ouvrir les Mécaniques veut dire déplacer la page de groupe, et non la rediriger ;
    - le plan de farm se pose en onglet React **au-dessus** d'AirGuild, avec son lien
      `/quetes?item=` (`plan-farm/page.tsx:107`) ;
    - les deux liens vers `/journal?membre=` sont à repointer ;
    - la pastille « bot en ligne » dépend du lot 4 ;
    - au-delà de 1 200 px, les déroulants ne s'ouvrent qu'au survol (`globals.css:227`) : sur
      grande tablette tactile, l'accès à la Boutique par la barre est à vérifier sur un appareil ;
    - les Crafts au menu d'un visiteur relèvent de la même décision de vitrine que la Boutique
      (question 4) ;
    - le proxy du VPS (Nginx Proxy Manager) est nommé dans le point « cache partagé ».
25. **Efforts relevés.** Le lot 0 passe de S à S-M, le lot 1 de S-M à M, et les lots 4, 5 et 6
    de M à M-L. La raison est donnée sous le tableau du §7.

### 9.2 Ce que j'ai revérifié et qui tient

- **Les comptes de pages.** 48 fichiers `page.tsx`, dont 7 redirections, 5 fiches de détail et
  la connexion, soit 35 pages utiles. Après la refonte : 9 retirées ou fusionnées et 1 créée,
  soit 27. Le relevé de `nav.ts` donne bien 33 entrées aujourd'hui et 28 visées.
- **Aucune page ne devient injoignable**, à condition que chaque page encore vivante reste
  déclarée dans `nav.ts`. C'est la correction 4. Les fiches de détail gardent leurs liens
  d'origine.
- **Les quatre défauts de données relevés existent.**
  - Le coffre est lu dans `CoffreItem` (`api/dashboard/route.ts:34`).
  - Les comptes ne filtrent aucun rôle (`:23-32`).
  - Aucune ligne n'écrit `APPROVED` sur une absence : le grep ne trouve que des lectures.
  - « Réserver sa part » envoie un POST (`RequetesClients.tsx:58-59`), alors que la route
    n'exporte que PATCH (`api/quetes/[id]/route.ts:22`).
- **`apiAdmin` n'existe pas** : le grep sur `src/` et `bot/` est vide.
- **Le canal site → bot existe**, c'est la file `BotCommand`, relevée toutes les 12 s
  (`scheduler.ts:294`). L'intention `GuildMembers` est demandée (`bot/index.ts:25`) et active,
  puisque le bot se connecte en production.
- **Le bot ne contient aucune adresse du site** : il n'a rien à repointer.
- **Une note est datée.** `/api/wiki` est désormais ouverte (`api/wiki/route.ts:14`), alors que
  la note `acces-pages-desaccords` la disait gardée. La recherche du bandeau marche donc pour un
  visiteur.

### 9.3 Ce qui reste à vérifier hors du dépôt

- **Le cache de Nginx Proxy Manager** sur le VPS : est-ce qu'il sert `/` à plusieurs personnes ?
- **Les redirections de `next.config.js` au build** : une destination qui contient un `#`, et le
  comportement d'un `Link` qui vise une adresse redirigée.
- **La place du rôle du bot** dans la hiérarchie du serveur après la refonte GENESIS.
- **Les variables de production** : `CHANNEL_STAFF`, `ROLE_GUARD` et `ROLE_CLASSE_*` sont-elles
  renseignées ? Elles sont vides en local (`.env`).
- **D'anciens salons d'échange** dont les boutons débitent encore `CoffreItem`
  (`decisions.ts:347-348`) existent-ils encore ?
