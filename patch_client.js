const fs = require('fs');
let code = fs.readFileSync('src/api/client.ts', 'utf8');

code = code.replace(/if \(pendingOrder\) \{\n\s*return this\.updateOrderStatus\(sessionId, pendingOrder\.id, 'cancelled'\);\n\s*const activeOrders/g, 
`if (pendingOrder) {
      return this.updateOrderStatus(sessionId, pendingOrder.id, 'cancelled');
    }
    const activeOrders`);

fs.writeFileSync('src/api/client.ts', code, 'utf8');
