---
name: adjacency-job-email
description: Turn an existing job from The Adjacency corpus into a recruiter-led HTML email through nfl-maizzle-mail, tightly aligned with the hiring company’s brand and required logo, with an editorial explainer, optional inventory ad, and sharing. Use for job-to-email preparation and revisions; this workflow does not send mail.
---

# Adjacency job email

Produce an editable Markdown email source and a rendered preview using a company-specific Maizzle treatment. Complete the email artifact, including the editorial explainer and sharing, rather than stopping at suggested copy.

## Locate the current contract

Default sibling repositories are /Users/julian/Code/nfl-editorial and /Users/julian/Code/nfl-maizzle-mail. Respect a user-specified checkout. Read their applicable AGENTS.md files and inspect dirty state before edits.

Discover the Maizzle and editorial MCP tools first. Discover the available company-specific templates and read the selected template with get_template_authoring_guide and get_template_schema. adjacency-recruiting supplies a reference content contract; it is not the universal visual layout.

- /Users/julian/Code/nfl-maizzle-mail/templates/adjacency-recruiting/AUTHORING.md
- /Users/julian/Code/nfl-maizzle-mail/templates/adjacency-recruiting/newsletter.schema.json
- /Users/julian/Code/nfl-editorial/emails/jobs/fdaa-platform-counter-inference-analyst/email.md

Read the guide and schema before authoring. Use the FDAA sample to understand field shapes, then replace its role-specific content. Do not make every hiring organization sound like FDAA or invent missing job facts to fill the template.

## Read and resolve the source

Find the requested job under nfl-editorial/src/content/jobs/. Read its current frontmatter and body, including popupExplainerText, any grounding, conditions, qualifications, compensation, and hosted visuals. Source wording governs the role. If several jobs match and no selection is inferable, ask for the target while continuing template inspection.

Resolve the published destination from the current publication registry or existing verified corpus references. Do not guess it from a filename: published job URLs may have stable suffixes. Verify the destination. Keep application and requisition actions on approved The Adjacency URLs. A failed destination is a preparation blocker for that CTA, not a reason to invent a hiring endpoint.

Use source Photarium URLs and preserve complete images. Inspect dimensions when needed. No content images belong in these repositories. An optional role illustration may be omitted; the company logo is required. If the logo is missing, resolve it through the source companyLogo or approved hosted corpus and ask for a pointer if necessary. Do not silently omit it.

## Company identity and differentiation are required

Every recruiting email is a heavily branded announcement aligned tightly with the hiring company’s style, brand voice, and character. Integrate its actual company logo prominently in the recruiting masthead. Preserve its complete composition, proportions, and clear space. Prefer a verified hosted PNG rendition for email when the source logo is SVG. Never redraw the mark, substitute a text heading, or let The Adjacency masthead displace the hiring company’s identity.

Inspect the source job’s company renderer and the employer’s official hiring or brand references. Match the typography, palette, spacing, information hierarchy, button treatment, and institutional language. Preserve the operator’s requested tonal variation within that company voice. Keep The Adjacency attribution and the authorized explainer visually separate from the recruiting identity.

Different employers must have visibly different email designs. A logo-and-color swap on the FDAA layout is insufficient. Choose a company-specific composition, section order, and typographic hierarchy. Reuse a company’s own treatment for its subsequent jobs; create a new canonical template when an existing one cannot express the employer’s identity. Shared schema concepts, ad hydration, sharing preparation, and delivery infrastructure remain reusable. Do not fork those business rules to obtain a different design.

For Google DeepMind, use templates/gdm-special-projects and its AUTHORING.md. Its white, logo-led treatment follows the source company renderer, with charcoal type and restrained Google color accents. Avoid large saturated blue panels. Other employers require their own source-backed treatment; this palette and layout are not defaults.

Verify the rendered logo loads and is legible on desktop and mobile. Compare the result to the employer’s source treatment and to other recruiting emails: the employer should be recognizable from the whole design. A missing logo or generic recoloring is an incomplete draft unless the operator explicitly requests an exception.

## Adapt the recruiting message

Use the supplied recruiter identity or an appropriate editable talent-desk identity. Write a candidate-facing introduction, selected duties and qualifications, and follow-up. Use a general greeting for a list unless the operator supplies personalization. Do not claim knowledge of a candidate's history without evidence.

Preserve the exact job title, company, reference, and material employment conditions. Distinguish quoted source text from adapted introductions in the internal handoff. Include demanding or unusual requirements that affect the reader's understanding. Do not invent compensation, clearance, availability, or endorsements. For required fields missing from the source, use a truthful statement such as “Not specified in the requisition” or make an appropriate schema-supported omission.

Keep the recruiting portion, ad copy, titles, captions, alt text, and destination labels in their established world.

## Write the required explainer

Every standard job email includes operatorContext: heading and paragraphs. Use the source's existing explainer as the primary editorial basis when available. Explain plainly what this artifact is, the particular change it explores, and the responsibilities or tensions a reader can examine through the job. Here the operator explicitly permits stepping outside the world and naming design fiction or speculative work.

