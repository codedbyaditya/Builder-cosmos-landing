import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only for development - move to backend in production
});

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  message: string;
  error?: string;
}

const SYSTEM_PROMPTS = {
  en: `You are an expert agricultural assistant for Bindisa Agritech. You specialize in Indian farming practices and provide helpful, accurate advice on:
- Crop management and farming techniques
- Soil analysis and soil health
- Pest and disease management
- Fertilizer and nutrient management
- Weather-related farming advice
- Seed selection and planting guidance
- Irrigation and water management
- Post-harvest practices
- Organic farming methods
- Agricultural technology

Always provide practical, actionable advice suitable for Indian farming conditions. Be concise but thorough. If you don't know something specific, recommend consulting local agricultural experts or Bindisa Agritech specialists.`,

  hi: `आप बिंदिसा एग्रीटेक के लिए एक विशेषज्ञ कृषि सहायक हैं। आप भारतीय किसानी प्रथाओं में विशेषज्ञ हैं और इन विषयों पर सहायक, सटीक सलाह देते हैं:
- फसल प्रबंधन और किसानी तकनीकें
- मिट्टी विश्लेषण और मिट्टी का स्वास्थ्य
- कीट और रोग प्रबंधन
- उर्वरक और पोषक तत्व प्रबंधन
- मौसम संबंधी कृषि सलाह
- बीज चयन और रोपण मार्गदर्शन
- सिंचाई और जल प्रबंधन
- फसल कटाई के बाद की प्रथाएं
- जैविक कृषि पद्धतियां
- कृषि प्रौद्योगिकी

हमेशा भारतीय कृषि परिस्थितियों के लिए उपयुक्त व्यावहारिक, कार्यान्वित की जा सकने वाली सलाह दें। संक्षिप्त लेकिन विस्तृत जानकारी दें। यदि आप कुछ विशिष्ट नहीं जानते हैं, तो स्थानीय कृषि विशेषज्ञों या बिंदिसा एग्रीटेक विशेषज्ञों से सलाह लेने की सिफारिश करें।`,

  mr: `तुम्ही बिंदिसा एग्रीटेकसाठी एक तज्ञ कृषी सहाय्यक आहात. तुम्ही भारतीय शेतकी पद्धतींमध्ये तज्ञ आहात आणि या विषयांवर उपयुक्त, अचूक सल्ला देता:
- पीक व्यवस्थापन आणि शेती तंत्रे
- माती विश्लेषण आणि माती आरोग्य
- कीड आणि रोग व्यवस्थापन
- खत आणि पोषक तत्व व्यवस्थापन
- हवामान संबंधि�� शेती सल्ला
- बियाणे निवड आणि लागवड मार्गदर्शन
- सिंचन आणि पाणी व्यवस्थापन
- कापणीनंतरच्या पद्धती
- सेंद्रिय शेती पद्धती
- कृषी तंत्रज्ञान

नेहमी भारतीय शेती परिस्थितींसाठी योग्य व्यावहारिक, अंमलात आणता येण्याजोगा सल्ला द्या. संक्षिप्त पण सविस्तर माहिती द्या. जर तुम्हाला काही विशिष्ट माहित नसेल, तर स्थानिक कृषी तज्ञ किंवा बिंदिसा एग्रीटेक तज्ञांचा सल्ला घेण्याची शिफारस करा.`,
};

export class ChatbotService {
  private conversationHistory: Map<string, ChatMessage[]> = new Map();

  private getSystemPrompt(language: string): string {
    return (
      SYSTEM_PROMPTS[language as keyof typeof SYSTEM_PROMPTS] ||
      SYSTEM_PROMPTS.en
    );
  }

  async sendMessage(
    message: string,
    language: string = "en",
    sessionId: string = "default",
  ): Promise<ChatResponse> {
    try {
      // Get or create conversation history
      if (!this.conversationHistory.has(sessionId)) {
        this.conversationHistory.set(sessionId, [
          { role: "system", content: this.getSystemPrompt(language) },
        ]);
      }

      const history = this.conversationHistory.get(sessionId)!;

      // Add user message to history
      history.push({ role: "user", content: message });

      // Keep only last 20 messages to avoid token limits
      if (history.length > 21) {
        // 1 system + 20 conversation messages
        history.splice(1, history.length - 21);
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: history,
        max_tokens: 500,
        temperature: 0.7,
        stream: false,
      });

      const responseMessage = completion.choices[0]?.message?.content;

      if (!responseMessage) {
        throw new Error("No response from ChatGPT");
      }

      // Add assistant response to history
      history.push({ role: "assistant", content: responseMessage });

      return {
        message: responseMessage,
      };
    } catch (error: any) {
      console.error("ChatGPT API Error:", error);

      // Return fallback response based on language
      const fallbackMessages = {
        en: "I apologize, but I'm having trouble connecting to my knowledge base right now. Please try again in a moment or contact our agricultural experts directly for immediate assistance.",
        hi: "मुझे खुशी है कि आपसे बात कर रहा हूं। फिलहाल मुझे अपने ज्ञान आधार से जुड़ने में समस्या हो रही है। कृपया थोड़ी देर बाद फिर कोशिश करें या तत्काल सहायता के लिए हमारे कृषि विशेषज्ञों से सीधे संपर्क करें।",
        mr: "मला तुमच्याशी बोलण्यात आनंद होत आहे. सध्या मला माझ्या ज्ञान आधाराशी जोडण्यात समस्या येत आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा किंवा त्वरित मदतीसाठी आमच्या कृषी तज्ञांशी थेट संपर्क साधा.",
      };

      return {
        message:
          fallbackMessages[language as keyof typeof fallbackMessages] ||
          fallbackMessages.en,
        error: error.message,
      };
    }
  }

  clearHistory(sessionId: string = "default"): void {
    this.conversationHistory.delete(sessionId);
  }

  getHistory(sessionId: string = "default"): ChatMessage[] {
    return this.conversationHistory.get(sessionId) || [];
  }
}

// Create singleton instance
export const chatbotService = new ChatbotService();
