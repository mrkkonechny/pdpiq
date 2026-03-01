# Technical Architecture

> **PDS Document 02** | Last Updated: 2026-03-01

---

## 1. System Overview

pdpIQ is a Chrome browser extension built on Manifest V3 that runs entirely client-side with no backend server. The architecture follows Chrome's three-context model: a **content script** injected into every web page performs DOM extraction, a **service worker** handles message routing and network requests that content scripts cannot make (robots.txt, image HEAD checks, llms.txt), and a **side panel** hosts the UI, scoring engine, and recommendation engine. All computation — extraction, scoring, recommendation generation, and report rendering — happens in the browser. The only network requests are to the site being analyzed (never to Tribbute or third-party servers).

Data flows in one direction: content script extracts raw signals from the page DOM, service worker enriches with network-fetched data, side panel scores and renders results. Analysis history is persisted to `chrome.storage.local` (10MB quota). There is no database, no API server, and no build pipeline — the extension loads directly from source files using ES module imports supported natively by Manifest V3.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Chrome Browser                                                     │
│                                                                     │
│  ┌──────────────────────┐    messages     ┌──────────────────────┐  │
│  │  Content Script       │◄──────────────►│  Service Worker       │  │
│  │  (content-script.js)  │                │  (service-worker.js)  │  │
│  │                       │                │                       │  │
│  │  • JSON-LD parsing    │                │  • Message routing     │  │
│  │  • Microdata parsing  │                │  • Sender validation   │  │
│  │  • Meta tag extraction│                │  • og:image HEAD req   │  │
│  │  • Content analysis   │                │  • robots.txt GET      │  │
│  │  • Trust signals      │                │  • llms.txt HEAD       │  │
│  │  • Structure analysis │                │  • Last-Modified HEAD  │  │
│  │  • AI discoverability │                │  • URL safety guards   │  │
│  └──────────┬───────────┘                └──────────┬───────────┘  │
│             │                                       │               │
│             │         EXTRACTION_COMPLETE            │               │
│             └──────────────┐  ┌─────────────────────┘               │
│                            ▼  ▼                                     │
│              ┌──────────────────────────┐                           │
│              │  Side Panel               │                           │
│              │  (sidepanel.js)            │                           │
│              │                           │                           │
│              │  ┌─────────────────────┐  │                           │
│              │  │  ScoringEngine      │  │                           │
│              │  │  • 6 score*() methods│  │                           │
│              │  │  • Context multiplie│  │                           │
│              │  │  • Apparel detection│  │                           │
│              │  └─────────────────────┘  │                           │
│              │  ┌─────────────────────┐  │                           │
│              │  │  RecommendationEngine│  │                           │
│              │  │  • 6 check*() methods│  │                           │
│              │  │  • Priority matrix  │  │                           │
│              │  │  • 44+ templates    │  │                           │
│              │  └─────────────────────┘  │                           │
│              │  ┌─────────────────────┐  │                           │
│              │  │  StorageManager     │  │     ┌──────────────────┐ │
│              │  │  • Save/load history│  │────►│ chrome.storage   │ │
│              │  │  • Quota pruning    │  │     │ .local (10MB)    │ │
│              │  └─────────────────────┘  │     └──────────────────┘ │
│              │  ┌─────────────────────┐  │                           │
│              │  │  Report Template    │  │────► HTML/JSON download   │
│              │  └─────────────────────┘  │                           │
│              └──────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. Technology Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Platform | Chrome Extension (Manifest V3) | MV3 | Current Chrome extension standard; required for Chrome Web Store submission; supports ES modules natively |
| Language | Vanilla JavaScript (ES modules) | ES2020+ | Zero build step; no transpilation needed; native `import`/`export` supported by MV3 service workers and extension pages |
| UI Framework | None (DOM APIs + CSS) | — | Extension side panel is a small, focused UI; a framework would add unnecessary bundle size and complexity |
| Module System | ES modules (`type: "module"` in manifest) | — | Native browser support; no bundler required; clean dependency graph between scoring, recommendation, and storage modules |
| Storage | `chrome.storage.local` | — | Built into Chrome; 10MB quota sufficient for 2,500+ compact analysis entries; persists across sessions; no server needed |
| UI Surface | Chrome Side Panel API | Chrome 114+ | Purpose-built for tool-beside-page UX; doesn't obscure the analyzed page; persists across navigation |
| Styling | CSS with CSS custom properties | CSS3 | Variables for grade colors enable consistent theming across side panel and reports; no preprocessor needed |
| Report Generation | Inline HTML template (`report-template.js`) | — | Self-contained HTML files with base64-embedded assets; no external dependencies at render time |

