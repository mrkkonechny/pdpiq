# Project Configuration

## Product Development Standard (PDS)
This project follows the TRIBBUTE PDS. Read `docs/00-PDS_README.md` for the full structure and `.claude/rules/pds-protocol.md` for operational rules.

### Documentation Structure
- `docs/01-06` — Product definition and operations (update with explicit instruction only)
- `docs/07-10` — Tracking files (update proactively during work)
- `docs/.context/` — Ephemeral agent handoff files (overwrite each task)

### ID Systems
- **DEC-NNNN** → Decision Log (07)
- **ROAD-NNNN** → Roadmap (08)
- **BUG-NNNN** → Bug Log (09)

When you encounter a bug, complete a feature, make an architectural decision, or identify tech debt during any task, update the relevant tracking files and cross-reference IDs.

## Project Overview

pdpIQ is a Chrome extension by **Tribbute** that analyzes eCommerce Product Detail Pages (PDPs) with a triple scoring model:
1. **AI Readiness** — 56 factors across 6 categories (AI citation optimization)
2. **PDP Quality** — 30 factors across 5 categories (consumer shopping experience)
3. **SEO Quality** — 19 factors across 4 categories (on-page SEO signals, context-neutral)

All three scores are calculated from a single DOM extraction pass, displayed in separate tabs, and saved together in history. Internal-only tool — see `.claude/rules/product-strategy.md`.

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (ES modules)
- Chrome Side Panel API for UI
- Chrome Storage API for history persistence
- No build tools or bundlers required

## Project Structure

```
pdpiq/
├── manifest.json                 # Extension configuration (includes CSP)
├── icons/
├── src/
│   ├── background/
│   │   └── service-worker.js    # Message routing, sender validation, URL guards, network fetches
│   ├── content/
│   │   └── content-script.js    # All extraction logic (inline — extractors/ dir was deleted)
│   ├── scoring/
│   │   ├── scoring-engine.js    # Score calculations for all 3 models
│   │   ├── weights.js           # Category/factor/context weights + factor→recommendation mappings
│   │   └── grading.js           # Grade color/background helpers
│   ├── recommendations/
│   │   ├── recommendation-engine.js  # RecommendationEngine + PdpQualityRecommendationEngine + SeoQualityRecommendationEngine
│   │   ├── recommendation-rules.js   # All recommendation templates (AI + PDP + SEO)
│   │   ├── citation-opportunities.js # Citation Opportunity Map engine
│   │   └── citation-roadmap.js       # Content-to-Citation Roadmap engine
│   ├── sidepanel/
│   │   ├── sidepanel.html       # UI markup
│   │   ├── sidepanel.css        # Styles (CSS variables for grade colours)
│   │   ├── sidepanel.js         # UI controller (results, history, comparison, export)
│   │   └── report-template.js   # Self-contained HTML report generator
│   └── storage/
│       └── storage-manager.js   # History persistence, quota management
└── docs/
```

## Development Workflow

### Loading the Extension
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the project root

### Testing Changes
- **JS changes**: reload extension from `chrome://extensions/`
- **Content script changes**: also refresh the target page
- **Service worker changes**: click "Update" on the extension card

### Debugging
- Service worker: `chrome://extensions/` → "Inspect views: service worker"
- Content script: DevTools on target page → Console
- Side panel: Right-click side panel → Inspect
- Verbose logging: set `const DEBUG = true;` at top of relevant file (default: `false`)

## Architecture

### Message Flow
1. User clicks extension icon → opens side panel
2. User selects context (Want/Need/Hybrid)
3. Side panel sends `ANALYZE_PAGE` to service worker
4. Service worker validates sender, injects/messages content script
5. Content script runs extractors, returns raw data
6. Service worker verifies image formats (HTTP HEAD requests)
7. Side panel receives data, runs scoring engine
8. Results displayed with recommendations; analysis auto-saved to history

### Scoring System

#### AI Readiness (56 factors)
| Category | Weight | Focus |
|----------|--------|-------|
| Structured Data | 20% | JSON-LD Product/Offer schemas |
| Protocol & Meta | 15% | og:image format (WebP fails in LLM chats) |
| Content Quality | 20% | Descriptions, specs, features, FAQ |
| Content Structure | 12% | Semantic HTML, headings, accessibility |
| Authority & Trust | 13% | Reviews, ratings, certifications |
| AI Discoverability | 20% | AI crawler access, entity consistency, llms.txt |

Context multipliers apply (Want/Need/Hybrid) — not applied to SEO Quality.

#### PDP Quality (30 factors)
| Category | Weight | Focus |
|----------|--------|-------|
| Purchase Experience | 25% | Price, CTA, discounts, payments, urgency |
| Trust & Confidence | 20% | Returns, shipping, trust badges, checkout |
| Visual Presentation | 20% | Images, video, gallery, lifestyle, swatches |
| Content Completeness | 15% | Variants, size guide, Q&A, package contents |
| Reviews & Social Proof | 20% | Review prominence, stars, sorting, media |

Context multipliers apply (Want/Need/Hybrid).

#### SEO Quality (19 factors)
| Category | Weight | Focus |
|----------|--------|-------|
| Title & Meta | 25% | Title tag, meta description, product name in title |
| Technical Foundations | 25% | Indexability, canonical, product schema, JS dependency |
| Content Signals | 25% | Content length, heading structure, alt coverage, readability |
| Navigation & Discovery | 25% | Breadcrumbs, H1 alignment, internal links, hreflang |

Always context-neutral — no Want/Need/Hybrid multipliers.

