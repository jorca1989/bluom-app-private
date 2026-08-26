const fs = require('fs');
const sections = JSON.parse(fs.readFileSync('scratch/analyzed_sections.json', 'utf8'));

// Group sections into English-native vs Non-English
const englishSpeaking = ['USA', 'UK', 'CANADA', 'AUSTRALIA', 'NEW ZEALAND'];
const nonEnglish = sections.filter(s => !englishSpeaking.includes(s.name));

// Build a master keyword dictionary across all sections
const masterKwMap = {};

sections.forEach(sec => {
  sec.keywords.forEach(item => {
    const kw = item.keyword.toLowerCase().trim();
    if (!masterKwMap[kw]) {
      masterKwMap[kw] = {};
    }
    masterKwMap[kw][sec.name] = {
      appleVol: item.appleVol,
      googleVol: item.googleVol
    };
  });
});

// Identify high-volume English keywords found in US/UK/CA/AU/NZ that are also high volume in Non-English countries
const englishKws = Object.keys(masterKwMap).filter(kw => {
  return englishSpeaking.some(country => masterKwMap[kw][country] && masterKwMap[kw][country].appleVol > 100);
});

console.log(`Total Unique Keywords Analyzed: ${Object.keys(masterKwMap).length}`);
console.log(`High-Volume English Keywords Identified: ${englishKws.length}\n`);

// Cross-country comparison matrix for English keywords in Non-English markets
const matrix = [];

englishKws.forEach(kw => {
  const row = { keyword: kw };
  let maxAppleVol = 0;
  sections.forEach(sec => {
    const data = masterKwMap[kw][sec.name];
    row[sec.name] = data ? data.appleVol : 0;
    if (data && data.appleVol > maxAppleVol) maxAppleVol = data.appleVol;
  });
  row.maxAppleVol = maxAppleVol;
  matrix.push(row);
});

matrix.sort((a, b) => b.maxAppleVol - a.maxAppleVol);

console.log('Top High-Volume English Keywords across global markets:');
matrix.slice(0, 20).forEach(r => {
  console.log(`\nKeyword: "${r.keyword}" (Max Global Apple Vol: ${r.maxAppleVol})`);
  sections.forEach(s => {
    if (r[s.name] > 0) {
      console.log(`  - ${s.name}: ${r[s.name]}`);
    }
  });
});

fs.writeFileSync('scratch/matrix_analysis.json', JSON.stringify({ sections, matrix }, null, 2));
