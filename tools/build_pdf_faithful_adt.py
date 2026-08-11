"""Build a one-PDF-page-to-one-ADT-page faithful reading experience."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
PAGE_COUNT = 112
SOURCE_PDF = Path(r"C:\Users\Admin\Downloads\ART & SPORTS 5 a.pdf")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def page_href(number: int) -> str:
    return "index.html" if number == 1 else f"pg{number:03d}_sec001.html"


def page_html(number: int, texts: dict[str, object], words: list[dict[str, object]], page_width: float, page_height: float) -> str:
    prefix = f"pg{number:03d}_"
    transcript = []
    for key, value in texts.items():
        if key.startswith(prefix) and isinstance(value, str) and value.strip():
            transcript.append(
                f'<span data-id="{html.escape(key, quote=True)}">'
                f'{html.escape(value)}</span>'
            )
    hidden = "\n        ".join(transcript)
    word_layer = []
    for index, word in enumerate(words):
        left = float(word["x0"]) / page_width * 100
        top = float(word["top"]) / page_height * 100
        width = (float(word["x1"]) - float(word["x0"])) / page_width * 100
        height = (float(word["bottom"]) - float(word["top"])) / page_height * 100
        word_layer.append(
            '<span class="pdf-word" '
            f'data-word-index="{index}" '
            f'style="left:{left:.5f}%;top:{top:.5f}%;width:{width:.5f}%;height:{height:.5f}%">'
            f'{html.escape(str(word["text"]))}</span>'
        )
    positioned_words = "\n          ".join(word_layer)
    image = f"images/pdf-pages/page-{number:03d}.jpg"
    section_id = f"pg{number:03d}_sec001"
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Arts and Sports Pupil's Book Standard Five - Page {number}</title>
  <meta name="title-id" content="{section_id}" />
  <meta name="page-section-id" content="{number}" />
  <link href="./content/tailwind_output.css" rel="stylesheet" />
  <link href="./assets/libs/fontawesome/css/all.min.css" rel="stylesheet" />
  <link href="./assets/fonts.css" rel="stylesheet" />
  <style>
    html, body {{ margin: 0; min-height: 100%; background: #d8dde2; }}
    body {{ display: flex; justify-content: center; align-items: flex-start; }}
    main {{ width: 100%; padding: 20px 12px 112px; box-sizing: border-box; }}
    #content {{ opacity: 1 !important; width: min(100%, 992px); margin: 0 auto; }}
    .pdf-page {{ position: relative; margin: 0 auto; background: #fff; box-shadow: 0 8px 30px rgba(0,0,0,.22); }}
    .pdf-page img {{ display: block; width: 100%; height: auto; }}
    .pdf-text-layer {{ position: absolute; inset: 0; pointer-events: none; overflow: hidden; }}
    .pdf-word {{
      position: absolute; display: block; overflow: hidden; color: transparent;
      font-size: 1px; line-height: 1; border-radius: 2px;
    }}
    .pdf-word-active {{
      background: rgba(255, 224, 46, .68);
      box-shadow: 0 0 0 1px rgba(170, 125, 0, .30);
      mix-blend-mode: multiply;
    }}
    .accessible-transcript {{
      position: absolute !important; width: 1px !important; height: 1px !important;
      padding: 0 !important; margin: -1px !important; overflow: hidden !important;
      clip: rect(0,0,0,0) !important; white-space: nowrap !important; border: 0 !important;
    }}
    @media (max-width: 640px) {{ main {{ padding: 0 0 96px; }} .pdf-page {{ box-shadow: none; }} }}
  </style>
</head>
<body>
  <main>
    <h1 class="accessible-transcript">Arts and Sports, PDF page {number}</h1>
    <div id="content">
      <article class="pdf-page" data-section-type="image" data-section-id="{section_id}">
        <img src="./{image}" alt="Arts and Sports textbook, PDF page {number}" />
        <div class="pdf-text-layer" aria-hidden="true">
          {positioned_words}
        </div>
      </article>
      <div class="accessible-transcript" aria-label="Accessible page transcript">
        {hidden}
      </div>
    </div>
  </main>
  <div class="relative z-50" id="interface-container"></div>
  <div class="relative z-50" id="nav-container"></div>
  <script src="./assets/scorm.js"></script>
  <script src="./assets/pdf-word-highlight.js?v=21"></script>
  <script src="./assets/base.bundle.local.js"></script>
</body>
</html>
'''


def main() -> None:
    texts = load_json(ROOT / "content/i18n/en/texts.json")
    pages = []
    with pdfplumber.open(SOURCE_PDF) as pdf:
        if len(pdf.pages) != PAGE_COUNT:
            raise ValueError(f"Expected {PAGE_COUNT} PDF pages, found {len(pdf.pages)}")
        for number, pdf_page in enumerate(pdf.pages, 1):
            image = ROOT / f"images/pdf-pages/page-{number:03d}.jpg"
            if not image.is_file():
                raise FileNotFoundError(image)
            href = page_href(number)
            words = pdf_page.extract_words(use_text_flow=True, keep_blank_chars=False)
            (ROOT / href).write_text(
                page_html(number, texts, words, float(pdf_page.width), float(pdf_page.height)),
                encoding="utf-8",
                newline="\n",
            )
            pages.append({
                "section_id": f"pg{number:03d}_sec001",
                "href": href,
                "page_number": number,
            })

    (ROOT / "content/pages.json").write_text(
        json.dumps(pages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    toc_path = ROOT / "content/toc.json"
    toc = load_json(toc_path)
    seen: set[str] = set()
    revised = []
    for entry in toc:
        section = str(entry.get("section_id", ""))
        if not section.startswith("pg"):
            continue
        number = int(section[2:5])
        primary = f"pg{number:03d}_sec001"
        signature = f"{primary}|{entry.get('title', '')}"
        if signature in seen:
            continue
        seen.add(signature)
        updated = dict(entry)
        updated["section_id"] = primary
        updated["href"] = page_href(number)
        revised.append(updated)
    toc_path.write_text(
        json.dumps(revised, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    manifest_path = ROOT / "imsmanifest.xml"
    manifest = manifest_path.read_text(encoding="utf-8-sig")
    page_files = [page_href(number) for number in range(1, PAGE_COUNT + 1)]
    image_files = [f"images/pdf-pages/page-{number:03d}.jpg" for number in range(1, PAGE_COUNT + 1)]
    narration_files = [
        str(path.relative_to(ROOT)).replace("\\", "/")
        for path in sorted((ROOT / "content/imani").glob("*"))
        if path.is_file()
    ] if (ROOT / "content/imani").is_dir() else []
    file_block = "\n".join(
        f'      <file href="{href}"/>'
        for href in page_files + image_files + ["assets/pdf-word-highlight.js"] + narration_files
    )
    manifest = re.sub(
        r"(?s)(<resource\b[^>]*>).*?(\n\s*</resource>)",
        lambda match: match.group(1) + "\n" + file_block + match.group(2),
        manifest,
        count=1,
    )
    manifest_path.write_text(manifest, encoding="utf-8", newline="\n")
    print(f"Built {PAGE_COUNT} faithful ADT pages")


if __name__ == "__main__":
    main()
