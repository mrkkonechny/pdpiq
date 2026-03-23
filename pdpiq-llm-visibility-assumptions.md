# pdpIQ — LLM/AI Visibility Assumptions for Research Review

> Generated 2026-03-23 from scoring weights, recommendation rules, and scoring engine logic.
> Each assumption is a claim the tool makes — implicitly through point allocation, or explicitly through recommendation copy — about what improves or reduces a product page's visibility in LLM-powered systems.
>
> **Status key:** ✅ Reviewed | ⬜ Needs research | ⚠️ Partially revised (DEC-0029)

---

## How to use this document

For each assumption, the question to answer through research is:
1. Is the claim directionally correct?
2. Does evidence support the weight/priority the tool assigns to it?
3. Is the mechanism accurate (e.g. "LLMs read schema" — which LLMs, how, from where)?
4. Is there a more precise or nuanced version of the claim?

---

## Category 1: Structured Data (20% of total AI Readiness score)

### A1 — Product schema is essential for LLMs to identify a page as a product ⬜
**pdpIQ claim:** Product JSON-LD schema (30/100 pts, critical) is how LLMs identify that a page is a product with purchasable items. Without it, LLMs cannot reliably classify the page.
**Mechanism assumed:** LLM crawlers read and parse JSON-LD `<script type="application/ld+json">` blocks.
**Research question:** Do LLM crawlers actually parse JSON-LD? Does presence/absence of Product schema measurably affect citation rate or product identification accuracy in ChatGPT, Perplexity, and Google AI Overviews?

---

### A2 — Offer schema enables purchase-related LLM responses ⬜
**pdpIQ claim:** Offer schema (20/100 pts, critical) tells LLMs about pricing and availability, enabling purchase-related responses.
**Mechanism assumed:** LLMs extract price, currency, and availability from `Offer` nested in Product schema, and use this data when responding to "how much does X cost?" or "is X available?" queries.
**Research question:** Is there evidence that LLMs cite schema-sourced pricing in responses? Or do they primarily use visible page text?

---

### A3 — AggregateRating schema is how LLMs access review data ⬜
**pdpIQ claim:** AggregateRating schema (15/100 pts) is how LLMs provide review information when recommending products. Review widgets rendered via JS are "invisible to LLMs regardless of how many reviews you have."
**Mechanism assumed:** LLM crawlers read structured data, not JS-rendered review widgets.
**Research question:** Is the "schema only, not JS widgets" claim accurate for LLM crawlers? Does AggregateRating schema presence measurably affect how LLMs describe product quality?

---

### A4 — FAQ schema makes Q&A content more accessible to LLMs ⬜
**pdpIQ claim:** FAQPage schema (10/100 pts) makes product Q&A content more accessible for LLMs answering user questions.
**Mechanism assumed:** LLMs preferentially extract questions and answers from FAQPage schema over DOM text.
**Research question:** Is schema-structured FAQ content more likely to be cited than DOM FAQ content? Is FAQPage specifically valuable for LLM citation vs. general search?

---

### A5 — BreadcrumbList schema helps LLMs understand product categorisation ⬜
**pdpIQ claim:** Breadcrumb schema (5/100 pts) helps LLMs understand product categorisation and site structure.
**Mechanism assumed:** LLMs use breadcrumb hierarchy to contextualise where a product sits (e.g. Clothing > Dresses > Midi).
**Research question:** Is there evidence LLMs use breadcrumb schema specifically for categorisation context, vs. inferring it from page content or URL structure?

---

### A6 — ImageObject schema helps AI systems select appropriate product visuals ⬜
**pdpIQ claim:** ImageObject schema (5/100 pts) provides structured image metadata (dimensions, alt text, URL) that helps AI systems select and display product visuals.
**Mechanism assumed:** AI systems use ImageObject schema to choose representative images when citing or displaying products.
**Research question:** Do any LLM or AI search systems actually use ImageObject schema for image selection, or do they rely on `og:image`/`primaryImageOfPage`?

---

## Category 2: Protocol & Meta (15% of total AI Readiness score)

