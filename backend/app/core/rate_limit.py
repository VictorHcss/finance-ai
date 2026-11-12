"""Limite simples de tentativas de login, em memória.

Bloqueia por 15 minutos depois de 5 falhas seguidas para o mesmo par
(IP, e-mail) — ou 20 falhas do mesmo IP para e-mails diferentes, o que
cobre quem tenta várias contas. Um login certo zera o contador do par.

Por ser em memória, vale por processo: com vários workers/servidores,
trocar por Redis ou similar.
"""

import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple

WINDOW_SECONDS = 15 * 60
MAX_FAILURES_PER_ACCOUNT = 5
MAX_FAILURES_PER_IP = 20

_lock = threading.Lock()
_account_failures: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)
_ip_failures: Dict[str, Deque[float]] = defaultdict(deque)


def _prune(bucket: Deque[float], now: float) -> None:
    while bucket and now - bucket[0] > WINDOW_SECONDS:
        bucket.popleft()


def retry_after_seconds(ip: str, email: str) -> int:
    """Segundos até liberar; 0 se a tentativa pode prosseguir."""
    now = time.monotonic()
    with _lock:
        account = _account_failures[(ip, email)]
        by_ip = _ip_failures[ip]
        _prune(account, now)
        _prune(by_ip, now)
        waits = []
        if len(account) >= MAX_FAILURES_PER_ACCOUNT:
            waits.append(WINDOW_SECONDS - (now - account[0]))
        if len(by_ip) >= MAX_FAILURES_PER_IP:
            waits.append(WINDOW_SECONDS - (now - by_ip[0]))
        return int(max(waits)) + 1 if waits else 0


def register_failure(ip: str, email: str) -> None:
    now = time.monotonic()
    with _lock:
        _account_failures[(ip, email)].append(now)
        _ip_failures[ip].append(now)


def register_success(ip: str, email: str) -> None:
    with _lock:
        _account_failures.pop((ip, email), None)


def reset() -> None:
    with _lock:
        _account_failures.clear()
        _ip_failures.clear()
