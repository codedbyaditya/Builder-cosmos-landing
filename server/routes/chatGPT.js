import express from "express";
import {
  sendChatMessage,
  getChatHistory,
  createChatSession,
  rateChatExperience,
  getChatAnalytics,
} from "../controllers/chatGPTController.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import {
  validateChatMessage,
  validateRating,
} from "../middleware/validation.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting for chat messages
const chatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 chat messages per minute
  message: {
    error:
      "Too many chat messages, please wait a moment before sending another message.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Premium users get higher limits
const premiumChatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // premium users get 50 messages per minute
  message: {
    error:
      "Rate limit reached. Please wait a moment before sending another message.",
  },
});

// Routes
/**
 * @route   POST /api/chatgpt/sessions
 * @desc    Create a new chat session
 * @access  Public (but tracks user if authenticated)
 */
router.post("/sessions", optionalAuth, createChatSession);

/**
 * @route   POST /api/chatgpt/message
 * @desc    Send a message to ChatGPT
 * @access  Public with rate limiting
 */
router.post(
  "/message",
  chatRateLimit,
  optionalAuth,
  validateChatMessage,
  sendChatMessage,
);

/**
 * @route   GET /api/chatgpt/sessions/:sessionId/history
 * @desc    Get chat history for a session
 * @access  Public (session-based)
 */
router.get("/sessions/:sessionId/history", optionalAuth, getChatHistory);

/**
 * @route   POST /api/chatgpt/sessions/:sessionId/rate
 * @desc    Rate the chat experience
 * @access  Public
 */
router.post(
  "/sessions/:sessionId/rate",
  optionalAuth,
  validateRating,
  rateChatExperience,
);

/**
 * @route   GET /api/chatgpt/analytics
 * @desc    Get chat analytics (Admin only)
 * @access  Private (Admin)
 */
router.get("/analytics", authenticate, getChatAnalytics);

export default router;
