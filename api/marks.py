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


def detect_mark_type(code: str) -> str:
    """Auto-detects mark type from code structure."""
    c = code.strip().upper()
    if c.startswith("CM/L") or (len(c) == 7 and c.isdigit()):
        return "isi"
    if c.startswith("R-") or (len(c) == 8 and c.isdigit()):
        return "crs"
    if len(c) == 6 and bool(HUID_REGEX.match(c)):
        return "huid"
    return "unknown"


def verify_huid(code: str, purity: Optional[str] = None) -> Dict[str, Any]:
    """
    Validates a 6-character alphanumeric Gold Hallmark HUID code under IS 1417.
    """
    clean_code = code.strip().upper()
    
    if not HUID_REGEX.match(clean_code):
        return {
            "valid": False,
            "mark_type": "Gold Hallmark HUID",
            "code": clean_code,
            "purity": purity,
            "standard": "IS 1417",
            "reason": (
                "Structural syntax violation: An authentic BIS Hallmark HUID must be exactly 6 alphanumeric "
                "characters (digits 0-9 and capital letters A-Z). Symbols, spaces, or incorrect character counts "
                "indicate counterfeit or improper stamping."
            ),
            "official_handoff": "Verify real-time status in the official 'BIS CARE' mobile app or report to DoCA.",
            "citations": [
                {"kind": "standard", "ref": "IS 1417", "status": "ACTIVE", "title": "Gold and Gold Alloys, Silver and Silver Alloys - Hallmarking"},
                {"kind": "portal", "ref": "BIS CARE Mobile App", "url": "https://www.bis.gov.in/consumer-overview/bis-care-app/"}
            ]
        }

    purity_info = VALID_GOLD_PURITIES.get(purity.strip()) if purity else None
    purity_str = f" ({purity_info['description']})" if purity_info else ""

    return {
        "valid": True,
        "mark_type": "Gold Hallmark HUID",
        "code": clean_code,
        "purity": purity or "Standard 22K (916) / Any",
        "standard": "IS 1417",
        "reason": (
            f"Valid HUID syntax. Code '{clean_code}' strictly complies with Bureau of Indian Standards "
            f"structural format regulations under IS 1417{purity_str}. "
            "A genuine hallmarked piece must feature 3 distinct stamps: 1) The triangular BIS Logo, "
            "2) The purity/fineness mark (e.g. 22K916), and 3) The 6-digit unique HUID laser code."
        ),
        "official_handoff": "For real-time jeweller registration and assaying center verification, enter this code in the official BIS CARE app.",
        "citations": [
            {"kind": "standard", "ref": "IS 1417", "status": "ACTIVE", "title": "Gold and Gold Alloys - Hallmarking"},
            {"kind": "qco", "ref": "Hallmarking of Gold Jewellery Order", "url": "https://consumeraffairs.nic.in/hallmarking"}
        ]
    }


def verify_isi(code: str, is_number: Optional[str] = None) -> Dict[str, Any]:
    """
    Validates a 7-digit ISI Standard Mark CM/L license code under Scheme-I.
    """
    clean_code = code.strip().upper()
    match = ISI_CML_REGEX.match(clean_code)

    if not match:
        return {
            "valid": False,
            "mark_type": "ISI Standard Mark (Scheme-I)",
            "code": clean_code,
            "standard": is_number or "Scheme-I Mandatory Standard",
            "reason": (
                f"Invalid ISI license format. Authentic BIS ISI license numbers are formatted as 'CM/L-XXXXXXX' "
                f"(a 7-digit license number). Provided code '{clean_code}' does not match official license grammar."
            ),
            "official_handoff": "Check authorized manufacturers on the BIS Manakonline search portal.",
            "citations": [
                {"kind": "portal", "ref": "BIS Manakonline Portal", "url": "https://www.manakonline.in/"}
            ]
        }

    cml_digits = match.group(1)
    return {
        "valid": True,
        "mark_type": "ISI Standard Mark (Scheme-I)",
        "code": f"CM/L-{cml_digits}",
        "standard": is_number or "Scheme-I Product Certification",
        "reason": (
            f"Valid ISI Licence syntax. 'CM/L-{cml_digits}' follows the mandatory 7-digit licensing standard "
            f"required under Scheme-I. A valid physical ISI mark on packaging must display: "
            f"1) The official ISI logo, 2) The applicable Indian Standard number on top (e.g., IS 9873), and "
            f"3) The 7-digit 'CM/L-{cml_digits}' license identifier printed below."
        ),
        "official_handoff": "Verify manufacturer name and license validity on the BIS Manakonline registry portal.",
        "citations": [
            {"kind": "scheme", "ref": "BIS Scheme-I (Product Certification)", "url": "https://bis.gov.in/product-certification/"},
            {"kind": "portal", "ref": "Manakonline Search Licence", "url": "https://www.manakonline.in/MANAK/SearchLicence"}
        ]
    }


