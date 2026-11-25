/* eslint-disable */
/* global WebImporter */

import arcadeGameParser from './parsers/arcade-game.js';
import tobysuchButtonsTransformer from './transformers/tobysuch-buttons.js';
import tobysuchCleanupTransformer from './transformers/tobysuch-cleanup.js';
import tobysuchLinksTransformer from './transformers/tobysuch-links.js';
import tobysuchSectionsTransformer from './transformers/tobysuch-sections.js';

const PAGE_TEMPLATE = {
  "name": "game-page",
  "urls": [
    "https://www.tobysuch.uk/arcade/chess/",
    "https://www.tobysuch.uk/arcade/countdown-numbers/",
    "https://www.tobysuch.uk/arcade/number-of-the-day/",
    "https://www.tobysuch.uk/arcade/times-table-check/",
    "https://www.tobysuch.uk/arcade/ultimate-tic-tac-toe/"
  ],
  "description": "Full-screen interactive arcade game page: centred title, the game itself (controls, boards, tiles), and an \"← Arcade\" footer link",
  "blocks": [
    {
      "name": "arcade-game",
      "instances": [
        "body > astro-island > div > div"
      ],
      "pageInstances": {
        "https://www.tobysuch.uk/arcade/chess/": [
          "body > astro-island > div > div > div.flex.flex-wrap.justify-center.gap-3",
          "body > astro-island > div > div > div.w-full.max-w-xs.opacity-40.pointer-events-none.select-none > div",
          "body > astro-island > div > div > button"
        ],
        "https://www.tobysuch.uk/arcade/countdown-numbers/": [
          "body > astro-island > div > div > div.flex.flex-wrap.items-center.justify-center.gap-3",
          "body > astro-island > div > div > div.flex.h-28.w-28.items-center.justify-center.rounded-full.border-4.border-red-600.bg-red-900\\/40.text-4xl.font-black.tabular-nums.text-white.shadow-xl.transition-all.duration-500.ease-out.sm\\:h-32.sm\\:w-32.sm\\:text-5xl.scale-100.opacity-100",
          "body > astro-island > div > div > button.rounded-lg.bg-blue-600.px-8.py-3.text-lg.font-semibold.text-white.transition-colors.cursor-pointer.hover\\:bg-blue-500.focus-visible\\:outline-2.focus-visible\\:outline-offset-2.focus-visible\\:outline-blue-400",
          "body > astro-island > div > div > button.rounded-lg.border.border-slate-700.px-8.py-3.text-lg.font-semibold.text-slate-300.transition-colors.cursor-pointer.hover\\:border-slate-500.hover\\:text-white.focus-visible\\:outline-2.focus-visible\\:outline-offset-2.focus-visible\\:outline-blue-400"
        ],
        "https://www.tobysuch.uk/arcade/number-of-the-day/": [
          "body > astro-island > div > div > div.flex.items-center.gap-5.rounded-xl.border.border-slate-800.bg-slate-900.px-8.py-4.shadow-lg",
          "body > astro-island > div > div > div.w-full",
          "body > astro-island > div > div > button"
        ],
        "https://www.tobysuch.uk/arcade/times-table-check/": [
          "body > astro-island > div > div > div.grid.grid-cols-4.overflow-hidden.rounded-xl.border.border-slate-800",
          "body > astro-island > div > div > button"
        ],
        "https://www.tobysuch.uk/arcade/ultimate-tic-tac-toe/": [
          "body > astro-island > div > div > div.flex.gap-3",
          "body > astro-island > div > div > div.w-full.max-w-xs.opacity-40.pointer-events-none.select-none > input",
          "body > astro-island > div > div > div.w-full.max-w-xs.opacity-40.pointer-events-none.select-none > div",
          "body > astro-island > div > div > button"
        ]
      }
    }
  ],
  "sections": [
    {
      "id": "game",
      "name": "Game",
      "selector": [
        "body > astro-island"
      ],
      "style": null,
      "blocks": [
        "arcade-game"
      ],
      "defaultContent": [
        "body > astro-island > div > div > h1",
        "body > astro-island > div > div > div.text-center"
      ]
    }
  ],
  "pageMetadata": {
    "Theme": "dark"
  }
};

