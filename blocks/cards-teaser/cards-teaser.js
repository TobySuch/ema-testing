import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Cards (Teaser)
 *
 * Authored cards: one row per card — an image cell and a body cell holding the
 * title (linked to the detail page), a date and optional tags (a list, or an extra
 * cell of comma-separated tags). Each card renders as one link (image, title, date, tags).
 *
 * Listing: if the block holds a single link to a path (e.g. /blog/) or a
 * "source | /blog/" row, pages under that path are read from /query-index.json
 * (newest first) and rendered as cards after any authored cards. An optional
 * "limit | 6" row caps the number of listed pages. If the index is missing,
 * authored cards still render.
 *
 * Options:
 *  - (default) listing layout: first card featured (centred, image at most 720px wide),
 *    the rest in a 2-column grid above 720px.
 *  - see-all-card: 2-column teaser grid in the 720px content column;
 *    the last authored row is a "See All" card with a gradient arrow hero, coloured by
 *    the listing it links to (cards-teaser-see-all-{first path segment}).
 */

const CONFIG_KEYS = ['source', 'limit'];
const SVG_NS = 'http://www.w3.org/2000/svg';
const DATE_PATTERN = /^(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|(?:\d{1,2}\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+\d{4})$/i;

function isDateText(text) {
  return DATE_PATTERN.test((text || '').trim());
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Optimizes a picture only for same-origin, non-SVG images.
 * @param {HTMLImageElement} img
 * @param {boolean} eager
 */
function optimizeImage(img, eager = false) {
  const url = new URL(img.src, window.location.href);
  if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
  const picture = img.closest('picture');
  if (!picture) return;
  picture.replaceWith(createOptimizedPicture(img.src, img.alt, eager, [{ media: '(min-width: 900px)', width: '1200' }, { width: '750' }]));
}

function normalizePath(path) {
  if (!path) return '';
  let p = path.split(/[?#]/)[0];
  if (!p.endsWith('/')) p = `${p}/`;
  return p;
}

/**
 * Converts an href into a same-site pathname, or null for other sites.
 * @param {string} href
 * @returns {string|null}
 */
function toLocalPath(href) {
  if (!href) return null;
  try {
    const url = new URL(href, window.location.href);
    const local = url.origin === window.location.origin
      || /(^|\.)aem\.(page|live)$/.test(url.hostname)
      || /(^|\.)tobysuch\.uk$/.test(url.hostname);
    return local ? url.pathname : null;
  } catch {
    return null;
  }
}

function stripButtons(root) {
  root.querySelectorAll('.button-wrapper, .button').forEach((el) => {
    el.classList.remove('button-wrapper', 'button', 'primary', 'secondary', 'accent');
    if (!el.className) el.removeAttribute('class');
  });
}

/**
 * Splits tag text into tag names.
 * @param {string} text
 * @returns {string[]}
 */
function splitTags(text) {
  return (text || '').split(/[,|\n]/).map((t) => t.trim()).filter(Boolean);
}

function buildTags(names) {
  const unique = [...new Set(names)];
  if (!unique.length) return null;
  const ul = document.createElement('ul');
  ul.className = 'cards-teaser-card-tags';
  unique.forEach((name) => {
    const li = document.createElement('li');
    li.textContent = name;
    ul.append(li);
  });
  return ul;
}

/**
 * Replaces links inside an element with their content (no nested anchors).
 * @param {Element} el
 */
function unwrapLinks(el) {
  el.querySelectorAll('a').forEach((a) => a.replaceWith(...a.childNodes));
}

/**
 * Builds the card shell shared by authored and listed cards.
 * With wholeLink, the whole card (image and body) is a single link.
 */
function buildCard({
  href, picture, titleText, titleNodes, dateText, tags, extras = [], wholeLink = false,
}) {
  const li = document.createElement('li');
  li.className = 'cards-teaser-card';

  const linkAll = !!(wholeLink && href);
  let container = li;
  if (linkAll) {
    container = document.createElement('a');
    container.className = 'cards-teaser-card-link';
    container.href = href;
    li.append(container);
  }

  const partLinks = href && !linkAll;
  const media = document.createElement(partLinks ? 'a' : 'div');
  media.className = 'cards-teaser-card-image';
  if (partLinks) {
    media.href = href;
    media.tabIndex = -1;
    media.setAttribute('aria-hidden', 'true');
  }
  if (picture) media.append(picture);
  else li.classList.add('cards-teaser-card-no-image');
  container.append(media);

  const body = document.createElement('div');
  body.className = 'cards-teaser-card-body';

  if (titleText || (titleNodes && titleNodes.length)) {
    const h = document.createElement('h3');
    h.className = 'cards-teaser-card-title';
    const target = partLinks ? document.createElement('a') : h;
    if (partLinks) {
      target.href = href;
      h.append(target);
    }
    if (titleNodes && titleNodes.length) target.append(...titleNodes);
    else target.textContent = titleText;
    body.append(h);
  }

  if (dateText) {
    const p = document.createElement('p');
    p.className = 'cards-teaser-card-date';
    p.textContent = dateText;
    body.append(p);
  }

  extras.forEach((el) => {
    if (linkAll) unwrapLinks(el);
    el.classList.add('cards-teaser-card-description');
    body.append(el);
  });

  const tagList = buildTags(tags || []);
  if (tagList) body.append(tagList);

  container.append(body);
  return li;
}

function isImageCell(cell) {
  return !!cell.querySelector('picture, img') && !cell.textContent.trim();
}

/**
 * Turns an authored row into a card.
 * @param {Element} row
 * @param {boolean} wholeLink
 */
function buildAuthoredCard(row, wholeLink = false) {
  stripButtons(row);
  const cells = [...row.children];
  const imageCell = cells.find(isImageCell);
  const picture = imageCell
    ? (imageCell.querySelector('picture') || imageCell.querySelector('img'))
    : row.querySelector('picture');
  const textCells = cells.filter((c) => c !== imageCell && c.textContent.trim());

  const firstLink = row.querySelector('a[href]');
  const href = firstLink ? firstLink.getAttribute('href') : null;

  const [mainCell, ...extraCells] = textCells;
  let titleNodes = [];
  let titleText = '';
  let dateText = '';
  const tags = [];
  const extras = [];

  if (mainCell) {
    let elements = [...mainCell.children];
    if (!elements.length) {
      const p = document.createElement('p');
      p.append(...mainCell.childNodes);
      elements = [p];
    }
    const titleEl = elements.find((el) => /^H[1-6]$/.test(el.tagName))
      || elements.find((el) => el.querySelector('a[href]') && !isDateText(el.textContent))
      || elements.find((el) => el.textContent.trim() && !isDateText(el.textContent)
        && !/^(UL|OL)$/.test(el.tagName));
    if (titleEl) {
      const link = titleEl.querySelector('a[href]');
      titleNodes = [...(link || titleEl).childNodes];
      titleText = titleEl.textContent.trim();
    }
    elements.forEach((el) => {
      if (el === titleEl || el.querySelector('picture, img')) return;
      const text = el.textContent.trim();
      if (!text) return;
      if (/^(UL|OL)$/.test(el.tagName)) {
        el.querySelectorAll('li').forEach((li) => tags.push(li.textContent.trim()));
      } else if (!dateText && isDateText(text)) {
        dateText = text;
      } else {
        extras.push(el);
      }
    });
  }

  // extra cells: a date cell, or tags (list items or comma-separated text)
  extraCells.forEach((cell) => {
    const text = cell.textContent.trim();
    if (!dateText && isDateText(text)) {
      dateText = text;
      return;
    }
    const items = cell.querySelectorAll('li');
    if (items.length) items.forEach((li) => tags.push(li.textContent.trim()));
    else {
      const parts = cell.querySelectorAll('p');
      if (parts.length) parts.forEach((p) => tags.push(...splitTags(p.textContent)));
      else tags.push(...splitTags(text));
    }
  });

  if (!titleText && !picture) return null;
  return buildCard({
    href, picture, titleText, titleNodes, dateText, tags, extras, wholeLink,
  });
}

/**
 * Turns the last authored row into the "See All" card.
 * @param {Element} row
 */
function buildSeeAllCard(row) {
  stripButtons(row);
  const link = row.querySelector('a[href]');
  const href = link ? link.getAttribute('href') : null;
  const picture = row.querySelector('picture');
  const label = (row.textContent.trim() || 'See All').replace(/\s+/g, ' ');
  const li = buildCard({
    href,
    picture: null,
    titleText: label,
    wholeLink: true,
  });
  li.classList.remove('cards-teaser-card-no-image');
  li.classList.add('cards-teaser-see-all');
  const segment = (toLocalPath(href) || '').split('/').filter(Boolean)[0];
  if (segment) li.classList.add(`cards-teaser-see-all-${segment.toLowerCase().replace(/[^a-z0-9-]/g, '')}`);
  const media = li.querySelector('.cards-teaser-card-image');
  media.classList.add('cards-teaser-see-all-hero');
  if (picture) media.append(picture);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'cards-teaser-see-all-arrow');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '80');
  svg.setAttribute('height', '80');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M5 12h17M16 6l6 6-6 6');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  media.append(svg);
  return li;
}

/**
 * Reads config rows and the single-link listing shorthand.
 * @param {Element[]} rows
 * @returns {{config: Object, cardRows: Element[]}}
 */
function readConfig(rows) {
  const config = {};
  const cardRows = [];
  rows.forEach((row) => {
    const cells = [...row.children];
    const key = cells.length >= 2 ? cells[0].textContent.trim().toLowerCase() : '';
    if (CONFIG_KEYS.includes(key)) {
      const valueCell = cells[1];
      const a = valueCell.querySelector('a[href]');
      config[key] = a ? a.getAttribute('href') : valueCell.textContent.trim();
    } else if (row.textContent.trim() || row.querySelector('picture, img')) {
      cardRows.push(row);
    }
  });

  // shorthand: the whole block is a single link to a listing path
  if (!config.source && cardRows.length === 1) {
    const row = cardRows[0];
    const links = row.querySelectorAll('a[href]');
    if (links.length === 1 && !row.querySelector('picture, img')
      && row.textContent.trim() === links[0].textContent.trim()) {
      const path = toLocalPath(links[0].getAttribute('href'));
      if (path) {
        config.source = path;
        [config.fallbackLink] = links;
        cardRows.length = 0;
      }
    }
  }

  if (config.source) config.source = toLocalPath(config.source) || config.source;
  return { config, cardRows };
}

function parseIndexDate(entry) {
  const candidates = [entry.date, entry.publishDate, entry.published];
  for (let i = 0; i < candidates.length; i += 1) {
    const value = candidates[i];
    if (value) {
      const num = Number(value);
      let d;
      if (!Number.isNaN(num)) d = new Date(num < 1e11 ? num * 1000 : num);
      else d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  const lm = Number(entry.lastModified);
  if (!Number.isNaN(lm) && lm > 0) return new Date(lm < 1e11 ? lm * 1000 : lm);
  const parsed = new Date(entry.lastModified);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseIndexTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch { /* not JSON */ }
  return splitTags(String(value));
}

/**
 * Fetches pages under a path from the query index, newest first.
 * @param {string} source
 * @returns {Promise<Object[]>}
 */
async function fetchListing(source) {
  try {
    const resp = await fetch('/query-index.json');
    if (!resp.ok) return [];
    const json = await resp.json();
    const data = Array.isArray(json) ? json : (json.data || []);
    const prefix = normalizePath(source);
    return data
      .filter((entry) => {
        if (!entry || !entry.path) return false;
        const path = normalizePath(entry.path);
        return path.startsWith(prefix) && path !== prefix;
      })
      .map((entry) => ({ ...entry, sortDate: parseIndexDate(entry) }))
      .sort((a, b) => (b.sortDate?.getTime() || 0) - (a.sortDate?.getTime() || 0));
  } catch {
    return [];
  }
}

function buildListedCard(entry, wholeLink = false) {
  let picture = null;
  if (entry.image && !/default-meta-image/.test(entry.image)) {
    const img = document.createElement('img');
    img.src = entry.image;
    img.alt = entry.title || '';
    img.loading = 'lazy';
    picture = document.createElement('picture');
    picture.append(img);
  }
  const title = (entry.title || '').replace(/\s*[|–-]\s*Toby Such\s*$/i, '').trim()
    || entry.path.split('/').filter(Boolean).pop();
  return buildCard({
    href: entry.path,
    picture,
    titleText: title,
    dateText: entry.sortDate ? formatDate(entry.sortDate) : '',
    tags: parseIndexTags(entry.tags),
    wholeLink,
  });
}

export default async function decorate(block) {
  const seeAll = block.classList.contains('see-all-card');
  const { config, cardRows } = readConfig([...block.children]);

  const ul = document.createElement('ul');
  ul.className = 'cards-teaser-list';

  let seeAllCard = null;
  const rows = [...cardRows];
  const lastRow = rows[rows.length - 1];
  if (seeAll && lastRow && (rows.length > 1 || config.source
    || /see\s*all/i.test(lastRow.textContent))) {
    seeAllCard = buildSeeAllCard(rows.pop());
  }

  const knownPaths = new Set();
  rows.forEach((row) => {
    const card = buildAuthoredCard(row, true);
    if (!card) return;
    const link = card.querySelector('a[href]');
    if (link) {
      const path = toLocalPath(link.getAttribute('href'));
      if (path) knownPaths.add(normalizePath(path));
    }
    ul.append(card);
  });

  if (config.source) {
    const limit = parseInt(config.limit, 10);
    let entries = (await fetchListing(config.source))
      .filter((entry) => !knownPaths.has(normalizePath(entry.path)));
    if (limit > 0) entries = entries.slice(0, Math.max(0, limit - ul.children.length));
    entries.forEach((entry) => ul.append(buildListedCard(entry, true)));

    // nothing to show: keep the authored link so the content stays reachable
    if (!ul.children.length && config.fallbackLink) {
      const li = document.createElement('li');
      li.className = 'cards-teaser-fallback';
      const a = document.createElement('a');
      a.href = config.fallbackLink.getAttribute('href');
      a.textContent = config.fallbackLink.textContent.trim();
      li.append(a);
      ul.append(li);
    }
  }

  if (seeAllCard) ul.append(seeAllCard);

  const first = ul.querySelector('.cards-teaser-card');
  if (!seeAll && first) first.classList.add('cards-teaser-card-featured');

  ul.querySelectorAll('picture > img').forEach((img) => {
    optimizeImage(img, !seeAll && img.closest('.cards-teaser-card-featured') !== null);
  });

  block.replaceChildren(ul);
}
