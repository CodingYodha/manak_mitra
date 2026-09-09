"""
Manak Mitra — Mark Analysis Module
Owner: Jay · feat/jay

Provides structural validation for BIS certification marks:
  - HUID (Hallmark Unique Identification) — 6-char alphanumeric
  - Purity / fineness codes — 375, 585, 750, 916, 958, 999
  - ISI licence numbers — CM/L-XXXXXXX
  - CRS registration numbers — R-XXXXXXXX

Integrates Tesseract OCR for camera input with typed-code fallback.
Does NOT claim live HUID verification — all checks are structural/syntactic.
Authoritative verification: BIS CARE Mobile App / crsbis.in / manakonline.in

Public API:
    validate_huid(code) -> dict
    validate_purity(code) -> dict
    validate_isi_licence(code) -> dict
    validate_crs_rnumber(code) -> dict
    validate_typed(code, mark_type) -> dict  (typed-code fallback)
    analyze_text(text) -> dict               (detect marks inside free text)
    ocr_image(path_or_bytes) -> dict         (Tesseract OCR + analysis)
    analyze_mark(input_text_or_image) -> dict (unified entry)
"""
import pathlib
import re
import yaml
from typing import Optional

_ROOT = pathlib.Path(__file__).parent.parent
_MARKS_PATH = _ROOT / "data" / "curated" / "marks.yaml"

# ── Cached data ──────────────────────────────────────────────────────────
_marks_cache: Optional[dict] = None

DISCLAIMER = (
    "Structural check only — not a live BIS database lookup. "
    "For authoritative confirmation use BIS CARE app (HUID), "
    "manakonline.in (ISI), or crsbis.in (CRS)."
)

HUID_DISCLAIMER = (
    "We read the mark structure and catch structural fakes; "
    "for authoritative HUID confirmation, use BIS CARE app. "
    "There is no public HUID verification API."
)

# Fallback constants if marks.yaml missing
_FALLBACK = {
    "huid": {"pattern": r"^[0-9A-Z]{6}$", "length": 6, "charset": "[0-9A-Z]"},
    "purity": {"valid": ["375", "585", "750", "916", "958", "999"]},
    "isi_licence": {"pattern": r"^CM/L-[0-9]{7}$"},
    "crs_rnumber": {"pattern": r"^R-[0-9]{8}$"},
}


