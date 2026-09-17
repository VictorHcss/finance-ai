"""Parsing e normalização de extratos bancários (CSV e OFX) para o
modelo interno único de transação usado pelo restante do Finance AI.

Este módulo só entende o "de fora para dentro": recebe bytes crus de
um arquivo e devolve uma lista de `ParsedRow` (uma por movimentação
reconhecida) mais uma lista de `ParseIssue` (linhas que não puderam
ser interpretadas). Nada aqui toca o banco de dados — isso é
responsabilidade do `ImportService`/`ImportRepository`.
"""

import csv
import io
import re
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import List, Optional, Tuple

MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB — limite razoável para um extrato
ALLOWED_EXTENSIONS = (".csv", ".ofx")


class FileValidationError(ValueError):
    """Erro amigável de validação de arquivo, pronto para virar
    mensagem de erro na prévia da importação."""


@dataclass
class ParsedRow:
    date: str  # ISO 8601 (YYYY-MM-DD)
    description: str  # descrição original, sem alterações
    amount: float  # sempre positivo — o sinal vira `type`
    type: str  # "income" | "expense"
    external_id: Optional[str] = None
    line_number: Optional[int] = None


@dataclass
class ParseIssue:
    line_number: Optional[int]
    reason: str
    raw: str = ""


# ---------------------------------------------------------------------------
# Validação de arquivo
# ---------------------------------------------------------------------------

def detect_format(filename: str, content: bytes) -> str:
    lower_name = (filename or "").lower().strip()

    if lower_name.endswith(".csv"):
        return "csv"
    if lower_name.endswith(".ofx"):
        return "ofx"

    # Não confiar somente na extensão: se o nome não bater, olha o
    # conteúdo. OFX começa com um cabeçalho textual ("OFXHEADER" ou
    # tag <OFX>); qualquer outra coisa que pareça texto tabular vira
    # tentativa de CSV.
    sniff = content[:4096].decode("utf-8", errors="ignore").upper()
    if "OFXHEADER" in sniff or "<OFX>" in sniff:
        return "ofx"
    return "csv"


