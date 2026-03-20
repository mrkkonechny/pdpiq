# Specification

> **PDS Document 03** | Last Updated: 2026-03-01

---

## 1. User Stories & Use Cases

### UC-001: Analyze a product page for AI citation readiness
- **As a:** eCommerce SEO manager
- **I want to:** run a one-click analysis on any product page I'm viewing in Chrome
- **So that:** I get a scored assessment of how well this page is structured for AI discovery and citation
- **Acceptance Criteria:**
  - [ ] Clicking the pdpIQ extension icon opens the side panel
  - [ ] Side panel displays three context buttons: Want, Need, Hybrid
  - [ ] Selecting a context triggers analysis and shows a loading spinner
  - [ ] Analysis completes within 10 seconds (timeout threshold)
  - [ ] Results show a letter grade (A-F), numeric score (0-100), context label, and grade description
  - [ ] Six category cards are rendered, each expandable to show per-factor details
  - [ ] Each factor shows name, status icon (pass/warning/fail), points earned, and max points
  - [ ] Analysis is automatically saved to local history

### UC-002: Identify critical issues blocking AI discovery
- **As a:** digital merchandiser
- **I want to:** immediately see the highest-impact problems on my product page
- **So that:** I can prioritize fixes that will have the most effect on AI citation
- **Acceptance Criteria:**
  - [ ] Critical issues (WebP og:image, missing Product schema, noindex, AI crawlers blocked) are flagged prominently with "CRITICAL" label in factor details
  - [ ] Recommendations list is sorted by priority (impact x effort matrix, priority 1 = high impact + low effort first)
  - [ ] Top 10 recommendations are displayed in the side panel with impact and effort badges
  - [ ] Each recommendation includes a title, description, and implementation guidance

### UC-003: Understand context-sensitive scoring differences
- **As a:** SEO manager managing both electronics (functional) and fashion (emotional) product lines
- **I want to:** analyze the same page under different purchase contexts
- **So that:** I understand how scoring shifts for spec-driven vs. lifestyle-driven products
- **Acceptance Criteria:**
  - [ ] Clicking "Re-analyze with Different Context" returns to the context selector
  - [ ] Selecting a different context produces a new analysis with adjusted scores
  - [ ] Factors affected by context multipliers show a "CTX" badge
  - [ ] Want context increases weight on social proof (1.4x), reviews (1.4x), emotional copy (1.5x) and decreases specs (0.6x), compatibility (0.4x)
  - [ ] Need context increases weight on specs (1.5x), compatibility (2.0x), certifications (1.6x) and decreases emotional copy (0.5x)
  - [ ] Hybrid context applies neutral 1.0x multipliers to all factors

### UC-004: Compare two product pages side by side
- **As a:** digital shelf analyst
- **I want to:** compare my product page analysis against a competitor's
- **So that:** I can identify specific areas where they outperform or underperform us
- **Acceptance Criteria:**
  - [ ] History tab shows up to 20 most recent analyses
  - [ ] Selecting exactly 2 history entries enables the "Compare" button
  - [ ] Comparison view shows side-by-side: domain, product title, grade, overall score, and per-category scores
  - [ ] Clicking "Back to History" returns to the history list without losing selections

### UC-005: Export analysis results for stakeholder reporting
- **As a:** eCommerce agency account manager
- **I want to:** download a branded report I can share with my client
- **So that:** I can include AI readiness findings in quarterly business reviews
- **Acceptance Criteria:**
  - [ ] "Download Report" button generates a self-contained HTML file
  - [ ] Report includes Tribbute branding (logo, colors), executive summary with grade gauge, grade legend, context explanation
  - [ ] Report groups recommendations into Quick Wins, Medium Priority, and Nice to Have with effort badges
  - [ ] Report includes pass/fail counts per category and a unique report ID
  - [ ] "Download Analysis Data" button generates a JSON file with full extraction data, scores, and recommendations
  - [ ] Both files are named with the pattern `pdpiq-{report|data}-{domain}-{date}.{html|json}`

### UC-006: View expandable recommendation tips per factor
- **As a:** Shopify theme developer
- **I want to:** click on any failing factor and see specific implementation guidance
- **So that:** I know exactly what HTML/schema changes to make
- **Acceptance Criteria:**
  - [ ] Factors with associated recommendations show a clickable expand arrow (▶)
  - [ ] Clicking the arrow expands an inline recommendation panel showing description and implementation guidance
  - [ ] All 56 factor display names are mapped to recommendation templates via `FACTOR_RECOMMENDATIONS`
  - [ ] Clicking the arrow again collapses the panel

### UC-007: Manage analysis history
- **As a:** any pdpIQ user
- **I want to:** view, compare, and clear my analysis history
- **So that:** I can track improvements over time and free storage when needed
- **Acceptance Criteria:**
  - [ ] Bottom navigation has two tabs: Results and History
  - [ ] History tab shows analyses sorted newest first with grade badge, title, domain, time ago, and score
  - [ ] "Clear all history" button requires confirmation dialog before proceeding
  - [ ] After clearing, history list shows empty state message
  - [ ] History persists across browser sessions (stored in `chrome.storage.local`)

---

## 2. Functional Requirements

### 2.1 Input Requirements

