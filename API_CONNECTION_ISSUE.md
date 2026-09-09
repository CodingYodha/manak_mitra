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
The initial key had a character mismatch in the middle (`...RQQJjkj99...` vs `...RuM0JQQJ99...`):
* ❌ **Old key:** `125Zw5Sms8k9QumCkXpSPJpQjbx9g6n1RzbEuNDFBrJDdWNeRQQJjkj99CDACHYHv6XJ3w3AAAAACOG3qIe`
* ✅ **Working key:** `125Zw5Sms8k9QumCkXpSPJpQjbx9g6n1RzbEuNDFBrJDdWNeRuM0JQQJ99CDACHYHv6XJ3w3AAAAACOG3qIe`

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
  - `api-key`: `125Zw5Sms8k9QumCkXpSPJpQjbx9g6n1RzbEuNDFBrJDdWNeRuM0JQQJ99CDACHYHv6XJ3w3AAAAACOG3qIe`
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
This payload has been verified live and returns `HTTP 200 OK`.
