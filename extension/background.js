// Service worker / background script.
// Receives messages from content.js and calls Google Translate's
// unofficial gtx endpoint. This endpoint is free and key-less but
// can rate-limit aggressively – we cache results in memory.

const api = (typeof browser !== 'undefined' ? browser : chrome);

const CACHE = new Map();
const CACHE_MAX = 500;

function cacheGet(key) {
  if (!CACHE.has(key)) return null;
  const value = CACHE.get(key);
  CACHE.delete(key);
  CACHE.set(key, value); // LRU bump
  return value;
}

function cacheSet(key, value) {
  CACHE.set(key, value);
  if (CACHE.size > CACHE_MAX) {
    const firstKey = CACHE.keys().next().value;
    CACHE.delete(firstKey);
  }
}

async function translate(text, source, target) {
  const cacheKey = `${source}|${target}|${text}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx`
    + `&sl=${encodeURIComponent(source || 'en')}`
    + `&tl=${encodeURIComponent(target || 'de')}`
    + `&dt=t&q=${encodeURIComponent(text)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  // data[0] is an array of [translated, original, ...] segments
  const segments = Array.isArray(data?.[0]) ? data[0] : [];
  const translation = segments
    .map((s) => (Array.isArray(s) ? s[0] : ''))
    .filter(Boolean)
    .join('');

  if (!translation) throw new Error('Leere Antwort von Google Translate');
  cacheSet(cacheKey, translation);
  return translation;
}

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.action !== 'translate') return false;

  translate(msg.text, msg.source, msg.target)
    .then((translation) => sendResponse({ ok: true, translation }))
    .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));

  return true; // keep the message channel open for async sendResponse
});
