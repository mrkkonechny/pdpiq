# Test Plan

> **PDS Document 05** | Last Updated: 2026-03-01

---

## 1. Test Strategy

**Testing Approach:** No automated test framework exists yet. All testing is currently manual — load the extension, navigate to eCommerce PDPs, and verify scoring output. This document defines the test cases that should be automated and the manual tests that cover UI and integration flows.

**Test Framework:** None yet. Recommended: Vitest or Jest with jsdom for unit testing pure-logic modules (scoring engine, weights, storage manager, recommendation engine). Chrome Extension Testing Library or Puppeteer for integration tests.

**Coverage Target:** 100% branch coverage on `scoring-engine.js` and `weights.js` (critical business logic). 90%+ on `recommendation-engine.js` and `storage-manager.js`. Manual coverage for Chrome-dependent code (service worker, content script, side panel).

**What MUST be tested (critical paths):**
- Score calculation accuracy across all 6 categories (56 factors)
- Grade threshold boundaries (A: 90, B: 80, C: 70, D: 60, F: <60)
- Context multiplier application (Want/Need/Hybrid)
- Apparel detection and N/A handling for warranty/compatibility/dimensions
- og:image WebP detection (three-tier: Content-Type → magic bytes → URL extension)
- robots.txt parsing and AI crawler blocked/allowed classification
- Storage quota management and auto-pruning at 80% capacity
- Recommendation deduplication (FAQ schema+content guard)
- Request ID race condition prevention

**What CAN be tested manually (lower risk):**
- Side panel UI layout and grade color rendering
- HTML report formatting and branding
- History list display and comparison view
- Context selector button toggling
- Export file content and naming

**What is NOT tested and why:**
- Third-party website DOM structures — we test our extraction handlers, not their HTML
- Chrome API behavior — `chrome.storage.local`, `chrome.sidePanel`, `chrome.runtime.sendMessage` are mocked in unit tests
- Network latency/reliability of external fetches — we test our timeout and fallback handling

## 2. Unit Tests

### Module: ScoringEngine (`scoring-engine.js`)

