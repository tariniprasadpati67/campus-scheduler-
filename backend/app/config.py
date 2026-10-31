import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
env_path = PROJECT_ROOT / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or not DATABASE_URL.strip():
    DATABASE_URL = f"sqlite:///{PROJECT_ROOT / 'cit.db'}"

JWT_SECRET = os.getenv("JWT_SECRET", "cit-super-secret-jwt-key-2027-crunch-week-production-grade-32bytes-plus")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
DATA_PATH = PROJECT_ROOT / "data" / "cit_public.json"
EXPORTS_DIR = PROJECT_ROOT / "exports"
