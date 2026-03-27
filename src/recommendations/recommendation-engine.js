/**
 * Recommendation Engine
 * Generates prioritized recommendations based on scoring results
 */

import { calculatePriority, RECOMMENDATION_TEMPLATES, PDP_RECOMMENDATION_TEMPLATES, SEO_RECOMMENDATION_TEMPLATES } from './recommendation-rules.js';
import { getContextMultiplier, getPdpContextMultiplier } from '../scoring/weights.js';
import { ScoringEngine } from '../scoring/scoring-engine.js';

/**
 * Shared sort comparator for all three recommendation engines.
 * Sorts by impact descending (high→medium→low), then effort ascending (low→medium→high).
 */
function sortRecommendations(recommendations) {
  const valid = recommendations.filter(r => r !== null);
  const impactOrder = { high: 0, medium: 1, low: 2 };
  const effortOrder = { low: 0, medium: 1, high: 2 };
  return valid.sort((a, b) => {
    const impactDiff = (impactOrder[a.impact] ?? 2) - (impactOrder[b.impact] ?? 2);
    if (impactDiff !== 0) return impactDiff;
    return (effortOrder[a.effort] ?? 1) - (effortOrder[b.effort] ?? 1);
  });
}

/**
 * Recommendation Engine class
 */
export class RecommendationEngine {
  /**
   * @param {Object} scoreResult - Result from ScoringEngine
   * @param {Object} extractedData - Raw extracted data
   * @param {Object} imageVerification - og:image verification result
   */
  constructor(scoreResult, extractedData, imageVerification = null) {
    this.scoreResult = scoreResult;
    this.extractedData = extractedData;
    this.imageVerification = imageVerification;
    this.context = scoreResult.context || 'hybrid';
    this.isApparel = ScoringEngine.isLikelyApparel(extractedData);
  }

  /**
   * Generate all recommendations
   * @returns {Array} Sorted array of recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Check each category for issues
    recommendations.push(...this.checkProtocolMetaIssues());
    recommendations.push(...this.checkStructuredDataIssues());
    recommendations.push(...this.checkContentQualityIssues());
    recommendations.push(...this.checkContentStructureIssues());
    recommendations.push(...this.checkAuthorityTrustIssues());
    recommendations.push(...this.checkAIDiscoverabilityIssues());

    return this.prioritizeRecommendations(recommendations);
  }

  /**
   * Check Protocol & Meta issues
   */
  checkProtocolMetaIssues() {
    const recs = [];
    const og = this.extractedData.metaTags?.openGraph || {};
    const robots = this.extractedData.metaTags?.robots || {};
    const twitter = this.extractedData.metaTags?.twitterCards || {};
    const canonical = this.extractedData.metaTags?.canonical || {};
    const standard = this.extractedData.metaTags?.standard || {};

    // CRITICAL: Robots blocking (meta noindex)
    if (robots.noindex) {
      recs.push(this.createRecommendation('robots-blocking'));
    }

    // CRITICAL: og:image missing
    if (!og.image) {
      recs.push(this.createRecommendation('og-image-missing'));
    } else {
      // og:image is WebP — low-priority compatibility advisory (see DEC-0029)
      if (this.imageVerification?.isWebP) {
        recs.push(this.createRecommendation('og-image-webp', {
          currentUrl: og.image,
          currentFormat: 'WebP'
        }));
      }
    }

    // og:title missing
    if (!og.title) {
      recs.push(this.createRecommendation('og-title-missing'));
    }

    // og:description missing
    if (!og.description) {
      recs.push(this.createRecommendation('og-description-missing'));
    }

    // Twitter Card missing
    if (!twitter.card) {
      recs.push(this.createRecommendation('twitter-card-missing'));
    }

    // og:type missing or not product — mirror scorer's isProductType check
    if (!og.type || (og.type !== 'product' && og.type !== 'og:product' && !og.type.startsWith('product.'))) {
      recs.push(this.createRecommendation('og-type-missing'));
    }

    // Twitter image missing
    if (twitter.card && !twitter.image) {
      recs.push(this.createRecommendation('twitter-image-missing'));
    }

    // Canonical URL issues
    if (!canonical.present) {
      recs.push(this.createRecommendation('canonical-missing'));
    }

    // Meta description missing
    if (!standard.description) {
      recs.push(this.createRecommendation('meta-description-missing'));
    }

    return recs;
  }