| Test ID | Function/Method | Test Description | Input | Expected Output | Status |
|---------|----------------|-----------------|-------|----------------|--------|
| UT-001 | `calculateScore()` | Full score with complete data returns A grade | Complete extractedData with all schemas, rich content, 50+ reviews | totalScore ≥ 90, grade = 'A' | Not Written |
| UT-002 | `calculateScore()` | Empty extracted data returns F grade | `{}` (empty object) | totalScore < 60, grade = 'F' | Not Written |
| UT-003 | `calculateScore()` | Weighted total equals sum of (category score × weight) | Known category scores | totalScore = Math.round(sum of products) | Not Written |
| UT-004 | `calculateScore()` | jsDependent flag set when dependency level is 'high' | extractedData with jsDependency.dependencyLevel = 'high' | result.jsDependent = true | Not Written |
| UT-005 | `calculateScore()` | jsDependent flag false when dependency level is 'low' | extractedData with jsDependency.dependencyLevel = 'low' | result.jsDependent = false | Not Written |
| UT-006 | `scoreStructuredData()` | Product schema graduated scoring — all 7 fields present | product with name, description, image, hasOffer, brand, gtin, hasRating | productScore = 30 points (full marks) | Not Written |
| UT-007 | `scoreStructuredData()` | Product schema graduated scoring — only name present | product with name only | productScore = Math.round((6/30) × 30) = 6 points | Not Written |
| UT-008 | `scoreStructuredData()` | Missing product schema scores 0 | structuredData.schemas.product = null | productScore = 0, status = 'fail' | Not Written |
| UT-009 | `scoreStructuredData()` | Offer schema binary — present scores full, missing scores 0 | schemas.offer = null vs schemas.offer = {} | 0 vs 20 points | Not Written |
| UT-010 | `scoreStructuredData()` | FAQ schema requires questionCount > 0 | schemas.faq = { questionCount: 0 } | faqScore = 0 | Not Written |
| UT-011 | `scoreStructuredData()` | Organization schema accepts brand as fallback | schemas.organization = null, schemas.brand = { name: 'Test' } | orgScore = 5 (pass) | Not Written |
| UT-012 | `scoreProtocolMeta()` | WebP og:image via verification fails with 0 points | imageVerification = { isWebP: true } | imageFormatScore = 0, status = 'fail' | Not Written |
| UT-013 | `scoreProtocolMeta()` | JPEG og:image via verification scores full points | imageVerification = { isValidFormat: true, format: 'jpeg' } | imageFormatScore = 15 | Not Written |
| UT-014 | `scoreProtocolMeta()` | Unknown format via verification scores half points | imageVerification = { isWebP: false, isValidFormat: false, format: 'unknown' } | imageFormatScore = 7 (half), status = 'warning' | Not Written |
| UT-015 | `scoreProtocolMeta()` | WebP URL fallback when no verification | og.image = 'https://example.com/img.webp', imageVerification = null | imageFormatScore = 0, status = 'fail' | Not Written |
| UT-016 | `scoreProtocolMeta()` | og:title optimal length (≤60 chars) scores full | og.title = 'Product Name' (12 chars) | score = 10, status = 'pass' | Not Written |
| UT-017 | `scoreProtocolMeta()` | og:title over 60 chars scores 70% | og.title = 'A'.repeat(61) | score = 7, status = 'warning' | Not Written |
| UT-018 | `scoreProtocolMeta()` | og:description optimal (100-200 chars) scores full | og.description = 'A'.repeat(150) | score = 10, status = 'pass' | Not Written |
| UT-019 | `scoreProtocolMeta()` | og:type accepts 'product', 'og:product', 'product.item' | og.type = 'product.item' | ogTypeScore = 5, status = 'pass' | Not Written |
| UT-020 | `scoreProtocolMeta()` | Twitter Card 'summary_large_image' scores full | twitter.card = 'summary_large_image' | twitterScore = 10 | Not Written |
| UT-021 | `scoreProtocolMeta()` | Twitter Card 'summary' scores 70% | twitter.card = 'summary' | twitterScore = 7, status = 'warning' | Not Written |
| UT-022 | `scoreProtocolMeta()` | Canonical with isProductCanonical = true passes | canonical.present = true, matchesCurrentUrl = false, isProductCanonical = true | status = 'pass' | Not Written |
| UT-023 | `scoreProtocolMeta()` | Meta description optimal (120-160 chars) scores full | standard.description = 'A'.repeat(140) | metaDescScore = 10, status = 'pass' | Not Written |
| UT-024 | `scoreProtocolMeta()` | Robots noindex blocks with critical flag | robots.isBlocked = true | robotsScore = 0, critical = true | Not Written |
| UT-025 | `scoreContentQuality()` | Description 100+ words scores pass | desc.wordCount = 150 | status = 'pass' | Not Written |
| UT-026 | `scoreContentQuality()` | Description 50-99 words scores warning | desc.wordCount = 75 | status = 'warning' | Not Written |
| UT-027 | `scoreContentQuality()` | Description <50 words scores fail | desc.wordCount = 30 | status = 'fail' | Not Written |
| UT-028 | `scoreContentQuality()` | Context multiplier applied to description quality — Want boosts emotional | context = 'want', desc with hasBenefitStatements = true | emotionalBenefitCopy multiplier = 1.5× | Not Written |
| UT-029 | `scoreContentQuality()` | Spec count ≥5 passes, <3 fails | specs.count = 2 | status = 'fail' | Not Written |
| UT-030 | `scoreContentQuality()` | Specification detail — ≥30% with units passes | specs.items = [{hasUnit:true}, {hasUnit:true}, {hasUnit:false}] | status = 'pass' (67% > 30%) | Not Written |
| UT-031 | `scoreContentQuality()` | Apparel product: warranty scores N/A pass | isLikelyApparel = true, hasWarranty = false | warrantyStatus = 'pass', details contains 'N/A for apparel' | Not Written |
| UT-032 | `scoreContentQuality()` | Apparel product: compatibility scores N/A pass | isLikelyApparel = true, hasCompatibility = false | compatStatus = 'pass', details contains 'N/A for apparel' | Not Written |
| UT-033 | `scoreContentQuality()` | Apparel product: dimensions scores N/A pass | isLikelyApparel = true, hasDimensions = false | dimensionsStatus = 'pass', details contains 'N/A for apparel' | Not Written |
| UT-034 | `scoreContentQuality()` | Comparison content reads from aiSignals.answerFormat.hasComparison | aiSignals.answerFormat.hasComparison = true | comparisonStatus = 'pass' | Not Written |
| UT-035 | `scoreContentStructure()` | Single H1 scores full 15 points | headings.hasSingleH1 = true | h1Score = 15, status = 'pass' | Not Written |
| UT-036 | `scoreContentStructure()` | Multiple H1s scores half | headings.hasH1 = true, hasSingleH1 = false | h1Score = 7.5, status = 'warning' | Not Written |
| UT-037 | `scoreContentStructure()` | No H1 scores 0 | headings.hasH1 = false | h1Score = 0, status = 'fail' | Not Written |
| UT-038 | `scoreContentStructure()` | Image alt coverage 90%+ passes | images.altCoverage = 0.95 | status = 'pass' | Not Written |
| UT-039 | `scoreContentStructure()` | Image alt coverage 50-89% warns | images.altCoverage = 0.6 | status = 'warning' | Not Written |
| UT-040 | `scoreContentStructure()` | Readability ≥60 passes, 40-59 warns, <40 fails | textMetrics.readabilityScore = 45 | status = 'warning' | Not Written |
| UT-041 | `scoreContentStructure()` | Null readability score returns 'fail' | textMetrics = null | readabilityStatus = 'fail' | Not Written |
| UT-042 | `scoreContentStructure()` | JS dependency 'high' fails, 'low' passes | jsDependency.dependencyLevel = 'high' | status = 'fail' | Not Written |
| UT-043 | `scoreAuthorityTrust()` | Review count ≥25 passes | reviews.count = 30 | status = 'pass' | Not Written |
| UT-044 | `scoreAuthorityTrust()` | Review count 5-24 warns | reviews.count = 15 | status = 'warning' | Not Written |
| UT-045 | `scoreAuthorityTrust()` | Review count <5 fails | reviews.count = 2 | status = 'fail' | Not Written |
| UT-046 | `scoreAuthorityTrust()` | Average rating ≥4.0 passes, ≥3.5 warns, <3.5 fails | reviews.averageRating = 3.8 | status = 'warning' | Not Written |
| UT-047 | `scoreAuthorityTrust()` | Review recency — recent reviews = true scores full | reviews.hasRecentReviews = true | recencyScore = 12, status = 'pass' | Not Written |
| UT-048 | `scoreAuthorityTrust()` | Review recency — outdated reviews scores half | reviews.hasRecentReviews = false, reviews.count > 0 | recencyScore = 6, status = 'warning' | Not Written |
| UT-049 | `scoreAuthorityTrust()` | Content freshness — updated within 90 days passes | schemaDate.dateModified = recent ISO date | freshnessStatus = 'pass' | Not Written |
| UT-050 | `scoreAuthorityTrust()` | Content freshness — older than 90 days warns | schemaDate.dateModified = 6 months ago | freshnessStatus = 'warning' | Not Written |
| UT-051 | `scoreAIDiscoverability()` | Entity consistency — name in 3/4 locations passes | Product name found in H1, og:title, meta desc | status = 'pass' | Not Written |
| UT-052 | `scoreAIDiscoverability()` | Entity consistency — name in 1/4 locations fails | Product name only in H1 | status = 'fail' | Not Written |
| UT-053 | `scoreAIDiscoverability()` | Entity consistency — no product name = 0 points | schemas.product.name = undefined | score = 0, status = 'fail' | Not Written |
| UT-054 | `scoreAIDiscoverability()` | Answer-format: 3+ signals passes | bestForCount > 0, hasComparison, hasHowTo | status = 'pass' | Not Written |
| UT-055 | `scoreAIDiscoverability()` | Product identifiers — 2+ identifiers = full points | product.gtin + product.mpn | score = 15, status = 'pass' | Not Written |
| UT-056 | `scoreAIDiscoverability()` | Product identifiers — 1 identifier = half points | product.sku only | score = 8, status = 'warning' | Not Written |
| UT-057 | `scoreAIDiscoverability()` | llms.txt found scores full | llms.found = true | score = 10 | Not Written |

