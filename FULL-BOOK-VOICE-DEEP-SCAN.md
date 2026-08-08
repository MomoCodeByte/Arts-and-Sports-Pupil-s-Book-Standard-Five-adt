# Full Book Voice and Runtime Deep Scan

Date: 2026-08-08

## Result

- Reading-order entries: **145/145 present**
- Physical book pages: **112/112 passed static QA**
- Physical pages loaded in the browser: **112/112 passed**
- Quiz pages loaded in the browser: **33/33 passed**
- Positioned highlight words: **20,241**
- Pages using dock speaker control: **112/112**
- Legacy floating voice controls visible at runtime: **0**
- Quiz answer inputs, textareas, and submit buttons: **0**
- Watermark text/blocks remaining: **0**
- Chapter starts verified: **7/7**
- JavaScript syntax check: **PASS**

## Voice implementation

- Physical pages 1–5 use generated OpenVoice V2 audio.
- Physical pages 1–5 use real per-word Whisper timestamps and global word alignment.
- Physical pages 6–112 use the browser's `en-TZ` voice, with `en-KE`, East African/UK English, then English fallback.
- Recorded and fallback playback speed is **0.65**.
- The standard dock speaker button starts and stops narration.
- Word highlighting was runtime-tested on page 1, page 60, and page 112.

## Content and navigation

- Every physical page uses its corresponding watermark-free PDF page render.
- Every physical page contains a positioned word layer and the current read-aloud script (`v20260808-12`).
- All 33 quizzes remain in the reading order as static quiz content.
- All 33 quizzes contain their question/options and no answer-entry or submit controls.
- The manifest and offline bundle contain every physical page and render.

## Important remaining production step

The complete control/highlight system is active across the whole book. However, identical generated OpenVoice audio files and Whisper cue files currently exist only for pages 1–5. Generating those assets for pages 6–112 is a separate long-running production pass; until that pass is completed, those pages intentionally use the Tanzanian-English browser voice fallback.

