import io


def upload(client, headers, filename, content: bytes, content_type="text/csv"):
    return client.post(
        "/api/transactions/import/preview",
        headers=headers,
        files={"file": (filename, io.BytesIO(content), content_type)},
    )


def confirm_all_new(client, headers, preview_json):
    rows = [
        {"staged_id": row["id"], "category": row["category"] or "Outros", "description": row["description"]}
        for row in preview_json["rows"]
        if row["status"] == "new"
    ]
    return client.post(
        "/api/transactions/import/confirm",
        headers=headers,
        json={"batch_id": preview_json["batch_id"], "rows": rows},
    )


# ---------------------------------------------------------------------------
# CSV — variações de formato
# ---------------------------------------------------------------------------


def test_csv_com_ponto_e_virgula_e_virgula_decimal(client, auth_headers):
    content = (
        "Data;Descrição;Valor\n"
        "05/08/2026;Salário Empresa XYZ;3000,00\n"
        "06/08/2026;Supermercado Pão de Açúcar;-540,75\n"
    ).encode("utf-8")

    resp = upload(client, auth_headers, "extrato.csv", content)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total"] == 2
    assert data["new"] == 2
    assert data["errors"] == 0

    salario = data["rows"][0]
    assert salario["type"] == "income"
    assert salario["amount"] == 3000.00
    assert salario["date"] == "2026-08-05"

    mercado = data["rows"][1]
    assert mercado["type"] == "expense"
    assert mercado["amount"] == 540.75
    # acentuação preservada na descrição original
    assert "Pão de Açúcar" in mercado["description"]


def test_csv_com_virgula_e_ponto_decimal(client, auth_headers):
    content = (
        "Date,Description,Amount\n"
        "2026-08-10,Freelance Payment,1200.50\n"
        "2026-08-11,Gym Membership,-99.90\n"
    ).encode("utf-8")

    resp = upload(client, auth_headers, "extrato.csv", content)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["new"] == 2
    assert data["rows"][0]["amount"] == 1200.50
    assert data["rows"][1]["amount"] == 99.90
    assert data["rows"][1]["type"] == "expense"


def test_csv_colunas_debito_credito_separadas(client, auth_headers):
    content = (
        "Data;Histórico;Débito;Crédito\n"
        "01/08/2026;Depósito;;500,00\n"
        "02/08/2026;Compra Mercado;120,00;\n"
    ).encode("utf-8")

    resp = upload(client, auth_headers, "extrato.csv", content)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["new"] == 2
    assert data["rows"][0]["type"] == "income"
    assert data["rows"][0]["amount"] == 500.00
    assert data["rows"][1]["type"] == "expense"
    assert data["rows"][1]["amount"] == 120.00


def test_csv_categorizacao_automatica_por_regras(client, auth_headers):
    content = (
        "Data;Descrição;Valor\n"
        "01/08/2026;IFOOD*RESTAURANTE;-45,00\n"
        "02/08/2026;NETFLIX.COM;-39,90\n"
        "03/08/2026;UBER *VIAGEM;-22,00\n"
        "04/08/2026;POSTO COMBUSTIVEL BR;-200,00\n"
        "05/08/2026;FARMACIA SAO PAULO;-30,00\n"
    ).encode("utf-8")

    resp = upload(client, auth_headers, "extrato.csv", content)
    data = resp.json()
    categories = [row["category"] for row in data["rows"]]
    assert categories == ["Alimentação", "Assinaturas", "Transporte", "Combustível", "Saúde"]


def test_csv_linhas_invalidas_nao_derrubam_arquivo_inteiro(client, auth_headers):
    content = (
        "Data;Descrição;Valor\n"
        "01/08/2026;Transação válida;-50,00\n"
        "data-quebrada;Transação com data ruim;-10,00\n"
        "03/08/2026;Transação com valor ruim;abc\n"
    ).encode("utf-8")

    resp = upload(client, auth_headers, "extrato.csv", content)
    data = resp.json()
    assert data["total"] == 3
    assert data["new"] == 1
    assert data["errors"] == 2
    error_rows = [row for row in data["rows"] if row["status"] == "error"]
    assert {row["error_reason"] for row in error_rows} == {"Data inválida", "Valor não identificado"}


def test_csv_sem_cabecalho_reconhecivel_retorna_erro_amigavel(client, auth_headers):
    content = "coluna_a;coluna_b;coluna_c\n1;2;3\n".encode("utf-8")
    resp = upload(client, auth_headers, "extrato.csv", content)
    assert resp.status_code == 200
    data = resp.json()
    assert data["new"] == 0
    assert data["errors"] == 1


# ---------------------------------------------------------------------------
# Validação de arquivo
# ---------------------------------------------------------------------------


def test_arquivo_vazio_e_rejeitado(client, auth_headers):
    resp = upload(client, auth_headers, "vazio.csv", b"")
    assert resp.status_code == 400
    assert "vazio" in resp.json()["detail"].lower()


