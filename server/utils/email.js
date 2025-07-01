import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Email templates
const emailTemplates = {
  "email-verification": {
    subject: "Welcome to Bindisa Agritech - Verify Your Email",
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Bindisa Agritech</h1>
          <p style="color: #e5f3e8; margin: 10px 0 0 0;">Innovate. Cultivate. Elevate.</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #16a34a;">Welcome {{name}}!</h2>
          <p>Thank you for joining Bindisa Agritech. To complete your registration, please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{verificationUrl}}" style="background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">{{verificationUrl}}</p>
          <p>This link will expire in 24 hours for security reasons.</p>
        </div>
        <div style="padding: 20px; background-color: #16a34a; text-align: center;">
          <p style="color: white; margin: 0;">© 2024 Bindisa Agritech Pvt. Ltd. All rights reserved.</p>
        </div>
      </div>
    `,
  },

  "password-reset": {
    subject: "Bindisa Agritech - Password Reset Request",
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Bindisa Agritech</h1>
          <p style="color: #e5f3e8; margin: 10px 0 0 0;">Password Reset Request</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #16a34a;">Hello {{name}},</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetUrl}}" style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          <p>This link will expire in 10 minutes for security reasons.</p>
        </div>
        <div style="padding: 20px; background-color: #16a34a; text-align: center;">
          <p style="color: white; margin: 0;">© 2024 Bindisa Agritech Pvt. Ltd. All rights reserved.</p>
        </div>
      </div>
    `,
  },

  "soil-analysis-confirmation": {
    subject: "Soil Analysis Request Received - Sample {{sampleId}}",
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Bindisa Agritech</h1>
          <p style="color: #e5f3e8; margin: 10px 0 0 0;">Soil Analysis Laboratory</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #16a34a;">Dear {{name}},</h2>
          <p>We have received your soil sample for analysis. Here are the details:</p>
          <div style="background-color: white; padding: 20px; border-left: 4px solid #16a34a; margin: 20px 0;">
            <p><strong>Sample ID:</strong> {{sampleId}}</p>
            <p><strong>Status:</strong> Received and Processing</p>
            <p><strong>Expected Results:</strong> 24-48 hours</p>
          </div>
          <p>Our agricultural experts are analyzing your soil sample to provide:</p>
          <ul style="color: #666;">
            <li>Complete soil health assessment</li>
            <li>Nutrient level analysis (NPK + micronutrients)</li>
            <li>pH and organic matter content</li>
            <li>Crop-specific recommendations</li>
            <li>Fertilizer application guidelines</li>
          </ul>
          <p>You will receive an email notification once your results are ready.</p>
        </div>
        <div style="padding: 20px; background-color: #16a34a; text-align: center;">
          <p style="color: white; margin: 0;">© 2024 Bindisa Agritech Pvt. Ltd. All rights reserved.</p>
        </div>
      </div>
    `,
  },

  "soil-analysis-completed": {
    subject: "Your Soil Analysis Results are Ready! - Sample {{sampleId}}",
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Bindisa Agritech</h1>
          <p style="color: #e5f3e8; margin: 10px 0 0 0;">Soil Analysis Complete</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #16a34a;">Great News, {{name}}!</h2>
          <p>Your soil analysis is complete and the results are now available.</p>
          <div style="background-color: white; padding: 20px; border-left: 4px solid #16a34a; margin: 20px 0;">
            <p><strong>Sample ID:</strong> {{sampleId}}</p>
            <p><strong>Soil Health Score:</strong> {{healthScore}}/100</p>
            <p><strong>Status:</strong> Analysis Complete</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{reportUrl}}" style="background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Detailed Report</a>
          </div>
          <p>Your detailed report includes:</p>
          <ul style="color: #666;">
            <li>Complete nutrient analysis and recommendations</li>
            <li>Crop suitability assessment</li>
            <li>Fertilizer application schedule</li>
            <li>Soil improvement strategies</li>
            <li>Expected yield predictions</li>
          </ul>
        </div>
        <div style="padding: 20px; background-color: #16a34a; text-align: center;">
          <p style="color: white; margin: 0;">© 2024 Bindisa Agritech Pvt. Ltd. All rights reserved.</p>
        </div>
      </div>
    `,
  },
};

// Main email sending function
export const sendEmail = async ({ to, subject, template, data = {} }) => {
  try {
    const transporter = createTransporter();

    // Get template
    const emailTemplate = emailTemplates[template];
    if (!emailTemplate) {
      throw new Error(`Email template '${template}' not found`);
    }

    // Replace template variables
    let htmlContent = emailTemplate.template;
    let emailSubject = subject || emailTemplate.subject;

    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      htmlContent = htmlContent.replace(regex, data[key] || "");
      emailSubject = emailSubject.replace(regex, data[key] || "");
    });

    // Email options
    const mailOptions = {
      from: {
        name: process.env.FROM_NAME || "Bindisa Agritech",
        address: process.env.FROM_EMAIL || process.env.SMTP_USER,
      },
      to,
      subject: emailSubject,
      html: htmlContent,
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}:`, result.messageId);

    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
    };
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Send bulk emails
export const sendBulkEmails = async (emailList) => {
  const results = [];

  for (const emailData of emailList) {
    try {
      const result = await sendEmail(emailData);
      results.push({
        ...emailData,
        success: true,
        messageId: result.messageId,
      });
    } catch (error) {
      results.push({
        ...emailData,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
};

// Test email configuration
export const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { success: true, message: "Email configuration is valid" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Send notification to admins
export const sendAdminNotification = async (subject, message, data = {}) => {
  try {
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];

    if (adminEmails.length === 0) {
      console.warn("No admin emails configured");
      return;
    }

    const emailPromises = adminEmails.map((email) =>
      sendEmail({
        to: email.trim(),
        subject: `[Admin Alert] ${subject}`,
        template: "admin-notification",
        data: {
          subject,
          message,
          timestamp: new Date().toISOString(),
          ...data,
        },
      }),
    );

    await Promise.allSettled(emailPromises);
  } catch (error) {
    console.error("Admin notification error:", error);
  }
};

export default {
  sendEmail,
  sendBulkEmails,
  testEmailConnection,
  sendAdminNotification,
};
