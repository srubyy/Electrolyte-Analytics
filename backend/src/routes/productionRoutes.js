import express from 'express';
import { 
  getProductionLogs, 
  getPendingProductionLogs, 
  logProduction, 
  tlApproveLog, 
  managerApproveLog, 
  rejectLog,
  getLotProductionStats
} from '../controllers/productionController.js';
import { authenticateJWT, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/production/logs', authenticateJWT, getProductionLogs);
router.get('/production/pending', authenticateJWT, getPendingProductionLogs);
router.post('/production/log', authenticateJWT, authorize(['Employee']), logProduction);
router.post('/production/tl-approve', authenticateJWT, authorize(['Team Lead']), tlApproveLog);
router.post('/production/manager-approve', authenticateJWT, authorize(['Manager']), managerApproveLog);
router.post('/production/reject', authenticateJWT, authorize(['Team Lead', 'Manager']), rejectLog);
router.get('/production/stats/:lot_id', authenticateJWT, getLotProductionStats);

export default router;
