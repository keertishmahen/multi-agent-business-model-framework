"""Text extraction and chunking for user-uploaded knowledge (the RAG step).

Mirrors the SunMoksha reference (BMC_GenAI app.py, "Knowledge Upload & RAG
Integration"): PDF/TXT uploads or pasted text, split with a recursive
character splitter at 1000 chars / 150 overlap. Implemented without LangChain
so the container stays small, and DOCX is parsed properly rather than being
read as raw bytes.
"""

from __future__ import annotations

import io
import logging
import re

log = logging.getLogger(__name__)

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150
MAX_FILES_PER_REQUEST = 5
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_CHUNKS_PER_SESSION = 300
# Decompression-bomb guards: a 10 MB DOCX/PDF can inflate to gigabytes.
MAX_DOCX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024
MAX_DOCX_COMPRESSION_RATIO = 100
MAX_PDF_PAGES = 300
MAX_EXTRACTED_CHARS = 2_000_000
# Whole multipart body: every file at its cap plus form fields and boundaries.
MAX_REQUEST_BYTES = MAX_FILES_PER_REQUEST * MAX_FILE_BYTES + 1024 * 1024
SUPPORTED_EXTENSIONS = (".pdf", ".docx", ".txt", ".md")

_SEPARATORS = ["\n\n", "\n", ". ", " ", ""]


class UnsupportedDocument(ValueError):
    """The file type cannot be read."""


class DocumentTooLarge(ValueError):
    """A size or count limit was exceeded."""


def safe_source_name(filename: str) -> str:
    """Strip any path and odd characters so the name is safe to display."""
    base = re.split(r"[\\/]", filename or "")[-1]
    cleaned = re.sub(r"[^A-Za-z0-9 _.()-]", "_", base).strip()
    # Truncate the stem, never the extension — extract_text dispatches on it.
    stem, dot, ext = cleaned.rpartition(".")
    if dot and len(ext) <= 5:
        return (stem[: 120 - len(ext) - 1].strip() or "document") + "." + ext
    return cleaned[:120] or "document"


def extract_text(filename: str, data: bytes) -> str:
    """Return the plain text of an uploaded file."""
    if len(data) > MAX_FILE_BYTES:
        raise DocumentTooLarge(
            f"{filename} is larger than {MAX_FILE_BYTES // (1024 * 1024)} MB"
        )

    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return _cap(_extract_pdf(data))
    if name.endswith(".docx"):
        return _cap(_extract_docx(data))
    if name.endswith((".txt", ".md")):
        return _cap(data.decode("utf-8", errors="ignore"))
    raise UnsupportedDocument(
        f"{filename}: unsupported file type (use {', '.join(SUPPORTED_EXTENSIONS)})"
    )


def _cap(text: str) -> str:
    if len(text) > MAX_EXTRACTED_CHARS:
        raise DocumentTooLarge(
            f"Document text is longer than {MAX_EXTRACTED_CHARS:,} characters — upload a shorter extract"
        )
    return text


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(data))
        if len(reader.pages) > MAX_PDF_PAGES:
            raise DocumentTooLarge(f"PDF has more than {MAX_PDF_PAGES} pages")
        pages: list[str] = []
        total = 0
        for page in reader.pages:
            text = (page.extract_text() or "").strip()
            total += len(text)
            if total > MAX_EXTRACTED_CHARS:
                raise DocumentTooLarge(
                    f"PDF text is longer than {MAX_EXTRACTED_CHARS:,} characters"
                )
            pages.append(text)
    except DocumentTooLarge:
        raise
    except Exception as exc:  # noqa: BLE001 - corrupt PDFs raise many types
        raise UnsupportedDocument(f"Could not read PDF: {exc}") from exc
    return "\n\n".join(p for p in pages if p)


def _check_zip_bomb(data: bytes) -> None:
    """Reject DOCX archives that inflate far beyond their upload size."""
    import zipfile

    try:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            infos = zf.infolist()
    except zipfile.BadZipFile as exc:
        raise UnsupportedDocument(f"Could not read DOCX: {exc}") from exc
    uncompressed = sum(i.file_size for i in infos)
    compressed = sum(i.compress_size for i in infos) or 1
    if (
        uncompressed > MAX_DOCX_UNCOMPRESSED_BYTES
        or uncompressed / compressed > MAX_DOCX_COMPRESSION_RATIO
    ):
        raise DocumentTooLarge("DOCX expands to an unreasonable size and was rejected")


def _extract_docx(data: bytes) -> str:
    from docx import Document

    _check_zip_bomb(data)
    try:
        doc = Document(io.BytesIO(data))
    except Exception as exc:  # noqa: BLE001
        raise UnsupportedDocument(f"Could not read DOCX: {exc}") from exc

    parts = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                parts.append(" | ".join(cells))
    return "\n\n".join(parts)


def split_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Recursive character splitter, equivalent to LangChain's defaults.

    Splits on the coarsest separator that keeps pieces under `size`, merges
    neighbouring pieces back up to `size`, and carries `overlap` characters of
    context from the end of one chunk into the next.
    """
    text = (text or "").strip()
    if not text:
        return []
    pieces = _split_recursive(text, size, _SEPARATORS)
    return _merge(pieces, size, overlap)


def _split_recursive(text: str, size: int, separators: list[str]) -> list[str]:
    if len(text) <= size:
        return [text]
    for i, sep in enumerate(separators):
        if sep == "":
            return [text[j : j + size] for j in range(0, len(text), size)]
        if sep in text:
            out: list[str] = []
            parts = text.split(sep)
            for k, part in enumerate(parts):
                # Keep the separator attached so sentences stay readable.
                piece = part + (sep if k < len(parts) - 1 else "")
                if not piece.strip():
                    continue
                if len(piece) > size:
                    out.extend(_split_recursive(piece, size, separators[i + 1 :]))
                else:
                    out.append(piece)
            return out
    return [text]


def _merge(pieces: list[str], size: int, overlap: int) -> list[str]:
    chunks: list[str] = []
    current = ""
    for piece in pieces:
        if current and len(current) + len(piece) > size:
            chunks.append(current.strip())
            tail = current[-overlap:] if overlap else ""
            # Start the overlap on a word boundary where possible.
            space = tail.find(" ")
            if 0 <= space < len(tail) - 1:
                tail = tail[space + 1 :]
            current = tail if len(tail) + len(piece) <= size else ""
        current += piece
    if current.strip():
        chunks.append(current.strip())
    return [c for c in chunks if c]
