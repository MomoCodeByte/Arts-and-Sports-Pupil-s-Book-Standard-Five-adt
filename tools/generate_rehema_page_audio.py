"""Generate whole-book narration and word timings with Rehema."""

from __future__ import annotations

import argparse
import asyncio
import html
import json
import re
import uuid
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "content" / "rehema"
VOICE = "sw-TZ-RehemaNeural"
RATE = "-12%"


def clean_word(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def narration_words(page_number: int) -> list[str]:
    """Read the corrected HTML word layer, excluding page numbers and footers."""
    path = ROOT / ("index.html" if page_number == 1 else f"pg{page_number:03d}_sec001.html")
    markup = path.read_text(encoding="utf-8")
    pattern = re.compile(
        r'<span class="read-word" style="([^"]*top:([\d.]+)%;[^"]*)">(.*?)</span>',
        re.S,
    )
    words = []
    seen = set()
    for style, top_text, value in pattern.findall(markup):
        word = clean_word(html.unescape(re.sub(r"<[^>]+>", "", value)))
        top = float(top_text)
        key = (word, style)
        if not word or top >= 97 or (top >= 90 and word.isdigit()) or key in seen:
            continue
        seen.add(key)
        words.append(word)
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
                        "word": chunk["text"],
                        "start": chunk["offset"] / 10_000_000,
                        "end": (chunk["offset"] + chunk["duration"]) / 10_000_000,
                    })

    async with semaphore:
        for attempt in range(1, 5):
            try:
                await asyncio.wait_for(stream_once(), timeout=120)
                expected = re.sub(r"[^a-z0-9]+", "", text.lower())
                received = "".join(
                    re.sub(r"[^a-z0-9]+", "", str(item["word"]).lower())
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
                return timings
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
    for page_number in range(1, 113):
        if page_number not in requested:
            continue
        words = narration_words(page_number)
        text = " ".join(word for word in words if word)
        jobs.append((page_number, text))

    async def one(page_number: int, text: str) -> None:
        result = await synthesize(page_number, text, semaphore)
        (OUTPUT / f"page-{page_number:03d}.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"Rehema page {page_number}/112 complete", flush=True)

    await asyncio.gather(*(one(number, text) for number, text in jobs))
    print(f"Generated {len(jobs)} page narrations with {VOICE}.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages", type=int, nargs="*")
    parser.add_argument("--workers", type=int, default=6)
    asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    main()
