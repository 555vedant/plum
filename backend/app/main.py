import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import Base, engine, explain_database_error
from app.routes.upload_routes import router as upload_router
from app.routes.claim_routes import router as claim_router

# Import models to register them on Base.metadata
from app.models.claim import Claim
from app.models.document import Document
from app.models.extracted_data import ExtractedData

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(title="AI-Powered OPD Insurance Claim Adjudication System")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure local fallback directory exists and mount it
os.makedirs(os.path.join("app", "static", "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Include routers under the specified /api/claims prefix
app.include_router(upload_router, prefix="/api/claims")
app.include_router(claim_router, prefix="/api/claims")

@app.on_event("startup")
async def startup():
    logger.info("Initializing database tables...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.critical(f"Database table initialization failed: {explain_database_error(e)}")

@app.get("/health")
async def health():
    return {"status": "healthy"}
