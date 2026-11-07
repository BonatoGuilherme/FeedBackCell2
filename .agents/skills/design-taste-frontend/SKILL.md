---
name: design-taste-frontend
description: >-
  tasteskill 2.5.0, a skill de frontend contra designs genéricos. Cria sites profissionais para
  empresas no nível de figma.com e x.ai: texto direto, um único sistema visual, uma seção por tela,
  margens alinhadas, fotografias reais e interfaces reais do produto (renders do produto quando
  não houver fotografias), com efeitos de shader, cenários e momentos visuais apenas em páginas
  de tecnologia, jogos e software, microinterações discretas e um verificador que valida tudo em
  um navegador real. Use sempre que criar, projetar, refazer, reestilizar, aprimorar ou revisar
  uma landing page ou site de empresa, produto, loja, café, hotel, estúdio, SaaS, IA, ferramenta
  para desenvolvedores ou jogo, em qualquer stack (HTML/CSS, React, Next.js, Vue, Svelte, Astro,
  Tailwind), ou quando o usuário disser que uma página parece genérica, baseada em template ou
  "feita por IA".
---

# tasteskill 2.5

Crie o site que uma boa empresa publicaria: ele explica com clareza o que vende, mostra o produto
real em cada tela e parece feito para aquele cliente — não baseado em um template nem uma obra de
arte. figma.com e x.ai são a referência (em palavras: seção 1 de `layout-v4.md`).

`<skill>` é esta pasta. Ela precisa do Node 22+ e do Chrome, Edge ou Chromium (ffmpeg é opcional).
Copie `<skill>/assets` para `assets` do projeto e comece por `assets/starter.html`.

## Regras gerais

Estas nove regras têm prioridade sobre todo o restante desta skill.

1. **Não coloque legenda nem descrição sob imagens, renders ou elementos visuais.** Os créditos
   de licença ficam em uma única linha no rodapé.
2. **Todo elemento visual deve ser renderizado, sem áreas vazias,** nas larguras 1440, 1024,
   768 e 390.
3. **Uma seção por tela:** somente o hero na primeira tela; cada seção deve ter exatamente uma ou
   duas telas de altura em 1440x900; não deixe aparecer o título da seção seguinte.
4. **Alinhe as margens esquerda e direita do conteúdo.**
5. **Microanimações ao passar o cursor:** um card com link sobe 2px; uma foto amplia para
   1.02-1.03 dentro da moldura; botões reagem ao passar o cursor e ao clicar; sublinhados são
   desenhados; animações em loop nos cards duram de 2,5 a 4 s, repetem e reiniciam ao passar o
   cursor. A camada de movimento cuida disso: não a remova nem sobrescreva. Sem inclinação,
   carrosséis ou abas temporizadas.
6. **Use mais fotografias reais e melhores quando fizer sentido;** capriche nos fundos, heroes,
   layouts e fontes.
7. **Use ícones coloridos reais** (o ícone verdadeiro de um produto conhecido, nunca desenhado);
   inclua pequenos diagramas nos cards (um hub com ramificações; uma entrada, um processador
   principal e três fluxos paralelos; pulsos percorrendo as linhas).
8. **Os cenários de sites premiados e os momentos criativos fazem parte da skill,** mas efeitos
   de shader só devem ser usados quando o negócio tiver um tema técnico (tecnologia, IA,
   ferramentas para desenvolvedores, jogos, fintech ou hardware), nunca em um café, padaria,
   pousada ou loja local: nesses casos, use fotografias.
9. **Endereços:** informe apenas rua e bairro (se não houver rua, informe o bairro), sem número,
   CEP ou coordenadas; não inclua números de registro ou de IVA; não use telefone em formato
   real; use contatos em `.example`.

## 1. O tipo de negócio determina tudo

Escreva o tipo na primeira linha do plano e declare-o na página: o tipo da página em
`<html data-type>` e `<meta name="page-type">` (com o mesmo valor), além de
`<meta name="site-kind">`; para um estabelecimento, adicione `<meta name="page-kind" content="place">`.
Os componentes de composição usam a última coluna (`start.mjs --page`, `moments.mjs --page`),
e o componente do hero usa o tipo da página; `consistency.mjs` lê essas metatags.