**Alternatives Considered and Rejected:**

| Alternative | Why Rejected |
|------------|-------------|
| React/Vue for side panel UI | Adds 30-100KB+ to extension size; requires build step; side panel UI is simple enough (one SPA class, ~800 lines) that DOM APIs suffice |
| Webpack/Vite bundler | MV3 supports ES modules natively; no transformation needed; adding a bundler would complicate development for zero benefit |
| IndexedDB for storage | More complex API; `chrome.storage.local` is simpler, provides quota management via `getBytesInUse()`, and is purpose-built for extensions |
| Popup window instead of side panel | Popup closes when user clicks elsewhere; side panel persists alongside the page, enabling iterative analysis |
| Backend API server | Violates privacy-first principle; adds hosting cost, latency, and auth complexity; all analysis logic can run client-side |
| TypeScript | Would require build step; codebase is small enough (~3,000 lines across all modules) that type safety via JSDoc comments is sufficient |

## 3. Data Architecture

### 3.1 Data Model

pdpIQ has two data shapes: the **full extraction result** (in-memory only, never persisted) and the **compact history entry** (persisted to `chrome.storage.local`).

**Full Extraction Result** (in-memory, ~200-500KB per analysis):

```
extractedData
├── structuredData
│   ├── jsonLd[]                              # Raw parsed JSON-LD blocks
│   ├── microdata[]                           # Raw parsed microdata items
│   └── schemas
│       ├── product                           # Product or ProductGroup schema
│       ├── offer                             # Offer schema (nested or standalone)
│       ├── aggregateRating                   # AggregateRating (with @id resolution)
│       ├── reviews[]                         # Review schemas
│       ├── faq                               # FAQPage schema
│       ├── breadcrumb                        # BreadcrumbList schema
│       ├── organization                      # Organization schema
│       ├── brand                             # Brand schema
│       └── images[]                          # ImageObject schemas
├── metaTags
│   ├── openGraph {image, title, description, type, url}
│   ├── twitterCards {card, title, description, image}
│   ├── canonical {url, present, matchesCurrentUrl, isProductCanonical}
│   ├── standard {description}
│   ├── robots {isBlocked, directiveText}
│   └── hreflang {present, languages[], count}
├── contentQuality
│   ├── description {text, wordCount, source, qualityScore}
│   ├── specifications {count, items[{name, value, hasUnit}], source}
│   ├── features {count, items[{text, source}]}
│   ├── faq {count, items[{q, a}], source}
│   ├── productDetails {hasDimensions, hasWarranty, hasCompatibility,
│   │                    hasMaterials, hasCareInstructions, ...}
│   └── textMetrics {readability, sentenceCount, avgSentenceLength}
├── contentStructure
│   ├── headings {hasH1, h1{count, text}, hierarchyIssues[]}
│   ├── semanticHTML {hasMain, hasArticle, hasSection, ...}
│   ├── images {totalCount, primaryImage{url, alt, hasAlt}, altCoverage}
│   └── jsDependency {dependencyLevel, framework}
├── trustSignals
│   ├── reviews {hasReviews, count, averageRating, recency{...}}
│   ├── brand {name, clarity, inH1, inTitle}
│   ├── certifications {found, items[]}
│   └── awards {found, items[]}
├── aiDiscoverability
│   ├── entityConsistency {schemaName, h1Name, ogTitle, pageTitle,
│   │                       metaDescription, allMatch}
│   ├── answerFormat {hasComparison, hasBestFor, hasHowTo, hasUseCase}
│   └── productIdentifiers {gtin, upc, mpn}
├── pageInfo {url, title, domain, pathname, extractedAt}
└── extractionTime                            # ms
```

**Compact History Entry** (persisted, ~2-4KB per entry):