  /**
   * Check Structured Data issues
   */
  checkStructuredDataIssues() {
    const recs = [];
    const schemas = this.extractedData.structuredData?.schemas || {};

    // Product schema missing
    if (!schemas.product) {
      recs.push(this.createRecommendation('product-schema-missing'));
    }

    // Offer schema missing (if Product exists but no Offer)
    if (schemas.product && !schemas.offer) {
      recs.push(this.createRecommendation('offer-schema-missing'));
    }

    // Rating schema missing (if reviews exist but no schema)
    if (!schemas.aggregateRating) {
      const reviews = this.extractedData.trustSignals?.reviews || {};
      if (reviews.count > 0) {
        recs.push(this.createRecommendation('rating-schema-missing'));
      }
    }

    // FAQ schema missing or page-level only
    const faqContent = this.extractedData.contentQuality?.faq || {};
    const faqSchemaScope = schemas.faq?.scope || null;
    const faqContentScope = faqContent.scope || null;
    const faqIsPageLevel = faqSchemaScope === 'page' || (!schemas.faq && faqContentScope === 'page');
    if (faqIsPageLevel) {
      // FAQ exists but is page-level (not product-specific) — recommend adding product FAQ
      recs.push(this.createRecommendation('faq-not-product-specific'));
    } else if (!schemas.faq && faqContent.count > 0) {
      recs.push(this.createRecommendation('faq-schema-missing'));
    } else if (!schemas.faq && faqContent.count === 0) {
      // No FAQ content and no schema - recommend adding both
      recs.push({
        id: 'faq-schema-and-content-missing',
        title: 'Add FAQ section with schema markup',
        description: 'Adding FAQ content with schema helps LLMs answer common questions.',
        impact: 'medium',
        effort: 'medium',
        category: 'structuredData',
        priority: calculatePriority('medium', 'medium'),
        implementation: 'Create a FAQ section with 5+ questions, then add FAQPage schema markup.'
      });
    }

    // Breadcrumb schema missing
    if (!schemas.breadcrumb) {
      recs.push(this.createRecommendation('breadcrumb-schema-missing'));
    }

    return recs;
  }

  /**
   * Check Content Quality issues
   */
  checkContentQualityIssues() {
    const recs = [];
    const desc = this.extractedData.contentQuality?.description || {};
    const specs = this.extractedData.contentQuality?.specifications || {};
    const features = this.extractedData.contentQuality?.features || {};
    const faq = this.extractedData.contentQuality?.faq || {};
    const details = this.extractedData.contentQuality?.productDetails || {};

    // Description too short (< 100 words)
    if (desc.wordCount < 100) {
      const template = RECOMMENDATION_TEMPLATES['description-short'];
      recs.push({
        ...template,
        id: 'description-short',
        priority: calculatePriority(template.impact, template.effort),
        currentState: `${desc.wordCount} words`,
        targetState: '200+ words'
      });
    }

    // Specifications missing or low
    if (specs.count < 5) {
      // Contextual - more important for "need" context
      const multiplier = getContextMultiplier(this.context, 'technicalSpecifications');
      const impact = multiplier > 1 ? 'high' : 'medium';

      recs.push({
        id: 'specs-low',
        title: 'Add more specifications',
        description: 'Detailed specifications help LLMs answer technical comparison questions.',
        impact,
        effort: 'medium',
        category: 'contentQuality',
        priority: calculatePriority(impact, 'medium'),
        contextual: true,
        currentState: `${specs.count} specs`,
        targetState: '10+ specs'
      });
    }

    // Features missing
    if (features.count < 3) {
      recs.push(this.createRecommendation('features-missing'));
    }

    // FAQ content missing (skip if count === 0 — covered by structured data check;
    // skip if page-level — covered by faq-not-product-specific recommendation)
    if (faq.count > 0 && faq.count < 3 && faq.scope !== 'page') {
      recs.push(this.createRecommendation('faq-content-missing'));
    }

    // Compatibility info missing (skip for apparel; more important for "need" context)
    if (!details.hasCompatibility && !this.isApparel) {
      const multiplier = getContextMultiplier(this.context, 'compatibilityInfo');
      if (multiplier > 1) {
        recs.push({
          ...this.createRecommendation('compatibility-missing'),
          impact: 'high',
          priority: calculatePriority('high', 'low')
        });
      } else {
        recs.push(this.createRecommendation('compatibility-missing'));
      }
    }

    // Description quality low — qualityScore is not produced by the extractor;
    // check the underlying signals it computes from instead
    if (desc.wordCount >= 100 && !desc.hasBenefitStatements && !desc.hasTechnicalTerms) {
      recs.push(this.createRecommendation('description-quality-low'));
    }

    // Materials missing (only relevant for physical/apparel products)
    if (!details.hasMaterials && this.isApparel) {
      recs.push(this.createRecommendation('materials-missing'));
    }

    // Care instructions missing (only relevant for apparel products)
    if (!details.hasCareInstructions && this.isApparel) {
      recs.push(this.createRecommendation('care-instructions-missing'));
    }

    // Dimensions missing (skip for apparel — size charts suffice)
    if (!details.hasDimensions && !this.isApparel) {
      recs.push(this.createRecommendation('dimensions-missing'));
    }

    // Warranty info missing (skip for apparel — return policy suffices)
    if (!details.hasWarranty && !this.isApparel) {
      const multiplier = getContextMultiplier(this.context, 'warrantyInfo');
      if (multiplier > 1) {
        recs.push({
          ...this.createRecommendation('warranty-missing'),
          impact: 'medium',
          priority: calculatePriority('medium', 'low'),
          contextual: true
        });
      } else {
        recs.push(this.createRecommendation('warranty-missing'));
      }
    }

    return recs;
  }

