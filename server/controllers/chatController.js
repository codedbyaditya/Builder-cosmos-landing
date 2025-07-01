import Chat from "../models/Chat.js";
import User from "../models/User.js";
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
} from "../utils/response.js";

// Create or get chat session
export const getOrCreateChatSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic = "general", category = "query" } = req.body;

    // Check for existing active session
    let chatSession = await Chat.findOne({
      user: userId,
      status: "active",
      topic,
    }).sort({ lastActivity: -1 });

    if (!chatSession) {
      // Create new session
      const sessionId = `chat_${userId}_${Date.now()}`;
      chatSession = await Chat.create({
        user: userId,
        sessionId,
        topic,
        category,
        status: "active",
        messages: [],
      });
    }

    res.json(
      createSuccessResponse("Chat session ready", {
        session: chatSession,
      }),
    );
  } catch (error) {
    console.error("Get chat session error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to get chat session", error.message));
  }
};

// Send message in chat
export const sendMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, messageType = "text", attachments = [] } = req.body;
    const userId = req.user.id;

    const chatSession = await Chat.findOne({
      sessionId,
      user: userId,
    });

    if (!chatSession) {
      return res
        .status(404)
        .json(createErrorResponse("Chat session not found"));
    }

    // Add user message
    const userMessage = chatSession.addMessage({
      sender: "user",
      message: {
        text: message,
        language: req.headers["x-lang"] || "en",
      },
      messageType,
      attachments,
    });

    // Generate bot response (simplified AI logic)
    const botResponse = await generateBotResponse(message, chatSession.topic);

    const botMessage = chatSession.addMessage({
      sender: "bot",
      message: {
        text: botResponse.text,
        language: req.headers["x-lang"] || "en",
      },
      messageType: botResponse.type || "text",
      quickReplies: botResponse.quickReplies || [],
      metadata: {
        intent: botResponse.intent,
        confidence: botResponse.confidence,
      },
    });

    await chatSession.save();

    res.json(
      createSuccessResponse("Message sent successfully", {
        userMessage,
        botMessage,
        sessionId: chatSession.sessionId,
      }),
    );
  } catch (error) {
    console.error("Send message error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to send message", error.message));
  }
};

// Get chat history
export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user.id;

    const chatSession = await Chat.findOne({
      sessionId,
      user: userId,
    });

    if (!chatSession) {
      return res
        .status(404)
        .json(createErrorResponse("Chat session not found"));
    }

    let messages = chatSession.messages;

    if (before) {
      const beforeDate = new Date(before);
      messages = messages.filter((msg) => msg.timestamp < beforeDate);
    }

    messages = messages.slice(-parseInt(limit));

    res.json(
      createSuccessResponse("Chat history fetched successfully", {
        messages,
        sessionId,
        totalMessages: chatSession.messages.length,
        hasMore: chatSession.messages.length > parseInt(limit),
      }),
    );
  } catch (error) {
    console.error("Get chat history error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to fetch chat history", error.message));
  }
};

// Get user's chat sessions
export const getUserChatSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    const sessions = await Chat.find(query)
      .sort({ lastActivity: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select("sessionId topic status lastActivity messages analytics");

    const total = await Chat.countDocuments(query);

    const sessionsWithLastMessage = sessions.map((session) => ({
      ...session.toObject(),
      lastMessage: session.lastMessage,
      unreadCount: session.unreadCount,
    }));

    res.json(
      createPaginatedResponse(
        "Chat sessions fetched successfully",
        sessionsWithLastMessage,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
        },
      ),
    );
  } catch (error) {
    console.error("Get chat sessions error:", error);
    res
      .status(500)
      .json(
        createErrorResponse("Failed to fetch chat sessions", error.message),
      );
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messageIds } = req.body;
    const userId = req.user.id;

    const chatSession = await Chat.findOne({
      sessionId,
      user: userId,
    });

    if (!chatSession) {
      return res
        .status(404)
        .json(createErrorResponse("Chat session not found"));
    }

    if (messageIds && messageIds.length > 0) {
      // Mark specific messages as read
      messageIds.forEach((messageId) => {
        chatSession.markAsRead(messageId);
      });
    } else {
      // Mark all messages as read
      chatSession.markAllAsRead();
    }

    await chatSession.save();

    res.json(createSuccessResponse("Messages marked as read"));
  } catch (error) {
    console.error("Mark messages as read error:", error);
    res
      .status(500)
      .json(
        createErrorResponse("Failed to mark messages as read", error.message),
      );
  }
};

// Rate chat satisfaction
export const rateChatSatisfaction = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json(createErrorResponse("Rating must be between 1 and 5"));
    }

    const chatSession = await Chat.findOne({
      sessionId,
      user: userId,
    });

    if (!chatSession) {
      return res
        .status(404)
        .json(createErrorResponse("Chat session not found"));
    }

    chatSession.satisfaction = {
      rating,
      feedback: feedback || "",
      ratedAt: new Date(),
    };

    await chatSession.save();

    res.json(
      createSuccessResponse("Satisfaction rating submitted successfully"),
    );
  } catch (error) {
    console.error("Rate satisfaction error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to submit rating", error.message));
  }
};

