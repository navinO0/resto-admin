const fs = require('fs');

function fixIncomingOrderModal() {
  let iom = fs.readFileSync('src/components/IncomingOrderModal.tsx', 'utf8');
  iom = iom.replace(/import \{ View, Text, StyleSheet, Modal, TouchableOpacity, Animated, ScrollView \} from 'react-native';\n/, "");
  iom = iom.replace(/import\s+\{[^{}]+\}\s*from\s+['"]lucide-react-native['"];?/m, "import { Ionicons, MaterialIcons } from '@expo/vector-icons';");
  iom = iom.replace(/isTakeaway\n\s*\?\s*'INCOMING TAKEAWAY ORDER'\n\s*\?\s*'INCOMING TAKEAWAY \/ ONLINE ORDER'\n\s*:\s*'NEW DINE-IN ORDER'/, "isTakeaway ? 'INCOMING TAKEAWAY / ONLINE ORDER' : 'NEW DINE-IN ORDER'");
  iom = iom.replace(/<Text style=\{styles\.title\}>\{customerName\}<\/Text>\n\s*<Text style=\{styles\.title\} numberOfLines=\{1\}>\{customerName\}<\/Text>/, "<Text style={styles.title} numberOfLines={1}>{customerName}</Text>");
  
  iom = iom.replace(
  /<TouchableOpacity style=\{styles\.silenceButton\} onPress=\{dismissIncomingAlert\} activeOpacity=\{0\.85\}>\n\s*<VolumeX size=\{18\} color="#475569" \/>\n\s*<Text style=\{styles\.silenceText\}>Silence<\/Text>\n\s*<TouchableOpacity style=\{styles\.silenceButton\} onPress=\{silenceAlarmOnly\} activeOpacity=\{0\.85\}>/g,
  `<TouchableOpacity style={styles.silenceButton} onPress={dismissIncomingAlert} activeOpacity={0.85}>
                <Ionicons name="volume-mute-outline" size={18} color="#475569" />
                <Text style={styles.silenceText}>Silence</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.silenceButton} onPress={silenceAlarmOnly} activeOpacity={0.85}>`
  );
  iom = applyMappings(iom);
  fs.writeFileSync('src/components/IncomingOrderModal.tsx', iom, 'utf8');
}

function fixOrderCard() {
  let oc = fs.readFileSync('src/components/OrderCard.tsx', 'utf8');
  oc = oc.replace(/import\s+\{[^{}]+\}\s*from\s+['"]lucide-react-native['"];?/m, "import { Ionicons, MaterialIcons } from '@expo/vector-icons';");
  
  oc = oc.replace(/pendingAlertBox: \{\n\s*backgroundColor: '#FFFBEB',\n\s*padding: 12,\n\s*customerStrip: \{/g,
    "pendingAlertBox: {\n    backgroundColor: '#FFFBEB',\n    padding: 12,\n  },\n  customerStrip: {");
  oc = oc.replace(/pendingHeader: \{\n\s*customerStripTop: \{/g, "pendingHeader: {\n  },\n  customerStripTop: {");
  oc = oc.replace(/pendingTag: \{\n\s*customerNameGroup: \{/g, "pendingTag: {\n  },\n  customerNameGroup: {");
  oc = oc.replace(/pendingTagText: \{\n\s*customerNameText: \{/g, "pendingTagText: {\n  },\n  customerNameText: {");
  oc = oc.replace(/phoneRow: \{\n\s*addressStripText: \{/g, "phoneRow: {\n  },\n  addressStripText: {");
  oc = oc.replace(/textDecorationLine: 'underline',\n\s*pendingTagText: \{/g, "textDecorationLine: 'underline',\n  },\n  pendingTagText: {");
  
  oc = oc.replace(/color: '#B45309',\n\s*color: '#4338CA',/g, "color: '#4338CA',");
  oc = oc.replace(/borderBottomColor: '#FEF3C7',\n\s*borderBottomColor: '#F1F5F9',/g, "borderBottomColor: '#F1F5F9',");
  oc = oc.replace(/marginTop: 8,\n\s*marginTop: 6,/g, "marginTop: 6,");
  
  oc = applyMappings(oc);
  fs.writeFileSync('src/components/OrderCard.tsx', oc, 'utf8');
}

function applyMappings(content) {
  const FIXES = {
    'Bell': { comp: 'Ionicons', name: 'notifications-outline' },
    'ShoppingBag': { comp: 'Ionicons', name: 'bag-outline' },
    'CheckCircle': { comp: 'Ionicons', name: 'checkmark-circle-outline' },
    'XCircle': { comp: 'Ionicons', name: 'close-circle-outline' },
    'VolumeX': { comp: 'Ionicons', name: 'volume-mute-outline' },
    'ChevronLeft': { comp: 'Ionicons', name: 'chevron-back' },
    'ChevronRight': { comp: 'Ionicons', name: 'chevron-forward' },
    'Phone': { comp: 'Ionicons', name: 'call-outline' },
    'MapPin': { comp: 'Ionicons', name: 'location-outline' },
    'User': { comp: 'Ionicons', name: 'person-outline' },
    'Hash': { comp: 'Ionicons', name: 'list-outline' },
    'ChevronDown': { comp: 'Ionicons', name: 'chevron-down' },
    'ChevronUp': { comp: 'Ionicons', name: 'chevron-up' },
    'Check': { comp: 'Ionicons', name: 'checkmark' },
    'Printer': { comp: 'Ionicons', name: 'print-outline' },
    'CheckCircle2': { comp: 'Ionicons', name: 'checkmark-circle' },
    'LogOut': { comp: 'Ionicons', name: 'log-out-outline' },
    'Utensils': { comp: 'MaterialIcons', name: 'restaurant' },
  };
  for (const [icon, target] of Object.entries(FIXES)) {
    content = content.replace(new RegExp(`<${icon}(\\s|>)`, 'g'), `<${target.comp} name="${target.name}"$1`);
    content = content.replace(new RegExp(`<${icon}\\s*/>`, 'g'), `<${target.comp} name="${target.name}" />`);
  }
  return content;
}

fixIncomingOrderModal();
fixOrderCard();
