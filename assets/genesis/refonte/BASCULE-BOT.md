# La bascule : du bot Python au nôtre, sans double @everyone

*GENESIS, 2026-10-21. Procédure du §8.10 de `SPEC-CHAMBRES-RECENSEMENT.md`, à suivre une fois les
lots 3 à 7 déployés. Elle se fait en une fois, en une vingtaine de minutes, un jour sans Chambre.*

## Pourquoi d'un coup

Deux bots qui annoncent la même Chambre, cela fait deux `@everyone`. Aujourd'hui, le bot Python
(celui de l'ami, modèle Dracarys) envoie, pour toute Chambre ouverte par son `/chambre` :

| Heure (Paris), jour J | Bot Python | Notre bot, bascule COUPÉE |
|---|---|---|
| veille 20 h 00 | — | rappel « veille », `@everyone` (message simple, M4) |
| 13 h 30 et 18 h 30 | `@everyone` s'il reste des places | rien |
| 20 h 00 | mention des inscrits | rappel « jour », `@everyone` (M3) |
| 20 h 40 | récap, mention des inscrits | rien |

Notre interrupteur `nouveauxMessages` (« Messages de notre bot (bascule) », sur
`/discord/evenements`) est **coupé par défaut**. Allumé, notre bot envoie TOUT : le panneau
d'inscription la veille, « il manque du monde » à 13 h 30 et 18 h 30, le rappel de 20 h, le récap de
20 h 40, la répartition à boutons, le chrono et le débrief publié en image. Si le bot Python tourne
encore à ce moment-là, chaque message part deux fois. D'où l'ordre ci-dessous : **le bot Python
s'arrête AVANT qu'on allume la bascule**, jamais l'inverse.

Notre bot ne double jamais ses propres `@everyone` : un seul par salon et par demi-heure
(`everyoneRecent`, lot 3). Cette règle ne voit pas les messages du bot Python : elle ne protège que
de nous-mêmes.

## Avant le jour J (une fois)

1. **Déployer les lots 3 à 7.** En deux temps (le terminal n'accepte pas `ssh vanguard '…'`) :
   - sur le Mac : `git push origin main` ;
   - `ssh vanguard`, puis sur le VPS : `cd ~/vanguardmmo && git status -sb` (il doit être sur
     `main`), puis `git pull && docker compose -f docker-compose.prod.yml up -d --build`.
   Le `Dockerfile` installe désormais fontconfig et les polices Cinzel et Athiti : la reconstruction
   le prend en compte. Un build entièrement `CACHED` juste après un `pull` veut dire que rien n'a
   été tiré : revoir la branche.
2. **Regarder l'image du débrief rendue DANS le conteneur** (piège n° 8 : sans les polices, Pango
   en prend une autre sans rien dire) :
   ```
   mkdir -p essai
   docker compose -f docker-compose.prod.yml run --rm -v "$PWD/essai:/app/essai" bot npx tsx scripts/essai-image-debrief.ts --complet essai/debrief.png
   ```
   Le script affiche ce que `fc-match` trouve : il faut lire « Cinzel » et « Athiti », pas
   « DejaVu ». Ouvrir ensuite `~/vanguardmmo/essai/debrief.png` (le rapatrier par `scp` sur le Mac) :
   titres en capitales à empattements (Cinzel), le reste en Athiti, rien en Helvetica.
3. **Importer le débrief du 18/10/2026**, s'il ne l'est pas encore (il devient la première séance
   de l'historique, et la comparaison « vs la dernière fois » part de lui) :
   `docker compose -f docker-compose.prod.yml run --rm bot npx tsx scripts/importer-debrief.ts`
   (`--essai` d'abord pour voir ce qu'il ferait ; relancé, il ne change rien).
4. **Régler les salons** sur `/discord/evenements`, carte Salons : Chambres (panneau, rappels, récap,
   chrono), **Débriefs** (texte ou forum ; un forum reçoit un fil par débrief, étiqueté « Donjon »
   s'il a cette étiquette) et **Essais** (jamais un salon de la guilde : c'est là que partent les
   essais). Les chiffres DÉCLARÉS de chacun ne sont publiés que dans un salon fermé à `@everyone` :
   l'écran prévient quand un salon est visible des visiteurs.
5. **Vérifier les droits du bot** dans ces salons : Voir le salon, Envoyer des messages, Intégrer des
   liens, Joindre des fichiers, Mentionner @everyone, Lire l'historique des messages, et pour un forum
   Créer des publications. Un droit qui manque fait échouer la publication du débrief, avec sa raison
   en clair dans l'onglet Bilans (« Il manque au bot, dans #débriefs : Joindre des fichiers. »).
6. **Garder le fichier de données du bot Python** : `data/data_chambre.json`, dans son dossier, sur
   la machine qui l'héberge. Le copier à part. Il servira à reprendre son historique (lot 10,
   facultatif). Ne pas le supprimer, même une fois le bot arrêté.

## Le jour J

Le choisir **sans Chambre ce jour-là ni le lendemain matin** : un lundi ou un jeudi, en journée.
Surtout pas un mardi ou un samedi après 19 h 30 (la veille d'une Chambre, le panneau part à 20 h),
ni un mercredi ou un dimanche entre 13 h et 21 h (les rappels du bot Python).

### 1. Arrêter le bot Python, sur la machine qui l'héberge

Ce n'est pas un geste Discord. Dans le dossier du bot Python (celui qui contient son
`docker-compose.yml`) :

```
docker compose down
```

puis vérifier qu'il ne tourne plus : `docker ps --filter name=bot-guilde` ne doit rien lister. Son
compose a `restart: unless-stopped` : `down` retire le conteneur, il ne redémarrera donc pas au
prochain redémarrage de la machine (un simple `docker stop` l'aurait laissé revenir). Dans Discord,
le bot passe hors ligne dans la minute.

### 2. Retirer son application du serveur Discord

Arrêter le conteneur ne retire PAS ses commandes slash : il les enregistre par serveur au démarrage
(`tree.sync(guild=…)`, bot.py:123-124), et Discord les garde. Sans ce geste, chaque membre verrait
deux `/chambre` et deux `/recensement` (le sien et le nôtre), plus `/chrono`, `/debrief`,
`/cloturer`, `/historique`, `/repartition`, `/supprimer_perso`, `/membre`, `/invite`, `/retirer`,
`/annonce` et `/setup`, qui répondraient tous « L'application n'a pas répondu ».

Paramètres du serveur → **Intégrations** → le bot Python → **Retirer** (ou Expulser le bot depuis la
liste des membres). Son rôle géré disparaît avec lui.

*Au minimum*, si on veut le garder sous la main : Intégrations → le bot → **Commandes** → désactiver
chaque commande pour `@everyone`. Mais retirer l'application est plus sûr : c'est le seul geste qui
garantit qu'aucune de ses commandes ne s'affiche plus.

*À vérifier avant* : ce bot faisait aussi `/membre`, `/invite`, `/retirer`, `/annonce` et le
journal des arrivées et départs. Sur le site, les gestes du dossier membre (`/staff`) et l'onglet
Embed de `/discord` couvrent les rôles et les annonces ; s'assurer que personne ne compte encore
sur ses commandes.

### 3. Enregistrer nos commandes slash

Sur le VPS (`ssh vanguard`, puis) :

```
cd ~/vanguardmmo && docker compose -f docker-compose.prod.yml run --rm bot npx tsx bot/deploy-commands.ts
```

Dans Discord, Ctrl+R (ou relancer l'application) : `/chambre` (panneau, historique, recap,
positions, repartition, chrono, cloturer, debrief) et `/recensement` apparaissent, une seule fois.

### 4. Désactiver les doublons sur `/events`

S'il existe sur `/events` un événement « Chambres Secrètes » actif (piège n° 12), notre bot
l'annonce en plus, avec un rappel 15 min avant : le désactiver.

### 5. Envoyer un essai de chaque message

Sur `/discord/evenements`, chaque bouton **Essai** envoie le message tel qu'il partirait, avec le
paramétrage ENREGISTRÉ, dans le salon des essais, **sans aucune mention** et boutons inactifs. Le
verdict s'affiche dans la barre du bas (« Essai envoyé », ou la raison de l'échec). À faire :

- **Interrupteurs** : Panneau d'inscription, Annoncer une annulation ;
- **Rappels** : chacun (veille, 13 h 30, 18 h 30, 20 h, récap, chrono) ;
- **Textes des messages** : Essai de la répartition (les deux messages à boutons), et **Essai du
  débrief publié** (l'embed et son image, rendus avec le dernier débrief noté — celui du 18/10 s'il
  n'y en a pas d'autre).

Relire chaque message dans le salon des essais. Corriger un texte, enregistrer, réessayer.

### 6. Allumer la bascule

Sur `/discord/evenements`, carte Interrupteurs :
- « Rappels des Chambres (général) » doit être sur **Activés** (il agit tout de suite) ;
- allumer « **Messages de notre bot (bascule)** », puis **Enregistrer**.

Le bot relit le paramétrage en moins d'une minute, sans redémarrer.

## Ce qui se passe ensuite

- **La veille de la prochaine Chambre, à 20 h** (mardi pour un mercredi, samedi pour un dimanche) :
  le panneau d'inscription part dans le salon des Chambres, avec **un** `@everyone`. On s'y annonce
  par ✅ Je viens ; tout se voit aussi sur le site, et inversement.
- **Le jour J** : 13 h 30 et 18 h 30, « il manque du monde » seulement s'il manque une classe (le
  second remplace le premier) ; 20 h, le rappel, `@everyone` et les participants dans le même message
  (une seule notification par personne) ; 20 h 40, le récap aux participants.
