from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.router import api_router
from backend.db.duckdb_repo import init_database
from backend.services.llm_analyzer import get_llm_predictor

app = FastAPI(title="Stock Analysis API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    init_database()
    try:
        get_llm_predictor()
    except Exception:
        pass

@app.get("/")
async def root():
    return {"message": "Stock Analysis API Running Successfully in Enterprise Architecture"}


import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)