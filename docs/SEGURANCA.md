# Segurança

## Já corrigido

- **Bypass de autenticação removido**: `get_current_user_id` confiava num cabeçalho `X-User-Id` enviado pelo próprio cliente, e caía num usuário padrão (`id=1`) se nada fosse enviado. Qualquer requisição sem credencial nenhuma conseguia ler/escrever dados de qualquer conta. Hoje, sem uma sessão válida, a resposta é sempre `401`.
- **Token nunca era enviado pelo frontend**: todas as chamadas autenticadas ignoravam o `session_token` guardado no login. Corrigido — anexado automaticamente em `fetchWithTimeout`.
- **Hash de senha correto**: PBKDF2-HMAC-SHA256, salt aleatório por usuário, 100 mil iterações, comparação em tempo constante (`hmac.compare_digest`) — evita ataque de timing.
- **CORS restrito** a uma lista explícita de origens (`ALLOWED_ORIGINS`), não mais `*`.
- **Erros 401 escondidos como "sem dados"**: cada tela engolia qualquer erro (incluindo falha de autenticação) e mostrava listas vazias, como se o usuário não tivesse nada cadastrado. Corrigido — 401 agora força logout e avisa que a sessão expirou.
- **Rate limiting no login**: 5 falhas seguidas para o mesmo IP+e-mail (ou 20 do mesmo IP) bloqueiam novas tentativas por 15 minutos, com resposta `429` e `Retry-After`. Fica em memória (`app/core/rate_limit.py`) — com vários processos/servidores, trocar por Redis.
- **`SECRET_KEY` obrigatória fora de desenvolvimento**: com `ENVIRONMENT` diferente de `development`, o backend se recusa a subir sem uma chave própria de pelo menos 32 caracteres.
- **"Esqueci a senha" não revela mais se o e-mail existe**: a resposta é idêntica para contas existentes e inexistentes.
- **Backend legado removido**: `backend/main.py` (sem autenticação, CORS `*` e com um `DELETE /api/reset` que apagava tudo) foi apagado.
- **`backend/finance.db` removido do git** — estava versionado apesar do `.gitignore`. Atenção: ele continua no histórico de commits antigos.

## Ainda precisa de atenção antes de produção

- **`jwt_payload` não é assinado** — é só base64 do payload, sem HMAC/assinatura. Não é usado hoje para autenticar nada, mas também não deve ser usado assim no futuro sem antes implementar assinatura de verdade (ex: biblioteca `python-jose` ou `pyjwt`).
- **Sessão fica só em `localStorage`**, acessível via JavaScript (vulnerável a XSS, caso algum dia exista uma injeção de script). Migrar para cookie `HttpOnly` + `Secure` + `SameSite` é mais seguro, mas exige mudanças no fluxo de CORS/credentials.
- **Recuperação de senha não envia e-mail de verdade** — o endpoint existe e responde com sucesso, mas não há integração com provedor de e-mail. Enquanto isso não existir, o "esqueci minha senha" é só uma tela, sem efeito real.
