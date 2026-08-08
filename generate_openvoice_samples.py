"""Generate slow OpenVoice V2 listening samples for physical pages 1-5."""

from pathlib import Path
import os
import re
from html.parser import HTMLParser

import librosa
import soundfile as sf
import torch
from melo.api import TTS
from openvoice.api import ToneColorConverter


ROOT = Path(__file__).resolve().parent
TOOLS = ROOT.parent / "tools"
OPENVOICE = TOOLS / "OpenVoice"
CHECKPOINTS = OPENVOICE / "checkpoints_v2"
OUT = ROOT / "audio-samples" / "openvoice-sw-tz"
REFERENCE_MP3 = Path(
    r"C:\Users\Admin\Desktop\TIE-BOOK-LIST\KISWAHILI-LENYE-MABORESHO-YOTE-adt"
    r"\content\i18n\sw-TZ\audio\pg098_n0041_easy_read.mp3"
)

class ReadWordParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.entries = []
        self.current_style = None
        self.current_parts = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "span" and "read-word" in values.get("class", "").split():
            self.current_style = values.get("style", "")
            self.current_parts = []

    def handle_data(self, data):
        if self.current_style is not None:
            self.current_parts.append(data)

    def handle_endtag(self, tag):
        if tag == "span" and self.current_style is not None:
            self.entries.append((" ".join("".join(self.current_parts).split()), self.current_style))
            self.current_style = None
            self.current_parts = []


def visible_page_text(page: int) -> str:
    """Return the visible overlay words in their exact DOM/highlight order."""
    path = ROOT / ("index.html" if page == 1 else f"pg{page:03d}_sec001.html")
    parser = ReadWordParser()
    parser.feed(path.read_text(encoding="utf-8"))
    words = []
    seen = set()
    for word, style in parser.entries:
        top_match = re.search(r"top:([0-9.]+)%", style)
        if top_match and float(top_match.group(1)) >= 97:
            continue
        key = (word, style)
        if not word or key in seen:
            continue
        seen.add(key)
        words.append(word)
    return " ".join(words)


def main() -> None:
    os.environ.setdefault("HF_HOME", str(TOOLS / "hf-cache"))
    OUT.mkdir(parents=True, exist_ok=True)

    converter = ToneColorConverter(
        str(CHECKPOINTS / "converter" / "config.json"), device="cpu"
    )
    converter.load_ckpt(str(CHECKPOINTS / "converter" / "checkpoint.pth"))

    reference_wav = OUT / "reference-sw-tz.wav"
    audio, _ = librosa.load(str(REFERENCE_MP3), sr=22050, mono=True)
    # A clean 18-second excerpt is enough for stable tone extraction.
    sf.write(reference_wav, audio[: 18 * 22050], 22050)
    target_se = converter.extract_se(str(reference_wav))

    model = TTS(language="EN_NEWEST", device="cpu")
    speaker_id = model.hps.data.spk2id["EN-Newest"]
    source_se = torch.load(
        CHECKPOINTS / "base_speakers" / "ses" / "en-newest.pth",
        map_location="cpu",
    )

    for page in range(1, 6):
        text = visible_page_text(page)
        base_wav = OUT / f"page-{page:03d}-base.wav"
        final_wav = OUT / f"page-{page:03d}-sample.wav"
        model.tts_to_file(text, speaker_id, str(base_wav), speed=1.35, quiet=True)
        converter.convert(
            audio_src_path=str(base_wav),
            src_se=source_se,
            tgt_se=target_se,
            output_path=str(final_wav),
            message="@MyShell",
        )
        base_wav.unlink(missing_ok=True)
        print(f"Generated {final_wav.name}")


if __name__ == "__main__":
    main()
