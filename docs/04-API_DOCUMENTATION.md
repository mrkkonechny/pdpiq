# API & Interface Documentation

> **PDS Document 04** | Last Updated: 2026-03-01

**Base URL:** N/A — pdpIQ is a Chrome extension with no HTTP API. All interfaces are Chrome extension message-passing and a browser-rendered UI.

---

## 1. Overview

pdpIQ has no REST API or CLI. Its interfaces are:

1. **Internal message-passing API** — Chrome extension components communicate via `chrome.runtime.sendMessage()` and `chrome.tabs.sendMessage()`. These messages are the equivalent of API endpoints in a client-server architecture.
2. **User interface** — A Chrome Side Panel with context selection, results display, history management, comparison, and export.
3. **Module interfaces** — ES module classes (`ScoringEngine`, `RecommendationEngine`, storage functions) imported by the side panel.

**Authentication:** None. Messages are validated via `sender.id === chrome.runtime.id` to prevent cross-extension injection.
**Rate Limits:** None. Analysis is user-initiated, one page at a time.
**Response Format:** JavaScript objects passed via Chrome message-passing (serialized as structured clones, not JSON).

---

## 2. Internal Message-Passing API

All messages flow through `chrome.runtime.onMessage`. Each message has a `type` field that determines routing. The service worker (`service-worker.js`) acts as the message hub.

---

### 2.1 EXTRACT_DATA

**Purpose:** Trigger data extraction from the active tab's DOM.

**Direction:** Side Panel → Content Script (via `chrome.tabs.sendMessage`)

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | Yes | — | Must be `"EXTRACT_DATA"` |
| requestId | string | Yes | — | Unique ID for race condition prevention (e.g., `"1709308800000-a1b2c3d4e"`) |

**Request Example:**
```javascript
chrome.tabs.sendMessage(tab.id, {
  type: 'EXTRACT_DATA',
  requestId: '1709308800000-a1b2c3d4e'
});
```

**Response:** None directly. Content script responds asynchronously via `EXTRACTION_COMPLETE` message (see §2.2).

**Error Handling:**
- If content script is not loaded: `chrome.runtime.lastError` with message `"Receiving end does not exist"` — side panel shows "Content script not loaded. Refresh the page and try again."
- If tab is invalid or inaccessible: side panel shows "Unable to communicate with the page."

**Notes:**
- Content script runs at `document_idle` and registers a listener on load. If the extension was installed after the page loaded, the content script won't be present until the page is refreshed.

---

### 2.2 EXTRACTION_COMPLETE

**Purpose:** Return extracted data from the content script to the side panel.

**Direction:** Content Script → Service Worker → Side Panel

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | Yes | — | Must be `"EXTRACTION_COMPLETE"` |
| requestId | string | Yes | — | Echoed from the originating `EXTRACT_DATA` message |
| data | object | Yes | — | Full extraction result (see §3.1 ExtractedData) |

**Response Example:**
```javascript
chrome.runtime.sendMessage({
  type: 'EXTRACTION_COMPLETE',
  requestId: '1709308800000-a1b2c3d4e',
  data: {
    structuredData: { /* ... */ },
    metaTags: { /* ... */ },
    contentQuality: { /* ... */ },
    contentStructure: { /* ... */ },
    trustSignals: { /* ... */ },
    aiDiscoverability: { /* ... */ },
    pageInfo: { /* ... */ },
    extractionTime: 342
  }
});
```

**Validation:**
- Service worker verifies `sender.tab` exists (message must originate from a content script, not another extension page)
- Service worker verifies `sender.id === chrome.runtime.id`
- Side panel verifies `message.requestId === this.currentRequestId` — mismatched IDs are silently discarded (stale response)

**Notes:**
- The service worker forwards this message to the side panel via `chrome.runtime.sendMessage()`. It does not modify the data.

---

### 2.3 VERIFY_IMAGE_FORMAT

**Purpose:** Verify the actual image format of an og:image URL via HTTP HEAD request to detect WebP (invisible in LLM chat UIs).

**Direction:** Side Panel → Service Worker (async response)

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | Yes | — | Must be `"VERIFY_IMAGE_FORMAT"` |
| url | string | Yes | — | The og:image URL to verify |

**Request Example:**
```javascript
chrome.runtime.sendMessage(
  { type: 'VERIFY_IMAGE_FORMAT', url: 'https://cdn.example.com/product.jpg' },
  (response) => { /* handle response */ }
);
```

