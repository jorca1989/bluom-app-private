const fs = require('fs');
const html = fs.readFileSync('scratch/sheet_html.html', 'utf8');

// Search for tab names and IDs in Google Sheets HTML
const regex = /<li id="sheet-button-([^"]+)"[^>]*><a[^>]*>([^<]+)<\/a>/g;
let match;
const tabs = [];
while ((match = regex.exec(html)) !== null) {
  tabs.push({ gid: match[1], name: match[2].trim() });
}

console.log('Found tabs:', tabs);
fs.writeFileSync('scratch/tabs.json', JSON.stringify(tabs, null, 2));
