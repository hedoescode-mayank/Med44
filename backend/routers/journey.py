"""
Care Journey & Interactive Flowcharts Router for Med44 (PS3 Modules 9, 10, 13).
Supports educational pathway templates, dynamic node trees, conditional branches,
preparation checklists, and bilingual educational explanations.
"""
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import (
    CareJourneyTemplate,
    CareJourneyNode,
    PatientJourneyProgress,
    Patient,
)
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/journey", tags=["journey"])


class SelectTemplateRequest(BaseModel):
    template_id: str


class ToggleNodeRequest(BaseModel):
    node_id: str
    completed: bool


class ToggleChecklistRequest(BaseModel):
    checklist_id: str
    completed: bool


class BranchSelectRequest(BaseModel):
    node_id: str
    selected_condition: str


@router.get("/templates")
async def get_templates(
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CareJourneyTemplate).where(CareJourneyTemplate.is_active == True)
    res = await db.execute(stmt)
    templates = res.scalars().all()

    return [
        {
            "id": t.id,
            "title": t.title,
            "title_hi": t.title_hi,
            "category": t.category,
            "description": t.description,
            "description_hi": t.description_hi,
            "total_stages": t.total_stages,
        }
        for t in templates
    ]


@router.get("/templates/{id}")
async def get_template_flowchart(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CareJourneyTemplate).where(CareJourneyTemplate.id == id)
    template = (await db.execute(stmt)).scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Journey template not found")

    stmt_nodes = (
        select(CareJourneyNode)
        .where(CareJourneyNode.template_id == id)
        .order_by(CareJourneyNode.step_number.asc())
    )
    nodes = (await db.execute(stmt_nodes)).scalars().all()

    formatted_nodes = []
    for n in nodes:
        branches = []
        if n.conditional_branches_json:
            try:
                branches = json.loads(n.conditional_branches_json)
            except Exception:
                pass

        formatted_nodes.append({
            "id": n.id,
            "step_number": n.step_number,
            "node_type": n.node_type,
            "title": n.title,
            "title_hi": n.title_hi,
            "explanation": n.explanation,
            "explanation_hi": n.explanation_hi,
            "what_to_bring": json.loads(n.what_to_bring_json) if n.what_to_bring_json else [],
            "questions_to_ask": json.loads(n.questions_to_ask_json) if n.questions_to_ask_json else [],
            "what_to_record": json.loads(n.what_to_record_json) if n.what_to_record_json else [],
            "required_documents": json.loads(n.required_documents_json) if n.required_documents_json else [],
            "conditional_branches": branches,
        })

    return {
        "id": template.id,
        "title": template.title,
        "title_hi": template.title_hi,
        "category": template.category,
        "description": template.description,
        "description_hi": template.description_hi,
        "nodes": formatted_nodes,
        "total_nodes": len(formatted_nodes),
    }


