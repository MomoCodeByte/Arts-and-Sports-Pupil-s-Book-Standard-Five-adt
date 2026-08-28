(() => {
  "use strict";

  const ANSWER_PREFIX = "adt:arts-sports-5:";
  const narrationHooks = document.querySelector(".page-narration-hooks");
  const bookPage = document.querySelector(".book-page");

  function pageNumber() {
    return Number(document.querySelector('meta[name="page-section-id"]')?.content || 0);
  }

  function sectionId() {
    return document.querySelector("[data-section-id]")?.getAttribute("data-section-id") ||
      `page-${pageNumber()}`;
  }

  function repairMojibake(value) {
    return String(value || "")
      .replace(/â€™|â€˜/g, "'")
      .replace(/â€œ|â€/g, '"')
      .replace(/â€“|â€”/g, "-")
      .replace(/�/g, "");
  }

  function canonical(value) {
    return repairMojibake(value)
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripEnumeration(value) {
    return value
      .replace(/^\(?[ivxlcdm]+\)?[.)]?\s+/i, "")
      .replace(/^[a-z][.)]\s+/i, "")
      .replace(/^\d+[.)]\s+/, "")
      .trim();
  }

  function canonicalWithMap(value) {
    const source = String(value || "");
    let text = "";
    const map = [];
    let previousWasSpace = false;

    for (let index = 0; index < source.length; index += 1) {
      let char = source[index];
      if (/\s/.test(char)) {
        if (previousWasSpace) continue;
        char = " ";
        previousWasSpace = true;
      } else {
        previousWasSpace = false;
        if (/[‘’]/.test(char)) char = "'";
        else if (/[“”]/.test(char)) char = '"';
        char = char.toLowerCase();
      }
      text += char;
      map.push(index);
    }

    const leading = text.length - text.trimStart().length;
    const trimmed = text.trim();
    return { text: trimmed, map: map.slice(leading, leading + trimmed.length) };
  }

  function textNodesFor(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest(".page-narration-hooks, script, style, button, input, select, textarea")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    let raw = "";
    let node;
    while ((node = walker.nextNode())) {
      const start = raw.length;
      raw += node.nodeValue || "";
      nodes.push({ node, start, end: raw.length });
    }
    return { nodes, raw };
  }

  function domPosition(nodes, rawIndex) {
    for (const entry of nodes) {
      if (rawIndex >= entry.start && rawIndex <= entry.end) {
        return { node: entry.node, offset: Math.max(0, Math.min(rawIndex - entry.start, entry.end - entry.start)) };
      }
    }
    const last = nodes[nodes.length - 1];
    return last ? { node: last.node, offset: (last.node.nodeValue || "").length } : null;
  }

  function wrapCanonicalText(element, wanted, narrationId, wordOffset = 0) {
    const { nodes, raw } = textNodesFor(element);
    if (!nodes.length) return false;
    const indexed = canonicalWithMap(raw);
    const startIndex = indexed.text.indexOf(wanted);
    if (startIndex < 0) return false;
    const lastIndex = startIndex + wanted.length - 1;
    const rawStart = indexed.map[startIndex];
    const rawEnd = indexed.map[lastIndex] + 1;
    const start = domPosition(nodes, rawStart);
    const end = domPosition(nodes, rawEnd);
    if (!start || !end) return false;

    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    if (range.collapsed) return false;

    const span = document.createElement("span");
    span.setAttribute("data-narration-ref", narrationId);
    span.setAttribute("data-narration-word-offset", String(wordOffset));
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function narrationWordCount(value) {
    return Array.from(String(value || "").matchAll(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)).length;
  }

  function wrapNarrationWords(element) {
    if (!element || element.matches("img") || element.querySelector("[data-narration-word]")) return;
    let wordIndex = Number(element.getAttribute("data-narration-word-offset") || 0);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest("script, style, button, input, select, textarea, [data-narration-word]")) {
          return NodeFilter.FILTER_REJECT;
        }
        return /[\p{L}\p{N}]/u.test(node.nodeValue || "")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    for (const textNode of nodes) {
      const source = textNode.nodeValue || "";
      const matches = Array.from(source.matchAll(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu));
      if (!matches.length) continue;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      for (const match of matches) {
        const start = match.index || 0;
        if (start > cursor) fragment.appendChild(document.createTextNode(source.slice(cursor, start)));
        const word = document.createElement("span");
        word.setAttribute("data-narration-word", String(wordIndex));
        word.textContent = match[0];
        fragment.appendChild(word);
        wordIndex += 1;
        cursor = start + match[0].length;
      }
      if (cursor < source.length) fragment.appendChild(document.createTextNode(source.slice(cursor)));
      textNode.replaceWith(fragment);
    }
  }

  function visibleNarrationCandidates() {
    if (!bookPage) return [];
    return Array.from(bookPage.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, p, figcaption, th, td, .panel-title, .prompt, li",
    )).filter((element) => {
      if (element.closest(".page-narration-hooks")) return false;
      if (element.matches("li") && element.querySelector("p, div, ol, ul, table")) return false;
      return canonical(element.textContent).length > 0;
    });
  }

  function mapNarrationToVisibleText() {
    if (!narrationHooks || !bookPage) return;
    let mapped = 0;
    const hooks = Array.from(narrationHooks.querySelectorAll("[data-id]"));

    for (const hook of hooks) {
      const id = hook.getAttribute("data-id") || "";
      if (!id || /_ans_/i.test(id)) continue;
      const rawHook = canonical(hook.textContent);
      const hookText = stripEnumeration(rawHook);
      if (hookText.length < 4) continue;
      const hookStart = rawHook.indexOf(hookText);
      const wordOffset = narrationWordCount(hookStart > 0 ? rawHook.slice(0, hookStart) : "");

      if (/_im\d+/i.test(id)) {
        const image = Array.from(bookPage.querySelectorAll("img[alt]"))
          .find((candidate) => canonical(candidate.getAttribute("alt")) === hookText);
        if (image && !image.hasAttribute("data-narration-ref")) {
          image.setAttribute("data-narration-ref", id);
          mapped += 1;
          continue;
        }
      }

      const candidates = visibleNarrationCandidates();
      const exact = candidates.find((candidate) =>
        !candidate.hasAttribute("data-narration-ref") &&
        stripEnumeration(canonical(candidate.textContent)) === hookText,
      );
      if (exact) {
        if (canonical(exact.textContent) === hookText) {
          exact.setAttribute("data-narration-ref", id);
          exact.setAttribute("data-narration-word-offset", String(wordOffset));
          mapped += 1;
        } else if (wrapCanonicalText(exact, hookText, id, wordOffset)) {
          mapped += 1;
        }
        continue;
      }

      const containing = candidates
        .filter((candidate) => canonical(candidate.textContent).includes(hookText))
        .sort((a, b) => canonical(a.textContent).length - canonical(b.textContent).length)[0];
      if (containing && wrapCanonicalText(containing, hookText, id, wordOffset)) mapped += 1;
    }

    document.querySelectorAll("[data-narration-ref]").forEach(wrapNarrationWords);

    document.documentElement.setAttribute("data-adt-narration-mapped", String(mapped));
  }

  let activeHighlight = null;
  let activeWordHighlight = null;
  let highlightFrame = 0;
  let narrationPaused = false;

  function clearVisibleNarrationHighlight() {
    if (activeHighlight) activeHighlight.classList.remove("adt-sentence-speaking");
    if (activeWordHighlight) activeWordHighlight.classList.remove("adt-word-speaking");
    document.querySelectorAll(".adt-sentence-speaking, [data-narration-word].adt-word-speaking").forEach((element) => {
      element.classList.remove("adt-sentence-speaking", "adt-word-speaking");
    });
    activeHighlight = null;
    activeWordHighlight = null;
  }

  function findVisibleNarrationTarget(id) {
    return Array.from(document.querySelectorAll("[data-narration-ref]"))
      .find((element) => element.getAttribute("data-narration-ref") === id) || null;
  }

  function syncNarrationHighlight() {
    highlightFrame = 0;
    if (document.documentElement.getAttribute("data-adt-audio-voice") === "en-TZ-ImaniNeural") {
      clearVisibleNarrationHighlight();
      return;
    }
    const playerGroup = document.querySelector('[role="group"][aria-label="Read aloud controls"]');
    const playerAction = Array.from(playerGroup?.querySelectorAll("button") || [])
      .map((button) => button.getAttribute("aria-label") || "")
      .find((label) => /^(play|pause)$/i.test(label));
    if (/^play$/i.test(playerAction || "")) narrationPaused = true;
    else if (/^pause$/i.test(playerAction || "")) narrationPaused = false;
    const activeHook = narrationHooks?.querySelector(
      "[data-tts-original-html], .tts-active-block",
    ) || narrationHooks?.querySelector("[data-id]:has(.bg-yellow-300)");
    const id = activeHook?.getAttribute("data-id") || "";
    const next = id ? findVisibleNarrationTarget(id) : null;
    const nativeWord = activeHook?.querySelector("[data-word-index].bg-yellow-300");
    const wordIndex = nativeWord?.getAttribute("data-word-index") || "";
    const nextWord = next && wordIndex
      ? next.querySelector(`[data-narration-word="${CSS.escape(wordIndex)}"]`)
      : null;
    if (narrationPaused || !nextWord) {
      clearVisibleNarrationHighlight();
      return;
    }
    if (activeHighlight && activeHighlight !== next) activeHighlight.classList.remove("adt-sentence-speaking");
    if (activeWordHighlight && activeWordHighlight !== nextWord) activeWordHighlight.classList.remove("adt-word-speaking");
    nextWord.classList.add("adt-word-speaking");
    activeHighlight = next;
    activeWordHighlight = nextWord;
  }

  function scheduleHighlightSync() {
    if (highlightFrame) return;
    highlightFrame = requestAnimationFrame(syncNarrationHighlight);
  }

  function observeNarration() {
    if (!narrationHooks) return;
    new MutationObserver(scheduleHighlightSync).observe(narrationHooks, {
      attributes: true,
      attributeFilter: ["class", "data-tts-original-html"],
      childList: true,
      subtree: true,
    });
  }

  function installReplayButton() {
    const group = document.querySelector('[role="group"][aria-label="Read aloud controls"]');
    if (!group || group.querySelector("[data-adt-replay]")) return;
    const stop = Array.from(group.querySelectorAll("button"))
      .find((button) => /^stop$/i.test(button.getAttribute("aria-label") || ""));
    if (!stop) return;

    if (!stop.hasAttribute("data-adt-highlight-stop")) {
      stop.setAttribute("data-adt-highlight-stop", "true");
      stop.addEventListener("click", () => {
        narrationPaused = true;
        requestAnimationFrame(() => {
          clearVisibleNarrationHighlight();
        });
      });
    }

    const playPause = Array.from(group.querySelectorAll("button")).find((button) =>
      /^(play|pause)$/i.test(button.getAttribute("aria-label") || ""),
    );
    if (playPause && !playPause.hasAttribute("data-adt-highlight-play-pause")) {
      playPause.setAttribute("data-adt-highlight-play-pause", "true");
      playPause.addEventListener("click", () => {
        const action = playPause.getAttribute("aria-label") || "";
        narrationPaused = /^pause$/i.test(action);
        if (narrationPaused) clearVisibleNarrationHighlight();
        else scheduleHighlightSync();
      });
    }

    const replay = document.createElement("button");
    replay.type = "button";
    replay.className = "adt-replay-button";
    replay.setAttribute("data-adt-replay", "true");
    replay.setAttribute("aria-label", "Replay current sentence");
    replay.title = "Replay current sentence";
    replay.textContent = "↻";
    replay.addEventListener("click", () => {
      const audio = typeof window.__adtGetNarrationAudio === "function"
        ? window.__adtGetNarrationAudio()
        : null;
      const playButton = Array.from(group.querySelectorAll("button"))
        .find((button) => /^play$/i.test(button.getAttribute("aria-label") || ""));
      if (!audio || !audio.src) {
        playButton?.click();
        return;
      }
      try {
        audio.currentTime = 0;
        if (audio.paused) {
          if (playButton) playButton.click();
          else audio.play().catch(() => {});
        } else {
          audio.play().catch(() => {});
        }
      } catch (_error) {
        playButton?.click();
      }
    });
    stop.parentElement?.insertBefore(replay, stop);
  }

  function observeAudioToolbar() {
    new MutationObserver(installReplayButton).observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-label"],
      childList: true,
      subtree: true,
    });
    installReplayButton();
  }

  function removeRequestedSubmitControls(page) {
    const pagesWithoutSubmit = new Set([11, 12, 27, 30, 34, 35, 64, 78, 89]);
    if (!pagesWithoutSubmit.has(page)) return;

    const removeSubmit = () => {
      document.querySelectorAll("button, input[type='submit'], input[type='button']").forEach((control) => {
        const label = canonical(control.getAttribute("aria-label") || control.textContent || control.value);
        if (label === "submit") control.remove();
      });
    };

    removeSubmit();
    new MutationObserver(removeSubmit).observe(document.body, { childList: true, subtree: true });
    document.documentElement.setAttribute("data-adt-submit-removed", String(page));
  }

  function installImaniReadAloud() {
    const page = pageNumber();
    if (!bookPage || page < 1 || page > 112) return;

    const AudioConstructor = window.__adtNativeAudio || window.Audio;
    if (typeof AudioConstructor !== "function") return;

    let audio = null;
    let cues = [];
    let pageWords = [];
    let cueWordMap = [];
    let activeWord = null;
    let activeVisual = null;
    let animationFrame = 0;
    let loading = null;
    let active = false;
    let rate = 1;
    let volume = 1;
    let controls = null;
    let playPauseButton = null;
    let status = null;
    let automaticResumePending = false;

    const continuationKey = "adt:arts-and-sports-5:imani-continue";

    function shouldContinueOnNextPage() {
      try { return sessionStorage.getItem(continuationKey) === "true"; }
      catch (_error) { return false; }
    }

    function rememberContinuation(shouldContinue) {
      try {
        if (shouldContinue) sessionStorage.setItem(continuationKey, "true");
        else sessionStorage.removeItem(continuationKey);
      } catch (_error) {}
    }

    const pageStem = `page-${String(page).padStart(3, "0")}`;
    const audioUrl = `./content/imani/${pageStem}.mp3?v=20260828-26`;
    const cuesUrl = `./content/imani/${pageStem}.json?v=20260828-26`;

    function normalizedWord(value) {
      return String(value || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, "");
    }

    function installImaniImageDescriptions() {
      const visuals = Array.from(bookPage.querySelectorAll("img[alt], [role='img'][aria-label]"))
        .filter((visual) => {
          if (visual.closest(".page-narration-hooks, [aria-hidden='true']")) return false;
          const description = visual.matches("img")
            ? visual.getAttribute("alt")
            : visual.getAttribute("aria-label");
          return canonical(description).length > 0;
        });

      visuals.forEach((visual, index) => {
        if (visual.hasAttribute("data-adt-image-key")) return;
        const key = `page-${page}-visual-${index + 1}`;
        const description = repairMojibake(
          visual.matches("img") ? visual.getAttribute("alt") : visual.getAttribute("aria-label"),
        ).trim();
        const spokenDescription = document.createElement("span");
        spokenDescription.className = "adt-imani-image-description adt-visually-hidden";
        spokenDescription.setAttribute("aria-hidden", "true");
        spokenDescription.setAttribute("data-adt-image-for", key);
        spokenDescription.textContent = `Image description: ${description}`;
        visual.setAttribute("data-adt-image-key", key);
        visual.insertAdjacentElement("afterend", spokenDescription);
      });
    }

    function expandTimedCues(sourceCues) {
      const expanded = [];
      sourceCues.forEach((cue) => {
        const text = String(cue.text || cue.word || "");
        const tokens = Array.from(text.matchAll(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu))
          .map((match) => match[0]);
        if (!tokens.length) return;
        const start = Number(cue.start || 0);
        const end = Math.max(start, Number(cue.end || start));
        const duration = Math.max(0.04, end - start);
        const characters = tokens.reduce((total, token) => total + Math.max(1, token.length), 0);
        let elapsed = 0;
        tokens.forEach((token) => {
          const tokenStart = start + duration * elapsed / characters;
          elapsed += Math.max(1, token.length);
          const tokenEnd = start + duration * elapsed / characters;
          expanded.push({ text: token, start: tokenStart, end: tokenEnd });
        });
      });
      return expanded;
    }

    function editDistance(left, right) {
      const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
      for (let row = 1; row <= left.length; row += 1) {
        const current = [row];
        for (let column = 1; column <= right.length; column += 1) {
          current[column] = Math.min(
            current[column - 1] + 1,
            previous[column] + 1,
            previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
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

    function mapCuesToWords() {
      const cueTokens = cues.map((cue) => normalizedWord(cue.text || cue.word));
      const visibleTokens = pageWords.map((word) => normalizedWord(word.textContent));
      const rows = cueTokens.length + 1;
      const columns = visibleTokens.length + 1;
      const scores = Array.from({ length: rows }, () => new Int32Array(columns));
      const moves = Array.from({ length: rows }, () => new Int8Array(columns));

      for (let row = 1; row < rows; row += 1) scores[row][0] = -row * 2;
      for (let column = 1; column < columns; column += 1) scores[0][column] = -column * 2;
      for (let row = 1; row < rows; row += 1) {
        for (let column = 1; column < columns; column += 1) {
          const diagonal = scores[row - 1][column - 1] +
            wordMatchScore(cueTokens[row - 1], visibleTokens[column - 1]);
          const skipCue = scores[row - 1][column] - 2;
          const skipVisible = scores[row][column - 1] - 2;
          if (diagonal >= skipCue && diagonal >= skipVisible) {
            scores[row][column] = diagonal;
            moves[row][column] = 1;
          } else if (skipCue >= skipVisible) {
            scores[row][column] = skipCue;
            moves[row][column] = 2;
          } else {
            scores[row][column] = skipVisible;
            moves[row][column] = 3;
          }
        }
      }

      const mapping = new Array(cues.length).fill(-1);
      let row = cueTokens.length;
      let column = visibleTokens.length;
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
      cueWordMap = mapping;
    }

    function wrapAllVisibleWords() {
      if (bookPage.querySelector("[data-imani-page-word]")) {
        pageWords = Array.from(bookPage.querySelectorAll("[data-imani-page-word]"));
        return;
      }
      const walker = document.createTreeWalker(bookPage, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (parent?.closest(".adt-imani-image-description")) {
            return /[\p{L}\p{N}]/u.test(node.nodeValue || "")
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
          if (!parent || parent.closest(
            ".page-narration-hooks, script, style, button, input, select, textarea, [aria-hidden='true'], [role='img']",
          )) return NodeFilter.FILTER_REJECT;
          return /[\p{L}\p{N}]/u.test(node.nodeValue || "")
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      });
      const nodes = [];
      let node;
      while ((node = walker.nextNode())) nodes.push(node);
      let wordIndex = 0;
      for (const textNode of nodes) {
        const source = textNode.nodeValue || "";
        const matches = Array.from(source.matchAll(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu));
        if (!matches.length) continue;
        const fragment = document.createDocumentFragment();
        let cursor = 0;
        for (const match of matches) {
          const start = match.index || 0;
          if (start > cursor) fragment.appendChild(document.createTextNode(source.slice(cursor, start)));
          const word = document.createElement("span");
          word.setAttribute("data-imani-page-word", String(wordIndex));
          word.textContent = match[0];
          fragment.appendChild(word);
          wordIndex += 1;
          cursor = start + match[0].length;
        }
        if (cursor < source.length) fragment.appendChild(document.createTextNode(source.slice(cursor)));
        textNode.replaceWith(fragment);
      }
      pageWords = Array.from(bookPage.querySelectorAll("[data-imani-page-word]"));
    }

    function clearImaniHighlight() {
      if (activeWord) activeWord.classList.remove("adt-word-speaking");
      if (activeVisual) activeVisual.classList.remove("adt-image-speaking");
      activeWord = null;
      activeVisual = null;
    }

    function cueIndexAt(time) {
      let low = 0;
      let high = cues.length - 1;
      while (low <= high) {
        const middle = (low + high) >> 1;
        if (Number(cues[middle].start) <= time) low = middle + 1;
        else high = middle - 1;
      }
      return Math.max(0, high);
    }

    function updateHighlight() {
      animationFrame = 0;
      if (!audio || audio.paused || audio.ended || !cues.length) return;
      const cueIndex = cueIndexAt(audio.currentTime || 0);
      const word = pageWords[cueWordMap[cueIndex]] || null;
      if (word !== activeWord) {
        clearImaniHighlight();
        activeWord = word;
        const imageDescription = activeWord?.closest(".adt-imani-image-description");
        const imageKey = imageDescription?.getAttribute("data-adt-image-for") || "";
        if (imageKey) {
          activeVisual = bookPage.querySelector(`[data-adt-image-key="${CSS.escape(imageKey)}"]`);
          activeVisual?.classList.add("adt-image-speaking");
        } else {
          activeWord?.classList.add("adt-word-speaking");
        }
      }
      animationFrame = requestAnimationFrame(updateHighlight);
    }

    function scheduleHighlight() {
      if (!animationFrame) animationFrame = requestAnimationFrame(updateHighlight);
    }

    function updatePlayPause() {
      if (!playPauseButton) return;
      const playing = Boolean(audio && !audio.paused && !audio.ended);
      playPauseButton.textContent = playing ? "❚❚" : "▶";
      playPauseButton.setAttribute("aria-label", playing ? "Pause" : "Play");
      playPauseButton.setAttribute("aria-pressed", playing ? "true" : "false");
    }

    function setTopButtonState(isOn) {
      document.querySelectorAll('button[aria-label*="text to speech" i]').forEach((button) => {
        const label = isOn
          ? "Deactivate text to speech, Imani voice"
          : "Activate text to speech, Imani voice";
        const pressed = isOn ? "true" : "false";
        if (button.getAttribute("aria-label") !== label) button.setAttribute("aria-label", label);
        if (button.getAttribute("aria-pressed") !== pressed) button.setAttribute("aria-pressed", pressed);
      });
    }

    function suppressBundledReader() {
      window.__adtStopBundledNarration?.();
      document.querySelectorAll('[role="group"][aria-label="Read aloud controls"]').forEach((group) => {
        group.setAttribute("data-adt-suppressed", "true");
      });
      setTopButtonState(active);
    }

    function announce(message) {
      if (status) status.textContent = message;
    }

    async function prepare() {
      if (loading) return loading;
      loading = (async () => {
        installImaniImageDescriptions();
        wrapAllVisibleWords();
        const response = await fetch(cuesUrl);
        if (!response.ok) throw new Error(`Unable to load Imani timings for page ${page}`);
        const payload = await response.json();
        cues = expandTimedCues(Array.isArray(payload) ? payload : (payload.words || []));
        mapCuesToWords();
        audio = new AudioConstructor(audioUrl);
        audio.preload = "auto";
        audio.playbackRate = rate;
        audio.volume = volume;
        audio.addEventListener("play", () => {
          updatePlayPause();
          scheduleHighlight();
          announce("Imani narration playing.");
        });
        audio.addEventListener("pause", () => {
          updatePlayPause();
          clearImaniHighlight();
        });
        audio.addEventListener("ended", () => {
          clearImaniHighlight();
          updatePlayPause();
          announce("Imani narration finished.");
        });
        audio.addEventListener("error", () => announce("Imani narration is unavailable on this page."));
        window.__adtImaniAudio = audio;
      })().catch((error) => {
        loading = null;
        throw error;
      });
      return loading;
    }

    function narrationSentences() {
      if (!pageWords.length) return [];
      const sentences = [];
      let start = 0;
      const blockSelector =
        ".adt-imani-image-description, [data-narration-ref], p, li, figcaption, h1, h2, h3, h4, h5, h6, th, td";

      for (let index = 0; index < pageWords.length; index += 1) {
        const word = pageWords[index];
        const nextWord = pageWords[index + 1] || null;
        let endsSentence = !nextWord;
        if (nextWord) {
          const block = word.closest(blockSelector);
          const nextBlock = nextWord.closest(blockSelector);
          endsSentence = block !== nextBlock;
          if (!endsSentence) {
            const separator = document.createRange();
            separator.setStartAfter(word);
            separator.setEndBefore(nextWord);
            endsSentence = /[.!?][”"'’)}\]]*\s*$/.test(separator.toString());
          }
        }
        if (endsSentence) {
          sentences.push({ start, end: index });
          start = index + 1;
        }
      }
      return sentences;
    }

    function currentBlockBounds() {
      if (!cues.length) return { start: 0, end: 0 };
      const currentCue = cueIndexAt(audio?.currentTime || 0);
      const currentWordIndex = cueWordMap[currentCue];
      const sentence = narrationSentences().find(
        (range) => currentWordIndex >= range.start && currentWordIndex <= range.end,
      );
      if (!sentence) {
        return { start: Number(cues[currentCue]?.start || 0), end: Number(cues[currentCue]?.end || 0) };
      }
      const firstCue = cueWordMap.findIndex((wordIndex) => wordIndex >= sentence.start);
      let lastCue = cueWordMap.length - 1;
      for (let index = Math.max(0, firstCue); index < cueWordMap.length; index += 1) {
        if (cueWordMap[index] > sentence.end) {
          lastCue = Math.max(firstCue, index - 1);
          break;
        }
      }
      return {
        start: Number(cues[Math.max(0, firstCue)]?.start || 0),
        end: Number(cues[Math.max(0, lastCue)]?.end || 0),
      };
    }

    async function playFrom(position, options = {}) {
      try {
        await prepare();
        if (!audio || !cues.length) return;
        active = true;
        automaticResumePending = false;
        if (options.remember !== false) rememberContinuation(true);
        controls.hidden = false;
        setTopButtonState(true);
        if (Number.isFinite(position)) {
          let start = Math.max(0, position);
          const firstCue = String(cues[0]?.text || cues[0]?.word || "").trim();
          if (start === 0 && (/^\d+$/.test(firstCue) || /^[ivxlcdm]+$/i.test(firstCue)) && cues.length > 1) {
            start = Number(cues[1].start || 0);
          }
          audio.currentTime = start;
        }
        audio.playbackRate = rate;
        audio.volume = volume;
        await audio.play();
      } catch (error) {
        if (error?.name === "NotAllowedError" && shouldContinueOnNextPage()) {
          active = true;
          automaticResumePending = true;
          controls.hidden = false;
          setTopButtonState(true);
          announce("Imani narration is ready. Select Play if the browser has paused automatic audio.");
          return;
        }
        rememberContinuation(false);
        active = false;
        announce("Imani narration is unavailable on this page.");
        setTopButtonState(false);
      }
    }

    function pause() {
      audio?.pause();
      clearImaniHighlight();
    }

    function stop() {
      active = false;
      automaticResumePending = false;
      rememberContinuation(false);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      clearImaniHighlight();
      if (controls) controls.hidden = true;
      setTopButtonState(false);
      announce("Imani narration stopped.");
    }

    function leavePage() {
      if (audio) audio.pause();
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      clearImaniHighlight();
    }

    async function replayBlock() {
      await prepare();
      const bounds = currentBlockBounds();
      await playFrom(bounds.start);
    }

    async function moveBlock(direction) {
      await prepare();
      if (!audio || !cues.length) return;
      const sentences = narrationSentences();
      const currentCue = cueIndexAt(audio.currentTime || 0);
      const currentWordIndex = cueWordMap[currentCue];
      const currentSentence = sentences.findIndex(
        (range) => currentWordIndex >= range.start && currentWordIndex <= range.end,
      );
      const targetSentence = currentSentence + direction;
      if (currentSentence < 0 || targetSentence < 0 || targetSentence >= sentences.length) {
        announce(direction < 0
          ? "There is no previous sentence on this page."
          : "There is no next sentence on this page.");
        return;
      }
      const firstWordIndex = sentences[targetSentence].start;
      const firstCue = cueWordMap.findIndex((wordIndex) => wordIndex >= firstWordIndex);
      if (firstCue < 0) return;
      await playFrom(Number(cues[firstCue]?.start || 0));
    }

    function makeButton(label, text, handler) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "adt-imani-button";
      button.setAttribute("aria-label", label);
      button.title = label;
      button.textContent = text;
      button.addEventListener("click", handler);
      return button;
    }

    function buildControls() {
      controls = document.createElement("div");
      controls.className = "adt-imani-controls";
      controls.hidden = true;
      controls.setAttribute("role", "group");
      controls.setAttribute("aria-label", "Imani read aloud controls");

      const previous = makeButton("Go to previous sentence", "⏮", () => moveBlock(-1));
      playPauseButton = makeButton("Play", "▶", () => {
        if (audio && !audio.paused) pause();
        else playFrom(audio?.currentTime || 0);
      });
      const next = makeButton("Go to next sentence", "⏭", () => moveBlock(1));
      const replay = makeButton("Replay current sentence", "↻", replayBlock);
      const stopButton = makeButton("Stop", "■", stop);

      const speed = document.createElement("select");
      speed.className = "adt-imani-select";
      speed.setAttribute("aria-label", "Playback speed");
      speed.innerHTML = [
        ["0.75", "Slow"], ["1", "Normal"], ["1.25", "Fast"], ["1.5", "Very fast"],
      ].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
      speed.value = String(rate);
      speed.addEventListener("change", () => {
        rate = Number(speed.value) || 1;
        if (audio) audio.playbackRate = rate;
      });

      const volumeLabel = document.createElement("label");
      volumeLabel.className = "adt-imani-volume";
      const volumeText = document.createElement("span");
      volumeText.className = "adt-visually-hidden";
      volumeText.textContent = "Narration volume";
      const volumeSlider = document.createElement("input");
      volumeSlider.type = "range";
      volumeSlider.min = "0";
      volumeSlider.max = "1";
      volumeSlider.step = "0.1";
      volumeSlider.value = String(volume);
      volumeSlider.setAttribute("aria-label", "Narration volume");
      volumeSlider.addEventListener("input", () => {
        volume = Number(volumeSlider.value);
        if (audio) audio.volume = volume;
      });
      volumeLabel.append(volumeText, volumeSlider);

      status = document.createElement("span");
      status.className = "adt-visually-hidden";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      controls.append(previous, playPauseButton, next, replay, stopButton, speed, volumeLabel, status);
      document.body.appendChild(controls);
    }

    buildControls();
    suppressBundledReader();
    new MutationObserver(suppressBundledReader).observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-label", "aria-pressed"],
      childList: true,
      subtree: true,
    });

    document.addEventListener("click", (event) => {
      const button = event.target.closest?.('button[aria-label*="text to speech" i]');
      if (!button || button.closest(".adt-imani-controls")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (active) stop();
      else playFrom(0);
    }, true);

    window.__adtReplayNarration = replayBlock;
    window.__adtStopImaniNarration = stop;
    window.addEventListener("beforeunload", leavePage);
    window.addEventListener("pagehide", leavePage);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pause();
    });

    const resumeAutomaticAudio = () => {
      if (!automaticResumePending || !shouldContinueOnNextPage()) return;
      playFrom(audio?.currentTime || 0, { remember: false });
    };
    document.addEventListener("pointerdown", resumeAutomaticAudio, true);
    document.addEventListener("keydown", resumeAutomaticAudio, true);

    if (shouldContinueOnNextPage()) {
      active = true;
      controls.hidden = false;
      setTopButtonState(true);
      queueMicrotask(() => playFrom(0, { remember: false }));
    }
    document.documentElement.setAttribute("data-adt-audio-voice", "en-TZ-ImaniNeural");
  }

  function readStored(key) {
    try { return localStorage.getItem(key) || ""; } catch (_error) { return ""; }
  }

  function writeStored(key, value) {
    try { localStorage.setItem(key, value); } catch (_error) {}
  }

  const OPEN_RESPONSE_SELECTORS = {
    8: [".exercise-box > ol > li", ".activity-box > p"],
    14: [".exercise-box > ol:not([class]) > li"],
    16: [".exercise-box > ol:not([class]) > li", ".activity-box.compact-activity:not(.activity-five) > p"],
    17: [".exercise-box > ol > li"],
    20: [".activity-box.second .activity-alpha-list > li:nth-child(3)", ".activity-box:not(.second) .activity-alpha-list > li:nth-child(2)"],
    21: [".exercise-box > ol > li"],
    27: [".exercise-box > ol > li"],
    46: ["#activity-14-title + p", "#activity-15-title + p"],
    48: [".exercise-box > ol > li"],
    59: [".activity-box .activity-alpha-list > li:nth-child(2)"],
    61: [".activity-panel .alpha-list > li:nth-child(2)", ".exercise-panel .number-list > li"],
    75: [".exercise-panel .number-list > li"],
    84: [".exercise-panel .number-list > li"],
    87: [".exercise-panel .number-list > li"],
    89: [".exercise-panel .number-list > li"],
    95: [".exercise-panel .number-list > li"],
    96: [".exercise-panel .number-list > li"],
    97: [".exercise-panel .number-list > li"],
    98: [".exercise-panel .number-list > li"],
    105: [".exercise-panel .number-list > li"],
    106: [".exercise-panel .number-list > li"],
    108: [".exercise-panel .number-list > li"],
    112: [".written-questions > li"],
  };

  function openResponseTargets(page) {
    const selectors = OPEN_RESPONSE_SELECTORS[page] || [];
    const seen = new Set();
    const targets = [];
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((element) => {
        if (!seen.has(element)) {
          seen.add(element);
          targets.push(element);
        }
      });
    }
    return targets;
  }

  const SHORT_RESPONSE_TARGETS = new Set(["87:6", "106:3", "112:8"]);

  function questionNumberFor(target, fallback) {
    const list = target.parentElement;
    if (!list?.matches("ol") || !target.matches("li")) return "";
    const siblings = Array.from(list.children).filter((node) => node.matches("li"));
    const position = siblings.indexOf(target);
    const start = Number(list.getAttribute("start") || 1);
    return String(start + Math.max(0, position));
  }

  function saveStatus() {
    let status = document.getElementById("adt-answer-save-status");
    if (status) return status;
    status = document.createElement("div");
    status.id = "adt-answer-save-status";
    status.className = "adt-visually-hidden";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    document.body.appendChild(status);
    return status;
  }

  function initOpenResponses(page) {
    const targets = openResponseTargets(page);
    if (!targets.length) return;
    if (targets.length >= 5) bookPage?.setAttribute("data-adt-answer-density", "dense");
    targets.forEach((target, index) => {
      if (target.querySelector(":scope > .adt-direct-answer, input[type='text'], textarea, select")) return;
      if (!target.id) target.id = `adt-question-${page}-${index + 1}`;
      const questionText = target.textContent.replace(/\s+/g, " ").trim();
      const questionNumber = questionNumberFor(target, index + 1);
      const label = questionNumber
        ? `Answer for question ${questionNumber}: ${questionText}`
        : `Answer for: ${questionText}`;
      const key = `${ANSWER_PREFIX}${sectionId()}:${target.id}:answer`;
      const shortAnswer = SHORT_RESPONSE_TARGETS.has(`${page}:${index + 1}`);
      const field = document.createElement(shortAnswer ? "input" : "textarea");
      if (shortAnswer) field.type = "text";
      else field.rows = targets.length >= 5 ? 1 : 2;
      field.className = `adt-direct-answer ${shortAnswer ? "adt-direct-answer-short" : "adt-direct-answer-long"}`;
      field.id = `${target.id}-answer`;
      field.setAttribute("aria-label", label);
      field.setAttribute("data-answer-key", key);
      field.setAttribute("autocomplete", "off");
      field.setAttribute("spellcheck", "true");
      field.value = readStored(key);
      field.addEventListener("input", () => writeStored(key, field.value));
      field.addEventListener("keydown", (event) => {
        if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
        const fields = Array.from(document.querySelectorAll(".adt-direct-answer"));
        const current = fields.indexOf(field);
        const next = current + (event.shiftKey ? -1 : 1);
        if (next < 0 || next >= fields.length) return;
        event.preventDefault();
        event.stopPropagation();
        fields[next].focus();
      });
      field.addEventListener("blur", () => {
        writeStored(key, field.value);
        const status = saveStatus();
        status.textContent = "";
        requestAnimationFrame(() => { status.textContent = "Response saved on this device."; });
      });
      target.classList.add("adt-question-with-answer");
      target.appendChild(field);
    });
  }

  function testKey(question) {
    return `${ANSWER_PREFIX}test-question-${question}`;
  }

  function initMultipleChoice(page) {
    if (page !== 109 && page !== 110) return;
    const topList = document.querySelector("ol.multiple-choice");
    if (!topList) return;
    Array.from(topList.children).filter((node) => node.matches("li")).forEach((questionLi, index) => {
      const question = page === 109 ? index + 1 : (index === 0 ? 6 : index + 6);
      const optionList = Array.from(questionLi.children).find((node) => node.matches?.("ol"));
      if (!optionList) return;
      const prompt = questionLi.querySelector(":scope > .prompt");
      if (prompt && !prompt.id) prompt.id = `adt-test-question-${question}`;
      const start = Number(optionList.getAttribute("start") || 1);
      const options = [];

      Array.from(optionList.children).filter((node) => node.matches("li")).forEach((optionLi, optionIndex) => {
        const letter = String.fromCharCode(64 + start + optionIndex);
        const visibleText = optionLi.textContent.trim();
        optionLi.classList.add("adt-choice-option");
        const input = document.createElement("input");
        input.type = "radio";
        input.className = "adt-visually-hidden";
        input.name = `adt-test-question-${question}`;
        input.value = letter;
        input.id = `adt-test-question-${question}-option-${letter}`;
        input.setAttribute("data-activity-item", `question-${question}-${letter}`);
        if (prompt) input.setAttribute("aria-describedby", prompt.id);
        else input.setAttribute("aria-label", `Question ${question}, continued: option ${letter}, ${visibleText}`);

        const text = document.createElement("span");
        while (optionLi.firstChild) text.appendChild(optionLi.firstChild);
        const label = document.createElement("label");
        label.className = "adt-choice-label";
        label.htmlFor = input.id;
        label.append(input, text);
        optionLi.appendChild(label);
        const option = { li: optionLi, input, letter };
        options.push(option);
        input.addEventListener("change", () => {
          if (!input.checked) return;
          writeStored(testKey(question), letter);
          options.forEach(({ li }) => li.classList.remove("adt-selected"));
          optionLi.classList.add("adt-selected");
        });
      });

      const saved = readStored(testKey(question));
      const selected = options.find((option) => option.letter === saved);
      if (selected) {
        selected.input.checked = true;
        selected.li.classList.add("adt-selected");
      }
    });
  }

  function initMatchingAndFill(page) {
    if (page !== 111) return;
    document.querySelectorAll("table.matching-table tbody tr").forEach((row, index) => {
      const cell = row.querySelector("td");
      if (!cell) return;
      const term = cell.textContent.trim();
      const select = document.createElement("select");
      select.className = "adt-match-select";
      select.setAttribute("aria-label", `Match ${term} with an item from List B`);
      select.setAttribute("data-aria-id", `matching-${index + 1}`);
      select.innerHTML = '<option value="">Choose</option>' + ["A", "B", "C", "D", "E"]
        .map((letter) => `<option value="${letter}">${letter}</option>`).join("");
      const key = `${ANSWER_PREFIX}${sectionId()}:matching-${index + 1}`;
      select.value = readStored(key);
      select.addEventListener("change", () => {
        writeStored(key, select.value);
      });
      cell.append(" ", select);
    });

    document.querySelectorAll(".fill-list .blank-line").forEach((blank, index) => {
      const input = document.createElement("input");
      input.type = "text";
      input.className = `adt-fill-input ${blank.classList.contains("wide") ? "wide" : blank.classList.contains("medium") ? "medium" : "short"}`;
      input.setAttribute("aria-label", `Blank answer ${index + 1}`);
      input.setAttribute("data-aria-id", `fill-${index + 1}`);
      input.autocomplete = "off";
      const key = `${ANSWER_PREFIX}${sectionId()}:fill-${index + 1}`;
      input.value = readStored(key);
      input.addEventListener("input", () => {
        writeStored(key, input.value);
      });
      blank.replaceWith(input);
    });
  }

  function initTrueFalse(page) {
    if (page !== 112) return;
    document.querySelectorAll(".true-false > li").forEach((item, index) => {
      const blank = item.querySelector(".blank-line");
      if (!blank) return;
      if (!item.id) item.id = `adt-true-false-source-${index + 1}`;
      const group = document.createElement("span");
      group.className = "adt-tf-controls";
      group.setAttribute("role", "radiogroup");
      group.setAttribute("aria-labelledby", item.id);
      const key = `${ANSWER_PREFIX}${sectionId()}:true-false-${index + 1}`;
      const saved = readStored(key);
      for (const value of ["true", "false"]) {
        const label = document.createElement("label");
        label.className = "adt-tf-label";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `adt-true-false-${index + 1}`;
        radio.value = value;
        radio.checked = saved === value;
        radio.addEventListener("change", () => {
          if (!radio.checked) return;
          writeStored(key, value);
        });
        label.append(radio, document.createTextNode(value.toUpperCase()));
        group.appendChild(label);
      }
      blank.replaceWith(group);
    });
  }

  function initialize() {
    const page = pageNumber();
    mapNarrationToVisibleText();
    observeNarration();
    observeAudioToolbar();
    removeRequestedSubmitControls(page);
    initOpenResponses(page);
    initMultipleChoice(page);
    initMatchingAndFill(page);
    initTrueFalse(page);
    installImaniReadAloud();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
