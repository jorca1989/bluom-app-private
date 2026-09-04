const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');

// Helper to deep merge objects
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      if (!target[key]) Object.assign(target, { [key]: {} });
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const allData = require('./translations_data.js');

const langs = ['en', 'pt', 'es', 'de', 'fr', 'nl', 'pl', 'da', 'no', 'sv', 'tr', 'it', 'bg', 'el', 'lt', 'lv', 'ro'];

for (const lang of langs) {
  const filePath = path.join(localesDir, lang, 'translation.json');
  if (!fs.existsSync(filePath)) continue;

  const current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const patch = allData[lang] || allData.en;

  deepMerge(current, patch);

  fs.writeFileSync(filePath, JSON.stringify(current, null, 2) + '\n', 'utf8');
  console.log(`Updated ${lang} (${filePath})`);
}
console.log('All locales populated successfully!');
