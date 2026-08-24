# Ideias de implementação

Organizado por esforço x impacto, não por ordem de importância absoluta — escolha conforme o tempo disponível.

## Rápidas de fazer, impacto imediato

- **Exportar transações** (CSV ou PDF) — útil pra declaração de imposto de renda ou conferência manual. É basicamente formatar a mesma lista que já existe em `/transactions`.
- **Filtro por categoria/data no Extrato** — hoje só existe busca por texto livre. Os dados já têm `category` e `date`, é "só" adicionar os controles de filtro (o mesmo padrão que já existe em Notificações, `NotificationFilters.tsx`, dá pra copiar a ideia).
- **Paginação no Extrato** — com poucas transações não importa, mas cresce mal com o tempo. Backend já devolve tudo de uma vez; adicionar `page`/`page_size` no `list_transactions`.
- **Confirmar exclusão de transação com o valor visível** — hoje o `confirm()` do navegador só mostra a descrição. Mostrar o valor formatado também reduz erro de clicar errado.
- **Estado vazio melhor no gráfico do Dashboard** — hoje, sem dados, o `FinanceChart` mostra um gráfico vazio sem contexto. Uma mensagem "Adicione sua primeira transação" com botão direto ajudaria.

## Médio esforço, bom retorno

- **Categorias como entidade própria**, não texto livre. Hoje `category` é uma string qualquer digitada no formulário — sem padronização, "Alimentação" e "alimentação" viram categorias diferentes nos agrupamentos do Insights. Uma lista fixa (ou uma tabela `categories` por usuário, com cor e ícone) resolve isso e deixa a categorização mais confiável.
- **Editar meta** (hoje só existe criar/depositar/concluir/excluir — falta editar nome, valor alvo ou prazo sem precisar recriar a meta do zero).
- **Recorrência automática de transações** — "esse gasto se repete todo mês" como opção ao criar (ex: aluguel, assinatura). O `insight_service.py` já detecta recorrência analisando o histórico; isso seria o inverso, deixar o usuário declarar a recorrência de antemão e gerar as transações futuras sozinho.
- **Gráfico de gastos por categoria** (pizza/barras) na tela de Insights, complementando o gráfico de linha temporal que já existe.
- **Testes automatizados no backend** — hoje zero testes. Mesmo 10-15 testes cobrindo os pontos mais sensíveis (isolamento por usuário, hash de senha, cálculo de tendências, exclusão de transação de outra conta) já mudam muito a percepção de qualidade do projeto, e evitam regressão silenciosa (como o bug do card de Entradas que só foi encontrado numa auditoria manual).

## Maior esforço, mudança estrutural

- **JWT assinado de verdade**, substituindo o `session_token` opaco (ou complementando). Só vale a pena se o sistema crescer pra múltiplos serviços/microsserviços que precisem validar identidade sem bater no banco a cada requisição.
- **Cookies HttpOnly em vez de localStorage** para a sessão — mais seguro contra XSS, mas exige ajustar CORS (`credentials: include`) e lidar com CSRF.
- **Fila de e-mail real** para recuperação de senha (ex: integração com Resend, SendGrid ou similar) — hoje é só uma tela sem efeito nenhum no fluxo real.
- **Multi-moeda** — a tabela `settings` já tem um campo `currency`, mas nada no sistema usa isso hoje; toda formatação está fixa em `pt-BR`/`BRL`.
- **Sincronização entre modo local e modo API** — hoje são dois mundos que nunca se falam. Se o modo offline for pra valer (não só demonstração), a pessoa que usa o app sem internet e depois volta a ter conexão vai esperar que os dados se juntem, não que sumam.
- **Notificações realmente proativas** — hoje elas só existem se alguém inserir manualmente (ou pelo seed da demo). Caberia um job periódico (ou trigger no create de transação) que gera notificação real quando: uma meta é concluída, um gasto está muito acima da média da categoria, ou o insight mensal muda de severidade.

## Ideias de produto (mais especulativas)

- **Compartilhar meta entre duas contas** (ex: casal economizando pra uma viagem junto) — mudança de modelo de dados (meta deixaria de pertencer a um único `user_id`).
- **Modo "orçamento"**: definir um teto mensal por categoria e receber aviso ao se aproximar do limite (os `alertas de gastos críticos` em Configurações já sugerem essa ideia, mas hoje o toggle não está ligado a nenhuma lógica real de limite).
- **Comparativo anual** — hoje o histórico mostra só os últimos 6 meses; um "este ano vs. ano passado" seria natural dado que os dados já têm data completa.