| Input | Source | Format | Validation Rules | Required? |
|-------|--------|--------|-----------------|-----------|
| Purchase context | User selection (3 buttons) | String: `"want"`, `"need"`, or `"hybrid"` | Must be one of three valid values; defaults to `"hybrid"` if constructor receives invalid value | Yes |
| Active browser tab | Chrome browser | Tab object via `chrome.tabs.query()` | Must be a valid tab with a URL; content script must be loaded (`document_idle`) | Yes |
| Page DOM | Content script injection | DOM tree | Must be an HTML page; non-HTML pages (PDF, images) will fail extraction | Yes |
| robots.txt | HTTP GET to `{origin}/robots.txt` | Plain text | URL must pass `isSafeUrl()` validation; CORS failures handled gracefully | No (analysis continues without) |
| og:image URL | From extracted `og:image` meta tag | URL string | URL must pass `isSafeUrl()` validation; blocked protocols and private IPs rejected | No (factor scored as "unknown") |
| llms.txt / llms-full.txt | HTTP HEAD to `{origin}/llms.txt` | HTTP response status | URL must pass `isSafeUrl()` validation; 404 or CORS failure = not found | No (scored as "fail") |
| Last-Modified header | HTTP HEAD to page URL | HTTP header value | Parsed as ISO date string; invalid dates ignored | No (scored as "fail") |

### 2.2 Processing / Business Logic

**Rule 1: Weighted Category Scoring**
- Description: Overall score is a weighted sum of 6 category scores, each 0-100
- Logic:
  ```
  totalScore = round(
    structuredData.score × 0.20 +
    protocolMeta.score × 0.15 +
    contentQuality.score × 0.20 +
    contentStructure.score × 0.12 +
    authorityTrust.score × 0.13 +
    aiDiscoverability.score × 0.20
  )
  ```
  Category weights must sum to 1.0. Each category has internal factor weights that sum to 100 relative points.
- Edge cases: If extraction fails for a category (data is null/undefined), that category's factors all score 0. The category still contributes to the weighted total (as 0), lowering the overall score proportionally.
- Source of truth: `CATEGORY_WEIGHTS` in `src/scoring/weights.js`

**Rule 2: Letter Grade Assignment**
- Description: Numeric score (0-100) maps to a letter grade (A-F)
- Logic:
  ```
  A: score >= 90
  B: score >= 80 and < 90
  C: score >= 70 and < 80
  D: score >= 60 and < 70
  F: score < 60
  ```
- Edge cases: Score is always rounded to integer via `Math.round()` before grading. Scores at exact boundaries (90, 80, 70, 60) receive the higher grade.
- Source of truth: `GRADE_THRESHOLDS` and `getGrade()` in `src/scoring/weights.js`

**Rule 3: Context Multiplier Application**
- Description: 10 factors have context-sensitive weights adjusted by multipliers based on the selected purchase context
- Logic: Each affected factor's raw score is multiplied by its context multiplier, then capped at 150% of the factor's base max points (`Math.min(maxPoints * 1.5, adjustedScore)`) to prevent one factor from dominating
- Edge cases: If context is not recognized, falls back to `CONTEXT_MULTIPLIERS.hybrid` (all 1.0x). Multipliers are applied after base scoring but before category aggregation.
- Source of truth: `CONTEXT_MULTIPLIERS` in `src/scoring/weights.js`

  | Factor | Want | Need | Hybrid |
  |--------|------|------|--------|
  | emotionalBenefitCopy | 1.5x | 0.5x | 1.0x |
  | technicalSpecifications | 0.6x | 1.5x | 1.0x |
  | compatibilityInfo | 0.4x | 2.0x | 1.0x |
  | socialProof | 1.4x | 0.8x | 1.0x |
  | certifications | 0.5x | 1.6x | 1.0x |
  | reviewCount | 1.4x | 0.8x | 1.0x |
  | reviewRating | 1.3x | 1.0x | 1.0x |
  | benefitStatements | 1.5x | 0.5x | 1.0x |
  | warrantyInfo | 0.7x | 1.4x | 1.0x |
  | comparisonContent | 0.6x | 1.4x | 1.0x |

**Rule 4: Product Schema Graduated Scoring**
- Description: Product Schema factor (30 max points) uses graduated scoring based on which fields are present, rather than binary pass/fail
- Logic:
  ```
  name: 6 pts | description: 5 pts | image: 5 pts | offers: 5 pts
  brand: 3 pts | identifiers (gtin/mpn/sku): 3 pts | rating: 3 pts
  Total internal = 30 pts → scaled to factor weight (30 relative points)
  ```
  Status thresholds: pass if score >= 80% of max, warning if >= 50%, fail below 50% or absent
- Edge cases: Both `Product` and `ProductGroup` schema types are accepted (case-insensitive). ProductGroup items may have GTIN/MPN on individual variants via `hasVariant[]` — extractor loops variants and uses the first non-null value.
- Source of truth: `scoreStructuredData()` in `src/scoring/scoring-engine.js`

**Rule 5: Apparel Category Detection and Adjustment**
- Description: Fashion/apparel products are detected heuristically and scored differently to avoid penalizing them for irrelevant factors
- Logic:
  ```
  isApparel = true if any of:
    1. Breadcrumb items match apparel keywords regex
    2. Product schema category matches apparel keywords regex
    3. Canonical URL path matches apparel keywords regex

  Keywords include: clothing, apparel, fashion, dress, shirt, pants, jeans,
    jacket, sweater, shoes, boots, sneakers, handbag, scarf, hat, gloves,
    belt, suit, blazer, coat, hoodie, legging, ... (English + French)

  When isApparel = true AND factor not present:
    - Warranty → scores as "pass" with "N/A for apparel"
    - Compatibility → scores as "pass" with "N/A for apparel"
    - Dimensions → scores as "pass" with "N/A for apparel"
    - Corresponding recommendations are suppressed
  ```
