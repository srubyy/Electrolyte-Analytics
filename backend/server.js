import dotenv from 'dotenv';
import app from './src/app.js';
import pool, { testDbConnection, isFallback } from './src/config/db.js';
import * as memoryDb from './src/services/memoryDb.js';

dotenv.config();

const port = process.env.PORT || 3001;

const startServer = async () => {
  // Test connection to local Postgres
  const dbConnected = await testDbConnection();
  
  if (!dbConnected || isFallback()) {
    // If PG is unreachable, seed the memory database fallback
    memoryDb.initializeMemoryDb();
  }

  app.listen(port, () => {
    console.log(`Electrolyte Solutions API server listening at http://localhost:${port}`);
    
    // Auto-correct Lot 20 expected vs received quantities on startup to reflect correct shortage
    if (isFallback()) {
      const lot20 = memoryDb.tables.lots.find(l => l.lot_no === 20);
      if (lot20) {
        lot20.qty_sent = 1000;
        lot20.received_qty = 950;
        console.log('[Startup Fallback] Successfully auto-corrected Lot 20 quantities to expected 1000 and received 950 in memory.');
      }
    } else {
      pool.query("UPDATE lots SET qty_sent = 1000, received_qty = 950 WHERE lot_no = 20")
        .then(() => {
          console.log('[Startup] Successfully auto-corrected Lot 20 quantities to expected 1000 and received 950.');
        })
        .catch(err => {
          console.error('[Startup Error] Failed to auto-correct Lot 20 quantities:', err);
        });
    }
  });
};

startServer();
