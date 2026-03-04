/**
 * HTML Report Template
 * Generates a self-contained, print-ready HTML report from a pdpIQ analysis result.
 */

/** Tribbute logo (PNG, base64-encoded for self-contained reports) */
const TRIBBUTE_LOGO_BASE64 = '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';

/**
 * Returns an inline SVG gauge/ring for the overall score.
 * @param {number} score 0–100
 * @param {string} grade A–F
 */
function scoreGaugeSvg(score, grade) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const fill = Math.max(0, Math.min(1, score / 100));
  const dash = fill * circumference;
  const gradeColors = { A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', F: '#ef4444' };
  const color = gradeColors[grade] || '#ef4444';
  return `
    <svg viewBox="0 0 120 120" width="120" height="120" style="transform:rotate(-90deg)">
      <circle cx="60" cy="60" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="10"/>
      <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${color}" stroke-width="10"
        stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}"
        stroke-linecap="round"/>
    </svg>`;
}

/**
 * Returns a status badge HTML string.
 * @param {string} status pass|warning|fail|unknown
 */
function statusBadge(status) {
  const map = {
    pass: { label: 'Pass', color: '#22c55e', bg: '#f0fdf4' },
    warning: { label: 'Warning', color: '#d97706', bg: '#fffbeb' },
    fail: { label: 'Fail', color: '#ef4444', bg: '#fef2f2' },
    unknown: { label: 'Unknown', color: '#6b7280', bg: '#f9fafb' }
  };
  const s = map[status] || map.unknown;
  return `<span style="display:inline-block;padding:1px 8px;border-radius:9999px;font-size:11px;font-weight:600;color:${s.color};background:${s.bg};border:1px solid ${s.color}33">${s.label}</span>`;
}

/**
 * Returns an impact badge HTML string.
 * @param {string} impact high|medium|low
 */
function impactBadge(impact) {
  const map = {
    high: { label: 'High Impact', color: '#dc2626', bg: '#fef2f2' },
    medium: { label: 'Medium Impact', color: '#d97706', bg: '#fffbeb' },
    low: { label: 'Low Impact', color: '#059669', bg: '#f0fdf4' }
  };
  const i = map[impact] || map.low;
  return `<span style="display:inline-block;padding:1px 8px;border-radius:9999px;font-size:11px;font-weight:600;color:${i.color};background:${i.bg};border:1px solid ${i.color}33">${i.label}</span>`;
}

/**
 * Returns an effort badge HTML string.
 * @param {string} effort high|medium|low
 */
function effortBadge(effort) {
  const map = {
    low: { label: 'Low Effort', color: '#059669', bg: '#f0fdf4' },
    medium: { label: 'Med Effort', color: '#d97706', bg: '#fffbeb' },
    high: { label: 'High Effort', color: '#dc2626', bg: '#fef2f2' }
  };
  const e = map[effort] || map.medium;
  return `<span style="display:inline-block;padding:1px 8px;border-radius:9999px;font-size:11px;font-weight:600;color:${e.color};background:${e.bg};border:1px solid ${e.color}33">${e.label}</span>`;
}

/**
 * Generate a short report ID (8 hex chars).
 */
function generateReportId() {
  const chars = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * 16)];
  return id;
}

/**
 * Escapes HTML special characters to prevent XSS in the report.
 * @param {*} str
 * @returns {string}
 */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Build the category score bar HTML.
 * @param {string} name
 * @param {number} score
 * @param {number} weight
 */
function categoryBar(name, score, weight) {
  const rounded = Math.round(score);
  const color = rounded >= 80 ? '#22c55e' : rounded >= 60 ? '#eab308' : '#ef4444';
  const weightPct = Math.round(weight * 100);
  return `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
        <span style="font-size:13px;font-weight:600;color:#374151">${esc(name)}</span>
        <span style="font-size:12px;color:#6b7280">${weightPct}% weight · <strong style="color:${color}">${rounded}/100</strong></span>
      </div>
      <div style="background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden">
        <div style="background:${color};width:${rounded}%;height:100%;border-radius:4px;transition:width 0.3s"></div>
      </div>
    </div>`;
}

/**
 * Build the factor rows HTML for a category.
 * @param {Array} factors
 */
