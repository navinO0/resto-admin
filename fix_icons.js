const fs = require('fs');

const FIXES = {
  'ShieldCheck': { comp: 'Ionicons', name: 'shield-checkmark-outline' },
  'AlertCircle': { comp: 'Ionicons', name: 'alert-circle-outline' },
  'Mail': { comp: 'Ionicons', name: 'mail-outline' },
  'LogIn': { comp: 'Ionicons', name: 'log-in-outline' },
  'Server': { comp: 'Ionicons', name: 'server-outline' },
  'UtensilsCrossed': { comp: 'MaterialIcons', name: 'restaurant' },
  'Globe': { comp: 'Ionicons', name: 'globe-outline' },
  'Smartphone': { comp: 'Ionicons', name: 'phone-portrait-outline' },
  'Save': { comp: 'Ionicons', name: 'save-outline' },
  'ChevronLeft': { comp: 'Ionicons', name: 'chevron-back' },
  'ChevronRight': { comp: 'Ionicons', name: 'chevron-forward' },
  'User': { comp: 'Ionicons', name: 'person-outline' },
  'Phone': { comp: 'Ionicons', name: 'call-outline' },
  'Hash': { comp: 'Ionicons', name: 'list-outline' },
  'MapPin': { comp: 'Ionicons', name: 'location-outline' },
};

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let hasChanges = false;
  
  for (const [icon, target] of Object.entries(FIXES)) {
    const jsxRegex = new RegExp(`<${icon}(\\s|>)`, 'g');
    if (content.match(jsxRegex)) {
      content = content.replace(jsxRegex, `<${target.comp} name="${target.name}"$1`);
      hasChanges = true;
    }
    const jsxRegex2 = new RegExp(`<${icon}\\s*/>`, 'g');
    if (content.match(jsxRegex2)) {
      content = content.replace(jsxRegex2, `<${target.comp} name="${target.name}" />`);
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed ${filePath}`);
  }
}

['src/screens/LoginScreen.tsx', 'src/screens/MenuScreen.tsx', 'src/screens/SettingsScreen.tsx', 'src/components/IncomingOrderModal.tsx', 'src/components/OrderCard.tsx'].forEach(f => fixFile(f));
