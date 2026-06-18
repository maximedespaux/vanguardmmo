# 🦉 Vanguard Control Center

Site complet de gestion de la guilde **Vanguard** (AirFlyff) — application Next.js unique.
Login Discord · accès par rôles · 3 espaces (Public / Guilde / Admin).

## 🚀 Lancer (3 étapes)

```bash
# 1) Installer
pnpm install        # ou: npm install

# 2) Configurer Discord
cp .env.example .env
#   → remplis : DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_GUILD_ID,
#     NEXTAUTH_SECRET (openssl rand -base64 32),
#     les IDs de rôles (ROLE_*), et le webhook #candidatures.

# 3) Démarrer
pnpm dev            # → http://localhost:3000
```

C'est tout. **Aucun bot séparé à lancer** : la candidature est postée dans #candidatures via un **webhook Discord** (une simple URL dans `.env`).

## 🔐 Accès par rôle (vérifié côté serveur)
- **Public** : tous (connectés Discord)
- **Guilde** : 👑 Vanguard · 🧭 Général · 🔥 Officier · 📋 Vétéran · ⚔️ Guard
- **Admin** : 👑 Vanguard · 🧭 Général · 🔥 Officier

## 🗂️ Tout est dans une seule app (src/app)
```
(auth)/login              Login Discord obligatoire
(public)/candidature      Profil + persos OU build + quiz obligatoire → #candidatures
(public)/histoire         Histoire, objectifs, fonctionnalités
(public)/quiz             Quiz de connaissance du serveur
(guild)/builder           Stuff Builder (rareté armes incluse)
(guild)/suivi             Suivi & axes d'amélioration (code couleur)
(guild)/prestige          Calculateur de prestige
(guild)/astuces           Guide Sugot + wiki des 23 donjons
(guild)/compositions      Compos Chambres Secrètes + GvG
(admin)/coffre            Coffre de guilde (123 items réels)
(admin)/rapports          Rapport d'instances + récap loots par donjon
api/auth/[...nextauth]    OAuth Discord + récupération des rôles
api/application           Soumission candidature → webhook #candidatures
```

## 🗄️ Base de données (OPTIONNELLE)
L'app tourne **sans base** (les données persos/donjons/coffre/quiz sont dans `src/data`).
Pour activer la persistance (candidatures, rapports, loadouts) :
```bash
docker compose up -d        # PostgreSQL
pnpm db:push                # crée les tables (prisma/schema.prisma)
pnpm db:seed                # importe les 123 items du coffre
```

## ⚠️ Sécurité
Régénère ton **DISCORD_CLIENT_SECRET** dans le portail développeur Discord (l'ancien a été exposé).

## 📌 Note
Le Stuff Builder et le wiki donjons sont dans `public/*.html` (intégrés en iframe sur `/builder` et `/astuces`). Tout le reste est en React natif.
