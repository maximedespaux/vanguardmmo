# Audit des pages et de la navigation — GENESIS

*Relevé du 2026-10-20 sur le worktree `genesis-logo-identity-9b8b28`. Rien n'a été modifié dans `src/` ni `bot/` : ce fichier est le seul écrit.*

La demande de Maxime, mot pour mot : « Autre chose pour gagner du temps et de l'espace. On va enlever "Quête Guilde", "Boutique", "Toutes les pages", un seul et même accueil avec tous les éléments. Faire du tri. Voir aussi le système du bot discord pour tout automatiser sur le site. Avoir un espace, pour les bras droits : dashboard, membres et suivi etc... pour tout suivre etc... »

---

## 0. L'essentiel

- **48 fichiers `page.tsx`**. Ils se répartissent en 35 pages utiles, 7 pages qui ne font que rediriger, 5 fiches de détail (`[id]`) et la page de connexion. En juillet il y avait 28 pages ; le site a grossi de 25 %.
- **33 entrées de navigation** (`src/config/nav.ts`) : 29 sont rangées dans 5 espaces, 4 sont hors espace. En juillet il y en avait 18.
- **Deux accueils** : `/` pour les visiteurs, `/dashboard` pour la guilde. Ils utilisent le même composant `PortesSite`. **Un index existe trois fois** : le lien « Toutes les pages » de la barre, le bouton « Tout » et la page `/sommaire`, et les trois lisent `nav.ts`.
- **Aucune page n'est vraiment orpheline.** Les 4 orphelines de juillet ont toutes une entrée de menu aujourd'hui. Seules `/profil` et `/messages` n'ont pas d'entrée, et c'est voulu : on y arrive par le coin haut-droit.
- **9 doublons de fonction** (section 6). Les plus nets : `/messages` est le panneau « Ma commande » de `/boutique` (même composant) ; `/annonce` est l'onglet Embed de `/discord` ; demander un objet se fait par deux formulaires, `/quetes` et le « Sur mesure » de la Boutique.
- **6 décalages entre le menu et l'accès réel** (section 8). Exemples : `/crafts` et `/boutique` sont publiques mais le menu les cache aux visiteurs ; `/builder/mecaniques` est annoncée publique mais exige la connexion.
- **Le geste « absence(s) à valider » n'existe pas.** Les priorités du jour l'affichent au staff et mènent à `/absences`, qui ne montre que ses propres absences. Aucune route ne permet de valider.
- **Ce que je propose** : un accueil unique à l'adresse `/`, qui s'adapte à qui le regarde. Quête Guilde et Boutique sortent de la barre et passent dans le menu « Guilde » et sur l'accueil. `/sommaire` disparaît, le bouton « Tout » reste. On crée un espace « Bras droits » (`/staff`) qui regroupe les 11 pages du staff sous une barre d'onglets. Au total on passe de **35 à 27 pages utiles**, et de **8 entrées dans la barre à 4** pour un membre (5 pour un bras droit).

---

## 1. Méthode et limites

- Le relevé vient de `find src/app -name page.tsx`, de la lecture de chaque layout de groupe, du middleware, de `src/lib/access.ts` et de `src/config/roles.ts`. Les liens internes ont été cherchés avec grep (`href=`, `href:`, `push(`, `redirect(`, `lien:`). Les tableaux de liens comme le hub du GuildViewer ont été lus à la main.
- **La fréquentation est une ESTIMATION.** Le code n'a aucune mesure d'audience : un grep sur `pageview|plausible|umami|gtag|analytics` ne trouve rien dans `src/` ni dans `prisma/schema.prisma`. Le seul indice est `User.lastSeenAt` (`prisma/schema.prisma:103`), qui est un signe de présence et pas une page vue. Je classe les pages selon leur rôle : *quotidienne*, *hebdo*, *rare* ou *staff*.
- D'autres agents recolorent `src/` en ce moment. Les numéros de ligne peuvent bouger, mais les fichiers restent les bons.

---

## 2. Les règles d'accès réelles

Quatre niveaux d'accès. Les rôles viennent de `src/config/roles.ts:18-19` :

| niveau | qui | garde des PAGES | garde du middleware |
|---|---|---|---|
| public | tout le monde | `(public)/layout.tsx`, `(vitrine)/layout.tsx:23-25` : **aucun garde** | aucun |
| connecté (« vérifié ») | toute session, donc membre du serveur Discord | `(verified)/layout.tsx:11`, `requireVerified()` = `requireAuth()` (`access.ts:112-114`) | `/build` seulement (`middleware.ts:16`) |
| guilde | DIRECTION, VANGUARD, GENERAL, OFFICIER, VETERAN, GUARD | `(guild)/layout.tsx:4` et `(shop)/layout.tsx:16`, `requireGuild()` (`access.ts:99-103`) | `GUILD_PREFIXES` (`middleware.ts:35-36`) |
| staff = **bras droits** | DIRECTION, VANGUARD, GENERAL, OFFICIER | `(admin)/layout.tsx:4`, `requireAdmin()` (`access.ts:116-120`) | `ADMIN_PREFIXES` (`middleware.ts:37`) |