Keep this framing inside the editorial explainer. Do not relabel the recruiter, advertisement, or linked artifact. Adapt without inventing author intent, references, quotes, or factual claims. Verify any current news, legal, medical, or other external claim before repeating it; otherwise explain the premise without that claim. Add relevant verified reference links through operatorContext.references. Grounding records use canonical digest IDs, never signal IDs.

Use /Users/julian/Code/nfl-editorial/docs/GROUNDED_LANGUAGE.md for explanatory prose. Avoid canned conclusions and decision-closure tails. Follow an explicit request to omit or change the explainer; if the live schema requires it, make a scoped schema/template change instead of quietly inserting empty text.

## Optional atmosphere banners

For `gdm-special-projects`, author `job.image` with only a hosted `src` and descriptive `alt`. `width`, `height`, and `caption` are optional. Atmosphere imagery normally needs no editorial caption; do not invent one or ask the operator for dimensions solely to satisfy validation. Omission removes the caption row and its spacing. Preserve the full image with automatic height. The banner follows the role brief, before the letter; `after-role` ads follow it. Company-logo requirements are separate. Consult other templates' live schemas rather than assuming parity. Use [the GDM authoring guide](../../templates/gdm-special-projects/AUTHORING.md) for examples and the editorial guide it links for sponsor placements and rebuild commands.

## Ads and sharing

Ads are optional. For a requested or useful example placement, discover editorial_ads_list_inventory and editorial_ads_get_json; select a relevant existing ad and record the exact ID. If the operator supplies an ID, preserve it. Author one ad-block section per sponsor message with exactly one item containing adId. Set placement deliberately using the live AUTHORING.md options: sponsor messages may appear at the top, between content sections, or near the end. For placement between individual duty/qualification lists, use inline and order the ad-block between those lists in sections. Use the default SPONSOR heading or the operator’s sponsorLabel. Do not impose a fixed location or infer explainer placement from sponsor placement. Preserve full ad imagery and keep sponsor messages separate from surrounding prose. The shared build loads copy, media, labels, sponsor, and links from ads.json. Do not paste those generated fields into the source or invent destinations for unlinked ads. Omit all ad blocks for an ad-free version.

Include the share component by default. Write its subject and message for sharing the public requisition. The template generates share.emailHref from these fields and job.link; never persist the generated value or include subscriber identifiers, unsubscribe tokens, or a recipient-specific delivered-email URL. Set share.enabled false only when requested or appropriate to the specified format. Opening the mailto link composes a message; it is not a delivery test.

## Build, inspect, and hand off

Save authored email content in nfl-editorial/emails/jobs/<descriptive-slug>/email.md. nfl-editorial owns the email draft and its adjacent generated <slug>.html; nfl-maizzle-mail owns templates, schemas, shared preparation, and rendering. Never keep the authoritative email copy in Maizzle content/ or template sample files. Preserve operator edits when relocating or revising a draft. Use publicationMode: campaign and the selected company-specific template ID.

Prefer validate_newsletter_markdown, then build_campaign_email with explicit source, template, campaign_name set to the email-folder slug, and output_dir set to the source Markdown directory. The editorial command is npm run mail:build:job-email -- <slug>; it invokes the canonical Maizzle builder and writes HTML and manifests next to email.md. The renderer checkout is configured in nfl-editorial/emails/config.json. See nfl-editorial/emails/README.md. Do not substitute raw Maizzle compilation for final verification.

Inspect final HTML and manifests: source facts, company logo and brand fidelity, required explainer, boundary order, optional ad hydration, complete images, live job/reference links, decoded share subject/body, and tracking conflicts. Check desktop and mobile through the supported browser and Maizzle gallery. When updating the template, run its focused tests and the schema-starter contract test, then rebuild after the final edit. Report inbox-client compatibility separately from browser review.

Run the configured prose checker on authored prose. Follow repository commit policy and preserve unrelated work. Return the HTML and preview locations, editable source, verification results and limits, any source omissions/adaptations, and selected ad ID. Configure sender identity, monitored Reply-To, recipients, and unsubscribe handling only when the delivery task calls for them.

Preparing, building, or previewing does not authorize sending. If asked to dispatch a newly authored bespoke message, present the exact version and delivery details for approval under the applicable communication policy. Never send merely to test this skill.

Sponsor presentation uses a complete 1px charcoal border around the label, image, and copy, with 40px outer side gutters on desktop and 24px on mobile. Preserve the full image at its natural ratio inside this bounded box. This shared recruiting-email treatment applies at every sponsor placement, including inline ads. Banner images remain independent of this sponsor framing.

The editorial wrapper names HTML and manifests after the email-folder identifier supplied to the command. Add `--open` to open the resulting HTML through the operating system after a successful build; the default is build-only. `--dry-run --open` performs neither action. Generic `email.html` files from earlier builds are legacy output. Gallery previews keep their separate `preview.html` name.
