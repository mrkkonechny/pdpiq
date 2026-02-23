# pdpIQ Product Page — Marketing Handoff Document

**Prepared for:** Tribbute Marketing Team
**Page URL:** `tribbute.com/products/pdpiq/`
**Date:** February 2026
**Version:** 1.0

This document contains everything needed to build and publish the pdpIQ product page on the Tribbute website: page copy, SEO elements, structured data, product positioning, and supporting content strategy. Sections are organized in implementation order.

---

## Table of Contents

1. [SEO & Meta Tags](#1-seo--meta-tags)
2. [Structured Data (JSON-LD)](#2-structured-data-json-ld)
3. [Page Copy](#3-page-copy)
4. [Feature Highlights](#4-feature-highlights)
5. [How It Works](#5-how-it-works)
6. [Comparison Table](#6-pdpiq-vs-traditional-seo-tools)
7. [Social Proof & Trust](#7-social-proof--trust)
8. [Use Cases](#8-use-cases)
9. [FAQ Section](#9-faq-section)
10. [Microcopy & UI Text](#10-microcopy--ui-text)
11. [Keyword Strategy](#11-keyword-strategy)
12. [Internal Linking Strategy](#12-internal-linking-strategy)
13. [Content Marketing Roadmap](#13-content-marketing-roadmap)
14. [Product Positioning Reference](#14-product-positioning-reference)
15. [Key Metrics Reference](#15-key-metrics-reference)
16. [Pricing & CTA Strategy](#16-pricing--cta-strategy)

---

## 1. SEO & Meta Tags

### Page Title Tag
```
pdpIQ - AI Citation Readiness Scorer for Product Pages
```
*(55 characters)*

### Meta Description
```
Analyze your eCommerce product pages for AI search visibility. pdpIQ scores 75+ factors across 6 categories and gives actionable fixes. Try it free.
```
*(150 characters)*

### H1 Tag
```
pdpIQ: Score Your Product Pages for AI Citation Readiness
```

### Open Graph Tags
```html
<meta property="og:title" content="pdpIQ - AI Citation Readiness Scorer for eCommerce Product Pages">
<meta property="og:description" content="Free Chrome extension that scores your product pages across 75+ factors for AI search visibility. Get actionable recommendations to improve how ChatGPT, Perplexity, and Claude cite your products.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://tribbute.com/products/pdpiq/">
<meta property="og:image" content="https://tribbute.com/images/pdpiq-og-card.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:site_name" content="Tribbute">
```

> **Design note:** The og:image should be PNG or JPEG format (never WebP). Use a 1200x630 screenshot showing the extension in action with a product page score, letter grade, and Tribbute branding. This is one of the critical issues pdpIQ itself flags -- practice what we preach.

### Twitter/X Card Tags
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="pdpIQ - AI Citation Readiness Scorer for Product Pages">
<meta name="twitter:description" content="Free Chrome extension that scores 75+ factors across 6 categories. See how ChatGPT, Perplexity, and Claude read your product pages.">
<meta name="twitter:image" content="https://tribbute.com/images/pdpiq-twitter-card.png">
```

### Canonical Tag
```html
<link rel="canonical" href="https://tribbute.com/products/pdpiq/">
```

---

## 2. Structured Data (JSON-LD)

Place all three schema blocks in the `<head>` of the page.

### SoftwareApplication Schema

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "pdpIQ",
  "alternateName": "pdpIQ - AI Citation Readiness Scorer",
  "description": "Chrome extension that analyzes eCommerce product pages for AI citation readiness. Scores 75+ factors across 6 categories — structured data, protocol and meta compliance, content quality, content structure, authority and trust, and AI discoverability — and provides actionable recommendations to improve how AI systems like ChatGPT, Perplexity, Claude, and Gemini discover and cite your products.",
  "applicationCategory": "BrowserExtension",
  "applicationSubCategory": "SEO Tool",
  "operatingSystem": "Chrome",
  "browserRequirements": "Google Chrome with Manifest V3 extension support",
  "softwareVersion": "1.1.0",
  "url": "https://tribbute.com/products/pdpiq/",
  "downloadUrl": "https://chromewebstore.google.com/detail/pdpiq/EXTENSION_ID_HERE",
  "screenshot": "https://tribbute.com/images/pdpiq-screenshot.png",
  "featureList": [
    "Scores 75+ factors across 6 categories for AI citation readiness",
    "Context-sensitive scoring for Want, Need, and Hybrid purchase types",
    "JSON-LD and microdata structured data analysis",
    "Open Graph and Twitter Card meta tag validation",
    "AI crawler access checking via robots.txt parsing",
    "Entity consistency analysis across schema, H1, og:title, and meta description",
    "llms.txt and llms-full.txt detection",
    "Product identifier (GTIN, UPC, MPN) verification",
    "og:image format validation with WebP detection",
    "Exportable HTML reports and JSON analysis data",
    "Analysis history with side-by-side comparison",
    "Inline actionable recommendations per factor",
    "Privacy-first: all analysis runs locally in the browser"
  ],
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "Tribbute",
      "url": "https://tribbute.com"
    }
  },
  "brand": {
    "@type": "Organization",
    "name": "Tribbute",
    "url": "https://tribbute.com"
  },
  "creator": {
    "@type": "Organization",
    "name": "Tribbute",
    "url": "https://tribbute.com"
  },
  "permissions": "Requires activeTab, sidePanel, storage, and host permissions to analyze product pages on any eCommerce domain."
}
```

> **Note:** Replace `EXTENSION_ID_HERE` with the actual Chrome Web Store extension ID once published. An `aggregateRating` block can be added once real reviews exist -- do not use placeholder ratings.

### BreadcrumbList Schema

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://tribbute.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Products",
      "item": "https://tribbute.com/products/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "pdpIQ",
      "item": "https://tribbute.com/products/pdpiq/"
    }
  ]
}
```

### FAQPage Schema

See [Section 9: FAQ Section](#9-faq-section) for the full FAQPage JSON-LD with 6 Q&As.

---

## 3. Page Copy

### Hero Section

**Headline:**
> Your Product Pages Are Invisible to AI

**Subheadline:**
> pdpIQ scores your eCommerce product pages across 75+ factors that determine whether AI assistants like ChatGPT, Claude, Perplexity, and Gemini can find, understand, and recommend your products. Get a clear grade, pinpoint what's broken, and fix it -- before your competitors do.

**Primary CTA:** `Add to Chrome -- Free`

**Secondary CTA:** `See How It Works`

---

### Problem Statement

**The way consumers discover products has fundamentally changed.** Millions of shoppers now ask AI assistants -- ChatGPT, Claude, Perplexity, Gemini -- questions like "What's the best waterproof jacket under $200?" or "Which blender works for smoothies and soups?" If your product pages aren't structured for these systems to parse, your products don't get mentioned. Period.

**Traditional SEO won't save you here.** Ranking on page one of Google doesn't mean ChatGPT will cite your product. AI assistants pull from structured data, schema markup, entity consistency, and content patterns that most eCommerce pages get wrong -- or ignore entirely. The gap between "indexed by Google" and "cited by AI" is massive, and it's growing every month.

**The brands that move first will own this channel.** AI-driven product discovery isn't a future trend -- it's happening now. Every day your product pages stay unoptimized is a day your competitors could be claiming the recommendations that should be yours. The question isn't whether to optimize for AI citation. It's how fast you can start.

---

## 4. Feature Highlights

*One block per scoring category. Each should be a visual card or section on the page.*

### Structured Data Analysis (20% of Score)
**Can AI actually read your product data?**

pdpIQ audits your JSON-LD and schema.org markup -- the machine-readable layer that tells AI assistants this is a product, what it costs, who makes it, and what customers think. We check for Product, Offer, AggregateRating, Review, FAQ, Breadcrumb, Organization, and ImageObject schemas. If your structured data is missing or incomplete, AI assistants have to guess -- and they usually guess wrong, or skip you entirely.

### Protocol & Meta Compliance (15% of Score)
**Will your product show up -- or show up broken?**

When an AI assistant cites your product in a chat, Open Graph and Twitter Card tags control how it looks. pdpIQ catches the issues that make your products invisible: WebP images that don't render in LLM chat interfaces, missing og:image tags that leave blank previews, noindex directives that block crawlers entirely, and canonical URL mismatches that confuse AI systems about which page is authoritative.

### Content Quality (20% of Score)
**Is your content rich enough for AI to cite?**

AI assistants don't just need to find your product -- they need enough substance to recommend it with confidence. pdpIQ evaluates description depth, specification detail, feature completeness, FAQ coverage, comparison content, warranty information, materials, and compatibility data. We score differently based on purchase context: technical specs matter more for functional purchases; benefit-driven copy matters more for lifestyle purchases.

### Content Structure (12% of Score)
**Can AI parse your page -- or just see a wall of noise?**

Semantic HTML, proper heading hierarchy, alt text coverage, table structure, and content-to-chrome ratio all affect how cleanly AI systems extract information from your page. pdpIQ also flags high JavaScript dependency -- a critical issue because most AI crawlers don't execute JavaScript, meaning your React or Vue-rendered content may be completely invisible to them.

### Authority & Trust Signals (13% of Score)
**Would an AI assistant stake its reputation on your product?**

AI systems weigh credibility before recommending. pdpIQ audits review count, rating quality, review recency and depth, brand clarity, certifications, awards, expert attribution, and quantified social proof. A product page with 500 verified reviews and a 4.6-star rating gets cited. A product page with 3 reviews from 2021 gets ignored.

### AI Discoverability (20% of Score)
**Are you even letting AI in the door?**

The most overlooked category. pdpIQ checks whether GPTBot, ClaudeBot, PerplexityBot, and other major AI crawlers are blocked in your robots.txt. We verify entity consistency -- whether your product name aligns across schema, H1, og:title, and meta description. We look for answer-format content ("best for" statements, comparisons, how-to guides) that AI assistants directly extract and cite. We check for product identifiers (GTIN/UPC/MPN) and llms.txt files. Most eCommerce sites fail this category without knowing it.

---

## 5. How It Works

**Step 1: Navigate to Any Product Page**
Open any eCommerce product page in Chrome -- your own site, a competitor's, a marketplace listing. pdpIQ works on every platform including Shopify, BigCommerce, WooCommerce, and custom builds.

**Step 2: Choose Your Purchase Context**
Select "Want" (emotional, lifestyle purchases), "Need" (functional, spec-driven purchases), or "Hybrid" (balanced). This adjusts scoring weights so results reflect how real shoppers -- and the AI assistants they use -- evaluate the page.

**Step 3: Run the Analysis**
One click. pdpIQ scans the page across 6 categories and 75+ individual factors in seconds. No data leaves your browser. No accounts, no API keys, no setup.

**Step 4: Fix What Matters Most**
Get a clear A-F grade, a category-by-category breakdown, and prioritized recommendations ranked by impact and effort. Each fix includes implementation guidance so your team can act immediately.

---

## 6. pdpIQ vs. Traditional SEO Tools

*Comparison table for the page.*

| What You're Evaluating | Traditional SEO Tools | pdpIQ |
|---|---|---|
| **AI crawler access** | Don't check. Focus on Googlebot only. | Audits robots.txt for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, and 10+ more AI crawlers. |
| **og:image format for LLM chats** | Check if og:image exists, nothing more. | Detects WebP images that render as broken/invisible in ChatGPT, Claude, and Perplexity chat interfaces. Verifies actual server response, not just the URL extension. |
| **Structured data completeness** | Basic schema validation (syntax). | Scores Product schema field-by-field: name, description, image, offers, brand, identifiers, rating. Handles Shopify ProductGroup, @id references, microdata, and nested schemas. |
| **Answer-format content** | Not evaluated. | Detects "best for" statements, comparison language, how-to content, and use case descriptions -- the exact patterns AI assistants extract when answering product queries. |
| **Purchase context scoring** | One-size-fits-all. | Adjusts factor weights based on purchase intent: "Want" (emotional), "Need" (functional), or "Hybrid." The same page scores differently depending on how consumers actually shop for that product. |
| **Entity consistency** | Check title tags and meta descriptions. | Cross-references product name across Product schema, H1, og:title, page title, and meta description to ensure AI systems can confidently identify the product entity. |
| **llms.txt and AI protocols** | Not on the radar. | Checks for /llms.txt and /llms-full.txt -- the emerging standard for communicating with AI systems about your site's content and permissions. |

---

## 7. Social Proof & Trust

### Testimonial Placeholders

> "[Testimonial quote from eCommerce manager about discovering issues they didn't know existed.]"
> -- **[Name], [Title] at [Brand]**

> "[Testimonial quote from SEO professional about the AI-specific insights no other tool provides.]"
> -- **[Name], [Title] at [Agency/Brand]**

> "[Testimonial quote from digital merchandiser about the speed and actionability of recommendations.]"
> -- **[Name], [Title] at [Brand]**

### Trust Badges

**Privacy-First Architecture** -- All analysis runs entirely in your browser. No data is ever sent to our servers, third-party analytics, or anyone else. Zero telemetry. Zero tracking. Your competitive intelligence stays yours.

**No Account Required** -- Install and start analyzing immediately. No sign-ups, no API keys, no credit cards, no trial expirations.

**No Data Collection** -- pdpIQ makes network requests only to the site you're analyzing (robots.txt, image format verification, llms.txt checks). Nothing else. Read the full privacy policy -- it's refreshingly short.

**Works on Every eCommerce Platform** -- Shopify, BigCommerce, WooCommerce, Magento, custom builds, marketplaces. If it's a product page in Chrome, pdpIQ can analyze it.

### Built by Tribbute

pdpIQ is built by Tribbute, a team that lives at the intersection of eCommerce performance and AI. We built this tool because we saw the same problem across every brand we worked with: product pages optimized for yesterday's search engines, blind to tomorrow's AI-powered discovery. pdpIQ is the tool we wished existed -- so we built it.

---

## 8. Use Cases

### Use Case 1: DTC Brand SEO Manager

**Persona:** Sarah, SEO Manager at a DTC skincare brand (50-200 SKUs, Shopify Plus)

**Situation:** Sarah's brand has invested heavily in traditional SEO but has noticed that ChatGPT and Perplexity consistently recommend competitor products when consumers ask "best vitamin C serum for sensitive skin." She suspects her product pages aren't structured for AI citation but doesn't know where to start.

**How pdpIQ helps:** Sarah installs pdpIQ, navigates to her top-selling vitamin C serum PDP, selects "Want" context (emotional/lifestyle purchase), and runs the analysis. She gets a C grade (68/100). The tool surfaces three critical issues: (1) her og:image is WebP format (invisible in ChatGPT conversations), (2) her robots.txt blocks ClaudeBot and PerplexityBot, and (3) her product description lacks "best for" statements and use-case language. Recommendations are ranked by impact and effort, with the robots.txt and og:image fixes flagged as high-impact quick wins.

**Outcome:** Sarah fixes the robots.txt and og:image issues in under 2 hours, then briefs her content team on adding answer-format language. On re-analysis a week later, her score jumps to 84 (B grade). Within 6 weeks, she begins seeing her product cited in Perplexity and ChatGPT responses for relevant queries.

---

### Use Case 2: Digital Shelf Analyst at a CPG Manufacturer

**Persona:** James, Digital Shelf Analyst at a mid-market consumer electronics manufacturer selling through Amazon, Best Buy, and their own D2C site.

**Situation:** James manages 500+ product pages across multiple retailers and his own site. His VP of eCommerce has asked him to audit "AI readiness" across the catalog but has no framework for what that means or how to measure it.

**How pdpIQ helps:** James uses pdpIQ to analyze a representative sample of 20 PDPs across product categories, selecting "Need" context for technical products and "Hybrid" for lifestyle accessories. He exports both JSON data and HTML reports for each. The JSON exports feed into an internal spreadsheet that ranks SKUs by AI readiness score. The HTML reports become the basis for a presentation to his VP, showing concrete before/after opportunities.

**Outcome:** James delivers a prioritized remediation roadmap organized by effort level. His team fixes all high-impact / low-effort issues across the top 50 SKUs within two sprints, establishing a repeatable process for the remaining catalog.

---

### Use Case 3: Shopify Theme Developer

**Persona:** Priya, a Shopify theme developer who builds custom themes for boutique eCommerce brands.

**Situation:** Priya's clients are increasingly asking about "AI optimization" but have no way to validate that her themes produce AI-friendly markup. She needs a QA tool she can run against theme output on staging sites before client launch.

**How pdpIQ helps:** Priya runs pdpIQ against her theme's product page template populated with sample data. The tool's Shopify-aware extraction correctly handles her ProductGroup JSON-LD, @id references for AggregateRating, and variant-level GTIN extraction. She identifies that her theme outputs og:image in WebP (via Shopify's CDN auto-conversion), her breadcrumb schema uses standalone ListItem elements instead of a BreadcrumbList, and her feature bullets are being contaminated by nav menu items.

**Outcome:** Priya fixes the theme template once and the improvement flows to all client stores. She adds "AI Citation Ready -- verified by pdpIQ" to her theme marketing, differentiating her themes in the Shopify ecosystem.

---

### Use Case 4: eCommerce Agency Strategist

**Persona:** Marcus, a strategist at a digital commerce agency serving 15-20 mid-market retail clients.

**Situation:** Marcus needs to include an "AI readiness" section in his agency's quarterly business reviews (QBRs) for each client. He needs a tool that produces exportable, branded reports and enables cross-client benchmarking.

**How pdpIQ helps:** Marcus runs pdpIQ on each client's top PDP and exports the HTML report for inclusion in the QBR deck. The side-by-side comparison feature lets him benchmark a client's product page against a competitor in the same category. The priority matrix gives him a clear "what to fix next" section for each client's action plan. Because the tool runs entirely in-browser with no data transmission, he can analyze competitor pages without any privacy or contractual concerns.

**Outcome:** Marcus's agency differentiates its services by being the first in its competitive set to offer structured AI readiness auditing. The tool's output becomes a recurring deliverable that drives ongoing optimization retainers.

---

### Use Case 5: Marketplace Product Content Manager

**Persona:** Lisa, Product Content Manager at a brand selling on their own D2C site plus Amazon, Walmart, and Target marketplaces.

**Situation:** Lisa's content team writes product descriptions, specs, and FAQ content but has no feedback loop on whether the content is structured in a way that AI systems can parse and cite. They often copy-paste the same description across platforms without understanding that each platform's markup varies.

**How pdpIQ helps:** Lisa runs pdpIQ on her brand's D2C product page and sees a strong B grade for content quality but discovers the FAQ content exists only in the DOM and lacks FAQPage schema markup. She also discovers that her specifications lack measurement units (the "Specification Detail" factor flags that only 10% of specs have units). On the trust signals side, the tool reveals that her review dates are not in structured Review schema, so "Review Recency" fails even though recent reviews exist on the page.

**Outcome:** Lisa creates a content optimization checklist derived from pdpIQ's factor list that her team applies to every new product launch. The checklist ensures consistent schema markup, answer-format content patterns, and proper unit labeling across all product content.

---

## 9. FAQ Section

*Display these on the page as an accordion/expandable FAQ. The JSON-LD below should be placed in the `<head>` alongside the other schema blocks.*

### Q1: What is AI citation readiness for eCommerce product pages?

AI citation readiness measures how well an eCommerce product page is optimized for discovery and citation by AI systems like ChatGPT, Perplexity, Claude, and Gemini. It encompasses structured data markup (JSON-LD Product schema), meta tag compliance (Open Graph, Twitter Cards), content quality (descriptions, specs, FAQs), content structure (semantic HTML, heading hierarchy), authority signals (reviews, ratings, brand clarity), and AI discoverability factors (robots.txt crawler access, entity consistency, llms.txt presence, and product identifiers like GTIN and MPN). Pages with higher AI citation readiness are more likely to be accurately understood, referenced, and recommended by AI-powered search and conversational tools.

### Q2: How does pdpIQ score product pages?

pdpIQ evaluates over 75 individual factors across six weighted categories: Structured Data (20%), Protocol and Meta Compliance (15%), Content Quality (20%), Content Structure (12%), Authority and Trust (13%), and AI Discoverability (20%). Each factor is scored and weighted, then combined into an overall score from 0 to 100 with a letter grade from A to F. The scoring is context-sensitive -- you can select Want (emotional purchases), Need (functional purchases), or Hybrid mode, which adjusts factor weights to match how consumers actually research that type of product. For example, Need mode boosts the importance of technical specifications and certifications, while Want mode emphasizes social proof and benefit statements.

### Q3: What AI crawlers and search systems does pdpIQ check for?

pdpIQ checks your site's robots.txt for access rules covering all major AI crawlers: OpenAI's GPTBot, ChatGPT-User, and OAI-SearchBot; Anthropic's ClaudeBot, Claude-Web, and Anthropic-AI; PerplexityBot; Google-Extended (Gemini); Applebot-Extended; Meta-ExternalAgent; ByteDance's Bytespider; Cohere-AI; YouBot; Amazonbot; and CCBot (Common Crawl, used for model training). It also checks for the presence of llms.txt and llms-full.txt files, which provide structured guidance specifically for large language models visiting your site.

### Q4: Does pdpIQ collect or transmit any user data?

No. pdpIQ runs entirely within your browser. All page analysis is performed locally -- no data is sent to Tribbute servers, analytics services, or any third party. The only network requests pdpIQ makes are to the site you are actively analyzing: an HTTP HEAD request to verify og:image format, a GET request to read robots.txt, and HEAD requests to check for llms.txt and llms-full.txt files. Analysis history is stored locally in Chrome's built-in extension storage and never leaves your device.

### Q5: Why does pdpIQ flag og:image in WebP format as a critical issue?

pdpIQ flags WebP og:image as a critical issue because WebP images are invisible in most LLM chat interfaces. When an AI system like ChatGPT or Perplexity cites your product and includes the og:image in its response, a WebP image will fail to render for many users, resulting in a broken or missing product image in the AI's answer. This significantly reduces the visual impact and credibility of the citation. pdpIQ recommends using JPEG or PNG format for og:image tags to ensure your product images display correctly when AI systems reference your pages.

### Q6: Can I use pdpIQ on Shopify, WooCommerce, and other eCommerce platforms?

Yes. pdpIQ works on any eCommerce product page regardless of platform. It is designed to handle platform-specific patterns including Shopify's use of ProductGroup schema (instead of Product), WooCommerce's microdata markup, and various theme-specific CSS class naming conventions. The extension supports JSON-LD, Microdata, and RDFa structured data formats, and its content extraction uses multi-layered fallback logic (DOM selectors followed by schema fallback) to ensure accurate analysis even on sites with dynamic rendering or non-standard markup. pdpIQ also detects JavaScript-rendered single-page applications and warns when scores may be understated due to client-side rendering.

### FAQPage JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is AI citation readiness for eCommerce product pages?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "AI citation readiness measures how well an eCommerce product page is optimized for discovery and citation by AI systems like ChatGPT, Perplexity, Claude, and Gemini. It encompasses structured data markup (JSON-LD Product schema), meta tag compliance (Open Graph, Twitter Cards), content quality (descriptions, specs, FAQs), content structure (semantic HTML, heading hierarchy), authority signals (reviews, ratings, brand clarity), and AI discoverability factors (robots.txt crawler access, entity consistency, llms.txt presence, and product identifiers like GTIN and MPN). Pages with higher AI citation readiness are more likely to be accurately understood, referenced, and recommended by AI-powered search and conversational tools."
      }
    },
    {
      "@type": "Question",
      "name": "How does pdpIQ score product pages?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "pdpIQ evaluates over 75 individual factors across six weighted categories: Structured Data (20%), Protocol and Meta Compliance (15%), Content Quality (20%), Content Structure (12%), Authority and Trust (13%), and AI Discoverability (20%). Each factor is scored and weighted, then combined into an overall score from 0 to 100 with a letter grade from A to F. The scoring is context-sensitive — you can select Want (emotional purchases), Need (functional purchases), or Hybrid mode, which adjusts factor weights to match how consumers actually research that type of product."
      }
    },
    {
      "@type": "Question",
      "name": "What AI crawlers and search systems does pdpIQ check for?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "pdpIQ checks your site's robots.txt for access rules covering all major AI crawlers: OpenAI's GPTBot, ChatGPT-User, and OAI-SearchBot; Anthropic's ClaudeBot, Claude-Web, and Anthropic-AI; PerplexityBot; Google-Extended (Gemini); Applebot-Extended; Meta-ExternalAgent; ByteDance's Bytespider; Cohere-AI; YouBot; Amazonbot; and CCBot (Common Crawl). It also checks for llms.txt and llms-full.txt files."
      }
    },
    {
      "@type": "Question",
      "name": "Does pdpIQ collect or transmit any user data?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. pdpIQ runs entirely within your browser. All page analysis is performed locally — no data is sent to Tribbute servers, analytics services, or any third party. The only network requests pdpIQ makes are to the site you are actively analyzing. Analysis history is stored locally in Chrome's extension storage and never leaves your device."
      }
    },
    {
      "@type": "Question",
      "name": "Why does pdpIQ flag og:image in WebP format as a critical issue?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "WebP images are invisible in most LLM chat interfaces. When an AI system like ChatGPT or Perplexity cites your product and includes the og:image in its response, a WebP image will fail to render, resulting in a broken or missing product image. pdpIQ recommends using JPEG or PNG format for og:image tags to ensure your product images display correctly when AI systems reference your pages."
      }
    },
    {
      "@type": "Question",
      "name": "Can I use pdpIQ on Shopify, WooCommerce, and other eCommerce platforms?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. pdpIQ works on any eCommerce product page regardless of platform. It handles Shopify's ProductGroup schema, WooCommerce's microdata markup, and various theme-specific patterns. The extension supports JSON-LD, Microdata, and RDFa formats, and uses multi-layered fallback logic to ensure accurate analysis even on sites with dynamic rendering or non-standard markup."
      }
    }
  ]
}
```

---

## 10. Microcopy & UI Text

### Button Labels
| Placement | Text |
|-----------|------|
| Primary install CTA (hero) | Add to Chrome -- Free |
| Secondary install CTA | Install pdpIQ |
| Demo/scroll CTA | See How It Works |
| Comparison scroll CTA | Compare to SEO Tools |
| Privacy link | Read Our Privacy Policy |
| Final CTA | Add pdpIQ to Chrome -- Free |

### Badge Text
- "100% Free"
- "No Account Needed"
- "Zero Data Collection"
- "Works on Any eCommerce Site"
- "75+ AI Readiness Factors"
- "Built by Tribbute"

### Tooltip / Hover Text
| Element | Tooltip |
|---------|---------|
| "Want" context | Scores for emotional, lifestyle-driven purchases -- boosts social proof, benefits, and reviews |
| "Need" context | Scores for functional, spec-driven purchases -- boosts technical specs, certifications, and compatibility |
| "Hybrid" context | Balanced scoring for products that blend emotional and functional purchase drivers |
| Grade badge | A (90-100), B (80-89), C (70-79), D (60-69), F (below 60) |
| "Critical" flag | This issue has outsized impact on AI citation readiness |
| Privacy badge | All analysis runs locally in your browser. No data sent to any server. |

---

## 11. Keyword Strategy

### Primary Keywords

| Keyword | Search Intent |
|---------|--------------|
| AI citation readiness | Informational / Commercial |
| product page AI optimization | Commercial Investigation |
| structured data scoring tool | Commercial Investigation |
| eCommerce SEO for AI search | Informational / Commercial |
| AI search visibility checker | Commercial Investigation |
| product schema analyzer | Commercial / Transactional |
| LLM product page optimization | Informational |
| PDP optimization tool | Commercial Investigation |

### Secondary / Long-tail Keywords

| Keyword Phrase | Intent |
|---------------|--------|
| how to optimize product pages for ChatGPT | Informational |
| does my product page show up in AI search | Informational |
| product page structured data checker chrome extension | Commercial |
| og:image WebP problem AI search | Informational / Problem-aware |
| robots.txt AI crawler access tool | Commercial |
| JSON-LD Product schema validator for eCommerce | Commercial |
| how to get products cited by Perplexity | Informational |
| AI discoverability score for eCommerce | Informational / Commercial |
| eCommerce product page audit for LLMs | Commercial |
| llms.txt checker tool | Commercial |
| optimize product descriptions for AI answers | Informational |
| Shopify product page AI readiness | Commercial (platform-specific) |

---

## 12. Internal Linking Strategy

### Pages That Should Link TO `/products/pdpiq/`

| Source Page | Anchor Text |
|------------|-------------|
| Homepage | "Analyze your PDPs for AI readiness with pdpIQ" |
| Blog posts about AI search/SEO | "Use pdpIQ to audit your product pages" |
| Resources landing page | "pdpIQ -- AI Citation Readiness Scorer" |
| About page | "Our tools, including pdpIQ" |
| Site-wide navigation | "pdpIQ" under Products menu |

### Pages That `/products/pdpiq/` Should Link TO

| Destination | Anchor Text | Placement |
|-------------|-------------|-----------|
| AI citation readiness guide (create) | "Learn more about AI citation readiness" | Below fold, after features |
| About / Company page | "Built by Tribbute" | Trust section |
| Contact page | "Questions? Contact us" | Bottom CTA |
| Chrome Web Store listing | "Install pdpIQ from the Chrome Web Store" | Primary CTA |
| Privacy policy | "Privacy Policy" | Footer + trust badges |

### Supplementary Landing Pages to Consider

| Page | URL |
|------|-----|
| How it works (detailed) | `/products/pdpiq/how-it-works/` |
| AI citation readiness guide | `/resources/ai-citation-readiness-guide/` |
| Scoring methodology | `/products/pdpiq/scoring-methodology/` |
| Changelog | `/products/pdpiq/changelog/` |

---

## 13. Content Marketing Roadmap

Blog topics that should interlink with the pdpIQ product page, in recommended publication order:

1. **"The eCommerce Manager's Guide to AI Citation Readiness"** -- Pillar content. Publish first. Hub for spoke articles.
2. **"Why Your og:image Format Matters for AI Search"** -- Targets the WebP problem. Highly shareable.
3. **"robots.txt for AI Crawlers: What eCommerce Sites Need to Know"** -- Targets AI crawler access.
4. **"How to Add JSON-LD Product Schema to Your Shopify Store"** -- Targets Shopify users (largest platform segment).
5. **"What is llms.txt and Why Your eCommerce Site Needs One"** -- Targets emerging standard, thought leadership.
6. **"Entity Consistency: The Hidden Factor in AI Product Citations"** -- Differentiating thought leadership.

**Strategy:** Publish the pillar guide first, then link all supporting articles back to both the guide and the pdpIQ product page in a hub-and-spoke model.

---

## 14. Product Positioning Reference

*Internal reference for consistent messaging across all channels.*

### Positioning Statement

For eCommerce merchandisers, SEO managers, and digital shelf teams who need to ensure product pages are discoverable and citable by AI systems like ChatGPT, Perplexity, Claude, and Gemini, **pdpIQ** is a Chrome-based product page intelligence tool that scores AI citation readiness across 75+ factors and delivers prioritized, actionable fixes. Unlike general-purpose SEO tools that focus on traditional search engine rankings, pdpIQ is purpose-built for the AI answer economy -- analyzing structured data, content quality, and AI crawler access from the perspective of large language models, not just Google.

### Three Value Propositions

**1. See Your Product Pages the Way AI Does**
AI systems don't read product pages the same way Google does. pdpIQ analyzes the exact signals that LLMs use when deciding whether to cite, recommend, or surface your product -- from JSON-LD schema completeness to og:image format compatibility and robots.txt crawler rules. You get a single, clear grade (A through F) that tells you where you stand.
- *Proof point:* 75+ factors across 6 weighted categories, including a dedicated AI Discoverability category that monitors 15 AI crawlers from 10 companies.

**2. Fix What Matters First, Not Everything at Once**
Every finding comes with impact and effort ratings, so your team can triage intelligently. pdpIQ generates up to 44 distinct recommendation types, each with concrete implementation guidance -- not vague advice, but specific HTML snippets, schema properties, and content patterns.
- *Proof point:* Recommendations ranked by 5-level priority matrix (Impact x Effort).

**3. Zero Data Leaves Your Browser**
pdpIQ runs entirely client-side. No page data, product information, competitive intelligence, or analysis results are transmitted to any server -- not Tribbute's, not a third party's.
- *Proof point:* Zero analytics, zero telemetry, zero external server calls. Only 3 Chrome permissions: activeTab, sidePanel, storage.

### Competitive Positioning Summary

| vs. | pdpIQ Advantage |
|-----|-----------------|
| **General SEO tools** (Ahrefs, SEMrush) | They optimize for Google rankings. pdpIQ optimizes for AI citations. Complementary, not competitive -- but only pdpIQ addresses the AI gap. |
| **Page speed tools** (Lighthouse, GTmetrix) | They tell you if your page loads fast. pdpIQ tells you if AI can understand and recommend what's on the page. |
| **Schema validators** (Rich Results Test) | They confirm syntax is valid. pdpIQ evaluates whether your entire page -- content, structure, metadata, discoverability -- is ready for AI to cite. |

---

## 15. Key Metrics Reference

*Use these consistently across all marketing materials.*

| Metric | Value |
|--------|-------|
| Scoring factors | 75+ |
| Scoring categories | 6 |
| AI crawlers monitored | 15 (from 10 companies) |
| Schema types extracted | 9+ |
| JSON-LD formats handled | 3 (plus full Microdata support) |
| Recommendation templates | 44 |
| Certification patterns recognized | 27 |
| Data sent to external servers | 0 bytes |
| Extension permissions | 3 (minimal footprint) |
| Export formats | 2 (HTML report + JSON data) |
| Price | Free |
| Platforms supported | Shopify, BigCommerce, WooCommerce, Magento, custom |
| AI companies covered | OpenAI, Anthropic, Google, Apple, Perplexity, Meta, ByteDance, Cohere, You.com, Amazon |

### Tagline-Ready Metrics
- "75+ factors. 6 categories. 15 AI crawlers. One score."
- "Analyzes what Ahrefs, Lighthouse, and Google Rich Results Test can't: whether AI will recommend your product."
- "Zero data leaves your browser. Ever."

---

## 16. Pricing & CTA Strategy

### Current: Free (Chrome Web Store)

Full-featured extension at no cost. All 75+ factors, all 6 categories, history, comparison, HTML report export, JSON data export.

**CTA copy by placement:**

| Placement | Copy |
|-----------|------|
| Chrome Web Store listing | "See how AI sees your product pages" |
| Website hero | "Add to Chrome -- Free" |
| Report footer | "Powered by pdpIQ from Tribbute. Analyze any product page for free." |

### Future Tier Recommendations

| Tier | Price | Target | Key Additions |
|------|-------|--------|---------------|
| **pdpIQ Pro** | $29-49/mo | Agencies, multi-brand teams | Bulk analysis, trend tracking, custom weights, API access, team sharing |
| **pdpIQ Enterprise** | Custom | Large retailers (1,000+ SKUs) | White-label reports, server-side crawl, custom factors, SSO, SLA |

### Final CTA Section (for bottom of page)

**Headline:**
> Every AI Recommendation Your Competitor Gets Is One You Didn't

**Value Statement:**
> The brands winning AI citations aren't necessarily better -- they're more readable to machines. pdpIQ shows you exactly what to fix, in priority order, with implementation guidance your team can act on today. One extension. 75+ factors. The clearest picture of your AI readiness that exists.

**CTA Button:** `Add pdpIQ to Chrome -- Free`

---

*End of handoff document.*