- Edge cases: If the product IS apparel but DOES have warranty/compatibility/dimensions info, the factor is scored normally (apparel exemption only applies when the data is missing). False positives possible with keywords like "athletic" on non-apparel equipment pages. No user override mechanism exists.
- Source of truth: `ScoringEngine.isLikelyApparel()` in `src/scoring/scoring-engine.js`

**Rule 6: og:image Format Verification (Three-Tier Detection)**
- Description: Determines whether the og:image is in a format renderable by LLM chat interfaces (JPEG/PNG/GIF = valid; WebP/AVIF/SVG = invalid)
- Logic:
  ```
  Tier 1: HTTP HEAD request → check Content-Type header
    image/jpeg, image/png, image/gif → valid
    image/webp → FAIL (critical)
    image/avif, image/svg → invalid

  Tier 2 (if Content-Type unhelpful or CORS blocked):
    GET with Range: bytes=0-16 → check magic bytes
    FF D8 FF → JPEG | 89 50 4E 47 → PNG | RIFF....WEBP → WebP
    47 49 46 → GIF | ....ftypavif → AVIF

  Tier 3 (if both network requests fail):
    Parse URL file extension
    .jpg/.jpeg/.png/.gif → valid | .webp → invalid
  ```
  Image size check: Content-Length < 5MB = valid size
- Edge cases: CDNs that serve WebP when Accept header includes `image/webp` but the og:image URL ends in `.jpg` — magic bytes detection catches this. CORS-blocked HEAD requests silently fall back to Tier 2. If all three tiers fail, format is "unknown" and the factor scores at 0 points.
- Source of truth: `verifyImageFormat()` and `detectFormatFromMagicBytes()` in `src/background/service-worker.js`

**Rule 7: robots.txt AI Crawler Rule Parsing**
- Description: Parses robots.txt to determine which of 15 major AI crawlers are blocked or allowed
- Logic:
  ```
  For each AI crawler in MAJOR_AI_CRAWLERS:
    1. Check if a specific User-agent section exists for this crawler
    2. If yes, check if Disallow: / or Disallow: /* is present
       without a counteracting Allow: / or Allow: /*
    3. If no specific section, check if wildcard User-agent: *
       has Disallow: / or Disallow: /*
    4. Crawler is "blocked" if explicitly disallowed or caught by wildcard
    5. Crawler is "allowed" if not blocked by any rule

  If robots.txt is inaccessible (404): all crawlers assumed allowed
  If robots.txt fetch fails (CORS/network): crawler rules unknown
  ```
- Edge cases: Case-insensitive matching on user-agent names. `Disallow:` with empty value (blank path) is not treated as blocking. Multiple User-agent sections for the same agent are accumulated, not overwritten.
- Source of truth: `fetchRobotsTxt()` and `parseRobotsTxt()` in `src/background/service-worker.js`

**Rule 8: Entity Consistency Scoring**
- Description: Measures how well the product name aligns across 4 page locations
- Logic:
  ```
  Reference name = Product schema name (required — if absent, factor scores 0)
  Check alignment in 4 locations (25% of max points each):
    1. H1 text — exact match OR contains/contained-by check (case-insensitive)
    2. og:title — exact match OR contains/contained-by check
    3. Meta description — contains the full name OR >= 60% of name words (>2 chars)
    4. Page title (document.title) — exact match OR contains/contained-by check

  Score = (matches / 4) × maxPoints
  Status: pass if >= 3 matches, warning if >= 2, fail if < 2
  ```
- Edge cases: Single-word product names will match more easily (contained-by check). Very long product names with brand + model + variant may produce false negatives if other elements use abbreviated versions. Meta description uses a word-level match (60% threshold) since descriptions often paraphrase rather than repeat the exact name.
- Source of truth: `scoreEntityConsistency()` in `src/scoring/scoring-engine.js`

**Rule 9: Answer-Format Content Detection**
- Description: Detects content patterns that LLMs use to formulate product recommendations
- Logic:
  ```
  4 signals checked (each worth 25% of max points):
    1. "Best for" statements (count > 0)
    2. Comparison content (vs., versus, compared to)
    3. How-to content (excluding size/fit/order/buy/care/return/shop/checkout/wash/clean)
    4. Use case statements (count > 0)

  Score = (signals / 4) × maxPoints
  Status: pass if >= 3, warning if >= 1, fail if 0
  ```
- Edge cases: "How to" exclusion list prevents false positives from size guides, return policies, and care instructions. "Best for" regex matches phrases like "perfect for," "ideal for," "great for" in addition to literal "best for."
- Source of truth: `scoreAnswerFormatContent()` in `src/scoring/scoring-engine.js`

**Rule 10: Recommendation Priority Matrix**
- Description: Each recommendation is assigned a priority (1-5) based on its impact and effort
- Logic:
  ```
               Low Effort    Medium Effort    High Effort
  High Impact    1 (do first)     2               3
  Medium Impact  2                3               4
  Low Impact     3                4               5 (do last)
  ```
  Recommendations are sorted by: priority ascending (1 first), then impact level (high before medium before low)
- Edge cases: Context can override impact level at runtime — e.g., compatibility recommendation is elevated to "high" impact in Need context. Apparel detection suppresses recommendations for warranty/compatibility/dimensions entirely. Duplicate recommendation guard: `faq-content-missing` is only emitted when FAQ count is 1-2; when count is 0, `faq-schema-and-content-missing` covers both.
- Source of truth: `PRIORITY_MATRIX` and `calculatePriority()` in `src/recommendations/recommendation-rules.js`

