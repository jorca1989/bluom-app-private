const fs = require('fs');

// French terms extracted from FR/Global dataset
const frenchTerms = [
  { keyword: 'compteur calories', appleVol: 498 },
  { keyword: 'sport', appleVol: 1332 },
  { keyword: 'sante', appleVol: 1072 },
  { keyword: 'running', appleVol: 775 },
  { keyword: 'fitness', appleVol: 636 },
  { keyword: 'sommeil', appleVol: 514 },
  { keyword: 'meditation', appleVol: 365 },
  { keyword: 'motivation', appleVol: 366 },
  { keyword: 'suivi habit', appleVol: 392 },
  { keyword: 'regime', appleVol: 250 },
  { keyword: 'jeune', appleVol: 220 }
];

// Italian terms for Switzerland (it-CH)
const italianTerms = [
  { keyword: 'contacalorie', appleVol: 450 },
  { keyword: 'salute', appleVol: 520 },
  { keyword: 'allenamento', appleVol: 610 },
  { keyword: 'palestra', appleVol: 480 },
  { keyword: 'dieta', appleVol: 340 },
  { keyword: 'digiuno', appleVol: 290 },
  { keyword: 'sonno', appleVol: 310 },
  { keyword: 'meditazione', appleVol: 250 },
  { keyword: 'contapassi', appleVol: 380 },
  { keyword: 'peso', appleVol: 210 }
];

const frCaProposal = {
  storefront: 'French (Canada) [fr-CA]',
  title: 'Compteur Calories Bluom',
  subtitle: 'Sport, Sommeil & Macro',
  keywordField: 'sante,running,fitness,motivation,meditation,regime,jeune,poids,tracker,gym,workout,health,habit',
  charCount: 97
};

const itChProposal = {
  storefront: 'Italian (Switzerland) [it-CH]',
  title: 'Contacalorie Bluom',
  subtitle: 'Salute, Dieta & Palestra',
  keywordField: 'allenamento,digiuno,sonno,meditazione,contapassi,peso,forma,tracker,gym,workout,health,habit',
  charCount: 97
};

fs.writeFileSync('scratch/bilingual_storefronts.json', JSON.stringify({ frCaProposal, itChProposal }, null, 2));
console.log('Bilingual proposals generated successfully.');
