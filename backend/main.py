import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def init_db():
    conn = sqlite3.connect("finance.db")
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()


init_db()


class Transaction(BaseModel):
    description: str
    amount: float
    type: str
    category: str
    date: str


@app.post("/api/transactions")
def create_transaction(transaction: Transaction):
    conn = sqlite3.connect("finance.db")
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO transactions (description, amount, type, category, date)
        VALUES (?, ?, ?, ?, ?)
    ''', (transaction.description, transaction.amount, transaction.type, transaction.category, transaction.date))
    conn.commit()
    conn.close()
    return {"status": "success"}


@app.get("/api/transactions")
def get_transactions():
    conn = sqlite3.connect("finance.db")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT description, amount, type, category, date FROM transactions ORDER BY date DESC")
    rows = cursor.fetchall()
    conn.close()

    return [
        {"description": r[0], "amount": r[1],
            "type": r[2], "category": r[3], "date": r[4]}
        for r in rows
    ]
