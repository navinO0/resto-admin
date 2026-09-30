const fs = require('fs');
let code = fs.readFileSync('src/store/useAdminStore.ts', 'utf8');

// The duplicate dismissIncomingAlert:
code = code.replace(
  /dismissIncomingAlert: \(\) => \{\n\s*const currentAlert = get\(\)\.incomingAlert;\n\s*if \(currentAlert\) \{\n\s*backgroundAlertService\.cancelNotification\(getNotificationId\(currentAlert\.id\)\);\n\s*dismissIncomingAlert: \(sessionId\?: string\) => \{/,
  "dismissIncomingAlert: (sessionId?: string) => {"
);

fs.writeFileSync('src/store/useAdminStore.ts', code, 'utf8');
