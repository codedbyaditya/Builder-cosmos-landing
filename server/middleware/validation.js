import Joi from "joi";
import { createErrorResponse } from "../utils/response.js";

// Chat message validation schema
const chatMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(2000).required().messages({
    "string.empty": "Message cannot be empty",
    "string.min": "Message must be at least 1 character long",
    "string.max": "Message cannot exceed 2000 characters",
    "any.required": "Message is required",
  }),

  language: Joi.string().valid("en", "hi", "mr").default("en").messages({
    "any.only": "Language must be one of: en, hi, mr",
  }),

  sessionId: Joi.string()
    .trim()
    .alphanum()
    .min(10)
    .max(100)
    .optional()
    .messages({
      "string.alphanum": "Session ID must contain only alphanumeric characters",
      "string.min": "Session ID must be at least 10 characters long",
      "string.max": "Session ID cannot exceed 100 characters",
    }),

  messageType: Joi.string()
    .valid("text", "image", "file", "location")
    .default("text")
    .optional(),

  metadata: Joi.object({
    platform: Joi.string().optional(),
    deviceInfo: Joi.string().optional(),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90),
      lng: Joi.number().min(-180).max(180),
    }).optional(),
  }).optional(),
});

// Rating validation schema
const ratingSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "number.base": "Rating must be a number",
    "number.integer": "Rating must be an integer",
    "number.min": "Rating must be at least 1",
    "number.max": "Rating cannot exceed 5",
    "any.required": "Rating is required",
  }),

  feedback: Joi.string().trim().max(500).optional().allow("").messages({
    "string.max": "Feedback cannot exceed 500 characters",
  }),

  messageId: Joi.string().optional().messages({
    "string.base": "Message ID must be a string",
  }),
});

// Contact form validation schema
const contactSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name cannot exceed 50 characters",
  }),

  email: Joi.string().email().trim().lowercase().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required",
  }),

  phone: Joi.string()
    .trim()
    .pattern(/^[+]?[\d\s-()]{10,15}$/)
    .optional()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),

  subject: Joi.string().trim().min(5).max(100).required().messages({
    "string.empty": "Subject is required",
    "string.min": "Subject must be at least 5 characters long",
    "string.max": "Subject cannot exceed 100 characters",
  }),

  message: Joi.string().trim().min(10).max(1000).required().messages({
    "string.empty": "Message is required",
    "string.min": "Message must be at least 10 characters long",
    "string.max": "Message cannot exceed 1000 characters",
  }),

  category: Joi.string()
    .valid("general", "technical", "support", "partnership", "feedback")
    .default("general")
    .optional(),

  priority: Joi.string()
    .valid("low", "medium", "high")
    .default("medium")
    .optional(),
});

// Soil analysis validation schema
const soilAnalysisSchema = Joi.object({
  location: Joi.object({
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.string().trim().max(200).optional(),
    district: Joi.string().trim().max(50).optional(),
    state: Joi.string().trim().max(50).optional(),
    pincode: Joi.string()
      .trim()
      .pattern(/^\d{6}$/)
      .optional(),
  }).required(),

  soilData: Joi.object({
    ph: Joi.number().min(0).max(14).required(),
    nitrogen: Joi.number().min(0).max(1000).required(),
    phosphorus: Joi.number().min(0).max(1000).required(),
    potassium: Joi.number().min(0).max(1000).required(),
    organicMatter: Joi.number().min(0).max(100).optional(),
    moisture: Joi.number().min(0).max(100).optional(),
    temperature: Joi.number().min(-10).max(60).optional(),
    conductivity: Joi.number().min(0).optional(),
  }).required(),

  cropType: Joi.string()
    .valid(
      "rice",
      "wheat",
      "corn",
      "cotton",
      "sugarcane",
      "tomato",
      "potato",
      "onion",
      "soybean",
      "other",
    )
    .optional(),

  seasonType: Joi.string().valid("kharif", "rabi", "zaid").optional(),

  previousCrop: Joi.string().trim().max(50).optional(),

  irrigationType: Joi.string()
    .valid("drip", "sprinkler", "flood", "furrow", "none")
    .optional(),

  farmSize: Joi.number().min(0).max(10000).optional(), // in acres

  soilType: Joi.string()
    .valid(
      "clay",
      "loam",
      "sand",
      "silt",
      "clayey_loam",
      "sandy_loam",
      "silty_loam",
    )
    .optional(),
});

// Generic validation middleware
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }));

      return res.status(400).json(
        createErrorResponse("Validation failed", {
          errors: errorDetails,
          totalErrors: errorDetails.length,
        }),
      );
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Specific validation middlewares
export const validateChatMessage = validate(chatMessageSchema);
export const validateRating = validate(ratingSchema);
export const validateContact = validate(contactSchema);
export const validateSoilAnalysis = validate(soilAnalysisSchema);

// Parameter validation
export const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const value = req.params[paramName];

    if (!value || !value.match(/^[0-9a-fA-F]{24}$/)) {
      return res
        .status(400)
        .json(createErrorResponse(`Invalid ${paramName} format`));
    }

    next();
  };
};

// Query validation
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json(
        createErrorResponse("Query validation failed", {
          errors: errorDetails,
        }),
      );
    }

    req.query = value;
    next();
  };
};

// Pagination validation
export const validatePagination = validateQuery(
  Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid("asc", "desc").default("desc"),
    sortBy: Joi.string().default("createdAt"),
  }),
);

// File upload validation
export const validateFileUpload = (
  allowedTypes = [],
  maxSize = 5 * 1024 * 1024,
) => {
  return (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res
        .status(400)
        .json(createErrorResponse("No files were uploaded"));
    }

    const file = req.files.file || req.files[Object.keys(req.files)[0]];

    // Check file size
    if (file.size > maxSize) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            `File size exceeds ${maxSize / (1024 * 1024)}MB limit`,
          ),
        );
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`,
          ),
        );
    }

    next();
  };
};

// Custom validation for specific business rules
export const validateBusinessRules = {
  // Ensure user can only access their own data
  ensureOwnership: (req, res, next) => {
    const userId = req.user?.id;
    const resourceUserId = req.body.userId || req.params.userId;

    if (userId !== resourceUserId && req.user?.role !== "admin") {
      return res
        .status(403)
        .json(
          createErrorResponse(
            "Access denied: You can only access your own data",
          ),
        );
    }

    next();
  },

  // Validate Indian phone number
  validateIndianPhone: (req, res, next) => {
    const phone = req.body.phone;

    if (phone && !phone.match(/^[+]?91[\d\s-()]{10,14}$/)) {
      return res
        .status(400)
        .json(
          createErrorResponse("Please provide a valid Indian phone number"),
        );
    }

    next();
  },

  // Validate coordinates are within India
  validateIndianCoordinates: (req, res, next) => {
    const location = req.body.location;

    if (location && location.coordinates) {
      const [lng, lat] = location.coordinates;

      // Rough bounds for India
      if (lat < 6 || lat > 38 || lng < 68 || lng > 98) {
        return res
          .status(400)
          .json(
            createErrorResponse("Location coordinates must be within India"),
          );
      }
    }

    next();
  },
};

export default {
  validate,
  validateChatMessage,
  validateRating,
  validateContact,
  validateSoilAnalysis,
  validateObjectId,
  validateQuery,
  validatePagination,
  validateFileUpload,
  validateBusinessRules,
};
