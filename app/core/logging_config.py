# app/core/logging_config.py

import logging
from logging.config import dictConfig

def setup_logging():
    """Configures structured logging for the application."""
    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
                "stream": "ext://sys.stdout",
            },
        },
        "loggers": {
            "root": {
                "level": "INFO",
                "handlers": ["console"],
            },
            "uvicorn.error": {
                "level": "INFO",
                "handlers": ["console"],
            },
            "uvicorn.access": {
                "level": "INFO",
                "handlers": ["console"],
            },
        },
    }
    dictConfig(config)