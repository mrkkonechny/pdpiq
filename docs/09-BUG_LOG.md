# Bug Log

> **PDS Document 09** | Last Updated: 2026-03-01

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
