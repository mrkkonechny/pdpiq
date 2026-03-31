# Roadmap

> **PDS Document 08** | Last Updated: 2026-03-29 (Sprint 2 complete: ROAD-0063, ROAD-0065, ROAD-0067 → Done)

Strategic feature plan and working backlog. Combines the "what's planned" view with the "what's in the queue" view. Most recent entries at the top within each section.

## Template

```
### ROAD-[NNNN] — [Short description]
- **Status:** Proposed | Approved | In Progress | Done | Rejected | On Hold
- **Type:** Feature | Improvement | Tech Debt | Refactor | Research
- **Priority:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) | Unranked
- **Target Phase/Sprint:** [When this is planned for, if known]
- **Date Added:** YYYY-MM-DD
- **Date Completed:** YYYY-MM-DD
- **Requested By:** [Person or context]
- **Scope:** Small (< 1 day) | Medium (1-3 days) | Large (3+ days) | Unknown
- **Description:** [What and why — business value, not just technical description]
- **Acceptance Criteria:**
  - [ ] [Specific, testable condition]
  - [ ] [Specific, testable condition]
- **Dependencies:** [Blockers, related items, prerequisite ROAD items]
- **Related:** [DEC-NNNN, BUG-NNNN references]
- **Notes:** [Additional context]
```

---

## In Progress

### ROAD-0075 — Fix scoring accuracy bugs from March 2026 real-world audit
- **Status:** Done
- **Type:** Tech Debt
- **Priority:** P0 (Critical)
- **Target Phase/Sprint:** Sprint 3
- **Date Added:** 2026-03-31
- **Date Completed:** 2026-03-31
- **Requested By:** Internal audit (7-site real-world scoring review)
- **Scope:** Medium (1-3 days)
- **Description:** Six scoring accuracy bugs found during a cross-site audit using real pdpIQ exports. Two are critical (Amazon PLP misclassification inflates AI Readiness; factualSpecificity passes on any page regardless of description quality). Four are medium/high (apparel-NA points > maxPoints; invalid og:image Format status; modal false positive; brand clarity extractor missing og:site_name fallback).
- **Acceptance Criteria:**
  - [ ] Amazon `/dp/` URLs classified as PDP; missing Product schema recommendation fires (BUG-0098)
  - [ ] Apparel-NA factors show `points === maxPoints` in all contexts (BUG-0099)
  - [ ] `factualSpecificity` scores fail when `description.wordCount < 50` (BUG-0100)
  - [ ] `og:image Format` shows `status: 'na'` when no og:image present (BUG-0101)
  - [ ] `materialsText: "modal"` from UI code no longer awards `hasMaterials: true` (BUG-0102)
  - [ ] Apple/Nike-style pages extract brand from `og:site_name` (BUG-0103)
- **Dependencies:** None
- **Related:** BUG-0098, BUG-0099, BUG-0100, BUG-0101, BUG-0102, BUG-0103
- **Notes:** Implementation plan at `docs/superpowers/plans/2026-03-31-scoring-accuracy-fixes.md`

### ROAD-0001 — Add automated test suite (Vitest/Jest)
- **Status:** In Progress
- **Type:** Tech Debt
- **Priority:** P0 (Critical)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-01
- **Requested By:** PDS Process (05-TEST_PLAN)
- **Scope:** Large (3+ days)
- **Description:** Scoring logic is the core IP; regressions directly affect user trust. scoring-engine.js and weights.js are pure functions testable without Chrome API mocking. No test framework currently exists — all testing is manual.
- **Acceptance Criteria:**
  - [ ] Vitest or Jest configured with jsdom
  - [ ] scoring-engine.js has unit tests for all 6 `score*()` methods
  - [ ] weights.js validation tests (sums to 1.0, factor weights sum to 100)
  - [ ] recommendation-engine.js has unit tests for all `check*Issues()` methods
  - [ ] CI or pre-commit hook runs tests automatically
- **Dependencies:** None — pure functions, no Chrome mocking needed
- **Related:** DEC-0010
- **Notes:** Start with scoring-engine.js and weights.js. Recommended: Vitest for speed and ES module support.

## Approved (Queued)

### ROAD-0036 — Elevate HTML report (executive summary, Tribbute CTA)
- **Status:** Done
- **Type:** Improvement
- **Priority:** P0 (Critical)
- **Target Phase/Sprint:** v2.3.0 — Consulting Practice
- **Date Added:** 2026-03-18
- **Date Completed:** 2026-03-20
- **Requested By:** Product strategy (consulting practice tool)
- **Scope:** Medium (1-3 days)
- **Description:** The HTML report is the primary consulting deliverable and sales hook. Currently jumps straight into scores. Needs a "3 things to fix first" executive summary that a CMO can read in 30 seconds, and a Tribbute CTA ("Schedule a consultation" or "Get a full content audit") to convert report recipients into consulting leads.
- **Acceptance Criteria:**
  - [ ] Executive summary section at top of report with top 3 priority issues across all scores
  - [ ] Tribbute CTA section with configurable link/text
  - [ ] Visual polish pass (spacing, hierarchy, scanability)
- **Dependencies:** None
- **Related:** —

### ROAD-0034 — Page type auto-detection and display (PDP vs PLP — Phase 1)
- **Status:** Done
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** v2.3.0 — Consulting Practice
- **Date Added:** 2026-03-18
- **Date Completed:** 2026-03-20
- **Requested By:** Product strategy (client engagement need)
- **Scope:** Medium (1-3 days)
- **Description:** Auto-detect whether the analyzed page is a PDP or PLP/collection page using schema type, URL patterns, DOM structure, and og:type signals. Display page type badge in side panel header and HTML report header. Auto-mark clearly inapplicable factors as "N/A — Collection Page" using the proven apparel detection pattern. Enables clients to see pdpIQ is collection-page aware.
- **Acceptance Criteria:**
  - [ ] `detectPageType()` returns `{ type: 'pdp'|'plp'|'unknown', confidence, signals }`
  - [ ] Page type badge visible in side panel header
  - [ ] Page type badge visible in HTML report header
  - [ ] Inapplicable factors auto-marked "N/A — Collection Page" on PLP pages
  - [ ] Note on collection pages: "Some factors are optimized for product pages"
- **Dependencies:** None
- **Related:** DEC-0025, ROAD-0038

### ROAD-0035 — Citation Opportunity Map (AI Visibility tab + report)
- **Status:** Done
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** v2.3.0 — Consulting Practice
- **Date Added:** 2026-03-18
- **Date Completed:** 2026-03-20
- **Requested By:** Product strategy (consulting deliverable differentiator)
- **Scope:** Medium (1-3 days)
- **Description:** Rule-based engine mapping failing AI Readiness factors to specific conversational query patterns the page cannot answer. Personalized with extracted product name, brand, and category. Displayed as a collapsible "Citation Opportunities" section in the AI Visibility tab only and the AI Readiness section of the HTML report only. Groups: high-value queries missing → partially covered → well-positioned. Creates a powerful consulting sales moment.
- **Acceptance Criteria:**
  - [ ] New `citation-opportunities.js` with 30-40 query templates mapped from AI Readiness factor IDs
  - [ ] "Citation Opportunities" collapsible section in AI Visibility tab
  - [ ] "Citation Opportunities" section in AI Readiness report section
  - [ ] Query templates personalized with product name, brand, category
  - [ ] Priority grouping (missing / partial / covered)
  - [ ] Does NOT appear in PDP Quality or SEO Quality tabs/report sections
- **Dependencies:** None
- **Related:** DEC-0026

### ROAD-0037 — Bulk triage mode (internal ops tooling)
- **Status:** Approved
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-18
- **Requested By:** Product strategy (ops team efficiency)
- **Scope:** Medium (1-3 days)
- **Description:** Internal tooling for ops team to quickly assess multiple client pages. Paste URLs into a textarea, sequentially analyze each via tabs API, produce summary table (URL, AI grade, PDP grade, SEO grade, top 3 issues). Export as CSV. Makes the ops team 5x faster on client assessments.
- **Acceptance Criteria:**
  - [ ] URL paste textarea in side panel (accessible from History tab or new mode)
  - [ ] Sequential analysis with progress indicator
  - [ ] Summary table with triple grades per URL
  - [ ] Top 3 issues per URL in summary
  - [ ] CSV export of batch results
- **Dependencies:** None
- **Related:** ROAD-0008

### ROAD-0007 — Quarterly AI crawler list review
- **Status:** Approved
- **Type:** Improvement
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-01
- **Requested By:** PDS Process (07-DECISION_LOG DEC-0004)
- **Scope:** Small (< 1 day)
- **Description:** AI crawler landscape evolves rapidly. Grok (xAI), Mistral, Deepseek may need addition to `AI_CRAWLERS` and `MAJOR_AI_CRAWLERS` in service-worker.js. Current list has 15 crawlers.
- **Acceptance Criteria:**
  - [ ] Review published AI crawler user-agents against current list
  - [ ] Add any new commercially significant crawlers
  - [ ] Remove or update any deprecated/renamed crawlers
- **Dependencies:** None
- **Related:** DEC-0004

### ROAD-0005 — Expand isSafeUrl to block RFC 1918 ranges
- **Status:** Done
- **Type:** Improvement
- **Priority:** P1 (High)
- **Target Phase/Sprint:** v1.2.0 — Foundation Hardening
- **Date Added:** 2026-03-01
- **Date Completed:** 2026-03-20
- **Requested By:** PDS Process (security review)
- **Scope:** Small (< 1 day)
- **Description:** `isSafeUrl()` blocks localhost/127.0.0.1/0.0.0.0 but not 192.168.x.x, 10.x.x.x, or 172.16-31.x.x. These private ranges are theoretically fetchable via the `<all_urls>` permission.
- **Acceptance Criteria:**
  - [x] `isSafeUrl()` rejects all RFC 1918 private ranges
  - [x] `isSafeUrl()` rejects link-local addresses (169.254.x.x)
  - [ ] Existing tests still pass (deferred — no test suite yet, ROAD-0001)
