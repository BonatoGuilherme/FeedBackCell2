# FeedBackCELL 🔗

> 📂 **Aviso de Organização:** Toda a documentação técnica detalhada (Guias de Teste, Deploy, Ngrok, etc.) foi movida para a pasta [`/Obsidian`](./Obsidian) para facilitar a visualização e manutenção.

Plataforma completa de feedback e comentários com **Next.js**, **Express** e **MySQL** containerizada com **Docker**.

## 🚀 Quick Start

### Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop) instalado

### Rodar tudo com um comando:

```bash
docker-compose up -d
```

Pronto! Tudo estará rodando:
- 🌐 **Frontend**: http://localhost:3000
- 🔌 **Backend API**: http://localhost:5000
- 💾 **MySQL**: localhost:3307

## 📁 Estrutura

```
FeedBackCELL Next.js/
├── frontend/                    # Next.js 16 + TypeScript
│   ├── app/                     # App Router (Pages)
│   ├── src/                     # Código-fonte
│   ├── public/                  # Arquivos estáticos
│   ├── Dockerfile
│   └── README.md
│
├── backend/                     # Express + MySQL
│   ├── server.js                # Servidor principal
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml           # Orquestração de containers
├── .env.example                 # Variáveis de exemplo
└── README.md                    # Este arquivo
```

## 🐳 Docker Compose

O `docker-compose.yml` define 3 serviços:

1. **Frontend** (Next.js na porta 3000)
2. **Backend** (Express na porta 5000)
3. **MySQL** (Banco de dados na porta 3307)

### Comandos Úteis

```bash
# Ver status dos containers
docker ps

# Ver logs em tempo real
docker-compose logs -f

# Parar tudo
docker-compose down

# Remover volumes (reseta banco de dados)
docker-compose down -v

# Reconstruir imagens
docker-compose up -d --build

# Acessar terminal de um container
docker exec -it feedbackcell-backend sh
```

## 🛣️ Rotas Disponíveis

### Frontend
- `/` - Home
- `/catalog` - Catálogo de produtos
- `/items/new` - Adicionar novo item
- `/comments/[id]` - Ver comentários
- `/login` - Login
- `/register` - Registrar

### Backend
- `GET /api/feedback` - Exemplo de endpoint

## 📝 Configuração

### Backend (.env)
```
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=feedbackcell
NODE_ENV=development
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## 🔌 Conectando Frontend com Backend

O hook `useApi` facilita as chamadas:

```typescript
import { useApi } from '@/src/components/hooks/useApi';

const { request, loading, error } = useApi();
const data = await request('GET', '/api/feedback');
```

## 📂 Detalhes das Pastas

### Frontend (`/frontend`)
- **app/)** - Rotas e layouts (Next.js App Router)
- **src/lib/api.ts** - Cliente HTTP configurado
- **src/components/Navigation.tsx** - Menu de navegação
- **src/components/hooks/useApi.ts** - Hook reutilizável

### Backend (`/backend`)
- **server.js** - Servidor Express
- **package.json** - Dependências (Express, MySQL2, CORS)

## 🚨 Troubleshooting

### Porta 3306 já em uso
Se o MySQL não inicia:
```bash
# Já foi mudado para 3307 no docker-compose.yml
```

### Frontend não responde
```bash
# Veja os logs:
docker logs feedbackcell-frontend -f
```

### Backend não conecta ao banco
Verifique se o container MySQL está rodando:
```bash
docker ps | grep mysql
```

## 📦 Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 16, TypeScript, CSS |
| **Backend** | Express 5, Node.js 20 |
| **Database** | MySQL 8.0 |
| **Container** | Docker + Docker Compose |

## 🎯 Próximos Passos

- [ ] Implementar autenticação JWT
- [ ] Criar CRUD completo
- [ ] Adicionar validações
- [ ] Escrever testes
- [ ] Deploy em produção (AWS, Vercel, etc)

## 👨‍💻 Desenvolvimento

Para editar o código, os containers continuam rodando e refletem as mudanças (em desenvolvimento).

Para rebuild após grandes mudanças:
```bash
docker-compose up -d --build
```

## 📚 Documentação Detalhada

- [Frontend README](./frontend/README.md)
- [Backend README](./backend/README.md) *(criar se necessário)*

---

**Desenvolvido com ❤️ | Next.js + Express + MySQL + Docker**
