// API configuration
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

  constructor() {
    this.apiUrl = API_BASE_URL;
  }

  // Create a new chat session
  async createSession(
    language: string = "en",
    topic?: string,
  ): Promise<ChatSession> {
    try {
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
      throw error;
    }
  }

  // Send message to ChatGPT
  async sendMessage(
    message: string,
    language: string = "en",
    sessionId?: string,
  ): Promise<ChatResponse> {
    try {
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

      // Return fallback response for network errors
      return {
        status: "error",
        message: this.getFallbackMessage(language),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
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
