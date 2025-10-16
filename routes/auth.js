import express from 'express';
import bcrypt from 'bcryptjs';
import Student from '../models/Student.js';
import Admin from '../models/Admin.js';
import { sendOTPEmail } from '../utils/emailService.js';

const router = express.Router();

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();
const resetOtpStore = new Map();

// Student Registration
router.post('/register', async (req, res) => {
    try {
        const {
            lastName,
            firstName,
            middleName,
            suffix,
            studentID,
            email,
            password,
            course,
            section,
            yearLevel
        } = req.body;

        console.log('📝 Registration attempt:', { studentID, email });

        // Validate required fields
        const requiredFields = ['lastName', 'firstName', 'middleName', 'studentID', 'email', 'password', 'course', 'section', 'yearLevel'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address!'
            });
        }

        // Validate student ID format (12-3456-789012)
        const studentIDRegex = /^\d{2}-\d{4}-\d{6}$/;
        if (!studentIDRegex.test(studentID)) {
            return res.status(400).json({
                success: false,
                message: 'Student ID must be in format: 12-3456-789012'
            });
        }

        // Check if student already exists
        const existingStudent = await Student.findOne({
            $or: [
                { studentID: studentID },
                { email: email }
            ]
        });

        if (existingStudent) {
            return res.status(400).json({
                success: false,
                message: 'Student ID or Email already exists!'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new student
        const newStudent = new Student({
            lastName,
            firstName,
            middleName,
            suffix: suffix || '',
            studentID,
            email,
            password: hashedPassword,
            course,
            section,
            yearLevel
        });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store OTP temporarily
        otpStore.set(studentID, {
            studentData: newStudent,
            otp: otp,
            expiry: otpExpiry
        });

        console.log(`🔐 OTP generated for ${studentID}: ${otp}`);

        // Send OTP email
        try {
            await sendOTPEmail(email, otp);
            
            res.status(200).json({
                success: true,
                message: 'OTP sent to your email! Please check your inbox and verify to complete registration.'
            });

        } catch (emailError) {
            console.error('📧 Email service error:', emailError);
            
            // Clear OTP data since email failed
            otpStore.delete(studentID);
            
            res.status(500).json({
                success: false,
                message: emailError.message || 'Failed to send OTP email. Please try again later.'
            });
        }

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during registration!'
        });
    }
});

// Verify OTP and Complete Registration
router.post('/verify-otp', async (req, res) => {
    try {
        const { studentId, otpCode } = req.body;

        console.log('OTP verification attempt:', { studentId, otpCode });

        // Check if OTP exists and is valid
        const otpData = otpStore.get(studentId);
        
        if (!otpData) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired or invalid! Please register again.'
            });
        }

        // Check OTP expiry
        if (Date.now() > otpData.expiry) {
            otpStore.delete(studentId);
            return res.status(400).json({
                success: false,
                message: 'OTP has expired! Please register again.'
            });
        }

        // Verify OTP
        if (otpData.otp !== otpCode) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP code!'
            });
        }

        // Save student to database
        await otpData.studentData.save();

        // Remove OTP data from store
        otpStore.delete(studentId);

        console.log(`Student ${studentId} registered successfully`);

        res.status(200).json({
            success: true,
            message: 'Registration completed successfully!'
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during OTP verification!'
        });
    }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
    try {
        const { studentId } = req.body;

        console.log('Resend OTP request:', studentId);

        // Check if registration data exists
        const otpData = otpStore.get(studentId);
        
        if (!otpData) {
            return res.status(400).json({
                success: false,
                message: 'Registration session expired! Please register again.'
            });
        }

        // Generate new OTP
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const newOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Update OTP data
        otpData.otp = newOtp;
        otpData.expiry = newOtpExpiry;

        console.log(`New OTP generated for ${studentId}: ${newOtp}`);

        // Send new OTP email
        try {
            await sendOTPEmail(otpData.studentData.email, newOtp);
            res.status(200).json({
                success: true,
                message: 'New OTP sent to your email!'
            });
        } catch (emailError) {
            console.error('Email error:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Failed to resend OTP email!'
            });
        }

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend OTP!'
        });
    }
});

