# Product Brief

> **PDS Document 01** | Last Updated: 2026-03-01

---

## 1. Problem Statement

Traditional SEO tools (Ahrefs, SEMrush, Moz) optimize eCommerce product pages for Google search rankings. But ranking on Google does not mean ChatGPT, Claude, Perplexity, or Gemini will discover, understand, or cite a product. AI systems pull from different signals than search engines — structured data schemas, entity consistency across page elements, robots.txt rules for AI-specific crawlers, content formatted for answer extraction, and product identifiers like GTIN/UPC. The gap between "indexed by Google" and "cited by AI" is significant and growing as consumer behavior shifts toward AI-assisted shopping.

eCommerce teams currently have no way to audit their product pages from the perspective of a large language model. They can't answer basic questions: Can GPTBot crawl this page? Does the product name match across schema markup, H1, og:title, and meta description? Is the og:image in a format that renders in ChatGPT's UI? Are there "best for" statements or comparison content that AI systems extract for recommendation queries? Without answers, teams are blind to an entire discovery channel.

The cost is measurable: products that AI systems can't parse don't appear in AI-generated recommendations, comparison answers, or shopping suggestions. As AI-assisted product discovery grows, pages that score poorly on AI readiness lose citation share to competitors whose pages are better structured — regardless of traditional SEO rank.

## 2. Target User

**Primary User:**
eCommerce SEO managers, digital merchandisers, and digital shelf analysts at DTC brands or mid-market retailers managing product catalogs of 50-500+ SKUs, who are responsible for product page content, structured data, and organic discoverability.

**Secondary Users (if any):**
- Shopify theme developers building "AI-ready" templates for clients
- eCommerce agencies including AI readiness audits in client deliverables and QBRs
- Content managers at marketplace sellers ensuring consistent schema and content across platforms

**User Context:**
- pdpIQ fits into the content optimization and QA phase of product page management. Users run it after publishing or updating a product page to audit AI readiness, similar to how they run Lighthouse for performance or an SEO crawler for technical SEO.
- Before using pdpIQ, users are editing product page content, schema markup, or meta tags in their CMS or Shopify admin. After using pdpIQ, they take the prioritized recommendations back to their CMS to fix issues (converting og:image from WebP, adding FAQ schema, unblocking AI crawlers in robots.txt).
- pdpIQ complements (does not replace) traditional SEO tools. It fills a gap that Ahrefs, SEMrush, Screaming Frog, and Google Search Console do not address: scoring the specific signals that LLMs use to discover and cite products.

## 3. Product Definition

**One-sentence summary:**
pdpIQ is a Chrome browser extension that analyzes eCommerce product detail pages for AI citation readiness across 75+ weighted factors for SEO managers and merchandisers so they can identify and fix the specific issues preventing their products from being discovered and recommended by AI systems.

**Core Capabilities:**
- Scores any product page across 6 weighted categories (Structured Data 20%, Protocol & Meta 15%, Content Quality 20%, Content Structure 12%, Authority & Trust 13%, AI Discoverability 20%) with a single A-F letter grade and 0-100 numeric score
- Applies context-sensitive scoring via 3 purchase modes — Want (emotional/lifestyle), Need (functional/spec-driven), Hybrid (balanced) — that adjust factor weights to match how consumers actually shop for that product type
- Extracts and evaluates JSON-LD and microdata schemas (Product, Offer, AggregateRating, Review, FAQ, Breadcrumb, Organization, ImageObject), including Shopify ProductGroup variant handling and @id reference resolution
- Detects critical AI-blocking issues: WebP og:image format (invisible in LLM chat UIs), robots.txt rules blocking 15 named AI crawlers, missing Product schema, noindex directives
- Generates up to 44 prioritized recommendations with impact/effort matrix, implementation guidance, and HTML code snippets — sorted into Quick Wins, Medium Priority, and Nice to Have
- Checks AI-specific discoverability signals: entity name consistency across schema/H1/og:title/meta description, answer-format content patterns ("best for," comparisons, how-to), product identifiers (GTIN/UPC/MPN), and llms.txt presence
- Exports analysis as self-contained branded HTML report or raw JSON data file
- Saves up to 100 analyses locally with side-by-side comparison of any 2 saved analyses
- Detects apparel/fashion product categories and adjusts scoring to skip irrelevant factors (warranty, compatibility, dimensions)
- Runs entirely in-browser with zero data transmission — no backend, no telemetry, no user accounts

