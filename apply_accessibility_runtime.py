import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
VERSION = "20260828-26"
CSS_TAG = f'<link href="./assets/adt-accessibility.css?v={VERSION}" rel="stylesheet">'
JS_TAG = f'<script src="./assets/adt-accessibility.js?v={VERSION}"></script>'


def page_files() -> list[Path]:
    files = [ROOT / "index.html", *sorted(ROOT.glob("pg*_sec001.html"))]
    unique = []
    seen = set()
    for path in files:
        if path.exists() and path not in seen:
            unique.append(path)
            seen.add(path)
    return unique


def update_page(path: Path) -> bool:
    source = path.read_text(encoding="utf-8")
    updated = source

    updated = re.sub(
        r'<link href="\./assets/adt-accessibility\.css(?:\?v=[^"]*)?" rel="stylesheet">',
        CSS_TAG,
        updated,
    )
    if "./assets/adt-accessibility.css" not in updated:
        updated = updated.replace("</head>", f"{CSS_TAG}</head>", 1)

    updated = re.sub(
        r'<script src="\./assets/adt-accessibility\.js(?:\?v=[^"]*)?"></script>',
        JS_TAG,
        updated,
    )
    if "./assets/adt-accessibility.js" not in updated:
        updated = updated.replace("</body>", f"{JS_TAG}</body>", 1)

    updated = re.sub(
        r'(\./assets/book-pages\.css)(?:\?v=[^"\']*)?',
        rf"\1?v={VERSION}",
        updated,
    )

    updated = re.sub(
        r'(\./assets/pdf-page-readalong\.js)(?:\?v=[^"\']*)?',
        rf"\1?v={VERSION}",
        updated,
    )

    if updated == source:
        return False
    path.write_text(updated, encoding="utf-8", newline="")
    return True


def main() -> None:
    files = page_files()
    if len(files) != 112:
        raise RuntimeError(f"Expected exactly 112 ADT pages, found {len(files)}")
    changed = sum(update_page(path) for path in files)
    print(f"Accessibility runtime present on {len(files)} pages; updated {changed} files.")


if __name__ == "__main__":
    main()
