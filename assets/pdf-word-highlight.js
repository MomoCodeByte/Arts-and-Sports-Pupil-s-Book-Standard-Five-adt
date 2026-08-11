(function () {
  "use strict";

  var timecodesPromise = null;
  var audiosPromise = null;
  var rehemaPromise = null;
  var activeWord = null;
  var trackState = new WeakMap();
  var readAlongAudio = null;
  var readAlongCancelled = false;
  var dockReadingActive = false;
  var readAlongRunId = 0;
  // Keep narration enabled, but route every read-aloud request through the
  // single recorded narrator below. Competing browser/runtime voices remain
  // blocked by the media and speech-synthesis guards in this file.
  var voiceDisabled = false;

  // This edition uses one recorded narrator only. Never let the browser
  // substitute a platform voice, which can change between male and female.
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak = function () {
      window.speechSynthesis.cancel();
    };
  }

  function silenceCompetingVoices() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    document.querySelectorAll("audio").forEach(function (audio) {
      if (audio.dataset.singleReaderAudio === "1") return;
      audio.pause();
      audio.muted = true;
      audio.volume = 0;
    });
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "");
  }

  function loadTimecodes() {
    if (!timecodesPromise) {
      timecodesPromise = fetch("./content/i18n/en/timecode/timecode_output.json")
        .then(function (response) { return response.json(); })
        .catch(function () { return {}; });
    }
    return timecodesPromise;
  }

  function loadAudios() {
    if (!audiosPromise) {
      audiosPromise = fetch("./content/i18n/en/audios.json")
        .then(function (response) { return response.json(); })
        .catch(function () { return {}; });
    }
    return audiosPromise;
  }

  function loadRehema() {
    if (!rehemaPromise) {
      rehemaPromise = fetch("./content/imani/timecodes.json?v=4")
        .then(function (response) { return response.ok ? response.json() : {}; })
        .catch(function () { return {}; });
    }
    return rehemaPromise;
  }

  function timestampsFor(entry) {
    if (!entry) return [];
    if (Array.isArray(entry.timecodes)) return timestampsFor(entry.timecodes);
    if (Array.isArray(entry)) {
      for (var i = 0; i < entry.length; i += 1) {
        if (entry[i] && Array.isArray(entry[i].word_timestamps)) {
          return entry[i].word_timestamps;
        }
      }
    }
    if (Array.isArray(entry.word_timestamps)) return entry.word_timestamps;
    if (Array.isArray(entry.timecodes)) return entry.timecodes;
    return [];
  }

  function trackId(audio) {
    var src = audio.currentSrc || audio.src || "";
    var name = decodeURIComponent(src.split("/").pop() || "").split("?")[0];
    return name.replace(/\.(mp3|wav|ogg|m4a)$/i, "");
  }

  function findStart(words, cues) {
    var cueTokens = cues.map(function (cue) { return normalize(cue.text); }).filter(Boolean);
    if (!cueTokens.length) return -1;
    var limit = Math.min(4, cueTokens.length);
    for (var i = 0; i < words.length; i += 1) {
      var matched = 0;
      for (var j = 0; j < limit && i + j < words.length; j += 1) {
        if (normalize(words[i + j].textContent) === cueTokens[j]) matched += 1;
      }
      if (matched >= Math.min(3, limit)) return i;
    }
    for (var k = 0; k < words.length; k += 1) {
      if (normalize(words[k].textContent) === cueTokens[0]) return k;
    }
    return -1;
  }

  function clearHighlight() {
    if (activeWord) activeWord.classList.remove("pdf-word-active");
    activeWord = null;
  }

  function prepare(audio) {
    var id = trackId(audio);
    if (!id) return Promise.resolve(null);
    return loadTimecodes().then(function (all) {
      var cues = timestampsFor(all[id]);
      var words = Array.prototype.slice.call(document.querySelectorAll(".pdf-word"));
      var start = findStart(words, cues);
      var state = { id: id, cues: cues, words: words, start: start, index: -1 };
      trackState.set(audio, state);
      return state;
    });
  }

  function sync(audio) {
    var state = trackState.get(audio);
    if (!state || state.start < 0 || !state.cues.length) return;
    var time = audio.currentTime || 0;
    var next = state.index;
    while (next + 1 < state.cues.length && Number(state.cues[next + 1].start) <= time + 0.035) next += 1;
    while (next > 0 && Number(state.cues[next].start) > time + 0.035) next -= 1;
    if (next === state.index || next < 0) return;
    state.index = next;
    var target = state.words[state.start + next];
    if (!target) return;
    clearHighlight();
    target.classList.add("pdf-word-active");
    activeWord = target;
  }

  function attach(audio) {
    if (!audio || audio.dataset.pdfHighlightAttached === "1") return;
    audio.dataset.pdfHighlightAttached = "1";
    audio.addEventListener("play", function () {
      prepare(audio).then(function () { sync(audio); });
    });
    audio.addEventListener("timeupdate", function () { sync(audio); });
    audio.addEventListener("seeked", function () { sync(audio); });
    audio.addEventListener("ended", clearHighlight);
    audio.addEventListener("pause", function () {
      if (audio.ended || audio.currentTime === 0) clearHighlight();
    });
  }

  function stopReadAlong() {
    readAlongRunId += 1;
    readAlongCancelled = true;
    if (readAlongAudio) {
      readAlongAudio.pause();
      readAlongAudio.currentTime = 0;
    }
    readAlongAudio = null;
    window.__adtSingleVoiceAudio = null;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    clearHighlight();
  }

  function pageTrackIds() {
    var seen = Object.create(null);
    return Array.prototype.slice.call(
      document.querySelectorAll(".accessible-transcript [data-id]")
    ).map(function (element) {
      return element.getAttribute("data-id") || "";
    }).filter(function (id) {
      if (!id || /_easy_read$/.test(id) || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  function cueSegments(cues, words) {
    var stream = "";
    var charToWord = [];
    words.forEach(function (word, wordIndex) {
      var token = normalize(word.textContent);
      stream += token;
      for (var index = 0; index < token.length; index += 1) charToWord.push(wordIndex);
    });

    var segments = [];
    var cursor = 0;
    cues.forEach(function (cue) {
      var token = normalize(cue.text);
      if (!token) return;
      var found = stream.indexOf(token, cursor);
      if (found < 0 || found - cursor > 80) found = cursor;
      var end = Math.min(found + token.length, charToWord.length);
      var targets = [];
      for (var position = found; position < end; position += 1) {
        var wordIndex = charToWord[position];
        if (wordIndex == null || targets.some(function (item) { return item.wordIndex === wordIndex; })) continue;
        targets.push({ wordIndex: wordIndex, characters: 0 });
      }
      for (var countPosition = found; countPosition < end; countPosition += 1) {
        var targetWord = charToWord[countPosition];
        var target = targets.find(function (item) { return item.wordIndex === targetWord; });
        if (target) target.characters += 1;
      }
      var cueStart = Number(cue.start || 0);
      var cueEnd = Number(cue.end || cueStart);
      var duration = Math.max(0.04, cueEnd - cueStart);
      var totalCharacters = targets.reduce(function (sum, item) { return sum + item.characters; }, 0) || 1;
      var elapsedCharacters = 0;
      targets.forEach(function (item) {
        var start = cueStart + duration * elapsedCharacters / totalCharacters;
        elapsedCharacters += item.characters;
        var finish = cueStart + duration * elapsedCharacters / totalCharacters;
        segments.push({ start: start, end: finish, wordIndex: item.wordIndex });
      });
      cursor = Math.max(cursor, end);
    });
    return segments;
  }

  function startRehemaReadAlong() {
    stopReadAlong();
    silenceCompetingVoices();
    readAlongCancelled = false;
    var runId = ++readAlongRunId;
    var page = Number(document.querySelector('meta[name="page-section-id"]')?.content || 0);
    var words = Array.prototype.slice.call(document.querySelectorAll(".pdf-word"));
    loadRehema().then(function (all) {
      if (runId !== readAlongRunId || readAlongCancelled) return;
      var entry = all[String(page)];
      if (!entry || !entry.audio || !Array.isArray(entry.words)) {
        clearHighlight();
        return;
      }
      var audio = new NativeAudio("./content/imani/" + entry.audio + "?v=17");
      audio.dataset.singleReaderAudio = "1";
      audio.muted = false;
      audio.volume = 1;
      if (window.__adtSingleVoiceAudio && window.__adtSingleVoiceAudio !== audio) {
        window.__adtSingleVoiceAudio.pause();
        window.__adtSingleVoiceAudio.currentTime = 0;
      }
      window.__adtSingleVoiceAudio = audio;
      readAlongAudio = audio;
      var cues = entry.words;
      var segments = cueSegments(cues, words);
      var stopAt = segments.length ? Number(segments[segments.length - 1].end) + 0.12 : 0;
      var cueIndex = -1;
      function update() {
        if (runId !== readAlongRunId) return;
        var time = audio.currentTime || 0;
        if (stopAt && time >= stopAt) {
          audio.pause();
          clearHighlight();
          return;
        }
        var next = cueIndex;
        while (next + 1 < segments.length && Number(segments[next + 1].start) <= time + 0.025) next += 1;
        if (next === cueIndex || next < 0) return;
        cueIndex = next;
        clearHighlight();
        var target = words[segments[cueIndex].wordIndex];
        if (target) {
          target.classList.add("pdf-word-active");
          activeWord = target;
        }
      }
      audio.addEventListener("timeupdate", update);
      audio.addEventListener("ended", function () {
        if (runId === readAlongRunId) clearHighlight();
      });
      audio.play().catch(function () {
        if (runId !== readAlongRunId) return;
        clearHighlight();
        dockReadingActive = false;
        readAlongCancelled = true;
        document.querySelectorAll('button[aria-label^="Deactivate text to speech"]').forEach(function (button) {
          button.setAttribute("aria-label", "Activate text to speech");
          button.setAttribute("aria-pressed", "false");
        });
      });
    });
  }

  var NativeAudio = window.Audio;
  var NativeMediaPlay = window.HTMLMediaElement && window.HTMLMediaElement.prototype.play;
  if (NativeMediaPlay) {
    window.HTMLMediaElement.prototype.play = function () {
      if (voiceDisabled) {
        this.pause();
        this.muted = true;
        this.volume = 0;
        return Promise.resolve();
      }
      var source = String(this.currentSrc || this.src || "");
      var isBuiltInNarration = /\/content\/i18n\/[^/]+\/audio\//i.test(source);
      var readerIsOn = dockReadingActive
        || Boolean(document.querySelector('button[aria-label^="Deactivate text to speech"]'));
      if (isBuiltInNarration || (readerIsOn && this.dataset.singleReaderAudio !== "1")) {
        this.pause();
        this.muted = true;
        this.volume = 0;
        return Promise.resolve();
      }
      return NativeMediaPlay.call(this);
    };
  }
  if (NativeAudio) {
    window.Audio = function (src) {
      var audio = new NativeAudio(src);
      if (src && /\/content\/i18n\/[^/]+\/audio\//i.test(String(src))) {
        audio.muted = true;
        audio.volume = 0;
        audio.play = function () { return Promise.resolve(); };
        return audio;
      }
      attach(audio);
      return audio;
    };
    window.Audio.prototype = NativeAudio.prototype;
  }

  document.addEventListener("play", function (event) {
    if (!(event.target instanceof HTMLAudioElement)) return;
    if (dockReadingActive && event.target.dataset.singleReaderAudio !== "1") {
      event.target.pause();
      event.target.muted = true;
      event.target.volume = 0;
      return;
    }
    attach(event.target);
  }, true);

  function normalizeDockReadingState() {
    if (dockReadingActive) return;
    document.querySelectorAll('button[aria-label^="Deactivate text to speech"]').forEach(function (button) {
      button.setAttribute("aria-label", "Activate text to speech");
      button.setAttribute("aria-pressed", "false");
    });
  }

  var dockObserver = new MutationObserver(normalizeDockReadingState);
  dockObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label"]
  });
  window.setTimeout(normalizeDockReadingState, 400);

  document.addEventListener("click", function (event) {
    var button = event.target && event.target.closest ? event.target.closest("button") : null;
    if (!button) return;
    var label = button.getAttribute("aria-label") || "";
    var activating = /^Activate text to speech/i.test(label);
    var deactivating = /^Deactivate text to speech/i.test(label);
    if (!activating && !deactivating) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (activating) {
      dockReadingActive = true;
      button.setAttribute("aria-label", "Deactivate text to speech");
      button.setAttribute("aria-pressed", "true");
      startRehemaReadAlong();
    } else {
      dockReadingActive = false;
      button.setAttribute("aria-label", "Activate text to speech");
      button.setAttribute("aria-pressed", "false");
      stopReadAlong();
    }
  }, true);

  window.addEventListener("beforeunload", stopReadAlong);

  new MutationObserver(function () {
    document.querySelectorAll("audio").forEach(function (audio) {
      if (dockReadingActive && audio.dataset.singleReaderAudio !== "1") {
        audio.pause();
        audio.muted = true;
        audio.volume = 0;
        return;
      }
      attach(audio);
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
