/* eslint-disable */
/* global WebImporter */

/**
 * Section transformer for www.tobysuch.uk (all templates).
 *
 * Driven by `payload.template.sections` ({ id, name, selector: string[], style, blocks, defaultContent }).
 *
 * beforeTransform (parser targets still exist): walk sections in reverse and insert an <hr> before
 *   every non-first section found on the page. A styled section's <hr> gets a temporary
 *   `data-excat-section-id`; a styled first section gets a temporary marked <hr> too.
 * afterTransform: walk in reverse again and insert a Section Metadata block (Style) after each
 *   marker, then drop the marker attribute; the first section's temporary <hr> is removed so it
 *   does not open an empty section.
 *
 * Single-section templates with style null (game-page) are a no-op.
 */

const MARKER_ATTR = 'data-excat-section-id';
const FIRST_ATTR = 'data-excat-section-first';

function findSectionElement(document, section) {
  const selectors = Array.isArray(section.selector) ? section.selector : [section.selector].filter(Boolean);
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el) return el;
    } catch (e) {
      // invalid selector: try the next one
    }
  }
  return null;
}

function hasStyle(section) {
  if (section.style == null) return false;
  if (Array.isArray(section.style)) return section.style.length > 0;
  return String(section.style).trim() !== '';
}

function styleValue(section) {
  return Array.isArray(section.style) ? section.style.join(', ') : String(section.style).trim();
}

function sectionKey(section, index) {
  return String(section.id != null ? section.id : index);
}

export default function transform(hookName, element, payload) {
  const document = (payload && payload.document) || element.ownerDocument;
  const sections = (payload && payload.template && payload.template.sections) || [];
  if (sections.length === 0) return;

  if (hookName === 'beforeTransform') {
    // Resolve every section first, so inserted <hr>s never affect later selector lookups.
    const resolved = sections.map((section, index) => ({
      section,
      index,
      el: findSectionElement(document, section),
    }));
    const firstFound = resolved.find((r) => r.el);

    for (let i = resolved.length - 1; i >= 0; i -= 1) {
      const { section, index, el } = resolved[i];
      if (!el || !el.parentNode) continue;
      const isFirst = firstFound && firstFound.index === index;
      const styled = hasStyle(section);
      if (isFirst && !styled) continue;

      const hr = document.createElement('hr');
      if (styled) hr.setAttribute(MARKER_ATTR, sectionKey(section, index));
      if (isFirst) hr.setAttribute(FIRST_ATTR, 'true');
      el.parentNode.insertBefore(hr, el);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!hasStyle(section)) continue;

      const key = sectionKey(section, i);
      const marker = [...document.querySelectorAll(`hr[${MARKER_ATTR}]`)]
        .find((hr) => hr.getAttribute(MARKER_ATTR) === key);
      // Fallback when the marker was lost: the section element itself, if it survived parsing.
      const anchor = marker || findSectionElement(document, section);
      if (!anchor || !anchor.parentNode) continue;

      const metadata = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: styleValue(section) },
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

    // Safety: no temporary attributes survive.
    document.querySelectorAll(`hr[${FIRST_ATTR}]`).forEach((hr) => hr.remove());
    document.querySelectorAll(`[${MARKER_ATTR}]`).forEach((el) => el.removeAttribute(MARKER_ATTR));
  }
}
