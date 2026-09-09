"""Offline contract test for the Azure OpenAI request shape.

No key or network connection is needed. Run with:
    python scripts/test_azure_openai.py
"""
import json
import pathlib
import sys

import httpx

ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from api import azure_openai


def handler(request: httpx.Request) -> httpx.Response:
    assert request.url == httpx.URL(
        "https://azure-ai-truxt-resource.openai.azure.com/openai/v1/chat/completions"
    )
    assert request.headers["api-key"] == "test-key"
    assert "authorization" not in request.headers
    payload = json.loads(request.content)
    assert payload["model"] == "gpt-5.4-mini"
    assert payload["max_completion_tokens"] == 800
    assert "max_tokens" not in payload
    assert "temperature" not in payload
    return httpx.Response(200, json={"choices": [{"message": {"content": "grounded answer"}}]})


with httpx.Client(transport=httpx.MockTransport(handler)) as client:
    answer = azure_openai.complete(
        [{"role": "user", "content": "Is BIS mandatory for an LED bulb?"}],
        api_key="test-key",
        client=client,
    )

assert answer == "grounded answer"
assert azure_openai.chat_completions_url("https://example.openai.azure.com/openai/v1/").endswith(
    "/openai/v1/chat/completions"
)
print("Azure OpenAI request contract passed.")
