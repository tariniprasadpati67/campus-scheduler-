from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import FRONTEND_URL
from backend.app.init_db import init_database
from backend.app.api.auth_routes import router as auth_router
from backend.app.api.timetable_routes import router as timetable_router
from backend.app.api.booking_routes import router as booking_router
from backend.app.api.faculty_routes import router as faculty_router
from backend.app.api.change_routes import router as change_router
from backend.app.api.admin_routes import router as admin_router
from backend.app.api.ai_routes import router as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize PostgreSQL tables and demo seed on startup
    init_database()
    yield


app = FastAPI(
    title="CIT Timetabling & Venue Booking API",
    description="Automated scheduling, venue allocation, disruption rescheduling, and conflict resolution API.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]
if FRONTEND_URL and FRONTEND_URL not in origins:
    origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes with both /api prefix and root prefix for maximum compatibility
for prefix in ["/api", ""]:
    app.include_router(auth_router, prefix=prefix)
    app.include_router(timetable_router, prefix=prefix)
    app.include_router(booking_router, prefix=prefix)
    app.include_router(faculty_router, prefix=prefix)
    app.include_router(change_router, prefix=prefix)
    app.include_router(admin_router, prefix=prefix)
    app.include_router(ai_router, prefix=prefix)


@app.get("/health", tags=["system"])
@app.get("/api/health", tags=["system"])
def health_check():
    return {"status": "ok", "system": "CIT Timetabling Backend (PostgreSQL)", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
