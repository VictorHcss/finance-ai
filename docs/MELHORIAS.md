# Melhorias — Setembro/2026

Este documento explica, com detalhe técnico, tudo que foi alterado nesta rodada
de trabalho no Finance.AI: o que foi corrigido, o que foi adicionado e por quê.
Ele complementa — não substitui — a documentação já existente:

- [`README.md`](../README.md) — visão geral, como rodar o projeto, stack e estrutura de pastas.
- [`ARQUITETURA.md`](ARQUITETURA.md) — como autenticação, isolamento por usuário e insights funcionam por baixo dos panos.
- [`IDEIAS.md`](IDEIAS.md) — próximas implementações sugeridas (de onde saiu a exportação em CSV desta rodada).
- [`SEGURANCA.md`](SEGURANCA.md) — o que já foi corrigido em segurança e o que ainda falta.

Se você não conhece o projeto ainda, comece pelo `README.md` — ele explica o que
o Finance.AI é, a stack (Next.js 15 + FastAPI/SQLite) e como o app funciona em
dois modos (com backend real, ou em `localStorage` quando o backend está fora
do ar). Este documento assume que você já leu aquilo.

---

## 1. O ícone de perfil estava em dois lugares — agora está só no header

**O problema:** o avatar do usuário (aquele círculo verde com as iniciais)
aparecia em dois lugares ao mesmo tempo: no rodapé do menu lateral
(`Sidebar.tsx`) — visível tanto no drawer mobile quanto fixo na versão desktop
— e também no cabeçalho (`Navbar.tsx`), mas só em telas pequenas (`md:hidden`).
No celular, isso significava dois caminhos diferentes pra a mesma coisa
(abrir o menu hambúrguer e ver o avatar lá embaixo, ou olhar direto pro
canto superior direito), o que é confuso e redundante.

**O que foi feito:**

- `Sidebar.tsx` perdeu o cartão de perfil do rodapé inteiro (avatar, nome,
  e-mail, botão de sair). "Configurações" continua como item normal de
  navegação — não perdeu nenhum caminho de acesso, só o avatar duplicado.
- `Navbar.tsx` passou a mostrar o avatar/menu do usuário em **qualquer
  tamanho de tela**, não só mobile. A limitação `md:hidden` foi removida.
- Esse menu agora usa o componente `DropdownMenu` que já existia em
  `src/components/ui/` (Radix UI) — antes era um dropdown feito na mão com
  `useState` + `useRef` + listener de clique fora. Menos código, e ganha de
  graça navegação por teclado e fechamento ao pressionar Esc.
- O dropdown agora tem duas opções: **Configurações** (novo — antes só
  existia no cartão do Sidebar) e **Sair**.

**Por que no header, e não no Sidebar:** pensando em quem usa o app no
celular, o canto superior é a área mais consistente entre as páginas — o
Sidebar, no mobile, é um drawer que precisa ser aberto antes, enquanto o
header já está sempre visível na tela.

## 2. Bug de layout: hambúrguer sobrepondo o título em tablets

Efeito colateral encontrado enquanto mexia no header: o espaçador reservado
para o botão hambúrguer usava `md:hidden` (some a partir de 768px), mas o
próprio botão hambúrguer (`Sidebar.tsx`) usa `lg:hidden` (some a partir de
1024px). Entre 768px e 1024px — a faixa de tablets em pé — o botão continuava
visível, mas o espaço reservado pra ele já tinha sumido, e o título da página
ficava parcialmente atrás do botão. Corrigido alinhando os dois para `lg:hidden`.

## 3. O toggle "Insights de IA" não tinha efeito nenhum — agora tem

Esse era o pedido de "refinar a IA do sistema", e acabou sendo a descoberta
mais importante desta rodada: o campo `ai_enabled` sempre existiu na tabela
`settings` e no formulário de Configurações, mas **nunca era consultado em
lugar nenhum**. Desligar "Insights Semanais da IA" salvava a preferência no
banco e não mudava absolutamente nada — o Dashboard e a tela de Insights
continuavam gerando as mesmas análises de sempre.

**O que foi feito** (nos dois modos do app, API e local):

- `backend/app/routers/insights.py` agora consulta as configurações do
  usuário antes de gerar qualquer análise. Se `ai_enabled` for `false`,
  devolve uma resposta "desligada" (`ai_enabled: false`, listas vazias, uma
  mensagem explicando o estado) em vez de rodar `InsightService.get_insights`.
- `backend/app/schemas/finance.py` — `InsightResponse` ganhou o campo
  `ai_enabled: bool`.
- `src/lib/localStorage.ts` — o modo offline replica exatamente a mesma
  lógica, lendo a preferência salva em `localStorage` antes de chamar
  `computeInsights`.
- `src/app/dashboard/page.tsx` — o card "Insight da IA" agora tem um terceiro
  estado (além de "carregando dados" e "com dados"): quando `ai_enabled` é
  `false`, mostra a mensagem de desativado com um link direto para
  Configurações, em vez de continuar mostrando os últimos números calculados.