  /**
   * Check Content Structure issues
   */
  checkContentStructureIssues() {
    const recs = [];
    const headings = this.extractedData.contentStructure?.headings || {};
    const semantic = this.extractedData.contentStructure?.semanticHTML || {};
    const images = this.extractedData.contentStructure?.images || {};

    // H1 missing
    if (!headings.hasH1) {
      recs.push(this.createRecommendation('h1-missing'));
    }

    // Multiple H1s
    if (headings.h1?.count > 1) {
      recs.push(this.createRecommendation('multiple-h1'));
    }

    // Semantic HTML missing
    if (!semantic.hasMain && !semantic.hasArticle) {
      recs.push(this.createRecommendation('semantic-html-missing'));
    }

    // Primary image alt missing
    if (images.primaryImage && !images.primaryImage.hasAlt) {
      recs.push(this.createRecommendation('primary-image-alt-missing'));
    }

    // Low image alt coverage
    if (images.altCoverage < 0.8 && images.totalCount > 3) {
      recs.push({
        ...this.createRecommendation('images-alt-low'),
        currentState: `${Math.round(images.altCoverage * 100)}% coverage`,
        targetState: '90%+ coverage'
      });
    }

    // Heading hierarchy issues
    if (headings.hierarchyIssues?.length > 0) {
      recs.push({
        id: 'heading-hierarchy',
        title: 'Fix heading hierarchy',
        description: 'Proper heading hierarchy helps LLMs understand content structure.',
        impact: 'low',
        effort: 'low',
        category: 'contentStructure',
        priority: calculatePriority('low', 'low'),
        details: headings.hierarchyIssues.join('; ')
      });
    }

    return recs;
  }

