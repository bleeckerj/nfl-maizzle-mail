#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const buildDir = path.join(process.cwd(), 'build_production');

if (!fs.existsSync(buildDir)) {
  console.error(`Build directory not found: ${buildDir}`);
  process.exit(1);
}

const files = fs.readdirSync(buildDir)
  .filter(f => f.endsWith('.html'))
  .map(f => ({
    name: f,
    mtime: fs.statSync(path.join(buildDir, f)).mtime.getTime()
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (files.length === 0) {
  console.error('No HTML files found in build_production/');
  process.exit(1);
}

const latest = path.join(buildDir, files[0].name);
console.log(`Opening latest build: ${latest}`);

try {
  // macOS open; fall back to start (windows) or xdg-open (linux)
  if (process.platform === 'darwin') {
    execSync(`open "${latest}"`);
  } else if (process.platform === 'win32') {
    execSync(`start "" "${latest}"`);
  } else {
    execSync(`xdg-open "${latest}"`);
  }
  console.log('✅ Opened in default browser');
} catch (err) {
  console.error('Failed to open browser:', err.message);
  process.exit(1);
}
