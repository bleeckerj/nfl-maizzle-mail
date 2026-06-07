# Commerce Ad Lockups in Newsletters

*Showing a commerce ad's price + icon in the email — when you want to.*

## The short version

Some ads are **commerce ads**: they have a price and a little brand icon (the Heinz
ad, for example, has **$8.99** and the **EREWHON** badge). In a newsletter, a commerce
ad can appear two ways:

- **Plain card** *(the default)* — the product photo + the label + the sponsor name. No price, no icon.
- **Lockup** *(opt-in)* — that same photo with the **price and icon composited onto it**, plus the label and sponsor.

You don't have to do anything to get the plain card. When you *want* the price + icon
on a particular newsletter, you switch it on with **one line**. The build politely
reminds you it's possible, so you don't have to remember any of this.

> **Why is the lockup a baked image and not just HTML?** Email clients (Outlook,
> Gmail, etc.) can't reliably place a price/icon over a photo with CSS — it breaks.
> So we generate one flat image from the exact same design used on the website, and
> the email just points at it. It always matches the site.

## Three places things live

There are only three moving parts, and each lives in exactly one place:

| What | Where it lives | Looks like |
| --- | --- | --- |
| The ad (photo, price, icon, label, sponsor) | `nfl-editorial/src/content/ads.json` | the `heinz-icelandic-chili-sauce` entry |
| The baked lockup image's URL | that same ad → `commerce.lockup.snapshotSrc` | `https://imagedelivery.net/…/public` |
| The "show the lockup here" switch | the **newsletter markdown** ad-block item | `commerceLockup: true` |

That's it. `upload: true` is **not** a file setting — it's an option you give the
image-baking tool (see Step 1). `commerceLockup: true` always goes in the **newsletter**.
`snapshotSrc` always goes on the **ad** in `ads.json`.

---

## Default: a plain card (do nothing)

This is what you already write. It shows the photo + label + sponsor:

```yaml
- type: ad-block
  title: "Tomorrow's Ads Today"
  items:
    - adId: heinz-icelandic-chili-sauce
```

Result: Heinz photo, "HEINZ ICELANDIC CHILI SAUCE" label, "Heinz" sponsor. **No price, no icon.**

---

## Showing the price + icon: three steps

### Step 1 — Bake the lockup image (once per ad; redo it if the art changes)

Two ways, pick one:

- **Easiest — ask Claude to run the tool:** run the **`editorial_ads_preview_snapshot`**
  MCP tool with **`upload: true`**. It generates the image *and* publishes it, then
  hands back the image URL and a one-line reminder telling you exactly what to paste where.

  > `upload: true` is a **parameter of that tool** — you're telling it "also publish this,
  > don't just save it on disk." It does not go in any file.

