const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

app = app.replace(/import \{.*?\}\s*from\s+['"]lucide-react-native['"];?/m, "import { Ionicons, MaterialIcons } from '@expo/vector-icons';");

const FIXES = {
  'ListOrdered': { comp: 'Ionicons', name: 'list-outline' },
  'Utensils': { comp: 'MaterialIcons', name: 'restaurant' },
  'Settings': { comp: 'Ionicons', name: 'settings-outline' },
  'Grid3x3': { comp: 'MaterialIcons', name: 'grid-on' },
  'RefreshCw': { comp: 'Ionicons', name: 'refresh-outline' },
  'ChefHat': { comp: 'MaterialIcons', name: 'restaurant-menu' },
  'WifiOff': { comp: 'Ionicons', name: 'wifi' }
};

for (const [icon, target] of Object.entries(FIXES)) {
  app = app.replace(new RegExp(`<${icon}(\\s|>)`, 'g'), `<${target.comp} name="${target.name}"$1`);
  app = app.replace(new RegExp(`<${icon}\\s*/>`, 'g'), `<${target.comp} name="${target.name}" />`);
}

fs.writeFileSync('App.tsx', app, 'utf8');
