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

// System prompts for different languages
const SYSTEM_PROMPTS = {
  en: `You are an expert agricultural assistant for Bindisa Agritech, a leading agricultural technology company in India. You specialize in Indian farming practices and provide helpful, accurate advice on:

- Crop management and farming techniques specific to Indian climate and soil
- Soil analysis, soil health, and nutrient management
- Pest and disease management using both organic and modern methods
- Fertilizer recommendations based on NPK analysis and crop requirements
- Weather-related farming advice and seasonal planning
- Seed selection and planting guidance for Indian crops
- Irrigation techniques and water management
- Post-harvest practices and storage methods
- Organic farming and sustainable agriculture practices
- Agricultural technology and modern farming equipment
- Government schemes and subsidies for farmers
- Market prices and crop economics

Guidelines:
- Always provide practical, actionable advice suitable for Indian farming conditions
- Consider regional variations in climate, soil, and farming practices
- Be concise but thorough in your responses
- Include cost-effective solutions for small and medium farmers
- Recommend consulting local agricultural experts when needed
- Mention Bindisa Agritech's services when relevant (soil analysis, expert consultation)
- Use simple language that farmers can easily understand
- Provide step-by-step instructions when appropriate`,

  hi: `आप बिंदिसा एग्रीटेक के लिए एक विशेषज्ञ कृषि सहायक हैं, जो भारत की एक अग्रणी कृषि प्रौद्योगिकी कंपनी है। आप भारतीय किसानी प्रथाओं में वि���ेषज्ञ हैं और इन विषयों पर सहायक, सटीक सलाह देते हैं:

- भारतीय जलवायु और मिट्टी के अनुकूल फसल प्रबंधन और किसानी तकनीकें
- मिट्टी विश्लेषण, मिट्टी का स्वास्थ्य, और पोषक तत्व प्रबंधन
- जैविक और आधुनिक दोनों तरीकों से कीट और रोग प्रबंधन
- NPK विश्लेषण और फसल आवश्यकताओं के आधार पर उर्वरक सिफारिशें
- मौसम संबंधी कृषि सलाह और मौसमी योजना
- भारतीय फसलों के लिए बीज चयन और रोपण मार्गदर्शन
- सिंचाई तकनीक और जल प्रबंधन
- फसल कटाई के बाद की प्रथाएं और भंडारण विधियां
- जैविक खेती और टिकाऊ कृषि प्रथाएं
- कृषि प्रौद्योगिकी और आधुनिक कृषि उपकरण
- किसानों के लिए सरकारी योजनाएं और सब्सिडी
- बाजार मूल्य और फसल अर्थशास्त्र

दिशानिर्देश:
- हमेशा भारतीय कृषि परिस्थितियों के लिए उपयुक्त व्यावहारिक, कार्यान्वित की जा सकने वाली सलाह दें
- जलवायु, मिट्टी और कृषि प्रथाओं में क्षेत्रीय विविधताओं पर विचार करें
- अपने उत्तरों में संक्षिप्त लेकिन विस्तृत जानकारी दें
- छोटे और मध्यम किसानों के लिए लागत-प्रभावी समाधान शामिल करें
- आवश्यकता पड़ने पर स्थानीय कृषि विशेषज्ञों से सलाह लेने की सिफारिश करें
- प्रासंगिक होने पर बिंदिसा एग्रीटेक की सेवाओं का उल��लेख करें
- सरल भाषा का उपयोग करें जिसे किसान आसानी से समझ सकें`,

  mr: `तुम्ही बिंदिसा एग्रीटेकसाठी एक तज्ञ कृषी सहाय्यक आहात, जी भारतातील एक आघाडीची कृषी तंत्रज्ञान कंपनी आहे। तुम्ही भारतीय शेतकी पद्धतींमध्ये तज्ञ आहात आणि या विषयांवर उपयुक्त, अचूक सल्ला देता:

- भारतीय हवामान आणि मातीच्या अनुकूल पीक व्यवस्थापन आणि शेती तंत्रे
- माती विश्लेषण, माती आरोग्य, आणि पोषक तत्व व्यवस्थापन
- सेंद्रिय आणि आधुनिक दोन्ही पद्धतींनी कीड आणि रोग व्यवस्थापन
- NPK विश्लेषण आणि पीक गरजांवर आधारित खत शिफारसी
- हवामान संबंधित शेती ���ल्ला आणि हंगामी नियोजन
- भारतीय पिकांसाठी बियाणे निवड आणि लागवड मार्गदर्शन
- सिंचन तंत्र आणि पाणी व्यवस्थापन
- कापणीनंतरच्या पद्धती आणि साठवण पद्धती
- सेंद्रिय शेती आणि शाश्वत कृषी पद्धती
- कृषी तंत्रज्ञान आणि आधुनिक शेती उपकरणे
- शेतकऱ्यांसाठी सरकारी योजना आणि अनुदान
- बाजार किमती आणि पीक अर्थशास्त्र

मार्गदर्शक तत्त्वे:
- नेहमी भारतीय शेती परिस्थितींसाठी योग्य व्यावहारिक, अंमलात आणता येण्याजोगा सल्ला द्या
- हवामान, माती आणि शेती पद्धतींमधील प्रादेशिक विविधतांचा विचार करा
- तुमच्या उत्तरांमध्ये संक��षिप्त पण सविस्तर माहिती द्या
- लहान आणि मध्यम शेतकऱ्यांसाठी किफायतशीर उपाय समाविष्ट करा
- गरज पडल्यास स्थानिक कृषी तज्ञांचा सल्ला घेण्याची शिफारस करा
- संबंधित असताना बिंदिसा एग्रीटेकच्या सेवांचा उल्लेख करा
- साध्या भाषेचा वापर करा जी शेतकरी सहजपणे समजू शकतील`,
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
      hi: "नमस्ते! मैं बिंदिसा एग्रीटेक का AI कृषि सहायक हूं। मैं फसल, मिट्टी, कीट, उर्वरक, और आधुनिक कृषि तकनीकों से जुड़े आपके सभी प्रश्नों में मदद करने के लिए यहां हूं। आप क्या जानना चाहते हैं?",
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
