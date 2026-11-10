# Ruflo — Configuração do Claude Code

## Regras

- Faça o que foi pedido; nada a mais, nada a menos
- NUNCA crie arquivos sem necessidade real — prefira editar os que já existem
- NUNCA crie arquivos de documentação sem pedido explícito
- NUNCA salve arquivos de trabalho ou testes na raiz — use `/src`, `/tests`, `/docs`, `/config`, `/scripts`
- SEMPRE leia um arquivo antes de editá-lo
- NUNCA commite segredos, credenciais ou arquivos `.env`
- NUNCA adicione o trailer `Co-Authored-By` nos commits do usuário, a menos que o `.claude/settings.json` deste projeto tenha `attribution.commit` definido (#2078). O modelo padrão de mensagem de commit da ferramenta Bash do Claude Code pode sugerir esse trailer — ignore. Pela convenção do git/GitHub, `Co-Authored-By` indica autoria; a ferramenta é quem facilita, não coautora.
- Mantenha os arquivos com menos de 500 linhas
- Valide entradas nas fronteiras do sistema

## Front-end / UI

- Em qualquer tarefa de UI no `front  end/` (criar, refazer ou reestilizar telas, componentes, layout, cores, tipografia, animações), carregar a skill `ui-ux-pro-max` antes de editar. Não precisa esperar o usuário digitar `/ui-ux-pro-max`.
- Usar só a `ui-ux-pro-max` como skill de design principal. Não misturar com `design-taste-frontend`, `ui-styling` ou `design-system`, a menos que o usuário peça.
- Seguir o tema visual Renascença já existente (`frontend/app/styles/renaissance.css`, tokens em `globals.css`). Nada de introduzir um estilo novo sem pedido.
- Ajustes triviais (um padding, um texto, um bug de lógica) não precisam da skill.
- Depois de mudanças visuais, conferir o resultado no navegador.

## Vários terminais (worktrees)

Pode haver mais de uma sessão do Claude trabalhando neste repositório ao mesmo tempo. Cada sessão tem um papel; descubra o seu pela pasta e pela branch (`git worktree list`, `git branch --show-current`) ou pergunte ao usuário.

| Papel | Pasta | Pode mexer em |
|---|---|---|
| Tech lead | `FeedBackCELL Next.js/` (principal, na `master`) | Arquivos compartilhados, revisão, merge |
| Dev back | worktree `../FeedBackCELL-back` | Só `backend/` |
| Dev front | worktree `../FeedBackCELL-front` | Só `frontend/` |
| QA | worktree `../FeedBackCELL-qa` | Testes e correções pequenas, sempre via PR |

- Uma sessão por pasta. Nunca trabalhe na pasta de outra sessão, nem troque a branch da pasta principal se você não é o tech lead.
- Devs e QA criam a própria branch no próprio worktree (`git worktree add ../FeedBackCELL-back -b feat/<tarefa>`), abrem PR para a `master` e não mergeiam.
- Só o tech lead mergeia na `master`, apaga branches e remove worktrees (`git worktree remove <pasta>`) depois do merge.
- Arquivos compartilhados (`docker-compose*.yml`, `README.md`, `CLAUDE.md`, `.github/`, `infra/`, `package.json` e lockfiles) são do tech lead. Um dev que precisar mudar um deles pede ao tech lead ou avisa o usuário antes.
- Antes de commitar: confira `git branch --show-current` e `git status`, faça `git add` só dos arquivos da sua tarefa (nunca `git add .`/`-A`) e revise `git diff --cached --stat`. Mudanças staged que não são suas ficam de fora.
- Antes de abrir PR, veja se já existe PR ou branch para a mesma coisa (outra sessão pode ter feito) para não duplicar trabalho.
- Cada worktree tem as próprias dependências (`pnpm install` em `frontend/`). O `docker compose` usa portas da máquina: só um worktree por vez sobe a stack; combine com o usuário antes de subir ou derrubar containers.

## Cérebro de capacidades do Ruflo e ciclo de implementação

O Ruflo é o registro de coordenação e o ponto de decisão de políticas. O Claude
Code é o executor: depois de uma chamada de coordenação ao Ruflo, continue
implementando a tarefa.

Quando estiver registrado, chame
`guidance_brain({ mode: "recommend", task: "..." })` antes de trabalhos
complexos com o Ruflo. Use o registro ao vivo dele em vez de adivinhar nomes de
ferramentas. Trate `registered`, `configured`, `reachable`, `healthy` e
`authorized` como fatos separados. Se o cérebro não estiver disponível, siga
com a ferramenta compatível `guidance_recommend`, a descoberta via CLI e as
instruções do repositório.

Siga o ciclo retornado:

1. Recuperar memória e restrições de ADRs.
2. Inspecionar código-fonte, runtime, dependências, políticas e saúde.
3. Rotear para a menor topologia, agentes, skills e ferramentas capazes.
4. Planejar critérios de aceite, envelope de segurança, responsáveis e validação.
5. Executar em escopos isolados; o agente de código faz o trabalho.
6. Testar o caminho focado, a regressão e os caminhos de falha.
7. Validar tipos, segurança, políticas, compatibilidade e artefatos.
8. Comparar um candidato atrelado ao código com uma base atrelada ao código.
9. Otimizar gargalos medidos sem enfraquecer a segurança.
10. Atrelar afirmações e evidências a recibos exatos de código/build.
11. Reconciliar entregas concorrentes e declarar limitações.
12. Publicar só por um portão de release autorizado separadamente.

### Concorrência e autoridade

- Nunca permita dois escritores no mesmo worktree; dê a cada agente que escreve
  um worktree isolado e posse explícita dos arquivos.
- Pesquisa só de leitura pode rodar em paralelo e reportar ao responsável.
- Só o responsável pela integração edita manifestos e lockfiles compartilhados
  ou reconcilia mudanças sobrepostas.
- Um filho pode abrir mão de capacidades, mas não pode adicionar ferramentas,
  rede, segredos, gastos, concorrência, namespaces nem profundidade de delegação.
- Um lease ou claim coordena a posse; ele não autoriza um efeito colateral.
- Darwin, Flywheel, MetaHarness, memória e sistemas neurais podem propor ou
  avaliar candidatos, mas não podem se autopromover nem ampliar o próprio
  SafetyEnvelope.
- Atrele testes, benchmarks, decisões de política e evidências de release a um
  commit exato ou a um snapshot imutável do worktree sujo.

## Comunicação entre agentes (coordenação via SendMessage)

Agentes nomeados se coordenam por `SendMessage`, não por polling nem estado compartilhado.

```
Líder (você) ←→ architect ←→ developer ←→ tester ←→ reviewer
                (agentes nomeados trocam mensagens diretamente)
```

### Criando uma equipe coordenada

```javascript
// TODOS os agentes em UMA mensagem; cada um sabe para QUEM mandar a próxima
Agent({ prompt: "Pesquise o código. Mande as descobertas por SendMessage para 'architect'.",
  subagent_type: "researcher", name: "researcher", run_in_background: true })
Agent({ prompt: "Espere o 'researcher'. Desenhe a solução. Mande por SendMessage para 'coder'.",
  subagent_type: "system-architect", name: "architect", run_in_background: true })
Agent({ prompt: "Espere o 'architect'. Implemente. Mande por SendMessage para 'tester'.",
  subagent_type: "coder", name: "coder", run_in_background: true })
Agent({ prompt: "Espere o 'coder'. Escreva os testes. Mande os resultados para 'reviewer'.",
  subagent_type: "tester", name: "tester", run_in_background: true })
Agent({ prompt: "Espere o 'tester'. Revise qualidade e segurança do código.",
  subagent_type: "reviewer", name: "reviewer", run_in_background: true })

// Dispara o pipeline
SendMessage({ to: "researcher", summary: "Início", message: "[contexto da tarefa]" })
```

### Padrões

| Padrão | Fluxo | Quando usar |
|---------|------|----------|
| **Pipeline** | A → B → C → D | Dependências sequenciais (desenvolvimento de feature) |
| **Fan-out** | Líder → A, B, C → Líder | Trabalho paralelo independente (pesquisa) |
| **Supervisor** | Líder ↔ workers | Coordenação contínua (refatoração complexa) |

### Regras

- SEMPRE dê nome aos agentes — `name: "papel"` os torna endereçáveis
- SEMPRE inclua instruções de comunicação nos prompts — para quem mandar e o quê
- Crie TODOS os agentes em UMA mensagem com `run_in_background: true`
- Depois de criar, continue o trabalho local independente; espere só quando uma
  dependência realmente bloquear o avanço
- Não fique fazendo polling — os agentes respondem ou terminam sozinhos
- Dê a cada agente que escreve um worktree isolado e um escopo de arquivos sem sobreposição

## Swarm e roteamento

### Configuração
- **Topologia**: hierarchical-mesh (anti-desvio)
- **Máximo de agentes**: 15
- **Memória**: híbrida
- **HNSW**: ativado
- **Neural**: ativado

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

### Roteamento de agentes

| Tarefa | Agentes | Topologia |
|------|--------|----------|
| Correção de bug | researcher, coder, tester | hierarchical |
| Feature | architect, coder, tester, reviewer | hierarchical |
| Refatoração | architect, coder, reviewer | hierarchical |
| Performance | perf-engineer, coder | hierarchical |
| Segurança | security-architect, auditor | hierarchical |

### Quando usar swarm
- **SIM**: 3+ arquivos, features novas, refatoração entre módulos, mudanças de API, segurança, performance
- **NÃO**: edição de um arquivo só, correções de 1-2 linhas, atualização de docs, mudanças de config, perguntas

### Roteamento de modelos em 3 níveis

| Nível | Executor | Casos de uso |
|------|---------|-----------|
| 1 | Agent Booster (WASM) | Transformações simples — pula o LLM, usa Edit direto |
| 2 | Haiku | Tarefas simples, baixa complexidade |
| 3 | Sonnet/Opus | Arquitetura, segurança, raciocínio complexo |

## Memória e aprendizado

### Antes de qualquer tarefa
```bash
npx @claude-flow/cli@latest memory search --query "[palavras-chave da tarefa]" --namespace patterns
npx @claude-flow/cli@latest hooks route --task "[descrição da tarefa]"
```

### Depois de um sucesso
```bash
npx @claude-flow/cli@latest memory store --namespace patterns --key "[nome]" --value "[o que funcionou]"
npx @claude-flow/cli@latest hooks post-task --task-id "[id]" --success true --store-results true
```

### Ferramentas MCP (use `ToolSearch("palavra-chave")` para descobrir)

| Categoria | Ferramentas principais |
|----------|-----------|
| **Memória** | `memory_store`, `memory_search`, `memory_search_unified` |
| **Ponte** | `memory_import_claude`, `memory_bridge_status` |
| **Swarm** | `swarm_init`, `swarm_status`, `swarm_health` |
| **Agentes** | `agent_spawn`, `agent_list`, `agent_status` |
| **Hooks** | `hooks_route`, `hooks_post-task`, `hooks_worker-dispatch` |
| **Segurança** | `aidefence_scan`, `aidefence_is_safe`, `aidefence_has_pii` |
| **Hive-Mind** | `hive-mind_init`, `hive-mind_consensus`, `hive-mind_spawn` |

### Workers em segundo plano

| Worker | Quando |
|--------|------|
| `audit` | Depois de mudanças de segurança |
| `optimize` | Depois de trabalho de performance |
| `testgaps` | Depois de adicionar features |
| `map` | A cada 5+ arquivos alterados |
| `document` | Depois de mudanças de API |

```bash
npx @claude-flow/cli@latest hooks worker dispatch --trigger audit
```

## Agentes

**Núcleo**: `coder`, `reviewer`, `tester`, `planner`, `researcher`
**Arquitetura**: `system-architect`, `backend-dev`, `mobile-dev`
**Segurança**: `security-architect`, `security-auditor`
**Performance**: `performance-engineer`, `perf-analyzer`
**Coordenação**: `hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`
**GitHub**: `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

Qualquer string serve como tipo de agente personalizado.

## Build e testes

- SEMPRE rode os testes depois de mudar código
- SEMPRE confirme que o build passa antes de commitar

```bash
npm run build && npm test
```

## Referência rápida da CLI

```bash
npx @claude-flow/cli@latest init --wizard           # Configuração
npx @claude-flow/cli@latest swarm init --v3-mode     # Inicia o swarm
npx @claude-flow/cli@latest memory search --query "" # Busca vetorial
npx @claude-flow/cli@latest hooks route --task ""    # Roteia para um agente
npx @claude-flow/cli@latest doctor --fix             # Diagnóstico
npx @claude-flow/cli@latest security scan            # Varredura de segurança
npx @claude-flow/cli@latest performance benchmark    # Benchmarks
```

26 comandos, mais de 140 subcomandos. Use `--help` em qualquer comando para ver detalhes.

## Instalação

```bash
claude mcp add claude-flow -- npx -y ruflo@latest mcp start
npx ruflo@latest doctor --fix
```

> O `daemon` em segundo plano é opcional. Ele roda workers em intervalos, e cada
> um abre uma sessão `claude` headless, então consome tokens o tempo todo. Só
> inicie se quiser essas varreduras: `npx ruflo@latest daemon start` (para
> sozinho depois de 12h por padrão; `--ttl 0` desativa, `daemon status --all`
> mostra os daemons rodando).

A **ferramenta Agent** cuida da execução (agentes, arquivos, código, git). As **ferramentas MCP** cuidam da coordenação (swarm, memória, hooks). A **CLI** faz o mesmo via Bash.
