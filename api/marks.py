"""
Manak Mitra — Mark & Licence Verification Engine
Owner: Jay & Rudra

Provides rule-based validation and OCR recognition for:
1. Gold Hallmark HUID (Hallmark Unique Identification — 6 alphanumeric digits, IS 1417)
2. ISI Certification Mark Licence (CM/L-XXXXXXX — 7 digits under Scheme-I)
3. CRS Electronic Goods Registration (R-XXXXXXXX — 8 digits under MeitY)
4. FMCS Foreign Manufacturer Licences
5. Consumer protection guidance against counterfeit markings
"""
import io
import re
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger("manak.marks")

# ── Regex Patterns ──────────────────────────────────────────────────────────
HUID_REGEX = re.compile(r"^[0-9A-Z]{6}$", re.I)
ISI_CML_REGEX = re.compile(r"^(?:CM/L[- ]?)?(\d{7})$", re.I)
CRS_R_REGEX = re.compile(r"^(?:R[- ]?)?(\d{8})$", re.I)

# Recognised gold purity fineness grades under IS 1417
VALID_GOLD_PURITIES = {
    "375": {"karat": "9K", "description": "37.5% Pure Gold (9 Karat)"},
    "585": {"karat": "14K", "description": "58.5% Pure Gold (14 Karat)"},
    "750": {"karat": "18K", "description": "75.0% Pure Gold (18 Karat)"},
    "916": {"karat": "22K", "description": "91.6% Pure Gold (22 Karat - Most Common)"},
    "958": {"karat": "23K", "description": "95.8% Pure Gold (23 Karat)"},
    "999": {"karat": "24K", "description": "99.9% Pure Gold (24 Karat - Bullion/Coin)"},
}
VALID_PURITY_MARKS = {
    f"{details['karat']}{fineness}"
    for fineness, details in VALID_GOLD_PURITIES.items()
}


def _is_ocr_huid_candidate(value: str) -> bool:
    """Use stricter rules for noisy OCR than for manually entered HUIDs."""
    candidate = value.strip().upper()
    return bool(
        HUID_REGEX.fullmatch(candidate)
        and candidate not in VALID_PURITY_MARKS
        and candidate not in OCR_FALSE_POSITIVES
        and any(char.isalpha() for char in candidate)
        and any(char.isdigit() for char in candidate)
    )

# Lightweight dictionary blocklist to catch OCR hallucinations
OCR_FALSE_POSITIVES = {
    "PESTLE", "APPLES", "BANGLE", "SILVER", "GOLDEN", "CARATS", "WEIGHT", 
    "SAMPLE", "YELLOW", "INDIAN", "CANCER", "HALLMK", "OUNCES", "TESTED"
}

def detect_mark_type(code: str) -> str:
    """Auto-detects mark type from code structure."""
    c = code.strip().upper()
    if c.startswith("CM/L") or (len(c) == 7 and c.isdigit()):
        return "isi"
    if c.startswith("R-") or (len(c) == 8 and c.isdigit()):
        return "crs"
    if len(c) == 6 and bool(HUID_REGEX.match(c)) and c not in VALID_PURITY_MARKS:
        return "huid"
    return "unknown"


def check_huid_plausibility(candidate: str, ocr_confidence: float = 100.0, hallmark_context: bool = False) -> Dict[str, Any]:
    """
    Evaluates a 6-character HUID candidate for structural plausibility.
    Returns status: 'structurally_plausible', 'suspicious', or 'invalid'
    """
    c = candidate.strip().upper()
    
    evidence = {
        "length_valid": len(c) == 6,
        "mixed_alphanumeric": any(char.isdigit() for char in c) and any(char.isalpha() for char in c),
        "dictionary_word": c in OCR_FALSE_POSITIVES,
        "all_digits": c.isdigit(),
        "all_letters": c.isalpha(),
        "hallmark_context": hallmark_context,
        "purity_mark": c in VALID_PURITY_MARKS,
    }
    
    if not HUID_REGEX.match(c) or evidence["purity_mark"]:
        status = "invalid"
        confidence = 0.0
    elif evidence["dictionary_word"]:
        status = "suspicious"
        confidence = 0.1
    elif evidence["all_letters"]:
        status = "suspicious"
        confidence = 0.4
    elif evidence["all_digits"]:
        status = "suspicious"
        confidence = 0.6
    else:
        status = "structurally_plausible"
        confidence = 0.9
        
    # Context boost
    if hallmark_context and status == "suspicious":
        confidence += 0.2
        
    # OCR penalty
    if ocr_confidence < 60.0 and status != "invalid":
        status = "suspicious"
        confidence *= 0.5
        
    return {
        "status": status,
        "confidence": round(confidence, 2),
        "evidence": evidence
    }


