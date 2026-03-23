/**
 * Scoring Weights Configuration
 * Defines category weights and context-based multipliers
 */

/**
 * Category descriptions for tooltips
 */
export const CATEGORY_DESCRIPTIONS = {
  structuredData: 'JSON-LD and schema.org markup that helps AI understand product data',
  protocolMeta: 'Technical metadata governing how AI systems and social platforms retrieve and preview your product page. Meta description and robots directives are confirmed LLM retrieval signals. Open Graph and Twitter Card tags serve social link previews — they are not processed by LLM crawlers during indexing. Content freshness (Last-Modified) is one of the most strongly documented AI citation signals.',
  contentQuality: 'Product descriptions, specifications, features, and FAQ content',
  contentStructure: 'Semantic HTML, headings, accessibility, and image alt text',
  authorityTrust: 'Reviews, ratings, brand clarity, and trust signals',
  aiDiscoverability: 'AI crawler access, entity consistency, answer-format content, product identifiers, and llms.txt for AI system discovery'
};

/**
 * Category weights (must sum to 1.0)
 */
export const CATEGORY_WEIGHTS = {
  structuredData: 0.20,    // 20% (was 23%)
  protocolMeta: 0.15,      // 15% (was 18%)
  contentQuality: 0.20,    // 20% (was 23%)
  contentStructure: 0.12,  // 12% (was 13%)
  authorityTrust: 0.13,    // 13% (unchanged)
  aiDiscoverability: 0.20  // 20% (was 10%)
};

/**
 * Context-based weight multipliers
 * Applied to specific factors based on consumer context
 */
export const CONTEXT_MULTIPLIERS = {
  want: {
    // "Want" context: emotional, lifestyle-driven purchases
    // Emphasize emotional appeal, social proof
    emotionalBenefitCopy: 1.5,
    technicalSpecifications: 0.6,
    compatibilityInfo: 0.4,
    socialProof: 1.4,
    certifications: 0.5,
    reviewCount: 1.4,
    reviewRating: 1.3,
    benefitStatements: 1.5,
    warrantyInfo: 0.7,
    comparisonContent: 0.6
  },
  need: {
    // "Need" context: functional, specification-driven purchases
    // Emphasize technical details, compatibility, certifications
    emotionalBenefitCopy: 0.5,
    technicalSpecifications: 1.5,
    compatibilityInfo: 2.0,
    socialProof: 0.8,
    certifications: 1.6,
    reviewCount: 0.8,
    reviewRating: 1.0,
    benefitStatements: 0.5,
    warrantyInfo: 1.4,
    comparisonContent: 1.4
  },
  hybrid: {
    // "Hybrid" context: balanced consideration
    // Neutral multipliers
    emotionalBenefitCopy: 1.0,
    technicalSpecifications: 1.0,
    compatibilityInfo: 1.0,
    socialProof: 1.0,
    certifications: 1.0,
    reviewCount: 1.0,
    reviewRating: 1.0,
    benefitStatements: 1.0,
    warrantyInfo: 1.0,
    comparisonContent: 1.0
  }
};

/**
 * Factor weights within each category
 */
