// API configuration
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Check if we're in development mode without backend
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === "true" || false;

export interface ChatMessage {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  metadata?: {
    tokens?: number;
    fallback?: boolean;
    error?: string;
  };
}

export interface ChatResponse {
  status: string;
  message: string;
  data?: {
    message: string;
    sessionId: string;
    messageId: string;
    tokensUsed?: number;
    fallback?: boolean;
  };
  error?: string;
}

export interface ChatSession {
  sessionId: string;
  welcomeMessage: string;
  language: string;
  status: string;
}

export class ChatbotService {
  private sessionId: string | null = null;
  private apiUrl: string;
  private isBackendAvailable: boolean = true;

  constructor() {
    this.apiUrl = API_BASE_URL;
  }

  // Mock responses for when backend is unavailable
  private getMockResponse(message: string, language: string): string {
    const lowerMessage = message.toLowerCase();

    if (language === "hi") {
      if (lowerMessage.includes("कीट") || lowerMessage.includes("pest")) {
        return "कीट नियंत्रण के लिए: खेत में नीम का तेल स्प्रे करें (10ml प्रति लीटर पानी), जैविक कीटनाशक इस्तेमाल करें, और फसल चक्र अपनाएं। साफ-सफाई रखना भी जरूरी है।";
      }
      if (lowerMessage.includes("मिट्टी") || lowerMessage.includes("soil")) {
        return "मिट्टी की गुणवत्ता जांचने के लिए, अपने खेत स��� 5-6 इंच गहरा नमूना लें, इसे सुखाएं और स्थानीय मिट्टी जांच प्रयोगशाला में ले जाएं। वे pH और NPK की जांच करेंगे। रिपोर्ट के आधार पर सही उर्वरक चुनें।";
      }
      if (lowerMessage.includes("बारिश") || lowerMessage.includes("पानी")) {
        return "बारिश के बाद खेत से अतिरिक्त पानी निकालें, फफूंद रोधी दवा छिड़कें, और पौधों को सहारा दें। मिट्टी की नमी नियमित रूप से चेक करते रहें।";
      }
      if (lowerMessage.includes("उर्वरक") || lowerMessage.includes("खाद")) {
        return "धान के लिए 120:60:40 NPK प्रति हेक्टेयर और गेहूं के लिए 150:75:50 NPK प्रति हेक्टेयर उपयोग करें। मिट्टी जा��च रिपोर्ट के अनुसार मात्रा समायोजित करें।";
      }
      return "कृपया अपना प्रश्न थोड़ा और विस्तार से बताएं ताकि मैं आपको बेहतर सलाह दे सकूं।";
    }

    if (language === "mr") {
      if (lowerMessage.includes("कीड") || lowerMessage.includes("pest")) {
        return "कीड नियंत्रणासाठी: शेतात नीम तेल फवारा करा (10ml प्रति लीटर पाणी), जैविक कीटकनाशक वापरा, आणि पीक चक्र अवलंबा. स्वच्छता देखील महत्वाची आहे.";
      }
      if (lowerMessage.includes("माती") || lowerMessage.includes("soil")) {
        return "मातीची गुणवत्ता तपासण्यासाठी, तुमच्या शेतातून 5-6 इंच खोल नमुना घ्या, तो वाळवा आणि स्थानिक माती चाचणी प्रयोगशाळेत न्या. ते pH आणि NPK तपासतील. अहवालानुसार योग्य खत निवडा.";
      }
      return "कृपया तुमचा प्रश्न थ���डा अधिक तपशीलाने सांगा जेणेकरून मी तुम्हाला चांगला सल्ला देऊ शकेन.";
    }

    // English responses
    if (lowerMessage.includes("pest") || lowerMessage.includes("insect")) {
      return "For pest control: Apply neem oil spray (10ml per liter water), use biological pesticides, and practice crop rotation. Maintaining field hygiene is also important.";
    }
    if (lowerMessage.includes("soil") || lowerMessage.includes("test")) {
      return "To test your soil quality, collect a small sample from your field (5–6 inches deep), dry it, and take it to a local soil testing lab. They will check for pH, nitrogen, phosphorus, and potassium. Based on the report, you can select the right fertilizer and crop.";
    }
    if (lowerMessage.includes("rain") || lowerMessage.includes("water")) {
      return "After rainfall: drain excess water from fields, apply fungicide spray, and provide plant support. Monitor soil moisture regularly.";
    }
    if (
      lowerMessage.includes("fertilizer") ||
      lowerMessage.includes("nutrient")
    ) {
      return "Use 120:60:40 NPK per hectare for rice and 150:75:50 NPK per hectare for wheat. Adjust quantities based on your soil test report.";
    }

    return "Please provide more details about your question so I can give you better advice.";
  }

