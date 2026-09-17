"""Motor de sugestão de categorias por regras/palavras-chave.

Primeira versão deliberadamente simples (sem IA), como pede a
especificação da funcionalidade de importação. A lista de regras é
uma estrutura de dados comum (`CATEGORY_RULES`), fácil de estender
depois sem mexer na lógica de correspondência.
"""

import unicodedata
from typing import List, Optional, Tuple

# Ordem importa: a primeira regra cujo padrão aparece na descrição
# normalizada vence. Padrões mais específicos ficam antes dos mais
# genéricos (ex.: "posto" antes de qualquer coisa mais ampla).
CATEGORY_RULES: List[Tuple[str, List[str]]] = [
    ("Receita", ["salario", "salário", "pagamento salario", "pro labore", "pró labore"]),
    ("Alimentação", ["ifood", "rappi", "restaurante", "lanchonete", "padaria", "supermercado", "mercado"]),
    ("Transporte", ["uber", "99", "taxi", "táxi", "metro", "metrô", "onibus", "ônibus"]),
    ("Assinaturas", ["netflix", "spotify", "prime video", "disney", "hbo", "youtube premium"]),
    ("Saúde", ["farmacia", "farmácia", "drogaria", "hospital", "clinica", "clínica"]),
    ("Combustível", ["posto", "combustivel", "combustível", "gasolina", "etanol"]),
    ("Moradia", ["aluguel", "condominio", "condomínio", "energia", "luz", "iptu"]),
    ("Lazer", ["cinema", "teatro", "ingresso", "show"]),
]


def suggest_category(description: str, normalized_description: str) -> Optional[str]:
    """Retorna a categoria sugerida com base em palavras-chave
    conhecidas, ou None se nenhuma regra bater — nesse caso a
    movimentação fica "Sem categoria" até o usuário decidir."""
    haystack = normalized_description or (description or "").lower()

    for category, keywords in CATEGORY_RULES:
        for keyword in keywords:
            if keyword in haystack:
                return category

    return None


def format_category_label(raw: str) -> str:
    """Normaliza a apresentação de uma categoria digitada livremente,
    sem alterar dados já persistidos: colapsa espaços e aplica
    capitalização por palavra ("ALIMENTAÇÃO" / "alimentação" viram
    "Alimentação"). Usado ao criar/editar uma transação, para reduzir
    a divergência de grafia em dados novos — não é uma migração."""
    text = " ".join((raw or "").strip().split())
    if not text:
        return text
    return " ".join(word[:1].upper() + word[1:].lower() for word in text.split(" "))


def normalize_category_key(raw: str) -> str:
    """Chave de agrupamento estável para uma categoria: minúscula, sem
    acentos, sem espaços duplicados. Duas grafias da mesma categoria
    (\"Alimentação\", \"alimentação\", \"ALIMENTACAO\") produzem a mesma
    chave, então elas passam a somar juntas nos Insights e nos filtros,
    mesmo em dados antigos que nunca foram alterados."""
    text = " ".join((raw or "").strip().lower().split())
    text = "".join(
        char for char in unicodedata.normalize("NFD", text)
        if unicodedata.category(char) != "Mn"
    )
    return text or "sem categoria"
