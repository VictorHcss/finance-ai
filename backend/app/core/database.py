import sqlite3
from datetime import datetime, timezone
from typing import Iterable

from app.core.config import DB_PATH
from app.core.dedupe import compute_dedupe_hash, normalize_description
from app.core.security import hash_password


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _table_columns(cursor: sqlite3.Cursor, table_name: str) -> set[str]:
    rows = cursor.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row["name"] for row in rows}


def _ensure_columns(
    cursor: sqlite3.Cursor,
    table_name: str,
    columns_sql: Iterable[str],
) -> None:
    existing_columns = _table_columns(cursor, table_name)
    for column_sql in columns_sql:
        column_name = column_sql.split()[0]
        if column_name not in existing_columns:
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_sql}")


def init_db() -> None:
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                avatar TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_login TEXT,
                role TEXT NOT NULL DEFAULT 'user'
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT NOT NULL UNIQUE,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                currency TEXT NOT NULL DEFAULT 'BRL',
                locale TEXT NOT NULL DEFAULT 'pt-BR',
                theme TEXT NOT NULL DEFAULT 'dark',
                notifications_enabled INTEGER NOT NULL DEFAULT 1,
                ai_enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                insight_type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT 'info',
                metadata TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 1,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 1,
                name TEXT NOT NULL,
                target_amount REAL NOT NULL,
                current_amount REAL DEFAULT 0,
                deadline TEXT,
                completed INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                priority TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                action_url TEXT,
                metadata TEXT,
                read_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                entity TEXT,
                entity_id TEXT,
                payload TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        _ensure_columns(
            cursor,
            "transactions",
            [
                "user_id INTEGER NOT NULL DEFAULT 1",
                "created_at TEXT",
                "updated_at TEXT",
            ],
        )
        _ensure_columns(
            cursor,
            "goals",
            [
                "user_id INTEGER NOT NULL DEFAULT 1",
                "created_at TEXT",
                "updated_at TEXT",
            ],
        )
        _ensure_columns(
            cursor,
            "users",
            [
                "role TEXT NOT NULL DEFAULT 'user'",
            ],
        )
        _ensure_columns(
            cursor,
            "notifications",
            [
                "user_id INTEGER NOT NULL",
                "category TEXT NOT NULL",
                "priority TEXT NOT NULL",
                "title TEXT NOT NULL",
                "description TEXT",
                "action_url TEXT",
                "metadata TEXT",
                "read_at TEXT",
                "created_at TEXT",
                "updated_at TEXT",
                "deleted_at TEXT",
            ],
        )
        _ensure_columns(
            cursor,
            "audit_logs",
            [
                "user_id INTEGER NOT NULL",
                "action TEXT NOT NULL",
                "entity TEXT",
                "entity_id TEXT",
                "payload TEXT",
                "created_at TEXT",
            ],
        )

        # Suporte à importação de extrato (CSV/OFX): toda transação
        # passa a ter uma origem (manual | import | futuramente
        # open_finance). `external_id` guarda o identificador dado
        # pelo banco (ex.: FITID do OFX) e `dedupe_hash` é o fallback
        # quando não há esse identificador — calculado a partir de
        # data + descrição normalizada + valor + tipo, ver
        # app/core/dedupe.py. Nenhuma dessas colunas é exclusiva de
        # CSV/OFX: o objetivo é que Open Finance, no futuro, use os
        # mesmos campos.
        _ensure_columns(
            cursor,
            "transactions",
            [
                "source TEXT NOT NULL DEFAULT 'manual'",
                "external_id TEXT",
                "dedupe_hash TEXT",
                "import_batch_id INTEGER REFERENCES import_batches(id)",
                "original_description TEXT",
            ],
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS import_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                source TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'processing',
                total INTEGER NOT NULL DEFAULT 0,
                new_count INTEGER NOT NULL DEFAULT 0,
                duplicated_count INTEGER NOT NULL DEFAULT 0,
                error_count INTEGER NOT NULL DEFAULT 0,
                imported_count INTEGER NOT NULL DEFAULT 0,
                error_message TEXT,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        # Linhas "em prévia" de uma importação: nada aqui vira uma
        # transação de verdade até a confirmação do usuário (ver
        # docs da funcionalidade — "não salvar imediatamente após o
        # upload").
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS import_staged_rows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                date TEXT,
                original_description TEXT NOT NULL,
                normalized_description TEXT,
                amount REAL,
                type TEXT,
                category TEXT,
                category_source TEXT NOT NULL DEFAULT 'none',
                status TEXT NOT NULL,
                error_reason TEXT,
                external_id TEXT,
                dedupe_hash TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_import_batches_user_created_at
            ON import_batches(user_id, created_at)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_staged_rows_batch
            ON import_staged_rows(batch_id, user_id)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_transactions_user_external_id
            ON transactions(user_id, external_id)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_transactions_user_dedupe_hash
            ON transactions(user_id, dedupe_hash)
            """
        )

        cursor.execute(
            """
            UPDATE transactions
            SET created_at = COALESCE(created_at, date),
                updated_at = COALESCE(updated_at, date),
                user_id = COALESCE(user_id, 1)
            """
        )
        cursor.execute(
            """
            UPDATE goals
            SET created_at = COALESCE(created_at, ?),
                updated_at = COALESCE(updated_at, ?),
                user_id = COALESCE(user_id, 1)
            """,
            (now, now),
        )

        # Backfill do dedupe_hash para transações que existiam antes
        # desta coluna (inclusive as lançadas manualmente) — sem isso,
        # uma importação futura não conseguiria detectar que uma
        # movimentação já existe se ela tiver sido criada à mão.
        rows_without_hash = cursor.execute(
            "SELECT id, date, description, amount, type FROM transactions WHERE dedupe_hash IS NULL"
        ).fetchall()
        for row in rows_without_hash:
            normalized = normalize_description(row["description"])
            row_hash = compute_dedupe_hash(row["date"], normalized, row["amount"], row["type"])
            cursor.execute(
                "UPDATE transactions SET dedupe_hash = ? WHERE id = ?",
                (row_hash, row["id"]),
            )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_transactions_user_date
            ON transactions(user_id, date)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_transactions_user_type
            ON transactions(user_id, type)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_goals_user_completed
            ON goals(user_id, completed)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_sessions_user_token
            ON sessions(user_id, token)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
            ON notifications(user_id, created_at)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at
            ON notifications(user_id, read_at)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_notifications_user_category_created_at
            ON notifications(user_id, category, created_at)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_notifications_user_priority_created_at
            ON notifications(user_id, priority, created_at)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created_at
            ON audit_logs(user_id, created_at)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
            ON audit_logs(action, created_at)
            """
        )

        cursor.execute(
            """
            INSERT OR IGNORE INTO users (
                id, name, email, password_hash, avatar, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                1,
                "Demo User",
                "demo@finance.ai",
                hash_password("demo123456"),
                None,
                now,
                now,
            ),
        )

        cursor.execute(
            """
            INSERT OR IGNORE INTO settings (
                user_id, currency, locale, theme,
                notifications_enabled, ai_enabled, created_at, updated_at
            )
            VALUES (?, 'BRL', 'pt-BR', 'dark', 1, 1, ?, ?)
            """,
            (1, now, now),
        )

        # Povoa a conta demo com dados de exemplo, só na primeira vez
        # (se ela já tiver transações, não duplica a cada reinício do
        # servidor). Sem isso, "demo@finance.ai" logava num dashboard
        # completamente vazio — o que não mostra nada de útil para
        # quem está conhecendo o produto.
        has_demo_data = cursor.execute(
            "SELECT COUNT(*) FROM transactions WHERE user_id = 1"
        ).fetchone()[0]

        if not has_demo_data:
            demo_transactions = [
                # Mês anterior — existe só para permitir o cálculo real
                # de tendência (comparação mês atual vs mês anterior).
                ("Salário", 6200.00, "income", "Salário", "2026-07-01"),
                ("Aluguel", 1800.00, "expense", "Moradia", "2026-07-02"),
                ("Supermercado", 540.00, "expense", "Alimentação", "2026-07-06"),
                ("Internet", 119.90, "expense", "Moradia", "2026-07-18"),
                # Mês atual
                ("Salário", 6500.00, "income", "Salário", "2026-08-01"),
                ("Aluguel", 1800.00, "expense", "Moradia", "2026-08-02"),
                ("Supermercado", 620.50, "expense", "Alimentação", "2026-08-04"),
                ("Assinatura Streaming", 39.90, "expense", "Lazer", "2026-08-05"),
                ("Freelance — Projeto Web", 1200.00, "income", "Renda Extra", "2026-08-08"),
                ("Combustível", 280.00, "expense", "Transporte", "2026-08-10"),
                ("Academia", 99.90, "expense", "Saúde", "2026-08-10"),
                ("Restaurante", 145.00, "expense", "Alimentação", "2026-08-14"),
                ("Farmácia", 87.30, "expense", "Saúde", "2026-08-16"),
                ("Internet", 119.90, "expense", "Moradia", "2026-08-18"),
            ]
            for description, amount, tx_type, category, date in demo_transactions:
                cursor.execute(
                    """
                    INSERT INTO transactions (
                        user_id, description, amount, type, category, date, created_at, updated_at
                    )
                    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (description, amount, tx_type, category, date, now, now),
                )

            demo_goals = [
                ("Reserva de Emergência", 15000.00, 6400.00, "2027-01-31"),
                ("Viagem para o Nordeste", 4000.00, 1250.00, "2026-12-15"),
            ]
            for name, target, current, deadline in demo_goals:
                cursor.execute(
                    """
                    INSERT INTO goals (
                        user_id, name, target_amount, current_amount, deadline,
                        completed, created_at, updated_at
                    )
                    VALUES (1, ?, ?, ?, ?, 0, ?, ?)
                    """,
                    (name, target, current, deadline, now, now),
                )

            demo_notifications = [
                (
                    "financeiro", "high",
                    "Gasto acima da média em Alimentação",
                    "Você já gastou R$ 765,50 em Alimentação este mês, 18% a mais que sua média dos últimos 3 meses.",
                ),
                (
                    "ia", "normal",
                    "Novo insight disponível",
                    "Analisamos seus hábitos recentes e geramos uma nova projeção de gastos para o próximo mês.",
                ),
                (
                    "lembretes", "low",
                    "Meta 'Viagem para o Nordeste' em andamento",
                    "Você já guardou 31% do valor necessário. Continue assim!",
                ),
            ]
            for category, priority, title, description in demo_notifications:
                cursor.execute(
                    """
                    INSERT INTO notifications (
                        user_id, category, priority, title, description, created_at, updated_at
                    )
                    VALUES (1, ?, ?, ?, ?, ?, ?)
                    """,
                    (category, priority, title, description, now, now),
                )

        conn.commit()
