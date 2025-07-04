import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "ai", "admin", "agent"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "location", "quick_reply"],
      default: "text",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: {
      // For AI responses
      model: String,
      tokens: Number,
      confidence: Number,
      fallback: Boolean,
      error: String,

      // For user messages
      platform: String,
      deviceInfo: String,

      // For files/images
      fileUrl: String,
      fileName: String,
      fileSize: Number,
      mimeType: String,
    },
  },
  {
    timestamps: true,
    _id: true,
  },
);

const chatSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Allow anonymous chats
    },
    type: {
      type: String,
      enum: ["ai_assistant", "human_support", "expert_consultation"],
      default: "ai_assistant",
    },
    status: {
      type: String,
      enum: ["active", "resolved", "escalated", "closed"],
      default: "active",
      index: true,
    },
    language: {
      type: String,
      enum: ["en", "hi", "mr"],
      default: "en",
      index: true,
    },
    topic: {
      type: String,
      enum: [
        "general_agriculture",
        "crop_management",
        "soil_analysis",
        "pest_control",
        "fertilizer_advice",
        "weather_guidance",
        "irrigation",
        "machinery",
        "market_prices",
        "government_schemes",
        "organic_farming",
        "technical_support",
      ],
      default: "general_agriculture",
    },
    messages: [messageSchema],
    messageCount: {
      type: Number,
      default: 0,
      index: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // For human agents/experts
      default: null,
    },
    escalationReason: String,
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    satisfaction: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: String,
      lastUpdated: Date,
    },
    ratings: [
      {
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
        feedback: String,
        messageId: mongoose.Schema.Types.ObjectId,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    tags: [String], // For categorization and analytics
    metadata: {
      platform: String, // web, mobile, api
      userAgent: String,
      ipAddress: String,
      referrer: String,
      sessionDuration: Number, // in minutes
      totalTokensUsed: {
        type: Number,
        default: 0,
      },
      aiCost: {
        type: Number,
        default: 0,
      },
    },
    isAnonymous: {
      type: Boolean,
      default: true,
    },
    notes: [
      {
        // For internal team notes
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        isPrivate: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    collection: "chats",
  },
);

// Indexes for performance
chatSchema.index({ user: 1, lastActivity: -1 });
chatSchema.index({ status: 1, createdAt: -1 });
chatSchema.index({ language: 1, topic: 1 });
chatSchema.index({ "messages.timestamp": -1 });
chatSchema.index({ assignedTo: 1, status: 1 });

// Virtual for session duration
chatSchema.virtual("sessionDurationMinutes").get(function () {
  if (this.messages.length < 2) return 0;

  const firstMessage = this.messages[0];
  const lastMessage = this.messages[this.messages.length - 1];

  return Math.round(
    (lastMessage.timestamp - firstMessage.timestamp) / (1000 * 60),
  );
});

// Pre-save middleware
chatSchema.pre("save", function (next) {
  // Update message count
  this.messageCount = this.messages.length;

  // Update last activity
  if (this.messages.length > 0) {
    this.lastActivity = this.messages[this.messages.length - 1].timestamp;
  }

  // Update session duration in metadata
  if (this.metadata) {
    this.metadata.sessionDuration = this.sessionDurationMinutes;
  }

  // Set anonymous flag
  this.isAnonymous = !this.user;

  next();
});

// Instance methods
chatSchema.methods.addMessage = function (messageData) {
  this.messages.push(messageData);
  this.lastActivity = new Date();
  return this;
};

chatSchema.methods.markAsRead = function (messageId) {
  const message = this.messages.id(messageId);
  if (message) {
    message.isRead = true;
  }
  return this;
};

chatSchema.methods.markAllAsRead = function () {
  this.messages.forEach((message) => {
    message.isRead = true;
  });
  return this;
};

chatSchema.methods.escalateToExpert = function (reason, assignedTo) {
  this.status = "escalated";
  this.escalationReason = reason;
  this.assignedTo = assignedTo;
  this.priority = "high";
  return this;
};

chatSchema.methods.closeSession = function (reason) {
  this.status = "closed";
  if (reason) {
    this.notes.push({
      author: this.assignedTo || this.user,
      content: `Session closed: ${reason}`,
      timestamp: new Date(),
      isPrivate: false,
    });
  }
  return this;
};

chatSchema.methods.calculateSatisfactionScore = function () {
  if (this.ratings.length === 0) return null;

  const avgRating =
    this.ratings.reduce((sum, rating) => sum + rating.rating, 0) /
    this.ratings.length;
  return Math.round(avgRating * 100) / 100;
};

// Static methods
chatSchema.statics.getActiveSessionsByUser = function (userId) {
  return this.find({
    user: userId,
    status: "active",
  }).sort({ lastActivity: -1 });
};

chatSchema.statics.getAnalytics = function (startDate, endDate) {
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
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
        avgMessageCount: { $avg: "$messageCount" },
        avgSatisfaction: { $avg: "$satisfaction.rating" },
        totalTokensUsed: { $sum: "$metadata.totalTokensUsed" },
      },
    },
  ]);
};

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
