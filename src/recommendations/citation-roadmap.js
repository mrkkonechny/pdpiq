/**
 * Content-to-Citation Roadmap Engine
 * Maps content gaps to specific LLM citation opportunities.
 * Answers: "if I add this specific content, which queries does it unlock?"
 *
 * AI Visibility tab + report only.
 *
 * v1 — 5 content blocks across 3 tiers:
 *   Tier 1 (Quick Wins): Description, Styling
 *   Tier 2 (Medium Priority): FAQ, Fabric & Care
 *   Tier 3 (Content Investment): Inline Review Content
 */

import { extractProductIntelligence } from './citation-opportunities.js';
import { ScoringEngine } from '../scoring/scoring-engine.js';

const DEBUG = false;

const TIER_CONFIG = {
  'tier-1': { label: 'Quick Wins', timeframe: '1–2 weeks' },
  'tier-2': { label: 'Medium Priority', timeframe: '2–4 weeks' },
  'tier-3': { label: 'Content Investment', timeframe: '4–8 weeks' }
};

export class CitationRoadmapEngine {
  constructor(scoreResult, extractedData) {
    this.scoreResult = scoreResult;
    this.extractedData = extractedData;
    try {
      this.ctx = extractProductIntelligence(extractedData);
    } catch (e) {
      console.warn('pdpIQ: CitationRoadmapEngine context extraction failed', e);
      this.ctx = {
        productType: null, style: null, audience: null,
        cleanName: 'this product', shortName: 'this product',
        isCollection: false, brand: 'the brand', category: 'products'
      };
    }
    this.isApparel = ScoringEngine.isLikelyApparel(extractedData);
  }

  generateRoadmap() {
    const desc = this._evalDescription();
    const faq = this._evalFaq();
    const fabricCare = this._evalFabricCare();
    const styling = this._evalStyling();
    const reviews = this._evalInlineReviews();

    // Tier assignments: null = guard-failed, 'present' = already done
    const tier1Blocks = [desc, styling].filter(b => b !== null && b.status !== 'present');
    const tier2Blocks = [faq, fabricCare].filter(b => b !== null && b.status !== 'present');
    const tier3Blocks = [reviews].filter(b => b !== null && b.status !== 'present');

    const tiers = [];
    if (tier1Blocks.length > 0) tiers.push({ id: 'tier-1', ...TIER_CONFIG['tier-1'], blocks: tier1Blocks });
    if (tier2Blocks.length > 0) tiers.push({ id: 'tier-2', ...TIER_CONFIG['tier-2'], blocks: tier2Blocks });
    if (tier3Blocks.length > 0) tiers.push({ id: 'tier-3', ...TIER_CONFIG['tier-3'], blocks: tier3Blocks });

    const allBlocks = [desc, faq, fabricCare, styling, reviews].filter(b => b !== null);
    const totalMissing = allBlocks.filter(b => b.status === 'missing').length;
    const totalPartial = allBlocks.filter(b => b.status === 'partial').length;
    const totalPresent = allBlocks.filter(b => b.status === 'present').length;

    return {
      productIntelligence: this.ctx,
      tiers,
      summary: { totalMissing, totalPartial, totalPresent }
    };
  }

  _evalDescription() {
    const wordCount = this.extractedData?.contentQuality?.description?.wordCount || 0;
    let status;
    if (wordCount < 50) status = 'missing';
    else if (wordCount < 150) status = 'partial';
    else status = 'present';

    const { shortName, productType, style, brand, audience } = this.ctx;
    const pt = productType ? productType.plural : 'products';
    const ptSingular = productType ? productType.singular : 'product';
    const stylePrefix = style ? `${style} ` : '';
    const audienceSuffix = audience ? ` for ${audience}` : '';

    const queryExamples = [
      `${stylePrefix}${pt}${audienceSuffix}`,
      `breathable ${ptSingular} for summer`,
      `${brand} ${ptSingular} fit and sizing`,
      `what makes ${brand}'s ${pt} special`
    ].slice(0, 4);

    return {
      id: 'description',
      title: 'Expand Product Description',
      status,
      effort: 'low',
      citationImpact: '40–60% more query surface',
      queryExamples,
      platformNotes: [
        { platform: 'ChatGPT', note: 'Uses description for product Q&A responses' },
        { platform: 'Perplexity', note: 'Description text feeds product comparison cards' },
        { platform: 'Google AIO', note: 'AI Overview pulls from rich description content' }
      ],
      guidance: wordCount < 50
        ? 'Write a 150+ word description covering key benefits, materials, use cases, and audience.'
        : `At ${wordCount} words, you're partway there. Expand to 150+ words with specifics on fit, materials, and occasions.`
    };
  }

  _evalFaq() {
    const faq = this.extractedData?.contentQuality?.faq;
    const faqSchemas = this.extractedData?.structuredData?.schemas?.faq;
    const faqFound = faq?.found || false;
    const faqCount = faq?.count || 0;
    const hasFaqSchema = Array.isArray(faqSchemas) && faqSchemas.length > 0;

    let status;
    if (!faqFound && !hasFaqSchema) status = 'missing';
    else if ((faqFound && !hasFaqSchema) || (hasFaqSchema && faqCount < 3)) status = 'partial';
    else status = 'present';

    const { shortName, productType } = this.ctx;

    return {
      id: 'faq',
      title: 'Add FAQ Content + FAQPage Schema',
      status,
      effort: 'medium',
      citationImpact: 'Direct citation in ChatGPT pre-purchase answers',
      queryExamples: [
        `Is ${shortName} true to size?`,
        `How do I care for ${shortName}?`,
        `When is ${shortName} appropriate to wear?`,
        `What is the return policy for ${shortName}?`
      ],
      platformNotes: [
        { platform: 'ChatGPT', note: 'FAQ structured data feeds direct answer responses' },
        { platform: 'Google AIO', note: 'FAQPage schema enables rich result expansion in search' }
      ],
      guidance: !hasFaqSchema
        ? 'Add FAQPage schema markup alongside 3+ visible Q&A items targeting pre-purchase objections.'
        : `You have FAQPage schema but only ${faqCount} visible Q&A item${faqCount === 1 ? '' : 's'}. Add at least 3 visible FAQ entries.`
    };
  }

