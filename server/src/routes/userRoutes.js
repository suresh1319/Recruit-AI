import express from 'express';
import { syncUser, getCurrentUser } from '../controllers/userController.js';

const router = express.Router();

router.post('/sync', syncUser);
router.get('/me', getCurrentUser);

export default router;
