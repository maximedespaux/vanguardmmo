# Image unique pour le site (next start) ET le bot (tsx bot/index.ts).
FROM node:20-bookworm-slim AS app
WORKDIR /app

# openssl : requis par le moteur Prisma.
# fontconfig : l'image du débrief des Chambres (sharp, Pango — src/lib/seance-image.ts) trouve
# ses polices par fontconfig. Sans lui, ni Cinzel ni Athiti : Pango retombe sur une autre police
# SANS AUCUNE ERREUR (SPEC-CHAMBRES-RECENSEMENT, piège n° 8). L'image de base n'a ni fontconfig
# ni police.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl fontconfig \
  && rm -rf /var/lib/apt/lists/*

# Les polices GENESIS de l'image du débrief, installées pour fontconfig (le code les charge aussi
# par fichier, depuis public/fonts : les deux chemins mènent aux mêmes fichiers). Cinzel est une
# police VARIABLE : un seul fichier porte toutes ses graisses. Couche à part, avant les
# dépendances : elle ne se refait que si une police change.
COPY public/fonts/Cinzel-VariableFont_wght.ttf public/fonts/Athiti-*.ttf /usr/local/share/fonts/genesis/
RUN fc-cache -f

# Dépendances (couche cachée tant que package.json ne change pas)
# Le schéma Prisma est copié AVANT `npm ci` car le postinstall lance `prisma generate`.
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# Source + génération Prisma + build Next
COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# La commande réelle est fournie par docker-compose (web = npm start, bot = tsx).
CMD ["npm", "start"]