- **Dependencies:** ROAD-0001 (test suite should be in place first)
- **Related:** DEC-0001, BUG-0079

### ROAD-0002 — Centralize DEBUG flag
- **Status:** Approved
- **Type:** Tech Debt
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-01
- **Requested By:** PDS Process (tech debt review)
- **Scope:** Small (< 1 day)
- **Description:** Replace per-file `const DEBUG = false;` with a shared config module. Currently must edit 6+ files to enable/disable debug logging.
- **Acceptance Criteria:**
  - [ ] Single DEBUG flag in a shared config module
  - [ ] All files import from shared config
  - [ ] Debug logging still gated behind the flag
- **Dependencies:** None
- **Related:** —

### ROAD-0003 — Event delegation for history list
- **Status:** Approved
- **Type:** Tech Debt
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-01
- **Requested By:** PDS Process (tech debt review)
- **Scope:** Small (< 1 day)
- **Description:** Category list already uses event delegation (DEC-0003). History list still attaches individual listeners per item, creating minor memory leaks on heavy re-rendering.
- **Acceptance Criteria:**
  - [ ] History list uses single delegated click handler
  - [ ] No per-item listeners created during render
  - [ ] History interaction (view, compare, delete) still works
- **Dependencies:** None
- **Related:** DEC-0003

### ROAD-0004 — "Show all recommendations" toggle in side panel
- **Status:** Approved
- **Type:** Improvement
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-01
- **Requested By:** PDS Process (UX review)
- **Scope:** Small (< 1 day)
- **Description:** Side panel currently caps recommendations at 10. Users with 15+ issues see a truncated list and must export the HTML report to see all. A simple toggle would show the full list inline.
- **Acceptance Criteria:**
  - [ ] "Show all" toggle visible when recommendations > 10
  - [ ] Toggle expands to show full recommendation list
  - [ ] Default still shows top 10 for a clean initial view
- **Dependencies:** None
- **Related:** —

### ROAD-0006 — Add apparel detection manual override
- **Status:** Approved
- **Type:** Improvement
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-01
- **Requested By:** PDS Process (DEC-0015 revisit condition)
- **Scope:** Small (< 1 day)
- **Description:** Apparel auto-detection is heuristic (DEC-0015). False positives ("jacket" for laptop case) and false negatives (non-standard categories) cannot be corrected by users. A toggle in the UI would let users override the detection.
- **Acceptance Criteria:**
  - [ ] Toggle in side panel to override apparel detection
  - [ ] Override persists for the current analysis
  - [ ] Re-scores with corrected apparel status
- **Dependencies:** None
- **Related:** DEC-0015

## Proposed (Needs Review)

### ROAD-0074 — Vertical benchmarks in side panel ("Your score vs. category average")
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-26
- **Requested By:** Strategic review (public launch + data flywheel)
- **Scope:** Medium (1-3 days)
- **Description:** Once opt-in telemetry data reaches a statistically meaningful sample (target: 500+ analyses per vertical), surface a comparison card in the side panel: "Fashion avg: 71 / Your score: 58." Contextualizes a user's score without requiring a competitor URL. High client-facing value — clients immediately understand whether they are above or below their market. Requires detecting the eCommerce vertical from existing schema/breadcrumb/URL data.
- **Acceptance Criteria:**
  - [ ] Vertical detection heuristic identifies at least 5 categories (Fashion, Electronics, Home, Health, Food)
  - [ ] Benchmark card appears in side panel when sample size is sufficient for the detected vertical
  - [ ] Shows AI Readiness, PDP Quality, and SEO Quality averages for the vertical
  - [ ] Card is hidden or shows "Insufficient data" when sample < threshold
  - [ ] Benchmark data fetched from the telemetry backend (not hard-coded)
- **Dependencies:** ROAD-0073 (needs data flowing first); ROAD-0039 (vertical detection); ROAD-0070 (telemetry infrastructure)
- **Related:** DEC-0039, ROAD-0070

### ROAD-0073 — Internal benchmark dashboard (aggregate data consumer)
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-26
- **Requested By:** Strategic review (public launch + data flywheel)
- **Scope:** Medium (1-3 days)
- **Description:** Internal Tribbute dashboard querying the telemetry backend. Views: score distributions by detected platform (Shopify/WooCommerce/etc.), factor pass rates by vertical, JS dependency levels across domains, top/bottom performing domains. Enables "State of eCommerce AI Readiness" market reports as a Tribbute content asset and informs empirical feature prioritization. Retool, Metabase, or a custom simple read-only frontend are all suitable.
- **Acceptance Criteria:**
  - [ ] Dashboard reads from the telemetry backend (read-only access, separate credentials from write path)
  - [ ] Score distribution chart filterable by vertical and platform
  - [ ] Factor pass rate table showing % pass/fail/warning per factor across all analyzed domains
  - [ ] Refresh cadence: at-rest data (daily batch or live query)
  - [ ] Access restricted to Tribbute team
- **Dependencies:** ROAD-0070 (telemetry infrastructure must be live and collecting data first)
- **Related:** DEC-0039, ROAD-0074

### ROAD-0072 — Chrome Web Store listing (gated beta)
- **Status:** Proposed
- **Type:** Launch
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-26
- **Requested By:** Strategic review (public launch)
- **Scope:** Medium (1-3 days)
- **Description:** Publish pdpIQ to the Chrome Web Store as an unlisted listing initially (invite-only distribution via direct link). Store listing copy targets consultant and agency audiences. Privacy angle ("all processing local — zero data transmission by default") is a key differentiator vs. general SEO tools. Screenshots: side panel with triple scores and grades, citation opportunity map, HTML report preview.
- **Acceptance Criteria:**
  - [ ] CWS developer account configured for Tribbute
  - [ ] Extension packaged with correct manifest version, icons, and description
  - [ ] Unlisted listing published and accessible via direct link
  - [ ] Privacy policy URL present in CWS listing (links to ROAD-0071 page)
  - [ ] Onboarding flow (first-run experience) explains context selector and opt-in toggle
  - [ ] CWS review passed (typically 1–3 business days)
- **Dependencies:** ROAD-0070 (telemetry infrastructure), ROAD-0071 (privacy policy)
- **Related:** DEC-0039, DEC-0040

### ROAD-0071 — Privacy policy and data disclosure page (tribbute.com)
- **Status:** Proposed
- **Type:** Marketing / Legal
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-26
- **Requested By:** Strategic review (public launch prerequisite)
- **Scope:** Small (< 1 day)
- **Description:** Short privacy policy page hosted on tribbute.com covering pdpIQ specifically. Contents: (1) what is never transmitted — page content, product text, review text, prices, URLs with query strings; (2) what is transmitted when opt-in is enabled — domain, page path, scores, boolean factor results, JS dependency level, extension version; (3) how to opt out; (4) contact email. Required by Chrome Web Store policy. Referenced from the extension settings UI.
- **Acceptance Criteria:**
  - [ ] Page live at tribbute.com/legal/pdpiq-privacy (or similar)
  - [ ] Covers all fields in the telemetry payload allowlist
  - [ ] Clear "opt-in only" framing — default state explicitly described
  - [ ] Contact email present
  - [ ] URL provided to CWS listing and referenced in extension settings UI
- **Dependencies:** ROAD-0070 (telemetry payload must be finalized before writing the policy)
- **Related:** DEC-0039, ROAD-0072

### ROAD-0070 — Opt-in aggregate telemetry infrastructure
- **Status:** Proposed
- **Type:** Infrastructure + Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-26
- **Requested By:** Strategic review (public launch + benchmark data)
- **Scope:** Large (3+ days)
- **Description:** End-to-end opt-in telemetry system. Client side: settings toggle in side panel ("Share anonymous analysis data to help improve pdpIQ benchmarks") stored in chrome.storage.local as `{ telemetryOptIn: false }` (default off). When enabled, service worker fires `sendTelemetry()` post-analysis — non-blocking, failures silently ignored. Payload is allowlist-filtered: domain, pathname, pageType, scores (numbers only), grade letters, boolean factor results, JS dependency level, context, extension version, UTC date (no time). No text content fields. Server side: HTTPS endpoint (Cloudflare Worker + D1, or Supabase) receives POST, validates against allowlist schema (rejects unrecognized or text-type fields), writes to append-only table. No additional Chrome manifest permissions needed — fetch() in service worker already permitted under `<all_urls>`.
- **Acceptance Criteria:**
  - [ ] Settings UI toggle visible and persistent (survives extension reload)
  - [ ] Default state: opt-in = false (no transmission without explicit consent)
  - [ ] When opt-in = true, POST fires after each analysis completion
  - [ ] Payload contains no text content fields (strict allowlist enforced client-side)
  - [ ] Server-side schema validation rejects any payload with unrecognized or text-type fields
  - [ ] Server writes to append-only table (no update/delete paths)
  - [ ] POST failure (network error, server error) is silently ignored — does not affect analysis flow
  - [ ] Privacy policy URL linked from settings toggle UI
- **Dependencies:** DEC-0039 (decision confirmed); ROAD-0071 (privacy policy URL needed for settings UI link)
- **Related:** DEC-0039, ROAD-0071, ROAD-0072, ROAD-0073

