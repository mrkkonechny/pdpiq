/**
 * Recommendation Rules
 * Defines impact/effort classifications and recommendation templates
 */

/**
 * Priority matrix: Impact x Effort = Priority
 * Lower priority number = higher priority
 */
export const PRIORITY_MATRIX = {
  high: {
    low: 1,
    medium: 2,
    high: 3
  },
  medium: {
    low: 2,
    medium: 3,
    high: 4
  },
  low: {
    low: 3,
    medium: 4,
    high: 5
  }
};

/**
 * Calculate priority from impact and effort
 * @param {string} impact - high/medium/low
 * @param {string} effort - high/medium/low
 * @returns {number} Priority 1-5 (1 is highest)
 */
export function calculatePriority(impact, effort) {
  return PRIORITY_MATRIX[impact]?.[effort] || 5;
}

/**
 * Effort classifications
 */
export const EFFORT_LEVELS = {
  low: {
    label: 'Low',
    description: '1-4 hours',
    examples: ['Schema markup', 'Meta tags', 'Image format change']
  },
  medium: {
    label: 'Medium',
    description: '4-8 hours',
    examples: ['FAQ section', 'Expanded descriptions', 'Specs table']
  },
  high: {
    label: 'High',
    description: '1+ weeks',
    examples: ['Page restructure', 'Review system', 'CMS changes']
  }
};

/**
 * Recommendation templates for common issues
 */
