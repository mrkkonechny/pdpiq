# Deployment Runbook

> **PDS Document 06** | Last Updated: 2026-03-01

---

## 1. Deployment Overview

**Deployment Target:** Google Chrome browser (local install via Developer mode or Chrome Web Store)
**Deployment Method:** Manual — load unpacked (development) or zip + upload to Chrome Web Store (production)
**Deployment Frequency:** On-demand, no CI/CD pipeline exists

pdpIQ is a client-side Chrome Extension with no backend, no build tools, and no dependencies. "Deployment" means either loading the extension locally for development or publishing a new version to the Chrome Web Store. There are no servers, databases, or infrastructure to manage.

## 2. Prerequisites

| Requirement | Version | Purpose | Verification Command |
|------------|---------|---------|---------------------|
| Google Chrome | 116+ (Manifest V3 side panel support) | Runtime environment | `chrome://version` |
| Git | Any | Source control | `git --version` |
| Text editor | Any | Code editing | — |
| Chrome Developer Account | — | Chrome Web Store publishing (production only) | Sign in at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) |

**Required Accounts / Access:**
- **Development:** No accounts needed. Extension runs entirely locally.
- **Chrome Web Store publishing:** Google Developer account with $5 one-time registration fee. Whoever publishes must have access to the Tribbute developer account.

**Not Required:**
- No Node.js, npm, or any package manager
- No build tools, bundlers, or compilers
- No API keys, secrets, or environment variables
- No server or cloud infrastructure

## 3. Environment Configuration

### Environment Variables

None. pdpIQ has zero environment variables. All configuration is embedded in source code.

### Configuration Constants (in-code)

| Constant | File | Value | Description |
|----------|------|-------|-------------|
| `DEBUG` | All JS files | `false` | Set to `true` for verbose console logging; must be `false` for production |
| `MAX_HISTORY` | `storage-manager.js` | `100` | Maximum analysis entries stored |
| `STORAGE_QUOTA_BYTES` | `storage-manager.js` | `10485760` (10MB) | Chrome storage.local quota |
| `QUOTA_WARNING_THRESHOLD` | `storage-manager.js` | `0.8` | Triggers auto-pruning at 80% |

### Configuration Files

| File | Location | Purpose | Template Provided? |
|------|----------|---------|-------------------|
| `manifest.json` | Project root | Extension configuration, permissions, version | Yes — is the config |
| `CLAUDE.md` | Project root | AI agent development guidance | Yes |
| `PRIVACY.md` | Project root | Privacy policy for Chrome Web Store listing | Yes |

### Version Management

The extension version lives in one place: `manifest.json` → `"version"`. Currently `1.1.0`. Chrome Web Store requires the version to increment with every upload. The version is also displayed in the side panel footer via `chrome.runtime.getManifest().version` — no manual UI update needed.

## 4. Deployment Steps

### Development: First-Time Setup

```bash
# Step 1: Clone the repository
git clone [repo-url]
cd pdpiq

# Step 2: Load extension in Chrome
# - Open chrome://extensions/
# - Enable "Developer mode" (top right toggle)
# - Click "Load unpacked"
# - Select the pdpiq/ project root directory

# Step 3: Verify installation
# - pdpIQ icon (indigo "IQ") appears in the Chrome toolbar
# - Click the icon → side panel opens
# - Navigate to any eCommerce product page
# - Select a context (Want/Need/Hybrid) and click "Analyze"

# No dependencies to install. No build step. No configuration.
```

### Development: Subsequent Updates

```bash
# Step 1: Pull latest changes
git pull origin main

# Step 2: Reload the extension
# - Go to chrome://extensions/
# - Find pdpIQ card
# - Click the circular refresh icon (↻)
# Note: For content script changes, also refresh the target page
# Note: For service worker changes, click "Update" on the extension card

# Step 3: Verify changes
# - Navigate to a product page
# - Run an analysis
# - Check that changes are reflected
```

### Production: Chrome Web Store Publishing

```bash
# Step 1: Pre-publish checklist
# □ All DEBUG flags set to false in every JS file
# □ manifest.json version incremented (Chrome requires unique version per upload)
# □ PRIVACY.md up to date
# □ Regression test checklist passed (see 05-TEST_PLAN.md)
# □ Icons present: icon16.png, icon48.png, icon128.png

# Step 2: Verify DEBUG flags are off
grep -r "const DEBUG = true" src/
# Expected: NO output. If any file shows true, fix it before packaging.

# Step 3: Create the zip package
# Exclude non-distributable files
zip -r pdpiq-v$(jq -r .version manifest.json).zip \
  manifest.json \
  PRIVACY.md \
  icons/ \
  src/ \
  styles/ \
  -x "*.DS_Store" \
  -x "__MACOSX/*" \
  -x ".git/*" \
  -x "docs/*" \
  -x "CLAUDE.md" \
  -x "*.md" \
  -x "docs/**"

# Step 4: Upload to Chrome Web Store
# - Go to https://chrome.google.com/webstore/devconsole
# - Select pdpIQ listing (or create new if first publish)
# - Click "Package" → "Upload new package"
# - Upload the zip file
# - Update store listing description if needed
# - Submit for review

# Step 5: Wait for review
# Chrome Web Store review typically takes 1-3 business days.
# No action needed — status updates appear in the developer dashboard.
```