// Unified Login for all roles (Student, Professor, Dean)
router.post('/login', async (req, res) => {
    try {
        const { userID, password } = req.body;

        console.log('🔐 Login attempt:', { userID });

        if (!userID || !password) {
            return res.status(400).render('Login', {
                title: 'Login - Test Bank System',
                error: 'Please enter both ID and password!',
                success: null
            });
        }

        let user = null;
        let role = '';
        let userModel = null;

        // First, check if it's an Admin (Professor/Dean) by employeeID or email
        user = await Admin.findOne({ 
            $or: [
                { employeeID: userID },
                { email: userID }
            ]
        });

        if (user) {
            role = user.role; // 'Professor' or 'Dean'
            userModel = 'Admin';
            console.log(`👤 Found admin user: ${user.fullName} (${role})`);
        } else {
            // If not admin, check if it's a Student
            user = await Student.findOne({ 
                $or: [
                    { studentID: userID },
                    { email: userID }
                ]
            });
            
            if (user) {
                role = 'Student';
                userModel = 'Student';
                console.log(`👤 Found student user: ${user.fullName}`);
            }
        }

        // User not found
        if (!user) {
            console.log('❌ User not found');
            return res.status(400).render('Login', {
                title: 'Login - Test Bank System',
                error: 'Invalid ID or password!',
                success: null
            });
        }

        // Check account status for Admin users
        if (userModel === 'Admin' && user.accountStatus && user.accountStatus !== 'Active') {
            console.log(`❌ Account not active: ${user.accountStatus}`);
            return res.status(400).render('Login', {
                title: 'Login - Test Bank System',
                error: `Account is ${user.accountStatus}. Please contact administrator.`,
                success: null
            });
        }

        // Check password
        console.log(`🔑 Checking password for: ${user.fullName}`);
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('❌ Invalid password');
            return res.status(400).render('Login', {
                title: 'Login - Test Bank System',
                error: 'Invalid ID or password!',
                success: null
            });
        }

        // Set session
        req.session.user = {
            id: user._id,
            userID: user.studentID || user.employeeID,
            email: user.email,
            fullName: user.fullName,
            role: role,
            userModel: userModel,
            ...(role === 'Student' && {
                course: user.course,
                section: user.section,
                yearLevel: user.yearLevel
            }),
            ...(role !== 'Student' && {
                department: user.department,
                designation: user.designation,
                employmentStatus: user.employmentStatus
            })
        };

        console.log(`✅ Login successful: ${user.fullName} (${role})`);
        console.log('📋 Session data:', req.session.user);

        // Redirect based on role
        switch (role) {
            case 'Student':
                console.log('🎯 Redirecting to student dashboard');
                res.redirect('/student/dashboard');
                break;
            case 'Professor':
                console.log('🎯 Redirecting to professor dashboard');
                res.redirect('/professor/dashboard');
                break;
            case 'Dean':
                console.log('🎯 Redirecting to dean dashboard');
                res.redirect('/dean/dashboard');
                break;
            default:
                console.log('🎯 Redirecting to default dashboard');
                res.redirect('/dashboard');
        }

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).render('Login', {
            title: 'Login - Test Bank System',
            error: 'Internal server error during login!',
            success: null
        });
    }
});

// Forgot Password - Page
router.get('/forgot-password', (req, res) => {
    res.render('ForgotPassword', { 
        title: 'Forgot Password',
        error: null,
        success: null,
        showOtpForm: false
    });
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).render('ForgotPassword', {
                error: 'Please enter your email address!',
                success: null,
                showOtpForm: false
            });
        }

        // Find user by email
        let user = await Student.findOne({ email }) || 
                   await Admin.findOne({ email });

        if (!user) {
            return res.status(400).render('ForgotPassword', {
                error: 'No account found with this email address!',
                success: null,
                showOtpForm: false
            });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store OTP
        resetOtpStore.set(email, {
            userId: user._id,
            userType: user.studentID ? 'Student' : 'Admin',
            otp: otp,
            expiry: otpExpiry
        });

        // Send OTP email
        try {
            await sendOTPEmail(email, otp);
            console.log(`🔐 Password reset OTP for ${email}: ${otp}`);

            res.render('ForgotPassword', {
                error: null,
                success: 'OTP sent to your email! Please check your inbox.',
                showOtpForm: true,
                email: email
            });

        } catch (emailError) {
            console.error('Email error:', emailError);
            res.status(500).render('ForgotPassword', {
                error: 'Failed to send OTP email. Please try again later.',
                success: null,
                showOtpForm: false
            });
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).render('ForgotPassword', {
            error: 'Internal server error!',
            success: null,
            showOtpForm: false
        });
    }
});

