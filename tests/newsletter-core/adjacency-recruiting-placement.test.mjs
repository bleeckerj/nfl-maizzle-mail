import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { JSDOM } from 'jsdom';
import { build } from '@maizzle/framework';
import { prepareNewsletterData } from '../../lib/newsletter-core/prepare-newsletter.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sample=matter(fs.readFileSync(path.resolve(root,'../nfl-editorial/emails/jobs/fdaa-platform-counter-inference-analyst/email.md'),'utf8')).data;
async function render(source){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'recruiting-placements-'));
 try {
  const locals=prepareNewsletterData(source,{repoRoot:root,templateName:source.template,strictSchema:true,logger:{log(){}}});
  await build('production',{build:{templates:{source:path.join(root,'templates/adjacency-recruiting'),destination:{path:temp}},components:{source:path.join(root,'templates/adjacency-recruiting/components')}},inlineCSS:false,locals});
  return new JSDOM(fs.readFileSync(path.join(temp,'newsletter.html'),'utf8')).window.document;
 } finally {fs.rmSync(temp,{recursive:true,force:true});}
}
test('every sponsor position renders once at its requested email boundary',async()=>{
 const data=structuredClone(sample);const ad=data.sections.find(s=>s.type==='ad-block');
 const lists=data.sections.filter(s=>s.type==='recruiting-list');
 const positions=['top','after-introduction','after-role','after-assignment','after-lists','after-compensation','after-recruiting','after-explainer','after-share'];
 data.sections=[lists[0],{...structuredClone(ad),placement:'inline'},lists[1],...positions.map(placement=>({...structuredClone(ad),placement}))];
 const doc=await render(data);
 const order=[...doc.querySelectorAll('h1,h2,[data-sponsor-placement]')].map(e=>e.getAttribute('data-sponsor-placement')||e.textContent.trim());
 assert.deepEqual(order,['top','after-introduction',data.job.title,'after-role','The assignment','after-assignment',lists[0].title,'inline',lists[1].title,'after-lists','Salary & benefits','after-compensation','Interested in the role?','after-recruiting',data.operatorContext.heading,'after-explainer',data.share.heading,'after-share']);
 assert.equal(doc.querySelectorAll('[data-sponsor-placement]').length,10);
 for(const sponsor of doc.querySelectorAll('[data-sponsor-placement]')){
  assert.ok(sponsor.textContent.includes('SPONSOR'));assert.equal(sponsor.querySelectorAll('img').length,1);
 }
});
test('an ad-free email renders no sponsor wrapper or sponsor heading',async()=>{
 const data=structuredClone(sample);data.sections=data.sections.filter(s=>s.type!=='ad-block');
 const doc=await render(data);
 assert.equal(doc.querySelectorAll('[data-sponsor-placement]').length,0);
 assert.ok(!doc.body.textContent.includes('SPONSOR'));
});
