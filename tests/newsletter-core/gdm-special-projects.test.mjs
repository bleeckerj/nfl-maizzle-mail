import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import matter from 'gray-matter';
import Ajv from 'ajv';
import {prepareNewsletterData} from '../../lib/newsletter-core/prepare-newsletter.mjs';
import {pruneBuildInjectedFields} from '../../lib/newsletter-core/normalize.mjs';
const source=matter(fs.readFileSync(new URL('../../../nfl-editorial/emails/jobs/gdm-expeditionary-engineering/gdm-expeditionary-engineering.email.md',import.meta.url),'utf8')).data;
const schema=JSON.parse(fs.readFileSync(new URL('../../templates/gdm-special-projects/newsletter.schema.json',import.meta.url),'utf8'));
const validate=new Ajv({strict:false}).compile(schema);
test('GDM source requires a complete hosted company logo',()=>{
 assert.equal(validate(source),true,JSON.stringify(validate.errors));
 for(const key of ['src','alt','width','height']) {const d=structuredClone(source);delete d.companyLogo[key];assert.equal(validate(d),false);}
 const absent=structuredClone(source);delete absent.companyLogo;assert.equal(validate(absent),false);
 const local=structuredClone(source);local.companyLogo.src='/logo.png';assert.equal(validate(local),false);
});
test('GDM uses shared share preparation and removes the generated link on export',()=>{
 const data=prepareNewsletterData(source,{repoRoot:process.cwd(),templateName:source.template,strictSchema:true,logger:{log(){}}});
 const query=new URL(data.share.emailHref).searchParams;
 assert.equal(query.get('body'),source.share.message+'\n\n'+source.job.link.href);
 pruneBuildInjectedFields(data);assert.equal(data.share.emailHref,undefined);
 assert.equal(source.share.emailHref,undefined);
});

test('GDM atmosphere banner needs only a hosted source and alt text',()=>{
 const d=structuredClone(source);
 d.job.image={src:source.companyLogo.src,alt:'Special Projects building'};
 assert.equal(validate(d),true,JSON.stringify(validate.errors));
 for(const key of ['src','alt']) {
  const missing=structuredClone(d);delete missing.job.image[key];
  assert.equal(validate(missing),false);
 }
 d.job.image.width=1600;d.job.image.height=900;d.job.image.caption='Optional caption';
 assert.equal(validate(d),true,JSON.stringify(validate.errors));
});
