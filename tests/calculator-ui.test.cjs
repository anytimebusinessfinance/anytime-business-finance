const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require(process.env.ABF_TEST_JSDOM||'jsdom');
const root=path.resolve(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'calculators.html'),'utf8'),{url:'https://example.com/calculators.html',runScripts:'outside-only'});
const w=dom.window;w.HTMLElement.prototype.scrollIntoView=function(){};
w.eval(fs.readFileSync(path.join(root,'rate-math.js'),'utf8'));
w.eval(fs.readFileSync(path.join(root,'calculators.js'),'utf8'));
const math=w.CRMRateMath;
assert.equal(math.MODES.length,9);
for(const prefix of ['loan','io','property','asset']){
 const select=w.document.getElementById(prefix+'Mode'),rate=w.document.getElementById(prefix+'Rate');
 assert.deepEqual([...select.options].map(x=>x.value),[...math.MODES].map(x=>x[0]));
 assert.equal(select.value,'apr_effective');
 for(const [mode,label] of math.MODES){
  select.value=mode;select.dispatchEvent(new w.Event('input',{bubbles:true}));
  rate.value=mode==='factor'?'1.2':mode==='daily_reducing'?'0.03':'12';
  rate.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(w.document.getElementById(prefix+'RateLabel').textContent,label);
  assert.doesNotMatch(w.document.querySelector(prefix==='io'?'#calc-interest':prefix==='loan'?'#calc-loan':prefix==='property'?'#calc-property':'#calc-asset').textContent,/NaN|Infinity|undefined/);
 }
 select.value='apr_effective';select.dispatchEvent(new w.Event('input',{bubbles:true}));rate.value='9.5';
 select.value='factor';select.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(rate.value,'1.2');assert.equal(rate.min,'1');
 select.value='apr_effective';select.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(rate.value,'9.5','preserve entered percentage when switching back');
}
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
fill({propertyMode:'annual_reducing',propertyAmount:100000,propertyRate:12,propertyTerm:12,propertyFee:0,propertyType:'amortizing'});
assert.equal(w.document.getElementById('propertyMonthly').textContent,'£8,884.88');
assert.match(w.document.getElementById('propertyNote').textContent,/Balance after final repayment: £0.00/);
fill({propertyType:'serviced'});
assert.equal(w.document.getElementById('propertyMonthly').textContent,'£1,000.00');
fill({propertyType:'compound'});
assert.match(w.document.getElementById('propertyNote').textContent,/maturity: £112,682.50/);
// Retained property interest is withheld from the advance; not added again at maturity.
const m=w.document.getElementById('propertyMode');m.value='annual_reducing';m.dispatchEvent(new w.Event('input'));
for(const [id,value] of Object.entries({propertyAmount:100000,propertyRate:12,propertyTerm:12,propertyFee:0,propertyType:'retained'})){
 const e=w.document.getElementById(id);e.value=String(value);e.dispatchEvent(new w.Event('input'));
}
assert.equal(w.document.getElementById('propertyNet').textContent,'£88,000.00');
assert.match(w.document.getElementById('propertyNote').textContent,/maturity: £100,000.00/);
dom.window.close();console.log('All nine rate options across four calculators and retained-interest UI tests passed');
