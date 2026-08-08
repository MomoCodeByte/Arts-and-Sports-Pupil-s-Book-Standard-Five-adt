"""Create true word timestamps for the five OpenVoice review pages."""

import json
from pathlib import Path

import librosa
import whisper


ROOT = Path(__file__).resolve().parent
AUDIO_DIR = ROOT / "audio-samples" / "openvoice-sw-tz"


def main():
    model = whisper.load_model("base.en", device="cpu")
    for page in range(1, 6):
        audio_path = AUDIO_DIR / f"page-{page:03d}-sample.wav"
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
        output = AUDIO_DIR / f"page-{page:03d}-cues.json"
        output.write_text(json.dumps(cues, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{output.name}: {len(cues)} timed words")


if __name__ == "__main__":
    main()
