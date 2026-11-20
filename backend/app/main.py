"""FastAPI application entrypoint for Setu Pramaan."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.ingest import router as ingest_router
from backend.app.api.backtest import router as backtest_router
from backend.app.api.suggestions import router as suggestions_router
from backend.app.api.audit import router as audit_router
from backend.app.api.pipeline import router as pipeline_router
from backend.app.db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="Setu — Commitment Confidence Engine",
    version="1.0-pramaan",
    description="Commitment Confidence Engine for Farmer Producer Organizations",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0-pramaan"}

app.include_router(ingest_router)
app.include_router(backtest_router)
app.include_router(suggestions_router)
app.include_router(audit_router)
app.include_router(pipeline_router)
