def create_transaction(client, headers, **overrides):
    payload = {
        "description": "Transação de teste",
        "amount": 100.0,
        "type": "expense",
        "category": "Outros",
        "date": "2026-08-01",
    }
    payload.update(overrides)
    return client.post("/api/transactions", headers=headers, json=payload)


def create_goal(client, headers, **overrides):
    payload = {"name": "Meta de teste", "target_amount": 1000.0, "current_amount": 0}
    payload.update(overrides)
    return client.post("/api/goals", headers=headers, json=payload)


def get_only_id(client, headers):
    transactions = client.get("/api/transactions", headers=headers).json()
    assert len(transactions) == 1
    return transactions[0]["id"]


# ---------------------------------------------------------------------------
# Transações — autenticação e isolamento entre usuários
# ---------------------------------------------------------------------------


def test_criar_transacao_exige_autenticacao(client):
    resp = client.post(
        "/api/transactions",
        json={"description": "X", "amount": 10, "type": "expense", "category": "Outros", "date": "2026-08-01"},
    )
    assert resp.status_code == 401


def test_transacao_com_valor_negativo_e_rejeitada(client, user_a_headers):
    resp = create_transaction(client, user_a_headers, amount=-10)
    assert resp.status_code == 422


def test_usuario_nao_atualiza_transacao_de_outro(client, user_a_headers, user_b_headers):
    create_transaction(client, user_a_headers, description="Da conta A")
    tx_id = get_only_id(client, user_a_headers)

    resp = client.put(
        f"/api/transactions/{tx_id}",
        headers=user_b_headers,
        json={
            "description": "Alterado por B",
            "amount": 999,
            "type": "expense",
            "category": "Hack",
            "date": "2026-08-01",
        },
    )
    assert resp.status_code == 404

    # A transação original de A continua intacta.
    transactions_a = client.get("/api/transactions", headers=user_a_headers).json()
    assert transactions_a[0]["description"] == "Da conta A"


def test_usuario_nao_exclui_transacao_de_outro(client, user_a_headers, user_b_headers):
    create_transaction(client, user_a_headers)
    tx_id = get_only_id(client, user_a_headers)

    resp = client.delete(f"/api/transactions/{tx_id}", headers=user_b_headers)
    assert resp.status_code == 404

    transactions_a = client.get("/api/transactions", headers=user_a_headers).json()
    assert len(transactions_a) == 1


def test_excluir_transacao_inexistente_retorna_404(client, user_a_headers):
    resp = client.delete("/api/transactions/999999", headers=user_a_headers)
    assert resp.status_code == 404


def test_usuario_so_ve_suas_proprias_transacoes(client, user_a_headers, user_b_headers):
    create_transaction(client, user_a_headers, description="De A")
    create_transaction(client, user_b_headers, description="De B")

    transactions_a = client.get("/api/transactions", headers=user_a_headers).json()
    transactions_b = client.get("/api/transactions", headers=user_b_headers).json()

    assert [t["description"] for t in transactions_a] == ["De A"]
    assert [t["description"] for t in transactions_b] == ["De B"]


# ---------------------------------------------------------------------------
# Metas — autenticação e isolamento entre usuários
# ---------------------------------------------------------------------------


def test_usuario_nao_deposita_em_meta_de_outro(client, user_a_headers, user_b_headers):
    create_goal(client, user_a_headers, name="Meta de A")
    goal_id = client.get("/api/goals/status", headers=user_a_headers).json()[0]["id"]

    resp = client.post(f"/api/goals/{goal_id}/deposit", headers=user_b_headers, json={"amount": 100})
    assert resp.status_code == 404

    goal = client.get("/api/goals/status", headers=user_a_headers).json()[0]
    assert goal["current"] == 0


def test_usuario_nao_completa_meta_de_outro(client, user_a_headers, user_b_headers):
    create_goal(client, user_a_headers, name="Meta de A")
    goal_id = client.get("/api/goals/status", headers=user_a_headers).json()[0]["id"]

    resp = client.post(f"/api/goals/{goal_id}/complete", headers=user_b_headers)
    assert resp.status_code == 404

    goal = client.get("/api/goals/status", headers=user_a_headers).json()[0]
    assert goal["completed"] is False


def test_usuario_nao_exclui_meta_de_outro(client, user_a_headers, user_b_headers):
    create_goal(client, user_a_headers, name="Meta de A")
    goal_id = client.get("/api/goals/status", headers=user_a_headers).json()[0]["id"]

    resp = client.delete(f"/api/goals/{goal_id}", headers=user_b_headers)
    assert resp.status_code == 404
    assert len(client.get("/api/goals/status", headers=user_a_headers).json()) == 1


def test_deposito_negativo_e_rejeitado(client, user_a_headers):
    create_goal(client, user_a_headers)
    goal_id = client.get("/api/goals/status", headers=user_a_headers).json()[0]["id"]

    resp = client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": -50})
    assert resp.status_code == 422


def test_deposito_atualiza_percentual_e_marca_concluida_ao_atingir_meta(client, user_a_headers):
    create_goal(client, user_a_headers, target_amount=200.0, current_amount=0)
    goal_id = client.get("/api/goals/status", headers=user_a_headers).json()[0]["id"]

    resp = client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 200})
    assert resp.status_code == 200
    assert resp.json()["completed"] is True

    goal = client.get("/api/goals/status", headers=user_a_headers).json()[0]
    assert goal["percent"] == 100
    assert goal["completed"] is True
    assert goal["missing"] == 0


# ---------------------------------------------------------------------------
# Dashboard — cálculo de saldo e tendências
# ---------------------------------------------------------------------------


def test_resumo_do_dashboard_calcula_saldo_corretamente(client, user_a_headers):
    create_transaction(client, user_a_headers, description="Salário", amount=3000, type="income", date="2026-08-01")
    create_transaction(client, user_a_headers, description="Aluguel", amount=1200, type="expense", date="2026-08-02")

    resp = client.get("/api/dashboard-summary", headers=user_a_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["incomes"] == 3000
    assert data["expenses"] == 1200
    assert data["total"] == 1800
    assert data["expense_ratio"] == 40.0  # 1200 / 3000 * 100


def test_resumo_do_dashboard_calcula_tendencia_mes_a_mes(client, user_a_headers):
    # Mês anterior: saldo de 1000. Mês atual: saldo de 1500 → alta de 50%.
    create_transaction(client, user_a_headers, description="Receita jul", amount=2000, type="income", date="2026-07-01")
    create_transaction(client, user_a_headers, description="Despesa jul", amount=1000, type="expense", date="2026-07-02")
    create_transaction(client, user_a_headers, description="Receita ago", amount=2500, type="income", date="2026-08-01")
    create_transaction(client, user_a_headers, description="Despesa ago", amount=1000, type="expense", date="2026-08-02")

    data = client.get("/api/dashboard-summary", headers=user_a_headers).json()
    assert data["balance_trend_percentage"] == 50.0


def test_resumo_do_dashboard_sem_transacoes_nao_gera_divisao_por_zero(client, user_a_headers):
    resp = client.get("/api/dashboard-summary", headers=user_a_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["incomes"] == 0
    assert data["expenses"] == 0
    assert data["expense_ratio"] == 0
    assert data["balance_trend_percentage"] == 0
