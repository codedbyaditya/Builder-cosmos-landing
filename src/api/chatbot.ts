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
        return "कीट प्रबंधन के लिए: 1) नीम का तेल स्प्रे करें 2) जैविक कीटनाशक का उपयोग करें 3) फसल चक्र अपनाएं 4) साफ-सफाई रखें। अधिक जानकारी के लिए हमारे विशेषज्ञों से संपर्क करें।";
      }
      if (lowerMessage.includes("मिट्टी") || lowerMessage.includes("soil")) {
        return "मिट्टी की जांच के लिए: 1) pH मीटर से pH चेक करें 2) नमी का स्तर देखें 3) NPK टेस्ट कराएं 4) हमारा सॉयल एनालिसिस टूल इस्तेमाल करें। क्या आप हमारा टूल आजमाना चाहेंगे?";
      }
      if (lowerMessage.includes("बारिश") || lowerMessage.includes("पानी")) {
        return "बारिश के बाद: 1) खेत से अतिरिक्त पानी निकालें 2) फंगस के लिए दवा छिड़कें 3) पौधों को सहारा दें 4) मिट्टी की नमी चेक करें। नियमित निगरानी जरूरी है।";
      }
      if (lowerMessage.includes("उर्वरक") || lowerMessage.includes("खाद")) {
        return "उर्वरक की मात्रा फसल के अनुसार तय करें: 1) धान - 120:60:40 NPK प्रति हेक्टेयर 2) गेहूं - 150:75:50 NPK प्रति हेक्टेयर 3) मिट्टी टेस्ट के आधार पर समायोजन करें।";
      }
      return "आपका प्रश्न दिलचस्प है। कृपया अधिक विस्तार से बताएं या हमारे विशेषज्ञों से संपर्क करें। आप हमारे अन्य टूल्स भी आजमा सकते हैं।";
    }

    if (language === "mr") {
      if (lowerMessage.includes("कीड") || lowerMessage.includes("pest")) {
        return "कीड व्यवस्थापनासाठी: 1) नीम तेल फवारा करा 2) जैविक कीटकनाशकाचा वापर करा 3) पीक चक्र अवलंबा 4) स्वच्छता ठेवा. अधिक माहितीसाठी आमच्या तज्ञांशी संपर्क साधा.";
      }
      if (lowerMessage.includes("माती") || lowerMessage.includes("soil")) {
        return "मातीची तपासणी करण्यासाठी: 1) pH मीटरने pH तपासा 2) ओलावा पातळी पहा 3) NPK चाचणी करा 4) आमचे सॉयल एनालिसिस टूल वापरा. तुम्हाला आमचे टूल वापरायचे आहे का?";
      }
      return "तुमचा प्रश्न मनोरंजक आहे. कृपया अधिक तपशीलाने सांगा किंवा आमच्या तज्ञांशी संपर्क साधा.";
    }

    // English responses
    if (lowerMessage.includes("pest") || lowerMessage.includes("insect")) {
      return "For pest management: 1) Apply neem oil spray 2) Use biological pesticides 3) Practice crop rotation 4) Maintain field hygiene. Contact our experts for detailed guidance.";
    }
    if (lowerMessage.includes("soil") || lowerMessage.includes("test")) {
      return "For soil testing: 1) Check pH with pH meter 2) Monitor moisture levels 3) Test NPK levels 4) Use our Soil Analysis tool. Would you like to try our analysis tool?";
    }
    if (lowerMessage.includes("rain") || lowerMessage.includes("water")) {
      return "After rainfall: 1) Drain excess water 2) Apply fungicide spray 3) Provide plant support 4) Monitor soil moisture. Regular monitoring is essential.";
    }
    if (
      lowerMessage.includes("fertilizer") ||
      lowerMessage.includes("nutrient")
    ) {
      return "Fertilizer amounts vary by crop: 1) Rice - 120:60:40 NPK per hectare 2) Wheat - 150:75:50 NPK per hectare 3) Adjust based on soil test results.";
    }

    return "That's an interesting question! Please provide more details or contact our experts. You can also try our other agricultural tools.";
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
      en: "Hello! I'm your AI agricultural assistant. I can help you with farming questions including crops, soil, pests, fertilizers, and modern farming techniques. What would you like to know?",
      hi: "नमस्ते! मैं आपका AI कृषि सहायक हूं। मैं फसल, मिट्टी, कीट, उर्वरक, और आधुनिक कृषि तकनीकों से जुड़े आपके सभी प्रश्नों में मदद कर सकता हूं। आप क्या जानना चाहते हैं?",
      mr: "नमस्कार! मी तुमचा AI कृषी सहाय्यक आहे. मी पीक, माती, कीड, खत, आणि आधुनिक शेती तंत्रांशी संबंधित तुमच्या सर्व प्रश्नांमध्ये मदत करू शकतो. तुम्हाला काय जाणून घ्यायचे आहे?",
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