def test_extensao_nao_suportada_e_rejeitada(client, auth_headers):
    resp = upload(client, auth_headers, "extrato.pdf", b"conteudo qualquer", content_type="application/pdf")
    assert resp.status_code == 400
    assert "não suportado" in resp.json()["detail"].lower()


def test_arquivo_acima_do_limite_e_rejeitado(client, auth_headers):
    big_content = (b"Data;Descricao;Valor\n" + b"01/01/2026;x;1,00\n" * 400000)
    resp = upload(client, auth_headers, "grande.csv", big_content)
    assert resp.status_code == 400
    assert "tamanho" in resp.json()["detail"].lower()


def test_sem_autenticacao_e_rejeitado(client):
    resp = client.post(
        "/api/transactions/import/preview",
        files={"file": ("extrato.csv", io.BytesIO(b"a;b;c\n1;2;3"), "text/csv")},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# OFX
# ---------------------------------------------------------------------------

OFX_SAMPLE = """OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260810120000
<TRNAMT>1200.00
<FITID>OFX-001
<NAME>FREELANCE PROJETO WEB
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260811
<TRNAMT>-99.90
<FITID>OFX-002
<NAME>ACADEMIA SMART FIT
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260812
<TRNAMT>-15.00
<NAME>SEM FITID
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
"""


def test_ofx_valido_com_e_sem_fitid(client, auth_headers):
    resp = upload(client, auth_headers, "extrato.ofx", OFX_SAMPLE.encode("utf-8"), content_type="application/octet-stream")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["source"] == "ofx"
    assert data["total"] == 3
    assert data["new"] == 3
    assert data["rows"][0]["amount"] == 1200.00
    assert data["rows"][0]["type"] == "income"
    assert data["rows"][2]["description"] == "SEM FITID"


def test_ofx_invalido_sem_stmttrn(client, auth_headers):
    resp = upload(client, auth_headers, "extrato.ofx", b"OFXHEADER:100\n<OFX></OFX>", content_type="application/octet-stream")
    assert resp.status_code == 200
    data = resp.json()
    assert data["new"] == 0
    assert data["errors"] == 1


# ---------------------------------------------------------------------------
# Deduplicação
# ---------------------------------------------------------------------------


def test_duplicado_por_external_id(client, auth_headers):
    resp1 = upload(client, auth_headers, "extrato.ofx", OFX_SAMPLE.encode("utf-8"), content_type="application/octet-stream")
    confirm_all_new(client, auth_headers, resp1.json())

    resp2 = upload(client, auth_headers, "extrato.ofx", OFX_SAMPLE.encode("utf-8"), content_type="application/octet-stream")
    data2 = resp2.json()
    # As duas linhas com FITID devem ser reconhecidas via external_id;
    # a terceira (sem FITID) via hash — todas como duplicadas.
    assert data2["new"] == 0
    assert data2["duplicated"] == 3


def test_duplicado_por_hash_sem_external_id(client, auth_headers):
    content = "Data;Descrição;Valor\n01/08/2026;Compra Padaria;-25,00\n".encode("utf-8")
    resp1 = upload(client, auth_headers, "extrato.csv", content)
    confirm_all_new(client, auth_headers, resp1.json())

    resp2 = upload(client, auth_headers, "extrato.csv", content)
    data2 = resp2.json()
    assert data2["new"] == 0
    assert data2["duplicated"] == 1


def test_duplicado_contra_transacao_manual_existente(client, auth_headers):
    # Lança manualmente uma transação idêntica à que será importada
    manual = client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "description": "Compra Padaria",
            "amount": 25.00,
            "type": "expense",
            "category": "Alimentação",
            "date": "2026-08-01",
        },
    )
    assert manual.status_code == 200, manual.text

    content = "Data;Descrição;Valor\n01/08/2026;Compra Padaria;-25,00\n".encode("utf-8")
    resp = upload(client, auth_headers, "extrato.csv", content)
    data = resp.json()
    assert data["new"] == 0
    assert data["duplicated"] == 1


def test_duas_transacoes_legitimas_iguais_nao_se_perdem(client, auth_headers):
    # Duas viagens de Uber no mesmo dia, mesmo valor: a segunda é
    # marcada como "duplicated" para revisão, mas nenhuma é
    # descartada silenciosamente — o usuário pode confirmar as duas.
    content = (
        "Data;Descrição;Valor\n"
        "10/08/2026;UBER *TRIP;-20,00\n"
        "10/08/2026;UBER *TRIP;-20,00\n"
    ).encode("utf-8")
    resp = upload(client, auth_headers, "extrato.csv", content)
    data = resp.json()
    assert data["total"] == 2
    assert data["new"] == 1
    assert data["duplicated"] == 1

    rows = [
        {"staged_id": row["id"], "category": "Transporte", "description": row["description"]}
        for row in data["rows"]
    ]
    confirm = client.post(
        "/api/transactions/import/confirm",
        headers=auth_headers,
        json={"batch_id": data["batch_id"], "rows": rows},
    )
    assert confirm.status_code == 200, confirm.text
    assert confirm.json()["imported"] == 2


