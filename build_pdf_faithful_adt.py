import html as html_escape
import json
import re
import shutil
from pathlib import Path

import pymupdf
from lxml import html
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream


ROOT = Path(__file__).resolve().parent
SOURCE_PDF = Path(r"C:\Users\Admin\Downloads\ART & SPORTS 5 a.pdf")
TMP_DIR = ROOT / "tmp" / "pdfs"
CLEAN_PDF = TMP_DIR / "watermark-free-render-source.pdf"
PAGE_IMAGE_DIR = ROOT / "images" / "page-renders"
PAGES_JSON = ROOT / "content" / "pages.json"
TOC_JSON = ROOT / "content" / "toc.json"
MANIFEST = ROOT / "imsmanifest.xml"
EXPECTED_PAGES = 112
RENDER_SCALE = 1.6


def remove_watermark_artifacts():
    reader = PdfReader(SOURCE_PDF)
    if len(reader.pages) != EXPECTED_PAGES:
        raise RuntimeError(f"Expected {EXPECTED_PAGES} pages, found {len(reader.pages)}")
    writer = PdfWriter()
    removed = 0
    for page in reader.pages:
        stream = ContentStream(page.get_contents(), reader)
        filtered = []
        skip_depth = 0
        for operands, operator in stream.operations:
            if not skip_depth and operator == b"BDC" and len(operands) > 1:
                properties = operands[1]
                if hasattr(properties, "get_object"):
                    properties = properties.get_object()
                if hasattr(properties, "get") and str(properties.get("/Subtype")) == "/Watermark":
                    skip_depth = 1
                    removed += 1
                    continue
            if skip_depth:
                if operator in (b"BDC", b"BMC"):
                    skip_depth += 1
                elif operator == b"EMC":
                    skip_depth -= 1
                continue
            filtered.append((operands, operator))
        if skip_depth:
            raise RuntimeError("Unclosed watermark marked-content block")
        stream.operations = filtered
        page.replace_contents(stream)
        writer.add_page(page)
    if removed != EXPECTED_PAGES:
        raise RuntimeError(f"Expected {EXPECTED_PAGES} watermark blocks, removed {removed}")
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    with CLEAN_PDF.open("wb") as output:
        writer.write(output)
    return removed


def render_page_images():
    PAGE_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    document = pymupdf.open(CLEAN_PDF)
    if len(document) != EXPECTED_PAGES:
        raise RuntimeError("Rendered source page count changed")
    page_words = {}
    for index, page in enumerate(document, start=1):
        pixmap = page.get_pixmap(
            matrix=pymupdf.Matrix(RENDER_SCALE, RENDER_SCALE),
            colorspace=pymupdf.csRGB,
            alpha=False,
        )
        pixmap.save(PAGE_IMAGE_DIR / f"pg{index:03d}.png")
        width, height = page.rect.width, page.rect.height
        page_words[index] = [
            (word, x0 / width * 100, y0 / height * 100,
             (x1 - x0) / width * 100, (y1 - y0) / height * 100)
            for x0, y0, x1, y1, word, *_ in page.get_text("words")
            if word.strip() and "FOR ONLINE READING ONLY" not in word.upper()
        ]
    return page_words


def physical_page_files(page_number):
    if page_number == 1:
        return [ROOT / "index.html"]
    return sorted(ROOT.glob(f"pg{page_number:03d}_sec*.html"))


def collect_semantic_content(paths):
    items = []
    seen = set()
    for path in paths:
        tree = html.fromstring(path.read_text(encoding="utf-8"))
        for node in tree.xpath('//*[@data-id and not(.//*[@data-id])]'):
            data_id = node.get("data-id")
            if not data_id or data_id in seen or data_id.startswith("qz"):
                continue
            seen.add(data_id)
            if node.tag.lower() == "img":
                value = (node.get("alt") or "").strip()
            else:
                value = " ".join(" ".join(node.itertext()).split())
            if value:
                items.append((data_id, value))
    return items


def page_filename(page_number):
    return "index.html" if page_number == 1 else f"pg{page_number:03d}_sec001.html"