**Response — Success:**
```javascript
{
  url: "https://cdn.example.com/product.jpg",
  accessible: true,
  contentType: "image/jpeg",
  format: "jpeg",           // "jpeg" | "png" | "gif" | "webp" | "avif" | "svg" | "unknown"
  isWebP: false,
  isValidFormat: true,      // true for JPEG/PNG/GIF; false for WebP/AVIF/SVG
  sizeInMB: 0.45,           // null if Content-Length unavailable
  isSizeValid: true,        // true if < 5MB or unknown
  isValid: true             // isValidFormat AND isSizeValid
}
```

**Response — WebP Detected (Critical):**
```javascript
{
  url: "https://cdn.example.com/product.webp",
  accessible: true,
  contentType: "image/webp",
  format: "webp",
  isWebP: true,
  isValidFormat: false,
  isValid: false
}
```

**Response — Network Failure (Fallback to URL Extension):**
```javascript
{
  url: "https://cdn.example.com/product.jpg",
  accessible: false,
  error: "Failed to fetch",
  format: "jpeg",
  isWebP: false,
  isValidFormat: true,
  isValid: true,
  note: "Detected from URL extension (network request failed)"
}
```

**Response — Invalid URL:**
```javascript
{
  url: "",
  accessible: false,
  isValid: false,
  error: "Invalid or missing URL"
}
```

**Notes:**
- Returns `true` for `sendResponse` (keeps message channel open for async response)
- Uses three-tier detection: Content-Type header → magic bytes (Range: bytes=0-16) → URL extension
- URL must pass `isSafeUrl()` — blocks localhost, private IPs, file: protocol

---

### 2.4 VERIFY_MULTIPLE_IMAGES

**Purpose:** Verify formats of multiple image URLs in parallel.

**Direction:** Side Panel → Service Worker (async response)

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | Yes | — | Must be `"VERIFY_MULTIPLE_IMAGES"` |
| urls | string[] | Yes | — | Array of image URLs to verify |

**Response — Success:**
```javascript
[
  { url: "...", format: "jpeg", isWebP: false, isValid: true, /* ... */ },
  { url: "...", format: "webp", isWebP: true, isValid: false, /* ... */ }
]
```

**Notes:**
- Uses `Promise.all()` to verify all URLs in parallel
- Each element in the response array follows the same schema as `VERIFY_IMAGE_FORMAT` response

---

### 2.5 GET_PAGE_INFO

**Purpose:** Get the URL and title of the currently active tab.

**Direction:** Side Panel → Service Worker (async response)

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | Yes | — | Must be `"GET_PAGE_INFO"` |

**Response — Success:**
```javascript
{
  url: "https://example.com/products/widget",
  title: "Widget Pro - Example Store"
}
```

**Response — Error:**
```javascript
{
  error: "No active tab"
}
```

---

### 2.6 FETCH_ROBOTS_TXT

**Purpose:** Fetch and parse the target site's robots.txt to determine AI crawler access rules.

**Direction:** Side Panel → Service Worker (async response)

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | Yes | — | Must be `"FETCH_ROBOTS_TXT"` |
| baseUrl | string | Yes | — | Origin URL of the site (e.g., `"https://example.com"`) |

**Response — Success (robots.txt found):**
```javascript
{
  accessible: true,
  crawlerRules: {
    "gptbot": { disallow: ["/"], allow: [] },
    "*": { disallow: [], allow: [] }
  },
  blockedCrawlers: ["gptbot"],
  allowedCrawlers: ["chatgpt-user", "claudebot", "perplexitybot", /* ... */],
  hasWildcardDisallowAll: false
}
```

**Response — robots.txt Not Found (404):**
```javascript
{
  accessible: false,
  status: 404,
  crawlerRules: {},
  blockedCrawlers: [],
  allowedCrawlers: ["gptbot", "chatgpt-user", "claudebot", /* all 15 crawlers */]
}
```

**Response — Network Error:**
```javascript
{
  accessible: false,
  error: "Failed to fetch",
  crawlerRules: {},
  blockedCrawlers: [],
  allowedCrawlers: []
}
```

**Response — Invalid URL:**
```javascript
{
  accessible: false,
  error: "Invalid or missing baseUrl",
  crawlerRules: {},
  blockedCrawlers: [],
  allowedCrawlers: []
}
```

**AI Crawlers Checked (15):**

