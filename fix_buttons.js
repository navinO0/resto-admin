const fs = require('fs');

let iom = fs.readFileSync('src/components/IncomingOrderModal.tsx', 'utf8');

// Fix duplicates in JSX for buttons
iom = iom.replace(
  /<Ionicons name="checkmark-circle-outline" size=\{22\} color="#FFFFFF" \/>\n\s*<Ionicons name="checkmark-circle-outline" size=\{20\} color="#FFFFFF" \/>/g,
  '<Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />'
);

iom = iom.replace(
  /<Ionicons name="close-circle-outline" size=\{18\} color="#E11D48" \/>\n\s*<Ionicons name="close-circle-outline" size=\{16\} color="#E11D48" \/>/g,
  '<Ionicons name="close-circle-outline" size={16} color="#E11D48" />'
);

// Remove the Mute Sound duplicate block
iom = iom.replace(
  /<\/TouchableOpacity>\n\s*<TouchableOpacity style=\{styles\.silenceButton\} onPress=\{silenceAlarmOnly\} activeOpacity=\{0\.85\}>\n\s*<Ionicons name="volume-mute-outline" size=\{16\} color="#475569" \/>\n\s*<Text style=\{styles\.silenceText\}>Mute Sound<\/Text>\n\s*<\/TouchableOpacity>/g,
  '</TouchableOpacity>'
);

// We need to change the border radii of buttons and boxes to 7px.
// Let's just blindly change borderRadius of typical boxes to 7.
iom = iom.replace(/borderRadius: 10/g, 'borderRadius: 7');
iom = iom.replace(/borderRadius: 12/g, 'borderRadius: 7');
iom = iom.replace(/borderRadius: 8/g, 'borderRadius: 7');
iom = iom.replace(/borderRadius: 20/g, 'borderRadius: 7'); // for the main modal card too maybe? Or 16? Let's leave main card if it looks bad, but let's change 20 to 12.
iom = iom.replace(/borderRadius: 7,/g, 'borderRadius: 7,');

// Actually let's manually target the styles in IncomingOrderModal.tsx
iom = iom.replace(/borderRadius: 20,/g, 'borderRadius: 12,'); // Modal outer card
iom = iom.replace(/borderRadius: 10,/g, 'borderRadius: 7,');
iom = iom.replace(/borderRadius: 12,/g, 'borderRadius: 7,');
iom = iom.replace(/borderRadius: 8,/g, 'borderRadius: 7,');

fs.writeFileSync('src/components/IncomingOrderModal.tsx', iom, 'utf8');

let oc = fs.readFileSync('src/components/OrderCard.tsx', 'utf8');
oc = oc.replace(/borderRadius: 8,/g, 'borderRadius: 7,');
oc = oc.replace(/borderRadius: 10,/g, 'borderRadius: 7,');
oc = oc.replace(/borderRadius: 12,/g, 'borderRadius: 7,');
oc = oc.replace(/borderRadius: 16,/g, 'borderRadius: 12,'); // outer card

fs.writeFileSync('src/components/OrderCard.tsx', oc, 'utf8');

