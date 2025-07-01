import express from "express";
import {
  getOrCreateChatSession,
  sendMessage,
  getChatHistory,
  getUserChatSessions,
  markMessagesAsRead,
  rateChatSatisfaction,
  escalateToExpert,
  closeChatSession,
  getChatAnalytics,
} from "../controllers/chatController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Chat session management
router.post("/sessions", getOrCreateChatSession);
router.get("/sessions", getUserChatSessions);
router.get("/sessions/:sessionId/history", getChatHistory);
router.post("/sessions/:sessionId/close", closeChatSession);

// Message operations
router.post("/sessions/:sessionId/messages", sendMessage);
router.put("/sessions/:sessionId/read", markMessagesAsRead);

// Chat quality and escalation
router.post("/sessions/:sessionId/rate", rateChatSatisfaction);
router.post("/sessions/:sessionId/escalate", escalateToExpert);

// Admin analytics
router.get("/analytics", authorize("admin", "expert"), getChatAnalytics);

export default router;