### Module: isLikelyApparel (static method)

| Test ID | Function/Method | Test Description | Input | Expected Output | Status |
|---------|----------------|-----------------|-------|----------------|--------|
| UT-058 | `isLikelyApparel()` | Detects apparel via breadcrumb text | breadcrumb.items = [{ name: 'Clothing' }] | true | Not Written |
| UT-059 | `isLikelyApparel()` | Detects apparel via product schema category | product.category = 'Shoes & Footwear' | true | Not Written |
| UT-060 | `isLikelyApparel()` | Detects apparel via URL path | canonical.url = '/collections/dresses/product-name' | true | Not Written |
| UT-061 | `isLikelyApparel()` | Detects French apparel keywords | breadcrumb.items = [{ name: 'Vêtements' }] | true | Not Written |
| UT-062 | `isLikelyApparel()` | Non-apparel product returns false | breadcrumb.items = [{ name: 'Electronics' }], product.category = 'Laptops' | false | Not Written |

### Module: Weights (`weights.js`)

| Test ID | Function/Method | Test Description | Input | Expected Output | Status |
|---------|----------------|-----------------|-------|----------------|--------|
| UT-063 | `CATEGORY_WEIGHTS` | All category weights sum to 1.0 | Sum of all values | Exactly 1.0 | Not Written |
| UT-064 | `getGrade()` | Score 90 returns 'A' | 90 | 'A' | Not Written |
| UT-065 | `getGrade()` | Score 89 returns 'B' | 89 | 'B' | Not Written |
| UT-066 | `getGrade()` | Score 80 returns 'B' | 80 | 'B' | Not Written |
| UT-067 | `getGrade()` | Score 70 returns 'C' | 70 | 'C' | Not Written |
| UT-068 | `getGrade()` | Score 60 returns 'D' | 60 | 'D' | Not Written |
| UT-069 | `getGrade()` | Score 59 returns 'F' | 59 | 'F' | Not Written |
| UT-070 | `getGrade()` | Score 0 returns 'F' | 0 | 'F' | Not Written |
| UT-071 | `getGradeDescription()` | Each grade has a description | 'A', 'B', 'C', 'D', 'F' | Non-empty string for each | Not Written |
| UT-072 | `getContextMultiplier()` | Want context boosts emotionalBenefitCopy | 'want', 'emotionalBenefitCopy' | 1.5 | Not Written |
| UT-073 | `getContextMultiplier()` | Need context boosts compatibilityInfo | 'need', 'compatibilityInfo' | 2.0 | Not Written |
| UT-074 | `getContextMultiplier()` | Hybrid context returns 1.0 for all factors | 'hybrid', any factor | 1.0 | Not Written |
| UT-075 | `getContextMultiplier()` | Unknown factor returns 1.0 | any context, 'nonExistentFactor' | 1.0 | Not Written |
| UT-076 | `FACTOR_RECOMMENDATIONS` | All 56 factor names have a template mapping | Object.keys(FACTOR_RECOMMENDATIONS) | 56 entries, all values are non-empty strings | Not Written |

