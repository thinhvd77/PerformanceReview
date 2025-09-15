import express from 'express';
import { register, login, getProfile } from '../controllers/user.controller.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);

export default router;