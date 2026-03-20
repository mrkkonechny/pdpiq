/**
 * Citation Opportunity Map Engine
 * Maps failing AI Readiness factors to specific conversational query patterns
 * that the page cannot currently answer.
 *
 * AI Visibility tab + report only. Does NOT apply to PDP Quality or SEO Quality.
 *
 * v2 — Product Intelligence Layer:
 *   - Parses page title, URL, breadcrumbs to extract product type, style, audience
 *   - PDP vs PLP-aware query templates (shopping queries for collections, product queries for PDPs)
 *   - Natural language variation with multiple phrasings per factor
 *   - Strips marketing fluff ("Shop", "Buy", "Free Shipping") from product names
 *
 * DEC-0026, ROAD-0035
 */

const DEBUG = false;

// ==========================================
// PRODUCT INTELLIGENCE — title/URL parsing
// ==========================================

/**
 * Words to strip from page titles — marketing/navigation fluff
 * that no consumer would use in a conversational query.
 */
const TITLE_STRIP_WORDS = [
  'shop', 'buy', 'browse', 'explore', 'discover', 'view', 'see', 'find',
  'our', 'the', 'all', 'new', 'best', 'top', 'great', 'amazing',
  'free shipping', 'sale', 'on sale', 'clearance', 'limited edition',
  'collection', 'collections', 'products', 'items'
];
// Pre-compiled strip regexes: whole-word for single words, plain match for phrases
const TITLE_STRIP_REGEXES = TITLE_STRIP_WORDS.map(w =>
  w.includes(' ')
    ? new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    : new RegExp(`\\b${w}\\b`, 'gi')
);

/**
 * Common product type keywords and their natural-language forms.
 * Maps extracted tokens → { singular, plural, descriptive }
 */