### Module: Service Worker (`service-worker.js`)

| Test ID | Function/Method | Test Description | Input | Expected Output | Status |
|---------|----------------|-----------------|-------|----------------|--------|
| UT-077 | `isSafeUrl()` | Accepts valid HTTPS URL | 'https://example.com' | true | Not Written |
| UT-078 | `isSafeUrl()` | Accepts valid HTTP URL | 'http://example.com' | true | Not Written |
| UT-079 | `isSafeUrl()` | Rejects file:// protocol | 'file:///etc/passwd' | false | Not Written |
| UT-080 | `isSafeUrl()` | Rejects localhost | 'http://localhost:8080' | false | Not Written |
| UT-081 | `isSafeUrl()` | Rejects 127.0.0.1 | 'http://127.0.0.1' | false | Not Written |
| UT-082 | `isSafeUrl()` | Rejects 0.0.0.0 | 'http://0.0.0.0' | false | Not Written |
| UT-083 | `isSafeUrl()` | Rejects malformed URL | 'not-a-url' | false | Not Written |
| UT-084 | `verifyImageFormat()` | Returns isValid=false for null URL | null | { accessible: false, isValid: false } | Not Written |
| UT-085 | `verifyImageFormat()` | Returns isValid=false for unsafe URL | 'file:///img.jpg' | { accessible: false, isValid: false } | Not Written |
| UT-086 | `parseRobotsTxt()` | Parses explicit GPTBot block | 'User-agent: GPTBot\nDisallow: /' | blockedCrawlers includes 'gptbot' | Not Written |
| UT-087 | `parseRobotsTxt()` | Wildcard disallow-all blocks all AI crawlers | 'User-agent: *\nDisallow: /' | all MAJOR_AI_CRAWLERS in blockedCrawlers | Not Written |
| UT-088 | `parseRobotsTxt()` | Allow overrides disallow for specific crawler | 'User-agent: GPTBot\nDisallow: /\nAllow: /' | 'gptbot' in allowedCrawlers | Not Written |
| UT-089 | `parseRobotsTxt()` | No robots.txt (404) assumes all allowed | HTTP 404 response | allowedCrawlers = MAJOR_AI_CRAWLERS | Not Written |
| UT-090 | `parseRobotsTxt()` | Empty robots.txt allows all | '' (empty string) | all crawlers allowed | Not Written |
| UT-091 | `detectFormatFromMagicBytes()` | Detects JPEG from FF D8 FF bytes | Uint8Array [0xFF, 0xD8, 0xFF, ...] | { format: 'jpeg', isWebP: false, isValidFormat: true } | Not Written |
| UT-092 | `detectFormatFromMagicBytes()` | Detects PNG from 89 50 4E 47 bytes | Uint8Array [0x89, 0x50, 0x4E, 0x47, ...] | { format: 'png', isWebP: false, isValidFormat: true } | Not Written |
| UT-093 | `detectFormatFromMagicBytes()` | Detects WebP from RIFF...WEBP bytes | Uint8Array [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50] | { format: 'webp', isWebP: true, isValidFormat: false } | Not Written |

