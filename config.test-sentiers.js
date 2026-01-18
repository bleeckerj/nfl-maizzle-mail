const fs = require('fs');
const path = require('path');

// Load sample data for sentiers-claude-test
const sampleDataPath = path.join(__dirname, 'templates/sentiers-claude-test/sample-data.json');
let sampleData = {};
if (fs.existsSync(sampleDataPath)) {
  sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
}

module.exports = {
  build: {
    templates: {
      source: 'templates/sentiers-claude-test',
      destination: {
        path: 'build_test',
      },
    },
    components: {
      root: './',
    },
  },
  inlineCSS: true,
  removeUnusedCSS: false,
  prettify: true,
  locals: sampleData,
}
