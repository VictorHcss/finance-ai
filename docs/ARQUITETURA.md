# Arquitetura

## Autenticação

```
Cliente faz login
  ↓
POST /api/auth/login (e-mail + senha)
  ↓
Backend confere senha com password_verify() (PBKDF2 + salt, 100 mil iterações)
  ↓
Gera um token opaco aleatório (secrets.token_urlsafe), grava na tabela `sessions`
  ↓
Devolve { user, session_token, expires_at } ao cliente
  ↓
Frontend guarda tudo isso em localStorage["financeai_session"]
  ↓
Toda chamada seguinte anexa Authorization: Bearer <token> automaticamente
  (feito dentro de fetchWithTimeout, em src/lib/api.ts — nenhuma tela
  precisa lembrar de fazer isso manualmente)
  ↓
Backend (app/dependencies.py) valida o token contra a tabela `sessions`
  e verifica a expiração antes de identificar o user_id
```

Não é JWT de verdade. O campo `jwt_payload` devolvido pelo login é só um payload informativo em base64, **sem assinatura** — ele existe como estrutura preparada para uma migração futura a JWT assinado, mas hoje **nenhuma rota confia nele**. A autenticação real acontece via `session_token` opaco, validado contra a tabela `sessions` a cada requisição. Isso é importante: se algum dia esse `jwt_payload` passar a ser usado para autenticar alguma coisa sem adicionar assinatura (HMAC/RSA) e verificação, é uma falha de segurança grave — qualquer um poderia forjar um payload válido.

### Isolamento por usuário

Toda tabela com dado pessoal (`transactions`, `goals`, `notifications`, `settings`, `ai_insights`, `audit_logs`) tem uma coluna `user_id`, e **toda query em `app/repositories/` filtra por ela** — inclusive updates/deletes usam `WHERE id = ? AND user_id = ?`, então tentar mexer no recurso de outra conta (mesmo sabendo o ID) devolve 404, não um erro de permissão que revelaria a existência do recurso.

Isso já foi testado explicitamente: duas contas criadas ao mesmo tempo, cada uma só vê os próprios dados, e tentar adivinhar o ID de um recurso de outra conta não funciona.

## Camada de dados no frontend (modo API vs. modo local)

```
Tela (ex: transactions/page.tsx)
  ↓
storage.getTransactions()          ← src/lib/storage.ts
  ↓
Backend disponível?
  ├── Sim → api.getTransactions()       (src/lib/api.ts, chamada HTTP real)
  └── Não → localStorageApi.getTransactions()  (src/lib/localStorage.ts)
```

A disponibilidade do backend é verificada uma vez por sessão (`checkBackendAvailability()`), com um health-check leve. Se uma chamada em modo "api" falhar por rede/timeout/5xx, o sistema troca pra modo local automaticamente e não tenta mais a API pelo resto da sessão (fica em cache até um refresh forçado).

Erros 4xx (ex: 401, 422) **não** disparam esse fallback — eles são erros reais de autenticação/validação, não de indisponibilidade, e por isso são repassados pra tela tratar (ver próxima seção).

## Tratamento de erros

`src/lib/api.ts` classifica todo erro de rede em um `HttpError` com um `kind`:

- `network_unavailable` / `timeout` / `http_5xx` → dispara fallback para modo local
- `http_4xx` → repassado pra tela

Cada tela usa o hook `useHandleFetchError()` (`src/hooks/useHandleFetchError.ts`) no `catch`:

- Se o erro for 401 → desloga automaticamente e mostra aviso de sessão expirada (evita mostrar "nenhum dado" quando na verdade é "sessão inválida")
- Qualquer outro erro → mostra um toast de erro, sem quebrar a tela

## Insights — o que é calculado de verdade

`app/services/insight_service.py` não usa nenhuma biblioteca de IA/ML — é estatística sobre as transações reais do usuário. As mesmas regras estão portadas em `src/lib/localStorage.ts`, então o modo offline calcula exatamente a mesma coisa (ver "Paridade API × LocalStorage" abaixo).

- **Categoria dominante**: soma de gastos por categoria no mês atual, pega a maior
- **Despesa recorrente**: agrupa transações por descrição normalizada (minúsculo, sem espaços extras), sinaliza quando o mesmo texto aparece 2+ vezes
- **Pressão de fluxo de caixa**: `gastos do mês / receita do mês`
- **Tendência de receita**: comparação mês atual vs. mês anterior
- **Projeção de meta**: `(valor faltante) / (receita do mês - gastos do mês)`, arredondado pra cima em meses
- **Mudança de comportamento** (com explicabilidade): para cada categoria com gasto no mês atual E no mês anterior, calcula a diferença; a categoria com maior aumento absoluto gera um insight com `explanation` — valor do período atual, período anterior, diferença, percentual e as descrições que mais contribuíram (`top_contributors`, top 3 por valor). Só é gerado quando há uma base real no mês anterior pra comparar — sem isso, o sistema não inventa uma variação a partir do zero.

