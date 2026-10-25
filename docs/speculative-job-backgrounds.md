# Job-card texture backgrounds

Dense Discovery job cards accept a canonical `newsletterCard.backgroundImage` with `src`, `altText`, `width`, and `height`. Author this on the Editorial job, alongside its existing company logo and copy. The Backoffice newsletter keeps only the `jobRef` and presentation settings.

The renderer preserves image proportions, tiles the texture vertically, and provides a translucent white text backing. It reserves enough height for a complete texture tile at desktop width. Email clients without CSS background-image support retain their solid card background. No image files are downloaded into a content repository.

The inline background styles are build-only values. They are pruned before source validation and are never saved back into authored newsletter JSON.
