/**
 * Content Script
 * Orchestrates data extraction from the page and sends results to service worker
 */

const DEBUG = false;

// Import extractors - Note: Content scripts can't use ES modules directly in Manifest V3
// These functions are inlined during build or we load them differently

// For now, we'll define extraction logic inline and structure for modularity

// ==========================================
// JSON-LD CACHE (performance optimization)
// Parses JSON-LD scripts once and reuses across all extractors
// ==========================================

let _jsonLdCache = null;

/**
 * Get parsed JSON-LD data (cached)
 * Parses all JSON-LD scripts once and caches the result
 * @returns {Array} Array of {valid, data, error} objects
 */
function getParsedJsonLd() {
  if (_jsonLdCache !== null) return _jsonLdCache;

  _jsonLdCache = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      const data = JSON.parse(script.textContent.trim());
      _jsonLdCache.push({ valid: true, data });
    } catch (e) {
      _jsonLdCache.push({ valid: false, error: e.message });
    }
  });

  return _jsonLdCache;
}

/**
 * Iterate over all schema items from JSON-LD (generator)
 * Handles @graph arrays, top-level arrays, and single objects
 * @param {Array|null} typeFilter - Optional array of types to filter (lowercase)
 * @yields {{type: string, item: Object}}
 */
function* iterateSchemaItems(typeFilter = null) {
  const jsonLdData = getParsedJsonLd();

  for (const { valid, data } of jsonLdData) {
    if (!valid) continue;

    // Handle @graph, arrays, and single objects
    let items;
    if (data['@graph']) {
      items = data['@graph'];
    } else if (Array.isArray(data)) {
      items = data;
    } else {
      items = [data];
    }

    for (const item of items) {
      if (!item || !item['@type']) continue;

      const type = (Array.isArray(item['@type']) ? item['@type'][0] : item['@type']).toLowerCase();

      if (!typeFilter || typeFilter.includes(type)) {
        yield { type, item };
      }
    }
  }
}

/**
 * Clear JSON-LD cache (call after extraction completes)
 */
function clearJsonLdCache() {
  _jsonLdCache = null;
}

/**
 * Main extraction orchestrator
 * @returns {Object} All extracted data
 */
function performFullExtraction() {
  // Clear JSON-LD cache for fresh extraction
  clearJsonLdCache();

  try {
    const result = {
      structuredData: extractStructuredData(),
      metaTags: extractMetaTags(),
      contentQuality: extractContentQuality(),
      contentStructure: extractContentStructure(),
      trustSignals: extractTrustSignals(),
      aiDiscoverability: extractAIDiscoverabilitySignals(),
      pdpQuality: extractPdpQualitySignals(),
      seoSignals: extractSeoSignals(),
      pageInfo: {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        pathname: window.location.pathname,
        extractedAt: new Date().toISOString()
      }
    };

    // Clear cache after extraction to free memory
    clearJsonLdCache();
    return result;
  } catch (error) {
    console.error('pdpIQ: Extraction error', error);
    clearJsonLdCache();
    return {
      error: error.message,
      pageInfo: {
        url: window.location.href,
        title: document.title
      }
    };
  }
}

// Listen for extraction requests from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_DATA') {
    if (DEBUG) console.log('pdpIQ: Starting extraction');
    const startTime = performance.now();

    const extractedData = performFullExtraction();

    const endTime = performance.now();
    extractedData.extractionTime = Math.round(endTime - startTime);

    if (DEBUG) console.log(`pdpIQ: Extraction complete in ${extractedData.extractionTime}ms`);

    // Send results back (include requestId to prevent race conditions)
    chrome.runtime.sendMessage({
      type: 'EXTRACTION_COMPLETE',
      data: extractedData,
      url: window.location.href,
      timestamp: Date.now(),
      requestId: message.requestId
    });

    sendResponse({ success: true });
  }

  if (message.type === 'PING') {
    sendResponse({ success: true, ready: true });
  }
});

// ==========================================
// STRUCTURED DATA EXTRACTOR
// ==========================================

function extractStructuredData() {
  const results = {
    jsonLd: [],
    microdata: [],
    schemas: {
      product: null,
      offer: null,
      aggregateRating: null,
      reviews: [],
      faq: null,
      breadcrumb: null,
      organization: null,
      brand: null,
      images: []
    }
  };

  // Extract JSON-LD (uses cached parsing for performance)
  const parsedJsonLd = getParsedJsonLd();
  parsedJsonLd.forEach(({ valid, data, error }) => {
    if (valid) {
      results.jsonLd.push({ valid: true, data });
      categorizeSchemas(data, results.schemas);
    } else {
      results.jsonLd.push({ valid: false, error });
    }
  });

  // Extract Microdata
  document.querySelectorAll('[itemscope]').forEach(scope => {
    if (scope.closest('[itemscope]') !== scope && scope.parentElement?.closest('[itemscope]')) return;
    const item = extractMicrodataItem(scope);
    if (item.type) results.microdata.push(item);
  });

  // Categorize microdata schemas
  categorizeMicrodataSchemas(results.microdata, results.schemas);

  return results;
}

function extractMicrodataItem(scope) {
  const item = { type: scope.getAttribute('itemtype') || '', properties: {} };
  scope.querySelectorAll('[itemprop]').forEach(prop => {
    const propScope = prop.closest('[itemscope]');
    if (propScope !== scope && propScope !== prop) return;
    const name = prop.getAttribute('itemprop');
    const value = prop.hasAttribute('itemscope') ? extractMicrodataItem(prop) :
                  (prop.content || prop.href || prop.src || prop.textContent.trim());
    item.properties[name] = value;
  });
  return item;
}

function categorizeSchemas(data, schemas) {
  // Handle three formats:
  // 1. Array at top level: [{@type: "Product"}, {@type: "Organization"}]
  // 2. Object with @graph: {"@graph": [{@type: "Product"}, ...]}
  // 3. Single object: {@type: "Product"}
  let items;
  if (Array.isArray(data)) {
    items = data;
  } else if (data['@graph']) {
    items = data['@graph'];
  } else {
    items = [data];
  }

  // Build @id index for resolving references within this JSON-LD block
  const idIndex = {};
  items.forEach(item => { if (item && item['@id']) idIndex[item['@id']] = item; });

  items.forEach(item => {
    if (!item || !item['@type']) return;
    const type = (Array.isArray(item['@type']) ? item['@type'][0] : item['@type']).toLowerCase();

    if (type === 'product' || type === 'productgroup') {
      const brandName = extractBrandName(item.brand) || extractBrandName(item.manufacturer);
      // For ProductGroup, GTIN/MPN may live on variants rather than the group itself
      let gtin = item.gtin || item.gtin13 || item.gtin14 || item.gtin12 || item.gtin8;
      let mpn = item.mpn;
      if ((!gtin || !mpn) && item.hasVariant) {
        const variants = Array.isArray(item.hasVariant) ? item.hasVariant : [item.hasVariant];
        for (const variant of variants) {
          if (variant) {
            if (!gtin) gtin = variant.gtin || variant.gtin13 || variant.gtin14 || variant.gtin12 || variant.gtin8;
            if (!mpn) mpn = variant.mpn;
            if (gtin && mpn) break;
          }
        }
      }
      // Merge with any existing schemas.product so that a second (incomplete) block
      // for the same product does not clobber data (e.g. name, brand) set by the first.
      const existingProduct = schemas.product || {};
      schemas.product = {
        name: item.name || existingProduct.name,
        description: item.description || existingProduct.description,
        image: extractImageUrl(item.image) || existingProduct.image,
        sku: item.sku || item.productGroupID || existingProduct.sku,
        gtin: gtin || existingProduct.gtin,
        mpn: mpn || existingProduct.mpn,
        brand: brandName || existingProduct.brand,
        hasOffer: existingProduct.hasOffer || !!item.offers || !!(item.hasVariant && item.hasVariant.length > 0),
        hasRating: existingProduct.hasRating || !!item.aggregateRating,
        isProductGroup: existingProduct.isProductGroup || type === 'productgroup'
      };
      // Extract offers - check direct offers first, then hasVariant for ProductGroup
      let offersSource = item.offers;
      if (!offersSource && item.hasVariant) {
        // ProductGroup: extract offers from first variant that has them
        const variants = Array.isArray(item.hasVariant) ? item.hasVariant : [item.hasVariant];
        for (const variant of variants) {
          if (variant && variant.offers) {
            offersSource = variant.offers;
            break;
          }
        }
      }
      if (offersSource) {
        const offers = Array.isArray(offersSource) ? offersSource : [offersSource];
        schemas.offer = offers.map(o => ({
          price: o.price || o.lowPrice,
          priceCurrency: o.priceCurrency,
          availability: o.availability
        }));
      }
      if (item.aggregateRating) {
        // Resolve @id reference (Shopify ProductGroup pattern: "aggregateRating": {"@id": "#reviews"})
        const ratingData = item.aggregateRating['@id']
          ? (idIndex[item.aggregateRating['@id']] || item.aggregateRating)
          : item.aggregateRating;
        const rv = parseFloat(ratingData.ratingValue);
        if (!isNaN(rv)) {
          schemas.aggregateRating = {
            ratingValue: rv,
            reviewCount: parseInt(ratingData.reviewCount, 10) || parseInt(ratingData.ratingCount, 10) || null,
            bestRating: parseFloat(ratingData.bestRating) || 5
          };
        }
      }
      // Extract ImageObject items nested in Product.image
      if (item.image) {
        const images = Array.isArray(item.image) ? item.image : [item.image];
        images.forEach(img => {
          if (img && typeof img === 'object' && (img['@type'] === 'ImageObject' || img.url || img.contentUrl)) {
            const imgUrl = img.url || img.contentUrl;
            if (imgUrl) {
              schemas.images.push({ url: imgUrl, caption: img.caption || null, width: img.width || null, height: img.height || null, source: 'product-nested' });
            }
          }
        });
      }
      // Extract reviews nested in Product/ProductGroup
      if (item.review && schemas.reviews.length === 0) {
        const reviewList = Array.isArray(item.review) ? item.review : [item.review];
        schemas.reviews = reviewList.slice(0, 5).map(r => ({
          rating: parseFloat(r.reviewRating?.ratingValue) || null,
          datePublished: r.datePublished || null,
          body: r.reviewBody ? r.reviewBody.substring(0, 200) : null,
          source: 'product-nested'
        })).filter(r => r.rating !== null || r.body !== null);
      }
      // Extract nested brand/organization schemas
      if (!schemas.brand && item.brand) {
        const brandObj = Array.isArray(item.brand) ? item.brand[0] : item.brand;
        if (brandObj && typeof brandObj === 'object' && brandObj['@type']) {
          schemas.brand = {
            name: brandObj.name || null,
            logo: extractImageUrl(brandObj.logo) || null,
            url: brandObj.url || null,
            source: 'product-nested'
          };
        }
      }
      if (!schemas.organization && item.manufacturer) {
        const mfgObj = Array.isArray(item.manufacturer) ? item.manufacturer[0] : item.manufacturer;
        if (mfgObj && typeof mfgObj === 'object' && mfgObj['@type']) {
          schemas.organization = {
            name: mfgObj.name || null,
            logo: extractImageUrl(mfgObj.logo) || null,
            url: mfgObj.url || null,
            source: 'product-nested'
          };
        }
      }
    }
    if (type === 'faqpage') {
      const questions = (item.mainEntity || []).filter(e => e['@type'] === 'Question');
      schemas.faq = {
        questionCount: questions.length,
        questions: questions.map(q => ({
          question: q.name,
          answer: q.acceptedAnswer?.text,
          answerLength: (q.acceptedAnswer?.text || '').length
        }))
      };
    }
    if (type === 'breadcrumblist') {
      schemas.breadcrumb = {
        itemCount: (item.itemListElement || []).length,
        items: (item.itemListElement || []).map(el => ({ position: el.position, name: el.name || (el.item && el.item.name) || null }))
      };
    }
    if (type === 'organization') {
      schemas.organization = { name: item.name, logo: extractImageUrl(item.logo), url: item.url };
    }
    if (type === 'review') {
      const entry = {
        rating: parseFloat(item.reviewRating?.ratingValue) || null,
        datePublished: item.datePublished || null,
        body: item.reviewBody ? item.reviewBody.substring(0, 200) : null,
        source: 'json-ld'
      };
      if ((entry.rating !== null || entry.body !== null) && schemas.reviews.length < 5) {
        schemas.reviews.push(entry);
      }
    }
  });

  // Second pass: pick up BreadcrumbList nested inside ItemPage (e.g. BigCommerce @graph pattern)
  if (!schemas.breadcrumb) {
    for (const item of items) {
      if (!item) continue;
      const t = (Array.isArray(item['@type']) ? item['@type'][0] : item['@type'] || '').toLowerCase();
      if (t === 'itempage' && item.breadcrumb) {
        const bc = item.breadcrumb;
        const bcType = (Array.isArray(bc['@type']) ? bc['@type'][0] : bc['@type'] || '').toLowerCase();
        if (bcType === 'breadcrumblist' && bc.itemListElement) {
          schemas.breadcrumb = {
            itemCount: bc.itemListElement.length,
            items: bc.itemListElement.map(el => ({ position: el.position, name: el.name || (el.item && el.item.name) || null }))
          };
          break;
        }
      }
    }
  }

  // Third pass: pick up aggregateRating from untyped blocks that have no @type but contain
  // rating data linked to the product via @id (e.g. Speed Addicts BigCommerce pattern).
  if (!schemas.aggregateRating) {
    for (const item of items) {
      if (!item || item['@type'] || !item.aggregateRating) continue;
      const ratingData = item.aggregateRating;
      const rv = parseFloat(ratingData.ratingValue);
      if (!isNaN(rv)) {
        schemas.aggregateRating = {
          ratingValue: rv,
          reviewCount: parseInt(ratingData.reviewCount, 10) || parseInt(ratingData.ratingCount, 10) || null,
          bestRating: parseFloat(ratingData.bestRating) || 5
        };
        if (schemas.product) schemas.product.hasRating = true;
        break;
      }
    }
  }
}

function extractImageUrl(image) {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return image[0]?.url || image[0];
  return image.url || image.contentUrl;
}

/**
 * Extract brand/organization name from various schema formats
 * Handles: string, object with name, array of objects, array of strings
 * @param {any} brandData - Brand data in various formats
 * @returns {string|null} Brand name or null
 */
function extractBrandName(brandData) {
  if (!brandData) return null;
  if (typeof brandData === 'string') return brandData;
  if (Array.isArray(brandData)) {
    if (brandData.length === 0) return null;
    const first = brandData[0];
    if (typeof first === 'string') return first;
    return first?.name || null;
  }
  return brandData?.name || null;
}

