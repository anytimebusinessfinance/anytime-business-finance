const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{build}=require('../scripts/build-static.cjs');
const root=path.resolve(__dirname,'..'),parent=fs.mkdtempSync(path.join(os.tmpdir(),'abf-site-'));
try{
 const a=build(root,path.join(parent,'site'));assert.ok(a.files.length>30);for(const name of ['index.html','assets/london-hero.png','calculators.js','_headers'])assert.ok(fs.existsSync(path.join(a.output,name)));
 for(const name of ['submit.php','tests','node_modules','package.json','package-lock.json','README.md','scripts','.git'])assert.equal(fs.existsSync(path.join(a.output,name)),false,name+' must not be published');
 const h=fs.readFileSync(path.join(a.output,'_headers'),'utf8');assert.match(h,/X-Frame-Options: DENY/);assert.match(h,/frame-ancestors 'none'/);assert.match(h,/nosniff/);
 const html=fs.readFileSync(path.join(a.output,'discuss-funding.html'),'utf8');assert.match(html,/form[^>]+hidden[^>]*data-enquiry-form/);assert.doesNotMatch(html,/action="submit\.php"/);assert.match(html,/mailto:sam@anytimebusinessfinance.co.uk/);
 for(const name of a.files.filter(x=>x.endsWith('.html'))){const s=fs.readFileSync(path.join(a.output,name),'utf8');assert.doesNotMatch(s,/Anytime Business Finance Ltd/);assert.match(s,/Sam Percival trading as Anytime Business Finance/);}
 const b=build(root,path.join(parent,'domain'),'https://www.example.invalid/');assert.match(fs.readFileSync(path.join(b.output,'index.html'),'utf8'),/rel="canonical" href="https:\/\/www\.example\.invalid\//);assert.doesNotMatch(fs.readFileSync(path.join(b.output,'sitemap.xml'),'utf8'),/github\.io/);
 assert.throws(()=>build(root,root),/dedicated/);assert.throws(()=>build(root,path.join(parent,'bad'),'http://example.invalid/'),/HTTPS/);assert.throws(()=>build(root,path.join(parent,'bad'),'https://user:password@example.invalid/'),/HTTPS/);
 console.log('PASS clean static build, public allowlist, consistent identity, security headers, truthful form fallback and canonical URL substitution');
}finally{fs.rmSync(parent,{recursive:true,force:true});}
