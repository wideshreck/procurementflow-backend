# app/core/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Defines application settings, loaded from environment variables and/or a .env file.
    """
    # Variables to be read from the environment
    SUPABASE_URL: str
    SUPABASE_KEY: str
    OPENAI_MODEL: str = "gpt-4.1"
    APP_NAME: str = "FastAPI App"
    OPENAI_API_KEY: str
    API_V1_STR: str

    # Configure Pydantic to load from a .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8'
    )

# A single, globally accessible settings instance
settings = Settings()