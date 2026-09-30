const fs = require('fs');

let iom = fs.readFileSync('src/components/IncomingOrderModal.tsx', 'utf8');

// The git conflict pasted things twice. Let's just run an object deduplicator over the file?
// Actually, since I know the specific lines from the tsc output, I can just clean them up.

// Let's use a regex to find properties defined twice in the same block and remove the first one.
const lines = iom.split('\n');

let currentBlock = null;
let currentProps = new Set();
let propsList = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const matchBlock = line.match(/^  ([A-Za-z0-9_]+): \{/);
  if (matchBlock) {
    currentBlock = matchBlock[1];
    currentProps.clear();
    propsList = [];
    continue;
  }
  
  if (currentBlock) {
    if (line.match(/^  \},?/)) {
      currentBlock = null;
      continue;
    }
    
    const propMatch = line.match(/^\s+([A-Za-z0-9_-]+)\s*:/);
    if (propMatch) {
      const propName = propMatch[1];
      propsList.push({ propName, lineIndex: i, text: line });
    }
  }
}

// Second pass: we just look for identical propNames in the same block and delete the first occurrence
// We will do it by reconstructing the file
for (let i = 0; i < lines.length; i++) {
  // reset state
}

// Simpler: Just run an AST-based or simplistic regex fix for the known ones:
iom = iom.replace(/borderRadius: 7,\n\s*padding: 12,\n\s*marginBottom: 14,\n\s*borderRadius: 7,\n\s*padding: 10,\n\s*marginBottom: 12,/g, 
  "borderRadius: 7,\n    padding: 10,\n    marginBottom: 12,");

iom = iom.replace(/paddingVertical: 14,\n\s*borderRadius: 7,\n\s*paddingVertical: 12,\n\s*borderRadius: 7,/g,
  "paddingVertical: 12,\n    borderRadius: 7,");

iom = iom.replace(/paddingVertical: 12,\n\s*borderRadius: 7,\n\s*gap: 6,\n\s*paddingVertical: 10,\n\s*borderRadius: 7,/g,
  "paddingVertical: 10,\n    borderRadius: 7,\n    gap: 6,");

iom = iom.replace(/shadowRadius: 6,\n\s*elevation: 3,/g, "shadowRadius: 6,\n    elevation: 3,");
// wait let's just do a naive deduplication of lines within a block!

fs.writeFileSync('src/components/IncomingOrderModal.tsx', iom, 'utf8');

