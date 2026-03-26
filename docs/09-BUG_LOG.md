# Bug Log

> **PDS Document 09** | Last Updated: 2026-03-26 (BUG-0097)

Track all bugs encountered during development. Most recent entries at the top within each section.

## Template

```
### BUG-[NNNN] — [Short description]
- **Status:** Open | In Progress | Fixed | Won't Fix
- **Severity:** Critical | High | Medium | Low
- **Date Found:** YYYY-MM-DD
- **Date Resolved:** YYYY-MM-DD
- **Found In:** [File, component, feature, or URL]
- **Root Cause:** [Brief explanation once identified]
- **Fix:** [What was changed — reference commit or ROAD-NNNN if applicable]
- **Related:** [DEC-NNNN, ROAD-NNNN references]
- **Notes:** [Reproduction steps, context, related bugs]
```

---

## Active Bugs

### BUG-0086 — `hasReturnPolicy` / `hasShippingInfo` match accordion label, not policy content
- **Status:** Open
- **Severity:** Medium
- **Date Found:** 2026-03-23
- **Date Resolved:** —
- **Found In:** `src/content/content-script.js` → `extractTrustConfidence()` within `extractPdpQualitySignals()`
- **Root Cause:** The return policy and shipping info extractors match on the presence of the words "return" / "shipping" anywhere in visible text — including accordion heading labels. When the actual policy content is not in the initial DOM (JS-injected on accordion open), only the heading label ("Shipping & Returns") is found. Both `hasReturnPolicy` and `hasShippingInfo` score true on this label alone, awarding PDP Quality points for content an LLM crawler would never see.
- **Fix:** —
- **Related:** ROAD-0045
- **Notes:** Discovered during analysis of `www.naturallife.com`. `returnPolicyText: "Shipping & Returns"` and `shippingText: "Shipping & Returns"` are identical — both matched the same accordion heading. A fix should require minimum substantive content (e.g. a policy sentence, a day count, a URL to a returns page) before awarding the flag, and/or exclude matches that are only heading elements (`<h2>`, `<h3>`, `<button>`, `<summary>`).

### BUG-0085 — `hasMaterials` awards pass on sensory fragment with no fabric/material noun
- **Status:** Open
- **Severity:** Medium
- **Date Found:** 2026-03-23
- **Date Resolved:** —
- **Found In:** `src/content/content-script.js` → `extractProductDetails()` materials regex
- **Root Cause:** The materials regex matches any text containing a fabric/softness keyword in proximity to common adjectives. On Natural Life's page it extracted `"is so soft"` from the sentence "The fabric is so soft it feels like butter!" — a sensory claim, not a material specification. `hasMaterials` scores true, but an LLM reading "is so soft" cannot determine what the product is made of. The same issue may affect other `productDetails` signals (dimensions, care, compatibility) if their regex patterns are similarly permissive.
- **Fix:** —
- **Related:** ROAD-0045
- **Notes:** A valid material match should contain an actual fabric or material noun (e.g. rayon, cotton, polyester, spandex, linen, nylon, modal, viscose, wool, silk, leather, canvas). The fix should add a noun-presence check before awarding `hasMaterials: true`, and the `materialsText` captured should be validated to be informative enough for LLM use. Consider applying the same "informational threshold" principle to other `productDetails` sub-signals.

## Resolved Bugs (2026-03-26)

### BUG-0097 — N/A factor displays warning icon instead of neutral dash
- **Status:** Fixed
- **Severity:** Low
- **Date Found:** 2026-03-26
- **Date Resolved:** 2026-03-26
- **Found In:** `src/sidepanel/sidepanel.js` → `renderFactors()` statusIcon ternary; `src/sidepanel/sidepanel.css`
- **Root Cause:** The `statusIcon` ternary only handled `'pass'`, `'fail'`, and fell through to `⚠` for everything else — including `'na'` factors. N/A factors showed a yellow warning icon, misleading users into thinking something was wrong.
- **Fix:** Added explicit `'na'` branch returning `'–'`; added `.factor.na .factor-status` CSS rule with `var(--text-secondary)` color.
- **Related:** —

### BUG-0096 — Grade B / C / D colors fail WCAG AA contrast minimum
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-26
- **Date Resolved:** 2026-03-26
- **Found In:** `src/sidepanel/sidepanel.css` → `--grade-b`, `--grade-c`, `--grade-d` CSS variables
- **Root Cause:** Grade color variables used bright, low-contrast hues (`#84cc16` lime, `#eab308` yellow, `#f97316` orange) that failed WCAG AA 4.5:1 minimum against white backgrounds when used as text color. Grades B/C/D were illegible for low-vision users.
- **Fix:** Replaced with darker accessible equivalents: `--grade-b: #4d7c0f` (7.3:1), `--grade-c: #a16207` (5.8:1), `--grade-d: #c2410c` (5.3:1).
- **Related:** —

### BUG-0095 — Partial robots.txt path blocking treated as full pass
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-26
- **Date Resolved:** 2026-03-26
- **Found In:** `src/background/service-worker.js` → `parseRobotsTxt()`; `src/scoring/scoring-engine.js` → `scoreAIDiscoverability()`
- **Root Cause:** `parseRobotsTxt()` only tracked `blockedCrawlers` (root `Disallow: /` or `Disallow: /*`). Crawlers with non-root `Disallow` paths (e.g. `Disallow: /products/`) were treated identically to crawlers with no restrictions — both scored full points for AI crawler access. Sites with partial bot blocking received the same score as fully open sites.
- **Fix:** Added `partiallyBlockedCrawlers` array tracking non-root disallow paths. Scoring maps partial blocking to warning status at 70% of max crawler access points.
- **Related:** ROAD-0045

### BUG-0094 — Dead spec score cap and wrong maxPoints for warranty/compatibility factors
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-26
- **Date Resolved:** 2026-03-26
- **Found In:** `src/scoring/scoring-engine.js` → `scoreContentQuality()`
- **Root Cause:** Two issues: (1) A `specScore = Math.min(weights.specificationCount * 1.5, specScore)` line was dead after the spec scoring refactor — the `specScore` variable at that point had already been clamped and the 1.5× ceiling was meaningless. (2) `maxPoints` for `warrantyInfo` and `compatibilityInfo` used raw `weights.*` instead of the multiplied ceiling, making context-adjusted max points incorrect and overstating score deficits.
- **Fix:** Removed dead cap line; updated both `maxPoints` to `Math.round(weights.* * (this.multipliers.* || 1.0))`.
- **Related:** —

### BUG-0093 — Float partial scores in `scoreProtocolMeta()` cause non-integer factor points
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-26
- **Date Resolved:** 2026-03-26
- **Found In:** `src/scoring/scoring-engine.js` → `scoreProtocolMeta()`
- **Root Cause:** Five factors awarded partial points via `weights.* * 0.7` without rounding: og:title, og:description, Twitter Card, canonical, and meta description. These produced floating-point values (e.g. 7.7, 3.5) that rendered inconsistently in the UI and could cause summing errors.
- **Fix:** Wrapped all five partial assignments in `Math.round()`.
- **Related:** —

### BUG-0092 — `reviewCap` `maxPoints` distorted by dead `1.5×` branch
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-26
- **Date Resolved:** 2026-03-26
- **Found In:** `src/scoring/scoring-engine.js` → `scoreAuthorityTrust()` reviewCap calculation
- **Root Cause:** `reviewCap` was computed as `Math.min(weights.reviewCount * 1.5, weights.reviewCount * this.multipliers.reviewCount)`. The `* 1.5` branch was a dead remnant from before context multipliers existed. For "Want" context (multiplier 0.6×), `maxPoints` was set to this artificially inflated value, making the review count factor appear to have a higher ceiling than it actually did.
- **Fix:** Simplified to `Math.round(weights.reviewCount * this.multipliers.reviewCount)`.
- **Related:** —

### BUG-0091 — `rec.description` and `rec.implementation` rendered as raw HTML in recommendations
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-26
- **Date Resolved:** 2026-03-26
- **Found In:** `src/sidepanel/sidepanel.js` → all three `renderFactors()` variants
- **Root Cause:** Recommendation `description` and `implementation` strings from `RECOMMENDATION_TEMPLATES` were inserted via `innerHTML` without escaping. Although current templates are hardcoded, any future template containing `<`, `>`, or `&` characters (e.g. HTML examples in implementation guidance) would render as markup, creating a potential XSS vector.
- **Fix:** Wrapped both fields in `escapeHtml()` before interpolation.
- **Related:** BUG-0088

### BUG-0090 — `sendMessage` throws uncaught error when side panel closes mid-extraction
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-26
- **Date Resolved:** 2026-03-26
- **Found In:** `src/content/content-script.js` → `EXTRACTION_COMPLETE` `chrome.runtime.sendMessage()` call
- **Root Cause:** If the user closes the side panel before content script extraction completes, `chrome.runtime.sendMessage()` throws "Could not establish connection. Receiving end does not exist." The error was unhandled, appearing as an uncaught exception in the page's DevTools console.
- **Fix:** Added `.catch(() => {})` — the message failure is expected and benign; the extraction result is simply discarded.
- **Related:** —

### BUG-0089 — History storage IDs collide when two analyses complete in the same millisecond
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-26
- **Date Resolved:** 2026-03-26
- **Found In:** `src/storage/storage-manager.js` → `saveAnalysis()`
- **Root Cause:** `id: Date.now().toString()` generates identical IDs when two analyses complete within the same millisecond (e.g. rapid re-analyze clicks). The second write silently overwrites the first history entry.
- **Fix:** Appended a 9-character random base-36 suffix: `` `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` ``.
- **Related:** —

### BUG-0088 — `CATEGORY_DESCRIPTIONS` injected unsanitized into `title` attributes
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-26
- **Date Resolved:** 2026-03-26
- **Found In:** `src/sidepanel/sidepanel.js` → `renderCategories()` in all three score render methods
- **Root Cause:** Category description strings were interpolated directly into `title="..."` HTML attributes via template literals. Values containing `"` would break out of the attribute; values containing `<` could inject markup if the attribute context was mishandled.
- **Fix:** Wrapped all three interpolations in `escapeHtml()`.
- **Related:** BUG-0091