function categorizeMicrodataSchemas(microdataItems, schemas) {
  const standaloneListItems = [];

  microdataItems.forEach(item => {
    if (!item.type) return;
    const type = item.type.replace(/^https?:\/\/schema\.org\//, '').toLowerCase();

    if ((type === 'product' || type === 'productgroup') && !schemas.product) {
      schemas.product = {
        name: item.properties.name || null,
        description: item.properties.description || null,
        image: item.properties.image || null,
        sku: item.properties.sku || item.properties.productGroupID || null,
        brand: extractBrandName(item.properties.brand?.properties?.name || item.properties.brand) || extractBrandName(item.properties.manufacturer),
        hasOffer: !!item.properties.offers || !!item.properties.hasVariant,
        hasRating: !!item.properties.aggregateRating,
        isProductGroup: type === 'productgroup',
        source: 'microdata'
      };
      // Extract nested offers from Product
      if (item.properties.offers && !schemas.offer) {
        const offers = Array.isArray(item.properties.offers) ? item.properties.offers : [item.properties.offers];
        schemas.offer = offers.map(o => ({
          price: o.properties?.price || o.properties?.lowPrice || null,
          priceCurrency: o.properties?.priceCurrency || null,
          availability: o.properties?.availability || null,
          source: 'microdata'
        }));
      }
      // Extract nested aggregateRating from Product
      if (item.properties.aggregateRating && !schemas.aggregateRating) {
        const rating = item.properties.aggregateRating;
        schemas.aggregateRating = {
          ratingValue: parseFloat(rating.properties?.ratingValue) || null,
          reviewCount: parseInt(rating.properties?.reviewCount, 10) || null,
          ratingCount: parseInt(rating.properties?.ratingCount, 10) || null,
          bestRating: parseFloat(rating.properties?.bestRating) || 5,
          source: 'microdata'
        };
      }
      // Extract nested reviews from Product
      if (item.properties.review && schemas.reviews.length === 0) {
        const reviews = Array.isArray(item.properties.review) ? item.properties.review : [item.properties.review];
        schemas.reviews = reviews.map(r => ({
          author: r.properties?.author?.properties?.name || r.properties?.author || null,
          datePublished: r.properties?.datePublished || null,
          reviewBody: r.properties?.reviewBody || r.properties?.description || null,
          reviewRating: r.properties?.reviewRating ? {
            ratingValue: parseFloat(r.properties.reviewRating.properties?.ratingValue) || null,
            bestRating: parseFloat(r.properties.reviewRating.properties?.bestRating) || 5
          } : null,
          source: 'microdata'
        }));
      }
    }

    if (type === 'offer' && !schemas.offer) {
      schemas.offer = [{
        price: item.properties.price || item.properties.lowPrice || null,
        priceCurrency: item.properties.priceCurrency || null,
        availability: item.properties.availability || null,
        source: 'microdata'
      }];
    }

    if (type === 'aggregaterating' && !schemas.aggregateRating) {
      schemas.aggregateRating = {
        ratingValue: parseFloat(item.properties.ratingValue) || null,
        reviewCount: parseInt(item.properties.reviewCount, 10) || null,
        ratingCount: parseInt(item.properties.ratingCount, 10) || null,
        bestRating: parseFloat(item.properties.bestRating) || 5,
        source: 'microdata'
      };
    }

    if (type === 'review') {
      schemas.reviews.push({
        author: item.properties.author?.properties?.name || item.properties.author || null,
        datePublished: item.properties.datePublished || null,
        reviewBody: item.properties.reviewBody || item.properties.description || null,
        reviewRating: item.properties.reviewRating ? {
          ratingValue: parseFloat(item.properties.reviewRating.properties?.ratingValue) || null,
          bestRating: parseFloat(item.properties.reviewRating.properties?.bestRating) || 5
        } : null,
        source: 'microdata'
      });
    }

    if (type === 'faqpage' && !schemas.faq) {
      const mainEntity = item.properties.mainEntity || [];
      const questions = Array.isArray(mainEntity) ? mainEntity : [mainEntity];
      schemas.faq = {
        questionCount: questions.length,
        questions: questions.filter(q => q.type?.includes('Question')).map(q => ({
          question: q.properties?.name || null,
          answer: q.properties?.acceptedAnswer?.properties?.text || null,
          answerLength: (q.properties?.acceptedAnswer?.properties?.text || '').length
        })),
        source: 'microdata'
      };
    }

    if (type === 'breadcrumblist' && !schemas.breadcrumb) {
      const listElements = item.properties.itemListElement || [];
      const elements = Array.isArray(listElements) ? listElements : [listElements];
      schemas.breadcrumb = {
        itemCount: elements.length,
        items: elements.map(el => ({
          position: el.properties?.position || null,
          name: el.properties?.name || null,
          url: el.properties?.item || null
        })),
        source: 'microdata'
      };
    }

    if (type === 'organization' && !schemas.organization) {
      schemas.organization = {
        name: item.properties.name || null,
        logo: item.properties.logo?.properties?.url || item.properties.logo || null,
        url: item.properties.url || null,
        source: 'microdata'
      };
    }

    if (type === 'brand' && !schemas.brand) {
      schemas.brand = {
        name: item.properties.name || null,
        logo: item.properties.logo?.properties?.url || item.properties.logo || null,
        url: item.properties.url || null,
        source: 'microdata'
      };
    }

    if (type === 'imageobject') {
      schemas.images.push({
        url: item.properties.url || item.properties.contentUrl || null,
        caption: item.properties.caption || null,
        width: item.properties.width || null,
        height: item.properties.height || null,
        source: 'microdata'
      });
    }

    // Collect standalone ListItem for breadcrumb fallback assembly
    if (type === 'listitem') {
      standaloneListItems.push({
        position: parseInt(item.properties.position, 10) || null,
        name: item.properties.name || item.properties.item?.properties?.name || null,
        url: item.properties.item || null,
        source: 'microdata'
      });
    }
  });

  // Assemble standalone ListItem elements into breadcrumb if no BreadcrumbList was found
  if (!schemas.breadcrumb && standaloneListItems.length > 0) {
    standaloneListItems.sort((a, b) => (a.position || 0) - (b.position || 0));
    schemas.breadcrumb = {
      itemCount: standaloneListItems.length,
      items: standaloneListItems,
      source: 'microdata'
    };
  }
}

// ==========================================
// META TAGS EXTRACTOR
// ==========================================

function extractMetaTags() {
  const og = { title: null, description: null, image: null, type: null, url: null, imageWidth: null, imageHeight: null, imageAlt: null };
  const twitter = { card: null, title: null, description: null, image: null };
  const standard = { description: null, keywords: null };

  document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
    const prop = meta.getAttribute('property');
    const content = meta.content;
    if (prop === 'og:title') og.title = content;
    if (prop === 'og:description') og.description = content;
    if (prop === 'og:image') og.image = content;
    if (prop === 'og:type') og.type = content;
    if (prop === 'og:url') og.url = content;
    if (prop === 'og:image:width') og.imageWidth = parseInt(content, 10);
    if (prop === 'og:image:height') og.imageHeight = parseInt(content, 10);
    if (prop === 'og:image:alt') og.imageAlt = content;
  });

  document.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
    const name = meta.getAttribute('name');
    if (name === 'twitter:card') twitter.card = meta.content;
    if (name === 'twitter:title') twitter.title = meta.content;
    if (name === 'twitter:description') twitter.description = meta.content;
    if (name === 'twitter:image') twitter.image = meta.content;
  });

  const descMeta = document.querySelector('meta[name="description"]');
  standard.description = descMeta?.content;
  const keywordsMeta = document.querySelector('meta[name="keywords"]');
  standard.keywords = keywordsMeta?.content;

  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  const robotsMeta = document.querySelector('meta[name="robots"]');

  return {
    openGraph: {
      ...og,
      metrics: {
        hasTitle: !!og.title,
        titleLength: og.title?.length || 0,
        hasDescription: !!og.description,
        descriptionLength: og.description?.length || 0,
        hasImage: !!og.image,
        hasImageDimensions: !!(og.imageWidth && og.imageHeight),
        isProductType: og.type === 'product'
      }
    },
    twitterCards: {
      ...twitter,
      metrics: {
        hasCard: !!twitter.card,
        isLargeImage: twitter.card === 'summary_large_image',
        hasImage: !!twitter.image
      }
    },
    standard: {
      ...standard,
      metrics: {
        hasDescription: !!standard.description,
        descriptionLength: standard.description?.length || 0
      }
    },
    canonical: {
      url: canonical,
      present: !!canonical,
      matchesCurrentUrl: canonical ? normalizeUrl(canonical) === normalizeUrl(window.location.href) : null,
      isProductCanonical: canonical ? isCanonicalForCurrentUrl(canonical, window.location.href) : false
    },
    robots: {
      content: robotsMeta?.content,
      noindex: (robotsMeta?.content || '').toLowerCase().includes('noindex')
      // Note: x-robots-tag HTTP headers and robots.txt blocking cannot be detected from
      // a content script — those signals are handled separately via service worker fetches
      // in the AI Discoverability category (networkData.robots.blockedCrawlers).
    },
    technical: {
      isHttps: window.location.protocol === 'https:',
      hasLang: !!document.documentElement.lang,
      lang: document.documentElement.lang || null
    },
    hreflang: extractHreflang()
  };
}

function extractHreflang() {
  const tags = document.querySelectorAll('link[rel="alternate"][hreflang]');
  if (tags.length === 0) return { present: false, languages: [], count: 0 };

  const languages = [];
  tags.forEach(tag => {
    const lang = tag.getAttribute('hreflang');
    const href = tag.href;
    if (lang) languages.push({ lang, href });
  });

  return {
    present: languages.length > 0,
    languages,
    count: languages.length
  };
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    return (parsed.origin + parsed.pathname).toLowerCase().replace(/\/$/, '').replace('://www.', '://');
  } catch { return url.toLowerCase().replace(/\/$/, ''); }
}

/**
 * Detect if a canonical URL is a legitimate parent canonical for the current URL.
 * Handles patterns like Shopify's /collections/X/products/Y → canonical: /products/Y
 * @param {string} canonicalUrl - The canonical URL from the <link rel="canonical"> tag
 * @param {string} currentUrl - The current page URL
 * @returns {boolean} True if canonical is a valid parent/product URL for the current path
 */
function isCanonicalForCurrentUrl(canonicalUrl, currentUrl) {
  try {
    const canon = new URL(canonicalUrl);
    const current = new URL(currentUrl);
    // Must be same hostname (ignoring www prefix)
    if (canon.hostname.replace(/^www\./, '') !== current.hostname.replace(/^www\./, '')) return false;
    const canonPath = canon.pathname.toLowerCase().replace(/\/$/, '');
    const currentPath = current.pathname.toLowerCase().replace(/\/$/, '');
    if (canonPath === currentPath) return false; // Already handled by matchesCurrentUrl
    // Current path ends with the canonical path (e.g., /collections/cat/products/slug → /products/slug)
    return currentPath.endsWith(canonPath);
  } catch { return false; }
}

// ==========================================
// CONTENT QUALITY EXTRACTOR
// ==========================================

function extractContentQuality() {
  const mainContent = getMainContentArea();
  const productText = getProductContentText(mainContent);

  return {
    description: analyzeDescription(mainContent),
    specifications: extractSpecifications(),
    features: extractFeatures(),
    faq: extractFaqContent(),
    productDetails: extractProductDetails(productText),
    textMetrics: analyzeTextMetrics(mainContent)
  };
}

/**
 * Get text content scoped to product areas, excluding site chrome (nav, header, footer, promos).
 * Falls back to body text if no product content area is found.
 * @param {Element} mainContent - The main content area element
 * @returns {string} Text content for product detail extraction
 */
function getProductContentText(mainContent) {
  // If mainContent is already scoped (not document.body), use it directly
  if (mainContent && mainContent !== document.body) {
    // Clone and strip nav/header/footer/promo elements from the content
    const clone = mainContent.cloneNode(true);
    clone.querySelectorAll('nav, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"]').forEach(el => el.remove());
    const text = clone.innerText;
    if (text.length > 200) return text;
  }

  // Try product-specific selectors that are likely to contain only product content
  const productSelectors = [
    '.product-detail', '.product-details', '.pdp-content', '#product-detail',
    '.product-single', '.product__info', '.product-page', '[data-product]',
    '.product-single__content-wrapper', '.product__main', '.pdp-main',
    '#pdp-content', '.product-content', '[itemtype*="Product"]'
  ];
  for (const sel of productSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el && el.innerText.length > 200) {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('nav, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"]').forEach(n => n.remove());
        return clone.innerText;
      }
    } catch (e) { /* skip invalid selectors */ }
  }

  // Last resort: use body text but strip common chrome elements
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll(
    'nav, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"], ' +
    '.site-header, .site-footer, .site-nav, .main-nav, .header-nav, .footer-nav, ' +
    '#header, #footer, #nav, #site-header, #site-footer, ' +
    '.announcement-bar, .cookie-banner, .popup, .modal, ' +
    '.cart-drawer, .mini-cart, .shopping-cart'
  ).forEach(el => el.remove());
  return clone.innerText;
}

function getMainContentArea() {
  const selectors = ['main', '[role="main"]', 'article', '.product-detail', '.product-details', '.pdp-content', '#product-detail'];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.length > 200) return el;
  }
  return document.body;
}

