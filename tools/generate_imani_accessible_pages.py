"""Add meaningful visual descriptions to the existing Imani page narration.

The script reads the semantic page DOM in reading order. Meaningful ``img`` alt
text and CSS/SVG-style ``role=img`` labels are spoken where the visual occurs;
decorative images with empty alt text remain silent.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import uuid
from difflib import SequenceMatcher
from pathlib import Path

import edge_tts
from lxml import html as lxml_html


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "content" / "imani"
VOICE = "en-TZ-ImaniNeural"
RATE = "-12%"
SKIP_TAGS = {"script", "style", "button", "input", "select", "textarea"}


def page_path(page: int) -> Path:
    return ROOT / ("index.html" if page == 1 else f"pg{page:03d}_sec001.html")


def classes(element) -> set[str]:
    return set((element.get("class") or "").split())


def clean_text(value: str | None) -> str:
    return " ".join((value or "").split())


def is_hidden(element) -> bool:
    return (
        element.get("aria-hidden") == "true"
        or "page-narration-hooks" in classes(element)
        or "semantic-page-text" in classes(element)
    )


def visual_description(element) -> str:
    if element.tag == "img":
        return clean_text(element.get("alt"))
    if element.get("role") == "img":
        return clean_text(element.get("aria-label"))
    return ""


def roman(number: int) -> str:
    values = (
        (1000, "m"), (900, "cm"), (500, "d"), (400, "cd"),
        (100, "c"), (90, "xc"), (50, "l"), (40, "xl"),
        (10, "x"), (9, "ix"), (5, "v"), (4, "iv"), (1, "i"),
    )
    result = ""
    for value, symbol in values:
        while number >= value:
            result += symbol
            number -= value
    return result


def list_marker(element) -> str:
    if element.tag != "li":
        return ""
    visible_text = clean_text(" ".join(element.itertext()))
    if re.match(r"^(?:\(?[a-z0-9ivxlcdm]+\)?[.)])\s+", visible_text, re.I):
        return ""
    parent = element.getparent()
    if parent is None or parent.tag != "ol":
        return ""
    if "contents-list" in classes(parent):
        return ""
    items = [child for child in parent if child.tag == "li"]
    number = int(parent.get("start") or 1) + items.index(element)
    list_type = (parent.get("type") or "").strip()
    parent_classes = classes(parent)
    if list_type in {"a", "A"} or "alpha-list" in parent_classes or "activity-alpha-list" in parent_classes:
        marker = chr(ord("a") + number - 1)
        if list_type == "A":
            marker = marker.upper()
    elif list_type in {"i", "I"} or "roman-list" in parent_classes:
        marker = roman(number)
        if list_type == "I":
            marker = marker.upper()
    else:
        marker = str(number)
    return f"{marker}."


def page_chunks(page: int) -> tuple[list[str], int]:
    document = lxml_html.fromstring(page_path(page).read_text(encoding="utf-8"))
    roots = document.xpath(
        "//*[contains(concat(' ', normalize-space(@class), ' '), ' book-page ')]"
    )
    if not roots:
        raise RuntimeError(f"Page {page} has no .book-page element")
    chunks: list[str] = []
    visuals = 0

    def add(value: str | None) -> None:
        cleaned = clean_text(value)
        if cleaned:
            chunks.append(cleaned)

    def visit(element) -> None:
        nonlocal visuals
        if not isinstance(element.tag, str):
            return
        if element.tag in SKIP_TAGS or is_hidden(element):
            return

        description = visual_description(element)
        if description:
            chunks.append(f"Image description: {description}")
            visuals += 1
            return
        if element.tag == "img" or element.get("role") == "img":
            return

        add(list_marker(element))
        add(element.text)
        for child in element:
            visit(child)
            add(child.tail)

    visit(roots[0])
    return chunks, visuals


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


async def synthesize(page: int, text: str, semaphore: asyncio.Semaphore) -> None:
    audio_path = OUTPUT / f"page-{page:03d}.mp3"
    cues_path = OUTPUT / f"page-{page:03d}.json"
    temporary = audio_path.with_name(f"{audio_path.stem}.{uuid.uuid4().hex}.part.mp3")

    async with semaphore:
        for attempt in range(1, 5):
            cues: list[dict[str, object]] = []
            try:
                communicator = edge_tts.Communicate(
                    text,
                    VOICE,
                    rate=RATE,
                    boundary="WordBoundary",
                )
                async with asyncio.timeout(90):
                    with temporary.open("wb") as stream:
                        async for chunk in communicator.stream():
                            if chunk["type"] == "audio":
                                stream.write(chunk["data"])
                            elif chunk["type"] == "WordBoundary":
                                cues.append({
                                    "text": chunk["text"],
                                    "start": round(chunk["offset"] / 10_000_000, 6),
                                    "end": round(
                                        (chunk["offset"] + chunk["duration"]) / 10_000_000,
                                        6,
                                    ),
                                })
                if not cues:
                    raise RuntimeError("Incomplete Imani narration")
                cue_duration = float(cues[-1]["end"])
                minimum_audio_bytes = max(1_000, int(cue_duration * 4_000))
                if temporary.stat().st_size < minimum_audio_bytes:
                    raise RuntimeError(
                        "Incomplete Imani audio: "
                        f"{temporary.stat().st_size} bytes for {cue_duration:.1f} seconds"
                    )
                spoken = "".join(normalized(str(cue["text"])) for cue in cues)
                expected = normalized(text)
                boundary_match = SequenceMatcher(None, spoken, expected).ratio()
                if boundary_match < 0.985:
                    raise RuntimeError(
                        f"Imani word boundaries match only {boundary_match:.1%} of the page text"
                    )
                temporary.replace(audio_path)
                cues_path.write_text(
                    json.dumps(
                        {"audio": audio_path.name, "words": cues},
                        ensure_ascii=False,
                        indent=2,
                    ) + "\n",
                    encoding="utf-8",
                )
                return
            except Exception as error:
                temporary.unlink(missing_ok=True)
                if attempt == 4:
                    raise
                print(
                    f"Imani page {page} attempt {attempt} failed: {error}",
                    flush=True,
                )
                await asyncio.sleep(attempt * 2)


async def run(args: argparse.Namespace) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    requested = args.pages or list(range(1, 113))
    jobs: list[tuple[int, str, int]] = []
    for page in requested:
        chunks, visuals = page_chunks(page)
        if visuals or args.include_pages_without_visuals:
            jobs.append((page, " ".join(chunks), visuals))

    semaphore = asyncio.Semaphore(args.workers)

    async def one(page: int, text: str, visuals: int) -> None:
        await synthesize(page, text, semaphore)
        print(f"Imani page {page}/112 complete; visual descriptions={visuals}", flush=True)

    await asyncio.gather(*(one(page, text, visuals) for page, text, visuals in jobs))
    print(f"Generated accessible Imani narration for {len(jobs)} pages with {VOICE}.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages", type=int, nargs="*")
    parser.add_argument("--workers", type=int, default=5)
    parser.add_argument("--include-pages-without-visuals", action="store_true")
    asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    main()
