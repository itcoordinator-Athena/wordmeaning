// glossary.js
(() => {
  const popup = document.getElementById("dictPopup");
  const popupWord = document.getElementById("popupWord");
  const popupMeta = document.getElementById("popupMeta");
  const popupBody = document.getElementById("popupBody");
  const closeBtn = document.getElementById("closeBtn");
  const readingArea = document.getElementById("readingArea");

  // If the page doesn't include these elements, do nothing.
  if (!popup || !popupWord || !popupMeta || !popupBody || !readingArea) return;

  const cfg = window.GLOSSARY_CONTEXT || {};
  const { courseName, moduleName, lessonId, glossaryUrl = "./glossary.json" } = cfg;

  function hidePopup() {
    popup.style.display = "none";
    popupWord.textContent = "";
    popupMeta.textContent = "";
    popupBody.textContent = "";
  }

  function normalize(s) {
    return (s || "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  // Allow multi-word selections like "Financial Transactions"
  function isSelectableTerm(text) {
    if (!text) return false;
    if (text.length > 120) return false;
    return /^[A-Za-z][A-Za-z\s'’\-()\/.]*$/.test(text.trim());
  }

  function getSelectionRect() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return null;
    return rect;
  }

  function positionPopupNearRect(rect) {
    const padding = 10;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;

    let top = rect.bottom + scrollY + padding;
    let left = rect.left + scrollX;

    popup.style.display = "block";
    const pr = popup.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    if (left + pr.width > scrollX + vw - padding) left = scrollX + vw - pr.width - padding;
    if (top + pr.height > scrollY + vh - padding) top = rect.top + scrollY - pr.height - padding;

    left = Math.max(scrollX + padding, left);
    top = Math.max(scrollY + padding, top);

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  // Loaded glossary map for the current page context only
  let termMap = new Map(); // normalizedTerm -> { displayTerm, meaning }
  let ready = false;

  async function loadGlossaryForContext() {
    ready = false;
    termMap = new Map();

    // If context is missing, disable popup entirely
    if (!courseName || !moduleName || !lessonId) return;

    const res = await fetch(glossaryUrl, { cache: "no-store" });
    if (!res.ok) return;

    const data = await res.json();

    const course = data?.courses?.[courseName];
    const module = course?.modules?.[moduleName];
    const lesson = module?.lessons?.[lessonId];

    // If course/module/lesson not found => NO POPUP behavior (as required)
    if (!lesson?.terms) return;

    // build map
    Object.entries(lesson.terms).forEach(([term, meaning]) => {
      termMap.set(normalize(term), { displayTerm: term, meaning: String(meaning || "") });
    });

    ready = true;
  }

  function lookupMeaning(selectedText) {
    return termMap.get(normalize(selectedText)) || null;
  }

  function renderPopup(found) {
    popupWord.textContent = found.displayTerm;
    popupMeta.textContent = `${courseName} • ${moduleName} • ${lessonId}`;
    popupBody.textContent = found.meaning;
  }

  async function onSelection() {
    if (!ready) return;

    const selected = (window.getSelection()?.toString() || "").trim();
    if (!isSelectableTerm(selected)) return;

    const found = lookupMeaning(selected);

    // RULE: if meaning not defined => do not show popup at all
    if (!found) return;

    const rect = getSelectionRect();
    if (!rect) return;

    renderPopup(found);
    positionPopupNearRect(rect);
  }

  // Events only inside reading area
  readingArea.addEventListener("mouseup", () => setTimeout(onSelection, 10));
  readingArea.addEventListener("keyup", (e) => {
    if (e.key === "Shift" || e.key.startsWith("Arrow")) setTimeout(onSelection, 10);
  });

  // Close behaviors
  if (closeBtn) closeBtn.addEventListener("click", hidePopup);
  document.addEventListener("mousedown", (e) => {
    if (popup.style.display === "block" && !popup.contains(e.target)) hidePopup();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hidePopup();
  });

  // Init
  loadGlossaryForContext().catch(() => {
    // If JSON fails, keep popup disabled (silent)
    ready = false;
    termMap = new Map();
  });
})();