  /**
   * Check Authority & Trust issues
   */
  checkAuthorityTrustIssues() {
    const recs = [];
    const reviews = this.extractedData.trustSignals?.reviews || {};
    const brand = this.extractedData.trustSignals?.brand || {};
    const certs = this.extractedData.trustSignals?.certifications || {};

    // Third-party JS review platform detected with no schema output — takes priority
    // over generic reviews-missing rec since the cause and fix are different
    const reviewPlatform = this.extractedData.pdpQuality?.reviewsSocialProof?.reviewPlatform;
    const hasAggregateRating = !!this.extractedData.structuredData?.schemas?.aggregateRating;
    if (reviewPlatform && !hasAggregateRating) {
      recs.push({
        ...this.createRecommendation('review-platform-no-schema'),
        description: `${reviewPlatform} is detected as your review platform but is not outputting aggregateRating structured data. Search engines and AI systems read review counts and ratings from JSON-LD schema — not from JavaScript-rendered widgets. Without it, your reviews are invisible to Google and LLMs regardless of how many you have.`
      });
    }

    // No reviews
    if (!reviews.hasReviews || reviews.count === 0) {
      if (!reviewPlatform) recs.push(this.createRecommendation('reviews-missing'));
    } else if (reviews.count < 10) {
      // Low review count - contextual importance
      const multiplier = getContextMultiplier(this.context, 'reviewCount');
      const impact = multiplier > 1 ? 'high' : 'medium';

      const base = this.createRecommendation('reviews-low-count');
      if (base) {
        recs.push({
          ...base,
          impact,
          priority: calculatePriority(impact, 'high'),
          currentState: `${reviews.count} reviews`,
          targetState: '50+ reviews'
        });
      }
    }

    // Brand unclear
    if (!brand.name || brand.clarity === 'missing') {
      recs.push(this.createRecommendation('brand-unclear'));
    } else if (brand.clarity === 'present' && !brand.inH1 && !brand.inTitle) {
      recs.push({
        id: 'brand-visibility',
        title: 'Improve brand visibility',
        description: 'Add brand name to H1 heading and page title for clearer attribution.',
        impact: 'low',
        effort: 'low',
        category: 'authorityTrust',
        priority: calculatePriority('low', 'low')
      });
    }

    // Certifications missing (more important for "need" context)
    if (!certs.found) {
      const multiplier = getContextMultiplier(this.context, 'certifications');
      if (multiplier > 1) {
        recs.push({
          ...this.createRecommendation('certifications-missing'),
          impact: 'medium',
          priority: calculatePriority('medium', 'low'),
          contextual: true
        });
      }
    }

    // Review recency — reads flat extractor properties (not nested .recency sub-object)
    if (reviews.hasReviews && reviews.count > 0) {
      // Only fire when recency is positively known to be stale (null = no dates found = skip)
      if (reviews.hasRecentReviews === false) {
        recs.push(this.createRecommendation('review-recency-low'));
      }

      // Review depth
      if (reviews.averageReviewLength !== undefined && reviews.averageReviewLength < 100) {
        recs.push(this.createRecommendation('review-depth-low'));
      }
    }

    // Awards — only recommend when context multiplier boosts it (want/need), not universally
    const awards = this.extractedData.trustSignals?.awards || {};
    if (!awards.found) {
      const multiplier = getContextMultiplier(this.context, 'certifications'); // proxy for authority signals
      if (multiplier > 1) {
        recs.push(this.createRecommendation('awards-missing'));
      }
    }

    const trustFactors = this.scoreResult.categoryScores?.authorityTrust?.factors || [];
    for (const factor of trustFactors) {
      if (factor.name === 'Social Proof Depth' && factor.status === 'fail') {
        recs.push(this.createRecommendation('social-proof-missing'));
      }
      if (factor.name === 'Expert Attribution' && factor.status === 'fail') {
        recs.push(this.createRecommendation('expert-attribution-missing'));
      }
    }

    return recs;
  }

  /**
   * Check AI Discoverability issues
   */
  checkAIDiscoverabilityIssues() {
    const recs = [];
    const aiDisc = this.scoreResult.categoryScores?.aiDiscoverability;
    if (!aiDisc) return recs;

    for (const factor of aiDisc.factors || []) {
      if (factor.name === 'AI Crawler Access' && factor.status === 'fail') {
        recs.push(this.createRecommendation('ai-crawler-blocked'));
      } else if (factor.name === 'AI Crawler Access' && factor.status === 'warning' && factor.points < factor.maxPoints * 0.5) {
        recs.push(this.createRecommendation('ai-crawler-blocked'));
      }

      if (factor.name === 'Entity Consistency' && (factor.status === 'fail' || factor.status === 'warning')) {
        recs.push(this.createRecommendation('entity-consistency-low'));
      }

      if (factor.name === 'Answer-Format Content' && factor.status === 'fail') {
        recs.push(this.createRecommendation('answer-format-missing'));
      }

      if (factor.name === 'Product Identifiers' && factor.status === 'fail') {
        recs.push(this.createRecommendation('product-identifiers-missing'));
      }

      if (factor.name === 'llms.txt Presence' && factor.status === 'fail') {
        recs.push(this.createRecommendation('llms-txt-missing'));
      }

      if (factor.name === 'Content Freshness' && (factor.status === 'fail' || factor.status === 'warning')) {
        recs.push(this.createRecommendation('content-freshness-stale'));
      }
    }

    return recs;
  }

