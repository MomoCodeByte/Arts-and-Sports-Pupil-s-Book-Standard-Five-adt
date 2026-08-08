"""Generate slow OpenVoice V2 listening samples for physical pages 1-5."""

from pathlib import Path
import os

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

PAGE_TEXTS = {
    1: """Arts and Sports. Pupil's Book. Standard Five. Tanzania Institute of Education.
Certificate of Approval, number two thousand and sixty-nine. The title of this publication is Arts and Sports Pupil's Book, Standard Five. The publisher and author are the Tanzania Institute of Education. I S B N: nine seven eight, nine nine one two, seven six five, two six, nine. This book was approved by the Ministry of Education, Science and Technology on the thirty-first of May, two thousand and twenty-five, as a textbook for Standard Five in primary schools in Tanzania, according to the two thousand and twenty-three syllabus. Doctor Lyabwene M. Mtahabwa, Commissioner for Education.""",
    2: """Arts and Sports Pupil's Book, Standard Five. First edition, two thousand and twenty-five. I S B N: nine seven eight, nine nine one two, seven six five, two six, nine. Published by Tanzania Institute of Education. P. O. Box three five zero nine four, Dar es Salaam, Tanzania. Telephone: plus two five five, seven three five, zero four one, one six eight. Email: director dot general at tie dot go dot tz. Website: www dot tie dot go dot tz. All rights reserved. No part of this textbook may be reproduced, stored in a retrieval system, or transmitted in any form or by any means, without prior written permission from the Tanzania Institute of Education.""",
    3: """Table of contents. Acknowledgements, page four. Introduction, page five. Chapter One: Acting, page one. Concept of acting, page one. Acting techniques, page two. Acting a short play, page eight. Chapter Two: Singing, page sixteen. The concept of singing, page sixteen. Solfa syllables, page seventeen. Singing techniques, page twenty-one. Singing in two parts, page twenty-seven. Chapter Three: Drawing, page thirty-two. The concept of drawing, page thirty-two. Drawing techniques, page thirty-three. Drawing still-life objects, page thirty-eight. Drawing scenery, page forty-one.""",
    4: """Table of contents continued. Chapter Four: Clay modelling, page forty-six. The concept of clay modelling, page forty-six. Clay preparation, page forty-seven. Clay modelling techniques, page forty-nine. Modelling objects, page fifty-three. Chapter Five: Making useful objects, page sixty. The concept of making useful objects, page sixty. Materials for making useful objects, page sixty-one. Making useful objects, page sixty-four. Chapter Six: Physical exercises and traditional games, page seventy-one. Chapter Seven: Modern sports, page eighty-seven. Glossary, page one hundred and five. Bibliography, page one hundred and seven.""",
    5: """Acknowledgements. Tanzania Institute of Education would like to acknowledge the contributions of all organisations and individuals who participated in designing and developing this textbook for Arts and Sports. In particular, the Institute acknowledges the University of Dar es Salaam, the School Quality Assurance Department, teachers' colleges, and primary schools. The translators were Mbezi S. Benjamin, Peter O. Kazeni, Given A. Mbakilwa, and Debora J. Mironjo. The editors were Daines N. Sanga, Kiagho B. Kilonzo, Kassomo A. Mkallyah, Leonard C. Mwenesi, Ismail N. Pangani, James Payovela, Victor K. Mutalemwa, Beno L. Milinga, and Selestine N. Kisabo. The designer was Hamisi A. Kumbuka. The illustrators were Fikiri A. Msimbe, Hance E. Wawar, and Yohana P. Mwenda. The coordinators were Mbezi S. Benjamin and Peter O. Kazeni. The Institute also appreciates the primary school teachers and pupils who participated in the trial phase of the manuscript, and thanks the Government of the United Republic of Tanzania for facilitating the writing and printing of this textbook. Doctor Aneth A. Komba, Director General, Tanzania Institute of Education.""",
}


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

    for page, text in PAGE_TEXTS.items():
        base_wav = OUT / f"page-{page:03d}-base.wav"
        final_wav = OUT / f"page-{page:03d}-sample.wav"
        model.tts_to_file(text, speaker_id, str(base_wav), speed=1.18, quiet=True)
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
