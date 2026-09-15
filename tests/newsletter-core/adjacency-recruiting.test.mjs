import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import Ajv from 'ajv';
import { prepareNewsletterData } from '../../lib/newsletter-core/prepare-newsletter.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sample=matter(fs.readFileSync(path.join(root,'templates/adjacency-recruiting/sample-content.md'),'utf8')).data;
const schema=JSON.parse(fs.readFileSync(path.join(root,'templates/adjacency-recruiting/newsletter.schema.json'),'utf8'));
const validate=new Ajv({strict:false}).compile(schema);

test('FDAA sample survives canonical preparation without an injected public footer',()=>{
 const data=prepareNewsletterData(sample,{repoRoot:root,templateName:sample.template,strictSchema:true,logger:{log(){}}});
 assert.equal(data.footer.footerCta.enabled,false);
 assert.equal(data.operatorContext,undefined);
 assert.equal(data.job.image.width/data.job.image.height,1.5);
});
test('a future role can omit the image and unsubscribe affordance',()=>{
 const data=structuredClone(sample);delete data.job.image;delete data.footer.unsubscribeLink;
 data.job.title='Research Coordinator';data.recruiter.name='Appointments Office';data.greeting='Hello Morgan,';
 assert.equal(validate(data),true,JSON.stringify(validate.errors));
});
test('operator context is explicit, and unknown source-provenance fields are rejected',()=>{
 const data=structuredClone(sample);data.operatorContext={heading:'From the editor',paragraphs:['Operator-authored context.']};
 assert.equal(validate(data),true,JSON.stringify(validate.errors));
 data.popupExplainerText='Unrequested imported explainer';assert.equal(validate(data),false);
});
test('rejects external application destinations and incomplete tracking objects',()=>{
 const data=structuredClone(sample);data.job.link.href='https://example.com/apply';assert.equal(validate(data),false);
 data.job.link.href=sample.job.link.href;delete data.job.link.label;assert.equal(validate(data),false);
});
