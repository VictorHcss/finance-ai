from app.core.categorization import format_category_label, normalize_category_key


# ---------------------------------------------------------------------------
# Unidade: normalização de categoria (sem tocar no banco)
# ---------------------------------------------------------------------------


def test_normalize_category_key_ignora_maiusculas_acentos_e_espacos():
    assert (
        normalize_category_key("Alimentação")
        == normalize_category_key("alimentação")
        == normalize_category_key("ALIMENTAÇÃO")
        == normalize_category_key("  alimentacao  ")
    )


def test_format_category_label_aplica_capitalizacao_por_palavra():
    assert format_category_label("alimentação") == "Alimentação"
    assert format_category_label("ALIMENTAÇÃO") == "Alimentação"
    assert format_category_label("  contas   de  casa ") == "Contas De Casa"


def test_normalize_category_key_vazio_tem_fallback():
    assert normalize_category_key("") == "sem categoria"
    assert normalize_category_key("   ") == "sem categoria"


# ---------------------------------------------------------------------------
# Integração: categorias com grafias diferentes somam juntas no insight
# de "categoria dominante", tanto para dados novos quanto para dados
# antigos (inseridos direto no banco, sem passar pelo schema).
# ---------------------------------------------------------------------------


def _create_transaction(client, headers, **overrides):
    payload = {
        "description": "Transação de teste",
        "amount": 100.0,
        "type": "expense",
        "category": "Outros",
        "date": "2026-08-01",
    }
    payload.update(overrides)
    return client.post("/api/transactions", headers=headers, json=payload)


def test_categorias_com_grafias_diferentes_sao_somadas_no_insight(client, auth_headers):
    from datetime import date

    today = date.today().isoformat()

    # Mesma categoria, três grafias diferentes -- deve ser tratada como
    # uma só categoria ao calcular qual concentrou mais gasto no mês.
    resp1 = _create_transaction(client, auth_headers, category="alimentação", amount=50, date=today)
    resp2 = _create_transaction(client, auth_headers, category="ALIMENTAÇÃO", amount=50, date=today)
    resp3 = _create_transaction(client, auth_headers, category="Alimentação", amount=50, date=today)
    assert resp1.status_code == 200 and resp2.status_code == 200 and resp3.status_code == 200

    # Uma categoria concorrente, sozinha, com valor menor -- não deveria
    # vencer mesmo que as três transações acima não fossem agrupadas.
    resp4 = _create_transaction(client, auth_headers, category="Transporte", amount=80, date=today)
    assert resp4.status_code == 200

    insights = client.get("/api/insights", headers=auth_headers).json()
    top_category_insight = next(i for i in insights["insights"] if i["id"] == "top-category")

    assert top_category_insight["metric_value"] == "Alimentação"
    assert "150.00" in top_category_insight["message"]


def test_categoria_salva_com_capitalizacao_amigavel(client, auth_headers):
    resp = _create_transaction(
        client, auth_headers, description="Categoria com espaco extra", category="  ALIMENTAÇÃO  "
    )
    assert resp.status_code == 200

    transactions = client.get("/api/transactions", headers=auth_headers).json()
    created = next(t for t in transactions if t["description"] == "Categoria com espaco extra")
    assert created["category"] == "Alimentação"