def verify_huid(code: str, purity: Optional[str] = None, ocr_confidence: float = 100.0, hallmark_context: bool = False) -> Dict[str, Any]:
    """
    Validates a 6-character alphanumeric Gold Hallmark HUID code under IS 1417.
    """
    clean_code = code.strip().upper()
    
    plausibility = check_huid_plausibility(clean_code, ocr_confidence, hallmark_context)
    status = plausibility["status"]
    
    purity_info = VALID_GOLD_PURITIES.get(purity.strip()) if purity else None
    purity_str = f" ({purity_info['description']})" if purity_info else ""

    if plausibility["evidence"].get("purity_mark"):
        reason = (
            f"'{clean_code}' is a gold purity/fineness mark, not a HUID. A complete post-2021 BIS hallmark "
            "must also show a separate 6-character alphanumeric HUID that can be checked in BIS CARE."
        )
    elif status == "invalid":
        reason = (
            "Structural syntax violation: An authentic BIS Hallmark HUID must be exactly 6 alphanumeric "
            "characters (digits 0-9 and capital letters A-Z). Symbols, spaces, or incorrect character counts "
            "indicate counterfeit or improper stamping."
        )
    elif status == "suspicious":
        reason = (
            f"Suspicious HUID candidate '{clean_code}'. While it is 6 characters long, it lacks the typical "
            "mixed alphanumeric structure of a genuine HUID, or OCR confidence was very low. It may be an OCR hallucination "
            "or an English dictionary word rather than a true registry code."
        )
    else:
        reason = (
            f"Structurally plausible HUID syntax. Code '{clean_code}' complies with the basic format regulations under IS 1417{purity_str}. "
            "A genuine hallmarked piece must feature 3 distinct stamps: 1) The triangular BIS Logo, "
            "2) The purity/fineness mark (e.g. 22K916), and 3) The 6-digit unique HUID laser code."
        )

    return {
        "status": status,
        "valid": status == "structurally_plausible", # legacy compatibility
        "verified": False,
        "mark_type": "Gold Hallmark HUID",
        "code": clean_code,
        "candidate": clean_code,
        "confidence": plausibility["confidence"],
        "ocr_confidence": ocr_confidence,
        "evidence": plausibility["evidence"],
        "purity": purity or "Standard 22K (916) / Any",
        "standard": "IS 1417",
        "reason": reason,
        "disclaimer": "Structural/OCR analysis only. HUID authenticity must be verified through the official BIS CARE mechanism.",
        "official_handoff": "For real-time jeweller registration and assaying center verification, enter this code in the official BIS CARE app.",
        "citations": [
            {"kind": "standard", "ref": "IS 1417", "status": "ACTIVE", "title": "Gold and Gold Alloys - Hallmarking"},
            {"kind": "qco", "ref": "Hallmarking of Gold Jewellery Order", "url": "https://consumeraffairs.nic.in/hallmarking"},
            {"kind": "portal", "ref": "BIS CARE Mobile App", "url": "https://www.bis.gov.in/consumer-overview/bis-care-app/"}
        ]
    }