### A7 — og:image presence gives LLMs visual representation of the product ⬜
**pdpIQ claim:** `og:image` (20/100 pts, critical) is the visual representation LLM chats and social shares use. Missing it means no product image is shown.
**Mechanism assumed:** LLM chat interfaces and AI systems use `og:image` as the product thumbnail when citing or displaying the page.
**Research question:** Do LLM chat interfaces (ChatGPT, Claude.ai, Perplexity) actually render `og:image` in link previews or citations? Is it the primary image signal, or does `primaryImageOfPage` schema / main page image take precedence?

---

### A8 — og:image format: JPEG preferred, WebP acceptable ⚠️ Revised — DEC-0029
**pdpIQ claim (revised):** JPEG is preferred for broadest compatibility with niche link-preview clients. WebP works on all major platforms; LLM crawlers do not process image binaries at all.
**Status:** Researched and revised. Original claim ("WebP invisible in LLM chats") was incorrect. See DEC-0029.

---

### A9 — og:title is the primary LLM product name signal ⬜
**pdpIQ claim:** `og:title` (15/100 pts) is the primary signal LLMs use for the product name when crawling or displaying the page.
**Mechanism assumed:** LLM crawlers and chat interfaces use `og:title` as the canonical product name, above H1 or page `<title>`.
**Research question:** Which element takes precedence for LLM product name identification — `og:title`, `<title>`, H1, or Product schema `name`? Is the relative priority documented by any LLM platform?

---

### A10 — og:description is the primary LLM product context signal ⬜
**pdpIQ claim:** `og:description` (15/100 pts) is the primary product context signal LLMs use when crawling or referencing the page.
**Mechanism assumed:** LLMs use `og:description` as a concise product summary, above meta description or body text.
**Research question:** Is `og:description` actually preferred by LLMs over `<meta name="description">`, or are they treated equivalently? Does the distinction matter?

---

### A11 — og:type = product signals purchasability to LLMs ⬜
**pdpIQ claim:** `og:type="product"` (5/100 pts) signals to AI systems and social platforms that the page represents a purchasable product.
**Mechanism assumed:** LLMs differentiate product pages from content pages using `og:type`.
**Research question:** Do LLM crawlers actually use `og:type` for classification, or do they rely on Product schema / URL / content signals instead?

---

### A12 — Twitter Card tags improve product visibility in LLM and social contexts ⬜
**pdpIQ claim:** Twitter Card tags (15/100 pts combined) limit product visibility on Twitter/X and in LLM references when missing.
**Mechanism assumed:** LLMs and AI search tools use Twitter Card metadata as a content signal.
**Research question:** Is there any evidence that Twitter Card metadata specifically (separate from og:* tags) influences LLM behaviour? Or is this purely a social sharing signal with no LLM relevance?

---

### A13 — Canonical URL prevents LLM confusion about which URL is authoritative ⬜
**pdpIQ claim:** A valid canonical URL (10/100 pts) prevents splitting "link equity" and confuses LLMs about which URL is authoritative.
**Mechanism assumed:** LLM crawlers respect `rel=canonical` and attribute content to the canonical URL rather than variant URLs.
**Research question:** Do LLM crawlers respect canonical tags? Is there evidence that canonical misconfiguration affects LLM citation behaviour, or is this primarily a traditional SEO concern?

---

### A14 — Meta description is often the first text LLMs cite when describing a product ⬜
**pdpIQ claim:** Meta description (10/100 pts) acts as a "pre-written product pitch for AI systems" and is "often the first text LLMs cite when describing a product."
**Mechanism assumed:** LLMs extract and prefer `<meta name="description">` over body text when summarising a product.
**Research question:** Is meta description preferentially cited by LLMs, or do they construct summaries from body content? Is there a documented LLM preference for meta description text?

---

### A15 — robots meta noindex blocks LLM crawlers from accessing content ⬜
**pdpIQ claim:** `robots` meta with `noindex` (5/100 pts, critical if triggered) prevents LLMs from accessing the page's content.
**Mechanism assumed:** LLM crawlers respect `<meta name="robots" content="noindex">` the same way search crawlers do.
**Research question:** Do all major LLM crawlers (GPTBot, ClaudeBot, PerplexityBot) respect robots meta tags? Is the behaviour documented?

---

## Category 3: Content Quality (20% of total AI Readiness score)