Le code appelle déjà ces quatre rangs « bras droits » : `isOfficer = canAccessAdmin` avec le commentaire « Officier+ = bras droits » (`access.ts:157`), et le badge de profil `brasdroit` (`ProfilePanel.tsx:15`).

Un refus ne mène pas au même endroit selon qui le prononce. Le middleware renvoie vers `/?error=guild` ou `/?error=admin` (`middleware.ts:52-53`). Les layouts renvoient vers `/login?error=…` (`access.ts:101,118`). Le middleware passe en premier, mais seulement pour les préfixes qu'il connaît. Il ignore `/objets`, `/profil`, `/builder/[user]` et `/builder/mecaniques` : pour ces pages, c'est le layout qui tranche.

---

## 3. La navigation actuelle, exacte

### 3.1 La barre du haut (`src/components/Shell.tsx:64-107`)

Ordre de rendu : d'abord les entrées hors espace filtrées (`Shell.tsx:40-42`, la Candidature est masquée à un membre de la guilde), puis les espaces filtrés (`Shell.tsx:44-45`, un espace sans lien accessible disparaît). Quand on clique sur le nom d'un espace, on arrive sur son `href` (`Shell.tsx:87`). « Quête Guilde » est une entrée `direct` sans menu (`Shell.tsx:76-84`). Sur mobile, un burger ouvre la même barre (`Shell.tsx:62-64`).

| profil | barre (gauche → droite) | coin droit |
|---|---|---|
| **visiteur** | Accueil · La guilde · Candidature · AirBuilder ▾ · Astuces ▾ | « Se connecter », sauf sur `/histoire` et `/candidature` (`Shell.tsx:116`) |
| **connecté non-guilde** (Recrue) | identique au visiteur | Tout · ✉ · 🔔 · profil |
| **membre** (Guard, Vétéran) | Accueil · La guilde · **Toutes les pages** · AirBuilder ▾ · Astuces ▾ · **Quête Guilde** · **Boutique ▾** · Guilde ▾ | Tout · ✉ · 🔔 · profil |
| **bras droit** (Officier+) | identique au membre, avec des menus plus longs | identique |

Un membre a donc **8 entrées dans la barre**. Le lien texte « Toutes les pages » et le bouton « Tout » sont côte à côte et ouvrent la même liste.

### 3.2 Les menus déroulants (`src/config/nav.ts`)

- **AirBuilder ▾** → `/builder`. Public (`nav.ts:45-68`) : Mes personnages `/personnages` · AirBuilder `/builder` · Les mécaniques `/builder/mecaniques`.
- **Astuces ▾** → `/donjons`. Public (`nav.ts:69-172`) : Donjons · Guide de progression `/astuces` · Prestige · Le wiki · Objets *(guilde)* · Classes & compétences · Monstres · PNJ · Crafts & collections *(guilde)* · World Boss *(guilde)*. Un visiteur en voit 7 sur 10.
- **Quête Guilde** → `/quetes`, direct, guilde (`nav.ts:173-182`).
- **Boutique ▾** → `/boutique`. Guilde (`nav.ts:183-211`) : Boutique · Mes ventes *(staff)* · Coffre & crafts `/coffre` *(staff)* · Plan de farm *(staff)*. **Pour un membre, ce menu n'a qu'une ligne**, ce qui contredit la règle de `nav.ts:37-42` (« un déroulant à une seule ligne ajoute un clic pour rien »).
- **Guilde ▾** → `/dashboard`. Guilde (`nav.ts:212-245`) : Accueil de la guilde · Chambres Secrètes `/compositions` · Mes absences, puis 8 entrées staff : Membres & builds `/guildviewer` · Candidatures · Statistiques · Journal · World Boss — gestion · Bot Discord `/discord` · Annonce · Events du jeu.
- **Hors espace** (`nav.ts:249-268`) : Accueil `/` · La guilde `/histoire` · Candidature *(masquée aux membres)* · Toutes les pages `/sommaire` *(guilde)*.

Nombre d'entrées accessibles, qui est aussi le compte affiché par le panneau « Tout » (`PanneauTout.tsx:34`) : Recrue connecté 13, membre 21, bras droit 32.

### 3.3 Le coin droit

- **Tout** (`PanneauTout.tsx`). Le bouton affiche « Tout » et son titre est « Toutes les pages du site » (`:38-44`). Il rend les mêmes `espaces` et `hors` que la barre (`Shell.tsx:112`). Il n'apparaît qu'aux personnes connectées (`Shell.tsx:110`).
- **✉** : un lien vers `/messages` avec le nombre de fils non lus (`Alertes.tsx:101`). **🔔** : les notifications. Aucun des deux ne filtre par rôle : un Recrue voit l'enveloppe, et elle le renvoie vers un refus.
- **Profil** (`ProfilePanel.tsx`). Il montre deux commandes et un lien « Tout mon profil » vers `/profil` (`:201-213`). Ses raccourcis sont Mes personnages, Mon build, Mes demandes `/messages` et Mes absences (`:22-28`), plus Mes ventes pour le staff (`:32,220`). Ces raccourcis ne sont pas filtrés par rôle non plus : un Recrue se voit proposer `/messages` et `/absences`, qui le refusent.

