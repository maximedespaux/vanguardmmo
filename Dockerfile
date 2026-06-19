# Image unique pour le site (next start) ET le bot (tsx bot/index.ts).
FROM node:20-bookworm-slim AS app
WORKDIR /app

# openssl : requis par le moteur Prisma
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

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