**Rule 11: Effort Level Classifications**
- Description: Three effort levels categorize implementation difficulty for each recommendation
- Logic:
  ```
  Low effort (1-4 hours): Schema markup, meta tags, image format change
  Medium effort (4-8 hours): FAQ section, expanded descriptions, specs table
  High effort (1+ weeks): Page restructure, review system, CMS changes
  ```
- Source of truth: `EFFORT_LEVELS` in `src/recommendations/recommendation-rules.js`

**Rule 12: JSON-LD @id Reference Resolution**
- Description: Resolves JSON-LD cross-references where a property value is an `@id` pointer to another node
- Logic:
  ```
  1. Build an idIndex: for each item in a JSON-LD block, if item has @id, store idIndex[@id] = item
  2. When reading a property (e.g., aggregateRating), if the value is {"@id": "#something"},
     look up idIndex["#something"] and use the resolved object
  ```
- Edge cases: Shopify commonly uses this for AggregateRating: `"aggregateRating": {"@id": "#reviews"}` pointing to a standalone AggregateRating node elsewhere in the same `@graph`. Both `categorizeSchemas()` and `extractReviewSignals()` independently build and use `idIndex`. If the referenced `@id` doesn't exist in the index, the property is treated as absent.
- Source of truth: `categorizeSchemas()` and `extractReviewSignals()` in `src/content/content-script.js`

**Rule 13: Canonical URL Validation**
- Description: Validates canonical URL with special handling for Shopify collection-to-product patterns
- Logic:
  ```
  canonicalIsValid = matchesCurrentUrl OR isProductCanonical

  matchesCurrentUrl: normalized canonical URL === normalized current URL
  isProductCanonical: current URL path ends with the canonical URL path
    (covers Shopify /collections/X/products/Y → canonical /products/Y)

  Both conditions score as "pass" for the Canonical URL factor
  ```
- Edge cases: Shopify stores display products at `/collections/{collection}/products/{slug}` but set canonical to `/products/{slug}`. Without the `isProductCanonical` check, this common pattern would fail.
- Source of truth: `isCanonicalForCurrentUrl()` in `src/content/content-script.js`, `scoreProtocolMeta()` in `src/scoring/scoring-engine.js`

**Rule 14: Race Condition Prevention**
- Description: Prevents stale analysis results from overwriting current results when the user triggers a new analysis before the previous one completes
- Logic:
  ```
  1. startAnalysis() generates requestId = timestamp + random string
  2. requestId sent to content script in EXTRACT_DATA message
  3. Content script echoes requestId in EXTRACTION_COMPLETE response
  4. Side panel ignores any EXTRACTION_COMPLETE where message.requestId !== currentRequestId
  5. 10-second timeout fires if no valid response received
  ```
- Edge cases: Rapid re-analysis (clicking context buttons quickly) correctly discards all but the most recent request. Timeout only triggers if the request ID still matches AND no data has been received.
- Source of truth: `startAnalysis()` and `setupMessageListener()` in `src/sidepanel/sidepanel.js`

**Rule 15: Storage Quota Management**
- Description: Prevents exceeding Chrome's 10MB storage quota with automatic pruning
- Logic:
  ```
  Before each save:
    1. Check current bytes used via chrome.storage.local.getBytesInUse()
    2. If usage >= 80% of 10MB (QUOTA_WARNING_THRESHOLD = 0.8):
       Remove oldest 20% of entries (Math.floor(history.length * 0.2))
    3. After save, trim history array to MAX_HISTORY = 100 entries
  ```
- Edge cases: If storage is exactly at 80%, pruning triggers. If history has fewer than 5 entries and quota is hit, at least 1 entry is removed (`Math.max(1, ...)`). Pruning operates on array position (oldest = last in array since newest is prepended), not timestamp.
- Source of truth: `pruneIfNearQuota()` and `saveAnalysis()` in `src/storage/storage-manager.js`

**Rule 16: Citation Opportunity Map Generation**
- Description: Rule-based engine that maps failing AI Readiness factors to specific conversational query patterns that the page cannot currently answer. Appears only in the AI Visibility tab and the AI Readiness section of the HTML report.
- Logic:
  ```
  1. For each AI Readiness factor that is failing or warning,
     look up matching query templates in citation-opportunities.js
  2. Personalize templates with product name, brand, and category
     extracted via extractProductIntelligence()
  3. Group results:
     - "High-value queries you're missing" (failing factors, high weight)
     - "Queries you partially cover" (warning factors)
     - "Queries you're well-positioned for" (passing factors)
  ```
- Edge cases: No LLM required — entirely rule-based. Templates that cannot be personalized (missing product name/brand) fall back to generic placeholders. Does not appear in PDP Quality or SEO Quality tabs or report sections.
- Source of truth: `CitationOpportunityEngine` in `src/recommendations/citation-opportunities.js`

