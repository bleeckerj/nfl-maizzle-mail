# Commerce ads: Compact Band

Commerce ads in Dense Discovery, Adjacency Recruiting, and GDM Special Projects use the same Compact Band as webpage ads. Author an `ad-block` with its inventory `adId`; the builder resolves the original image, icon, price, optional ratings, and sponsor from Editorial.

The image displays at its natural aspect ratio. A light gray panel with hairline borders places the logo on the left and price on the right. A separate strip appears only when a rating or review count is supplied. Sponsor and conventional ad copy follow the panel. Zero ratings and zero review counts remain visible.

`nfl-native-lockups/commerce-band` supplies table markup with inline styles for both web and HTML email. The icon registry is `nfl-editorial/shared/ads/commerce-icons.json`. No absolute positioning, SVG stars, or baked overlay image is required.

Existing `body` and `overlay-lockup` inventory records receive Compact Band automatically. Historical geometry and snapshot metadata remain readable for older exports; `commerceLockup` and `adRenderMode: snapshot` in a newsletter draft do not replace the source image of a hydrated commerce ad. An internal placeholder is expanded after Maizzle resolves nested component locals, before CSS inlining. Panel HTML is never stored in authoring data.

Build and inspect the HTML through `scripts/build-newsletter.mjs`; the jobs wrapper is `npm run mail:build:job-email -- <job-id> --no-open` in Editorial. This validates and renders locally. It does not send an email.
