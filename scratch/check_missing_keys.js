const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');
const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en', 'translation.json'), 'utf8'));

const appDir = path.join(__dirname, '../app');
const componentsDir = path.join(__dirname, '../components');

function getNestedValue(obj, keyPath) {
  const parts = keyPath.split('.');
  let curr = obj;
  for (const p of parts) {
    if (!curr || typeof curr !== 'object') return undefined;
    curr = curr[p];
  }
  return curr;
}

function scanFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const regex = /t\(\s*['"]([^'"]+)['"](?:\s*,\s*(?:['"]([^'"]*)['"]|`([^`]*)`))?/g;
  let match;
  const calls = [];
  while ((match = regex.exec(src)) !== null) {
    calls.push({ key: match[1], fallback: match[2] || match[3] || '', file: path.relative(path.join(__dirname, '..'), filePath) });
  }
  return calls;
}

function scanDir(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(scanDir(fullPath));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

const allTsxFiles = [...scanDir(appDir), ...scanDir(componentsDir)];
let allTCalls = [];
for (const f of allTsxFiles) {
  allTCalls = allTCalls.concat(scanFile(f));
}

console.log('Total t() calls found:', allTCalls.length);

const missingInEn = [];
const seen = new Set();
for (const item of allTCalls) {
  if (seen.has(item.key)) continue;
  seen.add(item.key);
  const val = getNestedValue(en, item.key);
  if (val === undefined) {
    missingInEn.push(item);
  }
}

console.log('Unique missing in EN:', missingInEn.length);
console.log(JSON.stringify(missingInEn, null, 2));