### Module: Storage Manager (`storage-manager.js`)

| Test ID | Function/Method | Test Description | Input | Expected Output | Status |
|---------|----------------|-----------------|-------|----------------|--------|
| UT-094 | `saveAnalysis()` | Saves entry with correct fields | Valid analysis object | Entry with id, url, title, domain, score, grade, context, timestamp, categoryScores, recommendationCount, criticalIssues | Not Written |
| UT-095 | `saveAnalysis()` | New entries prepended to history | Two analyses saved sequentially | Second entry is at index 0 | Not Written |
| UT-096 | `saveAnalysis()` | History capped at MAX_HISTORY (100) | 101 analyses saved | history.length = 100, oldest dropped | Not Written |
| UT-097 | `saveAnalysis()` | CategoryScores stored as compact {score, name} | Full categoryScores with factors | Only score and name retained per category | Not Written |
| UT-098 | `saveAnalysis()` | Domain extracted from URL via constructor fallback | analysis with url but no pageInfo.domain | Domain parsed from URL | Not Written |
| UT-099 | `saveAnalysis()` | Malformed URL falls back to 'unknown' domain | analysis with url = 'not-a-url' | domain = 'unknown' | Not Written |
| UT-100 | `getAnalysis()` | Returns entry by ID | Valid ID | Matching entry | Not Written |
| UT-101 | `getAnalysis()` | Returns null for non-existent ID | 'nonexistent' | null | Not Written |
| UT-102 | `deleteAnalysis()` | Removes entry and returns true | Valid ID | true, entry removed from history | Not Written |
| UT-103 | `deleteAnalysis()` | Returns false for non-existent ID | 'nonexistent' | false | Not Written |
| UT-104 | `clearHistory()` | Removes all history | — | getHistory() returns [] | Not Written |
| UT-105 | `getHistoryByDomain()` | Groups entries by domain | 3 entries: 2 from example.com, 1 from test.com | { 'example.com': [2 entries], 'test.com': [1 entry] } | Not Written |
| UT-106 | `getHistoryByUrl()` | Filters by exact URL match | URL with 2 matching entries | Array of 2 entries | Not Written |
| UT-107 | `getRecentAnalyses()` | Returns first N entries | n=5 with 10 entries | 5 entries (newest first) | Not Written |
| UT-108 | `exportHistory()` | Returns valid JSON string | History with entries | JSON.parse() succeeds, matches history | Not Written |
| UT-109 | `getStorageStats()` | Returns correct analysisCount | 5 entries | { analysisCount: 5 } | Not Written |
| UT-110 | `formatBytes()` | Formats 0 | 0 | '0 Bytes' | Not Written |
| UT-111 | `formatBytes()` | Formats 1024 | 1024 | '1 KB' | Not Written |
| UT-112 | `formatBytes()` | Formats 1048576 | 1048576 | '1 MB' | Not Written |

### Module: Recommendation Engine (`recommendation-engine.js`)

| Test ID | Function/Method | Test Description | Input | Expected Output | Status |
|---------|----------------|-----------------|-------|----------------|--------|
| UT-113 | `generateRecommendations()` | Returns sorted array with priority ordering | Score result with multiple failing factors | Array sorted by priority (lowest first) | Not Written |
| UT-114 | `generateRecommendations()` | No nulls in output | Mix of valid and unknown template IDs | All entries are non-null | Not Written |
| UT-115 | `checkProtocolMetaIssues()` | Emits robots-blocking for noindex | robots.isBlocked = true | Array includes rec with id = 'robots-blocking' | Not Written |
| UT-116 | `checkProtocolMetaIssues()` | Emits og-image-webp when verification shows WebP | imageVerification.isWebP = true | Array includes rec with id = 'og-image-webp' | Not Written |
| UT-117 | `checkStructuredDataIssues()` | FAQ deduplication: count=0 emits combined rec, not separate | faq.count = 0, schemas.faq = null | Emits 'faq-schema-and-content-missing', NOT 'faq-content-missing' | Not Written |
| UT-118 | `checkStructuredDataIssues()` | FAQ deduplication: count 1-2 emits faq-content-missing only | faq.count = 1, schemas.faq = present | Emits 'faq-content-missing' | Not Written |
| UT-119 | `checkContentQualityIssues()` | Apparel skips warranty recommendation | isApparel = true, hasWarranty = false | No 'warranty-missing' in output | Not Written |
| UT-120 | `checkContentQualityIssues()` | Apparel skips compatibility recommendation | isApparel = true, hasCompatibility = false | No 'compatibility-missing' in output | Not Written |
| UT-121 | `checkContentQualityIssues()` | Apparel skips dimensions recommendation | isApparel = true, hasDimensions = false | No 'dimensions-missing' in output | Not Written |
| UT-122 | `checkContentQualityIssues()` | Need context boosts compatibility impact to 'high' | context = 'need', hasCompatibility = false | impact = 'high' on compatibility rec | Not Written |
| UT-123 | `checkAuthorityTrustIssues()` | Want context boosts review count impact | context = 'want', reviews.count = 5 | impact = 'high' on review count rec | Not Written |
| UT-124 | `checkAIDiscoverabilityIssues()` | AI crawler blocked emits recommendation | aiDiscoverability factor status = 'fail' | Array includes 'ai-crawler-blocked' | Not Written |
| UT-125 | `createRecommendation()` | Unknown template returns null with console.warn | 'nonexistent-template' | null | Not Written |
| UT-126 | `prioritizeRecommendations()` | Sorts by priority, then by impact | Mixed priority/impact recs | Lower priority numbers first; same priority sorted by impact (high > med > low) | Not Written |
| UT-127 | `getTopRecommendations()` | Returns first N from sorted list | n=3 | Array of 3 items (highest priority) | Not Written |
| UT-128 | `getQuickWins()` | Returns only high/medium impact + low effort | Mixed recs | Only entries where impact ∈ {high, medium} AND effort = 'low' | Not Written |
| UT-129 | `getCriticalRecommendations()` | Returns only high impact | Mixed recs | Only entries where impact = 'high' | Not Written |