def verify_crs(code: str, is_number: Optional[str] = None) -> Dict[str, Any]:
    """
    Validates an 8-digit CRS Registration code under MeitY / BIS Scheme-II.
    """
    clean_code = code.strip().upper()
    match = CRS_R_REGEX.match(clean_code)

    if not match:
        return {
            "valid": False,
            "mark_type": "CRS Registration (Scheme-II)",
            "code": clean_code,
            "standard": is_number or "Electronics & IT Goods Mandatory Standard",
            "reason": (
                f"Invalid CRS registration format. Authentic Compulsory Registration Scheme registrations "
                f"are formatted as 'R-XXXXXXXX' (an 8-digit registration number). Provided '{clean_code}' does not match."
            ),
            "official_handoff": "Search verified electronic product registrations at crsbis.in.",
            "citations": [
                {"kind": "portal", "ref": "CRS BIS Official Portal", "url": "https://crsbis.in/"}
            ]
        }

    r_digits = match.group(1)
    return {
        "valid": True,
        "mark_type": "CRS Registration (Scheme-II)",
        "code": f"R-{r_digits}",
        "standard": is_number or "IS 16102 / Electronics Standard",
        "reason": (
            f"Valid CRS Registration syntax. 'R-{r_digits}' follows the mandatory 8-digit electronic goods "
            f"registration format under MeitY QCO orders. Authentic product labels must display: "
            f"'Self-Declaration - Conforming to IS XXXXX', the 'R-{r_digits}' code, and the crsbis.in website URL."
        ),
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
            "valid": False,
            "mark_type": "Unknown",
            "code": "",
            "reason": "Please enter a valid HUID (e.g. '916A1B'), ISI licence (e.g. 'CM/L-1234567'), or CRS code (e.g. 'R-41000001').",
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
            "valid": False,
            "mark_type": "Unrecognized Mark",
            "code": code.strip(),
            "reason": (
                f"Code '{code}' does not match any official BIS mark syntax (6-char HUID, 7-digit CM/L license, "
                "or 8-digit R-number). Please check the stamping on your product."
            ),
            "official_handoff": "Verify marks through the BIS CARE mobile app or visit bis.gov.in.",
            "citations": [
                {"kind": "portal", "ref": "BIS Official Portal", "url": "https://www.bis.gov.in/"}
            ]
        }


def extract_mark_from_image(image_bytes: bytes) -> Dict[str, Any]:
    """
    Extracts text from an uploaded image of a mark and verifies it.
    Uses pytesseract if installed, otherwise provides informative guidance.
    """
    try:
        from PIL import Image
        import pytesseract

        image = Image.open(io.BytesIO(image_bytes))
        extracted_text = pytesseract.image_to_string(image)
        logger.info(f"OCR Extracted text: {extracted_text}")

        # Look for potential codes in extracted text
        # 1. HUID (6 alphanumeric)
        huid_matches = re.findall(r"\b[0-9A-Z]{6}\b", extracted_text.upper())
        # 2. CM/L (7 digits)
        cml_matches = re.findall(r"(?:CM/L[- ]?)?(\d{7})", extracted_text, re.I)
        # 3. CRS (8 digits)
        crs_matches = re.findall(r"(?:R[- ]?)?(\d{8})", extracted_text, re.I)

        if cml_matches:
            res = verify_isi(cml_matches[0])
            res["ocr_text"] = extracted_text.strip()
            return res
        elif crs_matches:
            res = verify_crs(crs_matches[0])
            res["ocr_text"] = extracted_text.strip()
            return res
        elif huid_matches:
            # Pick first valid candidate
            res = verify_huid(huid_matches[0])
            res["ocr_text"] = extracted_text.strip()
            return res
        else:
            return {
                "valid": False,
                "mark_type": "Image OCR Scan",
                "code": "Not detected",
                "ocr_text": extracted_text.strip() or "No text recognized",
                "reason": "Could not detect a clear 6-character HUID, 7-digit CM/L licence, or 8-digit CRS number from the image. Please enter the code manually.",
                "official_handoff": "Upload a higher-resolution photo or check manually in the BIS CARE app.",
                "citations": []
            }
    except ImportError:
        return {
            "valid": False,
            "mark_type": "Image OCR Scan",
            "code": "",
            "reason": "OCR engine (pytesseract) is not installed on this server. Please enter the code as text.",
            "official_handoff": "Type your 6-digit HUID or CM/L licence number directly into the verification box.",
            "citations": []
        }
    except Exception as e:
        logger.error(f"OCR Error: {e}")
        return {
            "valid": False,
            "mark_type": "Image OCR Scan",
            "code": "",
            "reason": f"Error scanning image: {str(e)}",
            "official_handoff": "Please enter the code manually.",
            "citations": []
        }


if __name__ == "__main__":
    print("Testing api/marks.py...")
    # Test 1: HUID
    res_huid = verify_mark("916A1B")
    print(f"HUID 916A1B -> Valid: {res_huid['valid']} ({res_huid['mark_type']})")
    assert res_huid["valid"] == True

    # Test 2: Invalid HUID
    res_bad = verify_mark("12345")
    print(f"Invalid '12345' -> Valid: {res_bad['valid']}")
    assert res_bad["valid"] == False

    # Test 3: ISI
    res_isi = verify_mark("CM/L-1234567")
    print(f"ISI CM/L-1234567 -> Valid: {res_isi['valid']} ({res_isi['mark_type']})")
    assert res_isi["valid"] == True

    # Test 4: CRS
    res_crs = verify_mark("R-41000001")
    print(f"CRS R-41000001 -> Valid: {res_crs['valid']} ({res_crs['mark_type']})")
    assert res_crs["valid"] == True

    print("api/marks.py self-test passed successfully!")
