/**
 * HTML Report Template
 * Generates a self-contained, print-ready HTML report from a pdpIQ analysis result.
 */

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
  return factors.map(f => `
    <tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:6px 8px;font-size:12px;color:#374151">${esc(f.name)}</td>
      <td style="padding:6px 8px;text-align:center">${statusBadge(f.status)}</td>
      <td style="padding:6px 8px;text-align:right;font-size:12px;color:#6b7280">${f.points}/${f.maxPoints}</td>
      <td style="padding:6px 8px;font-size:11px;color:#6b7280">${esc(f.details || '')}</td>
    </tr>`).join('');
}

/**
 * Generate a complete self-contained HTML report document.
 * @param {Object} result - scoreResult from ScoringEngine.calculateScore()
 * @param {Object} pageInfo - page metadata (url, title, domain)
 * @param {Array} recommendations - sorted recommendation array
 * @param {string} context - analysis context (want/need/hybrid)
 * @returns {string} Complete HTML document string
 */
export function generateHtmlReport(result, pageInfo, recommendations, context) {
  const { totalScore, grade, gradeDescription, categoryScores } = result;
  const gradeColors = { A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', F: '#ef4444' };
  const gradeColor = gradeColors[grade] || '#ef4444';

  const reportDate = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const contextLabel = context
    ? context.charAt(0).toUpperCase() + context.slice(1) + ' Context'
    : 'Hybrid Context';

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
          <h3 style="font-size:14px;font-weight:700;color:#111827;margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid #e5e7eb">
            ${esc(cat.categoryName)}
            <span style="float:right;color:${color}">${score}/100</span>
          </h3>
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

  const recItems = (recommendations || []).slice(0, 20).map((rec, i) => `
    <div style="margin-bottom:16px;padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;page-break-inside:avoid">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
        <span style="font-size:13px;font-weight:700;color:#111827">${i + 1}. ${esc(rec.title)}</span>
        <div style="display:flex;gap:4px;flex-shrink:0">${impactBadge(rec.impact)}</div>
      </div>
      <p style="font-size:12px;color:#4b5563;margin:0 0 8px">${esc(rec.description)}</p>
      ${rec.implementation ? `<div style="font-size:11px;color:#6b7280;background:#f9fafb;padding:8px 10px;border-radius:6px;border-left:3px solid #d1d5db">${rec.implementation}</div>` : ''}
    </div>`).join('');

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
      @page { margin: 15mm 12mm; }
    }
    a { color: #4f46e5; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #e5e7eb">
    <div>
      <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;margin-bottom:4px">Powered by</div>
      <div style="font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.5px">pdp<span style="color:#4f46e5">IQ</span></div>
      <div style="font-size:11px;color:#9ca3af;margin-top:2px">by Tribbute</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#6b7280">Generated ${esc(reportDate)}</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:2px">${esc(contextLabel)}</div>
    </div>
  </div>

  <!-- Page Info -->
  <div style="margin-bottom:28px;padding:14px 16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
    <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:4px;word-break:break-all">${esc(pageInfo?.title || 'Product Page')}</div>
    <div style="font-size:11px;color:#6b7280;word-break:break-all">${esc(pageInfo?.url || '')}</div>
  </div>

  <!-- Score Hero -->
  <div style="display:flex;align-items:center;gap:24px;margin-bottom:36px;padding:24px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
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

  <!-- Category Breakdown -->
  <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px">Category Breakdown</h2>
  <div style="margin-bottom:36px">${categoryBars}</div>

  <!-- Category Detail -->
  <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px">Factor Detail</h2>
  <div style="margin-bottom:36px">${categoryDetails}</div>

  <!-- Recommendations -->
  <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px">
    Recommendations
    <span style="font-size:12px;font-weight:400;color:#6b7280;margin-left:8px">${(recommendations || []).length} total · showing top ${Math.min(20, (recommendations || []).length)}</span>
  </h2>
  <div style="margin-bottom:40px">${recItems || '<p style="color:#6b7280;font-size:13px">No recommendations — excellent coverage!</p>'}</div>

  <!-- Footer -->
  <div style="padding-top:20px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:11px;color:#9ca3af">Generated by pdpIQ · tribbute.com</div>
    <div class="no-print">
      <button onclick="window.print()" style="font-size:12px;padding:6px 14px;background:#4f46e5;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">
        Print / Save as PDF
      </button>
    </div>
  </div>

</div>
</body>
</html>`;
}