const parsers = {
  'arcade-game': arcadeGameParser,
};
// Late transformers change the DOM (section <hr> markers, shared fragments), so their beforeTransform
// runs after block discovery.
const sectionTransformers = [tobysuchSectionsTransformer];
const fragmentTransformers = [];
const lateTransformers = [...sectionTransformers, ...fragmentTransformers];
// Page corrections ({sitename}-page-corrections.js, when it exists) run last.
const correctionTransformers = [];
const transformers = [tobysuchButtonsTransformer, tobysuchCleanupTransformer, tobysuchLinksTransformer, ...lateTransformers, ...correctionTransformers];
const earlyTransformers = transformers.filter((fn) => !lateTransformers.includes(fn));
// Catalog selectors (pageInstances, pageCleanup) count the <script> and <hr> elements the importer
// removes before transform, so a catalog template finds its targets in preprocess.
const CATALOG = Boolean(PAGE_TEMPLATE.pageCleanup || PAGE_TEMPLATE.blocks.some((b) => b.pageInstances));

function executeTransformers(hookName, element, payload, list = transformers) {
  const enhancedPayload = { ...payload, template: payload.params?.targets?.template || PAGE_TEMPLATE };
  list.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); }
    catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(document, template, url) {
  const pageBlocks = [];
  const pageKey = (u) => {
    try { const { origin, pathname } = new URL(u); return `${origin}${pathname.replace(/\/$/, '')}`; }
    catch { return u; }
  };
  const key = pageKey(url);
  const claim = (blockDef, selector) => {
    let matches = [];
    try { matches = document.querySelectorAll(selector); } catch { return; }
    matches.forEach((element) => {
      if (pageBlocks.some((b) => b.element === element || b.element.contains(element) || element.contains(b.element))) return;
      pageBlocks.push({ name: blockDef.name, selector, element });
    });
  };
  template.blocks.forEach((blockDef) => {
    const entry = Object.entries(blockDef.pageInstances || {}).find(([u]) => pageKey(u) === key);
    (entry ? entry[1] : []).forEach((selector) => claim(blockDef, selector));
  });
  template.blocks.forEach((blockDef) => (blockDef.instances || []).forEach((selector) => claim(blockDef, selector)));
  return pageBlocks;
}

// Runs the early transformers, then marks each block and section target with an attribute: the
// importer re-creates the body before transform, so only attributes survive, not element references.
function markPageTargets(payload) {
  const { document, params } = payload;
  executeTransformers('beforeTransform', document.body, payload, earlyTransformers);
  const blocks = findBlocksOnPage(document, PAGE_TEMPLATE, params.originalURL).map(({ name, selector, element }, i) => {
    element.setAttribute('data-excat-block', String(i));
    return { name, selector };
  });
  const sections = (PAGE_TEMPLATE.sections || []).map((section, i) => {
    const target = (section.selector || []).map((s) => { try { return document.querySelector(s); } catch { return null; } }).find(Boolean);
    if (!target) return section;
    target.setAttribute('data-excat-section', String(i));
    return { ...section, selector: [`[data-excat-section="${i}"]`] };
  });
  params.targets = { blocks, template: { ...PAGE_TEMPLATE, sections } };
}

export default {
  preprocess: (payload) => {
    if (CATALOG) markPageTargets(payload);
  },
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;
    params.fragments = [];

    if (!params.targets) markPageTargets(payload);
    const pageBlocks = params.targets.blocks
      .map((block, i) => ({ ...block, element: document.querySelector(`[data-excat-block="${i}"]`) }))
      .filter((block) => block.element);
    executeTransformers('beforeTransform', main, { ...payload, pageBlocks }, lateTransformers);

    pageBlocks.forEach((block) => {
      if (!main.contains(block.element)) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    executeTransformers('afterTransform', main, payload);

    main.appendChild(document.createElement('hr'));
    // Page metadata: the source's title/description/image, plus template-level metadata (e.g. Theme).
    const meta = { ...WebImporter.Blocks.getMetadata(document), ...(PAGE_TEMPLATE.pageMetadata || {}) };
    if (Object.keys(meta).length) main.append(WebImporter.Blocks.getMetadataBlock(document, meta));
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // A fragment's nodes left `main` before afterTransform: finalize it the same way, without the
    // page-only section breaks and metadata.
    params.fragments.forEach(({ element }) => {
      executeTransformers('afterTransform', element, payload, earlyTransformers);
      WebImporter.rules.transformBackgroundImages(element, document);
      WebImporter.rules.adjustImageUrls(element, url, params.originalURL);
    });

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }, ...params.fragments];
  },
};