### BUG-0087 — `processResults()` saves zeroed-score history entry on extraction error
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-26
- **Date Resolved:** 2026-03-26
- **Found In:** `src/sidepanel/sidepanel.js` → `processResults()`
- **Root Cause:** When the content script returns an error stub (`{ error: true, ... }`), `processResults()` continued into the scoring pipeline with an empty data object. All three scores computed as 0/F. These zero-score results were then saved to history, polluting the history list with invalid entries.
- **Fix:** Added early-exit guard at the top of `processResults()`: if `this.currentData?.error` is truthy, show the error state and return without scoring or saving.
- **Related:** —

## Resolved Bugs (2026-03-23)

### BUG-0084 — `og:image Format` verification returns false PASS for WebP images on Shopify CDN
- **Status:** Fixed
- **Severity:** Critical
- **Date Found:** 2026-03-23
- **Date Resolved:** 2026-03-23
- **Found In:** `src/background/service-worker.js` → `verifyImageFormat()` CDN WebP guard
- **Root Cause:** Shopify CDN content-negotiates by `Accept` header. The service worker's HEAD request omits `Accept: image/webp`, so Shopify returns `Content-Type: image/jpeg` even for `.webp` URLs. The CDN WebP guard that follows only tests query parameters (`auto=webp`, `fm=webp`, etc.) — it never tests the URL path extension. Since `imageVerification` is truthy, `scoreProtocolMeta` uses the result directly and skips its own URL-extension fallback. Net effect: `.webp` og:image URLs on Shopify CDN receive 15/15 points and "Format: JPEG".
- **Fix:** Added `hasWebpExtension` check (`/\.webp(\?|$)/i`) alongside the existing `hasCdnWebpParam` check in `verifyImageFormat()`. Either condition now forces `format = 'webp'`, `isWebP = true`, `isValidFormat = false`.
- **Related:** —
- **Notes:** Discovered during client analysis of `www.naturallife.com`. Affects all Shopify stores using default Shopify CDN with `.webp` product images as `og:image`.

### BUG-0083 — Primary image detection fails on Shopify themes using Tailwind CSS classes
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-23
- **Date Resolved:** 2026-03-23
- **Found In:** `src/content/content-script.js` → `analyzeImages()` primary image selector list
- **Root Cause:** `primarySelectors` contains hardcoded Shopify/standard class names. Shopify themes using Tailwind utility classes (e.g. `aspect-[3/4]`) have no matching selector. `img.alt` is already entity-decoded by the browser — HTML entity encoding was a red herring. The image was counted correctly in `altCoverage` but `primaryImage` returned `null`, scoring the `Primary Image Alt Text` factor at 0/10 despite the image having a valid alt tag.
- **Fix:** Added three fallbacks after the selector loop in `analyzeImages()`: (1) match by og:image filename (handles cross-CDN Shopify delivery); (2) `img[fetchpriority="high"]` (browser LCP hint); (3) first img with meaningful alt inside `main`/`article`/`[role="main"]`.
- **Related:** —
- **Notes:** Discovered during analysis of `www.naturallife.com` (class `aspect-[3/4]` on hero image). Fixes will also benefit any theme using utility-first CSS frameworks.

## Resolved Bugs (2026-03-20)

### BUG-0082 — `og:type` `isProductType` field uses exact match only
- **Status:** Fixed
- **Severity:** Low
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/content/content-script.js` line 691
- **Root Cause:** `isProductType` was computed as `og.type === 'product'`, missing Shopify variants `'og:product'` and `'product.item'` / `'product.group'`. Scoring and recommendations were unaffected (both check `og.type` directly with correct pattern), but the raw JSON export showed `isProductType: false` for Shopify Plus stores.
- **Fix:** Updated to `!!(og.type && (og.type === 'product' || og.type === 'og:product' || og.type.startsWith('product.')))`
- **Related:** BUG-0080, BUG-0081

### BUG-0081 — Social Proof Depth context multiplier not applied
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/scoring/scoring-engine.js` lines 1065–1080 (`scoreAuthorityTrust()`)
- **Root Cause:** `socialScore` was set directly from `weights.socialProofDepth` without applying `this.multipliers.socialProof`. The multiplier was defined in `weights.js` (want: 1.4, need: 0.8, hybrid: 1.0) but never consumed. Factor also lacked the `contextual: true` flag.
- **Fix:** Applied `Math.round(socialScore * (this.multipliers.socialProof || 1.0))` and computed matching `socialMax`; added `contextual: true` to the factor push.
- **Related:** BUG-0080

### BUG-0080 — Hreflang status always `'pass'` regardless of presence
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/scoring/scoring-engine.js` lines 2523–2524 (`scoreNavigationDiscovery()`)
- **Root Cause:** Both branches of the `hreflangStatus` ternary returned `'pass'` — copy-paste error. Monolingual stores (no hreflang) received a passing status and earned full points, which was correct behavior but the incorrect status label caused confusion. `hreflangDetails` also showed 'N/A — monolingual site' (old string).
- **Fix:** Changed status to `'na'` when `hasHreflang` is false; updated details string to `'Not applicable — monolingual site (no hreflang needed)'`. Points unchanged — monolingual sites are not penalized.

### BUG-0077 — `schemas.product.category` dead data path — category always falls back to 'products'
- **Status:** Fixed
- **Severity:** Critical
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/recommendations/citation-opportunities.js` → `extractProductIntelligence()` line 284
- **Root Cause:** `schemas.product.category` is never set by the content script. The `schemas.product` object is built in `categorizeSchemas()` with fields: `name, description, image, sku, gtin, mpn, brand, hasOffer, hasRating, isProductGroup` — no `category` field. The check at line 284 will never match, so any page with ≤1 breadcrumb level falls through to the `'products'` hardcoded fallback, producing queries like "What types of **products** does Brand sell?"
- **Fix:** Add `category` extraction to `schemas.product` in `content-script.js` (JSON-LD: `item.category`; microdata: `item.properties.category`), or add a URL-slug fallback tier in `extractProductIntelligence()` as an alternative.
- **Related:** DEC-0026, ROAD-0035

### BUG-0078 — Service worker strips `requestId` on EXTRACT_DATA forwarding — race condition unguarded
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/background/service-worker.js` → `EXTRACT_DATA` case (~line 72)
- **Root Cause:** The service worker forwards `EXTRACT_DATA` to the content script as `{ type: 'EXTRACT_DATA' }` — a new object literal that drops the `requestId` from the original message. The content script echoes back `undefined` as the requestId. The side panel's stale-response guard skips validation because `message.requestId` is falsy, so every response is accepted. The race condition protection documented in the architecture is non-functional.
- **Fix:** Change forwarding to: `chrome.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_DATA', requestId: message.requestId });`
- **Notes:** Currently masked because there is typically only one in-flight request. Under rapid re-analysis (user switches context quickly), stale results can overwrite current ones.
- **Related:** —

### BUG-0067 — `scoreAICrawlerAccess` returns float score when robots.txt is CORS-blocked
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/scoring/scoring-engine.js` → `scoreAICrawlerAccess()` (~line 1345)
- **Root Cause:** CORS-blocked robots.txt assigns `score = maxPoints * 0.5`. With `maxPoints = 30`, this produces `15.0` (float). Other paths use `Math.round()`. The float propagates into the factor's `points` field and displays as `"15.0/30"` instead of `"15/30"` in the side panel and report.
- **Fix:** Wrap the assignment: `score = Math.round(maxPoints * 0.5);`
- **Related:** —

### BUG-0068 — `_cleanProductName` dash-split heuristic fails when variant portion contains a product-type word
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/recommendations/citation-opportunities.js` → `_cleanProductName()` (~lines 340–354)
- **Root Cause:** When the regex matches a dash separator and the "after" part contains a word in `PRODUCT_TYPE_MAP`, the split is suppressed and the full raw name is retained. For `"Yoga Pants - Women's Leggings"`, `"leggings"` is in the map, so the variant suffix is not stripped — producing queries like `"What is the Yoga Pants - Women's Leggings from Brand?"`.
- **Fix:** Add secondary heuristic: if `after.length < before.length * 0.6` AND the first token of `after` is a color/material/size indicator, treat as variant regardless of `PRODUCT_TYPE_MAP` membership.
- **Related:** —

### BUG-0069 — `Review Count` factor rawScore accumulation float cap can diverge from displayed maxPoints
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/scoring/scoring-engine.js` → review count scoring block (~lines 884–895)
- **Root Cause:** `reviewCountEffectiveMax` (used for `points` display) uses `Math.round(Math.min(weights.reviewCount * 1.5, ...))`. The `rawScore` accumulation uses `Math.min(weights.reviewCount * 1.5, reviewCountScore)` — an unrounded cap. In Want context (1.4× multiplier), effective max is 31 but the rawScore cap is 33.0. A score of 32 would display as `32/31` — impossible in the UI — because the accumulation cap differs from the display cap.
- **Fix:** Define a single `reviewCap = Math.round(Math.min(weights.reviewCount * 1.5, ...))` and use it for both `maxPoints` and `rawScore` accumulation.
- **Related:** —

### BUG-0070 — `CitationOpportunityEngine` crashes with TypeError if `pageInfo` is absent from extractedData
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/recommendations/citation-opportunities.js` → `_cleanTitle()` called from `extractProductIntelligence()`
- **Root Cause:** If extraction returns a partial result with `pageInfo: null` (e.g., on extraction error), `_cleanTitle(undefined)` executes `undefined.split(...)` — a TypeError. The engine constructor throws, and the citation section silently disappears from both UI and report with no user-visible indication.
- **Fix:** Add null guard to `_cleanTitle`: `if (!title) return 'this product';`. Also wrap `extractProductIntelligence(extractedData)` in the constructor try/catch with a safe-default context fallback.
- **Related:** —

