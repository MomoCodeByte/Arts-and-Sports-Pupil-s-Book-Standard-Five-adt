"""Create true word timestamps for the five OpenVoice review pages."""

import argparse
import json
from pathlib import Path

import librosa
import whisper


ROOT = Path(__file__).resolve().parent
AUDIO_DIR = ROOT / "audio-samples" / "openvoice-sw-tz"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages", default="1-5")
    parser.add_argument("--audio-dir", type=Path, default=AUDIO_DIR)
    parser.add_argument("--model", default="base.en")
    args = parser.parse_args()
    if "-" in args.pages:
        first, last = (int(value) for value in args.pages.split("-", 1))
        pages = range(first, last + 1)
    else:
        pages = [int(args.pages)]
    audio_dir = args.audio_dir.resolve()
    model = whisper.load_model(args.model, device="cpu")
    for page in pages:
        audio_path = audio_dir / f"page-{page:03d}-sample.wav"
        audio, _ = librosa.load(str(audio_path), sr=16000, mono=True)
        result = model.transcribe(
            audio,
            language="en",
            word_timestamps=True,
            fp16=False,
            beam_size=5,
            best_of=5,
        )
        cues = [
            {
                "word": item["word"].strip(),
                "start": round(float(item["start"]), 3),
                "end": round(float(item["end"]), 3),
            }
            for segment in result.get("segments", [])
            for item in segment.get("words", [])
            if item.get("word", "").strip()
        ]
        output = audio_dir / f"page-{page:03d}-cues.json"
        output.write_text(json.dumps(cues, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{output.name}: {len(cues)} timed words")


if __name__ == "__main__":
    main()