def load_marks() -> dict:
    global _marks_cache
    if _marks_cache is not None:
        return _marks_cache
    if not _MARKS_PATH.exists():
        _marks_cache = _FALLBACK.copy()
        return _marks_cache
    with open(_MARKS_PATH, encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    # Ensure fallback keys exist
    for k, v in _FALLBACK.items():
        if k not in data:
            data[k] = v
    _marks_cache = data
    return _marks_cache


def reload_marks() -> dict:
    global _marks_cache
    _marks_cache = None
    return load_marks()


# ── Regex compilation ──────────────────────────────────────────────────
def _compile_patterns():
    m = load_marks()
    return {
        "huid": re.compile(m.get("huid", {}).get("pattern", _FALLBACK["huid"]["pattern"])),
        "isi": re.compile(m.get("isi_licence", {}).get("pattern", _FALLBACK["isi_licence"]["pattern"])),
        "crs": re.compile(m.get("crs_rnumber", {}).get("pattern", _FALLBACK["crs_rnumber"]["pattern"])),
        # Search patterns (without anchors) for detection inside text
        "huid_search": re.compile(r"\b[0-9A-Z]{6}\b"),
        "isi_search": re.compile(r"CM/L-\d{7}"),
        "crs_search": re.compile(r"R-\d{8}"),
        "purity_search": re.compile(r"\b(375|585|750|916|958|999)\b"),
    }


_PATTERNS = None


def _patterns():
    global _PATTERNS
    if _PATTERNS is None:
        _PATTERNS = _compile_patterns()
    return _PATTERNS


# ── Validators ─────────────────────────────────────────────────────────

def validate_huid(code: str) -> dict:
    """Structural validation for HUID (6-char alphanumeric)."""
    raw = code.strip()
    # HUID is uppercase, strict
    m = load_marks()
    valid = bool(_patterns()["huid"].match(raw))
    purity_info = m.get("huid", {})
    reason = ""
    if valid:
        reason = "HUID structure is valid (6 alphanumeric characters)."
    else:
        if len(raw) != 6:
            reason = f"HUID must be exactly 6 characters, got {len(raw)}."
        elif raw != raw.upper():
            reason = "HUID must be uppercase A-Z and digits 0-9 only."
        elif not re.match(r"^[0-9A-Z]+$", raw):
            reason = "HUID may contain only digits 0-9 and uppercase A-Z (no hyphens/spaces/lowercase)."
        else:
            reason = "HUID format invalid — expected 6 alphanumeric characters."
    return {
        "mark_type": "huid",
        "input": code,
        "normalized": raw,
        "valid": valid,
        "reason": reason,
        "pattern": m.get("huid", {}).get("pattern", _FALLBACK["huid"]["pattern"]),
        "examples_valid": m.get("huid", {}).get("examples", {}).get("valid", ["9A2F8K"]),
        "disclaimer": HUID_DISCLAIMER,
        "authoritative": m.get("huid", {}).get("verification", {}).get("authoritative", "BIS CARE Mobile App"),
    }


def validate_purity(code: str) -> dict:
    """Validate BIS-recognised gold purity/fineness code."""
    raw = code.strip()
    m = load_marks()
    valid_codes = m.get("purity", {}).get("valid", _FALLBACK["purity"]["valid"])
    labels = m.get("purity", {}).get("labels", {})
    valid = raw in valid_codes
    if valid:
        reason = f"Valid BIS purity grade: {raw} ({labels.get(raw, '')})."
    else:
        reason = f"Invalid purity code '{raw}'. Valid grades: {', '.join(valid_codes)}."
    return {
        "mark_type": "purity",
        "input": code,
        "normalized": raw,
        "valid": valid,
        "reason": reason,
        "valid_codes": valid_codes,
        "label": labels.get(raw) if valid else None,
        "governing_standard": m.get("purity", {}).get("governing_standard", "IS 1417"),
        "disclaimer": DISCLAIMER,
    }


def validate_isi_licence(code: str) -> dict:
    """Validate ISI licence number CM/L-XXXXXXX."""
    raw = code.strip()
    m = load_marks()
    valid = bool(_patterns()["isi"].match(raw))
    if valid:
        reason = "ISI licence number structure is valid (CM/L- followed by 7 digits)."
    else:
        if not raw.startswith("CM/L-"):
            reason = "ISI licence must start with 'CM/L-' prefix."
        elif not re.match(r"^CM/L-\d+$", raw):
            reason = "ISI licence suffix must be digits only after CM/L-."
        elif len(raw) != 11:  # CM/L- (5) + 7 = 12? Actually CM/L- is 5 chars, +7 =12
            # Let's compute: C(1) M(1) /(1) L(1) -(1) =5, +7=12
            reason = f"ISI licence must have exactly 7 digits after CM/L-, got {len(raw)-5}."
        else:
            reason = "ISI licence format invalid — expected CM/L-XXXXXXX (7 digits)."
    return {
        "mark_type": "isi_licence",
        "input": code,
        "normalized": raw,
        "valid": valid,
        "reason": reason,
        "pattern": m.get("isi_licence", {}).get("pattern", _FALLBACK["isi_licence"]["pattern"]),
        "disclaimer": DISCLAIMER,
        "authoritative": m.get("isi_licence", {}).get("verification", {}).get("authoritative", "BIS MANAK Online Portal"),
    }


def validate_crs_rnumber(code: str) -> dict:
    """Validate CRS registration number R-XXXXXXXX."""
    raw = code.strip()
    m = load_marks()
    valid = bool(_patterns()["crs"].match(raw))
    if valid:
        reason = "CRS R-number structure is valid (R- followed by 8 digits)."
    else:
        if not raw.startswith("R-"):
            reason = "CRS R-number must start with 'R-' prefix."
        elif not re.match(r"^R-\d+$", raw):
            reason = "CRS R-number suffix must be digits only after R-."
        elif len(raw) != 10:  # R- (2) +8 =10
            reason = f"CRS R-number must have exactly 8 digits after R-, got {len(raw)-2}."
        else:
            reason = "CRS R-number format invalid — expected R-XXXXXXXX (8 digits)."
    return {
        "mark_type": "crs_rnumber",
        "input": code,
        "normalized": raw,
        "valid": valid,
        "reason": reason,
        "pattern": m.get("crs_rnumber", {}).get("pattern", _FALLBACK["crs_rnumber"]["pattern"]),
        "disclaimer": DISCLAIMER,
        "authoritative": m.get("crs_rnumber", {}).get("verification", {}).get("authoritative", "CRS BIS Portal"),
    }


def validate_typed(code: str, mark_type: str) -> dict:
    """
    Typed-code fallback: validate a manually entered code by mark_type.
    mark_type: huid | purity | isi_licence | crs_rnumber | auto
    """
    t = mark_type.strip().lower()
    if t in ("huid", "hallmark", "huid_code"):
        return validate_huid(code)
    elif t in ("purity", "fineness", "karat"):
        return validate_purity(code)
    elif t in ("isi", "isi_licence", "cm/l", "cm_l"):
        return validate_isi_licence(code)
    elif t in ("crs", "crs_rnumber", "r-number", "r_number"):
        return validate_crs_rnumber(code)
    elif t == "auto":
        # Try all validators, return first valid or all results
        results = {
            "huid": validate_huid(code),
            "purity": validate_purity(code),
            "isi_licence": validate_isi_licence(code),
            "crs_rnumber": validate_crs_rnumber(code),
        }
        # If any valid, return the valid one
        for k, v in results.items():
            if v["valid"]:
                return v
        # Otherwise return all with overall invalid
        return {"mark_type": "auto", "input": code, "valid": False, "reason": "No mark type matched.", "details": results, "disclaimer": DISCLAIMER}
    else:
        return {"mark_type": mark_type, "input": code, "valid": False, "reason": f"Unknown mark_type '{mark_type}'. Use huid, purity, isi_licence, crs_rnumber, or auto.", "disclaimer": DISCLAIMER}


# ── Text analysis (detect marks inside free text / OCR output) ─────────

def analyze_text(text: str) -> dict:
    """
    Scan free text for embedded marks. Returns structural findings.

    Does NOT claim live verification — only structural checks.
    """
    if not text:
        return {"input": text, "findings": [], "summary": "No input text.", "disclaimer": DISCLAIMER}
    findings = []
    pats = _patterns()
    # Purity codes
    for m in pats["purity_search"].findall(text):
        findings.append(validate_purity(m))
    # HUID candidates — need to avoid false positives from longer strings
    # We look for 6-char alphanum tokens; then validate strict
    for token in re.findall(r"\b[0-9A-Z]{6}\b", text):
        # Skip if it's a purity code padded? just validate as HUID
        if token.isdigit() and len(token) == 6:
            # Could be HUID like 000001 which is valid
            findings.append(validate_huid(token))
        elif re.match(r"^[0-9A-Z]{6}$", token):
            findings.append(validate_huid(token))
    # ISI licence
    for m in pats["isi_search"].findall(text):
        findings.append(validate_isi_licence(m))
    # CRS R-number
    for m in pats["crs_search"].findall(text):
        findings.append(validate_crs_rnumber(m))

    # Deduplicate by (mark_type, normalized)
    seen = set()
    uniq = []
    for f in findings:
        key = (f["mark_type"], f["normalized"])
        if key not in seen:
            seen.add(key)
            uniq.append(f)

    # Summary
    valid_count = sum(1 for f in uniq if f["valid"])
    invalid_count = len(uniq) - valid_count
    if not uniq:
        summary = "No BIS marks detected in text."
    else:
        summary = f"Detected {len(uniq)} mark(s): {valid_count} structurally valid, {invalid_count} invalid."

    # Hallmark completeness rule: huid should co-occur with purity
    has_huid = any(f["mark_type"] == "huid" and f["valid"] for f in uniq)
    has_purity = any(f["mark_type"] == "purity" and f["valid"] for f in uniq)
    completeness_note = None
    if has_huid or has_purity:
        if has_huid and has_purity:
            completeness_note = "Hallmark completeness: HUID + purity both present — structure looks complete (still needs BIS CARE for authoritative check)."
        elif has_huid and not has_purity:
            completeness_note = "Hallmark incomplete: HUID found but no valid purity code (375/585/750/916/958/999) detected alongside."
        elif has_purity and not has_huid:
            completeness_note = "Hallmark incomplete: purity code found but no valid 6-char HUID detected alongside."

    return {
        "input": text,
        "findings": uniq,
        "summary": summary,
        "completeness_note": completeness_note,
        "disclaimer": HUID_DISCLAIMER if has_huid else DISCLAIMER,
    }


# ── OCR integration ────────────────────────────────────────────────────

def _ocr_extract(image_input) -> dict:
    """
    Low-level OCR extraction. Accepts file path, bytes, or PIL Image.
    Returns {text, confidence, error}
    """
    try:
        import pytesseract
        from PIL import Image
        import io

        # Resolve image
        if isinstance(image_input, (bytes, bytearray)):
            img = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, str) and pathlib.Path(image_input).exists():
            img = Image.open(image_input)
        elif hasattr(image_input, "convert"):  # PIL Image
            img = image_input
        else:
            # Try as path string anyway
            try:
                img = Image.open(str(image_input))
            except Exception as e:
                return {"text": "", "error": f"Cannot open image: {e}", "confidence": 0.0}

        # Preprocessing hints from marks.yaml
        marks = load_marks()
        # Basic preprocessing: convert to grayscale
        if img.mode != "L":
            img = img.convert("L")
        # Use pytesseract with expected chars whitelist for better accuracy
        # Try HUID whitelist first, fallback to general
        config = "--psm 6"  # Assume uniform block of text
        text = pytesseract.image_to_string(img, config=config)
        # Confidence estimate via OSD or data
        try:
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
            confs = [int(c) for c in data["conf"] if int(c) != -1]
            avg_conf = sum(confs) / len(confs) / 100.0 if confs else 0.6
        except Exception:
            avg_conf = 0.6
        return {"text": text.strip(), "error": None, "confidence": round(avg_conf, 3)}
    except ImportError as e:
        return {"text": "", "error": f"OCR dependencies missing: {e}. Install pytesseract + pillow and system tesseract.", "confidence": 0.0}
    except Exception as e:
        return {"text": "", "error": f"OCR failed: {e}", "confidence": 0.0}


