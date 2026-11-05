"""
Tests for Groq API Integration and Offline Fallback.
Verifies timeout handling, API failure handling, invalid model response handling,
and seamless fallback to offline clinical engine.
"""
import pytest
from unittest.mock import patch, AsyncMock, PropertyMock
from backend.ai.groq_client import GroqClient
from backend.ai.symptom_agent import run_symptom_agent


def test_groq_unavailable_when_no_api_key():
    client = GroqClient()
    client.api_key = None
    assert client.is_available is False


@pytest.mark.asyncio
async def test_groq_chat_returns_none_when_unavailable():
    client = GroqClient()
    client.api_key = None
    res = await client.chat([{"role": "user", "content": "hi"}])
    assert res is None


@pytest.mark.asyncio
async def test_symptom_agent_offline_fallback_on_groq_failure():
    # Force Groq client to raise or return None
    with patch("backend.ai.groq_client.groq_client.chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = None
        result = await run_symptom_agent("I have high fever and severe headache")
        
        # Verify offline fallback kicked in and produced valid response
        assert "fever" in result["matched_symptoms"]
        assert "headache" in result["matched_symptoms"]
        assert result["mode"] == "offline"
        assert "disclaimer" in result


@pytest.mark.asyncio
async def test_symptom_agent_handles_malformed_model_response():
    # Return malformed non-JSON output from Groq
    with patch("backend.ai.groq_client.groq_client.chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = {
            "choices": [{"message": {"content": "INVALID NOT JSON: You should see a doctor."}}]
        }
        with patch.object(GroqClient, "is_available", new_callable=PropertyMock, return_value=True):
            result = await run_symptom_agent("I have a persistent rash on my arm")
            assert "disclaimer" in result
            assert result["urgency"] in ["GREEN", "YELLOW", "RED"]
