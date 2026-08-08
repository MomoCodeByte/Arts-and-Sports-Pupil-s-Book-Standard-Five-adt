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
  const playbackWeights = [];
  let offset = 0;
  let totalPlaybackWeight = 0;
  spokenWords.forEach((word) => {
    starts.push(offset);
    offset += word.length + 1;
    // Longer words need more speech time. The small constant accounts for
    // the pause between words and keeps short words from flashing too fast.
    totalPlaybackWeight += Math.max(2.5, word.replace(/[^A-Za-z0-9]/g, '').length + 0.8);
    playbackWeights.push(totalPlaybackWeight);
  });
  let active = null;
  let pageAudio = null;
  let animationFrame = null;
  let isReading = false;

  const sectionId = document.querySelector('[data-section-id^="pg"]')?.dataset.sectionId || '';
  const pageMatch = sectionId.match(/^pg(\d{3})_/);
  const pageNumber = pageMatch ? Number(pageMatch[1]) : 0;
  const recordedAudio = pageNumber >= 1 && pageNumber <= 5
    ? `audio-samples/openvoice-sw-tz/page-${String(pageNumber).padStart(3, '0')}-sample.wav`
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

  function highlightRecordedAudio() {
    if (!pageAudio || !Number.isFinite(pageAudio.duration) || pageAudio.duration <= 0) return;
    const progress = Math.min(0.999999, pageAudio.currentTime / pageAudio.duration);
    const targetWeight = progress * totalPlaybackWeight;
    let low = 0;
    let high = playbackWeights.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (playbackWeights[middle] <= targetWeight) low = middle + 1;
      else high = middle;
    }
    const index = low;
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
    pageAudio = new Audio(recordedAudio);
    pageAudio.preload = 'auto';
    pageAudio.playbackRate = 0.92;
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
