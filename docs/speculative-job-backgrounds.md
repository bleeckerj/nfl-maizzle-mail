# Job-card texture backgrounds

Dense Discovery job cards accept a canonical `newsletterCard.backgroundImage` with `src`, `altText`, `width`, and `height`. Author this on the Editorial job, alongside its existing company logo and copy. The Backoffice newsletter keeps only the `jobRef` and presentation settings.

## Authoring example

Add this optional block to any job's frontmatter in `nfl-editorial/src/content/jobs/<company>/<role>.mdx`. This example uses the Muse texture; replace the URL, description, and original dimensions for another image.

```yaml
newsletterCard:
  backgroundImage:
    src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/5e98c3c8-e2ce-4ebb-7b63-3d0e7a476b00/w=600?format=webp
    altText: Pale blue grain with a faint rainbow.
    width: 880
    height: 882
```

| Field | Requirement |
| --- | --- |
| `src` | Hosted HTTP(S) image URL. Use Photarium; do not store the image in a content repository. |
| `altText` | Nonempty image description. Retained as metadata; CSS backgrounds have no HTML `alt` attribute. Keep essential information in the job's HTML text. |
| `width`, `height` | Positive original image dimensions in pixels, even when the delivery URL requests a smaller variant. |

Reference that job in the newsletter:

```yaml
- type: speculative-job
  title: Tomorrow's Jobs Today
  items:
    - jobRef: muse/principal-design-technologist-brand-experience-technology-studio
```

The background is the job's default in every Dense Discovery newsletter that references it. Setting `items[].backgroundImage` directly in a Backoffice draft does not override the job: hydration replaces it with canonical metadata. Remove `newsletterCard.backgroundImage` from the job to return to a solid card. This option does not change the job page's masthead, the company logo, or the separate image-above-copy option `newsletterCard.media`.

## Rendering and schema

The renderer preserves image proportions and tiles the texture vertically. The company logo and job text sit directly over the image, with no white panel covering it. Choose an image that keeps the text readable. The card reserves enough height for a complete texture tile at desktop width. Email clients without CSS background-image support retain their solid card background. No image files are downloaded into a content repository.

The inline background styles are build-only values. They are pruned before source validation and are never saved back into authored newsletter JSON.

The canonical job contract is `newsletterCard.backgroundImage` in Editorial's `shared/frontmatter/schemas.ts`. The hydrated email contract is `sections[].items[].backgroundImage` in `templates/dense-discovery/newsletter.schema.json`. Both require the four image fields when the optional object is present.