### Rollback Procedure

```bash
# Chrome Web Store rollback:
# There is no built-in rollback in the Chrome Web Store.
# To revert to a previous version:

# Option A: Publish previous version with incremented version number
git checkout [last-known-good-commit]
# Edit manifest.json: increment version (e.g., 1.1.0 → 1.1.1)
# Follow production publishing steps above

# Option B: Unpublish (emergency — removes extension from store entirely)
# - Chrome Web Store Developer Dashboard → pdpIQ → "More" → "Unpublish"
# - Only use for critical issues (e.g., data leak, broken core functionality)
# - Existing installs continue working until Chrome forces uninstall

# Local development rollback:
git log --oneline -5
git checkout [commit-hash]
# Reload extension in chrome://extensions/
```

## 5. Scheduled Tasks / Cron Jobs

None. pdpIQ is a user-triggered tool with no scheduled tasks, background processing, or cron jobs. The service worker only activates in response to user actions (extension icon click → side panel open → analyze button click).

## 6. Monitoring & Health Checks

### What to Monitor

pdpIQ has no server infrastructure to monitor. Monitoring is limited to client-side concerns:

| Metric | Tool | Threshold | Alert Action |
|--------|------|-----------|-------------|
| Chrome Web Store review status | Developer Dashboard | Review pending >5 days | Contact Chrome Web Store support |
| User-reported issues | GitHub Issues / email | Any critical report | Investigate, fix, republish |
| Chrome API deprecations | Chrome Platform Status | Upcoming removal | Update code before deprecation date |
| Storage quota usage | `getStorageStats()` in console | >80% (auto-handled) | Verify pruning works; increase MAX_HISTORY if needed |
| Extension errors | `chrome://extensions/` → "Errors" | Any runtime errors | Investigate stack trace, fix |

### Health Check Commands

```bash
# These are run manually in Chrome DevTools, not in a terminal.

# 1. Verify extension is loaded and active
# chrome://extensions/ → pdpIQ card should show "Enabled"
# No "Errors" link should appear

# 2. Check service worker status
# chrome://extensions/ → pdpIQ → "Inspect views: service worker"
# In DevTools console:
chrome.runtime.getManifest().version
# Expected: "1.1.0" (or current version)

# 3. Check storage health (run in side panel DevTools)
# Right-click side panel → Inspect → Console:
const stats = await chrome.storage.local.getBytesInUse('analysisHistory');
console.log(`Storage used: ${(stats / 1024 / 1024).toFixed(2)} MB of 10 MB`);

# 4. Verify content script injection
# Navigate to any eCommerce page, open DevTools Console:
# Look for no pdpIQ errors in console
# Run an analysis — results should appear in side panel

# 5. Verify network fetches work
# In service worker DevTools console:
fetch('https://example.com/robots.txt').then(r => console.log(r.status));
# Expected: 200 (or 404 if no robots.txt — both are valid)
```

### Chrome Web Store Listing Health

```
Check quarterly:
□ Store listing screenshots are current
□ Description matches actual functionality
□ Privacy policy URL is accessible
□ Extension still works on latest Chrome stable
□ No policy violation warnings in Developer Dashboard
```

## 7. Incident Response

### Common Issues & Fixes

**Issue: Extension icon doesn't appear in toolbar**
- Likely cause: Extension not loaded or disabled
- Diagnosis: Check `chrome://extensions/` — is pdpIQ listed and enabled?
- Fix: If not listed, re-load unpacked. If disabled, toggle on. If listed but no icon, click the puzzle icon in Chrome toolbar and pin pdpIQ.

**Issue: "Analyze" produces no results / hangs on loading**
- Likely cause: Content script not injected, or message routing failure
- Diagnosis:
  1. Check target page DevTools console for errors
  2. Check service worker DevTools for message routing errors
  3. Verify page is a web page (not `chrome://`, `about:`, or `file://`)
- Fix:
  - Refresh the target page (content script injects at `document_idle`)
  - Reload the extension from `chrome://extensions/`
  - If on a `chrome://` page: navigate to an actual web page first

**Issue: Analysis times out after 10 seconds**
- Likely cause: Content script crashed or message never received
- Diagnosis: Check content script console for JavaScript errors
- Fix: Refresh target page and retry. If persistent, check for new JavaScript errors in content-script.js.

**Issue: Scores seem wrong or factors show unexpected values**
- Likely cause: Website DOM changed, extraction selectors no longer match
- Diagnosis:
  1. Export the analysis JSON via "Download Analysis Data"
  2. Inspect the `extractedData` section for missing/incorrect values
  3. Compare against the actual page DOM
