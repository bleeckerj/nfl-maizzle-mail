import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import Ajv from 'ajv';
import posthtml from 'posthtml';
import expressions from 'posthtml-expressions';
import { JSDOM } from 'jsdom';
import { prepareNewsletterData } from '../../lib/newsletter-core/prepare-newsletter.mjs';
import { pruneBuildInjectedFields } from '../../lib/newsletter-core/normalize.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sample=matter(fs.readFileSync(path.join(root,'templates/adjacency-recruiting/sample-content.md'),'utf8')).data;
const schema=JSON.parse(fs.readFileSync(path.join(root,'templates/adjacency-recruiting/newsletter.schema.json'),'utf8'));
const validate=new Ajv({strict:false}).compile(schema);
const prepare=data=>prepareNewsletterData(data,{repoRoot:root,templateName:data.template,strictSchema:true,logger:{log(){}}});
const render=(name,data)=>posthtml([expressions({locals:data,strictMode:false})]).process(fs.readFileSync(path.join(root,'templates/adjacency-recruiting/components',name+'.html'),'utf8'),{sync:true}).html;

test('FDAA keeps its explainer and hydrates an ad from its ID without mutating source',()=>{
 const before=structuredClone(sample);const data=prepare(sample);
 assert.equal(data.footer.footerCta.enabled,false);
 assert.deepEqual(data.operatorContext,sample.operatorContext);
 const ad=data.sections.find(s=>s.type==='ad-block').items[0];
 assert.ok(ad.image.startsWith('https://imagedelivery.net/'));
 assert.equal(ad.sponsor,'FLUKE AGENTIC TOOLING');
 assert.deepEqual(sample,before);
});
test('explainer is required and unknown source-provenance fields are rejected',()=>{
 for(const value of [undefined,null]){const data=structuredClone(sample);data.operatorContext=value;assert.equal(validate(data),false);}
 const data=structuredClone(sample);data.popupExplainerText='Unrequested imported field';assert.equal(validate(data),false);
});
test('ad blocks can be omitted and unknown ad IDs fail',()=>{
 const data=structuredClone(sample);data.sections=data.sections.filter(s=>s.type!=='ad-block');delete data.job.image;delete data.footer.unsubscribeLink;
 assert.equal(validate(data),true,JSON.stringify(validate.errors));
 assert.equal(render('Ads',prepare(data)).trim(),'');
 data.sections.push({type:'ad-block',items:[{adId:'missing-recruiting-fixture'}]});
 assert.throws(()=>prepare(data),/unknown adId/);
});
test('share mailto round-trips punctuation and includes only the public requisition URL',()=>{
 const source=structuredClone(sample);source.share.subject='Research & safety? #1';source.share.message='Thought you’d like this: 50% + more';
 const data=prepare(source);const query=new URL(data.share.emailHref).searchParams;
 assert.equal(query.get('subject'),source.share.subject);
 assert.equal(query.get('body'),source.share.message+'\n\n'+source.job.link.href);
 assert.ok(!data.share.emailHref.includes('unsubscribe'));
 pruneBuildInjectedFields(data);assert.equal(data.share.emailHref,undefined);
 const off=structuredClone(sample);off.share.enabled=false;off.share.emailHref='mailto:stale@example.com';
 const disabled=prepare(off);assert.equal(disabled.share.emailHref,undefined);assert.equal(render('Share',disabled).trim(),'');
});
test('rendered ad remains complete and explainer/share have separate components',()=>{
 const data=prepare(sample);const adDoc=new JSDOM(render('Sponsor',{...data,section:data.sections.find(s=>s.type==='ad-block')})).window.document;
 const img=adDoc.querySelector('img');assert.ok(img);assert.equal(img.style.height,'auto');assert.equal(img.style.width,'100%');
 assert.equal(adDoc.querySelectorAll('a').length,0);
 const explainer=new JSDOM(render('Explainer',data)).window.document;
 assert.equal(explainer.querySelector('h2').textContent,sample.operatorContext.heading);
 assert.ok(explainer.body.textContent.includes(sample.operatorContext.paragraphs[0]));
 const share=new JSDOM(render('Share',data)).window.document;
 assert.equal(new URL(share.querySelector('a').href).searchParams.get('body'),sample.share.message+'\n\n'+sample.job.link.href);
});
test('rejects external job destinations and incomplete tracking objects',()=>{
 const data=structuredClone(sample);data.job.link.href='https://example.com/apply';assert.equal(validate(data),false);
 data.job.link.href=sample.job.link.href;delete data.job.link.label;assert.equal(validate(data),false);
});

test('sponsor placements are explicit and unsupported values fail validation',()=>{
 const data=structuredClone(sample);const ad=data.sections.find(s=>s.type==='ad-block');
 for(const placement of ['top','after-introduction','after-role','after-assignment','inline','after-lists','after-compensation','after-recruiting','after-explainer','after-share']){
  ad.placement=placement;assert.equal(validate(data),true,JSON.stringify(validate.errors));
 }
 ad.placement='inside-image';assert.equal(validate(data),false);
 delete ad.placement;assert.equal(validate(data),true);
});