def verify_isi(code: str, is_number: Optional[str] = None, ocr_confidence: float = 100.0) -> Dict[str, Any]:
    """
    Validates a 7-digit ISI Standard Mark CM/L license code under Scheme-I.
    """
    clean_code = code.strip().upper()
    match = ISI_CML_REGEX.match(clean_code)

    if not match:
        return {
            "status": "invalid",
            "valid": False,
            "verified": False,
            "mark_type": "ISI Standard Mark (Scheme-I)",
            "code": clean_code,
            "confidence": 0.0,
            "standard": is_number or "Scheme-I Mandatory Standard",
            "reason": (
                f"Invalid ISI license format. Authentic BIS ISI license numbers are formatted as 'CM/L-XXXXXXX' "
                f"(a 7-digit license number). Provided code '{clean_code}' does not match official license grammar."
            ),
            "disclaimer": "Structural/OCR analysis only. Authenticity must be verified through the official BIS portal.",
            "official_handoff": "Check authorized manufacturers on the BIS Manakonline search portal.",
            "citations": [
                {"kind": "portal", "ref": "BIS Manakonline Portal", "url": "https://www.manakonline.in/"}
            ]
        }

    cml_digits = match.group(1)
    status = "structurally_plausible" if ocr_confidence > 60 else "suspicious"
    return {
        "status": status,
        "valid": status == "structurally_plausible",
        "verified": False,
        "mark_type": "ISI Standard Mark (Scheme-I)",
        "code": f"CM/L-{cml_digits}",
        "candidate": f"CM/L-{cml_digits}",
        "confidence": 0.9 if status == "structurally_plausible" else 0.5,
        "ocr_confidence": ocr_confidence,
        "standard": is_number or "Scheme-I Product Certification",
        "reason": (
            f"Structurally plausible ISI Licence syntax. 'CM/L-{cml_digits}' follows the mandatory 7-digit licensing standard "
            f"required under Scheme-I. A valid physical ISI mark on packaging must display: "
            f"1) The official ISI logo, 2) The applicable Indian Standard number on top (e.g., IS 9873), and "
            f"3) The 7-digit 'CM/L-{cml_digits}' license identifier printed below."
        ),
        "disclaimer": "Structural/OCR analysis only. Authenticity must be verified through the official BIS portal.",
        "official_handoff": "Verify manufacturer name and license validity on the BIS Manakonline registry portal.",
        "citations": [
            {"kind": "scheme", "ref": "BIS Scheme-I (Product Certification)", "url": "https://bis.gov.in/product-certification/"},
            {"kind": "portal", "ref": "Manakonline Search Licence", "url": "https://www.manakonline.in/MANAK/SearchLicence"}
        ]
    }


def verify_crs(code: str, is_number: Optional[str] = None, ocr_confidence: float = 100.0) -> Dict[str, Any]:
    """
    Validates an 8-digit CRS Registration code under MeitY / BIS Scheme-II.
    """
    clean_code = code.strip().upper()
    match = CRS_R_REGEX.match(clean_code)

    if not match:
        return {
            "status": "invalid",
            "valid": False,
            "verified": False,
            "mark_type": "CRS Registration (Scheme-II)",
            "code": clean_code,
            "confidence": 0.0,
            "standard": is_number or "Electronics & IT Goods Mandatory Standard",
            "reason": (
                f"Invalid CRS registration format. Authentic Compulsory Registration Scheme registrations "
                f"are formatted as 'R-XXXXXXXX' (an 8-digit registration number). Provided '{clean_code}' does not match."
            ),
            "disclaimer": "Structural/OCR analysis only. Authenticity must be verified through the official BIS portal.",
            "official_handoff": "Search verified electronic product registrations at crsbis.in.",
            "citations": [
                {"kind": "portal", "ref": "CRS BIS Official Portal", "url": "https://crsbis.in/"}
            ]
        }

    r_digits = match.group(1)
    status = "structurally_plausible" if ocr_confidence > 60 else "suspicious"
    return {
        "status": status,
        "valid": status == "structurally_plausible",
        "verified": False,
        "mark_type": "CRS Registration (Scheme-II)",
        "code": f"R-{r_digits}",
        "candidate": f"R-{r_digits}",
        "confidence": 0.9 if status == "structurally_plausible" else 0.5,
        "ocr_confidence": ocr_confidence,
        "standard": is_number or "IS 16102 / Electronics Standard",
        "reason": (
            f"Structurally plausible CRS Registration syntax. 'R-{r_digits}' follows the mandatory 8-digit electronic goods "
            f"registration format under MeitY QCO orders. Authentic product labels must display: "
            f"'Self-Declaration - Conforming to IS XXXXX', the 'R-{r_digits}' code, and the crsbis.in website URL."
        ),
        "disclaimer": "Structural/OCR analysis only. Authenticity must be verified through the official BIS portal.",
        "official_handoff": "Verify registration status, brand, and model details on crsbis.in/BIS/products.do.",
        "citations": [
            {"kind": "scheme", "ref": "Compulsory Registration Scheme (CRS)", "url": "https://crsbis.in/"},
            {"kind": "qco", "ref": "Electronics & IT Goods QCO", "url": "https://www.meity.gov.in/esdm/crs"}
        ]
    }


