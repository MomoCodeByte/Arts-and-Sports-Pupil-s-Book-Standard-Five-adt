"""Validate and refresh the offline reader and SCORM file inventory (no archive)."""
from pathlib import Path
import argparse
import json
import re
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.meta, self.ids, self.refs, self.sections = {}, [], [], []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta': self.meta[attrs.get('name')] = attrs.get('content')
        if attrs.get('data-id'): self.ids.append(attrs['data-id'])
        if attrs.get('data-section-id'): self.sections.append(attrs['data-section-id'])
        for name in ('src', 'href', 'poster'):
            if attrs.get(name): self.refs.append(attrs[name])


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def runtime_files():
    return sorted(p for p in ROOT.rglob('*') if p.is_file()
                  and '.git' not in p.relative_to(ROOT).parts
                  and 'tools' not in p.relative_to(ROOT).parts
                  and p.name not in {'AGENTS.md', 'imsmanifest.xml', '.gitignore'})


def local_ref(base, ref):
    parsed = urlsplit(ref)
    if parsed.scheme or parsed.netloc or not parsed.path: return None
    return (base / unquote(parsed.path)).resolve()


def validate():
    pages = read_json(ROOT / 'content/pages.json')
    config = read_json(ROOT / 'assets/config.json')
    errors = []
    documents = []
    for number, entry in enumerate(pages, 1):
        path = ROOT / entry['href']
        if not path.is_file(): errors.append(f'Missing page: {path}'); continue
        doc = Page(path.read_text(encoding='utf-8')); documents.append(doc)
        if doc.meta.get('page-section-id') != str(number): errors.append(f'Incorrect page number: {path.name}')
        if doc.meta.get('title-id') != entry['section_id'] or entry['section_id'] not in doc.sections:
            errors.append(f'Incorrect section identity: {path.name}')
        if len(doc.ids) != len(set(doc.ids)): errors.append(f'Duplicate narration IDs: {path.name}')
        for ref in doc.refs:
            target = local_ref(path.parent, ref)
            if target and not target.is_file(): errors.append(f'{path.name}: missing {ref}')
    for lang in config['languages']['available']:
        base = ROOT / 'content/i18n' / lang
        texts = read_json(base / 'texts.json')
        audios = read_json(base / 'audios.json')
        timings = read_json(base / 'timecode/timecode_output.json')
        videos = read_json(base / 'videos.json')
        for doc in documents:
            for key in doc.ids:
                if key not in texts or key not in audios: errors.append(f'{lang}: missing text/audio for {key}')
                if key not in timings: errors.append(f'{lang}: missing word timing for {key}')
        for key, filename in audios.items():
            path = (base / 'audio' / filename).resolve()
            if not path.is_file() or path.stat().st_size < 100: errors.append(f'{lang}: missing/empty audio {key}: {filename}')
        for number in range(1, len(pages)+1):
            filename = videos.get(f'video-{number}', '')
            path = (base / 'video' / filename).resolve()
            if Path(filename).name != f'page_{number}.mp4' or not path.is_file() or path.stat().st_size < 100:
                errors.append(f'{lang}: invalid video for page {number}')
        for key, item in timings.items():
            stamps = item['timecodes'][1]['word_timestamps']
            if not stamps: errors.append(f'{lang}: empty timings {key}')
            if any(w['start'] < 0 or w['end'] < w['start'] for w in stamps): errors.append(f'{lang}: invalid timings {key}')
    for path in ROOT.glob('assets/*.css'):
        for ref in re.findall(r'url\([\s\"\x27]*([^\)\"\x27]+)', path.read_text(encoding='utf-8')):
            target = local_ref(path.parent, ref.strip())
            if target and not target.is_file(): errors.append(f'{path.name}: missing CSS resource {ref}')
    for entry in read_json(ROOT / 'content/toc.json'):
        if not local_ref(ROOT, entry['href']).is_file(): errors.append(f'Broken contents entry {entry}')
    if errors: raise SystemExit('\n'.join(errors))
    print(f'Validated {len(pages)} pages, {len(documents)} HTML documents, audio/timings and page videos in all languages.')


def inline_data():
    paths = [ROOT / 'assets/config.json', ROOT / 'content/pages.json', ROOT / 'content/toc.json']
    paths += sorted((ROOT / 'content/i18n').rglob('*.json'))
    paths += sorted((ROOT / 'assets/interface_translations').rglob('*.json'))
    paths += sorted((ROOT / 'content/navigation').glob('*.html'))
    return {'./' + p.relative_to(ROOT).as_posix(): read_json(p) if p.suffix == '.json' else p.read_text(encoding='utf-8') for p in paths}


def prepare(check=False):
    validate()
    preloader = ROOT / 'assets/offline-preloader.js'
    lines = preloader.read_text(encoding='utf-8').splitlines()
    prefix = '  var INLINE = '
    line = next(i for i, text in enumerate(lines) if text.startswith(prefix))
    data = inline_data()
    if check:
        assert json.loads(lines[line][len(prefix):-1]) == data, 'Stale offline preloader'
    else:
        lines[line] = prefix + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';'
        preloader.write_text('\n'.join(lines)+'\n', encoding='utf-8')
    manifest = ROOT / 'imsmanifest.xml'
    ns = 'http://www.imsproject.org/xsd/imscp_rootv1p1p2'
    ET.register_namespace('', ns)
    ET.register_namespace('adlcp', 'http://www.adlnet.org/xsd/adlcp_rootv1p2')
    ET.register_namespace('xsi', 'http://www.w3.org/2001/XMLSchema-instance')
    tree = ET.parse(manifest)
    resource = tree.find(f'.//{{{ns}}}resource')
    files = {p.relative_to(ROOT).as_posix() for p in runtime_files()}
    if check:
        assert {el.get('href') for el in resource.findall(f'{{{ns}}}file')} == files, 'Stale SCORM file inventory'
    else:
        for child in list(resource): resource.remove(child)
        for filename in sorted(files): ET.SubElement(resource, f'{{{ns}}}file', href=filename)
        ET.indent(tree, space='  ')
        tree.write(manifest, encoding='utf-8', xml_declaration=True)
    print(f'Offline data and SCORM inventory {"verified" if check else "refreshed"}: {len(files)} runtime files. No ZIP created.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    prepare(parser.parse_args().check)
