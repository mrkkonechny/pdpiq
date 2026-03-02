# Bug Log

> **PDS Document 09** | Last Updated: 2026-03-02

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

_No active bugs._

## Resolved Bugs

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
