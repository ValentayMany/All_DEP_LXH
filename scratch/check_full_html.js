const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'index.html');
const html = fs.readFileSync(filePath, 'utf8');

// Parse HTML tags and check matching for <div> and other block elements
let pos = 0;
const stack = [];
const errors = [];

const regex = /<\/?([a-zA-Z0-9:-]+)([^>]*)\/?>/g;
let match;
while ((match = regex.exec(html)) !== null) {
  const fullTag = match[0];
  const tagName = match[1].toLowerCase();
  const isClose = fullTag.startsWith('</');
  const isSelfClosing = fullTag.endsWith('/>') || ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(tagName);

  if (isSelfClosing) {
    continue;
  }

  if (isClose) {
    if (stack.length === 0) {
      errors.push(`Extra closing tag: ${fullTag} at index ${match.index}`);
    } else {
      const openTagName = stack.pop();
      if (openTagName !== tagName) {
        errors.push(`Mismatched tags: opened <${openTagName}>, but closed with ${fullTag} at index ${match.index}`);
      }
    }
  } else {
    stack.push(tagName);
  }
}

while (stack.length > 0) {
  errors.push(`Unclosed tag: <${stack.pop()}>`);
}

console.log('Errors found:', errors.length);
if (errors.length > 0) {
  console.log(errors.slice(0, 10).join('\n'));
} else {
  console.log('All tags are perfectly balanced!');
}
