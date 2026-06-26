# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:5000

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NODE_ENV=production

RUN pnpm build

# Production stage
FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

RUN apk add --no-cache curl

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD curl -f http://localhost:3000 || exit 1

CMD ["pnpm", "start"]
