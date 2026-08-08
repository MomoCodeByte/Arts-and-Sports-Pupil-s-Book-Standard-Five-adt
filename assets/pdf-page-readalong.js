(function () {
  const words = Array.from(document.querySelectorAll('.read-word'));
  const readButton = document.querySelector('[data-page-read]');
  const stopButton = document.querySelector('[data-page-stop]');
  if (!words.length || !readButton || !stopButton || !('speechSynthesis' in window)) return;

  const spokenWords = words.map((node) => node.textContent.trim());
  const text = spokenWords.join(' ');
  const starts = [];
  let offset = 0;
  spokenWords.forEach((word) => { starts.push(offset); offset += word.length + 1; });
  let active = null;

  function clearHighlight() {
    if (active) active.classList.remove('is-speaking');
    active = null;
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

  function readPage() {
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

  readButton.addEventListener('click', readPage);
  stopButton.addEventListener('click', () => { speechSynthesis.cancel(); clearHighlight(); });
  window.addEventListener('beforeunload', () => speechSynthesis.cancel());
})();
