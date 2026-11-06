"""
Chat router for Med44.
Handles patient symptom queries, triage conversations, multilingual responses,
and personalized safety checks against patient intake survey data.
"""
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.ai.agent_supervisor import supervisor
from backend.db.database import get_db
from backend.db.models import Conversation, ConversationMessage, AuditLog, Patient
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en"
    conversation_id: Optional[int] = None
    answered_fields: Optional[List[str]] = None
    history: Optional[List[Dict[str, str]]] = None
    patient_context: Optional[Dict[str, Any]] = None
    doc_context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    conversation_id: int
    matched_symptoms: List[str]
    urgency: str
    red_flags: List[Dict[str, Any]]
    clinical_advice: str
    followup_questions: List[Any]
    articles: List[Dict[str, Any]]
    disclaimer: str
    mode: str
    language: str


@router.post("", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1

    # Find or create conversation
    conv_id = req.conversation_id
    if not conv_id:
        new_conv = Conversation(
            patient_id=patient_id,
            mode="offline",
            language=req.language or "en",
        )
        db.add(new_conv)
        await db.commit()
        await db.refresh(new_conv)
        conv_id = new_conv.id

    # Record user message
    user_msg = ConversationMessage(
        conversation_id=conv_id,
        role="user",
        content=req.message,
    )
    db.add(user_msg)

    # Process query through clinical/AI pipeline (with document grounding if provided)
    effective_message = req.message
    if req.doc_context and req.doc_context.get("text"):
        d_title = req.doc_context.get("title", "Attached Document")
        d_cat = req.doc_context.get("category", "Record")
        d_ver = "Patient-Verified" if req.doc_context.get("is_verified") else "Draft OCR"
        d_text = str(req.doc_context.get("text", ""))[:1200]
        effective_message = (
            f"{req.message}\n\n"
            f"[Attached Document Context: {d_title} ({d_cat}, {d_ver})]\n"
            f"Document Extracted Content:\n{d_text}"
        )

    result = await supervisor.process_user_query(
        message=effective_message,
        language=req.language or "en",
        answered_fields=req.answered_fields,
        history=req.history,
    )

    # Document grounding citation
    if req.doc_context and req.doc_context.get("title"):
        d_title = req.doc_context.get("title")
        d_ver = "Verified" if req.doc_context.get("is_verified") else "Unverified Draft"
        adv = result.get("clinical_advice", "")
        if "Source Reference:" not in adv:
            result["clinical_advice"] = (
                f"{adv}\n\n📎 Grounded Reference: Assessed in the context of your attached document "
                f"\"{d_title}\" ({d_ver}). Review verified dosage and clinical notes with your provider."
            )

    # Personalization: Inject survey-informed allergy checks ONLY when medicine is mentioned (§7 Rule #4 & §1 Rule #6)
    ctx = req.patient_context or {}
    allergies = ctx.get("allergies")
    if allergies:
        if isinstance(allergies, list):
            allergies_str = ", ".join(allergies)
        else:
            allergies_str = str(allergies)

        if allergies_str and allergies_str.lower() not in ["none reported", "none", "no known allergies"]:
            adv = result.get("clinical_advice", "")
            combined_text = (req.message + " " + adv).lower()
            medicine_keywords = ["medicine", "medication", "drug", "pill", "tablet", "aspirin", "nsaid", "ibuprofen", "antibiotic", "prescription", "dose"]
            touches_medicine = any(kw in combined_text for kw in medicine_keywords)

            if touches_medicine and "Allergy Warning" not in adv and "Personalized Safeguard" not in adv:
                result["clinical_advice"] = (
                    f"{adv}\n\n🛡️ Personalized Safeguard: You have noted an allergy to [{allergies_str}]. "
                    f"Ensure any OTC remedy or prescription is verified as allergen-free by your doctor."
                )

    # Record assistant message
    asst_msg = ConversationMessage(
        conversation_id=conv_id,
        role="assistant",
        content=result.get("clinical_advice", ""),
        metadata_json=json.dumps({
            "urgency": result.get("urgency"),
            "matched_symptoms": result.get("matched_symptoms"),
            "mode": result.get("mode"),
        }),
    )
    db.add(asst_msg)

    # Record Audit Log for clinical safety
    client_ip = request.client.host if request.client else "127.0.0.1"
    audit = AuditLog(
        patient_id=patient_id,
        action="CHAT_TRIAGE_QUERY",
        details_json=json.dumps({
            "message_snippet": req.message[:100],
            "urgency": result.get("urgency"),
            "mode": result.get("mode"),
            "red_flags": len(result.get("red_flags", [])),
        }),
        ip_address=client_ip,
    )
    db.add(audit)

    await db.commit()

    raw_fq = result.get("followup_questions", [])
    normalized_fq = [
        {"question": q} if isinstance(q, str) else q
        for q in raw_fq
    ]

    return {
        "conversation_id": conv_id,
        "matched_symptoms": result.get("matched_symptoms", []),
        "urgency": result.get("urgency", "GREEN"),
        "red_flags": result.get("red_flags", []),
        "clinical_advice": result.get("clinical_advice", ""),
        "followup_questions": normalized_fq,
        "articles": result.get("articles", []),
        "disclaimer": result.get("disclaimer", ""),
        "mode": result.get("mode", "offline"),
        "language": result.get("language", req.language or "en"),
    }


@router.get("/conversations")
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(Conversation).where(Conversation.patient_id == patient_id).order_by(Conversation.started_at.desc())
    res = await db.execute(stmt)
    convs = res.scalars().all()
    return [{"id": c.id, "language": c.language, "started_at": str(c.started_at), "mode": c.mode} for c in convs]


@router.get("/conversations/{conv_id}/messages")
async def get_messages(
    conv_id: int,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ConversationMessage).where(ConversationMessage.conversation_id == conv_id).order_by(ConversationMessage.created_at.asc())
    res = await db.execute(stmt)
    messages = res.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": str(m.created_at),
        }
        for m in messages
    ]
