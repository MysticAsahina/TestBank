import express from 'express';
import authRoutes from './auth.js';
import deanRoutes from './deanPages/index.js';
import professorRoutes from './professor.js';
import studentRoutes from './student.js';

const router = express.Router();

// Auth routes
router.use('/auth', authRoutes);

// Role-based routes
router.use('/dean', deanRoutes);
router.use('/professor', professorRoutes);
router.use('/student', studentRoutes);

// Public routes
router.get('/register', (req, res) => {
    res.render('Register', { 
        title: 'Student Registration',
        error: null 
    });
});

router.get('/login', (req, res) => {
    const { error, success } = req.query;
    res.render('Login', { 
        title: 'Login - Test Bank System',
        error: error,
        success: success
    });
});

router.get('/forgot-password', (req, res) => {
    res.render('ForgotPassword', { 
        title: 'Forgot Password',
        error: null,
        success: null,
        showOtpForm: false
    });
});

// Home route
router.get('/', (req, res) => {
    console.log('🏠 Home route - Session user:', req.session.user);
    if (req.session.user) {
        // Redirect to appropriate dashboard based on role
        switch (req.session.user.role) {
            case 'Student':
                res.redirect('/student/dashboard');
                break;
            case 'Professor':
                res.redirect('/professor/dashboard');
                break;
            case 'Dean':
                res.redirect('/dean/dashboard');
                break;
            default:
                res.redirect('/login');
        }
    } else {
        res.redirect('/login');
    }
});

// Shared system pages
router.get('/help', (req, res) => {
    res.render('shared/Help', { 
        title: 'Help Center', 
        user: req.session.user 
    });
});

router.get('/faq', (req, res) => {
    res.render('shared/FAQ', { 
        title: 'FAQ', 
        user: req.session.user 
    });
});

router.get('/support', (req, res) => {
    res.render('shared/Support', { 
        title: 'Support', 
        user: req.session.user 
    });
});

router.get('/settings', (req, res) => {
    res.render('shared/Settings', { 
        title: 'Settings', 
        user: req.session.user 
    });
});

router.get('/notifications', (req, res) => {
    res.render('shared/Notifications', { 
        title: 'Notifications', 
        user: req.session.user 
    });
});

export default router;