**Rule 17: Content-to-Citation Roadmap Generation**
- Description: Maps specific content gaps to the LLM citation opportunities they would unlock if filled. Presented as a 3-tier prioritized roadmap in the AI Visibility tab and AI Readiness report section.
- Logic:
  ```
  5 content blocks evaluated in 3 tiers:

  Tier 1 — Quick Wins (1–2 weeks):
    Description block:
      missing  → contentQuality.description.wordCount < 50
      partial  → wordCount 50–149
      present  → wordCount >= 150
    Styling block (apparel-gated):
      present  → feature text contains 2+ styling phrases
      missing  → otherwise

  Tier 2 — Medium Priority (2–4 weeks):
    FAQ block:
      present  → faq.found AND (faq.count >= 3 OR faq schema array non-empty)
      partial  → faq.found AND count 1–2
      missing  → not found
    Fabric & Care block (apparel-gated):
      present  → productDetails.hasMaterials AND feature text contains care keywords
      missing  → otherwise

  Tier 3 — Content Investment (4–8 weeks):
    Inline Reviews block:
      null     → reviews.count === 0 (block excluded entirely)
      present  → reviews.count > 0 AND jsDependency !== 'high'
      missing  → reviews.count > 0 AND jsDependency === 'high'

  Guard behavior:
    - Apparel-gated blocks (Styling, Fabric & Care) return null if !isLikelyApparel
    - Present blocks are excluded from output tiers
    - Tiers with no remaining blocks are omitted
    - When all tiers empty: summary = "Content foundation is strong"
  ```
- Edge cases: Apparel detection follows the same `ScoringEngine.isLikelyApparel()` heuristic used by scoring. Non-apparel products never see Styling or Fabric & Care blocks. Product name/brand personalization via `extractProductIntelligence()` imported from `citation-opportunities.js`.
- Source of truth: `CitationRoadmapEngine` in `src/recommendations/citation-roadmap.js`

### 2.3 Output Requirements

| Output | Format | Destination | Frequency |
|--------|--------|------------|-----------|
| Analysis results | Rendered UI (DOM) in Chrome side panel | Side panel | On-demand, per user-initiated analysis |
| HTML report | Self-contained HTML file with inline CSS, base64-embedded logo, SVG gauge | Browser download | On-demand, user clicks "Download Report" |
| JSON data export | JSON file with full extraction data, scoring, and recommendations | Browser download | On-demand, user clicks "Download Analysis Data" |
| History entry | Compact JSON object (2-4KB) | `chrome.storage.local` under key `analysisHistory` | Automatically after each analysis |

**HTML Report Structure:**
```
Self-contained HTML file (~50-100KB)
├── <head>
│   ├── Inline CSS (all styles embedded, no external references)
│   └── Meta tags (charset, viewport)
├── <body>
│   ├── Header
│   │   ├── Tribbute logo (base64-embedded PNG)
│   │   └── Report title with page domain
│   ├── Executive Summary
│   │   ├── Score gauge (inline SVG ring chart)
│   │   ├── Letter grade + numeric score
│   │   ├── Context label (Want/Need/Hybrid)
│   │   └── Grade legend table (A-F with descriptions)
│   ├── Category Breakdown
│   │   └── Per-category: name, score, pass/fail counts, factor list with status badges
│   ├── Recommendations (grouped)
│   │   ├── Quick Wins (high/medium impact + low effort)
│   │   ├── Medium Priority
│   │   └── Nice to Have
│   │   └── Each recommendation: title, description, impact badge, effort badge
│   ├── Citation Opportunity Map (AI Readiness section only)
│   │   ├── High-value queries missing (failing AI Readiness factors)
│   │   ├── Queries partially covered (warning factors)
│   │   └── Queries well-positioned for (passing factors)
│   ├── Content-to-Citation Roadmap (AI Readiness section only)
│   │   ├── Amber-bordered section rendered by buildCitationRoadmapSection()
│   │   ├── Tier 1: Quick Wins (Description, Styling if apparel)
│   │   ├── Tier 2: Medium Priority (FAQ, Fabric & Care if apparel)
│   │   ├── Tier 3: Content Investment (Inline Reviews if reviews exist)
│   │   └── "Content foundation is strong" message when all blocks present
│   ├── Footer
│   │   ├── Report ID (unique per report)
│   │   ├── Generated timestamp
│   │   └── Tribbute branding with UTM-tracked link
│   └── No external scripts, stylesheets, or images (fully self-contained)
```

**JSON Export Structure:**
```json
{
  "exportedAt": "ISO 8601 timestamp",
  "pageUrl": "full URL",
  "pageTitle": "page title",
  "domain": "hostname",
  "context": "want|need|hybrid",
  "extraction": { /* full extractedData object — see Architecture doc §3.1 */ },
  "scoring": {
    "totalScore": 0-100,
    "grade": "A-F",
    "gradeDescription": "string",
    "context": "want|need|hybrid",
    "categoryScores": {
      "[categoryKey]": {
        "score": 0-100,
        "maxScore": 100,
        "categoryName": "string",
        "weight": 0.0-1.0,
        "factors": [
          {
            "name": "string",
            "status": "pass|warning|fail",
            "points": 0-N,
            "maxPoints": N,
            "critical": true|undefined,
            "contextual": true|undefined,
            "details": "string"
          }
        ]
      }
    },
    "jsDependent": true|false,
    "timestamp": "ISO 8601"
  },
  "recommendations": [
    {
      "id": "template-id",
      "title": "string",
      "description": "string",
      "impact": "high|medium|low",
      "effort": "low|medium|high",
      "category": "categoryKey",
      "priority": 1-5,
      "implementation": "string"
    }
  ]
}
```

## 3. Non-Functional Requirements

