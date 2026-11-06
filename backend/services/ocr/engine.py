"""
OCR Engine — Med44 Phase 1.
Supports:
  - PyMuPDF text-layer extraction (PDF with embedded text — no Tesseract needed)
  - Tesseract OCR (image files + scanned PDFs) — requires binary on PATH or TESSERACT_CMD
  - Returns OCR_UNAVAILABLE when engine is missing (never fake/canned text)

NEVER log full document text. NEVER permanently store source files.
"""
import io
import os
import shutil
import tempfile
import time
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("med44.ocr")

# ─── Engine detection ─────────────────────────────────────────────────────────

def _tesseract_available() -> bool:
    from backend.config import settings
    try:
        import pytesseract
        if settings.TESSERACT_CMD:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def _pymupdf_available() -> bool:
    try:
        import fitz  # PyMuPDF
        return True
    except ImportError:
        return False


def get_ocr_engine_status() -> dict:
    tess = _tesseract_available()
    mupdf = _pymupdf_available()
    try:
        import pytesseract
        tess_ver = str(pytesseract.get_tesseract_version()) if tess else None
    except Exception:
        tess_ver = None

    langs: list[str] = []
    if tess:
        try:
            import pytesseract
            langs = pytesseract.get_languages()
        except Exception:
            pass

    return {
        "tesseract_available": tess,
        "tesseract_version": tess_ver,
        "tesseract_languages": langs,
        "pymupdf_available": mupdf,
        "status": "READY" if (tess or mupdf) else "OCR_UNAVAILABLE",
        "note": (
            "Full OCR ready." if tess else
            "PyMuPDF text-layer extraction only (no Tesseract binary). "
            "Install Tesseract and set TESSERACT_CMD in .env for image/scanned OCR."
            if mupdf else
            "No OCR engine available. Install Tesseract binary."
        ),
    }


# ─── Main processing function ─────────────────────────────────────────────────

MAGIC_BYTES = {
    b"%PDF": "application/pdf",
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG": "image/png",
}

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def _detect_mime(data: bytes) -> Optional[str]:
    for magic, mime in MAGIC_BYTES.items():
        if data[:len(magic)] == magic:
            return mime
    return None


def process_document(
    file_bytes: bytes,
    filename: str,
    max_pages: int = 10,
) -> dict:
    """
    Process uploaded document bytes through OCR.
    Returns structured result — NEVER canned/fake text.
    Does not persist the file.
    """
    start = time.time()

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return _error("INVALID_FORMAT", f"File extension '{ext}' not supported. Allowed: pdf, jpg, jpeg, png")

    mime = _detect_mime(file_bytes)
    if not mime:
        return _error("INVALID_CONTENT", "File content does not match a supported document type (magic bytes check failed)")

    # PDF — try PyMuPDF text layer first (fast, no Tesseract needed)
    if mime == "application/pdf":
        result = _process_pdf(file_bytes, filename, max_pages)
    else:
        result = _process_image(file_bytes, filename)

    result["duration_ms"] = round((time.time() - start) * 1000)
    return result


def _process_pdf(file_bytes: bytes, filename: str, max_pages: int) -> dict:
    if not _pymupdf_available():
        return _error("OCR_UNAVAILABLE", "PyMuPDF not installed — cannot process PDF")

    import fitz

    pages_out = []
    uncertain_regions = []

    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        total_pages = len(doc)
        pages_to_process = min(total_pages, max_pages)
        has_text_layer = False

        for page_num in range(pages_to_process):
            page = doc[page_num]
            text = page.get_text("text").strip()

            if text:
                has_text_layer = True
                words = page.get_text("words")  # (x0, y0, x1, y1, word, block_no, line_no, word_no)
                pages_out.append({
                    "page": page_num + 1,
                    "text": text,
                    "word_count": len(words),
                    "confidence": None,  # text layer, no per-word confidence
                    "source": "pdf_text_layer",
                })
            else:
                # Scanned page — need Tesseract
                if _tesseract_available():
                    img_result = _ocr_page_image(page)
                    img_result["page"] = page_num + 1
                    pages_out.append(img_result)
                    if img_result.get("uncertain_words"):
                        uncertain_regions.extend(img_result["uncertain_words"])
                else:
                    pages_out.append({
                        "page": page_num + 1,
                        "text": "",
                        "source": "scanned_no_ocr_engine",
                        "note": "Scanned page — Tesseract binary required. Install Tesseract and set TESSERACT_CMD.",
                    })
                    uncertain_regions.append({
                        "page": page_num + 1,
                        "reason": "OCR_UNAVAILABLE",
                        "text": "Scanned page — Tesseract not installed",
                        "confidence": 0,
                    })

    full_text = "\n\n".join(p.get("text", "") for p in pages_out)

    return {
        "status": "COMPLETED" if any(p.get("text") for p in pages_out) else "OCR_UNAVAILABLE",
        "engine": "pymupdf" + ("+tesseract" if _tesseract_available() else "_text_layer_only"),
        "filename": filename,
        "total_pages": total_pages,
        "processed_pages": pages_to_process,
        "has_text_layer": has_text_layer,
        "pages": pages_out,
        "full_text": full_text,
        "uncertain_regions": uncertain_regions,
        "language_detected": _detect_script(full_text),
        "handwriting_detected": False,  # PDF text layer assumed typed
    }


