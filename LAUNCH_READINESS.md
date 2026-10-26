# Website preparation — 26 October 2026

This branch is prepared for review. It does not launch a website, create a Cloudflare project, connect a domain, activate analytics or send enquiries.

## Build and hosting

Run `npm ci --ignore-scripts`, `npm test`, then `npm run build`. The publish directory is `.site-build`, never the repository root. The explicit allowlist excludes PHP, tests, dependencies, scripts and source notes. Keep the existing finance calculations and script/consent policy unchanged.

If the final HTTPS domain is confirmed, set `ABF_SITE_BASE_URL` for the build, including a trailing slash (and a directory path only when required). This substitutes canonical/OG/structured-data/sitemap preview URLs in the build only. Check all resulting links before release. The build does not authorise launch or change DNS. Verify security response headers after publishing: GitHub Pages does not apply a Cloudflare `_headers` file.

## Identity and public wording

The saved, business-approved CRM terms currently name **Sam Percival trading as Anytime Business Finance**, effective 19 October. This branch removes the unconfirmed Ltd claim from website copy and includes other commercial brokers in remuneration wording. Sam must confirm current identity, any later incorporation details, permissions, factual claims and applicable public notices before release. Do not copy private customer/compliance files or recovery material into this public artifact.

## Enquiries

The email-contact fallback remains available. The preview form stays hidden and has no PHP action: static hosting must never claim receipt through a non-executable handler. Submit is disabled until the actual server-side delivery is selected, configured and genuinely tested.

Before enabling an online form agree the final origin, required data/notice, spam controls, server-side validation, recipient/mail authority, storage/retention and failure/retry behaviour. A website server must not use an end-user CRM token, reveal a service key or accept an arbitrary mail recipient. Prefer the existing Microsoft ecosystem if the administrator approves the appropriate server-side integration; its existing delegated CRM connection is not automatically public-website permission. Validate success, rejection, duplicate/retry and genuine recipient arrival before enabling or counting delivered leads. No new provider account or permission is configured by this branch.

## Tracking, content and assets

Analytics remains off until a real property ID, consent/privacy settings and accept/reject/withdrawal checks are agreed. Clicks are not delivered enquiries. Confirm the selected social profiles and source/licence of the existing London image. Google Fonts currently loads from Google in CSS: account for that request in the actual privacy/supplier inventory or make a reviewed self-hosted-font change. No testimonial, lender-count, funding-total, permission claim or market price was verified by the build.

## Activation items

1. Confirm identity and actual public notices/scope.
2. Confirm the final domain/hosting authority and make the final-base-URL build.
3. Verify all pages, calculator illustrations, HTTPS and response headers at the chosen host.
4. Configure and genuinely test a reviewed form backend before showing the form; email contact can remain the interim route.
5. Enable analytics/indexing only under the agreed launch/privacy plan. The current robots policy remains unchanged.
