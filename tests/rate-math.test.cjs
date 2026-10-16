const assert = require('node:assert/strict');
const RM = require('../rate-math.js');
const near = (a, b, tolerance = 0.02) => assert.ok(Math.abs(a - b) <= tolerance, `${a} not within ${tolerance} of ${b}`);
let x = RM.calculate({ amount: 100000, rate: 1.2, mode: 'factor', termMonths: 12 });
near(x.totalRepayments, 120000); near(x.payment, 10000); near(x.totalCost, 20000);
const quarterly = RM.calculate({ amount: 100000, rate: 1.2, mode: 'factor', termMonths: 12, frequency: 4 });
near(quarterly.payment, 30000);
let lo = 0, hi = 10;
for (let i = 0; i < 100; i++) {
  const mid = (lo + hi) / 2;
  const pv = Array.from({length: 4}, (_, n) => 30000 / Math.pow(1 + mid, n + 1)).reduce((a, b) => a + b, 0);
  if (pv > 100000) lo = mid; else hi = mid;
}
near(quarterly.annualizedAnnual, Math.pow(1 + (lo + hi) / 2, 4) - 1, 1e-9);
x = RM.calculate({ amount: 100000, rate: 20, mode: 'term_yield', termMonths: 24 });
near(x.totalRepayments, 120000); near(x.financeCharge, 20000);
x = RM.calculate({ amount: 100000, rate: 12, mode: 'flat_annual', termMonths: 12 });
near(x.totalRepayments, 112000); near(x.payment, 9333.3333);
x = RM.calculate({ amount: 100000, rate: 2, mode: 'flat_monthly', termMonths: 12 });
near(x.totalRepayments, 124000); near(x.payment, 10333.3333);
x = RM.calculate({ amount: 100000, rate: 12, mode: 'annual_reducing', style: 'serviced', termMonths: 12 });
near(x.payment, 1000); near(x.balloon, 100000); near(x.totalRepayments, 112000);
x = RM.calculate({ amount: 100000, rate: 12, mode: 'annual_reducing', style: 'retained', termMonths: 12 });
near(x.financeCharge, 12000); near(x.balloon, 100000); near(x.netAdvance, 88000);
const retainedDisplay = RM.interestOnlyMonthlyDisplay({ amount: 100000, rate: 12, mode: 'annual_reducing', style: 'retained', termMonths: 12 }, x);
assert.equal(retainedDisplay.label, 'Average monthly retained interest (not a payment)'); near(retainedDisplay.value, 1000);
const factorRollup = RM.calculate({ amount: 100000, rate: 1.2, mode: 'factor', style: 'compound', termMonths: 12 });
const factorDisplay = RM.interestOnlyMonthlyDisplay({ amount: 100000, rate: 1.2, mode: 'factor', style: 'compound', termMonths: 12 }, factorRollup);
assert.equal(factorDisplay.label, 'Average monthly charge (not a payment)'); near(factorDisplay.value, 20000 / 12);
x = RM.calculate({ amount: 100000, rate: 12, mode: 'annual_reducing', style: 'compound', termMonths: 12 });
near(x.balloon, 112682.503); assert.ok(x.annualizedAnnual > 0);
x = RM.calculate({ amount: 100000, rate: 12, mode: 'apr_effective', termMonths: 12 });
near(RM.periodRate(12, 'apr_effective', 12), Math.pow(1.12, 1/12)-1, 1e-10);
near(RM.periodRate(12, 'annual_reducing', 12), 0.01, 1e-10);
x = RM.calculate({ amount: 100000, rate: 12, mode: 'annual_reducing', termMonths: 12, fees: 1000, feeTreatment: 'upfront' });
near(x.netAdvance, 99000); near(x.totalCost, 7618.55, 1.5);
x = RM.calculate({ amount: 100000, rate: 12, mode: 'annual_reducing', termMonths: 12, fees: 1000, feeTreatment: 'financed' });
near(x.financedAmount, 101000); assert.ok(x.totalCost > 2000);
x = RM.calculate({ amount: 100000, rate: 0, mode: 'annual_reducing', termMonths: 12, monthlyPayment: 9000 });
near(x.totalRepayments, 108000); near(x.financeCharge, 8000);
x = RM.calculate({ amount: 100000, rate: 12, mode: 'annual_reducing', termMonths: 12, fees: 1000, feeTreatment: 'upfront', interestBasis: 'gross' });
near(x.totalRepayable, 107618.55, 1.5); near(x.netAdvance, 99000); near(x.totalAmountPayable, x.totalRepayable);
const netBasis = RM.calculate({ amount: 100000, rate: 12, mode: 'annual_reducing', termMonths: 12, fees: 1000, feeTreatment: 'upfront', interestBasis: 'net' });
assert.ok(netBasis.financeCharge < x.financeCharge, 'net basis should calculate interest on the net advance');
near(netBasis.totalRepayable, netBasis.totalRepayments + 1000); near(netBasis.totalCost, netBasis.financeCharge + 1000);
const feeFinanced = RM.calculate({ amount: 100000, rate: 12, mode: 'annual_reducing', termMonths: 12, fees: 1000, feeTreatment: 'financed' });
near(feeFinanced.totalRepayable, feeFinanced.totalRepayments); near(feeFinanced.financedAmount, 101000);
const balloon = RM.calculate({ amount: 100000, rate: 12, mode: 'annual_reducing', termMonths: 12, balloon: 20000 });
near(balloon.balloon, 20000); near(balloon.totalRepayments, balloon.payment * 12 + 20000);
console.log('Rate math tests passed');


// Percentage quotes must match their cash equivalent across every supported rate/style.
for (const [mode] of RM.MODES) for (const [style] of RM.STYLES) {
  for (const feeTreatment of ['upfront','financed']) for (const interestBasis of ['gross','net']) {
    const terms={amount:100000,rate:mode==='factor'?1.2:mode==='daily_reducing'?0.03:['monthly_reducing','flat_monthly'].includes(mode)?0.5:8,mode,style,termMonths:24,feeTreatment,interestBasis};
    const percent=RM.calculate({...terms,fees:2,feeType:'percent'});
    const cash=RM.calculate({...terms,fees:2000,feeType:'fixed'});
    for(const key of ['fees','payment','netAdvance','financedAmount','interestPrincipal','totalRepayable','totalCost']) near(percent[key],cash[key]);
    near(percent.fees,2000);near(percent.financedAmount,feeTreatment==='financed'?102000:100000);
  }
}
near(RM.feeAmount(80000,2,'percent'),1600); // £100k asset less £20k deposit
near(RM.feeAmount(100000,'2%'),2000); // legacy stored quote
near(RM.feeAmount(100000,2),2); // preserve legacy cash default
near(RM.feeAmount(12345,1.25,'percent'),154.31);
near(RM.feeAmount(100000,-2,'percent'),0);
let low=0,high=200000;
for(let i=0;i<70;i++){const mid=(low+high)/2;const quote=RM.calculate({amount:mid,rate:0,termMonths:12,fees:2,feeType:'percent',feeTreatment:'financed'});if(quote.payment<=1000)low=mid;else high=mid;}
near(low,12000/1.02); // fee changes with the affordability candidate

