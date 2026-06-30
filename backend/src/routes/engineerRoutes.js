import express from 'express';
import { getEngineers, getLeaderboard } from '../controllers/engineerController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/engineers', authenticateJWT, getEngineers);
router.get('/leaderboard', authenticateJWT, getLeaderboard);

export default router;