export const RECOMMENDATION_TEMPLATES = {
  // Protocol & Meta
  'og-image-missing': {
    title: 'Add og:image meta tag',
    description: 'Missing og:image removes your product thumbnail from social shares and link previews. This is a social sharing signal — LLM crawlers are text-only parsers and do not process image files during indexing.',
    impact: 'high',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add og:image with a JPEG or PNG product image (1200×630px recommended for social preview cards). For LLM visibility, ensure your product has descriptive alt text on its primary image.'
  },

  'og-image-webp': {
    title: 'Consider a JPEG fallback for og:image',
    description: 'Your og:image is in WebP format. WebP is supported by all major platforms and LLM crawlers do not process image files at all — so this is unlikely to affect AI visibility. However, some niche link-preview clients and older automation tools have inconsistent WebP support. A JPEG fallback offers the broadest possible compatibility.',
    impact: 'low',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'If your CDN supports format negotiation, configure a JPEG version for og:image specifically. Most page-speed optimisations recommend WebP for on-page images — this only applies to the og:image meta tag URL.'
  },

  'robots-blocking': {
    title: 'Remove noindex directive',
    description: 'Page is blocked from indexing by robots meta tag, preventing LLMs from accessing content.',
    impact: 'high',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Remove the noindex value from the robots meta tag, or remove the tag entirely if not needed.'
  },

  'og-title-missing': {
    title: 'Add og:title meta tag',
    description: 'Missing og:title means social shares of this page will typically fall back to the HTML &lt;title&gt;. og:title is an Open Graph social sharing signal — for LLM visibility, the &lt;title&gt; tag and H1 heading are the confirmed product name signals.',
    impact: 'medium',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add og:title matching your product name for clean social link previews. Ensure your HTML &lt;title&gt; tag is product-name-first for LLM and search signals.'
  },

  'og-description-missing': {
    title: 'Add og:description meta tag',
    description: 'Missing og:description means social shares will use a content excerpt as fallback. og:description is a social sharing signal only — for LLM retrieval, the &lt;meta name="description"&gt; tag is the confirmed signal that AI systems use to assess page relevance.',
    impact: 'medium',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add og:description (100–200 chars) for social sharing. More importantly, ensure your meta description is specific, product-name-inclusive, and under 160 characters for LLM retrieval.'
  },

  'twitter-card-missing': {
    title: 'Add Twitter Card markup',
    description: 'Missing Twitter Card tags means your page will not display an enhanced preview card when shared on X/Twitter. Twitter Cards are a social sharing signal — there is no documented evidence that Twitter Card tags influence LLM crawler behavior or AI citation rates.',
    impact: 'low',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add &lt;meta name="twitter:card" content="summary_large_image"&gt; for X/Twitter sharing.'
  },

  'last-modified-missing': {
    title: 'Add Content Freshness Signal',
    description: 'No Last-Modified header returned by this server. Content freshness is one of the most strongly documented AI citation signals — Ahrefs analysis of 17M+ citations found AI-cited content is 25.7% fresher than traditionally-ranked content, and 76.4% of ChatGPT citations were updated within the last 30 days.',
    impact: 'medium',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Configure your server or CDN to return a Last-Modified header on product page responses. For Shopify: this is typically handled by the platform. For custom setups: ensure HTTP headers include Last-Modified set to the page\'s actual last modification date. Also add dateModified to your Schema.org Product markup. Important: substantive content updates earn 3.8× more citations than timestamp-only refreshes — update the actual content (add statistics, refresh comparisons, add FAQ questions) rather than only changing the date. SE Ranking: pages updated within 3 months average 6.0 AI citations vs 3.6 for older content (67% premium). Quarterly minimum for competitive product categories.'
  },

  // Structured Data
  'product-schema-missing': {
    title: 'Add Product schema markup',
    description: 'Product schema is critical for helping search engines correctly classify this page as a product — and those enriched index entries are what AI systems draw from when assembling recommendations. The SearchVIU experiment (October 2025) confirmed that LLM crawlers tokenize schema as raw text rather than parsing it semantically; the value flows indirectly through Googlebot and BingBot\'s indexing pipelines.',
    impact: 'high',
    effort: 'medium',
    category: 'structuredData',
    implementation: 'Add JSON-LD Product schema including: name, description, image, sku, brand, and offers (with price, currency, availability).'
  },

  'offer-schema-missing': {
    title: 'Add Offer schema for pricing',
    description: 'Offer schema tells LLMs about pricing and availability, enabling purchase-related responses.',
    impact: 'high',
    effort: 'low',
    category: 'structuredData',
    implementation: 'Add Offer schema nested in Product schema with: price, priceCurrency (e.g., "USD"), availability (e.g., "https://schema.org/InStock").'
  },

  'rating-schema-missing': {
    title: 'Add AggregateRating schema',
    description: 'AggregateRating schema ensures your product\'s star rating and review count appear in Google\'s knowledge graph and rich results — which AI systems draw from when recommending products. Without it, AI systems pulling from Bing\'s index (which powers ~92% of ChatGPT Search queries) may not surface your rating data at all.',
    impact: 'medium',
    effort: 'low',
    category: 'structuredData',
    implementation: 'Add AggregateRating schema with: ratingValue, bestRating, reviewCount.'
  },

  'faq-schema-missing': {
    title: 'Add FAQ schema markup',
    description: 'FAQPage schema reinforces your visible on-page Q&A content in search engine knowledge graphs — which AI systems draw from indirectly. The more important signal is having visible, server-rendered FAQ content with question-based headings; schema amplifies that signal for index-based AI systems like Google AI Overviews.',
    impact: 'medium',
    effort: 'medium',
    category: 'structuredData',
    implementation: 'Add FAQPage schema with mainEntity containing Question/Answer pairs. Important: ensure the FAQ content is also visible in the page HTML — schema alone without visible on-page content provides minimal AI citation value. Frase.io analysis: pages with FAQ schema are 3.2× more likely to appear in Google AI Overviews.'
  },

  'breadcrumb-schema-missing': {
    title: 'Add BreadcrumbList schema',
    description: 'Breadcrumb schema helps LLMs understand product categorization and site structure.',
    impact: 'low',
    effort: 'low',
    category: 'structuredData',
    implementation: 'Add BreadcrumbList schema with itemListElement containing position, name, and item (URL) for each level.'
  },

  // Content Quality
  'description-short': {
    title: 'Expand product description',
    description: 'Your product description is too short to meaningfully answer user questions. AI citation research shows that section-level content density matters more than total word count — SE Ranking found sections of 120–180 words between headings receive 70% more citations than sections under 50 words.',
    impact: 'high',
    effort: 'medium',
    category: 'contentQuality',
    implementation: 'Structure your description as distinct sections, each covering one aspect of the product (Overview, Key Features, Who It\'s For, Technical Details). Each section should be 120–180 words under a clear H2 or H3 heading. Front-load the most citation-worthy content: 44% of all AI citations come from the first 30% of page content (Kevin Indig analysis of 3M ChatGPT responses).'
  },

  'specs-missing': {
    title: 'Add detailed specifications',
    description: 'Technical specifications help LLMs answer detailed product comparison questions.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentQuality',
    implementation: 'Add a specifications section using proper HTML &lt;table&gt; markup with &lt;th&gt; headers and &lt;td&gt; data cells. A two-column "Spec | Value" table is the AI-optimal format — HTML tables earn 2.5× more citations than text-only equivalents (SE Ranking) and outperform all other formats for LLM structural understanding (Table Meets LLM, WSDM \'24, Microsoft Research). Include all attributes users typically compare: dimensions, weight, materials, power, compatibility, certifications. Include units on all values (150cm not 150; 2.4kg not 2.4).'
  },

  'faq-content-missing': {
    title: 'Add FAQ section',
    description: 'FAQ sections are the highest-surface-area citation targets on a product page — each Q&A pair operates as an independent answerable unit, creating multiple citation opportunities across different user queries. FAQ-formatted content is 3.1× more likely to be directly quoted by LLMs than unstructured equivalents. Optimal answer length is 40–60 words: long enough to be complete, short enough to be a self-contained extractable chunk.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentQuality',
    implementation: 'Add 5+ product-specific questions with 40–60 word answers. Use question-based H2 or H3 headings (e.g., &lt;h3&gt;Does this work with 240V outlets?&lt;/h3&gt;). Start each answer with the direct answer first — \'Yes, this product works with 240V outlets\' — then provide supporting detail. This BLUF (Bottom Line Up Front) format increases AI citation rates 40–60%. Avoid general FAQ (shipping, returns) — product-specific content is what gets cited.'
  },

  'faq-not-product-specific': {
    title: 'Add product-specific FAQ questions',
    description: 'A page-level FAQ (general site questions) provides limited AI citation value. Product-specific FAQs create citation opportunities across multiple user queries through AI fan-out expansion — AirOps found that 32.9% of all cited pages appear only in fan-out results (sub-questions the AI generates around the main query). A product FAQ that answers "Does this work with X?" covers fan-out queries that a description block never would.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentQuality',
    implementation: 'Add a FAQ section directly on this product page with 5–8 questions specific to this product. Use question-based headings (&lt;h3&gt; or &lt;h2&gt;): "Does this work with 240V outlets?" rather than "Compatibility". Write 40–60 word answers that lead with the direct answer: "Yes — this model supports 110V and 240V dual voltage, making it suitable for international use." Cover: compatibility, setup requirements, use-case fit ("Who is this best for?"), common concern pre-emptions, and maintenance. Add FAQPage schema for each Q&amp;A pair.'
  },

  'features-missing': {
    title: 'Add feature bullet points',
    description: 'Clear feature lists help LLMs quickly identify product capabilities.',
    impact: 'medium',
    effort: 'low',
    category: 'contentQuality',
    implementation: 'Add a bulleted list of 5-10 key product features using &lt;ul&gt; or &lt;ol&gt; elements.'
  },

  'compatibility-missing': {
    title: 'Add compatibility information',
    description: 'Compatibility details help LLMs answer "will this work with..." questions.',
    impact: 'medium',
    effort: 'low',
    category: 'contentQuality',
    implementation: 'Add a section listing compatible devices, systems, or products. Be specific about versions and models.'
  },

  'description-quality-low': {
    title: 'Improve product description quality',
    description: 'Your product description lacks the factual specificity that AI systems preferentially cite. The GEO paper (ACM SIGKDD 2024) found that content with statistics and quantified claims achieves up to 40% higher AI visibility — while persuasive/emotional tone shows no measurable improvement. Kevin Indig\'s analysis of 3M ChatGPT responses found 44% of all citations come from the first 30% of page content. Entity density — specific brands, materials, standards, measurements — is 20.6% in cited content (3–4× higher than average writing). Content using definitive language ("is defined as", "is designed for", "is certified to") is 2× more likely to be cited than vague qualifiers.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentQuality',
    implementation: 'Front-load your most citation-worthy content — the first paragraph after your H1 should contain: the primary use case, the key differentiating specification, and one specific measurable outcome. Then add: (1) specific percentages and measurements ("47% more efficient", "150cm × 60cm"), (2) quantified comparisons ("3× faster charge time than previous model"), (3) named validations ("tested to ISO 9001 standards"), (4) definitive use-case framing ("This unit removes 99.97% of particles 0.3 microns and larger" beats "This unit is very effective at air purification"). Replace vague superlatives ("best", "amazing") with citable specifics.'
  },

  'factual-specificity-low': {
    title: 'Add Statistics and Quantified Claims',
    description: 'No percentages, measurements, or quantified comparisons detected in this product\'s content. The GEO paper (ACM SIGKDD 2024) found that statistics addition is the single largest AI visibility lever — boosting citation rates by up to 40% — while persuasive language alone shows no significant improvement.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentQuality',
    implementation: 'Include specific numbers: performance percentages ("47% reduction in X"), physical measurements ("2.4 kg, 30cm × 20cm"), comparative quantities ("3× more Y than leading competitor"), and outcome figures ("saves up to 2 hours per week"). Even 3–5 well-placed statistics substantially improve AI extractability.'
  },

  'materials-missing': {
    title: 'Add materials information',
    description: 'Material composition is a frequently searched product attribute. LLMs cite this when answering material-specific queries (e.g. "BPA-free water bottles", "100% cotton shirts").',
    impact: 'low',
    effort: 'low',
    category: 'contentQuality',
    implementation: 'Add a materials section or include material information in the specifications table. Be specific: "100% organic cotton" beats "natural fabric". Include this in Product schema using the material property if possible.'
  },

  'care-instructions-missing': {
    title: 'Add care and maintenance instructions',
    description: 'Care instructions are a common post-purchase query. LLMs that can find this information on your page reduce customer service load and improve the buyer experience signal.',
    impact: 'low',
    effort: 'low',
    category: 'contentQuality',
    implementation: 'Add a "Care & Maintenance" section with clear, specific instructions (e.g. "Machine wash cold, tumble dry low — do not bleach"). For non-textile products, include cleaning, storage, or maintenance guidance. Use &lt;ul&gt; lists for scannability.'
  },

  // Content Structure
  'h1-missing': {
    title: 'Add H1 heading',
    description: 'Missing H1 heading makes it harder for LLMs to identify the main topic of the page.',
    impact: 'medium',
    effort: 'low',
    category: 'contentStructure',
    implementation: 'Add a single &lt;h1&gt; tag containing the product name. It should match your HTML &lt;title&gt; tag and your Schema.org Product name property — these three elements are the confirmed entity signals AI systems use to identify what product this page is about.'
  },

  'multiple-h1': {
    title: 'Use single H1 heading',
    description: 'Multiple H1 headings create an ambiguous structure for content extraction systems that use heading hierarchy as a topic-boundary signal. Google\'s John Mueller has confirmed multiple H1s don\'t affect search ranking, but a single H1 for the product name is best practice for clean extraction.',
    impact: 'low',
    effort: 'low',
    category: 'contentStructure',
    implementation: 'Keep only one &lt;h1&gt; for the product name. Convert other H1s to H2 or lower.'
  },

  'semantic-html-missing': {
    title: 'Use semantic HTML elements',
    description: 'Semantic HTML elements are the primary signals that content extraction pipelines use to distinguish product content from navigation and boilerplate. Trafilatura — the leading open-source extraction library used in LLM training data preparation — achieves F1 scores of 93–96% by analysing HTML element types as primary signals. The HtmlRAG paper (WWW \'25, Renmin University) demonstrated that semantic HTML outperforms plain text for RAG retrieval, with heading structure being a key signal lost when HTML is converted to plain text.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentStructure',
    implementation: 'Wrap main product content in &lt;main&gt; or &lt;article&gt;. Use &lt;section&gt; for distinct product areas (description, features, specs, FAQ). Mark navigation with &lt;nav&gt;. Wrap images with &lt;figure&gt; and &lt;figcaption&gt; — the &lt;figcaption&gt; text is one of the few non-alt-text ways to give AI crawlers editorial context about what an image shows ("The reinforced toe cap meets EN ISO 20345 safety standards"). These elements tell extraction systems: "This is primary content" versus "This is site chrome."'
  },

  'primary-image-alt-missing': {
    title: 'Add alt text to primary product image',
    description: 'Alt text is the only visual signal AI crawlers process — GPTBot, ClaudeBot, and PerplexityBot are text-only parsers that cannot process image pixels during web crawling. Your primary product image contributes zero AI visibility information without descriptive alt text.',
    impact: 'medium',
    effort: 'low',
    category: 'contentStructure',
    implementation: 'Write alt text covering: product type + color/material + key distinguishing features + size or dimension context. Example for a standing desk: alt="motorized standing desk in white oak finish, 140cm wide, with programmable height presets and built-in cable management". Avoid: alt="product image", alt="desk", or leaving alt blank. For gallery images, describe the specific aspect shown: alt="close-up of the anti-slip rubber feet and stainless steel leg joints".'
  },

  'images-alt-low': {
    title: 'Improve image alt text coverage',
    description: 'Low alt text coverage limits accessibility and LLM understanding of product visuals.',
    impact: 'low',
    effort: 'medium',
    category: 'contentStructure',
    implementation: 'Add meaningful alt text to all product images. Describe what\'s shown, not just "product image".'
  },

  'readability-low': {
    title: 'Improve content readability',
    description: 'Low readability scores mean LLMs may struggle to extract clean, citable facts from your product copy. Short sentences and plain language improve AI parsing.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentStructure',
    implementation: 'Aim for a reading level of Grade 8–10. Use short sentences (15–20 words), avoid jargon, and break long paragraphs into shorter ones. Tools like Hemingway Editor can help measure and improve readability before publishing.'
  },

  'content-ratio-low': {
    title: 'Increase content-to-chrome ratio',
    description: 'Too much navigation, sidebars, or boilerplate HTML relative to product content reduces LLM confidence in what the page is about.',
    impact: 'low',
    effort: 'medium',
    category: 'contentStructure',
    implementation: 'Wrap the main product content in a &lt;main&gt; or &lt;article&gt; element. Reduce repetitive nav, footer, and promotional blocks that dilute the signal-to-noise ratio for AI crawlers.'
  },

  'table-structure-missing': {
    title: 'Use structured &lt;table&gt; for specifications',
    description: '"Table Meets LLM" (Sui et al., WSDM \'24, Microsoft Research / NUS) found HTML table markup outperforms plain text by 6.76% for LLM structural understanding across 7 tasks — the highest of any tested format (HTML > XML > JSON > Markdown > natural language). SE Ranking: comparison tables earn 2.5× more citations than text-only equivalents. AirOps: tables are 2× as likely to appear in ChatGPT results compared to Google Search.',
    impact: 'medium',
    effort: 'low',
    category: 'contentStructure',
    implementation: 'Replace any spec list — plain text paragraphs, CSS-styled divs, or visual-only layouts — with proper HTML &lt;table&gt; markup: &lt;table&gt;&lt;thead&gt;&lt;tr&gt;&lt;th&gt;Specification&lt;/th&gt;&lt;th&gt;Value&lt;/th&gt;&lt;/tr&gt;&lt;/thead&gt;&lt;tbody&gt;...&lt;/tbody&gt;&lt;/table&gt;. CSS-styled divs that look like tables are invisible as tables to LLMs; only semantic &lt;table&gt; markup with &lt;th&gt; and &lt;td&gt; elements provides the structural signal. Each &lt;th&gt; should be a specific, searchable attribute name ("Battery Life", not "Performance").'
  },

  'js-dependency-high': {
    title: 'Reduce JavaScript dependency for product content',
    description: 'Critical product content rendered entirely by JavaScript may be missed by AI crawlers that do not execute JS. Server-side rendering ensures content is always available.',
    impact: 'high',
    effort: 'high',
    category: 'contentStructure',
    implementation: 'Implement server-side rendering (SSR) or static generation for product descriptions, specs, and pricing. For Shopify stores, ensure Liquid templates render key content server-side. At minimum, add Product JSON-LD schema as a static script tag so AI crawlers can identify the page even without JS execution.'
  },

  'aria-labels-missing': {
    title: 'Add ARIA labels for interactive elements',
    description: 'ARIA labels improve accessibility and help AI systems understand the purpose of interactive product page elements like image galleries and option selectors.',
    impact: 'low',
    effort: 'low',
    category: 'contentStructure',
    implementation: 'Add aria-label attributes to buttons, image carousels, and form elements. For product variant selectors, use aria-label="Color" or aria-label="Size". For the main product image gallery, add aria-label="Product images".'
  },

  // Authority & Trust
  'reviews-missing': {
    title: 'Add customer reviews',
    description: 'Customer reviews provide social proof that LLMs use when making recommendations.',
    impact: 'high',
    effort: 'high',
    category: 'authorityTrust',
    implementation: 'Implement a review collection system. Display reviews with structured data markup.'
  },

  'review-platform-no-schema': {
    title: 'Configure your review platform to output structured data',
    description: 'A third-party review platform is detected but may not be outputting review data in a way AI crawlers can access. The Vercel/MERJ analysis of 500M+ AI crawler requests confirmed that GPTBot, ClaudeBot, and PerplexityBot execute zero JavaScript — meaning reviews loaded via JS widgets (Yotpo, Bazaarvoice, PowerReviews, Okendo by default) are invisible to these crawlers regardless of review volume. AggregateRating JSON-LD fixes the schema signal for search indexes; server-side rendering fixes the content visibility problem for AI crawlers.',
    impact: 'high',
    effort: 'low',
    category: 'authorityTrust',
    implementation: 'Enable the structured data / schema markup option in your review platform settings. Most platforms (Klaviyo, Judge.me, Yotpo, Okendo, Stamped, Loox) support this natively — look for "Rich Snippets", "SEO Schema", or "Google Schema" in the platform dashboard. Also verify that review text appears in the initial server-rendered HTML by checking View Page Source (Ctrl+U) — if reviews are not visible there, schema alone will not make them visible to most AI crawlers.'
  },

  'reviews-low-count': {
    title: 'Increase review count',
    description: 'Fewer than 50 reviews reduces the likelihood of AI systems including this product in recommendations. Practitioner consensus across AI search optimization research points to 50+ reviews as the threshold for consistent inclusion in AI-generated product recommendations.',
    impact: 'medium',
    effort: 'high',
    category: 'authorityTrust',
    implementation: 'Build review volume to 50+. Prioritize review programs, post-purchase email sequences, and (where permitted) reviews imported from verified purchases. Review quality and recency matter as much as count — recent reviews within 3 months signal an actively-sold product.'
  },

  'review-recency-low': {
    title: 'Encourage recent customer reviews',
    description: 'LLMs weigh recency when citing reviews. No reviews within the last 6 months signal an inactive or declining product.',
    impact: 'medium',
    effort: 'medium',
    category: 'authorityTrust',
    implementation: 'Send post-purchase review requests within 2–4 weeks of delivery. Include structured Review schema with datePublished on each review so AI crawlers can verify recency. Consider a "Verified Purchase" badge system to add credibility alongside dates.'
  },

  'review-depth-low': {
    title: 'Encourage detailed, substantive reviews',
    description: 'Short or generic reviews provide minimal AI citation value. Reviews containing specific use-case details — "I used this in a 200 sq ft basement and it reduced humidity from 68% to 45% in three days" — create extractable factual claims LLMs can incorporate into product recommendations. Generic reviews ("Great product!") produce no citable content. Note: most review platforms (Yotpo, Bazaarvoice, PowerReviews) default to client-side JavaScript rendering — making review text invisible to AI crawlers unless the platform outputs server-rendered HTML or structured data.',
    impact: 'low',
    effort: 'medium',
    category: 'authorityTrust',
    implementation: 'Ask reviews to cover three things: (1) the specific context ("I used this for X"), (2) a measurable outcome ("after 3 weeks / in a 200 sq ft room..."), (3) a comparative observation ("compared to my previous [product]..."). These prompts produce the review specificity AI systems can extract and cite. Also verify your review platform outputs reviews in server-rendered HTML (check View Page Source — if review text is absent, AI crawlers cannot see it regardless of volume).'
  },

  'awards-missing': {
    title: 'Highlight product awards and accolades',
    description: 'Awards and editorial recognition are strong trust signals that LLMs use when recommending premium or best-in-category products.',
    impact: 'low',
    effort: 'low',
    category: 'authorityTrust',
    implementation: 'Display any awards or recognition prominently on the page (e.g. "Editor\'s Choice 2024", "Best Product Award – [Publication]"). Add award information to Product schema using the award property. Even press mentions from credible sources count.'
  },

  'brand-unclear': {
    title: 'Clarify brand identity',
    description: 'Clear brand identification helps LLMs attribute products correctly.',
    impact: 'medium',
    effort: 'low',
    category: 'authorityTrust',
    implementation: 'Include brand name in H1, title tag, and Product schema. Add Organization/Brand schema.'
  },

  'certifications-missing': {
    title: 'Add certification information',
    description: 'Certifications are a form of third-party citation — the highest-performing optimization in the GEO paper (SIGKDD \'24), which found that adding cited sources produces up to 115% visibility increase for lower-ranked sites. A specific, verifiable certification claim ("CE certified to EN 60950-1:2006") gives AI systems an extractable fact they can attribute; a vague claim ("clinically tested") does not.',
    impact: 'low',
    effort: 'low',
    category: 'authorityTrust',
    implementation: 'List relevant certifications prominently with full specificity: certification body + standard number + year ("UL listed to UL 2272", "CE certified to EN 60950-1:2006", "USDA Organic certified 2024"). For clinical or test results, use this format: "Tested in a 12-week 2024 trial of 200 participants at [Lab/University], 87% showed improvement" — this gives AI systems specific numbers + named institution + time-bounded + quantified outcome, all of which are extractable citable claims. Vague authority language ("clinically tested", "professionally recommended") provides zero citation value.'
  },

  'content-stale': {
    title: 'Update and date-stamp product content',
    description: 'LLMs favour recently updated content when making recommendations. No schema date found or content is more than 90 days old.',
    impact: 'medium',
    effort: 'low',
    category: 'authorityTrust',
    implementation: 'Add a dateModified property to your Product JSON-LD schema whenever you update the page. Update the content itself regularly — refresh pricing, specs, and descriptions. A visible "Updated: [date]" note also signals freshness to AI crawlers.'
  },

  'social-proof-missing': {
    title: 'Add sold count or customer count',
    description: 'Quantified social proof (e.g. "5,000+ sold", "10,000 happy customers") is a strong trust signal that LLMs cite when recommending products.',
    impact: 'medium',
    effort: 'low',
    category: 'authorityTrust',
    implementation: 'Add a visible sold count or customer milestone to your product page (e.g. "Over 12,000 customers served"). Ensure the text uses digits (not words) so automated extraction can find it. Numbers must be ≥3 digits.'
  },

  'expert-attribution-missing': {
    title: 'Add expert or editorial attribution',
    description: 'Expert endorsements ("clinically tested", "dermatologist approved", "expert review") increase credibility and are picked up by AI systems assessing trustworthiness.',
    impact: 'low',
    effort: 'low',
    category: 'authorityTrust',
    implementation: 'Add credible attribution such as "Clinically tested", "Dermatologist recommended", "As featured in [publication]", or "Expert reviewed by [credentials]". Place this near the product headline or trust badges section.'
  },

  // AI Discoverability
  'ai-crawler-blocked': {
    title: 'Allow AI crawlers in robots.txt',
    description: 'Major AI crawlers (GPTBot, ClaudeBot, PerplexityBot) are blocked in robots.txt, preventing AI systems from discovering and citing your product content.',
    impact: 'high',
    effort: 'low',
    category: 'aiDiscoverability',
    implementation: 'Update your robots.txt to allow AI crawlers. Remove or modify Disallow rules for User-agent: GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, Anthropic-AI, PerplexityBot, Google-Extended. Consider allowing at least read-only access for product pages.'
  },

  'llms-txt-missing': {
    title: 'Add llms.txt file',
    description: 'No llms.txt file detected. This emerging specification (September 2024) was intended to help AI systems understand site content. As of early 2026, no major LLM provider (OpenAI, Anthropic, Google, Perplexity) has officially confirmed reading llms.txt during crawling, and independent analysis found no measurable effect on citation rates.',
    impact: 'low',
    effort: 'low',
    category: 'aiDiscoverability',
    implementation: 'Implementing llms.txt costs little but has no confirmed AI citation benefit today. If your brand has a developer-focused audience, it may help with manual AI tool usage. For eCommerce, invest in Schema.org markup, content quality, and robots.txt configuration before llms.txt.'
  },

  'entity-consistency-low': {
    title: 'Align product name across page elements',
    description: 'The product name is inconsistent across your Schema.org markup, H1 heading, and meta description. LLMs verify entity identity by comparing product names across these HTML elements — inconsistencies are a primary cause of AI-generated summaries misidentifying or misrepresenting your product.',
    impact: 'medium',
    effort: 'low',
    category: 'aiDiscoverability',
    implementation: 'Align the product name exactly across: (1) Schema.org Product "name" property, (2) H1 heading, (3) HTML &lt;title&gt; tag, (4) meta description. Minor variations (e.g., trademark symbols, subtitle presence) are acceptable — avoid different names or word order that could indicate different products.'
  },

  'answer-format-missing': {
    title: 'Add AI-citable answer-format content',
    description: 'Your page lacks the direct-answer content structure that AI systems preferentially extract. Search Engine Land\'s audit of ChatGPT-cited content found that "answer capsules" — concise 120–150 character explanations immediately after H2 headings — were the single strongest commonality among cited posts. AI systems process queries through fan-out expansion: 89.6% of prompts trigger multiple sub-queries (AirOps, 548K pages), and 32.9% of cited pages appear only in fan-out results.',
    impact: 'medium',
    effort: 'medium',
    category: 'aiDiscoverability',
    implementation: 'After each H2 section heading, add a 1–2 sentence direct answer as the first content (the "answer capsule"). Example: under &lt;h2&gt;Who is this for?&lt;/h2&gt;, write "This filter is ideal for allergy sufferers in rooms up to 500 sq ft — it removes 99.97% of particles including pollen, pet dander, and dust mites." Then expand with supporting detail. Also add: "Best for [use case]" statements, specific use-case descriptions ("Ideal for studio apartments because it operates at 24dB"), and "How to [use/set up]" guides — these match the sub-questions AI systems generate around product recommendation queries.'
  },

  'product-identifiers-missing': {
    title: 'Add product identifiers (GTIN/UPC/MPN) to schema',
    description: 'Your Product schema lacks standard identifiers (GTIN, MPN, SKU). These help LLMs disambiguate products and match them to purchase queries.',
    impact: 'medium',
    effort: 'low',
    category: 'aiDiscoverability',
    implementation: 'Add at least two of: gtin (UPC/EAN/ISBN barcode number), mpn (manufacturer part number), or sku to your Product schema markup. These identifiers help AI systems confidently identify and recommend specific products.'
  },

  'content-freshness-stale': {
    title: 'Update content and set schema dateModified',
    description: 'AI citation systems show strong recency bias — 76.4% of Perplexity citations come from pages updated within 30 days, and fresh content is 4× more likely to be cited (SE Ranking, 129K domain study). Stale or missing date signals put you at a structural disadvantage against competitors who regularly refresh product content.',
    impact: 'medium',
    effort: 'low',
    category: 'aiDiscoverability',
    implementation: 'Two actions: (1) Update your product page content — add new specs, refresh description copy, or add recent reviews to the visible page. Even minor updates count. (2) Set schema dateModified in your Product JSON-LD to today\'s date when you update: `"dateModified": "2026-03-26"`. For Shopify: add dateModified to your product JSON-LD snippet in the theme. For WordPress/WooCommerce: plugins like Rank Math or Yoast auto-generate this from post modified date. Aim to update high-priority product pages at least monthly.'
  },

  // Additional Structured Data
  'review-schema-missing': {
    title: 'Add Review schema markup',
    description: 'Individual Review schema helps LLMs cite specific customer experiences and opinions when recommending products.',
    impact: 'medium',
    effort: 'low',
    category: 'structuredData',
    implementation: 'Add Review schema within your Product JSON-LD, including author, datePublished, reviewBody, and reviewRating. Most review platforms (Yotpo, Judge.me, Stamped) output this automatically.'
  },

  'organization-schema-missing': {
    title: 'Add Organization or Brand schema',
    description: 'Organization/Brand schema helps LLMs identify the manufacturer and improves brand attribution in AI-generated responses.',
    impact: 'low',
    effort: 'low',
    category: 'structuredData',
    implementation: 'Add Organization schema with name, url, and logo properties. Alternatively, nest a Brand object inside your Product schema: "brand": {"@type": "Brand", "name": "Your Brand"}.'
  },

  'image-schema-missing': {
    title: 'Add ImageObject schema for product images',
    description: 'ImageObject schema provides structured image metadata (dimensions, alt text, content URL) that helps AI systems select and display appropriate product visuals.',
    impact: 'low',
    effort: 'low',
    category: 'structuredData',
    implementation: 'Add ImageObject to your Product schema image property: "image": {"@type": "ImageObject", "url": "https://...", "width": 1200, "height": 1200, "name": "Product Name - Front View"}. This is especially useful for multi-image galleries.'
  },

  // Additional Protocol & Meta
  'og-type-missing': {
    title: 'Add og:type meta tag with product value',
    description: 'Missing og:type means this page lacks an Open Graph type declaration for social sharing contexts. Note: og:type has no documented effect on LLM classification — LLMs use Schema.org Product markup and content signals to identify product pages.',
    impact: 'medium',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add &lt;meta property="og:type" content="product"&gt; for social sharing completeness. For LLM product identification, implement Schema.org Product JSON-LD (tracked separately in Structured Data).'
  },

  'twitter-image-missing': {
    title: 'Add Twitter/X image meta tag',
    description: 'Missing twitter:image reduces product visibility when shared on Twitter/X. If og:image exists, twitter:image can reference the same URL.',
    impact: 'low',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add &lt;meta name="twitter:image" content="https://your-site.com/product-image.jpg"&gt;. Use the same image as og:image. Minimum 600x314px, ideally 1200x628px.'
  },

  'canonical-missing': {
    title: 'Fix canonical URL',
    description: 'The canonical URL is missing or does not match the current page. This can split link equity and confuse LLMs about which URL is authoritative.',
    impact: 'medium',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add &lt;link rel="canonical" href="https://your-site.com/products/product-name"&gt; with the exact URL of this product page. Ensure it matches the page URL (protocol, domain, path). For Shopify collection pages, the canonical should point to /products/slug.'
  },

  'meta-description-missing': {
    title: 'Add meta description',
    description: 'Missing meta description limits how LLMs summarize your product page. A good meta description acts as a pre-written product pitch for AI systems.',
    impact: 'medium',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add &lt;meta name="description" content="..."&gt; with 120-160 characters summarizing the product. Include the product name, key benefit, and brand. This is often the first text LLMs cite when describing a product.'
  },

  // Additional Content Quality
  'dimensions-missing': {
    title: 'Add product dimensions or sizing',
    description: 'Dimensions and sizing information help LLMs answer "will this fit?" questions, which are among the most common product queries.',
    impact: 'low',
    effort: 'low',
    category: 'contentQuality',
    implementation: 'Add a dimensions section with length, width, height, and weight. For apparel, include a size chart. Add dimensions to Product schema using width, height, depth, and weight properties with QuantitativeValue types.'
  },

  'warranty-missing': {
    title: 'Add warranty information',
    description: 'Warranty details are a key purchase decision factor. LLMs cite warranty coverage when comparing products or answering pre-purchase questions.',
    impact: 'low',
    effort: 'low',
    category: 'contentQuality',
    implementation: 'Add warranty duration and coverage details to the product page (e.g., "2-year limited warranty covers manufacturing defects"). Include this in Product schema using the warranty property. For apparel, a return policy or satisfaction guarantee serves the same trust function.'
  },

  'spec-detail-low': {
    title: 'Add units and values to specifications',
    description: 'Specifications lack measurement units or precise values. LLMs extract structured data more reliably when specs include units (e.g., "12 oz" vs "12").',
    impact: 'low',
    effort: 'low',
    category: 'contentQuality',
    implementation: 'Review your specification entries and add units to each value: weight in lbs/kg/oz, dimensions in inches/cm, capacity in ml/oz, power in watts, etc. At least 30% of specs should have units for a passing score.'
  },

  'data-table-missing': {
    title: 'Present specifications as an HTML table',
    description: 'HTML tables are 2.5–6.76× more likely to be cited by AI systems than the same information in prose or bullet lists (Table Meets LLM, WSDM \'24; HtmlRAG, WWW \'25). LLMs extract values precisely from structured rows and columns; prose specifications require interpretation and are often summarised or dropped.',
    impact: 'medium',
    effort: 'low',
    category: 'contentQuality',
    implementation: 'Convert your product specifications into an HTML <table> with header cells (<th>) for attribute names and data cells (<td>) for values. Minimum: 3 rows (header + 2 data rows) and 2 columns. Include: dimensions, weight, materials, compatibility, power ratings, and any numeric specifications. For Shopify: use a metafield rendered as a table or add a table block in the product description. For WordPress/WooCommerce: use the table block in Gutenberg or the WooCommerce Attributes tab which renders as a <table>. Avoid converting tables back to styled divs or lists in your theme CSS.'
  },

  'comparison-missing': {
    title: 'Add product comparison content',
    description: 'Comparison and "best for" content is the single most-cited page format in AI search — Ahrefs analysis of ChatGPT citations found 43.8% of all cited pages are "best X" comparison formats. When AI systems recommend products, brands\' own comparison pages account for 34% of citations. Pages that answer both the main query and fan-out queries are 161% more likely to be cited overall.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentQuality',
    implementation: 'Add a "Why Choose This / How It Compares" section with: (1) "Best for" statements backed by specific evidence — "Best for small apartments: removes 99.97% of particles in rooms up to 465 sq ft in 12 minutes"; (2) an HTML comparison table against 1–2 named alternatives covering the attributes users actually compare; (3) a "Who this is not for" note — honest positioning increases trust and citation likelihood. Use specific figures: "3× faster charge" beats "charges quickly". A comparison table with &lt;th&gt; headers and &lt;td&gt; data earns 2.5× more citations than text-only equivalents.'
  },

  // Additional Content Structure
  'heading-hierarchy-broken': {
    title: 'Fix heading hierarchy',
    description: 'Heading hierarchy is how content extraction systems segment your page into independently retrievable units. SE Ranking analysis of 129,000 domains found sections of 120–180 words between headings receive 70% more AI citations than sections under 50 words. Search Engine Land\'s audit of ChatGPT-cited posts found that "answer capsules" — a 120–150 character direct answer immediately after the H2 heading — were the single strongest commonality among cited content.',
    impact: 'low',
    effort: 'low',
    category: 'contentStructure',
    implementation: 'Structure headings as: H1 (product name) → H2 (major sections: Features, Specifications, Use Cases, FAQ) → H3 (subsections). Each H2 section should contain 120–180 words of substantive content. After each H2, write a 1–2 sentence direct answer as the first content (the "answer capsule"): under &lt;h2&gt;Key Specifications&lt;/h2&gt;, open with "This model weighs 2.4 kg, measures 30 × 20 × 8 cm, and runs on 12V DC — compatible with standard US/EU adapters." Never skip heading levels.'
  },

  'list-structure-missing': {
    title: 'Add structured lists for product details',
    description: 'Product details presented as paragraphs are harder for LLMs to parse than HTML lists. Structured &lt;ul&gt;/&lt;ol&gt; elements improve data extraction accuracy.',
    impact: 'low',
    effort: 'low',
    category: 'contentStructure',
    implementation: 'Convert feature descriptions, benefits, or included items from plain text to &lt;ul&gt; or &lt;ol&gt; lists. Each list item should describe one distinct attribute or feature. Aim for at least one list with 3+ items.'
  },

  // Additional Authority & Trust
  'rating-low': {
    title: 'Improve product rating visibility',
    description: 'No average rating found in schema markup. LLMs rely on structured rating data to compare products and make recommendations.',
    impact: 'medium',
    effort: 'low',
    category: 'authorityTrust',
    implementation: 'Add AggregateRating to your Product JSON-LD schema with ratingValue, bestRating (typically 5), and reviewCount. Ensure the displayed star rating on the page matches the schema value for consistency.'
  }
};

