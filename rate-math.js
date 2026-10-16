(function (root) {
  'use strict';
  const LEGACY_MODES = [
    ['annual_reducing', 'Annual reducing balance (% p.a.)'],
    ['apr_effective', 'Annual effective interest rate (before fees) (%)'],
    ['effective_yield', 'Effective annual yield (%)'],
    ['monthly_reducing', 'Monthly reducing balance (% per month)'],
    ['daily_reducing', 'Daily reducing balance (% per day)'],
    ['flat_annual', 'Flat rate on original advance (% p.a.)'],
    ['flat_monthly', 'Flat rate on original advance (% per month)'],
    ['factor', 'Factor rate (total repay multiple, e.g. 1.2)'],
    ['term_yield', 'Yield / total interest over full term (%)']
  ];
  // Preserve the stored mode ID; this input is an interest rate, not a fee-inclusive APR.
  const MODES = [LEGACY_MODES[1], ...LEGACY_MODES.filter(mode => mode[0] !== 'apr_effective')];
  function setRateSelection(select, value) {
    if (!select) return;
    select.querySelectorAll('[data-saved-rate]').forEach(option => option.remove());
    if (![...select.options].some(option => option.value === value)) {
      const option = select.ownerDocument.createElement('option');
      option.value = value;
      option.textContent = 'Saved rate: ' + (LEGACY_MODES.find(mode => mode[0] === value)?.[1] || (value === 'other' ? 'Text as quoted' : value));
      option.setAttribute('data-saved-rate', 'true');
      select.appendChild(option);
    }
    select.value = value;
  }
  const STYLES = [
    ['amortizing', 'Monthly amortising (principal + interest)'],
    ['serviced', 'Interest serviced monthly; principal at maturity'],
    ['retained', 'Simple interest retained; principal at maturity'],
    ['compound', 'Interest rolled up with monthly compounding']
  ];
  function feeAmount(amount, value, type) {
    const quoted = Math.max(0, Number(String(value ?? '').replace(/[£,%\s]/g, '')) || 0);
    return type === 'percent' || (!type && String(value).includes('%'))
      ? Math.round(Math.max(0, Number(amount) || 0) * quoted) / 100 : quoted;
  }
  function periodRate(value, mode, periodsPerYear) {
    const x = Math.max(0, Number(value) || 0) / 100;
    if (mode === 'annual_reducing') return x / periodsPerYear;
    if (mode === 'apr_effective' || mode === 'effective_yield') return Math.expm1(Math.log1p(x) / periodsPerYear);
    if (mode === 'monthly_reducing') return Math.expm1(Math.log1p(x) * 12 / periodsPerYear);
    if (mode === 'daily_reducing') return Math.expm1(Math.log1p(x) * 365 / periodsPerYear);
    return 0;
  }
  function annuity(principal, rate, periods) {
    return rate === 0 ? principal / periods : principal * rate / -Math.expm1(-periods * Math.log1p(rate));
  }
  function interestOnlyMonthlyDisplay(input, result) {
    const term = Math.max(1, Math.round(Number(input.termMonths) || 1));
    const style = input.style || 'serviced';
    const mode = input.mode || 'annual_reducing';
    const allocatedModes = ['flat_annual', 'flat_monthly', 'factor', 'term_yield'];
    if (style === 'retained') return {label:'Average monthly retained interest (not a payment)', value:result.financeCharge / term};
    if (style === 'compound' && allocatedModes.includes(mode)) return {label:'Average monthly charge (not a payment)', value:result.financeCharge / term};
    if (style === 'compound') {
      return {label:'Month 1 interest (not a payment)', value:result.interestPrincipal * periodRate(input.rate, mode, 12)};
    }
    return {label:'Monthly interest', value:result.payment};
  }
  function irrAnnualized(netAdvance, cashflows, periodsPerYear) {
    if (!(netAdvance > 0) || !cashflows.some(x => x > 0)) return null;
    const sum = cashflows.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - netAdvance) <= Number.EPSILON * Math.max(sum, netAdvance) * cashflows.length) return 0;
    if (sum < netAdvance) return null;
    const presentValue = rate => cashflows.reduce((pv, cf, index) => pv + cf * Math.exp(-(index + 1) * Math.log1p(rate)), 0);
    let lo = 0, hi = 1;
    while (presentValue(hi) > netAdvance && Number.isFinite(hi * 2)) hi *= 2;
    if (presentValue(hi) > netAdvance) return null;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      const pv = presentValue(mid);
      if (pv > netAdvance) lo = mid; else hi = mid;
    }
    const annualized = Math.expm1(Math.log1p((lo + hi) / 2) * periodsPerYear);
    return Number.isFinite(annualized) ? annualized : null;
  }
  function number(value, fallback, label) {
    const n = Number(value ?? fallback);
    if (value === '' || !Number.isFinite(n) || n < 0) throw new RangeError(label + ' must be a finite, non-negative number.');
    return n;
  }
  function calculate(input) {
    const principal = number(input.amount, 0, 'Amount');
    const frequency = number(input.frequency, 12, 'Payment frequency');
    const term = number(input.termMonths, 1, 'Term');
    const periods = term * frequency / 12;
    if (!Number.isInteger(term) || term < 1 || term > 600) throw new RangeError('Enter a whole number of months from 1 to 600.');
    if (!Number.isInteger(frequency) || frequency < 1 || frequency > 365 || !Number.isInteger(periods) || periods < 1) throw new RangeError('Term must contain a whole number of repayment periods; quarterly terms must be a multiple of 3 months.');
    const mode = input.mode || 'annual_reducing';
    const style = input.style || 'amortizing';
    if (!MODES.some(([id]) => id === mode) || !STYLES.some(([id]) => id === style)) throw new RangeError('Choose a supported rate and repayment type.');
    const quote = number(input.rate, 0, 'Rate');
    if (mode === 'factor' && quote < 1) throw new RangeError('Factor rate must be at least 1.');
    const feeQuote = String(input.fees ?? 0).replace(/[£,%\s]/g, '');
    number(feeQuote, 0, 'Arrangement fee');
    const fee = feeAmount(principal, input.fees, input.feeType);
    const financedFees = input.feeTreatment === 'financed' ? fee : 0;
    const upfrontFees = fee - financedFees;
    const balance = principal + financedFees;
    if (upfrontFees > 0 && upfrontFees >= principal) throw new RangeError('Upfront fee must be less than the advance.');
    const interestBasis = input.interestBasis === 'net' ? 'net' : 'gross';
    const interestPrincipal = interestBasis === 'net'
      ? Math.max(0, principal - upfrontFees)
      : balance;
    const interestScale = balance > 0 ? interestPrincipal / balance : 0;
    const balloonTarget = number(input.balloon, 0, 'Balloon');
    if (balloonTarget > balance) throw new RangeError('Balloon must not exceed the financed balance.');
    let payment = 0, totalRepayments = 0, financeCharge = 0, balloon = 0;
    if (mode === 'factor' || mode === 'term_yield' || mode === 'flat_annual' || mode === 'flat_monthly') {
      const charge = mode === 'factor'
        ? interestPrincipal * Math.max(0, quote - 1)
        : mode === 'term_yield' ? interestPrincipal * quote / 100
          : mode === 'flat_monthly' ? interestPrincipal * quote / 100 * term
            : interestPrincipal * quote / 100 * periods / frequency;
      if (style === 'amortizing') {
        balloon = balloonTarget;
        payment = Math.max(0, balance + charge - balloon) / periods;
        totalRepayments = payment * periods + balloon;
        financeCharge = totalRepayments - balance;
      } else if (style === 'serviced') {
        financeCharge = charge;
        payment = charge / periods;
        balloon = balance;
        totalRepayments = charge + balance;
      } else if (style === 'retained') {
        financeCharge = charge;
        balloon = balance;
        totalRepayments = balloon;
      } else {
        financeCharge = charge;
        balloon = balance + charge;
        totalRepayments = balloon;
      }
    } else if (style === 'amortizing') {
      const r = periodRate(quote, mode, frequency) * interestScale;
      balloon = balloonTarget;
      payment = annuity(balance - balloon, r, periods) + balloon * r;
      totalRepayments = payment * periods + balloon;
      financeCharge = Math.max(0, totalRepayments - balance);
    } else if (style === 'serviced') {
      const r = periodRate(quote, mode, frequency);
      payment = interestPrincipal * r;
      financeCharge = payment * periods;
      balloon = balance;
      totalRepayments = financeCharge + balloon;
    } else if (style === 'retained') {
      const r = periodRate(quote, mode, frequency);
      financeCharge = interestPrincipal * r * periods;
      balloon = balance;
      totalRepayments = balloon;
    } else {
      const r = periodRate(quote, mode, frequency);
      balloon = balance + interestPrincipal * Math.expm1(periods * Math.log1p(r));
      financeCharge = balloon - balance;
      totalRepayments = balloon;
    }
    const suppliedPayment = number(input.monthlyPayment, 0, 'Supplied payment');
    if (suppliedPayment > 0 && ['amortizing','serviced'].includes(style)) {
      payment = suppliedPayment;
      totalRepayments = suppliedPayment * periods + (style === 'serviced' ? balloon : style === 'amortizing' ? balloonTarget : 0);
      if (style === 'amortizing') balloon = balloonTarget;
      financeCharge = totalRepayments - balance;
      if (financeCharge < 0) throw new RangeError('Supplied payments do not repay the financed balance and balloon.');
    }
    const retainedInterest = style === 'retained' ? financeCharge : 0;
    const netAdvance = principal - upfrontFees - retainedInterest;
    if (retainedInterest > 0 && netAdvance <= Math.max(1, principal) * Number.EPSILON * 32) throw new RangeError('Retained interest and upfront fees must leave a positive net advance.');
    if (![balance, payment, balloon, financeCharge, totalRepayments, netAdvance].every(Number.isFinite)) throw new RangeError('These figures exceed the calculation range; reduce the amount, rate or term.');
    const cashflows = Array(periods).fill(0);
    if (style === 'amortizing' || style === 'serviced') cashflows.fill(payment);
    if (style === 'serviced') cashflows[periods - 1] += balloon;
    else if (style === 'retained' || style === 'compound' || (mode === 'factor' || mode === 'term_yield' || mode === 'flat_annual' || mode === 'flat_monthly') && style !== 'amortizing') cashflows[periods - 1] = balloon;
    if (style === 'amortizing' && suppliedPayment > 0) cashflows.fill(suppliedPayment);
    if (style === 'amortizing' && balloon > 0) cashflows[periods - 1] += balloon;
    const annualized = irrAnnualized(netAdvance, cashflows, frequency);
    // Total payable includes charges withheld at drawdown, as well as later repayments.
    const totalRepayable = totalRepayments + upfrontFees + retainedInterest;
    const totalCost = financeCharge + fee;
    if (![totalRepayable, totalCost].every(Number.isFinite)) throw new RangeError('These totals exceed the calculation range.');
    return { principal, financedAmount: balance, interestPrincipal, interestBasis, periods, mode, style, payment, balloon, totalRepayments, totalRepayable, totalAmountPayable: totalRepayable, financeCharge, retainedInterest, fees: fee, financedFees, upfrontFees, netAdvance, totalCost, annualizedAnnual: annualized };
  }
  const api = { MODES, LEGACY_MODES, setRateSelection, STYLES, feeAmount, periodRate, annuity, calculate, interestOnlyMonthlyDisplay };
  root.CRMRateMath = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

