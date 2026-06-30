import express from 'express';
import { getPanels, searchPanel, assignPanel, progressRepair } from '../controllers/panelController.js';
import { authenticateJWT, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/panels', authenticateJWT, getPanels);
router.get('/panels/search', authenticateJWT, searchPanel);
router.post('/repair/assign', authenticateJWT, authorize(['Superadmin', 'Manager', 'Team Lead']), assignPanel);
router.post('/repair/next', authenticateJWT, progressRepair);

export default router;