### Critical Detection
These issues have outsized impact and are flagged prominently:
- `og:image` in WebP format (invisible in most LLM chat interfaces)
- Missing Product schema (LLMs can't identify page as product)
- `robots` meta with `noindex` (blocks LLM crawlers entirely)
- All major AI crawlers blocked in robots.txt

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `manifest.json` | Extension permissions, CSP, content script config |
| `src/content/content-script.js` | All extraction logic (AI, PDP, SEO) — edit here, not extractors/ |
| `src/scoring/weights.js` | All weights, multipliers, factor→recommendation mappings |
| `src/scoring/scoring-engine.js` | `calculateScore()` / `calculatePdpQualityScore()` / `calculateSeoQualityScore()` |
| `src/scoring/grading.js` | `getGradeColor()`, `getGradeBackgroundColor()`, re-exports grade helpers |
| `src/recommendations/recommendation-rules.js` | All recommendation templates (AI + PDP + SEO) |
| `src/recommendations/recommendation-engine.js` | All three recommendation engine classes |
| `src/recommendations/citation-opportunities.js` | Citation Opportunity Map + `extractProductIntelligence` export |
| `src/recommendations/citation-roadmap.js` | Content-to-Citation Roadmap (5 blocks, 3 tiers) |
| `src/sidepanel/sidepanel.js` | UI state, triple-tab rendering, history, comparison, export |
| `src/sidepanel/report-template.js` | HTML report generation (primary client deliverable) |
| `src/background/service-worker.js` | Message routing, URL safety, network fetches |
| `src/storage/storage-manager.js` | History CRUD, quota pruning |

## Common Tasks

### Adding a New AI Readiness Factor
1. Add extraction logic in `src/content/content-script.js`
   - Structured data: edit `categorizeSchemas()` (JSON-LD) and `categorizeMicrodataSchemas()` (microdata)
   - Content quality: edit relevant `extract*()` functions
   - AI discoverability: edit `extractAIDiscoverabilitySignals()` or add service worker handlers
2. Add factor weight in `src/scoring/weights.js` → `FACTOR_WEIGHTS`
3. Add scoring logic in `src/scoring/scoring-engine.js` → appropriate `score*()` method
4. If context-sensitive, add multipliers in `CONTEXT_MULTIPLIERS`
5. Add recommendation template in `src/recommendations/recommendation-rules.js` → `RECOMMENDATION_TEMPLATES`
6. Add factor→recommendation mapping in `src/scoring/weights.js` → `FACTOR_RECOMMENDATIONS`

### Adding a New PDP Quality Factor
1. Add extraction in `src/content/content-script.js` → appropriate `extract*()` within `extractPdpQualitySignals()`
2. Add factor weight in `src/scoring/weights.js` → `PDP_FACTOR_WEIGHTS`
3. Add scoring logic in `src/scoring/scoring-engine.js` → appropriate `score*()` called by `calculatePdpQualityScore()`
4. If context-sensitive, add multipliers in `PDP_CONTEXT_MULTIPLIERS`
5. Add recommendation template in `src/recommendations/recommendation-rules.js` → `PDP_RECOMMENDATION_TEMPLATES`
6. Add factor→recommendation mapping in `src/scoring/weights.js` → `PDP_FACTOR_RECOMMENDATIONS`
7. Add recommendation check in `src/recommendations/recommendation-engine.js` → `PdpQualityRecommendationEngine`

### Adding a New Category
1. Add category description in `src/scoring/weights.js` → `CATEGORY_DESCRIPTIONS`
2. Add category weight in `CATEGORY_WEIGHTS` (must sum to 1.0 — rebalance existing)
3. Add factor weights in `FACTOR_WEIGHTS.newCategory`
4. Add `scoreNewCategory()` method in `src/scoring/scoring-engine.js`
5. Update `calculateScore()` to include new category in `categoryScores` and weighted total
6. Add extraction function in `src/content/content-script.js` → include in `performFullExtraction()`
7. Add category to `categoryOrder` array in `src/sidepanel/sidepanel.js` → `renderCategories()`
8. Add recommendation templates and factor mappings

### Modifying Scoring Weights
Edit `src/scoring/weights.js`:
- AI Readiness: `CATEGORY_WEIGHTS`, `FACTOR_WEIGHTS`, `CONTEXT_MULTIPLIERS`, `FACTOR_RECOMMENDATIONS`
- PDP Quality: `PDP_CATEGORY_WEIGHTS`, `PDP_FACTOR_WEIGHTS`, `PDP_CONTEXT_MULTIPLIERS`, `PDP_FACTOR_RECOMMENDATIONS`
- Category weights must sum to 1.0 within each model

### Updating UI
- Markup: `src/sidepanel/sidepanel.html`
- Styles: `src/sidepanel/sidepanel.css`
- Logic: `src/sidepanel/sidepanel.js`
- Report: `src/sidepanel/report-template.js`

## Reference Docs

For deeper technical details, read the relevant `.claude/rules/` file:

| Topic | File |
|-------|------|
| Extraction patterns, JSON-LD quirks, Shopify gotchas, regex pitfalls | `.claude/rules/extraction-reference.md` |
| Scoring function signatures, thresholds, edge cases | `.claude/rules/scoring-reference.md` |
| Security patterns, CSP, XSS prevention, race conditions | `.claude/rules/security-patterns.md` |
| Citation Opportunity Map & Roadmap architecture, icons, branding | `.claude/rules/feature-specs.md` |
| Product strategy, privacy constraints, content generation boundary | `.claude/rules/product-strategy.md` |
| PDS operational rules | `.claude/rules/pds-protocol.md` |
