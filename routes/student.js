import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import Test from "../models/Test.js";
import StudentTestAttempt from "../models/StudentTestAttempt.js";

const router = express.Router();

// All student routes require authentication and student role
router.use(requireAuth);
router.use(requireRole(['Student']));

// Student Dashboard with dynamic data
router.get('/dashboard', async (req, res) => {
    try {
        console.log('🎯 Loading student dashboard for:', req.session.user);
        
        const studentId = req.session.user.id;
        const studentSection = req.session.user.section;
        
        // Find tests assigned to student's section OR public tests that are not past deadline
        const assignedTests = await Test.find({
            $and: [
                {
                    $or: [
                        { access: "Public" },
                        { assignedSections: studentSection }
                    ]
                },
                { 
                    $or: [
                        { deadline: { $gt: new Date() } },
                        { deadline: { $exists: false } }
                    ]
                }
            ]
        }).populate("createdBy", "fullName");

        // Find completed tests (where student has attempts)
        const completedAttempts = await StudentTestAttempt.find({
            student: studentId
        }).populate({
            path: "test",
            populate: {
                path: "createdBy",
                select: "fullName"
            }
        });

        // Transform assigned tests data for the view
        const assignedTestsData = assignedTests.map(test => ({
            _id: test._id,
            title: test.title,
            subjectCode: test.subjectCode,
            createdBy: test.createdBy?.fullName || "Unknown",
            timeLimit: test.timeLimit,
            deadline: test.deadline,
            questions: test.questions.length,
            totalPoints: test.totalPoints,
            passingPoints: test.passingPoints,
            status: "open",
            description: test.description
        }));

        // Transform completed tests data for the view - WITH BETTER ERROR HANDLING
        const completedTestsData = completedAttempts
            .filter(attempt => {
                // Filter out attempts with missing or invalid test data
                if (!attempt.test || !attempt.test._id) {
                    console.warn('⚠️ Skipping attempt with missing test data:', attempt._id);
                    return false;
                }
                return true;
            })
            .map(attempt => {
                try {
                    return {
                        _id: attempt.test._id,
                        title: attempt.test.title || "Unknown Test",
                        subjectCode: attempt.test.subjectCode || "N/A",
                        createdBy: attempt.test.createdBy?.fullName || "Unknown",
                        timeLimit: attempt.test.timeLimit,
                        deadline: attempt.test.deadline,
                        questions: attempt.test.questions?.length || 0,
                        score: attempt.score,
                        totalPoints: attempt.test.totalPoints || 0,
                        status: "done",
                        passed: attempt.passed,
                        takenAt: attempt.takenAt
                    };
                } catch (error) {
                    console.error('❌ Error processing attempt:', attempt._id, error);
                    return null;
                }
            })
            .filter(item => item !== null); // Remove any null items from mapping errors

        console.log('📊 Dashboard data - Assigned:', assignedTestsData.length, 'Completed:', completedTestsData.length);

        res.render("student/Dashboard", {
            title: 'Student Dashboard',
            user: req.session.user,
            assignedTests: assignedTestsData,
            completedTests: completedTestsData
        });

    } catch (error) {
        console.error("❌ Dashboard error:", error);
        // Simple error response without using error view
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error - Test Bank System</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container mt-5">
                    <div class="alert alert-danger">
                        <h4>Error Loading Dashboard</h4>
                        <p>${error.message}</p>
                        <a href="/student/dashboard" class="btn btn-primary">Try Again</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
});

// Start Test - Display test questions
// Start Test - Display test questions (with retake option)
router.get('/take-test/:testId', async (req, res) => {
    try {
        const testId = req.params.testId;
        const studentId = req.session.user.id;

        // Check if student already attempted this test
        const existingAttempt = await StudentTestAttempt.findOne({
            student: studentId,
            test: testId
        });

        // Check if this is a retake request (has query parameter)
        const isRetake = req.query.retake === 'true';

        if (existingAttempt && !isRetake) {
            // Redirect to results if already attempted and not retaking
            return res.redirect(`/student/test-results/${testId}`);
        }

        if (existingAttempt && isRetake) {
            // Delete the old attempt to allow retake
            await StudentTestAttempt.findByIdAndDelete(existingAttempt._id);
            console.log('🗑️ Deleted old attempt for retake:', existingAttempt._id);
        }

        // Get test details
        const test = await Test.findById(testId);
        if (!test) {
            return res.status(404).send(`
                <div class="alert alert-danger">
                    <h4>Test Not Found</h4>
                    <p>The test you are looking for does not exist.</p>
                    <a href="/student/dashboard" class="btn btn-primary">Back to Dashboard</a>
                </div>
            `);
        }

        // Check access
        const studentSection = req.session.user.section;
        if (test.access === "Private" && !test.assignedSections.includes(studentSection)) {
            return res.status(403).send(`
                <div class="alert alert-warning">
                    <h4>Access Denied</h4>
                    <p>You do not have access to this test.</p>
                    <a href="/student/dashboard" class="btn btn-primary">Back to Dashboard</a>
                </div>
            `);
        }

        res.render("student/TakeTest", {
            title: `Take Test - ${test.title}${isRetake ? ' (Retake)' : ''}`,
            user: req.session.user,
            test: test,
            isRetake: isRetake
        });

    } catch (error) {
        console.error("❌ Take test error:", error);
        res.status(500).send(`
            <div class="alert alert-danger">
                <h4>Error Loading Test</h4>
                <p>${error.message}</p>
                <a href="/student/dashboard" class="btn btn-primary">Back to Dashboard</a>
            </div>
        `);
    }
});

// Submit Test Answers
router.post('/submit-test/:testId', async (req, res) => {
    
    try {
        const testId = req.params.testId;
        const studentId = req.session.user.id;
        const answers = req.body.answers; // Array of student answers

        console.log('📝 Submitting test:', testId);
        console.log('👤 Student:', studentId);
        console.log('📋 Answers:', answers);

        console.log('🎯 SUBMIT TEST DEBUG:');
        console.log('Test ID:', testId);
        console.log('Student ID:', studentId);
        console.log('Answers received:', answers);
        console.log('Answers length:', answers ? answers.length : 0);
        
        if (answers && Array.isArray(answers)) {
            answers.forEach((answer, index) => {
                console.log(`Answer ${index}:`, answer, 'Type:', typeof answer);
            });
        }
        // Check if student already attempted this test
        const existingAttempt = await StudentTestAttempt.findOne({
            student: studentId,
            test: testId
        });

        if (existingAttempt) {
            return res.status(400).json({ 
                success: false, 
                message: "Test already attempted" 
            });
        }

        // Get test with questions
        const test = await Test.findById(testId);
        if (!test) {
            return res.status(404).json({ 
                success: false, 
                message: "Test not found" 
            });
        }

        // Grade the test
        let totalScore = 0;
        const questionResults = [];

        test.questions.forEach((question, index) => {
            const studentAnswer = answers[index];
            let isCorrect = false;
            let pointsEarned = 0;

            // Add this before the switch statement
            console.log('🎯 Grading Question:', {
                index: index,
                type: question.type,
                text: question.text,
                correctAnswer: question.correctAnswer,
                studentAnswer: studentAnswer
            });

            // Grade based on question type
            switch (question.type) {
                case 'identification':
                    // Case-insensitive comparison for identification
                    const correctAnswers = question.answers.map(ans => ans.toLowerCase().trim());
                    const studentAns = (studentAnswer || '').toLowerCase().trim();
                    isCorrect = correctAnswers.includes(studentAns);
                    break;

                case 'multiple':
                    // Convert both correct and student answers to comparable formats
                    if (question.correctAnswer !== undefined && studentAnswer !== undefined) {
                        if (Array.isArray(question.correctAnswer)) {
                            // Multiple correct answers (select all that apply)
                            // Convert letter answers (A, B, C) to indexes (0, 1, 2)
                            const correctIndexes = question.correctAnswer.map(letter => {
                                // Convert "A" -> 0, "B" -> 1, "C" -> 2, etc.
                                return letter.charCodeAt(0) - 65; // A=65 in ASCII
                            }).sort();
                            
                            // Ensure student answer is an array of numbers
                            const studentIndexes = Array.isArray(studentAnswer) 
                                ? studentAnswer.map(val => Number(val)).sort()
                                : [Number(studentAnswer)].sort();
                            
                            isCorrect = JSON.stringify(correctIndexes) === JSON.stringify(studentIndexes);
                        } else {
                            // Single correct answer - convert letter to index
                            const correctIndex = question.correctAnswer.charCodeAt(0) - 65;
                            const studentIndex = Number(studentAnswer);
                            isCorrect = correctIndex === studentIndex;
                        }
                    }
                    break;

                case 'truefalse':
                    // Case-insensitive comparison for true/false
                    if (question.correctAnswer !== undefined && studentAnswer !== undefined) {
                        isCorrect = String(question.correctAnswer).toLowerCase() === String(studentAnswer).toLowerCase();
                    }
                    break;

                case 'enumeration':
                // For enumeration questions, use the 'answers' array for correct answers
                if (Array.isArray(question.answers) && question.answers.length > 0) {
                    const correctAnswers = question.answers
                        .map(ans => String(ans).toLowerCase().trim())
                        .filter(ans => ans.length > 0);
                    
                    let studentAnswers = [];
                    if (Array.isArray(studentAnswer)) {
                        studentAnswers = studentAnswer
                            .map(ans => String(ans).toLowerCase().trim())
                            .filter(ans => ans.length > 0);
                    } else if (studentAnswer) {
                        studentAnswers = [String(studentAnswer).toLowerCase().trim()].filter(ans => ans.length > 0);
                    }
                    
                    console.log('🔍 Enumeration Debug:', {
                        question: question.text,
                        correctAnswers,
                        studentAnswers,
                        studentAnswerRaw: studentAnswer
                    });
                    
                    // Check if student provided the required number of answers
                    const requiredCount = correctAnswers.length;
                    if (studentAnswers.length < requiredCount) {
                        isCorrect = false;
                        console.log('❌ Student provided too few answers:', studentAnswers.length, 'expected:', requiredCount);
                    } else {
                        // Count how many unique correct answers the student provided
                        let correctCount = 0;
                        
                        // Create a copy of correct answers to track which ones have been matched
                        const remainingCorrectAnswers = [...correctAnswers];
                        const matchedStudentAnswers = [];
                        
                        // Check each student answer against correct answers
                        studentAnswers.forEach(studentAns => {
                            // Find if this student answer matches any correct answer
                            const matchIndex = remainingCorrectAnswers.findIndex(correctAns => {
                                // Exact match or startsWith for partial matches
                                return studentAns === correctAns || 
                                    correctAns.startsWith(studentAns) ||
                                    studentAns.startsWith(correctAns);
                            });
                            
                            if (matchIndex !== -1) {
                                correctCount++;
                                matchedStudentAnswers.push(studentAns);
                                remainingCorrectAnswers.splice(matchIndex, 1); // Remove matched answer
                            }
                        });
                        
                        // Student needs to match ALL correct answers
                        isCorrect = correctCount === requiredCount && studentAnswers.length === requiredCount;
                        
                        console.log('📊 Enumeration Result:', {
                            correctCount,
                            requiredCount,
                            studentAnswerCount: studentAnswers.length,
                            isCorrect,
                            matchedStudentAnswers,
                            remainingCorrectAnswers
                        });
                    }
                } else {
                    isCorrect = false;
                    console.log('❌ No answers array defined for enumeration');
                }
                break;

                case 'essay':
                    // For essay questions, auto-grade as correct for now
                    isCorrect = true; // Auto-pass essays for demo
                    break;
            }

            // Calculate points
            pointsEarned = isCorrect ? question.points : 0;
            totalScore += pointsEarned;

            // Store the answers in a display-friendly format for results
            let displayStudentAnswer = studentAnswer;
            let displayCorrectAnswer = question.correctAnswer;

            // Format enumeration answers for display
            if (question.type === 'enumeration') {
                if (Array.isArray(studentAnswer)) {
                    displayStudentAnswer = studentAnswer.filter(ans => ans && ans.trim().length > 0).join(', ');
                } else if (studentAnswer) {
                    displayStudentAnswer = String(studentAnswer);
                } else {
                    displayStudentAnswer = 'No answer provided';
                }
                
                // Use answers array for display since correctAnswer is undefined
                if (Array.isArray(question.answers)) {
                    displayCorrectAnswer = question.answers.filter(ans => ans && ans.trim().length > 0).join(', ');
                } else {
                    displayCorrectAnswer = 'No correct answers defined';
                }
            }

            // Convert true/false to consistent capitalization for display
            if (question.type === 'truefalse') {
                displayStudentAnswer = String(studentAnswer).charAt(0).toUpperCase() + String(studentAnswer).slice(1).toLowerCase();
                displayCorrectAnswer = String(question.correctAnswer).charAt(0).toUpperCase() + String(question.correctAnswer).slice(1).toLowerCase();
            }

            questionResults.push({
                questionId: question._id,
                questionText: question.text,
                questionType: question.type,
                studentAnswer: displayStudentAnswer,
                correctAnswer: displayCorrectAnswer,
                isCorrect: isCorrect,
                pointsEarned: pointsEarned,
                maxPoints: question.points,
                feedback: isCorrect ? question.feedbackWhenCorrect : question.feedbackWhenIncorrect
            });
        });

        // Determine if student passed
        const passed = totalScore >= test.passingPoints;

        // Save attempt to database
        const testAttempt = new StudentTestAttempt({
            student: studentId,
            test: testId,
            score: totalScore,
            passed: passed,
            questionResults: questionResults,
            takenAt: new Date()
        });

        await testAttempt.save();

        console.log('✅ Test submitted successfully. Score:', totalScore);

        res.json({
            success: true,
            score: totalScore,
            totalPoints: test.totalPoints,
            passed: passed,
            results: questionResults
        });

    } catch (error) {
        console.error("❌ Submit test error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error submitting test: " + error.message 
        });
    }
});

