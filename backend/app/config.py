import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load repo-root .env using explicit path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
env_path = PROJECT_ROOT / ".env"
load_dotenv(dotenv_path=env_path)

raw_db_url = os.getenv("DATABASE_URL")
if not raw_db_url or not raw_db_url.strip():
    sys.exit("ERROR: DATABASE_URL is missing. A PostgreSQL connection string starting with 'postgresql' is required in repo-root .env.")

raw_db_url = raw_db_url.strip()
if raw_db_url.startswith("postgres://"):
    DATABASE_URL = "postgresql://" + raw_db_url[len("postgres://"):]
elif raw_db_url.startswith("postgresql"):
    DATABASE_URL = raw_db_url
else:
    sys.exit("ERROR: DATABASE_URL must start with 'postgresql'. A valid PostgreSQL connection string is required.")

# At startup print ONLY "Using PostgreSQL", never the URL or password
print("Using PostgreSQL")

JWT_SECRET = os.getenv("JWT_SECRET", "cit-super-secret-jwt-key-2027-crunch-week-production-grade-32bytes-plus")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
DATA_PATH = PROJECT_ROOT / "data" / "cit_public.json"
EXPORTS_DIR = PROJECT_ROOT / "exports"

# LLM Configuration (Groq API)
LLM_API_KEY = os.getenv("LLM_API_KEY")
raw_llm_model = os.getenv("LLM_MODEL", "qwen/qwen3.8-27b")
LLM_MODEL = raw_llm_model.replace("LLM_MODEL=", "").strip() if raw_llm_model else "qwen/qwen3.8-27b"
raw_fallback = os.getenv("LLM_FALLBACK_MODEL", "allam-2-7b")
LLM_FALLBACK_MODEL = raw_fallback.replace("LLM_FALLBACK_MODEL=", "").strip() if raw_fallback else "allam-2-7b"
