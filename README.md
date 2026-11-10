# FeedBackCELL

![Docker](https://img.shields.io/badge/docker-ready-blue)
![Java](https://img.shields.io/badge/java-21-orange)
![Spring Boot](https://img.shields.io/badge/spring%20boot-core--api-green)
![Quarkus](https://img.shields.io/badge/quarkus-specs--service-blue)
![Next.js](https://img.shields.io/badge/next.js-16-black)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

Plataforma full-stack de feedback sobre celulares: frontend **Next.js**, API **Spring Boot** (core-api), serviço de especificações **Quarkus** (specs-service), **MySQL** e **Redis**, tudo orquestrado com **Docker Compose** atrás de um proxy **Nginx**.

---

## 📖 Sobre

FeedBackCELL é um projeto full-stack educacional para coletar avaliações e opiniões sobre celulares. Usuários cadastrados publicam celulares (com fotos e especificações preenchidas automaticamente), comentam e gerenciam seus próprios itens.

## ✨ Funcionalidades

- [x] Cadastro, login, logout no cliente e verificação de token JWT.
- [x] CRUD de celulares com checagem de propriedade, paginação e fotos (até 5 MB cada).
- [x] Especificações automáticas: ao criar um celular, o core-api pede em segundo plano (HTTP interno, `POST /eventos/celular-criado`) que o specs-service busque o que falta e aplica a resposta no banco. Também há busca síncrona em `/celulares/especificacoes`.
- [x] Comentários por celular e listagem dos comentários do usuário.
- [x] Perfil, troca de senha, exclusão de conta e listagem de usuários restrita a administradores.
- [x] Rate limiting compartilhado entre réplicas (Redis) e validação de entrada na API.

---

## 🧱 Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16, TypeScript |
| API pública (`core-api`, :8080) | Java 21, Spring Boot, Flyway |
| Especificações (`specs-service`, :8081, interno) | Java 21, Quarkus, SmallRye Reactive Messaging |
| Banco de dados | MySQL 8.0 |
| Rate limit | Redis 7.4 |
| Proxy | Nginx 1.28 |

### Fluxo

```text
navegador ──► proxy (nginx :80, publicado em APP_PORT)
                ├── /          ──► frontend (Next.js :3000)
                ├── /api/*     ──► core-api (:8080) ──► MySQL, Redis
                └── /health, /readyz ──► core-api
core-api ──► HTTP interno ──► specs-service (busca síncrona, até 30 s)
core-api ──► HTTP interno, em segundo plano ──► specs-service (celular criado → especificações)
```

O specs-service não publica portas nem passa pelo proxy.

---

## 📁 Estrutura do Projeto

```text
.
├── frontend/                  # Next.js (App Router + TypeScript)
├── backend/
│   ├── core-api/              # Spring Boot: API pública + migrações Flyway
│   └── specs-service/         # Quarkus: busca de especificações (HTTP interno)
├── infra/
│   ├── nginx/default.conf     # Proxy reverso (headers de segurança, gzip, timeouts)
│   └── backup/                # Imagem e script de backup do MySQL
├── docker-compose.yml         # Stack de produção (só o proxy publica porta)
├── docker-compose.dev.yml     # Extra de dev: MySQL/Redis em 127.0.0.1
├── docker-compose.https.yml   # Extra de produção: HTTPS com Let's Encrypt no nginx
├── .env.example               # Modelo de variáveis; copiar para .env
└── README.md
```

---

## 🚀 Início Rápido

### Requisitos

* Docker Desktop (ou Docker Engine + Compose v2.24+)
* Java 21 e Node.js 20+ com pnpm (opcional, para desenvolvimento fora do Docker)

### Executar o projeto

Copie `.env.example` para `.env` e substitua as senhas e chaves de exemplo por valores fortes. Não compartilhe nem versione o `.env`. O Compose recusa subir se `DB_USER`, `DB_PASSWORD`, `DB_NAME` ou `JWT_SECRET` estiverem vazios.

```bash
docker compose up -d --build
```

Na primeira subida o core-api cria o schema com Flyway; em bancos que já existiam (criados pelo antigo backend Node) o Flyway faz baseline e aplica só as migrações seguintes.

### Serviços

* Aplicação (frontend e API pelo proxy) → http://localhost:3000
* API → http://localhost:3000/api
* Saúde → http://localhost:3000/health (liveness) e http://localhost:3000/readyz (prontidão: banco, Redis)

Em produção nenhum outro serviço fica acessível do host. Para desenvolvimento, `docker-compose.dev.yml` publica MySQL em `127.0.0.1:3307` e Redis em `127.0.0.1:6379`:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mysql redis
```

O arquivo de dev não se chama `docker-compose.override.yml` de propósito: esse nome é carregado automaticamente e exporia o banco num `docker compose up` de produção.

---

## 🔌 Endpoints da API

Pelo proxy, prefixe com `/api` (ex.: `POST /api/auth/login`). Direto no core-api (dev), use `http://localhost:8080`.

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| GET | `/health` | Liveness | Não |
| GET | `/readyz` | Prontidão (MySQL e Redis) | Não |
| POST | `/auth/register` | Cadastrar novo usuário | Não |
| POST | `/auth/login` | Autenticar e retornar JWT | Não |
| POST | `/auth/logout` | Resposta de logout no cliente | Não |
| GET | `/auth/verify` | Verificar JWT e retornar usuário | Não |
| GET | `/celulares` | Listar celulares com paginação | Não |
| GET | `/celulares/:id` | Buscar celular por ID | Não |
| POST | `/celulares` | Criar celular (dispara a busca de especificações) | Sim |
| PUT | `/celulares/:id` | Atualizar celular | Sim |
| DELETE | `/celulares/:id` | Deletar celular | Sim |
| GET | `/celulares/meus-itens` | Listar celulares do usuário autenticado | Sim |
| GET | `/celulares/especificacoes?marca=&modelo=` | Buscar especificações (síncrono, até 30 s) | Sim |
| GET | `/celulares/:id/imagens` | Listar fotos do celular | Não |
| POST | `/celulares/:id/imagens` | Enviar foto (até 5 MB) | Sim |
| DELETE | `/celulares/:id/imagens/:idimagem` | Remover foto | Sim |
| GET | `/celulares/imagens/:idimagem` | Servir o arquivo da foto | Não |
| GET | `/comentarios/:idcelular` | Listar comentários de um celular | Não |
| POST | `/comentarios/:idcelular` | Criar comentário para um celular | Sim |
| DELETE | `/comentarios/:idcelular/:idcomentario` | Deletar comentário específico | Sim |
| GET | `/comentarios/meus-comentarios` | Listar comentários do usuário autenticado | Sim |
| GET | `/usuarios/perfil` | Ler perfil do usuário atual | Sim |
| PUT | `/usuarios/perfil` | Atualizar perfil do usuário atual | Sim |
| PUT | `/usuarios/senha` | Atualizar senha do usuário atual | Sim |
| DELETE | `/usuarios/conta` | Deletar conta do usuário atual | Sim |
| GET | `/usuarios` | Listar todos os usuários (restrito a `ADMIN_USER_IDS`) | Sim |

A coluna "Autenticação" resume o comportamento; a fonte de verdade são os controllers em `backend/core-api`.

---

## ⚙️ Variáveis de Ambiente

### Raiz (`.env`, lido pelo Compose e pelo core-api)

```env
# Banco (obrigatórias)
DB_USER=root
DB_PASSWORD=replace-with-a-long-random-password
DB_NAME=feedbackcell_db
DB_POOL_SIZE=10
DB_MAX_CONNECTIONS=151

# Autenticação (JWT_SECRET obrigatório, mínimo 32 caracteres)
JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters
JWT_EXPIRATION=24h
BCRYPT_ROUNDS=12

# API
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT=100
RATE_LIMIT_WINDOW_MS=60000
TRUST_PROXY=1
ADMIN_USER_IDS=

# Especificações
BUSCA_AUTOMATICA=true
MOBILEAPI_KEY=

# Proxy
APP_BIND_ADDRESS=0.0.0.0
APP_PORT=3000

# HTTPS no nginx (só com docker-compose.https.yml)
DOMAIN=
LETSENCRYPT_EMAIL=

# Backup
BACKUP_INTERVAL_SECONDS=86400
BACKUP_RETENTION_DAYS=30
```

* `DB_HOST`, `DB_PORT`, `RATE_LIMIT_REDIS_URL` e `SPECS_SERVICE_URL` são definidos pelo Compose para os nomes internos (`mysql`, `redis`, `specs-service`). Fora do Docker o core-api usa `localhost` e lê o `.env` da raiz.
* `ADMIN_USER_IDS` aceita IDs separados por vírgula. Vazio, `/usuarios` responde HTTP 503; usuários fora da lista recebem HTTP 403.
* `MOBILEAPI_KEY` é opcional: sem ela o specs-service segue só com o modelo 3D e a foto HD e registra um aviso.
* Limites de recursos por serviço podem ser ajustados com `CORE_API_MEM_LIMIT`, `CORE_API_CPUS`, `SPECS_SERVICE_MEM_LIMIT`, `MYSQL_MEM_LIMIT`, `FRONTEND_MEM_LIMIT` (padrões em `docker-compose.yml`).

### Frontend

`NEXT_PUBLIC_API_URL` é incorporada ao bundle no build do Next.js. No Compose o valor é `/api` (mesma origem, via proxy; troque com `DOCKER_API_URL`). Rodando o frontend fora do Docker, o padrão é `http://localhost:8080` (core-api direto).

---

## 🐳 Docker

```bash
# Subir / reconstruir
docker compose up -d --build

# Status e prontidão
docker compose ps
curl http://localhost:3000/readyz

# Logs
docker compose logs -f core-api specs-service

# Parar sem apagar dados nem backups
docker compose down
```

**Não use `docker compose down -v`**: isso apaga os volumes do banco e dos backups.

---

## 🛠 Desenvolvimento e Testes

Testes do core-api e do specs-service (Maven Wrapper, Java 21). No PowerShell:

```powershell
Set-Location backend/core-api
.\mvnw.cmd -B verify

Set-Location ../specs-service
.\mvnw.cmd -B verify
```

Para rodar o core-api fora do Docker, suba as dependências com o arquivo de dev e aponte as variáveis para o host:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mysql redis
Set-Location backend/core-api
$env:DB_PORT = "3307"
$env:RATE_LIMIT_REDIS_URL = "redis://127.0.0.1:6379"
$env:SPECS_SERVICE_URL = "http://localhost:8081"
.\mvnw.cmd spring-boot:run
```

Frontend:

```powershell
Set-Location frontend
pnpm install
pnpm run lint
pnpm run dev
```

A CI (`.github/workflows/ci.yml`) roda `mvnw verify` nos dois serviços Java, lint e build do frontend, valida os arquivos do Compose (incluindo que só o proxy publica porta), testa a sintaxe do Nginx e do script de backup e faz `docker compose build` de todas as imagens. Os valores de senha da CI servem só para a interpolação do Compose; credenciais reais ficam fora do código e do Git.

---

## 🚢 Deploy em produção

### Deploy rápido (servidor Linux + HTTPS)

1. **Servidor**: Linux (ex.: Ubuntu 24.04) com pelo menos **8 GB de RAM** (os limites do Compose somam cerca de 4,5 GB) e 20 GB de disco. Libere as portas 22, 80 e 443 no firewall.
2. **DNS**: crie um registro `A` do domínio apontando para o IP do servidor e espere propagar (`nslookup <domínio>`).
3. **Docker**: `curl -fsSL https://get.docker.com | sh` (instala o Docker com o plugin compose).
4. **Código e subida**:

   ```bash
   git clone https://github.com/BonatoGuilherme/FeedBackCell2.git feedbackcell && cd feedbackcell
   DOMAIN=<domínio> LETSENCRYPT_EMAIL=<seu e-mail> ./scripts/deploy.sh
   ```

O `scripts/deploy.sh` cria o `.env` com senhas e `JWT_SECRET` aleatórios (só na primeira vez), define `CORS_ORIGIN=https://<domínio>`, emite o certificado Let's Encrypt, sobe tudo com `docker-compose.https.yml` e confere `/health`, `/readyz` e o frontend pelo HTTPS. Para atualizar depois, rode `./scripts/deploy.sh` de novo: ele faz `git pull` da `master` e reconstrói, mantendo o `.env` e os dados. Opcional: preencha `MOBILEAPI_KEY` e `ADMIN_USER_IDS` no `.env` e rode o script outra vez.

Checklist antes de expor a aplicação:

1. **Segredos**: crie o `.env` no servidor a partir do `.env.example` com `DB_PASSWORD` longo e aleatório e `JWT_SECRET` com pelo menos 32 caracteres (ex.: `openssl rand -base64 48`). Restrinja a leitura do arquivo (`chmod 600 .env`) e nunca o versione. Trocar `JWT_SECRET` invalida todos os tokens emitidos.
2. **Administradores**: defina `ADMIN_USER_IDS` com os IDs que podem listar usuários; vazio desliga a rota.
3. **Proxy confiável**: ajuste `TRUST_PROXY` ao número de proxies na frente da aplicação (o nginx do Compose conta como 1; com um load balancer externo, 2). Um valor maior que o real permite falsificar o IP de origem e contornar o rate limit.
4. **Domínio e CORS**: defina `CORS_ORIGIN=https://<domínio>` no `.env`. Pelo proxy o frontend e a API têm a mesma origem, então o CORS só entra em jogo se a API for servida em outro domínio.
5. **TLS**: escolha um dos caminhos.
   * **HTTPS no próprio nginx (Let's Encrypt)**: com o DNS do domínio apontando para o servidor e `DOMAIN` e `LETSENCRYPT_EMAIL` no `.env`, emita o certificado inicial (a porta 80 precisa estar livre) e suba com o override:

     ```bash
     docker compose -f docker-compose.yml -f docker-compose.https.yml run --rm -p 80:80 \
       --entrypoint certbot certbot certonly --standalone -d "$DOMAIN" \
       --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email
     docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
     ```

     O proxy publica 80 e 443, redireciona HTTP para HTTPS e envia HSTS. O serviço `certbot` renova o certificado sozinho e o nginx recarrega a cada 6 h. Use sempre os dois arquivos nos comandos `docker compose` desse servidor.
   * **TLS num proxy/load balancer externo** (Cloudflare, Caddy, ALB): use só o `docker-compose.yml`, `APP_BIND_ADDRESS=127.0.0.1` se o proxy estiver no mesmo host (o HTTP não fica aberto à Internet), ative HSTS nele e some 1 ao `TRUST_PROXY`.
6. **Subida**: `docker compose up -d --build` (com HTTPS no nginx, inclua `-f docker-compose.https.yml`; nunca o arquivo de dev). O core-api aplica as migrações Flyway no startup; acompanhe com `docker compose logs -f core-api`.
7. **Healthchecks**: confirme `docker compose ps` com todos os serviços `healthy`, `curl -f https://<domínio>/health` (liveness) e `curl -f https://<domínio>/readyz` (banco e Redis). Use `/readyz` no load balancer.
8. **Backup e restauração**: o serviço `backup` grava dumps comprimidos e verificados no volume `feedbackcellnextjs_mysql_backups` (intervalo `BACKUP_INTERVAL_SECONDS`, retenção `BACKUP_RETENTION_DAYS`). Copie-os para fora do host e teste a restauração periodicamente:

   ```bash
   docker compose exec backup ls -lh /backups
   docker compose cp backup:/backups/<arquivo>.sql.gz .
   # restauração (o dump inclui CREATE DATABASE/USE):
   gunzip -c <arquivo>.sql.gz | docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"'
   ```

   Pare o core-api durante uma restauração (`docker compose stop core-api`) e suba de novo depois; o Flyway valida o histórico de migrações restaurado.
9. **Escala**: `docker compose up -d --scale core-api=N --scale frontend=M`. O nginx redescobre as réplicas pelo DNS do Docker. Cada réplica do core-api abre até `DB_POOL_SIZE` conexões; respeite `DB_POOL_SIZE × réplicas + reservas (backup, administração, margem) < DB_MAX_CONNECTIONS` e ajuste ambos no `.env` antes de escalar. Os limites de memória/CPU do Compose valem por réplica; confira se o host comporta a soma. O specs-service roda com uma réplica (o cache de buscas fica em memória e a cota da MobileAPI é por chave).
10. **Limites**: com uma réplica de cada serviço, os limites de memória do Compose somam cerca de 4,5 GB; reserve isso no host além do sistema operacional. Monitore com `docker stats` e ajuste as variáveis `*_MEM_LIMIT`.

O Compose faz balanceamento e escala dentro de **um único host**, não alta disponibilidade: o host, o MySQL e o Redis são pontos únicos de falha.

---

## 🗺 Roadmap / Próximos Passos

- [ ] Ampliar os testes automatizados de controllers e rotas do core-api.
- [ ] Melhorar o feedback visual e o tratamento de erros do frontend.
- [ ] Publicar imagens versionadas em um registry a partir da CI.

---

## 📌 Notes

Este projeto está em desenvolvimento ativo. O backend Node/Express original foi substituído pelo core-api (Spring Boot) e pelo specs-service (Quarkus); o schema do banco é mantido compatível e agora versionado pelo Flyway.
