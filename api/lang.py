"""
Manak Mitra — Language & Vernacular Interface
Owner: Miya (Track: Language & Routing)

Integrates the government Bhashini ULCA translation API.
Includes a failsafe fallback: if Bhashini credentials are unset or the network
is unreachable, it safely returns the original text without throwing an error.
"""
import os
import logging
from typing import Optional

logger = logging.getLogger("manak.lang")

# Environment variables for Bhashini ULCA API
BHASHINI_USER_ID = os.environ.get("BHASHINI_USER_ID", "")
BHASHINI_API_KEY = os.environ.get("BHASHINI_API_KEY", "")
BHASHINI_PIPELINE_ID = os.environ.get("BHASHINI_PIPELINE_ID", "")

# Cache discovered service IDs per language pair to avoid redundant discovery calls
_SERVICE_ID_CACHE: dict[str, str] = {}


def _get_service_id(src: str, tgt: str) -> Optional[str]:
    """
    Queries Bhashini getModelsPipeline to discover the serviceId for a given language pair.
    Results are cached in memory.
    """
    cache_key = f"{src}->{tgt}"
    if cache_key in _SERVICE_ID_CACHE:
        return _SERVICE_ID_CACHE[cache_key]

    if not (BHASHINI_USER_ID and BHASHINI_API_KEY and BHASHINI_PIPELINE_ID):
        return None

    try:
        import httpx
        url = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
        headers = {
            "userID": BHASHINI_USER_ID,
            "ulcaApiKey": BHASHINI_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": src,
                            "targetLanguage": tgt
                        }
                    }
                }
            ],
            "pipelineRequestConfig": {
                "pipelineId": BHASHINI_PIPELINE_ID
            }
        }
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                service_id = data["pipelineResponseConfig"][0]["config"][0]["serviceId"]
                _SERVICE_ID_CACHE[cache_key] = service_id
                return service_id
            else:
                logger.warning(f"Bhashini pipeline discovery returned HTTP {resp.status_code}")
    except Exception as e:
        logger.warning(f"Bhashini pipeline discovery failed: {e}")

    return None


def translate(text: str, src: str = "hi", tgt: str = "en") -> str:
    """
    Translates text between languages (e.g. Hindi <-> English).
    
    If Bhashini credentials are unavailable, or if the API call fails or times out,
    this function returns the input text as a graceful fallback.
    """
    if not text or not text.strip() or src == tgt:
        return text

    if not BHASHINI_API_KEY:
        # Fallback: Pass-through (multilingual embeddings in search.py handle Hindi natively)
        return text

    service_id = _get_service_id(src, tgt)
    if not service_id:
        return text

    try:
        import httpx
        compute_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        headers = {
            "Authorization": BHASHINI_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": src,
                            "targetLanguage": tgt
                        },
                        "serviceId": service_id
                    }
                }
            ],
            "inputData": {
                "input": [{"source": text}]
            }
        }
        with httpx.Client(timeout=6.0) as client:
            resp = client.post(compute_url, headers=headers, json=payload)
            if resp.status_code == 200:
                result = resp.json()
                target_text = result["pipelineResponse"][0]["output"][0]["target"]
                return target_text
    except Exception as e:
        logger.warning(f"Bhashini translation compute failed: {e}. Falling back to source text.")

    return text


def is_hindi(text: str) -> bool:
    """
    Detects if a string contains Devanagari script characters.
    Devanagari Unicode block: U+0900 to U+097F.
    """
    return any(0x0900 <= ord(char) <= 0x097F for char in text)


if __name__ == "__main__":
    test_hi = "क्या मुझे एलईडी बल्ब के लिए बीआईएस चाहिए?"
    print(f"Testing is_hindi: {is_hindi(test_hi)} (Expected: True)")
    print(f"Testing fallback translate: {translate(test_hi, 'hi', 'en')}")
    print("api/lang.py self-test passed!")
