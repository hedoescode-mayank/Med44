"""
Groq API client with retry, timeout, and rate-limit handling.
Falls back gracefully if unavailable.
"""
import asyncio
import logging
from typing import Optional

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)


class GroqClient:
    """
    Async Groq API client.
    If GROQ_API_KEY is not set, all calls return None (offline mode).
    """

    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self.base_url = "https://api.groq.com/openai/v1"
        self.timeout = 30.0
        self.max_retries = 3

    @property
    def is_available(self) -> bool:
        import os
        return bool(self.api_key or os.getenv("GROQ_API_KEY"))

    @property
    def active_key(self) -> str:
        import os
        return self.api_key or os.getenv("GROQ_API_KEY", "")

    async def chat(
        self,
        messages: list,
        temperature: float = 0.3,
        max_tokens: int = 1024,
        **kwargs,
    ) -> Optional[dict]:
        """
        Send a chat completion request to Groq.
        Returns the full response dict or None on failure.
        """
        if not self.is_available:
            logger.info("Groq client: no API key configured - returning None (offline mode)")
            return None

        key = self.active_key
        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": self.model,
                            "messages": messages,
                            "temperature": temperature,
                            "max_tokens": max_tokens,
                            **kwargs,
                        },
                    )

                    if response.status_code == 429:
                        wait_time = 2 ** attempt
                        logger.warning(
                            "Groq rate limit hit (attempt %d). Retrying in %ds...",
                            attempt + 1, wait_time,
                        )
                        await asyncio.sleep(wait_time)
                        continue

                    if response.status_code == 401:
                        logger.error("Groq API authentication failed. Check GROQ_API_KEY.")
                        return None

                    response.raise_for_status()
                    return response.json()

            except httpx.TimeoutException:
                logger.warning("Groq API timeout (attempt %d/%d)", attempt + 1, self.max_retries)
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(1)
            except httpx.HTTPStatusError as e:
                logger.error("Groq HTTP error: %s", e)
                return None
            except Exception as e:
                logger.error("Groq unexpected error: %s", e)
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(1)

        logger.error("Groq API failed after %d attempts", self.max_retries)
        return None

    def extract_text(self, response: Optional[dict]) -> Optional[str]:
        """Extract the assistant's text from a Groq response."""
        if not response:
            return None
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            logger.error("Failed to extract text from Groq response: %s", response)
            return None

    async def chat_text(self, messages: list, **kwargs) -> Optional[str]:
        """Convenience method - returns just the text content."""
        response = await self.chat(messages, **kwargs)
        return self.extract_text(response)


# Singleton instance
groq_client = GroqClient()

