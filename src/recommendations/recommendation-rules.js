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
    description: 'Missing og:image means no visual representation in LLM chats and social shares. Add a high-quality product image.',
    impact: 'high',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add &lt;meta property="og:image" content="https://your-site.com/product-image.jpg"&gt; to the page head. Use JPEG or PNG format (not WebP).'
  },

  'og-image-webp': {
    title: 'Convert og:image from WebP to JPEG/PNG',
    description: 'WebP images are not rendered in LLM chat interfaces, making your product invisible when shared. Convert to JPEG or PNG format.',
    impact: 'high',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Update your og:image to use a JPEG or PNG version. Most CDNs can serve different formats based on Accept headers - ensure a JPEG/PNG fallback exists.'
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
    description: 'Missing og:title affects how the page appears in social shares and LLM references.',
    impact: 'medium',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add &lt;meta property="og:title" content="Product Name - Brand"&gt; to the page head. Keep under 60 characters.'
  },

  'og-description-missing': {
    title: 'Add og:description meta tag',
    description: 'Missing og:description limits how the product is described when shared.',
    impact: 'medium',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add &lt;meta property="og:description" content="..."&gt; with 100-200 characters describing the product benefits.'
  },

  'twitter-card-missing': {
    title: 'Add Twitter Card markup',
    description: 'Missing Twitter Card tags limit product visibility on Twitter/X when shared.',
    impact: 'low',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add twitter:card (summary_large_image), twitter:title, twitter:description, and twitter:image meta tags.'
  },

  // Structured Data
  'product-schema-missing': {
    title: 'Add Product schema markup',
    description: 'Product schema is essential for LLMs to understand this is a product page with purchasable items.',
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
    description: 'Rating schema helps LLMs provide review information when recommending products.',
    impact: 'medium',
    effort: 'low',
    category: 'structuredData',
    implementation: 'Add AggregateRating schema with: ratingValue, bestRating, reviewCount.'
  },

  'faq-schema-missing': {
    title: 'Add FAQ schema markup',
    description: 'FAQ schema makes your product Q&A content more accessible to LLMs for answering user questions.',
    impact: 'medium',
    effort: 'medium',
    category: 'structuredData',
    implementation: 'Add FAQPage schema with mainEntity containing Question/Answer pairs. Include at least 5 relevant product questions.'
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
    description: 'Short product descriptions provide insufficient context for LLMs to make quality recommendations.',
    impact: 'high',
    effort: 'medium',
    category: 'contentQuality',
    implementation: 'Expand the product description to at least 200 words. Include key features, benefits, use cases, and differentiators.'
  },

  'specs-missing': {
    title: 'Add detailed specifications',
    description: 'Technical specifications help LLMs answer detailed product comparison questions.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentQuality',
    implementation: 'Add a specifications section with at least 10 key specs including dimensions, materials, compatibility, and technical details.'
  },

  'faq-content-missing': {
    title: 'Add FAQ section',
    description: 'FAQ content helps LLMs answer common customer questions about your product.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentQuality',
    implementation: 'Add 5+ frequently asked questions with detailed answers (50+ characters each). Cover shipping, returns, compatibility, and product-specific questions.'
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
    description: 'Your description lacks benefit statements, emotional language, or technical terms. High-quality copy gives LLMs richer material to cite when answering "is this product right for me?" queries.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentQuality',
    implementation: 'Rewrite the description to include: (1) benefit-led statements ("so you can..."), (2) emotional or experiential language for lifestyle products, or (3) precise technical terms for spec-driven products. Combine both for hybrid products. Aim for at least one benefit statement and one technical differentiator per paragraph.'
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
    implementation: 'Add a single &lt;h1&gt; tag containing the product name. This should match or closely align with the og:title.'
  },

  'multiple-h1': {
    title: 'Use single H1 heading',
    description: 'Multiple H1 headings confuse content hierarchy for LLMs.',
    impact: 'low',
    effort: 'low',
    category: 'contentStructure',
    implementation: 'Keep only one &lt;h1&gt; for the product name. Convert other H1s to H2 or lower.'
  },

  'semantic-html-missing': {
    title: 'Use semantic HTML elements',
    description: 'Semantic HTML helps LLMs understand content structure and importance.',
    impact: 'medium',
    effort: 'medium',
    category: 'contentStructure',
    implementation: 'Wrap main product content in &lt;main&gt; or &lt;article&gt;. Use &lt;section&gt; for distinct content areas. Use &lt;nav&gt; for navigation.'
  },

  'primary-image-alt-missing': {
    title: 'Add alt text to primary product image',
    description: 'Missing alt text limits product visibility when LLMs describe images.',
    impact: 'medium',
    effort: 'low',
    category: 'contentStructure',
    implementation: 'Add descriptive alt text to the main product image. Include product name, key features, and color/variant.'
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
    description: 'Specification data in properly marked-up tables is significantly easier for LLMs to parse and cite than plain-text lists.',
    impact: 'medium',
    effort: 'low',
    category: 'contentStructure',
    implementation: 'Replace plain-text spec lists with an HTML &lt;table&gt; using &lt;th&gt; headers and &lt;td&gt; data cells. Use &lt;thead&gt; and &lt;tbody&gt;. A two-column table of "Spec | Value" pairs is the ideal AI-parseable format.'
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

  'reviews-low-count': {
    title: 'Increase review count',
    description: 'More reviews increase confidence when LLMs recommend products.',
    impact: 'medium',
    effort: 'high',
    category: 'authorityTrust',
    implementation: 'Encourage customers to leave reviews via follow-up emails, review incentives, or simplified review processes.'
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
    description: 'Short or minimal reviews provide little context for LLMs to extract useful product insights. Longer reviews (100+ chars) are more likely to be cited.',
    impact: 'low',
    effort: 'medium',
    category: 'authorityTrust',
    implementation: 'Ask specific questions in review prompts: "What did you use this product for?", "What surprised you?", "Who would you recommend this to?". Structured prompts consistently produce longer, more useful reviews. Display character counts as encouragement.'
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
    description: 'Certifications build trust that LLMs factor into recommendations.',
    impact: 'low',
    effort: 'low',
    category: 'authorityTrust',
    implementation: 'List relevant certifications (safety, organic, eco-friendly) prominently on the page.'
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
    description: 'No llms.txt file found. This emerging standard helps AI systems understand how to interact with your site and what content is available.',
    impact: 'medium',
    effort: 'low',
    category: 'aiDiscoverability',
    implementation: 'Create /llms.txt at your domain root with site description, key content areas, and AI-friendly guidelines. Optionally create /llms-full.txt with more detailed instructions. See llmstxt.org for the specification.'
  },

  'entity-consistency-low': {
    title: 'Align product name across page elements',
    description: 'The product name in your schema markup doesn\'t consistently match the H1, og:title, and meta description. LLMs cross-reference these elements to verify entity identity.',
    impact: 'medium',
    effort: 'low',
    category: 'aiDiscoverability',
    implementation: 'Ensure the Product schema name, H1 heading, og:title, page title, and meta description all reference the same product name consistently. Minor variations (e.g., abbreviations) are acceptable but the core product name should be identical.'
  },

  'answer-format-missing': {
    title: 'Add AI-citable answer-format content',
    description: 'Your page lacks "best for" statements, comparison content, how-to guidance, or use case descriptions that LLMs extract when answering user questions.',
    impact: 'medium',
    effort: 'medium',
    category: 'aiDiscoverability',
    implementation: 'Add content that directly answers common questions: "Best for [use case]" statements, "vs." comparison sections, "How to [use/install/set up]" guides, and specific use case descriptions (e.g., "Perfect for small apartments"). These patterns are what LLMs cite in responses.'
  },

  'product-identifiers-missing': {
    title: 'Add product identifiers (GTIN/UPC/MPN) to schema',
    description: 'Your Product schema lacks standard identifiers (GTIN, MPN, SKU). These help LLMs disambiguate products and match them to purchase queries.',
    impact: 'medium',
    effort: 'low',
    category: 'aiDiscoverability',
    implementation: 'Add at least two of: gtin (UPC/EAN/ISBN barcode number), mpn (manufacturer part number), or sku to your Product schema markup. These identifiers help AI systems confidently identify and recommend specific products.'
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
    description: 'Missing or incorrect og:type prevents platforms and LLMs from identifying this as a product page. Set to "product" or "product.item".',
    impact: 'medium',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add &lt;meta property="og:type" content="product"&gt; to the page head. For specific product variants, use "product.item". This signals to AI systems and social platforms that the page represents a purchasable product.'
  },

  'twitter-image-missing': {
    title: 'Add Twitter/X image meta tag',
    description: 'Missing twitter:image reduces product visibility when shared on Twitter/X. If og:image exists, twitter:image can reference the same URL.',
    impact: 'low',
    effort: 'low',
    category: 'protocolMeta',
    implementation: 'Add &lt;meta name="twitter:image" content="https://your-site.com/product-image.jpg"&gt;. Use the same image as og:image (JPEG or PNG, not WebP). Minimum 600x314px, ideally 1200x628px.'
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

  'comparison-missing': {
    title: 'Add product comparison content',
    description: 'Comparison content ("vs.", "compared to", "alternative to") helps LLMs recommend your product in competitive queries like "X vs Y" or "best alternative to Z".',
    impact: 'medium',
    effort: 'medium',
    category: 'contentQuality',
    implementation: 'Add a "How It Compares" or "Why Choose This" section that positions your product against alternatives. Use phrases like "compared to", "unlike", "vs.", or "better than". A comparison table with competing features is the most LLM-friendly format.'
  },

  // Additional Content Structure
  'heading-hierarchy-broken': {
    title: 'Fix heading hierarchy',
    description: 'Heading levels skip (e.g., H1 to H3) or are missing, making it harder for LLMs to parse the content structure and identify sections.',
    impact: 'low',
    effort: 'low',
    category: 'contentStructure',
    implementation: 'Ensure headings follow a logical hierarchy: H1 (product name) &gt; H2 (sections like "Features", "Specifications", "Reviews") &gt; H3 (subsections). Never skip levels (e.g., H1 to H3 without H2).'
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

/**
 * Get recommendation template by ID
 * @param {string} id - Template ID
 * @returns {Object|null} Template or null
 */
export function getRecommendationTemplate(id) {
  return RECOMMENDATION_TEMPLATES[id] || null;
}

/**
 * Get all template IDs
 * @returns {string[]} Array of template IDs
 */
export function getAllTemplateIds() {
  return Object.keys(RECOMMENDATION_TEMPLATES);
}