def _process_image(file_bytes: bytes, filename: str) -> dict:
    if not _tesseract_available():
        return _error(
            "OCR_UNAVAILABLE",
            "Tesseract binary not found. Install Tesseract OCR and set TESSERACT_CMD in .env to process images. "
            "Windows: https://github.com/UB-Mannheim/tesseract/wiki"
        )

    import pytesseract
    from PIL import Image
    from backend.config import settings

    if settings.TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

    # Preprocess with OpenCV if available
    try:
        import cv2
        import numpy as np
        img_array = np.frombuffer(file_bytes, np.uint8)
        img_cv = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        pil_img = Image.fromarray(thresh)
        preprocessing = ["grayscale", "otsu_threshold"]
    except Exception:
        pil_img = Image.open(io.BytesIO(file_bytes))
        preprocessing = []

    lang_config = "eng+hin+tam" if _has_langs(["hin", "tam"]) else "eng"

    try:
        data = pytesseract.image_to_data(pil_img, lang=lang_config, output_type=pytesseract.Output.DICT)
    except Exception as e:
        return _error("OCR_FAILED", f"Tesseract error: {str(e)[:200]}")

    words = []
    uncertain_words = []
    full_text_parts = []
    conf_threshold = 60

    for i, word in enumerate(data["text"]):
        word = word.strip()
        if not word:
            continue
        conf = int(data["conf"][i]) if data["conf"][i] != "-1" else 0
        word_entry = {
            "text": word,
            "confidence": conf,
            "bbox": {
                "left": data["left"][i],
                "top": data["top"][i],
                "width": data["width"][i],
                "height": data["height"][i],
            },
        }
        words.append(word_entry)
        full_text_parts.append(word)
        if conf < conf_threshold:
            uncertain_words.append({**word_entry, "reason": "low_confidence"})

    full_text = pytesseract.image_to_string(pil_img, lang=lang_config).strip()
    avg_conf = (sum(w["confidence"] for w in words) / len(words)) if words else 0

    return {
        "status": "COMPLETED",
        "engine": "tesseract",
        "filename": filename,
        "total_pages": 1,
        "processed_pages": 1,
        "pages": [{
            "page": 1,
            "text": full_text,
            "word_count": len(words),
            "confidence": round(avg_conf, 1),
            "source": "tesseract_ocr",
            "uncertain_words": uncertain_words,
        }],
        "full_text": full_text,
        "uncertain_regions": uncertain_words,
        "language_detected": _detect_script(full_text),
        "handwriting_detected": avg_conf < 50,
        "preprocessing": preprocessing,
        "confidence_avg": round(avg_conf, 1),
    }


def _ocr_page_image(page) -> dict:
    """OCR a single PyMuPDF page as an image using Tesseract."""
    import pytesseract
    from PIL import Image
    from backend.config import settings

    if settings.TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

    mat = page.get_pixmap(dpi=200)
    img = Image.frombytes("RGB", [mat.width, mat.height], mat.samples)
    lang_config = "eng+hin+tam" if _has_langs(["hin", "tam"]) else "eng"

    try:
        text = pytesseract.image_to_string(img, lang=lang_config).strip()
        data = pytesseract.image_to_data(img, lang=lang_config, output_type=pytesseract.Output.DICT)
        words = [{"text": w, "confidence": int(c)} for w, c in zip(data["text"], data["conf"]) if w.strip() and c != "-1"]
        uncertain = [w for w in words if w["confidence"] < 60]
        avg_conf = (sum(w["confidence"] for w in words) / len(words)) if words else 0
        return {
            "text": text,
            "word_count": len(words),
            "confidence": round(avg_conf, 1),
            "source": "tesseract_ocr",
            "uncertain_words": uncertain,
        }
    except Exception as e:
        return {"text": "", "source": "tesseract_error", "note": str(e)[:200], "uncertain_words": []}


def _has_langs(langs: list[str]) -> bool:
    try:
        import pytesseract
        installed = pytesseract.get_languages()
        return all(l in installed for l in langs)
    except Exception:
        return False


def _detect_script(text: str) -> str:
    if not text:
        return "unknown"
    devanagari = sum(1 for c in text if "\u0900" <= c <= "\u097F")
    tamil = sum(1 for c in text if "\u0B80" <= c <= "\u0BFF")
    if tamil > 5:
        return "ta"
    if devanagari > 5:
        return "hi"
    return "en"


def _error(code: str, message: str) -> dict:
    return {
        "status": code,
        "error": message,
        "full_text": "",
        "pages": [],
        "uncertain_regions": [],
    }