function analyzeDescription(content) {
  const selectors = [
    '.product-description', '.description', '#description', '[data-component="description"]',
    // Shopify selectors
    '.product-single__description', '.product__description', '.rte', '.rte-formatter',
    // Additional Shopify theme patterns
    '.product__info-description', '.product-single__content', '.product__content',
    '[data-product-description]', '#tab-description', '.tab-content[data-tab="description"]',
    '.product-details__description', '.accordion__content', '.collapsible-content',
    // Attribute-based fallbacks
    '[class*="product-description"]', '[class*="product_description"]',
    '[id*="product-description"]', '[id*="ProductDescription"]'
  ];
  let el = null;
  let cssHiddenEl = null; // DOM match where content is CSS-hidden (display:none etc.)
  for (const sel of selectors) {
    try {
      const candidate = document.querySelector(sel);
      if (!candidate) continue;
      if (candidate.innerText.trim().length > 50) {
        el = candidate;
        break;
      }
      // Content present in DOM but hidden via CSS — keep as fallback
      if (!cssHiddenEl && candidate.textContent.trim().length > 50) {
        cssHiddenEl = candidate;
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }

  // Promote CSS-hidden element when no visible match found
  if (!el && cssHiddenEl) el = cssHiddenEl;

  // Prefer innerText (respects CSS rendering); fall back to textContent for hidden elements
  let text = el ? (el.innerText.trim().length > 50 ? el.innerText.trim() : el.textContent.trim()) : '';
  let source = el ? 'dom' : null;

  // Fallback: Extract description from JSON-LD structured data when no DOM element found
  // or DOM text is shorter than 20 words (schema typically has the full product description)
  const domWordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  if (!el || domWordCount < 20) {
    const schemaDescription = extractDescriptionFromSchema();
    if (schemaDescription && schemaDescription.length > text.length) {
      text = schemaDescription;
      source = 'schema';
    }
  }

  const words = text.split(/\s+/).filter(w => w.length > 0);

  return {
    found: !!el || text.length > 0,
    source: source,
    wordCount: words.length,
    hasEmotionalLanguage: /amazing|beautiful|perfect|love|best|incredible|stunning/i.test(text),
    hasBenefitStatements: /you (can|will|get)|helps? (you|your)|designed (for|to)/i.test(text),
    hasTechnicalTerms: /\d+\s*(mm|cm|in|kg|lb|mAh|GB|MHz|GHz)/i.test(text),
    lengthScore: words.length < 100 ? Math.round((words.length / 100) * 50) :
                 words.length < 200 ? 50 + Math.round(((words.length - 100) / 100) * 30) :
                 words.length < 400 ? 80 + Math.round(((words.length - 200) / 200) * 20) : 100
  };
}

/**
 * Extract description from JSON-LD Product/ProductGroup schema as fallback
 * Uses cached JSON-LD data for performance
 * @returns {string|null} Description text or null
 */
function extractDescriptionFromSchema() {
  for (const { item } of iterateSchemaItems(['product', 'productgroup'])) {
    if (item.description && typeof item.description === 'string') {
      // Use textarea for safe HTML entity decoding (doesn't execute scripts)
      const textarea = document.createElement('textarea');
      textarea.innerHTML = item.description;
      // Get decoded text, then strip any remaining HTML tags
      const decoded = textarea.value;
      return decoded.replace(/<[^>]*>/g, '').trim();
    }
  }

  return null;
}

function extractSpecifications() {
  const specs = [];
  const selectors = [
    '.specifications', '.specs', '.product-specs', '.technical-specs', '#specifications',
    // Shopify selectors
    '.product__specs', '.product-single__specs', '.product-specifications',
    '.product-attributes', '.product-details', '.product-meta',
    '[data-product-specs]', '[data-specifications]',
    // Attribute-based fallbacks
    '[class*="specification"]', '[class*="specs"]', '[class*="attributes"]'
  ];

  for (const sel of selectors) {
    try {
      const container = document.querySelector(sel);
      if (container) {
        extractSpecsFromContainer(container, specs);
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }

  // Fallback: Look for spec-like lists in content areas (li with "Label: Value" pattern)
  if (specs.length === 0) {
    const contentSelectors = [
      '.product-single__description', '.product__description', '.product-description',
      '.rte', '.rte-formatter', '.product__content', '.product-single__content',
      '.description', '#description', 'main', '[role="main"]', 'article'
    ];
    for (const sel of contentSelectors) {
      try {
        const containers = document.querySelectorAll(sel);
        containers.forEach(container => {
          if (specs.length === 0) {
            extractSpecsFromListItems(container, specs);
          }
        });
        if (specs.length > 0) break;
      } catch (e) {
        // Invalid selector, skip
      }
    }
  }

  // Final fallback: Search entire body for spec-like list items
  if (specs.length === 0) {
    extractSpecsFromListItems(document.body, specs);
  }

  // Fallback: Extract from JSON-LD additionalProperty if still no specs
  if (specs.length === 0) {
    extractSpecsFromSchema(specs);
  }

  let source = specs.length > 0 ? (specs[0].source || 'dom') : null;

  return {
    found: specs.length > 0,
    source: source,
    count: specs.length,
    items: specs.slice(0, 30),
    countScore: specs.length < 5 ? Math.round((specs.length / 5) * 25) :
                specs.length < 10 ? 25 + Math.round(((specs.length - 5) / 5) * 25) :
                specs.length < 20 ? 50 + Math.round(((specs.length - 10) / 10) * 30) : 100
  };
}

function extractSpecsFromContainer(container, specs) {
  // Extract from tables
  container.querySelectorAll('tr').forEach(row => {
    const cells = row.querySelectorAll('td, th');
    if (cells.length >= 2) {
      const name = cells[0].textContent.trim();
      const value = cells[1].textContent.trim();
      if (name && value && name.length < 100 && value.length < 200) {
        specs.push({ name, value, hasUnit: hasUnitPattern(value) });
      }
    }
  });

  // Extract from definition lists
  container.querySelectorAll('dt').forEach(dt => {
    const dd = dt.nextElementSibling;
    if (dd?.tagName === 'DD') {
      const name = dt.textContent.trim();
      const value = dd.textContent.trim();
      if (name && value) {
        specs.push({ name, value, hasUnit: hasUnitPattern(value) });
      }
    }
  });

  // Extract from list items with "Label: Value" pattern
  extractSpecsFromListItems(container, specs);
}

function extractSpecsFromListItems(container, specs) {
  container.querySelectorAll('li').forEach(li => {
    // Skip list items that are likely navigation or too short
    const fullText = li.textContent.trim().replace(/\s+/g, ' ');
    if (fullText.length < 5 || fullText.length > 300) return;

    // Pattern 1: <strong>Label:</strong> Value or <b>Label:</b> Value
    const strong = li.querySelector('strong, b');
    if (strong) {
      const labelText = strong.textContent.trim();
      const label = labelText.replace(/:$/, '').trim();
      // Get value by removing the label from full text
      let value = fullText;
      const labelIndex = value.indexOf(labelText);
      if (labelIndex !== -1) {
        value = value.substring(labelIndex + labelText.length);
      }
      value = value.trim().replace(/^:\s*/, '').trim();

      if (label && value && label.length >= 2 && label.length < 50 && value.length >= 1 && value.length < 200) {
        // Avoid adding duplicates
        if (!specs.some(s => s.name === label)) {
          specs.push({ name: label, value, hasUnit: hasUnitPattern(value) });
        }
        return;
      }
    }

    // Pattern 2: "Label: Value" in plain text (colon-separated)
    const colonMatch = fullText.match(/^([^:]{2,40}):\s*(.{1,150})$/);
    if (colonMatch) {
      const name = colonMatch[1].trim();
      const value = colonMatch[2].trim();
      if (name && value && !specs.some(s => s.name === name)) {
        specs.push({ name, value, hasUnit: hasUnitPattern(value) });
      }
    }
  });
}

function extractSpecsFromSchema(specs) {
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      const data = JSON.parse(script.textContent.trim());
      const items = data['@graph'] || [data];
      items.forEach(item => {
        if (!item) return;
        const type = (Array.isArray(item['@type']) ? item['@type'][0] : item['@type'] || '').toLowerCase();
        if (type === 'product' || type === 'productgroup') {
          // Extract from additionalProperty
          if (item.additionalProperty && Array.isArray(item.additionalProperty)) {
            item.additionalProperty.forEach(prop => {
              if (prop.name && prop.value) {
                specs.push({ name: prop.name, value: String(prop.value), hasUnit: hasUnitPattern(String(prop.value)), source: 'schema' });
              }
            });
          }
          // Extract common spec fields
          const specFields = ['weight', 'width', 'height', 'depth', 'color', 'material', 'model', 'mpn', 'gtin', 'gtin13', 'gtin14', 'isbn'];
          specFields.forEach(field => {
            if (item[field]) {
              const value = typeof item[field] === 'object' ? (item[field].value || JSON.stringify(item[field])) : String(item[field]);
              specs.push({ name: field.charAt(0).toUpperCase() + field.slice(1), value, hasUnit: hasUnitPattern(value), source: 'schema' });
            }
          });
        }
      });
    } catch (e) {
      // Invalid JSON, skip
    }
  });
}

function hasUnitPattern(text) {
  return /\d+\s*(mm|cm|m|in|inch|"|ft|kg|lb|lbs|oz|g|ml|L|gal|gallon|mAh|GB|TB|MHz|GHz|W|V|A|hp|HP|GPH|GPM|PSI|°F|°C|ft³|CFM)/i.test(text);
}

function extractFeatures() {
  const features = [];
  const selectors = [
    '.features', '.product-features', '.key-features', '.highlights', '#features',
    // Shopify selectors
    '.product__features', '.product-single__features', '.feature-list',
    '[data-product-features]', '[data-features]',
    // Walmart selectors
    '.about-product', '.about-item', '.product-about', '[data-testid="product-about"]',
    '.about-desc', '.about-description', '#about-product',
    // Canadian Tire, other major retailers
    '.product-highlights', '.product-info__highlights', '.pdp-highlights',
    '[class*="aboutProduct"]', '[class*="about-product"]',
    // WooCommerce selectors
    '.woocommerce-product-details__short-description',
    '.woocommerce-Tabs-panel--description', '#tab-description',
    // Attribute-based fallbacks
    '[class*="feature"]', '[class*="benefit"]', '[class*="highlight"]'
  ];

  for (const sel of selectors) {
    try {
      const container = document.querySelector(sel);
      if (container) {
        extractFeaturesFromContainer(container, features);
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }

  // Fallback: Look for feature lists in content areas
  if (features.length === 0) {
    // Find lists that follow "feature" or "benefit" headings
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b');
    headings.forEach(heading => {
      const text = heading.textContent.toLowerCase();
      if (text.includes('feature') || text.includes('benefit') || text.includes('highlight') || text.includes('why choose') || text.includes('about this')) {
        // Look for the next ul/ol sibling or within parent
        let list = heading.nextElementSibling;
        while (list && !['UL', 'OL'].includes(list.tagName)) {
          list = list.nextElementSibling;
        }
        if (list) {
          extractFeaturesFromContainer(list, features);
        }
        // Also check parent for ul
        const parent = heading.closest('div, section, article');
        if (parent && features.length === 0) {
          const ul = parent.querySelector('ul, ol');
          if (ul) extractFeaturesFromContainer(ul, features);
        }
      }
    });
  }

  // Fallback: Scan product content area for structurally feature-like lists
  if (features.length === 0) {
    const contentArea = getMainContentArea();
    const lists = contentArea.querySelectorAll('ul, ol');
    let bestList = null;
    let bestCount = 0;

    lists.forEach(list => {
      // Skip lists inside nav, header, footer, sidebar, cart drawers
      if (list.closest('nav, header, footer, [role="navigation"], aside, .sidebar, .cart-drawer, .mini-cart')) return;

      const directLis = Array.from(list.children).filter(c => c.tagName === 'LI');
      // Qualifying items: 15-500 char text length
      const qualifying = directLis.filter(li => {
        const len = li.textContent.trim().replace(/\s+/g, ' ').length;
        return len >= 15 && len <= 500;
      });

      if (qualifying.length < 3) return;

      // Average text length must be >= 25 chars (filters terse nav items)
      const avgLen = qualifying.reduce((sum, li) => sum + li.textContent.trim().replace(/\s+/g, ' ').length, 0) / qualifying.length;
      if (avgLen < 25) return;

      // <=50% of qualifying items should be link-wrapped (filters nav menus)
      const linkWrapped = qualifying.filter(li => {
        const anchor = li.querySelector('a');
        return anchor && anchor.textContent.trim().length >= li.textContent.trim().length * 0.8;
      }).length;
      if (linkWrapped > qualifying.length * 0.5) return;

      if (qualifying.length > bestCount) {
        bestCount = qualifying.length;
        bestList = list;
      }
    });

    if (bestList) {
      extractFeaturesFromContainer(bestList, features);
    }
  }

  // Fallback: Look for feature-like lists in description area (items with dash/em-dash pattern, not colon pattern)
  if (features.length === 0) {
    const contentSelectors = [
      '.product-single__description', '.product__description', '.product-description',
      '.rte', '.description', '#description',
      '.about-product', '.about-item', '.product-about', '.about-desc',
      'main', 'article'
    ];
    for (const sel of contentSelectors) {
      try {
        const container = document.querySelector(sel);
        if (container) {
          extractFeatureLikeItems(container, features);
          if (features.length > 0) break;
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }
  }

  // Fallback: Detect H2+paragraph feature sections (e.g. Arc'teryx technology callouts)
  // Uses textContent so CSS-hidden content (display:none) is also captured.
  if (features.length === 0) {
    const contentArea = getMainContentArea();
    const skipPatterns = /review|rating|customer|shipping|return|policy|cart|checkout|account|sign in|login|newsletter|subscribe/i;
    contentArea.querySelectorAll('h2').forEach(h2 => {
      if (h2.closest('nav, header, footer, [role="navigation"], aside')) return;
      const headingText = h2.textContent.trim();
      if (!headingText || headingText.length < 3 || headingText.length > 80 || skipPatterns.test(headingText)) return;

      // Find first sibling paragraph with substantive text
      let sibling = h2.nextElementSibling;
      let descText = '';
      while (sibling && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(sibling.tagName)) {
        if (sibling.tagName === 'P' || sibling.tagName === 'DIV') {
          const t = sibling.textContent.trim();
          if (t.length > 30) { descText = t; break; }
        }
        sibling = sibling.nextElementSibling;
      }

      // Also check within parent container (e.g. <section><h2>…</h2><p>…</p></section>)
      if (!descText) {
        const parent = h2.closest('section, [class*="feature"], [class*="callout"], [class*="benefit"]');
        if (parent && parent !== contentArea) {
          const p = parent.querySelector('p');
          if (p) descText = p.textContent.trim();
        }
      }

      if (descText.length > 30) {
        const featureText = `${headingText}: ${descText.slice(0, 300)}`;
        if (!features.some(f => f.text === featureText)) {
          features.push({ text: featureText });
        }
      }
    });
  }

  let source = features.length > 0 ? (features[0].source || 'dom') : null;

  return {
    found: features.length > 0,
    source: source,
    count: features.length,
    items: features.slice(0, 15),
    countScore: features.length < 3 ? Math.round((features.length / 3) * 25) :
                features.length < 5 ? 25 + Math.round(((features.length - 3) / 2) * 25) :
                features.length < 10 ? 50 + Math.round(((features.length - 5) / 5) * 30) : 100
  };
}

function extractFeaturesFromContainer(container, features) {
  // Skip containers that are part of navigation/header/footer
  if (container.closest('nav, header, footer, [role="navigation"]')) return;

  // Skip containers that appear to be return/refund/policy sections
  // by checking nearby headings or the container's own class/id
  const policyPattern = /return|refund|exchange|shipping|policy|warranty.*(policy|terms)|terms.*(service|use|sale)/i;
  const containerId = (container.id || '') + ' ' + (container.className || '');
  if (policyPattern.test(containerId)) return;
  // Check the heading immediately preceding or enclosing this container
  const prevHeading = container.previousElementSibling;
  if (prevHeading && /^H[1-6]$/.test(prevHeading.tagName) && policyPattern.test(prevHeading.textContent)) return;
  const closestSection = container.closest('section, [class*="policy"], [class*="return"], [id*="policy"], [id*="return"]');
  if (closestSection && closestSection !== container) {
    const closestId = (closestSection.id || '') + ' ' + (closestSection.className || '');
    if (policyPattern.test(closestId)) return;
  }

  const liPolicyPattern = /\b(return|refund|exchange|shipped|shipping|delivery)\b.{0,40}(day|free|policy|within|guarantee|process)/i;
  container.querySelectorAll('li').forEach(li => {
    const text = li.textContent.trim().replace(/\s+/g, ' ');
    if (text.length > 15 && text.length < 500) {
      // Skip individual list items that look like return/shipping policy lines
      if (liPolicyPattern.test(text)) return;
      // Avoid duplicates
      if (!features.some(f => f.text === text)) {
        features.push({ text });
      }
    }
  });
}

function extractFeatureLikeItems(container, features) {
  // Look for list items that are features (not specs)
  // Features typically: have dash/em-dash, describe benefits, don't have "Label: Value" pattern
  container.querySelectorAll('li').forEach(li => {
    const text = li.textContent.trim().replace(/\s+/g, ' ');
    if (text.length < 20 || text.length > 400) return;

    // Skip if it looks like a spec (has colon with short label and value)
    if (/^[^:]{2,30}:\s*\S/.test(text)) return;

    // Check for feature patterns
    const hasStrong = li.querySelector('strong, b');
    const hasDash = /[–—-]\s/.test(text); // em-dash, en-dash, or hyphen followed by space

    // Feature pattern: <strong>Name</strong> – description
    if (hasStrong && hasDash) {
      if (!features.some(f => f.text === text)) {
        features.push({ text });
      }
      return;
    }

    // Feature pattern: starts with action verb or benefit language
    const benefitPattern = /^(enjoy|experience|get|includes?|provides?|offers?|delivers?|ensures?|features?|designed|built|made|perfect|ideal|great|easy|quick|fast|reliable|durable|powerful|efficient|compatible|adjustable|available|supports?|works|fits|comes|equipped|tested|certified|rated|approved|optimized|engineered|lightweight|heavy-duty|premium|professional)/i;
    if (benefitPattern.test(text)) {
      if (!features.some(f => f.text === text)) {
        features.push({ text });
      }
    }
  });
}

function extractFaqContent() {
  const faqs = [];
  let source = null;
  const selectors = ['.faq', '.faqs', '#faq', '.frequently-asked-questions'];

  for (const sel of selectors) {
    const container = document.querySelector(sel);
    if (container) {
      container.querySelectorAll('.question, dt, summary, [data-question]').forEach(q => {
        const answer = q.nextElementSibling || q.closest('.faq-item')?.querySelector('.answer, dd');
        if (q.textContent.trim().length > 10) {
          faqs.push({ question: q.textContent.trim(), answerLength: (answer?.textContent || '').length });
        }
      });
      if (faqs.length > 0) source = 'dom';
    }
  }

  // Fallback: Extract FAQs from FAQPage schema
  if (faqs.length === 0) {
    const schemaFaqs = extractFaqFromSchema();
    if (schemaFaqs.length > 0) {
      faqs.push(...schemaFaqs);
      source = 'schema';
    }
  }

  return {
    found: faqs.length > 0,
    source: source,
    count: faqs.length,
    items: faqs.slice(0, 10), // Include the actual FAQ items for details display
    countScore: faqs.length < 3 ? Math.round((faqs.length / 3) * 50) :
                faqs.length < 5 ? 50 + Math.round(((faqs.length - 3) / 2) * 25) : 100
  };
}

/**
 * Extract FAQs from FAQPage schema as fallback
 * @returns {Array} Array of FAQ objects
 */
function extractFaqFromSchema() {
  const faqs = [];

  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      const data = JSON.parse(script.textContent.trim());
      const items = data['@graph'] || [data];
      items.forEach(item => {
        if (!item) return;
        const type = (Array.isArray(item['@type']) ? item['@type'][0] : item['@type'] || '').toLowerCase();
        if (type === 'faqpage' && item.mainEntity) {
          const questions = Array.isArray(item.mainEntity) ? item.mainEntity : [item.mainEntity];
          questions.forEach(q => {
            if (q['@type'] === 'Question' && q.name) {
              faqs.push({
                question: q.name,
                answerLength: (q.acceptedAnswer?.text || '').length,
                source: 'schema'
              });
            }
          });
        }
      });
    } catch (e) {
      // Invalid JSON, skip
    }
  });

  return faqs;
}

function extractProductDetails(text) {
  const lower = text.toLowerCase();
  const details = {
    hasDimensions: false,
    dimensionsText: null,
    hasMaterials: false,
    materialsText: null,
    hasCareInstructions: false,
    careText: null,
    hasWarranty: false,
    warrantyText: null,
    hasCompatibility: false,
    compatibilityText: null,
    source: 'dom'
  };

  // Extract dimensions with actual matched text
  const dimensionPatterns = [
    /(\d+(?:\.\d+)?\s*(?:"|in|inch|inches|cm|mm|m|ft|feet)\s*(?:x|×)\s*\d+(?:\.\d+)?\s*(?:"|in|inch|inches|cm|mm|m|ft|feet)(?:\s*(?:x|×)\s*\d+(?:\.\d+)?\s*(?:"|in|inch|inches|cm|mm|m|ft|feet))?)/i,
    /dimensions?[:\s]+([^.\r\n]{5,50})/i,
    /((?:length|width|height|depth)[:\s]+\d+(?:\.\d+)?\s*(?:"|in|inch|cm|mm|m|ft))/i
  ];
  for (const pattern of dimensionPatterns) {
    const match = text.match(pattern);
    if (match) {
      details.hasDimensions = true;
      details.dimensionsText = match[1] ? match[1].trim().substring(0, 60) : match[0].trim().substring(0, 60);
      break;
    }
  }

  // Extract materials with actual matched text
  const materialPatterns = [
    /(?:made (?:of|from|with)|material[:\s]+|constructed (?:of|from))([^.,\r\n]{10,50})/i,
    /\b((?:100%\s+)?(?:cotton|polyester|leather|genuine leather|faux leather|metal|aluminum|aluminium|steel|stainless steel|plastic|wood|wooden|bamboo|ceramic|glass|silicone|nylon|rubber|canvas|suede|velvet|linen|silk|wool|cashmere|denim|mesh|foam|titanium|copper|brass|iron|oak|maple|walnut|pine|mahogany|teak|acrylic|polycarbonate|abs|pvc|eva|neoprene|lycra|spandex|microfiber|fleece|polyurethane|pu leather))\b/i
  ];
  for (const pattern of materialPatterns) {
    const match = text.match(pattern);
    if (match) {
      details.hasMaterials = true;
      details.materialsText = match[1] ? match[1].trim().substring(0, 50) : match[0].trim().substring(0, 50);
      break;
    }
  }

  // Extract care instructions with actual matched text
  const carePatterns = [
    /(machine wash[^.\r\n]{0,30})/i,
    /(hand wash[^.\r\n]{0,30})/i,
    /(dry clean[^.\r\n]{0,30})/i,
    /care instructions?[:\s]+([^.\r\n]{5,60})/i,
    /(wash(?:able)? (?:in|on|with)[^.\r\n]{0,30})/i,
    /(do not (?:wash|bleach|iron|tumble dry)[^.\r\n]{0,30})/i,
    /(wipe clean[^.\r\n]{0,30})/i
  ];
  for (const pattern of carePatterns) {
    const match = text.match(pattern);
    if (match) {
      details.hasCareInstructions = true;
      details.careText = match[1] ? match[1].trim().substring(0, 60) : match[0].trim().substring(0, 60);
      break;
    }
  }

  // Extract warranty with actual matched text (context-aware to avoid false positives)
  const warrantyPatterns = [
    /(\d+[\s-]*(?:year|month|day|yr|mo)[\s-]*(?:limited\s+)?(?:warranty|guarantee))/i,
    /((?:limited\s+)?(?:lifetime|full)\s+(?:warranty|guarantee))/i,
    /(?:warranty|guarantee)[:\s]+([^.\r\n]{5,50})/i,
    /(warranted? (?:for|against)[^.\r\n]{0,40})/i,
    /((?:manufacturer'?s?|factory)\s+(?:warranty|guarantee)[^.\r\n]{0,30})/i
  ];
  // Negative patterns to avoid false positives
  const warrantyNegative = /no warranty|without warranty|warranty (?:not|does not)|void(?:s|ed)? (?:the\s+)?warranty/i;

  if (!warrantyNegative.test(lower)) {
    for (const pattern of warrantyPatterns) {
      const match = text.match(pattern);
      if (match) {
        details.hasWarranty = true;
        details.warrantyText = match[1] ? match[1].trim().substring(0, 50) : match[0].trim().substring(0, 50);
        break;
      }
    }
  }

  // Extract compatibility with actual matched text
  const compatPatterns = [
    /compatible (?:with|for)[:\s]*([^.\r\n]{5,80})/i,
    /works with[:\s]*([^.\r\n]{5,80})/i,
    /fits[:\s]*([^.\r\n]{5,80})/i,
    /designed for[:\s]*([^.\r\n]{5,80})/i,
    /(?:supports?|for use with)[:\s]*([^.\r\n]{5,80})/i
  ];
  for (const pattern of compatPatterns) {
    const match = text.match(pattern);
    if (match) {
      details.hasCompatibility = true;
      details.compatibilityText = match[1] ? match[1].trim().substring(0, 80) : match[0].trim().substring(0, 80);
      break;
    }
  }

  // Fallback: Extract from Product schema additionalProperty
  extractProductDetailsFromSchema(details);

  return details;
}

/**
 * Extract product details from Product schema additionalProperty as fallback
 * @param {Object} details - The details object to populate
 */
function extractProductDetailsFromSchema(details) {
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      const data = JSON.parse(script.textContent.trim());
      const items = data['@graph'] || [data];
      items.forEach(item => {
        if (!item) return;
        const type = (Array.isArray(item['@type']) ? item['@type'][0] : item['@type'] || '').toLowerCase();
        if (type === 'product' || type === 'productgroup') {
          // Check direct properties
          if (!details.hasDimensions) {
            const dims = [];
            if (item.width) dims.push(`W: ${formatSchemaValue(item.width)}`);
            if (item.height) dims.push(`H: ${formatSchemaValue(item.height)}`);
            if (item.depth) dims.push(`D: ${formatSchemaValue(item.depth)}`);
            if (dims.length > 0) {
              details.hasDimensions = true;
              details.dimensionsText = dims.join(', ');
              details.source = 'schema';
            }
          }
          if (!details.hasMaterials && item.material) {
            details.hasMaterials = true;
            details.materialsText = formatSchemaValue(item.material).substring(0, 50);
            details.source = 'schema';
          }
          if (!details.hasWarranty && item.warranty) {
            details.hasWarranty = true;
            details.warrantyText = formatSchemaValue(item.warranty).substring(0, 50);
            details.source = 'schema';
          }

          // Check additionalProperty array
          if (item.additionalProperty && Array.isArray(item.additionalProperty)) {
            item.additionalProperty.forEach(prop => {
              const name = (prop.name || '').toLowerCase();
              const value = String(prop.value || '');

              if (!details.hasDimensions && /dimension|size|length|width|height|depth/i.test(name)) {
                details.hasDimensions = true;
                details.dimensionsText = `${prop.name}: ${value}`.substring(0, 60);
                details.source = 'schema';
              }
              if (!details.hasMaterials && /material|fabric|composition/i.test(name)) {
                details.hasMaterials = true;
                details.materialsText = value.substring(0, 50);
                details.source = 'schema';
              }
              if (!details.hasCareInstructions && /care|wash|clean/i.test(name)) {
                details.hasCareInstructions = true;
                details.careText = value.substring(0, 60);
                details.source = 'schema';
              }
              if (!details.hasWarranty && /warranty|guarantee/i.test(name)) {
                details.hasWarranty = true;
                details.warrantyText = value.substring(0, 50);
                details.source = 'schema';
              }
              if (!details.hasCompatibility && /compatible|compatibility|fits|works with/i.test(name)) {
                details.hasCompatibility = true;
                details.compatibilityText = value.substring(0, 80);
                details.source = 'schema';
              }
            });
          }
        }
      });
    } catch (e) {
      // Invalid JSON, skip
    }
  });
}

/**
 * Format a schema value (handles QuantitativeValue objects)
 * @param {any} value - The schema value
 * @returns {string} Formatted string
 */
function formatSchemaValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value.value !== undefined) {
    return value.unitCode ? `${value.value} ${value.unitCode}` : String(value.value);
  }
  return JSON.stringify(value);
}

function analyzeTextMetrics(content) {
  const text = content?.innerText || '';
  // Filter out spec-like tokens (e.g., "250W", "IP67", "12V") from word count
  const allWords = text.split(/\s+/).filter(w => w.length > 0);
  const proseWords = allWords.filter(w => !/^\d+[A-Za-z]{0,3}$/.test(w) && !/^[A-Z]{2,}\d+/.test(w));
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);

  // Improved readability: combine sentence length and syllable complexity
  let readabilityScore = 60;
  if (proseWords.length >= 20 && sentences.length > 0) {
    const avgWordsPerSentence = proseWords.length / sentences.length;
    // Approximate syllable count: count vowel clusters per word
    let totalSyllables = 0;
    for (const w of proseWords) {
      const syllables = w.toLowerCase().replace(/e$/, '').match(/[aeiouy]+/g);
      totalSyllables += syllables ? Math.max(1, syllables.length) : 1;
    }
    const avgSyllablesPerWord = totalSyllables / proseWords.length;

    // Simplified Flesch Reading Ease: 206.835 - 1.015 * ASL - 84.6 * ASW
    // Scaled to 0-100 where higher is more readable
    const flesch = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    readabilityScore = Math.max(0, Math.min(100, flesch));
  } else if (proseWords.length < 20) {
    // Too little text to measure reliably — give neutral score
    readabilityScore = 50;
  }

  return {
    totalWords: allWords.length,
    totalSentences: sentences.length,
    readabilityScore: Math.round(readabilityScore)
  };
}

// ==========================================
// CONTENT STRUCTURE EXTRACTOR
// ==========================================

function extractContentStructure() {
  return {
    headings: analyzeHeadings(),
    semanticHTML: analyzeSemanticHTML(),
    contentRatio: calculateContentRatio(),
    tables: analyzeTables(),
    lists: analyzeLists(),
    accessibility: analyzeAccessibility(),
    images: analyzeImages(),
    jsDependency: assessJSDependency()
  };
}

function analyzeHeadings() {
  const headings = {};
  for (let i = 1; i <= 6; i++) {
    const elements = document.querySelectorAll(`h${i}`);
    const texts = Array.from(elements).map(el => el.textContent.trim()).slice(0, 5);
    // For H1, count only non-empty elements to avoid false "Multiple H1s" from render placeholders
    const count = i === 1 ? texts.filter(t => t.length > 0).length : elements.length;
    headings[`h${i}`] = { count, texts };
  }

  const issues = [];
  if (headings.h1.count === 0) issues.push('Missing H1');
  if (headings.h1.count > 1) issues.push('Multiple H1s');

  return {
    ...headings,
    hasH1: headings.h1.count > 0,
    hasSingleH1: headings.h1.count === 1,
    hierarchyIssues: issues,
    hierarchyValid: issues.length === 0
  };
}

function analyzeSemanticHTML() {
  const counts = {
    main: document.querySelectorAll('main').length,
    article: document.querySelectorAll('article').length,
    section: document.querySelectorAll('section').length,
    aside: document.querySelectorAll('aside').length,
    nav: document.querySelectorAll('nav').length,
    header: document.querySelectorAll('header').length,
    footer: document.querySelectorAll('footer').length
  };

  let score = 0;
  if (counts.main > 0) score += 30;
  if (counts.article > 0) score += 25;
  if (counts.section > 0) score += 20;
  if (counts.header > 0) score += 10;
  if (counts.nav > 0) score += 10;

  return { elements: counts, hasMain: counts.main > 0, hasArticle: counts.article > 0, score: Math.min(100, score) };
}

function calculateContentRatio() {
  // Try progressively broader selectors for main content area
  const contentSelectors = [
    '.product-detail', '.product-details', '.pdp-content', '#product-detail',
    '.product-single', '.product__info', '.product-page', '[data-product]',
    '.product-single__content-wrapper', '.product__main', '.pdp-main',
    'article', '[role="main"]', 'main'
  ];

  let contentEl = null;
  for (const sel of contentSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el && el.innerText.length > 100) {
        contentEl = el;
        break;
      }
    } catch (e) { /* skip */ }
  }

  if (!contentEl) return { mainContentFound: false, ratio: 0.3, score: 30 };

  // Measure content text vs body text, excluding common chrome from body
  const contentText = contentEl.innerText.length;
  const bodyClone = document.body.cloneNode(true);
  bodyClone.querySelectorAll(
    'nav, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"], ' +
    '.site-header, .site-footer, .site-nav, .announcement-bar, .cookie-banner'
  ).forEach(el => el.remove());
  const bodyText = bodyClone.innerText.length;

  if (bodyText === 0) return { mainContentFound: true, ratio: 0.5, score: 50 };

  // If content element is very close to body size (e.g. <main> wraps everything),
  // re-measure by stripping chrome from within the content element too
  let ratio = contentText / bodyText;
  if (ratio > 0.9) {
    const contentClone = contentEl.cloneNode(true);
    contentClone.querySelectorAll(
      'nav, header, footer, [role="navigation"], .site-header, .site-footer'
    ).forEach(el => el.remove());
    const cleanContent = contentClone.innerText.length;
    ratio = bodyText > 0 ? cleanContent / bodyText : 0.5;
  }

  // Clamp to realistic range
  ratio = Math.min(0.95, Math.max(0.05, ratio));
  ratio = Math.round(ratio * 100) / 100;
  const score = ratio >= 0.5 ? 100 : ratio >= 0.3 ? Math.round(ratio * 200) : Math.round(ratio * 150);

  return { mainContentFound: true, ratio, score };
}

function analyzeTables() {
  const tables = document.querySelectorAll('table');
  const hasProper = Array.from(tables).some(t => t.querySelector('thead, th'));
  return { tableCount: tables.length, hasProperTables: hasProper, score: hasProper ? 100 : tables.length > 0 ? 50 : 0 };
}

function analyzeLists() {
  const ul = document.querySelectorAll('ul').length;
  const ol = document.querySelectorAll('ol').length;
  return { unorderedCount: ul, orderedCount: ol, hasProperLists: ul > 0 || ol > 0, score: (ul + ol) > 0 ? 100 : 25 };
}

function analyzeAccessibility() {
  const aria = document.querySelectorAll('[aria-label]').length;
  const roles = document.querySelectorAll('[role]').length;
  const imgs = document.querySelectorAll('img');
  const withAlt = document.querySelectorAll('img[alt]').length;

  return {
    ariaLabels: aria,
    roles,
    imageCount: imgs.length,
    imagesWithAlt: withAlt,
    altCoverage: imgs.length > 0 ? withAlt / imgs.length : 1,
    score: Math.min(100, (aria > 0 ? 30 : 0) + (roles > 0 ? 20 : 0) + (imgs.length > 0 ? Math.round((withAlt / imgs.length) * 50) : 50))
  };
}

function analyzeImages() {
  const images = document.querySelectorAll('img');
  const withAlt = Array.from(images).filter(img => img.alt && img.alt.length >= 5);
  const ogImage = document.querySelector('meta[property="og:image"]')?.content;

  // Find primary product image
  const primarySelectors = [
    // Standard patterns
    '.product-image img', '.product-photo img', '.gallery-main img', '.primary-image img',
    // Shopify patterns
    '.product-gallery__image', '.product-featured-media img', '.product__main-image',
    '.product-single__photo img', '.product-single__media img', '.product__media img',
    '.product-gallery img:first-child', '.product-images img:first-child',
    // Attribute-based fallbacks
    'img[data-product-image]', 'img[data-product-featured-media]',
    '[class*="product-gallery"] img:first-child', '[class*="product-image"] img:first-child'
  ];
  let primary = null;
  for (const sel of primarySelectors) {
    try {
      primary = document.querySelector(sel);
      if (primary) break;
    } catch (e) {
      // Invalid selector, skip
    }
  }

  // Images that have a title attribute but no alt — common misunderstanding that title substitutes for alt
  const withTitleButNoAlt = Array.from(images).filter(img => (!img.alt || img.alt.length < 5) && img.title && img.title.trim().length >= 5);

  return {
    totalCount: images.length,
    withMeaningfulAlt: withAlt.length,
    withTitleButNoAlt: withTitleButNoAlt.length,
    altCoverage: images.length > 0 ? withAlt.length / images.length : 1,
    primaryImage: primary ? { src: primary.src, alt: primary.alt, hasAlt: !!primary.alt } : null,
    ogImagePresent: !!ogImage,
    ogImageUrl: ogImage,
    score: images.length > 0 ? Math.round((withAlt.length / images.length) * 100) : 100
  };
}

function assessJSDependency() {
  // React 16 / Create React App
  const hasReact = document.querySelector('#root, [data-reactroot]') !== null;
  // Vue / Nuxt
  const hasVue = document.querySelector('[data-v-app], [data-v-]') !== null ||
                 document.getElementById('__nuxt') !== null;
  // Next.js — Pages Router uses #__next + __NEXT_DATA__; App Router uses #__next + /_next/ scripts
  const hasNextJs = document.getElementById('__next') !== null ||
                    document.querySelector('script[src*="/_next/"]') !== null;
  // Gatsby
  const hasGatsby = document.getElementById('___gatsby') !== null ||
                    document.getElementById('gatsby-focus-wrapper') !== null;
  // Angular
  const hasAngular = document.querySelector('[ng-version]') !== null;
  // styled-components — strong signal of a React/CSR app even when framework root is absent
  const hasStyledComponents = document.querySelector('style[data-styled]') !== null;
  // Remix
  const hasRemix = document.querySelector('script[src*="/_remix/"], link[href*="/_remix/"]') !== null;

  const anyFramework = hasReact || hasVue || hasNextJs || hasGatsby || hasAngular || hasRemix || hasStyledComponents;

  let frameworkDetected = null;
  if (hasNextJs) frameworkDetected = 'Next.js';
  else if (hasGatsby) frameworkDetected = 'Gatsby';
  else if (hasReact) frameworkDetected = 'React';
  else if (hasVue) frameworkDetected = 'Vue';
  else if (hasAngular) frameworkDetected = 'Angular';
  else if (hasRemix) frameworkDetected = 'Remix';
  else if (hasStyledComponents) frameworkDetected = 'React (styled-components)';

  // Check if main content lives inside a JS-managed root container
  const jsRoots = '#root, #app, #__next, #___gatsby, [data-reactroot]';
  const mainInJs = document.querySelector('main, [role="main"], article')?.closest(jsRoots);

  let dependencyLevel;
  if (mainInJs) {
    dependencyLevel = 'high';
  } else if (anyFramework) {
    dependencyLevel = 'medium';
  } else {
    dependencyLevel = 'low';
  }

  return {
    frameworkDetected,
    mainContentInJsContainer: !!mainInJs,
    dependencyLevel,
    score: dependencyLevel === 'high' ? 40 : dependencyLevel === 'medium' ? 60 : 100
  };
}

// ==========================================
// TRUST SIGNALS EXTRACTOR
// ==========================================

function extractTrustSignals() {
  return {
    reviews: extractReviewSignals(),
    brand: extractBrandSignals(),
    certifications: extractCertifications(),
    awards: extractAwards(),
    expertAttribution: detectExpertAttribution(),
    socialProof: extractSocialProof()
  };
}

function extractReviewSignals() {
  let rating = null, count = null;
  let reviews = [];
  let mostRecentDate = null;
  let reviewLengths = [];

  // From structured data (uses cached JSON-LD for performance)
  const parsedJsonLd = getParsedJsonLd();
  parsedJsonLd.forEach(({ valid, data }) => {
    if (!valid) return;
    const items = data['@graph'] || (Array.isArray(data) ? data : [data]);
    // Build @id index for resolving aggregateRating references within this block
    const idIndex = {};
    items.forEach(item => { if (item && item['@id']) idIndex[item['@id']] = item; });
    // First pass: extract rating from Product/ProductGroup (highest confidence)
    items.forEach(item => {
        if (!item) return;
        const itemType = (Array.isArray(item['@type']) ? item['@type'][0] : item['@type'] || '').toLowerCase();
        if ((itemType === 'product' || itemType === 'productgroup') && item.aggregateRating) {
          // Resolve @id reference (Shopify ProductGroup pattern: "aggregateRating": {"@id": "#reviews"})
          const ratingData = item.aggregateRating['@id']
            ? (idIndex[item.aggregateRating['@id']] || item.aggregateRating)
            : item.aggregateRating;
          const rv = parseFloat(ratingData.ratingValue);
          if (!isNaN(rv) && rating === null) {
            rating = rv;
            count = parseInt(ratingData.reviewCount, 10) || parseInt(ratingData.ratingCount, 10) || null;
          }
        }
    });
    // Second pass: fallback to standalone AggregateRating or any item with aggregateRating
    items.forEach(item => {
        if (!item) return;
        const itemType = (Array.isArray(item['@type']) ? item['@type'][0] : item['@type'] || '').toLowerCase();
        if (rating === null && item.aggregateRating) {
          const ratingData = item.aggregateRating['@id']
            ? (idIndex[item.aggregateRating['@id']] || item.aggregateRating)
            : item.aggregateRating;
          const rv = parseFloat(ratingData.ratingValue);
          if (!isNaN(rv)) {
            rating = rv;
            count = parseInt(ratingData.reviewCount, 10) || parseInt(ratingData.ratingCount, 10) || null;
          }
        }
        // Handle standalone AggregateRating items (not nested via @id reference)
        if (itemType === 'aggregaterating' && rating === null) {
          const rv = parseFloat(item.ratingValue);
          if (!isNaN(rv)) {
            rating = rv;
            count = parseInt(item.reviewCount, 10) || parseInt(item.ratingCount, 10) || null;
          }
        }
        // Handle typeless objects that look like AggregateRating (have ratingValue but no @type)
        // e.g. Costco pattern: standalone JSON-LD block with ratingValue but no @type
        if (!itemType && item.ratingValue && rating === null) {
          const rv = parseFloat(item.ratingValue);
          if (!isNaN(rv) && rv >= 0 && rv <= 5) {
            rating = rv;
            count = parseInt(item.reviewCount, 10) || parseInt(item.ratingCount, 10) || null;
          }
        }
        if ((itemType === 'product' || itemType === 'productgroup') && item.review) {
          const reviewList = Array.isArray(item.review) ? item.review : [item.review];
          reviewList.forEach(r => {
            if (r.datePublished) {
              const date = new Date(r.datePublished);
              if (!isNaN(date.getTime())) {
                if (!mostRecentDate || date > mostRecentDate) {
                  mostRecentDate = date;
                }
              }
            }
            if (r.reviewBody) {
              reviewLengths.push(r.reviewBody.length);
            }
          });
        }
        if (item['@type'] === 'Review') {
          if (item.datePublished) {
            const date = new Date(item.datePublished);
            if (!isNaN(date.getTime())) {
              if (!mostRecentDate || date > mostRecentDate) {
                mostRecentDate = date;
              }
            }
          }
          if (item.reviewBody) {
            reviewLengths.push(item.reviewBody.length);
          }
        }
      });
  });

  // Third pass: pick up review dates/body from typeless JSON-LD blocks (e.g. BigCommerce)
  // These blocks have no @type but may contain a review[] array linked via @id
  if (reviewLengths.length === 0 && !mostRecentDate) {
    for (const { valid, data } of getParsedJsonLd()) {
      if (!valid) continue;
      const blockItems = data['@graph'] ? data['@graph'] : Array.isArray(data) ? data : [data];
      for (const it of blockItems) {
        if (!it || it['@type'] || !it.review) continue;
        const reviewList = Array.isArray(it.review) ? it.review : [it.review];
        reviewList.forEach(r => {
          if (r && r.datePublished) {
            const date = new Date(r.datePublished);
            if (!isNaN(date.getTime()) && (!mostRecentDate || date > mostRecentDate)) {
              mostRecentDate = date;
            }
          }
          if (r && r.reviewBody) {
            reviewLengths.push(r.reviewBody.length);
          }
        });
      }
    }
  }

  // Fallback to DOM for rating
  if (!rating) {
    const ratingEl = document.querySelector('[itemprop="ratingValue"], .rating-value, .average-rating');
    if (ratingEl) rating = parseFloat(ratingEl.content || ratingEl.getAttribute('data-rating') || ratingEl.textContent);
  }
  // Modern WooCommerce uses aria-label="Rated X.XX out of 5" on .star-rating instead of itemprop
  if (!rating) {
    const ariaRatingEl = document.querySelector('.star-rating[aria-label], [class*="star-rating"][aria-label]');
    if (ariaRatingEl) {
      const ariaLabel = ariaRatingEl.getAttribute('aria-label') || '';
      const m = ariaLabel.match(/rated?\s*([\d.]+)\s*out\s*of/i);
      if (m) rating = parseFloat(m[1]);
    }
  }
  if (!count) {
    const countEl = document.querySelector(
      '[itemprop="reviewCount"], .review-count, .reviews-count, ' +
      // Modern WooCommerce: <span class="count"> inside .woocommerce-review-link
      '.woocommerce-product-rating .count, .woocommerce-review-link .count'
    );
    if (countEl) {
      const match = (countEl.content || countEl.textContent).match(/(\d[\d,]*)/);
      if (match) count = parseInt(match[1].replace(/,/g, ''), 10);
    }
  }
  // Last resort: parse WooCommerce review link text e.g. "(1 customer review)"
  if (!count) {
    const reviewLink = document.querySelector('.woocommerce-review-link');
    if (reviewLink) {
      const m = reviewLink.textContent.match(/(\d[\d,]*)\s*customer\s*review/i);
      if (m) count = parseInt(m[1].replace(/,/g, ''), 10);
    }
  }

  // Extract review dates from DOM if not found in schema
  if (!mostRecentDate) {
    const dateSelectors = [
      '[itemprop="datePublished"]',
      '.review-date',
      '.review-time',
      '.review-meta time',
      '.review [datetime]',
      '.review-item time',
      '.comment-date'
    ];
    for (const sel of dateSelectors) {
      const dateEls = document.querySelectorAll(sel);
      dateEls.forEach(el => {
        const dateStr = el.getAttribute('datetime') || el.getAttribute('content') || el.textContent;
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            if (!mostRecentDate || date > mostRecentDate) {
              mostRecentDate = date;
            }
          }
        }
      });
      if (mostRecentDate) break;
    }
  }

  // Extract review text lengths from DOM if not found in schema
  if (reviewLengths.length === 0) {
    const reviewTextSelectors = [
      '[itemprop="reviewBody"]',
      '.review-text',
      '.review-content',
      '.review-body',
      '.review-description',
      '.comment-text',
      '.review-message'
    ];
    for (const sel of reviewTextSelectors) {
      const textEls = document.querySelectorAll(sel);
      textEls.forEach(el => {
        const text = el.textContent.trim();
        if (text.length > 10) {
          reviewLengths.push(text.length);
        }
      });
      if (reviewLengths.length > 0) break;
    }
  }

  // Calculate average review length
  const averageReviewLength = reviewLengths.length > 0
    ? Math.round(reviewLengths.reduce((a, b) => a + b, 0) / reviewLengths.length)
    : 0;

  // Check if reviews are recent (within last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const hasRecentReviews = mostRecentDate ? mostRecentDate > sixMonthsAgo : null;

  // Format the most recent date for display
  const mostRecentDateStr = mostRecentDate
    ? mostRecentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return {
    count: count || 0,
    averageRating: rating,
    hasRating: rating !== null,
    hasReviews: count > 0,
    hasRecentReviews: hasRecentReviews,
    mostRecentDate: mostRecentDateStr,
    averageReviewLength: averageReviewLength,
    reviewsAnalyzed: reviewLengths.length,
    countScore: !count ? 0 : count < 10 ? Math.round((count / 10) * 25) :
                count < 50 ? 25 + Math.round(((count - 10) / 40) * 35) :
                count < 200 ? 60 + Math.round(((count - 50) / 150) * 25) : 100,
    ratingScore: !rating ? 0 : rating < 3 ? 25 : rating < 3.5 ? 50 : rating < 4 ? 75 : rating < 4.5 ? 90 : 100,
    depthScore: averageReviewLength < 50 ? 25 : averageReviewLength < 100 ? 50 : averageReviewLength < 200 ? 75 : 100
  };
}

