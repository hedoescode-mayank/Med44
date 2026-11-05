"""
Healthcare Facility Discovery Router for Med44 (PS3 Module 1).
Provides verified facility directory, accessibility filtering, language support,
distance proximity calculation, and explainability for patient matches.
"""
import json
import math
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import HealthcareFacility, Patient
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/facilities", tags=["facilities"])


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two coordinate pairs."""
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 2)


@router.get("")
async def search_facilities(
    query: Optional[str] = None,
    facility_type: Optional[str] = None,
    service: Optional[str] = None,
    language: Optional[str] = None,
    accessibility: Optional[str] = None,
    user_lat: Optional[float] = None,
    user_lon: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    stmt = select(HealthcareFacility).where(HealthcareFacility.is_verified == True)
    res = await db.execute(stmt)
    facilities = res.scalars().all()

    user_lang = language or (current_user.language_pref if current_user else "en")
    lang_map = {"en": "English", "hi": "Hindi", "ta": "Tamil"}
    target_lang_str = lang_map.get(user_lang, user_lang)

    output = []
    for f in facilities:
        services = json.loads(f.services_offered_json) if f.services_offered_json else []
        languages = json.loads(f.supported_languages_json) if f.supported_languages_json else []
        access_features = json.loads(f.accessibility_features_json) if f.accessibility_features_json else []

        # Filter by name query
        if query and query.strip():
            q = query.strip().lower()
            if q not in f.name.lower() and q not in f.address.lower() and not any(q in s.lower() for s in services):
                continue

        # Filter by facility_type
        if facility_type and facility_type.lower() != "all":
            if facility_type.lower() not in f.facility_type.lower():
                continue

        # Filter by specific service
        if service and service.lower() != "all":
            if not any(service.lower() in s.lower() for s in services):
                continue

        # Filter by language
        if language and language.lower() != "all":
            t_lang = lang_map.get(language.lower(), language)
            if not any(t_lang.lower() in l.lower() for l in languages):
                continue

        # Filter by accessibility
        if accessibility and accessibility.lower() != "all":
            if not any(accessibility.lower() in a.lower() for a in access_features):
                continue

        # Distance calculation
        dist = None
        if user_lat is not None and user_lon is not None and f.latitude and f.longitude:
            dist = haversine_distance(user_lat, user_lon, f.latitude, f.longitude)

        # Build Explainability Match Reasons (PS3 Requirement: "Show why each result matches")
        match_reasons = []
        if any(target_lang_str.lower() in l.lower() for l in languages):
            match_reasons.append(f"Supports your preferred language ({target_lang_str})")
        if access_features:
            match_reasons.append(f"Verified accessibility: {access_features[0]}")
        if service and any(service.lower() in s.lower() for s in services):
            match_reasons.append(f"Provides requested specialty: {service}")
        if dist is not None:
            match_reasons.append(f"Convenient nearby distance: {dist} km")
        if not match_reasons:
            match_reasons.append("Accredited facility verified by State Health Registry")

        output.append({
            "id": f.id,
            "name": f.name,
            "facility_type": f.facility_type,
            "address": f.address,
            "city": f.city,
            "contact_number": f.contact_number,
            "operating_hours": f.operating_hours,
            "services_offered": services,
            "supported_languages": languages,
            "accessibility_features": access_features,
            "distance_km": dist,
            "match_reasons": match_reasons,
            "source": f.source,
            "last_verified": f.last_verified.strftime("%d %b %Y") if f.last_verified else "Verified",
            "is_verified": f.is_verified,
            "directions_supported": True,
            "can_call": True,
        })

    # Sort by distance if available, else by name
    if user_lat is not None and user_lon is not None:
        output.sort(key=lambda x: (x["distance_km"] if x["distance_km"] is not None else 9999))
    else:
        output.sort(key=lambda x: x["name"])

    return output


@router.get("/{id}")
async def get_facility_details(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(HealthcareFacility).where(HealthcareFacility.id == id)
    f = (await db.execute(stmt)).scalar_one_or_none()
    if not f:
        return {"error": "Facility not found"}

    services = json.loads(f.services_offered_json) if f.services_offered_json else []
    languages = json.loads(f.supported_languages_json) if f.supported_languages_json else []
    access_features = json.loads(f.accessibility_features_json) if f.accessibility_features_json else []

    return {
        "id": f.id,
        "name": f.name,
        "facility_type": f.facility_type,
        "address": f.address,
        "city": f.city,
        "contact_number": f.contact_number,
        "operating_hours": f.operating_hours,
        "services_offered": services,
        "supported_languages": languages,
        "accessibility_features": access_features,
        "source": f.source,
        "last_verified": f.last_verified.strftime("%d %B %Y") if f.last_verified else "Verified",
        "is_verified": f.is_verified,
        "latitude": f.latitude,
        "longitude": f.longitude,
    }