### Module: Grading (`grading.js`)

| Test ID | Function/Method | Test Description | Input | Expected Output | Status |
|---------|----------------|-----------------|-------|----------------|--------|
| UT-130 | `getGradeColor()` | Returns correct color for each grade | 'A', 'B', 'C', 'D', 'F' | Non-empty hex color string for each | Not Written |
| UT-131 | `getGradeBackgroundColor()` | Returns correct background for each grade | 'A', 'B', 'C', 'D', 'F' | Non-empty hex color string for each | Not Written |

## 3. Integration Tests

| Test ID | Components | Test Description | Preconditions | Expected Behavior | Status |
|---------|-----------|-----------------|---------------|-------------------|--------|
| IT-001 | Content Script → Service Worker → Side Panel | Full analysis pipeline: extraction through scoring to display | Extension loaded, eCommerce PDP open | Data extracted, scores calculated, results displayed in side panel | Not Written |
| IT-002 | ScoringEngine + RecommendationEngine | Failing factors generate matching recommendations | Score result with known failures | Each failing factor produces a corresponding recommendation | Not Written |
| IT-003 | ScoringEngine + Weights | Context switch changes scores | Same extractedData, different contexts | Want context produces different scores than Need for contextual factors | Not Written |
| IT-004 | Side Panel → Service Worker → Content Script | Message routing with requestId | Start analysis | requestId sent with EXTRACT_DATA, echoed back in EXTRACTION_COMPLETE, validated in side panel | Not Written |
| IT-005 | Service Worker: verifyImageFormat | Three-tier fallback chain | URL where HEAD fails (CORS), magic bytes succeed | Result includes format from magic bytes, note about CORS | Not Written |
| IT-006 | Service Worker: verifyImageFormat | URL extension fallback | URL where both HEAD and magic bytes fail | Format inferred from .jpg/.webp URL extension | Not Written |
| IT-007 | StorageManager + Side Panel | Save analysis, reload history, verify display | Complete analysis | Entry appears in history list with correct score and grade | Not Written |
| IT-008 | StorageManager quota pruning | Storage at 80%+ triggers auto-prune | History near 10MB quota | Oldest 20% of entries removed | Not Written |
| IT-009 | Side Panel: comparison view | Select 2 history entries, compare | 2+ analyses in history | Comparison view shows side-by-side scores per category | Not Written |
| IT-010 | Side Panel: export JSON | Export analysis data | Completed analysis | Valid JSON file with scores, factors, and extraction data | Not Written |
| IT-011 | Side Panel: export HTML report | Generate HTML report | Completed analysis | Self-contained HTML with embedded CSS, logo, scores, and recommendations | Not Written |
| IT-012 | Service Worker: sender validation | Message from unauthorized sender | Message with sender.id ≠ chrome.runtime.id | Message ignored, no processing | Not Written |
| IT-013 | Scoring + Recommendations: apparel pipeline | Apparel product end-to-end | Breadcrumb includes 'Clothing' | Warranty/compatibility/dimensions show N/A, no recs generated for those factors | Not Written |
| IT-014 | Service Worker → Side Panel: parallel network enrichment | All network fetches complete | Active page with robots.txt, og:image, llms.txt | Promise.all resolves; robots, image verification, llms.txt, Last-Modified data merged into scoring | Not Written |

