from functools import lru_cache
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    database_url: str = "sqlite:///./fanvue_promotion.db"
    api_auth_secret: str | None = None
    auth_max_age_seconds: int = Field(default=300, ge=30, le=3600)
    allow_unsafe_dev_headers: bool = False
    agent_execution_enabled: bool = False
    financial_actions_enabled: bool = False
    allowed_origins: str = ""
    allowed_hosts: str = "localhost,127.0.0.1"

    open_model_base_url: str | None = None
    open_model_api_key: str | None = None
    open_model_name: str | None = None
    omniroute_base_url: str | None = None
    omniroute_api_key: str | None = None
    hermes_model: str = "Nous-Hermes-3"
    context_compression_url: str | None = None
    claude_code_bin: str = "claude"

    fanvue_api_base_url: str | None = None
    fanvue_oauth_token_path: str | None = None
    fanvue_messages_path: str | None = None
    fanvue_client_id: str | None = None
    fanvue_client_secret: str | None = None
    fanvue_webhook_secret: str | None = None

    comfyui_base_url: str = "http://127.0.0.1:8188"
    default_lora_name: str | None = None
    default_lora_strength: float = Field(default=0.78, ge=0.0, le=1.5)
    vip_threshold_usd: float = 50.0
    retention_window_hours: int = 48
    api_key_pepper: str | None = None

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.app_env.lower() == "production":
            missing = []
            if not self.api_auth_secret:
                missing.append("API_AUTH_SECRET")
            if not self.fanvue_webhook_secret:
                missing.append("FANVUE_WEBHOOK_SECRET")
            if missing:
                raise ValueError("Production requires " + ", ".join(missing))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
