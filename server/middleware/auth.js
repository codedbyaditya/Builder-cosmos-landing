import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { createErrorResponse } from "../utils/response.js";

// Standard authentication middleware - requires valid token
export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res
        .status(401)
        .json(createErrorResponse("Access denied. No token provided."));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res
        .status(401)
        .json(createErrorResponse("Invalid token. User not found."));
    }

    if (!user.isActive) {
      return res
        .status(401)
        .json(createErrorResponse("Account has been deactivated."));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json(createErrorResponse("Invalid token."));
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json(createErrorResponse("Token has expired."));
    }

    console.error("Authentication error:", error);
    res
      .status(500)
      .json(createErrorResponse("Authentication failed", error.message));
  }
};

// Optional authentication - doesn't fail if no token provided
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    req.user = null;
    next();
  }
};

// Role-based authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json(createErrorResponse("Access denied. Authentication required."));
    }

    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json(
          createErrorResponse(
            `Access denied. Required roles: ${roles.join(", ")}`,
          ),
        );
    }

    next();
  };
};

// Admin only middleware
export const adminOnly = authorize("admin");

// Agent or Admin middleware
export const agentOrAdmin = authorize("agent", "admin");

// Premium user middleware
export const premiumOnly = (req, res, next) => {
  if (!req.user) {
    return res
      .status(401)
      .json(createErrorResponse("Access denied. Authentication required."));
  }

  if (!req.user.subscription || req.user.subscription.plan === "free") {
    return res
      .status(403)
      .json(
        createErrorResponse(
          "Access denied. Premium subscription required for this feature.",
        ),
      );
  }

  if (req.user.subscription.status !== "active") {
    return res
      .status(403)
      .json(
        createErrorResponse("Access denied. Your subscription is not active."),
      );
  }

  next();
};

// Check if user owns the resource
export const ensureResourceOwnership = (resourceIdParam = "id") => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json(createErrorResponse("Authentication required."));
    }

    const resourceId = req.params[resourceIdParam];
    const userId = req.user.id;

    // Admin can access all resources
    if (req.user.role === "admin") {
      return next();
    }

    // For other users, check ownership
    if (resourceId !== userId) {
      return res
        .status(403)
        .json(
          createErrorResponse(
            "Access denied. You can only access your own resources.",
          ),
        );
    }

    next();
  };
};

// Rate limiting by user
export const userRateLimit = (requestsPerMinute = 60) => {
  const userRequests = new Map();

  return (req, res, next) => {
    const identifier = req.user?.id || req.ip;
    const now = Date.now();
    const minute = Math.floor(now / 60000);

    const userKey = `${identifier}_${minute}`;

    if (!userRequests.has(userKey)) {
      userRequests.set(userKey, 1);
    } else {
      const count = userRequests.get(userKey);
      if (count >= requestsPerMinute) {
        return res
          .status(429)
          .json(
            createErrorResponse("Rate limit exceeded. Please try again later."),
          );
      }
      userRequests.set(userKey, count + 1);
    }

    // Clean up old entries
    for (const [key] of userRequests) {
      const keyMinute = parseInt(key.split("_")[1]);
      if (minute - keyMinute > 5) {
        // Keep only last 5 minutes
        userRequests.delete(key);
      }
    }

    next();
  };
};

// Subscription check middleware
export const checkSubscriptionLimits = (feature) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(); // For anonymous users, basic limits apply
    }

    const subscription = req.user.subscription;
    const usage = req.user.usage || {};

    // Define limits based on subscription plan
    const limits = {
      free: {
        chatMessages: 50,
        soilAnalysis: 5,
        fileUploads: 10,
      },
      basic: {
        chatMessages: 200,
        soilAnalysis: 25,
        fileUploads: 50,
      },
      premium: {
        chatMessages: 1000,
        soilAnalysis: 100,
        fileUploads: 200,
      },
      enterprise: {
        chatMessages: -1, // unlimited
        soilAnalysis: -1,
        fileUploads: -1,
      },
    };

    const plan = subscription?.plan || "free";
    const limit = limits[plan][feature];

    if (limit !== -1 && usage[feature] >= limit) {
      return res.status(429).json(
        createErrorResponse(
          `${feature} limit exceeded for ${plan} plan. Please upgrade your subscription.`,
          {
            currentUsage: usage[feature],
            limit: limit,
            plan: plan,
          },
        ),
      );
    }

    next();
  };
};

// Helper function to extract token from request
const extractToken = (req) => {
  let token = null;

  // Check Authorization header
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.substring(7);
  }

  // Check cookies as fallback
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  // Check query parameter as last resort (not recommended for production)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  return token;
};

// Token verification utility
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

// Generate tokens
export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    },
  );

  return { accessToken, refreshToken };
};

export default {
  authenticate,
  optionalAuth,
  authorize,
  adminOnly,
  agentOrAdmin,
  premiumOnly,
  ensureResourceOwnership,
  userRateLimit,
  checkSubscriptionLimits,
  verifyToken,
  generateTokens,
};
