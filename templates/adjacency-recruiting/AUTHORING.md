# Adjacency recruiting email

A reusable talent-desk email: recruiter introduction, role identity, full-width photograph, appointment facts, assignment, selected duties and qualifications, compensation, and follow-up.

## Authoring

Copy sample-content.md to a new Markdown source. Keep template: adjacency-recruiting and publicationMode: campaign. The schema owns the content contract; the template is discovered from its canonical directory and registered in the gallery.

- recruiter: name, desk, and signature. These are visible copy, not delivery headers.
- greeting and introduction: a named greeting for individual outreach, or a general greeting for a candidate list. Avoid claiming knowledge of an individual's experience unless supplied by the operator.
- job: title, company, requisition reference, team, department, labeled facts, mission, assignment, compensation, and the primary tracked link. Preserve the source's appointment conditions.
- job.image: optional hosted Photarium image with src, alt, source width/height, and caption. The renderer preserves its natural ratio at full email width. Use a broadly supported PNG or JPEG rendition; never add repository image binaries.
- job.link: author an object with href, label, and category: jobs. The canonical build converts this to a URL and enriches the final anchors. Both buttons share one click intent. Destinations must be under https://theadjacency.com/.
- sections: ordered recruiting-list sections, each with a heading and items containing a plain-text text field. The sample includes selected source duties and qualifications and links to the complete requisition.
- followUp: an invitation appropriate to the sender's actual reply handling.
- footer: identity, optional sender address and unsubscribeLink. Keep footerCta.enabled false. For list delivery use the platform's [unsubscribe] token; dispatch must resolve it. For individual correspondence, omit unsubscribeLink when appropriate.
- operatorContext: optional heading and plain-text paragraphs after the recruiting message. Only populate when the operator supplies or requests that context. Source grounding and explainers are never imported automatically.

Fields are plain text except URLs. Maizzle escapes text. This template does not accept raw HTML, ads, Short Takes, or automatic public-issue archive links. Its view-online action is the explicitly authored, verified requisition URL. It uses the shared schema, tracking, image/link validation, dark-mode policy, and content-slot pipeline.

The HTML does not set a From address, Reply-To, recipient list, or tracking policy. Configure a monitored Reply-To and the approved sender identity in the dispatch system. Building and previewing do not send mail.

## FDAA sample provenance

Source: nfl-editorial/src/content/jobs/fdaa/platform-counter-inference-analyst.mdx. The sample retains selected duties and qualifications verbatim, the 70-hour week, Level II compensation, and Tessier-Ashpool assignment. Introductory and mission copy is adapted for recruitment. The Adjacency / Talent & Appointments is the template's proposed recruiting identity. The requisition URL was resolved from the editorial Short Take registry and returned HTTP 200 during creation. Image: Photarium fd5a4313-345b-40d9-d9c6-b1a9227b7900, 1536 × 1024. Source popup explainer and service footer are intentionally opt-in through operatorContext and are absent from this sample.

## Build and verify

Run from nfl-maizzle-mail:

```sh
node --test tests/newsletter-core/adjacency-recruiting.test.mjs
node scripts/build-newsletter.mjs /Users/julian/Code/nfl-maizzle-mail/templates/adjacency-recruiting/sample-content.md fdaa-recruiting --no-open --strict-schema
npm run gallery:build -- --template=adjacency-recruiting
npm run gallery
```

The email and tracking/content-slot manifests are generated under build_production/. Gallery preview artifacts are ignored under build_template_gallery/. Check the final HTML at desktop and mobile sizes and inspect the tracked anchor destinations. Browser review does not establish rendering in Outlook, Gmail, or Apple Mail; an approved inbox test is a separate delivery action.