| User-Agent | Company | Product |
|------------|---------|---------|
| gptbot | OpenAI | GPT/ChatGPT training |
| chatgpt-user | OpenAI | ChatGPT browsing |
| oai-searchbot | OpenAI | OpenAI search |
| claudebot | Anthropic | Claude training |
| claude-web | Anthropic | Claude web access |
| anthropic-ai | Anthropic | Anthropic AI |
| perplexitybot | Perplexity | Perplexity AI search |
| google-extended | Google | Gemini AI training |
| applebot-extended | Apple | Apple Intelligence |
| meta-externalagent | Meta | Meta AI assistant |
| bytespider | ByteDance | TikTok search / Doubao AI |
| cohere-ai | Cohere | Cohere RAG / enterprise AI |
| youbot | You.com | You.com AI search |
| amazonbot | Amazon | Amazon AI / Alexa |
| ccbot | Common Crawl | Training data collection |

---

### 2.7 FETCH_LLMS_TXT

**Purpose:** Check for the presence of `/llms.txt` and `/llms-full.txt` files on the target site.

**Direction:** Side Panel → Service Worker (async response)

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | Yes | — | Must be `"FETCH_LLMS_TXT"` |
| baseUrl | string | Yes | — | Origin URL of the site |

**Response — Found:**
```javascript
{
  found: true,
  llmsTxt: {
    found: true,
    url: "https://example.com/llms.txt",
    size: 2048           // Content-Length in bytes, null if unavailable
  },
  llmsFullTxt: {
    found: false,
    url: null,
    size: null
  }
}
```

**Response — Not Found:**
```javascript
{
  found: false,
  llmsTxt: { found: false, url: null, size: null },
  llmsFullTxt: { found: false, url: null, size: null }
}
```

**Notes:**
- Uses HTTP HEAD requests (no body downloaded)
- `found` at top level is `true` if either file exists

---

### 2.8 FETCH_LAST_MODIFIED

**Purpose:** Get the Last-Modified header for a URL to assess content freshness.

**Direction:** Side Panel → Service Worker (async response)

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | Yes | — | Must be `"FETCH_LAST_MODIFIED"` |
| url | string | Yes | — | Full page URL to check |

**Response — Success:**
```javascript
{
  accessible: true,
  lastModified: "2026-02-15T10:30:00.000Z",   // ISO 8601 or null
  serverDate: "2026-03-01T14:00:00.000Z"       // ISO 8601 or null
}
```

**Response — Header Not Present:**
```javascript
{
  accessible: true,
  lastModified: null,
  serverDate: "2026-03-01T14:00:00.000Z"
}
```

**Response — Error:**
```javascript
{
  accessible: false,
  error: "Failed to fetch",
  lastModified: null
}
```

---

## 3. Data Models / Response Objects

### 3.1 ExtractedData