const PRODUCT_TYPE_MAP = {
  // Apparel
  'tee': { singular: 't-shirt', plural: 't-shirts', descriptive: 'tee' },
  'tees': { singular: 't-shirt', plural: 't-shirts', descriptive: 'tees' },
  't-shirt': { singular: 't-shirt', plural: 't-shirts', descriptive: 't-shirt' },
  't-shirts': { singular: 't-shirt', plural: 't-shirts', descriptive: 't-shirts' },
  'tank': { singular: 'tank top', plural: 'tank tops', descriptive: 'tank' },
  'tanks': { singular: 'tank top', plural: 'tank tops', descriptive: 'tanks' },
  'dress': { singular: 'dress', plural: 'dresses', descriptive: 'dress' },
  'dresses': { singular: 'dress', plural: 'dresses', descriptive: 'dresses' },
  'hoodie': { singular: 'hoodie', plural: 'hoodies', descriptive: 'hoodie' },
  'hoodies': { singular: 'hoodie', plural: 'hoodies', descriptive: 'hoodies' },
  'jacket': { singular: 'jacket', plural: 'jackets', descriptive: 'jacket' },
  'jackets': { singular: 'jacket', plural: 'jackets', descriptive: 'jackets' },
  'jeans': { singular: 'jeans', plural: 'jeans', descriptive: 'jeans' },
  'pants': { singular: 'pants', plural: 'pants', descriptive: 'pants' },
  'shorts': { singular: 'shorts', plural: 'shorts', descriptive: 'shorts' },
  'skirt': { singular: 'skirt', plural: 'skirts', descriptive: 'skirt' },
  'skirts': { singular: 'skirt', plural: 'skirts', descriptive: 'skirts' },
  'sweater': { singular: 'sweater', plural: 'sweaters', descriptive: 'sweater' },
  'sweaters': { singular: 'sweater', plural: 'sweaters', descriptive: 'sweaters' },
  'blouse': { singular: 'blouse', plural: 'blouses', descriptive: 'blouse' },
  'blouses': { singular: 'blouse', plural: 'blouses', descriptive: 'blouses' },
  'leggings': { singular: 'leggings', plural: 'leggings', descriptive: 'leggings' },
  'joggers': { singular: 'joggers', plural: 'joggers', descriptive: 'joggers' },
  'romper': { singular: 'romper', plural: 'rompers', descriptive: 'romper' },
  'rompers': { singular: 'romper', plural: 'rompers', descriptive: 'rompers' },
  'jumpsuit': { singular: 'jumpsuit', plural: 'jumpsuits', descriptive: 'jumpsuit' },
  'jumpsuits': { singular: 'jumpsuit', plural: 'jumpsuits', descriptive: 'jumpsuits' },
  'cardigan': { singular: 'cardigan', plural: 'cardigans', descriptive: 'cardigan' },
  'cardigans': { singular: 'cardigan', plural: 'cardigans', descriptive: 'cardigans' },

  // Footwear
  'shoe': { singular: 'shoe', plural: 'shoes', descriptive: 'shoe' },
  'shoes': { singular: 'shoe', plural: 'shoes', descriptive: 'shoes' },
  'boot': { singular: 'boot', plural: 'boots', descriptive: 'boot' },
  'boots': { singular: 'boot', plural: 'boots', descriptive: 'boots' },
  'sandal': { singular: 'sandal', plural: 'sandals', descriptive: 'sandal' },
  'sandals': { singular: 'sandal', plural: 'sandals', descriptive: 'sandals' },
  'sneaker': { singular: 'sneaker', plural: 'sneakers', descriptive: 'sneaker' },
  'sneakers': { singular: 'sneaker', plural: 'sneakers', descriptive: 'sneakers' },

  // Accessories
  'bag': { singular: 'bag', plural: 'bags', descriptive: 'bag' },
  'bags': { singular: 'bag', plural: 'bags', descriptive: 'bags' },
  'purse': { singular: 'purse', plural: 'purses', descriptive: 'purse' },
  'purses': { singular: 'purse', plural: 'purses', descriptive: 'purses' },
  'hat': { singular: 'hat', plural: 'hats', descriptive: 'hat' },
  'hats': { singular: 'hat', plural: 'hats', descriptive: 'hats' },
  'scarf': { singular: 'scarf', plural: 'scarves', descriptive: 'scarf' },
  'scarves': { singular: 'scarf', plural: 'scarves', descriptive: 'scarves' },
  'jewelry': { singular: 'jewelry', plural: 'jewelry', descriptive: 'jewelry' },
  'necklace': { singular: 'necklace', plural: 'necklaces', descriptive: 'necklace' },
  'necklaces': { singular: 'necklace', plural: 'necklaces', descriptive: 'necklaces' },
  'bracelet': { singular: 'bracelet', plural: 'bracelets', descriptive: 'bracelet' },
  'bracelets': { singular: 'bracelet', plural: 'bracelets', descriptive: 'bracelets' },
  'earring': { singular: 'earring', plural: 'earrings', descriptive: 'earring' },
  'earrings': { singular: 'earring', plural: 'earrings', descriptive: 'earrings' },
  'wallet': { singular: 'wallet', plural: 'wallets', descriptive: 'wallet' },
  'wallets': { singular: 'wallet', plural: 'wallets', descriptive: 'wallets' },
  'sunglasses': { singular: 'sunglasses', plural: 'sunglasses', descriptive: 'sunglasses' },

  // Home & Living
  'candle': { singular: 'candle', plural: 'candles', descriptive: 'candle' },
  'candles': { singular: 'candle', plural: 'candles', descriptive: 'candles' },
  'mug': { singular: 'mug', plural: 'mugs', descriptive: 'mug' },
  'mugs': { singular: 'mug', plural: 'mugs', descriptive: 'mugs' },
  'pillow': { singular: 'pillow', plural: 'pillows', descriptive: 'pillow' },
  'pillows': { singular: 'pillow', plural: 'pillows', descriptive: 'pillows' },
  'blanket': { singular: 'blanket', plural: 'blankets', descriptive: 'blanket' },
  'blankets': { singular: 'blanket', plural: 'blankets', descriptive: 'blankets' },
  'towel': { singular: 'towel', plural: 'towels', descriptive: 'towel' },
  'towels': { singular: 'towel', plural: 'towels', descriptive: 'towels' },

  // Electronics & Tech
  'laptop': { singular: 'laptop', plural: 'laptops', descriptive: 'laptop' },
  'laptops': { singular: 'laptop', plural: 'laptops', descriptive: 'laptops' },
  'phone': { singular: 'phone', plural: 'phones', descriptive: 'phone' },
  'phones': { singular: 'phone', plural: 'phones', descriptive: 'phones' },
  'headphones': { singular: 'headphones', plural: 'headphones', descriptive: 'headphones' },
  'speaker': { singular: 'speaker', plural: 'speakers', descriptive: 'speaker' },
  'speakers': { singular: 'speaker', plural: 'speakers', descriptive: 'speakers' },
  'monitor': { singular: 'monitor', plural: 'monitors', descriptive: 'monitor' },
  'monitors': { singular: 'monitor', plural: 'monitors', descriptive: 'monitors' },
  'camera': { singular: 'camera', plural: 'cameras', descriptive: 'camera' },
  'cameras': { singular: 'camera', plural: 'cameras', descriptive: 'cameras' },
  'tablet': { singular: 'tablet', plural: 'tablets', descriptive: 'tablet' },
  'tablets': { singular: 'tablet', plural: 'tablets', descriptive: 'tablets' },

  // Beauty & Personal Care
  'serum': { singular: 'serum', plural: 'serums', descriptive: 'serum' },
  'serums': { singular: 'serum', plural: 'serums', descriptive: 'serums' },
  'moisturizer': { singular: 'moisturizer', plural: 'moisturizers', descriptive: 'moisturizer' },
  'moisturizers': { singular: 'moisturizer', plural: 'moisturizers', descriptive: 'moisturizers' },
  'shampoo': { singular: 'shampoo', plural: 'shampoos', descriptive: 'shampoo' },
  'shampoos': { singular: 'shampoo', plural: 'shampoos', descriptive: 'shampoos' },
  'perfume': { singular: 'perfume', plural: 'perfumes', descriptive: 'perfume' },
  'perfumes': { singular: 'perfume', plural: 'perfumes', descriptive: 'perfumes' },
  'lipstick': { singular: 'lipstick', plural: 'lipsticks', descriptive: 'lipstick' },
  'lipsticks': { singular: 'lipstick', plural: 'lipsticks', descriptive: 'lipsticks' },
  'foundation': { singular: 'foundation', plural: 'foundations', descriptive: 'foundation' },

  // Stationery & Gifts
  'sticker': { singular: 'sticker', plural: 'stickers', descriptive: 'sticker' },
  'stickers': { singular: 'sticker', plural: 'stickers', descriptive: 'stickers' },
  'notebook': { singular: 'notebook', plural: 'notebooks', descriptive: 'notebook' },
  'notebooks': { singular: 'notebook', plural: 'notebooks', descriptive: 'notebooks' },
  'card': { singular: 'card', plural: 'cards', descriptive: 'card' },
  'cards': { singular: 'card', plural: 'cards', descriptive: 'cards' },
  'gift': { singular: 'gift', plural: 'gifts', descriptive: 'gift' },
  'gifts': { singular: 'gift', plural: 'gifts', descriptive: 'gifts' }
};

/**
 * Style/aesthetic keywords consumers actually search for.
 */
const STYLE_KEYWORDS = [
  'boho', 'bohemian', 'vintage', 'retro', 'modern', 'minimalist', 'classic',
  'rustic', 'farmhouse', 'coastal', 'mid-century', 'industrial', 'scandinavian',
  'cottagecore', 'preppy', 'streetwear', 'athleisure', 'casual', 'formal',
  'elegant', 'luxury', 'designer', 'handmade', 'artisan', 'organic', 'natural',
  'sustainable', 'eco-friendly', 'colorful', 'floral', 'tropical', 'geometric',
  'abstract', 'whimsical', 'funky', 'hippie', 'chic', 'sporty', 'edgy',
  'western', 'country', 'nautical', 'gothic', 'kawaii', 'y2k'
];

/**
 * Audience keywords — who the product is for.
 */
const AUDIENCE_KEYWORDS = [
  'women', 'woman', 'womens', "women's", 'ladies',
  'men', 'man', 'mens', "men's", 'guys',
  'girls', 'girl', 'boys', 'boy',
  'kids', 'children', 'baby', 'babies', 'toddler', 'toddlers',
  'teen', 'teens', 'teenage',
  'unisex', 'plus size', 'petite', 'maternity'
];

