/**
 * Citation Opportunity Map Engine
 * Maps failing AI Readiness factors to specific conversational query patterns
 * that the page cannot currently answer.
 *
 * AI Visibility tab + report only. Does NOT apply to PDP Quality or SEO Quality.
 *
 * Rule-based, no LLM required — template-based with string interpolation.
 * DEC-0026, ROAD-0035
 */

const DEBUG = false;

/**
 * Query templates mapped from AI Readiness factor names.
 * Each template has:
 *   - factorName: matches the factor name in scoreResult.categoryScores.*.factors[].name
 *   - queries: array of query pattern strings with {product}, {brand}, {category} placeholders
 *   - category: which AI Readiness category this belongs to
 */
const CITATION_QUERY_TEMPLATES = [
  // --- Structured Data ---
  {
    factorName: 'Product Schema',
    queries: [
      'What is {product}?',
      'Tell me about the {product} by {brand}',
      '{product} specifications'
    ],
    category: 'Structured Data'
  },
  {
    factorName: 'Offer Schema',
    queries: [
      'How much does {product} cost?',
      'Where can I buy {product}?',
      'Is {product} in stock?'
    ],
    category: 'Structured Data'
  },
  {
    factorName: 'FAQ Schema',
    queries: [
      'Common questions about {product}',
      '{product} FAQ',
      'What should I know before buying {product}?'
    ],
    category: 'Structured Data'
  },
  {
    factorName: 'Breadcrumb Schema',
    queries: [
      'What category is {product} in?',
      '{brand} {category} products'
    ],
    category: 'Structured Data'
  },

  // --- Protocol & Meta ---
  {
    factorName: 'og:image Format',
    queries: [
      'Show me the {product}',
      'What does {product} look like?'
    ],
    category: 'Protocol & Meta'
  },
  {
    factorName: 'Meta Description',
    queries: [
      'What is {product} used for?',
      'Describe {product} by {brand}'
    ],
    category: 'Protocol & Meta'
  },

  // --- Content Quality ---
  {
    factorName: 'Description Length',
    queries: [
      'Give me a detailed overview of {product}',
      'What are the main features of {product}?'
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'Description Quality',
    queries: [
      'What are the benefits of {product}?',
      'Why should I choose {product}?'
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'Features List',
    queries: [
      'What features does {product} have?',
      'List the key features of {product}'
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'FAQ Content',
    queries: [
      'How do I use {product}?',
      'What questions do people have about {product}?',
      'Is {product} right for me?'
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'Specification Detail',
    queries: [
      'What are the specs for {product}?',
      '{product} dimensions and weight',
      '{product} technical specifications'
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'Comparison Content',
    queries: [
      'Is {product} better than [competitor]?',
      '{product} vs [alternative] - which should I buy?',
      'What are the alternatives to {product}?'
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'Warranty Information',
    queries: [
      'Does {product} come with a warranty?',
      'What is the warranty on {product}?'
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'Certification/Compliance',
    queries: [
      'Is {product} certified?',
      'What safety certifications does {product} have?'
    ],
    category: 'Content Quality'
  },

  // --- Content Structure ---
  {
    factorName: 'H1 Heading',
    queries: [
      '{product} by {brand}',
      '{brand} {product} review'
    ],
    category: 'Content Structure'
  },
  {
    factorName: 'Primary Image Alt Text',
    queries: [
      'What does {product} look like?',
      'Show me pictures of {product}'
    ],
    category: 'Content Structure'
  },

  // --- Authority & Trust ---
  {
    factorName: 'Review Presence',
    queries: [
      'Is {product} worth buying?',
      'What do customers say about {product}?',
      '{product} reviews'
    ],
    category: 'Authority & Trust'
  },
  {
    factorName: 'Rating Presence',
    queries: [
      'How is {product} rated?',
      '{product} rating',
      'What rating does {product} have?'
    ],
    category: 'Authority & Trust'
  },
  {
    factorName: 'Brand Presence',
    queries: [
      'Who makes {product}?',
      'Is {brand} a good brand for {category}?'
    ],
    category: 'Authority & Trust'
  },

  // --- AI Discoverability ---
  {
    factorName: 'AI Crawler Access',
    queries: [
      'Recommend a {category} product',
      'Best {category} from {brand}',
      'What {category} should I buy?'
    ],
    category: 'AI Discoverability'
  },
  {
    factorName: 'Entity Consistency',
    queries: [
      '{product} by {brand}',
      'Tell me about {brand}\'s {product}'
    ],
    category: 'AI Discoverability'
  },
  {
    factorName: 'Answer-Format Content',
    queries: [
      'Best {category} for [use case]',
      'What is {product} best for?',
      'When should I use {product}?'
    ],
    category: 'AI Discoverability'
  },
  {
    factorName: 'Product Identifiers',
    queries: [
      'Where can I find {product} UPC',
      '{product} model number'
    ],
    category: 'AI Discoverability'
  },
  {
    factorName: 'llms.txt Presence',
    queries: [
      'What does {brand} sell?',
      '{brand} product catalog'
    ],
    category: 'AI Discoverability'
  }
];

/**
 * Citation Opportunity Engine
 * Generates citation opportunities from AI Readiness scoring results.
 */
export class CitationOpportunityEngine {
  /**
   * @param {Object} scoreResult - AI Readiness score result from ScoringEngine.calculateScore()
   * @param {Object} extractedData - Full extracted data from content script
   */
  constructor(scoreResult, extractedData) {
    this.scoreResult = scoreResult;
    this.extractedData = extractedData;
  }

  /**
   * Generate citation opportunities grouped by status.
   * @returns {{ missing: Array, partial: Array, covered: Array }}
   */
  generateOpportunities() {
    const product = this._getProductName();
    const brand = this._getBrandName();
    const category = this._getCategoryName();

    // Build a map of factor name -> status from all AI Readiness categories
    const factorStatusMap = {};
    const categoryScores = this.scoreResult?.categoryScores || {};
    for (const catKey of Object.keys(categoryScores)) {
      const factors = categoryScores[catKey]?.factors || [];
      for (const factor of factors) {
        factorStatusMap[factor.name] = factor.status;
      }
    }

    const missing = [];
    const partial = [];
    const covered = [];

    for (const template of CITATION_QUERY_TEMPLATES) {
      const status = factorStatusMap[template.factorName];
      if (status === undefined) continue; // Factor not found in results

      const queries = template.queries.map(q =>
        q.replace(/\{product\}/g, product)
         .replace(/\{brand\}/g, brand)
         .replace(/\{category\}/g, category)
      );

      const entry = {
        factorName: template.factorName,
        category: template.category,
        queries,
        status
      };

      if (status === 'fail') {
        missing.push(entry);
      } else if (status === 'warning') {
        partial.push(entry);
      } else {
        covered.push(entry);
      }
    }

    return { missing, partial, covered };
  }

  /**
   * Extract product name from structured data or page title.
   * @returns {string}
   */
  _getProductName() {
    const schemas = this.extractedData?.structuredData?.schemas;
    if (schemas?.product?.name) return schemas.product.name;

    // Fallback to page title, cleaned up
    const title = this.extractedData?.pageInfo?.title || '';
    // Remove common suffixes like "| Brand" or "- Store Name"
    return title.split(/\s*[|\-–—]\s*/)[0].trim() || 'this product';
  }

  /**
   * Extract brand name from structured data.
   * @returns {string}
   */
  _getBrandName() {
    const schemas = this.extractedData?.structuredData?.schemas;
    if (schemas?.product?.brand) return schemas.product.brand;
    if (schemas?.brand?.name) return schemas.brand.name;
    if (schemas?.organization?.name) return schemas.organization.name;

    // Fallback to domain
    const domain = this.extractedData?.pageInfo?.domain || '';
    return domain.replace(/^www\./, '').split('.')[0] || 'the brand';
  }

  /**
   * Extract category name from breadcrumbs or URL.
   * @returns {string}
   */
  _getCategoryName() {
    const breadcrumb = this.extractedData?.structuredData?.schemas?.breadcrumb;
    if (breadcrumb?.items?.length > 1) {
      // Use the second-to-last breadcrumb as category (last is usually the product)
      const catItem = breadcrumb.items[breadcrumb.items.length - 2];
      if (catItem?.name) return catItem.name.toLowerCase();
    }

    const product = this.extractedData?.structuredData?.schemas?.product;
    if (product?.category) return product.category.toLowerCase();

    return 'products in this category';
  }
}
