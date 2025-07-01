import { createErrorResponse } from "../utils/response.js";

// Joi validation middleware
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }));

      return res
        .status(400)
        .json(createErrorResponse("Validation failed", validationErrors));
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Custom validation for specific fields
export const validateObjectId = (field = "id") => {
  return (req, res, next) => {
    const id = req.params[field];

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res
        .status(400)
        .json(createErrorResponse(`Invalid ${field} format`));
    }

    next();
  };
};

// File validation middleware
export const validateFile = (options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ["image/jpeg", "image/png", "image/gif"],
    required = false,
  } = options;

  return (req, res, next) => {
    if (!req.file && !req.files) {
      if (required) {
        return res.status(400).json(createErrorResponse("File is required"));
      }
      return next();
    }

    const files = req.files || [req.file];

    for (const file of files) {
      if (file.size > maxSize) {
        return res
          .status(400)
          .json(
            createErrorResponse(
              `File size exceeds limit of ${maxSize / 1024 / 1024}MB`,
            ),
          );
      }

      if (!allowedTypes.includes(file.mimetype)) {
        return res
          .status(400)
          .json(
            createErrorResponse(
              `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`,
            ),
          );
      }
    }

    next();
  };
};

// Query validation middleware
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }));

      return res
        .status(400)
        .json(createErrorResponse("Query validation failed", validationErrors));
    }

    req.query = value;
    next();
  };
};

// Sanitize input middleware
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === "string") {
      // Remove potential XSS characters
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "");
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    if (obj && typeof obj === "object") {
      const sanitized = {};
      Object.keys(obj).forEach((key) => {
        sanitized[key] = sanitize(obj[key]);
      });
      return sanitized;
    }

    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  next();
};

export default {
  validate,
  validateObjectId,
  validateFile,
  validateQuery,
  sanitizeInput,
};
