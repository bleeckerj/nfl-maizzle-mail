const fs = require('fs');
const path = require('path');

// Load newsletter data
let newsletterData = {};
const dataPath = path.join(__dirname, 'data/newsletter.json');
if (fs.existsSync(dataPath)) {
  newsletterData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

const templateName = newsletterData.template || 'wirecutter';

module.exports = {
  build: {
    templates: {
      source: `templates/${templateName}`,
      destination: {
        path: 'build_production',
      },
    },
    components: {
      source: `templates/${templateName}/components`,
    },
  },
  inlineCSS: true,
  removeUnusedCSS: {
    enabled: true,
    whitelist: ['.mob-text'],
  },
  prettify: true,
  minify: {
    removeUnusedCSS: false,
  },
  // Make newsletter data available to all templates
  locals: newsletterData,
}