| Briefing | tipo da página | site-kind | tipo |
|---|---|---|---|
| Aplicativo, SaaS, IA, ferramenta para desenvolvedores, fintech, aplicativo bancário ou estúdio que vende seu próprio software | software | software | software |
| Jogo ou estúdio lançando um jogo | software | gaming | gaming |
| Hardware ou dispositivo tecnológico (drone, braço robótico, teclado) | product | tech | tech |
| Qualquer outro produto ou marca física (cadeira, bicicleta, grãos de café vendidos online) | product | other | product |
| Pessoas contratam o serviço: clínica, escritório de advocacia, agência, estúdio criativo ou prestador de serviços | service | other | service |
| Pessoas visitam o local: café, bar, padaria, restaurante, pousada, hotel pequeno, loja, floricultura, bicicletaria, academia ou estúdio local | place | other | place |

Um negócio que também recebe clientes ou oferece aulas (estúdio de cerâmica, padaria com loja
virtual) é um **place**; a loja virtual vira a seção de produtos. Só é produto quando nada
acontece no local físico.

"Tech" abaixo significa `site-kind` software, gaming ou tech; "other" significa todo o restante.
Efeitos, cenários, momentos, animações em loop, contadores, fundos CSS, páginas escuras e heroes
escuros são exclusivos de tech. Uma página de outro tipo usa fotografias, cores chapadas,
tipografia, ícones reais e a camada de interação ao passar o cursor.

## 2. O plano da página por tipo

Planos completos, listas para composição e ordem das seções: `references/sections.md`.

- **Place** (café, padaria, pousada, loja). Fotografias em destaque: de 12 a 20 na página
  completa, de 8 a 12 na versão compacta; menos de 8 molduras resulta na página curta de 3 telas,
  independentemente do negócio. Se não houver fotos do cliente, siga o caminho de rascunho
  (`photos.md`) e depois conte-as. O hero deve usar uma fotografia sempre que couber uma moldura
  (para um local remoto, use a paisagem da região); a seção de visita fica na segunda tela,
  seguida da oferta, do local e de pedidos ou reservas.
  **Variedade sem efeitos** (`sections.md`, seção 4): a oferta e o local devem ter composições
  diferentes; nunca faça duas seções em torno da mesma imagem; inclua um momento tipográfico
  (endereço ou nome em destaque); uma ação principal por tela; texto de lista com 16px. Fundos
  chapados, fotografias quadradas, um estilo de botão e a barra de telefone; sem efeitos,
  fundos decorativos, momentos, loops, fragmentos, diagramas ou abas.
- **Product e service** (`site-kind` other). Fotografias em destaque: o produto, as pessoas, os
  ambientes e o trabalho; em uma página de produto, use pelo menos duas por tela. Use ícones
  reais das ferramentas usadas pelo estúdio; no máximo um diagrama estático; fundos chapados e
  uma faixa de cor da marca. Sem shader, impressão, granulação, gradiente, momento, cenário ou
  loop; WebGL somente para renderizar o produto. **Um produto físico sem fotografias deve ser
  mostrado:** o render (imagens estáticas) em `assets/objects/product-render` aparece no hero e
  depois ao longo da página completa do produto; nunca use um desenho ou foto genérica de
  inspiração (`sections.md`).
- **Toda página de produto** (fotografada ou renderizada, inclusive hardware; a referência é
  Figure e 1X; `sections.md`, Product): o produto deve aparecer **grande**, ocupando a maior
  parte da moldura ou a escala principal no fundo; nunca em tamanho médio dentro de um painel
  cinza arredondado sobre fundo cinza. Use **uma imagem diferente em cada seção**, sem repetir
  uma vista; **mostre cada promessa do título** (uma bicicleta familiar deve mostrar o banco
  infantil); use composições planejadas, nunca repita a mesma estrutura e inclua um fundo
  contrastante; **o seletor de cor deve trocar a imagem**, mostrando cada cor uma vez; **não
  repita informações**; os botões devem reagir ao passar o cursor e ao clicar (regra 5).
- **Tech** (software, jogos, hardware). O tema do próprio cliente aparece em primeiro plano e
  em escala real. Software: sua própria interface como HTML ativo, mostrando o que o produto
  faz (uma ferramenta de revisão de código: diferenças em vermelho e verde e a ação Accept) em
  um `app-frame`; nunca use um dashboard genérico nem apenas fragmentos em painéis. Cards:
  fragmentos em painéis iluminados, diagramas pulsantes e ícones reais. Hardware: use suas
  fotografias ou, se não houver, seu render (como acima); nunca faça um hero dividido que tenha
  apenas um formulário de pedido ou um SVG desenhado. Jogo: inclua o nome no h1, uma frase de
  lançamento e o universo do jogo em uma arte principal que ocupe toda a área (ou seu render);
  não substitua o universo por um efeito (`sections.md`, Gaming). Use de **60 a 80 palavras por
  tela** fora das interfaces simuladas (`copy.md`). Conforme a composição: **um efeito** (fundo
  shader no hero ou o único quadro `[data-visual]`, uma peça WebGL, um objeto ou um grande
  cenário) e **um ou dois momentos** em seções próprias; no máximo quatro contextos WebGL ativos;
  nenhum card deve se mover com a rolagem (`effects-usage.md`).
