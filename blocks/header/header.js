// Source site switches between stacked (mobile) and single-row (desktop) layout at 720px.
const isDesktop = window.matchMedia('(width > 720px)');

/**
 * Fetches the nav fragment. Metadata-independent: /content first (local aem up),
 * then the site root (DA/EDS preview and publish).
 * @returns {Promise<{html: string, url: string}|null>}
 */
async function fetchNav() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  return { html: await resp.text(), url: resp.url };
}

/**
 * Normalises a path for comparison: drops the local /content prefix,
 * a trailing "index" and trailing slashes.
 * @param {string} path
 * @returns {string}
 */
function normalisePath(path) {
  let p = path.replace(/^\/content(?=\/|$)/, '');
  p = p.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  p = p.replace(/\/+$/, '');
  return p || '/';
}

/**
 * Marks the nav link matching the current page (exact match or first path segment).
 * @param {Element} list nav link container
 */
function markActive(list) {
  const current = normalisePath(window.location.pathname);
  const firstSegment = `/${current.split('/')[1] || ''}`.replace(/\/$/, '') || '/';
  list.querySelectorAll('a[href]').forEach((a) => {
    const target = normalisePath(new URL(a.href, window.location.href).pathname);
    const active = target === current || (target !== '/' && target === firstSegment);
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/**
 * Turns the social links into icon links: icon visible, label kept for screen readers.
 * @param {Element} tools nav tools section
 */
function decorateTools(tools) {
  tools.querySelectorAll('a[href]').forEach((a) => {
    const img = a.querySelector('img');
    [...a.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const label = document.createElement('span');
        label.className = 'nav-sr-only';
        label.textContent = node.textContent.trim();
        node.replaceWith(label);
      }
    });
    if (img) {
      img.setAttribute('aria-hidden', 'true');
      img.alt = '';
      img.width = 32;
      img.height = 32;
    }
    if (a.origin !== window.location.origin) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navData = await fetchNav();
  if (!navData) return;

  const fragment = document.createElement('div');
  fragment.innerHTML = navData.html;

  // fragment image paths are relative to the fragment, not the current page
  fragment.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), navData.url).href;
  });

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main');
  [...fragment.children].filter((el) => el.tagName === 'DIV').forEach((section) => nav.append(section));

  ['brand', 'sections', 'tools'].forEach((name, i) => {
    if (nav.children[i]) nav.children[i].classList.add(`nav-${name}`);
  });

  const sections = nav.querySelector('.nav-sections');
  if (sections) markActive(sections);

  const tools = nav.querySelector('.nav-tools');
  if (tools) decorateTools(tools);

  const setViewport = () => {
    nav.dataset.viewport = isDesktop.matches ? 'desktop' : 'mobile';
  };
  setViewport();
  isDesktop.addEventListener('change', setViewport);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.textContent = '';
  block.append(navWrapper);
}
