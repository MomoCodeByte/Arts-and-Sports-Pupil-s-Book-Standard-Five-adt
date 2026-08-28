"""Make visible contents numbers match the web reader toolbar pages."""

from html import escape, unescape
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
LINK = re.compile(
    r'<a href="pg(?P<page>\d{3})_sec001\.html" aria-label="[^"]*">'
    r'<span class="toc-label">(?P<label>.*?)</span>'
    r'(?P<middle><span class="toc-leader" aria-hidden="true"></span>'
    r'<span class="toc-folio">).*?(?P<end></span></a>)'
)


def update(path: Path) -> int:
    source = path.read_text(encoding="utf-8")

    def replace(match: re.Match[str]) -> str:
        page = int(match.group("page"))
        label = match.group("label")
        aria_label = escape(unescape(label), quote=True)
        return (
            f'<a href="pg{page:03d}_sec001.html" '
            f'aria-label="{aria_label}, toolbar page {page}">'
            f'<span class="toc-label">{label}</span>'
            f'{match.group("middle")}{page}{match.group("end")}'
        )

    updated, count = LINK.subn(replace, source)
    if not count:
        raise RuntimeError(f"No contents links found in {path.name}")
    path.write_text(updated, encoding="utf-8", newline="")
    return count


def main() -> None:
    total = sum(update(ROOT / name) for name in ("pg003_sec001.html", "pg004_sec001.html"))
    print(f"Updated {total} contents links to toolbar page numbers.")


if __name__ == "__main__":
    main()
