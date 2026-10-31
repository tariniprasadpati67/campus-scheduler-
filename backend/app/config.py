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
