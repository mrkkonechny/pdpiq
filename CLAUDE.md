# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working with code in this repository.

## Project Overview

pdpIQ (Product Description Page IQ) is a Chrome extension by **Tribbute** that analyzes eCommerce Product Detail Pages (PDPs) for AI citation readiness. It scores pages across 56 factors in 6 categories and provides actionable recommendations.

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (ES modules)
- Chrome Side Panel API for UI
- Chrome Storage API for history persistence
- No build tools or bundlers required

## Project Structure

```
pdpiq/
├── manifest.json                 # Extension configuration (includes CSP)
├── PRIVACY.md                    # Privacy policy (all-local processing)
├── icons/
│   ├── icon16.png               # Toolbar icon (IQ lettermark, indigo)
│   ├── icon48.png               # Extensions page icon
│   ├── icon128.png              # Chrome Web Store icon
│   └── tribbute-logo.png        # Header branding (side panel only)
├── src/
│   ├── background/
│   │   └── service-worker.js    # Message routing, sender validation, URL guards, image verification, AI discoverability fetches
│   ├── content/
│   │   └── content-script.js    # Main extraction orchestrator (all extraction logic is inline)
│   ├── scoring/
│   │   ├── scoring-engine.js    # Core scoring calculations
│   │   ├── weights.js           # Category/factor/context weights, factor-to-recommendation mappings
│   │   └── grading.js           # Grade color/background helpers, re-exports getGrade/getGradeDescription
│   ├── recommendations/
│   │   ├── recommendation-engine.js  # Prioritization logic
│   │   └── recommendation-rules.js   # Issue-to-fix mappings, recommendation templates
│   ├── sidepanel/
│   │   ├── sidepanel.html       # UI markup
│   │   ├── sidepanel.css        # Styling (CSS variables for grade colours)
│   │   ├── sidepanel.js         # UI controller (results, history, comparison, export)
│   │   └── report-template.js   # Self-contained HTML report generator (base64-embedded logo)
│   └── storage/
│       └── storage-manager.js   # Analysis history persistence, quota management
├── docs/
│   └── pdpiq-product-page-handoff.md  # Marketing handoff document for tribbute.com
└── styles/                      # Additional stylesheets
```

**Note:** The `src/content/extractors/` directory was deleted. All extraction logic lives inline in `content-script.js`.

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
- Production builds use `const DEBUG = false;` — set to `true` for verbose logging

## Architecture

### Message Flow
1. User clicks extension icon → opens side panel
2. User selects context (Want/Need/Hybrid)
3. Side panel sends `ANALYZE_PAGE` message to service worker
4. Service worker validates sender, injects/messages content script
5. Content script runs extractors, returns raw data
6. Service worker verifies image formats (HTTP HEAD requests)
7. Side panel receives data, runs scoring engine
8. Results displayed with recommendations
9. Analysis auto-saved to history

### Features

**Core Analysis:**
- Scores 56 factors across 6 categories with letter grades (A-F)
- Context-sensitive scoring (Want/Need/Hybrid purchase types)
- Actionable recommendations with inline expandable tips per factor (all 56 factors mapped)
- Apparel category detection — warranty/compatibility/dimensions auto-marked N/A for fashion products

**History & Comparison:**
- Analysis history saved to `chrome.storage.local` (up to 20 shown)
- Side-by-side comparison of any 2 saved analyses
- Bottom nav tabs switch between Results and History views

**Export:**
- **Download Report** — Self-contained HTML report via `report-template.js` (Tribbute-branded, base64-embedded logo, all CSS inline). Includes executive summary, grade legend, context explanation, priority-grouped recommendations with effort badges, pass/fail counts per category, and unique report ID.
- **Download Analysis Data** — Raw JSON export of scores and extraction data

**UI:**
- Version badge in footer (reads from `chrome.runtime.getManifest().version`)
- JS-rendered page warning banner when SPA detected
- UTM-tracked links to tribbute.com in header logo, footer, and report

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

**Important:** All extraction logic is inline in `content-script.js`. The `extractors/` directory was deleted. When modifying extraction logic, edit `content-script.js` directly.

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

- **`categorizeSchemas()`** and **`extractBrandSignals()`** both treat `type === 'productgroup'` identically to `type === 'product'` (case-insensitive matching). `extractBrandSignals()` also checks standalone Organization/Brand schemas as a fallback source for brand name.
- **GTIN/MPN** may not be present on the `ProductGroup` itself — they live on individual `hasVariant[]` items. The extractor loops `hasVariant` and picks the first non-null value.
- **`aggregateRating`** is often an `@id` reference (`"aggregateRating": {"@id": "#reviews"}`) pointing to a standalone `AggregateRating` node elsewhere in the same `@graph`. Both `categorizeSchemas()` and `extractReviewSignals()` build an `idIndex` keyed by `@id` and resolve these references before reading `ratingValue`. `extractReviewSignals()` uses two-pass extraction: Product/ProductGroup ratings first (highest confidence), then standalone AggregateRating as fallback.
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
- `getProductContentText()` - Scoped text extraction for body-text analysis (excludes nav/header/footer/promo elements)
- `extractHreflang()` - Extracts `<link rel="alternate" hreflang="...">` tags for bilingual sites

