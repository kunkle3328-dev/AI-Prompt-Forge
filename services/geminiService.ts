
import { GoogleGenAI, Type, GenerateContentResponse, Content } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a placeholder for environments where API_KEY might not be set.
  // In a real deployed app, this should be handled more gracefully.
  console.warn("API_KEY is not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const callGemini = async (
  model: string,
  // FIX: Updated the type of `contents` to accept a string or an array of Content objects,
  // which reflects how this function is called from different parts of the application.
  contents: Content[] | string,
  generationConfig?: any,
  systemInstruction?: string,
): Promise<GenerateContentResponse> => {
  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            ...generationConfig,
            systemInstruction: systemInstruction,
        }
    });
    return response;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    // In a real app, you might want to throw a more user-friendly error
    throw error;
  }
};


export const generateChatResponse = async (history: Content[], persona: string, tone: string, temperature: number) => {
    const model = 'gemini-2.5-flash';
    
    const systemInstruction = `You are an AI assistant. Adopt the following persona: "${persona}". Respond with the following tone: "${tone}".`;
    const generationConfig = {
        temperature: temperature
    };
    
    const response = await callGemini(model, history, generationConfig, systemInstruction);
    return response.text;
};

export const generatePromptIdeas = async (description: string) => {
    const model = 'gemini-2.5-flash';
    const prompt = `Based on the app description "${description}", generate a JSON object with suggestions for building a detailed prompt. The JSON should have keys: 'audience' (string), 'features' (array of strings), 'framework' (string, e.g., 'React', 'Vue', 'HTML/CSS/JS'), 'tone' (string), and 'style' (string).`;
    const response = await callGemini(model, prompt, { 
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                audience: { type: Type.STRING },
                features: { type: Type.ARRAY, items: { type: Type.STRING } },
                framework: { type: Type.STRING },
                tone: { type: Type.STRING },
                style: { type: Type.STRING }
            },
            required: ['audience', 'features', 'framework', 'tone', 'style']
        }
    });
    return JSON.parse(response.text);
};


export const generateFullPrompt = async (details: any) => {
    const model = 'gemini-2.5-pro';
    const prompt = `
        Create a comprehensive, detailed, and well-structured prompt in Markdown format for an AI to build an application.
        The application details are as follows:
        - One-sentence description: "${details.description}"
        - Target Audience: "${details.audience}"
        - Key Features: ${details.features.join(', ')}
        - Technology/Framework: "${details.framework}"
        - Desired Tone: "${details.tone}"
        - Desired Style: "${details.style}"

        The final output should be a complete prompt that an AI developer can use to understand and build the entire application. Structure it logically with clear headings.
    `;
    const response = await callGemini(model, prompt);
    return response.text;
}

export const generateCode = async (prompt: string, language: string) => {
    const model = 'gemini-2.5-pro';
    const systemInstruction = `You are an expert code generator. Your task is to generate clean, functional, and complete code based on the user's prompt.
    - The target language/framework is ${language}.
    - ONLY output the raw code. 
    - Do NOT include any explanations, comments, or markdown formatting like \`\`\`html or \`\`\`javascript.
    - If the request is for a complete HTML file, include the <!DOCTYPE html>, <html>, <head>, and <body> tags.
    - If asked for React or Vue, provide the component code. Assume necessary imports are handled.`;
    
    const response = await callGemini(model, prompt, undefined, systemInstruction);
    return response.text;
}

export const generateGeneralText = async (prompt: string, persona: string, tone: string) => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `You are an AI assistant. Adopt the following persona: "${persona}". Respond with the following tone: "${tone}".`;
    const response = await callGemini(model, prompt, undefined, systemInstruction);
    return response.text;
}
