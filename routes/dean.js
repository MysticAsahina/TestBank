import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All dean routes require authentication and dean role
router.use(requireAuth);
router.use(requireRole(['Dean']));

// Dean Dashboard
router.get('/dashboard', (req, res) => {
    res.render('dean/Dashboard', {
        title: 'Dean Dashboard',
        user: req.session.user
    });
});

// Account Management (Merged Professors and Deans)
router.get('/manage-accounts', (req, res) => {
    res.render('dean/ManageAccounts', {
        title: 'Manage Accounts',
        user: req.session.user
    });
});

// My Account
router.get('/account', (req, res) => {
    res.render('dean/Account', {
        title: 'My Account',
        user: req.session.user
    });
});

// Test Management
router.get('/tests', (req, res) => {
    res.render('dean/Tests', {
        title: 'Test Management',
        user: req.session.user
    });
});

// Student Performance
router.get('/student-performance', (req, res) => {
    res.render('dean/StudentPerformance', {
        title: 'Student Performance',
        user: req.session.user
    });
});

// Reports & Analytics
router.get('/reports', (req, res) => {
    res.render('dean/Reports', {
        title: 'Reports & Analytics',
        user: req.session.user
    });
});

export default router;