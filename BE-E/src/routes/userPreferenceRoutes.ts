import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import {
  getUserPreferences,
  updateUserPreferences
} from '../controllers/userPreferenceController';
import { validatePreferenceInput } from '../validators/preferenceValidator';

const router = express.Router();

// Lấy sở thích người dùng
router.get('/', authenticateToken, getUserPreferences);

// Cập nhật sở thích người dùng
router.patch('/', authenticateToken, validatePreferenceInput, updateUserPreferences);

export default router; 