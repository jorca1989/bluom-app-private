const fs = require('fs');
const content = fs.readFileSync('scratch/master_keywords.csv', 'utf8');

const lines = content.split('\n');
console.log('Total lines in CSV:', lines.length);

// Find headers or language section titles in column A
const sections = [];
lines.forEach((line, index) => {
  const parts = line.split(',');
  const colA = parts[0] ? parts[0].trim() : '';
  if (colA && colA.length > 0 && !colA.startsWith('http')) {
    sections.push({ line: index + 1, title: colA });
  }
});

console.log('Found sections in CSV:', sections);