  /**
   * Create a recommendation from a template
   * @param {string} templateId - Template ID
   * @param {Object} extras - Additional properties to merge
   * @returns {Object} Recommendation object
   */
  createRecommendation(templateId, extras = {}) {
    const template = RECOMMENDATION_TEMPLATES[templateId];
    if (!template) {
      console.warn(`Unknown recommendation template: ${templateId}`);
      return null;
    }

    return {
      id: templateId,
      title: template.title,
      description: template.description,
      impact: template.impact,
      effort: template.effort,
      category: template.category,
      priority: calculatePriority(template.impact, template.effort),
      implementation: template.implementation,
      ...extras
    };
  }

  /**
   * Prioritize and sort recommendations
   * @param {Array} recommendations - Array of recommendations
   * @returns {Array} Sorted recommendations
   */
  prioritizeRecommendations(recommendations) {
    return sortRecommendations(recommendations);
  }

}

// ==========================================
// PDP QUALITY RECOMMENDATION ENGINE
// ==========================================

/**
 * PDP Quality Recommendation Engine class
 * Generates prioritized recommendations for PDP shopping experience issues
 */
export class PdpQualityRecommendationEngine {
  /**
   * @param {Object} pdpScoreResult - Result from ScoringEngine.calculatePdpQualityScore()
   * @param {Object} extractedData - Raw extracted data (includes pdpQuality key)
   */
  constructor(pdpScoreResult, extractedData) {
    this.scoreResult = pdpScoreResult;
    this.extractedData = extractedData;
    this.pdpData = extractedData.pdpQuality || {};
    this.context = pdpScoreResult.context || 'hybrid';
    this.isPlp = pdpScoreResult.pageType?.type === 'plp';
  }

  /**
   * Generate all PDP Quality recommendations
   * @returns {Array} Sorted array of recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    recommendations.push(...this.checkPurchaseExperienceIssues());
    recommendations.push(...this.checkTrustConfidenceIssues());
    recommendations.push(...this.checkVisualPresentationIssues());
    recommendations.push(...this.checkContentCompletenessIssues());
    recommendations.push(...this.checkReviewsSocialProofIssues());

    return sortRecommendations(recommendations);
  }

  /**
   * Check Purchase Experience issues
   */
  checkPurchaseExperienceIssues() {
    const recs = [];
    const pe = this.pdpData.purchaseExperience || {};

    if (!pe.priceVisible) {
      recs.push(this.createRecommendation('pdp-price-missing'));
    }

    if (!pe.ctaFound) {
      recs.push(this.createRecommendation('pdp-cta-missing'));
    } else if (!this.isPlp && !pe.ctaIsClear) {
      recs.push(this.createRecommendation('pdp-cta-unclear'));
    }

    if (!pe.hasDiscount) {
      recs.push(this.createRecommendation('pdp-discount-missing'));
    }

    if (!pe.hasPaymentIndicators) {
      recs.push(this.createRecommendation('pdp-payment-methods-missing'));
    }

    if (!pe.hasUrgency) {
      const multiplier = getPdpContextMultiplier(this.context, 'urgencyScarcitySignals');
      if (multiplier > 1) {
        recs.push({
          ...this.createRecommendation('pdp-urgency-missing'),
          contextual: true
        });
      } else {
        recs.push(this.createRecommendation('pdp-urgency-missing'));
      }
    }

    return recs;
  }

