# Vanguard — Backlog

Suivi des demandes du propriétaire, au fil de l'eau. Le bot est livré en premier, le site en partie 2.

## ✅ Bot V1 — LIVRÉ
- **Channel Décision** : `/candidature` → post forum à boutons (Accepter/Refuser/En attente/Entretien) dans `#✉️decisions`, tag auto **Candidatures**, MAJ base + audit + MP au candidat.
- **Relais site → bot** : les candidatures créées sur le site sont postées automatiquement dans le salon Décision.
- **Rôles par boutons** : `/panneau-classes` (8 classes) + `/boutonrole`.
- **Embed Builder** : `/embed creer / poster / editer / modeles`.
- **Giveaways** : `/giveaway creer / terminer / reroll / participants` + clôture auto.
- `/aide` à jour.

## ✅ Push autonome SITE — FAIT
- **Sécurité — bypass d'auth fermé** (`src/lib/access.ts`) : `DEV_ALL` actif uniquement si `DEV_ALL_ACCESS==="1"` ET hors production → fail-closed en prod.
- **Connecteur NextAuth créé** (`src/app/api/auth/[...nextauth]/route.ts`) → la vraie connexion Discord fonctionne (build OK).
- **Accès roles.ts** : déjà conforme (Officier/Général/Vanguard = admin, Vétéran/Guard = guilde) et branché sur les vrais IDs du `.env`.
- **Calculateur de prestige sur données RÉELLES** (`src/data/prestige.ts` + page) : vrais coûts P1→P10 (clés dynamiques), placeholders supprimés.
- **Catalogue d'objets importé** : 10 381 items du wiki → `public/data/items.json` (script `scripts/import-items.cjs`), `loadItems()` branché → recherche du coffre fonctionnelle, icônes via l'API Flyff.
- **CTA « Mets à jour ton build »** mis en évidence sur le dashboard → AirBuilder.
- **Polices de la charte** (Rajdhani + Inter) chargées (`src/app/layout.tsx`) — elles n'étaient jamais incluses.
- ✔️ Build de production vert.
- 👁️ **GuildViewer** (page admin `(admin)/guildviewer`) : suivi de tous les membres (persos, classes, builds, spés, dettes/absences) + recherche + filtre « à accompagner ». Ajouté à la nav admin + middleware.
- 💾 **AirBuilder — sauvegarde de build** : bouton « Mettre à jour mon build » → écrit un `GearProfile` lié à un perso (mode + config + bonus). **Boucle testée** : build sauvé → remonte dans le GuildViewer.
- 💬 **Page « Discord » (pilotage du bot depuis le site)** : Embed Builder, Giveaway, Panneau classes → file `BotCommand` (outbox) consommée par le bot (~12 s) ; cache des salons (`GuildChannel`) synchronisé par le bot pour les menus. **Boucle testée end-to-end** (embed posté depuis le site → `DONE`). Nav admin + middleware. Helpers factorisés (`classpanel.ts`, `createGiveaway`).
- 🔍 **Revue adversariale passée** : 12 bugs détectés **et tous corrigés** — dont une régression de sécu (le `middleware.ts` avait gardé le bypass fail-open, désormais durci comme `access.ts` via `src/lib/devAccess.ts`), le catalogue lu via cache, les giveaways (reroll après clôture + exclusion des anciens gagnants), `/boutonrole` (refus des menus), polices dans `<head>`, double-clic giveaway idempotent. Re-build vert.

- 📱 **UX mobile & toasts** : navigation **repliable sur mobile** (burger + drawer) ; `alert/prompt/confirm` de la page Personnages remplacés par **toasts + modales** (charte respectée).
- 📢 **Page Annonce** (admin) : rédige une annonce → publiée en embed par le bot.
- ⚙️ **Page Paramètres** : compte (pseudo / rôle / Discord ID) + préférences locales d'affichage.
- 🔍 **Revue adversariale lot 2** : 11 bugs confirmés + 6 trouvailles, **tous corrigés** — dont 2 ÉLEVÉS : **IDOR** `channelId` (le salon est validé en base) et **double-exécution** des commandes (garde anti-réentrance + tirage giveaway atomique). Plus : validation des enums gear (anti-500 & mass-assignment), rareté « Pré-mythique », URLs d'images, purge des salons supprimés. **Tests OK** (salon forgé→400, durée invalide→400, embed valide→201), re-build vert.

