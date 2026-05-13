import sqlite3
import sys
import io
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Literal

# UTF-8 no Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

app = FastAPI()

# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# DATABASE
# =========================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "finance.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        cursor = conn.cursor()

        # Transactions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                category TEXT NOT NULL,
                date TEXT NOT NULL
            )
        """)

        # Goals
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                target_amount REAL NOT NULL,
                current_amount REAL DEFAULT 0,
                deadline TEXT,
                completed INTEGER DEFAULT 0
            )
        """)

        conn.commit()


init_db()

# =========================
# MODELS
# =========================


class Transaction(BaseModel):
    description: str
    amount: float
    type: Literal["income", "expense"]
    category: str
    date: str


class Goal(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0
    deadline: Optional[str] = None


class Deposit(BaseModel):
    amount: float


# =========================
# ROOT
# =========================

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Finance AI Backend funcionando 🚀"
    }


# =========================
# RESET DATABASE
# =========================

@app.delete("/api/reset")
def reset_db():
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("DELETE FROM transactions")
            cursor.execute("DELETE FROM goals")

            cursor.execute("""
                DELETE FROM sqlite_sequence
                WHERE name IN ('transactions', 'goals')
            """)

            conn.commit()

        return {
            "status": "success",
            "message": "Banco resetado com sucesso"
        }

    except sqlite3.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro no banco: {str(e)}"
        )


# =========================
# TRANSACTIONS
# =========================

@app.post("/api/transactions")
def create_transaction(transaction: Transaction):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO transactions
                (description, amount, type, category, date)
                VALUES (?, ?, ?, ?, ?)
            """, (
                transaction.description,
                transaction.amount,
                transaction.type,
                transaction.category,
                transaction.date
            ))

            conn.commit()

        return {
            "status": "success",
            "message": "Transação criada"
        }

    except sqlite3.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar transação: {str(e)}"
        )


@app.get("/api/transactions")
def get_transactions():
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM transactions
            ORDER BY id DESC
        """)

        rows = cursor.fetchall()

    return [dict(row) for row in rows]


@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: int):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                DELETE FROM transactions
                WHERE id = ?
            """, (transaction_id,))

            conn.commit()

        return {
            "status": "success",
            "message": "Transação removida"
        }

    except sqlite3.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao remover transação: {str(e)}"
        )


# =========================
# DASHBOARD SUMMARY
# =========================

@app.get("/api/dashboard-summary")
def get_summary():
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT amount, type
            FROM transactions
        """)

        rows = cursor.fetchall()

    incomes = sum(
        r["amount"]
        for r in rows
        if r["type"] == "income"
    )

    expenses = sum(
        r["amount"]
        for r in rows
        if r["type"] == "expense"
    )

    return {
        "incomes": round(incomes, 2),
        "expenses": round(expenses, 2),
        "total": round(incomes - expenses, 2)
    }


# =========================
# GOALS
# =========================

@app.post("/api/goals")
def create_goal(goal: Goal):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO goals
                (name, target_amount, current_amount, deadline, completed)
                VALUES (?, ?, ?, ?, 0)
            """, (
                goal.name,
                goal.target_amount,
                goal.current_amount,
                goal.deadline
            ))

            conn.commit()

        return {
            "status": "success",
            "message": "Meta criada"
        }

    except sqlite3.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar meta: {str(e)}"
        )


@app.get("/api/goals/status")
def get_goals_status():
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM goals
            ORDER BY id DESC
        """)

        rows = cursor.fetchall()

    goals = []

    for r in rows:
        percent = (
            round(
                (r["current_amount"] / r["target_amount"]) * 100,
                2
            )
            if r["target_amount"] > 0 else 0
        )

        goals.append({
            "id": r["id"],
            "goal_name": r["name"],
            "target": r["target_amount"],
            "current": r["current_amount"],
            "missing": max(
                0,
                r["target_amount"] - r["current_amount"]
            ),
            "percent": percent,
            "deadline": r["deadline"],
            "completed": bool(r["completed"])
        })

    return goals