def build_page_html(page_number, semantic_items, words):
    filename = page_filename(page_number)
    section_id = f"pg{page_number:03d}_sec001"
    hidden = "\n".join(
        f'          <span data-id="{html_escape.escape(data_id, quote=True)}">{html_escape.escape(text)}</span>'
        for data_id, text in semantic_items
    )
    word_layer = "\n".join(
        f'          <span class="read-word" style="left:{x:.4f}%;top:{y:.4f}%;width:{w:.4f}%;height:{h:.4f}%">{html_escape.escape(word)}</span>'
        for word, x, y, w, h in words
    )
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="cache-control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="pragma" content="no-cache">
  <meta http-equiv="expires" content="0">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Arts and Sports Pupil's Book Standard Five - PDF page {page_number}</title>
  <meta name="title-id" content="{section_id}">
  <meta name="page-section-id" content="{page_number}">
  <link href="./content/tailwind_output.css" rel="stylesheet">
  <link href="./assets/libs/fontawesome/css/all.min.css" rel="stylesheet">
  <link href="./assets/fonts.css" rel="stylesheet">
  <style>
    html, body {{ margin: 0; background: #dbeafe; }}
    #content {{ width: 100%; }}
    .pdf-page-shell {{ position: relative; width: min(100%, 980px); margin: 0 auto; background: #fff; }}
    .pdf-page-image {{ display: block; width: 100%; height: auto; }}
    .semantic-page-text {{ position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }}
    .read-word {{ position:absolute; color:transparent; line-height:1; pointer-events:none; border-radius:2px; }}
    .read-word.is-speaking {{ background:rgba(255,230,0,.58); box-shadow:0 0 0 1px rgba(245,158,11,.55); }}
    .page-voice-controls {{ position:fixed; right:12px; top:12px; z-index:70; display:flex; gap:6px; }}
    .page-voice-controls button {{ border:1px solid #1d4ed8; background:#fff; color:#1e3a8a; border-radius:999px; padding:8px 12px; font:600 14px system-ui; box-shadow:0 2px 8px #0003; }}
  </style>
</head>
<body>
  <main>
    <div id="content" class="opacity-0">
      <section data-section-type="pdf_faithful_page" data-section-id="{section_id}" class="pdf-page-shell">
        <img class="pdf-page-image" src="images/page-renders/pg{page_number:03d}.png" alt="Arts and Sports textbook physical page {page_number}">
        <div class="read-word-layer" aria-hidden="true">
{word_layer}
        </div>
        <div class="semantic-page-text" aria-label="Accessible page text">
{hidden}
        </div>
      </section>
    </div>
  </main>
  <div class="page-voice-controls" aria-label="Page voice controls"><button type="button" data-page-read>🔊 Read page</button><button type="button" data-page-stop>■ Stop</button></div>
  <div class="relative z-50" id="interface-container"></div>
  <div class="relative z-50" id="nav-container"></div>
  <script src="./assets/offline-preloader.js?v=20260808-5"></script>
  <script src="./assets/scorm.js"></script>
  <script src="./assets/base.bundle.local.js"></script>
  <script src="./assets/pdf-page-readalong.js?v=20260808-7"></script>
</body>
</html>
'''


def rebuild_html_pages(page_words):
    secondary_files = []
    for page_number in range(1, EXPECTED_PAGES + 1):
        paths = physical_page_files(page_number)
        if not paths:
            raise RuntimeError(f"No HTML source found for physical page {page_number}")
        semantic_items = collect_semantic_content(paths)
        primary = ROOT / page_filename(page_number)
        primary.write_text(build_page_html(page_number, semantic_items, page_words[page_number]), encoding="utf-8", newline="")
        secondary_files.extend(path for path in paths if path != primary)
    for path in secondary_files:
        page_number = int(path.name[2:5])
        target = f"pg{page_number:03d}_sec001.html?v=physical-page-final"
        path.write_text(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="cache-control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="refresh" content="0;url={target}">
<title>Opening physical PDF page {page_number}</title>
<script>location.replace({target!r});</script></head>
<body><p><a href="{target}">Open physical PDF page {page_number}</a></p></body></html>
''', encoding="utf-8", newline="")
    return len(secondary_files)


def rebuild_navigation():
    pages = json.loads(PAGES_JSON.read_text(encoding="utf-8"))
    collapsed = []
    seen_physical = set()
    for item in pages:
        match = re.fullmatch(r"pg(\d{3})_sec\d+", item.get("section_id", ""))
        if not match:
            collapsed.append(item)
            continue
        page_number = int(match.group(1))
        if page_number in seen_physical:
            continue
        seen_physical.add(page_number)
        replacement = dict(item)
        replacement["section_id"] = f"pg{page_number:03d}_sec001"
        replacement["href"] = page_filename(page_number)
        collapsed.append(replacement)
    if len(seen_physical) != EXPECTED_PAGES:
        raise RuntimeError(f"Navigation has {len(seen_physical)} physical pages")
    if sum(item.get("section_id", "").startswith("qz") for item in collapsed) != 33:
        raise RuntimeError("Quiz count changed")
    PAGES_JSON.write_text(json.dumps(collapsed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="")

    toc = json.loads(TOC_JSON.read_text(encoding="utf-8"))
    for item in toc:
        match = re.fullmatch(r"pg(\d{3})_sec\d+", item.get("section_id", ""))
        if match:
            page_number = int(match.group(1))
            item["href"] = page_filename(page_number)
    TOC_JSON.write_text(json.dumps(toc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="")

    for position, item in enumerate(collapsed, start=1):
        html_path = ROOT / item["href"]
        source = html_path.read_text(encoding="utf-8")
        source, count = re.subn(
            r'(<meta name="page-section-id" content=")\d+("\s*/?>)',
            rf'\g<1>{position}\g<2>', source, count=1,
        )
        if count != 1:
            raise RuntimeError(f"Missing page-section-id in {html_path.name}")
        html_path.write_text(source, encoding="utf-8", newline="")


def rebuild_manifest():
    source = MANIFEST.read_text(encoding="utf-8")
    source = re.sub(r'^\s*<file href="pg\d{3}_sec(?!001)\d+\.html"/>\s*\r?\n', "", source, flags=re.MULTILINE)
    source = re.sub(r'^\s*<file href="images/page-renders/pg\d{3}\.png"/>\s*\r?\n', "", source, flags=re.MULTILINE)
    image_entries = "".join(
        f'      <file href="images/page-renders/pg{page_number:03d}.png"/>\n'
        for page_number in range(1, EXPECTED_PAGES + 1)
    )
    marker = "    </resource>"
    if marker not in source:
        raise RuntimeError("Manifest resource closing tag not found")
    source = source.replace(marker, image_entries + marker, 1)
    MANIFEST.write_text(source, encoding="utf-8", newline="")


def main():
    removed = remove_watermark_artifacts()
    page_words = render_page_images()
    deleted_sections = rebuild_html_pages(page_words)
    rebuild_navigation()
    rebuild_manifest()
    shutil.rmtree(TMP_DIR.parent, ignore_errors=True)
    print(f"watermarks_removed={removed}")
    print(f"page_images={len(list(PAGE_IMAGE_DIR.glob('pg*.png')))}")
    print(f"legacy_sections_redirected={deleted_sections}")


if __name__ == "__main__":
    main()
