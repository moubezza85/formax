from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Formax"
    SECRET_KEY: str = "your-secret-key-for-dev-only" # Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720 # 12 hours for easier management
    
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "formax_user"
    POSTGRES_PASSWORD: str = "formax_pass"
    POSTGRES_DB: str = "formax"
    DATABASE_URL: Optional[str] = None

    @property
    def sync_database_url(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

    class Config:
        env_file = ".env"

settings = Settings()