export const FACTOR_WEIGHTS = {
  // Structured Data (20% of total)
  structuredData: {
    productSchema: 30,      // Critical
    offerSchema: 20,        // Critical
    aggregateRating: 15,
    reviewSchema: 10,
    faqSchema: 10,
    breadcrumbSchema: 5,
    organizationSchema: 5,
    imageSchema: 5
  },

  // Protocol & Meta Compliance (15% of total)
  protocolMeta: {
    ogImage: 15,            // Social/preview only; no confirmed LLM chat citation role
    ogImageFormat: 5,       // Keep — compatibility advisory for social sharing
    ogTitle: 8,             // Social Open Graph only; <title> and H1 are LLM signals
    ogDescription: 8,       // Social Open Graph only; <meta name="description"> is confirmed
    ogType: 4,              // No LLM evidence; minimal social value
    twitterCard: 5,         // Social only; zero LLM provider documentation
    twitterImage: 3,        // Social only
    canonical: 10,          // Keep — indirect value via Bing (powers 87% of ChatGPT Search)
    metaDescription: 20,    // Confirmed LLM retrieval signal
    robotsAllowsIndex: 10,  // Confirmed: OpenAI, PerplexityBot both respect noindex
    lastModified: 12        // Ahrefs: 25.7% fresher content in AI citations
  },

  // Content Quality (20% of total) — must sum to 100
  contentQuality: {
    descriptionLength: 10,   // was 15 — reduced to fund factualSpecificity
    descriptionQuality: 5,   // was 10 — reduced to fund factualSpecificity; Contextual
    factualSpecificity: 10,  // NEW — GEO paper (ACM SIGKDD 2024): statistics addition boosts AI visibility +40%
    specificationCount: 10,  // Contextual
    specificationDetail: 5,  // Contextual
    featureCount: 10,
    faqPresence: 10,
    dimensions: 5,           // Contextual
    materials: 5,
    careInstructions: 3,
    warrantyInfo: 7,         // Contextual
    compatibilityInfo: 10,   // Contextual
    comparisonContent: 10    // Contextual (was 5, rebalanced to sum to 100)
  },

  // Content Structure (12% of total) — must sum to 100
  contentStructure: {
    h1Presence: 15,
    headingHierarchy: 12,
    semanticHTML: 12,
    contentRatio: 8,         // was 12, reduced — LLMs don't penalize chrome ratio
    tableStructure: 7,       // was 10, reduced
    listStructure: 8,
    ariaLabels: 3,           // was 6, reduced — accessibility, not AI citation
    primaryImageAlt: 10,
    allImagesAlt: 8,
    jsDependency: 10,
    readability: 7           // was 8, reduced
  },

  // Authority & Trust (13% of total)
  authorityTrust: {
    reviewCount: 22,         // Contextual
    averageRating: 20,       // Contextual
    reviewRecency: 12,
    reviewDepth: 10,
    brandClarity: 12,
    certifications: 10,      // Contextual
    awards: 2,
    contentFreshness: 5,
    socialProofDepth: 4,
    expertAttribution: 3
  },

  // AI Discoverability (20% of total)
  aiDiscoverability: {
    aiCrawlerAccess: 30,       // robots.txt rules for major AI bots
    entityConsistency: 25,     // Product name alignment across schema, H1, og:title, meta description
    answerFormatContent: 20,   // "Best for", comparison, how-to, use case content
    productIdentifiers: 15,    // GTIN/UPC/MPN in Product schema
    llmsTxtPresence: 10        // /llms.txt and /llms-full.txt presence
  }
};

/**
 * Grading thresholds
 */
export const GRADE_THRESHOLDS = {
  A: 90,
  B: 80,
  C: 70,
  D: 60,
  F: 0
};

/**
 * Get grade from score
 * @param {number} score - Score 0-100
 * @returns {string} Grade A-F
 */
export function getGrade(score) {
  if (score >= GRADE_THRESHOLDS.A) return 'A';
  if (score >= GRADE_THRESHOLDS.B) return 'B';
  if (score >= GRADE_THRESHOLDS.C) return 'C';
  if (score >= GRADE_THRESHOLDS.D) return 'D';
  return 'F';
}

/**
 * Get grade description
 * @param {string} grade - Letter grade
 * @returns {string} Description
 */
export function getGradeDescription(grade) {
  const descriptions = {
    A: 'Excellent LLM visibility; minor optimizations possible',
    B: 'Good foundation; specific gaps to address',
    C: 'Average visibility; significant opportunities',
    D: 'Below average; multiple critical issues',
    F: 'Poor visibility; fundamental changes needed'
  };
  return descriptions[grade] || '';
}

/**
 * Get context multiplier for a factor
 * @param {string} context - Consumer context (want/need/hybrid)
 * @param {string} factor - Factor name
 * @returns {number} Multiplier
 */
export function getContextMultiplier(context, factor) {
  return CONTEXT_MULTIPLIERS[context]?.[factor] || 1.0;
}

// ==========================================
// PDP QUALITY SCORING CONSTANTS
// ==========================================

/**
 * PDP Quality category descriptions
 */