// Test Results Page
router.get('/test-results/:testId', async (req, res) => {
    try {
        const { testId } = req.params;
        const studentId = req.session.user.id;
        
        // Find the student's attempt for this test
        const attempt = await StudentTestAttempt.findOne({
            student: studentId,
            test: testId
        }).populate({
            path: "test",
            populate: {
                path: "createdBy",
                select: "fullName"
            }
        });

        if (!attempt) {
            return res.status(404).send(`
                <div class="alert alert-warning">
                    <h4>Test Results Not Found</h4>
                    <p>No test results found for this test.</p>
                    <a href="/student/dashboard" class="btn btn-primary">Back to Dashboard</a>
                </div>
            `);
        }

        if (!attempt.test) {
            return res.status(404).send(`
                <div class="alert alert-warning">
                    <h4>Test Data Not Found</h4>
                    <p>The test data for these results is no longer available.</p>
                    <a href="/student/dashboard" class="btn btn-primary">Back to Dashboard</a>
                </div>
            `);
        }

        res.render('student/TestResults', {
            title: 'Test Results',
            user: req.session.user,
            testId: testId,
            attempt: attempt,
            test: attempt.test
        });
        
    } catch (error) {
        console.error("❌ Test results error:", error);
        res.status(500).send(`
            <div class="alert alert-danger">
                <h4>Error Loading Test Results</h4>
                <p>${error.message}</p>
                <a href="/student/dashboard" class="btn btn-primary">Back to Dashboard</a>
            </div>
        `);
    }
});

