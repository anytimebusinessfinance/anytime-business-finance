# Anytime Business Finance — Premium Redesign
Premium navy/gold static site prepared for GitHub Pages preview.
The enquiry form is preview-only on GitHub Pages. Production submission handling should be configured on the final PHP-capable host.

## Website analytics activation

Tracking code is installed but **collection is off** until `analytics-config.js`
contains the real GA4 web-stream measurement ID (`G-...`). Do not use a sample ID.
Google's tag is loaded only after a visitor accepts optional analytics. Reject,
withdrawal and cross-tab consent changes stop collection. Consent choices and GA
cookies have a 180-day maximum configured duration. Advertising features are off.

Before enabling the ID:

1. Create/select the ABF GA4 property and web stream for the final website URL.
2. Disable Enhanced Measurement for the stream. This implementation sends its own
   page and interaction events, avoiding duplicate counts and automatic capture
   of form/link details. Disable collection of user-provided data and Google
   signals; do not enable advertising integrations.
3. Set event-data retention to two months, enable email/query data redaction as
   a secondary safeguard, and configure internal/developer traffic exclusions.
4. Add the measurement ID to `analytics-config.js`. Test accept, reject, withdrawal,
   and the events below in GA4 Realtime/DebugView before launch. Browser blockers
   and refusal of consent mean analytics will not count all visitors.
5. Add `calculator_type`, `rate_type` and `contact_method` as event-scoped custom
   dimensions if those breakdowns are wanted in GA4 reports.

| Event | Meaning |
| --- | --- |
| `page_view` | One view of each page after consent |
| `calculator_open` | A calculator tab was selected |
| `calculator_use` | First calculator input interaction, once per calculator per page |
| `calculator_rate_select` | A supported interest rate basis was selected |
| `illustration_click` | Illustration button clicked |
| `illustration_created` | Illustration popup was created; not proof of a saved download |
| `enquiry_click` | A link to the enquiry page was clicked |
| `contact_click` | Email/phone contact link clicked; not proof of a message or call |
| `enquiry_start` | First enquiry form input interaction on the page |
| `enquiry_submit_attempt` | Valid form submission attempted; not proof of delivery |
| `generate_lead` | Reserved for confirmed backend receipt at go-live |

The existing preview enquiry form and its delivery behaviour are unchanged.
Do not count visits to `thank-you.html` as delivered enquiries. At go-live, call
`window.ABFAnalytics?.enquiryReceived()` only after the backend confirms receipt.
Register `generate_lead` as a key event only after this integration is verified.

Custom events carry only allowlisted calculator/rate types and contact methods.
They do not carry amounts, typed rates, fees, contact information or form text.
Page URLs exclude query strings/fragments, and referrers are reduced to origins.
No CRM integration or report dashboard has been configured by this change.

## Calculator parity

`rate-math.js` is aligned with the CRM calculation module as of 17 October 2026
(source revision `4d4654431406be601f42d4df2c70c890bdb2d968`). All nine CRM rate
bases are available in the loan, interest-only and asset finance calculators.
This includes the CRM's retained-interest treatment, which deducts interest from
the advance without adding it again to principal repayable at maturity.
Run `npm ci` then `npm test` for the calculation, calculator UI and consent checks.
The website UI and consent tests use `jsdom` (`ABF_TEST_JSDOM` can also point to an
existing installed module).