The complete object returned by the content script in `EXTRACTION_COMPLETE`. This is the raw input to the scoring engine.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| structuredData | object | No | JSON-LD and microdata extraction results |
| structuredData.jsonLd | array | No | Parsed JSON-LD blocks (each: `{valid, data, error}`) |
| structuredData.microdata | array | No | Parsed microdata items (each: `{type, properties}`) |
| structuredData.schemas | object | No | Categorized schema objects (see below) |
| structuredData.schemas.product | object | Yes | Product or ProductGroup schema (null if absent) |
| structuredData.schemas.offer | object | Yes | Offer schema (null if absent) |
| structuredData.schemas.aggregateRating | object | Yes | AggregateRating schema (null if absent, resolved via @id if needed) |
| structuredData.schemas.reviews | array | No | Review schema objects (empty array if none) |
| structuredData.schemas.faq | object | Yes | FAQPage schema (null if absent) |
| structuredData.schemas.breadcrumb | object | Yes | BreadcrumbList schema (null if absent) |
| structuredData.schemas.organization | object | Yes | Organization schema (null if absent) |
| structuredData.schemas.brand | object | Yes | Brand schema (null if absent) |
| structuredData.schemas.images | array | No | ImageObject schemas (empty array if none) |
| metaTags | object | No | Meta tag extraction results |
| metaTags.openGraph | object | No | `{image, title, description, type, url}` — all string or null |
| metaTags.twitterCards | object | No | `{card, title, description, image}` — all string or null |
| metaTags.canonical | object | No | `{url, present, matchesCurrentUrl, isProductCanonical}` |
| metaTags.standard | object | No | `{description}` — string or null |
| metaTags.robots | object | No | `{isBlocked, directiveText}` |
| metaTags.hreflang | object | No | `{present, languages[], count}` |
| contentQuality | object | No | Content analysis results |
| contentQuality.description | object | No | `{text, wordCount, source, qualityScore, lengthScore, hasBenefitStatements, hasEmotionalLanguage, hasTechnicalTerms}` |
| contentQuality.specifications | object | No | `{count, items[], source, countScore}` — items: `{name, value, hasUnit}` |
| contentQuality.features | object | No | `{count, items[], source, countScore}` — items: `{text, source}` |
| contentQuality.faq | object | No | `{count, items[], source, countScore}` — items: `{q, a}` |
| contentQuality.productDetails | object | No | Boolean flags: `hasDimensions, hasWarranty, hasCompatibility, hasMaterials, hasCareInstructions` + matched text fields |
| contentQuality.textMetrics | object | No | `{readabilityScore, sentenceCount, avgSentenceLength}` |
| contentStructure | object | No | Page structure analysis |
| contentStructure.headings | object | No | `{hasH1, hasSingleH1, h1{count, text, texts[]}, hierarchyValid, hierarchyIssues[]}` |
| contentStructure.semanticHTML | object | No | `{hasMain, hasArticle, hasSection, score, elements{}}` |
| contentStructure.images | object | No | `{totalCount, primaryImage{url, alt, hasAlt}, altCoverage}` |
| contentStructure.jsDependency | object | No | `{dependencyLevel, frameworkDetected, score}` |
| contentStructure.contentRatio | object | No | `{ratio, mainContentFound, score}` |
| contentStructure.tables | object | No | `{tableCount, hasProperTables, score}` |
| contentStructure.lists | object | No | `{unorderedCount, orderedCount, hasProperLists, score}` |
| contentStructure.accessibility | object | No | `{ariaLabels}` — count of ARIA labels found |
| trustSignals | object | No | Trust and authority signals |
| trustSignals.reviews | object | No | `{hasReviews, count, averageRating, hasRecentReviews, mostRecentDate, averageReviewLength, reviewsAnalyzed, countScore, ratingScore, depthScore}` |
| trustSignals.brand | object | No | `{name, clarity, inH1, inTitle, score}` |
| trustSignals.certifications | object | No | `{found, count, items[], details[], source, score}` |
| trustSignals.awards | object | No | `{found, count, items[], details[], source}` |
| trustSignals.socialProof | object | No | `{soldCount, customerCount}` — numeric or null |
| trustSignals.expertAttribution | object | No | `{found}` — boolean |
| aiDiscoverability | object | No | AI-specific discoverability signals |
| aiDiscoverability.entityConsistency | object | No | `{schemaName, h1Name, ogTitle, pageTitle, metaDescription}` |
| aiDiscoverability.answerFormat | object | No | `{hasBestFor, bestForCount, hasComparison, hasHowTo, useCaseCount}` |
| aiDiscoverability.productIdentifiers | object | No | `{gtin, upc, mpn}` — string or null |
| aiDiscoverability.schemaDate | object | No | `{dateModified, datePublished}` — ISO string or null |
| aiDiscoverability.visibleDate | object | No | `{found}` — boolean |
| pageInfo | object | No | Page metadata |
| pageInfo.url | string | No | Full page URL |
| pageInfo.title | string | No | Document title |
| pageInfo.domain | string | No | Hostname |
| pageInfo.pathname | string | No | URL path |
| pageInfo.extractedAt | string | No | ISO 8601 timestamp |
| extractionTime | integer | No | Extraction duration in milliseconds |

### 3.2 ScoreResult

Returned by `ScoringEngine.calculateScore()`. This is the scoring output passed to the UI and exports.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| totalScore | integer | No | Overall weighted score (0-100) |
| grade | string | No | Letter grade: `"A"`, `"B"`, `"C"`, `"D"`, or `"F"` |
| gradeDescription | string | No | Human-readable grade meaning (e.g., "Good foundation; specific gaps to address") |
| context | string | No | Selected purchase context: `"want"`, `"need"`, or `"hybrid"` |
| jsDependent | boolean | No | `true` if page has high JavaScript dependency (React/Vue SPA) |
| timestamp | string | No | ISO 8601 timestamp of scoring |
| categoryScores | object | No | Per-category scoring detail (6 keys, see below) |

**categoryScores[key] structure:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| score | number | No | Category score (0-100) |
| maxScore | integer | No | Always `100` |
| weight | number | No | Category weight (e.g., `0.20`) |
| categoryName | string | No | Display name (e.g., "Content Depth & Quality") |
| factors | array | No | Array of Factor objects |

