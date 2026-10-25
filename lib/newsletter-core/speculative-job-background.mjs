/**
 * Prepare optional job-card texture backgrounds from canonical image metadata.
 * Keep the texture's proportions and tile vertically for long copy. A light
 * text backing provides contrast, while clients without CSS background support
 * keep the solid fallback. This helper never downloads or modifies an image.
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
  // Dense Discovery's 670px shell has a 638px card inside its 16px gutters.
  const minimumHeight = Math.ceil(638 * image.height / image.width);
  item.speculativeJobBackgroundStyleInline = `height:${minimumHeight}px;background-image:url('${safeUrl}');background-size:100% auto;background-position:center top;background-repeat:repeat-y;`;
  item.speculativeJobBackgroundTextStyleInline = 'background-color:rgba(255,255,255,0.72);padding:16px;';
}
