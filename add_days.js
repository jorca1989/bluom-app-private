
const fs = require('fs');
const path = 'c:/Users/jwfca/Desktop/BluomAppNew/locales/pt/translation.json';
const content = fs.readFileSync(path, 'utf8');
const data = JSON.parse(content);

data.common.days = {
  "sun": "D",
  "mon": "S",
  "tue": "T",
  "wed": "Q",
  "thu": "Q",
  "fri": "S",
  "sat": "S"
};

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log('Success');