### BUG-0071 — AI Readiness scoring does not apply N/A marking for PLP (collection) pages
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/scoring/scoring-engine.js` → `calculateScore()`
- **Root Cause:** DEC-0025 Phase 1 marks inapplicable factors N/A for PLPs in PDP Quality scoring but `calculateScore()` (AI Readiness) does not check `pageType` at all. On collection pages, factors like Product Schema, Offer Schema, Product Identifiers, and FAQ Schema score 0/30, 0/20, 0/15, etc. — unfair penalties producing misleadingly low AI Readiness scores.
- **Fix:** Pass `isPlp` to AI Readiness category scorers and mark product-specific factors N/A for PLPs, mirroring the pattern in `scorePurchaseExperience(data, isPlp)`. Noted as Phase 2 in DEC-0025 but currently produces misleading consulting output.
- **Related:** DEC-0025, ROAD-0038

### BUG-0072 — `_cleanTitle` multi-word strip phrases silently fail due to `\b` word boundary on spaces
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/recommendations/citation-opportunities.js` → `_cleanTitle()` (~lines 312–313)
- **Root Cause:** `\b${word}\b` is applied to multi-word entries in `TITLE_STRIP_WORDS` (e.g., `'free shipping'`, `'limited edition'`). Word-boundary anchors on internal spaces don't behave as expected — the space is not itself a word boundary character in this context. These phrases are never stripped from page titles.
- **Fix:** Detect `word.includes(' ')` and use a simple case-insensitive string replace without `\b` anchors for multi-word entries. Pre-compile all regexes as module-level constants to avoid per-call allocation.
- **Related:** BUG-0074

### BUG-0073 — `'unknown'` crawler status incorrectly routed to `covered` group in Citation Opportunity Map
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/scoring/scoring-engine.js` → `scoreAICrawlerAccess()` (~line 1338); `src/recommendations/citation-opportunities.js` → `generateOpportunities()` (~lines 992–998)
- **Root Cause:** `scoreAICrawlerAccess` initializes `status = 'unknown'` and only updates inside conditional branches. If `robotsData` is null/undefined (e.g., airplane mode), status stays `'unknown'`. `generateOpportunities()` routes via `if fail → missing`, `else if warning → partial`, `else → covered` — the else catches `'unknown'`, placing the factor in the "positive" covered group. A site with unchecked robots.txt incorrectly shows AI Crawler Access as a covered query.
- **Fix:** Add explicit `'unknown'` handling: skip the factor entirely rather than assigning to covered. Also add null guard in `scoreAICrawlerAccess` for missing robotsData.
- **Related:** BUG-0067

### BUG-0074 — `PRODUCT_TYPE_MAP` first-token-wins loses product type specificity on multi-segment URLs
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/recommendations/citation-opportunities.js` → `extractProductIntelligence()` (~lines 202–207)
- **Root Cause:** The token loop returns on the first `PRODUCT_TYPE_MAP` match. For a URL like `/collections/bags-and-purses/womens-handbags`, `"bags"` matches before `"purses"` — a more generic term than if `"handbag"` were in the map. Queries use the less-specific type.
- **Fix:** Collect all matching tokens and prefer the longest (most characters) as a specificity proxy. Document as a known limitation if not addressed — output degrades gracefully.
- **Related:** —

### BUG-0079 — `isSafeUrl()` does not block RFC 1918 private IP ranges (SSRF risk)
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/background/service-worker.js` → `isSafeUrl()` (~lines 141–151)
- **Root Cause:** `isSafeUrl()` blocks `localhost`, `127.0.0.1`, `0.0.0.0` but not `10.x.x.x`, `192.168.x.x`, or `172.16-31.x.x`. A malicious page could set `og:image` to a local network router URL and trigger a HEAD request from the extension's `<all_urls>` permission. Pre-existing as ROAD-0005.
- **Fix:** Add private-range regex check in `isSafeUrl()`. Also block `::1` (IPv6 localhost) and `169.254.x.x` (link-local).
- **Related:** ROAD-0005

### BUG-0075 — `schemas.product.brand` not type-guarded in CitationOpportunityEngine — object interpolation risk
- **Status:** Fixed
- **Severity:** Low
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/recommendations/citation-opportunities.js` → `extractProductIntelligence()` (~line 269)
- **Root Cause:** Brand is read as `brand = schemas.product.brand`. If content script returns the raw schema object (`{ "@type": "Brand", "name": "Acme" }`) rather than a normalized string, template strings like `"Is ${ctx.brand} a good brand?"` produce `"Is [object Object] a good brand?"`.
- **Fix:** Add guard: `brand = (typeof brand === 'string') ? brand : brand?.name || '';`
- **Related:** —

### BUG-0076 — `_citationHandlerAttached` DOM property bypasses event delegation pattern
- **Status:** Fixed
- **Severity:** Low
- **Date Found:** 2026-03-20
- **Date Resolved:** 2026-03-20
- **Found In:** `src/sidepanel/sidepanel.js` → `renderCitationOpportunities()` (~lines 547–553)
- **Root Cause:** Click listener attached directly to the citation toggle element with a DOM property guard (`toggle._citationHandlerAttached = true`). Inconsistent with the established event delegation pattern used everywhere else. If `#citationToggle` is ever re-created in a full DOM re-render, the property is lost and duplicate listeners accumulate.
- **Fix:** Either move the toggle listener into `bindEvents()` (called once at init), or explicitly document that `#citationToggle` is a permanent DOM node. Currently safe at existing rendering architecture.
- **Related:** —

## Resolved Bugs (2026-03-11)

### BUG-0066 — hasGuarantee false negative when "no warranty" text appears in footer/legal sections
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-11
- **Date Resolved:** 2026-03-11
- **Found In:** `src/content/content-script.js` → `extractTrustConfidence()`
- **Root Cause:** The guarantee negative-pattern guard (`no warranty|without warranty|void...warranty`) was tested against the full `document.body.innerText`. If those phrases appeared anywhere on the page (footer legal text, care instructions, warranty disclaimer sections), the check short-circuited and prevented detection of a valid warranty statement in the product content — even though the AI Readiness extractor found it via `getProductContentText()`.
- **Fix:** Replaced the global negative guard with a scoped approach: match the guarantee pattern against `getProductContentText()` first, then check only the 30 characters preceding the match for negative qualifiers.
- **Notes:** Confirmed on `https://fxrracing.ca/products/mens-adventure-lite-tri-laminate-bib-pant-1` — "1 Year Warranty" found by AI Readiness extractor but `hasGuarantee: false` in PDP Quality.

### BUG-0065 — hasVariants and hasSwatches false negatives on Shopify Dawn-theme stores
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-11
- **Date Resolved:** 2026-03-11
- **Found In:** `src/content/content-script.js` → `extractContentCompleteness()`, `extractVisualPresentation()`
- **Root Cause:** Two separate selector gaps. (1) `hasVariants` selectors didn't include Shopify Dawn's `<variant-selects>` and `<variant-radios>` custom elements, and had no URL-based fallback for the `?variant=` Shopify query param. (2) `hasSwatches` selectors didn't include `variant-radios input[type="radio"]` or `[data-option-name*="color"]` patterns used by Dawn-derived themes.
- **Fix:** Added `variant-selects, variant-radios` to the `hasVariants` querySelector; added `?variant=\d+` URL fallback; for `hasSwatches` — added `[class*="colour"]`, select-by-id/aria-label patterns, and a text-scan fallback that queries legend/label elements for "color"/"colour" text and checks for interactive children in the parent container.
- **Notes:** Confirmed on `https://fxrracing.ca/products/mens-adventure-lite-tri-laminate-bib-pant-1?variant=44423807336492` — product has clear color + size variants but both flags were false.

## Resolved Bugs (2026-03-10)

### BUG-0064 — FAQPage nested inside WebPage schema not extracted
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-10
- **Date Resolved:** 2026-03-10
- **Found In:** `src/content/content-script.js` → `categorizeSchemas()` and `extractFaqFromSchema()`
- **Root Cause:** Both functions only processed top-level JSON-LD items. A common CMS pattern places `FAQPage` as `WebPage.mainEntity` (with questions under a second `mainEntity` array) rather than as a standalone top-level type. This caused `schemas.faq = null` and `contentQuality.faq.found = false` even when a full FAQPage was present — costing up to 20 AI Readiness points (FAQ Schema + FAQ Section).
- **Fix:** Added a fourth pass in `categorizeSchemas()` and parallel logic in `extractFaqFromSchema()` to recurse into `WebPage`/`ItemPage` items and extract any nested `FAQPage`.
- **Notes:** Confirmed on `https://www.lifeassure.com/products/classic/` which has 13 FAQ questions embedded as `WebPage.mainEntity.mainEntity`.

## Resolved Bugs (2026-03-09, batch 11 — multi-platform extraction QA review)

### BUG-0063 — Price text captures SKU instead of price on BigCommerce (SpeedAddicts)
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/content/content-script.js` → `extractPurchaseExperience()`
- **Root Cause:** `[class*="price"]` matched a BigCommerce container div whose `textContent` begins with the product SKU/model number. The validation regex matched a price value elsewhere in the element text, but `priceText` was set from the full element text (starting with the SKU).
- **Fix:** After finding a price element, use regex to extract just the currency+number portion (`$\d+.xx` pattern) as `priceText` instead of the raw element text.

### BUG-0062 — hasReturnPolicy false despite MerchantReturnPolicy in product schema
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/content/content-script.js` → `extractTrustConfidence()`
- **Root Cause:** `hasReturnPolicy` extraction only checked DOM selectors, accordion/details elements, and body text regex. Enterprise retailers (Walmart, Costco) declare return policy via `Offer.hasMerchantReturnPolicy` in JSON-LD schema without repeating it in the page body.
- **Fix:** Added schema fallback that checks `Offer.hasMerchantReturnPolicy` for all Product/ProductGroup items when DOM extraction finds nothing.

### BUG-0061 — Brand inTitle/inH1 false negative when schema includes legal suffix (e.g. "INC")
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/content/content-script.js` → `extractBrandSignals()`
- **Root Cause:** Schema brand name included legal entity suffixes (e.g. "Unplugged Performance INC"). `inTitle` and `inH1` checks compared the full schema name against page title/H1, which use the normalized brand name without legal suffixes.
- **Fix:** Before comparing, normalize the schema brand name by stripping trailing legal suffixes (INC, LLC, LTD, Corp, Limited, Co, International) with a case-insensitive regex.

### BUG-0060 — Certification regex runs on full body.innerText causing false positives
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/content/content-script.js` → `extractCertifications()`
- **Root Cause:** Certification regex patterns ran against `document.body.innerText` (full page) instead of scoped product content. Certifications mentioned in site footers, third-party seller badges, or policy pages could trigger false positives.
- **Fix:** Changed to use `getProductContentText(null)` which excludes nav, header, footer, and off-topic site chrome.

