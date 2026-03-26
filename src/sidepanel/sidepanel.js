/**
 * Side Panel Application
 * Main UI controller for the extension
 */

const DEBUG = false;

import { ScoringEngine } from '../scoring/scoring-engine.js';
import { RecommendationEngine, PdpQualityRecommendationEngine, SeoQualityRecommendationEngine } from '../recommendations/recommendation-engine.js';
import { getGradeDescription, CATEGORY_DESCRIPTIONS, FACTOR_RECOMMENDATIONS, PDP_CATEGORY_DESCRIPTIONS, PDP_FACTOR_RECOMMENDATIONS, getPdpGradeDescription, SEO_CATEGORY_DESCRIPTIONS, SEO_FACTOR_RECOMMENDATIONS, getSeoGradeDescription } from '../scoring/weights.js';
import { RECOMMENDATION_TEMPLATES, PDP_RECOMMENDATION_TEMPLATES, SEO_RECOMMENDATION_TEMPLATES } from '../recommendations/recommendation-rules.js';
import { generateHtmlReport } from './report-template.js';
import { CitationOpportunityEngine } from '../recommendations/citation-opportunities.js';
import { CitationRoadmapEngine } from '../recommendations/citation-roadmap.js';
import {
  saveAnalysis,
  getHistory,
  clearHistory
} from '../storage/storage-manager.js';