/**
 * Parse page title, URL, and breadcrumbs to extract product intelligence.
 * Returns structured context for natural-sounding query generation.
 *
 * @param {Object} extractedData - Full extracted data from content script
 * @returns {{ productType: Object|null, style: string|null, audience: string|null,
 *             cleanName: string, isCollection: boolean, brand: string, category: string }}
 */
export function extractProductIntelligence(extractedData) {
  const pageType = extractedData?.pageType?.type || 'unknown';
  const isCollection = pageType === 'plp';

  // --- Gather text sources ---
  const title = extractedData?.pageInfo?.title || '';
  const pathname = extractedData?.pageInfo?.pathname || '';
  const h1 = extractedData?.contentStructure?.h1?.text || '';
  const schemas = extractedData?.structuredData?.schemas;

  // Use schema product name for PDPs, otherwise parse title
  const rawProductName = schemas?.product?.name || '';

  // Combine all text sources for keyword extraction (lowercase)
  const allText = [title, pathname.replace(/[/-]/g, ' '), h1].join(' ').toLowerCase();

  // --- Extract product type ---
  // Collect all matching tokens and prefer the longest (most specific) match
  let productType = null;
  const allTextTokens = allText.split(/[\s,&+]+/).filter(Boolean);
  let bestTokenMatch = null;
  for (const token of allTextTokens) {
    if (PRODUCT_TYPE_MAP[token]) {
      if (!bestTokenMatch || token.length > bestTokenMatch.length) {
        bestTokenMatch = token;
      }
    }
  }
  if (bestTokenMatch) productType = PRODUCT_TYPE_MAP[bestTokenMatch];
  // Also try multi-word matches (e.g., "tank top") — prefer longest
  let bestPhraseMatch = null;
  for (const key of Object.keys(PRODUCT_TYPE_MAP)) {
    if (key.includes(' ') && allText.includes(key)) {
      if (!bestPhraseMatch || key.length > bestPhraseMatch.length) {
        bestPhraseMatch = key;
      }
    }
  }
  if (bestPhraseMatch) productType = PRODUCT_TYPE_MAP[bestPhraseMatch]; // phrase match wins over token match

  // --- Extract style ---
  let style = null;
  for (const s of STYLE_KEYWORDS) {
    if (allText.includes(s)) {
      style = s;
      break;
    }
  }

  // --- Extract audience ---
  let audience = null;
  for (const a of AUDIENCE_KEYWORDS) {
    if (allText.includes(a)) {
      // Normalize audience to cleaner form
      if (['women', 'woman', 'womens', "women's", 'ladies'].includes(a)) audience = 'women';
      else if (['men', 'man', 'mens', "men's", 'guys'].includes(a)) audience = 'men';
      else if (['girls', 'girl'].includes(a)) audience = 'girls';
      else if (['boys', 'boy'].includes(a)) audience = 'boys';
      else if (['kids', 'children'].includes(a)) audience = 'kids';
      else if (['baby', 'babies', 'toddler', 'toddlers'].includes(a)) audience = 'babies & toddlers';
      else if (['teen', 'teens', 'teenage'].includes(a)) audience = 'teens';
      else audience = a;
      break;
    }
  }

  // --- Build clean name ---
  let cleanName;
  let variantName = ''; // Color/size/variant suffix for context
  if (rawProductName && !isCollection) {
    // For PDPs, clean the schema product name — strip variant/color suffixes
    const cleaned = _cleanProductName(rawProductName);
    cleanName = cleaned.baseName;
    variantName = cleaned.variant;
  } else {
    // Strip marketing words from title for a cleaner name
    cleanName = _cleanTitle(title);
  }

  // --- Build bareProductName (marketing prefix stripped) ---
  // "My Favorite Cotton Top" → "Cotton Top"  "Nike Air Max 90" → "Nike Air Max 90"
  const bareProductName = _stripMarketingPrefix(cleanName);

  // --- Build shortName for natural phrasing ---
  // "this tank top" is more natural than repeating "the Ringer Tank Top" in every query
  let shortName;
  if (productType) {
    shortName = `this ${productType.singular}`;
  } else {
    shortName = `this product`;
  }

  // --- Brand ---
  let brand = '';
  if (schemas?.product?.brand) brand = typeof schemas.product.brand === 'string' ? schemas.product.brand : (schemas.product.brand?.name || '');
  else if (schemas?.brand?.name) brand = schemas.brand.name;
  else if (schemas?.organization?.name) brand = schemas.organization.name;
  if (!brand) {
    const domain = extractedData?.pageInfo?.domain || '';
    brand = _humanizeDomain(domain);
  }

  // --- Category ---
  let category = '';
  const breadcrumb = schemas?.breadcrumb;
  if (breadcrumb?.items?.length > 1) {
    const catItem = breadcrumb.items[breadcrumb.items.length - (isCollection ? 1 : 2)];
    if (catItem?.name) category = catItem.name.toLowerCase();
  }
  if (!category && schemas?.product?.category) {
    const rawCat = schemas.product.category;
    category = (typeof rawCat === 'string' ? rawCat : rawCat?.name || '').toLowerCase();
  }
  // URL slug fallback: extract meaningful segment from pathname
  if (!category) {
    const segments = pathname.split('/').map(s => s.replace(/[-_]/g, ' ').trim()).filter(s => s.length > 2 && !/^\d+$/.test(s) && !['products', 'collections', 'shop', 'p', 'dp', 'en', 'fr'].includes(s));
    if (segments.length > 0) {
      // Use the first non-trivial segment that matches a product-type word or is a readable noun
      const categorySegment = segments.find(s => Object.keys(PRODUCT_TYPE_MAP).some(k => s.includes(k))) || segments[0];
      category = categorySegment;
    }
  }
  if (!category && productType) {
    category = productType.plural;
  }

  return {
    productType,
    style,
    audience,
    cleanName,
    bareProductName,
    shortName,
    variantName,
    isCollection,
    brand,
    category: category || 'products'
  };
}

/**
 * Strip marketing/navigation words from a page title.
 */
