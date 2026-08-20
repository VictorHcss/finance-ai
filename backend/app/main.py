import io
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_allowed_origins
from app.core.database import init_db
from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.goals import router as goals_router
from app.routers.health import router as health_router
from app.routers.insights import router as insights_router
from app.routers.notifications import router as notifications_router
from app.routers.transactions import router as transactions_router
from app.services.audit_service import register_audit_event_handler


if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")


def create_app() -> FastAPI:
    app = FastAPI(title="Finance.AI API", version="0.2.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-User-Id"],
    )

    init_db()
    register_audit_event_handler()

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(transactions_router)
    app.include_router(goals_router)
    app.include_router(dashboard_router)
    app.include_router(insights_router)
    app.include_router(notifications_router)
    return app


app = create_app()
