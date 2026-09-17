"""Normalização de descrição e cálculo de assinatura (hash) para
detecção de duplicados na importação de extratos.

Usado tanto pela importação (CSV/OFX) quanto, de forma opcional, por
transações manuais — assim uma transação lançada manualmente também
pode ser reconhecida como duplicada de uma futura importação.
"""

import hashlib
import re

# Sufixos/ruídos comuns em descrições de extrato que não ajudam a
# identificar o estabelecimento (códigos de autorização, terminal,
# etc.). Removidos só para fins de comparação — nunca alteramos a
# descrição original mostrada ao usuário.
_NOISE_PATTERN = re.compile(r"[^a-z0-9 ]+")
_MULTI_SPACE = re.compile(r"\s+")


def normalize_description(description: str) -> str:
    """Reduz a descrição a um formato canônico para comparação.

    Exemplo: "IFOOD*123456", "IFOOD 123456" e "IFOOD.COM" tendem a
    normalizar para algo próximo, ajudando tanto na deduplicação
    quanto na sugestão de categoria — sem nunca sobrescrever a
    descrição original armazenada.
    """
    text = (description or "").strip().lower()
    text = _NOISE_PATTERN.sub(" ", text)
    text = _MULTI_SPACE.sub(" ", text).strip()
    return text


def compute_dedupe_hash(date: str, normalized_description: str, amount: float, tx_type: str) -> str:
    """Assinatura usada como fallback quando o banco não fornece um
    identificador externo (FITID/ID). Combina data + descrição
    normalizada + valor + tipo — ver docs da funcionalidade de
    importação para a justificativa de cada campo."""
    amount_key = f"{amount:.2f}"
    payload = "|".join([date, normalized_description, amount_key, tx_type])
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