- **Um único objeto não pode sustentar a página inteira.** O produto ou objeto principal do hero
  aparece inteiro no hero e em **no máximo duas outras seções**; outras imagens adequadas ao
  briefing devem preencher o restante (`sections.md`, seção 1 e sua tabela): o universo, a equipe
  e o mapa de um jogo; o uso na bancada e uma vista explodida ou de componentes de um hardware;
  um card com diagrama estático, um momento tipográfico ou uma fotografia contextual quando o
  negócio permitir.
- **Os materiais do cliente precisam de espaço próprio.** Um trailer, arte principal,
  capturas de tela, renders CAD ou vídeo de movimento mencionados no briefing devem ter cada um
  um quadro que já pareça finalizado (uma tag `<video>` real com imagem de pôster preparada, um
  controle de reprodução somente quando existir uma página ou arquivo para reproduzir, de três
  a cinco capturas do universo visual disponíveis no kit, um quadro CAD). Identifique em um
  comentário o arquivo do cliente; nunca deixe o quadro vazio (`sections-library.md`, client-slots).

## 3. O que usar em cada página

Antes de usar uma família de assets, leia a referência correspondente. Um travessão significa
"nunca usar".

| Necessidade | Asset | Software, gaming | Hardware | Product, service | Place | Referência |
|---|---|---|---|---|---|---|
| Alturas, margens, heroes, tipografia | `system.css`, `assets/layout` | hero composto | hero composto | hero composto | hero de estabelecimento | `layout-v4.md` |
| Seções e receitas | `starter.html` | plano próprio | plano de produto | plano próprio | plano de estabelecimento | `sections.md`, `sections-library.md` |
| Tokens, grade, botões, navegação, rodapé, cores | `system.css`, `system.js` | sim | sim | sim | tokens de estabelecimento | `system.md` |
| Textos, contatos, créditos | | sim | sim | sim | sim | `copy.md` |
| Interação ao passar o cursor, clique, foco, navegação, abas | `assets/motion` | sim | sim | sim | sim | `motion.md` |
| Loops em cards, contador | `assets/motion`, `assets/ui` | sim | sim | - | - | `motion.md`, `cards.md` |
| Fotografias | `scripts/photos.mjs` | pessoas, clientes; arte de um jogo | destaque | destaque | destaque, 12-20 | `photos.md` |
| Ícones reais de ferramentas, apps e arquivos | `scripts/icons.mjs` | sim | sim | ferramentas realmente usadas | - | `icons.md` |
| Cards de recursos, fragmentos de interface | `assets/ui` | destaque (nenhum em jogos) | seu app | um app usado pelo cliente | - | `cards.md` |
| Cards com diagramas (hub, fluxos, pulsos) | `assets/diagrams` | 0-2, pulsantes | 0-2, pulsantes | 0-1, estático | - | `diagrams.md` |
| Fundos CSS | `assets/backgrounds` | 0-2 compostos | 0-2 compostos | tokens chapados | tokens chapados | `backgrounds.md` |
| Fundos shader | `assets/effects` | o único efeito | o único efeito | - | - | `effects-usage.md` |
| Componentes criativos (`fx-*`) | `assets/components` | sim | sim | `fx-photo` simples, `fx-map` estático | `fx-map` estático | `effects-creative.md` |
| Objetos e texturas | `assets/objects` | um, como efeito; jogo sem arte: seu render | render se não houver fotografias | render se não houver fotografias | - | `effects-objects.md` |
| Momentos de sites premiados | `assets/moments` | 0-2 | 0-2 | - | - | `moments.md` |
| Grandes cenários | `assets/scenes` | 0-1 | 0-1 | - | - | `scenes.md` |
| Desempenho e peso | `scripts/perf.mjs` | sim | sim | sim | sim | `perf.md` |

