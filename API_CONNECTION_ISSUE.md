# Azure OpenAI API Connection & Configuration Notes

This document summarizes the issues encountered when connecting to Azure OpenAI and the verified solution.

---

## 1. Issue 1: HTTP 401 Unauthorized (API Key Typo)

### Symptoms
Calling `https://azure-ai-truxt-resource.openai.azure.com/openai/v1/chat/completions` returned:
```json
{
  "error": {
    "code": "401",
    "message": "Access denied due to invalid subscription key or wrong API endpoint. Make sure to provide a valid key for an active subscription and use a correct regional API endpoint."
  }
}
```

### Cause
The subscription key was copied incorrectly. Keys must never be committed to
source control or pasted into troubleshooting notes. Rotate the exposed key in
Azure before continuing.

---

## 2. Issue 2: HTTP 400 Bad Request (`max_tokens` vs `max_completion_tokens`)

### Symptoms
When passing standard OpenAI parameters to `gpt-5.4-mini`:
```json
{
  "model": "gpt-5.4-mini",
  "messages": [{"role": "user", "content": "hi"}],
  "max_tokens": 800,
  "temperature": 0.1
}
```
Azure returned:
```json
{
  "error": {
    "message": "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.",
    "type": "invalid_request_error",
    "param": "max_tokens",
    "code": "unsupported_parameter"
  }
}
```

### Cause
`gpt-5.4-mini` is an advanced reasoning/o-series family model on Azure. It requires:
1. `max_completion_tokens` instead of `max_tokens`.
2. Omission of custom `temperature` (or default temperature = 1).

---

## 3. Working Request Payload & Configuration

### Endpoint
* **URL:** `https://azure-ai-truxt-resource.openai.azure.com/openai/v1/chat/completions`
* **Model:** `gpt-5.4-mini`
* **Headers:**
  - `api-key`: value of `AZURE_OPENAI_API_KEY` from the deployment environment
  - `Content-Type`: `application/json`

### Valid Payload Example
```json
{
  "model": "gpt-5.4-mini",
  "messages": [
    { "role": "system", "content": "You are Manak Mitra, official BIS compliance assistant." },
    { "role": "user", "content": "Is BIS certification mandatory for 9W LED bulb?" }
  ],
  "max_completion_tokens": 800
}
```
Set the following values only in an ignored `.env` file or your deployment's
secret manager:

```dotenv
AZURE_OPENAI_API_KEY=<rotated-key>
AZURE_OPENAI_BASE_URL=https://azure-ai-truxt-resource.openai.azure.com/openai/v1
AZURE_OPENAI_MODEL=gpt-5.4-mini
```

The application now uses the `api-key` header, `max_completion_tokens`, and no
custom temperature for this model. The request is covered by an offline mock
test; a real connection requires a newly rotated key.
