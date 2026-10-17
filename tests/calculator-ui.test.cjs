const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require(process.env.ABF_TEST_JSDOM||'jsdom');
const root=path.resolve(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'calculators.html'),'utf8'),{url:'https://example.com/calculators.html',runScripts:'outside-only'});
const w=dom.window;w.HTMLElement.prototype.scrollIntoView=function(){};
w.eval(fs.readFileSync(path.join(root,'rate-math.js'),'utf8'));
w.eval(fs.readFileSync(path.join(root,'calculators.js'),'utf8'));
const math=w.CRMRateMath;
assert.equal(math.MODES.length,9, 'preserve legacy calculations without exposing every mode');
const expectedModes={loan:['annual_reducing','monthly_reducing','flat_annual','factor'],io:['annual_reducing','monthly_reducing','daily_simple'],property:['annual_reducing','monthly_reducing'],asset:['flat_annual','annual_reducing']};
for(const [prefix,modes] of Object.entries(expectedModes)){
 const select=w.document.getElementById(prefix+'Mode'),rate=w.document.getElementById(prefix+'Rate');
 assert.deepEqual([...select.options].map(x=>x.value),modes);
 assert.equal(select.value,modes[0]);
 const staticDom=new JSDOM(fs.readFileSync(path.join(root,'calculators.html'),'utf8'));
 assert.deepEqual([...staticDom.window.document.getElementById(prefix+'Mode').options].map(x=>x.value),modes,'HTML and interactive menu agree');
 staticDom.window.close();
 for(const mode of modes){
  select.value=mode;select.dispatchEvent(new w.Event('input',{bubbles:true}));
  rate.value=mode==='factor'?'1.2':mode==='daily_simple'?'0.03':'1';
  rate.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(w.document.getElementById(prefix+'RateLabel').textContent,select.selectedOptions[0].textContent);
  assert.doesNotMatch(w.document.querySelector(prefix==='io'?'#calc-interest':'#calc-'+prefix).textContent,/NaN|Infinity|undefined/);
 }
}
const loanMode=w.document.getElementById('loanMode'),loanRate=w.document.getElementById('loanRate');
loanMode.value='annual_reducing';loanMode.dispatchEvent(new w.Event('input'));loanRate.value='9.5';
loanMode.value='factor';loanMode.dispatchEvent(new w.Event('input'));assert.equal(loanRate.value,'1.2');assert.equal(loanRate.min,'1');
loanMode.value='annual_reducing';loanMode.dispatchEvent(new w.Event('input'));assert.equal(loanRate.value,'9.5','preserve entered rates when switching back');
for(const id of ['loan','interest','property','asset']){
 w.location.hash='calc-'+id;w.dispatchEvent(new w.HashChangeEvent('hashchange'));
 assert.equal(w.document.querySelector('.calc-panel.active').id,'calc-'+id);
}
assert.equal(w.document.querySelectorAll('.calc-tab').length,4);
assert.equal(w.document.getElementById('calc-dscr'),null);
assert.equal(w.document.getElementById('ioType'),null,'revolving credit must stay interest-only');
function fill(values){for(const [id,value] of Object.entries(values)){const e=w.document.getElementById(id);e.value=String(value);e.dispatchEvent(new w.Event('input'));}}
fill({ioMode:'annual_reducing',ioAmount:50000,ioRate:12,ioTerm:12,ioFee:0});
assert.equal(w.document.getElementById('ioMonthly').textContent,'£500.00');
assert.equal(w.document.getElementById('ioInterest').textContent,'£6,000.00');
assert.match(w.document.getElementById('ioNote').textContent,/remaining: £50,000.00/);
fill({ioMode:'daily_simple',ioAmount:50000,ioRate:0.1,ioTerm:12,ioFee:0});
assert.equal(w.document.getElementById('ioMonthly').textContent,'£1,520.83');
assert.equal(w.document.getElementById('ioInterest').textContent,'£18,250.00','simple daily rate does not compound');
assert.equal(w.document.getElementById('ioMonthlyLabel').textContent,'Average monthly interest');
fill({ioMode:'monthly_reducing',ioRate:1});
assert.equal(w.document.getElementById('ioMonthly').textContent,'£500.00');
assert.equal(w.document.getElementById('ioInterest').textContent,'£6,000.00');
fill({propertyMode:'annual_reducing',propertyAmount:100000,propertyRate:12,propertyTerm:12,propertyFee:0,propertyType:'amortizing'});
assert.equal(w.document.getElementById('propertyMonthly').textContent,'£8,884.88');
assert.match(w.document.getElementById('propertyNote').textContent,/Balance after final repayment: £0.00/);
assert.deepEqual([...w.document.getElementById('propertyType').options].map(x=>x.value),['amortizing','serviced']);
assert.equal(w.document.getElementById('propertyMode').closest('label').hidden,true,'property rate basis follows product automatically');
fill({propertyType:'serviced'});
assert.equal(w.document.getElementById('propertyMonthly').textContent,'£1,000.00');
fill({propertyProduct:'bridging'});
assert.equal(w.document.getElementById('propertyMode').value,'monthly_reducing');
assert.equal(w.document.getElementById('propertyRate').value,'0.75');
assert.deepEqual([...w.document.getElementById('propertyType').options].map(x=>x.value),['serviced','retained','compound']);
fill({propertyRate:1,propertyType:'retained'});
assert.equal(w.document.getElementById('propertyNet').textContent,'£88,000.00');
assert.equal(w.document.getElementById('propertyTotal').textContent,'£112,000.00');
assert.match(w.document.getElementById('propertyNote').textContent,/maturity: £100,000.00/);
fill({propertyType:'compound'});
assert.match(w.document.getElementById('propertyNote').textContent,/maturity: £112,682.50/);
fill({propertyProduct:'mortgage'});
assert.equal(w.document.getElementById('propertyRate').value,'12');
assert.equal(w.document.getElementById('propertyTerm').value,'12');
assert.equal(w.document.getElementById('propertyType').value,'serviced');
fill({propertyProduct:'bridging'});
assert.equal(w.document.getElementById('propertyRate').value,'1');
assert.equal(w.document.getElementById('propertyType').value,'compound');
dom.window.close();console.log('Product-specific menus, daily interest, factor rates and mortgage/bridging UI tests passed');