### BUG-0059 — schemas.reviews empty despite JSON-LD Review items or nested Product.review
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/content/content-script.js` → `categorizeSchemas()`
- **Root Cause:** `categorizeSchemas()` only populated `schemas.reviews` from microdata, not from JSON-LD. Standalone JSON-LD `Review` type items were not handled, and `Product.review[]` arrays were not extracted. Affected Walmart, SpeedAddicts, and other platforms using JSON-LD reviews.
- **Fix:** Added `type === 'review'` handler to the JSON-LD first pass of `categorizeSchemas()`. Also added extraction of `Product.review[]` nested reviews into `schemas.reviews` (max 5 samples).

### BUG-0058 — Typeless JSON-LD AggregateRating silently dropped in extractReviewSignals
- **Status:** Fixed
- **Severity:** Critical
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/content/content-script.js` → `extractReviewSignals()`
- **Root Cause:** The second pass in `extractReviewSignals()` checked `itemType === 'aggregaterating'` but skipped items with no `@type`. Some platforms (Costco) emit AggregateRating-like blocks with `ratingValue` but no `@type` property.
- **Fix:** Added a handler for typeless objects that contain `ratingValue` within a valid 0–5 range, treating them as AggregateRating when no rated value has been found yet.

### BUG-0057 — Description schema fallback threshold too tight (50 chars)
- **Status:** Fixed
- **Severity:** Critical
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/content/content-script.js` → `analyzeDescription()`
- **Root Cause:** Schema fallback only triggered when DOM description text was < 50 chars. A 60-char DOM fragment (e.g. truncated intro text) would prevent schema promotion even though the schema has the full 300-word product description.
- **Fix:** Changed threshold from `text.length < 50` (chars) to `word count < 20`. A description with fewer than 20 words triggers schema fallback if the schema has more content.

### BUG-0056 — Return policy bullet points extracted as product features (FXR Racing)
- **Status:** Fixed
- **Severity:** Critical
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/content/content-script.js` → `extractFeaturesFromContainer()`
- **Root Cause:** `extractFeaturesFromContainer()` did not filter out containers that are within return/refund/policy sections. On FXR Racing (Shopify), a return policy section matched a feature selector and 9 policy bullet points were captured as product features.
- **Fix:** Added context guards in `extractFeaturesFromContainer()`: skip containers whose id/class matches policy keywords; skip containers inside `[class*="policy"]` / `[class*="return"]` sections; skip individual `<li>` items that match return/shipping policy sentence patterns.

### BUG-0055 — og:image CDN WebP delivery parameter not detected as WebP
- **Status:** Fixed
- **Severity:** Critical
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/background/service-worker.js` → `verifyImageFormat()`
- **Root Cause:** CDNs like Imgix, Fastly, and Cloudinary use query parameters (`auto=webp`, `fm=webp`, `format=webp`) to serve WebP to capable clients. Our HEAD request lacks `Accept: image/webp` so the CDN returns JPEG, masking the WebP delivery. The Costco og:image URL contained `auto=webp` but was scored as valid JPEG.
- **Fix:** After Content-Type detection, check URL query params for CDN WebP delivery indicators. If found and format was otherwise JPEG/PNG, override to `isWebP=true, isValidFormat=false`. Same check added to the URL extension fallback path.

### BUG-0054 — SEO internal link count hard-capped at 10 across all sites
- **Status:** Fixed
- **Severity:** Critical
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/content/content-script.js` → `extractSeoSignals()`
- **Root Cause:** An early-exit `break` at `internalLinkCount >= 10` was intended to short-circuit the loop once the scoring threshold was met. This caused all sites with 10+ internal links to report exactly `10`, making the raw count useless for diagnostics.
- **Fix:** Removed the early-exit break. All qualifying internal links are now counted. The SEO scorer still awards full points for `count >= 10`.

## Resolved Bugs (2026-03-09, batch 10 — trust badge and shipping text extraction)

