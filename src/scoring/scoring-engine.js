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
  getContextMultiplier,
  PDP_CATEGORY_WEIGHTS,
  PDP_FACTOR_WEIGHTS,
  getPdpGradeDescription,
  getPdpContextMultiplier,
  SEO_CATEGORY_WEIGHTS,
  SEO_FACTOR_WEIGHTS,
  getSeoGradeDescription
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
    const isPlp = extractedData.pageType?.type === 'plp';
    // Calculate category scores
    const categoryScores = {
      structuredData: this.scoreStructuredData(extractedData.structuredData, isPlp),
      protocolMeta: this.scoreProtocolMeta(extractedData.metaTags, imageVerification, aiDiscoverabilityData?.lastModified),
      contentQuality: this.scoreContentQuality(extractedData.contentQuality, extractedData.aiDiscoverability, extractedData),
      contentStructure: this.scoreContentStructure(extractedData.contentStructure, extractedData.contentQuality?.textMetrics),
      authorityTrust: this.scoreAuthorityTrust(extractedData.trustSignals, extractedData.aiDiscoverability),
      aiDiscoverability: this.scoreAIDiscoverability(extractedData, aiDiscoverabilityData, isPlp)
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
    const jsDependent = ['high', 'medium'].includes(extractedData.contentStructure?.jsDependency?.dependencyLevel);
    // Include page type detection result
    const pageType = extractedData.pageType || { type: 'unknown', confidence: 'low', signals: [] };

    return {
      totalScore,
      grade,
      gradeDescription: getGradeDescription(grade),
      context: this.context,
      categoryScores,
      jsDependent,
      pageType,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Score Structured Data category (20% weight)
   */
  scoreStructuredData(data, isPlp = false) {
    const factors = [];
    let rawScore = 0;
    const maxScore = 100;
    const weights = FACTOR_WEIGHTS.structuredData;

    // Product Schema (30 points) - Critical, graduated scoring (N/A for PLP)
    if (isPlp) {
      factors.push({ name: 'Product Schema', status: 'na', points: weights.productSchema, maxPoints: weights.productSchema, critical: true, details: 'N/A — Collection Page' });
      rawScore += weights.productSchema;
    } else {
      const product = data?.schemas?.product;
      const hasProduct = product != null; // handles both null (no schema found) and undefined (extraction error)
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
    }

    // Offer Schema (20 points) - Critical (N/A for PLP)
    if (isPlp) {
      factors.push({ name: 'Offer Schema', status: 'na', points: weights.offerSchema, maxPoints: weights.offerSchema, critical: true, details: 'N/A — Collection Page' });
      rawScore += weights.offerSchema;
    } else {
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
    }

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

    // Review Schema (10 points) — N/A for PLP
    if (isPlp) {
      factors.push({ name: 'Review Schema', status: 'na', points: weights.reviewSchema, maxPoints: weights.reviewSchema, details: 'N/A — Collection Page' });
      rawScore += weights.reviewSchema;
    } else {
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
    }

    // FAQ Schema (10 points)
    const hasFaq = data?.schemas?.faq !== null && data.schemas.faq?.questionCount > 0;
    const faqSchemaScope = data?.schemas?.faq?.scope || 'standalone';
    const faqSchemaIsPageLevel = faqSchemaScope === 'page';
    const faqScore = hasFaq
      ? (faqSchemaIsPageLevel ? Math.round(weights.faqSchema * 0.5) : weights.faqSchema)
      : 0;
    factors.push({
      name: 'FAQ Schema',
      status: hasFaq ? (faqSchemaIsPageLevel ? 'warning' : 'pass') : 'fail',
      points: faqScore,
      maxPoints: weights.faqSchema,
      details: hasFaq
        ? `${data.schemas.faq.questionCount} FAQs structured${faqSchemaIsPageLevel ? ' (page-level — not product-specific)' : ''}`
        : 'No FAQ schema'
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
      score: Math.min(100, rawScore),
      maxScore,
      factors,
      weight: CATEGORY_WEIGHTS.structuredData,
      categoryName: 'Structured Data'
    };
  }

  /**
   * Score Protocol & Meta Compliance category (15% weight)
   */
  scoreProtocolMeta(data, imageVerification, lastModifiedData = null) {
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
      details: hasOgImage ? (og.image.length > 80 ? og.image.substring(0, 80) + '...' : og.image) : 'No og:image tag found'
    });
    rawScore += ogImageScore;

    // og:image format (5 points) — compatibility advisory
    // JPEG/PNG = pass. WebP = warning (works on all major platforms; JPEG preferred for
    // maximum compatibility with niche link-preview clients and older automation tools).
    // LLM crawlers (GPTBot, ClaudeBot, PerplexityBot) are text-only parsers and do not
    // process image binaries — format is irrelevant to indexing. Major platforms (Google,
    // social, LLM chat UIs) all support WebP. See DEC-0029.
    let imageFormatScore = 0;
    let imageFormatStatus = 'unknown';
    let imageFormatDetails = 'Image format not verified';

    if (imageVerification) {
      if (imageVerification.isWebP) {
        imageFormatScore = Math.round(weights.ogImageFormat / 2);
        imageFormatStatus = 'warning';
        imageFormatDetails = 'WebP: works on major platforms; JPEG offers broader compatibility with niche clients';
      } else if (imageVerification.isValidFormat) {
        imageFormatScore = weights.ogImageFormat;
        imageFormatStatus = 'pass';
        imageFormatDetails = `Format: ${imageVerification.format?.toUpperCase() || 'Valid'}`;
      } else {
        imageFormatScore = 0;
        imageFormatStatus = 'warning';
        imageFormatDetails = `Format: ${imageVerification.format || 'Unknown'} — verify compatibility`;
      }
    } else if (hasOgImage) {
      // Infer from URL if not verified
      const url = og.image.toLowerCase();
      if (url.endsWith('.webp') || url.includes('.webp?')) {
        imageFormatScore = Math.round(weights.ogImageFormat / 2);
        imageFormatStatus = 'warning';
        imageFormatDetails = 'WebP detected in URL: works on major platforms; JPEG offers broader compatibility';
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
    const isProductType = og.type && (og.type === 'product' || og.type === 'og:product' || og.type.startsWith('product.'));
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
      maxPoints: weights.twitterImage,
      details: hasTwitterImage ? 'twitter:image present' : 'Missing twitter:image'
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
    // Note: isBlocked was removed from extractor in v2.1.1; read robots.noindex directly
    const isBlocked = data?.robots?.noindex === true;
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

    // Last-Modified Header (12 points) — Ahrefs: 25.7% fresher content in AI citations
    let lastModifiedScore = 0;
    let lastModifiedStatus = 'fail';
    let lastModifiedDetails = 'Last-Modified header not present or not accessible';
    if (lastModifiedData?.lastModified) {
      const modifiedDate = new Date(lastModifiedData.lastModified);
      if (isNaN(modifiedDate)) {
        lastModifiedScore = 0;
        lastModifiedStatus = 'fail';
        lastModifiedDetails = 'Last-Modified header value could not be parsed';
      } else {
        const ageInDays = (Date.now() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays <= 90) {
          lastModifiedScore = weights.lastModified;
          lastModifiedStatus = 'pass';
          lastModifiedDetails = `Last-Modified: ${modifiedDate.toLocaleDateString()} (${Math.round(ageInDays)} days ago)`;
        } else {
          lastModifiedScore = Math.round(weights.lastModified * 0.5);
          lastModifiedStatus = 'warning';
          lastModifiedDetails = `Last-Modified: ${modifiedDate.toLocaleDateString()} (${Math.round(ageInDays)} days ago — content may be considered stale by AI systems)`;
        }
      }
    } else if (lastModifiedData?.accessible === false) {
      lastModifiedStatus = 'fail';
      lastModifiedDetails = 'Last-Modified header not returned by server';
    }
    factors.push({
      name: 'Last-Modified Header',
      status: lastModifiedStatus,
      points: lastModifiedScore,
      maxPoints: weights.lastModified,
      details: lastModifiedDetails
    });
    rawScore += lastModifiedScore;

    return {
      score: Math.min(100, rawScore),
      maxScore,
      factors,
      weight: CATEGORY_WEIGHTS.protocolMeta,
      categoryName: 'Protocol & Meta Compliance'
    };
  }

  /**
   * Detect if product is likely apparel/fashion based on breadcrumbs and schema
   * @param {Object} extractedData - Full extracted data
   * @returns {boolean}
   */
  static isLikelyApparel(extractedData) {
    const apparelKeywords = /\b(clothing|apparel|fashion|dress|dresses|shirt|shirts|pants|jeans|jacket|jackets|sweater|tops|blouse|skirt|shorts|lingerie|underwear|swimwear|activewear|outerwear|footwear|shoes|boots|sneakers|sandals|socks|hosiery|accessories|jewel|handbag|purse|scarf|hat|gloves|belt|tie|suit|blazer|coat|hoodie|legging|romper|jumpsuit|bodysuit|cardigan|pullover|vest|parka|v[eê]tements|robes?|pantalon|chaussure|manteau)\b/i;

    // Check breadcrumbs
    const breadcrumb = extractedData?.structuredData?.schemas?.breadcrumb;
    if (breadcrumb?.items) {
      const crumbText = breadcrumb.items.map(i => i.name || '').join(' ');
      if (apparelKeywords.test(crumbText)) return true;
    }

    // Check product schema category
    const product = extractedData?.structuredData?.schemas?.product;
    if (product?.category && apparelKeywords.test(product.category)) return true;

    // Check URL path
    try {
      const path = (extractedData?.metaTags?.canonical?.url || '').toLowerCase();
      if (apparelKeywords.test(path)) return true;
    } catch (e) { /* skip */ }

    return false;
  }

  /**
   * Score Content Quality category (20% weight)
   * @param {Object} data - Content quality extraction data
   * @param {Object} aiSignals - AI discoverability signals (for comparison content factor)
   * @param {Object} extractedData - Full extracted data (for category detection)
   */
  scoreContentQuality(data, aiSignals = null, extractedData = null) {
    const factors = [];
    let rawScore = 0;
    const maxScore = 100;
    const weights = FACTOR_WEIGHTS.contentQuality;
    const desc = data?.description || {};
    const specs = data?.specifications || {};
    const features = data?.features || {};
    const faq = data?.faq || {};
    const details = data?.productDetails || {};
    const isApparel = extractedData ? ScoringEngine.isLikelyApparel(extractedData) : false;

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

    // Description Quality — Contextual
    // Scores use-case benefit framing and technical terminology
    // Note: emotional/persuasive tone alone shows no improvement (GEO paper, SIGKDD '24)
    // hasBenefitStatements detects "ideal for X", "designed for Y" framing
    let descQualityScore = 0;
    const hasBenefits = desc.hasBenefitStatements;
    const hasEmotional = desc.hasEmotionalLanguage;
    const hasTechnical = desc.hasTechnicalTerms;

    if (hasBenefits) {
      descQualityScore += (weights.descriptionQuality / 2) * this.multipliers.useCaseBenefitCopy;
    }
    if (hasTechnical) {
      descQualityScore += (weights.descriptionQuality / 2) * this.multipliers.technicalSpecifications;
    }
    descQualityScore = Math.min(weights.descriptionQuality, Math.round(descQualityScore));

    factors.push({
      name: 'Description Quality',
      status: descQualityScore >= weights.descriptionQuality * 0.7 ? 'pass' : descQualityScore > 0 ? 'warning' : 'fail',
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

    // Factual Specificity (10 points) — GEO paper: statistics addition boosts AI visibility +40%
    const fsData = extractedData?.contentQuality?.factualSpecificity || {};
    const statsCount = fsData.statisticsCount || 0;
    let factualSpecScore, factualSpecStatus, factualSpecDetails;
    if (statsCount >= 3) {
      factualSpecScore = weights.factualSpecificity;
      factualSpecStatus = 'pass';
      factualSpecDetails = `${statsCount} quantified claim${statsCount !== 1 ? 's' : ''} detected (percentages, measurements, named sources)`;
    } else if (statsCount >= 1) {
      factualSpecScore = Math.round(weights.factualSpecificity * 0.5);
      factualSpecStatus = 'warning';
      factualSpecDetails = `${statsCount} quantified claim${statsCount !== 1 ? 's' : ''} detected — add statistics and measurements for full score`;
    } else {
      factualSpecScore = 0;
      factualSpecStatus = 'fail';
      factualSpecDetails = 'No statistics, percentages, or quantified claims detected in product description';
    }
    // Context-neutral: factual specificity benefits all purchase intents equally
    factors.push({
      name: 'Factual Specificity',
      status: factualSpecStatus,
      points: factualSpecScore,
      maxPoints: weights.factualSpecificity,
      details: factualSpecDetails
    });
    rawScore += factualSpecScore;

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
    const faqSectionScope = faq.scope || (faq.source === 'dom' ? 'dom' : 'standalone');
    const faqSectionIsPageLevel = faqSectionScope === 'page';
    const faqBaseScore = faq.countScore ? Math.round((faq.countScore / 100) * weights.faqPresence) : 0;
    const faqSectionScore = faqSectionIsPageLevel ? Math.round(faqBaseScore * 0.5) : faqBaseScore;
    const faqSectionStatus = faqCount >= 3
      ? (faqSectionIsPageLevel ? 'warning' : 'pass')
      : faqCount > 0 ? 'warning' : 'fail';
    const faqSource = faq.source ? ` (${faq.source})` : '';
    const faqScopeLabel = faqSectionIsPageLevel ? ' — page-level, not product-specific' : '';
    factors.push({
      name: 'FAQ Section',
      status: faqSectionStatus,
      points: faqSectionScore,
      maxPoints: weights.faqPresence,
      details: faqCount > 0
        ? `${faqCount} FAQ${faqCount !== 1 ? 's' : ''}${faqSource}${faqScopeLabel}`
        : 'No FAQ found'
    });
    rawScore += faqSectionScore;

    // Dimensions (5 points) - Contextual for Need; N/A for apparel (use size chart instead)
    let dimensionsScore = details.hasDimensions ? weights.dimensions : 0;
    if (this.context === 'need') dimensionsScore = Math.round(dimensionsScore * 1.3);
    const dimensionsNA = isApparel && !details.hasDimensions;
    if (dimensionsNA) dimensionsScore = weights.dimensions;
    factors.push({
      name: 'Dimensions/Size',
      status: dimensionsNA ? 'pass' : (details.hasDimensions ? 'pass' : 'fail'),
      points: Math.min(weights.dimensions, dimensionsScore),
      maxPoints: weights.dimensions,
      contextual: this.context === 'need',
      details: dimensionsNA ? 'N/A for apparel'
        : details.hasDimensions ? (details.dimensionsText || 'Dimensions found')
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

    // Warranty Info (7 points) - Contextual; N/A for apparel (return policy suffices)
    const warrantyNA = isApparel && !details.hasWarranty;
    let warrantyScore = (details.hasWarranty || warrantyNA) ? weights.warrantyInfo : 0;
    if (!warrantyNA) warrantyScore = Math.round(warrantyScore * this.multipliers.warrantyInfo);
    factors.push({
      name: 'Warranty Information',
      status: warrantyNA ? 'pass' : (details.hasWarranty ? 'pass' : 'fail'),
      points: Math.min(weights.warrantyInfo, warrantyScore),
      maxPoints: weights.warrantyInfo,
      contextual: true,
      details: warrantyNA ? 'N/A for apparel'
        : details.hasWarranty ? (details.warrantyText || 'Warranty found')
        : 'No warranty information found'
    });
    rawScore += Math.min(weights.warrantyInfo, warrantyScore);

    // Compatibility Info (10 points) - Contextual; N/A for apparel
    const compatNA = isApparel && !details.hasCompatibility;
    let compatScore = (details.hasCompatibility || compatNA) ? weights.compatibilityInfo : 0;
    if (!compatNA) compatScore = Math.round(compatScore * this.multipliers.compatibilityInfo);
    factors.push({
      name: 'Compatibility Information',
      status: compatNA ? 'pass' : (details.hasCompatibility ? 'pass' : 'fail'),
      points: Math.min(weights.compatibilityInfo, compatScore),
      maxPoints: weights.compatibilityInfo,
      contextual: true,
      details: compatNA ? 'N/A for apparel'
        : details.hasCompatibility ? (details.compatibilityText || 'Compatibility info found')
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
   * Score Content Structure category (12% weight)
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
      name: hasSingleH1 ? 'H1 Heading' : hasH1 ? 'H1 Heading (Multiple)' : 'H1 Heading',
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
   * Score Authority & Trust category (13% weight)
   * @param {Object} data - Trust signals extraction data
   * @param {Object} aiSignals - AI discoverability signals (for Content Freshness dates)
   */
  scoreAuthorityTrust(data, aiSignals = null) {
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
    const reviewCap = Math.round(Math.min(weights.reviewCount * 1.5, weights.reviewCount * this.multipliers.reviewCount));
    factors.push({
      name: 'Review Count',
      status: reviews.count >= 50 ? 'pass' : reviews.count >= 10 ? 'warning' : 'fail',
      points: Math.min(reviewCap, reviewCountScore),
      maxPoints: reviewCap,
      contextual: true,
      details: reviews.count > 0 ? `${reviews.count} reviews` : 'No reviews found'
    });
    rawScore += Math.min(reviewCap, reviewCountScore);

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

    // Awards (2 points)
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

    // Content Freshness (5 points)
    // Uses schema date signals from aiDiscoverability extraction
    const schemaDate = aiSignals?.schemaDate || {};
    const visibleDate = aiSignals?.visibleDate || {};
    const bestDate = schemaDate.dateModified || schemaDate.datePublished || null;
    let freshnessScore = 0;
    let freshnessStatus = 'fail';
    let freshnessDetails = 'No date information found';

    if (bestDate) {
      const daysAgo = (Date.now() - new Date(bestDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo <= 90) {
        freshnessScore = weights.contentFreshness;
        freshnessStatus = 'pass';
        freshnessDetails = `Updated ${Math.round(daysAgo)} days ago`;
      } else {
        freshnessScore = Math.round(weights.contentFreshness * 0.5);
        freshnessStatus = 'warning';
        freshnessDetails = `Last updated ${Math.round(daysAgo)} days ago (aim for <90 days)`;
      }
    } else if (visibleDate?.found) {
      freshnessScore = Math.round(weights.contentFreshness * 0.5);
      freshnessStatus = 'warning';
      freshnessDetails = 'Date visible on page but not in schema markup';
    }

    factors.push({
      name: 'Content Freshness',
      status: freshnessStatus,
      points: freshnessScore,
      maxPoints: weights.contentFreshness,
      details: freshnessDetails
    });
    rawScore += freshnessScore;

    // Social Proof Depth (4 points)
    const socialProof = data?.socialProof || {};
    const hasSocialCount = !!(socialProof.soldCount || socialProof.customerCount);
    let socialScore = hasSocialCount ? weights.socialProofDepth : 0;
    socialScore = Math.round(socialScore * (this.multipliers.socialProof || 1.0));
    const socialMax = Math.round(weights.socialProofDepth * (this.multipliers.socialProof || 1.0));
    let socialDetails = 'No sold count or customer count found';
    if (socialProof.soldCount) {
      socialDetails = `${socialProof.soldCount.toLocaleString()} sold`;
    } else if (socialProof.customerCount) {
      socialDetails = `${socialProof.customerCount.toLocaleString()} customers`;
    }

    factors.push({
      name: 'Social Proof Depth',
      status: hasSocialCount ? 'pass' : 'fail',
      points: socialScore,
      maxPoints: socialMax,
      contextual: true,
      details: socialDetails
    });
    rawScore += socialScore;

    // Expert Attribution (3 points)
    const expertAttr = data?.expertAttribution || {};
    const hasExpert = !!expertAttr.found;
    const expertScore = hasExpert ? weights.expertAttribution : 0;
    factors.push({
      name: 'Expert Attribution',
      status: hasExpert ? 'pass' : 'fail',
      points: expertScore,
      maxPoints: weights.expertAttribution,
      details: hasExpert
        ? 'Expert attribution found (clinical, professional, or editorial)'
        : 'No expert attribution found (e.g. "clinically tested", "dermatologist approved")'
    });
    rawScore += expertScore;

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
  scoreAIDiscoverability(extractedData, networkData, isPlp = false) {
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

    // Entity Consistency (30 points)
    const entityResult = this.scoreEntityConsistency(extractedData, weights.entityConsistency);
    factors.push(entityResult.factor);
    rawScore += entityResult.score;

    // Answer-Format Content (20 points)
    const answerResult = this.scoreAnswerFormatContent(extractedData, weights.answerFormatContent);
    factors.push(answerResult.factor);
    rawScore += answerResult.score;

    // Product Identifiers (15 points) — N/A for PLP
    if (isPlp) {
      factors.push({ name: 'Product Identifiers', status: 'na', points: weights.productIdentifiers, maxPoints: weights.productIdentifiers, details: 'N/A — Collection Page' });
      rawScore += weights.productIdentifiers;
    } else {
      const identResult = this.scoreProductIdentifiers(extractedData, weights.productIdentifiers);
      factors.push(identResult.factor);
      rawScore += identResult.score;
    }

    // llms.txt Presence (5 points)
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

    // 1. Schema.org Product name — always present (required to reach this point)
    matches++;
    locations.push('schema');

    // 2. H1 text — use first non-empty H1 (some platforms emit empty placeholder H1s)
    const h1Texts = extractedData.contentStructure?.headings?.h1?.texts || [];
    const h1Text = h1Texts.find(t => t.trim().length > 0) || '';
    if (h1Text) {
      const h1Lower = h1Text.toLowerCase().trim();
      if (h1Lower === nameLower || h1Lower.includes(nameLower) || nameLower.includes(h1Lower)) {
        matches++;
        locations.push('H1');
      }
    }

    // 3. HTML <title> tag — the primary signal LLMs use for page identity
    const pageTitle = extractedData.seoSignals?.titleTag?.text || extractedData.pageInfo?.title;
    if (pageTitle) {
      const titleLower = pageTitle.toLowerCase().trim();
      if (titleLower === nameLower || titleLower.includes(nameLower) || nameLower.includes(titleLower)) {
        matches++;
        locations.push('page title');
      }
    }

    // 4. Meta description (contains check)
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

    if (!robotsData || typeof robotsData !== 'object') {
      return {
        score: 0,
        factor: { name: 'AI Crawler Access', status: 'unknown', points: 0, maxPoints, details }
      };
    }

    if (robotsData.accessible === false && robotsData.error) {
      // CORS blocked - can't determine
      status = 'warning';
      details = 'robots.txt not accessible (CORS)';
      score = Math.round(maxPoints * 0.5); // Give partial credit
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

  // ==========================================
  // PDP QUALITY SCORING
  // ==========================================

  /**
   * Calculate PDP Quality score from extracted data
   * @param {Object} extractedData - Data from content script
   * @returns {Object} Complete PDP Quality scoring result
   */
  calculatePdpQualityScore(extractedData) {
    const pdpData = extractedData.pdpQuality || {};
    const pageType = extractedData.pageType || { type: 'unknown', confidence: 'low', signals: [] };
    const isPlp = pageType.type === 'plp';

    const categoryScores = {
      purchaseExperience: this.scorePurchaseExperience(pdpData.purchaseExperience, isPlp),
      trustConfidence: this.scoreTrustConfidence(pdpData.trustConfidence),
      visualPresentation: this.scoreVisualPresentation(pdpData.visualPresentation, isPlp),
      contentCompleteness: this.scoreContentCompleteness(pdpData.contentCompleteness, isPlp),
      reviewsSocialProof: this.scoreReviewsSocialProof(pdpData.reviewsSocialProof, isPlp)
    };

    const totalScore = Math.round(
      categoryScores.purchaseExperience.score * PDP_CATEGORY_WEIGHTS.purchaseExperience +
      categoryScores.trustConfidence.score * PDP_CATEGORY_WEIGHTS.trustConfidence +
      categoryScores.visualPresentation.score * PDP_CATEGORY_WEIGHTS.visualPresentation +
      categoryScores.contentCompleteness.score * PDP_CATEGORY_WEIGHTS.contentCompleteness +
      categoryScores.reviewsSocialProof.score * PDP_CATEGORY_WEIGHTS.reviewsSocialProof
    );

    const grade = getGrade(totalScore);

    return {
      totalScore,
      grade,
      gradeDescription: getPdpGradeDescription(grade),
      context: this.context,
      categoryScores,
      pageType,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Score Purchase Experience category (25% weight)
   */
  scorePurchaseExperience(data, isPlp = false) {
    const factors = [];
    let rawScore = 0;
    const weights = PDP_FACTOR_WEIGHTS.purchaseExperience;

    // Price Visibility (20 pts)
    const priceScore = data?.priceVisible ? weights.priceVisibility : 0;
    factors.push({
      name: 'Price Visibility',
      status: data?.priceVisible ? 'pass' : 'fail',
      points: priceScore,
      maxPoints: weights.priceVisibility,
      details: data?.priceVisible ? (data.priceText || 'Price visible') : 'No visible price found'
    });
    rawScore += priceScore;

    // CTA Button Presence (20 pts)
    const ctaScore = data?.ctaFound ? weights.ctaButtonPresence : 0;
    factors.push({
      name: 'CTA Button Presence',
      status: data?.ctaFound ? 'pass' : 'fail',
      points: ctaScore,
      maxPoints: weights.ctaButtonPresence,
      details: data?.ctaFound ? (data.ctaText || 'CTA button found') : 'No add-to-cart or buy button found'
    });
    rawScore += ctaScore;

    // CTA Clarity (15 pts) — N/A on collection pages (no single product CTA)
    if (isPlp) {
      factors.push({
        name: 'CTA Clarity',
        status: 'pass',
        points: weights.ctaClarity,
        maxPoints: weights.ctaClarity,
        details: 'N/A — Collection Page'
      });
      rawScore += weights.ctaClarity;
    } else {
      let ctaClarityScore = 0;
      let ctaClarityStatus = 'fail';
      if (data?.ctaFound && data?.ctaIsClear) {
        ctaClarityScore = weights.ctaClarity;
        ctaClarityStatus = 'pass';
      } else if (data?.ctaFound) {
        ctaClarityScore = Math.round(weights.ctaClarity * 0.5);
        ctaClarityStatus = 'warning';
      }
      factors.push({
        name: 'CTA Clarity',
        status: ctaClarityStatus,
        points: ctaClarityScore,
        maxPoints: weights.ctaClarity,
        details: data?.ctaIsClear ? 'Clear, action-oriented CTA' : data?.ctaFound ? 'CTA exists but text is generic' : 'No CTA found'
      });
      rawScore += ctaClarityScore;
    }

    // Discount/Sale Messaging (15 pts)
    const discountScore = data?.hasDiscount ? weights.discountSaleMessaging : 0;
    factors.push({
      name: 'Discount/Sale Messaging',
      status: data?.hasDiscount ? 'pass' : 'fail',
      points: discountScore,
      maxPoints: weights.discountSaleMessaging,
      details: data?.hasDiscount ? (data.discountText || 'Sale/discount messaging found') : 'No sale or compare-at pricing found'
    });
    rawScore += discountScore;

    // Payment Method Indicators (15 pts)
    const paymentScore = data?.hasPaymentIndicators ? weights.paymentMethodIndicators : 0;
    factors.push({
      name: 'Payment Method Indicators',
      status: data?.hasPaymentIndicators ? 'pass' : 'fail',
      points: paymentScore,
      maxPoints: weights.paymentMethodIndicators,
      details: data?.hasPaymentIndicators ? 'Payment methods or BNPL messaging visible' : 'No payment method indicators found'
    });
    rawScore += paymentScore;

    // Urgency/Scarcity Signals (15 pts) — strong = full, soft = ~50%, none = 0
    const urgencyMultiplier = getPdpContextMultiplier(this.context, 'urgencyScarcitySignals');
    let urgencyScore = 0;
    let urgencyStatus = 'fail';
    let urgencyDetails = 'No urgency or scarcity indicators';
    if (data?.hasUrgency) {
      if (data?.urgencyIsStrong) {
        urgencyScore = weights.urgencyScarcitySignals;
        urgencyStatus = 'pass';
        urgencyDetails = 'Strong urgency or scarcity messaging found';
      } else {
        urgencyScore = Math.round(weights.urgencyScarcitySignals * 0.5);
        urgencyStatus = 'warning';
        urgencyDetails = 'Soft urgency signal detected (e.g. limited availability)';
      }
    }
    urgencyScore = Math.min(weights.urgencyScarcitySignals, Math.round(urgencyScore * urgencyMultiplier));
    factors.push({
      name: 'Urgency/Scarcity Signals',
      status: urgencyStatus,
      points: urgencyScore,
      maxPoints: weights.urgencyScarcitySignals,
      contextual: urgencyMultiplier !== 1.0,
      details: urgencyDetails
    });
    rawScore += urgencyScore;

    return {
      score: Math.min(100, rawScore),
      maxScore: 100,
      factors,
      weight: PDP_CATEGORY_WEIGHTS.purchaseExperience,
      categoryName: 'Purchase Experience'
    };
  }

  /**
   * Score Trust & Confidence category (20% weight)
   */
  scoreTrustConfidence(data) {
    const factors = [];
    let rawScore = 0;
    const weights = PDP_FACTOR_WEIGHTS.trustConfidence;

    // Return Policy Display (20 pts)
    const returnScore = data?.hasReturnPolicy ? weights.returnPolicyDisplay : 0;
    factors.push({
      name: 'Return Policy Display',
      status: data?.hasReturnPolicy ? 'pass' : 'fail',
      points: returnScore,
      maxPoints: weights.returnPolicyDisplay,
      details: data?.hasReturnPolicy ? (data.returnPolicyText || 'Return policy visible') : 'No return policy information found'
    });
    rawScore += returnScore;

    // Shipping Information (20 pts)
    const shippingScore = data?.hasShippingInfo ? weights.shippingInformation : 0;
    factors.push({
      name: 'Shipping Information',
      status: data?.hasShippingInfo ? 'pass' : 'fail',
      points: shippingScore,
      maxPoints: weights.shippingInformation,
      details: data?.hasShippingInfo ? (data.shippingText || 'Shipping info visible') : 'No shipping information found'
    });
    rawScore += shippingScore;

    // Trust Badges (20 pts)
    const trustScore = data?.hasTrustBadges ? weights.trustBadges : 0;
    factors.push({
      name: 'Trust Badges',
      status: data?.hasTrustBadges ? 'pass' : 'fail',
      points: trustScore,
      maxPoints: weights.trustBadges,
      details: data?.hasTrustBadges ? 'Trust/security badges found' : 'No trust badges or security seals found'
    });
    rawScore += trustScore;

    // Secure Checkout Signals (15 pts)
    let secureScore = 0;
    let secureStatus = 'fail';
    if (data?.hasSecureCheckout) {
      secureScore = weights.secureCheckoutSignals;
      secureStatus = 'pass';
    } else if (data?.isHttps) {
      secureScore = Math.round(weights.secureCheckoutSignals * 0.5);
      secureStatus = 'warning';
    }
    factors.push({
      name: 'Secure Checkout Signals',
      status: secureStatus,
      points: secureScore,
      maxPoints: weights.secureCheckoutSignals,
      details: data?.hasSecureCheckout ? 'HTTPS + secure checkout messaging' : data?.isHttps ? 'HTTPS but no secure checkout messaging' : 'Not HTTPS'
    });
    rawScore += secureScore;

    // Customer Service Indicators (15 pts)
    const csScore = data?.hasCustomerService ? weights.customerServiceIndicators : 0;
    factors.push({
      name: 'Customer Service Indicators',
      status: data?.hasCustomerService ? 'pass' : 'fail',
      points: csScore,
      maxPoints: weights.customerServiceIndicators,
      details: data?.hasCustomerService ? 'Customer service contact visible' : 'No customer service contact visible'
    });
    rawScore += csScore;

    // Guarantee/Warranty Display (10 pts)
    const guaranteeScore = data?.hasGuarantee ? weights.guaranteeWarrantyDisplay : 0;
    factors.push({
      name: 'Guarantee/Warranty Display',
      status: data?.hasGuarantee ? 'pass' : 'fail',
      points: guaranteeScore,
      maxPoints: weights.guaranteeWarrantyDisplay,
      details: data?.hasGuarantee ? (data.guaranteeText || 'Guarantee/warranty displayed') : 'No guarantee or warranty information'
    });
    rawScore += guaranteeScore;

    return {
      score: Math.min(100, rawScore),
      maxScore: 100,
      factors,
      weight: PDP_CATEGORY_WEIGHTS.trustConfidence,
      categoryName: 'Trust & Confidence'
    };
  }

  /**
   * Score Visual Presentation category (20% weight)
   */
  scoreVisualPresentation(data, isPlp = false) {
    const factors = [];
    let rawScore = 0;
    const weights = PDP_FACTOR_WEIGHTS.visualPresentation;

    // Product Image Count (20 pts) — 4+ = pass, 2-3 = warning
    const imgCount = data?.imageCount || 0;
    let imgScore = 0;
    let imgStatus = 'fail';
    if (imgCount >= 4) {
      imgScore = weights.productImageCount;
      imgStatus = 'pass';
    } else if (imgCount >= 2) {
      imgScore = Math.round(weights.productImageCount * 0.5);
      imgStatus = 'warning';
    } else if (imgCount === 1) {
      imgScore = Math.round(weights.productImageCount * 0.25);
      imgStatus = 'fail';
    }
    factors.push({
      name: 'Product Image Count',
      status: imgStatus,
      points: imgScore,
      maxPoints: weights.productImageCount,
      details: `${imgCount} product image${imgCount !== 1 ? 's' : ''} found${imgCount < 4 ? ' (aim for 4+)' : ''}`
    });
    rawScore += imgScore;

    // Video Presence (15 pts)
    const videoMultiplier = getPdpContextMultiplier(this.context, 'videoPresence');
    let videoScore = data?.hasVideo ? weights.videoPresence : 0;
    videoScore = Math.min(weights.videoPresence, Math.round(videoScore * videoMultiplier));
    factors.push({
      name: 'Video Presence',
      status: data?.hasVideo ? 'pass' : 'fail',
      points: videoScore,
      maxPoints: weights.videoPresence,
      contextual: videoMultiplier !== 1.0,
      details: data?.hasVideo ? 'Product video found' : 'No product video found'
    });
    rawScore += videoScore;

    // Image Gallery Features (15 pts) — N/A on collection pages
    const galleryNA = isPlp && !data?.hasGalleryFeatures;
    const galleryScore = (data?.hasGalleryFeatures || galleryNA) ? weights.imageGalleryFeatures : 0;
    factors.push({
      name: 'Image Gallery Features',
      status: galleryNA ? 'pass' : data?.hasGalleryFeatures ? 'pass' : 'fail',
      points: galleryScore,
      maxPoints: weights.imageGalleryFeatures,
      details: galleryNA ? 'N/A — Collection Page' : data?.hasGalleryFeatures ? 'Zoom, lightbox, or navigation found' : 'No gallery features (zoom, lightbox, nav)'
    });
    rawScore += galleryScore;

    // Lifestyle/Context Images (15 pts)
    const lifestyleMultiplier = getPdpContextMultiplier(this.context, 'lifestyleContextImages');
    let lifestyleScore = data?.hasLifestyleImages ? weights.lifestyleContextImages : 0;
    lifestyleScore = Math.min(weights.lifestyleContextImages, Math.round(lifestyleScore * lifestyleMultiplier));
    factors.push({
      name: 'Lifestyle/Context Images',
      status: data?.hasLifestyleImages ? 'pass' : 'fail',
      points: lifestyleScore,
      maxPoints: weights.lifestyleContextImages,
      contextual: lifestyleMultiplier !== 1.0,
      details: data?.hasLifestyleImages ? 'Lifestyle or in-use images found' : 'No lifestyle or context images detected'
    });
    rawScore += lifestyleScore;

    // Color/Variant Swatches (20 pts) — N/A on collection pages
    const swatchNA = isPlp && !data?.hasSwatches;
    const swatchMultiplier = getPdpContextMultiplier(this.context, 'colorVariantSwatches');
    let swatchScore = (data?.hasSwatches || swatchNA) ? weights.colorVariantSwatches : 0;
    if (!swatchNA) swatchScore = Math.min(weights.colorVariantSwatches, Math.round(swatchScore * swatchMultiplier));
    factors.push({
      name: 'Color/Variant Swatches',
      status: swatchNA ? 'pass' : data?.hasSwatches ? 'pass' : 'fail',
      points: swatchNA ? weights.colorVariantSwatches : swatchScore,
      maxPoints: weights.colorVariantSwatches,
      contextual: !swatchNA && swatchMultiplier !== 1.0,
      details: swatchNA ? 'N/A — Collection Page' : data?.hasSwatches ? 'Visual color/variant selectors found' : 'No visual variant swatches'
    });
    rawScore += swatchNA ? weights.colorVariantSwatches : swatchScore;

    // Image Quality Signals (15 pts)
    const qualityScore = data?.hasHighResImages ? weights.imageQualitySignals : 0;
    factors.push({
      name: 'Image Quality Signals',
      status: data?.hasHighResImages ? 'pass' : 'fail',
      points: qualityScore,
      maxPoints: weights.imageQualitySignals,
      details: data?.hasHighResImages ? 'High-resolution images with srcset' : 'No high-res image indicators found'
    });
    rawScore += qualityScore;

    return {
      score: Math.min(100, rawScore),
      maxScore: 100,
      factors,
      weight: PDP_CATEGORY_WEIGHTS.visualPresentation,
      categoryName: 'Visual Presentation'
    };
  }

  /**
   * Score Content Completeness category (15% weight)
   */
  scoreContentCompleteness(data, isPlp = false) {
    const factors = [];
    let rawScore = 0;
    const weights = PDP_FACTOR_WEIGHTS.contentCompleteness;

    // Product Variant Display (20 pts)
    const variantMultiplier = getPdpContextMultiplier(this.context, 'productVariantDisplay');
    let variantScore = data?.hasVariants ? weights.productVariantDisplay : 0;
    variantScore = Math.min(weights.productVariantDisplay, Math.round(variantScore * variantMultiplier));
    factors.push({
      name: 'Product Variant Display',
      status: data?.hasVariants ? 'pass' : 'fail',
      points: variantScore,
      maxPoints: weights.productVariantDisplay,
      contextual: variantMultiplier !== 1.0,
      details: data?.hasVariants ? 'Size/color/option selectors found' : 'No product variant selectors'
    });
    rawScore += variantScore;

    // Size Guide/Fit Info (15 pts) — N/A on collection pages
    const sizeNA = isPlp && !data?.hasSizeGuide;
    const sizeMultiplier = getPdpContextMultiplier(this.context, 'sizeGuideFitInfo');
    let sizeScore = (data?.hasSizeGuide || sizeNA) ? weights.sizeGuideFitInfo : 0;
    if (!sizeNA) sizeScore = Math.min(weights.sizeGuideFitInfo, Math.round(sizeScore * sizeMultiplier));
    factors.push({
      name: 'Size Guide/Fit Info',
      status: sizeNA ? 'pass' : data?.hasSizeGuide ? 'pass' : 'fail',
      points: sizeNA ? weights.sizeGuideFitInfo : sizeScore,
      maxPoints: weights.sizeGuideFitInfo,
      contextual: !sizeNA && sizeMultiplier !== 1.0,
      details: sizeNA ? 'N/A — Collection Page' : data?.hasSizeGuide ? 'Size guide or fit info available' : 'No size guide or fit information'
    });
    rawScore += sizeNA ? weights.sizeGuideFitInfo : sizeScore;

    // Related/Recommended Products (15 pts)
    const relatedScore = data?.hasRelatedProducts ? weights.relatedRecommendedProducts : 0;
    factors.push({
      name: 'Related/Recommended Products',
      status: data?.hasRelatedProducts ? 'pass' : 'fail',
      points: relatedScore,
      maxPoints: weights.relatedRecommendedProducts,
      details: data?.hasRelatedProducts ? 'Related or recommended products section found' : 'No related products section'
    });
    rawScore += relatedScore;

    // Q&A Section (15 pts) — N/A on collection pages
    const qaNA = isPlp && !data?.hasQASection;
    const qaScore = (data?.hasQASection || qaNA) ? weights.qaSection : 0;
    factors.push({
      name: 'Q&A Section',
      status: qaNA ? 'pass' : data?.hasQASection ? 'pass' : 'fail',
      points: qaScore,
      maxPoints: weights.qaSection,
      details: qaNA ? 'N/A — Collection Page' : data?.hasQASection ? 'Customer Q&A section found' : 'No Q&A section'
    });
    rawScore += qaScore;

    // Product Details Organization (15 pts)
    const orgScore = data?.hasOrganizedDetails ? weights.productDetailsOrganization : 0;
    factors.push({
      name: 'Product Details Organization',
      status: data?.hasOrganizedDetails ? 'pass' : 'fail',
      points: orgScore,
      maxPoints: weights.productDetailsOrganization,
      details: data?.hasOrganizedDetails ? 'Tabs, accordions, or organized sections found' : 'No structured content organization'
    });
    rawScore += orgScore;

    // "What's in the Box" (20 pts) — N/A on collection pages
    const boxNA = isPlp && !data?.hasWhatsInBox;
    const boxMultiplier = getPdpContextMultiplier(this.context, 'whatsInTheBox');
    let boxScore = (data?.hasWhatsInBox || boxNA) ? weights.whatsInTheBox : 0;
    if (!boxNA) boxScore = Math.min(weights.whatsInTheBox, Math.round(boxScore * boxMultiplier));
    factors.push({
      name: '"What\'s in the Box"',
      status: boxNA ? 'pass' : data?.hasWhatsInBox ? 'pass' : 'fail',
      points: boxNA ? weights.whatsInTheBox : boxScore,
      maxPoints: weights.whatsInTheBox,
      contextual: !boxNA && boxMultiplier !== 1.0,
      details: boxNA ? 'N/A — Collection Page' : data?.hasWhatsInBox ? 'Package contents or included items listed' : 'No package contents information'
    });
    rawScore += boxNA ? weights.whatsInTheBox : boxScore;

    return {
      score: Math.min(100, rawScore),
      maxScore: 100,
      factors,
      weight: PDP_CATEGORY_WEIGHTS.contentCompleteness,
      categoryName: 'Content Completeness'
    };
  }

  /**
   * Score Reviews & Social Proof category (20% weight)
   */
  scoreReviewsSocialProof(data, isPlp = false) {
    const factors = [];
    let rawScore = 0;
    const weights = PDP_FACTOR_WEIGHTS.reviewsSocialProof;

    // Review Display Prominence (20 pts)
    const prominenceScore = data?.hasProminentReviews ? weights.reviewDisplayProminence : 0;
    factors.push({
      name: 'Review Display Prominence',
      status: data?.hasProminentReviews ? 'pass' : 'fail',
      points: prominenceScore,
      maxPoints: weights.reviewDisplayProminence,
      details: data?.hasProminentReviews ? 'Star rating visible in product hero area' : 'No rating display in hero area'
    });
    rawScore += prominenceScore;

    // Star Rating Visual (15 pts)
    const starScore = data?.hasStarVisual ? weights.starRatingVisual : 0;
    factors.push({
      name: 'Star Rating Visual',
      status: data?.hasStarVisual ? 'pass' : 'fail',
      points: starScore,
      maxPoints: weights.starRatingVisual,
      details: data?.hasStarVisual ? 'Visual star rating display found' : 'No visual star rating (icons/SVG)'
    });
    rawScore += starScore;

    // Review Sorting/Filtering (15 pts) — N/A on collection pages
    const sortNA = isPlp && !data?.hasReviewSorting;
    const sortScore = (data?.hasReviewSorting || sortNA) ? weights.reviewSortingFiltering : 0;
    factors.push({
      name: 'Review Sorting/Filtering',
      status: sortNA ? 'pass' : data?.hasReviewSorting ? 'pass' : 'fail',
      points: sortScore,
      maxPoints: weights.reviewSortingFiltering,
      details: sortNA ? 'N/A — Collection Page' : data?.hasReviewSorting ? 'Review sort/filter options found' : 'No review sorting or filtering'
    });
    rawScore += sortScore;

    // Photo/Video Reviews (20 pts) — N/A on collection pages
    const mediaNA = isPlp && !data?.hasMediaReviews;
    const mediaMultiplier = getPdpContextMultiplier(this.context, 'photoVideoReviews');
    let mediaScore = (data?.hasMediaReviews || mediaNA) ? weights.photoVideoReviews : 0;
    if (!mediaNA) mediaScore = Math.min(weights.photoVideoReviews, Math.round(mediaScore * mediaMultiplier));
    factors.push({
      name: 'Photo/Video Reviews',
      status: mediaNA ? 'pass' : data?.hasMediaReviews ? 'pass' : 'fail',
      points: mediaNA ? weights.photoVideoReviews : mediaScore,
      maxPoints: weights.photoVideoReviews,
      contextual: !mediaNA && mediaMultiplier !== 1.0,
      details: mediaNA ? 'N/A — Collection Page' : data?.hasMediaReviews ? 'Customer photo/video reviews found' : 'No customer-submitted review media'
    });
    rawScore += mediaNA ? weights.photoVideoReviews : mediaScore;

    // Social Proof Indicators (15 pts)
    const spMultiplier = getPdpContextMultiplier(this.context, 'socialProofIndicators');
    let spScore = data?.hasSocialProof ? weights.socialProofIndicators : 0;
    spScore = Math.min(weights.socialProofIndicators, Math.round(spScore * spMultiplier));
    factors.push({
      name: 'Social Proof Indicators',
      status: data?.hasSocialProof ? 'pass' : 'fail',
      points: spScore,
      maxPoints: weights.socialProofIndicators,
      contextual: spMultiplier !== 1.0,
      details: data?.hasSocialProof ? 'Social proof indicators found' : 'No "X people bought" or bestseller badges'
    });
    rawScore += spScore;

    // Review Count Threshold (15 pts) — 50+ = pass, 25-49 = warning
    const reviewCount = data?.reviewCount || 0;
    let countScore = 0;
    let countStatus = 'fail';
    if (reviewCount >= 50) {
      countScore = weights.reviewCountThreshold;
      countStatus = 'pass';
    } else if (reviewCount >= 25) {
      countScore = Math.round(weights.reviewCountThreshold * 0.5);
      countStatus = 'warning';
    } else if (reviewCount > 0) {
      countScore = Math.round(weights.reviewCountThreshold * 0.25);
      countStatus = 'fail';
    }
    factors.push({
      name: 'Review Count Threshold',
      status: countStatus,
      points: countScore,
      maxPoints: weights.reviewCountThreshold,
      details: `${reviewCount} reviews${reviewCount < 50 ? ' (aim for 50+)' : ''}`
    });
    rawScore += countScore;

    return {
      score: Math.min(100, rawScore),
      maxScore: 100,
      factors,
      weight: PDP_CATEGORY_WEIGHTS.reviewsSocialProof,
      categoryName: 'Reviews & Social Proof'
    };
  }

  // ==========================================
  // SEO QUALITY SCORING
  // ==========================================

  /**
   * Calculate SEO Quality score from extracted data
   * Context-neutral: no multipliers applied
   * @param {Object} extractedData - Data from content script
   * @returns {Object} Complete SEO Quality scoring result
   */
  calculateSeoQualityScore(extractedData) {
    const categoryScores = {
      titleMeta: this.scoreTitleMeta(extractedData),
      technicalFoundations: this.scoreTechnicalFoundations(extractedData),
      contentSignals: this.scoreContentSignals(extractedData),
      navigationDiscovery: this.scoreNavigationDiscovery(extractedData)
    };

    const totalScore = Math.round(
      categoryScores.titleMeta.score * SEO_CATEGORY_WEIGHTS.titleMeta +
      categoryScores.technicalFoundations.score * SEO_CATEGORY_WEIGHTS.technicalFoundations +
      categoryScores.contentSignals.score * SEO_CATEGORY_WEIGHTS.contentSignals +
      categoryScores.navigationDiscovery.score * SEO_CATEGORY_WEIGHTS.navigationDiscovery
    );

    const grade = getGrade(totalScore);

    const pageType = extractedData.pageType || { type: 'unknown', confidence: 'low', signals: [] };

    return {
      totalScore,
      grade,
      gradeDescription: getSeoGradeDescription(grade),
      context: 'neutral',
      categoryScores,
      pageType,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Score Title & Meta category (25%)
   */
  scoreTitleMeta(extractedData) {
    const factors = [];
    let rawScore = 0;
    const weights = SEO_FACTOR_WEIGHTS.titleMeta;
    const seo = extractedData.seoSignals || {};
    const title = seo.titleTag || {};
    const meta = extractedData.metaTags || {};
    const standard = meta.standard || {};

    // Title Tag Present (20 pts)
    const titlePresent = title.present === true;
    const titlePresentScore = titlePresent ? weights.titleTagPresent : 0;
    factors.push({
      name: 'Title Tag Present',
      status: titlePresent ? 'pass' : 'fail',
      points: titlePresentScore,
      maxPoints: weights.titleTagPresent,
      details: titlePresent ? `"${(title.text || '').substring(0, 60)}${(title.text || '').length > 60 ? '…' : ''}"` : 'No title tag found'
    });
    rawScore += titlePresentScore;

    // Title Length Optimal 50–60 chars (20 pts)
    const titleLen = title.length || 0;
    let titleLenScore = 0;
    let titleLenStatus = 'fail';
    let titleLenDetails = 'No title tag';
    if (titlePresent) {
      if (titleLen >= 50 && titleLen <= 60) {
        titleLenScore = weights.titleLengthOptimal;
        titleLenStatus = 'pass';
        titleLenDetails = `${titleLen} chars (ideal 50–60)`;
      } else if (titleLen >= 40 && titleLen <= 70) {
        titleLenScore = Math.round(weights.titleLengthOptimal * 0.6);
        titleLenStatus = 'warning';
        titleLenDetails = `${titleLen} chars (aim for 50–60)`;
      } else {
        titleLenDetails = `${titleLen} chars (too ${titleLen < 40 ? 'short' : 'long'}, aim for 50–60)`;
      }
    }
    factors.push({
      name: 'Title Length Optimal',
      status: titleLenStatus,
      points: titleLenScore,
      maxPoints: weights.titleLengthOptimal,
      details: titleLenDetails
    });
    rawScore += titleLenScore;

    // Meta Description Present (20 pts)
    const metaDesc = standard.description || standard.metaDescription || '';
    const metaPresent = metaDesc.length > 0;
    const metaPresentScore = metaPresent ? weights.metaDescriptionPresent : 0;
    factors.push({
      name: 'Meta Description Present',
      status: metaPresent ? 'pass' : 'fail',
      points: metaPresentScore,
      maxPoints: weights.metaDescriptionPresent,
      details: metaPresent ? `"${metaDesc.substring(0, 60)}${metaDesc.length > 60 ? '…' : ''}"` : 'No meta description found'
    });
    rawScore += metaPresentScore;

    // Meta Description Length Optimal 140–160 chars (20 pts)
    const descLen = metaDesc.length;
    let descLenScore = 0;
    let descLenStatus = 'fail';
    let descLenDetails = 'No meta description';
    if (metaPresent) {
      if (descLen >= 140 && descLen <= 160) {
        descLenScore = weights.metaDescriptionLength;
        descLenStatus = 'pass';
        descLenDetails = `${descLen} chars (ideal 140–160)`;
      } else if (descLen >= 100 && descLen <= 180) {
        descLenScore = Math.round(weights.metaDescriptionLength * 0.6);
        descLenStatus = 'warning';
        descLenDetails = `${descLen} chars (aim for 140–160)`;
      } else {
        descLenDetails = `${descLen} chars (too ${descLen < 100 ? 'short' : 'long'}, aim for 140–160)`;
      }
    }
    factors.push({
      name: 'Meta Description Length',
      status: descLenStatus,
      points: descLenScore,
      maxPoints: weights.metaDescriptionLength,
      details: descLenDetails
    });
    rawScore += descLenScore;

    // Product Name in Title (20 pts)
    // Compare title text against H1 and product schema name
    const h1Text = extractedData.contentStructure?.headings?.h1?.texts?.[0] || '';
    const productName = extractedData.structuredData?.schemas?.product?.name || '';
    const titleLower = (title.text || '').toLowerCase();
    const h1Lower = h1Text.toLowerCase();
    const productLower = productName.toLowerCase();

    let productInTitle = false;
    let productInTitleDetails = 'No product name reference found in title';
    if (titlePresent) {
      // Full string match or containment
      if (productLower && (titleLower.includes(productLower) || productLower.includes(titleLower.split('|')[0]?.trim()))) {
        productInTitle = true;
        productInTitleDetails = 'Product schema name found in title';
      } else if (productLower) {
        // Brand + model prefix check (first 2 words of schema name, e.g. "Multiquip ST2040T")
        const productPrefix = productLower.split(/\s+/).slice(0, 2).join(' ');
        if (productPrefix.length >= 8 && titleLower.includes(productPrefix)) {
          productInTitle = true;
          productInTitleDetails = 'Product schema name found in title';
        }
      }
      // H1 fallback: use first 2 words (brand + model) — 3 words is too strict when
      // punctuation (em dash, pipe) separates brand/model from the rest of the title
      if (!productInTitle && h1Lower) {
        const h1Prefix = h1Lower.split(' ').slice(0, 2).join(' ');
        if (h1Prefix.length >= 8 && titleLower.includes(h1Prefix)) {
          productInTitle = true;
          productInTitleDetails = 'H1 text found in title';
        }
      }
    }
    const productInTitleScore = productInTitle ? weights.productNameInTitle : 0;
    factors.push({
      name: 'Product Name in Title',
      status: productInTitle ? 'pass' : titlePresent ? 'fail' : 'fail',
      points: productInTitleScore,
      maxPoints: weights.productNameInTitle,
      details: productInTitleDetails
    });
    rawScore += productInTitleScore;

    return {
      score: Math.min(100, rawScore),
      maxScore: 100,
      factors,
      weight: SEO_CATEGORY_WEIGHTS.titleMeta,
      categoryName: 'Title & Meta'
    };
  }

  /**
   * Score Technical Foundations category (25%)
   */
  scoreTechnicalFoundations(extractedData) {
    const factors = [];
    let rawScore = 0;
    const weights = SEO_FACTOR_WEIGHTS.technicalFoundations;
    const robots = extractedData.metaTags?.robots || {};
    const canonical = extractedData.metaTags?.canonical || {};
    const schemas = extractedData.structuredData?.schemas || {};
    const js = extractedData.contentStructure?.jsDependency || {};

    // Page Indexable (25 pts) — checks meta robots noindex only; robots.txt blocking
    // is handled separately in AI Discoverability via service worker fetch.
    const isIndexable = !robots.noindex;
    const indexableScore = isIndexable ? weights.pageIndexable : 0;
    factors.push({
      name: 'Page Indexable',
      status: isIndexable ? 'pass' : 'fail',
      points: indexableScore,
      maxPoints: weights.pageIndexable,
      critical: !isIndexable,
      details: robots.noindex ? 'CRITICAL: noindex directive found' : 'Page is indexable'
    });
    rawScore += indexableScore;

    // Canonical URL Valid (20 pts)
    const canonicalIsValid = canonical.present && (canonical.matchesCurrentUrl || canonical.isProductCanonical);
    let canonicalScore = 0;
    let canonicalStatus = 'fail';
    let canonicalDetails = 'No canonical URL found';
    if (canonical.present) {
      if (canonicalIsValid) {
        canonicalScore = weights.canonicalValid;
        canonicalStatus = 'pass';
        canonicalDetails = 'Canonical URL is valid';
      } else {
        canonicalScore = 0;
        canonicalStatus = 'fail';
        canonicalDetails = 'Canonical URL does not match current page';
      }
    }
    factors.push({
      name: 'Canonical URL Valid',
      status: canonicalStatus,
      points: canonicalScore,
      maxPoints: weights.canonicalValid,
      details: canonicalDetails
    });
    rawScore += canonicalScore;

    // Product Schema Present (20 pts)
    const hasProductSchema = schemas.product !== null && schemas.product !== undefined;
    const productSchemaScore = hasProductSchema ? weights.productSchemaPresent : 0;
    factors.push({
      name: 'Product Schema Present',
      status: hasProductSchema ? 'pass' : 'fail',
      points: productSchemaScore,
      maxPoints: weights.productSchemaPresent,
      details: hasProductSchema ? `Product schema found${schemas.product?.name ? ` (${schemas.product.name})` : ''}` : 'No Product schema found'
    });
    rawScore += productSchemaScore;

    // Breadcrumb Schema Present (15 pts)
    const hasBreadcrumbSchema = schemas.breadcrumb !== null && schemas.breadcrumb !== undefined;
    const breadcrumbSchemaScore = hasBreadcrumbSchema ? weights.breadcrumbSchemaPresent : 0;
    const breadcrumbCount = schemas.breadcrumb?.itemCount || 0;
    factors.push({
      name: 'Breadcrumb Schema Present',
      status: hasBreadcrumbSchema ? 'pass' : 'fail',
      points: breadcrumbSchemaScore,
      maxPoints: weights.breadcrumbSchemaPresent,
      details: hasBreadcrumbSchema ? `${breadcrumbCount} level${breadcrumbCount !== 1 ? 's' : ''} found` : 'No breadcrumb schema found'
    });
    rawScore += breadcrumbSchemaScore;

    // Low JS Dependency (20 pts)
    const jsLevel = js.dependencyLevel || 'low';
    let jsScore = 0;
    let jsStatus = 'fail';
    if (jsLevel === 'low') {
      jsScore = weights.lowJsDependency;
      jsStatus = 'pass';
    } else if (jsLevel === 'medium') {
      jsScore = Math.round(weights.lowJsDependency * 0.5);
      jsStatus = 'warning';
    }
    factors.push({
      name: 'Low JS Dependency',
      status: jsStatus,
      points: jsScore,
      maxPoints: weights.lowJsDependency,
      details: `${jsLevel.charAt(0).toUpperCase() + jsLevel.slice(1)} JS dependency${js.frameworkDetected ? ` (${js.frameworkDetected})` : ''}`
    });
    rawScore += jsScore;

    return {
      score: Math.min(100, rawScore),
      maxScore: 100,
      factors,
      weight: SEO_CATEGORY_WEIGHTS.technicalFoundations,
      categoryName: 'Technical Foundations'
    };
  }

  /**
   * Score Content Signals category (25%)
   */
  scoreContentSignals(extractedData) {
    const factors = [];
    let rawScore = 0;
    const weights = SEO_FACTOR_WEIGHTS.contentSignals;
    const desc = extractedData.contentQuality?.description || {};
    const textMetrics = extractedData.contentQuality?.textMetrics || {};
    const headings = extractedData.contentStructure?.headings || {};
    const images = extractedData.contentStructure?.images || {};
    const seo = extractedData.seoSignals || {};
    const url = seo.urlStructure || {};

    // Sufficient Content Length (25 pts) — use description word count or text length
    const wordCount = desc.wordCount || textMetrics.wordCount || 0;
    let contentLenScore = 0;
    let contentLenStatus = 'fail';
    let contentLenDetails = 'No product description found';
    if (wordCount >= 300) {
      contentLenScore = weights.sufficientContentLength;
      contentLenStatus = 'pass';
      contentLenDetails = `${wordCount} words`;
    } else if (wordCount >= 150) {
      contentLenScore = Math.round(weights.sufficientContentLength * 0.6);
      contentLenStatus = 'warning';
      contentLenDetails = `${wordCount} words (aim for 300+)`;
    } else if (wordCount > 0) {
      contentLenDetails = `${wordCount} words (too short, aim for 300+)`;
    }
    factors.push({
      name: 'Sufficient Content Length',
      status: contentLenStatus,
      points: contentLenScore,
      maxPoints: weights.sufficientContentLength,
      details: contentLenDetails
    });
    rawScore += contentLenScore;

    // Heading Structure (20 pts) — H1 present + valid hierarchy
    const h1Present = (headings.h1?.count || 0) === 1;
    const hierarchyValid = headings.hierarchyValid !== false;
    let headingScore = 0;
    let headingStatus = 'fail';
    let headingDetails = 'No H1 heading found';
    if (h1Present && hierarchyValid) {
      headingScore = weights.headingStructure;
      headingStatus = 'pass';
      headingDetails = 'H1 present with valid hierarchy';
    } else if (h1Present) {
      headingScore = Math.round(weights.headingStructure * 0.6);
      headingStatus = 'warning';
      headingDetails = 'H1 present but heading hierarchy has issues';
    } else if (headings.h1?.count > 1) {
      headingScore = Math.round(weights.headingStructure * 0.4);
      headingStatus = 'warning';
      headingDetails = `${headings.h1.count} H1 tags found (should be 1)`;
    }
    factors.push({
      name: 'Heading Structure',
      status: headingStatus,
      points: headingScore,
      maxPoints: weights.headingStructure,
      details: headingDetails
    });
    rawScore += headingScore;

    // Image Alt Coverage (20 pts)
    const altCoverage = images.altCoverage || 0;
    const altScore = Math.round(altCoverage * weights.imageAltCoverage);
    factors.push({
      name: 'Image Alt Coverage',
      status: altCoverage >= 0.9 ? 'pass' : altCoverage >= 0.5 ? 'warning' : 'fail',
      points: altScore,
      maxPoints: weights.imageAltCoverage,
      details: `${Math.round(altCoverage * 100)}% of images have alt text`
    });
    rawScore += altScore;

    // Content Readability (20 pts)
    const readabilityRaw = textMetrics.readabilityScore ?? null;
    let readabilityScore = 0;
    let readabilityStatus = 'fail';
    let readabilityDetails = 'Unable to assess readability';
    if (readabilityRaw !== null) {
      readabilityScore = Math.round((readabilityRaw / 100) * weights.contentReadability);
      readabilityStatus = readabilityRaw >= 60 ? 'pass' : readabilityRaw >= 40 ? 'warning' : 'fail';
      readabilityDetails = `Readability score: ${readabilityRaw}/100`;
    }
    factors.push({
      name: 'Content Readability',
      status: readabilityStatus,
      points: readabilityScore,
      maxPoints: weights.contentReadability,
      details: readabilityDetails
    });
    rawScore += readabilityScore;

    // URL Slug Quality (15 pts)
    const isClean = url.isClean !== false;
    const hasKeywords = url.hasKeywords !== false;
    let urlScore = 0;
    let urlStatus = 'fail';
    let urlDetails = 'URL quality unknown';
    if (isClean && hasKeywords) {
      urlScore = weights.urlSlugQuality;
      urlStatus = 'pass';
      urlDetails = `Clean URL with keywords: ${url.path || ''}`;
    } else if (isClean || hasKeywords) {
      urlScore = Math.round(weights.urlSlugQuality * 0.6);
      urlStatus = 'warning';
      urlDetails = isClean ? 'Clean URL but no keyword in slug' : 'Has keywords but URL contains query strings or numeric IDs';
    } else {
      urlDetails = 'URL has query strings or lacks keyword-rich slug';
    }
    factors.push({
      name: 'URL Slug Quality',
      status: urlStatus,
      points: urlScore,
      maxPoints: weights.urlSlugQuality,
      details: urlDetails
    });
    rawScore += urlScore;

    return {
      score: Math.min(100, rawScore),
      maxScore: 100,
      factors,
      weight: SEO_CATEGORY_WEIGHTS.contentSignals,
      categoryName: 'Content Signals'
    };
  }

  /**
   * Score Navigation & Discovery category (25%)
   */
  scoreNavigationDiscovery(extractedData) {
    const factors = [];
    let rawScore = 0;
    const weights = SEO_FACTOR_WEIGHTS.navigationDiscovery;
    const structure = extractedData.contentStructure || {};
    const schemas = extractedData.structuredData?.schemas || {};
    const headings = structure.headings || {};
    const meta = extractedData.metaTags || {};
    const seo = extractedData.seoSignals || {};

    // Breadcrumb Navigation (30 pts) — DOM breadcrumbs OR breadcrumb schema
    const hasDomBreadcrumbs = seo.domBreadcrumbs?.present === true;
    const hasBreadcrumbSchema = schemas.breadcrumb !== null && schemas.breadcrumb !== undefined;
    const hasBreadcrumbs = hasDomBreadcrumbs || hasBreadcrumbSchema;
    const breadcrumbNavScore = hasBreadcrumbs ? weights.breadcrumbNavigation : 0;
    const breadcrumbNavDetails = hasBreadcrumbs
      ? (hasBreadcrumbSchema ? 'Breadcrumb schema present' : 'DOM breadcrumb navigation found')
      : 'No breadcrumb navigation found';
    factors.push({
      name: 'Breadcrumb Navigation',
      status: hasBreadcrumbs ? 'pass' : 'fail',
      points: breadcrumbNavScore,
      maxPoints: weights.breadcrumbNavigation,
      details: breadcrumbNavDetails
    });
    rawScore += breadcrumbNavScore;

    // H1–Product Name Alignment (25 pts)
    const h1Texts = headings.h1?.texts || [];
    const h1Text = h1Texts.find(t => t.trim().length > 0) || '';
    const productName = schemas.product?.name || '';
    const ogTitle = meta.openGraph?.title || '';
    const titleText = seo.titleTag?.text || '';

    let h1Aligned = false;
    let h1AlignedDetails = 'H1 not found or not aligned';
    if (h1Text) {
      const h1Lower = h1Text.toLowerCase();
      const productLower = productName.toLowerCase();
      const ogLower = ogTitle.toLowerCase();
      const titleLower = titleText.toLowerCase();
      if (productLower && (h1Lower.includes(productLower) || productLower.includes(h1Lower))) {
        h1Aligned = true;
        h1AlignedDetails = 'H1 aligned with Product schema name';
      } else if (ogLower && (h1Lower.includes(ogLower) || ogLower.includes(h1Lower))) {
        h1Aligned = true;
        h1AlignedDetails = 'H1 aligned with og:title';
      } else if (titleLower && (titleLower.includes(h1Lower) || h1Lower.includes(titleLower.split('|')[0]?.trim()))) {
        h1Aligned = true;
        h1AlignedDetails = 'H1 aligned with page title';
      } else {
        h1AlignedDetails = 'H1 does not match product name, og:title, or page title';
      }
    }
    const h1AlignedScore = h1Aligned ? weights.h1ProductNameAlignment : 0;
    factors.push({
      name: 'H1–Product Name Alignment',
      status: h1Aligned ? 'pass' : h1Text ? 'fail' : 'fail',
      points: h1AlignedScore,
      maxPoints: weights.h1ProductNameAlignment,
      details: h1AlignedDetails
    });
    rawScore += h1AlignedScore;

    // Internal Link Presence (25 pts)
    const internalCount = seo.internalLinks?.count || 0;
    let internalScore = 0;
    let internalStatus = 'fail';
    let internalDetails = 'No internal links found';
    if (internalCount >= 10) {
      internalScore = weights.internalLinkPresence;
      internalStatus = 'pass';
      internalDetails = `${internalCount} internal links found`;
    } else if (internalCount >= 3) {
      internalScore = Math.round(weights.internalLinkPresence * 0.5);
      internalStatus = 'warning';
      internalDetails = `${internalCount} internal links (aim for 10+)`;
    } else if (internalCount > 0) {
      internalDetails = `${internalCount} internal link${internalCount !== 1 ? 's' : ''} (too few)`;
    }
    factors.push({
      name: 'Internal Link Presence',
      status: internalStatus,
      points: internalScore,
      maxPoints: weights.internalLinkPresence,
      details: internalDetails
    });
    rawScore += internalScore;

    // Hreflang Configuration (20 pts) — informational for bilingual sites
    // Monolingual sites score full points with N/A status so they can achieve a perfect score.
    const hreflang = meta.hreflang || {};
    const hasHreflang = hreflang.present === true && (hreflang.count || 0) > 0;
    const hreflangScore = weights.hreflangConfiguration; // same points either way — monolingual is not penalized
    const hreflangStatus = hasHreflang ? 'pass' : 'na';
    const hreflangDetails = hasHreflang
      ? `${hreflang.count} hreflang tag${hreflang.count !== 1 ? 's' : ''} (${(hreflang.languages || []).map(l => l.lang).join(', ')})`
      : 'Not applicable — monolingual site (no hreflang needed)';
    factors.push({
      name: 'Hreflang Configuration',
      status: hreflangStatus,
      points: hreflangScore,
      maxPoints: weights.hreflangConfiguration,
      details: hreflangDetails
    });
    rawScore += hreflangScore;

    return {
      score: Math.min(100, rawScore),
      maxScore: 100,
      factors,
      weight: SEO_CATEGORY_WEIGHTS.navigationDiscovery,
      categoryName: 'Navigation & Discovery'
    };
  }
}
