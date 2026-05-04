# Use a imagem Node.js oficial
FROM node:20-alpine

# Define o diretório de trabalho
WORKDIR /app

# Copia package.json e pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Instala pnpm globalmente
RUN npm install -g pnpm

# Instala as dependências
RUN pnpm install --frozen-lockfile

# Copia o código da aplicação
COPY . .

# Expõe a porta 5000
EXPOSE 5000

# Comando para rodar o servidor
CMD ["node", "server.js"]
