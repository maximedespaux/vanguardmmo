# 🏛️ Architecture — Auth & Données (Vanguard Control Center)

## Principe
Connexion Discord → on récupère le `discordId` + les **rôles Discord en live** → on crée/met à jour le `User` en base → session JWT → **toutes les données sont reliées à `User.id`**. Le bot Discord retrouve le même utilisateur via `discordId`.

```
Login Discord → discordId + rôles → upsert User → session JWT → données liées à User.id
```

## Mise en route (avec base de données)

```bash
pnpm install                      # installe + génère le client Prisma (postinstall)
cp .env.example .env              # remplis Discord + garde DEV_ALL_ACCESS="1" pour tester en local

docker compose up -d              # PostgreSQL (port 5432)
pnpm db:push                      # crée les tables
pnpm db:seed                      # (optionnel) importe les items du coffre

pnpm dev                          # http://localhost:3000
```

> **Localhost = production** : avec `DEV_ALL_ACCESS="1"`, un vrai `User` "dev" (rôle Direction) est créé en base et utilisé comme s'il était connecté. Les données créées sont réelles et persistées. Passe à `"0"` pour exiger la vraie connexion Discord + vérification des rôles.

## Rôles & accès (source de vérité = Discord, en live)
- **Public** : tous. **Guilde** : Guard→Direction. **Admin (bras droits)** : Officier→Direction.
- Gating : `src/middleware.ts` (pages) + `requireGuild()/requireAdmin()` (layouts) + `apiAuth()/apiRole()` (API).

## Helpers d'auth (`src/lib/access.ts`)
- `getCurrentUser()` → l'utilisateur en base (ou null).
- `requireAuth()` / `requireRole(roles)` / `requireGuild()` / `requireAdmin()` → pour les Server Components (redirigent).
- `apiAuth()` / `apiRole(roles)` → pour les API routes (renvoient 401/403).

## API (toutes protégées, filtrées par `userId`)
| Route | Méthode | Accès | Effet |
|---|---|---|---|
| `/api/characters` | GET | connecté | **mes** personnages (+ stuffs + spés) |
| `/api/characters` | POST | connecté | crée un perso **lié à moi** |
| `/api/characters/[id]` | GET/PATCH/DELETE | propriétaire | mon perso |
| `/api/characters/[id]/gear` | GET/POST | propriétaire | stuffs du perso |
| `/api/gear/[id]` | PATCH/DELETE | propriétaire | un stuff |
| `/api/specializations` | POST | propriétaire | note de spé (upsert) |
| `/api/absences` | GET/POST | connecté (`?all=1` = officiers) | mes absences |
| `/api/transactions` | GET/POST | connecté (`?all=1` = officiers) | mes dettes |
| `/api/transactions/[id]` | PATCH | **officiers+** | accepter/négocier/rembourser |
| `/api/admin/users` | GET | **officiers+** | tous les membres + persos (suivi guilde) |

**Règle d'or** : aucune donnée n'est créée sans `userId` (ou `characterId` qui remonte à un `userId`).

## Le bot Discord
Le bot (discord.js) utilise le **même `discordId`** : `prisma.user.findUnique({ where: { discordId } })` pour retrouver le membre et ses persos/dettes. La candidature est postée via webhook (`/api/application`).

## Flux personnage → stuff → suivi
1. **Mes Personnages** : crée le perso (nom, classe, prestige, niveau).
2. Ajoute un ou plusieurs **stuffs** (DPS / Tank / Hybride).
3. **Builder → Suivi & axes** : sélectionne le perso existant → ses stuffs + notes d'optimisation par spé → axes prioritaires.
