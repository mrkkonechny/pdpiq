# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working with code in this repository.

## Project Overview

pdpIQ (Product Description Page IQ) is a Chrome extension by **Tribbute** that analyzes eCommerce Product Detail Pages (PDPs) for AI citation readiness. It scores pages across ~75 factors in 6 categories and provides actionable recommendations.

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (ES modules)
- Chrome Side Panel API for UI
- Chrome Storage API for history persistence
- No build tools or bundlers required

## Project Structure

```
pdpiq/
├── manifest.json                 # Extension configuration
├── icons/
│   ├── icon16.png               # Toolbar icon
│   ├── icon48.png               # Extensions page icon
│   ├── icon128.png              # Chrome Web Store icon
│   └── tribbute-logo.png        # Header branding
├── src/
│   ├── background/
│   │   └── service-worker.js    # Message routing, image format verification, AI discoverability network fetches
│   ├── content/
│   │   ├── content-script.js    # Main extraction orchestrator (includes inline structured data extraction)
│   │   └── extractors/
│   │       ├── index.js         # Extractor exports
│   │       ├── structured-data.js   # JSON-LD, Microdata, RDFa (NOTE: not used at runtime)
│   │       ├── meta-tags.js         # OG, Twitter Cards, canonical
│   │       ├── content-quality.js   # Description, specs, features (NOTE: not used at runtime)
│   │       ├── content-structure.js # Headings, semantic HTML
│   │       └── trust-signals.js     # Reviews, ratings, certs
│   ├── scoring/
│   │   ├── scoring-engine.js    # Core scoring calculations
│   │   ├── weights.js           # Category/factor/context weights
│   │   └── grading.js           # Grade utilities (A-F)
│   ├── recommendations/
│   │   ├── recommendation-engine.js  # Prioritization logic
│   │   └── recommendation-rules.js   # Issue-to-fix mappings
│   ├── sidepanel/
│   │   ├── sidepanel.html       # UI markup
│   │   ├── sidepanel.css        # Styling
│   │   └── sidepanel.js         # UI controller
│   └── storage/
│       └── storage-manager.js   # Analysis history persistence
└── styles/                      # Additional stylesheets
```

## Development Workflow

### Loading the Extension
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project root
4. Test on any eCommerce product page

### Testing Changes
- Reload the extension from `chrome://extensions/` after code changes
- For content script changes, also refresh the target page
- For service worker changes, click the "Update" button on the extension card

### Debugging
- Service worker: `chrome://extensions/` → "Inspect views: service worker"
- Content script: DevTools on target page → Console
- Side panel: Right-click side panel → Inspect

## Architecture

### Message Flow
1. User clicks extension icon → opens side panel
2. User selects context (Want/Need/Hybrid)
3. Side panel sends `ANALYZE_PAGE` message to service worker
4. Service worker injects/messages content script
5. Content script runs extractors, returns raw data
6. Service worker verifies image formats (HTTP HEAD requests)
7. Side panel receives data, runs scoring engine
8. Results displayed with recommendations

### Scoring System

**Category Weights** (total = 100%):
- Structured Data: 20% (JSON-LD Product/Offer schemas critical)
- Protocol & Meta: 15% (og:image format critical - WebP fails in LLM chats)
- Content Quality: 20% (descriptions, specs, features, FAQ)
- Content Structure: 12% (semantic HTML, headings, accessibility)
- Authority & Trust: 13% (reviews, ratings, certifications)
- AI Discoverability: 20% (AI crawler access, entity consistency, answer-format content, product identifiers, llms.txt)

**Context Multipliers** adjust factor weights based on purchase type:
- **Want** (emotional): boosts social proof, benefits, reviews; reduces specs
- **Need** (functional): boosts specs, compatibility, certifications; reduces emotional content
- **Hybrid**: neutral (1.0x all factors)

### Structured Data Extraction

**Important:** `content-script.js` contains its own inline extraction logic. The files in `extractors/` (like `structured-data.js` and `content-quality.js`) exist for reference but are **not used** at runtime. When modifying extraction logic, edit `content-script.js` directly.

