/* eslint-disable */
/* global WebImporter */

/**
 * Parser for tag-list (template content-page).
 *
 * Source: `body > main > article div.prose div.tags`, e.g.
 *   <div class="tags"><span class="tag">Podcast</span><span class="tag">LLM</span>...</div>
 *
 * Output (single cell):
 *   | Tag List |
 *   | <ul><li>Podcast</li><li>LLM</li>...</ul> |
 *
 * Linked tags keep their link. Duplicate and empty tags are dropped.
 * No tags -> the element is removed.
 */
export default function parse(element, { document }) {
  let items = [...element.querySelectorAll('.tag')];
  if (!items.length) items = [...element.children];

  const seen = new Set();
  const ul = document.createElement('ul');
  items.forEach((item) => {
    const text = (item.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || seen.has(text.toLowerCase())) return;
    seen.add(text.toLowerCase());
    const li = document.createElement('li');
    const link = item.matches('a[href]') ? item : item.querySelector('a[href]');
    if (link) {
      const a = document.createElement('a');
      a.href = link.getAttribute('href');
      a.textContent = text;
      li.append(a);
    } else {
      li.textContent = text;
    }
    ul.append(li);
  });

  if (!ul.children.length) {
    element.remove();
    return;
  }

  const cells = [[ul]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'tag-list', cells });
  element.replaceWith(block);
}
