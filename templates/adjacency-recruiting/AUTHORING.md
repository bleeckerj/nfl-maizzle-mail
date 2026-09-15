# Adjacency recruiting email

Turn a corpus job into a recruiter-led email, followed by an editorial explainer and a share action. The recruiting message and any advertisement maintain their institutional voices. The explainer explicitly steps outside that world to help the reader understand the premise and examine its implications.

## Content order

1. Recruiter identity and introduction.
2. Role, full-width image, facts, duties, qualifications, compensation, and follow-up.
3. Required “What’s going on here?” editorial explainer and optional reference links.
4. Share this, followed by the delivery footer.

Sponsor messages are optional and independently positioned at the boundaries described below. They can appear before, within, or after the recruiting material, or beside the explainer and sharing sections. Keep each sponsor message separate from surrounding prose. Sponsor placement does not determine explainer placement; the current template places the explainer below the recruiting message.

## Author-owned fields

Copy sample-content.md into a new Markdown source, then replace the FDAA content. Keep template: adjacency-recruiting and publicationMode: campaign. Read newsletter.schema.json for the current contract.

- recruiter: name, desk, and signature; visible copy, separate from delivery headers.
- greeting and introduction: personal or list-appropriate outreach. Do not claim knowledge of a candidate that the operator has not supplied.
- job: source title, company, reference, team, department, labeled facts, mission, assignment, compensation, and CTA label. Preserve material appointment conditions. The FDAA example retains the 70-hour week and Tessier-Ashpool assignment.
- job.image: optional Photarium src, alt, original width/height, and caption. The renderer displays the full image at its natural ratio. Never store content images in this repository.
- job.link: tracked object with href, label, and category: jobs. Use the verified published requisition URL under https://theadjacency.com/. The build converts tracked objects into URL strings and enriches rendered anchors.
- sections: recruiting-list sections with title and items containing text, plus optional ad-block sections described below.
- followUp: outreach appropriate to the sender's actual reply handling.
- operatorContext: required heading and paragraphs explaining what the artifact is, what premise it explores, and what the reader can examine through it. Adapt the source job's explainer where available. Keep factual references accurate; do not invent source claims. Optional references contain text and a tracked link with href, label, and category: grounding.
- share: enabled, heading, text, buttonLabel, subject, and message. The build appends job.link to the message and generates a properly encoded mailto link. Set enabled: false to hide the component when explicitly requested.
- footer: identity, optional address and unsubscribeLink; keep footerCta.enabled false. List delivery uses [unsubscribe], resolved by the sender. Individual correspondence may omit it where appropriate.

The explainer is now standard for this email format. Its presence does not authorize changing the job, recruiter introduction, ad, captions, or linked destination into explanatory copy. Keep those artifacts intact. Source grounding IDs, when cited, must be canonical digest IDs; do not substitute signal IDs.

## Optional ads from ads.json

Add one section per sponsor message. Choose its placement independently for each email; no single ad location is mandatory. A visible SPONSOR heading identifies the message without altering the inventory ad’s own copy.

```yaml
sections:
  - type: recruiting-list
    title: What you would work on
    items:
      - text: A selected duty from the source requisition.
  - type: ad-block
    placement: after-role
    sponsorLabel: SPONSOR
    items:
      - adId: fluke-turing-clamp-4x5-01
```

The shared hydrator loads image, alt text, copy, sponsor, label, and any links from nfl-editorial/src/content/ads.json. Each block accepts exactly one adId. Unknown IDs fail. Do not paste ad media URLs or rewrite inventory copy in the email source. Ads with no inventory destination remain unlinked; no destination is invented. Omit the block to omit the ad and its spacing. Images remain full-width with natural height.

### Sponsor placement

| placement | Position |
| --- | --- |
| top | Below the masthead, before the greeting |
| after-introduction | After the recruiter’s introduction |
| after-role | After the role image, facts, and first requisition button |
| after-assignment | After the assignment summary |
| inline | In sections array order, between individual recruiting lists |
| after-lists | After all duty and qualification lists |
| after-compensation | After salary and benefits |
| after-recruiting | After the recruiter’s follow-up and signature |
| after-explainer | After the editorial explainer |
| after-share | After sharing, before the footer |

Omitting placement preserves after-recruiting for older sources. New emails should specify it deliberately. Multiple ads at the same placement retain source order. Each ad renders once. To place a sponsor between duties and qualifications, set placement: inline and put that ad-block between the two recruiting-list entries in sections. Moving the ad in sections alone does not move a named-placement ad.

The FDAA sample demonstrates after-role. This is an editable example, not a default for future jobs. Omit the ad-block for no sponsor message. Ad images are complete artifacts; do not split them or place a sponsor inside a paragraph or image.

## Explainer and sharing example

```yaml
operatorContext:
  heading: What’s going on here?
  paragraphs:
    - This is a design-fiction job requisition from The Adjacency.
    - Explain the particular premise and the responsibilities it raises.
share:
  enabled: true
  heading: Share this
  text: Send this requisition to someone working on related questions.
  buttonLabel: Share by email
  subject: A job from The Adjacency
  message: "I thought you might find this requisition interesting:"
```

Quote YAML values containing colons when authoring by hand. Share-by-email opens the reader's mail client with the public requisition URL. It does not send a message, forward the delivered email, or include subscriber identifiers or unsubscribe links. share.emailHref is build-owned and is removed before schema validation and authoring export; do not author it.

## Source and delivery boundaries

The FDAA sample adapts nfl-editorial/src/content/jobs/fdaa/platform-counter-inference-analyst.mdx. Its editorial note adapts popupExplainerText; its reference link points to the source's earlier FDAA artifact. The note does not repeat the source's news/legal claim without verifying it. The ad is fluke-turing-clamp-4x5-01. Remove its section for a version without advertising.

Template fields are plain text except URLs and the HTML supplied by the trusted ad inventory. No public-issue archive URL is inferred. From, Reply-To, recipient selection, and tracking policy belong to the dispatch system. Building, previewing, and opening a mailto link do not authorize dispatch.

## Verification

Prefer the Maizzle MCP validate_newsletter_markdown and build_campaign_email tools with an explicit source path, template, and output directory. Shell fallback from nfl-maizzle-mail:

```sh
node --test tests/newsletter-core/adjacency-recruiting.test.mjs tests/newsletter-core/template-schema-contract.test.mjs
node scripts/build-newsletter.mjs /Users/julian/Code/nfl-maizzle-mail/templates/adjacency-recruiting/sample-content.md fdaa-recruiting --no-open --strict-schema
npm run gallery:build -- --template=adjacency-recruiting
npm run gallery
```

Inspect final HTML, link/content-slot manifests, complete images, the explainer boundary, the decoded share URL, and desktop/mobile layouts. Generated outputs live under build_production/ and build_template_gallery/. Browser review does not establish inbox-client compatibility. A test send is a separate dispatch action.
