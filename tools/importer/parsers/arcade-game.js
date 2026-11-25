/* eslint-disable */
/* global WebImporter */

/**
 * Parser for arcade-game (template game-page).
 *
 * Source: the game container `body > astro-island > div > div` on www.tobysuch.uk/arcade/<game>/.
 *   - Title: the container's h1, either a direct child (chess, ultimate-tic-tac-toe, ...) or
 *     inside `div.text-center` together with an intro <p> (countdown-numbers).
 *   - Everything else (buttons, tiles, sliders, grids, badges) is interactive game UI and is dropped.
 *
 * Output: [h1, intro p?] as default content, then the block:
 *   | Arcade Game |
 *   | <game key> |                         e.g. "chess" from /arcade/chess/
 *   | <intro paragraph text> |             only when the source has an intro paragraph
 *   | <a href="https://www.tobysuch.uk/arcade/<game>/">Play <Title> on tobysuch.uk</a> |
 *
 * Only one arcade-game block per document: a second run on the same document removes the element
 * (a detached descendant of an already-replaced container is a no-op).
 */

const SOURCE_ORIGIN = 'https://www.tobysuch.uk';
const parsedDocuments = new WeakSet();

function getSourceUrl(document, params) {
  const candidates = [];
  if (params && params.originalURL) candidates.push(params.originalURL);
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical && canonical.getAttribute('href')) candidates.push(canonical.getAttribute('href'));
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl && ogUrl.getAttribute('content')) candidates.push(ogUrl.getAttribute('content'));
  try {
    if (document.location && document.location.href) candidates.push(document.location.href);
  } catch (e) {
    // no location
  }
  for (let i = 0; i < candidates.length; i += 1) {
    try {
      const u = new URL(candidates[i], SOURCE_ORIGIN);
      if (/^https?:$/.test(u.protocol) && /\/arcade\/[^/]+/.test(u.pathname)) return u;
    } catch (e) {
      // try next candidate
    }
  }
  return null;
}

function getGameKey(url) {
  if (!url) return '';
  const segments = url.pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('arcade');
  const key = idx >= 0 && segments[idx + 1] ? segments[idx + 1] : segments[segments.length - 1];
  return (key || '').toLowerCase();
}

function keyToTitle(key) {
  return key
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function hasArcadeGameBlock(document) {
  return [...document.querySelectorAll('table')].some((table) => {
    const head = table.querySelector('tr > th, tr > td');
    return head && /^arcade[\s-]game\b/i.test(head.textContent.trim());
  });
}

// The block element is the game container (body > astro-island > div > div). When the importer
// hands over a descendant instead (per-page instance selectors point at game UI children),
// walk up to the nearest ancestor that holds the h1.
function resolveContainer(element) {
  if (element.querySelector('h1')) return element;
  let node = element.parentElement;
  while (node && node.tagName !== 'BODY') {
    if (node.querySelector('h1')) return node;
    node = node.parentElement;
  }
  return element;
}

export default function parse(element, { document, params }) {
  // One block per page.
  if (parsedDocuments.has(document) || hasArcadeGameBlock(document)) {
    element.remove();
    return;
  }

  const container = resolveContainer(element);
  parsedDocuments.add(document);

  // Title elements to hoist as default content.
  const hoisted = [];
  const titleWrapper = [...container.querySelectorAll('div.text-center')].find((d) => d.querySelector('h1'));
  const h1 = titleWrapper ? titleWrapper.querySelector('h1') : container.querySelector('h1');
  let introText = '';
  // Some games split the title over consecutive sibling h1s (e.g. "Ultimate" + "Tic-Tac-Toe");
  // merge them into one h1 so the page title and the play link carry the full game name.
  if (h1) {
    let next = h1.nextElementSibling;
    while (next && next.tagName === 'H1') {
      const extra = next.textContent.replace(/\s+/g, ' ').trim();
      if (extra) h1.textContent = `${h1.textContent.replace(/\s+/g, ' ').trim()} ${extra}`;
      const drop = next;
      next = next.nextElementSibling;
      drop.remove();
    }
    hoisted.push(h1);
  }
  if (titleWrapper) {
    const intro = [...titleWrapper.querySelectorAll('p')].find((p) => p.textContent.trim());
    if (intro) {
      introText = intro.textContent.replace(/\s+/g, ' ').trim();
      hoisted.push(intro);
    }
  }

  const sourceUrl = getSourceUrl(document, params);
  const key = getGameKey(sourceUrl);
  const title = (h1 && h1.textContent.replace(/\s+/g, ' ').trim()) || keyToTitle(key) || 'Game';

  const cells = [];
  cells.push([key]);
  // The intro paragraph is hoisted as page text above the block, so it is not repeated in the block.

  const link = document.createElement('a');
  link.href = `${SOURCE_ORIGIN}/arcade/${key ? `${key}/` : ''}`;
  link.textContent = `Play ${title} on tobysuch.uk`;
  cells.push([link]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'arcade-game', cells });

  if (container === element) {
    element.replaceWith(...hoisted, block);
    return;
  }

  // Descendant target: put [title..., block] where the container's direct child holding the
  // element was, then drop every other piece of game UI. The emptied container stays as a bare
  // wrapper (divs are transparent to html2md; the cleanup transformer strips its attributes).
  let anchor = element;
  while (anchor.parentElement && anchor.parentElement !== container) anchor = anchor.parentElement;
  anchor.replaceWith(...hoisted, block);
  const keep = new Set([...hoisted, block]);
  [...container.childNodes].forEach((n) => { if (!keep.has(n)) n.remove(); });
}