def test_reimportacao_e_idempotente(client, auth_headers):
    content = (
        "Data;Descrição;Valor\n"
        "01/08/2026;Aluguel;-1800,00\n"
        "02/08/2026;Salário;3000,00\n"
    ).encode("utf-8")

    first = upload(client, auth_headers, "extrato.csv", content)
    confirm_all_new(client, auth_headers, first.json())

    second = upload(client, auth_headers, "extrato.csv", content)
    data2 = second.json()
    assert data2["new"] == 0
    assert data2["duplicated"] == 2

    all_transactions = client.get("/api/transactions", headers=auth_headers).json()
    imported = [t for t in all_transactions if t.get("source") == "import"]
    assert len(imported) == 2  # não duplicou mesmo com duas importações do mesmo arquivo


# ---------------------------------------------------------------------------
# Confirmação / prévia em duas etapas
# ---------------------------------------------------------------------------


def test_nada_e_persistido_antes_da_confirmacao(client, auth_headers):
    content = "Data;Descrição;Valor\n01/08/2026;Compra Teste;-10,00\n".encode("utf-8")
    upload(client, auth_headers, "extrato.csv", content)

    all_transactions = client.get("/api/transactions", headers=auth_headers).json()
    assert all(t.get("source") != "import" for t in all_transactions)


def test_confirmacao_respeita_edicao_de_categoria_e_descricao(client, auth_headers):
    content = "Data;Descrição;Valor\n01/08/2026;IFOOD*999;-45,00\n".encode("utf-8")
    preview = upload(client, auth_headers, "extrato.csv", content).json()
    staged_id = preview["rows"][0]["id"]

    confirm = client.post(
        "/api/transactions/import/confirm",
        headers=auth_headers,
        json={
            "batch_id": preview["batch_id"],
            "rows": [{"staged_id": staged_id, "category": "Delivery", "description": "iFood - Jantar"}],
        },
    )
    assert confirm.status_code == 200, confirm.text

    transactions = client.get("/api/transactions", headers=auth_headers).json()
    imported = next(t for t in transactions if t.get("source") == "import")
    assert imported["category"] == "Delivery"
    assert imported["description"] == "iFood - Jantar"


def test_linhas_com_erro_nao_podem_ser_confirmadas(client, auth_headers):
    content = "Data;Descrição;Valor\n01/08/2026;Transação com valor ruim;abc\n".encode("utf-8")
    preview = upload(client, auth_headers, "extrato.csv", content).json()
    error_row = preview["rows"][0]
    assert error_row["status"] == "error"

    confirm = client.post(
        "/api/transactions/import/confirm",
        headers=auth_headers,
        json={
            "batch_id": preview["batch_id"],
            "rows": [{"staged_id": error_row["id"], "category": "Outros", "description": "Forçando erro"}],
        },
    )
    assert confirm.status_code == 400


def test_batch_ja_confirmado_nao_pode_ser_confirmado_novamente(client, auth_headers):
    content = "Data;Descrição;Valor\n01/08/2026;Compra Teste;-10,00\n".encode("utf-8")
    preview = upload(client, auth_headers, "extrato.csv", content).json()
    confirm_all_new(client, auth_headers, preview)

    second_attempt = confirm_all_new(client, auth_headers, preview)
    assert second_attempt.status_code == 409


def test_historico_de_importacoes(client, auth_headers):
    content = "Data;Descrição;Valor\n01/08/2026;Compra Teste;-10,00\n".encode("utf-8")
    preview = upload(client, auth_headers, "extrato.csv", content).json()
    confirm_all_new(client, auth_headers, preview)

    batches = client.get("/api/transactions/import/batches", headers=auth_headers).json()
    assert len(batches) == 1
    assert batches[0]["status"] == "completed"
    assert batches[0]["imported_count"] == 1


# ---------------------------------------------------------------------------
# Segurança / isolamento entre usuários
# ---------------------------------------------------------------------------


def test_usuario_nao_acessa_importacao_de_outro(client, auth_headers, second_user_headers):
    content = "Data;Descrição;Valor\n01/08/2026;Compra Teste;-10,00\n".encode("utf-8")
    preview = upload(client, auth_headers, "extrato.csv", content).json()

    resp = client.post(
        "/api/transactions/import/confirm",
        headers=second_user_headers,
        json={
            "batch_id": preview["batch_id"],
            "rows": [{"staged_id": preview["rows"][0]["id"], "category": "X", "description": "X"}],
        },
    )
    assert resp.status_code == 404


def test_usuario_nao_ve_historico_de_outro(client, auth_headers, second_user_headers):
    content = "Data;Descrição;Valor\n01/08/2026;Compra Teste;-10,00\n".encode("utf-8")
    preview = upload(client, auth_headers, "extrato.csv", content).json()
    confirm_all_new(client, auth_headers, preview)

    batches_b = client.get("/api/transactions/import/batches", headers=second_user_headers).json()
    assert batches_b == []
