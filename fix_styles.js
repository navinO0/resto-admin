const fs = require('fs');

let content = fs.readFileSync('src/components/OrderCard.tsx', 'utf8');

content = content.replace(/pendingAlertBox: \{\n\s*backgroundColor: '#FFFBEB',\n\s*padding: 12,\n\s*customerStrip: \{/g,
  "pendingAlertBox: {\n    backgroundColor: '#FFFBEB',\n    padding: 12,\n    borderBottomWidth: 1,\n    borderBottomColor: '#FEF3C7',\n  },\n  customerStrip: {");

content = content.replace(/borderBottomColor: '#FEF3C7',\n\s*borderBottomColor: '#F1F5F9',/g, "borderBottomColor: '#F1F5F9',");

content = content.replace(/pendingHeader: \{\n\s*customerStripTop: \{/g, 
  "pendingHeader: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    justifyContent: 'space-between',\n    marginBottom: 6,\n  },\n  customerStripTop: {");

content = content.replace(/pendingTag: \{\n\s*customerNameGroup: \{/g,
  "pendingTag: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    gap: 6,\n  },\n  customerNameGroup: {");

content = content.replace(/pendingTagText: \{\n\s*customerNameText: \{/g,
  "pendingTagText: {\n    fontSize: 12,\n    fontWeight: '700',\n    color: '#D97706',\n  },\n  customerNameText: {");

content = content.replace(/color: '#B45309',\n\s*color: '#4338CA',/g, "color: '#4338CA',");

fs.writeFileSync('src/components/OrderCard.tsx', content, 'utf8');
