const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require(process.env.ABF_TEST_JSDOM || 'jsdom');
const RM = require('../rate-math.js');
const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

// Independent cash-flow checks: reduce the balance period by period, rather
// than checking the payment against the same closed-form formula as the code.
let cases = 0;
for (const [mode] of RM.MODES) for (const [style] of RM.STYLES) {
  for (const feeTreatment of ['upfront', 'financed']) for (const interestBasis of ['gross', 'net']) for (const frequency of [4, 12]) {
    const rate = mode === 'factor' ? 1.2 : mode === 'daily_reducing' ? 0.03 : ['monthly_reducing', 'flat_monthly'].includes(mode) ? 1 : 12;
    const input = {amount: 100000, rate, mode, style, feeTreatment, interestBasis, frequency, termMonths: 24, fees: 2, feeType: 'percent', balloon: style === 'amortizing' ? 20000 : 0};
    const x = RM.calculate(input), n = frequency * 2;
    const fees = 2000, balance = feeTreatment === 'financed' ? 102000 : 100000;
    const upfront = feeTreatment === 'upfront' ? fees : 0;
    const basis = interestBasis === 'gross' ? balance : 100000 - upfront;
    near(x.fees, fees); near(x.financedAmount, balance); near(x.interestPrincipal, basis);
    near(x.totalCost, x.financeCharge + fees);
    near(x.totalRepayable, 100000 + x.totalCost);
    near(x.netAdvance, 100000 - upfront - (style === 'retained' ? x.financeCharge : 0));
    near(x.totalRepayments - x.netAdvance, x.totalCost);
    const r = mode === 'annual_reducing' ? rate / 100 / frequency
      : ['apr_effective', 'effective_yield'].includes(mode) ? (1 + rate / 100) ** (1 / frequency) - 1
      : mode === 'monthly_reducing' ? (1 + rate / 100) ** (12 / frequency) - 1
      : mode === 'daily_reducing' ? (1 + rate / 100) ** (365 / frequency) - 1 : null;
    if (r !== null) {
      if (style === 'amortizing') {
        let remaining = balance, interest = 0;
        for (let i = 0; i < n; i++) { const charge = remaining * r * basis / balance; interest += charge; remaining += charge - x.payment; }
        near(remaining, 20000); near(interest, x.financeCharge);
      } else if (style === 'compound') {
        let accrued = basis;
        for (let i = 0; i < n; i++) accrued *= 1 + r;
        near(x.balloon, balance + accrued - basis);
      } else near(x.financeCharge, basis * r * n);
    } else {
      const charge = mode === 'factor' ? basis * (rate - 1) : mode === 'term_yield' ? basis * rate / 100 : mode === 'flat_monthly' ? basis * rate / 100 * 24 : basis * rate / 100 * 2;
      near(x.financeCharge, charge);
    }
    const flows = Array(n).fill(['amortizing', 'serviced'].includes(style) ? x.payment : 0);
    flows[n - 1] += x.balloon;
    const perPeriod = (1 + x.annualizedAnnual) ** (1 / frequency) - 1;
    const pv = flows.reduce((sum, flow, i) => sum + flow / (1 + perPeriod) ** (i + 1), 0);
    near(pv, x.netAdvance);
    cases++;
  }
}

// Zero and near-zero rates, balloon-only capital, retained deductions, and
// unusually high cash-flow yields exercise the previous numerical failures.
for (const mode of ['annual_reducing', 'apr_effective', 'effective_yield', 'monthly_reducing', 'daily_reducing']) {
  const x = RM.calculate({amount: 12000, rate: 1e-14, mode, termMonths: 12, balloon: 6000});
  near(x.payment, 500); near(x.totalCost, 0);
}
for (const feeTreatment of ['upfront','financed']) for (const interestBasis of ['gross','net']) {
  const x = RM.calculate({amount:50000,rate:0.1,mode:'daily_simple',style:'serviced',termMonths:12,fees:1000,feeTreatment,interestBasis});
  const basis = interestBasis==='net' ? (feeTreatment==='upfront'?49000:50000) : (feeTreatment==='financed'?51000:50000);
  near(x.financeCharge,basis*0.001*365);
  near(x.payment,basis*0.001*365/12);
}
const zero = RM.calculate({amount: 12000, rate: 0, termMonths: 12});
assert.equal(zero.annualizedAnnual, 0); near(zero.payment, 1000);
const retained = RM.calculate({amount: 100000, rate: 12, termMonths: 12, style: 'retained', fees: 1000});
near(retained.totalRepayable, 113000); near(retained.totalCost, 13000); near(retained.netAdvance, 87000); near(retained.balloon, 100000);
const highYield = RM.calculate({amount: 100000, rate: 99.9, mode: 'term_yield', style: 'retained', termMonths: 1});
near(highYield.annualizedAnnual, 1000 ** 12 - 1);
near(RM.feeAmount(100000, '1e-3'), 0.001);
for (const bad of [
  {amount: Infinity}, {amount: -1}, {rate: NaN}, {rate: -1}, {rate: 0.9, mode: 'factor'},
  {termMonths: 0}, {termMonths: 1.5}, {termMonths: 601}, {termMonths: 10, frequency: 4},
  {fees: -1}, {fees: 100000}, {balloon: 100001}, {mode: 'unknown'}, {style: 'unknown'},
  {style: 'retained', rate: 100}, {style: 'compound', rate: 1000000, mode: 'daily_reducing'},
  {monthlyPayment: 1}
]) assert.throws(() => RM.calculate({amount: 100000, rate: 0, termMonths: 12, ...bad}), RangeError);

