/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-homepage.js
  var import_homepage_exports = {};
  __export(import_homepage_exports, {
    default: () => import_homepage_default
  });

  // tools/importer/parsers/cards-teaser.js
  var SOURCE_HOST = /(^|\.)tobysuch\.uk$/i;
  function clean(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function toSitePath(href) {
    if (!href) return "";
    const raw = href.trim();
    if (!raw || raw.startsWith("#") || /^(mailto|tel|javascript):/i.test(raw)) return raw;
    try {
      const url = new URL(raw, "https://www.tobysuch.uk");
      if (!SOURCE_HOST.test(url.hostname)) return raw;
      return `${url.pathname}${url.search}${url.hash}` || "/";
    } catch (e) {
      return raw;
    }
  }
  function getItems(element) {
    let items = [...element.children].filter((el) => el.tagName === "LI");
    if (!items.length) {
      items = [...element.querySelectorAll("li")].filter((li) => !li.parentElement.closest("li"));
    }
    return items;
  }
  function isSeeAll(item, titleText) {
    if (/^see\s*all\b/i.test(titleText)) return true;
    return !!item.querySelector('[class*="see-all"]') && !item.querySelector("img");
  }
  function buildRow(item, document) {
    const titleEl = item.querySelector(".blog-title, h1, h2, h3, h4, h5, h6");
    const titleText = clean(titleEl ? titleEl.textContent : "");
    const linkEl = item.querySelector("a[href]");
    const href = linkEl ? toSitePath(linkEl.getAttribute("href")) : "";
    const seeAll = isSeeAll(item, titleText);
    let heading = null;
    const label = titleText || (seeAll ? "See All" : clean(linkEl ? linkEl.textContent : ""));
    if (label) {
      const level = titleEl && /^H[1-6]$/.test(titleEl.tagName) ? titleEl.tagName.toLowerCase() : "h4";
      heading = document.createElement(level);
      if (href) {
        const a = document.createElement("a");
        a.href = href;
        a.textContent = label;
        heading.append(a);
      } else {
        heading.textContent = label;
      }
    }
    if (seeAll) {
      return { seeAll: true, row: ["", heading ? [heading] : ""] };
    }
    let imageCell = "";
    const srcImg = item.querySelector("img");
    if (srcImg && (srcImg.getAttribute("src") || srcImg.getAttribute("data-src"))) {
      const img = document.createElement("img");
      img.src = srcImg.getAttribute("src") || srcImg.getAttribute("data-src");
      img.alt = srcImg.getAttribute("alt") || "";
      imageCell = img;
    }
    const body = [];
    if (heading) body.push(heading);
    const dateEl = item.querySelector(".blog-date, time");
    const dateText = clean(dateEl ? dateEl.textContent : "");
    if (dateText) {
      const p = document.createElement("p");
      p.textContent = dateText;
      body.push(p);
    }
    const tagNames = [...item.querySelectorAll(".project-tag, .tag")].filter((el) => !el.querySelector(".project-tag, .tag")).map((el) => clean(el.textContent)).filter(Boolean);
    const unique = [...new Set(tagNames)];
    if (unique.length) {
      const ul = document.createElement("ul");
      unique.forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        ul.append(li);
      });
      body.push(ul);
    }
    if (!imageCell && !body.length) return null;
    return { seeAll: false, row: [imageCell, body.length ? body : ""] };
  }
  function parse(element, { document, params }) {
    const cards = [];
    let seeAllRow = null;
    getItems(element).forEach((item) => {
      const result = buildRow(item, document);
      if (!result) return;
      if (result.seeAll) seeAllRow = result.row;
      else cards.push(result.row);
    });
    const cells = [...cards];
    if (seeAllRow) cells.push(seeAllRow);
    const name = seeAllRow ? "cards-teaser (see-all-card)" : "cards-teaser";
    const block = WebImporter.Blocks.createBlock(document, { name, cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/tobysuch-buttons.js
  function transform(hookName, element, payload) {
    if (hookName !== "afterTransform") return;
    const document = element.ownerDocument;
    element.querySelectorAll("div.project-links").forEach((wrapper) => {
      const links = [...wrapper.querySelectorAll("a[href]")];
      if (!links.length) return;
      const paragraphs = links.map((link) => {
        const a = document.createElement("a");
        a.href = link.getAttribute("href");
        a.textContent = link.textContent.replace(/\s+/g, " ").trim();
        const emphasis = document.createElement(link.classList.contains("link-repo") ? "em" : "strong");
        emphasis.append(a);
        const p = document.createElement("p");
        p.append(emphasis);
        return p;
      });
      wrapper.replaceWith(...paragraphs);
    });
  }

  // tools/importer/transformers/tobysuch-cleanup.js
  var CATALOG_CLEANUP_RULES = [];
  function pageKey(u) {
    try {
      const { origin, pathname } = new URL(u);
      return `${origin}${pathname.replace(/\/$/, "")}`;
    } catch (e) {
      return u;
    }
  }
  function getPageUrl(payload, document) {
    const { params = {}, url } = payload || {};
    if (params.originalURL) return params.originalURL;
    if (url && !/^about:|^file:/.test(url)) return url;
    const canonical = document && document.querySelector('link[rel="canonical"]');
    if (canonical && canonical.getAttribute("href")) return canonical.getAttribute("href");
    try {
      return document.location.href;
    } catch (e) {
      return "";
    }
  }
  function safeQueryAll(root, selector) {
    try {
      return [...root.querySelectorAll(selector)];
    } catch (e) {
      return [];
    }
  }
  function findPageEntry(map, key) {
    if (!map || typeof map !== "object") return null;
    return Object.entries(map).find(([u]) => pageKey(u) === key) || null;
  }
  function replayCatalogCleanup(document, template, pageUrl) {
    const key = pageKey(pageUrl);
    const entry = findPageEntry(template.pageCleanup, key);
    if (entry) {
      (entry[1] || []).forEach((item) => {
        const selector = typeof item === "string" ? item : item && item.selector;
        if (!selector) return;
        const matches = safeQueryAll(document, selector);
        if (matches.length === 1) matches[0].remove();
      });
      return;
    }
    const rules = Array.isArray(template.cleanupRules) ? template.cleanupRules : CATALOG_CLEANUP_RULES;
    const mains = safeQueryAll(document, "main");
    rules.forEach((r) => {
      const selector = typeof r === "string" ? r : r && (r.rule || r.selector);
      if (!selector) return;
      safeQueryAll(document, selector).forEach((el) => {
        if (!el.isConnected) return;
        if (mains.some((m) => m === el || m.contains(el) || el.contains(m))) return;
        el.remove();
      });
    });
  }
  function unwrap(el) {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    el.remove();
  }
  function isSiteFooter(footer) {
    if (footer.closest("article, blockquote, table")) return false;
    return true;
  }
  function isSiteHeader(header) {
    if (header.closest("article, table")) return false;
    return true;
  }
  function removeChrome(root) {
    safeQueryAll(root, "header").filter(isSiteHeader).forEach((el) => el.remove());
    safeQueryAll(root, 'nav, [role="navigation"], [role="banner"]').forEach((el) => {
      if (!el.closest("table")) el.remove();
    });
    safeQueryAll(root, 'footer, [role="contentinfo"]').filter(isSiteFooter).forEach((el) => el.remove());
    safeQueryAll(root, "iframe, script, style, noscript, link, template, object, embed").forEach((el) => el.remove());
    safeQueryAll(root, "astro-island, astro-slot, astro-static-slot").reverse().forEach(unwrap);
    safeQueryAll(root, "*").forEach((el) => {
      [...el.attributes].forEach(({ name }) => {
        if (/^data-astro-/.test(name) || name === "data-cf-beacon" || name === "data-domain" || /^on[a-z]+$/.test(name)) {
          el.removeAttribute(name);
        }
      });
    });
  }
  function transform2(hookName, element, payload) {
    const document = payload && payload.document || element.ownerDocument;
    const template = payload && payload.template || {};
    if (hookName === "beforeTransform") {
      replayCatalogCleanup(document, template, getPageUrl(payload, document));
    }
    if (hookName === "afterTransform") {
      removeChrome(element);
    }
  }

  // tools/importer/transformers/tobysuch-links.js
  var SOURCE_HOSTS = ["www.tobysuch.uk", "tobysuch.uk"];
  function transform3(hookName, element, payload) {
    if (hookName !== "afterTransform") return;
    element.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) return;
      let url;
      try {
        url = new URL(href, "https://www.tobysuch.uk/");
      } catch (e) {
        return;
      }
      const internal = href.startsWith("/") || SOURCE_HOSTS.includes(url.hostname);
      if (!internal) return;
      if (/^https?:/i.test(href) && url.pathname.startsWith("/arcade/") && url.pathname !== "/arcade/") return;
      let path = url.pathname;
      if (/\.[a-z0-9]{2,5}$/i.test(path)) return;
      if (path.length > 1) path = path.replace(/\/+$/, "");
      a.setAttribute("href", `${path}${url.search}${url.hash}`);
    });
  }

  // tools/importer/transformers/tobysuch-sections.js
  var MARKER_ATTR = "data-excat-section-id";
  var FIRST_ATTR = "data-excat-section-first";
  function findSectionElement(document, section) {
    const selectors = Array.isArray(section.selector) ? section.selector : [section.selector].filter(Boolean);
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el) return el;
      } catch (e) {
      }
    }
    return null;
  }
  function hasStyle(section) {
    if (section.style == null) return false;
    if (Array.isArray(section.style)) return section.style.length > 0;
    return String(section.style).trim() !== "";
  }
  function styleValue(section) {
    return Array.isArray(section.style) ? section.style.join(", ") : String(section.style).trim();
  }
  function sectionKey(section, index) {
    return String(section.id != null ? section.id : index);
  }
  function transform4(hookName, element, payload) {
    const document = payload && payload.document || element.ownerDocument;
    const sections = payload && payload.template && payload.template.sections || [];
    if (sections.length === 0) return;
    if (hookName === "beforeTransform") {
      const resolved = sections.map((section, index) => ({
        section,
        index,
        el: findSectionElement(document, section)
      }));
      const firstFound = resolved.find((r) => r.el);
      for (let i = resolved.length - 1; i >= 0; i -= 1) {
        const { section, index, el } = resolved[i];
        if (!el || !el.parentNode) continue;
        const isFirst = firstFound && firstFound.index === index;
        const styled = hasStyle(section);
        if (isFirst && !styled) continue;
        const hr = document.createElement("hr");
        if (styled) hr.setAttribute(MARKER_ATTR, sectionKey(section, index));
        if (isFirst) hr.setAttribute(FIRST_ATTR, "true");
        el.parentNode.insertBefore(hr, el);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!hasStyle(section)) continue;
        const key = sectionKey(section, i);
        const marker = [...document.querySelectorAll(`hr[${MARKER_ATTR}]`)].find((hr) => hr.getAttribute(MARKER_ATTR) === key);
        const anchor = marker || findSectionElement(document, section);
        if (!anchor || !anchor.parentNode) continue;
        const metadata = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: styleValue(section) }
        });
        if (marker) {
          marker.after(metadata);
          if (marker.hasAttribute(FIRST_ATTR)) {
            marker.remove();
          } else {
            marker.removeAttribute(MARKER_ATTR);
          }
        } else {
          anchor.appendChild(metadata);
        }
      }
      document.querySelectorAll(`hr[${FIRST_ATTR}]`).forEach((hr) => hr.remove());
      document.querySelectorAll(`[${MARKER_ATTR}]`).forEach((el) => el.removeAttribute(MARKER_ATTR));
    }
  }

  // tools/importer/import-homepage.js
  var PAGE_TEMPLATE = {
    "name": "homepage",
    "urls": [
      "https://www.tobysuch.uk/"
    ],
    "description": "Landing page with intro text, featured card teasers and see-all links",
    "blocks": [
      {
        "name": "cards-teaser",
        "instances": [
          "body > main > div > section > ul"
        ],
        "pageInstances": {
          "https://www.tobysuch.uk/": [
            "body > main > div > section:nth-child(1) > ul",
            "body > main > div > section:nth-child(2) > ul"
          ]
        }
      }
    ],
    "sections": [
      {
        "id": "intro-and-latest",
        "name": "Intro and latest posts",
        "selector": [
          "body > main"
        ],
        "style": null,
        "blocks": [
          "cards-teaser"
        ],
        "defaultContent": [
          "body > main > h1",
          "body > main > p",
          "body > main > div > section > h2"
        ]
      }
    ]
  };
  var parsers = {
    "cards-teaser": parse
  };
  var sectionTransformers = [transform4];
  var fragmentTransformers = [];
  var lateTransformers = [...sectionTransformers, ...fragmentTransformers];
  var correctionTransformers = [];
  var transformers = [transform, transform2, transform3, ...lateTransformers, ...correctionTransformers];
  var earlyTransformers = transformers.filter((fn) => !lateTransformers.includes(fn));
  var CATALOG = Boolean(PAGE_TEMPLATE.pageCleanup || PAGE_TEMPLATE.blocks.some((b) => b.pageInstances));
  function executeTransformers(hookName, element, payload, list = transformers) {
    var _a, _b;
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: ((_b = (_a = payload.params) == null ? void 0 : _a.targets) == null ? void 0 : _b.template) || PAGE_TEMPLATE });
    list.forEach((fn) => {
      try {
        fn(hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template, url) {
    const pageBlocks = [];
    const pageKey2 = (u) => {
      try {
        const { origin, pathname } = new URL(u);
        return `${origin}${pathname.replace(/\/$/, "")}`;
      } catch (e) {
        return u;
      }
    };
    const key = pageKey2(url);
    const claim = (blockDef, selector) => {
      let matches = [];
      try {
        matches = document.querySelectorAll(selector);
      } catch (e) {
        return;
      }
      matches.forEach((element) => {
        if (pageBlocks.some((b) => b.element === element || b.element.contains(element) || element.contains(b.element))) return;
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    };
    template.blocks.forEach((blockDef) => {
      const entry = Object.entries(blockDef.pageInstances || {}).find(([u]) => pageKey2(u) === key);
      (entry ? entry[1] : []).forEach((selector) => claim(blockDef, selector));
    });
    template.blocks.forEach((blockDef) => (blockDef.instances || []).forEach((selector) => claim(blockDef, selector)));
    return pageBlocks;
  }
  function markPageTargets(payload) {
    const { document, params } = payload;
    executeTransformers("beforeTransform", document.body, payload, earlyTransformers);
    const blocks = findBlocksOnPage(document, PAGE_TEMPLATE, params.originalURL).map(({ name, selector, element }, i) => {
      element.setAttribute("data-excat-block", String(i));
      return { name, selector };
    });
    const sections = (PAGE_TEMPLATE.sections || []).map((section, i) => {
      const target = (section.selector || []).map((s) => {
        try {
          return document.querySelector(s);
        } catch (e) {
          return null;
        }
      }).find(Boolean);
      if (!target) return section;
      target.setAttribute("data-excat-section", String(i));
      return __spreadProps(__spreadValues({}, section), { selector: [`[data-excat-section="${i}"]`] });
    });
    params.targets = { blocks, template: __spreadProps(__spreadValues({}, PAGE_TEMPLATE), { sections }) };
  }
  var import_homepage_default = {
    preprocess: (payload) => {
      if (CATALOG) markPageTargets(payload);
    },
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      params.fragments = [];
      if (!params.targets) markPageTargets(payload);
      const pageBlocks = params.targets.blocks.map((block, i) => __spreadProps(__spreadValues({}, block), { element: document.querySelector(`[data-excat-block="${i}"]`) })).filter((block) => block.element);
      executeTransformers("beforeTransform", main, __spreadProps(__spreadValues({}, payload), { pageBlocks }), lateTransformers);
      pageBlocks.forEach((block) => {
        if (!main.contains(block.element)) return;
        const parser = parsers[block.name];
        if (!parser) return;
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      });
      executeTransformers("afterTransform", main, payload);
      main.appendChild(document.createElement("hr"));
      const meta = __spreadValues(__spreadValues({}, WebImporter.Blocks.getMetadata(document)), PAGE_TEMPLATE.pageMetadata || {});
      if (Object.keys(meta).length) main.append(WebImporter.Blocks.getMetadataBlock(document, meta));
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      params.fragments.forEach(({ element }) => {
        executeTransformers("afterTransform", element, payload, earlyTransformers);
        WebImporter.rules.transformBackgroundImages(element, document);
        WebImporter.rules.adjustImageUrls(element, url, params.originalURL);
      });
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) }
      }, ...params.fragments];
    }
  };
  return __toCommonJS(import_homepage_exports);
})();
