const fs = require('fs');

let iom = fs.readFileSync('src/components/IncomingOrderModal.tsx', 'utf8');

// Fix 1: Duplicate `isTakeaway ?` logic
iom = iom.replace(
  /isTakeaway\n\s*\?\s*'INCOMING TAKEAWAY ORDER'\n\s*\?\s*'INCOMING TAKEAWAY \/ ONLINE ORDER'\n\s*:\s*'NEW DINE-IN ORDER'/,
  "isTakeaway\n                  ? 'INCOMING TAKEAWAY / ONLINE ORDER'\n                  : 'NEW DINE-IN ORDER'"
);

// Fix 2: Duplicate `<Text style={styles.title}>{customerName}</Text>`
iom = iom.replace(
  /<Text style=\{styles\.title\}>\{customerName\}<\/Text>\n\s*<Text style=\{styles\.title\} numberOfLines=\{1\}>\{customerName\}<\/Text>/,
  "<Text style={styles.title} numberOfLines={1}>{customerName}</Text>"
);

// Fix 3: Missing `</TouchableOpacity>` in Silence button
iom = iom.replace(
  /<TouchableOpacity style=\{styles\.silenceButton\} onPress=\{dismissIncomingAlert\} activeOpacity=\{0\.85\}>\n\s*<Ionicons name="volume-mute-outline" size=\{18\} color="#475569" \/>\n\s*<Text style=\{styles\.silenceText\}>Silence<\/Text>\n\s*<TouchableOpacity style=\{styles\.silenceButton\} onPress=\{silenceAlarmOnly\} activeOpacity=\{0\.85\}>/g,
  `<TouchableOpacity style={styles.silenceButton} onPress={dismissIncomingAlert} activeOpacity={0.85}>
                <Ionicons name="volume-mute-outline" size={18} color="#475569" />
                <Text style={styles.silenceText}>Silence</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.silenceButton} onPress={silenceAlarmOnly} activeOpacity={0.85}>`
);
fs.writeFileSync('src/components/IncomingOrderModal.tsx', iom, 'utf8');


let oc = fs.readFileSync('src/components/OrderCard.tsx', 'utf8');
let lines = oc.split('\n');
console.log("OrderCard error context:", lines.slice(1055, 1075).join('\n'));
