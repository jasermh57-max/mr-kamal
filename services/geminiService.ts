import { GoogleGenAI, Type } from "@google/genai";
import { ExamQuestion } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateQuizFromTopic = async (topic: string, difficulty: string): Promise<ExamQuestion[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 5 multiple choice questions about "${topic}" at a ${difficulty} level for high school students.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctOptionIndex: { type: Type.INTEGER, description: "Index of the correct answer (0-3)" }
            },
            required: ["question", "options", "correctOptionIndex"]
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      // Map to add IDs
      return data.map((q: any, index: number) => ({
        id: `ai-gen-${Date.now()}-${index}`,
        question: q.question,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex
      }));
    }
    return [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback or empty return handled by caller
    throw new Error("Failed to generate quiz questions.");
  }
};

export const summarizeForumThread = async (posts: string[]): Promise<string> => {
    try {
        const context = posts.join("\n");
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Summarize the main points of this classroom discussion in 2 sentences:\n\n${context}`,
        });
        return response.text || "Could not summarize discussion.";
    } catch (e) {
        return "AI Summarization unavailable.";
    }
}
