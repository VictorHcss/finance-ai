from collections.abc import Callable
from typing import Any

EventHandler = Callable[[str, dict[str, Any]], None]

_handlers: list[EventHandler] = []


def register_event_handler(handler: EventHandler) -> None:
    _handlers.append(handler)


def emit_event(name: str, payload: dict[str, Any]) -> None:
    for handler in _handlers:
        try:
            handler(name, payload)
        except Exception:
            continue