### A16 — Description length ≥200 words is required for quality LLM recommendations ⬜
**pdpIQ claim:** Descriptions under a threshold (15/100 pts) provide "insufficient context for LLMs to make quality recommendations." 200+ words is the recommended target.
**Mechanism assumed:** LLMs need minimum word count to extract product understanding for citation.
**Research question:** Is there evidence for a minimum description length threshold that affects LLM citation quality? Or is content quality / specificity more important than word count?

---

### A17 — Description quality (benefit statements, emotional language, technical terms) affects LLM citation value ⬜
**pdpIQ claim:** Descriptions with benefit statements, emotional language, or technical terms (10/100 pts, contextual) give LLMs "richer material to cite when answering 'is this product right for me?' queries."
**Mechanism assumed:** LLMs extract and cite specific copy patterns (benefits, use cases, comparisons) more readily than generic descriptions.
**Research question:** Is there evidence that benefit-led or structured copy is preferentially cited by LLMs over generic prose? Is this a documented pattern or an assumption?

---

### A18 — Detailed specifications help LLMs answer comparison questions ⬜
**pdpIQ claim:** Specifications (10/100 pts) help LLMs answer detailed product comparison questions. A specs table with 10+ items including dimensions, materials, and compatibility is recommended.
**Mechanism assumed:** LLMs extract tabular spec data and use it for comparison queries ("which has longer battery life?").
**Research question:** Is structured spec data (in tables) more effectively extracted by LLMs than the same data in prose or bullets? Does spec count correlate with citation quality?

---

### A19 — Specifications with units are more LLM-parseable than unitless values ⬜
**pdpIQ claim:** Specification detail (5/100 pts) — the proportion of specs that include measurement units — reflects how parseable the data is for LLM extraction.
**Mechanism assumed:** "250W" is more extractable and citable than "250" for technical comparison queries.
**Research question:** Is unit presence a meaningful signal for LLM spec extraction quality, or is numerical context sufficient?

---

### A20 — Feature bullet lists help LLMs quickly identify product capabilities ⬜
**pdpIQ claim:** Feature lists (10/100 pts) in `<ul>`/`<ol>` help LLMs quickly identify product capabilities.
**Mechanism assumed:** LLMs treat structured lists as high-signal content, easier to parse than prose.
**Research question:** Is list-structured content demonstrably easier for LLMs to cite than equivalent prose? Does HTML list markup (`<ul>`) specifically matter, or is the content format (bullet-style) sufficient?

---

### A21 — FAQ content helps LLMs answer common customer questions ⬜
**pdpIQ claim:** FAQ sections (10/100 pts) help LLMs answer common customer questions about the product.
**Mechanism assumed:** LLMs preferentially surface FAQ-style content when responding to question-type queries.
**Research question:** Is FAQ content on product pages demonstrably more likely to be cited in LLM responses to question queries? Is the advantage from FAQ schema, FAQ DOM content, or both?

---

### A22 — "Best for" and comparison content is what LLMs extract for recommendation queries ⬜
**pdpIQ claim:** Answer-format content — "best for" statements, comparisons, how-to guides, use case descriptions (20/100 pts in AI Discoverability; 10/100 pts in Content Quality) — is "what LLMs cite in responses."
**Mechanism assumed:** LLMs pattern-match on conversational query formats and extract content written in the same pattern.
**Research question:** Is there evidence that "best for X" or "vs." content is preferentially extracted by LLMs? Or do LLMs synthesise this from general content regardless of explicit copy patterns?

---

### A23 — Material composition is a frequently cited product attribute in LLM responses ⬜
**pdpIQ claim:** Materials (5/100 pts) are a "frequently searched product attribute" that LLMs cite for material-specific queries (e.g. "BPA-free", "100% cotton").
**Mechanism assumed:** LLMs extract material/composition details from page text and match to material-qualifier queries.
**Research question:** Is material content specifically extracted from Product schema `material` property, or from DOM text? Is there a documented difference in citation accuracy between the two sources?

---

### A24 — Content freshness (dateModified) influences LLM recommendation priority ⬜
**pdpIQ claim:** LLMs "favour recently updated content when making recommendations." Content more than 90 days old without a schema date is penalised (5/100 pts in Authority & Trust).
**Mechanism assumed:** LLMs check `dateModified` in Product schema or structured data to assess content freshness and weight newer content more heavily.
**Research question:** Do LLM crawlers or AI search systems actually use dateModified to weight content? Is there documented evidence that content freshness affects LLM citation frequency?