function extractBrandSignals() {
  let brandName = null;

  for (const { type, item } of iterateSchemaItems()) {
    if (!item) continue;
    // Check Product/ProductGroup brand and manufacturer
    if (!brandName && (type === 'product' || type === 'productgroup')) {
      if (item.brand) brandName = extractBrandName(item.brand);
      if (!brandName && item.manufacturer) brandName = extractBrandName(item.manufacturer);
    }
    // Fallback: check standalone Organization or Brand schemas
    if (!brandName && (type === 'organization' || type === 'brand')) {
      brandName = item.name || null;
    }
    if (brandName) break;
  }

  if (!brandName) {
    const brandEl = document.querySelector('[itemprop="brand"]');
    brandName = brandEl?.content || brandEl?.textContent?.trim();
  }

  // Normalize brand name by stripping legal entity suffixes (e.g. "Unplugged Performance INC" → "Unplugged Performance")
  const normalizedBrand = brandName
    ? brandName.replace(/\s+(?:inc\.?|llc\.?|ltd\.?|corp\.?|co\.?|limited|incorporated|international)$/i, '').trim()
    : null;

  const h1 = document.querySelector('h1');
  const inH1 = h1 && normalizedBrand && h1.textContent.toLowerCase().includes(normalizedBrand.toLowerCase());
  const inTitle = normalizedBrand && document.title.toLowerCase().includes(normalizedBrand.toLowerCase());

  return {
    name: brandName,
    inH1,
    inTitle,
    clarity: !brandName ? 'missing' : (inH1 && inTitle) ? 'excellent' : (inH1 || inTitle) ? 'good' : 'present',
    score: !brandName ? 0 : 40 + (inH1 ? 30 : 0) + (inTitle ? 30 : 0)
  };
}