@app.post("/api/goals/{goal_id}/deposit")
def deposit_goal(goal_id: int, deposit: Deposit):
    if deposit.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Valor deve ser positivo"
        )

    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT current_amount, target_amount
                FROM goals
                WHERE id = ?
            """, (goal_id,))

            goal = cursor.fetchone()

            if not goal:
                raise HTTPException(
                    status_code=404,
                    detail="Meta não encontrada"
                )

            new_amount = goal["current_amount"] + deposit.amount

            completed = (
                1 if new_amount >= goal["target_amount"]
                else 0
            )

            cursor.execute("""
                UPDATE goals
                SET current_amount = ?, completed = ?
                WHERE id = ?
            """, (
                new_amount,
                completed,
                goal_id
            ))

            conn.commit()

        return {
            "status": "success",
            "new_amount": round(new_amount, 2),
            "completed": bool(completed)
        }

    except sqlite3.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao adicionar valor: {str(e)}"
        )


@app.post("/api/goals/{goal_id}/complete")
def complete_goal(goal_id: int):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                UPDATE goals
                SET completed = 1,
                    current_amount = target_amount
                WHERE id = ?
            """, (goal_id,))

            conn.commit()

        return {
            "status": "success",
            "message": "Meta concluída"
        }

    except sqlite3.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao concluir meta: {str(e)}"
        )


@app.delete("/api/goals/{goal_id}")
def delete_goal(goal_id: int):
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                DELETE FROM goals
                WHERE id = ?
            """, (goal_id,))

            conn.commit()

        return {
            "status": "success",
            "message": "Meta removida"
        }

    except sqlite3.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao remover meta: {str(e)}"
        )


# =========================
# INSIGHTS
# =========================

@app.get("/api/insights")
def get_insights():
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                strftime('%m', date) as month,
                SUM(amount) as total
            FROM transactions
            WHERE type = 'expense'
            GROUP BY month
            ORDER BY month DESC
            LIMIT 6
        """)

        rows = cursor.fetchall()

    months_map = {
        "01": "Jan",
        "02": "Fev",
        "03": "Mar",
        "04": "Abr",
        "05": "Mai",
        "06": "Jun",
        "07": "Jul",
        "08": "Ago",
        "09": "Set",
        "10": "Out",
        "11": "Nov",
        "12": "Dez"
    }

    historico = [
        {
            "mes": months_map.get(
                r["month"],
                r["month"]
            ),
            "valor": r["total"]
        }
        for r in reversed(rows)
    ]

    if not historico:
        historico = [{
            "mes": "Sem dados",
            "valor": 0
        }]

    valores = [h["valor"] for h in historico]

    media = (
        sum(valores) / len(valores)
        if valores else 0
    )

    variacao = 0

    if len(valores) >= 2 and valores[-2] != 0:
        variacao = (
            (valores[-1] - valores[-2])
            / valores[-2]
        ) * 100

    previsao = media * (1 + variacao / 100)

    economia_sugerida = media * 0.1

    alerta = (
        f"Seus gastos médios são de "
        f"R$ {media:.2f}. "
        f"Tendência de "
        f"{'alta' if variacao > 0 else 'queda'} "
        f"de {abs(variacao):.1f}%."
    )

    return {
        "alerta": alerta,
        "previsao_proximo_mes": round(previsao, 2),
        "economias_sugeridas": round(economia_sugerida, 2),
        "media_gastos": round(media, 2),
        "variacao_percentual": round(variacao, 1),
        "historico": historico
    }


# =========================
# CHART DATA
# =========================

@app.get("/api/chart-data")
def get_chart_data():
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                strftime('%m', date) as month,
                SUM(amount) as total,
                type
            FROM transactions
            GROUP BY month, type
        """)

        rows = cursor.fetchall()

    data = {}

    months_map = {
        "01": "Jan",
        "02": "Fev",
        "03": "Mar",
        "04": "Abr",
        "05": "Mai",
        "06": "Jun",
        "07": "Jul",
        "08": "Ago",
        "09": "Set",
        "10": "Out",
        "11": "Nov",
        "12": "Dez"
    }

    for r in rows:
        month = months_map.get(
            r["month"],
            r["month"]
        )

        if month not in data:
            data[month] = {
                "name": month,
                "income": 0,
                "expense": 0
            }

        if r["type"] == "income":
            data[month]["income"] = r["total"]
        else:
            data[month]["expense"] = r["total"]

    return list(data.values())