Antes de criar a primeira página, leia `copy.md`, `system.md`, `layout-v4.md` e `sections.md`
por completo.

## 4. Execução

1. **Leia o briefing.** Anote o tipo (seção 1), o que é vendido, quem compra, a ação principal
   (a transação: reservar um quarto, pedir um bolo, iniciar um teste grátis; para um
   estabelecimento sem outra ação, obter direções) e os materiais reais: logo, telas,
   fotografias, preços, endereço e horário de funcionamento.

2. **Escreva todo o texto primeiro,** conforme `copy.md`: o h1 identifica a categoria e o
   cliente ou o estabelecimento (para um jogo, nome e gênero), a primeira tela apresenta um
   dado concreto, cada título tem um substantivo e os botões usam um verbo e um objeto. Não
   invente nada além de um nome de marca criado (pesquise antes e salve o resultado em
   `names.json` ao lado da página) e, para um estabelecimento, horários e preços plausíveis.

3. **Planeje a página tela por tela.** Linha 1: o tipo. Linha 2: a composição (etapa 4). Depois,
   uma linha por seção: seu id, a ideia única, a imagem e o tipo (objeto, uso, componentes,
   universo, espaço reservado, diagrama, tipografia; no máximo três linhas de objeto), a
   quantidade de telas (1 ou 2, conforme a altura do conteúdo, seção 2 de `layout-v4.md`) e,
   para tech, a seção que terá o efeito, o cenário ou um momento. Escolha as fotografias agora
   (`photos.md`); a quantidade, incluindo imagens provisórias, determina a extensão da página
   de estabelecimento (seção 2). Depois, leia `cards.md` e a receita de cada id usado em
   `sections-library.md`.

4. **Componha seguindo o sorteio, não o gosto pessoal.** Cada comando mantém um histórico, para
   que as páginas sejam diferentes:

   ```bash
   node <skill>/assets/layout/deal.mjs --type <page type> --has <photo,ui,object,film> --history .taste-skill/layout-history.json   # o hero; para jogos, adicione --kind gaming; para hardware, --kind tech
   node <skill>/scripts/start.mjs deal --page <kind> --history .taste-skill/history.json    # três paletas, três combinações; adicione --axis após uma palavra ou um hero editorial
   node <skill>/scripts/start.mjs css --page <kind> --palette <id> --type <id> --radius soft --history .taste-skill/history.json
   node <skill>/scripts/start.mjs brand --page place --bg "#.." --ink "#.." --accent "#.." [--surface "#.."] [--muted "#.."] --type <id> --radius soft   # estabelecimento: use suas próprias cores em vez de css
   node -e "for(const l of process.argv.slice(1)){const o=l.split('|');console.log(o[Math.floor(Math.random()*o.length)])}" <the kind's lists in sections.md>
   ```

   Um produto, hardware ou jogo sem fotografias ou arte deve ser composto com `--has object`:
   use sempre o hero `product`, com o enquadramento mais amplo do render preenchendo a área e
   sem caixa (para um jogo, sempre passe `--has`). O hero de um estabelecimento é definido
   manualmente, nunca por sorteio (`--type place`). Se uma seção sorteada precisar de uma
   fotografia que a página não tem, faça o sorteio novamente (`sections.md`, seção 2). Escolha
   a paleta e a combinação que melhor atendam ao cliente (use as próprias cores da marca com
   `start.mjs brand`; sempre em estabelecimentos, conforme `sections.md`, seção 4, Look); nunca
   use violeta: sorteie novamente. Mantenha o bloco `:root` exatamente como foi gerado.
   Arredondamento: `sharp` para fintech e ferramentas de desenvolvimento, `soft` como padrão,
   `round` para apps de consumo e cantos quadrados em estabelecimentos. Somente em tech: o fundo
   iluminado (`<html data-ground>`: `sand|sky|sage` usando o comando de uma linha), os fundos
   CSS (`backgrounds.md`), o único efeito (`effects-usage.md`) e os momentos (`moments.md`).
   Registre cada resultado na linha 2 do plano e no comentário no início de `<body>` e construa
   exatamente essa composição (uma página curta omite o que não tiver seção correspondente;
   `sections.md`, seção 4).

