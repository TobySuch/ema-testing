import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Cards (Icon)
 * Each row is one card: an icon (image, :icon: or emoji), a title and a description.
 * The first link found in the row becomes the link for the whole card.
 */

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u;

function isIconCell(cell) {
  const text = cell.textContent.trim();
  const media = cell.querySelector('picture, img, span.icon, svg');
  if (media && text.length === 0) return true;
  return !media && text.length > 0 && text.length <= 8
    && EMOJI_ONLY.test(text) && /\p{Extended_Pictographic}/u.test(text);
}

/**
 * Replaces an element with its children (used to unwrap nested links).
 * @param {Element} el
 */
function unwrap(el) {
  el.replaceWith(...el.childNodes);
}

function buildCard(row) {
  const cells = [...row.children];
  const anchor = row.querySelector('a[href]');
  const href = anchor ? anchor.getAttribute('href') : null;

  const iconCell = cells.find(isIconCell);
  const bodyCells = cells.filter((c) => c !== iconCell && c.textContent.trim());

  const card = document.createElement(href ? 'a' : 'div');
  card.className = 'cards-icon-card';
  if (href) {
    card.href = href;
    if (anchor.target) card.target = anchor.target;
  }

  if (iconCell) {
    const icon = document.createElement('div');
    icon.className = 'cards-icon-card-icon';
    icon.append(...iconCell.childNodes);
    // drop a wrapping link around the icon; the whole card is already a link
    icon.querySelectorAll('a').forEach(unwrap);
    card.append(icon);
  }

  const body = document.createElement('div');
  body.className = 'cards-icon-card-body';
  bodyCells.forEach((cell) => body.append(...cell.childNodes));
  // a link-only paragraph (e.g. "Play") is redundant once the whole card links,
  // unless it is the only candidate for the title
  const hasHeading = !!body.querySelector('h1, h2, h3, h4, h5, h6');
  [...body.querySelectorAll(':scope > p')].forEach((p, i) => {
    const links = p.querySelectorAll('a');
    const linkOnly = links.length === 1 && p.textContent.trim() === links[0].textContent.trim();
    if (linkOnly && (hasHeading || i > 0)) p.remove();
  });
  body.querySelectorAll('a').forEach(unwrap);
  body.querySelectorAll('.button-wrapper, .button').forEach((el) => {
    el.classList.remove('button-wrapper', 'button', 'primary', 'secondary', 'accent');
  });

  // bare text cells: wrap loose text so every piece of content is an element
  if (!body.children.length && body.textContent.trim()) {
    const p = document.createElement('p');
    p.append(...body.childNodes);
    body.append(p);
  }

  // title: first heading, else the first paragraph is promoted to a heading
  let title = body.querySelector('h1, h2, h3, h4, h5, h6');
  if (!title && body.firstElementChild) {
    title = document.createElement('h3');
    title.append(...body.firstElementChild.childNodes);
    body.firstElementChild.replaceWith(title);
  }
  if (title) title.classList.add('cards-icon-card-title');
  [...body.children].filter((el) => el !== title).forEach((el) => {
    if (el.textContent.trim() || el.querySelector('picture, img')) el.classList.add('cards-icon-card-description');
    else el.remove();
  });
  card.append(body);

  const li = document.createElement('li');
  li.append(card);
  return li;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    if (!row.textContent.trim() && !row.querySelector('picture, img, span.icon')) return;
    ul.append(buildCard(row));
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '96' }]));
  });

  block.replaceChildren(ul);
}
