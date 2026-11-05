"""
Authentication router for Med44.
Provides JWT-based registration, login, demo access, and current user retrieval.
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import bcrypt

from backend.config import settings
from backend.db.database import get_db
from backend.db.models import Patient

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    language_pref: Optional[str] = "en"


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return plain_password == hashed_password


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> Optional[Patient]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            return None
    except JWTError:
        return None

    stmt = select(Patient).where(Patient.email == email)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def get_current_patient(
    current_user: Optional[Patient] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Patient:
    """Retrieve the logged in patient, or fall back to the active local demo patient."""
    if current_user:
        return current_user

    stmt = select(Patient).where(Patient.email == "demo@med44.ai")
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        stmt2 = select(Patient).limit(1)
        patient = (await db.execute(stmt2)).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=401, detail="Patient authentication required")
    return patient


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(Patient).where(Patient.email == req.email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_patient = Patient(
        name=req.name,
        email=req.email,
        hashed_password=get_password_hash(req.password),
        age=req.age,
        gender=req.gender,
        blood_group=req.blood_group,
        language_pref=req.language_pref or "en",
    )
    db.add(new_patient)
    await db.commit()
    await db.refresh(new_patient)

    access_token = create_access_token({"sub": new_patient.email, "id": new_patient.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_patient.id,
            "name": new_patient.name,
            "email": new_patient.email,
            "age": new_patient.age,
            "gender": new_patient.gender,
            "avatar": "male" if new_patient.gender == "Male" else "female",
            "blood_group": new_patient.blood_group,
            "language_pref": new_patient.language_pref,
            "has_completed_survey": False,
        },
    }


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(Patient).where(Patient.email == req.email)
    patient = (await db.execute(stmt)).scalar_one_or_none()
    if not patient or not verify_password(req.password, patient.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({"sub": patient.email, "id": patient.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": patient.id,
            "name": patient.name,
            "email": patient.email,
            "age": patient.age,
            "gender": patient.gender,
            "avatar": "male" if patient.gender == "Male" else "female",
            "blood_group": patient.blood_group,
            "language_pref": patient.language_pref,
            "has_completed_survey": True,
        },
    }


@router.post("/token", response_model=TokenResponse)
async def token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    return await login(LoginRequest(email=form_data.username, password=form_data.password), db=db)


@router.get("/me")
async def me(current_user: Optional[Patient] = Depends(get_current_user)):
    if not current_user:
        # Return single consistent Mayank Sharma profile for local development demo
        return {
            "id": 1,
            "name": "Mayank Sharma",
            "email": "demo@med44.ai",
            "age": 29,
            "gender": "Male",
            "avatar": "male",
            "blood_group": "B+",
            "language_pref": "en",
            "allergies": "Penicillin",
            "has_completed_survey": True,
            "health_score": 85,
        }
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "age": current_user.age,
        "gender": current_user.gender,
        "avatar": "male" if current_user.gender == "Male" else "female",
        "blood_group": current_user.blood_group,
        "language_pref": current_user.language_pref,
        "allergies": current_user.allergies,
        "has_completed_survey": True,
    }
