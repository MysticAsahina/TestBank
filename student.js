import express from 'express';
import mongoose from 'mongoose'; // ADD THIS LINE
import { requireAuth, requireRole } from '../middleware/auth.js';
import Test from "../models/Test.js";
import StudentTestAttempt from "../models/StudentTestAttempt.js";
import Section from "../models/Section.js"; // ADD THIS LINE TOO
import SectionFile from "../models/SectionFile.js";
import { makeFilePublic } from "../utils/cloudinary.js";

const router = express.Router();

// All student routes require authentication and student role
router.use(requireAuth);
router.use(requireRole(['Student']));

// Helper function for section mapping - FIXED VERSION
async function getStudentSectionIdentifiers(studentData) {
    const { section, course, yearLevel, studentId } = studentData;
    
    console.log('🔍 Starting section identification for:', {
        studentId: studentId,
        recordedSection: section,
        course: course,
        yearLevel: yearLevel
    });

    // Get the actual sections the student is enrolled in
    let enrolledSectionNames = [];
    if (studentId) {
        const enrolledSections = await Section.find({
            'students.id': studentId
        }).select('name').lean();
        
        enrolledSectionNames = enrolledSections.map(s => s.name);
    }
    
    console.log('📋 Student enrollment debug:', {
        studentId: studentId,
        recordedSection: section,
        enrolledSections: enrolledSectionNames
    });

    const sectionNumber = section.match(/\d+/)?.[0] || section;
    
    // Include BOTH recorded section AND actual enrolled sections
    const possibleIdentifiers = [
        sectionNumber,
        section,
        ...enrolledSectionNames, // Add actual enrolled sections
        `${course}${yearLevel.charAt(0)}-${section.replace(/\s+/g, '')}`,
        `${course}${yearLevel.charAt(0)}-${sectionNumber}`,
        ...enrolledSectionNames.map(name => `${course}${yearLevel.charAt(0)}-${name.replace(/\s+/g, '')}`),
        section.toLowerCase(),
        section.toUpperCase(),
        section.replace(/\s+/g, ''),
        ...enrolledSectionNames.map(name => name.toLowerCase()),
        ...enrolledSectionNames.map(name => name.toUpperCase()),
        ...enrolledSectionNames.map(name => name.replace(/\s+/g, ''))
    ];
    
    const uniqueIdentifiers = [...new Set(possibleIdentifiers.filter(id => id))];
    
    console.log('🎯 Final section identifiers:', uniqueIdentifiers);
    
    return uniqueIdentifiers;
}


// Then add this route:
router.get('/fix-existing-files', async (req, res) => {
  try {
    const blockedFiles = await SectionFile.find({});
    
    const fixResults = await Promise.all(
      blockedFiles.map(async (file) => {
        try {
          // Update the file to be public in Cloudinary
          const cloudinaryResult = await makeFilePublic(file.cloudinaryPublicId);
          
          return {
            name: file.originalName,
            publicId: file.cloudinaryPublicId,
            status: 'FIXED',
            newUrl: cloudinaryResult.secure_url
          };
        } catch (error) {
          return {
            name: file.originalName,
            publicId: file.cloudinaryPublicId,
            status: 'ERROR',
            error: error.message
          };
        }
      })
    );

    res.json({
      message: 'Attempted to fix all blocked files',
      results: fixResults
    });

  } catch (error) {
    console.error("Fix existing files error:", error);
    res.status(500).json({ error: error.message });
  }
});


// Enhanced test access check middleware
async function checkTestAccess(req, res, next) {
    try {
        const testId = req.params.testId;
        const studentId = req.session.user.id;
        const studentSection = req.session.user.section;

        const test = await Test.findById(testId);
        if (!test) {
            return res.status(404).json({ error: "Test not found" });
        }

        // RULE 1: Check if exam is Public
        if (test.access !== "Public") {
            return res.status(403).json({ 
                error: "This test is not publicly available. Only private tests are accessible to assigned students." 
            });
        }

        // RULE 2: Check if student is in the same section
        // FIX: Add await here
        const studentSectionIdentifiers = await getStudentSectionIdentifiers({
            section: studentSection,
            course: req.session.user.course,
            yearLevel: req.session.user.yearLevel,
            studentId: studentId  // Make sure to pass studentId
        });

        console.log('🔍 Test access check - Section identifiers:', studentSectionIdentifiers);

        const sectionMatch = test.assignedSections.some(section => 
            studentSectionIdentifiers.includes(section)
        );

        if (!sectionMatch) {
            console.log('❌ Section mismatch:', {
                testSections: test.assignedSections,
                studentSections: studentSectionIdentifiers
            });
            return res.status(403).json({ 
                error: "You are not assigned to this test. Please contact your instructor if you believe this is an error." 
            });
        }

        // RULE 3: Check prerequisites
        if (test.prerequisites && test.prerequisites.length > 0) {
            const studentAttempts = await StudentTestAttempt.find({
                student: studentId,
                test: { $in: test.prerequisites }
            });
            
            const passedPrerequisites = test.prerequisites.every(prereqId => {
                const attempt = studentAttempts.find(a => a.test.toString() === prereqId.toString());
                return attempt && attempt.passed;
            });

            if (!passedPrerequisites) {
                // Get names of missing prerequisites for better error message
                const missingPrereqs = await Test.find({
                    _id: { $in: test.prerequisites.filter(prereqId => {
                        const attempt = studentAttempts.find(a => a.test.toString() === prereqId.toString());
                        return !attempt || !attempt.passed;
                    })}
                }, 'title');

                const missingNames = missingPrereqs.map(p => p.title).join(', ');
                
                return res.status(403).json({ 
                    error: `You must pass all prerequisite tests before taking this exam. Missing: ${missingNames}` 
                });
            }
        }

        // All checks passed - attach test to request and proceed
        req.test = test;
        next();
    } catch (error) {
        console.error("❌ Test access check error:", error);
        res.status(500).json({ error: "Error checking test access" });
    }
}