- 💰 **Repost des DETTES (site → bot)** : une demande de dette créée sur le site (`/api/debts`, statut `PENDING_VALIDATION`) est republiée par le bot dans **#decisions** (tag « Dettes ») avec boutons **Accepter / Refuser / Marquer remboursée** → MAJ statut + audit + MP au débiteur. **Boucle testée.** *(Les candidatures étaient déjà republiées : #candidatures via webhook + #decisions via le bot.)*

## 🔜 Partie 2 — SITE (reste à faire)
- **AirBuilder — vraies stats de combat** : brancher `src/lib/stats.ts` (PV/attaque/crit) au builder (actuellement somme de bonus bruts seulement). Nécessite les constantes AirFlyff + l'allocation de stats de base.
- **Données d'armure builder** : `builder-data.json` ne contient que les armures Shaïtan/Dryade → les paliers Yggdrasil/Éternel donnent une grille vide. Compléter le JSON ou masquer ces paliers.
- **Régénérer secrets/`.env`** avant prod (token + client secret exposés en dev).
- Intégrer les **bannières de titre** (images fournies) comme en-têtes de page. *(Nav mobile repliable + toasts : ✅ faits.)*
- `flyff-theme.css` existe mais non importé (globals.css a déjà le thème — vérifier s'il apporte un plus).

## 📝 Précisions du proprio (flux candidature/profil — partie SITE)
- **Candidature = via le SITE uniquement** (pas de commande bot). Flux public : connexion Discord OAuth → créer perso « Pseudo Main » (le pseudo Discord « Gérer pseudo » devient le main) → **création obligatoire du Stuff Build (AirBuilder)** → autres persos (facultatif) + leur build → bouton « Soumettre ma candidature » → confirmation → **repost sur `#✉️decisions` ET `#📄candidatures`**.
  - *(La commande `/candidature` du bot reste seulement pour TESTER le salon Décision tant que le site n'existe pas ; à retirer quand le site gère la candidature.)*
  - *(À faire côté relais bot : poster aussi dans `#candidatures`, pas seulement `#decisions`.)*
  - **✅ Parcours candidature vérifié (page `(public)/candidature`) + 3 corrections :** (1) **connexion Discord exigée d'abord** (gate avant le formulaire) ; (2) **build réellement obligatoire** — la case contournable est retirée, il faut un vrai export depuis le builder ; (3) **message de succès honnête** (#decisions sous ~2 min ; plus de fausse promesse #candidatures).
  - **Reste (écarts spec, non corrigés) :** (#4) **reprise candidature → vrais `Character`/`GearProfile`** à l'acceptation (à cadrer avec le proprio) ; (#5) la candidature utilise `/builder.html` (statique) et non l'AirBuilder React ; (#6) `WIKI_URL` = placeholder `wiki.airflyff.com` ; webhook `DISCORD_CANDIDATURES_WEBHOOK` vide (à remplir si on veut un post #candidatures).
- **Guild & Owner/Admin** : connexion OAuth → mettre à jour mon/mes perso(s) (repris de la candidature si dispo, sinon obligatoire) → autres persos (facultatif) → mise à jour du Stuff Build (AirBuilder) → **axes d'amélioration**.
- But final : faire **remonter les infos des membres sur le GuildViewer**.

## ✅ Bonus bot — FAIT
- Rappel automatique d'échéance des dettes (MP débiteur + récap retards staff, toutes les 6 h).

## 💡 Bonus bot (optionnel, plus tard)
- Bouton « Demander plus d'infos » sur les candidatures.
- Synchro automatique classe ↔ rôle Discord (déclenchée par le site quand le membre déclare ses classes).

## 🔐 Avant la prod
- Régénérer `DISCORD_BOT_TOKEN` + `DISCORD_CLIENT_SECRET` (exposés en clair pendant le dev).
- Déploiement VPS + domaine (~65 €/an) pour le 24/7.
