# FeedBackCELL

![Docker](https://img.shields.io/badge/docker-ready-blue)
![Node](https://img.shields.io/badge/node-20-green)
![Next.js](https://img.shields.io/badge/next.js-16-black)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

Plataforma full-stack de feedback construída com **Next.js**, **Express** e **MySQL**, conteinerizada com **Docker**. O projeto permite que usuários cadastrados publiquem, gerenciem e explorem avaliações de celulares por meio de uma interface web e de uma API.

---

## 📖 Sobre

FeedBackCELL é um projeto full-stack educacional voltado para criar um produto para coletar feedback e opiniões sobre celulares. A plataforma combina uma API Express, um banco de dados MySQL e um frontend Next.js em um fluxo de desenvolvimento baseado em Docker.

## ✨ Funcionalidades

O backend implementa atualmente os seguintes comportamentos:

- [x] Cadastro de usuários, login, simulação de logout e verificação de token pela API de autenticação.
- [x] Criação, listagem, busca por ID, atualização, exclusão e checagem de propriedade para celulares.
- [x] Endpoints privados para perfil do usuário autenticado, atualização de senha, exclusão de conta e listagem de usuários com validação de autenticação.
- [x] Criação, listagem por celular, exclusão e listagem de comentários do usuário com validação de propriedade.
- [x] Rate limiting global de requisições e validação de entrada na camada de API.

O frontend atualmente possui telas de login, cadastro, catálogo e criação de itens conectadas à API por meio da variável de ambiente `NEXT_PUBLIC_API_URL`.

---

## 🚀 Início Rápido

### Requisitos

* Docker Desktop
* Node.js 20+ (opcional, para desenvolvimento local)

### Executar o projeto

Na primeira execução, copie `.env.example` para `.env` e substitua as senhas e chaves de exemplo por valores fortes. Não compartilhe nem versione o arquivo `.env`.

```bash
docker compose up -d --build
```

### Serviços

* Aplicação (frontend e API pelo proxy) → http://localhost:3000
* API → http://localhost:3000/api
* Banco de dados → localhost:3307, vinculado somente à interface local do host

---

## 📁 Estrutura do Projeto

```text
.
├── frontend/            # Next.js (App Router + TypeScript)
├── backend/             # Express API + MySQL
├── docker-compose.yml   # Orquestração dos serviços
├── .env.example         # Modelo de variáveis; copiar para .env
└── README.md
```

---

## 🔌 Endpoints da API

As rotas do backend expostas pelo servidor Express são organizadas atualmente da seguinte forma:

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/auth/register` | Cadastrar novo usuário | Não |
| POST | `/auth/login` | Autenticar e retornar JWT | Não |
| POST | `/auth/logout` | Resposta de logout no cliente | Não |
| GET | `/auth/verify` | Verificar JWT e retornar usuário | Não |
| GET | `/celulares` | Listar celulares com paginação | Não |
| GET | `/celulares/:id` | Buscar celular por ID | Não |
| POST | `/celulares` | Criar celular | Sim |
| PUT | `/celulares/:id` | Atualizar celular | Sim |
| DELETE | `/celulares/:id` | Deletar celular | Sim |
| GET | `/celulares/meus-itens` | Listar celulares do usuário autenticado | Sim |
| GET | `/comentarios/:idcelular` | Listar comentários de um celular | Não |
| POST | `/comentarios/:idcelular` | Criar comentário para um celular | Sim |
| DELETE | `/comentarios/:idcelular/:idcomentario` | Deletar comentário específico | Sim |
| GET | `/comentarios/meus-comentarios` | Listar comentários do usuário autenticado | Sim |
| GET | `/usuarios/perfil` | Ler perfil do usuário atual | Sim |
| PUT | `/usuarios/perfil` | Atualizar perfil do usuário atual | Sim |
| PUT | `/usuarios/senha` | Atualizar senha do usuário atual | Sim |
| DELETE | `/usuarios/conta` | Deletar conta do usuário atual | Sim |
| GET | `/usuarios` | Listar todos os usuários (restrito aos IDs em `ADMIN_USER_IDS`) | Sim |

---

## 🐳 Docker

### Comandos principais

```bash
# Iniciar a aplicação
docker compose up -d --build

# Escalar frontend e API no mesmo servidor
docker compose up -d --scale frontend=2 --scale backend=3

# Parar os containers sem apagar os dados ou backups
docker compose down

# Conferir status e prontidão
docker compose ps
curl http://localhost:3000/readyz

# Ver logs
docker compose logs -f
```

O Nginx encaminha `/` ao frontend e `/api/*` à API, atualizando a descoberta DNS das réplicas do Compose. O backend usa Redis para compartilhar os contadores do rate limit entre réplicas. Para manter a aplicação no mesmo host, não publique as portas do frontend ou backend diretamente.

Cada réplica do backend abre um pool MySQL limitado por `DB_POOL_SIZE` (padrão: 10). O MySQL aceita até `DB_MAX_CONNECTIONS` conexões (padrão: 151). Dimensione as réplicas respeitando `réplicas do backend × DB_POOL_SIZE + conexões reservadas < DB_MAX_CONNECTIONS`; reserve conexões para migrações, backup, administração e margem operacional. Ajuste esses dois valores no `.env` antes de escalar.

As migrações rodam uma vez no serviço `migrate` antes da API, evitando que várias réplicas alterem o schema simultaneamente. Os índices compostos acompanham as consultas de listagem e substituem índices simples redundantes que já existiam. O `EXPLAIN` no banco atual encontrou apenas 1 celular e 0 comentários; portanto, os índices correspondem aos filtros/ordenações usados, mas esses dados ainda não permitem alegar ganho de desempenho medido.

O serviço `backup` cria um dump comprimido e verifica o arquivo ao iniciar e a cada intervalo configurado. As cópias ficam no volume `feedbackcellnextjs_mysql_backups`; para listar ou copiar um arquivo para o host:

```bash
docker compose exec backup ls -lh /backups
docker compose cp backup:/backups/<arquivo>.sql.gz .
```

Uma cópia no mesmo servidor protege contra erros de container, mas não contra perda do disco ou do host. Copie os arquivos para armazenamento externo e teste a restauração. `docker compose down` preserva os volumes; **não use `docker compose down -v`**, pois isso apaga o banco e os backups.

O Compose prepara balanceamento local e escala horizontal dentro de um único host, não alta disponibilidade: o host, o MySQL e o Redis continuam sendo pontos únicos de falha. O proxy escuta HTTP; termine TLS em um proxy/load balancer externo confiável e ajuste `TRUST_PROXY` ao número de proxies confiáveis antes de expor a aplicação à Internet.

---

## ⚙️ Variáveis de Ambiente

### Backend (`.env`)

```env
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=replace-with-a-long-random-password
DB_NAME=feedbackcell_db
DB_POOL_SIZE=10
DB_MAX_CONNECTIONS=151
NODE_ENV=development
PORT=5000
JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters
JWT_EXPIRATION=24h
BCRYPT_ROUNDS=12
RATE_LIMIT=100
RATE_LIMIT_WINDOW_MS=60000
TRUST_PROXY=1
ADMIN_USER_IDS=
BACKUP_INTERVAL_SECONDS=86400
BACKUP_RETENTION_DAYS=30
```

Use `.env.example` como referência para a configuração do Compose. `ADMIN_USER_IDS` aceita IDs de usuário separados por vírgula; deixe-o vazio até escolher explicitamente os administradores. Sem IDs, a rota `/usuarios` responde HTTP 503; usuários autenticados fora da lista recebem HTTP 403. `RATE_LIMIT_REDIS_URL` é configurada pelo Compose para apontar ao Redis interno.

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=/api
```

`NEXT_PUBLIC_API_URL` é incorporada ao bundle durante o build do Next.js. No Compose, `/api` mantém frontend e API na mesma origem; ao executar o frontend fora do Docker, use a URL local correspondente à API.

---

## 🧱 Stack Tecnológica

* **Frontend:** Next.js, TypeScript
* **Backend:** Node.js, Express
* **Banco de dados:** MySQL
* **Infraestrutura:** Docker Compose, Nginx, Redis

---

## 🛠 Desenvolvimento

Após alterar imagens ou dependências, reconstrua os serviços com `docker compose up -d --build`. Execute os testes do backend no PowerShell:

```powershell
Set-Location backend
pnpm test
```

---

## 🗺 Roadmap / Próximos Passos

- [x] Adicionar teste automatizado para idempotência e validação das migrações de índices.
- [ ] Adicionar testes automatizados para controllers, models e rotas.
- [x] Alinhar as rotas de comentários com as expectativas de parâmetros do frontend e do controller.
- [x] Adicionar visualização, criação e exclusão de comentários no frontend; o gerenciamento dos recursos do usuário ainda está pendente.
- [ ] Melhorar o feedback visual e o tratamento de erros do frontend.
- [ ] Preparar arquivos e fluxo de CI/CD específicos para produção.

---

## ✅ Checklist para finalizar o projeto

1. [x] Corrigir a rota de comentários para que o backend e o frontend usem o mesmo padrão de `idcelular` e `idcomentario`.
2. [x] Encerrar o fluxo de comentários no frontend com visualização, criação e exclusão via token JWT.
3. Criar testes automatizados para autenticação, celulares, comentários e perfil do usuário.
4. Melhorar a experiência de erro no frontend com mensagens claras para login, cadastro, token expirado e falhas de API.
5. Separar configuração de desenvolvimento e produção com `.env` e `NEXT_PUBLIC_API_URL` reais.
6. Preparar o deploy com Docker Compose, healthchecks e documentação de operação.

---

## 📌 Notes

Este projeto está em desenvolvimento ativo. Ele já possui uma infraestrutura Docker funcional, autenticação JWT, CRUD de celulares, endpoints de perfil do usuário, endpoints de comentários no backend e uma tela para visualizar, criar e excluir comentários. Os caminhos de comentários usam `idcelular` na URL, conforme esperado pelo controller.

O repositório ainda precisa de cobertura de testes mais ampla para controllers, rotas e recursos protegidos do frontend. O Compose balanceia réplicas no mesmo host; não substitui redundância entre hosts nem backups externos.

---
