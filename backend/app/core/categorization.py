"""Motor de sugestão de categorias por regras/palavras-chave.

Primeira versão deliberadamente simples (sem IA), como pede a
especificação da funcionalidade de importação. A lista de regras é
uma estrutura de dados comum (`CATEGORY_RULES`), fácil de estender
depois sem mexer na lógica de correspondência.
"""

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