#### JSON-LD Formats Supported

The `categorizeSchemas()` function handles three JSON-LD formats:
1. **Top-level array**: `[{"@type": "Product", ...}, {"@type": "Organization", ...}]`
2. **Object with @graph**: `{"@graph": [{"@type": "Product", ...}]}`
3. **Single object**: `{"@type": "Product", ...}`

#### Schema Types Extracted

Schema extraction supports both **JSON-LD** and **Microdata** formats for:
- Product **and ProductGroup** (including nested offers, ratings, reviews)
- Offer (standalone and nested)
- AggregateRating (standalone, nested, and `@id`-referenced)
- Review (standalone and nested)
- FAQPage
- BreadcrumbList (and standalone ListItem fallback assembly)
- Organization (standalone and nested in Product.manufacturer)
- Brand (standalone and nested in Product.brand)
- ImageObject (standalone, microdata, and nested in Product.image)

#### Shopify / ProductGroup Patterns

Shopify stores use `ProductGroup` (not `Product`) as the top-level JSON-LD type. This affects several extraction paths:

- **`categorizeSchemas()`** and **`extractBrandSignals()`** both treat `type === 'productgroup'` identically to `type === 'product'`.
- **GTIN/MPN** may not be present on the `ProductGroup` itself — they live on individual `hasVariant[]` items. The extractor loops `hasVariant` and picks the first non-null value.
- **`aggregateRating`** is often an `@id` reference (`"aggregateRating": {"@id": "#reviews"}`) pointing to a standalone `AggregateRating` node elsewhere in the same `@graph`. Both `categorizeSchemas()` and `extractReviewSignals()` build an `idIndex` keyed by `@id` and resolve these references before reading `ratingValue`.
- **`sku`** falls back to `productGroupID` for `ProductGroup` items.

#### `@id` Reference Resolution

`categorizeSchemas()` and `extractReviewSignals()` build a per-block `idIndex`:
```javascript
const idIndex = {};
items.forEach(item => { if (item && item['@id']) idIndex[item['@id']] = item; });
```
Any property whose value is `{"@id": "#something"}` is resolved via `idIndex` before reading. This handles Shopify's common pattern of separating `AggregateRating` from the `ProductGroup`.

#### Key Functions in `content-script.js`

- `extractStructuredData()` - Main entry point
- `categorizeSchemas()` - Processes JSON-LD into schema objects (handles `@id` index, ProductGroup, hasVariant GTIN, nested ImageObject)
- `categorizeMicrodataSchemas()` - Processes microdata into schema objects (assembles standalone ListItem breadcrumbs)
- `extractBrandName()` - Extracts brand/org name from various formats (string, object, array)
- `extractImageUrl()` - Extracts image URL from various formats
- `isCanonicalForCurrentUrl()` - Detects valid parent canonical URLs (e.g. Shopify collection→product)

#### Brand/Manufacturer Handling

The `extractBrandName()` helper handles all common schema formats:
- String: `"Baldwin"`
- Object: `{"@type": "Brand", "name": "Baldwin"}`
- Array of objects: `[{"@type": "Brand", "name": "Baldwin"}]`
- Array of strings: `["Baldwin"]`

This is necessary because different sites implement brand/manufacturer in different ways.

### Description Extraction

**Important:** Like structured data, description extraction logic is inlined in `content-script.js`. The `extractors/content-quality.js` file exists but is **not used** at runtime.

The `analyzeDescription()` function uses a two-tier approach:

1. **CSS Selectors** (tried in order):
   - Standard: `.product-description`, `.description`, `#description`, `[data-component="description"]`
   - Shopify: `.product-single__description`, `.product__description`, `.rte`, `.rte-formatter`
   - Additional: `.product__info-description`, `.product-single__content`, `#tab-description`, `.accordion__content`
   - Attribute fallbacks: `[class*="product-description"]`, `[id*="ProductDescription"]`

2. **JSON-LD Fallback**: If no DOM element found (or text < 50 chars), extracts description from Product schema via `extractDescriptionFromSchema()`

