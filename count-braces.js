const fs = require('fs');
const content = fs.readFileSync(process.argv[2], 'utf8');

let braces = 0;
let parens = 0;
let inString = false;
let stringChar = '';

for(let i = 0; i < content.length; i++) {
  const c = content[i];
  const prev = content[i-1];
  
  if(!inString && (c === '"' || c === "'" || c === '`')) {
    inString = true;
    stringChar = c;
  } else if(inString && c === stringChar && prev !== '\\') {
    inString = false;
  } else if(!inString) {
    if(c === '{') braces++;
    else if(c === '}') braces--;
    else if(c === '(') parens++;
    else if(c === ')') parens--;
  }
}

console.log('Braces:', braces, 'Parens:', parens);
