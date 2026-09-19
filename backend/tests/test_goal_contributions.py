"""Testes do "cofrinho" de metas: contribuições, planejador, e a relação
com transações (alocação de receita, edição e exclusão vinculadas)."""


def create_goal(client, headers, **overrides):
    payload = {"name": "Viagem para o Rio", "target_amount": 3000.0, "current_amount": 0}
    payload.update(overrides)
    resp = client.post("/api/goals", headers=headers, json=payload)
    assert resp.status_code == 200, resp.text
    goals = client.get("/api/goals/status", headers=headers).json()
    return [g for g in goals if g["goal_name"] == payload["name"]][0]["id"]


def create_income(client, headers, **overrides):
    payload = {
        "description": "Salário",
        "amount": 1500.0,
        "type": "income",
        "category": "Salário",
        "date": "2026-09-01",
    }
    payload.update(overrides)
    return client.post("/api/transactions", headers=headers, json=payload)


def goal_status(client, headers, goal_id):
    goals = client.get("/api/goals/status", headers=headers).json()
    return next(g for g in goals if g["id"] == goal_id)


# ---------------------------------------------------------------------------
# 1/2/3 — Criar contribuição via transação de receita, saldo derivado,
# valor destinado não vira despesa
# ---------------------------------------------------------------------------


