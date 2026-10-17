# Anytime Business Finance — Premium Redesign
Premium navy/gold static site prepared for GitHub Pages preview.
GitHub Pages cannot process the PHP enquiry handler. The preview therefore shows
an email contact link and keeps the form hidden, instead of claiming that an
enquiry was received. The form uses POST for a future PHP-capable host; reveal it
only after configuring and testing actual delivery on that host.

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

Do not count visits to `thank-you.html` as delivered enquiries. At go-live, call
`window.ABFAnalytics?.enquiryReceived()` only after the backend confirms receipt.
Register `generate_lead` as a key event only after this integration is verified.

Custom events carry only allowlisted calculator/rate types and contact methods.
They do not carry amounts, typed rates, fees, contact information or form text.
Page URLs exclude query strings/fragments, and referrers are reduced to origins.
No CRM integration or report dashboard has been configured by this change.

## Calculator mathematics

The public calculators use short, product-specific menus:

| Calculator | Rate choices |
| --- | --- |
| Business loans | Annual reducing, monthly reducing, flat annual, factor |
| Revolving credit (interest-only illustration) | Annual, monthly, simple daily interest on the drawn balance |
| Commercial mortgage | Annual interest, with capital-and-interest or interest-only payments |
| Bridging finance | Monthly interest, serviced, retained or rolled up with monthly compounding |
| Asset finance | Flat annual or annual reducing, with deposit and optional balloon |

Mortgage and bridging sit in the same property tab; the rate basis follows the
selected product automatically. Switching products restores the visitor's rate,
term and repayment choice for that product. Starting values are illustrations,
not market prices. The longer technical assumptions are in an expandable section.

The original nine modes remain supported by the calculation module for backwards
compatibility, but are not all exposed in the public menus. The new
`daily_simple` mode calculates revolving interest without daily compounding and
uses 365 days per year; the monthly result is labelled as an average. The
original CRM-derived module (blob
`4d4654431406be601f42d4df2c70c890bdb2d968`) has been corrected by the website audit;
do not assume unchanged parity with an external CRM.

- Nominal annual interest is divided by the payment frequency. Monthly interest
  is converted to the repayment period. The legacy annual effective and
  compounded daily modes retain their original conversions. All daily modes
  use 365 days per year and equal periods, not actual calendar dates.
- Reducing-balance repayments follow an annuity with payments at period end.
  The asset balloon is an additional payment with the final regular instalment.
  Flat annual/monthly, factor and full-term yield quotes specify total charges;
  those charges are not compounded again for a rolled-up facility.
- Percentage fees apply to the requested advance (asset cost less deposit for
  asset finance). Financed fees increase the debt. Upfront fees reduce proceeds.
  The optional net interest basis excludes upfront and financed fees; retained
  interest is not deducted from that interest basis.
- Retained interest reduces cash proceeds and is included in total payable as
  an upfront charge. It is not added to the principal due at maturity. For
  example, £100,000 at 12% nominal annual interest retained for 12 months, with
  a £1,000 upfront fee, has £87,000 net proceeds, £100,000 due at maturity,
  £13,000 total cost and £113,000 total payable including the withheld charges.
- Total cost is interest plus the entered fee. Total payable is the original
  advance plus total cost (plus deposit for the asset purchase total). Monthly
  retained/rolled-up interest figures are labelled as allocations, not payments.
- The legacy `apr_effective` mode ID remains compatible, but its label now says
  **annual effective interest rate before fees**. A fee-inclusive lender APR
  cannot be used as the underlying interest rate and then charged fees again.
- Invalid, non-finite or incomplete values show an error and clear the results.
  Terms are whole months from 1 to 600; quarterly terms must be multiples of
  three. Deposits and balloons cannot exceed their relevant balances. Retained
  interest and upfront fees must leave positive proceeds. No quoted term or
  balloon is silently rewritten.
- Calculations retain full precision, using stable near-zero rate formulas.
  Display and illustration amounts are rounded to pennies; displayed rows can
  differ slightly from totals, and actual lenders may adjust final payments.

Reference conventions: [Microsoft PMT documentation](https://support.microsoft.com/en-US/Excel/pmt-function)
and [MoneyHelper on borrowing interest and arrangement fees](https://www.moneyhelper.org.uk/en/everyday-money/credit/managing-credit-well).

Run `npm ci` then `npm test` for the calculation, calculator UI and consent checks.
The website UI and consent tests use `jsdom` (`ABF_TEST_JSDOM` can also point to an
existing installed module). The audit suite checks 288 combinations of rate,
repayment style, payment frequency, fee treatment and interest basis using
independent balance recurrences and discounted cash flows, plus invalid inputs,
near-zero rates, high yields, retained totals, asset balloons, and illustrations.
