const fs = require('fs');
const path = require('path');

// Load newsletter data
let newsletterData = {};
const dataPath = path.join(__dirname, 'data/newsletter.json');
if (fs.existsSync(dataPath)) {
  newsletterData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

// Determine template to use
const templateName = newsletterData.template || 'wirecutter';
const templatePath = path.join(__dirname, 'templates', templateName);

// Check if template exists, fallback to legacy src structure
const useTemplateStructure = fs.existsSync(templatePath);

module.exports = {
  build: {
    templates: {
      source: useTemplateStructure ? `templates/${templateName}` : 'src/templates',
      destination: {
        path: 'build_production',
      },
    },
    components: {
      source: useTemplateStructure ? `templates/${templateName}/components` : 'src/components',
    },
  },
  inlineCSS: true,
  removeUnusedCSS: true,
  prettify: true,
  minify: {
    removeUnusedCSS: false,
  },
  // Make newsletter data available to all templates
  locals: newsletterData,
}