### ROAD-0069 — JS-gated content detection for high-risk factors
- **Status:** Proposed
- **Type:** Research + Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-26
- **Requested By:** Strategic review (crawler visibility gap — ROAD-0045 partial implementation)
- **Scope:** Medium (1-3 days)
- **Description:** For the factors most at risk of scoring JS-rendered content as visible to LLM crawlers (returns, shipping, reviews, accordion-locked specs), add a detection heuristic: does the element containing the matched content live inside a JS framework root (`#root`, `#__next`, `[data-v-app]`, `#___gatsby`, `[ng-version]`)? If yes, downgrade the factor from 'pass' to 'warning' with details: "Content may be JavaScript-rendered and not visible to LLM crawlers." This is a scoped partial implementation of the ROAD-0045 confidence layer vision, targeting the highest-risk factors first.
- **Acceptance Criteria:**
  - [ ] JS-root ancestor check added to extractTrustConfidence() for `hasReturnPolicy` and `hasShippingInfo`
  - [ ] Same check added to review extraction when review count > 0 but elements are inside JS roots
  - [ ] Factor status set to 'warning' (not 'fail') when content is present but JS-gated
  - [ ] Warning details text distinguishes "JS-gated" from other warning causes
  - [ ] No change to scoring for sites with low JS dependency (low/none)
- **Dependencies:** ROAD-0068 (substantive content thresholds fix should land first); ROAD-0001 (test suite helps validate changes)
- **Related:** ROAD-0045, DEC-0037, BUG-0085, BUG-0086

### ROAD-0068 — Fix BUG-0085 and BUG-0086: substantive content thresholds
- **Status:** Done
- **Type:** Bug Fix
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-26
- **Date Completed:** 2026-03-26
- **Requested By:** Strategic review (client trust / accuracy)
- **Scope:** Small (< 1 day)
- **Description:** Fix two active extraction bugs that inflate scores on accordion-heavy and SPA pages. BUG-0086: `hasReturnPolicy` and `hasShippingInfo` match accordion heading labels ("Shipping & Returns") that contain no actual policy content. BUG-0085: `hasMaterials` matches sensory fragments ("is so soft") that contain no material noun. Fix: require ≥ 20-character match for policy/shipping outside heading elements (`<h2>`, `<h3>`, `<button>`, `<summary>`); require at least one fabric/material noun alongside sensory keywords for materials.
- **Acceptance Criteria:**
  - [ ] "Shipping & Returns" as a lone accordion heading label scores `hasShippingInfo: false`
  - [ ] "Free shipping on orders over $75" in body text scores `hasShippingInfo: true`
  - [ ] "is so soft" fragment scores `hasMaterials: false`
  - [ ] "Made from 100% organic cotton" scores `hasMaterials: true`
  - [ ] Existing tests (once ROAD-0001 exists) cover positive and negative cases
- **Dependencies:** DEC-0038
- **Related:** BUG-0085, BUG-0086, ROAD-0045, ROAD-0069

### ROAD-0067 — Schema-backed factor confidence badges
- **Status:** Done
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Sprint 2
- **Date Added:** 2026-03-26
- **Date Completed:** 2026-03-29
- **Requested By:** Strategic review (client trust / crawler visibility gap)
- **Scope:** Medium (1-3 days)
- **Description:** Add a data-source confidence badge to each factor row in the side panel and HTML report. Badge values: "Schema" (sourced from JSON-LD/microdata — LLM crawlers always parse this), "DOM" (sourced from rendered DOM — may be JS-injected and invisible to crawlers), "Inferred" (heuristic detection). Most extractors already return a `source` field ('dom', 'schema', 'product-nested', 'microdata'). The badge directly addresses the client trust gap: "why does pdpIQ score a factor I can't see on the raw page?" The answer becomes visible — if it says "Schema," it's because the information exists in structured data the crawler can read even without JS execution.
- **Acceptance Criteria:**
  - [ ] Each factor row in the side panel shows a source badge (Schema / DOM / Inferred)
  - [ ] HTML report factor table includes a source column
  - [ ] Existing `source` field on extractor return values is used (no new extraction work)
  - [ ] Mixed-source factors (DOM first, schema fallback) display the actual source used for that analysis
  - [ ] Badge has tooltip or legend explaining what each value means
- **Dependencies:** DEC-0037; ROAD-0001 (test suite helps validate changes to extractor source fields)
- **Related:** DEC-0037, ROAD-0045, ROAD-0069

### ROAD-0066 — HTML data table factor (AI Readiness — Content Quality)
- **Status:** Done
- **Type:** Scoring Change
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-26
- **Date Completed:** 2026-03-26
- **Requested By:** Strategic review (competitive positioning — research-driven scoring)
- **Scope:** Small (< 1 day)
- **Description:** Add `hasDataTable` as a scored Content Quality factor. Qualify as data table: `<table>` with > 2 rows AND > 1 column in the product content area (excludes layout tables). Weight: ~8 pts. Recommendation: "Present specifications in an HTML table — research shows 2.5–6.76× higher AI citation rate vs. prose (Table Meets LLM, WSDM '24; HtmlRAG, WWW '25)."
- **Acceptance Criteria:**
  - [ ] `hasDataTable` extracted from product content area (not nav/header/footer tables)
  - [ ] Scored as separate factor from existing `tables` semantic HTML signal
  - [ ] Pass: ≥ 1 qualifying data table; Fail: none found
  - [ ] Recommendation template added with WSDM '24 / WWW '25 citations
  - [ ] No double-counting with existing table-structure factor
- **Dependencies:** DEC-0036
- **Related:** DEC-0036, DEC-0031

