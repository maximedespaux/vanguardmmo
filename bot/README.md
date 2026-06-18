# 🦉 Bot Discord Vanguard

Le bot et le site partagent **la même base PostgreSQL**. Ils ne se parlent jamais
directement : ils lisent/écrivent tous les deux dans la base. Le site dépose des
« ordres » dans la table `BotCommand` (file d'attente) et des demandes
(candidatures, dettes, requêtes banque) ; le bot les consomme et agit sur Discord.

## En deux mots
- **Salon Décision** (`#decisions`, type *forum*) : dès qu'une candidature / dette /
  requête banque est créée — sur le **site** ou via le **bot** — le bot poste un
  **embed avec boutons** dans ce salon. Le staff valide/refuse en un clic → le
  résultat repart en base **et** un MP part au membre concerné.
- **Pilotage depuis le site** : la page *Administration → Discord* envoie des
  commandes (poster un embed, lancer un giveaway, poster le panneau de classes) que
  le bot exécute dans les ~12 s.
- **Rappels automatiques** : candidatures en attente, dettes à échéance, événements du jeu.

---

## Ce que fait le bot

### Commandes slash
| Commande | Rôle |
|---|---|
| `/aide` | Liste les commandes |
| `/mesperso` | Affiche tes personnages enregistrés sur le site |
| `/coffre [catégorie]` | État du coffre de guilde (🟢 / 🟡 / 🔴) |
| `/absence <début> <fin> [raison]` | Déclare une absence (enregistrée en base) |
| `/candidature` | Postuler à la guilde depuis Discord |
| `/dette` | Déclarer une dette envers un autre membre |
| `/dettes` | Lister tes dettes en cours |
| `/dette-payer` | Signaler qu'une dette est réglée (le créancier confirme) |
| `/dette-supprimer` | Supprimer une de tes dettes |
| `/embed` | Construire et poster un embed |
| `/giveaway` | Lancer un giveaway (bouton *Participer* + tirage auto) |
| `/panneau-classes` | Poster le panneau d'auto-attribution des 8 classes |
| `/boutonrole` | Créer un message à **boutons** de rôle |
| `/rolereaction` | Créer un message à **rôle-réaction** (emoji → rôle) |

### Boutons gérés
- **Dettes entre membres** : payé / annuler / confirmer / refuser (MP automatiques aux deux parties).
- **Décisions staff** (dans `#decisions`) : accepter / refuser / attente / entretien pour les
  candidatures, accepter/refuser/remboursé pour les dettes membre↔guilde, et refus d'une requête
  banque (⚠️ l'**acceptation avec prix** se fait sur le site → *Banque (gestion)*).
- **Rôles** : un clic ajoute/retire le rôle (boutons + réactions).
- **Giveaway** : *Participer* (toggle).

### Rappels & relais automatiques (planificateur)
- Candidatures en attente depuis +24 h → relance du staff (toutes les 2 h).
- Relais **site → `#decisions`** des nouvelles candidatures / dettes / requêtes banque (toutes les 2 min).
- Dettes acceptées proches de l'échéance → MP au membre + récap staff (toutes les 6 h).
- Clôture des giveaways arrivés à terme (chaque minute).
- **Événements du jeu** → annonce + rappel « X min avant » (à configurer, voir plus bas).

---

## Configuration — fichier `.env` (à la racine de `vanguard`, partagé avec le site)

> Pour copier un ID : Discord → Paramètres → Avancés → **Mode développeur**, puis
> clic droit sur le salon / rôle / serveur → **Copier l'identifiant**.

```
# ── Identité du bot ──
DISCORD_BOT_TOKEN="…"        # onglet Bot → Reset Token
DISCORD_CLIENT_ID="…"        # ID de l'application
DISCORD_GUILD_ID="…"         # ID du serveur

# ── Salons où le bot poste ──
CHANNEL_DECISION="…"         # ⚠️ FORUM — embeds à boutons (candidatures/dettes/banque)
CHANNEL_CANDIDATURES="…"     # ⚠️ FORUM — relances de candidatures
CHANNEL_STAFF="…"            # salon officiers (récaps internes)
CHANNEL_EVENTS="…"           # salon des annonces d'événements du jeu

# ── Rôles : rangs (accès + pings staff) ──
ROLE_DIRECTION / ROLE_VANGUARD / ROLE_GENERAL / ROLE_OFFICIER / ROLE_VETERAN / ROLE_GUARD

# ── Rôles : 8 classes (panneau d'auto-attribution) ──
ROLE_CLASSE_SPADASSIN … ROLE_CLASSE_CHANOINE

# ── Rôles : spécialisations ──
ROLE_SPEC_CHAMBRES_SECRETES / ROLE_SPEC_PVE / ROLE_SPEC_PVP

# ── Base de données (la même que le site) ──
DATABASE_URL="postgresql://…"
```

Le **bot doit pouvoir** : *Envoyer des messages*, *Intégrer des liens*, *Gérer les rôles*
(pour le panneau de classes / les boutons de rôle), et **créer des posts** dans les deux
salons *forum* (`#decisions`, `#candidatures`). Le rôle du bot doit être **au-dessus** des
rôles qu'il distribue dans la liste des rôles du serveur.

---

## 📅 Configurer les événements du jeu

AirFlyff n'a pas d'API : le calendrier se renseigne **à la main**, une fois (il change
rarement). Ouvre [`bot/config.ts`](config.ts) → tableau `EVENTS`. Une ligne par événement
récurrent :

```ts
export const EVENTS: GameEvent[] = [
  { name: "Chambres Secrètes", day: "mardi",  time: "21:00", remindBefore: 15, mention: "@here" },
  { name: "GvG",               day: "samedi", time: "21:00", remindBefore: 30, mention: "@everyone" },
  { name: "Reset quotidien",   day: "tous",   time: "06:00", remindBefore: 0,  mention: "" },
];
```

- `day` : `"lundi"` … `"dimanche"`, ou `"tous"` (quotidien)
- `time` : `"HH:MM"` (heure de **Paris**)
- `remindBefore` : minutes de rappel **avant** (`0` = pas de rappel avancé)
- `mention` : `"@here"` | `"@everyone"` | `"<@&ID_DU_ROLE>"` | `""` (rien)
- `channelId` *(optionnel)* : vide = `CHANNEL_EVENTS`, sinon un salon précis

> Après modification : relance le bot (`Ctrl+C` puis `npm run bot`).

---

## Installation & lancement

> Toujours se placer dans le dossier `vanguard` avant toute commande.

```
1. Dépendances          →  npm install
2. Base à jour          →  npm run db:push
3. Enregistrer les cmds →  npm run bot:deploy   (à refaire après tout ajout/retrait de commande)
4. Lancer le bot        →  npm run bot          (laisse la fenêtre ouverte : tant qu'elle tourne, le bot est en ligne)
```

---

## Mise en production (checklist)

- [ ] **Régénérer** le `DISCORD_BOT_TOKEN` et la clé secrète sur le portail Discord
      (ils ont circulé en clair pendant le dev) puis mettre à jour le `.env`.
- [ ] Renseigner le tableau `EVENTS` avec le vrai calendrier AirFlyff.
- [ ] Vérifier les permissions du bot (rôles + posts forum) sur le serveur.
- [ ] Faire tourner le bot **24/7** (VPS) au lieu d'une fenêtre locale.

## Ajouter une commande plus tard
1. Crée `bot/commands/maCommande.ts` (copie une commande existante comme modèle).
2. Ajoute-la dans `bot/commands/index.ts`.
3. `npm run bot:deploy` puis `npm run bot`.
