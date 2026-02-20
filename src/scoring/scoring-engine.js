/**
 * Scoring Engine
 * Calculates scores for each category and overall grade
 */

import {
  CATEGORY_WEIGHTS,
  CONTEXT_MULTIPLIERS,
  FACTOR_WEIGHTS,
  getGrade,
  getGradeDescription,
  getContextMultiplier
} from './weights.js';

/**
 * Main scoring engine class
 */
export class ScoringEngine {
  /**
   * @param {string} context - Consumer context: 'want', 'need', or 'hybrid'
   */
  constructor(context = 'hybrid') {
    this.context = context;
    this.multipliers = CONTEXT_MULTIPLIERS[context] || CONTEXT_MULTIPLIERS.hybrid;
  }

  /**
   * Calculate all scores from extracted data
   * @param {Object} extractedData - Data from content script
   * @param {Object} imageVerification - og:image verification result (optional)
   * @param {Object} aiDiscoverabilityData - AI discoverability network data (optional)
   * @returns {Object} Complete scoring result
   */
  calculateScore(extractedData, imageVerification = null, aiDiscoverabilityData = null) {
    // Calculate category scores
    const categoryScores = {
      structuredData: this.scoreStructuredData(extractedData.structuredData),
      protocolMeta: this.scoreProtocolMeta(extractedData.metaTags, imageVerification),
      contentQuality: this.scoreContentQuality(extractedData.contentQuality, extractedData.aiDiscoverability),
      contentStructure: this.scoreContentStructure(extractedData.contentStructure, extractedData.contentQuality?.textMetrics),
      authorityTrust: this.scoreAuthorityTrust(extractedData.trustSignals),
      aiDiscoverability: this.scoreAIDiscoverability(extractedData, aiDiscoverabilityData)
    };

    // Calculate weighted total
    const totalScore = Math.round(
      categoryScores.structuredData.score * CATEGORY_WEIGHTS.structuredData +
      categoryScores.protocolMeta.score * CATEGORY_WEIGHTS.protocolMeta +
      categoryScores.contentQuality.score * CATEGORY_WEIGHTS.contentQuality +
      categoryScores.contentStructure.score * CATEGORY_WEIGHTS.contentStructure +
      categoryScores.authorityTrust.score * CATEGORY_WEIGHTS.authorityTrust +
      categoryScores.aiDiscoverability.score * CATEGORY_WEIGHTS.aiDiscoverability
    );

    const grade = getGrade(totalScore);
    // Flag JS-rendered pages so the UI can warn that scores may be understated
    const jsDependent = extractedData.contentStructure?.jsDependency?.dependencyLevel === 'high';

    return {
      totalScore,
      grade,
      gradeDescription: getGradeDescription(grade),
      context: this.context,
      categoryScores,
      jsDependent,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Score Structured Data category (25% weight)
   */
  scoreStructuredData(data) {
    const factors = [];
    let rawScore = 0;
    const maxScore = 100;
    const weights = FACTOR_WEIGHTS.structuredData;

    // Product Schema (30 points) - Critical, graduated scoring
    const product = data?.schemas?.product;
    const hasProduct = product !== null;
    let productScore = 0;
    let productDetails = 'Missing Product schema markup';

    if (hasProduct) {
      const presentFields = [];
      const missingFields = [];

      // name: 6 pts
      if (product.name) { productScore += 6; presentFields.push('name'); } else { missingFields.push('name'); }
      // description: 5 pts
      if (product.description) { productScore += 5; presentFields.push('description'); } else { missingFields.push('description'); }
      // image: 5 pts
      if (product.image) { productScore += 5; presentFields.push('image'); } else { missingFields.push('image'); }
      // offers: 5 pts
      if (product.hasOffer) { productScore += 5; presentFields.push('offers'); } else { missingFields.push('offers'); }
      // brand: 3 pts
      if (product.brand) { productScore += 3; presentFields.push('brand'); } else { missingFields.push('brand'); }
      // identifiers (gtin/mpn/sku): 3 pts
      if (product.gtin || product.mpn || product.sku) { productScore += 3; presentFields.push('identifiers'); } else { missingFields.push('identifiers'); }
      // rating: 3 pts
      if (product.hasRating) { productScore += 3; presentFields.push('rating'); } else { missingFields.push('rating'); }

      // Scale to maxPoints (30)
      productScore = Math.round((productScore / 30) * weights.productSchema);

      productDetails = `Present: ${presentFields.join(', ')}`;
      if (missingFields.length > 0) {
        productDetails += ` | Missing: ${missingFields.join(', ')}`;
      }
    }

    const productStatus = !hasProduct ? 'fail' : productScore >= weights.productSchema * 0.8 ? 'pass' : productScore >= weights.productSchema * 0.5 ? 'warning' : 'fail';
    factors.push({
      name: 'Product Schema',
      status: productStatus,
      points: productScore,
      maxPoints: weights.productSchema,
      critical: true,
      details: productDetails
    });
    rawScore += productScore;

    // Offer Schema (20 points) - Critical
    const hasOffer = data?.schemas?.offer !== null;
    const offerScore = hasOffer ? weights.offerSchema : 0;
    factors.push({
      name: 'Offer Schema',
      status: hasOffer ? 'pass' : 'fail',
      points: offerScore,
      maxPoints: weights.offerSchema,
      critical: true,
      details: hasOffer ? 'Price and availability structured' : 'Missing Offer schema'
    });
    rawScore += offerScore;

    // AggregateRating Schema (15 points)
    const hasRating = data?.schemas?.aggregateRating !== null;
    const ratingScore = hasRating ? weights.aggregateRating : 0;
    factors.push({
      name: 'AggregateRating Schema',
      status: hasRating ? 'pass' : 'fail',
      points: ratingScore,
      maxPoints: weights.aggregateRating,
      details: hasRating ?
        `Rating: ${data.schemas.aggregateRating.ratingValue}/5` :
        'Missing rating schema'
    });
    rawScore += ratingScore;

    // Review Schema (10 points)
    const hasReviews = data?.schemas?.reviews?.length > 0;
    const reviewScore = hasReviews ? weights.reviewSchema : 0;
    factors.push({
      name: 'Review Schema',
      status: hasReviews ? 'pass' : 'fail',
      points: reviewScore,
      maxPoints: weights.reviewSchema,
      details: hasReviews ?
        `${data.schemas.reviews.length} reviews structured` :
        'No structured reviews'
    });
    rawScore += reviewScore;

    // FAQ Schema (10 points)
    const hasFaq = data?.schemas?.faq !== null && data.schemas.faq?.questionCount > 0;
    const faqScore = hasFaq ? weights.faqSchema : 0;
    factors.push({
      name: 'FAQ Schema',
      status: hasFaq ? 'pass' : 'fail',
      points: faqScore,
      maxPoints: weights.faqSchema,
      details: hasFaq ?
        `${data.schemas.faq.questionCount} FAQs structured` :
        'No FAQ schema'
    });
    rawScore += faqScore;

    // Breadcrumb Schema (5 points)
    const hasBreadcrumb = data?.schemas?.breadcrumb !== null;
    const breadcrumbScore = hasBreadcrumb ? weights.breadcrumbSchema : 0;
    const breadcrumbCount = data?.schemas?.breadcrumb?.itemCount || 0;
    factors.push({
      name: 'Breadcrumb Schema',
      status: hasBreadcrumb ? 'pass' : 'fail',
      points: breadcrumbScore,
      maxPoints: weights.breadcrumbSchema,
      details: hasBreadcrumb ? `${breadcrumbCount} level${breadcrumbCount !== 1 ? 's' : ''} found` : 'Missing breadcrumb schema'
    });
    rawScore += breadcrumbScore;

    // Organization Schema (5 points)
    const hasOrg = data?.schemas?.organization !== null || data?.schemas?.brand !== null;
    const orgScore = hasOrg ? weights.organizationSchema : 0;
    const orgName = data?.schemas?.organization?.name || data?.schemas?.brand?.name;
    factors.push({
      name: 'Organization/Brand Schema',
      status: hasOrg ? 'pass' : 'fail',
      points: orgScore,
      maxPoints: weights.organizationSchema,
      details: hasOrg ? (orgName ? `Found: ${orgName}` : 'Schema present') : 'Missing organization/brand schema'
    });
    rawScore += orgScore;

    // Image Schema (5 points)
    const hasImageSchema = data?.schemas?.images?.length > 0;
    const imageSchemaScore = hasImageSchema ? weights.imageSchema : 0;
    const imageCount = data?.schemas?.images?.length || 0;
    factors.push({
      name: 'ImageObject Schema',
      status: hasImageSchema ? 'pass' : 'fail',
      points: imageSchemaScore,
      maxPoints: weights.imageSchema,
      details: hasImageSchema ? `${imageCount} image${imageCount !== 1 ? 's' : ''} in schema` : 'No ImageObject schema'
    });
    rawScore += imageSchemaScore;

    return {
      score: rawScore,
      maxScore,
      factors,
      weight: CATEGORY_WEIGHTS.structuredData,
      categoryName: 'Structured Data'
    };
  }

  /**
   * Score Protocol & Meta Compliance category (20% weight)
   */
  scoreProtocolMeta(data, imageVerification) {
    const factors = [];
    let rawScore = 0;
    const maxScore = 100;
    const weights = FACTOR_WEIGHTS.protocolMeta;
    const og = data?.openGraph || {};
    const twitter = data?.twitterCards || {};

    // og:image presence (20 points) - Critical
    const hasOgImage = !!og.image;
    const ogImageScore = hasOgImage ? weights.ogImage : 0;
    factors.push({
      name: 'og:image Present',
      status: hasOgImage ? 'pass' : 'fail',
      points: ogImageScore,
      maxPoints: weights.ogImage,
      critical: true,
      details: hasOgImage ? og.image.substring(0, 50) + '...' : 'No og:image tag found'
    });
    rawScore += ogImageScore;

    // og:image format (15 points) - Critical
    // WebP = FAIL, JPEG/PNG = PASS
    let imageFormatScore = 0;
    let imageFormatStatus = 'unknown';
    let imageFormatDetails = 'Image format not verified';

    if (imageVerification) {
      if (imageVerification.isWebP) {
        imageFormatScore = 0;
        imageFormatStatus = 'fail';
        imageFormatDetails = 'CRITICAL: WebP format - invisible in LLM chats';
      } else if (imageVerification.isValidFormat) {
        imageFormatScore = weights.ogImageFormat;
        imageFormatStatus = 'pass';
        imageFormatDetails = `Format: ${imageVerification.format?.toUpperCase() || 'Valid'}`;
      } else {
        imageFormatScore = weights.ogImageFormat / 2;
        imageFormatStatus = 'warning';
        imageFormatDetails = `Format: ${imageVerification.format || 'Unknown'}`;
      }
    } else if (hasOgImage) {
      // Infer from URL if not verified
      const url = og.image.toLowerCase();
      if (url.endsWith('.webp') || url.includes('.webp?')) {
        imageFormatScore = 0;
        imageFormatStatus = 'fail';
        imageFormatDetails = 'CRITICAL: WebP format detected in URL';
      } else if (url.match(/\.(jpe?g|png|gif)(\?|$)/)) {
        imageFormatScore = weights.ogImageFormat;
        imageFormatStatus = 'pass';
        imageFormatDetails = 'Valid format detected';
      } else {
        imageFormatStatus = 'unknown';
        imageFormatDetails = 'Format needs verification';
      }
    }

    factors.push({
      name: 'og:image Format',
      status: imageFormatStatus,
      points: imageFormatScore,
      maxPoints: weights.ogImageFormat,
      critical: true,
      details: imageFormatDetails
    });
    rawScore += imageFormatScore;

    // og:title (10 points)
    const hasOgTitle = !!og.title && og.title.length > 0;
    const titleLength = og.title?.length || 0;
    const titleOptimal = titleLength > 0 && titleLength <= 60;
    const ogTitleScore = hasOgTitle ? (titleOptimal ? weights.ogTitle : weights.ogTitle * 0.7) : 0;
    factors.push({
      name: 'og:title',
      status: hasOgTitle ? (titleOptimal ? 'pass' : 'warning') : 'fail',
      points: ogTitleScore,
      maxPoints: weights.ogTitle,
      details: hasOgTitle ? `${titleLength} chars${titleLength > 60 ? ' (too long)' : ''}` : 'Missing'
    });
    rawScore += ogTitleScore;

    // og:description (10 points)
    const hasOgDesc = !!og.description && og.description.length > 0;
    const descLength = og.description?.length || 0;
    const descOptimal = descLength >= 100 && descLength <= 200;
    const ogDescScore = hasOgDesc ? (descOptimal ? weights.ogDescription : weights.ogDescription * 0.7) : 0;
    factors.push({
      name: 'og:description',
      status: hasOgDesc ? (descOptimal ? 'pass' : 'warning') : 'fail',
      points: ogDescScore,
      maxPoints: weights.ogDescription,
      details: hasOgDesc ? `${descLength} chars` : 'Missing'
    });
    rawScore += ogDescScore;

    // og:type = product (5 points)
    const isProductType = og.type === 'product' || og.type === 'og:product';
    const ogTypeScore = isProductType ? weights.ogType : 0;
    factors.push({
      name: 'og:type = product',
      status: isProductType ? 'pass' : 'fail',
      points: ogTypeScore,
      maxPoints: weights.ogType,
      details: og.type ? `Type: ${og.type}` : 'Missing og:type'
    });
    rawScore += ogTypeScore;

    // Twitter Card (10 points)
    const hasTwitterCard = !!twitter.card;
    const isLargeImage = twitter.card === 'summary_large_image';
    const twitterScore = hasTwitterCard ? (isLargeImage ? weights.twitterCard : weights.twitterCard * 0.7) : 0;
    factors.push({
      name: 'Twitter Card',
      status: hasTwitterCard ? (isLargeImage ? 'pass' : 'warning') : 'fail',
      points: twitterScore,
      maxPoints: weights.twitterCard,
      details: hasTwitterCard ? `Type: ${twitter.card}` : 'Missing twitter:card'
    });
    rawScore += twitterScore;

    // Twitter Image (5 points)
    const hasTwitterImage = !!twitter.image;
    const twitterImageScore = hasTwitterImage ? weights.twitterImage : 0;
    factors.push({
      name: 'Twitter Image',
      status: hasTwitterImage ? 'pass' : 'fail',
      points: twitterImageScore,
      maxPoints: weights.twitterImage
    });
    rawScore += twitterImageScore;

    // Canonical URL (10 points)
    const hasCanonical = data?.canonical?.present;
    const canonicalMatches = data?.canonical?.matchesCurrentUrl;
    const isProductCanonical = data?.canonical?.isProductCanonical;
    // Pass if canonical matches current URL or is a valid parent canonical (e.g. Shopify collection → product)
    const canonicalIsValid = canonicalMatches || isProductCanonical;
    const canonicalScore = hasCanonical ? (canonicalIsValid ? weights.canonical : weights.canonical * 0.7) : 0;
    factors.push({
      name: 'Canonical URL',
      status: hasCanonical ? (canonicalIsValid ? 'pass' : 'warning') : 'fail',
      points: canonicalScore,
      maxPoints: weights.canonical,
      details: hasCanonical ?
        (canonicalMatches ? 'Matches current URL' :
         isProductCanonical ? 'Points to canonical product URL' :
         'Points to a different URL') :
        'Missing canonical'
    });
    rawScore += canonicalScore;

    // Meta Description (10 points)
    const hasMetaDesc = !!data?.standard?.description;
    const metaDescLength = data?.standard?.description?.length || 0;
    const metaDescOptimal = metaDescLength >= 120 && metaDescLength <= 160;
    const metaDescScore = hasMetaDesc ? (metaDescOptimal ? weights.metaDescription : weights.metaDescription * 0.7) : 0;
    factors.push({
      name: 'Meta Description',
      status: hasMetaDesc ? (metaDescOptimal ? 'pass' : 'warning') : 'fail',
      points: metaDescScore,
      maxPoints: weights.metaDescription,
      details: hasMetaDesc ? `${metaDescLength} chars` : 'Missing'
    });
    rawScore += metaDescScore;

    // Robots allows indexing (5 points) - Critical if blocked
    const isBlocked = data?.robots?.isBlocked;
    const robotsScore = isBlocked ? 0 : weights.robotsAllowsIndex;
    factors.push({
      name: 'Robots Allows Indexing',
      status: isBlocked ? 'fail' : 'pass',
      points: robotsScore,
      maxPoints: weights.robotsAllowsIndex,
      critical: isBlocked,
      details: isBlocked ? 'BLOCKED: noindex directive found' : 'Indexing allowed'
    });
    rawScore += robotsScore;

    return {
      score: rawScore,
      maxScore,
      factors,
      weight: CATEGORY_WEIGHTS.protocolMeta,
      categoryName: 'Protocol & Meta Compliance'
    };
  }

  /**
   * Score Content Quality category (20% weight)
   * @param {Object} data - Content quality extraction data
   * @param {Object} aiSignals - AI discoverability signals (for comparison content factor)
   */
  scoreContentQuality(data, aiSignals = null) {
    const factors = [];
    let rawScore = 0;
    const maxScore = 100;
    const weights = FACTOR_WEIGHTS.contentQuality;
    const desc = data?.description || {};
    const specs = data?.specifications || {};
    const features = data?.features || {};
    const faq = data?.faq || {};
    const details = data?.productDetails || {};

    // Description Length (15 points)
    const wordCount = desc.wordCount || 0;
    const descScore = desc.lengthScore ? Math.round((desc.lengthScore / 100) * weights.descriptionLength) : 0;
    const descSource = desc.source ? ` (${desc.source})` : '';
    factors.push({
      name: 'Description Length',
      status: wordCount >= 100 ? 'pass' : wordCount >= 50 ? 'warning' : 'fail',
      points: descScore,
      maxPoints: weights.descriptionLength,
      details: `${wordCount} words${descSource}${wordCount < 100 ? ' (aim for 100+)' : ''}`
    });
    rawScore += descScore;

    // Description Quality (10 points) - Contextual
    let descQualityScore = 0;
    const hasBenefits = desc.hasBenefitStatements;
    const hasEmotional = desc.hasEmotionalLanguage;
    const hasTechnical = desc.hasTechnicalTerms;

    // Apply context multipliers
    if (hasBenefits || hasEmotional) {
      descQualityScore += (weights.descriptionQuality / 2) * this.multipliers.emotionalBenefitCopy;
    }
    if (hasTechnical) {
      descQualityScore += (weights.descriptionQuality / 2) * this.multipliers.technicalSpecifications;
    }
    descQualityScore = Math.min(weights.descriptionQuality, Math.round(descQualityScore));

    factors.push({
      name: 'Description Quality',
      status: descQualityScore >= weights.descriptionQuality * 0.7 ? 'pass' : 'warning',
      points: descQualityScore,
      maxPoints: weights.descriptionQuality,
      contextual: true,
      details: [
        hasBenefits ? 'Benefits' : null,
        hasEmotional ? 'Emotional' : null,
        hasTechnical ? 'Technical' : null
      ].filter(Boolean).join(', ') || 'Needs improvement'
    });
    rawScore += descQualityScore;

    // Specification Count (10 points) - Contextual
    const specCount = specs.count || 0;
    let specScore = specs.countScore ? Math.round((specs.countScore / 100) * weights.specificationCount) : 0;
    specScore = Math.round(specScore * this.multipliers.technicalSpecifications);
    specScore = Math.min(weights.specificationCount * 1.5, specScore); // Cap at 150% of base
    const specSource = specs.source ? ` (${specs.source})` : '';

    factors.push({
      name: 'Specifications',
      status: specCount >= 5 ? 'pass' : specCount >= 3 ? 'warning' : 'fail',
      points: Math.min(weights.specificationCount, specScore),
      maxPoints: weights.specificationCount,
      contextual: true,
      details: `${specCount} specification${specCount !== 1 ? 's' : ''} found${specSource}`
    });
    rawScore += Math.min(weights.specificationCount, specScore);

    // Feature Count (10 points)
    const featureCount = features.count || 0;
    const featureScore = features.countScore ? Math.round((features.countScore / 100) * weights.featureCount) : 0;
    const featureSource = features.source ? ` (${features.source})` : '';
    factors.push({
      name: 'Features List',
      status: featureCount >= 5 ? 'pass' : featureCount >= 3 ? 'warning' : 'fail',
      points: featureScore,
      maxPoints: weights.featureCount,
      details: `${featureCount} feature${featureCount !== 1 ? 's' : ''} found${featureSource}`
    });
    rawScore += featureScore;

    // FAQ Presence (10 points)
    const faqCount = faq.count || 0;
    const faqScore = faq.countScore ? Math.round((faq.countScore / 100) * weights.faqPresence) : 0;
    const faqSource = faq.source ? ` (${faq.source})` : '';
    factors.push({
      name: 'FAQ Section',
      status: faqCount >= 3 ? 'pass' : faqCount > 0 ? 'warning' : 'fail',
      points: faqScore,
      maxPoints: weights.faqPresence,
      details: faqCount > 0 ? `${faqCount} FAQ${faqCount !== 1 ? 's' : ''}${faqSource}` : 'No FAQ found'
    });
    rawScore += faqScore;

    // Dimensions (5 points) - Contextual for Need
    let dimensionsScore = details.hasDimensions ? weights.dimensions : 0;
    if (this.context === 'need') dimensionsScore = Math.round(dimensionsScore * 1.3);
    factors.push({
      name: 'Dimensions/Size',
      status: details.hasDimensions ? 'pass' : 'fail',
      points: Math.min(weights.dimensions, dimensionsScore),
      maxPoints: weights.dimensions,
      contextual: this.context === 'need',
      details: details.hasDimensions
        ? (details.dimensionsText || 'Dimensions found')
        : 'No dimensions found'
    });
    rawScore += Math.min(weights.dimensions, dimensionsScore);

    // Materials (5 points)
    const materialsScore = details.hasMaterials ? weights.materials : 0;
    factors.push({
      name: 'Materials',
      status: details.hasMaterials ? 'pass' : 'fail',
      points: materialsScore,
      maxPoints: weights.materials,
      details: details.hasMaterials
        ? (details.materialsText || 'Materials found')
        : 'No materials information found'
    });
    rawScore += materialsScore;

    // Care Instructions (3 points)
    const careScore = details.hasCareInstructions ? weights.careInstructions : 0;
    factors.push({
      name: 'Care Instructions',
      status: details.hasCareInstructions ? 'pass' : 'fail',
      points: careScore,
      maxPoints: weights.careInstructions,
      details: details.hasCareInstructions
        ? (details.careText || 'Care instructions found')
        : 'No care instructions found'
    });
    rawScore += careScore;

    // Warranty Info (7 points) - Contextual
    let warrantyScore = details.hasWarranty ? weights.warrantyInfo : 0;
    warrantyScore = Math.round(warrantyScore * this.multipliers.warrantyInfo);
    factors.push({
      name: 'Warranty Information',
      status: details.hasWarranty ? 'pass' : 'fail',
      points: Math.min(weights.warrantyInfo, warrantyScore),
      maxPoints: weights.warrantyInfo,
      contextual: true,
      details: details.hasWarranty
        ? (details.warrantyText || 'Warranty found')
        : 'No warranty information found'
    });
    rawScore += Math.min(weights.warrantyInfo, warrantyScore);

    // Compatibility Info (10 points) - Contextual
    let compatScore = details.hasCompatibility ? weights.compatibilityInfo : 0;
    compatScore = Math.round(compatScore * this.multipliers.compatibilityInfo);
    factors.push({
      name: 'Compatibility Information',
      status: details.hasCompatibility ? 'pass' : 'fail',
      points: Math.min(weights.compatibilityInfo, compatScore),
      maxPoints: weights.compatibilityInfo,
      contextual: true,
      details: details.hasCompatibility
        ? (details.compatibilityText || 'Compatibility info found')
        : 'No compatibility information found'
    });
    rawScore += Math.min(weights.compatibilityInfo, compatScore);

    // Specification Detail (5 points) - Contextual
    // Score based on fraction of specs that include measurement units
    const specItems = specs.items || [];
    const specsWithUnits = specItems.filter(s => s.hasUnit).length;
    const specDetailRatio = specItems.length > 0 ? specsWithUnits / specItems.length : 0;
    const specDetailScore = specDetailRatio >= 0.3 ? weights.specificationDetail :
                            specDetailRatio > 0 ? Math.round(weights.specificationDetail * 0.5) : 0;
    factors.push({
      name: 'Specification Detail',
      status: specDetailRatio >= 0.3 ? 'pass' : specDetailRatio > 0 ? 'warning' : 'fail',
      points: specDetailScore,
      maxPoints: weights.specificationDetail,
      contextual: true,
      details: specItems.length > 0
        ? `${specsWithUnits}/${specItems.length} specs have measurement units`
        : 'No specifications to evaluate'
    });
    rawScore += specDetailScore;

    // Comparison Content (5 points) - Contextual
    const hasComparison = aiSignals?.answerFormat?.hasComparison || false;
    let comparisonScore = hasComparison ? weights.comparisonContent : 0;
    comparisonScore = Math.min(weights.comparisonContent, Math.round(comparisonScore * (this.multipliers.comparisonContent || 1.0)));
    factors.push({
      name: 'Comparison Content',
      status: hasComparison ? 'pass' : 'fail',
      points: comparisonScore,
      maxPoints: weights.comparisonContent,
      contextual: true,
      details: hasComparison ? 'Comparison language found (vs./versus/compared to)' : 'No comparison content found'
    });
    rawScore += comparisonScore;

    return {
      score: Math.min(100, rawScore),
      maxScore,
      factors,
      weight: CATEGORY_WEIGHTS.contentQuality,
      categoryName: 'Content Depth & Quality'
    };
  }

  /**
   * Score Content Structure category (15% weight)
   * @param {Object} data - Content structure data
   * @param {Object} textMetrics - Text metrics from content quality extraction
   */
  scoreContentStructure(data, textMetrics = null) {
    const factors = [];
    let rawScore = 0;
    const maxScore = 100;
    const weights = FACTOR_WEIGHTS.contentStructure;
    const headings = data?.headings || {};
    const semantic = data?.semanticHTML || {};
    const ratio = data?.contentRatio || {};
    const tables = data?.tables || {};
    const lists = data?.lists || {};
    const a11y = data?.accessibility || {};
    const images = data?.images || {};
    const js = data?.jsDependency || {};

    // H1 Presence (15 points)
    const hasSingleH1 = headings.hasSingleH1;
    const hasH1 = headings.hasH1;
    const h1Score = hasSingleH1 ? weights.h1Presence : (hasH1 ? weights.h1Presence * 0.5 : 0);
    factors.push({
      name: 'H1 Heading',
      status: hasSingleH1 ? 'pass' : hasH1 ? 'warning' : 'fail',
      points: h1Score,
      maxPoints: weights.h1Presence,
      details: hasSingleH1 ? 'Single H1 found' :
               hasH1 ? `${headings.h1?.count} H1s (should be 1)` : 'No H1 found'
    });
    rawScore += h1Score;

    // Heading Hierarchy (12 points)
    const hierarchyValid = headings.hierarchyValid;
    const hierarchyScore = hierarchyValid ? weights.headingHierarchy : weights.headingHierarchy * 0.5;
    factors.push({
      name: 'Heading Hierarchy',
      status: hierarchyValid ? 'pass' : 'warning',
      points: hierarchyScore,
      maxPoints: weights.headingHierarchy,
      details: hierarchyValid ? 'Valid hierarchy' : headings.hierarchyIssues?.join(', ') || 'Issues found'
    });
    rawScore += hierarchyScore;

    // Semantic HTML (12 points)
    const semanticScore = semantic.score ? Math.round((semantic.score / 100) * weights.semanticHTML) : 0;
    const semanticElements = semantic.elements || {};
    const foundElements = Object.entries(semanticElements)
      .filter(([tag, count]) => count > 0)
      .map(([tag, count]) => `<${tag}>${count > 1 ? '×' + count : ''}`)
      .join(', ');
    const missingKey = [];
    if (!semanticElements.main) missingKey.push('<main>');
    if (!semanticElements.article) missingKey.push('<article>');
    factors.push({
      name: 'Semantic HTML',
      status: semantic.hasMain ? 'pass' : semantic.hasArticle ? 'warning' : 'fail',
      points: semanticScore,
      maxPoints: weights.semanticHTML,
      details: foundElements ? `Found: ${foundElements}` + (missingKey.length ? ` | Missing: ${missingKey.join(', ')}` : '') : 'No semantic elements found'
    });
    rawScore += semanticScore;

    // Content Ratio (12 points)
    const ratioScore = ratio.score ? Math.round((ratio.score / 100) * weights.contentRatio) : 0;
    factors.push({
      name: 'Content-to-Chrome Ratio',
      status: ratio.ratio >= 0.5 ? 'pass' : ratio.ratio >= 0.3 ? 'warning' : 'fail',
      points: ratioScore,
      maxPoints: weights.contentRatio,
      details: ratio.mainContentFound ? `${Math.round(ratio.ratio * 100)}% content` : 'Main content not identified'
    });
    rawScore += ratioScore;

    // Table Structure (10 points)
    const tableScore = tables.score ? Math.round((tables.score / 100) * weights.tableStructure) : 0;
    factors.push({
      name: 'Table Structure',
      status: tables.hasProperTables ? 'pass' : tables.tableCount > 0 ? 'warning' : 'fail',
      points: tableScore,
      maxPoints: weights.tableStructure,
      details: tables.hasProperTables ? 'Proper table markup' : 'No structured tables'
    });
    rawScore += tableScore;

    // List Structure (8 points)
    const listScore = lists.score ? Math.round((lists.score / 100) * weights.listStructure) : 0;
    const ulCount = lists.unorderedCount || 0;
    const olCount = lists.orderedCount || 0;
    factors.push({
      name: 'List Structure',
      status: lists.hasProperLists ? 'pass' : 'fail',
      points: listScore,
      maxPoints: weights.listStructure,
      details: lists.hasProperLists
        ? `${olCount} ordered, ${ulCount} unordered list${ulCount !== 1 ? 's' : ''}`
        : 'No structured lists found'
    });
    rawScore += listScore;

    // ARIA Labels (6 points)
    const ariaScore = a11y.ariaLabels > 0 ? weights.ariaLabels : 0;
    factors.push({
      name: 'ARIA Labels',
      status: a11y.ariaLabels > 0 ? 'pass' : 'fail',
      points: ariaScore,
      maxPoints: weights.ariaLabels,
      details: a11y.ariaLabels > 0 ? `${a11y.ariaLabels} labels found` : 'No ARIA labels'
    });
    rawScore += ariaScore;

    // Primary Image Alt (10 points)
    const primaryHasAlt = images.primaryImage?.hasAlt;
    const primaryAltScore = primaryHasAlt ? weights.primaryImageAlt : 0;
    factors.push({
      name: 'Primary Image Alt Text',
      status: primaryHasAlt ? 'pass' : 'fail',
      points: primaryAltScore,
      maxPoints: weights.primaryImageAlt,
      details: primaryHasAlt ? 'Has alt text' : 'Missing alt text on primary image'
    });
    rawScore += primaryAltScore;

    // All Images Alt (8 points)
    const altCoverage = images.altCoverage || 0;
    const allAltScore = Math.round(altCoverage * weights.allImagesAlt);
    factors.push({
      name: 'Image Alt Coverage',
      status: altCoverage >= 0.9 ? 'pass' : altCoverage >= 0.5 ? 'warning' : 'fail',
      points: allAltScore,
      maxPoints: weights.allImagesAlt,
      details: `${Math.round(altCoverage * 100)}% of images have alt text`
    });
    rawScore += allAltScore;

    // Readability (8 points)
    const readabilityRaw = textMetrics?.readabilityScore ?? null;
    let readabilityPts = 0;
    let readabilityStatus = 'fail';
    let readabilityDetails = 'Unable to assess readability';

    if (readabilityRaw !== null) {
      readabilityPts = Math.round((readabilityRaw / 100) * weights.readability);
      readabilityStatus = readabilityRaw >= 60 ? 'pass' : readabilityRaw >= 40 ? 'warning' : 'fail';
      readabilityDetails = `Readability score: ${readabilityRaw}/100`;
    }

    factors.push({
      name: 'Readability',
      status: readabilityStatus,
      points: readabilityPts,
      maxPoints: weights.readability,
      details: readabilityDetails
    });
    rawScore += readabilityPts;

    // JS Dependency (10 points)
    const jsScore = js.score ? Math.round((js.score / 100) * weights.jsDependency) : weights.jsDependency;
    factors.push({
      name: 'JavaScript Dependency',
      status: js.dependencyLevel === 'low' ? 'pass' : js.dependencyLevel === 'medium' ? 'warning' : 'fail',
      points: jsScore,
      maxPoints: weights.jsDependency,
      details: `${js.dependencyLevel || 'Low'} JS dependency${js.frameworkDetected ? ` (${js.frameworkDetected})` : ''}`
    });
    rawScore += jsScore;

    return {
      score: Math.min(100, rawScore),
      maxScore,
      factors,
      weight: CATEGORY_WEIGHTS.contentStructure,
      categoryName: 'Content Structure & Accessibility'
    };
  }

  /**
   * Score Authority & Trust category (15% weight)
   */
  scoreAuthorityTrust(data) {
    const factors = [];
    let rawScore = 0;
    const maxScore = 100;
    const weights = FACTOR_WEIGHTS.authorityTrust;
    const reviews = data?.reviews || {};
    const brand = data?.brand || {};
    const certs = data?.certifications || {};
    const awards = data?.awards || {};

    // Review Count (25 points) - Contextual
    let reviewCountScore = reviews.countScore ? Math.round((reviews.countScore / 100) * weights.reviewCount) : 0;
    reviewCountScore = Math.round(reviewCountScore * this.multipliers.reviewCount);
    factors.push({
      name: 'Review Count',
      status: reviews.count >= 50 ? 'pass' : reviews.count >= 10 ? 'warning' : 'fail',
      points: Math.min(weights.reviewCount * 1.5, reviewCountScore),
      maxPoints: weights.reviewCount,
      contextual: true,
      details: reviews.count > 0 ? `${reviews.count} reviews` : 'No reviews found'
    });
    rawScore += Math.min(weights.reviewCount * 1.5, reviewCountScore);

    // Average Rating (20 points) - Contextual
    let ratingScore = reviews.ratingScore ? Math.round((reviews.ratingScore / 100) * weights.averageRating) : 0;
    ratingScore = Math.round(ratingScore * this.multipliers.reviewRating);
    factors.push({
      name: 'Average Rating',
      status: reviews.averageRating >= 4 ? 'pass' : reviews.averageRating >= 3.5 ? 'warning' : 'fail',
      points: Math.min(weights.averageRating, ratingScore),
      maxPoints: weights.averageRating,
      contextual: true,
      details: reviews.averageRating ? `${reviews.averageRating.toFixed(1)}/5` : 'No rating'
    });
    rawScore += Math.min(weights.averageRating, ratingScore);

    // Review Recency (15 points)
    // Only award points if we can confirm recent reviews exist
    let recencyScore = 0;
    let recencyStatus = 'fail';
    let recencyDetails = 'No reviews found';

    if (reviews.hasRecentReviews === true) {
      // Confirmed recent reviews (within 6 months)
      recencyScore = weights.reviewRecency;
      recencyStatus = 'pass';
      recencyDetails = reviews.mostRecentDate ? `Most recent: ${reviews.mostRecentDate}` : 'Recent reviews found';
    } else if (reviews.hasRecentReviews === false) {
      // Reviews exist but are outdated (older than 6 months)
      recencyScore = Math.round(weights.reviewRecency * 0.5);
      recencyStatus = 'warning';
      recencyDetails = reviews.mostRecentDate ? `Most recent: ${reviews.mostRecentDate} (outdated)` : 'Reviews may be outdated';
    } else if (reviews.count > 0) {
      // Reviews exist but no dates found - can't verify recency
      recencyScore = 0;
      recencyStatus = 'fail';
      recencyDetails = 'Reviews found but no dates to verify recency';
    }

    factors.push({
      name: 'Review Recency',
      status: recencyStatus,
      points: recencyScore,
      maxPoints: weights.reviewRecency,
      details: recencyDetails
    });
    rawScore += recencyScore;

    // Review Depth (10 points)
    // Only award points if we have reviews to analyze
    const avgLength = reviews.averageReviewLength || 0;
    const reviewsAnalyzed = reviews.reviewsAnalyzed || 0;
    let depthScore = 0;
    let depthStatus = 'fail';
    let depthDetails = 'No review text found to analyze';

    if (reviewsAnalyzed > 0) {
      // Calculate score based on average review length
      depthScore = reviews.depthScore ? Math.round((reviews.depthScore / 100) * weights.reviewDepth) : 0;
      depthStatus = avgLength >= 100 ? 'pass' : avgLength >= 50 ? 'warning' : 'fail';
      depthDetails = `Avg ${avgLength} chars (${reviewsAnalyzed} review${reviewsAnalyzed !== 1 ? 's' : ''} analyzed)`;
    }

    factors.push({
      name: 'Review Depth',
      status: depthStatus,
      points: depthScore,
      maxPoints: weights.reviewDepth,
      details: depthDetails
    });
    rawScore += depthScore;

    // Brand Clarity (15 points)
    const brandScore = brand.score ? Math.round((brand.score / 100) * weights.brandClarity) : 0;
    factors.push({
      name: 'Brand Clarity',
      status: brand.clarity === 'excellent' ? 'pass' : brand.clarity === 'good' ? 'warning' : 'fail',
      points: brandScore,
      maxPoints: weights.brandClarity,
      details: brand.name ? `${brand.name} (${brand.clarity})` : 'Brand not identified'
    });
    rawScore += brandScore;

    // Certifications (10 points) - Contextual
    let certScore = certs.score ? Math.round((certs.score / 100) * weights.certifications) : 0;
    certScore = Math.round(certScore * this.multipliers.certifications);
    const certSource = certs.source ? ` (${certs.source})` : '';
    // Use detailed matches if available, otherwise fall back to items
    const certDetails = certs.details && certs.details.length > 0
      ? certs.details.slice(0, 3).map(c => c.matched || c.name).join(', ')
      : (certs.items || []).slice(0, 3).join(', ');
    factors.push({
      name: 'Certifications',
      status: certs.count > 0 ? 'pass' : 'fail',
      points: Math.min(weights.certifications, certScore),
      maxPoints: weights.certifications,
      contextual: true,
      details: certs.count > 0 ? `${certDetails}${certSource}` : 'No certifications found'
    });
    rawScore += Math.min(weights.certifications, certScore);

    // Awards (5 points)
    const awardScore = awards.count > 0 ? weights.awards : 0;
    const awardSource = awards.source ? ` (${awards.source})` : '';
    // Use detailed matches if available
    const awardDetails = awards.details && awards.details.length > 0
      ? awards.details.slice(0, 2).map(a => a.matched || a.name).join(', ')
      : (awards.items || []).slice(0, 2).join(', ');
    factors.push({
      name: 'Awards',
      status: awards.count > 0 ? 'pass' : 'fail',
      points: awardScore,
      maxPoints: weights.awards,
      details: awards.count > 0 ? `${awardDetails}${awardSource}` : 'No awards found'
    });
    rawScore += awardScore;

    return {
      score: Math.min(100, rawScore),
      maxScore,
      factors,
      weight: CATEGORY_WEIGHTS.authorityTrust,
      categoryName: 'Authority & Trust Signals'
    };
  }

  /**
   * Score AI Discoverability category (20% weight)
   * @param {Object} extractedData - Full extracted data from content script
   * @param {Object} networkData - Network fetch data (robots.txt, llms.txt, Last-Modified)
   */
  scoreAIDiscoverability(extractedData, networkData) {
    const factors = [];
    let rawScore = 0;
    const maxScore = 100;
    const weights = FACTOR_WEIGHTS.aiDiscoverability;
    const robots = networkData?.robots || {};
    const llms = networkData?.llms || {};

    // AI Crawler Access (30 points)
    const crawlerResult = this.scoreAICrawlerAccess(robots, weights.aiCrawlerAccess);
    factors.push(crawlerResult.factor);
    rawScore += crawlerResult.score;

    // Entity Consistency (25 points)
    const entityResult = this.scoreEntityConsistency(extractedData, weights.entityConsistency);
    factors.push(entityResult.factor);
    rawScore += entityResult.score;

    // Answer-Format Content (20 points)
    const answerResult = this.scoreAnswerFormatContent(extractedData, weights.answerFormatContent);
    factors.push(answerResult.factor);
    rawScore += answerResult.score;

    // Product Identifiers (15 points)
    const identResult = this.scoreProductIdentifiers(extractedData, weights.productIdentifiers);
    factors.push(identResult.factor);
    rawScore += identResult.score;

    // llms.txt Presence (10 points)
    const llmsResult = this.scoreLlmsTxt(llms, weights.llmsTxtPresence);
    factors.push(llmsResult.factor);
    rawScore += llmsResult.score;

    return {
      score: Math.min(100, rawScore),
      maxScore,
      factors,
      weight: CATEGORY_WEIGHTS.aiDiscoverability,
      categoryName: 'AI Discoverability'
    };
  }

  /**
   * Score entity consistency — how well the product name aligns across page elements
   * @param {Object} extractedData - Full extracted data
   * @param {number} maxPoints - Maximum points for this factor
   */
  scoreEntityConsistency(extractedData, maxPoints) {
    const productName = extractedData.structuredData?.schemas?.product?.name;
    if (!productName) {
      return {
        score: 0,
        factor: {
          name: 'Entity Consistency',
          status: 'fail',
          points: 0,
          maxPoints,
          details: 'No Product schema name to compare'
        }
      };
    }

    const nameLower = productName.toLowerCase().trim();
    let matches = 0;
    const locations = [];
    const pointsPerLocation = maxPoints / 4;

    // 1. H1 text
    const h1Text = extractedData.contentStructure?.headings?.h1?.texts?.[0];
    if (h1Text) {
      const h1Lower = h1Text.toLowerCase().trim();
      if (h1Lower === nameLower || h1Lower.includes(nameLower) || nameLower.includes(h1Lower)) {
        matches++;
        locations.push('H1');
      }
    }

    // 2. og:title
    const ogTitle = extractedData.metaTags?.openGraph?.title;
    if (ogTitle) {
      const ogLower = ogTitle.toLowerCase().trim();
      if (ogLower === nameLower || ogLower.includes(nameLower) || nameLower.includes(ogLower)) {
        matches++;
        locations.push('og:title');
      }
    }

    // 3. Meta description (contains check)
    const metaDesc = extractedData.metaTags?.standard?.description;
    if (metaDesc) {
      const metaLower = metaDesc.toLowerCase();
      // Check if meta description contains the product name or a significant portion of it
      const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);
      const matchedWords = nameWords.filter(w => metaLower.includes(w));
      if (metaLower.includes(nameLower) || matchedWords.length >= Math.ceil(nameWords.length * 0.6)) {
        matches++;
        locations.push('meta desc');
      }
    }

    // 4. Page title (document.title via og:title or standard title)
    const pageTitle = extractedData.pageInfo?.title;
    if (pageTitle) {
      const titleLower = pageTitle.toLowerCase().trim();
      if (titleLower === nameLower || titleLower.includes(nameLower) || nameLower.includes(titleLower)) {
        matches++;
        locations.push('title');
      }
    }

    const score = Math.round(matches * pointsPerLocation);
    const status = matches >= 3 ? 'pass' : matches >= 2 ? 'warning' : 'fail';
    const details = matches > 0
      ? `Name aligned in ${matches}/4 locations (${locations.join(', ')})`
      : 'Product name not aligned across page elements';

    return {
      score,
      factor: {
        name: 'Entity Consistency',
        status,
        points: score,
        maxPoints,
        details
      }
    };
  }

  /**
   * Score answer-format content — "best for" statements, comparisons, how-to, use cases
   * @param {Object} extractedData - Full extracted data
   * @param {number} maxPoints - Maximum points for this factor
   */
  scoreAnswerFormatContent(extractedData, maxPoints) {
    const answerFormat = extractedData.aiDiscoverability?.answerFormat;
    if (!answerFormat) {
      return {
        score: 0,
        factor: {
          name: 'Answer-Format Content',
          status: 'fail',
          points: 0,
          maxPoints,
          details: 'No answer-format content detected'
        }
      };
    }

    let signals = 0;
    const found = [];

    if (answerFormat.bestForCount > 0) {
      signals++;
      found.push(`${answerFormat.bestForCount} "best for" statement${answerFormat.bestForCount !== 1 ? 's' : ''}`);
    }
    if (answerFormat.hasComparison) {
      signals++;
      found.push('comparison content');
    }
    if (answerFormat.hasHowTo) {
      signals++;
      found.push('how-to content');
    }
    if (answerFormat.useCaseCount > 0) {
      signals++;
      found.push(`${answerFormat.useCaseCount} use case${answerFormat.useCaseCount !== 1 ? 's' : ''}`);
    }

    const score = Math.round((signals / 4) * maxPoints);
    const status = signals >= 3 ? 'pass' : signals >= 1 ? 'warning' : 'fail';
    const details = found.length > 0
      ? `Found: ${found.join(', ')}`
      : 'No answer-format content (add "best for", comparisons, how-to, or use cases)';

    return {
      score,
      factor: {
        name: 'Answer-Format Content',
        status,
        points: score,
        maxPoints,
        details
      }
    };
  }

  /**
   * Score product identifiers — GTIN/UPC/MPN presence in Product schema
   * @param {Object} extractedData - Full extracted data
   * @param {number} maxPoints - Maximum points for this factor
   */
  scoreProductIdentifiers(extractedData, maxPoints) {
    const product = extractedData.structuredData?.schemas?.product;
    if (!product) {
      return {
        score: 0,
        factor: {
          name: 'Product Identifiers',
          status: 'fail',
          points: 0,
          maxPoints,
          details: 'No Product schema found'
        }
      };
    }

    const identifiers = [];
    if (product.gtin) identifiers.push('GTIN');
    if (product.mpn) identifiers.push('MPN');
    if (product.sku) identifiers.push('SKU');

    let score = 0;
    if (identifiers.length >= 2) {
      score = maxPoints;
    } else if (identifiers.length === 1) {
      score = Math.round(maxPoints * 0.5);
    }

    const status = identifiers.length >= 2 ? 'pass' : identifiers.length === 1 ? 'warning' : 'fail';
    const details = identifiers.length > 0
      ? `Found: ${identifiers.join(', ')}`
      : 'No GTIN, MPN, or SKU in Product schema';

    return {
      score,
      factor: {
        name: 'Product Identifiers',
        status,
        points: score,
        maxPoints,
        details
      }
    };
  }

  /**
   * Score AI crawler access based on robots.txt rules
   * @param {Object} robotsData - Parsed robots.txt data
   * @param {number} maxPoints - Maximum points for this factor
   */
  scoreAICrawlerAccess(robotsData, maxPoints) {
    let score = 0;
    let status = 'unknown';
    let details = 'Unable to check robots.txt';

    if (robotsData.accessible === false && robotsData.error) {
      // CORS blocked - can't determine
      status = 'warning';
      details = 'robots.txt not accessible (CORS)';
      score = maxPoints * 0.5; // Give partial credit
    } else if (robotsData.accessible === false) {
      // No robots.txt - assume allowed
      status = 'pass';
      details = 'No robots.txt (AI crawlers allowed)';
      score = maxPoints;
    } else if (robotsData.accessible) {
      const blockedCount = robotsData.blockedCrawlers?.length || 0;
      const allowedCount = robotsData.allowedCrawlers?.length || 0;
      const totalMajor = blockedCount + allowedCount;

      if (blockedCount === 0) {
        status = 'pass';
        details = `All major AI crawlers allowed`;
        score = maxPoints;
      } else if (blockedCount < totalMajor) {
        status = 'warning';
        details = `${blockedCount}/${totalMajor} AI crawlers blocked: ${robotsData.blockedCrawlers.slice(0, 3).join(', ')}`;
        score = Math.round(maxPoints * (allowedCount / totalMajor));
      } else {
        status = 'fail';
        details = `All major AI crawlers blocked`;
        score = 0;
      }
    }

    return {
      score,
      factor: {
        name: 'AI Crawler Access',
        status,
        points: score,
        maxPoints,
        critical: status === 'fail',
        details
      }
    };
  }

  /**
   * Score llms.txt presence
   * @param {Object} llmsData - llms.txt fetch results
   * @param {number} maxPoints - Maximum points for this factor
   */
  scoreLlmsTxt(llmsData, maxPoints) {
    let score = 0;
    let status = 'fail';
    let details = 'No llms.txt found';

    if (llmsData.found) {
      if (llmsData.llmsTxt?.found && llmsData.llmsFullTxt?.found) {
        status = 'pass';
        score = maxPoints;
        details = 'Both llms.txt and llms-full.txt found';
      } else if (llmsData.llmsTxt?.found) {
        status = 'pass';
        score = maxPoints;
        details = 'llms.txt found';
      } else if (llmsData.llmsFullTxt?.found) {
        status = 'pass';
        score = Math.round(maxPoints * 0.8);
        details = 'llms-full.txt found (llms.txt recommended)';
      }
    }

    return {
      score,
      factor: {
        name: 'llms.txt Presence',
        status,
        points: score,
        maxPoints,
        details
      }
    };
  }
}
