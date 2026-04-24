from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Finance AI Backend Online"}

@app.get("/api/insights")
def get_insights():
    return {
        "previsao_proximo_mes": 3150.00,
        "economias_sugeridas": 120.50,
        "alerta": "Você possui 3 parcelas pendentes do item 'Computador'."
    }