### 3.4 `/sommaire` (`src/app/(shop)/sommaire/page.tsx`)

La page affiche les espaces filtrés (`:26-28`), puis une section « Le reste » avec les entrées hors espace (`:55-69`). Elle ne masque pas la Candidature aux membres, alors que la barre le fait (`:58` contre `Shell.tsx:41`). On l'atteint par le lien « Toutes les pages » de la barre et par une porte de `/dashboard` (`dashboard/portes.ts:196-201`).

### 3.5 Les autres navigations

- **Portes de `/`** : 13 portes publiques (`components/accueil/PortesSite.tsx:108-205`), dont 4 avec cadenas.
- **Portes de `/dashboard`** : 4 groupes de 5, 3, 3 et 11 portes (le dernier réservé au staff), plus la porte du sommaire (`dashboard/portes.ts:72-201`). Leurs libellés sont lus dans `nav.ts` (`portes.ts:35`).
- **Barres d'onglets** (`components/SectionTabs.tsx`) : `guides` (Guide ↔ Prestige), `pve` (Donjons ↔ World Boss) et `discord`, qui réunit Pilotage, Créneaux, Events, World Boss et Annonce en **un seul outil** (`:15-24`).
- **Hub du GuildViewer** : quatre boutons vers AirGuild, Plan de farm, Candidatures et World Boss (`guildviewer/page.tsx:92-97`). C'est déjà un petit espace staff qui ne dit pas son nom.

---

## 4. Inventaire page par page

Abréviations : **P** public · **C** connecté · **G** guilde · **S** staff · **↪** redirection.

### Public et connexion
| route | groupe | accès réel | ce qu'elle fait | comment on l'atteint | fréq. |
|---|---|---|---|---|---|
| `/` | racine | P | Accueil public : le jeu, 8 classes, 13 portes. Lit `?error=` (`page.tsx:33-42`, `PageAccueil.tsx:29`) | logo, « Accueil », 404, erreurs | quotidienne |
| `/histoire` | (public) | P | La guilde, son histoire, ses règles, comment postuler | barre « La guilde », `/`, liens « Retour à l'accueil » (`not-found.tsx:14`, `error.tsx:21`, `login/page.tsx:81`) | rare |
| `/candidature` | (public) | P, connexion pour envoyer (`candidature/page.tsx:212,236`) | Formulaire de candidature avec le builder intégré | barre (non-membres), `/`, `/histoire` | rare |
| `/login` | (auth) | P, sans Shell | Connexion Discord et invitation au serveur | « Se connecter », redirections de garde | rare |
| `/builder` | (public) | P, enregistrer exige la connexion | L'AirBuilder | menu AirBuilder, portes, profil, une vingtaine de liens | quotidienne |
| `/personnages` | (public) | P, la page invite à se connecter (`personnages/page.tsx:46-47,162`) | Déclarer ses persos | menu, profil, accueils, popup `AccueilPersonnages` | hebdo |
| `/builder/mecaniques` | **(verified)** | **C** (`(verified)/layout.tsx:11`) | Lexique des mécaniques | menu AirBuilder (affiché **public**), `/astuces`, fiches objets | rare |
| `/donjons` | (public) | P | Donjons, Tour Oubliée, Oasis | menu Astuces, `/`, onglets `pve` | hebdo |
| `/astuces` | (public) | P | Guide de progression | menu, `/`, onglets `guides` | rare |
| `/prestige` | (public) | P | Calculateur de prestige | menu, `/`, onglets `guides` | hebdo |
| `/wiki` | (public) | P | Recherche unique, qui renvoie vers la page propriétaire | menu, `/` | quotidienne |
| `/classes` | (public) | P | Classes et compétences | menu, `/` (8 héros) | hebdo |
| `/monstres` · `/monstres/[id]` | (public) | P | Bestiaire et fiche d'un monstre | menu, `/`, donjons, World Boss, fiches | hebdo |
| `/pnj` | (public) | P | Annuaire des PNJ (`?objet=`, `?pnj=`) | menu, `/`, wiki, fiches objets | hebdo |
| `/crafts` | **(vitrine)** | **P** | Recettes et collections ; la colonne « éteintes » est retirée aux visiteurs | menu Astuces (affiché **guilde**), `/`, `/dashboard` | hebdo |
| `/boutique` | **(vitrine)** | **P** pour regarder, commande gardée par `apiGuild` | 4 panneaux : Au coffre, Sur mesure, Ma commande, À livrer *(staff)* (`EcranEconomie.tsx:77-80`) | espace Boutique (affiché **guilde**), portes, profil, Discord (`lib/ventes.ts:409`) | quotidienne |