---

## Category 4: Content Structure (12% of total AI Readiness score)

### A25 — H1 heading helps LLMs identify the main topic of the page ⬜
**pdpIQ claim:** An H1 (15/100 pts) makes it easier for LLMs to identify the main topic of the page. Multiple H1s "confuse content hierarchy for LLMs."
**Mechanism assumed:** LLMs use heading hierarchy as a structural signal, weighting H1 content more heavily.
**Research question:** Do LLM crawlers treat heading elements with structural significance, or do they treat all text as a flat sequence? Is H1 uniqueness a documented LLM signal or a traditional SEO assumption being applied to LLMs?

---

### A26 — Semantic HTML helps LLMs understand content structure ⬜
**pdpIQ claim:** Semantic HTML elements (`<main>`, `<article>`, `<section>`, `<nav>`) (12/100 pts) help LLMs understand content structure and importance.
**Mechanism assumed:** LLMs use semantic HTML tags to infer content hierarchy and relevance, de-weighting nav/footer text relative to `<main>` content.
**Research question:** Do LLM crawlers actually use semantic HTML for content weighting, or do they rely on schema and text content alone? Is there documentation from any LLM provider on HTML semantic parsing?

---

### A27 — Content-to-chrome ratio affects LLM confidence in page topic ⬜
**pdpIQ claim:** High proportions of navigation, sidebars, and boilerplate HTML "reduce LLM confidence in what the page is about" (8/100 pts).
**Mechanism assumed:** LLMs measure or infer the ratio of substantive product content to template/navigation content, and lower-quality signals reduce citation probability.
**Research question:** Is there evidence that content-to-chrome ratio affects LLM processing or citation? Or do LLMs use schema and semantic structure to identify relevant content regardless of surrounding chrome?

---

### A28 — Specification data in HTML tables is significantly easier for LLMs to parse than plain text ⬜
**pdpIQ claim:** HTML `<table>` with `<th>` headers and `<td>` cells is "significantly easier for LLMs to parse and cite" than plain-text spec lists (7/100 pts).
**Mechanism assumed:** LLMs have preferential parsing of tabular HTML structure for key-value data.
**Research question:** Is there evidence that `<table>` markup specifically (vs. definition lists `<dl>`, bullet lists, or JSON-LD) improves LLM extraction of specification data?

---

### A29 — Image alt text is how LLMs understand product visuals ⬜
**pdpIQ claim:** Image alt text (18/100 pts combined across primary image and overall coverage) is how LLMs "understand product visuals" and "describe images." Low coverage "limits LLM understanding of product visuals."
**Mechanism assumed:** LLM crawlers read `alt` attributes as text tokens representing image content, enabling visual product understanding without processing image binaries.
**Research question:** This was partially confirmed in the WebP research (LLM crawlers are text-only and read alt text). The remaining question: does alt text specificity (e.g. "navy slim-fit Oxford cotton shirt" vs "blue shirt" vs "product image") measurably affect LLM citation quality for visual queries?

---

### A30 — ARIA labels help AI systems understand interactive product page elements ⬜
**pdpIQ claim:** ARIA labels (3/100 pts) "help AI systems understand the purpose of interactive product page elements like image galleries and option selectors."
**Mechanism assumed:** LLM crawlers read ARIA attributes to understand interactive element purpose.
**Research question:** Do LLM crawlers (which do not execute JS) parse ARIA attributes at all? ARIA is primarily an accessibility/screen-reader standard — is there documented LLM behaviour around ARIA parsing?

---

### A31 — JS-rendered content may not be seen by LLM crawlers ⬜
**pdpIQ claim (revised):** JavaScript framework detected — some content visible here may not be present in the raw HTML that LLM crawlers index. Scores may reflect more than LLM crawlers actually see (10/100 pts).
**Mechanism assumed:** Most LLM crawlers are raw HTML parsers that do not execute JavaScript; server-side rendered content is reliably available, JS-injected content may not be.
**Research question:** Which specific LLM crawlers execute JavaScript vs. parse raw HTML only? Is this documented per-crawler? Does Shopify Liquid server-rendering mean accordion/hidden content is reliably available in the HTML source?

---

