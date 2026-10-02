(()=>{
const $=id=>document.getElementById(id), money=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number.isFinite(n)?n:0), num=id=>Number($(id)?.value)||0;
document.querySelectorAll('.calc-tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.calc-tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.calc-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('calc-'+b.dataset.target).classList.add('active')}));
let rows=[];
function loan(){
 const P=Math.max(0,num('loanAmount')), annual=Math.max(0,num('loanRate'))/100, months=Math.max(1,Math.round(num('loanTerm'))), freq=Number($('loanFrequency').value), periods=freq===4?Math.ceil(months/3):months, r=annual/freq;
 const pay=r===0?P/periods:P*r/(1-Math.pow(1+r,-periods)); let bal=P,totalInt=0; rows=[];
 for(let i=1;i<=periods;i++){const open=bal,int=open*r,capital=Math.min(pay-int,open),actual=capital+int;bal=Math.max(0,open-capital);totalInt+=int;rows.push([i,open,actual,int,capital,bal]);}
 $('loanPayment').textContent=money(pay);$('loanInterest').textContent=money(totalInt);$('loanTotal').textContent=money(P+totalInt);
 $('scheduleBody').innerHTML=rows.map(r=>'<tr>'+r.map((v,i)=>'<td>'+(i?money(v):v)+'</td>').join('')+'</tr>').join('');
}
function io(){const p=Math.max(0,num('ioAmount')),rate=Math.max(0,num('ioRate'))/100,m=Math.max(1,num('ioTerm')),mi=p*rate/12,interest=mi*m;$('ioMonthly').textContent=money(mi);$('ioInterest').textContent=money(interest);$('ioCapital').textContent=money(p);$('ioTotal').textContent=money(p+interest)}
function dscr(){const cash=num('dscrEbitda')+num('dscrAdjust'),debt=Math.max(0,num('dscrExisting'))+Math.max(0,num('dscrProposed'));$('dscrCash').textContent=money(cash);$('dscrDebt').textContent=money(debt);$('dscrRatio').textContent=debt>0?(cash/debt).toFixed(2)+'x':'—'}
function asset(){const cost=Math.max(0,num('assetCost')),dep=Math.min(cost,Math.max(0,num('assetDeposit'))),P=cost-dep,balloon=Math.min(P,Math.max(0,num('assetBalloon'))),n=Math.max(1,Math.round(num('assetTerm'))),r=Math.max(0,num('assetRate'))/100/12;let pay;if(r===0)pay=(P-balloon)/n;else pay=(P-balloon/Math.pow(1+r,n))*r/(1-Math.pow(1+r,-n));const totalPayments=pay*n+balloon,interest=totalPayments-P;$('assetFinanced').textContent=money(P);$('assetPayment').textContent=money(pay);$('assetInterest').textContent=money(interest);$('assetTotal').textContent=money(dep+totalPayments)}
[['loanAmount',loan],['loanRate',loan],['loanTerm',loan],['loanFrequency',loan],['ioAmount',io],['ioRate',io],['ioTerm',io],['ioType',io],['dscrEbitda',dscr],['dscrAdjust',dscr],['dscrExisting',dscr],['dscrProposed',dscr],['assetCost',asset],['assetDeposit',asset],['assetRate',asset],['assetTerm',asset],['assetBalloon',asset]].forEach(([id,fn])=>$(id)?.addEventListener('input',fn));
$('exportSchedule')?.addEventListener('click',()=>{const head=['Period','Opening Balance','Repayment','Interest','Capital','Closing Balance'];const csv=[head,...rows.map(r=>r.map((v,i)=>i?v.toFixed(2):v))].map(r=>r.join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ABF-amortisation-schedule.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
loan();io();dscr();asset();
})();