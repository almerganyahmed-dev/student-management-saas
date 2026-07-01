from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App config, sourced from environment variables / .env. Never hardcode secrets here."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/student_saas"

    jwt_secret_key: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Placeholder wired up in Phase 5 (Stripe) — kept here now so .env.example
    # documents the full expected shape from day one.
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""


settings = Settings()