### A32 — Readability score affects LLM ability to extract citable facts ⬜
**pdpIQ claim:** Low Flesch Reading Ease scores (7/100 pts) mean "LLMs may struggle to extract clean, citable facts." Grade 8–10 reading level is recommended.
**Mechanism assumed:** LLMs process simple, short-sentence prose more accurately than complex, jargon-heavy text.
**Research question:** Is there evidence that readability score affects LLM extraction quality or citation accuracy? LLMs are trained on enormously diverse text — does sentence complexity actually degrade their extraction, or is this a human-readability assumption applied to AI?

---

## Category 5: Authority & Trust (13% of total AI Readiness score)

### A33 — Review count is a signal LLMs use when making product recommendations ⬜
**pdpIQ claim:** Review count (22/100 pts, contextual) provides "social proof that LLMs use when making recommendations." 25+ reviews = pass; 5–24 = warning; <5 = fail.
**Mechanism assumed:** LLMs extract review count from schema or page text and factor it into recommendation quality assessments.
**Research question:** Do LLMs demonstrably weight review-count in recommendations, and if so, is this from AggregateRating schema, DOM text, or both? Is the 25-review threshold evidence-based or arbitrary?

---

### A34 — Review recency signals product vitality to LLMs ⬜
**pdpIQ claim:** No reviews within 6 months signals "an inactive or declining product" to LLMs (12/100 pts). Review `datePublished` in schema enables AI crawlers to verify recency.
**Mechanism assumed:** LLMs check review dates and downweight products with only old reviews.
**Research question:** Is there evidence that LLMs assess review recency and adjust recommendations accordingly? Do LLM crawlers actually parse `datePublished` from Review schema?

---

### A35 — Longer reviews (100+ chars) are more likely to be cited by LLMs ⬜
**pdpIQ claim:** Short reviews "provide little context for LLMs to extract useful product insights." Longer reviews (100+ chars) are "more likely to be cited" (10/100 pts).
**Mechanism assumed:** LLMs prefer substantive review content for citation over short/minimal reviews.
**Research question:** Is there evidence that review length affects LLM citation frequency? Or do LLMs summarise across all reviews regardless of individual length?

---

### A36 — Awards and editorial recognition are trust signals LLMs use for premium product recommendations ⬜
**pdpIQ claim:** Awards and editorial recognition (2/100 pts) are "strong trust signals that LLMs use when recommending premium or best-in-category products." Adding award data to Product schema `award` property is recommended.
**Mechanism assumed:** LLMs extract award information from schema or page text and use it to strengthen recommendation confidence.
**Research question:** Is there evidence that awards/accolades on product pages influence LLM recommendation behaviour? Does the Product schema `award` property have any documented LLM processing?

---

### A37 — Certifications build trust that LLMs factor into recommendations ⬜
**pdpIQ claim:** Certifications (10/100 pts, contextual) "build trust that LLMs factor into recommendations."
**Mechanism assumed:** LLMs identify certification text (FDA, CE, ISO, etc.) and weight it when answering trust-sensitive queries.
**Research question:** Is there evidence that certification mentions on product pages influence LLM trust signals or recommendation behaviour? Is extraction from DOM text sufficient, or does schema markup (Product.certification) matter?

---

### A38 — Quantified social proof ("5,000+ sold") is a strong trust signal LLMs cite ⬜
**pdpIQ claim:** Sold counts and customer milestones (4/100 pts) are "strong trust signals that LLMs cite when recommending products." Numbers must be ≥3 digits.
**Mechanism assumed:** LLMs extract and cite quantified social proof figures when answering recommendation queries.
**Research question:** Is there evidence that LLMs specifically extract and cite sold-count figures from product pages? Is this a documented pattern or an assumption based on human persuasion psychology?

---

### A39 — Expert endorsements are picked up by AI systems assessing trustworthiness ⬜
**pdpIQ claim:** Expert attributions ("clinically tested", "dermatologist approved") (3/100 pts) "increase credibility and are picked up by AI systems assessing trustworthiness."
**Mechanism assumed:** LLMs identify expert-endorsement phrases and weight them in trust assessment for recommendation queries.
**Research question:** Is there documented evidence that LLMs detect and act on expert attribution language? Or is this primarily a human persuasion signal with uncertain LLM impact?

---

## Category 6: AI Discoverability (20% of total AI Readiness score)