### ROAD-0065 — Statistics/numerical claims factor (AI Readiness — Content Quality)
- **Status:** Done
- **Type:** Scoring Change
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Sprint 2
- **Date Added:** 2026-03-26
- **Date Completed:** 2026-03-29
- **Requested By:** Strategic review (competitive positioning — research-driven scoring)
- **Scope:** Small (< 1 day)
- **Description:** Add `hasStatistics` extraction and scoring in Content Quality. Detect numerical claims with units or percentages in product description and features text. Pattern: number adjacent to %, lbs, kg, oz, mm, cm, in, ft, W, V, A, RPM, Hz, and similar measurable units. Score: pass if ≥ 2 statistical claims, warning if 1, fail if 0. Weight: ~10 pts. Recommendation references +22–40% citation boost (GEO paper, SIGKDD '24; Perplexity study; AirOps 548K page analysis — three independent sources). First audit whether this overlaps with existing `factualSpecificity` factor before implementation.
- **Acceptance Criteria:**
  - [ ] Extraction regex correctly identifies numerical claims with units (not bare numbers)
  - [ ] Scored factor appears in Content Quality category
  - [ ] Pass/warning/fail thresholds (2+/1/0 claims) apply
  - [ ] Recommendation copy cites at least one primary research source
  - [ ] No duplicate scoring with `factualSpecificity` if they measure the same signal
- **Dependencies:** DEC-0034; audit of `factualSpecificity` overlap
- **Related:** DEC-0034, DEC-0031

### ROAD-0064 — Content freshness factor (dateModified scoring — AI Discoverability)
- **Status:** Done
- **Type:** Scoring Change
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-26
- **Date Completed:** 2026-03-26
- **Requested By:** Strategic review (competitive positioning — research-driven scoring)
- **Scope:** Small (< 1 day)
- **Description:** Promote `dateModified` from a display-only signal to a scored AI Discoverability factor. Extraction already exists (JSON-LD/microdata schema date signals). Scoring: pass if < 30 days, warning if 30–180 days, fail if > 180 days or absent. Schema source preferred over visible DOM date. Weight: ~10 pts. Recommendation: "Update product content and set schema dateModified — 76.4% of Perplexity citations are pages updated within 30 days (SE Ranking, 129K domain study)."
- **Acceptance Criteria:**
  - [ ] `dateModified` factor appears in AI Discoverability category with correct thresholds
  - [ ] Schema date (JSON-LD/microdata) takes precedence over visible DOM date
  - [ ] Pass/warning/fail status and details correctly reflect days-since-modified
  - [ ] Recommendation template added with SE Ranking study citation
  - [ ] No double-scoring with existing `lastModified` HTTP header factor in Protocol & Meta
- **Dependencies:** DEC-0033
- **Related:** DEC-0033, DEC-0031

### ROAD-0063 — AI Platform context selector (ChatGPT / Perplexity / Google AIO)
- **Status:** Done
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Sprint 2
- **Date Added:** 2026-03-26
- **Date Completed:** 2026-03-29
- **Requested By:** Strategic review (competitive positioning — platform divergence)
- **Scope:** Medium (1-3 days)
- **Description:** Add "AI Platform" as a second context dimension alongside Want/Need/Hybrid. Options: ChatGPT, Perplexity, Google AIO, Unified (current default). Extends the existing multiplier architecture — no scoring engine rewrite required. Platform multiplier profiles based on research: ChatGPT profile upweights authority signals, entity consistency, structured data; Perplexity profile upweights content freshness, FAQ format, statistics; Google AIO profile upweights E-E-A-T signals, structured data, heading hierarchy. Unified keeps current weights (backward-compatible default). History entries record both buyer context and platform context. Report and side panel display active platform context.
- **Acceptance Criteria:**
  - [ ] Platform context selector added to UI (alongside or combined with Want/Need/Hybrid)
  - [ ] Three platform multiplier profiles defined in weights.js
  - [ ] Scoring engine applies platform multipliers on top of (or combined with) buyer context multipliers
  - [ ] "Unified" default produces identical results to current scoring (backward compatible)
  - [ ] History entries record platform context
  - [ ] Side panel displays active platform context in results header
  - [ ] HTML report shows active platform context
- **Dependencies:** DEC-0032
- **Related:** DEC-0032, ROAD-0061, ROAD-0064, ROAD-0065

### ROAD-0061 — Platform-Specific AI Readiness Profiles
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** v4.0
- **Date Added:** 2026-03-23
- **Requested By:** DEC-0030 (v3.0.0 scoring accuracy overhaul)
- **Scope:** Large (3+ days)
- **Description:** Add separate optimization profiles and scores for ChatGPT Search (Bing-dependent), Perplexity (recency + Reddit context), and Google AI Overviews (E-E-A-T, YouTube, structured data). Currently blocked by insufficient per-platform signal research. Ahrefs citation study shows only 11% domain overlap between ChatGPT and Perplexity — a single unified AI Readiness score obscures these divergent platform requirements. (DEC-0030)
- **Acceptance Criteria:**
  - [ ] Per-platform signal research documented (ChatGPT, Perplexity, Google AIO, at minimum)
  - [ ] Platform profile selector added to analysis flow
  - [ ] Scoring engine calculates platform-weighted scores separately
  - [ ] UI and report updated to show platform-specific results
  - [ ] Migration path defined for existing history entries (single score → multi-profile)
- **Dependencies:** Per-platform signal research must be completed before implementation
- **Related:** DEC-0030

### ROAD-0062 — ChatGPT Shopping Feed Integration Advisory
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** v3.x
- **Date Added:** 2026-03-23
- **Requested By:** DEC-0030 (v3.0.0 scoring accuracy overhaul)
- **Scope:** Medium (1-3 days)
- **Description:** ChatGPT Shopping uses structured merchant feeds (CSV/TSV/XML/JSON), not crawled schema, as source of truth for pricing and availability. Add detection for shopping feed signals and recommendation for OpenAI merchant program enrollment. Complements existing schema-based scoring by surfacing the feed pathway that ChatGPT Shopping actually relies on.
- **Acceptance Criteria:**
  - [ ] Detection logic identifies presence or absence of shopping feed signals on the analyzed page
  - [ ] Recommendation template added for merchant feed enrollment (links to OpenAI merchant program docs)
  - [ ] Factor or informational note appears in AI Visibility tab and HTML report
  - [ ] No scoring impact on pages where feed signals are absent (advisory only, not penalised)
- **Dependencies:** ROAD-0061 (platform-specific profiles provide the framing context)
- **Related:** DEC-0030

### ROAD-0060 — Informational PageSpeed link in SEO report section
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P3 (Low)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Small (< 1 day)
- **Description:** Add a non-scored informational note to the SEO Quality section of the side panel and HTML report with a direct link to `pagespeed.web.dev/?url={encodedUrl}` pre-filled for the analyzed page. Reads raw TTFB and page load timing from `performance.getEntriesByType('navigation')` and displays them as context-only figures (not scored). Includes a clear disclaimer: "Measured in this Chrome session — use PageSpeed Insights for standardized field data." Avoids misleading clients with in-browser numbers that diverge from Google's simulated benchmarks, while still giving a quick pointer to the right tool.
- **Acceptance Criteria:**
  - [ ] PageSpeed Insights link appears in SEO tab (side panel) and SEO section of HTML report
  - [ ] Link pre-fills the analyzed URL (`pagespeed.web.dev/?url=...`)
  - [ ] Raw TTFB and load time shown as informational figures (no pass/fail status)
  - [ ] Disclaimer text present: measurements are Chrome-session only
  - [ ] SEO score and factor weights unchanged (no new scoring factors added)
- **Dependencies:** None
- **Related:** DEC-0009 (zero-transmission — no API call to PageSpeed Insights)

### ROAD-0059 — Vertical category benchmarks ("Your score vs. industry average")
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Medium (1-3 days)
- **Description:** Show industry average scores by vertical (Fashion, Electronics, Health & Beauty, Home, Food) alongside the user's score on the report hero and side panel. "You: 58 / Fashion average: 71." Transforms scores from absolute to relative, dramatically increasing client urgency. Phase 1: hardcode benchmarks from Tribbute's internal scoring dataset (10+ PDPs per vertical), updated quarterly.
- **Acceptance Criteria:**
  - [ ] Benchmark dataset defined per vertical (at minimum: fashion, electronics, general)
  - [ ] Benchmark scores displayed on score hero in side panel and report
  - [ ] "Below average / Above average / Average" label shown per model
  - [ ] Benchmark source/date shown in report footnote
- **Dependencies:** ROAD-0039 (vertical detection — needed to know which benchmark to show)
- **Related:** ROAD-0039

### ROAD-0058 — Factor status change digest (re-analysis diff)
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P3 (Low)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Small (< 1 day)
- **Description:** When re-analyzing a URL that already exists in history, produce a brief "what changed" summary: "3 factors improved (Product Schema, og:image, FAQ), 1 new warning (entity consistency), score up +7 points." Useful for client update emails and engagement progress notes. Lighter version of ROAD-0049.
- **Acceptance Criteria:**
  - [ ] Re-analysis detected when URL matches existing history entry
  - [ ] Changed factors listed (improved, regressed, new warnings)
  - [ ] Net score delta shown
  - [ ] Digest visible in side panel before/after re-analysis and includable in report
- **Dependencies:** Category-level scores only (lighter than ROAD-0013)
- **Related:** ROAD-0049, ROAD-0013

### ROAD-0057 — Developer handoff export (Markdown checklist)
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P3 (Low)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Small (< 1 day)
- **Description:** A stripped-down export containing only failing/warning factors with their remediation guidance, formatted as a Markdown developer checklist. Not the full HTML report — just the action items. Designed for direct handoff to a client's engineering team without sending the full consulting report.
- **Acceptance Criteria:**
  - [ ] "Download Dev Checklist" action on each score tab
  - [ ] Output is a .md file with one checkbox per failing/warning factor
  - [ ] Each checkbox includes: factor name, status, specific remediation text
  - [ ] Platform-specific notes included if available (see ROAD-0048)
- **Dependencies:** None (ROAD-0048 enhances it but is not required)
- **Related:** ROAD-0048

### ROAD-0056 — Multi-context score comparison (Want vs. Need vs. Hybrid)
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P3 (Low)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Medium (1-3 days)
- **Description:** Run the same URL in all 3 contexts (Want, Need, Hybrid) and show a 3-column comparison. Highlights which factors are context-sensitive and by how much. Useful for clients with mixed buyer personas (e.g., fashion items bought as gifts vs. personal use). Surfaces which content investments swing the most across contexts.
- **Acceptance Criteria:**
  - [ ] "Run all contexts" button triggers 3 sequential analyses
  - [ ] 3-column comparison view in side panel
  - [ ] Factors with high context variance flagged
  - [ ] Exportable as report section
- **Dependencies:** None
- **Related:** DEC-0006

### ROAD-0055 — Client session labels on history entries
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P3 (Low)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Small (< 1 day)
- **Description:** Allow attaching a label to a history entry: client name, engagement stage, and free-text notes. Turns history from a domain-name list into a lightweight engagement log. Tribbute works across multiple client accounts — current history has no client context.
- **Acceptance Criteria:**
  - [ ] Edit label button on each history entry
  - [ ] Fields: client name, engagement stage (dropdown), notes (free text)
  - [ ] Label visible on history list row
  - [ ] Labels included in history CSV export (ROAD-0054)
- **Dependencies:** None (ROAD-0054 for CSV export integration)
- **Related:** ROAD-0054

### ROAD-0054 — History export (CSV)
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P3 (Low)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Small (< 1 day)
- **Description:** Export the full analysis history as a CSV with columns: date, URL, domain, context, AI grade, AI score, PDP grade, PDP score, SEO grade, SEO score. Enables ops tracking across client engagements and simple spreadsheet reporting for account management. `exportHistory()` already exists in storage-manager.js — primarily a UI wiring task.
- **Acceptance Criteria:**
  - [ ] "Export history as CSV" button in History tab
  - [ ] CSV includes all stored entries (not just visible 20)
  - [ ] Columns: date, URL, domain, context, AI grade/score, PDP grade/score, SEO grade/score
  - [ ] Client labels included if ROAD-0055 is implemented
- **Dependencies:** None (`exportHistory()` in storage-manager.js already exists)
- **Related:** ROAD-0055

### ROAD-0053 — AI crawler allowlist visual summary card
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Small (< 1 day)
- **Description:** Present crawler access data (which already powers the AI Discoverability score) as a standalone visual card in the AI Visibility tab and HTML report. Shows all 11 monitored AI crawlers with status badges (Allowed / Blocked / Unknown), grouped by company (OpenAI, Anthropic, Google, etc.), plus a headline count: "7 of 11 AI crawlers can access your page." Extremely readable in client presentations and slide decks without technical explanation.
- **Acceptance Criteria:**
  - [ ] Visual card in AI Visibility tab (collapsible)
  - [ ] Visual card in HTML report (AI Readiness section)
  - [ ] Crawlers grouped by company with named badges
  - [ ] Allowed/Blocked/Unknown status per crawler
  - [ ] Headline "X of Y crawlers have access" stat
- **Dependencies:** None (data already extracted by service-worker.js)
- **Related:** DEC-0004, ROAD-0007

### ROAD-0052 — Inline report annotation mode
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Medium (1-3 days)
- **Description:** Before exporting the HTML report, allow the user to add notes to specific factors. Examples: "Discussed with client — custom solution in place" or "Confirmed fix in next sprint." Currently, consultants export and then manually edit the HTML. Annotation mode makes this native to the side panel and bakes notes into the exported report.
- **Acceptance Criteria:**
  - [ ] Annotation icon/button on each factor row in side panel
  - [ ] Free-text note field per factor
  - [ ] Annotated factors visually flagged in side panel
  - [ ] Notes included in HTML report export alongside the factor
  - [ ] Notes persisted with history entry
- **Dependencies:** None
- **Related:** —

### ROAD-0051 — Simplified executive 1-pager report variant
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Medium (1-3 days)
- **Description:** A second, shorter report format: 1 page with 3 grade badges, top 3 issues in plain English, 3 recommended next steps, and Tribbute CTA. Designed for email to CMO/VP stakeholders or as a meeting leave-behind in a slide deck. The current report is detailed and comprehensive (ideal for ops/dev teams) but too long for executive stakeholders. Separate from ROAD-0036 (which elevated the existing report's executive summary).
- **Acceptance Criteria:**
  - [ ] "Download 1-Pager" action alongside existing "Download Report"
  - [ ] Fits on a single printed page (A4/Letter)
  - [ ] Includes: 3 grade badges, top 3 cross-model issues, 3 next steps, Tribbute CTA
  - [ ] Plain-English descriptions (no jargon, no factor IDs)
  - [ ] Tribbute branding and UTM links
- **Dependencies:** None
- **Related:** ROAD-0036

### ROAD-0050 — SEO → AI Readiness gap highlight card
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Small (< 1 day)
- **Description:** A dedicated callout (side panel + report) surfacing the delta between SEO score and AI Readiness score. Example: "You're a B (82) on SEO but an F (48) on AI Readiness — this gap represents your biggest emerging risk as LLM-driven discovery grows." Many clients have invested heavily in SEO and don't know they have an AI readiness problem. This creates urgency from data they already trust (their SEO score). Only pdpIQ can show this gap — no competitor measures both dimensions.
- **Acceptance Criteria:**
  - [ ] Gap card shown when SEO and AI Readiness grades differ by 2+ letter grades
  - [ ] Card visible in AI Visibility tab and HTML report executive summary
  - [ ] Plain-English framing of the risk (not just numbers)
  - [ ] Link/CTA to consult Tribbute on AI readiness strategy
- **Dependencies:** None (both scores already calculated)
- **Related:** DEC-0024

### ROAD-0049 — Score improvement validator (Before/After diff)
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Medium (1-3 days)
- **Description:** When re-analyzing a URL that exists in history, automatically compare to the most recent prior analysis. Show score deltas per category and overall, plus which factors changed status. Provides empirical proof that Tribbute's recommendations improved the page and enables "Month 1 vs. Month 3" client update reports. Full factor-level diff requires ROAD-0013; a lighter version scoped to category scores + grade changes can ship earlier.
- **Acceptance Criteria:**
  - [ ] Re-analysis auto-detected when URL matches existing history entry
  - [ ] Score delta shown per model (e.g., "AI Readiness: +11 points")
  - [ ] Category-level score changes shown
  - [ ] "Before/After" section in HTML report
  - [ ] (Full version) Factor-level status changes listed (requires ROAD-0013)
- **Dependencies:** Category-level diff can ship independently; factor-level diff depends on ROAD-0013
- **Related:** ROAD-0013, ROAD-0058

### ROAD-0048 — Platform-specific remediation notes
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Medium (1-3 days)
- **Description:** Auto-detect the eCommerce platform (Shopify, WooCommerce, Magento, BigCommerce, Salesforce Commerce Cloud) from DOM signals and URL patterns. Append platform-specific "how to fix" guidance to each failing recommendation. Example: instead of generic "Add Product schema," show "In Shopify: ensure your theme calls {{ product.json_ld }} or install a schema app. Check Settings > Metafields." Eliminates the consulting-to-dev translation work after every audit.
- **Acceptance Criteria:**
  - [ ] `detectPlatform()` function identifies Shopify, WooCommerce, Magento, BigCommerce, SFCC, and General
  - [ ] Platform shown as badge in side panel header and report
  - [ ] Platform-specific notes appended to recommendations for at least the top 10 most common failing factors per platform
  - [ ] Graceful fallback to generic notes when platform unknown
- **Dependencies:** None
- **Related:** —

### ROAD-0047 — "Start Here" priority focus mode
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Small (< 1 day)
- **Description:** A simplified view showing only the top 3 highest-impact issues across all three scoring models, ranked by points-at-stake × effort. Designed for client presentations where the full 56-factor breakdown overwhelms the room. Shown as a "Start Here" card at the top of the side panel results and as a dedicated section before the full breakdown in the HTML report.
- **Acceptance Criteria:**
  - [ ] "Start Here" card in side panel showing top 3 cross-model issues
  - [ ] Each issue: factor name, which model, plain-English description, estimated points gain
  - [ ] "Start Here" section at top of HTML report (before AI Readiness section)
  - [ ] Issues ranked by impact×effort (reuses existing recommendation priority logic)
- **Dependencies:** None
- **Related:** ROAD-0036

### ROAD-0046 — Competitive URL comparison mode (in-session)
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** PM & competitive review (2026-03-23)
- **Scope:** Medium (1-3 days)
- **Description:** Analyze a client's URL and a competitor's URL in the same session. Show a side-by-side factor-level diff with explicit "competitor has the advantage here" callouts. Include a "competitive gap narrative" block in the report summarizing the 3 strongest competitor advantages. This is the single most persuasive sales motion in consulting — showing a client exactly where their competitor outperforms them on AI readiness closes rooms faster than abstract recommendations. Distinct from ROAD-0020 (which depends on ROAD-0013 for historical factor storage); this version works entirely in-session.
- **Acceptance Criteria:**
  - [ ] "Compare with competitor" button after analysis completes
  - [ ] Second URL input to analyze competitor page in same session
  - [ ] Side-by-side comparison view: both scores + factor-level delta column
  - [ ] Factors where competitor leads flagged with clear visual treatment
  - [ ] "Competitive Gap Narrative" section in HTML report (top 3 competitor advantages)
  - [ ] Does NOT require ROAD-0013 (uses in-session data only)
- **Dependencies:** None (in-session only, no history storage needed)
- **Related:** ROAD-0020

### ROAD-0045 — Crawler visibility confidence layer: distinguish DOM-rendered vs. LLM-accessible content
- **Status:** Proposed
- **Type:** Research
- **Priority:** Unranked
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-23
- **Requested By:** Client analysis session (Natural Life vs. Baltic Born)
- **Scope:** Large (3+ days)
- **Description:** pdpIQ extracts data from a fully JS-rendered Chrome DOM — it sees everything present after all scripts have run. Most LLM crawlers (GPTBot, ClaudeBot, PerplexityBot) are raw HTML parsers that do not execute JavaScript. This means pdpIQ can award points for content that LLM crawlers would never see: JS-injected accordion interiors, lazy-loaded sections, Vue-rendered content that isn't server-side rendered. The tool currently has no way to distinguish "content that is in the initial server-rendered HTML" from "content that only appears after JS execution or user interaction." This inflates scores in a way that misrepresents actual LLM visibility and undermines the tool's core value proposition. Additionally, even content present in the initial HTML but locked in schema markup vs. DOM prose has different LLM weight — schema is always machine-readable; DOM prose depends on crawler depth and CSS visibility handling.
- **Acceptance Criteria:**
  - [ ] Research phase documents which LLM crawlers execute JS and which do not
  - [ ] Identify which pdpIQ factors are most at risk of DOM-only false positives (shipping/returns, accordion content, lazy-loaded reviews)
  - [ ] Propose a confidence signal (e.g. "schema-backed", "DOM only", "JS-dependent") per factor or per category
  - [ ] Define whether this changes scoring or only surfaces a warning to the user
  - [ ] Consider adding a "raw HTML simulation mode" that filters the DOM to only elements present in the initial server response
- **Dependencies:** ROAD-0001 (test suite — needed to safely refactor extraction)
- **Related:** BUG-0085, BUG-0086
- **Notes:** The most concrete near-term action is fixing BUG-0085 and BUG-0086 to require substantive content before awarding flags. The broader question of JS-rendered vs. server-rendered detection is a larger research and architecture project. Schema-backed signals (JSON-LD) are the gold standard for LLM visibility and should be weighted accordingly in any future confidence model. **Partial progress 2026-03-23:** The JS-dependency warning shown in the side panel and report was reworded from "scores may be understated" (incorrect direction) to "scores may reflect more than LLM crawlers actually see" (correct direction). The old copy also described the issue as pdpIQ's extraction limitation, which was wrong — pdpIQ runs in Chrome after full JS execution and captures accordion/collapsed content. The real risk is the inverse: pdpIQ sees more than LLM crawlers do. **Partial progress 2026-03-26 (v3.2.0):** Added Raw Crawlable Text section exposing three views: product description, full page (`innerText` — CSS-visible only), and raw HTML parser view (`textContent` with script/style stripped — includes hidden elements). The third view is the closest current approximation of what LLM crawlers ingest. Surfaced to users with word counts and copy buttons. The word count gap between the second and third views gives a rough signal of how much CSS-hidden content exists on the page. True server-rendered vs. JS-injected distinction remains unresolved — would require a service worker HTML fetch, deferred due to auth/CORS caveats.

### ROAD-0044 — Pass `isPlp` to remaining AI Readiness scoring methods
- **Status:** Proposed
- **Type:** Tech Debt
- **Priority:** Unranked
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-20
- **Requested By:** Accuracy audit (pre-client NaturalLife.com review)
- **Scope:** Small (< 1 day)
- **Description:** `isPlp` is currently passed to `scoreAIDiscoverability()` and `scoreStructuredData()` but not to `scoreProtocolMeta()`, `scoreContentQuality()`, `scoreContentStructure()`, or `scoreAuthorityTrust()`. No immediate impact on PDP analysis, but creates inconsistency when PLP scoring is eventually expanded (ROAD-0038). Identified as design debt — not a bug.
- **Acceptance Criteria:**
  - [ ] `isPlp` passed to all 6 AI Readiness scoring methods in `calculateScore()`
  - [ ] Each method has a guard for N/A flagging on PLP-irrelevant factors
- **Dependencies:** ROAD-0038 (PLP-specific factors Phase 2)
- **Related:** DEC-0025, ROAD-0038
- **Notes:** Flagged during accuracy audit 2026-03-20. Low risk for PDP-only usage, which is the current primary use case.

### ROAD-0041 — Build step evaluation and migration plan for content-script.js
- **Status:** Proposed
- **Type:** Tech Debt
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Triggered by DEC-0028 threshold (5,000 lines or Phase 2 PLP adds 500+ lines)
- **Date Added:** 2026-03-20
- **Requested By:** Engineering review (2026-03-20)
- **Scope:** Small (< 1 day)
- **Description:** When `content-script.js` exceeds 5,000 lines or PLP Phase 2 requires 500+ new lines, migrate to an `esbuild` or `rollup` build step. This allows the source to be split into logical modules (extraction domains) that bundle into a single content script. Preserves the zero-runtime-dependency architecture while removing the maintenance burden of a monolithic file.
- **Acceptance Criteria:**
  - [ ] `esbuild` or `rollup` configured with minimal config (< 20 lines)
  - [ ] Source split into domain-level modules (content, structured-data, pdp-quality, seo, etc.)
  - [ ] Built output is a single content-script.js (same as current)
  - [ ] Extension loading workflow unchanged (load unpacked still works)
  - [ ] All existing tests pass against built output
- **Dependencies:** ROAD-0001 (test suite for regression safety), DEC-0028 threshold condition
- **Related:** DEC-0028

### ROAD-0042 — Wire `deleteAnalysis()` to per-entry delete button in History tab
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P3 (Low)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-20
- **Requested By:** Engineering review (2026-03-20)
- **Scope:** Small (< 1 day)
- **Description:** `storage-manager.js` exports `deleteAnalysis`, `getAnalysis`, `getHistoryByDomain`, `getHistoryByUrl`, `getRecentAnalyses`, and `exportHistory` — none of which are currently imported anywhere. The most user-visible gap is `deleteAnalysis`: users have no way to remove individual history entries, only to wait for the 20-entry cap to prune old ones. A delete button per history entry would close this gap.
- **Acceptance Criteria:**
  - [ ] Delete button (×) visible on each history entry in History tab
  - [ ] Confirmation prompt before deletion (single-click is too risky)
  - [ ] History list re-renders after deletion
  - [ ] `deleteAnalysis()` in storage-manager.js is the underlying call
- **Dependencies:** None
- **Related:** —

### ROAD-0038 — PLP-specific factors and adjusted weights (Phase 2)
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** v2.4.0 — Post-validation
- **Date Added:** 2026-03-18
- **Requested By:** Product strategy (client engagement need)
- **Scope:** Large (3+ days)
- **Description:** Phase 2 of page type detection. Add collection-page-specific factors with adjusted weights: product card completeness (images, prices, ratings per card), ItemList/CollectionPage schema, faceted navigation & filter UX, pagination vs infinite scroll, product count visibility, filter-to-URL mapping (crawlable facets). Only build after ops team validates need through consulting engagements.
- **Acceptance Criteria:**
  - [ ] PLP-specific extraction functions in content-script.js
  - [ ] PLP-specific factor weights and category definitions in weights.js
  - [ ] PLP scoring methods in scoring-engine.js
  - [ ] PLP recommendation templates in recommendation-rules.js
  - [ ] Automatic switch between PDP and PLP scoring based on detectPageType()
- **Dependencies:** ROAD-0034 (Phase 1 page type detection)
- **Related:** DEC-0025

### ROAD-0039 — Vertical category expansion (beyond apparel)
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** v2.4.0 — Post-validation
- **Date Added:** 2026-03-18
- **Requested By:** Product strategy (consulting credibility)
- **Scope:** Medium (1-3 days per vertical)
- **Description:** Expand category auto-detection beyond apparel to electronics, home goods, health/beauty, food/beverage. Each vertical has different factor relevance — electronics emphasizes specs/compatibility, food emphasizes certifications, etc. Extends the isLikelyApparel() pattern to a general `detectProductVertical()`.
- **Acceptance Criteria:**
  - [ ] `detectProductVertical()` returns vertical type (apparel, electronics, home, health, food, general)
  - [ ] Per-vertical N/A factor definitions
  - [ ] Per-vertical scoring adjustments
  - [ ] Backward-compatible with existing apparel detection
- **Dependencies:** ROAD-0001 (test suite for regression safety)
- **Related:** DEC-0015

### ROAD-0040 — JSON export data contract for enhanced platform
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-18
- **Requested By:** Product strategy (TRIBBUTE enhanced platform enablement)
- **Scope:** Small (< 1 day)
- **Description:** Define and document the JSON export schema as a formal data contract consumed by the future TRIBBUTE API enhanced platform (Q&A generator, content brief builder, competitor analysis). Current JSON export exists but may need enrichment to support generation use cases — e.g., full extracted text fields, structured spec data, review snippets.
- **Acceptance Criteria:**
  - [ ] Documented JSON schema with field descriptions
  - [ ] All extraction data fields included (not just scores)
  - [ ] Versioned schema for forward compatibility
- **Dependencies:** None
- **Related:** DEC-0027

### ROAD-0008 — Bulk analysis via CSV URL upload
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P0 (Critical)
- **Target Phase/Sprint:** Phase 2 — pdpIQ Pro
- **Date Added:** 2026-03-01
- **Requested By:** Product brief (Pro tier differentiator)
- **Scope:** Large (3+ days)
- **Description:** Core Pro tier differentiator. Users analyzing product catalogs must currently run the tool one page at a time. Bulk upload of 50-500 URLs with batch scoring would dramatically increase value for agencies and multi-brand teams.
- **Acceptance Criteria:**
  - [ ] CSV upload with URL column detection
  - [ ] Batch processing with progress indicator
  - [ ] Results table with sort/filter
  - [ ] Export of batch results (CSV + HTML report)
- **Dependencies:** ROAD-0001 (test suite), proven free tier adoption
- **Related:** —
- **Notes:** Requires rethinking the extension-only architecture. May need a lightweight backend or use tabs API for sequential page loading.

### ROAD-0009 — Split content-script.js into logical modules
- **Status:** Proposed
- **Type:** Refactor
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Phase 2
- **Date Added:** 2026-03-01
- **Requested By:** PDS Process (tech debt review)
- **Scope:** Medium (1-3 days)
- **Description:** content-script.js is ~2,000 lines in a single file. Hard to navigate and risky to modify. DEC-0014 consolidated for simplicity, but Chrome MV3 may now support better patterns (IIFE or minimal bundler).
- **Acceptance Criteria:**
  - [ ] Extraction logic split into logical groupings
  - [ ] Chrome injection still works correctly
  - [ ] No functional changes to extraction behavior
- **Dependencies:** ROAD-0001 (tests to verify no regression)
- **Related:** DEC-0014

### ROAD-0010 — Custom weight profiles (user-defined multipliers)
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Phase 2 — pdpIQ Pro
- **Date Added:** 2026-03-01
- **Requested By:** Product brief (Pro tier feature)
- **Scope:** Medium (1-3 days)
- **Description:** Agencies want to weight factors differently per client or industry vertical. Currently only three pre-defined contexts exist (DEC-0006).
- **Acceptance Criteria:**
  - [ ] UI to adjust category weights
  - [ ] Custom profiles saved and loadable
  - [ ] Validation that weights sum to 1.0
- **Dependencies:** ROAD-0001
- **Related:** DEC-0006

### ROAD-0011 — Trend tracking / score history graph
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P0 (Critical)
- **Target Phase/Sprint:** Phase 2 — pdpIQ Pro
- **Date Added:** 2026-03-01
- **Requested By:** Product brief (Pro tier feature)
- **Scope:** Large (3+ days)
- **Description:** Users want to see improvement over time. Current compact history entries (DEC-0007) lack factor detail for meaningful trending. Would need richer history storage.
- **Acceptance Criteria:**
  - [ ] Score history chart for a URL or domain
  - [ ] Category-level trend lines
  - [ ] Date range filtering
- **Dependencies:** ROAD-0013 (richer history entries)
- **Related:** DEC-0007, DEC-0008

### ROAD-0012 — API access for programmatic analysis
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Phase 2 — pdpIQ Pro
- **Date Added:** 2026-03-01
- **Requested By:** Product brief (Pro tier feature)
- **Scope:** Large (3+ days)
- **Description:** Requires a backend — breaks current all-local architecture (DEC-0009). Would enable integrations, automation, and non-browser usage.
- **Acceptance Criteria:**
  - [ ] REST API for single-URL analysis
  - [ ] API key authentication
  - [ ] Rate limiting
  - [ ] Response format matching extension JSON export
- **Dependencies:** Backend infrastructure
- **Related:** DEC-0009, DEC-0010

### ROAD-0013 — Full factor detail in history entries
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Phase 2 — pdpIQ Pro
- **Date Added:** 2026-03-01
- **Requested By:** PDS Process (DEC-0007 revisit condition)
- **Scope:** Medium (1-3 days)
- **Description:** Store complete factor data for historical drill-down. May require migrating from chrome.storage.local to IndexedDB to handle larger entries.
- **Acceptance Criteria:**
  - [ ] Full factor data stored per history entry
  - [ ] Historical factor-level drill-down in UI
  - [ ] Storage scales to 500+ entries without quota issues
- **Dependencies:** May require DEC-0008 revisit (IndexedDB migration)
- **Related:** DEC-0007, DEC-0008, ROAD-0011

### ROAD-0014 — Team sharing and collaboration
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Phase 2 — pdpIQ Pro
- **Date Added:** 2026-03-01
- **Requested By:** Product brief (Pro tier feature)
- **Scope:** Large (3+ days)
- **Description:** Share reports and analysis history across team members. Requires a backend for data sync.
- **Acceptance Criteria:**
  - [ ] Team workspace creation
  - [ ] Shared analysis history
  - [ ] Shared report access
- **Dependencies:** ROAD-0012 (backend infrastructure)
- **Related:** —

### ROAD-0015 — Cross-browser support (Firefox, Safari, Edge)
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Phase 3 — Enterprise
- **Date Added:** 2026-03-01
- **Requested By:** Product brief (market expansion)
- **Scope:** Large (3+ days)
- **Description:** Currently Chrome-only. Side Panel API is Chrome-specific; would need popup fallback for other browsers. Limits addressable market.
- **Acceptance Criteria:**
  - [ ] Firefox extension with popup UI fallback
  - [ ] Safari extension (WebExtension API)
  - [ ] Edge extension (Chromium-based, minimal changes)
- **Dependencies:** None (can be done independently)
- **Related:** DEC-0011

### ROAD-0016 — Server-side crawl (no extension required)
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P0 (Critical)
- **Target Phase/Sprint:** Phase 3 — Enterprise
- **Date Added:** 2026-03-01
- **Requested By:** Product brief (Enterprise tier feature)
- **Scope:** Large (3+ days)
- **Description:** Enables headless analysis. Solves SPA rendering limitation (JS-rendered pages get understated scores because content scripts run in rendered DOM but AI crawlers see pre-render HTML). Requires full backend.
- **Acceptance Criteria:**
  - [ ] Headless browser crawling with scoring
  - [ ] Pre-render vs. post-render comparison
  - [ ] API integration with extension results
- **Dependencies:** ROAD-0012 (backend infrastructure)
- **Related:** —

### ROAD-0017 — Opt-in usage analytics
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P3 (Low)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-01
- **Requested By:** PDS Process (DEC-0009 revisit condition)
- **Scope:** Medium (1-3 days)
- **Description:** Zero telemetry (DEC-0009) means zero visibility into adoption, feature usage, or real-world errors. An opt-in model could provide insights without breaking the privacy promise.
- **Acceptance Criteria:**
  - [ ] Opt-in consent dialog (default off)
  - [ ] Anonymous event collection (no PII, no page content)
  - [ ] Privacy policy updated
  - [ ] CWS listing updated
- **Dependencies:** None
- **Related:** DEC-0009

### ROAD-0018 — White-label reports
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Phase 2 — pdpIQ Pro
- **Date Added:** 2026-03-01
- **Requested By:** Product brief (Pro tier feature)
- **Scope:** Medium (1-3 days)
- **Description:** Replace Tribbute branding with agency/client branding on exported reports. Valuable for agencies presenting to clients.
- **Acceptance Criteria:**
  - [ ] Custom logo upload
  - [ ] Custom brand colors
  - [ ] Report footer customization
- **Dependencies:** None
- **Related:** —

### ROAD-0019 — Schema validation (syntax, not just presence)
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-01
- **Requested By:** PDS Process (improvement opportunity)
- **Scope:** Medium (1-3 days)
- **Description:** Currently checks if schema exists but not if it's syntactically valid. Invalid JSON-LD that browsers ignore is treated as "present."
- **Acceptance Criteria:**
  - [ ] JSON-LD syntax validation
  - [ ] Required field validation per schema type
  - [ ] Factor scoring adjusted for invalid schemas
- **Dependencies:** ROAD-0001
- **Related:** —

### ROAD-0020 — Competitive benchmarking view
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-01
- **Requested By:** PDS Process (improvement opportunity)
- **Scope:** Medium (1-3 days)
- **Description:** Analyze your page + a competitor's page with structured comparison beyond the current 2-entry side-by-side history comparison.
- **Acceptance Criteria:**
  - [ ] Side-by-side factor-level comparison
  - [ ] Strength/weakness highlighting
  - [ ] Exportable comparison report
- **Dependencies:** ROAD-0013 (full factor history for meaningful comparison)
- **Related:** —

### ROAD-0021 — UI localization / i18n
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Unscheduled
- **Date Added:** 2026-03-01
- **Requested By:** PDS Process (Canadian market need)
- **Scope:** Medium (1-3 days)
- **Description:** Extension UI and recommendations are English-only. Canadian market includes French-speaking users.
- **Acceptance Criteria:**
  - [ ] i18n framework for UI strings
  - [ ] French translation of all UI text and recommendations
  - [ ] Language detection or manual selection
- **Dependencies:** None
- **Related:** —

### ROAD-0022 — Custom scoring factors (Enterprise)
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Phase 3 — Enterprise
- **Date Added:** 2026-03-01
- **Requested By:** Product brief (Enterprise tier feature)
- **Scope:** Large (3+ days)
- **Description:** Client-defined factors beyond the standard 56. Enterprise clients may have industry-specific requirements.
- **Acceptance Criteria:**
  - [ ] Factor definition interface
  - [ ] Custom extraction rules
  - [ ] Integration with scoring engine
- **Dependencies:** ROAD-0016 (server-side architecture)
- **Related:** —

### ROAD-0023 — SSO / enterprise auth (SAML/OIDC)
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** Phase 3 — Enterprise
- **Date Added:** 2026-03-01
- **Requested By:** Product brief (Enterprise tier feature)
- **Scope:** Large (3+ days)
- **Description:** Enterprise identity integration for organizations requiring centralized authentication.
- **Acceptance Criteria:**
  - [ ] SAML 2.0 support
  - [ ] OIDC support
  - [ ] Role-based access control
- **Dependencies:** ROAD-0012 (backend)
- **Related:** —

### ROAD-0024 — Multi-site dashboard (Enterprise)
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P0 (Critical)
- **Target Phase/Sprint:** Phase 3 — Enterprise
- **Date Added:** 2026-03-01
- **Requested By:** Product brief (Enterprise tier feature)
- **Scope:** Large (3+ days)
- **Description:** Aggregate view across all brand sites/domains. Enterprise retailers manage multiple brands.
- **Acceptance Criteria:**
  - [ ] Domain-level aggregated scores
  - [ ] Cross-domain comparison
  - [ ] Drill-down from domain to URL level
- **Dependencies:** ROAD-0016, ROAD-0012
- **Related:** —

### ROAD-0025 — Automated re-analysis scheduling
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Phase 3 — Enterprise
- **Date Added:** 2026-03-01
- **Requested By:** Product brief (Enterprise tier feature)
- **Scope:** Large (3+ days)
- **Description:** Periodic re-crawl with change detection and alerts. Shows score trajectory without manual re-analysis.
- **Acceptance Criteria:**
  - [ ] Configurable schedule per URL/domain
  - [ ] Score change detection and alerting
  - [ ] Historical trend from automated runs
- **Dependencies:** ROAD-0016 (server-side crawling)
- **Related:** ROAD-0011

### ROAD-0026 — CI/CD integration for score regression checks
- **Status:** Proposed
- **Type:** Feature
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** Phase 3 — Enterprise
- **Date Added:** 2026-03-01
- **Requested By:** Product brief (Enterprise tier feature)
- **Scope:** Large (3+ days)
- **Description:** Run pdpIQ as a step in deployment pipelines. Fail builds when scores regress below threshold.
- **Acceptance Criteria:**
  - [ ] CLI tool or API endpoint for CI usage
  - [ ] Configurable pass/fail thresholds
  - [ ] JUnit-compatible output for CI systems
- **Dependencies:** ROAD-0012, ROAD-0016
- **Related:** —

## Completed

### ROAD-0043 — Content-to-Citation Roadmap (AI Visibility tab + report)
- **Status:** Done
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** v2.3.6 — Consulting Practice
- **Date Added:** 2026-03-20
- **Date Completed:** 2026-03-20
- **Requested By:** Product strategy (consulting deliverable — actionable content plan)
- **Scope:** Medium (1-3 days)
- **Description:** Rule-based engine that maps specific content gaps to the LLM citation opportunities they would unlock if filled. Presented as a 3-tier prioritized roadmap (Quick Wins / Medium Priority / Content Investment) with 5 content blocks. Two blocks (Styling, Fabric & Care) are apparel-gated. Displayed as a collapsible section below Citation Opportunities in the AI Visibility tab and as an amber-bordered section in the AI Readiness report section. Personalized with extracted product name and brand.
- **Acceptance Criteria:**
  - [x] `CitationRoadmapEngine` in new `src/recommendations/citation-roadmap.js`
  - [x] 5 content blocks across 3 tiers (Description, FAQ, Fabric & Care, Styling, Inline Reviews)
  - [x] Apparel-gated blocks (Styling, Fabric & Care) hidden for non-apparel products
  - [x] Inline Reviews block excluded when `reviews.count === 0`
  - [x] "Content foundation is strong" state when all tiers empty
  - [x] Collapsible `#citationRoadmapSection` in AI Visibility tab
  - [x] `buildCitationRoadmapSection()` in report-template.js, amber-bordered
  - [x] `extractProductIntelligence` exported from `citation-opportunities.js` and shared
  - [x] manifest.json bumped to v2.3.6
- **Dependencies:** ROAD-0035 (Citation Opportunity Map)
- **Related:** DEC-0026

### ROAD-0033 — SEO Quality scoring dimension
- **Status:** Done
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** v2.1.0 — Triple Scoring
- **Date Added:** 2026-03-04
- **Date Completed:** 2026-03-04
- **Requested By:** Product
- **Scope:** Large (multi-day)
- **Description:** Add SEO Quality as a third context-neutral scoring dimension with 4 categories (Title & Meta, Technical Foundations, Content Signals, Navigation & Discovery), 19 factors, and a 4th bottom nav tab. Reuses data from existing extraction pass; adds `extractSeoSignals()` for 3 new lightweight signals (title tag, URL structure, internal link count). Includes `SeoQualityRecommendationEngine`, SEO section in HTML report, 3rd grade badge in history, and backward-compatible storage.
- **Acceptance Criteria:**
  - [x] 4 tabs in bottom nav: AI Visibility, PDP Quality, SEO, History
  - [x] SEO tab renders grade, score, 4 category cards, and recommendations
  - [x] Factor expand button shows recommendation tip
  - [x] History entries show 3rd SEO grade badge
  - [x] HTML report includes SEO Quality section
  - [x] JSON export includes `seoScoreResult` and `seoRecommendations`
  - [x] Old history entries without `seoScore` show "N/A" gracefully
- **Dependencies:** ROAD-0027, ROAD-0032
- **Related:** DEC-0024

### ROAD-0032 — PDP Quality tab export buttons + expandable element detection
- **Status:** Done
- **Type:** Improvement
- **Priority:** P1 (High)
- **Target Phase/Sprint:** v2.0.0 — Dual Scoring
- **Date Added:** 2026-03-01
- **Date Completed:** 2026-03-01
- **Requested By:** QA review
- **Scope:** Small (< 1 day)
- **Description:** PDP Quality tab was missing Download Report and Download Analysis Data buttons that exist on the AI Visibility tab. Also fixed return policy and shipping info extraction failing on pages using expandable/accordion elements (e.g., `<details>/<summary>`, collapsible sections) with generic class names. Version bumped to 2.0.0.
- **Acceptance Criteria:**
  - [x] Download Report and Download Analysis Data buttons present on PDP Quality tab
  - [x] Export buttons call the same dual-score export methods as AI Visibility tab
  - [x] Return policy detected in `<details>/<summary>` and accordion elements
  - [x] Shipping info detected in `<details>/<summary>` and accordion elements
  - [x] manifest.json version updated to 2.0.0
- **Dependencies:** ROAD-0027
- **Related:** BUG-0001

### ROAD-0031 — Phase 4: History/comparison polish + documentation
- **Status:** Done
- **Type:** Improvement
- **Priority:** P1 (High)
- **Target Phase/Sprint:** v2.0.0 — Dual Scoring
- **Date Added:** 2026-03-01
- **Date Completed:** 2026-03-01
- **Requested By:** Product roadmap (PDP Quality initiative)
- **Scope:** Medium (1-3 days)
- **Description:** Polish dual-score experience across history and comparison views. Update CLAUDE.md with PDP Quality architecture documentation.
- **Acceptance Criteria:**
  - [x] History list shows dual grade badges (AI Readiness + PDP Quality) per entry
  - [x] Comparison view includes both score types with labeled sections
  - [x] CLAUDE.md updated with PDP Quality architecture, categories, extraction, scoring, and recommendations
  - [x] PDS tracking files updated (Decision Log, Roadmap, Changelog)
- **Dependencies:** ROAD-0028, ROAD-0029, ROAD-0030
- **Related:** DEC-0019, ROAD-0027

### ROAD-0030 — Phase 3: Reviews & Social Proof + report integration
- **Status:** Done
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** v2.0.0 — Dual Scoring
- **Date Added:** 2026-03-01
- **Date Completed:** 2026-03-01
- **Requested By:** Product roadmap (PDP Quality initiative)
- **Scope:** Medium (1-3 days)
- **Description:** Complete final PDP Quality category (Reviews & Social Proof) and integrate both scores into HTML report export.
- **Acceptance Criteria:**
  - [x] Reviews & Social Proof extraction, scoring, and recommendations implemented
  - [x] HTML report includes both AI Readiness and PDP Quality sections
  - [x] JSON export includes both scores and recommendation data
- **Dependencies:** ROAD-0028, ROAD-0029
- **Related:** DEC-0019, ROAD-0027

### ROAD-0029 — Phase 2: Visual Presentation + Content Completeness
- **Status:** Done
- **Type:** Feature
- **Priority:** P1 (High)
- **Target Phase/Sprint:** v2.0.0 — Dual Scoring
- **Date Added:** 2026-03-01
- **Date Completed:** 2026-03-01
- **Requested By:** Product roadmap (PDP Quality initiative)
- **Scope:** Medium (1-3 days)
- **Description:** Implement Visual Presentation and Content Completeness categories for PDP Quality scoring.
- **Acceptance Criteria:**
  - [x] Visual Presentation extraction, scoring, and recommendations implemented (6 factors)
  - [x] Content Completeness extraction, scoring, and recommendations implemented (6 factors)
- **Dependencies:** ROAD-0028
- **Related:** DEC-0019, ROAD-0027

### ROAD-0028 — Phase 1: MVP (Purchase Experience + Trust & Confidence + tab UI)
- **Status:** Done
- **Type:** Feature
- **Priority:** P0 (Critical)
- **Target Phase/Sprint:** v2.0.0 — Dual Scoring
- **Date Added:** 2026-03-01
- **Date Completed:** 2026-03-01
- **Requested By:** Product roadmap (PDP Quality initiative)
- **Scope:** Large (3+ days)
- **Description:** Core infrastructure for dual scoring: PDP Quality weights, extraction pipeline, scoring engine, recommendation engine, 3-tab UI, and storage. Includes first two categories (Purchase Experience, Trust & Confidence).
- **Acceptance Criteria:**
  - [x] PDP Quality constants in weights.js (categories, factors, multipliers, recommendations)
  - [x] Purchase Experience and Trust & Confidence extraction in content-script.js
  - [x] PDP Quality scoring engine with calculatePdpQualityScore()
  - [x] PdpQualityRecommendationEngine class with per-category check methods
  - [x] 3-tab bottom nav (AI Visibility, PDP Quality, History)
  - [x] PDP Quality tab with score card, categories, and recommendations
  - [x] History entries include pdpScore, pdpGrade, pdpCategoryScores
- **Dependencies:** None
- **Related:** DEC-0019, DEC-0020, DEC-0021, ROAD-0027

### ROAD-0027 — PDP Quality Score: Dual Scoring Model
- **Status:** Done
- **Type:** Feature
- **Priority:** P0 (Critical)
- **Target Phase/Sprint:** v2.0.0 — Dual Scoring
- **Date Added:** 2026-03-01
- **Date Completed:** 2026-03-01
- **Requested By:** Product strategy (expand from AI-only to dual-purpose PDP analyzer)
- **Scope:** Large (3+ days)
- **Description:** Add a separate PDP Quality score (30 factors, 5 categories) measuring consumer shopping experience alongside the existing AI Readiness score. Broadens pdpIQ from a specialist AI tool to a dual-purpose PDP analyzer (v2.0).
- **Acceptance Criteria:**
  - [x] 5 PDP Quality categories: Purchase Experience (25%), Trust & Confidence (20%), Visual Presentation (20%), Content Completeness (15%), Reviews & Social Proof (20%)
  - [x] 30 factors with extraction, scoring, and recommendations
  - [x] Context-sensitive multipliers (Want/Need/Hybrid)
  - [x] Tab-based UI with 3 bottom nav tabs
  - [x] Dual scores in history, comparison, HTML report, and JSON export
  - [x] Backward-compatible history (old entries show N/A for PDP Quality)
- **Dependencies:** None
- **Related:** DEC-0019, DEC-0020, DEC-0021, ROAD-0028, ROAD-0029, ROAD-0030, ROAD-0031

## Rejected / On Hold

_No rejected or held items._

---

## External Factors That Could Change Direction

| Factor | Likelihood | Impact | How It Changes Plans |
|--------|-----------|--------|---------------------|
| LLM chats add WebP rendering | Medium | High | Demote WebP from critical; rebalance Protocol & Meta scoring |
| Chrome deprecates Side Panel API | Low | High | Migrate to popup or DevTools; significant UX regression |
| Ahrefs/SEMrush adds AI citation scoring | Medium | High | Accelerate Pro tier; emphasize 56-factor depth advantage |
| Google introduces AI-specific markup recs | Medium | Medium | May need new scoring factors for Google-recommended patterns |
| New AI crawlers (xAI, Mistral, Deepseek) | High | Low | Simple update to AI_CRAWLERS in service-worker.js |
| llms.txt becomes widely adopted | Medium | Medium | Parse and evaluate content, not just existence |
| Chrome blocks `<all_urls>` permission | Low | Critical | Breaks all network enrichment; need per-site permission prompts |
| AI search market share plateaus | Low | High | Undermines core value proposition |
| Shopify changes JSON-LD structure | Medium | Medium | Update categorizeSchemas() and Shopify-specific paths |
| EU AI transparency regulations | Low | Medium | May create new factors or change crawler access interpretation |

---

_This roadmap should be reviewed monthly or when significant new information arises. Last reviewed: 2026-03-20._