- **Après la séance** : la clôture (« Ils étaient là » sur le site, ou `/chambre cloturer`), puis le
  débrief (onglet Bilans, ou `/chambre debrief`). **Publier** le montre à tous les membres sur le
  site et envoie l'image dans le salon des débriefs. « Aperçu de l'image » (onglet Bilans) la montre
  avant.
- **Les anciens messages du bot Python** (panneau, Phase 1, Phase 2, chrono) restent dans les
  salons ; leurs boutons ne répondent plus. Les supprimer à la main, ou les laisser.

## Contrôler la première Chambre

| Quand | Ce qu'on doit voir | Sinon |
|---|---|---|
| veille 20 h 00 | UN panneau, UN `@everyone` | deux panneaux : le bot Python tourne encore (étape 1) |
| veille, au clic | ✅ Je viens répond en éphémère ; l'annonce se voit sur le site | « L'application n'a pas répondu » sur un vieux panneau : c'est celui du bot Python |
| jour J 20 h 00 | UN rappel | deux rappels : couper la bascule, et revoir l'étape 1 |
| après le débrief | l'image dans le salon des débriefs, en Cinzel et Athiti | « Discord : échec — … » dans l'onglet Bilans : la raison y est (salon, droits) |

## Revenir en arrière

Si quelque chose ne va pas : **couper la bascule** sur `/discord/evenements` (puis Enregistrer).
Notre bot revient aussitôt à ses deux seuls rappels d'avant (veille et jour, 20 h). On peut alors
relancer le bot Python (`docker compose up -d` dans son dossier) et le réinviter sur le serveur
(scopes `bot` et `applications.commands`) : il réenregistre ses commandes à son démarrage. Jamais
les deux à la fois avec la bascule allumée.

## Plus tard (facultatif, lot 10)

La reprise de l'historique du bot Python (`scripts/importer-dracarys.ts`, livré au lot 10) lit
`data_chambre.json` gardé à l'étape 6 d'avant le jour J : seulement un fichier tiré du serveur
GENESIS (le même bot a d'abord servi Dracarys), les seules séances du mercredi et du dimanche, les
salles `c1`…`c10` renommées `s1`…`s10`. Il est idempotent et n'écrase rien de ce qui a été fait sur
le site. Sur le VPS, depuis `~/vanguardmmo`, avec le fichier posé à côté :

```
docker compose -f docker-compose.prod.yml run --rm -v "$PWD/data_chambre.json:/app/data_chambre.json:ro" bot npx tsx scripts/importer-dracarys.ts data_chambre.json --essai
```

puis la même commande sans `--essai`. Sans ce fichier, l'historique démarre au 18/10/2026.
