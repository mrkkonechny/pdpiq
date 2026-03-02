# Changelog

> **PDS Document 10** | Last Updated: 2026-03-01

All notable changes to this project. Format follows [Keep a Changelog](https://keepachangelog.com/). Most recent version at the top.

## [Unreleased]

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
