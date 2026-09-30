const fs = require('fs');

let iom = fs.readFileSync('src/components/IncomingOrderModal.tsx', 'utf8');

// 1. Fix the Header text
iom = iom.replace(
  /\{incomingAlert\.needsAttention\n\s*\?\s*'GUEST ASSISTANCE CALL'\n\s*:\s*isTakeaway \? 'INCOMING TAKEAWAY \/ ONLINE ORDER' : 'NEW DINE-IN ORDER'\}/g,
  `{incomingAlert.needsAttention
                  ? (incomingAlert.attentionType === 'payment' ? 'GUEST PAYMENT NOTIFICATION' : 'GUEST ASSISTANCE CALL')
                  : isTakeaway ? 'INCOMING TAKEAWAY / ONLINE ORDER' : 'NEW DINE-IN ORDER'}`
);

// 2. Replace the Actions block
const oldActions = `<View style={styles.actions}>
            <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.acceptText}>
                {isTakeaway ? 'ACCEPT TAKEAWAY' : 'ACCEPT TO KITCHEN'}
              </Text>
            </TouchableOpacity>

            <View style={styles.secondaryRow}>
              <TouchableOpacity style={styles.declineButton} onPress={handleDecline} activeOpacity={0.85}>
                <Ionicons name="close-circle-outline" size={16} color="#E11D48" />
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.silenceButton} onPress={dismissIncomingAlert} activeOpacity={0.85}>
                <Ionicons name="volume-mute-outline" size={18} color="#475569" />
                <Text style={styles.silenceText}>Silence</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dismissButton} 
                onPress={() => dismissIncomingAlert(incomingAlert.id)} 
                activeOpacity={0.85}
              >
                <Text style={styles.dismissText}>
                  {hasMultipleInQueue ? 'Skip' : 'Dismiss'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>`;

const newActions = `<View style={styles.actions}>
            {incomingAlert.needsAttention ? (
              <TouchableOpacity 
                style={[styles.acceptButton, { backgroundColor: '#3B82F6' }]} 
                onPress={() => dismissIncomingAlert(incomingAlert.id)} 
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.acceptText}>
                  {incomingAlert.attentionType === 'payment' ? 'ACKNOWLEDGE PAYMENT' : 'ACKNOWLEDGE CALL'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} activeOpacity={0.85}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.acceptText}>
                  {isTakeaway ? 'ACCEPT TAKEAWAY' : 'ACCEPT TO KITCHEN'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.secondaryRow}>
              {!incomingAlert.needsAttention && (
                <TouchableOpacity style={styles.declineButton} onPress={handleDecline} activeOpacity={0.85}>
                  <Ionicons name="close-circle-outline" size={16} color="#E11D48" />
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.silenceButton} onPress={silenceAlarmOnly} activeOpacity={0.85}>
                <Ionicons name="volume-mute-outline" size={18} color="#475569" />
                <Text style={styles.silenceText}>Silence</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dismissButton} 
                onPress={() => dismissIncomingAlert(incomingAlert.id)} 
                activeOpacity={0.85}
              >
                <Text style={styles.dismissText}>
                  {hasMultipleInQueue ? 'Skip' : 'Dismiss'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>`;

iom = iom.replace(oldActions, newActions);

fs.writeFileSync('src/components/IncomingOrderModal.tsx', iom, 'utf8');