| Category | Requirement | Target | Notes |
|----------|------------|--------|-------|
| Performance | End-to-end analysis time | < 2 seconds typical, < 10 seconds maximum (timeout) | DOM extraction: 300-500ms, network enrichment: 100-500ms (parallel), scoring: <100ms, rendering: <50ms |
| Performance | Extension unpacked size | < 500KB | Currently ~300KB; no npm dependencies, no bundled frameworks |
| Performance | Memory usage during analysis | < 5MB active | Extraction data (~500KB) is in-memory only and discarded after results render |
| Reliability | Analysis completion rate | > 95% on standard eCommerce platforms | Content script runs at `document_idle`; pages that load content exclusively via client-side rendering after idle may produce understated scores (warning banner shown) |
| Reliability | Graceful degradation on network failures | All network fetches optional | Analysis completes with reduced scoring if robots.txt, og:image HEAD, llms.txt, or Last-Modified requests fail |
| Storage | History capacity | 100 entries, ~200-400KB | Auto-pruning at 80% of 10MB quota; compact entries only (2-4KB each) |
| Compatibility | Browser | Chrome desktop, version 114+ | Side Panel API requires Chrome 114; no Firefox, Safari, or mobile support |
| Compatibility | eCommerce platforms | Shopify, BigCommerce, WooCommerce, Magento, custom builds, major retailers (Walmart, Canadian Tire) | Platform-specific selectors for features extraction; Shopify ProductGroup and @id resolution |
| Privacy | Data transmission | Zero bytes sent to external servers | All analysis local; network requests only to the site being analyzed |
| Security | Content Security Policy | `script-src 'self'; object-src 'self';` | No inline scripts, no eval(), no external script sources |
| Security | Input sanitization | All user-controlled strings escaped before DOM insertion | `escapeHtml()` in sidepanel.js, `esc()` in report-template.js |

## 4. User Flows

### Flow 1: First-Time Analysis

```
Step 1: User navigates to a product page in Chrome
Step 2: User clicks the pdpIQ extension icon in the toolbar
Step 3: Side panel opens showing context selector with 3 buttons
        → Page domain is displayed in the header
Step 4: User clicks one of: Want / Need / Hybrid
Step 5: System shows loading spinner ("Analyzing page...")
        → Generates unique requestId
        → Sets 10-second timeout
Step 6: Content script extracts all signals from the page DOM
        → JSON-LD parsing (all <script type="application/ld+json">)
        → Microdata parsing ([itemscope] elements)
        → Meta tag extraction (OG, Twitter, canonical, robots, hreflang)
        → Content quality analysis (description, specs, features, FAQ, product details)
        → Content structure analysis (headings, semantic HTML, images, JS dependency)
        → Trust signal extraction (reviews, brand, certifications, awards)
        → AI discoverability signals (entity consistency, answer-format, identifiers)
Step 7: Content script returns EXTRACTION_COMPLETE with data and requestId
Step 8: Side panel verifies requestId matches, clears timeout
Step 9: Side panel requests network enrichment from service worker (parallel):
        → VERIFY_IMAGE_FORMAT: HEAD to og:image URL
        → FETCH_ROBOTS_TXT: GET {origin}/robots.txt
        → FETCH_LLMS_TXT: HEAD {origin}/llms.txt and /llms-full.txt
        → FETCH_LAST_MODIFIED: HEAD page URL
Step 10: ScoringEngine calculates 6 category scores + weighted total
Step 11: RecommendationEngine generates prioritized recommendations
Step 12: Side panel renders results:
         → Grade badge (colored A-F)
         → Numeric score (0-100)
         → Context label
         → JS dependency warning banner (if applicable)
         → 6 expandable category cards with per-factor detail
         → Top 10 recommendations with impact/effort badges
         → Action buttons: Re-analyze, Download Report, Download Analysis Data
Step 13: Analysis auto-saved to chrome.storage.local
Step 14: History tab updated with new entry
```

**Error States:**
- If content script not loaded (page not refreshed after extension install): "Content script not loaded. Refresh the page and try again."
- If no active tab found: "No active tab found"
- If analysis times out (10 seconds, no EXTRACTION_COMPLETE received): "Analysis timed out. Please try again."
- If scoring or rendering throws: "Error processing analysis results: [error message]"
- All error states show an error icon, message text, and a "Try Again" button that returns to context selector

### Flow 2: History and Comparison

```
Step 1: User clicks "History" tab in bottom navigation
Step 2: System shows list of up to 20 recent analyses (newest first)
        → Each entry shows: grade badge (colored), title, domain, time ago, score
        → If no history: shows empty state message
Step 3: User clicks on one history entry
        → Entry highlights as selected
        → "Select one more to compare" hint appears
Step 4: User clicks on a second history entry
        → Second entry highlights
        → "Compare (2)" button appears
Step 5: User clicks "Compare (2)"
Step 6: System renders side-by-side comparison:
        → Column A: domain, title, grade, score, 6 category scores
        → Column B: domain, title, grade, score, 6 category scores
        → Category scores colored: green (80+), yellow (60-79), red (<60)
Step 7: User clicks "Back to History" to return to list
```

**Error States:**
- If a selected history entry no longer exists in storage (pruned): comparison view filters it out and shows only valid entries
- If user tries to select more than 2: oldest selection is replaced (FIFO)

### Flow 3: Re-Analysis with Different Context

```
Step 1: User is viewing analysis results
Step 2: User clicks "Re-analyze with Different Context" button
Step 3: System returns to context selector (previous results still in memory)
Step 4: User selects a different context
Step 5: System runs full analysis again (new extraction + new scoring with different multipliers)
Step 6: New results displayed, replacing previous
Step 7: New analysis saved to history (previous analysis also retained in history)
```

