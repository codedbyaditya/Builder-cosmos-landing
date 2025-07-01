import express from "express";
import { sendEmail } from "../utils/email.js";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/response.js";
import { optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validation.js";
import Joi from "joi";

const router = express.Router();

// Contact form schema
const contactSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().optional().allow(""),
  subject: Joi.string().min(5).max(200).required(),
  message: Joi.string().min(10).max(2000).required(),
  farmDetails: Joi.object({
    farmSize: Joi.string().optional(),
    location: Joi.string().optional(),
    crops: Joi.string().optional(),
  }).optional(),
});

// Submit contact form
router.post("/", optionalAuth, validate(contactSchema), async (req, res) => {
  try {
    const { name, email, phone, subject, message, farmDetails } = req.body;

    // Send email to admin
    await sendEmail({
      to:
        process.env.ADMIN_EMAILS?.split(",")[0] || "admin@bindisa-agritech.com",
      subject: `New Contact Form Submission: ${subject}`,
      template: "contact-form",
      data: {
        name,
        email,
        phone: phone || "Not provided",
        subject,
        message,
        farmSize: farmDetails?.farmSize || "Not specified",
        location: farmDetails?.location || "Not specified",
        crops: farmDetails?.crops || "Not specified",
        timestamp: new Date().toISOString(),
      },
    });

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: "Thank you for contacting Bindisa Agritech",
      template: "contact-confirmation",
      data: {
        name,
        subject,
      },
    });

    res.json(
      createSuccessResponse(
        "Thank you for your message! We'll get back to you within 24 hours.",
      ),
    );
  } catch (error) {
    console.error("Contact form error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to send message", error.message));
  }
});

// Get contact information
router.get("/info", (req, res) => {
  res.json(
    createSuccessResponse("Contact information", {
      email: "info@bindisaagritech.com",
      phone: "+91 9631157174",
      address: {
        line1: "Village: Bishunpur Buzurg",
        line2: "Post: Dumri",
        city: "Gaya",
        state: "Bihar",
        pincode: "823003",
        country: "India",
      },
      socialMedia: {
        linkedin: "https://www.linkedin.com/company/bindisa-agritech-pvt-ltd/",
        instagram: "https://www.instagram.com/bindisaagritech/",
        facebook: "https://www.facebook.com/bindisaagritech",
        twitter: "https://twitter.com/bindisaagritech",
      },
      businessHours: {
        monday: "9:00 AM - 6:00 PM",
        tuesday: "9:00 AM - 6:00 PM",
        wednesday: "9:00 AM - 6:00 PM",
        thursday: "9:00 AM - 6:00 PM",
        friday: "9:00 AM - 6:00 PM",
        saturday: "9:00 AM - 2:00 PM",
        sunday: "Closed",
      },
    }),
  );
});

export default router;
