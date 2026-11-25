/* eslint-disable */
/* global WebImporter */

import tagListParser from './parsers/tag-list.js';
import tobysuchButtonsTransformer from './transformers/tobysuch-buttons.js';
import tobysuchCleanupTransformer from './transformers/tobysuch-cleanup.js';
import tobysuchLinksTransformer from './transformers/tobysuch-links.js';
import tobysuchSectionsTransformer from './transformers/tobysuch-sections.js';

const PAGE_TEMPLATE = {
  "name": "content-page",
  "urls": [
    "https://www.tobysuch.uk/about/",
    "https://www.tobysuch.uk/blog/protecting-your-django-media/",
    "https://www.tobysuch.uk/projects/earlybird/",
    "https://www.tobysuch.uk/projects/shifter/",
    "https://www.tobysuch.uk/projects/tokenbury/"
  ],
  "description": "Article page: large image, centred title, date, body text; used for project pages, blog posts and about",
  "blocks": [
    {
      "name": "tag-list",
      "instances": [
        "body > main > article div.prose div.tags"
      ],
      "pageInstances": {
        "https://www.tobysuch.uk/projects/earlybird/": [
          "body > main > article > div.prose > div > div.tags"
        ],
        "https://www.tobysuch.uk/projects/shifter/": [
          "body > main > article > div.prose > div > div.tags"
        ],
        "https://www.tobysuch.uk/projects/tokenbury/": [
          "body > main > article > div.prose > div > div.tags"
        ]
      }
    }
  ],
  "sections": [
    {
      "id": "article",
      "name": "Article",
      "selector": [
        "body > main > article"
      ],
      "style": null,
      "blocks": [
        "tag-list"
      ],
      "defaultContent": [
        "body > main > article > div.hero-image",
        "body > main > article > div.prose > div > h1",
        "body > main > article > div.prose > div > div",
        "body > main > article > div.prose > p",
        "body > main > article > div.prose > h2",
        "body > main > article > div.prose > h3",
        "body > main > article > div.prose > ul",
        "body > main > article > div.prose > pre",
        "body > main > article > div.prose > div.project-links"
      ]
    }
  ]
};

const parsers = {
  'tag-list': tagListParser,
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