```
historyEntry
├── id (STRING)                               # Timestamp-based: Date.now().toString()
├── url (STRING)                              # Full page URL
├── title (STRING)                            # Page title
├── domain (STRING)                           # Hostname extracted via new URL()
├── score (INTEGER)                           # Overall 0-100, rounded
├── grade (STRING)                            # Letter grade A-F
├── context (STRING)                          # "want" | "need" | "hybrid"
├── timestamp (INTEGER)                       # Unix ms
├── categoryScores (OBJECT)
│   └── [categoryKey] {score: INTEGER, name: STRING}   # 6 entries
├── recommendationCount (INTEGER)             # Total recommendation count
└── criticalIssues (INTEGER)                  # Count of impact=high recommendations
```

### 3.2 Data Flow

```
User clicks extension icon
  │
  ▼
Side panel opens, shows context selector (Want / Need / Hybrid)
  │
  ▼
User selects context → SidePanelApp.startAnalysis(context)
  │
  ├─► Generates unique requestId (timestamp + random string)
  ├─► Sets 10-second timeout for stale request detection
  │
  ▼
chrome.tabs.sendMessage(tab.id, {type: 'EXTRACT_DATA', requestId})
  │
  ▼
Content Script receives EXTRACT_DATA
  │
  ├─► clearJsonLdCache() — ensures fresh data
  ├─► performFullExtraction()
  │     ├─► extractStructuredData()
  │     │     ├─► getParsedJsonLd() — parse all <script type="application/ld+json">
  │     │     ├─► categorizeSchemas() — build @id index, resolve references,
  │     │     │     classify into Product/Offer/Rating/Review/FAQ/Breadcrumb/Org/Image
  │     │     └─► categorizeMicrodataSchemas() — parse [itemscope] elements
  │     ├─► extractMetaTags()
  │     │     ├─► Open Graph, Twitter Cards, canonical, robots, meta description
  │     │     └─► extractHreflang()
  │     ├─► extractContentQuality()
  │     │     ├─► analyzeDescription() — CSS selectors → schema fallback
  │     │     ├─► extractSpecifications() — regex + unit detection
  │     │     ├─► extractFeaturesFromContainer() — CSS selectors with nav guard
  │     │     ├─► extractFaq() — CSS selectors → extractFaqFromSchema() fallback
  │     │     ├─► extractProductDetails() — regex with negative-context guards
  │     │     └─► analyzeTextMetrics() — simplified Flesch readability
  │     ├─► extractContentStructure()
  │     │     ├─► Heading analysis (H1 presence, hierarchy validation)
  │     │     ├─► Semantic HTML detection (<main>, <article>, <section>)
  │     │     ├─► Image alt text analysis (primary + coverage)
  │     │     └─► JS dependency detection (React/Vue SPA)
  │     ├─► extractTrustSignals()
  │     │     ├─► extractReviewSignals() — two-pass: Product/ProductGroup → standalone
  │     │     ├─► extractBrandSignals() — Product.brand → Organization fallback
  │     │     ├─► extractCertifications() — 27 regex patterns + schema fallback
  │     │     └─► extractAwards() — regex + schema fallback
  │     └─► extractAIDiscoverabilitySignals()
  │           ├─► Entity consistency (schema name vs H1 vs og:title vs meta desc)
  │           ├─► Answer-format content ("best for", comparison, how-to)
  │           └─► Product identifiers (GTIN/UPC/MPN with Shopify variant fallback)
  │
  ▼
Content Script sends EXTRACTION_COMPLETE with requestId + data
  │
  ▼
Service Worker validates sender.id === chrome.runtime.id
  │
  ├─► Forwards message to side panel via chrome.runtime.sendMessage()
  │
  ▼
Side Panel receives EXTRACTION_COMPLETE
  │
  ├─► Verifies requestId matches currentRequestId (race condition guard)
  ├─► Clears analysis timeout
  │
  ▼
SidePanelApp.processResults()
  │
  ├─► Parallel network enrichment via service worker:
  │     ├─► VERIFY_IMAGE_FORMAT → HEAD request to og:image URL
  │     │     ├─► Content-Type header check (JPEG/PNG/GIF = valid, WebP/AVIF/SVG = invalid)
  │     │     ├─► Magic bytes fallback if Content-Type unavailable
  │     │     └─► URL extension fallback if both fail
  │     ├─► FETCH_ROBOTS_TXT → GET {origin}/robots.txt
  │     │     └─► parseRobotsTxt() — checks 15 AI crawlers against rules
  │     ├─► FETCH_LLMS_TXT → HEAD {origin}/llms.txt + /llms-full.txt
  │     └─► FETCH_LAST_MODIFIED → HEAD page URL for Last-Modified header
  │
  ▼
ScoringEngine.calculateScore(extractedData, imageVerification, aiDiscoverabilityData)
  │
  ├─► scoreStructuredData()    — 8 factors, 100 relative points
  ├─► scoreProtocolMeta()      — 10 factors, 100 relative points
  ├─► scoreContentQuality()    — 12 factors, 100 relative points (context multipliers)
  ├─► scoreContentStructure()  — 11 factors, 100 relative points
  ├─► scoreAuthorityTrust()    — 10 factors, 100 relative points (context multipliers)
  ├─► scoreAIDiscoverability() — 5 factors, 100 relative points
  │
  ├─► Per-category scores weighted by CATEGORY_WEIGHTS (sum = 1.0)
  ├─► Overall score = weighted sum (0-100)
  ├─► Grade = getGrade(score) → A/B/C/D/F
  └─► jsDependent flag set if jsDependency.dependencyLevel === 'high'
  │
  ▼
RecommendationEngine.generateRecommendations()
  │
  ├─► checkProtocolMetaIssues()       — critical: robots, og:image WebP
  ├─► checkStructuredDataIssues()     — schema presence checks
  ├─► checkContentQualityIssues()     — thresholds, context-aware impact
  ├─► checkContentStructureIssues()   — H1, alt text, semantic HTML
  ├─► checkAuthorityTrustIssues()     — reviews, brand, certs
  ├─► checkAIDiscoverabilityIssues()  — crawler access, entity, identifiers
  │
  ├─► Each issue → createRecommendation(templateId) from 44+ templates
  ├─► Priority = PRIORITY_MATRIX[impact][effort] → 1-5 (1 = highest)
  └─► Sort by priority, then impact level
  │
  ▼
SidePanelApp.displayResults()
  │
  ├─► Render grade badge, score, context label, grade description
  ├─► Render 6 expandable category cards with per-factor detail
  ├─► Render top 10 recommendations with impact/effort badges
  ├─► Toggle JS dependency warning banner if applicable
  │
  ▼
saveAnalysis() → chrome.storage.local
  │
  ├─► pruneIfNearQuota() — removes oldest 20% at 80% capacity
  ├─► Compact entry (scores only, no factor details)
  ├─► Unshift to history array (newest first)
  └─► Trim to MAX_HISTORY = 100
```

