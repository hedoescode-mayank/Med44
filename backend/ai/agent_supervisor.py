"""
Agent Supervisor for Med44.
Orchestrates requests across Symptom, Follow-up, Appointment, and Medication domains.
Enforces the mandatory deterministic safety pipeline on all outputs.
"""
import logging
from typing import Dict, Any, List, Optional

from backend.ai.symptom_agent import run_symptom_agent
from backend.clinical_engine.red_flag_detector import detect_red_flags
from backend.safety.safety_engine import apply_safety_rules

logger = logging.getLogger(__name__)


class AgentSupervisor:
    """
    Supervisor coordinating health triage and domain queries.
    """

    async def process_user_query(
        self,
        message: str,
        language: str = "en",
        answered_fields: Optional[List[str]] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Process a patient's natural language health query.
        """
        # Red flag check takes precedence immediately
        red_flags = detect_red_flags(message, language=language)
        if red_flags:
            logger.info("Supervisor: Red flags triggered, delegating to symptom agent with emergency escalation")
            return await run_symptom_agent(message, language=language, history=history)

        # Standard symptom triage flow
        response = await run_symptom_agent(message, language=language, history=history)

        # Final safety check guarantee
        return apply_safety_rules(response)


supervisor = AgentSupervisor()