function extractCertifications() {
  // Use scoped product content text to avoid false positives from nav/footer/sidebar
  const text = getProductContentText(null);
  const lower = text.toLowerCase();
  const certs = [];
  let source = 'dom';

  // Context-aware certification patterns with negative lookbehind simulation
  const patterns = [
    {
      name: 'FDA Approved',
      pattern: /fda\s*(?:approved|cleared|registered)/gi,
      negative: /not\s+fda|no\s+fda|without\s+fda|pending\s+fda|awaiting\s+fda/i
    },
    {
      name: 'CE Certified',
      pattern: /ce\s*(?:mark(?:ed)?|certified|compliant)/gi,
      negative: /not\s+ce|no\s+ce|without\s+ce/i
    },
    {
      name: 'UL Listed',
      pattern: /ul\s*(?:listed|certified|recognized|approved)/gi,
      negative: /not\s+ul|no\s+ul|without\s+ul/i
    },
    {
      name: 'Energy Star',
      pattern: /energy\s*star(?:\s+(?:certified|rated|compliant))?/gi,
      negative: /not\s+energy\s*star|no\s+energy\s*star/i
    },
    {
      name: 'ISO Certified',
      pattern: /iso\s*\d{4,}(?:[-:]\d+)?(?:\s+certified)?/gi,
      negative: /not\s+iso|no\s+iso|without\s+iso/i
    },
    {
      name: 'USDA Organic',
      pattern: /usda\s*(?:certified\s+)?organic/gi,
      negative: /not\s+usda|no\s+usda|without\s+usda/i
    },
    {
      name: 'Non-GMO',
      pattern: /non[\s-]?gmo(?:\s+(?:project\s+)?verified)?/gi,
      negative: null
    },
    {
      name: 'Fair Trade',
      pattern: /fair\s*trade(?:\s+certified)?/gi,
      negative: /not\s+fair\s*trade|no\s+fair\s*trade/i
    },
    {
      name: 'Cruelty Free',
      pattern: /cruelty[\s-]?free|leaping\s+bunny/gi,
      negative: /not\s+cruelty[\s-]?free/i
    },
    {
      name: 'Vegan',
      pattern: /\bvegan(?:\s+certified)?/gi,
      negative: /not\s+vegan|non[\s-]?vegan/i
    },
    {
      name: 'Gluten Free',
      pattern: /gluten[\s-]?free(?:\s+certified)?/gi,
      negative: /not\s+gluten[\s-]?free|contains\s+gluten/i
    },
    {
      name: 'Kosher',
      pattern: /\bkosher(?:\s+certified)?/gi,
      negative: /not\s+kosher|non[\s-]?kosher/i
    },
    {
      name: 'Halal',
      pattern: /\bhalal(?:\s+certified)?/gi,
      negative: /not\s+halal|non[\s-]?halal/i
    },
    {
      name: 'FSC Certified',
      pattern: /fsc\s*(?:certified|approved)/gi,
      negative: /not\s+fsc|no\s+fsc/i
    },
    {
      name: 'GOTS Certified',
      pattern: /gots\s*(?:certified|organic)/gi,
      negative: /not\s+gots|no\s+gots/i
    },
    {
      name: 'OEKO-TEX',
      pattern: /oeko[\s-]?tex(?:\s+(?:standard|certified))?/gi,
      negative: /not\s+oeko/i
    },
    {
      name: 'B Corp',
      pattern: /\bb[\s-]?corp(?:oration)?(?:\s+certified)?/gi,
      negative: /not\s+b[\s-]?corp/i
    },
    {
      name: 'ETL Listed',
      pattern: /etl\s*(?:listed|certified)/gi,
      negative: /not\s+etl|no\s+etl/i
    },
    {
      name: 'RoHS Compliant',
      pattern: /rohs\s*(?:compliant|certified)/gi,
      negative: /not\s+rohs|no\s+rohs/i
    },
    {
      name: 'FCC Certified',
      pattern: /fcc\s*(?:certified|compliant|approved)/gi,
      negative: /not\s+fcc|no\s+fcc/i
    },
    {
      name: 'NFPA Compliant',
      pattern: /nfpa\s*(?:70e?|2112|701|1|13|25|72|\d{2,})?(?:\s+(?:compliant|certified|rated))?/gi,
      negative: /not\s+nfpa|no\s+nfpa/i
    },
    {
      name: 'ASTM Certified',
      pattern: /astm\s*(?:f\d{3,}|[a-z]\d{3,}|\d{3,})?(?:\s+(?:certified|compliant|tested|approved))?/gi,
      negative: /not\s+astm|no\s+astm/i
    },
    {
      name: 'OSHA Compliant',
      pattern: /osha(?:\s+29\s+cfr\s*[\d.]+)?(?:\s+compliant)?/gi,
      negative: /not\s+osha|no\s+osha/i
    },
    {
      name: 'ANSI Certified',
      pattern: /ansi(?:\s+z\d{2,}|\s+[a-z]\d{2,})?(?:\s+(?:certified|compliant|approved))?/gi,
      negative: /not\s+ansi|no\s+ansi/i
    },
    {
      name: 'CSA Certified',
      pattern: /csa\s*(?:certified|approved|listed|group|c22\.2)?/gi,
      negative: /not\s+csa|no\s+csa/i
    },
    {
      name: 'FMVSS Certified',
      pattern: /fmvss(?:\s+\d{3})?(?:\s+(?:certified|compliant))?/gi,
      negative: /not\s+fmvss|no\s+fmvss/i
    },
    {
      name: 'EN ISO Certified',
      pattern: /en\s+iso\s+\d{4,}(?:[-:]\d+)?(?:\s+certified)?/gi,
      negative: /not\s+en\s+iso|no\s+en\s+iso/i
    }
  ];

  patterns.forEach(({ name, pattern, negative }) => {
    // Check negative pattern first (context-aware)
    if (negative && negative.test(lower)) {
      return; // Skip - found negative context
    }

    const match = text.match(pattern);
    if (match) {
      certs.push({
        name: name,
        matched: match[0].trim(), // Store what was actually matched
        source: 'dom'
      });
    }
  });

  // Fallback: Check Product schema for certifications
  const schemaCerts = extractCertificationsFromSchema();
  if (schemaCerts.length > 0) {
    schemaCerts.forEach(cert => {
      // Avoid duplicates
      if (!certs.some(c => c.name.toLowerCase() === cert.name.toLowerCase())) {
        certs.push(cert);
        source = 'schema';
      }
    });
  }

  return {
    found: certs.length > 0,
    count: certs.length,
    items: certs.map(c => c.name), // Backwards compatible
    details: certs, // Full details with matched text
    source: certs.length > 0 ? (certs.some(c => c.source === 'schema') ? 'schema' : 'dom') : null,
    score: certs.length > 0 ? Math.min(100, 50 + certs.length * 15) : 0
  };
}

/**
 * Extract certifications from Product schema
 * @returns {Array} Array of certification objects
 */
function extractCertificationsFromSchema() {
  const certs = [];

  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      const data = JSON.parse(script.textContent.trim());
      const items = data['@graph'] || [data];
      items.forEach(item => {
        if (!item) return;
        const type = (Array.isArray(item['@type']) ? item['@type'][0] : item['@type'] || '').toLowerCase();

        if (type === 'product' || type === 'productgroup') {
          // Check certification field (schema.org spec)
          if (item.certification) {
            const certifications = Array.isArray(item.certification) ? item.certification : [item.certification];
            certifications.forEach(cert => {
              const certName = cert.name || cert.certificationIdentification || cert;
              if (certName && typeof certName === 'string') {
                certs.push({ name: certName, matched: certName, source: 'schema' });
              }
            });
          }

          // Check additionalProperty for certification keywords
          if (item.additionalProperty && Array.isArray(item.additionalProperty)) {
            item.additionalProperty.forEach(prop => {
              const name = (prop.name || '').toLowerCase();
              const value = String(prop.value || '');

              if (/certification|certified|compliance|compliant/i.test(name) ||
                  /certification|certified/i.test(value)) {
                certs.push({
                  name: value || prop.name,
                  matched: `${prop.name}: ${value}`,
                  source: 'schema'
                });
              }
            });
          }
        }
      });
    } catch (e) {
      // Invalid JSON, skip
    }
  });

  return certs;
}

