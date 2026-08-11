"""Generate page narration and word timings with en-TZ-ImaniNeural."""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import uuid
from pathlib import Path

import edge_tts
import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PDF = Path(r"C:\Users\Admin\Downloads\ART & SPORTS 5 a.pdf")
OUTPUT = ROOT / "content" / "imani"
VOICE = "en-TZ-ImaniNeural"
RATE = "-12%"


def clean_word(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def narration_words(page: pdfplumber.page.Page) -> list[str]:
    """Keep printed book content while excluding the duplicated InDesign footer."""
    words = []
    for item in page.extract_words(use_text_flow=True):
        if float(item.get("top", 0)) >= 730:
            break
        words.append(clean_word(item["text"]))
    return words


async def synthesize(page_number: int, text: str, semaphore: asyncio.Semaphore) -> dict:
    destination = OUTPUT / f"page-{page_number:03d}.mp3"
    temporary = destination.with_name(f"{destination.stem}.{uuid.uuid4().hex}.part.mp3")
    timings: list[dict[str, object]] = []

    async def stream_once() -> None:
        communicator = edge_tts.Communicate(
            text,
            VOICE,
            rate=RATE,
            boundary="WordBoundary",
        )
        with temporary.open("wb") as stream:
            async for chunk in communicator.stream():
                if chunk["type"] == "audio":
                    stream.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    timings.append({
                        "text": chunk["text"],
                        "start": chunk["offset"] / 10_000_000,
                        "end": (chunk["offset"] + chunk["duration"]) / 10_000_000,
                    })

    async with semaphore:
        for attempt in range(1, 5):
            try:
                await asyncio.wait_for(stream_once(), timeout=120)
                expected = re.sub(r"[^a-z0-9]+", "", text.lower())
                received = "".join(
                    re.sub(r"[^a-z0-9]+", "", str(item["text"]).lower())
                    for item in timings
                )
                audio_seconds = temporary.stat().st_size / 6_000
                last_cue_end = float(timings[-1]["end"]) if timings else 0
                if (
                    temporary.stat().st_size < 1_000
                    or not timings
                    or received != expected
                    or audio_seconds < last_cue_end - 1.0
                ):
                    raise RuntimeError("Rehema returned incomplete narration")
                temporary.replace(destination)
                return {"audio": destination.name, "words": timings}
            except Exception:
                temporary.unlink(missing_ok=True)
                timings.clear()
                if attempt == 4:
                    raise
                await asyncio.sleep(attempt * 2)
    raise RuntimeError(page_number)


async def run(args: argparse.Namespace) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    requested = set(args.pages or range(1, 113))
    semaphore = asyncio.Semaphore(args.workers)
    jobs = []
    with pdfplumber.open(SOURCE_PDF) as pdf:
        for page_number, page in enumerate(pdf.pages, 1):
            if page_number not in requested:
                continue
            words = narration_words(page)
            text = " ".join(word for word in words if word)
            jobs.append((page_number, text))

    timing_path = OUTPUT / "timecodes.json"
    combined = json.loads(timing_path.read_text(encoding="utf-8")) if timing_path.exists() else {}

    async def one(page_number: int, text: str) -> None:
        result = await synthesize(page_number, text, semaphore)
        combined[str(page_number)] = result
        (OUTPUT / f"page-{page_number:03d}.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"Imani page {page_number}/112 complete", flush=True)

    await asyncio.gather(*(one(number, text) for number, text in jobs))
    for timing_file in sorted(OUTPUT.glob("page-*.json")):
        page_number = int(timing_file.stem.split("-")[1])
        combined[str(page_number)] = json.loads(timing_file.read_text(encoding="utf-8"))
    timing_path.write_text(
        json.dumps(combined, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Generated {len(jobs)} page narrations with {VOICE}.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages", type=int, nargs="*")
    parser.add_argument("--workers", type=int, default=6)
    asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    main()
