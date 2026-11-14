import { execSync } from 'child_process';

function grep(pat) {
  try {
    return execSync(`git grep -in "${pat}"`, { encoding: 'utf8' }).trim();
  } catch (e) {
    return '(none)';
  }
}

console.log('=== PS1 REFERENCES ===');
console.log(grep('ps1'));

console.log('\n=== SIGNPOST REFERENCES ===');
console.log(grep('signpost'));

console.log('\n=== GRAVESTONE REFERENCES ===');
console.log(grep('gravestone'));

console.log('\n=== RACKSERVER REFERENCES ===');
console.log(grep('rackserver'));

console.log('\n=== CAR REFERENCES ===');
console.log(grep('car.glb'));
console.log(grep('Car.jsx'));

console.log('\n=== OVERLAY REFERENCES ===');
console.log(grep('ProjectsOverlay'));
console.log(grep('Overlay.tsx'));

console.log('\n=== FADE TRANSITION HELPER ===');
console.log(grep('fadeTransition'));
console.log(grep('fade-transition'));

console.log('\n=== GIT BRANCHES ===');
try {
  console.log(execSync('git branch -a', { encoding: 'utf8' }).trim());
} catch(e) {
  console.log(e.message);
}