function extractAwards() {
  const text = document.body.innerText;
  const awards = [];
  let source = 'dom';

  // Award patterns with actual text capture
  const patterns = [
    { name: 'Award Winner', pattern: /(?:award[\s-]?winner|won\s+(?:the\s+)?[\w\s]+award|received\s+(?:the\s+)?[\w\s]+award)/gi },
    { name: 'Best of Year', pattern: /best\s+of\s+\d{4}/gi },
    { name: "Editor's Choice", pattern: /editor'?s?\s*choice(?:\s+award)?/gi },
    { name: 'Best Seller', pattern: /(?:#?\d+\s+)?best[\s-]?seller/gi },
    { name: 'Top Rated', pattern: /top[\s-]?rated(?:\s+\d{4})?/gi },
    { name: 'Product of the Year', pattern: /product\s+of\s+the\s+year/gi },
    { name: 'Innovation Award', pattern: /innovation\s+award/gi },
    { name: 'Design Award', pattern: /(?:red\s+dot|if|good\s+)?design\s+award/gi },
    { name: "People's Choice", pattern: /people'?s?\s*choice(?:\s+award)?/gi },
    { name: 'Gold Award', pattern: /(?:gold|silver|bronze)\s+(?:medal|award)/gi },
    { name: 'Top Pick', pattern: /top\s+pick(?:\s+\d{4})?/gi },
    { name: 'Recommended', pattern: /(?:highly\s+)?recommended\s+by\s+[\w\s]+/gi },
    { name: 'Certified Best', pattern: /certified\s+(?:best|top)/gi },
    { name: 'Critics Choice', pattern: /critics?\s*choice(?:\s+award)?/gi },
    { name: 'Consumer Choice', pattern: /consumer\s+choice(?:\s+award)?/gi }
  ];

  patterns.forEach(({ name, pattern }) => {
    const match = text.match(pattern);
    if (match) {
      awards.push({
        name: name,
        matched: match[0].trim().substring(0, 50), // Store what was actually matched
        source: 'dom'
      });
    }
  });

  // Fallback: Check Product schema for awards
  const schemaAwards = extractAwardsFromSchema();
  if (schemaAwards.length > 0) {
    schemaAwards.forEach(award => {
      // Avoid duplicates
      if (!awards.some(a => a.name.toLowerCase() === award.name.toLowerCase())) {
        awards.push(award);
        source = 'schema';
      }
    });
  }

  return {
    found: awards.length > 0,
    count: awards.length,
    items: awards.map(a => a.matched || a.name), // Show actual matched text
    details: awards, // Full details
    source: awards.length > 0 ? (awards.some(a => a.source === 'schema') ? 'schema' : 'dom') : null,
    score: awards.length > 0 ? Math.min(100, 40 + awards.length * 20) : 0
  };
}

/**
 * Extract awards from Product schema
 * @returns {Array} Array of award objects
 */
function extractAwardsFromSchema() {
  const awards = [];

  for (const { type, item } of iterateSchemaItems()) {
    if (!item) continue;

    if (type === 'product' || type === 'productgroup') {
      // Check award field (schema.org spec)
      if (item.award) {
        const awardList = Array.isArray(item.award) ? item.award : [item.award];
        awardList.forEach(award => {
          if (typeof award === 'string' && award.length > 0) {
            awards.push({ name: award, matched: award, source: 'schema' });
          }
        });
      }

      // Check additionalProperty for award keywords
      if (item.additionalProperty && Array.isArray(item.additionalProperty)) {
        item.additionalProperty.forEach(prop => {
          const name = (prop.name || '').toLowerCase();
          const value = String(prop.value || '');

          if (/award|recognition|accolade/i.test(name)) {
            awards.push({
              name: value || prop.name,
              matched: value || prop.name,
              source: 'schema'
            });
          }
        });
      }
    }
  }

  return awards;
}

function detectExpertAttribution() {
  const text = document.body.innerText.toLowerCase();
  const found = /expert\s+review|as\s+(?:seen|featured)\s+(?:in|on)|clinically\s+(?:tested|proven)|dermatologist/i.test(text);
  return { found, score: found ? 100 : 0 };
}

function extractSocialProof() {
  const text = document.body.innerText.toLowerCase();
  const soldMatch = text.match(/\b(\d[\d,]+)[ \t]*(?:sold|purchased)\b/i);
  // Require a space, comma, or start-of-line before the digit group to prevent matching
  // part numbers like "P27-1069" where \b fires between the hyphen and digit
  const customerMatch = text.match(/(?:^|[\s,])(\d{3,}[\d,]*)[ \t]*(?:happy[ \t]+)?customers?\b/i);

  return {
    soldCount: soldMatch ? parseInt(soldMatch[1].replace(/,/g, ''), 10) : null,
    customerCount: customerMatch ? parseInt(customerMatch[1].replace(/,/g, ''), 10) : null,
    testimonials: document.querySelector('.testimonial, .testimonials') !== null
  };
}

// ==========================================
// AI DISCOVERABILITY EXTRACTOR
// ==========================================

/**
 * Extract AI discoverability signals from the page
 * Note: robots.txt and llms.txt are fetched via service worker (network requests)
 * This function extracts date signals from the page content
 * @returns {Object} AI discoverability signals
 */
function extractAIDiscoverabilitySignals() {
  const schemaDate = extractSchemaDateSignals();
  const visibleDate = extractVisibleDateSignals();
  const answerFormat = extractAnswerFormatContent();

  return {
    schemaDate,
    visibleDate,
    hasAnyDateSignal: !!(schemaDate.dateModified || schemaDate.datePublished || visibleDate.found),
    answerFormat
  };
}

/**
 * Extract answer-format content signals for AI discoverability
 * Detects "best for" statements, comparison content, how-to content, and use case descriptions
 * @returns {Object} Answer format content signals
 */
function extractAnswerFormatContent() {
  const bodyText = document.body.innerText;

  // Count "best for" / "ideal for" / "perfect for" / "great for" / "designed for" statements
  const bestForMatches = bodyText.match(/\b(?:best|ideal|perfect|great|designed)\s+for\b/gi) || [];
  const bestForCount = bestForMatches.length;

  // Check for comparison content: "vs." or "versus" or "compared to"
  const hasComparison = /\b(?:vs\.?|versus|compared\s+to)\b/i.test(bodyText);

  // Check for "how to" patterns near product context (exclude size/ordering pages)
  const hasHowTo = /\bhow\s+to\s+(?!(?:measure|size|fit|order|buy|care|return|shop|checkout|wash|clean)\b)/i.test(bodyText);

  // Count use case descriptions using EXCLUSIVE verbs (suitable/recommended) to avoid
  // double-counting with bestForMatches which already captures best/ideal/perfect/great/designed
  const useCaseMatches = bodyText.match(/\b(?:suitable|recommended)\s+for\s+[a-z][a-z\s]{3,30}/gi) || [];
  const useCaseCount = useCaseMatches.length;

  return {
    bestForCount,
    hasComparison,
    hasHowTo,
    useCaseCount
  };
}

/**
 * Extract date signals from schema.org markup
 * @returns {Object} Schema date signals
 */
function extractSchemaDateSignals() {
  const result = {
    dateModified: null,
    datePublished: null,
    dateCreated: null,
    source: null
  };

  // Check JSON-LD
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    if (result.dateModified) return; // Already found

    try {
      const data = JSON.parse(script.textContent.trim());
      const items = data['@graph'] || (Array.isArray(data) ? data : [data]);

      items.forEach(item => {
        if (!item || result.dateModified) return;

        // Check Product, Article, WebPage types
        const type = (Array.isArray(item['@type']) ? item['@type'][0] : item['@type'] || '').toLowerCase();
        if (['product', 'article', 'webpage', 'newsarticle', 'blogposting'].includes(type)) {
          if (item.dateModified) {
            result.dateModified = item.dateModified;
            result.source = 'json-ld';
          }
          if (item.datePublished && !result.datePublished) {
            result.datePublished = item.datePublished;
            result.source = result.source || 'json-ld';
          }
          if (item.dateCreated && !result.dateCreated) {
            result.dateCreated = item.dateCreated;
            result.source = result.source || 'json-ld';
          }
        }
      });
    } catch (e) {
      // Invalid JSON, skip
    }
  });

  // Check microdata
  if (!result.dateModified) {
    const dateModifiedEl = document.querySelector('[itemprop="dateModified"]');
    if (dateModifiedEl) {
      result.dateModified = dateModifiedEl.content || dateModifiedEl.getAttribute('datetime') || dateModifiedEl.textContent.trim();
      result.source = 'microdata';
    }
  }

  if (!result.datePublished) {
    const datePublishedEl = document.querySelector('[itemprop="datePublished"]');
    if (datePublishedEl) {
      result.datePublished = datePublishedEl.content || datePublishedEl.getAttribute('datetime') || datePublishedEl.textContent.trim();
      result.source = result.source || 'microdata';
    }
  }

  // Check meta tags
  if (!result.dateModified) {
    const metaModified = document.querySelector('meta[property="article:modified_time"], meta[name="last-modified"]');
    if (metaModified) {
      result.dateModified = metaModified.content;
      result.source = 'meta';
    }
  }

  if (!result.datePublished) {
    const metaPublished = document.querySelector('meta[property="article:published_time"], meta[name="publish-date"]');
    if (metaPublished) {
      result.datePublished = metaPublished.content;
      result.source = result.source || 'meta';
    }
  }

  return result;
}

/**
 * Extract visible date signals from page content
 * @returns {Object} Visible date signals
 */
function extractVisibleDateSignals() {
  const result = {
    found: false,
    dateText: null,
    dateType: null, // 'updated', 'published', 'modified', 'unknown'
    parsedDate: null
  };

  const bodyText = document.body.innerText;

  // Date patterns to match
  const patterns = [
    // "Updated on [date]", "Last updated [date]", "Updated: [date]"
    {
      regex: /(?:last\s+)?updated(?:\s+on)?[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i,
      type: 'updated'
    },
    // "Published [date]", "Published on [date]"
    {
      regex: /published(?:\s+on)?[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i,
      type: 'published'
    },
    // "Last modified [date]"
    {
      regex: /last\s+modified[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i,
      type: 'modified'
    },
    // "As of [date]"
    {
      regex: /as\s+of[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i,
      type: 'updated'
    },
    // "Date: [date]"
    {
      regex: /\bdate[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i,
      type: 'unknown'
    }
  ];

  for (const { regex, type } of patterns) {
    const match = bodyText.match(regex);
    if (match) {
      result.found = true;
      result.dateText = match[0].trim().substring(0, 50);
      result.dateType = type;

      // Try to parse the date
      try {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime())) {
          result.parsedDate = parsed.toISOString();
        }
      } catch (e) {
        // Date parsing failed, but we still found a date signal
      }

      break;
    }
  }

  // Also check for time elements with datetime attribute
  if (!result.found) {
    const timeEls = document.querySelectorAll('time[datetime]');
    for (const timeEl of timeEls) {
      const datetime = timeEl.getAttribute('datetime');
      if (datetime) {
        try {
          const parsed = new Date(datetime);
          if (!isNaN(parsed.getTime())) {
            result.found = true;
            result.dateText = timeEl.textContent.trim().substring(0, 50) || datetime;
            result.dateType = 'unknown';
            result.parsedDate = parsed.toISOString();
            break;
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
    }
  }

  return result;
}

// ==========================================
// PDP QUALITY SIGNALS EXTRACTOR
// ==========================================

/**
 * Main PDP Quality extraction orchestrator
 * Returns data for all 5 PDP Quality categories
 */
function extractPdpQualitySignals() {
  return {
    purchaseExperience: extractPurchaseExperience(),
    trustConfidence: extractTrustConfidence(),
    visualPresentation: extractVisualPresentation(),
    contentCompleteness: extractContentCompleteness(),
    reviewsSocialProof: extractReviewsSocialProof()
  };
}

/**
 * Extract Purchase Experience signals
 */
function extractPurchaseExperience() {
  const bodyText = document.body.innerText;
  const lower = bodyText.toLowerCase();

  // Price Visibility: check DOM for visible price, then schema fallback
  let priceVisible = false;
  let priceText = null;
  const priceSelectors = [
    '.price', '.product-price', '.current-price', '[data-product-price]',
    '.price--main', '.price__current', '.product__price', '.price-item--regular',
    '.price-item--sale', '.product-single__price', '[class*="price"]',
    '#price', '#product-price', '.offer-price', '.sale-price',
    '.pdp-price', '.product-info-price', '[data-testid="price"]'
  ];
  for (const sel of priceSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent.trim();
        if (/[\$£€¥₹]|USD|CAD|GBP|EUR|\d+[.,]\d{2}/.test(text)) {
          priceVisible = true;
          // Extract just the price value (currency symbol + number) to avoid capturing SKUs or labels
          const priceMatch = text.match(/[\$£€¥₹]\s*[\d,]+\.?\d*|[\d,]+\.?\d*\s*(?:USD|CAD|GBP|EUR)/);
          priceText = priceMatch
            ? priceMatch[0].trim()
            : text.replace(/^(regular price|sale price|now|was|from|price)[:\s]*/i, '').trim().substring(0, 30);
          break;
        }
      }
    } catch (e) { /* skip */ }
  }
  // Schema fallback for price
  if (!priceVisible) {
    for (const { item } of iterateSchemaItems(['product', 'productgroup'])) {
      const offers = item.offers ? (Array.isArray(item.offers) ? item.offers : [item.offers]) : [];
      for (const o of offers) {
        if (o.price || o.lowPrice) {
          priceVisible = true;
          priceText = `${o.priceCurrency || ''} ${o.price || o.lowPrice}`.trim().substring(0, 30);
          break;
        }
      }
      if (priceVisible) break;
    }
  }

  // CTA Button Presence & Clarity
  let ctaFound = false;
  let ctaText = null;
  let ctaIsClear = false;
  const ctaSelectors = [
    // Specific add-to-cart identifiers (highest confidence)
    '.add-to-cart', '#add-to-cart', '[data-add-to-cart]',
    '.product-form__submit', '.shopify-payment-button button', '.btn-addtocart',
    '.add-to-bag', '#AddToCart', '.product-form__cart-submit',
    '[name="add"]', '[data-testid="add-to-cart"]', '.buy-now',
    'button[data-action="add-to-cart"]', '.addtocart', '.add_to_cart',
    'input[value*="Add to"]', 'button.single_add_to_cart_button',
    // Scoped submit buttons: product form context before global fallback
    'form[action*="/cart/add"] button[type="submit"]',
    'form[action*="cart"] button[type="submit"]',
    '.product-form button[type="submit"]',
    'form[class*="product"] button[type="submit"]',
    'form[id*="product"] button[type="submit"]',
    // Generic fallback last to avoid capturing search/newsletter forms
    'button[type="submit"]'
  ];
  const clearCtaPatterns = /add to cart|add to bag|buy now|purchase|order now|shop now|get it now|subscribe|pre[\s-]?order/i;
  const genericCtaPatterns = /submit|continue|select|choose|add|go/i;

  for (const sel of ctaSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        ctaFound = true;
        ctaText = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().substring(0, 40);
        ctaIsClear = clearCtaPatterns.test(ctaText);
        break;
      }
    } catch (e) { /* skip */ }
  }
  // Broader fallback: any button with add-to-cart-like text
  if (!ctaFound) {
    const buttons = document.querySelectorAll('button, input[type="submit"], a.btn, a.button');
    for (const btn of buttons) {
      const text = (btn.textContent || btn.value || '').trim();
      if (clearCtaPatterns.test(text)) {
        ctaFound = true;
        ctaText = text.substring(0, 40);
        ctaIsClear = true;
        break;
      }
    }
  }

  // Discount/Sale Messaging
  let hasDiscount = false;
  let discountText = null;
  const discountSelectors = [
    '.compare-at-price', '.was-price', '.original-price', '.price--compare',
    '.price-item--compare', '.sale-badge', '.discount-badge', '.on-sale',
    // [class*="compare"] removed — too broad, matches "Compare Product" nav buttons
    '[class*="compare-at"]', '[class*="compare-price"]', '[class*="price-compare"]',
    '[class*="savings"]', '[class*="discount"]',
    '.sale-tag', '.price--was', '.strikethrough', 'del', 's',
    // B2B / industrial / automotive parts platforms (MSRP/list-price patterns)
    '[class*="list-price"]', '[class*="msrp"]',
    '[class*="regular-price"]', '[class*="price-regular"]',
    '[class*="price-original"]', '[class*="price-before"]',
    '[class*="price-crossed"]', '[class*="sale-price"]',
    'span[class*="line-through"]', '[class*="was-now"]'
  ];
  for (const sel of discountSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim().length > 0) {
        hasDiscount = true;
        discountText = el.textContent.trim().substring(0, 40);
        break;
      }
    } catch (e) { /* skip */ }
  }
  if (!hasDiscount) {
    hasDiscount = /save\s+\d|%\s*off|\bsale\b|was\s*\$|compare\s*at|you\s+save|markdown|clearance|list\s+price|msrp|\breg\.\s*\$|retail\s+price|special\s+price|price\s+drop/i.test(lower);
  }
  // Schema/DOM price mismatch: if schema Offer price is materially higher than the
  // DOM-captured price, the page is showing a sale price (common on B2B/parts sites
  // that use MSRP in schema and a discounted price in the DOM)
  if (!hasDiscount && priceVisible && priceText) {
    for (const { item } of iterateSchemaItems(['product', 'productgroup'])) {
      const offers = item.offers ? (Array.isArray(item.offers) ? item.offers : [item.offers]) : [];
      for (const o of offers) {
        const schemaPrice = parseFloat(o.price);
        const domPriceMatch = priceText.replace(/,/g, '').match(/[\d]+\.?\d*/);
        const domPrice = domPriceMatch ? parseFloat(domPriceMatch[0]) : null;
        if (schemaPrice && domPrice && domPrice < schemaPrice * 0.95) {
          hasDiscount = true;
          discountText = `Sale price (was ${o.priceCurrency || ''}${o.price})`;
          break;
        }
      }
      if (hasDiscount) break;
    }
  }

  // Payment Method Indicators
  let hasPaymentIndicators = false;
  const paymentPatterns = /\b(visa|mastercard|amex|american express|paypal|apple pay|google pay|shop pay|afterpay|affirm|klarna|sezzle|zip pay|buy now pay later|bnpl|pay in \d|split (?:it )?into|installments?|4 interest[\s-]?free)\b/i;
  hasPaymentIndicators = paymentPatterns.test(lower);
  if (!hasPaymentIndicators) {
    // Check for payment icons — <img> alt text
    const paymentImgs = document.querySelectorAll(
      'img[alt*="pay" i], img[alt*="visa" i], img[alt*="master" i], ' +
      'img[alt*="amex" i], img[alt*="klarna" i], img[alt*="afterpay" i]'
    );
    hasPaymentIndicators = paymentImgs.length > 0;
  }
  if (!hasPaymentIndicators) {
    // SVG payment icons (modern Shopify themes + React storefronts use inline SVG, not <img>)
    const paymentSvgSelectors = [
      'svg[aria-label*="visa" i]', 'svg[aria-label*="mastercard" i]',
      'svg[aria-label*="amex" i]', 'svg[aria-label*="paypal" i]',
      'svg[aria-label*="apple pay" i]', 'svg[aria-label*="google pay" i]',
      'svg[aria-label*="shop pay" i]', 'svg[aria-label*="afterpay" i]',
      'svg[aria-label*="klarna" i]', 'svg[title*="visa" i]',
      'svg[title*="mastercard" i]', 'svg[title*="paypal" i]',
      // Payment icon container classes (Shopify + custom)
      '.payment-icons', '[class*="payment-icon"]', '[class*="payment-method"]',
      '[class*="accepted-payment"]', '[class*="payment-logos"]',
      '.shopify-payment-button__more-options'
    ];
    for (const sel of paymentSvgSelectors) {
      try {
        if (document.querySelector(sel)) { hasPaymentIndicators = true; break; }
      } catch (e) { /* skip */ }
    }
  }

  // Urgency/Scarcity Signals — tiered: strong = full points, soft = partial points
  const strongUrgencyPatterns = /\b(only \d+ left|low stock|limited (?:time|quantity|supply|stock)|selling fast|almost gone|hurry|while (?:supplies|stocks?) last|ends? (?:soon|today|tonight)|countdown|flash sale|last chance|few remaining)\b/i;
  const softUrgencyPatterns = /\b(limited availability|limited edition|available while|at this price|in limited supply|limited run|back in stock)\b/i;
  let urgencyIsStrong = strongUrgencyPatterns.test(lower);
  let hasUrgency = urgencyIsStrong || softUrgencyPatterns.test(lower);
  if (!hasUrgency) {
    // Check for countdown timers — strong signal
    urgencyIsStrong = document.querySelector('[class*="countdown"], [class*="timer"], [data-countdown]') !== null;
    hasUrgency = urgencyIsStrong;
  }

  return {
    priceVisible,
    priceText,
    ctaFound,
    ctaText,
    ctaIsClear,
    hasDiscount,
    discountText,
    hasPaymentIndicators,
    hasUrgency,
    urgencyIsStrong
  };
}

/**
 * Extract Trust & Confidence signals
 */
function extractTrustConfidence() {
  const bodyText = document.body.innerText;
  const lower = bodyText.toLowerCase();

  // Return Policy Display
  let hasReturnPolicy = false;
  let returnPolicyText = null;
  const returnSelectors = [
    '[class*="return"]', '[class*="refund"]', '#return-policy', '#returns',
    '[data-return-policy]', '.returns-info', '.return-policy'
  ];
  for (const sel of returnSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim().length > 10) {
        hasReturnPolicy = true;
        returnPolicyText = el.textContent.trim().substring(0, 60);
        break;
      }
    } catch (e) { /* skip */ }
  }
  // Check expandable/accordion elements (details/summary, collapsible sections)
  if (!hasReturnPolicy) {
    const returnKeywords = /return|refund|exchange/i;
    // <details> elements with return-related summary text
    const detailsEls = document.querySelectorAll('details');
    for (const det of detailsEls) {
      const summary = det.querySelector('summary');
      if (summary && returnKeywords.test(summary.textContent)) {
        const content = det.textContent.trim();
        if (content.length > 10) {
          hasReturnPolicy = true;
          returnPolicyText = summary.textContent.trim().substring(0, 60);
          break;
        }
      }
    }
    // Accordion/collapsible buttons or headers mentioning returns
    if (!hasReturnPolicy) {
      const accordionHeaders = document.querySelectorAll(
        '[class*="accordion"] button, [class*="accordion"] [role="button"], ' +
        '[class*="collapsible"] button, [class*="collapsible"] [role="button"], ' +
        '[class*="expandable"] button, [class*="tab"] button[aria-controls], ' +
        '.product-info button, .product-details button'
      );
      for (const hdr of accordionHeaders) {
        if (returnKeywords.test(hdr.textContent)) {
          // Found an accordion header mentioning returns — check its associated panel
          const panelId = hdr.getAttribute('aria-controls');
          const panel = panelId ? document.getElementById(panelId) : hdr.closest('[class*="accordion"], [class*="collapsible"]');
          const panelText = panel ? panel.textContent.trim() : hdr.textContent.trim();
          if (panelText.length > 10) {
            hasReturnPolicy = true;
            returnPolicyText = hdr.textContent.trim().substring(0, 60);
            break;
          }
        }
      }
    }
  }
  if (!hasReturnPolicy) {
    const returnMatch = lower.match(/((?:free |easy |hassle[\s-]?free )?(?:\d+[\s-]?day )?(?:return|refund|exchange)(?:s| policy| guarantee)?)/i);
    if (returnMatch) {
      hasReturnPolicy = true;
      returnPolicyText = returnMatch[1].trim().substring(0, 60);
    }
  }
  // Schema fallback: check Offer.hasMerchantReturnPolicy (e.g. Walmart, enterprise retailers)
  if (!hasReturnPolicy) {
    for (const { item } of iterateSchemaItems(['product', 'productgroup'])) {
      const offers = item.offers ? (Array.isArray(item.offers) ? item.offers : [item.offers]) : [];
      for (const o of offers) {
        if (o.hasMerchantReturnPolicy) {
          hasReturnPolicy = true;
          returnPolicyText = 'Return policy in product schema';
          break;
        }
      }
      if (hasReturnPolicy) break;
    }
  }

  // Shipping Information
  let hasShippingInfo = false;
  let shippingText = null;
  const shippingSelectors = [
    '[class*="shipping"]', '[class*="delivery"]', '#shipping-info',
    '[data-shipping]', '.shipping-info', '.delivery-info'
  ];
  for (const sel of shippingSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        // Use innerText to exclude CSS from <style> child elements; cap length to skip large containers
        const text = (el.innerText || el.textContent || '').trim();
        if (text.length > 5 && text.length < 600) {
          hasShippingInfo = true;
          shippingText = text.substring(0, 60);
          break;
        }
      }
    } catch (e) { /* skip */ }
  }
  // Check expandable/accordion elements for shipping info
  if (!hasShippingInfo) {
    const shippingKeywords = /shipping|delivery|dispatch|pick.?up/i;
    const detailsEls = document.querySelectorAll('details');
    for (const det of detailsEls) {
      const summary = det.querySelector('summary');
      if (summary && shippingKeywords.test(summary.textContent)) {
        const content = det.textContent.trim();
        if (content.length > 5) {
          hasShippingInfo = true;
          shippingText = summary.textContent.trim().substring(0, 60);
          break;
        }
      }
    }
    if (!hasShippingInfo) {
      const accordionHeaders = document.querySelectorAll(
        '[class*="accordion"] button, [class*="accordion"] [role="button"], ' +
        '[class*="collapsible"] button, [class*="collapsible"] [role="button"], ' +
        '[class*="expandable"] button, .product-info button, .product-details button'
      );
      for (const hdr of accordionHeaders) {
        if (shippingKeywords.test(hdr.textContent)) {
          hasShippingInfo = true;
          shippingText = hdr.textContent.trim().substring(0, 60);
          break;
        }
      }
    }
  }
  if (!hasShippingInfo) {
    const shipMatch = lower.match(/(free shipping|ships? (?:in|within|next)|delivery (?:in|within|by)|estimated delivery|standard shipping|express shipping|\$\d+(?:\.\d{2})?\s*shipping|\d[\s-]?\d?\s*(?:business )?day(?:s)?\s*(?:shipping|delivery)|(?:available|ready|free)?\s*(?:for\s+)?(?:in.?store\s+)?pick.?up|curbside\s+pick.?up|local\s+pick.?up|store\s+pick.?up)/i);
    if (shipMatch) {
      hasShippingInfo = true;
      shippingText = shipMatch[1].trim().substring(0, 60);
    }
  }

  // Trust Badges
  let hasTrustBadges = false;
  const trustBadgeSelectors = [
    '[class*="trust-badge"]', '[class*="trust_badge"]', '[class*="trustbadge"]',
    '[class*="security-badge"]', '[class*="security-seal"]', '[class*="trust-seal"]',
    '[class*="trust-icon"]', '.trust-seals',
    '[class*="guaranteed-safe-checkout"]', '[class*="safe-checkout"]',
    '[class*="checkout-badge"]', '[class*="payment-badge"]',
    'img[alt*="secure" i]', 'img[alt*="trust" i]', 'img[alt*="verified" i]',
    'img[alt*="norton" i]', 'img[alt*="mcafee" i]', 'img[alt*="ssl" i]',
    'img[alt*="bbb" i]', 'img[alt*="guarantee" i]',
    'svg[aria-label*="secure" i]', 'svg[aria-label*="ssl" i]',
    'svg[aria-label*="verified" i]', 'svg[aria-label*="norton" i]',
    'svg[aria-label*="mcafee" i]', 'svg[aria-label*="guarantee" i]'
  ];
  for (const sel of trustBadgeSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        hasTrustBadges = true;
        break;
      }
    } catch (e) { /* skip */ }
  }
  if (!hasTrustBadges) {
    hasTrustBadges = /\b(ssl secured?|norton secured?|mcafee secure|verified by|trusted (?:shop|store|seller)|bbb accredited|money[\s-]?back guarantee|guaranteed safe checkout|safe checkout guarantee)\b/i.test(lower);
  }

  // Secure Checkout Signals
  const isHttps = window.location.protocol === 'https:';
  let hasSecureCheckoutMessaging = /\b(secure checkout|safe checkout|encrypted|256[\s-]?bit|ssl|secure (?:payment|transaction|ordering))\b/i.test(lower);
  const hasSecureCheckout = isHttps && hasSecureCheckoutMessaging;

  // Customer Service Indicators
  let hasCustomerService = false;
  const csPatterns = /\b(live chat|chat with us|call us|contact us|customer (?:support|service|care)|help center|1[\s-]?800[\s-]?\d{3}[\s-]?\d{4}|\(\d{3}\)\s*\d{3}[\s-]?\d{4}|email us|support@|help@)\b/i;
  hasCustomerService = csPatterns.test(lower);
  if (!hasCustomerService) {
    hasCustomerService = document.querySelector('[class*="live-chat"], [class*="chat-widget"], [data-chat], #chat-widget, .chat-button, [class*="customer-service"]') !== null;
  }

  // Guarantee/Warranty Display
  let hasGuarantee = false;
  let guaranteeText = null;
  const guaranteePatterns = /(\d+[\s-]*(?:year|month|day|yr|mo)[\s-]*(?:limited\s+)?(?:warranty|guarantee)|(?:lifetime|full|money[\s-]?back)\s+(?:warranty|guarantee)|satisfaction\s+guarante?e|100%\s+(?:satisfaction|money[\s-]?back))/i;
  const guaranteeNegative = /no warranty|without warranty|void(?:s|ed)? (?:the\s+)?warranty/i;
  if (!guaranteeNegative.test(lower)) {
    const match = bodyText.match(guaranteePatterns);
    if (match) {
      hasGuarantee = true;
      guaranteeText = match[1].trim().substring(0, 50);
    }
  }

  return {
    hasReturnPolicy,
    returnPolicyText,
    hasShippingInfo,
    shippingText,
    hasTrustBadges,
    hasSecureCheckout,
    isHttps,
    hasSecureCheckoutMessaging,
    hasCustomerService,
    hasGuarantee,
    guaranteeText
  };
}

