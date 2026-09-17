# Melhorias — Rodada Ciclos 1 a 5

Este documento complementa o [`MELHORIAS.md`](MELHORIAS.md) (rodada anterior) e a
documentação de referência já existente:

- [`README.md`](../README.md) — visão geral, stack, como rodar o projeto.
- [`ARQUITETURA.md`](ARQUITETURA.md) — como autenticação, isolamento por usuário, Insights,
  importação e Dashboard funcionam por baixo dos panos (**atualizado nesta rodada**).
- [`SEGURANCA.md`](SEGURANCA.md) — o que já foi corrigido em segurança e o que ainda falta
  (nada mudou aqui nesta rodada — nenhuma alteração tocou autenticação/sessão).
- [`IDEIAS.md`](IDEIAS.md) — próximas implementações sugeridas (**atualizado nesta rodada**,
  removendo o que já foi feito e corrigindo itens que já estavam desatualizados).

Esta rodada foi dividida em 5 ciclos, cada um validado com `pytest` + `npx tsc --noEmit` +
`npx eslint src` antes de avançar pro próximo.

---

## Ciclo 1 — Estabilidade

**Normalização de categoria.** Categoria continua sendo texto livre, mas duas grafias da
mesma categoria ("Alimentação", "alimentação", "ALIMENTAÇÃO") passaram a ser tratadas como
uma só em qualquer agrupamento — sem migrar nenhum dado já salvo. `normalize_category_key()`
(chave de agrupamento) e `format_category_label()` (capitalização amigável, aplicada ao salvar
transações novas/editadas) existem nas duas linguagens: `app/core/categorization.py`
(backend) e `src/lib/category.ts` (frontend).

**Importação de extrato (CSV) no modo LocalStorage.** Antes, a tela de importação bloqueava
completamente quem estava no modo offline. Portei o parser CSV (delimitador, formatos de
data BR/US/ISO, colunas débito/crédito separadas, deduplicação) para `src/lib/csvImport.ts` +
`src/lib/dedupe.ts`, validados manualmente linha a linha contra os mesmos cenários de
`backend/tests/test_import.py`. OFX continua só na API — decisão consciente, não uma lacuna
escondida (a tela avisa isso explicitamente no modo local).

**Tendências do Dashboard no modo LocalStorage.** `balance_trend_percentage`,
`income_trend_percentage` e `expense_trend_percentage` sempre voltavam `0` no modo offline.
Portei o cálculo mês a mês de `finance_service.get_dashboard_summary()` para
`computeDashboardSummary()` em `src/lib/localStorage.ts`. De passagem, corrigi um bug na mesma
função: `expense_ratio` usava um denominador mínimo artificial de `1` quando não havia
receita no período, o que podia inflar o percentual — agora segue a mesma regra do backend
(`0` quando não há receita).

## Ciclo 2 — Insights

**Nova análise: "Mudança de comportamento detectada"**, com explicabilidade. Compara cada
categoria mês atual vs. mês anterior; a que mais aumentou gera um insight com o valor de cada
período, a diferença, o percentual e as descrições que mais contribuíram (`top_contributors`).
Só é gerado quando há base real no mês anterior — sem isso, o sistema não inventa uma
variação a partir do zero.

**Resumo financeiro mensal** (`InsightResponse.resumo_mensal`): receitas, despesas, saldo e as
3 categorias que mais pesaram no mês, com percentual sobre o total de gastos.

**Correção de estado**: a página de Insights tratava "ainda não há dados suficientes" (conta
nova) como se fosse falha de conexão, mostrando "verifique se o servidor está online" —
enganoso. Agora tem uma tela própria e honesta pra esse caso.