- **Or, to eyeball it locally first (no publishing):**

  ```bash
  cd ~/Code/nfl-editorial
  npm run ads:preview -- heinz-icelandic-chili-sauce --save-snapshot
  ```

  This saves PNGs under `output/ads-preview-lockups/heinz-icelandic-chili-sauce/<timestamp>/`
  so you can open and check them. (When you're happy, use the tool with `upload: true` to publish.)

### Step 2 — Put the returned URL on the ad

In `nfl-editorial/src/content/ads.json`, find the ad and set `commerce.lockup.snapshotSrc`:

```jsonc
{
  "id": "heinz-icelandic-chili-sauce",
  "sponsor": "Heinz",
  "media": { "src": "https://imagedelivery.net/…/plain-photo/public" },
  "commerce": {
    "presentation": "overlay-lockup",
    "priceText": "$8.99",
    "lockup": {
      "snapshotSrc": "https://imagedelivery.net/…/baked-lockup/public"  // ← paste it here
    }
  }
}
```

### Step 3 — Turn it on for this newsletter

Add **`commerceLockup: true`** to the ad-block item (right next to `adId`):

```yaml
- type: ad-block
  title: "Tomorrow's Ads Today"
  items:
    - adId: heinz-icelandic-chili-sauce
      commerceLockup: true        # ← show the price+icon lockup here
```

Result: the **photo-with-$8.99-and-EREWHON** image, with the "HEINZ ICELANDIC CHILI
SAUCE" label and "Heinz" sponsor **still as normal text** above/below it.

That's the whole loop. Switch it off again by removing that one line.

---

## What the build tells you

When you run `npm run build:newsletter -- <issue>`, the build nudges you per commerce ad:

- **💡 "… can show its price+icon lockup. Add `commerceLockup: true` …"**
  → A baked image exists; you're currently showing the plain card. Add the one line to use the lockup.

- **💡 "… is a commerce ad … showing as a plain image. To show the price+icon version: (1) bake … (2) paste the URL into `commerce.lockup.snapshotSrc` … (3) add `commerceLockup: true` …"**
  → No baked image yet. The three steps, in order.

- **⚠️ "… you set `commerceLockup: true` … but this ad has no baked lockup image yet …"**
  → You asked for the lockup but Step 1/2 aren't done. It falls back to the plain card so the build never breaks; do Steps 1–2 and rebuild.

- **🛍️ "… showing its composited price+icon lockup image …"**
  → All wired up; the email is using the lockup.

---

## A few more examples

**A. Opted in, but not baked yet** — build shows the ⚠️ above and renders the plain card.
Fix: do Steps 1–2, rebuild.

```yaml
items:
  - adId: heinz-icelandic-chili-sauce
    commerceLockup: true     # but commerce.lockup.snapshotSrc is still empty → plain card + ⚠️
```

**B. A non-commerce ad** — `commerceLockup` has nothing to do (no price/icon to show);
you'll get a gentle warning and the normal image. Only ads with a price/icon
(`commerce.presentation: overlay-lockup`) have a lockup.

**C. Two ads, one with, one without:**

```yaml
- type: ad-block
  items:
    - adId: heinz-icelandic-chili-sauce
      commerceLockup: true     # price + icon
- type: ad-block
  items:
    - adId: some-other-commerce-ad
                                # plain card (left off on purpose)
```

---

## FAQ

- **Does switching it on for one newsletter change other newsletters?** No. It's
  per placement — only the issue where you added the line.
- **Are the label and sponsor still real text?** Yes. Only the *image* is swapped to
  the baked lockup; label and sponsor stay live HTML (better for dark mode + accessibility).
- **If I change the ad's artwork later?** Re-bake (Step 1) and paste the new URL (Step 2).
  The old URL keeps working for already-sent emails.
- **What size is the baked image?** The desktop size by default — the largest, crispest
  version (rendered at 3× for retina). That's plenty for the 600px email column.

---

## How it works under the hood *(for engineers — so this survives a context reset)*

**Two render surfaces in `nfl-editorial` — use the right one:**

- ✅ **Correct lockup** = the live preview route `/ads/preview/<id>` →
  `renderPreviewAdFragment()` → `renderCommerceLockup()`
  (`mcp-server/src/domains/ads/preview/renderAdFragment.ts`). This is the on-site design.
- ❌ **Wrong graphic** = the social-lockup snapshot pipeline
  (`scripts/ads/snapshots.ts` → `buildSocialLockupMarkup`). Different framed card. Do **not** use it for newsletters.

**Generation** (`scripts/ads/preview-snapshot.ts`, `capturePreviewLockupSnapshot`):
renders the ad inside an **article-context frame** (`renderContextFrameDocument` +
`preview-context-ad-fragment`, where `--ad-desktop-width-cap:100%` lets the lockup fill
the column) and screenshots `.ad-commerce-lockup` with Playwright at
`deviceScaleFactor: 3`. Capturing the default catalog *"Creative Preview"* card instead
crushes the lockup (tiny image, oversized price/icon) — that was an early bug.
- CLI: `npm run ads:preview -- <id> --save-snapshot [--snapshot-widths all|<csv>] [--snapshot-scale <n>]`
- MCP tool: `editorial_ads_preview_snapshot` (`mcp-server/src/domains/ads/preview/snapshotTool.ts`);
  `upload: true` publishes via `uploadArtifactToPhotarium` and returns `photariumUrl` + a `usage` hint.

**Consumption** (the newsletter build):
`scripts/build-newsletter.mjs` → `prepareNewsletterData` (`lib/newsletter-core/prepare-newsletter.mjs:97`)
→ **`lib/newsletter-core/hydrate-ad-blocks.mjs`**. When the item has `commerceLockup: true`
**and** the ad has `commerce.lockup.snapshotSrc`, hydration swaps `hydratedItem.image` to
that URL and **keeps label/sponsor** (it does **not** set `renderMode: 'snapshot'`, which
would suppress them). No template change is needed; the nudges live here too.

> Note: there is no longer a duplicate hydrator in `build-newsletter.mjs` — an unused
> copy (with its own `isCommerceOverlayLockup`/overlay helpers) was removed. The
> newsletter-core hydrator above is the only one.

**Don't** wire this through `renderMode: 'snapshot'` — that mode means "the image is the
whole ad" and suppresses label/sponsor. The `dense-discovery` template additionally draws
a fragile *HTML* price/icon overlay for `renderMode: 'commerce-overlay-lockup'`; that's the
old layered fallback, not this baked-image path.

**Tests:** `tests/newsletter-core/build-external-input.test.mjs` →
*"renders commerceLockup opt-in as the composited lockup image with live label and sponsor"*;
`nfl-editorial/scripts/ads/__tests__/preview-snapshot.test.ts`.