def test_receita_com_alocacao_cria_contribuicao_e_atualiza_saldo_da_meta(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)

    resp = create_income(
        client, user_a_headers, goal_contribution={"goal_id": goal_id, "amount": 300}
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["goal_contribution"]["amount"] == 300.0
    assert body["goal_contribution"]["new_balance"] == 300.0

    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["current"] == 300.0
    assert goal["missing"] == 2700.0


def test_alocacao_para_meta_nao_e_tratada_como_despesa(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    create_income(client, user_a_headers, goal_contribution={"goal_id": goal_id, "amount": 300})

    summary = client.get("/api/dashboard-summary", headers=user_a_headers).json()
    # A receita inteira (R$ 1.500) continua contando como entrada — o
    # valor destinado à meta não vira uma despesa de R$ 300 nem reduz a
    # receita registrada.
    assert summary["incomes"] == 1500.0
    assert summary["expenses"] == 0.0

    transactions = client.get("/api/transactions", headers=user_a_headers).json()
    assert len(transactions) == 1
    assert transactions[0]["type"] == "income"
    assert transactions[0]["amount"] == 1500.0


def test_saldo_da_meta_e_a_soma_das_contribuicoes_nao_um_numero_solto(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    create_income(client, user_a_headers, description="Salário", amount=1000, goal_contribution={"goal_id": goal_id, "amount": 200})
    create_income(client, user_a_headers, description="Freela", amount=500, date="2026-09-05", goal_contribution={"goal_id": goal_id, "amount": 150})

    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["current"] == 350.0

    history = client.get(f"/api/goals/{goal_id}/contributions", headers=user_a_headers).json()
    assert len(history) == 2
    assert sorted(c["amount"] for c in history) == [150.0, 200.0]
    assert all(c["transaction_id"] is not None for c in history)


# ---------------------------------------------------------------------------
# 4 — Regras de validação
# ---------------------------------------------------------------------------


def test_alocacao_maior_que_a_receita_e_rejeitada(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    resp = create_income(
        client, user_a_headers, amount=500, goal_contribution={"goal_id": goal_id, "amount": 700}
    )
    assert resp.status_code == 422

    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["current"] == 0.0


def test_alocacao_em_despesa_e_rejeitada(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    resp = create_income(
        client,
        user_a_headers,
        type="expense",
        category="Outros",
        goal_contribution={"goal_id": goal_id, "amount": 100},
    )
    assert resp.status_code == 422


def test_alocacao_com_valor_zero_ou_negativo_e_rejeitada(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    resp = create_income(client, user_a_headers, goal_contribution={"goal_id": goal_id, "amount": 0})
    assert resp.status_code == 422

    resp = create_income(client, user_a_headers, goal_contribution={"goal_id": goal_id, "amount": -50})
    assert resp.status_code == 422


def test_alocacao_para_meta_de_outro_usuario_e_rejeitada(client, user_a_headers, user_b_headers):
    goal_id_b = create_goal(client, user_b_headers, name="Meta de B")
    resp = create_income(client, user_a_headers, goal_contribution={"goal_id": goal_id_b, "amount": 100})
    assert resp.status_code == 404

    goal_b = goal_status(client, user_b_headers, goal_id_b)
    assert goal_b["current"] == 0.0


def test_alocacao_para_meta_inexistente_e_rejeitada(client, user_a_headers):
    resp = create_income(client, user_a_headers, goal_contribution={"goal_id": 999999, "amount": 100})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# "Guardar dinheiro" / "Retirar dinheiro" direto na meta
# ---------------------------------------------------------------------------


def test_guardar_dinheiro_direto_na_meta_cria_contribuicao_manual(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    resp = client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 150})
    assert resp.status_code == 200
    assert resp.json()["new_amount"] == 150.0

    history = client.get(f"/api/goals/{goal_id}/contributions", headers=user_a_headers).json()
    assert len(history) == 1
    assert history[0]["source"] == "Contribuição manual"
    assert history[0]["transaction_id"] is None


def test_retirar_dinheiro_da_meta_reduz_saldo_e_registra_no_historico(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 500})

    resp = client.post(f"/api/goals/{goal_id}/withdraw", headers=user_a_headers, json={"amount": 200})
    assert resp.status_code == 200
    assert resp.json()["new_amount"] == 300.0

    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["current"] == 300.0

    history = client.get(f"/api/goals/{goal_id}/contributions", headers=user_a_headers).json()
    withdrawal = next(c for c in history if c["type"] == "withdrawal")
    assert withdrawal["amount"] == 200.0


def test_retirar_mais_do_que_o_saldo_guardado_e_rejeitado(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 100})

    resp = client.post(f"/api/goals/{goal_id}/withdraw", headers=user_a_headers, json={"amount": 200})
    assert resp.status_code == 422

    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["current"] == 100.0


def test_excluir_uma_contribuicao_manual_recalcula_o_saldo(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 500})
    history = client.get(f"/api/goals/{goal_id}/contributions", headers=user_a_headers).json()
    contribution_id = history[0]["id"]

    resp = client.delete(
        f"/api/goals/{goal_id}/contributions/{contribution_id}", headers=user_a_headers
    )
    assert resp.status_code == 200

    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["current"] == 0.0


# ---------------------------------------------------------------------------
# Edição e exclusão de transação vinculada (seção 14)
# ---------------------------------------------------------------------------


def test_editar_transacao_vinculada_para_valor_menor_que_a_contribuicao_e_rejeitado(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    create_income(client, user_a_headers, amount=1000, goal_contribution={"goal_id": goal_id, "amount": 400})
    tx_id = client.get("/api/transactions", headers=user_a_headers).json()[0]["id"]

    resp = client.put(
        f"/api/transactions/{tx_id}",
        headers=user_a_headers,
        json={"description": "Salário", "amount": 300, "type": "income", "category": "Salário", "date": "2026-09-01"},
    )
    assert resp.status_code == 422

    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["current"] == 400.0


def test_editar_transacao_vinculada_para_despesa_e_rejeitado(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    create_income(client, user_a_headers, amount=1000, goal_contribution={"goal_id": goal_id, "amount": 400})
    tx_id = client.get("/api/transactions", headers=user_a_headers).json()[0]["id"]

    resp = client.put(
        f"/api/transactions/{tx_id}",
        headers=user_a_headers,
        json={"description": "Salário", "amount": 1000, "type": "expense", "category": "Outros", "date": "2026-09-01"},
    )
    assert resp.status_code == 422


def test_editar_transacao_vinculada_aumentando_o_valor_e_permitido(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    create_income(client, user_a_headers, amount=1000, goal_contribution={"goal_id": goal_id, "amount": 400})
    tx_id = client.get("/api/transactions", headers=user_a_headers).json()[0]["id"]

    resp = client.put(
        f"/api/transactions/{tx_id}",
        headers=user_a_headers,
        json={"description": "Salário maior", "amount": 1500, "type": "income", "category": "Salário", "date": "2026-09-03"},
    )
    assert resp.status_code == 200

    # A contribuição em si não muda de valor sozinha — só a data
    # acompanha a edição da transação (mantém o histórico coerente).
    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["current"] == 400.0
    history = client.get(f"/api/goals/{goal_id}/contributions", headers=user_a_headers).json()
    assert history[0]["date"] == "2026-09-03"


def test_excluir_transacao_vinculada_remove_a_contribuicao_e_recalcula_a_meta(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    create_income(client, user_a_headers, amount=1000, goal_contribution={"goal_id": goal_id, "amount": 400})
    tx_id = client.get("/api/transactions", headers=user_a_headers).json()[0]["id"]

    resp = client.delete(f"/api/transactions/{tx_id}", headers=user_a_headers)
    assert resp.status_code == 200

    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["current"] == 0.0
    history = client.get(f"/api/goals/{goal_id}/contributions", headers=user_a_headers).json()
    assert history == []


def test_excluir_meta_remove_suas_contribuicoes(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 300})

    resp = client.delete(f"/api/goals/{goal_id}", headers=user_a_headers)
    assert resp.status_code == 200

    # A meta não existe mais, então consultar o histórico dela agora é 404.
    resp = client.get(f"/api/goals/{goal_id}/contributions", headers=user_a_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Isolamento entre usuários
# ---------------------------------------------------------------------------


def test_usuario_nao_ve_nem_apaga_contribuicao_de_meta_de_outro(client, user_a_headers, user_b_headers):
    goal_id = create_goal(client, user_a_headers)
    client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 300})
    contribution_id = client.get(f"/api/goals/{goal_id}/contributions", headers=user_a_headers).json()[0]["id"]

    resp = client.get(f"/api/goals/{goal_id}/contributions", headers=user_b_headers)
    assert resp.status_code == 404

    resp = client.delete(f"/api/goals/{goal_id}/contributions/{contribution_id}", headers=user_b_headers)
    assert resp.status_code == 404

    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["current"] == 300.0


def test_usuario_nao_deposita_ou_retira_de_meta_de_outro(client, user_a_headers, user_b_headers):
    goal_id = create_goal(client, user_a_headers)

    resp = client.post(f"/api/goals/{goal_id}/withdraw", headers=user_b_headers, json={"amount": 10})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Meta concluída
# ---------------------------------------------------------------------------


def test_completar_meta_manualmente_registra_a_diferenca_como_contribuicao(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers, target_amount=1000.0)
    client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 300})

    resp = client.post(f"/api/goals/{goal_id}/complete", headers=user_a_headers)
    assert resp.status_code == 200

    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["current"] == 1000.0
    assert goal["completed"] is True

    history = client.get(f"/api/goals/{goal_id}/contributions", headers=user_a_headers).json()
    assert any(c["source"] == "Meta marcada como concluída manualmente" for c in history)


def test_completar_meta_ja_com_saldo_suficiente_nao_cria_contribuicao_extra(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers, target_amount=500.0)
    client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 600})

    resp = client.post(f"/api/goals/{goal_id}/complete", headers=user_a_headers)
    assert resp.status_code == 200

    history = client.get(f"/api/goals/{goal_id}/contributions", headers=user_a_headers).json()
    assert len(history) == 1
    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["current"] == 600.0


