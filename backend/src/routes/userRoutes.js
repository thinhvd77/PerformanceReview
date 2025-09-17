import express from 'express';
import { register, login, getProfile, listUsers, getUserById, createUser, updateUser, deleteUser, changePassword } from '../controllers/user.controller.js';
import { authenticateToken, authorizeRole } from '../middlewares/auth.js';

const router = express.Router();

// Auth
router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);
router.post('/change-password', authenticateToken, changePassword);

// User management
router.get('/', authenticateToken, listUsers);
router.get('/:id', authenticateToken, getUserById);
router.post('/', authenticateToken, authorizeRole('admin'), createUser);
router.put('/:id', authenticateToken, authorizeRole('admin'), updateUser);
router.delete('/:id', authenticateToken, authorizeRole('admin'), deleteUser);

export default router;