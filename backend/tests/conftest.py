import os
import sys

import pytest

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """Sobe a app FastAPI apontando para um banco SQLite novo e vazio
    a cada teste, para os testes não interferirem entre si nem com o
    finance.db usado em desenvolvimento."""
    db_path = str(tmp_path / "finance_test.db")
    monkeypatch.setattr("app.core.database.DB_PATH", db_path)

    from app.core.database import init_db

    init_db()

    from fastapi.testclient import TestClient

    from app.main import app

    return TestClient(app)


def _auth_headers(client, email="demo@finance.ai", password="demo123456"):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    token = response.json()["session_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def auth_headers(client):
    return _auth_headers(client)


@pytest.fixture()
def second_user_headers(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Outro Usuario", "email": "outro@teste.com", "password": "senha12345"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["session_token"]
    return {"Authorization": f"Bearer {token}"}


def _register_headers(client, name: str, email: str) -> dict:
    response = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": "senha12345"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["session_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def user_a_headers(client):
    """Usuário recém-registrado, sem os dados de exemplo da conta
    demo — para testes de cálculo/isolamento que precisam de um
    histórico de transações conhecido e previsível."""
    return _register_headers(client, "Usuária A", "usuaria.a@teste.com")


@pytest.fixture()
def user_b_headers(client):
    return _register_headers(client, "Usuário B", "usuario.b@teste.com")