  // Create a new chat session
  async createSession(
    language: string = "en",
    topic?: string,
  ): Promise<ChatSession> {
    try {
      if (!this.isBackendAvailable) {
        return this.getMockSession(language);
      }

      const response = await fetch(`${this.apiUrl}/chatgpt/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          topic: topic || "general_agriculture",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create chat session");
      }

      this.sessionId = result.data.sessionId;
      return result.data;
    } catch (error) {
      console.error("Create session error:", error);

      // Switch to mock mode on network error
      if (error instanceof TypeError && error.message.includes("fetch")) {
        this.isBackendAvailable = false;
        return this.getMockSession(language);
      }

      throw error;
    }
  }

  // Mock session for development
  private getMockSession(language: string): ChatSession {
    const sessionId = `mock_session_${Date.now()}`;
    this.sessionId = sessionId;

    const welcomeMessages = {
      en: "Hello! I'm Bindisa Agritech's agricultural assistant. I can help you with farming-related queries including soil analysis, crop recommendations, pest control, fertilizers, and sustainable farming practices. What would you like to ask?",
      hi: "नमस्ते! मैं बिंदिसा एग्रीटेक का कृषि सहायक हूं। मैं आपकी खेती संबंधी समस्याओं में मदद कर सकता हूं - मिट्टी विश्लेषण, फसल सुझाव, कीट नियंत्रण, उर्वरक, और टिकाऊ कृषि। आप क्या पूछना चाहते हैं?",
      mr: "नमस्कार! मी बिंदिसा एग्रीटेकचा कृषी सहाय्यक आहे। मी तुमच्या शेतीच्या समस्यांमध्ये मदत करू शकतो - माती विश्लेषण, पीक शिफारसी, कीड नियंत्रण, खत, आणि शाश्वत शेती। तुम्हाला काय विचारायचे आहे?",
    };

    return {
      sessionId,
      welcomeMessage:
        welcomeMessages[language as keyof typeof welcomeMessages] ||
        welcomeMessages.en,
      language,
      status: "active",
    };
  }

  // Send message to ChatGPT
  async sendMessage(
    message: string,
    language: string = "en",
    sessionId?: string,
  ): Promise<ChatResponse> {
    try {
      // Check if backend is available first
      if (!this.isBackendAvailable) {
        return this.getMockChatResponse(message, language);
      }

      // Use provided sessionId or stored one
      const currentSessionId = sessionId || this.sessionId;

      const response = await fetch(`${this.apiUrl}/chatgpt/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          language,
          sessionId: currentSessionId,
          messageType: "text",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          throw new Error(
            "Too many messages. Please wait a moment before sending another message.",
          );
        }
        throw new Error(result.message || "Failed to send message");
      }

      // Update session ID if not set
      if (!this.sessionId && result.data?.sessionId) {
        this.sessionId = result.data.sessionId;
      }

      return result;
    } catch (error) {
      console.error("Send message error:", error);

      // If this is a network error, switch to mock mode
      if (error instanceof TypeError && error.message.includes("fetch")) {
        this.isBackendAvailable = false;
        return this.getMockChatResponse(message, language);
      }

      // Return fallback response for other errors
      return {
        status: "error",
        message: this.getFallbackMessage(language),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Mock chat response for development
  private getMockChatResponse(message: string, language: string): ChatResponse {
    const responseMessage = this.getMockResponse(message, language);

    return {
      status: "success",
      message: responseMessage,
      data: {
        message: responseMessage,
        sessionId: this.sessionId || `mock_session_${Date.now()}`,
        messageId: `mock_msg_${Date.now()}`,
        fallback: true,
      },
    };
  }

  // Get chat history
  async getChatHistory(
    sessionId?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<any> {
    try {
      const currentSessionId = sessionId || this.sessionId;

      if (!currentSessionId) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${this.apiUrl}/chatgpt/sessions/${currentSessionId}/history?page=${page}&limit=${limit}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to get chat history");
      }

      return result.data;
    } catch (error) {
      console.error("Get chat history error:", error);
      throw error;
    }
  }

  // Rate chat experience
  async rateExperience(
    rating: number,
    feedback?: string,
    messageId?: string,
    sessionId?: string,
  ): Promise<void> {
    try {
      const currentSessionId = sessionId || this.sessionId;

      if (!currentSessionId) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${this.apiUrl}/chatgpt/sessions/${currentSessionId}/rate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rating,
            feedback,
            messageId,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Rate experience error:", error);
      throw error;
    }
  }

  // Clear current session
  clearSession(): void {
    this.sessionId = null;
  }

  // Get current session ID
  getSessionId(): string | null {
    return this.sessionId;
  }

  // Set session ID
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  // Get fallback message based on language
  private getFallbackMessage(language: string): string {
    const fallbackMessages = {
      en: "I apologize, but I'm having trouble connecting right now. Please try again in a moment or contact our agricultural experts for immediate assistance.",
      hi: "मुझे खुशी है, लेकिन फिलहाल मुझे जुड़ने में समस्या हो रही है। कृपया थोड़ी देर बाद फिर ���ोशिश करें या तत्काल सहायता के लिए हमारे कृषि विशेषज्ञों से संपर्क करें।",
      mr: "मला खुशी आहे, पण सध्या मला जोडण्यात समस्या येत आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा किंवा त्वरित मदतीसाठी आमच्या कृषी तज्ञांशी संपर्क साधा.",
    };

    return (
      fallbackMessages[language as keyof typeof fallbackMessages] ||
      fallbackMessages.en
    );
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl.replace("/api", "")}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
export const chatbotService = new ChatbotService();

// Export types and service
export default chatbotService;