## 4. Edge Case & Boundary Tests

| Test ID | Scenario | Input Condition | Expected Behavior | Status |
|---------|----------|----------------|-------------------|--------|
| EC-001 | Empty extracted data | extractedData = {} | All categories score 0, grade = 'F', no crash | Not Written |
| EC-002 | Null schemas | structuredData.schemas = null | Structured data scores 0, other categories unaffected | Not Written |
| EC-003 | Product schema with null fields | product = { name: null, description: null, image: null } | Graduated scoring: all fields score 0, total productScore = 0 | Not Written |
| EC-004 | Score exactly at grade boundary | totalScore = 90 | grade = 'A' (≥ 90, not > 90) | Not Written |
| EC-005 | Score of 0 | All categories empty | totalScore = 0, grade = 'F' | Not Written |
| EC-006 | Score exceeds 100 due to multipliers | Very high context multipliers on all factors | rawScore capped at 100 (Math.min(100, rawScore)) | Not Written |
| EC-007 | Context multiplier 2.0× on Need compatibility | Need context + compatibility present | Score capped at 150% of base weight, not unbounded | Not Written |
| EC-008 | og:image URL with query parameters | 'https://cdn.example.com/img.webp?w=1200&q=80' | WebP detected from URL despite query string | Not Written |
| EC-009 | robots.txt with mixed case user-agents | 'User-Agent: GPTBot\nDisallow: /' | Case-insensitive match: gptbot blocked | Not Written |
| EC-010 | robots.txt with comments and blank lines | Content interspersed with # comments | Comments and blanks skipped, rules parsed correctly | Not Written |
| EC-011 | robots.txt with wildcard allow overriding disallow | 'User-agent: *\nDisallow: /\nAllow: /' | Wildcard disallow not set (allow overrides) | Not Written |
| EC-012 | History at MAX_HISTORY (100) | 100 entries in storage | 101st save drops oldest entry, length stays 100 | Not Written |
| EC-013 | Concurrent analysis requests | Two startAnalysis() calls in quick succession | First result ignored via requestId mismatch; only second displayed | Not Written |
| EC-014 | Analysis timeout (10 seconds) | Content script never responds | Timeout fires, error state shown, loading cleared | Not Written |
| EC-015 | Malformed JSON-LD on page | script[type="application/ld+json"] with invalid JSON | JSON.parse fails gracefully, no crash, partial data scored | Not Written |
| EC-016 | Page with no meta tags | No og:*, no twitter:*, no canonical | Protocol & Meta scores 0 for all factors | Not Written |
| EC-017 | Very long product name (500+ chars) | Product schema name = 'A'.repeat(500) | Entity consistency still checks, no truncation errors | Not Written |
| EC-018 | Non-English product page | French product page with vêtements breadcrumb | Apparel detected via French keywords | Not Written |
| EC-019 | Shopify ProductGroup (not Product) | JSON-LD @type = 'ProductGroup' with hasVariant | Product treated as Product schema, GTIN extracted from variant | Not Written |
| EC-020 | @id reference for AggregateRating | aggregateRating = { "@id": "#reviews" }, separate node with @id = "#reviews" | Rating resolved from idIndex lookup | Not Written |
| EC-021 | Storage API error during save | chrome.storage.local.set throws | Error caught, warning logged, no crash | Not Written |
| EC-022 | Image verification returns HTTP error | HEAD request returns 403/404 | { accessible: false, isValid: false, status: 403 } | Not Written |
| EC-023 | llms.txt exists but llms-full.txt does not | /llms.txt returns 200, /llms-full.txt returns 404 | results.found = true, llmsTxt.found = true, llmsFullTxt.found = false | Not Written |
| EC-024 | Last-Modified header missing | HEAD request returns 200 but no Last-Modified header | { accessible: true, lastModified: null } | Not Written |
| EC-025 | Description from schema fallback | No DOM description found, schema has description | desc.source = 'schema', description scored normally | Not Written |

## 5. Regression Test Checklist

_Run these before every release. This is the "did we break anything" list._

