const fs = require('fs');

let content = fs.readFileSync('src/components/OrderCard.tsx', 'utf8');

// 1. Imports
content = content.replace(/import\s+\{[\s\S]*?\}\s+from\s+['"]lucide-react-native['"];?/, 
  "import { Ionicons, MaterialIcons } from '@expo/vector-icons';");

// 2. Icon components
const FIXES = {
  'Phone': { comp: 'Ionicons', name: 'call-outline' },
  'ChevronDown': { comp: 'Ionicons', name: 'chevron-down' },
  'ChevronUp': { comp: 'Ionicons', name: 'chevron-up' },
  'ShoppingBag': { comp: 'Ionicons', name: 'bag-outline' },
  'Check': { comp: 'Ionicons', name: 'checkmark' },
  'Printer': { comp: 'Ionicons', name: 'print-outline' },
  'CheckCircle2': { comp: 'Ionicons', name: 'checkmark-circle' },
  'MapPin': { comp: 'Ionicons', name: 'location-outline' },
  'Bell': { comp: 'Ionicons', name: 'notifications-outline' },
  'LogOut': { comp: 'Ionicons', name: 'log-out-outline' },
  'Utensils': { comp: 'MaterialIcons', name: 'restaurant' },
  'User': { comp: 'Ionicons', name: 'person-outline' },
  'Hash': { comp: 'Ionicons', name: 'list-outline' },
  'XCircle': { comp: 'Ionicons', name: 'close-circle-outline' },
};

for (const [icon, target] of Object.entries(FIXES)) {
  const jsxRegex = new RegExp(`<${icon}(\\s|>)`, 'g');
  content = content.replace(jsxRegex, `<${target.comp} name="${target.name}"$1`);
  
  const jsxRegex2 = new RegExp(`<${icon}\\s*/>`, 'g');
  content = content.replace(jsxRegex2, `<${target.comp} name="${target.name}" />`);
}

// 3. Fix StyleSheet syntax errors
content = content.replace(/pendingAlertBox: \{\n\s*backgroundColor: '#FFFBEB',\n\s*padding: 12,\n\s*customerStrip: \{/g,
  "pendingAlertBox: {\n    backgroundColor: '#FFFBEB',\n    padding: 12,\n  },\n  customerStrip: {");

content = content.replace(/pendingHeader: \{\n\s*customerStripTop: \{/g, 
  "pendingHeader: {\n  },\n  customerStripTop: {");

content = content.replace(/pendingTag: \{\n\s*customerNameGroup: \{/g,
  "pendingTag: {\n  },\n  customerNameGroup: {");

content = content.replace(/pendingTagText: \{\n\s*customerNameText: \{/g,
  "pendingTagText: {\n  },\n  customerNameText: {");

// 4. Duplicate properties
content = content.replace(/color: '#B45309',\n\s*color: '#4338CA',/g, "color: '#4338CA',");
content = content.replace(/borderBottomColor: '#FEF3C7',\n\s*borderBottomColor: '#F1F5F9',/g, "borderBottomColor: '#F1F5F9',");

// Let's count open vs close brackets
let open = 0;
for(let i=0; i<content.length; i++) {
  if(content[i] === '{') open++;
  else if(content[i] === '}') open--;
}
console.log("After basic fix, open count:", open);

// If still missing 2, we just append two } to the end of the file. Actually, they are from other duplicate blocks.
fs.writeFileSync('src/components/OrderCard.tsx', content, 'utf8');
