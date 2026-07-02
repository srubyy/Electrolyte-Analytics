import express from 'express';
import { getUsers, createUser, toggleUserStatus, dispatchEmail } from '../controllers/userController.js';
import { authenticateJWT, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/admin/users', authenticateJWT, authorize(['Superadmin']), getUsers);
router.post('/admin/users', authenticateJWT, authorize(['Superadmin']), createUser);
router.post('/admin/users/toggle/:id', authenticateJWT, authorize(['Superadmin']), toggleUserStatus);
router.post('/admin/email/dispatch', authenticateJWT, authorize(['Superadmin']), dispatchEmail);

export default router;