- Fix: Update extraction selectors in `content-script.js` for the affected site pattern.

**Issue: Side panel blank or CSS broken**
- Likely cause: CSP violation or file path error after refactoring
- Diagnosis: Right-click side panel → Inspect → Console for errors
- Fix: Check `manifest.json` `side_panel.default_path` is correct. Verify no inline scripts (CSP prohibits them).

**Issue: "Service worker (inactive)" on extension card**
- Likely cause: Normal Chrome behavior — service workers go idle after 30 seconds of inactivity
- Diagnosis: This is expected. The worker activates on demand.
- Fix: No fix needed. Clicking the extension icon or sending a message wakes it up.

**Issue: og:image format shows "unknown" instead of pass/fail**
- Likely cause: CORS blocked the HEAD request, and magic bytes fetch also failed
- Diagnosis: Check service worker console for CORS errors on the image URL
- Fix: Not a bug — some CDNs block cross-origin HEAD requests. The URL extension fallback is the last resort. If the URL has no extension (e.g., CDN hash URLs), format remains unknown.

**Issue: Storage full / history not saving**
- Likely cause: Auto-pruning failed or storage corrupted
- Diagnosis: Run `getStorageStats()` in side panel console (see Health Check #3)
- Fix: Clear history from the History tab. If that fails: `chrome.storage.local.remove('analysisHistory')` in console.

### Escalation Path

| Severity | Criteria | Response Time | Action |
|----------|---------|---------------|--------|
| Critical | Extension crashes Chrome, data loss, security vulnerability | Immediate | Unpublish from Chrome Web Store if published; fix and republish |
| High | Core analysis broken (scores wrong, no results), blocks user workflow | Same day | Fix in code, test with regression checklist, republish |
| Medium | Non-critical feature broken (export fails, history display issue), workaround exists | Next sprint | Log issue, schedule fix, communicate workaround |
| Low | Cosmetic issue, minor scoring inaccuracy on rare page type | Backlog | Track for future improvement |

## 8. Backup & Recovery

| Data | Backup Method | Frequency | Location | Recovery Steps |
|------|-------------|-----------|----------|---------------|
| Source code | Git | Every commit | Git remote (GitHub) | `git clone` or `git checkout` |
| Extension configuration | Git-tracked (`manifest.json`) | Every commit | Repository | `git checkout manifest.json` |
| User analysis history | None — user-local data in `chrome.storage.local` | N/A | User's Chrome profile | Not recoverable if Chrome profile is lost; users can export via "Download Analysis Data" |
| Chrome Web Store listing | Chrome Web Store retains all versions | Per-upload | Google servers | Re-upload previous zip from local archive |
| Store listing assets (screenshots, description) | Should be saved in `docs/` or a `store-assets/` directory | Per-update | Repository | Re-upload from repository |

**Important notes on data recovery:**
- There is no server-side data to back up. All analysis data is in the user's browser.
- The "Download Analysis Data" (JSON export) is the user's only backup mechanism for their history.
- If a user uninstalls the extension, `chrome.storage.local` data is deleted permanently.
- Chrome Sync does not sync `chrome.storage.local` — data is per-device only.

## 9. Access & Credentials Reference

_DO NOT put actual credentials here._

| Credential | Storage Location | Who Has Access | Rotation Schedule |
|-----------|-----------------|---------------|------------------|
| Chrome Web Store Developer Account | Google account (Tribbute) | [FLAG: Cannot determine from code who has publishing access] | N/A (Google account) |
| Git repository access | GitHub / hosting provider | [FLAG: Cannot determine from code] | Per org policy |

**No other credentials exist.** pdpIQ has:
- No API keys
- No OAuth tokens
- No database credentials
- No server access keys
- No secrets of any kind

The extension's `content_security_policy` in `manifest.json` enforces `script-src 'self'; object-src 'self'`, preventing any external script injection.

---

### Release Checklist (Copy-Paste for Each Release)

```
Release: v_____ | Date: ________

Pre-release:
□ All DEBUG flags set to false (grep -r "const DEBUG = true" src/)
□ manifest.json version incremented
□ Regression test checklist passed (05-TEST_PLAN.md §5)
□ CLAUDE.md updated if architecture changed
□ PRIVACY.md updated if permissions or network requests changed

Package:
□ Zip created excluding docs/, CLAUDE.md, .git/
□ Zip tested by loading unpacked in a clean Chrome profile
□ Extension works on at least 3 different eCommerce sites

Publish:
□ Uploaded to Chrome Web Store Developer Dashboard
□ Store listing description updated (if applicable)
□ Submitted for review
□ Confirmed review approval (typically 1-3 business days)

Post-release:
□ Git tag created: git tag v_____ && git push --tags
□ Verified live install from Chrome Web Store works
□ Monitored Developer Dashboard for 48 hours post-publish
```

---

_This runbook should be tested by following it on a clean environment at least once. Last tested: [Not yet tested]. Last reviewed: 2026-03-01._
