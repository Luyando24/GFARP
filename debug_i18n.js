
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/lib/i18n.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Quick and dirty parser to extract the en object
// This is fragile but might work if the formatting is consistent
const enStart = content.indexOf('en: {');
const enEnd = content.indexOf('  },', enStart); // This is risky, relying on indentation

console.log('enStart:', enStart);
console.log('enEnd:', enEnd);

if (enStart !== -1 && enEnd !== -1) {
  const enBlock = content.substring(enStart, enEnd + 4);
  // console.log('En Block:', enBlock);
  
  // check for landing.pitfalls.title
  const matches = enBlock.match(/'landing\.pitfalls\.title':\s*'([^']+)'/g);
  console.log('Matches in EN block:', matches);
}
