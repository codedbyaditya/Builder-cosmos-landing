import Joi from "joi";

// User registration schema
export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name cannot exceed 50 characters",
  }),

  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
  }),

  password: Joi.string().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters long",
  }),

  role: Joi.string().valid("user", "farmer", "expert").default("user"),

  phoneNumber: Joi.string()
    .pattern(/^[+]?[1-9][\d\s\-\(\)]{7,15}$/)
    .optional()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),

  farmDetails: Joi.when("role", {
    is: "farmer",
    then: Joi.object({
      farmName: Joi.string().max(100).optional(),
      farmSize: Joi.object({
        value: Joi.number().positive().required(),
        unit: Joi.string()
          .valid("acres", "hectares", "square_meters")
          .required(),
      }).optional(),
      cropTypes: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().required(),
            season: Joi.string()
              .valid("kharif", "rabi", "summer", "perennial")
              .optional(),
          }),
        )
        .optional(),
      soilType: Joi.string()
        .valid("clay", "sandy", "loamy", "silty", "peaty", "chalky")
        .optional(),
      irrigationType: Joi.string()
        .valid("drip", "sprinkler", "flood", "manual", "rainfed")
        .optional(),
    }).optional(),
    otherwise: Joi.forbidden(),
  }),
});

// User login schema
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
  }),

  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),

  rememberMe: Joi.boolean().optional().default(false),
});

// Change password schema
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.empty": "Current password is required",
  }),

  newPassword: Joi.string().min(6).required().messages({
    "string.empty": "New password is required",
    "string.min": "New password must be at least 6 characters long",
  }),
});

// Reset password schema
export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "string.empty": "Reset token is required",
  }),

  password: Joi.string().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters long",
  }),
});

// Email verification schema
export const emailVerificationSchema = Joi.object({
  token: Joi.string().required().messages({
    "string.empty": "Verification token is required",
  }),
});

// Forgot password schema
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
  }),
});

// Update profile schema
export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  phoneNumber: Joi.string()
    .pattern(/^[+]?[1-9][\d\s\-\(\)]{7,15}$/)
    .optional()
    .allow(""),

  address: Joi.object({
    street: Joi.string().max(200).optional().allow(""),
    city: Joi.string().max(100).optional().allow(""),
    state: Joi.string().max(100).optional().allow(""),
    postalCode: Joi.string().max(20).optional().allow(""),
    country: Joi.string().max(100).optional().default("India"),
  }).optional(),

  farmDetails: Joi.object({
    farmName: Joi.string().max(100).optional().allow(""),
    farmSize: Joi.object({
      value: Joi.number().positive().required(),
      unit: Joi.string().valid("acres", "hectares", "square_meters").required(),
    }).optional(),
    cropTypes: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          season: Joi.string()
            .valid("kharif", "rabi", "summer", "perennial")
            .optional(),
        }),
      )
      .optional(),
    soilType: Joi.string()
      .valid("clay", "sandy", "loamy", "silty", "peaty", "chalky")
      .optional(),
    irrigationType: Joi.string()
      .valid("drip", "sprinkler", "flood", "manual", "rainfed")
      .optional(),
  }).optional(),

  preferences: Joi.object({
    language: Joi.string().valid("en", "hi", "mr").optional(),
    notifications: Joi.object({
      email: Joi.boolean().optional(),
      sms: Joi.boolean().optional(),
      push: Joi.boolean().optional(),
    }).optional(),
    units: Joi.object({
      temperature: Joi.string().valid("celsius", "fahrenheit").optional(),
      measurement: Joi.string().valid("metric", "imperial").optional(),
    }).optional(),
  }).optional(),
}).min(1);