#### Brand/Manufacturer Handling

The `extractBrandName()` helper handles all common schema formats:
- String: `"Baldwin"`
- Object: `{"@type": "Brand", "name": "Baldwin"}`
- Array of objects: `[{"@type": "Brand", "name": "Baldwin"}]`
- Array of strings: `["Baldwin"]`

This is necessary because different sites implement brand/manufacturer in different ways.

### Description Extraction

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

`extractProductDetails()` runs against scoped product content text from `getProductContentText()` (not `document.body.innerText`). This prevents false positives from nav menus, footer links, loyalty programs, and promotional banners. On Windows or mixed-platform servers, content may contain `\r\n` line endings. All character classes that anchor to line endings use `[^.\r\n]` (not `[^.\n]`) to prevent cross-line captures.

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

#### Features Extractor — Navigation Guard & Retailer Selectors

`extractFeaturesFromContainer()` skips any container (and its `<li>` children) that is inside `nav`, `header`, `footer`, or `[role="navigation"]`. Without this guard, Shopify header menus were being captured as feature bullet points.

Feature extraction includes retailer-specific selectors for major platforms:
- **Walmart**: `.about-product`, `.about-item`, `.product-about`, `[data-testid="product-about"]`
- **Canadian Tire**: `.product-highlights`, `.pdp-highlights`
- **Heading fallback**: matches "about this" in addition to "feature", "benefit", "highlight", "why choose"

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
- Meta: `Meta-ExternalAgent`
- ByteDance: `Bytespider`
- Cohere: `cohere-ai`
- You.com: `YouBot`
- Amazon: `Amazonbot`
- Training: `CCBot` (Common Crawl)

**Network Fetches (via service-worker.js):**
- `FETCH_ROBOTS_TXT` - Parses robots.txt for AI crawler rules
- `FETCH_LLMS_TXT` - Checks for /llms.txt and /llms-full.txt
- `VERIFY_IMAGE_FORMAT` - HTTP HEAD to check og:image Content-Type
- `FETCH_LAST_MODIFIED` - HTTP HEAD for Last-Modified header

### Content Quality Scoring — Notes

`scoreContentQuality(data, aiSignals, extractedData)` accepts three arguments: content quality data, `aiDiscoverability` signals, and full extracted data (for apparel category detection). Key behaviours:
- **Comparison Content** (10 pts, contextual) — reads `aiSignals.answerFormat.hasComparison`; context multiplier applies (0.6× want, 1.4× need)
- **Specification Detail** (5 pts, contextual) — reads `specs.items` to compute the fraction with `hasUnit`; ≥30% = pass, >0% = warning
- **Apparel Detection** — `ScoringEngine.isLikelyApparel(extractedData)` checks breadcrumbs, schema category, and URL path for fashion/apparel keywords (English + French). When detected, warranty, compatibility, and dimensions score as "pass" with "N/A for apparel" details, preventing unfair penalties on fashion product pages.

`calculateScore()` passes `extractedData.aiDiscoverability` and `extractedData` automatically.

### og:type Handling

`scoreProtocolMeta()` accepts `og:type` values of `'product'`, `'og:product'`, or any value starting with `'product.'` (e.g., `'product.item'`, `'product.group'`). This covers Open Graph product subtypes used by platforms like Shopify.

### Readability Scoring

`analyzeTextMetrics()` uses a simplified Flesch Reading Ease algorithm:
- Filters out spec-like tokens (e.g., "250W", "IP67") before word counting
- Counts syllables via vowel cluster matching
- Returns neutral score (50) when text is too short (<20 prose words)
- Requires >5 chars per sentence fragment to avoid counting specs as sentences

### Review Count Thresholds

Review count status thresholds:
- **Pass**: ≥25 reviews
- **Warning**: 5–24 reviews
- **Fail**: <5 reviews

### JS-Rendered Page Warning

When `contentStructure.jsDependency.dependencyLevel === 'high'` (React/Vue SPA), `calculateScore()` sets `jsDependent: true` on the result object. `sidepanel.js` toggles the `#jsDependencyWarning` banner visible so merchants know scores may be understated for dynamically-rendered pages.

### Duplicate Recommendation Guard

`checkContentQualityIssues()` only emits `faq-content-missing` when `faq.count > 0 && faq.count < 3`. When `faq.count === 0`, `checkStructuredDataIssues()` already emits `faq-schema-and-content-missing`, which covers the same issue — emitting both would show duplicate recommendations.

