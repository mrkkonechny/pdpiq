# Decision Log

> **PDS Document 07** | Last Updated: 2026-03-03

Track architectural, technical, and strategic decisions with their rationale. Most recent entries at the top. Never delete entries — decisions that were later reversed are valuable context.

## Template

```
### DEC-[NNNN] — [Short description of decision]
- **Date:** YYYY-MM-DD
- **Status:** Proposed | Accepted | Superseded by DEC-XXXX | Deprecated
- **Context:** [What situation prompted this decision?]
- **Decision:** [What was decided?]
- **Rationale:** [Why this option over alternatives?]
- **Alternatives Considered:** [What else was evaluated and why it was rejected?]
- **Consequences:** [What are the expected downstream effects — positive and negative?]
- **Related:** [BUG-NNNN, ROAD-NNNN, or other DEC-NNNN references]
```

---

## Decisions

### DEC-0024 — Add SEO Quality as third scoring dimension
- **Date:** 2026-03-04
- **Status:** Accepted
- **Context:** pdpIQ had two scoring models (AI Readiness, PDP Quality). Merchants and SEO practitioners requested a third dimension evaluating on-page SEO signals: title/meta, technical foundations, content signals, and navigation/discovery. SEO Quality covers factors already useful for the AI Readiness score (canonical, indexability, schema) but evaluated against organic search best practices, not LLM citation practices.
- **Decision:** Add `SEO Quality` as a context-neutral third scoring dimension with 4 categories (25% each), 19 factors total. Reuses already-extracted data from `metaTags`, `contentStructure`, `structuredData`, and `contentQuality`. Adds `extractSeoSignals()` for 3 new signals (title tag, URL structure, internal link count). Adds a 4th bottom nav tab ("SEO") with a magnifying glass icon.
- **Rationale:** Many factors already extracted by pdpIQ (canonical, robots, heading structure, readability, schema) are directly relevant to SEO. A dedicated SEO tab surfaces this value with correct framing. Context-neutral scoring was chosen because SEO is independent of consumer purchase intent.
- **Alternatives Considered:** Folding SEO factors into AI Readiness (rejected — different audiences and interpretation). Adding SEO as optional overlay on existing tabs (rejected — requires a standalone experience for clarity).
- **Consequences:** 4-tab bottom nav (AI Visibility, PDP Quality, SEO, History). History entries gain a 3rd grade badge. Reports gain a SEO section. Extraction pass gains 3 lightweight signals (no network requests). Storage entries gain `seoScore`, `seoGrade`, `seoCategoryScores` keys.
- **Related:** ROAD-0033

### DEC-0023 — Heuristic-based product content area scan for feature list extraction (Tier 2.5)
- **Date:** 2026-03-03
- **Status:** Accepted
- **Context:** Feature List extraction scored 0/10 on sites using utility-first CSS (Tailwind), page builders, or custom WooCommerce themes. Tier 1 (CSS selectors) fails without semantic class names. Tier 2 (heading keywords) fails when headings are descriptive rather than generic. Tier 3 (`extractFeatureLikeItems`) is too restrictive with its benefit-verb filter. This gap affects a growing population of custom-themed sites.
- **Decision:** Add a new Tier 2.5 fallback that uses `getMainContentArea()` to scope into the product zone, then scans all `<ul>/<ol>` elements for structural feature-list characteristics. Heuristics: ≥3 direct `<li>` children with 15–500 char text, average qualifying text ≥25 chars, ≤50% link-wrapped items, not inside nav/header/footer/sidebar/cart. Select the list with the most qualifying items and run `extractFeaturesFromContainer()` (permissive harvester).
- **Rationale:** Structural heuristics are more resilient than class-name matching for utility-first CSS frameworks. The length and link-ratio filters reliably distinguish feature lists from navigation menus without relying on semantic markup. Using `extractFeaturesFromContainer()` (not `extractFeatureLikeItems()`) avoids the overly strict benefit-verb gate that caused the original false negative.
- **Alternatives Considered:** Expand Tier 2 heading keywords with more patterns (fragile — creative headings are unbounded). Lower Tier 3 verb threshold (would increase false positives on non-feature lists). NLP-based classification (too heavy for a content script).
- **Consequences:** May capture non-feature lists that happen to match the structural heuristics (mitigated by the nav/sidebar exclusion and length filters). Adds ~2ms per extraction for the DOM scan. Only fires when Tiers 1 and 2 both fail, so no impact on sites with semantic markup.
- **Related:** BUG-0020

