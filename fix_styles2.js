const fs = require('fs');
let content = fs.readFileSync('src/components/OrderCard.tsx', 'utf8');

content = content.replace(/phoneRow: \{\n\s*addressStripText: \{/g,
  "phoneRow: {\n  },\n  addressStripText: {");

content = content.replace(/textDecorationLine: 'underline',\n\s*pendingTagText: \{/g,
  "textDecorationLine: 'underline',\n  },\n  pendingTagText: {");

content = content.replace(/marginTop: 8,\n\s*marginTop: 6,/g, "marginTop: 6,");

fs.writeFileSync('src/components/OrderCard.tsx', content, 'utf8');
