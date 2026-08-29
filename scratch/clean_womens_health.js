const fs = require('fs');

const filePath = 'app/womens-health.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace pregnancy timeline fallbacks
content = content.replace(
  /\{t\('womensHealth\.pregnancyTimeline',[^)]+\)\}/g,
  "{t('womensHealth.pregnancyTimeline','Pregnancy Timeline')}"
);

content = content.replace(
  /\{tri === 1 \? t\('womensHealth\.tri1',[^)]+\)\s*:\s*tri === 2 \? t\('womensHealth\.tri2',[^)]+\)\s*:\s*t\('womensHealth\.tri3',[^)]+\)\}/g,
  `{tri === 1 ? t('womensHealth.tri1','Weeks 1–13 · Organ formation, nausea, fatigue') : tri === 2 ? t('womensHealth.tri2','Weeks 14–27 · Energy returns, baby moves, anomaly scan') : t('womensHealth.tri3','Weeks 28–40 · Growth, preparation, birth planning')}`
);

content = content.replace(
  /\{t\('womensHealth\.youAreHere',[^)]+\)\}/g,
  "{t('womensHealth.youAreHere','(You are here)')}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('womens-health.tsx updated cleanly.');
