"""Remove InDesign footer cues and merge validated per-page Imani timings."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PDF = Path(r"C:\Users\Admin\Downloads\ART & SPORTS 5 a.pdf")
OUTPUT = ROOT / "content" / "imani"


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value).lower())


def main() -> None:
    timing_path = OUTPUT / "timecodes.json"
    combined = json.loads(timing_path.read_text(encoding="utf-8"))

    with pdfplumber.open(SOURCE_PDF) as document:
        for page_number, page in enumerate(document.pages, 1):
            words = page.extract_words(use_text_flow=True)
            desired = ""
            for word in words:
                if float(word.get("top", 0)) >= 730:
                    break
                desired += normalized(word["text"])

            saved = OUTPUT / f"page-{page_number:03d}.json"
            entry = (
                json.loads(saved.read_text(encoding="utf-8"))
                if saved.exists()
                else combined[str(page_number)]
            )
            accumulated = ""
            kept = []
            for cue in entry["words"]:
                token = normalized(cue["text"])
                if not token:
                    continue
                candidate = accumulated + token
                if len(candidate) > len(desired) or not desired.startswith(candidate):
                    break
                kept.append(cue)
                accumulated = candidate
                if accumulated == desired:
                    break
            if accumulated != desired:
                raise ValueError(
                    f"Page {page_number}: narration ends at {len(accumulated)}/{len(desired)} characters"
                )
            entry["words"] = kept
            combined[str(page_number)] = entry

    timing_path.write_text(
        json.dumps(combined, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Cleaned and merged Imani timings for {len(combined)} pages")


if __name__ == "__main__":
    main()
