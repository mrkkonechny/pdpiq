/**
 * Recommendation Engine
 * Generates prioritized recommendations based on scoring results
 */

import { calculatePriority, RECOMMENDATION_TEMPLATES, PDP_RECOMMENDATION_TEMPLATES } from './recommendation-rules.js';
import { getContextMultiplier, getPdpContextMultiplier } from '../scoring/weights.js';
import { ScoringEngine } from '../scoring/scoring-engine.js';

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

    // Sort by priority (lower = higher priority)
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

    // CRITICAL: Robots blocking
    if (robots.isBlocked) {
      recs.push(this.createRecommendation('robots-blocking'));
    }

    // CRITICAL: og:image missing
    if (!og.image) {
      recs.push(this.createRecommendation('og-image-missing'));
    } else {
      // CRITICAL: og:image is WebP
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

    // og:type missing or not product
    if (!og.type || (og.type !== 'product' && !og.type.startsWith('product.'))) {
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

    // FAQ schema missing (if FAQ content exists but no schema)
    const faqContent = this.extractedData.contentQuality?.faq || {};
    if (!schemas.faq && faqContent.count > 0) {
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

    // FAQ content missing (skip if count === 0 — faq-schema-and-content-missing already covers that case)
    if (faq.count > 0 && faq.count < 3) {
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

    // Description quality low
    if (desc.wordCount >= 100 && desc.qualityScore !== undefined && desc.qualityScore < 50) {
      recs.push(this.createRecommendation('description-quality-low'));
    }

    // Materials missing
    if (!details.hasMaterials) {
      recs.push(this.createRecommendation('materials-missing'));
    }

    // Care instructions missing
    if (!details.hasCareInstructions) {
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

    // No reviews
    if (!reviews.hasReviews || reviews.count === 0) {
      recs.push(this.createRecommendation('reviews-missing'));
    } else if (reviews.count < 10) {
      // Low review count - contextual importance
      const multiplier = getContextMultiplier(this.context, 'reviewCount');
      const impact = multiplier > 1 ? 'high' : 'medium';

      recs.push({
        ...this.createRecommendation('reviews-low-count'),
        impact,
        priority: calculatePriority(impact, 'high'),
        currentState: `${reviews.count} reviews`,
        targetState: '50+ reviews'
      });
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

    // Review recency
    if (reviews.hasReviews && reviews.count > 0) {
      const recency = reviews.recency || {};
      if (!recency.hasRecentReview) {
        recs.push(this.createRecommendation('review-recency-low'));
      }

      // Review depth
      if (recency.averageLength !== undefined && recency.averageLength < 100) {
        recs.push(this.createRecommendation('review-depth-low'));
      }
    }

    // Awards
    const awards = this.extractedData.trustSignals?.awards || {};
    if (!awards.found) {
      recs.push(this.createRecommendation('awards-missing'));
    }

    // Content freshness — check via scoring results
    const trustFactors = this.scoreResult.categoryScores?.authorityTrust?.factors || [];
    for (const factor of trustFactors) {
      if (factor.name === 'Content Freshness' && factor.status === 'fail') {
        recs.push(this.createRecommendation('content-stale'));
      }
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
    // Filter out nulls
    const valid = recommendations.filter(r => r !== null);

    // Sort by priority (1 is highest), then by impact
    return valid.sort((a, b) => {
      // Priority first
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      // Then by impact
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return (impactOrder[a.impact] || 2) - (impactOrder[b.impact] || 2);
    });
  }

  /**
   * Get top N recommendations
   * @param {number} n - Number of recommendations
   * @returns {Array} Top N recommendations
   */
  getTopRecommendations(n = 5) {
    return this.generateRecommendations().slice(0, n);
  }

  /**
   * Get recommendations by category
   * @param {string} category - Category name
   * @returns {Array} Filtered recommendations
   */
  getRecommendationsByCategory(category) {
    return this.generateRecommendations().filter(r => r.category === category);
  }

  /**
   * Get critical recommendations (high impact)
   * @returns {Array} Critical recommendations
   */
  getCriticalRecommendations() {
    return this.generateRecommendations().filter(r => r.impact === 'high');
  }

  /**
   * Get quick wins (high impact, low effort)
   * @returns {Array} Quick win recommendations
   */
  getQuickWins() {
    return this.generateRecommendations().filter(r =>
      (r.impact === 'high' || r.impact === 'medium') && r.effort === 'low'
    );
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

    // Filter nulls and sort by priority
    const valid = recommendations.filter(r => r !== null);
    return valid.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return (impactOrder[a.impact] || 2) - (impactOrder[b.impact] || 2);
    });
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

    if (!pe.ctaPresent) {
      recs.push(this.createRecommendation('pdp-cta-missing'));
    } else if (pe.ctaClarity !== undefined && pe.ctaClarity < 0.5) {
      recs.push(this.createRecommendation('pdp-cta-unclear'));
    }

    if (!pe.discountPresent) {
      recs.push(this.createRecommendation('pdp-discount-missing'));
    }

    if (!pe.paymentMethodsPresent) {
      recs.push(this.createRecommendation('pdp-payment-methods-missing'));
    }

    if (!pe.urgencyPresent) {
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

    if (!tc.returnPolicyVisible) {
      recs.push(this.createRecommendation('pdp-return-policy-missing'));
    }

    if (!tc.shippingInfoVisible) {
      recs.push(this.createRecommendation('pdp-shipping-missing'));
    }

    if (!tc.trustBadgesPresent) {
      recs.push(this.createRecommendation('pdp-trust-badges-missing'));
    }

    const secure = tc.secureCheckout || {};
    if (!secure.https || !secure.secureMessaging) {
      recs.push(this.createRecommendation('pdp-secure-checkout-missing'));
    }

    if (!tc.customerServicePresent) {
      recs.push(this.createRecommendation('pdp-customer-service-missing'));
    }

    if (!tc.guaranteePresent) {
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

    if (!vp.videoPresent) {
      const multiplier = getPdpContextMultiplier(this.context, 'videoPresence');
      const rec = this.createRecommendation('pdp-video-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    const gallery = vp.galleryFeatures || {};
    if (!gallery.hasZoom && !gallery.hasLightbox) {
      recs.push(this.createRecommendation('pdp-gallery-basic'));
    }

    const lifestyle = vp.lifestyleImages || {};
    if (!lifestyle.detected) {
      const multiplier = getPdpContextMultiplier(this.context, 'lifestyleContextImages');
      const rec = this.createRecommendation('pdp-lifestyle-images-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    const swatches = vp.variantSwatches || {};
    if (!swatches.present) {
      const multiplier = getPdpContextMultiplier(this.context, 'colorVariantSwatches');
      const rec = this.createRecommendation('pdp-swatches-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    const quality = vp.imageQuality || {};
    if (!quality.hasHighRes && !quality.hasSrcset) {
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

    const variants = cc.variantSelectors || {};
    if (!variants.present) {
      const multiplier = getPdpContextMultiplier(this.context, 'productVariantDisplay');
      const rec = this.createRecommendation('pdp-variants-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    const sizeGuide = cc.sizeGuide || {};
    if (!sizeGuide.present) {
      const multiplier = getPdpContextMultiplier(this.context, 'sizeGuideFitInfo');
      const rec = this.createRecommendation('pdp-size-guide-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    const related = cc.relatedProducts || {};
    if (!related.present) {
      recs.push(this.createRecommendation('pdp-related-products-missing'));
    }

    const qa = cc.qaSection || {};
    if (!qa.present) {
      recs.push(this.createRecommendation('pdp-qa-missing'));
    }

    const org = cc.detailsOrganization || {};
    if (!org.hasTabs && !org.hasAccordions && !org.hasSections) {
      recs.push(this.createRecommendation('pdp-details-unorganized'));
    }

    const witb = cc.whatsInTheBox || {};
    if (!witb.present) {
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

    const prominence = rsp.reviewProminence || {};
    if (!prominence.visibleInHero) {
      recs.push(this.createRecommendation('pdp-reviews-not-prominent'));
    }

    const stars = rsp.starRatingVisual || {};
    if (!stars.present) {
      recs.push(this.createRecommendation('pdp-star-visual-missing'));
    }

    const sorting = rsp.reviewSorting || {};
    if (!sorting.hasSort && !sorting.hasFilter) {
      recs.push(this.createRecommendation('pdp-review-sort-missing'));
    }

    const media = rsp.photoVideoReviews || {};
    if (!media.present) {
      const multiplier = getPdpContextMultiplier(this.context, 'photoVideoReviews');
      const rec = this.createRecommendation('pdp-review-media-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    const social = rsp.socialProofIndicators || {};
    if (!social.present) {
      const multiplier = getPdpContextMultiplier(this.context, 'socialProofIndicators');
      const rec = this.createRecommendation('pdp-social-proof-missing');
      if (multiplier > 1) {
        recs.push({ ...rec, contextual: true });
      } else {
        recs.push(rec);
      }
    }

    const reviewCount = rsp.reviewCount || {};
    if ((reviewCount.count || 0) < 50) {
      recs.push({
        ...this.createRecommendation('pdp-review-count-low'),
        currentState: `${reviewCount.count || 0} reviews`,
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

  /**
   * Get top N recommendations
   * @param {number} n - Number of recommendations
   * @returns {Array} Top N recommendations
   */
  getTopRecommendations(n = 5) {
    return this.generateRecommendations().slice(0, n);
  }

  /**
   * Get recommendations by category
   * @param {string} category - Category name
   * @returns {Array} Filtered recommendations
   */
  getRecommendationsByCategory(category) {
    return this.generateRecommendations().filter(r => r.category === category);
  }

  /**
   * Get quick wins (high/medium impact, low effort)
   * @returns {Array} Quick win recommendations
   */
  getQuickWins() {
    return this.generateRecommendations().filter(r =>
      (r.impact === 'high' || r.impact === 'medium') && r.effort === 'low'
    );
  }
}
