(function () {
  const speechEngine = window.speechSynthesis || null;
  const originalSpeak = window.__imaniNativeSpeechSpeak ||
    (speechEngine ? speechEngine.speak.bind(speechEngine) : null);
  const originalCancel = window.__imaniNativeSpeechCancel ||
    (speechEngine ? speechEngine.cancel.bind(speechEngine) : null);
  const NativeAudio = window.Audio;
  const originalMediaPlay = window.__imaniNativeMediaPlay ||
    window.HTMLMediaElement?.prototype.play;
  window.__imaniNativeSpeechSpeak = originalSpeak;
  window.__imaniNativeSpeechCancel = originalCancel;
  window.__imaniNativeMediaPlay = originalMediaPlay;
  if (typeof window.__imaniStopPageAudio === 'function') {
    window.__imaniStopPageAudio();
  }
  if (speechEngine) {
    originalCancel();
    speechEngine.speak = function () {};
    speechEngine.cancel = function () {};
  }
  // The bundled reader has its own audio engine. Block every generic media
  // playback request; this page reader calls the saved native method directly.
  if (originalMediaPlay) {
    window.HTMLMediaElement.prototype.play = function () {
      return Promise.resolve();
    };
  }
  const allWords = Array.from(document.querySelectorAll('.read-word'));
  const seenWords = new Set();
  const words = allWords.filter((node) => {
    const top = Number.parseFloat((node.style.top || '0').replace('%', ''));
    const value = node.textContent.trim();
    const key = `${node.textContent.trim()}|${node.getAttribute('style')}`;
    if (top >= 97 || (top >= 90 && /^\d+$/.test(value)) || seenWords.has(key)) return false;
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
  const activePageAudios = new Set();
  let animationFrame = null;
  let isReading = false;
  let playbackGeneration = 0;
  let timedCues = [];
  let cueWordMap = [];
  let customButton = null;

  const sectionId = document.querySelector('[data-section-id^="pg"]')?.dataset.sectionId || '';
  const pageMatch = sectionId.match(/^pg(\d{3})_/);
  const pageNumber = pageMatch ? Number(pageMatch[1]) : 0;
  const pageFile = pageNumber >= 1 && pageNumber <= 112
    ? `page-${String(pageNumber).padStart(3, '0')}`
    : null;
  const recordedAudio = pageFile
    ? `content/imani/${pageFile}.mp3?v=tzall2`
    : null;
  const recordedCues = pageFile
    ? `content/imani/${pageFile}.json?v=tzall2`
    : null;

  function clearHighlight() {
    if (active) active.classList.remove('is-speaking');
    active = null;
  }

  function stopPage() {
    playbackGeneration += 1;
    if (originalCancel) originalCancel();
    for (const audio of activePageAudios) {
      audio.pause();
      audio.currentTime = 0;
    }
    activePageAudios.clear();
    pageAudio = null;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    isReading = false;
    clearHighlight();
    updateCustomButton();
  }
  window.__imaniStopPageAudio = stopPage;

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
    const generation = playbackGeneration;
    isReading = true;
    updateCustomButton();
    if (!timedCues.length) {
      const response = await fetch(recordedCues, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Unable to load word cues: ${response.status}`);
      const cuePayload = await response.json();
      if (generation !== playbackGeneration) return;
      timedCues = Array.isArray(cuePayload)
        ? cuePayload
        : (cuePayload.words || []).map((cue) => ({
          word: cue.word || cue.text || '',
          start: cue.start,
          end: cue.end
        }));
      cueWordMap = mapCuesToPageWords(timedCues);
    }
    if (generation !== playbackGeneration) return;
    const audio = new NativeAudio(recordedAudio);
    activePageAudios.add(audio);
    pageAudio = audio;
    audio.preload = 'auto';
    // Recorded audio is generated at the intended classroom pace.
    audio.playbackRate = 1;
    audio.addEventListener('loadedmetadata', highlightRecordedAudio, { once: true });
    audio.addEventListener('play', highlightRecordedAudio);
    audio.addEventListener('ended', () => {
      activePageAudios.delete(audio);
      if (pageAudio === audio) stopPage();
    }, { once: true });
    audio.addEventListener('error', () => {
      activePageAudios.delete(audio);
      if (pageAudio === audio) stopPage();
    }, { once: true });
    await originalMediaPlay.call(audio);
    if (generation !== playbackGeneration) {
      audio.pause();
      audio.currentTime = 0;
      activePageAudios.delete(audio);
    }
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
    const voices = speechEngine ? speechEngine.getVoices() : [];
    return voices.find((voice) => /^en-TZ$/i.test(voice.lang)) ||
      voices.find((voice) => /^en-KE$/i.test(voice.lang)) ||
      voices.find((voice) => /^en-(TZ|KE|UG|GB)/i.test(voice.lang)) ||
      voices.find((voice) => /^en/i.test(voice.lang));
  }

  function readOriginalVoice() {
    if (!speechEngine || !originalSpeak || !originalCancel) return;
    originalCancel();
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
    originalSpeak(utterance);
  }

  function startPage() {
    if (recordedAudio) {
      const playback = readRecordedPage();
      const generation = playbackGeneration;
      playback.catch(() => {
        if (generation === playbackGeneration) stopPage();
      });
    }
  }

  function updateCustomButton() {
    if (!customButton) return;
    customButton.setAttribute('aria-label', isReading ? 'Stop page audio' : 'Read page');
    customButton.setAttribute('title', isReading ? 'Stop page audio' : 'Read page');
    customButton.textContent = isReading ? '■' : '🔊';
  }

  function installCustomButton() {
    if (customButton?.isConnected) return true;
    const dock = document.querySelector('[role="group"][aria-label="Reader controls"]');
    if (!dock) return false;
    customButton = document.createElement('button');
    customButton.type = 'button';
    customButton.dataset.imaniReader = 'true';
    customButton.style.cssText = [
      'width:44px', 'height:44px', 'border:0', 'border-radius:10px',
      'display:inline-flex', 'align-items:center', 'justify-content:center',
      'font-size:22px', 'cursor:pointer', 'background:rgba(255,255,255,.08)',
      'color:inherit'
    ].join(';');
    const placeBeforeLanguage = () => {
      const languageButton = Array.from(dock.querySelectorAll('button')).find((button) => {
        const label = `${button.getAttribute('aria-label') || ''} ${button.getAttribute('title') || ''}`;
        return /(^|\s)language(\s|$)/i.test(label) || /language-label/i.test(label);
      });
      if (!languageButton) return false;
      const languageGroup = languageButton.parentElement;
      if (!languageGroup) return false;
      if (customButton.parentElement !== languageGroup || customButton.nextElementSibling !== languageButton) {
        languageGroup.insertBefore(customButton, languageButton);
      }
      return true;
    };
    placeBeforeLanguage();
    const positionObserver = new MutationObserver(placeBeforeLanguage);
    positionObserver.observe(dock, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'title']
    });
    updateCustomButton();
    return true;
  }

  installCustomButton();
  const dockObserver = new MutationObserver(installCustomButton);
  dockObserver.observe(document.documentElement, { childList: true, subtree: true });

  // Delegation keeps the control working even when the React dock replaces
  // its DOM while loading a new page or restoring reader settings.
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-imani-reader="true"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (isReading) stopPage();
    else startPage();
  }, true);

  // The reader dock is loaded after this script. Capture its TTS button clicks
  // so the standard speaker icon controls this page's recorded read-aloud.
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.(
      'button[title$="tts-label"], button[aria-label$="tts-label"], ' +
      'button[title*="text to speech" i], button[aria-label*="text to speech" i]'
    );
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (isReading) stopPage();
    else startPage();
  }, true);

  window.addEventListener('beforeunload', stopPage);
  window.addEventListener('pagehide', stopPage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPage();
  });
})();
