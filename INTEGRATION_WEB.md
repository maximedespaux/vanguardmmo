# Vanguard — Finalisation du site (builder complet + candidature ↔ build + thème)

## 1. Stuff Builder complet → `public/builder.html` (remplace)
Données réelles AirFlyff + tout calculé :
- 📊 **Stats totales du build** (sous l'inventaire) : équipement + perçage + sertissage + forge.
- 🃏 **Cartes de perçage** : arme **10** emplacements, armure **4** — A=7% / S=10%, comptées
  en « Perçage arme (élém.) % » / « Perçage armure % ».
- 💎 **Sertissage arme** : gemmes Ultimate réelles (9 stats, valeurs Diamant max) — **5 emplacements,
  8 si Artefact** (+3).
- 💠 **Sertissage costume** : gemmes réelles, « Dégâts critiques » et « Dégâts magiques % »
  marquées **torse uniquement**.
- ⬆️ **Forge +N** : Attaque % via le scaling serveur (estimation au-delà de +10, noté dans l'UI).
- 💾 **Enregistrer / Exporter** : sauvegarde auto (localStorage) + export JSON + transmission
  automatique à la candidature.

## 2. Candidature ↔ build
- `src/app/(public)/candidature/page.tsx` (remplace) : détecte automatiquement le dernier build
  exporté, l'affiche (✅ Build détecté…) et le joint à la candidature.
- `src/app/api/application/route.ts` (remplace) : stocke `build` en base + l'ajoute à l'embed Discord
  (#candidatures) avec le top 5 des stats.
- `prisma/PATCH_SCHEMA.md` : **1 ligne** à ajouter au modèle `Application` (`build Json?`)
  puis `npx prisma db push && npx prisma generate`.

## 3. Thème Flyff (optionnel) → `src/flyff-theme.css`
Halo orange + grille discrète, glow sur les cartes, scrollbar, trait orangé sous les h1,
classe `.class-badge` pour les logos `/classes/*.png` déjà dans ton public/.
Activer : `@import "../flyff-theme.css";` en haut de `src/app/globals.css`.

## Ordre d'installation
1. Copier les fichiers (3 remplacements + 1 css).
2. Ajouter la ligne au schéma + `npx prisma db push && npx prisma generate`.
3. `npm run dev` → tester /builder puis /candidature.
