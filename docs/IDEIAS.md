# Ideias de implementação

Organizado por esforço x impacto, não por ordem de importância absoluta — escolha conforme o tempo disponível.

## Rápidas de fazer, impacto imediato

- **Paginação no Extrato** — com poucas transações não importa, mas cresce mal com o tempo. Backend já devolve tudo de uma vez; adicionar `page`/`page_size` no `list_transactions`.
- **Confirmar exclusão de meta com o valor visível** — o Extrato já mostra o valor formatado na confirmação de exclusão (`transactions/page.tsx`); `GoalCard.tsx` (excluir meta) ainda só mostra o nome. Mesma ideia, falta só nesse lugar.
- **Estado vazio melhor no gráfico do Dashboard** — hoje, sem dados, o `FinanceChart` mostra um gráfico vazio sem contexto. Uma mensagem "Adicione sua primeira transação" com botão direto ajudaria.
- **Skeleton de carregamento no restante de Configurações** — a seção de Notificações e IA já mostra um esqueleto enquanto `GET /api/settings` não volta; o cartão de Perfil ainda não tem equivalente.

## Médio esforço, bom retorno

- **Categorias como entidade própria** (cor, ícone, tabela por usuário), não só texto livre normalizado. A divergência de grafia ("Alimentação" vs. "alimentação") já foi resolvida — duas grafias diferentes já somam juntas em qualquer agrupamento (Insights, filtro do Extrato), sem precisar de uma tabela nova. O que falta é a parte visual (cor/ícone por categoria) e um autocomplete que sugira categorias já usadas, em vez do usuário digitar de novo cada vez.
- **Editar meta** (hoje só existe criar/depositar/concluir/excluir — falta editar nome, valor alvo ou prazo sem precisar recriar a meta do zero).
- **Recorrência automática de transações** — "esse gasto se repete todo mês" como opção ao criar (ex: aluguel, assinatura). O `insight_service.py` já detecta recorrência analisando o histórico; isso seria o inverso, deixar o usuário declarar a recorrência de antemão e gerar as transações futuras sozinho.
- **Gráfico de gastos por categoria** (pizza/barras) na tela de Insights — hoje o resumo mensal já mostra as 3 principais categorias como barras de progresso simples; um gráfico dedicado seria um complemento, não substituição.
- **Importação de OFX no modo LocalStorage** — hoje só CSV tem paridade entre os dois modos (ver `ARQUITETURA.md`); um arquivo `.ofx` no modo offline mostra um aviso claro em vez de falhar, mas não é processado. Portar o parser OFX pro navegador é o próximo passo natural se o modo offline precisar de paridade completa.

## Maior esforço, mudança estrutural

- **JWT assinado de verdade**, substituindo o `session_token` opaco (ou complementando). Só vale a pena se o sistema crescer pra múltiplos serviços/microsserviços que precisem validar identidade sem bater no banco a cada requisição.
- **Cookies HttpOnly em vez de localStorage** para a sessão — mais seguro contra XSS, mas exige ajustar CORS (`credentials: include`) e lidar com CSRF.
- **Fila de e-mail real** para recuperação de senha (ex: integração com Resend, SendGrid ou similar) — hoje é só uma tela sem efeito nenhum no fluxo real.
- **Multi-moeda** — a tabela `settings` já tem um campo `currency`, mas nada no sistema usa isso hoje; toda formatação está fixa em `pt-BR`/`BRL`.
- **Sincronização entre modo local e modo API** — hoje são dois mundos que nunca se falam, mesmo com a mesma regra de negócio rodando nos dois (Insights, importação CSV, tendências do Dashboard). Se o modo offline for pra valer (não só demonstração), a pessoa que usa o app sem internet e depois volta a ter conexão vai esperar que os dados se juntem, não que sumam.
- **Notificações realmente proativas** — hoje elas só existem se alguém inserir manualmente (ou pelo seed da demo). Caberia um job periódico (ou trigger no create de transação) que gera notificação real quando: uma meta é concluída, um gasto está muito acima da média da categoria, ou o insight mensal muda de severidade.

## Ideias de produto (mais especulativas)

- **Compartilhar meta entre duas contas** (ex: casal economizando pra uma viagem junto) — mudança de modelo de dados (meta deixaria de pertencer a um único `user_id`).
- **Modo "orçamento"**: definir um teto mensal por categoria e receber aviso ao se aproximar do limite (os `alertas de gastos críticos` em Configurações já sugerem essa ideia, mas hoje o toggle não está ligado a nenhuma lógica real de limite).
- **Comparativo anual** — hoje o histórico mostra só os últimos 6 meses; um "este ano vs. ano passado" seria natural dado que os dados já têm data completa.
