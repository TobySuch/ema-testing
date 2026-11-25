/* eslint-disable */
/* global WebImporter */

/**
 * Project link buttons (default content).
 *
 * Source: <div class="project-links"><a class="link-site">View Site</a><a class="link-repo">GitHub</a></div>
 * EDS default-content buttons: a paragraph holding only a link becomes a button;
 * <strong> marks the primary button and <em> the secondary one.
 *
 * Runs in afterTransform, after block parsers, so block content is never touched.
 */
// eslint-disable-next-line no-unused-vars
export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;
  const document = element.ownerDocument;
  element.querySelectorAll('div.project-links').forEach((wrapper) => {
    const links = [...wrapper.querySelectorAll('a[href]')];
    if (!links.length) return;
    const paragraphs = links.map((link) => {
      const a = document.createElement('a');
      a.href = link.getAttribute('href');
      a.textContent = link.textContent.replace(/\s+/g, ' ').trim();
      const emphasis = document.createElement(link.classList.contains('link-repo') ? 'em' : 'strong');
      emphasis.append(a);
      const p = document.createElement('p');
      p.append(emphasis);
      return p;
    });
    wrapper.replaceWith(...paragraphs);
  });
}
