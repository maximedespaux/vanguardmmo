╔══════════════════════════════════════════════════════════════════╗
║  VANGUARD — PACK DE MISE À JOUR (à appliquer sur ton projet)       ║
║  Bot dettes pair-à-pair · Rôle-réaction (type MEE6) · Front Flyff  ║
╚══════════════════════════════════════════════════════════════════╝

Bonjour Maxime. Ce pack contient UNIQUEMENT les fichiers à ajouter/remplacer
dans ton projet « vanguard-control-center/vanguard/ ». Tu copies, tu colles
par-dessus (mêmes chemins), tu fais 3 commandes, c'est opérationnel.

Ton ancien LISEZ-MOI / package reste utile (cahier des charges, builder,
wiki). Ce pack-ci NE TOUCHE PAS au builder (on le finalisera plus tard).

──────────────────────────────────────────────────────────────────
1) COPIER LES FICHIERS  (depuis ce dossier → vers ton projet)
──────────────────────────────────────────────────────────────────
Tout va dans  vanguard-control-center/vanguard/  en respectant les chemins :

  prisma/schema.prisma                      → REMPLACE (modèles dettes + rôle-réaction ajoutés)
  bot/index.ts                              → REMPLACE (intents + boutons + réactions)
  bot/commands/index.ts                     → REMPLACE (enregistre les nouvelles commandes)
  bot/commands/dette.ts                     → NOUVEAU
  bot/commands/dette-payer.ts               → NOUVEAU
  bot/commands/dettes.ts                    → NOUVEAU
  bot/commands/rolereaction.ts              → NOUVEAU
  bot/lib/debts.ts                          → NOUVEAU
  bot/lib/items.ts                          → NOUVEAU
  bot/lib/reactionroles.ts                  → NOUVEAU
  src/components/HeroFlyff.tsx              → NOUVEAU (page d'accueil)
  src/app/(public)/histoire/page.tsx        → REMPLACE (ajoute le hero en haut)
  public/assets/site/...                    → NOUVEAU (images du hero)

(Le fichier prisma/SCHEMA_ADDITIONS.prisma est juste la copie des modèles
ajoutés, pour info — pas besoin de le copier, c'est déjà dans schema.prisma.)

──────────────────────────────────────────────────────────────────
2) APPLIQUER LA BASE DE DONNÉES  (terminal, dans le dossier vanguard/)
──────────────────────────────────────────────────────────────────
  npx prisma db push
  npx prisma generate

(Cela crée les tables GuildDebt et ReactionRole. Aucune donnée existante
n'est perdue.)

──────────────────────────────────────────────────────────────────
3) COMPLÉTER LE .env  (identifiants Discord — tu les as déjà)
──────────────────────────────────────────────────────────────────
Ouvre  vanguard/.env  et renseigne (voir .env.example pour la liste) :
  DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET,
  DISCORD_GUILD_ID, et les ROLE_* / CHANNEL_* utiles.

⚠️ DANS LE DISCORD DEVELOPER PORTAL → ton application → Bot :
   active les « Privileged Gateway Intents » :
     • SERVER MEMBERS INTENT      (pour attribuer les rôles)
     • (le reste est non-privilégié et déjà géré dans le code)
   Et dans « Bot → Reset Token » si besoin d'un nouveau token.

⚠️ HIÉRARCHIE DES RÔLES : dans Paramètres du serveur → Rôles, place le
   rôle du BOT AU-DESSUS des rôles qu'il doit donner (Arcaniste, Primat…),
   sinon Discord refuse l'attribution (c'est l'erreur rouge que tu avais
   sur MEE6).

──────────────────────────────────────────────────────────────────
4) LANCER
──────────────────────────────────────────────────────────────────
  npm run dev          → le site sur http://localhost:3000 (accueil = hero)
  npm run bot:deploy   → enregistre les commandes /dette /dettes /rolereaction…
  npm run bot          → démarre le bot

──────────────────────────────────────────────────────────────────
CE QUE FONT LES NOUVELLES COMMANDES
──────────────────────────────────────────────────────────────────
• /dette debiteur:@x objet:<ID ou nom> quantite:<n> [crediteur:@y] [note]
    → enregistre « @x doit (quantité) objet à @y » (créancier = toi par défaut).
    → poste un EMBED avec boutons et prévient le débiteur en message privé.

• Le DÉBITEUR clique « ✅ J'ai réglé » (ou /dette-payer en MP)
    → la dette passe « en attente de confirmation », le CRÉANCIER est notifié en MP.

• Le CRÉANCIER (et lui seul) clique « 👍 Confirmer le remboursement »
    → la dette est SOLDÉE. (Ou « 👎 Pas encore » pour la rouvrir.)

• /dettes [membre]
    → toutes les dettes en cours, ou le détail d'un membre (ce qu'il doit / ce qu'on lui doit).

• /rolereaction emoji:<✨> role:@Arcaniste [titre] [description] [image] [message_id]
    → crée un message d'embed avec une réaction = un rôle (façon MEE6).
    → relance avec message_id:<id> pour ajouter d'autres emoji→rôle au même message.
    → quand un membre réagit, il reçoit le rôle ; s'il retire sa réaction, le rôle est retiré.

──────────────────────────────────────────────────────────────────
FRONT (page d'accueil)
──────────────────────────────────────────────────────────────────
La page d'accueil affiche désormais un grand visuel « Flyff » :
fond cosmique + halo orange, personnages détourés, logo chauve-souris,
bouton Discord, et une brume de nuages qui monte au scroll avec le menu
(LES GARDIENS / HISTOIRE / GAMEPLAY). En dessous : tes sections existantes
(objectifs, fonctionnalités). Les images sont dans public/assets/site/.

Pour changer les personnages mis en avant : édite la constante CHARS en
haut de src/components/HeroFlyff.tsx (slayer, arcanist, templar, harlequin…).

──────────────────────────────────────────────────────────────────
POUR LE BUILDER (plus tard)
──────────────────────────────────────────────────────────────────
public/assets/site/wndqueryequip.png est le cadre d'inventaire du jeu
(extrait de WndQueryEquip.tga) : on l'utilisera pour habiller le builder
au look gameplay quand on le finalisera.

Un souci au lancement ? Copie-moi le message d'erreur exact, je corrige.