@router.get("/my-progress")
async def get_patient_journey_progress(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(PatientJourneyProgress).where(PatientJourneyProgress.patient_id == patient_id)
    progress = (await db.execute(stmt)).scalar_one_or_none()

    if not progress:
        # Default initialize to dental_care
        progress = PatientJourneyProgress(
            patient_id=patient_id,
            template_id="dental_care",
            current_node_id="dental_node_3",
            completed_node_ids_json=json.dumps(["dental_node_1", "dental_node_2"]),
            preparation_checklist_json=json.dumps([
                {"id": "prep_1", "text": "Organize previous dental notes", "completed": True},
                {"id": "prep_2", "text": "List any current pain medications", "completed": True},
                {"id": "prep_3", "text": "Check photo ID and clinic address", "completed": False},
            ]),
            selected_branches_json=json.dumps({}),
            status="ACTIVE",
        )
        db.add(progress)
        await db.commit()
        await db.refresh(progress)

    completed_ids = json.loads(progress.completed_node_ids_json) if progress.completed_node_ids_json else []
    checklist = json.loads(progress.preparation_checklist_json) if progress.preparation_checklist_json else []
    branches = json.loads(progress.selected_branches_json) if progress.selected_branches_json else {}

    return {
        "id": progress.id,
        "template_id": progress.template_id,
        "current_node_id": progress.current_node_id,
        "completed_node_ids": completed_ids,
        "preparation_checklist": checklist,
        "selected_branches": branches,
        "status": progress.status,
    }


@router.post("/select-template")
async def switch_journey_template(
    req: SelectTemplateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(PatientJourneyProgress).where(PatientJourneyProgress.patient_id == patient_id)
    progress = (await db.execute(stmt)).scalar_one_or_none()

    # Get first node of new template
    stmt_node = (
        select(CareJourneyNode)
        .where(CareJourneyNode.template_id == req.template_id)
        .order_by(CareJourneyNode.step_number.asc())
    )
    first_node = (await db.execute(stmt_node)).scalars().first()
    start_node_id = first_node.id if first_node else None

    # Default checklist
    default_checklist = [
        {"id": "p_1", "text": "Gather ID and existing records", "completed": False},
        {"id": "p_2", "text": "Note down symptom history and duration", "completed": False},
        {"id": "p_3", "text": "Confirm clinic directions and contact number", "completed": False},
    ]

    if not progress:
        progress = PatientJourneyProgress(
            patient_id=patient_id,
            template_id=req.template_id,
            current_node_id=start_node_id,
            completed_node_ids_json=json.dumps([]),
            preparation_checklist_json=json.dumps(default_checklist),
            selected_branches_json=json.dumps({}),
            status="ACTIVE",
        )
        db.add(progress)
    else:
        progress.template_id = req.template_id
        progress.current_node_id = start_node_id
        progress.completed_node_ids_json = json.dumps([])
        progress.preparation_checklist_json = json.dumps(default_checklist)
        progress.selected_branches_json = json.dumps({})

    await db.commit()

    return {"status": "success", "template_id": req.template_id, "current_node_id": start_node_id}


@router.post("/toggle-node")
async def toggle_node_completion(
    req: ToggleNodeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(PatientJourneyProgress).where(PatientJourneyProgress.patient_id == patient_id)
    progress = (await db.execute(stmt)).scalar_one_or_none()

    if not progress:
        raise HTTPException(status_code=404, detail="Journey progress record not found")

    completed_ids = set(json.loads(progress.completed_node_ids_json) if progress.completed_node_ids_json else [])

    if req.completed:
        completed_ids.add(req.node_id)
    else:
        completed_ids.discard(req.node_id)

    progress.completed_node_ids_json = json.dumps(list(completed_ids))
    progress.current_node_id = req.node_id
    await db.commit()

    return {
        "status": "success",
        "completed_node_ids": list(completed_ids),
        "current_node_id": req.node_id,
    }


@router.post("/toggle-checklist")
async def toggle_checklist_item(
    req: ToggleChecklistRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(PatientJourneyProgress).where(PatientJourneyProgress.patient_id == patient_id)
    progress = (await db.execute(stmt)).scalar_one_or_none()

    if not progress:
        raise HTTPException(status_code=404, detail="Journey progress record not found")

    checklist = json.loads(progress.preparation_checklist_json) if progress.preparation_checklist_json else []
    for item in checklist:
        if item["id"] == req.checklist_id:
            item["completed"] = req.completed
            break

    progress.preparation_checklist_json = json.dumps(checklist)
    await db.commit()

    return {"status": "success", "preparation_checklist": checklist}


@router.post("/select-branch")
async def select_conditional_branch(
    req: BranchSelectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(PatientJourneyProgress).where(PatientJourneyProgress.patient_id == patient_id)
    progress = (await db.execute(stmt)).scalar_one_or_none()

    if not progress:
        raise HTTPException(status_code=404, detail="Journey progress record not found")

    branches = json.loads(progress.selected_branches_json) if progress.selected_branches_json else {}
    branches[req.node_id] = req.selected_condition
    progress.selected_branches_json = json.dumps(branches)
    await db.commit()

    return {"status": "success", "selected_branches": branches}
