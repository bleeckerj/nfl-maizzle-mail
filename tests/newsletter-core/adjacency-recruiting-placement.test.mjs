// Render sponsor placements from the saved FDAA company draft into temporary files.
// Check ordering and ad-free output without modifying or sending the source email.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { render as renderMail } from '@maizzle/framework';
import { prepareNewsletterData } from '../../lib/newsletter-core/prepare-newsletter.mjs';
import { loadRecruitingFixture } from './helpers/load-recruiting-fixture.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sample=loadRecruitingFixture(root);
async function render(source){
 // Rendering without file config prevents unrelated data/newsletter.json from
 // being merged into this fixture's sections by the full build command.
 const locals=prepareNewsletterData(source,{repoRoot:root,templateName:source.template,strictSchema:true,logger:{log(){}}});
 const {html}=await renderMail(fs.readFileSync(path.join(root,'templates/adjacency-recruiting/newsletter.html'),'utf8'),{maizzle:{inlineCSS:false,locals},tailwind:{compiled:''}});
 return new JSDOM(html).window.document;
}
test('every sponsor position renders once at its requested email boundary',async()=>{
 const data=structuredClone(sample);const ad=data.sections.find(s=>s.type==='ad-block');
 ad.label='Custom sponsor heading';
 const lists=data.sections.filter(s=>s.type==='recruiting-list');
 const positions=['top','after-introduction','after-role','after-assignment','after-lists','after-compensation','after-recruiting','after-explainer','after-share'];
 data.sections=[lists[0],{...structuredClone(ad),placement:'inline'},lists[1],...positions.map(placement=>({...structuredClone(ad),placement}))];
 const doc=await render(data);
 const order=[...doc.querySelectorAll('h1,h2,[data-sponsor-placement]')].map(e=>e.getAttribute('data-sponsor-placement')||e.textContent.trim());
 assert.deepEqual(order,['top','after-introduction',data.job.title,'after-role','The assignment','after-assignment',lists[0].title,'inline',lists[1].title,'after-lists','Salary & benefits','after-compensation','Interested in the role?','after-recruiting',data.operatorContext.heading,'after-explainer',data.share.heading,'after-share']);
 assert.equal(doc.querySelectorAll('[data-sponsor-placement]').length,10);
 for(const sponsor of doc.querySelectorAll('[data-sponsor-placement]')){
  assert.ok(sponsor.textContent.includes('Custom sponsor heading'));assert.equal(sponsor.querySelectorAll('img').length,1);
 }
});
test('an ad-free email renders no sponsor wrapper or sponsor heading',async()=>{
 const data=structuredClone(sample);data.sections=data.sections.filter(s=>s.type!=='ad-block');
 const doc=await render(data);
 assert.equal(doc.querySelectorAll('[data-sponsor-placement]').length,0);
 assert.ok(!doc.body.textContent.includes('SPONSOR'));
});

// Missing, empty, and legacy labels must never manufacture a sponsor heading.
test('ad headings appear only for explicit non-empty label', async()=>{
 const data=structuredClone(sample);
 const ad=data.sections.find(section=>section.type==='ad-block');
 data.sections=[undefined,'','   ','Partner message'].map(label=>({...structuredClone(ad),label,sponsorLabel:'SPONSOR',placement:'inline'}));
 const doc=await render(data);
 const wrappers=[...doc.querySelectorAll('[data-sponsor-placement]')];
 assert.equal(wrappers.length,4);
 for(const wrapper of wrappers) assert.ok(!wrapper.textContent.includes('SPONSOR'));
 assert.ok(wrappers[3].textContent.includes('Partner message'));
 for(const wrapper of wrappers.slice(0,3)) assert.ok(!wrapper.textContent.includes('Partner message'));
});