### Guilde
| route | groupe | accès | ce qu'elle fait | atteinte | fréq. |
|---|---|---|---|---|---|
| `/dashboard` | (guild) | G (middleware + layout) | Accueil de la guilde : priorités du staff, où j'en suis, état de la guilde, 22 portes et la porte du sommaire | menu Guilde, porte de `/` | quotidienne |
| `/quetes` | (guild) | G | Quête Guilde, 4 onglets : principales, secondaires, mes requêtes, réglées (`quetes/page.tsx:262-267`) | barre (direct), `/dashboard`, `/plan-farm?item=` (`plan-farm/page.tsx:107`) | quotidienne |
| `/compositions` | (guild) | G, gestes staff dans la page | Chambres Secrètes : inscriptions, postes, « Ils étaient là » | menu Guilde, portes | hebdo (mer et dim) |
| `/compositions/build/[slotId]` | (guild) | G | Build de référence d'un poste | `/compositions` (`:493`) | rare |
| `/worldboss` | (guild) | G | Agenda des passages et fiche de la bête | menu Astuces, portes, onglets `pve` | hebdo |
| `/absences` | (guild) | G | Déclarer **ses** absences et les voir | menu Guilde, profil, priorité staff | rare |
| `/objets` · `/objets/[id]` | (guild) | G (layout seul) | Catalogue des objets et fiche d'un objet | menu Astuces, portes, une dizaine de liens | quotidienne |
| `/messages` | (shop) | G | **Rend `<MesCommandes/>`** (`messages/page.tsx:9-10`), le même composant que Boutique › Ma commande (`EcranEconomie.tsx:346`) | ✉, profil, notifications `/messages?fil=` | quotidienne |
| `/profil` | (shop) | G (layout seul) | Mes informations, commandes, personnages, mouvements de périns | panneau profil, porte de `/dashboard` | rare |
| `/sommaire` | (shop) | G | Index de `nav.ts` | barre « Toutes les pages », porte de `/dashboard` | rare |
| `/build/[shareId]` | (verified) | C | Build partagé | lien de partage du moteur (`public/airbuilder/airbuilder.js:2313`) | rare |
| `/builder/[user]` | (verified) | **G** (garde dans la page, `builder/[user]/page.tsx:8`) | Build d'un membre en lecture seule | GuildViewer (`guildviewer/page.tsx:164,193`) | staff |

### Staff (11 pages, toutes `requireAdmin` et toutes dans `ADMIN_PREFIXES`)
| route | ce qu'elle fait | atteinte | fréq. |
|---|---|---|---|
| `/guildviewer` | Membres, persos, builds, dossier (4 onglets, modération) et hub admin | menu Guilde « Membres & builds », portes | staff quotidien |
| `/candidatures` | Accepter ou refuser les candidatures (le bot les relaie toutes les 2 min) | menu, portes, priorités, hub | staff quotidien |
| `/coffre` | AirGuild : stock, crafts, base des objets | menu Boutique, portes, hub, priorités | staff quotidien |
| `/plan-farm` | Ce qui manque par rapport aux seuils | menu Boutique, portes, hub | staff hebdo |
| `/mes-ventes` | Ce que j'ai fourni, encaissé et engagé | menu Boutique, profil (staff), portes | staff hebdo |
| `/statistiques` | Vue d'ensemble : qui livre, qui demande | menu, portes | staff hebdo |
| `/journal` | Le détail événement par événement (`?membre=`) | menu, portes, `/statistiques`, `MesCommandes` | staff hebdo |
| `/discord` | Piloter le bot : embed, giveaway, panneau des classes, interrupteurs CS et GS | menu, portes, onglets `discord` | staff rare |
| `/annonce` | Un embed dans un salon | menu, portes, onglets | staff rare |
| `/events` | Événements du jeu annoncés par le bot | menu, portes, onglets | staff rare |
| `/gestion-worldboss` | Fiches de boss et passages | menu, portes, onglets, hub | staff hebdo |

### Les 7 pages qui ne font que rediriger
| route | vers | groupe | lien entrant | remarque |
|---|---|---|---|---|
| `/demandes` | `/messages` | (shop) | aucun | **chaîne de redirections** si `/messages` est redirigée à son tour |
| `/dettes` | `/boutique` | (shop) | aucun | Le garde passe avant la redirection : un visiteur arrive sur `/login`, pas sur la boutique publique (`(shop)/layout.tsx:16`, `middleware.ts:36`) |
| `/requetes/[id]` | `/messages?fil=req:<id>` | (shop) | `lib/messagerie.ts:212`, plus des notifications déjà en base | à conserver |
| `/collections` | `/crafts` | (vitrine) | aucun | déjà corrigé pour le piège du garde |
| `/competences` | `/classes` | (public) | aucun | indexée par les moteurs |
| `/oasis` | `/donjons#oasis` | (public) | aucun | indexée par les moteurs |
| `/astuces-guilde` | `/builder/mecaniques` | **(guild)** | aucun | Même piège du garde. Son commentaire dit la destination « PUBLIQUE » (`:17`), ce qui est faux : elle est sous `(verified)` |

