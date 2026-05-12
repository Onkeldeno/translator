// ==UserScript==
// @name         EN→DE Translator
// @namespace    https://github.com/Onkeldeno/translator
// @version      1.0.0
// @description  Doppeltippen auf englische Wörter (oder Auswahl per Wischen) zeigt die deutsche Übersetzung als Popup.
// @author       Onkeldeno
// @match        *://*/*
// @run-at       document-idle
// @grant        GM.xmlHttpRequest
// @connect      translate.googleapis.com
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const POPUP_ID = '__en_de_translator_popup__';
  const STYLE_ID = '__en_de_translator_style__';
  const MAX_LEN = 500;
  const DEBOUNCE_MS = 450;
  const CACHE_MAX = 500;

  // ---------- styles ----------
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${POPUP_ID} {
        position: absolute;
        z-index: 2147483647;
        min-width: 220px;
        max-width: 320px;
        background: #fff;
        color: #1a1a1a;
        border: 1px solid rgba(0,0,0,.12);
        border-radius: 12px;
        box-shadow: 0 8px 28px rgba(0,0,0,.22);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 15px;
        line-height: 1.45;
        overflow: hidden;
        user-select: none;
        -webkit-user-select: none;
        animation: __endeTr_in 120ms ease-out;
      }
      @keyframes __endeTr_in {
        from { opacity: 0; transform: translateY(-4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      #${POPUP_ID} .__endeTr_header {
        display: flex; align-items: center; justify-content: space-between;
        gap: 8px; padding: 10px 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
      }
      #${POPUP_ID} .__endeTr_title {
        font-weight: 600; font-size: 14px;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
      }
      #${POPUP_ID} .__endeTr_close {
        background: rgba(255,255,255,.18); color: #fff; border: none;
        width: 26px; height: 26px; border-radius: 50%;
        font-size: 18px; line-height: 1; cursor: pointer; padding: 0;
        display: flex; align-items: center; justify-content: center;
      }
      #${POPUP_ID} .__endeTr_close:hover,
      #${POPUP_ID} .__endeTr_close:active { background: rgba(255,255,255,.32); }
      #${POPUP_ID} .__endeTr_body {
        padding: 12px 14px; background: #fff; color: #1a1a1a;
        font-size: 15px; white-space: pre-wrap; word-wrap: break-word;
      }
      #${POPUP_ID}[data-state="error"] .__endeTr_body { color: #b00020; }
      #${POPUP_ID} .__endeTr_spinner {
        display: inline-block; width: 12px; height: 12px;
        border: 2px solid rgba(0,0,0,.18); border-top-color: #667eea;
        border-radius: 50%; vertical-align: -2px; margin-right: 6px;
        animation: __endeTr_spin .7s linear infinite;
      }
      @keyframes __endeTr_spin { to { transform: rotate(360deg); } }
      @media (prefers-color-scheme: dark) {
        #${POPUP_ID} { background: #1f1f22; color: #f5f5f7; border-color: rgba(255,255,255,.12); }
        #${POPUP_ID} .__endeTr_body { background: #1f1f22; color: #f5f5f7; }
      }
    `;
    document.documentElement.appendChild(style);
  }

  // ---------- LRU cache ----------
  const cache = new Map();
  function cacheGet(k) {
    if (!cache.has(k)) return null;
    const v = cache.get(k);
    cache.delete(k); cache.set(k, v);
    return v;
  }
  function cacheSet(k, v) {
    cache.set(k, v);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  }

  // ---------- translate via Google's gtx endpoint ----------
  function translate(text, source = 'en', target = 'de') {
    const key = `${source}|${target}|${text}`;
    const hit = cacheGet(key);
    if (hit) return Promise.resolve(hit);

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx`
      + `&sl=${encodeURIComponent(source)}`
      + `&tl=${encodeURIComponent(target)}`
      + `&dt=t&q=${encodeURIComponent(text)}`;

    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: 'GET',
        url,
        headers: { 'Accept': 'application/json' },
        timeout: 10000,
        onload: (res) => {
          if (res.status < 200 || res.status >= 300) {
            return reject(new Error(`HTTP ${res.status}`));
          }
          try {
            const data = JSON.parse(res.responseText);
            const segments = Array.isArray(data?.[0]) ? data[0] : [];
            const translation = segments
              .map((s) => (Array.isArray(s) ? s[0] : ''))
              .filter(Boolean)
              .join('');
            if (!translation) return reject(new Error('Leere Antwort'));
            cacheSet(key, translation);
            resolve(translation);
          } catch (e) {
            reject(e);
          }
        },
        onerror: () => reject(new Error('Netzwerkfehler')),
        ontimeout: () => reject(new Error('Zeitüberschreitung')),
      });
    });
  }

  // ---------- selection / popup ----------
  let lastText = '';
  let timer = null;
  let currentReqId = 0;

  function isInsidePopup(node) {
    while (node) {
      if (node.id === POPUP_ID) return true;
      node = node.parentNode;
    }
    return false;
  }

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

  function isLikelyEnglish(text) {
    if (!/[A-Za-z]/.test(text)) return false;
    const latin = (text.match(/[A-Za-z\s.,!?;:'"\-]/g) || []).length;
    return latin / text.length > 0.6;
  }

  function removePopup() {
    document.getElementById(POPUP_ID)?.remove();
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

    popup.addEventListener('mousedown', (e) => e.stopPropagation());
    popup.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

    document.body.appendChild(popup);
    positionPopup(popup, rect);
    return popup;
  }

  async function translateAndShow(info) {
    const reqId = ++currentReqId;
    showPopup(info.text, info.rect, 'loading');
    try {
      const translation = await translate(info.text);
      if (reqId !== currentReqId) return;
      showPopup(info.text, info.rect, 'ok', translation);
    } catch (err) {
      if (reqId !== currentReqId) return;
      showPopup(info.text, info.rect, 'error', String(err?.message || err));
    }
  }

  function handleSelection() {
    const info = getSelectionInfo();
    if (!info) return;
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
  document.addEventListener('dblclick', () => {
    clearTimeout(timer);
    timer = setTimeout(handleSelection, 50);
  });

  document.addEventListener('mousedown', (e) => {
    const popup = document.getElementById(POPUP_ID);
    if (popup && !popup.contains(e.target)) {
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