def verify_mark(code: str, mark_type: str = "auto", purity: Optional[str] = None, is_number: Optional[str] = None) -> Dict[str, Any]:
    """
    Main entry point to verify any BIS mark or licence code.
    """
    if not code or not code.strip():
        return {
            "status": "invalid",
            "valid": False,
            "verified": False,
            "mark_type": "Unknown",
            "code": "",
            "confidence": 0.0,
            "reason": "Please enter a valid HUID (e.g. '916A1B'), ISI licence (e.g. 'CM/L-1234567'), or CRS code (e.g. 'R-41000001').",
            "disclaimer": "Structural analysis only.",
            "official_handoff": "For live assistance, contact the BIS helpline at 1800-11-4000.",
            "citations": []
        }

    t = mark_type.lower()
    if t == "auto":
        t = detect_mark_type(code)

    if t in ("huid", "gold", "hallmark"):
        return verify_huid(code, purity)
    elif t in ("isi", "cml", "licence", "license"):
        return verify_isi(code, is_number)
    elif t in ("crs", "r_number", "electronics"):
        return verify_crs(code, is_number)
    else:
        # Fallback: test all three formats
        if HUID_REGEX.match(code.strip().upper()):
            return verify_huid(code, purity)
        elif ISI_CML_REGEX.match(code.strip().upper()):
            return verify_isi(code, is_number)
        elif CRS_R_REGEX.match(code.strip().upper()):
            return verify_crs(code, is_number)

        return {
            "status": "invalid",
            "valid": False,
            "verified": False,
            "mark_type": "Unrecognized Mark",
            "code": code.strip(),
            "confidence": 0.0,
            "reason": (
                f"Code '{code}' does not match any official BIS mark syntax (6-char HUID, 7-digit CM/L license, "
                "or 8-digit R-number). Please check the stamping on your product."
            ),
            "disclaimer": "Structural analysis only.",
            "official_handoff": "Verify marks through the BIS CARE mobile app or visit bis.gov.in.",
            "citations": [
                {"kind": "portal", "ref": "BIS Official Portal", "url": "https://www.bis.gov.in/"}
            ]
        }


def _preprocess_image_for_ocr(image):
    """
    Apply a multi-step preprocessing pipeline to maximise tesseract OCR accuracy on
    small hallmark labels:
      1. Convert to RGB (handle PNG/RGBA)
      2. 4× upscale with Lanczos for sub-pixel detail
      3. Greyscale → sharpen → boost contrast
    Returns a greyscale PIL image ready for tesseract.
    """
    from PIL import ImageFilter, ImageEnhance, ImageOps
    import PIL

    # Ensure RGB
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    # 4× upscale – biggest single improvement for small text
    w, h = image.size
    image = image.resize((w * 4, h * 4), PIL.Image.LANCZOS)

    # Greyscale
    image = image.convert("L")

    # Sharpen twice
    image = image.filter(ImageFilter.SHARPEN)
    image = image.filter(ImageFilter.SHARPEN)

    # Boost contrast and brightness so thin strokes become solid black
    image = ImageEnhance.Contrast(image).enhance(2.5)
    image = ImageEnhance.Brightness(image).enhance(1.2)

    return image


