# Information Guilde, accueil public, tableau de bord tout-en-un

*Demande de Maxime du 2026-10-21, et ses réponses aux questions du même jour. Ce document
PRIME sur PROPOSITION.md, BILAN-LOTS-0-3.md et SPEC-CHAMBRES-RECENSEMENT.md là où ils se
contredisent.*

## La demande, mot pour mot

> Sur la page Accueil je veux une page uniquement pour le public mais par contre les
> informations internes à la guilde les retrouver sur la page Tableau de bord pour les bras
> droits et les faire figurer dans la page « La guilde & ses règles », la renommer
> « Information Guilde » pour avoir un œil pour tous les membres de la guilde et connaître
> les personnes (DiscordID et personnages de la personne) pour apprendre à se connaître ou
> savoir qui est qui…
> J'aimerais que le système « Information Guilde » comme le système « Membres & Builds » soit
> accessible pour tous les joueurs de la guilde pour savoir qui est qui (sans y intégrer le
> build et informations internes des bras droits). Pour avoir un bon récapitulatif sur cette
> page. Et la page aussi suivi de la guilde l'avoir aussi dedans tout en un pour éviter les
> multiples pages et trouver les informations nécessaires sur un même endroit.
> Avoir la possibilité de cacher un membre ou si jamais la possibilité de supprimer un membre
> en cas si la personne n'est plus présente en jeu dans « Dossier » → « Décisions » ; lorsque
> le membre est retiré de la guilde il ne faut plus qu'il figure, et faire une demande de
> confirmation au cas où.
> Avoir la possibilité aussi de rankup un membre s'il fait des efforts, la possibilité de
> demote (descendre de grade) et un espace notation pour savoir s'il y a eu des problèmes ou
> autre (interne).
> Enlever le bouton « Quêtes » devenu inutile.
> En ce qui concerne la page « Membres & builds » : les builds sont accessibles pour les bras
> droits, mais il est possible de partager le build du membre si le membre le souhaite
> (intervention par lui-même en partageant depuis l'AirBuilder).

**Réponses du 2026-10-21** : « Quêtes » = TOUT Quête Guilde ; promouvoir / rétrograder /
cacher / retirer = les **4 rangs bras droits** ; notation interne = les **4 rangs bras
droits** (lecture et écriture).

## 1. L'accueil `/` devient PUBLIC et NEUTRE

*Complément de Maxime (2026-10-21, 2e message) : « Sur la page Accueil je ne veux pas de
registre de recherche ; [le bandeau « Serveur privé Airborn… GENESIS · Prochain rendez-vous
Chambres Secrètes mercredi 21 h · Régler cette page »] c'est une information interne (astuces +
information de la guilde), je veux quelque chose de neutre. Pareil pour les modules À traiter,
À faire. Cependant on peut faire remonter les informations en premier comme « Mes
personnages » pour pouvoir accéder plus rapidement à l'AirBuilder et corriger le stuff si
nécessaire. »*

- Une vue NEUTRE, la vitrine (hero, ce que le site fait, les huit classes, la présentation
  publique de la guilde, rejoindre, plan du site). **Aucune barre de recherche** (ni le champ
  du wiki, ni le bandeau du jeu avec sa recherche), **aucun « prochain rendez-vous »**, aucun
  « Régler cette page », **aucun « À traiter » ni « À faire »**, aucune donnée interne
  (« Mes outils », « Les classes de la guilde »…).
- **Seule exception : « Mes personnages » EN PREMIER** pour une personne connectée qui a des
  persos (membre ou Friend, §9) : ses persos et leurs stuffs, chacun avec « Ouvrir dans
  l'AirBuilder » (lien profond vers CE perso et CE stuff, §8), et le témoin « mesures
  manquantes / à remesurer ». C'est une donnée PERSONNELLE, lue côté client par une route
  gardée — jamais dans le HTML servi.
