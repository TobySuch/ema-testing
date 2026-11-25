/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-icon (template card-listing, e.g. https://www.tobysuch.uk/arcade/).
 *
 * Source: `body > main > ul`
 *   <li><a href="https://www.tobysuch.uk/arcade/chess/">
 *     <span aria-hidden="true">♟️</span>
 *     <h2>Chess</h2>
 *     <p>The classic game ...</p>
 *   </a></li>
 *
 * Output (one row per card):
 *   | <p>♟️</p> (or <img>) | <h2><a href="/arcade/chess/">Chess</a></h2> <p>The classic game ...</p> |
 *
 * Every part (icon, title, description, link) is optional per card.
 */

const SOURCE_HOST = /(^|\.)tobysuch\.uk$/i;

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

// https://www.tobysuch.uk/arcade/chess/ -> /arcade/chess/ (trailing slash stripped later by a transformer).
function toSitePath(href) {
  if (!href) return '';
  const raw = href.trim();
  if (!raw || raw.startsWith('#') || /^(mailto|tel|javascript):/i.test(raw)) return raw;
  try {
    const url = new URL(raw, 'https://www.tobysuch.uk');
    if (!SOURCE_HOST.test(url.hostname)) return raw;
    return `${url.pathname}${url.search}${url.hash}` || '/';
  } catch (e) {
    return raw;
  }
}

function getItems(element) {
  let items = [...element.children].filter((el) => el.tagName === 'LI');
  if (!items.length) {
    items = [...element.querySelectorAll('li')].filter((li) => !li.parentElement.closest('li'));
  }
  return items;
}

function buildIconCell(item, document) {
  const srcImg = item.querySelector('img');
  if (srcImg && (srcImg.getAttribute('src') || srcImg.getAttribute('data-src'))) {
    const img = document.createElement('img');
    img.src = srcImg.getAttribute('src') || srcImg.getAttribute('data-src');
    img.alt = srcImg.getAttribute('alt') || '';
    return img;
  }
  const iconEl = item.querySelector('span[aria-hidden="true"], .icon, [class*="text-3xl"]');
  const iconText = clean(iconEl ? iconEl.textContent : '');
  if (iconText) {
    const p = document.createElement('p');
    p.textContent = iconText;
    return p;
  }
  return '';
}

function buildRow(item, document) {
  const linkEl = item.querySelector('a[href]');
  const href = linkEl ? toSitePath(linkEl.getAttribute('href')) : '';

  const titleEl = item.querySelector('h1, h2, h3, h4, h5, h6');
  const titleText = clean(titleEl ? titleEl.textContent : '');

  const body = [];
  if (titleText) {
    const heading = document.createElement(titleEl.tagName.toLowerCase());
    if (href) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = titleText;
      heading.append(a);
    } else {
      heading.textContent = titleText;
    }
    body.push(heading);
  }

  const descEl = [...item.querySelectorAll('p')].find((p) => clean(p.textContent));
  if (descEl) {
    const p = document.createElement('p');
    p.textContent = clean(descEl.textContent);
    body.push(p);
  }

  // No title but a link: keep the link so the card stays clickable.
  if (!titleText && href) {
    const label = clean(linkEl.textContent);
    if (label) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      p.append(a);
      body.unshift(p);
    }
  }

  const icon = buildIconCell(item, document);
  if (!icon && !body.length) return null;
  return [icon, body.length ? body : ''];
}

export default function parse(element, { document, params }) {
  const cells = [];
  getItems(element).forEach((item) => {
    const row = buildRow(item, document);
    if (row) cells.push(row);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-icon', cells });
  element.replaceWith(block);
}
