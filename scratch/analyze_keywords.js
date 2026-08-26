const fs = require('fs');
const content = fs.readFileSync('scratch/master_keywords.csv', 'utf8');

const lines = content.split('\n').map(l => l.trim());

const sections = [];
let currentSection = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue;
  
  const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
  const colA = parts[0];

  if (colA && colA !== 'KEYWORDS' && !colA.startsWith('http') && !colA.startsWith('=')) {
    if (currentSection) {
      sections.push(currentSection);
    }
    currentSection = {
      name: colA.toUpperCase(),
      startLine: i + 1,
      keywords: []
    };
    continue;
  }

  if (currentSection && parts.length >= 4) {
    const kw = parts[1];
    const googleVol = parseInt(parts[2], 10);
    const appleVol = parseInt(parts[3], 10);

    if (kw && kw !== 'KEYWORDS' && kw !== 'Keywords' && kw.length > 0) {
      currentSection.keywords.push({
        keyword: kw,
        googleVol: isNaN(googleVol) ? 0 : googleVol,
        appleVol: isNaN(appleVol) ? 0 : appleVol,
        notes: parts[4] || ''
      });
    }
  }
}

if (currentSection) {
  sections.push(currentSection);
}

console.log('Processed Sections Summary:');
sections.forEach(s => {
  console.log(`\n=== SECTION: ${s.name} (${s.keywords.length} keywords) ===`);
  const topApple = [...s.keywords].sort((a, b) => b.appleVol - a.appleVol).slice(0, 10);
  console.log('Top 10 Apple Vol:');
  topApple.forEach(k => console.log(`  - "${k.keyword}": Apple=${k.appleVol}, Google=${k.googleVol}`));
});

fs.writeFileSync('scratch/analyzed_sections.json', JSON.stringify(sections, null, 2));
