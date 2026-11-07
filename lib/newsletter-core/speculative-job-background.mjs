/**
 * Prepare optional job-card texture backgrounds from canonical image metadata.
 * Cover the full card while keeping image proportions and the repeat control. Logo and
 * text sit directly over the texture; clients without CSS background support
 * keep the solid fallback. Returns a diagnostic line for the build log; it never
 * downloads or modifies an image.
 */
export function prepareSpeculativeJobBackground(item) {
  const image = item.backgroundImage;
  if (!image) return;
  const url = new URL(image.src);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Job backgrounds require an HTTP(S) URL.');
  if (![image.width, image.height].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Job backgrounds require positive width and height.');
  }
  const safeUrl = url.href.replaceAll("'", '%27').replaceAll('"', '%22');
  const repeat = image.repeat ?? 'no-repeat';
  if (!['no-repeat', 'repeat', 'repeat-x', 'repeat-y'].includes(repeat)) {
    throw new Error('Job background repeat must be no-repeat, repeat, repeat-x, or repeat-y.');
  }
  // Dense Discovery's 670px shell has a 638px card inside its 16px gutters.
  const minimumHeight = Math.ceil(638 * image.height / image.width);
  // Cover follows the card's actual height as copy wraps on mobile. Width-only
  // sizing leaves the lower copy over the fallback color on tall cards.
  item.speculativeJobBackgroundStyleInline = `height:${minimumHeight}px;background-image:url('${safeUrl}');background-size:cover;background-position:center top;background-repeat:${repeat};`;
  // Preserve the copy inset without obscuring the supplied image with a panel.
  item.speculativeJobBackgroundTextStyleInline = 'padding:16px;';
  return `Job-card background [${item.jobRef || item.headline || 'job'}]: ${url.href} | original=${image.width}x${image.height} | repeat=${repeat} | size=cover | position=center top | desktop minimum height=${minimumHeight}px`;
}