function factorRows(factors) {
  return factors.map((f, i) => {
    const isPass = f.status === 'pass';
    const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    const textColor = isPass ? '#9ca3af' : '#374151';
    const detailColor = isPass ? '#c4c8cf' : '#6b7280';
    return `
    <tr style="border-bottom:1px solid #f3f4f6;background:${bg}">
      <td style="padding:6px 8px;font-size:12px;color:${textColor}">${esc(f.name)}</td>
      <td style="padding:6px 8px;text-align:center">${statusBadge(f.status)}</td>
      <td style="padding:6px 8px;text-align:right;font-size:12px;color:${detailColor}">${f.points}/${f.maxPoints}</td>
      <td style="padding:6px 8px;font-size:11px;color:${detailColor}">${esc(f.details || '')}</td>
    </tr>`;
  }).join('');
}

/**
 * Count pass/warning/fail factors in a category.
 * @param {Array} factors
 * @returns {string} summary HTML
 */
function factorCountSummary(factors) {
  const pass = factors.filter(f => f.status === 'pass').length;
  const warn = factors.filter(f => f.status === 'warning').length;
  const fail = factors.filter(f => f.status === 'fail').length;
  const parts = [];
  if (pass) parts.push(`<span style="color:#22c55e">${pass} pass</span>`);
  if (warn) parts.push(`<span style="color:#d97706">${warn} warning</span>`);
  if (fail) parts.push(`<span style="color:#ef4444">${fail} fail</span>`);
  return parts.join(' · ');
}

/**
 * Build the PDP Quality section of the report (returns empty string if no data).
 * @param {Object} [pdpResult] - PDP score result
 * @param {Array} [pdpRecs] - PDP recommendations
 * @param {string} contextLabel - e.g. "Want Context"
 * @returns {string} HTML string
 */