### Inline Factor Recommendations
Factors in the side panel have expandable recommendation tips:
- `FACTOR_RECOMMENDATIONS` in `weights.js` maps all 56 factor display names to template IDs
- `RECOMMENDATION_TEMPLATES` in `recommendation-rules.js` contains 58 templates (some factors share templates)
- Click the ▶ arrow on any factor to see actionable advice
- Tips include a description and implementation guidance

### Recommendation Engine Coverage

`recommendation-engine.js` generates recommendations for all failing factors across all 6 categories. Key features:
- Uses `createRecommendation(templateId)` to pull from `RECOMMENDATION_TEMPLATES`
- Context-aware: adjusts impact level based on `CONTEXT_MULTIPLIERS` (e.g., compatibility is "high" in Need context)
- Apparel-aware: skips warranty/compatibility/dimensions recommendations for fashion products
- Report groups recommendations into **Quick Wins** (high/medium impact + low effort), **Medium Priority**, and **Nice to Have**

### Hreflang Extraction

`extractMetaTags()` includes `hreflang` data from `<link rel="alternate" hreflang="...">` tags. The `extractHreflang()` helper returns:
- `present` — boolean indicating if any hreflang tags exist
- `languages` — array of `{ lang, href }` objects (e.g., `{ lang: 'en-CA', href: '...' }`)
- `count` — number of hreflang tags found

This is informational context for bilingual sites (common with Canadian retailers).

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `manifest.json` | Extension permissions, CSP, content script config |
| `src/content/content-script.js` | Orchestrates all data extraction (inline) |
| `src/scoring/weights.js` | All scoring weights, multipliers, and factor-to-recommendation mappings |
| `src/scoring/scoring-engine.js` | Score calculation logic |
| `src/scoring/grading.js` | `getGradeColor()`, `getGradeBackgroundColor()`, re-exports `getGrade`/`getGradeDescription` |
| `src/recommendations/recommendation-rules.js` | Fix suggestions per issue, recommendation templates |
| `src/sidepanel/sidepanel.js` | UI state management, rendering, history, comparison, export |
| `src/sidepanel/report-template.js` | HTML report generation with executive summary, priority-grouped recs, embedded branding |
| `src/background/service-worker.js` | Message routing, sender validation, URL safety, network fetches |
| `src/storage/storage-manager.js` | History CRUD, quota pruning |

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
- Report: `src/sidepanel/report-template.js`

### Icons
All icons are inline SVGs — no emoji. Do not revert to emoji.

**Extension icons** (`icons/icon*.png`) — "IQ" lettermark on solid indigo `#4f46e5` rounded rectangle, white text. Generated via Pillow with 4x supersampling and Lanczos downscale.

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

### Branding & UTM Links
- Header: pdpIQ wordmark + Tribbute logo linking to `tribbute.com/products/pdpiq/`
- Footer: version badge + "by Tribbute" link
- Report: Tribbute logo (base64-embedded PNG with bottom padding for rendering safety)
- All external links include UTM parameters: `utm_source=pdpiq`, `utm_medium=extension|report`, `utm_content=header_logo|footer_link`

## Performance & Security Patterns

### Content Security Policy
`manifest.json` includes `content_security_policy.extension_pages`: `script-src 'self'; object-src 'self';`

### Message Sender Validation
The service worker's `onMessage` listener validates `sender.id === chrome.runtime.id` before processing any message. This prevents other extensions or web pages from injecting messages.

### URL Safety Guards
`isSafeUrl(url)` in `service-worker.js` validates URLs before any network fetch:
- Must start with `http:` or `https:`
- Blocks `localhost`, `127.0.0.1`, `0.0.0.0`, `file:` protocol
- Used by `verifyImageFormat()`, `fetchRobotsTxt()`, `fetchLlmsTxt()`, `fetchLastModified()`

### Safe URL Parsing
`storage-manager.js` wraps `new URL()` in try-catch, falling back to `'unknown'` domain for malformed URLs.

### DEBUG Flag
All files use `const DEBUG = false;` at top. `console.log()` calls are gated behind `if (DEBUG)`. `console.error()` and `console.warn()` are kept unconditionally for legitimate error reporting.

### XSS Prevention
User-controlled data (page titles, domains from analyzed pages) is escaped before rendering:
- `escapeHtml()` helper in sidepanel.js for innerHTML contexts
- `esc()` helper in report-template.js for report HTML contexts
- Schema descriptions use textarea trick for safe HTML entity decoding (doesn't execute scripts)

### JSON-LD Caching
The content script uses a caching system to avoid parsing JSON-LD multiple times:
- `getParsedJsonLd()` - Lazily parses all JSON-LD scripts once and caches the result
- `iterateSchemaItems(typeFilter)` - Generator that yields schema items from cached data
- `clearJsonLdCache()` - Called at start/end of `performFullExtraction()` to ensure fresh data

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
