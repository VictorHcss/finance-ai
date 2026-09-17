import logging
from typing import List

from fastapi import HTTPException

from app.core.categorization import suggest_category
from app.core.dedupe import compute_dedupe_hash, normalize_description
from app.core.import_parsing import FileValidationError, parse_statement, validate_file
from app.repositories.finance_repository import FinanceRepository
from app.repositories.import_repository import ImportRepository
from app.schemas.import_schema import ImportConfirmRow

# Logs técnicos apenas — nunca descrição, valor ou qualquer dado da
# movimentação em si (ver seção "Segurança e privacidade" da spec).
logger = logging.getLogger("finance_ai.import")


class ImportService:
    def __init__(self) -> None:
        self.import_repository = ImportRepository()
        self.finance_repository = FinanceRepository()

    # ------------------------------------------------------------------
    # Preview
    # ------------------------------------------------------------------

    def preview(self, user_id: int, filename: str, content: bytes) -> dict:
        try:
            fmt = validate_file(filename, content)
        except FileValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        try:
            parsed_rows, parse_issues = parse_statement(fmt, content)
        except Exception:
            logger.warning("Import preview failed during parsing (format=%s)", fmt)
            raise HTTPException(status_code=400, detail="Não foi possível interpretar o arquivo.") from None

        if not parsed_rows and not parse_issues:
            raise HTTPException(status_code=400, detail="O arquivo está vazio.")

        batch_id = self.import_repository.create_batch(user_id, filename, fmt)

        existing_external_ids = self.finance_repository.get_existing_external_ids(user_id)
        existing_hashes = self.finance_repository.get_existing_dedupe_hashes(user_id)

        seen_external_ids: set = set()
        seen_hashes: set = set()

        staged_rows: List[dict] = []

        for row in parsed_rows:
            normalized = normalize_description(row.description)
            row_hash = compute_dedupe_hash(row.date, normalized, row.amount, row.type)

            is_duplicate = False
            if row.external_id:
                is_duplicate = row.external_id in existing_external_ids or row.external_id in seen_external_ids
            else:
                is_duplicate = row_hash in existing_hashes or row_hash in seen_hashes

            category = suggest_category(row.description, normalized)

            staged_rows.append(
                {
                    "date": row.date,
                    "original_description": row.description,
                    "normalized_description": normalized,
                    "amount": row.amount,
                    "type": row.type,
                    "category": category,
                    "category_source": "rule" if category else "none",
                    "status": "duplicated" if is_duplicate else "new",
                    "external_id": row.external_id,
                    "dedupe_hash": row_hash,
                }
            )

            if row.external_id:
                seen_external_ids.add(row.external_id)
            seen_hashes.add(row_hash)

        for issue in parse_issues:
            staged_rows.append(
                {
                    "original_description": (issue.raw or "(linha não interpretada)")[:120],
                    "status": "error",
                    "error_reason": issue.reason,
                }
            )

        self.import_repository.insert_staged_rows(batch_id, user_id, staged_rows)

        saved_rows = self.import_repository.list_staged_rows(user_id, batch_id)

        new_count = sum(1 for r in saved_rows if r["status"] == "new")
        duplicated_count = sum(1 for r in saved_rows if r["status"] == "duplicated")
        error_count = sum(1 for r in saved_rows if r["status"] == "error")

        self.import_repository.update_batch_summary(
            batch_id,
            status="preview",
            total=len(saved_rows),
            new_count=new_count,
            duplicated_count=duplicated_count,
            error_count=error_count,
        )

        return {
            "batch_id": batch_id,
            "filename": filename,
            "source": fmt,
            "total": len(saved_rows),
            "new": new_count,
            "duplicated": duplicated_count,
            "errors": error_count,
            "rows": [
                {
                    "id": r["id"],
                    "date": r["date"],
                    "description": r["original_description"],
                    "amount": r["amount"],
                    "type": r["type"],
                    "category": r["category"],
                    "category_source": r["category_source"],
                    "status": r["status"],
                    "error_reason": r["error_reason"],
                }
                for r in saved_rows
            ],
        }

    # ------------------------------------------------------------------
    # Confirm
    # ------------------------------------------------------------------

    def confirm(self, user_id: int, batch_id: int, rows: List[ImportConfirmRow]) -> dict:
        batch = self.import_repository.get_batch(user_id, batch_id)
        if not batch:
            raise HTTPException(status_code=404, detail="Importação não encontrada")

        if batch["status"] == "completed":
            raise HTTPException(status_code=409, detail="Esta importação já foi confirmada")

        if not rows:
            raise HTTPException(status_code=400, detail="Nenhuma movimentação selecionada para importar")

        staged_ids = [row.staged_id for row in rows]
        staged_by_id = {
            r["id"]: r
            for r in self.import_repository.get_staged_rows_by_ids(user_id, batch_id, staged_ids)
        }

        overrides_by_id = {row.staged_id: row for row in rows}

        to_persist = []
        skipped = 0
        for staged_id, staged_row in staged_by_id.items():
            if staged_row["status"] not in ("new", "duplicated"):
                skipped += 1
                continue

            override = overrides_by_id[staged_id]
            to_persist.append(
                {
                    "date": staged_row["date"],
                    "description": override.description,
                    "original_description": staged_row["original_description"],
                    "amount": staged_row["amount"],
                    "type": staged_row["type"],
                    "category": override.category,
                    "external_id": staged_row["external_id"],
                    "dedupe_hash": staged_row["dedupe_hash"],
                }
            )

        skipped += len(staged_ids) - len(staged_by_id)  # ids que não pertenciam a este batch/usuário

        if not to_persist:
            raise HTTPException(
                status_code=400,
                detail="Nenhuma das movimentações selecionadas pode ser importada",
            )

        imported_count = self.finance_repository.bulk_create_imported_transactions(
            user_id, to_persist, batch_id
        )
        self.import_repository.mark_rows_imported(list(staged_by_id.keys()))
        self.import_repository.mark_batch_confirmed(batch_id, imported_count)

        logger.info("Import batch %s confirmed: %s imported, %s skipped", batch_id, imported_count, skipped)

        return {
            "status": "success",
            "batch_id": batch_id,
            "imported": imported_count,
            "skipped": skipped,
        }

    # ------------------------------------------------------------------
    # Histórico
    # ------------------------------------------------------------------

    def list_batches(self, user_id: int) -> List[dict]:
        return self.import_repository.list_batches(user_id)