- Le composant membre de l'accueil (`AccueilMembre`) disparaît ; ses blocs utiles partent
  vers Information Guilde (membres) et vers le Tableau de bord (bras droits).
- Après la connexion, un membre de la guilde arrive sur **Information Guilde** ; un candidat
  ou un visiteur reste sur `/`.

## 2. « Information Guilde » — la page tout-en-un des MEMBRES

- Renomme l'entrée « La guilde et ses règles » du menu Guilde en **« Information Guilde »**.
  Nouvelle page à part (adresse proposée : `/guilde`), gardée par la guilde (`requireGuild` /
  `apiGuild`), **première ligne du menu Guilde**. Pour un VISITEUR, le libellé « Guilde » de la
  barre mène toujours à la présentation publique de la guilde sur `/` (`/#la-guilde`).
- Contenu, dans l'ordre (récapitulatif d'abord) :
  1. **Récap** : nombre de membres, classes représentées, prochain rendez-vous (Chambres
     Secrètes), absents aujourd'hui (les NOMS seulement, jamais le motif), stuffs mesurés.
  2. **Qui est qui** — l'annuaire : pour chaque membre de la guilde (rangs de guilde
     seulement, membres CACHÉS exclus) : pseudo, rang, **Discord** (nom d'utilisateur + ID
     copiable d'un clic), ses **personnages** (nom, classe, niveau, prestige, principal), ses
     chiffres déclarés (dégâts / PV du recensement, avec date et « à remesurer »), et un lien
     « Voir le build » **seulement si le membre l'a partagé** (§5). Recherche par pseudo,
     perso ou classe ; filtre par classe et par rang.
  3. **Les classes de la guilde** (répartition, persos par classe).
  4. **Recensement** (dégâts & PV, classement par classe et par rôle) : c'est la page
     `/recensement` du lot 1 des Chambres, qui devient une SECTION d'ici ; `/recensement`
     redirige vers `/guilde#recensement`.
  5. **Le suivi visible des membres** : qui a mesuré ses stuffs, qui doit remesurer (pas de
     note interne, pas de dossier, pas de dernière visite).
  6. **La guilde** : l'histoire, « Présents, ça veut dire… », les objectifs, les règles (le
     contenu de l'ancienne `/histoire`, affiché en entier).
- Ce que la page ne montre JAMAIS : les builds non partagés, les notes internes, les gestes
  de modération, les dossiers, les candidatures, la dernière visite, les motifs d'absence.
- Une seule route de lecture (`GET /api/guilde`, `apiGuild`) qui ne renvoie que ce qui
  s'affiche.

## 3. Le Tableau de bord des bras droits — TOUT-EN-UN

- `/staff` regroupe : la file « À traiter », les compteurs, **Membres & builds** (la liste du
  GuildViewer avec builds et dossiers), le **Suivi** complet (stuff, mesures, classes, dégâts
  et PV, état de la guilde — l'actuelle page `/suivi`), les candidatures, les absences et les
  outils. Une page, des sections ou des onglets ; plus de pages éclatées.
- `/suivi` redirige vers `/staff` (section Suivi). `/guildviewer` reste joignable (liens de
  notifications `?dossier=`) mais son contenu est celui de la section Membres de `/staff`, ou
  il redirige vers elle en gardant `?dossier=`, `?vue=` et `?filtre=`.

## 4. Le dossier d'un membre — Décisions et Notes

Gardes : les **4 rangs bras droits** (DIRECTION, VANGUARD, GENERAL, OFFICIER) pour les gestes
NOUVEAUX ci-dessous. Les gestes existants (kick, ban…) gardent leur garde actuelle (Vanguard
et plus). Règle de hiérarchie : on n'agit que sur un rang **strictement inférieur** au sien,
et on ne promeut pas au-delà du rang juste sous le sien (DIRECTION au-dessus de tout).
Chaque geste : **motif obligatoire**, **confirmation** (« oui » simple, comme les gestes
existants), trace `ActionMembre`, verdict du bot affiché.

- **Promouvoir / Rétrograder** : choix du rang cible parmi `ROLE_RANK`. Le rang vient des
  rôles Discord et le bot le recalcule toutes les 10 min (`syncMemberRanks`) : le changement
  passe donc par la file `BotCommand` (type de modération côté serveur, JAMAIS par le
  formulaire générique), le bot retire l'ancien rôle de rang et pose le nouveau, avec le
  contrôle de hiérarchie du RÔLE à poser (`comparePositionTo`, comme `boutonrole.ts`).
- **Cacher** : le membre disparaît d'Information Guilde (et des listes de membres hors
  staff) sans rien changer sur Discord. Réversible (« Montrer de nouveau »). Colonne nullable
  ou avec défaut sur `User`.
- **Retirer de la guilde** (n'est plus en jeu) : le geste existant « retirer de la guilde »
  (rangs retirés, reste sur Discord), ouvert aux 4 rangs avec la règle de hiérarchie ; après
  lui, le membre **ne figure plus nulle part** côté guilde (Information Guilde, recensement,
  compo, classes, compteurs). Confirmation obligatoire.
- **Notes internes** : nouvel onglet « Notes » du dossier. Notes datées et signées (auteur),
  avec un ton (problème / effort / neutre), lues et écrites par les 4 rangs bras droits,
  JAMAIS montrées au membre ni ailleurs. Nouveau modèle Prisma (rattaché au `discordId` comme
  `ActionMembre`, pour survivre à un compte effacé).
- **L'onglet « Quêtes » du dossier disparaît.**

## 5. Les builds : bras droits, ou partagés par le membre

- Les builds restent visibles des seuls bras droits (Membres & builds).
- Dans l'AirBuilder, le membre peut **partager son build avec la guilde** lui-même : une
  case par personnage (ou par stuff — le plus simple qui marche avec le partage existant
  `/build/[shareId]`), « Visible dans Information Guilde ». Alors seulement, Information
  Guilde montre « Voir le build » pour ce perso. Le membre peut retirer le partage.

## 6. Quête Guilde disparaît ENTIÈREMENT

- La page `/quetes`, sa route, la tuile, la section « La guilde cherche », l'onglet du
  dossier, l'entrée de `nav.ts`, les notifications de quête à venir. `/quetes` redirige vers
  `/guilde`. **Données gardées en base** (aucun modèle ni colonne retiré).
- Vérifier ce qui, dans le bot, parle de quêtes, et le retirer sans casser le reste.

## 7. Contraintes

- Toute page vivante est déclarée dans `nav.ts` ; toute adresse retirée redirige.
- Schéma Prisma : AJOUTS seulement (colonnes nullables / avec défaut, modèles neufs).
- Rien de membre dans le HTML de `/`. Rien d'interne dans Information Guilde.
- Charte GENESIS, contrôles copiés des voisins.

## 8. « Mes personnages » = le reflet de l'AirBuilder, rien d'autre

*Maxime : « J'aimerais que l'onglet Mes personnages soit bien relié aux stuffs car je crois
qu'il y a une erreur concernant ça ; les modifications se feront uniquement via l'AirBuilder
(suppression etc… tout passe par l'AirBuilder). »*

- **Le défaut, constaté** : `src/app/(public)/personnages/page.tsx` crée, modifie, rend
  principal et supprime des persos directement dans la table `Character` (`POST
  /api/characters`, `PATCH` et `DELETE /api/characters/[id]`). Or `POST /api/characters/sync`
  efface puis recrée TOUS les persos du compte depuis l'état de l'AirBuilder à chaque
  changement : tout ce que fait la page est défait au changement suivant du builder, et un
  perso créé sur la page n'existe pas dans le builder.
- **La règle** : l'AirBuilder est la SEULE source. La page « Mes personnages » devient une
  VUE en lecture : chaque perso (classe, niveau, prestige, principal) et chacun de ses stuffs
  (rôle, état des mesures), avec « Ouvrir dans l'AirBuilder » vers ce perso et ce stuff. Plus
  aucun bouton créer / modifier / supprimer / rendre principal sur la page : ces gestes
  existent (ou sont ajoutés s'ils manquent : rendre principal, supprimer avec confirmation)
  DANS l'AirBuilder.
- **Lien profond** : l'AirBuilder sait s'ouvrir sur un perso et un stuff donnés depuis
  l'adresse (ex. `/builder?perso=<nom>&stuff=<index>`), sans rien écrire.
- Les routes d'écriture directe (`POST /api/characters`, `PATCH`/`DELETE
  /api/characters/[id]`, `api/characters/[id]/gear`) sont retirées si plus rien ne les
  appelle (grep src/ bot/ public/), ou fermées.

## 9. L'accès « Friend »

*Maxime : « J'aimerais donner un accès pour les personnes ayant un rôle spécifique : Friend —
Discord (RoleID) : 1550844483095232712 — qui permet d'avoir accès à la section Astuces et
AirBuilder, c'est tout ; avoir un espace paramétrable si jamais on souhaite changer. »*

- Une personne connectée qui porte ce rôle Discord (sans être de la guilde) accède à TOUT ce
  que contiennent les espaces **Astuces** et **AirBuilder** de `nav.ts`, comme un membre (pages
  ET routes : objets, recherche, sauvegarde du builder, « Mes personnages »…) — et à RIEN
  d'autre (ni Guilde, ni Information Guilde, ni Chambres, ni Bras droits).
- **Paramétrable dans l'espace Bras droits** (rubrique Outils, page de paramétrage) : la
  liste des identifiants de rôle Discord « Friend » (défaut : `1550844483095232712`) et la
  liste des espaces ouverts (défaut : `astuces`, `airbuilder`). Stocké en base (`Setting`).
- Mécanique : le rôle se lit dans `discordRoles` (déjà relu toutes les 5 min dans le callback
  `jwt`, `lib/auth.ts`). Le middleware (edge) ne lit pas la base : le callback `jwt` calcule
  les espaces ouverts et les met dans le jeton ; le middleware, la barre (`espacesPour`) et
  les gardes des routes de ces espaces les lisent. Une seule fonction de décision, partagée.
- Le rang (`User.role`) ne change pas : Friend n'est pas un rang de guilde.
- *Précision de Maxime : « Les rôles Friend ne sont pas des membres de la guilde et ne figurent
  pas dans la guilde ; il s'agit d'un accès spécifique pour des amis. Avoir la possibilité de
  connaître leurs stuffs mais uniquement dans la page Membres & Stuffs dans une catégorie
  spécifique (hors guilde). »*
  - Un Friend n'apparaît dans AUCUNE liste ni AUCUN compte de la guilde : Information Guilde,
    recensement, classes de la guilde, compo, compteurs de `/staff`, file « à traiter ».
  - **Seule exception, côté bras droits** : la section Membres & builds de `/staff` (la liste
    du GuildViewer) a une catégorie à part **« Amis (hors guilde) »**, repliée par défaut,
    qui liste les Friends avec leurs persos et leurs stuffs (et leurs mesures), lus comme
    ceux des membres — sans dossier de modération, sans notes, sans gestes de rang.
  - `/api/admin/users` (ou la route de cette section) renvoie les Friends séparément
    (`amis: [...]`), jamais mêlés aux membres.

## 10. « Les mécaniques » passe dans Astuces

*Maxime : « Faire passer le système Les Mécaniques dans Astuces, ne pas l'avoir dans
l'AirBuilder (c'est des astuces en soi). »*

- L'entrée de menu quitte l'espace AirBuilder pour l'espace Astuces. L'adresse peut devenir
  `/mecaniques` (308 depuis `/builder/mecaniques`) ; mettre à jour les liens qui y mènent
  (AirBuilder compris : `public/airbuilder/airbuilder.js`, markup, aide).