The returned object includes a `source` field (`'dom'` or `'schema'`) indicating where the description was found. This ensures description analysis works even on sites with dynamic rendering or non-standard CSS classes (common with Shopify themes).

### Schema Fallback System

Many content quality factors use a two-tier extraction approach: DOM-based extraction first, then schema fallback. This reduces false negatives when CSS selectors fail.

| Factor | DOM Extraction | Schema Fallback |
|--------|---------------|-----------------|
| FAQ | CSS selectors (`.faq`, `#faq`, etc.) | FAQPage schema via `extractFaqFromSchema()` |
| Certifications | Regex patterns with negative checks | Product.certification, additionalProperty |
| Awards | Regex patterns | Product.award, additionalProperty |
| Product Details | Regex patterns capturing matched text | Product.width/height/depth/material/warranty, additionalProperty |

#### Context-Aware Regex Extraction

Certification and warranty extraction uses negative pattern matching to avoid false positives:
- "FDA Approved" won't match "Not FDA approved" or "pending FDA approval"
- "warranty" won't match "no warranty" or "void the warranty"

All regex extractors capture the actual matched text for display in factor details (e.g., "12-month warranty" instead of just "Warranty found").

#### Product Detail Regex Patterns — Known Pitfalls

`extractProductDetails()` runs against `document.body.innerText`, which on Windows or mixed-platform servers may contain `\r\n` line endings. All character classes that anchor to line endings use `[^.\r\n]` (not `[^.\n]`) to prevent cross-line captures.

Other guard rails:
- `size[:\s]+` dimension pattern was removed — "size" is too generic (matches size charts, dropdowns).
- Material patterns require at least 10 characters after the keyword to filter single-word false positives.
- `customerCount` regex requires ≥3 digits and uses `[ \t]*` (not `\s*`) to prevent cross-line matches between part numbers and "customers" text.
- `hasHowTo` excludes "how to measure/size/fit/order/buy/care/return/shop/checkout/wash/clean" to avoid false positives from size guides.

#### Certifications Supported

DOM regex patterns (with negative-context guards) cover:
FDA, CE, UL, Energy Star, ISO, USDA Organic, Non-GMO, Fair Trade, Cruelty Free, Vegan, Gluten Free, Kosher, Halal, FSC, GOTS, OEKO-TEX, B Corp, ETL, RoHS, FCC, **NFPA, ASTM, OSHA, ANSI, CSA, FMVSS, EN ISO**

Schema fallback also checks `Product.certification` and `additionalProperty` arrays.

#### Canonical URL Handling

`extractMetaTags()` computes two flags on the `canonical` object:
- `matchesCurrentUrl` — exact normalised match
- `isProductCanonical` — `isCanonicalForCurrentUrl()` returns `true` when the current path ends with the canonical path (covers Shopify `/collections/X/products/Y` → `/products/Y`)

`scoreProtocolMeta()` treats both flags as passing (`canonicalIsValid = matchesCurrentUrl || isProductCanonical`) so legitimate Shopify canonical redirects don't generate false warnings.

#### Features Extractor — Navigation Guard

`extractFeaturesFromContainer()` skips any container (and its `<li>` children) that is inside `nav`, `header`, `footer`, or `[role="navigation"]`. Without this guard, Shopify header menus were being captured as feature bullet points.

### Extraction Source Tracking

Most extractors return a `source` field indicating where data came from:
- `'dom'` - Found via CSS selectors or DOM traversal
- `'schema'` - Found in JSON-LD or microdata
- `'product-nested'` - Found nested within Product/ProductGroup schema (e.g., brand, manufacturer, image)
- `'microdata'` - Found via microdata item parsing

This helps with debugging and provides transparency in the scoring UI.

