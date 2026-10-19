import { getNewsletterSectionEntries } from './section-entries.mjs';
function formatImageResult(result) {
  return result?.error || result?.status || 'invalid image URL';
}

export function resolveImageEntryUrl(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof entry === 'object') {
    if (typeof entry.src === 'string' && entry.src.trim().length) return entry.src.trim();
    if (typeof entry.image === 'string' && entry.image.trim().length) return entry.image.trim();
  }
  return null;
}

function addImageDeclaration(declarations, path, value) {
  if (value) declarations.push({ path, value });
}

export function collectNewsletterImageDeclarations(data) {
  const declarations = [];

  addImageDeclaration(declarations, 'header.featuredImage', data?.header?.featuredImage);
  addImageDeclaration(declarations, 'header.logoTop', data?.header?.logoTop);
  addImageDeclaration(declarations, 'header.logoBottom', data?.header?.logoBottom);
  addImageDeclaration(declarations, 'brand.logoUrl', data?.brand?.logoUrl);
  addImageDeclaration(declarations, 'logoUrl', data?.logoUrl);
  addImageDeclaration(declarations, 'hero.image', data?.hero?.image);
  addImageDeclaration(declarations, 'mainImage', data?.mainImage);

  if (Array.isArray(data?.productImages)) {
    data.productImages.forEach((image, index) => addImageDeclaration(declarations, `productImages[${index}]`, image));
  }

  if (Array.isArray(data?.sections)) {
    getNewsletterSectionEntries(data).forEach(({ section, sectionIndex, path: sectionPath }) => {
      if (section?.type === 'intro_statement') {
        addImageDeclaration(declarations, `${sectionPath}.image_src`, section.image_src);
        (Array.isArray(section.body_blocks) ? section.body_blocks : []).forEach((block, blockIndex) => {
          if (block?.type === 'image') addImageDeclaration(declarations, `${sectionPath}.body_blocks[${blockIndex}]`, block);
        });
      }
      if (Array.isArray(section?.articles)) {
        section.articles.forEach((article, articleIndex) => {
          if (!Array.isArray(article?.body_blocks)) return;
          article.body_blocks.forEach((block, blockIndex) => {
            if (block?.type === 'image') {
              addImageDeclaration(declarations, `sections[${sectionIndex}].articles[${articleIndex}].body_blocks[${blockIndex}]`, block);
            }
          });
        });
      }
      if (!Array.isArray(section?.items)) return;
      section.items.forEach((item, itemIndex) => {
        addImageDeclaration(declarations, `${sectionPath}.items[${itemIndex}].image`, item?.image);
        if (Array.isArray(item?.images)) {
          item.images.forEach((image, imageIndex) => {
            addImageDeclaration(declarations, `${sectionPath}.items[${itemIndex}].images[${imageIndex}]`, image);
          });
        }
        addImageDeclaration(declarations, `${sectionPath}.items[${itemIndex}].gif`, item?.gif);
      });
    });
  }

  return declarations;
}

export async function validateNewsletterImages(data, { checkImageUrl, logger = console } = {}) {
  if (typeof checkImageUrl !== 'function') throw new TypeError('validateNewsletterImages requires checkImageUrl');

  const declarations = collectNewsletterImageDeclarations(data);
  const errors = [];
  let validImages = 0;

  logger.log('🔍 Validating image URLs...');

  for (const declaration of declarations) {
    const imageUrl = resolveImageEntryUrl(declaration.value);
    if (!imageUrl) {
      errors.push(`❌ ${declaration.path}: ${JSON.stringify(declaration.value)} (URL missing)`);
      continue;
    }

    const result = await checkImageUrl(imageUrl);
    if (result?.valid) {
      validImages += 1;
    } else {
      errors.push(`❌ ${declaration.path}: ${imageUrl} (${formatImageResult(result)})`);
    }
  }

  if (errors.length > 0) {
    logger.log(`\n⚠️  Image Validation Results: ${validImages}/${declarations.length} images valid\n`);
    errors.forEach((error) => logger.log(error));
    logger.log('');
  } else if (declarations.length > 0) {
    logger.log(`✅ All ${declarations.length} images validated successfully`);
  }

  return {
    totalImages: declarations.length,
    validImages,
    errors,
  };
}
