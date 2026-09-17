// Exercise the actual nested email components and render hook, including the
// two jobs templates. Temporary outputs are removed; authored sources stay intact.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import matter from 'gray-matter';
import {build} from '@maizzle/framework';
import {JSDOM} from 'jsdom';
import {prepareNewsletterData} from '../../lib/newsletter-core/prepare-newsletter.mjs';
import {resolveCommerceAdBlockSnapshots} from '../../lib/newsletter-core/resolve-commerce-ad-block-snapshots.mjs';
import {renderCommerceBands} from '../../lib/newsletter-core/render-commerce-bands.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sourcePaths={
 'dense-discovery':'templates/dense-discovery/campaign-starter.md',
 'adjacency-recruiting':'../nfl-editorial/emails/jobs/platform-counter-inference-analyst/platform-counter-inference-analyst.email.md',
 'gdm-special-projects':'../nfl-editorial/emails/jobs/gdm-expeditionary-engineering/gdm-expeditionary-engineering.email.md',
};
for(const [templateName,sourcePath] of Object.entries(sourcePaths)){
 test(`${templateName} renders Casio as a live Compact Band through nested components`,async()=>{
  const source=matter(fs.readFileSync(path.resolve(root,sourcePath),'utf8')).data;
  source.sections=source.sections.filter(section=>section.type!=='ad-block');
  source.sections.push({type:'ad-block',items:[{adId:'casio-farm-os-commerce-01'}]});
  const before=structuredClone(source);
  const locals=prepareNewsletterData(source,{repoRoot:root,templateName,strictSchema:true,logger:{log(){}}});
  const item=locals.sections.find(section=>section.type==='ad-block').items[0];
  assert.equal(item.renderMode,'commerce-compact-band');
  assert.equal(item.commerce.icon.altText,'Teenage Engineering');
  // Even a historical snapshot request must leave the source image untouched.
  item.adRenderMode='snapshot';const sourceImage=item.image;
  await resolveCommerceAdBlockSnapshots(locals,{repoRoot:root,logger:{log(){}}});
  assert.equal(item.image,sourceImage);
  assert.equal(item.renderMode,'commerce-compact-band');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'commerce-band-email-'));
  try{
   await build('production',{build:{templates:{source:path.join(root,'templates',templateName),destination:{path:folder}},components:{source:path.join(root,'templates',templateName,'components')}},inlineCSS:true,locals,events:{afterRender:(html,config)=>renderCommerceBands(html,config.locals)}});
   const html=fs.readFileSync(path.join(folder,'newsletter.html'),'utf8');
   const doc=new JSDOM(html).window.document;
   const panel=doc.querySelector('table[bgcolor="#f3f3f3"]');assert.ok(panel,'expected one rendered gray panel');
   assert.equal(doc.querySelectorAll('table[bgcolor="#f3f3f3"]').length,1);
   assert.ok(panel.textContent.includes('$399.99'));assert.ok(panel.textContent.includes('/season'));
   assert.ok(!panel.textContent.includes('/ 5'),'absent ratings must not invent a rating strip');
   assert.equal(panel.querySelector('img').getAttribute('width'),'64');
   const photo=[...doc.images].find(image=>image.src===sourceImage);assert.ok(photo);assert.equal(photo.style.height,'auto');
   assert.ok(photo.compareDocumentPosition(panel)&4,'image must precede the panel');
   assert.ok(!doc.querySelector('[data-commerce-band-id]'),'all internal placeholders must be expanded');
   assert.ok(!doc.body.textContent.includes('<table'),'panel markup must never be escaped');
   assert.deepEqual(source,before);
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
 });
}
test('the render hook rejects unresolved panels instead of shipping an empty ad',()=>{
 assert.throws(()=>renderCommerceBands('<div data-commerce-band-id="missing"></div>',{sections:[]}),/no hydrated inventory data/);
});
