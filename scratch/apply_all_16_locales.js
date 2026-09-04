const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');
const all16 = JSON.parse(fs.readFileSync(path.join(__dirname, 'translations_all_16.json'), 'utf8'));

// Deep merge helper
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const langs = Object.keys(all16);
let updatedCount = 0;

for (const lang of langs) {
  const filePath = path.join(localesDir, lang, 'translation.json');
  if (!fs.existsSync(filePath)) {
    console.log(`Directory for ${lang} not found, skipping.`);
    continue;
  }

  const current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const patch = all16[lang];

  deepMerge(current, patch);

  // Also ensure missing general keys from previous steps are filled
  if (lang !== 'en') {
    // Fill any missing keys that exist in en with en fallbacks if not present
    const fillMissing = (curr, enRef) => {
      for (const k of Object.keys(enRef)) {
        if (curr[k] === undefined) {
          curr[k] = enRef[k];
        } else if (typeof enRef[k] === 'object' && enRef[k] !== null && !Array.isArray(enRef[k])) {
          if (typeof curr[k] === 'object' && curr[k] !== null && !Array.isArray(curr[k])) {
            fillMissing(curr[k], enRef[k]);
          }
        }
      }
    };
    fillMissing(current, all16.en);
  }

  fs.writeFileSync(filePath, JSON.stringify(current, null, 2) + '\n', 'utf8');
  console.log(`Successfully merged and saved ${lang}/translation.json`);
  updatedCount++;
}

console.log(`Finished updating ${updatedCount} locales!`);