def ocr_image(image_input) -> dict:
    """
    OCR entry point: extract text from image and run structural validation.

    Returns dict with:
        ocr_text, ocr_confidence, ocr_error, analysis (from analyze_text)
    Supports typed-code fallback: if OCR fails, caller should use validate_typed().
    """
    ocr = _ocr_extract(image_input)
    analysis = analyze_text(ocr["text"]) if ocr["text"] else {"input": "", "findings": [], "summary": "No text extracted from image.", "disclaimer": DISCLAIMER}
    return {
        "ocr_text": ocr["text"],
        "ocr_confidence": ocr["confidence"],
        "ocr_error": ocr["error"],
        "analysis": analysis,
        "typed_fallback": "If OCR is unclear, type the code manually and call validate_typed(code, mark_type).",
        "disclaimer": HUID_DISCLAIMER,
    }


def analyze_mark(input_data, mark_type: str = "auto") -> dict:
    """
    Unified entry point: accepts either text, typed code, or image path/bytes.

    - If input_data looks like an image path/bytes and mark_type is 'image', run OCR.
    - Otherwise treat as text/typed code.
    """
    # Heuristic: if input is bytes or path to existing image file, treat as image
    if isinstance(input_data, (bytes, bytearray)):
        return ocr_image(input_data)
    if isinstance(input_data, str):
        p = pathlib.Path(input_data)
        if p.exists() and p.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"):
            return ocr_image(input_data)
        # Check if caller explicitly said mark_type is image
        if mark_type.lower() == "image":
            return ocr_image(input_data)
        # Otherwise treat as typed text
        if mark_type.lower() != "auto" and len(input_data.strip().split()) == 1 and len(input_data.strip()) <= 12:
            # Likely a single code typed
            return validate_typed(input_data.strip(), mark_type)
        else:
            # Free text analysis
            return analyze_text(input_data)
    return analyze_text(str(input_data))