### Critical Detection
These issues have outsized impact and are flagged prominently:
- `og:image` in WebP format (invisible in most LLM chat interfaces)
- Missing Product schema (LLMs can't identify page as product)
- `robots` meta with `noindex` (blocks LLM crawlers entirely)
- All major AI crawlers blocked in robots.txt (blocks AI discovery)

### AI Discoverability Category

The AI Discoverability category (20% weight) evaluates whether AI systems (ChatGPT, Perplexity, Claude, Gemini) can discover and cite product content.

**Factor Weights:**
| Factor | Points | Description |
|--------|--------|-------------|
| AI Crawler Access | 30 | robots.txt rules for major AI bots |
| Entity Consistency | 25 | Product name alignment across schema, H1, og:title, meta description |
| Answer-Format Content | 20 | "Best for" statements, comparison, how-to, use case content |
| Product Identifiers | 15 | GTIN/UPC/MPN presence in Product schema |
| llms.txt Presence | 10 | /llms.txt and /llms-full.txt files |

**AI Crawlers Monitored:**
- OpenAI: `GPTBot`, `ChatGPT-User`, `OAI-SearchBot`
- Anthropic: `ClaudeBot`, `Claude-Web`, `Anthropic-AI`
- Perplexity: `PerplexityBot`
- Google: `Google-Extended`
- Apple: `Applebot-Extended`
- Training: `CCBot` (Common Crawl)

**Network Fetches (via service-worker.js):**
- `FETCH_ROBOTS_TXT` - Parses robots.txt for AI crawler rules
- `FETCH_LLMS_TXT` - Checks for /llms.txt and /llms-full.txt

### Content Quality Scoring — Notes

`scoreContentQuality(data, aiSignals = null)` accepts a second argument — the `aiDiscoverability` extraction object. This is needed to score:
- **Comparison Content** (5 pts, contextual) — reads `aiSignals.answerFormat.hasComparison`; context multiplier applies (0.6× want, 1.4× need)
- **Specification Detail** (5 pts, contextual) — reads `specs.items` to compute the fraction with `hasUnit`; ≥30% = pass, >0% = warning

`calculateScore()` passes `extractedData.aiDiscoverability` automatically — no change needed at the call site.

### JS-Rendered Page Warning

When `contentStructure.jsDependency.dependencyLevel === 'high'` (React/Vue SPA), `calculateScore()` sets `jsDependent: true` on the result object. `sidepanel.js` toggles the `#jsDependencyWarning` banner visible so merchants know scores may be understated for dynamically-rendered pages.

### Duplicate Recommendation Guard

`checkContentQualityIssues()` only emits `faq-content-missing` when `faq.count > 0 && faq.count < 3`. When `faq.count === 0`, `checkStructuredDataIssues()` already emits `faq-schema-and-content-missing`, which covers the same issue — emitting both would show duplicate recommendations.

### Inline Factor Recommendations
Factors in the side panel have expandable recommendation tips:
- `FACTOR_RECOMMENDATIONS` in `weights.js` maps factor display names to template IDs
- `RECOMMENDATION_TEMPLATES` in `recommendation-rules.js` contains the tip content
- Click the ▶ arrow on any mapped factor to see actionable advice
- Tips include a description and implementation guidance

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `manifest.json` | Extension permissions, content script config |
| `src/content/content-script.js` | Orchestrates all data extraction |
| `src/scoring/weights.js` | All scoring weights, multipliers, and factor-to-recommendation mappings |
| `src/scoring/scoring-engine.js` | Score calculation logic |
| `src/recommendations/recommendation-rules.js` | Fix suggestions per issue |
| `src/sidepanel/sidepanel.js` | UI state management and rendering |

## Common Tasks

### Adding a New Factor
1. Add extraction logic in `src/content/content-script.js`:
   - For structured data: edit `categorizeSchemas()` (JSON-LD) and `categorizeMicrodataSchemas()` (microdata)
   - For content quality: edit relevant `extract*()` functions
   - For AI discoverability: edit `extractAIDiscoverabilitySignals()` or add service worker handlers
2. Add factor weight in `src/scoring/weights.js` → `FACTOR_WEIGHTS`
3. Add scoring logic in `src/scoring/scoring-engine.js` → appropriate `score*()` method
4. If context-sensitive, add multipliers in `CONTEXT_MULTIPLIERS`
5. Add recommendation rule in `src/recommendations/recommendation-rules.js`
6. Add factor-to-recommendation mapping in `src/scoring/weights.js` → `FACTOR_RECOMMENDATIONS`

### Adding a New Category
1. Add category description in `src/scoring/weights.js` → `CATEGORY_DESCRIPTIONS`
2. Add category weight in `CATEGORY_WEIGHTS` (must sum to 1.0 - rebalance existing)
3. Add factor weights in `FACTOR_WEIGHTS.newCategory`
4. Add `scoreNewCategory()` method in `src/scoring/scoring-engine.js`
5. Update `calculateScore()` to include new category in `categoryScores` and weighted total
6. Add extraction function in `src/content/content-script.js` and include in `performFullExtraction()`
7. Add category to `categoryOrder` array in `src/sidepanel/sidepanel.js` → `renderCategories()`
8. Add recommendation templates in `src/recommendations/recommendation-rules.js`
9. Add factor-to-recommendation mappings in `FACTOR_RECOMMENDATIONS`
10. Update this documentation file

### Modifying Scoring Weights
Edit `src/scoring/weights.js`:
- `CATEGORY_WEIGHTS` - must sum to 1.0
- `FACTOR_WEIGHTS` - relative weights within each category
- `CONTEXT_MULTIPLIERS` - per-context adjustments
- `FACTOR_RECOMMENDATIONS` - maps factor names to recommendation template IDs

### Updating UI
- Markup: `src/sidepanel/sidepanel.html`
- Styles: `src/sidepanel/sidepanel.css`
- Logic: `src/sidepanel/sidepanel.js`

### Icons
All icons are inline SVGs — no emoji. Do not revert to emoji.

**Context selector icons** (`.context-icon`, 40×40 px) — two fixed colours each: a background disc and a foreground shape.
| Button | Shape | Fill | Background |
|--------|-------|------|------------|
| Want | Heart | `#db2777` | `#fce7f3` |
| Need | Lightning bolt | `#1d4ed8` | `#dbeafe` |
| Hybrid | Yin-yang | `#7c3aed` | `#ede9fe` |

**Bottom nav icons** (`.nav-icon`, 20×20 px) — use `currentColor` so they inherit active/inactive colour from `.nav-btn` CSS automatically. Secondary elements use `opacity="0.35"` on the same `currentColor`.
| Button | Shape | Primary element | Secondary element |
|--------|-------|-----------------|-------------------|
| Results | Bar chart | Tall centre bar | Flanking bars (35%) |
| History | Clock | Hands | Face ring (35%) |

## Performance & Security Patterns

### JSON-LD Caching
The content script uses a caching system to avoid parsing JSON-LD multiple times:
- `getParsedJsonLd()` - Lazily parses all JSON-LD scripts once and caches the result
- `iterateSchemaItems(typeFilter)` - Generator that yields schema items from cached data
- `clearJsonLdCache()` - Called at start/end of `performFullExtraction()` to ensure fresh data

### XSS Prevention
User-controlled data (page titles, domains from analyzed pages) is escaped before rendering:
- `escapeHtml()` helper in sidepanel.js for innerHTML contexts
- Schema descriptions use textarea trick for safe HTML entity decoding (doesn't execute scripts)

### Race Condition Prevention
The side panel uses request IDs to prevent stale data from being processed:
- Each analysis gets a unique `requestId`
- Content script echoes the requestId back in `EXTRACTION_COMPLETE`
- Side panel ignores responses that don't match `currentRequestId`
- Timeouts are cleared when valid responses arrive

### Event Delegation
Category list uses event delegation instead of individual listeners:
- Single click handler on `#categoryList` container
- Handles both category header expansion and factor recommendation toggles
- Prevents memory leaks from re-rendering

### Storage Quota Management
Storage manager monitors Chrome's 10MB quota:
- `pruneIfNearQuota()` - Auto-prunes oldest 20% when storage reaches 80% capacity
- `getStorageStats()` - Returns quota usage percentage
- History entries store only essential data (scores, not full factor details)

### URL Validation
Network fetch functions validate inputs before processing:
- `fetchRobotsTxt()`, `fetchLlmsTxt()`, `verifyImageFormat()`
- Return graceful error objects for invalid/missing URLs instead of throwing