// ==========================================
// PDP QUALITY RECOMMENDATION TEMPLATES
// ==========================================

/**
 * PDP Quality recommendation templates for common shopping experience issues
 */
export const PDP_RECOMMENDATION_TEMPLATES = {
  // Purchase Experience
  'pdp-price-missing': {
    title: 'Make price clearly visible',
    description: 'No visible price found on the page. Price is the most critical conversion factor — shoppers who can\'t find the price quickly will leave.',
    impact: 'high',
    effort: 'low',
    category: 'purchaseExperience',
    implementation: 'Display the product price prominently near the product title and CTA button. Use large, readable font. If pricing varies by variant, show the starting price with "From $X" text.'
  },

  'pdp-cta-missing': {
    title: 'Add a clear add-to-cart or buy button',
    description: 'No add-to-cart or buy-now button detected. Without a clear CTA, visitors cannot convert.',
    impact: 'high',
    effort: 'low',
    category: 'purchaseExperience',
    implementation: 'Add a prominent &lt;button&gt; element with clear purchase text ("Add to Cart", "Buy Now"). Place it above the fold, near the price. Use a contrasting colour that stands out from the page background.'
  },

  'pdp-cta-unclear': {
    title: 'Improve CTA button clarity',
    description: 'The call-to-action button text is generic or unclear. Specific, action-oriented text converts better than vague labels.',
    impact: 'medium',
    effort: 'low',
    category: 'purchaseExperience',
    implementation: 'Use specific, action-oriented CTA text: "Add to Cart", "Buy Now", "Add to Bag". Avoid generic labels like "Submit" or "Continue". Make the button large enough to tap on mobile (44px+ height).'
  },

  'pdp-discount-missing': {
    title: 'Add discount or sale messaging',
    description: 'No compare-at price, sale badge, or savings callout found. Highlighting value increases conversion rates and reduces price objections.',
    impact: 'medium',
    effort: 'low',
    category: 'purchaseExperience',
    implementation: 'Show the original price struck through alongside the sale price. Add a "Save X%" or "You save $X" callout. Use visual badges like "SALE" or "LIMITED OFFER" near the price. Include compare-at pricing in your Product schema.'
  },

  'pdp-payment-methods-missing': {
    title: 'Display accepted payment methods',
    description: 'No payment method icons or buy-now-pay-later messaging found. Showing payment options reduces checkout friction and increases buyer confidence.',
    impact: 'medium',
    effort: 'low',
    category: 'purchaseExperience',
    implementation: 'Add payment method icons (Visa, Mastercard, PayPal, Apple Pay) near the CTA button. If you offer BNPL options (Klarna, Afterpay, Shop Pay Installments), show a "Pay in 4 installments of $X" message below the price.'
  },

  'pdp-urgency-missing': {
    title: 'Add urgency or scarcity signals',
    description: 'No low-stock indicators, limited-time offers, or countdown timers found. Legitimate urgency signals can increase conversion rates.',
    impact: 'low',
    effort: 'medium',
    category: 'purchaseExperience',
    implementation: 'Add truthful scarcity messaging: "Only X left in stock", "Limited edition", or "Sale ends [date]". Display real-time inventory counts when stock is low. Avoid fake urgency — it erodes trust.'
  },

  // Trust & Confidence
  'pdp-return-policy-missing': {
    title: 'Display return policy on product page',
    description: 'No return or refund policy information visible on the product page. Return policy visibility is a top trust factor for online purchases.',
    impact: 'high',
    effort: 'low',
    category: 'trustConfidence',
    implementation: 'Add a visible return policy summary near the CTA: "Free 30-day returns" or "Easy returns within 60 days". Link to the full return policy. Use an icon for quick scanning.'
  },

  'pdp-shipping-missing': {
    title: 'Add shipping information',
    description: 'No shipping cost, delivery speed, or free shipping messaging found. Unexpected shipping costs are the top reason for cart abandonment.',
    impact: 'high',
    effort: 'low',
    category: 'trustConfidence',
    implementation: 'Display shipping information near the price and CTA: "Free shipping over $50", "Ships in 1-2 business days", or estimated delivery date. If shipping cost varies, add a shipping calculator or a clear minimum for free shipping.'
  },

  'pdp-trust-badges-missing': {
    title: 'Add trust badges and security seals',
    description: 'No trust badges, security seals, or certification icons found. Visual trust signals reduce purchase anxiety.',
    impact: 'medium',
    effort: 'low',
    category: 'trustConfidence',
    implementation: 'Add recognizable trust badges near the CTA or payment section: SSL/secure checkout seal, payment processor badges (Stripe, PayPal Verified), industry certifications, or "Trusted by X+ customers". Keep badges small and unobtrusive.'
  },

  'pdp-secure-checkout-missing': {
    title: 'Add secure checkout messaging',
    description: 'No "secure checkout" messaging or HTTPS indicators found. Explicit security messaging reassures customers sharing payment information.',
    impact: 'medium',
    effort: 'low',
    category: 'trustConfidence',
    implementation: 'Add a lock icon with "Secure Checkout" text near the CTA button. Ensure your site uses HTTPS. Display "Your payment information is encrypted and secure" messaging near the checkout area.'
  },

  'pdp-customer-service-missing': {
    title: 'Add customer service contact information',
    description: 'No phone number, live chat, or email contact found on the product page. Visible customer service options build confidence for hesitant buyers.',
    impact: 'medium',
    effort: 'low',
    category: 'trustConfidence',
    implementation: 'Add at least one contact method visible on the product page: live chat widget, phone number, or email link. "Questions? Chat with us" or "Need help? Call 1-800-XXX-XXXX" near the product details.'
  },

  'pdp-guarantee-missing': {
    title: 'Display guarantee or warranty prominently',
    description: 'No money-back guarantee or warranty information prominently displayed. Guarantees reduce purchase risk perception.',
    impact: 'low',
    effort: 'low',
    category: 'trustConfidence',
    implementation: 'Add a visible guarantee statement: "100% Satisfaction Guarantee", "Money-back guarantee", or warranty duration. Place it near the CTA or in a trust badge row. Use a shield or checkmark icon for visual impact.'
  },

  // Visual Presentation
  'pdp-images-low': {
    title: 'Add more product images',
    description: 'Fewer than 4 product images found. Multiple angles and views help customers evaluate the product and reduce return rates.',
    impact: 'high',
    effort: 'medium',
    category: 'visualPresentation',
    implementation: 'Provide at least 4 product images: front view, back view, detail/close-up, and in-context/lifestyle shot. For apparel, include on-model photos. For electronics, show ports and size comparison. Use consistent white background for main images.'
  },

  'pdp-video-missing': {
    title: 'Add product video',
    description: 'No product video found on the page. Video increases engagement and conversion, especially for products that benefit from demonstration.',
    impact: 'medium',
    effort: 'medium',
    category: 'visualPresentation',
    implementation: 'Add an embedded product video showing the item in use, key features, or unboxing. Keep videos 30-90 seconds. Host on YouTube/Vimeo for performance, or use a native &lt;video&gt; element. Place the video thumbnail in the image gallery.'
  },

  'pdp-gallery-basic': {
    title: 'Enhance image gallery features',
    description: 'Image gallery lacks zoom, lightbox, or navigation controls. Rich gallery features help customers inspect product details closely.',
    impact: 'medium',
    effort: 'medium',
    category: 'visualPresentation',
    implementation: 'Add hover-to-zoom or click-to-enlarge functionality to product images. Include thumbnail navigation for browsing multiple images. Implement a lightbox/modal for full-screen viewing. Most eCommerce platforms offer gallery plugins with these features.'
  },

  'pdp-lifestyle-images-missing': {
    title: 'Add lifestyle and in-context images',
    description: 'No lifestyle or in-use product images detected. Showing products in real-world context helps customers envision ownership.',
    impact: 'medium',
    effort: 'medium',
    category: 'visualPresentation',
    implementation: 'Add images showing the product being used in real settings: a person wearing the clothing, furniture in a room, a tool in use. Include alt text that describes the context (e.g., "Woman wearing [product] at outdoor cafe"). Mix studio and lifestyle shots in the gallery.'
  },

  'pdp-swatches-missing': {
    title: 'Add colour or variant swatches',
    description: 'No visual colour or variant selectors found. Swatches let customers preview options without navigating away.',
    impact: 'medium',
    effort: 'medium',
    category: 'visualPresentation',
    implementation: 'Replace text-only variant dropdowns with visual swatches: colour circles, pattern thumbnails, or material textures. Update the main product image when a swatch is selected. Most Shopify themes support swatches natively or via apps.'
  },

  'pdp-image-quality-low': {
    title: 'Improve product image quality',
    description: 'Product images may be low resolution or lack responsive srcset attributes. High-quality images increase perceived product value.',
    impact: 'medium',
    effort: 'medium',
    category: 'visualPresentation',
    implementation: 'Use images at least 1000px wide for zoom capability. Add srcset attributes for responsive loading across devices. Compress images for fast loading while maintaining visual quality. Use WebP with JPEG fallback for optimal file size.'
  },

  // Content Completeness
  'pdp-variants-missing': {
    title: 'Add product variant selectors',
    description: 'No size, colour, or option selectors found. If the product has variants, clear selection UI is essential for purchase completion.',
    impact: 'high',
    effort: 'medium',
    category: 'contentCompleteness',
    implementation: 'Add clear variant selectors for all product options (size, colour, material, etc.). Use radio buttons, dropdown menus, or visual swatches. Show which variants are in stock. Update price and images when variants change.'
  },

  'pdp-size-guide-missing': {
    title: 'Add size guide or fit information',
    description: 'No size chart or fit guidance found. Missing size information is a major driver of returns, especially for apparel.',
    impact: 'medium',
    effort: 'low',
    category: 'contentCompleteness',
    implementation: 'Add a size chart accessible from the product page (modal, accordion, or inline table). Include measurements in both inches and centimetres. For apparel, add fit notes: "Runs true to size", "Model is 5\'10\" wearing size M". For other products, include dimension diagrams.'
  },

  'pdp-related-products-missing': {
    title: 'Add related or recommended products',
    description: 'No "You may also like", "Customers also bought", or similar product recommendation section found. Cross-selling increases average order value.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentCompleteness',
    implementation: 'Add a "You May Also Like" or "Frequently Bought Together" section below the main product content. Show 4-6 related products with images, titles, and prices. Use your platform\'s built-in recommendation engine or a third-party app.'
  },

  'pdp-qa-missing': {
    title: 'Add customer Q&A section',
    description: 'No customer questions and answers section found. Q&A reduces pre-purchase uncertainty and provides valuable long-tail content.',
    impact: 'low',
    effort: 'medium',
    category: 'contentCompleteness',
    implementation: 'Add a "Questions & Answers" section where customers can ask and receive answers. Seed with 5-10 common questions. Display question count and allow sorting. This is distinct from editorial FAQ — it should support customer-submitted questions.'
  },

  'pdp-details-unorganized': {
    title: 'Organize product details with tabs or accordions',
    description: 'Product details are not organized into clear sections. Tabs or accordions improve scannability and help customers find specific information quickly.',
    impact: 'low',
    effort: 'medium',
    category: 'contentCompleteness',
    implementation: 'Organize product details into tabs (Description, Specifications, Reviews, Shipping) or accordion sections. Each section should have a clear heading. Keep the most important content (description) visible by default. Use consistent formatting across all products.'
  },

  'pdp-whats-in-box-missing': {
    title: 'Add "What\'s in the Box" or package contents',
    description: 'No package contents or included items listing found. Customers want to know exactly what they are purchasing, especially for bundled or multi-component products.',
    impact: 'medium',
    effort: 'low',
    category: 'contentCompleteness',
    implementation: 'Add a "What\'s in the Box" or "Package Includes" section listing all included items: the product itself, accessories, cables, manuals, etc. Use a simple bulleted list. For apparel, list what the outfit includes (e.g., "Includes top and matching belt").'
  },

  // Reviews & Social Proof
  'pdp-reviews-not-prominent': {
    title: 'Make reviews more prominent in the hero area',
    description: 'Star rating and review count are not visible in the product hero area. Review visibility near the product title significantly impacts purchase decisions.',
    impact: 'high',
    effort: 'low',
    category: 'reviewsSocialProof',
    implementation: 'Display the star rating and review count directly below or next to the product title in the hero area. Make it clickable to scroll to the full reviews section. Use a format like "★★★★☆ (142 reviews)" that is immediately scannable.'
  },

  'pdp-star-visual-missing': {
    title: 'Add visual star rating display',
    description: 'No visual star rating (filled/empty stars) found. Visual ratings are processed faster than numeric ratings and build instant trust.',
    impact: 'medium',
    effort: 'low',
    category: 'reviewsSocialProof',
    implementation: 'Display the average rating using filled and empty star icons (SVG or CSS). Show the numeric rating alongside (e.g., "4.5 out of 5"). Use gold/yellow colour for filled stars. Ensure the rating is visible without scrolling.'
  },

  'pdp-review-sort-missing': {
    title: 'Add review sorting and filtering',
    description: 'No review sorting or filtering options found. Customers need to find relevant reviews quickly — filtering by rating or topic increases engagement.',
    impact: 'medium',
    effort: 'medium',
    category: 'reviewsSocialProof',
    implementation: 'Add sort options: "Most Recent", "Most Helpful", "Highest Rated", "Lowest Rated". Add filter-by-rating buttons (5-star, 4-star, etc.) with review counts per star level. Consider topic-based filtering if you have enough reviews.'
  },

  'pdp-review-media-missing': {
    title: 'Enable customer photo and video reviews',
    description: 'No customer-submitted photos or videos found in reviews. User-generated media is highly trusted and increases conversion rates.',
    impact: 'medium',
    effort: 'medium',
    category: 'reviewsSocialProof',
    implementation: 'Enable photo and video uploads in your review collection system. Display a "Reviews with images" gallery at the top of the reviews section. Most review platforms (Judge.me, Yotpo, Stamped) support media reviews natively. Incentivize photo reviews with small discounts.'
  },

  'pdp-social-proof-missing': {
    title: 'Add social proof indicators',
    description: 'No "X people bought this", bestseller badges, or similar social proof found. Quantified social proof reduces purchase hesitation.',
    impact: 'medium',
    effort: 'low',
    category: 'reviewsSocialProof',
    implementation: 'Add visible social proof: "X,XXX+ sold", "Bestseller", "Trending", or "X people are viewing this now". Use real data — fake social proof erodes trust. Place badges near the product title or price for maximum visibility.'
  },

  'pdp-review-count-low': {
    title: 'Increase review volume',
    description: 'Fewer than 50 reviews found. Higher review volume increases buyer confidence and provides more diverse perspectives.',
    impact: 'medium',
    effort: 'high',
    category: 'reviewsSocialProof',
    implementation: 'Implement automated post-purchase review request emails (7-14 days after delivery). Offer incentives for reviews (discount codes, loyalty points). Make the review form simple — star rating + optional text. Consider importing reviews from other channels if applicable.'
  }
};