### DEC-0022 — Expandable element detection for Trust & Confidence extraction
- **Date:** 2026-03-01
- **Status:** Accepted
- **Context:** Return policy and shipping info were not detected on Shopify themes that place this content inside `<details>/<summary>` elements or accordion/collapsible sections with generic class names. The existing detection relied on class/ID selectors containing "return" or "shipping", which missed expandable containers with names like `.product-info button`.
- **Decision:** Add two new detection layers between the selector-based check and the text-pattern fallback: (1) iterate all `<details>` elements and check if their `<summary>` text contains return/shipping keywords, (2) iterate accordion/collapsible buttons and check for keywords, resolving associated content panels via `aria-controls`.
- **Rationale:** `<details>/<summary>` is a native HTML5 pattern increasingly used by Shopify themes. Accordion buttons with `aria-controls` are the standard accessible pattern for custom expandable sections. Checking heading text for keywords is more reliable than class name matching for generic components.
- **Alternatives Considered:** Add more class-name selectors (fragile — each Shopify theme uses different naming). Search all visible text first (already done as last fallback — but it matches too broadly, e.g., "Start a Return" link in footer).
- **Consequences:** Slightly more DOM queries per extraction (~5-10 additional `querySelectorAll` calls). May detect non-product-page expandable sections if they mention returns/shipping, though the text-length guard mitigates this.
- **Related:** BUG-0001, ROAD-0032

### DEC-0021 — Tab-based UI for dual scores (separate bottom nav tabs)
- **Date:** 2026-03-01
- **Status:** Accepted
- **Context:** With two separate scores (AI Readiness and PDP Quality), the UI needs a way to present both without confusion. Options included a toggle within the existing Results tab, side-by-side panels, or separate bottom nav tabs.
- **Decision:** Expand bottom nav from 2 tabs (Results, History) to 3 tabs (AI Visibility, PDP Quality, History). Each score gets its own full-screen tab. Rename "Results" to "AI Visibility" for clarity.
- **Rationale:** Full-tab separation avoids cramming two score breakdowns into one view. Users analyze one dimension at a time. The "AI Visibility" rename better describes what that tab measures. Three tabs still fit comfortably in the side panel's ~400px width.
- **Alternatives Considered:** Toggle within Results tab (compact but confusing — users might miss the second score). Side-by-side (too narrow in side panel). Dropdown selector (hidden discoverability).
- **Consequences:** History tab shows dual grade badges per entry. Comparison view includes both score types. Report export includes both sections. All show/hide logic must account for three views instead of two.
- **Related:** DEC-0019, DEC-0020, ROAD-0027

### DEC-0020 — Reuse extraction data between both scores (single DOM pass)
- **Date:** 2026-03-01
- **Status:** Accepted
- **Context:** PDP Quality factors need DOM data (prices, CTAs, images, reviews). AI Readiness already runs a full DOM extraction. Running two separate passes would double extraction time and create timing inconsistencies.
- **Decision:** Single `performFullExtraction()` call returns one object containing both AI Readiness data (`structuredData`, `metaTags`, etc.) and PDP Quality data (`pdpQuality` key with 5 sub-objects). Both scoring engines consume from this shared extraction result.
- **Rationale:** Zero additional overhead. No timing issues. Extraction functions can share DOM caches (e.g., JSON-LD cache). PDP Quality extraction adds ~50ms to a pass that already takes ~200ms.
- **Alternatives Considered:** Separate extraction pass (clean separation but doubles work and risks stale data). Lazy extraction on tab switch (responsive but complex state management and user sees loading spinner on tab switch).
- **Consequences:** `content-script.js` grows larger (~500 lines of PDP extraction added). All extraction runs even if user only cares about one score. `performFullExtraction()` return shape is more complex.
- **Related:** DEC-0019, DEC-0014

