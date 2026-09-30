const fs = require('fs');
let code = fs.readFileSync('src/components/OrderCard.tsx', 'utf8');

// Find all properties in StyleSheet that are not closed before the next property
// A property looks like `  camelCaseName: {`
// If the previous block doesn't end with `},` or `}`, it's unclosed.
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/^  [a-zA-Z0-9_]+: \{/)) {
    // This is a start of a style block.
    // Check the previous line.
    if (i > 0 && lines[i-1].trim() !== '' && !lines[i-1].match(/\},?$/) && !lines[i-1].match(/StyleSheet\.create\(\{/)) {
      lines[i-1] = lines[i-1] + '\n  },';
    }
  }
}
fs.writeFileSync('src/components/OrderCard.tsx', lines.join('\n'), 'utf8');
