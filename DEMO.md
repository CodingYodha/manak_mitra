# DEMO.md — The only spec that matters

## Three demo products (every feature must work for all three)

| # | Product | Scheme | IS Number |
|---|---------|--------|-----------|
| 1 | 9W LED bulb | CRS (mandatory) | IS 16102 (Part 1) |
| 2 | 22K gold ring | Hallmarking / HUID | IS 1417 / IS 2112 |
| 3 | Children plastic toy | ISI (mandatory) | IS 9873 (Part 1) |

## Six beats, in order

1. **Knowledge graph** on screen before we speak
2. **Ask in Hindi by voice:** "क्या मुझे LED बल्ब के लिए BIS चाहिए?"
3. **Generate the Compliance Passport** → PDF on screen
4. **QR on the slide** — a judge messages it from their own phone → cited reply appears
5. **Ask something we cannot know** → system refuses → gives BIS helpline 1800-11-4000
6. **Ministry dashboard** — "here is what this gives you"

## NON-NEGOTIABLE

Beat 5 is the one teams skip. Build the refusal path deliberately and rehearse it.
A system that knows when to stop talking reads as engineering maturity.
Every competing bot will confidently invent an IS number when cornered.

## Freeze checklist

- [ ] manak.db and vectors.npy committed
- [ ] WhatsApp session pre-linked and running the night before
- [ ] Ollama model pulled on the DEMO LAPTOP (not just dev machines)
- [ ] Fallback video recorded of all six beats
- [ ] Six-beat demo rehearsed end to end × 3, including the refusal

## Helpline

BIS Consumer Helpline: **1800-11-4000**
BIS Website: **bis.gov.in**
