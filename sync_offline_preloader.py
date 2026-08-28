import json
import re
from pathlib import Path


root = Path(__file__).resolve().parent
path = root / "assets" / "offline-preloader.js"
cache_version = "20260828-26"
page_href_version = "20260828-26"

# Every page must request the same versioned preloader. Without this, a browser
# can reuse a stale inline copy of pages that have already been corrected.
preloader_pattern = re.compile(r"(?P<prefix>\./assets/offline-preloader\.js)(?:\?v=[^\"']*)?")
for html_path in root.glob("*.html"):
    source = html_path.read_text(encoding="utf-8")
    updated = preloader_pattern.sub(rf"\g<prefix>?v={cache_version}", source)
    if updated != source:
        html_path.write_text(updated, encoding="utf-8", newline="")

lines = path.read_text(encoding="utf-8").splitlines()
prefix = "  var INLINE = "
if not lines[2].startswith(prefix) or not lines[2].endswith(";"):
    raise RuntimeError("Unexpected offline-preloader.js structure")

inline = json.loads(lines[2][len(prefix):-1])
for key in list(inline):
    relative = key[2:] if key.startswith("./") else key
    source = root / relative
    if not source.exists():
        del inline[key]
    elif source.suffix.lower() == ".json":
        value = json.loads(source.read_text(encoding="utf-8"))
        # Keep navigation on the corrected HTML instead of allowing a stale
        # browser-cached page to restore the old toolbar order.
        if relative in {"content/pages.json", "content/toc.json"}:
            for item in value:
                href = item.get("href")
                if href:
                    item["href"] = f"{href.split('?', 1)[0]}?v={page_href_version}"
        inline[key] = value
    elif source.suffix.lower() == ".html":
        inline[key] = source.read_text(encoding="utf-8")

lines[2] = prefix + json.dumps(inline, ensure_ascii=False, separators=(",", ":")) + ";"
path.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="")
