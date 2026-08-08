import json
from pathlib import Path


root = Path(__file__).resolve().parent
path = root / "assets" / "offline-preloader.js"
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
        inline[key] = json.loads(source.read_text(encoding="utf-8"))
    elif source.suffix.lower() == ".html":
        inline[key] = source.read_text(encoding="utf-8")

lines[2] = prefix + json.dumps(inline, ensure_ascii=False, separators=(",", ":")) + ";"
path.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="")
