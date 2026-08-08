import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
history = subprocess.run(
    ["git", "log", "--all", "--name-only", "--format="],
    cwd=ROOT,
    check=True,
    capture_output=True,
    text=True,
).stdout.splitlines()

legacy = sorted({
    name for name in history
    if re.fullmatch(r"pg\d{3}_sec(?:00[2-9]|0[1-9]\d|[1-9]\d{2})\.html", name)
})

for name in legacy:
    page = int(name[2:5])
    target = f"pg{page:03d}_sec001.html?v=physical-page-final"
    source = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="cache-control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="refresh" content="0;url={target}">
  <title>Opening physical PDF page {page}</title>
  <script>location.replace({target!r});</script>
</head>
<body><p><a href="{target}">Open physical PDF page {page}</a></p></body>
</html>
'''
    (ROOT / name).write_text(source, encoding="utf-8", newline="")

print(f"legacy_redirects={len(legacy)}")