Isso significa que **os insights só existem se houver histórico suficiente** — uma conta nova, com poucas transações, recebe uma mensagem "cadastre mais transações", não um card inventado.

### Normalização de categoria

Categoria continua sendo texto livre (`category: str`), mas duas grafias da mesma categoria ("Alimentação", "alimentação", "ALIMENTAÇÃO") são tratadas como uma só em qualquer agrupamento — sem migrar nenhum dado já salvo:

- `normalize_category_key()` (`app/core/categorization.py` / `src/lib/category.ts`): minúsculo, sem acento, sem espaço duplicado — usado como chave de agrupamento em Insights e no filtro de categoria do Extrato.
- `format_category_label()`: capitalização por palavra, aplicada ao **salvar** uma transação nova/editada (schema `TransactionCreate`, e no modal de transação no modo local) — reduz a divergência de grafia em dados futuros, mas não reescreve o que já existe no banco.

### Resumo financeiro mensal

`InsightResponse.resumo_mensal` (opcional): receitas, despesas, saldo e as 3 categorias que mais pesaram no mês atual, com percentual sobre o total de gastos. Calculado a partir dos mesmos agregados mensais que os insights já usam — não é uma consulta separada.

## Importação de extrato (CSV/OFX)

```
Arquivo
  ↓
Identificação do formato (extensão)
  ↓
Parser (CSV: delimitador ; ou ,, datas BR/US/ISO, débito/crédito separado ou coluna única;
         OFX: <STMTTRN>)
  ↓
Normalização (valor sempre positivo + type income/expense; descrição; categoria sugerida por regra)
  ↓
Deduplicação (hash determinístico de data+descrição normalizada+valor+tipo,
              OU external_id do arquivo quando existe — ex: FITID do OFX)
  ↓
Preview (linhas "new" / "duplicated" / "error", nada é salvo ainda)
  ↓
Confirmação (usuário marca quais linhas incluir, pode editar descrição/categoria)
  ↓
Persistência
```

**Paridade API × LocalStorage — só CSV.** `app/core/import_parsing.py` (backend) e `src/lib/csvImport.ts` (frontend) implementam o mesmo parser CSV nas duas linguagens — mesmas regras de data/valor/delimitador, validadas manualmente linha a linha contra os testes de `backend/tests/test_import.py`. **OFX continua existindo só na API** (o parser OFX não foi portado); no modo local, a tela de importação identifica um arquivo `.ofx` e avisa que ele exige conexão, em vez de tentar processar e falhar silenciosamente.

O hash de deduplicação usa algoritmos diferentes em cada lado (SHA-256 no backend, um hash não-criptográfico mais simples no frontend, em `src/lib/dedupe.ts`) — não precisam ser idênticos bit a bit, já que são dois espaços de armazenamento independentes (banco do servidor vs. `localStorage` do navegador); só precisam ser consistentes dentro de cada um. Toda transação (manual ou importada), nos dois modos, grava esse hash — é o que permite uma importação futura reconhecer como duplicata algo que o usuário já cadastrou à mão.

## Dashboard — três tendências, não uma

O card de "Saldo Total", "Entradas" e "Saídas" cada um tem sua própria métrica de tendência mês a mês:

- `balance_trend_percentage` — variação do saldo líquido mensal
- `income_trend_percentage` — variação das entradas
- `expense_trend_percentage` — variação das saídas

Isso corrigiu um bug real: antes, os três cards reaproveitavam o mesmo número (a variação de gastos vinda do endpoint de Insights), então o card de Entradas mostrava, sem ninguém perceber, a tendência de Saídas. **Calculado nos dois modos** (`finance_service.get_dashboard_summary()` no backend, `computeDashboardSummary()` em `src/lib/localStorage.ts`) — antes, o modo local sempre devolvia as três tendências fixas em `0`.

## Identidade visual da IA

Qualquer conteúdo que vem de uma leitura da IA sobre os dados (não um número bruto da conta) usa a cor `ai-*` definida em `tailwind.config.js` — roxa, deliberadamente fora da paleta financeira (verde = dinheiro, vermelho = alerta/saída). Usada no card de insight do Dashboard, na tela de Insights inteira e no toggle de IA em Configurações. Ícone padrão: `Sparkles` (lucide-react).