def extract_mark_from_image(image_bytes: bytes) -> Dict[str, Any]:
    """
    Extracts a BIS mark (HUID / ISI / CRS) from an uploaded photo using a multi-pass
    tesseract OCR pipeline with image preprocessing.

    Pipeline
    --------
    Pass 1 – High-quality multi-PSM run with alphanumeric whitelist on preprocessed image.
    Pass 2 – ``image_to_data`` on raw image for fallback word-level hits.
    Pass 3 – Regex search over the full concatenated text from both passes.
    """
    try:
        from PIL import Image
        import pytesseract
        from pytesseract import Output

        raw_image = Image.open(io.BytesIO(image_bytes))
        processed = _preprocess_image_for_ocr(raw_image)

        # ── Pass 1: whitelist-restricted multi-PSM sweeps ───────────────────
        ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        PSM_CONFIGS = [
            f"--psm 7 --oem 3 -c tessedit_char_whitelist={ALPHANUMERIC}",  # single text line
            f"--psm 6 --oem 3 -c tessedit_char_whitelist={ALPHANUMERIC}",  # uniform block
            f"--psm 11 --oem 3 -c tessedit_char_whitelist={ALPHANUMERIC}", # sparse text
            f"--psm 4 --oem 3 -c tessedit_char_whitelist={ALPHANUMERIC}",  # single column
        ]

        pass1_tokens: List[Dict[str, Any]] = []  # {"text": str, "conf": float}
        pass1_raw_strings: List[str] = []

        for cfg in PSM_CONFIGS:
            try:
                data = pytesseract.image_to_data(processed, config=cfg, output_type=Output.DICT)
                for i in range(len(data["text"])):
                    word = data["text"][i].strip()
                    conf = float(data["conf"][i])
                    if word and conf > 0:
                        clean = re.sub(r"[^A-Z0-9]", "", word.upper())
                        pass1_tokens.append({"text": clean, "original": word, "conf": conf})
                        pass1_raw_strings.append(word)
            except Exception as inner_err:
                logger.debug(f"OCR pass config '{cfg[:30]}' failed: {inner_err}")

        # ── Pass 2: raw image word-level data (catches context keywords) ────
        raw_data = pytesseract.image_to_data(raw_image, output_type=Output.DICT)
        pass2_tokens: List[Dict[str, Any]] = []
        pass2_raw_strings: List[str] = []
        hallmark_context = False

        for i in range(len(raw_data["text"])):
            word = raw_data["text"][i].strip()
            conf = float(raw_data["conf"][i])
            if not word:
                continue
            pass2_raw_strings.append(word)
            word_upper = word.upper()
            if word_upper in ("IS", "BIS", "22K", "18K", "14K", "916", "750", "585",
                              "HALLMARK", "PURITY", "GOLD", "BIS", "KARAT"):
                hallmark_context = True
            clean = re.sub(r"[^A-Z0-9]", "", word_upper)
            if clean:
                pass2_tokens.append({"text": clean, "original": word, "conf": conf if conf > 0 else 40.0})

        all_tokens = pass1_tokens + pass2_tokens
        full_text_p1 = " ".join(pass1_raw_strings)
        full_text_p2 = " ".join(pass2_raw_strings)
        full_text_combined = (full_text_p1 + " " + full_text_p2).strip()

        logger.info(f"OCR Pass-1 text: {full_text_p1!r}")
        logger.info(f"OCR Pass-2 text: {full_text_p2!r}")

        # ── Candidate assembly ───────────────────────────────────────────────
        candidates: List[Dict[str, Any]] = []

        for tok in all_tokens:
            clean = tok["text"]
            conf = tok["conf"]
            original = tok["original"]

            if _is_ocr_huid_candidate(clean):
                candidates.append({"text": clean, "original": original, "conf": conf})
            elif len(clean) == 7 and clean.isdigit():
                candidates.append({"text": clean, "original": original, "conf": conf, "type": "isi"})
            elif len(clean) == 8 and clean.isdigit():
                candidates.append({"text": clean, "original": original, "conf": conf, "type": "crs"})
            elif clean.startswith("CML") or original.upper().startswith("CM/L"):
                candidates.append({"text": original.upper(), "original": original, "conf": conf, "type": "isi"})

        # Also try sliding-window concatenation of adjacent tokens to catch
        # split tokens like "22K" + "916" → "22K916"
        clean_tokens = [token for token in all_tokens if token["text"]]
        for j in range(len(clean_tokens) - 1):
            merged = clean_tokens[j]["text"] + clean_tokens[j + 1]["text"]
            if _is_ocr_huid_candidate(merged):
                avg_conf = (clean_tokens[j]["conf"] + clean_tokens[j + 1]["conf"]) / 2
                candidates.append({"text": merged, "original": merged, "conf": avg_conf})
            elif len(merged) == 7 and merged.isdigit():
                avg_conf = (clean_tokens[j]["conf"] + clean_tokens[j + 1]["conf"]) / 2
                candidates.append({"text": merged, "original": merged, "conf": avg_conf, "type": "isi"})
            elif len(merged) == 8 and merged.isdigit():
                avg_conf = (clean_tokens[j]["conf"] + clean_tokens[j + 1]["conf"]) / 2
                candidates.append({"text": merged, "original": merged, "conf": avg_conf, "type": "crs"})

        # ── Pass 3: regex search over concatenated full text ─────────────────
        combined_upper = re.sub(r"[^A-Z0-9]", "", full_text_combined.upper())
        cml_matches = re.findall(r"(?:CML)?(\d{7})", combined_upper)
        crs_matches = re.findall(r"(?:R)?(\d{8})", combined_upper)
        huid_matches = re.findall(
            r"(?<![0-9A-Z])[0-9A-Z]{6}(?![0-9A-Z])",
            full_text_combined.upper(),
        )

        for m in cml_matches:
            candidates.append({"text": m, "original": m, "conf": 40.0, "type": "isi"})
        for m in crs_matches:
            candidates.append({"text": m, "original": m, "conf": 40.0, "type": "crs"})
        for m in huid_matches:
            if _is_ocr_huid_candidate(m):
                candidates.append({"text": m, "original": m, "conf": 40.0})

        if not candidates:
            purity_marks = sorted({
                token["text"] for token in all_tokens
                if token["text"] in VALID_PURITY_MARKS
            })
            detected_purity = purity_marks[0] if purity_marks else None
            if detected_purity:
                return {
                    "status": "incomplete",
                    "valid": False,
                    "verified": False,
                    "mark_type": "Gold Hallmark Image",
                    "code": "Not detected",
                    "confidence": 0.0,
                    "ocr_confidence": max(
                        token["conf"] for token in all_tokens
                        if token["text"] == detected_purity
                    ),
                    "purity_mark": detected_purity,
                    "standard": "IS 1417",
                    "evidence": {
                        "purity_mark_detected": True,
                        "huid_detected": False,
                        "hallmark_context": hallmark_context,
                    },
                    "reason": (
                        f"OCR successfully read the purity mark '{detected_purity}', but this is not a HUID. "
                        "No separate 6-character Hallmark Unique Identification code is visible in the image, "
                        "so authenticity cannot be checked from this photo."
                    ),
                    "disclaimer": "A purity mark alone does not uniquely identify or authenticate the jewellery item.",
                    "official_handoff": "Photograph the separate 6-character HUID at close range, or verify it manually in the BIS CARE app.",
                    "citations": [
                        {"kind": "standard", "ref": "IS 1417", "status": "ACTIVE", "title": "Gold and Gold Alloys - Hallmarking"},
                        {"kind": "portal", "ref": "BIS CARE Mobile App", "url": "https://www.bis.gov.in/consumer-overview/bis-care-app/"},
                    ],
                    "ocr_text": full_text_combined,
                }
            return {
                "status": "not_detected",
                "valid": False,
                "verified": False,
                "mark_type": "Image OCR Scan",
                "code": "Not detected",
                "confidence": 0.0,
                "ocr_text": full_text_combined or "No text recognized",
                "reason": (
                    "Could not detect a clear 6-character HUID, 7-digit CM/L licence, or 8-digit CRS number "
                    "from the image. Ensure the mark is well-lit, in focus, and fills most of the frame. "
                    "Note: Pre-2021 hallmarks do not contain HUID codes."
                ),
                "disclaimer": "Absence of a HUID in old hallmarks does not imply it is counterfeit.",
                "official_handoff": "Upload a higher-resolution photo or check manually in the BIS CARE app.",
                "citations": []
            }

        # De-duplicate and pick best by confidence
        seen: set = set()
        unique_candidates = []
        for c in candidates:
            key = (c["text"], c.get("type", "huid"))
            if key not in seen:
                seen.add(key)
                unique_candidates.append(c)

        unique_candidates.sort(key=lambda x: x["conf"], reverse=True)
        best = unique_candidates[0]

        if best.get("type") == "isi":
            res = verify_isi(best["text"], ocr_confidence=best["conf"])
        elif best.get("type") == "crs":
            res = verify_crs(best["text"], ocr_confidence=best["conf"])
        else:
            res = verify_huid(best["text"], ocr_confidence=best["conf"], hallmark_context=hallmark_context)

        res["ocr_text"] = full_text_combined.strip()
        return res
        
    except ImportError:
        return {
            "status": "error",
            "valid": False,
            "verified": False,
            "mark_type": "Image OCR Scan",
            "code": "",
            "confidence": 0.0,
            "reason": "OCR engine (pytesseract) is not installed on this server. Please enter the code as text.",
            "disclaimer": "",
            "official_handoff": "Type your 6-digit HUID or CM/L licence number directly into the verification box.",
            "citations": []
        }
    except Exception as e:
        logger.error(f"OCR Error: {e}")
        return {
            "status": "error",
            "valid": False,
            "verified": False,
            "mark_type": "Image OCR Scan",
            "code": "",
            "confidence": 0.0,
            "reason": f"Error scanning image: {str(e)}",
            "disclaimer": "",
            "official_handoff": "Please enter the code manually.",
            "citations": []
        }