function buildPdpSection(pdpResult, pdpRecs, contextLabel) {
  if (!pdpResult) return '';

  const { totalScore, grade, gradeDescription, categoryScores } = pdpResult;
  const gradeColors = { A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', F: '#ef4444' };
  const gradeColor = gradeColors[grade] || '#ef4444';

  const pdpCategoryOrder = [
    'purchaseExperience',
    'trustConfidence',
    'visualPresentation',
    'contentCompleteness',
    'reviewsSocialProof'
  ];

  const pdpBars = pdpCategoryOrder
    .filter(k => categoryScores[k])
    .map(k => categoryBar(categoryScores[k].categoryName, categoryScores[k].score, categoryScores[k].weight))
    .join('');

  const pdpDetails = pdpCategoryOrder
    .filter(k => categoryScores[k])
    .map(k => {
      const cat = categoryScores[k];
      const score = Math.round(cat.score);
      const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
      return `
        <div style="margin-bottom:28px;page-break-inside:avoid">
          <h3 style="font-size:14px;font-weight:700;color:#111827;margin:0 0 4px;padding-bottom:6px;border-bottom:2px solid #e5e7eb">
            ${esc(cat.categoryName)}
            <span style="float:right;color:${color}">${score}/100</span>
          </h3>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:10px">${factorCountSummary(cat.factors || [])}</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:600">Factor</th>
                <th style="padding:6px 8px;text-align:center;color:#6b7280;font-weight:600">Status</th>
                <th style="padding:6px 8px;text-align:right;color:#6b7280;font-weight:600">Score</th>
                <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:600">Details</th>
              </tr>
            </thead>
            <tbody>${factorRows(cat.factors || [])}</tbody>
          </table>
        </div>`;
    }).join('');

  // PDP recommendations grouped by priority
  const allPdpRecs = (pdpRecs || []).slice(0, 20);
  const pdpQuickWins = allPdpRecs.filter(r => (r.impact === 'high' || r.impact === 'medium') && r.effort === 'low');
  const pdpMedPriority = allPdpRecs.filter(r => !((r.impact === 'high' || r.impact === 'medium') && r.effort === 'low') && r.priority <= 3);
  const pdpNiceToHave = allPdpRecs.filter(r => !((r.impact === 'high' || r.impact === 'medium') && r.effort === 'low') && r.priority > 3);

  function pdpRecCard(rec, i) {
    return `
    <div style="margin-bottom:14px;padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;page-break-inside:avoid">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
        <span style="font-size:13px;font-weight:700;color:#111827">${i + 1}. ${esc(rec.title)}</span>
        <div style="display:flex;gap:4px;flex-shrink:0">${impactBadge(rec.impact)}${effortBadge(rec.effort)}</div>
      </div>
      <p style="font-size:12px;color:#4b5563;margin:0 0 8px">${esc(rec.description)}</p>
      ${rec.implementation ? `<div style="font-size:11px;color:#6b7280;background:#f9fafb;padding:8px 10px;border-radius:6px;border-left:3px solid #d1d5db">${rec.implementation}</div>` : ''}
    </div>`;
  }

  let pdpCounter = 0;
  const pdpRecSections = [];
  if (pdpQuickWins.length > 0) {
    pdpRecSections.push(`<h3 style="font-size:13px;font-weight:700;color:#059669;margin:16px 0 8px">Quick Wins</h3>`);
    pdpRecSections.push(pdpQuickWins.map(r => pdpRecCard(r, ++pdpCounter)).join(''));
  }
  if (pdpMedPriority.length > 0) {
    pdpRecSections.push(`<h3 style="font-size:13px;font-weight:700;color:#d97706;margin:16px 0 8px">Medium Priority</h3>`);
    pdpRecSections.push(pdpMedPriority.map(r => pdpRecCard(r, ++pdpCounter)).join(''));
  }
  if (pdpNiceToHave.length > 0) {
    pdpRecSections.push(`<h3 style="font-size:13px;font-weight:700;color:#6b7280;margin:16px 0 8px">Nice to Have</h3>`);
    pdpRecSections.push(pdpNiceToHave.map(r => pdpRecCard(r, ++pdpCounter)).join(''));
  }

  // PDP executive summary
  const pdpTotalFactors = pdpCategoryOrder.reduce((sum, k) => sum + (categoryScores[k]?.factors?.length || 0), 0);
  const pdpFailingFactors = pdpCategoryOrder.reduce((sum, k) => sum + (categoryScores[k]?.factors?.filter(f => f.status === 'fail').length || 0), 0);
  const pdpWarningFactors = pdpCategoryOrder.reduce((sum, k) => sum + (categoryScores[k]?.factors?.filter(f => f.status === 'warning').length || 0), 0);
  const pdpPassingFactors = pdpTotalFactors - pdpFailingFactors - pdpWarningFactors;

  const pdpCriticalRecs = allPdpRecs.filter(r => r.impact === 'high');

  return `
  <!-- PDP Quality Section Separator -->
  <div style="margin:40px 0;border-top:3px solid #e5e7eb;padding-top:40px">

  <!-- PDP Quality Score Hero -->
  <div style="font-size:11px;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:#6b7280;margin-bottom:12px">PDP Quality Score</div>
  <div class="score-hero" style="display:flex;align-items:center;gap:24px;margin-bottom:24px;padding:24px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
    <div style="position:relative;flex-shrink:0">
      ${scoreGaugeSvg(totalScore, grade)}
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-size:28px;font-weight:800;color:${gradeColor};line-height:1">${esc(grade)}</div>
        <div style="font-size:13px;font-weight:700;color:#374151">${esc(totalScore)}/100</div>
      </div>
    </div>
    <div>
      <div style="font-size:20px;font-weight:700;color:#111827;margin-bottom:6px">PDP Quality: ${esc(totalScore)}/100 (Grade ${esc(grade)})</div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:8px">${esc(gradeDescription)}</div>
      <div style="font-size:12px;color:#9ca3af">${esc(contextLabel)} · ${allPdpRecs.length} recommendations</div>
    </div>
  </div>

  <!-- PDP Executive Summary -->
  <div style="margin-bottom:36px;padding:16px 18px;background:#fef3c7;border-radius:10px;border:1px solid #fbbf24">
    <h2 style="font-size:14px;font-weight:700;color:#92400e;margin:0 0 10px">PDP Quality Summary</h2>
    <div style="font-size:12px;color:#92400e;line-height:1.6">
      <p style="margin:0 0 6px">This page scores <strong>${totalScore}/100</strong> across ${pdpTotalFactors} shopping experience factors: <strong style="color:#22c55e">${pdpPassingFactors} pass</strong>, <strong style="color:#d97706">${pdpWarningFactors} warning</strong>, <strong style="color:#ef4444">${pdpFailingFactors} fail</strong>.</p>
      ${pdpCriticalRecs.length > 0 ? `<p style="margin:0"><strong>${pdpCriticalRecs.length} high-impact issue${pdpCriticalRecs.length > 1 ? 's' : ''}</strong>: ${pdpCriticalRecs.slice(0, 3).map(r => esc(r.title)).join(', ')}${pdpCriticalRecs.length > 3 ? ', ...' : ''}.</p>` : '<p style="margin:0">No high-impact issues found.</p>'}
    </div>
  </div>

  <!-- PDP Category Breakdown -->
  <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px">PDP Quality — Category Breakdown</h2>
  <div style="margin-bottom:36px">${pdpBars}</div>

  <!-- PDP Factor Detail -->
  <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px">PDP Quality — Factor Detail</h2>
  <div style="margin-bottom:36px">${pdpDetails}</div>

  <!-- PDP Recommendations -->
  <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px">
    PDP Quality — Recommendations
    <span style="font-size:12px;font-weight:400;color:#6b7280;margin-left:8px">${allPdpRecs.length} total · showing top ${Math.min(20, allPdpRecs.length)}</span>
  </h2>
  <div style="margin-bottom:40px">${pdpRecSections.join('') || '<p style="color:#6b7280;font-size:13px">No recommendations — excellent shopping experience!</p>'}</div>

  </div>`;
}

/**
 * Build the SEO Quality section of the report (returns empty string if no data).
 * @param {Object} [seoResult] - SEO score result
 * @param {Array} [seoRecs] - SEO recommendations
 * @returns {string} HTML string
 */
function buildSeoSection(seoResult, seoRecs) {
  if (!seoResult) return '';

  const { totalScore, grade, gradeDescription, categoryScores } = seoResult;
  const gradeColors = { A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', F: '#ef4444' };
  const gradeColor = gradeColors[grade] || '#ef4444';

  const seoCategoryOrder = [
    'titleMeta',
    'technicalFoundations',
    'contentSignals',
    'navigationDiscovery'
  ];

  const seoBars = seoCategoryOrder
    .filter(k => categoryScores[k])
    .map(k => categoryBar(categoryScores[k].categoryName, categoryScores[k].score, categoryScores[k].weight))
    .join('');

  const seoDetails = seoCategoryOrder
    .filter(k => categoryScores[k])
    .map(k => {
      const cat = categoryScores[k];
      const score = Math.round(cat.score);
      const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
      return `
        <div style="margin-bottom:28px;page-break-inside:avoid">
          <h3 style="font-size:14px;font-weight:700;color:#111827;margin:0 0 4px;padding-bottom:6px;border-bottom:2px solid #e5e7eb">
            ${esc(cat.categoryName)}
            <span style="float:right;color:${color}">${score}/100</span>
          </h3>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:10px">${factorCountSummary(cat.factors || [])}</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:600">Factor</th>
                <th style="padding:6px 8px;text-align:center;color:#6b7280;font-weight:600">Status</th>
                <th style="padding:6px 8px;text-align:right;color:#6b7280;font-weight:600">Score</th>
                <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:600">Details</th>
              </tr>
            </thead>
            <tbody>${factorRows(cat.factors || [])}</tbody>
          </table>
        </div>`;
    }).join('');

  // SEO recommendations grouped by priority
  const allSeoRecs = (seoRecs || []).slice(0, 20);
  const seoQuickWins = allSeoRecs.filter(r => (r.impact === 'high' || r.impact === 'medium') && r.effort === 'low');
  const seoMedPriority = allSeoRecs.filter(r => !((r.impact === 'high' || r.impact === 'medium') && r.effort === 'low') && r.priority <= 3);
  const seoNiceToHave = allSeoRecs.filter(r => !((r.impact === 'high' || r.impact === 'medium') && r.effort === 'low') && r.priority > 3);

  function seoRecCard(rec, i) {
    return `
    <div style="margin-bottom:14px;padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;page-break-inside:avoid">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
        <span style="font-size:13px;font-weight:700;color:#111827">${i + 1}. ${esc(rec.title)}</span>
        <div style="display:flex;gap:4px;flex-shrink:0">${impactBadge(rec.impact)}${effortBadge(rec.effort)}</div>
      </div>
      <p style="font-size:12px;color:#4b5563;margin:0 0 8px">${esc(rec.description)}</p>
      ${rec.implementation ? `<div style="font-size:11px;color:#6b7280;background:#f9fafb;padding:8px 10px;border-radius:6px;border-left:3px solid #d1d5db">${rec.implementation}</div>` : ''}
    </div>`;
  }

  let seoCounter = 0;
  const seoRecSections = [];
  if (seoQuickWins.length > 0) {
    seoRecSections.push(`<h3 style="font-size:13px;font-weight:700;color:#059669;margin:16px 0 8px">Quick Wins</h3>`);
    seoRecSections.push(seoQuickWins.map(r => seoRecCard(r, ++seoCounter)).join(''));
  }
  if (seoMedPriority.length > 0) {
    seoRecSections.push(`<h3 style="font-size:13px;font-weight:700;color:#d97706;margin:16px 0 8px">Medium Priority</h3>`);
    seoRecSections.push(seoMedPriority.map(r => seoRecCard(r, ++seoCounter)).join(''));
  }
  if (seoNiceToHave.length > 0) {
    seoRecSections.push(`<h3 style="font-size:13px;font-weight:700;color:#6b7280;margin:16px 0 8px">Nice to Have</h3>`);
    seoRecSections.push(seoNiceToHave.map(r => seoRecCard(r, ++seoCounter)).join(''));
  }

  const seoTotalFactors = seoCategoryOrder.reduce((sum, k) => sum + (categoryScores[k]?.factors?.length || 0), 0);
  const seoFailingFactors = seoCategoryOrder.reduce((sum, k) => sum + (categoryScores[k]?.factors?.filter(f => f.status === 'fail').length || 0), 0);
  const seoWarningFactors = seoCategoryOrder.reduce((sum, k) => sum + (categoryScores[k]?.factors?.filter(f => f.status === 'warning').length || 0), 0);
  const seoPassingFactors = seoTotalFactors - seoFailingFactors - seoWarningFactors;
  const seoCriticalRecs = allSeoRecs.filter(r => r.impact === 'high');

  return `
  <!-- SEO Quality Section Separator -->
  <div style="margin:40px 0;border-top:3px solid #e5e7eb;padding-top:40px">

  <!-- SEO Quality Score Hero -->
  <div style="font-size:11px;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:#6b7280;margin-bottom:12px">SEO Quality Score</div>
  <div class="score-hero" style="display:flex;align-items:center;gap:24px;margin-bottom:24px;padding:24px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
    <div style="position:relative;flex-shrink:0">
      ${scoreGaugeSvg(totalScore, grade)}
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-size:28px;font-weight:800;color:${gradeColor};line-height:1">${esc(grade)}</div>
        <div style="font-size:13px;font-weight:700;color:#374151">${esc(totalScore)}/100</div>
      </div>
    </div>
    <div>
      <div style="font-size:20px;font-weight:700;color:#111827;margin-bottom:6px">SEO Quality: ${esc(totalScore)}/100 (Grade ${esc(grade)})</div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:8px">${esc(gradeDescription)}</div>
      <div style="font-size:12px;color:#9ca3af">Context-neutral · ${allSeoRecs.length} recommendations</div>
    </div>
  </div>

  <!-- SEO Executive Summary -->
  <div style="margin-bottom:36px;padding:16px 18px;background:#f0fdf4;border-radius:10px;border:1px solid #86efac">
    <h2 style="font-size:14px;font-weight:700;color:#14532d;margin:0 0 10px">SEO Quality Summary</h2>
    <div style="font-size:12px;color:#166534;line-height:1.6">
      <p style="margin:0 0 6px">This page scores <strong>${totalScore}/100</strong> across ${seoTotalFactors} SEO quality factors: <strong style="color:#22c55e">${seoPassingFactors} pass</strong>, <strong style="color:#d97706">${seoWarningFactors} warning</strong>, <strong style="color:#ef4444">${seoFailingFactors} fail</strong>.</p>
      ${seoCriticalRecs.length > 0 ? `<p style="margin:0"><strong>${seoCriticalRecs.length} high-impact issue${seoCriticalRecs.length > 1 ? 's' : ''}</strong> to address first: ${seoCriticalRecs.slice(0, 3).map(r => esc(r.title)).join(', ')}${seoCriticalRecs.length > 3 ? ', ...' : ''}.</p>` : '<p style="margin:0">No high-impact SEO issues found.</p>'}
    </div>
  </div>

  <!-- SEO Category Breakdown -->
  <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px">SEO Category Breakdown</h2>
  <div style="margin-bottom:36px">${seoBars}</div>

  <!-- SEO Factor Detail -->
  <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px">SEO Factor Detail</h2>
  <div style="margin-bottom:36px">${seoDetails}</div>

  <!-- SEO Recommendations -->
  <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px">
    SEO Recommendations
    <span style="font-size:12px;font-weight:400;color:#6b7280;margin-left:8px">${allSeoRecs.length} total · showing top ${Math.min(20, allSeoRecs.length)}</span>
  </h2>
  <div style="margin-bottom:40px">${seoRecSections.join('') || '<p style="color:#6b7280;font-size:13px">No recommendations — excellent SEO foundation!</p>'}</div>

  </div>`;
}

/**
 * Generate a complete self-contained HTML report document.
 * @param {Object} result - scoreResult from ScoringEngine.calculateScore()
 * @param {Object} pageInfo - page metadata (url, title, domain)
 * @param {Array} recommendations - sorted recommendation array
 * @param {string} context - analysis context (want/need/hybrid)
 * @param {Object} [pdpResult] - pdpScoreResult from ScoringEngine.calculatePdpQualityScore()
 * @param {Array} [pdpRecommendations] - sorted PDP recommendation array
 * @param {Object} [seoResult] - seoScoreResult from ScoringEngine.calculateSeoQualityScore()
 * @param {Array} [seoRecommendations] - sorted SEO recommendation array
 * @returns {string} Complete HTML document string
 */
export function generateHtmlReport(result, pageInfo, recommendations, context, pdpResult, pdpRecommendations, seoResult, seoRecommendations) {
  const { totalScore, grade, gradeDescription, categoryScores } = result;
  const gradeColors = { A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', F: '#ef4444' };
  const gradeColor = gradeColors[grade] || '#ef4444';
  const reportId = generateReportId();

  const reportDate = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const contextLabel = context
    ? context.charAt(0).toUpperCase() + context.slice(1) + ' Context'
    : 'Hybrid Context';

  const contextDescriptions = {
    want: 'Emotional, lifestyle-driven purchases — emphasizes social proof, benefit statements, and brand appeal.',
    need: 'Functional, spec-driven purchases — emphasizes technical specs, compatibility, certifications, and warranty.',
    hybrid: 'Balanced consideration — all factors weighted equally.'
  };
  const contextDesc = contextDescriptions[context] || contextDescriptions.hybrid;

  const categoryOrder = [
    'structuredData',
    'protocolMeta',
    'contentQuality',
    'contentStructure',
    'authorityTrust',
    'aiDiscoverability'
  ];

  const categoryBars = categoryOrder
    .filter(k => categoryScores[k])
    .map(k => categoryBar(categoryScores[k].categoryName, categoryScores[k].score, categoryScores[k].weight))
    .join('');

  const categoryDetails = categoryOrder
    .filter(k => categoryScores[k])
    .map(k => {
      const cat = categoryScores[k];
      const score = Math.round(cat.score);
      const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
      return `
        <div style="margin-bottom:28px;page-break-inside:avoid">
          <h3 style="font-size:14px;font-weight:700;color:#111827;margin:0 0 4px;padding-bottom:6px;border-bottom:2px solid #e5e7eb">
            ${esc(cat.categoryName)}
            <span style="float:right;color:${color}">${score}/100</span>
          </h3>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:10px">${factorCountSummary(cat.factors || [])}</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:600">Factor</th>
                <th style="padding:6px 8px;text-align:center;color:#6b7280;font-weight:600">Status</th>
                <th style="padding:6px 8px;text-align:right;color:#6b7280;font-weight:600">Score</th>
                <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:600">Details</th>
              </tr>
            </thead>
            <tbody>${factorRows(cat.factors || [])}</tbody>
          </table>
        </div>`;
    }).join('');

  // Group recommendations by priority tier
  const allRecs = (recommendations || []).slice(0, 20);
  const quickWins = allRecs.filter(r => (r.impact === 'high' || r.impact === 'medium') && r.effort === 'low');
  const medPriority = allRecs.filter(r => !((r.impact === 'high' || r.impact === 'medium') && r.effort === 'low') && r.priority <= 3);
  const niceToHave = allRecs.filter(r => !((r.impact === 'high' || r.impact === 'medium') && r.effort === 'low') && r.priority > 3);

  function recCard(rec, i) {
    return `
    <div style="margin-bottom:14px;padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;page-break-inside:avoid">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
        <span style="font-size:13px;font-weight:700;color:#111827">${i + 1}. ${esc(rec.title)}</span>
        <div style="display:flex;gap:4px;flex-shrink:0">${impactBadge(rec.impact)}${effortBadge(rec.effort)}</div>
      </div>
      <p style="font-size:12px;color:#4b5563;margin:0 0 8px">${esc(rec.description)}</p>
      ${rec.implementation ? `<div style="font-size:11px;color:#6b7280;background:#f9fafb;padding:8px 10px;border-radius:6px;border-left:3px solid #d1d5db">${rec.implementation}</div>` : ''}
    </div>`;
  }

  let recCounter = 0;
  const recSections = [];
  if (quickWins.length > 0) {
    recSections.push(`<h3 style="font-size:13px;font-weight:700;color:#059669;margin:16px 0 8px">Quick Wins</h3>`);
    recSections.push(quickWins.map(r => recCard(r, ++recCounter)).join(''));
  }
  if (medPriority.length > 0) {
    recSections.push(`<h3 style="font-size:13px;font-weight:700;color:#d97706;margin:16px 0 8px">Medium Priority</h3>`);
    recSections.push(medPriority.map(r => recCard(r, ++recCounter)).join(''));
  }
  if (niceToHave.length > 0) {
    recSections.push(`<h3 style="font-size:13px;font-weight:700;color:#6b7280;margin:16px 0 8px">Nice to Have</h3>`);
    recSections.push(niceToHave.map(r => recCard(r, ++recCounter)).join(''));
  }
  const recItems = recSections.join('');

  // Build executive summary
  const totalFactors = categoryOrder.reduce((sum, k) => sum + (categoryScores[k]?.factors?.length || 0), 0);
  const failingFactors = categoryOrder.reduce((sum, k) => sum + (categoryScores[k]?.factors?.filter(f => f.status === 'fail').length || 0), 0);
  const warningFactors = categoryOrder.reduce((sum, k) => sum + (categoryScores[k]?.factors?.filter(f => f.status === 'warning').length || 0), 0);
  const passingFactors = totalFactors - failingFactors - warningFactors;

  const weakestCategory = categoryOrder
    .filter(k => categoryScores[k])
    .reduce((worst, k) => (!worst || categoryScores[k].score < categoryScores[worst].score) ? k : worst, null);
  const weakestName = weakestCategory ? categoryScores[weakestCategory].categoryName : '';
  const weakestScore = weakestCategory ? Math.round(categoryScores[weakestCategory].score) : 0;

  const strongestCategory = categoryOrder
    .filter(k => categoryScores[k])
    .reduce((best, k) => (!best || categoryScores[k].score > categoryScores[best].score) ? k : best, null);
  const strongestName = strongestCategory ? categoryScores[strongestCategory].categoryName : '';
  const strongestScore = strongestCategory ? Math.round(categoryScores[strongestCategory].score) : 0;

  const criticalRecs = allRecs.filter(r => r.impact === 'high');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>pdpIQ Report — ${esc(pageInfo?.domain || 'Analysis')}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; color: #111827; background: #fff; }
    .page { max-width: 860px; margin: 0 auto; padding: 40px 32px; }
    @media print {
      .page { padding: 20px 16px; }
      .no-print { display: none !important; }
      @page { margin: 15mm 12mm; @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #9ca3af; } }
    }
    @media (max-width: 600px) {
      .page { padding: 16px 12px; }
      .score-hero { flex-direction: column; text-align: center; }
      .header-flex { flex-direction: column; gap: 12px; }
    }
    a { color: #4f46e5; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header-flex" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #e5e7eb">
    <div>
      <div style="font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.5px">pdp<span style="color:#4f46e5">IQ</span></div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px">AI Citation Readiness &amp; PDP Quality for eCommerce Product Pages</div>
      <div style="font-size:11px;color:#6b7280;margin-top:6px">Generated ${esc(reportDate)}</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:2px">${esc(contextLabel)} · Report #${reportId}</div>
    </div>
    <a href="https://tribbute.com/products/pdpiq/?utm_source=pdpiq&amp;utm_medium=report&amp;utm_content=header_logo" target="_blank" rel="noopener" style="display:flex;align-items:center;flex-shrink:0">
      <img src="data:image/png;base64,${TRIBBUTE_LOGO_BASE64}" alt="Tribbute — Value Recognized" style="height:46px;width:auto;display:block">
    </a>
  </div>

  <!-- Page Info -->
  <div style="margin-bottom:28px;padding:14px 16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
    <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:4px;word-break:break-all">${esc(pageInfo?.title || 'Product Page')}</div>
    <div style="font-size:11px;color:#6b7280;word-break:break-all">${esc(pageInfo?.url || '')}</div>
  </div>

  <!-- AI Readiness Score Hero -->
  <div style="font-size:11px;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:#6b7280;margin-bottom:12px">AI Readiness Score</div>
  <div class="score-hero" style="display:flex;align-items:center;gap:24px;margin-bottom:24px;padding:24px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
    <div style="position:relative;flex-shrink:0">
      ${scoreGaugeSvg(totalScore, grade)}
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-size:28px;font-weight:800;color:${gradeColor};line-height:1">${esc(grade)}</div>
        <div style="font-size:13px;font-weight:700;color:#374151">${esc(totalScore)}/100</div>
      </div>
    </div>
    <div>
      <div style="font-size:20px;font-weight:700;color:#111827;margin-bottom:6px">Overall Score: ${esc(totalScore)}/100 (Grade ${esc(grade)})</div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:8px">${esc(gradeDescription)}</div>
      <div style="font-size:12px;color:#9ca3af">${esc(contextLabel)} · ${(recommendations || []).length} recommendations</div>
    </div>
  </div>

  <!-- Executive Summary -->
  <div style="margin-bottom:36px;padding:16px 18px;background:#eef2ff;border-radius:10px;border:1px solid #c7d2fe">
    <h2 style="font-size:14px;font-weight:700;color:#3730a3;margin:0 0 10px">Executive Summary</h2>
    <div style="font-size:12px;color:#4338ca;line-height:1.6">
      <p style="margin:0 0 6px">This page scores <strong>${totalScore}/100</strong> across ${totalFactors} AI citation readiness factors: <strong style="color:#22c55e">${passingFactors} pass</strong>, <strong style="color:#d97706">${warningFactors} warning</strong>, <strong style="color:#ef4444">${failingFactors} fail</strong>.</p>
      <p style="margin:0 0 6px">Strongest area: <strong>${esc(strongestName)}</strong> (${strongestScore}/100). Weakest area: <strong>${esc(weakestName)}</strong> (${weakestScore}/100).</p>
      ${criticalRecs.length > 0 ? `<p style="margin:0"><strong>${criticalRecs.length} high-impact issue${criticalRecs.length > 1 ? 's' : ''}</strong> to address first: ${criticalRecs.slice(0, 3).map(r => esc(r.title)).join(', ')}${criticalRecs.length > 3 ? ', ...' : ''}.</p>` : '<p style="margin:0">No high-impact issues found.</p>'}
    </div>
  </div>

  <!-- Context & Grading -->
  <div style="display:flex;gap:16px;margin-bottom:36px;flex-wrap:wrap">
    <div style="flex:1;min-width:240px;padding:12px 14px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
      <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:4px">Analysis Context: ${esc(contextLabel)}</div>
      <div style="font-size:11px;color:#6b7280;line-height:1.5">${esc(contextDesc)}</div>
    </div>
    <div style="flex:1;min-width:240px;padding:12px 14px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
      <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:4px">Grade Scale</div>
      <div style="font-size:11px;color:#6b7280;line-height:1.5">
        <span style="color:#22c55e;font-weight:600">A</span> 90-100 · <span style="color:#84cc16;font-weight:600">B</span> 80-89 · <span style="color:#eab308;font-weight:600">C</span> 70-79 · <span style="color:#f97316;font-weight:600">D</span> 60-69 · <span style="color:#ef4444;font-weight:600">F</span> &lt;60
      </div>
    </div>
  </div>

  <!-- Category Breakdown -->
  <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px">Category Breakdown</h2>
  <div style="margin-bottom:36px">${categoryBars}</div>

  <!-- Category Detail -->
  <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px">Factor Detail</h2>
  <div style="margin-bottom:36px">${categoryDetails}</div>

  <!-- AI Readiness Recommendations -->
  <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px">
    Recommendations
    <span style="font-size:12px;font-weight:400;color:#6b7280;margin-left:8px">${(recommendations || []).length} total · showing top ${Math.min(20, (recommendations || []).length)}</span>
  </h2>
  <div style="margin-bottom:40px">${recItems || '<p style="color:#6b7280;font-size:13px">No recommendations — excellent coverage!</p>'}</div>

  ${buildPdpSection(pdpResult, pdpRecommendations, contextLabel)}

  ${buildSeoSection(seoResult, seoRecommendations)}

  <!-- Footer -->
  <div style="padding-top:20px;border-top:1px solid #e5e7eb">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:11px;color:#9ca3af">Report #${reportId} · Generated by pdpIQ · <a href="https://tribbute.com/products/pdpiq/?utm_source=pdpiq&amp;utm_medium=report&amp;utm_content=footer_link" style="color:#9ca3af" target="_blank" rel="noopener">tribbute.com</a></div>
      <div class="no-print">
        <button onclick="window.print()" style="font-size:12px;padding:6px 14px;background:#4f46e5;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">
          Print / Save as PDF
        </button>
      </div>
    </div>
    <div style="font-size:10px;color:#c4c8cf;line-height:1.5">
      <p style="margin:0 0 4px">Scores are based on publicly visible page content at the time of analysis. AI citation behaviour varies by model and may change over time. This report is for informational purposes and does not guarantee specific outcomes.</p>
      <p style="margin:0">pdpIQ analyses ${totalFactors} AI readiness factors across 6 categories${pdpResult ? ', 30 PDP quality factors across 5 categories' : ''}${seoResult ? ', and 19 SEO quality factors across 4 categories' : ''}. All analysis runs locally in your browser — no page data is sent to external servers.</p>
    </div>
  </div>

</div>
</body>
</html>`;
}