---

## 5. Pages mortes et orphelines

- **Orphelines (aucun lien nulle part)** : aucune page utile. Les 6 redirections sans lien entrant (`/demandes`, `/dettes`, `/collections`, `/competences`, `/oasis`, `/astuces-guilde`) n'existent que pour les vieux liens partagés sur Discord ou indexés par les moteurs.
- **Absentes de `nav.ts`** : `/profil` et `/messages`, par choix (`nav.ts:197-201`). Les 5 fiches de détail n'y figurent pas non plus, ce qui est normal.
- **Fonctionnalité morte** : `/dettes`. Les dettes ont été retirées (`dettes/page.tsx:3-6`), seule l'adresse reste.
- **Réglages qui ne mènent à rien** : la table des fonds `PAGE_BG` a une clé `/parametres` (`Shell.tsx:25`) alors que cette page n'existe pas, et des clés pour `/demandes`, qui redirige.
- **Commentaires périmés à ne pas croire** : `page.tsx:13-15` dit que `/histoire` « reste l'entrée Accueil », alors que c'est `/` (`nav.ts:253`). `PortesSite.tsx:97-101` dit que la nav annonce `/objets` comme publique, alors qu'elle porte `acces: "guild"` (`nav.ts:138`). `middleware.ts:6` parle de « la nav de Shell.tsx », alors qu'elle vit dans `config/nav.ts`.

---

## 6. Doublons de fonction

| # | geste | les deux (ou trois) endroits | preuve |
|---|---|---|---|
| D1 | suivre ma commande ou ma conversation | `/messages` = Boutique › Ma commande | même composant `MesCommandes` (`messages/page.tsx:10`, `EcranEconomie.tsx:346`) |
| D2 | voir toutes les pages | lien « Toutes les pages », bouton « Tout », `/sommaire`, porte de `/dashboard` | tous lisent `nav.ts` (`nav.ts:267`, `PanneauTout.tsx:21`, `sommaire/page.tsx:26`, `portes.ts:196`) |
| D3 | l'accueil | `/` (visiteur) et `/dashboard` (membre), sans compter « La guilde » | même `PortesSite` (`dashboard/page.tsx:10`, `PageAccueil.tsx:10`) ; deux « Accueil » au menu (`nav.ts:228`, `nav.ts:253`) |
| D4 | demander un objet à la guilde | `/quetes` › Mes requêtes (crée une `Quete`) et Boutique › Sur mesure (crée une `BankRequest` qui peut devenir une quête) | `quetes/page.tsx:124` POST `/api/quetes` ; `ObjetSurMesure.tsx:375` POST `/api/bank-request` ; `api/quetes/a-prendre/route.ts` |
| D5 | aider à livrer | Boutique › À livrer (staff) et `/quetes` › principales (membres) : même modèle `QueteContribution`, deux écrans | `RequetesClients.tsx:55-71` ; `api/quetes/route.ts:48` sépare les deux listes |
| D6 | savoir ce qui manque au coffre | `/plan-farm`, `/quetes` › secondaires, priorité « objets du coffre à compléter » qui mène à `/coffre` | `quetes/page.tsx:91,236-237` ; `api/dashboard/route.ts:100-101` |
| D7 | publier un embed sur Discord | `/annonce` = `/discord` › Embed | les deux envoient `post_embed` (`annonce/page.tsx:36-38`, `discord/page.tsx:165`) |
| D8 | World Boss | `/worldboss` (membre) et `/gestion-worldboss` (staff) | `/compositions` montre déjà la bonne forme : les gestes staff dans la page (`compositions/page.tsx:22,277,308`) |
| D9 | qui donne, qui prend | `/statistiques` (ensemble) et `/journal` (détail) | `statistiques/page.tsx` le dit lui-même : « Le journal raconte les événements un par un ; ici on regarde l'ensemble » |
| — | mes affaires | `/profil`, panneau profil, « Où j'en suis » de `/dashboard` : persos et commandes affichés 3 fois | `profil/page.tsx:47-51`, `ProfilePanel.tsx:201-213` |

Les noms posent aussi problème. « Guilde » (`nav.ts:217`) et « La guilde » (`nav.ts:254`) sont voisins dans la barre. « Coffre & crafts » (`nav.ts:208`) et « Crafts & collections » (`nav.ts:166`) mènent à deux outils différents. Le menu « Bot Discord » éclate en 4 entrées (`nav.ts:240-243`) ce que `SectionTabs` présente comme UN outil (`SectionTabs.tsx:15-17`).

---

## 7. Décalages entre le menu et l'accès réel (des bugs, pas des goûts)