### BUG-0053 — shippingText captures inline CSS from WooCommerce product wrapper
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/content/content-script.js` → `extractTrustConfidence()`
- **Root Cause:** The `[class*="shipping"]` CSS selector matched the WooCommerce product wrapper div (which carries the class `shipping-taxable`). That div contains an inline `<style>` element as a direct child. `textContent` returns text from all descendant nodes including `<style>` elements, so the extracted `shippingText` began with raw CSS (`:root { --npg-main-color: #007acc; } .thumbnails-...`).
- **Fix:** Changed the shipping selector loop to use `innerText` instead of `textContent`. `innerText` is layout-aware and excludes hidden/non-rendered nodes like `<style>` and `<script>` elements. Also added a 600-char length guard to skip large container elements that match on a broad class substring.
- **Notes:** Observed on unpluggedperformance.com product pages.

### BUG-0052 — hasTrustBadges false negative for "Guaranteed Safe Checkout" sections (WooCommerce)
- **Status:** Fixed
- **Severity:** Low
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/content/content-script.js` → `extractTrustConfidence()`
- **Root Cause:** Trust badge CSS selectors only covered third-party seal class names (norton, mcafee, trust-badge, etc.) and did not include `guaranteed-safe-checkout`, a common WooCommerce/custom pattern. Trust badge text regex also didn't cover "guaranteed safe checkout" phrasing.
- **Fix:** Added `[class*="guaranteed-safe-checkout"]`, `[class*="safe-checkout"]`, `[class*="checkout-badge"]`, `[class*="payment-badge"]` to `trustBadgeSelectors`. Added `guaranteed safe checkout` and `safe checkout guarantee` to the text regex.
- **Notes:** Observed on unpluggedperformance.com. `hasSecureCheckout` was already `true` on the same page (since "safe checkout" triggered `hasSecureCheckoutMessaging`); this fix also sets `hasTrustBadges` for the visual trust section.

## Resolved Bugs (2026-03-09, batch 9 — JS review platform detection)

### BUG-0051 — Empty JS review platform placeholders cause false positives on hasProminentReviews and hasStarVisual
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/content/content-script.js` → `extractReviewsSocialProof()`
- **Root Cause:** `hasProminentReviews` matched any element with "rating" or "star-rating" in its class, including empty JS review platform placeholder divs (e.g. `<div class="klaviyo-star-rating-widget" data-id="189534"></div>`). Same for `hasStarVisual` via `[class*="star-rating"]`. These empty divs gave passing scores and suppressed the "add reviews" recommendation even though no review data was extractable.
- **Fix:** Added `children.length > 0 || textContent.trim().length > 0` guard to both checks. Added detection of 10 known JS review platforms (Klaviyo, Okendo, Judge.me, Yotpo, Loox, Stamped, Trustpilot, Reviews.io, Bazaarvoice, PowerReviews) surfaced as `reviewPlatform` field on the return object. New `review-platform-no-schema` recommendation fires when a platform is detected with no `aggregateRating` schema output, with the platform name injected into the description.
- **Notes:** Root-cause investigation for unpluggedperformance.com (Klaviyo). BUG-0050 (WooCommerce selector improvements) remains valid for sites without third-party platforms.

## Resolved Bugs (2026-03-09, batch 8 — WooCommerce review extraction)

### BUG-0050 — Review rating and count not detected on modern WooCommerce sites
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-09
- **Date Resolved:** 2026-03-09
- **Found In:** `src/content/content-script.js` → `extractReviewSignals()`, `extractReviewsSocialProof()`
- **Root Cause:** Three compounding gaps: (1) WooCommerce does not emit `aggregateRating` in JSON-LD by default — it requires a third-party SEO plugin (Yoast, Rank Math). (2) Modern WooCommerce (v7+) removed `itemprop="ratingValue"` / `itemprop="reviewCount"` microdata and replaced with `aria-label="Rated X.XX out of 5"` on the `.star-rating` element and a bare-number `<span class="count">` inside `.woocommerce-review-link`. (3) DOM fallbacks in both extractors only covered the old `itemprop` selectors, leaving no coverage for the modern pattern.
- **Fix:** `extractReviewSignals()`: added aria-label parsing for `.star-rating[aria-label]` elements; added `.woocommerce-product-rating .count` and `.woocommerce-review-link .count` selectors; added last-resort text parse of ".woocommerce-review-link" for "(N customer review)" pattern. `extractReviewsSocialProof()`: added same WooCommerce count selectors and last-resort text parse to the reviewCount DOM fallback tier.
- **Notes:** Reported against unpluggedperformance.com (WooCommerce). `hasProminentReviews: true` and `hasStarVisual: true` were correctly detected by PDP extractor (via `[class*="rating"]`), confirming the star widget was in the DOM — but rating value and count were both 0 in AI Readiness and PDP Quality scores.

## Resolved Bugs (2026-03-05, batch 7 — shipping extraction)

### BUG-0049 — `hasShippingInfo` false negative when page only shows pickup fulfillment
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-05
- **Date Resolved:** 2026-03-05
- **Found In:** `src/content/content-script.js` → `extractTrustConfidence()`
- **Root Cause:** Shipping extraction covered shipping/delivery keywords across all four tiers (CSS selectors, `<details>` accordions, accordion buttons, text regex) but had no coverage for pickup-related fulfillment language. Local retailers, spas, and services offering in-store or curbside pickup with no shipping option always scored `hasShippingInfo: false`, causing a false "Add Shipping Information" recommendation.
- **Fix:** Added `pick.?up` to the accordion/details keyword regex; expanded the text regex to match `available/ready/free for (in-store) pick-up`, `curbside pick-up`, `local pick-up`, and `store pick-up` patterns.
- **Notes:** Reported against total-wrapture-medi-spa.myshopify.com which shows "available for pickup" as its only fulfillment option.

## Resolved Bugs (2026-03-05, batch 6 — iterator destructuring, review extraction, breadcrumb nesting, H1 handling)

### BUG-0048 — `seo-internal-links` recommendation never fires on warning state (3–9 links)
- **Status:** Fixed
- **Severity:** Low
- **Date Found:** 2026-03-05
- **Date Resolved:** 2026-03-05
- **Found In:** `src/recommendations/recommendation-engine.js` → `checkNavigationDiscoveryIssues()`
- **Root Cause:** Rec engine fired `seo-internal-links` only when `internalLinks.count < 3`, but the scorer issues a warning for 3–9 links and only passes at 10+. Pages with 3–9 links got a warning score penalty but never received a recommendation.
- **Fix:** Changed threshold from `< 3` to `< 10` to match the scorer's pass threshold.

### BUG-0047 — Review Count factor `points` exceeds `maxPoints` in UI when context multiplier applies
- **Status:** Fixed
- **Severity:** Low
- **Date Found:** 2026-03-05
- **Date Resolved:** 2026-03-05
- **Found In:** `src/scoring/scoring-engine.js` → `scoreAuthorityTrust()`
- **Root Cause:** `maxPoints` was hard-coded to `weights.reviewCount` (base weight), but `points` could be boosted up to 1.5× by context multipliers — showing impossible scores like 24/22 in Want context.
- **Fix:** Pre-computed `reviewCountEffectiveMax = Math.min(weights.reviewCount * 1.5, Math.round(weights.reviewCount * this.multipliers.reviewCount))` and used it for both `points` cap and `maxPoints` display.

### BUG-0046 — `analyzeHeadings()` counts empty `<h1>` DOM nodes — false "Multiple H1s" penalty
- **Status:** Fixed
- **Severity:** Low
- **Date Found:** 2026-03-05
- **Date Resolved:** 2026-03-05
- **Found In:** `src/content/content-script.js` → `analyzeHeadings()`
- **Root Cause:** `querySelectorAll('h1').length` counted all H1 elements including empty render placeholders emitted by BigCommerce and other platforms. A page with one empty H1 and one real H1 got flagged for "Multiple H1s".
- **Fix:** For H1 only, count is computed from `texts.filter(t => t.length > 0).length` to exclude empty placeholders.

### BUG-0045 — `scoreEntityConsistency()` uses `h1Texts[0]` — same empty-first-H1 bug as BUG-0040
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-05
- **Date Resolved:** 2026-03-05
- **Found In:** `src/scoring/scoring-engine.js` → `scoreEntityConsistency()`, line 1146
- **Root Cause:** BUG-0040's fix (use `find()` for first non-empty H1) was applied to `scoreNavigationDiscovery()` and the title scorer but missed `scoreEntityConsistency()`. Pages with an empty first H1 (BigCommerce) had H1 excluded from entity consistency check, causing false warning state.
- **Fix:** Changed `h1Text = texts[0]` to `h1Text = texts.find(t => t.trim().length > 0) || ''`.

### BUG-0044 — `extractReviewSignals()` drops review dates and body text from typeless JSON-LD blocks
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-05
- **Date Resolved:** 2026-03-05
- **Found In:** `src/content/content-script.js` → `extractReviewSignals()`
- **Root Cause:** The second pass in `extractReviewSignals()` required `itemType === 'product' || 'productgroup'` to process a `review[]` array. BigCommerce emits review data in a typeless block (no `@type`), so `itemType = ""` and the branch was never taken. BUG-0038's fix added typeless-block handling for `aggregateRating` but not for `review[]` arrays.
- **Fix:** Added a third pass after the main `getParsedJsonLd()` loop to scan typeless blocks for `review[]` arrays and extract dates/body text into `mostRecentDate` and `reviewLengths`. Only activates when no review data was collected in earlier passes.
- **Notes:** On Speed Addicts BigCommerce page, Review Recency was 0/12 (fail) and Review Depth was 0/10 (fail) despite 165 reviews with dates and bodies present in the JSON-LD.

### BUG-0043 — `BreadcrumbList` nested inside `ItemPage` JSON-LD `@graph` never extracted
- **Status:** Fixed
- **Severity:** Critical
- **Date Found:** 2026-03-05
- **Date Resolved:** 2026-03-05
- **Found In:** `src/content/content-script.js` → `categorizeSchemas()`
- **Root Cause:** BigCommerce emits breadcrumb data as `{ "@type": "ItemPage", "breadcrumb": { "@type": "BreadcrumbList", ... } }` in the `@graph`. `categorizeSchemas()` only extracted top-level `BreadcrumbList` items; `ItemPage` was not handled and its nested `breadcrumb` property was ignored.
- **Fix:** Added a second pass (before the existing aggregateRating pass) that checks for `ItemPage` items with a nested `breadcrumb.@type === 'BreadcrumbList'` and extracts it as `schemas.breadcrumb`.
- **Notes:** Caused both AI Readiness Breadcrumb Schema factor and SEO Technical Foundations Breadcrumb Schema factor to false-fail. SEO score lost 15 points; two false recommendations fired.

### BUG-0042 — PDP `reviewCount: 37729` false positive from DOM aria-label bare-number fallback
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-05
- **Date Resolved:** 2026-03-05
- **Found In:** `src/content/content-script.js` → `extractReviewsSocialProof()` review count block
- **Root Cause:** DOM extraction tried schema as a fallback only when DOM returned 0. The bare-number regex `raw.match(/(\d[\d,]*)/)` (third-tier fallback) matched a large unrelated number from an aria-label element (e.g. a part number or inventory count), yielding 37729 instead of the correct 165 from schema.
- **Fix:** Reversed priority: schema extraction runs first (including typeless-block fallback for BigCommerce), DOM extraction only runs when schema provides no count. Removed bare-number regex fallback from DOM tier — only adjacent patterns (`\d+ review`, `review: \d+`) are used.

### BUG-0041 — `extractBrandSignals()` and `extractAwardsFromSchema()` use wrong loop variable
- **Status:** Fixed
- **Severity:** Critical
- **Date Found:** 2026-03-05
- **Date Resolved:** 2026-03-05
- **Found In:** `src/content/content-script.js` → `extractBrandSignals()` (line 1983), `extractAwardsFromSchema()` (line 2316)
- **Root Cause:** `iterateSchemaItems()` yields `{ type, item }` wrapper objects. Both functions used `for (const item of iterateSchemaItems())` without destructuring, so `item` held the wrapper object. `item['@type']` was `undefined` on the wrapper (the actual type is in `wrapper.type`), so `type === 'product'` was never true. All schema brand and award data was silently dropped; the DOM fallback masked the issue in most cases.
- **Fix:** Changed both loops to `for (const { type, item } of iterateSchemaItems())` and removed the now-redundant `const type = (Array.isArray(item['@type']) ...)` line.
- **Notes:** Brand Clarity was always "missing" when brand came from JSON-LD schema (not DOM microdata), losing 12 points in Authority & Trust. Schema awards were dead code — only DOM awards worked.

## Resolved Bugs (2026-03-05, batch 5 — schema extraction and recommendation engine)

### BUG-0040 — H1–Product Name Alignment always fails when first H1 is empty
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-05
- **Date Resolved:** 2026-03-05
- **Found In:** `src/scoring/scoring-engine.js` → `scoreNavigationDiscovery()`
- **Root Cause:** `h1Text = h1Texts[0] || ''` takes the first captured H1 text verbatim. BigCommerce (Speed Addicts) emits an empty `<h1>` as the first heading in the DOM (likely a render placeholder), followed by the real product name H1. `h1Text` was `""`, causing `if (h1Text)` to short-circuit to fail without ever comparing the actual product name H1.
- **Fix:** Changed to `h1Texts.find(t => t.trim().length > 0) || ''` so the first non-empty H1 is used.
- **Related:** —
- **Notes:** The scorer's title comparison already uses `.includes()` substring matching, so `| Brand` and `- Brand` suffixes in the title tag do not cause false failures — the product name being contained in the title is sufficient to pass.

### BUG-0039 — SEO "Add breadcrumb navigation" recommendation fires even when DOM breadcrumbs are present
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-05
- **Date Resolved:** 2026-03-05
- **Found In:** `src/recommendations/recommendation-engine.js` → `checkNavigationDiscoveryIssues()`
- **Root Cause:** `hasDomBreadcrumbs` read `structure.breadcrumbs?.present` (i.e. `contentStructure.breadcrumbs`) — a path that doesn't exist. DOM breadcrumb data is stored at `seoSignals.domBreadcrumbs.present` (`this.seoData.domBreadcrumbs?.present` in context). `hasDomBreadcrumbs` was always `false`, so the recommendation fired on every page regardless of whether breadcrumbs were present. The SEO scorer reads the correct path and scores the factor accurately — only the recommendation engine was wrong.
- **Fix:** Changed `hasDomBreadcrumbs` to read `this.seoData.domBreadcrumbs?.present === true`, matching the path used by `scoreNavigationDiscovery()`.
- **Related:** BUG-0028 (same breadcrumb extraction work that added `domBreadcrumbs`)
- **Notes:** Confirmed via Speed Addicts PDP — scorer showed "Breadcrumb Navigation: pass (30/30)" while recommendation engine simultaneously emitted `seo-breadcrumb-nav`.

## Resolved Bugs (2026-03-05, batch 5 — schema extraction)

### BUG-0038 — `aggregateRating` dropped when emitted in a typeless JSON-LD block — false "make reviews prominent" recommendation
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-05
- **Date Resolved:** 2026-03-05
- **Found In:** `src/content/content-script.js` → `categorizeSchemas()`, `extractReviewsSocialProof()`
- **Root Cause:** BigCommerce (Speed Addicts) emits `aggregateRating` in a second JSON-LD script block that has an `@id` referencing the product but no `@type` field. Both `categorizeSchemas()` and `iterateSchemaItems()` skip items with no `@type` on the first line of their item loops — so the rating block is silently ignored. Result: `schemas.aggregateRating: null`, `hasProminentReviews: false`, and a false "Make reviews more prominent" recommendation despite 165 reviews and stars visibly displayed in the hero area.
- **Fix:** Added a second pass in `categorizeSchemas()` that scans for untyped items containing `aggregateRating` after the main typed loop completes. Also added a matching fallback in `extractReviewsSocialProof()`'s schema check that scans untyped JSON-LD blocks directly via `getParsedJsonLd()`. Both fixes are guarded to only activate when `aggregateRating` has not already been found.
- **Related:** —
- **Notes:** Confirmed via Speed Addicts KYT TT-Revo PDP export. Pattern likely affects other BigCommerce stores. `reviewCount: 37729` in PDP extraction was a separate false positive from page body text (unrelated to this bug).

## Resolved Bugs (2026-03-04, batch 4 — JS dependency detection)

### BUG-0037 — `assessJSDependency()` misses Next.js, Gatsby, Angular, Remix, and styled-components apps — SPA warning never shown
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/content/content-script.js` → `assessJSDependency()`
- **Root Cause:** Framework detection only checked for React 16 (`#root`, `[data-reactroot]`) and Vue (`[data-v-app]`). Modern apps using Next.js App Router, Gatsby, Angular, Remix, or styled-components produce none of those markers. Critically, `mainInJs` only searched `closest('#root, #app, [data-reactroot]')`, missing `#__next` (Next.js root). Arc'teryx (Next.js + styled-components) scored `dependencyLevel: "low"`, `score: 100`, no SPA warning — despite dynamic on-click loading that our extractor can't capture.
- **Fix:** Added detection for Next.js (`#__next`, `script[src*="/_next/"]`), Gatsby (`#___gatsby`), Angular (`[ng-version]`), Remix (script/link patterns), Vue/Nuxt (`#__nuxt`), and styled-components (`style[data-styled]`). Added `#__next` and `#___gatsby` to the `mainInJs` closest selector. `frameworkDetected` now returns a descriptive string for all supported frameworks.
- **Related:** BUG-0035, BUG-0036
- **Notes:** Arc'teryx Alpha Jacket PDP — Next.js App Router + styled-components. `<main>` lives inside `#__next`, so after fix `mainInJs = true`, `dependencyLevel = "high"`, SPA warning banner shown.

## Resolved Bugs (2026-03-04, batch 3 — content extraction gaps)

### BUG-0036 — Feature extraction misses H2+paragraph layout (Arc'teryx-style callouts)
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/content/content-script.js` → `extractFeatures()`
- **Root Cause:** All existing feature extraction paths look for `<ul>/<ol>` lists or headings containing "feature"/"benefit"/"highlight" keywords. Sites like Arc'teryx represent features as H2 heading + sibling `<p>` sections (e.g. "GORE-TEX PRO ePE", "Adjustable StormHood™") — no list elements, no keyword-matching heading text. Result: 0 features found despite rich feature content on the page.
- **Fix:** Added a fifth fallback to `extractFeatures()` that scans H2 elements within the product content area, finds H2s paired with a substantive sibling/child `<p>` (>30 chars), and assembles them as feature entries. Uses `textContent` (not `innerText`) so CSS-hidden feature content is also captured. Skip patterns filter out review/cart/account headings.
- **Related:** BUG-0035
- **Notes:** Confirmed via Arc'teryx Alpha Jacket PDP export — 9 H2s on page, 4 were product feature callouts ("GORE-TEX PRO ePE", "Adjustable StormHood™", "WaterTight™ zippers", "Dynamic seam placement"), all scoring as 0 features.

### BUG-0035 — Description extraction misses CSS-hidden "Read More" content, falls back to 9-word schema string
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/content/content-script.js` → `analyzeDescription()`
- **Root Cause:** `analyzeDescription()` uses `el.innerText` to evaluate matched DOM elements. `innerText` returns an empty string for any element with `display:none`, which is the typical CSS pattern for collapsible "Read More" sections. When all selector candidates had short `innerText`, the function nulled each and ultimately fell back to the Product schema description (9 words on Arc'teryx). The actual on-page description was present in the DOM but CSS-hidden.
- **Fix:** During the selector loop, track the first element whose `textContent` is >50 chars even when its `innerText` is short (CSS-hidden candidate). If no visible element is found, promote the CSS-hidden candidate. When reading text, prefer `innerText` if long enough, otherwise fall back to `textContent` on the same element.
- **Related:** BUG-0036
- **Notes:** Confirmed via Arc'teryx Alpha Jacket PDP — `description.wordCount: 9, source: "schema"` despite a full product description visible on the page after "Read More" expansion. `textMetrics.totalWords: 2559` showing ample page content.

## Resolved Bugs (2026-03-04, batch 2 — scoring/extraction pipeline QA)

### BUG-0023 — `scoreProtocolMeta()` reads removed `robots.isBlocked` property — noindex pages silently pass
- **Status:** Fixed
- **Severity:** Critical
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/scoring/scoring-engine.js` — `scoreProtocolMeta()`
- **Root Cause:** `isBlocked` was removed from the extractor in v2.1.1 but the AI Readiness scorer still read `data?.robots?.isBlocked`, which is always `undefined`. So pages with `<meta name="robots" content="noindex">` always scored full points on this factor.
- **Fix:** Changed to `data?.robots?.noindex === true`, matching the SEO scorer and the recommendation engine.

### BUG-0024 — Review recency recommendation reads stale nested path, fires on every product with reviews
- **Status:** Fixed
- **Severity:** Critical
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/recommendations/recommendation-engine.js` — `checkAuthorityTrustIssues()`
- **Root Cause:** Recommendation engine read `reviews.recency.hasRecentReview` (nested, singular) but extractor returns flat `reviews.hasRecentReviews`. `reviews.recency` was always `{}`, so `!recency.hasRecentReview` was always `true` → `review-recency-low` fired on every product with reviews. Also `recency.averageLength` was always `undefined` → `review-depth-low` never fired.
- **Fix:** Read `reviews.hasRecentReviews === false` (null = no dates found → skip) and `reviews.averageReviewLength` directly.

### BUG-0025 — `description-quality-low` rec never fires — reads `desc.qualityScore` never produced by extractor
- **Status:** Fixed
- **Severity:** Critical
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/recommendations/recommendation-engine.js` — `checkContentQualityIssues()`
- **Root Cause:** `desc.qualityScore !== undefined` is always false — `analyzeDescription()` never returns `qualityScore`. The underlying signals are `hasBenefitStatements`, `hasEmotionalLanguage`, `hasTechnicalTerms`.
- **Fix:** Changed to check all three underlying signals being falsy with sufficient word count.

### BUG-0026 — 7 category scorers missing `Math.min(100, rawScore)` cap — context multipliers can push total above 100
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/scoring/scoring-engine.js` — `scoreStructuredData`, `scoreProtocolMeta`, and all 5 PDP category scorers
- **Fix:** Added `Math.min(100, rawScore)` to all 7 missing return statements.

### BUG-0027 — `schemas.product` null check `!== null` crashes when extraction returns `undefined`
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/scoring/scoring-engine.js:88` — `scoreStructuredData()`
- **Fix:** Changed `product !== null` to `product != null` (loose inequality handles both null and undefined).

### BUG-0028 — SEO breadcrumb DOM detection reads non-existent `contentStructure.breadcrumbs` key
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/scoring/scoring-engine.js:2371` — `scoreNavigationDiscovery()`
- **Root Cause:** `extractContentStructure()` doesn't produce a `breadcrumbs` key; `structure.breadcrumbs` was always `undefined`, so DOM breadcrumbs were never detected.
- **Fix:** Added `domBreadcrumbs: { present }` to `extractSeoSignals()` return; scorer now reads `seo.domBreadcrumbs?.present`.

### BUG-0029 — `extractAwardsFromSchema()` doesn't handle top-level JSON-LD arrays; misses schema awards on affected sites
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/content/content-script.js` — `extractAwardsFromSchema()`
- **Fix:** Changed `data['@graph'] || [data]` to `data['@graph'] || (Array.isArray(data) ? data : [data])`.

### BUG-0030 — `extractAnswerFormatContent` double-counts signals: useCaseMatches is a superset of bestForMatches
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/content/content-script.js` — `extractAnswerFormatContent()`
- **Root Cause:** `useCaseMatches` shared all 5 verbs with `bestForMatches` plus added `suitable|recommended`. A single "best for outdoor grilling" sentence contributed 2 of 4 signals. Inflated Answer-Format Content scores.
- **Fix:** `useCaseMatches` now uses exclusively `suitable|recommended` verbs; non-overlapping with `bestForMatches`.

### BUG-0031 — SEO meta description rec only fires outside 100–180 char range; 161–180 chars gets warning score but no recommendation
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/recommendations/recommendation-engine.js` — `checkTitleMetaIssues()`
- **Fix:** Changed trigger from `< 100 || > 180` to `< 140 || > 160` to align with the scorer's optimal range.

### BUG-0032 — `multiple-h1` inline tip shows `h1-missing` advice when actual issue is duplicate H1s
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/scoring/weights.js` — `FACTOR_RECOMMENDATIONS`; `src/scoring/scoring-engine.js` — `scoreContentStructure()`
- **Fix:** Factor name changed to `'H1 Heading (Multiple)'` when `h1.count > 1`; added mapping to `'multiple-h1'` template in `FACTOR_RECOMMENDATIONS`.

### BUG-0033 — `extractBrandSignals()` and `extractAwardsFromSchema()` bypass JSON-LD cache, re-parsing scripts on every run
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/content/content-script.js` — both functions
- **Fix:** Refactored to use `iterateSchemaItems()` (the cached path) instead of re-querying `document.querySelectorAll('script[type="application/ld+json"]')`.

### BUG-0034 — `meetsThreshold` property in `extractReviewsSocialProof()` return is dead code
- **Status:** Fixed
- **Severity:** Low
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/content/content-script.js` — `extractReviewsSocialProof()`
- **Fix:** Removed `meetsThreshold: reviewCount >= 50` from return object.

## Resolved Bugs (2026-03-04)

### BUG-0021 — `schemas.product.name` undefined when multiple JSON-LD ProductGroup blocks present
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/content/content-script.js` — `categorizeSchemas()`
- **Root Cause:** When a page emits two JSON-LD `ProductGroup` blocks (e.g. Shopify variant pages), the second (often minimal) block unconditionally overwrites `schemas.product`, setting `name: undefined` and losing all data from the first block.
- **Fix:** Changed `schemas.product = { ... }` to merge with `existingProduct` — each field falls back to the existing value if the new item's value is falsy.
- **Notes:** Confirmed on cleanflow.net — two `ProductGroup` blocks where block 1 had full product name, block 2 was a minimal duplicate with no name.

### BUG-0022 — SEO "Product Name in Title" false negative when title uses brand+model prefix separated by punctuation
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-04
- **Date Resolved:** 2026-03-04
- **Found In:** `src/scoring/scoring-engine.js` — `scoreTitleMeta()`
- **Root Cause:** Two checks, both too strict: (1) full string containment fails when schema name is verbose but title is a concise marketing variant; (2) H1 fallback used first 3 words ("multiquip st2040t trash") but title has em dash after the model number ("multiquip st2040t –"), so "trash" doesn't appear at position 3.
- **Fix:** Added 2-word brand+model prefix check (minimum 8 chars) for schema name; changed H1 fallback from 3 words to 2 words with same 8-char guard.
- **Notes:** Confirmed on cleanflow.net — title "Multiquip ST2040T – 2 Inch Electric Submersible Trash Pump" correctly passes with "multiquip st2040t" (18 chars) found in title.

### BUG-0020 — Features List extraction scores 0/10 on custom-themed WooCommerce/Tailwind sites
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-03
- **Date Resolved:** 2026-03-03
- **Found In:** `src/content/content-script.js` → `extractFeatures()`, `extractFeatureLikeItems()`
- **Root Cause:** Three-tier extraction failure: (1) Tier 1 CSS selectors had no WooCommerce-specific classes and couldn't match Tailwind utility classes; (2) Tier 2 heading-keyword scan failed because headings like "Monotube Dampers Built for Precision" don't contain generic keywords like "feature" or "benefit"; (3) Tier 3 `extractFeatureLikeItems()` filtered out items because they didn't start with a narrow list of benefit verbs. This affected any site using utility-first CSS (Tailwind), page builders (Oxygen, Bricks, Elementor), or custom WooCommerce themes.
- **Fix:** (1) Added WooCommerce selectors to Tier 1 (`.woocommerce-product-details__short-description`, `.woocommerce-Tabs-panel--description`, `#tab-description`). (2) Added new Tier 2.5: scans `getMainContentArea()` for `<ul>/<ol>` elements with structural feature-list heuristics (3+ qualifying items 15–500 chars, avg ≥25 chars, ≤50% link-wrapped, not inside nav/header/footer/sidebar/cart). (3) Expanded `extractFeatureLikeItems()` benefit pattern with 18 additional starting words.
- **Related:** DEC-0023
- **Notes:** Reproduced on https://unpluggedperformance.com/product/model-3-coilover-kit/ — 9 clear feature bullet points scored 0/10. The Tier 2.5 heuristic-based scan is the key fix for the growing population of custom-themed sites.

### BUG-0019 — `hasUrgency` false negative for soft scarcity phrases (e.g. "limited availability")
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractPurchaseExperience()`, `src/scoring/scoring-engine.js` → `scorePurchaseExperience()`
- **Root Cause:** Urgency regex only covered explicit stock/time phrases (`limited time`, `low stock`, etc.). Softer availability signals like "limited availability at this price" did not match, returning 0/15 pts.
- **Fix:** Split into `strongUrgencyPatterns` (full 15 pts, pass) and `softUrgencyPatterns` (8 pts, warning). Extractor now returns both `hasUrgency` and `urgencyIsStrong`. Scoring engine applies tiered points based on signal strength.
- **Related:** —
- **Notes:** Reproduced on finditparts.com — "Limited availability at this price!" was present on page but scored 0/15.

### BUG-0002 — PDP recommendation engine generates false "missing" recommendations for passing factors
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/recommendations/recommendation-engine.js` → `PdpQualityRecommendationEngine` (all 5 `check*Issues()` methods)
- **Root Cause:** The recommendation engine was written expecting nested object structures (e.g., `sizeGuide.present`, `ctaPresent`, `reviewProminence.visibleInHero`) but the extractor (`extractPdpQualitySignals()`) returns flat booleans (`hasSizeGuide`, `ctaFound`, `hasProminentReviews`). All property lookups silently resolved to `undefined` (falsy), causing every factor to generate a "missing" recommendation regardless of the actual extracted value. The scoring engine correctly used the flat properties; only the recommendation engine was misaligned.
- **Fix:** Updated all 5 `check*Issues()` methods in `PdpQualityRecommendationEngine` to use the correct flat property names matching the extractor output. 27 property references corrected across `checkPurchaseExperienceIssues`, `checkTrustConfidenceIssues`, `checkVisualPresentationIssues`, `checkContentCompletenessIssues`, and `checkReviewsSocialProofIssues`.
- **Related:** —
- **Notes:** Discovered via user report on https://cleanflow.net — size guide was present and scored as pass (15/15) but `pdp-size-guide-missing` recommendation was still emitted. All PDP recommendations were affected. The bug existed since PDP Quality was introduced in v2.0.0.

### BUG-0014 — `hasDiscount` false negative on B2B/industrial/parts platforms (missing MSRP patterns)
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractPurchaseExperience()` → `discountSelectors` and text regex
- **Root Cause:** The discount selector list and text regex were oriented toward consumer eCommerce patterns (Shopify compare-at pricing, "save X", "% off"). B2B and parts sites like finditparts.com show discounts as MSRP/list-price vs. sale-price patterns using class names like `list-price`, `msrp`, `price-original`, `price-crossed`, `sale-price`. Additionally, finditparts.com had `Offer.price: $142.49` in its Product schema while displaying `$106.99` in the DOM — a 25% discount that no text or class-name pattern detected.
- **Fix:** (1) Added 10 new selectors covering list-price, MSRP, regular-price, price-original, price-before, price-crossed, sale-price, and line-through patterns. (2) Extended text regex with `list price`, `msrp`, `reg. $`, `retail price`, `special price`, `price drop`. (3) Added a schema/DOM price mismatch heuristic: if the schema Offer price is >5% higher than the DOM-captured price, `hasDiscount` is set to true.
- **Related:** QA-2026-03-02 (finditparts.com single-site audit)
- **Notes:** The schema/DOM mismatch heuristic is a reliable signal because merchants set schema prices to list/MSRP while displaying a lower sale price in the DOM. The 5% threshold prevents floating-point rounding from triggering false positives.

### BUG-0015 — `reviewCount` false positive from aria-label on section headings containing part numbers
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractReviewsSocialProof()` → review count selector + regex
- **Root Cause:** `[aria-label*="reviews" i]` matched an H2 section heading with aria-label "PETERBILT P27-1069 Customer Reviews". The greedy `(\d[\d,]*)` regex then matched the first digit sequence in the string — `"27"` from the part number `P27-1069` — and returned it as the review count. The page actually had zero reviews ("No reviews yet").
- **Fix:** Added `:not(h1):not(h2):not(h3):not(h4):not([role="heading"])` to the aria-label selector. Replaced the greedy digit extraction with a context-aware regex that requires the number to be adjacent to "review" or "rating" words, with a final fallback that skips strings matching part-number patterns (letter + digits + hyphen + digits).
- **Related:** QA-2026-03-02 (finditparts.com single-site audit)

### BUG-0016 — `hasLifestyleImages` false positive on industrial/parts pages via image-count fallback
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractVisualPresentation()` → lifestyle fallback
- **Root Cause:** The unconditional `imageCount >= 6` fallback set `hasLifestyleImages = true` regardless of product category. A Peterbilt door window switch with 6 product-angle images (front, back, sides, connectors, diagram) was incorrectly credited with lifestyle imagery.
- **Fix:** Added a category guard that checks breadcrumb text and URL path for industrial/parts keywords (electrical, switch, solenoid, actuator, hardware, industrial, heavy-duty, component, fitting, connector, valve, relay, sensor, plumbing, fastener, bearing, and URL patterns `/categories/`, `/parts/`, `/components/`). The fallback only fires when no industrial/parts signals are detected.
- **Related:** QA-2026-03-02 (finditparts.com single-site audit)

### BUG-0017 — `hasOrganizedDetails` false negative on semantic section/heading structure
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractContentCompleteness()` → `hasOrganizedDetails`
- **Root Cause:** Detection only matched interactive widget patterns (tabs, accordions, collapsibles). Custom React platforms like finditparts.com organise content using semantic `<section>` elements with H2 headings ("Part Description", "Customer Reviews", "Manufacturer Information", "Questions & Answers") — four clearly organised sections that score zero because no tab or accordion widget is present.
- **Fix:** Added a semantic fallback: if the `<main>` element contains 3 or more `<section>` elements, or 3 or more H2/H3 headings, `hasOrganizedDetails` is set to true.
- **Related:** QA-2026-03-02 (finditparts.com single-site audit)

### BUG-0018 — `customerCount` regex matches part numbers via `\b` boundary (AI Readiness)
- **Status:** Fixed
- **Severity:** Low
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractSocialProof()` → `customerMatch` regex
- **Root Cause:** `\b(\d{3,})` asserts a word boundary before a digit group. After a hyphen, `\b` fires between the non-word `-` and the word-character `1`, so `P27-1069` matches `\b1069` if "customers" appears in nearby page text (e.g., "P27-1069 Customer Reviews" section heading). This produced `customerCount: 1069` on a page with zero actual customers.
- **Fix:** Changed `\b(\d{3,})` to `(?:^|[\s,])(\d{3,})` — requires the digit group to be preceded by whitespace, a comma, or start-of-line, which hyphen-separated part numbers do not satisfy.
- **Related:** QA-2026-03-02 (finditparts.com single-site audit)
- **Notes:** Affects AI Readiness trust signals only, not PDP Quality score.

### BUG-0012 — `priceText` truncates to label text, hiding the actual price value
- **Status:** Fixed
- **Severity:** Low
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractPurchaseExperience()` → price selector loop
- **Root Cause:** `text.substring(0, 30)` was applied to the full element text before stripping label prefixes. Elements like `<span class="price">Regular price\n          \n     $69.90</span>` produce text where the first 30 characters are consumed by the "Regular price" label and whitespace, leaving `priceText` with no numeric value.
- **Fix:** Applied a regex to strip common label prefixes (`regular price`, `sale price`, `now`, `was`, `from`, `price:`) before taking the 30-character substring.
- **Related:** QA-2026-03-02 (8-site PDP quality audit)
- **Notes:** Discovered on www.reitmans.com. Score is unaffected (priceVisible is set correctly by the regex match); only the display text shown in factor details was wrong.

### BUG-0013 — `hasGalleryFeatures` false negative on Walmart and Old Navy (custom React carousels)
- **Status:** Fixed
- **Severity:** Low
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractVisualPresentation()` → `hasGalleryFeatures`
- **Root Cause:** The selector list targeted third-party library class names (Slick `.slick-dots`, Swiper `.swiper-pagination`, PhotoSwipe `.pswp`, FancyBox) and generic fragments like `[class*="gallery-nav"]`. Custom React/Next.js carousels (Walmart, Old Navy) use ARIA-labelled navigation buttons and data-testid attributes that none of these patterns match.
- **Fix:** Added ARIA navigation button selectors (`button[aria-label*="next" i]`, `button[aria-label*="previous" i]`, `button[aria-label*="next image" i]`), `data-testid` patterns for carousel/gallery/image-nav elements, and class fragment patterns (`[class*="media-gallery"]`, `[class*="image-gallery"]`, `[class*="photo-gallery"]`).
- **Related:** QA-2026-03-02 (8-site PDP quality audit)
- **Notes:** Note that Walmart's `imageCount: 70` likely includes recommendation carousel images — this is a separate data quality issue (no fix in this pass).

### BUG-0007 — Payment indicators miss SVG-only payment badge implementations (false negative)
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractPurchaseExperience()` → payment indicator fallback
- **Root Cause:** The `<img>` alt-text fallback only covers HTML `<img>` elements. Modern Shopify themes and React storefronts render payment brand icons as inline SVG, which has no `src` or `alt` attribute. Four of eight tested sites (FXR, Natural Life, Reitmans, Old Navy) returned `hasPaymentIndicators: false` despite showing Visa/Mastercard/PayPal icons.
- **Fix:** Added a second fallback block with SVG `aria-label`/`title` selectors for common payment brands and container-level class selectors (`.payment-icons`, `[class*="payment-icon"]`, `[class*="payment-logos"]`, `.shopify-payment-button__more-options`).
- **Related:** QA-2026-03-02 (8-site PDP quality audit)
- **Notes:** The text regex fallback already covers most cases when payment brand names appear as visible text. The SVG/container detection fills the gap for icon-only implementations.

### BUG-0008 — `[class*="compare"]` discount selector matches product-comparison navigation buttons (false positive)
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractPurchaseExperience()` → `discountSelectors`
- **Root Cause:** `[class*="compare"]` is too generic — it matched Costco's "Compare Product" button, setting `hasDiscount: true` with `discountText: "Compare Product"` on a page with no actual sale pricing.
- **Fix:** Removed `[class*="compare"]` from the selector list. Replaced with three narrow selectors: `[class*="compare-at"]`, `[class*="compare-price"]`, `[class*="price-compare"]`. The specific `.compare-at-price`, `.price--compare`, `.price-item--compare` selectors already in the list cover standard Shopify patterns.
- **Related:** QA-2026-03-02 (8-site PDP quality audit)
- **Notes:** Discovered on www.costco.ca.

### BUG-0009 — `reviewCount` returns zero on FXR, Reitmans, Old Navy despite visible review counts
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractReviewsSocialProof()` → review count DOM selector
- **Root Cause:** The DOM selector `[itemprop="reviewCount"], .review-count, .reviews-count` only matches exact class names and the microdata attribute. Sites using partial class names (e.g., `product-review-count`), `data-testid` attributes, or Amazon's bespoke `#acrCustomerReviewText` element returned no match, falling through to the schema fallback which also had no data for these sites.
- **Fix:** Expanded the DOM selector with `[class*="review-count"]`, `[class*="rating-count"]`, `[class*="reviews-count"]`, `[data-testid*="review-count" i]`, `[data-testid*="rating-count" i]`, `[aria-label*="reviews" i]`, `#acrCustomerReviewText`, `[data-hook="total-review-count"]`. Updated the value extraction to read `aria-label` attribute first (covers elements where the count is in the accessible label, not visible text).
- **Related:** QA-2026-03-02 (8-site PDP quality audit)

### BUG-0010 — `hasRelatedProducts` and `hasQASection` false negatives on Amazon, Walmart, SportChek
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractContentCompleteness()`
- **Root Cause:** Two causes: (1) class-based selectors did not cover Amazon's `data-feature-name` attributes, Walmart's `data-testid` patterns, or generic `id`-based patterns; (2) some of these sections are lazy-hydrated React components not in the DOM at content-script execution time (architectural limitation). The text regex fallback handles some cases when text is already rendered.
- **Fix:** Added Amazon selectors (`[data-feature-name="ask"]`, `[data-feature-name="similarities_widget"]`, `[id="Ask"]`, `[id*="sims-carousel"]`), Walmart/React selectors (`[data-testid*="question" i]`, `[data-testid*="related" i]`, `[data-testid*="recommendation" i]`), and generic `[id*="questions-answers"]`, `[id*="related-products"]`, `[id*="recommendations"]`. The lazy-loading limitation is documented — these sections will still miss when rendered below the fold after script execution.
- **Related:** QA-2026-03-02 (8-site PDP quality audit)

### BUG-0011 — `hasReviewSorting` false negative on Amazon and high-review-count platforms
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractReviewsSocialProof()` → `hasReviewSorting`
- **Root Cause:** Selector list did not cover Amazon's `[id*="sort-order"]` / `[data-action*="sort"]` / `[data-hook*="sort"]` patterns or generic `data-testid` patterns used by React platforms. Text pattern also missed "top reviews", "newest", and "most critical" phrases used by Amazon's sort dropdown labels.
- **Fix:** Added Amazon and React `data-testid` selectors. Expanded the text regex with "top reviews", "newest", "oldest", "most critical".
- **Related:** QA-2026-03-02 (8-site PDP quality audit)

### BUG-0003 — Trust badge selector `[class*="badge"]` fires on sale/category labels (false positive)
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractTrustConfidence()` → `trustBadgeSelectors`
- **Root Cause:** The selector `[class*="badge"]` is too generic — it matches sale labels, category tags, and promotional stickers on every tested site, not just security/trust seals. This inflated Trust & Confidence scores by 4.0 weighted points (20 pts × 20% category weight) on 8/8 tested sites.
- **Fix:** Removed `[class*="badge"]` from the selector list. Added specific selectors for security-related badge patterns: `[class*="security-seal"]`, `[class*="trust-seal"]`, `[class*="trust-icon"]`, and SVG-based alternatives (`svg[aria-label*="secure" i]` etc.). The narrow class selectors (`[class*="trust-badge"]`, `[class*="trustbadge"]`, etc.) and the text-pattern fallback (Norton, McAfee, BBB, SSL etc.) remain.
- **Related:** QA-2026-03-02 (8-site PDP quality audit)
- **Notes:** Discovered via 8-site QA audit. Every site in the test set returned `hasTrustBadges: true` despite only Costco having a verifiable trust seal.

### BUG-0004 — CTA detection captures search form submit button before add-to-cart (false positive)
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractPurchaseExperience()` → `ctaSelectors`
- **Root Cause:** `button[type="submit"]` was the first entry in `ctaSelectors`, so on any page where the site search form appears before the product form in DOM order, the search submit button was captured as the CTA. Natural Life returned `ctaText: "Search submit"`, degrading CTA Clarity from 15 to 8 pts and generating a spurious `pdp-cta-unclear` recommendation.
- **Fix:** Moved `button[type="submit"]` to the end of `ctaSelectors`. Added five product-form scoped selectors (`form[action*="/cart/add"] button[type="submit"]`, `.product-form button[type="submit"]`, etc.) that run before the global fallback, preserving detection on sites where the product form uses a submit button without a distinctive class name.
- **Related:** QA-2026-03-02 (8-site PDP quality audit)
- **Notes:** Discovered on www.naturallife.com.

### BUG-0005 — `hasVariants` false negative on Amazon, FXR Racing, SportChek (custom class names)
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractContentCompleteness()` → `hasVariants`
- **Root Cause:** The variant selector list was Shopify-centric and did not cover Amazon's `select[name*="size_name"]` pattern, data-attribute-based custom implementations (`[data-option-index]`, `[data-variant-id]`), or class fragment patterns used by non-Shopify platforms (`[class*="size-option"]`, `[class*="variant-option"]`). All three sites clearly have size/colour selection UIs that scored 0/20 pts.
- **Fix:** Expanded the `document.querySelector` string with Amazon-specific selectors, data-attribute patterns, additional class fragments, and the Shopify `SingleOptionSelector` pattern. Added a text-based fallback regex for "select a size" / "choose a colour" phrases, covering React/Next.js platforms where class names are hashed and unavailable to CSS selectors.
- **Related:** QA-2026-03-02 (8-site PDP quality audit)
- **Notes:** Discovered on fxrracing.ca, amazon.ca, sportchek.ca. The text fallback is a broad safety net — selector improvements should reduce reliance on it as more platforms are tested.

### BUG-0006 — `hasProminentReviews` false negative on React platforms with hashed CSS class names
- **Status:** Fixed
- **Severity:** High
- **Date Found:** 2026-03-02
- **Date Resolved:** 2026-03-02
- **Found In:** `src/content/content-script.js` → `extractReviewsSocialProof()` → `hasProminentReviews`
- **Root Cause:** The inner selector inside the hero loop only matched elements with class fragments "rating", "stars", "review-count", "star-rating" — none of which survive CSS Modules hashing (Walmart, SportChek) or Amazon's bespoke class naming (`a-icon-star`, `data-hook`). This caused the highest-priority PDP recommendation (`pdp-reviews-not-prominent`) to fire incorrectly on three major retailers with exemplary review prominence.
- **Fix:** Extended the inner selector with ARIA-based attributes (`[aria-label*="rating" i]`, `[aria-label*="out of 5" i]`), `[data-testid*="rating" i]`, `[data-testid*="review" i]`, and Amazon-specific hooks (`[class*="a-icon-star"]`, `[data-hook="average-star-rating"]`). Added a schema-based fallback: if an `aggregateRating` with `reviewCount > 0` exists in structured data, `hasProminentReviews` is set to `true` (products with schema review counts virtually always display them in the hero).
- **Related:** QA-2026-03-02 (8-site PDP quality audit)
- **Notes:** Discovered on amazon.ca, sportchek.ca, walmart.ca. The schema fallback does not fire on sites that use `@id` references for aggregateRating (handled by checking `!item.aggregateRating['@id']`).

### BUG-0001 — Return policy and shipping info not detected in expandable/accordion elements
- **Status:** Fixed
- **Severity:** Medium
- **Date Found:** 2026-03-01
- **Date Resolved:** 2026-03-01
- **Found In:** `src/content/content-script.js` → `extractTrustConfidence()`
- **Root Cause:** Return policy and shipping info detection only checked elements with return/shipping-related CSS class names or IDs, then fell back to regex on full page text. Many Shopify themes place this information inside `<details>/<summary>` elements or accordion/collapsible sections with generic class names (e.g., `.product-info button`), which were not matched by either detection path.
- **Fix:** Added two new detection layers between the selector-based check and the text-pattern fallback: (1) iterate `<details>` elements and check if their `<summary>` text contains return/shipping keywords, (2) iterate accordion/collapsible button elements and check for return/shipping keywords, resolving associated panels via `aria-controls`.
- **Related:** ROAD-0032
- **Notes:** Discovered on https://www.naturallife.com/collections/mini-dresses/products/capri-cotton-mini-dress-black — return policy is present in an expandable box but was reported as missing.
