# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working with code in this repository.

## Project Overview

LLM Visibility Analyzer is a Chrome extension that analyzes eCommerce Product Detail Pages (PDPs) for their visibility and representation within Large Language Model chat interfaces. It scores pages across ~70 factors in 5 categories and provides actionable recommendations.

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (ES modules)
- Chrome Side Panel API for UI
- Chrome Storage API for history persistence
- No build tools or bundlers required

## Project Structure

```
src/
├── background/         # Service worker for message routing and image verification
├── content/            # Content script for page data extraction
├── scoring/            # Scoring engine, weights, and grading utilities
├── recommendations/    # Recommendation engine and rules
├── sidepanel/          # UI (HTML, CSS, JS)
├── storage/            # Local storage manager
└── utils/              # Shared utilities
```

## Development Workflow

### Loading the Extension
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project root
4. Test on any eCommerce product page

### Testing Changes
- Reload the extension from `chrome://extensions/` after code changes
- For content script changes, also refresh the target page
- For service worker changes, click the "Update" button on the extension card

## Architecture Notes

- **Message passing**: Content script extracts page data, sends to service worker, which coordinates with side panel
- **Scoring system**: Weighted categories (Structured Data 25%, Protocol/Meta 20%, Content Quality 25%, Content Structure 15%, Authority/Trust 15%)
- **Context weighting**: Consumer context (Want/Need/Hybrid) applies multipliers to factor scores
- **Critical issues**: Some factors (WebP og:image, robots noindex) have outsized impact on LLM visibility

## Key Files

- `manifest.json` - Extension configuration and permissions
- `src/content/content-script.js` - Page data extraction logic
- `src/scoring/scoring-engine.js` - Core scoring calculations
- `src/scoring/weights.js` - Category and context weight definitions
- `src/recommendations/recommendation-rules.js` - Improvement suggestions
- `src/sidepanel/sidepanel.js` - UI controller
