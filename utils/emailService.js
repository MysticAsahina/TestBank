import nodemailer from 'nodemailer';

// Don't create transporter immediately - create it when needed
let transporter = null;

const createTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ EMAIL CREDENTIALS MISSING IN emailService!');
        console.error('EMAIL_USER:', process.env.EMAIL_USER);
        console.error('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);
        return null;
    }

    console.log('✅ Creating email transporter with:', process.env.EMAIL_USER);
    
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

export const sendOTPEmail = async (email, otpCode) => {
    try {
        // Create transporter if it doesn't exist
        if (!transporter) {
            transporter = createTransporter();
        }

        if (!transporter) {
            throw new Error('Email transporter not configured. Check your .env file.');
        }

        console.log(`📧 Attempting to send OTP to: ${email}`);
        console.log(`🔑 Using email account: ${process.env.EMAIL_USER}`);
        
        // Verify SMTP connection first
        console.log('🔌 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified');

        const mailOptions = {
            from: {
                name: 'Test Bank System',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: 'Student Registration OTP Verification',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { text-align: center; background: #0d6efd; color: white; padding: 20px; border-radius: 10px 10px 0 0; }
                        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                        .otp-code { 
                            font-size: 42px; 
                            font-weight: bold; 
                            color: #0d6efd; 
                            text-align: center; 
                            letter-spacing: 8px;
                            background: white;
                            padding: 20px;
                            border-radius: 10px;
                            margin: 20px 0;
                            border: 2px dashed #0d6efd;
                        }
                        .warning { 
                            color: #dc3545; 
                            font-weight: bold; 
                            text-align: center;
                            background: #ffe6e6;
                            padding: 10px;
                            border-radius: 5px;
                            border-left: 4px solid #dc3545;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Student Registration Verification</h1>
                        </div>
                        <div class="content">
                            <p>Hello,</p>
                            <p>Thank you for registering as a student in our Test Bank System. Please use the OTP code below to verify your email address:</p>
                            
                            <div class="otp-code">${otpCode}</div>
                            
                            <div class="warning">
                                ⚠️ This OTP will expire in 10 minutes
                            </div>
                            
                            <p>If you didn't request this registration, please ignore this email.</p>
                            <p>Best regards,<br>Test Bank System Team</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        // Send email
        console.log('📨 Sending email...');
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${email}`);
        console.log(`📨 Message ID: ${info.messageId}`);
        return true;

    } catch (error) {
        console.error('❌ Email sending failed:', error);
        
        // More specific error messages
        if (error.code === 'EAUTH') {
            throw new Error('Email authentication failed. Please check your email credentials.');
        } else if (error.code === 'ECONNECTION') {
            throw new Error('Cannot connect to email server. Please check your internet connection.');
        } else {
            throw new Error(`Email service error: ${error.message}`);
        }
    }
};

export const verifyOTP = (storedOTP, receivedOTP) => {
    return storedOTP === receivedOTP;
};