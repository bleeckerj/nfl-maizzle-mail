const fs = require('fs');
const path = require('path');

// Load newsletter data
let newsletterData = {};
const dataPath = path.join(__dirname, 'data/newsletter.json');
if (fs.existsSync(dataPath)) {
  newsletterData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

// Load color themes
let colorThemes = {};
const themesPath = path.join(__dirname, 'data/color-themes.json');
if (fs.existsSync(themesPath)) {
  colorThemes = JSON.parse(fs.readFileSync(themesPath, 'utf8'));
}

// Add theme colors to newsletter data based on selected theme
if (newsletterData.colorTheme && colorThemes.themes && colorThemes.themes[newsletterData.colorTheme]) {
  newsletterData.themeColors = {
    ...colorThemes.themes[newsletterData.colorTheme].colors,
    accent: colorThemes.themes[newsletterData.colorTheme].accent,
    linkAccent: colorThemes.themes[newsletterData.colorTheme].linkAccent
  };
  newsletterData.themeAccent = colorThemes.themes[newsletterData.colorTheme].accent;
} else {
  // Default to 'current' theme if no theme specified or theme not found
  const currentTheme = colorThemes.themes?.current || {};
  newsletterData.themeColors = {
    ...currentTheme.colors || {},
    accent: currentTheme.accent || '#5b9bc4',
    linkAccent: currentTheme.linkAccent || '#5b9bc4'
  };
  newsletterData.themeAccent = currentTheme.accent || '#5b9bc4';
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