const dom = new JSDOM(fs.readFileSync('calculators.html', 'utf8'), {url: 'https://example.com/calculators.html', runScripts: 'outside-only'});
const w = dom.window, $ = id => w.document.getElementById(id);
w.HTMLElement.prototype.scrollIntoView = function() {};
w.eval(fs.readFileSync('rate-math.js', 'utf8'));
w.eval(fs.readFileSync('calculators.js', 'utf8'));
function fill(values) { for (const [id, value] of Object.entries(values)) { $(id).value = String(value); $(id).dispatchEvent(new w.Event('input')); } }
for (const prefix of ['loan', 'io', 'property', 'asset']) {
  fill({[prefix + 'Rate']: ''});
  assert.equal($(prefix + 'Error').hidden, false);
  assert.equal($(prefix === 'loan' ? 'loanPayment' : prefix === 'asset' ? 'assetPayment' : prefix + 'Monthly').textContent, '—');
  fill({[prefix + 'Rate']: 0}); assert.equal($(prefix + 'Error').hidden, true);
  fill({[prefix + 'Term']: 1.5}); assert.equal($(prefix + 'Error').hidden, false);
  fill({[prefix + 'Term']: 12}); assert.equal($(prefix + 'Error').hidden, true);
  fill({[prefix + 'Rate']: -1}); assert.equal($(prefix + 'Error').hidden, false);
  fill({[prefix + 'Mode']: 'annual_reducing', [prefix + 'Rate']: 12}); assert.equal($(prefix + 'Error').hidden, true);
}
fill({loanFrequency: 4, loanTerm: 10});
assert.equal($('loanTerm').value, '10', 'never rewrite a quoted term');
assert.equal($('exportPdf').disabled, true); assert.match($('loanError').textContent, /multiple of 3/);
fill({loanTerm: 12}); assert.equal($('exportPdf').disabled, false);
fill({assetCost: 100000, assetDeposit: 120000}); assert.match($('assetError').textContent, /Deposit/);
fill({assetDeposit: 20000, assetBalloon: 90000}); assert.match($('assetError').textContent, /Balloon/);
fill({assetBalloon: 20000, assetFeeUnit: 'percent', assetFee: 2, assetFeeTreatment: 'financed', assetRate: 0});
assert.equal($('assetFinanced').textContent, '£81,600.00');
assert.equal($('assetPayment').textContent, '£5,133.33');
assert.equal($('assetTotal').textContent, '£101,600.00');
assert.match($('assetNote').textContent, /£20,000.00/);
fill({propertyProduct: 'bridging', propertyType: 'retained', propertyAmount: 100000, propertyTerm: 12, propertyRate: 1, propertyFee: 1000});
assert.equal($('propertyTotal').textContent, '£113,000.00');
assert.equal($('propertyNet').textContent, '£87,000.00');
assert.match($('propertyMonthlyLabel').textContent, /not a payment/);
fill({propertyRate: 100}); assert.equal($('propertyError').hidden, false);
fill({propertyProduct: 'mortgage', propertyType: 'amortizing', propertyRate: 12});
assert.match($('propertyNote').textContent, /final regular repayment is still payable/);

let illustration;
w.open = () => ({document: {write: html => { illustration = html; }, close() {}}});
fill({loanFrequency: 12, loanAmount: 100000, loanTerm: 12, loanRate: 12, loanFee: 1000});
$('exportPdf').click();
const pdf = new JSDOM(illustration).window.document;
assert.equal(pdf.querySelectorAll('tbody tr').length, 13);
assert.equal(pdf.querySelector('tbody tr:last-child td:last-child').textContent, '£0.00');
assert.match(pdf.body.textContent, /£107,618.55/);
assert.match(pdf.body.textContent, /displayed rows may not sum exactly/);
dom.window.close();

const enquiry = new JSDOM(fs.readFileSync('discuss-funding.html', 'utf8')).window.document;
assert.equal(enquiry.querySelector('form').hidden, true);
assert.equal(enquiry.querySelector('form').getAttribute('method'), 'post');
assert.match(enquiry.body.textContent, /Online enquiries are not available on this preview/);
assert.ok(enquiry.querySelector('a[href="mailto:sam@anytimebusinessfinance.co.uk"]'));
console.log(`${cases} independent rate/style/fee/frequency checks plus numerical, validation, illustration and enquiry regressions passed`);
