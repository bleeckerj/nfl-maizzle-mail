/**
 * Template Validator
 * 
 * Validates generated templates by:
 * 1. Checking file structure
 * 2. Validating template syntax
 * 3. Generating test content from sample-data.json
 * 4. Building the template
 * 5. Checking the output HTML for issues
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export class Validator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.templateDir = null;
    this.templateName = null;
  }

  async validate(templateDir, templateName) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    VALIDATION PIPELINE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    this.errors = [];
    this.warnings = [];
    this.templateDir = templateDir;
    this.templateName = templateName;

    // Phase 1: Static checks
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ Phase 1: Static Validation                                 │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    
    console.log('   📂 Checking file structure...');
    this.validateFileStructure();

    console.log('   🔍 Checking template syntax...');
    this.validateTemplateSyntax();

    console.log('   📋 Checking JSON files...');
    this.validateJSONFiles();

    console.log('   🔗 Checking variable bindings...');
    this.validateVariableBindings();
    
    console.log('');

    // Phase 2: Generate test content
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ Phase 2: Generate Test Content                             │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    
    const testContentPath = await this.generateTestContent();
    console.log('');

    // Phase 3: Build test
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ Phase 3: Build Test                                        │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    
    const buildResult = await this.attemptBuild(testContentPath);
    console.log('');

    // Phase 4: Output validation
    if (buildResult.success && buildResult.outputPath) {
      console.log('┌─────────────────────────────────────────────────────────────┐');
      console.log('│ Phase 4: Output Validation                                 │');
      console.log('└─────────────────────────────────────────────────────────────┘');
      
      this.validateOutputHTML(buildResult.outputPath);
      console.log('');
    }

    // Report results
    const passed = this.errors.length === 0;
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    VALIDATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    
    if (passed) {
      console.log('   ✅ Validation PASSED');
    } else {
      console.log('   ❌ Validation FAILED');
      console.log('');
      console.log('   Errors:');
      this.errors.forEach(err => console.log(`      ❌ ${err}`));
    }

    if (this.warnings.length > 0) {
      console.log('');
      console.log('   ⚠️  Warnings:');
      this.warnings.forEach(warn => console.log(`      ⚠️  ${warn}`));
    }

    console.log('');

    return {
      passed,
      errors: this.errors,
      warnings: this.warnings,
      buildResult
    };
  }

  validateFileStructure() {
    const requiredFiles = [
      'newsletter.html',
      'layouts/main.html',
      'sample-data.json'
    ];

    const requiredDirs = [
      'components',
      'layouts'
    ];

    requiredDirs.forEach(dir => {
      const fullPath = path.join(this.templateDir, dir);
      if (!fs.existsSync(fullPath)) {
        this.errors.push(`Missing directory: ${dir}`);
      }
    });

    requiredFiles.forEach(file => {
      const fullPath = path.join(this.templateDir, file);
      if (!fs.existsSync(fullPath)) {
        this.errors.push(`Missing file: ${file}`);
      }
    });

    // Check for at least one component
    const componentsDir = path.join(this.templateDir, 'components');
    if (fs.existsSync(componentsDir)) {
      const components = fs.readdirSync(componentsDir).filter(f => f.endsWith('.html'));
      if (components.length === 0) {
        this.warnings.push('No component files found in components/');
      } else {
        console.log(`      ✓ Found ${components.length} component(s)`);
      }
    }
  }

  validateTemplateSyntax() {
    const htmlFiles = this.findFiles(this.templateDir, '.html');
    let issueCount = 0;
    
    htmlFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.templateDir, file);
      
      // Check for unclosed Maizzle tags
      const eachOpens = (content.match(/<each\s/g) || []).length;
      const eachCloses = (content.match(/<\/each>/g) || []).length;
      if (eachOpens !== eachCloses) {
        this.errors.push(`${relativePath}: Unclosed <each> tag (${eachOpens} opens, ${eachCloses} closes)`);
        issueCount++;
      }

      const ifOpens = (content.match(/<if\s/g) || []).length;
      const ifCloses = (content.match(/<\/if>/g) || []).length;
      if (ifOpens !== ifCloses) {
        this.errors.push(`${relativePath}: Unclosed <if> tag (${ifOpens} opens, ${ifCloses} closes)`);
        issueCount++;
      }

      // Check for common template variable issues
      const unclosedVars = content.match(/\{\{[^}]*$/gm);
      if (unclosedVars) {
        this.errors.push(`${relativePath}: Unclosed template variable`);
        issueCount++;
      }

      // Check extends/block syntax
      if (content.includes('<extends') && !content.includes('<block name=')) {
        this.warnings.push(`${relativePath}: Uses <extends> but no <block> found`);
      }

      // Check for potentially escaped HTML variables that should be raw
      // Pattern: {{ variable }} for fields that commonly contain HTML
      // These field names almost always contain HTML and need triple braces
      const htmlFieldNames = [
        'description', 'content', 'html', 'body', 'text', 'excerpt', 
        'bio', 'blurb', 'summary', 'richText', 'htmlContent', 'markup',
        'paragraph', 'intro', 'outro', 'note', 'caption'
      ];
      const htmlFieldPattern = new RegExp(
        `\\{\\{\\s*[\\w.]*\\.(${htmlFieldNames.join('|')})\\s*\\}\\}`, 'gi'
      );
      const htmlContextVars = content.match(htmlFieldPattern);
      if (htmlContextVars) {
        htmlContextVars.forEach(match => {
          // Extract variable name
          const varMatch = match.match(/\{\{\s*([\w.]+)\s*\}\}/);
          if (varMatch) {
            this.warnings.push(`${relativePath}: Variable "${varMatch[1]}" may need triple braces {{{ }}} for raw HTML`);
          }
        });
      }

      // CRITICAL: Check for loops around component includes in newsletter.html
      // This pattern causes undefined variables because components don't inherit loop context
      if (relativePath === 'newsletter.html') {
        const loopAroundComponent = content.match(/<each[^>]*>\s*[\s\S]*?<component[^>]*>[\s\S]*?<\/each>/g);
        if (loopAroundComponent) {
          loopAroundComponent.forEach(match => {
            // Extract loop variable and component
            const loopVar = match.match(/<each[^>]*loop="(\w+)\s+in/);
            const componentMatch = match.match(/<component\s+src="[^"]*\/(\w+)\.html"/);
            if (loopVar && componentMatch) {
              this.errors.push(
                `${relativePath}: Loop "${loopVar[1]}" wraps component "${componentMatch[1]}" - ` +
                `components DON'T inherit loop variables! Move the loop INSIDE the component.`
              );
              issueCount++;
            }
          });
        }
      }
    });

    if (issueCount === 0) {
      console.log('      ✓ No syntax issues found');
    }
  }

  validateJSONFiles() {
    const jsonFiles = this.findFiles(this.templateDir, '.json');
    let validCount = 0;
    
    jsonFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        JSON.parse(content);
        validCount++;
      } catch (e) {
        this.errors.push(`${path.relative(this.templateDir, file)}: Invalid JSON - ${e.message}`);
      }
    });

    console.log(`      ✓ ${validCount} JSON file(s) valid`);
  }

  validateVariableBindings() {
    // Check that variables used in templates match sample-data.json structure
    const sampleDataPath = path.join(this.templateDir, 'sample-data.json');
    if (!fs.existsSync(sampleDataPath)) {
      this.warnings.push('Cannot validate variable bindings: sample-data.json not found');
      return;
    }

    let sampleData;
    try {
      sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
    } catch (e) {
      return; // Already caught by validateJSONFiles
    }

    // Build set of available paths in sample data
    const availablePaths = new Set();
    this.collectPaths(sampleData, '', availablePaths);

    // Scan templates for variable references
    const htmlFiles = this.findFiles(this.templateDir, '.html');
    const missingVars = new Set();

    htmlFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.templateDir, file);
      
      // Match both {{ var }} and {{{ var }}} patterns
      const varMatches = content.matchAll(/\{\{\{?\s*([\w.[\]]+)\s*\}?\}\}/g);
      
      for (const match of varMatches) {
        const varPath = match[1];
        
        // Skip loop variables and special syntax
        if (varPath.match(/^(loop|item|section)\b/) || 
            varPath.includes('[') || 
            varPath === 'content' ||
            varPath.startsWith('page.')) {
          continue;
        }
        
        // Check if path exists in sample data (handle nested paths)
        const basePath = varPath.split('.').slice(0, 2).join('.');
        if (!this.pathExists(sampleData, basePath) && !this.isLoopVariable(content, varPath)) {
          missingVars.add(varPath);
        }
      }
    });

    if (missingVars.size > 0) {
      this.warnings.push(`Some variables may not be in sample-data.json: ${[...missingVars].slice(0, 5).join(', ')}${missingVars.size > 5 ? '...' : ''}`);
    } else {
      console.log('      ✓ Variable bindings look consistent');
    }
  }

  collectPaths(obj, prefix, paths) {
    if (obj === null || typeof obj !== 'object') {
      paths.add(prefix);
      return;
    }

    if (Array.isArray(obj)) {
      paths.add(prefix);
      if (obj.length > 0) {
        this.collectPaths(obj[0], prefix + '[0]', paths);
      }
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const newPath = prefix ? `${prefix}.${key}` : key;
      paths.add(newPath);
      this.collectPaths(value, newPath, paths);
    }
  }

  pathExists(obj, path) {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || typeof current !== 'object') {
        return false;
      }
      if (!(part in current)) {
        return false;
      }
      current = current[part];
    }
    
    return true;
  }

  isLoopVariable(content, varPath) {
    // Check if this variable might be from a loop context
    const firstPart = varPath.split('.')[0];
    const loopPattern = new RegExp(`loop\\s*=\\s*["']${firstPart}\\s+in`, 'i');
    return loopPattern.test(content);
  }

  async generateTestContent() {
    const sampleDataPath = path.join(this.templateDir, 'sample-data.json');
    
    if (!fs.existsSync(sampleDataPath)) {
      this.warnings.push('No sample-data.json found, cannot generate test content');
      return null;
    }

    console.log('   📝 Generating test content from sample-data.json...');

    const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
    
    // Build frontmatter from sample data
    // Note: We don't set sectionStylesFile - build-newsletter auto-detects it from template name
    const frontmatter = {
      template: this.templateName,
      title: sampleData.title || 'Test Newsletter',
      preheader: sampleData.preheader || 'Test preview text'
    };

    // Add header if present
    if (sampleData.header) {
      frontmatter.header = this.cleanObjectForYaml(sampleData.header);
    }

    // Add sections if present
    if (sampleData.sections && Array.isArray(sampleData.sections)) {
      frontmatter.sections = sampleData.sections.map(section => 
        this.cleanObjectForYaml(section)
      );
    }

    // Add featured article / article for non-section-based templates
    if (sampleData.featuredArticle) {
      frontmatter.featuredArticle = this.cleanObjectForYaml(sampleData.featuredArticle);
    }
    if (sampleData.article) {
      frontmatter.article = this.cleanObjectForYaml(sampleData.article);
    }
    if (sampleData.intro) {
      frontmatter.intro = this.cleanObjectForYaml(sampleData.intro);
    }

    // Add footer if present
    if (sampleData.footer) {
      frontmatter.footer = this.cleanObjectForYaml(sampleData.footer);
    }

    // Add any other top-level objects that might be needed by templates
    // (e.g., hero, cta, sponsor, etc.)
    const knownKeys = ['title', 'preheader', 'template', 'header', 'sections', 'featuredArticle', 'article', 'intro', 'footer'];
    for (const [key, value] of Object.entries(sampleData)) {
      if (!knownKeys.includes(key) && typeof value === 'object' && value !== null) {
        frontmatter[key] = this.cleanObjectForYaml(value);
      }
    }

    const yamlContent = yaml.dump(frontmatter, {
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: false,
      noRefs: true
    });

    const testContent = `---\n${yamlContent}---\n\n<!-- Auto-generated test content -->\n`;
    
    // Write to content folder
    const testFilePath = path.resolve(`content/_validation-test-${this.templateName}.md`);
    fs.writeFileSync(testFilePath, testContent);
    
    console.log(`      ✓ Test content written to ${testFilePath}`);
    return testFilePath;
  }

  cleanObjectForYaml(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanObjectForYaml(item));
    }

    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip undefined/null
      if (value === undefined || value === null) {
        continue;
      }
      // Fix [object Object] strings
      if (typeof value === 'string' && value === '[object Object]') {
        continue;
      }
      cleaned[key] = this.cleanObjectForYaml(value);
    }
    return cleaned;
  }

  async attemptBuild(testContentPath) {
    if (!testContentPath) {
      console.log('   ⚠️  Skipping build test (no test content)');
      return { success: true, skipped: true };
    }

    console.log('   🔨 Running build-newsletter.mjs...');

    return new Promise((resolve) => {
      const buildScript = path.resolve('scripts/build-newsletter.mjs');
      
      if (!fs.existsSync(buildScript)) {
        this.warnings.push('Build script not found at scripts/build-newsletter.mjs');
        resolve({ success: true, skipped: true });
        return;
      }

      // Run build with --no-open flag
      const build = spawn('node', [
        buildScript,
        testContentPath,
        '--no-open'
      ], {
        cwd: process.cwd(),
        timeout: 60000,
        env: { ...process.env, FORCE_COLOR: '0' }
      });

      let stdout = '';
      let stderr = '';

      build.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      build.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      build.on('close', (code) => {
        if (code === 0) {
          // Extract output path from build output
          const outputMatch = stdout.match(/Output:\s+([\w/.-]+\.html)/);
          const outputPath = outputMatch 
            ? path.resolve('build_production', path.basename(testContentPath, '.md') + '.html')
            : null;

          console.log('      ✓ Build succeeded');
          resolve({ success: true, stdout, stderr, outputPath });
        } else {
          this.errors.push(`Build failed with exit code ${code}`);
          
          // Parse build errors from stdout (build-newsletter outputs to stdout)
          const combinedOutput = stdout + '\n' + stderr;
          
          // Look for ❌ error markers
          const errorMarkers = combinedOutput.match(/❌[^\n]+/g);
          if (errorMarkers) {
            errorMarkers.slice(0, 3).forEach(line => {
              this.errors.push(`Build: ${line.replace('❌', '').trim()}`);
            });
          }
          
          // Also look for standard error patterns
          const errorLines = combinedOutput.split('\n').filter(line => 
            (line.includes('Error:') || line.includes('TypeError') || line.includes('ENOENT')) &&
            !line.includes('❌')  // Don't duplicate
          );
          errorLines.slice(0, 2).forEach(line => {
            this.errors.push(`Build: ${line.trim().substring(0, 200)}`);
          });
          
          console.log('      ❌ Build failed');
          resolve({ success: false, stdout, stderr, code });
        }
      });

      build.on('error', (err) => {
        this.errors.push(`Build process error: ${err.message}`);
        resolve({ success: false, error: err.message });
      });
    });
  }

  validateOutputHTML(outputPath) {
    if (!fs.existsSync(outputPath)) {
      this.warnings.push(`Output file not found: ${outputPath}`);
      return;
    }

    console.log('   🔍 Checking generated HTML...');

    const html = fs.readFileSync(outputPath, 'utf8');
    let issueCount = 0;

    // Check for escaped HTML entities that shouldn't be there
    const escapedPatterns = [
      { pattern: /&lt;p&gt;/g, issue: 'Escaped <p> tags (may need triple braces)' },
      { pattern: /&lt;a\s/g, issue: 'Escaped <a> tags (may need triple braces)' },
      { pattern: /&lt;strong&gt;/g, issue: 'Escaped <strong> tags' },
      { pattern: /&lt;em&gt;/g, issue: 'Escaped <em> tags' },
      { pattern: /&lt;br\s*\/?&gt;/g, issue: 'Escaped <br> tags' },
      { pattern: /&amp;nbsp;/g, issue: 'Double-escaped &nbsp;' },
    ];

    escapedPatterns.forEach(({ pattern, issue }) => {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        this.warnings.push(`${issue}: found ${matches.length} occurrence(s)`);
        issueCount++;
      }
    });

    // Check for template variables that weren't replaced
    const unreplacedVars = html.match(/\{\{[^}]+\}\}/g);
    if (unreplacedVars && unreplacedVars.length > 0) {
      const unique = [...new Set(unreplacedVars)];
      this.errors.push(`Unreplaced template variables: ${unique.slice(0, 5).join(', ')}${unique.length > 5 ? '...' : ''}`);
      issueCount++;
    }

    // Check for [object Object] in output
    if (html.includes('[object Object]')) {
      const count = (html.match(/\[object Object\]/g) || []).length;
      this.errors.push(`[object Object] found ${count} time(s) in output (object not properly serialized)`);
      issueCount++;
    }

    // Check for undefined/null text
    if (html.match(/>\s*undefined\s*</g)) {
      this.errors.push('"undefined" text found in output');
      issueCount++;
    }
    if (html.match(/>\s*null\s*</g)) {
      this.errors.push('"null" text found in output');
      issueCount++;
    }

    // Check for escaped/raw HTML appearing as text (indicates {{ }} instead of {{{ }}})
    const escapedHtmlPatterns = [
      { pattern: /&lt;p\s+style=/gi, description: 'escaped <p style=...>' },
      { pattern: /&lt;div\s+style=/gi, description: 'escaped <div style=...>' },
      { pattern: /&lt;span\s+style=/gi, description: 'escaped <span style=...>' },
      { pattern: /&lt;a\s+href=/gi, description: 'escaped <a href=...>' },
      { pattern: /&lt;img\s+src=/gi, description: 'escaped <img src=...>' },
      { pattern: /&lt;br\s*\/?&gt;/gi, description: 'escaped <br>' },
      { pattern: /&lt;strong&gt;/gi, description: 'escaped <strong>' },
      { pattern: /&lt;em&gt;/gi, description: 'escaped <em>' },
      { pattern: /&lt;\/p&gt;/gi, description: 'escaped </p>' },
    ];

    const escapedHtmlFound = [];
    escapedHtmlPatterns.forEach(({ pattern, description }) => {
      const matches = html.match(pattern);
      if (matches) {
        escapedHtmlFound.push({ description, count: matches.length });
      }
    });

    if (escapedHtmlFound.length > 0) {
      const summary = escapedHtmlFound.map(e => `${e.description}: ${e.count}`).join(', ');
      this.errors.push(`Escaped HTML tags found in output (use triple braces {{{ }}} for HTML content): ${summary}`);
      issueCount++;
    }

    // Check for empty critical sections
    const emptyPatterns = [
      { pattern: /<title>\s*<\/title>/i, issue: 'Empty <title> tag' },
      { pattern: /<body[^>]*>\s*<\/body>/i, issue: 'Empty <body>' },
    ];

    emptyPatterns.forEach(({ pattern, issue }) => {
      if (pattern.test(html)) {
        this.errors.push(issue);
        issueCount++;
      }
    });

    // Check for broken image sources
    const brokenImagePatterns = [
      /src=["']undefined["']/gi,
      /src=["']null["']/gi,
      /src=["']\s*["']/gi,
    ];

    brokenImagePatterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches) {
        this.errors.push(`Broken image src found: ${matches[0]}`);
        issueCount++;
      }
    });

    // Check for broken links
    const brokenLinkPatterns = [
      /href=["']undefined["']/gi,
      /href=["']null["']/gi,
    ];

    brokenLinkPatterns.forEach(pattern => {
      if (pattern.test(html)) {
        this.warnings.push('Broken href (undefined/null) found');
        issueCount++;
      }
    });

    if (issueCount === 0) {
      console.log('      ✓ No HTML issues detected');
    } else {
      console.log(`      ⚠️  Found ${issueCount} potential issue(s)`);
    }

    // Basic structural checks
    if (!html.includes('<html')) {
      this.errors.push('Missing <html> tag');
    }
    if (!html.includes('<body')) {
      this.errors.push('Missing <body> tag');
    }

    // Report HTML size
    const sizeKB = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
    console.log(`      📊 Output size: ${sizeKB} KB`);
  }

  findFiles(dir, extension) {
    const files = [];
    
    const walk = (currentDir) => {
      if (!fs.existsSync(currentDir)) return;
      
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      entries.forEach(entry => {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            walk(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      });
    };

    walk(dir);
    return files;
  }

  // Cleanup test files
  async cleanup() {
    const cleaned = { content: 0, build: 0 };
    
    try {
      const contentDir = path.resolve('content');
      if (fs.existsSync(contentDir)) {
        const testFiles = fs.readdirSync(contentDir).filter(f => f.startsWith('_validation-test-'));
        testFiles.forEach(f => {
          fs.unlinkSync(path.join(contentDir, f));
          cleaned.content++;
        });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    
    try {
      const buildDir = path.resolve('build_production');
      if (fs.existsSync(buildDir)) {
        const buildFiles = fs.readdirSync(buildDir).filter(f => f.startsWith('_validation-test-'));
        buildFiles.forEach(f => {
          fs.unlinkSync(path.join(buildDir, f));
          cleaned.build++;
        });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    
    return cleaned;
  }

  // Generate a structured validation report
  generateReport() {
    return {
      template: this.templateName,
      templateDir: this.templateDir,
      timestamp: new Date().toISOString(),
      passed: this.errors.length === 0,
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length
      },
      errors: this.errors,
      warnings: this.warnings,
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Analyze errors and warnings to provide actionable fixes
    for (const warning of this.warnings) {
      if (warning.includes('triple braces')) {
        const match = warning.match(/Variable "([^"]+)"/);
        if (match) {
          recommendations.push({
            type: 'template_syntax',
            severity: 'medium',
            message: `Change {{ ${match[1]} }} to {{{ ${match[1]} }}} for raw HTML output`,
            file: warning.split(':')[0]
          });
        }
      }
      
      if (warning.includes('not be in sample-data.json')) {
        recommendations.push({
          type: 'data_binding',
          severity: 'low',
          message: 'Some template variables reference paths not in sample-data.json. Check if these come from loop contexts or need to be added to sample data.',
          variables: warning.split(': ')[1]
        });
      }
    }
    
    for (const error of this.errors) {
      if (error.includes('[object Object]')) {
        recommendations.push({
          type: 'serialization',
          severity: 'high',
          message: 'Object was not properly serialized. Check if an array/object is being rendered where a string was expected.',
          action: 'Review sample-data.json and template variable usage'
        });
      }
      
      if (error.includes('undefined')) {
        recommendations.push({
          type: 'missing_data',
          severity: 'high', 
          message: 'Template variable resolved to undefined. Check if the variable path matches sample-data.json structure.',
          action: 'Verify nested object paths in templates match data structure'
        });
      }
      
      if (error.includes('Unreplaced template variables')) {
        recommendations.push({
          type: 'template_rendering',
          severity: 'high',
          message: 'Some template variables were not replaced during build.',
          action: 'Check if variable names in templates match frontmatter/data keys'
        });
      }
    }
    
    return recommendations;
  }

  // Save validation report to file
  saveReport(outputPath) {
    const report = this.generateReport();
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`   📄 Validation report saved to ${outputPath}`);
    return report;
  }
}