def test_deposito_em_meta_ja_concluida_e_permitido(client, user_a_headers):
    # Comportamento já existia antes do cofrinho (depositar numa meta
    # concluída sempre foi aceito) — mantido igual, ver GUIA-COFRINHO.md.
    goal_id = create_goal(client, user_a_headers, target_amount=500.0)
    client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 500})

    resp = client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 100})
    assert resp.status_code == 200

    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["current"] == 600.0


# ---------------------------------------------------------------------------
# Planejador de metas (seções 7, 8 e 9)
# ---------------------------------------------------------------------------


def test_meta_sem_prazo_nao_calcula_valor_mensal_necessario(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers, deadline=None)
    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["monthly_target"] is None
    assert goal["deadline_passed"] is False


def test_meta_com_prazo_futuro_calcula_valor_mensal_necessario(client, user_a_headers):
    from datetime import date

    future = date.today().replace(day=1)
    future_year = future.year + (1 if future.month >= 7 else 0)
    future_month = (future.month + 6 - 1) % 12 + 1
    deadline = f"{future_year}-{future_month:02d}-01"

    goal_id = create_goal(client, user_a_headers, target_amount=1800.0, deadline=deadline)
    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["deadline_passed"] is False
    assert goal["monthly_target"] is not None
    assert goal["monthly_target"] > 0


def test_meta_com_prazo_vencido_mostra_estado_apropriado(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers, deadline="2020-01-01")
    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["deadline_passed"] is True
    assert goal["monthly_target"] is None


def test_sem_historico_suficiente_nao_estima_ritmo(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers)
    client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 100})

    goal = goal_status(client, user_a_headers, goal_id)
    # Uma única contribuição não é "ritmo" o bastante pra estimar.
    assert goal["has_enough_history"] is False
    assert goal["avg_monthly_contribution"] is None
    assert goal["estimated_months"] is None


def test_com_historico_suficiente_estima_ritmo_e_meses(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers, target_amount=1000.0)
    client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 100})
    client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 100})

    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["has_enough_history"] is True
    assert goal["avg_monthly_contribution"] is not None
    assert goal["avg_monthly_contribution"] > 0
    assert goal["estimated_months"] is not None
    assert goal["estimated_months"] >= 1


def test_meta_ja_atingida_nao_precisa_de_estimativa(client, user_a_headers):
    goal_id = create_goal(client, user_a_headers, target_amount=200.0)
    client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 100})
    client.post(f"/api/goals/{goal_id}/deposit", headers=user_a_headers, json={"amount": 150})

    goal = goal_status(client, user_a_headers, goal_id)
    assert goal["missing"] == 0.0
    assert goal["estimated_months"] is None