// Search tests API endpoint
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        const studentSection = req.session.user.section;

        console.log('🔍 Searching tests with query:', q);

        const tests = await Test.find({
            $and: [
                {
                    $or: [
                        { title: { $regex: q, $options: "i" } },
                        { subjectCode: { $regex: q, $options: "i" } },
                        { description: { $regex: q, $options: "i" } }
                    ]
                },
                {
                    $or: [
                        { access: "Public" },
                        { assignedSections: studentSection }
                    ]
                },
                { 
                    $or: [
                        { deadline: { $gt: new Date() } },
                        { deadline: { $exists: false } }
                    ]
                }
            ]
        }).populate("createdBy", "fullName");

        const testData = tests.map(test => ({
            _id: test._id,
            title: test.title,
            subjectCode: test.subjectCode,
            createdBy: test.createdBy?.fullName || "Unknown",
            timeLimit: test.timeLimit,
            deadline: test.deadline,
            questions: test.questions.length,
            totalPoints: test.totalPoints
        }));

        res.json(testData);

    } catch (error) {
        console.error("❌ Search error:", error);
        res.status(500).json({ error: "Search failed" });
    }
});

// Get test details API endpoint
router.get('/test/:testId', async (req, res) => {
    try {
        const test = await Test.findById(req.params.testId)
            .populate("createdBy", "fullName");
        
        if (!test) {
            return res.status(404).json({ error: "Test not found" });
        }

        // Check if student has access to this test
        const studentSection = req.session.user.section;
        if (test.access === "Private" && !test.assignedSections.includes(studentSection)) {
            return res.status(403).json({ error: "Access denied to this test" });
        }

        res.json(test);

    } catch (error) {
        console.error("❌ Test details error:", error);
        res.status(500).json({ error: "Error fetching test details" });
    }
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

export default router;