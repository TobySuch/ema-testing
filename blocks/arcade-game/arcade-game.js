/**
 * Arcade Game (placeholder for the interactive game)
 * Authored rows:
 *   1. game key / name (e.g. "chess", "countdown-numbers")
 *   2. optional short description
 *   3. link to play the game on the original site
 * Rows are detected by content, not position, so omitted or extra rows are tolerated.
 *
 * Renders a "coming soon" panel with the game name and a button that plays the game on the
 * original site. All copy except the generic placeholder wording comes from the authored rows.
 */

const SMALL_WORDS = new Set(['of', 'the', 'a', 'an', 'and', 'on', 'in', 'to']);

/**
 * Turns a game key such as "number-of-the-day" into "Number of the Day".
 * Text that already contains spaces or capitals is kept as authored.
 * @param {string} key
 * @returns {string}
 */
function toGameName(key) {
  const text = (key || '').trim();
  if (!text) return '';
  if (/\s/.test(text) || /[A-Z]/.test(text)) return text;
  return text
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word, i) => {
      if (i > 0 && SMALL_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .replace(/\bTic Tac Toe\b/, 'Tic-Tac-Toe');
}

function toSlug(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Returns a readable host label such as "tobysuch.uk".
 * @param {string} href
 * @returns {string}
 */
function hostLabel(href) {
  try {
    return new URL(href, window.location.href).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export default function decorate(block) {
  const rows = [...block.children];
  let key = '';
  let description = '';
  let link = null;

  rows.forEach((row) => {
    const cells = [...row.children];
    const anchor = row.querySelector('a[href]');
    if (anchor && !link) {
      link = anchor;
      return;
    }
    // support optional "label | value" rows (e.g. "game | chess")
    let valueCell = cells[cells.length - 1] || row;
    let label = '';
    if (cells.length > 1) {
      label = cells[0].textContent.trim().toLowerCase();
      [, valueCell] = cells;
    }
    const text = valueCell.textContent.trim();
    if (!text) return;
    if (label === 'description') {
      description = text;
    } else if (['game', 'key', 'name'].includes(label)) {
      key = text;
    } else if (!key) {
      key = text;
    } else if (!description) {
      description = text;
    }
  });

  const name = toGameName(key) || (link ? link.textContent.trim() : '') || 'Game';
  const slug = toSlug(key);
  if (slug) block.dataset.game = slug;

  const panel = document.createElement('div');
  panel.className = 'arcade-game-panel';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'arcade-game-eyebrow';
  eyebrow.textContent = 'Coming soon';

  const title = document.createElement('p');
  title.className = 'arcade-game-title';
  title.textContent = name;

  const desc = document.createElement('p');
  desc.className = 'arcade-game-description';
  desc.textContent = description || 'The interactive version of this game is coming soon.';

  panel.append(eyebrow, title, desc);

  if (link) {
    const host = hostLabel(link.href);
    const fallback = host ? `Play ${name} on ${host}` : `Play ${name}`;
    const play = document.createElement('a');
    play.href = link.href;
    play.className = 'arcade-game-play';
    play.textContent = link.textContent.trim() || fallback;
    if (host && host !== window.location.hostname.replace(/^www\./, '')) {
      play.target = '_blank';
      play.rel = 'noopener';
    }
    panel.append(play);
  }

  block.replaceChildren(panel);
}
