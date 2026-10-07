(function (root) {
  'use strict';
  const MODES = [
    ['annual_reducing', 'Annual reducing balance (% p.a.)'],
    ['apr_effective', 'APR (effective annual rate, before entered fees) (%)'],
    ['effective_yield', 'Effective annual yield (%)'],
    ['monthly_reducing', 'Monthly reducing balance (% per month)'],
    ['daily_reducing', 'Daily reducing balance (% per day)'],
    ['flat_annual', 'Flat rate on original advance (% p.a.)'],
    ['flat_monthly', 'Flat rate on original advance (% per month)'],
    ['factor', 'Factor rate (total repay multiple, e.g. 1.2)'],
    ['term_yield', 'Yield / total interest over full term (%)']
  ];
  const STYLES = [
    ['amortizing', 'Monthly amortising (principal + interest)'],
    ['serviced', 'Interest serviced monthly; principal at maturity'],
    ['retained', 'Simple interest retained; principal at maturity'],
    ['compound', 'Interest rolled up with monthly compounding']
  ];
  function periodRate(value, mode, periodsPerYear) {
    const x = Math.max(0, Number(value) || 0) / 100;
    if (mode === 'annual_reducing') return x / periodsPerYear;
    if (mode === 'apr_effective' || mode === 'effective_yield') return Math.pow(1 + x, 1 / periodsPerYear) - 1;
    if (mode === 'monthly_reducing') return Math.pow(1 + x, 12 / periodsPerYear) - 1;
    if (mode === 'daily_reducing') return Math.pow(1 + x, 365 / periodsPerYear) - 1;
    return 0;
  }
  function annuity(principal, rate, periods) {
    return rate === 0 ? principal / periods : principal * rate / (1 - Math.pow(1 + rate, -periods));
  }
  function interestOnlyMonthlyDisplay(input, result) {
    const term = Math.max(1, Math.round(Number(input.termMonths) || 1));
    const style = input.style || 'serviced';
    const mode = input.mode || 'annual_reducing';
    const allocatedModes = ['flat_annual', 'flat_monthly', 'factor', 'term_yield'];
    if (style === 'retained') return {label:'Interest retained per month', value:result.financeCharge / term};
    if (style === 'compound' && allocatedModes.includes(mode)) return {label:'Monthly allocated charge', value:result.financeCharge / term};
    if (style === 'compound') {
      const frequency = Math.max(1, Number(input.frequency) || 12);
      return {label:'Month 1 interest', value:result.interestPrincipal * periodRate(input.rate, mode, frequency)};
    }
    return {label:'Monthly interest', value:result.payment};
  }
  function irrAnnualized(netAdvance, cashflows, periodsPerYear) {
    if (!(netAdvance > 0) || !cashflows.some(x => x > 0)) return null;
    let lo = 0, hi = 10;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      let pv = 0;
      cashflows.forEach((cf, index) => { pv += cf / Math.pow(1 + mid, index + 1); });
      if (pv > netAdvance) lo = mid; else hi = mid;
    }
    return Math.pow(1 + (lo + hi) / 2, periodsPerYear) - 1;
  }
  function calculate(input) {
    const principal = Math.max(0, Number(input.amount) || 0);
    const frequency = Math.max(1, Number(input.frequency) || 12);
    const periods = Math.max(1, Math.round((Number(input.termMonths) || 1) * frequency / 12));
    const mode = input.mode || 'annual_reducing';
    const style = input.style || 'amortizing';
    const quote = Math.max(0, Number(input.rate) || 0);
    const fee = Math.max(0, Number(input.fees) || 0);
    const financedFees = input.feeTreatment === 'financed' ? fee : 0;
    const upfrontFees = fee - financedFees;
    const balance = principal + financedFees;
    const interestBasis = input.interestBasis === 'net' ? 'net' : 'gross';
    const interestPrincipal = interestBasis === 'net'
      ? Math.max(0, principal - upfrontFees)
      : balance;
    const interestScale = balance > 0 ? interestPrincipal / balance : 0;
    const balloonTarget = Math.min(balance, Math.max(0, Number(input.balloon) || 0));
    let payment = 0, totalRepayments = 0, financeCharge = 0, balloon = 0;
    if (mode === 'factor' || mode === 'term_yield' || mode === 'flat_annual' || mode === 'flat_monthly') {
      const charge = mode === 'factor'
        ? interestPrincipal * Math.max(0, quote - 1)
        : mode === 'term_yield' ? interestPrincipal * quote / 100
          : mode === 'flat_monthly' ? interestPrincipal * quote / 100 * Math.max(1, Number(input.termMonths) || 1)
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
        balloon = balance + charge;
        totalRepayments = balloon;
      } else {
        financeCharge = charge;
        balloon = balance + charge;
        totalRepayments = balloon;
      }
    } else if (style === 'amortizing') {
      const r = periodRate(quote, mode, frequency) * interestScale;
      balloon = balloonTarget;
      const presentValueBalloon = balloon / Math.pow(1 + r, periods);
      payment = annuity(Math.max(0, balance - presentValueBalloon), r, periods);
      totalRepayments = payment * periods + balloon;
      financeCharge = totalRepayments - balance;
    } else if (style === 'serviced') {
      const r = periodRate(quote, mode, frequency);
      payment = interestPrincipal * r;
      financeCharge = payment * periods;
      balloon = balance;
      totalRepayments = financeCharge + balloon;
    } else if (style === 'retained') {
      const r = periodRate(quote, mode, frequency);
      financeCharge = interestPrincipal * r * periods;
      balloon = balance + financeCharge;
      totalRepayments = balloon;
    } else {
      const r = periodRate(quote, mode, frequency);
      balloon = balance + interestPrincipal * (Math.pow(1 + r, periods) - 1);
      financeCharge = balloon - balance;
      totalRepayments = balloon;
    }
    const suppliedPayment = Number(input.monthlyPayment) || 0;
    if (suppliedPayment > 0) {
      payment = suppliedPayment;
      totalRepayments = suppliedPayment * periods + (style === 'serviced' ? balloon : style === 'amortizing' ? balloonTarget : 0);
      if (style === 'amortizing') {
        balloon = balloonTarget;
        financeCharge = totalRepayments - balance;
      }
    }
    const netAdvance = Math.max(0, principal - upfrontFees - (style === 'retained' ? financeCharge : 0));
    const cashflows = Array(periods).fill(0);
    if (style === 'amortizing' || style === 'serviced') cashflows.fill(payment);
    if (style === 'serviced') cashflows[periods - 1] += balloon;
    else if (style === 'retained' || style === 'compound' || (mode === 'factor' || mode === 'term_yield' || mode === 'flat_annual' || mode === 'flat_monthly') && style !== 'amortizing') cashflows[periods - 1] = balloon;
    if (style === 'amortizing' && suppliedPayment > 0) cashflows.fill(suppliedPayment);
    if (style === 'amortizing' && balloon > 0) cashflows[periods - 1] += balloon;
    const annualized = irrAnnualized(netAdvance, cashflows, frequency);
    const totalRepayable = totalRepayments + upfrontFees;
    const totalCost = totalRepayable - principal;
    return { principal, financedAmount: balance, interestPrincipal, interestBasis, periods, mode, style, payment, balloon, totalRepayments, totalRepayable, totalAmountPayable: totalRepayable, financeCharge, fees: fee, financedFees, upfrontFees, netAdvance, totalCost, annualizedAnnual: annualized };
  }
  const api = { MODES, STYLES, periodRate, annuity, calculate, interestOnlyMonthlyDisplay };
  root.CRMRateMath = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

