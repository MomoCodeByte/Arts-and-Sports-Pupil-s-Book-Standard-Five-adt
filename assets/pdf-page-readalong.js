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
  const readButton = document.querySelector('[data-page-read]');
  const stopButton = document.querySelector('[data-page-stop]');
  if (!words.length || !readButton || !stopButton) return;

  const spokenWords = words.map((node) => node.textContent.trim());
  const text = spokenWords.join(' ');
  const starts = [];
  let offset = 0;
  spokenWords.forEach((word) => { starts.push(offset); offset += word.length + 1; });
  let active = null;
  let pageAudio = null;
  let animationFrame = null;

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
    clearHighlight();
  }

  function highlightRecordedAudio() {
    if (!pageAudio || !Number.isFinite(pageAudio.duration) || pageAudio.duration <= 0) return;
    const progress = Math.min(0.999999, pageAudio.currentTime / pageAudio.duration);
    const index = Math.min(words.length - 1, Math.floor(progress * words.length));
    if (words[index] !== active) {
      clearHighlight();
      active = words[index];
      active?.classList.add('is-speaking');
    }
    if (!pageAudio.paused && !pageAudio.ended) animationFrame = requestAnimationFrame(highlightRecordedAudio);
  }

  async function readRecordedPage() {
    stopPage();
    pageAudio = new Audio(recordedAudio);
    pageAudio.preload = 'auto';
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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-TZ';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    const voice = chooseVoice();
    if (voice) utterance.voice = voice;
    utterance.onboundary = (event) => {
      if (event.name === 'word' || typeof event.charIndex === 'number') highlightAt(event.charIndex);
    };
    utterance.onend = clearHighlight;
    utterance.onerror = clearHighlight;
    speechSynthesis.speak(utterance);
  }

  readButton.addEventListener('click', () => {
    if (recordedAudio) readRecordedPage().catch(() => readSyntheticPage());
    else readSyntheticPage();
  });
  stopButton.addEventListener('click', stopPage);
  window.addEventListener('beforeunload', stopPage);
})();
