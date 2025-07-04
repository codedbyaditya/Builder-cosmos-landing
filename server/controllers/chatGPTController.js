import OpenAI from "openai";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/response.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompts for different languages based on Bindisa Agritech requirements
const SYSTEM_PROMPTS = {
  en: `You are an intelligent Agricultural Assistant for Bindisa Agritech. You are designed to provide personalized farming advice to Indian farmers in simple, farmer-friendly language.

Your tasks include:
- Analyzing soil and suggesting improvement techniques
- Recommending crops based on soil type, season, and region
- Giving tips on organic and chemical fertilizers
- Advising on pest control methods and irrigation
- Providing weather-related farming suggestions
- Helping with sustainable agricultural practices
- Supporting government schemes or subsidy guidance (basic)

Key rules:
- Always reply in English with simple, clear language
- Be accurate, concise, and polite
- Never mention you're an AI or mention OpenAI
- Always respond with confidence, don't show errors or confusion
- If the question is unclear, politely ask the user to clarify

You are Bindisa Agritech's digital farming companion. Stay helpful, relevant, and clear in every response.`,

  hi: `आप बिंदिसा एग्रीटेक के लिए एक बुद्धिमान कृषि सहायक हैं। आप भारतीय किसानों को सरल, किसान-अनुकूल भाषा में व्यक्तिगत कृषि सलाह प्रदान करने के लिए डिज़ाइन किए गए हैं।

आपके कार्यों में शामिल हैं:
- मिट्टी का विश्लेषण करना और सुधार तकनीकों का सुझाव देना
- मिट्टी के प्रकार, ���ौसम और क्षेत्र के आधार पर फसलों की सिफारिश करना
- जैविक और रासायनिक उर्वरकों के बारे में सुझाव देना
- कीट नियंत्रण विधियों और सिंचाई पर सलाह देना
- मौसम संबंधी कृषि सुझाव प्रदान करना
- टिकाऊ कृषि प्रथाओं में सहायता करना
- सरकारी योजनाओं या सब्सिडी मार्गदर्शन का समर्थन करना (बुनियादी)

मुख्य नियम:
- हमेशा हिंदी में सरल, स्पष्ट भाषा में उत्तर दें
- सटीक, संक्षिप्त और विनम्र रहें
- कभी भी यह न कहें कि आप एक AI हैं या OpenAI का उल्लेख न करें
- हमेशा आत्मविश्वास के साथ जवाब दें, त्रुटियां या भ्रम न दिखाएं
- यदि प्रश्न अस्पष्ट है, ���ो विनम्रता से उपयोगकर्ता से स्पष्ट करने को कहें

आप बिंदिसा एग्रीटेक के डिजिटल कृषि साथी हैं। हर उत्तर में सहायक, प्रासंगिक और स्पष्ट रहें।`,

  mr: `तुम्ही बिंदिसा एग्रीटेकसाठी एक बुद्धिमान कृषी सहाय्यक आहात. तुम्ही भारतीय शेतकऱ्यांना साध्या, शेतकरी-अनुकूल भाषेत वैयक्तिक शेती सल्ला देण्यासाठी डिझाइन केले आहे.

तुमच्या कार्यांमध्ये हे समाविष्ट आहे:
- मातीचे विश्लेषण करणे आणि सुधारणा तंत्रांचे सुझाव देणे
- मातीचा प्रकार, हंगाम आणि प्रदेशाच्या आधारे पिकांची शिफारस करणे
- सेंद्रिय आणि रासायनिक खतांबद्दल सुझ��व देणे
- कीड नियंत्रण पद्धती आणि सिंचनावर सल्ला देणे
- हवामान संबंधित शेती सुझाव प्रदान करणे
- शाश्वत कृषी पद्धतींमध्ये मदत करणे
- सरकारी योजना किंवा अनुदान मार्गदर्शनाचे समर्थन करणे (मूलभूत)

मुख्य नियम:
- नेहमी मराठीत साध्या, स्पष्ट भाषेत उत्तर द्या
- अचूक, संक्षिप्त आणि विनम्र राहा
- कधीही असे म्हणू नका की तुम्ही AI आहात किंवा OpenAI चा उल्लेख करू नका
- नेहमी आत्मविश्वासाने उत्तर द्या, त्रुटी किंवा गोंधळ दाखवू नका
- जर प्रश्न अस्पष्ट असेल, तर विनम्रतेने वापरकर्त्याला स्पष्ट करण्यास सांगा

तुम्ही बिंदिसा एग्रीट��कचे डिजिटल शेती साथी आहात. प्रत्येक उत्तरात उपयुक्त, संबंधित आणि स्पष्ट राहा.`,
};