/**
 * Escape HTML to prevent XSS when inserting user-controlled data
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for innerHTML
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

class SidePanelApp {
  constructor() {
    this.currentData = null;
    this.selectedContext = null;
    this.scoreResult = null;
    this.recommendations = [];
    this.pdpScoreResult = null;
    this.pdpRecommendations = [];
    this.seoScoreResult = null;
    this.seoRecommendations = [];
    this.citationOpportunities = null;
    this.citationRoadmap = null;
    this.imageVerification = null;
    this.aiDiscoverabilityData = null;
    this.currentRequestId = null;
    this.analysisTimeoutId = null;
    this.selectedHistoryIds = [];

    this.init();
  }

  async init() {
    this.bindEvents();
    this.setupMessageListener();
    this.displayVersion();
    await this.updatePageInfo();
    await this.loadHistory();
  }

  bindEvents() {
    // Context selection buttons
    document.querySelectorAll('.context-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const context = e.currentTarget.dataset.context;
        this.startAnalysis(context);
      });
    });

    // Re-analyze button
    document.getElementById('reanalyzeBtn').addEventListener('click', () => {
      this.showContextSelector();
    });

    // Export JSON button
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportData();
    });

    // Export HTML report button
    document.getElementById('exportReportBtn').addEventListener('click', () => {
      this.exportHtmlReport();
    });

    // Retry button (error state)
    document.getElementById('retryBtn').addEventListener('click', () => {
      this.showContextSelector();
    });

    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.currentTarget.dataset.tab);
      });
    });

    // Clear history button
    document.getElementById('clearHistoryBtn').addEventListener('click', async () => {
      if (confirm('Clear all analysis history?')) {
        await clearHistory();
        this.selectedHistoryIds = [];
        await this.loadHistory();
      }
    });

    // Compare button
    document.getElementById('compareBtn').addEventListener('click', () => {
      this.showCompareView();
    });

    // Back from compare
    document.getElementById('compareBackBtn').addEventListener('click', () => {
      this.showHistoryListView();
    });

    // PDP re-analyze button
    document.getElementById('pdpReanalyzeBtn').addEventListener('click', () => {
      this.showContextSelector();
    });

    // PDP export buttons
    document.getElementById('pdpExportReportBtn').addEventListener('click', () => {
      this.exportHtmlReport();
    });
    document.getElementById('pdpExportBtn').addEventListener('click', () => {
      this.exportData();
    });

    // SEO buttons
    document.getElementById('seoReanalyzeBtn').addEventListener('click', () => {
      this.showContextSelector();
    });
    document.getElementById('seoExportReportBtn').addEventListener('click', () => {
      this.exportHtmlReport();
    });
    document.getElementById('seoExportBtn').addEventListener('click', () => {
      this.exportData();
    });

    // Event delegation for all category lists (prevents memory leaks from re-rendering)
    ['categoryList', 'pdpCategoryList', 'seoCategoryList'].forEach(id => {
      this.setupCategoryListDelegation(id);
    });

    // Citation Opportunity Map toggle
    const citationToggle = document.getElementById('citationToggle');
    if (citationToggle) {
      citationToggle.addEventListener('click', () => {
        const content = document.getElementById('citationContent');
        const icon = citationToggle.querySelector('.citation-toggle-icon');
        content?.classList.toggle('hidden');
        icon?.classList.toggle('expanded');
      });
    }

    // Content-to-Citation Roadmap toggle
    document.getElementById('citationRoadmapToggle')?.addEventListener('click', () => {
      const content = document.getElementById('citationRoadmapContent');
      const icon = document.querySelector('#citationRoadmapToggle .citation-toggle-icon');
      content?.classList.toggle('hidden');
      icon?.classList.toggle('expanded');
    });

    // AI Signal Inventory toggle
    document.getElementById('aiSignalInventoryToggle')?.addEventListener('click', () => {
      const content = document.getElementById('aiSignalInventoryContent');
      const icon = document.querySelector('#aiSignalInventoryToggle .citation-toggle-icon');
      content?.classList.toggle('hidden');
      if (icon) icon.innerHTML = content.classList.contains('hidden') ? '&#9654;' : '&#9660;';
    });

    // Raw Crawlable Text toggle
    document.getElementById('rawCrawlableTextToggle')?.addEventListener('click', () => {
      const content = document.getElementById('rawCrawlableTextContent');
      const icon = document.querySelector('#rawCrawlableTextToggle .citation-toggle-icon');
      content?.classList.toggle('hidden');
      if (icon) icon.innerHTML = content.classList.contains('hidden') ? '&#9654;' : '&#9660;';
    });
  }

  setupCategoryListDelegation(containerId) {
    document.getElementById(containerId).addEventListener('click', (e) => {
      const header = e.target.closest('.category-header');
      if (header && !e.target.closest('.factor-expand-btn')) {
        const card = header.closest('.category-card');
        const isExpanded = header.dataset.expanded === 'true';
        header.dataset.expanded = !isExpanded;
        header.querySelector('.expand-icon').textContent = isExpanded ? '+' : '−';
        card.querySelector('.category-details').classList.toggle('hidden');
        return;
      }

      const expandBtn = e.target.closest('.factor-expand-btn');
      if (expandBtn) {
        e.stopPropagation();
        const factor = expandBtn.closest('.factor');
        const rec = factor.querySelector('.factor-recommendation');
        const isExpanded = !rec.classList.contains('hidden');
        rec.classList.toggle('hidden');
        expandBtn.textContent = isExpanded ? '▶' : '▼';
      }
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'EXTRACTION_COMPLETE') {
        // Verify this response matches the current request
        if (message.requestId && message.requestId !== this.currentRequestId) {
          if (DEBUG) console.log('Ignoring stale extraction response:', message.requestId);
          return;
        }
        if (DEBUG) console.log('Received extraction data:', message);
        // Clear the timeout since we received valid data
        if (this.analysisTimeoutId) {
          clearTimeout(this.analysisTimeoutId);
          this.analysisTimeoutId = null;
        }
        this.currentData = message.data;
        this.processResults();
      }
    });
  }

  async updatePageInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https:'))) {
        const domain = new URL(tab.url).hostname;
        document.getElementById('pageDomain').textContent = domain;
      }
    } catch (e) {
      console.error('Error getting page info:', e);
    }
  }

  displayVersion() {
    const version = chrome.runtime.getManifest().version;
    document.getElementById('versionBadge').textContent = `v${version}`;
  }

  async startAnalysis(context) {
    this.selectedContext = context;
    this.showLoading();

    // Clear any previous timeout and reset state
    if (this.analysisTimeoutId) {
      clearTimeout(this.analysisTimeoutId);
      this.analysisTimeoutId = null;
    }
    this.currentData = null;

    // Generate unique request ID to prevent race conditions
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentRequestId = requestId;

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        this.showError('No active tab found');
        return;
      }

      // Request data extraction from content script
      chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_DATA', requestId }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError);
          const errMsg = chrome.runtime.lastError.message || '';
          if (errMsg.includes('Receiving end does not exist')) {
            this.showError('Content script not loaded. Refresh the page and try again.');
          } else {
            this.showError('Unable to communicate with the page. Make sure you are on a product page.');
          }
        }
      });

      // Set a timeout in case we don't get a response
      this.analysisTimeoutId = setTimeout(() => {
        // Only show error if this is still the current request and no data received
        if (this.currentRequestId === requestId && !this.currentData) {
          this.showError('Analysis timed out. Please try again.');
        }
      }, 10000);

    } catch (e) {
      console.error('Error starting analysis:', e);
      this.showError(e.message);
    }
  }

  async processResults() {
    try {
      // Guard against extraction errors
      if (this.currentData?.error) {
        this.showError('Could not analyze this page: ' + (this.currentData.error || 'unknown error'));
        return;
      }

      // Get current page URL for network fetches
      const pageUrl = this.currentData.pageInfo?.url;
      let baseUrl = null;
      try { baseUrl = pageUrl ? new URL(pageUrl).origin : null; } catch { if (DEBUG) console.log('Could not parse page URL:', pageUrl); }

      // Verify og:image format if present
      let imageVerification = null;
      const ogImage = this.currentData.metaTags?.openGraph?.image;

      if (ogImage) {
        imageVerification = await this.verifyImageFormat(ogImage);
      }

      // Fetch AI Discoverability network data
      let aiDiscoverabilityData = null;
      if (baseUrl) {
        aiDiscoverabilityData = await this.fetchAIDiscoverabilityData(baseUrl, pageUrl);
      }

      // Store for use by renderAiSignalInventory
      this.imageVerification = imageVerification;
      this.aiDiscoverabilityData = aiDiscoverabilityData;

      // Score the data
      const scoringEngine = new ScoringEngine(this.selectedContext);
      this.scoreResult = scoringEngine.calculateScore(this.currentData, imageVerification, aiDiscoverabilityData);

      // Generate AI Readiness recommendations
      const recEngine = new RecommendationEngine(
        this.scoreResult,
        this.currentData,
        imageVerification
      );
      this.recommendations = recEngine.generateRecommendations();

      // Generate Citation Opportunities (AI Readiness only)
      const citationEngine = new CitationOpportunityEngine(this.scoreResult, this.currentData);
      this.citationOpportunities = citationEngine.generateOpportunities();

      // Generate Content-to-Citation Roadmap (AI Readiness only)
      const roadmapEngine = new CitationRoadmapEngine(this.scoreResult, this.currentData);
      this.citationRoadmap = roadmapEngine.generateRoadmap();

      // Calculate PDP Quality score
      this.pdpScoreResult = scoringEngine.calculatePdpQualityScore(this.currentData);

      // Generate PDP Quality recommendations
      const pdpRecEngine = new PdpQualityRecommendationEngine(
        this.pdpScoreResult,
        this.currentData
      );
      this.pdpRecommendations = pdpRecEngine.generateRecommendations();

      // Calculate SEO Quality score
      this.seoScoreResult = scoringEngine.calculateSeoQualityScore(this.currentData);

      // Generate SEO Quality recommendations
      const seoRecEngine = new SeoQualityRecommendationEngine(
        this.seoScoreResult,
        this.currentData
      );
      this.seoRecommendations = seoRecEngine.generateRecommendations();

      // Display results
      this.displayResults();
      this.displayPdpResults();
      this.displaySeoResults();

      // Save to history
      await saveAnalysis({
        url: this.currentData.pageInfo?.url,
        pageInfo: this.currentData.pageInfo,
        scoreResult: this.scoreResult,
        recommendations: this.recommendations,
        pdpScoreResult: this.pdpScoreResult,
        pdpRecommendations: this.pdpRecommendations,
        seoScoreResult: this.seoScoreResult,
        seoRecommendations: this.seoRecommendations
      });

      // Refresh history
      await this.loadHistory();

    } catch (e) {
      console.error('Error processing results:', e);
      this.showError('Error processing analysis results: ' + e.message);
    }
  }

  async verifyImageFormat(url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'VERIFY_IMAGE_FORMAT', url },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Image verification error:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Fetch AI Discoverability network data
   * @param {string} baseUrl - Base URL of the site (origin)
   * @param {string} pageUrl - Full page URL
   * @returns {Promise<Object>} AI discoverability network data
   */
  async fetchAIDiscoverabilityData(baseUrl, pageUrl) {
    const [robots, llms, lastModified] = await Promise.all([
      this.fetchRobotsTxt(baseUrl),
      this.fetchLlmsTxt(baseUrl),
      this.fetchLastModified(pageUrl)
    ]);

    return { robots, llms, lastModified };
  }

  /**
   * Fetch and parse robots.txt for AI crawler rules
   * @param {string} baseUrl - Base URL of the site
   * @returns {Promise<Object>} Parsed robots.txt data
   */
  async fetchRobotsTxt(baseUrl) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'FETCH_ROBOTS_TXT', baseUrl },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('robots.txt fetch error:', chrome.runtime.lastError);
            resolve({ accessible: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Check for llms.txt files
   * @param {string} baseUrl - Base URL of the site
   * @returns {Promise<Object>} llms.txt presence data
   */
  async fetchLlmsTxt(baseUrl) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'FETCH_LLMS_TXT', baseUrl },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('llms.txt fetch error:', chrome.runtime.lastError);
            resolve({ found: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Fetch Last-Modified header for a URL
   * @param {string} url - URL to check
   * @returns {Promise<Object>} Last-Modified header data
   */
  async fetchLastModified(url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'FETCH_LAST_MODIFIED', url },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Last-Modified fetch error:', chrome.runtime.lastError);
            resolve({ accessible: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  displayResults() {
    this.hideLoading();
    this.hideContextSelector();
    this.showResults();

    // Update grade display
    const gradeEl = document.getElementById('gradeDisplay');
    gradeEl.textContent = this.scoreResult.grade;
    const validGrades = ['A', 'B', 'C', 'D', 'F'];
    const safeGrade = validGrades.includes(this.scoreResult.grade) ? this.scoreResult.grade : 'F';
    gradeEl.className = `grade grade-${safeGrade}`;

    // Update score
    document.getElementById('scoreValue').textContent = this.scoreResult.totalScore;

    // Update context label
    document.getElementById('contextLabel').textContent =
      `${this.selectedContext.charAt(0).toUpperCase() + this.selectedContext.slice(1)} Context`;

    // Update grade description
    document.getElementById('gradeDescription').textContent =
      getGradeDescription(this.scoreResult.grade);

    // Show JS-dependency warning when content scores may be understated
    const jsWarn = document.getElementById('jsDependencyWarning');
    jsWarn.classList.toggle('hidden', !this.scoreResult.jsDependent);

    // Show platform divergence note
    const platformNote = document.getElementById('platformDivergenceNote');
    if (platformNote) platformNote.style.display = 'flex';

    // Show page type badge
    this.updatePageTypeBadges();

    // Render category cards
    this.renderCategories();

    // Render recommendations
    this.renderRecommendations();

    // Render citation opportunities
    this.renderCitationOpportunities();

    // Render content-to-citation roadmap
    this.renderCitationRoadmap();

    // AI Signal Inventory (AI Visibility tab only)
    this.renderAiSignalInventory(this.currentData, this.scoreResult, this.imageVerification);
    document.getElementById('aiSignalInventorySection')?.classList.remove('hidden');

    // Raw Crawlable Text (AI Visibility tab only)
    this.renderRawCrawlableText(this.currentData);
    document.getElementById('rawCrawlableTextSection')?.classList.remove('hidden');
  }

  updatePageTypeBadges() {
    const pageType = this.scoreResult?.pageType || this.currentData?.pageType;
    if (!pageType || pageType.type === 'unknown') {
      // Hide all badges when type is unknown
      ['pageTypeBadge', 'pdpPageTypeBadge', 'seoPageTypeBadge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add('hidden'); }
      });
      return;
    }

    const labels = { pdp: 'Product Page', plp: 'Collection Page' };
    const label = labels[pageType.type] || 'Unknown Page Type';

    ['pageTypeBadge', 'pdpPageTypeBadge', 'seoPageTypeBadge'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = label;
        el.className = `page-type-badge page-type-${pageType.type}`;
        el.classList.remove('hidden');
      }
    });
  }

  renderCitationOpportunities() {
    const section = document.getElementById('citationOpportunitiesSection');
    const content = document.getElementById('citationContent');
    const toggle = document.getElementById('citationToggle');
    const icon = toggle?.querySelector('.citation-toggle-icon');

    if (!this.citationOpportunities || !section || !content) return;

    const { discovery = [], brand = [], toCapture = [], winning = [] } = this.citationOpportunities;
    const hasContent = discovery.length > 0 || brand.length > 0 || toCapture.length > 0 || winning.length > 0;

    if (!hasContent) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');

    let html = '';

    // Group 1 — Discovery & Category Queries
    if (discovery.length > 0) {
      html += `<div class="citation-group">
        <div class="citation-group-header discovery">Discovery & Category Queries (${discovery.length})</div>
        <div class="citation-item discovery">
          <div class="citation-item-query">${discovery.map(q => `"${escapeHtml(q)}"`).join(' · ')}</div>
        </div>
      </div>`;
    }

    // Group 2 — Brand Authority Queries
    if (brand.length > 0) {
      html += `<div class="citation-group">
        <div class="citation-group-header brand-auth">Brand Authority Queries (${brand.length})</div>
        <div class="citation-item brand-auth">
          <div class="citation-item-query">${brand.map(q => `"${escapeHtml(q)}"`).join(' · ')}</div>
        </div>
      </div>`;
    }

    // Group 3 — Queries to Capture (fail + warning, with priority badges)
    if (toCapture.length > 0) {
      html += `<div class="citation-group"><div class="citation-group-header to-capture">Queries to Capture (${toCapture.length})</div>`;
      toCapture.forEach(entry => {
        const badgeClass = entry.priority === 'critical' ? 'priority-critical' : 'priority-refine';
        const badgeLabel = entry.priority === 'critical' ? 'Critical' : 'Refine';
        html += `<div class="citation-item to-capture">
          <div class="citation-item-factor">${escapeHtml(entry.factorName)} <span style="font-weight:400;color:#9ca3af">· ${escapeHtml(entry.category)}</span>
            <span class="citation-priority-badge ${badgeClass}">${badgeLabel}</span>
          </div>
          <div class="citation-item-query">${entry.queries.map(q => `"${escapeHtml(q)}"`).join(' · ')}</div>
        </div>`;
      });
      html += '</div>';
    }

    // Group 4 — Queries You're Already Winning
    if (winning.length > 0) {
      html += `<div class="citation-group"><div class="citation-group-header winning">Queries You're Already Winning (${winning.length})</div>`;
      winning.forEach(entry => {
        html += `<div class="citation-item winning">
          <div class="citation-item-factor">${escapeHtml(entry.factorName)} <span style="font-weight:400;color:#9ca3af">· ${escapeHtml(entry.category)}</span></div>
          <div class="citation-item-query">${entry.queries.map(q => `"${escapeHtml(q)}"`).join(' · ')}</div>
        </div>`;
      });
      html += '</div>';
    }

    content.innerHTML = html;

    // Toggle handler is bound once in bindEvents()
  }

  renderCitationRoadmap() {
    const section = document.getElementById('citationRoadmapSection');
    const content = document.getElementById('citationRoadmapContent');

    if (!this.citationRoadmap || !section || !content) return;

    const { tiers, summary } = this.citationRoadmap;

    section.classList.remove('hidden');

    // All blocks present — show strong state
    if (tiers.length === 0) {
      content.innerHTML = `<div class="roadmap-strong-state">Content foundation is strong — all tracked content blocks are in place.</div>`;
      return;
    }

    const effortLabels = { low: 'Low effort', medium: 'Medium effort', high: 'High effort' };

    let html = '';
    tiers.forEach(tier => {
      html += `<div class="roadmap-tier">
        <div class="roadmap-tier-header">
          ${escapeHtml(tier.label)}
          <span class="roadmap-timeframe">${escapeHtml(tier.timeframe)}</span>
        </div>`;

      tier.blocks.forEach(block => {
        const platformText = block.platformNotes.map(n => `<strong>${escapeHtml(n.platform)}:</strong> ${escapeHtml(n.note)}`).join(' · ');
        html += `<div class="roadmap-block status-${block.status}">
          <div class="roadmap-block-header">
            <span class="roadmap-block-title">${escapeHtml(block.title)}</span>
            <span class="roadmap-status-badge ${block.status}">${block.status === 'missing' ? 'Missing' : 'Partial'}</span>
          </div>
          <div class="roadmap-impact">${escapeHtml(block.citationImpact)} · ${escapeHtml(effortLabels[block.effort] || block.effort)}</div>
          <div class="roadmap-queries">${block.queryExamples.map(q => `"${escapeHtml(q)}"`).join(' · ')}</div>
          ${platformText ? `<div class="roadmap-platform-notes">${platformText}</div>` : ''}
          <div class="roadmap-guidance">${escapeHtml(block.guidance)}</div>
        </div>`;
      });

      html += '</div>';
    });

    content.innerHTML = html;
  }

  /**
   * Render the AI Signal Inventory table in the AI Visibility tab.
   * Pulls data from extractedData, scoreResult category factors, and imageVerification.
   */
  renderAiSignalInventory(extractedData, scoreResult, imageVerification) {
    const container = document.getElementById('aiSignalInventoryContent');
    if (!container) return;

    const rows = [];

    // 1. Product Schema
    // schemas is a keyed object: { product: {...}, offer: {...}, faq: [...], ... }
    const schemas = extractedData?.structuredData?.schemas || {};
    // ProductGroup is stored under schemas.product when treated as product (see scoring-engine.js)
    // but content-script may store it separately — check both keys
    const productSchema = schemas.product || null;
    const hasProductSchema = !!(productSchema);
    let productSchemaDetail = 'Not found in page markup';
    if (hasProductSchema) {
      // Infer display type from schema data
      const schemaTypeName = productSchema?.isProductGroup ? 'ProductGroup' : 'Product';
      productSchemaDetail = schemaTypeName;
    }
    rows.push({
      label: 'Product Schema',
      tag: hasProductSchema ? 'FOUND' : 'MISSING',
      status: hasProductSchema ? 'pass' : 'fail',
      detail: productSchemaDetail
    });

    // 2. og:image Format
    let imgTag = 'UNKNOWN';
    let imgStatus = 'warn';
    let imgDetail = 'No og:image found';
    const ogImage = extractedData?.metaTags?.openGraph?.image;
    if (!ogImage) {
      imgTag = 'ABSENT';
      imgStatus = 'na';
      imgDetail = 'No og:image meta tag found';
    } else if (imageVerification) {
      if (imageVerification.isWebP) {
        imgTag = 'WEBP';
        imgStatus = 'fail';
        imgDetail = 'WebP — invisible in LLM chat';
      } else if (imageVerification.isValidFormat) {
        imgTag = (imageVerification.format || 'valid').toUpperCase();
        imgStatus = 'pass';
        imgDetail = `${(imageVerification.format || 'valid').toUpperCase()} format — LLM compatible`;
      } else {
        imgTag = (imageVerification.format || 'UNKNOWN').toUpperCase();
        imgStatus = 'warn';
        imgDetail = `${imageVerification.format || 'Unknown'} — verify compatibility`;
      }
    } else {
      // Infer from URL
      const urlLower = (ogImage || '').toLowerCase();
      if (/\.webp(\?|$)/.test(urlLower) || /[?&](auto=webp|fm=webp|f=webp|format=webp)(&|$)/.test(urlLower)) {
        imgTag = 'WEBP';
        imgStatus = 'fail';
        imgDetail = 'WebP — invisible in LLM chat';
      } else if (/\.jpe?g(\?|$)/.test(urlLower)) {
        imgTag = 'JPEG';
        imgStatus = 'pass';
        imgDetail = 'JPEG format — LLM compatible';
      } else if (/\.png(\?|$)/.test(urlLower)) {
        imgTag = 'PNG';
        imgStatus = 'pass';
        imgDetail = 'PNG format — LLM compatible';
      } else {
        imgTag = 'UNKNOWN';
        imgStatus = 'warn';
        imgDetail = 'Format not verified';
      }
    }
    rows.push({ label: 'og:image Format', tag: imgTag, status: imgStatus, detail: imgDetail });

    // 3. Description Length
    const wordCount = extractedData?.contentQuality?.description?.wordCount ?? 0;
    let descTag, descStatus;
    if (wordCount >= 150) {
      descTag = 'SUFFICIENT';
      descStatus = 'pass';
    } else if (wordCount >= 50) {
      descTag = 'THIN';
      descStatus = 'warn';
    } else {
      descTag = 'MISSING';
      descStatus = 'fail';
    }
    rows.push({
      label: 'Description Length',
      tag: descTag,
      status: descStatus,
      detail: `${wordCount} words · 150+ recommended`
    });

    // 4. GTIN / MPN — productSchema already resolved above
    const hasGtin = !!(productSchema?.gtin);
    const hasMpn = !!(productSchema?.mpn);
    const hasIdentifier = hasGtin || hasMpn;
    rows.push({
      label: 'GTIN / MPN',
      tag: hasIdentifier ? 'FOUND' : 'ABSENT',
      status: hasIdentifier ? 'pass' : 'na',
      detail: hasIdentifier ? 'Product identifier in schema' : 'No GTIN or MPN in schema'
    });

    // 5. AI Crawler Access — read from scoreResult factors (computed from robots networkData)
    let crawlerTag = 'UNKNOWN';
    let crawlerStatus = 'warn';
    let crawlerDetail = 'robots.txt not checked';
    const aiDiscCat = scoreResult?.categoryScores?.aiDiscoverability;
    if (aiDiscCat) {
      const crawlerFactor = aiDiscCat.factors?.find(f => f.name === 'AI Crawler Access');
      if (crawlerFactor) {
        if (crawlerFactor.status === 'pass') {
          crawlerTag = 'ALL ALLOWED';
          crawlerStatus = 'pass';
          crawlerDetail = crawlerFactor.details || 'All major AI crawlers allowed';
        } else if (crawlerFactor.status === 'fail') {
          crawlerTag = 'BLOCKED';
          crawlerStatus = 'fail';
          crawlerDetail = crawlerFactor.details || 'AI crawlers blocked';
        } else {
          crawlerTag = 'SOME BLOCKED';
          crawlerStatus = 'warn';
          crawlerDetail = crawlerFactor.details || 'Partial AI crawler access';
        }
      }
    }
    rows.push({ label: 'AI Crawler Access', tag: crawlerTag, status: crawlerStatus, detail: crawlerDetail });

    // 6. llms.txt — read from scoreResult factors
    let llmsTag = 'ABSENT';
    let llmsStatus = 'na';
    let llmsDetail = 'No llms.txt found';
    if (aiDiscCat) {
      const llmsFactor = aiDiscCat.factors?.find(f => f.name === 'llms.txt Presence');
      if (llmsFactor) {
        if (llmsFactor.status === 'pass') {
          llmsTag = 'FOUND';
          llmsStatus = 'pass';
          llmsDetail = llmsFactor.details || 'llms.txt found';
        } else {
          llmsTag = 'ABSENT';
          llmsStatus = 'na';
          llmsDetail = llmsFactor.details || 'No llms.txt found';
        }
      }
    }
    rows.push({ label: 'llms.txt', tag: llmsTag, status: llmsStatus, detail: llmsDetail });

    // 7. Entity Consistency — read from scoreResult factors
    let entityTag = 'UNKNOWN';
    let entityStatus = 'warn';
    let entityDetail = 'Could not check entity consistency';
    if (aiDiscCat) {
      const entityFactor = aiDiscCat.factors?.find(f => f.name === 'Entity Consistency');
      if (entityFactor) {
        if (entityFactor.status === 'pass') {
          entityTag = 'PASS';
          entityStatus = 'pass';
          entityDetail = entityFactor.details || 'Product name consistent across page elements';
        } else if (entityFactor.status === 'warning') {
          entityTag = 'PARTIAL';
          entityStatus = 'warn';
          entityDetail = entityFactor.details || 'Product name partially consistent';
        } else {
          entityTag = 'FAIL';
          entityStatus = 'fail';
          entityDetail = entityFactor.details || 'Product name not consistent across page elements';
        }
      }
    }
    rows.push({ label: 'Entity Consistency', tag: entityTag, status: entityStatus, detail: entityDetail });

    // 8. Answer-Format Content
    const answerFormat = extractedData?.aiDiscoverability?.answerFormat;
    const hasAnyAnswerFormat = !!(
      answerFormat?.bestForCount > 0 ||
      answerFormat?.hasComparison ||
      answerFormat?.hasHowTo ||
      answerFormat?.useCaseCount > 0
    );
    rows.push({
      label: 'Answer-Format Content',
      tag: hasAnyAnswerFormat ? 'FOUND' : 'MISSING',
      status: hasAnyAnswerFormat ? 'pass' : 'fail',
      detail: hasAnyAnswerFormat
        ? [
            answerFormat?.bestForCount > 0 ? `${answerFormat.bestForCount} "best for"` : null,
            answerFormat?.hasComparison ? 'comparison' : null,
            answerFormat?.hasHowTo ? 'how-to' : null,
            answerFormat?.useCaseCount > 0 ? `${answerFormat.useCaseCount} use case${answerFormat.useCaseCount !== 1 ? 's' : ''}` : null
          ].filter(Boolean).join(' · ')
        : 'No "best for", comparison, how-to, or use case content found'
    });

    container.innerHTML = rows.map(row => `
      <div class="ai-signal-row">
        <div class="ai-signal-info">
          <span class="ai-signal-label">${escapeHtml(row.label)}</span>
          <span class="ai-signal-detail">${escapeHtml(row.detail)}</span>
        </div>
        <span class="ai-signal-tag ai-tag-${row.status}">${escapeHtml(row.tag)}</span>
      </div>
    `).join('');
  }

  /**
   * Render the Raw Crawlable Text viewer in the AI Visibility tab.
   */
  renderRawCrawlableText(extractedData) {
    const container = document.getElementById('rawCrawlableTextContent');
    if (!container) return;

    const descText = extractedData?.contentQuality?.description?.text || '';
    const fullText = extractedData?.rawPageText || '';
    const domText = extractedData?.rawDomText || '';

    const descWordCount = extractedData?.contentQuality?.description?.wordCount ?? 0;
    const fullWordCount = fullText.trim().split(/\s+/).filter(w => w.length > 0).length;
    const domWordCount = domText.trim().split(/\s+/).filter(w => w.length > 0).length;

    container.innerHTML = `
      <div class="raw-text-area-label">Product Description</div>
      <div class="raw-text-scroll">${descText ? escapeHtml(descText) : 'No product description detected'}</div>
      <div class="raw-text-word-count">~${descWordCount.toLocaleString()} words of product content detected</div>
      ${descText ? '<button class="raw-text-copy-btn" id="copyDescTextBtn">&#8663; Copy product description</button>' : ''}
      <div class="raw-text-area-label">Full page (includes nav &amp; footer)</div>
      <div class="raw-text-scroll">${escapeHtml(fullText)}</div>
      <div class="raw-text-word-count">~${fullWordCount.toLocaleString()} words total</div>
      <button class="raw-text-copy-btn" id="copyRawTextBtn">&#8663; Copy full page text</button>
      <div class="raw-text-area-label">Full page (raw HTML parser view)</div>
      <div class="raw-text-scroll">${escapeHtml(domText)}</div>
      <div class="raw-text-word-count">~${domWordCount.toLocaleString()} words (includes hidden elements)</div>
      <button class="raw-text-copy-btn" id="copyDomTextBtn">&#8663; Copy text-only DOM</button>
    `;

    const copyDescBtn = document.getElementById('copyDescTextBtn');
    if (copyDescBtn) copyDescBtn.onclick = () => { navigator.clipboard.writeText(descText).catch(() => {}); };
    const copyBtn = document.getElementById('copyRawTextBtn');
    if (copyBtn) copyBtn.onclick = () => { navigator.clipboard.writeText(fullText).catch(() => {}); };
    const copyDomBtn = document.getElementById('copyDomTextBtn');
    if (copyDomBtn) copyDomBtn.onclick = () => { navigator.clipboard.writeText(domText).catch(() => {}); };
  }

  renderCategories() {
    const container = document.getElementById('categoryList');
    container.innerHTML = '';

    const categoryOrder = [
      'structuredData',
      'protocolMeta',
      'contentQuality',
      'contentStructure',
      'authorityTrust',
      'aiDiscoverability'
    ];

    categoryOrder.forEach(key => {
      const data = this.scoreResult.categoryScores[key];
      if (!data) return;

      const card = document.createElement('div');
      card.className = 'category-card';

      // Determine score class
      const scoreClass = data.score >= 80 ? 'score-high' :
                         data.score >= 60 ? 'score-medium' : 'score-low';

      card.innerHTML = `
        <div class="category-header" data-expanded="false">
          <span class="category-name" title="${escapeHtml(CATEGORY_DESCRIPTIONS[key] || '')}">${data.categoryName}</span>
          <span class="category-score ${scoreClass}">${Math.round(data.score)}</span>
          <span class="expand-icon">+</span>
        </div>
        <div class="category-details hidden">
          ${this.renderFactors(data.factors)}
        </div>
      `;

      // Event handlers are delegated via categoryList click listener in bindEvents()
      container.appendChild(card);
    });
  }

  renderFactors(factors) {
    return factors.map(f => {
      const statusIcon = f.status === 'pass' ? '✓' :
                         f.status === 'fail' ? '✗' : '⚠';
      const contextualLabel = f.contextual ? '<span class="multiplier">CTX</span>' : '';

      // Get recommendation if factor has a mapping
      const recId = FACTOR_RECOMMENDATIONS[f.name];
      const rec = recId ? RECOMMENDATION_TEMPLATES[recId] : null;

      const expandBtn = rec ? '<button class="factor-expand-btn">▶</button>' : '';
      const recSection = rec ? `
        <div class="factor-recommendation hidden">
          <p class="factor-rec-text">${rec.description}</p>
          <p class="factor-rec-impl">${rec.implementation}</p>
        </div>
      ` : '';

      return `
        <div class="factor ${f.status}${rec ? ' has-recommendation' : ''}">
          <div class="factor-row">
            ${expandBtn}
            <span class="factor-name">${f.name}${contextualLabel}</span>
            <span class="factor-status">${statusIcon}</span>
            <span class="factor-points">${f.points}/${f.maxPoints}</span>
          </div>
          ${recSection}
        </div>
      `;
    }).join('');
  }

  renderRecommendations() {
    const container = document.getElementById('recommendationList');
    container.innerHTML = '';

    // Update count
    document.getElementById('recCount').textContent = this.recommendations.length;

    // Show top 10 recommendations
    this.recommendations.slice(0, 10).forEach(rec => {
      const item = document.createElement('div');
      item.className = `recommendation impact-${rec.impact}`;

      item.innerHTML = `
        <div class="rec-header">
          <span class="rec-title">${escapeHtml(rec.title)}</span>
          <span class="rec-badges">
            <span class="badge impact-badge ${escapeHtml(rec.impact)}">Impact: ${escapeHtml(rec.impact.charAt(0).toUpperCase() + rec.impact.slice(1))}</span>
            <span class="badge effort-badge ${escapeHtml(rec.effort)}">Effort: ${escapeHtml(rec.effort.charAt(0).toUpperCase() + rec.effort.slice(1))}</span>
          </span>
        </div>
        <p class="rec-description">${escapeHtml(rec.description)}</p>
        ${rec.implementation ? `<p class="rec-implementation">${escapeHtml(rec.implementation)}</p>` : ''}
      `;

      container.appendChild(item);
    });

    if (this.recommendations.length === 0) {
      container.innerHTML = '<p class="empty-state">No recommendations - great job!</p>';
    }
  }

  displayPdpResults() {
    if (!this.pdpScoreResult) return;

    // Update PDP grade display
    const gradeEl = document.getElementById('pdpGradeDisplay');
    gradeEl.textContent = this.pdpScoreResult.grade;
    const validGrades = ['A', 'B', 'C', 'D', 'F'];
    const safeGrade = validGrades.includes(this.pdpScoreResult.grade) ? this.pdpScoreResult.grade : 'F';
    gradeEl.className = `grade grade-${safeGrade}`;

    // Update PDP score
    document.getElementById('pdpScoreValue').textContent = this.pdpScoreResult.totalScore;

    // Update PDP context label
    document.getElementById('pdpContextLabel').textContent =
      `${this.selectedContext.charAt(0).toUpperCase() + this.selectedContext.slice(1)} Context`;

    // Update PDP grade description
    document.getElementById('pdpGradeDescription').textContent =
      getPdpGradeDescription(this.pdpScoreResult.grade);

    // Show JS-dependency warning when content scores may be understated
    document.getElementById('pdpJsDependencyWarning').classList.toggle('hidden', !this.scoreResult?.jsDependent);

    // Render PDP category cards
    this.renderPdpCategories();

    // Render PDP recommendations
    this.renderPdpRecommendations();
  }

  renderPdpCategories() {
    const container = document.getElementById('pdpCategoryList');
    container.innerHTML = '';

    const categoryOrder = [
      'purchaseExperience',
      'trustConfidence',
      'visualPresentation',
      'contentCompleteness',
      'reviewsSocialProof'
    ];

    categoryOrder.forEach(key => {
      const data = this.pdpScoreResult.categoryScores[key];
      if (!data) return;

      const card = document.createElement('div');
      card.className = 'category-card';

      const scoreClass = data.score >= 80 ? 'score-high' :
                         data.score >= 60 ? 'score-medium' : 'score-low';

      card.innerHTML = `
        <div class="category-header" data-expanded="false">
          <span class="category-name" title="${escapeHtml(PDP_CATEGORY_DESCRIPTIONS[key] || '')}">${data.categoryName}</span>
          <span class="category-score ${scoreClass}">${Math.round(data.score)}</span>
          <span class="expand-icon">+</span>
        </div>
        <div class="category-details hidden">
          ${this.renderPdpFactors(data.factors)}
        </div>
      `;

      container.appendChild(card);
    });
  }

  renderPdpFactors(factors) {
    return factors.map(f => {
      const statusIcon = f.status === 'pass' ? '✓' :
                         f.status === 'fail' ? '✗' : '⚠';
      const contextualLabel = f.contextual ? '<span class="multiplier">CTX</span>' : '';

      const recId = PDP_FACTOR_RECOMMENDATIONS[f.name];
      const rec = recId ? PDP_RECOMMENDATION_TEMPLATES[recId] : null;

      const expandBtn = rec ? '<button class="factor-expand-btn">▶</button>' : '';
      const recSection = rec ? `
        <div class="factor-recommendation hidden">
          <p class="factor-rec-text">${rec.description}</p>
          <p class="factor-rec-impl">${rec.implementation}</p>
        </div>
      ` : '';

      return `
        <div class="factor ${f.status}${rec ? ' has-recommendation' : ''}">
          <div class="factor-row">
            ${expandBtn}
            <span class="factor-name">${f.name}${contextualLabel}</span>
            <span class="factor-status">${statusIcon}</span>
            <span class="factor-points">${f.points}/${f.maxPoints}</span>
          </div>
          ${recSection}
        </div>
      `;
    }).join('');
  }

  renderPdpRecommendations() {
    const container = document.getElementById('pdpRecommendationList');
    container.innerHTML = '';

    document.getElementById('pdpRecCount').textContent = this.pdpRecommendations.length;

    this.pdpRecommendations.slice(0, 10).forEach(rec => {
      const item = document.createElement('div');
      item.className = `recommendation impact-${rec.impact}`;

      item.innerHTML = `
        <div class="rec-header">
          <span class="rec-title">${escapeHtml(rec.title)}</span>
          <span class="rec-badges">
            <span class="badge impact-badge ${escapeHtml(rec.impact)}">Impact: ${escapeHtml(rec.impact.charAt(0).toUpperCase() + rec.impact.slice(1))}</span>
            <span class="badge effort-badge ${escapeHtml(rec.effort)}">Effort: ${escapeHtml(rec.effort.charAt(0).toUpperCase() + rec.effort.slice(1))}</span>
          </span>
        </div>
        <p class="rec-description">${escapeHtml(rec.description)}</p>
        ${rec.implementation ? `<p class="rec-implementation">${escapeHtml(rec.implementation)}</p>` : ''}
      `;

      container.appendChild(item);
    });

    if (this.pdpRecommendations.length === 0) {
      container.innerHTML = '<p class="empty-state">No recommendations - great job!</p>';
    }
  }

  displaySeoResults() {
    if (!this.seoScoreResult) return;

    const gradeEl = document.getElementById('seoGradeDisplay');
    gradeEl.textContent = this.seoScoreResult.grade;
    const validGrades = ['A', 'B', 'C', 'D', 'F'];
    const safeGrade = validGrades.includes(this.seoScoreResult.grade) ? this.seoScoreResult.grade : 'F';
    gradeEl.className = `grade grade-${safeGrade}`;

    document.getElementById('seoScoreValue').textContent = this.seoScoreResult.totalScore;
    document.getElementById('seoGradeDescription').textContent =
      getSeoGradeDescription(this.seoScoreResult.grade);

    // Show JS-dependency warning when content scores may be understated
    document.getElementById('seoJsDependencyWarning').classList.toggle('hidden', !this.scoreResult?.jsDependent);

    this.renderSeoCategories();
    this.renderSeoRecommendations();
  }

  renderSeoCategories() {
    const container = document.getElementById('seoCategoryList');
    container.innerHTML = '';

    const categoryOrder = [
      'titleMeta',
      'technicalFoundations',
      'contentSignals',
      'navigationDiscovery'
    ];

    categoryOrder.forEach(key => {
      const data = this.seoScoreResult.categoryScores[key];
      if (!data) return;

      const card = document.createElement('div');
      card.className = 'category-card';

      const scoreClass = data.score >= 80 ? 'score-high' :
                         data.score >= 60 ? 'score-medium' : 'score-low';

      card.innerHTML = `
        <div class="category-header" data-expanded="false">
          <span class="category-name" title="${escapeHtml(SEO_CATEGORY_DESCRIPTIONS[key] || '')}">${data.categoryName}</span>
          <span class="category-score ${scoreClass}">${Math.round(data.score)}</span>
          <span class="expand-icon">+</span>
        </div>
        <div class="category-details hidden">
          ${this.renderSeoFactors(data.factors)}
        </div>
      `;

      container.appendChild(card);
    });
  }

  renderSeoFactors(factors) {
    return factors.map(f => {
      const statusIcon = f.status === 'pass' ? '✓' :
                         f.status === 'fail' ? '✗' : '⚠';

      const recId = SEO_FACTOR_RECOMMENDATIONS[f.name];
      const rec = recId ? SEO_RECOMMENDATION_TEMPLATES[recId] : null;

      const expandBtn = rec ? '<button class="factor-expand-btn">▶</button>' : '';
      const recSection = rec ? `
        <div class="factor-recommendation hidden">
          <p class="factor-rec-text">${rec.description}</p>
          <p class="factor-rec-impl">${rec.implementation}</p>
        </div>
      ` : '';

      return `
        <div class="factor ${f.status}${rec ? ' has-recommendation' : ''}">
          <div class="factor-row">
            ${expandBtn}
            <span class="factor-name">${f.name}</span>
            <span class="factor-status">${statusIcon}</span>
            <span class="factor-points">${f.points}/${f.maxPoints}</span>
          </div>
          ${recSection}
        </div>
      `;
    }).join('');
  }

  renderSeoRecommendations() {
    const container = document.getElementById('seoRecommendationList');
    container.innerHTML = '';

    document.getElementById('seoRecCount').textContent = this.seoRecommendations.length;

    this.seoRecommendations.slice(0, 10).forEach(rec => {
      const item = document.createElement('div');
      item.className = `recommendation impact-${rec.impact}`;

      item.innerHTML = `
        <div class="rec-header">
          <span class="rec-title">${escapeHtml(rec.title)}</span>
          <span class="rec-badges">
            <span class="badge impact-badge ${escapeHtml(rec.impact)}">Impact: ${escapeHtml(rec.impact.charAt(0).toUpperCase() + rec.impact.slice(1))}</span>
            <span class="badge effort-badge ${escapeHtml(rec.effort)}">Effort: ${escapeHtml(rec.effort.charAt(0).toUpperCase() + rec.effort.slice(1))}</span>
          </span>
        </div>
        <p class="rec-description">${escapeHtml(rec.description)}</p>
        ${rec.currentValue != null ? `
        <div class="rec-current">
          <span class="rec-current-label">Current:</span>
          <span class="rec-current-value">${escapeHtml(rec.currentValue)}</span>
          ${rec.charCount != null ? `<span class="rec-current-meta">${rec.charCount} chars${rec.charTarget ? ` &middot; target: ${escapeHtml(rec.charTarget)}` : ''}</span>` : ''}
        </div>` : ''}
        ${rec.implementation ? `<p class="rec-implementation">${escapeHtml(rec.implementation)}</p>` : ''}
      `;

      container.appendChild(item);
    });

    if (this.seoRecommendations.length === 0) {
      container.innerHTML = '<p class="empty-state">No recommendations - great job!</p>';
    }
  }

  async loadHistory() {
    const history = await getHistory();
    const container = document.getElementById('historyList');
    const emptyState = document.getElementById('emptyHistory');

    container.innerHTML = '';

    if (history.length === 0) {
      emptyState.classList.remove('hidden');
      this.updateCompareButton();
      return;
    }

    emptyState.classList.add('hidden');

    history.slice(0, 20).forEach(entry => {
      const item = document.createElement('div');
      item.className = 'history-item';
      if (this.selectedHistoryIds.includes(entry.id)) {
        item.classList.add('selected');
      }
      item.dataset.historyId = entry.id;

      const gradeColor = this.getGradeColor(entry.grade);
      const timeAgo = this.formatTimeAgo(entry.timestamp);

      // Grade badges: AI (primary) + PDP (secondary) + SEO (tertiary)
      const pdpGradeBadge = entry.pdpGrade
        ? `<div class="history-grade history-grade-sm" style="background: ${this.getGradeColor(entry.pdpGrade)}" title="PDP Quality">${escapeHtml(entry.pdpGrade)}</div>`
        : '';
      const seoGradeBadge = entry.seoGrade
        ? `<div class="history-grade history-grade-sm" style="background: ${this.getGradeColor(entry.seoGrade)}" title="SEO Quality">${escapeHtml(entry.seoGrade)}</div>`
        : '';

      item.innerHTML = `
        <div class="history-grades">
          <div class="history-grade" style="background: ${gradeColor}" title="AI Readiness">${escapeHtml(entry.grade)}</div>
          ${pdpGradeBadge}
          ${seoGradeBadge}
        </div>
        <div class="history-info">
          <div class="history-title" title="${escapeHtml(entry.title)}">${escapeHtml(entry.title)}</div>
          <div class="history-meta">${escapeHtml(entry.domain)} · ${escapeHtml(timeAgo)}</div>
        </div>
        <div class="history-score">${escapeHtml(entry.score)}</div>
      `;

      item.addEventListener('click', () => this.toggleHistorySelection(entry.id));
      container.appendChild(item);
    });

    this.updateCompareButton();
  }

  toggleHistorySelection(id) {
    const idx = this.selectedHistoryIds.indexOf(id);
    if (idx !== -1) {
      // Deselect
      this.selectedHistoryIds.splice(idx, 1);
    } else if (this.selectedHistoryIds.length < 2) {
      // Select (max 2)
      this.selectedHistoryIds.push(id);
    } else {
      // Already 2 selected — replace the oldest selection
      this.selectedHistoryIds.shift();
      this.selectedHistoryIds.push(id);
    }

    // Update visual state without full re-render
    document.querySelectorAll('#historyList .history-item').forEach(el => {
      const isSelected = this.selectedHistoryIds.includes(el.dataset.historyId);
      el.classList.toggle('selected', isSelected);
    });

    this.updateCompareButton();
  }

  updateCompareButton() {
    const compareBtn = document.getElementById('compareBtn');
    const compareHint = document.getElementById('compareHint');
    const count = this.selectedHistoryIds.length;

    if (count === 0) {
      compareBtn.classList.add('hidden');
      compareHint.classList.add('hidden');
    } else if (count === 1) {
      compareBtn.classList.add('hidden');
      compareHint.classList.remove('hidden');
    } else {
      compareBtn.classList.remove('hidden');
      compareHint.classList.add('hidden');
    }
  }

  async showCompareView() {
    if (this.selectedHistoryIds.length !== 2) return;

    const history = await getHistory();
    const entries = this.selectedHistoryIds.map(id => history.find(e => e.id === id)).filter(Boolean);
    if (entries.length !== 2) return;

    document.getElementById('historyListView').classList.add('hidden');
    document.getElementById('historyCompareView').classList.remove('hidden');

    this.renderCompare(entries[0], entries[1]);
  }

  showHistoryListView() {
    document.getElementById('historyCompareView').classList.add('hidden');
    document.getElementById('historyListView').classList.remove('hidden');
  }

  renderCompare(a, b) {
    const categoryOrder = [
      'structuredData',
      'protocolMeta',
      'contentQuality',
      'contentStructure',
      'authorityTrust',
      'aiDiscoverability'
    ];

    const pdpCategoryOrder = [
      'purchaseExperience',
      'trustConfidence',
      'visualPresentation',
      'contentCompleteness',
      'reviewsSocialProof'
    ];

    const seoCategoryOrder = [
      'titleMeta',
      'technicalFoundations',
      'contentSignals',
      'navigationDiscovery'
    ];

    const colHtml = (entry) => {
      const gradeColor = this.getGradeColor(entry.grade);
      const catRows = categoryOrder
        .filter(k => entry.categoryScores?.[k])
        .map(k => {
          const cat = entry.categoryScores[k];
          const score = Math.round(cat.score);
          const cls = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';
          const shortName = (cat.name || k).replace(/&|and/gi, '&').split(' ').slice(0, 2).join(' ');
          return `
            <div class="compare-cat-row">
              <span class="compare-cat-name" title="${escapeHtml(cat.name)}">${escapeHtml(shortName)}</span>
              <span class="compare-cat-score ${cls}">${score}</span>
            </div>`;
        }).join('');

      // PDP Quality section (if entry has PDP scores)
      let pdpSection = '';
      if (entry.pdpGrade && entry.pdpCategoryScores) {
        const pdpGradeColor = this.getGradeColor(entry.pdpGrade);
        const pdpCatRows = pdpCategoryOrder
          .filter(k => entry.pdpCategoryScores?.[k])
          .map(k => {
            const cat = entry.pdpCategoryScores[k];
            const score = Math.round(cat.score);
            const cls = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';
            const shortName = (cat.name || k).replace(/&|and/gi, '&').split(' ').slice(0, 2).join(' ');
            return `
              <div class="compare-cat-row">
                <span class="compare-cat-name" title="${escapeHtml(cat.name)}">${escapeHtml(shortName)}</span>
                <span class="compare-cat-score ${cls}">${score}</span>
              </div>`;
          }).join('');

        pdpSection = `
          <div class="compare-score-hero" style="border-top:1px solid var(--border-color)">
            <div class="compare-section-label">PDP Quality</div>
            <div class="compare-grade" style="color:${pdpGradeColor}">${escapeHtml(entry.pdpGrade)}</div>
            <div class="compare-total">${escapeHtml(entry.pdpScore)}/100</div>
          </div>
          <div class="compare-categories">${pdpCatRows}</div>`;
      } else {
        pdpSection = `
          <div class="compare-score-hero" style="border-top:1px solid var(--border-color)">
            <div class="compare-section-label">PDP Quality</div>
            <div class="compare-total" style="color:var(--text-tertiary)">N/A</div>
          </div>`;
      }

      // SEO Quality section
      let seoSection = '';
      if (entry.seoGrade && entry.seoCategoryScores) {
        const seoGradeColor = this.getGradeColor(entry.seoGrade);
        const seoCatRows = seoCategoryOrder
          .filter(k => entry.seoCategoryScores?.[k])
          .map(k => {
            const cat = entry.seoCategoryScores[k];
            const score = Math.round(cat.score);
            const cls = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';
            const shortName = (cat.name || k).replace(/&|and/gi, '&').split(' ').slice(0, 2).join(' ');
            return `
              <div class="compare-cat-row">
                <span class="compare-cat-name" title="${escapeHtml(cat.name)}">${escapeHtml(shortName)}</span>
                <span class="compare-cat-score ${cls}">${score}</span>
              </div>`;
          }).join('');

        seoSection = `
          <div class="compare-score-hero" style="border-top:1px solid var(--border-color)">
            <div class="compare-section-label">SEO Quality</div>
            <div class="compare-grade" style="color:${seoGradeColor}">${escapeHtml(entry.seoGrade)}</div>
            <div class="compare-total">${escapeHtml(entry.seoScore)}/100</div>
          </div>
          <div class="compare-categories">${seoCatRows}</div>`;
      } else {
        seoSection = `
          <div class="compare-score-hero" style="border-top:1px solid var(--border-color)">
            <div class="compare-section-label">SEO Quality</div>
            <div class="compare-total" style="color:var(--text-tertiary)">N/A</div>
          </div>`;
      }

      return `
        <div class="compare-col">
          <div class="compare-col-header">
            <div class="compare-col-domain" title="${escapeHtml(entry.url || '')}">${escapeHtml(entry.domain)}</div>
            <div class="compare-col-title" title="${escapeHtml(entry.title)}">${escapeHtml(entry.title)}</div>
          </div>
          <div class="compare-score-hero">
            <div class="compare-section-label">AI Readiness</div>
            <div class="compare-grade" style="color:${gradeColor}">${escapeHtml(entry.grade)}</div>
            <div class="compare-total">${escapeHtml(entry.score)}/100</div>
          </div>
          <div class="compare-categories">${catRows}</div>
          ${pdpSection}
          ${seoSection}
        </div>`;
    };

    document.getElementById('compareContent').innerHTML = `
      <div class="compare-columns">
        ${colHtml(a)}
        ${colHtml(b)}
      </div>`;
  }

  getGradeColor(grade) {
    const style = getComputedStyle(document.documentElement);
    const varMap = { A: '--grade-a', B: '--grade-b', C: '--grade-c', D: '--grade-d', F: '--grade-f' };
    const varName = varMap[grade] || '--grade-f';
    return style.getPropertyValue(varName).trim() || '#ef4444';
  }

  formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return new Date(timestamp).toLocaleDateString();
  }

  exportData() {
    if (!this.currentData || !this.scoreResult) return;

    const domain = this.currentData.pageInfo?.domain || 'unknown';
    const date = new Date().toISOString().split('T')[0];

    const payload = {
      exportedAt: new Date().toISOString(),
      pageUrl: this.currentData.pageInfo?.url,
      pageTitle: this.currentData.pageInfo?.title,
      domain,
      context: this.selectedContext,
      extraction: this.currentData,
      scoring: this.scoreResult,
      recommendations: this.recommendations,
      pdpScoring: this.pdpScoreResult,
      pdpRecommendations: this.pdpRecommendations,
      seoScoring: this.seoScoreResult,
      seoRecommendations: this.seoRecommendations
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdpiq-${domain}-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportHtmlReport() {
    if (!this.currentData || !this.scoreResult) return;

    const domain = this.currentData.pageInfo?.domain || 'unknown';
    const date = new Date().toISOString().split('T')[0];

    const html = generateHtmlReport(
      this.scoreResult,
      this.currentData.pageInfo,
      this.recommendations,
      this.selectedContext,
      this.pdpScoreResult,
      this.pdpRecommendations,
      this.seoScoreResult,
      this.seoRecommendations,
      this.citationOpportunities,
      this.citationRoadmap
    );

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdpiq-report-${domain}-${date}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  switchTab(tab) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Show/hide sections
    if (tab === 'results') {
      document.getElementById('historySection').classList.add('hidden');
      document.getElementById('pdpView').classList.add('hidden');
      document.getElementById('seoView').classList.add('hidden');
      document.getElementById('loadingState').classList.add('hidden');
      document.getElementById('errorState').classList.add('hidden');

      if (this.scoreResult) {
        this.showResults();
      } else if (this.currentRequestId) {
        this.showLoading();
      } else {
        this.showContextSelector();
      }
    } else if (tab === 'pdp') {
      document.getElementById('historySection').classList.add('hidden');
      document.getElementById('results').classList.add('hidden');
      document.getElementById('seoView').classList.add('hidden');
      document.getElementById('loadingState').classList.add('hidden');
      document.getElementById('errorState').classList.add('hidden');

      if (this.pdpScoreResult) {
        this.showPdpView();
      } else if (this.currentRequestId) {
        this.showLoading();
      } else {
        this.showContextSelector();
      }
    } else if (tab === 'seo') {
      document.getElementById('historySection').classList.add('hidden');
      document.getElementById('results').classList.add('hidden');
      document.getElementById('pdpView').classList.add('hidden');
      document.getElementById('loadingState').classList.add('hidden');
      document.getElementById('errorState').classList.add('hidden');

      if (this.seoScoreResult) {
        this.showSeoView();
      } else if (this.currentRequestId) {
        this.showLoading();
      } else {
        this.showContextSelector();
      }
    } else if (tab === 'history') {
      document.getElementById('contextSelector').classList.add('hidden');
      document.getElementById('results').classList.add('hidden');
      document.getElementById('pdpView').classList.add('hidden');
      document.getElementById('seoView').classList.add('hidden');
      document.getElementById('loadingState').classList.add('hidden');
      document.getElementById('errorState').classList.add('hidden');
      document.getElementById('historySection').classList.remove('hidden');
    }
  }

  showContextSelector() {
    document.getElementById('contextSelector').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('pdpView').classList.add('hidden');
    document.getElementById('seoView').classList.add('hidden');
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('historySection').classList.add('hidden');
    const platformNote = document.getElementById('platformDivergenceNote');
    if (platformNote) platformNote.style.display = 'none';
    document.getElementById('aiSignalInventorySection')?.classList.add('hidden');
    document.getElementById('rawCrawlableTextSection')?.classList.add('hidden');
  }

  hideContextSelector() {
    document.getElementById('contextSelector').classList.add('hidden');
  }

  showLoading() {
    document.getElementById('contextSelector').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('pdpView').classList.add('hidden');
    document.getElementById('seoView').classList.add('hidden');
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('historySection').classList.add('hidden');
    const platformNote = document.getElementById('platformDivergenceNote');
    if (platformNote) platformNote.style.display = 'none';
    document.getElementById('aiSignalInventorySection')?.classList.add('hidden');
    document.getElementById('rawCrawlableTextSection')?.classList.add('hidden');
  }

  hideLoading() {
    document.getElementById('loadingState').classList.add('hidden');
  }

  showResults() {
    document.getElementById('contextSelector').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('pdpView').classList.add('hidden');
    document.getElementById('seoView').classList.add('hidden');
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('historySection').classList.add('hidden');
  }

  showPdpView() {
    document.getElementById('contextSelector').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('pdpView').classList.remove('hidden');
    document.getElementById('seoView').classList.add('hidden');
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('historySection').classList.add('hidden');
  }

  showSeoView() {
    document.getElementById('contextSelector').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('pdpView').classList.add('hidden');
    document.getElementById('seoView').classList.remove('hidden');
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('historySection').classList.add('hidden');
  }

  showError(message) {
    document.getElementById('contextSelector').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('pdpView').classList.add('hidden');
    document.getElementById('seoView').classList.add('hidden');
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.remove('hidden');
    document.getElementById('historySection').classList.add('hidden');
    document.getElementById('errorMessage').textContent = message;
  }
}

// Initialize the app
new SidePanelApp();