### 3.3 Data Sources

| Source | Type | Refresh Frequency | Auth Method | Rate Limits |
|--------|------|-------------------|-------------|-------------|
| Active tab DOM | Content script injection | On-demand (user clicks analyze) | `activeTab` permission | None — runs once per analysis |
| `{origin}/robots.txt` | HTTP GET via service worker | On-demand per analysis | None (public file) | None — single request per analysis |
| og:image URL | HTTP HEAD via service worker | On-demand per analysis | None | None — single HEAD request |
| `{origin}/llms.txt` | HTTP HEAD via service worker | On-demand per analysis | None | None — single HEAD per file |
| `{origin}/llms-full.txt` | HTTP HEAD via service worker | On-demand per analysis | None | None — single HEAD per file |
| Page URL | HTTP HEAD via service worker | On-demand per analysis | None | None — single HEAD for Last-Modified |

### 3.4 Data Storage & Retention

- **Where data is stored:** `chrome.storage.local` under the key `analysisHistory`. Data is a JSON array of compact history entries stored on the user's local machine.
- **Retention policy:** Last 100 analyses retained. When storage reaches 80% of 10MB quota, the oldest 20% of entries are auto-pruned via `pruneIfNearQuota()`. Users can manually clear all history via the History tab's "Clear" button.
- **Backup approach:** None. Data exists only on the user's machine. Chrome Sync is not used (`chrome.storage.local`, not `chrome.storage.sync`).
- **Sensitive data handling:** No PII is collected or stored. History entries contain only the analyzed page's public URL, title, domain, scores, and grade. No page content, user information, or authentication tokens are persisted. Full extraction data (which includes page text snippets) exists only in memory during analysis and is discarded after results render.

