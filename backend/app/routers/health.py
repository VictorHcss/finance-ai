from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def read_root() -> dict:
    return {
        "status": "online",
        "message": "Finance AI Backend funcionando",
    }