/**
 * Extract Visual Presentation signals
 */
function extractVisualPresentation() {
  // Product image count
  const gallerySelectors = [
    '.product-gallery img', '.product-images img', '.product-photos img',
    '.product-media img', '.product__media img', '.product-single__photos img',
    '.product-gallery__image', '[data-product-images] img', '[class*="product-gallery"] img',
    '[class*="product-image"] img', '.carousel img', '.slider img',
    '.swiper-slide img', '.slick-slide img'
  ];
  let productImages = [];
  for (const sel of gallerySelectors) {
    try {
      const imgs = document.querySelectorAll(sel);
      if (imgs.length > productImages.length) {
        productImages = Array.from(imgs);
      }
    } catch (e) { /* skip */ }
  }
  // Fallback: count images in product content area
  if (productImages.length === 0) {
    const mainContent = document.querySelector('main, article, [role="main"], .product-detail, .product-details');
    if (mainContent) {
      productImages = Array.from(mainContent.querySelectorAll('img')).filter(img => {
        const w = img.naturalWidth || img.width;
        return w > 100; // Filter out tiny icons
      });
    }
  }
  const imageCount = productImages.length;

  // Video Presence
  const hasVideo = document.querySelector(
    'video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="wistia"], ' +
    '[class*="product-video"], [data-video], [class*="video-player"]'
  ) !== null;

  // Image Gallery Features (zoom, lightbox, navigation)
  const hasGalleryFeatures = document.querySelector(
    '[class*="zoom"], [data-zoom], [class*="lightbox"], [data-lightbox], [data-fancybox], ' +
    '[class*="magnif"], .pswp, .fancybox, [class*="gallery-nav"], ' +
    '[class*="thumbnail"], .product-thumbnails, [class*="carousel-nav"], ' +
    '[class*="slide-nav"], .slick-dots, .swiper-pagination, ' +
    // ARIA navigation buttons (custom React/Next.js carousels)
    'button[aria-label*="next" i], button[aria-label*="previous" i], ' +
    'button[aria-label*="next image" i], button[aria-label*="prev image" i], ' +
    // data-testid patterns (Walmart, SportChek, generic React)
    '[data-testid*="carousel"], [data-testid*="gallery"], ' +
    '[data-testid*="image-next"], [data-testid*="image-prev"], ' +
    // Class fragments for custom galleries
    '[class*="media-gallery"], [class*="image-gallery"], [class*="photo-gallery"]'
  ) !== null;

  // Lifestyle/Context Images (images showing product in use)
  // Heuristic: check for alt text suggesting lifestyle or context imagery
  let hasLifestyleImages = false;
  for (const img of productImages) {
    const alt = (img.alt || '').toLowerCase();
    if (/in use|lifestyle|model|worn|wearing|styled|room|kitchen|outdoor|action|being used|on body|person|modeled/i.test(alt)) {
      hasLifestyleImages = true;
      break;
    }
  }
  // Fallback: many images suggests lifestyle content — but only for consumer products,
  // not industrial/parts/B2B pages where multiple angles are standard product photography
  if (!hasLifestyleImages && imageCount >= 6) {
    const crumbEl = document.querySelector('[class*="breadcrumb"], nav[aria-label*="breadcrumb" i]');
    const crumbText = (crumbEl ? crumbEl.textContent : '').toLowerCase();
    const isIndustrialOrParts = /electrical|switch|solenoid|actuator|hardware|industrial|heavy.?duty|component|fitting|connector|valve|relay|sensor|plumbing|fastener|bearing/i.test(crumbText)
      || /\/(categories|parts|components|assemblies|products\/\d)/i.test(window.location.pathname);
    if (!isIndustrialOrParts) {
      hasLifestyleImages = true;
    }
  }

  // Color/Variant Swatches
  const hasSwatches = document.querySelector(
    '[class*="swatch"], [class*="color-picker"], [class*="variant-picker"], ' +
    '[class*="color-option"], [data-option="color"], [data-option="colour"], ' +
    '.product-form__option--color, [class*="option-swatch"], ' +
    'input[type="radio"][name*="color" i], input[type="radio"][name*="colour" i]'
  ) !== null;

  // Image Quality Signals (high-res images with srcset)
  let hasHighResImages = false;
  for (const img of productImages.slice(0, 5)) {
    const w = img.naturalWidth || parseInt(img.getAttribute('width')) || 0;
    const hasSrcset = !!img.srcset || !!img.getAttribute('data-srcset');
    if (w >= 1000 || hasSrcset) {
      hasHighResImages = true;
      break;
    }
  }

  return {
    imageCount,
    hasVideo,
    hasGalleryFeatures,
    hasLifestyleImages,
    hasSwatches,
    hasHighResImages
  };
}

/**
 * Extract Content Completeness signals
 */
