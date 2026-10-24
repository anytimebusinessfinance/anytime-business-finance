const assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto'),{JSDOM}=require('jsdom');
const printCode='window.onload=()=>setTimeout(()=>window.print(),250)';
const printHash="'sha256-"+createHash('sha256').update(printCode).digest('base64')+"'";
for(const file of fs.readdirSync('.').filter(x=>x.endsWith('.html'))){
 const html=fs.readFileSync(file,'utf8'),doc=new JSDOM(html).window.document;
 const policies=doc.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');assert.equal(policies.length,1,file);
 const policy=policies[0].content,directives=Object.fromEntries(policy.split(';').map(x=>x.trim().split(/\s+/)).map(([k,...v])=>[k,v]));
 assert.deepEqual(directives['script-src'],["'self'",'https://www.googletagmanager.com',printHash]);
 assert.deepEqual(directives['script-src-attr'],["'none'"]);assert.deepEqual(directives['object-src'],["'none'"]);
 assert.deepEqual(directives['base-uri'],["'self'"]);assert.deepEqual(directives['form-action'],["'self'"]);
 assert.ok(html.indexOf('Content-Security-Policy')<html.indexOf('<script'),file);
 for(const el of doc.querySelectorAll('*'))for(const a of el.attributes)assert.ok(!/^on/i.test(a.name),file+' inline event '+a.name);
 for(const script of doc.scripts)assert.ok(script.src||script.type==='application/ld+json',file+' unexpected inline executable script');
 assert.equal(doc.querySelector('meta[name="referrer"]').content,'strict-origin-when-cross-origin');
}
assert.ok(fs.readFileSync('calculators.js','utf8').includes(printCode));
console.log('All HTML pages enforce the reviewed script policy; illustration print hash matches.');
