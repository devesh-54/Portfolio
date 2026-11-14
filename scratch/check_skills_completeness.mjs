import fs from 'fs';

const content = fs.readFileSync('src/config/skills.ts', 'utf8');
const skillMatches = content.match(/\{\s*id:\s*'[^']+',\s*name:\s*'[^']+'[^}]*\}/gs);
console.log('Total skills in groups:', skillMatches ? skillMatches.length : 0);
let missingIcon = 0;
for (const s of (skillMatches || [])) {
  const nameM = s.match(/name:\s*'([^']+)'/);
  const iconM = s.match(/icon:\s*([a-zA-Z0-9_]+)/);
  const name = nameM ? nameM[1] : 'unknown';
  const icon = iconM ? iconM[1] : 'NONE';
  if (icon === 'NONE') missingIcon++;
  console.log(`${name.padEnd(20)}: ${icon}`);
}
console.log('Missing icon count:', missingIcon);