  _evalFabricCare() {
    if (!this.isApparel) return null;

    const hasMaterials = !!(this.extractedData?.contentQuality?.productDetails?.hasMaterials);
    const careKeywords = ['machine wash', 'dry clean', 'hand wash', 'spot clean', 'tumble dry',
      'care instructions', 'do not bleach', 'lay flat'];
    const hasCare = this._scanFeatureText(careKeywords) > 0;

    let status;
    if (!hasMaterials && !hasCare) status = 'missing';
    else if (hasMaterials && hasCare) status = 'present';
    else status = 'partial';

    const { shortName, productType } = this.ctx;
    const ptSingular = productType ? productType.singular : 'garment';

    return {
      id: 'fabric-care',
      title: 'Add Fabric & Care Details',
      status,
      effort: 'medium',
      citationImpact: 'Unlocks material-specific filter queries on Perplexity',
      queryExamples: [
        `What material is ${shortName} made of?`,
        `Is ${shortName} machine washable?`,
        `${ptSingular} care instructions`,
        `best fabric type for this style`
      ],
      platformNotes: [
        { platform: 'Perplexity', note: 'Material and care details surface in fabric-filter product queries' }
      ],
      guidance: !hasMaterials
        ? 'Add fabric composition (e.g. "100% organic cotton") and care instructions (e.g. "Machine wash cold").'
        : 'Add explicit care instructions alongside your existing fabric details.'
    };
  }

  _evalStyling() {
    if (!this.isApparel) return null;

    const stylingPhrases = ['pair with', 'style with', 'wear with', 'goes with', 'looks great with',
      'outfit', 'layer with', 'match with', 'combine with'];
    const matchCount = this._scanFeatureText(stylingPhrases);

    let status;
    if (matchCount === 0) status = 'missing';
    else if (matchCount === 1) status = 'partial';
    else status = 'present';

    const { shortName, productType, style, audience } = this.ctx;
    const ptSingular = productType ? productType.singular : 'piece';
    const occasionHint = style ? `${style} look` : 'casual look';
    const audienceContext = audience ? ` for ${audience}` : '';

    return {
      id: 'styling',
      title: 'Add Styling Suggestions',
      status,
      effort: 'low',
      citationImpact: 'Unlocks outfit and occasion queries on ChatGPT and Google AIO',
      queryExamples: [
        `How to style ${shortName}`,
        `What to wear with ${shortName}`,
        `${ptSingular} outfit ideas${audienceContext}`,
        `${occasionHint} with ${shortName}`
      ],
      platformNotes: [
        { platform: 'ChatGPT', note: 'Outfit and occasion queries pull from styling copy' },
        { platform: 'Google AIO', note: 'Style suggestions appear in fashion how-to answers' }
      ],
      guidance: matchCount === 0
        ? 'Add 2+ styling suggestions mentioning specific pairings (e.g. "Pair with high-waisted jeans for a casual look").'
        : 'Expand with a second distinct styling context — e.g., dressy vs. casual, or weekend vs. workwear.'
    };
  }

  _evalInlineReviews() {
    const reviewCount = this.extractedData?.trustSignals?.reviews?.count || 0;
    if (reviewCount === 0) return null;

    const jsDep = this.extractedData?.contentStructure?.jsDependency?.dependencyLevel || 'low';
    const isHighJs = jsDep === 'high';

    let status;
    if (isHighJs) status = 'missing';
    else if (reviewCount < 25) status = 'partial';
    else status = 'present';

    const { shortName } = this.ctx;

    return {
      id: 'inline-reviews',
      title: 'Make Review Content Crawlable',
      status,
      effort: 'high',
      citationImpact: 'Enables Perplexity and ChatGPT to cite real customer sentiment',
      queryExamples: [
        `What do customers say about ${shortName}?`,
        `Is ${shortName} worth buying?`,
        `${shortName} honest review`,
        `common complaints about ${shortName}`
      ],
      platformNotes: [
        { platform: 'Perplexity', note: 'Skips JS-heavy review sections — reviews must be in initial HTML' },
        { platform: 'ChatGPT', note: 'Uses crawled review text for "customers say" summaries' }
      ],
      guidance: isHighJs
        ? 'Reviews are JS-rendered and invisible to crawlers. Add server-side rendered review snippets or use Review structured data.'
        : `You have ${reviewCount} review${reviewCount === 1 ? '' : 's'} — aim for 25+ to unlock meaningful sentiment summaries.`
    };
  }

  _scanFeatureText(keywords) {
    const text = (this.extractedData?.contentQuality?.features?.items || [])
      .map(i => i.text || '').join(' ').toLowerCase();
    return keywords.filter(kw => text.includes(kw)).length;
  }
}
