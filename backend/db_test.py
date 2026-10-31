from pathlib import Path
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
engine = create_engine(os.environ["DATABASE_URL"])
with engine.connect() as c:
    print(c.execute(text("select version()")).scalar())