5. **Construa a página.** Em `starter.html`: configure `<html data-type data-radius data-buttons data-motion>`
   e as três metatags, além da classe de navegação; copie somente
   `<section class="hero …">` de `assets/layout/hero-<id>.html` (nunca sua navegação, outras
   seções, rodapé ou linha de créditos; substitua todo texto e imagem pelos do cliente); mova o
   fechamento e o rodapé compostos para fora dos respectivos `<template>` e exclua o restante.
   Cada seção deve ser `main > section`, com um `.wrap`, seu h2 em primeiro lugar e `--h: 1` ou
   `2`. Construa cada seção conforme sua receita, usando as classes e tokens do sistema; escreva
   CSS exclusivo da página apenas quando uma referência indicar CSS próprio (dentro de um
   elemento visual, `--p-h`, `.wall`, `.rail`, `.device`). Cole a interface de
   `assets/ui/<name>/fragment.html` e substitua todos os nomes, números e logos pelos do cliente
   (os ícones do kit tornam-se `data-icon`; consulte `cards.md`); por último, execute
   `icons.mjs scan index.html --out assets/icons --colour` para que cada ícone usado na página
   seja um arquivo local. Instale efeitos, objetos, momentos ou cenários exatamente como
   indicado em suas referências, nunca por meio de um script próprio. Créditos: use uma única
   linha de créditos produzida por `photos.mjs credits`, depois que a marcação usar as
   fotografias (o comando lê a página).

6. **Valide e confira visualmente.** Use somente os scripts da skill, cada um iniciando um único
   Chrome sem interface, com WebGL na CPU, encerrado pelo próprio PID, um de cada vez; nunca use
   um navegador com interface gráfica ou uma ferramenta de navegador. Cada script disponibiliza
   o próprio arquivo da página via HTTP em 127.0.0.1 (nunca `file://`), então não é preciso
   iniciar um servidor. Para uma página compilada cujos links começam na raiz do site
   (`/_astro/page.css`), passe `--root` com a pasta de build (`dist`). Depois execute:

   ```bash
   node <skill>/scripts/consistency.mjs index.html --widths 1440,1024,820,768,390 --rhythm-widths 1440,820,768,390 --profile <dir> --page <kind> --category "<what is sold>" --primary "<main action>"
   node <skill>/assets/layout/check.mjs --url index.html --profile <dir> --sizes 1440x900,1024x768,820x1180,768x1024,390x844 --shots shots/layout
   node <skill>/scripts/shoot.mjs --url index.html --w 1440 --out shots/1440.png --profile <dir>
   node <skill>/scripts/perf.mjs index.html --profile <dir>
   ```

   Capture também 1024, 820x1180, 768x1024 e 390. Cada apontamento do `check.mjs` reprova a
   página (não use `--no-stress`). Corrija todos os FAILs (se considerar algum falso positivo,
   registre o motivo no relatório), capture novamente e compare cada screenshot com a lista de
   verificação.

7. **Relate os resultados:** o tipo, a composição (paleta, combinação, hero, fundos, efeito,
   momentos e cenário); os resultados dos verificadores, do layout e do desempenho; o que não
   pôde ser validado; cada preço, horário ou endereço presumido e a pesquisa do nome criado; as
   fotografias e artes que o cliente precisa fornecer, incluindo cada imagem provisória; cada
   espaço reservado para material do cliente, seu arquivo e a imagem provisória usada.

## 5. Lista de verificação

Cada item indica os verificadores correspondentes: ids do `consistency.mjs` entre colchetes,
apontamentos do `check.mjs` entre chaves e linhas do `perf.mjs`. O último item depende da
avaliação visual.

- **Primeira tela:** informa o que é vendido, para quem ou onde, com um dado concreto
  [copy-headline, copy-fact]; o hero ocupa sozinho a primeira tela em todas as larguras, com a
  ação principal dentro dele [hero-screen, hero-fill, fold-action, fold-cut] {hero-fold}.
- **Uma seção por tela:** cada seção tem uma ou duas telas, h2 no início e alinhado ao topo; o
  título ou a imagem da seção vizinha não aparece dentro dela; não há áreas vazias
  [section-height, one-section, one-heading, section-air, one-screen, section-gaps]
  {screen-short, screen-height, sparse, neighbour, neighbour-ground}.
- **Margens iguais:** cada bloco se alinha às bordas do `.wrap` ou às colunas da grade; nenhum
  elemento fica deslocado para um lado e não há rolagem horizontal
  [container-edges, row-lines, split-pair, off-grid, right-edge, col-edge, spill, off-viewport,
  stagger, top-stagger] {edge-left, edge-right, spill, bleed-one-side, one-sided, lines}.
