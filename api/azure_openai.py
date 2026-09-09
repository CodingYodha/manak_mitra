"""Azure OpenAI chat-completions client used by all Manak Mitra API paths.

Credentials are deliberately read only from the environment.  Keep keys out of
source code, documentation, browser bundles, and request logs.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Mapping, Optional, Sequence

import httpx

logger = logging.getLogger("manak.azure_openai")

DEFAULT_BASE_URL = "https://azure-ai-truxt-resource.openai.azure.com/openai/v1"
DEFAULT_MODEL = "gpt-5.4-mini"


def chat_completions_url(base_url: Optional[str] = None) -> str:
    """Return the OpenAI-compatible Azure chat-completions URL.

    ``AZURE_OPENAI_BASE_URL`` can be either the ``/openai/v1`` base URL or
    the complete ``/chat/completions`` URL.  A malformed blank value falls
    back to the documented resource endpoint rather than silently disabling
    Azure for answer generation.
    """
    base = (base_url or os.environ.get("AZURE_OPENAI_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
    return base if base.endswith("/chat/completions") else f"{base}/chat/completions"


def _content_from_response(data: Mapping[str, Any]) -> Optional[str]:
    """Extract regular OpenAI-compatible text without assuming a provider SDK."""
    try:
        content = data["choices"][0]["message"].get("content")
    except (KeyError, IndexError, TypeError):
        return None
    if isinstance(content, str):
        return content.strip() or None
    if isinstance(content, list):
        return "".join(
            item.get("text", "") for item in content if isinstance(item, Mapping)
        ).strip() or None
    return None


def complete(
    messages: Sequence[Mapping[str, str]],
    *,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    max_completion_tokens: int = 800,
    base_url: Optional[str] = None,
    timeout: float = 12.0,
    client: Optional[httpx.Client] = None,
) -> Optional[str]:
    """Request Azure's OpenAI-compatible endpoint and return generated text.

    The configured model accepts ``max_completion_tokens``.  Deliberately do
    not send ``temperature`` or the legacy ``max_tokens`` parameter.
    """
    key = api_key or os.environ.get("AZURE_OPENAI_API_KEY")
    if not key:
        return None

    payload = {
        "model": model or os.environ.get("AZURE_OPENAI_MODEL", DEFAULT_MODEL),
        "messages": list(messages),
        "max_completion_tokens": max_completion_tokens,
    }
    request_headers = {"api-key": key, "Content-Type": "application/json"}
    owns_client = client is None
    active_client = client or httpx.Client(timeout=timeout)
    try:
        response = active_client.post(chat_completions_url(base_url), headers=request_headers, json=payload)
        if response.status_code != 200:
            # Do not print response/request headers: they can carry credentials.
            logger.warning("Azure OpenAI request failed with HTTP %s", response.status_code)
            return None
        return _content_from_response(response.json())
    except httpx.HTTPError as error:
        logger.warning("Azure OpenAI request failed: %s", type(error).__name__)
        return None
    finally:
        if owns_client:
            active_client.close()
