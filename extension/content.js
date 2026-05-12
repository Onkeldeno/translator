(() => {
  const api = (typeof browser !== 'undefined' ? browser : chrome);

  const POPUP_ID = '__en_de_translator_popup__';
  const MAX_LEN = 500;
  const DEBOUNCE_MS = 450;

  let lastText = '';
  let timer = null;
  let currentReqId = 0;

  function getSelectionInfo() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const text = sel.toString().trim();
    if (!text) return null;
    const range = sel.getRangeAt(0);
    if (isInsidePopup(range.startContainer)) return null;
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) return null;
    return { text, rect };
  }

  function isInsidePopup(node) {
    while (node) {
      if (node.id === POPUP_ID) return true;
      node = node.parentNode;
    }
    return false;
  }

  function isLikelyEnglish(text) {
    // Quick guard: at least one ASCII letter and mostly latin characters.
    if (!/[A-Za-z]/.test(text)) return false;
    const latin = (text.match(/[A-Za-z\s.,!?;:'"\-]/g) || []).length;
    return latin / text.length > 0.6;
  }

  function removePopup() {
    document.getElementById(POPUP_ID)?.remove();
  }

  function showPopup(original, rect, state, translation) {
    removePopup();
    const popup = document.createElement('div');
    popup.id = POPUP_ID;
    popup.setAttribute('data-state', state);

    const header = document.createElement('div');
    header.className = '__endeTr_header';
    const title = document.createElement('span');
    title.className = '__endeTr_title';
    title.textContent = original.length > 60 ? original.slice(0, 57) + '…' : original;
    const close = document.createElement('button');
    close.className = '__endeTr_close';
    close.setAttribute('aria-label', 'Schließen');
    close.textContent = '×';
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      removePopup();
    });
    header.appendChild(title);
    header.appendChild(close);

    const body = document.createElement('div');
    body.className = '__endeTr_body';
    if (state === 'loading') {
      body.innerHTML = '<span class="__endeTr_spinner"></span> Übersetze…';
    } else if (state === 'error') {
      body.textContent = translation || 'Fehler bei der Übersetzung.';
    } else {
      body.textContent = translation;
    }

    popup.appendChild(header);
    popup.appendChild(body);

    // Block touch events on the popup itself from clearing selection too aggressively.
    popup.addEventListener('mousedown', (e) => e.stopPropagation());
    popup.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

    document.body.appendChild(popup);
    positionPopup(popup, rect);
    return popup;
  }

  function positionPopup(popup, rect) {
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pw = Math.min(popup.offsetWidth || 280, vw - 2 * margin);
    const ph = popup.offsetHeight || 80;

    let left = rect.left + (rect.width / 2) - (pw / 2);
    left = Math.max(margin, Math.min(left, vw - pw - margin));

    let top = rect.bottom + 8;
    if (top + ph > vh - margin) {
      top = rect.top - ph - 8;
      if (top < margin) top = vh - ph - margin;
    }

    popup.style.left = (left + window.scrollX) + 'px';
    popup.style.top = (top + window.scrollY) + 'px';
    popup.style.maxWidth = (vw - 2 * margin) + 'px';
  }

  async function translateAndShow(info) {
    const reqId = ++currentReqId;
    const popup = showPopup(info.text, info.rect, 'loading');
    try {
      const resp = await api.runtime.sendMessage({
        action: 'translate',
        text: info.text,
        source: 'en',
        target: 'de',
      });
      if (reqId !== currentReqId) return; // stale
      if (!resp || !resp.ok) {
        showPopup(info.text, info.rect, 'error', resp?.error || 'Übersetzung fehlgeschlagen.');
        return;
      }
      showPopup(info.text, info.rect, 'ok', resp.translation);
    } catch (err) {
      if (reqId !== currentReqId) return;
      showPopup(info.text, info.rect, 'error', String(err?.message || err));
    }
  }

  function handleSelection() {
    const info = getSelectionInfo();
    if (!info) {
      // selection cleared — don't auto-remove popup so the user can still read it.
      return;
    }
    if (info.text.length > MAX_LEN) return;
    if (!isLikelyEnglish(info.text)) return;
    if (info.text === lastText && document.getElementById(POPUP_ID)) return;
    lastText = info.text;
    translateAndShow(info);
  }

  function scheduleSelection() {
    clearTimeout(timer);
    timer = setTimeout(handleSelection, DEBOUNCE_MS);
  }

  document.addEventListener('selectionchange', scheduleSelection);

  // Faster path: explicit double-click usually selects a single word.
  document.addEventListener('dblclick', () => {
    clearTimeout(timer);
    timer = setTimeout(handleSelection, 50);
  });

  // Dismiss when tapping outside selection / popup.
  document.addEventListener('mousedown', (e) => {
    const popup = document.getElementById(POPUP_ID);
    if (popup && !popup.contains(e.target)) {
      // give selectionchange a chance — if a fresh selection is starting, keep the popup
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          removePopup();
          lastText = '';
        }
      }, 250);
    }
  });
})();