1. **`/crafts`** est publique (`(vitrine)`, sans garde) mais le menu la marque `acces: "guild"` (`nav.ts:166`). Un visiteur ne la trouve que par la porte de `/`.
2. **`/boutique`** est publique en vitrine, mais l'espace Boutique est `acces: "guild"` (`nav.ts:194`) et son commentaire date d'avant la vitrine (`nav.ts:191-193` contre `middleware.ts:26-29`).
3. **`/builder/mecaniques`** est affichée publique (elle hérite de `nav.ts:59`), mais elle vit sous `(verified)` et exige donc une connexion. Un visiteur clique et tombe sur `/login`.
4. **L'onglet « World Boss »** apparaît à un visiteur sur `/donjons` (`PageDonjons.tsx:286`, `SectionTabs.tsx:11-14`, aucun filtre de rôle) et mène à `/login`.
5. **Les priorités du jour** envoient « personnage(s) sans build » et « membre(s) sans perso principal » vers `/personnages`, la page de ses propres persos. Elles envoient « absence(s) à valider » vers `/absences`, qui montre ses propres absences sans rien permettre de valider (`api/dashboard/route.ts:93-99`). `api/absences/route.ts` n'a que GET et POST. Un `?all=1` réservé aux officiers existe (`:8-11`), mais aucune page ne l'appelle.
6. **Un Recrue connecté** se voit proposer ✉ `/messages`, Mes demandes et Mes absences (`Alertes.tsx:101`, `ProfilePanel.tsx:22-28`). Les trois le refusent.
7. **« Retour à l'accueil »** mène à `/histoire` et non à `/` (`not-found.tsx:14`, `error.tsx:21`, `login/page.tsx:81`).

---

## 8. Que deviennent les trois entrées retirées ?

### « Quête Guilde » (`/quetes`)
La **page reste**. C'est l'outil complet, 786 lignes. Elle **quitte la barre** et devient une entrée « Quêtes » du menu Guilde ▾. Son contenu remonte sur l'accueil, à un clic :
- **« Ce que la guilde cherche »** : les quêtes principales ouvertes, chacune avec un bouton « J'apporte », plus « Toutes les quêtes → ».
- **« À confirmer »** : le badge vert de `quetes/page.tsx:253`. C'est la seule chose qui bloque quelqu'un d'autre (le livreur attend sa récompense), donc elle doit être vue en arrivant.
- Le **niveau, le rang et l'XP** vont dans « Où j'en suis ».
- Les **objectifs perso** de l'onglet secondaire vont aussi dans « Où j'en suis ». La partie « manque au coffre + dépôt » sert au staff : elle part dans l'espace Bras droits, à côté du plan de farm (D6).
- **À arbitrer** : un seul formulaire « Demander un objet » au lieu de deux (D4).

### « Boutique » (`/boutique` et son menu)
- **`/boutique` reste, à la même adresse.** Elle est postée sur Discord (`lib/ventes.ts:409`) et c'est la vitrine publique.
- On l'atteint par l'entrée « Boutique » du menu Guilde ▾, par une porte sur l'accueil (visiteur et membre), par le bloc **« Ma commande »** de l'accueil (état de la commande en cours), par ✉ et par le profil.
- **`/messages` devient une redirection vers `/boutique?mode=commande`** en gardant `?fil=`. Le paramètre `mode` est déjà lu (`EcranEconomie.tsx:94-101`) et `fil` aussi (`MesCommandes.tsx:192-196`). L'enveloppe ✉ et « Mes demandes » pointent directement vers la nouvelle adresse. `/demandes` et `/requetes/[id]` visent la destination finale, sans passer par une chaîne.
- Les trois entrées staff (Mes ventes, Coffre & crafts, Plan de farm) partent dans l'espace Bras droits, ainsi que le panneau « À livrer » sous forme de compteur.

### « Toutes les pages » (`/sommaire`)
- Le **lien de la barre disparaît** et **`/sommaire` redirige vers `/#portes`**. L'accueil unique montre toutes les portes accessibles : c'est déjà le cas des 22 portes de `/dashboard`.
- Le **bouton « Tout » (icône) reste** comme filet, accessible en un clic depuis n'importe quelle page. C'est lui qui rend sûr le retrait des entrées de la barre. *Question pour Maxime : si « Toutes les pages » voulait aussi dire ce bouton, l'accueil seul suffit.*
- La porte `PORTE_SOMMAIRE` (`portes.ts:196`) est retirée.

---

## 9. L'accueil unique

**Une seule adresse : `/`.** Elle est indexée, c'est là que mène le logo, et c'est là que le middleware dépose ses `?error=`. `src/app/page.tsx` est déjà un composant serveur : il lit `getCurrentUser()` et choisit quoi rendre.
- **Visiteur ou Recrue** : la page publique actuelle, telle quelle, avec son bloc « La guilde » et le bouton Postuler.
- **Membre**, de haut en bas :
  1. **Où j'en suis** : persos et builds, XP et rang, objectifs, mes absences avec un bouton « Prévenir d'une absence ».
  2. **Ma commande** : état et dernier message.
  3. **Ce que la guilde cherche** : les quêtes, plus « à confirmer ».
  4. **Prochains rendez-vous** : CS mercredi et dimanche à 21 h, prochain World Boss, avec Présent/Absent.
  5. **Toutes les portes**, qui remplacent `/sommaire`.
  6. Le jeu : les classes, en bas.
