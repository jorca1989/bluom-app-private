const fs = require('fs');
const html = fs.readFileSync('scratch/sheet_html.html', 'utf8');

// Find all occurrences of sheet names or tab items
const matches = html.match(/<li[^>]*id="sheet-button-[^"]*"[^>]*>[\s\S]*?<\/li>/gi) || [];
console.log('Matches count:', matches.length);
matches.forEach(m => console.log(m));

// Also check for any tab bar items
const tabItems = html.match(/item-name">([^<]+)</gi) || [];
console.log('Tab items count:', tabItems.length);
tabItems.forEach(t => console.log(t));