**Factor object:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| name | string | No | Display name (e.g., "Product Schema", "og:image Format") |
| status | string | No | `"pass"`, `"warning"`, or `"fail"` |
| points | number | No | Points earned |
| maxPoints | integer | No | Maximum possible points for this factor |
| critical | boolean | Yes | `true` for critical factors (present only when applicable) |
| contextual | boolean | Yes | `true` for context-sensitive factors (present only when applicable) |
| details | string | No | Human-readable explanation of the score |

**Category keys and display names:**

| Key | Display Name | Weight |
|-----|-------------|--------|
| structuredData | Structured Data | 0.20 |
| protocolMeta | Protocol & Meta Compliance | 0.15 |
| contentQuality | Content Depth & Quality | 0.20 |
| contentStructure | Content Structure & Accessibility | 0.12 |
| authorityTrust | Authority & Trust Signals | 0.13 |
| aiDiscoverability | AI Discoverability | 0.20 |

### 3.3 Recommendation

Returned by `RecommendationEngine.generateRecommendations()` as an array sorted by priority.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | string | No | Template ID (e.g., `"og-image-webp"`, `"product-schema-missing"`) |
| title | string | No | Short actionable fix title |
| description | string | No | Why this matters for AI citation |
| impact | string | No | `"high"`, `"medium"`, or `"low"` |
| effort | string | No | `"low"`, `"medium"`, or `"high"` |
| category | string | No | Scoring category key this recommendation belongs to |
| priority | integer | No | 1 (highest) to 5 (lowest), from `PRIORITY_MATRIX[impact][effort]` |
| implementation | string | Yes | Specific guidance with HTML snippets (may contain escaped HTML) |
| contextual | boolean | Yes | `true` if impact was adjusted by context multipliers |
| currentState | string | Yes | Current value (e.g., `"42 words"`) — present on some recommendations |
| targetState | string | Yes | Target value (e.g., `"200+ words"`) — present on some recommendations |

### 3.4 HistoryEntry

Compact record persisted to `chrome.storage.local` under key `analysisHistory`.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | string | No | Timestamp-based unique ID (`Date.now().toString()`) |
| url | string | No | Full page URL analyzed |
| title | string | No | Page title at time of analysis |
| domain | string | No | Hostname (e.g., `"example.com"`) |
| score | integer | No | Overall score (0-100), rounded |
| grade | string | No | Letter grade (A-F) |
| context | string | No | `"want"`, `"need"`, or `"hybrid"` |
| timestamp | integer | No | Unix timestamp in milliseconds |
| categoryScores | object | No | Compact category scores: `{[key]: {score: int, name: string}}` |
| recommendationCount | integer | No | Total number of recommendations generated |
| criticalIssues | integer | No | Count of recommendations with `impact === "high"` |

### 3.5 ImageVerification

Returned by the `VERIFY_IMAGE_FORMAT` message handler.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| url | string | No | The image URL that was checked |
| accessible | boolean | No | Whether the URL was reachable |
| contentType | string | Yes | Raw Content-Type header value |
| format | string | No | Detected format: `"jpeg"`, `"png"`, `"gif"`, `"webp"`, `"avif"`, `"svg"`, `"unknown"` |
| isWebP | boolean | No | `true` if format is WebP (critical failure) |
| isValidFormat | boolean | No | `true` for JPEG, PNG, GIF; `false` for WebP, AVIF, SVG, unknown |
| sizeInMB | number | Yes | File size in MB (null if Content-Length unavailable) |
| isSizeValid | boolean | No | `true` if < 5MB or size unknown |
| isValid | boolean | No | `isValidFormat AND isSizeValid` |
| status | integer | Yes | HTTP status code (present on non-200 responses) |
| error | string | Yes | Error message (present on failures) |
| note | string | Yes | Detection method note (e.g., "Detected via magic bytes") |

---

## 4. User Interface Flows

### Screen/View 1: Context Selector

