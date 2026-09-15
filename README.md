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

```bash
docker compose up -d
```

### Serviços

* Frontend → http://localhost:3000
* Backend → http://localhost:5000
* Banco de dados → localhost:3307

---

## 📁 Estrutura do Projeto

```text
.
├── frontend/            # Next.js (App Router + TypeScript)
├── backend/             # Express API + MySQL
├── docker-compose.yml   # Orquestração dos serviços
├── .env                 # Template de variáveis de ambiente
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
| GET | `/usuarios` | Listar todos os usuários (fluxo restrito ao admin) | Sim |

---

## 🐳 Docker

### Comandos principais

```bash
# Iniciar containers
docker compose up -d

# Parar containers
docker compose down

# Reconstruir containers
docker compose up -d --build

# Ver logs
docker compose logs -f
```

---

## ⚙️ Variáveis de Ambiente

### Backend (`.env`)

```env
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=feedbackcell
NODE_ENV=development
PORT=5000
JWT_SECRET=sua_chave_secreta_muito_longa_com_32_caracteres_minimo_para_seguranca
JWT_EXPIRATION=24h
BCRYPT_ROUNDS=10
RATE_LIMIT=100
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
CORS_ORIGIN=http://localhost:3000
```

---

## 🧱 Stack Tecnológica

* **Frontend:** Next.js, TypeScript
* **Backend:** Node.js, Express
* **Banco de dados:** MySQL
* **Infraestrutura:** Docker, Docker Compose

---

## 🛠 Desenvolvimento

Os containers suportam live reload em desenvolvimento, mas a API e o frontend devem ser reconstruídos quando a imagem Docker ou as dependências forem alteradas.

```bash
docker compose up -d --build
```

---

## 🗺 Roadmap / Próximos Passos

- [ ] Adicionar testes automatizados para controllers, models e rotas.
- [ ] Alinhar as rotas de comentários com as expectativas de parâmetros do frontend e do controller.
- [ ] Adicionar um fluxo completo do frontend para comentários e gerenciamento de recursos do usuário autenticado.
- [ ] Melhorar o feedback visual e o tratamento de erros do frontend.
- [ ] Preparar arquivos e fluxo de CI/CD específicos para produção.

---

## ✅ Checklist para finalizar o projeto

1. Corrigir a rota de comentários para que o backend e o frontend usem o mesmo padrão de `idcelular` e `idcomentario`.
2. Encerrar o CRUD de comentários no frontend com visualização, criação e exclusão via token JWT.
3. Criar testes automatizados para autenticação, celulares, comentários e perfil do usuário.
4. Melhorar a experiência de erro no frontend com mensagens claras para login, cadastro, token expirado e falhas de API.
5. Separar configuração de desenvolvimento e produção com `.env` e `NEXT_PUBLIC_API_URL` reais.
6. Preparar o deploy com Docker Compose, healthchecks e documentação de operação.

---

## 📌 Notes

Este projeto está em desenvolvimento ativo. Ele já possui uma infraestrutura Docker funcional, autenticação JWT, CRUD de celulares, endpoints de perfil do usuário e endpoints de comentários no backend; porém, a configuração atual de comentários precisa ser normalizada para manter o caminho da rota e os nomes dos parâmetros do controller consistentes.

O repositório também ainda precisa de testes automatizados e de uma cobertura maior do frontend para todos os recursos protegidos da API.

---