// Escalate chat to expert
export const escalateToExpert = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const chatSession = await Chat.findOne({
      sessionId,
      user: userId,
    });

    if (!chatSession) {
      return res
        .status(404)
        .json(createErrorResponse("Chat session not found"));
    }

    // Find available expert
    const expert = await User.findOne({
      role: "expert",
      isActive: true,
    }).sort({ lastLogin: -1 });

    chatSession.escalateToExpert(reason, userId);
    if (expert) {
      chatSession.assignedTo = expert._id;
    }

    await chatSession.save();

    res.json(
      createSuccessResponse("Chat escalated to expert successfully", {
        assignedExpert: expert ? expert.name : null,
        escalationReason: reason,
      }),
    );
  } catch (error) {
    console.error("Escalate chat error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to escalate chat", error.message));
  }
};

// Close chat session
export const closeChatSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const chatSession = await Chat.findOne({
      sessionId,
      user: userId,
    });

    if (!chatSession) {
      return res
        .status(404)
        .json(createErrorResponse("Chat session not found"));
    }

    chatSession.closeSession();
    await chatSession.save();

    res.json(createSuccessResponse("Chat session closed successfully"));
  } catch (error) {
    console.error("Close chat session error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to close chat session", error.message));
  }
};

// Admin: Get chat analytics
export const getChatAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, topic } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    if (topic) {
      matchStage.topic = topic;
    }

    const analytics = await Chat.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalChats: { $sum: 1 },
          activeChats: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          resolvedChats: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
          },
          escalatedChats: {
            $sum: { $cond: [{ $eq: ["$status", "escalated"] }, 1, 0] },
          },
          avgSatisfaction: { $avg: "$satisfaction.rating" },
          avgSessionDuration: { $avg: "$analytics.sessionDuration" },
          totalMessages: { $sum: "$analytics.totalMessages" },
        },
      },
    ]);

    const topicStats = await Chat.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$topic",
          count: { $sum: 1 },
          avgSatisfaction: { $avg: "$satisfaction.rating" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json(
      createSuccessResponse("Chat analytics fetched successfully", {
        overview: analytics[0] || {
          totalChats: 0,
          activeChats: 0,
          resolvedChats: 0,
          escalatedChats: 0,
          avgSatisfaction: 0,
          avgSessionDuration: 0,
          totalMessages: 0,
        },
        topicBreakdown: topicStats,
        period: {
          from: startDate || null,
          to: endDate || null,
        },
      }),
    );
  } catch (error) {
    console.error("Get chat analytics error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to fetch analytics", error.message));
  }
};

// Simple AI bot response generator
async function generateBotResponse(userMessage, topic) {
  const responses = {
    general: {
      greetings: [
        "Hello! I'm here to help you with your agricultural questions. How can I assist you today?",
        "Welcome to Bindisa Agritech! What agricultural challenge can I help you solve?",
      ],
      default: [
        "I understand you're asking about agriculture. Could you be more specific so I can provide better assistance?",
        "That's an interesting question! Let me help you with that agricultural topic.",
      ],
    },
    crop_recommendation: [
      "For crop recommendations, I'll need to know your soil type, climate zone, and farm size. Could you share these details?",
      "Based on your location and soil conditions, I can suggest the best crops for your farm. What's your area's soil type?",
    ],
    soil_health: [
      "Soil health is crucial for good yields! Have you done a recent soil test? I can help interpret the results.",
      "For soil health assessment, consider testing pH, organic matter, and nutrient levels. Would you like guidance on this?",
    ],
    pest_control: [
      "Pest control depends on the crop and pest type. What crop are you growing and what pest issues are you seeing?",
      "I can help you with integrated pest management strategies. Which pests are affecting your crops?",
    ],
  };

  const message = userMessage.toLowerCase();
  let intent = "general";
  let confidence = 0.5;

  // Simple intent detection
  if (
    message.includes("hello") ||
    message.includes("hi") ||
    message.includes("namaste")
  ) {
    intent = "greeting";
    confidence = 0.9;
  } else if (
    message.includes("crop") ||
    message.includes("plant") ||
    message.includes("grow")
  ) {
    intent = "crop_recommendation";
    confidence = 0.8;
  } else if (
    message.includes("soil") ||
    message.includes("pH") ||
    message.includes("nutrient")
  ) {
    intent = "soil_health";
    confidence = 0.8;
  } else if (
    message.includes("pest") ||
    message.includes("insect") ||
    message.includes("disease")
  ) {
    intent = "pest_control";
    confidence = 0.8;
  }

  let responseText;
  if (intent === "greeting") {
    responseText =
      responses.general.greetings[
        Math.floor(Math.random() * responses.general.greetings.length)
      ];
  } else if (responses[topic] && Array.isArray(responses[topic])) {
    responseText =
      responses[topic][Math.floor(Math.random() * responses[topic].length)];
  } else {
    responseText =
      responses.general.default[
        Math.floor(Math.random() * responses.general.default.length)
      ];
  }

  const quickReplies = [];
  if (intent === "greeting") {
    quickReplies.push(
      { title: "Soil Analysis", payload: "soil_analysis" },
      { title: "Crop Advice", payload: "crop_advice" },
      { title: "Pest Control", payload: "pest_control" },
    );
  }

  return {
    text: responseText,
    intent,
    confidence,
    quickReplies,
    type: "text",
  };
}
