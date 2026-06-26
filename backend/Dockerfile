# Use a imagem Node.js oficial, que já é bem leve
FROM node:20-alpine

ENV NODE_ENV=production

# Instala ferramentas de runtime usadas pelo healthcheck e pelo wait do container
RUN apk add --no-cache curl netcat-openbsd

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