Tudo com paridade API × LocalStorage, testado com 3 casos novos em
`backend/tests/test_insight_behavior.py` (explicabilidade, resumo mensal, e o caso "sem base
de comparação, não gera insight").

## Ciclo 3 — UX

**Investigação de performance do cadastro**: o fluxo já busca resumo e insights em paralelo
(`Promise.all`), não em série — não achei requisição duplicada real.

**Tela de carregamento pós-cadastro**, com passos genuinamente reais (não decorativos):
"Conta criada" → "Perfil configurado" → "Preparando suas análises" — o último passo
literalmente busca o resumo e os insights que o Dashboard vai mostrar a seguir.

**Linguagem técnica removida da interface**: 5 lugares onde "backend"/"servidor" apareciam
pro usuário final (Landing, aviso de importação OFX offline, tela de erro de Insights).

**Botão "Adicionar Transação" corrigido**: a causa real do desalinhamento era um `gap-2` do
flexbox que continuava reservando espaço mesmo com o rótulo escondido (largura zero),
descentralizando o ícone dentro do círculo — e o efeito de expandir no hover não existe de
verdade em touch. Corrigido: círculo puro no mobile, expansão só a partir de `sm:`.

## Ciclo 4 — Qualidade (auditoria)

Auditoria sistemática de responsividade, acessibilidade e estados de interface nas 11 telas.
Achados corrigidos:

- **Modais sem acessibilidade**: `NewGoalModal` e `AddValueModal` não tinham
  `role="dialog"`/`aria-modal`/tecla Esc (diferente de `NewTransactionModal`, que já tinha).
- **Metas falhando em silêncio**: `NewGoalModal`, `AddValueModal` e `GoalCard` (concluir/
  excluir) só faziam `console.error` quando uma chamada falhava — zero feedback pro usuário.
  Toda a funcionalidade de Metas era muda em caso de erro, diferente do resto do app.
- **Área de toque**: botões de editar/excluir transação em 32×32px (abaixo do mínimo de 44px
  recomendado) no Dashboard e no card mobile do Extrato — com "editar" colado em "excluir"
  (ação destrutiva).
- **Controles sem nome acessível**: checkbox/descrição/categoria na tabela de importação.
- Grid de estatísticas da importação apertado em 320–375px; um caso real de contraste baixo
  (motivo de erro de importação em `zinc-600`, ilegível demais pro que carrega).

## Ciclo 5 — Produto + Visual

**Redesign estrutural da página de Insights**: Cabeçalho → Resumo do mês → **Principal
descoberta** (novo — destaca sozinho o insight de maior severidade, com toda a explicabilidade
do Ciclo 2) → Comparações (gráfico + previsão/economia/média/variação — `economias_sugeridas`
já existia no backend, mas nunca era mostrado nesta tela) → Análises detalhadas. Nenhuma regra
de negócio mudou, só a organização visual.

**Identidade visual da IA aplicada de fato**: o design system já definia uma cor `ai-*`
(roxa, deliberadamente fora da paleta financeira) em `tailwind.config.js`, comentada como
"acento exclusivo para conteúdo gerado por IA" — já usada no card de insight do Dashboard e no
toggle de Configurações, mas nunca na própria página de Insights nem na Landing (que usavam
`purple-400` genérico do Tailwind). Estendi a mesma cor pros dois lugares que faltavam.

**Microinterações**: duas animações reutilizáveis em `globals.css` (`fade-slide-up`,
`ai-pulse`) — entrada suave e escalonada dos cards, indicador discreto de "processando" no
cabeçalho dos Insights. As duas herdam a regra de `prefers-reduced-motion` que já existia.

**Landing Page**: ajustes pontuais, não reconstrução — a estrutura (Hero → mockup do produto →
Como funciona → Funcionalidades → Diferenciais → FAQ → CTA → Footer) já não tinha "cara de
projeto de portfólio" (sem métricas inventadas, já responsiva). Corrigi a cor da IA e
atualizei a copy do módulo de Insights e do FAQ pra refletir a explicabilidade real que existe
desde o Ciclo 2.

**Contraste**: varredura de `text-zinc-600` em todas as telas — mantido como convenção para
elementos puramente decorativos (divisores "ou", ícones de apoio), trocado por `zinc-500`
onde carregava informação real (rótulos de explicação nos Insights, textos de status na
importação/Configurações/Landing, o passo pendente na tela pós-cadastro).

**Skeleton em Configurações**: a seção "Notificações e IA" mostrava os toggles desabilitados
sem nenhuma indicação visual enquanto `GET /api/settings` não voltava. Agora mostra um
esqueleto enquanto carrega, como o resto do app já fazia em outras telas.

## Verificação (repetida a cada ciclo)

- `pytest` (backend): 56 passed (48 da rodada anterior + 8 novos: 5 de normalização de
  categoria em `test_categorization.py`, 3 de mudança de comportamento/resumo mensal em
  `test_insight_behavior.py`).
- `npx tsc --noEmit`: sem erros em nenhum ciclo.
- `npx eslint src`: sem erros/warnings em nenhum ciclo.
- `npm run build`: mesma limitação de ambiente em todos os ciclos — falha só no download das
  fontes do Google (`Manrope`, `JetBrains Mono`) por falta de acesso à internet no ambiente
  onde este trabalho foi feito. Não é regressão de código.

## O que ficou conscientemente de fora desta rodada

- **Importação de OFX no modo LocalStorage** — só CSV ganhou paridade (decisão explícita,
  ver Ciclo 1); portar o parser OFX pro navegador é o próximo passo natural se isso for
  prioridade.
- **Sincronização entre modo local e modo API** — os dois modos calculam a mesma coisa
  (Insights, tendências, importação CSV) de forma independente, mas os dados de um nunca
  aparecem no outro. Mudança estrutural maior, fora do escopo de "arrumar o que existe".
  Continua registrada em `IDEIAS.md`.
- **Verificação visual real em todos os breakpoints** — a responsividade foi revisada via
  código/classes Tailwind (grids que colapsam, alturas fixas testadas mentalmente em 320px),
  não visualmente num navegador de verdade.