// Student Dashboard with complete filtering logic
router.get('/dashboard', async (req, res) => {
    try {
        console.log('🎯 Loading student dashboard for:', req.session.user);
        
        const studentId = req.session.user.id;
        const studentSection = req.session.user.section;

        // FIX: Get the actual section the student is enrolled in
        const enrolledSection = await Section.findOne({
            'students.id': studentId
        }).select('name');

        // Use the actual enrolled section instead of the recorded section
        const actualSection = enrolledSection ? enrolledSection.name : studentSection;
        
        console.log('🔍 Section debug:', {
            recordedSection: studentSection,
            actualEnrolledSection: actualSection,
            studentId: studentId
        });

        // Update session with correct section if different
        if (actualSection !== studentSection) {
            console.log('🔄 Correcting student section in session:', {
                from: req.session.user.section,
                to: actualSection
            });
            req.session.user.section = actualSection;
        }

        // FIX: Add await here since the function is now async
        const studentSectionIdentifiers = await getStudentSectionIdentifiers({
            section: actualSection,  // Use the actual section
            course: req.session.user.course,
            yearLevel: req.session.user.yearLevel,
            studentId: studentId
        });

        console.log('🔢 Student Section Mapping:', {
            descriptive: actualSection,
            possibleIdentifiers: studentSectionIdentifiers
        });

        // STEP 1: Get all public tests assigned to student's section
        const publicSectionTests = await Test.find({
            access: "Public",
            assignedSections: { 
                $in: studentSectionIdentifiers
            }
        }).populate("createdBy", "fullName");

        console.log('📋 Found', publicSectionTests.length, 'public tests for student section (including expired)');

        // STEP 2: Get student's test attempts for prerequisite checking AND completion status
        const studentAttempts = await StudentTestAttempt.find({
            student: studentId
        });

        // Create maps for quick lookup
        const passedTestsMap = {};
        const completedTestsMap = {};
        const attemptDetailsMap = {}; // Store attempt details for completed tests
        
        studentAttempts.forEach(attempt => {
            completedTestsMap[attempt.test.toString()] = true;
            attemptDetailsMap[attempt.test.toString()] = attempt;
            if (attempt.passed) {
                passedTestsMap[attempt.test.toString()] = true;
            }
        });

        console.log('✅ Student completed tests:', Object.keys(completedTestsMap));
        console.log('✅ Student passed tests:', Object.keys(passedTestsMap));

        // STEP 3: Filter tests based on prerequisites (RULE 3)
        const visibleTests = publicSectionTests.filter(test => {
            // If no prerequisites, show the test immediately
            if (!test.prerequisites || test.prerequisites.length === 0) {
                console.log(`✅ "${test.title}": No prerequisites - SHOW`);
                return true;
            }

            // Check if student has passed ALL prerequisites
            const allPrerequisitesPassed = test.prerequisites.every(prereqId => {
                const passed = passedTestsMap[prereqId.toString()];
                if (!passed) {
                    console.log(`❌ Missing prerequisite: ${prereqId} for test: ${test.title}`);
                }
                return passed;
            });

            console.log(`🔍 Test "${test.title}": Prerequisites=${test.prerequisites.length}, AllPassed=${allPrerequisitesPassed}`);
            
            if (allPrerequisitesPassed) {
                console.log(`✅ "${test.title}": All prerequisites passed - SHOW`);
            } else {
                console.log(`🚫 "${test.title}": Missing prerequisites - HIDE`);
            }
            
            return allPrerequisitesPassed;
        });

        console.log('👀 Final visible tests after all filters:', visibleTests.length);

        // Transform visible tests data for the view - FIXED VERSION
        const assignedTestsData = visibleTests
            .filter(test => {
                // Filter out completed tests from assigned tests
                const isCompleted = completedTestsMap[test._id.toString()] || false;
                return !isCompleted; // Only include tests that are NOT completed
            })
            .map(test => {
                const now = new Date();
                const isExpired = test.deadline && test.deadline < now;
                const hasDeadlinePassed = isExpired;
                const hasDeadline = !!test.deadline;
                
                let status = "open";
                if (hasDeadlinePassed) {
                    status = "expired";
                } else if (hasDeadline) {
                    status = "active";
                } else {
                    status = "no-deadline";
                }
                
                return {
                    _id: test._id,
                    title: test.title,
                    subjectCode: test.subjectCode,
                    createdBy: test.createdBy?.fullName || "Unknown",
                    timeLimit: test.timeLimit,
                    deadline: test.deadline,
                    questions: test.questions.length,
                    totalPoints: test.totalPoints,
                    passingPoints: test.passingPoints,
                    status: status,
                    isExpired: isExpired,
                    hasDeadline: hasDeadline,
                    description: test.description,
                    prerequisites: test.prerequisites || [],
                    hasPrerequisites: (test.prerequisites && test.prerequisites.length > 0) || false,
                    prerequisitesMet: true, // Since we filtered for this
                    isCompleted: false // All tests here are not completed (we filtered them out)
                };
            });

        // Transform completed tests data for the view - FIXED VERSION
        const completedTestsData = studentAttempts
            .filter(attempt => {
                if (!attempt.test || !attempt.test._id) {
                    console.warn('⚠️ Skipping attempt with missing test data:', attempt._id);
                    return false;
                }
                return true;
            })
            .map(attempt => {
                try {
                    // Find the original test data to get full details
                    const originalTest = publicSectionTests.find(t => t._id.toString() === attempt.test.toString());
                    
                    return {
                        _id: attempt.test._id,
                        title: originalTest?.title || attempt.test.title || "Unknown Test",
                        subjectCode: originalTest?.subjectCode || attempt.test.subjectCode || "N/A",
                        createdBy: originalTest?.createdBy?.fullName || attempt.test.createdBy?.fullName || "Unknown",
                        timeLimit: originalTest?.timeLimit || attempt.test.timeLimit,
                        deadline: originalTest?.deadline || attempt.test.deadline,
                        questions: originalTest?.questions?.length || attempt.test.questions?.length || 0,
                        score: attempt.score,
                        totalPoints: originalTest?.totalPoints || attempt.test.totalPoints || 0,
                        status: "done",
                        passed: attempt.passed,
                        takenAt: attempt.takenAt,
                        isRetake: attempt.isRetake || false
                    };
                } catch (error) {
                    console.error('❌ Error processing attempt:', attempt._id, error);
                    return null;
                }
            })
            .filter(item => item !== null);

        console.log('📊 Dashboard data - Assigned:', assignedTestsData.length, 'Completed:', completedTestsData.length);

        // Debug: Log assigned tests with their completion status
        console.log('🔍 Assigned Tests Status:');
        assignedTestsData.forEach(test => {
            console.log(`   ${test.isCompleted ? '✅ COMPLETED' : '📝 AVAILABLE'} "${test.title}" - Status: ${test.status}`);
        });

        res.render("student/Dashboard", {
            title: 'Student Dashboard',
            user: req.session.user,
            assignedTests: assignedTestsData,
            completedTests: completedTestsData
        });

    } catch (error) {
        console.error("❌ Dashboard error:", error);
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

// Utility function to randomize and select test questions
function randomizeTestQuestions(allQuestions, howManyQuestions) {
    if (!Array.isArray(allQuestions) || allQuestions.length === 0) {
        return [];
    }

    // Validate howManyQuestions
    const questionCount = Math.min(howManyQuestions, allQuestions.length);
    
    console.log(`🔄 Randomizing ${questionCount} questions from ${allQuestions.length} total questions`);

    // Create a copy of the questions array to avoid mutation
    const questionsCopy = [...allQuestions];
    
    // Fisher-Yates shuffle algorithm for proper randomization
    for (let i = questionsCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionsCopy[i], questionsCopy[j]] = [questionsCopy[j], questionsCopy[i]];
    }
    
    // Take the first 'questionCount' questions
    const selectedQuestions = questionsCopy.slice(0, questionCount);
    
    console.log(`✅ Selected ${selectedQuestions.length} randomized questions`);
    
    return selectedQuestions;
}

// Helper function to calculate if a single question is correct
function calculateQuestionCorrectness(question, studentAnswer) {
    if (!studentAnswer && studentAnswer !== '') return false;

    if (question.type === "multiple") {
        const correct = question.correctAnswer || [];
        const answer = Array.isArray(studentAnswer) ? studentAnswer.map(String) : [String(studentAnswer)];
        return answer.length > 0 && answer.every(a => correct.includes(a));
    } else if (["truefalse", "identification"].includes(question.type)) {
        const correct = String(question.correctAnswer || "").toLowerCase();
        const answer = String(studentAnswer || "").toLowerCase();
        return correct && correct === answer;
    } else if (question.type === "enumeration") {
        const correctAnswers = Array.isArray(question.answers) ? 
            question.answers.map(a => String(a).toLowerCase().trim()).filter(a => a) : [];
        let studentAnswersArray = [];
        
        if (Array.isArray(studentAnswer)) {
            studentAnswersArray = studentAnswer.map(a => String(a).toLowerCase().trim()).filter(a => a);
        } else if (typeof studentAnswer === 'string') {
            studentAnswersArray = studentAnswer.split(/[,|\n]/).map(a => a.trim().toLowerCase()).filter(a => a);
        }
        
        const correctSet = new Set(correctAnswers);
        const studentSet = new Set(studentAnswersArray);
        const correctCount = [...studentSet].filter(answer => correctSet.has(answer)).length;
        
        return correctCount === correctAnswers.length;
    }
    
    return false; // Essay questions return false for auto-grading
}

// Start Test - Display test questions
router.get('/take-test/:testId', checkTestAccess, async (req, res) => {
    try {
        const testId = req.params.testId;
        const studentId = req.session.user.id;
        const test = req.test; // From middleware

        // Check if student already attempted this test
        const existingAttempt = await StudentTestAttempt.findOne({
            student: studentId,
            test: testId
        });

        // Check if this is a retake request
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

        // Randomize and select questions based on howManyQuestions
        const randomizedQuestions = randomizeTestQuestions(test.questions, test.howManyQuestions);

        // Create a test session to track which questions were shown
        req.session.currentTest = {
            testId: test._id,
            originalQuestions: test.questions.map(q => q._id.toString()),
            shownQuestions: randomizedQuestions.map(q => q._id.toString()),
            startTime: new Date()
        };

        res.render("student/TakeTest", {
            title: `Take Test - ${test.title}${isRetake ? ' (Retake)' : ''}`,
            user: req.session.user,
            test: {
                ...test.toObject(),
                questions: randomizedQuestions
            },
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

// Submit Test Answers - FIXED VERSION
router.post('/submit-test/:testId', async (req, res) => {
    try {
        const testId = req.params.testId;
        const studentId = req.session.user.id;
        const answers = req.body.answers; // Array of student answers
        const isRetake = req.body.isRetake || false;

        console.log('📝 Submitting test:', testId);
        console.log('👤 Student:', studentId);
        console.log('🔄 Is Retake:', isRetake);
        console.log('📋 Answers:', answers);

        // Get test with questions
        const test = await Test.findById(testId);
        if (!test) {
            return res.status(404).json({ 
                success: false, 
                message: "Test not found" 
            });
        }

        // Check if student already attempted this test (only if not a retake)
        const existingAttempt = await StudentTestAttempt.findOne({
            student: studentId,
            test: testId
        });

        if (existingAttempt && !isRetake) {
            return res.status(400).json({ 
                success: false, 
                message: "Test already attempted. Use retake option if available." 
            });
        }

        // If this is a retake, delete the old attempt
        if (existingAttempt && isRetake) {
            await StudentTestAttempt.findByIdAndDelete(existingAttempt._id);
            console.log('🗑️ Deleted old attempt for retake:', existingAttempt._id);
        }

        // Get the questions that were shown to the student
        const shownQuestionIds = req.session.currentTest?.shownQuestions || [];
        console.log('📊 Grading randomized questions:', shownQuestionIds.length, 'out of', test.questions.length);

        // Grade the test
        let totalScore = 0;
        const questionResults = [];

        // Only grade the questions that were actually shown to the student
        shownQuestionIds.forEach((questionId, index) => {
            const originalQuestion = test.questions.id(questionId);
            if (!originalQuestion) {
                console.warn('⚠️ Question not found in original test:', questionId);
                return;
            }

            const studentAnswer = answers[index];
            let isCorrect = false;
            let pointsEarned = 0;

            console.log('🎯 Grading Question:', {
                index: index,
                questionId: questionId,
                type: originalQuestion.type,
                text: originalQuestion.text,
                correctAnswer: originalQuestion.correctAnswer,
                studentAnswer: studentAnswer
            });

            // Grade based on question type
            switch (originalQuestion.type) {
                case 'identification':
                    // Case-insensitive comparison for identification
                    const correctAnswers = originalQuestion.answers.map(ans => ans.toLowerCase().trim());
                    const studentAns = (studentAnswer || '').toLowerCase().trim();
                    isCorrect = correctAnswers.includes(studentAns);
                    break;

                case 'multiple':
                    // Convert both correct and student answers to comparable formats
                    if (originalQuestion.correctAnswer !== undefined && studentAnswer !== undefined) {
                        if (Array.isArray(originalQuestion.correctAnswer)) {
                            // Multiple correct answers (select all that apply)
                            const correctIndexes = originalQuestion.correctAnswer.map(letter => {
                                return letter.charCodeAt(0) - 65; // A=65 in ASCII
                            }).sort();
                            
                            const studentIndexes = Array.isArray(studentAnswer) 
                                ? studentAnswer.map(val => Number(val)).sort()
                                : [Number(studentAnswer)].sort();
                            
                            isCorrect = JSON.stringify(correctIndexes) === JSON.stringify(studentIndexes);
                        } else {
                            // Single correct answer
                            const correctIndex = originalQuestion.correctAnswer.charCodeAt(0) - 65;
                            const studentIndex = Number(studentAnswer);
                            isCorrect = correctIndex === studentIndex;
                        }
                    }
                    break;

                case 'truefalse':
                    // Case-insensitive comparison for true/false
                    if (originalQuestion.correctAnswer !== undefined && studentAnswer !== undefined) {
                        isCorrect = String(originalQuestion.correctAnswer).toLowerCase() === String(studentAnswer).toLowerCase();
                    }
                    break;

                case 'enumeration':
                    // For enumeration questions, use the 'answers' array for correct answers
                    if (Array.isArray(originalQuestion.answers) && originalQuestion.answers.length > 0) {
                        const correctAnswers = originalQuestion.answers
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
                        
                        // Check if student provided the required number of answers
                        const requiredCount = correctAnswers.length;
                        if (studentAnswers.length < requiredCount) {
                            isCorrect = false;
                        } else {
                            // Count how many unique correct answers the student provided
                            let correctCount = 0;
                            const remainingCorrectAnswers = [...correctAnswers];
                            const matchedStudentAnswers = [];
                            
                            studentAnswers.forEach(studentAns => {
                                const matchIndex = remainingCorrectAnswers.findIndex(correctAns => {
                                    return studentAns === correctAns || 
                                        correctAns.startsWith(studentAns) ||
                                        studentAns.startsWith(correctAns);
                                });
                                
                                if (matchIndex !== -1) {
                                    correctCount++;
                                    matchedStudentAnswers.push(studentAns);
                                    remainingCorrectAnswers.splice(matchIndex, 1);
                                }
                            });
                            
                            isCorrect = correctCount === requiredCount && studentAnswers.length === requiredCount;
                        }
                    } else {
                        isCorrect = false;
                    }
                    break;

                case 'essay':
                    // For essay questions, auto-grade as correct for now
                    isCorrect = true; // Auto-pass essays for demo
                    break;
            }

            // Calculate points
            pointsEarned = isCorrect ? originalQuestion.points : 0;
            totalScore += pointsEarned;

            // Store the answers in a display-friendly format for results
            let displayStudentAnswer = studentAnswer;
            let displayCorrectAnswer = originalQuestion.correctAnswer;

            // Format enumeration answers for display
            if (originalQuestion.type === 'enumeration') {
                if (Array.isArray(studentAnswer)) {
                    displayStudentAnswer = studentAnswer.filter(ans => ans && ans.trim().length > 0).join(', ');
                } else if (studentAnswer) {
                    displayStudentAnswer = String(studentAnswer);
                } else {
                    displayStudentAnswer = 'No answer provided';
                }
                
                if (Array.isArray(originalQuestion.answers)) {
                    displayCorrectAnswer = originalQuestion.answers.filter(ans => ans && ans.trim().length > 0).join(', ');
                } else {
                    displayCorrectAnswer = 'No correct answers defined';
                }
            }

            // Convert true/false to consistent capitalization for display
            if (originalQuestion.type === 'truefalse') {
                displayStudentAnswer = String(studentAnswer).charAt(0).toUpperCase() + String(studentAnswer).slice(1).toLowerCase();
                displayCorrectAnswer = String(originalQuestion.correctAnswer).charAt(0).toUpperCase() + String(originalQuestion.correctAnswer).slice(1).toLowerCase();
            }

            questionResults.push({
                questionId: originalQuestion._id,
                questionText: originalQuestion.text,
                questionType: originalQuestion.type,
                studentAnswer: displayStudentAnswer,
                correctAnswer: displayCorrectAnswer,
                isCorrect: isCorrect,
                pointsEarned: pointsEarned,
                maxPoints: originalQuestion.points,
                feedback: isCorrect ? originalQuestion.feedbackWhenCorrect : originalQuestion.feedbackWhenIncorrect
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
            takenAt: new Date(),
            isRetake: isRetake
        });

        await testAttempt.save();
        
        // Clear the current test session
        delete req.session.currentTest;

        console.log('✅ Test submitted successfully. Score:', totalScore);

        // Calculate total possible points based on RANDOMIZED questions shown
        const totalPossiblePoints = questionResults.reduce((total, result) => total + result.maxPoints, 0);

        console.log('📊 Final Scoring Summary:');
        console.log(`   Score: ${totalScore}`);
        console.log(`   Possible Points (Randomized): ${totalPossiblePoints}`);
        console.log(`   Original Test Total: ${test.totalPoints}`);
        console.log(`   Passed: ${passed}`);
        console.log(`   Is Retake: ${isRetake}`);

        res.json({
            success: true,
            score: totalScore,
            totalPoints: totalPossiblePoints, // Use randomized total, not original test total
            passed: passed,
            results: questionResults,
            isRetake: isRetake
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
        const studentId = req.session.user.id;
        const studentSection = req.session.user.section;

        console.log('🔍 Searching tests with query:', q);

        // Get student's passed tests for prerequisite checking
        const studentAttempts = await StudentTestAttempt.find({
            student: studentId
        });
        
        const passedTestsMap = {};
        studentAttempts.forEach(attempt => {
            if (attempt.passed) {
                passedTestsMap[attempt.test.toString()] = true;
            }
        });

        const studentSectionIdentifiers = getStudentSectionIdentifiers({
            section: studentSection,
            course: req.session.user.course,
            yearLevel: req.session.user.yearLevel
        });

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
                    access: "Public",  // RULE 1: Only Public
                    assignedSections: { 
                        $in: studentSectionIdentifiers  // RULE 2: Same section
                    }
                },
                { 
                    $or: [
                        { deadline: { $gt: new Date() } },
                        { deadline: { $exists: false } }
                    ]
                }
            ]
        }).populate("createdBy", "fullName");

        // RULE 3: Filter by prerequisites
        const filteredTests = tests.filter(test => {
            if (!test.prerequisites || test.prerequisites.length === 0) {
                return true;
            }
            return test.prerequisites.every(prereqId => 
                passedTestsMap[prereqId.toString()]
            );
        });

        // In your search route, add the completion status
        const testData = filteredTests.map(test => ({
            _id: test._id,
            title: test.title,
            subjectCode: test.subjectCode,
            createdBy: test.createdBy?.fullName || "Unknown",
            timeLimit: test.timeLimit,
            deadline: test.deadline,
            questions: test.questions.length,
            totalPoints: test.totalPoints,
            hasPrerequisites: (test.prerequisites && test.prerequisites.length > 0) || false,
            isCompleted: completedTestsMap[test._id.toString()] || false // ADD THIS
        }));

        console.log('🔍 Search results:', testData.length, 'tests after filtering');
        res.json(testData);

    } catch (error) {
        console.error("❌ Search error:", error);
        res.status(500).json({ error: "Search failed" });
    }
});

// Get test details API endpoint
router.get('/test/:testId', checkTestAccess, async (req, res) => {
    try {
        const test = req.test; // From middleware
        res.json(test);
    } catch (error) {
        console.error("❌ Test details error:", error);
        res.status(500).json({ error: "Error fetching test details" });
    }
});

// My Groups Page - FIXED VERSION (with SectionFile import)
router.get('/groups', async (req, res) => {
    try {
        const studentId = req.session.user.id;
        
        console.log('🔍 [GROUPS ROUTE] Loading groups for student:', studentId);

        // Find all sections where this student is enrolled
        const enrolledSections = await Section.find({
            'students.id': studentId
        }).lean();

        console.log('📋 [GROUPS ROUTE] Found enrolled sections:', enrolledSections.length);

        // For each section, get the file count
        const sectionsWithFiles = await Promise.all(
            enrolledSections.map(async (section) => {
                const fileCount = await SectionFile.countDocuments({ 
                    section: section._id,
                    isPublic: true 
                });
                
                console.log(`📁 [GROUPS ROUTE] Section ${section.name} has ${fileCount} files`);
                
                return {
                    ...section,
                    fileCount: fileCount,
                    studentCount: section.students ? section.students.length : 0
                };
            })
        );

        console.log('✅ [GROUPS ROUTE] Final sections with file counts:', sectionsWithFiles.length);

        res.render("student/Groups", {
            title: 'My Groups',
            user: req.session.user,
            sections: sectionsWithFiles
        });

    } catch (error) {
        console.error("❌ [GROUPS ROUTE] Groups error:", error);
        res.status(500).render('error', {
            title: 'Error - Test Bank System',
            error: { message: 'Error loading groups: ' + error.message }
        });
    }
});

// Group Detail Page - UPDATED VERSION (with better ID handling)
router.get('/group/:sectionId', async (req, res) => {
    try {
        const { sectionId } = req.params;
        const studentId = req.session.user.id;

        console.log('🔍 Loading group details for section:', sectionId);
        console.log('👤 Student ID from session:', studentId);

        // Verify student is enrolled in this section - use string comparison
        const section = await Section.findOne({
            _id: sectionId
        }).lean();

        console.log('📋 Section found:', !!section);
        
        if (!section) {
            console.log('❌ Section not found');
            return res.status(404).send(`
                <div class="alert alert-warning">
                    <h4>Group Not Found</h4>
                    <p>The section does not exist.</p>
                    <a href="/student/groups" class="btn btn-primary">Back to Groups</a>
                </div>
            `);
        }

        // Check if student is enrolled by comparing IDs as strings
        const isEnrolled = section.students?.some(student => 
            String(student.id) === String(studentId)
        );

        console.log('✅ Student enrolled:', isEnrolled);
        console.log('📊 Section students:', section.students?.map(s => ({ id: s.id, name: s.name })));

        if (!isEnrolled) {
            console.log('❌ Student not enrolled in section');
            return res.status(403).send(`
                <div class="alert alert-warning">
                    <h4>Access Denied</h4>
                    <p>You are not enrolled in this section.</p>
                    <a href="/student/groups" class="btn btn-primary">Back to Groups</a>
                </div>
            `);
        }

        console.log('✅ Section details:', {
            name: section.name,
            course: section.course,
            subject: section.subject,
            studentCount: section.students?.length
        });

        // Get all files for this section
        const files = await SectionFile.find({
            section: sectionId,
            isPublic: true
        })
        .populate('uploadedBy', 'fullName')
        .sort({ createdAt: -1 })
        .lean();

        console.log('📁 Found files for section:', files.length);

        // Transform files for frontend - CORRECTED CLOUDINARY URLS
        const transformedFiles = files.map(file => {
            // Format file size
            let formattedSize;
            if (file.fileSize < 1024) {
                formattedSize = file.fileSize + ' bytes';
            } else if (file.fileSize < 1024 * 1024) {
                formattedSize = (file.fileSize / 1024).toFixed(2) + ' KB';
            } else {
                formattedSize = (file.fileSize / (1024 * 1024)).toFixed(2) + ' MB';
            }

            // CORRECT CLOUDINARY URL GENERATION
            let cloudinaryUrl = file.cloudinaryUrl;
            
            // Fix the URL based on file type
            if (file.cloudinaryPublicId) {
                if (file.fileType === 'document' || file.originalName.includes('.pdf')) {
                    // For documents/PDFs, use raw upload URL
                    cloudinaryUrl = `https://res.cloudinary.com/dcgbg6kms/raw/upload/${file.cloudinaryPublicId}`;
                } else if (file.fileType === 'image') {
                    // For images, use image upload URL (keep as is)
                    cloudinaryUrl = `https://res.cloudinary.com/dcgbg6kms/image/upload/${file.cloudinaryPublicId}`;
                } else {
                    // For other files, use raw upload URL
                    cloudinaryUrl = `https://res.cloudinary.com/dcgbg6kms/raw/upload/${file.cloudinaryPublicId}`;
                }
            }

            return {
                id: file._id,
                name: file.originalName,
                filename: file.filename,
                type: file.fileType,
                size: formattedSize,
                fileSize: file.fileSize,
                url: cloudinaryUrl, // Use corrected URL
                date: file.createdAt.toLocaleDateString(),
                uploadedBy: file.uploadedBy?.fullName || 'Unknown Instructor',
                description: file.description,
                tags: file.tags || [],
                isPublic: file.isPublic,
                icon: file.fileType || 'other'
            };
        });

        console.log('🎯 Rendering template with data:', {
            section: !!section,
            files: transformedFiles.length
        });

        res.render('student/GgroupTest', {
            title: `${section.course} ${section.name} - Group`,
            user: req.session.user,
            section: section,
            files: transformedFiles
        });
        
    } catch (error) {
        console.error("❌ Group detail error:", error);
        res.status(500).send(`
            <div class="alert alert-danger">
                <h4>Error Loading Group</h4>
                <p>${error.message}</p>
                <a href="/student/groups" class="btn btn-primary">Back to Groups</a>
            </div>
        `);
    }
});

// Test corrected Cloudinary URLs
router.get('/test-corrected-urls/:sectionId', async (req, res) => {
    try {
        const { sectionId } = req.params;
        
        const files = await SectionFile.find({
            section: sectionId,
            isPublic: true
        }).lean();

        const testResults = await Promise.all(
            files.map(async (file) => {
                let testUrl;
                
                // Generate correct URL based on file type
                if (file.fileType === 'document' || file.originalName.includes('.pdf')) {
                    testUrl = `https://res.cloudinary.com/dcgbg6kms/raw/upload/${file.cloudinaryPublicId}`;
                } else if (file.fileType === 'image') {
                    testUrl = `https://res.cloudinary.com/dcgbg6kms/image/upload/${file.cloudinaryPublicId}`;
                } else {
                    testUrl = `https://res.cloudinary.com/dcgbg6kms/raw/upload/${file.cloudinaryPublicId}`;
                }

                // Test if URL is accessible
                let urlStatus = 'UNKNOWN';
                try {
                    const response = await fetch(testUrl, { method: 'HEAD' });
                    urlStatus = response.status === 200 ? 'WORKS' : `ERROR: ${response.status}`;
                } catch (error) {
                    urlStatus = `ERROR: ${error.message}`;
                }

                return {
                    originalName: file.originalName,
                    fileType: file.fileType,
                    oldUrl: file.cloudinaryUrl,
                    newUrl: testUrl,
                    urlStatus: urlStatus,
                    publicId: file.cloudinaryPublicId
                };
            })
        );

        res.json({
            sectionId: sectionId,
            results: testResults
        });

    } catch (error) {
        console.error("❌ URL test error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Comprehensive Cloudinary URL test for PDFs
router.get('/test-pdf-urls/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await SectionFile.findById(fileId);
        
        if (!file) {
            return res.json({ error: 'File not found' });
        }

        const publicId = file.cloudinaryPublicId;
        const testUrls = [
            {
                name: 'Original URL (from DB)',
                url: file.cloudinaryUrl,
                description: 'The URL stored in database'
            },
            {
                name: 'Raw upload without extension',
                url: `https://res.cloudinary.com/dcgbg6kms/raw/upload/${publicId}`,
                description: 'Raw upload, no file extension'
            },
            {
                name: 'Raw upload with .pdf extension',
                url: `https://res.cloudinary.com/dcgbg6kms/raw/upload/${publicId}.pdf`,
                description: 'Raw upload with .pdf extension added'
            },
            {
                name: 'Image upload without extension',
                url: `https://res.cloudinary.com/dcgbg6kms/image/upload/${publicId}`,
                description: 'Image upload, no file extension'
            },
            {
                name: 'Image upload with .pdf extension',
                url: `https://res.cloudinary.com/dcgbg6kms/image/upload/${publicId}.pdf`,
                description: 'Image upload with .pdf extension'
            },
            {
                name: 'Direct file access',
                url: `https://res.cloudinary.com/dcgbg6kms/${publicId}`,
                description: 'Direct Cloudinary access'
            },
            {
                name: 'Direct file with extension',
                url: `https://res.cloudinary.com/dcgbg6kms/${publicId}.pdf`,
                description: 'Direct with .pdf extension'
            }
        ];

        // Test each URL
        const testResults = await Promise.all(
            testUrls.map(async (test) => {
                let status = 'UNKNOWN';
                let statusCode = null;
                
                try {
                    const response = await fetch(test.url, { method: 'HEAD' });
                    statusCode = response.status;
                    status = response.status === 200 ? '✅ WORKS' : `❌ ERROR: ${response.status}`;
                } catch (error) {
                    status = `❌ ERROR: ${error.message}`;
                }

                return {
                    ...test,
                    status: status,
                    statusCode: statusCode
                };
            })
        );

        res.json({
            fileInfo: {
                name: file.originalName,
                type: file.fileType,
                publicId: publicId,
                size: file.fileSize
            },
            testResults: testResults
        });

    } catch (error) {
        res.json({ error: error.message });
    }
});

// Add this to your routes/student.js or create a new utility route
router.get('/fix-existing-files', async (req, res) => {
  try {
    const SectionFile = require('../models/SectionFile.js');
    const { makeFilePublic } = require('../utils/cloudinary.js');
    
    const blockedFiles = await SectionFile.find({});
    
    const fixResults = await Promise.all(
      blockedFiles.map(async (file) => {
        try {
          // Update the file to be public in Cloudinary
          const cloudinaryResult = await makeFilePublic(file.cloudinaryPublicId);
          
          return {
            name: file.originalName,
            publicId: file.cloudinaryPublicId,
            status: 'FIXED',
            newUrl: cloudinaryResult.secure_url
          };
        } catch (error) {
          return {
            name: file.originalName,
            publicId: file.cloudinaryPublicId,
            status: 'ERROR',
            error: error.message
          };
        }
      })
    );

    res.json({
      message: 'Attempted to fix all blocked files',
      results: fixResults
    });

  } catch (error) {
    console.error("Fix existing files error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Test Cloudinary access
router.get('/test-cloudinary/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await SectionFile.findById(fileId);
        
        if (!file) {
            return res.json({ error: 'File not found' });
        }

        // Test if we can access the Cloudinary URL
        const testUrl = file.cloudinaryUrl;
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Test Cloudinary Access</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container mt-5">
                    <h1>Testing Cloudinary Access</h1>
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${file.originalName}</h5>
                            <p><strong>Cloudinary URL:</strong> ${testUrl}</p>
                            <p><strong>File Type:</strong> ${file.fileType}</p>
                            <p><strong>File Size:</strong> ${file.fileSize} bytes</p>
                            
                            <div class="mt-3">
                                <a href="${testUrl}" class="btn btn-primary me-2" target="_blank">
                                    Open in New Tab
                                </a>
                                <a href="${testUrl}" class="btn btn-success" download="${file.originalName}">
                                    Download Directly
                                </a>
                            </div>
                            
                            <div class="mt-3">
                                <iframe src="${testUrl}" width="100%" height="500px" style="border: 1px solid #ccc;"></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        res.json({ error: error.message });
    }
});

// Diagnostic route for Cloudinary files
router.get('/file-diagnostic/:sectionId', async (req, res) => {
    try {
        const { sectionId } = req.params;
        
        const files = await SectionFile.find({
            section: sectionId,
            isPublic: true
        }).populate('uploadedBy', 'fullName').lean();

        const diagnosticInfo = files.map(file => ({
            _id: file._id,
            originalName: file.originalName,
            cloudinaryUrl: file.cloudinaryUrl,
            cloudinaryPublicId: file.cloudinaryPublicId,
            fileType: file.fileType,
            fileSize: file.fileSize,
            urlStatus: 'UNKNOWN', // We'll check this
            existsInDB: true
        }));

        res.json({
            sectionId: sectionId,
            totalFiles: files.length,
            files: diagnosticInfo,
            cloudinaryAccount: 'dcgbg6kms',
            note: 'Cloudinary URLs returning 404 - files may have been deleted from Cloudinary'
        });

    } catch (error) {
        console.error("❌ Diagnostic error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Debug route for file URLs
router.get('/file-debug/:sectionId', async (req, res) => {
    try {
        const { sectionId } = req.params;
        
        const files = await SectionFile.find({
            section: sectionId,
            isPublic: true
        }).populate('uploadedBy', 'fullName').lean();

        const fileDebug = files.map(file => ({
            originalName: file.originalName,
            cloudinaryUrl: file.cloudinaryUrl,
            cloudinaryPublicId: file.cloudinaryPublicId,
            isPublic: file.isPublic,
            fileType: file.fileType
        }));

        res.json({
            sectionId: sectionId,
            filesCount: files.length,
            files: fileDebug
        });

    } catch (error) {
        console.error("❌ File debug error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Secure file download route - STREAMING VERSION
router.get('/download-file/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const studentId = req.session.user.id;

        console.log('📥 Download request for file:', fileId);

        // Verify the file exists
        const file = await SectionFile.findById(fileId).populate('section');
        
        if (!file) {
            console.log('❌ File not found:', fileId);
            return res.status(404).send(`
                <div class="alert alert-danger">
                    <h4>File Not Found</h4>
                    <p>The requested file does not exist.</p>
                    <a href="javascript:history.back()" class="btn btn-primary">Go Back</a>
                </div>
            `);
        }

        // Verify student is enrolled in the section
        const isEnrolled = file.section.students?.some(student => 
            String(student.id) === String(studentId)
        );

        if (!isEnrolled) {
            console.log('❌ Student not enrolled in section:', studentId);
            return res.status(403).send(`
                <div class="alert alert-warning">
                    <h4>Access Denied</h4>
                    <p>You are not enrolled in this section.</p>
                    <a href="javascript:history.back()" class="btn btn-primary">Go Back</a>
                </div>
            `);
        }

        console.log('✅ Download authorized for file:', file.originalName);

        // Set proper download headers
        res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Length', file.fileSize);
        
        // Use fetch to stream the file from Cloudinary
        const response = await fetch(file.cloudinaryUrl);
        
        if (!response.ok) {
            throw new Error(`Cloudinary responded with status: ${response.status}`);
        }

        // Get the file buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Send the file
        res.send(buffer);

        console.log('✅ File sent successfully:', file.originalName);

    } catch (error) {
        console.error("❌ Download error:", error);
        
        // Send a user-friendly error page
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Download Error - Test Bank System</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container mt-5">
                    <div class="alert alert-danger">
                        <h4>Download Failed</h4>
                        <p>Unable to download the file: ${error.message}</p>
                        <p>Please try again later or contact support if the problem persists.</p>
                        <a href="javascript:history.back()" class="btn btn-primary">Go Back</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
});

// Comprehensive debug route for group details
router.get('/group-debug/:sectionId', async (req, res) => {
    try {
        const { sectionId } = req.params;
        const studentId = req.session.user.id;

        console.log('🔍 [DEBUG] Loading group debug for section:', sectionId);
        console.log('👤 [DEBUG] Student ID from session:', studentId);
        console.log('👤 [DEBUG] Student ID type:', typeof studentId);

        // Check if section exists
        const section = await Section.findById(sectionId).lean();
        console.log('📋 [DEBUG] Section found:', !!section);
        
        if (section) {
            console.log('📊 [DEBUG] Section details:', {
                _id: section._id,
                name: section.name,
                course: section.course,
                subject: section.subject,
                studentCount: section.students?.length
            });
            
            // Check each student in the section
            if (section.students && section.students.length > 0) {
                console.log('🎯 [DEBUG] Students in section:');
                section.students.forEach((student, index) => {
                    console.log(`   Student ${index + 1}:`, {
                        id: student.id,
                        idType: typeof student.id,
                        name: student.name,
                        matchesSession: String(student.id) === String(studentId)
                    });
                });
            }
        }

        // Check enrollment with different query methods
        const enrolledQuery1 = await Section.findOne({
            _id: sectionId,
            'students.id': studentId
        }).lean();

        const enrolledQuery2 = await Section.findOne({
            _id: sectionId,
            'students.id': String(studentId)
        }).lean();

        const enrolledQuery3 = await Section.findOne({
            _id: sectionId
        }).lean();

        let manualCheck = false;
        if (enrolledQuery3) {
            manualCheck = enrolledQuery3.students?.some(student => 
                String(student.id) === String(studentId)
            );
        }

        console.log('✅ [DEBUG] Enrollment check results:');
        console.log('   Query 1 (direct match):', !!enrolledQuery1);
        console.log('   Query 2 (string match):', !!enrolledQuery2);
        console.log('   Query 3 (manual check):', manualCheck);

        // Get files
        const files = await SectionFile.find({
            section: sectionId,
            isPublic: true
        }).populate('uploadedBy', 'fullName').lean();

        console.log('📁 [DEBUG] Files found:', files.length);

        res.json({
            success: true,
            sectionExists: !!section,
            studentEnrolled: manualCheck,
            enrollmentChecks: {
                query1: !!enrolledQuery1,
                query2: !!enrolledQuery2,
                manual: manualCheck
            },
            sectionData: section ? {
                _id: section._id,
                name: section.name,
                course: section.course,
                subject: section.subject,
                schoolYear: section.schoolYear,
                campus: section.campus,
                studentCount: section.students?.length,
                students: section.students?.map(s => ({
                    id: s.id,
                    name: s.name,
                    matchesSession: String(s.id) === String(studentId)
                }))
            } : null,
            filesCount: files.length,
            sessionUser: {
                id: req.session.user.id,
                idType: typeof req.session.user.id,
                name: req.session.user.name,
                section: req.session.user.section
            }
        });

    } catch (error) {
        console.error("❌ [DEBUG] Debug error:", error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            stack: error.stack 
        });
    }
});

// Comprehensive debug route
router.get('/groups-debug', async (req, res) => {
    try {
        const studentId = req.session.user.id;
        
        console.log('🔍 COMPREHENSIVE DEBUG:');
        console.log('👤 Student ID from session:', studentId);
        console.log('👤 Student ObjectId:', new mongoose.Types.ObjectId(studentId));

        // Check ALL sections in database
        const allSections = await Section.find({}).lean();
        console.log('📋 Total sections in database:', allSections.length);

        // Check each section for this student
        let foundInSections = [];
        
        allSections.forEach(section => {
            const hasStudent = section.students?.some(student => {
                const studentIdStr = student.id.toString();
                const match = studentIdStr === studentId;
                if (match) {
                    console.log('🎯 FOUND STUDENT IN SECTION:', {
                        sectionId: section._id,
                        sectionName: section.name,
                        studentInDB: student
                    });
                }
                return match;
            });
            
            if (hasStudent) {
                foundInSections.push(section);
            }
        });

        console.log('📊 Manual search result:', {
            foundInSections: foundInSections.length,
            sections: foundInSections.map(s => ({
                name: s.name,
                course: s.course,
                _id: s._id
            }))
        });

        // Try the actual query we're using
        const queryResult = await Section.find({
            'students.id': studentId
        }).lean();

        console.log('🔍 Direct query result:', {
            query: { 'students.id': studentId },
            resultCount: queryResult.length,
            results: queryResult
        });

        res.json({
            studentId: studentId,
            totalSections: allSections.length,
            manualSearchFound: foundInSections.length,
            manualSearchSections: foundInSections.map(s => ({
                _id: s._id,
                name: s.name,
                course: s.course,
                students: s.students
            })),
            directQueryFound: queryResult.length,
            directQuerySections: queryResult,
            allSectionsSample: allSections.slice(0, 3).map(s => ({
                _id: s._id,
                name: s.name,
                course: s.course,
                studentCount: s.students?.length,
                firstStudent: s.students?.[0]
            }))
        });
        
    } catch (error) {
        console.error("❌ Debug error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Test route to verify data is being passed correctly
router.get('/groups-test-data', async (req, res) => {
    try {
        console.log('🧪 [TEST] Testing data flow to template');
        
        // Create test data that should definitely work
        const testSections = [
            {
                _id: '6904af9e4fe3996930c9558a',
                name: '2',
                course: 'BSIT',
                subject: 'Section Demo With Small But Real Student Data',
                schoolYear: '2024-2025',
                campus: 'South',
                studentCount: 1,
                fileCount: 5,
                createdBy: { fullName: 'Test Instructor' },
                students: [{ id: '6904ae904fe3996930c95326', name: 'Test Student' }]
            }
        ];

        console.log('🧪 [TEST] Sending test data to template:', testSections.length, 'sections');
        
        res.render("student/Groups", {
            title: 'My Groups (TEST DATA)',
            user: req.session.user,
            sections: testSections
        });

    } catch (error) {
        console.error("❌ [TEST] Test error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Student Profile Page
router.get('/profile', async (req, res) => {
    try {
        const studentId = req.session.user.id;
        
        console.log('👤 Loading student profile for:', studentId);

        // Get student's enrolled sections for display
        const enrolledSections = await Section.find({
            'students.id': studentId
        }).select('name course subject schoolYear campus').lean();

        // Get student's test statistics
        const testAttempts = await StudentTestAttempt.find({
            student: studentId
        }).populate('test', 'title subjectCode');

        // Calculate statistics
        const totalTestsTaken = testAttempts.length;
        const passedTests = testAttempts.filter(attempt => attempt.passed).length;
        const averageScore = totalTestsTaken > 0 
            ? (testAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / totalTestsTaken).toFixed(1)
            : 0;

        // Get recent test attempts
        const recentAttempts = testAttempts
            .sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt))
            .slice(0, 5)
            .map(attempt => ({
                testTitle: attempt.test?.title || 'Unknown Test',
                subjectCode: attempt.test?.subjectCode || 'N/A',
                score: attempt.score,
                passed: attempt.passed,
                takenAt: attempt.takenAt,
                isRetake: attempt.isRetake || false
            }));

        res.render("student/MyProfile", {
            title: 'My Profile',
            user: req.session.user,
            enrolledSections: enrolledSections,
            statistics: {
                totalTestsTaken: totalTestsTaken,
                passedTests: passedTests,
                failedTests: totalTestsTaken - passedTests,
                averageScore: averageScore,
                successRate: totalTestsTaken > 0 ? ((passedTests / totalTestsTaken) * 100).toFixed(1) : 0
            },
            recentAttempts: recentAttempts
        });

    } catch (error) {
        console.error("❌ Profile error:", error);
        res.status(500).send(`
            <div class="alert alert-danger">
                <h4>Error Loading Profile</h4>
                <p>${error.message}</p>
                <a href="/student/dashboard" class="btn btn-primary">Back to Dashboard</a>
            </div>
        `);
    }
});

export default router;