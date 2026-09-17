from datetime import date


def _previous_month_date(day: int = 5) -> str:
    today = date.today()
    if today.month == 1:
        previous = date(today.year - 1, 12, day)
    else:
        previous = date(today.year, today.month - 1, day)
    return previous.isoformat()


def _current_month_date(day: int = 5) -> str:
    today = date.today()
    return today.replace(day=day).isoformat()


def _create_transaction(client, headers, **overrides):
    payload = {
        "description": "Transação de teste",
        "amount": 100.0,
        "type": "expense",
        "category": "Outros",
        "date": _current_month_date(),
    }
    payload.update(overrides)
    return client.post("/api/transactions", headers=headers, json=payload)


def test_insight_de_mudanca_de_comportamento_com_explicabilidade(client, auth_headers):
    # Categoria fora da base de demonstração, pra não haver
    # interferência dos dados de exemplo já existentes na conta.
    # Mês anterior: R$ 200 em Educação.
    resp1 = _create_transaction(
        client, auth_headers, description="Curso Online", category="Educação",
        amount=200, date=_previous_month_date(),
    )
    assert resp1.status_code == 200

    # Este mês: R$ 400 em Educação (aumento de 100%), com duas
    # descrições diferentes, para testar os "principais responsáveis".
    # Uma delas usa grafia diferente da categoria de propósito, pra
    # também confirmar que a normalização de categoria continua valendo
    # aqui.
    resp2 = _create_transaction(
        client, auth_headers, description="Curso Online", category="Educação",
        amount=250, date=_current_month_date(10),
    )
    resp3 = _create_transaction(
        client, auth_headers, description="Livros Técnicos", category="educação",
        amount=150, date=_current_month_date(15),
    )
    assert resp2.status_code == 200 and resp3.status_code == 200

    data = client.get("/api/insights", headers=auth_headers).json()
    behavior = next((i for i in data["insights"] if i["id"] == "category-behavior-change"), None)
    assert behavior is not None
    assert behavior["metric_value"] == "Educação"

    explanation = behavior["explanation"]
    assert explanation["current_value"] == 400.0
    assert explanation["previous_value"] == 200.0
    assert explanation["difference"] == 200.0
    assert explanation["percentage"] == 100.0
    contributor_labels = {c["label"] for c in explanation["top_contributors"]}
    assert contributor_labels == {"Curso Online", "Livros Técnicos"}


def test_resumo_mensal_reflete_transacoes_do_mes_atual(client, auth_headers):
    resp1 = _create_transaction(
        client, auth_headers, description="Salário", type="income",
        category="Receita", amount=3000, date=_current_month_date(1),
    )
    resp2 = _create_transaction(
        client, auth_headers, description="Aluguel", category="Moradia",
        amount=1200, date=_current_month_date(5),
    )
    assert resp1.status_code == 200 and resp2.status_code == 200

    data = client.get("/api/insights", headers=auth_headers).json()
    resumo = data["resumo_mensal"]
    assert resumo is not None
    assert resumo["incomes"] == 3000.0
    assert resumo["expenses"] == 1200.0
    assert resumo["balance"] == 1800.0
    assert any(c["category"] == "Moradia" for c in resumo["top_categories"])


def test_sem_transacoes_no_mes_anterior_nao_gera_insight_de_comportamento(client, auth_headers):
    # Categoria sem nenhuma presença no mês anterior (nem nos dados de
    # demonstração) — sem base de comparação, a seção 6 do prompt pede
    # para não gerar uma conclusão frágil/inventada.
    resp = _create_transaction(
        client, auth_headers, description="Compra única", category="Educação",
        amount=500, date=_current_month_date(),
    )
    assert resp.status_code == 200

    data = client.get("/api/insights", headers=auth_headers).json()
    behavior = next((i for i in data["insights"] if i["id"] == "category-behavior-change"), None)
    assert behavior is None
