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

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_basic: str = ""
    stripe_price_premium: str = ""
    stripe_price_enterprise: str = ""
    frontend_url: str = "http://localhost:5173"


settings = Settings()