## 4. External Integrations

| Integration | Purpose | Protocol | Auth | Failure Mode |
|------------|---------|----------|------|-------------|
| Target site robots.txt | Parse AI crawler rules (GPTBot, ClaudeBot, etc.) | HTTP GET | None | Returns empty rules; AI Crawler Access factor scores as "unknown"; analysis continues |
| Target site og:image URL | Detect WebP/AVIF format (invisible in LLM UIs) | HTTP HEAD (Content-Type header) | None | Falls back to magic bytes detection (Range: bytes=0-16 GET), then URL extension check; if all fail, format scored as "unknown" |
| Target site /llms.txt | Check for LLM guidance file presence | HTTP HEAD | None | `found: false`; llms.txt Presence factor scores as fail; analysis continues |
| Target site /llms-full.txt | Check for extended LLM guidance file | HTTP HEAD | None | `found: false`; no separate scoring impact (combined with llms.txt check) |
| Target page URL | Get Last-Modified header for content freshness | HTTP HEAD | None | `lastModified: null`; Content Freshness factor scores as fail; analysis continues |

All network requests pass through `isSafeUrl()` validation which blocks `localhost`, `127.0.0.1`, `0.0.0.0`, `file:` protocol, and non-HTTP(S) URLs.

There are no integrations with Tribbute servers, analytics services, or third-party APIs.

## 5. Architecture Decisions Record (ADR)

### ADR-001: All extraction logic inline in content-script.js
- **Context:** Early development had a `src/content/extractors/` directory with separate extractor modules.
- **Decision:** Consolidated all extraction logic into a single `content-script.js` file (~2,000 lines). The `extractors/` directory was deleted.
- **Rationale:** Content scripts in MV3 cannot use ES module imports. Separate files would require a bundler or message-passing overhead. A single file loads atomically and avoids race conditions between extractor modules.
- **Consequences:** `content-script.js` is the largest file in the codebase. All extraction changes happen in one place, which simplifies debugging but requires careful function organization. JSON-LD caching (`getParsedJsonLd()`, `clearJsonLdCache()`) is critical to avoid re-parsing within the single file.
- **Date:** [FLAG: Date not recorded in code — predates current version]

### ADR-002: Scoring and recommendations run in the side panel, not the service worker
- **Context:** Scoring could run in the service worker (closer to extraction data) or in the side panel (closer to the UI).
- **Decision:** `ScoringEngine` and `RecommendationEngine` are imported as ES modules in `sidepanel.js` and run in the side panel context.
- **Rationale:** Side panel pages support ES module imports natively. Running scoring in the side panel keeps the service worker lightweight (message routing + network only) and avoids serializing the full score result through `chrome.runtime.sendMessage`. The side panel has direct access to the DOM for rendering results.
- **Consequences:** The side panel orchestrates the full pipeline: triggers extraction, receives raw data, calls service worker for network enrichment, scores, generates recommendations, renders, and saves to storage. This creates a clear single-owner model but means the side panel must be open for analysis to run.
- **Date:** [FLAG: Date not recorded in code]

### ADR-003: No build tools or bundler
- **Context:** Modern web development typically uses Webpack, Vite, or similar build tools.
- **Decision:** No build step. Extension loads directly from source files. MV3 service worker declared with `"type": "module"` in `manifest.json`.
- **Rationale:** MV3 natively supports ES modules in service workers and extension pages. The codebase is small (~3,000 lines across all modules, zero npm dependencies). A bundler would add development friction (install, configure, watch, debug source maps) with no compensating benefit.
- **Consequences:** No minification, tree-shaking, or source map generation. Extension size is ~300KB unpacked, which is well within Chrome Web Store limits. Hot reload requires manual extension refresh in `chrome://extensions/`. No TypeScript type checking (JSDoc used instead).
- **Date:** [FLAG: Date not recorded in code]

