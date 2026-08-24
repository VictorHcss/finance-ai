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

`app/services/insight_service.py` não usa nenhuma biblioteca de IA/ML — é estatística sobre as transações reais do usuário:

- **Categoria dominante**: soma de gastos por categoria no mês atual, pega a maior
- **Despesa recorrente**: agrupa transações por descrição normalizada (minúsculo, sem espaços extras), sinaliza quando o mesmo texto aparece 2+ vezes
- **Pressão de fluxo de caixa**: `gastos do mês / receita do mês`
- **Tendência de receita**: comparação mês atual vs. mês anterior
- **Projeção de meta**: `(valor faltante) / (receita do mês - gastos do mês)`, arredondado pra cima em meses

Isso significa que **os insights só existem se houver histórico suficiente** — uma conta nova, com poucas transações, recebe uma mensagem "cadastre mais transações", não um card inventado.

## Dashboard — três tendências, não uma

O card de "Saldo Total", "Entradas" e "Saídas" cada um tem sua própria métrica de tendência mês a mês, calculada em `get_dashboard_summary()`:

- `balance_trend_percentage` — variação do saldo líquido mensal
- `income_trend_percentage` — variação das entradas
- `expense_trend_percentage` — variação das saídas

Isso corrigiu um bug real: antes, os três cards reaproveitavam o mesmo número (a variação de gastos vinda do endpoint de Insights), então o card de Entradas mostrava, sem ninguém perceber, a tendência de Saídas.
