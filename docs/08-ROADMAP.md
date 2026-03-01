# Roadmap

> **PDS Document 08** | Last Updated: 2026-03-01

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

### ROAD-0001 — Add automated test suite (Vitest/Jest)
- **Status:** In Progress
- **Type:** Tech Debt
- **Priority:** P0 (Critical)
- **Target Phase/Sprint:** v1.2.0 — Foundation Hardening
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

### ROAD-0007 — Quarterly AI crawler list review
- **Status:** Approved
- **Type:** Improvement
- **Priority:** P1 (High)
- **Target Phase/Sprint:** v1.2.0 — Foundation Hardening
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
- **Status:** Approved
- **Type:** Improvement
- **Priority:** P1 (High)
- **Target Phase/Sprint:** v1.2.0 — Foundation Hardening
- **Date Added:** 2026-03-01
- **Requested By:** PDS Process (security review)
- **Scope:** Small (< 1 day)
- **Description:** `isSafeUrl()` blocks localhost/127.0.0.1/0.0.0.0 but not 192.168.x.x, 10.x.x.x, or 172.16-31.x.x. These private ranges are theoretically fetchable via the `<all_urls>` permission.
- **Acceptance Criteria:**
  - [ ] `isSafeUrl()` rejects all RFC 1918 private ranges
  - [ ] `isSafeUrl()` rejects link-local addresses (169.254.x.x)
  - [ ] Existing tests still pass
- **Dependencies:** ROAD-0001 (test suite should be in place first)
- **Related:** DEC-0001

### ROAD-0002 — Centralize DEBUG flag
- **Status:** Approved
- **Type:** Tech Debt
- **Priority:** P2 (Medium)
- **Target Phase/Sprint:** v1.2.0 — Foundation Hardening
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
- **Target Phase/Sprint:** v1.2.0 — Foundation Hardening
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
- **Target Phase/Sprint:** v1.2.0 — Foundation Hardening
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
- **Target Phase/Sprint:** v1.2.0 — Foundation Hardening
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

_This roadmap should be reviewed monthly or when significant new information arises. Last reviewed: 2026-03-01._
