# app/services/supabase.py

import logging
from supabase import create_client, Client
from app.core.config import settings

# Create a logger specific to this module
logger = logging.getLogger(__name__)

# A module-level variable to hold the Supabase client instance (singleton pattern).
_supabase_client: Client | None = None

def get_supabase_client() -> Client:
    """
    A dependency function to get the Supabase client.
    Raises a RuntimeError if the client has not been initialized.
    """
    if _supabase_client is None:
        # This case should not happen if the lifespan event handler works correctly.
        logger.critical("Supabase client has not been initialized!")
        raise RuntimeError("Supabase client is not available.")
    return _supabase_client

def connect_to_supabase():
    """
    Initializes the Supabase client at application startup.
    """
    global _supabase_client
    logger.info("Initializing Supabase client...")
    try:
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
    except Exception as e:
        logger.critical(f"Critical error while initializing Supabase client: {e}", exc_info=True)
        raise

def close_supabase_connection():
    """
    Cleans up resources at application shutdown.
    """
    global _supabase_client
    logger.info("Closing Supabase client connection.")
    _supabase_client = None  # Helps the garbage collector