function _cleanTitle(title) {
  if (!title) return 'this product';
  // Remove brand suffix: "Product Name | Brand" or "Product Name - Brand"
  let clean = title.split(/\s*[|\-–—]\s*/)[0].trim();

  // Remove marketing fluff words using pre-compiled regexes
  for (const regex of TITLE_STRIP_REGEXES) {
    clean = clean.replace(regex, '');
  }

  // Clean up whitespace
  clean = clean.replace(/\s{2,}/g, ' ').trim();

  // Remove leading "for" if we stripped context before it (e.g., "Shop Tees for Women" → "Tees for Women")
  clean = clean.replace(/^for\s+/i, '').trim();

  return clean || 'this product';
}

/**
 * Clean a schema product name by separating the base product from variant/color suffixes.
 * "Ringer Tank Top - Rust Folk Floral" → { baseName: "Ringer Tank Top", variant: "Rust Folk Floral" }
 * "Classic Hoodie (Large)" → { baseName: "Classic Hoodie", variant: "Large" }
 * "Blue Widget" → { baseName: "Blue Widget", variant: "" }
 */
function _cleanProductName(name) {
  if (!name) return { baseName: 'this product', variant: '' };

  let baseName = name;
  let variant = '';

  // Split on " - " or " – " or " — " (common variant separator)
  // Only split if the part after the dash looks like a variant (color, pattern, size)
  const dashMatch = baseName.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    const before = dashMatch[1].trim();
    const after = dashMatch[2].trim();

    // Heuristic: if the "after" part is shorter than the "before" part
    // and doesn't contain product-type words, it's likely a variant
    const afterLower = after.toLowerCase();
    const hasProductWord = Object.keys(PRODUCT_TYPE_MAP).some(k => afterLower.includes(k));

    // Split if: no product-type word in variant, OR variant is much shorter than base (likely a color/style suffix)
    const variantIsShorter = after.length < before.length * 0.6;
    if (before.length >= 3 && (!hasProductWord || variantIsShorter)) {
      baseName = before;
      variant = after;
    }
  }

  // Strip parenthetical suffixes: "Classic Hoodie (Large)" → "Classic Hoodie"
  const parenMatch = baseName.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    baseName = parenMatch[1].trim();
    if (!variant) variant = parenMatch[2].trim();
  }

  // Strip trailing size indicators: "Classic Hoodie XL" — only if clearly a size
  // (Don't strip legitimate words that happen to be short)

  return {
    baseName: baseName || name,
    variant
  };
}

/**
 * Strip possessive and marketing-sentiment prefixes from a product name so it
 * reads naturally in conversational queries.
 * "My Favorite Cotton Top" → "Cotton Top"
 * "Our Essential Hoodie"   → "Hoodie"
 * "Nike Air Max 90"        → "Nike Air Max 90" (unchanged)
 *
 * Only strips truly meaningless sentiment words (Favorite, Perfect, Essential,
 * Ultimate, Iconic, Signature). Keeps descriptive words like Classic, Everyday,
 * Original that carry real product meaning.
 */
function _stripMarketingPrefix(name) {
  if (!name) return name;
  const POSSESSIVE = /^(?:My|Our|Your|Their)\s+/i;
  const SENTIMENT_ADJ = /^(?:Favorite|Favourite|Perfect|Essential|Ultimate|Iconic|Signature)\s+/i;
  let result = name;
  if (POSSESSIVE.test(result)) {
    result = result.replace(POSSESSIVE, '');
    result = result.replace(SENTIMENT_ADJ, '');
  }
  return result.trim() || name;
}

/**
 * Convert a domain into a human-readable brand name.
 * "www.naturallife.com" → "Natural Life"
 */
function _humanizeDomain(domain) {
  const name = domain.replace(/^www\./, '').split('.')[0];
  if (!name) return 'the brand';

  // Try to split camelCase or common patterns
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')     // camelCase
    .replace(/[-_]/g, ' ')                      // kebab/snake
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}


// ==========================================
// QUERY TEMPLATES — PDP (single product)
// ==========================================

