# Patch schéma — 1 ligne à ajouter

Dans `prisma/schema.prisma`, modèle `Application`, ajoute (ex. sous `quizTotal`) :

```prisma
  build       Json?             // build exporté depuis le Stuff Builder
```

Puis applique :
```bash
npx prisma db push && npx prisma generate
```
