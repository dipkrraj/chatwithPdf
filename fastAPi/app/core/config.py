import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    app_name: str = "AI PDF Chat"
    app_version: str = "1.0.0"

    # Database
    database_url: str = ""

    # Auth / JWT
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Google OAuth
    google_client_id: str = ""

    # Groq LLM & Embeddings
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    use_hf_embeddings: bool = bool(os.environ.get("RENDER") or os.environ.get("HF_TOKEN"))
    hf_token: str = ""

    # Chroma Cloud
    chroma_api_key: str = ""
    chroma_tenant: str = ""
    chroma_database: str = ""
    chroma_collection: str = "pdf_chunks"

    # File Upload
    max_file_size_mb: int = 20
    upload_dir: str = "app/uploads"

    model_config = SettingsConfigDict(
        env_file="app/.env",
        env_file_encoding="utf-8",
    )


settings = Settings()