export const PDP_CATEGORY_DESCRIPTIONS = {
  purchaseExperience: 'Price visibility, CTA buttons, discounts, payment methods, and urgency signals that drive conversion',
  trustConfidence: 'Return policy, shipping info, trust badges, secure checkout, and guarantees that build buyer confidence',
  visualPresentation: 'Product images, video, gallery features, lifestyle imagery, variant swatches, and image quality',
  contentCompleteness: 'Variant selectors, size guides, related products, Q&A sections, content organization, and package contents',
  reviewsSocialProof: 'Review display, star ratings, sorting/filtering, customer media, social proof indicators, and review volume'
};

/**
 * PDP Quality category weights (must sum to 1.0)
 */
export const PDP_CATEGORY_WEIGHTS = {
  purchaseExperience: 0.25,   // 25%
  trustConfidence: 0.20,      // 20%
  visualPresentation: 0.20,   // 20%
  contentCompleteness: 0.15,  // 15%
  reviewsSocialProof: 0.20    // 20%
};

/**
 * PDP Quality factor weights within each category
 */
export const PDP_FACTOR_WEIGHTS = {
  purchaseExperience: {
    priceVisibility: 20,
    ctaButtonPresence: 20,
    ctaClarity: 15,
    discountSaleMessaging: 15,
    paymentMethodIndicators: 15,
    urgencyScarcitySignals: 15
  },
  trustConfidence: {
    returnPolicyDisplay: 20,
    shippingInformation: 20,
    trustBadges: 20,
    secureCheckoutSignals: 15,
    customerServiceIndicators: 15,
    guaranteeWarrantyDisplay: 10
  },
  visualPresentation: {
    productImageCount: 20,
    videoPresence: 15,
    imageGalleryFeatures: 15,
    lifestyleContextImages: 15,
    colorVariantSwatches: 20,
    imageQualitySignals: 15
  },
  contentCompleteness: {
    productVariantDisplay: 20,
    sizeGuideFitInfo: 15,
    relatedRecommendedProducts: 15,
    qaSection: 15,
    productDetailsOrganization: 15,
    whatsInTheBox: 20
  },
  reviewsSocialProof: {
    reviewDisplayProminence: 20,
    starRatingVisual: 15,
    reviewSortingFiltering: 15,
    photoVideoReviews: 20,
    socialProofIndicators: 15,
    reviewCountThreshold: 15
  }
};

/**
 * PDP Quality context multipliers
 */
export const PDP_CONTEXT_MULTIPLIERS = {
  want: {
    lifestyleContextImages: 1.4,
    colorVariantSwatches: 1.3,
    photoVideoReviews: 1.3,
    socialProofIndicators: 1.4,
    urgencyScarcitySignals: 1.3,
    sizeGuideFitInfo: 0.7,
    whatsInTheBox: 0.7,
    videoPresence: 1.2
  },
  need: {
    lifestyleContextImages: 0.7,
    colorVariantSwatches: 0.8,
    photoVideoReviews: 0.9,
    socialProofIndicators: 0.8,
    urgencyScarcitySignals: 0.7,
    sizeGuideFitInfo: 1.4,
    whatsInTheBox: 1.4,
    productVariantDisplay: 1.3,
    videoPresence: 1.3
  },
  hybrid: {}
};

/**
 * Get PDP Quality context multiplier
 */
export function getPdpContextMultiplier(context, factor) {
  return PDP_CONTEXT_MULTIPLIERS[context]?.[factor] || 1.0;
}

/**
 * PDP Quality grade description
 */
export function getPdpGradeDescription(grade) {
  const descriptions = {
    A: 'Excellent shopping experience; highly optimized for conversion',
    B: 'Good shopping experience; minor improvements possible',
    C: 'Average shopping experience; notable gaps to address',
    D: 'Below average; multiple shopping experience issues',
    F: 'Poor shopping experience; fundamental improvements needed'
  };
  return descriptions[grade] || '';
}

/**
 * PDP Quality factor-to-recommendation mapping
 */
