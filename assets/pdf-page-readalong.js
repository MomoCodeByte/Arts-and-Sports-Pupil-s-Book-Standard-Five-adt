(function () {
  const allWords = Array.from(document.querySelectorAll('.read-word'));
  const seenWords = new Set();
  const words = allWords.filter((node) => {
    const top = Number.parseFloat((node.style.top || '0').replace('%', ''));
    const key = `${node.textContent.trim()}|${node.getAttribute('style')}`;
    if (top >= 97 || seenWords.has(key)) return false;
    seenWords.add(key);
    return true;
  });
  const legacyControls = document.querySelector('.page-voice-controls');
  if (legacyControls) legacyControls.remove();
  if (!words.length) return;

  const spokenWords = words.map((node) => node.textContent.trim());
  const text = spokenWords.join(' ');
  const starts = [];
  let offset = 0;
  spokenWords.forEach((word) => {
    starts.push(offset);
    offset += word.length + 1;
  });
  let active = null;
  let pageAudio = null;
  let animationFrame = null;
  let isReading = false;
  let timedCues = [];
  let cueWordMap = [];

  const sectionId = document.querySelector('[data-section-id^="pg"]')?.dataset.sectionId || '';
  const pageMatch = sectionId.match(/^pg(\d{3})_/);
  const pageNumber = pageMatch ? Number(pageMatch[1]) : 0;
  const recordedAudio = pageNumber >= 1 && pageNumber <= 5
    ? `audio-samples/openvoice-sw-tz/page-${String(pageNumber).padStart(3, '0')}-sample.wav`
    : null;
  const recordedCues = pageNumber >= 1 && pageNumber <= 5
    ? `audio-samples/openvoice-sw-tz/page-${String(pageNumber).padStart(3, '0')}-cues.json`
    : null;

  function clearHighlight() {
    if (active) active.classList.remove('is-speaking');
    active = null;
  }

  function stopPage() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (pageAudio) {
      pageAudio.pause();
      pageAudio.currentTime = 0;
      pageAudio = null;
    }
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    isReading = false;
    clearHighlight();
  }

  function normalizedWord(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function editDistance(left, right) {
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let row = 1; row <= left.length; row += 1) {
      const current = [row];
      for (let column = 1; column <= right.length; column += 1) {
        current[column] = Math.min(
          current[column - 1] + 1,
          previous[column] + 1,
          previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1)
        );
      }
      previous.splice(0, previous.length, ...current);
    }
    return previous[right.length];
  }

  function wordMatchScore(left, right) {
    if (!left || !right) return -3;
    if (left === right) return 6;
    if (left.includes(right) || right.includes(left)) return 3;
    const similarity = 1 - editDistance(left, right) / Math.max(left.length, right.length);
    return similarity >= 0.72 ? 2 : -3;
  }

  function mapCuesToPageWords(cues) {
    const cueWords = cues.map((cue) => normalizedWord(cue.word));
    const pageWords = spokenWords.map(normalizedWord);
    const rows = cueWords.length + 1;
    const columns = pageWords.length + 1;
    const scores = Array.from({ length: rows }, () => new Int32Array(columns));
    const moves = Array.from({ length: rows }, () => new Int8Array(columns));
    for (let row = 1; row < rows; row += 1) scores[row][0] = -row * 2;
    for (let column = 1; column < columns; column += 1) scores[0][column] = -column * 2;
    for (let row = 1; row < rows; row += 1) {
      for (let column = 1; column < columns; column += 1) {
        const diagonal = scores[row - 1][column - 1] + wordMatchScore(cueWords[row - 1], pageWords[column - 1]);
        const skipCue = scores[row - 1][column] - 2;
        const skipPage = scores[row][column - 1] - 2;
        if (diagonal >= skipCue && diagonal >= skipPage) {
          scores[row][column] = diagonal;
          moves[row][column] = 1;
        } else if (skipCue >= skipPage) {
          scores[row][column] = skipCue;
          moves[row][column] = 2;
        } else {
          scores[row][column] = skipPage;
          moves[row][column] = 3;
        }
      }
    }

    const mapping = new Array(cues.length).fill(-1);
    let row = cueWords.length;
    let column = pageWords.length;
    while (row > 0 || column > 0) {
      const move = row > 0 && column > 0 ? moves[row][column] : (row > 0 ? 2 : 3);
      if (move === 1) {
        mapping[row - 1] = column - 1;
        row -= 1;
        column -= 1;
      } else if (move === 2) {
        row -= 1;
      } else {
        column -= 1;
      }
    }
    let last = 0;
    for (let index = 0; index < mapping.length; index += 1) {
      if (mapping[index] < 0) mapping[index] = last;
      else last = mapping[index];
    }
    return mapping;
  }

  function highlightRecordedAudio() {
    if (!pageAudio || !timedCues.length) return;
    const time = pageAudio.currentTime;
    let low = 0;
    let high = timedCues.length - 1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      if (timedCues[middle].start <= time) low = middle + 1;
      else high = middle - 1;
    }
    const cueIndex = Math.max(0, high);
    const index = cueWordMap[cueIndex] ?? 0;
    if (words[index] !== active) {
      clearHighlight();
      active = words[index];
      active?.classList.add('is-speaking');
    }
    if (!pageAudio.paused && !pageAudio.ended) animationFrame = requestAnimationFrame(highlightRecordedAudio);
  }

  async function readRecordedPage() {
    stopPage();
    isReading = true;
    if (!timedCues.length) {
      const response = await fetch(recordedCues, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Unable to load word cues: ${response.status}`);
      timedCues = await response.json();
      cueWordMap = mapCuesToPageWords(timedCues);
    }
    pageAudio = new Audio(recordedAudio);
    pageAudio.preload = 'auto';
    // Calm classroom pace. Cue timestamps remain synchronized because they
    // are compared with the audio element's source currentTime.
    pageAudio.playbackRate = 0.65;
    pageAudio.addEventListener('loadedmetadata', highlightRecordedAudio, { once: true });
    pageAudio.addEventListener('play', highlightRecordedAudio);
    pageAudio.addEventListener('ended', stopPage, { once: true });
    pageAudio.addEventListener('error', () => {
      stopPage();
      readSyntheticPage();
    }, { once: true });
    await pageAudio.play();
  }

  function highlightAt(characterIndex) {
    let low = 0;
    let high = starts.length - 1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      if (starts[middle] <= characterIndex) low = middle + 1;
      else high = middle - 1;
    }
    const next = words[Math.max(0, high)];
    if (next === active) return;
    clearHighlight();
    active = next;
    active?.classList.add('is-speaking');
  }

  function chooseVoice() {
    const voices = speechSynthesis.getVoices();
    return voices.find((voice) => /^en-TZ$/i.test(voice.lang)) ||
      voices.find((voice) => /^en-KE$/i.test(voice.lang)) ||
      voices.find((voice) => /^en-(TZ|KE|UG|GB)/i.test(voice.lang)) ||
      voices.find((voice) => /^en/i.test(voice.lang));
  }

  function readSyntheticPage() {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    clearHighlight();
    isReading = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-TZ';
    utterance.rate = 0.65;
    utterance.pitch = 1;
    const voice = chooseVoice();
    if (voice) utterance.voice = voice;
    utterance.onboundary = (event) => {
      if (event.name === 'word' || typeof event.charIndex === 'number') highlightAt(event.charIndex);
    };
    utterance.onend = stopPage;
    utterance.onerror = stopPage;
    speechSynthesis.speak(utterance);
  }

  function startPage() {
    if (recordedAudio) readRecordedPage().catch(() => readSyntheticPage());
    else readSyntheticPage();
  }

  // The reader dock is loaded after this script. Capture its TTS button clicks
  // so the standard speaker icon controls this page's recorded read-aloud.
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.(
      'button[title$="tts-label"], button[aria-label$="tts-label"]'
    );
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (isReading) stopPage();
    else startPage();
  }, true);

  window.addEventListener('beforeunload', stopPage);
})();
