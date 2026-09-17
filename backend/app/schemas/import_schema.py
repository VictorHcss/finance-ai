from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.core.security import sanitize_text


class ImportPreviewRow(BaseModel):
    id: int
    # date/amount/type vêm vazios quando status == "error" (a linha
    # não pôde ser interpretada o suficiente para virar uma
    # transação candidata).
    date: Optional[str] = None
    description: str
    amount: Optional[float] = None
    type: Optional[Literal["income", "expense"]] = None
    category: Optional[str] = None
    category_source: Literal["rule", "none"] = "none"
    status: Literal["new", "duplicated", "error"]
    error_reason: Optional[str] = None


class ImportPreviewResponse(BaseModel):
    batch_id: int
    filename: str
    source: Literal["csv", "ofx"]
    total: int
    new: int
    duplicated: int
    errors: int
    rows: List[ImportPreviewRow]


class ImportConfirmRow(BaseModel):
    staged_id: int
    category: str = Field(min_length=1, max_length=60)
    description: str = Field(min_length=1, max_length=120)

    @field_validator("category", "description")
    @classmethod
    def sanitize_fields(cls, value: str) -> str:
        return sanitize_text(value)


class ImportConfirmRequest(BaseModel):
    batch_id: int
    rows: List[ImportConfirmRow] = Field(default_factory=list)


class ImportConfirmResponse(BaseModel):
    status: str
    batch_id: int
    imported: int
    skipped: int


class ImportBatchSummary(BaseModel):
    id: int
    filename: str
    source: str
    status: str
    total: int
    new_count: int
    duplicated_count: int
    error_count: int
    imported_count: int
    created_at: str
    completed_at: Optional[str] = None
