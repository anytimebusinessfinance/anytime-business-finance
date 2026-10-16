(() => {
  'use strict';
  const id = String(window.ABF_ANALYTICS_CONFIG?.measurementId || '');
  const configured = /^G-[A-Z0-9]{6,}$/.test(id);
  const storageKey = 'abf-analytics-consent-v1';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const calculators = new Set(['loan', 'interest', 'dscr', 'asset']);
  const modes = new Set(['annual_reducing', 'apr_effective', 'effective_yield', 'monthly_reducing', 'daily_reducing', 'flat_annual', 'flat_monthly', 'factor', 'term_yield']);
  const once = new Set();
  let consent = readConsent(), loaded = false, pageSent = false, dialog, returnFocus;
  function readConsent() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && typeof saved.accepted === 'boolean' && Number.isFinite(saved.time) && Date.now() - saved.time < lifetime && saved.time <= Date.now()) return saved.accepted;
    } catch (_) { /* A blocked storage API must not prevent site use. */ }
    return null;
  }
  const safeLocation = () => location.origin + location.pathname;
  function safeReferrer() {
    try { return new URL(document.referrer).origin + '/'; } catch (_) { return ''; }
  }
  function gtag() { window.dataLayer.push(arguments); }
  function send(name, params = {}) {
    if (!configured || consent !== true || !loaded) return false;
    gtag('event', name, {send_to: id, page_location: safeLocation(), page_referrer: safeReferrer(), ...params});
    return true;
  }
  function sendOnce(key, name, params) {
    if (!once.has(key) && send(name, params)) once.add(key);
  }
  function enable() {
    if (!configured || consent !== true) return;
    window['ga-disable-' + id] = false;
    if (!loaded) {
      window.dataLayer = window.dataLayer || [];
      gtag('consent', 'default', {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
      gtag('js', new Date());
      gtag('set', {page_location: safeLocation(), page_referrer: safeReferrer()});
      gtag('consent', 'update', {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
      gtag('config', id, {send_page_view: false, page_location: safeLocation(), page_referrer: safeReferrer(), allow_google_signals: false, allow_ad_personalization_signals: false, cookie_domain: location.hostname, cookie_expires: 15552000, cookie_update: false, cookie_flags: 'SameSite=Lax;Secure'});
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
      document.head.appendChild(script);
      loaded = true;
    } else {
      gtag('consent', 'update', {analytics_storage: 'granted'});
    }
    if (!pageSent) pageSent = send('page_view', {page_title: document.title});
  }
  function clearAnalyticsCookies() {
    const domains = ['', location.hostname, '.' + location.hostname];
    for (const item of document.cookie.split(';')) {
      const name = item.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of domains) document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax; Secure' + (domain ? '; Domain=' + domain : '');
    }
  }
  function disable() {
    if (configured) window['ga-disable-' + id] = true;
    if (loaded) gtag('consent', 'update', {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
    clearAnalyticsCookies();
  }
  function choose(accepted) {
    consent = accepted;
    try { localStorage.setItem(storageKey, JSON.stringify({accepted, time: Date.now()})); } catch (_) {}
    if (accepted) enable();
    else disable();
    dialog?.close();
    returnFocus?.focus();
  }
  function showSettings() {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'analytics-dialog';
      dialog.setAttribute('aria-labelledby', 'analytics-title');
      dialog.innerHTML = '<h2 id="analytics-title">Your privacy choices</h2><p>' + (configured ? 'With your permission, we use Google Analytics to understand page visits, calculator use and enquiry actions. We do not send your form entries or calculator figures to analytics. You can use the website without accepting.' : 'Optional analytics is not active on this preview. No Google Analytics data is being collected.') + '</p><p><a href="cookies.html">Read our cookie information</a></p><div class="analytics-actions">' + (configured ? '<button type="button" data-analytics-choice="reject">Reject optional analytics</button><button type="button" data-analytics-choice="accept">Accept optional analytics</button>' : '<button type="button" data-analytics-choice="close">Close</button>') + '</div>';
      document.body.appendChild(dialog);
      dialog.addEventListener('cancel', event => {event.preventDefault(); if (configured) choose(false); else dialog.close();});
    }
    returnFocus = document.activeElement;
    if (!dialog.open) dialog.showModal();
  }
  document.addEventListener('click', event => {
    const el = event.target.closest?.('[data-analytics-settings], [data-analytics-choice], a[href], .calc-tab, #exportPdf');
    if (!el) return;
    if (el.hasAttribute('data-analytics-settings')) {event.preventDefault(); showSettings(); return;}
    if (el.hasAttribute('data-analytics-choice')) {
      const choice = el.getAttribute('data-analytics-choice');
      if (choice === 'close') dialog.close(); else choose(choice === 'accept');
      return;
    }
    if (el.matches('.calc-tab') && calculators.has(el.dataset.target)) send('calculator_open', {calculator_type: el.dataset.target});
    if (el.id === 'exportPdf') send('illustration_click', {calculator_type: 'loan'});
    if (el.matches('a[href]')) {
      const href = el.getAttribute('href');
      if (href.startsWith('mailto:')) send('contact_click', {contact_method: 'email'});
      else if (href.startsWith('tel:')) send('contact_click', {contact_method: 'phone'});
      else {
        try {
          const url = new URL(href, location.href);
          if (url.origin === location.origin && url.pathname.endsWith('/discuss-funding.html')) send('enquiry_click');
        } catch (_) {}
      }
    }
  });
  function calculatorUse(event) {
    const panel = event.target.closest?.('.calc-panel');
    const type = panel?.id.replace('calc-', '');
    if (!calculators.has(type)) return;
    sendOnce('calculator-use-' + type, 'calculator_use', {calculator_type: type});
    if (event.type === 'change' && /^(loan|io|asset)Mode$/.test(event.target.id) && modes.has(event.target.value)) send('calculator_rate_select', {calculator_type: type, rate_type: event.target.value});
  }
  document.addEventListener('input', calculatorUse);
  document.addEventListener('change', calculatorUse);
  document.addEventListener('input', event => {
    if (event.target.closest?.('.page-enquiry form')) sendOnce('enquiry-start', 'enquiry_start');
  });
  document.addEventListener('submit', event => {
    // A submit attempt is not evidence of a successfully delivered enquiry.
    if (event.target.matches('.page-enquiry form')) send('enquiry_submit_attempt');
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    consent = readConsent();
    if (consent === true) enable(); else disable();
  });
  window.ABFAnalytics = Object.freeze({
    configured,
    showSettings,
    illustrationCreated: () => send('illustration_created', {calculator_type: 'loan'}),
    // Call ONLY after the future enquiry backend confirms successful receipt.
    enquiryReceived: () => sendOnce('enquiry-received', 'generate_lead')
  });
  if (consent === true) enable();
  if (configured && consent === null) showSettings();
})();
