const fs = require('fs');

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

let content = fs.readFileSync('src/components/OrderCard.tsx', 'utf-8');

// replace the multi-line import block of lucide-react-native
content = content.replace(/import\s+\{[\s\S]*?\}\s+from\s+['"]lucide-react-native['"];?/, 
  "import { Ionicons, MaterialIcons } from '@expo/vector-icons';");

for (const [icon, target] of Object.entries(FIXES)) {
  const jsxRegex = new RegExp(`<${icon}(\\s|>)`, 'g');
  content = content.replace(jsxRegex, `<${target.comp} name="${target.name}"$1`);
  
  const jsxRegex2 = new RegExp(`<${icon}\\s*/>`, 'g');
  content = content.replace(jsxRegex2, `<${target.comp} name="${target.name}" />`);
}

fs.writeFileSync('src/components/OrderCard.tsx', content, 'utf-8');
