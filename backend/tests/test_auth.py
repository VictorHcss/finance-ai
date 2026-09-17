def test_registro_cria_usuario_e_sessao(client):
    resp = client.post(
        "/api/auth/register",
        json={"name": "Maria Silva", "email": "maria@teste.com", "password": "senha12345"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["user"]["email"] == "maria@teste.com"
    assert data["session_token"]


def test_registro_com_email_duplicado_e_rejeitado(client):
    payload = {"name": "Maria Silva", "email": "maria@teste.com", "password": "senha12345"}
    first = client.post("/api/auth/register", json=payload)
    assert first.status_code == 200

    second = client.post("/api/auth/register", json=payload)
    assert second.status_code == 409


def test_registro_com_senha_curta_e_rejeitado(client):
    resp = client.post(
        "/api/auth/register",
        json={"name": "Maria Silva", "email": "maria2@teste.com", "password": "123"},
    )
    assert resp.status_code == 422


def test_login_com_senha_errada_e_rejeitado(client):
    client.post(
        "/api/auth/register",
        json={"name": "Maria Silva", "email": "maria3@teste.com", "password": "senha12345"},
    )
    resp = client.post("/api/auth/login", json={"email": "maria3@teste.com", "password": "senha-errada"})
    assert resp.status_code == 401


def test_login_com_email_inexistente_e_rejeitado(client):
    resp = client.post("/api/auth/login", json={"email": "ninguem@teste.com", "password": "senha12345"})
    assert resp.status_code == 401


def test_perfil_exige_autenticacao(client):
    resp = client.get("/api/auth/profile")
    assert resp.status_code == 401


def test_perfil_retorna_usuario_correto(client, auth_headers):
    resp = client.get("/api/auth/profile", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "demo@finance.ai"


def test_atualizar_perfil_para_email_ja_usado_e_rejeitado(client, auth_headers):
    client.post(
        "/api/auth/register",
        json={"name": "Outra Pessoa", "email": "ocupado@teste.com", "password": "senha12345"},
    )
    resp = client.put("/api/auth/profile", headers=auth_headers, json={"email": "ocupado@teste.com"})
    assert resp.status_code == 409


def test_token_invalido_e_rejeitado(client):
    resp = client.get("/api/auth/profile", headers={"Authorization": "Bearer token-que-nao-existe"})
    assert resp.status_code == 401


def test_logout_invalida_o_token(client, auth_headers):
    resp = client.post("/api/auth/logout", headers=auth_headers)
    assert resp.status_code == 200

    # O mesmo token não deve mais servir para autenticar depois do logout.
    resp2 = client.get("/api/auth/profile", headers=auth_headers)
    assert resp2.status_code == 401
