import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "content" / "imani" / "page-001.mp3"
CUES = ROOT / "content" / "imani" / "page-001.json"
CUT_START = 2.08
CUT_END = 3.90
REMOVED_WORDS = {"taasisi", "ya", "elimu"}


def frame_info(data: bytes, offset: int):
    if offset + 4 > len(data):
        return None
    header = int.from_bytes(data[offset:offset + 4], "big")
    if header >> 21 != 0x7FF:
        return None
    version_id = (header >> 19) & 0b11
    layer_id = (header >> 17) & 0b11
    bitrate_index = (header >> 12) & 0b1111
    sample_index = (header >> 10) & 0b11
    padding = (header >> 9) & 1
    if version_id == 1 or layer_id != 1 or bitrate_index in {0, 15} or sample_index == 3:
        return None
    bitrates = {
        3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
        2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
        0: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    }
    sample_rates = {
        3: [44100, 48000, 32000],
        2: [22050, 24000, 16000],
        0: [11025, 12000, 8000],
    }
    bitrate = bitrates[version_id][bitrate_index] * 1000
    sample_rate = sample_rates[version_id][sample_index]
    samples = 1152 if version_id == 3 else 576
    coefficient = 144 if version_id == 3 else 72
    length = coefficient * bitrate // sample_rate + padding
    return length, samples / sample_rate


def main():
    data = AUDIO.read_bytes()
    frames = []
    offset = 0
    current_time = 0.0
    while offset < len(data):
        info = frame_info(data, offset)
        if info is None:
            raise RuntimeError(f"Invalid MP3 frame at byte {offset}")
        length, duration = info
        frames.append((offset, length, current_time, duration))
        offset += length
        current_time += duration

    kept = []
    removed_duration = 0.0
    for offset, length, start, duration in frames:
        midpoint = start + duration / 2
        if CUT_START <= midpoint < CUT_END:
            removed_duration += duration
        else:
            kept.append(data[offset:offset + length])
    AUDIO.write_bytes(b"".join(kept))

    payload = json.loads(CUES.read_text(encoding="utf-8"))
    words = []
    for cue in payload["words"]:
        text = (cue.get("text") or cue.get("word") or "").casefold()
        is_swahili_line = (
            CUT_START <= float(cue["start"]) < CUT_END
            and (text in REMOVED_WORDS or text == "tanzania")
        )
        if is_swahili_line:
            continue
        updated = dict(cue)
        if float(updated["start"]) >= CUT_END:
            updated["start"] = round(float(updated["start"]) - removed_duration, 6)
            updated["end"] = round(float(updated["end"]) - removed_duration, 6)
        words.append(updated)
    payload["words"] = words
    CUES.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"removed_seconds={removed_duration:.6f} frames={len(frames)} kept={len(kept)}")


if __name__ == "__main__":
    main()
