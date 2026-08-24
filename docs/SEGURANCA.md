# Segurança

## Já corrigido

- **Bypass de autenticação removido**: `get_current_user_id` confiava num cabeçalho `X-User-Id` enviado pelo próprio cliente, e caía num usuário padrão (`id=1`) se nada fosse enviado. Qualquer requisição sem credencial nenhuma conseguia ler/escrever dados de qualquer conta. Hoje, sem uma sessão válida, a resposta é sempre `401`.
- **Token nunca era enviado pelo frontend**: todas as chamadas autenticadas ignoravam o `session_token` guardado no login. Corrigido — anexado automaticamente em `fetchWithTimeout`.
- **Hash de senha correto**: PBKDF2-HMAC-SHA256, salt aleatório por usuário, 100 mil iterações, comparação em tempo constante (`hmac.compare_digest`) — evita ataque de timing.
- **CORS restrito** a uma lista explícita de origens (`ALLOWED_ORIGINS`), não mais `*`.
- **Erros 401 escondidos como "sem dados"**: cada tela engolia qualquer erro (incluindo falha de autenticação) e mostrava listas vazias, como se o usuário não tivesse nada cadastrado. Corrigido — 401 agora força logout e avisa que a sessão expirou.

## Ainda precisa de atenção antes de produção

- **`SECRET_KEY`/`JWT_SECRET` com valor padrão de desenvolvimento** (`dev-secret-key-change-in-production`) caso a variável de ambiente não seja definida. Trocar por um valor real e único antes de qualquer deploy público — hoje, se alguém descobrir esse valor padrão (é só ler o código-fonte), consegue forjar qualquer coisa que dependa dele.
- **`jwt_payload` não é assinado** — é só base64 do payload, sem HMAC/assinatura. Não é usado hoje para autenticar nada, mas também não deve ser usado assim no futuro sem antes implementar assinatura de verdade (ex: biblioteca `python-jose` ou `pyjwt`).
- **Sessão fica só em `localStorage`**, acessível via JavaScript (vulnerável a XSS, caso algum dia exista uma injeção de script). Migrar para cookie `HttpOnly` + `Secure` + `SameSite` é mais seguro, mas exige mudanças no fluxo de CORS/credentials.
- **Recuperação de senha não envia e-mail de verdade** — o endpoint existe e responde com sucesso, mas não há integração com provedor de e-mail. Enquanto isso não existir, o "esqueci minha senha" é só uma tela, sem efeito real.
- **Sem rate limiting** em `/api/auth/login` — nada impede tentativas de força bruta contra uma conta hoje. Vale considerar um limite de tentativas por IP/e-mail antes de expor publicamente.
- **`finance.db` não deve ser versionado** (já está no `.gitignore`, mas vale conferir sempre antes de um `git add .` apressado) — ele contém hashes de senha e dados financeiros reais assim que alguém usar o sistema de verdade.