### Flow 4: Export

```
Step 1: User is viewing analysis results
Step 2a: User clicks "Download Report"
  → System generates self-contained HTML via generateHtmlReport()
  → Browser downloads file as pdpiq-report-{domain}-{date}.html
Step 2b: User clicks "Download Analysis Data"
  → System serializes extraction + scoring + recommendations as JSON
  → Browser downloads file as pdpiq-{domain}-{date}.json
```

## 5. Configuration & Parameters

| Parameter | Default | Valid Range | Description | Where Set |
|-----------|---------|-------------|-------------|-----------|
| `DEBUG` | `false` | `true` / `false` | Enables verbose console.log output in each source file | Hardcoded constant at top of each `.js` file |
| `MAX_HISTORY` | `100` | Any positive integer | Maximum number of analysis entries retained in storage | `src/storage/storage-manager.js` |
| `STORAGE_QUOTA_BYTES` | `10485760` (10MB) | Chrome-imposed limit | Maximum bytes for `chrome.storage.local` | `src/storage/storage-manager.js` |
| `QUOTA_WARNING_THRESHOLD` | `0.8` | 0.0 - 1.0 | Storage usage ratio that triggers auto-pruning of oldest entries | `src/storage/storage-manager.js` |
| `CATEGORY_WEIGHTS` | See §2.2 Rule 1 | Must sum to 1.0 | Relative importance of each scoring category | `src/scoring/weights.js` |
| `FACTOR_WEIGHTS` | See Architecture doc §3.2 | Relative points within category (sum to ~100) | Relative importance of each factor within its category | `src/scoring/weights.js` |
| `CONTEXT_MULTIPLIERS` | See §2.2 Rule 3 | 0.0+ (typically 0.4 - 2.0) | Per-context adjustment multipliers for context-sensitive factors | `src/scoring/weights.js` |
| `GRADE_THRESHOLDS` | A:90, B:80, C:70, D:60, F:0 | Integer boundaries | Score thresholds for letter grade assignment | `src/scoring/weights.js` |
| `AI_CRAWLERS` | 15 crawlers (see Architecture doc §5 ADR-007) | Map of crawler names to company/product | AI crawlers monitored in robots.txt analysis | `src/background/service-worker.js` |
| Analysis timeout | `10000` (10 seconds) | Milliseconds | Time before showing "Analysis timed out" if no response | `src/sidepanel/sidepanel.js` → `startAnalysis()` |
| History display limit | `20` | Positive integer | Number of history entries shown in the UI (storage holds up to 100) | `src/sidepanel/sidepanel.js` → `loadHistory()` |
| Side panel recommendation limit | `10` | Positive integer | Number of recommendations displayed in side panel (full list in report) | `src/sidepanel/sidepanel.js` → `renderRecommendations()` |

## 6. Edge Cases & Boundary Conditions

| Scenario | Expected Behavior | Handled? | Notes |
|----------|------------------|----------|-------|
| Shopify ProductGroup instead of Product schema | Treated identically to Product; GTIN/MPN extracted from `hasVariant[]` if not on top-level | Yes | `categorizeSchemas()` matches `type === 'productgroup'` case-insensitively |
| JSON-LD `@id` references (e.g., `"aggregateRating": {"@id": "#reviews"}`) | Resolved via `idIndex` lookup before reading property values | Yes | Both `categorizeSchemas()` and `extractReviewSignals()` build separate `idIndex` maps |
| Multiple H1 tags on page | H1 factor scores as "warning" (50% of max points); shows count in details | Yes | `hasSingleH1` check gives full points only when exactly 1 H1 |
| JavaScript-rendered page (React/Vue SPA) | JS dependency factor scores as "fail"; `jsDependent: true` flag triggers warning banner in UI | Yes | Warning text: "JS-rendered page — content scores may be understated" |
| Apparel product page | Warranty, compatibility, and dimensions factors score as "pass" with "N/A for apparel" when data is absent | Yes | Heuristic detection via breadcrumbs, schema category, URL path (English + French keywords) |
| Shopify collection URL with product canonical | Both `matchesCurrentUrl` and `isProductCanonical` treated as valid canonical | Yes | `isCanonicalForCurrentUrl()` checks if current path ends with canonical path |
| og:image served as WebP despite .jpg URL extension | Detected via Content-Type header (Tier 1) or magic bytes (Tier 2) | Yes | Three-tier detection prevents CDN content-negotiation from hiding WebP |
| robots.txt returns 404 | All AI crawlers assumed allowed (no restrictions) | Yes | Score reflects "allowed" status |
| robots.txt blocked by CORS | Crawler rules returned as unknown; `allowedCrawlers` and `blockedCrawlers` both empty | Yes | Factor scores conservatively (0 points) |
| Page behind authentication (login wall) | Content script extracts whatever is in the DOM (likely a login form); scores will be very low | Partially | No special handling; user will see low scores. [FLAG: No warning is shown for login/auth pages] |
| Empty or malformed JSON-LD | Invalid JSON-LD blocks silently skipped; extraction continues with remaining blocks | Yes | `try/catch` around `JSON.parse()` in `getParsedJsonLd()` |
| Non-eCommerce page (blog post, homepage) | Analysis runs normally but scores very low (no Product schema, no offer, etc.) | Partially | No guard preventing analysis on non-product pages. [FLAG: No explicit warning for non-product pages] |
| User triggers analysis, then quickly triggers another | First request's `requestId` is superseded; stale `EXTRACTION_COMPLETE` responses are ignored | Yes | Race condition prevention via `currentRequestId` matching |
| chrome.storage.local quota approaching 10MB | Oldest 20% of entries auto-pruned when usage reaches 80% | Yes | `pruneIfNearQuota()` runs before each save |
| Product name in non-Latin script (Japanese, Korean, Arabic) | Entity consistency check uses `toLowerCase()` + `includes()` — works for Unicode but may produce unexpected results with scripts that don't have case | Partially | Case-insensitive comparison may not be meaningful for CJK characters, but `includes()` still works for exact substring matching |
| og:image URL is data: URI or blob: URL | Rejected by `isSafeUrl()` (only http/https allowed); format scored as "unknown" | Yes | |
| Very long page with 100+ images | Image alt coverage calculated across all images; may take slightly longer but no functional issue | Yes | `altCoverage` is a ratio (0.0-1.0), so scales naturally |
| Page with no meta tags at all | All Protocol & Meta factors score 0; category score = 0; weighted contribution = 0 | Yes | Analysis continues; recommendations generated for all missing tags |
| Multiple JSON-LD blocks on same page | All blocks parsed and schemas extracted from each; `categorizeSchemas()` handles `@graph`, arrays, and single objects | Yes | Cached via `getParsedJsonLd()` to avoid re-parsing |
| Certification text contains negation ("Not FDA approved") | Negative-context guards in regex prevent false positive match | Yes | Patterns exclude "not," "pending," "void the," etc. |
| Description found only in schema (not in DOM) | Schema fallback used; `source: 'schema'` reported in details | Yes | `analyzeDescription()` tries CSS selectors first, then `extractDescriptionFromSchema()` |