def validate_file(filename: str, content: bytes) -> str:
    """Valida o arquivo e devolve o formato detectado ("csv" ou
    "ofx"). Levanta FileValidationError com mensagem amigável quando
    o arquivo não pode ser processado."""

    if not filename or "." not in filename:
        raise FileValidationError("Formato de arquivo não suportado.")

    extension = "." + filename.rsplit(".", 1)[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise FileValidationError("Formato de arquivo não suportado.")

    if not content:
        raise FileValidationError("O arquivo está vazio.")

    if len(content) > MAX_IMPORT_FILE_SIZE_BYTES:
        raise FileValidationError("O arquivo excede o tamanho máximo permitido.")

    fmt = detect_format(filename, content)

    # Sanidade mínima de conteúdo — não confiamos apenas na extensão.
    if fmt == "csv":
        try:
            content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                content.decode("latin-1")
            except UnicodeDecodeError as exc:
                raise FileValidationError("Não foi possível interpretar o arquivo.") from exc
    else:
        sniff = content[:4096].decode("utf-8", errors="ignore").upper()
        if "OFXHEADER" not in sniff and "<OFX>" not in sniff:
            raise FileValidationError("Não foi possível interpretar o arquivo.")

    return fmt


# ---------------------------------------------------------------------------
# Valores monetários
# ---------------------------------------------------------------------------

_CURRENCY_NOISE = re.compile(r"[R$\s]", re.IGNORECASE)


def parse_amount(raw: str) -> Decimal:
    """Interpreta um valor monetário em formato BR ou US, tolerando
    símbolo de moeda, parênteses para negativo e milhar com ponto ou
    vírgula. Usa Decimal do início ao fim para não introduzir erro de
    ponto flutuante nas contas financeiras."""
    if raw is None:
        raise InvalidOperation("valor vazio")

    text = _CURRENCY_NOISE.sub("", str(raw)).strip()
    if not text:
        raise InvalidOperation("valor vazio")

    negative = False
    if text.startswith("(") and text.endswith(")"):
        negative = True
        text = text[1:-1]
    if text.startswith("-"):
        negative = True
        text = text[1:]
    elif text.startswith("+"):
        text = text[1:]

    has_comma = "," in text
    has_dot = "." in text

    if has_comma and has_dot:
        # O separador decimal é o que aparece por último.
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    elif has_comma:
        # Só vírgula: decimal se houver exatamente uma e com 1-2
        # dígitos depois; caso contrário, é separador de milhar.
        parts = text.split(",")
        if len(parts) == 2 and 1 <= len(parts[1]) <= 2:
            text = text.replace(",", ".")
        else:
            text = text.replace(",", "")
    # Só ponto (ou nenhum separador): já está em formato Decimal válido.

    value = Decimal(text)
    return -value if negative else value


# ---------------------------------------------------------------------------
# Datas
# ---------------------------------------------------------------------------

_DATE_FORMATS = (
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%Y/%m/%d",
    "%d.%m.%Y",
    "%d/%m/%y",
    "%Y%m%d",
)


def parse_date(raw: str) -> str:
    text = (raw or "").strip()
    if not text:
        raise ValueError("data vazia")

    # OFX manda DTPOSTED como YYYYMMDD ou YYYYMMDDHHMMSS[.xxx[:tz]]
    digits_only = re.match(r"^(\d{8})", text)
    if digits_only and text[:8].isdigit():
        try:
            return datetime.strptime(digits_only.group(1), "%Y%m%d").date().isoformat()
        except ValueError:
            pass

    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue

    raise ValueError(f"formato de data não reconhecido: {text!r}")


# ---------------------------------------------------------------------------
# CSV
# ---------------------------------------------------------------------------

_HEADER_ALIASES = {
    "date": ["data", "data lancamento", "data lançamento", "date", "data mov", "data movimento"],
    "description": [
        "descricao", "descrição", "historico", "histórico", "description",
        "lancamento", "lançamento", "detalhes",
    ],
    "amount": ["valor", "amount", "valor (r$)", "montante"],
    "debit": ["debito", "débito", "debit", "saida", "saída"],
    "credit": ["credito", "crédito", "credit", "entrada"],
    "id": ["id", "documento", "identificador", "num doc", "nº doc"],
}


def _strip_accents_lower(value: str) -> str:
    import unicodedata

    normalized = unicodedata.normalize("NFKD", value)
    without_accents = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return without_accents.strip().lower()


def _match_header(header_cells: List[str]) -> dict:
    """Mapeia cada papel (date/description/amount/debit/credit/id)
    para o índice da coluna correspondente no cabeçalho, tolerando
    nomes diferentes de banco para banco."""
    normalized_cells = [_strip_accents_lower(cell) for cell in header_cells]
    mapping: dict = {}

    for role, aliases in _HEADER_ALIASES.items():
        normalized_aliases = [_strip_accents_lower(a) for a in aliases]
        for idx, cell in enumerate(normalized_cells):
            if cell in normalized_aliases:
                mapping[role] = idx
                break

    return mapping


def _sniff_delimiter(sample: str) -> str:
    semicolons = sample.count(";")
    commas_in_header = sample.split("\n", 1)[0].count(",")
    # Extratos BR tipicamente usam ";" quando o valor usa "," como
    # separador decimal (senão o "," do valor quebraria o CSV). Se
    # houver claramente mais ";" que "," na primeira linha, usamos ";".
    if semicolons > 0 and semicolons >= commas_in_header:
        return ";"
    return ","


def parse_csv(content: bytes) -> Tuple[List[ParsedRow], List[ParseIssue]]:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    delimiter = _sniff_delimiter(text)
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    rows = [row for row in reader if any(cell.strip() for cell in row)]

    if not rows:
        return [], [ParseIssue(line_number=None, reason="Arquivo não contém movimentações.")]

    header_mapping = _match_header(rows[0])
    data_rows = rows[1:]

    has_header = bool(header_mapping.get("date") is not None or header_mapping.get("amount") is not None)
    if not has_header:
        # Sem cabeçalho reconhecível — não arriscamos adivinhar a
        # ordem das colunas às cegas.
        return [], [
            ParseIssue(
                line_number=1,
                reason="Não foi possível identificar as colunas de data e valor no arquivo.",
            )
        ]

    has_single_amount = "amount" in header_mapping
    has_split_amount = "debit" in header_mapping or "credit" in header_mapping

    if not has_single_amount and not has_split_amount:
        return [], [
            ParseIssue(
                line_number=1,
                reason="Não foi possível identificar a coluna de valor no arquivo.",
            )
        ]

    if "date" not in header_mapping:
        return [], [
            ParseIssue(line_number=1, reason="Não foi possível identificar a coluna de data no arquivo.")
        ]

    parsed: List[ParsedRow] = []
    issues: List[ParseIssue] = []

    for offset, row in enumerate(data_rows, start=2):  # linha 1 é o cabeçalho
        raw_line = delimiter.join(row)

        def cell(role: str) -> str:
            idx = header_mapping.get(role)
            if idx is None or idx >= len(row):
                return ""
            return row[idx].strip()

        date_raw = cell("date")
        description = cell("description") or "(sem descrição)"
        external_id = cell("id") or None

        try:
            iso_date = parse_date(date_raw)
        except ValueError:
            issues.append(ParseIssue(line_number=offset, reason="Data inválida", raw=raw_line))
            continue

        try:
            if has_single_amount:
                amount_value = parse_amount(cell("amount"))
            else:
                debit_raw = cell("debit")
                credit_raw = cell("credit")
                if credit_raw:
                    amount_value = abs(parse_amount(credit_raw))
                elif debit_raw:
                    amount_value = -abs(parse_amount(debit_raw))
                else:
                    issues.append(
                        ParseIssue(line_number=offset, reason="Valor não identificado", raw=raw_line)
                    )
                    continue
        except InvalidOperation:
            issues.append(ParseIssue(line_number=offset, reason="Valor não identificado", raw=raw_line))
            continue

        if amount_value == 0:
            issues.append(
                ParseIssue(line_number=offset, reason="Movimentação com valor zero", raw=raw_line)
            )
            continue

        tx_type = "income" if amount_value > 0 else "expense"

        parsed.append(
            ParsedRow(
                date=iso_date,
                description=description,
                amount=float(abs(amount_value)),
                type=tx_type,
                external_id=external_id,
                line_number=offset,
            )
        )

    return parsed, issues


# ---------------------------------------------------------------------------
# OFX
# ---------------------------------------------------------------------------

_STMTTRN_BLOCK = re.compile(r"<STMTTRN>(.*?)</STMTTRN>", re.IGNORECASE | re.DOTALL)
_OFX_TAG = re.compile(r"<([A-Z0-9.]+)>\s*([^\r\n<]*)", re.IGNORECASE)


def _extract_ofx_tags(block: str) -> dict:
    tags: dict = {}
    for match in _OFX_TAG.finditer(block):
        tag_name = match.group(1).upper()
        value = match.group(2).strip()
        tags[tag_name] = value
    return tags


def parse_ofx(content: bytes) -> Tuple[List[ParsedRow], List[ParseIssue]]:
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1", errors="ignore")

    blocks = _STMTTRN_BLOCK.findall(text)

    if not blocks:
        return [], [
            ParseIssue(line_number=None, reason="Nenhuma movimentação (STMTTRN) encontrada no arquivo OFX.")
        ]

    parsed: List[ParsedRow] = []
    issues: List[ParseIssue] = []

    for index, block in enumerate(blocks, start=1):
        tags = _extract_ofx_tags(block)

        date_raw = tags.get("DTPOSTED", "")
        amount_raw = tags.get("TRNAMT", "")
        description = tags.get("NAME") or tags.get("MEMO") or "(sem descrição)"
        external_id = tags.get("FITID") or None

        try:
            iso_date = parse_date(date_raw)
        except ValueError:
            issues.append(ParseIssue(line_number=index, reason="Data inválida", raw=block.strip()[:120]))
            continue

        try:
            amount_value = Decimal(amount_raw.replace(",", "."))
        except (InvalidOperation, AttributeError):
            issues.append(
                ParseIssue(line_number=index, reason="Valor não identificado", raw=block.strip()[:120])
            )
            continue

        if amount_value == 0:
            issues.append(ParseIssue(line_number=index, reason="Movimentação com valor zero"))
            continue

        tx_type = "income" if amount_value > 0 else "expense"

        parsed.append(
            ParsedRow(
                date=iso_date,
                description=description,
                amount=float(abs(amount_value)),
                type=tx_type,
                external_id=external_id,
                line_number=index,
            )
        )

    return parsed, issues


def parse_statement(fmt: str, content: bytes) -> Tuple[List[ParsedRow], List[ParseIssue]]:
    if fmt == "ofx":
        return parse_ofx(content)
    return parse_csv(content)
