import express from 'express';
import { getApprovals, tlApprove, managerApprove, rejectLog } from '../controllers/approvalController.js';
import { authenticateJWT, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/approvals', authenticateJWT, authorize(['Superadmin', 'Manager', 'Team Lead']), getApprovals);
router.post('/approvals/tl-approve', authenticateJWT, authorize(['Team Lead']), tlApprove);
router.post('/approvals/manager-approve', authenticateJWT, authorize(['Manager', 'Superadmin']), managerApprove);
router.post('/approvals/reject', authenticateJWT, authorize(['Team Lead', 'Manager', 'Superadmin']), rejectLog);

export default router;