### DEC-0019 — Add PDP Quality as separate dual scoring model
- **Date:** 2026-03-01
- **Status:** Accepted
- **Context:** pdpIQ v1.x scores pages exclusively for AI citation readiness. Merchants also need to understand how well their PDPs serve consumers — driving engagement, trust, and conversion. The question was whether to expand the existing score or add a separate one.
- **Decision:** Add a separate PDP Quality score (30 factors, 5 categories) alongside the existing AI Readiness score (56 factors, 6 categories). Same grading scale (A/B/C/D/F, 90/80/70/60 thresholds) but different grade descriptions. Both scores calculated simultaneously, stored in history, included in reports.
- **Rationale:** AI Readiness and PDP Quality measure fundamentally different things — one measures machine discoverability, the other measures human shopping experience. Combining them into a single score would dilute both signals and make recommendations confusing. Separate scores let merchants prioritize independently.
- **Alternatives Considered:** Combined single score (simpler but dilutes both signals). Replace AI Readiness with PDP Quality (loses core product identity). Weighted blend with user-adjustable ratio (flexible but complex UX and hard to explain).
- **Consequences:** All UI surfaces need dual-score awareness (history, comparison, export, report). Storage entries grow slightly. Users see two grades per analysis. v2.0 feature — broadens pdpIQ from specialist AI tool to dual-purpose PDP analyzer.
- **Related:** DEC-0020, DEC-0021, ROAD-0027

### DEC-0018 — Double AI Discoverability weight from 10% to 20%
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** AI Discoverability was originally 10% of the total score. As AI-powered search (ChatGPT, Perplexity, Gemini) became a major discovery channel, the weighting underrepresented its importance.
- **Decision:** Increase AI Discoverability from 10% to 20%. Rebalance: Structured Data 23->20%, Protocol & Meta 18->15%, Content Quality 23->20%, Content Structure 13->12%. Authority & Trust stayed at 13%.
- **Rationale:** AI citation is the core value proposition of pdpIQ. A 10% weight gave AI factors less influence than Content Structure, mismatching the product's positioning. Keeping original weights would underweight the primary feature.
- **Alternatives Considered:** Keep at 10% and add more factors (no score disruption but underweights category). Create separate AI-readiness score (clear separation but adds complexity with two scores to explain).
- **Consequences:** Historical scores are not directly comparable to new scores. Some pages may see score drops from the rebalancing.
- **Related:** DEC-0017

### DEC-0017 — Rebalance Content Structure factor weights for AI relevance
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** Within Content Structure, several factors were over-weighted relative to AI citation impact. Code comments: `contentRatio` was 12 (reduced to 8), `tableStructure` was 10 (reduced to 7), `ariaLabels` was 6 (reduced to 3), `readability` was 8 (reduced to 7). Freed points went to `jsDependency` (10 pts) and `primaryImageAlt` (10 pts).
- **Decision:** Reduce `contentRatio` (12->8), `tableStructure` (10->7), `ariaLabels` (6->3), `readability` (8->7). Per code comments: "LLMs don't penalize chrome ratio" and ARIA labels are "accessibility, not AI citation."
- **Rationale:** LLMs process text content, not visual layout ratios. Accessible markup is good practice but doesn't affect whether an AI can cite a product. JS dependency and primary image alt text have more direct impact on AI crawlability.
- **Alternatives Considered:** Keep original weights (stable scores but over-penalizes cosmetic HTML issues).
- **Consequences:** Accessibility-focused pages see less credit for ARIA labels. Content-to-chrome ratio, a valid SEO signal, is de-emphasized.
- **Related:** DEC-0018

### DEC-0016 — Double comparison content weight (5 to 10 pts)
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** Comparison content ("vs.", "compared to", "alternative to") is a strong signal for AI citation — LLMs frequently answer comparison queries. Original 5-point weight was too low. Code comment: "was 5, rebalanced to sum to 100."
- **Decision:** Double comparison content from 5 to 10 points within the Content Quality category.
- **Rationale:** AI assistants frequently handle "X vs Y" queries. Pages with comparison content are significantly more likely to be cited in these responses.
- **Alternatives Considered:** Keep at 5 pts (stable but underweights a valuable signal).
- **Consequences:** Non-comparison products (e.g., unique niche items) lose more points for lacking comparison content.
- **Related:** DEC-0018

### DEC-0015 — Auto-detect apparel category with N/A handling
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** Fashion/apparel pages scored lower than electronics or home goods because they lack warranty, compatibility specs, and dimensions. These factors are genuinely irrelevant for clothing.
- **Decision:** `ScoringEngine.isLikelyApparel()` checks breadcrumbs, product schema category, and URL path against English + French apparel keywords. When detected, warranty, compatibility, and dimensions score as "pass" with "N/A for apparel." Recommendation engine skips these factors on apparel pages.
- **Rationale:** Automatic detection eliminates user friction. French keywords included for Canadian retailers (bilingual category structures). Manual category selector rejected due to UI complexity.
- **Alternatives Considered:** Manual category selector in UI (user control but extra complexity; users may forget). Ignore the problem (simple but unfair scores for clothing brands).
- **Consequences:** False positives possible (e.g., "jacket" for a laptop case). False negatives on non-standard category naming. Detection is heuristic, not definitive.
- **Related:** ROAD-0006

