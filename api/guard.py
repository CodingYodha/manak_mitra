import re

# Strict regex matching 'IS' followed by 3-5 digits (e.g., IS 16102, IS 1417)
IS_PAT = re.compile(r"IS\s*\d{3,5}", re.I)

# The tuned abstention floor
FLOOR = 0.35

def enforce(text: str, allowed_refs: list[str]) -> str:
    """
    Deletes any IS number the retrieval layer did not explicitly return.
    Prevents the LLM from hallucinating standards.
    """
    # Normalize allowed references (e.g. 'IS 16102 (Part 1)' -> 'IS16102(PART1)')
    ok = {r.replace(" ", "").upper() for r in allowed_refs}
    
    # Find all IS numbers in the generated text
    for m in set(IS_PAT.findall(text)):
        if m.replace(" ", "").upper() not in ok:
            text = text.replace(m, "[removed: unverified]")
            
    return text

def should_abstain(top_score: float) -> bool:
    """
    Returns True if the best matching document scores below the confidence floor.
    """
    return top_score < FLOOR

REFUSAL = (
    "I can't answer this from official sources. "
    "Please contact the BIS helpline on 1800-11-4000, or see bis.gov.in."
)