**Explicit Non-Goals (what this product does NOT do):**
- Does not perform traditional SEO analysis (keyword rankings, backlink profiles, domain authority, page speed)
- Does not crawl multiple pages or entire sites — analyzes one page at a time via the active browser tab
- Does not modify page content or inject fixes — it diagnoses and recommends, the user implements
- Does not require or support user accounts, authentication, or cloud-synced data
- Does not work on Firefox, Safari, or mobile browsers — Chrome desktop only
- Does not send any page data to external servers (Tribbute or otherwise)
- Does not analyze pages behind authentication/login walls [FLAG: cannot determine if this is a deliberate non-goal or a limitation that may be addressed later]

## 4. Success Criteria

_[FLAG: The following metrics are inferred from the product's design intent and code structure. Actual baseline measurements and targets have not been validated — they are not defined anywhere in the codebase. These should be established through user research and analytics.]_

| Metric | Current State | Target | Measurement Method |
|--------|--------------|--------|-------------------|
| Time to audit a product page for AI readiness | Unknown — no equivalent tool exists; manual audit estimated at 2-4 hours | Under 5 seconds per page | Extension analysis completion time (extractionTime field in code) |
| Number of actionable issues identified per page | Unknown — manual audit may miss signals | 5-15 prioritized recommendations per typical page | Recommendation engine output count |
| User understanding of AI readiness gaps | Low — no standard scoring framework exists | User can identify top 3 fixes within 60 seconds of viewing results | Qualitative user testing |
| Chrome Web Store rating | N/A (new product) | 4.5+ stars | Chrome Web Store reviews |
| Weekly active users | N/A (new product) | [Not defined in code] | Chrome Web Store analytics |

## 5. Key Assumptions & Risks

**Assumptions (things we believe but haven't validated):**
1. eCommerce teams care about AI citation and are willing to invest time optimizing for it — the "AI answer economy" is a recognized priority, not just a theoretical concern
2. The 75+ factors and 6 category weights accurately reflect what LLMs actually use when deciding to cite products — this scoring model is based on informed analysis but not empirically validated against real LLM citation behavior
3. The three purchase contexts (Want/Need/Hybrid) meaningfully represent how consumers use AI to shop, and context-sensitive weights improve recommendation relevance
4. A Chrome extension (vs. SaaS web app) is the right delivery format for the primary user — the "analyze the page I'm looking at" workflow matches user behavior
5. WebP og:image format is genuinely problematic for AI system rendering — this is stated as fact in recommendations but LLM rendering behavior changes over time [FLAG: This assumption should be periodically re-validated]
6. Zero-telemetry, privacy-first architecture is a competitive advantage worth the tradeoff of having no usage analytics

**Risks:**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI systems change how they evaluate pages, making the scoring model outdated | High | High | Monitor AI crawler behavior, LLM documentation, and citation patterns; plan quarterly weight reviews |
| JavaScript-heavy SPAs render content after document_idle, causing understated scores | Med | Med | Extension already detects high JS dependency and shows warning banner; future server-side crawl option in Enterprise tier |
| Chrome Manifest V3 restrictions tighten, limiting content script or network request capabilities | Low | High | Currently uses only standard MV3 APIs; no deprecated features in use |
| Users expect site-wide bulk analysis but extension only supports single-page | High | Med | Product roadmap includes pdpIQ Pro with CSV upload bulk analysis |
| Competitors (Ahrefs, SEMrush) add AI readiness scoring to their existing platforms | Med | High | First-mover depth advantage — 75+ factors vs. likely surface-level integration; speed of iteration as focused product |
| 10MB chrome.storage.local quota fills up for power users analyzing many pages | Low | Low | Auto-pruning at 80% quota, stores compact summaries only (~2-4KB per entry), supports 2,500+ entries |

## 6. Dependencies & Integrations

| Dependency | Type | Criticality | Notes |
|-----------|------|-------------|-------|
| Chrome Browser (Desktop) | Platform | Required | Manifest V3 extension; no Firefox/Safari/mobile support |
| Chrome Extension APIs (sidePanel, storage, activeTab, tabs) | Platform API | Required | Side Panel API requires Chrome 114+; all APIs are stable and GA |
| Chrome Web Store | Distribution | Required | Primary distribution channel; review/approval process for updates |
| Target page robots.txt | Network fetch | Optional | Fetched to evaluate AI crawler access; analysis continues if unavailable |
| Target page og:image URL | Network fetch (HEAD) | Optional | HEAD request to detect WebP format; factor scored as unknown if fetch fails |
| Target page /llms.txt | Network fetch (HEAD) | Optional | Checked for presence; scored as absent if fetch fails |

_[FLAG: No external APIs, databases, or third-party services are dependencies. The product is fully self-contained. The only network requests go to the page being analyzed.]_

## 7. Competitive / Alternative Landscape

| Alternative | Why Not Sufficient |
|------------|-------------------|
| Manual audit using Chrome DevTools | Takes 2-4 hours per page; requires expertise in JSON-LD, robots.txt AI crawler names, og:image format requirements; no standardized scoring; not repeatable at scale |
| Ahrefs / SEMrush / Moz | Optimized for Google search rankings (backlinks, keyword positions, domain authority); do not evaluate AI-specific signals like entity consistency, AI crawler access, answer-format content, or llms.txt |
| Screaming Frog | Technical SEO crawler; checks structured data presence but does not score AI citation readiness, does not evaluate AI crawler robots.txt rules, does not assess content for LLM answer extraction patterns |
| Google Rich Results Test | Validates schema markup for Google's rich results only; does not evaluate the broader set of signals LLMs use (entity consistency, answer-format content, AI crawler access) |
| Schema.org Validator | Checks schema syntax correctness only; does not evaluate whether the schema content is sufficient for AI citation (e.g., missing brand, GTIN, or AggregateRating) |
| Lighthouse / PageSpeed Insights | Performance and accessibility focused; no AI readiness scoring |

## 8. Roadmap Context

**Phase 1 (MVP — current scope):**
Chrome extension (v1.1.0) that analyzes a single product page in the active tab. Scores 75+ factors across 6 categories with context-sensitive weighting (Want/Need/Hybrid). Generates prioritized recommendations. Exports HTML report and JSON data. Maintains local history of up to 100 analyses with side-by-side comparison. Zero-telemetry, privacy-first architecture. Distributed via Chrome Web Store.

**Phase 2 (if validated):**
_[FLAG: The following is referenced in the codebase marketing handoff document (src/docs/pdpiq-product-page-handoff.md) but is not implemented in code. Including for roadmap context only.]_
pdpIQ Pro ($29-49/mo) — bulk analysis via CSV URL upload, trend tracking over time, custom weights (user-defined multipliers), API access, team sharing, and white-label reports.

**Phase 3 (longer-term vision):**
_[FLAG: Same source as Phase 2 — referenced in marketing docs, not in code.]_
pdpIQ Enterprise (custom pricing) — white-label reports, server-side crawl to bypass JavaScript rendering limitations, custom scoring factors, SSO, and SLA support.

---

_This brief was last reviewed on 2026-03-01 and is considered CURRENT. Next review scheduled: 2026-06-01._
