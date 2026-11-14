import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/lighthouse_report.json', 'utf8'));
const cats = data.categories;
console.log('=== LIGHTHOUSE SCORES ===');
for (const [k, v] of Object.entries(cats)) {
  console.log(`${v.title.padEnd(20)}: ${Math.round(v.score * 100)} / 100`);
}
console.log('\nKey Performance Metrics:');
const audits = data.audits;
['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'].forEach(m => {
  if (audits[m]) console.log(`  ${audits[m].title}: ${audits[m].displayValue}`);
});

console.log('\nKey Audit Warnings:');
['document-title', 'meta-description', 'image-alt', 'viewport', 'robots-txt'].forEach(m => {
  if (audits[m]) console.log(`  ${audits[m].title}: ${audits[m].score === 1 ? 'PASS' : 'FAIL'}`);
});

