import fs from 'fs';
import { projects } from '../src/config/projects.ts';

console.log('Total projects:', projects.length);
for (const p of projects) {
  console.log(`\nProject: ${p.id} (${p.title})`);
  console.log('  image:', p.image);
  console.log('  gallery:', p.gallery ? p.gallery.length : 0);
  if (p.gallery) {
    p.gallery.forEach((g, i) => console.log(`    [${i}]: ${g}`));
  }
}
