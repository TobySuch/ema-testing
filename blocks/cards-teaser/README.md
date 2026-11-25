# cards-teaser

Custom **cards** block. Purpose: Image teaser cards with title, date and tag pills for projects and blog posts.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row per card: image cell | body cell (linked title, date, optional tag list or an extra cell of comma-separated tags). Alternatively a single link to a listing path (e.g. /blog/) or a "source | /blog/" row (plus optional "limit | 4") lists pages under that path from /query-index.json, newest first; authored cards always render first.

## Supported variations

| Variation | Option class |
| --- | --- |
| See All Card | `see-all-card` |

## Universal Editor fields

N/A (Document Authoring project)
