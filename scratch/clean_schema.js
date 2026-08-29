const fs = require('fs');

const path = 'convex/schema.ts';
let content = fs.readFileSync(path, 'utf8');

// Find the first index of "import { defineSchema"
const importIndex = content.indexOf('import { defineSchema');
if (importIndex > 0) {
  content = content.slice(importIndex);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Cleaned convex/schema.ts successfully.');