const PDP_QUERY_TEMPLATES = [
  // --- Structured Data ---
  {
    factorName: 'Product Schema',
    // Anchor: identify the product once. Follow-ups: use shortName.
    queries: (ctx) => [
      `What is ${ctx.brand}'s ${ctx.bareProductName}?`,
      ctx.productType ? `Is ${ctx.shortName} from ${ctx.brand} any good?` : `Tell me about the ${ctx.bareProductName} by ${ctx.brand}`,
      ctx.productType ? `Is ${ctx.shortName} worth it?` : `Is the ${ctx.bareProductName} worth buying?`
    ],
    category: 'Structured Data'
  },
  {
    factorName: 'Offer Schema',
    queries: (ctx) => [
      ctx.productType ? `How much does ${ctx.brand} charge for ${ctx.shortName}?` : `How much does the ${ctx.bareProductName} cost?`,
      ctx.productType ? `Where can I buy a ${ctx.brand} ${ctx.productType.singular}?` : `Where can I buy the ${ctx.bareProductName}?`,
      ctx.productType ? `Is ${ctx.shortName} in stock right now?` : `Is the ${ctx.bareProductName} available?`
    ],
    category: 'Structured Data'
  },
  {
    factorName: 'FAQ Schema',
    queries: (ctx) => [
      ctx.productType ? `Common questions about ${ctx.brand} ${ctx.productType.plural}` : `Common questions about the ${ctx.bareProductName}`,
      ctx.productType ? `Is ${ctx.shortName} true to size?` : `What should I know before buying the ${ctx.bareProductName}?`,
      ctx.productType ? `How do I care for ${ctx.shortName}?` : `What do people ask about the ${ctx.bareProductName}?`
    ],
    category: 'Structured Data'
  },
  {
    factorName: 'Breadcrumb Schema',
    queries: (ctx) => [
      `What type of ${ctx.category} does ${ctx.brand} sell?`,
      `What ${ctx.category} is ${ctx.brand} known for?`
    ],
    category: 'Structured Data'
  },

  // --- Protocol & Meta ---
  {
    factorName: 'og:image Format',
    queries: (ctx) => [
      ctx.variantName ? `Show me the ${ctx.bareProductName} from ${ctx.brand} in ${ctx.variantName}` : `Show me the ${ctx.bareProductName} from ${ctx.brand}`,
      ctx.productType ? `What does ${ctx.shortName} look like on?` : `Show me photos of the ${ctx.bareProductName}`
    ],
    category: 'Protocol & Meta'
  },
  {
    factorName: 'Meta Description',
    queries: (ctx) => [
      ctx.productType ? `What is ${ctx.shortName} best used for?` : `What is the ${ctx.bareProductName} used for?`,
      ctx.productType ? `Describe ${ctx.brand}'s ${ctx.productType.singular}` : `Describe the ${ctx.bareProductName} from ${ctx.brand}`
    ],
    category: 'Protocol & Meta'
  },

  // --- Content Quality ---
  {
    factorName: 'Description Length',
    queries: (ctx) => [
      // Anchor uses bareProductName + brand for discoverability
      ctx.productType ? `Tell me about ${ctx.brand}'s ${ctx.bareProductName}` : `Give me a detailed overview of the ${ctx.bareProductName}`,
      ctx.productType ? `What makes ${ctx.shortName} special?` : `What makes the ${ctx.bareProductName} from ${ctx.brand} special?`
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'Description Quality',
    queries: (ctx) => [
      ctx.productType ? `What are the benefits of ${ctx.shortName}?` : `What are the benefits of the ${ctx.bareProductName}?`,
      ctx.productType ? `Why choose ${ctx.brand}'s ${ctx.productType.plural}?` : `Why choose the ${ctx.bareProductName} over similar options?`
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'Features List',
    queries: (ctx) => [
      ctx.productType ? `What features does ${ctx.shortName} have?` : `What features does the ${ctx.bareProductName} have?`,
      ctx.productType ? `What's special about this ${ctx.brand} ${ctx.productType.singular}?` : `What's included with the ${ctx.bareProductName}?`
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'FAQ Content',
    queries: (ctx) => [
      ctx.productType ? `How do I care for ${ctx.shortName}?` : `How do I use the ${ctx.bareProductName}?`,
      ctx.audience ? `Is ${ctx.shortName} good for ${ctx.audience}?` : (ctx.productType ? `Who is ${ctx.shortName} best for?` : `Who is the ${ctx.bareProductName} best for?`),
      ctx.productType ? `Is ${ctx.shortName} comfortable for all-day wear?` : `Is the ${ctx.bareProductName} right for me?`
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'Specification Detail',
    queries: (ctx) => [
      ctx.productType ? `What material is ${ctx.shortName} made from?` : `What are the specs for the ${ctx.bareProductName}?`,
      ctx.productType ? `What sizes does it come in?` : `${ctx.bareProductName} dimensions and materials`,
      ctx.productType ? `Is ${ctx.shortName} machine washable?` : `${ctx.bareProductName} technical specifications`
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'Comparison Content',
    queries: (ctx) => [
      ctx.productType ? `How does ${ctx.shortName} compare to other ${ctx.productType.plural}?` : `How does the ${ctx.bareProductName} compare to alternatives?`,
      ctx.productType ? `Best ${ctx.brand} ${ctx.productType.plural} to consider` : `What are the alternatives to ${ctx.brand}'s ${ctx.bareProductName}?`,
      ctx.productType ? `${ctx.brand} ${ctx.productType.singular} vs competitors — which is better?` : `Is the ${ctx.bareProductName} worth it compared to competitors?`
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'Warranty Information',
    queries: (ctx) => [
      ctx.productType ? `Can I return ${ctx.shortName} if it doesn't fit?` : `Can I return the ${ctx.bareProductName} if it doesn't work?`,
      `What is ${ctx.brand}'s return policy?`
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'Certification/Compliance',
    queries: (ctx) => [
      ctx.productType ? `Is ${ctx.shortName} made with safe materials?` : `Is the ${ctx.bareProductName} certified safe?`,
      ctx.productType ? `Are ${ctx.brand}'s ${ctx.productType.plural} sustainably made?` : `Is the ${ctx.bareProductName} sustainably sourced?`
    ],
    category: 'Content Quality'
  },

  // --- Content Structure ---
  {
    factorName: 'H1 Heading',
    // This is a search/discovery query — uses full cleanName as LLMs would search for it
    queries: (ctx) => [
      `${ctx.brand} ${ctx.bareProductName}`,
      ctx.productType ? `${ctx.brand} ${ctx.bareProductName} ${ctx.productType.singular} review` : `${ctx.bareProductName} review`
    ],
    category: 'Content Structure'
  },
  {
    factorName: 'Primary Image Alt Text',
    queries: (ctx) => [
      ctx.variantName ? `Show me the ${ctx.bareProductName} in ${ctx.variantName}` : `Show me the ${ctx.bareProductName} from ${ctx.brand}`,
      ctx.productType ? `What does ${ctx.shortName} look like on?` : `Show me photos of the ${ctx.bareProductName}`
    ],
    category: 'Content Structure'
  },

  // --- Authority & Trust ---
  {
    factorName: 'Review Presence',
    queries: (ctx) => [
      ctx.productType ? `Is ${ctx.shortName} worth buying?` : `Is the ${ctx.bareProductName} worth it?`,
      ctx.productType ? `What do people think of ${ctx.shortName}?` : `What do customers say about the ${ctx.bareProductName}?`,
      // Anchor: exact name for review search indexing
      `${ctx.brand} ${ctx.bareProductName} reviews`
    ],
    category: 'Authority & Trust'
  },
  {
    factorName: 'Rating Presence',
    queries: (ctx) => [
      ctx.productType ? `Is ${ctx.shortName} highly rated?` : `How is the ${ctx.bareProductName} rated?`,
      ctx.productType ? `What do reviewers say about ${ctx.brand}'s ${ctx.productType.plural}?` : `What rating does the ${ctx.bareProductName} have?`
    ],
    category: 'Authority & Trust'
  },
  {
    factorName: 'Brand Presence',
    queries: (ctx) => [
      ctx.productType ? `Is ${ctx.brand} good for ${ctx.productType.plural}?` : `Is ${ctx.brand} a good brand for ${ctx.category}?`,
      ctx.productType ? `What makes ${ctx.brand}'s ${ctx.productType.plural} different?` : `Who makes the ${ctx.bareProductName}?`
    ],
    category: 'Authority & Trust'
  },

  // --- AI Discoverability ---
  {
    factorName: 'AI Crawler Access',
    // Category/brand level — no product name needed
    queries: (ctx) => {
      const q = [];
      if (ctx.productType && ctx.style) {
        q.push(`Recommend a ${ctx.style} ${ctx.productType.singular}`);
      } else if (ctx.productType) {
        q.push(`Recommend a good ${ctx.productType.singular}`);
      } else {
        q.push(`Recommend a good ${ctx.category} product`);
      }
      q.push(`Best ${ctx.category} from ${ctx.brand}`);
      if (ctx.audience) {
        q.push(`Best ${ctx.productType ? ctx.productType.plural : ctx.category} for ${ctx.audience}`);
      } else {
        q.push(`What ${ctx.category} should I buy?`);
      }
      return q;
    },
    category: 'AI Discoverability'
  },
  {
    factorName: 'Entity Consistency',
    // Anchor queries — uses cleanName intentionally so LLMs match the exact page entity
    queries: (ctx) => [
      `${ctx.brand} ${ctx.cleanName}`,
      `${ctx.cleanName} by ${ctx.brand}`
    ],
    category: 'AI Discoverability'
  },
  {
    factorName: 'Answer-Format Content',
    queries: (ctx) => [
      ctx.productType ? `Best ${ctx.productType.singular} for everyday wear` : `Best ${ctx.category} for everyday use`,
      ctx.productType ? `What is ${ctx.shortName} best for?` : `What is the ${ctx.bareProductName} best for?`,
      ctx.style ? `Best ${ctx.style} ${ctx.productType ? ctx.productType.plural : ctx.category} to buy right now` : `What makes a good ${ctx.category}?`
    ],
    category: 'AI Discoverability'
  },
  {
    factorName: 'Product Identifiers',
    // Anchor: exact product name used for identifier lookup
    queries: (ctx) => [
      `${ctx.brand} ${ctx.bareProductName} product code`,
      ctx.productType ? `${ctx.brand} ${ctx.productType.singular} style number` : `${ctx.bareProductName} SKU or model number`
    ],
    category: 'AI Discoverability'
  },
  {
    factorName: 'llms.txt Presence',
    queries: (ctx) => [
      `What does ${ctx.brand} sell?`,
      `${ctx.brand} full product catalog`
    ],
    category: 'AI Discoverability'
  }
];


// ==========================================
// QUERY TEMPLATES — PLP (collection pages)
// ==========================================

const PLP_QUERY_TEMPLATES = [
  // --- Structured Data ---
  {
    factorName: 'Product Schema',
    queries: (ctx) => {
      const type = ctx.productType;
      const q = [];
      if (type && ctx.style) {
        q.push(`Where can I find ${ctx.style} ${type.plural}?`);
        q.push(`What are the best ${ctx.style} ${type.plural}?`);
      } else if (type) {
        q.push(`Where can I find quality ${type.plural}?`);
        q.push(`Best ${type.plural} to buy online`);
      } else {
        q.push(`Where can I find ${ctx.category} online?`);
        q.push(`Best ${ctx.category} to buy`);
      }
      if (ctx.audience) q.push(`Best ${type ? type.plural : ctx.category} for ${ctx.audience}`);
      return q;
    },
    category: 'Structured Data'
  },
  {
    factorName: 'Offer Schema',
    queries: (ctx) => {
      const type = ctx.productType;
      const what = type ? type.plural : ctx.category;
      return [
        `How much do ${ctx.brand} ${what} cost?`,
        ctx.style ? `Where can I buy ${ctx.style} ${what}?` : `Where can I buy ${ctx.brand} ${what}?`,
        `Are ${ctx.brand} ${what} affordable?`
      ];
    },
    category: 'Structured Data'
  },
  {
    factorName: 'FAQ Schema',
    queries: (ctx) => {
      const type = ctx.productType;
      const what = type ? type.plural : ctx.category;
      return [
        `What should I know before buying ${ctx.style ? ctx.style + ' ' : ''}${what}?`,
        ctx.audience ? `How do I choose the right ${type ? type.singular : ctx.category} for ${ctx.audience}?` : `How do I choose the right ${type ? type.singular : ctx.category}?`,
        `What makes a good ${type ? type.singular : ctx.category}?`
      ];
    },
    category: 'Structured Data'
  },
  {
    factorName: 'Breadcrumb Schema',
    queries: (ctx) => [
      `What types of ${ctx.category} does ${ctx.brand} carry?`,
      `${ctx.brand} ${ctx.category} collection`
    ],
    category: 'Structured Data'
  },

  // --- Protocol & Meta ---
  {
    factorName: 'og:image Format',
    queries: (ctx) => {
      const type = ctx.productType;
      return [
        `Show me ${ctx.brand}'s ${type ? type.plural : ctx.category}`,
        ctx.style ? `What do ${ctx.style} ${type ? type.plural : ctx.category} look like?` : `What do ${ctx.brand} ${type ? type.plural : ctx.category} look like?`
      ];
    },
    category: 'Protocol & Meta'
  },
  {
    factorName: 'Meta Description',
    queries: (ctx) => {
      const type = ctx.productType;
      const what = type ? type.plural : ctx.category;
      return [
        ctx.style ? `What kind of ${ctx.style} ${what} are available?` : `What kind of ${what} does ${ctx.brand} offer?`,
        `Tell me about ${ctx.brand}'s ${what} collection`
      ];
    },
    category: 'Protocol & Meta'
  },

  // --- Content Quality ---
  {
    factorName: 'Description Length',
    queries: (ctx) => {
      const type = ctx.productType;
      const what = type ? type.plural : ctx.category;
      return [
        ctx.style ? `What makes ${ctx.style} ${what} unique?` : `What makes ${ctx.brand} ${what} unique?`,
        `Tell me more about ${ctx.brand}'s ${what}`
      ];
    },
    category: 'Content Quality'
  },
  {
    factorName: 'Description Quality',
    queries: (ctx) => {
      const type = ctx.productType;
      const what = type ? type.plural : ctx.category;
      return [
        `Why should I choose ${ctx.brand} for ${what}?`,
        ctx.style ? `What's special about ${ctx.style} ${what} from ${ctx.brand}?` : `What's special about ${ctx.brand}'s ${what}?`
      ];
    },
    category: 'Content Quality'
  },
  {
    factorName: 'Features List',
    queries: (ctx) => {
      const type = ctx.productType;
      const what = type ? type.plural : ctx.category;
      return [
        `What makes ${ctx.brand} ${what} different?`,
        `Key features of ${ctx.brand} ${what}`
      ];
    },
    category: 'Content Quality'
  },
  {
    factorName: 'FAQ Content',
    queries: (ctx) => {
      const type = ctx.productType;
      return [
        type ? `How do I pick the right ${type.singular}?` : `How do I pick the right ${ctx.category}?`,
        ctx.audience ? `What ${type ? type.plural : ctx.category} are best for ${ctx.audience}?` : `What ${type ? type.plural : ctx.category} are best for everyday wear?`,
        ctx.style ? `Are ${ctx.style} ${type ? type.plural : ctx.category} still in style?` : `What ${type ? type.plural : ctx.category} are trending right now?`
      ];
    },
    category: 'Content Quality'
  },
  {
    factorName: 'Specification Detail',
    queries: (ctx) => {
      const type = ctx.productType;
      const what = type ? type.plural : ctx.category;
      return [
        `What materials are ${ctx.brand} ${what} made from?`,
        `What sizes do ${ctx.brand} ${what} come in?`
      ];
    },
    category: 'Content Quality'
  },
  {
    factorName: 'Comparison Content',
    queries: (ctx) => {
      const type = ctx.productType;
      const what = type ? type.plural : ctx.category;
      return [
        `How do ${ctx.brand} ${what} compare to other brands?`,
        ctx.style ? `Best ${ctx.style} ${what} brands` : `Best brands for ${what}`,
        `${ctx.brand} vs other ${what} brands — which is better?`
      ];
    },
    category: 'Content Quality'
  },
  {
    factorName: 'Warranty Information',
    queries: (ctx) => [
      `Does ${ctx.brand} offer returns?`,
      `What is ${ctx.brand}'s return and exchange policy?`
    ],
    category: 'Content Quality'
  },
  {
    factorName: 'Certification/Compliance',
    queries: (ctx) => {
      const type = ctx.productType;
      const what = type ? type.plural : ctx.category;
      return [
        `Are ${ctx.brand} ${what} sustainably made?`,
        `Does ${ctx.brand} use ethical manufacturing?`
      ];
    },
    category: 'Content Quality'
  },

  // --- Content Structure ---
  {
    factorName: 'H1 Heading',
    queries: (ctx) => {
      const type = ctx.productType;
      return [
        ctx.style ? `${ctx.brand} ${ctx.style} ${type ? type.plural : ctx.category}` : `${ctx.brand} ${type ? type.plural : ctx.category}`,
        `${ctx.brand} ${ctx.category} collection`
      ];
    },
    category: 'Content Structure'
  },
  {
    factorName: 'Primary Image Alt Text',
    queries: (ctx) => {
      const type = ctx.productType;
      return [
        ctx.style ? `Show me ${ctx.style} ${type ? type.plural : ctx.category}` : `Show me ${ctx.brand} ${type ? type.plural : ctx.category}`,
        `What do ${ctx.brand} ${type ? type.plural : ctx.category} look like?`
      ];
    },
    category: 'Content Structure'
  },

  // --- Authority & Trust ---
  {
    factorName: 'Review Presence',
    queries: (ctx) => {
      const type = ctx.productType;
      const what = type ? type.plural : ctx.category;
      return [
        `Are ${ctx.brand} ${what} worth buying?`,
        `${ctx.brand} ${what} reviews`,
        `What do customers think of ${ctx.brand} ${what}?`
      ];
    },
    category: 'Authority & Trust'
  },
  {
    factorName: 'Rating Presence',
    queries: (ctx) => {
      const type = ctx.productType;
      const what = type ? type.plural : ctx.category;
      return [
        `How are ${ctx.brand} ${what} rated?`,
        `Are ${ctx.brand} ${what} highly rated?`
      ];
    },
    category: 'Authority & Trust'
  },
  {
    factorName: 'Brand Presence',
    queries: (ctx) => [
      `Is ${ctx.brand} a good brand?`,
      `Is ${ctx.brand} a reputable ${ctx.category} brand?`
    ],
    category: 'Authority & Trust'
  },

  // --- AI Discoverability ---
  {
    factorName: 'AI Crawler Access',
    queries: (ctx) => {
      const type = ctx.productType;
      const q = [];
      if (type && ctx.style && ctx.audience) {
        q.push(`Where can I find ${ctx.style} ${type.plural} for ${ctx.audience}?`);
      }
      if (type && ctx.style) {
        q.push(`What are high quality ${ctx.style} ${type.plural}?`);
      }
      if (type && ctx.audience) {
        q.push(`Where can I buy ${type.plural} for ${ctx.audience}?`);
      }
      if (q.length === 0) {
        q.push(`Recommend a good ${ctx.category} brand`);
        q.push(`Best place to buy ${ctx.category} online`);
      }
      return q.slice(0, 3);
    },
    category: 'AI Discoverability'
  },
  {
    factorName: 'Entity Consistency',
    queries: (ctx) => {
      const type = ctx.productType;
      return [
        `Tell me about ${ctx.brand}'s ${type ? type.plural : ctx.category}`,
        ctx.style ? `${ctx.brand} ${ctx.style} collection` : `${ctx.brand} ${ctx.category} collection`
      ];
    },
    category: 'AI Discoverability'
  },
  {
    factorName: 'Answer-Format Content',
    queries: (ctx) => {
      const type = ctx.productType;
      const q = [];
      if (type && ctx.style) {
        q.push(`Best ${ctx.style} ${type.plural} to buy right now`);
      }
      if (type && ctx.audience) {
        q.push(`Best ${type.plural} for ${ctx.audience}`);
      }
      q.push(`What are the most popular ${type ? type.plural : ctx.category} from ${ctx.brand}?`);
      return q.slice(0, 3);
    },
    category: 'AI Discoverability'
  },
  {
    factorName: 'Product Identifiers',
    queries: (ctx) => {
      const type = ctx.productType;
      return [
        `${ctx.brand} ${type ? type.singular : ctx.category} product codes`,
        `Find a specific ${ctx.brand} ${type ? type.singular : ctx.category} by SKU`
      ];
    },
    category: 'AI Discoverability'
  },
  {
    factorName: 'llms.txt Presence',
    queries: (ctx) => [
      `What does ${ctx.brand} sell?`,
      `${ctx.brand} full product catalog`
    ],
    category: 'AI Discoverability'
  }
];


// ==========================================
// CITATION OPPORTUNITY ENGINE
// ==========================================

/**
 * Citation Opportunity Engine
 * Generates citation opportunities from AI Readiness scoring results.
 * Uses product intelligence layer for natural-sounding query generation.
 */
export class CitationOpportunityEngine {
  /**
   * @param {Object} scoreResult - AI Readiness score result from ScoringEngine.calculateScore()
   * @param {Object} extractedData - Full extracted data from content script
   */
  constructor(scoreResult, extractedData) {
    this.scoreResult = scoreResult;
    this.extractedData = extractedData;
    try {
      this.context = extractProductIntelligence(extractedData);
    } catch (e) {
      console.warn('pdpIQ: CitationOpportunityEngine context extraction failed, using safe defaults', e);
      this.context = {
        productType: null, style: null, audience: null,
        cleanName: 'this product', shortName: 'this product', variantName: '',
        isCollection: false, brand: 'the brand', category: 'products'
      };
    }
  }

  /**
   * Generate always-present discovery and brand-authority query groups from product intelligence.
   * These are independent of factor scoring — they represent the query space the brand should own.
   * @returns {{ discoveryQueries: string[], brandQueries: string[] }}
   */
  generateDiscoveryQueries() {
    const ctx = this.context;
    const { productType, style, audience, brand, category } = ctx;

    // --- Discovery queries (market/category-level) ---
    const discoveryQueries = [];
    if (productType && style && audience) {
      discoveryQueries.push(`${style} ${productType.plural} for ${audience}`);
      discoveryQueries.push(`best ${style} ${productType.plural}`);
      discoveryQueries.push(`${audience}'s ${style} ${productType.descriptive} picks`);
    } else if (productType && style) {
      discoveryQueries.push(`${style} ${productType.plural}`);
      discoveryQueries.push(`best ${style} ${productType.plural} to buy`);
      discoveryQueries.push(`where to find ${style} ${productType.plural} online`);
    } else if (productType && audience) {
      discoveryQueries.push(`${productType.plural} for ${audience}`);
      discoveryQueries.push(`best ${productType.plural} for ${audience}`);
      discoveryQueries.push(`top-rated ${productType.plural} for ${audience}`);
    } else if (productType) {
      discoveryQueries.push(`best ${productType.plural} to buy`);
      discoveryQueries.push(`${productType.plural} buying guide`);
    } else if (category !== 'products') {
      discoveryQueries.push(`best ${category} to buy`);
      discoveryQueries.push(`${category} buying guide`);
    }

    // --- Brand authority queries (brand-anchored) ---
    const brandQueries = [];
    if (brand === 'the brand') {
      // No meaningful brand signal — return empty
      return { discoveryQueries: discoveryQueries.slice(0, 3), brandQueries: [] };
    }

    if (productType && style) {
      brandQueries.push(`${brand} ${style} ${productType.plural}`);
      brandQueries.push(`${brand} ${productType.plural} collection`);
    } else if (productType) {
      brandQueries.push(`${brand} ${productType.plural}`);
      brandQueries.push(`${brand} ${productType.descriptive} styles`);
    }

    if (audience && brandQueries.length < 3) {
      brandQueries.push(`${brand} ${productType ? productType.plural : category} for ${audience}`);
    }

    if (brandQueries.length < 3) {
      brandQueries.push(`what is ${brand} known for?`);
    }

    return {
      discoveryQueries: discoveryQueries.slice(0, 3),
      brandQueries: brandQueries.slice(0, 3)
    };
  }

  /**
   * Generate citation opportunities grouped by status.
   * @returns {{ discovery: string[], brand: string[], toCapture: Array, winning: Array, context: Object }}
   */
  generateOpportunities() {
    const ctx = this.context;

    // Generate always-present discovery and brand groups
    const { discoveryQueries, brandQueries } = this.generateDiscoveryQueries();

    // Select templates based on page type
    const templates = ctx.isCollection ? PLP_QUERY_TEMPLATES : PDP_QUERY_TEMPLATES;

    // Build a map of factor name -> status from all AI Readiness categories
    const factorStatusMap = {};
    const categoryScores = this.scoreResult?.categoryScores || {};
    for (const catKey of Object.keys(categoryScores)) {
      const factors = categoryScores[catKey]?.factors || [];
      for (const factor of factors) {
        factorStatusMap[factor.name] = factor.status;
      }
    }

    const toCapture = [];
    const winning = [];

    for (const template of templates) {
      const status = factorStatusMap[template.factorName];
      if (status === undefined) continue; // Factor not found in results

      // Generate queries using the context-aware function
      const queries = template.queries(ctx);

      const entry = {
        factorName: template.factorName,
        category: template.category,
        queries,
        status
      };

      if (status === 'fail') {
        toCapture.push({ ...entry, priority: 'critical' });
      } else if (status === 'warning') {
        toCapture.push({ ...entry, priority: 'refine' });
      } else if (status === 'pass') {
        winning.push(entry);
      }
      // 'unknown', 'na', or other statuses: omit from all groups
    }

    if (DEBUG) {
      console.log('pdpIQ Citation Opportunities — context:', ctx);
      console.log(`  Discovery: ${discoveryQueries.length}, Brand: ${brandQueries.length}, ToCapture: ${toCapture.length}, Winning: ${winning.length}`);
    }

    return {
      discovery: discoveryQueries,
      brand: brandQueries,
      toCapture,
      winning,
      context: ctx
    };
  }
}
