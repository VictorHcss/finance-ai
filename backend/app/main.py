import io
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_allowed_origins, validate_production_config
from app.core.database import init_db
from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.goals import router as goals_router
from app.routers.health import router as health_router
from app.routers.import_transactions import router as import_router
from app.routers.insights import router as insights_router
from app.routers.notifications import router as notifications_router
from app.routers.settings import router as settings_router
from app.routers.transactions import router as transactions_router
from app.services.audit_service import register_audit_event_handler


if sys.platform == "win32":
    # reconfigure() mantém o mesmo stream; trocar por um TextIOWrapper novo
    # fechava o buffer original e quebrava a captura de saída do pytest.
    for stream in (sys.stdout, sys.stderr):
        if isinstance(stream, io.TextIOWrapper):
            stream.reconfigure(encoding="utf-8")


def create_app() -> FastAPI:
    validate_production_config()
    app = FastAPI(title="Finance.AI API", version="0.2.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    init_db()
    register_audit_event_handler()

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(import_router)
    app.include_router(transactions_router)
    app.include_router(goals_router)
    app.include_router(dashboard_router)
    app.include_router(insights_router)
    app.include_router(notifications_router)
    app.include_router(settings_router)
    return app


app = create_app()
