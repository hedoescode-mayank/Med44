"""
Symptom agent node for Med44.
Coordinates symptom analysis using Groq LLM or deterministic fallback.
"""
import json
import logging
from typing import Dict, Any, List

from backend.ai.groq_client import groq_client
from backend.ai.prompt_templates import SYMPTOM_EVALUATOR_SYSTEM_PROMPT
from backend.clinical_engine.response_builder import build_offline_response
from backend.clinical_engine.red_flag_detector import detect_red_flags
from backend.safety.safety_engine import apply_safety_rules

logger = logging.getLogger(__name__)


async def run_symptom_agent(message: str, language: str = "en", history: List[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    Evaluates patient symptoms.
    1. Runs deterministic red-flag check first.
    2. If Groq is available, calls Groq LLM with safety system prompt.
    3. If Groq unavailable/fails or red flags are detected, falls back to deterministic clinical engine.
    4. Passes output through the shared safety engine.
    """
    # 1. Deterministic red flag check
    red_flags = detect_red_flags(message, language=language)
    if red_flags:
        logger.warning(f"Red flag detected in input: {red_flags}")
        offline_res = build_offline_response(message)
        return apply_safety_rules(offline_res)

    # 2. Online path via Groq if available
    if groq_client.is_available:
        try:
            messages = [
                {"role": "system", "content": SYMPTOM_EVALUATOR_SYSTEM_PROMPT},
            ]
            if history:
                messages.extend(history[-4:])  # recent context
            messages.append({"role": "user", "content": f"Language: {language}\nPatient message: {message}"})

            chat_res = await groq_client.chat(messages, temperature=0.2)
            if chat_res and "choices" in chat_res and len(chat_res["choices"]) > 0:
                raw_content = chat_res["choices"][0]["message"]["content"]
                # Try parsing JSON from LLM
                try:
                    # Clean markdown codeblocks if present
                    clean_content = raw_content.strip()
                    if clean_content.startswith("```json"):
                        clean_content = clean_content[7:]
                    if clean_content.startswith("```"):
                        clean_content = clean_content[3:]
                    if clean_content.endswith("```"):
                        clean_content = clean_content[:-3]
                    parsed = json.loads(clean_content.strip())
                    parsed["mode"] = "online"
                    return apply_safety_rules(parsed)
                except Exception as parse_err:
                    logger.warning(f"Failed to parse Groq JSON response: {parse_err}. Raw: {raw_content[:100]}")
                    # Use LLM advice wrapped into structured format
                    res = {
                        "matched_symptoms": [],
                        "language": language,
                        "urgency": "YELLOW",
                        "red_flags": [],
                        "clinical_advice": raw_content,
                        "followup_questions": [],
                        "mode": "online",
                    }
                    return apply_safety_rules(res)
        except Exception as e:
            logger.error(f"Error calling Groq symptom agent: {e}. Falling back to offline engine.")

    # 3. Deterministic offline clinical engine fallback
    offline_res = build_offline_response(message)
    return apply_safety_rules(offline_res)