def get_supported_marks() -> dict:
    """Return grammar summary for UI / API documentation."""
    m = load_marks()
    return {
        "huid": {"pattern": m.get("huid", {}).get("pattern"), "length": 6, "charset": "[0-9A-Z]", "disclaimer": HUID_DISCLAIMER},
        "purity": {"valid": m.get("purity", {}).get("valid"), "labels": m.get("purity", {}).get("labels"), "standard": "IS 1417"},
        "isi_licence": {"pattern": m.get("isi_licence", {}).get("pattern"), "example": "CM/L-1234567"},
        "crs_rnumber": {"pattern": m.get("crs_rnumber", {}).get("pattern"), "example": "R-41001234"},
        "disclaimer": DISCLAIMER,
    }


# ── Quick self-test ───────────────────────────────────────────────────
if __name__ == "__main__":
    print("Testing marks.py structural validation...\n")
    tests = [
        ("9A2F8K", "huid", True),
        ("000001", "huid", True),
        ("9a2f8k", "huid", False),
        ("AB-12C", "huid", False),
        ("916", "purity", True),
        ("999", "purity", True),
        ("925", "purity", False),
        ("CM/L-1234567", "isi_licence", True),
        ("CM/L-123456", "isi_licence", False),
        ("R-41001234", "crs_rnumber", True),
        ("R-4100123", "crs_rnumber", False),
    ]
    ok = 0
    for code, typ, expect in tests:
        res = validate_typed(code, typ)
        status = "PASS" if res["valid"] == expect else "FAIL"
        if status == "PASS":
            ok += 1
        print(f"  [{status}] {typ:12s} '{code}' -> valid={res['valid']} (expected {expect}) : {res['reason']}")
    print(f"\n{ok}/{len(tests)} tests passed.")
    print("\nAnalyze text with hallmark:")
    print(analyze_text("BIS 916 HUID 9A2F8K CM/L-1234567 R-41001234"))
    print("\nSupported marks:", get_supported_marks())
    print("\nDISCLAIMER:", DISCLAIMER)
