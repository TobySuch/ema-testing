/**
 * Fetches the footer fragment.
 * Metadata-independent: /content first (local preview), then the site root (DA/EDS).
 * @returns {Promise<{html: string, url: string}|null>}
 */
async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  return { html: await resp.text(), url: resp.url };
}

/**
 * Replaces an SVG <img> with the inline SVG so it can follow the link colour.
 * Falls back to keeping the <img> when the SVG cannot be fetched.
 * @param {HTMLImageElement} img
 */
async function inlineSvgIcon(img) {
  if (!/\.svg(\?|$)/i.test(img.src)) return;
  try {
    const resp = await fetch(img.src);
    if (!resp.ok) return;
    const doc = new DOMParser().parseFromString(await resp.text(), 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return;
    svg.querySelectorAll('[fill]:not([fill="none"])').forEach((el) => el.setAttribute('fill', 'currentColor'));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    img.replaceWith(document.importNode(svg, true));
  } catch (e) {
    // keep the <img> fallback
  }
}

/**
 * Decorates a link that contains an icon image: icon visible, text kept for screen readers.
 * @param {HTMLAnchorElement} link
 */
function decorateIconLink(link) {
  const img = link.querySelector('img');
  link.classList.add('footer-icon-link');
  const label = link.textContent.trim() || img.alt;
  [...link.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) node.remove();
  });
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = label;
  link.prepend(sr);
  img.alt = '';
  return inlineSvgIcon(img);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const data = await fetchFooter();
  block.textContent = '';
  if (!data) return;

  const fragment = document.createElement('div');
  fragment.innerHTML = data.html;
  fragment.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), data.url).href;
  });

  const icons = [];
  fragment.querySelectorAll('a[href]').forEach((link) => {
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    if (link.querySelector('img')) icons.push(decorateIconLink(link));
  });

  fragment.querySelectorAll('ul').forEach((list) => {
    const items = [...list.children];
    if (items.length && items.every((li) => li.querySelector('a.footer-icon-link'))) {
      list.classList.add('footer-social');
    }
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'footer-inner';
  [...fragment.children].forEach((section) => {
    section.classList.add('footer-section');
    wrapper.append(section);
  });
  block.append(wrapper);
  await Promise.all(icons);
}