export const PDP_FACTOR_RECOMMENDATIONS = {
  // Purchase Experience
  'Price Visibility': 'pdp-price-missing',
  'CTA Button Presence': 'pdp-cta-missing',
  'CTA Clarity': 'pdp-cta-unclear',
  'Discount/Sale Messaging': 'pdp-discount-missing',
  'Payment Method Indicators': 'pdp-payment-methods-missing',
  'Urgency/Scarcity Signals': 'pdp-urgency-missing',
  // Trust & Confidence
  'Return Policy Display': 'pdp-return-policy-missing',
  'Shipping Information': 'pdp-shipping-missing',
  'Trust Badges': 'pdp-trust-badges-missing',
  'Secure Checkout Signals': 'pdp-secure-checkout-missing',
  'Customer Service Indicators': 'pdp-customer-service-missing',
  'Guarantee/Warranty Display': 'pdp-guarantee-missing',
  // Visual Presentation
  'Product Image Count': 'pdp-images-low',
  'Video Presence': 'pdp-video-missing',
  'Image Gallery Features': 'pdp-gallery-basic',
  'Lifestyle/Context Images': 'pdp-lifestyle-images-missing',
  'Color/Variant Swatches': 'pdp-swatches-missing',
  'Image Quality Signals': 'pdp-image-quality-low',
  // Content Completeness
  'Product Variant Display': 'pdp-variants-missing',
  'Size Guide/Fit Info': 'pdp-size-guide-missing',
  'Related/Recommended Products': 'pdp-related-products-missing',
  'Q&A Section': 'pdp-qa-missing',
  'Product Details Organization': 'pdp-details-unorganized',
  '"What\'s in the Box"': 'pdp-whats-in-box-missing',
  // Reviews & Social Proof
  'Review Display Prominence': 'pdp-reviews-not-prominent',
  'Star Rating Visual': 'pdp-star-visual-missing',
  'Review Sorting/Filtering': 'pdp-review-sort-missing',
  'Photo/Video Reviews': 'pdp-review-media-missing',
  'Social Proof Indicators': 'pdp-social-proof-missing',
  'Review Count Threshold': 'pdp-review-count-low'
};

/**
 * Factor name to recommendation template ID mapping
 * Links factor display names to their corresponding recommendation templates
 */
export const FACTOR_RECOMMENDATIONS = {
  // Structured Data
  'Product Schema': 'product-schema-missing',
  'Offer Schema': 'offer-schema-missing',
  'AggregateRating Schema': 'rating-schema-missing',
  'Review Schema': 'review-schema-missing',
  'FAQ Schema': 'faq-schema-missing',
  'Breadcrumb Schema': 'breadcrumb-schema-missing',
  'Organization/Brand Schema': 'organization-schema-missing',
  'ImageObject Schema': 'image-schema-missing',

  // Protocol & Meta
  'og:image Present': 'og-image-missing',
  'og:image Format': 'og-image-webp',
  'og:title': 'og-title-missing',
  'og:description': 'og-description-missing',
  'og:type = product': 'og-type-missing',
  'Twitter Card': 'twitter-card-missing',
  'Twitter Image': 'twitter-image-missing',
  'Canonical URL': 'canonical-missing',
  'Meta Description': 'meta-description-missing',
  'Robots Allows Indexing': 'robots-blocking',

  // Content Quality
  'Description Length': 'description-short',
  'Description Quality': 'description-quality-low',
  'Factual Specificity': 'factual-specificity-low',
  'Specifications': 'specs-missing',
  'Specification Detail': 'spec-detail-low',
  'Features List': 'features-missing',
  'FAQ Section': 'faq-content-missing',
  'Dimensions/Size': 'dimensions-missing',
  'Materials': 'materials-missing',
  'Care Instructions': 'care-instructions-missing',
  'Warranty Information': 'warranty-missing',
  'Compatibility Information': 'compatibility-missing',
  'Comparison Content': 'comparison-missing',

  // Content Structure
  'H1 Heading': 'h1-missing',
  'H1 Heading (Multiple)': 'multiple-h1',
  'Heading Hierarchy': 'heading-hierarchy-broken',
  'Semantic HTML': 'semantic-html-missing',
  'Content-to-Chrome Ratio': 'content-ratio-low',
  'Table Structure': 'table-structure-missing',
  'List Structure': 'list-structure-missing',
  'ARIA Labels': 'aria-labels-missing',
  'Primary Image Alt Text': 'primary-image-alt-missing',
  'Image Alt Coverage': 'images-alt-low',
  'Readability': 'readability-low',
  'JavaScript Dependency': 'js-dependency-high',

  // Authority & Trust
  'Review Count': 'reviews-missing',
  'Average Rating': 'rating-low',
  'Review Recency': 'review-recency-low',
  'Review Depth': 'review-depth-low',
  'Brand Clarity': 'brand-unclear',
  'Certifications': 'certifications-missing',
  'Awards': 'awards-missing',
  'Content Freshness': 'content-stale',
  'Social Proof Depth': 'social-proof-missing',
  'Expert Attribution': 'expert-attribution-missing',

  // AI Discoverability
  'AI Crawler Access': 'ai-crawler-blocked',
  'Entity Consistency': 'entity-consistency-low',
  'Answer-Format Content': 'answer-format-missing',
  'Product Identifiers': 'product-identifiers-missing',
  'llms.txt Presence': 'llms-txt-missing'
};

