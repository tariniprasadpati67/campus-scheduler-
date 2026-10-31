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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and demo seed on startup
    init_database()
    yield


app = FastAPI(
    title="CIT Timetabling & Venue Booking API",
    description="Automated scheduling, venue allocation, disruptions rescheduling, and conflict resolution API.",
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth_router, prefix="/api")
app.include_router(timetable_router, prefix="/api")
app.include_router(booking_router, prefix="/api")
app.include_router(faculty_router, prefix="/api")
app.include_router(change_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


@app.get("/api/health", tags=["system"])
def health_check():
    return {"status": "ok", "system": "CIT Timetabling Backend", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)

