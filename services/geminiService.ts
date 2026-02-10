import { GoogleGenAI } from "@google/genai";

// Initialize the API client
const apiKey = process.env.API_KEY || ''; // In a real app, handle missing key gracefully
const ai = new GoogleGenAI({ apiKey });

export const generateStory = async (topic: string, length: 'short' | 'medium' | 'long' = 'short'): Promise<{ title: string; content: string }> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure process.env.API_KEY.");
  }

  const lengthPrompt = length === 'short' ? '300 words' : length === 'medium' ? '600 words' : '1000 words';

  const model = 'gemini-3-flash-preview';
  
  const prompt = `Write a creative, engaging short story or article about "${topic}". 
  The length should be approximately ${lengthPrompt}.
  Return the response in JSON format with two fields: "title" and "content".
  The content should be plain text, suitable for a reading application.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response generated");

    const json = JSON.parse(text);
    return {
      title: json.title || 'Untitled',
      content: json.content || ''
    };
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