// Reset Password - Verify OTP and Update Password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword, confirmPassword } = req.body;

        if (!email || !otp || !newPassword || !confirmPassword) {
            return res.status(400).render('ForgotPassword', {
                error: 'All fields are required!',
                success: null,
                showOtpForm: true,
                email: email
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).render('ForgotPassword', {
                error: 'Passwords do not match!',
                success: null,
                showOtpForm: true,
                email: email
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).render('ForgotPassword', {
                error: 'Password must be at least 6 characters long!',
                success: null,
                showOtpForm: true,
                email: email
            });
        }

        // Verify OTP
        const otpData = resetOtpStore.get(email);
        if (!otpData) {
            return res.status(400).render('ForgotPassword', {
                error: 'OTP expired! Please request a new one.',
                success: null,
                showOtpForm: false
            });
        }

        if (otpData.otp !== otp) {
            return res.status(400).render('ForgotPassword', {
                error: 'Invalid OTP code!',
                success: null,
                showOtpForm: true,
                email: email
            });
        }

        if (Date.now() > otpData.expiry) {
            resetOtpStore.delete(email);
            return res.status(400).render('ForgotPassword', {
                error: 'OTP has expired! Please request a new one.',
                success: null,
                showOtpForm: false
            });
        }

        // Find user and update password
        let user;
        if (otpData.userType === 'Student') {
            user = await Student.findById(otpData.userId);
        } else {
            user = await Admin.findById(otpData.userId);
        }

        if (!user) {
            return res.status(400).render('ForgotPassword', {
                error: 'User not found!',
                success: null,
                showOtpForm: false
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        await user.save();

        // Clear OTP
        resetOtpStore.delete(email);

        console.log(`✅ Password reset successful for: ${email}`);

        res.redirect('/login?success=Password reset successfully! Please login with your new password.');

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).render('ForgotPassword', {
            error: 'Internal server error during password reset!',
            success: null,
            showOtpForm: true,
            email: req.body.email
        });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});










// Temporary route to create Dean account (remove in production)
router.post('/setup-dean', async (req, res) => {
    try {
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ employeeID: 'Admin' });
        
        if (existingAdmin) {
            return res.json({
                success: false,
                message: 'Admin account already exists!'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('Admin', 12);

        // Create Dean account
        const deanAdmin = new Admin({
            lastName: 'Administrator',
            firstName: 'System',
            middleName: 'A',
            contactNumber: '09171234567',
            email: 'admin@testbanksystem.com',
            employeeID: 'Admin',
            department: 'Administration',
            designation: 'Dean',
            employmentStatus: 'Full-time',
            password: hashedPassword,
            role: 'Dean',
            accountStatus: 'Active',
            createdBy: 'System'
        });

        await deanAdmin.save();

        console.log('✅ Dean account created successfully');
        res.json({
            success: true,
            message: 'Dean account created successfully!',
            credentials: {
                ID: 'Admin',
                Password: 'Admin'
            }
        });

    } catch (error) {
        console.error('❌ Error creating Dean account:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create Dean account',
            error: error.message
        });
    }
});
// Diagnostic route to check existing admin accounts
router.get('/check-accounts', async (req, res) => {
    try {
        const adminAccounts = await Admin.find({});
        const studentAccounts = await Student.find({});
        
        res.json({
            adminAccounts: adminAccounts.map(admin => ({
                employeeID: admin.employeeID,
                fullName: admin.fullName,
                role: admin.role,
                email: admin.email
            })),
            studentAccounts: studentAccounts.map(student => ({
                studentID: student.studentID,
                fullName: student.fullName,
                email: student.email
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});









// Temporary route to access Manage Accounts page directly
router.get('/test-manage-accounts', (req, res) => {
    // Create a mock Dean session for testing
    req.session.user = {
        id: 'temp-dean-id',
        userID: '0001',
        email: 'dean@test.com',
        fullName: 'Test Dean',
        role: 'Dean',
        department: 'Computer Science',
        designation: 'Dean',
        employmentStatus: 'Full-time'
    };
    
    res.render('dean/ManageAccounts', {
        title: 'Manage Accounts',
        user: req.session.user
    });
});

// Temporary route to create test Professor account
router.get('/create-test-professor', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash('prof123', 12);

        const professor = new Admin({
            lastName: 'Smith',
            firstName: 'Jane',
            middleName: 'P',
            contactNumber: '09176543210',
            email: 'jane.smith@university.edu',
            employeeID: 'PROF001',
            department: 'Computer Science',
            designation: 'Professor',
            employmentStatus: 'Full-time',
            password: hashedPassword,
            role: 'Professor',
            accountStatus: 'Active',
            createdBy: 'System'
        });

        await professor.save();

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Test Professor Created</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container mt-5">
                    <div class="alert alert-success">
                        <h4>✅ Test Professor Account Created!</h4>
                        <p><strong>Login Credentials:</strong></p>
                        <ul>
                            <li><strong>ID:</strong> PROF001</li>
                            <li><strong>Password:</strong> prof123</li>
                            <li><strong>Role:</strong> Professor</li>
                        </ul>
                        <div class="mt-3">
                            <a href="/auth/test-manage-accounts" class="btn btn-primary me-2">View Manage Accounts</a>
                            <a href="/login" class="btn btn-success">Go to Login</a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

// Temporary route to create test Dean account
router.get('/create-test-dean', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash('dean123', 12);

        const dean = new Admin({
            lastName: 'Wilson',
            firstName: 'Robert',
            middleName: 'D',
            contactNumber: '09179876543',
            email: 'robert.wilson@university.edu',
            employeeID: 'DEAN002',
            department: 'Administration',
            designation: 'Dean',
            employmentStatus: 'Full-time',
            password: hashedPassword,
            role: 'Dean',
            accountStatus: 'Active',
            createdBy: 'System'
        });

        await dean.save();

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Test Dean Created</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container mt-5">
                    <div class="alert alert-success">
                        <h4>✅ Test Dean Account Created!</h4>
                        <p><strong>Login Credentials:</strong></p>
                        <ul>
                            <li><strong>ID:</strong> DEAN002</li>
                            <li><strong>Password:</strong> dean123</li>
                            <li><strong>Role:</strong> Dean</li>
                        </ul>
                        <div class="mt-3">
                            <a href="/auth/test-manage-accounts" class="btn btn-primary me-2">View Manage Accounts</a>
                            <a href="/login" class="btn btn-success">Go to Login</a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

// Temporary route to view all accounts (for testing)
router.get('/view-all-accounts', async (req, res) => {
    try {
        const adminAccounts = await Admin.find({});
        const studentAccounts = await Student.find({});
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>All Accounts</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container mt-4">
                    <h1>All System Accounts</h1>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <h3>Admin Accounts (Professors & Deans)</h3>
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Employee ID</th>
                                            <th>Name</th>
                                            <th>Role</th>
                                            <th>Department</th>
                                            <th>Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${adminAccounts.map(admin => `
                                            <tr>
                                                <td>${admin.employeeID}</td>
                                                <td>${admin.fullName}</td>
                                                <td><span class="badge ${admin.role === 'Dean' ? 'bg-warning' : 'bg-success'}">${admin.role}</span></td>
                                                <td>${admin.department}</td>
                                                <td>${admin.email}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <h3>Student Accounts</h3>
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Student ID</th>
                                            <th>Name</th>
                                            <th>Course</th>
                                            <th>Section</th>
                                            <th>Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${studentAccounts.map(student => `
                                            <tr>
                                                <td>${student.studentID}</td>
                                                <td>${student.fullName}</td>
                                                <td>${student.course}</td>
                                                <td>${student.section}</td>
                                                <td>${student.email}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <a href="/auth/test-manage-accounts" class="btn btn-primary me-2">Test Manage Accounts Page</a>
                        <a href="/auth/create-test-professor" class="btn btn-success me-2">Create Test Professor</a>
                        <a href="/auth/create-test-dean" class="btn btn-warning me-2">Create Test Dean</a>
                        <a href="/login" class="btn btn-info">Go to Login</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

export default router;