### ADR-004: Compact history entries (scores only, no factor details)
- **Context:** Full analysis results include per-factor scores, raw extracted text, and recommendation details. Storing all of this would consume ~50-100KB per entry.
- **Decision:** `saveAnalysis()` in `storage-manager.js` stores only: URL, title, domain, overall score/grade, context, timestamp, per-category scores (score + name), recommendation count, and critical issue count. Approximately 2-4KB per entry.
- **Rationale:** `chrome.storage.local` has a 10MB quota. At 50KB per entry, only ~200 analyses could be stored. At 2-4KB, 2,500-5,000 entries fit. The comparison feature only needs category-level scores, not factor details.
- **Consequences:** Users cannot drill into historical factor-level detail — they must re-analyze the page. The JSON export (`exportData()`) includes full current-analysis detail, but this is not available for past analyses retrieved from history.
- **Date:** [FLAG: Date not recorded in code]

### ADR-005: Context-sensitive scoring via multipliers rather than separate scoring models
- **Context:** Different purchase types (emotional vs. functional) emphasize different product page signals. The system needed to produce context-appropriate scores.
- **Decision:** A single `ScoringEngine` with a `CONTEXT_MULTIPLIERS` map that adjusts specific factor weights based on the selected context (Want/Need/Hybrid). Multipliers range from 0.4x to 2.0x.
- **Rationale:** Maintaining three separate scoring models would triple the maintenance surface and introduce inconsistency risk. Multipliers applied to a shared base model are simpler to tune, test, and explain. The Hybrid context uses all 1.0x multipliers, making it the neutral baseline.
- **Consequences:** 10 factors have context sensitivity (e.g., compatibility 0.4x in Want, 2.0x in Need). Adding a new context requires only adding a new multiplier object in `weights.js`. The tradeoff is that some factor scoring logic references context indirectly (via multiplied weights) rather than having context-specific evaluation logic.
- **Date:** [FLAG: Date not recorded in code]

### ADR-006: Request ID system for race condition prevention
- **Context:** Users can trigger a new analysis before the previous one completes. Without a guard, stale extraction results from the first analysis could overwrite the second.
- **Decision:** Each analysis generates a unique `requestId` (timestamp + random string). The content script echoes the `requestId` back in `EXTRACTION_COMPLETE`. The side panel ignores responses where `message.requestId !== this.currentRequestId`.
- **Rationale:** Chrome's message-passing API is asynchronous. Without request correlation, there is no guarantee that a received message corresponds to the current analysis. A 10-second timeout provides an additional guard against orphaned requests.
- **Consequences:** Eliminates data race conditions. Minor overhead of generating and passing an extra string field per analysis. The timeout (10 seconds, defined in `startAnalysis()`) could theoretically fire on very slow pages, but in practice extraction completes in 300-500ms.
- **Date:** [FLAG: Date not recorded in code]

