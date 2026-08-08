import csv
import re
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path

import pdfplumber
from lxml import html


ROOT = Path(__file__).resolve().parent
PDF = Path(r"C:\Users\Admin\Downloads\ART & SPORTS 5 a.pdf")
OUT = ROOT / "output" / "audit"
OUT.mkdir(parents=True, exist_ok=True)


def normalize(value):
    value = value or ""
    value = value.replace("’", "'").replace("‘", "'").replace("–", "-").replace("—", "-")
    value = re.sub(r"for\s+online\s+reading\s+only\.?", " ", value, flags=re.I)
    value = re.sub(r"\s+", " ", value).strip().lower()
    return value


def words(value):
    return re.findall(r"[a-z0-9]+(?:'[a-z0-9]+)?", normalize(value))


def html_page_data(page_number):
    prefix = f"pg{page_number:03d}_sec"
    files = sorted(ROOT.glob(f"{prefix}*.html"))
    if page_number == 1 and ROOT.joinpath("index.html").exists():
        files = [ROOT / "index.html"] + [p for p in files if p.name != "index.html"]
    text_parts = []
    image_sources = []
    missing_images = []
    for path in files:
        tree = html.fromstring(path.read_text(encoding="utf-8"))
        nodes = tree.xpath('//*[@data-id and not(.//*[@data-id])]')
        for node in nodes:
            if node.tag.lower() != "img":
                value = " ".join(node.itertext()).strip()
                if value:
                    text_parts.append(value)
        for node in tree.xpath("//img[@src]"):
            src = node.get("src")
            image_sources.append(src)
            if not src.startswith(("http://", "https://", "data:")) and not (ROOT / src).exists():
                missing_images.append(src)
    return files, " ".join(text_parts), image_sources, missing_images


rows = []
with pdfplumber.open(PDF) as pdf:
    if len(pdf.pages) != 112:
        raise RuntimeError(f"Expected 112 PDF pages, found {len(pdf.pages)}")
    for page_number, pdf_page in enumerate(pdf.pages, start=1):
        files, html_text, html_images, missing_images = html_page_data(page_number)
        pdf_text = pdf_page.extract_text(x_tolerance=2, y_tolerance=3) or ""
        pdf_words = words(pdf_text)
        html_words = words(html_text)
        overlap = sum((Counter(pdf_words) & Counter(html_words)).values())
        precision = overlap / len(html_words) if html_words else 0.0
        recall = overlap / len(pdf_words) if pdf_words else (1.0 if not html_words else 0.0)
        f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
        order = SequenceMatcher(None, " ".join(pdf_words), " ".join(html_words), autojunk=False).ratio()
        if not files:
            severity = "CRITICAL"
            notes = "No converted HTML file"
        elif missing_images:
            severity = "CRITICAL"
            notes = "Missing referenced image files"
        elif f1 < 0.75:
            severity = "CRITICAL"
            notes = "Large text/content mismatch"
        elif f1 < 0.90:
            severity = "MAJOR"
            notes = "Noticeable text/content mismatch"
        elif len(files) > 1:
            severity = "LAYOUT"
            notes = "One PDF page split across multiple HTML sections"
        else:
            severity = "VISUAL"
            notes = "Content is close; visual layout still requires overlay review"
        rows.append({
            "pdf_page": page_number,
            "html_files": "; ".join(p.name for p in files),
            "html_sections": len(files),
            "pdf_words": len(pdf_words),
            "html_words": len(html_words),
            "token_precision_pct": round(precision * 100, 1),
            "token_recall_pct": round(recall * 100, 1),
            "token_f1_pct": round(f1 * 100, 1),
            "reading_order_pct": round(order * 100, 1),
            "pdf_image_objects": len(pdf_page.images),
            "html_image_refs": len(html_images),
            "missing_html_images": "; ".join(sorted(set(missing_images))),
            "severity": severity,
            "notes": notes,
        })


csv_path = OUT / "page-by-page-fidelity-audit.csv"
with csv_path.open("w", newline="", encoding="utf-8-sig") as stream:
    writer = csv.DictWriter(stream, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

counts = Counter(row["severity"] for row in rows)
worst = sorted(rows, key=lambda row: (row["token_f1_pct"], row["reading_order_pct"]))[:20]
split_pages = [row for row in rows if row["html_sections"] > 1]
missing_asset_pages = [row for row in rows if row["missing_html_images"]]

md_path = OUT / "page-fidelity-summary.md"
with md_path.open("w", encoding="utf-8", newline="\n") as stream:
    stream.write("# Original PDF vs converted HTML - page fidelity audit\n\n")
    stream.write("This audit compares all 112 physical PDF pages with the matching pg001-pg112 HTML files. ")
    stream.write("Text metrics measure content presence and reading order; they do not prove pixel-perfect layout.\n\n")
    stream.write("## Summary\n\n")
    stream.write(f"- PDF physical pages: 112\n- Converted HTML sections (including quizzes): 219\n")
    stream.write(f"- PDF pages split into multiple HTML sections: {len(split_pages)}\n")
    stream.write(f"- Pages with missing referenced image files: {len(missing_asset_pages)}\n")
    for key in ("CRITICAL", "MAJOR", "LAYOUT", "VISUAL"):
        stream.write(f"- {key}: {counts.get(key, 0)} pages\n")
    stream.write("\n## Lowest content-similarity pages\n\n")
    stream.write("| PDF page | HTML section(s) | F1 | Reading order | Finding |\n")
    stream.write("|---:|---|---:|---:|---|\n")
    for row in worst:
        stream.write(
            f"| {row['pdf_page']} | {row['html_files']} | {row['token_f1_pct']}% | "
            f"{row['reading_order_pct']}% | {row['notes']} |\n"
        )
    stream.write("\n## Interpretation\n\n")
    stream.write("- CRITICAL/MAJOR means content differs, is missing, or is duplicated.\n")
    stream.write("- LAYOUT means content is close but a single PDF page was divided into multiple HTML screens.\n")
    stream.write("- VISUAL means text is close, but typography, spacing, colour, image crop, and exact placement still need rendered overlay comparison.\n")
    stream.write("- The CSV contains one row for every physical page and is the working checklist for correction.\n")

print(csv_path)
print(md_path)
print(dict(counts))