### DEC-0014 — Consolidate extraction logic into single content-script.js
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** Extraction logic was originally split across files in `src/content/extractors/`. Refactored to a single `content-script.js`. CLAUDE.md documents: "The `src/content/extractors/` directory was deleted."
- **Decision:** Consolidate all extraction logic into `content-script.js`. Delete the `extractors/` directory.
- **Rationale:** Chrome content scripts have limited ES module support. Splitting extraction created import complexity and debugging challenges without meaningful benefits — all extractors operate on the same DOM and share the same JSON-LD cache.
- **Alternatives Considered:** Multiple extractor modules (smaller files but Chrome content script import complexity and debugging across files). Background script extraction (clean separation but loses direct DOM access).
- **Consequences:** `content-script.js` is a large file (~2000 lines). No separation of concerns for extraction sub-domains.
- **Related:** ROAD-0009

### DEC-0013 — Three-tier image format detection (Content-Type, magic bytes, URL)
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** Detecting og:image format is critical because WebP images are invisible in most LLM chat interfaces. Simple URL extension check is unreliable — many CDNs serve WebP with `.jpg` extensions via content negotiation.
- **Decision:** Three-tier fallback: (1) HTTP HEAD for Content-Type, (2) fetch first 16 bytes and check magic bytes (JPEG: FF D8 FF, PNG: 89 50 4E 47, WebP: RIFF...WEBP), (3) URL extension pattern matching.
- **Rationale:** HEAD request succeeds for most CDNs and is cheapest. Magic bytes provide ground truth when headers unreliable. URL extension is last resort. Range header (`bytes=0-16`) minimizes data transfer.
- **Alternatives Considered:** Content-Type only (simple but fails on CORS-restricted CDNs). URL extension only (zero requests but unreliable for modern CDNs). Full image download (most accurate but wastes bandwidth).
- **Consequences:** Up to 2 network requests per image (HEAD + Range GET). Some CDNs return "unknown" even after all three tiers.
- **Related:** DEC-0005

### DEC-0012 — Request ID system for race condition prevention
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** Users can navigate to a new page or re-trigger analysis while a previous analysis is running. Without a guard, stale results could overwrite current page's results.
- **Decision:** Each analysis generates a unique `requestId` (timestamp + random string). Content script echoes it back. Side panel ignores responses where requestId doesn't match `currentRequestId`. 10-second timeout clears loading state if no valid response arrives.
- **Rationale:** ID-matching is simple, stateless, and handles all race conditions — page navigation, rapid re-analysis, slow content scripts. The timeout is a safety net against silent failures.
- **Alternatives Considered:** AbortController (native API but content script extraction can't be aborted mid-DOM-traversal). Debounce/throttle (reduces frequency but doesn't prevent stale results).
- **Consequences:** Completed-but-stale analyses are silently discarded. 10-second timeout is fixed, not adaptive to page complexity.
- **Related:** —

### DEC-0011 — Use Chrome Side Panel API (not popup or DevTools)
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** The extension needs to display results alongside the product page. Chrome has three main UI surfaces: popup (fixed-size overlay), DevTools panel, and side panel (introduced Chrome 114).
- **Decision:** Use Chrome Side Panel API (`chrome.sidePanel`) as primary UI. Opens on icon click via `openPanelOnActionClick: true`.
- **Rationale:** Side panel is the only option letting users view the product page and results simultaneously without covering content. Essential for the "analyze and act" workflow.
- **Alternatives Considered:** Popup (simple but closes on click outside; small fixed dimensions). DevTools panel (full-featured but requires DevTools open; not user-friendly). Separate tab (unlimited space but loses page context).
- **Consequences:** Requires Chrome 116+. Side panel width constrained (~400px). Not available in Firefox, Safari; Edge has limited support.
- **Related:** ROAD-0015

### DEC-0010 — Zero dependencies, no build tools
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** The project needed a technology approach for a Chrome extension analyzing DOM content, running scoring algorithms, and displaying results. Standard web dev involves npm, bundlers, frameworks.
- **Decision:** Pure vanilla JavaScript with ES modules. No npm, no package.json, no bundler, no transpilation.
- **Rationale:** The UI is a single side panel with a handful of views — not complex enough for a framework. Zero dependencies means zero supply chain vulnerabilities, instant dev feedback, and no build tooling to maintain. Chrome natively supports ES modules in MV3.
- **Alternatives Considered:** React + Vite (component model but build step, larger bundle, dependency management). Svelte (small bundle but still requires build). Preact (lightweight but still requires tooling).
- **Consequences:** No TypeScript type safety. Manual DOM manipulation. No automated testing framework out of the box. No component reuse model.
- **Related:** DEC-0003, ROAD-0001

