# Use a imagem Node.js oficial, que já é bem leve
FROM node:20-alpine

ENV NODE_ENV=production

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