// ==========================================
// SEO QUALITY SCORING CONSTANTS
// ==========================================

/**
 * SEO Quality category descriptions
 */
export const SEO_CATEGORY_DESCRIPTIONS = {
  titleMeta: 'Title tag and meta description presence, length, and product name alignment',
  technicalFoundations: 'Indexability, canonical URL, schema markup, and JavaScript dependency',
  contentSignals: 'Content length, heading structure, image accessibility, readability, and URL quality',
  navigationDiscovery: 'Breadcrumb navigation, H1 alignment, internal links, and hreflang configuration'
};

/**
 * SEO Quality category weights (must sum to 1.0)
 */
export const SEO_CATEGORY_WEIGHTS = {
  titleMeta: 0.25,
  technicalFoundations: 0.25,
  contentSignals: 0.25,
  navigationDiscovery: 0.25
};

/**
 * SEO Quality factor weights within each category (each sums to 100)
 */
export const SEO_FACTOR_WEIGHTS = {
  titleMeta: {
    titleTagPresent: 20,
    titleLengthOptimal: 20,
    metaDescriptionPresent: 20,
    metaDescriptionLength: 20,
    productNameInTitle: 20
  },
  technicalFoundations: {
    pageIndexable: 25,
    canonicalValid: 20,
    productSchemaPresent: 20,
    breadcrumbSchemaPresent: 15,
    lowJsDependency: 20
  },
  contentSignals: {
    sufficientContentLength: 25,
    headingStructure: 20,
    imageAltCoverage: 20,
    contentReadability: 20,
    urlSlugQuality: 15
  },
  navigationDiscovery: {
    breadcrumbNavigation: 30,
    h1ProductNameAlignment: 25,
    internalLinkPresence: 25,
    hreflangConfiguration: 20
  }
};

/**
 * SEO Quality grade description
 */
export function getSeoGradeDescription(grade) {
  const descriptions = {
    A: 'Excellent SEO foundation; well-optimised for organic search',
    B: 'Good SEO foundation; minor improvements possible',
    C: 'Average SEO health; notable gaps to address',
    D: 'Below average SEO; multiple technical issues found',
    F: 'Poor SEO health; fundamental fixes needed'
  };
  return descriptions[grade] || '';
}

/**
 * SEO Quality factor-to-recommendation mapping
 */
export const SEO_FACTOR_RECOMMENDATIONS = {
  // Title & Meta
  'Title Tag Present': 'seo-title-missing',
  'Title Length Optimal': 'seo-title-length',
  'Meta Description Present': 'seo-meta-desc-missing',
  'Meta Description Length': 'seo-meta-desc-length',
  'Product Name in Title': 'seo-product-name-title',
  // Technical Foundations
  'Page Indexable': 'seo-noindex',
  'Canonical URL Valid': 'seo-canonical',
  'Product Schema Present': 'seo-product-schema',
  'Breadcrumb Schema Present': 'seo-breadcrumb-schema',
  'Low JS Dependency': 'seo-js-dependency',
  // Content Signals
  'Sufficient Content Length': 'seo-content-length',
  'Heading Structure': 'seo-heading-structure',
  'Image Alt Coverage': 'seo-image-alt',
  'Content Readability': 'seo-readability',
  'URL Slug Quality': 'seo-url-slug',
  // Navigation & Discovery
  'Breadcrumb Navigation': 'seo-breadcrumb-nav',
  'H1–Product Name Alignment': 'seo-h1-alignment',
  'Internal Link Presence': 'seo-internal-links',
  'Hreflang Configuration': 'seo-hreflang'
};
