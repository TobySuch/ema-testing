# Site Migration Plan: tobysuch.uk → AEM Edge Delivery Services (test only, hidden from search engines)

## Overview
This plan migrates the whole site at **https://www.tobysuch.uk/** to AEM Edge Delivery Services, with content authored in Document Authoring (DA). Your project is already connected to the `tobysuch/ema-testing` site. No pages, templates or catalog exist yet, so the migration starts with site discovery.

**Scope:** whole site. That covers every discovered page, grouped into page templates, plus the header, footer and site-wide design.

**Purpose:** testing only. The migrated copy must not be indexed by search engines or compete with the live tobysuch.uk site, because duplicate content can hurt the live site's SEO. Search engine protection goes in first, before any content exists.

## Approach

### Phase 0: Search engine protection (done first)
How the copy is kept out of search results:

1. **A "noindex" tag on every page.** I'll add `<meta name="robots" content="noindex, nofollow">` to the shared page head. It applies to every page on every address the test site is served from (preview, live and any future domain). Search engines that find a page are told not to index it or follow its links. This is the strongest and most reliable protection.
2. **Check the built-in Edge Delivery protection.** Test addresses (`…aem.page` and `…aem.live`) normally block indexing by default, as long as no production domain is connected. I'll confirm this on both addresses by checking the robots file and response headers. I won't connect a production domain.
3. **No search engine discovery paths.** No sitemap will be set up for this site, and it won't be submitted to any search console. Pages also won't link to the test site from tobysuch.uk.
4. **Working files not served.** I'll add the migration working folders and import tools to the ignore list so they are never published, even if committed.
5. **The live site is read-only.** The migration only reads pages from tobysuch.uk, at a gentle pace. Nothing on the live site is changed, so its rankings are unaffected.

**For the protection to take effect online,** the code change has to be pushed to the main branch. Until then it only applies to the local preview. Pushing to main publishes the change, so I'll ask you before I do it. I recommend pushing it before any page is uploaded or previewed online.

> ⚠️ If this ever becomes the real site, the noindex tag must be removed before launch, or the site won't appear in search results.

### Phase 1: Discovery and scoping
- Find every page URL on the site, from its sitemap first and by crawling if needed.
- Analyse a sample of pages and group similar ones into **page templates**.
- Build a **site catalog** listing templates, pages, the blocks each template uses, and block variants.
- Write a scope report: page count, template count, block inventory, and unknown or custom elements.
- **Checkpoint:** you review the templates and blocks, and can rename, merge or split them, before the migration starts.

### Phase 2: Project setup
- Confirm the project type (DA document-based) and the block library, and record them in the project settings.
- Map catalog blocks to standard library blocks where possible, and plan custom blocks where needed.

### Phase 3: Template-by-template content migration
For each template, starting with the home page template:
1. Analyse a representative page in detail: sections, blocks, variants and authoring decisions.
2. Map source page elements to blocks and sections.
3. Build the import parsers and cleanup transformers.
4. Generate and bundle the template's import script.
5. Bulk-import every page in the template.
6. Score each imported page against the original and fix any page that differs a lot.

### Phase 4: Block code
- Generate or adapt the code for each block and variant the templates use.
- Check each block in the preview against the source page.

### Phase 5: Header and footer
- Migrate the navigation for desktop and mobile, including any dropdown or mega menus.
- Migrate the footer.
- Check both against the original site.

### Phase 6: Design migration
- Take the site-wide design tokens from the source site: colours, fonts, spacing and breakpoints.
- Style each block to match the source.
- Compare the whole page and the whole site visually, and fix what differs.

### Phase 7: Review and hand-off
- Final quality check of all migrated pages in the local preview.
- Re-check that every page still has the noindex tag and that no sitemap is published.
- Summary of what was migrated, any known gaps, and pages that need manual authoring attention.
- **Optional, only if you ask for it explicitly:** upload pages to DA, preview them on Edge Delivery, and commit or push the code. Nothing is uploaded, previewed or published without your explicit request.

## Assumptions and notes
- All changes stay local (workspace and preview) unless you ask for an upload, preview or publish.
- Bot protection on the source site is handled automatically with a scraping fallback.
- Large sites may be migrated in batches per template. Progress is reported after each template.
- Any code pull request will include the required `{branch}--ema-testing--TobySuch.aem.page/{path}` preview link.

## Checklist
**Search engine protection**
- [ ] Add a `noindex, nofollow` robots tag to the shared page head
- [ ] Add the migration working folders and import tools to the ignore list
- [ ] **Ask you** before pushing the protection change to main, so it applies online
- [ ] Check that the test preview and live addresses block indexing (robots file and headers)
- [ ] Confirm no sitemap and no production domain are set up for the test site

**Migration**
- [ ] Discover all page URLs on https://www.tobysuch.uk/
- [ ] Analyse pages and group them into page templates
- [ ] Build the site catalog (templates, pages, blocks, variants)
- [ ] Produce the migration scope report
- [ ] **You review** the scoping results (templates and blocks)
- [ ] Confirm the project type and block library
- [ ] Analyse a representative page for each template
- [ ] Map blocks and sections for each template
- [ ] Generate import parsers and transformers
- [ ] Generate and bundle the import script for each template
- [ ] Bulk-import all pages, one template at a time
- [ ] Score imported pages and fix the ones that differ
- [ ] Generate or refine block code for all blocks and variants
- [ ] Migrate the header and navigation (desktop and mobile)
- [ ] Migrate the footer
- [ ] Extract design tokens and apply site-wide styles
- [ ] Style each block to match the source design
- [ ] Run a full-site visual comparison and fix differences

**Wrap-up**
- [ ] Re-check that the noindex protection is on every migrated page
- [ ] Final review and migration summary
- [ ] (Optional, on your explicit request) Upload to DA, preview on Edge Delivery, push code

> **Next step:** Planning mode is on, so no work has started. Switch to Execute mode to start with Phase 0 (search engine protection) and then Phase 1.
