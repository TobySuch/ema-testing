/**
 * Tag List
 * Accepts tags as list items, one per row/cell/paragraph, or comma-separated text.
 * Linked tags keep their link.
 */

/**
 * Collects tag entries from authored content.
 * @param {Element} root
 * @returns {{text: string, href: string|null}[]}
 */
function collectTags(root) {
  const tags = [];
  const push = (text, href = null) => {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    if (clean && !tags.some((t) => t.text.toLowerCase() === clean.toLowerCase())) {
      tags.push({ text: clean, href });
    }
  };

  const items = root.querySelectorAll('li');
  if (items.length) {
    items.forEach((li) => {
      const a = li.querySelector('a[href]');
      push(li.textContent, a ? a.getAttribute('href') : null);
    });
    return tags;
  }

  const links = root.querySelectorAll('a[href]');
  if (links.length) {
    links.forEach((a) => push(a.textContent, a.getAttribute('href')));
    return tags;
  }

  // leaf containers: paragraphs, or cells without paragraphs
  const leaves = [...root.querySelectorAll('p, h1, h2, h3, h4, h5, h6')];
  if (!leaves.length) {
    root.querySelectorAll(':scope > div > div').forEach((cell) => leaves.push(cell));
  }
  if (!leaves.length) leaves.push(root);
  leaves.forEach((el) => {
    el.textContent.split(/[,\n|]/).forEach((part) => push(part));
  });
  return tags;
}

export default function decorate(block) {
  const tags = collectTags(block);
  const ul = document.createElement('ul');
  ul.className = 'tag-list-items';
  tags.forEach(({ text, href }) => {
    const li = document.createElement('li');
    li.className = 'tag-list-tag';
    if (href) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      li.append(a);
    } else {
      li.textContent = text;
    }
    ul.append(li);
  });
  block.replaceChildren(ul);
  if (!tags.length) block.classList.add('tag-list-empty');
}