// AI Chat Controller
export const sendChatMessage = async (req, res) => {
  try {
    const { message, language = "en", sessionId } = req.body;
    const userId = req.user?.id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json(createErrorResponse("Message is required"));
    }

    // Find or create chat session
    let chatSession = await Chat.findOne({ sessionId });

    if (!chatSession) {
      chatSession = new Chat({
        sessionId:
          sessionId ||
          `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user: userId || null,
        language,
        messages: [],
        status: "active",
        type: "ai_assistant",
        metadata: {
          platform: "web",
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
        },
      });
    }

    // Add user message to session
    chatSession.messages.push({
      sender: "user",
      content: message,
      timestamp: new Date(),
      messageType: "text",
    });

    // Prepare conversation history for OpenAI
    const conversationHistory = [
      {
        role: "system",
        content: SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.en,
      },
    ];

    // Add recent messages (last 10 to manage token limits)
    const recentMessages = chatSession.messages.slice(-10);
    recentMessages.forEach((msg) => {
      if (msg.sender === "user") {
        conversationHistory.push({ role: "user", content: msg.content });
      } else if (msg.sender === "ai") {
        conversationHistory.push({ role: "assistant", content: msg.content });
      }
    });

    try {
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: conversationHistory,
        max_tokens: 600,
        temperature: 0.7,
        frequency_penalty: 0.2,
        presence_penalty: 0.1,
      });

      const aiResponse = completion.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error("No response from AI service");
      }

      // Add AI response to session
      chatSession.messages.push({
        sender: "ai",
        content: aiResponse,
        timestamp: new Date(),
        messageType: "text",
        metadata: {
          model: "gpt-3.5-turbo",
          tokens: completion.usage?.total_tokens || 0,
          confidence: 0.9,
        },
      });

      // Update session metadata
      chatSession.lastActivity = new Date();
      chatSession.messageCount += 2; // user + ai message

      // Save session
      await chatSession.save();

      res.json(
        createSuccessResponse("Message sent successfully", {
          message: aiResponse,
          sessionId: chatSession.sessionId,
          messageId: chatSession.messages[chatSession.messages.length - 1]._id,
          tokensUsed: completion.usage?.total_tokens || 0,
        }),
      );
    } catch (apiError) {
      console.error("OpenAI API Error:", apiError);

      // Fallback response
      const fallbackResponses = {
        en: "I apologize, but I'm experiencing technical difficulties right now. Please try again in a moment, or contact our agricultural experts directly at +91-XXXXXXXXXX for immediate assistance with your farming questions.",
        hi: "मुझे खुशी है, लेकिन मुझे अभी तकनीकी समस्या हो रही है। कृपया थोड़ी देर बाद फिर कोशिश करें, या अपने कृषि प्रश्नों के लिए तत्काल सहायता हेतु हमारे कृषि विशेषज्ञों से +91-XXXXXXXXXX पर सीधे संपर्क करें।",
        mr: "मला खुशी आहे, पण मला सध्या तांत्रिक अडचण येत आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा, किंवा तुमच्या शेतीच्या प्रश्नांसाठी त्वरित मदतीसाठी आमच्या कृषी तज्ञांशी +91-XXXXXXXXXX वर थेट संपर्क साधा.",
      };

      const fallbackMessage =
        fallbackResponses[language] || fallbackResponses.en;

      // Add fallback message to session
      chatSession.messages.push({
        sender: "ai",
        content: fallbackMessage,
        timestamp: new Date(),
        messageType: "text",
        metadata: {
          fallback: true,
          error: "ai_service_unavailable",
        },
      });

      chatSession.lastActivity = new Date();
      await chatSession.save();

      res.json(
        createSuccessResponse("Message sent successfully", {
          message: fallbackMessage,
          sessionId: chatSession.sessionId,
          messageId: chatSession.messages[chatSession.messages.length - 1]._id,
          fallback: true,
        }),
      );
    }
  } catch (error) {
    console.error("Chat controller error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to process message", error.message));
  }
};

// Get chat history
export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const chatSession = await Chat.findOne({ sessionId });

    if (!chatSession) {
      return res
        .status(404)
        .json(createErrorResponse("Chat session not found"));
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const messages = chatSession.messages.slice(skip, skip + parseInt(limit));

    res.json(
      createSuccessResponse("Chat history retrieved successfully", {
        sessionId: chatSession.sessionId,
        messages,
        totalMessages: chatSession.messages.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(chatSession.messages.length / limit),
        language: chatSession.language,
        status: chatSession.status,
      }),
    );
  } catch (error) {
    console.error("Get chat history error:", error);
    res
      .status(500)
      .json(
        createErrorResponse("Failed to retrieve chat history", error.message),
      );
  }
};

// Create new chat session
export const createChatSession = async (req, res) => {
  try {
    const { language = "en", topic } = req.body;
    const userId = req.user?.id;

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const chatSession = new Chat({
      sessionId,
      user: userId || null,
      language,
      topic: topic || "general_agriculture",
      status: "active",
      type: "ai_assistant",
      messages: [],
      metadata: {
        platform: "web",
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      },
    });

    await chatSession.save();

    // Generate welcome message based on language
    const welcomeMessages = {
      en: "Hello! I'm your AI agricultural assistant from Bindisa Agritech. I'm here to help you with all your farming questions including crops, soil, pests, fertilizers, and modern farming techniques. What would you like to know?",
      hi: "नमस्ते! मैं बिंदिसा एग्रीटेक का AI कृषि सहायक हूं। मैं फसल, मिट्टी, कीट, उर्वरक, और आध��निक कृषि तकनीकों से जुड़े आपके सभी प्रश्नों में मदद करने के लिए यहां हूं। आप क्या जानना चाहते हैं?",
      mr: "नमस्कार! मी बिंदिसा एग्रीटेकचा AI कृषी सहाय्यक आहे. मी पीक, माती, कीड, खत, आणि आधुनिक शेती तंत्रांशी संबंधित तुमच्या सर्व प्रश्नांमध्ये मदत करण्यासाठी इथे आहे. तुम्हाला काय जाणून घ्यायचे आहे?",
    };

    res.status(201).json(
      createSuccessResponse("Chat session created successfully", {
        sessionId: chatSession.sessionId,
        welcomeMessage: welcomeMessages[language] || welcomeMessages.en,
        language: chatSession.language,
        status: chatSession.status,
      }),
    );
  } catch (error) {
    console.error("Create chat session error:", error);
    res
      .status(500)
      .json(
        createErrorResponse("Failed to create chat session", error.message),
      );
  }
};

// Rate chat experience
export const rateChatExperience = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { rating, feedback, messageId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json(createErrorResponse("Rating must be between 1 and 5"));
    }

    const chatSession = await Chat.findOne({ sessionId });

    if (!chatSession) {
      return res
        .status(404)
        .json(createErrorResponse("Chat session not found"));
    }

    // Add rating to session
    if (!chatSession.ratings) {
      chatSession.ratings = [];
    }

    chatSession.ratings.push({
      rating,
      feedback,
      messageId,
      timestamp: new Date(),
    });

    // Update overall satisfaction
    const totalRatings = chatSession.ratings.length;
    const avgRating =
      chatSession.ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

    chatSession.satisfaction = {
      rating: Math.round(avgRating * 100) / 100,
      totalRatings,
      lastUpdated: new Date(),
    };

    await chatSession.save();

    res.json(
      createSuccessResponse("Rating submitted successfully", {
        averageRating: avgRating,
        totalRatings,
      }),
    );
  } catch (error) {
    console.error("Rate chat experience error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to submit rating", error.message));
  }
};

// Get chat analytics (Admin only)
export const getChatAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, language, status } = req.query;

    // Build match criteria
    let matchCriteria = {};

    if (startDate || endDate) {
      matchCriteria.createdAt = {};
      if (startDate) matchCriteria.createdAt.$gte = new Date(startDate);
      if (endDate) matchCriteria.createdAt.$lte = new Date(endDate);
    }

    if (language) matchCriteria.language = language;
    if (status) matchCriteria.status = status;

    // Aggregate analytics
    const analytics = await Chat.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalMessages: { $sum: "$messageCount" },
          avgMessagesPerSession: { $avg: "$messageCount" },
          avgRating: { $avg: "$satisfaction.rating" },
          languageDistribution: {
            $push: "$language",
          },
          statusDistribution: {
            $push: "$status",
          },
        },
      },
    ]);

    // Language distribution
    const langStats = await Chat.aggregate([
      { $match: matchCriteria },
      { $group: { _id: "$language", count: { $sum: 1 } } },
    ]);

    // Daily usage trend
    const dailyTrend = await Chat.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sessions: { $sum: 1 },
          messages: { $sum: "$messageCount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(
      createSuccessResponse("Chat analytics retrieved successfully", {
        overview: analytics[0] || {
          totalSessions: 0,
          totalMessages: 0,
          avgMessagesPerSession: 0,
          avgRating: 0,
        },
        languageStats: langStats,
        dailyTrend: dailyTrend,
        generatedAt: new Date(),
      }),
    );
  } catch (error) {
    console.error("Get chat analytics error:", error);
    res
      .status(500)
      .json(createErrorResponse("Failed to retrieve analytics", error.message));
  }
};

// Export all functions
export default {
  sendChatMessage,
  getChatHistory,
  createChatSession,
  rateChatExperience,
  getChatAnalytics,
};
