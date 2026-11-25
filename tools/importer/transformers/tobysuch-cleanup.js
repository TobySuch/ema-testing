/* eslint-disable */
/* global WebImporter */

/**
 * Cleanup transformer for www.tobysuch.uk (all templates).
 *
 * beforeTransform: ONLY the catalog removals, because catalog selectors were captured with the
 *   site chrome still in place.
 *   1. Replay `template.pageCleanup[pageUrl]` in order: remove the element a selector matches,
 *      skip a selector that matches none or several.
 *   2. On a page not listed in `pageCleanup`, remove what still matches the catalog's
 *      `cleanup.rules[]` (migration-work/catalog-template.json) outside `main`.
 *
 * afterTransform: site chrome and non-authorable leftovers.
 *   - regular pages: <header> with nav (Home, Blog, Projects, About + LinkedIn/GitHub icons),
 *     <footer> ('(c) 2026 Toby Such. All rights reserved.' + icons)
 *   - game pages: fixed <footer> ('<- Arcade . (c) Copyright Toby Such ...')
 *   - iframes, script/style/noscript/link, Astro wrappers (unwrapped, not deleted) and attributes.
 */

// catalog-template.json `cleanup.rules[]` ({ rule, type, pages }). Empty for game-page; add the
// rules of later templates here (or pass them as `template.cleanupRules`).
const CATALOG_CLEANUP_RULES = [];

// Same key as the import script's findBlocksOnPage: origin + pathname without trailing slash.
function pageKey(u) {
  try {
    const { origin, pathname } = new URL(u);
    return `${origin}${pathname.replace(/\/$/, '')}`;
  } catch (e) {
    return u;
  }
}

function getPageUrl(payload, document) {
  const { params = {}, url } = payload || {};
  if (params.originalURL) return params.originalURL;
  if (url && !/^about:|^file:/.test(url)) return url;
  const canonical = document && document.querySelector('link[rel="canonical"]');
  if (canonical && canonical.getAttribute('href')) return canonical.getAttribute('href');
  try {
    return document.location.href;
  } catch (e) {
    return '';
  }
}

function safeQueryAll(root, selector) {
  try {
    return [...root.querySelectorAll(selector)];
  } catch (e) {
    return [];
  }
}

function findPageEntry(map, key) {
  if (!map || typeof map !== 'object') return null;
  return Object.entries(map).find(([u]) => pageKey(u) === key) || null;
}

function replayCatalogCleanup(document, template, pageUrl) {
  const key = pageKey(pageUrl);
  const entry = findPageEntry(template.pageCleanup, key);

  if (entry) {
    // Each selector was computed right before its removal: only an in-order replay is exact.
    (entry[1] || []).forEach((item) => {
      const selector = typeof item === 'string' ? item : item && item.selector;
      if (!selector) return;
      const matches = safeQueryAll(document, selector);
      if (matches.length === 1) matches[0].remove();
    });
    return;
  }

  // Page not listed: fall back to the catalog's generic rules, outside main only.
  const rules = Array.isArray(template.cleanupRules) ? template.cleanupRules : CATALOG_CLEANUP_RULES;
  const mains = safeQueryAll(document, 'main');
  rules.forEach((r) => {
    const selector = typeof r === 'string' ? r : r && (r.rule || r.selector);
    if (!selector) return;
    safeQueryAll(document, selector).forEach((el) => {
      if (!el.isConnected) return;
      if (mains.some((m) => m === el || m.contains(el) || el.contains(m))) return;
      el.remove();
    });
  });
}

function unwrap(el) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  el.remove();
}

function isSiteFooter(footer) {
  // Site footers sit outside any article/content block; content <footer>s inside articles stay.
  if (footer.closest('article, blockquote, table')) return false;
  return true;
}

function isSiteHeader(header) {
  if (header.closest('article, table')) return false;
  return true;
}

function removeChrome(root) {
  // Site header with nav, standalone nav, ARIA landmarks for chrome.
  safeQueryAll(root, 'header').filter(isSiteHeader).forEach((el) => el.remove());
  safeQueryAll(root, 'nav, [role="navigation"], [role="banner"]').forEach((el) => {
    if (!el.closest('table')) el.remove();
  });

  // Site footer (regular pages and the fixed game-page footer).
  safeQueryAll(root, 'footer, [role="contentinfo"]').filter(isSiteFooter).forEach((el) => el.remove());

  // Non-authorable elements.
  safeQueryAll(root, 'iframe, script, style, noscript, link, template, object, embed').forEach((el) => el.remove());

  // Astro leftovers: wrappers carry content the parsers already used, so unwrap rather than delete.
  safeQueryAll(root, 'astro-island, astro-slot, astro-static-slot').reverse().forEach(unwrap);

  // Astro scoping and tracking attributes.
  safeQueryAll(root, '*').forEach((el) => {
    [...el.attributes].forEach(({ name }) => {
      if (
        /^data-astro-/.test(name)
        || name === 'data-cf-beacon'
        || name === 'data-domain'
        || /^on[a-z]+$/.test(name)
      ) {
        el.removeAttribute(name);
      }
    });
  });

}

export default function transform(hookName, element, payload) {
  const document = (payload && payload.document) || element.ownerDocument;
  const template = (payload && payload.template) || {};

  if (hookName === 'beforeTransform') {
    replayCatalogCleanup(document, template, getPageUrl(payload, document));
  }

  if (hookName === 'afterTransform') {
    removeChrome(element);
  }
}
