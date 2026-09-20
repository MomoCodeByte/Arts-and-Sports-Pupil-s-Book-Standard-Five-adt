# Arts and Sports Standard Five — accessible reader

This directory is the deployable offline web book. Serve `index.html`; there is no build server or package installation step.

- 114 reader pages: the front cover is page 1 (`index.html`), the original 112 pages are pages 2–113, and the back cover is page 114 (`pg114_sec001.html`).
- `content/pages.json` defines reading order. Each HTML file's `page-section-id`, `title-id`, and `data-section-id` must agree with it.
- Printed textbook page numbers remain unchanged. `data-source-page` and `data-source-section` preserve the original activity selectors and saved-answer keys.
- `content/i18n/en/audio/pgNNN_readNNNN.mp3` contains Tanzanian Imani narration (`en-TZ-ImaniNeural`, rate `-12%`). Page text spans and images use matching `data-id` values. Timings are in `timecode/timecode_output.json`.
- The en-KE language option shares the same page recordings and videos through relative mappings. Retained `gl*` resources support glossary playback.
- `content/i18n/en/video/page_N.mp4` matches reader page N. The supplied FRONT and BACK clips are `page_1.mp4` and `page_114.mp4`.
- `cover.png` and `back-cover.png` are cropped from the original cover spread, excluding printer marks and the spine. Their accessible printed text is present in HTML.
- The toolbar, audio player, word highlighting, and mobile drawers use the Writing Standard 1 reference runtime: `assets/base.bundle.local.js`, `reader-toolbar.css`, and `mobile-sheet-drag.*`. Keep this runtime intact; change book content or a separate extension instead.
- `assets/book-activities.js` handles the book's answer fields, multiple choice, matching, and true/false tasks. `book-pages.css` and `adt-accessibility.css` style the content and activities.

## Editing and preparing a release

When changing narrated text, update the HTML, both language text/audio maps, the recorded clip, and its word timestamps. Keep narration IDs attached to the visible text or described image. Preserve whitespace around inline emphasis. Do not place narration hooks in a separate duplicate hidden copy of the page.

Run `python tools/prepare_release.py` after edits. It validates page identities, local resources, audio, videos, and timings, then regenerates the offline data and complete SCORM file inventory. Run `python tools/prepare_release.py --check` to verify the release without writing files.

Check the reader in a browser on desktop and mobile: navigation, drawers and their drag handles, narration controls and word highlighting, sign video, glossary, and saved activities. The deployment procedure does not create a ZIP, publish, push, or create scrum notes.

Source PDFs and supplied videos live in the parent directory and are not part of the deployed bundle. Obsolete recordings, unused images, conversion scripts, and temporary outputs have been removed from this directory.
