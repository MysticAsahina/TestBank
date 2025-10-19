import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All student routes require authentication and student role
router.use(requireAuth);
router.use(requireRole(['Student']));

// Student Dashboard
router.get('/dashboard', (req, res) => {
    res.render('student/Dashboard', {
        title: 'Student Dashboard',
        user: req.session.user
    });
});

export default router;
