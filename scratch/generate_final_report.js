const fs = require('fs');
const { sections, matrix } = JSON.parse(fs.readFileSync('scratch/matrix_analysis.json', 'utf8'));

// Build detailed per-country audit
const report = {};

sections.forEach(sec => {
  const kwList = sec.keywords;
  const totalKws = kwList.length;
  
  // Sort by Apple volume
  const sorted = [...kwList].sort((a, b) => b.appleVol - a.appleVol);
  
  // Identify English vs Localized keywords
  const englishKwsInSec = sorted.filter(k => {
    const kw = k.keyword.toLowerCase();
    return matrix.some(m => m.keyword.toLowerCase() === kw);
  });

  const highVolEnglish = englishKwsInSec.filter(k => k.appleVol > 20);

  // Identify high-volume English keywords missing in this country
  const countryKwSet = new Set(kwList.map(k => k.keyword.toLowerCase().trim()));
  const topGlobalEnglish = matrix.filter(m => m.maxAppleVol > 500);
  
  const missingGlobalEnglish = topGlobalEnglish.filter(m => !countryKwSet.has(m.keyword.toLowerCase()));

  report[sec.name] = {
    totalKeywords: totalKws,
    topKeywords: sorted.slice(0, 8),
    highVolEnglishInCountry: highVolEnglish.slice(0, 10),
    missingHighVolGlobalEnglish: missingGlobalEnglish.slice(0, 10).map(m => ({
      keyword: m.keyword,
      globalMaxAppleVol: m.maxAppleVol
    }))
  };
});

fs.writeFileSync('scratch/country_audit_report.json', JSON.stringify(report, null, 2));

console.log('Report generated successfully for all 16 countries.');
