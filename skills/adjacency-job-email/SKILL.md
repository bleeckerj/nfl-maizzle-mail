---
name: adjacency-job-email
description: Turn an existing job from The Adjacency corpus into a recruiter-led HTML email through nfl-maizzle-mail, with an editorial explainer, optional inventory ad, and sharing. Use for job-to-email preparation and revisions; this workflow does not send mail.
---

# Adjacency job email

Produce an editable Markdown email source and a rendered preview using the canonical adjacency-recruiting template. Complete the email artifact, including the editorial explainer and sharing, rather than stopping at suggested copy.

## Locate the current contract

Default sibling repositories are /Users/julian/Code/nfl-editorial and /Users/julian/Code/nfl-maizzle-mail. Respect a user-specified checkout. Read their applicable AGENTS.md files and inspect dirty state before edits.

Discover the Maizzle and editorial MCP tools first. Use get_template_authoring_guide and get_template_schema for adjacency-recruiting. The maintained local references are:

- /Users/julian/Code/nfl-maizzle-mail/templates/adjacency-recruiting/AUTHORING.md
- /Users/julian/Code/nfl-maizzle-mail/templates/adjacency-recruiting/newsletter.schema.json
- /Users/julian/Code/nfl-maizzle-mail/templates/adjacency-recruiting/sample-content.md

Read the guide and schema before authoring. Use the FDAA sample to understand field shapes, then replace its role-specific content. Do not make every hiring organization sound like FDAA or invent missing job facts to fill the template.

## Read and resolve the source

Find the requested job under nfl-editorial/src/content/jobs/. Read its current frontmatter and body, including popupExplainerText, any grounding, conditions, qualifications, compensation, and hosted visuals. Source wording governs the role. If several jobs match and no selection is inferable, ask for the target while continuing template inspection.

Resolve the published destination from the current publication registry or existing verified corpus references. Do not guess it from a filename: published job URLs may have stable suffixes. Verify the destination. Keep application and requisition actions on approved The Adjacency URLs. A failed destination is a preparation blocker for that CTA, not a reason to invent a hiring endpoint.

Use source Photarium URLs and preserve complete images. Inspect dimensions when needed. No content images belong in these repositories. If no suitable image exists, use the template's image-free option or ask for a source pointer.

## Adapt the recruiting message

Use the supplied recruiter identity or an appropriate editable talent-desk identity. Write a candidate-facing introduction, selected duties and qualifications, and follow-up. Use a general greeting for a list unless the operator supplies personalization. Do not claim knowledge of a candidate's history without evidence.

Preserve the exact job title, company, reference, and material employment conditions. Distinguish quoted source text from adapted introductions in the internal handoff. Include demanding or unusual requirements that affect the reader's understanding. Do not invent compensation, clearance, availability, or endorsements. For required fields missing from the source, use a truthful statement such as “Not specified in the requisition” or make an appropriate schema-supported omission.

Keep the recruiting portion, ad copy, titles, captions, alt text, and destination labels in their established world.

## Write the required explainer

Every standard job email includes operatorContext: heading and paragraphs. Use the source's existing explainer as the primary editorial basis when available. Explain plainly what this artifact is, the particular change it explores, and the responsibilities or tensions a reader can examine through the job. Here the operator explicitly permits stepping outside the world and naming design fiction or speculative work.

Keep this framing inside the editorial explainer. Do not relabel the recruiter, advertisement, or linked artifact. Adapt without inventing author intent, references, quotes, or factual claims. Verify any current news, legal, medical, or other external claim before repeating it; otherwise explain the premise without that claim. Add relevant verified reference links through operatorContext.references. Grounding records use canonical digest IDs, never signal IDs.

Use /Users/julian/Code/nfl-editorial/docs/GROUNDED_LANGUAGE.md for explanatory prose. Avoid canned conclusions and decision-closure tails. Follow an explicit request to omit or change the explainer; if the live schema requires it, make a scoped schema/template change instead of quietly inserting empty text.

## Ads and sharing

Ads are optional. For a requested or useful example placement, discover editorial_ads_list_inventory and editorial_ads_get_json; select a relevant existing ad and record the exact ID. If the operator supplies an ID, preserve it. Author one ad-block section per placement with exactly one item containing adId. The shared build loads copy, media, labels, sponsor, and links from ads.json. Do not paste those generated fields into the source or invent destinations for unlinked ads. Omit all ad blocks for an ad-free version.

Include the share component by default. Write its subject and message for sharing the public requisition. The template generates share.emailHref from these fields and job.link; never persist the generated value or include subscriber identifiers, unsubscribe tokens, or a recipient-specific delivered-email URL. Set share.enabled false only when requested or appropriate to the specified format. Opening the mailto link composes a message; it is not a delivery test.

## Build, inspect, and hand off

Save new dispatch sources under an appropriate authoring directory in nfl-maizzle-mail, normally content/, with a descriptive filename. Keep the reusable template sample separate from a new job dispatch. Use publicationMode: campaign and template: adjacency-recruiting.

Prefer validate_newsletter_markdown, then build_campaign_email with explicit source, template, name, and output directory. If unavailable, use the canonical build command documented in AUTHORING.md with an absolute source path and --strict-schema. Do not substitute raw Maizzle compilation for final verification.

Inspect final HTML and manifests: source facts, required explainer, boundary order, optional ad hydration, complete images, live job/reference links, decoded share subject/body, and tracking conflicts. Check desktop and mobile through the supported browser and Maizzle gallery. When updating the template, run its focused tests and the schema-starter contract test, then rebuild after the final edit. Report inbox-client compatibility separately from browser review.

Run the configured prose checker on authored prose. Follow repository commit policy and preserve unrelated work. Return the HTML and preview locations, editable source, verification results and limits, any source omissions/adaptations, and selected ad ID. Configure sender identity, monitored Reply-To, recipients, and unsubscribe handling only when the delivery task calls for them.

Preparing, building, or previewing does not authorize sending. If asked to dispatch a newly authored bespoke message, present the exact version and delivery details for approval under the applicable communication policy. Never send merely to test this skill.
