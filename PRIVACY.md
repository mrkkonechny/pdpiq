# Privacy Policy — pdpIQ

**Effective date:** February 2026

pdpIQ is a Chrome extension by Tribbute that analyzes eCommerce product pages for AI citation readiness.

## Data Collection

pdpIQ does **not** collect, transmit, or share any user data with external servers. All analysis runs entirely within your browser.

## Local Storage

Analysis history is stored locally via `chrome.storage.local` (Chrome's built-in extension storage). This data never leaves your device. You can clear it at any time from the History tab.

## Network Requests

pdpIQ makes the following network requests, **only to the site you are actively analyzing**:

| Request | Purpose |
|---------|---------|
| HTTP HEAD to og:image URL | Verify image format (WebP detection) |
| GET `/robots.txt` | Check AI crawler access rules |
| HEAD `/llms.txt`, `/llms-full.txt` | Check for LLM guidance files |
| HEAD to page URL | Read `Last-Modified` header |

No requests are made to Tribbute servers, analytics services, or any third party.

## Permissions

| Permission | Reason |
|------------|--------|
| `activeTab` | Access the current tab for analysis |
| `sidePanel` | Display results in the Chrome side panel |
| `storage` | Save analysis history locally |
| `<all_urls>` (host) | Needed to analyze product pages on any eCommerce domain |

## Analytics & Telemetry

None. pdpIQ contains no analytics, telemetry, or tracking code.

## Contact

Questions about this policy can be directed to the Tribbute team.
