from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
PAGES = json.loads((ROOT / "content/pages.json").read_text(encoding="utf-8"))
TOC = json.loads((ROOT / "content/toc.json").read_text(encoding="utf-8"))
AUDIO_PATHS = [ROOT / "content/i18n/en/audios.json", ROOT / "content/i18n/en-KE/audios.json"]
AUDIO = [json.loads(path.read_text(encoding="utf-8")) for path in AUDIO_PATHS]
ERRORS = []

if len(PAGES) != 112:
    ERRORS.append(f"pages.json has {len(PAGES)} records instead of 112")

seen_sections = set()
for expected_number, record in enumerate(PAGES, 1):
    section = record["section_id"]
    href = record["href"]
    path = ROOT / href
    if record["page_number"] != expected_number:
        ERRORS.append(f"page number mismatch at {href}")
    if section in seen_sections:
        ERRORS.append(f"duplicate section id {section}")
    seen_sections.add(section)
    if not path.exists():
        ERRORS.append(f"missing page file {href}")
        continue
    html = path.read_text(encoding="utf-8")
    if f'content="{section}"' not in html or f'data-section-id="{section}"' not in html:
        ERRORS.append(f"metadata mismatch in {href}")
    if f'content="{expected_number}"' not in html:
        ERRORS.append(f"page number metadata mismatch in {href}")
    if 'data-section-type=' not in html or 'class="book-page' not in html:
        ERRORS.append(f"semantic page wrapper missing in {href}")
    if re.search(r'pdf-page-image|page-renders|FOR ONLINE READING ONLY|For online reading only|\.indd|17/09/2025', html):
        ERRORS.append(f"forbidden raster or production metadata in {href}")
    hook = re.search(r'<div class="page-narration-hooks semantic-page-text"[^>]*>(.*?)</div>', html, re.S)
    if not hook:
        ERRORS.append(f"dedicated narration hook missing in {href}")
    else:
        narration_ids = re.findall(r'data-id="([^"]+)"', hook.group(1))
        if not narration_ids:
            ERRORS.append(f"narration hook has no ids in {href}")
        for narration_id in narration_ids:
            if narration_id not in AUDIO[0] or narration_id not in AUDIO[1]:
                ERRORS.append(f"narration id {narration_id} missing from a manifest in {href}")
    for src in re.findall(r'<img[^>]+src="([^"]+)"', html):
        if not src.startswith(("data:", "http://", "https://")) and not (ROOT / src).exists():
            ERRORS.append(f"missing image {src} referenced by {href}")

for entry in TOC:
    if not (ROOT / entry["href"]).exists():
        ERRORS.append(f"TOC target missing: {entry['href']}")
    if entry["section_id"] not in seen_sections:
        ERRORS.append(f"TOC section missing from pages.json: {entry['section_id']}")

checklist = (ROOT / "PAGE-CONVERSION-CHECKLIST.md").read_text(encoding="utf-8")
checked = len(re.findall(r'^\|\s*\d+\s*\|\s*visually checked\s*\|', checklist, re.M))
if checked != 112:
    ERRORS.append(f"checklist has {checked} visually checked pages instead of 112")

print(f"pages={len(PAGES)} toc_entries={len(TOC)} visually_checked={checked}")
print(f"audio_manifest_entries={len(AUDIO[0])}/{len(AUDIO[1])}")
if ERRORS:
    print(f"errors={len(ERRORS)}")
    for error in ERRORS:
        print(f"- {error}")
    raise SystemExit(1)
print("errors=0")
