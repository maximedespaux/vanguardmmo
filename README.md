# 🦉 Vanguard Control Center

Plateforme de gestion de la guilde **Vanguard** sur le serveur privé **AirFlyff**.
Un **site web** (Next.js 15) + un **bot Discord** (discord.js) qui partagent **une seule base PostgreSQL** et communiquent via celle-ci.

Connexion **Discord OAuth**, accès **par rôle** (Public / Membre / Staff), le tout en français.

---

## ✨ Fonctionnalités

### 🌐 Le site
**Public**
- **Accueil / Histoire** — présentation de la guilde + connexion Discord
- **Candidature** — formulaire complet (profil, persos, stuff, quiz) relayé sur Discord

**Espace membre**
- **Dashboard** — vue d'ensemble de la guilde en temps réel
- **AirBuilder** — créateur de build (classe, équipement, perçage, sertissage, runes, sets, fées, familiers…)
- **Banque** — demandes d'achat (−20 %) ou de dette, liées au coffre, validées sur Discord
- **Guides** — guide de progression + **calculateur de prestige**
- **PvE** — suivi des donjons + World Boss
- **Chambres Secrètes** — compositions d'équipe (reset auto mer./dim. 22h)
- **Personnages**, **Échanges**, **Paramètres**

**Espace staff (admin)**
- **GuildViewer** — suivi des membres, persos, builds et spécialisations
- **AirGuild** — coffre de guilde par membre, journal des mouvements, dettes, recettes
- **Plan de farm** — déficits du coffre croisés avec les classes des membres
- **Banque (gestion)**, **Candidatures**, **World Boss**, **Annonces**
- **Discord** — pilotage du bot (embeds, giveaways, panneau de classes) + **Événements** (édités sur le site, lus par le bot)

### 🤖 Le bot Discord
14 commandes slash, salon **#decisions** (validation candidatures/dettes/banque en 1 clic + MP au membre), relais automatiques site → Discord, rappels (candidatures, dettes, **événements de jeu**), giveaways avec tirage auto, auto-attribution des rôles de classe.
👉 Détails dans [`bot/README.md`](bot/README.md).

---

## 🛠️ Stack technique
- **Next.js 15** (App Router) · **React 18** · **TypeScript**
- **PostgreSQL** + **Prisma** (ORM)
- **NextAuth** (Discord OAuth)
- **discord.js v14** + **node-cron** (le bot)

---

## 📦 Prérequis
- **Node.js 18+**
- **Docker** (pour la base PostgreSQL en local) — ou un PostgreSQL existant
- Une **application Discord** (portail développeur) avec un bot

---

## 🚀 Installation locale

```bash
# 1) Dépendances
npm install

# 2) Variables d'environnement
cp .env.example .env
#   → remplis les valeurs (voir la section ci-dessous)

# 3) Base de données (PostgreSQL via Docker, port 5434)
docker compose up -d
npm run db:push          # crée les tables depuis prisma/schema.prisma

# 4) Lancer le site
npm run dev              # → http://localhost:3000

# 5) (optionnel) Lancer le bot, dans un autre terminal
npm run bot:deploy       # enregistre les commandes slash (une fois)
npm run bot              # démarre le bot
```

> 💡 **Mode dev local** : mets `DEV_ALL_ACCESS=1` et `NEXT_PUBLIC_DEV_ALL_ACCESS=1` dans `.env` pour bypasser la connexion Discord et accéder à tout (désactivé automatiquement en prod).

---

## 🔑 Variables d'environnement (`.env`)

```bash
# Base de données (partagée site + bot)
DATABASE_URL="postgresql://USER:PASS@localhost:5434/vanguard"

# NextAuth (site)
NEXTAUTH_URL="http://localhost:3000"      # en prod : l'URL du domaine
NEXTAUTH_SECRET="..."                     # openssl rand -base64 32

# Discord — application (OAuth du site)
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."

# Discord — bot
DISCORD_BOT_TOKEN="..."
DISCORD_GUILD_ID="..."                    # id du serveur

# Salons (clic droit → Copier l'identifiant ; ⚠️ #decisions & #candidatures = FORUM)
CHANNEL_DECISION="..."
CHANNEL_CANDIDATURES="..."
CHANNEL_STAFF="..."
CHANNEL_EVENTS="..."

# Rôles — rangs (accès) + classes + spécialisations
ROLE_DIRECTION / ROLE_VANGUARD / ROLE_GENERAL / ROLE_OFFICIER / ROLE_VETERAN / ROLE_GUARD
ROLE_CLASSE_SPADASSIN … ROLE_CLASSE_CHANOINE
ROLE_SPEC_CHAMBRES_SECRETES / ROLE_SPEC_PVE / ROLE_SPEC_PVP

# Dev local uniquement (jamais en prod)
DEV_ALL_ACCESS="1"
NEXT_PUBLIC_DEV_ALL_ACCESS="1"
```

---

## 🔐 Accès par rôle (vérifié côté serveur)
- **Public** : tout le monde (après connexion Discord)
- **Membre** : 👑 Vanguard · 🧭 Général · 🔥 Officier · 📋 Vétéran · ⚔️ Guard
- **Staff / Admin** : 👑 Vanguard · 🧭 Général · 🔥 Officier

Les accès refusés sont redirigés vers `/login?error=...` (pages d'erreur personnalisées : 404, erreur, accès refusé).

---

## 🗂️ Structure

```
src/app/
  (auth)/login              Connexion Discord
  (public)/histoire         Accueil / histoire
  (public)/candidature      Formulaire de candidature
  (guild)/dashboard         Tableau de bord guilde
  (guild)/builder           AirBuilder (créateur de build)
  (guild)/dettes            Banque (requêtes membre)
  (guild)/astuces           Guides + (sous-onglet) prestige
  (guild)/donjons · worldboss · compositions · personnages · echanges · parametres
  (admin)/guildviewer       Suivi des membres
  (admin)/coffre            AirGuild (coffre de guilde)
  (admin)/plan-farm         Plan de farm (déficits)
  (admin)/gestion-dettes · candidatures · gestion-worldboss · annonce · discord · events
  api/...                   Routes API (auth, characters, debts, bank-request, coffre, airguild, events, dashboard…)

bot/                        Bot Discord (commandes, planificateur, décisions) — voir bot/README.md
prisma/schema.prisma        Modèle de données
public/airbuilder · airguild   Apps embarquées (données + icônes)
```

---

## 🌐 Déploiement (prod)

1. Cloner le repo sur le serveur (VPS Ubuntu recommandé).
2. `npm install` puis créer un `.env` de prod (à partir de `.env.example`) :
   - **Régénérer** le token du bot + la clé secrète Discord, générer un `NEXTAUTH_SECRET` aléatoire.
   - `NEXTAUTH_URL` = l'URL du domaine ; ajouter cette URL de redirection OAuth dans le portail Discord.
   - **Ne jamais** mettre `DEV_ALL_ACCESS` en prod.
3. Base : `npm run db:push` (sur le PostgreSQL de prod).
4. Build + service : `npm run build` puis `npm run start` (site), et le bot en service permanent (`npm run bot`).

---

## ⚠️ Sécurité
- Le fichier **`.env` n'est jamais versionné** (il est dans `.gitignore`) — seul `.env.example` (vide) l'est.
- **Régénère** le `DISCORD_CLIENT_SECRET` et le `DISCORD_BOT_TOKEN` avant la mise en production si jamais ils ont été partagés en clair.

---

*Site + bot par syko, pour la guilde Vanguard (AirFlyff).*