### DEC-0009 — Zero telemetry, all-local processing
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** The extension analyzes eCommerce product pages which may contain competitive intelligence. Users need trust that analysis data stays private. Chrome Web Store scrutinizes data collection.
- **Decision:** No analytics, no telemetry, no error reporting, no external requests except to the analyzed site. PRIVACY.md: "pdpIQ does not collect, transmit, or share any user data with external servers."
- **Rationale:** Privacy is a competitive advantage for a tool analyzing competitor product pages. Zero telemetry eliminates user objections and simplifies CWS compliance.
- **Alternatives Considered:** Anonymous telemetry like Plausible (usage insights but privacy disclosure, network requests, CWS scrutiny). Full analytics like Mixpanel (rich data but GDPR burden, trust risk).
- **Consequences:** No visibility into how users use the tool. No automatic error reporting. No data to inform feature prioritization.
- **Related:** ROAD-0017

### DEC-0008 — chrome.storage.local for history (not IndexedDB)
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** Analysis history needs to persist across browser sessions. Two main options: `chrome.storage.local` (10MB, key-value) and IndexedDB (unlimited, structured queries).
- **Decision:** Use `chrome.storage.local` with compact entries (~2-4KB each). Auto-pruning at 80% quota (8MB) removes oldest 20%.
- **Rationale:** At ~3KB per entry, 100 entries use ~300KB — well within 10MB. The simple key-value model fits the access pattern (load all, display recent 20, filter by domain/URL).
- **Alternatives Considered:** IndexedDB (unlimited storage and indexing but complex API, overkill for simple history). localStorage (simplest but not available in service workers, 5MB limit).
- **Consequences:** Cannot reconstruct full factor details from history. 10MB hard limit. No per-device sync.
- **Related:** DEC-0007, ROAD-0013

### DEC-0007 — Compact history entries (scores + metadata only, not full factor data)
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** Full analysis result including all 56 factors is ~20-50KB per entry. Storing full data would exhaust 10MB quota at 200-500 entries.
- **Decision:** Store only `{ id, url, title, domain, score, grade, context, timestamp, categoryScores, recommendationCount, criticalIssues }`. Full factor details not persisted.
- **Rationale:** History view displays score, grade, domain, date — none require factor-level data. Comparison view uses category scores. Keeps entries at ~2-4KB, allowing thousands within quota.
- **Alternatives Considered:** Full data per entry (complete history but 200-500 entry limit, slow loads). Tiered: compact for old, full for recent N (best of both but complex pruning, inconsistent UX).
- **Consequences:** Users cannot view past analyses at factor-level detail. Comparison limited to category-level. Export only works for current analysis.
- **Related:** DEC-0008, ROAD-0013

### DEC-0006 — Context-sensitive scoring (Want/Need/Hybrid)
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** Product pages serve different purchase contexts. A running shoe page (emotional) should emphasize social proof. An industrial pump page (functional) should emphasize specs. A single model would unfairly penalize context-specific pages.
- **Decision:** Three pre-defined contexts each with 10 factor multipliers. Hybrid uses 1.0x (neutral). Want boosts emotional/social factors (up to 1.5x), reduces technical (down to 0.4x). Need boosts technical/compatibility (up to 2.0x), reduces emotional (down to 0.5x).
- **Rationale:** Three contexts meaningfully differentiate without overwhelming users. Multiplier model is transparent. Hybrid as default provides a safe neutral option.
- **Alternatives Considered:** Single universal scoring (simpler but unfair to context-specific pages). Auto-detect from page content (no user action but unreliable). User-defined custom weights (maximum flexibility but too complex for target users).
- **Consequences:** Three categories is a simplification. User must manually select context. Multipliers are editorial judgments, not empirically validated.
- **Related:** ROAD-0010

