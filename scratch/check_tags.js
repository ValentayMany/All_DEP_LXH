const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'index.html');
const html = fs.readFileSync(filePath, 'utf8');

console.log('page-auth index:', html.indexOf('id="page-auth"'));
console.log('page-main index:', html.indexOf('id="page-main"'));

// Let's count opening and closing div tags between page-auth and page-main
const authPart = html.substring(html.indexOf('id="page-auth"'), html.indexOf('id="page-main"'));
let openDivs = 0;
let closeDivs = 0;
let pos = 0;
while (true) {
  const nextOpen = authPart.indexOf('<div', pos);
  const nextClose = authPart.indexOf('</div>', pos);
  if (nextOpen === -1 && nextClose === -1) break;
  if (nextOpen !== -1 && (nextClose === -1 || nextOpen < nextClose)) {
    openDivs++;
    pos = nextOpen + 4;
  } else {
    closeDivs++;
    pos = nextClose + 6;
  }
}
console.log('Open divs in page-auth block:', openDivs);
console.log('Close divs in page-auth block:', closeDivs);
console.log('Net open:', openDivs - closeDivs);