- `src/app/insights/page.tsx` — a página inteira passou a ter uma tela
  dedicada para o estado desligado (ícone, explicação, botão "Ir para
  Configurações"), em vez de mostrar os cards vazios como se fosse "sem
  dados ainda".

Testado de ponta a ponta: logando na conta demo, desligando o toggle via
`PUT /api/settings` e confirmando que `GET /api/insights` passa a devolver
`ai_enabled: false` com listas vazias — e volta ao normal ao religar.

## 4. Novo recurso: exportar transações em CSV

Peguei essa sugestão direto do `docs/IDEIAS.md`, na lista de "rápidas de
fazer, impacto imediato" — útil pra declaração de imposto de renda ou
conferência manual, e reaproveita os mesmos dados que a tela de Extrato já
carrega.

**Como funciona** (`src/lib/csv.ts` + botão em `src/app/transactions/page.tsx`):

- Roda inteiramente no navegador, sem chamada nova ao backend — por isso
  funciona igual nos dois modos do app (API ou localStorage).
- Exporta exatamente a lista **filtrada** que está na tela (se você buscou
  por "aluguel", exporta só as transações que aparecem depois do filtro).
- Formato pensado pra abrir direto no Excel/LibreOffice em pt-BR: delimitador
  `;` (porque `,` já é separador decimal aqui), números com vírgula decimal,
  e um BOM UTF-8 no início do arquivo — sem isso, acentos aparecem
  corrompidos quando o Excel abre o CSV com duplo-clique.
- Campos com aspas, ponto-e-vírgula ou quebra de linha são escapados
  seguindo o padrão CSV (RFC 4180).
- O botão fica ao lado da busca: só o ícone em telas pequenas (alvo de toque
  de 42×42px), com o texto "Exportar CSV" aparecendo a partir de `sm`.

## 5. Página de Configurações redesenhada

Pedido explícito: deixar "mais completa e bonita". O que mudou em
`src/app/settings/page.tsx`:

- **Cartão de perfil** ganhou um avatar (mesmo estilo do header, iniciais em
  gradiente) ao lado dos campos de nome/e-mail, e uma linha "Membro desde
  {data}" usando o `created_at` que a API já devolve e que não era usado em
  lugar nenhum da tela.
- **Notificações e IA**: a descrição do toggle de IA agora explica o efeito
  real dele ("o Dashboard e a tela de Insights param de gerar novas
  análises"), amarrando com a correção do item 3. Os switches ficaram
  maiores (`w-12 h-7`, antes `w-10 h-5`) — alvo de toque melhor no celular.
- **Preferências Regionais** (seção nova): mostra moeda e idioma como
  informação — não como campo editável. O backend já guarda `currency` e
  `locale` por usuário (tabela `settings`), mas nenhuma tela do sistema hoje
  formata valores de acordo com eles (tudo é BRL/pt-BR fixo — ver
  "Multi-moeda" em `IDEIAS.md`). Preferi deixar isso claro em vez de simular
  um seletor que não teria efeito nenhum, do mesmo jeito que o toggle de IA
  não tinha até esta rodada.
- **Zona de Risco**: as duas ações destrutivas (limpar histórico, excluir
  conta) ganharam seção própria, com borda e fundo em tom de vermelho —
  antes dividiam a mesma caixa neutra das outras seções, o que facilita um
  clique apressado numa ação irreversível.
- Botões de ação em largura total no celular (`w-full sm:w-auto`), em vez de
  botões estreitos flutuando à direita.

## 6. Verificação

- `npx tsc --noEmit` — sem erros de tipo.
- `npx eslint src` — sem warnings ou erros.
- `npm run build` — chegou a compilar o app inteiro; só falhou no download
  das fontes do Google (`Manrope`, `JetBrains Mono`) por falta de acesso à
  internet no ambiente onde essas mudanças foram feitas. Não é um problema
  de código — rodando com rede normal (`npm run dev` ou `npm run build` numa
  máquina com internet) as fontes carregam normalmente, como sempre
  carregaram.
- Backend testado de ponta a ponta manualmente (login na conta demo,
  `GET`/`PUT /api/settings`, `GET /api/insights` nos dois estados).

## O que eu conscientemente deixei de fora

- **Toggle de tema claro/escuro**: existe um `ThemeProvider` (next-themes)
  configurado no projeto, mas o `globals.css` só define variáveis pro tema
  escuro — é uma decisão de design deliberada, documentada no próprio CSS
  ("o app é escuro por padrão em todas as telas"). Adicionar um seletor de
  tema exigiria desenhar uma paleta clara inteira, o que é um projeto à
  parte, não uma melhoria pontual.
- **Troca de senha na tela de Configurações**: não existe endpoint no
  backend pra isso hoje (só cadastro, login e "esqueci minha senha", que
  por sua vez não envia e-mail de verdade — ver `SEGURANCA.md`). Preferi não
  desenhar um formulário que não teria com o que conversar no backend.
