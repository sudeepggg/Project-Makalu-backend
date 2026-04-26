import { Router } from 'express';
import { authController } from './auth.controller';
import { validateRequest } from '../../middleware/validation.middleware';
import { loginSchema, registerSchema } from './auth.validation';
import { authMiddleware } from '../../middleware/auth.middleware';

export const authRoutes = Router();

authRoutes.post('/register', validateRequest(registerSchema), authController.register);
authRoutes.post('/login', validateRequest(loginSchema), authController.login);
authRoutes.get('/profile', authMiddleware, authController.profile);
authRoutes.post('/change-password', authMiddleware, authController.changePassword);