// ==========================================
// SEO QUALITY RECOMMENDATION TEMPLATES
// ==========================================

/**
 * SEO Quality recommendation templates
 */
export const SEO_RECOMMENDATION_TEMPLATES = {
  // Title & Meta
  'seo-title-missing': {
    title: 'Add a title tag',
    description: 'No title tag found. The title tag is one of the most important on-page SEO signals — it appears in search results and browser tabs.',
    impact: 'high',
    effort: 'low',
    category: 'titleMeta',
    implementation: 'Add &lt;title&gt;Product Name – Brand | Category&lt;/title&gt; to the page &lt;head&gt;. Keep it between 50–60 characters. Include the product name first, followed by the brand. Avoid keyword stuffing.'
  },

  'seo-title-length': {
    title: 'Optimise title tag length',
    description: 'The title tag is outside the optimal 50–60 character range. Titles that are too long get truncated in search results; too short miss ranking opportunities.',
    impact: 'medium',
    effort: 'low',
    category: 'titleMeta',
    implementation: 'Revise the title to be 50–60 characters. Lead with the product name, include the brand, and optionally a key differentiator. Use a pipe or dash as separator (e.g., "Product Name – Brand").'
  },

  'seo-meta-desc-missing': {
    title: 'Add a meta description',
    description: 'No meta description found. Meta descriptions appear in search snippets and directly influence click-through rates from organic search.',
    impact: 'medium',
    effort: 'low',
    category: 'titleMeta',
    implementation: 'Add &lt;meta name="description" content="..."&gt; with 140–160 characters. Include the product name, key benefit, and a call to action (e.g., "Shop online"). Unique descriptions per page improve CTR vs. auto-generated ones.'
  },

  'seo-meta-desc-length': {
    title: 'Optimise meta description length',
    description: 'The meta description is outside the optimal 140–160 character range. Descriptions over 160 characters get truncated in search results.',
    impact: 'low',
    effort: 'low',
    category: 'titleMeta',
    implementation: 'Revise the meta description to 140–160 characters. Front-load the most compelling information. End with an action phrase like "Free shipping" or "Shop now" to improve CTR.'
  },

  'seo-product-name-title': {
    title: 'Include product name in title tag',
    description: 'The page title does not appear to contain the product name. Search engines use the title to understand page relevance for product queries.',
    impact: 'medium',
    effort: 'low',
    category: 'titleMeta',
    implementation: 'Start the title tag with the exact product name as it appears in your Product schema and H1. This ensures consistency across all signals and improves relevance for branded and product queries.'
  },

  // Technical Foundations
  'seo-noindex': {
    title: 'Remove noindex directive',
    description: 'CRITICAL: The page is blocked from search engine indexing. This prevents the page from appearing in organic search results.',
    impact: 'high',
    effort: 'low',
    category: 'technicalFoundations',
    implementation: 'Remove the &lt;meta name="robots" content="noindex"&gt; tag or update robots.txt to allow indexing. Verify that staging/development settings have not been pushed to production. After removing, submit the URL to Google Search Console for re-indexing.'
  },

  'seo-canonical': {
    title: 'Fix canonical URL',
    description: 'The canonical URL is missing or does not match the current page URL. This can split link equity across duplicate or near-duplicate pages.',
    impact: 'medium',
    effort: 'low',
    category: 'technicalFoundations',
    implementation: 'Add &lt;link rel="canonical" href="https://your-site.com/products/product-slug"&gt; pointing to the definitive URL for this product. Ensure it matches the actual page URL (protocol, domain, path, no trailing slash inconsistency).'
  },

  'seo-product-schema': {
    title: 'Add Product schema markup',
    description: 'No Product schema found. Structured data enables rich results (price, rating, availability) in Google search and helps search engines understand product pages.',
    impact: 'high',
    effort: 'medium',
    category: 'technicalFoundations',
    implementation: 'Add JSON-LD Product schema to the page &lt;head&gt; with at minimum: @type, name, description, image, offers (with price and availability), and brand. Test with Google\'s Rich Results Test tool.'
  },

  'seo-breadcrumb-schema': {
    title: 'Add BreadcrumbList schema',
    description: 'No breadcrumb schema found. BreadcrumbList markup enables breadcrumb display in search results, which increases click-through rates and helps search engines understand site hierarchy.',
    impact: 'low',
    effort: 'low',
    category: 'technicalFoundations',
    implementation: 'Add a BreadcrumbList JSON-LD schema reflecting the navigation path (e.g., Home &gt; Category &gt; Subcategory &gt; Product). Use ListItem with @type, position, name, and item (URL) for each breadcrumb level.'
  },

  'seo-js-dependency': {
    title: 'Reduce JavaScript rendering dependency',
    description: 'The page relies heavily on JavaScript to render content. Search engines may not fully crawl JS-rendered content, causing key product information to be missed.',
    impact: 'medium',
    effort: 'high',
    category: 'technicalFoundations',
    implementation: 'Implement server-side rendering (SSR) or static site generation (SSG) for product pages. At minimum, ensure key content (title, description, price, schema) is present in the initial HTML response before JavaScript executes. Use Google Search Console\'s URL Inspection tool to see what Googlebot actually renders.'
  },

  // Content Signals
  'seo-content-length': {
    title: 'Increase product page content length',
    description: 'The product description is too short. Longer, detailed descriptions provide more ranking signals and help answer the full range of customer queries.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentSignals',
    implementation: 'Aim for 300+ words of unique product content. Include: detailed description, key features in bullet points, specifications table, use cases, compatibility information, and FAQ. Avoid keyword stuffing — write naturally for shoppers.'
  },

  'seo-heading-structure': {
    title: 'Improve heading structure',
    description: 'Missing or multiple H1 tags, or heading hierarchy issues. A clear heading structure helps search engines understand page content and importance.',
    impact: 'low',
    effort: 'low',
    category: 'contentSignals',
    implementation: 'Use exactly one H1 tag with the product name. Use H2s for major sections (Features, Specifications, Reviews). Use H3s for subsections. Never skip heading levels (e.g., H1 to H3). Include target keywords naturally in H2 headings.'
  },

  'seo-image-alt': {
    title: 'Add alt text to product images',
    description: 'Product images are missing alt text. Alt text helps search engines understand image content and is required for image search visibility.',
    impact: 'low',
    effort: 'low',
    category: 'contentSignals',
    implementation: 'Add descriptive alt text to all product images. For the primary image: "[Product Name] – [Key Feature/Colour/Variant]". For gallery images: describe the specific view or feature shown. Avoid generic text like "product image" or repeating the same alt text for all images.'
  },

  'seo-image-title-not-alt': {
    title: 'Replace image title attributes with alt text',
    description: 'Some images use a title attribute instead of alt text. The title attribute is a tooltip shown on hover — it is not read by search engines or screen readers as image content. Alt text is required for image SEO and accessibility.',
    impact: 'low',
    effort: 'low',
    category: 'contentSignals',
    implementation: 'Add an alt attribute to each image. Copy the title text as a starting point, then refine it: for the primary image use "[Product Name] – [Key Feature/Colour/Variant]"; for gallery images describe the specific view shown. The title attribute can remain for tooltip purposes but does not replace alt.'
  },

  'seo-readability': {
    title: 'Improve content readability',
    description: 'Content readability score is low. Difficult-to-read content increases bounce rate and reduces dwell time, both negative ranking signals.',
    impact: 'low',
    effort: 'medium',
    category: 'contentSignals',
    implementation: 'Use short sentences (aim for under 20 words each). Use bullet points and numbered lists for features and specs. Break long paragraphs into 2–3 sentence blocks. Use plain language — avoid overly technical jargon unless the audience expects it. Aim for a Flesch reading ease score of 60+.'
  },

  'seo-url-slug': {
    title: 'Optimise URL slug',
    description: 'The URL contains query parameters, numeric IDs, or lacks keyword-rich text. Clean, descriptive URLs improve CTR and provide ranking signals.',
    impact: 'low',
    effort: 'medium',
    category: 'contentSignals',
    implementation: 'Use short, keyword-rich URL slugs: /products/product-name-key-attribute. Avoid query strings (?id=123), hash fragments, and excessively long paths. Separate words with hyphens (not underscores). Implement 301 redirects if changing existing URLs to preserve link equity.'
  },

  // Navigation & Discovery
  'seo-breadcrumb-nav': {
    title: 'Add breadcrumb navigation',
    description: 'No breadcrumb navigation found. Breadcrumbs improve internal linking, help search engines understand site structure, and reduce bounce rate.',
    impact: 'medium',
    effort: 'low',
    category: 'navigationDiscovery',
    implementation: 'Add a breadcrumb trail above the product title: Home &gt; Category &gt; Subcategory &gt; Product Name. Each level should be a link. Pair with BreadcrumbList JSON-LD schema for rich results. Keep breadcrumbs consistent across all product pages.'
  },

  'seo-h1-alignment': {
    title: 'Align H1 with product name and title tag',
    description: 'The H1 heading does not match the product name or page title. Consistency across H1, title tag, and schema name strengthens relevance signals.',
    impact: 'medium',
    effort: 'low',
    category: 'navigationDiscovery',
    implementation: 'Ensure the H1 heading exactly matches (or closely mirrors) the title tag and Product schema name. The H1 should be the product name. If you add brand or category to the title tag, keep the H1 clean with just the product name for readability.'
  },

  'seo-internal-links': {
    title: 'Increase internal linking',
    description: 'Few or no internal links found on the page. Internal links distribute link equity, help search engines discover pages, and keep shoppers engaged.',
    impact: 'low',
    effort: 'low',
    category: 'navigationDiscovery',
    implementation: 'Add links to: related products, the product category, cross-sell or upsell items, and buying guides or blog posts featuring this product. Ensure navigation links (header, footer) are present. Aim for 10+ internal links per product page including navigation.'
  },

  'seo-hreflang': {
    title: 'Add hreflang tags for international targeting',
    description: 'No hreflang tags found. For sites targeting multiple regions or languages, hreflang prevents duplicate content issues and serves the correct page to each audience.',
    impact: 'low',
    effort: 'medium',
    category: 'navigationDiscovery',
    implementation: 'If you have multiple language or regional versions of your site, add &lt;link rel="alternate" hreflang="en-CA" href="..."&gt; tags for each version. Include a self-referencing hreflang tag. Use ISO 639-1 language codes and ISO 3166-1 country codes. If monolingual, this tag is not required.'
  }
};

/**
 * Get recommendation template by ID (searches both AI and PDP templates)
 * @param {string} id - Template ID
 * @returns {Object|null} Template or null
 */
export function getRecommendationTemplate(id) {
  return RECOMMENDATION_TEMPLATES[id] || PDP_RECOMMENDATION_TEMPLATES[id] || SEO_RECOMMENDATION_TEMPLATES[id] || null;
}

/**
 * Get all template IDs
 * @returns {string[]} Array of template IDs
 */
export function getAllTemplateIds() {
  return Object.keys(RECOMMENDATION_TEMPLATES);
}
