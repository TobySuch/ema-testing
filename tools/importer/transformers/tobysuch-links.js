/* eslint-disable */
/* global WebImporter */

/**
 * Internal links: site-relative, without a trailing slash.
 *
 * The source serves pages as /blog/ and /projects/earlybird/, but migrated pages live at
 * /blog and /projects/earlybird (content/<path>.plain.html), so a trailing slash would point
 * at a folder and 404. Links to the source host become site-relative; links to other sites,
 * anchors and file downloads are left as they are.
 *
 * Runs in afterTransform, after the block parsers, so links inside blocks are covered too.
 */
const SOURCE_HOSTS = ['www.tobysuch.uk', 'tobysuch.uk'];

// eslint-disable-next-line no-unused-vars
export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;
  element.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return;
    let url;
    try {
      url = new URL(href, 'https://www.tobysuch.uk/');
    } catch (e) {
      return;
    }
    const internal = href.startsWith('/') || SOURCE_HOSTS.includes(url.hostname);
    if (!internal) return;
    // Game "play" links intentionally point at the original site's interactive games.
    if (/^https?:/i.test(href) && url.pathname.startsWith('/arcade/') && url.pathname !== '/arcade/') return;
    let path = url.pathname;
    if (/\.[a-z0-9]{2,5}$/i.test(path)) return; // file download: keep as is
    if (path.length > 1) path = path.replace(/\/+$/, '');
    a.setAttribute('href', `${path}${url.search}${url.hash}`);
  });
}
