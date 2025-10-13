import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All professor routes require authentication and professor role
router.use(requireAuth);
router.use(requireRole(['Professor']));

// Professor Dashboard
router.get('/dashboard', (req, res) => {
    res.render('professor/Dashboard', {
        title: 'Professor Dashboard',
        user: req.session.user
    });
});

export default router;