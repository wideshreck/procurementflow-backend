# app/main.py

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging_config import setup_logging # Updated import
from app.services.supabase import (
    connect_to_supabase,
    close_supabase_connection
)
# Import the router from its new location
from app.routes.utility import router as utility_router
from app.routes.chat import router as chat_router
from app.routes.budget import router as budget_router

# Configure logging at the very beginning
setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages the application's lifespan events for startup and shutdown."""
    logger.info(f"Starting up application: '{settings.APP_NAME}'...")
    connect_to_supabase()
    yield
    logger.info("Shutting down application...")
    close_supabase_connection()

# Create the FastAPI application instance
app = FastAPI(
    title=settings.APP_NAME,
    description="A professional, versioned FastAPI application structure.",
    version="1.0.0",
    lifespan=lifespan
)

origins = [
    "https://procurementflow.onrender.com/", # Kendi frontend adresinizi buraya yazın
    "http://localhost:5173", # Geliştirme için
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Belirtilen adreslerden gelen isteklere izin ver
    allow_credentials=True,
    allow_methods=["*"], # Tüm metodlara (GET, POST, vb.) izin ver
    allow_headers=["*"], # Tüm header'lara izin ver
)

# --- Global Exception Handler ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catches and logs any unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
    )

# --- Include Routers ---

app.include_router(
    utility_router,
    prefix="/api/v1",
    tags=["Utilities - V1"]
)

app.include_router(
    chat_router,
    prefix="/api/v1",
    tags=["AI Chat - V1"]
)

app.include_router(
    budget_router,
    prefix="/api/v1",
    tags=["AI Budget - V1"]
)