  /**
   * Check Trust & Confidence issues
   */
  checkTrustConfidenceIssues() {
    const recs = [];
    const tc = this.pdpData.trustConfidence || {};

    if (!tc.hasReturnPolicy) {
      recs.push(this.createRecommendation('pdp-return-policy-missing'));
    }

    if (!tc.hasShippingInfo) {
      recs.push(this.createRecommendation('pdp-shipping-missing'));
    }

    if (!tc.hasTrustBadges) {
      recs.push(this.createRecommendation('pdp-trust-badges-missing'));
    }

    // Recommend when explicit secure checkout signal is absent (HTTPS alone = warning, not pass)
    if (!tc.hasSecureCheckout) {
      recs.push(this.createRecommendation('pdp-secure-checkout-missing'));
    }

    if (!tc.hasCustomerService) {
      recs.push(this.createRecommendation('pdp-customer-service-missing'));
    }

    if (!tc.hasGuarantee) {
      recs.push(this.createRecommendation('pdp-guarantee-missing'));
    }

    return recs;
  }

  /**
   * Check Visual Presentation issues
   */
  checkVisualPresentationIssues() {
    const recs = [];
    const vp = this.pdpData.visualPresentation || {};

    if ((vp.imageCount || 0) < 4) {
      recs.push({
        ...this.createRecommendation('pdp-images-low'),
        currentState: `${vp.imageCount || 0} images`,
        targetState: '4+ images'
      });
    }

    if (!vp.hasVideo) {
      const multiplier = getPdpContextMultiplier(this.context, 'videoPresence');
      const rec = this.createRecommendation('pdp-video-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    if (!this.isPlp && !vp.hasGalleryFeatures) {
      recs.push(this.createRecommendation('pdp-gallery-basic'));
    }

    if (!vp.hasLifestyleImages) {
      const multiplier = getPdpContextMultiplier(this.context, 'lifestyleContextImages');
      const rec = this.createRecommendation('pdp-lifestyle-images-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    if (!this.isPlp && !vp.hasSwatches) {
      const multiplier = getPdpContextMultiplier(this.context, 'colorVariantSwatches');
      const rec = this.createRecommendation('pdp-swatches-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    if (!vp.hasHighResImages) {
      recs.push(this.createRecommendation('pdp-image-quality-low'));
    }

    return recs;
  }

  /**
   * Check Content Completeness issues
   */
  checkContentCompletenessIssues() {
    const recs = [];
    const cc = this.pdpData.contentCompleteness || {};

    if (!cc.hasVariants) {
      const multiplier = getPdpContextMultiplier(this.context, 'productVariantDisplay');
      const rec = this.createRecommendation('pdp-variants-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    if (!this.isPlp && !cc.hasSizeGuide) {
      const multiplier = getPdpContextMultiplier(this.context, 'sizeGuideFitInfo');
      const rec = this.createRecommendation('pdp-size-guide-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    if (!cc.hasRelatedProducts) {
      recs.push(this.createRecommendation('pdp-related-products-missing'));
    }

    if (!this.isPlp && !cc.hasQASection) {
      recs.push(this.createRecommendation('pdp-qa-missing'));
    }

    if (!cc.hasOrganizedDetails) {
      recs.push(this.createRecommendation('pdp-details-unorganized'));
    }

    if (!this.isPlp && !cc.hasWhatsInBox) {
      const multiplier = getPdpContextMultiplier(this.context, 'whatsInTheBox');
      const rec = this.createRecommendation('pdp-whats-in-box-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    return recs;
  }

  /**
   * Check Reviews & Social Proof issues
   */
  checkReviewsSocialProofIssues() {
    const recs = [];
    const rsp = this.pdpData.reviewsSocialProof || {};

    if (!rsp.hasProminentReviews) {
      recs.push(this.createRecommendation('pdp-reviews-not-prominent'));
    }

    if (!rsp.hasStarVisual) {
      recs.push(this.createRecommendation('pdp-star-visual-missing'));
    }

    if (!this.isPlp && !rsp.hasReviewSorting) {
      recs.push(this.createRecommendation('pdp-review-sort-missing'));
    }

    if (!this.isPlp && !rsp.hasMediaReviews) {
      const multiplier = getPdpContextMultiplier(this.context, 'photoVideoReviews');
      const rec = this.createRecommendation('pdp-review-media-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    if (!rsp.hasSocialProof) {
      const multiplier = getPdpContextMultiplier(this.context, 'socialProofIndicators');
      const rec = this.createRecommendation('pdp-social-proof-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    const reviewCount = rsp.reviewCount || 0;
    if (reviewCount < 50) {
      recs.push({
        ...this.createRecommendation('pdp-review-count-low'),
        currentState: `${reviewCount} reviews`,
        targetState: '50+ reviews'
      });
    }

    return recs;
  }

  /**
   * Create a recommendation from a PDP template
   * @param {string} templateId - Template ID
   * @param {Object} extras - Additional properties to merge
   * @returns {Object} Recommendation object
   */
  createRecommendation(templateId, extras = {}) {
    const template = PDP_RECOMMENDATION_TEMPLATES[templateId];
    if (!template) {
      console.warn(`Unknown PDP recommendation template: ${templateId}`);
      return null;
    }

    return {
      id: templateId,
      title: template.title,
      description: template.description,
      impact: template.impact,
      effort: template.effort,
      category: template.category,
      priority: calculatePriority(template.impact, template.effort),
      implementation: template.implementation,
      ...extras
    };
  }

}

// ==========================================
// SEO QUALITY RECOMMENDATION ENGINE
// ==========================================

/**
 * SEO Quality Recommendation Engine class
 * Generates prioritized recommendations for SEO issues
 * Context-neutral: no multipliers applied
 */
export class SeoQualityRecommendationEngine {
  /**
   * @param {Object} seoScoreResult - Result from ScoringEngine.calculateSeoQualityScore()
   * @param {Object} extractedData - Raw extracted data (includes seoSignals key)
   */
  constructor(seoScoreResult, extractedData) {
    this.scoreResult = seoScoreResult;
    this.extractedData = extractedData;
    this.seoData = extractedData.seoSignals || {};
  }

  /**
   * Generate all SEO Quality recommendations
   * @returns {Array} Sorted array of recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    recommendations.push(...this.checkTitleMetaIssues());
    recommendations.push(...this.checkTechnicalIssues());
    recommendations.push(...this.checkContentSignalIssues());
    recommendations.push(...this.checkNavigationIssues());

    return sortRecommendations(recommendations);
  }

  /**
   * Check Title & Meta issues
   */
  checkTitleMetaIssues() {
    const recs = [];
    const title = this.seoData.titleTag || {};
    const meta = this.extractedData.metaTags || {};
    const standard = meta.standard || {};
    const metaDesc = standard.description || standard.metaDescription || '';

    if (!title.present) {
      recs.push(this.createRecommendation('seo-title-missing'));
    } else {
      const len = title.length || 0;
      if (len < 50 || len > 60) {
        recs.push({ ...this.createRecommendation('seo-title-length'), currentValue: title.text, charCount: len, charTarget: '50–60' });
      }
    }

    if (!metaDesc) {
      recs.push(this.createRecommendation('seo-meta-desc-missing'));
    } else {
      const len = metaDesc.length;
      // Scorer awards full points at 140–160, partial at 100–180. Fire rec for any
      // result outside the optimal 140–160 range so merchants always get advice.
      if (len < 140 || len > 160) {
        recs.push({ ...this.createRecommendation('seo-meta-desc-length'), currentValue: metaDesc, charCount: len, charTarget: '140–160' });
      }
    }

    // Product name in title — check via score result
    const titleMetaFactors = this.scoreResult.categoryScores?.titleMeta?.factors || [];
    for (const factor of titleMetaFactors) {
      if (factor.name === 'Product Name in Title' && factor.status === 'fail') {
        recs.push({ ...this.createRecommendation('seo-product-name-title'), currentValue: title.text, charCount: title.length || 0 });
      }
    }

    return recs;
  }

  /**
   * Check Technical Foundations issues
   */
  checkTechnicalIssues() {
    const recs = [];
    const robots = this.extractedData.metaTags?.robots || {};
    const canonical = this.extractedData.metaTags?.canonical || {};
    const schemas = this.extractedData.structuredData?.schemas || {};
    const js = this.extractedData.contentStructure?.jsDependency || {};

    if (robots.noindex) {
      recs.push(this.createRecommendation('seo-noindex'));
    }

    if (!canonical.present || (!canonical.matchesCurrentUrl && !canonical.isProductCanonical)) {
      recs.push(this.createRecommendation('seo-canonical'));
    }

    if (!schemas.product) {
      recs.push(this.createRecommendation('seo-product-schema'));
    }

    if (!schemas.breadcrumb) {
      recs.push(this.createRecommendation('seo-breadcrumb-schema'));
    }

    if (js.dependencyLevel === 'high') {
      recs.push(this.createRecommendation('seo-js-dependency'));
    }

    return recs;
  }

  /**
   * Check Content Signals issues
   */
  checkContentSignalIssues() {
    const recs = [];
    const desc = this.extractedData.contentQuality?.description || {};
    const textMetrics = this.extractedData.contentQuality?.textMetrics || {};
    const headings = this.extractedData.contentStructure?.headings || {};
    const images = this.extractedData.contentStructure?.images || {};
    const url = this.seoData.urlStructure || {};

    const wordCount = desc.wordCount || textMetrics.wordCount || 0;
    if (wordCount < 300) {
      recs.push(this.createRecommendation('seo-content-length'));
    }

    const h1Count = headings.h1?.count || 0;
    const hierarchyValid = headings.hierarchyValid !== false;
    if (h1Count !== 1 || !hierarchyValid) {
      const h1Texts = (headings.h1?.texts || []).filter(t => t.trim().length > 0);
      const h1Preview = h1Texts.length > 0 ? h1Texts.join(' / ') : null;
      recs.push({ ...this.createRecommendation('seo-heading-structure'), ...(h1Preview ? { currentValue: h1Preview } : {}) });
    }

    if ((images.altCoverage || 0) < 0.9) {
      if ((images.withTitleButNoAlt || 0) > 0) {
        recs.push(this.createRecommendation('seo-image-title-not-alt'));
      } else {
        recs.push(this.createRecommendation('seo-image-alt'));
      }
    }

    const readability = textMetrics.readabilityScore ?? null;
    if (readability !== null && readability < 40) {
      recs.push(this.createRecommendation('seo-readability'));
    }

    if (url.isClean === false || url.hasKeywords === false) {
      recs.push(this.createRecommendation('seo-url-slug'));
    }

    return recs;
  }

  /**
   * Check Navigation & Discovery issues
   */
  checkNavigationIssues() {
    const recs = [];
    const structure = this.extractedData.contentStructure || {};
    const schemas = this.extractedData.structuredData?.schemas || {};
    const headings = structure.headings || {};
    const hreflang = this.extractedData.metaTags?.hreflang || {};
    const internalLinks = this.seoData.internalLinks || {};

    const hasDomBreadcrumbs = this.seoData.domBreadcrumbs?.present === true;
    const hasBreadcrumbSchema = !!schemas.breadcrumb;
    if (!hasDomBreadcrumbs && !hasBreadcrumbSchema) {
      recs.push(this.createRecommendation('seo-breadcrumb-nav'));
    }

    // H1 alignment — check via score result
    const navFactors = this.scoreResult.categoryScores?.navigationDiscovery?.factors || [];
    const h1TextsNav = (headings.h1?.texts || []).filter(t => t.trim().length > 0);
    for (const factor of navFactors) {
      if (factor.name === 'H1–Product Name Alignment' && factor.status === 'fail') {
        recs.push({ ...this.createRecommendation('seo-h1-alignment'), ...(h1TextsNav.length > 0 ? { currentValue: h1TextsNav[0] } : {}) });
      }
    }

    if ((internalLinks.count || 0) < 10) {
      recs.push(this.createRecommendation('seo-internal-links'));
    }

    // Hreflang only recommended if absent AND we can infer the site is multilingual
    // (checking hreflang = warning in scoring, but only recommend if there's evidence of multiple languages)
    // Skip for monolingual sites — don't burden them with an inapplicable recommendation

    return recs;
  }

  /**
   * Create a recommendation from a SEO template
   * @param {string} templateId - Template ID
   * @returns {Object|null} Recommendation object
   */
  createRecommendation(templateId) {
    const template = SEO_RECOMMENDATION_TEMPLATES[templateId];
    if (!template) {
      console.warn(`Unknown SEO recommendation template: ${templateId}`);
      return null;
    }

    return {
      id: templateId,
      title: template.title,
      description: template.description,
      impact: template.impact,
      effort: template.effort,
      category: template.category,
      priority: calculatePriority(template.impact, template.effort),
      implementation: template.implementation
    };
  }
}
