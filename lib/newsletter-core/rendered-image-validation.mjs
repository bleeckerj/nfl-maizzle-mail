function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function htmlAttributeVariants(url) {
  return [url, url.replace(/&/g, '&amp;')].filter((value, index, values) => values.indexOf(value) === index);
}

function renderedImagePattern(url) {
  const variants = htmlAttributeVariants(url).map(escapeRegExp).join('|');
  return new RegExp(`<img\\b[^>]*\\bsrc=["'](?:${variants})["'][^>]*>`, 'i');
}

function effectiveBrainDeadImageDeclarations(newsletterData) {
  const declarations = [];
  if (newsletterData?.brand?.logoUrl) {
    declarations.push({ path: 'brand.logoUrl', url: newsletterData.brand.logoUrl });
  } else if (newsletterData?.logoUrl) {
    declarations.push({ path: 'logoUrl', url: newsletterData.logoUrl });
  }

  if (newsletterData?.hero?.image) {
    declarations.push({ path: 'hero.image', url: newsletterData.hero.image });
  } else if (newsletterData?.mainImage) {
    declarations.push({ path: 'mainImage', url: newsletterData.mainImage });
  }

  if (!newsletterData?.sections?.length && !newsletterData?.books?.length && Array.isArray(newsletterData?.productImages)) {
    newsletterData.productImages.forEach((url, index) => {
      declarations.push({ path: `productImages[${index}]`, url });
    });
  }

  return declarations;
}

export function assertDeclaredTemplateImagesRendered({ newsletterData, templateName, renderedHtml }) {
  if (templateName !== 'brain-dead-template') return;

  const missing = effectiveBrainDeadImageDeclarations(newsletterData).filter(
    ({ url }) => typeof url !== 'string' || !renderedImagePattern(url).test(renderedHtml),
  );

  if (missing.length > 0) {
    const details = missing.map(({ path, url }) => `${path}: ${url}`).join('; ');
    throw new Error(`Rendered HTML is missing declared image(s): ${details}`);
  }
}
