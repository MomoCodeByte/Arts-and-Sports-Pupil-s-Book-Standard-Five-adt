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

  function mapCuesToPageWords(cues) {
    const mapping = [];
    let pageIndex = 0;
    for (const cue of cues) {
      const cueWord = normalizedWord(cue.word);
      let match = -1;
      for (let candidate = pageIndex; candidate < Math.min(words.length, pageIndex + 6); candidate += 1) {
        const pageWord = normalizedWord(spokenWords[candidate]);
        if (pageWord === cueWord || pageWord.includes(cueWord) || cueWord.includes(pageWord)) {
          match = candidate;
          break;
        }
      }
      if (match < 0) match = Math.min(pageIndex, words.length - 1);
      mapping.push(match);
      pageIndex = Math.min(words.length - 1, match + 1);
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
    // The source was generated deliberately slowly for review. Playing it at
    // 1.25x restores a natural classroom reading pace while cue timestamps
    // remain synchronized to the audio's source currentTime.
    pageAudio.playbackRate = 1.25;
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
    utterance.rate = 0.9;
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
