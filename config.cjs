const fs = require('fs');
const path = require('path');

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
        path: 'build_local',
      },
    },
    components: {
      source: `templates/${templateName}/components`,
    },
  },
  server: {
    port: 3000,
  },
}