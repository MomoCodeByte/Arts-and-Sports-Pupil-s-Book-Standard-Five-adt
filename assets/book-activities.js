(() => {
  "use strict";
  const ANSWER_PREFIX = "adt:arts-sports-5:";
  const bookPage = document.querySelector(".book-page");
  const pageNumber = () => Number(bookPage?.dataset.sourcePage || 0);
  const sectionId = () => bookPage?.dataset.sourceSection || "cover";
  const canonical = value => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
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

  function readableText(element) {
    const copy = element.cloneNode(true);
    copy.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
    return copy.textContent.replace(/\s+/g, " ").trim();
  }

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
      const questionText = readableText(target);
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
    removeRequestedSubmitControls(page);
    initOpenResponses(page);
    initMultipleChoice(page);
    initMatchingAndFill(page);
    initTrueFalse(page);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, {once:true});
  else initialize();
})();