- **Bras droit** : en plus, un bandeau « Priorités du jour » réduit, avec le lien « Espace bras droits → ».
- **Ce qu'on réutilise** : `/api/dashboard`, `/api/profil`, `OuJenSuis`, `Grandeurs`, `PortesSite`, `GROUPES`. `/dashboard` redirige vers `/` et `/profil` vers `/#moi`. Le lien « Tout mon profil » du panneau profil vise `/#moi`.

---

## 10. L'espace « Bras droits »

Accès : `canAccessAdmin`, soit DIRECTION, VANGUARD, GENERAL et OFFICIER (`roles.ts:19`). C'est **une seule entrée** dans la barre, « Bras droits » (`direct`), qui mène à **`/staff`**. C'est une page neuve : elle doit être déclarée dans `nav.ts`, dans `ADMIN_PREFIXES` et dans le `matcher` (`middleware.ts:37,68-74`). Une **barre d'onglets commune** à toutes les pages staff reprend le patron de `SectionTabs`, section `discord` :

| onglet | contenu | pages absorbées |
|---|---|---|
| **Tableau de bord** `/staff` | priorités du jour (liens corrigés), état de la guilde (`Grandeurs` en vue staff), compteurs : candidatures, absences, commandes à servir, objets sous le seuil, prochain CS ou World Boss | priorités de `/dashboard` |
| **Membres** `/guildviewer` | membres, builds, dossier et modération, **absences de la guilde à valider** (nouveau : il faut une route PATCH), candidatures | `/candidatures` reste une page, elle passe en onglet |
| **Suivi** `/statistiques` | Vue d'ensemble · Journal (`?membre=`) | `/journal` |
| **Économie** `/coffre` | AirGuild, plan de farm (point 5 de la file Boutique), « À livrer », mes ventes | `/plan-farm` ; `/mes-ventes` reste une page |
| **Discord** `/discord` | Pilotage · Créneaux · Annonce · Events | `/annonce`, `/events` |

Le World Boss staff passe **dans `/worldboss`**, avec les gestes réservés au staff dans la page, comme pour `/compositions`. `/gestion-worldboss` redirige.

### Le bot dans ce tri
Ce que le bot fait aujourd'hui à partir de données du site, d'après `bot/scheduler.ts` :
- relais des candidatures toutes les 2 min et relance toutes les 2 h (`:273,275`) ;
- clôture des giveaways (`:288`) ;
- file de commandes du site toutes les 12 s : embed, giveaway, panneau des classes, modération (`bot/lib/botcommands.ts:76-79`) ;
- synchro des rangs vers le GuildViewer toutes les 10 min ;
- events du jeu chaque minute (`:299`) ;
- rappels CS et GS (`:304-313`).

Tout ce pilotage se retrouve dans l'onglet Discord. Les commandes slash du bot doublent certains gestes du site, par exemple `/absence` (`bot/commands/absence.ts`). Le jour où les absences se valident sur le site, les deux canaux doivent écrire le même enregistrement. L'audit complet du bot dépasse cette mission.

---

## 11. La barre cible

| profil | barre | coin droit |
|---|---|---|
| visiteur | Accueil · AirBuilder ▾ · Astuces ▾ · La guilde · Postuler | Se connecter |
| membre | Accueil · AirBuilder ▾ · Astuces ▾ · **Guilde ▾** (Chambres Secrètes · World Boss · Quêtes · Boutique · Mes absences · La guilde) | Tout · ✉ · 🔔 · profil |
| bras droit | identique + **Bras droits** | identique |

On passe de 8 entrées à 4 pour un membre, et à 5 pour un bras droit. Le World Boss quitte Astuces (`nav.ts:170`) pour rejoindre Guilde ▾, parce que c'est une page réservée à la guilde. Il faut aussi corriger les décalages de la section 7 : Crafts public, Mécaniques, et la Boutique visible pour le visiteur si Maxime veut que la vitrine soit dans le menu.

---

## 12. Le tri, page par page