### ADR-007: Three-tier image format detection (Content-Type → magic bytes → URL extension)
- **Context:** Detecting whether og:image is WebP is critical (WebP images are invisible in LLM chat UIs). But many CDNs return incorrect Content-Type headers or block CORS.
- **Decision:** `verifyImageFormat()` in `service-worker.js` uses a three-tier fallback: (1) HTTP HEAD for Content-Type header, (2) if Content-Type is unhelpful or CORS-blocked, fetch first 16 bytes via Range header and check magic bytes (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`, WebP: `RIFF....WEBP`, GIF: `47 49 46`, AVIF: `....ftypavif`), (3) if both network approaches fail, parse the file extension from the URL.
- **Rationale:** A single detection method would produce false negatives on 20-30% of product pages due to CDN behavior. The three-tier approach maximizes detection accuracy with graceful degradation.
- **Consequences:** Worst case makes two network requests for a single image (HEAD + Range GET). In practice, Content-Type resolves most cases in a single HEAD. The magic bytes approach adds ~50-100ms latency when needed.
- **Date:** [FLAG: Date not recorded in code]

### ADR-008: Apparel category auto-detection
- **Context:** Fashion products don't have warranty, compatibility, or precise dimensions in the same way electronics or appliances do. Without adjustment, clothing PDPs would always fail on these factors.
- **Decision:** `ScoringEngine.isLikelyApparel(extractedData)` checks breadcrumbs, schema category, and URL path for fashion/apparel keywords (English and French). When detected, warranty, compatibility, and dimensions factors score as "pass" with "N/A for apparel" detail, and corresponding recommendations are suppressed.
- **Rationale:** Approximately 30-40% of eCommerce PDPs are apparel. Scoring them on irrelevant factors would produce misleading grades and erode user trust.
- **Consequences:** The detection is heuristic-based (keyword matching) and may produce false positives (e.g., a page about "athletic equipment" matching "athletic" apparel keywords) or false negatives (apparel pages with non-standard categorization). [FLAG: No override mechanism exists for users to manually correct category detection.]
- **Date:** [FLAG: Date not recorded in code]

## 6. Security Considerations

- **Authentication:** None. The extension has no user accounts, login, or session management. No API keys or tokens are used or stored.
- **Authorization:** Implicit via Chrome extension permissions. The `activeTab` permission grants access to the current tab only when the user clicks the extension icon. `<all_urls>` host permission allows network requests to any domain (necessary to fetch robots.txt, og:image, etc. from arbitrary eCommerce sites).
- **Data in transit:** All network requests from the service worker use HTTPS (enforced by `isSafeUrl()` allowing only `http:` and `https:` protocols; most eCommerce sites redirect HTTP to HTTPS). No data is sent to Tribbute servers. The extension makes no outbound requests except to the site being analyzed.
- **Data at rest:** Analysis history in `chrome.storage.local` is not encrypted. It contains only public page metadata (URL, title, scores) — no passwords, PII, or sensitive content. Chrome's storage is sandboxed per-extension and not accessible to other extensions or web pages.
- **Content Security Policy:** `script-src 'self'; object-src 'self';` — prevents inline script execution, `eval()`, and loading scripts from external origins. Blocks XSS injection in extension pages.
- **XSS prevention:** `escapeHtml()` in `sidepanel.js` sanitizes all user-controlled data (page titles, domains) before `innerHTML` insertion. `esc()` in `report-template.js` provides equivalent sanitization for exported HTML reports. Schema descriptions are decoded via the textarea trick (creates a `<textarea>`, sets `innerHTML`, reads `textContent`) which safely decodes HTML entities without executing scripts.
- **Message validation:** Service worker verifies `sender.id === chrome.runtime.id` on every received message, preventing other extensions or web pages from injecting messages into the pipeline.
- **SSRF prevention:** `isSafeUrl()` blocks requests to `localhost`, `127.0.0.1`, `0.0.0.0`, and `file:` protocol, preventing the extension from being used to probe internal network services.
- **Client data isolation:** Not applicable — there is only one user per extension installation, and no cloud storage or sync.

## 7. Performance Characteristics

- **Expected data volume:** One product page per analysis. Each analysis extracts all JSON-LD blocks, meta tags, and DOM signals from a single page. No multi-page crawling.
- **Processing time:** Typical end-to-end analysis completes in 400-1000ms:
  - Content script DOM extraction: 300-500ms (includes JSON-LD parsing, regex matching, DOM traversal)
  - Service worker network requests: 100-500ms (robots.txt, og:image HEAD, llms.txt HEAD, Last-Modified HEAD — run in parallel via `Promise.all`)
  - Scoring engine calculation: <100ms (pure computation, no I/O)
  - Side panel rendering: <50ms (DOM manipulation)
- **Known bottlenecks:**
  - Network requests are the primary latency source (CORS failures, slow CDN responses). Parallelized in `fetchAIDiscoverabilityData()` to minimize wall-clock time.
  - JSON-LD parsing on pages with many schema blocks (10+) can take 100-200ms. Caching via `getParsedJsonLd()` ensures parsing happens only once per analysis.
  - Regex-heavy extraction (`extractProductDetails()`, `extractCertifications()`) uses scoped text via `getProductContentText()` (excludes nav/footer) to limit search space.
- **Scaling limits:** The extension is designed for single-page, on-demand analysis. It does not support bulk/batch analysis, multi-tab parallel analysis, or scheduled re-analysis. These are explicitly deferred to a future Pro tier. Storage scales to ~2,500-5,000 entries within the 10MB quota with automatic pruning.
- **Timeout:** Analysis timeout is 10 seconds (set in `SidePanelApp.startAnalysis()`). If no `EXTRACTION_COMPLETE` message arrives within 10 seconds, the user sees "Analysis timed out. Please try again."

## 8. Known Technical Debt

| Item | Severity | Impact | Effort to Fix | Notes |
|------|----------|--------|--------------|-------|
| `content-script.js` is ~2,000 lines | Low | Readability decreases as extraction logic grows; harder for new contributors to navigate | Medium (4-8 hours) | Cannot use ES module imports in content scripts under MV3 without a bundler (see ADR-001). Could refactor with IIFE patterns or adopt a minimal bundler. |
| No automated test suite | Medium | Scoring logic and extraction regexes have no automated verification; regressions must be caught manually | High (1-2 weeks) | Chrome extension testing requires mocking Chrome APIs. Scoring engine and recommendation engine are pure functions that could be unit tested with minimal mocking. [FLAG: No tests exist anywhere in the codebase.] |
| History entries lack full factor detail | Low | Users cannot drill into historical per-factor scores; must re-analyze | Low (2-4 hours) | By design (ADR-004) to conserve storage. Could offer optional "save full detail" for starred analyses. |
| Hardcoded AI crawler list | Low | New AI crawlers require code changes to `AI_CRAWLERS` and `MAJOR_AI_CRAWLERS` in `service-worker.js` | Low (30 min per update) | Could be externalized to a config file or fetched from a maintained list, but this would add a network dependency the privacy-first architecture avoids. |
| No user override for apparel detection | Low | False positives/negatives in apparel heuristic cannot be corrected by the user | Low (1-2 hours) | Could add a toggle in the UI or an "override category" option. |
| Event listeners on history items are not delegated | Low | Each history item gets its own click listener (`item.addEventListener('click', ...)`); re-rendering the list creates new listeners | Low (1 hour) | Category list already uses event delegation (ADR in code comments). History list should follow the same pattern. |
| `sidepanel.js` renders top 10 recommendations, not all | Low | Users with 15+ recommendations only see top 10 in the side panel | Low (30 min) | Could add "Show all" toggle. Full list is available in the HTML report export. |
| DEBUG flag is per-file, not centralized | Low | Enabling debug logging requires editing `const DEBUG = false;` in each source file individually | Low (30 min) | Could use a shared config module or Chrome storage flag. |

## 9. Development Environment Setup

```bash
# Prerequisites
# - Chrome browser (version 114+ for Side Panel API)
# - Text editor (VS Code recommended)
# - Git
# - No Node.js, npm, or build tools required

# Installation
git clone <repository-url>
cd pdpiq

# Verify icons exist (required for extension to load)
ls icons/icon16.png icons/icon48.png icons/icon128.png

# Loading the extension
# 1. Open Chrome and navigate to chrome://extensions/
# 2. Enable "Developer mode" (toggle in top right)
# 3. Click "Load unpacked"
# 4. Select the pdpiq/ project root directory

# Running locally
# Navigate to any eCommerce product page in Chrome
# Click the pdpIQ extension icon in the toolbar
# Select a context (Want / Need / Hybrid)
# View results in the side panel

# Testing changes
# After editing source files:
# - Service worker changes: click "Update" on the extension card in chrome://extensions/
# - Content script changes: refresh the target page in the browser
# - Side panel changes: close and reopen the side panel (or reload extension)

# Debugging
# Service worker: chrome://extensions/ → "Inspect views: service worker"
# Content script: DevTools on target page → Console tab
# Side panel: Right-click inside side panel → Inspect
# Enable verbose logging: set `const DEBUG = true;` in the relevant source file

# Running tests
# [FLAG: No test suite exists. See Known Technical Debt.]
```

## 10. Deployment

- **Target environment:** Chrome Web Store (production). Local "Load unpacked" (development).
- **Deployment method:** Manual. Zip the `pdpiq/` directory (excluding `.git`, `.DS_Store`, development-only files), submit via the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
- **Configuration differences:** The only dev vs. production difference is the `DEBUG` flag (`false` in production, `true` when debugging locally). No environment variables, API keys, or server endpoints differ between environments.
- **Rollback procedure:** Chrome Web Store allows publishing a previous version. For local development, `git revert` or `git checkout` to the previous commit, then reload the extension in `chrome://extensions/`.
- **Version management:** Version is defined in `manifest.json` → `"version": "1.1.0"`. The side panel footer reads this value dynamically via `chrome.runtime.getManifest().version`. To release a new version: update the version string in `manifest.json`, test on representative product pages, zip, and submit.

---

_This document should be updated whenever a significant architectural change is made. Last reviewed: 2026-03-01._
