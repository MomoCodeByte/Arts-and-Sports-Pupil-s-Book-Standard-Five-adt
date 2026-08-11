"""Regenerate clean Table of Contents narration for pages 3 and 4."""

from __future__ import annotations

import asyncio
import html
import json
import re
import uuid
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "content" / "imani"
PAGES = (3, 4)
VOICE = "sw-TZ-RehemaNeural"
RATE = "-12%"
WORD_PATTERN = re.compile(
    r'<span class="read-word" style="([^"]*top:([\d.]+)%;[^"]*)">(.*?)</span>',
    re.S,
)
PAGE_NUMBER = re.compile(r"^(?:\d+|[ivxlcdm]+)$", re.I)


def narration_tokens(page: int) -> list[str]:
    path = ROOT / f"pg{page:03d}_sec001.html"
    markup = path.read_text(encoding="utf-8")
    tokens: list[str] = []
    seen: set[tuple[str, str]] = set()
    for style, top_text, raw_value in WORD_PATTERN.findall(markup):
        value = html.unescape(re.sub(r"<[^>]+>", "", raw_value))
        value = re.sub(r"\.{3,}", " ", value)
        value = " ".join(value.split())
        top = float(top_text)
        key = (value, style)
        if (
            not value
            or top >= 97
            or (top >= 90 and PAGE_NUMBER.fullmatch(value))
            or key in seen
        ):
            continue
        seen.add(key)
        tokens.extend(value.split())
    if [token.casefold() for token in tokens[:3]] != ["table", "of", "contents"]:
        raise RuntimeError(f"Page {page}: Table of Contents is not first")
    return tokens


def narration_text(tokens: list[str]) -> str:
    result = []
    for index, token in enumerate(tokens):
        if index >= 3 and PAGE_NUMBER.fullmatch(token):
            result.append(f"{token}.")
        elif index == 2:
            result.append(f"{token}.")
        else:
            result.append(token)
    return " ".join(result)


async def synthesize(page: int) -> None:
    tokens = narration_tokens(page)
    text = narration_text(tokens)
    audio_path = OUTPUT / f"page-{page:03d}.mp3"
    cues_path = OUTPUT / f"page-{page:03d}.json"
    temporary = audio_path.with_name(f"{audio_path.stem}.{uuid.uuid4().hex}.part.mp3")

    for attempt in range(1, 5):
        cues: list[dict[str, object]] = []
        try:
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
                        cues.append({
                            "text": chunk["text"],
                            "start": round(chunk["offset"] / 10_000_000, 6),
                            "end": round((chunk["offset"] + chunk["duration"]) / 10_000_000, 6),
                        })
            if temporary.stat().st_size < 1_000 or not cues:
                raise RuntimeError("Incomplete narration")
            if [str(cue["text"]).casefold() for cue in cues[:3]] != ["table", "of", "contents"]:
                raise RuntimeError("Narration heading is not first")
            temporary.replace(audio_path)
            cues_path.write_text(
                json.dumps({"audio": audio_path.name, "words": cues}, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            number_pauses = []
            for index, cue in enumerate(cues[:-1]):
                if PAGE_NUMBER.fullmatch(str(cue["text"])):
                    number_pauses.append(float(cues[index + 1]["start"]) - float(cue["end"]))
            print(
                f"page-{page:03d}: clean Rehema audio, words={len(cues)}, "
                f"minimum page-number pause={min(number_pauses):.3f}s"
            )
            return
        except Exception:
            temporary.unlink(missing_ok=True)
            if attempt == 4:
                raise
            await asyncio.sleep(attempt * 2)


async def main() -> None:
    for page in PAGES:
        await synthesize(page)


if __name__ == "__main__":
    asyncio.run(main())