| route | décision | précision |
|---|---|---|
| `/` | **GARDER, elle devient l'accueil unique** | absorbe `/dashboard`, `/profil`, `/sommaire` et des résumés de `/quetes` et `/boutique` |
| `/dashboard` | **FUSIONNER dans `/`** puis rediriger | la partie staff part dans `/staff` |
| `/profil` | **FUSIONNER dans `/`** (bloc Moi) puis rediriger vers `/#moi` | |
| `/sommaire` | **RETIRER**, rediriger vers `/#portes` | le bouton Tout reste |
| `/messages` | **RETIRER**, rediriger vers `/boutique?mode=commande` | garder la redirection pour toujours (notifications en base) |
| `/demandes` · `/requetes/[id]` · `/dettes` | garder la redirection, **vers la cible finale** | sortir `/dettes` du garde |
| `/quetes` | **GARDER, la DÉPLACER** de la barre vers le menu Guilde et l'accueil | unifier le formulaire avec Sur mesure (à arbitrer) |
| `/boutique` | **GARDER, la DÉPLACER** de la barre vers le menu Guilde et l'accueil | absorbe `/messages` |
| `/absences` | **GARDER, la DÉPLACER** vers le bloc Moi et le menu Guilde | vue staff dans Membres |
| `/compositions` (+ build) | GARDER | |
| `/worldboss` | GARDER, **absorbe `/gestion-worldboss`** | passe dans le menu Guilde |
| `/gestion-worldboss` | **FUSIONNER dans `/worldboss`** puis rediriger | |
| `/histoire` · `/candidature` · `/login` | GARDER | corriger les « Retour à l'accueil » |
| `/builder` · `/personnages` · `/build/[id]` · `/builder/[user]` | GARDER | |
| `/builder/mecaniques` | GARDER | trancher entre public et connexion (section 7, point 3) |
| `/donjons` `/astuces` `/prestige` `/wiki` `/classes` `/monstres(+id)` `/pnj` `/objets(+id)` | GARDER | |
| `/crafts` | GARDER | menu à aligner : public |
| `/staff` | **NOUVELLE** | tableau de bord des bras droits |
| `/guildviewer` · `/candidatures` · `/coffre` · `/mes-ventes` · `/statistiques` · `/discord` | GARDER, regroupées sous les onglets Bras droits | |
| `/journal` | **FUSIONNER dans `/statistiques`** (onglet) | garder `?membre=` |
| `/plan-farm` | **FUSIONNER dans `/coffre`** (onglet) | lien `/quetes?item=` à garder |
| `/annonce` · `/events` | **FUSIONNER dans `/discord`** (onglets) | |
| `/collections` `/competences` `/oasis` `/astuces-guilde` | garder la redirection | `/astuces-guilde` à sortir du garde |

Bilan : **27 pages utiles au lieu de 35**. On en retire ou fusionne 9, on en crée une. Les nouvelles redirections gagnent à être regroupées dans `next.config.js` (`redirects()`, absent aujourd'hui). Elles s'exécutent avant le middleware, ce qui supprime le piège du garde qui passe avant la redirection. `/requetes/[id]` garde son fichier, parce qu'elle transforme un segment d'adresse en paramètre.

---

## 13. Risques et ordre de travail

1. **Les portes disparaissent sans bruit.** `porteDe` écarte toute porte dont l'adresse a quitté les `ESPACES` (`portes.ts:35,211-216`). Les `HORS_ESPACES` n'y sont pas lus. Si `/quetes` ou `/boutique` sortent de `nav.ts` au lieu d'être déplacées dans Guilde ▾, leurs portes s'éteignent sans un mot.
2. **Les liens déjà en base.** Les notifications pointent vers `/messages?fil=…` (`api/ventes/[id]/route.ts:139` et suivantes) et vers `/requetes/<id>` (`lib/messagerie.ts:212`). Discord pointe vers `/boutique`. Ces redirections doivent vivre pour toujours.
3. **Le garde passe avant la redirection** (le piège décrit dans `collections/page.tsx:17-22`). Toute redirection placée dans un groupe gardé renvoie un visiteur vers `/login`.
4. **Les réglages de l'accueil.** Les réglages Vanguard sont rangés sous la clé `page: "/dashboard"` (`dashboard/page.tsx:70`). Les fonds de page dépendent du chemin (`Shell.tsx:20-27`). Il faut reprendre les deux.
5. **`/` devient dynamique** (elle lit la session). Aucune donnée de membre ne doit se retrouver dans le HTML servi à un visiteur ou à un moteur.
6. **Déplacer un fichier d'un groupe à l'autre** casse ses imports relatifs, et seul un `next build` complet le révèle (note `refonte-navigation`). Mieux vaut rediriger que déplacer.
7. **`nav.ts`, `Shell.tsx` et `middleware.ts`** se touchent d'une seule main, après la passe de recoloration en cours (note `methode-assets-et-nav`).
8. **Ne pas promettre la validation des absences** dans `/staff` avant que la route existe.

Ordre conseillé :
1. corriger les 7 décalages (sans risque) ;
2. retirer « Toutes les pages » et rediriger `/messages` ;
3. ajouter le menu Guilde ▾, y ranger Quêtes, Boutique et World Boss, et retirer les deux entrées de la barre ;
4. construire `/staff` et la barre d'onglets ;
5. construire l'accueil unique ;
6. fusionner les pages staff une par une.

## 14. Questions pour Maxime
1. « Toutes les pages », c'est seulement le lien de la barre, ou aussi le bouton « Tout » ?
2. L'accueil unique à l'adresse `/` te va-t-il ?
3. Un seul formulaire « Demander un objet », au lieu de Mes requêtes d'un côté et Sur mesure de l'autre ?
4. Les bras droits sont-ils bien les 4 rangs Direction, Vanguard, Général et Officier ?
5. Les Mécaniques sont-elles publiques ou réservées aux connectés ? La Boutique et les Crafts doivent-elles apparaître dans le menu d'un visiteur ?
6. Qui valide une absence ? La question est ouverte depuis le 2026-08-10.