### A40 — robots.txt blocks prevent LLM crawlers from indexing product content ⬜
**pdpIQ claim:** AI crawler Disallow rules in robots.txt (30/100 pts, critical) prevent AI systems from "discovering and citing" product content.
**Mechanism assumed:** LLM crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.) respect robots.txt Disallow directives before crawling.
**Research question:** Do all major LLM crawlers reliably respect robots.txt? Is compliance documented per crawler? Are there differences between training crawlers vs. retrieval crawlers (e.g., ChatGPT Search vs. GPTBot for training)?

---

### A41 — Entity consistency across schema, H1, og:title, and meta description verifies product identity to LLMs ⬜
**pdpIQ claim:** Product name alignment across schema name, H1, og:title, and meta description (25/100 pts) is how "LLMs cross-reference these elements to verify entity identity."
**Mechanism assumed:** LLMs compare product name across multiple page locations to establish confidence in entity identity before citation.
**Research question:** Is cross-element entity consistency a documented LLM behaviour, or is this an inference? Which element takes precedence when names differ?

---

### A42 — llms.txt is an emerging standard that helps AI systems understand site content ⬜
**pdpIQ claim:** `/llms.txt` (10/100 pts) is "an emerging standard that helps AI systems understand how to interact with your site and what content is available."
**Mechanism assumed:** LLM crawlers check for and parse `/llms.txt` during site discovery.
**Research question:** How widely is llms.txt actually adopted and respected by LLM crawlers as of early 2026? Is there documented crawler behaviour for llms.txt from OpenAI, Anthropic, Google, or Perplexity? What is the actual crawl/parse rate?

---

### A43 — Product identifiers (GTIN/MPN) in schema help LLMs disambiguate products ⬜
**pdpIQ claim:** GTIN, MPN, and SKU in Product schema (15/100 pts) help LLMs "disambiguate products and match them to purchase queries."
**Mechanism assumed:** LLMs use standard product identifiers to confidently identify specific products across multiple sources and match to retailer inventory.
**Research question:** Is there evidence that product identifiers in schema influence LLM product disambiguation or recommendation accuracy? Is this a Google Shopping / Merchant Center mechanism that has been extrapolated to general LLMs?

---

## Context Multiplier Assumptions

### A44 — "Want" vs "Need" context meaningfully changes what LLMs extract and cite ⬜
**pdpIQ claim:** Consumer purchase intent (Want/Need/Hybrid) changes the relative importance of factors: emotional content and social proof matter more for Want; specs, compatibility, and certifications matter more for Need. Multipliers range from 0.4× to 2.0×.
**Mechanism assumed:** LLMs respond differently to product page content depending on the query intent of the user, and pages optimised for that intent are more likely to be cited.
**Research question:** Is there evidence that LLMs weight product page content differently based on inferred query intent? Or does query intent primarily operate at the LLM response layer, independent of what's on the product page?

---

## Cross-cutting Assumptions

### A45 — Schema markup is more reliably read by LLMs than DOM content ⬜
**pdpIQ claim (implicit):** Throughout the tool, schema-backed signals are scored separately from and generally more highly than DOM content. The assumption is that schema is the "gold standard" for LLM machine-readability.
**Mechanism assumed:** JSON-LD in `<script type="application/ld+json">` is always present in raw HTML and is parsed with higher reliability by LLM crawlers than DOM text.
**Research question:** Is schema markup demonstrably more reliably read by LLM crawlers than server-rendered DOM content? Is there a documented processing hierarchy?

---

### A46 — Google AI Overviews and conversational LLMs (ChatGPT, Perplexity) respond to the same signals ⬜
**pdpIQ claim (implicit):** The tool produces a single AI Readiness score applied uniformly to all AI/LLM systems. The recommendations use "LLMs" and "AI systems" interchangeably across Google AI Overviews, ChatGPT Search, Perplexity, and Claude.
**Mechanism assumed:** A single set of optimisation signals improves visibility across all LLM-powered systems.
**Research question:** Do Google AI Overviews, ChatGPT Search, Perplexity, and native LLM responses (non-search) actually respond to the same signals? Are there meaningful differences in what each system extracts and cites from product pages?

---

*Total assumptions: 46 across 6 categories + context and cross-cutting.*
*Priority research candidates based on point weight and claim strength: A1, A3, A7, A9, A10, A16, A22, A33, A40, A46.*