- **Surface:** Chrome Side Panel (opens on extension icon click)
- **Purpose:** User selects the purchase context before analysis begins
- **Key Elements:**
  - Sticky header with "pdpIQ" wordmark, Tribbute logo (links to tribbute.com with UTM), tagline, and current page domain
  - Three context buttons stacked vertically:
    - **Want** — Heart icon (#db2777 on #fce7f3), "Emotional, lifestyle-driven"
    - **Need** — Lightning bolt icon (#1d4ed8 on #dbeafe), "Functional, spec-driven"
    - **Hybrid** — Yin-yang icon (#7c3aed on #ede9fe), "Balanced consideration"
- **Actions Available:** Click any context button to start analysis

### Screen/View 2: Loading State

- **Surface:** Chrome Side Panel (replaces context selector)
- **Purpose:** Provide feedback while analysis is running
- **Key Elements:**
  - CSS spinner animation (40x40px, 0.8s rotation)
  - "Analyzing page..." text
  - "Extracting structured data, meta tags, and content..." hint
- **Actions Available:** None (wait for results or timeout)

### Screen/View 3: Results

- **Surface:** Chrome Side Panel (replaces loading state)
- **Purpose:** Display scoring results, category breakdowns, and recommendations
- **Key Elements:**
  - **Score Card** — Grade badge (64x64px, colored by grade: A=#22c55e, B=#84cc16, C=#eab308, D=#f97316, F=#ef4444), numeric score/100, context label, grade description
  - **JS Dependency Warning** — Orange banner, shown only when `jsDependent === true`
  - **Category Scores** — 6 expandable cards, each showing:
    - Category name (with tooltip from `CATEGORY_DESCRIPTIONS`), score (colored: green ≥80, yellow ≥60, red <60), expand/collapse icon (+/−)
    - Expanded detail: per-factor rows with expand arrow (▶/▼), factor name, CTX badge if contextual, status icon (✓/✗/⚠), points/maxPoints
    - Factor recommendation panel (expandable per-factor): description text + implementation guidance
  - **Recommendations** — Count badge, top 10 recommendations sorted by priority, each with:
    - Title, impact badge (high: red, medium: orange, low: blue), effort badge
    - Description text, implementation guidance (separated by dashed border)
    - Left border colored by impact level
  - **Action Buttons** — "Re-analyze with Different Context" (secondary), "Download Report" (primary), "Download Analysis Data" (secondary)
- **Actions Available:**
  - Expand/collapse category cards (click header)
  - Expand/collapse per-factor recommendation tips (click ▶ arrow)
  - Re-analyze with different context
  - Download HTML report
  - Download JSON data
  - Switch to History tab

### Screen/View 4: Error State

- **Surface:** Chrome Side Panel (replaces loading state)
- **Purpose:** Display error message when analysis fails
- **Key Elements:**
  - Warning triangle SVG icon
  - "Analysis Error" heading
  - Error message text (dynamic, set by `showError()`)
  - "Try Again" button
- **Actions Available:** Click "Try Again" to return to context selector

### Screen/View 5: History List

- **Surface:** Chrome Side Panel (activated by History tab)
- **Purpose:** View and select past analyses for comparison
- **Key Elements:**
  - "Recent Analyses" header with compare button (hidden until 2 selected) and clear history icon button
  - List of up to 20 entries, each showing:
    - Grade badge (32x32px, colored), title (truncated with ellipsis), domain + time ago, score
    - Selected state: indigo (#4f46e5) border + purple (#f5f3ff) background + outline on grade badge
  - Compare hint text ("Select one more to compare") when 1 item selected
  - Empty state message when no history exists
- **Actions Available:**
  - Click entry to toggle selection (max 2, FIFO replacement)
  - Click "Compare (2)" when 2 entries selected
  - Click clear history icon (confirmation dialog required)
  - Switch to Results tab

### Screen/View 6: Comparison View

- **Surface:** Chrome Side Panel (replaces history list)
- **Purpose:** Side-by-side comparison of two analyses
- **Key Elements:**
  - Back arrow button + "Side-by-Side Comparison" header
  - Two-column grid layout:
    - Per column: domain, product title, grade (colored), score/100, 6 category scores (colored: green ≥80, yellow 60-79, red <60)
- **Actions Available:** Click back arrow to return to history list

### Navigation Structure

```
pdpIQ Side Panel
├── [Results Tab] (default active)
│   ├── Context Selector — Select Want/Need/Hybrid to begin analysis
│   ├── Loading State — Spinner while analyzing
│   ├── Results View — Grade, categories, recommendations, export
│   └── Error State — Error message + retry
├── [History Tab]
│   ├── History List — Recent analyses, select 2 to compare
│   └── Comparison View — Side-by-side category scores
└── [Footer] — Version badge + "by Tribbute" link
```

**Tab Switching Logic:**
- Results tab: shows context selector if no analysis has been run, results if analysis exists, or loading/error if in progress
- History tab: always shows history list (or comparison view if active)
- Switching tabs preserves state (current analysis results remain in memory)

---

## 5. Module Interfaces

pdpIQ has no webhooks or external event notifications. Instead, the side panel imports ES modules directly. These are the public interfaces of each module.

### 5.1 ScoringEngine

**Import:** `import { ScoringEngine } from '../scoring/scoring-engine.js';`

```javascript
// Constructor
const engine = new ScoringEngine(context);
// context: "want" | "need" | "hybrid" (default: "hybrid")

// Primary method
const scoreResult = engine.calculateScore(extractedData, imageVerification, aiDiscoverabilityData);
// extractedData: ExtractedData object (required)
// imageVerification: ImageVerification object (optional, null if og:image absent)
// aiDiscoverabilityData: { robots, llms, lastModified } (optional, null if network failed)
// Returns: ScoreResult object (see §3.2)

// Static method
const isApparel = ScoringEngine.isLikelyApparel(extractedData);
// Returns: boolean
```

### 5.2 RecommendationEngine

**Import:** `import { RecommendationEngine } from '../recommendations/recommendation-engine.js';`

```javascript
// Constructor
const recEngine = new RecommendationEngine(scoreResult, extractedData, imageVerification);
// scoreResult: ScoreResult from ScoringEngine (required)
// extractedData: ExtractedData object (required)
// imageVerification: ImageVerification object (optional)

// Primary method
const recommendations = recEngine.generateRecommendations();
// Returns: Recommendation[] sorted by priority ascending (see §3.3)

// Convenience methods
const top5 = recEngine.getTopRecommendations(5);
const critical = recEngine.getCriticalRecommendations();     // impact === "high"
const quickWins = recEngine.getQuickWins();                  // (high|medium) impact + low effort
const byCategory = recEngine.getRecommendationsByCategory('protocolMeta');
```

### 5.3 Storage Manager

**Import:** `import { saveAnalysis, getHistory, clearHistory, /* ... */ } from '../storage/storage-manager.js';`

```javascript
// Save analysis to history
const entry = await saveAnalysis({ url, pageInfo, scoreResult, recommendations });
// Returns: HistoryEntry (see §3.4)

// Retrieve history
const history = await getHistory();               // HistoryEntry[] (newest first)
const entry = await getAnalysis(id);              // HistoryEntry | null
const recent = await getRecentAnalyses(10);       // HistoryEntry[] (last N)
const byDomain = await getHistoryByDomain();      // { [domain]: HistoryEntry[] }
const byUrl = await getHistoryByUrl(url, 10);     // HistoryEntry[] for specific URL

// Delete
const success = await deleteAnalysis(id);         // boolean
await clearHistory();                             // void

// Export & stats
const json = await exportHistory();               // JSON string
const stats = await getStorageStats();
// stats: { analysisCount, bytesUsed, bytesFormatted, quotaBytes, quotaFormatted,
//          usagePercent, nearQuota, oldestAnalysis, newestAnalysis }
```

### 5.4 Report Template

**Import:** `import { generateHtmlReport } from './report-template.js';`

```javascript
const html = generateHtmlReport(scoreResult, pageInfo, recommendations, context);
// scoreResult: ScoreResult object
// pageInfo: { url, title, domain } from ExtractedData
// recommendations: Recommendation[] array
// context: "want" | "need" | "hybrid"
// Returns: string (complete self-contained HTML document)
```

### 5.5 Weights & Grading

**Import:** `import { getGrade, getGradeDescription, getContextMultiplier, CATEGORY_WEIGHTS, FACTOR_WEIGHTS, CONTEXT_MULTIPLIERS, GRADE_THRESHOLDS, CATEGORY_DESCRIPTIONS, FACTOR_RECOMMENDATIONS } from '../scoring/weights.js';`

```javascript
const grade = getGrade(85);                            // "B"
const desc = getGradeDescription("B");                 // "Good foundation; specific gaps to address"
const mult = getContextMultiplier("need", "compatibilityInfo");  // 2.0
```

**Import:** `import { getGradeColor, getGradeBackgroundColor } from '../scoring/grading.js';`

```javascript
const color = getGradeColor("A");         // "#22c55e"
const bg = getGradeBackgroundColor("A");  // "#dcfce7"
```

---

## 6. Design System Reference

### Color Tokens (CSS Custom Properties)

**Grade Colors:**

| Token | Value | Usage |
|-------|-------|-------|
| `--grade-a` | `#22c55e` (green) | Grade A badge, pass status |
| `--grade-a-bg` | `#dcfce7` | Grade A background |
| `--grade-b` | `#84cc16` (lime) | Grade B badge |
| `--grade-b-bg` | `#ecfccb` | Grade B background |
| `--grade-c` | `#eab308` (yellow) | Grade C badge, warning status |
| `--grade-c-bg` | `#fef9c3` | Grade C background |
| `--grade-d` | `#f97316` (orange) | Grade D badge |
| `--grade-d-bg` | `#ffedd5` | Grade D background, JS warning |
| `--grade-f` | `#ef4444` (red) | Grade F badge, fail status |
| `--grade-f-bg` | `#fee2e2` | Grade F background |

**Impact/Effort Colors:**

| Token | Value | Usage |
|-------|-------|-------|
| `--impact-high` | `#ef4444` | High impact badge, recommendation border |
| `--impact-medium` | `#f97316` | Medium impact badge, recommendation border |
| `--impact-low` | `#3b82f6` | Low impact badge, recommendation border |

**Surface Colors:**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#ffffff` | Main background |
| `--bg-secondary` | `#f3f4f6` | Cards, score card, category details |
| `--bg-tertiary` | `#e5e7eb` | Hover states, CTX badge |
| `--text-primary` | `#111827` | Primary text, active nav |
| `--text-secondary` | `#6b7280` | Secondary text, descriptions |
| `--text-tertiary` | `#9ca3af` | Tertiary text, hints, timestamps |
| `--border-color` | `#e5e7eb` | All borders |

**Brand Color:**

| Color | Value | Usage |
|-------|-------|-------|
| Indigo | `#4f46e5` | "IQ" in wordmark, selected history item border, compare hint text, extension icons |

### Typography

| Element | Size | Weight | Font |
|---------|------|--------|------|
| Wordmark ("pdpIQ") | 24px | 800 | System sans-serif |
| Section headings | 14px | 600 | System sans-serif |
| Context button label | 16px | 700 (bold) | System sans-serif |
| Score value | 24px | 600 | System sans-serif |
| Grade badge | 32px | 700 | System sans-serif |
| Category name | 13px | 500 | System sans-serif |
| Factor name | 12px | 400 | System sans-serif |
| Recommendation title | 13px | 500 | System sans-serif |
| Body text | 14px | 400 | System sans-serif |
| Hint/meta text | 11-12px | 400 | System sans-serif |
| Badges | 10px | 500 | System sans-serif, uppercase |
| Footer | 10px | 400 | System sans-serif |

Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif`

### Spacing Scale

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |

### Interactive States

| Element | Hover | Active | Focus-visible | Selected |
|---------|-------|--------|---------------|----------|
| Context button | Border darkens to `--text-secondary`, bg to `--bg-secondary` | Scale 0.98 | 2px solid outline | — |
| Category header | Background to `--bg-secondary` | — | 2px solid outline | — |
| History item | Background to `--bg-secondary` | — | 2px solid outline | Indigo border, purple bg, grade outline |
| Factor expand (▶) | Color to `--text-secondary` | — | 2px solid outline | ▼ when expanded |
| Nav button | Color to `--text-secondary` | — | 2px solid outline | Color to `--text-primary` |
| Button (primary) | Background `#374151` | — | 2px solid outline | — |
| Button (secondary) | Background to `--bg-tertiary` | — | 2px solid outline | — |
| Icon button | Opacity 1.0 (from 0.6) | — | 2px solid outline | — |

### Icons

All icons are inline SVGs. No emoji used anywhere in the UI.

| Icon | Location | Size | Details |
|------|----------|------|---------|
| Heart | Want context button | 40x40 | Fill: #db2777, circle bg: #fce7f3 |
| Lightning bolt | Need context button | 40x40 | Fill: #1d4ed8, circle bg: #dbeafe |
| Yin-yang | Hybrid context button | 40x40 | Fill: #7c3aed, circle bg: #ede9fe |
| Bar chart | Results nav tab | 20x20 | `currentColor`, secondary elements at 35% opacity |
| Clock | History nav tab | 20x20 | `currentColor`, face ring at 35% opacity |
| Trash can | Clear history button | 20x20 | `currentColor`, stroke only |
| Back arrow | Compare back button | 20x20 | `currentColor`, stroke only |
| Warning triangle | Error state | 24x24 | `currentColor`, stroke + fill at 15% opacity |

### Extension Icons

| Size | File | Usage |
|------|------|-------|
| 16x16 | `icons/icon16.png` | Toolbar icon |
| 48x48 | `icons/icon48.png` | Extensions page |
| 128x128 | `icons/icon128.png` | Chrome Web Store |

Design: "IQ" lettermark in white text on solid indigo (#4f46e5) rounded rectangle. Generated at 4x with Lanczos downscale.

---

_This documentation should be updated whenever the interface changes. Last reviewed: 2026-03-01._