### DEC-0005 — og:image WebP as critical failure (0 points)
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** WebP images in `og:image` are invisible in most LLM chat interfaces (ChatGPT, Claude, Perplexity). When AI cites a product, a WebP og:image results in a broken or missing image.
- **Decision:** WebP og:image scores 0 points on the og:image Format factor (15 points) and is flagged "CRITICAL: WebP format — invisible in LLM chats." One of four critical detections.
- **Rationale:** This is a binary failure — image is visible or invisible. Zero points accurately reflects zero visibility. The critical label educates users about an issue they likely didn't know existed.
- **Alternatives Considered:** Treat as warning with partial points (less jarring but understates real impact). Informational only (non-judgmental but fails to drive action).
- **Consequences:** Pages with otherwise strong profiles may get surprisingly low Protocol & Meta scores. Users may initially disagree until the issue is demonstrated.
- **Related:** DEC-0013

### DEC-0004 — Monitor 15 specific AI crawlers in robots.txt
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** AI Discoverability needs to check whether sites allow AI crawlers. No standardized list of AI crawler user-agents exists. The landscape evolves rapidly.
- **Decision:** Curated list of 15: GPTBot, ChatGPT-User, OAI-SearchBot (OpenAI); ClaudeBot, Claude-Web, Anthropic-AI (Anthropic); PerplexityBot; Google-Extended; Applebot-Extended; Meta-ExternalAgent; Bytespider; Cohere-AI; YouBot; AmazonBot; CCBot.
- **Rationale:** Covers all commercially significant AI platforms as of early 2026. Maps user-agent names to company and product for clear reporting.
- **Alternatives Considered:** Top 3 only (simple but misses Perplexity, Apple, Meta, Amazon). All known user-agents (most comprehensive but hundreds of irrelevant agents, noisy scoring).
- **Consequences:** List requires periodic updates. Hardcoded in service-worker.js. Some crawlers may use unannounced user-agent strings.
- **Related:** ROAD-0007

### DEC-0003 — Event delegation for category list
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** Side panel dynamically renders 6 categories with 56 factors, each with expandable recommendations. Individual click handlers would create 50+ event listeners, requiring re-attachment on every re-render.
- **Decision:** Single click handler on `#categoryList` container using event delegation. Handler inspects `event.target` for category header or factor recommendation toggle clicks.
- **Rationale:** Event delegation is the standard pattern for dynamic lists in vanilla JS. Eliminates memory leak concerns from re-rendering. Natural approach given zero-dependency decision.
- **Alternatives Considered:** Individual listeners per element (simple per-element but memory leaks, 50+ listeners, must rebind). UI framework with virtual DOM (handles automatically but conflicts with DEC-0010).
- **Consequences:** Event handler has conditional logic to distinguish click targets. Slightly harder to read than direct handlers.
- **Related:** DEC-0010, ROAD-0003

### DEC-0002 — Validate sender.id on all Chrome messages
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** Chrome extensions communicate via `chrome.runtime.sendMessage`. Without validation, a malicious extension or web page could inject messages.
- **Decision:** Service worker validates `sender.id === chrome.runtime.id` on every message. `EXTRACTION_COMPLETE` handler additionally checks `sender.tab` for content script origin.
- **Rationale:** Minimum effective security boundary. Chrome's extension messaging is designed with this pattern and the check costs nothing.
- **Alternatives Considered:** No validation (simpler but security vulnerability). Message signing with shared secret (strongest but over-engineered for this threat model).
- **Consequences:** None significant — this is a best practice with no real cost.
- **Related:** DEC-0001

### DEC-0001 — URL safety guards (isSafeUrl) to prevent SSRF
- **Date:** 2026-01-15 [estimated from code evidence]
- **Status:** Accepted
- **Context:** Service worker fetches URLs from the analyzed page (og:image, robots.txt, llms.txt). Without validation, a malicious page could direct the extension to fetch file://, localhost, or private network URLs.
- **Decision:** `isSafeUrl()` validates every URL before fetch. Rejects `file:` protocol, `localhost`, `127.0.0.1`, `0.0.0.0`. Only `http:` and `https:` allowed. Used by all four network functions.
- **Rationale:** The `<all_urls>` host permission means the extension can fetch anything. The blocklist prevents the most obvious abuse vectors.
- **Alternatives Considered:** No validation, trust Chrome sandbox (simpler but extension has `<all_urls>` permission). Full RFC 1918 + link-local blocking (most comprehensive but complex, possible false positives).
- **Consequences:** Doesn't block all private network addresses (192.168.x.x, 10.x.x.x). Could theoretically be bypassed by DNS rebinding.
- **Related:** ROAD-0005

---

_Add entries as decisions are made. This document is never "done" — it grows with the product._