- **Todos os elementos visuais são renderizados** em 1440, 1024, 768 e 390; efeitos recusados
  exibem a alternativa estática [visual-empty, empty-visual, gl-fallback, shader-lint,
  no-visual, photo-weight].
- **Sem legendas:** nenhuma legenda explica, pede desculpas ou identifica uma imagem; os
  créditos aparecem em uma única linha do rodapé [visual-caption, caption, credit-wall,
  photo-credit]. Não use placeholders, notas de exemplo ou endereços `.example` impressos
  [placeholder, sample-label].
- **Elementos adequados ao tipo:** não use fundos de efeito, impressão, cenários ou momentos
  fora de tech (WebGL só para render de produto) [effect-kind, effects-fit, photo-print]; mostre
  o próprio tema: o produto grande e inteiro em no máximo três seções, com imagens diferentes
  [product-shown, same-object, photo-repeat]; cada asset mencionado no briefing em seu espaço
  reservado; nome e universo do jogo como arte principal; diferenças de código na ferramenta de
  revisão; `app-frame` do software; fotografias reais quando fizer sentido, sem repetições
  [photo-set, photo-repeat, photo-upscale]; ícones reais em suas cores originais; fundos
  chapados em páginas de outros tipos [grounds]; um estabelecimento tem duas composições
  diferentes e um momento tipográfico.
- **Movimento:** botões, links, cards com link e fotografias com link reagem visivelmente ao
  cursor; nada inclina [motion-layer, hover, hover-move, tilt]; loops nos cards duram de 2,5 a
  4 s [loop-cycle]; nada se move por causa da rolagem, exceto um momento composto ou um grande
  cenário dentro de sua própria seção em tech [scroll-linked, scroll-reveal, pinned: expected
  only there]; qualquer animação com mais de 5 s tem um botão de pausa [loop-pause]; com
  movimento reduzido, tudo fica parado e nenhum conteúdo permanece oculto
  [reduced-motion, hidden-content]; no máximo quatro contextos ativos [webgl].
- **Contatos** conforme a regra 9 [street-number, postcode, coordinates, company-number,
  phone-number].
- **Um único sistema visual:** um par de botões, um estilo de card, uma escala de
  arredondamento e um estilo de link [button-styles, button-shape, card-family, card-layout,
  link-styles]; no máximo dois níveis de caixas aninhadas [nesting]; uma escala de títulos, com
  suas fontes carregadas [heading-scale, font-load]; contraste no texto [text-contrast,
  contrast].
- **Texto e links:** títulos nomeiam coisas; botões usam verbo e objeto; no máximo duas ações
  no hero [copy-headings, copy-buttons, copy-actions, action-count]; um dado, uma formulação
  [fact-agree]; todos os links funcionam e os formulários são enviados [links, forms].
- **Rapidez:** nenhuma linha FAIL no `perf.mjs` (peso das imagens, contextos, mudança de layout).
- **820, 768 e 390:** as seções ocupam suas telas [section-height]; a primeira tela termina
  inteira ou em um corte visual intencional [fold-card] (`layout-v4.md`); layouts divididos
  empilham o texto primeiro, sem metade vazia da linha; uma coluna em 390, botões na largura
  total, menu em tela cheia e barra de ação para estabelecimentos.
- **Avaliação visual:** ao lado das referências figma.com e x.ai, o resultado parece o site de
  uma empresa profissional; nada inclinado, desalinhado, cortado ou sobreposto; o hero mostra
  o trabalho, não apenas uma atmosfera.

## 6. Nunca faça

- Cards, linhas ou blocos animados durante a rolagem; animações de entrada, fades ou parallax;
  piscadas aleatórias.
- Apresentar fotos genéricas como se fossem do produto, das pessoas ou do estabelecimento do
  cliente; criar uma página de produto que não mostra o produto.
- Desenhar uma imitação de um logo real; inventar avaliações, citações, clientes ou números.
- Usar violeta ou lavanda no design da página: cor de destaque, fundo, gradiente, cor de efeito
  ou tonalidade (logos reais de terceiros mantêm suas cores; consulte `icons.md`).
- Copiar código, textos, imagens ou efeitos característicos de um site usado como referência.
- Excluir ou editar os arquivos do kit (`assets/`, `scripts/`) para eliminar um apontamento: se
  um verificador sinalizar um arquivo do kit, registre isso no relatório e verifique a página
  novamente após qualquer alteração.

## Referências

Todas estão em `references/`; a seção 3 indica a referência necessária para cada asset.
