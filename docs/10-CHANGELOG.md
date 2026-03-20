# Changelog

> **PDS Document 10** | Last Updated: 2026-03-20

All notable changes to this project. Format follows [Keep a Changelog](https://keepachangelog.com/). Most recent version at the top.

## [Unreleased]

---

## [2.3.6] — 2026-03-20

### Added
- **Content-to-Citation Roadmap** — new forward-looking content investment roadmap in the AI Visibility tab and HTML report; answers "if I add this specific content, which LLM citations does it unlock?"; 5 content blocks across 3 tiers (Tier 1: Description + Styling, Tier 2: FAQ + Fabric & Care, Tier 3: Inline Review Content); apparel blocks (Fabric & Care, Styling) are gated by `ScoringEngine.isLikelyApparel()`; Inline Reviews block returns null when `reviews.count === 0`; all blocks personalized with product name, brand, and type via `extractProductIntelligence()`; shows "Content foundation is strong" state when all blocks are present; new file `src/recommendations/citation-roadmap.js` with `CitationRoadmapEngine` class; `extractProductIntelligence` in `citation-opportunities.js` exported for reuse; roadmap section added to sidepanel UI (collapsible, below Citation Opportunities) and HTML report (after Citation Opportunity Map); new CSS classes added to `sidepanel.css`; `generateHtmlReport()` updated to accept 10th `citationRoadmap` param

---

## [2.3.5] — 2026-03-20

### Changed
- **Citation Opportunity Map — 4-group restructure** — replaced the 3-group scoring-gap model (missing/partial/covered) with a 4-group model that separates query type from coverage status; Groups 1 & 2 ("Discovery & Category Queries", "Brand Authority Queries") are always generated from product intelligence signals regardless of page score; Group 3 ("Queries to Capture") merges fail+warning factor-mapped entries with Critical/Refine priority badges; Group 4 ("Queries You're Already Winning") now visible, showing passing factor queries; new `generateDiscoveryQueries()` method in `CitationOpportunityEngine`; `generateOpportunities()` return shape changed to `{ discovery, brand, toCapture, winning, context }`; updated `renderCitationOpportunities()` in `sidepanel.js`, `buildCitationOpportunitiesSection()` in `report-template.js`, and added 4-group CSS modifier classes + `.citation-priority-badge` in `sidepanel.css`

---

## [2.3.4] — 2026-03-20

### Changed
- **Citation Opportunity Map — `bareProductName` for natural query phrasing** — added `_stripMarketingPrefix()` to remove possessive + sentiment-adjective prefixes from product names (e.g., "My Favorite Cotton Top" → "Cotton Top") before use in query templates; new `bareProductName` context variable available in all PDP_QUERY_TEMPLATES; all 14 PDP factor templates rewritten to use `bareProductName`/`shortName` as primary references rather than `cleanName`/full title; `cleanName` reserved for Entity Consistency queries where the exact registered product name matters for LLM entity anchoring; queries now follow an anchor/follow-up pattern — first query uses `bareProductName`+brand for discoverability, follow-ups use `shortName` or brand+category for natural conversational phrasing

---

## [2.3.3] — 2026-03-20

### Fixed
- **BUG-0077** — `schemas.product.category` dead data path — added `category` field to `schemas.product` in both JSON-LD and microdata extraction paths in `content-script.js`; added URL-slug fallback tier in `extractProductIntelligence()` for pages without breadcrumbs or schema category; queries now use real product category instead of hardcoded "products"
- **BUG-0078** — Service worker dropped `requestId` on `EXTRACT_DATA` forwarding — stale-response race condition protection is now functional; content script receives and echoes the request ID as designed
- **BUG-0067** — `scoreAICrawlerAccess` returned float `15.0` when robots.txt is CORS-blocked — wrapped assignment in `Math.round()`, displays as `15/30` not `15.0/30`
- **BUG-0068** — `_cleanProductName` failed to strip variant suffixes when the variant portion contained a product-type word — added `variantIsShorter` heuristic so short suffixes (e.g., color names) are split even when they incidentally contain a product-type token
- **BUG-0069** — `Review Count` factor `rawScore` accumulation used an unrounded float cap that could diverge from displayed `maxPoints` in Want context — replaced `reviewCountEffectiveMax` with a single `reviewCap` used consistently for both display and accumulation
- **BUG-0070** — `CitationOpportunityEngine` crashed with `TypeError` when `extractedData.pageInfo` was null — wrapped `extractProductIntelligence()` call in constructor try/catch with safe-default context fallback; added null guard to `_cleanTitle()`
- **BUG-0071** — AI Readiness scoring had no N/A marking for PLP (collection) pages — Product Schema, Offer Schema, Review Schema (Structured Data category) and Product Identifiers (AI Discoverability category) now award full points with "N/A — Collection Page" status on PLP pages, consistent with PDP Quality's existing pattern
- **BUG-0072** — Multi-word entries in `TITLE_STRIP_WORDS` ("free shipping", "on sale", "limited edition") were never stripped from page titles due to incorrect `\b` word-boundary anchoring at spaces — pre-compiled strip regexes at module level; multi-word phrases now use plain case-insensitive replace without `\b` anchors
- **BUG-0073** — `'unknown'` status from `scoreAICrawlerAccess` was routed to the `covered` (positive) group in Citation Opportunity Map — only explicit `'pass'` status now enters `covered`; `'unknown'`, `'na'`, and other statuses are omitted from all groups; added null guard in `scoreAICrawlerAccess` for missing `robotsData`
- **BUG-0074** — `PRODUCT_TYPE_MAP` token loop returned first match rather than most specific — now collects all matches and prefers the longest token; multi-word phrase matches always win over single-token matches
- **BUG-0075** — `schemas.product.brand` not type-guarded in `extractProductIntelligence()` — object values now have `.name` extracted, preventing `"[object Object]"` in generated queries
- **BUG-0076** — Citation toggle `click` listener attached via DOM property mutation (`_citationHandlerAttached`) inconsistent with event delegation pattern — listener moved to `bindEvents()`, bound once at init
- **BUG-0079** — `isSafeUrl()` did not block RFC 1918 private IP ranges or IPv6 localhost — now rejects `10.x`, `192.168.x`, `172.16–31.x`, `169.254.x`, and `::1` in addition to existing localhost checks

---

## [2.3.2] — 2026-03-18

### Changed
- **Citation Opportunity Map — PDP query refinement** — product page queries now use cleaned product names with variant/color suffixes separated (e.g., "Ringer Tank Top" instead of "Ringer Tank Top - Rust Folk Floral"); `_cleanProductName()` splits on dash/dash separators and parenthetical suffixes; variant info preserved and used contextually in image queries ("Show me the Ringer Tank Top in Rust Folk Floral"); new `shortName` property ("this tank top") provides natural pronoun-style references to reduce repetitive full-name usage in queries; PDP templates now vary phrasing based on detected product type (e.g., "Is this tank top comfortable for all-day wear?" vs generic "Is [product] right for me?")

---

## [2.3.1] — 2026-03-18

### Changed
- **Citation Opportunity Map v2 — Product Intelligence Layer** — complete rewrite of query generation for natural-sounding conversational queries; replaces rigid `{product}` string interpolation with context-aware template functions
  - New `extractProductIntelligence()` parses page title, URL, H1, and breadcrumbs to extract product type (100+ dictionary entries mapping tokens like "tees" → "t-shirts"), style keywords (boho, vintage, minimalist, etc.), and audience (women, men, kids, etc.)
  - Marketing fluff stripped from titles — "Shop", "Buy", "Browse", "Collection", "Free Shipping" etc. removed before query generation
  - Domain names humanized — `naturallife.com` → "Natural Life" instead of "naturallife"
  - **Separate PDP and PLP template sets** — collection pages get shopping/browsing queries ("Where can I find boho t-shirts for women?") instead of product-specific queries ("What are the specs for Shop Colorful Boho Tees?")
  - PLP queries incorporate style + audience + product type combinations for realistic conversational phrasing
  - PDP queries use cleaner product references with natural articles ("the [product]" instead of raw title text)

---

## [2.3.0] — 2026-03-18

### Added
- **Page type auto-detection** — `detectPageType()` identifies PDP vs PLP/collection pages using schema type, URL patterns, DOM structure, and og:type signals; page type badge displayed in side panel header and HTML report header; inapplicable factors auto-marked "N/A — Collection Page" on PLP pages (DEC-0025, ROAD-0034)
- **Citation Opportunity Map** — rule-based engine mapping failing AI Readiness factors to specific conversational query patterns the page cannot answer; personalized with extracted product name, brand, and category; displayed in AI Visibility tab and AI Readiness report section only; groups by priority: high-value missing → partially covered → well-positioned (DEC-0026, ROAD-0035)
- **HTML report executive summary** — "Top 3 priorities" hero section at the top of the report for CMO-level scanning; Tribbute CTA section for consulting lead conversion (ROAD-0036)

### Fixed
- `hasGuarantee` false negative when "no warranty" text appears in footer/legal sections — global negative guard on `document.body.innerText` blocked detection of valid warranty statements in product content; guarantee check now uses `getProductContentText()` with a localised 30-char negative-qualifier check around the match position (BUG-0066)
- `hasVariants` and `hasSwatches` false negatives on Shopify stores with custom themes — `hasVariants` now includes Dawn web components (`variant-selects`, `variant-radios`) and a `?variant=\d+` URL-based fallback; `hasSwatches` now includes `[class*="colour"]`, select-by-id/aria-label patterns, and a text-scan fallback that finds any legend/label element containing "color"/"colour" with interactive children (BUG-0065)
- FAQPage nested inside WebPage/ItemPage schema not extracted — `categorizeSchemas()` and `extractFaqFromSchema()` only processed top-level JSON-LD items; a fourth pass now recurses into `WebPage`/`ItemPage` `.mainEntity` to find nested FAQPage schemas (BUG-0064)

### Changed
- FAQ scoring now differentiates product-specific FAQ (full credit) from page-level FAQ (50% points, warning status) — FAQPage nested under WebPage/ItemPage is tagged `scope: 'page'`; standalone FAQPage and DOM-found FAQ retain full credit; factor details label now shows "page-level — not product-specific" when applicable
- New `faq-not-product-specific` recommendation fires when only a page-level FAQ is detected, guiding merchants to add product-specific questions with FAQPage schema markup on the product page

---

## [2.2.1] — 2026-03-10

### Fixed
- SEO internal link count hard-capped at 10 across all sites — an early-exit `break` in `extractSeoSignals()` fired once the scoring threshold was met, causing all sites with 10+ links to report exactly `10`; removed the break so the true count is always reported (BUG-0054)
- og:image CDN WebP delivery parameter not detected — CDNs (Imgix, Fastly, Cloudinary) use `auto=webp`, `fm=webp`, `format=webp` query params to serve WebP to capable clients; our HEAD request (no `Accept: image/webp`) received JPEG but LLMs with WebP support would get WebP; `verifyImageFormat()` and the URL fallback path now check for CDN WebP parameters and flag as `isWebP=true` when found (BUG-0055)
- Return policy bullet points extracted as product features on Shopify pages (FXR Racing) — `extractFeaturesFromContainer()` did not filter policy sections; added context guards that skip containers whose id/class matches `return|refund|policy`, containers inside `[class*="policy"]` sections, and individual `<li>` items matching return/shipping policy sentence patterns (BUG-0056)
- Description schema fallback threshold too tight — schema fallback only triggered at < 50 chars, preventing promotion of full schema descriptions when DOM had a short excerpt; changed to a word-count threshold (< 20 words) to trigger schema promotion more reliably (BUG-0057)
- Typeless JSON-LD AggregateRating silently dropped in `extractReviewSignals()` — second pass checked `itemType === 'aggregaterating'` and missed untyped blocks with `ratingValue`; added handler for typeless objects with a valid (0–5) `ratingValue` (BUG-0058)
- `schemas.reviews` always empty for JSON-LD Review schemas — `categorizeSchemas()` only populated `schemas.reviews` from microdata; standalone JSON-LD `Review` type items and `Product.review[]` arrays were never extracted; added JSON-LD `Review` handler and `Product.review` extraction (max 5) to the first pass (BUG-0059)
- Certification regex ran on full `document.body.innerText` — false positives from footer text, seller policy pages, and cross-site banners; `extractCertifications()` now uses `getProductContentText()` to scope extraction to main product content (BUG-0060)
- Brand `inTitle`/`inH1` false negative when schema brand name includes legal suffix — schema may store "Unplugged Performance INC" while title/H1 says "Unplugged Performance"; `extractBrandSignals()` now strips trailing legal suffixes (INC, LLC, LTD, Corp, Limited, etc.) before the string-contains check (BUG-0061)
- `hasReturnPolicy: false` despite `Offer.hasMerchantReturnPolicy` in product schema — enterprise retailers declare return policy via JSON-LD `Offer.hasMerchantReturnPolicy` without repeating it in DOM text; added schema fallback to `extractTrustConfidence()` that checks all Offer objects for this property (BUG-0062)
- Price text captured SKU instead of price value on BigCommerce — `[class*="price"]` matched a container div whose text begins with the product model/SKU; switched to extracting just the currency+number portion via regex from the element text (BUG-0063)
- `shippingText` captured raw CSS instead of shipping info on WooCommerce pages — `[class*="shipping"]` matched the product wrapper div (class `shipping-taxable`) which contains an inline `<style>` element; `textContent` includes style tag contents; switched to `innerText` (which excludes `<style>` content) and added a 600-char length guard to skip large containers (BUG-0053)
- `hasTrustBadges` false negative on WooCommerce pages using a "Guaranteed Safe Checkout" section — selectors and text regex only covered third-party seal names (Norton, McAfee, etc.); added `[class*="guaranteed-safe-checkout"]`, `[class*="safe-checkout"]`, `[class*="checkout-badge"]`, `[class*="payment-badge"]` selectors and added `guaranteed safe checkout` to the text regex (BUG-0052)
- Empty JS review platform placeholder divs caused false positives on `hasProminentReviews` and `hasStarVisual` — e.g. `<div class="klaviyo-star-rating-widget">` (empty) matched `[class*="rating"]` and `[class*="star-rating"]`, giving passing scores with no extractable data; both checks now require the matched element to have children or text content; added detection of 10 known JS review platforms (Klaviyo, Okendo, Judge.me, Yotpo, Loox, Stamped, Trustpilot, Reviews.io, Bazaarvoice, PowerReviews) returned as `reviewPlatform`; new `review-platform-no-schema` AI Readiness recommendation fires when a platform is detected without `aggregateRating` schema output, with the platform name in the description (BUG-0051)
- Review rating and count not detected on modern WooCommerce sites — WooCommerce v7+ replaced `itemprop="ratingValue"` microdata with `aria-label="Rated X.XX out of 5"` on `.star-rating` and uses a bare `<span class="count">` inside `.woocommerce-review-link` for the count; WooCommerce also does not emit `aggregateRating` in JSON-LD without a SEO plugin; added aria-label parsing, WooCommerce count selectors, and review link text parsing to DOM fallbacks in both `extractReviewSignals()` (AI Readiness) and `extractReviewsSocialProof()` (PDP Quality) (BUG-0050)
- `hasShippingInfo` false negative on pages offering only in-store or curbside pickup — shipping extraction had no coverage for pickup language; added `pick.?up` to accordion keyword detection and expanded text regex to match `available/ready/free for (in-store) pick-up`, `curbside pick-up`, `local pick-up`, and `store pick-up` (BUG-0049)

---

## [2.2.0] — 2026-03-05

### Added
- SEO recommendations for page title, meta description, H1, and heading structure now display the extracted on-page value in a styled block within the recommendation card — merchants can see the exact current text and character count without viewing source; title length and meta description length recs also show the target character range (50–60 and 140–160 respectively)
- New `seo-image-title-not-alt` SEO recommendation fires when images use a `title` attribute without a corresponding `alt` attribute — explains that `title` is a hover tooltip not read by search engines or screen readers, and guides the merchant to add proper `alt` text; replaces the generic `seo-image-alt` rec when this specific pattern is detected; `analyzeImages()` now tracks `withTitleButNoAlt` count

### Fixed
- `extractBrandSignals()` and `extractAwardsFromSchema()` used `for (const item of iterateSchemaItems())` without destructuring — `item` held the `{ type, item }` wrapper so `item['@type']` was always `undefined`; brand was always "missing" from schema (12 pts lost in Authority & Trust) and schema awards were dead code (BUG-0041)
- PDP `reviewCount` DOM extraction returned 37729 (false positive) on BigCommerce pages — bare-number aria-label regex matched a part number; changed to schema-first extraction with typeless-block fallback; DOM tier only runs when schema provides no count, and bare-number regex removed (BUG-0042)
- `BreadcrumbList` nested inside `ItemPage` JSON-LD `@graph` was never extracted — BigCommerce emits `{ "@type": "ItemPage", "breadcrumb": { "@type": "BreadcrumbList", ... } }`; `categorizeSchemas()` only handled top-level BreadcrumbList; added second pass to inspect ItemPage breadcrumb property (BUG-0043)
- `extractReviewSignals()` dropped review dates and body text from typeless JSON-LD blocks (BigCommerce) — second pass required `itemType === 'product'` which was never true for untyped blocks; added third pass scanning typeless blocks for `review[]` arrays (BUG-0044)
- `scoreEntityConsistency()` used `h1Texts[0]` (same empty-first-H1 bug as BUG-0040) — empty BigCommerce placeholder H1 caused H1 to be excluded from entity consistency check; changed to `find()` for first non-empty H1 (BUG-0045)
- `analyzeHeadings()` counted empty `<h1>` DOM nodes — platforms like BigCommerce emit empty H1 render placeholders; pages with one empty + one real H1 got a false "Multiple H1s" penalty; H1 count now filters empty text nodes (BUG-0046)
- Review Count factor `points` could exceed `maxPoints` in UI when context multiplier applied (e.g. 24/22 in Want context) — `maxPoints` was hard-coded to base weight but `points` used a 1.5× cap; `maxPoints` now reflects effective maximum including multiplier (BUG-0047)
- `seo-internal-links` recommendation never fired for pages with 3–9 internal links — rec threshold was `< 3` but scorer warns at 3–9 and only passes at 10+; threshold corrected to `< 10` (BUG-0048)
- H1–Product Name Alignment always failed when the first H1 in the DOM was empty (BigCommerce render placeholder) — scorer took `h1Texts[0]` blindly; changed to `find()` for the first non-empty H1 (BUG-0040)
- SEO "Add breadcrumb navigation" recommendation fired on every page regardless of breadcrumb presence — `checkNavigationDiscoveryIssues()` read `contentStructure.breadcrumbs?.present` (non-existent path) instead of `seoSignals.domBreadcrumbs?.present`; scorer was correct, only the rec engine was wrong (BUG-0039)
- `aggregateRating` dropped when emitted in a typeless JSON-LD block (BigCommerce pattern: separate block with `@id` but no `@type`) — caused false "Make reviews more prominent" recommendation despite stars and count being visible in the hero; added second pass in `categorizeSchemas()` and untyped-block fallback in `extractReviewsSocialProof()` (BUG-0038)

---

## [2.1.2] — 2026-03-04

### Fixed
- `assessJSDependency()` missed Next.js, Gatsby, Angular, Remix, and styled-components apps — these pages scored `dependencyLevel: "low"` with no SPA warning despite dynamic content loading; added detection for all five frameworks plus `#__next`/`#___gatsby` to the `mainInJs` container check (BUG-0037)
- JS-rendered page warning now appears on PDP Quality and SEO tabs (previously AI Visibility only); warning text updated to explain that interactively-loaded content (e.g. Read More, accordions) is not captured; warning now triggers at `medium` dependency level in addition to `high` (BUG-0037)
- Description extraction fell back to short schema string when on-page description was present but CSS-hidden (`display:none`) behind a "Read More" button — selector loop now tracks CSS-hidden candidates and promotes them when no visible element is found; reads `textContent` instead of `innerText` for hidden elements (BUG-0035)
- Feature extraction returned 0 features on sites using H2+paragraph layout for feature callouts (e.g. Arc'teryx) — added H2+paragraph fallback that detects heading/description pairs in the product content area; uses `textContent` so CSS-hidden feature content is also captured (BUG-0036)
- `schemas.product.name` lost when a page emits multiple `ProductGroup` JSON-LD blocks — `categorizeSchemas()` now merges subsequent blocks instead of overwriting, preserving name/brand/image from whichever block provided them (BUG-0021)
- SEO "Product Name in Title" false negative when schema name is verbose and title is a concise marketing variant — added 2-word brand+model prefix check (≥8 chars) for schema name; changed H1 fallback from first-3-words to first-2-words with same length guard (BUG-0022)
- `scoreProtocolMeta()` read removed `robots.isBlocked` property (deleted in v2.1.1), causing noindex pages to silently score full AI Readiness points on the Robots factor — now reads `robots.noindex === true` (BUG-0023)
- Review recency recommendation fired on every product with reviews due to wrong property path (`reviews.recency.hasRecentReview` → `reviews.hasRecentReviews`); review depth recommendation never fired (`recency.averageLength` → `reviews.averageReviewLength`) (BUG-0024)
- `description-quality-low` recommendation never fired — read `desc.qualityScore` which is never produced by the extractor; now checks `hasBenefitStatements`, `hasEmotionalLanguage`, `hasTechnicalTerms` directly (BUG-0025)
- 7 category scorers (`scoreStructuredData`, `scoreProtocolMeta`, and all 5 PDP scorers) missing `Math.min(100, rawScore)` cap — context multipliers could push category totals above 100 (BUG-0026)
- `schemas.product` null check `!== null` would treat `undefined` (extraction error) as present, causing crashes on downstream property access — changed to loose `!= null` (BUG-0027)
- SEO Breadcrumb Navigation factor read non-existent `contentStructure.breadcrumbs` key — DOM breadcrumbs were never detected; added `domBreadcrumbs` to `extractSeoSignals()` and updated scorer to read it (BUG-0028)
- `extractAwardsFromSchema()` used `data['@graph'] || [data]` — didn't handle top-level JSON-LD array format, wrapping the whole array as a single item and missing all awards (BUG-0029)
- `extractAnswerFormatContent()` double-counted signals: `useCaseMatches` shared 5 verbs with `bestForMatches`, so a single "best for X" sentence contributed 2 of 4 signals — `useCaseMatches` now uses exclusively `suitable|recommended` verbs (BUG-0030)
- SEO meta description recommendation only fired outside 100–180 chars; descriptions of 161–180 chars received a warning score with no advice — trigger aligned to scorer's optimal 140–160 range (BUG-0031)
- `H1 Heading` inline tip showed "add an H1" advice when the actual issue was duplicate H1s — factor name is now `'H1 Heading (Multiple)'` when `h1.count > 1`, mapped to the `multiple-h1` template (BUG-0032)
- `extractBrandSignals()` and `extractAwardsFromSchema()` bypassed the JSON-LD cache, re-parsing all `<script type="application/ld+json">` tags on every analysis — refactored to use `iterateSchemaItems()` (BUG-0033)
- `meetsThreshold` property in `extractReviewsSocialProof()` return was dead code (never read by any consumer) — removed (BUG-0034)

---

## [2.1.1] — 2026-03-04

### Fixed
- `robots.isBlocked` was computed identically to `robots.noindex`, causing double-penalisation across AI Readiness and SEO categories and duplicate recommendations for the same issue
- `og:type = "og:product"` (Shopify) passed the scorer but triggered a false `og-type-missing` recommendation — rec engine now mirrors scorer's `isProductType` check
- SEO category scorers (`scoreTitleMeta`, `scoreTechnicalFoundations`, `scoreContentSignals`, `scoreNavigationDiscovery`) were missing `Math.min(100, rawScore)` guard present in all other category scorers
- URL slug rec engine used falsy check (`!url.isClean`) while scorer used safe default (`!== false`), causing rec to fire even when scorer passed the factor
- Title length recommendation triggered outside 40–70 chars but scorer awards full pass only at 50–60 chars — now aligned to 50–60
- Tab switching during an active analysis reverted to the context selector instead of preserving the loading state, potentially triggering a second concurrent analysis
- Internal link count queried all page anchors (including nav/header/footer), making the factor trivially pass; now scoped to main content area with early exit at threshold
- Hreflang absence scored as `warning` with half-points, preventing monolingual sites from achieving a perfect SEO score; now scores `pass` with N/A label
- Spreading a `null` return from `createRecommendation()` silently produced an incomplete recommendation object that bypassed the null filter
- `materials-missing` and `care-instructions-missing` recommendations fired unconditionally on every product page; now gated to apparel products only
- `awards-missing` recommendation fired on every page regardless of context; now only fires when context multiplier boosts authority signals
- SEO score result was missing `context` field, breaking the pattern of all other score results
- `switchTab()` branches for results/pdp/seo did not defensively hide `loadingState` and `errorState` before delegating to show helpers
- `pruneIfNearQuota()` mutated the caller's array in-place; now reads fresh history internally and returns a boolean
- `updatePageInfo()` called `new URL(tab.url)` without guarding against `chrome://` URLs, causing silent errors when the side panel is open without a web page active
- `processResults()` called `new URL(pageUrl)` without error handling for malformed URLs

### Changed
- Extracted shared `setupCategoryListDelegation()` method — eliminates three identical event delegation blocks
- Extracted shared `sortRecommendations()` module-level function — eliminates three identical sort comparators across all three recommendation engines
- Removed unused `getTopRecommendations()`, `getRecommendationsByCategory()`, `getCriticalRecommendations()`, and `getQuickWins()` methods from `RecommendationEngine` and `PdpQualityRecommendationEngine`

---

## [2.1.0] — 2026-03-04

### Added
- **SEO Quality** scoring dimension: 4 categories (Title & Meta, Technical Foundations, Content Signals, Navigation & Discovery), 19 factors, context-neutral scoring (DEC-0024)
  - Title & Meta (25%): title tag presence, title length optimal (50–60 chars), meta description presence, meta description length (140–160 chars), product name in title
  - Technical Foundations (25%): page indexable, canonical URL valid, product schema present, breadcrumb schema present, low JS dependency
  - Content Signals (25%): sufficient content length (300+ words), heading structure, image alt coverage, content readability, URL slug quality
  - Navigation & Discovery (25%): breadcrumb navigation (DOM or schema), H1–product name alignment, internal link presence (10+), hreflang configuration
- `SeoQualityRecommendationEngine` with 19 recommendation templates across all 4 SEO categories
- SEO tab (4th) in bottom navigation with magnifying glass icon
- SEO grade badge (3rd) in history list entries alongside AI Readiness and PDP Quality badges
- SEO Quality section in HTML report export
- `seoScoring` and `seoRecommendations` keys in JSON export
- `seoScore`, `seoGrade`, `seoCategoryScores` fields in history storage entries (backward-compatible)
- `extractSeoSignals()` in content script: title tag, URL structure, internal link count

### Fixed
- Features List extraction scoring 0/10 on custom-themed WooCommerce/Tailwind sites — added WooCommerce Tier 1 selectors, new Tier 2.5 heuristic-based product content area scan (structural list detection in `getMainContentArea()`), and expanded Tier 3 benefit verb pattern with 18 additional starting words (BUG-0020)
- `hasUrgency` false negative for soft scarcity phrases — split into strong (15 pts, pass) and soft (8 pts, warning) urgency tiers; "limited availability", "available while", "at this price", "limited edition", "back in stock" now score partial points (BUG-0019)

---

## [2.0.1] — 2026-03-02

### Added
- Download Report and Download Analysis Data buttons on PDP Quality tab (ROAD-0032)
- PDP Quality scoring model: 30 factors across 5 categories measuring consumer shopping experience (ROAD-0027)
  - Purchase Experience (25%): price visibility, CTA presence, CTA clarity, discount messaging, payment indicators, urgency signals
  - Trust & Confidence (20%): return policy, shipping info, trust badges, secure checkout, customer service, guarantee display
  - Visual Presentation (20%): image count, video presence, gallery features, lifestyle images, color swatches, image quality
  - Content Completeness (15%): variant display, size guide, related products, Q&A section, content organization, package contents
  - Reviews & Social Proof (20%): review prominence, star visuals, review sorting/filtering, photo reviews, social proof indicators, review count
- PDP Quality context multipliers (Want/Need/Hybrid) adjusting factor weights by purchase type
- PDP Quality tab in bottom navigation with shopping bag icon
- PDP Quality recommendation engine (`PdpQualityRecommendationEngine`) with 30 recommendation templates
- Dual grade badges in history list (AI Readiness + PDP Quality per entry)
- PDP Quality section in HTML report export (score hero, category bars, factor details, grouped recommendations)
- PDP Quality data in JSON export (`pdpScoring` and `pdpRecommendations` keys)
- PDP Quality scores in comparison view with labeled AI Readiness / PDP Quality sections
- Backward-compatible history: entries without PDP data gracefully show "N/A"

### Changed
- Bottom navigation expanded from 2 tabs to 3: AI Visibility (renamed from Results), PDP Quality, History
- "Results" tab renamed to "AI Visibility" for clarity alongside PDP Quality tab
- HTML report includes both AI Readiness and PDP Quality sections with labeled headers
- Storage entries now include `pdpScore`, `pdpGrade`, and `pdpCategoryScores` fields
- `performFullExtraction()` returns `pdpQuality` key with all 5 category extraction results (single DOM pass, DEC-0020)
- Version bumped to 2.0.0 in manifest.json

### Fixed
- `hasDiscount` false negative on B2B/parts platforms — added MSRP/list-price/price-original selectors, extended text regex, added schema-vs-DOM price mismatch heuristic (≥5% gap = sale detected) (BUG-0014)
- `reviewCount` false positive from part-number digits in aria-label section headings — tightened selector with :not(heading) guard, tightened extraction regex to require review/rating context (BUG-0015)
- `hasLifestyleImages` false positive on industrial/parts pages — image-count fallback now skips when breadcrumb or URL signals industrial/parts category (BUG-0016)
- `hasOrganizedDetails` false negative on semantic section/H2 structures — added fallback for 3+ sections or headings in main (BUG-0017)
- `customerCount` regex matching part-number digits via `\b` at hyphens — require whitespace/comma/start-of-line before digit group (BUG-0018)
- `priceText` truncating to label prefix ("Regular price") instead of actual price value — strip label before 30-char cut (BUG-0012)
- `hasGalleryFeatures` false negative on Walmart and Old Navy — added ARIA navigation button selectors, data-testid carousel/gallery patterns, and media/image/photo-gallery class fragments (BUG-0013)
- SVG-only payment icons (Shopify/React storefronts) not detected — added SVG aria-label/title selectors and payment container class patterns (BUG-0007)
- `[class*="compare"]` discount selector matched "Compare Product" navigation buttons — replaced with narrow `compare-at`/`compare-price` selectors (BUG-0008)
- `reviewCount` returning zero on platforms using partial class names, data-testid, or Amazon element IDs — expanded selector and read aria-label attribute for count extraction (BUG-0009)
- `hasRelatedProducts` and `hasQASection` false negatives on Amazon, Walmart, SportChek — added Amazon data-feature-name, Walmart/React data-testid, and id-based selectors (BUG-0010)
- `hasReviewSorting` false negative on Amazon and React platforms — added data-action/data-hook/data-testid selectors and expanded text patterns with "top reviews", "newest", "most critical" (BUG-0011)
- `[class*="badge"]` trust badge selector matched sale/category labels on every tested site, inflating Trust & Confidence by 4 pts per page — replaced with narrow security-specific selectors and SVG fallbacks (BUG-0003)
- CTA detection captured search form submit button before add-to-cart on Natural Life — moved `button[type="submit"]` to end of selector list, added product-form scoped selectors (BUG-0004)
- `hasVariants` false negative on Amazon, FXR Racing, SportChek — expanded selector list with Amazon, data-attribute, and class-fragment patterns; added text-based fallback for React platforms (BUG-0005)
- `hasProminentReviews` false negative on Walmart, SportChek, Amazon — extended inner selector with ARIA, data-testid, and Amazon-specific hooks; added schema-based fallback (BUG-0006)
- PDP recommendation engine generating false "missing" recommendations for factors that actually pass — all 27 property references in `PdpQualityRecommendationEngine` corrected to match extractor flat-boolean output (BUG-0002)
- Return policy and shipping info not detected in expandable/accordion elements on Shopify themes (BUG-0001)

### Removed

### Deprecated

### Security

---

## [1.1.0] — 2026-02-XX

### Added
- AI Discoverability category (20% weight) with 5 factors: AI Crawler Access, Entity Consistency, Answer-Format Content, Product Identifiers, llms.txt Presence
- robots.txt parsing for 15 AI crawlers from 10 companies (OpenAI, Anthropic, Google, Perplexity, Apple, Meta, ByteDance, Cohere, You.com, Amazon)
- llms.txt and llms-full.txt presence detection
- Entity consistency scoring across Product schema name, H1, og:title, meta description, page title
- Answer-format content detection ("best for" statements, comparisons, how-to, use cases)
- Product identifier (GTIN/MPN/SKU) scoring with Shopify hasVariant fallback
- Content Freshness factor using schema dateModified/datePublished
- Social Proof Depth factor (sold count, customer count)
- Expert Attribution factor (clinical, professional, editorial references)
- Comparison Content factor in Content Quality (10 pts, contextual)
- Specification Detail factor (measurement unit detection)
- Last-Modified header fetch for content freshness
- Apparel category auto-detection with N/A handling for warranty/compatibility/dimensions
- French keyword support in apparel detection for Canadian retailers
- Inline expandable recommendation tips for all 56 factors (FACTOR_RECOMMENDATIONS mapping)
- Self-contained HTML report export with Tribbute branding, base64-embedded logo, priority-grouped recommendations
- JSON data export
- Side-by-side comparison view for 2 history entries
- Bottom navigation tabs (Results / History)
- JS-rendered page warning banner when SPA detected
- Version badge in footer via chrome.runtime.getManifest().version
- UTM-tracked external links (header logo, footer, report)

### Changed
- Category weights rebalanced: Structured Data 23→20%, Protocol & Meta 18→15%, Content Quality 23→20%, Content Structure 13→12%, AI Discoverability 10→20%
- Content Structure factor weights rebalanced: contentRatio 12→8, tableStructure 10→7, ariaLabels 6→3, readability 8→7
- Comparison Content weight doubled from 5→10 pts in Content Quality
- Extraction logic consolidated from extractors/ directory into single content-script.js

### Fixed
- Shopify ProductGroup handling (treated identically to Product in schema extraction)
- @id reference resolution for AggregateRating (common Shopify pattern)
- Canonical URL handling for Shopify collection→product paths (isProductCanonical)
- Feature extraction nav guard (skips header/footer/navigation containers)
- False positive prevention in certification/warranty regex via negative-context guards
- Race condition prevention via requestId system with 10-second timeout

### Security
- Message sender validation (sender.id === chrome.runtime.id)
- URL safety guards via isSafeUrl() blocking file:/localhost/127.0.0.1/0.0.0.0
- CSP enforcement: script-src 'self'; object-src 'self'
- XSS prevention via escapeHtml() in sidepanel.js and esc() in report-template.js

---

## [1.0.0] — 2026-01-XX

### Added
- Initial Chrome extension release (Manifest V3)
- Core scoring engine with 6 categories: Structured Data, Protocol & Meta, Content Quality, Content Structure, Authority & Trust, AI Discoverability
- Context-sensitive scoring (Want/Need/Hybrid) with 10 factor multipliers
- 56+ factor analysis with graduated scoring
- JSON-LD and Microdata extraction (Product, Offer, AggregateRating, Review, FAQPage, BreadcrumbList, Organization, Brand, ImageObject)
- og:image format verification via three-tier detection (Content-Type → magic bytes → URL extension)
- Chrome Side Panel UI with grade badge, category breakdown, and recommendations
- Analysis history with chrome.storage.local persistence (max 100 entries)
- Auto-pruning at 80% storage quota
- Prioritized recommendations engine with 58 templates
- Privacy-first architecture (zero telemetry, all-local processing)