## 7. Data Dictionary

| Term | Definition | Calculation (if applicable) | Units |
|------|-----------|---------------------------|-------|
| Overall Score | Weighted composite score representing AI citation readiness of a product page | Weighted sum of 6 category scores × category weights (see §2.2 Rule 1) | 0-100 (integer) |
| Grade | Letter classification of overall score | A: ≥90, B: ≥80, C: ≥70, D: ≥60, F: <60 | A, B, C, D, or F |
| Category Score | Score for one of the 6 scoring dimensions | Sum of factor points within that category, based on 100 relative points | 0-100 (integer) |
| Factor Score | Points earned by a single evaluation criterion | Factor-specific logic (binary, graduated, or multiplied); capped at factor's max points | 0 to maxPoints |
| Factor Status | Assessment result for a single factor | "pass" (meets threshold), "warning" (partial), or "fail" (does not meet threshold) | pass, warning, fail |
| Context | Purchase motivation classification selected by the user | User selection from 3 options | "want", "need", or "hybrid" |
| Context Multiplier | Weight adjustment applied to context-sensitive factors | Multiplied against factor's raw score before category aggregation | 0.4x - 2.0x |
| Priority | Recommendation urgency ranking | `PRIORITY_MATRIX[impact][effort]` | 1 (highest) to 5 (lowest) |
| Impact | Estimated effect of fixing an issue on AI citation readiness | Assigned per recommendation template (high, medium, low) | high, medium, low |
| Effort | Estimated implementation time for a recommendation | Low: 1-4 hours, Medium: 4-8 hours, High: 1+ weeks | low, medium, high |
| Quick Win | Recommendation with high/medium impact and low effort | `impact ∈ {high, medium} AND effort = low` | Boolean classification |
| Entity Consistency | Degree to which product name aligns across page elements | Matches in 4 locations (schema, H1, og:title, meta desc, page title) ÷ 4 | 0-4 matches |
| AI Crawler Access | Proportion of major AI crawlers allowed by robots.txt | Allowed crawlers ÷ total major crawlers (15) | 0.0 - 1.0 ratio |
| Apparel Detection | Heuristic classification of whether a product is fashion/apparel | Keyword regex match against breadcrumbs, schema category, or URL path | Boolean |
| Content Freshness | Age of the page content based on schema date signals | `Date.now() - dateModified (or datePublished)` | Days (pass if ≤ 90) |
| Review Count Status | Assessment of review volume adequacy | Pass: ≥25 reviews, Warning: 5-24, Fail: <5 | pass, warning, fail |
| Review Recency | Whether reviews are recent enough to be relevant | Recent: within 6 months of analysis date | Boolean |
| Specification Detail | Quality of technical specifications | Fraction of specs with measurement units; Pass: ≥30%, Warning: >0%, Fail: 0% | Ratio |
| Image Alt Coverage | Proportion of images with descriptive alt text | Images with non-empty alt ÷ total images | 0.0 - 1.0 ratio |
| Readability | Text clarity score based on simplified Flesch Reading Ease | Calculated from syllable count, word count, sentence count (spec-like tokens filtered) | 0-100 (pass: ≥60) |
| JS Dependency Level | Assessment of page reliance on client-side JavaScript rendering | Framework detection (React, Vue, etc.) + render analysis | "low", "medium", "high" |
| requestId | Unique identifier for an analysis request to prevent race conditions | `Date.now() + '-' + Math.random().toString(36).substr(2,9)` | String |
| History Entry | Compact record of a completed analysis saved to local storage | Subset of analysis result: URL, title, domain, score, grade, context, category scores, rec count, critical count | ~2-4KB JSON object |

---

_This specification should be updated when business logic or requirements change. Last reviewed: 2026-03-20._
