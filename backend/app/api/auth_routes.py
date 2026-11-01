from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db, User
from backend.app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str = Field(..., min_length=1)


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=4)
    role: str = Field(default="faculty")  # admin | coordinator | faculty | club
    department: Optional[str] = None
    faculty_id: Optional[str] = None
    club_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user in Supabase PostgreSQL and receive a JWT access token."""
    email_clean = req.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid email address is required.",
        )

    # Check if user already exists
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{email_clean}' already exists. Please sign in instead.",
        )

    valid_roles = {"admin", "coordinator", "faculty", "club"}
    user_role = req.role.strip().lower()
    if user_role not in valid_roles:
        user_role = "faculty"

    # Auto-assign sensible defaults for department / club if missing
    dept = req.department.strip() if req.department else None
    fac_id = req.faculty_id.strip() if req.faculty_id else None
    c_name = req.club_name.strip() if req.club_name else None

    if user_role == "coordinator" and not dept:
        dept = "CSE"
    elif user_role == "faculty" and not dept:
        dept = "CSE"
    elif user_role == "club" and not c_name:
        c_name = req.name

    hashed_pwd = hash_password(req.password)

    new_user = User(
        name=req.name.strip(),
        email=email_clean,
        password_hash=hashed_pwd,
        role=user_role,
        department=dept,
        faculty_id=fac_id,
        club_name=c_name,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(
        data={"sub": str(new_user.id), "email": new_user.email, "role": new_user.role}
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "role": new_user.role,
            "department": new_user.department,
            "faculty_id": new_user.faculty_id,
            "club_name": new_user.club_name,
        },
    }


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email and password to receive a JWT access token."""
    login_id = (req.email or req.username or "").strip().lower()
    if not login_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username is required.",
        )

    # Match by email or username prefix
    user = (
        db.query(User)
        .filter((User.email == login_id) | (User.email.ilike(f"{login_id}@%")))
        .first()
    )

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "department": user.department,
            "faculty_id": user.faculty_id,
            "club_name": user.club_name,
        },
    }


@router.get("/me")
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get profile and permissions of the currently authenticated user."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "department": current_user.department,
        "faculty_id": current_user.faculty_id,
        "club_name": current_user.club_name,
    }