if __name__ == "__main__":
    print("Testing api/marks.py...")
    # Test 1: Valid HUID
    res_huid = verify_mark("916A1B")
    print(f"HUID 916A1B -> Status: {res_huid['status']} ({res_huid['mark_type']})")
    assert res_huid["status"] == "structurally_plausible"

    # Test 2: Invalid HUID
    res_bad = verify_mark("12345")
    print(f"Invalid '12345' -> Status: {res_bad['status']}")
    assert res_bad["status"] == "invalid"
    
    # Test 3: Suspicious HUID (Dictionary Word)
    res_dict = verify_mark("PESTLE")
    print(f"Suspicious 'PESTLE' -> Status: {res_dict['status']}")
    assert res_dict["status"] == "suspicious"

    # Test 4: Suspicious HUID (All Digits)
    res_digits = verify_mark("123456")
    print(f"Suspicious '123456' -> Status: {res_digits['status']}")
    assert res_digits["status"] == "suspicious"

    # Test 5: ISI
    res_isi = verify_mark("CM/L-1234567")
    print(f"ISI CM/L-1234567 -> Status: {res_isi['status']} ({res_isi['mark_type']})")
    assert res_isi["status"] == "structurally_plausible"

    # Test 6: CRS
    res_crs = verify_mark("R-41000001")
    print(f"CRS R-41000001 -> Status: {res_crs['status']} ({res_crs['mark_type']})")
    assert res_crs["status"] == "structurally_plausible"

    print("api/marks.py self-test passed successfully!")
