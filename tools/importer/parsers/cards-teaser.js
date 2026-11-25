/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-teaser (templates homepage, post-listing).
 *
 * Source: <ul> of teaser cards on www.tobysuch.uk, e.g. `body > main > div > section > ul`:
 *   <li><a href="https://www.tobysuch.uk/projects/tokenbury">
 *     <img src="..." alt="">
 *     <h4 class="blog-title">Tokenbury</h4>
 *     <p class="blog-date"><time datetime="...">May 13, 2026</time></p>
 *     <div class="project-tags"><span class="project-tag">LLM</span>...</div>
 *   </a></li>
 *   ...
 *   <li><a href="https://www.tobysuch.uk/projects">
 *     <div class="projects-see-all-hero"><svg class="arrow">...</svg></div>
 *     <h4 class="blog-title">See All</h4>
 *   </a></li>
 *
 * Output (one row per card):
 *   | Cards Teaser (see-all-card) |                     plain "Cards Teaser" when no See All card
 *   | <img> | <h4><a href="/projects/tokenbury">Tokenbury</a></h4> <p>May 13, 2026</p> <ul><li>LLM</li>...</ul> |
 *   |       | <h4><a href="/projects">See All</a></h4> |  See All card, always the last row
 *
 * Every part (image, title, date, tags, link) is optional per card.
 */

const SOURCE_HOST = /(^|\.)tobysuch\.uk$/i;

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

// https://www.tobysuch.uk/projects/tokenbury -> /projects/tokenbury (path kept as on source).
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

// Card items: direct <li> children of the list; fall back to any li holding a link or title.
function getItems(element) {
  let items = [...element.children].filter((el) => el.tagName === 'LI');
  if (!items.length) {
    items = [...element.querySelectorAll('li')].filter((li) => !li.parentElement.closest('li'));
  }
  return items;
}

function isSeeAll(item, titleText) {
  if (/^see\s*all\b/i.test(titleText)) return true;
  return !!item.querySelector('[class*="see-all"]') && !item.querySelector('img');
}

function buildRow(item, document) {
  const titleEl = item.querySelector('.blog-title, h1, h2, h3, h4, h5, h6');
  const titleText = clean(titleEl ? titleEl.textContent : '');

  const linkEl = item.querySelector('a[href]');
  const href = linkEl ? toSitePath(linkEl.getAttribute('href')) : '';

  const seeAll = isSeeAll(item, titleText);

  // Title: heading (source level, h4 by default) with a link wrapping the title text.
  let heading = null;
  const label = titleText || (seeAll ? 'See All' : clean(linkEl ? linkEl.textContent : ''));
  if (label) {
    const level = titleEl && /^H[1-6]$/.test(titleEl.tagName) ? titleEl.tagName.toLowerCase() : 'h4';
    heading = document.createElement(level);
    if (href) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      heading.append(a);
    } else {
      heading.textContent = label;
    }
  }

  if (seeAll) {
    return { seeAll: true, row: ['', heading ? [heading] : ''] };
  }

  // Image cell: keep src as emitted and the alt text.
  let imageCell = '';
  const srcImg = item.querySelector('img');
  if (srcImg && (srcImg.getAttribute('src') || srcImg.getAttribute('data-src'))) {
    const img = document.createElement('img');
    img.src = srcImg.getAttribute('src') || srcImg.getAttribute('data-src');
    img.alt = srcImg.getAttribute('alt') || '';
    imageCell = img;
  }

  const body = [];
  if (heading) body.push(heading);

  // Date as plain text paragraph.
  const dateEl = item.querySelector('.blog-date, time');
  const dateText = clean(dateEl ? dateEl.textContent : '');
  if (dateText) {
    const p = document.createElement('p');
    p.textContent = dateText;
    body.push(p);
  }

  // Tags as <ul><li>.
  const tagNames = [...item.querySelectorAll('.project-tag, .tag')]
    .filter((el) => !el.querySelector('.project-tag, .tag'))
    .map((el) => clean(el.textContent))
    .filter(Boolean);
  const unique = [...new Set(tagNames)];
  if (unique.length) {
    const ul = document.createElement('ul');
    unique.forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name;
      ul.append(li);
    });
    body.push(ul);
  }

  if (!imageCell && !body.length) return null;
  return { seeAll: false, row: [imageCell, body.length ? body : ''] };
}

export default function parse(element, { document, params }) {
  const cards = [];
  let seeAllRow = null;

  getItems(element).forEach((item) => {
    const result = buildRow(item, document);
    if (!result) return;
    if (result.seeAll) seeAllRow = result.row;
    else cards.push(result.row);
  });

  const cells = [...cards];
  if (seeAllRow) cells.push(seeAllRow);

  const name = seeAllRow ? 'cards-teaser (see-all-card)' : 'cards-teaser';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
}