| # | Area | Test | Expected Result | Pass/Fail |
|---|------|------|----------------|-----------|
| 1 | Core scoring | Analyze a well-optimized PDP (e.g., Amazon product) | Score ≥ 70, all 6 categories have scores, 56 factors rendered | |
| 2 | Core scoring | Analyze a minimal PDP (no schema, thin content) | Score < 60, grade D or F, multiple failing factors | |
| 3 | Context switching | Switch between Want/Need/Hybrid on same page | Scores change for contextual factors; non-contextual factors unchanged | |
| 4 | Apparel detection | Analyze a clothing product page | Warranty/compatibility/dimensions show "N/A for apparel" | |
| 5 | og:image WebP | Analyze page with WebP og:image | Critical fail flag on og:image Format factor | |
| 6 | Recommendations | Check top 10 recommendations display | Recommendations sorted by priority, each has title, description, impact badge | |
| 7 | Factor tips | Click factor expand arrow on any failing factor | Inline recommendation tip appears with implementation guidance | |
| 8 | History save | Complete analysis and check history tab | New entry appears at top of history list with correct score/grade | |
| 9 | History comparison | Select 2 entries, click compare | Side-by-side view with per-category score comparison | |
| 10 | JSON export | Click "Download Analysis Data" | Valid JSON file downloads with complete score and extraction data | |
| 11 | HTML report | Click "Download Report" | Self-contained HTML opens in browser with Tribbute branding, all sections | |
| 12 | JS warning banner | Analyze a React SPA page | JS dependency warning banner visible above scores | |
| 13 | Error handling | Analyze chrome:// or non-web page | Error state shown gracefully, no crash | |
| 14 | Extension reload | Modify code, reload extension, re-analyze | No stale state; fresh analysis works correctly | |
| 15 | Storage persistence | Analyze, close browser, reopen, check history | Previous analyses still in history | |

## 6. Performance Benchmarks

| Scenario | Page Complexity | Expected Time | Acceptable Max | Last Measured |
|----------|----------------|--------------|----------------|--------------|
| Content extraction (content script) | Standard PDP (50-100 DOM elements) | < 200ms | 500ms | [Not measured] |
| Content extraction (content script) | Heavy PDP (500+ DOM elements, Shopify) | < 500ms | 1s | [Not measured] |
| Score calculation (scoring engine) | Full extracted data, all factors | < 50ms | 200ms | [Not measured] |
| Recommendation generation | 20+ failing factors | < 30ms | 100ms | [Not measured] |
| Network enrichment (all fetches) | robots.txt + og:image + llms.txt + Last-Modified | < 2s total | 5s (timeout at 10s) | [Not measured] |
| History load (20 entries displayed) | 100 entries in storage | < 100ms | 300ms | [Not measured] |
| HTML report generation | Full analysis with 10+ recommendations | < 200ms | 500ms | [Not measured] |
| Storage save | Single analysis entry (~2-4KB) | < 50ms | 200ms | [Not measured] |

## 7. Test Data

**Test data location:** No test fixtures exist yet. Recommended: `tests/fixtures/`

| Dataset | Description | Size | Source | Refresh Method |
|---------|------------|------|--------|---------------|
| well-optimized-pdp.json | Complete extractedData for an A-grade PDP with all schemas, rich content, 50+ reviews | 1 fixture | Hand-crafted from real PDP analysis | Update when scoring logic changes |
| minimal-pdp.json | Bare minimum extractedData — no schemas, thin description, no reviews | 1 fixture | Hand-crafted | Update when new factors added |
| apparel-pdp.json | Apparel product with breadcrumb containing 'Clothing', no warranty/compat/dimensions | 1 fixture | Hand-crafted | Update when apparel detection changes |
| shopify-productgroup.json | Shopify-style JSON-LD with ProductGroup, @id-referenced AggregateRating, hasVariant GTIN | 1 fixture | Anonymized from Shopify store | Update when Shopify patterns change |
| robots-txt-samples/ | Collection of robots.txt files: all-allow, all-block, mixed, wildcard-block, GPTBot-only-block | 5 files | Hand-crafted | Add new when crawler list changes |
| webp-image-bytes.bin | First 16 bytes of a WebP file for magic byte detection testing | 16 bytes | Generated | Static |
| jpeg-image-bytes.bin | First 16 bytes of a JPEG file for magic byte detection testing | 16 bytes | Generated | Static |
| png-image-bytes.bin | First 16 bytes of a PNG file for magic byte detection testing | 16 bytes | Generated | Static |
| context-multiplier-scenarios.json | Extracted data paired with expected scores for Want, Need, and Hybrid contexts | 3 fixtures | Hand-crafted | Update when multipliers change |

## 8. Bug Tracking

| Bug ID | Description | Severity | Status | Workaround | Found In |
|--------|------------|----------|--------|------------|----------|
| [FLAG: No bugs currently tracked. Bug tracking system not established — recommend using GitHub Issues.] | — | — | — | — | — |

---

_Test plan should be updated when new features are added or bugs are discovered. Last reviewed: 2026-03-01._
