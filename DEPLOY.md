# 🚀 Déploiement — VPS (Docker)

Déploie **PostgreSQL + le site + le bot** en conteneurs, derrière **Nginx Proxy Manager** (domaine + SSL).

## Prérequis (déjà en place sur le VPS)
Ubuntu · Docker + Docker Compose · Portainer · Nginx Proxy Manager · UFW.

## À avoir sous la main
- Un **domaine** (ou sous-domaine) pointé en `A` vers l'IP du VPS.
- Les **secrets Discord de prod** : `DISCORD_CLIENT_ID/SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, les IDs de salons et de rôles.

---

## 1) Se connecter + récupérer le code
```bash
ssh vanguard           # ou: ssh vanguard-dev@<IP>
git clone https://github.com/maximedespaux/vanguardmmo.git vanguard
cd vanguard
```
> Si le repo est **privé** : ajouter la clé SSH du VPS comme *Deploy key* sur GitHub
> (`ssh-keygen -t ed25519` sur le VPS → coller la `.pub` dans repo ▸ Settings ▸ Deploy keys),
> puis cloner via `git@github.com:maximedespaux/vanguardmmo.git`.

## 2) Configurer le `.env`
```bash
cp .env.prod.example .env
nano .env
```
Remplir : mot de passe Postgres (3 endroits cohérents : `POSTGRES_PASSWORD` **et** dans `DATABASE_URL`),
`NEXTAUTH_URL=https://LE-DOMAINE`, `NEXTAUTH_SECRET` (`openssl rand -base64 32`), et tous les secrets/IDs Discord.

## 3) Lancer
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Ça construit l'image, démarre `db`, applique le schéma (`migrate`), puis lance `web` (port 3000) + `bot`.

## 4) Enregistrer les commandes du bot (une seule fois)
```bash
docker compose -f docker-compose.prod.yml run --rm bot npx tsx bot/deploy-commands.ts
```

## 5) Domaine + SSL (Nginx Proxy Manager)
1. **UFW** : ouvrir les ports web →
   ```bash
   sudo ufw allow 80
   sudo ufw allow 443
   ```
2. Dans **NPM** ▸ *Proxy Hosts* ▸ *Add* :
   - Domain : `LE-DOMAINE`
   - Forward Hostname/IP : l'IP du VPS (ou la passerelle Docker `172.17.0.1`) · Port : `3000` · Scheme : `http`
   - Onglet **SSL** : *Request a new certificate* (Let's Encrypt) + *Force SSL*.

## 6) Discord (portail développeur)
Dans l'app Discord ▸ OAuth2 ▸ *Redirects*, ajouter :
```
https://LE-DOMAINE/api/auth/callback/discord
```

## 7) Vérifier
Ouvre `https://LE-DOMAINE` → connexion Discord → tu arrives sur le site.

---

## Commandes utiles
```bash
# Voir les logs
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f bot

# Redémarrer un service
docker compose -f docker-compose.prod.yml restart web

# Mettre à jour après un git push
git pull
docker compose -f docker-compose.prod.yml up -d --build

# Sauvegarde de la base
docker compose -f docker-compose.prod.yml exec db pg_dump -U vanguard vanguard > backup_$(date +%F).sql
```

## Sécurité
- Le `.env` reste sur le serveur uniquement (jamais committé).
- Régénérer le **token du bot** et la **clé secrète Discord** s'ils ont été partagés en clair.
- Changer les mots de passe du compte Linux / Portainer après l'installation.
