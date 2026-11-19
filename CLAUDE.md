# FeedBackCELL — instruções para o Claude

## Regras

- Faça o que foi pedido; nada a mais, nada a menos
- NUNCA crie arquivos sem necessidade real — prefira editar os que já existem
- NUNCA crie arquivos de documentação sem pedido explícito
- NUNCA salve arquivos de trabalho ou testes na raiz — use `/src`, `/tests`, `/docs`, `/config`, `/scripts`
- SEMPRE leia um arquivo antes de editá-lo
- NUNCA commite segredos, credenciais ou arquivos `.env`
- Mantenha os arquivos com menos de 500 linhas
- Valide entradas nas fronteiras do sistema

## Front-end / UI

- Em qualquer tarefa de UI no `frontend/` (criar, refazer ou reestilizar telas, componentes, layout, cores, tipografia, animações), carregar a skill `ui-ux-pro-max` antes de editar. Não precisa esperar o usuário digitar `/ui-ux-pro-max`.
- Usar só a `ui-ux-pro-max` como skill de design principal. Não misturar com `design-taste-frontend`, `ui-styling` ou `design-system`, a menos que o usuário peça.
- Seguir o tema visual Renascença já existente (`frontend/app/styles/renaissance.css`, tokens em `globals.css`). Nada de introduzir um estilo novo sem pedido.
- Ajustes triviais (um padding, um texto, um bug de lógica) não precisam da skill.
- Depois de mudanças visuais, conferir o resultado no navegador.

## Vários terminais (worktrees)

Pode haver mais de uma sessão do Claude trabalhando neste repositório ao mesmo tempo. Cada sessão tem um papel; descubra o seu pela pasta e pela branch (`git worktree list`, `git branch --show-current`) ou pergunte ao usuário.

| Papel | Pasta | Pode mexer em |
|---|---|---|
| Tech lead | `FeedBackCELL Next.js/` (pasta principal) | Arquivos compartilhados, revisão, merge |
| Dev back | worktree `../FeedBackCELL-back` | Só `backend/` |
| Dev front | worktree `../FeedBackCELL-front` | Só `frontend/` |
| QA | worktree `../FeedBackCELL-qa` | Testes e correções pequenas, sempre via PR |

- Uma sessão por pasta. Nunca trabalhe na pasta de outra sessão, nem troque a branch da pasta principal se você não é o tech lead.
- Devs e QA criam a própria branch a partir da `dev`, no próprio worktree (`git worktree add ../FeedBackCELL-back -b feat/<tarefa> BonatoGuilherme/dev`), abrem PR para a `dev` e não mergeiam.
- Só o tech lead mergeia (sempre com ordem do usuário), apaga branches e remove worktrees (`git worktree remove <pasta>`) depois do merge.

### Fluxo de branches (Git Flow simplificado)

```
feat/* · fix/* · chore/*  ──squash──►  dev  ──merge commit──►  master  ──►  produção
```

- `master` = o que está no ar: cada merge dispara o deploy no Render e na Vercel. `dev` = integração e branch padrão do GitHub.
- Toda branch nova sai da `dev` e volta para ela por PR, **com squash** (um commit por feature). Hotfix também passa pela `dev`.
- O PR `dev → master` é a release: só é aberto quando o usuário mandar, e entra com **merge commit** (nunca squash, senão as duas branches divergem e cada release dá conflito). O título resume o que sobe.
- Os rulesets do GitHub bloqueiam push direto, force-push e exclusão nas duas branches e exigem os 4 checks do CI verdes, sem exceção para admin. A `dev` só aceita squash e a `master` só aceita merge commit.
- O preview da Vercel de outras branches serve só para conferir o visual: o CORS da core-api aceita uma origem só.
- Arquivos compartilhados (`docker-compose*.yml`, `README.md`, `CLAUDE.md`, `.github/`, `infra/`, `package.json` e lockfiles) são do tech lead. Um dev que precisar mudar um deles pede ao tech lead ou avisa o usuário antes.
- Antes de commitar: confira `git branch --show-current` e `git status`, faça `git add` só dos arquivos da sua tarefa (nunca `git add .`/`-A`) e revise `git diff --cached --stat`. Mudanças staged que não são suas ficam de fora.
- Antes de abrir PR, veja se já existe PR ou branch para a mesma coisa (outra sessão pode ter feito) para não duplicar trabalho.
- Cada worktree tem as próprias dependências (`pnpm install` em `frontend/`). O `docker compose` usa portas da máquina: só um worktree por vez sobe a stack; combine com o usuário antes de subir ou derrubar containers.

## Build e testes

- SEMPRE rode os testes depois de mudar código
- SEMPRE confirme que o build passa antes de commitar

```bash
npm run build && npm test
```