function extractContentCompleteness() {
  const bodyText = document.body.innerText;
  const lower = bodyText.toLowerCase();

  // Product Variant Display (size/color/option selectors)
  let hasVariants = document.querySelector(
    'select[name*="option" i], select[name*="variant" i], select[name*="size" i], ' +
    '[class*="variant-selector"], [class*="product-option"], [class*="option-selector"], ' +
    '.product-form__option, [data-product-option], input[type="radio"][name*="size" i], ' +
    '[class*="size-selector"], [class*="size-picker"], ' +
    // Amazon-specific
    'select[name*="size_name" i], [id*="size_name" i], [id*="variation_size" i], ' +
    // Data attribute patterns (custom themes, React)
    '[data-option-index], [data-variant-id], [data-option-name], ' +
    // Class fragment patterns for custom implementations
    '[class*="size-option"], [class*="option__btn"], [class*="variant-option"], ' +
    '[class*="variant__btn"], [class*="product__option"], ' +
    // Shopify SingleOptionSelector pattern
    'select[id*="SingleOptionSelector"]'
  ) !== null;
  // Text-based fallback for React/custom platforms where class names are hashed
  if (!hasVariants) {
    hasVariants = /\bselect\s+(?:a\s+)?(?:size|colou?r|style|option)\b|\bchoose\s+(?:a\s+)?(?:size|colou?r|style)\b/i.test(lower);
  }

  // Size Guide/Fit Info
  let hasSizeGuide = false;
  const sizeGuideSelectors = [
    '[class*="size-guide"]', '[class*="size-chart"]', '[class*="fit-guide"]',
    'a[href*="size-guide"]', 'a[href*="size-chart"]', '[data-size-guide]',
    '[class*="sizing"]'
  ];
  for (const sel of sizeGuideSelectors) {
    try {
      if (document.querySelector(sel)) {
        hasSizeGuide = true;
        break;
      }
    } catch (e) { /* skip */ }
  }
  if (!hasSizeGuide) {
    hasSizeGuide = /\b(size guide|size chart|sizing guide|fit guide|find your size|how to measure)\b/i.test(lower);
  }

  // Related/Recommended Products
  const hasRelatedProducts = document.querySelector(
    '[class*="related-products"],' +
    '[class*="recommended-products"],' +
    '[class*="you-may-also"],' +
    '[class*="also-like"],' +
    '[class*="similar-products"],' +
    '[class*="customers-also"],' +
    '[class*="frequently-bought"],' +
    '[data-related-products],' +
    '[class*="product-recommendations"],' +
    '[class*="upsell"],' +
    '[class*="cross-sell"],' +
    // Amazon
    '[data-feature-name="similarities_widget"],[data-feature-name="pd_related_pdp"],' +
    '[data-feature-name="bought_together"],[id*="sims-carousel"],' +
    // Walmart / SportChek / generic React
    '[data-testid*="related" i],[data-testid*="recommendation" i],' +
    '[data-testid*="also-like" i],[data-testid*="similar" i],' +
    '[id*="related-products"],[id*="recommendations"]'
  ) !== null || /\b(you may also like|customers also (?:bought|viewed)|similar products|related products|recommended for you|frequently bought together|complete the look)\b/i.test(lower);

  // Q&A Section (distinct from editorial FAQ)
  let hasQASection = false;
  const qaSelectors = [
    '[class*="question-answer"]', '[class*="q-and-a"]', '[class*="qa-section"]',
    '[class*="customer-questions"]', '#questions', '#qa',
    '[class*="ask-a-question"]', '[data-qa-section]',
    // Amazon
    '[id="Ask"]', '[data-feature-name="ask"]', '[data-feature-name="qa"]',
    // Walmart / generic React
    '[data-testid*="question" i]', '[data-testid*="qa" i]',
    '[id*="questions-answers"]', '[id*="customer-questions"]'
  ];
  for (const sel of qaSelectors) {
    try {
      if (document.querySelector(sel)) {
        hasQASection = true;
        break;
      }
    } catch (e) { /* skip */ }
  }
  if (!hasQASection) {
    hasQASection = /\b(customer questions|ask a question|questions?\s*(?:&|and)\s*answers?|q\s*&\s*a)\b/i.test(lower);
  }

  // Product Details Organization (tabs, accordions, or clear sections)
  const hasOrganizedDetails = document.querySelector(
    '[role="tablist"], [class*="tabs"], [class*="accordion"], [class*="collapsible"], ' +
    '[class*="expandable"], [data-toggle="collapse"], .tab-content, .panel-group, ' +
    '[class*="product-tabs"], [class*="product-accordion"]'
  ) !== null
  // Semantic fallback: 3+ named sections or headings within the main content area
  // covers custom React/Next.js platforms that use <section> + H2 instead of widgets
  || (() => {
    const main = document.querySelector('main, [role="main"]');
    if (!main) return false;
    return main.querySelectorAll('section').length >= 3
        || main.querySelectorAll('h2, h3').length >= 3;
  })();

  // "What's in the Box" / Package Contents
  let hasWhatsInBox = false;
  hasWhatsInBox = /\b(what'?s in the box|package (?:contents|includes?)|included (?:items|accessories)|comes with|box contents|in the (?:box|package)|items included)\b/i.test(lower);

  return {
    hasVariants,
    hasSizeGuide,
    hasRelatedProducts,
    hasQASection,
    hasOrganizedDetails,
    hasWhatsInBox
  };
}

/**
 * Extract Reviews & Social Proof signals
 */
function extractReviewsSocialProof() {
  const bodyText = document.body.innerText;
  const lower = bodyText.toLowerCase();

  // Detect known third-party JS review platforms (widgets that render after page load)
  const JS_REVIEW_PLATFORMS = [
    { name: 'Klaviyo',      selector: '.klaviyo-star-rating-widget, [class*="klaviyo"][class*="review"], [class*="klaviyo"][class*="rating"]' },
    { name: 'Okendo',       selector: '.okeReviews-reviewSummary, [data-oke-reviews-widget], .oke-w' },
    { name: 'Judge.me',     selector: '.jdgm-widget, .jdgm-preview-badge, [class*="jdgm-"]' },
    { name: 'Yotpo',        selector: '.yotpo-widget-instance, .yotpo-main-widget, .yotpo-reviews-carousel' },
    { name: 'Loox',         selector: '#loox, .loox-rating, [id*="loox-"]' },
    { name: 'Stamped',      selector: '#stamped-main-widget, .stamped-main-widget, [data-widget-type="stamped"]' },
    { name: 'Trustpilot',   selector: '.trustpilot-widget' },
    { name: 'Reviews.io',   selector: '.reviewsio-rating-widget, [data-reviews-io-widget]' },
    { name: 'Bazaarvoice',  selector: '.bv_main_container, [data-bv-show]' },
    { name: 'PowerReviews', selector: '.pr-review-display, [data-pr-component]' },
  ];
  let reviewPlatform = null;
  for (const { name, selector } of JS_REVIEW_PLATFORMS) {
    try {
      if (document.querySelector(selector)) { reviewPlatform = name; break; }
    } catch (e) { /* skip invalid selector */ }
  }

  // Review Display Prominence (star rating visible in hero area)
  // Require the matched element to have actual content — empty placeholder divs from
  // JS review platforms (e.g. Klaviyo) must not generate a false positive.
  let hasProminentReviews = false;
  const heroSelectors = [
    '.product-info', '.product-hero', '.product-summary', '.product__info',
    '.product-single__meta', '.product-detail', 'main', 'article'
  ];
  for (const sel of heroSelectors) {
    try {
      const hero = document.querySelector(sel);
      if (hero) {
        const ratingEl = hero.querySelector(
          '[class*="rating"], [class*="stars"], [class*="review-count"], ' +
          '[itemprop="aggregateRating"], [class*="star-rating"], ' +
          // ARIA-based (covers hashed CSS module class names)
          '[aria-label*="rating" i], [aria-label*="out of 5" i], [aria-label*="out of 5.0" i], ' +
          // data-testid patterns (Walmart, SportChek, other React platforms)
          '[data-testid*="rating" i], [data-testid*="review" i], ' +
          // Amazon-specific
          '[class*="a-icon-star"], [data-hook="average-star-rating"], [data-hook="rating-out-of-text"]'
        );
        if (ratingEl && (ratingEl.children.length > 0 || ratingEl.textContent.trim().length > 0)) {
          hasProminentReviews = true;
          break;
        }
      }
    } catch (e) { /* skip */ }
  }
  // Schema-based fallback: if aggregateRating with a count exists, the page almost
  // certainly surfaces that rating in the product hero area
  if (!hasProminentReviews) {
    for (const { item } of iterateSchemaItems(['product', 'productgroup'])) {
      if (item.aggregateRating && !item.aggregateRating['@id']) {
        const count = parseInt(item.aggregateRating.reviewCount, 10) ||
                      parseInt(item.aggregateRating.ratingCount, 10) || 0;
        if (count > 0) {
          hasProminentReviews = true;
          break;
        }
      }
    }
  }
  // Also check untyped JSON-LD blocks containing aggregateRating directly
  // (e.g. Speed Addicts / BigCommerce: separate block with @id but no @type)
  if (!hasProminentReviews) {
    for (const { valid, data } of getParsedJsonLd()) {
      if (!valid) continue;
      const blockItems = data['@graph'] ? data['@graph'] : Array.isArray(data) ? data : [data];
      for (const item of blockItems) {
        if (item && !item['@type'] && item.aggregateRating) {
          const count = parseInt(item.aggregateRating.reviewCount, 10) ||
                        parseInt(item.aggregateRating.ratingCount, 10) || 0;
          if (count > 0) { hasProminentReviews = true; break; }
        }
      }
      if (hasProminentReviews) break;
    }
  }

  // Star Rating Visual (visual star display, not just numbers)
  // Require content so empty JS-platform placeholder divs don't generate false positives.
  const starEl = document.querySelector(
    '[class*="star-rating"], [class*="stars"], svg[class*="star"], ' +
    '[class*="rating-star"], .star-icon, [class*="star-filled"], ' +
    'img[alt*="star" i], [aria-label*="star" i], [aria-label*="rating" i]'
  );
  const hasStarVisual = starEl !== null && (starEl.children.length > 0 || starEl.textContent.trim().length > 0);

  // Review Sorting/Filtering
  const hasReviewSorting = document.querySelector(
    '[class*="review-sort"], [class*="review-filter"], select[name*="sort" i], ' +
    '[class*="sort-reviews"], [data-review-sort], [class*="filter-bar"], ' +
    // Amazon-specific
    '[id*="sort-order"], [data-action*="sort"], [data-hook*="sort"], ' +
    // Generic React / data-testid patterns
    '[data-testid*="review-sort" i], [data-testid*="sort-review" i], ' +
    '[data-testid*="review-filter" i]'
  ) !== null || /\b(sort by|filter reviews?|most helpful|most recent|top reviews|highest rated|lowest rated|most critical|newest|oldest)\b/i.test(lower);

  // Photo/Video Reviews
  const hasMediaReviews = document.querySelector(
    '[class*="review-photo"], [class*="review-image"], [class*="review-video"], ' +
    '[class*="customer-photo"], [class*="ugc"], [class*="user-content"], ' +
    '[class*="review-media"], [data-review-photos]'
  ) !== null;

  // Social Proof Indicators
  let hasSocialProof = false;
  hasSocialProof = /\b(\d[\d,]*\+?\s*(?:people|customers|buyers|shoppers)\s*(?:bought|purchased|love|viewed)|best[\s-]?seller|most popular|trending|top[\s-]?rated|#1\s*(?:best|top|selling))\b/i.test(lower);
  if (!hasSocialProof) {
    hasSocialProof = document.querySelector(
      '[class*="bestseller"], [class*="best-seller"], [class*="trending"], ' +
      '[class*="most-popular"], [class*="social-proof"]'
    ) !== null;
  }

  // Review Count Threshold (50+ for PDP Quality, higher bar than AI Readiness's 25)
  // Try schema first (most reliable) to avoid DOM false positives from aria-labels with part numbers
  let reviewCount = 0;
  for (const { item } of iterateSchemaItems(['product', 'productgroup'])) {
    if (item.aggregateRating) {
      const rating = item.aggregateRating['@id'] ? null : item.aggregateRating;
      if (rating) {
        reviewCount = parseInt(rating.reviewCount, 10) || parseInt(rating.ratingCount, 10) || 0;
        if (reviewCount > 0) break;
      }
    }
  }
  // Schema fallback: check typeless JSON-LD blocks (e.g. BigCommerce)
  if (reviewCount === 0) {
    for (const { valid, data } of getParsedJsonLd()) {
      if (!valid) continue;
      const blockItems = data['@graph'] ? data['@graph'] : Array.isArray(data) ? data : [data];
      for (const it of blockItems) {
        if (it && !it['@type'] && it.aggregateRating) {
          const c = parseInt(it.aggregateRating.reviewCount, 10) || parseInt(it.aggregateRating.ratingCount, 10) || 0;
          if (c > 0) { reviewCount = c; break; }
        }
      }
      if (reviewCount > 0) break;
    }
  }
  // DOM fallback — only used when schema provides no count
  if (reviewCount === 0) {
    const countEl = document.querySelector(
      '[itemprop="reviewCount"], .review-count, .reviews-count, ' +
      '[class*="review-count"], [class*="rating-count"], [class*="reviews-count"], ' +
      '[data-testid*="review-count" i], [data-testid*="rating-count" i], ' +
      // Modern WooCommerce: <span class="count"> inside .woocommerce-review-link
      '.woocommerce-product-rating .count, .woocommerce-review-link .count, ' +
      // Exclude heading elements — aria-label on section headings can contain part numbers
      '[aria-label*="reviews" i]:not(h1):not(h2):not(h3):not(h4):not([role="heading"]), ' +
      // Amazon-specific
      '#acrCustomerReviewText, [data-hook="total-review-count"]'
    );
    if (countEl) {
      const raw = countEl.getAttribute('aria-label') || countEl.content || countEl.textContent;
      // Require the number to be adjacent to review/rating context — prevents matching
      // part numbers that happen to appear in aria-label text (e.g. "P27-1069 Customer Reviews")
      const match = raw.match(/(\d[\d,]*)\s*(?:review|rating)/i)
                 || raw.match(/(?:review|rating)s?\s*[:(]?\s*\(?(\d[\d,]*)/i)
                 // WooCommerce .count span contains just the bare number — accept it
                 // only when the element is specifically the WooCommerce count span
                 || (countEl.closest('.woocommerce-product-rating, .woocommerce-review-link') && raw.match(/^(\d[\d,]*)$/));
      if (match) reviewCount = parseInt((match[1] || match[2] || '0').replace(/,/g, ''), 10);
    }
  }
  // Last resort: parse WooCommerce review link text e.g. "(1 customer review)"
  if (reviewCount === 0) {
    const reviewLink = document.querySelector('.woocommerce-review-link');
    if (reviewLink) {
      const m = reviewLink.textContent.match(/(\d[\d,]*)\s*customer\s*review/i);
      if (m) reviewCount = parseInt(m[1].replace(/,/g, ''), 10);
    }
  }

  return {
    hasProminentReviews,
    hasStarVisual,
    hasReviewSorting,
    hasMediaReviews,
    hasSocialProof,
    reviewCount,
    reviewPlatform
  };
}

// ==========================================
// SEO SIGNALS EXTRACTION
// ==========================================

/**
 * Extract SEO-specific signals not covered by existing extractors
 * Returns: titleTag, urlStructure, internalLinks
 */
function extractSeoSignals() {
  // Title tag
  const titleText = document.title || '';
  const titleTag = {
    text: titleText,
    length: titleText.length,
    present: titleText.length > 0
  };

  // URL structure
  const { pathname, search, hostname } = window.location;
  const segments = pathname.split('/').filter(s => s.length > 0);
  const slug = segments[segments.length - 1] || '';
  // "Clean" = no query string, no numeric-only final segment, reasonable length
  const isClean = search === '' && !/^\d+$/.test(slug) && pathname.length <= 100;
  // hasKeywords: slug contains real word characters (not just IDs)
  const hasKeywords = /[a-z]{3,}/i.test(slug.replace(/[^a-z0-9-]/gi, ''));
  const urlStructure = {
    path: pathname,
    depth: segments.length,
    length: pathname.length,
    isClean,
    hasKeywords
  };

  // Internal links: count <a href> pointing to the same origin, scoped to main content
  // to exclude nav/header/footer links which would make this factor trivially pass.
  const origin = window.location.origin;
  const linkScope = getMainContentArea();
  let internalLinkCount = 0;
  const linkEls = linkScope.querySelectorAll('a[href]');
  for (const a of linkEls) {
    try {
      const resolved = new URL(a.getAttribute('href'), origin);
      if (resolved.origin === origin) {
        internalLinkCount++;
      }
    } catch { /* ignore invalid hrefs */ }
  }
  const internalLinks = { count: internalLinkCount };

  // DOM breadcrumb navigation — used by SEO Navigation & Discovery scorer.
  // contentStructure does not expose a breadcrumbs key, so detect here.
  const breadcrumbEl = document.querySelector(
    'nav[aria-label*="breadcrumb" i], [class*="breadcrumb"], [id*="breadcrumb"], ' +
    '[itemtype*="BreadcrumbList"], ol[class*="breadcrumb"], ul[class*="breadcrumb"]'
  );
  const domBreadcrumbs = { present: !!breadcrumbEl };

  return { titleTag, urlStructure, internalLinks, domBreadcrumbs };
}

// Log that content script is loaded
if (DEBUG) console.log('pdpIQ: Content script loaded');
