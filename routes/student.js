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

// My Groups Page
router.get('/groups', (req, res) => {
    res.render('student/Groups', {
        title: 'My Groups',
        user: req.session.user
    });
});

// Group Detail Page
router.get('/group/:groupId', (req, res) => {
    const { groupId } = req.params;
    
    // Sample group data - in real app, this would come from database
    const groupData = {
        'CS101': {
            name: 'Computer Science 101',
            code: 'CS101',
            admin: 'Prof. Smith',
            memberCount: '35'
        },
        'MATH201': {
            name: 'Mathematics Advanced',
            code: 'MATH201',
            admin: 'Prof. Johnson',
            memberCount: '28'
        },
        'PHYS101': {
            name: 'Physics Laboratory',
            code: 'PHYS101',
            admin: 'Prof. Davis',
            memberCount: '22'
        },
        'WEB401': {
            name: 'Web Development',
            code: 'WEB401',
            admin: 'Prof. Wilson',
            memberCount: '42'
        }
    };

    const group = groupData[groupId] || {
        name: 'Unknown Group',
        code: groupId,
        admin: 'Unknown',
        memberCount: '0'
    };

    res.render('student/GgroupTest', {
        title: `${group.name} - Group`,
        user: req.session.user,
        groupName: group.name,
        groupCode: group.code,
        groupAdmin: group.admin,
        memberCount: group.memberCount
    });
});

// Test Results Page
router.get('/test-results/:testId', (req, res) => {
    const { testId } = req.params;
    
    res.render('student/TestResults', {
        title: 'Test Results',
        user: req.session.user,
        testId: testId
    });
});

export default router;