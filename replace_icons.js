const fs = require('fs');
const path = require('path');

const MAPPING = {
  'Bell': { comp: 'Ionicons', name: 'notifications-outline' },
  'BellOff': { comp: 'Ionicons', name: 'notifications-off-outline' },
  'ShoppingBag': { comp: 'Ionicons', name: 'bag-outline' },
  'Utensils': { comp: 'MaterialIcons', name: 'restaurant' },
  'CheckCircle': { comp: 'Ionicons', name: 'checkmark-circle-outline' },
  'CheckCircle2': { comp: 'Ionicons', name: 'checkmark-circle' },
  'XCircle': { comp: 'Ionicons', name: 'close-circle-outline' },
  'VolumeX': { comp: 'Ionicons', name: 'volume-mute-outline' },
  'Volume2': { comp: 'Ionicons', name: 'volume-high-outline' },
  'X': { comp: 'Ionicons', name: 'close' },
  'Check': { comp: 'Ionicons', name: 'checkmark' },
  'Trash2': { comp: 'Ionicons', name: 'trash-outline' },
  'Plus': { comp: 'Ionicons', name: 'add' },
  'Printer': { comp: 'Ionicons', name: 'print-outline' },
  'Share2': { comp: 'Ionicons', name: 'share-social-outline' },
  'Users': { comp: 'Ionicons', name: 'people-outline' },
  'QrCode': { comp: 'MaterialIcons', name: 'qr-code' },
  'Maximize2': { comp: 'Ionicons', name: 'expand-outline' },
  'Search': { comp: 'Ionicons', name: 'search-outline' },
  'Settings': { comp: 'Ionicons', name: 'settings-outline' },
  'LogOut': { comp: 'Ionicons', name: 'log-out-outline' },
  'Store': { comp: 'MaterialIcons', name: 'store' },
  'Package': { comp: 'Ionicons', name: 'cube-outline' },
  'ClipboardList': { comp: 'MaterialIcons', name: 'assignment' },
  'MapPin': { comp: 'Ionicons', name: 'location-outline' },
  'Phone': { comp: 'Ionicons', name: 'call-outline' },
  'MessageSquare': { comp: 'Ionicons', name: 'chatbubble-outline' },
  'ChefHat': { comp: 'MaterialIcons', name: 'restaurant-menu' },
  'Clock': { comp: 'Ionicons', name: 'time-outline' },
  'AlertTriangle': { comp: 'Ionicons', name: 'warning-outline' },
  'CreditCard': { comp: 'Ionicons', name: 'card-outline' },
  'Table2': { comp: 'MaterialIcons', name: 'table-chart' },
  'Grid3x3': { comp: 'MaterialIcons', name: 'grid-on' },
  'RefreshCw': { comp: 'Ionicons', name: 'refresh-outline' },
  'Eye': { comp: 'Ionicons', name: 'eye-outline' },
  'EyeOff': { comp: 'Ionicons', name: 'eye-off-outline' },
  'User': { comp: 'Ionicons', name: 'person-outline' },
  'Lock': { comp: 'Ionicons', name: 'lock-closed-outline' },
  'ChevronRight': { comp: 'Ionicons', name: 'chevron-forward' },
  'ChevronDown': { comp: 'Ionicons', name: 'chevron-down' },
  'ChevronUp': { comp: 'Ionicons', name: 'chevron-up' },
  'Edit': { comp: 'Ionicons', name: 'pencil-outline' },
  'Edit2': { comp: 'Ionicons', name: 'pencil-outline' },
  'Edit3': { comp: 'Ionicons', name: 'pencil-outline' },
  'MoreVertical': { comp: 'Ionicons', name: 'ellipsis-vertical' },
  'Wifi': { comp: 'Ionicons', name: 'wifi-outline' },
  'WifiOff': { comp: 'Ionicons', name: 'wifi' },
  'ArrowLeft': { comp: 'Ionicons', name: 'arrow-back' },
  'Home': { comp: 'Ionicons', name: 'home-outline' },
  'Menu': { comp: 'Ionicons', name: 'menu-outline' },
  'Info': { comp: 'Ionicons', name: 'information-circle-outline' },
  'Star': { comp: 'Ionicons', name: 'star-outline' },
  'TrendingUp': { comp: 'Ionicons', name: 'trending-up' },
  'Zap': { comp: 'Ionicons', name: 'flash-outline' },
  'Power': { comp: 'Ionicons', name: 'power-outline' },
  'Activity': { comp: 'MaterialIcons', name: 'show-chart' },
  'ToggleLeft': { comp: 'MaterialIcons', name: 'toggle-off' },
  'ToggleRight': { comp: 'MaterialIcons', name: 'toggle-on' },
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find the import statement for lucide-react-native
  const importRegex = /import\s+{([^}]+)}\s+from\s+['"]lucide-react-native['"];?/g;
  let match;
  let hasChanges = false;
  
  while ((match = importRegex.exec(content)) !== null) {
    hasChanges = true;
    const importedIcons = match[1].split(',').map(s => s.trim()).filter(Boolean);
    
    // figure out which expo vector icons components are needed
    const neededComps = new Set();
    const replacements = [];
    
    importedIcons.forEach(icon => {
      if (MAPPING[icon]) {
        neededComps.add(MAPPING[icon].comp);
      } else {
        console.warn(`WARNING: Missing mapping for ${icon} in ${filePath}`);
      }
    });
    
    // Replace the import
    const newImports = [];
    if (neededComps.size > 0) {
      newImports.push(`import { ${Array.from(neededComps).join(', ')} } from '@expo/vector-icons';`);
    }
    
    // replace import statement
    content = content.replace(match[0], newImports.join('\n'));
    
    // Replace all usages in JSX
    importedIcons.forEach(icon => {
      if (MAPPING[icon]) {
        const { comp, name } = MAPPING[icon];
        
        // Match <IconName ... /> or <IconName>
        const jsxRegex = new RegExp(`<${icon}(\\s|>)`, 'g');
        content = content.replace(jsxRegex, `<${comp} name="${name}"$1`);
        
        // Also self-closing: <IconName/> -> <Comp name="name"/>
        const jsxRegex2 = new RegExp(`<${icon}\\s*/>`, 'g');
        content = content.replace(jsxRegex2, `<${comp} name="${name}" />`);
      }
    });
  }
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath);
    } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
      processFile(dirPath);
    }
  });
}

walkDir('./src');
